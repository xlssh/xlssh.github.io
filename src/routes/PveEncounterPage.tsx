import React, { useEffect, useState, useMemo } from 'react';
import { loadEnemyArmies, loadEnemies, loadSkills } from '../data/loaders';
import { EnemyArmy, Enemy, Skill } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { Shield, Sparkles, Swords, Heart, Zap, Crosshair, HelpCircle, Search, Trophy, ChevronRight, User } from 'lucide-react';

export const PveEncounterPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [armies, setArmies] = useState<EnemyArmy[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  // Search & Selector states
  const [searchQuery, setSearchVal] = useState('');
  const [selectedArmyId, setSelectedArmyId] = useState<number | null>(null);
  const [selectedEnemyId, setSelectedEnemyId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([loadEnemyArmies(), loadEnemies(), loadSkills()])
      .then(([armyRes, enemyRes, skillRes]) => {
        setArmies(armyRes.rows);
        setEnemies(enemyRes.rows);
        setSkills(skillRes.rows);

        if (armyRes.rows.length > 0) {
          setSelectedArmyId(armyRes.rows[0].id);
        }

        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load databases for PVE Campaign Stage Analyzer.");
        setLoading(false);
      });
  }, []);

  const armiesMap = useMemo(() => {
    const map = new Map<number, EnemyArmy>();
    armies.forEach(army => map.set(army.id, army));
    return map;
  }, [armies]);

  const enemiesMap = useMemo(() => {
    const map = new Map<number, Enemy>();
    enemies.forEach(enemy => map.set(enemy.id, enemy));
    return map;
  }, [enemies]);

  const skillsMap = useMemo(() => {
    const map = new Map<number, Skill>();
    skills.forEach(skill => map.set(skill.id, skill));
    return map;
  }, [skills]);

  // Filter combat encounters
  const filteredArmies = useMemo(() => {
    if (!searchQuery.trim()) {
      return armies.slice(0, 50);
    }
    const query = searchQuery.toLowerCase();
    return armies.filter(army => 
      army.id.toString() === query || 
      (army.name && army.name.toLowerCase().includes(query)) ||
      (army.text && army.text.toLowerCase().includes(query))
    ).slice(0, 50);
  }, [armies, searchQuery]);

  const selectedArmy = selectedArmyId ? armiesMap.get(selectedArmyId) : null;

  // Resolve the leader of the selected army
  const leaderEnemy = useMemo(() => {
    if (!selectedArmy) return null;
    return enemiesMap.get(selectedArmy.leader_id) || null;
  }, [selectedArmy, enemiesMap]);

  // Automatically select the leader or first enemy when army changes
  useEffect(() => {
    if (selectedArmy) {
      if (selectedArmy.leader_id && enemiesMap.has(selectedArmy.leader_id)) {
        setSelectedEnemyId(selectedArmy.leader_id);
      } else {
        // Fallback to first non-empty enemy ID
        const firstEid = [...selectedArmy.front, ...selectedArmy.middle, ...selectedArmy.back].find(id => id > 0);
        if (firstEid) {
          setSelectedEnemyId(firstEid);
        }
      }
    }
  }, [selectedArmy, enemiesMap]);

  const selectedEnemy = selectedEnemyId ? enemiesMap.get(selectedEnemyId) : null;

  // Resolve skills for selected enemy
  const enemySkills = useMemo(() => {
    if (!selectedEnemy) return { normal: null, skill: null };
    return {
      normal: selectedEnemy.normal ? skillsMap.get(selectedEnemy.normal) : null,
      skill: selectedEnemy.skill ? skillsMap.get(selectedEnemy.skill) : null
    };
  }, [selectedEnemy, skillsMap]);

  const getProfessionLabel = (profession: number) => {
    const professions = ['None', 'Vanguard', 'Assaulter', 'Support', 'Reaper', 'Tactician'];
    return professions[profession] || `Class ${profession}`;
  };

  const getElementLabel = (etype: number) => {
    const elements = ['None', 'Fire (Vigorous)', 'Water (Serene)', 'Wind (Agile)', 'Earth (Solid)', 'Thunder (Striking)'];
    return elements[etype] || `Element ${etype}`;
  };

  if (loading) {
    return <LoadingState message="Decompressing 19k monster attributes & tactical grids..." />;
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
      {/* Page Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-text flex items-center gap-2">
          <Swords className="w-6 h-6 text-red-500" /> PVE Campaign Stage Encounter Analyzer
        </h1>
        <p className="text-muted mt-1">
          Explore tactical boss positioning layout, check enemy attributes, and audit skill specifications.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Encounter Selection */}
        <div className="lg:col-span-4 bg-surface rounded-2xl border border-border p-5 space-y-4 h-[700px] flex flex-col">
          <div className="space-y-1">
            <h2 className="text-md font-bold flex items-center gap-2 text-text">
              <Search className="w-4 h-4 text-indigo-500" /> Search Encounters
            </h2>
            <p className="text-xs text-muted">Select any level boss or squad layout to analyze.</p>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or encounter ID..."
              value={searchQuery}
              onChange={e => setSearchVal(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-bg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-subtle" />
          </div>

          {/* List Scroll */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredArmies.length > 0 ? (
              filteredArmies.map(army => (
                <button
                  key={army.id}
                  onClick={() => setSelectedArmyId(army.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    selectedArmyId === army.id
                      ? 'border-red-500 bg-red-500/5 text-red-600 dark:text-red-400'
                      : 'border-border hover:bg-hover text-muted'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-raised text-subtle dark:text-subtle">
                        ID {army.id}
                      </span>
                      {army.leader_id > 0 && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-500 font-semibold px-1 rounded">
                          Boss Team
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-sm line-clamp-1 mt-1">{army.name || "Unnamed Encounter"}</div>
                    {army.text && <div className="text-xs text-muted mt-0.5 line-clamp-1 italic">"{army.text}"</div>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-subtle shrink-0" />
                </button>
              ))
            ) : (
              <div className="text-center py-10 text-sm text-muted">
                No campaign encounters found.
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Tactical Placement & Inspection */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6 h-auto lg:h-[700px]">
          {/* Tactical Matrix Column */}
          <div className="md:col-span-5 bg-surface border border-border rounded-2xl p-5 flex flex-col h-full space-y-4">
            <div>
              <h3 className="text-md font-bold text-text">Staggered Placement Matrix</h3>
              <p className="text-xs text-muted mt-0.5">3 Columns x 5 Rows Combat Grid</p>
            </div>

            {selectedArmy ? (
              <div className="flex-1 flex flex-col justify-between border border-border bg-bg/50 p-4 rounded-xl">
                {/* 5x3 Grid Placement representation */}
                <div className="grid grid-cols-3 gap-3 flex-1 items-center">
                  {/* Column 3: Back (Support) */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-center text-subtle uppercase tracking-widest">Back</div>
                    {[0, 1, 2, 3, 4].map(idx => {
                      const eid = selectedArmy.back?.[idx] || 0;
                      const monster = enemiesMap.get(eid);
                      return (
                        <button
                          key={`back-${idx}`}
                          onClick={() => { if (eid > 0) setSelectedEnemyId(eid); }}
                          disabled={eid === 0}
                          className={`w-full aspect-square rounded-xl border flex flex-col items-center justify-center p-1 text-center transition-all ${
                            eid === 0
                              ? 'bg-bg/50 dark:bg-bg/50 border-dashed border-border opacity-25'
                              : selectedEnemyId === eid
                                ? 'border-red-500 bg-red-500/10 text-red-500 shadow shadow-red-500/10'
                                : 'border-border bg-surface hover:border-border-strong'
                          }`}
                        >
                          {monster ? (
                            <>
                              <div className={`w-2.5 h-2.5 rounded-full mb-1 ${monster.is_boss ? 'bg-amber-500' : 'bg-red-400'}`} />
                              <div className="font-bold text-[10px] line-clamp-1 leading-tight">{monster.name}</div>
                              <div className="text-[8px] text-muted mt-0.5">Lv.{monster.level}</div>
                            </>
                          ) : (
                            <span className="text-[10px] text-subtle italic">Empty</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Column 2: Middle (Assaulter) */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-center text-subtle uppercase tracking-widest">Middle</div>
                    {[0, 1, 2, 3, 4].map(idx => {
                      const eid = selectedArmy.middle?.[idx] || 0;
                      const monster = enemiesMap.get(eid);
                      return (
                        <button
                          key={`mid-${idx}`}
                          onClick={() => { if (eid > 0) setSelectedEnemyId(eid); }}
                          disabled={eid === 0}
                          className={`w-full aspect-square rounded-xl border flex flex-col items-center justify-center p-1 text-center transition-all ${
                            eid === 0
                              ? 'bg-bg/50 dark:bg-bg/50 border-dashed border-border opacity-25'
                              : selectedEnemyId === eid
                                ? 'border-red-500 bg-red-500/10 text-red-500 shadow shadow-red-500/10'
                                : 'border-border bg-surface hover:border-border-strong'
                          }`}
                        >
                          {monster ? (
                            <>
                              <div className={`w-2.5 h-2.5 rounded-full mb-1 ${monster.is_boss ? 'bg-amber-500' : 'bg-red-400'}`} />
                              <div className="font-bold text-[10px] line-clamp-1 leading-tight">{monster.name}</div>
                              <div className="text-[8px] text-muted mt-0.5">Lv.{monster.level}</div>
                            </>
                          ) : (
                            <span className="text-[10px] text-subtle italic">Empty</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Column 1: Front (Vanguard) */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-center text-subtle uppercase tracking-widest">Front</div>
                    {[0, 1, 2, 3, 4].map(idx => {
                      const eid = selectedArmy.front?.[idx] || 0;
                      const monster = enemiesMap.get(eid);
                      return (
                        <button
                          key={`front-${idx}`}
                          onClick={() => { if (eid > 0) setSelectedEnemyId(eid); }}
                          disabled={eid === 0}
                          className={`w-full aspect-square rounded-xl border flex flex-col items-center justify-center p-1 text-center transition-all ${
                            eid === 0
                              ? 'bg-bg/50 dark:bg-bg/50 border-dashed border-border opacity-25'
                              : selectedEnemyId === eid
                                ? 'border-red-500 bg-red-500/10 text-red-500 shadow shadow-red-500/10'
                                : 'border-border bg-surface hover:border-border-strong'
                          }`}
                        >
                          {monster ? (
                            <>
                              <div className={`w-2.5 h-2.5 rounded-full mb-1 ${monster.is_boss ? 'bg-amber-500' : 'bg-red-400'}`} />
                              <div className="font-bold text-[10px] line-clamp-1 leading-tight">{monster.name}</div>
                              <div className="text-[8px] text-muted mt-0.5">Lv.{monster.level}</div>
                            </>
                          ) : (
                            <span className="text-[10px] text-subtle italic">Empty</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Team brief details */}
                <div className="mt-4 pt-3 border-t border-border text-xs text-muted space-y-1">
                  <div>Leader Target: <span className="font-semibold text-text">{leaderEnemy?.name || 'Unknown'}</span></div>
                  <div>Drop Loot Award ID: <span className="font-semibold text-text">{selectedArmy.award_id}</span></div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-subtle">
                <HelpCircle className="w-10 h-10 mb-2" />
                <span>No Encounter Selected</span>
              </div>
            )}
          </div>

          {/* Monster Inspector Column */}
          <div className="md:col-span-7 bg-surface border border-border rounded-2xl p-5 flex flex-col h-full overflow-y-auto">
            {selectedEnemy ? (
              <div className="space-y-6">
                {/* Header card */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-500/10 text-red-500 uppercase tracking-widest">
                      {selectedEnemy.is_boss ? 'Raid Boss' : 'Standard Squad Unit'}
                    </span>
                    <h4 className="text-xl font-bold mt-1 text-text">{selectedEnemy.name}</h4>
                    <p className="text-xs text-muted mt-0.5">ID: {selectedEnemy.id} • Monster Level: {selectedEnemy.level}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-surface-raised flex items-center justify-center border border-border">
                    <User className="w-6 h-6 text-muted" />
                  </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-bg border border-border rounded-xl space-y-1">
                    <div className="text-xs text-muted flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-400" /> HP Points</div>
                    <div className="font-bold text-md text-text">{(selectedEnemy.hp || 0).toLocaleString()}</div>
                  </div>

                  <div className="p-3 bg-bg border border-border rounded-xl space-y-1">
                    <div className="text-xs text-muted flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-400" /> Speed Tempo</div>
                    <div className="font-bold text-md text-text">{(selectedEnemy.speed || 0).toLocaleString()}</div>
                  </div>

                  <div className="p-3 bg-bg border border-border rounded-xl space-y-1">
                    <div className="text-xs text-muted flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-indigo-400" /> Combat Class</div>
                    <div className="font-semibold text-sm text-text">{getProfessionLabel(selectedEnemy.profession)}</div>
                  </div>

                  <div className="p-3 bg-bg border border-border rounded-xl space-y-1">
                    <div className="text-xs text-muted flex items-center gap-1"><Crosshair className="w-3.5 h-3.5 text-emerald-400" /> Element Attribute</div>
                    <div className="font-semibold text-sm text-text">{getElementLabel(selectedEnemy.type)}</div>
                  </div>
                </div>

                {/* Skill Deck */}
                <div className="space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-subtle">Monster Skillset Deck</h5>

                  <div className="space-y-3">
                    {/* Normal Skill */}
                    <div className="p-3.5 bg-bg border border-border rounded-xl flex gap-3">
                      <div className="w-10 h-10 shrink-0 rounded-lg bg-surface-raised flex items-center justify-center font-bold text-xs text-muted">
                        Norm
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bold text-sm text-text">
                          {enemySkills.normal ? enemySkills.normal.name : `Basic Attack (ID ${selectedEnemy.normal})`}
                        </div>
                        <p className="text-xs text-muted leading-relaxed">
                          {enemySkills.normal ? enemySkills.normal.description : "Executes a standard basic weapon strike dealing physical strike damage."}
                        </p>
                      </div>
                    </div>

                    {/* Skill */}
                    <div className="p-3.5 bg-bg border border-border rounded-xl flex gap-3">
                      <div className="w-10 h-10 shrink-0 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center font-bold text-xs">
                        Skill
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bold text-sm text-text">
                          {enemySkills.skill ? enemySkills.skill.name : `Rage Skill (ID ${selectedEnemy.skill})`}
                        </div>
                        <p className="text-xs text-muted leading-relaxed">
                          {enemySkills.skill ? enemySkills.skill.description : "Consumes 100 Anger to launch an ultimate skill, triggering massive class damage."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Attributes / Rates */}
                {selectedEnemy.rates && (
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-subtle">Combat Rate Spec</h5>
                    <div className="grid grid-cols-3 gap-2 text-xs bg-bg border border-border p-3 rounded-xl">
                      <div>Crit Rate: <span className="font-bold">{(selectedEnemy.rates.crit_rate || 0)}%</span></div>
                      <div>Dodge Rate: <span className="font-bold">{(selectedEnemy.rates.dodge_rate || 0)}%</span></div>
                      <div>Hit Rate: <span className="font-bold">{(selectedEnemy.rates.hit_rate || 0)}%</span></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-subtle py-10">
                <Shield className="w-10 h-10 mb-2" />
                <span>Select a monster in the grid layout to inspect its statistics.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
