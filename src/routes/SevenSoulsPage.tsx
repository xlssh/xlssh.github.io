import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadSevenHeroStars, loadSevenHeroLittleStars, loadSevenHeroSouls, loadSevenHeroArmies, loadArticles } from '../data/loaders';
import { SevenHeroStar, SevenHeroLittleStar, SevenHeroSoul, SevenHeroArmy, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { 
  Star, Shield, Swords, Wand2, Info, ChevronRight, Coins,
  TrendingUp, Activity, Heart, Sparkles, AlertCircle
} from 'lucide-react';

const STATS_MAP: Record<number, string> = {
  1: 'Strength',
  2: 'Agility',
  3: 'Wisdom',
  4: 'Stamina',
  11: 'Speed',
  16: 'Physical Attack',
  17: 'Physical Defense',
  20: 'Kido Attack',
  21: 'Kido Defense',
  28: 'Damage Rate',
  29: 'Damage Immunity',
  101: 'HP Pool',
};

export const SevenSoulsPage: React.FC = () => {
  const [stars, setStars] = useState<SevenHeroStar[]>([]);
  const [littleStars, setLittleStars] = useState<SevenHeroLittleStar[]>([]);
  const [souls, setSouls] = useState<SevenHeroSoul[]>([]);
  const [armies, setArmies] = useState<SevenHeroArmy[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selections
  const [selectedStarId, setSelectedStarId] = useState<number>(0);
  const [selectedArmyId, setSelectedArmyId] = useState<number>(0);
  const [activeNodes, setActiveNodes] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [starsRes, littleRes, soulsRes, armiesRes, artRes] = await Promise.all([
          loadSevenHeroStars(),
          loadSevenHeroLittleStars(),
          loadSevenHeroSouls(),
          loadSevenHeroArmies(),
          loadArticles()
        ]);
        
        const sortedStars = starsRes.rows.sort((a, b) => a.id - b.id);
        setStars(sortedStars);
        setLittleStars(littleRes.rows);
        setSouls(soulsRes.rows);
        
        const sortedArmies = armiesRes.rows.sort((a, b) => a.id - b.id);
        setArmies(sortedArmies);
        setArticles(artRes.rows);

        if (sortedStars.length > 0) {
          setSelectedStarId(sortedStars[0].id);
        }
        if (sortedArmies.length > 0) {
          setSelectedArmyId(sortedArmies[0].id);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load Seven Souls database.');
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

  const activeStar = useMemo(() => {
    return stars.find(s => s.id === selectedStarId) || null;
  }, [stars, selectedStarId]);

  // Orbiting satellite nodes for the active Big Star
  const activeLittleStars = useMemo(() => {
    return littleStars
      .filter(l => l.big_star === selectedStarId)
      .sort((a, b) => a.sort - b.sort);
  }, [littleStars, selectedStarId]);

  const activeArmy = useMemo(() => {
    return armies.find(a => a.id === selectedArmyId) || null;
  }, [armies, selectedArmyId]);

  // Toggle node state
  const toggleNode = (nodeId: number) => {
    setActiveNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Cumulative costs & stats calculation
  const simulationResults = useMemo(() => {
    let totalSoulShards = 0;
    let shardCostCode = 0;
    const stats: Record<string, number> = {};

    activeLittleStars.forEach(node => {
      if (activeNodes[node.id]) {
        totalSoulShards += node.cost_soul;
        shardCostCode = node.cost_soul_id;
        
        if (node.add_values) {
          node.add_values.forEach(v => {
            const name = STATS_MAP[v.addType] || `Stat #${v.addType}`;
            stats[name] = (stats[name] || 0) + v.addValue;
          });
        }
      }
    });

    return {
      totalSoulShards,
      shardName: articlesMap[shardCostCode]?.name || `Soul Shard #${shardCostCode}`,
      stats
    };
  }, [activeLittleStars, activeNodes, articlesMap]);

  // Decode boss rewards
  const bossRewards = useMemo(() => {
    if (!activeArmy || !activeArmy.many_win_reward) return [];
    
    let list: any[] = [];
    const rawReward = activeArmy.many_win_reward;
    if (Array.isArray(rawReward)) {
      list = rawReward;
    } else if (rawReward.award) {
      list = rawReward.award;
    }

    return list.map(item => {
      const art = articlesMap[item.code];
      return {
        name: art ? art.name : `Item #${item.code}`,
        amount: item.amount || 0
      };
    });
  }, [activeArmy, articlesMap]);

  if (loading) return <LoadingState message="Decoding Zero Division Altar matrices..." />;
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
            <Star className="text-amber-500 animate-pulse" size={28} />
            Seven Souls Altar & Royal Guard Simulator
          </h1>
          <p className="text-xs text-muted mt-1">
            Activate division altars star nodes, calculate Zero Guard soul shard costs, and check combat battle buffs.
          </p>
        </div>
      </div>

      {/* Altar Star selectors */}
      <div className="p-4 border border-border bg-surface rounded-2xl shadow-sm space-y-3">
        <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Select Altar Star</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {stars.map((star) => (
            <button
              key={star.id}
              onClick={() => {
                setSelectedStarId(star.id);
                setActiveNodes({});
              }}
              className={`py-3 px-1 text-center rounded-xl border text-xs font-bold transition-all ${
                selectedStarId === star.id
                  ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-sm'
                  : 'border-border bg-bg/50 hover:border-border text-text dark:text-zinc-355'
              }`}
            >
              <span className="block text-[9px] text-subtle font-mono">Division Altar</span>
              <span className="block truncate mt-0.5">{star.hero_name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Altar Star map node checklist and cost simulator */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-6">
            
            <div className="flex justify-between items-center pb-3 border-b border-border/60">
              <div>
                <span className="text-[10px] font-mono text-subtle uppercase block">Active Altar Member</span>
                <h3 className="font-black text-base text-text">
                  {activeStar?.hero_name} ({activeStar?.final_star_name})
                </h3>
              </div>
              <span className="text-[10.5px] text-muted max-w-xs text-right line-clamp-1 italic">
                "{activeStar?.desc}"
              </span>
            </div>

            {/* Nodes constellation layout checklist */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">Constellation Satellite Nodes</span>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeLittleStars.map((node) => {
                  const isActive = !!activeNodes[node.id];
                  return (
                    <button
                      key={node.id}
                      onClick={() => toggleNode(node.id)}
                      className={`p-4 border rounded-xl transition-all text-left flex flex-col justify-between h-28 ${
                        isActive
                          ? 'border-amber-500 bg-amber-500/5 shadow-sm'
                          : 'border-border bg-bg/50 hover:border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-amber-500' : 'text-subtle'}`}>
                          Node #{node.sort}
                        </span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isActive ? 'border-amber-500 bg-amber-500' : 'border-border-strong'}`}>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-surface" />}
                        </div>
                      </div>
                      
                      <div className="mt-2 space-y-1">
                        <span className="text-xs font-bold text-text block">
                          {node.little_star_name || `Satellite Node`}
                        </span>
                        <span className="text-[9px] text-subtle block font-mono">
                          Requires: {node.cost_soul} Shards
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cumulative Costs & Stats aggregates results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-border/60">
              
              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Soul Shards Material Cost</span>
                <div className="p-4 bg-bg/20 border border-border rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-muted">Shards Type:</span>
                    <span className="font-bold text-text">
                      {simulationResults.shardName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-muted">Total Shards Cost:</span>
                    <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                      {simulationResults.totalSoulShards.toLocaleString()}x Shards
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Aggregate Stats Boost</span>
                <div className="p-4 bg-bg/20 border border-border rounded-xl space-y-2 text-xs">
                  {Object.keys(simulationResults.stats).length > 0 ? (
                    Object.entries(simulationResults.stats).map(([name, val]) => (
                      <div key={name} className="flex justify-between items-center py-1 border-b border-border/40 last:border-0">
                        <span className="font-semibold text-muted">{name}</span>
                        <span className="font-mono font-black text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                          <TrendingUp size={10} />
                          +{val.toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-[10px] text-subtle italic">
                      Toggle constellation nodes to simulate attribute gains.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Right Column: Zero Division Royal Guard Boss encounters guide */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Zero Division trials</span>
            
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {armies.map((army) => {
                const isSelected = selectedArmyId === army.id;
                return (
                  <button
                    key={army.id}
                    onClick={() => setSelectedArmyId(army.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-sm'
                        : 'border-border bg-bg/50 hover:border-border text-muted'
                    }`}
                  >
                    <span>{army.name}</span>
                    <span className="font-mono text-[9px] text-subtle">Lv. {army.open_level}</span>
                  </button>
                );
              })}
            </div>

            {/* Trial Details display */}
            {activeArmy && (
              <div className="pt-4 border-t border-border/60 space-y-4 text-xs">
                
                <div className="space-y-1 bg-red-500/5 border border-red-500/10 p-3 rounded-xl">
                  <span className="font-bold text-red-600 dark:text-red-400 block uppercase text-[8.5px] font-mono">Stage Battle win Buff</span>
                  <p className="text-[10px] text-muted leading-relaxed italic">
                    {activeArmy.one_win_buff || 'No passive buffs defined.'}
                  </p>
                </div>

                <div className="space-y-1 bg-bg/20 border border-border p-3 rounded-xl">
                  <span className="font-bold text-subtle block uppercase text-[8.5px] font-mono">Stage Fail debuff</span>
                  <p className="text-[10px] text-muted leading-relaxed italic">
                    {activeArmy.one_fail_buff || 'No passive debuffs defined.'}
                  </p>
                </div>

                {/* Boss Clear Loot list */}
                <div className="space-y-2">
                  <span className="font-bold text-muted block uppercase text-[8.5px] font-mono">First-Clear Loot Rewards</span>
                  <div className="space-y-1.5">
                    {bossRewards.length > 0 ? (
                      bossRewards.map((item, idx) => (
                        <div key={idx} className="p-2 border border-border rounded-lg flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-text">{item.name}</span>
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{item.amount.toLocaleString()}x</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-subtle italic">No drop rewards registered.</span>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
