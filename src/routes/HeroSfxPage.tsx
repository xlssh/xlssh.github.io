import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadHeroes } from '../data/loaders';
import { Hero } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Volume2, ArrowLeft, Search, Swords, Activity, Zap, Play } from 'lucide-react';

interface FrameTrigger {
  frame: string;
  voiceId?: number;
  effectId?: number;
  targetDesc?: string;
  conditionDesc?: string;
  dashDesc?: string;
}

export const HeroSfxPage: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selector
  const [selectedHeroId, setSelectedHeroId] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await loadHeroes();
      setHeroes(res.rows);
      if (res.rows.length > 0) {
        setSelectedHeroId(res.rows[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load hero records.");
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
    return heroes.filter(h =>
      (h.name && h.name.toLowerCase().includes(query)) ||
      h.id.toString().includes(query)
    );
  }, [heroes, searchQuery]);

  const selectedHero = useMemo(() => {
    return heroes.find(h => h.id === selectedHeroId) || null;
  }, [heroes, selectedHeroId]);

  // Decode the animation frame timeline from attack_effect
  const skillsTimeline = useMemo(() => {
    if (!selectedHero || !selectedHero.attack_effect) return [];

    const effects = selectedHero.attack_effect as unknown as { [skillId: string]: any };
    
    return Object.entries(effects).map(([skillId, skillData]) => {
      const triggersMap: { [frame: string]: FrameTrigger } = {};

      const getOrCreate = (frm: string): FrameTrigger => {
        if (!triggersMap[frm]) {
          triggersMap[frm] = { frame: frm };
        }
        return triggersMap[frm];
      };

      // 1. Parse voices
      if (skillData.voice) {
        Object.entries(skillData.voice).forEach(([frm, voiceId]: [string, any]) => {
          const t = getOrCreate(frm);
          t.voiceId = Number(voiceId);
        });
      }

      // 2. Parse appendEffects
      if (skillData.appendEffect) {
        Object.entries(skillData.appendEffect).forEach(([frm, effectData]: [string, any]) => {
          const t = getOrCreate(frm);
          t.effectId = effectData.effectId;
          t.targetDesc = effectData.target === 1 ? "Self (Actor)" : effectData.target === 2 ? "Target (Enemy)" : `Target Type ${effectData.target}`;
          
          if (effectData.anmyhp) {
            const conditions = Object.entries(effectData.anmyhp)
              .map(([k, v]) => k === 'checkDie' ? "Trigger on death check" : `Trigger at HP ratio ${v}%`)
              .join(', ');
            t.conditionDesc = conditions;
          }
        });
      }

      // 3. Parse runPoint (dash forward)
      if (skillData.runPoint) {
        Object.entries(skillData.runPoint).forEach(([frm, val]: [string, any]) => {
          const t = getOrCreate(frm);
          t.dashDesc = `Dash forward to ${val.target === 2 ? "target close proximity" : "position"}`;
        });
      }

      // 4. Parse newPoint (dash offset)
      if (skillData.newPoint) {
        Object.entries(skillData.newPoint).forEach(([frm, val]: [string, any]) => {
          const t = getOrCreate(frm);
          t.dashDesc = `Dash offset to target alignment`;
        });
      }

      // 5. Parse backPoint (return to line)
      if (skillData.backPoint) {
        Object.entries(skillData.backPoint).forEach(([frm, val]: [string, any]) => {
          const t = getOrCreate(frm);
          t.dashDesc = `Dash return back to grid position`;
        });
      }

      const triggers = Object.values(triggersMap).sort((a, b) => Number(a.frame) - Number(b.frame));

      return {
        skillId,
        isNormal: Number(skillId) === selectedHero.normal_attack,
        triggers
      };
    });
  }, [selectedHero]);

  if (loading) return <LoadingState message="Deconstructing sound effect matrices and combat frame indexes..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
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
      <div className="p-6 md:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 rounded-xl">
            <Volume2 size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-text">Skill & Sound FX Board</h1>
            <p className="text-xs text-muted font-semibold">Inspect client sound assets and frame-by-frame skill timelines.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Selector */}
        <div className="xl:col-span-1 border border-border bg-surface p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-text border-b border-border pb-2.5">
            Select Character
          </h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search heroes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-border bg-bg focus:outline-none focus:ring-1.5 focus:ring-fuchsia-500 placeholder-zinc-400"
            />
            <Search size={14} className="absolute left-3.5 top-3.5 text-subtle" />
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredHeroes.map(h => (
              <button
                key={h.id}
                onClick={() => setSelectedHeroId(h.id)}
                className={`w-full p-3 text-left border rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                  selectedHeroId === h.id
                    ? 'border-fuchsia-500 bg-fuchsia-500/5 text-fuchsia-800 dark:text-fuchsia-400 font-bold'
                    : 'border-border hover:border-border-strong hover:bg-hover/50 text-muted'
                }`}
              >
                <div>
                  <span className="font-semibold block truncate">{h.name}</span>
                  <span className="text-[10px] text-subtle font-mono">ID: {h.id}</span>
                </div>
                <Volume2 size={14} className={selectedHeroId === h.id ? 'text-fuchsia-500' : 'text-subtle'} />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Timelines */}
        <div className="xl:col-span-2 space-y-6">
          {selectedHero && (
            <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-6">
              <div className="border-b border-border pb-3">
                <span className="text-[9px] font-mono text-subtle block font-bold">CHARACTER SELECTION</span>
                <h2 className="text-xl font-black text-text">{selectedHero.name}</h2>
              </div>

              {skillsTimeline.length === 0 ? (
                <div className="text-xs text-subtle italic text-center py-8">No skill or SFX assets linked to this character.</div>
              ) : (
                <div className="space-y-6">
                  {skillsTimeline.map(skill => (
                    <div
                      key={skill.skillId}
                      className="p-5 border border-border bg-bg/10 rounded-2xl space-y-4"
                    >
                      <h3 className="font-extrabold text-sm text-text flex items-center justify-between border-b border-border/80 pb-2">
                        <span className="flex items-center gap-2">
                          <Swords size={15} className="text-fuchsia-500" />
                          <span>Skill ID #{skill.skillId}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-800 dark:text-fuchsia-400 text-[9px] font-black uppercase">
                          {skill.isNormal ? "Normal Attack" : "Active Ability"}
                        </span>
                      </h3>

                      {/* Timeline flow */}
                      <div className="relative pl-6 space-y-5 before:absolute before:left-[9px] before:top-4 before:bottom-4 before:w-0.5 before:bg-surface-raised dark:before:bg-surface">
                        {skill.triggers.map(trigger => (
                          <div key={trigger.frame} className="relative space-y-2">
                            {/* Marker */}
                            <div className="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full border border-fuchsia-500 bg-surface flex items-center justify-center">
                              <div className="w-1 h-1 rounded-full bg-fuchsia-500" />
                            </div>

                            {/* Card */}
                            <div className="p-3 border border-border bg-surface rounded-xl shadow-xs space-y-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-black text-fuchsia-600 dark:text-fuchsia-400 font-mono">Frame {trigger.frame}</span>
                                {trigger.voiceId && (
                                  <button className="flex items-center gap-1 font-bold text-violet-600 dark:text-violet-450 hover:underline cursor-pointer">
                                    <Play size={10} />
                                    <span>Vocal #{trigger.voiceId}</span>
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-muted dark:text-zinc-350">
                                {trigger.effectId && (
                                  <div className="space-y-0.5 p-2 bg-bg/40 rounded-lg border border-border/40">
                                    <span className="block text-[8px] font-bold text-subtle uppercase">Visual SFX Asset</span>
                                    <span className="font-mono font-bold text-text dark:text-zinc-250">Effect ID: #{trigger.effectId}</span>
                                    <span className="block text-[9px] text-subtle">{trigger.targetDesc}</span>
                                    {trigger.conditionDesc && (
                                      <span className="block text-[9px] text-rose-500 font-semibold mt-0.5">{trigger.conditionDesc}</span>
                                    )}
                                  </div>
                                )}
                                {trigger.dashDesc && (
                                  <div className="space-y-0.5 p-2 bg-bg/40 rounded-lg border border-border/40 flex items-center gap-1.5">
                                    <Activity size={12} className="text-subtle shrink-0" />
                                    <div>
                                      <span className="block text-[8px] font-bold text-subtle uppercase">Motion Trigger</span>
                                      <span className="font-semibold text-text dark:text-zinc-250">{trigger.dashDesc}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
