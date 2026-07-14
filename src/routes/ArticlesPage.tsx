import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadArticles } from '../data/loaders';
import { Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Package } from 'lucide-react';
import { getQualityColorClass, getQualityLabel } from '../utils/quality';
import { getMajorTypeLabel, getMinorTypeLabel } from '../data/relationships';

export const ArticlesPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const selectedQuality = searchParams.get('quality') || 'all';
  const selectedMajorType = searchParams.get('majorType') || 'all';
  const selectedLevel = searchParams.get('level') || 'all';

  const updateFilter = (key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === 'all' || value === '') next.delete(key);
      else next.set(key, value);
      return next;
    });
  };
  const updateSearch = (val: string) => updateFilter('q', val);

  const navigate = useNavigate();

  const fetchArticlesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadArticles();
      setArticles(data.rows);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load articles/items database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticlesData();
  }, []);

  const uniqueQualities = useMemo(() => Array.from(new Set(articles.map(a => a.quality).filter((q): q is number => typeof q === 'number'))), [articles]);
  const uniqueMajorTypes = useMemo(() => Array.from(new Set(articles.map(a => a.major_type).filter((m): m is number => typeof m === 'number'))), [articles]);
  const uniqueLevels = useMemo(() => Array.from(new Set(articles.map(a => a.level).filter((l): l is number => typeof l === 'number'))), [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      if (selectedQuality !== 'all' && art.quality !== parseInt(selectedQuality)) return false;
      if (selectedMajorType !== 'all' && art.major_type !== parseInt(selectedMajorType)) return false;
      if (selectedLevel !== 'all' && art.level !== parseInt(selectedLevel)) return false;
      return true;
    });
  }, [articles, selectedQuality, selectedMajorType, selectedLevel]);

  const columns = useMemo<ColumnDef<Article>[]>(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: (info) => <span className="font-mono text-muted font-semibold">{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Item Name',
      cell: (info) => (
        <span className="font-bold text-text hover:text-violet-600 transition-colors">
          {info.getValue() as string || `Item #${info.row.original.id}`}
        </span>
      ),
    },
    {
      accessorKey: 'quality',
      header: 'Quality',
      cell: (info) => {
        const val = info.getValue() as number | null;
        return (
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${getQualityColorClass(val)}`}>
            {getQualityLabel(val)}
          </span>
        );
      },
    },
    {
      accessorKey: 'major_type',
      header: 'Major Type',
      cell: (info) => {
        const val = info.getValue() as number | null;
        return <span className="text-xs font-semibold text-muted">{getMajorTypeLabel(val)}</span>;
      },
    },
    {
      accessorKey: 'minor_type',
      header: 'Minor Type',
      cell: (info) => {
        const row = info.row.original;
        return <span className="text-xs font-semibold text-subtle">{getMinorTypeLabel(row.major_type, row.minor_type)}</span>;
      },
    },
    {
      accessorKey: 'level',
      header: 'Req. Level',
      cell: (info) => <span className="font-mono text-xs">{info.getValue() as number || 0}</span>,
    },
    {
      accessorKey: 'cost_price',
      header: 'Buy Price',
      cell: (info) => <span className="font-mono text-xs text-amber-700 dark:text-amber-400 font-bold">{(info.getValue() as number || 0).toLocaleString()}</span>,
    },
    {
      accessorKey: 'sell_price',
      header: 'Sell Price',
      cell: (info) => <span className="font-mono text-xs text-muted font-semibold">{(info.getValue() as number || 0).toLocaleString()}</span>,
    },
    {
      accessorKey: 'function_desc',
      header: 'Function / Effects Description',
      cell: (info) => {
        const desc = info.getValue() as string | null;
        return (
          <p className="max-w-md truncate text-xs text-muted italic" title={desc || ''}>
            {desc || 'No item effect specified.'}
          </p>
        );
      },
    },
  ], []);

  const handleRowClick = (article: Article) => {
    navigate(`/articles/${article.id}`);
  };

  if (loading) return <LoadingState message="Downloading item registry and expanded parameters..." />;
  if (error) return <ErrorState message={error} onRetry={fetchArticlesData} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl">
            <Package size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text dark:text-zinc-100">Articles & Items</h1>
            <p className="text-sm text-muted">Explore gear items, weapons, materials, currency bags, and raw item metrics.</p>
          </div>
        </div>
      </div>

      {/* Filter widgets */}
      <div className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Quality Tier</label>
          <select
            value={selectedQuality}
            onChange={(e) => updateFilter('quality', e.target.value)}
            className="block w-full py-1.5 px-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-1.5 focus:ring-violet-500 cursor-pointer"
          >
            <option value="all">All Qualities</option>
            {uniqueQualities.sort((a,b)=>a-b).map(q => (
              <option key={q} value={String(q)}>{getQualityLabel(q)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Major Category</label>
          <select
            value={selectedMajorType}
            onChange={(e) => updateFilter('majorType', e.target.value)}
            className="block w-full py-1.5 px-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-1.5 focus:ring-violet-500 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {uniqueMajorTypes.sort((a,b)=>a-b).map(m => (
              <option key={m} value={String(m)}>{getMajorTypeLabel(m)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Required Level</label>
          <select
            value={selectedLevel}
            onChange={(e) => updateFilter('level', e.target.value)}
            className="block w-full py-1.5 px-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-1.5 focus:ring-violet-500 cursor-pointer"
          >
            <option value="all">All Levels</option>
            {uniqueLevels.sort((a,b)=>a-b).map(l => (
              <option key={l} value={String(l)}>Level {l}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredArticles}
        searchPlaceholder="Filter items by name or effects description..."
        onRowClick={handleRowClick}
        filterValue={searchQuery}
        onFilterChange={updateSearch}
      />
    </div>
  );
};
