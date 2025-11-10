// src/components/common/ViewSkeleton.tsx
import React from 'react';

interface ViewSkeletonProps {
  type?: 'capture' | 'animation' | 'error' | 'loading';
}

const ViewSkeleton: React.FC<ViewSkeletonProps> = ({ type = 'loading' }) => {
  const getMessage = () => {
    switch (type) {
      case 'capture':
        return 'Loading camera interface...';
      case 'animation':
        return 'Loading animation player...';
      case 'error':
        return 'Loading error view...';
      default:
        return 'Loading...';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-gray-600 text-lg">{getMessage()}</p>
      </div>
    </div>
  );
};

export default ViewSkeleton;
