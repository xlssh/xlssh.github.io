import React, { useState, useEffect } from 'react';
import { loadProfessionRefines } from '../data/loaders';
import { ProfessionRefine } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import {
  Sparkles,
  Calculator,
  TrendingUp,
  Award,
  BookOpen,
  DollarSign,
  Layers,
  Search,
  Zap,
  Flame,
  Shield,
  Crosshair
} from 'lucide-react';

const STONE_BREAKDOWN_DATA = [
  { level: 1, crystals: 1, fee: 5000, reqLv1: 1, bonus: null },
  { level: 2, crystals: 2, fee: 10000, reqLv1: 2, bonus: null },
  { level: 3, crystals: 4, fee: 15000, reqLv1: 4, bonus: null },
  { level: 4, crystals: 9, fee: 20000, reqLv1: 8, bonus: "+1" },
  { level: 5, crystals: 19, fee: 25000, reqLv1: 16, bonus: "+1" },
  { level: 6, crystals: 38, fee: 30000, reqLv1: 32, bonus: null },
  { level: 7, crystals: 76, fee: 35000, reqLv1: 64, bonus: null },
  { level: 8, crystals: 153, fee: 40000, reqLv1: 128, bonus: "+1" },
  { level: 9, crystals: 307, fee: 45000, reqLv1: 256, bonus: "+1" },
  { level: 10, crystals: 614, fee: 50000, reqLv1: 512, bonus: null },
  { level: 11, crystals: 1228, fee: 55000, reqLv1: 1024, bonus: null },
  { level: 12, crystals: 2457, fee: 60000, reqLv1: 2048, bonus: "+1" },
];

const SHOP_EFFICIENCY_DATA = [
  { item: "Level 1 Stone (any)", lv1Amount: 1, price: 15, vipPrice: 12, vipOnly: false, notes: "Standard single purchase" },
  { item: "Level 2 Stone (any)", lv1Amount: 2, price: 30, vipPrice: 25, vipOnly: false, notes: "Fused purchase" },
  { item: "Level 3 Stone (any)", lv1Amount: 4, price: 60, vipPrice: 51, vipOnly: false, notes: "Fused purchase" },
  { item: "Level 4 Stone (any)", lv1Amount: 8, price: 120, vipPrice: 102, vipOnly: false, notes: "Fused purchase" },
  { item: "Lv.1 Stone Pack (x10)", lv1Amount: 10, price: 100, vipPrice: 100, vipOnly: false, notes: "Highly Recommended for budget buys" },
  { item: "Lv.3 Stone Pack (x40)", lv1Amount: 40, price: 400, vipPrice: 400, vipOnly: false, notes: "Excellent bulk value" },
  { item: "Lv.4 Stone Pack (x88)", lv1Amount: 88, price: 880, vipPrice: 880, vipOnly: false, notes: "Best raw efficiency pack" },
];

const SEIREITEI_EFFICIENCY_DATA = [
  { stage: "Stage 1", lv1Amount: 4, costVit: 10, notes: "Lv.3 Stone Box" },
  { stage: "Stage 2", lv1Amount: 12, costVit: 30, notes: "Lv.4 Stone Box" },
  { stage: "Stage 4", lv1Amount: 20, costVit: 70, notes: "Lv.4 Stone Box" },
  { stage: "Stage 6", lv1Amount: 36, costVit: 120, notes: "Lv.5 Stone Box" },
  { stage: "Stage 7", lv1Amount: 52, costVit: 150, notes: "Lv.5 Stone Box" },
  { stage: "Stage 8", lv1Amount: 68, costVit: 180, notes: "Lv.5 Stone Box" },
  { stage: "Stage 10", lv1Amount: 100, costVit: 280, notes: "Lv.6 Stone Box" },
  { stage: "Stage 12", lv1Amount: 132, costVit: 410, notes: "Lv.4 Stone x 4" },
  { stage: "Stage 13", lv1Amount: 164, costVit: 500, notes: "Lv.6 Stone Box" },
];

export const SoulKingRefineryPage: React.FC = () => {
  const [refines, setRefines] = useState<ProfessionRefine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Planner States
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [targetLevel, setTargetLevel] = useState<number>(100);

  // Breakdown Simulator States
  const [stoneCounts, setStoneCounts] = useState<{ [key: number]: number }>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0
  });

  useEffect(() => {
    loadProfessionRefines()
      .then(data => {
        setRefines(data.rows || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load Soul King Palace Refinery data.");
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingState message="Connecting to the Soul King Palace…" />;
  if (error) return <ErrorState message={error} />;

  // Calculated totals for Refinery Planner
  const calculatePlan = () => {
    if (currentLevel < 0 || targetLevel > 100 || currentLevel >= targetLevel) {
      return { crystals: 0, stones: 0, totalCoupons: 0 };
    }
    let totalCrystals = 0;
    for (let lvl = currentLevel + 1; lvl <= targetLevel; lvl++) {
      const refineRow = refines.find(r => r.id === lvl);
      if (refineRow) {
        totalCrystals += refineRow.cost;
      }
    }
    const totalStonesEstimate = totalCrystals; 
    const couponCostEstimate = totalCrystals * 10; 
    return {
      crystals: totalCrystals,
      stones: totalStonesEstimate,
      totalCoupons: couponCostEstimate
    };
  };

  const planResults = calculatePlan();

  // Calculated totals for Breakdown Simulator
  const calculateBreakdown = () => {
    let totalCrystals = 0;
    let totalFee = 0;
    let totalLv1Eq = 0;

    Object.keys(stoneCounts).forEach(key => {
      const lv = parseInt(key);
      const count = stoneCounts[lv] || 0;
      if (count > 0) {
        const bd = STONE_BREAKDOWN_DATA.find(d => d.level === lv);
        if (bd) {
          totalCrystals += bd.crystals * count;
          totalFee += bd.fee * count;
          totalLv1Eq += bd.reqLv1 * count;
        }
      }
    });

    return {
      crystals: totalCrystals,
      fee: totalFee,
      lv1Eq: totalLv1Eq
    };
  };

  const breakdownResults = calculateBreakdown();

  const handleStoneCountChange = (level: number, value: string) => {
    const parsed = parseInt(value);
    setStoneCounts(prev => ({
      ...prev,
      [level]: isNaN(parsed) || parsed < 0 ? 0 : parsed
    }));
  };

  const handleClearStones = () => {
    setStoneCounts({
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0
    });
  };

  // Filter levels
  const filteredRefines = refines.filter(row => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      row.id.toString() === query ||
      row.cost.toString().includes(query) ||
      (row.phy_atk * 100).toFixed(1).includes(query)
    );
  });

  return (
    <div className="space-y-8 animate-fadeIn text-text pb-16">
      {/* Mystical Header Banner (Responsive Dark/Light mode) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-surface to-purple-50 dark:from-indigo-950/40 dark:via-surface dark:to-purple-950/40 border border-brand-soft dark:border-indigo-500/20 p-8 shadow-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center gap-6 md:justify-between">
          <div className="space-y-3 max-w-2xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-brand-soft text-brand rounded-full">
              <Sparkles size={14} aria-hidden="true" /> Soul King Palace
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent text-balance">
              Soul King Palace Refinery
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Unlock supreme spiritual capabilities. The Refinery uses <strong className="text-brand">Blood War Crystals</strong> 
              (obtained by breaking down spirit stones) to grant permanent percent stat boosts to all characters of corresponding 
              classes—even if they are not in your active formation.
            </p>
          </div>
          <div className="shrink-0 flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-brand-soft rounded-2xl shadow-sm border border-brand/10 relative">
            <Sparkles size={40} className="text-brand animate-pulse" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Affected Classes (Responsive Light/Dark Layout) */}
      <div>
        <h2 className="text-lg font-bold uppercase tracking-wider text-muted mb-4 flex items-center gap-2 text-balance">
          <Award size={18} className="text-brand" aria-hidden="true" /> Affected Classes & Mastery Boosts
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface border border-border hover:border-brand/40 transition-colors duration-200 shadow-sm flex flex-col justify-between group">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Class 01</span>
                <h3 className="text-lg font-extrabold text-text mt-0.5 group-hover:text-brand transition-colors duration-200">Spirit Class</h3>
                <p className="text-xs text-muted mt-1">Focuses on Agility and Speed attribute-scaling. Fast, deadly strikes.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-soft text-brand transition-colors duration-200">
                <Zap size={20} aria-hidden="true" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted flex justify-between">
              <span>Primary Stat Boost</span>
              <strong className="text-brand font-mono">Agility / Speed</strong>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border hover:border-brand/40 transition-colors duration-200 shadow-sm flex flex-col justify-between group">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Class 02</span>
                <h3 className="text-lg font-extrabold text-text mt-0.5 group-hover:text-brand transition-colors duration-200">Manic Class</h3>
                <p className="text-xs text-muted mt-1">Includes Vanguard role. Essential defenses and vanguard health scaling.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-soft text-brand transition-colors duration-200">
                <Shield size={20} aria-hidden="true" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted flex justify-between">
              <span>Primary Stat Boost</span>
              <strong className="text-brand font-mono">Physical Defense</strong>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border hover:border-brand/40 transition-colors duration-200 shadow-sm flex flex-col justify-between group">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Class 03</span>
                <h3 className="text-lg font-extrabold text-text mt-0.5 group-hover:text-brand transition-colors duration-200">Kidō Class</h3>
                <p className="text-xs text-muted mt-1">Focuses on Intellect, Strategy Attack, and Strategy Defense multipliers.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-soft text-brand transition-colors duration-200">
                <Flame size={20} aria-hidden="true" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted flex justify-between">
              <span>Primary Stat Boost</span>
              <strong className="text-brand font-mono">Kidō / Strategy</strong>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border hover:border-brand/40 transition-colors duration-200 shadow-sm flex flex-col justify-between group">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Class 04</span>
                <h3 className="text-lg font-extrabold text-text mt-0.5 group-hover:text-brand transition-colors duration-200">Ghost Class</h3>
                <p className="text-xs text-muted mt-1">Unleashes raw Strength multipliers. Boosts massive Physical damage scaling.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-soft text-brand transition-colors duration-200">
                <Crosshair size={20} aria-hidden="true" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted flex justify-between">
              <span>Primary Stat Boost</span>
              <strong className="text-brand font-mono">Physical / Strength</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Calculators Section (Responsive Light/Dark Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Interactive Refinery Planner */}
        <div className="p-6 rounded-2xl bg-surface border border-border space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-soft text-brand rounded-xl">
              <Calculator size={20} aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-text text-balance">Refinery Level Planner</h3>
              <p className="text-xs text-muted">Calculate exact Crystal and Stone costs between levels</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="refinery-current-level" className="text-xs font-semibold text-muted">Current Level</label>
              <input
                id="refinery-current-level"
                type="number"
                min="0"
                max="99"
                value={currentLevel}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setCurrentLevel(isNaN(val) || val < 0 ? 0 : Math.min(99, val));
                }}
                className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 font-mono text-sm text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus:border-brand"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="refinery-target-level" className="text-xs font-semibold text-muted">Target Level</label>
              <input
                id="refinery-target-level"
                type="number"
                min="1"
                max="100"
                value={targetLevel}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setTargetLevel(isNaN(val) || val < 1 ? 1 : Math.min(100, val));
                }}
                className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 font-mono text-sm text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus:border-brand"
              />
            </div>
          </div>

          {currentLevel >= targetLevel ? (
            <div className="p-4 rounded-xl bg-app-danger/10 border border-app-danger/20 text-xs text-danger text-center">
              Target Level must be greater than Current Level.
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-brand-soft/40 dark:bg-brand-soft/20 border border-brand/20 grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block">Crystals Required</span>
                <span className="text-xl font-mono font-extrabold text-brand tabular-nums">{planResults.crystals.toLocaleString()}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block">Lv.1 Stones Eq.</span>
                <span className="text-xl font-mono font-extrabold text-brand tabular-nums">~{planResults.stones.toLocaleString()}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block">Est. Coupons Cost</span>
                <span className="text-xl font-mono font-extrabold text-brand tabular-nums">~{planResults.totalCoupons.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="space-y-2 text-xs text-muted">
            <h4 className="font-semibold text-text">Strategic Planner Tips:</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>Reaching <strong className="text-text">Level 100</strong> requires a total of <strong className="text-brand font-mono">736,750</strong> Crystals.</li>
              <li>This is equivalent to slightly more than <strong className="text-text">299 level 12 stones</strong> (or <strong className="text-text">614,112</strong> level 1 stones).</li>
              <li>Buying stones from the VIP Shop as <strong className="text-brand font-mono">VIP6+</strong> optimizes overall coupon efficiency.</li>
            </ul>
          </div>
        </div>

        {/* Spirit Stone Breakdown Simulator */}
        <div className="p-6 rounded-2xl bg-surface border border-border space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-soft text-brand rounded-xl">
                <Layers size={20} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-text text-balance">Breakdown Simulator</h3>
                <p className="text-xs text-muted">Calculate breakdown yields for your current inventory</p>
              </div>
            </div>
            <button
              onClick={handleClearStones}
              className="px-2.5 py-1 text-[10px] uppercase font-bold text-subtle hover:text-text bg-bg hover:bg-hover border border-border rounded-lg transition-colors duration-200"
            >
              Reset Counts
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-56 overflow-y-auto pr-1">
            {STONE_BREAKDOWN_DATA.map(bd => (
              <div key={bd.level} className="bg-bg p-2 rounded-xl border border-border flex flex-col justify-between space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-text">Lv. {bd.level}</span>
                  {bd.bonus && <span className="text-[9px] px-1 font-bold text-success bg-success/10 rounded">{bd.bonus}</span>}
                </div>
                <input
                  type="number"
                  min="0"
                  aria-label={`Count of level ${bd.level} spirit stones`}
                  value={stoneCounts[bd.level]}
                  onChange={(e) => handleStoneCountChange(bd.level, e.target.value)}
                  className="w-full bg-surface border border-border rounded px-2 py-1 font-mono text-xs text-text text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus:border-brand"
                />
              </div>
            ))}
          </div>

          <div className="p-5 rounded-2xl bg-brand-soft/30 dark:bg-brand-soft/10 border border-brand/20 grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest block">Total Yield Crystals</span>
              <span className="text-xl font-mono font-extrabold text-brand tabular-nums">{breakdownResults.crystals.toLocaleString()}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest block">Silver Fee Required</span>
              <span className="text-xl font-mono font-extrabold text-brand tabular-nums">{breakdownResults.fee.toLocaleString()}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest block">Equivalent Lv.1s</span>
              <span className="text-xl font-mono font-extrabold text-brand tabular-nums">{breakdownResults.lv1Eq.toLocaleString()}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-bg border border-border text-[11px] text-muted flex items-center gap-2">
            <TrendingUp size={16} className="text-success" aria-hidden="true" />
            <span>
              <strong>Tip:</strong> Always fuse stones to the highest level possible before breaking down. Level 4, 5, 8, 9, and 12 give <strong className="text-success">bonus crystals</strong> that increase your efficiency!
            </span>
          </div>
        </div>
      </div>

      {/* Sourcing Strategy Accordion Guides */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold uppercase tracking-wider text-muted flex items-center gap-2 text-balance">
          <BookOpen size={18} className="text-brand" aria-hidden="true" /> Sourcing Strategy Guides
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shop Efficiency List */}
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text uppercase tracking-widest flex items-center gap-2 text-balance">
                <DollarSign size={16} className="text-success" aria-hidden="true" /> Shop Efficiency Comparison
              </h3>
              <span className="text-[10px] font-extrabold text-subtle uppercase">Sorted by value</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {SHOP_EFFICIENCY_DATA.map((item, idx) => {
                const standardEff = item.lv1Amount / item.price;
                const vipEff = item.lv1Amount / item.vipPrice;
                const isBest = item.lv1Amount / item.price >= 0.1 || item.lv1Amount / item.vipPrice >= 0.1;

                return (
                  <div key={idx} className="p-3 rounded-xl bg-bg border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text">{item.item}</span>
                        {isBest && <span className="text-[9px] px-1.5 py-0.5 bg-success/10 text-success font-bold uppercase rounded">BEST VALUE</span>}
                      </div>
                      <span className="text-[10px] text-muted block">{item.notes}</span>
                    </div>
                    <div className="flex items-center gap-4 font-mono">
                      <div className="text-right">
                        <span className="text-[10px] text-muted block">Std. Efficiency</span>
                        <strong className="text-text tabular-nums">{standardEff.toFixed(3)}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-brand block">VIP6+ Efficiency</span>
                        <strong className="text-brand tabular-nums">{vipEff.toFixed(3)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seireitei Attack & Other sources */}
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text uppercase tracking-widest flex items-center gap-2 text-balance">
                <TrendingUp size={16} className="text-brand" aria-hidden="true" /> Seireitei Attack Vitality
              </h3>
              <span className="text-[10px] font-extrabold text-subtle uppercase">Vit Cost vs Stone Yield</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {SEIREITEI_EFFICIENCY_DATA.map((item, idx) => {
                const eff = item.lv1Amount / item.costVit;
                return (
                  <div key={idx} className="p-2.5 rounded-xl bg-bg border border-border flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-text">{item.stage}</span>
                      <span className="text-[10px] text-muted block">{item.notes}</span>
                    </div>
                    <div className="flex items-center gap-4 font-mono">
                      <div className="text-right">
                        <span className="text-[10px] text-muted block">Vitality Cost</span>
                        <strong className="text-text tabular-nums">{item.costVit}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-brand block">Efficiency</span>
                        <strong className="text-brand tabular-nums">{eff.toFixed(3)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Level-by-Level Stat Data Table */}
      <div className="p-6 rounded-2xl bg-surface border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-text text-balance">Full Level-by-Level Reference</h2>
            <p className="text-xs text-muted">View exact Blood War Crystal costs and class stat boosts per level</p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              id="refinery-search-query"
              type="text"
              placeholder="Search by Level/Cost…"
              aria-label="Search levels and costs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border bg-bg text-text focus:outline-none focus:ring-1 focus:ring-brand placeholder-subtle"
            />
            <Search size={14} className="absolute left-3 top-3 text-muted" aria-hidden="true" />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-surface max-h-96">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-bg sticky top-0 border-b border-border text-muted font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-mono">Level</th>
                <th className="px-4 py-3 text-right">Crystals Cost</th>
                <th className="px-4 py-3 text-right">Total Crystals</th>
                <th className="px-4 py-3 text-right">Stat Boost (%)</th>
                <th className="px-4 py-3 text-right">Cost Increase</th>
                <th className="px-4 py-3 text-right">Boost Increase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-mono text-text">
              {filteredRefines.map((row) => {
                // calculate cumulative costs
                let totalCrystalsToHere = 0;
                for (let i = 0; i < refines.length; i++) {
                  if (refines[i].id <= row.id) {
                    totalCrystalsToHere += refines[i].cost;
                  }
                }

                // calculate cost increase from previous level
                const prevRow = refines.find(r => r.id === row.id - 1);
                const costIncrease = prevRow ? row.cost - prevRow.cost : row.cost;

                // calculate boost increase from previous level
                const boostIncrease = prevRow ? row.phy_atk - prevRow.phy_atk : row.phy_atk;

                return (
                  <tr key={row.id} className="hover:bg-hover transition-colors">
                    <td className="px-4 py-2.5 font-bold text-brand font-mono">Lvl {row.id}</td>
                    <td className="px-4 py-2.5 text-right font-semibold font-mono tabular-nums">{row.cost.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-muted font-mono tabular-nums">{totalCrystalsToHere.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-success font-mono tabular-nums">{(row.phy_atk * 100).toFixed(2)}%</td>
                    <td className="px-4 py-2.5 text-right text-subtle font-mono tabular-nums">
                      {costIncrease > 0 ? `+${costIncrease}` : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-success/80 font-mono tabular-nums">
                      {boostIncrease > 0 ? `+${(boostIncrease * 100).toFixed(2)}%` : "-"}
                    </td>
                  </tr>
                );
              })}
              {filteredRefines.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-subtle">
                    No matching level results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
