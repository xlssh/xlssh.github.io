import React, { useMemo } from 'react';
import { Shield, Sparkles } from 'lucide-react';
import { BuffUsageStats } from '../../utils/fight-report/simulation';

interface BuffsTabProps {
  buffsStats: Map<number, BuffUsageStats>;
}

export const BuffsTab: React.FC<BuffsTabProps> = ({ buffsStats }) => {
  const buffsList = useMemo(() => {
    return Array.from(buffsStats.values());
  }, [buffsStats]);

  if (buffsList.length === 0) {
    return (
      <div className="p-8 border border-dashed border-border rounded-2xl text-center text-xs text-subtle font-bold">
        No specific status buffs or shield effects were triggered or recorded during this fight.
      </div>
    );
  }

  return (
    <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
      <div>
        <h4 className="font-extrabold text-sm text-text flex items-center gap-2">
          <Sparkles size={16} className="text-violet-500" />
          <span>Status Buffs & Shield Analytics</span>
        </h4>
        <span className="text-xs text-subtle">
          Summarizes the applications, clears/removals, and coverage of temporary buffs and shields.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {buffsList.map((stat) => {
          const isShield = stat.buffName.toLowerCase().includes('shield');

          return (
            <div
              key={stat.buffId}
              className="p-4 border border-border bg-bg/50 dark:bg-zinc-900/10 rounded-2xl space-y-3 shadow-sm flex flex-col justify-between"
            >
              {/* Header block */}
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-xs text-text block">{stat.buffName}</span>
                  <span className="text-[10px] font-mono text-subtle block">ID #{stat.buffId}</span>
                </div>
                {isShield ? (
                  <span className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500 border border-blue-500/10">
                    <Shield size={14} />
                  </span>
                ) : (
                  <span className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500 border border-purple-500/10">
                    <Sparkles size={14} />
                  </span>
                )}
              </div>

              {/* Application details stats */}
              <div className="grid grid-cols-2 gap-2 text-center text-[10px] py-1 border-y border-dashed border-border">
                <div className="space-y-0.5 border-r border-border">
                  <span className="text-subtle font-bold block uppercase tracking-wider text-[8px]">
                    Applied
                  </span>
                  <span className="font-black text-text text-xs">{stat.appliedCount} Times</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-subtle font-bold block uppercase tracking-wider text-[8px]">
                    Cleansed / Expired
                  </span>
                  <span className="font-black text-text text-xs">{stat.removedCount} Times</span>
                </div>
              </div>

              {/* Fighter mappings */}
              <div className="space-y-2 pt-1 text-[10px] font-semibold">
                {stat.affectedFighters.size > 0 && (
                  <div>
                    <span className="text-subtle uppercase tracking-wider text-[8px] font-bold block mb-0.5">
                      Affected Targets
                    </span>
                    <p className="text-muted leading-relaxed font-bold">
                      {Array.from(stat.affectedFighters).join(', ')}
                    </p>
                  </div>
                )}
                {stat.sourceFighters.size > 0 && (
                  <div>
                    <span className="text-subtle uppercase tracking-wider text-[8px] font-bold block mb-0.5">
                      Applied By
                    </span>
                    <p className="text-muted leading-relaxed font-bold">
                      {Array.from(stat.sourceFighters).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
