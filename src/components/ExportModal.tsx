/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { exportToGif, exportToMp4, exportToWebP, exportToPngSequence } from '../utils/exportUtils';

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

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const downloadFile = (dataUrl: string, filename: string) => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      let result;
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
          result = await exportToGif(frames, frameRate, width, height);
          downloadFile(result, 'animation.gif');
          break;
        case 'mp4':
          result = await exportToMp4(frames, frameRate, width, height);
          downloadFile(result, 'animation.mp4');
          break;
        case 'webp':
          result = await exportToWebP(frames, frameRate, width, height);
          downloadFile(result, 'animation.webp');
          break;
        case 'png':
          result = exportToPngSequence(frames);
          // Handle PNG sequence download (e.g., zip and download)
          console.log('PNG sequence export not yet fully implemented.');
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
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
            <button onClick={() => setFormat('mp4')} className={`px-4 py-2 rounded-md ${format === 'mp4' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-button)]'}`} disabled>MP4</button>
            <button onClick={() => setFormat('webp')} className={`px-4 py-2 rounded-md ${format === 'webp' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-button)]'}`} disabled>WebP</button>
            <button onClick={() => setFormat('png')} className={`px-4 py-2 rounded-md ${format === 'png' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-button)]'}`} disabled>PNG</button>
          </div>
        </div>
        {/* Quality Selection */}
        <div className="mb-6">
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
          <button onClick={handleExport} disabled={isExporting} className="bg-[var(--color-accent)] px-6 py-2 rounded-lg">
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
