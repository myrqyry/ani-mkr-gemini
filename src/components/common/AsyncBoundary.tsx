import React, { Suspense } from 'react';
import ErrorBoundary from '../ErrorBoundary'; // Assuming ErrorBoundary is in the parent directory

interface AsyncBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  loadingFallback?: React.ComponentType;
  isLoading?: boolean;
}

const DefaultLoadingFallback = () => <div>Loading...</div>;
const DefaultErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div>
    <h2>Something went wrong:</h2>
    <p>{error.message}</p>
    <button onClick={retry}>Try again</button>
  </div>
);

const AsyncBoundary: React.FC<AsyncBoundaryProps> = ({
  children,
  fallback: Fallback = DefaultErrorFallback,
  loadingFallback: LoadingFallback = DefaultLoadingFallback,
  isLoading = false,
}) => {
  if (isLoading) {
    return <LoadingFallback />;
  }

  return (
    <ErrorBoundary fallback={Fallback}>
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default AsyncBoundary;
