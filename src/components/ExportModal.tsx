/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { exportToGif, exportToMp4, exportToWebP, exportToPngSequence } from '../utils/exportUtils';
import AnimatedExportButton from './AnimatedExportButton';

// Add a declaration for the JSZip library loaded from the CDN.
declare var JSZip: any;

interface ExportModalProps {
  frames: string[];
  width: number;
  height: number;
  onClose: () => void;
}

type ExportFormat = 'gif' | 'mp4' | 'webp' | 'png';
type ExportQuality = 'draft' | 'standard' | 'high' | 'ultra';

const ExportModal: React.FC<ExportModalProps> = ({ frames, width, height, onClose }) => {
  const [format, setFormat] = useState<ExportFormat>('gif');
  const [quality, setQuality] = useState<ExportQuality>('standard');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState('');

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

  const handlePngSequenceDownload = async (sequence: string[]) => {
      if (typeof JSZip === 'undefined') {
          setError('The JSZip library is not loaded. Please check your internet connection and try again.');
          return;
      }
      setExportProgress('Zipping PNG sequence...');
      const zip = new JSZip();
      sequence.forEach((frame, index) => {
          const blob = dataURLtoBlob(frame);
          zip.file(`frame_${index.toString().padStart(4, '0')}.png`, blob);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = 'animation_frames.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      setExportProgress('PNG sequence download complete!');
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setExportProgress('Starting export...');
    try {
      const downloadFile = (dataUrl: string, filename: string) => {
        setExportProgress(`Downloading ${filename}...`);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setExportProgress('Download complete!');
      };

      // Define quality settings
      const qualitySettings = {
        draft: { frameRate: 15 },
        standard: { frameRate: 24 },
        high: { frameRate: 30 },
        ultra: { frameRate: 60 },
      };
      const { frameRate } = qualitySettings[quality];

      switch (format) {
        case 'gif':
          setExportProgress('Creating GIF...');
          const gifResult = await exportToGif(frames, frameRate, width, height);
          downloadFile(gifResult, 'animation.gif');
          break;
        case 'mp4':
          setExportProgress('Creating MP4...');
          const mp4Result = await exportToMp4(frames, frameRate, width, height);
          downloadFile(mp4Result, 'animation.mp4');
          break;
        case 'webp':
          setExportProgress('Creating WebP...');
          const webpResult = await exportToWebP(frames, frameRate, width, height);
          downloadFile(webpResult, 'animation.webp');
          break;
        case 'png':
          setExportProgress('Exporting PNG sequence...');
          const pngSequence = exportToPngSequence(frames);
          await handlePngSequenceDownload(pngSequence);
          break;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setExportProgress(`Error: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-surface)] p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Export Animation</h2>
        {/* Format Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Format</label>
          <div className="flex gap-2">
            <button onClick={() => setFormat('gif')} className={`px-4 py-2 rounded-md ${format === 'gif' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-button)]'}`}>GIF</button>
            <button onClick={() => setFormat('mp4')} className={`px-4 py-2 rounded-md ${format === 'mp4' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-button)]'}`}>MP4</button>
            <button onClick={() => setFormat('webp')} className={`px-4 py-2 rounded-md ${format === 'webp' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-button)]'}`} disabled>WebP</button>
            <button onClick={() => setFormat('png')} className={`px-4 py-2 rounded-md ${format === 'png' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-button)]'}`}>PNG</button>
          </div>
        </div>
        {/* Quality Selection */}
        <div className="mb-4">
          <label htmlFor="quality" className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Quality</label>
          <select
            id="quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value as ExportQuality)}
            className="w-full bg-[var(--color-overlay)] text-[var(--color-text-base)] border border-[var(--color-surface-alt)] rounded-lg px-4 py-3 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
          >
            <option value="draft">Draft</option>
            <option value="standard">Standard</option>
            <option value="high">High</option>
            <option value="ultra">Ultra</option>
          </select>
        </div>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="bg-[var(--color-button)] px-6 py-2 rounded-lg">Cancel</button>
          <AnimatedExportButton
            onClick={handleExport}
            disabled={isExporting}
            isExporting={isExporting}
          />
        </div>
        {exportProgress &&
            <div className="mt-4 p-3 bg-[var(--color-overlay)] rounded-lg">
                <p className="text-sm font-mono text-center text-[var(--color-text-muted)] whitespace-pre-wrap">{exportProgress}</p>
            </div>
        }
      </div>
    </div>
  );
};

export default ExportModal;
