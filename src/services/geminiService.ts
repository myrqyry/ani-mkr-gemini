/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/



import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { Frame } from "../types";
import { buildAnalysisPrompt } from "../../prompts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const imageModel = 'gemini-2.5-flash-image-preview';
const textModel = 'gemini-2.5-flash';

/**
 * The assets for an animation.
 * @interface AnimationAssets
 * @property {{ data: string, mimeType: string }} imageData - The image data for the animation.
 * @property {Frame[]} frames - The frames of the animation.
 * @property {number} frameDuration - The duration of each frame in ms.
 */
export interface AnimationAssets {
  imageData: { data: string, mimeType: string };
  frames: Frame[];
  frameDuration: number;
}

/**
 * A bounding box for an object in an image.
 * @interface BoundingBox
 * @property {[number, number, number, number]} box_2d - The bounding box in the format [ymin, xmin, ymax, xmax].
 * @property {string} label - The label for the object.
 */
export interface BoundingBox {
  box_2d: [number, number, number, number]; // ymin, xmin, ymax, xmax
  label: string;
}

/**
 * Converts a base64 string to a generative part.
 * @param {string} base64 - The base64 string.
 * @param {string} mimeType - The MIME type of the image.
 * @returns {{ inlineData: { data: string, mimeType: string } }} - The generative part.
 */
const base64ToGenerativePart = (base64: string, mimeType: string) => {
    return {
      inlineData: {
        data: base64,
        mimeType,
      },
    };
};

/**
 * Parses the response from the Gemini model.
 * @param {GenerateContentResponse} response - The response from the model.
 * @returns {AnimationAssets} The parsed animation assets.
 */
const parseGeminiResponse = (response: GenerateContentResponse): AnimationAssets => {
    const responseParts = response.candidates?.[0]?.content?.parts;
    if (!responseParts) {
        throw new Error("Invalid response from model. No parts found.");
    }

    const imagePart = responseParts.find(p => p.inlineData);
    if (!imagePart?.inlineData?.data) {
        console.error("No image part found in response from image generation model", response);
        const text = responseParts.find(p => p.text)?.text;
        throw new Error(`Model did not return an image. Response: ${text ?? "<no text>"}`);
    }
    const imageData = { data: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
    
    let frameDuration = 120; // Default fallback value
    const textPart = responseParts.find(p => p.text);
    if (textPart?.text) {
        try {
            // The model might return just the JSON, or text with JSON embedded.
            // A simple regex to find a JSON-like string.
            const jsonStringMatch = textPart.text.match(/{.*}/s);
            if (jsonStringMatch) {
                const parsed = JSON.parse(jsonStringMatch[0]);
                if (parsed.frameDuration && typeof parsed.frameDuration === 'number') {
                    frameDuration = parsed.frameDuration;
                }
            }
        } catch (e) {
            console.warn("Could not parse frame duration from model response. Using default.", e);
        }
    }

    return { imageData, frames: [], frameDuration };
};

/**
 * Generates animation assets.
 * @param {string | null} base64UserImage - The base64-encoded user image.
 * @param {string | null} mimeType - The MIME type of the user image.
 * @param {string} imagePrompt - The prompt for the image.
 * @param {(message: string) => void} onProgress - Function to call with progress messages.
 * @param {AbortSignal} [signal] - An optional AbortSignal to cancel the request.
 * @returns {Promise<AnimationAssets | null>} A promise that resolves to the animation assets.
 */
export const generateAnimationAssets = async (
    base64UserImage: string | null,
    mimeType: string | null,
    imagePrompt: string,
    onProgress: (message: string) => void,
    signal?: AbortSignal
): Promise<AnimationAssets | null> => {
    try {
        if (signal?.aborted) {
            throw new Error('Animation generation aborted.');
        }

        const response = await fetch('/api/generate-animation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageData: base64UserImage,
                prompt: imagePrompt,
            }),
            signal,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("Could not read response body.");
        }

        const decoder = new TextDecoder();
        let fullResponse = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullResponse += decoder.decode(value, { stream: true });
        }

        // The streamed response is a series of JSON objects. We need to parse them.
        const jsonChunks = fullResponse.replace(/}{/g, '},{').split('},{');
        const parsedChunks = jsonChunks.map((chunk, index) => {
            if (index > 0) chunk = '{' + chunk;
            if (index < jsonChunks.length - 1) chunk = chunk + '}';
            return JSON.parse(chunk);
        });

        // Now, we need to find the image data in the parsed chunks
        const imagePart = parsedChunks.flatMap(c => c.candidates?.[0]?.content?.parts ?? []).find(p => p.inlineData);
        if (!imagePart?.inlineData?.data) {
            throw new Error("No image part found in response from proxy.");
        }
        const imageData = { data: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };

        let frameDuration = 120; // Default fallback value
        const textPart = parsedChunks.flatMap(c => c.candidates?.[0]?.content?.parts ?? []).find(p => p.text);
        if (textPart?.text) {
            try {
                const jsonStringMatch = textPart.text.match(/{.*}/s);
                if (jsonStringMatch) {
                    const parsed = JSON.parse(jsonStringMatch[0]);
                    if (parsed.frameDuration && typeof parsed.frameDuration === 'number') {
                        frameDuration = parsed.frameDuration;
                    }
                }
            } catch (e) {
                console.warn("Could not parse frame duration from model response. Using default.", e);
            }
        }

        return { imageData, frames: [], frameDuration };
    } catch (error) {
        console.error("Error during asset generation:", error);
        throw new Error(`Failed to process image. ${error instanceof Error ? error.message : ''}`);
    }
};

/**
 * Post-processes an animation.
 * @param {string} base64SpriteSheet - The base64-encoded sprite sheet.
 * @param {string} mimeType - The MIME type of the sprite sheet.
 * @param {string} postProcessPrompt - The prompt for post-processing.
 * @param {(message: string) => void} onProgress - Function to call with progress messages.
 * @param {string} [base64StyleImage] - The base64-encoded style image.
 * @param {string} [styleMimeType] - The MIME type of the style image.
 * @param {number} [temperature] - The temperature for the model.
 * @returns {Promise<AnimationAssets | null>} A promise that resolves to the post-processed animation assets.
 */
export const postProcessAnimation = async (
    base64SpriteSheet: string,
    mimeType: string,
    postProcessPrompt: string,
    onProgress: (message: string) => void,
    base64StyleImage?: string | null,
    styleMimeType?: string | null,
    temperature?: number
): Promise<AnimationAssets | null> => {
    try {
        onProgress('Applying effect...');
        const textPart = { text: postProcessPrompt };
        
        const parts = [];
        const imagePart = base64ToGenerativePart(base64SpriteSheet, mimeType);
        parts.push(imagePart);
        
        if (base64StyleImage && styleMimeType) {
            const styleImagePart = base64ToGenerativePart(base64StyleImage, styleMimeType);
            parts.push(styleImagePart);
        }

        parts.push(textPart);
        
        const config: { responseModalities: Modality[], temperature?: number } = {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        };

        if (temperature !== undefined) {
            config.temperature = temperature;
        }
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: imageModel,
            contents: [{
                role: "user",
                parts: parts,
            }],
            config: config,
        });
        
        return parseGeminiResponse(response);
    } catch (error) {
        console.error("Error during post-processing:", error);
        throw new Error(`Failed to post-process animation. ${error instanceof Error ? error.message : ''}`);
    }
};

/**
 * Detects objects in an animation.
 * @param {string} base64SpriteSheet - The base64-encoded sprite sheet.
 * @param {string} mimeType - The MIME type of the sprite sheet.
 * @param {string} detectionPrompt - The prompt for object detection.
 * @returns {Promise<BoundingBox[]>} A promise that resolves to an array of bounding boxes.
 */
export const detectObjectsInAnimation = async (
  base64SpriteSheet: string,
  mimeType: string,
  detectionPrompt: string,
): Promise<BoundingBox[]> => {
  try {
    const imagePart = base64ToGenerativePart(base64SpriteSheet, mimeType);
    const textPart = { text: detectionPrompt };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: textModel, // gemini-2.5-flash is great for this
        contents: [{
            role: "user",
            parts: [imagePart, textPart],
        }],
        config: {
          responseMimeType: "application/json",
        },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Model did not return a valid JSON response for object detection.");
    }
    
    // The model might wrap the JSON in markdown, so we need to clean it.
    const cleanedJsonText = jsonText.replace(/^```json\s*|```\s*$/g, '');
    const detectedObjects: BoundingBox[] = JSON.parse(cleanedJsonText);
    return detectedObjects;

  } catch (error) {
    console.error("Error during object detection:", error);
    throw new Error(`Failed to detect objects in animation. ${error instanceof Error ? error.message : ''}`);
  }
};

/**
 * Extracts frames from an animated image by drawing it onto a canvas at intervals.
 * This is a workaround for models not supporting animated MIME types directly.
 * It relies on the browser's ability to render the animated image in an <img> tag.
 * @param animationDataUrl The data URL of the animated image (GIF, WEBP, etc.).
 * @param numFrames The number of frames to extract.
 * @param totalDuration The total duration over which to sample frames.
 * @returns A promise that resolves to an array of base64-encoded JPEG frames.
 */
const extractFramesFromAnimation = (
    animationDataUrl: string,
    numFrames: number = 8,
    totalDuration: number = 1500
): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        let canvas: HTMLCanvasElement | null = null;
        let ctx: CanvasRenderingContext2D | null = null;

        const cleanup = () => {
            if (canvas) {
                ctx = null;
                canvas.width = 0;
                canvas.height = 0;
                canvas = null;
            }
        };

        img.onload = () => {
            canvas = document.createElement('canvas');
            ctx = canvas.getContext('2d');
            if (!ctx) {
                cleanup();
                return reject(new Error("Could not get canvas context for frame extraction."));
            }

            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const frames: string[] = [];
            const sampleInterval = totalDuration / numFrames;
            let capturedFrames = 0;

            const captureFrame = () => {
                try {
                    if (!ctx || !canvas) {
                        throw new Error("Canvas context lost during frame capture.");
                    }
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const frameDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    const base64Data = frameDataUrl.split(',')[1];
                    if (base64Data) {
                        frames.push(base64Data);
                    }
                    capturedFrames++;
                    if (capturedFrames < numFrames) {
                        setTimeout(captureFrame, sampleInterval);
                    } else {
                        cleanup();
                        resolve(frames);
                    }
                } catch (e) {
                    cleanup();
                    reject(e);
                }
            };

            // Start capturing after the first interval
            setTimeout(captureFrame, sampleInterval);
        };

        img.onerror = () => {
            cleanup();
            reject(new Error("Failed to load animated image for frame extraction."));
        };
        img.src = animationDataUrl;
    });
};

/**
 * Analyzes an animation to generate a prompt.
 * @param {string} animationDataUrl - The data URL of the animation.
 * @param {(message: string) => void} onProgress - Function to call with progress messages.
 * @returns {Promise<string>} A promise that resolves to the generated prompt.
 */
export const analyzeAnimation = async (
    animationDataUrl: string,
    onProgress: (message: string) => void
): Promise<string> => {
    try {
        onProgress('Extracting frames from animation...');
        const frames = await extractFramesFromAnimation(animationDataUrl);
        
        if (frames.length === 0) {
            throw new Error("Could not extract any frames from the provided animation.");
        }

        onProgress('Analyzing animation...');
        const analysisPrompt = buildAnalysisPrompt();
        
        const imageParts = frames.map(frameBase64 => base64ToGenerativePart(frameBase64, 'image/jpeg'));
        const textPart = { text: analysisPrompt };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: textModel,
            contents: [{
                role: 'user',
                parts: [...imageParts, textPart],
            }],
        });
        
        const analyzedPrompt = response.text;
        if (!analyzedPrompt) {
            throw new Error("Model did not return a valid prompt from the animation analysis.");
        }

        return analyzedPrompt.trim();

    } catch (error) {
        console.error("Error during animation analysis:", error);
        throw new Error(`Failed to analyze animation. ${error instanceof Error ? error.message : ''}`);
    }
};