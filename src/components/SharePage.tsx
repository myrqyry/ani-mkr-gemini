import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AnimationPlayer from './AnimationPlayer';
import { AnimationAssets } from '../services/geminiService';
import ExportModal from './ExportModal';

const SharePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [animationAssets, setAnimationAssets] = useState<AnimationAssets | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    const fetchAnimation = async () => {
      try {
        const response = await fetch(`/api/share/${id}`);
        if (response.ok) {
          const data = await response.json();
          setAnimationAssets(data);
        } else {
          setError('Animation not found');
        }
      } catch (err) {
        setError('Failed to fetch animation');
      }
    };

    fetchAnimation();
  }, [id]);

  const handleRemix = () => {
    if (animationAssets) {
      navigate('/', { state: { prompt: animationAssets.prompt } });
    }
  };

  if (error) {
    return <div>{error}</div>;
  }

  if (!animationAssets) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <AnimationPlayer
        assets={animationAssets}
        frameCount={animationAssets.frames.length}
        onRegenerate={() => {}}
        onBack={() => navigate('/')}
        onExport={() => setIsExportModalOpen(true)}
        onPostProcess={() => {}}
        onDetectObjects={() => {}}
        detectedObjects={null}
        error={null}
        clearError={() => {}}
        styleImage={null}
        postProcessStrength={0}
        onPostProcessStrengthChange={() => {}}
      />
      <button
        onClick={handleRemix}
        className="bg-[var(--color-accent)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors duration-200 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
      >
        Remix
      </button>
      {isExportModalOpen && animationAssets && (
        <ExportModal
          frames={animationAssets.frames}
          width={512}
          height={512}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </>
  );
};

export default SharePage;
