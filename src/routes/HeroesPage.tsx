import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadHeroes } from '../data/loaders';
import { Hero } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Users } from 'lucide-react';
import { getProfessionLabel } from '../data/relationships';

export const getQualityLabel = (quality: number | null): string => {
  if (quality === null) return 'Unknown';
  switch (quality) {
    case 1: return 'White (C)';
    case 2: return 'Green (B)';
    case 3: return 'Blue (A)';
    case 4: return 'Purple (S)';
    case 5: return 'Orange (SS)';
    case 6: return 'Red (SSS)';
    case 7: return 'Golden (UR)';
    default: return `Quality ${quality}`;
  }
};

export const getQualityColorClass = (quality: number | null): string => {
  if (quality === null) return 'bg-surface text-muted';
  switch (quality) {
    case 1: return 'bg-bg text-text dark:bg-surface dark:text-zinc-200 border border-border/20';
    case 2: return 'bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-400 border border-green-200/30';
    case 3: return 'bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/30';
    case 4: return 'bg-purple-100 text-purple-900 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/30';
    case 5: return 'bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/30';
    case 6: return 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-400 border border-red-200/30';
    case 7: return 'bg-yellow-100 text-yellow-950 dark:bg-yellow-950/40 dark:text-yellow-300 border border-yellow-200/30';
    default: return 'bg-surface text-muted';
  }
};

export const HeroesPage: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [selectedProfession, setSelectedProfession] = useState<string>('all');
  const [selectedIsMain, setSelectedIsMain] = useState<string>('all');

  const navigate = useNavigate();

  const fetchHeroesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadHeroes();
      setHeroes(data.rows);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load heroes database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeroesData();
  }, []);

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
  ], []);

  const handleRowClick = (hero: Hero) => {
    navigate(`/heroes/${hero.id}`);
  };

  if (loading) return <LoadingState message="Downloading heroes and growth models..." />;
  if (error) return <ErrorState message={error} onRetry={fetchHeroesData} />;

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

      {/* Reusable filters bar */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Quality</label>
          <select
            value={selectedQuality}
            onChange={(e) => setSelectedQuality(e.target.value)}
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
            onChange={(e) => setSelectedProfession(e.target.value)}
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
            onChange={(e) => setSelectedIsMain(e.target.value)}
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
      />
    </div>
  );
};
