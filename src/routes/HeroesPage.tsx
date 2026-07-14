import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadHeroes } from '../data/loaders';
import { Hero } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Users } from 'lucide-react';
import { getProfessionLabel } from '../data/relationships';
import { calcHeroBP } from '../utils/battlePower';
import { useAsyncData } from '../hooks/useAsyncData';
import { getQualityLabel, getQualityColorClass } from '../utils/quality';

export { getQualityLabel, getQualityColorClass } from '../utils/quality';

export const HeroesPage: React.FC = () => {
  const { data, loading, error, refetch } = useAsyncData(async () => {
    const res = await loadHeroes();
    return res.rows;
  }, []);

  const heroes = data || [];

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedQuality = searchParams.get('quality') || 'all';
  const selectedProfession = searchParams.get('profession') || 'all';
  const selectedIsMain = searchParams.get('isMain') || 'all';
  const searchQuery = searchParams.get('q') || '';

  const navigate = useNavigate();

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

  const uniqueQualities = useMemo(() => Array.from(new Set(heroes.map(h => h.quality).filter((q): q is number => typeof q === 'number'))), [heroes]);
  const uniqueProfessions = useMemo(() => Array.from(new Set(heroes.map(h => h.profession).filter((p): p is number => typeof p === 'number'))), [heroes]);

  const filteredHeroes = useMemo(() => {
    return heroes.filter(hero => {
      if (selectedQuality !== 'all' && hero.quality !== parseInt(selectedQuality)) return false;
      if (selectedProfession !== 'all' && hero.profession !== parseInt(selectedProfession)) return false;
      if (selectedIsMain !== 'all') {
        const isMainBool = selectedIsMain === 'true';
        if (Boolean(hero.is_main) !== isMainBool) return false;
      }
      return true;
    });
  }, [heroes, selectedQuality, selectedProfession, selectedIsMain]);

  const columns = useMemo<ColumnDef<Hero>[]>(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: (info) => <span className="font-mono text-muted font-medium">{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info) => {
        const hero = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <span className="font-bold text-text hover:text-brand transition-colors">
              {info.getValue() as string}
            </span>
            {hero.is_main ? (
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-brand-soft text-brand">
                Main
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: 'quality',
      header: 'Quality',
      cell: (info) => {
        const val = info.getValue() as number | null;
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getQualityColorClass(val)}`}>
            {getQualityLabel(val)}
          </span>
        );
      },
    },
    {
      accessorKey: 'profession',
      header: 'Class',
      cell: (info) => {
        const val = info.getValue() as number | null;
        return <span className="font-medium text-xs text-muted">{getProfessionLabel(val)}</span>;
      },
    },
    {
      accessorKey: 'level',
      header: 'LV',
      cell: (info) => <span className="font-mono text-muted">{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'power',
      header: 'Power',
      cell: (info) => <span className="font-mono font-bold text-text">{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'agile',
      header: 'Agile',
      cell: (info) => <span className="font-mono text-muted">{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'intelligence',
      header: 'Intel',
      cell: (info) => <span className="font-mono text-muted">{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'life',
      header: 'HP',
      cell: (info) => <span className="font-mono text-muted">{(info.getValue() as number).toLocaleString()}</span>,
    },
    {
      accessorKey: 'speed',
      header: 'Speed',
      cell: (info) => <span className="font-mono text-muted">{info.getValue() as number}</span>,
    },
    {
      id: 'bp',
      header: 'BP (Lv.1)',
      cell: (info) => {
        const hero = info.row.original;
        const bp = calcHeroBP(hero, 1);
        return <span className="font-mono font-bold text-brand">{bp.toLocaleString()}</span>;
      },
      sortingFn: (rowA, rowB) => calcHeroBP(rowA.original, 1) - calcHeroBP(rowB.original, 1),
    },
  ], []);

  const handleRowClick = (hero: Hero) => {
    navigate(`/heroes/${hero.id}`);
  };

  if (loading) return <LoadingState message="Downloading heroes and growth models..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">Heroes & Characters</h1>
            <p className="text-sm text-muted">Browse fully-detailed statistics, professional traits and growth coefficients.</p>
          </div>
        </div>
      </div>

      {/* Filters bar — URL-persisted */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Quality</label>
          <select
            value={selectedQuality}
            onChange={(e) => updateFilter('quality', e.target.value)}
            className="block w-full py-1.5 px-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-1.5 focus:ring-brand cursor-pointer"
          >
            <option value="all">All Qualities</option>
            {uniqueQualities.sort((a,b)=>a-b).map(q => (
              <option key={q} value={String(q)}>{getQualityLabel(q)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Class / Profession</label>
          <select
            value={selectedProfession}
            onChange={(e) => updateFilter('profession', e.target.value)}
            className="block w-full py-1.5 px-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-1.5 focus:ring-brand cursor-pointer"
          >
            <option value="all">All Classes</option>
            {uniqueProfessions.sort((a,b)=>a-b).map(p => (
              <option key={p} value={String(p)}>{getProfessionLabel(p)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Character Tier</label>
          <select
            value={selectedIsMain}
            onChange={(e) => updateFilter('isMain', e.target.value)}
            className="block w-full py-1.5 px-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-1.5 focus:ring-brand cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="true">Main Characters Only</option>
            <option value="false">Mercenaries Only</option>
          </select>
        </div>
      </section>

      <DataTable
        columns={columns}
        data={filteredHeroes}
        searchPlaceholder="Filter characters by name..."
        onRowClick={handleRowClick}
        filterValue={searchQuery}
        onFilterChange={(val) => updateFilter('q', val)}
      />
    </div>
  );
};
