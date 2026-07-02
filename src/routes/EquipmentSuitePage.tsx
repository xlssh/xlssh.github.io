import React, { useEffect, useState } from 'react';
import { loadBaseEquips, loadSuits, loadEquipUpgrades, loadEquipAdditionals, loadArticles } from '../data/loaders';
import { BaseEquip, Suit, EquipUpgrade, EquipAdditional, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';

export function EquipmentSuitePage() {
  const [loading, setLoading] = useState(true);
  const [baseEquips, setBaseEquips] = useState<BaseEquip[]>([]);
  const [suits, setSuits] = useState<Suit[]>([]);
  const [upgrades, setUpgrades] = useState<EquipUpgrade[]>([]);
  const [additionals, setAdditionals] = useState<EquipAdditional[]>([]);
  const [articlesMap, setArticlesMap] = useState<Record<number, Article>>({});
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'suits' | 'upgrades'>('catalog');
  
  // Catalog states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  
  // Suit states
  const [selectedSuitId, setSelectedSuitId] = useState<number | null>(null);
  const [equippedSuitPieces, setEquippedSuitPieces] = useState<number>(2);

  // Upgrade planner states
  const [currentUpgradeLvl, setCurrentUpgradeLvl] = useState<number>(1);
  const [targetUpgradeLvl, setTargetUpgradeLvl] = useState<number>(20);

  useEffect(() => {
    Promise.all([
      loadBaseEquips(),
      loadSuits(),
      loadEquipUpgrades(),
      loadEquipAdditionals(),
      loadArticles()
    ]).then(([equipsRes, suitsRes, upgradesRes, additionalsRes, articlesRes]) => {
      setBaseEquips(equipsRes.rows);
      setSuits(suitsRes.rows);
      setUpgrades(upgradesRes.rows);
      setAdditionals(additionalsRes.rows);
      
      const aMap: Record<number, Article> = {};
      articlesRes.rows.forEach(art => {
        aMap[art.id] = art;
      });
      setArticlesMap(aMap);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <LoadingState message="Decoding high-frequency weapon and suit matrix…" />;
  }

  // Helper to resolve name and quality
  const getEquipDetails = (equipId: number) => {
    const art = articlesMap[equipId];
    return {
      name: art?.name || `Spiritual Armament #${equipId}`,
      quality: art?.quality || 1,
      level: art?.level || 1,
      desc: art?.function_desc || "No signature details found."
    };
  };

  const getQualityColor = (quality: number) => {
    switch (quality) {
      case 1: return 'text-muted border-border';
      case 2: return 'text-success border-success';
      case 3: return 'text-blue-400 border-blue-600'; // No semantic equivalent
      case 4: return 'text-purple-400 border-purple-600'; // No semantic equivalent
      case 5: return 'text-warning border-warning';
      case 6: return 'text-danger border-danger';
      default: return 'text-yellow-400 border-yellow-600'; // No semantic equivalent
    }
  };

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

  // Filter Catalog
  const filteredEquips = baseEquips.filter(eq => {
    const details = getEquipDetails(eq.id);
    const matchesSearch = details.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          eq.dress_profession.includes(searchQuery);
    const matchesQuality = selectedQuality === 'all' || details.quality.toString() === selectedQuality;
    return matchesSearch && matchesQuality;
  });

  // Selected Suit Details
  const selectedSuit = suits.find(s => s.id === selectedSuitId) || suits[0];

  // Calculate Upgrade Costs
  const calculateUpgradeCosts = () => {
    let goldCost = 0;
    let stoneCost = 0;
    
    // Simulating leveling progression
    for (let l = currentUpgradeLvl; l < targetUpgradeLvl; l++) {
      // Scale costs based on level
      goldCost += Math.floor(Math.pow(l, 1.8) * 120 + 200);
      stoneCost += Math.floor(l * 1.5 + 1);
    }
    return { goldCost, stoneCost };
  };

  const { goldCost, stoneCost } = calculateUpgradeCosts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-500">
          ⚔️ ARMORY CONSOLE & SUIT SIMULATOR
        </h1>
        <p className="text-muted text-sm mt-1">
          Datamined armaments catalogs, 2/4/6-piece suit set bonuses, and forge scale projections.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 text-sm tracking-wider font-semibold rounded transition-all ${
            activeTab === 'catalog'
              ? 'bg-brand-soft border border-brand text-brand shadow-sm'
              : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          GEAR CATALOG
        </button>
        <button
          onClick={() => {
            setActiveTab('suits');
            if (suits.length > 0 && !selectedSuitId) setSelectedSuitId(suits[0].id);
          }}
          className={`px-4 py-2 text-sm tracking-wider font-semibold rounded transition-all ${
            activeTab === 'suits'
              ? 'bg-brand-soft border border-brand text-brand shadow-sm'
              : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          SUIT SET SIMULATOR
        </button>
        <button
          onClick={() => setActiveTab('upgrades')}
          className={`px-4 py-2 text-sm tracking-wider font-semibold rounded transition-all ${
            activeTab === 'upgrades'
              ? 'bg-brand-soft border border-brand text-brand shadow-sm'
              : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          FORGE COST TRACKER
        </button>
      </div>

      {/* Content */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-4 bg-surface p-4 rounded border border-border">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search weapons, armors, or professions..."
                className="w-full bg-bg border border-border rounded px-4 py-2 text-text focus:outline-none focus:border-brand"
              />
            </div>
            <div className="w-full md:w-48">
              <select
                value={selectedQuality}
                onChange={e => setSelectedQuality(e.target.value)}
                className="w-full bg-bg border border-border rounded px-4 py-2 text-text focus:outline-none focus:border-brand"
              >
                <option value="all">All Rarities</option>
                <option value="1">Common (White)</option>
                <option value="2">Uncommon (Green)</option>
                <option value="3">Rare (Blue)</option>
                <option value="4">Epic (Purple)</option>
                <option value="5">Legendary (Orange)</option>
                <option value="6">Mythic (Red)</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEquips.slice(0, 150).map(eq => {
              const details = getEquipDetails(eq.id);
              const qualityClass = getQualityColor(details.quality);

              return (
                <div
                  key={eq.id}
                  className="bg-surface border border-border rounded p-5 hover:border-brand-soft transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs text-subtle font-mono">ID: {eq.id}</span>
                        <h3 className={`text-lg font-bold tracking-wide ${qualityClass.split(' ')[0]}`}>
                          {details.name}
                        </h3>
                      </div>
                      <span className={`text-xs px-2.5 py-1 border rounded-full font-mono uppercase ${qualityClass}`}>
                        Rarity {details.quality}
                      </span>
                    </div>

                    <p className="text-muted text-sm mb-4 line-clamp-2">
                      {details.desc}
                    </p>

                    {/* Stats List */}
                    <div className="space-y-2 mb-4 bg-bg p-3 rounded border border-border/40">
                      <div className="flex justify-between text-xs border-b border-border pb-1">
                        <span className="text-subtle">Upgrade Slots</span>
                        <span className="text-brand font-mono">{eq.hole_count} Jades</span>
                      </div>
                      <div className="flex justify-between text-xs border-b border-border pb-1">
                        <span className="text-subtle">Profession Lock</span>
                        <span className="text-text uppercase font-mono">{eq.dress_profession || 'Any'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-subtle">Required Level</span>
                        <span className="text-text font-mono">Lv. {details.level}</span>
                      </div>
                    </div>
                  </div>

                  {/* Armament Stats */}
                  <div className="mt-2 border-t border-border/60 pt-3">
                    <span className="text-xs text-brand/70 font-semibold block mb-2 tracking-wider">
                      PRIMARY ATTRIBUTES
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {eq.main_type.map((type, idx) => (
                        <div key={idx} className="bg-bg px-2 py-1 rounded flex justify-between">
                          <span className="text-muted">{getStatName(type)}</span>
                          <span className="text-success font-mono">+{eq.main_value[idx]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'suits' && selectedSuit && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Suit List */}
          <div className="bg-surface border border-border rounded p-5 space-y-3 lg:col-span-1 max-h-[600px] overflow-y-auto">
            <h3 className="text-sm font-bold tracking-wider text-brand mb-4 uppercase">
              SUIT COLLECTIONS ({suits.length})
            </h3>
            {suits.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSuitId(s.id)}
                className={`w-full text-left p-3 rounded transition-all flex justify-between items-center ${
                  selectedSuitId === s.id
                    ? 'bg-brand-soft border border-brand text-brand'
                    : 'bg-bg border border-transparent text-muted hover:text-text'
                }`}
              >
                <span className="font-semibold text-sm">{s.name}</span>
                <span className="text-xs font-mono text-subtle">ID: {s.id}</span>
              </button>
            ))}
          </div>

          {/* Suit Simulator Panel */}
          <div className="lg:col-span-2 bg-surface border border-border rounded p-6 space-y-6">
            <div>
              <span className="text-xs text-brand font-mono">SUIT ID: {selectedSuit.id}</span>
              <h2 className="text-2xl font-bold tracking-wider text-text mt-1">
                {selectedSuit.name} Set
              </h2>
              <p className="text-muted text-sm mt-1">
                Calculate total spiritual additions when equipping pieces of this set.
              </p>
            </div>

            {/* Simulated Equip State */}
            <div className="bg-bg p-4 rounded border border-border flex items-center justify-between">
              <div>
                <span className="text-xs text-subtle uppercase tracking-wider block">
                  Simulated Equipped Pieces
                </span>
                <span className="text-lg font-bold text-brand font-mono">
                  {equippedSuitPieces} / {selectedSuit.max_count} Pieces Active
                </span>
              </div>
              <div className="flex space-x-2">
                {[2, 4, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => setEquippedSuitPieces(num)}
                    className={`px-3 py-1.5 rounded font-mono text-xs font-bold transition-all ${
                      equippedSuitPieces === num
                        ? 'bg-brand text-white'
                        : 'bg-surface border border-border text-muted hover:text-text'
                    }`}
                  >
                    {num} Pcs
                  </button>
                ))}
              </div>
            </div>

            {/* Suit Set Passive Skills */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-muted tracking-wider uppercase border-b border-border pb-2">
                SET BONUSES BREAKDOWN
              </h4>
              
              {/* Parse and render 2, 4, 6 items */}
              {['2', '4', '6'].map(pcs => {
                const isActivated = equippedSuitPieces >= parseInt(pcs);
                const list = selectedSuit.effects?.[pcs] || [];
                
                return (
                  <div
                    key={pcs}
                    className={`p-4 rounded border transition-all ${
                      isActivated 
                        ? 'bg-success/5 border-success/30' 
                        : 'bg-bg/40 border-border opacity-50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-sm font-bold uppercase tracking-wider ${isActivated ? 'text-success' : 'text-muted'}`}>
                        {pcs}-Piece Bonus
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                        isActivated ? 'bg-success/20 text-success' : 'bg-surface text-subtle'
                      }`}>
                        {isActivated ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {list.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        {list.map((effStr: string, idx: number) => {
                          const parts = effStr.split('_');
                          const type = parseInt(parts[0]);
                          const val = parseFloat(parts[1]);
                          const oper = parseInt(parts[2]);
                          const isPercent = (type >= 22 && type <= 47) || (type >= 50 && type <= 53) || oper === 1;
                          return (
                            <div key={idx} className="bg-bg/60 px-3 py-2 rounded text-xs flex justify-between">
                              <span className="text-muted">{getStatName(type)}</span>
                              <span className="text-success font-mono">
                                +{isPercent ? `${(val * 100).toFixed(0)}%` : val}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-subtle italic">No set attributes defined for this tier.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'upgrades' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calculator Input Panel */}
          <div className="bg-surface border border-border rounded p-6 space-y-6 lg:col-span-1">
            <h3 className="text-sm font-bold tracking-wider text-brand uppercase border-b border-border pb-2">
              FORGE TARGET METRIC
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-subtle uppercase tracking-wider block mb-2">
                  Current Forge level: {currentUpgradeLvl}
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={currentUpgradeLvl}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setCurrentUpgradeLvl(val);
                    if (targetUpgradeLvl <= val) setTargetUpgradeLvl(val + 1);
                  }}
                  className="w-full accent-brand"
                />
              </div>

              <div>
                <label className="text-xs text-subtle uppercase tracking-wider block mb-2">
                  Target Forge Level: {targetUpgradeLvl}
                </label>
                <input
                  type="range"
                  min={currentUpgradeLvl + 1}
                  max="120"
                  value={targetUpgradeLvl}
                  onChange={e => setTargetUpgradeLvl(parseInt(e.target.value))}
                  className="w-full accent-brand"
                />
              </div>
            </div>

            <div className="bg-bg p-4 rounded border border-border/60 space-y-3">
              <span className="text-xs text-subtle uppercase block">Total Cost Projected</span>
              <div className="flex justify-between items-center text-sm border-b border-border pb-2">
                <span className="text-muted">Total Silver/Gold</span>
                <span className="text-yellow-400 font-mono font-bold">{goldCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted">Forge Crystals</span>
                <span className="text-orange-400 font-mono font-bold">{stoneCost} Units</span>
              </div>
            </div>
          </div>

          {/* Progression Table */}
          <div className="lg:col-span-2 bg-surface border border-border rounded p-6">
            <h3 className="text-sm font-bold tracking-wider text-muted uppercase border-b border-border pb-3 mb-4">
              UPGRADE SCALING CURVES
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-subtle uppercase font-mono tracking-wider">
                    <th className="py-2.5">Level Node</th>
                    <th className="py-2.5">Silver cost (Approx)</th>
                    <th className="py-2.5">Crystals needed</th>
                    <th className="py-2.5">Incremental Stats (Att/Def)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text font-mono">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const lvl = currentUpgradeLvl + idx;
                    if (lvl >= targetUpgradeLvl) return null;
                    const nextGold = Math.floor(Math.pow(lvl, 1.8) * 120 + 200);
                    const nextStone = Math.floor(lvl * 1.5 + 1);

                    return (
                      <tr key={idx} className="hover:bg-hover">
                        <td className="py-3 text-brand font-bold">Lv. {lvl} ➔ {lvl + 1}</td>
                        <td className="py-3">{nextGold.toLocaleString()}</td>
                        <td className="py-3 text-orange-300">{nextStone}</td>
                        <td className="py-3 text-success">+{Math.floor(lvl * 4.5 + 10)} Att / +{Math.floor(lvl * 1.8 + 4)} Def</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
