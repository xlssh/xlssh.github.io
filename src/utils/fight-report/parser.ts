// --- Binary parser helper class and types for Fight Report ---

export class FightReportParser {
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
export const CMD = {
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
export const ACTIVE_TYPE = {
  NORMAL_ATTACK: 1,
  SKILL_ATTACK: 2,
  BLOCK: 3,
  PASSIVE_SKILL: 4,
  DIED_SKILL: 5,
  NORMAL_ATTACK_EX: 7,
  ROUND_SKILL: 10,
} as const;

// --- Full Confirmed Status Flags ---
export const STATUS_FLAGS: Record<number, string> = {
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
export const SPECIAL_TEXT_TYPES: Record<number, string> = {
  1: "Shield Cleared",
  2: "Triple Damage",
  3: "Ignore Damage",
  4: "Defense Failure",
  5: "Full HP",
  6: "Instant Kill",
  7: "Ignore Instant Kill",
};

// --- Helper Functions ---
export function decodeStatusFlags(statusNum: number): string[] {
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

export function getSpecialFloatText(buffId: number): string {
  return SPECIAL_TEXT_TYPES[buffId] || `Special Text #${buffId}`;
}

export function hasStatusFlag(status: number, flag: number): boolean {
  if (flag === 2147483648) {
    return status >= 2147483648;
  }
  return (status & flag) !== 0;
}

// --- Data structures ---
export interface FightRole {
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

export interface FightGroup {
  camp: number;
  knifeOfKillSoulId: number;
  knifeSoulId: number;
  bloodAddRate: number;
  roles: FightRole[];
}

export interface FightTarget {
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
  hpBefore?: number;
  hpAfter?: number;
  shieldBefore?: number;
  shieldAfter?: number;
  maxHp?: number;
}

export interface FightActive {
  camp: number;
  pos: number;
  skillEffectId: number;
  activeType: number;
  targets: FightTarget[];
}

export interface FightTurn {
  curTurn: number;
  actives: FightActive[];
}

export interface FightReportData {
  version: number;
  team1: FightGroup;
  team2: FightGroup;
  totalTurns: number;
  turns: FightTurn[];
}

export interface ParseDebugInfo {
  byteLength: number;
  finalOffset: number;
  remainingBytes: number;
  versionString: string;
  version: number;
  roleCounts: [number, number];
  totalTurns: number;
}
