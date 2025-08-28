/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Shortcut: React.FC<{ keys: string[]; description: string }> = ({ keys, description }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
    <p className="text-gray-700 dark:text-gray-300">{description}</p>
    <div className="flex items-center gap-1">
      {keys.map(key => (
        <kbd key={key} className="px-2 py-1 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md">
          {key}
        </kbd>
      ))}
    </div>
  </div>
);

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 id="shortcuts-title" className="text-xl font-bold text-gray-800 dark:text-gray-100">
                Keyboard Shortcuts
            </h2>
            <button 
                onClick={onClose}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close shortcuts modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <div className="p-6">
            <div className="mb-6">
                <h3 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">Editing</h3>
                <Shortcut keys={['Cmd/Ctrl', 'Z']} description="Undo" />
                <Shortcut keys={['Cmd/Ctrl', 'Shift', 'Z']} description="Redo (macOS)" />
                <Shortcut keys={['Ctrl', 'Y']} description="Redo (Windows/Linux)" />
                <Shortcut keys={['Cmd/Ctrl', 'Enter']} description="Apply current action" />
                <Shortcut keys={['Hold C']} description="Compare with original" />
            </div>

            <div className="mb-6">
                <h3 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">Navigation</h3>
                <Shortcut keys={['Alt', '1']} description="Switch to Retouch tab" />
                <Shortcut keys={['Alt', '2']} description="Switch to Crop tab" />
                <Shortcut keys={['Alt', '3']} description="Switch to Adjust tab" />
                <Shortcut keys={['Alt', '4']} description="Switch to Filters tab" />
            </div>

            <div>
                <h3 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">File</h3>
                <Shortcut keys={['Alt', 'R']} description="Reset all changes" />
                <Shortcut keys={['Alt', 'U']} description="Upload new image" />
                <Shortcut keys={['Cmd/Ctrl', 'S']} description="Download image" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
