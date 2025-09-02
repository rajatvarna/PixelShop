/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { ChevronLeftIcon } from './icons';

interface FaqPageProps {
  onBackToEditor: () => void;
}

const FaqItem: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => (
    <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{question}</h3>
        <div className="text-gray-600 dark:text-gray-300 space-y-2">
            {children}
        </div>
    </div>
);


const FaqPage: React.FC<FaqPageProps> = ({ onBackToEditor }) => {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-start gap-6 animate-fade-in">
        <button 
            onClick={onBackToEditor}
            className="flex items-center gap-2 text-blue-500 hover:underline font-semibold"
        >
            <ChevronLeftIcon className="w-5 h-5" />
            Back to Editor
        </button>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-800 dark:text-gray-50">
            Frequently Asked Questions
        </h1>

        <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 md:p-8 mt-4">
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