import React from 'react';
import { AppState } from 'src/types/types';

interface ErrorViewProps {
  state: AppState;
  handleBack: () => void;
}

const ErrorView: React.FC<ErrorViewProps> = ({ state, handleBack }) => {
  const { error } = state;

  return (
    <div className="text-center bg-[var(--color-danger-surface)] p-8 rounded-lg max-w-md w-full">
      <p className="text-[var(--color-text-base)] mb-6 font-medium text-lg">{error}</p>
      <button
        onClick={handleBack}
        className="bg-[var(--color-accent)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors transition-transform duration-300 transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
      >
        Try Again
      </button>
    </div>
  );
};

export default ErrorView;