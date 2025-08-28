/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { ChevronLeftIcon } from './icons';

interface FaqPageProps {
  onBackToEditor: () => void;
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

const FaqItem: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => (
    <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{question}</h3>
        <div className="text-gray-600 dark:text-gray-400 space-y-2">
            {children}
        </div>
    </div>
);


const FaqPage: React.FC<FaqPageProps> = ({ onBackToEditor }) => {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-start gap-6 animate-fade-in">
        <button 
            onClick={onBackToEditor}
            className="flex items-center gap-2 text-blue-500 dark:text-blue-400 hover:underline font-semibold"
        >
            <ChevronLeftIcon className="w-5 h-5" />
            Back to Editor
        </button>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-800 dark:text-gray-100">
            Frequently Asked Questions
        </h1>

        <div className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 md:p-8 mt-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                Keyboard Shortcuts
            </h2>
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

            <div className="mb-8">
                <h3 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">File</h3>
                <Shortcut keys={['Alt', 'R']} description="Reset all changes" />
                <Shortcut keys={['Alt', 'U']} description="Upload new image" />
                <Shortcut keys={['Cmd/Ctrl', 'S']} description="Download image" />
            </div>

            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                General Questions
            </h2>
            <FaqItem question="How does the AI editing work?">
                <p>
                    Our app uses Google's advanced Gemini model. When you provide a text prompt, the AI analyzes both your image and your words to generate a new, edited version that seamlessly matches your request. For precise edits, clicking a point on the image tells the AI exactly where to focus its magic.
                </p>
            </FaqItem>
            <FaqItem question="Are my images stored on your servers?">
                <p>
                    No. Your privacy is important. All image processing happens in memory and your images are never stored on our servers. Your original image and its edit history only exist in your browser during your current session.
                </p>
            </FaqItem>
             <FaqItem question="What kind of edits are not allowed?">
                <p>
                    The AI has safety filters to prevent harmful or inappropriate content generation. It will refuse requests to change a person's fundamental race or ethnicity, create misleading content, or generate unsafe imagery. Standard photo enhancements, including adjusting skin tone, are permitted.
                </p>
            </FaqItem>
        </div>
    </div>
  );
};

export default FaqPage;