import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadArticles, loadMallItems, loadDailyQuests, loadStoryQuests, loadStages, loadKnives, loadKnifeExpands, loadSkills } from '../data/loaders';
import { Article, MallItem, DailyQuest, StoryQuest, Stage, Knife, KnifeExpand, Skill } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getStagesAwardingArticle, getQuestsAwardingArticle, getMallItemsSellingArticle, getAttributeName } from '../data/relationships';
import { Swords, ArrowLeft, ShieldAlert, Zap, RefreshCw, Cpu, Award, ShoppingCart, HelpCircle, Target, Sparkles } from 'lucide-react';
import { getQualityColorClass } from './HeroesPage';

interface EvolutionStage {
  levelName: string;
  levelNum: number;
  reqLevel: number;
  costGold: number;
  pelletsRequired: number;
  handbooksRequired: number;
  statBonus: string;
  skill?: Skill;
  expand?: KnifeExpand;
}

export const ZanpakutoEvolutionPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [mallItems, setMallItems] = useState<MallItem[]>([]);
  const [storyQuests, setStoryQuests] = useState<StoryQuest[]>([]);
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [knives, setKnives] = useState<Knife[]>([]);
  const [knifeExpands, setKnifeExpands] = useState<KnifeExpand[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Zanpakuto Picture Book ID
  const [selectedBookId, setSelectedBookId] = useState<number>(0);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [selectedTabLevel, setSelectedTabLevel] = useState<number>(2);

  // Evolution simulation state
  const [simulatedExp, setSimulatedExp] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [artRes, mallRes, dailyRes, storyRes, stagesRes, knivesRes, expandsRes, skillsRes] = await Promise.all([
        loadArticles(),
        loadMallItems(),
        loadDailyQuests(),
        loadStoryQuests(),
        loadStages(),
        loadKnives(),
        loadKnifeExpands(),
        loadSkills()
      ]);

      // Filter for actual Zanpakuto Picture Books / Illustrations (minor_type === 77)
      const books = artRes.rows.filter(a => a.minor_type === 77);
      setArticles(books);
      setMallItems(mallRes.rows);
      setStoryQuests(storyRes.rows);
      setDailyQuests(dailyRes.rows);
      setStages(stagesRes.rows);
      setKnives(knivesRes.rows);
      setKnifeExpands(expandsRes.rows);
      setSkills(skillsRes.rows);

      if (books.length > 0) {
        setSelectedBookId(books[0].id);
      }
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

  const selectedBook = useMemo(() => {
    return articles.find(a => a.id === selectedBookId) || null;
  }, [articles, selectedBookId]);

  // Map selected book to Knife record
  const matchedKnife = useMemo(() => {
    if (!selectedBook) return null;
    return knives.find(k => k.handbook_id === selectedBook.id) || null;
  }, [knives, selectedBook]);

  // Pull dynamic levels from expands catalog
  const matchedExpands = useMemo(() => {
    if (!matchedKnife) return [];
    return knifeExpands
      .filter(ke => ke.relation_id === matchedKnife.id)
      .sort((a, b) => a.level - b.level);
  }, [knifeExpands, matchedKnife]);

  // Clean Zanpakuto Name (remove "Picture Book" or "Illustration")
  const zanpakutoName = useMemo(() => {
    if (matchedKnife && matchedKnife.name) return matchedKnife.name;
    if (!selectedBook || !selectedBook.name) return "Unknown Zanpakuto";
    return selectedBook.name
      .replace(/Picture Book/gi, '')
      .replace(/Illustration/gi, '')
      .trim();
  }, [selectedBook, matchedKnife]);

  // Query sources for the picture book
  const bookSources = useMemo(() => {
    if (!selectedBookId) return { stages: [], quests: { story: [], daily: [] }, shops: [] };
    return {
      stages: getStagesAwardingArticle(stages, selectedBookId),
      quests: getQuestsAwardingArticle(storyQuests, dailyQuests, selectedBookId),
      shops: getMallItemsSellingArticle(mallItems, selectedBookId)
    };
  }, [selectedBookId, stages, storyQuests, dailyQuests, mallItems]);

  // Build combined stages list
  const evolutionStages: EvolutionStage[] = useMemo(() => {
    const levelNames = ["Base (Shikai)", "Kai (Release Phase)", "Bankai (Final Swastika)", "Burst (Evolution Form)"];
    if (matchedExpands.length > 0) {
      return matchedExpands.map((exp, idx) => {
        const skill = skills.find(s => s.skill_id === exp.skill_id);
        const name = levelNames[idx] || `Phase ${exp.level}`;
        return {
          levelName: name,
          levelNum: exp.level,
          reqLevel: exp.soul_level_need,
          costGold: exp.normal_exp * 100 || (idx + 1) * 2000,
          pelletsRequired: exp.soul_added || (idx + 1) * 10,
          handbooksRequired: idx,
          statBonus: skill ? `${skill.name}: ${skill.description}` : `Unlocks phase ${exp.level} stats`,
          skill,
          expand: exp
        };
      });
    }

    // Static fallback
    return [
      { levelName: "Base (Shikai)", levelNum: 1, reqLevel: 1, costGold: 0, pelletsRequired: 0, handbooksRequired: 0, statBonus: "Unlocks active combat form and signature Shikai attack" },
      { levelName: "Kai (Release Phase)", levelNum: 2, reqLevel: 30, costGold: 10, pelletsRequired: 15, handbooksRequired: 1, statBonus: "Attack power +250, Crit Rate +5%" },
      { levelName: "Bankai (Final Swastika)", levelNum: 3, reqLevel: 50, costGold: 25, pelletsRequired: 50, handbooksRequired: 3, statBonus: "Attack power +600, Crit Rate +12%, Speed +20" },
      { levelName: "Burst (Evolution Form)", levelNum: 4, reqLevel: 70, costGold: 60, pelletsRequired: 120, handbooksRequired: 8, statBonus: "Attack power +1500, Crit Rate +25%, Speed +50, Armor Pen +15%" }
    ];
  }, [matchedExpands, skills]);

  const handleRefineAttempt = () => {
    const stage = evolutionStages.find(s => s.levelNum === selectedTabLevel);
    if (!stage) return;

    const needExp = stage.expand?.need_exp || 100;
    // Simulate training progress
    const gain = Math.floor(Math.random() * (needExp / 4)) + Math.floor(needExp / 10);
    const nextExp = simulatedExp + gain;
    const newLogs = [...logs];
    
    if (nextExp >= needExp) {
      newLogs.unshift(`[EVOLUTION SUCCESS] ${zanpakutoName} evolved to ${stage.levelName}! Stats unlocked: ${stage.statBonus}`);
      setCurrentLevel(selectedTabLevel);
      setSimulatedExp(0);
      setSelectedTabLevel(prev => prev < evolutionStages.length ? prev + 1 : prev);
    } else {
      newLogs.unshift(`[Refinement Attempt] Gained +${gain} EXP (Current: ${nextExp}/${needExp} EXP). Spent: ${stage.costGold} Gold, 1x Reiatsu Cultivating Pill, 1x ${selectedBook?.name}.`);
      setSimulatedExp(nextExp);
    }
    setLogs(newLogs.slice(0, 10)); // keep last 10 entries
  };

  const handleReset = () => {
    setCurrentLevel(1);
    setSelectedTabLevel(2);
    setSimulatedExp(0);
    setLogs([]);
  };

  const renderPositionalStats = (added: any[] | null) => {
    if (!added || added.length === 0) return <span className="text-muted italic text-[11px]">No modifiers</span>;
    return (
      <div className="space-y-1 bg-bg p-2.5 rounded-lg border border-border">
        {added.map((add, idx) => {
          const name = getAttributeName(add.type);
          const isPercent = name.toLowerCase().includes('rate') || name.toLowerCase().includes('immunity') || add.value < 1;
          const formattedVal = isPercent ? `${(add.value * 100).toFixed(0)}%` : `+${add.value}`;
          return (
            <div key={idx} className="flex justify-between text-[11px] font-mono border-b border-border/40 pb-0.5 last:border-0 last:pb-0">
              <span className="text-subtle">{name}</span>
              <span className="text-fuchsia-450 dark:text-fuchsia-400 font-bold">{formattedVal}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <LoadingState message="Downloading Zanpakuto evolution metrics and refining formulas..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const activeStage = evolutionStages[selectedTabLevel - 1] || null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <div>
        <Link
          to="/articles"
          className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-text dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Articles Catalog</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 rounded-xl">
            <Swords size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-text">Zanpakuto Evolution Simulator</h1>
            <p className="text-xs text-muted font-semibold">Simulate actual Bleach Zanpakutos (Muramasa, Senbonzakura, etc.) using their database picture books.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Zanpakuto Selector */}
        <div className="xl:col-span-1 border border-border bg-surface p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-text border-b border-border pb-2.5">
            Select Zanpakuto
          </h3>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {articles.map(b => {
              const name = b.name?.replace(/Picture Book/gi, '').replace(/Illustration/gi, '').trim();
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBookId(b.id);
                    handleReset();
                  }}
                  className={`w-full p-3 text-left border rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                    selectedBookId === b.id
                      ? 'border-fuchsia-500 bg-fuchsia-500/5 text-fuchsia-800 dark:text-fuchsia-400 font-bold'
                      : 'border-border hover:border-border-strong hover:bg-hover/50 text-muted'
                  }`}
                >
                  <div>
                    <span className="font-semibold block truncate">{name}</span>
                    <span className="text-[10px] text-subtle font-mono">Book ID: {b.id}</span>
                  </div>
                  <Zap size={14} className={selectedBookId === b.id ? 'text-fuchsia-500' : 'text-subtle'} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Simulator & Info */}
        <div className="xl:col-span-2 space-y-6">
          {selectedBook && (
            <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <span className="text-[9px] font-mono text-subtle block font-bold">SOUL CUTTER BLADE</span>
                  <h2 className="text-2xl font-black text-text">{zanpakutoName}</h2>
                  <span className="text-xs text-subtle font-semibold block">Activated by using: {selectedBook.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-800 dark:text-fuchsia-400 text-xs font-black uppercase">
                    Level {currentLevel} ({evolutionStages[currentLevel - 1]?.levelName || 'Base'})
                  </span>
                  <button
                    onClick={handleReset}
                    className="p-1.5 border border-border hover:border-fuchsia-500 rounded-lg text-subtle hover:text-fuchsia-500 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border gap-4 text-xs font-bold">
                {evolutionStages.map((stage) => (
                  <button
                    key={stage.levelNum}
                    onClick={() => {
                      if (stage.levelNum > currentLevel) {
                        setSelectedTabLevel(stage.levelNum);
                      }
                    }}
                    disabled={stage.levelNum <= currentLevel}
                    className={`pb-2 transition-all relative ${
                      stage.levelNum <= currentLevel
                        ? 'text-emerald-600 dark:text-emerald-450 cursor-not-allowed font-extrabold'
                        : selectedTabLevel === stage.levelNum
                        ? 'text-fuchsia-600 dark:text-fuchsia-400 border-b-2 border-fuchsia-600 dark:border-fuchsia-400'
                        : 'text-subtle hover:text-text dark:hover:text-zinc-200 cursor-pointer'
                    }`}
                  >
                    {stage.levelName} {stage.levelNum <= currentLevel ? "✓" : ""}
                  </button>
                ))}
              </div>

              {/* Selected Tab Info & Controls */}
              {activeStage && selectedTabLevel > currentLevel && (
                <div className="space-y-6">
                  {/* Skill Unlocked Detail */}
                  {activeStage.skill && (
                    <div className="p-4 border border-fuchsia-100 dark:border-fuchsia-950 bg-fuchsia-50/5 dark:bg-fuchsia-950/5 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-fuchsia-600 dark:text-fuchsia-450">
                        <Sparkles size={16} />
                        <h4 className="font-extrabold text-xs uppercase tracking-wider">Unlocked Skill details</h4>
                      </div>
                      <div>
                        <div className="text-xs font-black text-text">{activeStage.skill.name}</div>
                        <p className="text-[11px] text-subtle leading-relaxed mt-1 whitespace-pre-line">{activeStage.skill.description}</p>
                      </div>
                      {activeStage.expand?.turns && (
                        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-subtle">
                          <span className="font-bold">Active Combat Turns:</span>
                          <span className="font-mono bg-surface-raised px-1.5 py-0.5 rounded text-zinc-350">{activeStage.expand.turns.map(t => `Turn ${t}`).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Positional Stat Buffs */}
                  {activeStage.expand && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <span className="block text-[9px] font-bold text-emerald-500 uppercase tracking-widest text-center">🛡️ Front (Vanguard)</span>
                        {renderPositionalStats(activeStage.expand.added_front)}
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-[9px] font-bold text-rose-500 uppercase tracking-widest text-center">⚔️ Mid (Assaulter)</span>
                        {renderPositionalStats(activeStage.expand.added_middle)}
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-[9px] font-bold text-violet-500 uppercase tracking-widest text-center">🔮 Rear (Support)</span>
                        {renderPositionalStats(activeStage.expand.added_back)}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Upgrade Materials Card */}
                    <div className="p-4 border border-border bg-bg/20 rounded-xl space-y-4">
                      <h4 className="font-extrabold text-xs text-text dark:text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
                        <Cpu size={14} className="text-fuchsia-500" />
                        <span>Evolution Materials Requirement</span>
                      </h4>
                      <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                          <span className="text-subtle">Required Level</span>
                          <span className="font-bold font-mono">Lv. {activeStage.reqLevel}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                          <span className="text-subtle">Quality Target</span>
                          <span className="font-bold font-mono">Tier {activeStage.expand?.quality || 3}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                          <span className="text-subtle">Reiatsu Added Value</span>
                          <span className="font-bold font-mono">+{activeStage.pelletsRequired}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                          <span className="text-subtle">Gold Cost per Attempt</span>
                          <span className="font-bold font-mono text-amber-600">{(activeStage.costGold).toLocaleString()} Gold</span>
                        </div>
                      </div>
                    </div>

                    {/* Refinement Control Console */}
                    <div className="p-4 border border-border bg-bg/10 rounded-xl space-y-4">
                      <h4 className="font-extrabold text-xs text-text flex items-center gap-1.5 uppercase tracking-wider">
                        <Award size={14} className="text-fuchsia-500" />
                        <span>Upgrade Progression Simulator</span>
                      </h4>

                      {/* Progress bar */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between font-mono">
                          <span className="text-subtle">Refinement Experience</span>
                          <span className="font-bold">{simulatedExp} / {activeStage.expand?.need_exp || 100} EXP</span>
                        </div>
                        <div className="w-full bg-bg rounded-full h-2 overflow-hidden border border-border">
                          <div
                            className="bg-fuchsia-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(simulatedExp / (activeStage.expand?.need_exp || 100)) * 100}%` }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleRefineAttempt}
                        className="w-full py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
                      >
                        Refine Zanpakuto (+{activeStage.costGold} Gold)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sourcing links for picture book */}
              <div className="p-4 border border-border rounded-xl bg-bg/50 text-xs space-y-3">
                <h4 className="font-extrabold text-text dark:text-zinc-250 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShoppingCart size={14} className="text-violet-500" />
                  <span>Activation Book Sourcing Reference</span>
                </h4>
                {bookSources.shops.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-subtle">Available in Shop:</span>
                    {bookSources.shops.map(shop => (
                      <Link
                        key={shop.id}
                        to={`/mall-items/${shop.id}`}
                        className="px-2 py-1 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-400 font-bold hover:underline"
                      >
                        {shop.name} ({(shop.hotprice || shop.gold || 0).toLocaleString()} Gold)
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-subtle flex items-center gap-1.5">
                    <HelpCircle size={14} />
                    <span>This Zanpakuto book is not sold in the default Mall Shop. Look up loot stages via the planner.</span>
                  </div>
                )}
                <Link
                  to={`/articles/farming`}
                  onClick={() => localStorage.setItem('farm_planner_focus', String(selectedBookId))}
                  className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline font-bold block pt-1.5 border-t border-border"
                >
                  Open in Farming Planner Console →
                </Link>
              </div>

              {/* Simulated Logs */}
              {logs.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border/80">
                  <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Upgrade Log Output</span>
                  <div className="bg-bg rounded-xl p-3 border border-border font-mono text-[10px] text-muted space-y-1 max-h-40 overflow-y-auto">
                    {logs.map((log, idx) => (
                      <p key={idx} className={log.includes('SUCCESS') ? 'text-emerald-600 dark:text-emerald-450 font-bold' : ''}>{log}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
