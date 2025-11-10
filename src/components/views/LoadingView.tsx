import React from 'react';
import { AppState } from 'src/types/types';
import ProgressIndicator from '../common/ProgressIndicator';

interface LoadingViewProps {
  state: AppState;
}

const LoadingView: React.FC<LoadingViewProps> = ({ state }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <ProgressIndicator
        stage={state.loadingMessage || 'Processing...'}
        progress={state.loadingProgress || 0}
        estimatedTimeRemaining={state.estimatedTimeRemaining}
      />
    </div>
  );
};

export default LoadingView;
