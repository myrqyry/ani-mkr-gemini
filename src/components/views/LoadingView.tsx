import React from 'react';
import { AppState } from 'src/types/types';
import LoadingOverlay from 'src/components/LoadingOverlay';

interface LoadingViewProps {
  state: AppState;
}

const LoadingView: React.FC<LoadingViewProps> = ({ state }) => {
  const { loadingMessage } = state;

  return <LoadingOverlay message={loadingMessage} />;
};

export default LoadingView;