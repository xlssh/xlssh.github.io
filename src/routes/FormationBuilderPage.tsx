import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  loadHeroes, 
  loadRecommendHeroes, 
  loadRelatedPartners, 
  loadRelatedPartnerTypes, 
  loadRelatedConditions, 
  loadRelatedPartnerPoints,
  loadBaseStones,
  loadBaseEquips,
  loadSuits,
  loadMilitary,
  loadArticles
} from '../data/loaders';
import { 
  Hero, 
  RecommendHero, 
  RelatedPartner, 
  RelatedPartnerType, 
  RelatedCondition, 
  RelatedPartnerPoint,
  BaseStone,
  BaseEquip,
  Suit,
  Military as MilitaryRank,
  Article
} from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getProfessionLabel, getAttributeName } from '../data/relationships';
import { getQualityLabel, getQualityColorClass } from './HeroesPage';
import { calcHeroBP } from '../utils/battlePower';
import {
  Users, Swords, Shield, Zap, Star, RotateCcw,
  Save, Share2, Check, X, Info, Target, TrendingUp, Crosshair, BarChart3,
  AlertTriangle, Wand2, Layers, Cpu, Heart, Coins, Sparkles, Trophy, Lock, Unlock, ArrowRight, Eye, ShieldCheck, ClipboardCheck
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

// Jade stats value increments per level (simulated stats table)
const JADE_VALS_PER_LEVEL: Record<number, Record<number, number>> = {
  1: { 1: 10, 2: 20, 3: 35, 4: 55, 5: 80, 6: 110, 7: 150, 8: 200, 9: 260, 10: 330 }, // STR
  2: { 1: 10, 2: 20, 3: 35, 4: 55, 5: 80, 6: 110, 7: 150, 8: 200, 9: 260, 10: 330 }, // AGI
  3: { 1: 10, 2: 20, 3: 35, 4: 55, 5: 80, 6: 110, 7: 150, 8: 200, 9: 260, 10: 330 }, // INT
  4: { 1: 100, 2: 200, 3: 350, 4: 550, 5: 800, 6: 1100, 7: 1500, 8: 2000, 9: 2600, 10: 3300 }, // HP
};

const JADE_TYPES = [
  { id: 1, label: 'STR Jade', stat: 'STR' },
  { id: 2, label: 'AGI Jade', stat: 'AGI' },
  { id: 3, label: 'INT Jade', stat: 'INT' },
  { id: 4, label: 'HP Jade', stat: 'HP' },
];

const PRESET_KEY = 'bf_formation_v4';
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

interface HeroLoadout {
  equips: Record<number, number>; // slot (1-6) -> BaseEquip ID
  jades: Array<{ typeId: number; level: number }>; // Array of 3 sockets
}

const SLOT_NAMES: Record<number, string> = {
  1: 'Weapon / Zanpakuto',
  2: 'Headgear',
  3: 'Clothing',
  4: 'Cloak',
  5: 'Shoe',
  6: 'Belt',
};

function canHeroWearEquip(hero: Hero, equip: BaseEquip): boolean {
  if (!equip.dress_profession || equip.dress_profession === '0' || equip.dress_profession === '') return true;
  const professions = equip.dress_profession.split('_').map(Number);
  return professions.includes(hero.profession ?? 0);
}

// ---- Slot Card ----
interface SlotCardProps { 
  slot: number; 
  col: number; 
  hero: Hero | null; 
  isSelected: boolean; 
  isActive: boolean; 
  isMc: boolean; 
  simPower: number;
  onClick: () => void; 
  onRemove: (e: React.MouseEvent) => void; 
}
const SlotCard: React.FC<SlotCardProps> = ({ slot, col, hero, isSelected, isActive, isMc, simPower, onClick, onRemove }) => {
  const colMeta = COLUMNS[col];
  if (!hero) {
    return (
      <button onClick={onClick}
        className={`w-full ${col === 0 ? 'h-32' : 'h-24'} rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-0.5 transition-all group ${isSelected ? `${colMeta.selBorder} bg-surface/60` : `${colMeta.slotBorder} text-muted hover:text-subtle`
          }`}>
        <span className="text-[9px] font-bold text-text">#{slot}</span>
        <span className="text-[9px] text-text group-hover:text-muted transition-colors">+ Place</span>
      </button>
    );
  }
  return (
    <div onClick={onClick}
      className={`relative w-full rounded-xl border-2 p-2.5 cursor-pointer transition-all space-y-1.5 ${isSelected ? 'border-fuchsia-500 bg-fuchsia-950/20' : isActive ? 'border-zinc-700 bg-surface hover:border-zinc-500' : 'border-border bg-bg/60 opacity-50'
        }`}>
      {!isMc && (
        <button onClick={onRemove} className="absolute top-1 right-1 p-0.5 rounded-full bg-surface hover:bg-rose-900/60 text-muted hover:text-rose-400 transition-colors z-10">
          <X size={9} />
        </button>
      )}
      {!isActive && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-bg/50 z-20">
          <span className="text-[8px] font-bold text-amber-400 bg-surface px-1.5 py-0.5 rounded">Benched</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[8px] text-muted">#{slot} {isMc && <span className="text-[8px] font-bold text-fuchsia-400">★ Main</span>}</span>
        <span className={`text-[8px] font-bold ${getQualityColorClass(hero.quality)}`}>{getQualityLabel(hero.quality)}</span>
      </div>
      <div className="text-[10px] font-bold text-white leading-tight pr-3 line-clamp-1">{hero.name}</div>
      <div className="flex items-center justify-between">
        <span className={`text-[8px] font-bold ${PROF_COLOR[hero.profession ?? 0] ?? 'text-muted'}`}>{getProfessionLabel(hero.profession)}</span>
        <span className="text-[9px] font-mono font-bold text-brand">{simPower.toLocaleString()}</span>
      </div>
    </div>
  );
};

// ---- Main Page ----
export const FormationBuilderPage: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendHero[]>([]);
  const [relatedPartners, setRelatedPartners] = useState<RelatedPartner[]>([]);
  const [partnerTypes, setRelatedPartnerTypes] = useState<RelatedPartnerType[]>([]);
  const [baseStones, setBaseStones] = useState<BaseStone[]>([]);
  const [baseEquips, setBaseEquips] = useState<BaseEquip[]>([]);
  const [suits, setSuits] = useState<Suit[]>([]);
  const [militaryRanks, setMilitaryRanks] = useState<MilitaryRank[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
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
  const [bondLevel, setBondLevel] = useState(10);
  const [selectedMilitaryRankId, setSelectedMilitaryRankId] = useState<number>(40100001); // Seireitei Guard Male/Female
  
  // Custom Sockets & Gear state: heroId -> Custom loadout config
  const [loadouts, setLoadouts] = useState<Record<number, HeroLoadout>>({});
  
  const [presetIds, setPresetIds] = useState<(number[] | null)[]>(() => loadPresets());
  const [copied, setCopied] = useState(false);
  const [activeArchetype, setActiveArchetype] = useState<string | null>(null);
  const [tab, setTab] = useState<'build' | 'gear' | 'bonds' | 'military' | 'export'>('build');
  const [focusedHeroGearId, setFocusedHeroGearId] = useState<number | null>(null);

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

  const activeHeroes = useMemo(() => {
    return ALL_SLOTS
      .filter(s => finalActiveSet.has(s.slot) && finalSlots[s.slot - 1])
      .map(s => finalSlots[s.slot - 1]!);
  }, [finalSlots, finalActiveSet]);

  const activeHeroIds = useMemo(() => {
    return new Set(activeHeroes.map(h => h.id));
  }, [activeHeroes]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        hr, rr, rp, rpt, _unusedCond, _unusedPoints, stonesRes, equipsRes, suitsRes, milRes, articlesRes
      ] = await Promise.all([
        loadHeroes(),
        loadRecommendHeroes(),
        loadRelatedPartners(),
        loadRelatedPartnerTypes(),
        loadRelatedConditions(), // unused but kept for parity
        loadRelatedPartnerPoints(), // unused but kept for parity
        loadBaseStones(),
        loadBaseEquips(),
        loadSuits(),
        loadMilitary(),
        loadArticles()
      ]);

      setHeroes(hr.rows);
      setRecommendations(rr.rows);
      setRelatedPartners(rp.rows);
      setRelatedPartnerTypes(rpt.rows);
      setBaseStones(stonesRes.rows);
      setBaseEquips(equipsRes.rows);
      setSuits(suitsRes.rows);
      setMilitaryRanks(milRes.rows.sort((a,b) => a.id - b.id));
      setArticles(articlesRes.rows);

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

  // Set default gear focus hero
  useEffect(() => {
    if (activeHeroes.length > 0 && !focusedHeroGearId) {
      setFocusedHeroGearId(activeHeroes[0].id);
    }
  }, [activeHeroes, focusedHeroGearId]);

  // Helpers
  const getHeroLoadout = useCallback((heroId: number): HeroLoadout => {
    if (loadouts[heroId]) return loadouts[heroId];
    return {
      equips: {},
      jades: [
        { typeId: 0, level: 10 },
        { typeId: 0, level: 10 },
        { typeId: 0, level: 10 }
      ]
    };
  }, [loadouts]);

  const articleSlotMap = useMemo(() => {
    const map = new Map<number, number>();
    articles.forEach(a => {
      if (a.major_type === 2) { // Equipment
        map.set(a.id, a.minor_type ?? 1);
      }
    });
    return map;
  }, [articles]);

  const articlesMap = useMemo(() => {
    const map: Record<number, Article> = {};
    articles.forEach(a => {
      map[a.id] = a;
    });
    return map;
  }, [articles]);

  const suitMap = useMemo(() => {
    const map = new Map<number, Suit>();
    suits.forEach(s => map.set(s.id, s));
    return map;
  }, [suits]);

  const activeRank = useMemo(() => {
    return militaryRanks.find(r => r.id === selectedMilitaryRankId) || null;
  }, [militaryRanks, selectedMilitaryRankId]);

  // Decode Military stats bonuses
  const militaryBuffs = useMemo(() => {
    const buffs = { str: 0, agi: 0, int: 0, hp: 0, speed: 0 };
    if (!activeRank || !activeRank.add_other?.addOther) return buffs;

    activeRank.add_other.addOther.forEach(o => {
      if (o.type === 1) buffs.str += o.value;
      else if (o.type === 2) buffs.agi += o.value;
      else if (o.type === 3) buffs.int += o.value;
      else if (o.type === 4 || o.type === 101) buffs.hp += o.value;
      else if (o.type === 11) buffs.speed += o.value;
    });
    return buffs;
  }, [activeRank]);

  // Identify Active and Inactive Bonds across the active squad
  const bondsAnalysis = useMemo(() => {
    const active: Array<{ bond: RelatedPartner; hero: Hero; partner: Hero; bonus: Array<{ label: string; value: string }> }> = [];
    const inactive: Array<{ bond: RelatedPartner; hero: Hero; missingPartnerId: number }> = [];

    heroes.forEach(hero => {
      if (!activeHeroIds.has(hero.id)) return;

      const heroBonds = relatedPartners.filter(p => p.hero_id === hero.id);
      heroBonds.forEach(bond => {
        const partner = heroes.find(h => h.id === bond.connect_id);
        if (!partner) return;

        if (activeHeroIds.has(bond.connect_id)) {
          // Decode stats properties
          const matchedType = partnerTypes.find(t => t.type === bond.type && t.level === bondLevel);
          const bonusStats: Array<{ label: string; value: string }> = [];

          if (matchedType && matchedType.properties) {
            matchedType.properties.forEach(p => {
              const name = getAttributeName(p.type);
              const isPercent = (p.type >= 16 && p.type <= 47) || p.oper === 1;
              bonusStats.push({
                label: name,
                value: `+${isPercent ? `${(p.value * 100).toFixed(0)}%` : p.value.toLocaleString()}`
              });
            });
          }

          active.push({
            bond,
            hero,
            partner,
            bonus: bonusStats
          });
        } else {
          inactive.push({
            bond,
            hero,
            missingPartnerId: bond.connect_id
          });
        }
      });
    });

    return { active, inactive };
  }, [heroes, relatedPartners, activeHeroIds, partnerTypes, bondLevel]);

  const handleAddHero = useCallback((heroId: number) => {
    const heroToDeploy = heroes.find(h => h.id === heroId);
    if (!heroToDeploy) return;

    // Find if already deployed
    const alreadyDeployed = finalSlots.some(h => h && h.id === heroId);
    if (alreadyDeployed) {
      alert(`${heroToDeploy.name} is already deployed in the squad!`);
      return;
    }

    // Find first empty slot (excluding the slot that has MC)
    const emptySlotDef = ALL_SLOTS.find(s => s.slot !== mcSlotNum && !finalSlots[s.slot - 1]);
    if (emptySlotDef) {
      const idx = emptySlotDef.slot - 1;
      setSlots(prev => {
        const n = [...prev];
        n[idx] = heroToDeploy;
        return n;
      });
      if (finalActiveSet.size < MAX_PARTNERS) {
        setActiveSet(prev => new Set([...prev, emptySlotDef.slot]));
      }
      alert(`Successfully deployed ${heroToDeploy.name} to slot #${emptySlotDef.slot}!`);
    } else {
      alert("All formation grid slots are currently full! Please clear or remove a hero before deploying a new one.");
    }
  }, [heroes, finalSlots, mcSlotNum, finalActiveSet]);

  // Calculate customized final stats & BP for a single hero
  const calculateFinalHeroStats = useCallback((h: Hero) => {
    const l = Math.max(1, targetLevel);
    const loadout = getHeroLoadout(h.id);

    // 1. Base Stats
    const baseStr = (h.power ?? 0) + Math.round((h.power_grow ?? 0) * (l - 1));
    const baseAgi = (h.agile ?? 0) + Math.round((h.agile_grow ?? 0) * (l - 1));
    const baseInt = (h.intelligence ?? 0) + Math.round((h.intelligence_grow ?? 0) * (l - 1));
    const baseHp = (h.life ?? 0) + Math.round((h.life_grow ?? 0) * (l - 1));
    const baseSpd = (h.speed ?? 0) + Math.round((h.speed_grow ?? 0) * (l - 1));

    // 2. Military Bonuses
    const milStr = militaryBuffs.str;
    const milAgi = militaryBuffs.agi;
    const milInt = militaryBuffs.int;
    const milHp = militaryBuffs.hp;
    const milSpd = militaryBuffs.speed;

    // 3. Active Bonds Bonuses
    let bondStr = 0;
    let bondAgi = 0;
    let bondInt = 0;
    let bondHp = 0;
    let bondSpd = 0;

    bondsAnalysis.active.forEach(item => {
      if (item.hero.id === h.id) {
        const matchedType = partnerTypes.find(t => t.type === item.bond.type && t.level === bondLevel);
        if (matchedType && matchedType.properties) {
          matchedType.properties.forEach(p => {
            if (p.type === 1) bondStr += p.value;
            else if (p.type === 2) bondAgi += p.value;
            else if (p.type === 3) bondInt += p.value;
            else if (p.type === 4 || p.type === 101) bondHp += p.value;
            else if (p.type === 11) bondSpd += p.value;
          });
        }
      }
    });

    // 4. Equipment Main & Suit Bonuses
    let gearStr = 0;
    let gearAgi = 0;
    let gearInt = 0;
    let gearHp = 0;
    let gearSpd = 0;
    const suitCounts: Record<number, number> = {};

    Object.entries(loadout.equips).forEach(([_slotIdStr, eqId]) => {
      const eq = baseEquips.find(e => e.id === eqId);
      if (!eq) return;

      if (eq.main_type && eq.main_value) {
        eq.main_type.forEach((t, idx) => {
          const val = eq.main_value?.[idx] ?? 0;
          if (t === 1) gearStr += val;
          else if (t === 2) gearAgi += val;
          else if (t === 3) gearInt += val;
          else if (t === 4 || t === 101) gearHp += val;
          else if (t === 11) gearSpd += val;
        });
      }

      if (eq.suit_id) {
        suitCounts[eq.suit_id] = (suitCounts[eq.suit_id] || 0) + 1;
      }
    });

    // Suit Set Effects
    Object.entries(suitCounts).forEach(([sIdStr, count]) => {
      const sId = parseInt(sIdStr);
      const suit = suitMap.get(sId);
      if (!suit || count < 2) return;

      ['2', '4', '6'].forEach(pcs => {
        if (count >= parseInt(pcs) && suit.effects?.[pcs]) {
          (suit.effects[pcs] as string[]).forEach(effStr => {
            const parts = effStr.split('_');
            const type = parseInt(parts[0]) || 0;
            const value = parseFloat(parts[1]) || 0;
            const oper = parseInt(parts[2]) || 0;

            if (oper === 0) { // flat
              if (type === 1) gearStr += value;
              else if (type === 2) gearAgi += value;
              else if (type === 3) gearInt += value;
              else if (type === 4 || type === 101) gearHp += value;
              else if (type === 11) gearSpd += value;
            }
          });
        }
      });
    });

    // 5. Jade Bonuses
    let jadeStr = 0;
    let jadeAgi = 0;
    let jadeInt = 0;
    let jadeHp = 0;

    loadout.jades.forEach(jade => {
      const valTable = JADE_VALS_PER_LEVEL[jade.typeId];
      if (!valTable) return;
      const statVal = valTable[jade.level] || 0;

      if (jade.typeId === 1) jadeStr += statVal;
      else if (jade.typeId === 2) jadeAgi += statVal;
      else if (jade.typeId === 3) jadeInt += statVal;
      else if (jade.typeId === 4) jadeHp += statVal;
    });

    // Sum final values
    const finalStr = baseStr + milStr + bondStr + gearStr + jadeStr;
    const finalAgi = baseAgi + milAgi + bondAgi + gearAgi + jadeAgi;
    const finalInt = baseInt + milInt + bondInt + gearInt + jadeInt;
    const finalHp = baseHp + milHp + bondHp + gearHp + jadeHp;
    const finalSpd = baseSpd + milSpd + bondSpd + gearSpd;

    const finalBP = finalStr + finalAgi + finalInt + Math.round(finalHp / 10);
    const baseBP = baseStr + baseAgi + baseInt + Math.round(baseHp / 10);

    return {
      finalStr,
      finalAgi,
      finalInt,
      finalHp,
      finalSpd,
      finalBP,
      baseStr,
      baseAgi,
      baseInt,
      baseHp,
      baseSpd,
      baseBP,
      buffsSum: {
        str: milStr + bondStr + gearStr + jadeStr,
        agi: milAgi + bondAgi + gearAgi + jadeAgi,
        int: milInt + bondInt + gearInt + jadeInt,
        hp: milHp + bondHp + gearHp + jadeHp,
        spd: milSpd + bondSpd + gearSpd
      }
    };
  }, [targetLevel, getHeroLoadout, militaryBuffs, bondsAnalysis, partnerTypes, bondLevel, baseEquips, suitMap]);

  // Compute final squad powers
  const heroPowers = useMemo(() => {
    const map = new Map<number, number>();
    heroes.forEach(h => {
      const stats = calculateFinalHeroStats(h);
      map.set(h.id, stats.finalBP);
    });
    return map;
  }, [heroes, calculateFinalHeroStats]);

  const finalActiveHeroesStats = useMemo(() => {
    return activeHeroes.map(h => ({
      hero: h,
      stats: calculateFinalHeroStats(h)
    }));
  }, [activeHeroes, calculateFinalHeroStats]);

  const totalPower = useMemo(() => {
    return finalActiveHeroesStats.reduce((sum, item) => sum + item.stats.finalBP, 0);
  }, [finalActiveHeroesStats]);

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

  const selColMeta = useMemo(() => {
    if (selectedSlot === null) return null;
    const slotDef = ALL_SLOTS.find(s => s.slot === selectedSlot);
    if (!slotDef) return null;
    return COLUMNS[slotDef.col];
  }, [selectedSlot]);

  // Slot placement suggestions for selected slot
  const slotSuggestions = useMemo(() => {
    if (selectedSlot === null) return [];
    const slotDef = ALL_SLOTS.find(s => s.slot === selectedSlot)!;
    const colMeta = COLUMNS[slotDef.col];
    const deployedIds = new Set(finalSlots.filter(Boolean).map(h => h!.id));
    return heroes
      .filter(h => !h.is_main && !deployedIds.has(h.id) && colMeta.professions.includes(h.profession ?? 0))
      .sort((a, b) => {
        const bpA = heroPowers.get(a.id) ?? 0;
        const bpB = heroPowers.get(b.id) ?? 0;
        return bpB - bpA;
      })
      .slice(0, 5);
  }, [selectedSlot, heroes, finalSlots, heroPowers]);

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
      .sort((a, b) => {
        const bpA = heroPowers.get(a.id) ?? 0;
        const bpB = heroPowers.get(b.id) ?? 0;
        return bpB - bpA;
      });
  }, [heroes, searchQuery, profFilter, roleFilter, finalSlots, heroPowers]);

  const sortedHeroes = useMemo(() => {
    return [...heroes].sort((a, b) => {
      const bpA = heroPowers.get(a.id) ?? 0;
      const bpB = heroPowers.get(b.id) ?? 0;
      return bpB - bpA;
    });
  }, [heroes, heroPowers]);

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
    const pool = [...heroes].filter(h => !h.is_main && !deployedIds.has(h.id)).sort((a, b) => {
      const bpA = heroPowers.get(a.id) ?? 0;
      const bpB = heroPowers.get(b.id) ?? 0;
      return bpB - bpA;
    });
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

  const applyArchetype = useCallback((arch: Archetype) => {
    const newSlots = Array(TOTAL_SLOTS).fill(null) as (Hero | null)[];
    const newActive = new Set<number>([mcSlotNum]);
    const used = new Set<number>([selectedMcId]);

    ALL_SLOTS.forEach(({ col, row, slot }) => {
      if (slot === mcSlotNum) return;
      const prefs = arch.profPrefs[col] ?? [];
      const prefProf = prefs[row] ?? prefs[0] ?? 0;
      const match = sortedHeroes.find(h =>
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
  }, [sortedHeroes, mcSlotNum, selectedMcId]);

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

  // --- Sockets & Gear helpers ---
  const focusedHeroGear = useMemo(() => {
    return heroes.find(h => h.id === focusedHeroGearId) || null;
  }, [heroes, focusedHeroGearId]);

  const equipsBySlot = useMemo(() => {
    const map: Record<number, BaseEquip[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    baseEquips.forEach(eq => {
      const slot = articleSlotMap.get(eq.id);
      if (slot && slot in map) {
        map[slot].push(eq);
      }
    });
    return map;
  }, [baseEquips, articleSlotMap]);

  const handleEquipChange = (heroId: number, slotId: number, equipId: number) => {
    setLoadouts(prev => {
      const current = prev[heroId] || { equips: {}, jades: [{ typeId: 0, level: 10 }, { typeId: 0, level: 10 }, { typeId: 0, level: 10 }] };
      return {
        ...prev,
        [heroId]: {
          ...current,
          equips: {
            ...current.equips,
            [slotId]: equipId
          }
        }
      };
    });
  };

  const handleJadeChange = (heroId: number, socketIdx: number, typeId: number, level: number) => {
    setLoadouts(prev => {
      const current = prev[heroId] || { equips: {}, jades: [{ typeId: 0, level: 10 }, { typeId: 0, level: 10 }, { typeId: 0, level: 10 }] };
      const nextJades = [...current.jades];
      nextJades[socketIdx] = { typeId, level };
      return {
        ...prev,
        [heroId]: {
          ...current,
          jades: nextJades
        }
      };
    });
  };

  // One-click Auto Optimize Jades
  const handleAutoOptimizeJades = () => {
    if (activeHeroes.length === 0) return;

    setLoadouts(prev => {
      const next = { ...prev };
      activeHeroes.forEach(h => {
        const current = next[h.id] || { equips: {}, jades: [{ typeId: 0, level: 10 }, { typeId: 0, level: 10 }, { typeId: 0, level: 10 }] };
        
        let suggestTypeId = 1; // STR default
        if (h.profession === 1) suggestTypeId = 2; // Agility -> AGI
        else if (h.profession === 2) suggestTypeId = 4; // Defending -> HP
        else if (h.profession === 3 || h.profession === 5) suggestTypeId = 3; // Intellect/Warlock -> INT
        else if (h.profession === 4) suggestTypeId = 1; // Strength -> STR

        next[h.id] = {
          ...current,
          jades: [
            { typeId: suggestTypeId, level: 10 },
            { typeId: suggestTypeId, level: 10 },
            { typeId: suggestTypeId, level: 10 }
          ]
        };
      });
      return next;
    });
  };

  if (loading) return <LoadingState message="Loading spiritual constellation boards & armory registries..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 pb-12 text-text">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-black text-text tracking-tight flex items-center gap-2">
            Formation Build Sandbox
            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 border border-brand bg-brand-soft text-brand font-mono font-bold rounded">Tactical simulator</span>
          </h1>
          <p className="text-sm text-muted mt-0.5">
            1 Vanguard · 3 Assault · 3 Support · max <span className="text-fuchsia-400 font-bold">{MAX_PARTNERS}</span> active partners
          </p>
          {activeArchetype && (
            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-amber-300 bg-amber-950/30 border border-amber-700/40 px-2 py-0.5 rounded-full">
              <Wand2 size={9} /> {activeArchetype} archetype applied
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={autoFill} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-900/30 hover:bg-amber-800/50 text-amber-300 rounded-lg border border-amber-700/50 transition-colors cursor-pointer">
            <Star size={12} /> Auto-Fill
          </button>
          <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-surface hover:bg-rose-950/40 text-subtle hover:text-rose-400 rounded-lg border border-zinc-700 transition-colors cursor-pointer">
            <RotateCcw size={12} /> Clear
          </button>
          <button onClick={shareFormation} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-fuchsia-900/40 hover:bg-fuchsia-800/50 text-fuchsia-300 rounded-lg border border-fuchsia-700/50 transition-colors cursor-pointer">
            {copied ? <Check size={12} /> : <Share2 size={12} />} {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>

      {/* Global simulated KPI HUD panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-surface border border-border rounded-xl flex flex-col justify-between">
          <span className="text-[10px] text-subtle font-bold uppercase tracking-widest">Total Squad BP</span>
          <span className="text-3xl font-black font-mono text-brand leading-none my-1">{totalPower.toLocaleString()}</span>
          <span className="text-[10px] text-muted block">Cumulative active roster BP</span>
        </div>
        <div className="p-4 bg-surface border border-border rounded-xl flex flex-col justify-between col-span-2">
          <span className="text-[10px] text-subtle font-bold uppercase tracking-widest mb-1.5">Active Partners</span>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {Array.from({ length: MAX_PARTNERS }).map((_, i) => (
                <div key={i} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${i < finalActiveSet.size ? 'border-fuchsia-500 bg-fuchsia-500/30' : 'border-zinc-700 bg-transparent'}`}>
                  {i < finalActiveSet.size && <div className="w-2 h-2 rounded-full bg-fuchsia-400" />}
                </div>
              ))}
            </div>
            <span className="font-mono font-bold text-xs text-muted">{finalActiveSet.size} / {MAX_PARTNERS} active</span>
          </div>
        </div>
        <div className="p-4 bg-surface border border-border rounded-xl flex flex-col justify-between">
          <span className="text-[10px] text-subtle font-bold uppercase tracking-widest">Global active Buffs</span>
          <span className="text-base font-extrabold text-emerald-500 block leading-tight mt-1">
            {bondsAnalysis.active.length} Bonds Active
          </span>
          <span className="text-[10px] text-muted block mt-0.5">{(activeRank?.name || 'Seireitei Guard')} active</span>
        </div>
      </div>

      {/* Tab Menu selection */}
      <div className="flex border-b border-border gap-x-6 gap-y-1 text-xs md:text-sm font-black select-none flex-wrap">
        {([
          ['build', '🗺 Grid & Roster'], 
          ['gear', '🛡 Sockets & Gear'], 
          ['bonds', '🧬 Bond Synergies'], 
          ['military', '👑 Military Ranks'], 
          ['export', '📤 Export']
        ] as const).map(([id, label]) => (
          <button 
            key={id} 
            onClick={() => setTab(id as any)}
            className={`pb-2.5 border-b-2 px-1 transition-all cursor-pointer ${
              tab === id 
                ? 'border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400' 
                : 'border-transparent text-subtle hover:text-text dark:hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* === TAB 1: GRID & ROSTER === */}
      {tab === 'build' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            {/* Main Character Config Card */}
            <div className="p-4 bg-surface border border-border rounded-xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-bold text-subtle uppercase tracking-wider block">Wielder (Main Character)</span>
                <span className="text-[11px] text-muted">Every team deployment requires exactly one Main Character. Select class & grid position.</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <select
                    value={selectedMcId}
                    onChange={(e) => {
                      const mcId = parseInt(e.target.value);
                      setSelectedMcId(mcId);
                      const matchedMc = heroes.find(h => h.id === mcId);
                      if (matchedMc) {
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
                <div className="flex items-center gap-1.5 bg-bg p-1.5 border border-border rounded-xl">
                  <span className="text-[10px] font-bold text-muted uppercase px-1.5">Grid Slot:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map(slot => (
                      <button
                        key={slot}
                        onClick={() => {
                          setMcSlotNum(slot);
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
                          : 'bg-surface border border-border text-muted hover:text-text'
                          }`}
                      >
                        #{slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Level slider */}
            <div className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-border shadow-sm">
              <TrendingUp size={14} className="text-fuchsia-400 shrink-0" />
              <span className="text-xs font-bold text-subtle w-20 shrink-0">Sim Level</span>
              <input type="range" min={1} max={159} value={targetLevel} onChange={e => setTargetLevel(+e.target.value)} className="flex-1 accent-fuchsia-500 cursor-pointer bg-bg h-1 rounded" />
              <span className="text-xs font-black font-mono text-fuchsia-300 w-12 text-right">Lv.{targetLevel}</span>
            </div>

            {/* The 1+3+3 Grid */}
            <div className="flex gap-4">
              {COLUMNS.map((col, ci) => (
                <div key={col.id} className="flex-1 space-y-2.5 min-w-0">
                  <div className={`text-center text-[10px] font-black uppercase tracking-widest ${col.headerColor}`}>
                    {col.label}
                    <span className="block text-[8px] text-muted font-normal normal-case tracking-normal">{col.profLabel}</span>
                  </div>
                  {Array.from({ length: col.count }, (_, ri) => {
                    const sd = ALL_SLOTS.find(s => s.col === ci && s.row === ri)!;
                    const hero = finalSlots[sd.slot - 1];
                    const isAct = finalActiveSet.has(sd.slot);
                    const isMc = sd.slot === mcSlotNum;
                    const simPowerVal = hero ? (heroPowers.get(hero.id) ?? 0) : 0;
                    return (
                      <div key={ri} className="relative">
                        <SlotCard
                          slot={sd.slot} col={ci}
                          hero={hero}
                          isSelected={selectedSlot === sd.slot}
                          isActive={isAct}
                          isMc={isMc}
                          simPower={simPowerVal}
                          onClick={() => setSelectedSlot(selectedSlot === sd.slot ? null : sd.slot)}
                          onRemove={e => removeHero(sd.slot, e)}
                        />
                        {hero && (
                          <button
                            onClick={e => toggleActive(sd.slot, e)}
                            disabled={isMc}
                            title={isMc ? 'Main Character Locked' : isAct ? 'Bench this hero' : finalActiveSet.size >= MAX_PARTNERS ? 'Max partners reached' : 'Activate this hero'}
                            className={`absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-black transition-colors ${isMc ? 'bg-fuchsia-600/50 text-fuchsia-100 border border-fuchsia-600 cursor-default' :
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

            {/* Range and professions analytics stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Class composition */}
              <div className="p-4 bg-surface border border-border rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <BarChart3 size={14} className="text-fuchsia-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-subtle">Squad Class Breakdown</span>
                </div>
                <div className="space-y-2 pt-1">
                  {[1, 2, 3, 4, 5].map(p => {
                    const c = profBreakdown[p] ?? 0;
                    return (
                      <div key={p} className="flex items-center gap-2 text-xs font-semibold">
                        <span className={`text-[10px] font-black w-20 ${PROF_COLOR[p]}`}>{getProfessionLabel(p)}</span>
                        <div className="flex-1 h-2 bg-bg border border-border rounded-full overflow-hidden">
                          <div className="h-full bg-fuchsia-500 rounded-full" style={{ width: `${(c / Math.max(finalActiveSet.size, 1)) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-muted w-3">{c}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Range coverage */}
              <div className="p-4 bg-surface border border-border rounded-xl space-y-3.5 shadow-sm">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Target size={14} className="text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-subtle">Attack Range Coverage</span>
                </div>
                {[
                  { label: 'Near / Melee (STR/DEF)', v: rangeCoverage.near, c: 'bg-emerald-500', tc: 'text-emerald-400', Icon: Shield },
                  { label: 'Far / Ranged (AGI)', v: rangeCoverage.far, c: 'bg-rose-500', tc: 'text-rose-400', Icon: Crosshair },
                  { label: 'Strategy / Kidō (INT)', v: rangeCoverage.strat, c: 'bg-violet-500', tc: 'text-violet-400', Icon: Zap },
                ].map(({ label, v, c, tc, Icon }) => (
                  <div key={label} className="space-y-1 text-xs font-semibold">
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-1 text-[10px] font-bold ${tc}`}><Icon size={11} /> {label}</div>
                      <span className="font-mono text-muted">{v}</span>
                    </div>
                    <div className="h-2 bg-bg border border-border rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c} transition-all`} style={{ width: `${(v / rangeCoverage.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Presets and Archetypes Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Presets */}
              <div className="p-4 bg-surface border border-border rounded-xl space-y-3.5 shadow-sm">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Save size={14} className="text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-subtle">Saved Presets</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="space-y-1 bg-bg/40 border border-border/60 p-2 rounded-xl text-center">
                      <span className="block text-[8px] text-muted font-bold uppercase">
                        Preset {i + 1} {presetIds[i] ? <span className="text-emerald-500">●</span> : <span className="text-text">○</span>}
                      </span>
                      <div className="flex gap-1 pt-1">
                        <button onClick={() => savePreset(i)} className="flex-1 py-1 text-[8px] font-black bg-surface hover:bg-fuchsia-900/30 text-subtle hover:text-fuchsia-300 rounded border border-zinc-700 transition-colors cursor-pointer">Save</button>
                        <button onClick={() => loadPreset(i)} disabled={!presetIds[i]} className="flex-1 py-1 text-[8px] font-black bg-surface hover:bg-amber-900/30 text-subtle hover:text-amber-300 rounded border border-zinc-700 disabled:opacity-30 transition-colors cursor-pointer">Load</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Archetypes */}
              <div className="p-4 bg-surface border border-border rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Wand2 size={14} className="text-fuchsia-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-subtle">Deployment Archetypes</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  {ARCHETYPES.map(arch => (
                    <button
                      key={arch.name}
                      onClick={() => applyArchetype(arch)}
                      className="p-2 text-left bg-bg border border-border hover:border-fuchsia-600 hover:bg-fuchsia-950/20 rounded-xl transition-all cursor-pointer group flex flex-col justify-between h-[52px]"
                    >
                      <div className="flex items-center gap-1 font-bold text-[10px] text-zinc-200 group-hover:text-fuchsia-300 transition-colors">
                        <span>{arch.emoji}</span>
                        <span>{arch.name}</span>
                      </div>
                      <span className="text-[7px] text-muted line-clamp-2 leading-tight block">{arch.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Picker & Archetypes */}
          <div className="space-y-4">
            {selectedSlot && selColMeta ? (
              <div className={`p-4 rounded-xl border-2 ${selColMeta.selBorder} bg-surface space-y-3 shadow-md`}>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-xs font-black text-zinc-200 uppercase tracking-wider">
                    Grid Slot <span className="text-fuchsia-300 font-mono">#{selectedSlot}</span> <span className={`text-[10px] ${selColMeta.headerColor}`}>({selColMeta.label})</span>
                  </span>
                  <button onClick={() => setSelectedSlot(null)} className="text-muted hover:text-text cursor-pointer"><X size={14} /></button>
                </div>
                {slotSuggestions.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-muted uppercase">Recommended Class ({selColMeta.profLabel}):</span>
                    {slotSuggestions.map(h => (
                      <button 
                        key={h.id} 
                        onClick={() => placeHero(h)} 
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-bg border border-border hover:border-fuchsia-600 hover:bg-fuchsia-950/20 transition-all text-left cursor-pointer"
                      >
                        <div>
                          <span className="text-xs font-bold text-text block leading-tight">{h.name}</span>
                          <span className={`text-[9px] font-bold ${PROF_COLOR[h.profession ?? 0]}`}>{getProfessionLabel(h.profession)}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-[9px] font-black ${getQualityColorClass(h.quality)}`}>{h.role ?? 'Merc'}</span>
                          <span className="text-[10px] font-mono text-brand block font-bold">{(heroPowers.get(h.id) ?? 0).toLocaleString()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-border bg-surface text-center text-xs text-muted shadow-sm">
                👈 Click on any grid slot first to deploy partners
              </div>
            )}

            {/* Filters */}
            <div className="space-y-3 bg-surface p-4 border border-border rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">Filter Hero Pool</span>
              <div className="grid grid-cols-4 gap-1">
                {[['All', 0, 'text-subtle'], ['Van', 1, 'text-emerald-400'], ['Ass', 2, 'text-rose-400'], ['Sup', 3, 'text-violet-400']].map(([label, val, tc]) => (
                  <button key={val} onClick={() => setRoleFilter(+val)}
                    className={`py-1.5 text-[9px] font-black rounded-lg border transition-colors cursor-pointer ${roleFilter === +val ? `border-fuchsia-600/60 bg-fuchsia-900/20 ${tc}` : 'border-border bg-bg text-muted hover:text-text'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[0, 1, 2, 3, 4, 5].map(p => (
                  <button key={p} onClick={() => setProfFilter(p)}
                    className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-colors cursor-pointer ${profFilter === p ? 'border-fuchsia-600 bg-fuchsia-900/30 text-fuchsia-300' : 'border-border bg-bg text-muted hover:text-text'}`}>
                    {p === 0 ? 'All Class' : getProfessionLabel(p)}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="Search by name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-xl text-text placeholder-zinc-500 focus:outline-none focus:border-fuchsia-700 transition-colors" />
            </div>

            {/* Hero Pool */}
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {heroPool.length === 0 && <div className="text-center text-xs text-muted py-8 bg-surface rounded-xl border border-dashed">No heroes available</div>}
              {heroPool.map(hero => {
                const rec = recommendations.find(r => r.id === hero.id);
                const power = heroPowers.get(hero.id) ?? 0;
                return (
                  <button 
                    key={hero.id} 
                    onClick={() => selectedSlot ? placeHero(hero) : undefined}
                    disabled={!selectedSlot}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${selectedSlot ? 'border-border bg-surface hover:border-fuchsia-600 hover:bg-fuchsia-950/20 cursor-pointer' : 'border-border bg-surface opacity-50 cursor-default'}`}
                  >
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

      {/* === TAB 2: SOCKETS & GEAR === */}
      {tab === 'gear' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          {/* Active Heroes Sidebar Selector */}
          <div className="xl:col-span-1 bg-surface border border-border p-5 rounded-2xl shadow-sm space-y-3">
            <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Select Roster Wielder</span>
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {activeHeroes.map(h => {
                const isSelected = focusedHeroGearId === h.id;
                const stats = calculateFinalHeroStats(h);
                return (
                  <button
                    key={h.id}
                    onClick={() => setFocusedHeroGearId(h.id)}
                    className={`w-full p-3 text-left border rounded-xl transition-all flex justify-between items-center ${
                      isSelected
                        ? 'border-fuchsia-500 bg-fuchsia-500/5 text-fuchsia-800 dark:text-fuchsia-400 font-bold'
                        : 'border-border bg-bg hover:border-border-strong text-muted'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="font-semibold block truncate text-text">{h.name}</span>
                      <span className="text-[10px] text-subtle">{getProfessionLabel(h.profession)}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-brand shrink-0">
                      {stats.finalBP.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Armaments & Sockets Matrix panel */}
          {focusedHeroGear ? (
            <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Gear Slots central board */}
              <div className="md:col-span-2 p-6 bg-surface border border-border rounded-2xl shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-3 gap-3">
                  <div>
                    <span className="text-[10px] text-muted font-mono font-bold">Wielder: {focusedHeroGear.name}</span>
                    <h3 className="font-black text-lg text-text">Armaments & Jade Slots</h3>
                  </div>

                  {/* One-click Auto-Optimizer Jades */}
                  <button
                    onClick={handleAutoOptimizeJades}
                    className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Cpu size={13} />
                    Auto-Optimize Jades
                  </button>
                </div>

                {/* Sockets grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(SLOT_NAMES).map(([slotNumStr, slotName]) => {
                    const slotNum = parseInt(slotNumStr);
                    const loadout = getHeroLoadout(focusedHeroGear.id);
                    const equippedId = loadout.equips[slotNum];
                    const slotEquipOptions = equipsBySlot[slotNum] || [];
                    
                    // Filter options based on class eligibility
                    const eligibleOptions = slotEquipOptions.filter(e => canHeroWearEquip(focusedHeroGear, e));

                    return (
                      <div key={slotNum} className="p-4 border border-border/80 bg-bg/25 rounded-xl space-y-3">
                        <span className="text-xs font-bold text-brand uppercase tracking-wider block">{slotName} Slot</span>
                        
                        <select
                          value={equippedId || ''}
                          onChange={(e) => handleEquipChange(focusedHeroGear.id, slotNum, parseInt(e.target.value))}
                          className="block w-full py-2 px-2.5 border border-border rounded-lg text-xs bg-surface text-text focus:outline-none font-mono cursor-pointer"
                        >
                          <option value="">[Empty Slot]</option>
                          {eligibleOptions.map(e => (
                            <option key={e.id} value={e.id}>{articlesMap[e.id]?.name || `Gear #${e.id}`}</option>
                          ))}
                        </select>

                        {/* Sockets for Jades - each gear has 3 Jades sockets */}
                        <div className="space-y-2 pt-2 border-t border-border/40">
                          <span className="block text-[9px] font-bold text-subtle uppercase">Spirit Jade Sockets</span>
                          {[0, 1, 2].map((sockIdx) => {
                            const jade = loadout.jades[sockIdx] || { typeId: 0, level: 10 };
                            return (
                              <div key={sockIdx} className="flex gap-2 items-center">
                                <select
                                  value={jade.typeId}
                                  onChange={(e) => handleJadeChange(focusedHeroGear.id, sockIdx, parseInt(e.target.value), jade.level)}
                                  className="flex-1 py-1.5 px-2 border border-border/60 bg-surface text-[11px] rounded-lg focus:outline-none font-mono cursor-pointer text-text"
                                >
                                  <option value={0}>[Empty Socket]</option>
                                  {JADE_TYPES.map(j => (
                                    <option key={j.id} value={j.id}>{j.label}</option>
                                  ))}
                                </select>
                                {jade.typeId > 0 && (
                                  <select
                                    value={jade.level}
                                    onChange={(e) => handleJadeChange(focusedHeroGear.id, sockIdx, jade.typeId, parseInt(e.target.value))}
                                    className="w-16 py-1.5 px-1 border border-border/60 bg-surface text-[11px] rounded-lg focus:outline-none font-mono text-center font-bold text-text cursor-pointer"
                                  >
                                    {[...Array(10)].map((_, lIdx) => (
                                      <option key={lIdx + 1} value={lIdx + 1}>Lv.{lIdx + 1}</option>
                                    ))}
                                  </select>
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

              {/* Right Side: Hero Final Stats Inspector */}
              <div className="md:col-span-1 bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm">
                <span className="text-xs font-bold text-subtle uppercase tracking-wider block border-b border-border pb-2">Final Attribute Matrix</span>
                
                {(() => {
                  const final = calculateFinalHeroStats(focusedHeroGear);
                  return (
                    <div className="space-y-4 font-mono text-xs">
                      {/* BP card */}
                      <div className="p-3 bg-brand-soft/50 border border-brand-soft rounded-xl text-center space-y-1">
                        <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-brand block">Simulated Battle Power</span>
                        <span className="text-2xl font-black text-brand">{final.finalBP.toLocaleString()}</span>
                        <span className="text-[9px] text-muted block font-sans">Base: {final.baseBP.toLocaleString()}</span>
                      </div>

                      {/* Stat lines */}
                      <div className="space-y-2.5">
                        {[
                          { label: 'STR (Power)', val: final.finalStr, base: final.baseStr, buff: final.buffsSum.str, color: 'text-red-500', Icon: Zap },
                          { label: 'AGI (Agile)', val: final.finalAgi, base: final.baseAgi, buff: final.buffsSum.agi, color: 'text-emerald-500', Icon: Shield },
                          { label: 'INT (Intel)', val: final.finalInt, base: final.baseInt, buff: final.buffsSum.int, color: 'text-violet-500', Icon: Heart },
                          { label: 'HP (Stamina)', val: final.finalHp, base: final.baseHp, buff: final.buffsSum.hp, color: 'text-blue-500', Icon: Swords },
                          { label: 'SPD (Speed)', val: final.finalSpd, base: final.baseSpd, buff: final.buffsSum.spd, color: 'text-amber-500', Icon: Trophy },
                        ].map(item => (
                          <div key={item.label} className="p-2.5 bg-bg/50 border border-border/80 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <item.Icon size={12} className={item.color} />
                              <span className="font-sans font-semibold text-muted text-[10px] uppercase">{item.label}</span>
                            </div>
                            <div className="text-right">
                              <span className={`font-black text-sm block ${item.color}`}>{item.val.toLocaleString()}</span>
                              <span className="text-[9px] text-subtle">Base: {item.base} | +{item.buff}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          ) : (
            <div className="xl:col-span-3 py-16 text-center text-muted border border-dashed border-border bg-surface rounded-2xl shadow-sm">
              Deploy heroes on the roster grid to customize their gear sockets.
            </div>
          )}
        </div>
      )}

      {/* === TAB 3: BOND SYNERGIES === */}
      {tab === 'bonds' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start animate-fade-in">
          {/* Sider Config slider */}
          <div className="xl:col-span-1 p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-[10px] font-bold text-subtle uppercase tracking-wider">Bond Level Slider</span>
              <span className="text-xs font-black font-mono text-brand bg-brand-soft px-2 py-0.5 rounded">Lv. {bondLevel}</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={bondLevel}
              onChange={(e) => setBondLevel(parseInt(e.target.value))}
              className="w-full accent-brand cursor-pointer"
            />
            <span className="text-[10px] text-muted block leading-relaxed italic">
              Adjust simulated level (1 to 30) to see exact bond stat growth multiplier.
            </span>
          </div>

          {/* Main Bonds Analytics list */}
          <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Active Bonds */}
            <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-black text-sm text-text border-b border-border pb-2.5 flex items-center gap-1.5 uppercase tracking-widest">
                  <Heart size={15} className="text-rose-500 animate-pulse" />
                  Active Roster Bonds ({bondsAnalysis.active.length} Unlocked)
                </h3>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 mt-3">
                  {bondsAnalysis.active.map((item, idx) => (
                    <div key={idx} className="p-3 bg-bg/50 border border-success/20 rounded-xl flex items-center justify-between text-xs gap-3">
                      <div>
                        <div className="flex items-center gap-1 font-bold text-text">
                          <span>{item.hero.name}</span>
                          <span className="text-subtle">⇄</span>
                          <span>{item.partner.name}</span>
                        </div>
                        <span className="text-[9px] text-subtle font-mono block mt-0.5">Type ID: #{item.bond.type}</span>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap justify-end">
                        {item.bonus.map((b, bIdx) => (
                          <span key={bIdx} className="px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/10 text-emerald-500 text-[10px]">
                            {b.label}: {b.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {bondsAnalysis.active.length === 0 && (
                    <p className="text-center text-muted italic py-10">No active partner bonds triggered. Deploy connected characters together.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Inactive/Recommends Bonds */}
            <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-black text-sm text-text border-b border-border pb-2.5 flex items-center gap-1.5 uppercase tracking-widest">
                  <Wand2 size={15} className="text-brand" />
                  Inactive / Recommends Bonds
                </h3>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 mt-3">
                  {bondsAnalysis.inactive.map((item, idx) => {
                    const missingPartner = heroes.find(h => h.id === item.missingPartnerId);
                    return (
                      <div 
                        key={idx} 
                        onClick={() => handleAddHero(item.missingPartnerId)}
                        className="p-3 bg-bg/50 border border-border hover:border-brand-soft rounded-xl flex justify-between items-center text-xs gap-3 cursor-pointer group"
                      >
                        <div>
                          <span className="font-bold text-text block group-hover:text-brand transition-colors">{item.hero.name} Bond</span>
                          <span className="text-[10px] text-muted block mt-0.5">
                            Missing connected partner: <strong className="text-brand">{missingPartner?.name || `Partner #${item.missingPartnerId}`}</strong>
                          </span>
                        </div>
                        <span className="px-2 py-1 bg-brand-soft text-brand text-[9px] font-black uppercase rounded border border-border shrink-0">
                          + Deploy Partner
                        </span>
                      </div>
                    );
                  })}
                  {bondsAnalysis.inactive.length === 0 && (
                    <p className="text-center text-muted italic py-10">All possible deployed bonds are fully unlocked!</p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* === TAB 4: MILITARY RANKS === */}
      {tab === 'military' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in items-start">
          {/* Selector */}
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-text border-b border-border pb-2.5">
              Select Military Rank
            </h3>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-subtle uppercase">Seireitei Ranks list</label>
              <select
                value={selectedMilitaryRankId}
                onChange={(e) => setSelectedMilitaryRankId(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-border bg-bg rounded-xl focus:outline-none focus:ring-1.5 focus:ring-fuchsia-500 font-bold text-text cursor-pointer text-xs"
              >
                {militaryRanks.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (Rank #{r.id})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Details Output */}
          {activeRank && (
            <div className="lg:col-span-2 p-6 bg-surface border border-border rounded-2xl shadow-sm space-y-5">
              <div className="flex justify-between items-start border-b border-border pb-3">
                <div>
                  <span className="text-[10px] text-subtle font-mono font-bold">MILITARY RANK LICENSE</span>
                  <h3 className="text-xl font-black text-text">{activeRank.name}</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-800 dark:text-fuchsia-400 text-xs font-black uppercase font-mono">
                  Salary: {activeRank.salary?.award?.[0]?.amount?.toLocaleString() || 0} Silver
                </span>
              </div>

              {/* Ranks Caps info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-bg border border-border rounded-xl flex justify-between items-center text-xs">
                  <span className="text-muted font-bold">Max Deployable Squad Allies</span>
                  <span className="font-mono text-base font-black text-text">{activeRank.fight_hero_num} Active</span>
                </div>
                <div className="p-4 bg-bg border border-border rounded-xl flex justify-between items-center text-xs">
                  <span className="text-muted font-bold">Rank Merit Requirement</span>
                  <span className="font-mono text-base font-black text-amber-600 dark:text-amber-400">{activeRank.need_credit.toLocaleString()} Merit</span>
                </div>
              </div>

              {/* Stat Increases */}
              <div className="space-y-2">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Team-Wide Squad Stat Buffs</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                  {[
                    { label: 'STR', val: militaryBuffs.str, color: 'text-red-500' },
                    { label: 'AGI', val: militaryBuffs.agi, color: 'text-emerald-500' },
                    { label: 'INT', val: militaryBuffs.int, color: 'text-violet-500' },
                    { label: 'HP', val: militaryBuffs.hp, color: 'text-blue-500' },
                  ].map(item => (
                    <div key={item.label} className="p-3 bg-bg/50 border border-border/80 rounded-xl text-center">
                      <span className="text-[9px] text-subtle font-sans font-semibold block">{item.label} Gain</span>
                      <span className={`font-black text-sm block mt-1.5 ${item.color}`}>
                        +{item.val.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === TAB 5: EXPORT === */}
      {tab === 'export' && (
        <div className="space-y-5 animate-fade-in">
          <p className="text-sm text-subtle">Export, share, or back up your custom loadout squad configuration.</p>
          {/* Formation Card */}
          <div id="formation-export-card" className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-700 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-black text-zinc-100">Formation Loadout Lineup</div>
                <div className="text-xs text-muted mt-0.5">{finalActiveSet.size}/{MAX_PARTNERS} active · Lv.{targetLevel} simulation</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-brand font-mono">{totalPower.toLocaleString()}</div>
                <div className="text-[9px] text-muted font-bold">total squad power</div>
              </div>
            </div>
            <div className="flex gap-4">
              {COLUMNS.map((col, ci) => (
                <div key={col.id} className="flex-1 space-y-2">
                  <div className={`text-[9px] font-black uppercase tracking-widest text-center ${col.headerColor}`}>{col.label}</div>
                  {Array.from({ length: col.count }, (_, ri) => {
                    const sd = ALL_SLOTS.find(s => s.col === ci && s.row === ri)!;
                    const hero = finalSlots[sd.slot - 1];
                    const isAct = finalActiveSet.has(sd.slot);
                    if (!hero) return (
                      <div key={ri} className="h-14 rounded-lg border border-dashed border-zinc-700 flex items-center justify-center text-[9px] text-text">Empty</div>
                    );
                    const stats = calculateFinalHeroStats(hero);
                    return (
                      <div key={ri} className={`p-2 rounded-lg border ${isAct ? 'border-fuchsia-700/50 bg-fuchsia-950/20' : 'border-border bg-surface opacity-50'}`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-[8px] font-bold ${getQualityColorClass(hero.quality)}`}>{getQualityLabel(hero.quality)}</span>
                          {isAct && <span className="text-[7px] font-bold text-fuchsia-400">ACTIVE</span>}
                        </div>
                        <div className="text-[10px] font-bold text-white truncate">{hero.name}</div>
                        <div className={`text-[8px] font-bold ${PROF_COLOR[hero.profession ?? 0]}`}>{getProfessionLabel(hero.profession)}</div>
                        <div className="text-[8px] font-mono text-muted">{stats.finalBP.toLocaleString()}</div>
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
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-fuchsia-900/40 hover:bg-fuchsia-800/50 text-fuchsia-300 rounded-xl border border-fuchsia-700/40 transition-colors cursor-pointer">
              {copied ? <Check size={14} /> : <Share2 size={14} />} {copied ? 'Link Copied!' : 'Copy Shareable URL'}
            </button>
            <button onClick={() => {
              const text = ALL_SLOTS
                .map(sd => { 
                  const h = finalSlots[sd.slot - 1]; 
                  const col = COLUMNS[sd.col]; 
                  const stats = h ? calculateFinalHeroStats(h) : null;
                  return h ? `[${col.label}] ${h.name} (${getProfessionLabel(h.profession)}) — Final BP: ${stats?.finalBP.toLocaleString()}${finalActiveSet.has(sd.slot) ? ' ★ACTIVE' : ''}` : null; 
                })
                .filter(Boolean).join('\n');
              navigator.clipboard.writeText(text ?? '').then(() => {
                alert("Roster text description copied to clipboard!");
              });
            }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-surface hover:bg-hover text-subtle rounded-xl border border-zinc-700 transition-colors cursor-pointer">
              <ClipboardCheck size={14} /> Copy as Text
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
