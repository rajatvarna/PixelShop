/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import PromptSuggestions from './PromptSuggestions';
import PromptHistoryDropdown from './PromptHistoryDropdown';
import { filterSuggestions } from '../data/suggestions';

interface FilterPanelProps {
  onApplyFilter: (prompt: string) => void;
  isLoading: boolean;
  activePrompt: string;
  onPromptChange: (prompt: string) => void;
  isMasking: boolean;
  onToggleMasking: () => void;
  brushSize: number;
  onBrushSizeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearMask: () => void;
  promptHistory: string[];
  onClearHistory: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ 
  onApplyFilter, 
  isLoading, 
  activePrompt, 
  onPromptChange,
  isMasking,
  onToggleMasking,
  brushSize,
  onBrushSizeChange,
  onClearMask,
  promptHistory,
  onClearHistory
}) => {
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);

  const presets = [
    { name: 'Synthwave', prompt: 'Apply a vibrant 80s synthwave aesthetic with neon magenta and cyan glows, and subtle scan lines.' },
    { name: 'Anime', prompt: 'Give the image a vibrant Japanese anime style, with bold outlines, cel-shading, and saturated colors.' },
    { name: 'Lomo', prompt: 'Apply a Lomography-style cross-processing film effect with high-contrast, oversaturated colors, and dark vignetting.' },
    { name: 'Glitch', prompt: 'Transform the image into a futuristic holographic projection with digital glitch effects and chromatic aberration.' },
  ];
  
  const handlePresetClick = (prompt: string) => {
    onPromptChange(prompt);
  };
  
  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPromptChange(e.target.value);
  };

  const handleApply = () => {
    if (activePrompt) {
      onApplyFilter(activePrompt);
    }
  };

  return (
    <div className="w-full bg-gray-100 border border-gray-300 rounded-lg p-4 flex flex-col gap-4 animate-fade-in">
        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700">{isMasking ? 'Filter a Specific Area' : 'Apply a Global Filter'}</h3>
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Apply to:</span>
                <button
                    onClick={onToggleMasking}
                    title={isMasking ? "Switch to editing the whole image" : "Switch to editing a specific area"}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                        isMasking
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-200 text-gray-700'
                    }`}
                >
                    {isMasking ? 'Masked Area' : 'Whole Image'}
                </button>
            </div>
        </div>

      {isMasking && (
         <div className="p-3 bg-blue-500/10 rounded-lg flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
            <p className="text-sm text-blue-800 font-medium flex-shrink-0">Draw on the image to select an area.</p>
            <div className="flex items-center gap-2">
                <label htmlFor="brush-size" className="text-sm font-medium text-gray-700 whitespace-nowrap">Brush Size:</label>
                <input id="brush-size" type="range" min="10" max="100" step="1" value={brushSize} onChange={onBrushSizeChange} className="w-24 cursor-pointer" />
            </div>
            <button onClick={onClearMask} className="text-sm text-blue-600 hover:underline font-semibold ml-auto flex-shrink-0">Clear Mask</button>
         </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {presets.map(preset => (
          <button
            key={preset.name}
            onClick={() => handlePresetClick(preset.prompt)}
            disabled={isLoading}
            className={`w-full text-center bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-gray-200 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed ${activePrompt === preset.prompt ? 'ring-2 ring-offset-2 ring-offset-white ring-blue-500' : ''}`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="relative w-full">
        <input
          type="text"
          value={activePrompt}
          onChange={handleCustomChange}
          onFocus={() => setIsHistoryVisible(true)}
          onBlur={() => setTimeout(() => setIsHistoryVisible(false), 200)} // Delay to allow click on dropdown
          placeholder="Or describe a custom filter (e.g., '80s synthwave glow')"
          className="flex-grow bg-white border border-gray-300 text-gray-800 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
          disabled={isLoading}
        />
        <PromptHistoryDropdown
          isVisible={isHistoryVisible}
          history={promptHistory}
          onSelect={(p) => {
              onPromptChange(p);
              setIsHistoryVisible(false);
          }}
          onClear={onClearHistory}
        />
      </div>
      
      <PromptSuggestions 
        suggestions={filterSuggestions} 
        onSelect={(prompt) => onPromptChange(prompt)}
        isLoading={isLoading}
      />

      {activePrompt && (
        <div className="animate-fade-in flex flex-col gap-4 pt-2">
          <button
            onClick={handleApply}
            title="Apply filter (Cmd/Ctrl + Enter)"
            className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
            disabled={isLoading || !activePrompt.trim()}
          >
            Apply Filter
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;