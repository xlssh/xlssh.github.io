import React, { useEffect, useState, useMemo } from 'react';
import { loadWeaponSkills, loadArticles, loadKnives } from '../data/loaders';
import { WeaponSkill, Article, Knife } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { 
  Swords, Search, Filter, ShieldCheck, Sparkles, Coins, HelpCircle, 
  RotateCcw, Lock, Unlock, Play, ListCollapse, Award, Compass
} from 'lucide-react';

const QUALITY_METADATA: Record<number, { label: string; color: string; ringColor: string; shadow: string }> = {
  1: { label: 'Common', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', ringColor: 'border-emerald-500/25', shadow: 'shadow-emerald-500/5' },
  2: { label: 'Rare', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20', ringColor: 'border-sky-500/25', shadow: 'shadow-sky-500/5' },
  3: { label: 'Epic', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20', ringColor: 'border-violet-500/25', shadow: 'shadow-violet-500/5' },
  4: { label: 'Legendary', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', ringColor: 'border-amber-500/25', shadow: 'shadow-amber-500/5' },
  5: { label: 'Mythic', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', ringColor: 'border-rose-500/25', shadow: 'shadow-rose-500/5' },
};

const APPRAISAL_COLORS: Record<string, string> = {
  'C': 'text-muted bg-zinc-500/10 border-zinc-500/20',
  'B': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  'A': 'text-sky-500 bg-sky-500/10 border-sky-500/20',
  'S': 'text-violet-500 bg-violet-500/10 border-violet-500/20',
  'SS': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
};

export const WeaponSkillsPage: React.FC = () => {
  const [skills, setSkills] = useState<WeaponSkill[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [knives, setKnives] = useState<Knife[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Directory UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');

  // Simulator States
  const [selectedZanpakutoId, setSelectedZanpakutoId] = useState<number | null>(null);
  const [slots, setSlots] = useState<Array<WeaponSkill | null>>([null, null, null]);
  const [lockedSlots, setLockedSlots] = useState<boolean[]>([false, false, false]);

  // Simulated Stats counters
  const [simulatedCosts, setSimulatedCosts] = useState({
    silver: 0,
    shards: 0,
    forges: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [skillsRes, articlesRes, knivesRes] = await Promise.all([
        loadWeaponSkills(),
        loadArticles(),
        loadKnives()
      ]);
      setSkills(skillsRes.rows.sort((a, b) => b.skill_quality - a.skill_quality));
      setArticles(articlesRes.rows);
      
      const sortedKnives = knivesRes.rows.sort((a, b) => a.id - b.id);
      setKnives(sortedKnives);

      if (sortedKnives.length > 0) {
        setSelectedZanpakutoId(sortedKnives[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load Weapon Skills and Zanpakuto databases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeKnife = useMemo(() => {
    return knives.find(k => k.id === selectedZanpakutoId) || null;
  }, [knives, selectedZanpakutoId]);

  // Filter skills directory
  const filteredSkills = useMemo(() => {
    let result = skills;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
    }
    if (selectedQuality !== 'all') {
      result = result.filter(s => s.skill_quality === parseInt(selectedQuality));
    }
    return result;
  }, [skills, searchQuery, selectedQuality]);

  // Roll single skill based on Smithy probability
  const rollSkillByProbability = (): WeaponSkill => {
    const roll = Math.random() * 100;
    let targetQuality = 1; // Default common

    if (roll < 2) {
      targetQuality = 5; // Mythic (2%)
    } else if (roll < 8) {
      targetQuality = 4; // Legendary (6%)
    } else if (roll < 23) {
      targetQuality = 3; // Epic (15%)
    } else if (roll < 58) {
      targetQuality = 2; // Rare (35%)
    } else {
      targetQuality = 1; // Common (42%)
    }

    const pool = skills.filter(s => s.skill_quality === targetQuality);
    if (pool.length === 0) return skills[0];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // Run the Forge refinement
  const handleRefine = () => {
    if (skills.length === 0) return;

    // Calculate simulated cost based on locked count
    const numLocked = lockedSlots.filter(Boolean).length;
    if (numLocked === 3) {
      alert("All slots are locked! Unlock at least one slot to refine new skills.");
      return;
    }

    let silverCost = 2000; // Base cost 2000 Silver
    let shardCost = 0;

    if (numLocked === 1) {
      silverCost = 10000;
      shardCost = 1;
    } else if (numLocked === 2) {
      silverCost = 45000;
      shardCost = 5;
    }

    // Roll new skills for unlocked slots
    const newSlots = slots.map((s, idx) => {
      if (lockedSlots[idx]) return s; // Keep locked
      return rollSkillByProbability();
    });

    setSlots(newSlots);
    setSimulatedCosts(prev => ({
      silver: prev.silver + silverCost,
      shards: prev.shards + shardCost,
      forges: prev.forges + 1
    }));
  };

  // Reset simulator
  const handleResetSimulator = () => {
    setSlots([null, null, null]);
    setLockedSlots([false, false, false]);
    setSimulatedCosts({ silver: 0, shards: 0, forges: 0 });
  };

  const toggleSlotLock = (idx: number) => {
    setLockedSlots(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  if (loading) return <LoadingState message="Connecting to Smithy forge databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-brand-soft border border-brand/20 rounded-3xl p-8 shadow-sm">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-soft border border-brand/20 text-brand rounded-full text-xs font-semibold uppercase tracking-wider">
            <Swords size={13} />
            Weapon Refinement
          </div>
          <div className="space-y-2 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-text">
              Zanpakuto Weapon Skill <span className="text-brand">Smithy Forge</span>
            </h1>
            <p className="text-muted text-sm sm:text-base leading-relaxed">
              Explore the database of 80 unique Zanpakuto Weapon Skills, and test your luck on 
              the Forge Refinement simulator. Lock slots, calculate Silver/Shard costs, and construct 
              your ultimate weapon modifiers.
            </p>
          </div>
        </div>
      </div>

      {/* Simulator Section */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Simulator Column */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-brand" />
                <h2 className="font-bold text-text text-lg tracking-tight">Smithy Skill Forge Board</h2>
              </div>
              <button
                onClick={handleResetSimulator}
                className="px-3 py-1.5 bg-bg hover:bg-hover border border-border hover:border-border-strong text-muted hover:text-text rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                Reset Forge
              </button>
            </div>

            {/* Selector For Zanpakuto */}
            <div className="space-y-2">
              <label className="text-[10px] text-muted uppercase font-semibold">Select Weapon Base ({knives.length} Zanpakutos registered)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1 border border-border/60 rounded-xl p-3 bg-bg/20">
                {knives.map((wp) => {
                  const appraisalVal = wp.appraise || 'C';
                  const badgeColor = APPRAISAL_COLORS[appraisalVal] || 'text-muted bg-zinc-500/10 border-zinc-500/20';

                  return (
                    <button
                      key={wp.id}
                      onClick={() => {
                        setSelectedZanpakutoId(wp.id);
                        // Clear slots to let them reroll on a fresh weapon
                        setSlots([null, null, null]);
                      }}
                      className={`p-2.5 border rounded-xl flex items-center justify-between gap-1.5 transition-all cursor-pointer text-left ${
                        selectedZanpakutoId === wp.id
                          ? 'bg-brand-soft border-brand text-brand shadow-sm'
                          : 'bg-surface border-border hover:bg-hover text-muted hover:text-text'
                      }`}
                    >
                      <span className="text-xs font-bold truncate flex-1">{wp.name}</span>
                      <span className={`px-1.5 py-0.5 border rounded text-[9px] font-extrabold font-mono shrink-0 ${badgeColor}`}>
                        {appraisalVal}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Zanpakuto Details HUD */}
            {activeKnife && (
              <div className="p-4 bg-bg rounded-xl border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-text text-sm tracking-tight">{activeKnife.name} Specifications</h4>
                  <p className="text-muted text-[11px] leading-relaxed max-w-md">
                    {activeKnife.get_road || 'Standard smithy forge weapon.'}
                  </p>
                </div>
                
                {/* Stats */}
                <div className="flex gap-4 text-center shrink-0">
                  <div className="px-3 py-1.5 bg-surface border border-border rounded-lg">
                    <span className="text-[9px] text-muted uppercase font-bold block">Attack</span>
                    <span className="text-xs font-black text-text font-mono">+{activeKnife.attack}</span>
                  </div>
                  <div className="px-3 py-1.5 bg-surface border border-border rounded-lg">
                    <span className="text-[9px] text-muted uppercase font-bold block">Defense</span>
                    <span className="text-xs font-black text-text font-mono">+{activeKnife.defense}</span>
                  </div>
                  <div className="px-3 py-1.5 bg-surface border border-border rounded-lg">
                    <span className="text-[9px] text-muted uppercase font-bold block">Speed</span>
                    <span className="text-xs font-black text-text font-mono">+{activeKnife.speed}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sockets Container */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {slots.map((slot, idx) => {
                const meta = slot ? (QUALITY_METADATA[slot.skill_quality] || { label: 'Unknown', color: 'bg-zinc-500/10 text-muted border-zinc-500/20', ringColor: 'border-zinc-500/25', shadow: 'shadow-zinc-500/5' }) : null;
                const isLocked = lockedSlots[idx];

                return (
                  <div 
                    key={`slot-${idx}`} 
                    className={`relative border rounded-2xl p-5 flex flex-col justify-between h-[200px] transition-all bg-bg ${
                      isLocked 
                        ? 'border-brand/40 bg-brand-soft/20 shadow-inner' 
                        : meta 
                          ? `${meta.ringColor} ${meta.shadow} bg-surface` 
                          : 'border-border border-dashed'
                    }`}
                  >
                    {/* Socket Header Label */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted uppercase font-bold">Slot {idx + 1}</span>
                      <button
                        disabled={!slot}
                        onClick={() => toggleSlotLock(idx)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          !slot 
                            ? 'text-subtle dark:text-text border-transparent cursor-not-allowed' 
                            : isLocked 
                              ? 'bg-brand text-white border-brand' 
                              : 'bg-surface hover:bg-hover border-border text-muted hover:text-text cursor-pointer'
                        }`}
                        title={isLocked ? "Unlock slot" : "Lock slot (increases forge cost)"}
                      >
                        {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                      </button>
                    </div>

                    {/* Socket Body Info */}
                    {slot ? (
                      <div className="space-y-1.5 pt-4">
                        <span className={`px-2 py-0.5 border text-[10px] font-semibold rounded-md ${meta?.color}`}>
                          {meta?.label}
                        </span>
                        <h4 className="font-bold text-text text-sm tracking-tight line-clamp-1">
                          {slot.name}
                        </h4>
                        <p className="text-muted text-[11px] leading-relaxed line-clamp-3">
                          {slot.desc}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-6 space-y-2">
                        <HelpCircle size={22} className="text-muted/60 mx-auto" />
                        <span className="text-[11px] text-muted inline-block">Empty slot. Refine below to forge.</span>
                      </div>
                    )}

                    {/* Bottom stats/lock notice */}
                    <div className="pt-2 text-[9px] text-muted border-t border-border/40 mt-3 flex justify-between">
                      <span>Status: {slot ? (isLocked ? 'Locked' : 'Unlocked') : 'Empty'}</span>
                      {isLocked && <span className="text-brand font-bold uppercase tracking-wider">Locked</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Controls Bar */}
            <div className="bg-bg border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="text-xs text-muted space-y-0.5">
                <div className="font-semibold text-text">Refinement Silver Cost Formula:</div>
                <div className="font-mono">
                  {lockedSlots.filter(Boolean).length === 0 && "3 Open: 2,000 Silver"}
                  {lockedSlots.filter(Boolean).length === 1 && "1 Locked: 10,000 Silver + 1 Shard"}
                  {lockedSlots.filter(Boolean).length === 2 && "2 Locked: 45,000 Silver + 5 Shards"}
                </div>
              </div>

              <button
                onClick={handleRefine}
                disabled={lockedSlots.filter(Boolean).length === 3}
                className="w-full sm:w-auto px-6 py-3 bg-brand hover:bg-brand-hover disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 justify-center cursor-pointer disabled:pointer-events-none"
              >
                <Play size={13} fill="white" />
                Refine Sockets
              </button>
            </div>
          </div>
        </div>

        {/* Right Cost-Calculator Stats Column */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Coins size={18} className="text-brand" />
              <h2 className="font-bold text-text text-lg tracking-tight">Simulated Costs spent</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-bg rounded-xl p-4 border border-border space-y-0.5 text-center">
                  <span className="text-[10px] text-muted uppercase font-semibold">Refinements</span>
                  <div className="text-lg font-black text-text font-mono">{simulatedCosts.forges}</div>
                </div>

                <div className="bg-bg rounded-xl p-4 border border-border space-y-0.5 text-center col-span-2">
                  <span className="text-[10px] text-muted uppercase font-semibold">Total Silver spent</span>
                  <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
                    {simulatedCosts.silver.toLocaleString()} Silver
                  </div>
                </div>
              </div>

              <div className="bg-bg rounded-xl p-4 border border-border flex justify-between items-center">
                <span className="text-[10px] text-muted uppercase font-semibold">Refinement Shards spent</span>
                <span className="text-lg font-black text-violet-500 font-mono">
                  {simulatedCosts.shards} Shards
                </span>
              </div>
            </div>

            {/* Cumulative Attributes modifiers from Sockets */}
            <div className="border-t border-border pt-6 space-y-4">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-brand" />
                <h3 className="font-bold text-text text-xs uppercase tracking-wider">Simulated Modifiers Cumulative Output</h3>
              </div>

              {slots.filter(Boolean).length === 0 ? (
                <p className="text-muted text-xs leading-relaxed">
                  No attributes modifications unlocked. Refine sockets to see cumulative percentage modifiers outputs.
                </p>
              ) : (
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {slots.map((slot, idx) => {
                    if (!slot) return null;
                    const meta = QUALITY_METADATA[slot.skill_quality] || { label: 'Unknown', color: 'bg-zinc-500/10 text-muted border-zinc-500/20', ringColor: 'border-zinc-500/25', shadow: 'shadow-zinc-500/5' };
                    return (
                      <div key={`stat-out-${idx}`} className="flex justify-between items-center text-xs p-2.5 bg-bg border border-border rounded-xl">
                        <span className="font-semibold text-text truncate pr-4">{slot.name}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-md shrink-0 ${meta.color}`}>
                          Slot {idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Directory Section */}
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <ListCollapse size={18} className="text-brand" />
            <h2 className="font-bold text-text text-lg tracking-tight">Weapon Skill Smithy Directory</h2>
          </div>
          <span className="text-muted text-sm">{filteredSkills.length} entries registered</span>
        </div>

        {/* Directory Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-border pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 text-subtle" size={15} />
            <input
              type="text"
              placeholder="Search skill name or attribute..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg border border-border hover:border-border-strong focus:border-brand text-text rounded-xl py-2.5 pl-9 pr-4 text-xs transition-all focus:outline-none"
            />
          </div>

          <div>
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              className="w-full bg-bg border border-border hover:border-border-strong focus:border-brand text-text rounded-xl py-2.5 px-4 text-xs focus:outline-none"
            >
              <option value="all">All Qualities</option>
              <option value="1">Common (Green)</option>
              <option value="2">Rare (Blue)</option>
              <option value="3">Epic (Purple)</option>
              <option value="4">Legendary (Gold)</option>
              <option value="5">Mythic (Red)</option>
            </select>
          </div>
        </div>

        {/* Skills List grid */}
        {filteredSkills.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <HelpCircle size={24} className="text-subtle mx-auto" />
            <p className="text-muted text-xs">No registered weapon skills match your query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredSkills.map(s => {
              const meta = QUALITY_METADATA[s.skill_quality] || { label: 'Unknown', color: 'bg-zinc-500/10 text-muted border-zinc-500/20', ringColor: 'border-zinc-500/25', shadow: 'shadow-zinc-500/5' };
              return (
                <div 
                  key={s.id} 
                  className={`border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 bg-bg/50 hover:bg-hover hover:border-brand-soft shadow-sm group ${meta.ringColor}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 border text-[10px] font-semibold rounded-md ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-[9px] text-subtle font-mono font-bold">
                        ID: {s.id}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-text group-hover:text-brand transition-colors text-sm truncate">
                        {s.name}
                      </h4>
                      <p className="text-muted text-[11px] leading-relaxed line-clamp-3">
                        {s.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/40 mt-4 text-[9px] text-subtle flex justify-between items-center">
                    <span>Zanpakuto Modifier</span>
                    <div className="flex items-center gap-1">
                      <Award size={10} className="text-brand" />
                      <span>Refinement</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
