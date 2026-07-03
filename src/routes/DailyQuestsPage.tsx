import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDailyQuests } from '../data/loaders';
import { DailyQuest } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Calendar } from 'lucide-react';

export const DailyQuestsPage: React.FC = () => {
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchQuestsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadDailyQuests();
      setQuests(data.rows);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load daily quests database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestsData();
  }, []);

  const columns = useMemo<ColumnDef<DailyQuest>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Task ID',
      cell: (info) => <span className="font-mono text-muted font-semibold">{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'task_name',
      header: 'Task Name',
      cell: (info) => (
        <span className="font-bold text-text hover:text-violet-600 transition-colors">
          {info.getValue() as string || `Daily Task #${info.row.original.id}`}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Quest Type',
      cell: (info) => <span className="text-xs font-semibold text-muted">Type {info.getValue() as number}</span>,
    },
    {
      accessorKey: 'event_type',
      header: 'Event Type',
      cell: (info) => <span className="text-xs font-semibold text-subtle">Event {info.getValue() as number}</span>,
    },
    {
      accessorKey: 'point',
      header: 'Activity Points',
      cell: (info) => <span className="font-mono text-xs font-bold text-emerald-600">+{info.getValue() as number || 0}</span>,
    },
    {
      accessorKey: 'rate',
      header: 'Weight Rate',
      cell: (info) => <span className="font-mono text-xs text-subtle">{info.getValue() as number || 0}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string | null;
        return (
          <p className="max-w-md truncate text-xs text-muted italic" title={desc || ''}>
            {desc || 'No description available.'}
          </p>
        );
      },
    },
  ], []);

  const handleRowClick = (quest: DailyQuest) => {
    navigate(`/daily-quests/${quest.id}`);
  };

  if (loading) return <LoadingState message="Downloading daily activity schedule and milestones..." />;
  if (error) return <ErrorState message={error} onRetry={fetchQuestsData} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text dark:text-zinc-100">Daily Quests</h1>
            <p className="text-sm text-muted">Inspect active recurring assignments, execution coefficients and target activity points.</p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={quests}
        searchPlaceholder="Filter daily quests by task name or description..."
        onRowClick={handleRowClick}
      />
    </div>
  );
};
