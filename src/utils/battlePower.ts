import type { Hero } from '../types/db';

// Battle Power (Fighting Power) calculation
// Source: TCharacter.GetFightingPower() → sums BaseAttributeFightingPower of deployed heroes
// BaseAttributeFightingPower per hero = STR + AGI + INT + floor(HP/10)
export function calcHeroBP(h: Hero, lv: number): number {
  const l = Math.max(1, lv);
  return (
    (h.power ?? 0) + Math.round((h.power_grow ?? 0) * (l - 1)) +
    (h.agile ?? 0) + Math.round((h.agile_grow ?? 0) * (l - 1)) +
    (h.intelligence ?? 0) + Math.round((h.intelligence_grow ?? 0) * (l - 1)) +
    Math.round(((h.life ?? 0) + Math.round((h.life_grow ?? 0) * (l - 1))) / 10)
  );
}

// Calculate total team BP (all heroes with FightPosition > 0, i.e. deployed)
export function calcTeamBP(heroes: Hero[], lv: number): number {
  return heroes.reduce((sum, h) => sum + calcHeroBP(h, lv), 0);
}

// BP breakdown for a single hero
export interface BPBreakdown {
  str: number;
  agi: number;
  int: number;
  hp: number;
  total: number;
}

export function getBPBreakdown(h: Hero, lv: number): BPBreakdown {
  const l = Math.max(1, lv);
  const str = (h.power ?? 0) + Math.round((h.power_grow ?? 0) * (l - 1));
  const agi = (h.agile ?? 0) + Math.round((h.agile_grow ?? 0) * (l - 1));
  const int_ = (h.intelligence ?? 0) + Math.round((h.intelligence_grow ?? 0) * (l - 1));
  const hp = Math.round(((h.life ?? 0) + Math.round((h.life_grow ?? 0) * (l - 1))) / 10);
  return { str, agi, int: int_, hp, total: str + agi + int_ + hp };
}

// Format BP for display
export function formatBP(bp: number): string {
  if (bp >= 1_000_000) return `${(bp / 1_000_000).toFixed(1)}M`;
  if (bp >= 1_000) return `${(bp / 1_000).toFixed(1)}K`;
  return bp.toLocaleString();
}
