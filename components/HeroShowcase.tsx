/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { inspirationData } from '../data/inspiration';

// Select a few diverse and visually interesting examples from the main inspiration data
const examples = inspirationData.filter(item => ['synthwave', 'studio-light', 'cartoonify'].includes(item.id));

const PARALLAX_STRENGTH = 20;

const HeroShowcase: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [parallax, setParallax] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (isPaused) return;

        const timer = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % examples.length);
        }, 4000);

        return () => clearInterval(timer);
    }, [isPaused]);
    
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;
        
        const parallaxX = -(mouseX / rect.width) * PARALLAX_STRENGTH;
        const parallaxY = -(mouseY / rect.height) * PARALLAX_STRENGTH;

        setParallax({ x: parallaxX, y: parallaxY });
    };

    const handleMouseLeave = () => {
        setParallax({ x: 0, y: 0 });
        setIsHovering(false);
    };

    const currentExample = examples[currentIndex];

    return (
        <div
            className="flex flex-col gap-4 items-center"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div 
              className="relative w-full aspect-[4/3] rounded-2xl shadow-2xl overflow-hidden group bg-gray-200 dark:bg-gray-800"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
            >
                <img 
                    key={`${currentExample.before}-${currentIndex}`}
                    src={currentExample.before}
                    alt="Before edit"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out"
                    style={{ transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0) scale(1.1)` }}
                />
                <img 
                    key={`${currentExample.after}-${currentIndex}`}
                    src={currentExample.after}
                    alt="After edit"
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-300 ease-out"
                    style={{ 
                        opacity: isHovering ? 0 : 1,
                        transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0) scale(1.1)` 
                    }}
                />
                <div 
                    className={`absolute top-2 right-2 px-3 py-1 text-sm font-bold rounded-full transition-opacity duration-300 ${
                        isHovering ? 'bg-black/50 text-white' : 'bg-white/50 text-black'
                    }`}
                >
                    {isHovering ? 'Before' : 'After'}
                </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300 font-medium text-center h-12 flex items-center">
                <span className="font-mono text-blue-500 mr-2 text-lg">&gt;</span>
                {currentExample.prompt}
            </p>

            <div className="flex gap-2">
                {examples.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            currentIndex === index ? 'bg-blue-500 scale-125' : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                        }`}
                        aria-label={`Go to example ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default HeroShowcase;