import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadEnemies } from '../data/loaders';
import { Enemy } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Shield, Swords, Info } from 'lucide-react';
import { getProfessionLabel } from '../data/relationships';
import { getQualityLabel, getQualityColorClass } from '../utils/quality';
import { useAsyncData } from '../hooks/useAsyncData';

export const EnemyCodexPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedQuality = searchParams.get('quality') || 'all';
  const selectedProfession = searchParams.get('profession') || 'all';
  const selectedCategory = searchParams.get('category') || 'all'; // all, normal, boss
  const searchQuery = searchParams.get('q') || '';
  const minLevelStr = searchParams.get('minLevel') || '';
  const maxLevelStr = searchParams.get('maxLevel') || '';

  const { data: enemiesData, loading, error, refetch } = useAsyncData(async () => {
    const res = await loadEnemies();
    return res.rows;
  }, []);

  const enemies = enemiesData || [];

  const updateFilter = (key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === 'all' || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    });
  };

  // Compute unique filters dynamically from data
  const uniqueQualities = useMemo(() => {
    return Array.from(new Set(enemies.map(e => e.quality).filter((q): q is number => typeof q === 'number'))).sort((a, b) => a - b);
  }, [enemies]);

  const uniqueProfessions = useMemo(() => {
    return Array.from(new Set(enemies.map(e => e.profession).filter((p): p is number => typeof p === 'number'))).sort((a, b) => a - b);
  }, [enemies]);

  // Apply filters in memory BEFORE sending to DataTable to keep table render fast for 19,900 rows
  const filteredEnemies = useMemo(() => {
    const minLvl = parseInt(minLevelStr) || 0;
    const maxLvl = parseInt(maxLevelStr) || 999;

    return enemies.filter(enemy => {
      if (selectedQuality !== 'all' && enemy.quality !== parseInt(selectedQuality)) return false;
      if (selectedProfession !== 'all' && enemy.profession !== parseInt(selectedProfession)) return false;
      if (selectedCategory === 'boss' && !enemy.is_boss) return false;
      if (selectedCategory === 'normal' && enemy.is_boss) return false;
      
      const level = enemy.level || 0;
      if (level < minLvl || level > maxLvl) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = enemy.name?.toLowerCase().includes(q);
        const idMatch = String(enemy.id).includes(q);
        if (!nameMatch && !idMatch) return false;
      }

      return true;
    });
  }, [enemies, selectedQuality, selectedProfession, selectedCategory, searchQuery, minLevelStr, maxLevelStr]);

  const columns = useMemo<ColumnDef<Enemy>[]>(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: (info) => <span className="font-mono text-xs text-muted font-bold">#{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info) => {
        const row = info.row.original;
        return (
          <span className="font-bold text-text hover:text-brand transition-colors block">
            {row.name || `Enemy #${row.id}`}
          </span>
        );
      },
    },
    {
      accessorKey: 'is_boss',
      header: 'Tier',
      cell: (info) => {
        const isBoss = info.getValue() as boolean;
        return isBoss ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/20">
            Boss
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-bg text-muted border border-border/50">
            Normal
          </span>
        );
      },
    },
    {
      accessorKey: 'quality',
      header: 'Quality',
      cell: (info) => {
        const q = info.getValue() as number;
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getQualityColorClass(q)}`}>
            {getQualityLabel(q)}
          </span>
        );
      },
    },
    {
      accessorKey: 'profession',
      header: 'Class',
      cell: (info) => {
        const p = info.getValue() as number;
        return <span className="text-xs font-semibold text-muted">{getProfessionLabel(p)}</span>;
      },
    },
    {
      accessorKey: 'level',
      header: 'Level',
      cell: (info) => <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">Lv. {info.getValue() as number}</span>,
    },
    {
      accessorKey: 'hp',
      header: 'HP Max',
      cell: (info) => <span className="font-mono text-xs text-muted">{(info.getValue() as number || 0).toLocaleString()}</span>,
    },
    {
      accessorKey: 'speed',
      header: 'Speed',
      cell: (info) => <span className="font-mono text-xs text-muted">{info.getValue() as number || 0}</span>,
    },
  ], []);

  const handleRowClick = (enemy: Enemy) => {
    navigate(`/tools/enemy-codex/${enemy.id}`);
  };

  if (loading) return <LoadingState message="Scanning geo-coordinates and cataloging enemies..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text">Enemy Codex & Monster Encyclopedia</h1>
            <p className="text-xs text-muted">Filterable and searchable catalog covering {enemies.length.toLocaleString()} combat entities.</p>
          </div>
        </div>
      </div>

      {/* Advanced filters bar */}
      <div className="p-4 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-subtle flex items-center gap-1">
          <Info size={14} className="text-brand" />
          <span>Refine Codex Query Parameters</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Category */}
          <div className="space-y-1">
            <label className="text-subtle font-semibold block">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="w-full px-3 py-1.5 border border-border rounded-xl bg-bg text-text focus:outline-none focus:ring-1 focus:ring-brand font-medium"
            >
              <option value="all">All Tiers</option>
              <option value="normal">Normal Only</option>
              <option value="boss">Boss Only</option>
            </select>
          </div>

          {/* Quality */}
          <div className="space-y-1">
            <label className="text-subtle font-semibold block">Quality Tier</label>
            <select
              value={selectedQuality}
              onChange={(e) => updateFilter('quality', e.target.value)}
              className="w-full px-3 py-1.5 border border-border rounded-xl bg-bg text-text focus:outline-none focus:ring-1 focus:ring-brand font-medium"
            >
              <option value="all">All Qualities</option>
              {uniqueQualities.map(q => (
                <option key={q} value={String(q)}>{getQualityLabel(q)}</option>
              ))}
            </select>
          </div>

          {/* Profession */}
          <div className="space-y-1">
            <label className="text-subtle font-semibold block">Class Archetype</label>
            <select
              value={selectedProfession}
              onChange={(e) => updateFilter('profession', e.target.value)}
              className="w-full px-3 py-1.5 border border-border rounded-xl bg-bg text-text focus:outline-none focus:ring-1 focus:ring-brand font-medium"
            >
              <option value="all">All Classes</option>
              {uniqueProfessions.map(p => (
                <option key={p} value={String(p)}>{getProfessionLabel(p)}</option>
              ))}
            </select>
          </div>

          {/* Min Level */}
          <div className="space-y-1">
            <label className="text-subtle font-semibold block">Minimum Level</label>
            <input
              type="number"
              min={1}
              max={200}
              placeholder="Min Level"
              value={minLevelStr}
              onChange={(e) => updateFilter('minLevel', e.target.value)}
              className="w-full px-3 py-1.5 border border-border rounded-xl bg-bg text-text focus:outline-none focus:ring-1 focus:ring-brand font-mono"
            />
          </div>

          {/* Max Level */}
          <div className="space-y-1">
            <label className="text-subtle font-semibold block">Maximum Level</label>
            <input
              type="number"
              min={1}
              max={200}
              placeholder="Max Level"
              value={maxLevelStr}
              onChange={(e) => updateFilter('maxLevel', e.target.value)}
              className="w-full px-3 py-1.5 border border-border rounded-xl bg-bg text-text focus:outline-none focus:ring-1 focus:ring-brand font-mono"
            />
          </div>
        </div>
      </div>

      {/* Main Records Table */}
      <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm">
        <DataTable
          columns={columns}
          data={filteredEnemies}
          searchPlaceholder="Search enemy by name or exact database ID…"
          filterValue={searchQuery}
          onFilterChange={(val) => updateFilter('q', val)}
          onRowClick={handleRowClick}
          pageSize={15}
        />
      </div>
    </div>
  );
};
