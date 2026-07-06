import React, { useEffect, useState, useMemo } from 'react';
import { loadHeroes, loadRecommendHeroes, loadRelatedPartners, loadRelatedPartnerTypes, loadBaseStones } from '../data/loaders';
import { Hero, RecommendHero, RelatedPartner, RelatedPartnerType, BaseStone } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getProfessionLabel, getAttributeName } from '../data/relationships';
import { getQualityLabel, getQualityColorClass } from './HeroesPage';
import { Swords, TrendingUp, Shield, Sparkles, BarChart3, Target, Zap, HeartHandshake } from 'lucide-react';

// Core BP formula from game client
function calcBaseBP(h: Hero, lv: number): number {
  const l = Math.max(1, lv);
  return (
    (h.power ?? 0) + Math.round((h.power_grow ?? 0) * (l - 1)) +
    (h.agile ?? 0) + Math.round((h.agile_grow ?? 0) * (l - 1)) +
    (h.intelligence ?? 0) + Math.round((h.intelligence_grow ?? 0) * (l - 1)) +
    Math.round(((h.life ?? 0) + Math.round((h.life_grow ?? 0) * (l - 1))) / 10)
  );
}

// Stat breakdown for display
interface StatBreakdown {
  name: string;
  base: number;
  growth: number;
  total: number;
  contribution: number; // how much this stat adds to BP
}

function getStatBreakdown(h: Hero, lv: number): StatBreakdown[] {
  const l = Math.max(1, lv);
  const stats = [
    { name: 'Power (STR)', base: h.power ?? 0, growth: h.power_grow ?? 0, divisor: 1 },
    { name: 'Agility (AGI)', base: h.agile ?? 0, growth: h.agile_grow ?? 0, divisor: 1 },
    { name: 'Intelligence (INT)', base: h.intelligence ?? 0, growth: h.intelligence_grow ?? 0, divisor: 1 },
    { name: 'Life (HP)', base: h.life ?? 0, growth: h.life_grow ?? 0, divisor: 10 },
  ];
  return stats.map(s => {
    const total = s.base + Math.round(s.growth * (l - 1));
    const contribution = s.divisor === 1 ? total : Math.round(total / s.divisor);
    return { name: s.name, base: s.base, growth: s.growth, total, contribution };
  });
}

// Growth rate ranking
interface GrowthStat {
  name: string;
  rate: number;
  projected: number;
}

function getGrowthStats(h: Hero, lv: number): GrowthStat[] {
  const l = Math.max(1, lv);
  return [
    { name: 'STR Growth', rate: h.power_grow ?? 0, projected: (h.power ?? 0) + Math.round((h.power_grow ?? 0) * (l - 1)) },
    { name: 'AGI Growth', rate: h.agile_grow ?? 0, projected: (h.agile ?? 0) + Math.round((h.agile_grow ?? 0) * (l - 1)) },
    { name: 'INT Growth', rate: h.intelligence_grow ?? 0, projected: (h.intelligence ?? 0) + Math.round((h.intelligence_grow ?? 0) * (l - 1)) },
    { name: 'HP Growth', rate: h.life_grow ?? 0, projected: (h.life ?? 0) + Math.round((h.life_grow ?? 0) * (l - 1)) },
  ];
}

// Combat rate stats
interface CombatRate {
  name: string;
  value: number;
  category: 'offense' | 'defense' | 'utility';
}

function getCombatRates(h: Hero): CombatRate[] {
  return [
    { name: 'Hit Rate', value: h.hit_rate ?? 0, category: 'offense' },
    { name: 'Crit Rate', value: h.crit_rate ?? 0, category: 'offense' },
    { name: 'Hurt Rate', value: h.hurt_rate ?? 0, category: 'offense' },
    { name: 'Wreck Rate', value: h.wreck_rate ?? 0, category: 'offense' },
    { name: 'Punch Rate', value: h.punch_rate ?? 0, category: 'offense' },
    { name: 'Attach Rate', value: h.attach_rate ?? 0, category: 'offense' },
    { name: 'Dodge Rate', value: h.dodge_rate ?? 0, category: 'defense' },
    { name: 'Block Rate', value: h.block_rate ?? 0, category: 'defense' },
    { name: 'Avoid Hurt Rate', value: h.avoid_hurt_rate ?? 0, category: 'defense' },
    { name: 'Anti-knock Rate', value: h.antiknock_rate ?? 0, category: 'defense' },
    { name: 'Defense Rate', value: h.defense_rate ?? 0, category: 'defense' },
    { name: 'Recover Rate', value: h.recover_rate ?? 0, category: 'utility' },
    { name: 'Help Rate', value: h.help_rate ?? 0, category: 'utility' },
  ];
}

// Range attack stats
interface RangeAttack {
  name: string;
  attack: number;
  defense: number;
}

function getRangeAttacks(h: Hero): RangeAttack[] {
  return [
    { name: 'Near (Melee)', attack: h.near_attack ?? 0, defense: h.near_defense ?? 0 },
    { name: 'Far (Ranged)', attack: h.far_attack ?? 0, defense: h.far_defense ?? 0 },
    { name: 'Strategy (Kido)', attack: h.strategy_attack ?? 0, defense: h.strategy_defense ?? 0 },
  ];
}

export const BattlePowerPage: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHeroId, setSelectedHeroId] = useState<number>(11100001);
  const [targetLevel, setTargetLevel] = useState(50);

  // Bonus simulators
  const [jadeBonus, setJadeBonus] = useState(0);
  const [bondBonus, setBondBonus] = useState(0);
  const [equipBonus, setEquipBonus] = useState(0);
  const [starBonus, setStarBonus] = useState(0);
  const [militaryBonus, setMilitaryBonus] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await loadHeroes();
      setHeroes(data.rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const hero = useMemo(() => heroes.find(h => h.id === selectedHeroId) || null, [heroes, selectedHeroId]);

  const statBreakdown = useMemo(() => hero ? getStatBreakdown(hero, targetLevel) : [], [hero, targetLevel]);
  const growthStats = useMemo(() => hero ? getGrowthStats(hero, targetLevel) : [], [hero, targetLevel]);
  const combatRates = useMemo(() => hero ? getCombatRates(hero) : [], [hero]);
  const rangeAttacks = useMemo(() => hero ? getRangeAttacks(hero) : [], [hero]);

  const baseBP = useMemo(() => hero ? calcBaseBP(hero, targetLevel) : 0, [hero, targetLevel]);
  const totalBP = baseBP + jadeBonus + bondBonus + equipBonus + starBonus + militaryBonus;
  const statContribution = statBreakdown.reduce((s, st) => s + st.contribution, 0);

  if (loading) return <LoadingState message="Loading hero database..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
            <Swords size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">Fighting Power Calculator</h1>
            <p className="text-sm text-muted">Analyze Battle Power (GetFightingPower) — hero contribution, growth curves, and stat breakdowns.</p>
          </div>
        </div>
      </div>

      {/* Hero Selector & Level */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Select Hero</label>
          <select
            value={selectedHeroId}
            onChange={(e) => setSelectedHeroId(parseInt(e.target.value))}
            className="block w-full py-2 px-3 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
          >
            {heroes.map(h => (
              <option key={h.id} value={h.id}>{h.name} ({getQualityLabel(h.quality)})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">Target Level</label>
          <input
            type="range"
            min="1"
            max="159"
            value={targetLevel}
            onChange={(e) => setTargetLevel(parseInt(e.target.value))}
            className="w-full accent-brand"
          />
          <div className="text-center text-sm font-mono font-bold text-brand mt-1">Lv. {targetLevel}</div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-xs text-subtle uppercase font-bold mb-1">Total Battle Power</div>
          <div className="text-3xl font-black text-brand font-mono">{totalBP.toLocaleString()}</div>
          <div className="text-[11px] text-muted mt-0.5">
            Base: {baseBP.toLocaleString()} + Bonuses: {(totalBP - baseBP).toLocaleString()}
          </div>
        </div>
      </section>

      {/* BP Breakdown Bar */}
      <section className="p-4 border border-border bg-surface rounded-xl shadow-sm">
        <h3 className="text-sm font-bold text-text mb-3">Power Composition</h3>
        <div className="flex h-4 rounded-full overflow-hidden bg-bg">
          <div className="bg-indigo-500 transition-all" style={{ width: `${(statContribution / Math.max(totalBP, 1)) * 100}%` }} title="Base Stats" />
          <div className="bg-emerald-500 transition-all" style={{ width: `${(equipBonus / Math.max(totalBP, 1)) * 100}%` }} title="Equipment" />
          <div className="bg-amber-500 transition-all" style={{ width: `${(jadeBonus / Math.max(totalBP, 1)) * 100}%` }} title="Jade" />
          <div className="bg-rose-500 transition-all" style={{ width: `${(bondBonus / Math.max(totalBP, 1)) * 100}%` }} title="Bonds" />
          <div className="bg-violet-500 transition-all" style={{ width: `${(starBonus / Math.max(totalBP, 1)) * 100}%` }} title="Star" />
          <div className="bg-fuchsia-500 transition-all" style={{ width: `${(militaryBonus / Math.max(totalBP, 1)) * 100}%` }} title="Military" />
        </div>
        <div className="flex flex-wrap gap-3 mt-3 text-[11px]">
          {[
            { label: 'Base Stats', color: 'bg-indigo-500', val: statContribution },
            { label: 'Equipment', color: 'bg-emerald-500', val: equipBonus },
            { label: 'Jade', color: 'bg-amber-500', val: jadeBonus },
            { label: 'Bonds', color: 'bg-rose-500', val: bondBonus },
            { label: 'Star/Modify', color: 'bg-violet-500', val: starBonus },
            { label: 'Military', color: 'bg-fuchsia-500', val: militaryBonus },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              <span className="text-muted">{item.label}:</span>
              <span className="font-bold text-text font-mono">{item.val.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stat Breakdown */}
        <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-500" />
            Stat Breakdown at Lv.{targetLevel}
          </h3>
          <div className="space-y-3">
            {statBreakdown.map((stat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-muted">{stat.name}</span>
                  <span className="font-mono font-bold text-text">{stat.total.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min((stat.contribution / Math.max(statContribution, 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-[11px] font-mono text-muted w-16 text-right">+{stat.contribution.toLocaleString()} BP</span>
                </div>
                <div className="text-[10px] text-subtle">Base: {stat.base} + Growth: {stat.growth.toFixed(2)} x {targetLevel - 1} = {stat.total.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Growth Curves */}
        <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500" />
            Growth Rates & Projections
          </h3>
          <div className="space-y-3">
            {growthStats.map((stat, idx) => (
              <div key={idx} className="p-3 border border-border rounded-lg bg-bg/50">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-text">{stat.name}</span>
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">+{stat.rate.toFixed(2)}/lv</span>
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>Projected at Lv.{targetLevel}:</span>
                  <span className="font-mono font-bold">{stat.projected.toLocaleString()}</span>
                </div>
                <div className="mt-1.5 h-1.5 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((stat.projected / 5000) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Combat Rates */}
      <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2">
          <Target size={18} className="text-amber-500" />
          Combat Rate Coefficients
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {combatRates.map((rate, idx) => (
            <div key={idx} className={`p-3 border rounded-lg text-center ${rate.category === 'offense' ? 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20' : rate.category === 'defense' ? 'border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20' : 'border-border bg-bg/50'}`}>
              <span className="text-[10px] text-subtle block mb-0.5">{rate.name}</span>
              <span className="font-mono font-bold text-sm text-text">{rate.value.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* Range Attacks */}
      <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2">
          <Zap size={18} className="text-violet-500" />
          Attack Range Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rangeAttacks.map((range, idx) => (
            <div key={idx} className="p-4 border border-border rounded-xl bg-bg/50 space-y-2">
              <div className="text-sm font-bold text-text">{range.name}</div>
              <div className="flex justify-between">
                <span className="text-xs text-muted">Attack</span>
                <span className="font-mono font-bold text-red-600 dark:text-red-400">{range.attack}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted">Defense</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{range.defense}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bonus Simulator */}
      <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2">
          <Sparkles size={18} className="text-fuchsia-500" />
          Bonus Simulator
        </h3>
        <p className="text-xs text-muted">Estimate additional power from progression systems.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Equipment Bonus', value: equipBonus, set: setEquipBonus, icon: Swords, color: 'text-emerald-500' },
            { label: 'Jade Bonus', value: jadeBonus, set: setJadeBonus, icon: Sparkles, color: 'text-amber-500' },
            { label: 'Bond Bonus', value: bondBonus, set: setBondBonus, icon: HeartHandshake, color: 'text-rose-500' },
            { label: 'Star/Modify Bonus', value: starBonus, set: setStarBonus, icon: Shield, color: 'text-violet-500' },
            { label: 'Military Rank Bonus', value: militaryBonus, set: setMilitaryBonus, icon: TrendingUp, color: 'text-fuchsia-500' },
          ].map(item => (
            <div key={item.label} className="p-3 border border-border rounded-xl bg-bg/50 space-y-2">
              <div className="flex items-center gap-2">
                <item.icon size={14} className={item.color} />
                <span className="text-xs font-bold text-text">{item.label}</span>
              </div>
              <input
                type="number"
                min="0"
                value={item.value}
                onChange={(e) => item.set(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-1.5 border border-border rounded-lg text-sm font-mono bg-bg focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
