import React, { useState } from 'react';
import { Download, RefreshCw, Box, Filter, Search, Check, CheckSquare, Square, Moon, Sun, Monitor, Loader2, X } from 'lucide-react';
import { ThemeMode } from '../App';

interface InfoPanelProps {
  loading: boolean;
  progressText: string;
  totalCount: number;
  filteredCount: number;
  categories: string[];
  categoryCounts: Record<string, number>;
  selectedCategories: string[];
  searchQuery: string;
  themeMode: ThemeMode;
  isMobile: boolean;
  isOpen: boolean;
  onSearchChange: (query: string) => void;
  onToggleCategory: (category: string) => void;
  onSelectAllCategories: () => void;
  onClearAllCategories: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onThemeChange: (mode: ThemeMode) => void;
  onToggle: () => void;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ 
  loading,
  progressText,
  totalCount, 
  filteredCount,
  categories,
  categoryCounts,
  selectedCategories,
  searchQuery,
  themeMode,
  isMobile,
  isOpen,
  onSearchChange,
  onToggleCategory,
  onSelectAllCategories,
  onClearAllCategories,
  onRefresh, 
  onExport,
  onThemeChange,
  onToggle
}) => {
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  if (isMobile && !isOpen) return null;

  const containerClass = isMobile
    ? "fixed inset-0 z-50 bg-white dark:bg-gray-900 p-6 overflow-y-auto" // Mobile Fullscreen
    : "absolute top-4 left-4 bg-white/90 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 p-6 rounded-xl shadow-2xl z-10 w-80 max-h-[90vh] flex flex-col transition-colors duration-300"; // Desktop Card

  return (
    <div className={containerClass}>
      {/* Confirmation Overlay */}
      {showExportConfirm && (
        <div className="absolute inset-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200 rounded-xl">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
                <Download className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Export Data?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                Are you sure you want to export the current catalog?
            </p>
            <div className="flex gap-3 w-full">
                <button 
                    onClick={() => setShowExportConfirm(false)}
                    className="flex-1 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => {
                        onExport();
                        setShowExportConfirm(false);
                    }}
                    className="flex-1 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition-colors text-sm font-medium"
                >
                    Export
                </button>
            </div>
        </div>
      )}

      {/* Mobile Close Button */}
      {isMobile && (
        <button 
          onClick={onToggle} 
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full bg-gray-100 dark:bg-gray-800"
          aria-label="Close Menu"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
          <Box className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            PolySpectra 3D
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Filament Catalog Visualizer</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6 shrink-0">
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Live data from Polymaker.com
        </p>
        
        {/* Theme Toggles */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
          <button 
            onClick={() => onThemeChange('light')}
            className={`p-1.5 rounded-md transition-all ${themeMode === 'light' ? 'bg-white dark:bg-gray-600 shadow text-amber-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
            title="Light Mode"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => onThemeChange('system')}
            className={`p-1.5 rounded-md transition-all ${themeMode === 'system' ? 'bg-white dark:bg-gray-600 shadow text-indigo-500 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
            title="System Default"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => onThemeChange('dark')}
            className={`p-1.5 rounded-md transition-all ${themeMode === 'dark' ? 'bg-white dark:bg-gray-600 shadow text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
            title="Dark Mode"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Status */}
      {loading && (
        <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-1">
                <Loader2 className="w-3 h-3 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Fetching API...</span>
            </div>
            <p className="text-[10px] text-gray-600 dark:text-gray-400 font-mono truncate">{progressText}</p>
        </div>
      )}

      {/* Search Input */}
      <div className="mb-4 relative shrink-0">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 p-2.5 placeholder-gray-500 dark:placeholder-gray-500 transition-colors"
          placeholder="Search product, color..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Filter Section - Scrollable */}
      <div className={`mb-4 flex-1 overflow-hidden flex flex-col ${isMobile ? '' : 'min-h-[150px]'}`}>
         <div className="flex flex-col gap-2 mb-2 shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Filter className="w-4 h-4" />
              <span>Category Filter</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{selectedCategories.length} / {categories.length}</span>
            </div>
            
            <div className="flex gap-2 text-xs">
              <button 
                onClick={onSelectAllCategories}
                className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
              >
                <CheckSquare className="w-3 h-3" /> Select All
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button 
                onClick={onClearAllCategories}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 transition-colors"
              >
                <Square className="w-3 h-3" /> Clear All
              </button>
            </div>
         </div>
         
         <div className="overflow-y-auto pr-1 flex-1 space-y-1 custom-scrollbar">
            {categories.map((c) => {
              const isSelected = selectedCategories.includes(c);
              const count = categoryCounts[c] || 0;
              return (
                <button
                  key={c}
                  onClick={() => onToggleCategory(c)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all border ${
                    isSelected 
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-500/50 text-indigo-700 dark:text-white' 
                      : 'bg-white dark:bg-gray-800/50 border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="flex-1 text-left flex justify-between items-center pr-2">
                    <span>{c}</span>
                    <span className="text-xs opacity-50 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full min-w-[1.5rem] text-center">
                      {count}
                    </span>
                  </span>
                  {isSelected && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                </button>
              );
            })}
         </div>
      </div>

      <div className="space-y-3 shrink-0">
        <div className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
          <span className="text-gray-500 dark:text-gray-400">Visible Items</span>
          <div className="text-right">
             <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{filteredCount}</span>
             <span className="text-gray-400 dark:text-gray-600 text-xs mx-1">/</span>
             <span className="text-gray-400 dark:text-gray-600 text-xs">{totalCount}</span>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
            loading 
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 dark:shadow-indigo-900/50'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Catalog'}
        </button>

        <button
          onClick={() => setShowExportConfirm(true)}
          disabled={totalCount === 0}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export JSON
        </button>
      </div>
    </div>
  );
};