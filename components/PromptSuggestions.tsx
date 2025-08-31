/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface PromptSuggestionsProps {
  suggestions: string[];
  onSelect: (prompt: string) => void;
  isLoading: boolean;
}

const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({ suggestions, onSelect, isLoading }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <p className="text-sm font-medium text-gray-600 mr-2">Try:</p>
      {suggestions.map((prompt, index) => (
        <button
          key={index}
          onClick={() => onSelect(prompt)}
          disabled={isLoading}
          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-full text-sm font-semibold transition-all duration-200 hover:bg-gray-300 hover:text-gray-900 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
};

export default PromptSuggestions;
