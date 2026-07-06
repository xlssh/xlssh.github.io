import React, { useEffect, useState, useMemo } from 'react';
import { loadSpiritSchools, loadSpiritSchoolExps } from '../data/loaders';
import type { SpiritSchool, SpiritSchoolExp } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Sparkles, TrendingUp, Target } from 'lucide-react';

export const SpiritSchoolPage: React.FC = () => {
  const [schools, setSchools] = useState<SpiritSchool[]>([]);
  const [exps, setExps] = useState<SpiritSchoolExp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(0);
  const [targetLevel, setTargetLevel] = useState(50);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sRes, eRes] = await Promise.all([loadSpiritSchools(), loadSpiritSchoolExps()]);
      setSchools(sRes.rows);
      setExps(eRes.rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const school = useMemo(() => schools.find(s => s.id === selectedSchoolId), [schools, selectedSchoolId]);

  // EXP entries for selected school
  const schoolExps = useMemo(() => {
    return exps
      .filter(e => e.monster_id === selectedSchoolId)
      .sort((a, b) => a.monster_level - b.monster_level);
  }, [exps, selectedSchoolId]);

  // Stats at target level
  const statsAtLevel = useMemo(() => {
    return schoolExps.find(e => e.monster_level === targetLevel);
  }, [schoolExps, targetLevel]);

  // Total EXP needed to reach target level
  const totalExpNeeded = useMemo(() => {
    return schoolExps
      .filter(e => e.monster_level <= targetLevel)
      .reduce((sum, e) => sum + (e.need_exp || 0), 0);
  }, [schoolExps, targetLevel]);

  const maxLevel = schoolExps.length > 0 ? Math.max(...schoolExps.map(e => e.monster_level)) : 1;

  if (loading) return <LoadingState message="Loading spirit school databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
          <Sparkles size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Spirit School Training Planner</h1>
          <p className="text-sm text-muted">Analyze training paths, EXP costs, and stat bonuses for each school.</p>
        </div>
      </div>

      {/* School Selector & Level */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Spirit School</label>
          <select
            value={selectedSchoolId}
            onChange={(e) => { setSelectedSchoolId(parseInt(e.target.value)); setTargetLevel(0); }}
            className="block w-full py-2 px-3 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
          >
            <option value={0}>Select a school...</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.effect_name})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Target Level</label>
          <input
            type="range"
            min="0"
            max={maxLevel}
            value={Math.min(targetLevel, maxLevel)}
            onChange={(e) => setTargetLevel(parseInt(e.target.value))}
            className="w-full accent-brand"
          />
          <div className="text-center text-sm font-mono font-bold text-brand mt-1">Level {targetLevel}</div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-xs text-subtle uppercase font-bold mb-1">Total EXP Needed</div>
          <div className="text-2xl font-black text-brand font-mono">{totalExpNeeded.toLocaleString()}</div>
        </div>
      </section>

      {school && (
        <>
          {/* School Info */}
          <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
            <h3 className="font-bold text-text flex items-center gap-2">
              <Target size={18} className="text-emerald-500" />
              {school.name}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">Effect</div>
                <div className="text-sm font-black font-mono text-brand">{school.effect_name}</div>
              </div>
              <div className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">Max Level</div>
                <div className="text-sm font-black font-mono text-text">{school.level_limit}</div>
              </div>
              <div className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                <div className="text-[10px] text-subtle uppercase font-bold">Stat Type</div>
                <div className="text-sm font-black font-mono text-text">#{school.add_type}</div>
              </div>
            </div>
          </section>

          {/* Training Path */}
          <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
            <h3 className="font-bold text-text flex items-center gap-2">
              <TrendingUp size={18} className="text-violet-500" />
              Training Path
            </h3>
            <div className="max-h-96 overflow-y-auto border border-border rounded-xl">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-surface border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-subtle">Level</th>
                    <th className="px-3 py-2 text-left font-bold text-subtle">EXP Needed</th>
                    <th className="px-3 py-2 text-left font-bold text-subtle">Stat Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolExps.map(e => (
                    <tr
                      key={e.id}
                      className={`border-b border-border ${e.monster_level === targetLevel ? 'bg-brand-soft' : 'hover:bg-bg/50'}`}
                    >
                      <td className="px-3 py-2 font-mono font-bold text-text">Lv.{e.monster_level}</td>
                      <td className="px-3 py-2 font-mono text-muted">{e.need_exp?.toLocaleString()}</td>
                      <td className="px-3 py-2 font-mono text-emerald-500">+{e.add_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
