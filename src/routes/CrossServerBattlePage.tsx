import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadGspvpRewards, loadGspvpDailyAwards, loadMallItems, loadArticles } from '../data/loaders';
import { Article, MallItem } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Swords, Trophy, Target, Shield, Coins, Gift, ChevronRight } from 'lucide-react';

const REWARDID_DATA = [14100022,14100023,14100024,14100025,14100026,14100027,14100028,14100061,14100062,14100063,14100064,14100043,14100044,14100045,14100021,14100021,14100075,14100076,14100283,14100293,14100297,14100298,14100299,14100300,14100352,14100353,14100351,14140507,14610000,14630000];
const REWARDID_TOMAINCODE = [0,0,0,2,5,6,3,7,7,7,7,4,4,4,1,15,13,13,14,18,12,12,12,12,22,22,22,24,20,20];
const REWARDID_TOSUBCODE = [0,1,2,0,0,0,0,3,4,5,6,11100101,11100102,11200003,14100021,12,8,9,0,24,6003059,6003060,6003061,6003062,25,26,27,28,31,30];

function rewardIDToTemplateID(type: number, code: number): number {
  if (type === 1 || type === 17 || type === 21 || type === 23) {
    return code;
  }
  for (let i = 0; i < REWARDID_TOMAINCODE.length; i++) {
    if (REWARDID_TOMAINCODE[i] === type && REWARDID_TOSUBCODE[i] === code) {
      return REWARDID_DATA[i];
    }
  }
  return 0;
}

export const CrossServerBattlePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rewardsList, setRewardsList] = useState<any[]>([]);
  const [dailyAwardsList, setDailyAwardsList] = useState<any[]>([]);
  const [mallItems, setMallItems] = useState<MallItem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);

  const [currentRankIdx, setCurrentRankIdx] = useState(0);
  const [clearedRows, setClearedRows] = useState(5);

  const ranks = useMemo(() => {
    const list = [
      { rank: 'SSS', points: 6000, type: 7 },
      { rank: 'SS', points: 5000, type: 6 },
      { rank: 'S', points: 4000, type: 5 },
      { rank: 'A', points: 3000, type: 4 },
      { rank: 'B', points: 2000, type: 3 },
      { rank: 'C', points: 1000, type: 2 },
      { rank: 'D', points: 0, type: 1 },
    ];
    return list.map(item => {
      const match = dailyAwardsList.find(da => da.type === item.type);
      return {
        ...item,
        dailyAwards: match ? match._loc2_ : []
      };
    });
  }, [dailyAwardsList]);

  useEffect(() => {
    Promise.all([loadGspvpRewards(), loadGspvpDailyAwards(), loadMallItems(), loadArticles()])
      .then(([rewRes, dailyRes, mallRes, artRes]) => {
        setRewardsList(rewRes.rows || []);
        setDailyAwardsList(dailyRes.rows || []);
        setMallItems(mallRes.rows || []);
        setArticles(artRes.rows || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load databases for Cross Server Battle Auditor.");
        setLoading(false);
      });
  }, []);

  const articlesMap = useMemo(() => {
    const map: Record<number, Article> = {};
    articles.forEach(a => {
      map[a.id] = a;
    });
    return map;
  }, [articles]);

  // Dynamically filter Token Shop items (bought with Shinigami Token: item_id = 14100282)
  const tokenShopItems = useMemo(() => {
    return mallItems.filter((item: any) => {
      const costCode = item.items_json?.code || 0;
      return costCode === 14100282;
    });
  }, [mallItems]);

  // Dynamically filter Inferno Shop items (bought with Inferno Stone: item_id = 14100733)
  const infernoShopItems = useMemo(() => {
    return mallItems.filter((item: any) => {
      const costCode = item.items_json?.code || 0;
      return costCode === 14100733;
    });
  }, [mallItems]);

  // Token rewards list per row cleared
  const shinigamiTokensPerRow = 150;
  const infernoStonesPerRow = 50;

  const totalTokens = clearedRows * shinigamiTokensPerRow;
  const totalInfernoStones = clearedRows * infernoStonesPerRow;

  if (loading) return <LoadingState message="Connecting to GSPVP battle lists and exchange databases..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
          <Link to="/" className="hover:text-subtle transition-colors">Dashboard</Link>
          <ChevronRight size={12} />
          <span className="text-muted">PVP Systems</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text flex items-center gap-2.5">
          <Shield className="text-red-500 animate-pulse" size={28} />
          Cross Server Battle Pyramid & Token Auditor
        </h1>
        <p className="text-xs text-muted mt-1">
          Cross Server Battle unlocks at level 72. Challenge other players across servers on the pyramid and accumulate Shinigami Tokens and Inferno Stones!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Starting points and rows clears simulator */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Swords size={16} className="text-yellow-500" />
              <h3 className="font-bold text-sm text-text">
                Pyramid Clears Simulator
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-subtle font-medium block">Select Starting Season Rank:</label>
                <select
                  value={currentRankIdx}
                  onChange={(e) => setCurrentRankIdx(parseInt(e.target.value))}
                  className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none font-bold"
                >
                  {ranks.map((r, i) => (
                    <option key={i} value={i}>
                      Rank {r.rank} - {r.points} Starting Points
                    </option>
                  ))}
                </select>
                {ranks[currentRankIdx]?.dailyAwards && ranks[currentRankIdx].dailyAwards.length > 0 && (
                  <div className="mt-1.5 p-2 rounded bg-bg/40 border border-border space-y-1">
                    <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">Daily Tier Rewards:</span>
                    <div className="flex flex-wrap gap-1">
                      {ranks[currentRankIdx].dailyAwards.map((da: any, idx: number) => {
                        const tId = rewardIDToTemplateID(da.type, da.code);
                        const art = articlesMap[tId];
                        return (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-surface-raised/50 dark:bg-surface text-[10px] font-bold text-muted font-mono">
                            {art ? art.name : `Item #${tId}`} * {da.amount}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-subtle font-medium block">Rows Cleared on Pyramid (1 - 18):</label>
                <input
                  type="number"
                  min={0}
                  max={18}
                  value={clearedRows}
                  onChange={(e) => setClearedRows(Math.min(18, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-1.5 border border-border rounded bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
                  <span className="text-[9px] text-subtle font-bold uppercase">Shinigami Tokens Gained</span>
                  <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400 text-xs">
                    {totalTokens.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-bg/50 rounded border border-border flex flex-col gap-0.5">
                  <span className="text-[9px] text-subtle font-bold uppercase">Inferno Stones Gained</span>
                  <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-xs">
                    {totalInfernoStones.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Challenge Stone exchange and reward options */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Exchange shops */}
          <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Exchange Shop Redeemable Items</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Challenge/Shinigami Token Shop */}
              <div className="p-4 bg-bg/20 border border-border rounded-xl space-y-2">
                <span className="font-bold text-subtle block uppercase text-[10px]">Shinigami Token Shop</span>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-muted max-h-60 overflow-y-auto pr-1">
                  {tokenShopItems.map((item, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center">
                      <span>{item.name} (Qty {item.amount})</span>
                      <span className="font-bold text-violet-600 dark:text-violet-400 font-mono">
                        {item.items_json?.amount || 0} Tokens
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inferno Stones Shop */}
              <div className="p-4 bg-bg/20 border border-border rounded-xl space-y-2">
                <span className="font-bold text-subtle block uppercase text-[10px]">Inferno Stones Shop</span>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-muted max-h-60 overflow-y-auto pr-1">
                  {infernoShopItems.map((item, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center">
                      <span>{item.name} (Qty {item.amount})</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {item.items_json?.amount || 0} Stones
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Ranking rewards table */}
          {rewardsList.length > 0 && (
            <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
              <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Weekly Season Rankings Rewards</span>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-subtle font-bold uppercase text-[10px]">
                      <th className="py-2.5">Rank Placement</th>
                      <th className="py-2.5">Extracted Rewards</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-950">
                    {rewardsList.map((row, idx) => {
                      const awards = row._loc2_ || [];
                      return (
                        <tr key={idx} className="font-mono text-muted dark:text-zinc-350">
                          <td className="py-2.5 font-sans font-bold">
                            {row.from === row.to ? `Rank ${row.from}` : `Rank ${row.from} - ${row.to}`}
                          </td>
                          <td className="py-2.5">
                            <div className="flex flex-wrap gap-2">
                              {awards.map((aw: any, aIdx: number) => {
                                const tId = rewardIDToTemplateID(aw.type, aw.code);
                                const art = articlesMap[tId];
                                return (
                                  <span key={aIdx} className="px-2 py-0.5 rounded bg-bg font-bold text-muted">
                                    {art ? art.name : `Item #${tId}`} * {aw.amount}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
