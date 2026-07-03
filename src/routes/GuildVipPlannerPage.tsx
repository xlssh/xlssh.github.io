import React, { useEffect, useState, useMemo } from 'react';
import { loadOrgBase, loadOrgAdditions, loadOrgDevotions, loadVipConfigs } from '../data/loaders';
import { OrganizationBase, OrganizationAddition, OrganizationDevotion, VipConfig } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { Award, Shield, Sparkles, Trophy, Users, Star, Zap, HelpCircle, ChevronRight, Plus, Minus, Check, Scale } from 'lucide-react';

export const GuildVipPlannerPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orgBases, setOrgBase] = useState<OrganizationBase[]>([]);
  const [orgAdditions, setOrgAdditions] = useState<OrganizationAddition[]>([]);
  const [orgDevotions, setOrgDevotions] = useState<OrganizationDevotion[]>([]);
  const [vipConfigs, setVipConfigs] = useState<VipConfig[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'guild' | 'vip'>('guild');

  // Guild skill levels (state)
  const [skillAtk, setSkillAtk] = useState(1);
  const [skillHp, setSkillHp] = useState(1);
  const [skillPhysDef, setSkillPhysDef] = useState(1);
  const [skillMagDef, setSkillMagDef] = useState(1);
  const [skillSpeed, setSkillSpeed] = useState(1);
  const [guildLevel, setGuildLevel] = useState(10);

  // VIP focus states
  const [selectedVipLevel, setSelectedVipLevel] = useState<number>(1);

  useEffect(() => {
    Promise.all([loadOrgBase(), loadOrgAdditions(), loadOrgDevotions(), loadVipConfigs()])
      .then(([baseRes, addRes, devRes, vipRes]) => {
        setOrgBase(baseRes.rows);
        setOrgAdditions(addRes.rows);
        setOrgDevotions(devRes.rows);
        setVipConfigs(vipRes.rows);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load guild & VIP database tables.");
        setLoading(false);
      });
  }, []);

  const additionsMap = useMemo(() => {
    const map = new Map<number, OrganizationAddition>();
    orgAdditions.forEach(add => map.set(add.org_level, add));
    return map;
  }, [orgAdditions]);

  const maxSkillLevel = useMemo(() => {
    return orgAdditions.length > 0 ? Math.max(...orgAdditions.map(a => a.org_level)) : 50;
  }, [orgAdditions]);

  // Calculate cumulative stats & contribution costs
  const plannerSummary = useMemo(() => {
    let totalContributionCost = 0;
    let totalAtk = 0;
    let totalHp = 0;
    let totalPhysDef = 0;
    let totalMagDef = 0;
    let totalSpeed = 0;

    // ATK
    for (let lv = 1; lv <= skillAtk; lv++) {
      const add = additionsMap.get(lv);
      if (add) {
        totalAtk += add.atk_addition || 0;
        totalContributionCost += add.atk_consume || 0;
      }
    }

    // HP / Life
    for (let lv = 1; lv <= skillHp; lv++) {
      const add = additionsMap.get(lv);
      if (add) {
        totalHp += add.life_addition || 0;
        totalContributionCost += add.life_consume || 0;
      }
    }

    // Phys Def
    for (let lv = 1; lv <= skillPhysDef; lv++) {
      const add = additionsMap.get(lv);
      if (add) {
        totalPhysDef += add.phys_def_addition || 0;
        totalContributionCost += add.phys_def_consume || 0;
      }
    }

    // Mag Def
    for (let lv = 1; lv <= skillMagDef; lv++) {
      const add = additionsMap.get(lv);
      if (add) {
        totalMagDef += add.mag_def_addition || 0;
        totalContributionCost += add.mag_def_consume || 0;
      }
    }

    // Speed
    for (let lv = 1; lv <= skillSpeed; lv++) {
      const add = additionsMap.get(lv);
      if (add) {
        totalSpeed += add.speed_addition || 0;
        totalContributionCost += add.speed_consume || 0;
      }
    }

    return {
      totalContributionCost,
      stats: [
        { name: 'Attack Upgrade (ATK)', val: totalAtk, costNext: additionsMap.get(skillAtk + 1)?.atk_consume || 0, level: skillAtk, set: setSkillAtk },
        { name: 'Life Expansion (HP)', val: totalHp, costNext: additionsMap.get(skillHp + 1)?.life_consume || 0, level: skillHp, set: setSkillHp },
        { name: 'Physical Armor (P-DEF)', val: totalPhysDef, costNext: additionsMap.get(skillPhysDef + 1)?.phys_def_consume || 0, level: skillPhysDef, set: setSkillPhysDef },
        { name: 'Spiritual Resistance (M-DEF)', val: totalMagDef, costNext: additionsMap.get(skillMagDef + 1)?.mag_def_consume || 0, level: skillMagDef, set: setSkillMagDef },
        { name: 'Speed Initiative (SPD)', val: totalSpeed, costNext: additionsMap.get(skillSpeed + 1)?.speed_consume || 0, level: skillSpeed, set: setSkillSpeed }
      ]
    };
  }, [skillAtk, skillHp, skillPhysDef, skillMagDef, skillSpeed, additionsMap]);

  // Resolve guild base perks for selected guild level
  const resolvedGuildBase = useMemo(() => {
    return orgBases.find(ob => ob.org_level === guildLevel) || orgBases[orgBases.length - 1] || null;
  }, [guildLevel, orgBases]);

  if (loading) {
    return <LoadingState message="Decoding Faction additions & VIP privilege tiers..." />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" /> Guild Devotion & VIP Board
          </h1>
          <p className="text-muted mt-1">
            Simulate faction level-up multipliers, plan contribution skill stat upgrades, or compare premium tier limits.
          </p>
        </div>

        {/* Tab Selectors */}
        <div className="flex bg-surface-raised p-1 rounded-xl border border-border self-start md:self-auto">
          <button
            onClick={() => setActiveTab('guild')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all ${activeTab === 'guild'
              ? 'bg-surface text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-muted hover:text-text dark:hover:text-zinc-200'
              }`}
          >
            <Users className="w-4 h-4" /> Guild Skill Planner
          </button>
          <button
            onClick={() => setActiveTab('vip')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all ${activeTab === 'vip'
              ? 'bg-surface text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-muted hover:text-text dark:hover:text-zinc-200'
              }`}
          >
            <Star className="w-4 h-4" /> VIP Privilege Matrix
          </button>
        </div>
      </div>

      {activeTab === 'guild' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Sliders & level knobs */}
          <div className="lg:col-span-2 bg-surface rounded-2xl border border-border p-5 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-text flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" /> Stats Level Planner
              </h2>
              <p className="text-xs text-muted mt-0.5">Customize upgrade tiers up to maximum config level ({maxSkillLevel}).</p>
            </div>

            <div className="space-y-4">
              {plannerSummary.stats.map(stat => (
                <div key={stat.name} className="p-4 bg-bg border border-border rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-text">{stat.name}</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">Level {stat.level} / {maxSkillLevel}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Knobs */}
                    <button
                      disabled={stat.level <= 1}
                      onClick={() => stat.set(prev => Math.max(1, prev - 1))}
                      className="p-1.5 rounded-lg border border-border bg-surface disabled:opacity-20 hover:bg-bg"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <input
                      type="range"
                      min="1"
                      max={maxSkillLevel}
                      value={stat.level}
                      onChange={e => stat.set(parseInt(e.target.value))}
                      className="flex-1 accent-indigo-650 dark:accent-indigo-500 h-1 bg-surface-raised rounded-lg appearance-none cursor-pointer"
                    />

                    <button
                      disabled={stat.level >= maxSkillLevel}
                      onClick={() => stat.set(prev => Math.min(maxSkillLevel, prev + 1))}
                      className="p-1.5 rounded-lg border border-border bg-surface disabled:opacity-20 hover:bg-bg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex justify-between text-xs text-muted">
                    <div>Stat Gain: <span className="font-bold text-muted">+{stat.val.toLocaleString()}</span></div>
                    {stat.level < maxSkillLevel && (
                      <div>Next Upgrade Cost: <span className="font-bold text-muted">{stat.costNext.toLocaleString()} Points</span></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Planner output & Faction levels */}
          <div className="space-y-6">
            {/* Cost Summary card */}
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-md text-text">Expenditure Forecast</h3>
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-1">
                <span className="text-xs text-muted font-bold uppercase tracking-wider">Required Devotion Contribution</span>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {plannerSummary.totalContributionCost.toLocaleString()} <span className="text-sm font-normal">Points</span>
                </div>
              </div>

              <div className="text-xs text-muted leading-relaxed italic">
                * Note: Contribution points are gained through daily guild donations, guild quests, or fighting Faction bosses.
              </div>
            </div>

            {/* Guild Level configuration */}
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-md text-text">Guild Level Perks</h3>
                <span className="text-xs text-muted">Max level 50</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-subtle uppercase tracking-wider">Guild Level Selected</label>
                <select
                  value={guildLevel}
                  onChange={e => setGuildLevel(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-bg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                >
                  {orgBases.map(ob => (
                    <option key={ob.org_level} value={ob.org_level}>
                      Level {ob.org_level} Faction Base
                    </option>
                  ))}
                </select>
              </div>

              {resolvedGuildBase && (
                <div className="space-y-3 pt-2 text-sm">
                  <div className="p-3 bg-bg border border-border rounded-xl flex justify-between">
                    <span className="text-muted">Max Member Capacity:</span>
                    <span className="font-bold text-text">{resolvedGuildBase.org_max_number} Players</span>
                  </div>

                  <div className="p-3 bg-bg border border-border rounded-xl flex justify-between">
                    <span className="text-muted">Extra Exp Multiplier:</span>
                    <span className="font-bold text-text">+{resolvedGuildBase.get_more_exp}% EXP</span>
                  </div>

                  <div className="p-3 bg-bg border border-border rounded-xl flex justify-between">
                    <span className="text-muted">Daily Max Activity limit:</span>
                    <span className="font-bold text-text">{(resolvedGuildBase.day_max_activity || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* VIP PRIVILEGE MATRIX */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* VIP Config Selector */}
          <div className="lg:col-span-4 bg-surface rounded-2xl border border-border p-5 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-text">
              <Star className="w-5 h-5 text-indigo-500" /> Tier Privilege Card
            </h2>
            <p className="text-xs text-muted">Analyze the limits and unlock properties of any VIP rank.</p>

            {/* Select VIP level */}
            <div className="grid grid-cols-4 gap-2">
              {vipConfigs.map((vip, idx) => (
                <button
                  key={vip.id}
                  onClick={() => setSelectedVipLevel(vip.id)}
                  className={`py-2 rounded-xl border font-bold text-xs transition-all ${selectedVipLevel === vip.id
                    ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400'
                    : 'border-border hover:bg-hover text-muted'
                    }`}
                >
                  VIP {idx}
                </button>
              ))}
            </div>

            {/* Privilege Stats Inspector for Selected Level */}
            {vipConfigs[selectedVipLevel - 1] && (
              <div className="p-4 bg-bg border border-border rounded-2xl space-y-4 pt-4 text-sm">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="font-bold text-indigo-500 text-md">VIP {selectedVipLevel - 1} Summary</span>
                  <span className="text-xs text-muted">ID: {selectedVipLevel}</span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted">Gold Threshold:</span>
                    <span className="font-bold text-text">{vipConfigs[selectedVipLevel - 1].charge_count} Gold</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted">Stamina Buy Limit:</span>
                    <span className="font-bold text-text">{vipConfigs[selectedVipLevel - 1].buy_action_limit} times/day</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted">Auto-Fight Status:</span>
                    <span className="font-bold text-text">
                      {vipConfigs[selectedVipLevel - 1].can_auto_fight !== 0 ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted">Daily Recruit Cap:</span>
                    <span className="font-bold text-text">
                      {vipConfigs[selectedVipLevel - 1].lottery_recruit_num} attempts
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Side by side VIP Privilege comparison Table */}
          <div className="lg:col-span-8 bg-surface border border-border rounded-2xl p-5 overflow-x-auto">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-bold">Comparative VIP Privilege Matrix</h2>
            </div>

            <table className="w-full text-left border-collapse text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border text-xs text-subtle uppercase">
                  <th className="py-3 px-4 font-bold">VIP Tier</th>
                  <th className="py-3 px-4 font-bold">Gold</th>
                  <th className="py-3 px-4 font-bold">Daily Stamina Buys</th>
                  <th className="py-3 px-4 font-bold">Recruit Cap</th>
                  <th className="py-3 px-4 font-bold">Auto Battle</th>
                  <th className="py-3 px-4 font-bold">Bag Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {vipConfigs.map((vip, idx) => (
                  <tr
                    key={vip.id}
                    className={`transition-colors hover:bg-hover/40 ${selectedVipLevel === vip.id ? 'bg-indigo-500/5 dark:bg-indigo-500/5' : ''
                      }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-text">VIP {idx}</td>
                    <td className="py-3.5 px-4">{vip.charge_count.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-semibold">{vip.buy_action_limit}</td>
                    <td className="py-3.5 px-4">{vip.lottery_recruit_num}</td>
                    <td className="py-3.5 px-4">
                      {vip.can_auto_fight !== 0 ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-surface-raised text-subtle font-semibold">
                          No
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold">{vip.bag_count} slots</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
