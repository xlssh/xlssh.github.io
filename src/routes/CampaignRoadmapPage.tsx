import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadStoryQuests, loadCities, loadStages } from '../data/loaders';
import { StoryQuest, City, Stage } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { parseRewards, getArticleById } from '../data/relationships';
import { Map, CheckCircle2, Circle, Compass, Info, Trophy, Gift, ArrowRight, ShieldAlert, BookOpen } from 'lucide-react';

export const CampaignRoadmapPage: React.FC = () => {
  const [quests, setStoryQuests] = useState<StoryQuest[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Player Level Selector
  const [playerLevel, setPlayerLevel] = useState<number>(30);

  // Completed checklist (Stored in localStorage or state)
  const [completedQuestIds, setCompletedQuestIds] = useState<number[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [qRes, cRes, sRes] = await Promise.all([
        loadStoryQuests(),
        loadCities(),
        loadStages()
      ]);
      setStoryQuests(qRes.rows);
      setCities(cRes.rows);
      setStages(sRes.rows);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load campaign progression databases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter cities unlocked at target level
  const unlockedChapters = useMemo(() => {
    return cities
      .filter(c => c.open_level !== null && c.open_level <= playerLevel)
      .sort((a, b) => (a.open_level ?? 0) - (b.open_level ?? 0));
  }, [cities, playerLevel]);

  // Filter cities locked (upcoming chapters)
  const lockedChapters = useMemo(() => {
    return cities
      .filter(c => c.open_level !== null && c.open_level > playerLevel)
      .sort((a, b) => (a.open_level ?? 0) - (b.open_level ?? 0))
      .slice(0, 3); // Show next 3 chapters
  }, [cities, playerLevel]);

  // Filter story quests unlocked at this level
  const unlockedQuests = useMemo(() => {
    const sorted = [...quests].sort((a, b) => a.id - b.id);
    return sorted.map((q, idx) => ({
      ...q,
      need_level: Math.floor(idx / 5) + 1
    })).filter(q => q.need_level <= playerLevel);
  }, [quests, playerLevel]);

  const toggleQuestCompleted = (id: number) => {
    setCompletedQuestIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Completion analytics percentages
  const progressionStats = useMemo(() => {
    const total = unlockedQuests.length;
    if (total === 0) return { pct: 0, count: 0, total: 0 };
    const doneCount = unlockedQuests.filter(q => completedQuestIds.includes(q.id)).length;
    return {
      pct: Math.round((doneCount / total) * 100),
      count: doneCount,
      total
    };
  }, [unlockedQuests, completedQuestIds]);

  if (loading) return <LoadingState message="De-serializing story arcs and geographic unlock vectors..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-text tracking-tight flex items-center gap-2">
          <Map className="text-emerald-500" />
          Campaign Roadmap & Checklist
        </h1>
        <p className="text-sm text-muted mt-1">
          Set your current level to examine campaign chapters, manage unlocked main storyline quests, and monitor active progression metrics.
        </p>
      </div>

      {/* Simulator Level slider */}
      <div className="p-4 bg-surface border border-border rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="space-y-1">
          <span className="text-xs font-bold text-subtle uppercase tracking-wider block">Set Current Character Level</span>
          <span className="text-[11px] text-muted">Filters all quests, cities, and dungeons to mirror your actual in-game level.</span>
        </div>
        <div className="flex items-center gap-4 w-full md:w-80 shrink-0">
          <input
            type="range"
            min={1}
            max={159}
            value={playerLevel}
            onChange={(e) => setPlayerLevel(parseInt(e.target.value))}
            className="flex-1 accent-brand cursor-pointer"
          />
          <span className="text-base font-black font-mono text-brand bg-brand-soft px-3 py-1 rounded border border-border">
            Lv.{playerLevel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Side: Story Checklist & Progress Tracker */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-surface border border-border rounded-2xl space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-text flex items-center gap-2">
                <Trophy size={18} className="text-emerald-400" />
                Active Story Questline Checklist
              </h2>
              <div className="text-right text-xs font-mono">
                <span className="text-brand font-bold">{progressionStats.count}</span> / {progressionStats.total} done ({progressionStats.pct}%)
              </div>
            </div>

            {/* Progress bar visual */}
            <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-brand transition-all duration-300"
                style={{ width: `${progressionStats.pct}%` }}
              />
            </div>

            {/* Quests checklist scrollable board */}
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {unlockedQuests.slice(0, 50).map(q => {
                const isDone = completedQuestIds.includes(q.id);
                const rewards = parseRewards(q.rewards_json);
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleQuestCompleted(q.id)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex items-start gap-3.5 ${isDone
                      ? 'border-border bg-bg/5 opacity-60'
                      : 'border-border bg-bg/40 hover:border-border-strong'
                      }`}
                  >
                    <button className="mt-0.5 shrink-0 text-muted">
                      {isDone ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <Circle size={16} className="hover:text-text" />
                      )}
                    </button>

                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className={`text-xs font-bold leading-tight block ${isDone ? 'line-through text-muted' : 'text-text'}`}>
                          {q.name || `Unnamed Quest #${q.id}`}
                        </span>
                        <span className="text-[9px] font-mono text-subtle shrink-0 ml-2">Lv.{q.need_level}</span>
                      </div>
                      <p className={`text-[10px] leading-relaxed block ${isDone ? 'text-subtle' : 'text-muted'}`}>
                        {q.description || 'Deliver reports or defeat hollows in town to complete this campaign objective.'}
                      </p>

                      {/* Quest Rewards */}
                      {rewards.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <Gift size={10} className="text-subtle" />
                          {rewards.map((r, rIdx) => (
                            <span
                              key={rIdx}
                              className="text-[8px] font-mono font-bold bg-bg border border-border text-subtle px-1.5 py-0.5 rounded"
                            >
                              Type {r.type} Code {r.code} × {r.amount}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {unlockedQuests.length > 50 && (
                <div className="text-center text-[10px] text-muted py-3 border border-dashed border-border rounded-xl bg-bg/20">
                  Showing first 50 quests. Check items off or raise your target level to inspect subsequent story chapters.
                </div>
              )}

              {unlockedQuests.length === 0 && (
                <div className="p-8 text-center text-muted border border-dashed border-border rounded-xl">
                  Raise simulated level to unlock story quests.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Chapter unlocks & geographic details */}
        <div className="lg:col-span-1 space-y-6">

          {/* Chapter geographic progress */}
          <div className="p-5 bg-surface border border-border rounded-2xl space-y-4">
            <h3 className="text-xs font-black text-muted uppercase tracking-widest border-b border-border pb-2 flex items-center gap-1">
              <Compass size={12} className="text-emerald-500" />
              Chapter geographic unlocks ({unlockedChapters.length} unlocked)
            </h3>
            <div className="space-y-3">
              {unlockedChapters.slice(-4).map(c => (
                <div key={c.id} className="p-3 border border-brand-soft bg-brand-soft/10 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-text block">{c.name || `World Map Area #${c.id}`}</span>
                    <span className="text-[9px] text-muted block">Chapter ID: {c.id} • Req: Lv.{c.open_level}</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase text-brand bg-brand-soft px-2 py-0.5 rounded border border-border">
                    Active
                  </span>
                </div>
              ))}
              {unlockedChapters.length === 0 && (
                <div className="text-center text-muted text-xs py-4">No cities unlocked at this level</div>
              )}
            </div>
          </div>

          {/* Locked Chapters Preview */}
          <div className="p-5 bg-surface border border-border rounded-2xl space-y-4">
            <h3 className="text-xs font-black text-muted uppercase tracking-widest border-b border-border pb-2 flex items-center gap-1">
              <ShieldAlert size={12} className="text-subtle" />
              Locked Chapters Preview
            </h3>
            <div className="space-y-3">
              {lockedChapters.map(c => {
                const diff = (c.open_level ?? 0) - playerLevel;
                return (
                  <div key={c.id} className="p-3 border border-border bg-bg/40 rounded-xl flex items-center justify-between opacity-80">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-muted block">{c.name || `World Map Area #${c.id}`}</span>
                      <span className="text-[9px] text-subtle block">Unlocks at Level {c.open_level}</span>
                    </div>
                    <span className="text-[9px] font-black font-mono text-subtle bg-surface px-2 py-1 rounded border border-border">
                      In {diff} Levels
                    </span>
                  </div>
                );
              })}
              {lockedChapters.length === 0 && (
                <div className="text-center text-muted text-xs py-4">You have unlocked all world chapters!</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
