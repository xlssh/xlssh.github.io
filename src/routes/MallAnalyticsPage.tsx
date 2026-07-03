import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadMallItems, loadArticles } from '../data/loaders';
import { MallItem, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getMajorTypeLabel } from '../data/relationships';
import { ShoppingBag, ArrowLeft, Tag, ShoppingCart, ShieldAlert, Award, Plus, Trash2 } from 'lucide-react';

interface CartItem {
  mallItem: MallItem;
  quantity: number;
}

export const MallAnalyticsPage: React.FC = () => {
  const [mallItems, setMallItems] = useState<MallItem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cart Calculator State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number>(0);
  const [addQty, setAddQty] = useState<number>(1);

  // Tabs
  const [activeTab, setActiveTab] = useState<'discounts' | 'vip' | 'calculator'>('discounts');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [mallRes, articlesRes] = await Promise.all([
        loadMallItems(),
        loadArticles()
      ]);
      setMallItems(mallRes.rows);
      setArticles(articlesRes.rows);
      if (mallRes.rows.length > 0) {
        setSelectedItemId(mallRes.rows[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load shop indexes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. Discount Deals calculation
  const discountDeals = useMemo(() => {
    return [...mallItems]
      .filter(item => item.discount && item.discount > 0)
      .sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0));
  }, [mallItems]);

  // 2. VIP roadmap calculations
  const vipRoadmap = useMemo(() => {
    const groups: { [key: number]: MallItem[] } = {};
    for (const item of mallItems) {
      const v = item.vip ?? 0;
      if (!groups[v]) groups[v] = [];
      groups[v].push(item);
    }
    return Object.entries(groups)
      .map(([tier, items]) => ({ tier: parseInt(tier), items }))
      .sort((a, b) => a.tier - b.tier);
  }, [mallItems]);

  // Shopping Cart Calculations
  const cartSummary = useMemo(() => {
    let totalGoldBase = 0;
    let totalHotPrice = 0;
    let maxVipRequired = 0;

    for (const entry of cart) {
      const base = entry.mallItem.gold ?? 0;
      const hot = entry.mallItem.hotprice ?? base;
      totalGoldBase += base * entry.quantity;
      totalHotPrice += hot * entry.quantity;
      if (entry.mallItem.vip && entry.mallItem.vip > maxVipRequired) {
        maxVipRequired = entry.mallItem.vip;
      }
    }

    return {
      totalGoldBase,
      totalHotPrice,
      totalSavings: totalGoldBase - totalHotPrice,
      maxVipRequired
    };
  }, [cart]);

  const addToCart = () => {
    const item = mallItems.find(m => m.id === selectedItemId);
    if (!item) return;

    setCart(prev => {
      const exist = prev.find(e => e.mallItem.id === item.id);
      if (exist) {
        return prev.map(e => e.mallItem.id === item.id ? { ...e, quantity: e.quantity + addQty } : e);
      }
      return [...prev, { mallItem: item, quantity: addQty }];
    });
    setAddQty(1);
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => prev.filter(e => e.mallItem.id !== itemId));
  };

  const clearCart = () => setCart([]);

  if (loading) return <LoadingState message="Aggregating bargain indexes and VIP license unlock keys..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Navigation */}
      <div>
        <Link
          to="/mall-items"
          className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-text dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Mall Merchandise</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 rounded-xl">
              <ShoppingBag size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-text dark:text-subtle">Merchandise Analytics & Cart Calculator</h1>
              <p className="text-xs text-muted">Track best discount ratios, VIP tier unlocks, and calculate custom purchase bills.</p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-border pt-2 gap-4 text-sm font-bold">
          <button
            onClick={() => setActiveTab('discounts')}
            className={`pb-2 transition-all relative ${
              activeTab === 'discounts'
                ? 'text-fuchsia-600 dark:text-fuchsia-400 border-b-2 border-fuchsia-600 dark:border-fuchsia-400'
                : 'text-subtle hover:text-text dark:hover:text-zinc-200'
            } cursor-pointer`}
          >
            Hot Deals & Discounts ({discountDeals.length})
          </button>
          <button
            onClick={() => setActiveTab('vip')}
            className={`pb-2 transition-all relative ${
              activeTab === 'vip'
                ? 'text-fuchsia-600 dark:text-fuchsia-400 border-b-2 border-fuchsia-600 dark:border-fuchsia-400'
                : 'text-subtle hover:text-text dark:hover:text-zinc-200'
            } cursor-pointer`}
          >
            VIP Roadmap ({vipRoadmap.length} Tiers)
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`pb-2 transition-all relative ${
              activeTab === 'calculator'
                ? 'text-fuchsia-600 dark:text-fuchsia-400 border-b-2 border-fuchsia-600 dark:border-fuchsia-400'
                : 'text-subtle hover:text-text dark:hover:text-zinc-200'
            } cursor-pointer`}
          >
            Shopping Cart Calculator
          </button>
        </div>
      </div>

      {/* Discount Deals View */}
      {activeTab === 'discounts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {discountDeals.map((item) => {
            const linkedArt = articles.find(a => a.id === item.item_id);
            return (
              <div
                key={item.id}
                className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-[9px] text-subtle font-bold bg-bg px-2 py-0.5 rounded border border-border/80">
                      ID: {item.id}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-450 text-[10px] font-black uppercase">
                      -{item.discount}% Off
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-text">{item.name}</h3>
                  <div className="text-xs text-subtle space-y-1">
                    <p>Category: {getMajorTypeLabel(item.major_type)}</p>
                    {linkedArt && (
                      <Link to={`/articles/${linkedArt.id}`} className="text-violet-600 dark:text-violet-400 hover:underline block font-semibold">
                        Specs: {linkedArt.name} →
                      </Link>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-subtle block text-[10px]">Regular Price</span>
                    <span className="line-through text-subtle font-mono">{(item.gold ?? 0).toLocaleString()} G</span>
                  </div>
                  <div className="text-right">
                    <span className="text-fuchsia-600 dark:text-fuchsia-400 block text-[10px] font-bold">Discount Hot Price</span>
                    <span className="font-mono font-black text-base text-amber-600">{(item.hotprice ?? 0).toLocaleString()} Gold</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIP Unlock Roadmap View */}
      {activeTab === 'vip' && (
        <div className="space-y-6">
          {vipRoadmap.map((tier) => (
            <div
              key={tier.tier}
              className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4"
            >
              <h3 className="text-base font-extrabold text-text flex items-center gap-2 border-b border-border pb-2.5">
                <Award className="text-fuchsia-500" size={18} />
                <span>
                  {tier.tier === 0 ? "Default Ranks (No VIP Required)" : `VIP Level ${tier.tier} Unlocks`}
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tier.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border border-border bg-bg/10 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-text dark:text-zinc-250 block">{item.name}</span>
                      <span className="text-[10px] text-subtle font-mono">ID: {item.id}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-600">{(item.hotprice || item.gold || 0).toLocaleString()} Gold</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shopping Cart Calculator View */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Add Item form */}
          <div className="xl:col-span-1 p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-text flex items-center gap-2 border-b border-border pb-2.5">
              <ShoppingCart size={16} className="text-fuchsia-500" />
              <span>Add Merchandise</span>
            </h3>
            
            <div className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-subtle uppercase">Select Item</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-bg text-text font-bold focus:outline-none focus:ring-1.5 focus:ring-fuchsia-500 cursor-pointer"
                >
                  {mallItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name} (ID: {item.id})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-subtle uppercase">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={addQty}
                  onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-bg text-text font-bold"
                />
              </div>

              <button
                onClick={addToCart}
                className="w-full py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus size={16} />
                <span>Add to Shopping Cart</span>
              </button>
            </div>
          </div>

          {/* Cart items list */}
          <div className="xl:col-span-2 space-y-6">
            <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <h3 className="font-bold text-sm text-text flex items-center gap-2">
                  <ShoppingCart size={16} className="text-fuchsia-500" />
                  <span>Items List ({cart.length})</span>
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Clear Cart</span>
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <p className="text-xs text-subtle italic text-center py-8">Shopping cart is empty. Add merchandise to simulate gold savings.</p>
              ) : (
                <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                  {cart.map((entry) => {
                    const basePrice = entry.mallItem.gold ?? 0;
                    const hotPrice = entry.mallItem.hotprice ?? basePrice;

                    return (
                      <div
                        key={entry.mallItem.id}
                        className="p-3.5 border border-border bg-bg/10 rounded-xl flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="space-y-1">
                          <span className="font-bold text-sm text-text">{entry.mallItem.name}</span>
                          <div className="flex flex-wrap gap-2 text-[10px] text-subtle">
                            <span>Qty: {entry.quantity}</span>
                            <span>•</span>
                            <span>ID: {entry.mallItem.id}</span>
                            {entry.mallItem.vip ? (
                              <>
                                <span>•</span>
                                <span className="text-violet-600 dark:text-violet-400 font-bold">VIP {entry.mallItem.vip}+ Required</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <span className="block text-[10px] text-subtle">Total Price</span>
                            <span className="font-mono font-bold text-amber-600">{(hotPrice * entry.quantity).toLocaleString()} G</span>
                            {entry.mallItem.discount && entry.mallItem.discount > 0 ? (
                              <span className="block text-[9px] text-emerald-600 dark:text-emerald-450 font-bold">
                                (Saved {((basePrice - hotPrice) * entry.quantity).toLocaleString()} G)
                              </span>
                            ) : null}
                          </div>
                          <button
                            onClick={() => removeFromCart(entry.mallItem.id)}
                            className="p-1 border border-border hover:border-rose-200 text-subtle hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Calculations Aggregator Card */}
            {cart.length > 0 && (
              <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4 text-center items-center">
                <div className="p-3 border border-border bg-bg/20 rounded-xl space-y-1">
                  <span className="text-[10px] text-subtle uppercase font-bold block">Base Gold Price</span>
                  <span className="font-mono text-base font-bold text-muted">{cartSummary.totalGoldBase.toLocaleString()} G</span>
                </div>
                <div className="p-3 border border-border bg-fuchsia-500/5 rounded-xl space-y-1">
                  <span className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 uppercase font-black block">Total Hot Price</span>
                  <span className="font-mono text-lg font-black text-amber-600">{cartSummary.totalHotPrice.toLocaleString()} Gold</span>
                </div>
                <div className="p-3 border border-border bg-emerald-500/5 rounded-xl space-y-1">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">Savings</span>
                  <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                    +{cartSummary.totalSavings.toLocaleString()} G
                  </span>
                </div>
                <div className="p-3 border border-border bg-violet-500/5 rounded-xl space-y-1">
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 uppercase font-bold block">Required VIP Tier</span>
                  <span className="font-mono text-base font-extrabold text-violet-750 dark:text-violet-400">
                    {cartSummary.maxVipRequired > 0 ? `VIP Rank ${cartSummary.maxVipRequired}` : 'None'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
