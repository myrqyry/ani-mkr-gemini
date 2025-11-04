import React from 'react';
import { AppState } from 'src/types/types';
import AnimationPlayer from 'src/components/AnimationPlayer';

interface AnimationViewProps {
  state: AppState;
  actions: UIActions & AnimationActions & ImageActions;
  handleCreateAnimation: (isRegeneration?: boolean) => Promise<void>;
  handleBack: () => void;
  handlePostProcess: () => Promise<void>;
  handleDetectObjects: () => Promise<void>;
}

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

  return animationAssets ? (
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
  ) : null;
};

export default AnimationView;