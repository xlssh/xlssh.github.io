import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { loadHeroes, loadSkills, loadBuffEffects, loadEnemies, loadKnives, loadKnifeExpands } from '../data/loaders';
import { Hero, Skill, BuffEffect, Enemy, Knife, KnifeExpand } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

import {
  Swords,
  Search,
  FileCode,
  UploadCloud,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ListOrdered,
  Award,
  Download,
  Copy,
  Clock,
  Sparkles,
  Trophy,
  Filter
} from 'lucide-react';

// Import modular types, utilities and parsers
import {
  FightReportParser,
  CMD,
  ACTIVE_TYPE,
  decodeStatusFlags,
  getSpecialFloatText,
  hasStatusFlag,
  FightRole,
  FightGroup,
  FightReportData,
  ParseDebugInfo,
  FightTurn,
  FightActive,
  FightTarget
} from '../utils/fight-report/parser';

import {
  simulateFightReport,
  KeyMoment,
  computeInsights,
  Insight
} from '../utils/fight-report/simulation';

import {
  downloadJson,
  downloadCsv,
  generateSummaryText
} from '../utils/fight-report/export';

// Import subcomponents
import { RoundNavigator, TurnHighlight } from '../components/fight-report/RoundNavigator';
import { FighterTeamPanel } from '../components/fight-report/FighterTeamPanel';
import { KeyMomentsPanel } from '../components/fight-report/KeyMomentsPanel';
import { TimelineTab } from '../components/fight-report/TimelineTab';
import { SkillsTab } from '../components/fight-report/SkillsTab';
import { BuffsTab } from '../components/fight-report/BuffsTab';
import { DeathsTab } from '../components/fight-report/DeathsTab';
import { FighterFocusModal } from '../components/fight-report/FighterFocusModal';

interface RecentReport {
  rid: string;
  aid: string;
  lang: string;
  timestamp: number;
}

interface CachedFightReport {
  rid: string;
  aid: string;
  lang: string;
  timestamp: number;
  report: FightReportData;
  debug: ParseDebugInfo;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 Minutes Cache TTL

function getCachedReport(rid: string): CachedFightReport | null {
  try {
    const raw = sessionStorage.getItem(`fight_report_cache:${rid}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedFightReport;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(`fight_report_cache:${rid}`);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function setCachedReport(entry: CachedFightReport): void {
  try {
    sessionStorage.setItem(
      `fight_report_cache:${entry.rid}`,
      JSON.stringify(entry)
    );
  } catch {
    // Ignore quota errors gracefully
  }
}

const formatCompact = (val: number) => {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(val);
};

async function computeSha256(buffer: ArrayBuffer): Promise<string> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return "";
  }
}

export const FightReportPage: React.FC = () => {
  // Database loader states
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [buffs, setBuffs] = useState<BuffEffect[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [knives, setKnives] = useState<Knife[]>([]);
  const [knifeExpands, setKnifeExpands] = useState<KnifeExpand[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // User interface state controllers
  const [inputUrl, setInputUrl] = useState('');
  const [parseStage, setParseStage] = useState<'idle' | 'validating' | 'fetching' | 'parsing' | 'simulating' | 'finalizing' | 'done' | 'error'>('idle');
  const [parseError, setParseError] = useState<string | null>(null);

  // Core model state
  const [report, setReport] = useState<FightReportData | null>(null);
  const [debugInfo, setDebugInfo] = useState<ParseDebugInfo | null>(null);

  // Navigation tab states
  const [activeTab, setActiveTab] = useState<'overview' | 'fighters' | 'timeline' | 'skills' | 'buffs' | 'deaths' | 'log'>('overview');
  const [selectedRoundTab, setSelectedRoundTab] = useState<number>(1);
  const [highlightedMomentId, setHighlightedMomentId] = useState<string | null>(null);

  // Fighter focus drill-down modal state
  const [focusedFighterKey, setFocusedFighterKey] = useState<string | null>(null);

  // Cryptographic authenticity digest state
  const [sha256Hash, setSha256Hash] = useState<string>('');

  // Clipboard copy feedback toast
  const [copiedText, setCopiedText] = useState(false);

  // Log filter controls
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'damage' | 'heal' | 'death' | 'buff' | 'shield' | 'crit'>('all');

  // Replay playback states
  const [activeActionIdx, setActiveActionIdx] = useState<number>(0);
  const [activeTargetIdx, setActiveTargetIdx] = useState<number>(-1); // -1 means show whole action at once (default)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1500); // ms per action step

  // Reset active action on round change
  useEffect(() => {
    setActiveActionIdx(0);
    setActiveTargetIdx(-1);
    setIsPlaying(false);
  }, [selectedRoundTab]);

  // Handle auto-playback timing loop (micro-stepping through targets and actions)
  useEffect(() => {
    if (!isPlaying || !report) return;
    const activeRound = report.turns.find(t => t.curTurn === selectedRoundTab);
    if (!activeRound) return;

    const interval = setInterval(() => {
      const currentAct = activeRound.actives[activeActionIdx];
      if (!currentAct) {
        setIsPlaying(false);
        return;
      }

      setActiveTargetIdx(prevTgt => {
        const currentIdx = prevTgt < 0 ? -1 : prevTgt;
        if (currentIdx < currentAct.targets.length - 1) {
          return currentIdx + 1;
        } else {
          const nextActIdx = activeActionIdx + 1;
          if (nextActIdx < activeRound.actives.length) {
            setActiveActionIdx(nextActIdx);
            return 0; // First target of next action
          } else {
            setIsPlaying(false);
            return prevTgt;
          }
        }
      });
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, selectedRoundTab, activeActionIdx, report]);

  // Local Storage trigger to re-render history
  const [historyTrigger, setHistoryTrigger] = useState(0);

  // Drag and Drop uploader state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Mapping Databases
  const loadDb = async () => {
    try {
      setDbLoading(true);
      setDbError(null);
      const [heroesRes, skillsRes, buffsRes, enemiesRes, knivesRes, knifeExpandsRes] = await Promise.all([
        loadHeroes(),
        loadSkills(),
        loadBuffEffects(),
        loadEnemies(),
        loadKnives(),
        loadKnifeExpands()
      ]);
      setHeroes(heroesRes.rows);
      setSkills(skillsRes.rows);
      setBuffs(buffsRes.rows);
      setEnemies(enemiesRes.rows);
      setKnives(knivesRes.rows);
      setKnifeExpands(knifeExpandsRes.rows);
    } catch (err: any) {
      console.error(err);
      setDbError("Failed to map combat components: could not fetch game metadata templates.");
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    loadDb();
  }, []);

  // Map converters
  const heroesMap = useMemo(() => {
    const map = new Map<number, Hero>();
    heroes.forEach(h => map.set(h.id, h));
    return map;
  }, [heroes]);

  const enemiesMap = useMemo(() => {
    const map = new Map<number, Enemy>();
    enemies.forEach(e => map.set(e.id, e));
    return map;
  }, [enemies]);

  const skillsMap = useMemo(() => {
    const map = new Map<number, string>();
    skills.forEach(s => {
      if (s.id) {
        map.set(s.id, s.name || `Skill #${s.id}`);
      }
      if (s.skill_id) {
        map.set(s.skill_id, s.name || `Skill #${s.skill_id}`);
      }
    });
    return map;
  }, [skills]);

  const buffsMap = useMemo(() => {
    const map = new Map<number, string>();
    buffs.forEach(b => map.set(b.id, b.name || `Buff #${b.id}`));
    map.set(4294967295, 'Generic Buff');
    return map;
  }, [buffs]);

  const knivesMap = useMemo(() => {
    const map = new Map<number, Knife>();
    knives.forEach(k => map.set(k.id, k));
    return map;
  }, [knives]);

  const knifeExpandsMap = useMemo(() => {
    const map = new Map<number, KnifeExpand>();
    knifeExpands.forEach(ke => map.set(ke.id, ke));
    return map;
  }, [knifeExpands]);

  // Translate role name
  const resolveRoleName = useCallback((role: FightRole): string => {
    if (role.name && role.name.trim()) return role.name;
    const match = heroesMap.get(role.roleId);
    if (match && match.name) return match.name;
    const enemyMatch = enemiesMap.get(role.roleId);
    if (enemyMatch && enemyMatch.name) return enemyMatch.name;
    return `Mercenary #${role.roleId}`;
  }, [heroesMap, enemiesMap]);

  // Translate attacker name, resolving pos 100 as the team's Zanpakuto (Knife)
  const resolveAttackerName = useCallback((camp: number, pos: number, role?: FightRole): string => {
    if (pos === 100) {
      const group = camp === 0 ? report?.team1 : report?.team2;
      const knifeId = group?.knifeOfKillSoulId || 0;
      if (knifeId > 0) {
        const expandMatch = knifeExpandsMap.get(knifeId);
        const relationId = expandMatch ? expandMatch.relation_id : knifeId;
        const match = knivesMap.get(relationId);
        if (match && match.name) return match.name;
      }
      return "Zanpakuto (Knife)";
    }
    if (role) return resolveRoleName(role);
    return `Fighter Pos ${pos}`;
  }, [report, knivesMap, knifeExpandsMap, resolveRoleName]);

  // Inline URL validators
  const urlValidation = useMemo(() => {
    if (!inputUrl.trim()) return { valid: false, message: "" };

    if (inputUrl.includes('rid=')) {
      try {
        const queryStr = inputUrl.split('?')[1] || '';
        const params = new URLSearchParams(queryStr);
        const rid = params.get('rid');
        if (!rid) return { valid: false, message: "URL lacks report ID (?rid=)." };
        return { valid: true, rid };
      } catch {
        return { valid: false, message: "Invalid URL string format." };
      }
    } else {
      // Must be purely numeric string
      if (/^\d+$/.test(inputUrl.trim())) {
        return { valid: true, rid: inputUrl.trim() };
      }
      return { valid: false, message: "Enter a valid URL or numeric Report ID." };
    }
  }, [inputUrl]);

  // Decode binary buffer
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
          if (cmd === CMD.ATTACK || cmd === CMD.ATTACKEX) {
            result.hurtHp = parser.readInt();
            result.hurtAnger = parser.readInt();
          } else if (cmd === CMD.HURTBUFF) {
            result.hurtHp = parser.readInt();
            result.hurtAnger = parser.readInt();
            result.buffId = parser.readUInt();
          } else if (cmd === CMD.CONTROLBUFF || cmd === CMD.ATTRBUFF || cmd === CMD.SHIELD) {
            result.buffId = parser.readUInt();
            result.buffTurn = parser.readUInt();
          } else if (cmd === CMD.POSITION || cmd === CMD.FLOAT) {
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

  // Load and execute remote link fetch
  const handleFetchReport = useCallback(async (overrideUrl?: string) => {
    const targetQuery = overrideUrl || inputUrl;
    if (!targetQuery.trim()) return;

    setParseStage('validating');
    setParseError(null);
    setReport(null);
    setDebugInfo(null);

    try {
      let rid = "";
      let aid = "86";
      let lang = "en_US";
      let version = "2026021215";
      let versiondir = "en_Eu";
      let isCombin = "0";
      let server = "0";
      let agent = "86";

      if (targetQuery.includes('rid=')) {
        const queryStr = targetQuery.split('?')[1] || '';
        const params = new URLSearchParams(queryStr);
        rid = params.get('rid') || "";
        aid = params.get('aid') || params.get('agent') || "86";
        agent = params.get('agent') || params.get('aid') || "86";
        lang = params.get('lang') || "en_US";
        version = params.get('version') || "2026021215";
        versiondir = params.get('versiondir') || "en_Eu";
        isCombin = params.get('isCombin') || params.get('isCombine') || "0";
        server = params.get('server') || "0";
      } else {
        rid = targetQuery.trim();
      }

      if (!rid) {
        throw new Error("Could not parse fight Report ID (rid). Validate query string matches standard formats.");
      }

      // Check session storage cache first
      const cached = getCachedReport(rid);
      if (cached) {
        setParseStage('simulating');
        setReport(cached.report);
        setDebugInfo(cached.debug);
        setSha256Hash(cached.debug.sha256 || '');
        setSelectedRoundTab(1);

        saveRecentReport(rid, aid, lang);

        const url = new URL(window.location.href);
        url.searchParams.set('rid', rid);
        url.searchParams.set('aid', aid);
        url.searchParams.set('lang', lang);
        if (version !== "2026021215") url.searchParams.set('version', version);
        if (versiondir !== "en_Eu") url.searchParams.set('versiondir', versiondir);
        if (isCombin !== "0") url.searchParams.set('isCombin', isCombin);
        if (server !== "0") url.searchParams.set('server', server);
        window.history.replaceState(null, '', url.toString());

        setParseStage('done');
        return;
      }

      setParseStage('fetching');
      const targetUrl =
        `https://game.shinigamiworld.com/fightreport/data.php` +
        `?rid=${encodeURIComponent(rid)}` +
        `&aid=${encodeURIComponent(aid)}` +
        `&version=${encodeURIComponent(version)}` +
        `&versiondir=${encodeURIComponent(versiondir)}` +
        `&cacheKey=frv=1779820963` +
        `&isCombin=${encodeURIComponent(isCombin)}` +
        `&agent=${encodeURIComponent(agent)}` +
        `&server=${encodeURIComponent(server)}` +
        `&lang=${encodeURIComponent(lang)}`;

      const proxyUrl = `https://cors-proxy.shinigamiworld-fightreport.workers.dev/?url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Proxy worker rejected combat packets request: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength < 10) {
        throw new Error("Combat packet binary is empty or truncated. Ensure fight ID remains unexpired.");
      }

      // Compute authenticity hash
      const hash = await computeSha256(arrayBuffer);
      setSha256Hash(hash);

      setParseStage('parsing');
      const { report: decodedReport, debug: decodedDebug } = decodeReportBinary(arrayBuffer);
      decodedDebug.sha256 = hash;

      setParseStage('simulating');
      // Triggers state flow simulation automatically via useMemo on battleStats
      setReport(decodedReport);
      setDebugInfo(decodedDebug);
      setSelectedRoundTab(1);

      // Save to session cache
      setCachedReport({
        rid,
        aid,
        lang,
        timestamp: Date.now(),
        report: decodedReport,
        debug: decodedDebug,
      });

      // Save to local storage history
      saveRecentReport(rid, aid, lang);

      // Update Query String parameters
      const url = new URL(window.location.href);
      url.searchParams.set('rid', rid);
      url.searchParams.set('aid', aid);
      url.searchParams.set('lang', lang);
      if (version !== "2026021215") url.searchParams.set('version', version);
      if (versiondir !== "en_Eu") url.searchParams.set('versiondir', versiondir);
      if (isCombin !== "0") url.searchParams.set('isCombin', isCombin);
      if (server !== "0") url.searchParams.set('server', server);
      window.history.replaceState(null, '', url.toString());

      setParseStage('done');
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || "Decoding failure during remote link parsing. Use drag and drop upload fallback.");
      setParseStage('error');
    }
  }, [inputUrl]);

  // Local Storage Save History
  const saveRecentReport = (rid: string, aid: string, lang: string) => {
    try {
      const currentList: RecentReport[] = JSON.parse(localStorage.getItem('recent_fight_reports:v1') || '[]');
      const filtered = currentList.filter(r => r.rid !== rid);
      filtered.unshift({ rid, aid, lang, timestamp: Date.now() });
      localStorage.setItem('recent_fight_reports:v1', JSON.stringify(filtered.slice(0, 8)));
      setHistoryTrigger(prev => prev + 1);
    } catch (e) {
      console.warn("Local storage capacity limit exceeded: history tracking is disabled.", e);
    }
  };

  // Read History List
  const recentReports = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('recent_fight_reports:v1') || '[]') as RecentReport[];
    } catch {
      return [] as RecentReport[];
    }
  }, [historyTrigger]);

  // Sync recent reports history list dynamically across multiple tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'recent_fight_reports:v1') {
        setHistoryTrigger(v => v + 1);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
  };

  const processUploadedFile = (file: File) => {
    setParseStage('parsing');
    setParseError(null);
    setReport(null);
    setDebugInfo(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength < 10) {
          throw new Error("Uploaded binary buffer is truncated or corrupted.");
        }

        const hash = await computeSha256(buffer);
        setSha256Hash(hash);

        const { report: decodedReport, debug: decodedDebug } = decodeReportBinary(buffer);
        decodedDebug.sha256 = hash;

        setParseStage('simulating');
        setReport(decodedReport);
        setDebugInfo(decodedDebug);
        setSelectedRoundTab(1);
        setParseStage('done');
      } catch (err: any) {
        console.error(err);
        setParseError(err.message || "Binary parsing failure: invalid file structure.");
        setParseStage('error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Auto load rid from query parameters on mount after DB is ready
  useEffect(() => {
    if (dbLoading || report) return;

    const params = new URLSearchParams(window.location.search);
    const rid = params.get('rid');
    const aid = params.get('aid') || '86';
    const lang = params.get('lang') || 'en_US';

    if (rid) {
      const simulatedUrl = `rid=${rid}&aid=${aid}&lang=${lang}`;
      setInputUrl(simulatedUrl);
      handleFetchReport(simulatedUrl);
    }
  }, [dbLoading, report, handleFetchReport]);

  // Compute Battle Statistics and Snapshots via Simulation Engine
  const battleStats = useMemo(() => {
    if (!report) return null;

    return simulateFightReport(
      report,
      resolveAttackerName,
      skillsMap,
      buffsMap
    );
  }, [report, knivesMap, heroesMap, enemiesMap, skillsMap, buffsMap, resolveAttackerName]);

  // Compute accumulated real-time stats for the active playback action step
  const currentStepStates = useMemo(() => {
    const states = new Map<string, { hp: number; maxHp: number; shield: number; anger: number; dead: boolean }>();
    if (!report || !battleStats) return states;

    const activeRound = report.turns.find(t => t.curTurn === selectedRoundTab);
    if (!activeRound) return states;

    // 1. Initialize states from the start of this round (end of selectedRoundTab - 1)
    for (const [key, timeline] of battleStats.fighterTimeline.entries()) {
      const preRoundSnap = timeline.find(snap => snap.round === selectedRoundTab - 1);
      if (preRoundSnap) {
        states.set(key, {
          hp: preRoundSnap.hp,
          maxHp: preRoundSnap.maxHp,
          shield: preRoundSnap.shield,
          anger: preRoundSnap.anger,
          dead: preRoundSnap.dead,
        });
      } else {
        const fighterState = battleStats.state.get(key);
        states.set(key, {
          hp: fighterState?.maxHp || 1,
          maxHp: fighterState?.maxHp || 1,
          shield: 0,
          anger: fighterState?.anger || 0,
          dead: false,
        });
      }
    }

    // 2. Accumulate target modifications up to and including the current action index and target sub-step
    for (let i = 0; i <= activeActionIdx; i++) {
      const act = activeRound.actives[i];
      if (!act) continue;

      const isCurrentAction = i === activeActionIdx;
      const targetsLimit = (isCurrentAction && activeTargetIdx >= 0)
        ? activeTargetIdx
        : act.targets.length - 1;

      for (let j = 0; j <= targetsLimit; j++) {
        const tgt = act.targets[j];
        if (!tgt) continue;

        const key = `${tgt.camp}_${tgt.pos}`;
        const current = states.get(key);
        if (current) {
          if (tgt.cmd === CMD.ATTACK || tgt.cmd === CMD.ATTACKEX || tgt.cmd === CMD.HURTBUFF) {
            const hurtHp = tgt.result.hurtHp || 0;
            if (hurtHp > 0) {
              const absorbed = Math.min(current.shield, hurtHp);
              current.shield -= absorbed;
              current.hp = Math.max(0, current.hp - (hurtHp - absorbed));
              if (current.hp <= 0) current.dead = true;
            } else if (hurtHp < 0) {
              current.hp = Math.min(current.maxHp, current.hp - hurtHp);
            }
          } else if (tgt.cmd === CMD.SHIELD) {
            current.shield = tgt.result.buffTurn || 0;
          }
          if (tgt.result.hurtAnger !== undefined) {
            current.anger = Math.max(0, Math.min(500, current.anger - tgt.result.hurtAnger));
          }
        }
      }
    }

    return states;
  }, [report, battleStats, selectedRoundTab, activeActionIdx, activeTargetIdx]);

  // Compute Meta Insights Conclusion array
  const insights = useMemo(() => {
    if (!report || !battleStats) return [] as Insight[];
    return computeInsights(report, battleStats);
  }, [report, battleStats]);

  // Round highlights Map for the round selector
  const roundHighlights = useMemo(() => {
    const map = new Map<number, TurnHighlight>();
    if (!report) return map;

    for (const turn of report.turns) {
      let hasDeath = false;
      let hasCrit = false;
      let hasShield = false;

      for (const active of turn.actives) {
        for (const target of active.targets) {
          if (hasStatusFlag(target.status, 1073741824)) hasDeath = true;
          if (hasStatusFlag(target.status, 67108864)) hasCrit = true;
          if (target.cmd === CMD.SHIELD) hasShield = true;
        }
      }
      map.set(turn.curTurn, { hasDeath, hasCrit, hasShield });
    }
    return map;
  }, [report]);

  const team1Zanpakuto = useMemo(() => {
    if (!report?.team1) return null;
    const knifeId = report.team1.knifeOfKillSoulId;
    if (knifeId <= 0) return null;
    const expand = knifeExpandsMap.get(knifeId);
    const relationId = expand ? expand.relation_id : knifeId;
    const knife = knivesMap.get(relationId);
    const skill = expand ? skillsMap.get(expand.skill_id) : undefined;
    return {
      name: knife?.name || "Zanpakuto",
      level: expand?.level || 0,
      skill: skill,
    };
  }, [report, knifeExpandsMap, knivesMap, skillsMap]);

  const team2Zanpakuto = useMemo(() => {
    if (!report?.team2) return null;
    const knifeId = report.team2.knifeOfKillSoulId;
    if (knifeId <= 0) return null;
    const expand = knifeExpandsMap.get(knifeId);
    const relationId = expand ? expand.relation_id : knifeId;
    const knife = knivesMap.get(relationId);
    const skill = expand ? skillsMap.get(expand.skill_id) : undefined;
    return {
      name: knife?.name || "Zanpakuto",
      level: expand?.level || 0,
      skill: skill,
    };
  }, [report, knifeExpandsMap, knivesMap, skillsMap]);

  // Fighter names Map for timeline select filter
  const fighterNames = useMemo(() => {
    const map = new Map<string, string>();
    if (!report) return map;

    report.team1.roles.forEach(r => map.set(`0_${r.pos}`, resolveRoleName(r)));
    report.team2.roles.forEach(r => map.set(`1_${r.pos}`, resolveRoleName(r)));
    return map;
  }, [report, heroesMap, enemiesMap]);

  // Jump to specific key moment handler with smooth scrolling to DOM anchor
  const handleJumpToMoment = (moment: KeyMoment) => {
    setActiveTab('log');
    setSelectedRoundTab(moment.round);
    setHighlightedMomentId(`${moment.round}-${moment.activeIndex}`);

    window.setTimeout(() => {
      document
        .getElementById(`action-${moment.round}-${moment.activeIndex}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Format Anger Change Helper
  const formatAngerChange = (hurtAnger: number): string => {
    const actualChange = -hurtAnger;
    return actualChange > 0 ? `+${actualChange}` : `${actualChange}`;
  };

  // Copy structured summary to clipboard
  const handleCopySummary = () => {
    if (!report || !battleStats) return;
    const text = generateSummaryText(report, battleStats);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    });
  };

  // Loading text helpers
  const getLoadingStageText = () => {
    switch (parseStage) {
      case 'validating': return 'Validating URL address structure...';
      case 'fetching': return 'Downloading combat binary trace...';
      case 'parsing': return 'Parsing packet streams & structures...';
      case 'simulating': return 'Simulating HP & Shield ticks...';
      case 'finalizing': return 'Compiling database analytics...';
      default: return 'Synthesizing dashboard...';
    }
  };

  // Dynamic log filter counts for the currently selected round
  const logFilterCounts = useMemo(() => {
    const counts = {
      all: 0,
      damage: 0,
      heal: 0,
      death: 0,
      buff: 0,
      shield: 0,
      crit: 0,
    };

    if (!report) return counts;

    const activeRound = report.turns.find(t => t.curTurn === selectedRoundTab);
    if (!activeRound) return counts;

    activeRound.actives.forEach((active) => {
      active.targets.forEach((tgt) => {
        const hurtHp = tgt.result.hurtHp || 0;
        counts.all += 1;

        if (tgt.cmd === CMD.ATTACK || tgt.cmd === CMD.ATTACKEX) {
          if (hurtHp > 0) counts.damage += 1;
        }
        if (hurtHp < 0) counts.heal += 1;
        if (hasStatusFlag(tgt.status, 1073741824)) counts.death += 1;
        if (tgt.cmd === CMD.ATTRBUFF || tgt.cmd === CMD.CONTROLBUFF) counts.buff += 1;
        if (tgt.cmd === CMD.SHIELD) counts.shield += 1;
        if (hasStatusFlag(tgt.status, 67108864)) counts.crit += 1;
      });
    });

    return counts;
  }, [report, selectedRoundTab]);

  // Combat Log Filtering and Searching
  const filteredActives = useMemo(() => {
    if (!report) return [];
    const activeRound = report.turns.find(t => t.curTurn === selectedRoundTab);
    if (!activeRound) return [];

    return activeRound.actives.map((act, actIdx) => {
      const attackerCamp = act.camp;
      const attackerPos = act.pos;
      const attackerGroup = attackerCamp === 0 ? report.team1 : report.team2;
      const attackerRole = attackerGroup.roles.find(r => r.pos === attackerPos);
      const attackerName = resolveAttackerName(attackerCamp, attackerPos, attackerRole);

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
      }

      // Filter targets list
      const matchedTargets = act.targets.filter((tgt) => {
        const tGroup = tgt.camp === 0 ? report.team1 : report.team2;
        const tRole = tGroup.roles.find(r => r.pos === tgt.pos);
        const tName = tRole ? resolveRoleName(tRole) : `Target Pos ${tgt.pos}`;
        const hurtHp = tgt.result.hurtHp || 0;

        // Search text matching
        if (logSearch.trim()) {
          const query = logSearch.toLowerCase();
          const flags = decodeStatusFlags(tgt.status);
          const textMatch =
            attackerName.toLowerCase().includes(query) ||
            tName.toLowerCase().includes(query) ||
            actionLabel.toLowerCase().includes(query) ||
            tgt.pos.toString() === query ||
            flags.some(f => f.toLowerCase().includes(query));

          if (!textMatch) return false;
        }

        // Action Tab filtering
        if (logFilter === 'damage') {
          return (tgt.cmd === CMD.ATTACK || tgt.cmd === CMD.ATTACKEX) && hurtHp > 0;
        }
        if (logFilter === 'heal') {
          return hurtHp < 0;
        }
        if (logFilter === 'death') {
          return hasStatusFlag(tgt.status, 1073741824);
        }
        if (logFilter === 'shield') {
          return tgt.cmd === CMD.SHIELD;
        }
        if (logFilter === 'buff') {
          return tgt.cmd === CMD.ATTRBUFF || tgt.cmd === CMD.CONTROLBUFF;
        }
        if (logFilter === 'crit') {
          return hasStatusFlag(tgt.status, 67108864);
        }

        return true;
      });

      return {
        active: act,
        idx: actIdx,
        attackerName,
        attackerCamp,
        actionLabel,
        matchedTargets
      };
    }).filter(act => act.matchedTargets.length > 0); // Only keep active skills if they matched searches
  }, [report, selectedRoundTab, logSearch, logFilter, heroesMap, enemiesMap, skillsMap, resolveAttackerName]);

  if (dbLoading) return <LoadingState message="Connecting combat dictionary loaders and packing structures..." />;
  if (dbError) return <ErrorState message={dbError} onRetry={loadDb} />;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Page Title Block */}
      <div className="p-6 md:p-8 rounded-2xl border border-border bg-surface shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
            <Swords size={24} className="animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider bg-violet-100 dark:bg-violet-950/40 px-2.5 py-0.5 rounded-lg border border-violet-500/10">
              Oracle Tactical Analyzer
            </span>
          </div>
          <h1 className="text-3xl font-black text-text tracking-tight">Fight Intelligence Dashboard</h1>
          <p className="text-xs text-muted max-w-2xl leading-relaxed">
            Analyze binary fight reports using our round simulation core. Unlock health charts, detailed casualties timelines, exact overkill margins, and full Excel/CSV matrices.
          </p>
        </div>
      </div>

      {/* Fetch / Upload controls panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fetch Link Module */}
        <div className="lg:col-span-2 p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-text flex items-center gap-2">
            <Search size={16} className="text-violet-500" />
            <span>Parse Remote Report URL</span>
          </h3>
          <p className="text-xs text-muted">
            Paste the full in-game battle link or a specific numeric Report ID (`rid`) below.
          </p>
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Paste game battle report URL or Report ID (e.g. 287713052178748)"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-bg text-text focus:outline-none focus:ring-1.5 focus:ring-violet-500 placeholder-zinc-400 font-bold ${inputUrl.trim() && !urlValidation.valid ? 'border-rose-400 focus:ring-rose-500' : ''
                  }`}
              />
              {/* Inline URL warnings */}
              {inputUrl.trim() && !urlValidation.valid && (
                <span className="text-[10px] text-rose-500 font-bold block mt-1.5 pl-1 select-none">
                  ⚠️ {urlValidation.message}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => {
                  const sample = 'https://game.shinigamiworld.com/fightreport/?rid=287713052178748&aid=86&t=1&lang=en_US';
                  setInputUrl(sample);
                  handleFetchReport(sample);
                }}
                className="text-[10px] text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer select-none"
              >
                Click to parse a sample battle URL
              </button>
              <button
                onClick={() => handleFetchReport()}
                disabled={(parseStage !== 'idle' && parseStage !== 'done' && parseStage !== 'error') || !urlValidation.valid}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-violet-500/10"
              >
                <Play size={12} />
                <span>
                  {parseStage !== 'idle' && parseStage !== 'done' && parseStage !== 'error'
                    ? 'Loading...'
                    : 'Fetch & Simulation'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Binary Upload Dropzone */}
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
            ? 'border-violet-500 bg-violet-50/10 dark:bg-violet-950/10 scale-[1.01]'
            : 'border-border hover:border-violet-500 bg-surface'
            }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".bin,.php"
            className="hidden"
          />
          <div className="p-3 bg-bg rounded-full group-hover:scale-105 transition-all text-subtle group-hover:text-violet-500">
            <UploadCloud size={24} />
          </div>
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-muted block">Or drop Report binary file here</span>
            <span className="text-[10px] text-subtle block font-semibold">Supports `.bin` or `data.php` uploads</span>
          </div>
        </div>
      </div>

      {/* History panel */}
      {recentReports.length > 0 && (
        <div className="p-4 border border-border bg-surface rounded-2xl shadow-sm space-y-2.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-subtle flex items-center gap-1 select-none">
            <Clock size={12} />
            <span>Recent Decoded Combats</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {recentReports.map((item) => (
              <button
                key={item.rid}
                onClick={() => {
                  const url = `rid=${item.rid}&aid=${item.aid}&lang=${item.lang}`;
                  setInputUrl(url);
                  handleFetchReport(url);
                }}
                className="px-3 py-1.5 rounded-xl border border-border bg-bg hover:border-violet-500 text-[10px] font-mono font-bold text-muted transition-all cursor-pointer flex items-center gap-1 hover:bg-hover"
              >
                <span>#{item.rid}</span>
                <span className="text-subtle">({item.lang})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress parsing states */}
      {parseStage !== 'idle' && parseStage !== 'done' && parseStage !== 'error' && (
        <div className="p-5 border border-violet-100 dark:border-violet-950/60 bg-violet-50/10 dark:bg-violet-950/5 rounded-2xl flex items-center gap-4 animate-pulse">
          <div className="w-5 h-5 rounded-full border-2 border-violet-600 border-t-transparent animate-spin shrink-0" />
          <div className="space-y-1 text-xs">
            <span className="font-extrabold text-violet-700 dark:text-violet-400">Simulation processing active</span>
            <p className="text-muted font-medium">{getLoadingStageText()}</p>
          </div>
        </div>
      )}

      {/* Error report */}
      {parseStage === 'error' && parseError && (
        <div className="p-4 border border-rose-200 dark:border-rose-950/60 bg-rose-50/50 dark:bg-rose-950/10 rounded-2xl text-xs flex items-start gap-2 text-rose-600 dark:text-rose-455">
          <ShieldAlert size={16} className="shrink-0 mt-0.5 animate-bounce" />
          <div className="space-y-1 font-semibold">
            <span className="font-black block">Dashboard Error</span>
            <p>{parseError}</p>
          </div>
        </div>
      )}

      {/* Dashboard analytics visual outputs */}
      {report && battleStats && (
        <div className="space-y-6">
          {/* Winner Banner */}
          <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="px-3 py-2 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-xl text-center font-black shadow-md shadow-violet-600/10">
                <span className="text-[9px] block font-mono leading-none mb-0.5 opacity-80">VERSION</span>
                <span className="text-sm font-mono leading-none">{report.version.toFixed(1)}</span>
              </div>
              <div>
                <h3 className="font-black text-lg text-text">
                  {resolveRoleName(report.team1.roles[0])} vs {resolveRoleName(report.team2.roles[0])}
                </h3>
                <span className="text-xs text-subtle font-semibold block">
                  Concluded in <span className="font-bold text-muted">{report.totalTurns} Rounds</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap w-full md:w-auto justify-end">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-amber-500 animate-pulse" />
                <span className="text-xs text-subtle font-bold uppercase tracking-wider">Victor:</span>
                <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-300/10 shadow-sm">
                  {battleStats.winnerCamp === null
                    ? 'Draw / Undetermined'
                    : battleStats.winnerCamp === 0
                      ? 'Team 1 (Attacker)'
                      : 'Team 2 (Defender)'}
                </span>
              </div>

              {/* Action buttons (JSON / CSV / copy Summary) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopySummary}
                  className="p-2 border border-border rounded-xl hover:bg-hover text-muted cursor-pointer transition-colors relative"
                  title="Copy battle text summary to clipboard"
                >
                  <Copy size={14} />
                  {copiedText && (
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-zinc-950 text-white text-[9px] font-bold px-2 py-0.5 rounded-md select-none leading-none z-50">
                      Copied!
                    </span>
                  )}
                </button>
                <button
                  onClick={() => downloadJson(report, `fight-report-${debugInfo?.versionString || 'parsed'}.json`)}
                  className="p-2 border border-border rounded-xl hover:bg-hover text-muted cursor-pointer transition-colors"
                  title="Download fully parsed report as JSON"
                >
                  <FileCode size={14} />
                </button>
                <button
                  onClick={() => downloadCsv(report, battleStats.state, 'fight-report-matrix.csv')}
                  className="p-2 border border-border rounded-xl hover:bg-hover text-muted cursor-pointer transition-colors"
                  title="Export Fighter Stats Matrix as CSV"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tab selection toolbar */}
          <div className="border-b border-border flex flex-wrap gap-x-6 gap-y-1.5 text-xs md:text-sm font-extrabold select-none">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${activeTab === 'overview'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-subtle hover:text-text'
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('fighters')}
              className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${activeTab === 'fighters'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-subtle hover:text-text'
                }`}
            >
              Fighters
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${activeTab === 'timeline'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-subtle hover:text-text'
                }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('skills')}
              className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${activeTab === 'skills'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-subtle hover:text-text'
                }`}
            >
              Skills
            </button>
            <button
              onClick={() => setActiveTab('buffs')}
              className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${activeTab === 'buffs'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-subtle hover:text-text'
                }`}
            >
              Buffs
            </button>
            <button
              onClick={() => setActiveTab('deaths')}
              className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${activeTab === 'deaths'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-subtle hover:text-text'
                }`}
            >
              Deaths
            </button>
            <button
              onClick={() => setActiveTab('log')}
              className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${activeTab === 'log'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-subtle hover:text-text'
                }`}
            >
              Replay Log
            </button>
          </div>

          {/* TAB CONTENTS */}

          {/* 1. Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary KPI grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border border-border bg-surface rounded-2xl shadow-sm text-center">
                  <span className="text-[9px] font-black text-subtle uppercase tracking-wider block">
                    Total Rounds
                  </span>
                  <span className="text-xl font-black text-text font-mono mt-0.5 block">
                    {report.totalTurns}
                  </span>
                </div>
                <div className="p-4 border border-border bg-surface rounded-2xl shadow-sm text-center">
                  <span className="text-[9px] font-black text-subtle uppercase tracking-wider block">
                    Attacker Raw Damage
                  </span>
                  <span className="text-xl font-black text-red-500 font-mono mt-0.5 block">
                    {battleStats.totalDmgTeam1.toLocaleString()}
                  </span>
                </div>
                <div className="p-4 border border-border bg-surface rounded-2xl shadow-sm text-center">
                  <span className="text-[9px] font-black text-subtle uppercase tracking-wider block">
                    Defender Raw Damage
                  </span>
                  <span className="text-xl font-black text-red-500 font-mono mt-0.5 block">
                    {battleStats.totalDmgTeam2.toLocaleString()}
                  </span>
                </div>
                <div className="p-4 border border-border bg-surface rounded-2xl shadow-sm text-center">
                  <span className="text-[9px] font-black text-subtle uppercase tracking-wider block">
                    Total Crits Recorded
                  </span>
                  <span className="text-xl font-black text-amber-500 font-mono mt-0.5 block">
                    {battleStats.turnSummaries.reduce((sum, s) => sum + s.crits, 0)}
                  </span>
                </div>
              </div>

              {/* Award / MVP badges */}
              <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-2.5">
                  <Award size={16} className="text-amber-500 animate-pulse" />
                  <span className="font-extrabold text-xs uppercase text-subtle tracking-wider">
                    MVP & Combat Awards
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Object.values(battleStats.awards).map((win) => {
                    if (!win) return null;
                    return (
                      <div
                        key={win.key}
                        className="p-4 border border-border bg-bg/40 rounded-xl space-y-2 relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-black uppercase tracking-wider bg-violet-100 dark:bg-violet-950/40 text-violet-800 dark:text-violet-400 px-2 py-0.5 rounded-lg border border-violet-500/10">
                            {win.name}
                          </span>
                          <span className="text-[9px] font-mono text-subtle font-bold">
                            T{win.camp + 1}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-xs text-text block truncate">{win.heroName}</h4>
                        <span className="text-sm font-black font-mono text-violet-600 dark:text-violet-400 block pt-1 leading-none">
                          {win.value.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Simulation Warnings Panel */}
              {battleStats.simulationWarnings && battleStats.simulationWarnings.length > 0 && (
                <div className="p-4 border border-amber-200 dark:border-amber-950/60 bg-amber-50/50 dark:bg-amber-950/10 rounded-2xl text-xs flex items-start gap-2.5 text-amber-600 dark:text-amber-455">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1.5 font-semibold">
                    <span className="font-black block text-sm">Simulation Anomalies Detected ({battleStats.simulationWarnings.length})</span>
                    <p className="text-[11px] leading-relaxed text-muted">
                      Our simulation core caught some inconsistent packets during calculations. Results have been gracefully compiled:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[10px] font-mono font-bold max-h-24 overflow-y-auto mt-1">
                      {battleStats.simulationWarnings.map((warn, idx) => (
                        <li key={idx}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Meta Insights Panel */}
              {insights.length > 0 && (
                <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-2.5">
                    <Sparkles size={16} className="text-violet-500 animate-pulse" />
                    <span className="font-extrabold text-xs uppercase text-subtle tracking-wider">
                      Strategic Combat Meta Insights
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.map((ins) => {
                      const toneClasses = {
                        red: "bg-red-500/5 text-red-800 dark:text-red-400 border-red-500/10",
                        emerald: "bg-emerald-500/5 text-emerald-800 dark:text-emerald-400 border-emerald-500/10",
                        blue: "bg-blue-500/5 text-blue-800 dark:text-blue-400 border-blue-500/10",
                        amber: "bg-amber-500/5 text-amber-800 dark:text-amber-400 border-amber-500/10",
                        violet: "bg-violet-500/5 text-violet-800 dark:text-violet-400 border-violet-500/10",
                        muted: "bg-zinc-500/5 text-zinc-800 dark:text-zinc-400 border-zinc-500/10",
                      };

                      return (
                        <div
                          key={ins.id}
                          className={`p-4 border rounded-xl flex items-start gap-3.5 ${toneClasses[ins.tone] || toneClasses.muted}`}
                        >
                          <span className="text-xl select-none">{ins.icon}</span>
                          <div className="space-y-1">
                            <span className="font-extrabold text-xs block text-text select-none">
                              {ins.label}
                            </span>
                            <p className="text-[11px] leading-relaxed font-semibold text-muted">
                              {ins.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Key Moments */}
              <KeyMomentsPanel
                moments={battleStats.keyMoments}
                onJumpToMoment={handleJumpToMoment}
              />
            </div>
          )}

          {/* 2. Fighters Tab */}
          {activeTab === 'fighters' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FighterTeamPanel
                title="Team 1 (Attacker)"
                camp={0}
                roles={report.team1.roles}
                finalState={battleStats.state}
                maxDamageDone={battleStats.maxDamageDoneRaw}
                maxDamageTaken={battleStats.maxDamageTakenRaw}
                maxHealingDone={battleStats.maxHealing}
                maxShieldApplied={battleStats.teamTotals.shieldApplied[0] || 1}
                onSelectFighter={setFocusedFighterKey}
                bloodAddRate={report.team1.bloodAddRate}
                zanpakutoName={team1Zanpakuto?.name}
                zanpakutoLevel={team1Zanpakuto?.level}
                zanpakutoSkill={team1Zanpakuto?.skill}
              />
              <FighterTeamPanel
                title="Team 2 (Defender)"
                camp={1}
                roles={report.team2.roles}
                finalState={battleStats.state}
                maxDamageDone={battleStats.maxDamageDoneRaw}
                maxDamageTaken={battleStats.maxDamageTakenRaw}
                maxHealingDone={battleStats.maxHealing}
                maxShieldApplied={battleStats.teamTotals.shieldApplied[1] || 1}
                onSelectFighter={setFocusedFighterKey}
                bloodAddRate={report.team2.bloodAddRate}
                zanpakutoName={team2Zanpakuto?.name}
                zanpakutoLevel={team2Zanpakuto?.level}
                zanpakutoSkill={team2Zanpakuto?.skill}
              />
            </div>
          )}

          {/* 3. Timeline Tab */}
          {activeTab === 'timeline' && (
            <TimelineTab
              turnSummaries={battleStats.turnSummaries}
              fighterTimeline={battleStats.fighterTimeline}
              fighterNames={fighterNames}
            />
          )}

          {/* 4. Skills Tab */}
          {activeTab === 'skills' && <SkillsTab skillsStats={battleStats.skillsStats} />}

          {/* 5. Buffs Tab */}
          {activeTab === 'buffs' && <BuffsTab buffsStats={battleStats.buffsStats} />}

          {/* 6. Deaths Tab */}
          {activeTab === 'deaths' && <DeathsTab deaths={battleStats.deaths} />}

          {/* 7. Replay Log Tab */}
          {/* 7. Replay Log Tab */}
          {activeTab === 'log' && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Custom floating combat text animations */}
              <style>{`
                @keyframes floatUp {
                  0% { transform: translate(-50%, 0); opacity: 1; }
                  100% { transform: translate(-50%, -22px); opacity: 0; }
                }
                .animate-float-up {
                  animation: floatUp 1.4s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }
                @keyframes pingOnce {
                  0% { transform: scale(1); opacity: 0.6; }
                  100% { transform: scale(1.12); opacity: 0; }
                }
                .animate-ping-once {
                  animation: pingOnce 0.7s ease-out forwards;
                }
              `}</style>

              {/* Left Column: Round navigations & Replay Controls */}
              <div className="xl:col-span-1 border border-border bg-surface p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-text border-b border-border pb-2.5">
                  Select Round
                </h3>
                <RoundNavigator
                  totalTurns={report.totalTurns}
                  currentTurn={selectedRoundTab}
                  onChangeTurn={setSelectedRoundTab}
                  highlights={roundHighlights}
                  isReplayTabActive={activeTab === 'log'}
                />

                {/* Replay Controls Panel */}
                <div className="border-t border-border pt-4 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-subtle block">Replay Controls</span>
                  <div className="flex items-center justify-between bg-bg/50 border border-border rounded-xl p-2.5">
                    <button
                      onClick={() => setActiveActionIdx(prev => Math.max(0, prev - 1))}
                      disabled={activeActionIdx === 0}
                      className="p-2 rounded-lg border border-border bg-surface hover:bg-hover disabled:opacity-30 disabled:hover:bg-surface text-text cursor-pointer transition-all"
                      title="Step Back Action"
                    >
                      <SkipBack size={14} />
                    </button>

                    <button
                      onClick={() => setIsPlaying(prev => !prev)}
                      className="p-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white cursor-pointer transition-all shadow-md shadow-violet-500/10"
                      title={isPlaying ? "Pause Playback" : "Start Playback"}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} className="fill-white" />}
                    </button>

                    <button
                      onClick={() => {
                        const activeRound = report.turns.find(t => t.curTurn === selectedRoundTab);
                        if (activeRound) {
                          setActiveActionIdx(prev => Math.min(activeRound.actives.length - 1, prev + 1));
                        }
                      }}
                      disabled={(() => {
                        const activeRound = report.turns.find(t => t.curTurn === selectedRoundTab);
                        return !activeRound || activeActionIdx === activeRound.actives.length - 1;
                      })()}
                      className="p-2 rounded-lg border border-border bg-surface hover:bg-hover disabled:opacity-30 disabled:hover:bg-surface text-text cursor-pointer transition-all"
                      title="Step Forward Action"
                    >
                      <SkipForward size={14} />
                    </button>
                  </div>

                  {/* Playback speed selector */}
                  <div className="flex items-center justify-between gap-1.5 bg-bg/30 border border-border/50 rounded-xl p-2 text-xs">
                    <span className="text-subtle font-bold">Speed:</span>
                    <div className="flex gap-1">
                      {([
                        [1500, '1x'],
                        [800, '2x'],
                        [400, '4x']
                      ] as const).map(([speedMs, label]) => (
                        <button
                          key={speedMs}
                          onClick={() => setPlaybackSpeed(speedMs)}
                          className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${playbackSpeed === speedMs
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'bg-surface border border-border text-muted hover:text-text'
                            }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Arena & Sequential Logs */}
              <div className="xl:col-span-3 space-y-6">
                {/* 1. Visual Tactical Arena Grid Panel */}
                <div className="border border-border bg-surface p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <h3 className="font-extrabold text-sm text-text flex items-center gap-2">
                      <Swords size={16} className="text-violet-500 animate-pulse" />
                      <span>Replay Tactical Arena</span>
                    </h3>
                    <span className="text-[10px] text-subtle font-bold uppercase tracking-wider font-mono">
                      Round {selectedRoundTab} · Action {activeActionIdx + 1} of {(() => {
                        const activeRound = report.turns.find(t => t.curTurn === selectedRoundTab);
                        return activeRound?.actives.length || 0;
                      })()}
                    </span>
                  </div>

                  {/* Side-by-side 5x3 deployment grids */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-bg/30 border border-border/60 rounded-xl relative overflow-hidden">
                    {/* Grid Camp 0 (Attacker Left Wing) */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold text-violet-500 uppercase tracking-wider text-center block">Team 1 Attacker</span>
                      <div className="grid grid-rows-5 gap-2.5 max-w-xs mx-auto">
                        {(() => {
                          const formationLayout = [
                            [14, 9, 4],
                            [12, 7, 2],
                            [11, 6, 1],
                            [13, 8, 3],
                            [15, 10, 5]
                          ];
                          const activeRound = report.turns.find(t => t.curTurn === selectedRoundTab);
                          const activeAct = activeRound?.actives[activeActionIdx];

                          const activeGroup = report.team1;
                          const fighterAtPos = new Map<number, FightRole>();
                          activeGroup.roles.forEach(r => fighterAtPos.set(r.pos, r));

                          return formationLayout.map((row, rowIdx) => (
                            <div key={rowIdx} className="grid grid-cols-3 gap-2">
                              {row.map(posNum => {
                                const role = fighterAtPos.get(posNum);
                                const isOccupied = !!role;
                                const key = `0_${posNum}`;
                                const state = currentStepStates.get(key);
                                const isDead = state?.dead || false;
                                const hpPct = state ? (state.hp / state.maxHp) * 100 : 0;

                                // Playback highlights
                                const isAttacker = activeAct?.camp === 0 && activeAct?.pos === posNum;
                                const targetsToHighlight = (activeAct && activeTargetIdx >= 0)
                                  ? [activeAct.targets[activeTargetIdx]].filter(Boolean)
                                  : (activeAct?.targets || []);

                                const isTargetObj = targetsToHighlight.find(tgt => tgt.camp === 0 && tgt.pos === posNum);
                                const isTarget = !!isTargetObj;
                                const cmdType = isTargetObj?.cmd;
                                const hurtHp = isTargetObj?.result.hurtHp || 0;
                                const shieldChange = isTargetObj?.result.buffTurn || 0;

                                let highlightClass = '';
                                if (isAttacker) {
                                  highlightClass = 'border-2 border-violet-500 scale-[1.03] shadow-md shadow-violet-500/20 bg-violet-500/5 animate-pulse';
                                } else if (isTarget) {
                                  if (cmdType === CMD.ATTACK || cmdType === CMD.ATTACKEX || cmdType === CMD.HURTBUFF) {
                                    highlightClass = hurtHp > 0 ? 'border-2 border-red-500 bg-red-500/5 animate-ping-once' : 'border-2 border-emerald-500 bg-emerald-500/5 animate-ping-once';
                                  } else if (cmdType === CMD.SHIELD) {
                                    highlightClass = 'border-2 border-blue-500 bg-blue-500/5 animate-ping-once';
                                  } else {
                                    highlightClass = 'border-2 border-purple-500 bg-purple-500/5';
                                  }
                                } else {
                                  highlightClass = isOccupied ? (isDead ? 'border border-rose-500/20 bg-rose-500/5 opacity-40' : 'border border-emerald-500/30 bg-emerald-500/5') : 'border border-dashed border-border/10 opacity-25';
                                }

                                return (
                                  <div
                                    key={posNum}
                                    className={`h-11 rounded-xl flex flex-col items-center justify-center relative p-1 transition-all duration-300 ${highlightClass}`}
                                  >
                                    {isOccupied ? (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-center select-none relative">
                                        <span className="text-[7px] font-mono leading-none font-black text-subtle/50 uppercase">Pos {posNum}</span>
                                        <span className="text-[9px] font-black tracking-tight leading-tight block truncate w-full px-0.5 text-text">
                                          {role.name.slice(0, 6)}
                                        </span>
                                        {!isDead && state && (
                                          <div className="absolute bottom-1 left-1.5 right-1.5 h-0.5 bg-zinc-850 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: `${hpPct}%` }}></div>
                                          </div>
                                        )}
                                        {/* Floating Combat Text */}
                                        {isTarget && isTargetObj && (
                                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 animate-float-up font-mono font-black text-[9px] z-50 whitespace-nowrap bg-zinc-950/90 px-1.5 py-0.5 rounded border border-zinc-800 shadow-xl">
                                            {cmdType === CMD.SHIELD ? (
                                              <span className="text-blue-400">🛡️ +{formatCompact(shieldChange)}</span>
                                            ) : hurtHp > 0 ? (
                                              <span className="text-red-500">-{formatCompact(hurtHp)}</span>
                                            ) : hurtHp < 0 ? (
                                              <span className="text-emerald-400">💚 +{formatCompact(-hurtHp)}</span>
                                            ) : (
                                              <span className="text-subtle">BUFF</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[8px] font-mono font-bold text-subtle/10">{posNum}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Grid Camp 1 (Defender Right Wing) */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider text-center block">Team 2 Defender</span>
                      <div className="grid grid-rows-5 gap-2.5 max-w-xs mx-auto">
                        {(() => {
                          const formationLayout = [
                            [4, 9, 14],
                            [2, 7, 12],
                            [1, 6, 11],
                            [3, 8, 13],
                            [5, 10, 15]
                          ];
                          const activeRound = report.turns.find(t => t.curTurn === selectedRoundTab);
                          const activeAct = activeRound?.actives[activeActionIdx];

                          const activeGroup = report.team2;
                          const fighterAtPos = new Map<number, FightRole>();
                          activeGroup.roles.forEach(r => fighterAtPos.set(r.pos, r));

                          return formationLayout.map((row, rowIdx) => (
                            <div key={rowIdx} className="grid grid-cols-3 gap-2">
                              {row.map(posNum => {
                                const role = fighterAtPos.get(posNum);
                                const isOccupied = !!role;
                                const key = `1_${posNum}`;
                                const state = currentStepStates.get(key);
                                const isDead = state?.dead || false;
                                const hpPct = state ? (state.hp / state.maxHp) * 100 : 0;

                                // Playback highlights
                                const isAttacker = activeAct?.camp === 1 && activeAct?.pos === posNum;
                                const targetsToHighlight = (activeAct && activeTargetIdx >= 0)
                                  ? [activeAct.targets[activeTargetIdx]].filter(Boolean)
                                  : (activeAct?.targets || []);

                                const isTargetObj = targetsToHighlight.find(tgt => tgt.camp === 1 && tgt.pos === posNum);
                                const isTarget = !!isTargetObj;
                                const cmdType = isTargetObj?.cmd;
                                const hurtHp = isTargetObj?.result.hurtHp || 0;
                                const shieldChange = isTargetObj?.result.buffTurn || 0;

                                let highlightClass = '';
                                if (isAttacker) {
                                  highlightClass = 'border-2 border-indigo-500 scale-[1.03] shadow-md shadow-indigo-500/20 bg-indigo-500/5 animate-pulse';
                                } else if (isTarget) {
                                  if (cmdType === CMD.ATTACK || cmdType === CMD.ATTACKEX || cmdType === CMD.HURTBUFF) {
                                    highlightClass = hurtHp > 0 ? 'border-2 border-red-500 bg-red-500/5 animate-ping-once' : 'border-2 border-emerald-500 bg-emerald-500/5 animate-ping-once';
                                  } else if (cmdType === CMD.SHIELD) {
                                    highlightClass = 'border-2 border-blue-500 bg-blue-500/5 animate-ping-once';
                                  } else {
                                    highlightClass = 'border-2 border-purple-500 bg-purple-500/5';
                                  }
                                } else {
                                  highlightClass = isOccupied ? (isDead ? 'border border-rose-500/20 bg-rose-500/5 opacity-40' : 'border border-emerald-500/30 bg-emerald-500/5') : 'border border-dashed border-border/10 opacity-25';
                                }

                                return (
                                  <div
                                    key={posNum}
                                    className={`h-11 rounded-xl flex flex-col items-center justify-center relative p-1 transition-all duration-300 ${highlightClass}`}
                                  >
                                    {isOccupied ? (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-center select-none relative">
                                        <span className="text-[7px] font-mono leading-none font-black text-subtle/50 uppercase">Pos {posNum}</span>
                                        <span className="text-[9px] font-black tracking-tight leading-tight block truncate w-full px-0.5 text-text">
                                          {role.name.slice(0, 6)}
                                        </span>
                                        {!isDead && state && (
                                          <div className="absolute bottom-1 left-1.5 right-1.5 h-0.5 bg-zinc-850 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: `${hpPct}%` }}></div>
                                          </div>
                                        )}
                                        {/* Floating Combat Text */}
                                        {isTarget && isTargetObj && (
                                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 animate-float-up font-mono font-black text-[9px] z-50 whitespace-nowrap bg-zinc-950/90 px-1.5 py-0.5 rounded border border-zinc-800 shadow-xl">
                                            {cmdType === CMD.SHIELD ? (
                                              <span className="text-blue-400">🛡️ +{formatCompact(shieldChange)}</span>
                                            ) : hurtHp > 0 ? (
                                              <span className="text-red-500">-{formatCompact(hurtHp)}</span>
                                            ) : hurtHp < 0 ? (
                                              <span className="text-emerald-400">💚 +{formatCompact(-hurtHp)}</span>
                                            ) : (
                                              <span className="text-subtle">BUFF</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[8px] font-mono font-bold text-subtle/10">{posNum}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Interactive Log Sequences Panel */}
                <div className="border border-border bg-surface p-6 rounded-2xl shadow-sm space-y-4">
                  {/* Advanced Search Filter Toolbar */}
                  <div className="flex flex-col md:flex-row gap-3 items-center justify-between border-b border-border pb-4">
                    <h3 className="font-extrabold text-sm text-text flex items-center gap-2">
                      <ListOrdered size={16} className="text-violet-500" />
                      <span>Action Sequences (Round {selectedRoundTab})</span>
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      {/* Action Filter Selector */}
                      <div className="relative flex-1 md:flex-none">
                        <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                        <select
                          value={logFilter}
                          onChange={(e) => setLogFilter(e.target.value as any)}
                          className="w-full md:w-40 pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-border bg-bg text-text font-bold focus:outline-none"
                        >
                          <option value="all">All Targets ({logFilterCounts.all})</option>
                          <option value="damage">Damage Hits ({logFilterCounts.damage})</option>
                          <option value="heal">Heals ({logFilterCounts.heal})</option>
                          <option value="death">Deaths ({logFilterCounts.death})</option>
                          <option value="shield">Shields ({logFilterCounts.shield})</option>
                          <option value="buff">Buffs ({logFilterCounts.buff})</option>
                          <option value="crit">Crits ({logFilterCounts.crit})</option>
                        </select>
                      </div>

                      {/* Log text search */}
                      <div className="relative flex-1 md:flex-none">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                        <input
                          type="text"
                          placeholder="Search logs..."
                          value={logSearch}
                          onChange={(e) => setLogSearch(e.target.value)}
                          className="w-full md:w-40 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-bg text-text focus:outline-none font-bold placeholder-zinc-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Log list */}
                  <div className="space-y-5 divide-y divide-border/60">
                    {filteredActives.length === 0 ? (
                      <div className="p-8 border border-dashed border-border rounded-2xl text-center text-xs text-subtle font-bold">
                        No actions in Round {selectedRoundTab} matched your active search filters.
                      </div>
                    ) : (
                      filteredActives.map(({ idx: actIdx, attackerName, attackerCamp, actionLabel, matchedTargets }) => {
                        const highlighted = highlightedMomentId === `${selectedRoundTab}-${actIdx}` || activeActionIdx === actIdx;

                        return (
                          <div
                            id={`action-${selectedRoundTab}-${actIdx}`}
                            key={actIdx}
                            onClick={() => setActiveActionIdx(actIdx)}
                            className={`pt-4 ${actIdx === 0 ? 'pt-0' : ''} space-y-2.5 transition-all duration-300 cursor-pointer p-2.5 rounded-2xl ${highlighted
                              ? 'bg-violet-500/5 dark:bg-violet-500/5 border border-violet-500/15'
                              : 'hover:bg-hover'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-subtle uppercase">
                                ACTION #{actIdx + 1} {activeActionIdx === actIdx && <span className="text-violet-500 font-bold ml-1.5">(Active Replay Step)</span>}
                              </span>
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${attackerCamp === 0
                                  ? 'bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-400 border border-violet-500/10'
                                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-400 border border-indigo-500/10'
                                  }`}
                              >
                                {attackerCamp === 0 ? 'Team 1 (Attacker)' : 'Team 2 (Defender)'}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-text">
                              <span className="font-extrabold text-violet-600 dark:text-violet-400">
                                {attackerName}
                              </span>{' '}
                              {actionLabel}:
                            </p>

                            <div className="pl-4 space-y-1.5 border-l-2 border-border/80">
                              {matchedTargets.map((tgt, tgtIdx) => {
                                const tCamp = tgt.camp;
                                const tPos = tgt.pos;
                                const tGroup = tCamp === 0 ? report.team1 : report.team2;
                                const tRole = tGroup.roles.find((r) => r.pos === tPos);
                                const tName = resolveAttackerName(tCamp, tPos, tRole);
                                const hurtHp = tgt.result.hurtHp || 0;

                                const flags = decodeStatusFlags(tgt.status);
                                const isCombo = flags.includes('Combo / Joint Attack');
                                const isAid = flags.includes('Help / Rescue');

                                let prefix = '';
                                if (isCombo) {
                                  prefix = '🔗 [Combo] ';
                                } else if (isAid) {
                                  prefix = '🛡️ [Aid] ';
                                }

                                let logText = '';
                                let cardBgClass = 'border-l-2 border-border/40 hover:bg-hover';
                                let iconLabel = '↳';
                                let textClass = 'text-muted';

                                const getBuffName = (bId: number): string => {
                                  if (bId === 4294967295) return 'Generic Buff';
                                  if (bId === 0) return 'Null Buff';
                                  return buffsMap.get(bId) || `Buff #${bId}`;
                                };

                                if (tgt.cmd === CMD.ATTACK || tgt.cmd === CMD.ATTACKEX || tgt.cmd === CMD.HURTBUFF) {
                                  if (hurtHp > 0) {
                                    const suffix = flags.length ? ` (${flags.join(', ')})` : '';
                                    logText = `Hits ${tName} (Pos ${tPos}) dealing ${hurtHp.toLocaleString()} damage${suffix}.`;
                                    cardBgClass = 'border-l-2 border-red-500/50 hover:bg-red-500/5 bg-red-500/[0.01]';
                                    iconLabel = '⚔️';
                                    textClass = 'text-red-600 dark:text-red-400 font-semibold';
                                  } else if (hurtHp < 0) {
                                    logText = `Heals ${tName} (Pos ${tPos}) for ${(-hurtHp).toLocaleString()} HP.`;
                                    cardBgClass = 'border-l-2 border-emerald-500/50 hover:bg-emerald-500/5 bg-emerald-500/[0.01]';
                                    iconLabel = '💚';
                                    textClass = 'text-emerald-600 dark:text-emerald-450 font-semibold';
                                  } else {
                                    if (flags.includes('Super Dodge / All Miss')) {
                                      logText = `${tName} (Pos ${tPos}) dodges / all-misses the effect.`;
                                      textClass = 'text-subtle';
                                    } else if (flags.includes('Invincible')) {
                                      logText = `${tName} (Pos ${tPos}) takes no damage due to Invincible.`;
                                      textClass = 'text-subtle';
                                    } else if (flags.includes('Block')) {
                                      logText = `${tName} (Pos ${tPos}) blocks the hit with no HP loss.`;
                                      textClass = 'text-subtle';
                                    } else {
                                      logText = `Targets ${tName} (Pos ${tPos}) with no HP change${flags.length ? ` (${flags.join(', ')})` : ''}.`;
                                      if (isCombo) {
                                        textClass = 'text-fuchsia-600 dark:text-fuchsia-400 font-bold';
                                      } else if (isAid) {
                                        textClass = 'text-sky-600 dark:text-sky-400 font-bold';
                                      } else {
                                        textClass = 'text-muted';
                                      }
                                    }
                                  }
                                } else if (tgt.cmd === CMD.SHIELD) {
                                  const sId = tgt.result.buffId || 0;
                                  const shieldHp = tgt.result.buffTurn || 0;
                                  if (shieldHp === 0) {
                                    logText = `Removes Shield [${getBuffName(sId)}] from ${tName} (Pos ${tPos}).`;
                                  } else {
                                    logText = `Applies Shield [${getBuffName(sId)}] on ${tName} (Pos ${tPos}) with ${shieldHp.toLocaleString()} shield HP.`;
                                  }
                                  cardBgClass = 'border-l-2 border-blue-500/50 hover:bg-blue-500/5 bg-blue-500/[0.01]';
                                  iconLabel = '🛡️';
                                  textClass = 'text-blue-600 dark:text-blue-400 font-semibold';
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
                                  cardBgClass = 'border-l-2 border-purple-500/50 hover:bg-purple-500/5 bg-purple-500/[0.01]';
                                  iconLabel = '✨';
                                  textClass = 'text-purple-600 dark:text-purple-400 font-semibold';
                                } else if (tgt.cmd === CMD.POSITION) {
                                  const newPos = tgt.result.buffTurn || tPos;
                                  logText = `Moves ${tName} from position ${tPos} to position ${newPos}.`;
                                  cardBgClass = 'border-l-2 border-amber-500/50 hover:bg-amber-500/5 bg-amber-500/[0.01]';
                                  iconLabel = '🔄';
                                  textClass = 'text-amber-600 dark:text-amber-400 font-semibold';
                                } else if (tgt.cmd === CMD.FLOAT) {
                                  const effectType = tgt.result.buffId || 0;
                                  const effectParam = tgt.result.buffTurn || 0;
                                  logText = `Shows special combat effect [${getSpecialFloatText(effectType)}] on ${tName} (Pos ${tPos})${effectParam ? `, parameter ${effectParam}` : ''}.`;
                                  cardBgClass = 'border-l-2 border-teal-500/50 hover:bg-teal-500/5 bg-teal-500/[0.01]';
                                  iconLabel = '💬';
                                  textClass = 'text-teal-600 dark:text-teal-400 font-semibold';
                                } else if (tgt.cmd === CMD.STATUS) {
                                  logText = flags.length
                                    ? `Updates combat status for ${tName} (Pos ${tPos}): ${flags.join(', ')}.`
                                    : `Updates combat status for ${tName} (Pos ${tPos}).`;
                                  cardBgClass = 'border-l-2 border-zinc-500/40 hover:bg-hover';
                                  iconLabel = '📊';
                                  textClass = 'text-subtle font-semibold';
                                } else if (tgt.cmd === CMD.NONE) {
                                  logText = `Triggers script action on ${tName} (Pos ${tPos}).`;
                                  cardBgClass = 'border-l-2 border-zinc-500/20 hover:bg-hover';
                                  iconLabel = '⚙️';
                                  textClass = 'text-subtle';
                                }

                                // Highlight if active micro-step target in the player
                                const isStepActive = activeActionIdx === actIdx && activeTargetIdx === tgtIdx;
                                if (isStepActive) {
                                  cardBgClass = 'border-l-4 border-violet-500 bg-violet-500/10 dark:bg-violet-950/20 font-bold scale-[1.01] shadow-sm';
                                }

                                return (
                                  <div
                                    key={tgtIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveActionIdx(actIdx);
                                      setActiveTargetIdx(tgtIdx);
                                    }}
                                    className={`text-xs flex items-center justify-between gap-4 p-2.5 rounded-xl transition-all cursor-pointer select-none ${cardBgClass} ${textClass}`}
                                  >
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="shrink-0 text-sm select-none">{iconLabel}</span>
                                      <span>
                                        {prefix}
                                        {logText}
                                      </span>
                                      {tgt.hpBefore !== undefined && tgt.hpAfter !== undefined && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] bg-bg border border-border text-subtle cursor-help group relative font-mono transition-colors hover:text-text hover:bg-hover select-none">
                                          <span>HP: {Math.round(tgt.hpAfter / 1000)}k</span>
                                          {/* Tooltip on hover */}
                                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
                                            <span className="bg-zinc-950 text-white text-[10px] rounded-xl p-3 shadow-2xl border border-zinc-800 space-y-1.5 w-52 font-sans text-left">
                                              <span className="font-extrabold block text-zinc-300 text-xs border-b border-zinc-800 pb-1">
                                                {tName} HP Ticks
                                              </span>
                                              <span className="flex justify-between font-mono text-zinc-400 pt-0.5">
                                                <span>Before:</span>
                                                <span>{tgt.hpBefore.toLocaleString()}</span>
                                              </span>
                                              <span className="flex justify-between font-mono text-zinc-200 font-bold border-t border-zinc-900 pt-1">
                                                <span>After:</span>
                                                <span>{tgt.hpAfter.toLocaleString()}</span>
                                              </span>
                                              <span
                                                className={`flex justify-between font-mono font-bold text-[9px] ${tgt.hpAfter < tgt.hpBefore
                                                  ? 'text-red-400'
                                                  : tgt.hpAfter > tgt.hpBefore
                                                    ? 'text-emerald-400'
                                                    : 'text-zinc-400'
                                                  }`}
                                              >
                                                <span>Difference:</span>
                                                <span>
                                                  {tgt.hpAfter - tgt.hpBefore > 0
                                                    ? `+${(tgt.hpAfter - tgt.hpBefore).toLocaleString()}`
                                                    : (tgt.hpAfter - tgt.hpBefore).toLocaleString()}
                                                </span>
                                              </span>
                                              {tgt.shieldAfter !== undefined && tgt.shieldAfter > 0 && (
                                                <span className="flex justify-between font-mono text-blue-400 text-[9px] border-t border-zinc-900 pt-1">
                                                  <span>Active Shield:</span>
                                                  <span>{tgt.shieldAfter.toLocaleString()}</span>
                                                </span>
                                              )}
                                              <span className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden block mt-1.5">
                                                <span
                                                  className="h-full bg-gradient-to-r from-red-500 to-emerald-500 block transition-all"
                                                  style={{
                                                    width: `${(tgt.hpAfter / (tgt.maxHp || 1)) * 100}%`,
                                                  }}
                                                ></span>
                                              </span>
                                            </span>
                                            {/* Tooltip triangle */}
                                            <span className="w-2 h-2 bg-zinc-950 rotate-45 -mt-1 border-r border-b border-zinc-800/80"></span>
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                    {tgt.result.hurtAnger !== undefined && tgt.result.hurtAnger !== 0 && (
                                      <span className="font-mono text-[10px] text-orange-500 shrink-0 font-bold bg-orange-500/5 px-1.5 py-0.5 rounded border border-orange-500/10">
                                        Anger: {formatAngerChange(tgt.result.hurtAnger)}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fighter Focus Drill-Down Modal */}
      {report && focusedFighterKey && battleStats && (
        <FighterFocusModal
          isOpen={focusedFighterKey !== null}
          onClose={() => setFocusedFighterKey(null)}
          fighterKey={focusedFighterKey}
          fighterState={battleStats.state.get(focusedFighterKey)!}
          timeline={battleStats.fighterTimeline.get(focusedFighterKey) || []}
          report={report}
          skillsMap={skillsMap}
        />
      )}
    </div>
  );
};
