import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadArticles, loadStages, loadStoryQuests, loadDailyQuests, loadMallItems } from '../data/loaders';
import { Article, Stage, StoryQuest, DailyQuest, MallItem } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getStagesAwardingArticle, getQuestsAwardingArticle, getMallItemsSellingArticle, getMinorTypeLabel } from '../data/relationships';
import { ArrowLeft, Search, Navigation, Swords, Award, ShoppingBag, AlertCircle, Compass } from 'lucide-react';
import { getQualityColorClass } from '../utils/quality';

export const FarmingPlannerPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [storyQuests, setStoryQuests] = useState<StoryQuest[]>([]);
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([]);
  const [mallItems, setMallItems] = useState<MallItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [artRes, stagesRes, storyRes, dailyRes, mallRes] = await Promise.all([
        loadArticles(),
        loadStages(),
        loadStoryQuests(),
        loadDailyQuests(),
        loadMallItems()
      ]);
      setArticles(artRes.rows);
      setStages(stagesRes.rows);
      setStoryQuests(storyRes.rows);
      setDailyQuests(dailyRes.rows);
      setMallItems(mallRes.rows);
      if (artRes.rows.length > 0) {
        setSelectedArticleId(artRes.rows[0].id);
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

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const query = searchQuery.toLowerCase();
    return articles.filter(a =>
      (a.name && a.name.toLowerCase().includes(query)) ||
      a.id.toString().includes(query)
    );
  }, [articles, searchQuery]);

  const selectedArticle = useMemo(() => {
    return articles.find(a => a.id === selectedArticleId) || null;
  }, [articles, selectedArticleId]);

  const farmingSources = useMemo(() => {
    if (!selectedArticleId) return { stages: [], quests: { story: [], daily: [] }, shops: [] };
    return {
      stages: getStagesAwardingArticle(stages, selectedArticleId),
      quests: getQuestsAwardingArticle(storyQuests, dailyQuests, selectedArticleId),
      shops: getMallItemsSellingArticle(mallItems, selectedArticleId)
    };
  }, [selectedArticleId, stages, storyQuests, dailyQuests, mallItems]);

  if (loading) return <LoadingState message="Mapping cross-reference loot indexes and drop rates..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
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
            <Navigation size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-text">Loot Finder & Farming Planner</h1>
            <p className="text-xs text-muted font-semibold">Select or search an item to discover all drop stages, cash shops, and quests rewarding it.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Item List & Selector */}
        <div className="xl:col-span-1 border border-border bg-surface p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-text border-b border-border pb-2.5">
            Select Material / Item
          </h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-border bg-bg focus:outline-none focus:ring-1.5 focus:ring-fuchsia-500 placeholder-zinc-400"
            />
            <Search size={14} className="absolute left-3.5 top-3.5 text-subtle" />
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredArticles.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedArticleId(a.id)}
                className={`w-full p-3 text-left border rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                  selectedArticleId === a.id
                    ? 'border-fuchsia-500 bg-fuchsia-500/5 text-fuchsia-800 dark:text-fuchsia-400 font-bold'
                    : 'border-border hover:border-border-strong hover:bg-hover/50 text-muted'
                }`}
              >
                <div className="truncate pr-2">
                  <span className="font-semibold block truncate">{a.name}</span>
                  <span className="text-[10px] text-subtle">{getMinorTypeLabel(a.major_type, a.minor_type)}</span>
                </div>
                <span className="font-mono text-[9px] text-subtle shrink-0">#{a.id}</span>
              </button>
            ))}
            {filteredArticles.length === 0 && (
              <p className="text-xs text-subtle text-center py-8">No matching items found.</p>
            )}
          </div>
        </div>

        {/* Right Column: Farming Outputs */}
        <div className="xl:col-span-2 space-y-6">
          {selectedArticle && (
            <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <span className="text-[10px] font-mono text-subtle block font-bold">FOCUS TARGET</span>
                  <h2 className="text-xl font-black text-text">{selectedArticle.name}</h2>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getQualityColorClass(selectedArticle.quality as number)}`}>
                  Quality {selectedArticle.quality}
                </span>
              </div>

              {selectedArticle.function_desc && (
                <p className="text-xs text-muted italic">
                  "{selectedArticle.function_desc.replace(/<[^>]*>/g, '')}"
                </p>
              )}
            </div>
          )}

          {/* Sourcing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Drop Stages */}
            <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-rose-600 dark:text-rose-450 flex items-center gap-2 border-b border-border pb-2">
                <Swords size={16} />
                <span>Campaign Drop Stages</span>
              </h3>

              {farmingSources.stages.length > 0 ? (
                <div className="space-y-3">
                  {farmingSources.stages.map(stage => (
                    <Link
                      key={stage.id}
                      to={`/stages/${stage.id}`}
                      className="p-3 border border-border rounded-xl block hover:border-rose-500 hover:bg-rose-500/5 transition-all text-xs"
                    >
                      <span className="font-bold text-text block truncate">{stage.name}</span>
                      <span className="text-[10px] text-subtle block mt-0.5">Req Level: Lv. {stage.level} | Hardness: {stage.hard}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-subtle italic py-4 flex items-center gap-1.5 bg-bg/50 p-3 rounded-xl border border-border/80">
                  <AlertCircle size={14} />
                  <span>Not dropped in any campaign stages.</span>
                </div>
              )}
            </div>

            {/* Quests */}
            <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2 border-b border-border pb-2">
                <Award size={16} />
                <span>Awarded by Quests</span>
              </h3>

              {(farmingSources.quests.story.length > 0 || farmingSources.quests.daily.length > 0) ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {farmingSources.quests.story.map(q => (
                    <Link
                      key={`story-${q.id}`}
                      to={`/story-quests/${q.id}`}
                      className="p-3 border border-border rounded-xl block hover:border-indigo-500 hover:bg-indigo-500/5 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-text block truncate">{q.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-[9px] font-extrabold text-indigo-600 uppercase">Story</span>
                      </div>
                    </Link>
                  ))}
                  {farmingSources.quests.daily.map(q => (
                    <Link
                      key={`daily-${q.id}`}
                      to={`/daily-quests/${q.id}`}
                      className="p-3 border border-border rounded-xl block hover:border-orange-500 hover:bg-orange-500/5 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-text block truncate">{q.task_name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-[9px] font-extrabold text-orange-600 uppercase">Daily</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-subtle italic py-4 flex items-center gap-1.5 bg-bg/50 p-3 rounded-xl border border-border/80">
                  <AlertCircle size={14} />
                  <span>Not awarded by any quests.</span>
                </div>
              )}
            </div>

            {/* Mall Items */}
            <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-violet-600 dark:text-violet-450 flex items-center gap-2 border-b border-border pb-2">
                <ShoppingBag size={16} />
                <span>Available in Mall</span>
              </h3>

              {farmingSources.shops.length > 0 ? (
                <div className="space-y-3">
                  {farmingSources.shops.map(item => (
                    <Link
                      key={item.id}
                      to={`/mall-items/${item.id}`}
                      className="p-3 border border-border rounded-xl block hover:border-violet-500 hover:bg-violet-500/5 transition-all text-xs"
                    >
                      <span className="font-bold text-text block truncate">{item.name}</span>
                      <div className="flex justify-between items-center mt-1">
                        <span className="font-mono text-amber-600 font-bold">{(item.hotprice || item.gold || 0).toLocaleString()} Gold</span>
                        {item.vip ? (
                          <span className="text-[9px] text-violet-600 dark:text-violet-400 font-bold">VIP {item.vip}+</span>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-subtle italic py-4 flex items-center gap-1.5 bg-bg/50 p-3 rounded-xl border border-border/80">
                  <AlertCircle size={14} />
                  <span>Not sold in any Mall Shop rows.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
