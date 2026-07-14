import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadHeroes } from '../data/loaders';
import { Hero } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getProfessionLabel } from '../data/relationships';
import { getQualityColorClass } from '../utils/quality';
import { ArrowRight, ChevronDown, Info } from 'lucide-react';

// Profession counter system derived from CONST_CHARACTER.as + weakness field
// Triangle: Agility → Defending → Strength → Agility
// Sub-triangle: Intellect → Warlock → Intellect (mutual weak/strong)
const PROF_META: Record<number, {
  name: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  counters: number[];   // this profession is STRONG against these
  weakTo: number[];     // this profession is WEAK against these
  desc: string;
}> = {
  1: {
    name: 'Agility',
    emoji: '⚡',
    color: 'text-amber-400',
    bg: 'bg-amber-950/30',
    border: 'border-amber-700/50',
    counters: [2],
    weakTo: [4],
    desc: 'Swift strikers — high dodge and crit rate, mobile flankers',
  },
  2: {
    name: 'Defending',
    emoji: '🛡',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/30',
    border: 'border-emerald-700/50',
    counters: [4],
    weakTo: [1],
    desc: 'Iron tanks — max HP, high block rate, front-line guardians',
  },
  3: {
    name: 'Intellect',
    emoji: '🔮',
    color: 'text-violet-400',
    bg: 'bg-violet-950/30',
    border: 'border-violet-700/50',
    counters: [5],
    weakTo: [5],
    desc: 'Tactical mages — strategy attack specialists, AoE damage dealers',
  },
  4: {
    name: 'Strength',
    emoji: '💪',
    color: 'text-rose-400',
    bg: 'bg-rose-950/30',
    border: 'border-rose-700/50',
    counters: [1],
    weakTo: [2],
    desc: 'Brutal brawlers — high near-attack, power-based scaling',
  },
  5: {
    name: 'Warlock',
    emoji: '🌑',
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-950/30',
    border: 'border-fuchsia-700/50',
    counters: [3],
    weakTo: [3],
    desc: 'Dark arts specialists — debuffers, drain effects, shadow magic',
  },
};

// Role tier ordering
const TIER_ORDER = ['SS', 'S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'C', 'D'];
function tierValue(tier: string | null): number {
  if (!tier) return 0;
  const idx = TIER_ORDER.indexOf(tier);
  return idx >= 0 ? TIER_ORDER.length - idx : 0;
}

export const ProfessionCounterPage: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProf, setSelectedProf] = useState<number | null>(null);
  const [myTeamProfs, setMyTeamProfs] = useState<number[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await loadHeroes();
      setHeroes(res.rows);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Heroes grouped by profession, sorted by tier
  const byProf = useMemo(() => {
    const map: Record<number, Hero[]> = {};
    heroes.forEach(h => {
      const p = h.profession ?? 0;
      if (!map[p]) map[p] = [];
      map[p].push(h);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => tierValue(b.role) - tierValue(a.role)));
    return map;
  }, [heroes]);

  // What does my team get countered by?
  const myTeamCounteredBy = useMemo(() => {
    const countered = new Set<number>();
    myTeamProfs.forEach(p => {
      PROF_META[p]?.weakTo.forEach(w => countered.add(w));
    });
    return [...countered];
  }, [myTeamProfs]);

  // What does my team counter?
  const myTeamCounters = useMemo(() => {
    const counters = new Set<number>();
    myTeamProfs.forEach(p => {
      PROF_META[p]?.counters.forEach(c => counters.add(c));
    });
    return [...counters];
  }, [myTeamProfs]);

  function toggleMyTeamProf(p: number) {
    setMyTeamProfs(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  if (loading) return <LoadingState message="Loading profession data..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text tracking-tight">🔺 Profession Counter Chart</h1>
        <p className="text-sm text-muted mt-1">
          Counter triangle derived from <span className="font-mono text-xs">CONST_CHARACTER.as</span> + hero <span className="font-mono text-xs">weakness</span> field
        </p>
      </div>

      {/* Counter Triangle Visual */}
      <div className="p-6 bg-surface border border-border rounded-2xl space-y-6">
        <h2 className="text-sm font-bold text-subtle">Counter Relationships</h2>

        {/* Main Triangle */}
        <div className="space-y-4">
          <div className="text-[10px] font-bold text-subtle uppercase tracking-wider">Physical Triangle</div>
          <div className="flex items-center flex-wrap gap-3 justify-center md:justify-start">
            {[1, 4, 2].map((prof, idx) => {
              const meta = PROF_META[prof];
              return (
                <React.Fragment key={prof}>
                  <div
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedProf === prof ? `${meta.bg} ${meta.border} ring-2 ring-fuchsia-500/40` : `${meta.bg} ${meta.border} hover:ring-1 hover:ring-muted`
                    }`}
                    onClick={() => setSelectedProf(selectedProf === prof ? null : prof)}
                  >
                    <span className="text-2xl">{meta.emoji}</span>
                    <span className={`text-xs font-black ${meta.color}`}>{meta.name}</span>
                    <span className="text-[9px] text-subtle">{(byProf[prof] ?? []).length} heroes</span>
                  </div>
                  {idx < 2 && (
                    <div className="flex flex-col items-center gap-0.5">
                      <ArrowRight size={16} className="text-muted" />
                      <span className="text-[8px] text-subtle">counters</span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {/* Loop back indicator */}
            <div className="flex flex-col items-center gap-0.5">
              <ArrowRight size={16} className="text-muted rotate-180" />
              <span className="text-[8px] text-subtle">counters</span>
            </div>
          </div>

          {/* Intellect / Warlock mutual */}
          <div className="text-[10px] font-bold text-subtle uppercase tracking-wider mt-4">Arcane Sub-Triangle</div>
          <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
            {[3, 5].map((prof, idx) => {
              const meta = PROF_META[prof];
              return (
                <React.Fragment key={prof}>
                  <div
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedProf === prof ? `${meta.bg} ${meta.border} ring-2 ring-fuchsia-500/40` : `${meta.bg} ${meta.border} hover:ring-1 hover:ring-muted`
                    }`}
                    onClick={() => setSelectedProf(selectedProf === prof ? null : prof)}
                  >
                    <span className="text-2xl">{meta.emoji}</span>
                    <span className={`text-xs font-black ${meta.color}`}>{meta.name}</span>
                    <span className="text-[9px] text-subtle">{(byProf[prof] ?? []).length} heroes</span>
                  </div>
                  {idx === 0 && (
                    <div className="flex flex-col items-center gap-0.5 text-muted text-[9px] text-center">
                      <span>⇄</span>
                      <span>mutual</span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Selected profession details */}
        {selectedProf !== null && PROF_META[selectedProf] && (
          <div className={`p-4 rounded-xl border-2 ${PROF_META[selectedProf].border} ${PROF_META[selectedProf].bg} space-y-3`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{PROF_META[selectedProf].emoji}</span>
              <div>
                <div className={`text-base font-black ${PROF_META[selectedProf].color}`}>{PROF_META[selectedProf].name}</div>
                <div className="text-xs text-muted">{PROF_META[selectedProf].desc}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="block text-[9px] font-bold text-success uppercase mb-1">✓ Counters</span>
                {PROF_META[selectedProf].counters.map(c => (
                  <div key={c} className={`font-bold ${PROF_META[c].color}`}>
                    {PROF_META[c].emoji} {PROF_META[c].name}
                  </div>
                ))}
              </div>
              <div>
                <span className="block text-[9px] font-bold text-danger uppercase mb-1">✗ Weak Against</span>
                {PROF_META[selectedProf].weakTo.map(w => (
                  <div key={w} className={`font-bold ${PROF_META[w].color}`}>
                    {PROF_META[w].emoji} {PROF_META[w].name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Team Analyzer */}
      <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-subtle">🎯 "What Counters My Team?" Analyzer</h2>
        <p className="text-xs text-muted">Select your team's profession composition to see threats and advantages.</p>

        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map(p => {
            const meta = PROF_META[p];
            const selected = myTeamProfs.includes(p);
            return (
              <button key={p} onClick={() => toggleMyTeamProf(p)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs transition-all ${
                  selected ? `${meta.bg} ${meta.border} ${meta.color} ring-2 ring-fuchsia-500/30` : 'bg-bg border-border text-muted hover:text-text'
                }`}>
                <span>{meta.emoji}</span> {meta.name}
                {selected && <span className="ml-0.5 text-[9px]">✓</span>}
              </button>
            );
          })}
          {myTeamProfs.length > 0 && (
            <button onClick={() => setMyTeamProfs([])}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-bg border border-border text-muted hover:text-danger transition-colors">
              Clear
            </button>
          )}
        </div>

        {myTeamProfs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3 rounded-xl border border-danger/50 bg-danger/10 space-y-2">
              <div className="text-[10px] font-black text-danger uppercase tracking-wider">⚠ Your Team Is Weak To</div>
              {myTeamCounteredBy.length === 0 ? (
                <div className="text-xs text-subtle">No known weaknesses!</div>
              ) : myTeamCounteredBy.map(p => (
                <div key={p} className={`flex items-center gap-2 text-xs font-bold ${PROF_META[p].color}`}>
                  <span>{PROF_META[p].emoji}</span> {PROF_META[p].name}
                  <span className="text-muted font-normal text-[9px]">— {PROF_META[p].desc}</span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl border border-success/50 bg-success/10 space-y-2">
              <div className="text-[10px] font-black text-success uppercase tracking-wider">✓ Your Team Counters</div>
              {myTeamCounters.length === 0 ? (
                <div className="text-xs text-subtle">No countered types selected.</div>
              ) : myTeamCounters.map(p => (
                <div key={p} className={`flex items-center gap-2 text-xs font-bold ${PROF_META[p].color}`}>
                  <span>{PROF_META[p].emoji}</span> {PROF_META[p].name}
                  <span className="text-muted font-normal text-[9px]">— {PROF_META[p].desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Roster by Profession */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-subtle">📋 Roster by Profession</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map(prof => {
            const meta = PROF_META[prof];
            const profHeroes = (byProf[prof] ?? []).slice(0, 8);
            if (!profHeroes.length) return null;
            return (
              <div key={prof} className={`p-4 rounded-2xl border ${meta.border} ${meta.bg} space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{meta.emoji}</span>
                    <span className={`text-sm font-black ${meta.color}`}>{meta.name}</span>
                  </div>
                  <span className="text-[10px] text-subtle">{(byProf[prof] ?? []).length} total</span>
                </div>
                <div className="space-y-1.5">
                  {profHeroes.map(h => (
                    <Link key={h.id} to={`/heroes/${h.id}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/10 transition-colors">
                      <span className="text-xs font-bold text-text">{h.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-black ${getQualityColorClass(h.quality)}`}>{h.role ?? '?'}</span>
                      </div>
                    </Link>
                  ))}
                  {(byProf[prof] ?? []).length > 8 && (
                    <Link to="/heroes" className="block text-center text-[9px] text-subtle hover:text-muted pt-1 transition-colors">
                      +{(byProf[prof] ?? []).length - 8} more →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weakness Data Note */}
      <div className="p-4 bg-surface/60 border border-border rounded-xl flex gap-3">
        <Info size={14} className="text-subtle shrink-0 mt-0.5" />
        <p className="text-xs text-subtle">
          Counter relationships are derived from the <span className="font-mono">CONST_CHARACTER.as</span> profession constants and the <span className="font-mono">weakness</span> field in <span className="font-mono">heroes.json</span>.
          The <span className="font-bold text-muted">physical triangle</span> (Agility → Defending → Strength) and <span className="font-bold text-muted">arcane duality</span> (Intellect ⇄ Warlock) mirror standard gacha game mechanics observed in the ActionScript battle calculations.
        </p>
      </div>
    </div>
  );
};
