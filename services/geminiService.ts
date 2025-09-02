/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param crop The pixel crop selection for the edit area.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    crop: { x: number; y: number; width: number; height: number; }
): Promise<string> => {
    console.log('Starting generative edit in selection:', crop);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert generative photo editor AI. The user has selected a specific area of an image to modify. Your task is to fulfill the user's request within that bounding box, blending the result seamlessly with the rest of the photo.
User Request: "${userPrompt}"
Edit Location: Perform the edit within the bounding box defined by top-left corner (x: ${Math.round(crop.x)}, y: ${Math.round(crop.y)}) and dimensions (width: ${Math.round(crop.width)}px, height: ${Math.round(crop.height)}px).

Editing Guidelines:
- If the user asks to 'remove' something, intelligently fill the selected area based on the surrounding context.
- If they ask to 'add' something, generate it realistically within the selection.
- If they ask to 'change' something, perform that modification.
- The result must be realistic and blend seamlessly with the surrounding area.
- The area outside the bounding box must remain completely unchanged.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @param maskImage An optional mask file. If provided, the filter is applied only to the masked area.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
    maskImage: File | null,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`, maskImage ? 'with mask' : 'globally');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    // FIX: Explicitly type `parts` to allow both image and text parts, preventing a TypeScript error.
    const parts: ({ inlineData: { mimeType: string; data: string; } } | { text: string })[] = [originalImagePart];
    let prompt: string;

    if (maskImage) {
        const maskPart = await fileToPart(maskImage);
        parts.push(maskPart);
        prompt = `You are an expert photo editor AI. You will be given two images and a user request. The first image is the original photo to be edited. The second image is a black and white mask. Your task is to apply the stylistic filter described in the user's request ONLY to the white areas of the mask on the original photo. The areas of the original photo corresponding to black areas on the mask must remain completely unchanged. Blend the edit seamlessly at the edges. The final output must be only the edited image, with the same dimensions as the original.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    } else {
        prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    }
    
    parts.push({ text: prompt });

    console.log('Sending image, filter prompt, and mask (if any) to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @param maskImage An optional mask file. If provided, the adjustment is applied only to the masked area.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
    maskImage: File | null,
): Promise<string> => {
    console.log(`Starting adjustment generation: ${adjustmentPrompt}`, maskImage ? 'with mask' : 'globally');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    // FIX: Explicitly type `parts` to allow both image and text parts, preventing a TypeScript error.
    const parts: ({ inlineData: { mimeType: string; data: string; } } | { text: string })[] = [originalImagePart];
    let prompt: string;

    if (maskImage) {
        const maskPart = await fileToPart(maskImage);
        parts.push(maskPart);
        prompt = `You are an expert photo editor AI. You will be given two images and a user request. The first image is the original photo to be edited. The second image is a black and white mask. Your task is to apply the adjustment described in the user's request ONLY to the white areas of the mask on the original photo. The areas of the original photo corresponding to black areas on the mask must remain completely unchanged. Blend the edit seamlessly at the edges. The final output must be only the edited image, with the same dimensions as the original.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    } else {
        prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    }
    
    parts.push({ text: prompt });

    console.log('Sending image, adjustment prompt, and mask (if any) to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Expands an image canvas and uses generative AI to fill the new areas.
 * @param originalImage The original image file.
 * @param targetWidth The desired final width of the image.
 * @param targetHeight The desired final height of the image.
 * @returns A promise that resolves to the data URL of the uncropped image.
 */
export const generateUncroppedImage = async (
    originalImage: File,
    targetWidth: number,
    targetHeight: number,
): Promise<string> => {
    console.log(`Starting generative uncrop to dimensions: ${targetWidth}x${targetHeight}`);
    
    // Step 1: Create a new canvas with transparent padding
    const imageWithPadding = await new Promise<File>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context.'));
            }

            // Calculate position to center the original image
            const x = (targetWidth - img.width) / 2;
            const y = (targetHeight - img.height) / 2;

            // Draw the original image onto the center of the larger canvas
            ctx.drawImage(img, x, y);

            // Export the canvas as a PNG file
            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new Error('Canvas toBlob failed.'));
                }
                resolve(new File([blob], 'uncrop-base.png', { type: 'image/png' }));
            }, 'image/png');
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(originalImage);
    });

    // Step 2: Send to Gemini API
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const imagePart = await fileToPart(imageWithPadding);
    const prompt = `You are an expert in photorealistic outpainting. You have been given an image that has transparent areas around a central, existing photo. Your task is to creatively and seamlessly fill in ONLY the transparent areas.
    
Guidelines:
- Extend the existing scene in a natural and believable way.
- Perfectly match the style, lighting, color grading, and perspective of the original image content.
- The boundary between the original image and the generated content must be invisible.
- Do not modify any pixels of the original, non-transparent image content.

Output: Return ONLY the final, fully filled-in image. Do not return text or other content.`;
    const textPart = { text: prompt };

    console.log('Sending padded image and uncrop prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, textPart] },
    });
    console.log('Received response from model for uncrop.', response);

    return handleApiResponse(response, 'uncrop');
};
