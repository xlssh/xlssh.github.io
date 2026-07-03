import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStages } from '../data/loaders';
import { Stage } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Swords } from 'lucide-react';

export const StagesPage: React.FC = () => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedHard, setSelectedHard] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const navigate = useNavigate();

  const fetchStagesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadStages();
      setStages(data.rows);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load stages database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStagesData();
  }, []);

  const uniqueHardness = useMemo(() => Array.from(new Set(stages.map(s => s.hard).filter((h): h is string => typeof h === 'string'))), [stages]);
  const uniqueLevels = useMemo(() => Array.from(new Set(stages.map(s => s.level).filter((l): l is number => typeof l === 'number'))), [stages]);

  const filteredStages = useMemo(() => {
    return stages.filter(s => {
      if (selectedHard !== 'all' && s.hard !== selectedHard) return false;
      if (selectedLevel !== 'all' && s.level !== parseInt(selectedLevel)) return false;
      return true;
    });
  }, [stages, selectedHard, selectedLevel]);

  const columns = useMemo<ColumnDef<Stage>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Stage ID',
      cell: (info) => <span className="font-mono text-muted font-semibold">{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Stage Name',
      cell: (info) => (
        <span className="font-bold text-text hover:text-violet-600 transition-colors">
          {info.getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: 'hard',
      header: 'Difficulty',
      cell: (info) => {
        const hardVal = info.getValue() as string;
        const color = hardVal === 'Easy'
          ? 'bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-400'
          : hardVal === 'Hard'
          ? 'bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-400'
          : 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-400';
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${color}`}>
            {hardVal || 'Unknown'}
          </span>
        );
      },
    },
    {
      accessorKey: 'level',
      header: 'Target Level',
      cell: (info) => <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">Lv. {info.getValue() as number}</span>,
    },
    {
      accessorKey: 'start_id',
      header: 'Start Node ID',
      cell: (info) => <span className="font-mono text-xs text-subtle">{info.getValue() as number || 0}</span>,
    },
    {
      accessorKey: 'end_id',
      header: 'End Node ID',
      cell: (info) => <span className="font-mono text-xs text-subtle">{info.getValue() as number || 0}</span>,
    },
    {
      accessorKey: 'desc',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string | null;
        return (
          <p className="max-w-md truncate text-xs text-muted italic font-medium" title={desc || ''}>
            {desc || 'No description available.'}
          </p>
        );
      },
    },
  ], []);

  const handleRowClick = (stage: Stage) => {
    navigate(`/stages/${stage.id}`);
  };

  if (loading) return <LoadingState message="Downloading combat stage models and loot registries..." />;
  if (error) return <ErrorState message={error} onRetry={fetchStagesData} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl">
            <Swords size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text dark:text-zinc-100">Battle Stages</h1>
            <p className="text-sm text-muted">Inspect instances, clear drops, unlock parameters, and progression level requirements.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Difficulty</label>
          <select
            value={selectedHard}
            onChange={(e) => setSelectedHard(e.target.value)}
            className="block w-full py-1.5 px-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-1.5 focus:ring-violet-500 cursor-pointer"
          >
            <option value="all">All Difficulties</option>
            {uniqueHardness.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Target Level</label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
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
        data={filteredStages}
        searchPlaceholder="Filter stages by name or description..."
        onRowClick={handleRowClick}
      />
    </div>
  );
};
