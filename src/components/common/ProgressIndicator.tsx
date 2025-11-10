// src/components/common/ProgressIndicator.tsx
import React from 'react';

interface ProgressIndicatorProps {
  stage: string;
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // in seconds
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
   stage,
   progress,
   estimatedTimeRemaining
 }) => {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{stage}</span>
          <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
             className="bg-gradient-to-r from-purple-600 to-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {estimatedTimeRemaining !== undefined && (
        <p className="text-center text-sm text-gray-600">
          Estimated time remaining: {formatTime(estimatedTimeRemaining)}
        </p>
      )}
    </div>
  );
};

export default ProgressIndicator;
