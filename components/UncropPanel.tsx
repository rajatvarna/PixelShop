/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

type AspectRatio = 'Free' | '1:1' | '16:9' | '4:3' | '3:2';

interface UncropPanelProps {
  onApplyUncrop: (aspectRatio: number) => void;
  isLoading: boolean;
  originalAspect: number;
}

const UncropPanel: React.FC<UncropPanelProps> = ({ onApplyUncrop, isLoading, originalAspect }) => {
  const [activeAspect, setActiveAspect] = useState<AspectRatio>('16:9');
  
  const handleApply = () => {
    const aspectValue = aspectRatios.find(a => a.name === activeAspect)?.value;
    if (aspectValue) {
      onApplyUncrop(aspectValue);
    }
  };

  const aspectRatios: { name: AspectRatio, value: number }[] = [
    { name: '16:9', value: 16 / 9 },
    { name: '4:3', value: 4 / 3 },
    { name: '1:1', value: 1 },
    { name: '3:2', value: 3 / 2 },
  ];

  const isCurrentAspect = (aspectValue: number) => {
    return Math.abs(originalAspect - aspectValue) < 0.01;
  };

  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center gap-4 animate-fade-in">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Generative Uncrop</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">Expand the image canvas using AI to fill the new areas.</p>
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Target Aspect Ratio:</span>
        {aspectRatios.map(({ name, value }) => (
          <button
            key={name}
            onClick={() => setActiveAspect(name)}
            disabled={isLoading || isCurrentAspect(value)}
            className={`px-4 py-2 rounded-md text-base font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              activeAspect === name 
              ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/20' 
              : 'bg-gray-200 dark:bg-gray-700 border border-transparent hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <button
        onClick={handleApply}
        disabled={isLoading}
        title="Apply uncrop"
        className="w-full max-w-xs mt-2 bg-gradient-to-br from-purple-600 to-purple-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-purple-800 disabled:to-purple-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        Expand Image
      </button>
    </div>
  );
};

export default UncropPanel;
