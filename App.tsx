import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Scene } from './components/Scene';
import { InfoPanel } from './components/InfoPanel';
import { fetchPolymakerData } from './services/geminiService';
import { Product } from './types';
import { ExternalLink, AlertTriangle, Layers, Menu, Eye, ArrowLeft } from 'lucide-react';

export type ThemeMode = 'system' | 'dark' | 'light';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressText, setProgressText] = useState("");
  
  // Theme State
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('themeMode') as ThemeMode) || 'system';
  });
  const [isDark, setIsDark] = useState(true);

  // Filter States
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Hover state (Modified to hold an array for clusters)
  const [hoveredProducts, setHoveredProducts] = useState<Product[] | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentHoverIdRef = useRef<string | null>(null);

  // Quick View State (Drill-down from cluster)
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Responsive State
  const [isMobile, setIsMobile] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  // Initial Load Flag
  const hasLoadedRef = useRef(false);

  // Handle Theme Logic
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
    const checkSystem = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

    const updateTheme = () => {
      let dark = themeMode === 'system' ? checkSystem() : themeMode === 'dark';
      setIsDark(dark);
      document.documentElement.classList.toggle('dark', dark);
    };

    updateTheme();
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [themeMode]);

  // Handle Responsive Logic
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-hide panel on mobile if resizing down, show on desktop
      if (!mobile) setShowPanel(true);
    };

    // Initial check
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (mobile) setShowPanel(false);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initDataFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProducts([]); // Clear existing if refreshing
    setProgressText("Initializing API...");
    
    try {
      await fetchPolymakerData(
        (newProduct) => {
          setProducts(prev => {
            // Avoid duplicates
            if (prev.some(p => p.id === newProduct.id)) return prev;
            return [...prev, newProduct];
          });
          
          // Auto-select category if it's the first time seeing it
          setSelectedCategories(prev => {
            if (!prev.includes(newProduct.category)) return [...prev, newProduct.category].sort();
            return prev;
          });
        },
        (status, count) => {
          setProgressText(status);
        }
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch data from Polymaker.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      initDataFetch();
    }
  }, [initDataFetch]);

  // Derived Data
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  const uniqueCategories = useMemo(() => {
    return Object.keys(categoryCounts).sort();
  }, [categoryCounts]);

  const visibleProductIds = useMemo(() => {
    // If no categories are selected, show nothing (clear data points)
    if (selectedCategories.length === 0) {
      return new Set<string>();
    }

    const query = searchQuery.toLowerCase().trim();
    
    const filtered = products.filter(p => {
      // Strict category filtering
      if (!selectedCategories.includes(p.category)) {
        return false;
      }

      if (query) {
        const matchProduct = p.product.toLowerCase().includes(query);
        const matchColor = p.name.toLowerCase().includes(query);
        const matchCat = p.category.toLowerCase().includes(query);
        if (!matchProduct && !matchColor && !matchCat) {
          return false;
        }
      }
      return true;
    });

    return new Set(filtered.map(p => p.id));
  }, [products, selectedCategories, searchQuery]);

  // Handlers
  const handleToggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) return prev.filter(c => c !== category);
      return [...prev, category];
    });
  };

  const handleSelectAllCategories = () => setSelectedCategories(uniqueCategories);
  const handleClearAllCategories = () => setSelectedCategories([]);

  const handleExport = () => {
    const dataStr = JSON.stringify(products, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "polymaker_products.json";
    document.body.appendChild(link);
    link.click();
  };

  const handleRefresh = () => initDataFetch();

  const handleNodeHover = useCallback((hoveredItems: Product[] | null, screenPos?: { x: number, y: number }) => {
    if (hoveredItems && hoveredItems.length > 0) {
      const itemId = hoveredItems[0].id;
      
      // Only update state if it's a new hover target
      if (currentHoverIdRef.current !== itemId) {
        currentHoverIdRef.current = itemId;
        setQuickViewProduct(null);
        setHoveredProducts(hoveredItems);
      }

      // Always clear timeout when we are hovering a valid node
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      if (screenPos) setCursorPos(screenPos);
    } else {
      // Delay clearing to allow bridging to tooltip
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredProducts(null);
        setQuickViewProduct(null);
        currentHoverIdRef.current = null;
      }, 300);
    }
  }, []);

  // Determine styles for the floating tooltip
  // On mobile: Fixed at bottom
  // On desktop: Absolute positioning based on cursor
  const tooltipStyle = isMobile 
    ? {} 
    : {
      left: Math.min(cursorPos.x + 20, window.innerWidth - 340), // Increased buffer for wider card
      top: Math.min(cursorPos.y - 50, window.innerHeight - 300), 
      width: '320px' // Increased width
    };
    
  const tooltipClass = isMobile
    ? "fixed bottom-6 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-200 pointer-events-auto"
    : "absolute z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto cursor-pointer group";

  // Calculate the active product for single view (either direct hover or quick view)
  const activeSingleProduct = quickViewProduct || (hoveredProducts && hoveredProducts.length === 1 ? hoveredProducts[0] : null);

  return (
    <div className="relative w-full h-screen bg-[#7f7f7f] dark:bg-[#333333] overflow-hidden font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      
      <Scene 
        allProducts={products} 
        visibleProductIds={visibleProductIds}
        onNodeHover={handleNodeHover}
        isDark={isDark}
      />

      <InfoPanel 
        loading={loading}
        progressText={progressText}
        totalCount={products.length}
        filteredCount={visibleProductIds.size}
        categories={uniqueCategories}
        categoryCounts={categoryCounts}
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
        onSelectAllCategories={handleSelectAllCategories}
        onClearAllCategories={handleClearAllCategories}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={handleRefresh}
        onExport={handleExport}
        themeMode={themeMode}
        onThemeChange={setThemeMode}
        isMobile={isMobile}
        isOpen={showPanel}
        onToggle={() => setShowPanel(!showPanel)}
      />

      {/* Mobile Menu Button (Visible when panel is closed) */}
      {isMobile && !showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="absolute top-4 left-4 z-40 p-3 bg-white dark:bg-gray-900 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Open Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Product Tooltip / Card */}
      {hoveredProducts && hoveredProducts.length > 0 && (
        <div 
          className={tooltipClass}
          style={tooltipStyle}
          onMouseEnter={() => hoverTimeoutRef.current && clearTimeout(hoverTimeoutRef.current)}
          onMouseLeave={() => hoverTimeoutRef.current = setTimeout(() => { 
            setHoveredProducts(null); 
            setQuickViewProduct(null); 
            currentHoverIdRef.current = null;
          }, 300)}
        >
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200 dark:border-gray-600 rounded-xl p-0 shadow-2xl overflow-hidden transition-transform md:group-hover:scale-105 md:group-hover:border-indigo-400/50">
             
             {/* Single Product View (Direct or Quick View) */}
             {activeSingleProduct && (
               <div className="flex flex-col">
                 {/* Back Button for Quick View */}
                 {quickViewProduct && (
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setQuickViewProduct(null); }}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all"
                        >
                            <ArrowLeft className="w-3 h-3" />
                            Back to Cluster
                        </button>
                    </div>
                 )}

                 <a href={activeSingleProduct.url} target="_blank" rel="noopener noreferrer" className="block">
                   <div className="relative h-20 w-full overflow-hidden">
                      <div 
                        className="absolute inset-0 w-full h-full"
                        style={{ backgroundColor: activeSingleProduct.hex }} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                        <span className="text-white font-mono text-xs opacity-90 uppercase tracking-wider">{activeSingleProduct.hex}</span>
                        <ExternalLink className="w-4 h-4 text-white opacity-80" />
                      </div>
                   </div>

                   <div className="p-4">
                     <div className="mb-4">
                        <h3 className="font-bold text-lg leading-tight text-gray-900 dark:text-white mb-1">{activeSingleProduct.name}</h3>
                        <p className="text-indigo-600 dark:text-indigo-400 font-medium text-sm">{activeSingleProduct.product}</p>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
                        <div>
                          <span className="block text-gray-400 dark:text-gray-500 uppercase text-[10px] tracking-wider mb-0.5">Category</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{activeSingleProduct.category}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400 dark:text-gray-500 uppercase text-[10px] tracking-wider mb-0.5">TD</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {activeSingleProduct.td ? `${activeSingleProduct.td}` : 'N/A'}
                          </span>
                        </div>
                     </div>
                   </div>
                 </a>
               </div>
             )}

             {/* Cluster List View (Only if not in Quick View) */}
             {!activeSingleProduct && hoveredProducts.length > 1 && (
               <div className="flex flex-col max-h-[320px]">
                 <div className="p-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                       <Layers className="w-4 h-4 text-indigo-500" />
                       <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">
                         {hoveredProducts.length} Similar Colors
                       </span>
                    </div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Cluster Group</span>
                 </div>
                 
                 <div className="overflow-y-auto custom-scrollbar p-1">
                   {hoveredProducts.map((p) => (
                      <div 
                        key={p.id} 
                        className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group/item"
                      >
                         {/* Product Info Link */}
                         <a 
                            href={p.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                         >
                             <div 
                               className="w-8 h-8 rounded-full shadow-sm border border-gray-200 dark:border-gray-600 shrink-0"
                               style={{ backgroundColor: p.hex }}
                             />
                             <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-center mr-2">
                                 <span 
                                    className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate"
                                    title={p.name}
                                 >
                                    {p.name}
                                 </span>
                                 <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/50 px-1.5 py-0.5 rounded ml-2">{p.hex}</span>
                               </div>
                               <div 
                                  className="text-xs text-gray-500 dark:text-gray-400 truncate"
                                  title={p.product}
                               >
                                  {p.product}
                               </div>
                             </div>
                         </a>
                         
                         {/* Actions */}
                         <div className="flex items-center gap-1 ml-2">
                             <button
                               onClick={(e) => { e.stopPropagation(); setQuickViewProduct(p); }}
                               className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700/50 rounded transition-colors"
                               title="Quick View"
                             >
                                <Eye className="w-4 h-4" />
                             </button>
                             <a 
                               href={p.url} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="p-1.5 text-gray-300 hover:text-indigo-400 transition-colors"
                             >
                                <ExternalLink className="w-4 h-4" />
                             </a>
                         </div>
                      </div>
                   ))}
                 </div>
               </div>
             )}

          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && products.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/80 z-50 backdrop-blur-sm">
           <div className="text-center p-8 rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-800">
             <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Fetching Catalog</h2>
             <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto animate-pulse">
               {progressText || "Connecting to API..."}
             </p>
           </div>
        </div>
      )}

      {/* Error Overlay */}
      {!loading && error && products.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/80 z-50 backdrop-blur-sm">
           <div className="text-center p-8 rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-red-200 dark:border-red-900/50 max-w-md">
             <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
             </div>
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connection Error</h2>
             <p className="text-gray-600 dark:text-gray-300 mb-6">
               {error}
             </p>
             <button 
               onClick={handleRefresh}
               className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/30 transition-all"
             >
               Try Again
             </button>
           </div>
        </div>
      )}
    </div>
  );
}