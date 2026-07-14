import React, { useState, useMemo } from 'react';
import { loadOrgBase, loadOrgAdditions, loadOrgDevotions, loadOrgPointInfos, loadOrgPointAwards } from '../data/loaders';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { useAsyncData } from '../hooks/useAsyncData';
import { Trophy, ShieldAlert, Sparkles, Zap, Coins, Users, ChevronRight } from 'lucide-react';

export const GuildPlannerPage: React.FC = () => {
  const [selectedTechLevel, setSelectedTechLevel] = useState<number>(10);
  
  // Interactive Donation Calculator state
  const [basicDonors, setBasicDonors] = useState<number>(10);
  const [goldDonors, setGoldDonors] = useState<number>(15);
  const [premiumDonors, setPremiumDonors] = useState<number>(5);

  const { data: orgData, loading, error, refetch } = useAsyncData(async () => {
    const [baseRes, additionsRes, devotionsRes, pointsRes, pointAwardsRes] = await Promise.all([
      loadOrgBase(),
      loadOrgAdditions(),
      loadOrgDevotions(),
      loadOrgPointInfos(),
      loadOrgPointAwards()
    ]);

    return {
      base: baseRes.rows.sort((a, b) => (a.org_level || 0) - (b.org_level || 0)),
      additions: additionsRes.rows.sort((a, b) => (a.org_level || 0) - (b.org_level || 0)),
      devotions: devotionsRes.rows,
      skills: pointsRes.rows,
      skillAwards: pointAwardsRes.rows
    };
  }, []);

  const base = orgData?.base || [];
  const additions = orgData?.additions || [];
  const skills = orgData?.skills || [];
  const skillAwards = orgData?.skillAwards || [];

  // Max tech level in additions data
  const maxTechLevel = useMemo(() => {
    if (additions.length === 0) return 30;
    return additions[additions.length - 1].org_level || 30;
  }, [additions]);

  // Compute stats for selected tech level
  const techStats = useMemo(() => {
    const currentTech = additions.find(a => a.org_level === selectedTechLevel);
    if (!currentTech) return { atk: 0, def: 0, mag_def: 0, life: 0, costTotal: 0 };
    
    // Calculate cumulative costs to reach this level
    let cumulativeCost = 0;
    for (let i = 0; i <= selectedTechLevel; i++) {
      const levelData = additions.find(a => a.org_level === i);
      if (levelData) {
        cumulativeCost += (levelData.atk_consume || 0) + (levelData.phys_def_consume || 0) + (levelData.life_consume || 0);
      }
    }

    return {
      atk: currentTech.atk_addition || 0,
      def: currentTech.phys_def_addition || 0,
      mag_def: currentTech.mag_def_addition || 0,
      life: currentTech.life_addition || 0,
      costTotal: cumulativeCost
    };
  }, [additions, selectedTechLevel]);

  // Interactive Donation Calculation
  const donationSummary = useMemo(() => {
    // Standard multipliers for donations
    // Basic: 10k Gold cost -> generates 10 guild xp, 10 funds, 10 contribution points
    // Gold: 100k Gold cost -> generates 50 guild xp, 50 funds, 50 contribution
    // Premium: 100 Gold vouchers cost -> generates 200 guild xp, 200 funds, 200 contribution
    const dailyXp = (basicDonors * 10) + (goldDonors * 50) + (premiumDonors * 200);
    const dailyFunds = (basicDonors * 10) + (goldDonors * 50) + (premiumDonors * 200);
    const dailyContrib = (basicDonors * 10) + (goldDonors * 50) + (premiumDonors * 200);

    return {
      dailyXp,
      dailyFunds,
      dailyContrib,
      weeklyXp: dailyXp * 7,
      weeklyFunds: dailyFunds * 7,
      weeklyContrib: dailyContrib * 7
    };
  }, [basicDonors, goldDonors, premiumDonors]);

  if (loading) return <LoadingState message="Connecting to Guild Core, loaded tech tree nodes..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6 animate-fade-in text-text">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
            <Trophy size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text">Guild & Organization Progression Planner</h1>
            <p className="text-xs text-muted">Estimate and simulate stat bonuses, tech costs, daily donation paths, and skill allocations.</p>
          </div>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Tech upgrade calculator */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Tech additions slider block */}
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-text flex items-center gap-2 border-b border-border pb-2">
              <Zap size={18} className="text-amber-500" />
              <span>Guild Technology Stat Bonus Calculator</span>
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-subtle">Selected Tech Upgrade Level</span>
                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 bg-bg px-2.5 py-1 rounded border border-border">
                  Lv. {selectedTechLevel} / {maxTechLevel}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={maxTechLevel}
                value={selectedTechLevel}
                onChange={(e) => setSelectedTechLevel(parseInt(e.target.value))}
                className="w-full h-2 bg-bg rounded-lg appearance-none cursor-pointer accent-brand"
              />
            </div>

            {/* Simulated Stat Boosts Display */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-bg/40 border border-border rounded-xl text-center">
                <span className="text-[10px] text-subtle font-bold block mb-1">ATK Increase</span>
                <span className="font-mono font-black text-text text-base">+{techStats.atk}</span>
              </div>
              <div className="p-3 bg-bg/40 border border-border rounded-xl text-center">
                <span className="text-[10px] text-subtle font-bold block mb-1">DEF Increase</span>
                <span className="font-mono font-black text-text text-base">+{techStats.def}</span>
              </div>
              <div className="p-3 bg-bg/40 border border-border rounded-xl text-center">
                <span className="text-[10px] text-subtle font-bold block mb-1">M. DEF Increase</span>
                <span className="font-mono font-black text-text text-base">+{techStats.mag_def}</span>
              </div>
              <div className="p-3 bg-bg/40 border border-border rounded-xl text-center">
                <span className="text-[10px] text-subtle font-bold block mb-1">Max Life (HP)</span>
                <span className="font-mono font-black text-text text-base">+{techStats.life}</span>
              </div>
            </div>

            {/* Upgrade Costing stats */}
            <div className="p-3.5 bg-violet-500/5 dark:bg-violet-950/25 border border-violet-100 dark:border-violet-950/50 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-violet-500" />
                <span className="font-semibold text-muted">Estimated Cumulative Contribution points cost</span>
              </div>
              <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400">
                {techStats.costTotal.toLocaleString()} Contrib
              </span>
            </div>
          </div>

          {/* Daily Donation Simulator */}
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-text flex items-center gap-2 border-b border-border pb-2">
              <Coins size={18} className="text-emerald-500" />
              <span>Daily Active Contribution Estimator</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-subtle font-semibold block">Basic (10k Gold) Donors</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={basicDonors}
                  onChange={(e) => setBasicDonors(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 border border-border rounded-xl bg-bg text-text focus:outline-none focus:ring-1 focus:ring-brand font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-subtle font-semibold block">Gold (100k Gold) Donors</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={goldDonors}
                  onChange={(e) => setGoldDonors(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 border border-border rounded-xl bg-bg text-text focus:outline-none focus:ring-1 focus:ring-brand font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-subtle font-semibold block">Premium (100 Vouchers) Donors</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={premiumDonors}
                  onChange={(e) => setPremiumDonors(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 border border-border rounded-xl bg-bg text-text focus:outline-none focus:ring-1 focus:ring-brand font-mono font-bold"
                />
              </div>
            </div>

            {/* Calculations Result Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-bg/40 border border-border rounded-xl space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-600 dark:text-emerald-400 block border-b border-border/70 pb-1">Daily Yield Estimates</span>
                <div className="flex justify-between text-xs">
                  <span className="text-subtle">Guild EXP / Funds</span>
                  <span className="font-mono font-bold text-text">+{donationSummary.dailyXp.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-subtle">Direct Member Contrib</span>
                  <span className="font-mono font-bold text-text">+{donationSummary.dailyContrib.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3 bg-bg/40 border border-border rounded-xl space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-[10px] text-brand block border-b border-border/70 pb-1">Weekly Cumulative Projection</span>
                <div className="flex justify-between text-xs">
                  <span className="text-subtle">Weekly EXP / Funds</span>
                  <span className="font-mono font-bold text-text">+{donationSummary.weeklyXp.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-subtle">Weekly Contrib Yield</span>
                  <span className="font-mono font-bold text-text">+{donationSummary.weeklyContrib.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Base levels progression Table & Points */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Base limits levels list */}
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-text flex items-center gap-2 border-b border-border pb-2">
              <Users size={18} className="text-indigo-500" />
              <span>Guild Base Size & Membership limits</span>
            </h3>
            
            <div className="max-h-64 overflow-y-auto pr-1 text-xs space-y-2">
              {base.map((item) => (
                <div key={item.id} className="p-2.5 bg-bg/40 border border-border rounded-xl flex justify-between items-center">
                  <div>
                    <span className="font-bold text-text">Guild Level {item.org_level}</span>
                    <span className="block text-[10px] text-subtle mt-0.5">Daily Limit: {item.day_max_activity} Active</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-subtle block font-semibold">Max Members</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{item.org_max_number} Allies</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Devotion / contribution guidelines */}
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-text flex items-center gap-2 border-b border-border pb-2">
              <ShieldAlert size={18} className="text-violet-500" />
              <span>Guild Skills Point Catalog</span>
            </h3>
            <div className="max-h-64 overflow-y-auto pr-1 text-xs space-y-2">
              {skills.slice(0, 10).map((skill) => (
                <div key={skill.id} className="p-2.5 bg-bg/40 border border-border rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-text">{skill.name || `Point #${skill.id}`}</span>
                    <span className="font-mono text-[10px] text-subtle">ID: #{skill.id}</span>
                  </div>
                  <p className="text-[11px] text-subtle truncate">{skill.army?.text || 'No skill description available.'}</p>
                </div>
              ))}
              {skills.length > 10 && (
                <div className="text-center text-[10px] text-muted font-bold pt-1.5 flex items-center justify-center gap-1">
                  <span>And {skills.length - 10} more skill nodes available in DB...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
