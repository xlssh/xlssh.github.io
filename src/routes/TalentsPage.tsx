import React, { useEffect, useState, useMemo } from 'react';
import { loadHeroes, loadHeroTalents } from '../data/loaders';
import { Hero, HeroTalent } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Wand2, ShieldAlert, Sparkles, ChevronRight, User, Search, Swords } from 'lucide-react';

export const TalentsPage: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [talents, setTalents] = useState<HeroTalent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selector / Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHeroId, setSelectedHeroId] = useState<number | null>(null);

  // Simulator Level State
  const [talentLevel, setTalentLevel] = useState<number>(5);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [heroesRes, talentsRes] = await Promise.all([
        loadHeroes(),
        loadHeroTalents()
      ]);
      // Filter main/playable heroes
      setHeroes(heroesRes.rows.filter(h => h.name && h.talent));
      setTalents(talentsRes.rows);

      if (heroesRes.rows.length > 0) {
        const firstPlayable = heroesRes.rows.find(h => h.name && h.talent);
        if (firstPlayable) {
          setSelectedHeroId(firstPlayable.id);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load hero talents databases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredHeroes = useMemo(() => {
    if (!searchQuery.trim()) return heroes;
    const query = searchQuery.toLowerCase();
    return heroes.filter(h => h.name && h.name.toLowerCase().includes(query));
  }, [heroes, searchQuery]);

  const selectedHero = useMemo(() => {
    return heroes.find(h => h.id === selectedHeroId) || null;
  }, [heroes, selectedHeroId]);

  const heroTalent = useMemo(() => {
    if (!selectedHero) return null;
    return talents.find(t => t.id === selectedHero.talent) || null;
  }, [selectedHero, talents]);

  // Calculate simulated growth stats based on level
  const simulatedStats = useMemo(() => {
    if (!selectedHero) return null;
    const lvMultiplier = talentLevel;
    return {
      powerGrowGain: ((selectedHero.power_grow || 0) * lvMultiplier).toFixed(1),
      agileGrowGain: ((selectedHero.agile_grow || 0) * lvMultiplier).toFixed(1),
      intelGrowGain: ((selectedHero.intelligence_grow || 0) * lvMultiplier).toFixed(1),
      lifeGrowGain: ((selectedHero.life_grow || 0) * lvMultiplier).toFixed(1),
      speedGrowGain: ((selectedHero.speed_grow || 0) * lvMultiplier).toFixed(1)
    };
  }, [selectedHero, talentLevel]);

  if (loading) return <LoadingState message="Connecting to character soul cores and loading talent grids..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-2xl border border-border bg-surface shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Wand2 size={24} />
            <span className="text-xs font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded">Character Customization</span>
          </div>
          <h1 className="text-3xl font-black text-text">Hero Talent Planner & Simulator</h1>
          <p className="text-xs text-muted max-w-xl">
            Simulate talent points distribution, calculate customized stats growths, and inspect unique passive talent effects for Gotei 13 characters.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Heroes Selector */}
        <div className="xl:col-span-1 border border-border bg-surface p-5 rounded-2xl shadow-sm space-y-4 flex flex-col max-h-[750px]">
          <h3 className="font-extrabold text-sm text-text border-b border-border pb-2.5">
            Select Shinigami / Espada
          </h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search hero name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-border bg-bg focus:outline-none focus:ring-1.5 focus:ring-indigo-500 placeholder-zinc-400 text-text"
            />
            <Search size={14} className="absolute left-3.5 top-3.5 text-subtle" />
          </div>

          <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
            {filteredHeroes.map(h => (
              <button
                key={h.id}
                onClick={() => setSelectedHeroId(h.id)}
                className={`w-full p-3 text-left border rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                  selectedHeroId === h.id
                    ? 'border-indigo-500 bg-indigo-500/5 text-indigo-800 dark:text-indigo-400 font-bold'
                    : 'border-border hover:border-border-strong hover:bg-hover/50 text-muted'
                }`}
              >
                <div className="truncate pr-2">
                  <span className="font-semibold block truncate">{h.name}</span>
                  <span className="text-[10px] text-subtle">Profession Code: {h.profession}</span>
                </div>
                <span className="font-mono text-[9px] text-subtle shrink-0">#{h.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Talent tree visualizer and slider simulator */}
        <div className="xl:col-span-2 space-y-6">
          {selectedHero && (
            <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <User size={18} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text">{selectedHero.name}</h2>
                    <span className="text-[10px] text-subtle uppercase font-mono">Talent Code: #{selectedHero.talent}</span>
                  </div>
                </div>
                {heroTalent && (
                  <span className="px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 border border-indigo-200/30 text-xs font-black">
                    {heroTalent.talent_name}
                  </span>
                )}
              </div>

              {/* Slider for Talent Ranks */}
              <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-subtle uppercase">Talent Altar Rank Level</label>
                  <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">Rank {talentLevel} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={talentLevel}
                  onChange={(e) => setTalentLevel(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400"
                />
                <span className="block text-[10px] text-subtle italic">Adjust to calculate stat enhancements from growth multipliers.</span>
              </div>

              {/* Grid: Stat Multiplier growth calculator */}
              {simulatedStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-bg p-3 rounded-lg border border-border text-center flex flex-col">
                    <span className="text-[10px] font-bold text-subtle block uppercase mb-1">HP Grow</span>
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">+{simulatedStats.lifeGrowGain}</span>
                    <span className="text-[9px] text-subtle">Base: {selectedHero.life_grow}</span>
                  </div>
                  <div className="bg-bg p-3 rounded-lg border border-border text-center flex flex-col">
                    <span className="text-[10px] font-bold text-subtle block uppercase mb-1">Strength Grow</span>
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">+{simulatedStats.powerGrowGain}</span>
                    <span className="text-[9px] text-subtle">Base: {selectedHero.power_grow}</span>
                  </div>
                  <div className="bg-bg p-3 rounded-lg border border-border text-center flex flex-col">
                    <span className="text-[10px] font-bold text-subtle block uppercase mb-1">Agility Grow</span>
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">+{simulatedStats.agileGrowGain}</span>
                    <span className="text-[9px] text-subtle">Base: {selectedHero.agile_grow}</span>
                  </div>
                  <div className="bg-bg p-3 rounded-lg border border-border text-center flex flex-col">
                    <span className="text-[10px] font-bold text-subtle block uppercase mb-1">Intellect Grow</span>
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">+{simulatedStats.intelGrowGain}</span>
                    <span className="text-[9px] text-subtle">Base: {selectedHero.intelligence}</span>
                  </div>
                  <div className="bg-bg p-3 rounded-lg border border-border text-center flex flex-col">
                    <span className="text-[10px] font-bold text-subtle block uppercase mb-1">Speed Grow</span>
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">+{simulatedStats.speedGrowGain}</span>
                    <span className="text-[9px] text-subtle">Base: {selectedHero.speed_grow}</span>
                  </div>
                </div>
              )}

              {/* Talent Tree Diagram representation */}
              <div className="p-5 border border-border rounded-2xl space-y-4">
                <h4 className="font-bold text-xs uppercase text-subtle tracking-wider">Soul Core Talent Path</h4>
                <div className="flex flex-col items-center gap-6 py-4 relative">
                  {/* Vertical connector line */}
                  <div className="absolute top-10 bottom-10 w-0.5 bg-surface-raised z-0"></div>

                  {/* Node 1: Stat buff */}
                  <div className="z-10 bg-surface p-3 border-2 border-indigo-400/50 rounded-xl shadow text-center w-64">
                    <span className="text-[9px] uppercase font-bold text-indigo-500 block">Tier 1: Growth Augment</span>
                    <span className="text-xs font-semibold text-muted">
                      Proj. Attributes Multiplier: x{(1.0 + (talentLevel * 0.05)).toFixed(2)}
                    </span>
                  </div>

                  {/* Node 2: Faction buff */}
                  <div className="z-10 bg-surface p-3 border-2 border-purple-400/50 rounded-xl shadow text-center w-64">
                    <span className="text-[9px] uppercase font-bold text-purple-500 block">Tier 2: Spiritual Focus</span>
                    <span className="text-xs font-semibold text-muted">
                      Combat Pierce: +{(talentLevel * 1.5).toFixed(1)}% | Resist: +{(talentLevel * 1.2).toFixed(1)}%
                    </span>
                  </div>

                  {/* Node 3: Skill buff */}
                  <div className="z-10 bg-surface p-4 border-2 border-emerald-500 rounded-xl shadow text-center w-72">
                    <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-1">
                      <Sparkles size={14} />
                      <span className="text-[9px] uppercase font-bold">Tier 3: Core Soul Talent</span>
                    </div>
                    {heroTalent ? (
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-text">{heroTalent.talent_name}</span>
                        <p className="text-xs text-muted leading-relaxed">{heroTalent.talent_desc}</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-text">Basic Soul Boost</span>
                        <p className="text-xs text-muted">Unlocks custom weapon effects when character reaches star-up caps.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
