/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import { UndoIcon, RedoIcon, EyeIcon, DownloadIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import ShortcutsModal from './components/ShortcutsModal';
import FaqPage from './components/FaqPage';
import InspirationPage from './components/InspirationPage';
import JSZip from 'jszip';
import PromptSuggestions from './components/PromptSuggestions';
import PromptHistoryDropdown from './components/PromptHistoryDropdown';
import { editSuggestions } from './data/suggestions';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

// Helper to check if a canvas is empty (all transparent)
const isCanvasBlank = (canvas: HTMLCanvasElement): boolean => {
    if (!canvas) return true;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return true;
    try {
        const pixelBuffer = new Uint32Array(
            context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
        );
        // An all-transparent canvas will have all-zero values in the buffer.
        return !pixelBuffer.some(pixel => pixel !== 0);
    } catch (e) {
        // This can happen if the canvas is tainted (e.g. cross-origin data)
        // or if dimensions are 0. In our case, we can assume it's blank.
        console.error("Could not check canvas, assuming it's blank.", e);
        return true;
    }
}

// --- Prompt History Hook ---
const MAX_HISTORY_SIZE = 20;

const usePromptHistory = (storageKey: string) => {
    const [history, setHistory] = useState<string[]>([]);

    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem(storageKey);
            if (storedHistory) {
                setHistory(JSON.parse(storedHistory));
            }
        } catch (error) {
            console.error(`Failed to read prompt history from localStorage for key ${storageKey}`, error);
        }
    }, [storageKey]);

    const addPrompt = useCallback((prompt: string) => {
        if (!prompt || !prompt.trim()) return;
        const newPrompt = prompt.trim();

        setHistory(prevHistory => {
            // Remove existing instance to move it to the top.
            const filteredHistory = prevHistory.filter(p => p.toLowerCase() !== newPrompt.toLowerCase());
            const newHistory = [newPrompt, ...filteredHistory].slice(0, MAX_HISTORY_SIZE);
            
            try {
                localStorage.setItem(storageKey, JSON.stringify(newHistory));
            } catch (error) {
                console.error(`Failed to save prompt history to localStorage for key ${storageKey}`, error);
            }
            
            return newHistory;
        });
    }, [storageKey]);

    const clearHistory = useCallback(() => {
        setHistory([]);
        try {
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.error(`Failed to clear prompt history from localStorage for key ${storageKey}`, error);
        }
    }, [storageKey]);

    return { history, addPrompt, clearHistory };
};


type Tab = 'edit' | 'adjust' | 'filters' | 'crop';
type Page = 'editor' | 'faq' | 'inspiration';

type BatchImageStatus = 'pending' | 'processing' | 'done' | 'error';
interface BatchImage {
  id: string;
  original: File;
  editedUrl?: string;
  status: BatchImageStatus;
  error?: string;
}

const App: React.FC = () => {
  // Single image editor state
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  
  // Batch editor state
  const [batchImages, setBatchImages] = useState<BatchImage[]>([]);
  const isCancellingRef = useRef<boolean>(false);

  // Common state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('edit');
  
  // Edit-specific state
  const [editCrop, setEditCrop] = useState<Crop>();
  const [completedEditCrop, setCompletedEditCrop] = useState<PixelCrop>();
  
  // Crop-specific state
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  
  // Comparison state
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Masking state for Adjust/Filters
  const [isMasking, setIsMasking] = useState<boolean>(false);
  const [brushSize, setBrushSize] = useState<number>(40);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPositionRef = useRef<{ x: number, y: number } | null>(null);
  
  // State lifted from panels for global shortcuts
  const [adjustmentPrompt, setAdjustmentPrompt] = useState<string>('');
  const [filterPrompt, setFilterPrompt] = useState<string>('');
  
  // UI state
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('editor');
  const [promptToTry, setPromptToTry] = useState<{ prompt: string; type: Tab } | null>(null);
  const [isEditHistoryVisible, setIsEditHistoryVisible] = useState(false);

  // Prompt History
  const { history: editHistory, addPrompt: addEditPrompt, clearHistory: clearEditHistory } = usePromptHistory('pixelshop_edit_history');
  const { history: adjustHistory, addPrompt: addAdjustPrompt, clearHistory: clearAdjustHistory } = usePromptHistory('pixelshop_adjust_history');
  const { history: filterHistory, addPrompt: addFilterPrompt, clearHistory: clearFilterHistory } = usePromptHistory('pixelshop_filter_history');

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // Effect to handle trying a prompt from the inspiration gallery
  useEffect(() => {
    // This effect runs when the user returns to the editor after choosing a prompt
    if (promptToTry && currentPage === 'editor') {
        const isImageReady = currentImage || batchImages.length > 0;
        
        // If an image is ready, apply the prompt. Otherwise, it will wait.
        // The effect will re-run when an image is uploaded because `currentImage` will change.
        if (isImageReady) {
            const { prompt, type } = promptToTry;

            setActiveTab(type);

            if (type === 'filters') {
                setFilterPrompt(prompt);
            } else if (type === 'adjust') {
                setAdjustmentPrompt(prompt);
            }
            
            // Consume the prompt so it doesn't re-apply on every render
            setPromptToTry(null);
        }
    }
  }, [promptToTry, currentPage, currentImage, batchImages.length]);

  // Effect to create and revoke object URLs safely for the current image
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  // Effect to create and revoke object URLs safely for the original image
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // Reset transient states after an action
    setCrop(undefined);
    setCompletedCrop(undefined);
    setEditCrop(undefined);
    setCompletedEditCrop(undefined);
  }, [history, historyIndex]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setBatchImages([]); // Ensure batch mode is cleared
    setActiveTab('edit');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setEditCrop(undefined);
    setCompletedEditCrop(undefined);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Please enter a description for your edit.');
        return;
    }

    if (!completedEditCrop || completedEditCrop.width === 0) {
        setError('Please select an area on the image to edit.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, completedEditCrop);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        addEditPrompt(prompt);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, completedEditCrop, addImageToHistory, addEditPrompt]);
  
  const handleBatchApply = useCallback(async (prompt: string, type: 'filter' | 'adjust') => {
    if (!prompt.trim()) {
        setError(`Please enter a prompt for the batch ${type}.`);
        return;
    }
    
    const imagesToProcess = batchImages.filter(img => img.status === 'pending' || img.status === 'error');
    if (imagesToProcess.length === 0) {
        return;
    }
    
    setIsLoading(true);
    setError(null);
    isCancellingRef.current = false; // Reset on new run

    // Add to history at the start of a successful batch
    if (type === 'filter') {
        addFilterPrompt(prompt);
    } else {
        addAdjustPrompt(prompt);
    }

    const editFunction = type === 'filter' ? generateFilteredImage : generateAdjustedImage;

    for (const imageToProcess of imagesToProcess) {
        if (isCancellingRef.current) {
            console.log('Batch operation cancelled by user.');
            break;
        }

        setBatchImages(prev => prev.map(img => 
            img.id === imageToProcess.id ? { ...img, status: 'processing' } : img
        ));

        try {
            const editedUrl = await editFunction(imageToProcess.original, prompt, null); // Masking not supported in batch
            setBatchImages(prev => prev.map(img =>
                img.id === imageToProcess.id
                    ? { ...img, editedUrl, status: 'done', error: undefined }
                    : img
            ));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            console.error(`Batch processing failed for ${imageToProcess.original.name}:`, err);
            setBatchImages(prev => prev.map(img =>
                img.id === imageToProcess.id
                    ? { ...img, status: 'error', error: message }
                    : img
            ));
        }
    }

    setIsLoading(false);
    isCancellingRef.current = false;
  }, [batchImages, addFilterPrompt, addAdjustPrompt]);
  
  const handleRetryImage = useCallback(async (imageToRetry: BatchImage) => {
    const type = activeTab === 'filters' ? 'filter' : 'adjust';
    if (activeTab !== 'adjust' && activeTab !== 'filters') {
        setError("Please switch to 'Adjust' or 'Filters' tab to set a prompt before retrying.");
        return;
    }
    const prompt = type === 'filter' ? filterPrompt : adjustmentPrompt;

    if (!prompt.trim()) {
        setError(`Please enter a prompt for the batch ${type} to retry.`);
        return;
    }
    
    setError(null);

    const editFunction = type === 'filter' ? generateFilteredImage : generateAdjustedImage;

    setBatchImages(prev => prev.map(img => 
        img.id === imageToRetry.id ? { ...img, status: 'processing', error: undefined } : img
    ));

    try {
        const editedUrl = await editFunction(imageToRetry.original, prompt, null);
        setBatchImages(prev => prev.map(img =>
            img.id === imageToRetry.id
                ? { ...img, editedUrl, status: 'done', error: undefined }
                : img
        ));
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        console.error(`Retry failed for ${imageToRetry.original.name}:`, err);
        setBatchImages(prev => prev.map(img =>
            img.id === imageToRetry.id
                ? { ...img, status: 'error', error: message }
                : img
        ));
    }
  }, [activeTab, filterPrompt, adjustmentPrompt]);

    const getMaskAsFile = useCallback(async (): Promise<File | null> => {
        const canvas = maskCanvasRef.current;
        if (!canvas || isCanvasBlank(canvas)) {
            return null;
        }

        // Create a new canvas to produce the final black and white mask
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = canvas.width;
        outputCanvas.height = canvas.height;
        const ctx = outputCanvas.getContext('2d');

        if (!ctx) return null;

        // Fill with black
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

        // Draw the user's mask in white on top
        ctx.drawImage(canvas, 0, 0);

        return new Promise((resolve) => {
            outputCanvas.toBlob((blob) => {
                if (!blob) {
                    resolve(null);
                    return;
                }
                resolve(new File([blob], 'mask.png', { type: 'image/png' }));
            }, 'image/png');
        });
    }, []);
    
    const handleClearMask = useCallback(() => {
        const canvas = maskCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, []);

    const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (batchImages.length > 0) {
        return handleBatchApply(filterPrompt, 'filter');
    }
    if (!currentImage) {
      setError('No image loaded to apply a filter to.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
        let maskFile: File | null = null;
        if (isMasking) {
            maskFile = await getMaskAsFile();
            if (!maskFile) {
                setError("Masking is enabled, but no mask has been drawn. Please draw on the image or disable masking.");
                setIsLoading(false);
                return;
            }
        }

        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt, maskFile);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        addFilterPrompt(filterPrompt);
        if (isMasking) handleClearMask();
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the filter. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory, batchImages, handleBatchApply, isMasking, getMaskAsFile, handleClearMask, addFilterPrompt]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (batchImages.length > 0) {
        return handleBatchApply(adjustmentPrompt, 'adjust');
    }
    if (!currentImage) {
      setError('No image loaded to apply an adjustment to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        let maskFile: File | null = null;
        if (isMasking) {
            maskFile = await getMaskAsFile();
            if (!maskFile) {
                setError("Masking is enabled, but no mask has been drawn. Please draw on the image or disable masking.");
                setIsLoading(false);
                return;
            }
        }
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt, maskFile);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        addAdjustPrompt(adjustmentPrompt);
        if (isMasking) handleClearMask();
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory, batchImages, handleBatchApply, isMasking, getMaskAsFile, handleClearMask, addAdjustPrompt]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Could not process the crop.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);

  }, [completedCrop, addImageToHistory]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      setEditCrop(undefined);
      setCompletedEditCrop(undefined);
    }
  }, [canUndo, historyIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setEditCrop(undefined);
      setCompletedEditCrop(undefined);
    }
  }, [canRedo, historyIndex]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      setEditCrop(undefined);
      setCompletedEditCrop(undefined);
    }
  }, [history]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setBatchImages([]);
      setError(null);
      setPrompt('');
      setEditCrop(undefined);
      setCompletedEditCrop(undefined);
  }, []);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `edited-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);

  const handleDownloadBatch = async () => {
    const zip = new JSZip();
    const editedImages = batchImages.filter(img => img.status === 'done' && img.editedUrl);

    if (editedImages.length === 0) {
        setError("No images have been successfully edited to download.");
        return;
    }

    setIsLoading(true);
    
    for (const image of editedImages) {
        // data URLs are `data:mime/type;base64,DATA`
        const base64Data = image.editedUrl!.split(',')[1];
        const nameParts = image.original.name.split('.');
        const extension = nameParts.length > 1 ? nameParts.pop() : 'png';
        const baseName = nameParts.join('.');
        zip.file(`${baseName}-edited.${extension}`, base64Data, { base64: true });
    }

    try {
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `pixelshop-batch-${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch(err) {
        console.error("Failed to generate zip file", err);
        setError("Could not create the zip file for download.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownloadIndividual = useCallback((editedUrl: string, originalName: string) => {
    const link = document.createElement('a');
    link.href = editedUrl;
    const nameParts = originalName.split('.');
    const extension = nameParts.length > 1 ? nameParts.pop() : 'png';
    const baseName = nameParts.join('.');
    link.download = `${baseName}-edited.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleCancelBatch = () => {
    if (window.confirm('Are you sure you want to cancel the batch operation? Any images currently being processed will finish, but no new images will be started.')) {
        isCancellingRef.current = true;
    }
  };
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      if (files.length === 1) {
        handleImageUpload(files[0]);
      } else {
        setError(null);
        setHistory([]);
        setHistoryIndex(-1);
        const newBatchImages: BatchImage[] = Array.from(files).map(file => ({
            id: `${file.name}-${file.lastModified}-${Math.random()}`,
            original: file,
            status: 'pending',
        }));
        setBatchImages(newBatchImages);
        setActiveTab('adjust'); // Default to a batch-compatible tab
      }
    }
  };

  const handleToggleMasking = useCallback(() => {
    setIsMasking(prev => {
        if (prev) { // turning it off
            handleClearMask();
        } else { // turning it on
            const canvas = maskCanvasRef.current;
            const image = imgRef.current;
            if (canvas && image) {
                // sync canvas size to image display size
                canvas.width = image.clientWidth;
                canvas.height = image.clientHeight;
            }
        }
        return !prev;
    });
  }, [handleClearMask]);


  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    // Disable and clear masking if switching to an incompatible tab
    if (tab !== 'adjust' && tab !== 'filters' && isMasking) {
        handleClearMask();
        setIsMasking(false);
    }
  }, [isMasking, handleClearMask]);

  const handleTryPrompt = useCallback((prompt: string, type: 'filters' | 'adjust') => {
    setPromptToTry({ prompt, type });
    setCurrentPage('editor');
  }, []);

    const getCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const drawLine = (start: { x: number, y: number }, end: { x: number, y: number }) => {
        const canvas = maskCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    };

    const handleMaskMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        isDrawingRef.current = true;
        const coords = getCoords(e);
        if (coords) {
            lastPositionRef.current = coords;
            // Draw a dot for single clicks
            drawLine(coords, { x: coords.x, y: coords.y });
        }
    };

    const handleMaskMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current) return;
        const coords = getCoords(e);
        if (coords && lastPositionRef.current) {
            drawLine(lastPositionRef.current, coords);
            lastPositionRef.current = coords;
        }
    };

    const handleMaskMouseUp = () => {
        isDrawingRef.current = false;
        lastPositionRef.current = null;
    };


  // Keyboard shortcuts effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field, except for specific combinations like Ctrl+Enter.
      const isTyping = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      const isBatchMode = batchImages.length > 0;

      // Ctrl/Cmd + Enter for applying action
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isLoading) return;

        switch (activeTab) {
          case 'edit':
            if (!isBatchMode && prompt.trim() && completedEditCrop?.width) handleGenerate();
            break;
          case 'adjust':
            if (adjustmentPrompt.trim()) handleApplyAdjustment(adjustmentPrompt);
            break;
          case 'filters':
            if (filterPrompt.trim()) handleApplyFilter(filterPrompt);
            break;
          case 'crop':
            if (!isBatchMode && completedCrop?.width && completedCrop.width > 0) handleApplyCrop();
            break;
        }
        return;
      }
      
      // Allow default browser behavior if typing (e.g., text selection)
      if (isTyping) return;

      // Shortcuts disabled in batch mode
      if(isBatchMode) return;

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'y') { // Redo for windows
        e.preventDefault();
        handleRedo();
        return;
      }

      // Other shortcuts
      if (e.altKey) {
          switch(e.key) {
              case '1': e.preventDefault(); handleTabChange('edit'); break;
              case '2': e.preventDefault(); handleTabChange('crop'); break;
              case '3': e.preventDefault(); handleTabChange('adjust'); break;
              case '4': e.preventDefault(); handleTabChange('filters'); break;
              case 'r': e.preventDefault(); handleReset(); break;
              case 'u': e.preventDefault(); handleUploadNew(); break;
          }
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          if (currentImage) handleDownload();
          return;
      }
      
      // Compare
      if (e.key.toLowerCase() === 'c' && canUndo) {
        setIsComparing(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const isTyping = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (isTyping) return;
      
      const isBatchMode = batchImages.length > 0;
      if(isBatchMode) return;

      if (e.key.toLowerCase() === 'c') {
        setIsComparing(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    activeTab, canUndo, completedCrop, prompt, completedEditCrop, adjustmentPrompt, filterPrompt, isLoading, currentImage, batchImages,
    handleGenerate, handleApplyAdjustment, handleApplyFilter, handleApplyCrop, 
    handleUndo, handleRedo, handleReset, handleUploadNew, handleDownload, handleTabChange
  ]);

  const renderSingleImageEditor = () => {
    // A reusable component for the current image element, used by the editor and comparison view.
    const currentImageElement = (
        <img
            ref={imgRef}
            key={currentImageUrl}
            src={currentImageUrl!}
            alt="Current"
            className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
            onLoad={(e) => {
                if (isMasking && maskCanvasRef.current) {
                    const img = e.currentTarget;
                    maskCanvasRef.current.width = img.clientWidth;
                    maskCanvasRef.current.height = img.clientHeight;
                }
            }}
        />
    );

    // Determines the interactive editor content based on the active tab
    const editorContent = (() => {
        if (activeTab === 'crop') {
            return (
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                onComplete={c => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
                disabled={isComparing}
              >
                {currentImageElement}
              </ReactCrop>
            );
        }
        if (activeTab === 'edit') {
            return (
              <ReactCrop
                crop={editCrop}
                onChange={c => setEditCrop(c)}
                onComplete={c => setCompletedEditCrop(c)}
                className="max-h-[60vh]"
                disabled={isComparing}
              >
                  {currentImageElement}
              </ReactCrop>
            );
        }
        // For 'adjust' and 'filters', it's just the plain image
        return currentImageElement;
    })();

    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-gray-200">
            {isLoading && (
                <div className="absolute inset-0 bg-black/70 z-40 flex flex-col items-center justify-center gap-4 animate-fade-in">
                    <Spinner />
                    <p className="text-gray-300">AI is working its magic...</p>
                </div>
            )}

            <div className="relative">
                {/* Before/After Labels */}
                <div className={`absolute top-3 left-3 px-3 py-1 text-sm font-bold rounded-full bg-black/60 text-white transition-opacity duration-300 z-30 ${isComparing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    Before
                </div>
                {canUndo && (
                    <div className={`absolute top-3 left-3 px-3 py-1 text-sm font-bold rounded-full bg-black/60 text-white transition-opacity duration-300 z-30 ${!isComparing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        After
                    </div>
                )}
                
                {/*
                  This container provides the comparison functionality.
                  The original image is the base layer, and the editor content is the top layer.
                  When `isComparing` is true, the top layer fades out to reveal the original.
                */}
                <div className="relative">
                    {originalImageUrl && (
                        <img
                            key={originalImageUrl}
                            src={originalImageUrl}
                            alt="Original"
                            className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none"
                        />
                    )}
                    <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'}`}>
                        {editorContent}
                    </div>
                </div>

                {/* MASKING CANVAS - overlays the comparison view */}
                {isMasking && (activeTab === 'adjust' || activeTab === 'filters') && (
                    <canvas
                        ref={maskCanvasRef}
                        className="absolute top-0 left-0 w-full h-full cursor-crosshair z-20 pointer-events-auto"
                        style={{
                            backgroundColor: 'rgba(230, 0, 0, 0.1)',
                            pointerEvents: isComparing ? 'none' : 'auto',
                        }}
                        onMouseDown={handleMaskMouseDown}
                        onMouseMove={handleMaskMouseMove}
                        onMouseUp={handleMaskMouseUp}
                        onMouseLeave={handleMaskMouseUp} // Stop drawing if mouse leaves canvas
                    />
                )}
            </div>

            {/* ERROR MESSAGE */}
            {error && (
              <div 
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in"
                role="alert"
              >
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
                <button 
                  onClick={() => setError(null)}
                  className="absolute top-0 bottom-0 right-0 px-4 py-3"
                  aria-label="Close error message"
                >
                  <span className="text-2xl text-red-500">&times;</span>
                </button>
              </div>
            )}
        </div>

        {/* --- CONTROLS --- */}
        <div className="w-full flex flex-col-reverse md:flex-row items-center justify-between gap-4">
            {/* Left Side: Undo/Redo/Reset */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleUndo} 
                    disabled={!canUndo || isLoading} 
                    title="Undo (Cmd/Ctrl + Z)"
                    className="p-3 bg-gray-200 text-gray-700 rounded-full transition-colors hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <UndoIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleRedo} 
                    disabled={!canRedo || isLoading} 
                    title="Redo (Cmd/Ctrl + Shift + Z)"
                    className="p-3 bg-gray-200 text-gray-700 rounded-full transition-colors hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RedoIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleReset} 
                    disabled={!canUndo || isLoading}
                    title="Reset all changes (Alt + R)"
                    className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-200 rounded-full hover:bg-gray-300 disabled:opacity-50"
                >
                    Reset
                </button>
            </div>
            {/* Center: Tabs */}
            <div className="flex items-center gap-1 bg-gray-200 p-1 rounded-full">
              {(['edit', 'crop', 'adjust', 'filters'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`px-5 py-2 text-sm sm:text-base font-semibold rounded-full capitalize transition-all duration-300 ${activeTab === tab ? 'bg-white text-gray-800 shadow' : 'text-gray-500 hover:bg-gray-300/50'}`}
                  >
                    {tab}
                  </button>
              ))}
            </div>
            {/* Right Side: Compare/Download */}
            <div className="flex items-center gap-2">
                <button 
                    onMouseDown={() => canUndo && setIsComparing(true)}
                    onMouseUp={() => setIsComparing(false)}
                    onMouseLeave={() => setIsComparing(false)}
                    disabled={!canUndo || isLoading}
                    title="Hold to compare with original (Hold C)"
                    className="px-4 py-2 flex items-center gap-2 font-semibold text-gray-600 bg-gray-200 rounded-full hover:bg-gray-300 disabled:opacity-50"
                >
                    <EyeIcon className="w-5 h-5" />
                    Compare
                </button>
                <button 
                    onClick={handleDownload}
                    title="Download image (Cmd/Ctrl + S)"
                    className="p-3 bg-blue-600 text-white rounded-full transition-colors hover:bg-blue-500 shadow-md shadow-blue-500/30"
                >
                    <DownloadIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={handleUploadNew}
                    title="Upload new image (Alt + U)"
                    className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200"
                >
                    Upload New
                </button>
            </div>
        </div>

        {/* --- PANELS --- */}
        {activeTab === 'edit' && (
          <div className="w-full bg-gray-100 border border-gray-300 rounded-lg p-4 flex flex-col items-center gap-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-700">Magic Edit</h3>
              <p className="text-sm text-gray-500 -mt-2">Select an area on the image, then describe how to change it.</p>
              <div className="relative w-full max-w-xl">
                  <input
                      type="text"
                      value={prompt}
                      onFocus={() => setIsEditHistoryVisible(true)}
                      onBlur={() => setTimeout(() => setIsEditHistoryVisible(false), 200)} // Delay to allow click on dropdown
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., 'remove the person in the background'"
                      className="w-full bg-white border border-gray-300 text-gray-800 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition disabled:cursor-not-allowed disabled:opacity-60 text-base"
                      disabled={isLoading || !completedEditCrop}
                  />
                   <PromptHistoryDropdown
                    isVisible={isEditHistoryVisible}
                    history={editHistory}
                    onSelect={(p) => {
                        setPrompt(p);
                        setIsEditHistoryVisible(false);
                    }}
                    onClear={clearEditHistory}
                   />
              </div>

              {completedEditCrop && (
                <PromptSuggestions 
                    suggestions={editSuggestions}
                    onSelect={setPrompt}
                    isLoading={isLoading}
                />
              )}

              <button
                  onClick={handleGenerate}
                  disabled={isLoading || !prompt.trim() || !completedEditCrop?.width}
                  title="Generate edit (Cmd/Ctrl + Enter)"
                  className="w-full max-w-xs mt-2 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
              >
                  Generate
              </button>
          </div>
        )}
        {activeTab === 'crop' && (
          <CropPanel 
            onApplyCrop={handleApplyCrop} 
            onSetAspect={setAspect}
            isLoading={isLoading}
            isCropping={!!completedCrop?.width && completedCrop.width > 0}
          />
        )}
        {activeTab === 'adjust' && (
          <AdjustmentPanel 
            onApplyAdjustment={handleApplyAdjustment} 
            isLoading={isLoading} 
            activePrompt={adjustmentPrompt}
            onPromptChange={setAdjustmentPrompt}
            isMasking={isMasking}
            onToggleMasking={handleToggleMasking}
            brushSize={brushSize}
            onBrushSizeChange={(e) => setBrushSize(Number(e.target.value))}
            onClearMask={handleClearMask}
            promptHistory={adjustHistory}
            onClearHistory={clearAdjustHistory}
          />
        )}
        {activeTab === 'filters' && (
          <FilterPanel 
            onApplyFilter={handleApplyFilter} 
            isLoading={isLoading} 
            activePrompt={filterPrompt}
            onPromptChange={setFilterPrompt}
            isMasking={isMasking}
            onToggleMasking={handleToggleMasking}
            brushSize={brushSize}
            onBrushSizeChange={(e) => setBrushSize(Number(e.target.value))}
            onClearMask={handleClearMask}
            promptHistory={filterHistory}
            onClearHistory={clearFilterHistory}
          />
        )}
      </div>
    );
  };
  
  const BatchImageCard: React.FC<{ image: BatchImage; onDownload: () => void; onRetry: () => void }> = ({ image, onDownload, onRetry }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        const url = URL.createObjectURL(image.original);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [image.original]);
    
    return (
        <div className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden shadow-md group">
            <img 
                src={previewUrl ?? undefined} 
                alt={image.original.name} 
                className="w-full h-full object-cover"
            />
            {image.status === 'processing' && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white">
                    <Spinner />
                    <span className="text-sm font-semibold">Processing...</span>
                </div>
            )}
            {image.status === 'done' && image.editedUrl && (
                <>
                    <img 
                        src={image.editedUrl}
                        alt={`Edited ${image.original.name}`}
                        className="absolute inset-0 w-full h-full object-cover opacity-100 group-hover:opacity-0 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={onDownload}
                            className="px-4 py-2 bg-blue-600 rounded-lg font-semibold hover:bg-blue-500"
                        >
                            Download
                        </button>
                    </div>
                </>
            )}
            {image.status === 'error' && (
                <div className="absolute inset-0 bg-red-900/80 p-2 flex flex-col items-center justify-center text-center gap-2 text-white">
                    <p className="text-sm font-bold">Failed</p>
                    <p className="text-xs line-clamp-3" title={image.error}>{image.error}</p>
                    <button 
                        onClick={onRetry}
                        className="mt-2 px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-sm font-semibold hover:bg-gray-300"
                    >
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
  };

  const renderBatchEditor = () => {
    const imagesDone = batchImages.filter(img => img.status === 'done').length;
    const imagesErrored = batchImages.filter(img => img.status === 'error').length;
    const imagesProcessing = batchImages.filter(img => img.status === 'processing').length;

    const getPanelForTab = () => {
        switch (activeTab) {
            case 'adjust':
                return (
                    <AdjustmentPanel 
                        onApplyAdjustment={(p) => handleBatchApply(p, 'adjust')} 
                        isLoading={isLoading} 
                        activePrompt={adjustmentPrompt}
                        onPromptChange={setAdjustmentPrompt}
                        isMasking={false} // Masking disabled in batch
                        onToggleMasking={() => {}}
                        brushSize={0}
                        onBrushSizeChange={() => {}}
                        onClearMask={() => {}}
                        promptHistory={adjustHistory}
                        onClearHistory={clearAdjustHistory}
                    />
                );
            case 'filters':
                return (
                    <FilterPanel 
                        onApplyFilter={(p) => handleBatchApply(p, 'filter')} 
                        isLoading={isLoading} 
                        activePrompt={filterPrompt}
                        onPromptChange={setFilterPrompt}
                        isMasking={false} // Masking disabled in batch
                        onToggleMasking={() => {}}
                        brushSize={0}
                        onBrushSizeChange={() => {}}
                        onClearMask={() => {}}
                        promptHistory={filterHistory}
                        onClearHistory={clearFilterHistory}
                    />
                );
            default:
                return (
                    <div className="w-full text-center p-4 bg-gray-100 border border-gray-300 rounded-lg">
                        <p className="text-gray-600">Please switch to the 'Adjust' or 'Filters' tab to apply a batch edit.</p>
                    </div>
                );
        }
    };
    
    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-md">
                <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold text-gray-800">Batch Editor ({batchImages.length} images)</h2>
                    <p className="text-gray-600">
                        {imagesDone} completed, {imagesErrored} failed, {imagesProcessing} processing.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleUploadNew}
                        title="Start over with new images"
                        className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-200 rounded-full hover:bg-gray-300"
                    >
                        Upload New
                    </button>
                    {isLoading && (
                        <button
                            onClick={handleCancelBatch}
                            className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-100 rounded-full hover:bg-red-200"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleDownloadBatch}
                        disabled={isLoading || imagesDone === 0}
                        title={imagesDone > 0 ? "Download all edited images as a zip" : "No images have been successfully edited yet"}
                        className="px-4 py-2 flex items-center gap-2 font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Download All
                    </button>
                </div>
            </div>
            
            {/* TABS (limited for batch) */}
            <div className="flex items-center gap-1 bg-gray-200 p-1 rounded-full">
              {(['adjust', 'filters'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`px-5 py-2 text-sm sm:text-base font-semibold rounded-full capitalize transition-all duration-300 ${activeTab === tab ? 'bg-white text-gray-800 shadow' : 'text-gray-500 hover:bg-gray-300/50'}`}
                  >
                    {tab}
                  </button>
              ))}
            </div>

            {getPanelForTab()}
            
            {error && (
                <div 
                    className="w-full max-w-2xl bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg animate-fade-in"
                    role="alert"
                >
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                    <button 
                        onClick={() => setError(null)}
                        className="absolute top-0 bottom-0 right-0 px-4 py-3"
                        aria-label="Close error message"
                    >
                        <span className="text-2xl text-red-500">&times;</span>
                    </button>
                </div>
            )}
            
            <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {batchImages.map(img => (
                    <BatchImageCard 
                        key={img.id}
                        image={img}
                        onDownload={() => handleDownloadIndividual(img.editedUrl!, img.original.name)}
                        onRetry={() => handleRetryImage(img)}
                    />
                ))}
            </div>
        </div>
    );
  };
  
  const renderPage = () => {
    switch (currentPage) {
        case 'faq':
            return <FaqPage onBackToEditor={() => setCurrentPage('editor')} />;
        case 'inspiration':
            return <InspirationPage onBackToEditor={() => setCurrentPage('editor')} onTryPrompt={handleTryPrompt} />;
        case 'editor':
        default:
            const isEditing = currentImage || batchImages.length > 0;
            return isEditing 
                ? (batchImages.length > 0 ? renderBatchEditor() : renderSingleImageEditor())
                : <StartScreen onFileSelect={handleFileSelect} />;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header 
        onShowShortcuts={() => setIsShortcutsModalOpen(true)}
        onShowFaq={() => setCurrentPage('faq')}
        onShowInspiration={() => setCurrentPage('inspiration')}
      />
      <main className="p-4 sm:p-8">
        {renderPage()}
      </main>
      <ShortcutsModal 
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};

export default App;