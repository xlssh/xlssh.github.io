import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Flame, Heart, Target } from 'lucide-react';
import { SkillUsageStats } from '../../utils/fight-report/simulation';

interface SkillsTabProps {
  skillsStats: Map<number, SkillUsageStats>;
}

type SortKey =
  | 'uses'
  | 'totalRawDamage'
  | 'totalHpDamage'
  | 'totalHealing'
  | 'maxHit'
  | 'crits'
  | 'kills';

export const SkillsTab: React.FC<SkillsTabProps> = ({ skillsStats }) => {
  const [sortKey, setSortKey] = useState<SortKey>('totalRawDamage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const statsList = useMemo(() => {
    return Array.from(skillsStats.values());
  }, [skillsStats]);

  const sortedStats = useMemo(() => {
    const result = [...statsList];
    result.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA < valB) return sortOrder === 'desc' ? 1 : -1;
      if (valA > valB) return sortOrder === 'desc' ? -1 : 1;
      return 0;
    });
    return result;
  }, [statsList, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  if (statsList.length === 0) {
    return (
      <div className="p-8 border border-dashed border-border rounded-2xl text-center text-xs text-subtle font-bold">
        No active skills were recorded or used during this fight.
      </div>
    );
  }

  return (
    <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
      <div>
        <h4 className="font-extrabold text-sm text-text flex items-center gap-2">
          <Target size={16} className="text-violet-500" />
          <span>Active Skills Usage Breakdown</span>
        </h4>
        <span className="text-xs text-subtle">
          Aggregates combat metrics for every skill active during this battle. Sort by any column to analyze.
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-subtle font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3">Skill Effect</th>
              <th
                onClick={() => handleSort('uses')}
                className="py-3 px-3 cursor-pointer hover:bg-hover hover:text-text select-none text-center"
              >
                <span className="flex items-center justify-center gap-1">
                  <span>Uses</span>
                  <ArrowUpDown size={10} />
                </span>
              </th>
              <th
                onClick={() => handleSort('totalRawDamage')}
                className="py-3 px-3 cursor-pointer hover:bg-hover hover:text-text select-none text-right"
              >
                <span className="flex items-center justify-end gap-1">
                  <Flame size={12} className="text-red-500" />
                  <span>Raw Damage</span>
                  <ArrowUpDown size={10} />
                </span>
              </th>
              <th
                onClick={() => handleSort('totalHpDamage')}
                className="py-3 px-3 cursor-pointer hover:bg-hover hover:text-text select-none text-right"
              >
                <span className="flex items-center justify-end gap-1">
                  <span>HP Damage</span>
                  <ArrowUpDown size={10} />
                </span>
              </th>
              <th
                onClick={() => handleSort('totalHealing')}
                className="py-3 px-3 cursor-pointer hover:bg-hover hover:text-text select-none text-right"
              >
                <span className="flex items-center justify-end gap-1">
                  <Heart size={12} className="text-emerald-500" />
                  <span>Healing</span>
                  <ArrowUpDown size={10} />
                </span>
              </th>
              <th
                onClick={() => handleSort('maxHit')}
                className="py-3 px-3 cursor-pointer hover:bg-hover hover:text-text select-none text-right"
              >
                <span className="flex items-center justify-end gap-1">
                  <span>Max Hit</span>
                  <ArrowUpDown size={10} />
                </span>
              </th>
              <th
                onClick={() => handleSort('crits')}
                className="py-3 px-3 cursor-pointer hover:bg-hover hover:text-text select-none text-center"
              >
                <span className="flex items-center justify-center gap-1">
                  <span>Crits</span>
                  <ArrowUpDown size={10} />
                </span>
              </th>
              <th
                onClick={() => handleSort('kills')}
                className="py-3 px-3 cursor-pointer hover:bg-hover hover:text-text select-none text-center"
              >
                <span className="flex items-center justify-center gap-1">
                  <span>Kills</span>
                  <ArrowUpDown size={10} />
                </span>
              </th>
              <th className="py-3 px-3 hidden md:table-cell">Casters</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sortedStats.map((stat) => (
              <tr key={stat.skillEffectId} className="hover:bg-hover transition-colors font-medium">
                <td className="py-3 px-3">
                  <div className="font-bold text-text">{stat.skillName}</div>
                  <span className="text-[10px] font-mono text-subtle">ID #{stat.skillEffectId}</span>
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-muted">{stat.uses}</td>
                <td className="py-3 px-3 text-right font-mono font-extrabold text-red-500">
                  {stat.totalRawDamage.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-rose-500">
                  {stat.totalHpDamage.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-500">
                  {stat.totalHealing > 0 ? stat.totalHealing.toLocaleString() : '—'}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-text">
                  {stat.maxHit > 0 ? stat.maxHit.toLocaleString() : '—'}
                </td>
                <td className="py-3 px-3 text-center font-mono font-semibold">
                  {stat.crits > 0 ? (
                    <span className="text-amber-500">
                      {stat.crits}{' '}
                      <span className="text-[10px] text-subtle">
                        ({Math.round((stat.crits / Math.max(1, stat.uses)) * 100)}%)
                      </span>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-3 px-3 text-center font-mono font-extrabold text-violet-600 dark:text-violet-400">
                  {stat.kills > 0 ? stat.kills : '—'}
                </td>
                <td className="py-3 px-3 text-subtle text-[10px] hidden md:table-cell max-w-xs truncate font-bold">
                  {Array.from(stat.casters).join(', ') || 'Residual / Unresolved'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
