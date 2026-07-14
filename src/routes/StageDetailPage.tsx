import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadStages, loadArticles } from '../data/loaders';
import { Stage, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Swords, Award, AlertCircle } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import { DetailPageWrapper } from '../components/DetailPageWrapper';

export const StageDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data, loading, error, refetch } = useAsyncData(async () => {
    const stageId = parseInt(id || '');

    const [stagesRes, articlesRes] = await Promise.all([
      loadStages(),
      loadArticles()
    ]);

    const match = stagesRes.rows.find(s => s.id === stageId);
    if (!match) {
      throw new Error(`Stage with ID ${id} not found in database.`);
    }

    return {
      stage: match,
      articles: articlesRes.rows
    };
  }, [id]);

  const stage = data?.stage;
  const articles = data?.articles || [];

  const awardList = useMemo<Article[]>(() => {
    if (!stage || !stage.award_json || !Array.isArray(stage.award_json.award)) return [];
    const awardsArray: number[] = stage.award_json.award;
    return awardsArray
      .map(awardId => articles.find(art => art.id === awardId))
      .filter(Boolean) as Article[];
  }, [stage, articles]);

  if (loading) return <LoadingState message="Downloading stage loot registry and boundary coordinates..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!stage) return <ErrorState message="Stage not found." onRetry={refetch} />;

  return (
    <DetailPageWrapper
      backTo="/stages"
      backLabel="Back to Stages"
      relatedLinks={[
        { label: 'All Stages', to: '/stages', description: 'Browse all combat stages' },
        { label: 'Campaign Roadmap', to: '/tools/campaign-roadmap', description: 'Campaign progression plan' },
        { label: 'Loot Table Oracle', to: '/tools/loot-oracle', description: 'Drop rate analysis' },
        { label: 'Farming Planner', to: '/articles/farming', description: 'Plan your farming routes' },
      ]}
      rawData={stage}
      rawTitle={`Raw JSON Database Entry: Stage #${stage.id}`}
    >
      {/* Main Stage Panel */}
      <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-subtle font-bold bg-bg px-2 py-0.5 rounded">
              ID: {stage.id}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              stage.hard === 'Easy'
                ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400'
                : 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400'
            }`}>
              {stage.hard || 'Easy'} Mode Instance
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-text flex items-center gap-2">
            <Swords size={28} className="text-violet-500" />
            <span>{stage.name || `Stage #${stage.id}`}</span>
          </h1>

          {stage.desc && (
            <div className="p-4 rounded-xl bg-bg/40 border border-border">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-subtle">Combat Scenario Briefing</span>
              <p className="mt-1 text-sm text-muted dark:text-subtle leading-relaxed italic">
                "{stage.desc}"
              </p>
            </div>
          )}
        </div>

        {/* Map Coordinates block */}
        <div className="w-full md:w-64 border border-border rounded-xl p-4 bg-bg/50 space-y-3 shrink-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-subtle border-b border-border pb-1.5">Instance Coordinates</h4>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
            <div>
              <span className="text-subtle block mb-0.5 font-sans font-semibold">Recommended Level</span>
              <span className="font-bold text-indigo-600 font-mono">Lv. {stage.level || 1}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5 font-sans font-semibold">Background Canvas ID</span>
              <span className="font-mono text-muted font-semibold">{stage.big_image || 'None'}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5 font-sans font-semibold">Starting Node ID</span>
              <span className="font-mono text-muted font-semibold">#{stage.start_id || 0}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5 font-sans font-semibold">Finishing Node ID</span>
              <span className="font-mono text-muted font-semibold">#{stage.end_id || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loot clear drop awards */}
      <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
          <Award size={18} className="text-violet-500" />
          <span>Stage Clear Drop Registry</span>
        </h3>

        {awardList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {awardList.map((item) => (
              <Link
                key={item.id}
                to={`/articles/${item.id}`}
                className="p-3 border border-border/80 bg-bg/20 hover:border-violet-500/50 hover:shadow-sm rounded-lg flex items-center justify-between text-sm transition-all"
              >
                <div>
                  <span className="font-bold text-text hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                    {item.name}
                  </span>
                  <span className="block text-[10px] text-subtle">ID: {item.id} | Level {item.level ?? 0}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-raised text-[9px] text-muted font-mono">
                  View Specs
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-sm text-subtle italic py-2 flex items-center gap-1.5">
            <AlertCircle size={14} />
            <span>No clear award drop indexes registered for this instance.</span>
          </div>
        )}
      </div>
    </DetailPageWrapper>
  );
};
