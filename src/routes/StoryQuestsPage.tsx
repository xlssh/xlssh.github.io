import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStoryQuests } from '../data/loaders';
import { StoryQuest } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { BookOpen } from 'lucide-react';

export const StoryQuestsPage: React.FC = () => {
  const [quests, setQuests] = useState<StoryQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');

  const navigate = useNavigate();

  const fetchQuestsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadStoryQuests();
      setQuests(data.rows);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load story quests database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestsData();
  }, []);

  const uniqueTypes = useMemo(() => Array.from(new Set(quests.map(q => q.type).filter(t => t !== null))), [quests]);
  const uniqueEventTypes = useMemo(() => Array.from(new Set(quests.map(q => q.event_type).filter(e => e !== null))), [quests]);

  const filteredQuests = useMemo(() => {
    return quests.filter(q => {
      if (selectedType !== 'all' && q.type !== parseInt(selectedType)) return false;
      if (selectedEventType !== 'all' && q.event_type !== parseInt(selectedEventType)) return false;
      return true;
    });
  }, [quests, selectedType, selectedEventType]);

  const columns = useMemo<ColumnDef<StoryQuest>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Quest ID',
      cell: (info) => <span className="font-mono text-muted font-semibold">{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Quest Name',
      cell: (info) => (
        <span className="font-bold text-text hover:text-violet-600 transition-colors">
          {info.getValue() as string || `Quest #${info.row.original.id}`}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: (info) => <span className="text-xs font-semibold text-muted">Type {info.getValue() as number}</span>,
    },
    {
      accessorKey: 'event_type',
      header: 'Event Type',
      cell: (info) => <span className="text-xs font-semibold text-subtle">Event {info.getValue() as number}</span>,
    },
    {
      accessorKey: 'gate',
      header: 'Req. Gate',
      cell: (info) => <span className="font-mono text-xs">{info.getValue() as number || 0}</span>,
    },
    {
      accessorKey: 'point',
      header: 'Target Point',
      cell: (info) => <span className="font-mono text-xs">{info.getValue() as number || 0}</span>,
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

  const handleRowClick = (quest: StoryQuest) => {
    navigate(`/story-quests/${quest.id}`);
  };

  if (loading) return <LoadingState message="Downloading campaign scripts and quest catalogs..." />;
  if (error) return <ErrorState message={error} onRetry={fetchQuestsData} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text dark:text-zinc-100">Story Quests</h1>
            <p className="text-sm text-muted">Track storyline campaigns, dialog parameters and campaign requirement nodes.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Quest Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="block w-full py-1.5 px-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-1.5 focus:ring-violet-500 cursor-pointer"
          >
            <option value="all">All Types</option>
            {uniqueTypes.sort((a,b)=>a-b).map(t => (
              <option key={t} value={String(t)}>Type {t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Event Action Type</label>
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="block w-full py-1.5 px-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-1.5 focus:ring-violet-500 cursor-pointer"
          >
            <option value="all">All Event Types</option>
            {uniqueEventTypes.sort((a,b)=>a-b).map(et => (
              <option key={et} value={String(et)}>Event Type {et}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredQuests}
        searchPlaceholder="Filter story quests by name or description details..."
        onRowClick={handleRowClick}
      />
    </div>
  );
};
