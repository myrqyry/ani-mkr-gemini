// src/components/common/LazyComponentBoundary.tsx
import React, { Suspense, ComponentType } from 'react';
import ErrorBoundary from '../ErrorBoundary';
import ViewSkeleton from './ViewSkeleton';

interface LazyComponentBoundaryProps {
  fallback?: React.ReactNode;
  skeletonType?: 'capture' | 'animation' | 'error' | 'loading';
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  children: React.ReactNode;
}

const LazyComponentBoundary: React.FC<LazyComponentBoundaryProps> = ({
   fallback,
   skeletonType,
  onError,
  children
 }) => {
  return (
    <ErrorBoundary onError={onError}>
      <Suspense fallback={fallback || <ViewSkeleton type={skeletonType} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default LazyComponentBoundary;
