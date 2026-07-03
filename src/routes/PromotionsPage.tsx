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
    case 1: return 'Server Open relative';
    case 2: return 'Weekly Recurring';
    case 3: return 'Fixed Calendar';
    case 4: return 'Minute Cooldown';
    case 5: return 'Cyclic Repeat';
    default: return `Type #${type}`;
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

export function formatSchedule(timeType: number | null, startTime: any, endTime: any): string {
  const startArr = Array.isArray(startTime) ? startTime : [];
  const endArr = Array.isArray(endTime) ? endTime : [];

  if (timeType === null || timeType === undefined) return '-';

  switch (timeType) {
    case 1: {
      const dayStart = startArr[0] ?? 1;
      const dayEnd = endArr[0] ?? 7;
      return `Server Day ${dayStart} to Day ${dayEnd}`;
    }
    case 2: {
      const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const wkStart = startArr[0] ?? 1;
      const wkEnd = endArr[0] ?? 7;
      const startDay = weekdays[wkStart - 1] ?? `Day ${wkStart}`;
      const endDay = weekdays[wkEnd - 1] ?? `Day ${wkEnd}`;
      return `Weekly: ${startDay} - ${endDay}`;
    }
    case 3: {
      if (startArr.length === 0 && endArr.length === 0) return 'Immediate / Permanent';

      const formatFixedDate = (arr: number[]) => {
        if (!arr || arr.length < 3) return '-';
        const y = arr[0];
        const m = String(arr[1]).padStart(2, '0');
        const d = String(arr[2]).padStart(2, '0');
        const h = arr[3] !== undefined ? ` ${String(arr[3]).padStart(2, '0')}:00` : '';
        return `${y}-${m}-${d}${h}`;
      };

      return `${formatFixedDate(startArr)} to ${formatFixedDate(endArr)}`;
    }
    case 4: {
      const minStart = startArr[0] ?? 0;
      const minEnd = endArr[0] ?? 0;
      return `Cooldown: ${minStart}m - ${minEnd}m`;
    }
    case 5: {
      const duration = endArr[0] ?? 1;
      const cooldown = endArr[1] ?? 0;
      const startY = startArr[0] || 2026;
      const startM = startArr[1] || 1;
      const startD = startArr[2] || 1;
      return `Cyclic: ${duration}d Active / ${cooldown}d Off (From ${startY}-${String(startM).padStart(2, '0')}-${String(startD).padStart(2, '0')})`;
    }
    default:
      return `Custom (Type ${timeType})`;
  }
}

function getActivityTypeBadgeClass(type: number): string {
  switch (type) {
    case 1:
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/30';
    case 2:
    case 5:
    case 6:
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/30';
    case 3:
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/30';
    case 7:
    case 8:
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/30';
    case 10:
    case 11:
    case 20:
      return 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200/50 dark:border-violet-900/30';
    case 4:
    case 9:
    case 21:
    case 22:
      return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-900/30';
    default:
      return 'bg-bg text-muted dark:bg-surface/40 dark:text-subtle border border-border/50 dark:border-border/30';
  }
}

function getTimeTypeBadgeClass(type: number): string {
  switch (type) {
    case 1:
    case 5:
      return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/30';
    case 2:
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-900/30';
    case 3:
      return 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200/50 dark:border-teal-900/30';
    default:
      return 'bg-bg text-muted dark:bg-surface/40 dark:text-subtle border border-border/50 dark:border-border/30';
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
      cell: (info) => <span className="font-mono text-muted font-semibold">{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Activity Name',
      cell: (info) => {
        const p = info.row.original;
        return (
          <div className="flex flex-col">
            <span className="font-bold text-text hover:text-violet-600 transition-colors cursor-pointer">
              {p.name || `Activity #${p.id}`}
            </span>
            <span className="font-mono text-[10px] text-subtle">Act ID: #{p.act_id}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'act_type',
      header: 'Activity Type',
      cell: (info) => {
        const val = info.getValue() as number;
        return (
          <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold inline-block ${getActivityTypeBadgeClass(val)}`}>
            {getActivityTypeLabel(val)}
          </span>
        );
      },
    },
    {
      accessorKey: 'time_type',
      header: 'Time Category',
      cell: (info) => {
        const val = info.getValue() as number;
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold inline-block ${getTimeTypeBadgeClass(val)}`}>
            {getTimeTypeLabel(val)}
          </span>
        );
      },
    },
    {
      id: 'schedule',
      header: 'Schedule / Duration',
      accessorFn: (row) => formatSchedule(row.time_type, row.start_time, row.end_time),
      cell: (info) => (
        <span className="font-semibold text-text">
          {info.getValue() as string}
        </span>
      ),
    },
    {
      id: 'requirements',
      header: 'Gate Restrictions',
      cell: (info) => {
        const p = info.row.original;
        const hasLevel = (p.player_lv ?? 0) > 0;
        const hasVip = (p.vip_lv ?? 0) > 0;
        if (!hasLevel && !hasVip) return <span className="text-subtle dark:text-muted text-xs font-semibold">-</span>;
        return (
          <div className="flex flex-wrap gap-1.5">
            {hasLevel && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/30 font-mono text-[10px] font-bold">
                Lv. {p.player_lv}
              </span>
            )}
            {hasVip && (
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/30 font-mono text-[10px] font-bold">
                VIP {p.vip_lv}
              </span>
            )}
          </div>
        );
      },
    },
  ], []);

  const handleRowClick = (promo: PromotionalActivity) => {
    navigate(`/promotions/${promo.id}`);
  };

  if (loading) return <LoadingState message="Downloading large promotional schedule matrix (~7,500 campaign records)..." />;
  if (error) return <ErrorState message={error} onRetry={fetchPromotionsData} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl">
            <Flame size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text dark:text-zinc-100">Promotions & Recharge Events</h1>
            <p className="text-sm text-muted">Track recharge milestones, event schedules, active triggers and bonus campaign durations.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Activity Type</label>
          <select
            value={selectedActType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="block w-full py-1.5 px-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-1.5 focus:ring-violet-500 cursor-pointer"
          >
            <option value="all">All Activity Types</option>
            {uniqueActTypes.sort((a, b) => a - b).map(t => (
              <option key={t} value={String(t)}>{getActivityTypeLabel(t)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Time Category</label>
          <select
            value={selectedTimeType}
            onChange={(e) => setSelectedTimeType(e.target.value)}
            className="block w-full py-1.5 px-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-1.5 focus:ring-violet-500 cursor-pointer"
          >
            <option value="all">All Time Types</option>
            {uniqueTimeTypes.sort((a, b) => a - b).map(t => (
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
