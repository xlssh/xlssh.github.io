import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadPromotionalActivities, loadActivityDetails, loadAwards, loadArticles } from '../data/loaders';
import { PromotionalActivity, ActivityDetail, Award, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { JsonViewer } from '../components/JsonViewer';
import { RewardList } from '../components/RewardList';
import { ArrowLeft, Flame, Calendar, ShieldAlert, Gift, Trophy, Star, Target, Info, Coins, Sparkles, Compass, Shield, BookOpen } from 'lucide-react';

function getTimeTypeLabel(type: number): string {
  switch (type) {
    case 1: return 'Server Open relative';
    case 2: return 'Weekly Recurring';
    case 3: return 'Fixed Calendar';
    case 4: return 'Minute Cooldown';
    case 5: return 'Cyclic Repeat';
    default: return `Type #${type}`;
  }
}

function getActivityTypeLabel(type: number): string {
  switch (type) {
    case 1: return 'Open Server Challenge';
    case 2: return 'Recharge Reward';
    case 3: return 'Login Gift';
    case 4: return 'Growth Fund';
    case 5: return 'Single Recharge';
    case 6: return 'Total Recharge';
    case 7: return 'Total Spending';
    case 8: return 'Daily Spending';
    case 9: return 'VIP Exclusive Shop';
    case 10: return 'Recruit Event';
    case 11: return 'Tavern Rebate';
    case 12: return 'Stone Merge Event';
    case 13: return 'Gear Collection';
    case 14: return 'Relic Upgrade Event';
    case 15: return 'Butterfly Event';
    case 16: return 'Guild Defense';
    case 17: return 'Circle Trial';
    case 18: return 'Lucky Turntable';
    case 19: return 'Jigsaw Puzzle';
    case 20: return 'Warrior Gacha';
    case 21: return 'Shop Discount';
    case 22: return 'Black Market Sale';
    default: return `Activity Type #${type}`;
  }
}

function formatSchedule(timeType: number | null, startTime: any, endTime: any): string {
  const startArr = Array.isArray(startTime) ? startTime : [];
  const endArr = Array.isArray(endTime) ? endTime : [];

  if (timeType === null || timeType === undefined) return '-';

  switch (timeType) {
    case 1: {
      const dayStart = startArr[0] ?? 1;
      const dayEnd = endArr[0] ?? 7;
      return `Server Day ${dayStart} to Day ${dayEnd}`;
    }
    case 2: {
      const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const wkStart = startArr[0] ?? 1;
      const wkEnd = endArr[0] ?? 7;
      const startDay = weekdays[wkStart - 1] ?? `Day ${wkStart}`;
      const endDay = weekdays[wkEnd - 1] ?? `Day ${wkEnd}`;
      return `Weekly: ${startDay} - ${endDay}`;
    }
    case 3: {
      if (startArr.length === 0 && endArr.length === 0) return 'Immediate / Permanent';

      const formatFixedDate = (arr: number[]) => {
        if (!arr || arr.length < 3) return '-';
        const y = arr[0];
        const m = String(arr[1]).padStart(2, '0');
        const d = String(arr[2]).padStart(2, '0');
        const h = arr[3] !== undefined ? ` ${String(arr[3]).padStart(2, '0')}:00` : '';
        return `${y}-${m}-${d}${h}`;
      };

      return `${formatFixedDate(startArr)} to ${formatFixedDate(endArr)}`;
    }
    case 4: {
      const minStart = startArr[0] ?? 0;
      const minEnd = endArr[0] ?? 0;
      return `Cooldown: ${minStart}m - ${minEnd}m`;
    }
    case 5: {
      const duration = endArr[0] ?? 1;
      const cooldown = endArr[1] ?? 0;
      const startY = startArr[0] || 2026;
      const startM = startArr[1] || 1;
      const startD = startArr[2] || 1;
      return `Cyclic: ${duration}d Active / ${cooldown}d Off (From ${startY}-${String(startM).padStart(2, '0')}-${String(startD).padStart(2, '0')})`;
    }
    default:
      return `Custom (Type ${timeType})`;
  }
}

function getActivityTypeBadgeClass(type: number): string {
  switch (type) {
    case 1:
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/30';
    case 2:
    case 5:
    case 6:
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/30';
    case 3:
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/30';
    case 7:
    case 8:
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/30';
    case 10:
    case 11:
    case 20:
      return 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200/50 dark:border-violet-900/30';
    case 4:
    case 9:
    case 21:
    case 22:
      return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-900/30';
    default:
      return 'bg-bg text-muted dark:bg-surface/40 dark:text-subtle border border-border/50 dark:border-border/30';
  }
}

function getTimeTypeBadgeClass(type: number): string {
  switch (type) {
    case 1:
    case 5:
      return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/30';
    case 2:
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-900/30';
    case 3:
      return 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200/50 dark:border-teal-900/30';
    default:
      return 'bg-bg text-muted dark:bg-surface/40 dark:text-subtle border border-border/50 dark:border-border/30';
  }
}

// 1. Pyramid Components
const PyramidLootTable: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const awardsRates = details.extra.awards_rates?.[0]?.awardRate || [];

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Star size={16} className="text-yellow-500" />
        <span>Pyramid Loot Table</span>
      </h4>
      <div className="space-y-3">
        {awardsRates.map((tier: any, tierIndex: number) => (
          <div key={tierIndex} className="p-3 bg-surface rounded-lg border border-border">
            <h5 className="text-xs font-bold text-subtle mb-2">Tier {tierIndex + 1}</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {tier.map((item: any, itemIndex: number) => {
                const award = awardsList.find(a => a.id === item.awardId);
                const mergedRewards = award ? [...(award.fixed || []), ...(award.rewards || [])] : [];
                return (
                  <div key={itemIndex} className="p-2 bg-bg/50 rounded-md border border-border/70">
                    <RewardList rewardsJson={mergedRewards} articles={articlesList} />
                    <span className="text-[10px] font-mono text-muted mt-1 block">Rate: {item.rate / 100}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PyramidShop: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const gifts = details.extra.gifts || [];

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Gift size={16} className="text-emerald-500" />
        <span>Pyramid Point Shop</span>
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {gifts.map((item: any, index: number) => {
          const award = awardsList.find(a => a.id === item.awardId);
          const mergedRewards = award ? [...(award.fixed || []), ...(award.rewards || [])] : [];
          return (
            <div key={index} className="p-3 bg-surface rounded-xl border border-border space-y-2">
              <RewardList rewardsJson={mergedRewards} articles={articlesList} />
              <div className="text-xs font-semibold text-text">
                Cost: <span className="font-bold text-violet-500">{item.costScore} Chips</span>
              </div>
               <div className="text-[10px] font-mono text-muted">Limit: {item.limit}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PyramidCalculator: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [smashCount, setSmashCount] = useState(10);
  const [targetChips, setTargetChips] = useState(100);

  const goldPerDraw = details.extra.proportion || 200; // Gold recharge required per draw chance

  const cost = smashCount * goldPerDraw;
  const estChips = smashCount; // Assuming 1 point (chip) per draw on average

  const reqSmashes = targetChips;
  const reqGold = targetChips * goldPerDraw;

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Target size={16} className="text-amber-500" />
        <span>Pyramid Draw Simulator & Recharge Estimator</span>
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Left Column: Smashes to Cost & Points */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Simulate Draws
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Number of Draws:</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={smashCount}
              onChange={(e) => setSmashCount(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Required Recharge</span>
              <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400 text-sm">
                {cost.toLocaleString()} Gold
              </span>
            </div>
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Points (Chips) Earned</span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                ~{estChips.toLocaleString()} Chips
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Target Points to Cost */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Calculate Goal Cost
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Target Points (Chips):</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={targetChips}
              onChange={(e) => setTargetChips(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Draws Required</span>
              <span className="font-mono font-extrabold text-text text-sm">
                {reqSmashes.toLocaleString()} Draws
              </span>
            </div>
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Estimated Recharge Cost</span>
              <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400 text-sm">
                {reqGold.toLocaleString()} Gold
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted leading-normal italic">
        Tip: Topping up {goldPerDraw} Gold grants 1 draw chance. Each draw yields 1 Point (Chip) on average, which can be spent in the Point Shop.
      </p>
    </div>
  );
};

// 2. Rush in Seireitei Calculator Component
const RushInSeireiteiCalculator: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [plannedNormalAttacks, setPlannedNormalAttacks] = useState(10);
  const [plannedSpecialAttacks, setPlannedSpecialAttacks] = useState(5);
  const [targetScore, setTargetScore] = useState(500);

  const normalMilitary = details.extra.nomal_attack?.military || 1;
  const normalHurt = details.extra.nomal_attack?.hurt || 10;
  const specialMilitary = details.extra.special_attack?.military || 5;
  const specialHurt = details.extra.special_attack?.hurt || 50;

  const normalCost = 50;
  const specialCost = 150;

  const totalMilitary = plannedNormalAttacks * normalMilitary + plannedSpecialAttacks * specialMilitary;
  const totalHurt = plannedNormalAttacks * normalHurt + plannedSpecialAttacks * specialHurt;
  const estimatedGold = plannedNormalAttacks * normalCost + plannedSpecialAttacks * specialCost;

  const reqSpecials = Math.ceil(targetScore / (specialMilitary || 1));
  const reqGoldSpecials = reqSpecials * specialCost;

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Flame size={16} className="text-red-500" />
        <span>Rush in Seireitei Attack & Store Planner</span>
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Attack Simulator */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Simulate Attack Runs
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-subtle font-medium block">Normal Attacks:</label>
              <input
                type="number"
                min={0}
                value={plannedNormalAttacks}
                onChange={(e) => setPlannedNormalAttacks(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-subtle font-medium block">Special Attacks:</label>
              <input
                type="number"
                min={0}
                value={plannedSpecialAttacks}
                onChange={(e) => setPlannedSpecialAttacks(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Estimated Gold</span>
              <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400 text-xs">
                {estimatedGold.toLocaleString()} Gold
              </span>
            </div>
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Military Credits</span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                +{totalMilitary.toLocaleString()}
              </span>
            </div>
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Total Boss Damage</span>
              <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-xs">
                {totalHurt.toLocaleString()} HP
              </span>
            </div>
          </div>
        </div>

        {/* Store Purchase Planner */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Store Score Goal Estimator
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Target Store Score:</label>
            <input
              type="number"
              min={1}
              max={50000}
              value={targetScore}
              onChange={(e) => setTargetScore(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Special Attacks Needed</span>
              <span className="font-mono font-extrabold text-text text-xs">
                {reqSpecials.toLocaleString()} Attacks
              </span>
            </div>
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Estimated Gold Cost</span>
              <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400 text-xs">
                {reqGoldSpecials.toLocaleString()} Gold
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. King's Guard Calculator Component
const KingsGuardCalculator: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [targetGuardIdx, setTargetGuardIdx] = useState(0);
  const [includeFlipCost, setPlannedFlipCount] = useState(4);

  const guards = details.extra.guards || [];
  const gameCost = details.extra.game?.cost || 100;
  const winCost = details.extra.game_win?.cost || 300;

  const totalFlippedCost = includeFlipCost * gameCost;

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Star size={16} className="text-yellow-500" />
        <span>King's Guard Flip & Recruit Estimator</span>
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Guard selector & flips */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Flipping Cost Estimator
          </span>
          {guards.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-subtle font-medium block">Select Target Guard Card:</label>
                <select
                  value={targetGuardIdx}
                  onChange={(e) => setTargetGuardIdx(parseInt(e.target.value))}
                  className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none"
                >
                  {guards.map((g: any, i: number) => (
                    <option key={i} value={i}>
                      Guard #{g.index} (Type {g.cardType}) - Free flips: {g.getCard}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-subtle font-medium block">Planned Paid Flips (Beyond free):</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={includeFlipCost}
                  onChange={(e) => setPlannedFlipCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none font-mono font-bold"
                />
              </div>
            </div>
          )}
        </div>

        {/* Calculated flips details */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Cost & Recruitment Analysis
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Estimated Paid Flips Cost</span>
              <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400 text-xs">
                {totalFlippedCost.toLocaleString()} Gold
              </span>
            </div>
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Instant Win Cost</span>
              <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400 text-xs">
                {winCost.toLocaleString()} Gold
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted leading-normal italic pt-1">
            Tip: Standard play costs {gameCost} Gold per flip card. The instant win option flips all remaining cards automatically for {winCost} Gold, securing 100% of rewards immediately.
          </p>
        </div>
      </div>
    </div>
  );
};

// 4. King's Legend Calculator Component
const KingsLegendCalculator: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [spentGold, setSpentGold] = useState(5000);

  const costGoldVal = details.extra.cost_gold?.cost || 1000;
  const rechargeGold = details.extra.recharge?.gold || 2000;
  const turntableGold = details.extra.turntable?.gold || 200;

  const progressPercent = Math.min(100, (spentGold / (costGoldVal || 1)) * 100);
  const estSpins = Math.floor(spentGold / (turntableGold || 1));

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Trophy size={16} className="text-violet-500" />
        <span>King's Legend Gold Spend & Spin Progress Estimator</span>
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Left column: Spent Gold Slider */}
        <div className="space-y-4 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Simulate Spend Milestones
          </span>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-muted">
              <span>Your Gold Spend:</span>
              <span className="font-bold font-mono text-violet-600 dark:text-violet-400 text-sm">
                {spentGold.toLocaleString()} Gold
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={costGoldVal * 2}
              step={100}
              value={spentGold}
              onChange={(e) => setSpentGold(parseInt(e.target.value))}
              className="w-full accent-violet-600 cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold text-subtle uppercase">
              <span>Spend Milestone Progress:</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-bg h-2.5 rounded-full overflow-hidden border border-border">
              <div
                className="bg-violet-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right column: Progress stats */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Estimated Activity Outputs
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Estimated Spins earned</span>
              <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400 text-xs">
                {estSpins.toLocaleString()} Spins
              </span>
            </div>
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Recharge Gold Rebate</span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                +{rechargeGold.toLocaleString()} Gold
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted leading-normal italic pt-1">
            Tip: Spending gold earns turntable spins at {turntableGold} gold per spin, and unlocks spend rebate tiers (target: {costGoldVal.toLocaleString()} gold).
          </p>
        </div>
      </div>
    </div>
  );
};

// 5. Power Rank Target Planner Component
const PowerRankPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [currentPower, setCurrentPower] = useState(50000);

  const targets = details.targets || [];

  const achievedCount = targets.filter(t => currentPower >= t.key).length;
  const nextTarget = targets.find(t => currentPower < t.key);

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Target size={16} className="text-rose-500" />
        <span>Target Battle Power Milestone Planner</span>
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Power Input */}
        <div className="space-y-4 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Your Battle Power Profile
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Current Battle Power:</label>
            <input
              type="number"
              min={0}
              value={currentPower}
              onChange={(e) => setCurrentPower(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Achieved Milestones</span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                {achievedCount} / {targets.length}
              </span>
            </div>
            {nextTarget && (
              <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
                <span className="text-[9px] text-subtle font-bold uppercase">Next Power Goal</span>
                <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-xs">
                  {nextTarget.key.toLocaleString()} BP
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Milestone milestones results */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-48 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Milestones Breakdown
          </span>
          <div className="space-y-2">
            {targets.map((t, i) => {
              const achieved = currentPower >= t.key;
              return (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className={`${achieved ? 'text-text font-bold' : 'text-muted line-through'} transition-colors`}>
                    {t.prompt || `Goal ${t.key.toLocaleString()}`}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${achieved ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-bg text-subtle dark:bg-bg'}`}>
                    {achieved ? 'ACHIEVED' : 'LOCKED'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 6. Ice Heroes Calculator Component
const IceHerosCalculator: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [targetScore, setTargetScore] = useState(1000);

  const awards = details.extra.awards || [];
  const chipBoxes = details.extra.chip_boxes || [];

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Trophy size={16} className="text-cyan-500" />
        <span>Ice Heroes Score & Milestone Planner</span>
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Left Column: Milestones Progress */}
        <div className="space-y-4 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Recharge / Score Milestones
          </span>
          <div className="space-y-2">
            {awards.map((aw: any, idx: number) => {
              const condition = aw.condition || 0;
              const achieved = targetScore >= condition;
              return (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className={`${achieved ? 'text-text font-bold' : 'text-muted line-through'}`}>
                    Score {condition.toLocaleString()}: Limit {aw.limit}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${achieved ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-bg text-subtle dark:bg-bg'}`}>
                    {achieved ? 'ACHIEVED' : 'LOCKED'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Goal setup & Box calculation */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Simulate Your Target Score
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Current / Target Score:</label>
            <input
              type="number"
              min={0}
              value={targetScore}
              onChange={(e) => setTargetScore(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold"
            />
          </div>
          {chipBoxes.length > 0 && (
            <div className="p-3 bg-bg/30 rounded border border-border text-[11px] leading-relaxed">
              <span className="font-bold text-muted block mb-1">Available Event Chests:</span>
              <div className="space-y-1">
                {chipBoxes.map((box: any, i: number) => (
                  <div key={i} className="flex justify-between font-mono">
                    <span>{box.name || `Box #${box.index}`}</span>
                    <span className="text-violet-600 dark:text-violet-400 font-bold">Cost: {box.cost} Gold</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 7. Recharge Planner Component
const RechargePlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [plannedRecharge, setPlannedRecharge] = useState(1000);
  const milestones = details.awards || [];

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Coins size={16} className="text-amber-500" />
        <span>Unified Recharge & Rebate Planner</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-4 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Recharge Target
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Planned Recharge (Gold):</label>
            <input
              type="number"
              min={0}
              value={plannedRecharge}
              onChange={(e) => setPlannedRecharge(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold text-sm"
            />
          </div>
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-48 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Milestones Progress
          </span>
          <div className="space-y-2">
            {milestones.map((t, i) => {
              const achieved = plannedRecharge >= t.key;
              return (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className={`${achieved ? 'text-text font-bold' : 'text-muted line-through'} transition-colors`}>
                    {t.prompt || `${t.key.toLocaleString()} Gold`}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${achieved ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-bg text-subtle dark:bg-bg'}`}>
                    {achieved ? 'ACHIEVED' : 'LOCKED'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 8. Spend Planner Component
const SpendPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [plannedSpend, setPlannedSpend] = useState(1000);
  const milestones = details.awards || [];

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Sparkles size={16} className="text-violet-500" />
        <span>Unified Spend Planner & Rebate Optimizer</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-4 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Spending Target
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Planned Gold Spend:</label>
            <input
              type="number"
              min={0}
              value={plannedSpend}
              onChange={(e) => setPlannedSpend(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold text-sm"
            />
          </div>
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-48 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Milestones Progress
          </span>
          <div className="space-y-2">
            {milestones.map((t, i) => {
              const achieved = plannedSpend >= t.key;
              return (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className={`${achieved ? 'text-text font-bold' : 'text-muted line-through'} transition-colors`}>
                    {t.prompt || `Spend ${t.key.toLocaleString()} Gold`}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${achieved ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-bg text-subtle dark:bg-bg'}`}>
                    {achieved ? 'ACHIEVED' : 'LOCKED'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 9. Fund Planner Component
const FundPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [currentLv, setCurrentLv] = useState(50);
  const [premiumActive, setPremiumActive] = useState(true);

  const bagsNormal = details.extra.bags_normal || [];

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Compass size={16} className="text-emerald-500" />
        <span>Growth Fund Yield & Investment Return Planner</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-4 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Investment Option
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Current Level:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={currentLv}
              onChange={(e) => setCurrentLv(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold text-sm"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="premium_fund"
              checked={premiumActive}
              onChange={(e) => setPremiumActive(e.target.checked)}
              className="accent-emerald-500 cursor-pointer"
            />
            <label htmlFor="premium_fund" className="text-muted dark:text-subtle font-semibold cursor-pointer select-none">
              Include Premium Fund Tier
            </label>
          </div>
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-48 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Yield Breakdown
          </span>
          <div className="space-y-2">
            {bagsNormal.map((item: any, idx: number) => {
              const reqLv = item.levelLimit || 0;
              const achieved = currentLv >= reqLv;
              return (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className={`${achieved ? 'text-text font-bold' : 'text-muted line-through'}`}>
                    Lv. {reqLv}: Normal reward achieved
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${achieved ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-bg text-subtle dark:bg-bg'}`}>
                    {achieved ? 'CLAIMABLE' : 'LOCKED'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 10. Super Treasure Planner Component
const SuperTreasurePlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [plannedRolls, setPlannedRolls] = useState(10);
  const costPerRoll = 150; 
  const totalCost = plannedRolls * costPerRoll;

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Shield size={16} className="text-violet-500" />
        <span>Super Treasure Board Game Roll Planner</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-4 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Configure Rolls
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Planned Roll Count:</label>
            <input
              type="number"
              min={1}
              value={plannedRolls}
              onChange={(e) => setPlannedRolls(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold"
            />
          </div>
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border flex flex-col justify-center">
          <div className="p-3 bg-bg/50 rounded border border-border flex flex-col gap-1">
            <span className="text-[9px] text-subtle font-bold uppercase">Estimated Gold Cost</span>
            <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400 text-base">
              {totalCost.toLocaleString()} Gold
            </span>
          </div>
          <p className="text-[9.5px] text-muted leading-normal italic pt-2">
            Tip: Super Treasure board game consists of Page A, B, and C with variable milestones. Averaging 3.5 steps per roll is expected on standard dice options.
          </p>
        </div>
      </div>
    </div>
  );
};

// 11. Dice Gambling Simulator & Calculator
const GamblingCalculator: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [rollsCount, setRollsCount] = useState(10);
  const startCost = details.extra.btn_start_cost || 100;
  const smallCost = details.extra.btn_small_cost || 50;
  const totalCost = rollsCount * (startCost + smallCost);

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Target size={16} className="text-yellow-500" />
        <span>Dice Gambling Cost Simulator</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-4 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Simulate Play Runs
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Planned Play Count:</label>
            <input
              type="number"
              min={1}
              value={rollsCount}
              onChange={(e) => setRollsCount(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold"
            />
          </div>
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border flex flex-col justify-center">
          <div className="p-3 bg-bg/50 rounded border border-border flex flex-col gap-1">
            <span className="text-[9px] text-subtle font-bold uppercase">Estimated Gold Cost</span>
            <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400 text-base">
              {totalCost.toLocaleString()} Gold
            </span>
          </div>
          <p className="text-[9.5px] text-muted leading-normal italic pt-2">
            Tip: Standard play starts at {startCost} Gold per roll. Guessing big/small cost adds {smallCost} Gold.
          </p>
        </div>
      </div>
    </div>
  );
};

// 12. Equipment Shop Selector & Calculator
const ExchangeChipCalculator: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [selectedBoxIdx, setSelectedBoxIdx] = useState(0);
  const buyBoxes = details.extra.buy_boxes || [];
  const selectedBox = buyBoxes[selectedBoxIdx] || null;

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Gift size={16} className="text-violet-500" />
        <span>Equipment Shop Box Pricing Analyzer</span>
      </h4>
      {buyBoxes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
            <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
              Select Shop Box
            </span>
            <select
              value={selectedBoxIdx}
              onChange={(e) => setSelectedBoxIdx(parseInt(e.target.value))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none"
            >
              {buyBoxes.map((b: any, i: number) => (
                <option key={i} value={i}>
                  Box #{b.index} - Price: {b.need} Gold
                </option>
              ))}
            </select>
          </div>
          {selectedBox && (
            <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-center">
              <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1 mb-2">Box Pricing Detail</span>
              <div className="font-mono text-xs">
                <div>Price: <span className="font-bold text-violet-600 dark:text-violet-400">{selectedBox.need} Gold</span></div>
                <div className="mt-1">Rewards Award ID: <span className="font-bold">#{selectedBox.awards?.[0]}</span></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 13. Group Buy Discount Estimator
const TeamBuyCalculator: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [serverSignups, setServerSignups] = useState(50);
  const offRates = details.extra.off_rates || [];

  const matchedRateObj = offRates.find((rate: any) => serverSignups >= rate.count) || null;
  const currentDiscount = matchedRateObj ? matchedRateObj.off : 100; 

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Trophy size={16} className="text-amber-500" />
        <span>Group Buy Server Discount Estimator</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-4 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Simulate Server Signups
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Server Signups Count:</label>
            <input
              type="number"
              min={0}
              max={1000}
              value={serverSignups}
              onChange={(e) => setServerSignups(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold"
            />
          </div>
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border flex flex-col justify-center">
          <div className="p-3 bg-bg/50 rounded border border-border flex flex-col gap-1">
            <span className="text-[9px] text-subtle font-bold uppercase">Estimated Discount Price</span>
            <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400 text-base">
              {currentDiscount}% of Original Price
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 14. Limit Buy Store Planner
const LimitBuyCalculator: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const items = details.extra.items || [];
  const selectedItem = items[selectedItemIdx] || null;

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <ShieldAlert size={16} className="text-rose-500" />
        <span>Limit Buy Store Item Analyzer</span>
      </h4>
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
            <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border block mb-1 font-sans">
              Select Store Item
            </span>
            <select
              value={selectedItemIdx}
              onChange={(e) => setSelectedItemIdx(parseInt(e.target.value))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none font-bold"
            >
              {items.map((it: any, i: number) => (
                <option key={i} value={i}>
                  Item Box #{it.boxIndex} - Price: {it.cost} Gold
                </option>
              ))}
            </select>
          </div>
          {selectedItem && (
            <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-center font-mono">
              <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1 mb-2 font-sans">Item Details</span>
              <div>Price: <span className="font-bold text-violet-600 dark:text-violet-400">{selectedItem.cost} Gold</span></div>
              <div className="mt-1">Player Purchase Limit: <span className="font-bold">{selectedItem.limit}x</span></div>
              <div className="mt-1">Server Purchase Limit: <span className="font-bold">{selectedItem.serverLimit}x</span></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 15. Hueco Mundo Candy Planner Component
const HuecoMundoCandyPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [loginDays, setLoginDays] = useState(10);
  const [accumRecharge, setAccumRecharge] = useState(400);

  const loginAward = details.extra.login_award || [];
  const payAward = details.extra.pay_award || [];
  const scoreMall = details.extra.score_mall || [];

  // Calculate candies earned
  const freeCandies = loginDays * (loginAward[0]?.addScore || 1);
  let rechargeCandies = 0;
  payAward.forEach((item: any) => {
    if (accumRecharge >= (item.cond || 0)) {
      rechargeCandies += item.addScore || 0;
    }
  });
  const totalCandies = freeCandies + rechargeCandies;

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Sparkles size={16} className="text-yellow-500" />
        <span>Hueco Mundo Candy & Shop Yield Planner</span>
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Left Column: Candy Earnings Simulator */}
        <div className="space-y-4 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Candy Accumulator Simulator
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-subtle font-medium block">Days Logged In (max 10):</label>
              <input
                type="number"
                min={0}
                max={10}
                value={loginDays}
                onChange={(e) => setLoginDays(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-subtle font-medium block">Accumulative Top-up (Gold):</label>
              <input
                type="number"
                min={0}
                value={accumRecharge}
                onChange={(e) => setAccumRecharge(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Free Candies</span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                +{freeCandies} Candies
              </span>
            </div>
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Total Candies Yield</span>
              <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400 text-xs">
                {totalCandies} Candies
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Gikongan Candy Shop list */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1 mb-2">
            Gikongan Candy Shop (Can afford)
          </span>
          <div className="space-y-1">
            {scoreMall.map((box: any, i: number) => {
              const canAfford = totalCandies >= box.cost;
              return (
                <div key={i} className="flex justify-between items-center text-xs pb-1 border-b border-border">
                  <span className={`${canAfford ? 'text-text font-bold' : 'text-muted'}`}>
                    Award ID #{box.awardid}
                  </span>
                  <span className={`font-mono text-[10px] font-bold ${canAfford ? 'text-emerald-600 dark:text-emerald-400' : 'text-subtle'}`}>
                    Cost: {box.cost} Candies
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 16. Seireitei Farewell Planner Component
const SeireiteiFarewellPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const chapters = details.extra.items || [];

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <BookOpen size={16} className="text-violet-500" />
        <span>Seireitei Farewell Story Chapters Auditor</span>
      </h4>
      
      <div className="grid grid-cols-1 gap-6 text-xs">
        {/* Chapters requirements list */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-64 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1 mb-2">
            Chapter Required Partners List
          </span>
          <div className="space-y-3">
            {chapters.map((ch: any, i: number) => (
              <div key={i} className="p-3 bg-bg/50 border border-border rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs font-bold border-b border-border pb-1">
                  <span className="text-violet-600 dark:text-violet-400 font-extrabold">{ch.Title}</span>
                  <span className="text-[10px] font-mono font-bold text-subtle">Award: #{ch.awardid}</span>
                </div>
                {ch.hero && ch.hero.length > 0 && (
                  <div>
                    <span className="text-[9px] font-bold text-subtle uppercase block mb-1">Required Partner IDs:</span>
                    <div className="flex flex-wrap gap-1">
                      {ch.hero.map((heroId: number) => (
                        <span key={heroId} className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold bg-bg text-muted">
                          Hero #{heroId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {ch.knife && ch.knife.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[9px] font-bold text-subtle uppercase block mb-1">Required Zanpakuto IDs:</span>
                    <div className="flex flex-wrap gap-1">
                      {ch.knife.map((knifeId: number) => (
                        <span key={knifeId} className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold bg-bg text-muted">
                          Zanpakuto #{knifeId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 17. Visored Revenge Calculator Component (Legion + Hollow King)
const VisoredRevengeCalculator: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [spentPoints, setSpentPoints] = useState(8000);

  // Visor Legion Daily Coupon Rebates (award IDs 21406043 - 21406051)
  const legionTiers = useMemo(() => {
    const milestones = [
      { id: 21406043, key: 40 },
      { id: 21406044, key: 120 },
      { id: 21406045, key: 200 },
      { id: 21406046, key: 400 },
      { id: 21406047, key: 800 },
      { id: 21406048, key: 1200 },
      { id: 21406049, key: 2000 },
      { id: 21406050, key: 4000 },
      { id: 21406051, key: 8000 }
    ];

    return milestones.map(m => {
      const award = awardsList.find(a => a.id === m.id);
      const couponAmount = award && award.fixed?.[0]?.code === 2 ? award.fixed[0].amount : 0;
      return {
        key: m.key,
        rebate: couponAmount,
        awardId: m.id
      };
    });
  }, [awardsList]);

  // Hollow King milestones (award IDs 21406052 - 21406061)
  const hollowKingTiers = useMemo(() => {
    const milestones = [
      { id: 21406052, key: 200 },
      { id: 21406053, key: 400 },
      { id: 21406054, key: 800 },
      { id: 21406055, key: 1200 },
      { id: 21406056, key: 2000 },
      { id: 21406057, key: 3000 },
      { id: 21406058, key: 5000 },
      { id: 21406059, key: 8000 },
      { id: 21406060, key: 11000 },
      { id: 21406061, key: 15000 }
    ];

    return milestones.map(m => {
      const award = awardsList.find(a => a.id === m.id);
      const mergedRewards = award ? [
        ...(award.fixed || []),
        ...(award.rewards || [])
      ] : [];
      return {
        key: m.key,
        awardId: m.id,
        rewardsJson: mergedRewards
      };
    });
  }, [awardsList]);

  const legionRebate = useMemo(() => {
    let total = 0;
    legionTiers.forEach(t => {
      if (spentPoints >= t.key) {
        total += t.rebate;
      }
    });
    return total;
  }, [spentPoints, legionTiers]);

  const netCost = Math.max(0, spentPoints - legionRebate);

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Sparkles size={16} className="text-violet-500" />
        <span>Visored Revenge Spending & Coupon Rebate Planner</span>
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Spent Input & Legion daily rebate */}
        <div className="space-y-4 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Simulate Daily Spend (Visor Legion)
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Coupons/Gold Spent:</label>
            <input
              type="number"
              min={0}
              value={spentPoints}
              onChange={(e) => setSpentPoints(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Daily Coupon Rebate</span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                +{legionRebate.toLocaleString()} Coupons
              </span>
            </div>
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Net Event Cost</span>
              <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400 text-xs">
                {netCost.toLocaleString()} Gold
              </span>
            </div>
          </div>
          <p className="text-[9.5px] text-muted leading-normal italic">
            Tip: Reiryoku points reset daily. Spend 8,000 coupons/gold to secure the maximum 2,175 total coupons daily return!
          </p>
        </div>

        {/* Hollow King milestones (non-resetting) */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto pr-1 custom-scrollbar">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1 mb-2">
            Hollow King Milestone Rewards (Accumulative)
          </span>
          <div className="space-y-2">
            {hollowKingTiers.map((m) => {
              const achieved = spentPoints >= m.key;
              return (
                <div key={m.key} className="p-2.5 rounded-lg bg-bg/30 border border-border flex flex-col gap-1 text-[11px]">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-0.5 mb-1">
                    <span className={`font-bold ${achieved ? 'text-violet-600 dark:text-violet-400' : 'text-subtle line-through'}`}>
                      {m.key.toLocaleString()} Kasō-ryoku
                    </span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${achieved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-bg text-subtle'}`}>
                      {achieved ? 'ACHIEVED' : 'LOCKED'}
                    </span>
                  </div>
                  <RewardList rewardsJson={m.rewardsJson} articles={articlesList} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 18. Dragon Boat Race Component
const DragonBoatRaceCalculator: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [raceCount, setRaceCount] = useState(1);
  const [targetCoins, setTargetCoins] = useState(4110);

  const pointsPerMaxCheerRun = 4110;
  const costPerMaxCheerRun = 3310;

  const totalCost = raceCount * costPerMaxCheerRun;
  const totalPoints = raceCount * pointsPerMaxCheerRun;

  const reqRuns = Math.ceil(targetCoins / pointsPerMaxCheerRun);
  const reqGold = reqRuns * costPerMaxCheerRun;

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Sparkles size={16} className="text-yellow-500" />
        <span>Dragon Boat Race Run & Coin Yield Calculator</span>
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Run Simulator */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Simulate Race Runs (Max Cheer Package)
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Number of Races:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={raceCount}
              onChange={(e) => setRaceCount(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Estimated Gold spent</span>
              <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400 text-xs">
                {totalCost.toLocaleString()} Gold
              </span>
            </div>
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Dragon Boat Coins earned</span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                {totalPoints.toLocaleString()} Coins
              </span>
            </div>
          </div>
        </div>

        {/* Target Points Planner */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Shop Coins Target Optimizer
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Target Shop Coins:</label>
            <input
              type="number"
              min={1}
              max={100000}
              value={targetCoins}
              onChange={(e) => setTargetCoins(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Max Cheer runs required</span>
              <span className="font-mono font-extrabold text-text text-xs">
                {reqRuns.toLocaleString()} Races
              </span>
            </div>
            <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
              <span className="text-[9px] text-subtle font-bold uppercase">Total Gold required</span>
              <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400 text-xs">
                {reqGold.toLocaleString()} Gold
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Event Guide Checklist */}
      <div className="p-3 bg-zinc-500/5 rounded-xl border border-border text-[11px] leading-relaxed space-y-1">
        <span className="font-bold text-muted block">Race Efficiency Quick Facts:</span>
        <ul className="list-disc pl-4 space-y-0.5 text-muted">
          <li>1 gold spent = 1 point/coin. Maxing the cheer bar (160 points) takes 3,200 gold and grants 800 bonus points (4,000 total).</li>
          <li>Purchasing an extra racing chance costs 100 gold, and skip animation costs 10 gold.</li>
          <li>Optimized strategy: 1 race with Max Cheer + Purchase Chance + Skip = **4,110 Coins** for **3,310 Gold**.</li>
        </ul>
      </div>
    </div>
  );
};

const KnifeHeroCollectPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const {
    consume_gold = [],
    knife_condition = [],
    knife_award = [],
    recharge_gold = [],
    hero_condition = [],
    hero_award = [],
  } = details.extra;

  const getRewardsForGroup = (groupIndex: number, awardArr: any[]) => {
    const startKey = (groupIndex + 1) * 1000;
    const endKey = startKey + 1000;
    return awardArr.filter(a => a.key >= startKey && a.key < endKey);
  };
  
  const getConditionsForGroup = (groupIndex: number, condArr: any[]) => {
    const startKey = (groupIndex + 1) * 1000;
    const endKey = startKey + 1000;
    return condArr.filter(c => c.key >= startKey && c.key < endKey);
  };

  const renderMilestoneGroup = (title: string, milestones: any[], conditions: any[], awards: any[]) => (
    <div className="space-y-4">
      <h4 className="font-bold text-base text-text flex items-center gap-2">
        <Trophy size={18} className="text-amber-500" />
        <span>{title}</span>
      </h4>
      <div className="space-y-3">
        {milestones.map((milestone, index) => {
          const milestoneRewards = getRewardsForGroup(index, awards);
          const milestoneConditions = getConditionsForGroup(index, conditions);
          return (
            <div key={index} className="p-4 bg-surface rounded-xl border border-border">
              <h5 className="font-bold text-sm text-violet-500 mb-2">
                Milestone: {milestone.condition.toLocaleString()} Gold
              </h5>
              {milestoneConditions.map((condGroup: any, cgIdx: number) => (
                <div key={cgIdx} className="mb-3">
                  <p className="text-xs font-semibold text-subtle mb-1">Required Items:</p>
                   <div className="p-2 bg-bg/50 rounded-md border border-border/70">
                    <RewardList rewardsJson={condGroup.value.map((v:any) => ({...v, type: v.type === 1 ? 77 : 300}))} articles={articlesList} />
                  </div>
                </div>
              ))}
              {milestoneRewards.map((rewardGroup: any, rgIdx: number) => (
                 <div key={rgIdx} className="mb-3">
                  <p className="text-xs font-semibold text-subtle mb-1">Rewards:</p>
                   <div className="p-2 bg-bg/50 rounded-md border border-border/70">
                    <RewardList rewardsJson={rewardGroup.value} articles={articlesList} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-6">
      {renderMilestoneGroup("Zanpakutō Collection (Consume Gold)", consume_gold, knife_condition, knife_award)}
      {renderMilestoneGroup("Hero Collection (Recharge Gold)", recharge_gold, hero_condition, hero_award)}
    </div>
  );
};

// 19. Labor Day Spending Exchange Planner
const LaborConsumePlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [targetScore, setTargetScore] = useState(50000);
  const mall = details.extra.mall || [];
  const bag = details.extra.bag || {};
  const banner = details.extra.banner || [];

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Gift size={16} className="text-amber-500" />
        <span>Labor Day Spending — Point Exchange Shop</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Your Accumulated Points
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Target Points:</label>
            <input type="number" min={0} value={targetScore} onChange={(e) => setTargetScore(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold" />
          </div>
          {bag.awardId && (
            <div className="p-2 bg-bg/50 rounded border border-border">
              <span className="text-[9px] text-subtle font-bold uppercase block mb-1">Grand Prize (Bag)</span>
              <div className="font-mono text-[10px]">Cost: <span className="font-bold text-violet-600 dark:text-violet-400">{bag.score?.toLocaleString() || bag.gold?.toLocaleString() || '?'} pts</span></div>
              <RewardList rewardsJson={awardsList.find(a => a.id === bag.awardId) ? [...(awardsList.find(a => a.id === bag.awardId)!.fixed || []), ...(awardsList.find(a => a.id === bag.awardId)!.rewards || [])] : []} articles={articlesList} />
            </div>
          )}
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Exchange Shop Items
          </span>
          <div className="space-y-2">
            {mall.map((item: any, i: number) => {
              const canAfford = targetScore >= (item.score || 0);
              const award = awardsList.find(a => a.id === item.awardId);
              const rewards = award ? [...(award.fixed || []), ...(award.rewards || [])] : [];
              return (
                <div key={i} className="p-2 bg-bg/30 rounded border border-border flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <RewardList rewardsJson={rewards} articles={articlesList} />
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-mono text-[10px] font-bold ${canAfford ? 'text-emerald-600 dark:text-emerald-400' : 'text-subtle'}`}>
                      {item.score?.toLocaleString()} pts
                    </div>
                    {item.count > 0 && <div className="text-[9px] text-muted">Limit: {item.count}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 20. Everyone Is Looting 2 Planner
const NationalDayTwoPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [targetCredits, setTargetCredits] = useState(40);
  const mall = details.extra.mall || [];
  const bag = details.extra.bag || {};

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Coins size={16} className="text-amber-500" />
        <span>Everyone Is Looting 2 — Credit Exchange</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Your Credits
          </span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Target Credits:</label>
            <input type="number" min={0} value={targetCredits} onChange={(e) => setTargetCredits(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold" />
          </div>
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Score Exchange Shop
          </span>
          <div className="space-y-2">
            {mall.map((item: any, i: number) => {
              const canAfford = targetCredits >= (item.score || 0);
              const award = awardsList.find(a => a.id === item.award);
              const rewards = award ? [...(award.fixed || []), ...(award.rewards || [])] : [];
              return (
                <div key={i} className="p-2 bg-bg/30 rounded border border-border flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0"><RewardList rewardsJson={rewards} articles={articlesList} /></div>
                  <div className="text-right shrink-0">
                    <div className={`font-mono text-[10px] font-bold ${canAfford ? 'text-emerald-600 dark:text-emerald-400' : 'text-subtle'}`}>{item.score} credits</div>
                    {item.limit > 0 && <div className="text-[9px] text-muted">Limit: {item.limit}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 21. Cool Summer Shell Game Planner
const CoolSummerPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [targetScore, setTargetScore] = useState(40000);
  const mainAward = details.extra.main_award || {};
  const scoreShop = details.extra.score_shop || [];
  const repository = details.extra.repository || [];

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Sparkles size={16} className="text-cyan-500" />
        <span>Cool Summer — Shell Game & Score Shop</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Main Award (Big Prize)
          </span>
          {mainAward.awardID && (
            <div className="p-3 bg-bg/50 rounded border border-border">
              <div className="font-mono text-[10px] mb-1">Requires: <span className="font-bold text-violet-600 dark:text-violet-400">{mainAward.score?.toLocaleString()} pts</span></div>
              <RewardList rewardsJson={awardsList.find(a => a.id === mainAward.awardID) ? [...(awardsList.find(a => a.id === mainAward.awardID)!.fixed || []), ...(awardsList.find(a => a.id === mainAward.awardID)!.rewards || [])] : []} articles={articlesList} />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Target Points:</label>
            <input type="number" min={0} value={targetScore} onChange={(e) => setTargetScore(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold" />
          </div>
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">
            Score Shop
          </span>
          <div className="space-y-2">
            {scoreShop.map((item: any, i: number) => {
              const canAfford = targetScore >= (item.score || 0);
              const award = awardsList.find(a => a.id === item.awardId);
              const rewards = award ? [...(award.fixed || []), ...(award.rewards || [])] : [];
              return (
                <div key={i} className="p-2 bg-bg/30 rounded border border-border flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0"><RewardList rewardsJson={rewards} articles={articlesList} /></div>
                  <div className="text-right shrink-0">
                    <div className={`font-mono text-[10px] font-bold ${canAfford ? 'text-emerald-600 dark:text-emerald-400' : 'text-subtle'}`}>{item.score?.toLocaleString()} pts</div>
                    {item.count > 0 && <div className="text-[9px] text-muted">Limit: {item.count}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 22. Fools Day Shop Score Exchange Planner
const FoolsDayShopPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [targetScore, setTargetScore] = useState(2000);
  const scoreShop = details.extra.score_shop || [];

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Gift size={16} className="text-violet-500" />
        <span>April Fools' Day 2 — Score Exchange Shop</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Your Score</span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Target Score:</label>
            <input type="number" min={0} value={targetScore} onChange={(e) => setTargetScore(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold" />
          </div>
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Shop Items</span>
          <div className="space-y-2">
            {scoreShop.map((item: any, i: number) => {
              const canAfford = targetScore >= (item.cost || 0);
              const award = awardsList.find(a => a.id === item.awardid);
              const rewards = award ? [...(award.fixed || []), ...(award.rewards || [])] : [];
              return (
                <div key={i} className="p-2 bg-bg/30 rounded border border-border flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0"><RewardList rewardsJson={rewards} articles={articlesList} /></div>
                  <div className="text-right shrink-0">
                    <div className={`font-mono text-[10px] font-bold ${canAfford ? 'text-emerald-600 dark:text-emerald-400' : 'text-subtle'}`}>{item.cost} score</div>
                    {item.numLimit > 0 && <div className="text-[9px] text-muted">Limit: {item.numLimit}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 23. Fools Day Recharge Planner
const FoolsDayRechargePlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const totalAward = details.extra.total_award || {};
  const dayAward = details.extra.day_award || [];
  const progressAward = details.extra.progress_award || [];

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Coins size={16} className="text-amber-500" />
        <span>April Fools' Day 1 — Jester Box Recharge</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Total Recharge Award</span>
          {totalAward.awardId && (
            <div className="p-3 bg-bg/50 rounded border border-border">
              <div className="font-mono text-[10px] mb-1">Threshold: <span className="font-bold text-violet-600 dark:text-violet-400">{totalAward.gold?.toLocaleString()} gold</span></div>
              <RewardList rewardsJson={awardsList.find(a => a.id === totalAward.awardId) ? [...(awardsList.find(a => a.id === totalAward.awardId)!.fixed || []), ...(awardsList.find(a => a.id === totalAward.awardId)!.rewards || [])] : []} articles={articlesList} />
            </div>
          )}
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Daily / Progress Awards</span>
          <div className="space-y-2">
            {dayAward.map((item: any, i: number) => {
              const award = awardsList.find(a => a.id === item.awardid);
              const rewards = award ? [...(award.fixed || []), ...(award.rewards || [])] : [];
              return (
                <div key={i} className="p-2 bg-bg/30 rounded border border-border flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0"><RewardList rewardsJson={rewards} articles={articlesList} /></div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-[10px] text-subtle">Day {item.cond || i + 1}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 24. Halloween Shop Mask Exchange
const HalloweenShopPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [targetScore, setTargetScore] = useState(1000);
  const mall = details.extra.mall || [];

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Shield size={16} className="text-orange-500" />
        <span>Ghost Mask — Halloween Exchange Shop</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Your Score</span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Target Score:</label>
            <input type="number" min={0} value={targetScore} onChange={(e) => setTargetScore(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold" />
          </div>
          {details.extra.buy_cost_gold && (
            <div className="p-2 bg-bg/50 rounded border border-border text-[10px]">
              Buy Cost: <span className="font-bold text-violet-600 dark:text-violet-400">{details.extra.buy_cost_gold} gold</span>
              {details.extra.refresh_cost_gold && <>, Refresh: <span className="font-bold text-violet-600 dark:text-violet-400">{details.extra.refresh_cost_gold} gold</span></>}
            </div>
          )}
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Mask Shop</span>
          <div className="space-y-2">
            {mall.map((item: any, i: number) => {
              const canAfford = targetScore >= (item.costScore || 0);
              const award = awardsList.find(a => a.id === item.award);
              const rewards = award ? [...(award.fixed || []), ...(award.rewards || [])] : [];
              return (
                <div key={i} className="p-2 bg-bg/30 rounded border border-border flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0"><RewardList rewardsJson={rewards} articles={articlesList} /></div>
                  <div className="text-right shrink-0">
                    <div className={`font-mono text-[10px] font-bold ${canAfford ? 'text-emerald-600 dark:text-emerald-400' : 'text-subtle'}`}>{item.costScore} score</div>
                    {item.numLimit > 0 && <div className="text-[9px] text-muted">Limit: {item.numLimit}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 25. Zanpakuto 2-in-1 Board Shop
const KnifeChessBuyPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [targetScore, setTargetScore] = useState(1250);
  const mall = details.extra.mall || [];

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Star size={16} className="text-yellow-500" />
        <span>Zanpakuto 2-in-1 — Board Shop</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Your Points</span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Target Points:</label>
            <input type="number" min={0} value={targetScore} onChange={(e) => setTargetScore(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold" />
          </div>
          <div className="p-2 bg-bg/50 rounded border border-border text-[10px]">
            Step Gold: <span className="font-bold text-violet-600 dark:text-violet-400">{details.extra.step_gold || '?'} gold per step</span>
          </div>
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Board Shop</span>
          <div className="space-y-2">
            {mall.map((item: any, i: number) => {
              const canAfford = targetScore >= (item.score || 0);
              const award = awardsList.find(a => a.id === item.award);
              const rewards = award ? [...(award.fixed || []), ...(award.rewards || [])] : [];
              return (
                <div key={i} className="p-2 bg-bg/30 rounded border border-border flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0"><RewardList rewardsJson={rewards} articles={articlesList} /></div>
                  <div className="text-right shrink-0">
                    <div className={`font-mono text-[10px] font-bold ${canAfford ? 'text-emerald-600 dark:text-emerald-400' : 'text-subtle'}`}>{item.score} pts</div>
                    {item.limit > 0 && <div className="text-[9px] text-muted">Limit: {item.limit}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 26. Ghost King Forging Planner
const GhostKingForgPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [targetScore, setTargetScore] = useState(35000);
  const bigAward = details.extra.big_award || {};
  const scoreShop = details.extra.score_shop || [];

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Flame size={16} className="text-red-500" />
        <span>Personal Top-Up — Ghost King Forging</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Big Award & Points</span>
          {bigAward.awardId && (
            <div className="p-3 bg-bg/50 rounded border border-border">
              <div className="font-mono text-[10px] mb-1">Requires: <span className="font-bold text-violet-600 dark:text-violet-400">{bigAward.gold?.toLocaleString()} gold</span></div>
              <RewardList rewardsJson={awardsList.find(a => a.id === bigAward.awardId) ? [...(awardsList.find(a => a.id === bigAward.awardId)!.fixed || []), ...(awardsList.find(a => a.id === bigAward.awardId)!.rewards || [])] : []} articles={articlesList} />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Target Score:</label>
            <input type="number" min={0} value={targetScore} onChange={(e) => setTargetScore(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold" />
          </div>
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Score Shop</span>
          <div className="space-y-2">
            {scoreShop.map((item: any, i: number) => {
              const canAfford = targetScore >= (item.score || 0);
              const award = awardsList.find(a => a.id === item.awardId);
              const rewards = award ? [...(award.fixed || []), ...(award.rewards || [])] : [];
              return (
                <div key={i} className="p-2 bg-bg/30 rounded border border-border flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0"><RewardList rewardsJson={rewards} articles={articlesList} /></div>
                  <div className="text-right shrink-0">
                    <div className={`font-mono text-[10px] font-bold ${canAfford ? 'text-emerald-600 dark:text-emerald-400' : 'text-subtle'}`}>{item.score?.toLocaleString()} pts</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 27. Sled Transport & Shop
const SledPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [targetCost, setTargetCost] = useState(50000);
  const shop = details.extra.shop || [];
  const bigGift = details.extra.big_gift || {};

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Compass size={16} className="text-cyan-500" />
        <span>Sled — Transport & Shop</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Big Gift</span>
          {bigGift.awardId && (
            <div className="p-3 bg-bg/50 rounded border border-border">
              <div className="font-mono text-[10px] mb-1">Cost: <span className="font-bold text-violet-600 dark:text-violet-400">{bigGift.gold?.toLocaleString()} gold</span></div>
              <RewardList rewardsJson={awardsList.find(a => a.id === bigGift.awardId) ? [...(awardsList.find(a => a.id === bigGift.awardId)!.fixed || []), ...(awardsList.find(a => a.id === bigGift.awardId)!.rewards || [])] : []} articles={articlesList} />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Your Currency:</label>
            <input type="number" min={0} value={targetCost} onChange={(e) => setTargetCost(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold" />
          </div>
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Sled Shop</span>
          <div className="space-y-2">
            {shop.map((item: any, i: number) => {
              const canAfford = targetCost >= (item.cost || 0);
              const award = awardsList.find(a => a.id === item.awardId);
              const rewards = award ? [...(award.fixed || []), ...(award.rewards || [])] : [];
              return (
                <div key={i} className="p-2 bg-bg/30 rounded border border-border flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0"><RewardList rewardsJson={rewards} articles={articlesList} /></div>
                  <div className="text-right shrink-0">
                    <div className={`font-mono text-[10px] font-bold ${canAfford ? 'text-emerald-600 dark:text-emerald-400' : 'text-subtle'}`}>{item.cost?.toLocaleString()} currency</div>
                    {item.count > 0 && <div className="text-[9px] text-muted">Limit: {item.count}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 28. Thanksgiving Feast Planner
const ThanksFeastPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const dailyGift = details.extra.daily_gift || [];
  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Trophy size={16} className="text-amber-500" />
        <span>Thanksgiving Feast — Daily Gift</span>
      </h4>
      <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto">
        <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Daily Gift Pool</span>
        <div className="space-y-2">
          {(Array.isArray(dailyGift) ? dailyGift : []).map((item: any, i: number) => {
            const awardId = item.awardId || item.awardid || item.award;
            const award = awardsList.find(a => a.id === awardId);
            const rewards = award ? [...(award.fixed || []), ...(award.rewards || [])] : [];
            return (
              <div key={i} className="p-2 bg-bg/30 rounded border border-border">
                <RewardList rewardsJson={rewards} articles={articlesList} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 29. Thank You Daily Gift Planner
const ThankYouPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const dailyGift = details.extra.daily_gift || [];
  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Gift size={16} className="text-emerald-500" />
        <span>Thank You — Daily Login Gift</span>
      </h4>
      <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto">
        <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Gift Pool</span>
        <div className="space-y-2">
          {(Array.isArray(dailyGift) ? dailyGift : []).map((item: any, i: number) => {
            const awardId = item.awardId || item.awardid || item.award;
            const award = awardsList.find(a => a.id === awardId);
            const rewards = award ? [...(award.fixed || []), ...(award.rewards || [])] : [];
            return (
              <div key={i} className="p-2 bg-bg/30 rounded border border-border">
                <RewardList rewardsJson={rewards} articles={articlesList} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 30. Hueco Mundo Treasure Hunt Shop
const TreasureHuntShopPlanner: React.FC<{ details: ActivityDetail; articlesList: Article[]; awardsList: Award[] }> = ({ details, articlesList, awardsList }) => {
  const [targetCurrency, setTargetCurrency] = useState(400);
  const shop = details.extra.shop || [];
  const bigAward = details.extra.big_award || {};

  return (
    <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
      <h4 className="font-bold text-sm text-text flex items-center gap-2">
        <Sparkles size={16} className="text-violet-500" />
        <span>Hueco Mundo Treasure Hunt — Shop</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Your Currency</span>
          <div className="space-y-1">
            <label className="text-subtle font-medium block">Target Currency:</label>
            <input type="number" min={0} value={targetCurrency} onChange={(e) => setTargetCurrency(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold" />
          </div>
          {bigAward.awardId && (
            <div className="p-2 bg-bg/50 rounded border border-border text-[10px]">
              Big Award Cost: <span className="font-bold text-violet-600 dark:text-violet-400">{bigAward.cost?.toLocaleString() || '?'}</span>
            </div>
          )}
          <div className="p-2 bg-bg/50 rounded border border-border text-[10px]">
            Draw Cost: <span className="font-bold text-violet-600 dark:text-violet-400">{details.extra.cost || '?'} per draw</span>
          </div>
        </div>
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-border max-h-56 overflow-y-auto">
          <span className="font-bold uppercase tracking-wider text-[10px] text-subtle block border-b border-border pb-1">Exchange Shop</span>
          <div className="space-y-2">
            {shop.map((item: any, i: number) => {
              const canAfford = targetCurrency >= (item.cost || 0);
              const award = awardsList.find(a => a.id === item.awardId);
              const rewards = award ? [...(award.fixed || []), ...(award.rewards || [])] : [];
              return (
                <div key={i} className="p-2 bg-bg/30 rounded border border-border flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0"><RewardList rewardsJson={rewards} articles={articlesList} /></div>
                  <div className="text-right shrink-0">
                    <div className={`font-mono text-[10px] font-bold ${canAfford ? 'text-emerald-600 dark:text-emerald-400' : 'text-subtle'}`}>{item.cost} currency</div>
                    {item.num > 0 && <div className="text-[9px] text-muted">Limit: {item.num}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PromotionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promo, setPromo] = useState<PromotionalActivity | null>(null);
  const [details, setDetails] = useState<ActivityDetail | null>(null);
  const [awardsList, setAwardsList] = useState<Award[]>([]);
  const [articlesList, setArticlesList] = useState<Article[]>([]);

  // Calendar launch simulation date state
  const [launchDate, setLaunchDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const fetchPromoDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const promoId = parseInt(id || '');

      const promosRes = await loadPromotionalActivities();
      const match = promosRes.rows.find(p => p.id === promoId);
      if (match) {
        setPromo(match);

        // Load extra details
        try {
          const detailsRes = await loadActivityDetails();
          const detailMatch = detailsRes[match.act_id?.toString() || ''];
          if (detailMatch) {
            setDetails(detailMatch);
          }
        } catch (err) {
          console.error("Failed to load extra activity details:", err);
        }

        // Load awards table for lookups
        try {
          const awardsRes = await loadAwards();
          setAwardsList(awardsRes.rows);
        } catch (err) {
          console.error("Failed to load awards.json:", err);
        }

        // Load articles table for reward names
        try {
          const articlesRes = await loadArticles();
          setArticlesList(articlesRes.rows);
        } catch (err) {
          console.error("Failed to load articles.json:", err);
        }
      } else {
        setError(`Promotion with ID ${id} not found in database.`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load promotion details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoDetails();
  }, [id]);

  const simulatedWindow = useMemo(() => {
    if (!promo) return '';
    const { time_type, start_time, end_time } = promo;
    const startArr = Array.isArray(start_time) ? start_time : [];
    const endArr = Array.isArray(end_time) ? end_time : [];

    switch (time_type) {
      case 1: {
        const dayStart = startArr[0] ?? 1;
        const dayEnd = endArr[0] ?? 7;
        const baseDate = new Date(launchDate);
        if (isNaN(baseDate.getTime())) return '-';

        const actualStart = new Date(baseDate);
        actualStart.setDate(baseDate.getDate() + (dayStart - 1));
        const actualEnd = new Date(baseDate);
        actualEnd.setDate(baseDate.getDate() + (dayEnd - 1));
        return `${actualStart.toLocaleDateString()} to ${actualEnd.toLocaleDateString()} (Days ${dayStart}-${dayEnd})`;
      }
      case 2: {
        const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const wkStart = startArr[0] ?? 1;
        const wkEnd = endArr[0] ?? 7;
        const startDay = weekdays[wkStart - 1] ?? `Day ${wkStart}`;
        const endDay = weekdays[wkEnd - 1] ?? `Day ${wkEnd}`;
        return `Weekly: ${startDay} through ${endDay}`;
      }
      case 3: {
        const yStart = startArr[0] ?? 2026;
        const mStart = startArr[1] ? startArr[1] - 1 : 0;
        const dStart = startArr[2] ?? 1;
        const yEnd = endArr[0] ?? 2026;
        const mEnd = endArr[1] ? endArr[1] - 1 : 11;
        const dEnd = endArr[2] ?? 31;
        const actualStart = new Date(yStart, mStart, dStart);
        const actualEnd = new Date(yEnd, mEnd, dEnd);
        return `${actualStart.toLocaleDateString()} to ${actualEnd.toLocaleDateString()} (Fixed calendar range)`;
      }
      case 5: {
        const duration = endArr[0] ?? 1;
        const cooldown = endArr[1] ?? 0;
        return `Periodic cycle: Active for ${duration} days, cooldown of ${cooldown} days before repeating.`;
      }
      default:
        return 'Permanent / Unknown schedule';
    }
  }, [promo, launchDate]);

  if (loading) return <LoadingState message="Downloading campaign timelines and bonus configurations..." />;
  if (error) return <ErrorState message={error} onRetry={fetchPromoDetails} />;
  if (!promo) return <ErrorState message="Promotion not found." onRetry={fetchPromoDetails} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <div>
        <Link
          to="/promotions"
          className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Promotions List</span>
        </Link>
      </div>

      {/* Main Panel */}
      <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-5 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-subtle font-bold bg-bg px-2.5 py-0.5 rounded">
              ID: {promo.id}
            </span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${getActivityTypeBadgeClass(promo.act_type ?? 0)}`}>
              {getActivityTypeLabel(promo.act_type ?? 0)}
            </span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${getTimeTypeBadgeClass(promo.time_type ?? 0)}`}>
              {getTimeTypeLabel(promo.time_type ?? 0)}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-text flex items-center gap-2">
            <Flame size={28} className="text-red-500 animate-pulse" />
            <span>{promo.name || `Promotion #${promo.id}`}</span>
          </h1>

          {/* Schedule Summary */}
          <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-4">
            <h3 className="font-bold text-sm text-text flex items-center gap-2 border-b border-border pb-2">
              <Calendar size={16} className="text-red-500" />
              <span>Parsed Campaign Duration</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
              <div className="bg-surface p-4 rounded-xl border border-border flex flex-col gap-1">
                <span className="text-subtle font-bold uppercase text-[10px]">Readable Timing Format</span>
                <span className="font-bold text-text dark:text-zinc-100">
                  {formatSchedule(promo.time_type, promo.start_time, promo.end_time)}
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* Technical specs */}
        <div className="w-full md:w-64 border border-border rounded-xl p-4 bg-bg/50 space-y-3 shrink-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-subtle border-b border-border pb-1.5">Event Properties</h4>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
            <div>
              <span className="text-subtle block mb-0.5">Activity ID</span>
              <span className="font-mono font-bold text-muted">#{promo.act_id}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Activity Type</span>
              <span className="font-semibold text-muted">Type {promo.act_type}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Time Category</span>
              <span className="font-semibold text-muted">Type {promo.time_type}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Trigger Icon</span>
              <span className="font-mono text-muted">Icon #{promo.act_icon ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Date Simulator widget inside detail page */}
      <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-text flex items-center gap-2 border-b border-border pb-2">
          <Calendar size={16} className="text-violet-500" />
          <span>Real-World Date Simulator for your Server</span>
        </h3>

        <p className="text-xs text-muted">
          This promotion uses a relative launch timer. Type in your server's start date to reveal the exact calendar date windows when the deal will display.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-[10px] font-bold uppercase text-subtle mb-1">Your Server Launch Date</label>
            <input
              type="date"
              value={launchDate}
              onChange={(e) => setLaunchDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-xl bg-bg text-xs font-semibold text-text focus:ring-1.5 focus:ring-violet-500 focus:outline-none cursor-pointer"
            />
          </div>

          <div className="md:col-span-2 p-3 bg-bg rounded-xl border border-border border-border text-xs flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase text-subtle">Simulated Real-World Schedule</span>
            <span className="font-mono text-sm font-bold text-violet-600 dark:text-violet-400">
              {simulatedWindow}
            </span>
          </div>
        </div>
      </div>

      {/* Datamined Activity Details & Rewards */}
      {details && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Gift size={22} className="text-emerald-500" />
              <h2 className="text-lg font-bold text-text">
                Datamined Campaign Rules & Rewards
              </h2>
              <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-bg text-subtle border border-border/50">
                Class: {details.class}
              </span>
            </div>

            {/* Campaign sub-headings and descriptions */}
            <div className="space-y-3">
              {details.tname && (
                <div className="text-sm font-extrabold text-violet-600 dark:text-violet-400">
                  {details.tname}
                </div>
              )}
              {details.description && (
                <p className="text-xs md:text-sm text-muted dark:text-zinc-350 leading-relaxed bg-bg/20 p-4 rounded-xl border border-border/50">
                  {details.description}
                </p>
              )}
            </div>

            {/* Targets / Thresholds & Milestone lists */}
            {details.targets && details.targets.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-subtle flex items-center gap-1">
                  <Target size={14} className="text-rose-500" />
                  <span>Target Milestones</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {details.targets.map((target, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-border/80 bg-bg/20 dark:bg-bg/5 space-y-3">
                      <div className="flex justify-between items-center border-b border-border pb-2">
                        <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <Target size={12} />
                          {target.prompt || `Goal ${target.key}`}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-subtle bg-bg px-2 py-0.5 rounded">
                          Value: {target.key.toLocaleString()}
                        </span>
                      </div>
                      {target.value && target.value.map((awardId) => {
                        const award = awardsList.find(a => a.id === awardId);
                        const mergedRewards = award ? [
                          ...(award.fixed || []),
                          ...(award.rewards || [])
                        ] : [];
                        return (
                          <div key={awardId} className="space-y-1">
                            <span className="text-[10px] font-bold text-subtle block">Milestone Rewards (ID #{awardId}):</span>
                            <RewardList rewardsJson={mergedRewards} articles={articlesList} />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tiers / Placement Reward Lists */}
            {details.awards && details.awards.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-subtle flex items-center gap-1">
                  <Trophy size={14} className="text-amber-500" />
                  <span>Tier Placement / Recharge Brackets</span>
                </h3>
                <div className="space-y-4">
                  {details.awards.map((awardTier, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-border/80 bg-bg/20 dark:bg-bg/5 space-y-3">
                      <div className="flex justify-between items-center border-b border-border pb-2">
                        <span className="text-xs font-extrabold text-text flex items-center gap-1">
                          <Trophy size={13} className="text-amber-500" />
                          {awardTier.prompt || `Tier ${awardTier.key}`}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-subtle bg-bg px-2 py-0.5 rounded">
                          Requirement: {awardTier.key.toLocaleString()}
                        </span>
                      </div>
                      {awardTier.value && awardTier.value.map((awardId) => {
                        const award = awardsList.find(a => a.id === awardId);
                        const mergedRewards = award ? [
                          ...(award.fixed || []),
                          ...(award.rewards || [])
                        ] : [];
                        return (
                          <div key={awardId} className="space-y-1">
                            <span className="text-[10px] font-bold text-subtle block">Tier Rewards (ID #{awardId}):</span>
                            <RewardList rewardsJson={mergedRewards} articles={articlesList} />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Interactive Calculators & Simulators */}
            {(details.class === "THDPyramid" || details.class === "THDRushInSeireitei" || details.class === "THDKingGuard" || details.class === "THDKingLegend" || details.class === "THDPowerRank" || details.class === "THDIceHeros" ||
              details.class === "THDGambling" || details.class === "THDExchangeChip" || details.class === "THDTeamBuy" || details.class === "THDActivityLimitBuy" ||
              details.class === "THDChildrenDayShop" || details.class === "THDChildrenDayCollect" ||
              ["THDSinglePay", "THDTotalPay", "THDDailyPay", "THDDailyTotalPay", "THDFirstPay", "THDPayReturn"].includes(details.class) ||
              ["THDTotalCost", "THDDailyCost", "THDDailyTotalCost"].includes(details.class) ||
              ["THDGrowFundLv", "THDFundLv", "THDFundShop", "THDFundInvestment"].includes(details.class) ||
              details.class === "THDSuperTreasure" ||
              details.tname === "Visored Revenge" ||
              details.tname === "Dragon Boat Race" ||
              details.class === "THDLaborConsume" || details.class === "THDNationalDayTwo" || details.class === "THDCoolSummer" ||
              details.class === "THDFoolsDayShop" || details.class === "THDFoolsDayRecharge" || details.class === "THDHalloweenShop" ||
              details.class === "THDKnifeChessBuy" || details.class === "THDGhostKingForg" || details.class === "THDSled" ||
              details.class === "THDThanksFeast" || details.class === "THDThankYou" || details.class === "THDTreasureHuntShop"
            ) && (
              <div className="pt-4 border-t border-border space-y-4">
                <span className="text-[10px] font-bold text-subtle block uppercase tracking-wider">
                  Interactive System Tools & Calculators
                </span>
                {details.class === "THDPyramid" && (
                  <>
                    <PyramidCalculator details={details} articlesList={articlesList} awardsList={awardsList} />
                    <PyramidLootTable details={details} articlesList={articlesList} awardsList={awardsList} />
                    <PyramidShop details={details} articlesList={articlesList} awardsList={awardsList} />
                  </>
                )}
                {details.class === "THDRushInSeireitei" && (
                  <RushInSeireiteiCalculator details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDKingGuard" && (
                  <KingsGuardCalculator details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDKingLegend" && (
                  <KingsLegendCalculator details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDPowerRank" && (
                  <PowerRankPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDIceHeros" && (
                  <IceHerosCalculator details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDGambling" && (
                  <GamblingCalculator details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDExchangeChip" && (
                  <ExchangeChipCalculator details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDTeamBuy" && (
                  <TeamBuyCalculator details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDActivityLimitBuy" && (
                  <LimitBuyCalculator details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {["THDSinglePay", "THDTotalPay", "THDDailyPay", "THDDailyTotalPay", "THDFirstPay", "THDPayReturn"].includes(details.class) && (
                  <RechargePlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {["THDTotalCost", "THDDailyCost", "THDDailyTotalCost"].includes(details.class) && (
                  <SpendPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDChildrenDayShop" && (
                  <HuecoMundoCandyPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDChildrenDayCollect" && (
                  <SeireiteiFarewellPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {["THDGrowFundLv", "THDFundLv", "THDFundShop", "THDFundInvestment"].includes(details.class) && (
                  <FundPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDSuperTreasure" && (
                  <SuperTreasurePlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {(details.tname === "Visored Revenge" || details.name.includes("Visor")) && (
                  <VisoredRevengeCalculator details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.tname === "Dragon Boat Race" && (
                  <DragonBoatRaceCalculator details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDKnifeHeroCollect" && (
                  <KnifeHeroCollectPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDLaborConsume" && (
                  <LaborConsumePlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDNationalDayTwo" && (
                  <NationalDayTwoPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDCoolSummer" && (
                  <CoolSummerPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDFoolsDayShop" && (
                  <FoolsDayShopPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDFoolsDayRecharge" && (
                  <FoolsDayRechargePlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDHalloweenShop" && (
                  <HalloweenShopPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDKnifeChessBuy" && (
                  <KnifeChessBuyPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDGhostKingForg" && (
                  <GhostKingForgPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDSled" && (
                  <SledPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDThanksFeast" && (
                  <ThanksFeastPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDThankYou" && (
                  <ThankYouPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
                {details.class === "THDTreasureHuntShop" && (
                  <TreasureHuntShopPlanner details={details} articlesList={articlesList} awardsList={awardsList} />
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Constraints and requirements */}
      <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
          <ShieldAlert size={18} className="text-amber-500" />
          <span>Participation Constraints & Visual Layouts</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono">
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Required Level</span>
            <span className="font-bold text-muted">Lv. {promo.player_lv || 1}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Required VIP Rank</span>
            <span className="font-bold text-muted">VIP Rank {promo.vip_lv || 0}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Dashboard Index</span>
            <span className="font-bold text-muted">Position #{promo.position ?? 0}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Active Screen Row</span>
            <span className="font-bold text-muted">Row #{promo.act_position ?? 0}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Display Option</span>
            <span className="font-bold text-muted">Type #{promo.start_time_show ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Raw JSON entry fallback */}
      <JsonViewer data={promo} title={`Raw JSON Database Entry: Promotion #${promo.id}`} />
    </div>
  );
};
