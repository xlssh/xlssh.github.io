import React from 'react';
import { Skull, TrendingUp, Shield, Heart, Zap } from 'lucide-react';
import { KeyMoment } from '../../utils/fight-report/simulation';

interface KeyMomentsPanelProps {
  moments: KeyMoment[];
  onJumpToMoment: (moment: KeyMoment) => void;
}

export const KeyMomentsPanel: React.FC<KeyMomentsPanelProps> = ({ moments, onJumpToMoment }) => {
  const getIcon = (type: KeyMoment['type']) => {
    switch (type) {
      case 'death':
        return <Skull size={14} className="text-rose-500" />;
      case 'hit':
        return <Zap size={14} className="text-amber-500" />;
      case 'heal':
        return <Heart size={14} className="text-emerald-500" />;
      case 'shield':
        return <Shield size={14} className="text-blue-500" />;
      case 'turningPoint':
        return <TrendingUp size={14} className="text-indigo-500" />;
      default:
        return <Zap size={14} className="text-violet-500" />;
    }
  };

  const getColorClasses = (type: KeyMoment['type']) => {
    switch (type) {
      case 'death':
        return 'bg-rose-500/5 border-rose-500/10 hover:border-rose-500/30 text-rose-800 dark:text-rose-400';
      case 'hit':
        return 'bg-amber-500/5 border-amber-500/10 hover:border-amber-500/30 text-amber-800 dark:text-amber-400';
      case 'heal':
        return 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30 text-emerald-800 dark:text-emerald-400';
      case 'shield':
        return 'bg-blue-500/5 border-blue-500/10 hover:border-blue-500/30 text-blue-800 dark:text-blue-400';
      case 'turningPoint':
        return 'bg-indigo-500/5 border-indigo-500/10 hover:border-indigo-500/30 text-indigo-800 dark:text-indigo-400';
      default:
        return 'bg-violet-500/5 border-violet-500/10 hover:border-violet-500/30 text-violet-800 dark:text-violet-400';
    }
  };

  if (moments.length === 0) return null;

  return (
    <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-2.5">
        <Zap size={16} className="text-violet-500" />
        <span className="font-extrabold text-xs uppercase text-subtle tracking-wider">
          Match Intelligence Highlights
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {moments.map((moment) => (
          <button
            key={moment.id}
            onClick={() => onJumpToMoment(moment)}
            className={`p-3.5 border rounded-xl text-left transition-all cursor-pointer group flex items-start gap-3 relative overflow-hidden ${getColorClasses(
              moment.type
            )}`}
          >
            {/* Round badge indicator */}
            <span className="absolute top-2.5 right-3 px-2 py-0.5 rounded-md bg-bg border border-border text-[9px] font-mono font-bold text-muted group-hover:bg-hover">
              R{moment.round}
            </span>

            {/* Icon wrapper */}
            <div className="p-2 rounded-lg bg-bg border border-border/80 shrink-0 mt-0.5">
              {getIcon(moment.type)}
            </div>

            {/* Description content */}
            <div className="space-y-1 pr-6">
              <span className="font-black text-xs block text-text select-none">
                {moment.title}
              </span>
              <p className="text-[11px] text-muted leading-relaxed font-semibold">
                {moment.description}
              </p>
              <span className="text-[9px] text-violet-600 dark:text-violet-400 font-bold group-hover:underline block pt-1 select-none">
                Jump to Turn Replay &rarr;
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
