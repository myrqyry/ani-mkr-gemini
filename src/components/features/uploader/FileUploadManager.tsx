import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { AppStatus, ImageState } from '../../../types/types';
import { analyzeAnimation } from '../../../services/geminiService';
import { XCircleIcon } from '../../icons';
import {
  validateImageFile,
  validateMotionFile,
  validateImageDimensions,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_MOTION_TYPES,
} from '../../../utils/fileValidation';

export interface FileUploadManagerHandles {
  handleUploadClick: () => void;
  handlePasteUrl: (type: 'main' | 'style' | 'motion') => void;
  handleDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleMainDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

interface FileUploadManagerProps {
  imageState: ImageState;
  setImageState: React.Dispatch<React.SetStateAction<ImageState>>;
  styleIntensity: number;
  setStyleIntensity: (intensity: number) => void;
  setStoryPrompt: (prompt: string) => void;
  setAppState: (state: AppStatus) => void;
  setLoadingMessage: (message: string) => void;
  setError: (error: string | null) => void;
}

const FileUploadManager: React.FC<FileUploadManagerProps> = forwardRef<FileUploadManagerHandles, FileUploadManagerProps>(({
  imageState,
  setImageState,
  styleIntensity,
  setStyleIntensity,
  setStoryPrompt,
  setAppState,
  setLoadingMessage,
  setError,
}, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleFileInputRef = useRef<HTMLInputElement>(null);
  const motionFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMainDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleFileChange({ target: { files: [file] } } as any);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, type: 'style' | 'motion') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (type === 'style') {
        handleStyleFileChange({ target: { files: [file] } } as any);
      } else if (type === 'motion') {
        handleMotionFileChange({ target: { files: [file] } } as any);
      }
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleUploadStyleClick = () => styleFileInputRef.current?.click();
  const handleUploadMotionClick = () => motionFileInputRef.current?.click();

  const handleMotionAnalysis = async (motionFile: File) => {
    setAppState(AppStatus.Processing);
    setLoadingMessage('Analyzing animation...');
    setError(null);

    try {
      const reader = new FileReader();
      await new Promise<void>((resolve, reject) => {
        reader.onloadend = () => resolve();
        reader.onerror = () => {
          console.error('Failed to read file');
          reject(new Error(`Failed to read the selected ${motionFile.type} file.`));
        };
        reader.readAsDataURL(motionFile);
      });

      const dataUrl = reader.result as string;
      const newPrompt = await analyzeAnimation(dataUrl, (message: string) => setLoadingMessage(message));
      setStoryPrompt(newPrompt);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during analysis.';
      console.error(err);
      setError(errorMessage);
    } finally {
      setAppState(AppStatus.Capturing);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      // Validate file
      const validationResult = await validateImageFile(file);
      if (!validationResult.valid) {
        setError(validationResult.error || 'Invalid file');
        event.target.value = ''; // Reset input
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        
        // Validate dimensions
        const dimensionResult = await validateImageDimensions(dataUrl);
        if (!dimensionResult.valid) {
          setError(dimensionResult.error || 'Invalid image dimensions');
          event.target.value = ''; // Reset input
          return;
        }
        
        setImageState(prev => ({...prev, original: dataUrl}));
        setError(null);
      };
      reader.onerror = () => {
        console.error('Failed to read file');
        setError('Failed to read the selected image file.');
        event.target.value = ''; // Reset input
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err instanceof Error ? err.message : 'Failed to process the selected file.');
      event.target.value = ''; // Reset input
    }
  };

  const handleStyleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      // Validate file
      const validationResult = await validateImageFile(file);
      if (!validationResult.valid) {
        setError(validationResult.error || 'Invalid file');
        event.target.value = ''; // Reset input
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        
        // Validate dimensions
        const dimensionResult = await validateImageDimensions(dataUrl);
        if (!dimensionResult.valid) {
          setError(dimensionResult.error || 'Invalid image dimensions');
          event.target.value = ''; // Reset input
          return;
        }
        
        setImageState(prev => ({...prev, style: dataUrl}));
        setError(null);
      };
      reader.onerror = () => {
        console.error('Failed to read file');
        setError('Failed to read the selected style image file.');
        event.target.value = ''; // Reset input
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error processing style file:', err);
      setError(err instanceof Error ? err.message : 'Failed to process the selected style file.');
      event.target.value = ''; // Reset input
    }
  };

  const handleMotionFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      // Validate file
      const validationResult = await validateMotionFile(file);
      if (!validationResult.valid) {
        setError(validationResult.error || 'Invalid file');
        event.target.value = ''; // Reset input
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImageState(prev => ({...prev, motion: reader.result as string}));
        setError(null);
      };
      reader.onerror = () => {
        console.error('Failed to read file for motion preview');
        setError('Failed to read the selected motion file.');
        event.target.value = ''; // Reset input
        return;
      };
      reader.readAsDataURL(file);
      handleMotionAnalysis(file);
    } catch (err) {
      console.error('Error processing motion file:', err);
      setError(err instanceof Error ? err.message : 'Failed to process the selected motion file.');
      event.target.value = ''; // Reset input
    }
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handlePasteUrl = async (type: 'main' | 'style' | 'motion') => {
    const url = window.prompt(`Please paste the URL for the ${type === 'main' ? 'subject' : type} image:`);
    if (!url || !isValidUrl(url)) {
      setError('Please enter a valid URL.');
      return;
    }

    setAppState(AppStatus.Processing);
    setLoadingMessage('Fetching image from URL...');
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (type === 'main') {
          if (!ALLOWED_IMAGE_TYPES.includes(blob.type)) {
            setError('Please provide a URL for a static image (JPEG, PNG, WEBP, AVIF).');
            setAppState(AppStatus.Capturing);
            return;
          }
          setImageState(prev => ({...prev, original: dataUrl}));
        } else if (type === 'style') {
          if (!ALLOWED_IMAGE_TYPES.includes(blob.type)) {
            setError('Please provide a URL for an image file (JPEG, PNG, WEBP, AVIF).');
            setAppState(AppStatus.Capturing);
            return;
          }
          setImageState(prev => ({...prev, style: dataUrl}));
        } else if (type === 'motion') {
          if (!ALLOWED_MOTION_TYPES.includes(blob.type)) {
            setError('Please provide a URL for a GIF, WEBP, or AVIF file for motion analysis.');
            setAppState(AppStatus.Capturing);
            return;
          }
          setImageState(prev => ({...prev, motion: dataUrl}));
          const extension = blob.type.split('/')[1] ?? 'gif';
          const file = new File([blob], `motion.${extension}`, { type: blob.type });
          handleMotionAnalysis(file);
          return;
        }
        setAppState(AppStatus.Capturing);
      };

      reader.onerror = () => {
        throw new Error('Failed to read image data from the fetched URL.');
      };

      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Error fetching URL:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      const corsErrorHint = errorMessage.toLowerCase().includes('failed to fetch') ? "This might be due to a network error or the server's CORS policy preventing direct access. " : '';
      setError(`Could not fetch image from URL. ${corsErrorHint}Please try a different URL. Error: ${errorMessage}`);
      setAppState(AppStatus.Capturing);
    }
  };

  const handleClearStyleImage = () => {
    setImageState(prev => ({...prev, style: null}));
    if (styleFileInputRef.current) styleFileInputRef.current.value = '';
  };

  const handleClearMotionImage = () => {
    setImageState(prev => ({...prev, motion: null}));
    if (motionFileInputRef.current) motionFileInputRef.current.value = '';
  };

  useImperativeHandle(ref, () => ({
    handleUploadClick,
    handlePasteUrl,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleMainDrop,
  }));

  return (
    <>
      <div
        className={`w-full mb-4 flex flex-col sm:flex-row gap-2 ${isDragging ? 'border-blue-500' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
      >
        <div
          className="w-full sm:w-1/2"
          onDrop={(e) => handleDrop(e, 'style')}
        >
          <div className="relative w-full h-24 bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-surface-alt)] rounded-lg flex items-center justify-center">
            {imageState.style ? (
              <>
                <img src={imageState.style} alt="Style Preview" className="h-full w-full object-contain p-1" />
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
          {imageState.style && (
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
        <div
          className="w-full sm:w-1/2"
          onDrop={(e) => handleDrop(e, 'motion')}
        >
          <div className="relative w-full h-24 bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-surface-alt)] rounded-lg flex items-center justify-center">
            {imageState.motion ? (
              <>
                <img src={imageState.motion} alt="Motion Preview" className="h-full w-full object-contain p-1" />
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
    </>
  );
});

export default FileUploadManager;