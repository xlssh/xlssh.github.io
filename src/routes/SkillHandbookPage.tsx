import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadHeroes, loadSkills } from '../data/loaders';
import { Hero, Skill } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Sparkles, BookOpen, Search, User, Eye, Info } from 'lucide-react';

interface SkillGroup {
  skillId: number;
  name: string;
  isTalent: boolean;
  sortId: number;
  icon: number;
  levels: Skill[];
}

export const SkillHandbookPage: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'active' | 'talent' | 'other'>('all');
  const [sortBy, setSortBy] = useState<'id_desc' | 'id_asc' | 'name_asc'>('id_desc');

  // Selected skill state
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [simLevel, setSimLevel] = useState<number>(1);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [skillsRes, heroesRes] = await Promise.all([loadSkills(), loadHeroes()]);
      setSkills(skillsRes.rows);
      setHeroes(heroesRes.rows);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load skills.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clean description HTML tags
  const cleanHtml = (htmlStr: string) => {
    return htmlStr
      .replace(/<[^>]*>/g, '') // remove tags
      .replace(/&nbsp;/g, ' ')
      .trim();
  };

  // Group raw skill levels by their base Skill ID (s.skill_id)
  const skillGroups = useMemo(() => {
    const groups: Record<number, Skill[]> = {};
    skills.forEach(s => {
      if (!s.skill_id) return;
      const baseId = s.skill_id;
      if (!groups[baseId]) {
        groups[baseId] = [];
      }
      groups[baseId].push(s);
    });

    return Object.entries(groups).map(([baseIdStr, levels]) => {
      const baseId = parseInt(baseIdStr);
      // Sort: level 1 has id equal to skill_id, levels 2+ have ids starting with 13106001, etc.
      const sortedLevels = levels.sort((a, b) => {
        if (a.id === baseId) return -1;
        if (b.id === baseId) return 1;
        return (a.id ?? 0) - (b.id ?? 0);
      });
      const first = sortedLevels[0];
      const name = first.name || `Ability #${baseId}`;
      const isTalent = String(baseId).startsWith('132');

      return {
        skillId: baseId,
        name,
        isTalent,
        sortId: first.sort_id ?? 0,
        icon: first.icon ?? 0,
        levels: sortedLevels,
      } as SkillGroup;
    });
  }, [skills]);

  // Filtered & Sorted skill groups
  const filteredSkills = useMemo(() => {
    let result = skillGroups.filter(g => {
      // Search text
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = g.name.toLowerCase().includes(query);
        const matchesId = String(g.skillId).includes(query);
        const matchesDesc = g.levels.some(l => (l.description ?? '').toLowerCase().includes(query));
        if (!matchesName && !matchesId && !matchesDesc) return false;
      }

      // Category filter
      if (categoryFilter === 'active') {
        return !g.isTalent && String(g.skillId).startsWith('131');
      } else if (categoryFilter === 'talent') {
        return g.isTalent;
      } else if (categoryFilter === 'other') {
        return !String(g.skillId).startsWith('131') && !String(g.skillId).startsWith('132');
      }

      return true;
    });

    // Sorting
    if (sortBy === 'id_desc') {
      result.sort((a, b) => b.skillId - a.skillId);
    } else if (sortBy === 'id_asc') {
      result.sort((a, b) => a.skillId - b.skillId);
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [skillGroups, searchQuery, categoryFilter, sortBy]);

  // Auto-select first skill when filter changes
  useEffect(() => {
    if (filteredSkills.length > 0) {
      const exists = filteredSkills.some(g => g.skillId === selectedSkillId);
      if (!exists) {
        setSelectedSkillId(filteredSkills[0].skillId);
        setSimLevel(1);
      }
    } else {
      setSelectedSkillId(null);
    }
  }, [filteredSkills, selectedSkillId]);

  // Get currently selected skill data
  const selectedGroup = useMemo(() => {
    if (selectedSkillId === null) return null;
    return skillGroups.find(g => g.skillId === selectedSkillId) || null;
  }, [selectedSkillId, skillGroups]);

  // Sync simulator slider bounds on skill change
  useEffect(() => {
    setSimLevel(1);
  }, [selectedSkillId]);

  // Set level with boundary safety
  const setRefineLevel = (lvl: number) => {
    if (!selectedGroup) return;
    const max = selectedGroup.levels.length;
    const bounded = Math.max(1, Math.min(lvl, max));
    setSimLevel(bounded);
  };

  // Find heroes which are assigned this skill
  const skillWielders = useMemo(() => {
    if (!selectedSkillId) return [];
    return heroes.filter(h => h.active === selectedSkillId || h.talent === selectedSkillId);
  }, [heroes, selectedSkillId]);

  if (loading) return <LoadingState message="Decoding game engine abilities…" />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-text tracking-tight flex items-center gap-2">
          <BookOpen className="text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          Skill & Talent Handbook
        </h1>
        <p className="text-sm text-muted mt-1">
          Explore complete active abilities and passive talent growth curves parsed natively from the game client's databases.
        </p>
      </div>

      {/* Control Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-surface border border-border rounded-2xl shadow-sm">
        <div className="relative md:col-span-2">
          <input
            type="text"
            placeholder="Search by name, description, or Skill ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border bg-bg text-xs rounded-xl text-text placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Search by name, description, or Skill ID"
          />
          <Search size={14} className="absolute left-3 top-3 text-subtle" aria-hidden="true" />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e: any) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 border border-border bg-bg text-xs rounded-xl text-text dark:text-subtle focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            aria-label="Category filter"
          >
            <option value="all">All Category Types</option>
            <option value="active">⚔️ Active Skills (131xxxxx)</option>
            <option value="talent">🧬 Passive Talents (132xxxxx)</option>
            <option value="other">🔮 Boss / Specialized Skills</option>
          </select>
        </div>

        <div>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 border border-border bg-bg text-xs rounded-xl text-text dark:text-subtle focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            aria-label="Sort options"
          >
            <option value="id_desc">Skill ID (Newest First)</option>
            <option value="id_asc">Skill ID (Oldest First)</option>
            <option value="name_asc">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Scrollable Skills List */}
        <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          <div className="text-[10px] font-bold text-muted uppercase px-1 flex justify-between">
            <span>Abilities Found</span>
            <span>{filteredSkills.length} entries</span>
          </div>

          {filteredSkills.slice(0, 100).map(g => {
            const isSelected = selectedSkillId === g.skillId;
            return (
              <div
                key={g.skillId}
                onClick={() => setSelectedSkillId(g.skillId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedSkillId(g.skillId);
                  }
                }}
                tabIndex={0}
                role="button"
                className={`p-3 rounded-xl border cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isSelected
                    ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                    : 'border-border bg-surface hover:border-border-strong'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-text flex items-center gap-1.5">
                      {g.isTalent ? (
                        <span className="px-1 py-0.5 text-[8px] bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400 rounded">Talent</span>
                      ) : (
                        <span className="px-1 py-0.5 text-[8px] bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-705 dark:text-indigo-400 rounded">Active</span>
                      )}
                      {g.name}
                    </div>
                    <div className="text-[10px] font-mono text-muted">ID: {g.skillId}</div>
                  </div>
                  <span className="text-[9px] font-black text-muted font-mono">Lv.1-{g.levels.length}</span>
                </div>
                <p className="text-[10px] text-muted dark:text-subtle line-clamp-2 mt-2">
                  {cleanHtml(g.levels[0]?.description || '')}
                </p>
              </div>
            );
          })}

          {filteredSkills.length > 100 && (
            <div className="text-center text-[10px] text-muted py-2 border border-dashed border-border rounded-xl bg-bg/40 dark:bg-bg/40">
              Showing first 100 skills. Narrow down filters to find others.
            </div>
          )}
        </div>

        {/* Right Side: Skill Detail & Level Up Growth Curve Simulator */}
        <div className="lg:col-span-2 space-y-6">
          {selectedGroup ? (
            <div className="p-6 bg-surface border border-border rounded-2xl space-y-6 shadow-sm">
              {/* Header card info */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-text">{selectedGroup.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                      selectedGroup.isTalent ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-700/30' : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-755 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/30'
                    }`}>
                      {selectedGroup.isTalent ? '🧬 Passive Talent' : '⚔️ Active Skill'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span>Base Skill ID: <span className="font-mono text-muted">{selectedGroup.skillId}</span></span>
                    <span>•</span>
                    <span>Engine Sort Priority: <span className="font-mono text-muted">{selectedGroup.sortId}</span></span>
                  </div>
                </div>
                {selectedGroup.icon > 0 && (
                  <div className="w-12 h-12 rounded-xl bg-bg border border-border flex items-center justify-center font-mono text-xs text-muted font-black">
                    #{selectedGroup.icon}
                  </div>
                )}
              </div>

              {/* Slider for Level Simulator */}
              <div className="p-4 bg-bg border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted">
                    <Sparkles size={14} className="text-amber-500" aria-hidden="true" />
                    Level Growth Simulator
                  </div>
                  <div className="text-xs font-black font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/40">
                    Lv.{simLevel} / {selectedGroup.levels.length}
                  </div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={selectedGroup.levels.length}
                  value={simLevel}
                  onChange={(e) => setRefineLevel(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                  aria-label="Simulate skill level"
                />
                <div className="text-[10px] text-muted flex justify-between">
                  <span>Starting Form (Lv.1)</span>
                  <span>Endgame Master (Lv.{selectedGroup.levels.length})</span>
                </div>
              </div>

              {/* Cleaned Description Panel */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Description Timeline (At simulated Level)</span>
                <div className="p-4 bg-bg border border-border/50 rounded-xl text-sm leading-relaxed text-text dark:text-zinc-100 min-h-24">
                  {cleanHtml(selectedGroup.levels[simLevel - 1]?.description || '')}
                </div>
              </div>

              {/* Skill multipliers breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-bg border border-border rounded-xl text-center">
                  <span className="text-[10px] text-muted block uppercase font-bold">Scaling Steps</span>
                  <span className="text-sm font-bold text-text">{selectedGroup.levels.length} levels</span>
                </div>
                <div className="p-3 bg-bg border border-border rounded-xl text-center">
                  <span className="text-[10px] text-muted block uppercase font-bold">Wielders</span>
                  <span className="text-sm font-bold text-text">{skillWielders.length} heroes</span>
                </div>
                <div className="p-3 bg-bg border border-border rounded-xl text-center">
                  <span className="text-[10px] text-muted block uppercase font-bold">Database ID</span>
                  <span className="text-xs font-mono font-bold text-indigo-700 dark:text-violet-300">{selectedGroup.levels[simLevel - 1]?.id || selectedGroup.skillId}</span>
                </div>
                <div className="p-3 bg-bg border border-border rounded-xl text-center">
                  <span className="text-[10px] text-muted block uppercase font-bold">Fury Charge</span>
                  <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">{selectedGroup.isTalent ? 'N/A' : '100 starting'}</span>
                </div>
              </div>

              {/* Eligible Wielders list */}
              <div className="space-y-3 pt-4 border-t border-border">
                <span className="text-[11px] font-black text-muted uppercase tracking-widest flex items-center gap-1">
                  <User size={12} className="text-indigo-500" aria-hidden="true" />
                  Assigned Mercenary Wielders ({skillWielders.length})
                </span>
                {skillWielders.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {skillWielders.map(h => (
                      <Link
                        key={h.id}
                        to={`/heroes/${h.id}`}
                        className="p-3 rounded-xl border border-border bg-bg hover:border-indigo-500 dark:hover:border-indigo-400 transition-all flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-text block">{h.name}</span>
                          <span className="text-[9px] text-muted">{h.role || 'Mercenary'}</span>
                        </div>
                        <ChevronRightIcon size={12} className="text-muted" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-border bg-bg/40 dark:bg-bg/40 text-center">
                    <Info size={14} className="text-muted mx-auto mb-1" aria-hidden="true" />
                    <span className="text-[11px] text-muted">This ability is specialized or belongs to campaign bosses/unreleased roster partners.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-96 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted">
              <Eye size={24} className="mb-2" aria-hidden="true" />
              <p className="text-sm">Select an ability on the left sidebar to simulate level growth curve</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChevronRightIcon: React.FC<{ size: number, className?: string }> = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>
);
