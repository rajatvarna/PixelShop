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
import { UndoIcon, RedoIcon, EyeIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import ShortcutsModal from './components/ShortcutsModal';
import FaqPage from './components/FaqPage';
import JSZip from 'jszip';

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

type Tab = 'retouch' | 'adjust' | 'filters' | 'crop';
type Page = 'editor' | 'faq';

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
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  
  // Retouch-specific state
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  
  // Crop-specific state
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  
  // Comparison state
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // State lifted from panels for global shortcuts
  const [adjustmentPrompt, setAdjustmentPrompt] = useState<string>('');
  const [filterPrompt, setFilterPrompt] = useState<string>('');
  
  // UI state
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('editor');

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

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
  }, [history, historyIndex]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setBatchImages([]); // Ensure batch mode is cleared
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('retouch');
    setCrop(undefined);
    setCompletedCrop(undefined);
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

    if (!editHotspot) {
        setError('Please click on the image to select an area to edit.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory]);
  
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
            const editedUrl = await editFunction(imageToProcess.original, prompt);
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
  }, [batchImages]);
  
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
        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the filter. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory, batchImages, handleBatchApply]);
  
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
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory, batchImages, handleBatchApply]);

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
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [canUndo, historyIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [canRedo, historyIndex]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [history]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setBatchImages([]);
      setError(null);
      setPrompt('');
      setEditHotspot(null);
      setDisplayHotspot(null);
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

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch') return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDisplayHotspot({ x: offsetX, y: offsetY });

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);

    setEditHotspot({ x: originalX, y: originalY });
  };

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

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
          case 'retouch':
            if (!isBatchMode && prompt.trim() && editHotspot) handleGenerate();
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
              case '1': e.preventDefault(); handleTabChange('retouch'); break;
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
    activeTab, canUndo, completedCrop, prompt, editHotspot, adjustmentPrompt, filterPrompt, isLoading, currentImage, batchImages,
    handleGenerate, handleApplyAdjustment, handleApplyFilter, handleApplyCrop, 
    handleUndo, handleRedo, handleReset, handleUploadNew, handleDownload, handleTabChange
  ]);

  const renderSingleImageEditor = () => {
    const imageDisplay = (
      <div className="relative">
        {/* Base image is the original, always at the bottom */}
        {originalImageUrl && (
            <img
                key={originalImageUrl}
                src={originalImageUrl}
                alt="Original"
                className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none"
            />
        )}
        {/* The current image is an overlay that fades in/out for comparison */}
        <img
            ref={imgRef}
            key={currentImageUrl}
            src={currentImageUrl!}
            alt="Current"
            onClick={handleImageClick}
            className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'} ${activeTab === 'retouch' ? 'cursor-crosshair' : ''}`}
        />
      </div>
    );
    
    // For ReactCrop, we need a single image element. We'll use the current one.
    const cropImageElement = (
      <img 
        ref={imgRef}
        key={`crop-${currentImageUrl}`}
        src={currentImageUrl!} 
        alt="Crop this image"
        className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
      />
    );

    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-gray-200">
            {isLoading && (
                <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                    <Spinner />
                    <p className="text-gray-300">AI is working its magic...</p>
                </div>
            )}
            
            {activeTab === 'crop' ? (
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)} 
                onComplete={c => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
              >
                {cropImageElement}
              </ReactCrop>
            ) : imageDisplay }

            {displayHotspot && !isLoading && activeTab === 'retouch' && (
                <div 
                    className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                >
                    <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                </div>
            )}
        </div>
        
        <div className="w-full bg-gray-200/80 border border-gray-300/80 rounded-lg p-2 flex items-center justify-center gap-2">
            {(['retouch', 'crop', 'adjust', 'filters'] as const).map((tab, index) => (
                 <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    title={`Switch to ${tab} (Alt + ${index + 1})`}
                    className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${
                        activeTab === tab 
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                        : 'text-gray-600 hover:bg-gray-300/50 hover:text-gray-900'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
        
        <div className="w-full">
            {activeTab === 'retouch' && (
                <div className="flex flex-col items-center gap-4">
                    <p className="text-md text-gray-600">
                        {editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to make a precise edit.'}
                    </p>
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image"}
                            className="flex-grow bg-white border border-gray-300 text-gray-800 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isLoading || !editHotspot}
                        />
                        <button 
                            type="submit"
                            title="Apply edit (Cmd/Ctrl + Enter)"
                            className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isLoading || !prompt.trim() || !editHotspot}
                        >
                            Generate
                        </button>
                    </form>
                </div>
            )}
            {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
            {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} activePrompt={adjustmentPrompt} onPromptChange={setAdjustmentPrompt} />}
            {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} activePrompt={filterPrompt} onPromptChange={setFilterPrompt} />}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button 
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo (Cmd/Ctrl + Z)"
                className="flex items-center justify-center text-center bg-transparent border border-gray-300 text-gray-700 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-gray-300/50 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
                aria-label="Undo last action"
            >
                <UndoIcon className="w-5 h-5 mr-2" />
                Undo
            </button>
            <button 
                onClick={handleRedo}
                disabled={!canRedo}
                title="Redo (Cmd/Ctrl + Shift + Z or Ctrl + Y)"
                className="flex items-center justify-center text-center bg-transparent border border-gray-300 text-gray-700 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-gray-300/50 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
                aria-label="Redo last action"
            >
                <RedoIcon className="w-5 h-5 mr-2" />
                Redo
            </button>
            
            <div className="h-6 w-px bg-gray-400 mx-1 hidden sm:block"></div>

            {canUndo && (
              <button 
                  onMouseDown={() => setIsComparing(true)}
                  onMouseUp={() => setIsComparing(false)}
                  onMouseLeave={() => setIsComparing(false)}
                  onTouchStart={() => setIsComparing(true)}
                  onTouchEnd={() => setIsComparing(false)}
                  title="Compare with original (Hold C)"
                  className="flex items-center justify-center text-center bg-transparent border border-gray-300 text-gray-700 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-gray-300/50 active:scale-95 text-base"
                  aria-label="Press and hold to see original image"
              >
                  <EyeIcon className="w-5 h-5 mr-2" />
                  Compare
              </button>
            )}

            <button 
                onClick={handleReset}
                disabled={!canUndo}
                title="Reset to original image (Alt + R)"
                className="text-center bg-transparent border border-gray-300 text-gray-700 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-gray-300/50 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
              >
                Reset
            </button>
            <button 
                onClick={handleUploadNew}
                title="Upload a new image (Alt + U)"
                className="text-center bg-transparent border border-gray-300 text-gray-700 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-gray-300/50 active:scale-95 text-base"
            >
                Upload New
            </button>

            <button 
                onClick={handleDownload}
                title="Download image (Cmd/Ctrl + S)"
                className="flex-grow sm:flex-grow-0 ml-auto bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
            >
                Download Image
            </button>
        </div>
      </div>
    );
  };
  
  const renderBatchEditor = () => {
    const editableTabs: Tab[] = ['adjust', 'filters'];
    const processedCount = batchImages.filter(img => img.status === 'done' || img.status === 'error').length;
    const totalCount = batchImages.length;
    const canDownload = batchImages.some(img => img.status === 'done');
  
    return (
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          <div className="text-center w-full max-w-4xl">
              <h2 className="text-3xl font-bold">Batch Editing Mode</h2>
              
              {isLoading ? (
                  <div className="mt-4 animate-fade-in">
                      <p className="text-gray-600 mb-2 font-semibold">
                          Processing... ({processedCount} / {totalCount} complete)
                      </p>
                      <div className="w-full bg-gray-300 rounded-full h-4 overflow-hidden shadow-inner">
                          <div 
                              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-4 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${(processedCount / totalCount) * 100}%` }}
                              role="progressbar"
                              aria-valuenow={processedCount}
                              aria-valuemin={0}
                              aria-valuemax={totalCount}
                              aria-label="Batch processing progress"
                          ></div>
                      </div>
                  </div>
              ) : (
                  <p className="text-gray-500 mt-1">
                      Ready to process {totalCount} images.
                      {processedCount > 0 && ` (${processedCount} / ${totalCount} complete)`}
                  </p>
              )}
          </div>
          
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 bg-gray-200/50 rounded-lg">
              {batchImages.map(image => (
                  <BatchImageCard key={image.id} image={image} />
              ))}
          </div>
  
          <div className="w-full max-w-4xl bg-gray-200/80 border border-gray-300/80 rounded-lg p-2 flex items-center justify-center gap-2">
              {editableTabs.map((tab) => (
                   <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      title={`Switch to ${tab}`}
                      className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${
                          activeTab === tab 
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                          : 'text-gray-600 hover:bg-gray-300/50 hover:text-gray-900'
                      }`}
                  >
                      {tab}
                  </button>
              ))}
          </div>
  
          <div className="w-full max-w-4xl">
              {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} activePrompt={adjustmentPrompt} onPromptChange={setAdjustmentPrompt} />}
              {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} activePrompt={filterPrompt} onPromptChange={setFilterPrompt} />}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <button 
                  onClick={handleDownloadBatch} 
                  disabled={!canDownload || isLoading}
                  className="bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-green-800 disabled:to-green-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
              >
                  Download All (.zip)
              </button>
              {isLoading && (
                  <button
                      onClick={handleCancelBatch}
                      className="text-center bg-transparent border border-red-500 text-red-500 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-red-500 hover:text-white active:scale-95 text-base"
                  >
                      Cancel Operation
                  </button>
              )}
              <button 
                  onClick={handleUploadNew}
                  disabled={isLoading}
                  className="text-center bg-transparent border border-gray-300 text-gray-700 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-gray-300/50 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  Exit Batch Mode
              </button>
          </div>
      </div>
    );
  };

  const renderEditorContent = () => {
    if (error) {
       return (
           <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-500">An Error Occurred</h2>
            <p className="text-md text-red-600">{error}</p>
            <button
                onClick={() => setError(null)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Try Again
            </button>
          </div>
        );
    }

    if (batchImages.length > 0) {
        return renderBatchEditor();
    }
    
    if (!currentImageUrl) {
      return <StartScreen onFileSelect={handleFileSelect} />;
    }

    return renderSingleImageEditor();
  };
  
  return (
    <div className="min-h-screen text-gray-800 flex flex-col">
      <Header 
        onShowShortcuts={() => setIsShortcutsModalOpen(true)}
        onShowFaq={() => setCurrentPage('faq')}
      />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center ${
        (currentPage === 'editor' && (currentImage || batchImages.length > 0)) ? 'items-start' : 'items-center'
      }`}>
        {currentPage === 'faq' ? (
          <FaqPage onBackToEditor={() => setCurrentPage('editor')} />
        ) : (
          renderEditorContent()
        )}
      </main>
      <ShortcutsModal 
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};

const BatchImageCard: React.FC<{ image: BatchImage }> = ({ image }) => {
    const [originalUrl, setOriginalUrl] = useState('');
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const url = URL.createObjectURL(image.original);
        setOriginalUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [image.original]);

    const canToggle = image.status === 'done' && image.editedUrl;
    const indicatorText = isHovering ? 'Original' : 'Edited';

    return (
        <div 
            className="relative aspect-square bg-gray-100 rounded-md overflow-hidden group shadow-md"
            onMouseEnter={() => canToggle && setIsHovering(true)}
            onMouseLeave={() => canToggle && setIsHovering(false)}
        >
            {/* Original Image (Bottom Layer) */}
            <img src={originalUrl} alt={image.original.name} className="absolute inset-0 w-full h-full object-cover" />

            {/* Edited Image (Top Layer) - visible when available, fades on hover */}
            {canToggle && (
                <img 
                    src={image.editedUrl} 
                    alt={`${image.original.name} (edited)`} 
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ease-in-out ${isHovering ? 'opacity-0' : 'opacity-100'}`} 
                />
            )}
            
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-white text-xs font-medium truncate">{image.original.name}</p>
            </div>

            {image.status === 'processing' && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center animate-fade-in">
                    <Spinner />
                </div>
            )}
            {image.status === 'error' && (
                 <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center text-white p-2 text-center animate-fade-in">
                    <p className="font-bold text-sm">Error</p>
                    <p className="text-xs mt-1 leading-tight">{image.error?.substring(0, 60)}...</p>
                 </div>
            )}
            
            {canToggle && (
                 <div className="absolute top-1 right-1 px-2 py-0.5 text-xs font-bold rounded-full bg-black/50 text-white transition-opacity duration-200 group-hover:opacity-100 opacity-0 z-10">
                    {indicatorText}
                 </div>
            )}
        </div>
    )
}

export default App;