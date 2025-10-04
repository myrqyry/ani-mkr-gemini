/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import BananaLoader from './BananaLoader';

interface LoadingOverlayProps {
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-[var(--color-background)]/90 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
      <BananaLoader className="w-72 h-72" />
      {message && (
        <p className="text-[var(--color-text-base)] text-xl font-semibold mt-4 text-center animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingOverlay;