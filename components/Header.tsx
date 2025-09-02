/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { SparkleIcon, QuestionMarkCircleIcon, LightbulbIcon, SunIcon, MoonIcon } from './icons';

interface HeaderProps {
    onShowShortcuts: () => void;
    onShowFaq: () => void;
    onShowInspiration: () => void;
}

const Header: React.FC<HeaderProps> = ({ onShowShortcuts, onShowFaq, onShowInspiration }) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pixelshop-theme') ?? 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pixelshop-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pixelshop-theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <header className="w-full py-3 px-4 sm:px-8 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between">
          <div className="flex items-center justify-center gap-3">
              <SparkleIcon className="w-6 h-6 text-blue-500" />
              <h1 className="text-xl font-bold tracking-tight text-gray-800 dark:text-gray-100">
                Pixelshop
              </h1>
          </div>

          <div className="flex items-center gap-2">
              <button
                  onClick={onShowInspiration}
                  title="View Inspiration Gallery"
                  aria-label="View Inspiration Gallery"
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
              >
                  <LightbulbIcon className="w-6 h-6" />
              </button>
              <button
                  onClick={onShowFaq}
                  title="View FAQ"
                  aria-label="View FAQ"
                  className="px-3 py-2 rounded-full text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
              >
                  FAQ
              </button>
              <button
                  onClick={onShowShortcuts}
                  title="View keyboard shortcuts"
                  aria-label="View keyboard shortcuts"
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
              >
                  <QuestionMarkCircleIcon className="w-6 h-6" />
              </button>
              <button
                  onClick={toggleTheme}
                  title="Toggle theme"
                  aria-label="Toggle theme"
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
              </button>
          </div>
      </div>
    </header>
  );
};

export default Header;