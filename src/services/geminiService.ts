/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/



import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { Frame, AnimationAssets, BoundingBox } from "@/src/types/types";
import { buildAnalysisPrompt } from "@/prompts";
import { APIRateLimiter } from "@/src/utils/apiUtils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const rateLimiter = new APIRateLimiter();
const imageModel = 'gemini-2.5-flash-image-preview';
const textModel = 'gemini-2.5-flash';

const base64ToGenerativePart = (base64: string, mimeType: string) => {
    return {
      inlineData: {
        data: base64,
        mimeType,
      },
    };
};

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

export const generateAnimationAssets = async (
    base64UserImage: string | null,
    mimeType: string | null,
    base64StyleImage: string | null,
    styleMimeType: string | null,
    imagePrompt: string,
    onProgress: (message: string) => void,
    styleIntensity?: number,
): Promise<AnimationAssets | null> => {
  return rateLimiter.enqueue(async () => {
    try {
      const parts = [];

      if (base64UserImage && mimeType) {
          parts.push(base64ToGenerativePart(base64UserImage, mimeType));
      }

      if (base64StyleImage && styleMimeType) {
          parts.push(base64ToGenerativePart(base64StyleImage, styleMimeType));
          imagePrompt = `Style Transfer Request: Use the first image as content and the second image as style reference. ${imagePrompt}. Maintain the composition of the first image while applying the artistic style, colors, and textures from the second image.`;
      }

      parts.push({ text: imagePrompt });

      const response = await ai.models.generateContent({
          model: imageModel,
          contents: [{ role: "user", parts: parts }],
          config: {
              responseModalities: [Modality.IMAGE, Modality.TEXT],
              temperature: styleIntensity || 0.7
          },
      });

      return parseGeminiResponse(response);
    } catch (error) {
      console.error("Error during asset generation:", error);
      throw new Error(`Failed to process image. ${error instanceof Error ? error.message : ''}`);
    }
  });
};


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
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error("Could not get canvas context for frame extraction."));
            }

            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const frames: string[] = [];
            const sampleInterval = totalDuration / numFrames;
            let capturedFrames = 0;

            const captureFrame = () => {
                try {
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
                        resolve(frames);
                    }
                } catch (e) {
                    reject(e);
                }
            };

            // Start capturing after the first interval
            setTimeout(captureFrame, sampleInterval);
        };
        img.onerror = () => {
            reject(new Error("Failed to load animated image for frame extraction."));
        };
        img.src = animationDataUrl;
    });
};

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