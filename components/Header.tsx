/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { SparkleIcon, SunIcon, MoonIcon, QuestionMarkCircleIcon } from './icons';

interface HeaderProps {
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    onShowShortcuts: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, setTheme, onShowShortcuts }) => {
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="w-full py-3 px-4 sm:px-8 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/30 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between">
          <div className="flex items-center justify-center gap-3">
              <SparkleIcon className="w-6 h-6 text-blue-500 dark:text-blue-400" />
              <h1 className="text-xl font-bold tracking-tight text-gray-800 dark:text-gray-100">
                Pixshop
              </h1>
          </div>

          <div className="flex items-center gap-2">
              <button
                  onClick={onShowShortcuts}
                  title="View keyboard shortcuts"
                  aria-label="View keyboard shortcuts"
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                  <QuestionMarkCircleIcon className="w-6 h-6" />
              </button>
              <button
                  onClick={toggleTheme}
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                  aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                  {theme === 'light' ? (
                      <MoonIcon className="w-6 h-6" />
                  ) : (
                      <SunIcon className="w-6 h-6" />
                  )}
              </button>
          </div>
      </div>
    </header>
  );
};

export default Header;
