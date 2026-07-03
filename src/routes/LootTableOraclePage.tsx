import React, { useEffect, useState, useMemo } from 'react';
import { loadAwards, loadArticles, loadEnemyArmies } from '../data/loaders';
import { Award, Article, EnemyArmy } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { Search, Sparkles, Coins, Swords, HelpCircle, GitPullRequest, ArrowRight, Dices, Layers } from 'lucide-react';

export const LootTableOraclePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [awards, setAwards] = useState<Award[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [armies, setArmies] = useState<EnemyArmy[]>([]);

  // Navigation / Search states
  const [activeTab, setActiveTab] = useState<'oracle' | 'simulator'>('oracle');
  const [searchQuery, setSearchVal] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);

  // Simulator state
  const [selectedAwardId, setSelectedAwardId] = useState<number>(10001);
  const [simulationCount, setSimulationCount] = useState<number>(100);
  const [simResults, setSimResults] = useState<{
    totalOpened: number;
    items: Array<{
      articleId: number;
      name: string;
      quality: number;
      count: number;
      percentage: number;
      expectedPercentage: number;
      fixed: boolean;
    }>;
  } | null>(null);

  useEffect(() => {
    Promise.all([loadAwards(), loadArticles(), loadEnemyArmies()])
      .then(([awardRes, articleRes, armyRes]) => {
        setAwards(awardRes.rows);
        setArticles(articleRes.rows);
        setArmies(armyRes.rows);

        // Pre-select some popular reward/award chest that has random items if possible
        const rewardsAwards = awardRes.rows.filter(a => a.rewards && a.rewards.length > 0);
        if (rewardsAwards.length > 0) {
          setSelectedAwardId(rewardsAwards[0].id);
        }

        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load databases for Loot Table Oracle.");
        setLoading(false);
      });
  }, []);

  const articlesMap = useMemo(() => {
    const map = new Map<number, Article>();
    articles.forEach(art => map.set(art.id, art));
    return map;
  }, [articles]);

  // Handle oracle searches
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return articles.filter(art => 
      art.id.toString() === query || 
      (art.name && art.name.toLowerCase().includes(query))
    ).slice(0, 30);
  }, [articles, searchQuery]);

  const selectedArticle = selectedArticleId ? articlesMap.get(selectedArticleId) : null;

  // Trace where selected article is dropped
  const articleDrops = useMemo(() => {
    if (!selectedArticleId) return { awards: [], armies: [] };

    // Find Awards dropping this article (either fixed or rewards)
    const matchingAwards = awards.filter(aw => {
      const fixedMatch = aw.fixed?.some(f => f.code === selectedArticleId);
      const rewardsMatch = aw.rewards?.some(r => r.code === selectedArticleId);
      return fixedMatch || rewardsMatch;
    });

    const awardIds = new Set(matchingAwards.map(a => a.id));

    // Find EnemyArmies linking to these awards
    const matchingArmies = armies.filter(army => awardIds.has(army.award_id));

    return {
      awards: matchingAwards,
      armies: matchingArmies
    };
  }, [selectedArticleId, awards, armies]);

  // Execute Loot Box Simulation
  const handleSimulate = () => {
    const award = awards.find(a => a.id === selectedAwardId);
    if (!award) return;

    const rolledCounts: Record<number, { count: number; fixed: boolean }> = {};

    // 1. Process Fixed drops (always awarded in every open)
    award.fixed?.forEach(f => {
      if (f.code) {
        rolledCounts[f.code] = {
          count: (rolledCounts[f.code]?.count || 0) + (f.amount || 1) * simulationCount,
          fixed: true
        };
      }
    });

    // 2. Process Random/Weighted rewards
    const rewards = award.rewards || [];
    if (rewards.length > 0) {
      // Calculate total weights (sum of probs)
      const totalWeight = rewards.reduce((sum, item) => sum + (item.prob || 0), 0);

      if (totalWeight > 0) {
        for (let i = 0; i < simulationCount; i++) {
          // Select an item based on random weight
          let r = Math.random() * totalWeight;
          let selectedReward = rewards[0];
          for (const item of rewards) {
            r -= item.prob || 0;
            if (r <= 0) {
              selectedReward = item;
              break;
            }
          }

          if (selectedReward && selectedReward.code) {
            const current = rolledCounts[selectedReward.code] || { count: 0, fixed: false };
            rolledCounts[selectedReward.code] = {
              count: current.count + (selectedReward.amount || 1),
              fixed: current.fixed
            };
          }
        }
      }
    }

    // Assemble results details
    const resultItems = Object.entries(rolledCounts).map(([idStr, info]) => {
      const id = parseInt(idStr);
      const art = articlesMap.get(id);
      const matchingRewardItem = award.rewards?.find(r => r.code === id);
      const totalWeight = award.rewards?.reduce((sum, item) => sum + (item.prob || 0), 0) || 1;
      const expectedPct = info.fixed 
        ? 100 
        : matchingRewardItem && totalWeight 
          ? ((matchingRewardItem.prob || 0) / totalWeight) * 100 
          : 0;

      return {
        articleId: id,
        name: art?.name || `Unknown Article #${id}`,
        quality: art?.quality || 1,
        count: info.count,
        percentage: (info.count / simulationCount) * 100,
        expectedPercentage: expectedPct,
        fixed: info.fixed
      };
    }).sort((a, b) => b.count - a.count);

    setSimResults({
      totalOpened: simulationCount,
      items: resultItems
    });
  };

  const getQualityBg = (quality: number) => {
    switch (quality) {
      case 1: return 'bg-surface-raised text-text border-border-strong';
      case 2: return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
      case 3: return 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50';
      case 4: return 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50';
      case 5: return 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50';
      case 6: return 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50';
      default: return 'bg-surface-raised text-text border-border-strong';
    }
  };

  const getQualityBadge = (quality: number) => {
    const qualities = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];
    return qualities[quality] || `Tier ${quality}`;
  };

  if (loading) {
    return <LoadingState message="Decompressing Chest Award weights & parsing article drops..." />;
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
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-500" /> Ultimate Loot Table Oracle
          </h1>
          <p className="text-muted mt-1">
            Map any drop item back to its stage encounters or simulate chest drop rates with actual game config weights.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-surface-raised p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('oracle')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'oracle'
                ? 'bg-surface text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-muted hover:text-text dark:hover:text-zinc-200'
            }`}
          >
            <GitPullRequest className="w-4 h-4" /> Oracle Console
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'simulator'
                ? 'bg-surface text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-muted hover:text-text dark:hover:text-zinc-200'
            }`}
          >
            <Dices className="w-4 h-4" /> Loot Box Simulator
          </button>
        </div>
      </div>

      {activeTab === 'oracle' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Column */}
          <div className="lg:col-span-1 bg-surface rounded-2xl border border-border p-5 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-text">
              <Search className="w-5 h-5 text-indigo-500" /> Trace Item Drops
            </h2>
            <p className="text-xs text-muted">
              Enter item name (e.g. "shining", "stone", "relic", "scroll") or exact Article ID.
            </p>

            {/* Input field */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={e => setSearchVal(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-bg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-subtle" />
            </div>

            {/* Matching Articles List */}
            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredArticles.length > 0 ? (
                filteredArticles.map(art => (
                  <button
                    key={art.id}
                    onClick={() => setSelectedArticleId(art.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      selectedArticleId === art.id
                        ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400'
                        : 'border-border hover:bg-hover text-muted'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm line-clamp-1">{art.name}</div>
                      <div className="text-xs text-muted mt-0.5">ID: {art.id} • Quality {art.quality}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-subtle" />
                  </button>
                ))
              ) : searchQuery ? (
                <div className="text-center py-6 text-sm text-muted">
                  No matching articles found.
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted flex flex-col items-center gap-2">
                  <HelpCircle className="w-8 h-8 text-subtle" />
                  Type a keyword to start tracing.
                </div>
              )}
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-2 space-y-6">
            {selectedArticle ? (
              <div className="space-y-6">
                {/* Article Info Card */}
                <div className={`p-5 rounded-2xl border ${getQualityBg(selectedArticle.quality || 1)} flex flex-col sm:flex-row justify-between gap-4 shadow-sm`}>
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-black/5 dark:bg-surface/10 uppercase tracking-wider">
                      {getQualityBadge(selectedArticle.quality || 1)} Item
                    </span>
                    <h3 className="text-xl font-bold mt-1">{selectedArticle.name}</h3>
                    <p className="text-sm opacity-90 mt-1">{selectedArticle.function_desc || "No special function description registered."}</p>
                  </div>
                  <div className="sm:text-right text-xs opacity-75 self-end sm:self-auto flex flex-col gap-1">
                    <div>Article ID: <b>{selectedArticle.id}</b></div>
                    {selectedArticle.sell_price && <div>Sell Value: <b>{selectedArticle.sell_price} Silver</b></div>}
                    {selectedArticle.overlay_number && <div>Stack Limit: <b>{selectedArticle.overlay_number}</b></div>}
                  </div>
                </div>

                {/* Drop Locations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Matching Chests / Award entries */}
                  <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-subtle flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Award Pools ({articleDrops.awards.length})
                    </h4>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {articleDrops.awards.length > 0 ? (
                        articleDrops.awards.map(aw => {
                          const isFixed = aw.fixed?.some(f => f.code === selectedArticle.id);
                          const matchingReward = aw.rewards?.find(r => r.code === selectedArticle.id);
                          const totalWeight = aw.rewards?.reduce((s, r) => s + (r.prob || 0), 0) || 1;
                          const pct = matchingReward && totalWeight ? ((matchingReward.prob || 0) / totalWeight) * 100 : 0;

                          return (
                            <div key={aw.id} className="p-3 bg-bg rounded-xl border border-border flex items-center justify-between text-sm">
                              <div>
                                <span className="font-bold text-xs text-subtle">Award ID {aw.id}</span>
                                <div className="font-semibold text-text mt-0.5">
                                  {isFixed ? 'Guaranteed/Fixed drop' : `Weighted random drop`}
                                </div>
                              </div>
                              <div className="text-right">
                                {isFixed ? (
                                  <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 font-semibold rounded-lg border border-emerald-500/20">
                                    100% Drop
                                  </span>
                                ) : (
                                  <span className="text-xs px-2.5 py-1 bg-indigo-500/10 text-indigo-400 font-semibold rounded-lg border border-indigo-500/20">
                                    {pct.toFixed(2)}% Rate
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-muted text-sm">
                          This item is not mapped in any random Award chest.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Campaigns */}
                  <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-subtle flex items-center gap-2">
                      <Swords className="w-4 h-4" /> Combat Encounters ({articleDrops.armies.length})
                    </h4>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {articleDrops.armies.length > 0 ? (
                        articleDrops.armies.map(army => (
                          <div key={army.id} className="p-3 bg-bg rounded-xl border border-border space-y-1 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-xs text-indigo-400">Encounter {army.id}</span>
                              <span className="text-xs text-muted">Award: {army.award_id}</span>
                            </div>
                            <div className="font-semibold text-text">{army.name}</div>
                            {army.text && <p className="text-xs text-muted line-clamp-1 italic">"{army.text}"</p>}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted text-sm">
                          No active enemy army drop pools configured for this item.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-2xl p-10 text-center text-muted flex flex-col items-center justify-center gap-3">
                <HelpCircle className="w-12 h-12 text-subtle" />
                <h3 className="font-bold text-lg text-text">No Item Selected</h3>
                <p className="max-w-md text-sm">
                  Search and select a spiritual article from the sidebar to trace exactly which bosses drop it and inspect its drop rates.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* GACHA / LOOT CHEST SIMULATOR TAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Simulator Config */}
          <div className="lg:col-span-1 bg-surface rounded-2xl border border-border p-5 space-y-5">
            <h2 className="text-lg font-bold flex items-center gap-2 text-text">
              <Dices className="w-5 h-5 text-indigo-500" /> Simulator Controls
            </h2>

            {/* Select Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-subtle">Select Award Pool</label>
              <select
                value={selectedAwardId}
                onChange={e => setSelectedAwardId(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              >
                {awards
                  .filter(aw => (aw.fixed && aw.fixed.length > 0) || (aw.rewards && aw.rewards.length > 0))
                  .slice(0, 100)
                  .map(aw => {
                    const fixedItem = aw.fixed?.[0];
                    const rewardItem = aw.rewards?.[0];
                    const repItem = fixedItem ? articlesMap.get(fixedItem.code) : rewardItem ? articlesMap.get(rewardItem.code) : null;
                    return (
                      <option key={aw.id} value={aw.id}>
                        Award ID {aw.id} ({repItem?.name ? `${repItem.name} Chest` : 'Misc Rewards'})
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* Number of Chests */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-subtle">Number of Draws</label>
              <div className="grid grid-cols-3 gap-2">
                {[10, 100, 1000].map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setSimulationCount(count)}
                    className={`py-2 rounded-xl border font-semibold text-sm transition-all ${
                      simulationCount === count
                        ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400'
                        : 'border-border hover:bg-hover text-muted'
                    }`}
                  >
                    {count} Opens
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger Button */}
            <button
              onClick={handleSimulate}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-5 h-5" /> Simulate Gacha Rolls
            </button>
          </div>

          {/* Simulator Results */}
          <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5 space-y-6">
            {simResults ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-lg font-bold">Simulation Output</h3>
                    <p className="text-xs text-muted">Successfully processed {simResults.totalOpened} chest opens</p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 font-bold rounded-lg text-xs">
                    {simResults.items.length} Unique Items Drawn
                  </span>
                </div>

                {/* Distribution List */}
                <div className="space-y-4">
                  {simResults.items.map(res => (
                    <div key={res.articleId} className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded border ${getQualityBg(res.quality)} inline-block`} />
                          <span className="font-semibold text-text">{res.name}</span>
                          {res.fixed && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-surface-raised text-muted">
                              Fixed Drop
                            </span>
                          )}
                        </div>
                        <div className="text-muted">
                          <span className="font-bold text-text">{res.count}x</span> ({res.percentage.toFixed(1)}% rate)
                        </div>
                      </div>

                      {/* Bar graph */}
                      <div className="w-full bg-bg rounded-full h-3.5 overflow-hidden flex">
                        <div
                          className="bg-indigo-650 dark:bg-indigo-500 h-full transition-all duration-300"
                          style={{ width: `${Math.min(res.percentage, 100)}%` }}
                        />
                        {res.expectedPercentage > 0 && !res.fixed && (
                          <div
                            className="bg-zinc-300 dark:bg-zinc-700 h-full opacity-30"
                            style={{ width: `${Math.max(0, res.expectedPercentage - res.percentage)}%` }}
                          />
                        )}
                      </div>
                      {!res.fixed && res.expectedPercentage > 0 && (
                        <div className="text-[10px] text-muted text-right">
                          Expected Design Probability: <b>{res.expectedPercentage.toFixed(2)}%</b>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full py-16 flex flex-col items-center justify-center text-center text-muted gap-3">
                <Dices className="w-16 h-16 text-subtle" />
                <h3 className="font-bold text-lg text-text">No Simulation Active</h3>
                <p className="max-w-md text-sm">
                  Choose an Award config on the left panel and click simulate to view accurate percentage distributions.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
