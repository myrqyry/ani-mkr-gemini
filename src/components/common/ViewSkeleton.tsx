import React from 'react';

const ViewSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-md mx-auto animate-pulse">
      <div className="h-8 bg-gray-300 rounded-md mb-4"></div>
      <div className="h-64 bg-gray-300 rounded-lg mb-4"></div>
      <div className="h-10 bg-gray-300 rounded-md"></div>
    </div>
  );
};

export default ViewSkeleton;
