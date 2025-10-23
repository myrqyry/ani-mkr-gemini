import React from 'react';
import { AnimationAssets } from '../services/geminiService';

interface ShareButtonProps {
  isSharing: boolean;
  onClick: (animationUrl: string) => void;
  animationAssets: AnimationAssets;
}

const ShareButton: React.FC<ShareButtonProps> = ({ isSharing, onClick, animationAssets }) => {
  const handleShare = async () => {
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ animationData: animationAssets }),
      });
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const { id } = await response.json();
      const animationUrl = `${window.location.origin}/share/${id}`;
      onClick(animationUrl);
    } catch (error) {
      console.error('Error sharing animation:', error);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className="bg-[var(--color-info)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--color-info-hover)] transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
    >
      {isSharing ? 'Sharing...' : 'Share'}
    </button>
  );
};

export default ShareButton;
