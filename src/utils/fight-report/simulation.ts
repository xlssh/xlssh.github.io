import {
  FightReportData,
  CMD,
  decodeStatusFlags,
  hasStatusFlag,
  FightRole
} from './parser';

export interface FighterRuntimeState {
  hp: number;
  maxHp: number;
  shield: number;
  anger: number;
  dead: boolean;
  damageDealtRaw: number;
  damageTakenRaw: number;
  hpDamageDealt: number;
  hpDamageTaken: number;
  shieldAbsorbed: number;
  shieldApplied: number;
  healingDone: number;
  healingReceived: number;
  crits: number;
  kills: number;
  roleId: number;
  name: string;
}

export interface FighterTurnSnapshot {
  camp: number;
  pos: number;
  round: number;
  hp: number;
  maxHp: number;
  hpPercent: number;
  shield: number;
  anger: number;
  dead: boolean;
}

export interface TurnSummary {
  round: number;
  teamHp: [number, number]; // [Team 1 total HP, Team 2 total HP] at end of round
  teamHpPercent: [number, number];
  teamDamageDealt: [number, number];
  teamHealingDone: [number, number];
  teamShieldApplied: [number, number];
  deaths: number;
  crits: number;
}

export interface KeyMoment {
  id: string;
  type: 'death' | 'hit' | 'heal' | 'shield' | 'crit' | 'control' | 'turningPoint';
  round: number;
  activeIndex: number;
  title: string;
  description: string;
  value?: number;
  fighterName?: string;
  roleId?: number;
  camp?: number;
}

export interface DeathEvent {
  id: string;
  round: number;
  victimCamp: number;
  victimPos: number;
  victimName: string;
  victimRoleId: number;
  attackerName: string;
  attackerRoleId?: number;
  skillName: string;
  damage: number;
  hpBefore: number;
  shieldBefore: number;
  overkill: number;
}

export interface SkillUsageStats {
  skillEffectId: number;
  skillName: string;
  uses: number;
  totalRawDamage: number;
  totalHpDamage: number;
  totalHealing: number;
  maxHit: number;
  crits: number;
  kills: number;
  blocks: number;
  casters: Set<string>;
}

export interface BuffUsageStats {
  buffId: number;
  buffName: string;
  appliedCount: number;
  removedCount: number;
  affectedFighters: Set<string>;
  sourceFighters: Set<string>;
}

export interface SimulationResult {
  state: Map<string, FighterRuntimeState>;
  teamTotals: {
    rawDamageDealt: [number, number];
    hpDamageDealt: [number, number];
    healingDone: [number, number];
    shieldApplied: [number, number];
  };
  turnSummaries: TurnSummary[];
  fighterTimeline: Map<string, FighterTurnSnapshot[]>;
  deaths: DeathEvent[];
  keyMoments: KeyMoment[];
  skillsStats: Map<number, SkillUsageStats>;
  buffsStats: Map<number, BuffUsageStats>;
  winnerCamp: 0 | 1 | null;
  awards: {
    topDamage: AwardWinner | null;
    topHpDamage: AwardWinner | null;
    topHealer: AwardWinner | null;
    topTank: AwardWinner | null;
    topShieldApplied: AwardWinner | null;
    critKing: AwardWinner | null;
    killingBlows: AwardWinner | null;
  };
  totalDmgTeam1: number;
  totalDmgTeam2: number;
  totalHealTeam1: number;
  totalHealTeam2: number;
  maxDamageDoneRaw: number;
  maxDamageTakenRaw: number;
  maxHealing: number;
}

export interface AwardWinner {
  key: string;
  name: string;
  value: number;
  heroName: string;
  roleId: number;
  camp: number;
}

function buildInitialRuntimeState(
  report: FightReportData,
  resolveAttackerName: (camp: number, pos: number, role?: FightRole) => string
): Map<string, FighterRuntimeState> {
  const state = new Map<string, FighterRuntimeState>();

  const addRole = (camp: number, role: FightRole) => {
    state.set(`${camp}_${role.pos}`, {
      hp: role.curHealth,
      maxHp: role.totleHealth,
      shield: 0,
      anger: role.curAnger,
      dead: role.curHealth <= 0,
      damageDealtRaw: 0,
      damageTakenRaw: 0,
      hpDamageDealt: 0,
      hpDamageTaken: 0,
      shieldAbsorbed: 0,
      shieldApplied: 0,
      healingDone: 0,
      healingReceived: 0,
      crits: 0,
      kills: 0,
      roleId: role.roleId,
      name: resolveAttackerName(camp, role.pos, role),
    });
  };

  report.team1.roles.forEach(role => addRole(0, role));
  report.team2.roles.forEach(role => addRole(1, role));

  return state;
}

export function simulateFightReport(
  report: FightReportData,
  resolveAttackerName: (camp: number, pos: number, role?: FightRole) => string,
  skillsMap: Map<number, string>,
  buffsMap: Map<number, string>
): SimulationResult {
  const state = buildInitialRuntimeState(report, resolveAttackerName);

  const teamTotals: {
    rawDamageDealt: [number, number];
    hpDamageDealt: [number, number];
    healingDone: [number, number];
    shieldApplied: [number, number];
  } = {
    rawDamageDealt: [0, 0],
    hpDamageDealt: [0, 0],
    healingDone: [0, 0],
    shieldApplied: [0, 0],
  };

  const getKey = (camp: number, pos: number) => `${camp}_${pos}`;

  // Timeline snapshot tracking
  const fighterTimeline = new Map<string, FighterTurnSnapshot[]>();
  const addSnapshot = (key: string, round: number, runtimeState: FighterRuntimeState) => {
    const parts = key.split('_');
    const camp = parseInt(parts[0]);
    const pos = parseInt(parts[1]);

    if (!fighterTimeline.has(key)) {
      fighterTimeline.set(key, []);
    }
    fighterTimeline.get(key)!.push({
      camp,
      pos,
      round,
      hp: runtimeState.hp,
      maxHp: runtimeState.maxHp,
      hpPercent: runtimeState.maxHp > 0 ? (runtimeState.hp / runtimeState.maxHp) * 100 : 0,
      shield: runtimeState.shield,
      anger: runtimeState.anger,
      dead: runtimeState.dead,
    });
  };

  // Add round 0 initial snapshot
  for (const [key, fState] of state.entries()) {
    addSnapshot(key, 0, fState);
  }

  const turnSummaries: TurnSummary[] = [];
  const deaths: DeathEvent[] = [];
  const keyMoments: KeyMoment[] = [];
  const skillsStats = new Map<number, SkillUsageStats>();
  const buffsStats = new Map<number, BuffUsageStats>();

  // Tracking key moments
  let maxHitVal = 0;
  let maxHitMoment: KeyMoment | null = null;
  let maxHealVal = 0;
  let maxHealMoment: KeyMoment | null = null;
  let maxShieldVal = 0;
  let maxShieldMoment: KeyMoment | null = null;
  let firstDeathOccurred = false;

  for (const turn of report.turns) {
    let roundDeaths = 0;
    let roundCrits = 0;
    let roundDmgTeam1 = 0;
    let roundDmgTeam2 = 0;
    let roundHealTeam1 = 0;
    let roundHealTeam2 = 0;
    let roundShieldTeam1 = 0;
    let roundShieldTeam2 = 0;

    for (let actIdx = 0; actIdx < turn.actives.length; actIdx++) {
      const active = turn.actives[actIdx];
      const attKey = getKey(active.camp, active.pos);
      const attacker = state.get(attKey);

      const activeGroup = active.camp === 0 ? report.team1 : report.team2;
      const activeRole = activeGroup.roles.find(r => r.pos === active.pos);
      const actAttackerName = resolveAttackerName(active.camp, active.pos, activeRole);

      const skillId = active.skillEffectId;
      const skillName = skillsMap.get(skillId) || `Skill #${skillId}`;

      // Initialize skill stats if missing
      if (skillId > 0 && !skillsStats.has(skillId)) {
        skillsStats.set(skillId, {
          skillEffectId: skillId,
          skillName,
          uses: 0,
          totalRawDamage: 0,
          totalHpDamage: 0,
          totalHealing: 0,
          maxHit: 0,
          crits: 0,
          kills: 0,
          blocks: 0,
          casters: new Set(),
        });
      }
      const skillStat = skillId > 0 ? skillsStats.get(skillId)! : null;
      if (skillStat) {
        skillStat.uses += 1;
        skillStat.casters.add(actAttackerName);
      }

      // Reorder targets to match grouping priority
      const shieldTargets = active.targets.filter(t => t.cmd === CMD.SHIELD);
      const hurtBuffTargets = active.targets.filter(t => t.cmd === CMD.HURTBUFF);
      const statusTargets = active.targets.filter(t => t.cmd === CMD.STATUS);
      const attackTargets = active.targets.filter(
        t => t.cmd === CMD.ATTACK || t.cmd === CMD.ATTACKEX
      );
      const floatTargets = active.targets.filter(t => t.cmd === CMD.FLOAT);
      const attrBuffTargets = active.targets.filter(t => t.cmd === CMD.ATTRBUFF);
      const controlBuffTargets = active.targets.filter(t => t.cmd === CMD.CONTROLBUFF);
      const positionTargets = active.targets.filter(t => t.cmd === CMD.POSITION);
      const noneTargets = active.targets.filter(t => t.cmd === CMD.NONE);

      const otherTargets = active.targets.filter(t =>
        t.cmd !== CMD.SHIELD &&
        t.cmd !== CMD.HURTBUFF &&
        t.cmd !== CMD.STATUS &&
        t.cmd !== CMD.ATTACK &&
        t.cmd !== CMD.ATTACKEX &&
        t.cmd !== CMD.FLOAT &&
        t.cmd !== CMD.ATTRBUFF &&
        t.cmd !== CMD.CONTROLBUFF &&
        t.cmd !== CMD.POSITION &&
        t.cmd !== CMD.NONE
      );

      const orderedTargets = [
        ...shieldTargets,
        ...hurtBuffTargets,
        ...statusTargets,
        ...attackTargets,
        ...floatTargets,
        ...attrBuffTargets,
        ...controlBuffTargets,
        ...positionTargets,
        ...noneTargets,
        ...otherTargets,
      ];

      for (const target of orderedTargets) {
        const tarKey = getKey(target.camp, target.pos);
        const fighter = state.get(tarKey);

        if (!fighter) continue;

        const flags = decodeStatusFlags(target.status);
        const isCrit = flags.includes("Crit");
        const isBlock = flags.includes("Block");

        if (isCrit) {
          roundCrits += 1;
          if (attacker) attacker.crits += 1;
          if (skillStat) skillStat.crits += 1;
        }
        if (isBlock && skillStat) {
          skillStat.blocks += 1;
        }

        // Save pre-action state snapshots
        target.hpBefore = fighter.hp;
        target.shieldBefore = fighter.shield;
        target.maxHp = fighter.maxHp;

        // Shield logic
        if (target.cmd === CMD.SHIELD) {
          const shieldHp = target.result.buffTurn || 0;
          const bId = target.result.buffId || 0;
          const bName = buffsMap.get(bId) || `Shield #${bId}`;

          if (shieldHp > 0) {
            fighter.shield = shieldHp;
            fighter.shieldApplied += shieldHp;
            if (active.camp === 0) roundShieldTeam1 += shieldHp;
            else if (active.camp === 1) roundShieldTeam2 += shieldHp;
            teamTotals.shieldApplied[active.camp] += shieldHp;

            // Log buff stats
            if (!buffsStats.has(bId)) {
              buffsStats.set(bId, {
                buffId: bId,
                buffName: bName,
                appliedCount: 0,
                removedCount: 0,
                affectedFighters: new Set(),
                sourceFighters: new Set(),
              });
            }
            const bStat = buffsStats.get(bId)!;
            bStat.appliedCount += 1;
            bStat.affectedFighters.add(fighter.name);
            if (attacker) bStat.sourceFighters.add(attacker.name);

            // Track biggest shield moment
            if (shieldHp > maxShieldVal) {
              maxShieldVal = shieldHp;
              maxShieldMoment = {
                id: `shield-${turn.curTurn}-${actIdx}`,
                type: 'shield',
                round: turn.curTurn,
                activeIndex: actIdx,
                title: 'Biggest Shield Cast',
                description: `${actAttackerName} applied a massive ${shieldHp.toLocaleString()} points Shield on ${fighter.name}`,
                value: shieldHp,
                fighterName: actAttackerName,
                roleId: attacker ? attacker.roleId : undefined,
                camp: active.camp,
              };
            }
          } else {
            // Shield removed
            fighter.shield = 0;
            if (buffsStats.has(bId)) {
              buffsStats.get(bId)!.removedCount += 1;
            }
          }
          target.hpAfter = fighter.hp;
          target.shieldAfter = fighter.shield;
          continue;
        }

        // Buff / Debuff applications
        if (target.cmd === CMD.ATTRBUFF || target.cmd === CMD.CONTROLBUFF) {
          const bId = target.result.buffId || 0;
          const turnOrType = target.result.buffTurn || 0;
          if (bId > 0 && turnOrType > 0) {
            const bName = buffsMap.get(bId) || `Buff #${bId}`;
            if (!buffsStats.has(bId)) {
              buffsStats.set(bId, {
                buffId: bId,
                buffName: bName,
                appliedCount: 0,
                removedCount: 0,
                affectedFighters: new Set(),
                sourceFighters: new Set(),
              });
            }
            const bStat = buffsStats.get(bId)!;
            bStat.appliedCount += 1;
            bStat.affectedFighters.add(fighter.name);
            if (attacker) bStat.sourceFighters.add(attacker.name);
          } else if (bId > 0 && buffsStats.has(bId)) {
            buffsStats.get(bId)!.removedCount += 1;
          }
        }

        // HP damage/healing
        const hurtHp = target.result.hurtHp || 0;

        if (hurtHp !== 0) {
          if (hurtHp < 0) {
            // healing
            const healVal = -hurtHp;
            if (!fighter.dead) {
              fighter.hp = Math.min(fighter.maxHp, fighter.hp + healVal);
            }

            fighter.healingReceived += healVal;
            if (attacker) {
              attacker.healingDone += healVal;
            }
            if (active.camp === 0) roundHealTeam1 += healVal;
            else if (active.camp === 1) roundHealTeam2 += healVal;
            teamTotals.healingDone[active.camp] += healVal;

            if (skillStat) {
              skillStat.totalHealing += healVal;
            }

            // Track biggest heal moment
            if (healVal > maxHealVal) {
              maxHealVal = healVal;
              maxHealMoment = {
                id: `heal-${turn.curTurn}-${actIdx}`,
                type: 'heal',
                round: turn.curTurn,
                activeIndex: actIdx,
                title: 'Biggest Healing Hit',
                description: `${actAttackerName} critical-healed ${fighter.name} for ${healVal.toLocaleString()} HP`,
                value: healVal,
                fighterName: actAttackerName,
                roleId: attacker ? attacker.roleId : undefined,
                camp: active.camp,
              };
            }
          } else {
            // damage, shield reducer first
            const shieldBefore = fighter.shield;
            const rawDamage = hurtHp;
            const absorbed = Math.min(shieldBefore, rawDamage);
            const hpDamage = rawDamage - absorbed;

            fighter.shield -= absorbed;
            const preHp = fighter.hp;
            fighter.hp = Math.max(0, fighter.hp - hpDamage);

            // Stats accumulation
            fighter.damageTakenRaw += rawDamage;
            fighter.hpDamageTaken += hpDamage;
            fighter.shieldAbsorbed += absorbed;

            // Only count enemy damage in totals
            const isEnemyTarget = active.camp !== target.camp;
            if (isEnemyTarget) {
              if (attacker) {
                attacker.damageDealtRaw += rawDamage;
                attacker.hpDamageDealt += hpDamage;
              }
              if (active.camp === 0) roundDmgTeam1 += rawDamage;
              else if (active.camp === 1) roundDmgTeam2 += rawDamage;
              teamTotals.rawDamageDealt[active.camp] += rawDamage;
              teamTotals.hpDamageDealt[active.camp] += hpDamage;

              if (skillStat) {
                skillStat.totalRawDamage += rawDamage;
                skillStat.totalHpDamage += hpDamage;
                if (rawDamage > skillStat.maxHit) {
                  skillStat.maxHit = rawDamage;
                }
              }

              // Track biggest damage hit moment
              if (rawDamage > maxHitVal) {
                maxHitVal = rawDamage;
                maxHitMoment = {
                  id: `hit-${turn.curTurn}-${actIdx}`,
                  type: 'hit',
                  round: turn.curTurn,
                  activeIndex: actIdx,
                  title: 'Biggest Damage Dealt',
                  description: `${actAttackerName} smashed ${fighter.name} with ${skillName} dealing ${rawDamage.toLocaleString()} raw damage!`,
                  value: rawDamage,
                  fighterName: actAttackerName,
                  roleId: attacker ? attacker.roleId : undefined,
                  camp: active.camp,
                };
              }
            }

            // Death detection
            const hasDiedFlag = hasStatusFlag(target.status, 1073741824);
            const actuallyDiedNow = preHp > 0 && fighter.hp <= 0;

            if (hasDiedFlag || actuallyDiedNow || fighter.dead) {
              const prevDead = fighter.dead;
              fighter.dead = true;
              fighter.hp = 0;

              if (!prevDead) {
                roundDeaths += 1;
                if (attacker) attacker.kills += 1;
                if (skillStat) skillStat.kills += 1;

                // Create Death Event
                const overkill = Math.max(0, rawDamage - preHp);
                const deathId = `death-${turn.curTurn}-${actIdx}-${target.pos}`;
                deaths.push({
                  id: deathId,
                  round: turn.curTurn,
                  victimCamp: target.camp,
                  victimPos: target.pos,
                  victimName: fighter.name,
                  victimRoleId: fighter.roleId,
                  attackerName: actAttackerName,
                  attackerRoleId: attacker ? attacker.roleId : undefined,
                  skillName,
                  damage: rawDamage,
                  hpBefore: preHp,
                  shieldBefore,
                  overkill,
                });

                // First Death Moment
                if (!firstDeathOccurred) {
                  firstDeathOccurred = true;
                  keyMoments.push({
                    id: `first-death-${turn.curTurn}-${actIdx}`,
                    type: 'death',
                    round: turn.curTurn,
                    activeIndex: actIdx,
                    title: 'First Blood Spilled',
                    description: `${fighter.name} was defeated by ${actAttackerName} with ${skillName}`,
                    fighterName: fighter.name,
                    roleId: fighter.roleId,
                    camp: target.camp,
                  });
                }
              }
            }
          }
        }

        // Anger logic: CurAnger -= HurtAnger
        if (target.result.hurtAnger !== undefined && target.result.hurtAnger !== 0) {
          fighter.anger -= target.result.hurtAnger;

          if (fighter.anger < 0) fighter.anger = 0;
          if (fighter.anger > 500) fighter.anger = 500;
        }

        // Save post-action state snapshots
        target.hpAfter = fighter.hp;
        target.shieldAfter = fighter.shield;
      }
    }

    // Accumulate timeline snapshot for the end of the round
    for (const [key, fState] of state.entries()) {
      addSnapshot(key, turn.curTurn, fState);
    }

    // Capture round HP totals
    let team1Hp = 0;
    let team1Max = 0;
    let team2Hp = 0;
    let team2Max = 0;

    for (const [key, fState] of state.entries()) {
      if (key.startsWith('0_')) {
        team1Hp += fState.hp;
        team1Max += fState.maxHp;
      } else {
        team2Hp += fState.hp;
        team2Max += fState.maxHp;
      }
    }

    turnSummaries.push({
      round: turn.curTurn,
      teamHp: [team1Hp, team2Hp],
      teamHpPercent: [
        team1Max > 0 ? (team1Hp / team1Max) * 100 : 0,
        team2Max > 0 ? (team2Hp / team2Max) * 100 : 0,
      ],
      teamDamageDealt: [roundDmgTeam1, roundDmgTeam2],
      teamHealingDone: [roundHealTeam1, roundHealTeam2],
      teamShieldApplied: [roundShieldTeam1, roundShieldTeam2],
      deaths: roundDeaths,
      crits: roundCrits,
    });
  }

  // Determine eventual Winner camp
  let team1HpFinal = 0;
  let team2HpFinal = 0;
  let team1Alive = false;
  let team2Alive = false;

  for (const [key, fighter] of state.entries()) {
    if (key.startsWith('0_')) {
      team1HpFinal += fighter.hp;
      if (!fighter.dead && fighter.hp > 0) team1Alive = true;
    } else {
      team2HpFinal += fighter.hp;
      if (!fighter.dead && fighter.hp > 0) team2Alive = true;
    }
  }

  let winnerCamp: 0 | 1 | null = null;
  if (team1Alive && !team2Alive) winnerCamp = 0;
  else if (!team1Alive && team2Alive) winnerCamp = 1;
  else if (team1HpFinal > team2HpFinal) winnerCamp = 0;
  else if (team2HpFinal > team1HpFinal) winnerCamp = 1;

  // Add the milestone moments to list
  if (maxHitMoment) keyMoments.push(maxHitMoment);
  if (maxHealMoment) keyMoments.push(maxHealMoment);
  if (maxShieldMoment) keyMoments.push(maxShieldMoment);

  // Detect Turning Point:
  // The first round where the eventual winner's HP percent exceeds the loser's
  // and remains favorable or equal until the end of the match.
  let turningPointRound: number | null = null;
  if (winnerCamp !== null && turnSummaries.length > 0) {
    const loserCamp = winnerCamp === 0 ? 1 : 0;
    for (let i = 0; i < turnSummaries.length; i++) {
      const summary = turnSummaries[i];
      if (summary.teamHpPercent[winnerCamp] > summary.teamHpPercent[loserCamp]) {
        // Verify it remains favorable for the remaining rounds
        let remainsFavorable = true;
        for (let j = i + 1; j < turnSummaries.length; j++) {
          if (turnSummaries[j].teamHpPercent[winnerCamp] < turnSummaries[j].teamHpPercent[loserCamp]) {
            remainsFavorable = false;
            break;
          }
        }
        if (remainsFavorable) {
          turningPointRound = summary.round;
          break;
        }
      }
    }
  }

  if (turningPointRound !== null) {
    const wName = winnerCamp === 0 ? 'Team 1 (Attacker)' : 'Team 2 (Defender)';
    keyMoments.push({
      id: 'turning-point',
      type: 'turningPoint',
      round: turningPointRound,
      activeIndex: 0,
      title: 'Match Turning Point',
      description: `In Round ${turningPointRound}, ${wName} gained the decisive HP advantage and maintained it until victor was sealed.`,
    });
  }

  // Sort key moments by Round asc
  keyMoments.sort((a, b) => a.round - b.round);

  // Compute MVP and specific award badges
  const awards = computeAwards(state);

  const totalDmgTeam1 = teamTotals.rawDamageDealt[0];
  const totalDmgTeam2 = teamTotals.rawDamageDealt[1];
  const totalHealTeam1 = teamTotals.healingDone[0];
  const totalHealTeam2 = teamTotals.healingDone[1];

  const allRawDmgValues = Array.from(state.values()).map(f => f.damageDealtRaw);
  const maxDamageDoneRaw = Math.max(1, ...allRawDmgValues);

  const allRawTakenValues = Array.from(state.values()).map(f => f.damageTakenRaw);
  const maxDamageTakenRaw = Math.max(1, ...allRawTakenValues);

  const allHealValues = Array.from(state.values()).map(f => f.healingDone);
  const maxHealing = Math.max(1, ...allHealValues);

  return {
    state,
    teamTotals,
    turnSummaries,
    fighterTimeline,
    deaths,
    keyMoments,
    skillsStats,
    buffsStats,
    winnerCamp,
    awards,
    totalDmgTeam1,
    totalDmgTeam2,
    totalHealTeam1,
    totalHealTeam2,
    maxDamageDoneRaw,
    maxDamageTakenRaw,
    maxHealing,
  };
}

function computeAwards(state: Map<string, FighterRuntimeState>) {
  const awards = {
    topDamage: null as AwardWinner | null,
    topHpDamage: null as AwardWinner | null,
    topHealer: null as AwardWinner | null,
    topTank: null as AwardWinner | null,
    topShieldApplied: null as AwardWinner | null,
    critKing: null as AwardWinner | null,
    killingBlows: null as AwardWinner | null,
  };

  for (const [key, fighter] of state.entries()) {
    const camp = key.startsWith('0_') ? 0 : 1;
    const details = {
      name: fighter.name,
      roleId: fighter.roleId,
      camp,
    };

    // Top Damage
    if (!awards.topDamage || fighter.damageDealtRaw > awards.topDamage.value) {
      awards.topDamage = {
        key: 'topDamage',
        name: 'Top Overall Damage',
        value: fighter.damageDealtRaw,
        heroName: details.name,
        roleId: details.roleId,
        camp: details.camp,
      };
    }

    // Top HP Damage
    if (!awards.topHpDamage || fighter.hpDamageDealt > awards.topHpDamage.value) {
      awards.topHpDamage = {
        key: 'topHpDamage',
        name: 'Top HP Damage',
        value: fighter.hpDamageDealt,
        heroName: details.name,
        roleId: details.roleId,
        camp: details.camp,
      };
    }

    // Top Healer
    if (!awards.topHealer || fighter.healingDone > awards.topHealer.value) {
      awards.topHealer = {
        key: 'topHealer',
        name: 'MVP Healer',
        value: fighter.healingDone,
        heroName: details.name,
        roleId: details.roleId,
        camp: details.camp,
      };
    }

    // Top Tank (Damage Taken)
    if (!awards.topTank || fighter.damageTakenRaw > awards.topTank.value) {
      awards.topTank = {
        key: 'topTank',
        name: 'Damage Sponge',
        value: fighter.damageTakenRaw,
        heroName: details.name,
        roleId: details.roleId,
        camp: details.camp,
      };
    }

    // Top Shield Applied
    if (!awards.topShieldApplied || fighter.shieldApplied > awards.topShieldApplied.value) {
      awards.topShieldApplied = {
        key: 'topShieldApplied',
        name: 'Guardian Protector',
        value: fighter.shieldApplied,
        heroName: details.name,
        roleId: details.roleId,
        camp: details.camp,
      };
    }

    // Crit King
    if (!awards.critKing || fighter.crits > awards.critKing.value) {
      awards.critKing = {
        key: 'critKing',
        name: 'Crit King',
        value: fighter.crits,
        heroName: details.name,
        roleId: details.roleId,
        camp: details.camp,
      };
    }

    // Killing Blows
    if (!awards.killingBlows || fighter.kills > awards.killingBlows.value) {
      awards.killingBlows = {
        key: 'killingBlows',
        name: 'Fallen Finisher',
        value: fighter.kills,
        heroName: details.name,
        roleId: details.roleId,
        camp: details.camp,
      };
    }
  }

  // Reset to null if values are 0
  if (awards.topDamage && awards.topDamage.value === 0) awards.topDamage = null;
  if (awards.topHpDamage && awards.topHpDamage.value === 0) awards.topHpDamage = null;
  if (awards.topHealer && awards.topHealer.value === 0) awards.topHealer = null;
  if (awards.topTank && awards.topTank.value === 0) awards.topTank = null;
  if (awards.topShieldApplied && awards.topShieldApplied.value === 0) awards.topShieldApplied = null;
  if (awards.critKing && awards.critKing.value === 0) awards.critKing = null;
  if (awards.killingBlows && awards.killingBlows.value === 0) awards.killingBlows = null;

  return awards;
}
