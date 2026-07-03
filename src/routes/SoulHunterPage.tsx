import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadSoulCollectionRnds, loadSoulCollectionShops, loadSoulCollectionBases, loadArticles } from '../data/loaders';
import { SoulCollectionRnd, SoulCollectionShop, SoulCollectionBase, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { 
  Sparkles, Target, Swords, Wand2, Info, ChevronRight, Coins,
  TrendingUp, Dices, ShoppingBag, ShieldAlert, Award
} from 'lucide-react';

export const SoulHunterPage: React.FC = () => {
  const [rnds, setRnds] = useState<SoulCollectionRnd[]>([]);
  const [shops, setShops] = useState<SoulCollectionShop[]>([]);
  const [bases, setBases] = useState<SoulCollectionBase[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selections
  const [selectedPhaseType, setSelectedPhaseType] = useState<number>(0);
  const [rolledPulls, setRolledPulls] = useState<Array<{ name: string; amount: number; quality: number }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [rndsRes, shopsRes, basesRes, artRes] = await Promise.all([
          loadSoulCollectionRnds(),
          loadSoulCollectionShops(),
          loadSoulCollectionBases(),
          loadArticles()
        ]);
        
        setRnds(rndsRes.rows);
        setShops(shopsRes.rows);
        setBases(basesRes.rows);
        setArticles(artRes.rows);

        // Find first available type
        if (rndsRes.rows.length > 0) {
          const uniqueTypes = Array.from(new Set(rndsRes.rows.map(r => r.type)));
          if (uniqueTypes.length > 0) {
            setSelectedPhaseType(uniqueTypes[0]);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load Soul Hunter database.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const articlesMap = useMemo(() => {
    const map: Record<number, Article> = {};
    articles.forEach(a => {
      map[a.id] = a;
    });
    return map;
  }, [articles]);

  const uniquePhases = useMemo(() => {
    return Array.from(new Set(rnds.map(r => r.type))).sort((a, b) => a - b);
  }, [rnds]);

  // Items in active phase drop pool
  const phasePoolItems = useMemo(() => {
    return rnds.filter(r => r.type === selectedPhaseType);
  }, [rnds, selectedPhaseType]);

  // Decode Exchange shop list
  const shopOffers = useMemo(() => {
    return shops.map(offer => {
      const reward = offer.exchange_reward;
      
      // Cost parser:
      // typically looks like: {"cost": [{"code": x, "amount": y}], "award": [{"code": a, "amount": b}]}
      let costItemCode = 0;
      let costItemAmount = 0;
      let rewardItemCode = 0;
      let rewardItemAmount = 0;

      if (reward) {
        if (Array.isArray(reward.cost) && reward.cost.length > 0) {
          costItemCode = reward.cost[0].code;
          costItemAmount = reward.cost[0].amount;
        }
        if (Array.isArray(reward.award) && reward.award.length > 0) {
          rewardItemCode = reward.award[0].code;
          rewardItemAmount = reward.award[0].amount;
        }
      }

      const costArt = articlesMap[costItemCode];
      const rewardArt = articlesMap[rewardItemCode];

      return {
        id: offer.id,
        costName: costArt ? costArt.name : `Token #${costItemCode}`,
        costAmount: costItemAmount,
        rewardName: rewardArt ? rewardArt.name : `Item #${rewardItemCode}`,
        rewardAmount: rewardItemAmount,
        rewardQuality: rewardArt ? rewardArt.quality : 1,
        weeklyLimit: offer.frequency
      };
    });
  }, [shops, articlesMap]);

  // Simulate Roll Summons
  const triggerRollSummons = () => {
    if (phasePoolItems.length === 0) return;
    
    const pulls: typeof rolledPulls = [];
    
    // Choose 10 random indices from active pool
    for (let i = 0; i < 10; i++) {
      const randIdx = Math.floor(Math.random() * phasePoolItems.length);
      const row = phasePoolItems[randIdx];
      
      // Decode row reward object: typically {"award": [{"code": x, "amount": y}]}
      let code = 0;
      let amount = 1;
      if (row.reward && Array.isArray(row.reward.award) && row.reward.award.length > 0) {
        code = row.reward.award[0].code;
        amount = row.reward.award[0].amount || 1;
      }
      
      const art = articlesMap[code];
      pulls.push({
        name: (art && art.name) ? art.name : `Soul Fragment #${code}`,
        amount,
        quality: (art && art.quality !== null) ? art.quality : 2
      });
    }

    setRolledPulls(pulls);
  };

  if (loading) return <LoadingState message="Decoding Soul Hunter drop rates..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
            <Link to="/" className="hover:text-subtle transition-colors">Dashboard</Link>
            <ChevronRight size={12} />
            <span className="text-muted">Tools</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text flex items-center gap-2.5">
            <Target className="text-indigo-500" size={28} />
            Limited Soul Hunter Event Oracle
          </h1>
          <p className="text-xs text-muted mt-1">
            Audit collection drop rates across event phases, simulate pulls, and view event exchange shop ledgers.
          </p>
        </div>
      </div>

      {/* Phase selectors */}
      <div className="p-4 border border-border bg-surface rounded-2xl shadow-sm space-y-3">
        <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Select Event Phase</span>
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {uniquePhases.map((phase) => (
            <button
              key={phase}
              onClick={() => {
                setSelectedPhaseType(phase);
                setRolledPulls([]);
              }}
              className={`py-2.5 px-4 text-xs font-bold rounded-xl border whitespace-nowrap transition-all ${
                selectedPhaseType === phase
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm'
                  : 'border-border bg-bg/50 hover:border-border text-muted'
              }`}
            >
              Event Phase #{phase}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Pulls simulator and statistics */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-6">
            
            <div className="flex justify-between items-center pb-3 border-b border-border/60">
              <div>
                <span className="text-[10px] font-mono text-subtle uppercase block">Active Phase Pool</span>
                <h3 className="font-black text-base text-text mt-0.5">
                  Phase #{selectedPhaseType} Drop Rates Pool ({phasePoolItems.length} entries)
                </h3>
              </div>
              
              <button
                onClick={triggerRollSummons}
                className="py-2 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 flex items-center gap-1.5 transition-colors"
              >
                <Dices size={14} />
                Roll 10 Hunter Summons
              </button>
            </div>

            {/* Summons results display */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">Summons Pulls Results</span>
              
              {rolledPulls.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rolledPulls.map((pull, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-border bg-bg/10 rounded-xl flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-text">
                        {pull.name}
                      </span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {pull.amount.toLocaleString()}x
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 border border-dashed border-border rounded-2xl text-center text-xs text-subtle italic">
                  Click the summons button to simulate 10 pulls from the active phase drop pool.
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Column: Exchange Shop Ledger */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Event Exchange Shop</span>
            
            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {shopOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="p-3.5 border border-border bg-bg/30 dark:bg-bg/15 rounded-xl space-y-2.5 text-xs"
                >
                  <div className="flex justify-between items-start border-b border-border pb-1.5 w-full">
                    <span className="font-bold text-text truncate pr-2">
                      {offer.rewardName}
                    </span>
                    <span className="font-mono text-subtle text-[10px] whitespace-nowrap">
                      Limit: {offer.weeklyLimit}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[10px] text-subtle uppercase font-mono">Price:</span>
                    <span className="font-mono font-bold text-indigo-650 dark:text-indigo-400">
                      {offer.costAmount.toLocaleString()}x {offer.costName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
