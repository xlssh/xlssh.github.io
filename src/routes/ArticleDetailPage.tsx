import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadArticles, loadMallItems, loadDailyQuests, loadStoryQuests, loadStages, loadAwards, loadActivityDetails, loadPromotionalActivities } from '../data/loaders';
import type { Article, MallItem, DailyQuest, StoryQuest, Stage, Award, ActivityDetailsJson, PromotionalActivity } from '../types/db';
import { getMallItemsSellingArticle, getQuestsAwardingArticle, getStagesAwardingArticle, getActivitiesAwardingArticle, getMajorTypeLabel, getMinorTypeLabel } from '../data/relationships';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getQualityColorClass, getQualityLabel } from '../utils/quality';
import { ShoppingCart, AlertCircle, Swords, Activity, AwardIcon } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import { DetailPageWrapper } from '../components/DetailPageWrapper';

export const ArticleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data, loading, error, refetch } = useAsyncData(async () => {
    const articleId = parseInt(id || '');

    const [articlesRes, mallRes, dailyRes, storyRes, stagesRes, awardsRes, actDetailsRes, promosRes] = await Promise.all([
      loadArticles(),
      loadMallItems(),
      loadDailyQuests(),
      loadStoryQuests(),
      loadStages(),
      loadAwards(),
      loadActivityDetails(),
      loadPromotionalActivities()
    ]);

    const match = articlesRes.rows.find(a => a.id === articleId);
    if (!match) {
      throw new Error(`Article/Item with ID ${id} not found in the catalog.`);
    }

    return {
      article: match,
      sellers: getMallItemsSellingArticle(mallRes.rows, articleId),
      awardingQuests: getQuestsAwardingArticle(storyRes.rows, dailyRes.rows, articleId),
      awardingStages: getStagesAwardingArticle(stagesRes.rows, articleId),
      awardsList: awardsRes.rows,
      activityDetails: actDetailsRes,
      promos: promosRes.rows
    };
  }, [id]);

  const article = data?.article;
  const sellers = data?.sellers || [];
  const awardingQuests = data?.awardingQuests || { story: [], daily: [] };
  const awardingStages = data?.awardingStages || [];
  const awardsList = data?.awardsList || [];
  const activityDetails = data?.activityDetails || {};
  const promos = data?.promos || [];

  if (loading) return <LoadingState message="Downloading item specification and cross-referencing relationships..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!article) return <ErrorState message="Article/Item not found." onRetry={refetch} />;

  return (
    <DetailPageWrapper
      backTo="/articles"
      backLabel="Back to Articles"
      relatedLinks={[
        { label: 'Farming Planner', to: '/articles/farming', description: 'Where to farm this item' },
        { label: 'Mall Shop', to: '/mall-items', description: 'Check shop availability' },
        { label: 'Black Market', to: '/tools/black-market', description: 'Check black market deals' },
        { label: 'Loot Table Oracle', to: '/tools/loot-oracle', description: 'Drop rate analysis' },
        { label: 'Global Search', to: `/search?q=${encodeURIComponent(article?.name || '')}`, description: 'Search all references' },
      ]}
      rawData={article}
      rawTitle={`Raw JSON Database Entry: Item/Article #${article.id}`}
    >
      {/* Main specification panel */}
      <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-subtle font-bold bg-bg px-2 py-0.5 rounded">
              ID: {article.id}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getQualityColorClass(article.quality)}`}>
              {getQualityLabel(article.quality)}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-text">
            {article.name || `Article #${article.id}`}
          </h1>

          {article.function_desc && (
            <div className="p-4 rounded-xl bg-violet-500/5 dark:bg-violet-950/20 border border-violet-100/50 dark:border-violet-950/50">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Effects & Functionality</span>
              <p className="mt-1 text-sm text-muted leading-relaxed italic">
                "{article.function_desc}"
              </p>
            </div>
          )}

          {/* Expand attributes */}
          {article.expands && (
            <div className="space-y-1.5 p-4 rounded-xl bg-bg/50 dark:bg-bg/40 border border-border/50 dark:border-border">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-subtle">Expanded Metadata Parameters</span>
              <div className="text-xs font-mono text-muted dark:text-subtle bg-bg/50 dark:bg-bg p-2.5 rounded border border-border">
                {typeof article.expands === 'object' ? (
                  <pre className="overflow-x-auto">{JSON.stringify(article.expands, null, 2)}</pre>
                ) : (
                  <span>{article.expands}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Specs Identity Card */}
        <div className="w-full md:w-64 border border-border rounded-xl p-4 bg-bg/50 space-y-3 shrink-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-subtle border-b border-border pb-1.5">Item Properties</h4>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
            <div>
              <span className="text-subtle block mb-0.5">Major Category</span>
              <span className="font-semibold text-muted">{getMajorTypeLabel(article.major_type)}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Minor Category</span>
              <span className="font-semibold text-muted">{getMinorTypeLabel(article.major_type, article.minor_type)}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Required Level</span>
              <span className="font-semibold text-muted">Level {article.level ?? 0}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Sort Priority</span>
              <span className="font-semibold text-muted">{article.sort ?? 0}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Max Overlay</span>
              <span className="font-semibold text-muted">{article.overlay_number ?? 1}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Bind Mode</span>
              <span className="font-semibold text-muted">{article.bind_mode === 1 ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Buy Price</span>
              <span className="font-semibold text-amber-600 font-mono">{(article.cost_price ?? 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Sell Price</span>
              <span className="font-semibold text-muted font-mono">{(article.sell_price ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mechanics specs */}
      <div className="p-4 border border-border bg-surface rounded-xl text-xs space-y-3">
        <h4 className="font-semibold text-text">System Functional Offsets</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-subtle block mb-0.5">Item Functional Action</span>
            <span className="font-mono font-semibold text-muted">Action #{article.item_function ?? 0}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5">Action Trigger Value</span>
            <span className="font-mono font-semibold text-muted">Val: {article.function_value ?? 0}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5">Card Type ID</span>
            <span className="font-mono font-semibold text-muted">Card: {article.card_type ?? 0}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5">Obtain Code</span>
            <span className="font-mono font-semibold text-muted">Code: {article.obtain ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Sourcing & Relationships */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mall Sourcing */}
        <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
            <ShoppingCart size={18} className="text-violet-500" />
            <span>Available in Cash Shop</span>
          </h3>

          {sellers.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {sellers.map((mallItem) => (
                <div
                  key={mallItem.id}
                  className="p-3 border border-border rounded-lg flex items-center justify-between text-sm hover:bg-hover/30 transition-colors"
                >
                  <div>
                    <span className="font-bold text-text">{mallItem.name}</span>
                    <span className="block text-[11px] text-subtle">Mall ID: {mallItem.id} | VIP Required: {mallItem.vip}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-subtle font-medium">Hot Price</span>
                    <span className="font-mono font-bold text-amber-600">{(mallItem.hotprice || mallItem.gold || 0).toLocaleString()} Gold</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-subtle italic py-2 flex items-center gap-1.5">
              <AlertCircle size={14} />
              <span>This item is not directly sold in any Mall Shop rows.</span>
            </div>
          )}
        </div>

        {/* Quest/Drop Sourcing */}
        <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
            <AwardIcon size={18} className="text-indigo-500" />
            <span>Awarded by Quests</span>
          </h3>

          {(awardingQuests.story.length > 0 || awardingQuests.daily.length > 0) ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {/* Story quests */}
              {awardingQuests.story.map((quest) => (
                <Link
                  key={`story-${quest.id}`}
                  to={`/story-quests/${quest.id}`}
                  className="p-3 border border-border rounded-lg flex items-center justify-between hover:border-indigo-500 hover:shadow-sm transition-all text-sm block"
                >
                  <div>
                    <span className="font-bold text-text hover:text-indigo-600 transition-colors">{quest.name}</span>
                    <p className="text-[11px] text-subtle truncate max-w-xs">{quest.description || 'No story quest description.'}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase">
                    Story
                  </span>
                </Link>
              ))}

              {/* Daily quests */}
              {awardingQuests.daily.map((quest) => (
                <Link
                  key={`daily-${quest.id}`}
                  to={`/daily-quests/${quest.id}`}
                  className="p-3 border border-border rounded-lg flex items-center justify-between hover:border-orange-500 hover:shadow-sm transition-all text-sm block"
                >
                  <div>
                    <span className="font-bold text-text hover:text-orange-600 transition-colors">{quest.task_name}</span>
                    <p className="text-[11px] text-subtle truncate max-w-xs">{quest.description}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-[10px] text-orange-600 dark:text-orange-400 font-semibold uppercase">
                    Daily
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-sm text-subtle italic py-2 flex items-center gap-1.5">
              <AlertCircle size={14} />
              <span>This item is not a direct quest reward in any rows.</span>
            </div>
          )}
        </div>

        {/* Stage Sourcing */}
        <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
            <Swords size={18} className="text-rose-500" />
            <span>Dropped from Stages</span>
          </h3>

          {awardingStages.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {awardingStages.map((stage) => (
                <Link
                  key={stage.id}
                  to={`/stages/${stage.id}`}
                  className="p-3 border border-border rounded-lg flex items-center justify-between hover:border-rose-500 hover:shadow-sm transition-all text-sm block"
                >
                  <div>
                    <span className="font-bold text-text hover:text-rose-600 transition-colors">{stage.name}</span>
                    <span className="block text-[11px] text-subtle">Req Level: Lv. {stage.level} | Hardness: {stage.hard}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-[10px] text-rose-600 dark:text-rose-450 font-semibold uppercase">
                    Stage
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-sm text-subtle italic py-2 flex items-center gap-1.5">
              <AlertCircle size={14} />
              <span>This item is not listed as loot from any stages.</span>
            </div>
          )}
        </div>
      </div>

      {/* Event & Activity Obtain Sources */}
      {(() => {
        const sources = getActivitiesAwardingArticle(awardsList, activityDetails, article.id, promos);
        if (sources.length === 0) return null;
        return (
          <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
            <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
              <Activity size={18} className="text-emerald-500" />
              <span>Event & Activity Obtain Sources</span>
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {sources.map((src, i) => {
                const content = (
                  <div className="p-3 border border-border rounded-lg flex items-center justify-between text-sm">
                    <div>
                      <span className="font-bold text-text">
                        {src.activityDisplayName || src.activityName}
                      </span>
                      <span className="block text-[11px] text-subtle">
                        {src.mechanism} · {src.className}
                        {src.limitLabel && ` · ${src.limitLabel}`}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                      {src.costLabel}
                    </span>
                  </div>
                );
                return src.promoId ? (
                  <Link key={i} to={`/promotions/${src.promoId}`} className="block hover:border-emerald-500 hover:shadow-sm transition-all rounded-lg">
                    {content}
                  </Link>
                ) : (
                  <div key={i}>{content}</div>
                );
              })}
            </div>
          </div>
        );
      })()}

    </DetailPageWrapper>
  );
};
