import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Shield, Flame, Heart } from 'lucide-react';
import { FightRole } from '../../utils/fight-report/parser';
import { FighterRuntimeState } from '../../utils/fight-report/simulation';

interface FighterTeamPanelProps {
  title: string;
  camp: number;
  roles: FightRole[];
  finalState: Map<string, FighterRuntimeState>;
  maxDamageDone: number;
  maxDamageTaken: number;
  maxHealingDone: number;
  maxShieldApplied: number;
}

type SortKey =
  | 'position'
  | 'damageDealtRaw'
  | 'hpDamageDealt'
  | 'damageTakenRaw'
  | 'healingDone'
  | 'shieldApplied'
  | 'crits'
  | 'kills'
  | 'finalHpPercent';

export const FighterTeamPanel: React.FC<FighterTeamPanelProps> = ({
  title,
  camp,
  roles,
  finalState,
  maxDamageDone,
  maxDamageTaken,
  maxHealingDone,
  maxShieldApplied: _maxShieldApplied,
}) => {
  const [searchTerm, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('damageDealtRaw');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const resolvedFighters = useMemo(() => {
    return roles.map((r) => {
      const fState = finalState.get(`${camp}_${r.pos}`);
      const finalHp = fState?.hp ?? 0;
      const maxHp = fState?.maxHp ?? r.totleHealth;
      const hpPercent = maxHp > 0 ? (finalHp / maxHp) * 100 : 0;

      return {
        role: r,
        state: fState,
        finalHp,
        maxHp,
        hpPercent,
        name: fState?.name ?? `Pos ${r.pos}`,
      };
    });
  }, [roles, finalState, camp]);

  // Search and Sort Logic
  const processedFighters = useMemo(() => {
    let result = [...resolvedFighters];

    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.role.roleId.toString().includes(query) ||
          f.role.pos.toString().includes(query)
      );
    }

    // Sorting
    result.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      if (sortKey === 'position') {
        valA = a.role.pos;
        valB = b.role.pos;
      } else if (sortKey === 'finalHpPercent') {
        valA = a.hpPercent;
        valB = b.hpPercent;
      } else {
        // Core metrics
        valA = a.state ? (a.state[sortKey] as number) : 0;
        valB = b.state ? (b.state[sortKey] as number) : 0;
      }

      if (valA < valB) return sortOrder === 'desc' ? 1 : -1;
      if (valA > valB) return sortOrder === 'desc' ? -1 : 1;
      return 0;
    });

    return result;
  }, [resolvedFighters, searchTerm, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc'); // Default to descending
    }
  };

  const formatCompactNumber = (value: number): string => {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Search and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 border border-border bg-surface rounded-2xl shadow-sm">
        <h4 className="font-extrabold text-sm text-text shrink-0">{title}</h4>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:flex-none">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-40 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 font-medium placeholder-zinc-400"
            />
          </div>

          {/* Sort Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold text-subtle uppercase tracking-wider hidden md:inline">
              Sort By:
            </label>
            <select
              value={sortKey}
              onChange={(e) => handleSort(e.target.value as SortKey)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-border bg-bg text-text font-bold focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="position">Position</option>
              <option value="damageDealtRaw">Raw Damage</option>
              <option value="hpDamageDealt">HP Damage</option>
              <option value="damageTakenRaw">Damage Taken</option>
              <option value="healingDone">Healing Done</option>
              <option value="shieldApplied">Shield Applied</option>
              <option value="crits">Critical Hits</option>
              <option value="kills">Kills</option>
              <option value="finalHpPercent">Survival HP %</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="p-1.5 border border-border rounded-xl hover:bg-hover text-muted"
              title="Toggle Sort Order"
            >
              <ArrowUpDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="space-y-3">
        {processedFighters.length === 0 ? (
          <div className="p-8 border border-dashed border-border rounded-2xl text-center text-xs text-subtle font-bold">
            No matching fighters found.
          </div>
        ) : (
          processedFighters.map(({ role, state: fState, finalHp, maxHp, hpPercent, name }) => {
            const isDead = fState?.dead ?? false;
            const dmgRaw = fState?.damageDealtRaw ?? 0;
            const dmgHp = fState?.hpDamageDealt ?? 0;
            const takenRaw = fState?.damageTakenRaw ?? 0;
            const healingDone = fState?.healingDone ?? 0;
            const healingRec = fState?.healingReceived ?? 0;
            const shieldApplied = fState?.shieldApplied ?? 0;
            const shieldAbsorbed = fState?.shieldAbsorbed ?? 0;
            const crits = fState?.crits ?? 0;
            const kills = fState?.kills ?? 0;
            const finalShield = fState?.shield ?? 0;
            const finalAnger = fState?.anger ?? 0;

            return (
              <div
                key={role.pos}
                className="p-4 border border-border bg-surface rounded-2xl shadow-sm hover:border-border-strong transition-all relative overflow-hidden group"
              >
                {/* Header block */}
                <div className="flex justify-between items-start border-b border-border pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-bg rounded-lg border border-border text-[10px] font-mono font-bold text-muted">
                      Pos {role.pos}
                    </span>
                    <span className="font-extrabold text-sm text-text">{name}</span>
                    {isDead ? (
                      <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/40 border border-rose-300/10 text-rose-800 dark:text-rose-400 rounded text-[9px] font-bold uppercase tracking-wider">
                        Fallen
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300/10 text-emerald-800 dark:text-emerald-400 rounded text-[9px] font-bold uppercase tracking-wider">
                        Alive ({hpPercent.toFixed(0)}%)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-subtle font-mono font-bold">
                    {role.rebirthNum ? <span>R{role.rebirthNum}</span> : null}
                    <span>Lv. {role.level}</span>
                  </div>
                </div>

                {/* HP, Shield, Anger Snapshot Grid */}
                <div className="grid grid-cols-3 gap-2.5 py-2 text-[10px] border-b border-dashed border-border/70">
                  <div className="space-y-0.5">
                    <span className="text-subtle block font-semibold uppercase tracking-wider text-[8px]">
                      Health Points
                    </span>
                    <span className="font-bold text-muted block font-mono">
                      {finalHp.toLocaleString()} / {maxHp.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-subtle block font-semibold uppercase tracking-wider text-[8px]">
                      Shield (Active / Applied)
                    </span>
                    <span className="font-bold text-blue-500 block font-mono">
                      {finalShield.toLocaleString()} / {shieldApplied.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-subtle block font-semibold uppercase tracking-wider text-[8px]">
                      Anger Pool
                    </span>
                    <span className="font-bold text-amber-500 block font-mono">{finalAnger}</span>
                  </div>
                </div>

                {/* Performance Progress Bars */}
                <div className="space-y-3 pt-3">
                  {/* Visual HP / Shield Overlay Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-subtle">
                      <span>HP & Shield Trajectory</span>
                      <span>{Math.round(hpPercent)}% HP</span>
                    </div>
                    <div className="w-full h-3 bg-bg rounded-full overflow-hidden relative border border-border">
                      {/* Shield bar overlay */}
                      {finalShield > 0 && (
                        <div
                          className="h-full bg-blue-500/80 absolute right-0 top-0 transition-all duration-300 z-10"
                          style={{
                            width: `${Math.min(100, (finalShield / maxHp) * 100)}%`,
                            left: `${Math.max(0, hpPercent)}%`,
                          }}
                        ></div>
                      )}
                      {/* HP Bar */}
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          hpPercent > 50
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : hpPercent > 20
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                              : 'bg-gradient-to-r from-rose-500 to-red-500'
                        }`}
                        style={{ width: `${hpPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Damage Dealt Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-subtle font-medium">Dealt (Raw / HP Dmg)</span>
                      <span className="font-mono font-bold text-red-500 flex items-center gap-1">
                        <Flame size={10} />
                        <span>{formatCompactNumber(dmgRaw)}</span>
                        <span className="text-subtle font-medium text-[9px]">
                          / {formatCompactNumber(dmgHp)} HP
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden border border-border">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-rose-600 transition-all duration-500 rounded-full"
                        style={{ width: `${maxDamageDone > 0 ? (dmgRaw / maxDamageDone) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Damage Taken Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-subtle font-medium">Taken (Raw / Shield Abs)</span>
                      <span className="font-mono font-bold text-orange-500 flex items-center gap-1">
                        <Shield size={10} />
                        <span>{formatCompactNumber(takenRaw)}</span>
                        <span className="text-subtle font-medium text-[9px]">
                          / {formatCompactNumber(shieldAbsorbed)} Abs
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden border border-border">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-amber-500 transition-all duration-500 rounded-full"
                        style={{ width: `${maxDamageTaken > 0 ? (takenRaw / maxDamageTaken) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Healing Done Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-subtle font-medium">Healing (Done / Received)</span>
                      <span className="font-mono font-bold text-emerald-500 flex items-center gap-1">
                        <Heart size={10} />
                        <span>{formatCompactNumber(healingDone)}</span>
                        <span className="text-subtle font-medium text-[9px]">
                          / {formatCompactNumber(healingRec)} Rec
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden border border-border">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 rounded-full"
                        style={{ width: `${maxHealingDone > 0 ? (healingDone / maxHealingDone) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Stats quick chips for tactical clarity */}
                <div className="flex flex-wrap gap-1.5 pt-3 mt-1.5 border-t border-dashed border-border/60">
                  {crits > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg bg-red-500/5 text-red-500 border border-red-500/10 flex items-center gap-0.5">
                      🔥 {crits} Crits
                    </span>
                  )}
                  {kills > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg bg-indigo-500/5 text-indigo-500 border border-indigo-500/10 flex items-center gap-0.5">
                      💀 {kills} Kills
                    </span>
                  )}
                  {shieldApplied > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg bg-blue-500/5 text-blue-500 border border-blue-500/10 flex items-center gap-0.5">
                      🛡️ {formatCompactNumber(shieldApplied)} Shield Applied
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
