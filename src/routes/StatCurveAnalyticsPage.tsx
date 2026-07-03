import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadHeroes } from '../data/loaders';
import { Hero } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getFactionLabel, getProfessionLabel } from '../data/relationships';
import { BarChart3, ArrowLeft, Swords, Sparkles, TrendingUp, ShieldAlert, Cpu } from 'lucide-react';

interface ClassAverages {
  label: string;
  count: number;
  avgPower: number;
  avgAgile: number;
  avgIntel: number;
  avgLife: number;
  avgSpeed: number;
  avgPowerGrow: number;
  avgAgileGrow: number;
  avgIntelGrow: number;
  avgLifeGrow: number;
  avgSpeedGrow: number;
}

export const StatCurveAnalyticsPage: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulation Level
  const [simLevel, setSimLevel] = useState<number>(80);

  // Group Type: 'profession' or 'faction'
  const [groupBy, setGroupBy] = useState<'profession' | 'faction'>('profession');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await loadHeroes();
      setHeroes(res.rows);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load database logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute averages
  const groupAverages = useMemo(() => {
    const groups: { [key: string]: Hero[] } = {};

    for (const h of heroes) {
      const key = groupBy === 'profession'
        ? getProfessionLabel(h.profession)
        : getFactionLabel(h.country);
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(h);
    }

    return Object.entries(groups).map(([label, list]) => {
      const count = list.length;
      const sum = (fn: (x: Hero) => number | null) => list.reduce((a, b) => a + (fn(b) ?? 0), 0);

      return {
        label,
        count,
        avgPower: sum(x => x.power) / count,
        avgAgile: sum(x => x.agile) / count,
        avgIntel: sum(x => x.intelligence) / count,
        avgLife: sum(x => x.life) / count,
        avgSpeed: sum(x => x.speed) / count,
        avgPowerGrow: sum(x => x.power_grow) / count,
        avgAgileGrow: sum(x => x.agile_grow) / count,
        avgIntelGrow: sum(x => x.intelligence_grow) / count,
        avgLifeGrow: sum(x => x.life_grow) / count,
        avgSpeedGrow: sum(x => x.speed_grow) / count,
      } as ClassAverages;
    }).sort((a, b) => b.count - a.count);
  }, [heroes, groupBy]);

  if (loading) return <LoadingState message="Summing character attribute indices and processing regression curves..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <div>
        <Link
          to="/heroes"
          className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-text dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Heroes</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 rounded-xl">
              <BarChart3 size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-text">Class Stat Curve Analytics</h1>
              <p className="text-xs text-muted font-semibold">Group character statistics by Profession or Faction and simulate growth coefficients at scale.</p>
            </div>
          </div>

          {/* Group and Level selectors */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1 border border-border bg-bg p-1 rounded-xl">
              <button
                onClick={() => setGroupBy('profession')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  groupBy === 'profession'
                    ? 'bg-fuchsia-600 text-white shadow-xs'
                    : 'text-muted hover:text-text dark:hover:text-zinc-250'
                }`}
              >
                By Class
              </button>
              <button
                onClick={() => setGroupBy('faction')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  groupBy === 'faction'
                    ? 'bg-fuchsia-600 text-white shadow-xs'
                    : 'text-muted hover:text-text dark:hover:text-zinc-250'
                }`}
              >
                By Faction
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-bold text-subtle uppercase whitespace-nowrap">Sim Target Level:</label>
              <input
                type="number"
                min="1"
                max="150"
                value={simLevel}
                onChange={(e) => setSimLevel(Math.max(1, Math.min(150, parseInt(e.target.value) || 1)))}
                className="w-16 px-2 py-1.5 border border-border bg-bg text-center font-mono font-bold rounded-xl text-text"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Averages Cards */}
      <div className="space-y-6">
        {groupAverages.map((group) => {
          // Calculate simulated stats at level `simLevel`
          const simPower = Math.round(group.avgPower + group.avgPowerGrow * (simLevel - 1));
          const simAgile = Math.round(group.avgAgile + group.avgAgileGrow * (simLevel - 1));
          const simIntel = Math.round(group.avgIntel + group.avgIntelGrow * (simLevel - 1));
          const simLife = Math.round(group.avgLife + group.avgLifeGrow * (simLevel - 1));
          const simSpeed = Math.round(group.avgSpeed + group.avgSpeedGrow * (simLevel - 1));

          return (
            <div
              key={group.label}
              className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-5"
            >
              {/* Header Title */}
              <div className="flex justify-between items-center border-b border-border pb-2.5">
                <div>
                  <h3 className="text-base font-extrabold text-text">{group.label}</h3>
                  <span className="text-[10px] text-subtle font-semibold">{group.count} heroes categorized in this group</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-800 dark:text-fuchsia-400 text-[10px] font-black uppercase">
                  Average Stats
                </span>
              </div>

              {/* Group stats comparison grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Base levels */}
                <div className="p-4 border border-border/80 bg-bg/20 dark:bg-bg/15 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-bold text-subtle uppercase tracking-wider flex items-center gap-1">
                    <Swords size={13} className="text-indigo-500" />
                    <span>Average Base Stats (Lv. 1)</span>
                  </h4>
                  <div className="space-y-1.5 text-xs font-mono font-bold text-muted">
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Power (STR)</span>
                      <span>{group.avgPower.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Agile (AGI)</span>
                      <span>{group.avgAgile.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Intelligence (INT)</span>
                      <span>{group.avgIntel.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Life (HP)</span>
                      <span>{group.avgLife.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Speed (SPD)</span>
                      <span>{group.avgSpeed.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Growth coefficients */}
                <div className="p-4 border border-border/80 bg-bg/20 dark:bg-bg/15 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-bold text-subtle uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp size={13} className="text-emerald-500" />
                    <span>Average Growth Multipliers</span>
                  </h4>
                  <div className="space-y-1.5 text-xs font-mono font-bold text-muted">
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Power Grow</span>
                      <span className="text-emerald-600">+{group.avgPowerGrow.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Agile Grow</span>
                      <span className="text-emerald-600">+{group.avgAgileGrow.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Intelligence Grow</span>
                      <span className="text-emerald-600">+{group.avgIntelGrow.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Life Grow</span>
                      <span className="text-emerald-600">+{group.avgLifeGrow.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Speed Grow</span>
                      <span className="text-emerald-600">+{group.avgSpeedGrow.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Simulated scaling levels */}
                <div className="p-4 border border-border/80 bg-fuchsia-500/5 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-bold text-subtle uppercase tracking-wider flex items-center gap-1">
                    <Cpu size={13} className="text-fuchsia-500" />
                    <span>Simulated Scaling (Lv. {simLevel})</span>
                  </h4>
                  <div className="space-y-1.5 text-xs font-mono font-bold text-fuchsia-700 dark:text-fuchsia-400">
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Power (STR)</span>
                      <span>{simPower.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Agile (AGI)</span>
                      <span>{simAgile.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Intelligence (INT)</span>
                      <span>{simIntel.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Life (HP)</span>
                      <span>{simLife.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle font-sans">Speed (SPD)</span>
                      <span>{simSpeed.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
