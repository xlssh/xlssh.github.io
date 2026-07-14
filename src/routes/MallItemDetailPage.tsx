import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadMallItems, loadArticles } from '../data/loaders';
import { MallItem, Article } from '../types/db';
import { getMajorTypeLabel } from '../data/relationships';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { ShoppingBag, ShieldAlert, Sparkles, Tag, ArrowRight } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import { DetailPageWrapper } from '../components/DetailPageWrapper';

export const MallItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data, loading, error, refetch } = useAsyncData(async () => {
    const itemId = parseInt(id || '');

    const [mallRes, articlesRes] = await Promise.all([
      loadMallItems(),
      loadArticles()
    ]);

    const match = mallRes.rows.find(m => m.id === itemId);
    if (!match) {
      throw new Error(`Mall shop item with ID ${id} not found in database.`);
    }

    return {
      mallItem: match,
      articles: articlesRes.rows
    };
  }, [id]);

  const mallItem = data?.mallItem;
  const articles = data?.articles || [];

  const linkedArticle = useMemo(() => {
    if (!mallItem || !mallItem.item_id) return null;
    return articles.find(a => a.id === mallItem.item_id) || null;
  }, [mallItem, articles]);

  if (loading) return <LoadingState message="Downloading merchandise properties and price indexes..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!mallItem) return <ErrorState message="Shop item not found." onRetry={refetch} />;

  return (
    <DetailPageWrapper
      backTo="/mall-items"
      backLabel="Back to Mall Items"
      relatedLinks={[
        { label: 'Mall Shop', to: '/mall-items', description: 'Browse all items' },
        { label: 'Mall Analytics', to: '/mall-items/analytics', description: 'Price and sales graphs' },
        { label: 'Black Market', to: '/tools/black-market', description: 'Black market sales' },
      ]}
      rawData={mallItem}
      rawTitle={`Raw JSON Database Entry: MallItem #${mallItem.id}`}
    >
      {/* Main Panel */}
      <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-subtle font-bold bg-bg px-2 py-0.5 rounded">
              ID: {mallItem.id}
            </span>
            <span className="px-2 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-400 text-xs font-bold uppercase tracking-wider">
              Mall Merchandise
            </span>
            {mallItem.is_hot ? (
              <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-[10px] font-extrabold uppercase">
                Hot Seller
              </span>
            ) : null}
            {mallItem.is_new ? (
              <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[10px] font-extrabold uppercase">
                New Arrival
              </span>
            ) : null}
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-text flex items-center gap-2">
            <ShoppingBag size={28} className="text-fuchsia-500" />
            <span>{mallItem.name || `Shop Item #${mallItem.id}`}</span>
          </h1>

          {linkedArticle && (
            <div className="p-4 rounded-xl bg-violet-500/5 dark:bg-violet-950/20 border border-violet-100/50 dark:border-violet-950/50 space-y-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Delivered Item Specs</span>
              <div className="flex items-center justify-between text-sm bg-surface border border-border p-3 rounded-lg">
                <div>
                  <Link
                    to={`/articles/${linkedArticle.id}`}
                    className="font-bold text-violet-600 hover:underline inline-flex items-center gap-1.5"
                  >
                    <span>{linkedArticle.name}</span>
                    <ArrowRight size={14} />
                  </Link>
                  <p className="text-xs text-muted mt-1">{linkedArticle.function_desc || 'No functional desc.'}</p>
                </div>
                <span className="text-xs font-mono text-subtle">ID: {linkedArticle.id}</span>
              </div>
            </div>
          )}
        </div>

        {/* Shop parameters */}
        <div className="w-full md:w-64 border border-border rounded-xl p-4 bg-bg/50 space-y-3 shrink-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-subtle border-b border-border pb-1.5">Shop Properties</h4>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
            <div>
              <span className="text-subtle block mb-0.5 font-sans font-semibold">Model Category</span>
              <span className="font-semibold text-muted">Model {mallItem.model}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5 font-sans font-semibold">Major Category</span>
              <span className="font-semibold text-muted">{getMajorTypeLabel(mallItem.major_type)}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5 font-sans font-semibold">Item Category Tag</span>
              <span className="font-semibold text-muted font-mono">#{mallItem.type_str ?? 'None'}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5 font-sans font-semibold">Minimum Level</span>
              <span className="font-semibold text-muted font-mono">Lv. {mallItem.level ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Analysis */}
      <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
          <Tag size={18} className="text-fuchsia-500" />
          <span>Pricing Comparison Vector</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3 border border-border bg-bg/20 rounded-lg">
            <span className="text-xs text-subtle block mb-0.5 font-sans font-semibold">Base Gold Price</span>
            <span className="font-mono font-bold text-muted dark:text-zinc-350">{(mallItem.gold ?? 0).toLocaleString()} Gold</span>
          </div>
          <div className="p-3 border border-border bg-bg/20 rounded-lg">
            <span className="text-xs text-subtle block mb-0.5 font-sans font-semibold">Sale Hot Price</span>
            <span className="font-mono font-black text-amber-600">{(mallItem.hotprice ?? 0).toLocaleString()} Gold</span>
          </div>
          <div className="p-3 border border-border bg-bg/20 rounded-lg">
            <span className="text-xs text-subtle block mb-0.5 font-sans font-semibold">Sale Discount Ratio</span>
            <span className="font-mono font-bold text-emerald-600">-{mallItem.discount ?? 0}% Discount</span>
          </div>
          <div className="p-3 border border-border bg-bg/20 rounded-lg">
            <span className="text-xs text-subtle block mb-0.5 font-sans font-semibold">Integrative Points</span>
            <span className="font-mono font-bold text-muted dark:text-zinc-350">+{mallItem.integration ?? 0} Pts</span>
          </div>
        </div>
      </div>

      {/* Constraints and quotas */}
      <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
          <ShieldAlert size={18} className="text-amber-500" />
          <span>Purchase Quotas & Requirements</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Required VIP Rank</span>
            <span className="font-semibold text-muted">
              {mallItem.vip ? (
                <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400 font-bold rounded">
                  VIP Rank {mallItem.vip}
                </span>
              ) : (
                'None'
              )}
            </span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">VIP Exclusive Item?</span>
            <span className="font-semibold text-muted">{mallItem.is_vip ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Daily Buying Limits</span>
            <span className="font-semibold text-muted">{mallItem.times ? `${mallItem.times} per day` : 'Unlimited'}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Global Total Limits</span>
            <span className="font-semibold text-muted">{mallItem.total_times ? `${mallItem.total_times} purchases` : 'Unlimited'}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Delivered Amount</span>
            <span className="font-semibold text-muted">x{mallItem.amount ?? 1}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Honor Coins Cost</span>
            <span className="font-semibold text-muted">{(mallItem.honour ?? 0).toLocaleString()} Honor</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Is Display Active?</span>
            <span className="font-semibold text-muted">{mallItem.is_display ? 'Active' : 'Disabled'}</span>
          </div>
        </div>
      </div>

      {/* Items JSON block if any */}
      {mallItem.items_json && (
        <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
            <Sparkles size={18} className="text-fuchsia-500" />
            <span>Parsed Extra Pack Contents</span>
          </h3>
          <div className="bg-bg p-4 rounded-xl border border-border font-mono text-xs overflow-x-auto">
            <pre>{JSON.stringify(mallItem.items_json, null, 2)}</pre>
          </div>
        </div>
      )}
    </DetailPageWrapper>
  );
};
