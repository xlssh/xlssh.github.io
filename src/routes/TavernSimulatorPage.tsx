import React, { useEffect, useState, useMemo } from 'react';
import { loadTavernGrades, loadTavernWarriors, loadTavernPayConfigs } from '../data/loaders';
import type { TavernGrade, TavernWarrior, TavernPayConfig } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getQualityLabel, getQualityColorClass } from './HeroesPage';
import { Coins, Star, RotateCcw, Trophy } from 'lucide-react';

export const TavernSimulatorPage: React.FC = () => {
  const [grades, setGrades] = useState<TavernGrade[]>([]);
  const [warriors, setWarriors] = useState<TavernWarrior[]>([]);
  const [payConfigs, setPayConfigs] = useState<TavernPayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGradeId, setSelectedGradeId] = useState<number>(0);
  const [pullCount, setPullCount] = useState(10);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gRes, wRes, pRes] = await Promise.all([
        loadTavernGrades(), loadTavernWarriors(), loadTavernPayConfigs()
      ]);
      setGrades(gRes.rows);
      setWarriors(wRes.rows);
      setPayConfigs(pRes.rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const grade = useMemo(() => grades.find(g => g.id === selectedGradeId), [grades, selectedGradeId]);

  // Warriors for selected grade
  const gradeWarriors = useMemo(() => {
    return warriors.filter(w => w.grade === selectedGradeId);
  }, [warriors, selectedGradeId]);

  // Pay configs for selected grade
  const gradePayConfigs = useMemo(() => {
    if (!grade) return [];
    const configIds = Object.values(grade.pay_configs || {}).filter(Boolean);
    return payConfigs.filter(p => configIds.includes(p.id));
  }, [grade, payConfigs]);

  // Drop rate analysis
  const dropAnalysis = useMemo(() => {
    if (gradeWarriors.length === 0) return null;
    const totalSoul = gradeWarriors.reduce((sum, w) => {
      const as = w.awardsoul;
      if (Array.isArray(as)) return sum + (as[0]?.amount || 0);
      if (as && typeof as === 'object') return sum + ((as as any).value || 0);
      return sum;
    }, 0);
    const avgReturn = gradeWarriors.reduce((sum, w) => sum + (w.return_value || 0), 0) / gradeWarriors.length;
    const avgSoulPerPull = totalSoul / gradeWarriors.length;
    return {
      totalWarriors: gradeWarriors.length,
      totalSoul,
      avgReturn,
      avgSoulPerPull,
      chancePerWarrior: (100 / gradeWarriors.length).toFixed(1),
    };
  }, [gradeWarriors]);

  // Simulate pulls
  const simulation = useMemo(() => {
    if (gradeWarriors.length === 0) return [];
    const results: { warrior: TavernWarrior; pull: number }[] = [];
    for (let i = 0; i < pullCount; i++) {
      const idx = Math.floor(Math.random() * gradeWarriors.length);
      results.push({ warrior: gradeWarriors[idx], pull: i + 1 });
    }
    return results;
  }, [gradeWarriors, pullCount]);

  // Simulation stats
  const simStats = useMemo(() => {
    if (simulation.length === 0) return null;
    const soulGained = simulation.reduce((sum, s) => {
      const as = s.warrior.awardsoul;
      if (Array.isArray(as)) return sum + (as[0]?.amount || 0);
      if (as && typeof as === 'object') return sum + ((as as any).value || 0);
      return sum;
    }, 0);
    const goldSpent = simulation.length * (gradePayConfigs[0]?.value || 100000);
    const uniqueWarriors = new Set(simulation.map(s => s.warrior.id)).size;
    return { soulGained, goldSpent, uniqueWarriors };
  }, [simulation, gradePayConfigs]);

  if (loading) return <LoadingState message="Loading tavern databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
          <Coins size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Tavern Gacha Simulator</h1>
          <p className="text-sm text-muted">Analyze tavern pull rates, expected value, and simulate recruitment attempts.</p>
        </div>
      </div>

      {/* Grade Selector */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Tavern Phase</label>
          <select
            value={selectedGradeId}
            onChange={(e) => setSelectedGradeId(parseInt(e.target.value))}
            className="block w-full py-2 px-3 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
          >
            <option value={0}>Select a tavern phase...</option>
            {grades.map(g => (
              <option key={g.id} value={g.id}>Phase {g.page} (Lv.{g.level}+)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Number of Pulls</label>
          <input
            type="number"
            min="1"
            max="100"
            value={pullCount}
            onChange={(e) => setPullCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            className="block w-full py-2 px-3 border border-border rounded-lg text-sm bg-bg font-mono focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </section>

      {/* Grade Info */}
      {grade && (
        <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-bold text-text">Phase {grade.page} — Level {grade.level}+</h3>
            <span className="text-xs text-muted font-mono">{grade.tips}</span>
          </div>

          {/* Pay Configs */}
          {gradePayConfigs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {gradePayConfigs.map(pc => (
                <div key={pc.id} className="p-3 border border-border rounded-xl bg-bg/50">
                  <div className="text-xs font-bold text-text mb-1">{pc.desc}</div>
                  <div className="text-lg font-black font-mono text-amber-500">{pc.value?.toLocaleString()} Gold</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Drop Rate Analysis */}
      {dropAnalysis && (
        <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2">
            <Star size={18} className="text-amber-500" />
            Drop Rate Analysis
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Warriors', value: dropAnalysis.totalWarriors },
              { label: 'Chance per Warrior', value: `${dropAnalysis.chancePerWarrior}%` },
              { label: 'Avg Soul per Pull', value: dropAnalysis.avgSoulPerPull.toFixed(0) },
              { label: 'Avg Return', value: dropAnalysis.avgReturn.toLocaleString() },
            ].map((stat, idx) => (
              <div key={idx} className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">{stat.label}</div>
                <div className="text-lg font-black font-mono text-brand">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Warrior Pool */}
          <div className="mt-4">
            <h4 className="text-sm font-bold text-text mb-2">Available Warriors</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {gradeWarriors.map(w => {
                const as = w.awardsoul;
                const soulVal = Array.isArray(as) ? (as[0]?.amount || 0) : (as && typeof as === 'object' ? ((as as any).value || 0) : 0);
                return (
                  <div key={w.id} className="p-2 border border-border rounded-lg bg-bg/50 flex items-center justify-between text-xs">
                    <span className="font-bold text-text truncate">{w.recruit_name}</span>
                    <span className="font-mono text-amber-500 shrink-0 ml-2">{soulVal} souls</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Simulation */}
      {simulation.length > 0 && (
        <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-text flex items-center gap-2">
              <RotateCcw size={18} className="text-emerald-500" />
              Pull Simulation
            </h3>
            <button
              onClick={() => setPullCount(pullCount)} // Trigger re-render
              className="px-3 py-1.5 text-xs font-bold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors"
            >
              Re-roll
            </button>
          </div>

          {simStats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">Souls Gained</div>
                <div className="text-lg font-black font-mono text-emerald-500">{simStats.soulGained}</div>
              </div>
              <div className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">Gold Spent</div>
                <div className="text-lg font-black font-mono text-amber-500">{simStats.goldSpent.toLocaleString()}</div>
              </div>
              <div className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">Unique Warriors</div>
                <div className="text-lg font-black font-mono text-brand">{simStats.uniqueWarriors}/{dropAnalysis?.totalWarriors}</div>
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto border border-border rounded-xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 p-2">
              {simulation.map((s, idx) => {
                const as = s.warrior.awardsoul;
                const soulVal = Array.isArray(as) ? (as[0]?.amount || 0) : (as && typeof as === 'object' ? ((as as any).value || 0) : 0);
                return (
                  <div key={idx} className="p-2 border border-border rounded-lg bg-bg/50 text-center">
                    <div className="text-[9px] text-subtle">#{s.pull}</div>
                    <div className="text-[11px] font-bold text-text truncate">{s.warrior.recruit_name}</div>
                    <div className="text-[9px] text-amber-500 font-mono">+{soulVal}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
