import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { loadHeroes, loadSkills, loadBuffEffects, loadEnemies, loadKnives } from '../data/loaders';
import { Hero, Skill, BuffEffect, Enemy, Knife } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

import {
  Swords,
  Search,
  FileCode,
  UploadCloud,
  Play,
  ShieldAlert,
  ListOrdered,
  Award,
  Download,
  Copy,
  Clock,
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
  FightReportData,
  ParseDebugInfo,
  FightTurn,
  FightActive,
  FightTarget
} from '../utils/fight-report/parser';

import {
  simulateFightReport,
  KeyMoment
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

interface RecentReport {
  rid: string;
  aid: string;
  lang: string;
  timestamp: number;
}

export const FightReportPage: React.FC = () => {
  // Database loader states
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [buffs, setBuffs] = useState<BuffEffect[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [knives, setKnives] = useState<Knife[]>([]);
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

  // Clipboard copy feedback toast
  const [copiedText, setCopiedText] = useState(false);

  // Log filter controls
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'damage' | 'heal' | 'death' | 'buff' | 'shield' | 'crit'>('all');

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
      const [heroesRes, skillsRes, buffsRes, enemiesRes, knivesRes] = await Promise.all([
        loadHeroes(),
        loadSkills(),
        loadBuffEffects(),
        loadEnemies(),
        loadKnives()
      ]);
      setHeroes(heroesRes.rows);
      setSkills(skillsRes.rows);
      setBuffs(buffsRes.rows);
      setEnemies(enemiesRes.rows);
      setKnives(knivesRes.rows);
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
    skills.forEach(s => map.set(s.skill_id, s.name || `Skill #${s.skill_id}`));
    return map;
  }, [skills]);

  const buffsMap = useMemo(() => {
    const map = new Map<number, string>();
    buffs.forEach(b => map.set(b.id, b.name || `Buff #${b.id}`));
    return map;
  }, [buffs]);

  const knivesMap = useMemo(() => {
    const map = new Map<number, Knife>();
    knives.forEach(k => map.set(k.id, k));
    return map;
  }, [knives]);

  // Translate role name
  const resolveRoleName = (role: FightRole): string => {
    if (role.name && role.name.trim()) return role.name;
    const match = heroesMap.get(role.roleId);
    if (match && match.name) return match.name;
    const enemyMatch = enemiesMap.get(role.roleId);
    if (enemyMatch && enemyMatch.name) return enemyMatch.name;
    return `Mercenary #${role.roleId}`;
  };

  // Translate attacker name, resolving pos 100 as the team's Zanpakuto (Knife)
  const resolveAttackerName = useCallback((camp: number, pos: number, role?: FightRole): string => {
    if (pos === 100) {
      const group = camp === 0 ? report?.team1 : report?.team2;
      const knifeId = group?.knifeOfKillSoulId || 0;
      if (knifeId > 0) {
        const match = knivesMap.get(knifeId);
        if (match && match.name) return match.name;
      }
      return "Zanpakuto (Knife)";
    }
    if (role) return resolveRoleName(role);
    return `Fighter Pos ${pos}`;
  }, [report, knivesMap, resolveRoleName]);

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

    const parseGroup = (camp: number): any => {
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
  const handleFetchReport = async (overrideUrl?: string) => {
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

      if (targetQuery.includes('rid=')) {
        const queryStr = targetQuery.split('?')[1] || '';
        const params = new URLSearchParams(queryStr);
        rid = params.get('rid') || "";
        aid = params.get('aid') || "86";
        lang = params.get('lang') || "en_US";
      } else {
        rid = targetQuery.trim();
      }

      if (!rid) {
        throw new Error("Could not parse fight Report ID (rid). Validate query string matches standard formats.");
      }

      setParseStage('fetching');
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

      const proxyUrl = `https://cors-proxy.shinigamiworld-fightreport.workers.dev/?url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Proxy worker rejected combat packets request: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength < 10) {
        throw new Error("Combat packet binary is empty or truncated. Ensure fight ID remains unexpired.");
      }

      setParseStage('parsing');
      const { report: decodedReport, debug: decodedDebug } = decodeReportBinary(arrayBuffer);

      setParseStage('simulating');
      // Triggers state flow simulation automatically via useMemo on battleStats
      setReport(decodedReport);
      setDebugInfo(decodedDebug);
      setSelectedRoundTab(1);

      // Save to local storage history
      saveRecentReport(rid, aid, lang);

      // Update Query String parameters
      const url = new URL(window.location.href);
      url.searchParams.set('rid', rid);
      url.searchParams.set('aid', aid);
      url.searchParams.set('lang', lang);
      window.history.replaceState(null, '', url.toString());

      setParseStage('done');
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || "Decoding failure during remote link parsing. Use drag and drop upload fallback.");
      setParseStage('error');
    }
  };

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
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength < 10) {
          throw new Error("Uploaded binary buffer is truncated or corrupted.");
        }
        const { report: decodedReport, debug: decodedDebug } = decodeReportBinary(buffer);
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

  // Auto load rid from query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('rid');
    const aid = params.get('aid') || '86';
    const lang = params.get('lang') || 'en_US';

    if (rid) {
      const simulatedUrl = `rid=${rid}&aid=${aid}&lang=${lang}`;
      setInputUrl(simulatedUrl);
      handleFetchReport(simulatedUrl);
    }
  }, []);

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

  // Fighter names Map for timeline select filter
  const fighterNames = useMemo(() => {
    const map = new Map<string, string>();
    if (!report) return map;

    report.team1.roles.forEach(r => map.set(`0_${r.pos}`, resolveRoleName(r)));
    report.team2.roles.forEach(r => map.set(`1_${r.pos}`, resolveRoleName(r)));
    return map;
  }, [report, heroesMap, enemiesMap]);

  // Jump to specific key moment handler
  const handleJumpToMoment = (moment: KeyMoment) => {
    setActiveTab('log');
    setSelectedRoundTab(moment.round);
    setHighlightedMomentId(`${moment.round}-${moment.activeIndex}`);
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
      const attackerName = attackerRole ? resolveRoleName(attackerRole) : `Fighter Pos ${attackerPos}`;

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
    }).filter(act => act.matchedTargets.length > 0 || !logSearch.trim()); // Only keep active skills if they matched searches
  }, [report, selectedRoundTab, logSearch, logFilter, heroesMap, enemiesMap, skillsMap]);

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
                  {battleStats.winnerCamp === 0 ? 'Team 1 (Attacker)' : 'Team 2 (Defender)'}
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
          {activeTab === 'log' && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Left Column: Round navigations */}
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
              </div>

              {/* Right Column: Interactive log sequences */}
              <div className="xl:col-span-3 border border-border bg-surface p-6 rounded-2xl shadow-sm space-y-4">
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
                        className="w-full md:w-36 pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-border bg-bg text-text font-bold focus:outline-none"
                      >
                        <option value="all">All Actions</option>
                        <option value="damage">Damage Dealt</option>
                        <option value="heal">Heals Received</option>
                        <option value="death">Unit Deaths</option>
                        <option value="shield">Shields Applied</option>
                        <option value="buff">Buff Triggers</option>
                        <option value="crit">Critical Hits</option>
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
                      const highlighted = highlightedMomentId === `${selectedRoundTab}-${actIdx}`;

                      return (
                        <div
                          key={actIdx}
                          className={`pt-4 ${actIdx === 0 ? 'pt-0' : ''} space-y-2.5 transition-all duration-300 ${highlighted
                              ? 'bg-violet-500/5 dark:bg-violet-500/5 border border-violet-500/15 p-3 rounded-2xl'
                              : ''
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-subtle uppercase">
                              ACTION #{actIdx + 1}
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
                              const tName = tRole ? resolveRoleName(tRole) : `Target Pos ${tPos}`;
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
                              let logClass = 'text-muted';

                              const getBuffName = (bId: number): string => {
                                if (bId === 4294967295) return 'Generic Buff';
                                if (bId === 0) return 'Null Buff';
                                return buffsMap.get(bId) || `Buff #${bId}`;
                              };

                              if (tgt.cmd === CMD.ATTACK || tgt.cmd === CMD.ATTACKEX || tgt.cmd === CMD.HURTBUFF) {
                                if (hurtHp > 0) {
                                  const suffix = flags.length ? ` (${flags.join(', ')})` : '';
                                  logText = `Hits ${tName} (Pos ${tPos}) dealing ${hurtHp.toLocaleString()} damage${suffix}.`;
                                  logClass = 'text-red-600 dark:text-red-400 font-medium';
                                } else if (hurtHp < 0) {
                                  logText = `Heals ${tName} (Pos ${tPos}) for ${(-hurtHp).toLocaleString()} HP.`;
                                  logClass = 'text-emerald-600 dark:text-emerald-450 font-medium';
                                } else {
                                  if (flags.includes('Super Dodge / All Miss')) {
                                    logText = `${tName} (Pos ${tPos}) dodges / all-misses the effect.`;
                                    logClass = 'text-muted';
                                  } else if (flags.includes('Invincible')) {
                                    logText = `${tName} (Pos ${tPos}) takes no damage due to Invincible.`;
                                    logClass = 'text-muted';
                                  } else if (flags.includes('Block')) {
                                    logText = `${tName} (Pos ${tPos}) blocks the hit with no HP loss.`;
                                    logClass = 'text-muted';
                                  } else {
                                    logText = `Targets ${tName} (Pos ${tPos}) with no HP change${flags.length ? ` (${flags.join(', ')})` : ''
                                      }.`;
                                    if (isCombo) {
                                      logClass = 'text-zinc-500 dark:text-zinc-400 font-bold bg-fuchsia-500/5 dark:bg-fuchsia-500/5 border border-fuchsia-500/20 px-2 py-0.5 rounded-lg';
                                    } else if (isAid) {
                                      logClass = 'text-zinc-500 dark:text-zinc-400 font-bold bg-sky-500/5 dark:bg-sky-500/5 border border-sky-500/20 px-2 py-0.5 rounded-lg';
                                    } else {
                                      logClass = 'text-muted';
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
                                logClass = 'text-blue-600 dark:text-blue-400 font-medium';
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
                                logClass = 'text-purple-600 dark:text-purple-400';
                              } else if (tgt.cmd === CMD.POSITION) {
                                const newPos = tgt.result.buffTurn || tPos;
                                logText = `Moves ${tName} from position ${tPos} to position ${newPos}.`;
                                logClass = 'text-amber-600 dark:text-amber-400';
                              } else if (tgt.cmd === CMD.FLOAT) {
                                const effectType = tgt.result.buffId || 0;
                                const effectParam = tgt.result.buffTurn || 0;
                                logText = `Shows special combat effect [${getSpecialFloatText(effectType)}] on ${tName} (Pos ${tPos})${effectParam ? `, parameter ${effectParam}` : ''
                                  }.`;
                                logClass = 'text-teal-600 dark:text-teal-400';
                              } else if (tgt.cmd === CMD.STATUS) {
                                logText = flags.length
                                  ? `Updates combat status for ${tName} (Pos ${tPos}): ${flags.join(', ')}.`
                                  : `Updates combat status for ${tName} (Pos ${tPos}).`;

                                if (isCombo) {
                                  logClass = 'text-zinc-500 dark:text-zinc-400 font-bold bg-fuchsia-500/5 dark:bg-fuchsia-500/5 border border-fuchsia-500/20 px-2 py-0.5 rounded-lg';
                                } else if (isAid) {
                                  logClass = 'text-zinc-500 dark:text-zinc-400 font-bold bg-sky-500/5 dark:bg-sky-500/5 border border-sky-500/20 px-2 py-0.5 rounded-lg';
                                } else {
                                  logClass = 'text-muted';
                                }
                              } else if (tgt.cmd === CMD.NONE) {
                                logText = `Triggers script action / combat visual on ${tName} (Pos ${tPos}).`;
                                if (isCombo) {
                                  logClass = 'text-zinc-500 dark:text-zinc-400 font-bold bg-fuchsia-500/5 dark:bg-fuchsia-500/5 border border-fuchsia-500/20 px-2 py-0.5 rounded-lg';
                                } else if (isAid) {
                                  logClass = 'text-zinc-500 dark:text-zinc-400 font-bold bg-sky-500/5 dark:bg-sky-500/5 border border-sky-500/20 px-2 py-0.5 rounded-lg';
                                } else {
                                  logClass = 'text-subtle dark:text-muted';
                                }
                              }

                              return (
                                <div
                                  key={tgtIdx}
                                  className={`text-xs flex items-center justify-between gap-4 py-1 hover:bg-hover px-2 rounded-xl transition-all ${logClass}`}
                                >
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span>
                                      ↳ {prefix}
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
                                    <span className="font-mono text-[10px] text-orange-500 shrink-0 font-bold">
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
          )}
        </div>
      )}
    </div>
  );
};
