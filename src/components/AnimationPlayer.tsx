/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimationAssets, BoundingBox } from '../services/geminiService';
import { Frame } from '../types';
import BananaLoader from './BananaLoader';
import { InfoIcon, XCircleIcon, SettingsIcon, LoaderIcon, WandIcon } from './icons';
import AnimatedExportButton from './AnimatedExportButton';

// Add declaration for the gifshot library loaded from CDN
declare var gifshot: any;
// Add declaration for the onnxruntime-web library loaded from CDN
declare var ort: any;

// --- DEBUG FLAG ---
// Set to `true` to disable the share button for testing layout.
const DISABLE_SHARE_BUTTON = false;

interface AnimationPlayerProps {
  assets: AnimationAssets;
  frameCount: number;
  onRegenerate: () => void;
  onBack: () => void;
  onPostProcess: (effect: string, editPrompt?: string) => void;
  onDetectObjects: () => void;
  detectedObjects: BoundingBox[] | null;
  error: string | null;
  clearError: () => void;
  styleImage: string | null;
  postProcessStrength: number;
  onPostProcessStrengthChange: (strength: number) => void;
}

interface AnimationConfig {
  speed: number;
}

const DEFAULT_CONFIG: AnimationConfig = {
  speed: 120, // ms per frame
};

const POST_PROCESS_EFFECTS = [
    { id: 'consistency', label: 'Improve Consistency' },
    { id: 'interpolate', label: '✨ Smooth Motion', local: true },
    { id: 'remove-bg', label: 'Remove BG' },
    { id: 'grayscale', label: 'Grayscale' },
    { id: 'vintage', label: 'Vintage Film' },
    { id: 'neon-punk', label: 'Neon Punk' },
    { id: '8-bit', label: '8-bit' },
    { id: 'toy-figure', label: 'Toy Figure' },
    { id: 'ps1-style', label: 'PS1 Style' },
];

const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(',');
    if (arr.length < 2) {
        throw new Error('Invalid data URL');
    }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Could not parse MIME type from data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}


const ControlSlider: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    helpText: string;
}> = ({ label, value, min, max, step, onChange, helpText }) => (
    <div>
        <label htmlFor={label} className="block text-sm font-medium text-[var(--color-text-muted)]">
            {label}
        </label>
        <div className="flex items-center gap-3 mt-1">
            <input
                id={label}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-2 bg-[var(--color-surface-alt)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
            />
            <input
                type="number"
                value={value}
                min={min}
                max={max}
                onChange={e => onChange(Number(e.target.value))}
                className="w-20 bg-[var(--color-surface)] text-[var(--color-text-base)] border border-[var(--color-surface-alt)] rounded-md px-2 py-1 text-center"
            />
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">{helpText}</p>
    </div>
);

// --- ONNX Frame Interpolation ---
const MODEL_URL = 'https://huggingface.co/TensorStack/RIFE/resolve/main/model.onnx';
const MODEL_INPUT_SIZE = 256;

// Helper to convert an image to a padded tensor for the RIFE model
const imageToPaddedTensor = (image: HTMLImageElement, width: number, height: number): any => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    const [r, g, b] = [[], [], []];
    for (let i = 0; i < imageData.data.length; i += 4) {
        r.push(imageData.data[i] / 255.0);
        g.push(imageData.data[i + 1] / 255.0);
        b.push(imageData.data[i + 2] / 255.0);
    }
    const transposedData = [...r, ...g, ...b];
    const float32Data = new Float32Array(transposedData);
    
    return new ort.Tensor('float32', float32Data, [1, 3, height, width]);
};

// Helper to convert an output tensor back to an image
const tensorToImage = async (tensor: any, originalWidth: number, originalHeight: number): Promise<HTMLImageElement> => {
    const tensorWidth = tensor.dims[3];
    const tensorHeight = tensor.dims[2];
    const data = tensor.data;
    
    const [r, g, b] = [
        data.slice(0, tensorWidth * tensorHeight),
        data.slice(tensorWidth * tensorHeight, 2 * tensorWidth * tensorHeight),
        data.slice(2 * tensorWidth * tensorHeight),
    ];

    const canvas = document.createElement('canvas');
    canvas.width = tensorWidth;
    canvas.height = tensorHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    const imageData = new Uint8ClampedArray(4 * tensorWidth * tensorHeight);
    for (let i = 0; i < tensorWidth * tensorHeight; i++) {
        imageData[4 * i] = (r[i] * 255) | 0;
        imageData[4 * i + 1] = (g[i] * 255) | 0;
        imageData[4 * i + 2] = (b[i] * 255) | 0;
        imageData[4 * i + 3] = 255;
    }
    ctx.putImageData(new ImageData(imageData, tensorWidth, tensorHeight), 0, 0);

    // Resize back to original dimensions
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = originalWidth;
    finalCanvas.height = originalHeight;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) throw new Error('Could not get final canvas context');
    finalCtx.drawImage(canvas, 0, 0, originalWidth, originalHeight);

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = finalCanvas.toDataURL();
    });
};

const AnimationPlayer: React.FC<AnimationPlayerProps> = ({ assets, frameCount, onRegenerate, onBack, onPostProcess, error, clearError, styleImage, onDetectObjects, detectedObjects, postProcessStrength, onPostProcessStrengthChange }) => {
  const [frames, setFrames] = useState<HTMLImageElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showControls, setShowControls] = useState(false);
  const [config, setConfig] = useState<AnimationConfig>({
    ...DEFAULT_CONFIG,
    speed: assets.frameDuration || DEFAULT_CONFIG.speed,
  });
  const [viewMode, setViewMode] = useState<'animation' | 'spritesheet'>('animation');
  const animationFrameId = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number>(0);
  
  const [spriteSheetImage, setSpriteSheetImage] = useState<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [displayFrames, setDisplayFrames] = useState<Frame[]>([]);
  const [pendingAction, setPendingAction] = useState<'export' | 'share' | null>(null);
  const [magicEditPrompt, setMagicEditPrompt] = useState<string>('');

  // State for ONNX-based frame interpolation
  const [isInterpolating, setIsInterpolating] = useState(false);
  const [interpolationMessage, setInterpolationMessage] = useState('');
  const [interpolatedFrames, setInterpolatedFrames] = useState<HTMLImageElement[] | null>(null);
  const onnxSessionRef = useRef<any>(null);


  const isShareAvailable = typeof navigator !== 'undefined' && navigator.share && !DISABLE_SHARE_BUTTON;

  const handleInterpolate = async () => {
    if (isInterpolating || frames.length === 0 || interpolatedFrames) return;

    if (typeof ort === 'undefined' || !ort) {
      alert("The 'Smooth Motion' model is still loading. Please wait a moment and try again.");
      return;
    }

    setIsInterpolating(true);
    setInterpolationMessage('Initializing interpolation model...');
    try {
        if (!onnxSessionRef.current) {
            ort.env.wasm.wasmPaths = `https://unpkg.com/onnxruntime-web@1.18.0/dist/`;
            
            onnxSessionRef.current = await ort.InferenceSession.create(MODEL_URL, {
                executionProviders: ['wasm'],
            });
        }
        const session = onnxSessionRef.current;
        const newFrames: HTMLImageElement[] = [];
        
        const originalWidth = frames[0].naturalWidth;
        const originalHeight = frames[0].naturalHeight;

        for (let i = 0; i < frames.length -1; i++) {
            setInterpolationMessage(`Interpolating frame ${i + 1}/${frames.length - 1}...`);
            newFrames.push(frames[i]);
            
            const tensor1 = imageToPaddedTensor(frames[i], MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
            const tensor2 = imageToPaddedTensor(frames[i+1], MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);

            const feeds = { 'img0': tensor1, 'img1': tensor2 };
            const results = await session.run(feeds);
            const outputTensor = results.img_out;
            
            const interpolatedImage = await tensorToImage(outputTensor, originalWidth, originalHeight);
            newFrames.push(interpolatedImage);
        }
        newFrames.push(frames[frames.length - 1]);
        setInterpolatedFrames(newFrames);
    } catch(err) {
        console.error("Frame interpolation failed:", err);
        setInterpolationMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
        setIsInterpolating(false);
    }
  };
  
  const performExport = useCallback(() => {
    if (typeof gifshot === 'undefined' || !gifshot) {
      alert("The GIF exporter is still loading. Please wait a moment and try again.");
      return;
    }
    const framesToExport = interpolatedFrames || frames;
    if (framesToExport.length === 0 || !canvasRef.current) return;
    setIsExporting(true);

    const imageUrls = framesToExport.map(frame => frame.src);
    const speedToUse = interpolatedFrames ? config.speed / 2 : config.speed;
    const intervalInSeconds = speedToUse / 1000;
    const gifWidth = canvasRef.current.width;
    const gifHeight = canvasRef.current.height;

    gifshot.createGIF({
        images: imageUrls,
        gifWidth: gifWidth,
        gifHeight: gifHeight,
        interval: intervalInSeconds,
        numWorkers: 2,
    }, (obj: { error: boolean; image: string; errorMsg: string }) => {
        setIsExporting(false);
        if (!obj.error) {
            const a = document.createElement('a');
            a.href = obj.image;
            a.download = 'animation.gif';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            console.error('GIF export failed:', obj.errorMsg);
        }
    });
  }, [frames, config.speed, interpolatedFrames]);

  const performShare = useCallback(async () => {
    if (typeof gifshot === 'undefined' || !gifshot) {
      alert("The GIF exporter is still loading. Please wait a moment and try again.");
      return;
    }
    const framesToShare = interpolatedFrames || frames;
    if (!isShareAvailable || framesToShare.length === 0 || !canvasRef.current) return;
    setIsSharing(true);

    const imageUrls = framesToShare.map(frame => frame.src);
    const speedToUse = interpolatedFrames ? config.speed / 2 : config.speed;
    const intervalInSeconds = speedToUse / 1000;

    gifshot.createGIF({
        images: imageUrls,
        gifWidth: canvasRef.current.width,
        gifHeight: canvasRef.current.height,
        interval: intervalInSeconds,
        numWorkers: 2,
    }, async (obj: { error: boolean; image: string; errorMsg: string }) => {
        setIsSharing(false);
        if (!obj.error) {
            try {
                const blob = dataURLtoBlob(obj.image);
                const file = new File([blob], "animation.gif", { type: "image/gif" });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'My Banamimation',
                        text: 'Check out this animation I created!',
                    });
                } else {
                    console.error("Sharing not supported for these files.");
                    alert("Your browser doesn't support sharing this file.");
                }
            } catch (error) {
                console.error('Error sharing GIF:', error);
                if (error instanceof Error && error.name !== 'AbortError') {
                  alert(`Sharing failed: ${error.message}`);
                }
            }
        } else {
            console.error('GIF export for sharing failed:', obj.errorMsg);
            alert(`Could not create GIF for sharing: ${obj.errorMsg}`);
        }
    });
  }, [frames, config.speed, isShareAvailable, interpolatedFrames]);
  
  useEffect(() => {
    if (pendingAction && viewMode === 'animation' && canvasRef.current) {
        if (pendingAction === 'export') {
            performExport();
        } else if (pendingAction === 'share') {
            performShare();
        }
        setPendingAction(null);
    }
  }, [pendingAction, viewMode, performExport, performShare]);

  useEffect(() => {
    if (!assets.imageData || !assets.imageData.data) {
        setIsLoading(false);
        setFrames([]);
        setSpriteSheetImage(null);
        return;
    }
    
    setIsLoading(true);
    setFrames([]);

    const img = new Image();
    img.onload = () => {
        setSpriteSheetImage(img);
        
        const { naturalWidth, naturalHeight } = img;
        const gridDim = Math.sqrt(frameCount);
        const frameWidth = Math.floor(naturalWidth / gridDim);
        const frameHeight = Math.floor(naturalHeight / gridDim);

        if (frameWidth <= 0 || frameHeight <= 0) {
            console.error(`Invalid frame dimensions calculated: ${frameWidth}x${frameHeight}`);
            setIsLoading(false);
            return;
        }

        const frameLayout: Frame[] = [];
        for (let i = 0; i < frameCount; i++) {
            const x = (i % gridDim) * frameWidth;
            const y = Math.floor(i / gridDim) * frameHeight;
            frameLayout.push({ 
                x: x, 
                y: y, 
                width: frameWidth, 
                height: frameHeight 
            });
        }
        
        setDisplayFrames(frameLayout);

        const INSET_PIXELS = 2;

        const framePromises: Promise<HTMLImageElement>[] = frameLayout.map(frame => {
          return new Promise((resolve, reject) => {
            if (frame.width <= 0 || frame.height <= 0) {
                console.error("Invalid frame dimensions for slicing:", frame);
                const emptyImage = new Image();
                emptyImage.onload = () => resolve(emptyImage);
                emptyImage.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
                return;
            }
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = frame.width;
            frameCanvas.height = frame.height;
            const frameCtx = frameCanvas.getContext('2d');
            if (frameCtx) {
              const sx = frame.x + INSET_PIXELS;
              const sy = frame.y + INSET_PIXELS;
              const sWidth = frame.width - (INSET_PIXELS * 2);
              const sHeight = frame.height - (INSET_PIXELS * 2);

              frameCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, frame.width, frame.height);
            }
            const frameImage = new Image();
            frameImage.onload = () => resolve(frameImage);
            frameImage.onerror = () => reject(new Error('Failed to load sliced frame image'));
            frameImage.src = frameCanvas.toDataURL();
          });
        });

        Promise.all(framePromises).then(loadedFrames => {
          setFrames(loadedFrames);
          setInterpolatedFrames(null);
          setIsLoading(false);
        }).catch(error => {
            console.error("Error loading frame images:", error);
            setIsLoading(false);
        });
    }
    img.onerror = () => {
        console.error("Failed to load generated image.");
        setIsLoading(false);
    }
    img.src = `data:${assets.imageData.mimeType};base64,${assets.imageData.data}`;
  }, [assets, frameCount]);

  useEffect(() => {
    animationStartTimeRef.current = 0;
  }, [frames, interpolatedFrames]);

  useEffect(() => {
    const framesToUse = interpolatedFrames || frames;
    if (framesToUse.length === 0 || !canvasRef.current || isLoading || viewMode !== 'animation') {
      if(animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 512;
    canvas.height = 512;
    
    const speedToUse = interpolatedFrames ? config.speed / 2 : config.speed;
    
    const animate = (timestamp: number) => {
      if(animationStartTimeRef.current === 0) animationStartTimeRef.current = timestamp;
      
      const totalDuration = framesToUse.length * speedToUse;
      const elapsedTime = (timestamp - animationStartTimeRef.current) % totalDuration;
      const currentFrameIndex = Math.floor(elapsedTime / speedToUse);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(framesToUse[currentFrameIndex], 0, 0, canvas.width, canvas.height);
      
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [frames, interpolatedFrames, config, isLoading, viewMode]);
  
  const getImageDisplayDimensions = useCallback(() => {
    if (!spriteSheetImage || !containerRef.current) {
      return { x: 0, y: 0, width: 0, height: 0, scale: 1 };
    }
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const imgRatio = spriteSheetImage.naturalWidth / spriteSheetImage.naturalHeight;
    const containerRatio = containerRect.width / containerRect.height;
    let finalWidth, finalHeight, offsetX, offsetY;
  
    if (imgRatio > containerRatio) {
      finalWidth = containerRect.width;
      finalHeight = finalWidth / imgRatio;
      offsetX = 0;
      offsetY = (containerRect.height - finalHeight) / 2;
    } else {
      finalHeight = containerRect.height;
      finalWidth = finalHeight * imgRatio;
      offsetY = 0;
      offsetX = (containerRect.width - finalWidth) / 2;
    }
  
    return {
      width: finalWidth,
      height: finalHeight,
      x: offsetX,
      y: offsetY,
      scale: finalWidth / spriteSheetImage.naturalWidth,
    };
  }, [spriteSheetImage]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const container = containerRef.current;
    const img = spriteSheetImage;

    if (!canvas || !container || !img) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const draw = () => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
    
        const containerRect = container.getBoundingClientRect();
        canvas.width = containerRect.width;
        canvas.height = containerRect.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        const { scale, x: offsetX, y: offsetY, width: imgDispWidth, height: imgDispHeight } = getImageDisplayDimensions();

        if (viewMode === 'spritesheet' && displayFrames.length > 0) {
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 2;
            displayFrames.forEach((frame) => {
                const rectX = frame.x * scale + offsetX;
                const rectY = frame.y * scale + offsetY;
                const rectW = frame.width * scale;
                const rectH = frame.height * scale;
                ctx.strokeRect(rectX, rectY, rectW, rectH);
            });
        }
      
        if (viewMode === 'spritesheet' && detectedObjects && detectedObjects.length > 0) {
            ctx.strokeStyle = 'rgba(255, 0, 255, 0.9)';
            ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.font = 'bold 14px sans-serif';
  
            detectedObjects.forEach(obj => {
                const [yMin, xMin, yMax, xMax] = obj.box_2d;
                
                const rectX = (xMin / 1000) * imgDispWidth + offsetX;
                const rectY = (yMin / 1000) * imgDispHeight + offsetY;
                const rectW = ((xMax - xMin) / 1000) * imgDispWidth;
                const rectH = ((yMax - yMin) / 1000) * imgDispHeight;
  
                ctx.strokeRect(rectX, rectY, rectW, rectH);
                ctx.fillRect(rectX, rectY, rectW, rectH);
                
                ctx.fillStyle = 'rgba(255, 0, 255, 0.9)';
                ctx.fillText(obj.label, rectX + 4, rectY + 16);
            });
        }
    };

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(container);
    draw();

    return () => {
      resizeObserver.disconnect();
    };
  }, [viewMode, spriteSheetImage, displayFrames, getImageDisplayDimensions, detectedObjects]);


 const handleExport = () => {
    if (viewMode === 'spritesheet') {
        setViewMode('animation');
        setPendingAction('export');
    } else {
        performExport();
    }
 };
 
  const handleShare = () => {
    if (viewMode === 'spritesheet') {
        setViewMode('animation');
        setPendingAction('share');
    } else {
        performShare();
    }
  };

  const handleLocalPostProcess = (effectId: string) => {
    if (effectId === 'interpolate') {
        handleInterpolate();
    }
  };

  const currentFrames = interpolatedFrames || frames;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl">
      {error && (
        <div className="w-full max-w-lg bg-[var(--color-danger-surface)] border border-[var(--color-danger)] text-[var(--color-danger-text)] px-4 py-3 rounded-lg relative mb-4 flex items-center justify-between animate-shake" role="alert">
          <div className="pr-4">
            <strong className="font-bold block">Post-processing failed.</strong>
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="p-1 -mr-2 flex-shrink-0"
            aria-label="Close error message"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>
      )}
      <div 
        ref={containerRef} 
        className="relative w-full max-w-lg aspect-square bg-black rounded-lg overflow-hidden shadow-2xl mb-4 flex items-center justify-center"
        >
        {isLoading ? (
           <div className="flex flex-col items-center justify-center text-center p-8">
            <BananaLoader className="w-60 h-60" />
          </div>
        ) : (
            <>
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                {viewMode === 'animation' && (
                  <button
                    onClick={() => setShowControls(prev => !prev)}
                    className="bg-black/50 p-2 rounded-full text-white hover:bg-black/75 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                    aria-label={showControls ? 'Hide animation controls' : 'Show animation controls'}
                  >
                    <SettingsIcon className={`w-6 h-6 transition-colors ${showControls ? 'text-[var(--color-warning)]' : ''}`} />
                  </button>
                )}
                <button
                  onClick={() => {
                    const newMode = viewMode === 'animation' ? 'spritesheet' : 'animation';
                    setViewMode(newMode);
                    if (newMode === 'spritesheet') {
                      setShowControls(false);
                    }
                  }}
                  className="bg-black/50 p-2 rounded-full text-white hover:bg-black/75 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                  aria-label={viewMode === 'animation' ? 'Show info and sprite sheet' : 'Close info and show animation'}
                >
                  {viewMode === 'animation' ? <InfoIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6 text-[var(--color-warning)]" />}
                </button>
              </div>

              {viewMode === 'animation' && (
                <canvas ref={canvasRef} className={'w-full aspect-square object-contain'} data-testid="animation-canvas" />
              )}
              {viewMode === 'spritesheet' && spriteSheetImage && (
                <>
                  <img 
                      src={spriteSheetImage.src} 
                      alt="Generated Sprite Sheet" 
                      className="max-w-full max-h-full object-contain bg-[var(--color-overlay)]" 
                  />
                   <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 text-center z-10 backdrop-blur-sm">
                        <p className="text-sm text-[var(--color-text-base)] max-w-prose mx-auto">
                            This animation was created with just one call to the 🍌 Gemini model by asking it to create this sprite sheet
                        </p>
                  </div>
                </>
              )}
               {currentFrames.length === 0 && !isLoading && viewMode === 'animation' && (
                  <div className="text-center text-[var(--color-danger)] p-4">
                      <h3 className="text-lg font-bold">No frames found</h3>
                      <p className="text-sm">Could not extract frames from the source image.</p>
                  </div>
              )}
            </>
        )}
        <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 pointer-events-none z-10" />
        {showControls && viewMode === 'animation' && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-4 z-30 backdrop-blur-sm space-y-2">
            <p className="text-sm text-[var(--color-text-muted)] text-center font-medium">{currentFrames.length} frames</p>
            <ControlSlider label="Animation Speed (ms/frame)" value={config.speed} min={16} max={2000} step={1} onChange={v => setConfig(c => ({...c, speed: v}))} helpText="Lower values are faster. Frame duration can be up to 2 seconds."/>
            <button onClick={() => setConfig({ ...DEFAULT_CONFIG, speed: assets.frameDuration || DEFAULT_CONFIG.speed })} className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">Reset to Defaults</button>
          </div>
        )}
        {isInterpolating && (
             <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40 backdrop-blur-sm">
                <LoaderIcon className="w-12 h-12 animate-spin text-[var(--color-accent)]" />
                <p className="mt-4 text-white font-semibold">{interpolationMessage}</p>
            </div>
        )}
      </div>
      
    <div className="w-full max-w-lg mb-4">
        <h3 className="text-lg font-semibold text-center text-[var(--color-text-muted)] mb-3">Post-Processing Effects</h3>
        <div className="px-2 mb-4">
            <label htmlFor="effectStrength" className="block text-sm font-medium text-[var(--color-text-muted)]">
                Effect Strength
            </label>
            <div className="flex items-center gap-3 mt-1">
                <input
                    id="effectStrength"
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={postProcessStrength}
                    onChange={e => onPostProcessStrengthChange(Number(e.target.value))}
                    className="w-full h-2 bg-[var(--color-surface-alt)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
                    aria-label="Effect strength"
                />
                <span className="w-16 text-center text-sm bg-[var(--color-button)] rounded-md py-1">
                    {postProcessStrength.toFixed(1)}
                </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">Controls creative intensity. Higher values produce stronger, more varied effects.</p>
        </div>
        <div className="flex gap-2 mb-3 px-2">
            <input
                type="text"
                value={magicEditPrompt}
                onChange={(e) => setMagicEditPrompt(e.target.value)}
                placeholder="e.g., make the hat blue"
                className="flex-grow bg-[var(--color-surface)] text-white border border-[var(--color-surface-alt)] rounded-lg px-3 py-2 text-sm focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
            />
            <button
                onClick={() => onPostProcess('magic-edit', magicEditPrompt)}
                disabled={!magicEditPrompt.trim()}
                className="bg-[var(--color-special)] text-white font-semibold py-2 px-3 text-sm rounded-lg hover:bg-[var(--color-special-hover)] transition-colors duration-200 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <WandIcon className="w-4 h-4 mr-2" />
                Magic Edit
            </button>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
            {styleImage && (
                <button
                    key="apply-style"
                    onClick={() => onPostProcess('apply-style')}
                    className="bg-[var(--color-special)] text-white font-semibold py-2 px-3 text-sm rounded-lg hover:bg-[var(--color-special-hover)] transition-colors duration-200 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                >
                    <WandIcon className="w-4 h-4 mr-2" />
                    Apply Style
                </button>
            )}
            {POST_PROCESS_EFFECTS.map(effect => (
                <button
                    key={effect.id}
                    onClick={() => effect.local ? handleLocalPostProcess(effect.id) : onPostProcess(effect.id)}
                    disabled={isInterpolating || (effect.id === 'interpolate' && !!interpolatedFrames)}
                    className="bg-[var(--color-overlay)] text-white font-semibold py-2 px-3 text-sm rounded-lg hover:bg-[var(--color-button-hover)] transition-colors duration-200 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {effect.label}
                </button>
            ))}
             <button
                key="detect-objects"
                onClick={onDetectObjects}
                className="bg-[var(--color-overlay)] text-white font-semibold py-2 px-3 text-sm rounded-lg hover:bg-[var(--color-button-hover)] transition-colors duration-200 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
            >
                Detect Objects
            </button>
             {interpolatedFrames && (
                 <button onClick={() => setInterpolatedFrames(null)} className="bg-[var(--color-danger)] text-white font-semibold py-2 px-3 text-sm rounded-lg hover:opacity-90 transition-opacity duration-200">Reset Motion</button>
             )}
        </div>
    </div>

    <div className={`grid ${isShareAvailable ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-2 w-full max-w-lg mb-4`}>
        <button onClick={onBack} className="bg-[var(--color-button)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--color-button-hover)] transition-colors duration-200 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]">Edit</button>
        <button onClick={onRegenerate} className="bg-[var(--color-danger)] text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity duration-200 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]">Regenerate</button>
        <AnimatedExportButton 
            onClick={handleExport} 
            disabled={isExporting} 
            isExporting={isExporting}
        />
        {isShareAvailable && (
            <button onClick={handleShare} disabled={isSharing} className="bg-[var(--color-info)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--color-info-hover)] transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]">
                {isSharing ? 'Sharing...' : 'Share'}
            </button>
        )}
    </div>
    </div>
  );
};

export default AnimationPlayer;