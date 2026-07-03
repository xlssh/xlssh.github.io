import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadStoryQuests, loadArticles } from '../data/loaders';
import { StoryQuest, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { RewardList } from '../components/RewardList';
import { ArrowLeft, GitFork, BookOpen, Compass, Award, User, ArrowDown, Search } from 'lucide-react';

export const QuestChainPage: React.FC = () => {
  const [quests, setQuests] = useState<StoryQuest[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [questsRes, articlesRes] = await Promise.all([
        loadStoryQuests(),
        loadArticles()
      ]);
      // Sort quests by ID to keep logical ordering
      const sortedQuests = [...questsRes.rows].sort((a, b) => a.id - b.id);
      setQuests(sortedQuests);
      setArticles(articlesRes.rows);
      if (sortedQuests.length > 0) {
        setSelectedQuestId(sortedQuests[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load story quest archives.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered quest list for search selector
  const filteredQuests = useMemo(() => {
    if (!searchQuery.trim()) return quests;
    const query = searchQuery.toLowerCase();
    return quests.filter(q =>
      (q.name && q.name.toLowerCase().includes(query)) ||
      q.id.toString().includes(query) ||
      (q.description && q.description.toLowerCase().includes(query))
    );
  }, [quests, searchQuery]);

  // Construct the chain: trace preceding quests and succeeding quests
  const questChain = useMemo(() => {
    if (!selectedQuestId || quests.length === 0) return [];
    
    // Find preceding chain (parents)
    const predecessors: StoryQuest[] = [];
    let current = quests.find(q => q.id === selectedQuestId);
    while (current && current.pre_task_id !== 0) {
      const parent = quests.find(q => q.id === current?.pre_task_id);
      if (parent) {
        predecessors.unshift(parent); // Add to beginning to keep chronological order
        current = parent;
      } else {
        break;
      }
    }

    // Current quest
    const target = quests.find(q => q.id === selectedQuestId);
    
    // Find succeeding chain (children - simple single path trace)
    const successors: StoryQuest[] = [];
    let child = target ? quests.find(q => q.pre_task_id === target.id) : null;
    let iterations = 0; // Prevent infinite loops in case of circular db reference
    while (child && iterations < 15) {
      successors.push(child);
      child = quests.find(q => q.pre_task_id === child?.id);
      iterations++;
    }

    const fullChain = [...predecessors];
    if (target) fullChain.push(target);
    fullChain.push(...successors);
    return fullChain;
  }, [quests, selectedQuestId]);

  if (loading) return <LoadingState message="Mapping quest relationship nodes and speech triggers..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/story-quests"
          className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-text dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Story Quest List</span>
        </Link>
      </div>

      {/* Title Banner */}
      <div className="p-6 md:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 rounded-xl">
            <GitFork size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-text">Campaign Progression Visualizer</h1>
            <p className="text-xs text-muted">Trace quest chains, preceding prerequisites, dialogues, and loot targets chronologically.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: Search and Selector */}
        <div className="xl:col-span-1 border border-border bg-surface p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-text flex items-center gap-2 border-b border-border pb-2.5">
            <BookOpen size={16} className="text-fuchsia-500" />
            <span>Select Focus Quest</span>
          </h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search quest name/ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border bg-bg focus:outline-none focus:ring-1.5 focus:ring-fuchsia-500 placeholder-zinc-400"
            />
            <Search size={14} className="absolute left-3.5 top-3 text-subtle" />
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredQuests.map(q => (
              <button
                key={q.id}
                onClick={() => setSelectedQuestId(q.id)}
                className={`w-full p-3 text-left border rounded-xl text-xs transition-all flex flex-col gap-1 relative overflow-hidden cursor-pointer ${
                  selectedQuestId === q.id
                    ? 'border-fuchsia-500 bg-fuchsia-500/5 text-fuchsia-800 dark:text-fuchsia-400 font-bold'
                    : 'border-border hover:border-border-strong hover:bg-hover/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="truncate block font-semibold text-text">{q.name}</span>
                  <span className="font-mono text-[9px] text-subtle shrink-0">#{q.id}</span>
                </div>
                {q.description && (
                  <p className="text-[10px] text-subtle truncate w-full">{q.description}</p>
                )}
              </button>
            ))}
            {filteredQuests.length === 0 && (
              <p className="text-xs text-subtle text-center py-8">No quests match search query.</p>
            )}
          </div>
        </div>

        {/* Right column: The Chain Flow vertical timeline */}
        <div className="xl:col-span-2 space-y-6">
          <div className="border border-border bg-surface p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-sm text-text flex items-center gap-2 border-b border-border pb-3">
              <GitFork size={16} className="text-fuchsia-500" />
              <span>Chrono-Sequence Timeline (Quest Chain Flow)</span>
            </h3>

            <div className="pt-6 relative pl-6 md:pl-8 space-y-8 before:absolute before:left-[11px] before:top-8 before:bottom-8 before:w-0.5 before:bg-surface-raised dark:before:bg-surface">
              {questChain.map((q, idx) => {
                const isTarget = q.id === selectedQuestId;

                return (
                  <div key={q.id} className="relative space-y-3">
                    {/* Bullet marker */}
                    <div className={`absolute -left-[27px] md:-left-[35px] top-1.5 w-4 h-4 rounded-full border-2 bg-surface transition-all flex items-center justify-center ${
                      isTarget 
                        ? 'border-fuchsia-500 scale-125 ring-4 ring-fuchsia-500/20' 
                        : 'border-border-strong'
                    }`}>
                      {isTarget && <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" />}
                    </div>

                    {/* Timeline card content */}
                    <div className={`p-4 md:p-5 border rounded-2xl space-y-4 shadow-sm transition-all ${
                      isTarget 
                        ? 'border-fuchsia-550 dark:border-fuchsia-800 bg-fuchsia-500/5' 
                        : 'border-border bg-bg/10'
                    }`}>
                      {/* Top labels */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-subtle">ID: {q.id}</span>
                          {q.pre_task_id === 0 && (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-extrabold text-[9px] uppercase tracking-wider">
                              Chain Trigger Root
                            </span>
                          )}
                          {isTarget && (
                            <span className="px-2 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-750 dark:text-fuchsia-400 font-extrabold text-[9px] uppercase tracking-wider">
                              Focused Selection
                            </span>
                          )}
                        </div>
                        <Link
                          to={`/story-quests/${q.id}`}
                          className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-semibold"
                        >
                          Details Sheet →
                        </Link>
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-text text-base">{q.name}</h4>
                        {q.description && (
                          <p className="text-xs text-muted leading-relaxed italic">
                            "{q.description}"
                          </p>
                        )}
                      </div>

                      {/* Dialogue guide blocks */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {q.guide_before && (
                          <div className="p-3 bg-bg/50 dark:bg-bg rounded-xl border border-border/40 border-border/60">
                            <span className="block text-[9px] font-bold text-subtle uppercase mb-1">Receipt Protocol</span>
                            <p className="text-muted dark:text-subtle">{q.guide_before}</p>
                          </div>
                        )}
                        {q.guide && (
                          <div className="p-3 bg-bg/50 dark:bg-bg rounded-xl border border-border/40 border-border/60">
                            <span className="block text-[9px] font-bold text-subtle uppercase mb-1">Action Directive</span>
                            <p className="text-muted dark:text-subtle">{q.guide}</p>
                          </div>
                        )}
                      </div>

                      {/* Loot Rewards & NPCs */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border/60 text-xs">
                        <div className="flex items-start gap-1.5">
                          <User size={14} className="text-subtle mt-0.5 shrink-0" />
                          <div>
                            <span className="text-subtle block text-[9px] font-bold uppercase">Trigger NPC ID</span>
                            <span className="font-semibold text-muted font-mono">#{q.start_npc_id ?? 'None'}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Compass size={14} className="text-subtle mt-0.5 shrink-0" />
                          <div>
                            <span className="text-subtle block text-[9px] font-bold uppercase">Gateway Target</span>
                            <span className="font-semibold text-muted font-mono">#{q.gate ?? 'None'}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Award size={14} className="text-subtle mt-0.5 shrink-0" />
                          <div>
                            <span className="text-subtle block text-[9px] font-bold uppercase">Points Bounty</span>
                            <span className="font-semibold text-muted font-mono">+{q.point ?? 0}</span>
                          </div>
                        </div>
                      </div>

                      {q.rewards_json && (
                        <div className="pt-3 border-t border-border/60 space-y-1.5">
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-subtle">Awarded Inventory Drops</span>
                          <RewardList rewardsJson={q.rewards_json} articles={articles} />
                        </div>
                      )}
                    </div>

                    {/* Bullet Arrow connector */}
                    {idx < questChain.length - 1 && (
                      <div className="flex justify-center w-4 -ml-[27px] md:-ml-[35px] text-zinc-350 dark:text-text py-1">
                        <ArrowDown size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
