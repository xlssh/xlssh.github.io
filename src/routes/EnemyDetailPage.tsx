import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadEnemies, loadEnemyArmies } from '../data/loaders';
import { Enemy, EnemyArmy } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getProfessionLabel } from '../data/relationships';
import { getQualityLabel, getQualityColorClass } from '../utils/quality';
import { Shield, Swords, Info, Trophy, HelpCircle } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import { DetailPageWrapper } from '../components/DetailPageWrapper';

export const EnemyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data, loading, error, refetch } = useAsyncData(async () => {
    const enemyId = parseInt(id || '');

    const [enemiesRes, armiesRes] = await Promise.all([
      loadEnemies(),
      loadEnemyArmies()
    ]);

    const enemyMatch = enemiesRes.rows.find(e => e.id === enemyId);
    if (!enemyMatch) {
      throw new Error(`Enemy with ID ${id} not found in encyclopedia.`);
    }

    // Find all armies that contain this enemy ID
    const associatedArmies = armiesRes.rows.filter(army => {
      const front = Array.isArray(army.front) ? army.front : [];
      const middle = Array.isArray(army.middle) ? army.middle : [];
      const back = Array.isArray(army.back) ? army.back : [];
      return front.includes(enemyId) || middle.includes(enemyId) || back.includes(enemyId);
    });

    return {
      enemy: enemyMatch,
      armies: associatedArmies
    };
  }, [id]);

  const enemy = data?.enemy;
  const armies = data?.armies || [];

  if (loading) return <LoadingState message="Decoding enemy structural stats and combat matrices..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!enemy) return <ErrorState message="Enemy not found." onRetry={refetch} />;

  return (
    <DetailPageWrapper
      backTo="/tools/enemy-codex"
      backLabel="Back to Enemy Codex"
      relatedLinks={[
        { label: 'All Combat Stages', to: '/stages', description: 'See where armies are stationed' },
        { label: 'Farming Planner', to: '/articles/farming', description: 'Track stage reward drops' },
        { label: 'Heroes Directory', to: '/heroes', description: 'Compare with ally character classes' },
      ]}
      rawData={enemy}
      rawTitle={`Raw JSON Database Entry: Enemy #${enemy.id}`}
    >
      {/* Hero Header panel */}
      <div className="p-6 md:p-8 border border-border bg-surface rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-4 w-full">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs text-muted font-bold bg-bg px-2 py-0.5 rounded">
              ID: {enemy.id}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getQualityColorClass(enemy.quality)}`}>
              {getQualityLabel(enemy.quality)}
            </span>
            {enemy.is_boss ? (
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-red-150 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200/25">
                Boss Entity
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-surface-raised text-muted border border-border">
                Standard Mob
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-black text-text flex items-center gap-2">
              <Swords className="text-violet-500 w-8 h-8" />
              <span>{enemy.name || `Enemy #${enemy.id}`}</span>
            </h1>
            <p className="text-sm font-semibold text-brand">{getProfessionLabel(enemy.profession)} archetype</p>
          </div>

          {enemy.effects && (
            <div className="space-y-1.5 p-4 rounded-xl bg-bg/40 border border-border/50">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-subtle">Combat Status Effects</span>
              <p className="text-sm text-muted dark:text-subtle leading-relaxed italic">
                "{enemy.effects}"
              </p>
            </div>
          )}
        </div>

        {/* Identity specs card */}
        <div className="w-full md:w-64 border border-border rounded-xl p-4 bg-bg/50 space-y-3 shrink-0 text-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-subtle border-b border-border pb-1.5">Core Attributes</h4>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2">
            <div>
              <span className="text-subtle block mb-0.5 font-semibold">Enemy Level</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">Lv. {enemy.level || 1}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5 font-semibold">Max HP</span>
              <span className="font-mono text-text font-bold">{(enemy.hp || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5 font-semibold font-mono">Combat Speed</span>
              <span className="font-mono text-muted">{enemy.speed || 0}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5 font-semibold">Initial Anger</span>
              <span className="font-mono text-muted">{enemy.anger || 0}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5 font-semibold">Gender Code</span>
              <span className="font-semibold text-muted">{enemy.sex === 1 ? 'Male' : enemy.sex === 2 ? 'Female' : 'N/A'}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5 font-semibold">Category Type</span>
              <span className="font-semibold text-muted">Type #{enemy.type}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Attacks, Defenses & Combat matrices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Defense stats block */}
        <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
            <Shield size={18} className="text-brand" />
            <span>Defensive Rating Multipliers</span>
          </h3>
          {enemy.defenses && typeof enemy.defenses === 'object' ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              {Object.entries(enemy.defenses).map(([key, val]: any) => (
                <div key={key} className="p-2.5 bg-bg/40 border border-border rounded-lg flex justify-between items-center">
                  <span className="font-medium text-subtle capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-mono font-bold text-text">{val}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-subtle italic py-2">No defensive adjustments specified.</p>
          )}
        </div>

        {/* Combat Rates adjustments block */}
        <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
            <Info size={18} className="text-violet-500" />
            <span>Combat Modifier Coefficients</span>
          </h3>
          {enemy.rates && typeof enemy.rates === 'object' ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              {Object.entries(enemy.rates).map(([key, val]: any) => (
                <div key={key} className="p-2.5 bg-bg/40 border border-border rounded-lg flex justify-between items-center">
                  <span className="font-medium text-subtle capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-mono font-bold text-violet-600 dark:text-violet-400">+{val}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-subtle italic py-2">No rate multipliers found.</p>
          )}
        </div>
      </div>

      {/* Associated Formations */}
      <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
          <Trophy size={18} className="text-amber-500" />
          <span>Spotted in Enemy Formations</span>
        </h3>
        {armies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {armies.map((army) => (
              <div key={army.id} className="p-3 border border-border bg-bg/30 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-text">{army.name || `Formation #${army.id}`}</span>
                  <span className="block text-[10px] text-subtle mt-0.5">Leader ID: #{army.leader_id} | Award ID: #{army.award_id}</span>
                </div>
                <span className="font-mono bg-surface border border-border px-2 py-0.5 rounded text-subtle">
                  Army #{army.id}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-subtle italic py-2 flex items-center gap-1.5">
            <HelpCircle size={14} />
            <span>This enemy is not cataloged in any static field army configurations.</span>
          </div>
        )}
      </div>
    </DetailPageWrapper>
  );
};
