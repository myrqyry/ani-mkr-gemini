import React from 'react';
import { AppState } from 'src/types/types';
import AnimationPlayer from 'src/components/AnimationPlayer';
import AsyncBoundary from 'src/components/common/AsyncBoundary';
import { useAnimationState } from 'src/contexts/AppStateContext';

interface AnimationViewProps {
  state: AppState;
  actions: UIActions & AnimationActions & ImageActions;
  handleCreateAnimation: (isRegeneration?: boolean) => Promise<void>;
  handleBack: () => void;
  handlePostProcess: () => Promise<void>;
  handleDetectObjects: () => Promise<void>;
}

const AnimationErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
    <div>
        <h2>Animation Failed</h2>
        <p>{error.message}</p>
        <button onClick={retry}>Try Again</button>
    </div>
);

const AnimationView: React.FC<AnimationViewProps> = ({
  state,
  actions,
  handleCreateAnimation,
  handleBack,
  handlePostProcess,
  handleDetectObjects,
}) => {
  const {
    animationAssets,
    frameCount,
    detectedObjects,
    error,
    imageState,
    postProcessStrength,
  } = state;

  const { isProcessing } = useAnimationState();

  return (
    <AsyncBoundary
        isLoading={isProcessing}
        fallback={AnimationErrorFallback}
    >
        {animationAssets ? (
            <AnimationPlayer
                assets={animationAssets}
                frameCount={frameCount}
                onRegenerate={() => handleCreateAnimation(true)}
                onBack={handleBack}
                onExport={() => actions.setIsExportModalOpen(true)}
                onPostProcess={handlePostProcess}
                onDetectObjects={handleDetectObjects}
                detectedObjects={detectedObjects}
                error={error}
                clearError={() => actions.setError(null)}
                styleImage={imageState.style}
                postProcessStrength={postProcessStrength}
                onPostProcessStrengthChange={(payload) => actions.setPostProcessStrength(payload)}
            />
        ) : null}
    </AsyncBoundary>
  );
};

export default AnimationView;
