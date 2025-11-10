import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../index.css';
import { AppStateProvider } from '@contexts/AppStateContext';
import { ToastProvider } from '@contexts/ToastContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppStateProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AppStateProvider>
  </React.StrictMode>,
)
