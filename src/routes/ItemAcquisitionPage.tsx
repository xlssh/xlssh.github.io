import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  loadArticles, loadAwards, loadActivityDetails, loadPromotionalActivities,
  loadMallItems, loadBlackMarketItems, loadDailyQuests, loadStoryQuests, loadStages
} from '../data/loaders';
import type { Article, Award, ActivityDetailsJson, PromotionalActivity, MallItem, BlackMarketItem, DailyQuest, StoryQuest, Stage } from '../types/db';
import { getActivitiesAwardingArticle, getQuestsAwardingArticle, getStagesAwardingArticle, getMajorTypeLabel, getMinorTypeLabel } from '../data/relationships';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getQualityLabel, getQualityColorClass } from './HeroesPage';
import { Package, Search, ShoppingCart, Map, Calendar, Flame, ArrowRight, ExternalLink } from 'lucide-react';

interface AcquisitionSource {
  type: 'mall' | 'black_market' | 'daily_quest' | 'story_quest' | 'stage' | 'event';
  name: string;
  detail: string;
  cost: string;
  link: string;
}

export const ItemAcquisitionPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [activityDetails, setActivityDetails] = useState<ActivityDetailsJson>({});
  const [promos, setPromos] = useState<PromotionalActivity[]>([]);
  const [mallItems, setMallItems] = useState<MallItem[]>([]);
  const [blackMarket, setBlackMarket] = useState<BlackMarketItem[]>([]);
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([]);
  const [storyQuests, setStoryQuests] = useState<StoryQuest[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [artRes, awardRes, actRes, promoRes, mallRes, bmRes, dqRes, sqRes, stRes] = await Promise.all([
        loadArticles(), loadAwards(), loadActivityDetails(), loadPromotionalActivities(),
        loadMallItems(), loadBlackMarketItems(), loadDailyQuests(), loadStoryQuests(), loadStages()
      ]);
      setArticles(artRes.rows);
      setAwards(awardRes.rows);
      setActivityDetails(actRes);
      setPromos(promoRes.rows);
      setMallItems(mallRes.rows);
      setBlackMarket(bmRes.rows);
      setDailyQuests(dqRes.rows);
      setStoryQuests(sqRes.rows);
      setStages(stRes.rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Search articles
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles.slice(0, 50);
    const q = searchQuery.toLowerCase();
    return articles.filter(a => (a.name || '').toLowerCase().includes(q) || (a.function_desc || '').toLowerCase().includes(q)).slice(0, 100);
  }, [articles, searchQuery]);

  // Get all sources for selected article
  const sources = useMemo<AcquisitionSource[]>(() => {
    if (selectedArticleId === null) return [];
    const articleId = selectedArticleId;
    const results: AcquisitionSource[] = [];

    // 1. Mall items selling this article
    mallItems.filter(m => m.item_id === articleId).forEach(m => {
      results.push({
        type: 'mall',
        name: m.name || `Mall #${m.id}`,
        detail: `Gold: ${m.gold} | VIP: ${m.vip ?? 'None'}`,
        cost: `${m.gold?.toLocaleString() ?? 0} Gold`,
        link: `/mall-items/${m.id}`,
      });
    });

    // 2. Black market items
    blackMarket.filter(bm => bm.item_id === articleId).forEach(bm => {
      results.push({
        type: 'black_market',
        name: `Black Market Item #${bm.id}`,
        detail: `Price: ${JSON.stringify(bm.price)} | Stock: ${bm.total_times}`,
        cost: 'Varies',
        link: '/tools/black-market',
      });
    });

    // 3. Daily quests awarding this item
    dailyQuests.filter(dq => {
      const rewards = Array.isArray(dq.rewards_json) ? dq.rewards_json : [];
      return rewards.some((r: any) => r?.type === 1 && r?.code === articleId);
    }).forEach(dq => {
      results.push({
        type: 'daily_quest',
        name: dq.task_name || `Daily #${dq.id}`,
        detail: dq.description || 'Daily task reward',
        cost: 'Complete daily task',
        link: `/daily-quests/${dq.id}`,
      });
    });

    // 4. Story quests awarding this item
    storyQuests.filter(sq => {
      const rewards = sq.rewards_json?.rewards || [];
      return Array.isArray(rewards) && rewards.some((r: any) => r?.type === 1 && r?.code === articleId);
    }).forEach(sq => {
      results.push({
        type: 'story_quest',
        name: sq.name || `Quest #${sq.id}`,
        detail: sq.description || 'Story quest reward',
        cost: 'Complete quest',
        link: `/story-quests/${sq.id}`,
      });
    });

    // 5. Stages awarding this item
    stages.filter(s => {
      const awards = s.award_json?.award || [];
      return Array.isArray(awards) && awards.includes(articleId);
    }).forEach(s => {
      results.push({
        type: 'stage',
        name: s.name || `Stage #${s.id}`,
        detail: s.desc || `Level ${s.level}`,
        cost: 'Clear stage',
        link: `/stages/${s.id}`,
      });
    });

    // 6. Events/activities
    const eventSources = getActivitiesAwardingArticle(awards, activityDetails, articleId, promos);
    eventSources.forEach(src => {
      results.push({
        type: 'event',
        name: src.activityDisplayName || src.activityName,
        detail: `${src.mechanism} · ${src.className}`,
        cost: src.costLabel,
        link: src.promoId ? `/promotions/${src.promoId}` : '/promotions',
      });
    });

    return results;
  }, [selectedArticleId, mallItems, blackMarket, dailyQuests, storyQuests, stages, awards, activityDetails, promos]);

  const selectedArticle = useMemo(() => articles.find(a => a.id === selectedArticleId) || null, [articles, selectedArticleId]);

  if (loading) return <LoadingState message="Loading item and reward databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const sourceTypeConfig = {
    mall: { label: 'Mall Shop', color: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400', icon: ShoppingCart },
    black_market: { label: 'Black Market', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: Package },
    daily_quest: { label: 'Daily Quest', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', icon: Calendar },
    story_quest: { label: 'Story Quest', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', icon: Package },
    stage: { label: 'Stage Drop', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: Map },
    event: { label: 'Event', color: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: Flame },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
          <Package size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Item Acquisition Planner</h1>
          <p className="text-sm text-muted">Find every source for any item — shops, quests, stages, and events.</p>
        </div>
      </div>

      {/* Item Search */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm">
        <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-2">Search Items</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by item name or description..."
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div className="mt-3 max-h-60 overflow-y-auto border border-border rounded-xl">
          {filteredArticles.map(a => (
            <button
              key={a.id}
              onClick={() => { setSelectedArticleId(a.id); setSearchQuery(a.name || `#${a.id}`); }}
              className={`w-full text-left px-4 py-2.5 border-b border-border last:border-0 hover:bg-brand-soft/50 transition-colors flex items-center justify-between ${selectedArticleId === a.id ? 'bg-brand-soft' : ''}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-text truncate">{a.name || `Item #${a.id}`}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getQualityColorClass(a.quality)}`}>{getQualityLabel(a.quality)}</span>
                </div>
                <div className="text-[11px] text-muted truncate">{getMajorTypeLabel(a.major_type)} · {getMinorTypeLabel(a.major_type, a.minor_type)}</div>
              </div>
              <span className="font-mono text-xs text-subtle shrink-0 ml-2">ID: {a.id}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Results */}
      {selectedArticle && (
        <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="font-bold text-text text-lg">{selectedArticle.name || `Item #${selectedArticle.id}`}</h2>
              <p className="text-xs text-muted">{getMajorTypeLabel(selectedArticle.major_type)} · {getMinorTypeLabel(selectedArticle.major_type, selectedArticle.minor_type)}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getQualityColorClass(selectedArticle.quality)}`}>
              {getQualityLabel(selectedArticle.quality)}
            </span>
          </div>

          {selectedArticle.function_desc && (
            <p className="text-sm text-muted italic">{selectedArticle.function_desc}</p>
          )}

          {sources.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">
              <Package size={32} className="mx-auto mb-2 text-subtle" />
              <p>No acquisition sources found for this item in the database.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-text">{sources.length} source{sources.length !== 1 ? 's' : ''} found</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sources.map((src, idx) => {
                  const config = sourceTypeConfig[src.type];
                  const Icon = config.icon;
                  return (
                    <Link
                      key={idx}
                      to={src.link}
                      className="p-4 border border-border rounded-xl bg-bg/50 hover:shadow-md hover:border-brand-soft transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${config.color}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">{config.label}</span>
                          </div>
                          <h4 className="font-bold text-sm text-text group-hover:text-brand transition-colors truncate">{src.name}</h4>
                          <p className="text-[11px] text-muted mt-0.5 truncate">{src.detail}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px] font-mono font-bold text-brand">{src.cost}</span>
                            <ArrowRight size={12} className="text-brand opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
