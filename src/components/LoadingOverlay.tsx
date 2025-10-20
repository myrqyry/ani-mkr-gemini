/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import Loader from './Loader';

/**
 * Props for the LoadingOverlay component.
 * @interface LoadingOverlayProps
 * @property {string} message - The message to display.
 */
interface LoadingOverlayProps {
  message: string;
}

/**
 * A loading overlay component.
 * @param {LoadingOverlayProps} props - The props for the component.
 * @returns {React.ReactElement} The rendered component.
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-[var(--color-background)]/90 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
      <Loader className="w-72 h-72" />
      {message && (
        <p className="text-[var(--color-text-base)] text-xl font-semibold mt-4 text-center animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingOverlay;
