/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';

/**
 * A loader component.
 * @param {object} props - The props for the component.
 * @param {string} [props.className] - The class name for the component.
 * @returns {React.ReactElement} The rendered component.
 */
const Loader: React.FC<{ className?: string }> = ({ className }) => {
  const loaderSrc = 'https://www.gstatic.com/aistudio/starter-apps/loading.gif';

  return (
    <img src={loaderSrc} className={className} alt="Loading animation..." />
  );
};

export default Loader;
