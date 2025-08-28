/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { SparkleIcon, QuestionMarkCircleIcon, LightbulbIcon } from './icons';

interface HeaderProps {
    onShowShortcuts: () => void;
    onShowFaq: () => void;
    onShowInspiration: () => void;
}

const Header: React.FC<HeaderProps> = ({ onShowShortcuts, onShowFaq, onShowInspiration }) => {

  return (
    <header className="w-full py-3 px-4 sm:px-8 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between">
          <div className="flex items-center justify-center gap-3">
              <SparkleIcon className="w-6 h-6 text-blue-500" />
              <h1 className="text-xl font-bold tracking-tight text-gray-800">
                Pixelshop
              </h1>
          </div>

          <div className="flex items-center gap-2">
              <button
                  onClick={onShowInspiration}
                  title="View Inspiration Gallery"
                  aria-label="View Inspiration Gallery"
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
              >
                  <LightbulbIcon className="w-6 h-6" />
              </button>
              <button
                  onClick={onShowFaq}
                  title="View FAQ"
                  aria-label="View FAQ"
                  className="px-3 py-2 rounded-full text-sm font-semibold text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
              >
                  FAQ
              </button>
              <button
                  onClick={onShowShortcuts}
                  title="View keyboard shortcuts"
                  aria-label="View keyboard shortcuts"
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
              >
                  <QuestionMarkCircleIcon className="w-6 h-6" />
              </button>
          </div>
      </div>
    </header>
  );
};

export default Header;