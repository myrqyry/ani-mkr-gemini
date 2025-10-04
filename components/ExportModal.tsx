import React, { useState } from 'react';
import { AnimationAssets } from '@/src/services/geminiService';
import { ExportOptions, exportAnimation } from '@/src/utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: AnimationAssets | null;
  frameCount: number;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, assets, frameCount }) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'gif',
    quality: 'web',
    size: 'medium',
    fps: 8,
    loop: true
  });

  if (!isOpen || !assets) {
    return null;
  }

  const handleExport = async () => {
    try {
      const blob = await exportAnimation(assets, exportOptions, frameCount);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `animation.${exportOptions.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Export Animation</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2">Format</label>
            <select
              value={exportOptions.format}
              onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as ExportOptions['format'] }))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
            >
              <option value="gif">GIF (Universal)</option>
              <option value="mp4">MP4 (High Quality)</option>
              <option value="webm">WebM (Web Optimized)</option>
              <option value="png-sequence">PNG Sequence</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2">Quality</label>
            <div className="flex gap-2">
              {(['web', 'print', 'social'] as const).map(quality => (
                <button
                  key={quality}
                  onClick={() => setExportOptions(prev => ({ ...prev, quality }))}
                  className={`px-3 py-1 text-sm rounded ${
                    exportOptions.quality === quality
                      ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {quality.charAt(0).toUpperCase() + quality.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded"
            >
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;