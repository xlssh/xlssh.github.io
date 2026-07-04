import React from 'react';
import { Skull, AlertOctagon, Heart } from 'lucide-react';
import { DeathEvent } from '../../utils/fight-report/simulation';

interface DeathsTabProps {
  deaths: DeathEvent[];
}

export const DeathsTab: React.FC<DeathsTabProps> = ({ deaths }) => {
  if (deaths.length === 0) {
    return (
      <div className="p-8 border border-dashed border-border rounded-2xl text-center text-xs text-subtle font-bold flex flex-col items-center justify-center gap-3">
        <Heart size={28} className="text-emerald-500 animate-pulse" />
        <div className="space-y-1">
          <span className="block text-text font-extrabold">Complete Survivor Victory!</span>
          <span className="block text-subtle">No fighters on either team fell during this engagement.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
      <div>
        <h4 className="font-extrabold text-sm text-text flex items-center gap-2">
          <Skull size={16} className="text-rose-500 animate-bounce" />
          <span>Combat Defeats & Death Recaps</span>
        </h4>
        <span className="text-xs text-subtle">
          Chronological registry of fallen units, including killing blow metrics and overkill margin calculations.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deaths.map((death, idx) => {
          return (
            <div
              key={death.id || idx}
              className="p-4 border border-rose-100 dark:border-rose-950/40 bg-rose-50/5 dark:bg-rose-950/5 rounded-2xl space-y-3.5 relative overflow-hidden shadow-sm"
            >
              {/* Round Badge Indicator */}
              <span className="absolute top-4 right-4 px-2 py-0.5 rounded-md bg-bg border border-border text-[9px] font-mono font-bold text-rose-500">
                ROUND {death.round}
              </span>

              {/* Character Obituary Header */}
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-950/50 rounded-full border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400">
                  <Skull size={16} />
                </div>
                <div>
                  <h5 className="font-black text-xs text-text select-all">
                    {death.victimName} (Pos {death.victimPos})
                  </h5>
                  <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">
                    Defeated / Fallen
                  </span>
                </div>
              </div>

              {/* Killing Blow description */}
              <div className="p-3 bg-bg border border-border/70 rounded-xl space-y-1.5 font-semibold text-xs leading-relaxed text-muted">
                <p>
                  Defeated by{' '}
                  <span className="font-bold text-violet-600 dark:text-violet-400">
                    {death.attackerName}
                  </span>{' '}
                  using skill <span className="font-extrabold text-text">[{death.skillName}]</span>.
                </p>
                <div className="flex items-center gap-2 pt-1 font-mono text-[10px]">
                  <span>Killing Blow Damage:</span>
                  <span className="font-extrabold text-red-500">
                    {death.damage.toLocaleString()} Raw HP
                  </span>
                </div>
              </div>

              {/* Detailed metrics snapshot grid */}
              <div className="grid grid-cols-3 gap-2.5 text-center text-[10px] pt-1">
                <div className="p-2 border border-border bg-bg/40 rounded-xl space-y-0.5">
                  <span className="text-subtle font-bold block uppercase tracking-wider text-[8px]">
                    HP Before Hit
                  </span>
                  <span className="font-bold text-text font-mono block text-xs">
                    {death.hpBefore.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 border border-border bg-bg/40 rounded-xl space-y-0.5">
                  <span className="text-subtle font-bold block uppercase tracking-wider text-[8px]">
                    Active Shield
                  </span>
                  <span className="font-bold text-blue-500 font-mono block text-xs">
                    {death.shieldBefore > 0 ? death.shieldBefore.toLocaleString() : '—'}
                  </span>
                </div>
                <div className="p-2 border border-rose-200 dark:border-rose-900/20 bg-rose-500/5 rounded-xl space-y-0.5">
                  <span className="text-rose-500 font-bold block uppercase tracking-wider text-[8px] flex items-center justify-center gap-0.5">
                    <AlertOctagon size={10} />
                    <span>Overkill</span>
                  </span>
                  <span className="font-black text-rose-600 dark:text-rose-455 font-mono block text-xs">
                    {death.overkill > 0 ? death.overkill.toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
