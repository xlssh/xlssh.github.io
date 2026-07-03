import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadStarMaps, loadStarPoints, loadSkills } from '../data/loaders';
import { StarMap, StarPoint, Skill } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { 
  Sparkles, Shield, Swords, Wand2, Info, ChevronRight, Zap, 
  HelpCircle, Compass, CheckCircle2, ShoppingBag, Eye, Award
} from 'lucide-react';

const PROFESSIONS = [
  { id: 4, name: 'Vanguard Build (Defense)', icon: Shield, color: 'text-amber-500 bg-amber-500/10' },
  { id: 1, name: 'Assaulter Build (Strength)', icon: Swords, color: 'text-rose-500 bg-rose-500/10' },
  { id: 3, name: 'Tactician Build (Wisdom)', icon: Wand2, color: 'text-indigo-500 bg-indigo-500/10' },
];

export const SoulMapsPlannerPage: React.FC = () => {
  const [starMaps, setStarMaps] = useState<StarMap[]>([]);
  const [starPoints, setStarPoints] = useState<StarPoint[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User Selections
  const [selectedProf, setSelectedProf] = useState<number>(4); // Default to Vanguard (4)
  const [selectedMapId, setSelectedMapId] = useState<number>(0);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number>(1); // Index 1-20

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [mapsRes, pointsRes, skillsRes] = await Promise.all([
          loadStarMaps(),
          loadStarPoints(),
          loadSkills()
        ]);
        setStarMaps(mapsRes.rows);
        setStarPoints(pointsRes.rows);
        setSkills(skillsRes.rows);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load Soul Maps database.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter maps based on selected profession
  const filteredMaps = useMemo(() => {
    return starMaps.filter(m => m.profession === selectedProf).sort((a, b) => a.id - b.id);
  }, [starMaps, selectedProf]);

  // Set default map when profession changes
  useEffect(() => {
    if (filteredMaps.length > 0) {
      setSelectedMapId(filteredMaps[0].id);
      setSelectedPointIndex(1);
    }
  }, [filteredMaps]);

  const activeMap = useMemo(() => {
    return starMaps.find(m => m.id === selectedMapId) || null;
  }, [starMaps, selectedMapId]);

  // Get nodes of the active map
  const activePoints = useMemo(() => {
    if (!activeMap) return [];
    
    // Map ID stored in points might match the lower index part or direct match.
    // Let's print lower digits: ID 17200012 -> maps to MapID 12 in StarPoints.
    const mapShortId = activeMap.id % 100;
    return starPoints
      .filter(p => p.map_id === mapShortId)
      .sort((a, b) => a.index - b.index);
  }, [starPoints, activeMap]);

  // Selected Point Inspector
  const selectedPoint = useMemo(() => {
    return activePoints.find(p => p.index === selectedPointIndex) || null;
  }, [activePoints, selectedPointIndex]);

  // Calculate coordinates for nodes dynamically so they render as a beautiful constellation
  const pointCoordinates = useMemo(() => {
    return activePoints.map((pt, idx) => {
      const total = activePoints.length;
      const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
      
      // Beautiful spiral/wave pattern
      const radius = 35 + Math.sin(idx * 2) * 5; // radius in percentage
      const x = 50 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);
      
      return { id: pt.id, index: pt.index, x, y };
    });
  }, [activePoints]);

  // Skills Map for quick lookup
  const skillsMap = useMemo(() => {
    const map: Record<number, Skill> = {};
    skills.forEach(s => {
      map[s.skill_id] = s;
    });
    return map;
  }, [skills]);

  // Calculate cumulative costs and stats from index 1 to selectedPointIndex
  const cumulativeData = useMemo(() => {
    let totalSouls = 0;
    const statsAccumulator: Record<string, { val: number; pct: boolean }> = {};
    const skillUnlocks: Array<{ id: number; name: string; desc: string }> = [];

    activePoints.forEach(pt => {
      if (pt.index <= selectedPointIndex) {
        totalSouls += pt.need_fetch;

        // Parse descriptions: e.g. "Main Character Strength+20|Main Character Wisdom+20|Assaulters Damage+5%"
        if (pt.desc) {
          const parts = pt.desc.split('|');
          parts.forEach(part => {
            // Regex to match "StatName+Value" or "StatName+Value%"
            const match = part.match(/^(.+?)\s*\+([0-9.]+)(%?)$/);
            if (match) {
              const name = match[1].trim();
              const val = parseFloat(match[2]);
              const pct = match[3] === '%';
              
              if (!statsAccumulator[name]) {
                statsAccumulator[name] = { val: 0, pct };
              }
              statsAccumulator[name].val += val;
            } else if (part.includes('Receive Skill')) {
              // Parse skill unlocks
              // e.g. "Receive Skill - \"13100002\"(Deals damage to Vanguard...)"
              const skillMatch = part.match(/"(\d+)"/);
              if (skillMatch) {
                const skillId = parseInt(skillMatch[1]);
                const skillObj = skillsMap[skillId];
                skillUnlocks.push({
                  id: skillId,
                  name: skillObj?.name || `Skill #${skillId}`,
                  desc: skillObj?.description || part
                });
              }
            }
          }
        );
      }
    }});

    return {
      totalSouls,
      stats: Object.entries(statsAccumulator).map(([name, obj]) => ({
        name,
        display: `+${obj.val.toLocaleString()}${obj.pct ? '%' : ''}`
      })),
      skills: skillUnlocks
    };
  }, [activePoints, selectedPointIndex, skillsMap]);

  if (loading) return <LoadingState message="Decoding Main Character Soul Maps database..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const currentProf = PROFESSIONS.find(p => p.id === selectedProf);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
            <Link to="/" className="hover:text-subtle transition-colors">Dashboard</Link>
            <ChevronRight size={12} />
            <span className="text-muted">Tools</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text flex items-center gap-2.5">
            <Compass className="text-amber-500" size={28} />
            MC Soul Map & Talent Simulator
          </h1>
          <p className="text-xs text-muted mt-1">
            Build and optimize talent trees for Vanguard, Assaulter, or Tactician builds for the Main Character.
          </p>
        </div>
      </div>

      {/* Build/Profession Selector Toggles */}
      <div className="p-4 border border-border bg-surface rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">Main Character Build Category</span>
          <div className="flex flex-wrap gap-2">
            {PROFESSIONS.map((prof) => {
              const Icon = prof.icon;
              const isSelected = selectedProf === prof.id;
              return (
                <button
                  key={prof.id}
                  onClick={() => setSelectedProf(prof.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'border-border bg-bg text-muted hover:border-border-strong'
                  }`}
                >
                  <Icon size={14} className={isSelected ? 'text-amber-500' : 'text-subtle'} />
                  {prof.name}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Active Chapter Map Selectors */}
        <div className="space-y-1 w-full md:w-auto">
          <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">Soul Map Chapter</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {filteredMaps.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => setSelectedMapId(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedMapId === m.id
                    ? 'border-amber-500/60 bg-amber-500/5 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-muted hover:bg-hover/50'
                }`}
              >
                Map {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Board Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Constellation Visual Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border/65">
              <div>
                <span className="text-[9px] font-mono text-subtle uppercase block">Active Talent Board</span>
                <h3 className="font-black text-base text-text dark:text-zinc-100">
                  {activeMap?.name}
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono">
                {activePoints.length} Soul Points
              </span>
            </div>

            {/* Interactive SVG Constellation Chart */}
            <div className="relative aspect-video w-full border border-border bg-bg rounded-2xl overflow-hidden flex items-center justify-center">
              
              {/* Star Background Grid */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.15),rgba(255,255,255,0))]" />
              
              {/* Constellation Linkage Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {pointCoordinates.map((pt, idx) => {
                  if (idx === 0) return null;
                  const prev = pointCoordinates[idx - 1];
                  const isActive = pt.index <= selectedPointIndex;
                  return (
                    <line
                      key={`line-${pt.id}`}
                      x1={`${prev.x}%`}
                      y1={`${prev.y}%`}
                      x2={`${pt.x}%`}
                      y2={`${pt.y}%`}
                      stroke={isActive ? '#f59e0b' : '#3f3f46'}
                      strokeWidth={isActive ? 2 : 1}
                      strokeDasharray={isActive ? 'none' : '4 4'}
                      className="transition-all duration-300"
                    />
                  );
                })}
              </svg>

              {/* Star Points / Nodes */}
              {pointCoordinates.map((pt) => {
                const ptObj = activePoints.find(p => p.id === pt.id);
                const isActive = pt.index <= selectedPointIndex;
                const isSelected = selectedPointIndex === pt.index;
                const isSkill = ptObj?.is_skill === 1;

                return (
                  <button
                    key={pt.id}
                    onClick={() => setSelectedPointIndex(pt.index)}
                    style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500 text-white scale-125 shadow-lg shadow-amber-500/20 z-20'
                        : isActive
                        ? 'border-amber-500 bg-amber-500/20 text-amber-500 z-10'
                        : 'border-zinc-700 bg-surface text-muted hover:border-zinc-500 hover:text-subtle'
                    }`}
                  >
                    {isSkill ? (
                      <Zap size={12} className={isSelected ? 'text-white' : 'text-amber-500'} />
                    ) : (
                      <span className="text-[10px] font-bold font-mono">{pt.index}</span>
                    )}
                  </button>
                );
              })}

              {/* MC Icon Watermark */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 opacity-40 text-xs">
                <Compass size={14} className="text-subtle" />
                <span className="text-subtle font-bold uppercase tracking-wider font-mono">Constellation Path</span>
              </div>
            </div>

            {/* Slider shortcuts */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-subtle font-semibold">Simulate Point Activation Rank</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">Rank {selectedPointIndex} / {activePoints.length}</span>
              </div>
              <input
                type="range"
                min="1"
                max={activePoints.length || 10}
                value={selectedPointIndex}
                onChange={(e) => setSelectedPointIndex(parseInt(e.target.value))}
                className="w-full h-1.5 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          {/* Cumulative Stats Aggregate Card */}
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">Cumulative MC Talent Attributes</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {cumulativeData.stats.length > 0 ? (
                cumulativeData.stats.map((st, idx) => (
                  <div key={idx} className="p-3 border border-border/80 bg-bg/20 dark:bg-bg/15 rounded-xl flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted">{st.name}</span>
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">{st.display}</span>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-4 text-center text-xs text-subtle italic">
                  Activate star points to display stats summary.
                </div>
              )}
            </div>

            {/* Skill Unlocks */}
            {cumulativeData.skills.length > 0 && (
              <div className="pt-3 border-t border-border/60 space-y-2">
                <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">Unlocked MC Active Skills</span>
                <div className="space-y-2">
                  {cumulativeData.skills.map((sk) => (
                    <div key={sk.id} className="p-3 border border-amber-500/25 bg-amber-500/5 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Zap className="text-amber-500" size={14} />
                        <span className="font-bold text-text text-xs">{sk.name}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-surface-raised text-muted font-bold font-mono">
                          ID: {sk.id}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted leading-relaxed pl-5">
                        {sk.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Node Inspector & Cost Estimates */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Node Inspector */}
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-5">
            <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">Star Node Inspector</span>
            
            {selectedPoint ? (
              <div className="space-y-4">
                {/* Point Header */}
                <div className="pb-3 border-b border-border/60 flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-sm text-text dark:text-zinc-100">
                      {selectedPoint.name}
                    </h4>
                    <span className="text-[9px] text-subtle font-mono">Constellation Point Index {selectedPoint.index}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                    selectedPoint.is_skill ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-surface-raised text-muted'
                  }`}>
                    {selectedPoint.is_skill ? 'Skill Unlock' : 'Stat Node'}
                  </span>
                </div>

                {/* Requirements */}
                <div className="space-y-2">
                  <span className="text-[9.5px] font-semibold text-subtle uppercase block">Upgrade Price</span>
                  <div className="p-3 bg-bg/50 border border-border/50 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-muted">Souls Required</span>
                    </div>
                    <span className="font-mono text-xs font-black text-text">
                      {selectedPoint.need_fetch.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Point Effects */}
                <div className="space-y-2">
                  <span className="text-[9.5px] font-semibold text-subtle uppercase block">Altars Stat Modifiers</span>
                  <div className="space-y-1.5">
                    {selectedPoint.desc.split('|').map((mod, idx) => (
                      <div key={idx} className="p-2.5 bg-bg/30 dark:bg-bg/5 border border-border/40 rounded-lg text-[10.5px] text-muted flex items-center gap-2">
                        {selectedPoint.is_skill ? (
                          <Zap size={11} className="text-amber-500 shrink-0" />
                        ) : (
                          <CheckCircle2 size={11} className="text-amber-500 shrink-0" />
                        )}
                        <span className="leading-tight">{mod}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-8 text-center text-xs text-subtle italic">
                Select a star point on the chart to inspect.
              </div>
            )}
          </div>

          {/* Cost Calculator Card */}
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">Chapter Path Cost Calculator</span>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted font-semibold">Cumulative Souls Cost</span>
                <span className="font-mono font-bold text-text">
                  {cumulativeData.totalSouls.toLocaleString()} Souls
                </span>
              </div>
              
              <div className="p-3 bg-amber-500/5 border border-amber-500/25 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted dark:text-subtle font-bold">Total Stars Lit</span>
                  <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                    {selectedPointIndex} / {activePoints.length}
                  </span>
                </div>
                <div className="w-full bg-surface-raised h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full transition-all duration-300"
                    style={{ width: `${(selectedPointIndex / activePoints.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
