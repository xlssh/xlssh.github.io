import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadPromotionalActivities } from '../data/loaders';
import { PromotionalActivity } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Flame } from 'lucide-react';

function getTimeTypeLabel(type: number): string {
  switch (type) {
    case 1: return 'Daily Cycle';
    case 2: return 'Weekly Cycle';
    case 3: return 'Fixed Calendar Dates';
    case 4: return 'Minute Cooldown';
    case 5: return 'Server Open Day Cycle';
    default: return `Time Type #${type}`;
  }
}

function getActivityTypeLabel(type: number): string {
  switch (type) {
    case 1: return 'Open Server Challenge';
    case 2: return 'Recharge Reward';
    case 3: return 'Login Gift';
    case 4: return 'Growth Fund';
    case 5: return 'Single Recharge';
    case 6: return 'Total Recharge';
    case 7: return 'Total Spending';
    case 8: return 'Daily Spending';
    case 9: return 'VIP Exclusive Shop';
    case 10: return 'Recruit Event';
    case 11: return 'Tavern Rebate';
    case 12: return 'Stone Merge Event';
    case 13: return 'Gear Collection';
    case 14: return 'Relic Upgrade Event';
    case 15: return 'Butterfly Event';
    case 16: return 'Guild Defense';
    case 17: return 'Circle Trial';
    case 18: return 'Lucky Turntable';
    case 19: return 'Jigsaw Puzzle';
    case 20: return 'Warrior Gacha';
    case 21: return 'Shop Discount';
    case 22: return 'Black Market Sale';
    default: return `Activity Type #${type}`;
  }
}

export const PromotionsPage: React.FC = () => {
  const [promotions, setPromotions] = useState<PromotionalActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedActType, setSelectedEventType] = useState<string>('all');
  const [selectedTimeType, setSelectedTimeType] = useState<string>('all');

  const navigate = useNavigate();

  const fetchPromotionsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadPromotionalActivities();
      setPromotions(data.rows);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load promotional activities database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotionsData();
  }, []);

  const uniqueActTypes = useMemo(() => Array.from(new Set(promotions.map(p => p.act_type).filter(t => t !== null))), [promotions]);
  const uniqueTimeTypes = useMemo(() => Array.from(new Set(promotions.map(p => p.time_type).filter(t => t !== null))), [promotions]);

  const filteredPromotions = useMemo(() => {
    return promotions.filter(p => {
      if (selectedActType !== 'all' && p.act_type !== parseInt(selectedActType)) return false;
      if (selectedTimeType !== 'all' && p.time_type !== parseInt(selectedTimeType)) return false;
      return true;
    });
  }, [promotions, selectedActType, selectedTimeType]);

  const columns = useMemo<ColumnDef<PromotionalActivity>[]>(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: (info) => <span className="font-mono text-zinc-500 font-semibold">{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'act_id',
      header: 'Activity ID',
      cell: (info) => <span className="font-mono text-xs text-zinc-400">#{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Activity Name',
      cell: (info) => (
        <span className="font-bold text-zinc-800 dark:text-zinc-200 hover:text-violet-600 transition-colors">
          {info.getValue() as string || `Activity #${info.row.original.id}`}
        </span>
      ),
    },
    {
      accessorKey: 'act_type',
      header: 'Activity Type',
      cell: (info) => <span className="text-xs font-semibold text-zinc-500">{getActivityTypeLabel(info.getValue() as number)}</span>,
    },
    {
      accessorKey: 'time_type',
      header: 'Time Category',
      cell: (info) => <span className="text-xs font-semibold text-zinc-400">{getTimeTypeLabel(info.getValue() as number)}</span>,
    },
    {
      accessorKey: 'start_time',
      header: 'Start Date/Time',
      cell: (info) => <span className="font-mono text-xs text-zinc-500">{info.getValue() as string || '-'}</span>,
    },
    {
      accessorKey: 'end_time',
      header: 'End Date/Time',
      cell: (info) => <span className="font-mono text-xs text-zinc-500">{info.getValue() as string || '-'}</span>,
    },
    {
      accessorKey: 'player_lv',
      header: 'Req. Level',
      cell: (info) => <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">Lv. {info.getValue() as number || 1}</span>,
    },
    {
      accessorKey: 'vip_lv',
      header: 'Req. VIP',
      cell: (info) => <span className="font-mono text-xs text-zinc-400">VIP {info.getValue() as number || 0}</span>,
    },
  ], []);

  const handleRowClick = (promo: PromotionalActivity) => {
    navigate(`/promotions/${promo.id}`);
  };

  if (loading) return <LoadingState message="Downloading large promotional schedule matrix (~7,500 campaign records)..." />;
  if (error) return <ErrorState message={error} onRetry={fetchPromotionsData} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl">
            <Flame size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">Promotions & Recharge Events</h1>
            <p className="text-sm text-zinc-500">Track recharge milestones, event schedules, active triggers and bonus campaign durations.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Activity Type</label>
          <select
            value={selectedActType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="block w-full py-1.5 px-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-1.5 focus:ring-violet-500 cursor-pointer"
          >
            <option value="all">All Activity Types</option>
            {uniqueActTypes.sort((a,b)=>a-b).map(t => (
              <option key={t} value={String(t)}>{getActivityTypeLabel(t)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Time Category</label>
          <select
            value={selectedTimeType}
            onChange={(e) => setSelectedTimeType(e.target.value)}
            className="block w-full py-1.5 px-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-1.5 focus:ring-violet-500 cursor-pointer"
          >
            <option value="all">All Time Types</option>
            {uniqueTimeTypes.sort((a,b)=>a-b).map(t => (
              <option key={t} value={String(t)}>{getTimeTypeLabel(t)}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredPromotions}
        searchPlaceholder="Filter promotions by event name..."
        onRowClick={handleRowClick}
        pageSize={15}
      />
    </div>
  );
};
