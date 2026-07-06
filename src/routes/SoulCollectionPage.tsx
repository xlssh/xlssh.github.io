import React, { useEffect, useState, useMemo } from 'react';
import { loadSoulCollectionRnds, loadSoulCollectionShops, loadSoulCollectionBases } from '../data/loaders';
import type { SoulCollectionRnd, SoulCollectionShop, SoulCollectionBase } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Coins, Gift, RotateCcw, ShoppingCart } from 'lucide-react';

// Reward type labels
const REWARD_TYPES: Record<number, string> = { 0: 'Gold', 1: 'Item', 2: 'Silver', 3: 'Soul' };

export const SoulCollectionPage: React.FC = () => {
  const [rnds, setRnds] = useState<SoulCollectionRnd[]>([]);
  const [shops, setShops] = useState<SoulCollectionShop[]>([]);
  const [bases, setBases] = useState<SoulCollectionBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pullCount, setPullCount] = useState(10);
  const [selectedType, setSelectedType] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rRes, sRes, bRes] = await Promise.all([
        loadSoulCollectionRnds(), loadSoulCollectionShops(), loadSoulCollectionBases()
      ]);
      setRnds(rRes.rows);
      setShops(sRes.rows);
      setBases(bRes.rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Unique reward types
  const uniqueTypes = useMemo(() => {
    const types = new Set<number>();
    rnds.forEach(r => types.add(r.type));
    return Array.from(types).sort((a, b) => a - b);
  }, [rnds]);

  // Filtered rewards
  const filteredRewards = useMemo(() => {
    return rnds.filter(r => r.type === selectedType);
  }, [rnds, selectedType]);

  // Drop rate analysis
  const dropAnalysis = useMemo(() => {
    if (filteredRewards.length === 0) return null;
    const totalAmount = filteredRewards.reduce((sum, r) => sum + (r.reward?.amount || 0), 0);
    const avgAmount = totalAmount / filteredRewards.length;
    return {
      totalRewards: filteredRewards.length,
      totalAmount,
      avgAmount,
      chancePerReward: (100 / filteredRewards.length).toFixed(2),
    };
  }, [filteredRewards]);

  // Simulation
  const simulation = useMemo(() => {
    if (filteredRewards.length === 0) return [];
    const results: { reward: SoulCollectionRnd; pull: number }[] = [];
    for (let i = 0; i < pullCount; i++) {
      const idx = Math.floor(Math.random() * filteredRewards.length);
      results.push({ reward: filteredRewards[idx], pull: i + 1 });
    }
    return results;
  }, [filteredRewards, pullCount]);

  // Simulation stats
  const simStats = useMemo(() => {
    if (simulation.length === 0) return null;
    const totalGained = simulation.reduce((sum, s) => sum + (s.reward.reward?.amount || 0), 0);
    const uniqueRewards = new Set(simulation.map(s => s.reward.id)).size;
    return { totalGained, uniqueRewards };
  }, [simulation]);

  if (loading) return <LoadingState message="Loading soul collection databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
          <Coins size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Soul Collection Lottery Simulator</h1>
          <p className="text-sm text-muted">Analyze drop rates, simulate pulls, and view shop exchanges.</p>
        </div>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Rewards', value: rnds.length, color: 'text-brand' },
          { label: 'Shop Items', value: shops.length, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Pull Types', value: uniqueTypes.length, color: 'text-amber-600 dark:text-amber-400' },
        ].map((stat, idx) => (
          <div key={idx} className="p-4 border border-border bg-surface rounded-xl text-center">
            <div className={`text-2xl font-black font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-[11px] text-muted mt-1">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Type Selector & Pull Count */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Reward Type</label>
          <div className="flex gap-2">
            {uniqueTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${selectedType === type ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-bg text-muted hover:text-text'}`}
              >
                {REWARD_TYPES[type] || `Type ${type}`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Number of Pulls</label>
          <input
            type="number"
            min="1"
            max="100"
            value={pullCount}
            onChange={(e) => setPullCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            className="block w-full py-2 px-3 border border-border rounded-lg text-sm bg-bg font-mono focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </section>

      {/* Drop Rate Analysis */}
      {dropAnalysis && (
        <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2">
            <Gift size={18} className="text-emerald-500" />
            Drop Rate Analysis — {REWARD_TYPES[selectedType] || `Type ${selectedType}`}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Rewards', value: dropAnalysis.totalRewards },
              { label: 'Chance per Reward', value: `${dropAnalysis.chancePerReward}%` },
              { label: 'Avg Amount', value: dropAnalysis.avgAmount.toFixed(1) },
            ].map((stat, idx) => (
              <div key={idx} className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">{stat.label}</div>
                <div className="text-lg font-black font-mono text-brand">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Reward Pool */}
          <div className="max-h-40 overflow-y-auto border border-border rounded-xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 p-2">
              {filteredRewards.slice(0, 20).map(r => (
                <div key={r.id} className="p-1.5 border border-border rounded-lg bg-bg/50 text-center text-[10px]">
                  <div className="font-mono text-muted">ID: {r.id}</div>
                  <div className="font-bold text-text">×{r.reward?.amount || 0}</div>
                </div>
              ))}
              {filteredRewards.length > 20 && (
                <div className="p-1.5 text-[10px] text-subtle italic text-center">+{filteredRewards.length - 20} more</div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Simulation */}
      {simulation.length > 0 && (
        <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-text flex items-center gap-2">
              <RotateCcw size={18} className="text-violet-500" />
              Pull Simulation
            </h3>
            <button
              onClick={() => setPullCount(pullCount)}
              className="px-3 py-1.5 text-xs font-bold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors"
            >
              Re-roll
            </button>
          </div>

          {simStats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">Total Gained</div>
                <div className="text-lg font-black font-mono text-emerald-500">{simStats.totalGained}</div>
              </div>
              <div className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">Unique Rewards</div>
                <div className="text-lg font-black font-mono text-brand">{simStats.uniqueRewards}/{filteredRewards.length}</div>
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto border border-border rounded-xl">
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-10 gap-1 p-2">
              {simulation.map((s, idx) => (
                <div key={idx} className="p-1.5 border border-border rounded-lg bg-bg/50 text-center">
                  <div className="text-[8px] text-subtle">#{s.pull}</div>
                  <div className="text-[10px] font-mono font-bold text-text">×{s.reward.reward?.amount || 0}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Shop Exchanges */}
      {shops.length > 0 && (
        <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2">
            <ShoppingCart size={18} className="text-amber-500" />
            Shop Exchanges ({shops.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shops.map(s => (
              <div key={s.id} className="p-3 border border-border rounded-xl bg-bg/50">
                <div className="text-xs font-bold text-text mb-1">Exchange #{s.id}</div>
                <div className="text-[11px] text-muted">
                  Reward: Type {s.exchange_reward?.type} × {s.exchange_reward?.amount}
                </div>
                <div className="text-[11px] text-muted">
                  Frequency: {s.frequency}x
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
