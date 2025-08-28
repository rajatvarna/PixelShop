/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { inspirationData, Inspiration } from '../data/inspiration';
import { ChevronLeftIcon } from './icons';

interface InspirationPageProps {
  onBackToEditor: () => void;
  onTryPrompt: (prompt: string, type: 'filters' | 'adjust') => void;
}

const InspirationPage: React.FC<InspirationPageProps> = ({ onBackToEditor, onTryPrompt }) => {
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-start gap-6 animate-fade-in p-4">
        <button 
            onClick={onBackToEditor}
            className="flex items-center gap-2 text-blue-500 hover:underline font-semibold"
        >
            <ChevronLeftIcon className="w-5 h-5" />
            Back to Editor
        </button>
        <div className="text-center w-full">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-800">
                Inspiration Gallery
            </h1>
            <p className="mt-2 text-lg text-gray-600 max-w-3xl mx-auto">
                Discover creative prompts from the community. See a style you like? Try it on your own photos with one click.
            </p>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
            {inspirationData.map(item => (
                <InspirationCard key={item.id} item={item} onTryPrompt={onTryPrompt} />
            ))}
        </div>
    </div>
  );
};

const InspirationCard: React.FC<{ item: Inspiration; onTryPrompt: InspirationPageProps['onTryPrompt'] }> = ({ item, onTryPrompt }) => {
    const [isHovering, setIsHovering] = useState(false);

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col group">
            <div 
                className="relative aspect-square w-full bg-gray-200"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <img src={item.before} alt="Before" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <img 
                    src={item.after} 
                    alt="After" 
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-in-out ${isHovering ? 'opacity-0' : 'opacity-100'}`}
                    loading="lazy"
                />
                <div 
                    className={`absolute top-2 right-2 px-3 py-1 text-sm font-bold rounded-full transition-opacity duration-300 ${
                        isHovering ? 'bg-black/50 text-white' : 'bg-white/50 text-black'
                    }`}
                >
                    {isHovering ? 'Before' : 'After'}
                </div>
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <p className="text-gray-600 text-sm flex-grow">
                    <span className="font-bold text-gray-800">Prompt:</span> "{item.prompt}"
                </p>
                <button 
                    onClick={() => onTryPrompt(item.prompt, item.type)}
                    className="mt-4 w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
                >
                    Try this Prompt
                </button>
            </div>
        </div>
    );
};

export default InspirationPage;