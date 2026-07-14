export const getQualityLabel = (quality: number | null): string => {
  if (quality === null) return 'Unknown';
  switch (quality) {
    case 1: return 'White (C)';
    case 2: return 'Green (B)';
    case 3: return 'Blue (A)';
    case 4: return 'Purple (S)';
    case 5: return 'Orange (SS)';
    case 6: return 'Red (SSS)';
    case 7: return 'Golden (UR)';
    default: return `Quality ${quality}`;
  }
};

export const getQualityColorClass = (quality: number | null): string => {
  if (quality === null) return 'bg-surface text-muted';
  switch (quality) {
    case 1: return 'bg-bg text-text dark:bg-surface dark:text-zinc-200 border border-border/20';
    case 2: return 'bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-400 border border-green-200/30';
    case 3: return 'bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/30';
    case 4: return 'bg-purple-100 text-purple-900 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/30';
    case 5: return 'bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/30';
    case 6: return 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-400 border border-red-200/30';
    case 7: return 'bg-yellow-100 text-yellow-950 dark:bg-yellow-950/40 dark:text-yellow-300 border border-yellow-200/30';
    default: return 'bg-surface text-muted';
  }
};
