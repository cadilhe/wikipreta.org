/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const LoadingBar: React.FC<{ width: string }> = ({ width }) => (
  <div className={`h-4 bg-gray-300 dark:bg-gray-700 rounded mb-3 ${width}`}></div>
);

const LoadingSkeleton: React.FC = () => {
  return (
    <div aria-label="Carregando conteúdo..." role="progressbar" className="animate-pulse">
      <LoadingBar width="w-full" />
      <LoadingBar width="w-5/6" />
      <LoadingBar width="w-full" />
      <LoadingBar width="w-3/4" />
      <LoadingBar width="w-2/3" />
    </div>
  );
};

export default LoadingSkeleton;