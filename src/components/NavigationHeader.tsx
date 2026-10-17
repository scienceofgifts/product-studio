/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, Sparkles, BookOpen, Database, SlidersHorizontal, Layers, PieChart, FileText } from 'lucide-react';

export type ActiveTab = 'workspace' | 'library' | 'portfolio' | 'planner' | 'brain' | 'settings';

interface NavigationHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onNewProduct: () => void;
  libraryCount: number;
  apiConnected: boolean | null;
  selectedModel: string;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  activeTab,
  onTabChange,
  onNewProduct,
  libraryCount,
  apiConnected,
  selectedModel,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E8E4DC] px-4 sm:px-6 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element wordmark in display serif) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col">
            <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-stone-900 leading-none">
              Science of Gifts
            </span>
            <span className="text-[11px] font-medium tracking-wider uppercase text-stone-500 mt-0.5">
              Product Intelligence Studio
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Clean single-line unboxed text links with subtle hover/active states) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
          <button
            onClick={() => onTabChange('workspace')}
            className={`flex items-center gap-1.5 transition-colors pb-1 border-b-2 whitespace-nowrap shrink-0 ${
              activeTab === 'workspace'
                ? 'text-[#1E3A8A] border-[#1E3A8A] font-semibold'
                : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Workspace</span>
          </button>

          <button
            onClick={() => onTabChange('library')}
            className={`flex items-center gap-1.5 transition-colors pb-1 border-b-2 whitespace-nowrap shrink-0 ${
              activeTab === 'library'
                ? 'text-[#1E3A8A] border-[#1E3A8A] font-semibold'
                : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Product Library</span>
            {libraryCount > 0 && (
              <span className="text-xs text-stone-400 font-mono tabular-nums">({libraryCount})</span>
            )}
          </button>

          <button
            onClick={() => onTabChange('portfolio')}
            className={`flex items-center gap-1.5 transition-colors pb-1 border-b-2 whitespace-nowrap shrink-0 ${
              activeTab === 'portfolio'
                ? 'text-[#1E3A8A] border-[#1E3A8A] font-semibold'
                : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Portfolio Intelligence</span>
          </button>

          <button
            onClick={() => onTabChange('planner')}
            className={`flex items-center gap-1.5 transition-colors pb-1 border-b-2 whitespace-nowrap shrink-0 ${
              activeTab === 'planner'
                ? 'text-[#1E3A8A] border-[#1E3A8A] font-semibold'
                : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Guide Planner</span>
          </button>

          <button
            onClick={() => onTabChange('brain')}
            className={`flex items-center gap-1.5 transition-colors pb-1 border-b-2 whitespace-nowrap shrink-0 ${
              activeTab === 'brain'
                ? 'text-[#1E3A8A] border-[#1E3A8A] font-semibold'
                : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Business Brain</span>
          </button>

          <button
            onClick={() => onTabChange('settings')}
            className={`flex items-center gap-1.5 transition-colors pb-1 border-b-2 whitespace-nowrap shrink-0 ${
              activeTab === 'settings'
                ? 'text-[#1E3A8A] border-[#1E3A8A] font-semibold'
                : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action & New Analysis Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onNewProduct}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-md transition-colors shadow-xs whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Analysis</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="flex md:hidden items-center justify-around pt-2.5 mt-2 border-t border-[#E8E4DC] text-xs font-medium text-stone-600">
        <button
          onClick={() => onTabChange('workspace')}
          className={`flex items-center gap-1 py-1 ${activeTab === 'workspace' ? 'text-[#1E3A8A] font-bold' : ''}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Workspace</span>
        </button>
        <button
          onClick={() => onTabChange('library')}
          className={`flex items-center gap-1 py-1 ${activeTab === 'library' ? 'text-[#1E3A8A] font-bold' : ''}`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Library ({libraryCount})</span>
        </button>
        <button
          onClick={() => onTabChange('brain')}
          className={`flex items-center gap-1 py-1 ${activeTab === 'brain' ? 'text-[#1E3A8A] font-bold' : ''}`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Brain</span>
        </button>
        <button
          onClick={() => onTabChange('settings')}
          className={`flex items-center gap-1 py-1 ${activeTab === 'settings' ? 'text-[#1E3A8A] font-bold' : ''}`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
};
