import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadMilitary, loadArticles } from '../data/loaders';
import { Military, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { 
  Award, Shield, Swords, Wand2, Info, ChevronRight, Coins,
  TrendingUp, Compass, Heart
} from 'lucide-react';

const STATS_MAP: Record<number, string> = {
  1: 'Strength',
  2: 'Agility',
  3: 'Wisdom',
  4: 'Stamina',
  11: 'Speed',
  28: 'Damage Rate',
  29: 'Damage Immunity',
  101: 'HP Pool',
};

export const MilitaryPage: React.FC = () => {
  const [militaryRanks, setMilitaryRanks] = useState<Military[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulator selections
  const [startRankId, setStartRankId] = useState<number>(40100001);
  const [targetRankId, setTargetRankId] = useState<number>(40100010);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [milRes, artRes] = await Promise.all([
          loadMilitary(),
          loadArticles()
        ]);
        const sorted = milRes.rows.sort((a, b) => a.id - b.id);
        setMilitaryRanks(sorted);
        setArticles(artRes.rows);
        
        if (sorted.length > 0) {
          setStartRankId(sorted[0].id);
          setTargetRankId(sorted[Math.min(9, sorted.length - 1)].id);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load Seireitei Military database.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const articlesMap = useMemo(() => {
    const map: Record<number, Article> = {};
    articles.forEach(a => {
      map[a.id] = a;
    });
    return map;
  }, [articles]);

  // Adjust sliders
  useEffect(() => {
    if (startRankId > targetRankId) {
      setTargetRankId(startRankId);
    }
  }, [startRankId]);

  useEffect(() => {
    if (targetRankId < startRankId) {
      setStartRankId(targetRankId);
    }
  }, [targetRankId]);

  // Get active configurations
  const activeStart = useMemo(() => {
    return militaryRanks.find(r => r.id === startRankId) || null;
  }, [militaryRanks, startRankId]);

  const activeTarget = useMemo(() => {
    return militaryRanks.find(r => r.id === targetRankId) || null;
  }, [militaryRanks, targetRankId]);

  // Sum merit points requirements and aggregate stats gains
  const simulationResults = useMemo(() => {
    if (!activeStart || !activeTarget) return null;

    let totalMeritNeeded = 0;
    const startStats: Record<string, number> = {};
    const targetStats: Record<string, number> = {};

    // Sum merits between ranks
    militaryRanks.forEach(r => {
      if (r.id > startRankId && r.id <= targetRankId) {
        totalMeritNeeded += r.need_credit;
      }
    });

    // Parse stats helper
    const parseStats = (rank: Military, acc: Record<string, number>) => {
      if (rank.add_other && rank.add_other.addOther) {
        rank.add_other.addOther.forEach(o => {
          const name = STATS_MAP[o.type] || `Stat #${o.type}`;
          acc[name] = (acc[name] || 0) + o.value;
        });
      }
    };

    // Aggregate stats up to startRankId and targetRankId
    militaryRanks.forEach(r => {
      if (r.id <= startRankId) {
        parseStats(r, startStats);
      }
      if (r.id <= targetRankId) {
        parseStats(r, targetStats);
      }
    });

    // Net stats difference
    const statsDiff: Record<string, number> = {};
    Object.keys(targetStats).forEach(name => {
      const startVal = startStats[name] || 0;
      const targetVal = targetStats[name] || 0;
      statsDiff[name] = Math.max(0, targetVal - startVal);
    });

    return {
      totalMeritNeeded,
      startSalary: activeStart.salary?.award?.[0]?.amount || 0,
      targetSalary: activeTarget.salary?.award?.[0]?.amount || 0,
      startSpiritSalary: activeStart.salary?.award?.[1]?.amount || 0,
      targetSpiritSalary: activeTarget.salary?.award?.[1]?.amount || 0,
      startStats,
      targetStats,
      statsDiff
    };
  }, [militaryRanks, activeStart, activeTarget, startRankId, targetRankId]);

  if (loading) return <LoadingState message="Decoding Seireitei Military hierarchy..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const startRankIndex = militaryRanks.findIndex(r => r.id === startRankId);
  const targetRankIndex = militaryRanks.findIndex(r => r.id === targetRankId);

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
            <Award className="text-amber-500" size={28} />
            Seireitei Military Rank & Captaincy Calculator
          </h1>
          <p className="text-xs text-muted mt-1">
            Plan character military promotions, merit targets, daily salaries, and global squad stat buffs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Military ranks listing */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Seireitei Rankings</span>
            
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {militaryRanks.map((rank) => {
                const isSelected = startRankId === rank.id;
                return (
                  <button
                    key={rank.id}
                    onClick={() => setStartRankId(rank.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-sm'
                        : 'border-border bg-bg/50 hover:border-border text-muted'
                    }`}
                  >
                    <span>{rank.name}</span>
                    <span className="font-mono text-[9px] text-subtle">Rank #{rank.id}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Simulator & Cost results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-6">
            
            {/* Overview details */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-border/60 gap-4">
              <div>
                <span className="text-[9px] font-mono text-subtle uppercase block">Selected Rank Info</span>
                <h3 className="font-black text-lg text-text">
                  {activeStart?.name}
                </h3>
              </div>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold font-mono">
                  Squad Size: {activeStart?.fight_hero_num} Active
                </span>
              </div>
            </div>

            {/* Sliders Setup */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Start Rank slider */}
              <div className="p-4 border border-border bg-bg/10 rounded-xl space-y-3">
                <span className="block text-[10px] font-bold text-subtle uppercase">Starting Military Rank</span>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-subtle">Select Rank</span>
                  <span className="font-mono text-xs font-bold text-muted">
                    {activeStart?.name || `Rank #${startRankId}`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={militaryRanks.length - 1}
                  value={startRankIndex >= 0 ? startRankIndex : 0}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    if (militaryRanks[idx]) {
                      setStartRankId(militaryRanks[idx].id);
                    }
                  }}
                  className="w-full h-1 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Target Rank slider */}
              <div className="p-4 border border-border bg-bg/10 rounded-xl space-y-3">
                <span className="block text-[10px] font-bold text-subtle uppercase">Target Military Rank</span>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-subtle">Select Rank</span>
                  <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                    {activeTarget?.name || `Rank #${targetRankId}`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={militaryRanks.length - 1}
                  value={targetRankIndex >= 0 ? targetRankIndex : 0}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    if (militaryRanks[idx]) {
                      setTargetRankId(militaryRanks[idx].id);
                    }
                  }}
                  className="w-full h-1 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

            </div>

            {/* Calculations results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/60">
              
              {/* Daily Salary gains */}
              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Salary & Merit requirements</span>
                <div className="p-4 bg-bg/20 border border-border rounded-xl space-y-3 text-xs">
                  
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="font-semibold text-muted">Merit Points Needed:</span>
                    <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                      {simulationResults?.totalMeritNeeded.toLocaleString()} Merit
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="font-semibold text-muted">Daily Silver Wage:</span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-muted block">
                        {simulationResults?.targetSalary.toLocaleString()} Silver
                      </span>
                      <span className="text-[9px] text-subtle italic">
                        (+{( (simulationResults?.targetSalary || 0) - (simulationResults?.startSalary || 0) ).toLocaleString()} net change)
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="font-semibold text-muted">Daily Spirit Wage:</span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-muted block">
                        {simulationResults?.targetSpiritSalary.toLocaleString()} Spirit
                      </span>
                      <span className="text-[9px] text-subtle italic">
                        (+{( (simulationResults?.targetSpiritSalary || 0) - (simulationResults?.startSpiritSalary || 0) ).toLocaleString()} net change)
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Stats growth */}
              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Aggregate Stats Net Gain</span>
                <div className="p-4 bg-bg/20 border border-border rounded-xl space-y-2 text-xs">
                  {simulationResults && Object.keys(simulationResults.statsDiff).length > 0 ? (
                    Object.entries(simulationResults.statsDiff).map(([name, val]) => (
                      <div key={name} className="flex justify-between items-center py-1 border-b border-border/40 last:border-0">
                        <span className="font-semibold text-muted">{name}</span>
                        <span className="font-mono font-black text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                          <TrendingUp size={10} />
                          +{val.toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-[10px] text-subtle italic">
                      Promote rankings to show aggregate stat bonuses.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
