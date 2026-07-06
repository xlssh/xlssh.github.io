import React, { useEffect, useState, useMemo } from 'react';
import { loadTreasureLevelups, loadTreasureUpgrades } from '../data/loaders';
import type { TreasureLevelup, TreasureUpgrade } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Sparkles, TrendingUp, Coins } from 'lucide-react';

export const TreasureUpgradePage: React.FC = () => {
  const [levelUps, setLevelUps] = useState<TreasureLevelup[]>([]);
  const [upgrades, setUpgrades] = useState<TreasureUpgrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number>(0);
  const [targetLevel, setTargetLevel] = useState(5);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [luRes, upRes] = await Promise.all([loadTreasureLevelups(), loadTreasureUpgrades()]);
      setLevelUps(luRes.rows);
      setUpgrades(upRes.rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Unique treasure item IDs
  const uniqueTreasures = useMemo(() => {
    const ids = new Set<number>();
    upgrades.forEach(u => ids.add(u.item_id));
    return Array.from(ids).sort((a, b) => a - b);
  }, [upgrades]);

  // Upgrade path for selected treasure
  const upgradePath = useMemo(() => {
    return upgrades
      .filter(u => u.item_id === selectedItemId)
      .sort((a, b) => a.level - b.level);
  }, [upgrades, selectedItemId]);

  // Stats at target level
  const statsAtLevel = useMemo(() => {
    return upgradePath.find(u => u.level === targetLevel);
  }, [upgradePath, targetLevel]);

  // Total costs to reach target level
  const totalCosts = useMemo(() => {
    return upgradePath
      .filter(u => u.level <= targetLevel)
      .reduce((acc, u) => ({
        gold: acc.gold + (u.cost_gold || 0),
        items: acc.items + (u.cost_item_count || 0),
        stones: acc.stones + (u.cost_stone_count || 0),
      }), { gold: 0, items: 0, stones: 0 });
  }, [upgradePath, targetLevel]);

  // Level up data for selected treasure
  const levelUpData = useMemo(() => {
    return levelUps.filter(l => {
      // Match by item_id prefix (first 6 digits)
      const prefix = Math.floor(selectedItemId / 10000);
      const luPrefix = Math.floor(l.id / 10000);
      return prefix === luPrefix;
    }).sort((a, b) => a.level - b.level);
  }, [levelUps, selectedItemId]);

  const maxLevel = upgradePath.length > 0 ? Math.max(...upgradePath.map(u => u.level)) : 1;

  if (loading) return <LoadingState message="Loading treasure databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
          <Sparkles size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Treasure Upgrade Path Calculator</h1>
          <p className="text-sm text-muted">Analyze treasure upgrade costs, stat gains, and progression paths.</p>
        </div>
      </div>

      {/* Treasure Selector & Level */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Select Treasure</label>
          <select
            value={selectedItemId}
            onChange={(e) => { setSelectedItemId(parseInt(e.target.value)); setTargetLevel(0); }}
            className="block w-full py-2 px-3 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
          >
            <option value={0}>Select a treasure...</option>
            {uniqueTreasures.map(id => (
              <option key={id} value={id}>Treasure #{id}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Target Level</label>
          <input
            type="range"
            min="0"
            max={maxLevel}
            value={Math.min(targetLevel, maxLevel)}
            onChange={(e) => setTargetLevel(parseInt(e.target.value))}
            className="w-full accent-brand"
          />
          <div className="text-center text-sm font-mono font-bold text-brand mt-1">Level {targetLevel}</div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-xs text-subtle uppercase font-bold mb-1">Total Gold Cost</div>
          <div className="text-2xl font-black text-amber-500 font-mono">{totalCosts.gold.toLocaleString()}</div>
        </div>
      </section>

      {selectedItemId > 0 && upgradePath.length > 0 && (
        <>
          {/* Cost Summary */}
          <section className="p-5 border border-border bg-surface rounded-xl shadow-sm">
            <h3 className="font-bold text-text flex items-center gap-2 mb-3">
              <Coins size={18} className="text-amber-500" />
              Cost to Reach Level {targetLevel}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">Gold</div>
                <div className="text-lg font-black font-mono text-amber-500">{totalCosts.gold.toLocaleString()}</div>
              </div>
              <div className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">Items</div>
                <div className="text-lg font-black font-mono text-brand">{totalCosts.items.toLocaleString()}</div>
              </div>
              <div className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">Stones</div>
                <div className="text-lg font-black font-mono text-violet-500">{totalCosts.stones.toLocaleString()}</div>
              </div>
            </div>
          </section>

          {/* Upgrade Path Table */}
          <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
            <h3 className="font-bold text-text flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" />
              Upgrade Path
            </h3>
            <div className="max-h-96 overflow-y-auto border border-border rounded-xl">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-surface border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-subtle">Level</th>
                    <th className="px-3 py-2 text-left font-bold text-subtle">Gold Cost</th>
                    <th className="px-3 py-2 text-left font-bold text-subtle">Items Needed</th>
                    <th className="px-3 py-2 text-left font-bold text-subtle">Stones</th>
                    <th className="px-3 py-2 text-left font-bold text-subtle">Stat Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {upgradePath.map(u => (
                    <tr
                      key={u.id}
                      className={`border-b border-border ${u.level === targetLevel ? 'bg-brand-soft' : 'hover:bg-bg/50'}`}
                    >
                      <td className="px-3 py-2 font-mono font-bold text-text">Lv.{u.level}</td>
                      <td className="px-3 py-2 font-mono text-amber-500">{u.cost_gold?.toLocaleString()}</td>
                      <td className="px-3 py-2 font-mono text-muted">{u.cost_item_count}</td>
                      <td className="px-3 py-2 font-mono text-muted">{u.cost_stone_count}</td>
                      <td className="px-3 py-2 font-mono text-emerald-500">
                        {u.add_value?.map((v, i) => <span key={i}>+{v} </span>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
