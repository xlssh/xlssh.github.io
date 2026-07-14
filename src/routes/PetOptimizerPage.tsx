import React, { useEffect, useState, useMemo } from 'react';
import { loadPetLevelUps, loadVicePetMakes, loadVicePetRankUps, loadMainPetRankUps } from '../data/loaders';
import type { PetLevelUp, VicePetMake, VicePetRankUp, MainPetRankUp } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getQualityLabel, getQualityColorClass } from '../utils/quality';
import { LayoutGrid, TrendingUp, Star, Coins } from 'lucide-react';

// Attribute type labels
const ATTR_LABELS: Record<number, string> = { 1: 'STR', 2: 'AGI', 3: 'INT', 4: 'HP', 12: 'STR Growth' };

export const PetOptimizerPage: React.FC = () => {
  const [petLevelUps, setPetLevelUps] = useState<PetLevelUp[]>([]);
  const [viceMakes, setViceMakes] = useState<VicePetMake[]>([]);
  const [viceRankUps, setViceRankUps] = useState<VicePetRankUp[]>([]);
  const [mainRankUps, setMainRankUps] = useState<MainPetRankUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<number>(0);
  const [targetLevel, setTargetLevel] = useState(50);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plRes, vmRes, vrRes, mrRes] = await Promise.all([
        loadPetLevelUps(), loadVicePetMakes(), loadVicePetRankUps(), loadMainPetRankUps()
      ]);
      setPetLevelUps(plRes.rows);
      setViceMakes(vmRes.rows);
      setViceRankUps(vrRes.rows);
      setMainRankUps(mrRes.rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Unique pet IDs
  const uniquePets = useMemo(() => {
    const petMap = new Map<number, { name: string; quality: number }>();
    petLevelUps.forEach(p => {
      if (!petMap.has(p.pet_id)) {
        petMap.set(p.pet_id, { name: p.name, quality: p.quality });
      }
    });
    return Array.from(petMap.entries()).map(([id, data]) => ({ id, ...data })).sort((a, b) => a.id - b.id);
  }, [petLevelUps]);

  // Pet level progression
  const petLevels = useMemo(() => {
    return petLevelUps
      .filter(p => p.pet_id === selectedPetId)
      .sort((a, b) => a.level - b.level);
  }, [petLevelUps, selectedPetId]);

  // Stats at target level
  const statsAtLevel = useMemo(() => {
    const levelData = petLevels.find(p => p.level === targetLevel) || petLevels[petLevels.length - 1];
    if (!levelData) return null;
    return {
      level: levelData.level,
      name: levelData.name,
      quality: levelData.quality,
      attributes: levelData.attributes || [],
      starLevel: levelData.star_level || [],
      needExp: levelData.need_exp,
      totalExp: levelData.total_exp,
      isMaxLevel: levelData.is_max_level === 1,
    };
  }, [petLevels, targetLevel]);

  // Total EXP needed to reach target level
  const totalExpNeeded = useMemo(() => {
    return petLevels
      .filter(p => p.level <= targetLevel)
      .reduce((sum, p) => sum + (p.need_exp || 0), 0);
  }, [petLevels, targetLevel]);

  // Main pet rank up info
  const mainRankInfo = useMemo(() => {
    return mainRankUps.find(m => m.id === selectedPetId);
  }, [mainRankUps, selectedPetId]);

  if (loading) return <LoadingState message="Loading pet databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const maxLevel = petLevels.length > 0 ? Math.max(...petLevels.map(p => p.level)) : 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
          <LayoutGrid size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Pet Optimization Calculator</h1>
          <p className="text-sm text-muted">Analyze pet stat curves, leveling costs, and progression paths.</p>
        </div>
      </div>

      {/* Pet Selector & Level */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Select Pet</label>
          <select
            value={selectedPetId}
            onChange={(e) => setSelectedPetId(parseInt(e.target.value))}
            className="block w-full py-2 px-3 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
          >
            <option value={0}>Select a pet...</option>
            {uniquePets.map(p => (
              <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Target Level</label>
          <input
            type="range"
            min="1"
            max={maxLevel}
            value={Math.min(targetLevel, maxLevel)}
            onChange={(e) => setTargetLevel(parseInt(e.target.value))}
            className="w-full accent-brand"
          />
          <div className="text-center text-sm font-mono font-bold text-brand mt-1">Lv. {targetLevel}</div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-xs text-subtle uppercase font-bold mb-1">Total EXP Needed</div>
          <div className="text-2xl font-black text-brand font-mono">{totalExpNeeded.toLocaleString()}</div>
        </div>
      </section>

      {selectedPetId > 0 && statsAtLevel && (
        <>
          {/* Pet Stats */}
          <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
            <h3 className="font-bold text-text flex items-center gap-2">
              <Star size={18} className="text-amber-500" />
              Stats at Lv.{statsAtLevel.level}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statsAtLevel.attributes.map((attr, idx) => (
                <div key={idx} className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                  <div className="text-[10px] text-subtle uppercase font-bold">{ATTR_LABELS[attr] || `Attr ${attr}`}</div>
                  <div className="text-lg font-black font-mono text-brand mt-1">Lv.{idx + 1}</div>
                </div>
              ))}
            </div>
            {statsAtLevel.isMaxLevel && (
              <div className="p-3 bg-amber-500/10 border border-amber-200/30 dark:border-amber-900/30 rounded-xl text-xs text-amber-600 dark:text-amber-400 font-bold">
                This pet has reached its maximum level.
              </div>
            )}
          </section>

          {/* Level Progression */}
          <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
            <h3 className="font-bold text-text flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" />
              Level Progression
            </h3>
            <div className="max-h-80 overflow-y-auto border border-border rounded-xl">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-surface border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-subtle">Level</th>
                    <th className="px-3 py-2 text-left font-bold text-subtle">EXP Needed</th>
                    <th className="px-3 py-2 text-left font-bold text-subtle">Total EXP</th>
                    <th className="px-3 py-2 text-left font-bold text-subtle">Max?</th>
                  </tr>
                </thead>
                <tbody>
                  {petLevels.map(p => (
                    <tr key={p.id} className={`border-b border-border ${p.level === targetLevel ? 'bg-brand-soft' : 'hover:bg-bg/50'}`}>
                      <td className="px-3 py-2 font-mono font-bold text-text">Lv.{p.level}</td>
                      <td className="px-3 py-2 font-mono text-muted">{p.need_exp?.toLocaleString() ?? 0}</td>
                      <td className="px-3 py-2 font-mono text-muted">{p.total_exp?.toLocaleString() ?? 0}</td>
                      <td className="px-3 py-2">{p.is_max_level === 1 ? <span className="text-amber-500 font-bold">MAX</span> : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Vice Pet Crafts */}
      {viceMakes.length > 0 && (
        <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2">
            <Coins size={18} className="text-fuchsia-500" />
            Vice Pet Craft Requirements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {viceMakes.map(v => (
              <div key={v.id} className="p-3 border border-border rounded-xl bg-bg/50">
                <div className="font-bold text-sm text-text mb-1">Vice Pet #{v.id}</div>
                <div className="text-[11px] text-muted mb-1">Cost: {v.need_silver?.toLocaleString()} Silver</div>
                <div className="text-[11px] text-muted">Source: {v.pathway || 'Unknown'}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
