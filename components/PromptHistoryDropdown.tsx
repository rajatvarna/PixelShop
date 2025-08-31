/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface PromptHistoryDropdownProps {
  history: string[];
  onSelect: (prompt: string) => void;
  onClear: () => void;
  isVisible: boolean;
}

const PromptHistoryDropdown: React.FC<PromptHistoryDropdownProps> = ({ history, onSelect, onClear, isVisible }) => {
  if (!isVisible || history.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto animate-fade-in">
      <ul role="listbox" aria-label="Prompt history">
        {history.map((prompt, index) => (
          <li
            key={index}
            onClick={() => onSelect(prompt)}
            className="px-4 py-2 text-gray-700 hover:bg-blue-50 cursor-pointer text-sm truncate"
            role="option"
            aria-selected="false"
            title={prompt}
          >
            {prompt}
          </li>
        ))}
      </ul>
      {history.length > 0 && (
        <div className="border-t border-gray-200 p-2">
            <button
            onClick={onClear}
            className="w-full text-center text-sm text-red-500 hover:bg-red-50 rounded-md p-1.5 font-semibold transition-colors"
            >
            Clear History
            </button>
        </div>
      )}
    </div>
  );
};

export default PromptHistoryDropdown;