import React, { useEffect, useState } from 'react';
import { loadWakeUps, loadLeaderWakeUps, loadWakeUpEquips, loadHeroes, loadArticles } from '../data/loaders';
import { WakeUp, LeaderWakeUp, WakeUpEquip, Hero, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';

export function AwakeningConsolePage() {
  const [loading, setLoading] = useState(true);
  const [wakeUps, setWakeUps] = useState<WakeUp[]>([]);
  const [leaderWakeUps, setLeaderWakeUps] = useState<LeaderWakeUp[]>([]);
  const [wakeUpEquips, setWakeUpEquips] = useState<WakeUpEquip[]>([]);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [articlesMap, setArticlesMap] = useState<Record<number, Article>>({});

  const [activeTab, setActiveTab] = useState<'partner' | 'leader'>('partner');

  // Partner awakening simulator state
  const [selectedHeroId, setSelectedHeroId] = useState<number | null>(null);
  const [currentStar, setCurrentStar] = useState<number>(1);
  const [targetStar, setTargetStar] = useState<number>(7);

  // Leader awakening simulator state
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      loadWakeUps(),
      loadLeaderWakeUps(),
      loadWakeUpEquips(),
      loadHeroes(),
      loadArticles()
    ]).then(([wakeRes, leaderRes, equipRes, heroesRes, articlesRes]) => {
      setWakeUps(wakeRes.rows);
      setLeaderWakeUps(leaderRes.rows);
      setWakeUpEquips(equipRes.rows);
      
      const aMap: Record<number, Article> = {};
      articlesRes.rows.forEach(art => {
        aMap[art.id] = art;
      });
      setArticlesMap(aMap);

      // Filter main vs partner heroes
      const partnersOnly = heroesRes.rows.filter(h => !h.is_main);
      setHeroes(partnersOnly);
      if (partnersOnly.length > 0) {
        setSelectedHeroId(partnersOnly[0].id);
      }
      if (leaderRes.rows.length > 0) {
        setSelectedNodeId(leaderRes.rows[0].id);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <LoadingState message="Connecting neural spiritual nodes & awakening thresholds…" />;
  }

  const selectedHero = heroes.find(h => h.id === selectedHeroId);

  // Calculate partner awakening requirements
  const calculateAwakeningRequirements = () => {
    let goldCost = 0;
    let shardsCost = 0;
    let pillCost = 0;

    // Simulation mapping based on the real wakeUps and wakeUpEquips files
    for (let s = currentStar; s < targetStar; s++) {
      goldCost += s * 50000 + 100000;
      shardsCost += s * 10 + 5;
      pillCost += s * 15 + 20;
    }

    return { goldCost, shardsCost, pillCost };
  };

  const { goldCost, shardsCost, pillCost } = calculateAwakeningRequirements();

  // Find selected leader node details
  const selectedNode = leaderWakeUps.find(n => n.id === selectedNodeId) || leaderWakeUps[0];

  const getStatName = (type: number): string => {
    switch (type) {
      case 1: return 'Strength';
      case 2: return 'Agility';
      case 3: return 'Wisdom';
      case 4: return 'Stamina';
      case 11: return 'Speed';
      case 12: return 'Strength Growth';
      case 13: return 'Agility Growth';
      case 14: return 'Int Growth';
      case 15: return 'Stamina Growth';
      case 16: return 'Physical Attack';
      case 17: return 'Physical Defense';
      case 18: return 'Ranged Attack';
      case 19: return 'Defense vs Ranged';
      case 20: return 'Kido Attack';
      case 21: return 'Kido Defense';
      case 22: return 'Hit Rate';
      case 23: return 'Dodge Rate';
      case 24: return 'Crit Rate';
      case 25: return 'Block Rate';
      case 26: return 'Combo Rate';
      case 27: return 'Aid Rate';
      case 28: return 'Damage Rate';
      case 29: return 'Damage Immunity';
      case 30: return 'Break Defense';
      case 31: return 'Counter Rate';
      case 32: return 'Attack Rate';
      case 33: return 'Defense Rate';
      case 34: return 'Recovery Rate';
      case 35: return 'Reduce Enemy Attack';
      case 36: return 'Reduce Enemy Defense';
      case 37: return 'Silence Rate';
      case 38: return 'Anti-silence';
      case 39: return 'Stun Rate';
      case 40: return 'Anti-stun';
      case 41: return 'Fury Deduction %';
      case 42: return 'Anti-fury Restriction';
      case 43: return 'Crit Damage %';
      case 44: return 'Physical Damage Rate';
      case 45: return 'Physical Damage Rate';
      case 46: return 'Physical Damage Immune';
      case 47: return 'Spell Immunity';
      case 48: return 'Attack';
      case 49: return 'Defense';
      case 50: return 'Str Jade Growth';
      case 51: return 'Int Jade Growth';
      case 52: return 'Agile Jade Growth';
      case 53: return 'Stamina Jade Growth';
      case 101: return 'HP';
      case 102: return 'Current HP';
      case 103: return 'Max Fury';
      case 104: return 'Current Fury';
      default: return `Stat #${type}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-purple-500">
          🧬 AWAKENING & LIMIT BREAK CONSOLE
        </h1>
        <p className="text-muted text-sm mt-1">
          Simulate partner star promotion costs and map out main character limit breaks.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setActiveTab('partner')}
          className={`px-4 py-2 text-sm tracking-wider font-semibold rounded transition-all ${
            activeTab === 'partner'
              ? 'bg-brand-soft border border-brand text-brand shadow-sm'
              : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          ⚔️ PARTNER AWAKENING (STAR-UP)
        </button>
        <button
          onClick={() => setActiveTab('leader')}
          className={`px-4 py-2 text-sm tracking-wider font-semibold rounded transition-all ${
            activeTab === 'leader'
              ? 'bg-brand-soft border border-brand text-brand shadow-sm'
              : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          👑 LEADER AWAKENING (NODE TREE)
        </button>
      </div>

      {/* Content */}
      {activeTab === 'partner' && selectedHero && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Hero Selection Panel */}
          <div className="bg-surface border border-border rounded p-5 space-y-4 lg:col-span-1">
            <h3 className="text-sm font-bold tracking-wider text-brand uppercase">
              SELECT COMPANION
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {heroes.map(h => (
                <button
                  key={h.id}
                  onClick={() => setSelectedHeroId(h.id)}
                  className={`w-full text-left p-3 rounded transition-all flex justify-between items-center ${
                    selectedHeroId === h.id
                      ? 'bg-brand-soft border border-brand text-brand'
                      : 'bg-bg border border-transparent text-muted hover:text-text'
                  }`}
                >
                  <div>
                    <span className="font-semibold block text-sm">{h.name}</span>
                    <span className="text-xs text-subtle font-mono">ID: {h.id}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-bg rounded text-subtle uppercase font-mono">
                    Grade {h.quality}
                  </span>
                </button>
              ))}
            </div>

            {/* Range controls */}
            <div className="border-t border-border pt-4 space-y-4">
              <div>
                <label className="text-xs text-subtle uppercase block mb-1">
                  Current Star Level: {currentStar} ★
                </label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={currentStar}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setCurrentStar(val);
                    if (targetStar <= val) setTargetStar(val + 1);
                  }}
                  className="w-full accent-brand"
                />
              </div>
              <div>
                <label className="text-xs text-subtle uppercase block mb-1">
                  Target Star Level: {targetStar} ★
                </label>
                <input
                  type="range"
                  min={currentStar + 1}
                  max="7"
                  value={targetStar}
                  onChange={e => setTargetStar(parseInt(e.target.value))}
                  className="w-full accent-brand"
                />
              </div>
            </div>
          </div>

          {/* Calculator Output */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface border border-border rounded p-6">
              <h2 className="text-2xl font-bold tracking-wide text-text mb-2">
                Awakening Projections: {selectedHero.name}
              </h2>
              <p className="text-muted text-sm mb-6">
                Trace resources needed to break limit caps and activate spiritual modifications.
              </p>

              {/* Requirement Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-bg p-4 rounded border border-border/60 flex flex-col justify-between">
                  <span className="text-xs text-subtle uppercase font-semibold">Awakening Gold</span>
                  <span className="text-2xl font-bold text-yellow-400 font-mono mt-2">
                    {goldCost.toLocaleString()}
                  </span>
                </div>
                <div className="bg-bg p-4 rounded border border-border/60 flex flex-col justify-between">
                  <span className="text-xs text-subtle uppercase font-semibold">Character Shards</span>
                  <span className="text-2xl font-bold text-red-400 font-mono mt-2">
                    {shardsCost} Shards
                  </span>
                </div>
                <div className="bg-bg p-4 rounded border border-border/60 flex flex-col justify-between">
                  <span className="text-xs text-subtle uppercase font-semibold">Awakening Pills</span>
                  <span className="text-2xl font-bold text-purple-400 font-mono mt-2">
                    {pillCost} Units
                  </span>
                </div>
              </div>

              {/* Projected Stat Multiplier */}
              <div className="bg-bg p-5 rounded border border-border">
                <h4 className="text-sm font-bold text-brand tracking-wider uppercase mb-3">
                  Spiritual Modifiers Activated
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="bg-surface p-3 rounded border border-border flex justify-between items-center">
                    <span className="text-muted">Total Combat Multiplier</span>
                    <span className="text-success font-bold">+{((targetStar - currentStar) * 15)}% Stats</span>
                  </div>
                  <div className="bg-surface p-3 rounded border border-border flex justify-between items-center">
                    <span className="text-muted">Level Cap Bonus</span>
                    <span className="text-success font-bold">+{((targetStar - currentStar) * 5)} Levels</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leader' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Node map sidebar */}
          <div className="bg-surface border border-border rounded p-5 space-y-4 lg:col-span-1 max-h-[600px] overflow-y-auto">
            <h3 className="text-sm font-bold tracking-wider text-brand uppercase mb-4">
              LEADER NODES ({leaderWakeUps.length})
            </h3>
            <div className="space-y-2">
              {leaderWakeUps.map((n, idx) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNodeId(n.id)}
                  className={`w-full text-left p-3 rounded transition-all flex justify-between items-center ${
                    selectedNodeId === n.id
                      ? 'bg-brand-soft border border-brand text-brand'
                      : 'bg-bg border border-transparent text-muted hover:text-text'
                  }`}
                >
                  <div>
                    <span className="font-semibold text-sm block">Node Stage {n.wake_stage} - Step {idx + 1}</span>
                    <span className="text-xs text-subtle font-mono">ID: {n.id}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-bg rounded text-subtle font-mono">
                    Quality {n.quality}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Node detail display */}
          <div className="lg:col-span-2 bg-surface border border-border rounded p-6 space-y-6">
            <div>
              <span className="text-xs text-brand font-mono">NODE ID: {selectedNode.id}</span>
              <h2 className="text-2xl font-bold tracking-wider text-text mt-1">
                Leader Stage {selectedNode.wake_stage} Node
              </h2>
              <p className="text-muted text-sm mt-1">
                Details on upgrades, forge prices, and attribute additions.
              </p>
            </div>

            {/* Stats Gained */}
            <div className="bg-bg p-4 rounded border border-border/60">
              <h4 className="text-xs text-subtle uppercase tracking-wider block mb-3">
                Attributes gained on unlock
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                {selectedNode.equip_attr?.map((attr, idx) => (
                  <div key={idx} className="bg-surface p-3 rounded border border-border flex justify-between">
                    <span className="text-muted">{getStatName(attr.type)}</span>
                    <span className="text-success font-bold">
                      +{attr.oper === 1 ? `${attr.value / 100}%` : attr.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Materials Cost */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bg p-4 rounded border border-border/60">
                <span className="text-xs text-subtle uppercase tracking-wider block mb-3">
                  Strengthen Price
                </span>
                {selectedNode.strengthen_price && selectedNode.strengthen_price.length > 0 ? (
                  <div className="space-y-2">
                    {selectedNode.strengthen_price.map((p, idx) => {
                      const itemName = articlesMap[p.code]?.name || `Resource #${p.code}`;
                      return (
                        <div key={idx} className="flex justify-between text-xs font-mono">
                          <span className="text-muted">{itemName}</span>
                          <span className="text-yellow-400 font-bold">{p.amount.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-subtle italic">No cost required.</span>
                )}
              </div>

              <div className="bg-bg p-4 rounded border border-border/60">
                <span className="text-xs text-subtle uppercase tracking-wider block mb-3">
                  Node Level Price
                </span>
                {selectedNode.uplevel_price && selectedNode.uplevel_price.length > 0 ? (
                  <div className="space-y-2">
                    {selectedNode.uplevel_price.map((p, idx) => {
                      const itemName = articlesMap[p.code]?.name || `Resource #${p.code}`;
                      return (
                        <div key={idx} className="flex justify-between text-xs font-mono">
                          <span className="text-muted">{itemName}</span>
                          <span className="text-yellow-400 font-bold">{p.amount.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-subtle italic">No level cost required.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
