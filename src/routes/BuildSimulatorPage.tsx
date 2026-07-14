import React, { useState, useMemo } from 'react';
import { loadBuildValues, loadBuildConsumes } from '../data/loaders';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { useAsyncData } from '../hooks/useAsyncData';
import { getQualityLabel, getQualityColorClass } from '../utils/quality';
import { Swords, Info, Sparkles, TrendingUp, DollarSign, ListCollapse } from 'lucide-react';

function getEquipTypeLabel(type: number): string {
  switch (type) {
    case 1: return 'Zanpakuto / Weapon';
    case 2: return 'Headgear / Crown';
    case 3: return 'Clothing / Haori';
    case 4: return 'Belt / Sash';
    case 5: return 'Shoes / Footwear';
    case 6: return 'Ornament / Ring';
    default: return `Slot ${type}`;
  }
}

export const BuildSimulatorPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<number>(1);
  const [selectedQuality, setSelectedQuality] = useState<number>(4); // Default: Purple (S)
  const [startLevel, setStartLevel] = useState<number>(1);
  const [targetLevel, setTargetLevel] = useState<number>(40);

  const { data: buildData, loading, error, refetch } = useAsyncData(async () => {
    const [valuesRes, consumesRes] = await Promise.all([
      loadBuildValues(),
      loadBuildConsumes()
    ]);

    return {
      values: valuesRes.rows,
      consumes: consumesRes.rows
    };
  }, []);

  const values = buildData?.values || [];
  const consumes = buildData?.consumes || [];

  // Filter levels and compute list based on type and quality selection
  const filteredCurves = useMemo(() => {
    return values
      .filter(v => v.equip_type === selectedType && v.quality === selectedQuality)
      .sort((a, b) => (a.build_level || 0) - (b.build_level || 0));
  }, [values, selectedType, selectedQuality]);

  // Max level dynamically calculated from curve
  const maxLevel = useMemo(() => {
    if (filteredCurves.length === 0) return 100;
    return filteredCurves[filteredCurves.length - 1].build_level || 100;
  }, [filteredCurves]);

  // Ensure level inputs stay within valid boundaries
  const sanitizedStartLevel = Math.max(1, Math.min(startLevel, maxLevel));
  const sanitizedTargetLevel = Math.max(sanitizedStartLevel, Math.min(targetLevel, maxLevel));

  // Compute simulated stats and costs
  const simulationResult = useMemo(() => {
    const startRecord = filteredCurves.find(c => c.build_level === sanitizedStartLevel);
    const targetRecord = filteredCurves.find(c => c.build_level === sanitizedTargetLevel);

    const startVal = startRecord?.value || 0;
    const targetVal = targetRecord?.value || 0;
    const netStatIncrease = targetVal - startVal;

    // Estimate upgrade consume cost (sum of consumes corresponding to levels from start to target)
    let goldCost = 0;
    for (let lvl = sanitizedStartLevel; lvl < sanitizedTargetLevel; lvl++) {
      // Find consumes matching this level. Typically consume ID is level, or matches progression
      const consumeMatch = consumes.find(c => c.id === lvl);
      if (consumeMatch) {
        goldCost += consumeMatch.consume || 0;
      } else {
        // Fallback cost estimate if matching ID is not found
        goldCost += lvl * 150;
      }
    }

    return {
      startVal,
      targetVal,
      netStatIncrease,
      goldCost
    };
  }, [filteredCurves, consumes, sanitizedStartLevel, sanitizedTargetLevel]);

  if (loading) return <LoadingState message="Connecting to Forge anvil, fetching equipment stat arrays..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6 animate-fade-in text-text">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-soft text-brand rounded-xl">
            <Swords size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text">Equipment Build & Enhancement Simulator</h1>
            <p className="text-xs text-muted">Simulate equipment enhancement levels, calculate material costs, and evaluate net stat returns.</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Simulation Control */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-text flex items-center gap-2 border-b border-border pb-2">
              <Sparkles size={18} className="text-violet-500" />
              <span>Interactive Enhancement Specifier</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              {/* Slot Selection */}
              <div className="space-y-1">
                <label className="text-subtle block">Equipment Slot / Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(parseInt(e.target.value))}
                  className="w-full px-3 py-1.5 border border-border rounded-xl bg-bg text-text focus:outline-none focus:ring-1 focus:ring-brand font-bold"
                >
                  {[1, 2, 3, 4, 5, 6].map(type => (
                    <option key={type} value={type}>{getEquipTypeLabel(type)}</option>
                  ))}
                </select>
              </div>

              {/* Quality Selection */}
              <div className="space-y-1">
                <label className="text-subtle block">Equipment Quality Tier</label>
                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(parseInt(e.target.value))}
                  className="w-full px-3 py-1.5 border border-border rounded-xl bg-bg text-text focus:outline-none focus:ring-1 focus:ring-brand font-bold"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(q => (
                    <option key={q} value={q}>{getQualityLabel(q)}</option>
                  ))}
                </select>
              </div>

              {/* Start Level */}
              <div className="space-y-1">
                <label className="text-subtle block">Starting Level</label>
                <input
                  type="number"
                  min={1}
                  max={maxLevel}
                  value={startLevel}
                  onChange={(e) => setStartLevel(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 border border-border rounded-xl bg-bg text-text focus:outline-none focus:ring-1 focus:ring-brand font-mono font-bold"
                />
              </div>

              {/* Target Level */}
              <div className="space-y-1">
                <label className="text-subtle block">Target Level</label>
                <input
                  type="number"
                  min={startLevel}
                  max={maxLevel}
                  value={targetLevel}
                  onChange={(e) => setTargetLevel(Math.max(startLevel, parseInt(e.target.value) || startLevel))}
                  className="w-full px-3 py-1.5 border border-border rounded-xl bg-bg text-text focus:outline-none focus:ring-1 focus:ring-brand font-mono font-bold"
                />
              </div>
            </div>

            {/* Simulated Results block */}
            <div className="p-4 bg-bg/40 border border-border rounded-xl space-y-4">
              <span className="font-bold uppercase tracking-wider text-[10px] text-brand block border-b border-border/70 pb-1">Simulation Projection Yields</span>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 bg-surface border border-border rounded-lg">
                  <span className="text-[10px] text-subtle font-semibold block mb-0.5">Start Stat</span>
                  <span className="font-mono font-extrabold text-sm text-text">{simulationResult.startVal}</span>
                </div>
                <div className="p-2.5 bg-surface border border-border rounded-lg">
                  <span className="text-[10px] text-subtle font-semibold block mb-0.5">Target Stat</span>
                  <span className="font-mono font-extrabold text-sm text-text">{simulationResult.targetVal}</span>
                </div>
                <div className="p-2.5 bg-surface border border-border rounded-lg">
                  <span className="text-[10px] text-subtle font-semibold block mb-0.5">Net Gain</span>
                  <span className="font-mono font-extrabold text-sm text-emerald-600">+{simulationResult.netStatIncrease}</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-500/5 border border-indigo-100 dark:border-indigo-950/50 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-indigo-500 animate-pulse" />
                  <span className="font-semibold text-muted">Estimated enhancement currency / materials cost</span>
                </div>
                <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                  {simulationResult.goldCost.toLocaleString()} gold
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stat curves data catalog */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-text flex items-center gap-2 border-b border-border pb-2">
              <TrendingUp size={18} className="text-indigo-500" />
              <span>Selected Slot Upgrade Stat Steps</span>
            </h3>

            <div className="max-h-96 overflow-y-auto pr-1 text-xs space-y-2">
              {filteredCurves.slice(0, 15).map((curve) => (
                <div key={curve.id} className="p-2.5 bg-bg/40 border border-border rounded-xl flex justify-between items-center">
                  <div>
                    <span className="font-bold text-text">Enhancement Level {curve.build_level}</span>
                    <span className="block text-[10px] text-subtle mt-0.5">Step Increase: +{curve.add_value}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-subtle block font-semibold">Stat Value</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{curve.value}</span>
                  </div>
                </div>
              ))}
              {filteredCurves.length > 15 && (
                <div className="text-center text-[10px] text-muted font-bold pt-1.5 flex items-center justify-center gap-1">
                  <span>And {filteredCurves.length - 15} higher level stat points loaded...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
