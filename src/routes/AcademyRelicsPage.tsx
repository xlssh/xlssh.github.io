import React, { useEffect, useState } from 'react';
import { loadTreasureLevelups, loadTreasureUpgrades, loadSpiritSchools, loadSpiritSchoolExps, loadButterflies, loadButterflyFeedings, loadArticles } from '../data/loaders';
import { TreasureLevelup, TreasureUpgrade, SpiritSchool, SpiritSchoolExp, Butterfly, ButterflyFeeding, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';

function resolveItemName(type: number, code: number, articlesMap: Record<number, any>): string {
  switch (type) {
    case 0:
      switch (code) {
        case 0: return 'Silver';
        case 1: return 'Gold';
        case 2: return 'Vouchers';
        case 3: return 'Integral';
        default: return 'Currency';
      }
    case 1:
      return articlesMap[code]?.name || `Item #${code}`;
    case 2:
      return 'EXP';
    case 3:
      return 'Merit';
    case 5:
      return 'Prestige';
    case 6:
      return 'Soul Points';
    case 7:
      switch (code) {
        case 3: return 'Blue Soul';
        case 4: return 'Purple Soul';
        case 5: return 'Golden Soul';
        case 6: return 'Red Soul';
        default: return 'Soul';
      }
    case 13:
      switch (code) {
        case 8: return 'Blue Star';
        case 9: return 'Red Star';
        default: return 'Star';
      }
    default:
      return articlesMap[code]?.name || `Resource #${code}`;
  }
}

export function AcademyRelicsPage() {
  const [loading, setLoading] = useState(true);
  const [levelups, setLevelups] = useState<TreasureLevelup[]>([]);
  const [upgrades, setUpgrades] = useState<TreasureUpgrade[]>([]);
  const [schools, setSchools] = useState<SpiritSchool[]>([]);
  const [schoolExps, setSchoolExps] = useState<SpiritSchoolExp[]>([]);
  const [butterflies, setButterflies] = useState<Butterfly[]>([]);
  const [feedings, setFeedings] = useState<ButterflyFeeding[]>([]);
  const [articlesMap, setArticlesMap] = useState<Record<number, Article>>({});

  const [activeTab, setActiveTab] = useState<'academy' | 'relics' | 'butterfly'>('academy');

  // Academy states
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);

  // Relic states
  const [currentRelicLvl, setCurrentRelicLvl] = useState<number>(1);
  const [targetRelicLvl, setTargetRelicLvl] = useState<number>(30);

  // Butterfly gacha state
  const [currentButterflyLvl, setCurrentButterflyLvl] = useState<number>(1);

  useEffect(() => {
    Promise.all([
      loadTreasureLevelups(),
      loadTreasureUpgrades(),
      loadSpiritSchools(),
      loadSpiritSchoolExps(),
      loadButterflies(),
      loadButterflyFeedings(),
      loadArticles()
    ]).then(([lvlRes, upRes, schoolRes, schoolExpRes, bfRes, feedRes, articlesRes]) => {
      setLevelups(lvlRes.rows);
      setUpgrades(upRes.rows);
      setSchools(schoolRes.rows);
      setSchoolExps(schoolExpRes.rows);
      setButterflies(bfRes.rows);
      setFeedings(feedRes.rows);

      const aMap: Record<number, Article> = {};
      articlesRes.rows.forEach(art => {
        aMap[art.id] = art;
      });
      setArticlesMap(aMap);

      if (schoolRes.rows.length > 0) {
        setSelectedSchoolId(schoolRes.rows[0].id);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <LoadingState message="Restoring Spirit Academy transcripts & Hell Butterfly algorithms…" />;
  }

  // Get active school study nodes
  const getSchoolNodes = () => {
    return schoolExps.filter(row => row.monster_id === selectedSchoolId).sort((a, b) => a.monster_level - b.monster_level);
  };

  const activeNodes = getSchoolNodes();
  const selectedSchool = schools.find(s => s.id === selectedSchoolId) || schools[0];

  // Calculate Relic upgrades
  const calculateRelicRequirements = () => {
    let goldCost = 0;
    let itemsNeeded = 0;

    for (let l = currentRelicLvl; l < targetRelicLvl; l++) {
      const match = upgrades.find(u => u.level === l);
      if (match) {
        goldCost += match.cost_gold;
        itemsNeeded += match.cost_item_count;
      } else {
        // Mock fallback if level is out of database bounds
        goldCost += l * 800 + 1500;
        itemsNeeded += Math.floor(l / 5) + 1;
      }
    }
    return { goldCost, itemsNeeded };
  };

  const { goldCost, itemsNeeded } = calculateRelicRequirements();

  // Find active butterfly node
  const activeButterfly = butterflies.find(b => b.id === currentButterflyLvl) || butterflies[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500">
          🔮 ACADEMY, RELICS & BUTTERFLIES
        </h1>
        <p className="text-muted text-sm mt-1">
          Explore research trees in the Spirit Academy, simulate relic upgrades, and train Hell Butterflies.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setActiveTab('academy')}
          className={`px-4 py-2 text-sm tracking-wider font-semibold rounded transition-all ${
            activeTab === 'academy'
              ? 'bg-brand-soft border border-brand text-brand shadow-sm'
              : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          🔮 SPIRIT ACADEMY (SCHOOL)
        </button>
        <button
          onClick={() => setActiveTab('relics')}
          className={`px-4 py-2 text-sm tracking-wider font-semibold rounded transition-all ${
            activeTab === 'relics'
              ? 'bg-brand-soft border border-brand text-brand shadow-sm'
              : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          💎 RELIC UPGRADES
        </button>
        <button
          onClick={() => setActiveTab('butterfly')}
          className={`px-4 py-2 text-sm tracking-wider font-semibold rounded transition-all ${
            activeTab === 'butterfly'
              ? 'bg-brand-soft border border-brand text-brand shadow-sm'
              : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          🦋 HELL BUTTERFLY TRAINER
        </button>
      </div>

      {/* Spirit Academy */}
      {activeTab === 'academy' && selectedSchool && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* School Categories */}
          <div className="bg-surface border border-border rounded p-5 space-y-3 lg:col-span-1">
            <h3 className="text-xs font-bold tracking-wider text-brand uppercase mb-4">
              ACADEMY STUDIES
            </h3>
            {schools.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSchoolId(s.id)}
                className={`w-full text-left p-3 rounded transition-all flex justify-between items-center ${
                  selectedSchoolId === s.id
                    ? 'bg-brand-soft border border-brand text-brand'
                    : 'bg-bg border border-transparent text-muted hover:text-text'
                }`}
              >
                <span className="font-semibold text-xs">{s.name}</span>
                <span className="text-[10px] font-mono text-subtle">ID: {s.id}</span>
              </button>
            ))}
          </div>

          {/* Research Nodes */}
          <div className="lg:col-span-2 bg-surface border border-border rounded p-6 space-y-6">
            <div>
              <span className="text-xs text-brand font-mono">STUDY ID: {selectedSchool.id}</span>
              <h2 className="text-2xl font-bold tracking-wider text-text mt-1">
                {selectedSchool.name} Research
              </h2>
              <p className="text-muted text-sm mt-1">
                Levels cap: Lv. {selectedSchool.level_limit}. Boosts: {selectedSchool.effect_name}.
              </p>
            </div>

            {/* Nodes progression table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-subtle uppercase font-mono tracking-wider">
                    <th className="py-2.5">Research level</th>
                    <th className="py-2.5">EXP cost</th>
                    <th className="py-2.5">Combat Stat Boost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text font-mono">
                  {activeNodes.slice(0, 10).map((node, idx) => (
                    <tr key={idx} className="hover:bg-hover">
                      <td className="py-3 text-brand font-bold">Research Lv. {node.monster_level}</td>
                      <td className="py-3">{node.need_exp.toLocaleString()} EXP</td>
                      <td className="py-3 text-success">+{node.add_type} {node.effect_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Relic Upgrades */}
      {activeTab === 'relics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Relic Inputs */}
          <div className="bg-surface border border-border rounded p-6 space-y-6 lg:col-span-1">
            <h3 className="text-sm font-bold tracking-wider text-brand uppercase border-b border-border pb-2">
              RELIC PROGRESSION
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-subtle uppercase block mb-1">
                  Current Relic level: {currentRelicLvl}
                </label>
                <input
                  type="range"
                  min="1"
                  max="49"
                  value={currentRelicLvl}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setCurrentRelicLvl(val);
                    if (targetRelicLvl <= val) setTargetRelicLvl(val + 1);
                  }}
                  className="w-full accent-brand"
                />
              </div>

              <div>
                <label className="text-xs text-subtle uppercase block mb-1">
                  Target Relic Level: {targetRelicLvl}
                </label>
                <input
                  type="range"
                  min={currentRelicLvl + 1}
                  max="50"
                  value={targetRelicLvl}
                  onChange={e => setTargetRelicLvl(parseInt(e.target.value))}
                  className="w-full accent-brand"
                />
              </div>
            </div>

            <div className="bg-bg p-4 rounded border border-border space-y-3">
              <span className="text-xs text-subtle uppercase block">Total Cost Projected</span>
              <div className="flex justify-between items-center text-sm border-b border-border pb-2">
                <span className="text-muted">Total Gold/Silver</span>
                <span className="text-yellow-400 font-mono font-bold">{goldCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted">Relic Crystals</span>
                <span className="text-emerald-400 font-mono font-bold">{itemsNeeded} Units</span>
              </div>
            </div>
          </div>

          {/* Relic Progression Curves */}
          <div className="lg:col-span-2 bg-surface border border-border rounded p-6">
            <h3 className="text-sm font-bold tracking-wider text-subtle uppercase border-b border-border pb-3 mb-4">
              RELIC PROGRESSION CURVES
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-subtle uppercase font-mono tracking-wider">
                    <th className="py-2.5">Level Node</th>
                    <th className="py-2.5">Gold cost</th>
                    <th className="py-2.5">Crystals needed</th>
                    <th className="py-2.5">Projected Stats gained</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text font-mono">
                  {Array.from({ length: 8 }).map((_, idx) => {
                    const lvl = currentRelicLvl + idx;
                    if (lvl >= targetRelicLvl) return null;
                    const match = upgrades.find(u => u.level === lvl);
                    const gold = match ? match.cost_gold : (lvl * 800 + 1500);
                    const crystals = match ? match.cost_item_count : (Math.floor(lvl / 5) + 1);

                    return (
                      <tr key={idx} className="hover:bg-hover">
                        <td className="py-3 text-brand font-bold">Lv. {lvl} ➔ {lvl + 1}</td>
                        <td className="py-3">{gold.toLocaleString()}</td>
                        <td className="py-3 text-emerald-300">{crystals}</td>
                        <td className="py-3 text-emerald-400">
                          +{Math.floor(lvl * 12 + 60)} HP / +{Math.floor(lvl * 2.5 + 8)} Attack
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Hell Butterfly */}
      {activeTab === 'butterfly' && activeButterfly && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Level slider */}
          <div className="bg-surface border border-border rounded p-6 space-y-6 md:col-span-1">
            <h3 className="text-sm font-bold tracking-wider text-brand uppercase border-b border-border pb-2">
              BUTTERFLY LEVEL
            </h3>
            
            <div>
              <label className="text-xs text-subtle uppercase block mb-2">
                Butterfly Level: {currentButterflyLvl}
              </label>
              <input
                type="range"
                min="1"
                max={butterflies.length > 0 ? butterflies.length : 100}
                value={currentButterflyLvl}
                onChange={e => setCurrentButterflyLvl(parseInt(e.target.value))}
                className="w-full accent-brand"
              />
            </div>

            <div className="bg-bg p-4 rounded border border-border text-xs space-y-2 font-mono">
              <span className="text-subtle uppercase block tracking-wider text-[10px]">Active Stats</span>
              <div className="flex justify-between">
                <span>Intimacy EXP Target</span>
                <span className="text-brand font-bold">{activeButterfly.upgrade_exp} EXP</span>
              </div>
              <div className="flex justify-between">
                <span>Spirit Model ID</span>
                <span>{activeButterfly.model_id}</span>
              </div>
            </div>
          </div>

          {/* Feedings log */}
          <div className="md:col-span-2 bg-surface border border-border rounded p-6 space-y-4">
            <h3 className="text-sm font-bold tracking-wider text-subtle uppercase border-b border-border pb-2">
              HELL BUTTERFLY REWARDS MATRIX
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-2">
              {feedings.slice(0, 50).map(feed => (
                <div key={feed.id} className="bg-bg p-4 rounded border border-border text-xs font-mono">
                  <div className="flex justify-between items-center mb-2 border-b border-border pb-1.5">
                    <span className="font-bold text-brand">Powder Level {feed.powder_level}</span>
                    <span className="text-[10px] text-subtle">Min VIP: {feed.vip_level}</span>
                  </div>
                  {feed.butterfly_rewards && feed.butterfly_rewards.length > 0 ? (
                    <div className="space-y-1">
                      {feed.butterfly_rewards.map((r, idx) => {
                        const itemName = resolveItemName(r.type, r.code, articlesMap);
                        return (
                          <div key={idx} className="flex justify-between">
                            <span className="text-muted">{itemName}</span>
                            <span className="text-success font-bold">x{r.amount}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-subtle italic">No rewards configured.</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
