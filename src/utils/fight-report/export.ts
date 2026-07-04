import { FighterRuntimeState, SimulationResult } from './simulation';
import { FightReportData } from './parser';

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export function downloadCsv(
  report: FightReportData,
  finalState: Map<string, FighterRuntimeState>,
  filename: string
): void {
  const headers = [
    "Camp",
    "Team",
    "Position",
    "Name",
    "Role ID",
    "Level",
    "Final HP",
    "Max HP",
    "Final HP %",
    "Final Shield",
    "Final Anger",
    "Damage Dealt Raw",
    "HP Damage Dealt",
    "Damage Taken Raw",
    "HP Damage Taken",
    "Shield Applied",
    "Shield Absorbed",
    "Healing Done",
    "Healing Received",
    "Dead"
  ];

  const rows: string[][] = [headers];

  const extractRows = (camp: number, roles: any[]) => {
    roles.forEach(role => {
      const fState = finalState.get(`${camp}_${role.pos}`);
      if (!fState) return;

      const hpPercent = fState.maxHp > 0 ? (fState.hp / fState.maxHp) * 100 : 0;

      rows.push([
        camp.toString(),
        camp === 0 ? "Attacker" : "Defender",
        role.pos.toString(),
        fState.name.replace(/,/g, " "), // strip commas
        fState.roleId.toString(),
        role.level.toString(),
        fState.hp.toString(),
        fState.maxHp.toString(),
        hpPercent.toFixed(1) + "%",
        fState.shield.toString(),
        fState.anger.toString(),
        fState.damageDealtRaw.toString(),
        fState.hpDamageDealt.toString(),
        fState.damageTakenRaw.toString(),
        fState.hpDamageTaken.toString(),
        fState.shieldApplied.toString(),
        fState.shieldAbsorbed.toString(),
        fState.healingDone.toString(),
        fState.healingReceived.toString(),
        fState.dead ? "Yes" : "No"
      ]);
    });
  };

  extractRows(0, report.team1.roles);
  extractRows(1, report.team2.roles);

  const csvContent = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export function generateSummaryText(
  report: FightReportData,
  simResult: SimulationResult
): string {
  const t1Name = report.team1.roles[0] ? report.team1.roles[0].name : "Team 1";
  const t2Name = report.team2.roles[0] ? report.team2.roles[0].name : "Team 2";

  const winnerStr = simResult.winnerCamp === null
    ? 'Draw / Undetermined'
    : simResult.winnerCamp === 0
      ? `Team 1 (Attacker)`
      : `Team 2 (Defender)`;

  const topDmg = simResult.awards.topDamage;
  const topHeal = simResult.awards.topHealer;
  const topTank = simResult.awards.topTank;

  let summary = `⚔️ Fight Report Summary ⚔️\n\n`;
  summary += `Match: ${t1Name} vs ${t2Name}\n`;
  summary += `Winner: ${winnerStr}\n`;
  summary += `Turns: ${report.totalTurns}\n\n`;

  summary += `📈 Team Totals:\n`;
  summary += `Team 1 (Attacker) Damage: ${simResult.teamTotals.rawDamageDealt[0].toLocaleString()} (HP Dmg: ${simResult.teamTotals.hpDamageDealt[0].toLocaleString()})\n`;
  summary += `Team 2 (Defender) Damage: ${simResult.teamTotals.rawDamageDealt[1].toLocaleString()} (HP Dmg: ${simResult.teamTotals.hpDamageDealt[1].toLocaleString()})\n`;
  summary += `Team 1 Healing: ${simResult.teamTotals.healingDone[0].toLocaleString()}\n`;
  summary += `Team 2 Healing: ${simResult.teamTotals.healingDone[1].toLocaleString()}\n\n`;

  summary += `🏆 Awards:\n`;
  if (topDmg) summary += `👑 Top Damage: ${topDmg.heroName} (Team ${topDmg.camp + 1}) — ${topDmg.value.toLocaleString()}\n`;
  if (topHeal) summary += `💚 Top Healer: ${topHeal.heroName} (Team ${topHeal.camp + 1}) — ${topHeal.value.toLocaleString()}\n`;
  if (topTank) summary += `🛡️ Damage Sponge: ${topTank.heroName} (Team ${topTank.camp + 1}) — ${topTank.value.toLocaleString()}\n`;

  if (simResult.deaths.length > 0) {
    const firstDef = simResult.deaths[0];
    summary += `🩸 First Death: Round ${firstDef.round} — ${firstDef.victimName} (defeated by ${firstDef.attackerName})\n`;
  }

  const bigMoment = simResult.keyMoments.find(m => m.type === 'hit');
  if (bigMoment) {
    summary += `💥 Biggest Hit: Round ${bigMoment.round} — ${bigMoment.value?.toLocaleString()} damage by ${bigMoment.fighterName}\n`;
  }

  summary += `\nGenerated via Combat Fight Report Analyzer`;
  return summary;
}
