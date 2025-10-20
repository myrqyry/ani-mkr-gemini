import React from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'mp4' | 'gif' | 'webm') => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Export Animation</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => onExport('mp4')}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Export as MP4
          </button>
          <button
            onClick={() => onExport('gif')}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Export as GIF
          </button>
          <button
            onClick={() => onExport('webm')}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Export as WebM
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-4 bg-gray-600 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ExportModal;
