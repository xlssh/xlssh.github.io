import React, { useState } from 'react';
import { TurnSummary, FighterTurnSnapshot } from '../../utils/fight-report/simulation';
import { Activity, Flame, Heart } from 'lucide-react';

interface TimelineTabProps {
  turnSummaries: TurnSummary[];
  fighterTimeline: Map<string, FighterTurnSnapshot[]>;
  fighterNames: Map<string, string>;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({
  turnSummaries,
  fighterTimeline,
  fighterNames,
}) => {
  const [metricTab, setMetricTab] = useState<'hp' | 'damage' | 'healing'>('hp');
  const [selectedFighterKey, setSelectedFighterKey] = useState<string>('all');

  const totalRounds = turnSummaries.length;

  // Maximum damage and healing values in a single turn for scaling
  const maxRoundDamage = Math.max(
    1,
    ...turnSummaries.map((s) => Math.max(s.teamDamageDealt[0], s.teamDamageDealt[1]))
  );
  const maxRoundHealing = Math.max(
    1,
    ...turnSummaries.map((s) => Math.max(s.teamHealingDone[0], s.teamHealingDone[1]))
  );

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 240;
  const paddingLeft = 40;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Generate coordinates for SVG drawing
  const getCoordinates = (teamIdx: 0 | 1) => {
    // Round 0 coordinate is always 100%
    const coords: [number, number][] = [[paddingLeft, paddingTop]];

    turnSummaries.forEach((summary, idx) => {
      const x = paddingLeft + ((idx + 1) / totalRounds) * chartWidth;
      const hpPct = summary.teamHpPercent[teamIdx];
      const y = paddingTop + chartHeight - (hpPct / 100) * chartHeight;
      coords.push([x, y]);
    });

    return coords;
  };

  const getFighterCoordinates = (key: string): [number, number][] => {
    const timeline = fighterTimeline.get(key) || [];
    if (timeline.length === 0) return [];

    return timeline.map((snap) => {
      const x = paddingLeft + (snap.round / totalRounds) * chartWidth;
      const y = paddingTop + chartHeight - (snap.hpPercent / 100) * chartHeight;
      return [x, y] as [number, number];
    });
  };

  const team1Coords = getCoordinates(0);
  const team2Coords = getCoordinates(1);

  const pointsToString = (coords: [number, number][]) =>
    coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Metric selection tabs */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border pb-3">
        <div className="flex gap-2 text-xs font-bold">
          <button
            onClick={() => setMetricTab('hp')}
            className={`px-4 py-2 rounded-xl border cursor-pointer transition-all flex items-center gap-1.5 ${
              metricTab === 'hp'
                ? 'border-violet-500 bg-violet-500/5 text-violet-700 dark:text-violet-400 font-extrabold'
                : 'border-border text-muted hover:bg-hover'
            }`}
          >
            <Activity size={14} />
            <span>Health Progression</span>
          </button>
          <button
            onClick={() => setMetricTab('damage')}
            className={`px-4 py-2 rounded-xl border cursor-pointer transition-all flex items-center gap-1.5 ${
              metricTab === 'damage'
                ? 'border-red-500 bg-red-500/5 text-red-700 dark:text-red-400 font-extrabold'
                : 'border-border text-muted hover:bg-hover'
            }`}
          >
            <Flame size={14} />
            <span>Damage per Round</span>
          </button>
          <button
            onClick={() => setMetricTab('healing')}
            className={`px-4 py-2 rounded-xl border cursor-pointer transition-all flex items-center gap-1.5 ${
              metricTab === 'healing'
                ? 'border-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 font-extrabold'
                : 'border-border text-muted hover:bg-hover'
            }`}
          >
            <Heart size={14} />
            <span>Healing per Round</span>
          </button>
        </div>

        {/* Selected Fighter Filter (Only for HP progression) */}
        {metricTab === 'hp' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-subtle font-bold uppercase tracking-wider text-[10px]">
              Fighter Focus:
            </span>
            <select
              value={selectedFighterKey}
              onChange={(e) => setSelectedFighterKey(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-surface text-text font-bold focus:outline-none"
            >
              <option value="all">Team Overview</option>
              {Array.from(fighterNames.entries()).map(([key, name]) => (
                <option key={key} value={key}>
                  {key.startsWith('0_') ? 'Team 1' : 'Team 2'} — {name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Metric visual contents */}
      {metricTab === 'hp' ? (
        <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-sm text-text">Team Health Progression Over Rounds</h4>
              <span className="text-xs text-subtle">
                Visualizes total team or specific fighter remaining HP percent.
              </span>
            </div>
            {/* Chart Legend */}
            {selectedFighterKey === 'all' && (
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
                  <span className="w-3 h-0.5 bg-violet-500 block"></span>
                  <span>Team 1 (Attacker)</span>
                </span>
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <span className="w-3 h-0.5 bg-indigo-500 block"></span>
                  <span>Team 2 (Defender)</span>
                </span>
              </div>
            )}
          </div>

          {/* Pure SVG Line Chart */}
          <div className="w-full overflow-x-auto select-none">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full max-w-4xl mx-auto overflow-visible"
            >
              {/* Grid Y lines & labels */}
              {[0, 25, 50, 75, 100].map((label) => {
                const y = paddingTop + chartHeight - (label / 100) * chartHeight;
                return (
                  <g key={label} className="opacity-40">
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      className="text-border-strong dark:text-zinc-800"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="text-[9px] font-mono fill-subtle font-extrabold"
                    >
                      {label}%
                    </text>
                  </g>
                );
              })}

              {/* Grid X lines & labels */}
              {Array.from({ length: totalRounds + 1 }, (_, i) => i).map((round) => {
                const x = paddingLeft + (round / totalRounds) * chartWidth;
                return (
                  <g key={round} className="opacity-40">
                    <line
                      x1={x}
                      y1={paddingTop}
                      x2={x}
                      y2={paddingTop + chartHeight}
                      stroke="currentColor"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      className="text-border-strong dark:text-zinc-800"
                    />
                    <text
                      x={x}
                      y={paddingTop + chartHeight + 16}
                      textAnchor="middle"
                      className="text-[9px] font-mono fill-subtle font-extrabold"
                    >
                      R{round}
                    </text>
                  </g>
                );
              })}

              {/* DRAW CHANNELS OR SINGLE FOCUS */}
              {selectedFighterKey === 'all' ? (
                <>
                  {/* Team 1 Area overlay and Line */}
                  <polyline
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    points={pointsToString(team1Coords)}
                    className="transition-all"
                  />
                  {team1Coords.map(([x, y], idx) => (
                    <circle
                      key={`t1-${idx}`}
                      cx={x}
                      cy={y}
                      r={4}
                      fill="#8b5cf6"
                      stroke="#fff"
                      strokeWidth={1.5}
                      className="cursor-pointer hover:scale-125 transition-transform"
                    />
                  ))}

                  {/* Team 2 Line */}
                  <polyline
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    points={pointsToString(team2Coords)}
                    className="transition-all"
                  />
                  {team2Coords.map(([x, y], idx) => (
                    <circle
                      key={`t2-${idx}`}
                      cx={x}
                      cy={y}
                      r={4}
                      fill="#6366f1"
                      stroke="#fff"
                      strokeWidth={1.5}
                      className="cursor-pointer hover:scale-125 transition-transform"
                    />
                  ))}
                </>
              ) : (
                <>
                  {/* Selected Fighter Focus Line */}
                  {(() => {
                    const coords = getFighterCoordinates(selectedFighterKey);
                    if (coords.length === 0) return null;
                    const isCamp0 = selectedFighterKey.startsWith('0_');
                    const color = isCamp0 ? '#8b5cf6' : '#6366f1';

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke={color}
                          strokeWidth={3}
                          points={pointsToString(coords)}
                        />
                        {coords.map(([x, y], idx) => (
                          <circle
                            key={`fs-${idx}`}
                            cx={x}
                            cy={y}
                            r={4.5}
                            fill={color}
                            stroke="#fff"
                            strokeWidth={1.5}
                          />
                        ))}
                      </>
                    );
                  })()}
                </>
              )}
            </svg>
          </div>
        </div>
      ) : (
        /* Team Damage or Healing side-by-side visual bar charts */
        <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-6">
          <div>
            <h4 className="font-extrabold text-sm text-text">
              {metricTab === 'damage' ? 'Damage Output' : 'Healing Done'} per Round
            </h4>
            <span className="text-xs text-subtle">
              Compares Team 1 and Team 2 outputs across match rounds.
            </span>
          </div>

          <div className="space-y-4">
            {turnSummaries.map((summary) => {
              const val1 = metricTab === 'damage' ? summary.teamDamageDealt[0] : summary.teamHealingDone[0];
              const val2 = metricTab === 'damage' ? summary.teamDamageDealt[1] : summary.teamHealingDone[1];

              const maxLimit = metricTab === 'damage' ? maxRoundDamage : maxRoundHealing;

              const pct1 = (val1 / maxLimit) * 100;
              const pct2 = (val2 / maxLimit) * 100;

              return (
                <div key={summary.round} className="grid grid-cols-12 gap-3 items-center text-xs">
                  {/* Round number */}
                  <div className="col-span-2 md:col-span-1 font-mono font-bold text-muted select-none">
                    Round {summary.round}
                  </div>

                  {/* Dual bar graphics columns */}
                  <div className="col-span-10 md:col-span-11 space-y-2">
                    {/* Team 1 Output */}
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-[10px] font-mono text-violet-500 font-black text-right select-all">
                        {formatNumber(val1)}
                      </span>
                      <div className="flex-1 h-3 bg-bg rounded-lg overflow-hidden border border-border">
                        <div
                          className={`h-full transition-all duration-500 rounded-lg ${
                            metricTab === 'damage'
                              ? 'bg-gradient-to-r from-red-500 to-rose-500'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          }`}
                          style={{ width: `${Math.max(1, pct1)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Team 2 Output */}
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-[10px] font-mono text-indigo-500 font-black text-right select-all">
                        {formatNumber(val2)}
                      </span>
                      <div className="flex-1 h-3 bg-bg rounded-lg overflow-hidden border border-border">
                        <div
                          className={`h-full transition-all duration-500 rounded-lg ${
                            metricTab === 'damage'
                              ? 'bg-gradient-to-r from-rose-600 to-indigo-600'
                              : 'bg-gradient-to-r from-teal-500 to-cyan-500'
                          }`}
                          style={{ width: `${Math.max(1, pct2)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
