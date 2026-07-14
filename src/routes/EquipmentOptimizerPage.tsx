import React, { useEffect, useState, useMemo } from 'react';
import { loadBaseEquips, loadSuits, loadHeroes } from '../data/loaders';
import type { BaseEquip, Suit, Hero } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getProfessionLabel } from '../data/relationships';
import { getQualityLabel, getQualityColorClass } from '../utils/quality';
import { calcHeroBP } from '../utils/battlePower';
import { Swords, Sparkles, RefreshCw, Layers, Shield, Heart, Zap, Dices } from 'lucide-react';

const SLOT_NAMES: Record<number, string> = { 1: 'Weapon', 2: 'Headgear', 3: 'Clothing', 4: 'Cloak', 5: 'Shoe', 6: 'Belt' };

// Stat names
const JADE_TYPES = [
  { id: 1, label: 'STR Jade', stat: 'STR' },
  { id: 2, label: 'AGI Jade', stat: 'AGI' },
  { id: 3, label: 'INT Jade', stat: 'INT' },
  { id: 4, label: 'HP Jade', stat: 'HP' },
];

// Jade stat value increments per level (simulated stats table)
const JADE_VALS_PER_LEVEL: Record<number, Record<number, number>> = {
  1: { 1: 10, 2: 20, 3: 35, 4: 55, 5: 80, 6: 110, 7: 150, 8: 200, 9: 260, 10: 330 }, // STR
  2: { 1: 10, 2: 20, 3: 35, 4: 55, 5: 80, 6: 110, 7: 150, 8: 200, 9: 260, 10: 330 }, // AGI
  3: { 1: 10, 2: 20, 3: 35, 4: 55, 5: 80, 6: 110, 7: 150, 8: 200, 9: 260, 10: 330 }, // INT
  4: { 1: 100, 2: 200, 3: 350, 4: 550, 5: 800, 6: 1100, 7: 1500, 8: 2000, 9: 2600, 10: 3300 }, // HP
};

export const EquipmentOptimizerPage: React.FC = () => {
  const [equips, setEquips] = useState<BaseEquip[]>([]);
  const [suits, setSuits] = useState<Suit[]>([]);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Optimizer Sandbox state
  const [selectedHeroId, setSelectedHeroId] = useState<number>(0);
  const [heroLevel, setHeroLevel] = useState<number>(50);

  // Selected equips per slot (minor_type)
  const [slotEquips, setSlotEquips] = useState<Record<number, number>>({});
  // Selected Jades: slot_id -> socket_index -> { jade_type_id, level }
  const [slotJades, setSlotJades] = useState<Record<string, { typeId: number; level: number }>>({});

  // Jade Fusion state
  const [fusionInputQty, setFusionInputQty] = useState<number>(9);
  const [fusionInputLevel, setFusionInputLevel] = useState<number>(5);
  const [fusionSelectedType, setFusionSelectedType] = useState<number>(2); // Default AGI

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eqRes, suRes, heRes] = await Promise.all([
        loadBaseEquips(), loadSuits(), loadHeroes()
      ]);
      setEquips(eqRes.rows);
      setSuits(suRes.rows);
      setHeroes(heRes.rows);
      if (heRes.rows.length > 0) {
        setSelectedHeroId(heRes.rows[0].id);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const suitMap = useMemo(() => {
    const m = new Map<number, Suit>();
    suits.forEach(s => m.set(s.id, s));
    return m;
  }, [suits]);

  const activeHero = useMemo(() => heroes.find(h => h.id === selectedHeroId) || null, [heroes, selectedHeroId]);

  // Equips filtered or grouped by slots
  const equipsBySlot = useMemo(() => {
    const map: Record<number, BaseEquip[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    equips.forEach(e => {
      const minor = e.main_type?.[0] ?? 0;
      if (minor in map) {
        map[minor].push(e);
      }
    });
    return map;
  }, [equips]);

  // Set default gear based on profession of chosen hero
  useEffect(() => {
    if (!activeHero) return;
    const defaults: Record<number, number> = {};
    const heroProf = activeHero.profession;

    Object.entries(equipsBySlot).forEach(([slotId, items]) => {
      // Find items that fit profession, or first item
      const slotNum = parseInt(slotId);
      const matched = items.find(e => {
        if (!e.dress_profession) return true;
        const match = e.dress_profession.match(/(\d+)/);
        return match ? parseInt(match[1]) === heroProf : true;
      }) || items[0];

      if (matched) {
        defaults[slotNum] = matched.id;
      }
    });
    setSlotEquips(defaults);
    setSlotJades({});
  }, [activeHero, equipsBySlot]);

  // Compute stats of equipped gear
  const gearStats = useMemo(() => {
    const stats = { STR: 0, AGI: 0, INT: 0, HP: 0 };
    const suitCounts: Record<number, number> = {};

    Object.entries(slotEquips).forEach(([slotId, eqId]) => {
      const eq = equips.find(e => e.id === eqId);
      if (!eq) return;

      // Add main values
      if (eq.main_type && eq.main_value) {
        eq.main_type.forEach((t, idx) => {
          const val = eq.main_value?.[idx] ?? 0;
          if (t === 1) stats.STR += val;
          if (t === 2) stats.AGI += val;
          if (t === 3) stats.INT += val;
          if (t === 4) stats.HP += val;
        });
      }

      // Track suit pieces
      if (eq.suit_id) {
        suitCounts[eq.suit_id] = (suitCounts[eq.suit_id] || 0) + 1;
      }
    });

    // Add Suit Bonuses
    Object.entries(suitCounts).forEach(([sId, count]) => {
      const suit = suitMap.get(parseInt(sId));
      if (!suit || count < 2) return; // Need at least 2 pieces

      // Mock set bonuses based on database layout
      // Note: Typically sets grant specific stat % or flat values. We'll add flat values representing passive telemetry.
      const multiplier = count >= 4 ? 2 : 1;
      stats.STR += 50 * multiplier;
      stats.AGI += 50 * multiplier;
      stats.INT += 50 * multiplier;
      stats.HP += 500 * multiplier;
    });

    return stats;
  }, [slotEquips, equips, suitMap]);

  // Compute stats of socketed Jades
  const jadeStats = useMemo(() => {
    const stats = { STR: 0, AGI: 0, INT: 0, HP: 0 };
    Object.entries(slotJades).forEach(([key, jade]) => {
      const valTable = JADE_VALS_PER_LEVEL[jade.typeId];
      if (!valTable) return;
      const statVal = valTable[jade.level] || 0;

      if (jade.typeId === 1) stats.STR += statVal;
      if (jade.typeId === 2) stats.AGI += statVal;
      if (jade.typeId === 3) stats.INT += statVal;
      if (jade.typeId === 4) stats.HP += statVal;
    });
    return stats;
  }, [slotJades]);

  // Projected Final Hero fighting power
  const projectedTelemetry = useMemo(() => {
    if (!activeHero) return { baseBP: 0, finalBP: 0, breakdown: { str: 0, agi: 0, int: 0, hp: 0 } };

    const l = Math.max(1, heroLevel);
    const baseSTR = (activeHero.power ?? 0) + Math.round((activeHero.power_grow ?? 0) * (l - 1));
    const baseAGI = (activeHero.agile ?? 0) + Math.round((activeHero.agile_grow ?? 0) * (l - 1));
    const baseINT = (activeHero.intelligence ?? 0) + Math.round((activeHero.intelligence_grow ?? 0) * (l - 1));
    const baseHP = (activeHero.life ?? 0) + Math.round((activeHero.life_grow ?? 0) * (l - 1));

    const finalSTR = baseSTR + gearStats.STR + jadeStats.STR;
    const finalAGI = baseAGI + gearStats.AGI + jadeStats.AGI;
    const finalINT = baseINT + gearStats.INT + jadeStats.INT;
    const finalHP = baseHP + gearStats.HP + jadeStats.HP;

    const baseBP = baseSTR + baseAGI + baseINT + Math.round(baseHP / 10);
    const finalBP = finalSTR + finalAGI + finalINT + Math.round(finalHP / 10);

    return {
      baseBP,
      finalBP,
      breakdown: { str: finalSTR, agi: finalAGI, int: finalINT, hp: finalHP }
    };
  }, [activeHero, heroLevel, gearStats, jadeStats]);

  // Jade Fusion calculations
  const fusionResults = useMemo(() => {
    const costPerUp = 3; // 3 low-level Jades fuse into 1 higher level Jade
    const count = fusionInputQty;
    const lvl = fusionInputLevel;

    // Fusing outcomes
    const nextLvlCount = Math.floor(count / costPerUp);
    const remainder = count % costPerUp;

    // Retrieve stats per level
    const valTable = JADE_VALS_PER_LEVEL[fusionSelectedType] || {};
    const baseStatItem = JADE_TYPES.find(j => j.id === fusionSelectedType)?.stat || 'Stat';
    
    const currentTotalStat = count * (valTable[lvl] || 0);
    const fusedTotalStat = nextLvlCount * (valTable[lvl + 1] || 0) + remainder * (valTable[lvl] || 0);
    const delta = fusedTotalStat - currentTotalStat;

    return {
      nextLvlCount,
      remainder,
      baseStatItem,
      currentTotalStat,
      fusedTotalStat,
      delta,
      fusedLevel: lvl + 1
    };
  }, [fusionInputQty, fusionInputLevel, fusionSelectedType]);

  const handleEquipChange = (slotId: number, equipId: number) => {
    setSlotEquips(prev => ({ ...prev, [slotId]: equipId }));
    // Clear old Jades for slots exceeding new equip's holes
    const newEquip = equips.find(e => e.id === equipId);
    const holes = newEquip?.hole_count ?? 0;
    setSlotJades(prev => {
      const next = { ...prev };
      [0, 1, 2].forEach(idx => {
        if (idx >= holes) {
          delete next[`${slotId}-${idx}`];
        }
      });
      return next;
    });
  };

  const handleJadeChange = (slotId: number, holeIdx: number, typeId: number, level: number) => {
    setSlotJades(prev => {
      const next = { ...prev };
      const key = `${slotId}-${holeIdx}`;
      if (typeId === 0) {
        delete next[key];
      } else {
        next[key] = { typeId, level };
      }
      return next;
    });
  };

  if (loading) return <LoadingState message="Loading gear sandbox databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in text-text">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-soft text-brand rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.15)]">
            <Swords size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text flex items-center gap-2">
              Equipment Build Optimizer
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 border border-brand bg-brand-soft text-brand font-mono font-bold rounded">Tactical Sandbox</span>
            </h1>
            <p className="text-sm text-muted">Assemble weapon matrices, load jade slots, and project cumulative team Fighting Power curves.</p>
          </div>
        </div>
      </div>

      {/* Roster Config Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="p-4 border border-border bg-surface rounded-xl shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-subtle uppercase tracking-wider mb-1.5">Selected Fighter Roster</label>
              <select
                value={selectedHeroId}
                onChange={(e) => setSelectedHeroId(parseInt(e.target.value))}
                className="block w-full py-2.5 px-3 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer font-mono"
              >
                {heroes.map(h => (
                  <option key={h.id} value={h.id}>{h.name} ({getQualityLabel(h.quality)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-subtle uppercase tracking-wider mb-1.5">Fighter Level Range</label>
              <input
                type="range"
                min="1"
                max="159"
                value={heroLevel}
                onChange={(e) => setHeroLevel(parseInt(e.target.value))}
                className="w-full mt-3 accent-brand"
              />
              <div className="text-center text-xs font-mono font-bold text-brand mt-1">Level {heroLevel}</div>
            </div>
          </div>
        </section>

        {/* BP Matrix Display */}
        {activeHero && (
          <section className="p-4 border border-brand/20 bg-brand-soft/5 rounded-xl shadow-md space-y-2 flex flex-col justify-between">
            <div>
              <div className="text-xs text-subtle uppercase font-bold tracking-widest">Projected Telemetry BP</div>
              <div className="text-3xl font-black text-brand font-mono leading-none tracking-tight my-1.5">
                {projectedTelemetry.finalBP.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted">
                Base: {projectedTelemetry.baseBP.toLocaleString()} · Shift: +{(projectedTelemetry.finalBP - projectedTelemetry.baseBP).toLocaleString()} BP
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Slot Socketing matrix */}
        <section className="p-5 border border-border bg-surface rounded-xl shadow-sm xl:col-span-2 space-y-4">
          <h3 className="font-black text-text flex items-center gap-2 text-sm uppercase tracking-wider">
            <Layers size={16} className="text-brand" />
            Weapon Array & Jade Slots
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(SLOT_NAMES).map(([slotNumStr, slotName]) => {
              const slotNum = parseInt(slotNumStr);
              const equippedId = slotEquips[slotNum];
              const slotEquipOptions = equipsBySlot[slotNum] || [];
              const activeEq = slotEquipOptions.find(e => e.id === equippedId);
              const holes = activeEq?.hole_count ?? 0;

              return (
                <div key={slotNum} className="p-4 border border-border/80 bg-bg/20 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-brand uppercase tracking-wider">{slotName} slot</span>
                    <span className="text-[10px] font-mono text-muted">Holes: {holes}</span>
                  </div>

                  {/* Equip Selector */}
                  <select
                    value={equippedId || ''}
                    onChange={(e) => handleEquipChange(slotNum, parseInt(e.target.value))}
                    className="block w-full py-2 px-2.5 border border-border rounded-lg text-xs bg-surface focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer font-mono"
                  >
                    {slotEquipOptions.map(e => (
                      <option key={e.id} value={e.id}>{e.dress_profession || `Gear #${e.id}`}</option>
                    ))}
                  </select>

                  {/* Socketed Jades */}
                  {holes > 0 && (
                    <div className="space-y-2 pt-1 border-t border-border/50">
                      {[...Array(holes)].map((_, idx) => {
                        const jadeKey = `${slotNum}-${idx}`;
                        const currentJade = slotJades[jadeKey] || { typeId: 0, level: 1 };

                        return (
                          <div key={idx} className="flex gap-2 items-center">
                            <select
                              value={currentJade.typeId}
                              onChange={(e) => handleJadeChange(slotNum, idx, parseInt(e.target.value), currentJade.level)}
                              className="flex-1 py-1.5 px-2 border border-border/60 bg-surface text-[11px] rounded-md focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer font-mono"
                            >
                              <option value={0}>[Empty Socket]</option>
                              {JADE_TYPES.map(j => (
                                <option key={j.id} value={j.id}>{j.label}</option>
                              ))}
                            </select>
                            {currentJade.typeId > 0 && (
                              <select
                                value={currentJade.level}
                                onChange={(e) => handleJadeChange(slotNum, idx, currentJade.typeId, parseInt(e.target.value))}
                                className="w-16 py-1.5 px-1 border border-border/60 bg-surface text-[11px] rounded-md focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer font-mono text-center font-bold"
                              >
                                {[...Array(10)].map((_, lIdx) => (
                                  <option key={lIdx + 1} value={lIdx + 1}>Lv.{lIdx + 1}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Stats breakdowns & Jade Fusion HUD */}
        <div className="space-y-6">
          {/* BP Contribution Breakdown */}
          <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
            <h3 className="font-black text-text flex items-center gap-2 text-sm uppercase tracking-wider">
              <Shield size={16} className="text-emerald-500" />
              Projected Stats Matrix
            </h3>
            <div className="space-y-2.5">
              {[
                { label: 'STR', val: projectedTelemetry.breakdown.str, color: 'text-red-500', icon: Zap },
                { label: 'AGI', val: projectedTelemetry.breakdown.agi, color: 'text-emerald-500', icon: Shield },
                { label: 'INT', val: projectedTelemetry.breakdown.int, color: 'text-violet-500', icon: Heart },
                { label: 'HP', val: projectedTelemetry.breakdown.hp, color: 'text-blue-500', icon: Dices },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center p-3 border border-border bg-bg/30 rounded-xl">
                  <div className="flex items-center gap-2">
                    <item.icon size={14} className={item.color} />
                    <span className="text-xs font-bold text-muted uppercase">{item.label}</span>
                  </div>
                  <span className={`font-mono font-black text-sm ${item.color}`}>
                    {item.val.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Jade Fusion Optimizer Workbench */}
          <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
            <h3 className="font-black text-text flex items-center gap-2 text-sm uppercase tracking-wider">
              <Sparkles size={16} className="text-amber-500" />
              Jade Fusion Optimizer
            </h3>
            <p className="text-xs text-muted">Evaluate the mathematical trade-off of combining low-level Jades.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-subtle uppercase mb-1">Jade Type</label>
                <select
                  value={fusionSelectedType}
                  onChange={(e) => setFusionSelectedType(parseInt(e.target.value))}
                  className="block w-full py-1.5 px-2 border border-border bg-bg text-xs rounded-md focus:outline-none font-mono"
                >
                  {JADE_TYPES.map(j => (
                    <option key={j.id} value={j.id}>{j.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-subtle uppercase mb-1">Current Level</label>
                  <select
                    value={fusionInputLevel}
                    onChange={(e) => setFusionInputLevel(parseInt(e.target.value))}
                    className="block w-full py-1.5 px-2 border border-border bg-bg text-xs rounded-md focus:outline-none font-mono font-bold"
                  >
                    {[...Array(9)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>Lvl {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-subtle uppercase mb-1">Quantity Available</label>
                  <input
                    type="number"
                    min="1"
                    value={fusionInputQty}
                    onChange={(e) => setFusionInputQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="block w-full py-1.5 px-2 border border-border bg-bg text-xs rounded-md focus:outline-none font-mono text-center font-bold"
                  />
                </div>
              </div>

              {/* Simulation Comparison display */}
              <div className="p-3 bg-bg/50 border border-border rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Current Output (x{fusionInputQty}):</span>
                  <span className="font-mono font-bold text-text">+{fusionResults.currentTotalStat.toLocaleString()} {fusionResults.baseStatItem}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Fused Output (x{fusionResults.nextLvlCount} Lvl {fusionResults.fusedLevel} + x{fusionResults.remainder} Lvl {fusionInputLevel}):</span>
                  <span className="font-mono font-bold text-text">+{fusionResults.fusedTotalStat.toLocaleString()} {fusionResults.baseStatItem}</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-1.5 font-bold">
                  <span className="text-subtle">Spiritual Net Shift:</span>
                  <span className={`font-mono font-black ${fusionResults.delta >= 0 ? 'text-emerald-500' : 'text-danger'}`}>
                    {fusionResults.delta >= 0 ? `+${fusionResults.delta.toLocaleString()}` : `${fusionResults.delta.toLocaleString()}`} {fusionResults.baseStatItem}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
