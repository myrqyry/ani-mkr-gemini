import React from 'react';
import { AppState } from 'src/types/types';
import AnimationPlayer from 'src/components/AnimationPlayer';

interface AnimationViewProps {
  state: AppState;
  handleCreateAnimation: (isRegeneration?: boolean) => Promise<void>;
  handleBack: () => void;
  handlePostProcess: () => Promise<void>;
  handleDetectObjects: () => Promise<void>;
  dispatch: React.Dispatch<any>;
}

const AnimationView: React.FC<AnimationViewProps> = ({
  state,
  handleCreateAnimation,
  handleBack,
  handlePostProcess,
  handleDetectObjects,
  dispatch,
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
      onExport={() => dispatch({ type: 'SET_IS_EXPORT_MODAL_OPEN', payload: true })}
      onPostProcess={handlePostProcess}
      onDetectObjects={handleDetectObjects}
      detectedObjects={detectedObjects}
      error={error}
      clearError={() => dispatch({ type: 'SET_ERROR', payload: null })}
      styleImage={imageState.style}
      postProcessStrength={postProcessStrength}
      onPostProcessStrengthChange={(payload) => dispatch({ type: 'SET_POST_PROCESS_STRENGTH', payload })}
    />
  ) : null;
};

export default AnimationView;