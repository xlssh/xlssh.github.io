import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadArticles, loadBlackMarketItems } from '../data/loaders';
import { Article, BlackMarketItem } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { 
  ShoppingBag, Search, Sparkles, Filter, ChevronRight, TrendingUp,
  Percent, Coins, ShieldAlert, Award, Plus, Trash2, CheckCircle2
} from 'lucide-react';

export const BlackMarketPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [marketItems, setMarketItems] = useState<BlackMarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all'); // 'all', 'silver', 'gold', 'coupon'
  const [minDiscount, setMinDiscount] = useState<number>(0);
  
  // Shopping Cart drawer state
  const [cart, setCart] = useState<Record<number, { item: BlackMarketItem; count: number }>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [artRes, marketRes] = await Promise.all([
          loadArticles(),
          loadBlackMarketItems()
        ]);
        setArticles(artRes.rows);
        setMarketItems(marketRes.rows);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load Black Market database.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const articlesMap = useMemo(() => {
    const map: Record<number, Article> = {};
    articles.forEach(a => {
      map[a.id] = a;
    });
    return map;
  }, [articles]);

  // Decode currency type to string name
  const getCurrencyName = (type: number, code: number) => {
    // Standard system codes:
    // code = 0, type = 0: Silver / Gold
    // We can also have item codes for coupons (e.g. 14120002)
    if (type === 0) {
      if (code === 0) return 'Silver';
      return 'Gold';
    }
    const art = articlesMap[code];
    return art ? art.name : `Resource #${code}`;
  };

  // Process & enrich raw market items
  const enrichedMarketItems = useMemo(() => {
    return marketItems.map(item => {
      const art = articlesMap[item.item_id];
      const oldPriceVal = item.old_price?.amount || 0;
      const priceVal = item.price?.amount || 0;
      const discountPct = oldPriceVal > 0 ? Math.round(((oldPriceVal - priceVal) / oldPriceVal) * 100) : 0;
      
      const currencyType = item.price?.type ?? 0;
      const currencyCode = item.price?.code ?? 0;
      
      let currencyName = 'Gold';
      if (currencyType === 0) {
        // Silver is usually type 0 code 0, gold type 0 code 1 or similar
        currencyName = currencyCode === 0 ? 'Silver' : 'Gold';
      } else {
        const cArt = articlesMap[currencyCode];
        currencyName = cArt?.name || 'Coupons';
      }

      // Deal Recommendation
      let rating = 'Standard Value';
      let ratingColor = 'text-zinc-400 bg-zinc-500/5';
      if (discountPct >= 50) {
        rating = '🔥 Legendary Deal';
        ratingColor = 'text-red-500 bg-red-500/10 border-red-500/30';
      } else if (discountPct >= 30) {
        rating = '⚡ Superb Deal';
        ratingColor = 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      } else if (discountPct >= 15) {
        rating = '🟢 Highly Efficient';
        ratingColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
      }

      return {
        ...item,
        itemName: art?.name || `Item #${item.item_id}`,
        itemQuality: art?.quality || 1,
        oldPriceVal,
        priceVal,
        discountPct,
        currencyType,
        currencyCode,
        currencyName,
        rating,
        ratingColor
      };
    });
  }, [marketItems, articlesMap]);

  // Filter items
  const filteredItems = useMemo(() => {
    return enrichedMarketItems.filter(item => {
      const matchSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDiscount = item.discountPct >= minDiscount;
      
      let matchCurrency = true;
      if (selectedCurrency === 'silver') {
        matchCurrency = item.currencyName.toLowerCase() === 'silver';
      } else if (selectedCurrency === 'gold') {
        matchCurrency = item.currencyName.toLowerCase() === 'gold';
      } else if (selectedCurrency === 'coupon') {
        matchCurrency = !['silver', 'gold'].includes(item.currencyName.toLowerCase());
      }

      return matchSearch && matchDiscount && matchCurrency;
    });
  }, [enrichedMarketItems, searchTerm, selectedCurrency, minDiscount]);

  // Cart operations
  const addToCart = (item: BlackMarketItem) => {
    setCart(prev => {
      const current = prev[item.id] || { item, count: 0 };
      return {
        ...prev,
        [item.id]: { item, count: current.count + 1 }
      };
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const clearCart = () => setCart({});

  // Sum cart totals
  const cartTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.values(cart).forEach(entry => {
      const priceVal = entry.item.price?.amount || 0;
      const type = entry.item.price?.type ?? 0;
      const code = entry.item.price?.code ?? 0;
      
      let name = 'Gold';
      if (type === 0) {
        name = code === 0 ? 'Silver' : 'Gold';
      } else {
        const cArt = articlesMap[code];
        name = cArt?.name || 'Coupons';
      }

      const totalCost = priceVal * entry.count;
      totals[name] = (totals[name] || 0) + totalCost;
    });
    return totals;
  }, [cart, articlesMap]);

  if (loading) return <LoadingState message="Decoding Black Market deals matrix..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-xs font-semibold mb-1">
            <Link to="/" className="hover:text-zinc-300 transition-colors">Dashboard</Link>
            <ChevronRight size={12} />
            <span className="text-zinc-500 dark:text-zinc-400">Tools</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2.5">
            <ShoppingBag className="text-emerald-500" size={28} />
            Black Market Ledger & Deals Calculator
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Filter secret shop item prices, calculate discount margins, and track gold/silver savings ROI.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Filter Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm space-y-5">
            <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Search & Shop Filters</span>
            
            {/* Search Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-450 dark:text-zinc-400">Search Item Shards</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-zinc-400" size={14} />
                <input
                  type="text"
                  placeholder="e.g. Ichigo Mod Soul"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-xl focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Currency Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-450 dark:text-zinc-400">Cost Currency</label>
              <div className="grid grid-cols-2 gap-1.5">
                {['all', 'silver', 'gold', 'coupon'].map((cur) => (
                  <button
                    key={cur}
                    onClick={() => setSelectedCurrency(cur)}
                    className={`py-1.5 px-1.5 text-center text-[10.5px] font-bold rounded-lg border uppercase transition-all ${
                      selectedCurrency === cur
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-650 dark:text-zinc-300'
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            {/* Min Discount Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-zinc-450 font-bold uppercase">Min Discount</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">-{minDiscount}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={minDiscount}
                onChange={(e) => setMinDiscount(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

          </div>

          {/* Shopping Cart Drawer */}
          <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Purchase Simulator</span>
              {Object.keys(cart).length > 0 && (
                <button onClick={clearCart} className="text-zinc-400 hover:text-red-500 transition-colors">
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {Object.values(cart).length > 0 ? (
                Object.values(cart).map((entry) => (
                  <div key={entry.item.id} className="flex justify-between items-center text-xs p-2 border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-lg">
                    <div className="truncate pr-2">
                      <span className="font-bold block truncate text-zinc-800 dark:text-zinc-200">
                        {articlesMap[entry.item.item_id]?.name || `Item #${entry.item.item_id}`}
                      </span>
                      <span className="text-[9px] text-zinc-450 font-mono">Qty: {entry.item.number * entry.count}</span>
                    </div>
                    <button 
                      onClick={() => removeFromCart(entry.item.id)}
                      className="text-zinc-450 hover:text-red-500 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-zinc-400 italic">
                  Click "+" on cards to simulate cart calculations.
                </div>
              )}
            </div>

            {Object.keys(cart).length > 0 && (
              <div className="pt-3 border-t border-zinc-150/45 dark:border-zinc-800/60 space-y-2">
                <span className="text-[9.5px] font-semibold text-zinc-450 uppercase block">Total Cost Summary</span>
                <div className="space-y-1.5 font-mono text-xs">
                  {Object.entries(cartTotals).map(([cur, total]) => (
                    <div key={cur} className="flex justify-between items-center text-zinc-800 dark:text-zinc-200 font-bold">
                      <span>{cur}:</span>
                      <span>{total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 3 Columns: Deals List Grid */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center text-xs text-zinc-450">
            <span>Showing <span className="font-bold text-zinc-800 dark:text-zinc-200">{filteredItems.length}</span> bargains</span>
            <span className="font-mono">Market Capacity: 1,071 active deals</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map((deal) => (
              <div 
                key={deal.id}
                className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all relative flex flex-col justify-between gap-4"
              >
                {/* Discount Tag */}
                {deal.discountPct > 0 && (
                  <div className="absolute top-4 right-4 px-2 py-0.5 rounded-lg text-[9px] font-black font-mono bg-emerald-500 text-white shadow-sm flex items-center gap-0.5 animate-pulse">
                    <Percent size={8} />
                    {deal.discountPct}% OFF
                  </div>
                )}

                {/* Deal Header */}
                <div className="space-y-2.5">
                  <span className={`inline-block px-2 py-0.5 text-[8.5px] font-bold border rounded-lg uppercase tracking-wider ${deal.ratingColor}`}>
                    {deal.rating}
                  </span>
                  
                  <div>
                    <h3 className="font-black text-sm text-zinc-850 dark:text-zinc-100 line-clamp-1">
                      {deal.itemName}
                    </h3>
                    <p className="text-[10px] text-zinc-450 font-mono mt-0.5">
                      Pack Size: {deal.number}x units
                    </p>
                  </div>
                </div>

                {/* Pricing Block */}
                <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/40">
                  <div className="flex justify-between items-end">
                    <div className="text-xs">
                      <span className="text-[9px] text-zinc-400 block uppercase font-mono">Original</span>
                      <span className="line-through text-zinc-450 font-bold font-mono">
                        {deal.oldPriceVal.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-zinc-450 block uppercase font-mono">Discounted ({deal.currencyName})</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        {deal.priceVal.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Add to Simulator Button */}
                  <button
                    onClick={() => addToCart(deal)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-zinc-150 dark:border-zinc-800 hover:border-emerald-500 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold rounded-xl text-zinc-700 dark:text-zinc-300 transition-all hover:bg-emerald-500/5"
                  >
                    <Plus size={12} />
                    Simulate Deal
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <span className="block text-zinc-400 text-xs font-semibold">No Black Market bargains match your filter conditions.</span>
              <p className="text-[10px] text-zinc-500 mt-1">Try lowering the minimum discount threshold slider or widening the search keyword.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
