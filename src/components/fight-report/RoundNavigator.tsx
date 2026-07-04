import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Hash } from 'lucide-react';

export interface TurnHighlight {
  hasDeath: boolean;
  hasCrit: boolean;
  hasShield: boolean;
}

interface RoundNavigatorProps {
  totalTurns: number;
  currentTurn: number;
  onChangeTurn: (turn: number) => void;
  highlights?: Map<number, TurnHighlight>;
  isReplayTabActive: boolean;
}

export const RoundNavigator: React.FC<RoundNavigatorProps> = ({
  totalTurns,
  currentTurn,
  onChangeTurn,
  highlights,
  isReplayTabActive,
}) => {
  const [jumpInput, setJumpInput] = useState('');

  // Keyboard navigation support when replay tab is active
  useEffect(() => {
    if (!isReplayTabActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling the page on arrow keys when active
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onChangeTurn(Math.min(totalTurns, currentTurn + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onChangeTurn(Math.max(1, currentTurn - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReplayTabActive, currentTurn, totalTurns, onChangeTurn]);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(jumpInput);
    if (!isNaN(val) && val >= 1 && val <= totalTurns) {
      onChangeTurn(val);
      setJumpInput('');
    }
  };

  const turnsArray = Array.from({ length: totalTurns }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile-only selector */}
      <div className="block sm:hidden w-full">
        <label className="text-[10px] font-bold text-subtle uppercase tracking-wider block mb-1">
          Select Round
        </label>
        <select
          value={currentTurn}
          onChange={(e) => onChangeTurn(Number(e.target.value))}
          className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text font-bold focus:outline-none focus:ring-1.5 focus:ring-violet-500"
        >
          {turnsArray.map((turn) => {
            const h = highlights?.get(turn);
            const extra = h?.hasDeath ? ' 💀' : h?.hasCrit ? ' 💥' : '';
            return (
              <option key={turn} value={turn}>
                Round {turn}{extra}
              </option>
            );
          })}
        </select>
      </div>

      {/* Main navigator panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-border bg-surface rounded-2xl shadow-sm">
        {/* Step buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChangeTurn(Math.max(1, currentTurn - 1))}
            disabled={currentTurn === 1}
            className="p-1.5 rounded-lg border border-border hover:bg-hover disabled:opacity-30 disabled:hover:bg-transparent text-text cursor-pointer transition-all"
            title="Previous Round (ArrowLeft)"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-black px-2.5 text-text select-none">
            Round {currentTurn} / {totalTurns}
          </span>
          <button
            onClick={() => onChangeTurn(Math.min(totalTurns, currentTurn + 1))}
            disabled={currentTurn === totalTurns}
            className="p-1.5 rounded-lg border border-border hover:bg-hover disabled:opacity-30 disabled:hover:bg-transparent text-text cursor-pointer transition-all"
            title="Next Round (ArrowRight)"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Desktop jump input */}
        <form onSubmit={handleJumpSubmit} className="hidden md:flex items-center gap-2">
          <div className="relative">
            <Hash size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              placeholder="Round No."
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              className="w-24 pl-7 pr-2.5 py-1.5 text-xs rounded-lg border border-border bg-bg text-text focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-zinc-400 font-bold"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors shadow-sm"
          >
            Jump
          </button>
        </form>
      </div>

      {/* Grid selector with dots indicator (for desktop/tablet) */}
      <div className="hidden sm:grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 max-h-56 overflow-y-auto p-1">
        {turnsArray.map((turn) => {
          const isSelected = currentTurn === turn;
          const h = highlights?.get(turn);

          return (
            <button
              key={turn}
              onClick={() => onChangeTurn(turn)}
              className={`py-2 px-1 relative rounded-xl border text-xs font-black text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-12 ${
                isSelected
                  ? 'border-violet-500 bg-violet-500/5 text-violet-700 dark:text-violet-400 shadow-sm'
                  : 'border-border text-muted hover:bg-hover'
              }`}
            >
              <span>R{turn}</span>
              {/* Highlight indicators */}
              <div className="flex gap-1 mt-1 absolute bottom-1.5">
                {h?.hasDeath && (
                  <span className="w-1 h-1 rounded-full bg-rose-500" title="Death in Round" />
                )}
                {h?.hasCrit && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Crit in Round" />
                )}
                {h?.hasShield && (
                  <span className="w-1 h-1 rounded-full bg-blue-500" title="Shield deployed" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
