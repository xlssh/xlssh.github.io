import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadHeroes, loadRecommendHeroes } from '../data/loaders';
import { Hero, RecommendHero } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getProfessionLabel } from '../data/relationships';
import { getQualityLabel, getQualityColorClass } from './HeroesPage';
import {
  Users, Swords, Shield, Zap, Star, RotateCcw,
  Save, Share2, Check, X, Info, Target, TrendingUp, Crosshair, BarChart3,
  AlertTriangle, Wand2
} from 'lucide-react';

// =========================================================
// Real Formation Layout (from TBattleConfig.as + TProcessorWindowTacticalDeployment.as)
// Grid:   1 Vanguard (front) | 3 Assault (mid) | 3 Support (rear)
// Max active partners: 5  (FightHeroNum determined by MilitaryRank)
// Total slots: 7
// =========================================================

const MAX_PARTNERS = 5;

// Column definition: id, label, slots count, role, colors
const COLUMNS = [
  { id: 'vanguard', label: 'Vanguard', count: 1, role: 1, headerColor: 'text-emerald-400', slotBorder: 'border-emerald-700/50 bg-emerald-950/10', selBorder: 'border-emerald-400', professions: [2], profLabel: 'Defending' },
  { id: 'assault', label: 'Assault', count: 3, role: 2, headerColor: 'text-rose-400', slotBorder: 'border-rose-700/50 bg-rose-950/10', selBorder: 'border-rose-400', professions: [1, 4], profLabel: 'Strength / Agility' },
  { id: 'support', label: 'Support', count: 3, role: 3, headerColor: 'text-violet-400', slotBorder: 'border-violet-700/50 bg-violet-950/10', selBorder: 'border-violet-400', professions: [3, 5], profLabel: 'Intellect / Warlock' },
];

// Flatten all slot positions: [colIdx, slotInCol]
const ALL_SLOTS: Array<{ col: number; row: number; slot: number }> = [];
let slotCounter = 1;
COLUMNS.forEach((col, ci) => {
  for (let r = 0; r < col.count; r++) {
    ALL_SLOTS.push({ col: ci, row: r, slot: slotCounter++ });
  }
});
const TOTAL_SLOTS = ALL_SLOTS.length; // 7

const PROF_COLOR: Record<number, string> = {
  1: 'text-amber-400',
  2: 'text-emerald-400',
  3: 'text-violet-400',
  4: 'text-rose-400',
  5: 'text-fuchsia-400',
};

const TIER_ORDER = ['SS', 'S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'C', 'D'];
function tierValue(t: string | null) { const i = t ? TIER_ORDER.indexOf(t) : -1; return i >= 0 ? TIER_ORDER.length - i : 0; }

// Source field: 1=Tavern(F2P), 6=Limited Gacha, 8-11=Premium events
function isF2P(source: number | null): boolean { return source === 1 || source === 5; }

function calcPower(h: Hero, lv: number) {
  const l = Math.max(1, lv);
  return (
    (h.power ?? 0) + Math.round((h.power_grow ?? 0) * (l - 1)) +
    (h.agile ?? 0) + Math.round((h.agile_grow ?? 0) * (l - 1)) +
    (h.intelligence ?? 0) + Math.round((h.intelligence_grow ?? 0) * (l - 1)) +
    Math.round(((h.life ?? 0) + Math.round((h.life_grow ?? 0) * (l - 1))) / 10)
  );
}

const PRESET_KEY = 'bf_formation_v3';
function loadPresets(): (number[] | null)[] {
  try { const r = localStorage.getItem(PRESET_KEY); return r ? JSON.parse(r) : [null, null, null]; } catch { return [null, null, null]; }
}
function savePresets(p: (number[] | null)[]) { try { localStorage.setItem(PRESET_KEY, JSON.stringify(p)); } catch { } }

// ---- Archetype templates ----
interface Archetype {
  name: string;
  emoji: string;
  desc: string;
  profPrefs: number[][];  // per column [profs preferred]
  tierMin: string;
}
const ARCHETYPES: Archetype[] = [
  { name: 'Full Push', emoji: '⚔️', desc: 'Aggressive lineup — max Strength/Agility DPS with Defending front', profPrefs: [[2], [4, 1, 4], [3]], tierMin: 'A' },
  { name: 'Turtle Fortress', emoji: '🛡️', desc: 'Defensive wall — Defending vanguard, Warlock/Intellect rear support', profPrefs: [[2], [2, 4, 2], [5, 3, 5]], tierMin: 'B+' },
  { name: 'Magic Nuke', emoji: '🔮', desc: 'Mass arcane damage — Intellect/Warlock stacked in rear', profPrefs: [[2], [3, 5, 3], [3, 5, 3]], tierMin: 'B' },
  { name: 'Balanced', emoji: '⚖️', desc: 'Flexible all-rounder — one of each major profession', profPrefs: [[2], [4, 1, 3], [3, 5, 2]], tierMin: 'A-' },
];

// ---- Slot Card ----
interface SlotCardProps { slot: number; col: number; hero: Hero | null; isSelected: boolean; isActive: boolean; isMc: boolean; onClick: () => void; onRemove: (e: React.MouseEvent) => void; }
const SlotCard: React.FC<SlotCardProps> = ({ slot, col, hero, isSelected, isActive, isMc, onClick, onRemove }) => {
  const colMeta = COLUMNS[col];
  if (!hero) {
    return (
      <button onClick={onClick}
        className={`w-full ${col === 0 ? 'h-28' : 'h-20'} rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-0.5 transition-all group ${isSelected ? `${colMeta.selBorder} bg-surface/60` : `${colMeta.slotBorder} text-muted hover:text-subtle`
          }`}>
        <span className="text-[9px] font-bold text-text">#{slot}</span>
        <span className="text-[9px] text-text group-hover:text-muted transition-colors">+ Place</span>
      </button>
    );
  }
  return (
    <div onClick={onClick}
      className={`relative w-full rounded-xl border-2 p-2 cursor-pointer transition-all space-y-1 ${isSelected ? 'border-fuchsia-500 bg-fuchsia-950/20' : isActive ? 'border-zinc-600 bg-surface hover:border-zinc-500' : 'border-border bg-bg/60 opacity-50'
        }`}>
      {!isMc && (
        <button onClick={onRemove} className="absolute top-1 right-1 p-0.5 rounded-full bg-surface hover:bg-rose-900/60 text-muted hover:text-rose-400 transition-colors z-10">
          <X size={9} />
        </button>
      )}
      {!isActive && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-bg/50">
          <span className="text-[8px] font-bold text-amber-400 bg-surface px-1.5 py-0.5 rounded">Benched</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[8px] text-muted">#{slot} {isMc && <span className="text-[8px] font-bold text-fuchsia-400">★ Main</span>}</span>
        <span className={`text-[8px] font-bold ${getQualityColorClass(hero.quality)}`}>{getQualityLabel(hero.quality)}</span>
      </div>
      <div className="text-[10px] font-bold text-white leading-tight pr-3 line-clamp-2">{hero.name}</div>
      <div className="flex items-center gap-1">
        <span className={`text-[8px] font-bold ${PROF_COLOR[hero.profession ?? 0] ?? 'text-muted'}`}>{getProfessionLabel(hero.profession)}</span>
        {hero.role && <span className="text-[8px] text-muted">{hero.role}</span>}
      </div>
    </div>
  );
};

// ---- Main Page ----
export const FormationBuilderPage: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendHero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // slots[0..6] — slot 1=Vanguard, 2-4=Assault, 5-7=Support
  const [slots, setSlots] = useState<(Hero | null)[]>(Array(TOTAL_SLOTS).fill(null));
  // activeSlots: which slots are marked active (max MAX_PARTNERS)
  const [activeSet, setActiveSet] = useState<Set<number>>(new Set()); // slot 1-based
  const [selectedMcId, setSelectedMcId] = useState<number>(11100001); // default Ghostsword Male
  const [mcSlotNum, setMcSlotNum] = useState<number>(2); // Default to Assault (slot 2)

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState(0);
  const [profFilter, setProfFilter] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetLevel, setTargetLevel] = useState(50);
  const [presetIds, setPresetIds] = useState<(number[] | null)[]>(() => loadPresets());
  const [copied, setCopied] = useState(false);
  const [activeArchetype, setActiveArchetype] = useState<string | null>(null);
  const [tab, setTab] = useState<'build' | 'export'>('build');

  const mcList = useMemo(() => heroes.filter(h => h.is_main === 1 || h.is_main === true), [heroes]);
  const selectedMc = useMemo(() => heroes.find(h => h.id === selectedMcId) || null, [heroes, selectedMcId]);

  const finalSlots = useMemo(() => {
    const arr = [...slots];
    if (selectedMc) {
      arr[mcSlotNum - 1] = selectedMc;
    }
    return arr;
  }, [slots, selectedMc, mcSlotNum]);

  const finalActiveSet = useMemo(() => {
    const next = new Set(activeSet);
    next.add(mcSlotNum);
    return next;
  }, [activeSet, mcSlotNum]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [hr, rr] = await Promise.all([loadHeroes(), loadRecommendHeroes()]);
      setHeroes(hr.rows);
      setRecommendations(rr.rows);
      const hash = window.location.hash.replace('#f=', '');
      if (hash && hash.includes(',')) {
        const ids = hash.split(',').map(Number);
        const loadedSlots = ids.slice(0, TOTAL_SLOTS).map(id => id ? hr.rows.find(h => h.id === id) ?? null : null);

        // Find if there is an MC in the loaded slots
        const mcIdx = loadedSlots.findIndex(h => h && (h.is_main === 1 || h.is_main === true));
        if (mcIdx >= 0 && loadedSlots[mcIdx]) {
          setSelectedMcId(loadedSlots[mcIdx]!.id);
          setMcSlotNum(mcIdx + 1);
        }

        setSlots(loadedSlots.map((h, i) => i === mcIdx ? null : h));
        const activeIds = new Set(ids.slice(0, TOTAL_SLOTS).map((id, i) => id ? i + 1 : 0).filter(Boolean));
        setActiveSet(activeIds);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filledSlots = useMemo(() => finalSlots.filter(Boolean) as Hero[], [finalSlots]);
  const activeHeroes = useMemo(() => {
    return ALL_SLOTS
      .filter(s => finalActiveSet.has(s.slot) && finalSlots[s.slot - 1])
      .map(s => finalSlots[s.slot - 1]!);
  }, [finalSlots, finalActiveSet]);

  const totalPower = useMemo(() => activeHeroes.reduce((s, h) => s + calcPower(h, targetLevel), 0), [activeHeroes, targetLevel]);

  const rangeCoverage = useMemo(() => {
    const near = activeHeroes.reduce((s, h) => s + (h.near_attack ?? 0), 0);
    const far = activeHeroes.reduce((s, h) => s + (h.far_attack ?? 0), 0);
    const strat = activeHeroes.reduce((s, h) => s + (h.strategy_attack ?? 0), 0);
    return { near, far, strat, total: near + far + strat || 1 };
  }, [activeHeroes]);

  const profBreakdown = useMemo(() => {
    const c: Record<number, number> = {};
    activeHeroes.forEach(h => { if (h.profession) c[h.profession] = (c[h.profession] || 0) + 1; });
    return c;
  }, [activeHeroes]);

  // Slot placement suggestions for selected slot
  const slotSuggestions = useMemo(() => {
    if (selectedSlot === null) return [];
    const slotDef = ALL_SLOTS.find(s => s.slot === selectedSlot)!;
    const colMeta = COLUMNS[slotDef.col];
    const deployedIds = new Set(finalSlots.filter(Boolean).map(h => h!.id));
    return heroes
      .filter(h => !h.is_main && !deployedIds.has(h.id) && colMeta.professions.includes(h.profession ?? 0))
      .sort((a, b) => tierValue(b.role) - tierValue(a.role))
      .slice(0, 5);
  }, [selectedSlot, heroes, finalSlots]);

  const heroPool = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const deployedIds = new Set(finalSlots.filter(Boolean).map(h => h!.id));
    return heroes
      .filter(h => {
        if (h.is_main) return false; // Exclude ALL main characters
        if (deployedIds.has(h.id)) return false;
        if (q && !(h.name ?? '').toLowerCase().includes(q)) return false;
        if (profFilter && h.profession !== profFilter) return false;
        if (roleFilter === 1 && h.profession !== 2) return false;
        if (roleFilter === 2 && h.profession !== 4 && h.profession !== 1) return false;
        if (roleFilter === 3 && h.profession !== 3 && h.profession !== 5) return false;
        return true;
      })
      .sort((a, b) => tierValue(b.role) - tierValue(a.role));
  }, [heroes, searchQuery, profFilter, roleFilter, finalSlots]);

  function placeHero(hero: Hero) {
    if (selectedSlot === null || selectedSlot === mcSlotNum) return;
    const idx = selectedSlot - 1;
    setSlots(prev => { const n = [...prev]; n[idx] = hero; return n; });
    // Auto-activate if under max
    if (finalActiveSet.size < MAX_PARTNERS) {
      setActiveSet(prev => new Set([...prev, selectedSlot]));
    }
    const nextEmpty = ALL_SLOTS.find(s => s.slot > selectedSlot && s.slot !== mcSlotNum && !finalSlots[s.slot - 1]);
    setSelectedSlot(nextEmpty ? nextEmpty.slot : null);
  }

  function removeHero(slot: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (slot === mcSlotNum) return; // Cannot remove MC
    setSlots(prev => { const n = [...prev]; n[slot - 1] = null; return n; });
    setActiveSet(prev => { const n = new Set(prev); n.delete(slot); return n; });
  }

  function toggleActive(slot: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (slot === mcSlotNum) return; // Cannot bench MC
    if (!finalSlots[slot - 1]) return;
    setActiveSet(prev => {
      const n = new Set(prev);
      if (n.has(slot)) { n.delete(slot); }
      else if (finalActiveSet.size < MAX_PARTNERS) { n.add(slot); }
      return n;
    });
  }

  function clearAll() {
    setSlots(Array(TOTAL_SLOTS).fill(null));
    setActiveSet(new Set([mcSlotNum]));
    setSelectedSlot(null);
    setActiveArchetype(null);
  }

  function autoFill() {
    const deployedIds = new Set(finalSlots.filter(Boolean).map(h => h!.id));
    const pool = [...heroes].filter(h => !h.is_main && !deployedIds.has(h.id)).sort((a, b) => tierValue(b.role) - tierValue(a.role));
    const nextSlots = [...slots];
    const newActive = new Set(activeSet);
    for (const slotDef of ALL_SLOTS) {
      if (slotDef.slot === mcSlotNum) continue;
      if (!nextSlots[slotDef.slot - 1]) {
        const colMeta = COLUMNS[slotDef.col];
        const match = pool.findIndex(h => colMeta.professions.includes(h.profession ?? 0));
        if (match >= 0) {
          nextSlots[slotDef.slot - 1] = pool.splice(match, 1)[0];
          if (newActive.size + 1 < MAX_PARTNERS) newActive.add(slotDef.slot);
        }
      }
    }
    setSlots(nextSlots);
    setActiveSet(newActive);
  }

  function applyArchetype(arch: Archetype) {
    const newSlots = Array(TOTAL_SLOTS).fill(null) as (Hero | null)[];
    const newActive = new Set<number>([mcSlotNum]);
    const used = new Set<number>([selectedMcId]);

    ALL_SLOTS.forEach(({ col, row, slot }) => {
      if (slot === mcSlotNum) return;
      const prefs = arch.profPrefs[col] ?? [];
      const prefProf = prefs[row] ?? prefs[0] ?? 0;
      const match = heroes.find(h =>
        !h.is_main &&
        !used.has(h.id) &&
        h.profession === prefProf &&
        tierValue(h.role) >= tierValue(arch.tierMin)
      );
      if (match) {
        newSlots[slot - 1] = match;
        used.add(match.id);
        if (newActive.size < MAX_PARTNERS) newActive.add(slot);
      }
    });

    setSlots(newSlots);
    setActiveSet(newActive);
    setActiveArchetype(arch.name);
    setTab('build');
  }

  function savePreset(i: number) {
    const ids = finalSlots.map(h => h?.id ?? 0);
    const next = [...presetIds]; next[i] = ids; setPresetIds(next); savePresets(next);
  }

  function loadPreset(i: number) {
    const ids = presetIds[i]; if (!ids) return;
    const loadedSlots = ids.map(id => heroes.find(h => h.id === id) ?? null);
    const mcIdx = loadedSlots.findIndex(h => h && (h.is_main === 1 || h.is_main === true));
    if (mcIdx >= 0 && loadedSlots[mcIdx]) {
      setSelectedMcId(loadedSlots[mcIdx]!.id);
      setMcSlotNum(mcIdx + 1);
    }
    setSlots(loadedSlots.map((h, idx) => idx === mcIdx ? null : h));
    setActiveSet(new Set(ids.map((id, idx) => id ? idx + 1 : 0).filter(Boolean).slice(0, MAX_PARTNERS)));
    setSelectedSlot(null);
  }

  function shareFormation() {
    const encoded = finalSlots.map(h => h?.id ?? 0).join(',');
    const url = `${window.location.href.split('#')[0]}#f=${encoded}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  // Meta analysis
  const metaAnalysis = useMemo(() => {
    const f2pHeroes = heroes.filter(h => isF2P(h.source)).sort((a, b) => tierValue(b.role) - tierValue(a.role));
    const premiumHeroes = heroes.filter(h => !isF2P(h.source)).sort((a, b) => tierValue(b.role) - tierValue(a.role));
    function bestFormation(pool: Hero[]): (Hero | null)[] {
      const used = new Set<number>();
      return ALL_SLOTS.map(({ col }) => {
        const colMeta = COLUMNS[col];
        const match = pool.find(h => !used.has(h.id) && colMeta.professions.includes(h.profession ?? 0));
        if (match) { used.add(match.id); return match; }
        return null;
      });
    }
    return { f2p: bestFormation(f2pHeroes), premium: bestFormation(premiumHeroes) };
  }, [heroes]);

  if (loading) return <LoadingState message="Loading formation database..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const slotDef = selectedSlot ? ALL_SLOTS.find(s => s.slot === selectedSlot) : null;
  const selColMeta = slotDef ? COLUMNS[slotDef.col] : null;

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text tracking-tight">⚔️ Formation Builder</h1>
          <p className="text-sm text-muted mt-0.5">
            1 Vanguard · 3 Assault · 3 Support · max <span className="text-fuchsia-400 font-bold">{MAX_PARTNERS}</span> active partners
          </p>
          {activeArchetype && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-300 bg-amber-950/30 border border-amber-700/40 px-2 py-0.5 rounded-full">
              <Wand2 size={9} /> {activeArchetype} archetype applied
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={autoFill} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-900/30 hover:bg-amber-800/50 text-amber-300 rounded-lg border border-amber-700/50 transition-colors">
            <Star size={12} /> Auto-Fill
          </button>
          <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-surface hover:bg-rose-950/40 text-subtle hover:text-rose-400 rounded-lg border border-zinc-700 transition-colors">
            <RotateCcw size={12} /> Clear
          </button>
          <button onClick={shareFormation} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-fuchsia-900/40 hover:bg-fuchsia-800/50 text-fuchsia-300 rounded-lg border border-fuchsia-700/50 transition-colors">
            {copied ? <Check size={12} /> : <Share2 size={12} />} {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>

      {/* Level slider */}
      <div className="flex items-center gap-4 p-3 bg-surface/70 rounded-xl border border-border">
        <TrendingUp size={14} className="text-fuchsia-400 shrink-0" />
        <span className="text-xs font-bold text-subtle w-20 shrink-0">Sim Level</span>
        <input type="range" min={1} max={200} value={targetLevel} onChange={e => setTargetLevel(+e.target.value)} className="flex-1 accent-fuchsia-500 cursor-pointer" />
        <span className="text-xs font-black font-mono text-fuchsia-300 w-12 text-right">Lv.{targetLevel}</span>
      </div>

      {/* Main Character Config Card */}
      <div className="p-4 bg-surface border border-border rounded-xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="space-y-1">
          <span className="text-xs font-bold text-subtle uppercase tracking-wider block">Wielder (Main Character)</span>
          <span className="text-[11px] text-muted">Every team deployment requires exactly one Main Character. Select class & grid position.</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* MC Selector */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={selectedMcId}
              onChange={(e) => {
                const mcId = parseInt(e.target.value);
                setSelectedMcId(mcId);
                const matchedMc = heroes.find(h => h.id === mcId);
                if (matchedMc) {
                  // auto-shift slot based on profession
                  if (matchedMc.profession === 4 || matchedMc.profession === 1) setMcSlotNum(2); // Assault (slot 2)
                  if (matchedMc.profession === 3 || matchedMc.profession === 5) setMcSlotNum(5); // Support (slot 5)
                }
              }}
              className="px-3 py-2 border border-border bg-bg text-xs font-bold rounded-xl text-fuchsia-300 w-full cursor-pointer"
            >
              {mcList.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          {/* Position Selector */}
          <div className="flex items-center gap-1.5 bg-bg p-1.5 border border-border rounded-xl">
            <span className="text-[10px] font-bold text-muted uppercase px-1.5">Grid Slot:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map(slot => (
                <button
                  key={slot}
                  onClick={() => {
                    setMcSlotNum(slot);
                    // clear any benched partner at that slot
                    setSlots(prev => {
                      const n = [...prev];
                      n[slot - 1] = null;
                      return n;
                    });
                    setActiveSet(prev => {
                      const n = new Set(prev);
                      n.add(slot);
                      return n;
                    });
                  }}
                  className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[10px] font-bold transition-all cursor-pointer ${mcSlotNum === slot
                    ? 'bg-fuchsia-600 text-white shadow-sm'
                    : 'bg-surface border border-border text-muted hover:text-subtle'
                    }`}
                >
                  #{slot}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-0.5">
        {([['build', '🗺 Build'], ['export', '📤 Export']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg border border-b-0 transition-colors ${tab === id ? 'border-zinc-700 bg-surface text-zinc-200' : 'border-transparent text-muted hover:text-subtle'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* === TAB: BUILD === */}
      {tab === 'build' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-5">
            {/* Active partner counter */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${finalActiveSet.size >= MAX_PARTNERS ? 'border-amber-700/50 bg-amber-950/20' : 'border-border bg-surface/50'}`}>
              <Users size={14} className={finalActiveSet.size >= MAX_PARTNERS ? 'text-amber-400' : 'text-fuchsia-400'} />
              <span className="text-xs font-bold text-subtle">Active Partners:</span>
              <div className="flex gap-1">
                {Array.from({ length: MAX_PARTNERS }, (_, i) => (
                  <div key={i} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${i < finalActiveSet.size ? 'border-fuchsia-500 bg-fuchsia-500/30' : 'border-zinc-700 bg-transparent'}`}>
                    {i < finalActiveSet.size && <div className="w-2 h-2 rounded-full bg-fuchsia-400" />}
                  </div>
                ))}
              </div>
              <span className={`text-xs font-mono font-black ml-auto ${finalActiveSet.size >= MAX_PARTNERS ? 'text-amber-400' : 'text-fuchsia-300'}`}>{finalActiveSet.size}/{MAX_PARTNERS}</span>
              {finalActiveSet.size >= MAX_PARTNERS && <AlertTriangle size={12} className="text-amber-400" />}
            </div>

            {/* The 1+3+3 Grid */}
            <div className="flex gap-4">
              {COLUMNS.map((col, ci) => (
                <div key={col.id} className="flex-1 space-y-2 min-w-0">
                  <div className={`text-center text-[10px] font-black uppercase tracking-widest ${col.headerColor}`}>
                    {col.label}
                    <span className="block text-[8px] text-muted font-normal normal-case tracking-normal">{col.profLabel}</span>
                  </div>
                  {Array.from({ length: col.count }, (_, ri) => {
                    const sd = ALL_SLOTS.find(s => s.col === ci && s.row === ri)!;
                    const hero = finalSlots[sd.slot - 1];
                    const isAct = finalActiveSet.has(sd.slot);
                    const isMc = sd.slot === mcSlotNum;
                    return (
                      <div key={ri} className="relative">
                        <SlotCard
                          slot={sd.slot} col={ci}
                          hero={hero}
                          isSelected={selectedSlot === sd.slot}
                          isActive={isAct}
                          isMc={isMc}
                          onClick={() => setSelectedSlot(selectedSlot === sd.slot ? null : sd.slot)}
                          onRemove={e => removeHero(sd.slot, e)}
                        />
                        {hero && (
                          <button
                            onClick={e => toggleActive(sd.slot, e)}
                            disabled={isMc}
                            title={isMc ? 'Main Character Locked' : isAct ? 'Bench this hero' : finalActiveSet.size >= MAX_PARTNERS ? 'Max partners reached' : 'Activate this hero'}
                            className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-black transition-colors ${isMc ? 'bg-fuchsia-600/50 text-fuchsia-100 border border-fuchsia-600 cursor-default' :
                              isAct ? 'bg-fuchsia-600/50 text-fuchsia-200 border border-fuchsia-600/40 hover:bg-rose-900/50 hover:text-rose-300 hover:border-rose-600/40' :
                                finalActiveSet.size >= MAX_PARTNERS ? 'bg-surface text-muted border border-zinc-700 cursor-not-allowed' :
                                  'bg-surface text-muted border border-zinc-700 hover:bg-fuchsia-900/40 hover:text-fuchsia-300 hover:border-fuchsia-700/40'
                              }`}>
                            {isAct ? '● Active' : '○ Bench'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-fuchsia-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-subtle">Power</span>
                </div>
                <div className="text-2xl font-black text-fuchsia-300 font-mono">{totalPower.toLocaleString()}</div>
                <div className="text-[10px] text-muted">{finalActiveSet.size}/{MAX_PARTNERS} active · Lv.{targetLevel}</div>
                <div className="space-y-1.5 border-t border-border pt-2">
                  {[1, 2, 3, 4, 5].map(p => {
                    const c = profBreakdown[p] ?? 0; if (!c) return null; return (
                      <div key={p} className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold w-16 ${PROF_COLOR[p]}`}>{getProfessionLabel(p)}</span>
                        <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                          <div className="h-full bg-fuchsia-500 rounded-full" style={{ width: `${(c / finalActiveSet.size) * 100}%` }} />
                        </div>
                        <span className="text-[9px] font-mono text-muted w-3">{c}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-subtle">Range Coverage</span>
                </div>
                {[
                  { label: 'Near', v: rangeCoverage.near, c: 'bg-emerald-500', tc: 'text-emerald-400', Icon: Shield },
                  { label: 'Far', v: rangeCoverage.far, c: 'bg-rose-500', tc: 'text-rose-400', Icon: Crosshair },
                  { label: 'Strategy', v: rangeCoverage.strat, c: 'bg-violet-500', tc: 'text-violet-400', Icon: Zap },
                ].map(({ label, v, c, tc, Icon }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-1 text-[10px] font-bold ${tc}`}><Icon size={10} /> {label}</div>
                      <span className="text-[10px] font-mono text-muted">{v}</span>
                    </div>
                    <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c} transition-all`} style={{ width: `${(v / rangeCoverage.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {[rangeCoverage.near, rangeCoverage.far, rangeCoverage.strat].map((v, i) => v === 0 && (
                  <p key={i} className="text-[9px] text-amber-400">⚠ No {['near', 'far', 'strategy'][i]}-range</p>
                ))}
              </div>
            </div>

            {/* Presets */}
            <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Save size={14} className="text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-subtle">Saved Presets</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="space-y-1.5">
                    <span className="block text-[9px] text-muted font-bold uppercase">
                      Preset {i + 1} {presetIds[i] ? <span className="text-emerald-500">●</span> : <span className="text-text">○</span>}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => savePreset(i)} className="flex-1 py-1.5 text-[9px] font-bold bg-surface hover:bg-fuchsia-900/30 text-subtle hover:text-fuchsia-300 rounded-lg border border-zinc-700 transition-colors">Save</button>
                      <button onClick={() => loadPreset(i)} disabled={!presetIds[i]} className="flex-1 py-1.5 text-[9px] font-bold bg-surface hover:bg-amber-900/30 text-subtle hover:text-amber-300 rounded-lg border border-zinc-700 disabled:opacity-30 transition-colors">Load</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hero Picker */}
          <div className="space-y-4">
            {selectedSlot && selColMeta ? (
              <div className={`p-3 rounded-xl border-2 ${selColMeta.selBorder} bg-surface space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">Slot <span className="text-fuchsia-300 font-mono">#{selectedSlot}</span> <span className={`text-[10px] ${selColMeta.headerColor}`}>({selColMeta.label})</span></span>
                  <button onClick={() => setSelectedSlot(null)} className="text-muted hover:text-subtle"><X size={12} /></button>
                </div>
                {slotSuggestions.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-muted uppercase">Recommended ({selColMeta.profLabel}):</span>
                    {slotSuggestions.map(h => (
                      <button key={h.id} onClick={() => placeHero(h)} className="w-full flex items-center justify-between p-1.5 rounded-lg bg-surface hover:bg-fuchsia-900/30 border border-zinc-700 hover:border-fuchsia-600 transition-colors">
                        <span className="text-[10px] font-bold text-zinc-200">{h.name}</span>
                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] font-bold ${PROF_COLOR[h.profession ?? 0]}`}>{getProfessionLabel(h.profession)}</span>
                          <span className="text-[9px] text-muted">{h.role}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-border bg-surface text-center text-xs text-muted">👈 Click a grid slot, then pick a hero</div>
            )}

            {/* Filters */}
            <div className="grid grid-cols-4 gap-1">
              {[['All', 0, 'text-subtle'], ['Vanguard', 1, 'text-emerald-400'], ['Assault', 2, 'text-rose-400'], ['Support', 3, 'text-violet-400']].map(([label, val, tc]) => (
                <button key={val} onClick={() => setRoleFilter(+val)}
                  className={`py-1.5 text-[9px] font-bold rounded-lg border transition-colors ${roleFilter === +val ? `border-fuchsia-600/60 bg-fuchsia-900/20 ${tc}` : 'border-border bg-surface text-muted hover:text-subtle'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap">
              {[0, 1, 2, 3, 4, 5].map(p => (
                <button key={p} onClick={() => setProfFilter(p)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-colors ${profFilter === p ? 'border-fuchsia-600 bg-fuchsia-900/30 text-fuchsia-300' : 'border-border bg-surface text-muted hover:text-subtle'}`}>
                  {p === 0 ? 'All' : getProfessionLabel(p)}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Search hero..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-subtle placeholder-zinc-600 focus:outline-none focus:border-fuchsia-700 transition-colors" />

            <div className="space-y-1.5 max-h-[440px] overflow-y-auto">
              {heroPool.length === 0 && <div className="text-center text-xs text-muted py-8">No heroes</div>}
              {heroPool.map(hero => {
                const rec = recommendations.find(r => r.id === hero.id);
                const power = calcPower(hero, targetLevel);
                return (
                  <button key={hero.id} onClick={() => selectedSlot ? placeHero(hero) : undefined}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${selectedSlot ? 'border-border bg-surface hover:border-fuchsia-600 hover:bg-fuchsia-950/20 cursor-pointer' : 'border-border bg-surface opacity-60 cursor-default'}`}>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-200 truncate">{hero.name}</span>
                        {rec?.if_recommend === 1 && <Star size={9} className="text-amber-400 shrink-0" fill="currentColor" />}
                        {isF2P(hero.source) && <span className="text-[8px] font-bold text-emerald-600 shrink-0">F2P</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] font-bold ${PROF_COLOR[hero.profession ?? 0] ?? 'text-muted'}`}>{getProfessionLabel(hero.profession)}</span>
                        {rec?.ability && <span className="text-[9px] text-muted">· {rec.ability}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2 space-y-0.5">
                      <div className={`text-[10px] font-black ${getQualityColorClass(hero.quality)}`}>{hero.role ?? '?'}</div>
                      <div className="text-[9px] font-mono text-muted">{power.toLocaleString()}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* === TAB: EXPORT === */}
      {tab === 'export' && (
        <div className="space-y-5">
          <p className="text-sm text-subtle">Export or share your current formation.</p>
          {/* Formation Card */}
          <div id="formation-export-card" className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-700 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-black text-zinc-100">Formation Lineup</div>
                <div className="text-xs text-muted mt-0.5">{activeSet.size}/{MAX_PARTNERS} active · Lv.{targetLevel} simulation</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-fuchsia-300 font-mono">{totalPower.toLocaleString()}</div>
                <div className="text-[9px] text-muted">total power</div>
              </div>
            </div>
            <div className="flex gap-4">
              {COLUMNS.map((col, ci) => (
                <div key={col.id} className="flex-1 space-y-2">
                  <div className={`text-[9px] font-black uppercase tracking-widest text-center ${col.headerColor}`}>{col.label}</div>
                  {Array.from({ length: col.count }, (_, ri) => {
                    const sd = ALL_SLOTS.find(s => s.col === ci && s.row === ri)!;
                    const hero = slots[sd.slot - 1];
                    const isAct = activeSet.has(sd.slot);
                    if (!hero) return (
                      <div key={ri} className="h-14 rounded-lg border border-dashed border-border flex items-center justify-center text-[9px] text-text">Empty</div>
                    );
                    return (
                      <div key={ri} className={`p-2 rounded-lg border ${isAct ? 'border-fuchsia-700/50 bg-fuchsia-950/20' : 'border-border bg-surface opacity-50'}`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-[8px] font-bold ${getQualityColorClass(hero.quality)}`}>{getQualityLabel(hero.quality)}</span>
                          {isAct && <span className="text-[7px] font-bold text-fuchsia-400">ACTIVE</span>}
                        </div>
                        <div className="text-[10px] font-bold text-white truncate">{hero.name}</div>
                        <div className={`text-[8px] font-bold ${PROF_COLOR[hero.profession ?? 0]}`}>{getProfessionLabel(hero.profession)}</div>
                        <div className="text-[8px] font-mono text-muted">{calcPower(hero, targetLevel).toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {/* Range bars */}
            <div className="border-t border-border pt-3 grid grid-cols-3 gap-3 text-xs">
              {[
                { label: 'Near', v: rangeCoverage.near, c: 'bg-emerald-500' },
                { label: 'Far', v: rangeCoverage.far, c: 'bg-rose-500' },
                { label: 'Strategy', v: rangeCoverage.strat, c: 'bg-violet-500' },
              ].map(({ label, v, c }) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-[9px]"><span className="text-muted">{label}</span><span className="font-mono text-subtle">{v}</span></div>
                  <div className="h-1 bg-surface rounded-full overflow-hidden"><div className={`h-full rounded-full ${c}`} style={{ width: `${(v / rangeCoverage.total) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <button onClick={shareFormation}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-fuchsia-900/40 hover:bg-fuchsia-800/50 text-fuchsia-300 rounded-xl border border-fuchsia-700/40 transition-colors">
              {copied ? <Check size={14} /> : <Share2 size={14} />} {copied ? 'Link Copied!' : 'Copy Shareable URL'}
            </button>
            <button onClick={() => {
              const text = ALL_SLOTS
                .map(sd => { const h = slots[sd.slot - 1]; const col = COLUMNS[sd.col]; return h ? `[${col.label}] ${h.name} (${getProfessionLabel(h.profession)}) — ${h.role}${activeSet.has(sd.slot) ? ' ★ACTIVE' : ''}` : null; })
                .filter(Boolean).join('\n');
              navigator.clipboard.writeText(text ?? '');
            }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-surface hover:bg-hover text-subtle rounded-xl border border-zinc-700 transition-colors">
              <Check size={14} /> Copy as Text
            </button>
          </div>
          {/* Text preview */}
          <div className="p-4 bg-bg border border-border rounded-xl font-mono text-xs text-subtle space-y-0.5">
            {ALL_SLOTS.map(sd => {
              const h = slots[sd.slot - 1];
              const col = COLUMNS[sd.col];
              if (!h) return null;
              return (
                <div key={sd.slot}>
                  <span className={col.headerColor}>[{col.label}]</span>{' '}
                  <span className="text-zinc-200 font-bold">{h.name}</span>{' '}
                  <span className={PROF_COLOR[h.profession ?? 0]}>{getProfessionLabel(h.profession)}</span>{' '}
                  <span className={getQualityColorClass(h.quality)}>{h.role}</span>
                  {activeSet.has(sd.slot) && <span className="text-fuchsia-400"> ★ACTIVE</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
