import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadSystemLanguage, loadArticles, loadFighterDetails } from '../data/loaders';
import { Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Swords, Trophy, Target, ShieldAlert, Sparkles, Coins, Gift, ChevronRight } from 'lucide-react';

export const YammyRampagePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [systemLang, setSystemLanguage] = useState<any[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [fighterDetails, setFighterDetails] = useState<any[]>([]);

  const [dailyAttempts, setDailyAttempts] = useState(3);
  const [combatPower, setCombatPower] = useState(100000);

  // Daily attempts reward table
  const attemptRewards = [
    { index: 1, silver: 20000, shards: '1 - 5' },
    { index: 2, silver: 30000, shards: '1 - 5' },
    { index: 3, silver: 50000, shards: '1 - 5' },
    { index: 4, silver: 60000, shards: '2 - 6' },
    { index: 5, silver: 80000, shards: '2 - 6' },
    { index: 6, silver: 90000, shards: '2 - 6' },
    { index: 7, silver: 100000, shards: '2 - 6' },
    { index: 8, silver: 120000, shards: '3 - 7' },
    { index: 9, silver: 140000, shards: '3 - 7' },
    { index: 10, silver: 160000, shards: '3 - 7' },
    { index: 11, silver: 180000, shards: '4 - 8' },
    { index: 12, silver: 200000, shards: '4 - 8' },
    { index: 13, silver: 220000, shards: '4 - 8' },
  ];

  const weeklyRankRewards = [
    { rank: '1 - 3', shards: 200, coupons: 2000, cards: 1000 },
    { rank: '4 - 10', shards: 150, coupons: 1500, cards: 800 },
    { rank: '11 - 20', shards: 100, coupons: 1000, cards: 600 },
    { rank: '21 - 50', shards: 80, coupons: 800, cards: 500 },
    { rank: '51 - 100', shards: 60, coupons: 600, cards: 400 },
    { rank: '101 - 200', shards: 50, coupons: 500, cards: 300 },
    { rank: '201 - 500', shards: 40, coupons: 400, cards: 200 },
    { rank: '501 - 1000', shards: 30, coupons: 300, cards: 100 },
    { rank: '1001 - 2000', shards: 20, coupons: 200, cards: 80 },
  ];

  useEffect(() => {
    Promise.all([loadSystemLanguage(), loadArticles(), loadFighterDetails()])
      .then(([langRes, artRes, fightRes]) => {
        setSystemLanguage(langRes.rows || []);
        setArticles(artRes.rows || []);
        setFighterDetails(fightRes.rows || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load database files for Yammy's Rampage Auditor.");
        setLoading(false);
      });
  }, []);

  const eventRulesText = useMemo(() => {
    const match = systemLang.find((item: any) => item.id === 70970091);
    if (!match) return "Rules not loaded.";
    // Clean html tags for rendering
    return match.desc.replace(/<[^>]*>/g, '');
  }, [systemLang]);

  const evilShardArticle = useMemo(() => {
    return articles.find(a => a.id === 14111294) || null;
  }, [articles]);

  // Calculate simulated daily rewards
  const calculations = useMemo(() => {
    let silverSum = 0;
    let minShards = 0;
    let maxShards = 0;
    for (let i = 0; i < dailyAttempts; i++) {
      const rew = attemptRewards[i];
      if (rew) {
        silverSum += rew.silver;
        const shardParts = rew.shards.split(' - ');
        minShards += parseInt(shardParts[0]);
        maxShards += parseInt(shardParts[1]);
      }
    }
    return { silverSum, shardsRange: `${minShards} - ${maxShards}` };
  }, [dailyAttempts]);

  // Projected weekly ranking based on Combat Power
  const projectedRank = useMemo(() => {
    if (combatPower >= 1000000) return 'Rank 1 - 3';
    if (combatPower >= 800000) return 'Rank 4 - 10';
    if (combatPower >= 600000) return 'Rank 11 - 20';
    if (combatPower >= 400000) return 'Rank 21 - 50';
    if (combatPower >= 250000) return 'Rank 51 - 100';
    if (combatPower >= 150000) return 'Rank 101 - 200';
    if (combatPower >= 80000) return 'Rank 201 - 500';
    return 'Rank 501 - 1000';
  }, [combatPower]);

  if (loading) return <LoadingState message="Connecting to Rampage battle rosters and rewards registries..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
          <Link to="/" className="hover:text-subtle transition-colors">Dashboard</Link>
          <ChevronRight size={12} />
          <span className="text-muted">PVE Systems</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text flex items-center gap-2.5">
          <Swords className="text-red-500 animate-pulse" size={28} />
          Yammy's Rampage Challenger & Reward Auditor
        </h1>
        <p className="text-xs text-muted mt-1">
          Yammy's Rampage is available after reaching level 90. Fight the Espada Boss to claim daily Silver, Evil Shards, and weekly rankings!
        </p>
      </div>

      {/* Rules dynamically retrieved from translation file */}
      <div className="p-5 border border-border bg-bg/50 rounded-2xl space-y-2">
        <h3 className="font-bold text-xs uppercase tracking-wider text-subtle">System Dynamic Rules (ID #70970091)</h3>
        <p className="text-xs md:text-sm text-muted dark:text-subtle leading-relaxed font-semibold">
          {eventRulesText}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily challenges simulator */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Sparkles size={16} className="text-yellow-500" />
              <h3 className="font-bold text-sm text-text">
                Daily Attempts Simulator
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-subtle font-medium block">Planned Challenge Attempts (Daily):</label>
                <input
                  type="number"
                  min={1}
                  max={13}
                  value={dailyAttempts}
                  onChange={(e) => setDailyAttempts(Math.min(13, Math.max(1, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold text-sm"
                />
              </div>

              <div className="p-3 bg-bg/40 rounded-xl border border-border text-[11px] leading-relaxed italic text-muted">
                Tip: You have 3 free challenge attempts daily. Up to 10 additional attempts can be purchased with gold.
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
                  <span className="text-[9px] text-subtle font-bold uppercase">Estimated Daily Silver</span>
                  <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400 text-xs">
                    {calculations.silverSum.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
                  <span className="text-[9px] text-subtle font-bold uppercase">Expected Evil Shards</span>
                  <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                    {calculations.shardsRange}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ranking damage estimator */}
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Target size={16} className="text-rose-500" />
              <h3 className="font-bold text-sm text-text">
                Damage & Rank Estimator
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-subtle font-medium block">Your Squad Combat Power:</label>
                <input
                  type="number"
                  min={0}
                  value={combatPower}
                  onChange={(e) => setCombatPower(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold text-sm"
                />
              </div>

              <div className="p-3 bg-bg/40 rounded-xl border border-border text-[11px] leading-relaxed">
                <div>Yammy has <span className="font-bold font-mono">20B HP</span> and battle ends after 5 rounds.</div>
                <div className="mt-1">Projected Weekly Bracket: <span className="font-bold text-rose-500">{projectedRank}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Ranking rewards table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Weekly damage Ranking Rewards</span>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-subtle font-bold uppercase text-[10px]">
                    <th className="py-2.5">Rank Bracket</th>
                    <th className="py-2.5">Evil Shards</th>
                    <th className="py-2.5">Coupons</th>
                    <th className="py-2.5">Silver Cards</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-950">
                  {weeklyRankRewards.map((row, idx) => (
                    <tr key={idx} className="font-mono text-muted dark:text-zinc-350">
                      <td className="py-2.5 font-sans font-bold">NO. {row.rank}</td>
                      <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400">{row.shards}</td>
                      <td className="py-2.5 font-bold text-violet-600 dark:text-violet-400">{row.coupons}</td>
                      <td className="py-2.5">{row.cards}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
