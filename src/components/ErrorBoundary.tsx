import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="text-center bg-[var(--color-danger-surface)] p-8 rounded-lg max-w-md w-full">
          <p className="text-[var(--color-text-base)] mb-6 font-medium text-lg">
            Something went wrong. Please try again later.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-[var(--color-accent)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;