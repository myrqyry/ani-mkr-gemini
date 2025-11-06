/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import AppRouter from './components/router/AppRouter';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * The main App component.
 * @returns {React.ReactElement} The rendered component.
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppLayout>
        <AppRouter />
      </AppLayout>
    </ErrorBoundary>
  );
};

export default App;
