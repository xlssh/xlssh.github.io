import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadStoryQuests, loadArticles } from '../data/loaders';
import { StoryQuest, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { RewardList } from '../components/RewardList';
import { MessageSquare, Compass, ShieldAlert, Award } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import { DetailPageWrapper } from '../components/DetailPageWrapper';

export const StoryQuestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data, loading, error, refetch } = useAsyncData(async () => {
    const questId = parseInt(id || '');

    const [questsRes, articlesRes] = await Promise.all([
      loadStoryQuests(),
      loadArticles()
    ]);

    const match = questsRes.rows.find(q => q.id === questId);
    if (!match) {
      throw new Error(`Story Quest with ID ${id} not found in database.`);
    }

    return {
      quest: match,
      articles: articlesRes.rows
    };
  }, [id]);

  const quest = data?.quest;
  const articles = data?.articles || [];

  if (loading) return <LoadingState message="Downloading quest transcripts and award configurations..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!quest) return <ErrorState message="Quest not found." onRetry={refetch} />;

  return (
    <DetailPageWrapper
      backTo="/story-quests"
      backLabel="Back to Story Quests"
      relatedLinks={[
        { label: 'Story Quests', to: '/story-quests', description: 'Browse story questlines' },
        { label: 'Quest Chain flow', to: '/story-quests/chain', description: 'View full progression chain' },
        { label: 'Daily Quests', to: '/daily-quests', description: 'Daily active list' },
      ]}
      rawData={quest}
      rawTitle={`Raw JSON Database Entry: StoryQuest #${quest.id}`}
    >
      {/* Main Quest spec panel */}
      <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-subtle font-bold bg-bg px-2 py-0.5 rounded">
              ID: {quest.id}
            </span>
            <span className="px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950/55 text-violet-700 dark:text-violet-400 text-xs font-bold uppercase tracking-wider">
              Story Campaign Quest
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-text">
            {quest.name || `Quest #${quest.id}`}
          </h1>

          {quest.description && (
            <div className="p-4 rounded-xl bg-bg/40 border border-border">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-subtle">Quest Synopsis</span>
              <p className="mt-1 text-sm text-muted dark:text-subtle leading-relaxed italic">
                "{quest.description}"
              </p>
            </div>
          )}

          {/* Guide walkthrough */}
          <div className="p-5 border border-border bg-bg/50 rounded-xl space-y-3">
            <h3 className="font-bold text-sm text-text flex items-center gap-2 border-b border-border pb-2">
              <Compass size={16} className="text-violet-500" />
              <span>SOP Navigation Walkthrough</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-subtle block mb-0.5 font-semibold">Guide Before Receipt</span>
                <span className="text-muted leading-relaxed font-medium block bg-surface p-2.5 rounded border border-border min-h-[50px]">{quest.guide_before || 'N/A'}</span>
              </div>
              <div>
                <span className="text-subtle block mb-0.5 font-semibold">Guide Active Progression</span>
                <span className="text-muted leading-relaxed font-medium block bg-surface p-2.5 rounded border border-border min-h-[50px]">{quest.guide || 'N/A'}</span>
              </div>
              <div>
                <span className="text-subtle block mb-0.5 font-semibold">Guide On Submit</span>
                <span className="text-muted leading-relaxed font-medium block bg-surface p-2.5 rounded border border-border min-h-[50px]">{quest.guide_end || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quest Properties Identity block */}
        <div className="w-full md:w-64 border border-border rounded-xl p-4 bg-bg/50 space-y-3 shrink-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-subtle border-b border-border pb-1.5">Quest Properties</h4>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
            <div>
              <span className="text-subtle block mb-0.5">Campaign Type</span>
              <span className="font-semibold text-muted">Type {quest.type}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Event Action</span>
              <span className="font-semibold text-muted">Action {quest.event_type}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Gate Required</span>
              <span className="font-semibold text-muted">Gate {quest.gate}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Target Point</span>
              <span className="font-semibold text-muted font-mono">{quest.point}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">SOP NPC Host</span>
              <span className="font-semibold text-muted">NPC #{quest.start_npc_id || 0}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Submit NPC Host</span>
              <span className="font-semibold text-muted">NPC #{quest.finish_npc_id || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards details */}
      <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
          <Award size={18} className="text-violet-500" />
          <span>Clear Reward Package</span>
        </h3>
        <RewardList rewardsJson={quest.rewards_json} articles={articles} />
      </div>

      {/* Transcripts and dialogues */}
      <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
          <MessageSquare size={18} className="text-indigo-500" />
          <span>Scripted Dialogues & Narrative transcripts</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
          {quest.talk_before && (
            <div className="p-4 rounded-xl border border-border/80 bg-bg/30 dark:bg-bg/20">
              <span className="text-[10px] uppercase font-bold text-subtle block mb-1.5">Dialogue (Quest Offer Receipt)</span>
              <p className="italic text-muted dark:text-subtle leading-relaxed font-medium">
                "{quest.talk_before}"
              </p>
            </div>
          )}
          {quest.talk_end && (
            <div className="p-4 rounded-xl border border-border/80 bg-bg/30 dark:bg-bg/20">
              <span className="text-[10px] uppercase font-bold text-subtle block mb-1.5">Dialogue (Quest Completion Submission)</span>
              <p className="italic text-muted dark:text-subtle leading-relaxed font-medium">
                "{quest.talk_end}"
              </p>
            </div>
          )}
          {!quest.talk_before && !quest.talk_end && (
            <div className="col-span-2 py-3 text-center text-xs text-subtle italic">No dialog records scripted for this quest.</div>
          )}
        </div>
      </div>

      {/* Mechanics parameters */}
      <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
          <ShieldAlert size={18} className="text-amber-500" />
          <span>Internal Progression Requirements</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Pre-requisite Quest ID</span>
            <span className="font-semibold text-muted">
              {quest.pre_task_id ? (
                <Link to={`/story-quests/${quest.pre_task_id}`} className="text-violet-600 hover:underline">
                  #{quest.pre_task_id}
                </Link>
              ) : (
                'None'
              )}
            </span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Accept Code</span>
            <span className="font-semibold text-muted">{quest.accept ?? 0}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Auto Accept Flag</span>
            <span className="font-semibold text-muted">{quest.auto_accept === 1 ? 'True' : 'False'}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Instant Teleport Code</span>
            <span className="font-semibold text-muted">{quest.instant ?? 0}</span>
          </div>
          {quest.plot && (
            <div className="col-span-2">
              <span className="text-subtle block mb-0.5 font-sans font-semibold">Plot Action Flow Sequence</span>
              <span className="bg-bg text-muted px-2.5 py-1.5 rounded border border-border block text-xs overflow-x-auto whitespace-nowrap">{quest.plot}</span>
            </div>
          )}
          {quest.complete_json && (
            <div className="col-span-2">
              <span className="text-subtle block mb-0.5 font-sans font-semibold">Required Targets Logic</span>
              <span className="bg-bg text-muted px-2.5 py-1.5 rounded border border-border block text-xs overflow-x-auto">
                {typeof quest.complete_json === 'object' ? (
                  <pre className="text-[11px] leading-tight font-sans">{JSON.stringify(quest.complete_json, null, 2)}</pre>
                ) : (
                  <span>{quest.complete_json}</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </DetailPageWrapper>
  );
};
