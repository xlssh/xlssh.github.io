import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadHeroes } from '../data/loaders';
import { Hero } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getProfessionLabel } from '../data/relationships';
import { getQualityColorClass, getQualityLabel } from './HeroesPage';
import { ArrowLeft, Swords, Sparkles, Scale, AlertCircle, ChevronDown } from 'lucide-react';

export const HeroComparisonPage: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Hero IDs
  const [hero1Id, setHero1Id] = useState<number>(0);
  const [hero2Id, setHero2Id] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await loadHeroes();
      setHeroes(res.rows);
      if (res.rows.length >= 2) {
        setHero1Id(res.rows[0].id);
        setHero2Id(res.rows[1].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load character rosters.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const hero1 = useMemo(() => heroes.find(h => h.id === hero1Id) || null, [heroes, hero1Id]);
  const hero2 = useMemo(() => heroes.find(h => h.id === hero2Id) || null, [heroes, hero2Id]);

  // Comparison utility returning styling based on value comparison
  const compareValues = (v1: number | undefined | null, v2: number | undefined | null, higherIsBetter = true) => {
    const val1 = v1 ?? 0;
    const val2 = v2 ?? 0;
    if (val1 === val2) return { textClass: 'text-muted', suffix: '' };
    if (higherIsBetter) {
      return val1 > val2
        ? { textClass: 'text-emerald-600 dark:text-emerald-400 font-bold', suffix: '▲' }
        : { textClass: 'text-rose-600 dark:text-rose-455 font-bold', suffix: '▼' };
    } else {
      return val1 < val2
        ? { textClass: 'text-emerald-600 dark:text-emerald-400 font-bold', suffix: '▲' }
        : { textClass: 'text-rose-600 dark:text-rose-455 font-bold', suffix: '▼' };
    }
  };

  const statMetrics = [
    { key: 'power', label: 'Power (STR)', desc: 'Influences physical attack power multiplier' },
    { key: 'agile', label: 'Agile (AGI)', desc: 'Influences action speed and critical strike probability' },
    { key: 'intelligence', label: 'Intelligence (INT)', desc: 'Influences tactical magic attack and defense' },
    { key: 'life', label: 'Life (HP)', desc: 'Total health point capacity pool' },
    { key: 'speed', label: 'Speed (SPD)', desc: 'Determines turn queue priority execution' },
  ];

  const growthMetrics = [
    { key: 'power_grow', label: 'Power Growth' },
    { key: 'agile_grow', label: 'Agile Growth' },
    { key: 'intelligence_grow', label: 'Intelligence Growth' },
    { key: 'life_grow', label: 'Life Growth' },
    { key: 'speed_grow', label: 'Speed Growth' },
  ];

  const rateMetrics = [
    { key: 'hit_rate', label: 'Hit Rate' },
    { key: 'dodge_rate', label: 'Dodge Rate' },
    { key: 'crit_rate', label: 'Crit Rate' },
    { key: 'block_rate', label: 'Block Rate' },
    { key: 'punch_rate', label: 'Punch Rate' },
    { key: 'help_rate', label: 'Help Rate' },
    { key: 'hurt_rate', label: 'Hurt Rate', invert: true }, // Lower hurt rate is better
    { key: 'avoid_hurt_rate', label: 'Avoid Hurt Rate' },
    { key: 'wreck_rate', label: 'Wreck Rate' },
    { key: 'antiknock_rate', label: 'Anti-knock Rate' },
    { key: 'attach_rate', label: 'Attach Rate' },
    { key: 'defense_rate', label: 'Defense Rate' },
    { key: 'recover_rate', label: 'Recover Rate' },
  ];

  if (loading) return <LoadingState message="Extracting characters and aligning growth matrices..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (heroes.length < 2) {
    return (
      <div className="p-8 text-center bg-surface rounded-2xl border border-border space-y-4">
        <AlertCircle className="mx-auto text-amber-500" size={48} />
        <h3 className="text-lg font-bold text-text">Insufficient Data</h3>
        <p className="text-sm text-muted">Requires at least 2 characters in the local cache to execute a comparison matrix.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/heroes"
          className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-text dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Hero Roster</span>
        </Link>
      </div>

      {/* Main Title Banner */}
      <div className="p-6 md:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl">
            <Scale size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-text">Mercenary Comparison Matrix</h1>
            <p className="text-xs text-muted">Side-by-side growth analytics, secondary rates, and tactical scaling coefficients.</p>
          </div>
        </div>
      </div>

      {/* Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Selector Card 1 */}
        <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4 relative">
          <span className="absolute top-4 right-4 text-[9px] font-bold text-subtle uppercase tracking-widest">Subject Alpha</span>
          <label className="block text-xs font-bold uppercase tracking-wider text-subtle">Select Character A</label>
          <div className="relative">
            <select
              value={hero1Id}
              onChange={(e) => setHero1Id(parseInt(e.target.value))}
              className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-border bg-bg focus:outline-none focus:ring-1.5 focus:ring-violet-500 font-bold text-text appearance-none cursor-pointer"
            >
              {heroes.map(h => (
                <option key={h.id} value={h.id}>{h.name} (Lv. {h.need_level ?? 1})</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-subtle pointer-events-none" />
          </div>
          {hero1 && (
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getQualityColorClass(hero1.quality as number)}`}>
                {getQualityLabel(hero1.quality as number)}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-surface-raised text-muted rounded">
                {getProfessionLabel(hero1.profession)}
              </span>

            </div>
          )}
        </div>

        {/* Selector Card 2 */}
        <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4 relative">
          <span className="absolute top-4 right-4 text-[9px] font-bold text-subtle uppercase tracking-widest">Subject Beta</span>
          <label className="block text-xs font-bold uppercase tracking-wider text-subtle">Select Character B</label>
          <div className="relative">
            <select
              value={hero2Id}
              onChange={(e) => setHero2Id(parseInt(e.target.value))}
              className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-border bg-bg focus:outline-none focus:ring-1.5 focus:ring-violet-500 font-bold text-text appearance-none cursor-pointer"
            >
              {heroes.map(h => (
                <option key={h.id} value={h.id}>{h.name} (Lv. {h.need_level ?? 1})</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-subtle pointer-events-none" />
          </div>
          {hero2 && (
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getQualityColorClass(hero2.quality as number)}`}>
                {getQualityLabel(hero2.quality as number)}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-surface-raised text-muted rounded">
                {getProfessionLabel(hero2.profession)}
              </span>

            </div>
          )}
        </div>
      </div>

      {hero1 && hero2 && (
        <div className="grid grid-cols-1 gap-6">
          {/* Base Stats Compare Matrix */}
          <div className="border border-border bg-surface rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-bg/50 flex items-center gap-2">
              <Swords size={18} className="text-violet-500" />
              <h3 className="font-bold text-sm text-text">Base Attribute Comparisons</h3>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {statMetrics.map(m => {
                const val1 = (hero1 as any)[m.key] as number;
                const val2 = (hero2 as any)[m.key] as number;
                const compare1 = compareValues(val1, val2);
                const compare2 = compareValues(val2, val1);
                
                // Magnitude bars
                const maxVal = Math.max(val1, val2, 100);
                const barWidth1 = `${(val1 / maxVal) * 100}%`;
                const barWidth2 = `${(val2 / maxVal) * 100}%`;

                return (
                  <div key={m.key} className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 items-center gap-4 text-xs">
                    {/* Stat descriptor */}
                    <div className="space-y-1">
                      <span className="font-bold text-text text-sm block">{m.label}</span>
                      <span className="text-[10px] text-subtle block">{m.desc}</span>
                    </div>

                    {/* Hero 1 value */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-muted font-semibold">{hero1.name}</span>
                        <span className={compare1.textClass}>{val1.toLocaleString()} {compare1.suffix}</span>
                      </div>
                      <div className="h-2 w-full bg-bg rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: barWidth1 }}></div>
                      </div>
                    </div>

                    {/* Hero 2 value */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-muted font-semibold">{hero2.name}</span>
                        <span className={compare2.textClass}>{val2.toLocaleString()} {compare2.suffix}</span>
                      </div>
                      <div className="h-2 w-full bg-bg rounded-full overflow-hidden">
                        <div className="h-full bg-fuchsia-500 rounded-full transition-all" style={{ width: barWidth2 }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Growth Stat Matrix */}
          <div className="border border-border bg-surface rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-bg/50 flex items-center gap-2">
              <Sparkles size={18} className="text-violet-500" />
              <h3 className="font-bold text-sm text-text">Growth Rate Matrix</h3>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {growthMetrics.map(m => {
                const val1 = (hero1 as any)[m.key] as number;
                const val2 = (hero2 as any)[m.key] as number;
                const compare1 = compareValues(val1, val2);
                const compare2 = compareValues(val2, val1);

                return (
                  <div key={m.key} className="p-4 grid grid-cols-3 text-center text-xs font-mono">
                    <span className="font-sans font-bold text-muted text-left pl-2">{m.label}</span>
                    <span className={compare1.textClass}>{val1} {compare1.suffix}</span>
                    <span className={compare2.textClass}>{val2} {compare2.suffix}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Secondary Combat Rates */}
          <div className="border border-border bg-surface rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-bg/50 flex items-center gap-2">
              <Scale size={18} className="text-violet-500" />
              <h3 className="font-bold text-sm text-text">Combat Trigger Probabilities (Secondary Rates)</h3>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {rateMetrics.map(m => {
                const val1 = (hero1 as any)[m.key] as number;
                const val2 = (hero2 as any)[m.key] as number;
                const compare1 = compareValues(val1, val2, !m.invert);
                const compare2 = compareValues(val2, val1, !m.invert);

                return (
                  <div key={m.key} className="p-4 grid grid-cols-3 text-center text-xs font-mono">
                    <span className="font-sans font-bold text-muted text-left pl-2">{m.label}</span>
                    <span className={compare1.textClass}>{val1}% {compare1.suffix}</span>
                    <span className={compare2.textClass}>{val2}% {compare2.suffix}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
