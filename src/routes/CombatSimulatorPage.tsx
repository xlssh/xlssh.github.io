import React, { useEffect, useState, useMemo, useRef } from 'react';
import { loadHeroes } from '../data/loaders';
import { Hero } from '../types/db';
import { Swords, Play, Heart } from 'lucide-react';

interface Combatant {
  id: number;
  name: string;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number;
  dodgeRate: number;
  blockRate: number;
  isEnemy: boolean;
}

export const CombatSimulatorPage: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);

  // Challenger Team Selection (Up to 5)
  const [selectedHeroIds, setSelectedSkillHeroIds] = useState<number[]>([]);
  const [simLevel, setSimLevel] = useState<number>(50);

  // Boss Selection
  const [bossId, setBossId] = useState<string>('aizen');

  // Simulation Status
  const [isRunning, setIsRunning] = useState(false);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [playerTeamState, setPlayerTeamState] = useState<Combatant[]>([]);
  const [enemyTeamState, setEnemyTeamState] = useState<Combatant[]>([]);

  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      const [hRes] = await Promise.all([
        loadHeroes()
      ]);
      setHeroes(hRes.rows);

      // Pre-select some starting heroes
      if (hRes.rows.length > 0) {
        setSelectedSkillHeroIds(
          hRes.rows
            .filter(h => [11101001, 11101004, 11101003].includes(h.id))
            .map(h => h.id)
        );
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [combatLog]);

  // Scaled stats calculation for player heroes
  const playerCombatants = useMemo(() => {
    return selectedHeroIds.map(id => {
      const h = heroes.find(x => x.id === id)!;
      const lvFactor = simLevel - 1;

      const maxHp = ((h.life ?? 0) + Math.round((h.life_grow ?? 0) * lvFactor)) * 5;
      const attack = (h.power ?? 0) + Math.round((h.power_grow ?? 0) * lvFactor);
      const defense = (h.near_defense ?? 0) + Math.round((h.near_defense ?? 0) * 0.1 * lvFactor);
      const speed = (h.speed ?? 0) + Math.round((h.speed_grow ?? 0) * lvFactor);

      return {
        id: h.id,
        name: h.name || 'Unnamed Mercenary',
        maxHp,
        hp: maxHp,
        attack,
        defense,
        speed,
        critRate: h.crit_rate ?? 5,
        dodgeRate: h.dodge_rate ?? 5,
        blockRate: h.block_rate ?? 5,
        isEnemy: false
      };
    }) as Combatant[];
  }, [selectedHeroIds, heroes, simLevel]);

  // Pre-configured Enemy Boss configurations based on parsed boss IDs
  const enemyCombatants = useMemo(() => {
    if (bossId === 'aizen') {
      return [
        { id: 9001, name: 'Sōsuke Aizen (Hōgyoku)', maxHp: 500000, hp: 500000, attack: 4500, defense: 2500, speed: 280, critRate: 25, dodgeRate: 15, blockRate: 10, isEnemy: true },
        { id: 9002, name: 'Fracción Vanguard', maxHp: 80000, hp: 80000, attack: 2200, defense: 1000, speed: 180, critRate: 10, dodgeRate: 5, blockRate: 15, isEnemy: true }
      ];
    } else if (bossId === 'byakuya') {
      return [
        { id: 9003, name: 'Byakuya Kuchiki (Senbonzakura)', maxHp: 380000, hp: 380000, attack: 4200, defense: 1800, speed: 320, critRate: 20, dodgeRate: 25, blockRate: 5, isEnemy: true }
      ];
    } else {
      return [
        { id: 9004, name: 'Kenpachi Zaraki (Nozarashi)', maxHp: 650000, hp: 650000, attack: 5200, defense: 1200, speed: 190, critRate: 35, dodgeRate: 2, blockRate: 20, isEnemy: true }
      ];
    }
  }, [bossId]);

  // Launch the turn based combat simulator loop
  const handleStartSimulation = () => {
    setIsRunning(true);
    setCombatWinner(null);
    const log: string[] = ["⚡ Arena Gates Open! Teams prepare to clash..."];

    const players = playerCombatants.map(c => ({ ...c }));
    const enemies = enemyCombatants.map(c => ({ ...c }));

    setPlayerTeamState(players);
    setEnemyTeamState(enemies);

    let round = 1;
    const maxRounds = 30;

    const delaySim = setInterval(() => {
      if (round > maxRounds) {
        log.push("⚠️ Timeout! Maximum round count of 30 reached. Combat ends in a Draw.");
        setCombatLog([...log]);
        setIsRunning(false);
        clearInterval(delaySim);
        return;
      }

      log.push(`\n--- ROUND ${round} ---`);

      // Combine active units into turn speed queue
      const alivePlayers = players.filter(p => p.hp > 0);
      const aliveEnemies = enemies.filter(e => e.hp > 0);

      if (alivePlayers.length === 0) {
        log.push("\n💀 Defeat! Your entire roster has been decimated.");
        setCombatWinner('enemy');
        setCombatLog([...log]);
        setIsRunning(false);
        clearInterval(delaySim);
        return;
      }
      if (aliveEnemies.length === 0) {
        log.push("\n🏆 Victory! You have vanquished the enemy boss team.");
        setCombatWinner('player');
        setCombatLog([...log]);
        setIsRunning(false);
        clearInterval(delaySim);
        return;
      }

      // Sort characters by speed (high speed acts first)
      const turnQueue = [...alivePlayers, ...aliveEnemies].sort((a, b) => b.speed - a.speed);

      turnQueue.forEach(attacker => {
        // Double check if attacker is still alive
        if (attacker.hp <= 0) return;

        // Choose target
        const isAttackerEnemy = attacker.isEnemy;
        const targets = isAttackerEnemy ? players.filter(p => p.hp > 0) : enemies.filter(e => e.hp > 0);
        if (targets.length === 0) return;

        // Standard targeted strategy: Attack weakest health target (Strategic focus)
        const target = targets.reduce((weakest, curr) => curr.hp < weakest.hp ? curr : weakest, targets[0]);

        // Roll formulas
        let hitResult = "HIT";
        let isDodged = Math.random() * 100 < target.dodgeRate;
        let isCrit = Math.random() * 100 < attacker.critRate;
        let isBlocked = Math.random() * 100 < target.blockRate;

        if (isDodged) {
          log.push(`💨 ${attacker.name} strikes at ${target.name}, but they DODGE cleanly!`);
          return;
        }

        // Base damage calculation matching game formulas
        let damage = Math.max(100, Math.round(attacker.attack - target.defense * 0.4));

        if (isCrit) {
          damage = Math.round(damage * 1.5);
          hitResult = "CRITICAL HIT";
        }
        if (isBlocked) {
          damage = Math.round(damage * 0.5);
          hitResult = isCrit ? "CRIT BLOCK" : "BLOCK";
        }

        target.hp = Math.max(0, target.hp - damage);

        if (isCrit) {
          log.push(`💥 [${hitResult}] ${attacker.name} hits ${target.name} for ${damage.toLocaleString()} damage!`);
        } else if (isBlocked) {
          log.push(`🛡️ [${hitResult}] ${attacker.name} strikes ${target.name}. Damage reduced to ${damage.toLocaleString()}!`);
        } else {
          log.push(`⚔️ ${attacker.name} attacks ${target.name} dealing ${damage.toLocaleString()} damage.`);
        }

        if (target.hp <= 0) {
          log.push(`💀 [K.O.] ${target.name} has fallen in battle!`);
        }
      });

      // Update state
      setPlayerTeamState([...players]);
      setEnemyTeamState([...enemies]);
      setCombatLog([...log]);

      round++;
    }, 400);
  };

  const poolOptions = useMemo(() => {
    return heroes.filter(h => !selectedHeroIds.includes(h.id));
  }, [heroes, selectedHeroIds]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-text tracking-tight flex items-center gap-2">
          <Swords className="text-rose-500 animate-pulse" />
          Live Combat & Turn Simulator
        </h1>
        <p className="text-sm text-muted mt-1">
          Test your customized team formation against server boss battles. Simulates frame-by-frame combat, rolls secondary stats, and prints live logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Configuration board */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 bg-surface border border-border rounded-2xl space-y-5">
            <h2 className="text-sm font-black text-subtle uppercase tracking-widest">Simulation Setup</h2>

            {/* Simulation Level */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-subtle">
                <span>Challenger Level</span>
                <span className="text-brand font-mono">Lv.{simLevel}</span>
              </div>
              <input
                type="range"
                min={1}
                max={130}
                value={simLevel}
                onChange={(e) => setSimLevel(parseInt(e.target.value))}
                className="w-full accent-brand cursor-pointer"
                disabled={isRunning}
              />
            </div>

            {/* Boss Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-subtle uppercase">Target Encounter</label>
              <select
                value={bossId}
                onChange={(e) => setBossId(e.target.value)}
                className="w-full px-3 py-2 border border-border bg-bg text-xs rounded-xl text-text focus:outline-none"
                disabled={isRunning}
              >
                <option value="aizen">🎭 Sōsuke Aizen + Vanguard</option>
                <option value="byakuya">🌸 Byakuya Kuchiki</option>
                <option value="kenpachi">👹 Kenpachi Zaraki</option>
              </select>
            </div>

            {/* Simulated Team builder (Select up to 5) */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-subtle uppercase block">Selected Challengers ({selectedHeroIds.length}/5)</label>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                {playerCombatants.map(c => (
                  <div key={c.id} className="p-2 border border-border bg-bg rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-text">{c.name}</span>
                    <button
                      onClick={() => setSelectedSkillHeroIds(prev => prev.filter(x => x !== c.id))}
                      className="text-[10px] font-bold text-danger hover:text-danger/80 px-2 py-0.5 rounded bg-danger/10"
                      disabled={isRunning}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {selectedHeroIds.length < 5 && (
                <div className="pt-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const val = parseInt(e.target.value);
                        setSelectedSkillHeroIds(prev => [...prev, val]);
                        e.target.value = '';
                      }
                    }}
                    className="w-full px-3 py-2 border border-border bg-bg text-xs rounded-xl text-subtle focus:outline-none"
                    disabled={isRunning}
                  >
                    <option value="">+ Add Challenger...</option>
                    {poolOptions.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Launch simulation Button */}
            <button
              onClick={handleStartSimulation}
              disabled={isRunning || selectedHeroIds.length === 0}
              className="w-full py-3 bg-brand hover:bg-brand-hover disabled:bg-muted text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
            >
              <Play size={12} /> {isRunning ? "Simulation in Progress..." : "⚔️ Start Live Clash"}
            </button>
          </div>
        </div>

        {/* Right 2 Cols: Live Logs Scroll & Health Monitors */}
        <div className="lg:col-span-2 space-y-6">

          {/* Health states */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Challengers Health */}
            <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
              <h3 className="text-xs font-black text-subtle uppercase tracking-widest flex items-center gap-1">
                <Heart size={12} className="text-brand" />
                Challengers Health
              </h3>
              <div className="space-y-2.5">
                {(isRunning ? playerTeamState : playerCombatants).map(c => {
                  const hpPct = Math.round((c.hp / c.maxHp) * 100);
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-text">{c.name}</span>
                        <span className="font-mono text-muted">{c.hp.toLocaleString()} / {c.maxHp.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success transition-all duration-350"
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Encounter Health */}
            <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
              <h3 className="text-xs font-black text-subtle uppercase tracking-widest flex items-center gap-1">
                <Heart size={12} className="text-violet-500" />
                Opponent Health
              </h3>
              <div className="space-y-2.5">
                {(isRunning ? enemyTeamState : enemyCombatants).map(c => {
                  const hpPct = Math.round((c.hp / c.maxHp) * 100);
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-text">{c.name}</span>
                        <span className="font-mono text-muted">{c.hp.toLocaleString()} / {c.maxHp.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden">
                        <div
                          className="h-full bg-danger transition-all duration-350"
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Combat Scroll Log Panel */}
          <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
            <h3 className="text-xs font-black text-subtle uppercase tracking-widest">Combat scroll log</h3>

            <div className="h-[300px] overflow-y-auto p-4 bg-bg border border-border/80 rounded-xl font-mono text-xs text-text space-y-2.5 custom-scrollbar">
              {combatLog.map((logLine, index) => {
                let colorClass = "text-text";
                if (logLine.includes("CRITICAL")) colorClass = "text-amber-400 font-extrabold";
                if (logLine.includes("DODGE")) colorClass = "text-sky-400";
                if (logLine.includes("BLOCK")) colorClass = "text-violet-400";
                if (logLine.includes("Victory")) colorClass = "text-success font-black text-sm";
                if (logLine.includes("Defeat")) colorClass = "text-danger font-black text-sm";
                if (logLine.includes(" fallen ")) colorClass = "text-muted line-through";

                return (
                  <div key={index} className={colorClass}>
                    {logLine}
                  </div>
                );
              })}
              {combatLog.length === 0 && (
                <div className="h-full flex items-center justify-center text-muted">
                  Arena idle. Click "Start Live Clash" above to begin turn simulation.
                </div>
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
