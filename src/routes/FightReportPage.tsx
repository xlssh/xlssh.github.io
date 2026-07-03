import React, { useState, useEffect, useMemo, useRef } from 'react';
import { loadHeroes, loadSkills, loadBuffEffects } from '../data/loaders';
import { Hero, Skill, BuffEffect } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import {
  Swords,
  Search,
  FileCode,
  UploadCloud,
  Play,
  TrendingUp,
  ShieldAlert,
  Heart,
  Info,
  ListOrdered
} from 'lucide-react';

// --- Binary parser helper class ---
class FightReportParser {
  public view: DataView;
  public pos: number = 0;
  public version: number = 2.0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  ensureAvailable(bytes: number): void {
    if (this.pos + bytes > this.view.byteLength) {
      throw new Error(
        `Unexpected end of fight report at offset ${this.pos}. Needed ${bytes} bytes, only ${this.view.byteLength - this.pos} remain.`
      );
    }
  }

  readByte(): number {
    this.ensureAvailable(1);
    const val = this.view.getInt8(this.pos);
    this.pos += 1;
    return val;
  }

  readUByte(): number {
    this.ensureAvailable(1);
    const val = this.view.getUint8(this.pos);
    this.pos += 1;
    return val;
  }

  readShort(): number {
    this.ensureAvailable(2);
    const val = this.view.getInt16(this.pos, false); // false = big-endian
    this.pos += 2;
    return val;
  }

  readUShort(): number {
    this.ensureAvailable(2);
    const val = this.view.getUint16(this.pos, false);
    this.pos += 2;
    return val;
  }

  readInt(): number {
    this.ensureAvailable(4);
    const val = this.view.getInt32(this.pos, false);
    this.pos += 4;
    return val;
  }

  readUInt(): number {
    this.ensureAvailable(4);
    const val = this.view.getUint32(this.pos, false);
    this.pos += 4;
    return val;
  }

  readUTF(): string {
    this.ensureAvailable(2);
    const len = this.readUShort();
    this.ensureAvailable(len);

    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, len);
    this.pos += len;
    return new TextDecoder("utf-8").decode(bytes);
  }

  readHealth(): number {
    if (this.version >= 3.1) {
      this.ensureAvailable(8);
      const high = this.readUInt();
      const low = this.readUInt();
      return high * 4294967296 + low;
    }
    this.ensureAvailable(4);
    return this.readUInt();
  }

  hasMoreBytes(): boolean {
    return this.pos < this.view.byteLength;
  }
}

// --- Confirmed Command Constants ---
const CMD = {
  NONE: 0,
  ATTACK: 1,
  ATTRBUFF: 2,
  HURTBUFF: 3,
  CONTROLBUFF: 4,
  POSITION: 5,
  STATUS: 6,
  ATTACKEX: 7,
  SHIELD: 8,
  FLOAT: 9,
} as const;

// --- Confirmed Fight Active Type Constants ---
const ACTIVE_TYPE = {
  NORMAL_ATTACK: 1,
  SKILL_ATTACK: 2,
  BLOCK: 3,
  PASSIVE_SKILL: 4,
  DIED_SKILL: 5,
  NORMAL_ATTACK_EX: 7,
  ROUND_SKILL: 10,
} as const;

// --- Full Confirmed Status Flags ---
const STATUS_FLAGS: Record<number, string> = {
  1: "No Normal Attack",
  2: "Daze / Stun",
  4: "Control Immune",
  8: "Anger Reduction Immune",
  16: "No Anger Gain",
  32: "No Skill",
  64: "No Healing",
  128: "Petrified",
  256: "Nothingness / Void",
  512: "Super Dodge / All Miss",
  1024: "Confusion",

  2048: "Immune to No Anger",
  4096: "Immune to No Skill",
  8192: "Immune to No Healing",
  16384: "Immune to Petrify",
  32768: "Immune to Void",
  65536: "Immune to No Normal Attack",
  131072: "Immune to Confusion",
  262144: "Immune to Super Dodge",
  524288: "Immune to Mutilate",

  1048576: "Frozen",
  2097152: "Invincible",
  4194304: "Beat Back",

  33554432: "Hit",
  67108864: "Crit",
  134217728: "Block",
  268435456: "Help / Rescue",
  536870912: "Combo / Joint Attack",
  1073741824: "Died",
  2147483648: "Chain Target Effect",
};

// --- Special Text Type Mapping for CMD_FLOAT ---
const SPECIAL_TEXT_TYPES: Record<number, string> = {
  1: "Shield Cleared",
  2: "Triple Damage",
  3: "Ignore Damage",
  4: "Defense Failure",
  5: "Full HP",
  6: "Instant Kill",
  7: "Ignore Instant Kill",
};

// --- Helper Functions ---
function decodeStatusFlags(statusNum: number): string[] {
  const flags: string[] = [];

  for (const [bitStr, label] of Object.entries(STATUS_FLAGS)) {
    const bit = Number(bitStr);

    if (bit === 2147483648) {
      if (statusNum >= 2147483648) flags.push(label);
    } else if ((statusNum & bit) !== 0) {
      flags.push(label);
    }
  }

  return flags;
}

function getSpecialFloatText(buffId: number): string {
  return SPECIAL_TEXT_TYPES[buffId] || `Special Text #${buffId}`;
}

function hasStatusFlag(status: number, flag: number): boolean {
  if (flag === 2147483648) {
    return status >= 2147483648;
  }
  return (status & flag) !== 0;
}

// --- Data structures ---
interface FightRole {
  pos: number;
  roleId: number;
  quality: number;
  level: number;
  curHealth: number;
  totleHealth: number;
  curAnger: number;
  skillId: number;
  name: string;
  rebirthNum?: number;
}

interface FightGroup {
  camp: number;
  knifeOfKillSoulId: number;
  knifeSoulId: number;
  bloodAddRate: number;
  roles: FightRole[];
}

interface FightTarget {
  cmd: number;
  camp: number;
  pos: number;
  status: number;
  result: {
    hurtHp?: number;
    hurtAnger?: number;
    buffId?: number;
    buffTurn?: number;
  };
}

interface FightActive {
  camp: number;
  pos: number;
  skillEffectId: number;
  activeType: number;
  targets: FightTarget[];
}

interface FightTurn {
  curTurn: number;
  actives: FightActive[];
}

interface FightReportData {
  version: number;
  team1: FightGroup;
  team2: FightGroup;
  totalTurns: number;
  turns: FightTurn[];
}

interface ParseDebugInfo {
  byteLength: number;
  finalOffset: number;
  remainingBytes: number;
  versionString: string;
  version: number;
  roleCounts: [number, number];
  totalTurns: number;
}

interface FighterRuntimeState {
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
}

interface SimulationResult {
  state: Map<string, FighterRuntimeState>;
  teamTotals: {
    rawDamageDealt: [number, number];
    hpDamageDealt: [number, number];
    healingDone: [number, number];
  };
}

// --- HP / Shield Simulation helper ---
function buildInitialRuntimeState(report: FightReportData): Map<string, FighterRuntimeState> {
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
    });
  };

  report.team1.roles.forEach(role => addRole(0, role));
  report.team2.roles.forEach(role => addRole(1, role));

  return state;
}

function simulateReportState(report: FightReportData): SimulationResult {
  const state = buildInitialRuntimeState(report);
  const teamTotals: {
    rawDamageDealt: [number, number];
    hpDamageDealt: [number, number];
    healingDone: [number, number];
  } = {
    rawDamageDealt: [0, 0],
    hpDamageDealt: [0, 0],
    healingDone: [0, 0],
  };

  const getKey = (camp: number, pos: number) => `${camp}_${pos}`;

  for (const turn of report.turns) {
    for (const active of turn.actives) {
      const attKey = getKey(active.camp, active.pos);
      const attacker = state.get(attKey);

      // Reorder targets to match the AS3 MakeCommandList grouping priorities
      const shieldTargets = active.targets.filter(t => t.cmd === CMD.SHIELD);
      const hurtBuffTargets = active.targets.filter(t => t.cmd === CMD.HURTBUFF);
      const statusTargets = active.targets.filter(t => t.cmd === CMD.STATUS);
      const attackTargets = active.targets.filter(t => t.cmd === CMD.ATTACK || t.cmd === CMD.ATTACKEX || t.cmd === CMD.NONE);
      const floatTargets = active.targets.filter(t => t.cmd === CMD.FLOAT);
      const attrBuffTargets = active.targets.filter(t => t.cmd === CMD.ATTRBUFF);
      const controlBuffTargets = active.targets.filter(t => t.cmd === CMD.CONTROLBUFF);
      const positionTargets = active.targets.filter(t => t.cmd === CMD.POSITION);

      const otherTargets = active.targets.filter(t =>
        t.cmd !== CMD.SHIELD &&
        t.cmd !== CMD.HURTBUFF &&
        t.cmd !== CMD.STATUS &&
        t.cmd !== CMD.ATTACK &&
        t.cmd !== CMD.ATTACKEX &&
        t.cmd !== CMD.NONE &&
        t.cmd !== CMD.FLOAT &&
        t.cmd !== CMD.ATTRBUFF &&
        t.cmd !== CMD.CONTROLBUFF &&
        t.cmd !== CMD.POSITION
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
        ...otherTargets,
      ];


      if (otherTargets.length > 0) {
        console.warn("Unknown fight target commands encountered:", otherTargets);
      }


      for (const target of orderedTargets) {
        const tarKey = getKey(target.camp, target.pos);
        const fighter = state.get(tarKey);

        if (!fighter) continue;

        // Shield command: buffTurn is shield HP.
        if (target.cmd === CMD.SHIELD) {
          const shieldHp = target.result.buffTurn || 0;
          fighter.shield = shieldHp;
          fighter.shieldApplied += shieldHp;
          continue;
        }

        // HP damage/healing.
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
            // Count in team totals regardless of whether attacker role exists
            if (active.camp === 0 || active.camp === 1) {
              teamTotals.healingDone[active.camp] += healVal;
            }
          } else {
            // damage, shield first
            const shieldBefore = fighter.shield;
            const rawDamage = hurtHp;
            const absorbed = Math.min(shieldBefore, rawDamage);
            const hpDamage = rawDamage - absorbed;

            fighter.shield -= absorbed;
            fighter.hp = Math.max(0, fighter.hp - hpDamage);

            // Stats accumulation
            fighter.damageTakenRaw += rawDamage;
            fighter.hpDamageTaken += hpDamage;
            fighter.shieldAbsorbed += absorbed;

            // Only count enemy damage in totals (no self or friendly fire)
            const isEnemyTarget = active.camp !== target.camp;
            if (isEnemyTarget) {
              if (attacker) {
                attacker.damageDealtRaw += rawDamage;
                attacker.hpDamageDealt += hpDamage;
              }
              // Count in team totals regardless of whether attacker role exists (e.g. system attacker)
              if (active.camp === 0 || active.camp === 1) {
                teamTotals.rawDamageDealt[active.camp] += rawDamage;
                teamTotals.hpDamageDealt[active.camp] += hpDamage;
              }
            }
          }
        }

        // Anger logic from AS3: CurAnger -= HurtAnger
        if (target.result.hurtAnger !== undefined && target.result.hurtAnger !== 0) {
          fighter.anger -= target.result.hurtAnger;

          if (fighter.anger < 0) fighter.anger = 0;
          if (fighter.anger > 500) fighter.anger = 500;
        }

        if (hasStatusFlag(target.status, 1073741824)) { // bit 1073741824 = Died
          fighter.dead = true;
          fighter.hp = 0;
        }
      }
    }
  }

  return { state, teamTotals };
}

export const FightReportPage: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [buffs, setBuffs] = useState<BuffEffect[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // User input URL / File states
  const [inputUrl, setInputUrl] = useState('');
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Decoded Fight Report
  const [report, setReport] = useState<FightReportData | null>(null);
  const [debugInfo, setDebugInfo] = useState<ParseDebugInfo | null>(null);

  // Tab states
  const [activeTab, setActiveTab] = useState<'analytics' | 'fighters' | 'log'>('analytics');
  const [selectedRoundTab, setSelectedRoundTab] = useState<number>(1);

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);

  // File Drag-Drop Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load database entities for mapping
  const loadDb = async () => {
    try {
      setDbLoading(true);
      setDbError(null);
      const [heroesRes, skillsRes, buffsRes] = await Promise.all([
        loadHeroes(),
        loadSkills(),
        loadBuffEffects()
      ]);
      setHeroes(heroesRes.rows);
      setSkills(skillsRes.rows);
      setBuffs(buffsRes.rows);
    } catch (err: any) {
      console.error(err);
      setDbError("Failed to load heroes, skills, or status buffs mapping templates.");
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    loadDb();
  }, []);

  const heroesMap = useMemo(() => {
    const map = new Map<number, Hero>();
    heroes.forEach(h => map.set(h.id, h));
    return map;
  }, [heroes]);

  const skillsMap = useMemo(() => {
    const map = new Map<number, string>();
    skills.forEach(s => map.set(s.skill_id, s.name || `Skill #${s.skill_id}`));
    return map;
  }, [skills]);

  const buffsMap = useMemo(() => {
    const map = new Map<number, string>();
    buffs.forEach(b => map.set(b.id, b.name || `Buff #${b.id}`));
    return map;
  }, [buffs]);

  // Decode binary data helper
  const decodeReportBinary = (arrayBuffer: ArrayBuffer): { report: FightReportData; debug: ParseDebugInfo } => {
    const parser = new FightReportParser(arrayBuffer);
    const versionStr = parser.readUTF();
    parser.version = parseFloat(versionStr) || 2.0;

    const parseRole = (): FightRole => {
      const pos = parser.readByte();
      const roleId = parser.readUInt();
      const quality = parser.readByte();
      const level = parser.readShort();
      const curHealth = parser.readHealth();
      const totleHealth = parser.readHealth();
      const curAnger = parser.readInt();
      const skillId = parser.readInt();
      const name = parser.readUTF();
      let rebirthNum = 0;
      if (parser.version > 2.0) {
        rebirthNum = parser.readByte();
      }
      return { pos, roleId, quality, level, curHealth, totleHealth, curAnger, skillId, name, rebirthNum };
    };

    const parseGroup = (camp: number): FightGroup => {
      const knifeOfKillSoulId = parser.readInt();
      const knifeSoulId = parser.readInt();
      const bloodAddRate = parser.readInt();
      const count = parser.readShort();
      const roles: FightRole[] = [];
      for (let i = 0; i < count; i++) {
        roles.push(parseRole());
      }
      return { camp, knifeOfKillSoulId, knifeSoulId, bloodAddRate, roles };
    };

    const team1 = parseGroup(0);
    const team2 = parseGroup(1);

    const totalTurns = parser.readShort();
    const turns: FightTurn[] = [];

    for (let t = 0; t < totalTurns; t++) {
      const curTurn = parser.readInt();
      const activeCount = parser.readShort();
      const actives: FightActive[] = [];

      for (let a = 0; a < activeCount; a++) {
        const camp = parser.readByte();
        const pos = parser.readByte();
        const skillEffectId = parser.readInt();
        const activeType = parser.readInt();

        const targetCount = parser.readShort();
        const targets: FightTarget[] = [];

        for (let tg = 0; tg < targetCount; tg++) {
          const cmd = parser.readByte();
          const targetCamp = parser.readByte();
          const targetPos = parser.readByte();
          const status = parser.readUInt();

          const result: any = {};
          if (cmd === CMD.ATTACK || cmd === CMD.ATTACKEX) { // CMD_ATTACK, CMD_ATTACKEX
            result.hurtHp = parser.readInt();
            result.hurtAnger = parser.readInt();
          } else if (cmd === CMD.HURTBUFF) { // CMD_HURTBUFF
            result.hurtHp = parser.readInt();
            result.hurtAnger = parser.readInt();
            result.buffId = parser.readUInt();
          } else if (cmd === CMD.CONTROLBUFF || cmd === CMD.ATTRBUFF || cmd === CMD.SHIELD) { // CMD_CONTROLBUFF, CMD_ATTRBUFF, CMD_SHIELD
            result.buffId = parser.readUInt();
            result.buffTurn = parser.readUInt();
          } else if (cmd === CMD.POSITION || cmd === CMD.FLOAT) { // CMD_POSITION, CMD_FLOAT
            result.buffId = parser.readUInt();
            result.buffTurn = parser.readUInt();
          }

          targets.push({ cmd, camp: targetCamp, pos: targetPos, status, result });
        }

        actives.push({ camp, pos, skillEffectId, activeType, targets });
      }

      turns.push({ curTurn, actives });
    }

    const finalOffset = parser.pos;
    const remainingBytes = arrayBuffer.byteLength - finalOffset;

    if (remainingBytes > 0) {
      console.warn(`Fight report parsed with ${remainingBytes} trailing bytes.`);
    }

    const debug: ParseDebugInfo = {
      byteLength: arrayBuffer.byteLength,
      finalOffset,
      remainingBytes,
      versionString: versionStr,
      version: parser.version,
      roleCounts: [team1.roles.length, team2.roles.length],
      totalTurns
    };

    return {
      report: {
        version: parser.version,
        team1,
        team2,
        totalTurns,
        turns
      },
      debug
    };
  };

  const handleFetchReport = async () => {
    if (!inputUrl.trim()) return;
    setParseLoading(true);
    setParseError(null);
    setReport(null);
    setDebugInfo(null);

    try {
      // Extract rid
      let rid = "";
      let aid = "86";
      let lang = "en_US";

      if (inputUrl.includes('rid=')) {
        const queryStr = inputUrl.split('?')[1] || '';
        const urlParams = new URLSearchParams(queryStr);
        rid = urlParams.get('rid') || "";
        aid = urlParams.get('aid') || "86";
        lang = urlParams.get('lang') || "en_US";
      } else {
        // Assume raw numeric rid
        rid = inputUrl.trim();
      }

      if (!rid) {
        throw new Error("Unable to extract Fight Report ID (rid). Please check your URL format.");
      }

      const targetUrl =
        `https://game.shinigamiworld.com/fightreport/data.php` +
        `?rid=${encodeURIComponent(rid)}` +
        `&aid=${encodeURIComponent(aid)}` +
        `&version=2026021215` +
        `&versiondir=en_Eu` +
        `&cacheKey=frv=1779820963` +
        `&isCombin=0` +
        `&agent=${encodeURIComponent(aid)}` +
        `&server=0` +
        `&lang=${encodeURIComponent(lang)}`;

      // Fetch via CORS Proxy
      const proxyUrl = `https://cors-proxy.shinigamiworld-fightreport.workers.dev/?url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength < 10) {
        throw new Error("Fight report data is empty or invalid. Check that the Report ID exists.");
      }

      const { report: decodedReport, debug: decodedDebug } = decodeReportBinary(arrayBuffer);
      setReport(decodedReport);
      setDebugInfo(decodedDebug);
      setSelectedRoundTab(1);
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || "Failed to load fight report. Please try uploading the file directly.");
    } finally {
      setParseLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
  };

  const processUploadedFile = (file: File) => {
    setParseLoading(true);
    setParseError(null);
    setReport(null);
    setDebugInfo(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength < 10) {
          throw new Error("Uploaded file is empty or corrupted.");
        }
        const { report: decodedReport, debug: decodedDebug } = decodeReportBinary(buffer);
        setReport(decodedReport);
        setDebugInfo(decodedDebug);
        setSelectedRoundTab(1);
      } catch (err: any) {
        console.error(err);
        setParseError(err.message || "Failed to parse fight report binary file.");
      } finally {
        setParseLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Helper: Get localized name
  const resolveRoleName = (role: FightRole): string => {
    if (role.name && role.name.trim()) return role.name;
    const match = heroesMap.get(role.roleId);
    return match?.name || `Mercenary #${role.roleId}`;
  };

  // Calculated Battle Statistics
  const battleStats = useMemo(() => {
    if (!report) return null;

    const { state: finalState, teamTotals } = simulateReportState(report);

    const totalDmgTeam1 = teamTotals.rawDamageDealt[0];
    const totalDmgTeam2 = teamTotals.rawDamageDealt[1];
    const totalHealTeam1 = teamTotals.healingDone[0];
    const totalHealTeam2 = teamTotals.healingDone[1];

    let team1Hp = 0;
    let team2Hp = 0;

    for (const [key, fighter] of finalState.entries()) {
      if (key.startsWith("0_")) {
        team1Hp += fighter.hp;
      } else {
        team2Hp += fighter.hp;
      }
    }

    const winnerCamp = team1Hp > team2Hp ? 0 : 1;

    const allRawDmgValues = Array.from(finalState.values()).map(f => f.damageDealtRaw);
    const maxDamageDoneRaw = Math.max(1, ...allRawDmgValues);

    const allRawTakenValues = Array.from(finalState.values()).map(f => f.damageTakenRaw);
    const maxDamageTakenRaw = Math.max(1, ...allRawTakenValues);

    const allHealValues = Array.from(finalState.values()).map(f => f.healingDone);
    const maxHealing = Math.max(1, ...allHealValues);

    return {
      finalState,
      totalDmgTeam1,
      totalDmgTeam2,
      totalHealTeam1,
      totalHealTeam2,
      winnerCamp,
      team1Hp,
      team2Hp,
      maxDamageDoneRaw,
      maxDamageTakenRaw,
      maxHealing
    };
  }, [report]);

  if (dbLoading) return <LoadingState message="Mapping fighter database assets and configuring packet decoders..." />;
  if (dbError) return <ErrorState message={dbError} onRetry={loadDb} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
            <Swords size={24} />
            <span className="text-xs font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-950/40 px-2.5 py-0.5 rounded">PVP Oracle</span>
          </div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50">Combat Fight Report Analyzer</h1>
          <p className="text-xs text-zinc-550 max-w-xl">
            Input a fight report URL or upload a downloaded fight report binary to reveal round-by-round combat replays, dealt DPS logs, and damage charts.
          </p>
        </div>
      </div>

      {/* Input panel: URL pasted and Drag-Drop Uploader */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fetch URL Card */}
        <div className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-zinc-850 dark:text-zinc-150 flex items-center gap-2">
            <Search size={16} className="text-violet-500" />
            <span>Analyze via Fight Report URL</span>
          </h3>
          <p className="text-xs text-zinc-500">
            Paste the full in-game fight report web link. The tool will parse the Report ID (`rid`) and download the combat stream automatically.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="https://game.shinigamiworld.com/fightreport/?rid=287713052178748..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-250 focus:outline-none focus:ring-1.5 focus:ring-violet-500 placeholder-zinc-400 font-medium"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setInputUrl('https://game.shinigamiworld.com/fightreport/?rid=287713052178748&aid=86&t=1&lang=en_US')}
                className="text-[10px] text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer"
              >
                Click to load sample URL
              </button>
              <button
                onClick={handleFetchReport}
                disabled={parseLoading || !inputUrl.trim()}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-violet-500/10"
              >
                <Play size={12} />
                <span>{parseLoading ? 'Loading...' : 'Fetch & Decode'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Drag-Drop Card */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            const file = e.dataTransfer.files?.[0];
            if (file) processUploadedFile(file);
          }}
          className={`p-6 border-2 border-dashed rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer group transition-all ${isDragging
            ? 'border-violet-500 bg-violet-50/10 dark:bg-violet-950/10 scale-[1.02]'
            : 'border-zinc-300 dark:border-zinc-800 hover:border-violet-500 dark:hover:border-violet-500/50 bg-white dark:bg-zinc-900'
            }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".bin,.php"
            className="hidden"
          />
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-full group-hover:scale-105 transition-all text-zinc-400 group-hover:text-violet-500">
            <UploadCloud size={28} />
          </div>
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Drag & drop your report binary file here</span>
            <span className="text-[10px] text-zinc-450 block">Supports `.bin` and `data.php` formats</span>
          </div>
        </div>
      </div>

      {parseError && (
        <div className="p-4 border border-rose-200 dark:border-rose-950/60 bg-rose-50/50 dark:bg-rose-950/10 rounded-xl text-xs flex items-start gap-2 text-rose-600 dark:text-rose-455">
          <ShieldAlert size={16} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Error Fetching Report</span>
            <p>{parseError}</p>
          </div>
        </div>
      )}

      {/* Fight Report Loaded Details */}
      {report && battleStats && (
        <div className="space-y-6">
          {/* Winner Banner */}
          <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-xl text-center font-black shadow-md shadow-violet-600/10">
                <span className="text-[10px] block font-mono leading-none mb-0.5">VERSION</span>
                <span className="text-sm font-mono leading-none">{report.version.toFixed(1)}</span>
              </div>
              <div>
                <h3 className="font-extrabold text-base text-zinc-800 dark:text-zinc-150">
                  {resolveRoleName(report.team1.roles[0])} vs {resolveRoleName(report.team2.roles[0])}
                </h3>
                <span className="text-xs text-zinc-450">
                  Arena Match concluded in <span className="font-bold text-zinc-700 dark:text-zinc-300">{report.totalTurns} Turns</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-bold uppercase">Victor:</span>
              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 shadow-sm border border-emerald-300/20">
                {battleStats.winnerCamp === 0 ? 'Team 1 (Attacker)' : 'Team 2 (Defender)'}
              </span>
            </div>
          </div>

          {/* Statistics Navigation Tabs */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 flex gap-4 text-xs md:text-sm font-semibold">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${activeTab === 'analytics'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
            >
              Battle Analytics
            </button>
            <button
              onClick={() => setActiveTab('fighters')}
              className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${activeTab === 'fighters'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
            >
              Fighters Stats Matrix
            </button>
            <button
              onClick={() => setActiveTab('log')}
              className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${activeTab === 'log'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
            >
              Combat Replay Log
            </button>
          </div>

          {/* Caveat callout */}
          <div className="p-3.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-xl text-[11px] text-zinc-500 flex items-start gap-2">
            <Info size={16} className="text-violet-500 shrink-0 mt-0.5" />
            <p>
              <span className="font-bold text-zinc-700 dark:text-zinc-300">Analyzer Caveat:</span> Damage and effects are server-resolved values from the binary report. The report does not include full formula inputs such as final Defense, Pierce, or damage modifiers, so this analyzer reconstructs replay outcomes instead of recalculating the original formula. Team totals may include system/pet/field actions that are not listed as normal fighters.
            </p>
          </div>

          {/* Tab 1: General comparison bar charts */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Damage Charts */}
              <div className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <TrendingUp size={16} className="text-red-500" />
                  <span className="font-bold text-xs uppercase text-zinc-450 tracking-wider">Total Damage Dealt</span>
                </div>
                <div className="space-y-4 py-2">
                  {/* Team 1 bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Team 1 (Attacker)</span>
                      <span className="font-mono font-bold text-red-500">{battleStats.totalDmgTeam1.toLocaleString()} HP</span>
                    </div>
                    <div className="w-full h-3.5 bg-zinc-100 dark:bg-zinc-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-rose-600 transition-all duration-500 rounded-full"
                        style={{ width: `${Math.max(5, (battleStats.totalDmgTeam1 / (battleStats.totalDmgTeam1 + battleStats.totalDmgTeam2 || 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Team 2 bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Team 2 (Defender)</span>
                      <span className="font-mono font-bold text-red-500">{battleStats.totalDmgTeam2.toLocaleString()} HP</span>
                    </div>
                    <div className="w-full h-3.5 bg-zinc-100 dark:bg-zinc-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-600 to-indigo-600 transition-all duration-500 rounded-full"
                        style={{ width: `${Math.max(5, (battleStats.totalDmgTeam2 / (battleStats.totalDmgTeam1 + battleStats.totalDmgTeam2 || 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Healing Charts */}
              <div className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <Heart size={16} className="text-emerald-500" />
                  <span className="font-bold text-xs uppercase text-zinc-450 tracking-wider">Total Healing Done</span>
                </div>
                <div className="space-y-4 py-2">
                  {/* Team 1 bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Team 1 (Attacker)</span>
                      <span className="font-mono font-bold text-emerald-500">{battleStats.totalHealTeam1.toLocaleString()} HP</span>
                    </div>
                    <div className="w-full h-3.5 bg-zinc-100 dark:bg-zinc-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500 rounded-full"
                        style={{ width: `${Math.max(5, (battleStats.totalHealTeam1 / (battleStats.totalHealTeam1 + battleStats.totalHealTeam2 || 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Team 2 bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Team 2 (Defender)</span>
                      <span className="font-mono font-bold text-emerald-500">{battleStats.totalHealTeam2.toLocaleString()} HP</span>
                    </div>
                    <div className="w-full h-3.5 bg-zinc-100 dark:bg-zinc-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-600 to-cyan-500 transition-all duration-500 rounded-full"
                        style={{ width: `${Math.max(5, (battleStats.totalHealTeam2 / (battleStats.totalHealTeam1 + battleStats.totalHealTeam2 || 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Detailed Hero grid columns */}
          {activeTab === 'fighters' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team 1 List */}
              <div className="space-y-4">
                <h3 className="font-bold text-xs uppercase text-zinc-450 tracking-wider px-1">Team 1 (Attacker)</h3>
                <div className="space-y-3">
                  {report.team1.roles.map((r, idx) => {
                    const fighterState = battleStats.finalState.get(`0_${r.pos}`);
                    const dmgRaw = fighterState?.damageDealtRaw || 0;
                    const dmgHp = fighterState?.hpDamageDealt || 0;
                    const takenRaw = fighterState?.damageTakenRaw || 0;
                    const takenHp = fighterState?.hpDamageTaken || 0;
                    const healsDone = fighterState?.healingDone || 0;
                    const healsRec = fighterState?.healingReceived || 0;
                    const finalHp = fighterState?.hp || 0;
                    const maxHp = fighterState?.maxHp || r.totleHealth;
                    const finalShield = fighterState?.shield || 0;
                    const shieldApplied = fighterState?.shieldApplied || 0;
                    const finalAnger = fighterState?.anger || 0;
                    const isDead = fighterState?.dead || false;

                    return (
                      <div key={idx} className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm space-y-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                        <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-zinc-50 dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-500">
                              Pos {r.pos}
                            </span>
                            <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{resolveRoleName(r)}</span>
                            {isDead ? (
                              <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 rounded text-[9px] font-bold uppercase tracking-wider">
                                Fallen
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 rounded text-[9px] font-bold uppercase tracking-wider">
                                Surviving
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-450 font-mono">
                            {r.rebirthNum ? <span>R{r.rebirthNum}</span> : null}
                            <span>Lv. {r.level}</span>
                          </div>
                        </div>

                        {/* HP & Shield & Anger status summary */}
                        <div className="grid grid-cols-3 gap-2 py-1.5 text-[10px] border-b border-dashed border-zinc-100 dark:border-zinc-800/80">
                          <div className="space-y-0.5">
                            <span className="text-zinc-400 block font-medium uppercase tracking-wider text-[8px]">Health</span>
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300 block font-mono">
                              {finalHp.toLocaleString()} / {maxHp.toLocaleString()}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-zinc-400 block font-medium uppercase tracking-wider text-[8px]">Shield (Final / Applied)</span>
                            <span className="font-semibold text-blue-500 block font-mono">
                              {finalShield.toLocaleString()} / {shieldApplied.toLocaleString()}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-zinc-400 block font-medium uppercase tracking-wider text-[8px]">Anger</span>
                            <span className="font-semibold text-amber-500 block font-mono">
                              {finalAnger}
                            </span>
                          </div>
                        </div>

                        {/* Attribute progress bars */}
                        <div className="space-y-2 text-xs pt-1">
                          {/* Damage done */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-400">Damage Dealt (Raw / HP Dmg)</span>
                              <span className="font-mono font-bold text-red-500">
                                {dmgRaw.toLocaleString()} <span className="text-zinc-450 text-[10px]">/ {dmgHp.toLocaleString()}</span> HP
                              </span>
                            </div>
                            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-950 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-500 rounded-full"
                                style={{ width: `${(dmgRaw / battleStats.maxDamageDoneRaw) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Damage taken */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-400">Damage Taken (Raw / HP Dmg)</span>
                              <span className="font-mono font-bold text-orange-500">
                                {takenRaw.toLocaleString()} <span className="text-zinc-450 text-[10px]">/ {takenHp.toLocaleString()}</span> HP
                              </span>
                            </div>
                            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-950 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full"
                                style={{ width: `${(takenRaw / battleStats.maxDamageTakenRaw) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Healing done */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-400">Healing (Done / Received)</span>
                              <span className="font-mono font-bold text-emerald-500">
                                {healsDone.toLocaleString()} <span className="text-zinc-450 text-[10px]">/ {healsRec.toLocaleString()}</span> HP
                              </span>
                            </div>
                            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-950 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${(healsDone / battleStats.maxHealing) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Team 2 List */}
              <div className="space-y-4">
                <h3 className="font-bold text-xs uppercase text-zinc-450 tracking-wider px-1">Team 2 (Defender)</h3>
                <div className="space-y-3">
                  {report.team2.roles.map((r, idx) => {
                    const fighterState = battleStats.finalState.get(`1_${r.pos}`);
                    const dmgRaw = fighterState?.damageDealtRaw || 0;
                    const dmgHp = fighterState?.hpDamageDealt || 0;
                    const takenRaw = fighterState?.damageTakenRaw || 0;
                    const takenHp = fighterState?.hpDamageTaken || 0;
                    const healsDone = fighterState?.healingDone || 0;
                    const healsRec = fighterState?.healingReceived || 0;
                    const finalHp = fighterState?.hp || 0;
                    const maxHp = fighterState?.maxHp || r.totleHealth;
                    const finalShield = fighterState?.shield || 0;
                    const shieldApplied = fighterState?.shieldApplied || 0;
                    const finalAnger = fighterState?.anger || 0;
                    const isDead = fighterState?.dead || false;

                    return (
                      <div key={idx} className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm space-y-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                        <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-zinc-50 dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-500">
                              Pos {r.pos}
                            </span>
                            <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{resolveRoleName(r)}</span>
                            {isDead ? (
                              <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 rounded text-[9px] font-bold uppercase tracking-wider">
                                Fallen
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 rounded text-[9px] font-bold uppercase tracking-wider">
                                Surviving
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-450 font-mono">
                            {r.rebirthNum ? <span>R{r.rebirthNum}</span> : null}
                            <span>Lv. {r.level}</span>
                          </div>
                        </div>

                        {/* HP & Shield & Anger status summary */}
                        <div className="grid grid-cols-3 gap-2 py-1.5 text-[10px] border-b border-dashed border-zinc-100 dark:border-zinc-800/80">
                          <div className="space-y-0.5">
                            <span className="text-zinc-400 block font-medium uppercase tracking-wider text-[8px]">Health</span>
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300 block font-mono">
                              {finalHp.toLocaleString()} / {maxHp.toLocaleString()}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-zinc-400 block font-medium uppercase tracking-wider text-[8px]">Shield (Final / Applied)</span>
                            <span className="font-semibold text-blue-500 block font-mono">
                              {finalShield.toLocaleString()} / {shieldApplied.toLocaleString()}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-zinc-400 block font-medium uppercase tracking-wider text-[8px]">Anger</span>
                            <span className="font-semibold text-amber-500 block font-mono">
                              {finalAnger}
                            </span>
                          </div>
                        </div>

                        {/* Attribute progress bars */}
                        <div className="space-y-2 text-xs pt-1">
                          {/* Damage done */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-400">Damage Dealt (Raw / HP Dmg)</span>
                              <span className="font-mono font-bold text-red-500">
                                {dmgRaw.toLocaleString()} <span className="text-zinc-450 text-[10px]">/ {dmgHp.toLocaleString()}</span> HP
                              </span>
                            </div>
                            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-950 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-500 rounded-full"
                                style={{ width: `${(dmgRaw / battleStats.maxDamageDoneRaw) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Damage taken */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-400">Damage Taken (Raw / HP Dmg)</span>
                              <span className="font-mono font-bold text-orange-500">
                                {takenRaw.toLocaleString()} <span className="text-zinc-450 text-[10px]">/ {takenHp.toLocaleString()}</span> HP
                              </span>
                            </div>
                            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-950 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full"
                                style={{ width: `${(takenRaw / battleStats.maxDamageTakenRaw) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Healing done */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-400">Healing (Done / Received)</span>
                              <span className="font-mono font-bold text-emerald-500">
                                {healsDone.toLocaleString()} <span className="text-zinc-450 text-[10px]">/ {healsRec.toLocaleString()}</span> HP
                              </span>
                            </div>
                            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-950 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${(healsDone / battleStats.maxHealing) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Detailed Chronological Replay logs grouped by turn round */}
          {activeTab === 'log' && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Left Column: Round selectors */}
              <div className="xl:col-span-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-zinc-850 dark:text-zinc-150 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  Fight Rounds
                </h3>
                <div className="flex flex-row xl:flex-col gap-2 overflow-x-auto">
                  {report.turns.map(t => (
                    <button
                      key={t.curTurn}
                      onClick={() => setSelectedRoundTab(t.curTurn)}
                      className={`py-2.5 px-4 rounded-xl border text-xs font-bold text-left transition-all shrink-0 cursor-pointer ${selectedRoundTab === t.curTurn
                        ? 'border-violet-500 bg-violet-500/5 text-violet-900 dark:text-violet-400'
                        : 'border-zinc-100 dark:border-zinc-800 text-zinc-650 hover:bg-zinc-50 dark:hover:bg-zinc-950'
                        }`}
                    >
                      Round {t.curTurn} Replay
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Events sequence */}
              <div className="xl:col-span-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-zinc-850 dark:text-zinc-150 border-b border-zinc-100 dark:border-zinc-800 pb-2.5 flex items-center gap-2">
                  <ListOrdered size={16} className="text-violet-500" />
                  <span>Action Sequences (Round {selectedRoundTab})</span>
                </h3>

                <div className="space-y-4 divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {report.turns.find(t => t.curTurn === selectedRoundTab)?.actives.map((act, actIdx) => {
                    const attackerCamp = act.camp;
                    const attackerPos = act.pos;
                    const attackerGroup = attackerCamp === 0 ? report.team1 : report.team2;
                    const attackerRole = attackerGroup.roles.find(r => r.pos === attackerPos);
                    const attackerName = attackerRole ? resolveRoleName(attackerRole) : `Fighter Pos ${attackerPos}`;

                    // Determine Action label
                    let actionLabel = "attacks";
                    if (act.activeType === ACTIVE_TYPE.SKILL_ATTACK) {
                      const skillName = skillsMap.get(act.skillEffectId) || `Skill #${act.skillEffectId}`;
                      actionLabel = `casts Skill [${skillName}]`;
                    } else if (act.activeType === ACTIVE_TYPE.NORMAL_ATTACK || act.activeType === ACTIVE_TYPE.NORMAL_ATTACK_EX) {
                      actionLabel = act.activeType === ACTIVE_TYPE.NORMAL_ATTACK_EX ? "attacks with Normal Strike EX" : "attacks with Normal Strike";
                    } else if (act.activeType === ACTIVE_TYPE.BLOCK) {
                      actionLabel = "blocks / counterattacks";
                    } else if (act.activeType === ACTIVE_TYPE.PASSIVE_SKILL) {
                      actionLabel = "procs Passive Skill";
                    } else if (act.activeType === ACTIVE_TYPE.DIED_SKILL) {
                      actionLabel = "triggers Death Skill";
                    } else if (act.activeType === ACTIVE_TYPE.ROUND_SKILL) {
                      actionLabel = "triggers Round Skill";
                    } else {
                      actionLabel = `performs Action Type #${act.activeType}`;
                    }

                    return (
                      <div key={actIdx} className={`pt-4 ${actIdx === 0 ? 'pt-0' : ''} space-y-2`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-zinc-450 uppercase">ACTION #{actIdx + 1}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${attackerCamp === 0
                            ? 'bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-400'
                            : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-400'
                            }`}>
                            {attackerCamp === 0 ? 'Team 1 (Attacker)' : 'Team 2 (Defender)'}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          <span className="font-bold text-violet-600 dark:text-violet-400">{attackerName}</span> {actionLabel}:
                        </p>

                        <div className="pl-4 space-y-1 border-l-2 border-zinc-100 dark:border-zinc-800/80">
                          {act.targets.map((tgt, tgtIdx) => {
                            const tCamp = tgt.camp;
                            const tPos = tgt.pos;
                            const tGroup = tCamp === 0 ? report.team1 : report.team2;
                            const tRole = tGroup.roles.find(r => r.pos === tPos);
                            const tName = tRole ? resolveRoleName(tRole) : `Target Pos ${tPos}`;
                            const hurtHp = tgt.result.hurtHp || 0;

                            let logText = "";
                            let logClass = "text-zinc-500 dark:text-zinc-400";

                            const getBuffName = (bId: number): string => {
                              if (bId === 4294967295) return "Generic Buff";
                              if (bId === 0) return "Null Buff";
                              return buffsMap.get(bId) || `Buff #${bId}`;
                            };

                            if (tgt.cmd === CMD.ATTACK || tgt.cmd === CMD.ATTACKEX || tgt.cmd === CMD.HURTBUFF) {
                              if (hurtHp > 0) {
                                const flags = decodeStatusFlags(tgt.status);
                                const suffix = flags.length ? ` (${flags.join(", ")})` : "";
                                logText = `Hits ${tName} (Pos ${tPos}) dealing ${hurtHp.toLocaleString()} damage${suffix}.`;
                                logClass = "text-red-600 dark:text-red-400 font-medium";
                              } else if (hurtHp < 0) {
                                logText = `Heals ${tName} (Pos ${tPos}) for ${(-hurtHp).toLocaleString()} HP.`;
                                logClass = "text-emerald-600 dark:text-emerald-450 font-medium";
                              } else {
                                const flags = decodeStatusFlags(tgt.status);
                                if (flags.includes("Super Dodge / All Miss")) {
                                  logText = `${tName} (Pos ${tPos}) dodges / all-misses the effect.`;
                                } else if (flags.includes("Invincible")) {
                                  logText = `${tName} (Pos ${tPos}) takes no damage due to Invincible.`;
                                } else if (flags.includes("Block")) {
                                  logText = `${tName} (Pos ${tPos}) blocks the hit with no HP loss.`;
                                } else {
                                  logText = `Targets ${tName} (Pos ${tPos}) with no HP change${flags.length ? ` (${flags.join(", ")})` : ""}.`;
                                }
                                logClass = "text-zinc-500 dark:text-zinc-400";
                              }
                            } else if (tgt.cmd === CMD.SHIELD) {
                              const sId = tgt.result.buffId || 0;
                              const shieldHp = tgt.result.buffTurn || 0;
                              if (shieldHp === 0) {
                                logText = `Removes Shield [${getBuffName(sId)}] from ${tName} (Pos ${tPos}).`;
                              } else {
                                logText = `Applies Shield [${getBuffName(sId)}] on ${tName} (Pos ${tPos}) with ${shieldHp.toLocaleString()} shield HP.`;
                              }
                              logClass = "text-blue-600 dark:text-blue-400 font-medium";
                            } else if (tgt.cmd === CMD.ATTRBUFF || tgt.cmd === CMD.CONTROLBUFF) {
                              const bId = tgt.result.buffId || 0;
                              const turnOrType = tgt.result.buffTurn || 0;
                              if (bId > 0 && turnOrType > 0) {
                                logText = `Applies Buff [${getBuffName(bId)}] on ${tName} (Pos ${tPos}) for ${turnOrType} rounds.`;
                              } else if (turnOrType > 0) {
                                logText = `Removes/clears buff type #${turnOrType} from ${tName} (Pos ${tPos}).`;
                              } else if (bId > 0) {
                                logText = `Removes/clears Buff [${getBuffName(bId)}] from ${tName} (Pos ${tPos}).`;
                              } else {
                                logText = `Cleanses/clears temporary buffs/debuffs from ${tName} (Pos ${tPos}).`;
                              }
                              logClass = "text-purple-600 dark:text-purple-400";
                            } else if (tgt.cmd === CMD.POSITION) {
                              const newPos = tgt.result.buffTurn || tPos;
                              logText = `Moves ${tName} from position ${tPos} to position ${newPos}.`;
                              logClass = "text-amber-600 dark:text-amber-400";
                            } else if (tgt.cmd === CMD.FLOAT) {
                              const effectType = tgt.result.buffId || 0;
                              const effectParam = tgt.result.buffTurn || 0;
                              logText = `Shows special combat effect [${getSpecialFloatText(effectType)}] on ${tName} (Pos ${tPos})${effectParam ? `, parameter ${effectParam}` : ""}.`;
                              logClass = "text-teal-600 dark:text-teal-400";
                            } else if (tgt.cmd === CMD.STATUS) {
                              const flags = decodeStatusFlags(tgt.status);
                              logText = flags.length
                                ? `Updates combat status for ${tName} (Pos ${tPos}): ${flags.join(", ")}.`
                                : `Updates combat status for ${tName} (Pos ${tPos}).`;
                              logClass = "text-zinc-500 dark:text-zinc-400";
                            } else if (tgt.cmd === CMD.NONE) {
                              logText = `Triggers script action / combat visual on ${tName} (Pos ${tPos}).`;
                              logClass = "text-zinc-450 dark:text-zinc-550";
                            } else {
                              logText = `Performs CMD action #${tgt.cmd} on ${tName} (Pos ${tPos}).`;
                              logClass = "text-zinc-450 dark:text-zinc-550";
                            }

                            return (
                              <div key={tgtIdx} className={`text-xs flex items-center justify-between ${logClass}`}>
                                <span>↳ {logText}</span>
                                {tgt.result.hurtAnger !== undefined && tgt.result.hurtAnger !== 0 && (
                                  <span className="font-mono text-[10px] text-orange-500">
                                    Anger: {tgt.result.hurtAnger > 0 ? `+${tgt.result.hurtAnger}` : tgt.result.hurtAnger}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
