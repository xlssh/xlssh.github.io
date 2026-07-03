import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loadMallItems, loadArticles } from '../data/loaders';
import { MallItem, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { ShoppingBag } from 'lucide-react';

export const MallItemsPage: React.FC = () => {
  const [mallItems, setMallItems] = useState<MallItem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedVip, setSelectedVip] = useState<string>('all');
  const [selectedHot, setSelectedHot] = useState<string>('all');

  const navigate = useNavigate();

  const fetchMallData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [mallRes, articlesRes] = await Promise.all([
        loadMallItems(),
        loadArticles()
      ]);
      setMallItems(mallRes.rows);
      setArticles(articlesRes.rows);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load mall cash shop database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMallData();
  }, []);

  const filteredMallItems = useMemo(() => {
    return mallItems.filter(item => {
      if (selectedVip !== 'all' && item.vip !== parseInt(selectedVip)) return false;
      if (selectedHot === 'hot' && !item.is_hot) return false;
      if (selectedHot === 'new' && !item.is_new) return false;
      return true;
    });
  }, [mallItems, selectedVip, selectedHot]);

  const uniqueVips = useMemo(() => Array.from(new Set(mallItems.map(m => m.vip).filter(v => v !== null))), [mallItems]);

  const columns = useMemo<ColumnDef<MallItem>[]>(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: (info) => <span className="font-mono text-muted font-semibold">{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Shop Entry Name',
      cell: (info) => (
        <span className="font-bold text-text hover:text-violet-600 transition-colors">
          {info.getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: 'item_id',
      header: 'Linked Item',
      cell: (info) => {
        const itemId = info.getValue() as number;
        const matchingArticle = articles.find(a => a.id === itemId);
        if (!matchingArticle) return <span className="text-subtle font-mono text-xs">Item #{itemId}</span>;
        return (
          <Link
            to={`/articles/${itemId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-violet-600 dark:text-violet-400 hover:underline text-xs font-semibold"
          >
            {matchingArticle.name || `Item #${itemId}`}
          </Link>
        );
      },
    },
    {
      accessorKey: 'gold',
      header: 'Base Gold Price',
      cell: (info) => <span className="font-mono text-xs text-muted">{(info.getValue() as number || 0).toLocaleString()}</span>,
    },
    {
      accessorKey: 'hotprice',
      header: 'Hot/Sale Price',
      cell: (info) => <span className="font-mono text-xs text-amber-600 font-bold">{(info.getValue() as number || 0).toLocaleString()}</span>,
    },
    {
      accessorKey: 'vip',
      header: 'Req. VIP Level',
      cell: (info) => {
        const vipVal = info.getValue() as number;
        if (!vipVal) return <span className="text-subtle italic text-xs">None</span>;
        return <span className="px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-mono font-bold text-xs">VIP {vipVal}</span>;
      },
    },
    {
      accessorKey: 'is_hot',
      header: 'Status',
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex items-center gap-1">
            {row.is_hot ? (
              <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-[10px] font-extrabold uppercase tracking-wide">
                Hot
              </span>
            ) : null}
            {row.is_new ? (
              <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wide">
                New
              </span>
            ) : null}
            {!row.is_hot && !row.is_new ? (
              <span className="text-subtle text-xs">-</span>
            ) : null}
          </div>
        );
      },
    },
  ], [articles]);

  const handleRowClick = (item: MallItem) => {
    navigate(`/mall-items/${item.id}`);
  };

  if (loading) return <LoadingState message="Downloading mall merchandise lists and discount vectors..." />;
  if (error) return <ErrorState message={error} onRetry={fetchMallData} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text dark:text-zinc-100">Mall Cash Shop</h1>
            <p className="text-sm text-muted">Compare item package pricing, VIP purchase barriers, limits and bundles.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">VIP Tier Limit</label>
          <select
            value={selectedVip}
            onChange={(e) => setSelectedVip(e.target.value)}
            className="block w-full py-1.5 px-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-1.5 focus:ring-violet-500 cursor-pointer"
          >
            <option value="all">All VIP Ranks</option>
            {uniqueVips.sort((a,b)=>a-b).map(v => (
              <option key={v} value={String(v)}>VIP Rank {v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Shop Tag</label>
          <select
            value={selectedHot}
            onChange={(e) => setSelectedHot(e.target.value)}
            className="block w-full py-1.5 px-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-1.5 focus:ring-violet-500 cursor-pointer"
          >
            <option value="all">All Entries</option>
            <option value="hot">Hot Sellers Only</option>
            <option value="new">Newly Added Only</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredMallItems}
        searchPlaceholder="Filter shop merchandise items by package name..."
        onRowClick={handleRowClick}
      />
    </div>
  );
};
