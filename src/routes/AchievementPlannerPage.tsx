import React, { useEffect, useState, useMemo } from 'react';
import { loadAchievements, loadAchievementGroups, loadAchievementClasses, loadAchievementTitles } from '../data/loaders';
import type { Achievement, AchievementGroup, AchievementClass, AchievementTitle } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Trophy, Star, Filter, ChevronDown, ChevronRight, Check } from 'lucide-react';

interface Condition {
  type: number;
  value1: number;
  value2: number;
}

function parseConditions(arr: any): Condition[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(c => c && typeof c === 'object' && 'type' in c);
}

function getConditionLabel(type: number): string {
  const labels: Record<number, string> = {
    1: 'Level reaches',
    2: 'Owns hero',
    3: 'Owns item',
    12: 'Main Character level reaches',
    33: 'Owns equipment sets',
    34: 'Owns hero by ID',
  };
  return labels[type] || `Condition #${type}`;
}

export const AchievementPlannerPage: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [groups, setGroups] = useState<AchievementGroup[]>([]);
  const [classes, setClasses] = useState<AchievementClass[]>([]);
  const [titles, setTitles] = useState<AchievementTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [showRewards, setShowRewards] = useState<Set<number>>(new Set());

  const fetchData = async () => {
    try {
      setLoading(true);
      const [achRes, grpRes, clsRes, titRes] = await Promise.all([
        loadAchievements(), loadAchievementGroups(), loadAchievementClasses(), loadAchievementTitles()
      ]);
      setAchievements(achRes.rows);
      setGroups(grpRes.rows);
      setClasses(clsRes.rows);
      setTitles(titRes.rows);
      // Expand all groups by default
      setExpandedGroups(new Set(grpRes.rows.map(g => g.id)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const titleMap = useMemo(() => {
    const m = new Map<number, AchievementTitle>();
    titles.forEach(t => m.set(t.id, t));
    return m;
  }, [titles]);

  // Filter groups by class
  const filteredGroups = useMemo(() => {
    if (selectedClassId === null) return groups;
    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls) return groups;
    const groupIds = new Set(cls.achievement_groups_id || []);
    return groups.filter(g => groupIds.has(g.id));
  }, [groups, classes, selectedClassId]);

  // Get achievements for a group
  const getGroupAchievements = (groupId: number) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return [];
    const achIds = new Set(group.achievements_id || []);
    return achievements.filter(a => achIds.has(a.id));
  };

  const toggleGroup = (id: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRewards = (id: number) => {
    setShowRewards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) return <LoadingState message="Loading achievement databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const totalAchievements = achievements.length;
  const totalGroups = groups.length;
  const totalTitles = titles.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
          <Trophy size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Achievement Completion Planner</h1>
          <p className="text-sm text-muted">Track achievements by category, view conditions and linked title rewards.</p>
        </div>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-4">
        {[
          { label: 'Achievements', value: totalAchievements, color: 'text-brand' },
          { label: 'Groups', value: totalGroups, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Titles', value: totalTitles, color: 'text-amber-600 dark:text-amber-400' },
        ].map((stat, idx) => (
          <div key={idx} className="p-4 border border-border bg-surface rounded-xl text-center">
            <div className={`text-2xl font-black font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-[11px] text-muted mt-1">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Class Filter */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm">
        <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-2">Filter by Category</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedClassId(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${selectedClassId === null ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-bg text-muted hover:text-text'}`}
          >
            All ({totalAchievements})
          </button>
          {classes.map(cls => {
            const count = (cls.achievement_groups_id || []).reduce((sum, gid) => {
              const grp = groups.find(g => g.id === gid);
              return sum + (grp?.achievements_id?.length ?? 0);
            }, 0);
            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${selectedClassId === cls.id ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-bg text-muted hover:text-text'}`}
              >
                {cls.name} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {/* Achievement Groups */}
      <section className="space-y-3">
        {filteredGroups.map(group => {
          const isExpanded = expandedGroups.has(group.id);
          const groupAchs = getGroupAchievements(group.id);
          return (
            <div key={group.id} className="border border-border rounded-xl bg-surface shadow-sm overflow-hidden">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-bg/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
                  <h3 className="font-bold text-text text-sm">{group.name}</h3>
                  <span className="text-[11px] text-muted font-mono">{groupAchs.length} achievements</span>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-border">
                  {groupAchs.map(ach => {
                    const conditions = parseConditions(ach.conditions_array_1);
                    const linkedTitle = ach.title_id ? titleMap.get(ach.title_id) : null;
                    const isRewardsOpen = showRewards.has(ach.id);
                    return (
                      <div key={ach.id} className="p-4 border-b border-border last:border-b-0 hover:bg-bg/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-sm text-text">{ach.name}</h4>
                              {linkedTitle && (
                                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded text-[9px] font-bold flex items-center gap-0.5">
                                  <Star size={8} /> {linkedTitle.name}
                                </span>
                              )}
                            </div>
                            {ach.condition_str && (
                              <p className="text-xs text-muted mb-2">{ach.condition_str}</p>
                            )}
                            {conditions.length > 0 && (
                              <div className="space-y-1">
                                {conditions.map((cond, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-[11px]">
                                    <Check size={10} className="text-emerald-500 shrink-0" />
                                    <span className="text-muted">{getConditionLabel(cond.type)}: <span className="font-mono font-bold text-text">{cond.value1}</span>{cond.value2 > 0 ? ` x${cond.value2}` : ''}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => toggleRewards(ach.id)}
                            className="text-[10px] font-bold text-brand hover:text-brand-hover shrink-0"
                          >
                            {isRewardsOpen ? 'Hide' : 'Rewards'}
                          </button>
                        </div>
                        {isRewardsOpen && ach.rewards && (
                          <div className="mt-3 p-3 bg-bg/50 rounded-lg border border-border">
                            <span className="text-[10px] font-bold text-subtle uppercase block mb-1">Rewards</span>
                            <div className="flex flex-wrap gap-2">
                              {ach.rewards.map((r, rIdx) => (
                                <span key={rIdx} className="px-2 py-1 bg-brand-soft/50 text-brand rounded text-[10px] font-mono font-bold">
                                  Type {r.type} × {r.amount}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {linkedTitle && (
                          <div className="mt-2 p-2 bg-amber-500/5 border border-amber-200/30 dark:border-amber-900/30 rounded-lg">
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Title Bonus: </span>
                            <span className="text-[10px] text-muted">
                              {linkedTitle.add_other_array?.map((a, i) => (
                                <span key={i} className="font-mono">+{a.value} {a.type === 1 ? 'STR' : a.type === 2 ? 'AGI' : a.type === 3 ? 'INT' : `Type${a.type}`}{i < linkedTitle.add_other_array!.length - 1 ? ', ' : ''}</span>
                              ))}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
};
