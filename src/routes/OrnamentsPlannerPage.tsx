import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadArticles, loadOrnamentValues, loadOrnamentUpgrades } from '../data/loaders';
import { Article, OrnamentValue, OrnamentUpgrade } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { 
  Sparkles, Cpu, TrendingUp, 
  ChevronRight, Award, ArrowRight
} from 'lucide-react';

const SLOTS_METADATA: Record<number, { name: string; stat: string; color: string; desc: string }> = {
  11: { name: 'Necklace', stat: 'Strength', color: 'rose', desc: 'Boosts physical strike strength and combat power.' },
  12: { name: 'Talisman', stat: 'Strength', color: 'orange', desc: 'Provides secondary strength scaling and defensive focus.' },
  13: { name: 'Ring', stat: 'Wisdom', color: 'emerald', desc: 'Amplifies Kido power and spiritual intelligence.' },
  14: { name: 'Earrings', stat: 'Wisdom', color: 'teal', desc: 'Increases warlock capability and spell casting accuracy.' },
  15: { name: 'Gloves', stat: 'Agility', color: 'blue', desc: 'Improves dodge capability and combat speed.' },
  16: { name: 'Bangle', stat: 'Agility', color: 'indigo', desc: 'Stabilizes weapon agility and strike precision.' },
  17: { name: 'Bracelets', stat: 'Stamina', color: 'fuchsia', desc: 'Drastically boosts base health pool and durability.' },
  18: { name: 'Anklets', stat: 'Stamina', color: 'pink', desc: 'Augments physical constitution and damage absorption.' },
};

const TIER_METADATA = [
  { level: 40, prefix: 'Rock', baseIdStart: 15850001, color: 'text-subtle border-border/50 dark:border-border bg-zinc-500/5' },
  { level: 60, prefix: 'Flame', baseIdStart: 15850021, color: 'text-amber-500 border-amber-500/30 bg-amber-500/5' },
  { level: 80, prefix: 'Frost', baseIdStart: 15850041, color: 'text-cyan-500 border-cyan-500/30 bg-cyan-500/5' },
  { level: 100, prefix: 'Silver', baseIdStart: 15850061, color: 'text-indigo-400 border-indigo-400/30 bg-indigo-400/5' },
  { level: 120, prefix: 'Gold', baseIdStart: 15850081, color: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5' },
  { level: 140, prefix: 'Jade', baseIdStart: 15850101, color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5' },
];

export const OrnamentsPlannerPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [ornamentValues, setOrnamentValues] = useState<OrnamentValue[]>([]);
  const [ornamentUpgrades, setOrnamentUpgrades] = useState<OrnamentUpgrade[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selector State
  const [selectedSlot, setSelectedSlot] = useState<number>(11); // Necklace
  const [selectedTier, setSelectedTier] = useState<number>(40);  // Rock
  
  // Range Simulator State
  const [startLevel, setStartLevel] = useState<number>(1);
  const [endLevel, setEndLevel] = useState<number>(50);
  const [startEvolved, setStartEvolved] = useState<boolean>(false);
  const [endEvolved, setEndEvolved] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [artRes, valRes, upgRes] = await Promise.all([
          loadArticles(),
          loadOrnamentValues(),
          loadOrnamentUpgrades()
        ]);
        setArticles(artRes.rows);
        setOrnamentValues(valRes.rows);
        setOrnamentUpgrades(upgRes.rows);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load spiritual ornaments database.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Articles Mapping
  const articlesMap = useMemo(() => {
    const map: Record<number, Article> = {};
    articles.forEach(a => {
      map[a.id] = a;
    });
    return map;
  }, [articles]);

  // Determine current items based on selections
  const baseItemInfo = useMemo(() => {
    const tier = TIER_METADATA.find(t => t.level === selectedTier);
    if (!tier) return null;
    
    // Ornament base IDs start at baseIdStart, offset by minor_type - 11
    // e.g. Rock (base 15850001), minor_type 11 (Necklace) -> 15850001
    // minor_type 13 (Ring) -> 15850003
    const baseId = tier.baseIdStart + (selectedSlot - 11);
    const baseArticle = articlesMap[baseId];
    
    // Evolved ID
    const upgrade = ornamentUpgrades.find(u => u.old_item_id === baseId);
    const evolvedId = upgrade?.new_item_id || (baseId + 10); // fallback
    const evolvedArticle = articlesMap[evolvedId];

    return {
      baseId,
      baseName: baseArticle?.name || `${tier.prefix} Slot #${selectedSlot}`,
      evolvedId,
      evolvedName: evolvedArticle?.name || `Spirit ${baseArticle?.name || ''}`,
      evolutionCost: upgrade?.cost_items || []
    };
  }, [selectedSlot, selectedTier, articlesMap, ornamentUpgrades]);

  // Handle auto-correction of sliders
  useEffect(() => {
    if (startLevel > endLevel) {
      setEndLevel(startLevel);
    }
  }, [startLevel]);

  useEffect(() => {
    if (endLevel < startLevel) {
      setStartLevel(endLevel);
    }
  }, [endLevel]);

  // Calculate Cumulative Costs
  const simulationResults = useMemo(() => {
    if (!baseItemInfo) return null;

    let totalCrystals = 0;
    let baseStatGain = 0;
    let targetStatGain = 0;

    // Filter values for base & evolved forms
    const baseValues = ornamentValues.filter(v => v.item_id === baseItemInfo.baseId);
    const evolvedValues = ornamentValues.filter(v => v.item_id === baseItemInfo.evolvedId);

    // Helper to get stats at a specific level/phase
    const getStat = (level: number, evolved: boolean) => {
      const list = evolved ? evolvedValues : baseValues;
      const match = list.find(v => v.level === level);
      return match ? match.add_value : 0;
    };

    baseStatGain = getStat(startLevel, startEvolved);
    targetStatGain = getStat(endLevel, endEvolved);

    // Sum level up costs
    // Note: Cost for level L is stored in the row for level L (or L-1).
    // Let's assume cost_items on level L is the price to level up from L-1 to L.
    const sumCrystals = (fromLvl: number, toLvl: number, evolved: boolean) => {
      let crystals = 0;
      const list = evolved ? evolvedValues : baseValues;
      for (let l = fromLvl + 1; l <= toLvl; l++) {
        const match = list.find(v => v.level === l);
        if (match && match.cost_items) {
          const cost = match.cost_items.find(c => c.code === 14860001);
          if (cost) {
            crystals += cost.amount;
          }
        }
      }
      return crystals;
    };

    if (startEvolved === endEvolved) {
      // No phase change
      totalCrystals = sumCrystals(startLevel, endLevel, startEvolved);
    } else if (!startEvolved && endEvolved) {
      // Evolving from Base to Spirit
      // 1. Level up base form to level 100 (or whichever level they transition at)
      // Standard MMORPG evolution usually requires max level (100) or we transition at startLevel.
      // Let's assume transition level is the startLevel where they hit "Evolve",
      // then we level up the evolved form from transition level to endLevel.
      const transitionLevel = startLevel; 
      const baseCost = sumCrystals(startLevel, transitionLevel, false);
      const evolvedCost = sumCrystals(transitionLevel, endLevel, true);
      totalCrystals = baseCost + evolvedCost;
    } else {
      // Downgrading (endEvolved false, startEvolved true) is simulated as 0 level cost
      totalCrystals = 0;
    }

    // Evolution cost
    const needsEvolution = !startEvolved && endEvolved;
    const evolutionStones = needsEvolution ? (baseItemInfo.evolutionCost[0]?.amount || 50) : 0;

    return {
      startStat: baseStatGain,
      endStat: targetStatGain,
      statDiff: Math.max(0, targetStatGain - baseStatGain),
      crystals: totalCrystals,
      evolutionStones,
      needsEvolution
    };
  }, [baseItemInfo, ornamentValues, startLevel, endLevel, startEvolved, endEvolved]);

  if (loading) return <LoadingState message="Decoding spiritual ornaments & Relics catalog..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const currentSlotMeta = SLOTS_METADATA[selectedSlot];

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
            <Award className="text-fuchsia-500" size={28} />
            Spiritual Ornaments & Relics Planner
          </h1>
          <p className="text-xs text-muted mt-1">
            Calculate material requirements, stat upgrades, and phase evolutions for character ornament gear.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Slot Selection Map */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tiers List */}
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-3">
            <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Select Ornament Level Tier</span>
            <div className="grid grid-cols-3 gap-2">
              {TIER_METADATA.map((tier) => (
                <button
                  key={tier.level}
                  onClick={() => setSelectedTier(tier.level)}
                  className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all ${
                    selectedTier === tier.level
                      ? 'border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 shadow-sm'
                      : 'border-border bg-bg/50 hover:border-border-strong text-muted'
                  }`}
                >
                  <span className="block text-[10px] text-subtle font-mono">Lv. {tier.level}</span>
                  <span className="block truncate">{tier.prefix}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Slot Grid Sheet */}
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-subtle uppercase tracking-wider">Equipped Relics Sheet</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950/50 text-fuchsia-600 dark:text-fuchsia-450 font-bold uppercase font-mono">
                {currentSlotMeta?.stat}
              </span>
            </div>
            
            {/* Visual Grid representing Character Equipment */}
            <div className="relative aspect-square w-full max-w-[280px] mx-auto flex items-center justify-center bg-bg/30 dark:bg-bg/10 border border-border/50 border-border rounded-2xl">
              {/* Silhouette Placeholder in Middle */}
              <div className="absolute inset-12 border border-dashed border-border rounded-full flex items-center justify-center opacity-30">
                <Cpu size={32} className="text-subtle" />
              </div>

              {/* 8 Slot Buttons placed circularly */}
              {Object.entries(SLOTS_METADATA).map(([minorTypeStr, meta], idx) => {
                const minorType = parseInt(minorTypeStr);
                const isSelected = selectedSlot === minorType;
                
                // Angle coordinates for circular layout
                const angle = (idx * 2 * Math.PI) / 8 - Math.PI / 2;
                const radius = 38; // percent
                const x = 50 + radius * Math.cos(angle);
                const y = 50 + radius * Math.sin(angle);

                return (
                  <button
                    key={minorType}
                    onClick={() => setSelectedSlot(minorType)}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 scale-110 shadow-md shadow-fuchsia-500/5'
                        : 'border-border bg-surface hover:border-border-strong text-muted'
                    }`}
                  >
                    <span className="text-[7.5px] font-bold uppercase tracking-tighter truncate w-full px-0.5 text-center">
                      {meta.name}
                    </span>
                    <span className="text-[6.5px] text-subtle tracking-tighter uppercase font-mono">
                      {meta.stat.slice(0, 3)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Slot Specs */}
            <div className="p-3 bg-bg/50 border border-border rounded-xl space-y-1">
              <span className="block text-xs font-bold text-text">
                Slot {selectedSlot}: {currentSlotMeta?.name}
              </span>
              <p className="text-[10px] text-muted leading-relaxed">
                {currentSlotMeta?.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Level Simulator & Cost Calculators */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-6">
            
            {/* Overview Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-border/60 gap-4">
              <div>
                <span className="text-[9px] font-mono text-subtle uppercase block">Selected Ornament Relic</span>
                <h3 className="font-black text-lg text-text">
                  {startEvolved ? baseItemInfo?.evolvedName : baseItemInfo?.baseName}
                </h3>
              </div>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-surface-raised text-muted font-mono">
                  Level {selectedTier} Base
                </span>
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 font-semibold">
                  Adds {currentSlotMeta?.stat}
                </span>
              </div>
            </div>

            {/* Simulated Range Setup */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Start State Panel */}
              <div className="p-4 border border-border/80 bg-bg/10 rounded-xl space-y-4">
                <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Start State</span>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-subtle font-semibold">Start Level</span>
                    <span className="font-mono font-bold text-text">Lv. {startLevel}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={startLevel}
                    onChange={(e) => setStartLevel(parseInt(e.target.value))}
                    className="w-full h-1 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                  />
                  
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-subtle font-semibold">Evolved Phase</span>
                    <button
                      onClick={() => setStartEvolved(prev => !prev)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        startEvolved
                          ? 'border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-450'
                          : 'border-border bg-surface text-subtle'
                      }`}
                    >
                      {startEvolved ? 'Spirit (Evolved)' : 'Base Form'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Target State Panel */}
              <div className="p-4 border border-border/80 bg-bg/10 rounded-xl space-y-4">
                <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Target State</span>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-subtle font-semibold">Target Level</span>
                    <span className="font-mono font-bold text-fuchsia-600 dark:text-fuchsia-450">Lv. {endLevel}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={endLevel}
                    onChange={(e) => setEndLevel(parseInt(e.target.value))}
                    className="w-full h-1 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                  />
                  
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-subtle font-semibold">Evolved Phase</span>
                    <button
                      onClick={() => setEndEvolved(prev => !prev)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        endEvolved
                          ? 'border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-450'
                          : 'border-border bg-surface text-subtle'
                      }`}
                    >
                      {endEvolved ? 'Spirit (Evolved)' : 'Base Form'}
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Results Simulator */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/60">
              
              {/* Stat Increments */}
              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Stat Progression Comparison</span>
                <div className="p-4 bg-bg/20 border border-border rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="block text-[9px] text-subtle uppercase font-mono">Current Stat</span>
                      <span className="text-base font-black text-muted">
                        +{simulationResults?.startStat} {currentSlotMeta?.stat}
                      </span>
                    </div>
                    <ArrowRight className="text-subtle" size={16} />
                    <div className="text-right">
                      <span className="block text-[9px] text-subtle uppercase font-mono">Projected Stat</span>
                      <span className="text-base font-black text-fuchsia-600 dark:text-fuchsia-400">
                        +{simulationResults?.endStat} {currentSlotMeta?.stat}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-fuchsia-500/5 border border-fuchsia-500/25 rounded-lg flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted">Total Net Gain</span>
                    <span className="font-mono font-black text-xs text-fuchsia-600 dark:text-fuchsia-400 flex items-center gap-1">
                      <TrendingUp size={12} />
                      +{simulationResults?.statDiff} {currentSlotMeta?.stat}
                    </span>
                  </div>
                </div>
              </div>

              {/* Required Shopping List */}
              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Required Materials List</span>
                <div className="p-4 bg-bg/20 border border-border rounded-xl space-y-2 text-xs">
                  
                  {/* Crystal Cores */}
                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-semibold text-muted">
                        {articlesMap[14860001]?.name || 'Crystal Core'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-text">
                      {simulationResults?.crystals.toLocaleString()}x
                    </span>
                  </div>

                  {/* Bright Stones */}
                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-fuchsia-500" />
                      <span className="font-semibold text-muted">
                        {articlesMap[14860010]?.name || 'Bright Stone'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-text">
                      {simulationResults?.evolutionStones.toLocaleString()}x
                    </span>
                  </div>

                  {/* Gold/Silver Estimate */}
                  <div className="flex justify-between items-center py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="font-semibold text-muted">Gold Cost Estimate</span>
                    </div>
                    <span className="font-mono font-bold text-text">
                      {/* Simple Gold estimation: 100 gold per crystal core level */}
                      {((simulationResults?.crystals || 0) * 250 + (simulationResults?.evolutionStones || 0) * 2000).toLocaleString()} Gold
                    </span>
                  </div>

                </div>
              </div>

            </div>

            {/* Evolution Flow visualization */}
            {baseItemInfo && (
              <div className="p-4 bg-bg/30 dark:bg-bg/5 border border-border rounded-xl space-y-3">
                <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Evolution & Phasing Path</span>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs">
                  
                  {/* Old Item */}
                  <div className="flex items-center gap-2 p-2 border border-border rounded-lg bg-surface w-full sm:w-auto min-w-[160px] justify-center">
                    <div className="w-2 h-2 rounded-full bg-zinc-300" />
                    <span className="font-bold text-text">{baseItemInfo.baseName}</span>
                  </div>

                  {/* Transition Cost Arrow */}
                  <div className="flex flex-col items-center">
                    <ArrowRight className="text-fuchsia-500 rotate-90 sm:rotate-0" size={16} />
                    <span className="text-[9px] text-subtle font-bold font-mono mt-0.5">
                      Cost: {baseItemInfo.evolutionCost[0]?.amount || 50}x Bright Stones
                    </span>
                  </div>

                  {/* New Item */}
                  <div className="flex items-center gap-2 p-2 border border-fuchsia-500/25 rounded-lg bg-fuchsia-500/5 w-full sm:w-auto min-w-[160px] justify-center">
                    <Sparkles className="text-fuchsia-500" size={12} />
                    <span className="font-bold text-fuchsia-700 dark:text-fuchsia-400">{baseItemInfo.evolvedName}</span>
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
