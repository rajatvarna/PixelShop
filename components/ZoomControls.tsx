/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { PlusIcon, MinusIcon } from './icons';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ zoom, onZoomIn, onZoomOut, onReset }) => {
  return (
    <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-1.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
      <button
        onClick={onZoomOut}
        className="p-2 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <MinusIcon className="w-5 h-5" />
      </button>
      <button 
        onClick={onReset} 
        className="px-3 py-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200 rounded-full w-16 text-center tabular-nums hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Reset Zoom (Alt + V)"
        aria-label="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        className="p-2 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Zoom In"
        aria-label="Zoom In"
      >
        <PlusIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ZoomControls;