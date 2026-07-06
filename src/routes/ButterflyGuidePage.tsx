import React, { useEffect, useState, useMemo } from 'react';
import { loadButterflies, loadButterflyFeedings } from '../data/loaders';
import type { Butterfly, ButterflyFeeding } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Sparkles, Gift, Coins } from 'lucide-react';

export const ButterflyGuidePage: React.FC = () => {
  const [butterflies, setButterflies] = useState<Butterfly[]>([]);
  const [feedings, setFeedings] = useState<ButterflyFeeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVipLevel, setSelectedVipLevel] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bRes, fRes] = await Promise.all([loadButterflies(), loadButterflyFeedings()]);
      setButterflies(bRes.rows);
      setFeedings(fRes.rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Unique VIP levels
  const uniqueVipLevels = useMemo(() => {
    const levels = new Set<number>();
    feedings.forEach(f => levels.add(f.vip_level));
    return Array.from(levels).sort((a, b) => a - b);
  }, [feedings]);

  // Feedings for selected VIP level
  const filteredFeedings = useMemo(() => {
    return feedings.filter(f => f.vip_level === selectedVipLevel).sort((a, b) => a.powder_level - b.powder_level);
  }, [feedings, selectedVipLevel]);

  // Powder levels
  const powderLevels = useMemo(() => {
    const levels = new Set<number>();
    filteredFeedings.forEach(f => levels.add(f.powder_level));
    return Array.from(levels).sort((a, b) => a - b);
  }, [filteredFeedings]);

  // Group feedings by powder level
  const feedingsByPowder = useMemo(() => {
    const grouped = new Map<number, ButterflyFeeding[]>();
    filteredFeedings.forEach(f => {
      if (!grouped.has(f.powder_level)) grouped.set(f.powder_level, []);
      grouped.get(f.powder_level)!.push(f);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredFeedings]);

  // Butterfly upgrade curve
  const upgradeCurve = useMemo(() => {
    return butterflies.slice(0, 50).map((b, idx) => ({
      level: idx + 1,
      upgradeExp: b.upgrade_exp,
      cumulativeExp: butterflies.slice(0, idx + 1).reduce((sum, bt) => sum + (bt.upgrade_exp || 0), 0),
    }));
  }, [butterflies]);

  const maxExp = upgradeCurve.length > 0 ? upgradeCurve[upgradeCurve.length - 1].cumulativeExp : 0;

  if (loading) return <LoadingState message="Loading butterfly databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
          <Sparkles size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Butterfly Companion Guide</h1>
          <p className="text-sm text-muted">Analyze butterfly upgrade paths, feeding rewards by VIP level.</p>
        </div>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-4">
        {[
          { label: 'Butterflies', value: butterflies.length, color: 'text-brand' },
          { label: 'Feeding Entries', value: feedings.length, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'VIP Levels', value: uniqueVipLevels.length, color: 'text-amber-600 dark:text-amber-400' },
        ].map((stat, idx) => (
          <div key={idx} className="p-4 border border-border bg-surface rounded-xl text-center">
            <div className={`text-2xl font-black font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-[11px] text-muted mt-1">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* VIP Level Selector */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm">
        <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-2">Filter by VIP Level</label>
        <div className="flex flex-wrap gap-2">
          {uniqueVipLevels.map(vip => (
            <button
              key={vip}
              onClick={() => setSelectedVipLevel(vip)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${selectedVipLevel === vip ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-bg text-muted hover:text-text'}`}
            >
              VIP {vip}
            </button>
          ))}
        </div>
      </section>

      {/* Feeding Rewards by Powder Level */}
      <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2">
          <Gift size={18} className="text-emerald-500" />
          Feeding Rewards at VIP {selectedVipLevel}
        </h3>
        <div className="space-y-3">
          {feedingsByPowder.map(([powderLevel, entries]) => (
            <div key={powderLevel} className="p-3 border border-border rounded-xl bg-bg/50">
              <div className="text-xs font-bold text-text mb-2">Powder Level {powderLevel}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {entries.map(entry => (
                  <div key={entry.id} className="p-2 border border-border rounded-lg bg-surface text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-muted">ID: {entry.id}</span>
                    </div>
                    {entry.butterfly_rewards?.map((r, rIdx) => (
                      <div key={rIdx} className="flex items-center gap-1 text-[11px]">
                        <span className="text-muted">Type {r.type}:</span>
                        <span className="font-mono font-bold text-text">{r.amount}</span>
                        {r.code > 0 && <span className="text-subtle">×{r.code}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Upgrade Curve */}
      <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2">
          <Coins size={18} className="text-amber-500" />
          Butterfly Upgrade Curve (First 50)
        </h3>
        <div className="max-h-80 overflow-y-auto border border-border rounded-xl">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 bg-surface border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-bold text-subtle">Level</th>
                <th className="px-3 py-2 text-left font-bold text-subtle">EXP Needed</th>
                <th className="px-3 py-2 text-left font-bold text-subtle">Cumulative EXP</th>
                <th className="px-3 py-2 text-left font-bold text-subtle">Progress</th>
              </tr>
            </thead>
            <tbody>
              {upgradeCurve.map(entry => (
                <tr key={entry.level} className="border-b border-border hover:bg-bg/50">
                  <td className="px-3 py-2 font-mono font-bold text-text">Lv.{entry.level}</td>
                  <td className="px-3 py-2 font-mono text-muted">{entry.upgradeExp}</td>
                  <td className="px-3 py-2 font-mono text-brand">{entry.cumulativeExp.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                      <div className="h-full bg-brand rounded-full" style={{ width: `${(entry.cumulativeExp / maxExp) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
