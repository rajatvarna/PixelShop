/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { UploadIcon, MagicWandIcon, PaletteIcon, SunIcon } from './icons';

interface StartScreenProps {
  onFileSelect: (files: FileList | null) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onFileSelect }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e.target.files);
  };

  return (
    <div 
      className={`w-full max-w-5xl mx-auto text-center p-8 transition-all duration-300 rounded-2xl border-2 ${isDraggingOver ? 'bg-blue-500/10 border-dashed border-blue-400 scale-[1.01]' : 'border-transparent'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        onFileSelect(e.dataTransfer.files);
      }}
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in relative">
        <div className="absolute -top-24 -z-10 w-72 h-72 bg-blue-500/50 dark:bg-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-cyan-400/30 dark:bg-cyan-400/20 rounded-full blur-3xl animate-pulse animation-delay-3000"></div>

        <h1 className="text-5xl font-extrabold tracking-tight text-gray-800 dark:text-gray-100 sm:text-6xl md:text-7xl">
          AI-Powered Photo Editing, <span className="text-blue-500 dark:text-blue-400">Simplified</span>.
        </h1>
        <p className="max-w-2xl text-lg text-gray-600 dark:text-gray-400 md:text-xl">
          Retouch photos, apply creative filters, or make professional adjustments using simple text prompts. No complex tools needed.
        </p>

        <div className="mt-6 flex flex-col items-center gap-4">
            <label htmlFor="image-upload-start" className="relative inline-flex items-center justify-center px-10 py-5 text-xl font-bold text-white bg-blue-600 rounded-full cursor-pointer group hover:bg-blue-500 transition-all duration-300 ease-in-out hover:scale-105 active:scale-100 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50">
                <UploadIcon className="w-6 h-6 mr-3 transition-transform duration-500 ease-in-out group-hover:rotate-[360deg] group-hover:scale-110" />
                Upload an Image
            </label>
            <input id="image-upload-start" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            <p className="text-sm text-gray-500 dark:text-gray-500">or drag and drop a file</p>
        </div>

        <div className="mt-16 w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={<MagicWandIcon className="w-6 h-6 text-blue-500 dark:text-blue-400" />}
                    title="Precise Retouching"
                    description="Click any point on your image to remove blemishes, change colors, or add elements with pinpoint accuracy."
                />
                <FeatureCard 
                    icon={<PaletteIcon className="w-6 h-6 text-blue-500 dark:text-blue-400" />}
                    title="Creative Filters"
                    description="Transform photos with artistic styles. From vintage looks to futuristic glows, find or create the perfect filter."
                />
                <FeatureCard 
                    icon={<SunIcon className="w-6 h-6 text-blue-500 dark:text-blue-400" />}
                    title="Pro Adjustments"
                    description="Enhance lighting, blur backgrounds, or change the mood. Get studio-quality results without complex tools."
                />
            </div>
        </div>

      </div>
    </div>
  );
};

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
    <div className="bg-white/40 dark:bg-black/20 p-6 rounded-lg border border-gray-300/50 dark:border-gray-700/50 flex flex-col items-center text-center backdrop-blur-md transition-all duration-300 hover:border-gray-400/80 dark:hover:border-gray-500/80 hover:scale-[1.02]">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full mb-4">
           {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{description}</p>
    </div>
);


export default StartScreen;