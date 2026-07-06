import React, { useEffect, useState, useMemo } from 'react';
import { loadCullingMagics } from '../data/loaders';
import type { CullingMagic } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Swords, TrendingUp, Coins } from 'lucide-react';

// Magic type labels
const MAGIC_TYPES: Record<number, string> = { 1: 'Vanguard', 2: 'Assault', 3: 'Support' };

export const CullingOptimizerPage: React.FC = () => {
  const [magics, setMagics] = useState<CullingMagic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<number>(1);
  const [targetLevel, setTargetLevel] = useState(10);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await loadCullingMagics();
      setMagics(data.rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Unique magic types
  const magicTypes = useMemo(() => {
    const types = new Set<number>();
    magics.forEach(m => types.add(m.type));
    return Array.from(types).sort((a, b) => a - b);
  }, [magics]);

  // Magics for selected type, sorted by level
  const typeMagics = useMemo(() => {
    return magics
      .filter(m => m.type === selectedType)
      .sort((a, b) => a.level - b.level);
  }, [magics, selectedType]);

  // Stats at target level
  const statsAtLevel = useMemo(() => {
    return typeMagics.find(m => m.level === targetLevel);
  }, [typeMagics, targetLevel]);

  // Cumulative stats up to target level
  const cumulativeStats = useMemo(() => {
    return typeMagics
      .filter(m => m.level <= targetLevel)
      .reduce((acc, m) => ({
        power: acc.power + (m.power || 0),
        agile: acc.agile + (m.agile || 0),
        intelligence: acc.intelligence + (m.intelligence || 0),
        life: acc.life + (m.life || 0),
        totalExp: acc.totalExp + (m.need_exp || 0),
        totalSilver: acc.totalSilver + (m.need_silver || 0),
        totalGold: acc.totalGold + (m.need_gold || 0),
      }), { power: 0, agile: 0, intelligence: 0, life: 0, totalExp: 0, totalSilver: 0, totalGold: 0 });
  }, [typeMagics, targetLevel]);

  const maxLevel = typeMagics.length > 0 ? Math.max(...typeMagics.map(m => m.level)) : 1;

  if (loading) return <LoadingState message="Loading culling tower databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
          <Swords size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Culling Tower Magic Optimizer</h1>
          <p className="text-sm text-muted">Analyze magic upgrade paths, stat bonuses, and training costs.</p>
        </div>
      </div>

      {/* Type Selector & Level */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Magic Type</label>
          <div className="flex gap-2">
            {magicTypes.map(type => (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setTargetLevel(0); }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${selectedType === type ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-bg text-muted hover:text-text'}`}
              >
                {MAGIC_TYPES[type] || `Type ${type}`}
              </button>
            ))}
          </div>
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
          <div className="text-xs text-subtle uppercase font-bold mb-1">Total EXP Needed</div>
          <div className="text-2xl font-black text-brand font-mono">{cumulativeStats.totalExp.toLocaleString()}</div>
        </div>
      </section>

      {statsAtLevel && (
        <>
          {/* Cumulative Stats */}
          <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
            <h3 className="font-bold text-text flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" />
              Cumulative Stats at Level {targetLevel}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Power', value: cumulativeStats.power, color: 'text-red-500' },
                { label: 'Agility', value: cumulativeStats.agile, color: 'text-emerald-500' },
                { label: 'Intelligence', value: cumulativeStats.intelligence, color: 'text-violet-500' },
                { label: 'Life', value: cumulativeStats.life, color: 'text-blue-500' },
              ].map((stat, idx) => (
                <div key={idx} className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                  <div className="text-[10px] text-subtle uppercase font-bold">{stat.label}</div>
                  <div className={`text-lg font-black font-mono ${stat.color}`}>+{stat.value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Cost Summary */}
          <section className="p-5 border border-border bg-surface rounded-xl shadow-sm">
            <h3 className="font-bold text-text flex items-center gap-2 mb-3">
              <Coins size={18} className="text-amber-500" />
              Training Costs to Level {targetLevel}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">EXP</div>
                <div className="text-lg font-black font-mono text-brand">{cumulativeStats.totalExp.toLocaleString()}</div>
              </div>
              <div className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">Silver</div>
                <div className="text-lg font-black font-mono text-amber-500">{cumulativeStats.totalSilver.toLocaleString()}</div>
              </div>
              <div className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">Gold</div>
                <div className="text-lg font-black font-mono text-yellow-500">{cumulativeStats.totalGold.toLocaleString()}</div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Upgrade Path Table */}
      <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2">
          <Swords size={18} className="text-indigo-500" />
          {MAGIC_TYPES[selectedType] || 'Unknown'} Magic Upgrade Path
        </h3>
        <div className="max-h-96 overflow-y-auto border border-border rounded-xl">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 bg-surface border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-bold text-subtle">Level</th>
                <th className="px-3 py-2 text-left font-bold text-subtle">EXP</th>
                <th className="px-3 py-2 text-left font-bold text-subtle">Silver</th>
                <th className="px-3 py-2 text-left font-bold text-subtle">Power</th>
                <th className="px-3 py-2 text-left font-bold text-subtle">AGI</th>
                <th className="px-3 py-2 text-left font-bold text-subtle">INT</th>
                <th className="px-3 py-2 text-left font-bold text-subtle">HP</th>
              </tr>
            </thead>
            <tbody>
              {typeMagics.map(m => (
                <tr
                  key={m.id}
                  className={`border-b border-border ${m.level === targetLevel ? 'bg-brand-soft' : 'hover:bg-bg/50'}`}
                >
                  <td className="px-3 py-2 font-mono font-bold text-text">Lv.{m.level}</td>
                  <td className="px-3 py-2 font-mono text-muted">{m.need_exp?.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-amber-500">{m.need_silver?.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-red-500">{m.power || '-'}</td>
                  <td className="px-3 py-2 font-mono text-emerald-500">{m.agile || '-'}</td>
                  <td className="px-3 py-2 font-mono text-violet-500">{m.intelligence || '-'}</td>
                  <td className="px-3 py-2 font-mono text-blue-500">{m.life || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
