import React, { useEffect, useState, useMemo } from 'react';
import { loadKnives, loadKnifeExpands, loadKnifeStrengthens, loadWeaponSkills } from '../data/loaders';
import type { Knife, KnifeExpand, KnifeStrengthen, WeaponSkill } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Swords, TrendingUp, Sparkles, Shield } from 'lucide-react';

const ATTR_LABELS: Record<number, string> = { 16: 'Phys ATK', 17: 'Phys DEF', 18: 'Ranged ATK', 19: 'Ranged DEF', 20: 'Kido ATK', 21: 'Kido DEF' };

export const WeaponEvolutionPage: React.FC = () => {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [expands, setExpands] = useState<KnifeExpand[]>([]);
  const [strengthens, setStrengthens] = useState<KnifeStrengthen[]>([]);
  const [skills, setSkills] = useState<WeaponSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeaponId, setSelectedWeaponId] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kRes, eRes, sRes, skRes] = await Promise.all([
        loadKnives(), loadKnifeExpands(), loadKnifeStrengthens(), loadWeaponSkills()
      ]);
      setKnives(kRes.rows);
      setExpands(eRes.rows);
      setStrengthens(sRes.rows);
      setSkills(skRes.rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const weapon = useMemo(() => knives.find(k => k.id === selectedWeaponId), [knives, selectedWeaponId]);

  // Expands for selected weapon
  const weaponExpands = useMemo(() => {
    return expands.filter(e => e.relation_id === selectedWeaponId).sort((a, b) => a.level - b.level);
  }, [expands, selectedWeaponId]);

  // Strengthens for selected weapon
  const weaponStrengthens = useMemo(() => {
    return strengthens.filter(s => {
      if (s.heros && s.heros.includes(selectedWeaponId)) return true;
      if (s.effect_ids) {
        return s.effect_ids.some(eid => weaponExpands.some(exp => exp.skill_id === eid));
      }
      return false;
    });
  }, [strengthens, selectedWeaponId, weaponExpands]);

  // Skill lookup
  const skillMap = useMemo(() => {
    const m = new Map<number, WeaponSkill>();
    skills.forEach(s => m.set(s.id, s));
    return m;
  }, [skills]);

  if (loading) return <LoadingState message="Loading weapon databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
          <Swords size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Weapon Evolution Tree Visualizer</h1>
          <p className="text-sm text-muted">Browse zanpakuto evolution paths, skills, and stat bonuses.</p>
        </div>
      </div>

      {/* Weapon Selector */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm">
        <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Select Weapon</label>
        <select
          value={selectedWeaponId}
          onChange={(e) => setSelectedWeaponId(parseInt(e.target.value))}
          className="block w-full py-2 px-3 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
        >
          <option value={0}>Select a weapon...</option>
          {knives.map(k => (
            <option key={k.id} value={k.id}>{k.name} ({k.appraise})</option>
          ))}
        </select>
      </section>

      {weapon && (
        <>
          {/* Weapon Info */}
          <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-text text-lg">{weapon.name}</h3>
                <p className="text-xs text-muted">{weapon.get_road}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-soft text-brand">{weapon.appraise}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Attack', value: weapon.attack, color: 'text-red-500' },
                { label: 'Defense', value: weapon.defense, color: 'text-blue-500' },
                { label: 'Recovery', value: weapon.recovery, color: 'text-emerald-500' },
                { label: 'Resistance', value: weapon.resistance, color: 'text-violet-500' },
                { label: 'Speed', value: weapon.speed, color: 'text-amber-500' },
              ].map((stat, idx) => (
                <div key={idx} className="p-3 border border-border rounded-xl bg-bg/50 text-center">
                  <div className="text-[10px] text-subtle uppercase font-bold">{stat.label}</div>
                  <div className={`text-lg font-black font-mono ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>
            {/* Attribute Bonuses */}
            {weapon.attribute_type && weapon.base_value && (
              <div className="flex flex-wrap gap-2">
                {weapon.attribute_type.map((type, idx) => (
                  <span key={idx} className="px-2 py-1 bg-brand-soft/50 text-brand rounded text-xs font-bold">
                    +{weapon.base_value[idx]} {ATTR_LABELS[type] || `Type ${type}`}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Evolution Path */}
          {weaponExpands.length > 0 && (
            <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
              <h3 className="font-bold text-text flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" />
                Evolution Path ({weaponExpands.length} stages)
              </h3>
              <div className="space-y-3">
                {weaponExpands.map((exp, idx) => {
                  const skill = skillMap.get(exp.skill_id);
                  return (
                    <div key={exp.id} className="p-4 border border-border rounded-xl bg-bg/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-brand-soft text-brand flex items-center justify-center text-xs font-bold">{exp.level}</span>
                          <span className="font-bold text-text">Stage {exp.level}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted">ID: {exp.id}</span>
                      </div>
                      {skill && (
                        <div className="p-2 bg-surface border border-border rounded-lg mb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles size={12} className="text-amber-500" />
                            <span className="text-xs font-bold text-text">{skill.name}</span>
                          </div>
                          <p className="text-[11px] text-muted mt-1">{skill.desc}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-[11px] text-muted">
                        <span>Soul Lv. Need: <span className="font-mono font-bold text-text">{exp.soul_level_need}</span></span>
                        <span>Quality: <span className="font-mono font-bold text-text">{exp.quality}</span></span>
                        <span>EXP: <span className="font-mono font-bold text-text">{exp.need_exp}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* Weapon List */}
      {knives.length > 0 && (
        <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2">
            <Shield size={18} className="text-violet-500" />
            All Weapons ({knives.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {knives.map(k => (
              <button
                key={k.id}
                onClick={() => setSelectedWeaponId(k.id)}
                className={`p-3 border rounded-xl text-left transition-all ${selectedWeaponId === k.id ? 'border-brand bg-brand-soft' : 'border-border bg-bg/50 hover:border-brand-soft'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-text">{k.name}</span>
                  <span className="text-[10px] font-bold text-brand">{k.appraise}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted">
                  <span>ATK:{k.attack}</span>
                  <span>DEF:{k.defense}</span>
                  <span>SPD:{k.speed}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
