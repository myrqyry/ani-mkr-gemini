import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { AppState, ImageState } from '@/src/types/types';
import { analyzeAnimation } from '@/src/services/geminiService';
import { XCircleIcon } from '@/components/icons';

export interface FileUploadManagerHandles {
  handleUploadClick: () => void;
  handlePasteUrl: (type: 'main' | 'style' | 'motion') => void;
}

interface FileUploadManagerProps {
  imageState: ImageState;
  setImageState: (state: React.SetStateAction<ImageState>) => void;
  setStoryPrompt: (prompt: string) => void;
  setAppState: (state: AppState) => void;
  setLoadingMessage: (message: string) => void;
  setError: (error: string | null) => void;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_MOTION_TYPES = ['image/gif', 'image/webp', 'image/avif'];

const FileUploadManager = forwardRef<FileUploadManagerHandles, FileUploadManagerProps>(({
  imageState,
  setImageState,
  setStoryPrompt,
  setAppState,
  setLoadingMessage,
  setError,
}, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleFileInputRef = useRef<HTMLInputElement>(null);
  const motionFileInputRef = useRef<HTMLInputElement>(null);
  const [showStyleUpload, setShowStyleUpload] = useState(false);

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleUploadMotionClick = () => motionFileInputRef.current?.click();

  const handleMotionAnalysis = async (motionFile: File) => {
    setAppState(AppState.Processing);
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
      setAppState(AppState.Capturing);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onloadend = () => setImageState(prev => ({...prev, original: reader.result as string}));
      reader.onerror = () => {
        console.error('Failed to read file');
        setError('Failed to read the selected image file.');
        setAppState(AppState.Error);
      };
      reader.readAsDataURL(file);
    } else {
      setError('Please upload a valid image file (JPEG, PNG, WEBP, AVIF).');
    }
  };

  const handleStyleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageState(prev => ({
        ...prev,
        style: e.target?.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleMotionFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && ALLOWED_MOTION_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onloadend = () => setImageState(prev => ({...prev, motion: reader.result as string}));
      reader.onerror = () => {
        console.error('Failed to read file for motion preview');
        setError('Failed to read the selected motion file.');
      };
      reader.readAsDataURL(file);
      handleMotionAnalysis(file);
    } else {
      setError('Please upload a GIF, WEBP, or AVIF file for motion analysis.');
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

    setAppState(AppState.Processing);
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
            setAppState(AppState.Capturing);
            return;
          }
          setImageState(prev => ({...prev, original: dataUrl}));
        } else if (type === 'style') {
          if (!ALLOWED_IMAGE_TYPES.includes(blob.type)) {
            setError('Please provide a URL for an image file (JPEG, PNG, WEBP, AVIF).');
            setAppState(AppState.Capturing);
            return;
          }
          setImageState(prev => ({...prev, style: dataUrl}));
        } else if (type === 'motion') {
          if (!ALLOWED_MOTION_TYPES.includes(blob.type)) {
            setError('Please provide a URL for a GIF, WEBP, or AVIF file for motion analysis.');
            setAppState(AppState.Capturing);
            return;
          }
          setImageState(prev => ({...prev, motion: dataUrl}));
          const extension = blob.type.split('/')[1] ?? 'gif';
          const file = new File([blob], `motion.${extension}`, { type: blob.type });
          handleMotionAnalysis(file);
          return;
        }
        setAppState(AppState.Capturing);
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
      setAppState(AppState.Capturing);
    }
  };

  const handleClearMotionImage = () => {
    setImageState(prev => ({...prev, motion: null}));
    if (motionFileInputRef.current) motionFileInputRef.current.value = '';
  };

  useImperativeHandle(ref, () => ({
    handleUploadClick,
    handlePasteUrl,
  }));

  return (
    <>
      <div className="w-full mb-4 flex flex-col sm:flex-row gap-2">
        <div className="w-full sm:w-1/2">
            <div className="style-transfer-section">
                <button
                onClick={() => setShowStyleUpload(!showStyleUpload)}
                className="text-sm text-blue-400 hover:text-blue-300"
                >
                + Add Style Reference
                </button>

                {showStyleUpload && (
                <div className="mt-2 p-3 border border-gray-600 rounded">
                    <label className="block text-sm mb-2">Style Reference Image</label>
                    <input
                    type="file"
                    ref={styleFileInputRef}
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleStyleImageUpload(e.target.files[0])}
                    className="w-full"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                    Upload an artwork or photo whose style you want to apply to your animation
                    </p>
                </div>
                )}
            </div>
        </div>
        <div className="w-full sm:w-1/2">
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
        ref={motionFileInputRef}
        onChange={handleMotionFileChange}
        className="hidden"
        accept="image/gif,image/webp,image/avif"
      />
    </>
  );
});

export default FileUploadManager;