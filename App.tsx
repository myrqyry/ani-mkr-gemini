/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppState } from './types';
import { generateAnimationAssets, postProcessAnimation, AnimationAssets, analyzeAnimation, detectObjectsInAnimation, BoundingBox } from './services/geminiService';
import { buildCreativeInstruction, buildPostProcessPrompt, promptSuggestions, buildObjectDetectionPrompt } from './prompts';
import CameraView, { CameraViewHandles } from './components/CameraView';
import AnimationPlayer from './components/AnimationPlayer';
import LoadingOverlay from './components/LoadingOverlay';
import { UploadIcon, SwitchCameraIcon, XCircleIcon, CameraIcon, LinkIcon, PaletteIcon, DownloadIcon } from './components/icons';
import BanamimatorButton from './components/BanamimatorButton';

// --- FEATURE FLAGS ---
// Set to `true` to make uploading or capturing an image mandatory to create an animation.
// Set to `false` to allow creating animations from only a text prompt.
const REQUIRE_IMAGE_FOR_ANIMATION = true;

// Set to `true` to allow selecting multiple emoji suggestions to combine prompts.
// Set to `false` to only allow one emoji suggestion to be active at a time.
const ALLOW_MULTIPLE_EMOJI_SELECTION = false;

type Theme = 'default' | 'rose-pine' | 'catppuccin';
type CustomThemes = Partial<Record<Theme, Partial<Record<string, string>>>>;

const THEMES: { id: Theme, name: string }[] = [
    { id: 'default', name: 'Default' },
    { id: 'rose-pine', name: 'Rosé Pine' },
    { id: 'catppuccin', name: 'Catppuccin' }
];

const EDITABLE_THEME_PROPERTIES = [
    { cssVar: '--color-background', label: 'Background' },
    { cssVar: '--color-surface', label: 'Surface' },
    { cssVar: '--color-overlay', label: 'Overlay' },
    { cssVar: '--color-accent', label: 'Accent' },
    { cssVar: '--color-text-base', label: 'Text' },
    { cssVar: '--color-danger', label: 'Danger' },
];

const THEME_PALETTES: Record<Theme, { name: string, hex: string }[]> = {
    'default': [
        { name: 'Black', hex: '#000000' },
        { name: 'Gray 900', hex: '#111827' },
        { name: 'Gray 700', hex: '#374151' },
        { name: 'Gray 600', hex: '#4b5563' },
        { name: 'Gray 400', hex: '#9ca3af' },
        { name: 'Gray 100', hex: '#f3f4f6' },
        { name: 'Indigo 600', hex: '#4f46e5' },
        { name: 'Indigo 500', hex: '#6366f1' },
        { name: 'Rose 700', hex: '#be123c' },
        { name: 'Yellow 400', hex: '#facc15' },
        { name: 'Green 600', hex: '#16a34a' },
        { name: 'Blue 600', hex: '#2563eb' },
        { name: 'Violet 500', hex: '#8b5cf6' },
    ],
    'rose-pine': [
        { name: 'Base', hex: '#191724' },
        { name: 'Surface', hex: '#1f1d2e' },
        { name: 'Overlay', hex: '#26233a' },
        { name: 'Muted', hex: '#6e6a86' },
        { name: 'Subtle', hex: '#908caa' },
        { name: 'Text', hex: '#e0def4' },
        { name: 'Love', hex: '#eb6f92' },
        { name: 'Gold', hex: '#f6c177' },
        { name: 'Rose', hex: '#ebbcba' },
        { name: 'Pine', hex: '#31748f' },
        { name: 'Foam', hex: '#9ccfd8' },
        { name: 'Iris', hex: '#c4a7e7' },
        { name: 'Highlight Low', hex: '#21202e' },
        { name: 'Highlight Med', hex: '#403d52' },
        { name: 'Highlight High', hex: '#524f67' },
    ],
    'catppuccin': [
        { name: 'Rosewater', hex: '#f5e0dc' },
        { name: 'Flamingo', hex: '#f2cdcd' },
        { name: 'Pink', hex: '#f5c2e7' },
        { name: 'Mauve', hex: '#cba6f7' },
        { name: 'Red', hex: '#f38ba8' },
        { name: 'Maroon', hex: '#eba0ac' },
        { name: 'Peach', hex: '#fab387' },
        { name: 'Yellow', hex: '#f9e2af' },
        { name: 'Green', hex: '#a6e3a1' },
        { name: 'Teal', hex: '#94e2d5' },
        { name: 'Sky', hex: '#89dceb' },
        { name: 'Sapphire', hex: '#74c7ec' },
        { name: 'Blue', hex: '#89b4fa' },
        { name: 'Lavender', hex: '#b4befe' },
        { name: 'Text', hex: '#cdd6f4' },
        { name: 'Subtext1', hex: '#bac2de' },
        { name: 'Subtext0', hex: '#a6adc8' },
        { name: 'Overlay2', hex: '#9399b2' },
        { name: 'Overlay1', hex: '#7f849c' },
        { name: 'Overlay0', hex: '#6c7086' },
        { name: 'Surface2', hex: '#585b70' },
        { name: 'Surface1', hex: '#45475a' },
        { name: 'Surface0', hex: '#313244' },
        { name: 'Base', hex: '#1e1e2e' },
        { name: 'Mantle', hex: '#181825' },
        { name: 'Crust', hex: '#11111b' },
    ],
};

const ThemeCustomizer: React.FC<{
    theme: Theme;
    customColors: Partial<Record<string, string>>;
    onColorChange: (cssVar: string, value: string) => void;
    onReset: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onExport: () => void;
    onClose: () => void;
}> = ({ theme, customColors, onColorChange, onReset, onImport, onExport, onClose }) => {
    const importInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[var(--color-surface)] w-full max-w-md rounded-lg shadow-2xl border border-[var(--color-surface-alt)]">
                <div className="p-4 border-b border-[var(--color-surface-alt)] flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Customize '{THEMES.find(t => t.id === theme)?.name}'</h2>
                    <button onClick={onClose} aria-label="Close customizer">
                        <XCircleIcon className="w-6 h-6 text-[var(--color-text-muted)] hover:text-[var(--color-text-base)]"/>
                    </button>
                </div>
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <h3 className="text-md font-medium text-[var(--color-text-muted)] mb-2">Editable Colors</h3>
                        <div className="space-y-3">
                            {EDITABLE_THEME_PROPERTIES.map(({ cssVar, label }) => {
                                const currentColor = customColors[cssVar] || getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
                                return (
                                <div key={cssVar} className="flex items-center justify-between">
                                    <label htmlFor={cssVar} className="text-sm">{label}</label>
                                    <div className="flex items-center gap-x-2">
                                        <span className="text-sm text-[var(--color-text-muted)]">{currentColor}</span>
                                        <input
                                            id={cssVar}
                                            type="color"
                                            value={currentColor}
                                            onChange={(e) => onColorChange(cssVar, e.target.value)}
                                            className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent appearance-none"
                                            style={{backgroundColor: 'transparent'}}
                                        />
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-md font-medium text-[var(--color-text-muted)] mb-2">Full Theme Palette</h3>
                        <p className="text-xs text-[var(--color-text-subtle)] mb-3">Click a swatch to apply it to an editable color above.</p>
                        <div className="flex flex-wrap gap-2">
                            {THEME_PALETTES[theme].map(({ name, hex }) => (
                                <div key={name} className="text-center">
                                    <div
                                        className="w-10 h-10 rounded-md border border-white/20"
                                        style={{ backgroundColor: hex }}
                                    ></div>
                                    <p className="text-xs mt-1 text-[var(--color-text-muted)]">{name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-[var(--color-surface-alt)] flex flex-wrap justify-between items-center gap-2">
                     <div className="flex gap-2">
                        <button onClick={() => importInputRef.current?.click()} className="flex items-center gap-x-2 text-sm bg-[var(--color-button)] px-3 py-1.5 rounded-md hover:bg-[var(--color-button-hover)] transition-colors">
                            <UploadIcon className="w-4 h-4" /> Import
                        </button>
                        <button onClick={onExport} className="flex items-center gap-x-2 text-sm bg-[var(--color-button)] px-3 py-1.5 rounded-md hover:bg-[var(--color-button-hover)] transition-colors">
                            <DownloadIcon className="w-4 h-4" /> Export
                        </button>
                        <input type="file" ref={importInputRef} onChange={onImport} accept=".json" className="hidden" />
                    </div>
                    <button onClick={onReset} className="text-sm bg-[var(--color-danger-surface)] text-[var(--color-danger-text)] px-3 py-1.5 rounded-md hover:opacity-80 transition-opacity">
                        Reset to Defaults
                    </button>
                </div>
            </div>
        </div>
    );
};

const ThemeSwitcher: React.FC<{
    currentTheme: Theme;
    onThemeChange: (theme: Theme) => void;
    onCustomize: () => void;
}> = ({ currentTheme, onThemeChange, onCustomize }) => {
    return (
        <div className="flex items-center gap-x-2">
            <span className="text-sm">Theme:</span>
            <div className="flex items-center bg-[var(--color-surface)] rounded-md p-1">
                {THEMES.map(theme => (
                    <button
                        key={theme.id}
                        onClick={() => onThemeChange(theme.id)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                            currentTheme === theme.id 
                                ? 'bg-[var(--color-accent)] text-white' 
                                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-button-hover)]'
                        }`}
                    >
                        {theme.name}
                    </button>
                ))}
            </div>
            <button onClick={onCustomize} aria-label="Customize theme" className="p-1.5 bg-[var(--color-surface)] rounded-md hover:bg-[var(--color-button-hover)] transition-colors">
                <PaletteIcon className="w-4 h-4"/>
            </button>
        </div>
    );
};


const resizeImage = (dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
  // We assume maxWidth and maxHeight are the same and represent the target square size.
  const targetSize = maxWidth; 
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      console.log(`[DEBUG] Original image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Could not get canvas context for resizing.'));
      }

      canvas.width = targetSize;
      canvas.height = targetSize;

      const { width, height } = img;
      let sx, sy, sWidth, sHeight;

      // This logic finds the largest possible square in the center of the image
      if (width > height) { // Landscape
        sWidth = height;
        sHeight = height;
        sx = (width - height) / 2;
        sy = 0;
      } else { // Portrait or square
        sWidth = width;
        sHeight = width;
        sx = 0;
        sy = (height - width) / 2;
      }
      
      // Draw the cropped square from the source image onto the target canvas, resizing it in the process.
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetSize, targetSize);
      
      // Force JPEG format for smaller file size, which is better for uploads.
      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      resolve(resizedDataUrl);
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for resizing.'));
    };
    img.src = dataUrl;
  });
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.Capturing);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [motionImage, setMotionImage] = useState<string | null>(null);
  const [styleIntensity, setStyleIntensity] = useState<number>(100);
  const [animationAssets, setAnimationAssets] = useState<AnimationAssets | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<BoundingBox[] | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [storyPrompt, setStoryPrompt] = useState<string>('');
  const [typedPlaceholder, setTypedPlaceholder] = useState('');
  const [isPromptFocused, setIsPromptFocused] = useState(false);
  const [frameCount, setFrameCount] = useState<number>(9);
  const [postProcessStrength, setPostProcessStrength] = useState<number>(0.9);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleFileInputRef = useRef<HTMLInputElement>(null);
  const motionFileInputRef = useRef<HTMLInputElement>(null);
  const cameraViewRef = useRef<CameraViewHandles>(null);
  const storyPromptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const shouldAnimateAfterCapture = useRef<boolean>(false);
  const typingAnimationRef = useRef<any>(null);
  const promptWasInitiallyEmpty = useRef<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>('default');
  const [customThemes, setCustomThemes] = useState<CustomThemes>({});
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);


  // --- THEME MANAGEMENT ---
  useEffect(() => {
    const storedTheme = localStorage.getItem('bananimate-theme') as Theme | null;
    if (storedTheme && THEMES.some(t => t.id === storedTheme)) {
        setCurrentTheme(storedTheme);
    }
    try {
        const storedCustoms = localStorage.getItem('bananimate-custom-themes');
        if (storedCustoms) {
            setCustomThemes(JSON.parse(storedCustoms));
        }
    } catch (e) {
        console.error("Failed to parse custom themes from localStorage", e);
    }
  }, []);

  useEffect(() => {
    // 1. Set the base theme class on the body
    document.body.dataset.theme = currentTheme;
    try { localStorage.setItem('bananimate-theme', currentTheme); } catch {}

    // 2. Clear all previously set custom properties
    EDITABLE_THEME_PROPERTIES.forEach(prop => {
        document.documentElement.style.removeProperty(prop.cssVar);
    });

    // 3. Apply custom colors for the current theme
    const customs = customThemes[currentTheme] || {};
    Object.entries(customs).forEach(([cssVar, value]) => {
        if (value) {
            document.documentElement.style.setProperty(cssVar, value);
        }
    });
  }, [currentTheme, customThemes]);

  const handleColorChange = (cssVar: string, value: string) => {
    setCustomThemes(prev => {
        const newCustoms = {
            ...prev,
            [currentTheme]: {
                ...(prev[currentTheme] || {}),
                [cssVar]: value,
            }
        };
        try { localStorage.setItem('bananimate-custom-themes', JSON.stringify(newCustoms)); } catch {}
        return newCustoms;
    });
  };

  const handleThemeReset = () => {
    setCustomThemes(prev => {
        const newCustoms = { ...prev };
        delete newCustoms[currentTheme];
        try { localStorage.setItem('bananimate-custom-themes', JSON.stringify(newCustoms)); } catch {}
        return newCustoms;
    });
  };

  const handleThemeExport = () => {
    try {
        const jsonString = JSON.stringify(customThemes, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bananimate-themes.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Failed to export themes:", e);
        setError("Could not export theme file.");
    }
  };

  const handleThemeImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const result = event.target?.result;
            if (typeof result !== 'string') throw new Error("File could not be read as text.");
            const importedThemes = JSON.parse(result);
            
            // Basic validation
            if (typeof importedThemes !== 'object' || importedThemes === null) {
                throw new Error("Imported file is not a valid JSON object.");
            }

            setCustomThemes(prev => {
                // Merge imported themes with existing ones
                const newCustoms = { ...prev, ...importedThemes };
                try { localStorage.setItem('bananimate-custom-themes', JSON.stringify(newCustoms)); } catch {}
                return newCustoms;
            });
            setIsCustomizerOpen(false); // Close on successful import
        } catch (err) {
            console.error("Failed to import themes:", err);
            setError(err instanceof Error ? `Import Error: ${err.message}` : "Failed to import theme file.");
        }
    };
    reader.onerror = () => {
        setError("Failed to read the selected theme file.");
    };
    reader.readAsText(file);
    // Reset file input value to allow re-importing the same file
    e.target.value = '';
  };


  useEffect(() => {
    const checkForMultipleCameras = async () => {
      if (navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputCount = devices.filter(d => d.kind === 'videoinput').length;
          setHasMultipleCameras(videoInputCount > 1);
        } catch (err) {
          console.error("Failed to enumerate media devices:", err);
        }
      }
    };
    checkForMultipleCameras();
  }, []);
  
  useEffect(() => {
    const startTypingAnimation = () => {
        // Clear any existing animation
        if (typingAnimationRef.current?.timeoutId) {
            clearTimeout(typingAnimationRef.current.timeoutId);
        }

        typingAnimationRef.current = {
            ...typingAnimationRef.current,
            fullText: "'stop-motion animation of...'",
            isDeleting: false,
            text: '',
            timeoutId: null,
            speed: 100,
        };

        const tick = () => {
            const state = typingAnimationRef.current;
            if (!state) return;
            let { fullText, isDeleting, text } = state;

            if (isDeleting) {
                text = fullText.substring(0, text.length - 1);
            } else {
                text = fullText.substring(0, text.length + 1);
            }
            
            setTypedPlaceholder(text);

            let newSpeed = state.speed;
            if(isDeleting) newSpeed /= 2;

            if (!isDeleting && text === fullText) {
                newSpeed = 2000; // Pause at end
                state.isDeleting = true;
            } else if (isDeleting && text === '') {
                state.isDeleting = false;
                newSpeed = 500; // Pause at start
            }

            state.text = text;
            state.timeoutId = setTimeout(tick, newSpeed);
        };
        
        typingAnimationRef.current.timeoutId = setTimeout(tick, typingAnimationRef.current.speed);
    };

    const stopTypingAnimation = () => {
        if (typingAnimationRef.current?.timeoutId) {
            clearTimeout(typingAnimationRef.current.timeoutId);
            typingAnimationRef.current.timeoutId = null;
        }
        setTypedPlaceholder('');
    };

    if (!storyPrompt.trim() && !isPromptFocused) {
        startTypingAnimation();
    } else {
        stopTypingAnimation();
    }

    // Cleanup on unmount
    return () => {
        if (typingAnimationRef.current?.timeoutId) {
            clearTimeout(typingAnimationRef.current.timeoutId);
        }
    };
  }, [storyPrompt, isPromptFocused]);

  const handleCreateAnimation = useCallback(async (isRegeneration: boolean = false) => {
    const currentPrompt = storyPrompt.trim();
    let finalPrompt = currentPrompt;

    if (!isRegeneration) {
        promptWasInitiallyEmpty.current = !currentPrompt;
    }

    const shouldPickRandomPrompt = !currentPrompt || (isRegeneration && promptWasInitiallyEmpty.current);

    if (shouldPickRandomPrompt) {
        // Filter out banana prompt
        const baseSuggestions = promptSuggestions.filter(p => p.emoji !== '🍌');

        // Filter out the current prompt if it exists, to try and get a new one
        let suggestionsToChooseFrom = baseSuggestions.filter(p => p.prompt !== currentPrompt);

        // If filtering leaves an empty pool (e.g., current prompt was the only one),
        // fall back to the full non-banana list.
        if (suggestionsToChooseFrom.length === 0) {
             suggestionsToChooseFrom = baseSuggestions;
        }

        if (suggestionsToChooseFrom.length > 0) {
            const randomSuggestion = suggestionsToChooseFrom[Math.floor(Math.random() * suggestionsToChooseFrom.length)];
            finalPrompt = randomSuggestion.prompt;
            setStoryPrompt(finalPrompt);
        }
    }

    if (!originalImage && !finalPrompt) {
      return;
    }

    const finalCreativeInstruction = buildCreativeInstruction(
        finalPrompt,
        originalImage,
        frameCount,
    );

    setAppState(AppState.Processing);
    setError(null);
    setDetectedObjects(null);
    
    let base64Image: string | null = null;
    let mimeType: string | null = null;

    try {
      if (originalImage) {
        setLoadingMessage('Optimizing image...');
        const resizedImage = await resizeImage(originalImage, 1024, 1024);
        const imageParts = resizedImage.match(/^data:(image\/(?:jpeg|png|webp));base64,(.*)$/);
        if (!imageParts || imageParts.length !== 3) {
          throw new Error("Could not process the resized image data.");
        }
        mimeType = imageParts[1];
        base64Image = imageParts[2];
      }
      
      setLoadingMessage('Generating sprite sheet...');
      
      const generatedAsset = await generateAnimationAssets(
          base64Image,
          mimeType,
          finalCreativeInstruction,
          (message: string) => setLoadingMessage(message)
      );

      if (!generatedAsset || !generatedAsset.imageData.data) {
        throw new Error(`Sprite sheet generation failed. Did not receive a valid image.`);
      }

      setAnimationAssets(generatedAsset);
      setAppState(AppState.Animating);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState(AppState.Capturing);
    }
  }, [storyPrompt, originalImage, frameCount]);
  
  const handlePostProcess = useCallback(async (effect: string, editPrompt?: string) => {
    if (!animationAssets) {
        setError("Cannot apply post-processing: no animation loaded.");
        return;
    }

    setAppState(AppState.Processing);
    setLoadingMessage(`Applying ${effect} effect...`);
    setError(null);
    setDetectedObjects(null); // Clear detections when post-processing

    try {
        const { data: base64SpriteSheet, mimeType } = animationAssets.imageData;
        
        let base64PostStyleImage: string | null = null;
        let stylePostMimeType: string | null = null;

        if (effect === 'apply-style') {
            if (!styleImage) {
                throw new Error("Cannot apply style: no style image was provided.");
            }
            setLoadingMessage('Optimizing style image...');
            const resizedStyleImage = await resizeImage(styleImage, 512, 512);
            const styleImageParts = resizedStyleImage.match(/^data:(image\/(?:jpeg|png|webp));base64,(.*)$/);
            if (!styleImageParts || styleImageParts.length !== 3) {
                throw new Error("Could not process the style image data for post-processing.");
            }
            stylePostMimeType = styleImageParts[1];
            base64PostStyleImage = styleImageParts[2];
        }

        const postProcessPrompt = buildPostProcessPrompt(
            effect, 
            frameCount,
            animationAssets.frameDuration,
            {
                styleIntensity: effect === 'apply-style' ? styleIntensity : undefined,
                editPrompt: effect === 'magic-edit' ? editPrompt : undefined,
            }
        );

        const newAssets = await postProcessAnimation(
            base64SpriteSheet,
            mimeType,
            postProcessPrompt,
            (message: string) => setLoadingMessage(message),
            base64PostStyleImage,
            stylePostMimeType,
            postProcessStrength
        );

        if (!newAssets || !newAssets.imageData.data) {
            throw new Error(`Post-processing failed. Did not receive a valid image.`);
        }
        
        setAnimationAssets(newAssets);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown post-processing error occurred.';
      console.error(err);
      setError(errorMessage);
    } finally {
        setAppState(AppState.Animating);
    }
  }, [animationAssets, frameCount, styleImage, styleIntensity, postProcessStrength]);

  const handleDetectObjects = useCallback(async () => {
    if (!animationAssets) {
      setError("Cannot detect objects: no animation loaded.");
      return;
    }
  
    setAppState(AppState.Processing);
    setLoadingMessage('Detecting objects...');
    setError(null);
  
    try {
      const { data: base64SpriteSheet, mimeType } = animationAssets.imageData;
      const detectionPrompt = buildObjectDetectionPrompt();
  
      const objects = await detectObjectsInAnimation(
        base64SpriteSheet,
        mimeType,
        detectionPrompt
      );
  
      setDetectedObjects(objects);
  
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during object detection.';
      console.error(err);
      setError(errorMessage);
    } finally {
      setAppState(AppState.Animating);
    }
  }, [animationAssets]);

  useEffect(() => {
    if (originalImage && shouldAnimateAfterCapture.current) {
        shouldAnimateAfterCapture.current = false;
        handleCreateAnimation();
    }
  }, [originalImage, handleCreateAnimation]);
  
  useEffect(() => {
    if (storyPromptTextareaRef.current) {
      const textarea = storyPromptTextareaRef.current;
      if (isPromptFocused) {
        // Expand on focus
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      } else {
        // Shrink on blur
        textarea.style.height = ''; // Reverts to CSS-defined height
      }
    }
  }, [storyPrompt, isPromptFocused]);

  const handleCapture = useCallback((imageDataUrl: string) => {
    setOriginalImage(imageDataUrl);
    setIsCameraOpen(false);
  }, []);

  const handleFlipCamera = () => {
    cameraViewRef.current?.flipCamera();
  };

  const handleCameraError = useCallback((message: string) => {
    setError(message);
    setAppState(AppState.Error);
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadStyleClick = () => {
    styleFileInputRef.current?.click();
  };

  const handleUploadMotionClick = () => {
    motionFileInputRef.current?.click();
  };
  
  const handleMotionAnalysis = useCallback(async (motionFile: File) => {
    setAppState(AppState.Processing);
    setLoadingMessage('Analyzing animation...');
    setError(null);

    try {
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
            reader.onloadend = () => resolve();
            reader.onerror = () => {
                console.error("Failed to read file");
                reject(new Error(`Failed to read the selected ${motionFile.type} file.`));
            };
            reader.readAsDataURL(motionFile);
        });

        const dataUrl = reader.result as string;
        
        const newPrompt = await analyzeAnimation(
            dataUrl,
            (message: string) => setLoadingMessage(message)
        );

        setStoryPrompt(newPrompt);
        
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during analysis.';
        console.error(err);
        setError(errorMessage);
    } finally {
        setAppState(AppState.Capturing);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
      };
      reader.onerror = () => {
        console.error("Failed to read file");
        setError("Failed to read the selected image file.");
        setAppState(AppState.Error);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleStyleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStyleImage(reader.result as string);
      };
      reader.onerror = () => {
        console.error("Failed to read file");
        setError("Failed to read the selected style image file.");
        setAppState(AppState.Error);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleMotionFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const acceptedTypes = ['image/gif', 'image/webp', 'image/avif'];
      if (acceptedTypes.includes(file.type)) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setMotionImage(reader.result as string);
        };
        reader.onerror = () => {
          console.error("Failed to read file for motion preview");
          setError("Failed to read the selected motion file.");
        };
        reader.readAsDataURL(file);
        handleMotionAnalysis(file);
      } else {
        setError("Please upload a GIF, WEBP, or AVIF file for motion analysis.");
      }
    }
  };

    const handlePasteUrl = async (type: 'main' | 'style' | 'motion') => {
        const url = window.prompt(`Please paste the URL for the ${type === 'main' ? 'subject' : type} image:`);
        if (!url) return;

        setAppState(AppState.Processing);
        setLoadingMessage('Fetching image from URL...');
        setError(null);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            const blob = await response.blob();
            
            const reader = new FileReader();
            
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                if (type === 'main') {
                    if (!blob.type.startsWith('image/') || blob.type === 'image/gif') {
                         setError('Please provide a URL for a static image (JPEG, PNG, WEBP, AVIF).');
                         setAppState(AppState.Capturing);
                         return;
                    }
                    setOriginalImage(dataUrl);
                } else if (type === 'style') {
                     if (!blob.type.startsWith('image/') || blob.type === 'image/gif') {
                         setError('Please provide a URL for an image file (JPEG, PNG, WEBP, AVIF).');
                         setAppState(AppState.Capturing);
                         return;
                    }
                    setStyleImage(dataUrl);
                } else if (type === 'motion') {
                    const acceptedTypes = ['image/gif', 'image/webp', 'image/avif'];
                    if (!acceptedTypes.includes(blob.type)) {
                        setError('Please provide a URL for a GIF, WEBP, or AVIF file for motion analysis.');
                        setAppState(AppState.Capturing);
                        return;
                    }
                    setMotionImage(dataUrl);
                    const extension = blob.type.split('/')[1] ?? 'gif';
                    const file = new File([blob], `motion.${extension}`, { type: blob.type });
                    handleMotionAnalysis(file);
                    return;
                }
                setAppState(AppState.Capturing);
            };

            reader.onerror = () => {
                throw new Error("Failed to read image data from the fetched URL.");
            };

            reader.readAsDataURL(blob);

        } catch (err) {
            console.error("Error fetching URL:", err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            const corsErrorHint = errorMessage.toLowerCase().includes('failed to fetch') ? 'This might be due to a network error or the server\'s CORS policy preventing direct access. ' : '';
            setError(`Could not fetch image from URL. ${corsErrorHint}Please try a different URL. Error: ${errorMessage}`);
            setAppState(AppState.Capturing);
        }
    };

  const handleClearImage = () => {
    setOriginalImage(null);
    setIsCameraOpen(false);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };
  
  const handleClearStyleImage = () => {
    setStyleImage(null);
    if(styleFileInputRef.current) {
        styleFileInputRef.current.value = '';
    }
  };

  const handleClearMotionImage = () => {
    setMotionImage(null);
    if(motionFileInputRef.current) {
        motionFileInputRef.current.value = '';
    }
  };
  
  const handleBack = () => {
    setAppState(AppState.Capturing);
    setAnimationAssets(null);
    setError(null);
    setDetectedObjects(null);
  };
  
  const handleSuggestionClick = (prompt: string) => {
    setStoryPrompt(currentPrompt => {
      if (ALLOW_MULTIPLE_EMOJI_SELECTION) {
        const hasPrompt = currentPrompt.includes(prompt);
        if (hasPrompt) {
          // Remove the prompt and clean up whitespace
          return currentPrompt
            .replace(prompt, '')
            .replace(/\s\s+/g, ' ') // Replace multiple spaces with a single one
            .trim();
        } else {
          // Add the prompt
          return (currentPrompt ? `${currentPrompt} ${prompt}` : prompt).trim();
        }
      } else {
        // Single selection mode: if the current prompt is the one clicked, clear it.
        // Otherwise, replace the current prompt with the clicked one.
        return currentPrompt === prompt ? '' : prompt;
      }
    });
  };
  
  const handlePrimaryAction = useCallback(() => {
    if (isCameraOpen) {
        if (cameraViewRef.current) {
            shouldAnimateAfterCapture.current = true;
            cameraViewRef.current.capture();
        }
    } else {
        handleCreateAnimation();
    }
  }, [isCameraOpen, handleCreateAnimation]);
  
  const isBananimateDisabled = !isCameraOpen && !originalImage && (REQUIRE_IMAGE_FOR_ANIMATION || !storyPrompt.trim());

  const renderContent = () => {
    switch (appState) {
      case AppState.Capturing:
        return (
          <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
             <div className="w-full mt-3 mb-2 overflow-x-auto no-scrollbar" aria-label="Animation style suggestions">
                <div className="w-max mx-auto flex items-center gap-x-3 sm:gap-x-4 px-4">
                  {promptSuggestions.map(({ emoji, prompt }) => {
                    const isActive = ALLOW_MULTIPLE_EMOJI_SELECTION
                      ? storyPrompt.includes(prompt)
                      : storyPrompt === prompt;
                    
                    const ariaLabelAction = ALLOW_MULTIPLE_EMOJI_SELECTION
                      ? (isActive ? 'Remove' : 'Add')
                      : (isActive ? 'Deselect' : 'Select');
                      
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleSuggestionClick(prompt)}
                        className={`text-3xl p-2 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] focus-visible:ring-[var(--color-accent)] ${isActive ? 'bg-[var(--color-accent)]' : 'hover:bg-[var(--color-overlay)]'}`}
                        title={prompt}
                        aria-label={`${ariaLabelAction} animation prompt: ${prompt}`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
            </div>
            <div className="flex justify-center gap-2 mb-2">
                {[4, 9, 16].map(count => (
                  <button
                    key={count}
                    onClick={() => setFrameCount(count)}
                    className={`px-4 py-1 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] focus-visible:ring-[var(--color-accent)] ${
                      frameCount === count
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-button)] text-[var(--color-text-muted)] hover:bg-[var(--color-button-hover)]'
                    }`}
                  >
                    {count} Frames
                  </button>
                ))}
            </div>
            <div className="w-full mb-2 relative">
              {/* A 'fake' placeholder is used because the native placeholder attribute doesn't support newlines. */}
              {!storyPrompt && !isPromptFocused && (
                <div className="absolute top-0 left-0 px-4 py-3 text-[var(--color-text-muted)] text-lg pointer-events-none" aria-hidden="true">
                  What would you like to <span className="text-[var(--color-warning)]">Bananimate</span>?<br />
                  <span className="text-[var(--color-text-subtle)]">
                    {typedPlaceholder}
                    <span className="animate-pulse font-normal">|</span>
                  </span>
                </div>
              )}
              <textarea
                ref={storyPromptTextareaRef}
                id="storyPrompt"
                rows={3}
                className="w-full bg-[var(--color-overlay)] text-[var(--color-text-base)] border border-[var(--color-surface-alt)] rounded-lg px-4 py-3 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all duration-300 text-lg resize-none overflow-y-auto"
                value={storyPrompt}
                onChange={e => setStoryPrompt(e.target.value)}
                onFocus={() => setIsPromptFocused(true)}
                onBlur={() => {
                  // We add a small delay to allow click events on other elements to fire before the blur causes a layout shift.
                  setTimeout(() => setIsPromptFocused(false), 150);
                }}
                aria-label="Animation prompt"
              />
            </div>
            <div className="w-full mb-4 flex flex-col sm:flex-row gap-2">
                <div className="w-full sm:w-1/2">
                    <div className="relative w-full h-24 bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-surface-alt)] rounded-lg flex items-center justify-center">
                        {styleImage ? (
                            <>
                                <img src={styleImage} alt="Style Preview" className="h-full w-full object-contain p-1" />
                                <button
                                    onClick={handleClearStyleImage}
                                    className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white hover:bg-black/75 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                                    aria-label="Remove style image"
                                >
                                    <XCircleIcon className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <div className="text-center">
                                <p className="text-[var(--color-text-muted)] text-sm mb-2">Optionally, add a style</p>
                                <div className="flex justify-center gap-x-2">
                                  <button
                                      onClick={handleUploadStyleClick}
                                      className="bg-[var(--color-button)] text-white font-bold py-1 px-3 text-sm rounded-lg hover:bg-[var(--color-button-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                                  >
                                      Upload Style
                                  </button>
                                  <button
                                      onClick={() => handlePasteUrl('style')}
                                      className="bg-[var(--color-button)] text-white font-bold py-1 px-3 text-sm rounded-lg hover:bg-[var(--color-button-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                                  >
                                      URL
                                  </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {styleImage && (
                        <div className="mt-2 px-1">
                            <label htmlFor="styleIntensity" className="block text-sm font-medium text-[var(--color-text-muted)]">
                                Style Intensity
                            </label>
                            <div className="flex items-center gap-3 mt-1">
                                <input
                                    id="styleIntensity"
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={styleIntensity}
                                    onChange={e => setStyleIntensity(Number(e.target.value))}
                                    className="w-full h-2 bg-[var(--color-surface-alt)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
                                    aria-label="Style intensity"
                                />
                                <span className="w-16 text-center text-sm bg-[var(--color-button)] rounded-md py-1">
                                    {styleIntensity}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="w-full sm:w-1/2">
                    <div className="relative w-full h-24 bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-surface-alt)] rounded-lg flex items-center justify-center">
                        {motionImage ? (
                             <>
                                <img src={motionImage} alt="Motion Preview" className="h-full w-full object-contain p-1" />
                                <button
                                    onClick={handleClearMotionImage}
                                    className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white hover:bg-black/75 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                                    aria-label="Remove motion image"
                                >
                                    <XCircleIcon className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <div className="text-center">
                                <p className="text-[var(--color-text-muted)] text-sm mb-2">Extract prompt from GIF</p>
                                <div className="flex justify-center gap-x-2">
                                  <button
                                      onClick={handleUploadMotionClick}
                                      className="bg-[var(--color-button)] text-white font-bold py-1 px-3 text-sm rounded-lg hover:bg-[var(--color-button-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                                  >
                                      Upload Motion
                                  </button>
                                  <button
                                      onClick={() => handlePasteUrl('motion')}
                                      className="bg-[var(--color-button)] text-white font-bold py-1 px-3 text-sm rounded-lg hover:bg-[var(--color-button-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                                  >
                                      URL
                                  </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {error && (
              <div className="w-full bg-[var(--color-danger-surface)] border border-[var(--color-danger)] text-[var(--color-danger-text)] px-4 py-3 rounded-lg relative mb-4 flex items-center justify-between animate-shake" role="alert">
                <div className="pr-4">
                  <strong className="font-bold block">Ohoh Bananimate couldn't Bananimate that one. Try again possibly with a new image and prompt ...?</strong>
                  <span className="text-sm block mt-1">{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="p-1 -mr-2 flex-shrink-0 self-start"
                  aria-label="Close error message"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
            )}
            
            <div className="relative w-full [@media(max-height:750px)]:w-96 [@media(max-height:650px)]:w-72 aspect-square bg-[var(--color-surface)] rounded-lg overflow-hidden shadow-2xl flex items-center justify-center">
              {originalImage ? (
                  <>
                      <img src={originalImage} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={handleClearImage}
                        className="absolute top-4 left-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/75 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                        aria-label="Remove image"
                      >
                        <XCircleIcon className="w-6 h-6" />
                      </button>
                  </>
              ) : isCameraOpen ? (
                  <>
                      <CameraView ref={cameraViewRef} onCapture={handleCapture} onError={handleCameraError} />
                       <button
                          onClick={() => setIsCameraOpen(false)}
                          className="absolute top-4 left-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/75 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                          aria-label="Close camera"
                      >
                        <XCircleIcon className="w-6 h-6" />
                      </button>
                      {hasMultipleCameras && (
                          <button
                              onClick={handleFlipCamera}
                              className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/75 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                              aria-label="Flip camera"
                          >
                              <SwitchCameraIcon className="w-6 h-6" />
                          </button>
                      )}
                  </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full w-full pb-32">
                  <p className="mb-4 text-[var(--color-text-muted)] text-lg">
                    {REQUIRE_IMAGE_FOR_ANIMATION ? 'Add an image to Bananimate' : 'Optionally, add an image to Bananimate'}
                  </p>
                  <div className="flex flex-col items-center gap-4">
                    <button
                      onClick={() => setIsCameraOpen(true)}
                      className="w-52 bg-[var(--color-accent)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors duration-300 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                      aria-label="Use camera to take a photo"
                    >
                      <CameraIcon className="w-6 h-6 mr-3" />
                      Open Camera
                    </button>
                    <button
                      onClick={handleUploadClick}
                      className="w-52 bg-[var(--color-button)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-button-hover)] transition-colors duration-300 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                      aria-label="Upload an image from your device"
                    >
                      <UploadIcon className="w-6 h-6 mr-3" />
                      Upload Image
                    </button>
                    <button
                      onClick={() => handlePasteUrl('main')}
                      className="w-52 bg-[var(--color-button)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-button-hover)] transition-colors duration-300 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                      aria-label="Paste an image URL"
                    >
                      <LinkIcon className="w-6 h-6 mr-3" />
                      Paste URL
                    </button>
                  </div>
                </div>
              )}
              {/* Button is now positioned over the image/camera view */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                <BanamimatorButton
                  onClick={handlePrimaryAction}
                  disabled={isBananimateDisabled}
                  aria-label={isCameraOpen ? 'Capture and Animate' : 'Create Animation'}
                />
              </div>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/png, image/jpeg, image/webp, image/avif"
            />
             <input
              type="file"
              ref={styleFileInputRef}
              onChange={handleStyleFileChange}
              className="hidden"
              accept="image/png, image/jpeg, image/webp, image/avif"
            />
            <input
              type="file"
              ref={motionFileInputRef}
              onChange={handleMotionFileChange}
              className="hidden"
              accept="image/gif,image/webp,image/avif"
            />
          </div>
        );
      case AppState.Processing:
        return <LoadingOverlay message={loadingMessage} />;
      case AppState.Animating:
        return animationAssets ? (
          <AnimationPlayer 
            assets={animationAssets} 
            frameCount={frameCount} 
            onRegenerate={() => handleCreateAnimation(true)} 
            onBack={handleBack}
            onPostProcess={handlePostProcess}
            onDetectObjects={handleDetectObjects}
            detectedObjects={detectedObjects}
            error={error}
            clearError={() => setError(null)}
            styleImage={styleImage}
            postProcessStrength={postProcessStrength}
            onPostProcessStrengthChange={setPostProcessStrength}
          />
        ) : null;
      case AppState.Error:
        return (
          <div className="text-center bg-[var(--color-danger-surface)] p-8 rounded-lg max-w-md w-full">
            <p className="text-[var(--color-text-base)] mb-6 font-medium text-lg">{error}</p>
            <button
              onClick={handleBack}
              className="bg-[var(--color-accent)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
            >
              Try Again
            </button>
          </div>
        );
    }
  };

  return (
    <div className="h-dvh bg-[var(--color-background)] text-[var(--color-text-base)] flex flex-col items-center p-4 overflow-y-auto">
      <div className="w-full grow flex items-center [@media(max-height:750px)]:items-start justify-center">
        {renderContent()}
      </div>
      <footer className="w-full shrink-0 p-4 text-center text-[var(--color-text-subtle)] text-xs flex justify-center items-center gap-x-6">
        <span>Built with Gemini 2.5 Flash Image Preview | Created by <a href="http://x.com/pitaru" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-accent)]">@pitaru</a></span>
        <ThemeSwitcher 
            currentTheme={currentTheme} 
            onThemeChange={setCurrentTheme} 
            onCustomize={() => setIsCustomizerOpen(true)}
        />
      </footer>
       {isCustomizerOpen && (
            <ThemeCustomizer
                theme={currentTheme}
                customColors={customThemes[currentTheme] || {}}
                onColorChange={handleColorChange}
                onReset={handleThemeReset}
                onImport={handleThemeImport}
                onExport={handleThemeExport}
                onClose={() => setIsCustomizerOpen(false)}
            />
        )}
    </div>
  );
};

export default App;
