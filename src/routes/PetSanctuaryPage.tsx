import React, { useEffect, useState } from 'react';
import { loadPetLevelUps, loadVicePetMakes, loadVicePetRankUps, loadVicePetTrains, loadMainPetRankUps, loadArticles } from '../data/loaders';
import { PetLevelUp, VicePetMake, VicePetRankUp, VicePetTrain, MainPetRankUp, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';

export function PetSanctuaryPage() {
  const [loading, setLoading] = useState(true);
  const [levelUps, setLevelUps] = useState<PetLevelUp[]>([]);
  const [viceMakes, setViceMakes] = useState<VicePetMake[]>([]);
  const [viceRankUps, setViceRankUps] = useState<VicePetRankUp[]>([]);
  const [viceTrains, setViceTrains] = useState<VicePetTrain[]>([]);
  const [mainRankUps, setMainRankUps] = useState<MainPetRankUp[]>([]);
  const [articlesMap, setArticlesMap] = useState<Record<number, Article>>({});

  const [activeTab, setActiveTab] = useState<'roster' | 'level' | 'craft'>('roster');

  // Unique list of pets
  const [uniquePets, setUniquePets] = useState<{ id: number; name: string; quality: number }[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  // Level planner states
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [targetLevel, setTargetLevel] = useState<number>(50);

  useEffect(() => {
    Promise.all([
      loadPetLevelUps(),
      loadVicePetMakes(),
      loadVicePetRankUps(),
      loadVicePetTrains(),
      loadMainPetRankUps(),
      loadArticles()
    ]).then(([lvlRes, makeRes, rankRes, trainRes, mainRankRes, articlesRes]) => {
      setLevelUps(lvlRes.rows);
      setViceMakes(makeRes.rows);
      setViceRankUps(rankRes.rows);
      setViceTrains(trainRes.rows);
      setMainRankUps(mainRankRes.rows);

      const aMap: Record<number, Article> = {};
      articlesRes.rows.forEach(art => {
        aMap[art.id] = art;
      });
      setArticlesMap(aMap);

      // Extract unique list of pets by name and base pet ID
      const map: Record<number, { id: number; name: string; quality: number }> = {};
      lvlRes.rows.forEach(row => {
        if (!map[row.pet_id] || row.level < map[row.pet_id].id) {
          map[row.pet_id] = { id: row.pet_id, name: row.name, quality: row.quality };
        }
      });
      const list = Object.values(map);
      setUniquePets(list);
      if (list.length > 0) {
        setSelectedPetId(list[0].id);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <LoadingState message="Summoning combat beasts & mapping growth matrices…" />;
  }

  // Get details for currently selected pet
  const getSelectedPetRows = () => {
    return levelUps.filter(row => row.pet_id === selectedPetId).sort((a, b) => a.level - b.level);
  };

  const selectedRows = getSelectedPetRows();
  const selectedBasePet = uniquePets.find(p => p.id === selectedPetId) || uniquePets[0];
  
  // Calculate stats at level
  const getPetStatsAtLevel = (level: number) => {
    const matchedRow = selectedRows.find(r => r.level === level) || selectedRows[selectedRows.length - 1];
    return matchedRow ? matchedRow.attributes : [];
  };

  // Calculate leveling EXP and Silver required
  const calculateLevelingRequirements = () => {
    let silver = 0;
    let expRequired = 0;

    for (let l = currentLevel; l < targetLevel; l++) {
      // Find row for pet at specific level to get EXP requirement
      const matched = selectedRows.find(r => r.level === l);
      if (matched) {
        expRequired += matched.need_exp;
        silver += Math.floor(matched.need_exp * 0.4 + 100);
      } else {
        // Mock fallback if no exact database match
        expRequired += l * 80 + 200;
        silver += Math.floor((l * 80 + 200) * 0.4 + 100);
      }
    }
    return { silver, expRequired };
  };

  const { silver, expRequired } = calculateLevelingRequirements();

  const getStatName = (index: number) => {
    switch (index) {
      case 0: return 'Physical Attack';
      case 1: return 'Kido Attack';
      case 2: return 'Physical Defense';
      case 3: return 'Kido Defense';
      case 4: return 'Speed';
      case 5: return 'HP';
      default: return `Stat #${index + 1}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
          🐾 BEAST SUMMON & PET SANCTUARY
        </h1>
        <p className="text-muted text-sm mt-1">
          Catalog of spiritual beasts, level curves, and vice pet gacha synthesis models.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 text-sm tracking-wider font-semibold rounded transition-all ${
            activeTab === 'roster'
              ? 'bg-brand-soft border border-brand text-brand shadow-sm'
              : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          🐾 BEAST ROSTER
        </button>
        <button
          onClick={() => setActiveTab('level')}
          className={`px-4 py-2 text-sm tracking-wider font-semibold rounded transition-all ${
            activeTab === 'level'
              ? 'bg-brand-soft border border-brand text-brand shadow-sm'
              : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          📈 LEVELING CALCULATOR
        </button>
        <button
          onClick={() => setActiveTab('craft')}
          className={`px-4 py-2 text-sm tracking-wider font-semibold rounded transition-all ${
            activeTab === 'craft'
              ? 'bg-brand-soft border border-brand text-brand shadow-sm'
              : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          🛠️ VICE PET SYNTHESIS
        </button>
      </div>

      {/* Roster & Details */}
      {activeTab === 'roster' && selectedBasePet && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pet List */}
          <div className="bg-surface border border-border rounded p-5 space-y-3 lg:col-span-1 max-h-[500px] overflow-y-auto">
            <h3 className="text-sm font-bold tracking-wider text-brand mb-4 uppercase">
              Spiritual Beasts ({uniquePets.length})
            </h3>
            {uniquePets.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPetId(p.id)}
                className={`w-full text-left p-3 rounded transition-all flex justify-between items-center ${
                  selectedPetId === p.id
                    ? 'bg-brand-soft border border-brand text-brand'
                    : 'bg-bg border border-transparent text-muted hover:text-text'
                }`}
              >
                <span className="font-semibold text-sm">{p.name}</span>
                <span className="text-xs px-2 py-0.5 bg-bg rounded text-subtle font-mono">
                  Grade {p.quality}
                </span>
              </button>
            ))}
          </div>

          {/* Pet Detail Panel */}
          <div className="lg:col-span-2 bg-surface border border-border rounded p-6 space-y-6">
            <div>
              <span className="text-xs text-brand font-mono">BEAST ID: {selectedBasePet.id}</span>
              <h2 className="text-2xl font-bold tracking-wider text-text mt-1">
                {selectedBasePet.name}
              </h2>
              <p className="text-muted text-sm mt-1">
                Base attributes, growth indicators, and stat scaling potentials.
              </p>
            </div>

            {/* Base Attributes */}
            <div className="bg-bg p-5 rounded border border-border">
              <h4 className="text-sm font-bold text-brand tracking-wider uppercase mb-4 border-b border-border pb-2">
                Base Attributes (Level 1)
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                {getPetStatsAtLevel(1)?.map((stat, idx) => (
                  <div key={idx} className="bg-surface p-3 rounded border border-border flex justify-between">
                    <span className="text-muted">{getStatName(idx)}</span>
                    <span className="text-success font-bold">+{stat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Growth Scales */}
            <div className="bg-bg p-5 rounded border border-border/60">
              <h4 className="text-sm font-bold text-muted tracking-wider uppercase mb-3">
                Spiritual growth parameters
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                Growth parameters multiply the attributes of the main character when the beast is slotted actively in combat arrays. Feed higher tier items to unlock growth multipliers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Level Planner */}
      {activeTab === 'level' && selectedBasePet && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Level Inputs */}
          <div className="bg-surface border border-border rounded p-6 space-y-6 lg:col-span-1">
            <h3 className="text-sm font-bold tracking-wider text-brand uppercase border-b border-border pb-2">
              LEVEL METRICS
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-subtle uppercase block mb-1">
                  Current Level: {currentLevel}
                </label>
                <input
                  type="range"
                  min="1"
                  max="99"
                  value={currentLevel}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setCurrentLevel(val);
                    if (targetLevel <= val) setTargetLevel(val + 1);
                  }}
                  className="w-full accent-brand"
                />
              </div>

              <div>
                <label className="text-xs text-subtle uppercase block mb-1">
                  Target Level: {targetLevel}
                </label>
                <input
                  type="range"
                  min={currentLevel + 1}
                  max="100"
                  value={targetLevel}
                  onChange={e => setTargetLevel(parseInt(e.target.value))}
                  className="w-full accent-brand"
                />
              </div>
            </div>

            <div className="bg-bg p-4 rounded border border-border space-y-3">
              <span className="text-xs text-subtle uppercase block">Total Cost Projected</span>
              <div className="flex justify-between items-center text-sm border-b border-border pb-2">
                <span className="text-muted">Total Silver</span>
                <span className="text-yellow-400 font-mono font-bold">{silver.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted">Beast EXP Required</span>
                <span className="text-success font-mono font-bold">{expRequired.toLocaleString()} EXP</span>
              </div>
            </div>
          </div>

          {/* Level Scaling Progression */}
          <div className="lg:col-span-2 bg-surface border border-border rounded p-6">
            <h3 className="text-sm font-bold tracking-wider text-muted uppercase border-b border-border pb-3 mb-4">
              LEVEL SCALING PROGRESSION
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-subtle uppercase font-mono tracking-wider">
                    <th className="py-2.5">Level Node</th>
                    <th className="py-2.5">EXP to next Level</th>
                    <th className="py-2.5">Silver cost</th>
                    <th className="py-2.5">Projected Base Stats (HP/Attack)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text font-mono">
                  {Array.from({ length: 8 }).map((_, idx) => {
                    const lvl = currentLevel + idx;
                    if (lvl >= targetLevel) return null;
                    const matched = selectedRows.find(r => r.level === lvl);
                    const exp = matched ? matched.need_exp : (lvl * 80 + 200);
                    const gold = Math.floor(exp * 0.4 + 100);

                    return (
                      <tr key={idx} className="hover:bg-hover">
                        <td className="py-3 text-brand font-bold">Lv. {lvl} ➔ {lvl + 1}</td>
                        <td className="py-3">{exp.toLocaleString()}</td>
                        <td className="py-3 text-yellow-400">{gold.toLocaleString()}</td>
                        <td className="py-3 text-muted">
                          +{Math.floor(lvl * 15 + 80)} HP / +{Math.floor(lvl * 3.2 + 12)} Attack
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

      {/* Vice Pet Synthesis */}
      {activeTab === 'craft' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Crafting recipes */}
          <div className="bg-surface border border-border rounded p-6 space-y-4">
            <h3 className="text-sm font-bold tracking-wider text-brand uppercase border-b border-border pb-2">
              VICE BEAST MAKE RECIPES ({viceMakes.length})
            </h3>
            
            <div className="space-y-4">
              {viceMakes.map(recipe => (
                <div key={recipe.id} className="bg-bg p-4 rounded border border-border">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-sm">Vice Pet ID: {recipe.id}</span>
                    <span className="text-xs text-yellow-400 font-mono">{recipe.need_silver.toLocaleString()} Silver</span>
                  </div>
                  <div className="text-xs space-y-1.5 text-muted">
                    <span className="block text-subtle uppercase tracking-wider text-[10px]">Ingredients list</span>
                    {(() => {
                      const itemCode = recipe.consume?.[0];
                      const quantity = recipe.consume?.[1] || 1;
                      if (!itemCode) return <span className="text-subtle italic">No materials configured.</span>;
                      const itemName = articlesMap[itemCode]?.name || `Material #${itemCode}`;
                      return (
                        <div className="flex justify-between font-mono">
                          <span>{itemName}</span>
                          <span className="text-success">x{quantity}</span>
                        </div>
                      );
                    })()}
                    <div className="mt-3 border-t border-border pt-2 text-[11px] italic">
                      <span className="text-subtle">Acquisition Pathway: </span>
                      {recipe.pathway || 'Spirit gacha rolls / tavern exchanges.'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vice Pet Rank Ups */}
          <div className="bg-surface border border-border rounded p-6 space-y-4">
            <h3 className="text-sm font-bold tracking-wider text-muted uppercase border-b border-border pb-2">
              VICE BEAST RANK PROMOTIONS ({viceRankUps.length})
            </h3>
            
            <div className="space-y-4">
              {viceRankUps.slice(0, 10).map(rank => (
                <div key={rank.id} className="bg-bg p-4 rounded border border-border/60 font-mono text-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-brand text-sm">Rank Node #{rank.id}</span>
                    <span className="text-subtle">➔ Target Pet ID: {rank.next_pet_id}</span>
                  </div>
                  <div className="space-y-1 text-muted">
                    <div className="flex justify-between">
                      <span>Required Beast Level</span>
                      <span className="text-text">Lv. {rank.pet_level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Silver needed</span>
                      <span className="text-yellow-400 font-bold">{rank.need_silver.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
