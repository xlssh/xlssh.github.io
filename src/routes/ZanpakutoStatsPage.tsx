import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadKnives, loadArticles, loadMallItems, loadHeroes, loadKnifeStrengthens, loadSkills } from '../data/loaders';
import { Knife, Article, MallItem, Hero, KnifeStrengthen, Skill } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getMallItemsSellingArticle, getAttributeName } from '../data/relationships';
import { Swords, ArrowLeft, BarChart3, HelpCircle, ShieldAlert, Cpu, Sparkles, Scale, Info, ShoppingCart, Check, Shield } from 'lucide-react';

export const ZanpakutoStatsPage: React.FC = () => {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [mallItems, setMallItems] = useState<MallItem[]>([]);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [strengthens, setStrengthens] = useState<KnifeStrengthen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skillsMap, setSkillsMap] = useState<Record<number, Skill>>({});

  // Comparison State
  const [compareIds, setCompareIds] = useState<number[]>([]);
  
  // Growth calculator State
  const [selectedKnifeId, setSelectedKnifeId] = useState<number>(0);
  const [refineLevel, setRefineLevel] = useState<number>(10);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [knivesRes, articlesRes, mallRes, heroesRes, strengthensRes, skillsRes] = await Promise.all([
        loadKnives(),
        loadArticles(),
        loadMallItems(),
        loadHeroes(),
        loadKnifeStrengthens(),
        loadSkills()
      ]);
      setKnives(knivesRes.rows);
      setArticles(articlesRes.rows);
      setMallItems(mallRes.rows);
      setHeroes(heroesRes.rows);
      setStrengthens(strengthensRes.rows);

      const skMap: Record<number, Skill> = {};
      skillsRes.rows.forEach((s: Skill) => {
        skMap[s.id] = s;
      });
      setSkillsMap(skMap);

      if (knivesRes.rows.length > 0) {
        setSelectedKnifeId(knivesRes.rows[0].id);
        // Pre-fill comparison list with first 2 knives
        setCompareIds([knivesRes.rows[0].id, knivesRes.rows[1]?.id].filter(Boolean));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load Zanpakuto stats database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedKnife = useMemo(() => {
    return knives.find(k => k.id === selectedKnifeId) || null;
  }, [knives, selectedKnifeId]);

  const knifePhases = useMemo(() => {
    if (!selectedKnife || !selectedKnife.active_effects) return [];
    return selectedKnife.active_effects
      .map(effId => strengthens.find(s => s.id === effId))
      .filter(Boolean) as KnifeStrengthen[];
  }, [selectedKnife, strengthens]);

  // Clean Zanpakuto Name helper
  const cleanName = (rawName: string | null) => {
    if (!rawName) return "Unknown Zanpakuto";
    return rawName.replace(/Picture Book/gi, '').replace(/Illustration/gi, '').trim();
  };

  const cleanHtml = (htmlStr: string) => {
    return htmlStr
      .replace(/<[^>]*>/g, '') // remove tags
      .replace(/&nbsp;/g, ' ')
      .trim();
  };

  // Compare List
  const comparedKnives = useMemo(() => {
    return compareIds.map(id => knives.find(k => k.id === id)).filter(Boolean) as Knife[];
  }, [compareIds, knives]);

  // Max stats for percentage visual scaling
  const maxStats = useMemo(() => {
    return {
      attack: Math.max(...knives.map(k => k.attack ?? 0), 1),
      defense: Math.max(...knives.map(k => k.defense ?? 0), 1),
      recovery: Math.max(...knives.map(k => k.recovery ?? 0), 1),
      resistance: Math.max(...knives.map(k => k.resistance ?? 0), 1),
      speed: Math.max(...knives.map(k => k.speed ?? 0), 1),
    };
  }, [knives]);

  // Toggle knife comparison selection
  const handleToggleCompare = (id: number) => {
    setCompareIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 3) {
        // limit to 3 knives maximum comparison
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  // Simulated Stats calculation
  const simulatedStats = useMemo(() => {
    if (!selectedKnife) return null;
    const baseAttack = selectedKnife.attack ?? 0;
    const baseDefense = selectedKnife.defense ?? 0;
    const baseRecovery = selectedKnife.recovery ?? 0;
    const baseResistance = selectedKnife.resistance ?? 0;
    const baseSpeed = selectedKnife.speed ?? 0;

    // growth value JSON array structure [atk_grow, def_grow, rec_grow, res_grow, spd_grow]
    const growth = selectedKnife.growth_value || [10, 5, 5, 5, 2];
    const gAtk = growth[0] ?? 10;
    const gDef = growth[1] ?? 5;
    const gRec = growth[2] ?? 5;
    const gRes = growth[3] ?? 5;
    const gSpd = growth[4] ?? 2;

    return {
      attack: baseAttack + gAtk * refineLevel,
      defense: baseDefense + gDef * refineLevel,
      recovery: baseRecovery + gRec * refineLevel,
      resistance: baseResistance + gRes * refineLevel,
      speed: baseSpeed + gSpd * refineLevel,
    };
  }, [selectedKnife, refineLevel]);

  if (loading) return <LoadingState message="Decoding Zanpakuto parameters and statistic curves..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Navigation */}
      <div>
        <Link
          to="/weapons/evolution"
          className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-text dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Zanpakuto Evolution</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 rounded-xl">
            <BarChart3 size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-text">Zanpakuto Stats & Comparison</h1>
            <p className="text-xs text-muted font-semibold">Analyze Zanpakuto stat curves, passive skill releases, and compare up to 3 blades side-by-side.</p>
          </div>
        </div>
      </div>

      {/* Grid: 1. Left Selector & Comparison Selector, 2. Right Stats Comparison, 3. bottom calculator */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Selector */}
        <div className="xl:col-span-1 border border-border bg-surface p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-text border-b border-border pb-2.5 flex items-center justify-between">
            <span>Select Blades (Max 3)</span>
            <span className="text-[10px] text-subtle font-bold">{compareIds.length}/3 selected</span>
          </h3>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {knives.map(k => {
              const selected = compareIds.includes(k.id);
              return (
                <button
                  key={k.id}
                  onClick={() => handleToggleCompare(k.id)}
                  className={`w-full p-3 text-left border rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                    selected
                      ? 'border-fuchsia-500 bg-fuchsia-500/5 text-fuchsia-800 dark:text-fuchsia-400 font-bold'
                      : 'border-border hover:border-border-strong hover:bg-hover/50 text-muted'
                  }`}
                >
                  <div>
                    <span className="font-semibold block truncate">{cleanName(k.name)}</span>
                    <span className="text-[10px] text-subtle font-mono">ATK: {k.attack} | SPD: {k.speed}</span>
                  </div>
                  <Scale size={14} className={selected ? 'text-fuchsia-500' : 'text-subtle'} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Comparative Dashboard */}
        <div className="xl:col-span-2 space-y-6">
          <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-6">
            <h3 className="font-extrabold text-sm text-text border-b border-border pb-3 flex items-center gap-2">
              <Scale size={16} className="text-fuchsia-500" />
              <span>Comparative Stats Matrix</span>
            </h3>

            {comparedKnives.length === 0 ? (
              <div className="text-xs text-subtle italic text-center py-16">
                Select Zanpakutos from the sidebar to inspect and compare their attributes.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {comparedKnives.map(knife => {
                  return (
                    <div
                      key={knife.id}
                      className="p-5 border border-border/80 bg-bg/15 dark:bg-bg/15 rounded-2xl space-y-4 shadow-xs"
                    >
                      <div>
                        <h4 className="font-extrabold text-base text-text truncate">
                          {cleanName(knife.name)}
                        </h4>
                        <span className="text-[9px] font-mono text-subtle">ID: {knife.id}</span>
                      </div>

                      {/* Stat Bars */}
                      <div className="space-y-3.5 text-xs">
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono font-bold">
                            <span className="text-subtle font-sans">Attack</span>
                            <span>{knife.attack}</span>
                          </div>
                          <div className="w-full bg-bg rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-rose-500 h-1.5 rounded-full"
                              style={{ width: `${((knife.attack ?? 0) / maxStats.attack) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between font-mono font-bold">
                            <span className="text-subtle font-sans">Defense</span>
                            <span>{knife.defense}</span>
                          </div>
                          <div className="w-full bg-bg rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${((knife.defense ?? 0) / maxStats.defense) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between font-mono font-bold">
                            <span className="text-subtle font-sans">Recovery</span>
                            <span>{knife.recovery}</span>
                          </div>
                          <div className="w-full bg-bg rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full"
                              style={{ width: `${((knife.recovery ?? 0) / maxStats.recovery) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between font-mono font-bold">
                            <span className="text-subtle font-sans">Resistance</span>
                            <span>{knife.resistance}</span>
                          </div>
                          <div className="w-full bg-bg rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-500 h-1.5 rounded-full"
                              style={{ width: `${((knife.resistance ?? 0) / maxStats.resistance) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between font-mono font-bold">
                            <span className="text-subtle font-sans">Speed</span>
                            <span>{knife.speed}</span>
                          </div>
                          <div className="w-full bg-bg rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-violet-500 h-1.5 rounded-full"
                              style={{ width: `${((knife.speed ?? 0) / maxStats.speed) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Passive Skill and Lore info */}
                      <div className="pt-3 border-t border-border space-y-2.5 text-[11px]">
                        <div className="space-y-0.5">
                          <span className="block text-[8px] font-bold text-subtle uppercase">Bind Skill ID</span>
                          <span className="font-bold text-muted font-mono flex items-center gap-1">
                            <Cpu size={11} className="text-fuchsia-500" />
                            <span>Passive #{knife.bind_skill_id}</span>
                          </span>
                        </div>
                        {knife.appraise && (
                          <div className="space-y-0.5">
                            <span className="block text-[8px] font-bold text-subtle uppercase">Appraisal Lore</span>
                            <p className="text-muted italic leading-relaxed">"{knife.appraise}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Stat Growth Simulator slider */}
      {selectedKnife && simulatedStats && (
        <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <h3 className="font-extrabold text-sm text-text flex items-center gap-2">
              <Sparkles size={16} className="text-fuchsia-500" />
              <span>Zanpakuto Growth Simulator</span>
            </h3>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-subtle uppercase whitespace-nowrap">Target Blade:</label>
              <select
                value={selectedKnifeId}
                onChange={(e) => setSelectedKnifeId(Number(e.target.value))}
                className="px-3 py-1.5 border border-border rounded-xl bg-bg text-xs font-bold text-text cursor-pointer"
              >
                {knives.map(k => (
                  <option key={k.id} value={k.id}>{cleanName(k.name)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Slider Control */}
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-muted">Refine Level</span>
                <span className="px-2 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-800 dark:text-fuchsia-400 font-mono font-bold">
                  +{refineLevel}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={refineLevel}
                onChange={(e) => setRefineLevel(Number(e.target.value))}
                className="w-full accent-fuchsia-600 bg-surface-raised h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-subtle font-mono">
                <span>+0 (Base)</span>
                <span>+50 (High)</span>
                <span>+100 (Max)</span>
              </div>
            </div>

            {/* Simulated Stats display */}
            <div className="grid grid-cols-5 gap-3 text-center">
              <div className="p-3 border border-border/80 bg-bg/20 rounded-xl space-y-1">
                <span className="block text-[8px] font-bold text-subtle uppercase">Attack</span>
                <span className="text-sm font-black text-rose-500 font-mono">{simulatedStats.attack}</span>
              </div>
              <div className="p-3 border border-border/80 bg-bg/20 rounded-xl space-y-1">
                <span className="block text-[8px] font-bold text-subtle uppercase">Defense</span>
                <span className="text-sm font-black text-blue-500 font-mono">{simulatedStats.defense}</span>
              </div>
              <div className="p-3 border border-border/80 bg-bg/20 rounded-xl space-y-1">
                <span className="block text-[8px] font-bold text-subtle uppercase">Recovery</span>
                <span className="text-sm font-black text-emerald-500 font-mono">{simulatedStats.recovery}</span>
              </div>
              <div className="p-3 border border-border/80 bg-bg/20 rounded-xl space-y-1">
                <span className="block text-[8px] font-bold text-subtle uppercase">Resistance</span>
                <span className="text-sm font-black text-amber-500 font-mono">{simulatedStats.resistance}</span>
              </div>
              <div className="p-3 border border-border/80 bg-bg/20 rounded-xl space-y-1">
                <span className="block text-[8px] font-bold text-subtle uppercase">Speed</span>
                <span className="text-sm font-black text-violet-500 font-mono">{simulatedStats.speed}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zanpakuto Release Phases & Strengthen Effects */}
      {selectedKnife && knifePhases.length > 0 && (
        <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-5 animate-fade-in">
          <h3 className="font-extrabold text-sm text-text border-b border-border pb-3 flex items-center gap-2">
            <Swords size={16} className="text-fuchsia-500" />
            <span>Zanpakutō Release Phases & Strengthen Effects (Shikai / Bankai)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {knifePhases.map((phase, idx) => {
              const phaseNames = ["Shikai Release", "Bankai Swastika Release", "Mugetsu / Final Burst Phase"];
              const phaseName = phaseNames[idx] || `Phase ${idx + 1}`;

              // Map allowed heroes
              const allowedHeroesList = phase.heros
                .map(heroId => heroes.find(h => h.id === heroId)?.name)
                .filter(Boolean) as string[];

              return (
                <div
                  key={phase.id}
                  className="p-5 border border-border/80 bg-bg/15 dark:bg-bg/15 rounded-2xl space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2 border-b border-border/60 pb-2">
                      <div>
                        <span className="text-[10px] font-mono text-subtle block font-bold">STRENGTHEN ID: {phase.id}</span>
                        <h4 className="font-black text-sm text-text">
                          {phaseName}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-800 dark:text-fuchsia-400 text-[10px] font-black uppercase">
                        Phase {idx + 1}
                      </span>
                    </div>

                    {/* Allowed Heroes */}
                    <div className="space-y-1">
                      <span className="block text-[9px] font-bold text-subtle uppercase">Allowed Wielders</span>
                      {allowedHeroesList.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {allowedHeroesList.map((name, hIdx) => (
                            <span
                              key={hIdx}
                              className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-semibold text-muted"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted italic block">All Heroes Eligible</span>
                      )}
                    </div>

                    {/* Stat adjustments */}
                    {phase.attributes && phase.attributes.length > 0 ? (
                      <div className="space-y-1.5 pt-2">
                        <span className="block text-[9px] font-bold text-subtle uppercase">Phase Attribute Buffs</span>
                        <div className="space-y-1">
                          {phase.attributes.map((attr, aIdx) => {
                            if (attr.oper === 0) {
                              const skill = skillsMap[attr.value];
                              const skillName = skill?.name || `Skill #${attr.value}`;
                              const skillDesc = skill?.description ? cleanHtml(skill.description) : 'Unlocks passive combat effects.';
                              return (
                                <div
                                  key={aIdx}
                                  className="py-1.5 border-b border-border/40 last:border-0 text-xs"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-fuchsia-600 dark:text-fuchsia-400 font-bold">{skillName}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-raised text-muted uppercase font-mono">Passive</span>
                                  </div>
                                  <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{skillDesc}</p>
                                </div>
                              );
                            }

                            const isPercent = attr.oper === 2 || (attr.oper === 1 && attr.value < 1);
                            const formattedValue = isPercent
                              ? `+${(attr.value * 100).toFixed(2)}%`
                              : `+${attr.value}`;

                            return (
                              <div
                                key={aIdx}
                                className="flex justify-between items-center text-xs py-1 border-b border-border/40 last:border-0"
                              >
                                <span className="text-subtle font-semibold">{getAttributeName(attr.type)}</span>
                                <span className="font-mono font-bold text-fuchsia-600 dark:text-fuchsia-400">{formattedValue}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted italic block">No custom attributes on this release phase.</span>
                    )}
                  </div>

                  {/* Effect ID and visual key */}
                  {phase.effect_ids && phase.effect_ids.length > 0 && (
                    <div className="pt-2 border-t border-border/60 text-[9px] font-mono text-subtle flex justify-between items-center">
                      <span>Visual Sfx IDs</span>
                      <span className="font-semibold text-muted">[{phase.effect_ids.join(', ')}]</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
