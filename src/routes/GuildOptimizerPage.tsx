import React, { useEffect, useState, useMemo } from 'react';
import { loadOrgBase, loadOrgAdditions, loadOrgDevotions } from '../data/loaders';
import type { OrganizationBase, OrganizationAddition, OrganizationDevotion } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Trophy, TrendingUp, Users, Coins } from 'lucide-react';

export const GuildOptimizerPage: React.FC = () => {
  const [orgBase, setOrgBase] = useState<OrganizationBase[]>([]);
  const [orgAdditions, setOrgAdditions] = useState<OrganizationAddition[]>([]);
  const [orgDevotions, setOrgDevotions] = useState<OrganizationDevotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(1);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [baseRes, addRes, devRes] = await Promise.all([
        loadOrgBase(), loadOrgAdditions(), loadOrgDevotions()
      ]);
      setOrgBase(baseRes.rows);
      setOrgAdditions(addRes.rows);
      setOrgDevotions(devRes.rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const currentLevelData = useMemo(() => {
    return orgBase.find(o => o.org_level === selectedLevel);
  }, [orgBase, selectedLevel]);

  const additionData = useMemo(() => {
    return orgAdditions.filter(a => a.org_level === selectedLevel);
  }, [orgAdditions, selectedLevel]);

  const maxLevel = orgBase.length > 0 ? Math.max(...orgBase.map(o => o.org_level)) : 1;

  if (loading) return <LoadingState message="Loading guild databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
          <Trophy size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Guild Optimization Planner</h1>
          <p className="text-sm text-muted">Analyze guild upgrades, stat bonuses, and devotion spending.</p>
        </div>
      </div>

      {/* Level Selector */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Guild Level</label>
          <input
            type="range"
            min="1"
            max={maxLevel}
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
            className="w-full accent-brand"
          />
          <div className="text-center text-sm font-mono font-bold text-brand mt-1">Level {selectedLevel}</div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-xs text-subtle uppercase font-bold mb-1">Max Members</div>
          <div className="text-2xl font-black text-brand font-mono">{currentLevelData?.org_max_number ?? 0}</div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-xs text-subtle uppercase font-bold mb-1">Daily Activity Cap</div>
          <div className="text-2xl font-black text-brand font-mono">{currentLevelData?.day_max_activity ?? 0}</div>
        </div>
      </section>

      {currentLevelData && (
        <>
          {/* Level Stats */}
          <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
            <h3 className="font-bold text-text flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" />
              Level {selectedLevel} Properties
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Guild Activity Cap', value: currentLevelData.guild_max_activity },
                { label: 'Silver Bonus', value: `${currentLevelData.get_more_siv}%` },
                { label: 'EXP Bonus', value: `${currentLevelData.get_more_exp}%` },
                { label: 'Camp Upgrade Cost', value: currentLevelData.camp_upgrade_money?.toLocaleString() },
              ].map((stat, idx) => (
                <div key={idx} className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                  <div className="text-[10px] text-subtle uppercase font-bold">{stat.label}</div>
                  <div className="text-lg font-black font-mono text-brand mt-1">{stat.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Stat Bonuses */}
          {additionData.length > 0 && (
            <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
              <h3 className="font-bold text-text flex items-center gap-2">
                <Users size={18} className="text-violet-500" />
                Stat Bonuses at Level {selectedLevel}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {additionData.map((add, idx) => (
                  <div key={idx} className="p-3 border border-border rounded-xl bg-bg/50">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted">ATK:</span> <span className="font-mono font-bold text-text">+{add.atk_addition}</span></div>
                      <div><span className="text-muted">ATK Cost:</span> <span className="font-mono text-muted">{add.atk_consume}</span></div>
                      <div><span className="text-muted">Phys DEF:</span> <span className="font-mono font-bold text-text">+{add.phys_def_addition}</span></div>
                      <div><span className="text-muted">Phys DEF Cost:</span> <span className="font-mono text-muted">{add.phys_def_consume}</span></div>
                      <div><span className="text-muted">Mag DEF:</span> <span className="font-mono font-bold text-text">+{add.mag_def_addition}</span></div>
                      <div><span className="text-muted">Mag DEF Cost:</span> <span className="font-mono text-muted">{add.mag_def_consume}</span></div>
                      <div><span className="text-muted">HP:</span> <span className="font-mono font-bold text-text">+{add.life_addition}</span></div>
                      <div><span className="text-muted">HP Cost:</span> <span className="font-mono text-muted">{add.life_consume}</span></div>
                      <div><span className="text-muted">Speed:</span> <span className="font-mono font-bold text-text">+{add.speed_addition}</span></div>
                      <div><span className="text-muted">Speed Cost:</span> <span className="font-mono text-muted">{add.speed_consume}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Level Progression */}
      <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2">
          <Coins size={18} className="text-amber-500" />
          Level Progression Table
        </h3>
        <div className="max-h-96 overflow-y-auto border border-border rounded-xl">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 bg-surface border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-bold text-subtle">Level</th>
                <th className="px-3 py-2 text-left font-bold text-subtle">Members</th>
                <th className="px-3 py-2 text-left font-bold text-subtle">Activity</th>
                <th className="px-3 py-2 text-left font-bold text-subtle">Silver %</th>
                <th className="px-3 py-2 text-left font-bold text-subtle">EXP %</th>
                <th className="px-3 py-2 text-left font-bold text-subtle">Camp Cost</th>
              </tr>
            </thead>
            <tbody>
              {orgBase.map(o => (
                <tr
                  key={o.id}
                  onClick={() => setSelectedLevel(o.org_level)}
                  className={`border-b border-border cursor-pointer transition-colors ${o.org_level === selectedLevel ? 'bg-brand-soft' : 'hover:bg-bg/50'}`}
                >
                  <td className="px-3 py-2 font-mono font-bold text-text">{o.org_level}</td>
                  <td className="px-3 py-2 font-mono text-muted">{o.org_max_number}</td>
                  <td className="px-3 py-2 font-mono text-muted">{o.day_max_activity}</td>
                  <td className="px-3 py-2 font-mono text-emerald-600 dark:text-emerald-400">{o.get_more_siv}%</td>
                  <td className="px-3 py-2 font-mono text-emerald-600 dark:text-emerald-400">{o.get_more_exp}%</td>
                  <td className="px-3 py-2 font-mono text-muted">{o.camp_upgrade_money?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
