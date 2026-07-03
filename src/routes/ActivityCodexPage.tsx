import React, { useEffect, useState, useMemo } from 'react';
import { loadPromotionalActivities } from '../data/loaders';
import { PromotionalActivity } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { 
  Calendar, Search, Filter, Award, Clock, ArrowRight, Star, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ActivityCodexPage: React.FC = () => {
  const [activities, setActivities] = useState<PromotionalActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedTab] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [maxVip, setMaxVip] = useState<number>(15);
  const [minLevel, setMinLevel] = useState<number>(0);

  // Pagination states to handle large dataset efficiently (7500+ rows)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await loadPromotionalActivities();
      setActivities(res.rows);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load historical promotional activities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper: parse date vector from DB format like [2015,10,31,0,0] or similar JSON arrays
  const parseDateVector = (dateVal: any): string => {
    if (!dateVal) return 'Permanent / Server Start';
    try {
      let vec = dateVal;
      if (typeof dateVal === 'string') {
        if (dateVal.startsWith('[')) {
          vec = JSON.parse(dateVal);
        } else {
          return dateVal;
        }
      }
      if (Array.isArray(vec) && vec.length >= 3) {
        const year = vec[0];
        const month = String(vec[1]).padStart(2, '0');
        const day = String(vec[2]).padStart(2, '0');
        const hour = vec.length > 3 ? String(vec[3]).padStart(2, '0') : '00';
        const minute = vec.length > 4 ? String(vec[4]).padStart(2, '0') : '00';
        return `${year}-${month}-${day} ${hour}:${minute}`;
      }
      return String(dateVal);
    } catch (e) {
      return String(dateVal);
    }
  };

  const getYearFromVector = (dateVal: any): string => {
    if (!dateVal) return 'Unknown';
    try {
      let vec = dateVal;
      if (typeof dateVal === 'string') {
        if (dateVal.startsWith('[')) {
          vec = JSON.parse(dateVal);
        } else {
          const match = dateVal.match(/^(\d{4})/);
          return match ? match[1] : 'Unknown';
        }
      }
      if (Array.isArray(vec) && vec.length > 0) {
        return String(vec[0]);
      }
      return 'Unknown';
    } catch (e) {
      return 'Unknown';
    }
  };

  // Activity Type mapping based on ActionScript ActType Constants
  const getActivityTypeLabel = (type: number | null): { label: string; color: string; cat: string } => {
    if (type === null) return { label: 'System', color: 'bg-zinc-500/10 text-muted border-zinc-500/20', cat: 'system' };
    
    // Categorize for easier filter grouping with correct light/dark contrast
    switch (type) {
      case 1:
      case 2:
      case 35:
        return { label: 'Limited Gacha', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', cat: 'gacha' };
      case 5:
      case 6:
      case 7:
      case 8:
      case 26:
        return { label: 'Recharge Reward', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', cat: 'recharge' };
      case 14:
      case 15:
      case 16:
      case 17:
      case 18:
      case 28:
        return { label: 'Consumption Event', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', cat: 'recharge' };
      case 53:
      case 54:
        return { label: 'Jigsaw Event', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', cat: 'jigsaw' };
      case 32:
      case 33:
      case 34:
      case 65:
        return { label: 'Growth Fund', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20', cat: 'fund' };
      case 41:
      case 42:
      case 43:
        return { label: 'Holiday Festival', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20', cat: 'holiday' };
      case 50:
        return { label: 'Limit Buy', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', cat: 'limit' };
      default:
        return { label: `Type ${type}`, color: 'bg-zinc-500/10 text-muted border-zinc-500/20', cat: 'other' };
    }
  };

  // Extract unique years for filter
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    activities.forEach(act => {
      const yr = getYearFromVector(act.start_time);
      if (yr && yr !== 'Unknown' && yr.match(/^\d{4}$/)) {
        yearsSet.add(yr);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [activities]);

  // Statistics & Analytics
  const stats = useMemo(() => {
    const total = activities.length;
    let freeOnly = 0;
    let highLevel = 0;
    const typeCounts: { [key: string]: number } = {};

    activities.forEach(act => {
      if (!act.vip_lv || act.vip_lv === 0) freeOnly++;
      if (act.player_lv && act.player_lv >= 50) highLevel++;
      
      const typeInfo = getActivityTypeLabel(act.act_type);
      typeCounts[typeInfo.cat] = (typeCounts[typeInfo.cat] || 0) + 1;
    });

    return {
      total,
      freeOnly,
      highLevel,
      gachaCount: typeCounts['gacha'] || 0,
      rechargeCount: typeCounts['recharge'] || 0,
      holidayCount: typeCounts['holiday'] || 0,
      jigsawCount: typeCounts['jigsaw'] || 0,
    };
  }, [activities]);

  // Filters logic
  const filteredActivities = useMemo(() => {
    let result = activities;

    // Search query filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        act => 
          (act.name && act.name.toLowerCase().includes(query)) ||
          String(act.act_id).includes(query)
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      result = result.filter(act => getActivityTypeLabel(act.act_type).cat === selectedType);
    }

    // Year filter
    if (selectedYear !== 'all') {
      result = result.filter(act => getYearFromVector(act.start_time) === selectedYear);
    }

    // VIP filter (max VIP level constraint)
    if (maxVip < 15) {
      result = result.filter(act => (act.vip_lv || 0) <= maxVip);
    }

    // Player Level filter (minimum player level requirement)
    if (minLevel > 0) {
      result = result.filter(act => (act.player_lv || 0) >= minLevel);
    }

    // Default sorting: Newest start dates first
    return [...result].sort((a, b) => {
      const dateA = parseDateVector(a.start_time);
      const dateB = parseDateVector(b.start_time);
      return dateB.localeCompare(dateA);
    });
  }, [activities, searchQuery, selectedType, selectedYear, maxVip, minLevel]);

  // Pagination slice
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredActivities.slice(start, start + itemsPerPage);
  }, [filteredActivities, currentPage]);

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedYear, maxVip, minLevel]);

  if (loading) return <LoadingState message="Decoding campaign & operational events databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-brand-soft border border-border rounded-3xl p-8 shadow-sm">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-soft border border-brand/20 text-brand rounded-full text-xs font-semibold uppercase tracking-wider">
            <Calendar size={13} />
            Operations Archive
          </div>
          <div className="space-y-2 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-text">
              Holiday & Limited-Time <span className="text-brand">Event Archiver</span>
            </h1>
            <p className="text-muted text-sm sm:text-base leading-relaxed">
              Explore the timeline of the game's historically active campaigns, gachas, 
              and events spanning years of active service. Filter across {activities.length} recorded events 
              to plan your nostalgic progression.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Total Operational Events</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-text">{stats.total}</span>
            <span className="text-xs text-brand font-medium">Banners</span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="text-xs font-semibold text-subtle uppercase tracking-wider">No VIP Requirement</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-success">{stats.freeOnly}</span>
            <span className="text-xs text-success font-medium">({Math.round((stats.freeOnly / stats.total) * 100)}%)</span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Gacha & Wheels</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{stats.gachaCount}</span>
            <span className="text-xs text-muted">Events</span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Holiday Festivals</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-pink-600 dark:text-pink-400">{stats.holidayCount}</span>
            <span className="text-xs text-muted">Seasons</span>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-brand" />
            <h3 className="font-bold text-text text-lg">Filter Timeline</h3>
          </div>
          <span className="text-muted text-sm">{filteredActivities.length} matches found</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3.5 text-subtle" size={16} />
            <input
              type="text"
              placeholder="Search event name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg border border-border hover:border-border-strong focus:border-brand text-text rounded-xl py-2.5 pl-10 pr-4 text-sm transition-all focus:outline-none"
            />
          </div>

          {/* Type dropdown */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedTab(e.target.value)}
              className="w-full bg-bg border border-border hover:border-border-strong focus:border-brand text-text rounded-xl py-2.5 px-4 text-sm focus:outline-none"
            >
              <option value="all">All Event Types</option>
              <option value="gacha">Limited Gacha & Wheels</option>
              <option value="recharge">Recharges & Consumptions</option>
              <option value="holiday">Holiday Specials</option>
              <option value="jigsaw">Jigsaw Puzzles</option>
              <option value="fund">Growth Investment</option>
              <option value="limit">Limit Purchases</option>
            </select>
          </div>

          {/* Year dropdown */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-bg border border-border hover:border-border-strong focus:border-brand text-text rounded-xl py-2.5 px-4 text-sm focus:outline-none"
            >
              <option value="all">All Launch Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr} Banners</option>
              ))}
            </select>
          </div>

          {/* Level slider */}
          <div className="space-y-1.5 px-2">
            <div className="flex justify-between text-xs font-semibold text-muted uppercase tracking-wider">
              <span>Min Player Level</span>
              <span className="text-brand">Lv.{minLevel}</span>
            </div>
            <input
              type="range"
              min="0"
              max="120"
              value={minLevel}
              onChange={(e) => setMinLevel(Number(e.target.value))}
              className="w-full accent-brand bg-border h-1.5 rounded-full appearance-none cursor-pointer"
            />
          </div>

          {/* VIP slider */}
          <div className="space-y-1.5 px-2">
            <div className="flex justify-between text-xs font-semibold text-muted uppercase tracking-wider">
              <span>Max VIP Gate</span>
              <span className="text-brand">VIP {maxVip}</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              value={maxVip}
              onChange={(e) => setMaxVip(Number(e.target.value))}
              className="w-full accent-brand bg-border h-1.5 rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Clock size={20} className="text-brand" />
          <h2 className="text-xl font-bold text-text tracking-tight">Active Campaigns Log</h2>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="text-center py-16 bg-surface border border-dashed border-border rounded-3xl space-y-4">
            <div className="inline-flex p-3 bg-bg text-subtle rounded-2xl">
              <Calendar size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-text text-md">No historical events found</h4>
              <p className="text-muted text-sm max-w-md mx-auto">
                No active operational campaigns match your filters. Try relaxing your VIP level limit, or search for other keywords.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedActivities.map((act) => {
              const typeInfo = getActivityTypeLabel(act.act_type);
              const startText = parseDateVector(act.start_time);
              const endText = parseDateVector(act.end_time);

              return (
                <div 
                  key={act.id} 
                  className="bg-surface hover:bg-hover border border-border hover:border-brand-soft rounded-2xl p-6 transition-all duration-300 shadow-sm flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2.5 py-0.5 border text-xs font-semibold rounded-md ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className="text-[10px] text-subtle font-mono font-bold">
                        ID: {act.act_id}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-text group-hover:text-brand transition-colors line-clamp-1">
                        {act.name || `Promotional Event #${act.act_id}`}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <Calendar size={12} />
                        <span>{startText.split(' ')[0]}</span>
                        <ChevronRight size={10} />
                        <span>{endText.split(' ')[0]}</span>
                      </div>
                    </div>

                    {/* Requirements / Gates */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-bg rounded-xl p-3 border border-border text-center space-y-0.5">
                        <span className="text-[10px] text-muted uppercase font-semibold">Min Level</span>
                        <div className="text-sm font-bold text-text flex items-center justify-center gap-1">
                          <Award size={12} className="text-brand" />
                          <span>Lv.{act.player_lv || 1}</span>
                        </div>
                      </div>

                      <div className="bg-bg rounded-xl p-3 border border-border text-center space-y-0.5">
                        <span className="text-[10px] text-muted uppercase font-semibold">VIP Gate</span>
                        <div className="text-sm font-bold text-text flex items-center justify-center gap-1">
                          <Star size={12} className="text-brand" />
                          <span>VIP {act.vip_lv || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Links */}
                  <div className="pt-5 mt-5 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted">
                      Icon Code: {act.act_icon || 'None'}
                    </span>
                    
                    {/* Link specifically to Wheel Gacha if appropriate */}
                    {typeInfo.cat === 'gacha' ? (
                      <Link 
                        to="/tools/lucky-wheel"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
                      >
                        Launch Spin Sim
                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ) : (
                      <span className="text-subtle text-xs">
                        Platform: {act.position || 'Default'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <span className="text-muted text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 bg-surface border border-border hover:border-border-strong disabled:opacity-40 text-text rounded-xl text-xs font-semibold transition-all disabled:pointer-events-none cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-4 py-2 bg-surface border border-border hover:border-border-strong disabled:opacity-40 text-text rounded-xl text-xs font-semibold transition-all disabled:pointer-events-none cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
