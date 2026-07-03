import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadDailyQuests, loadArticles } from '../data/loaders';
import { DailyQuest, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { RewardList } from '../components/RewardList';
import { JsonViewer } from '../components/JsonViewer';
import { ArrowLeft, Award, ShieldAlert, Target } from 'lucide-react';

export const DailyQuestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quest, setQuest] = useState<DailyQuest | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);

  const fetchQuestDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const questId = parseInt(id || '');

      const [questsRes, articlesRes] = await Promise.all([
        loadDailyQuests(),
        loadArticles()
      ]);

      const match = questsRes.rows.find(q => q.id === questId);
      if (match) {
        setQuest(match);
        setArticles(articlesRes.rows);
      } else {
        setError(`Daily Quest with ID ${id} not found in database.`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load daily quest details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestDetails();
  }, [id]);

  if (loading) return <LoadingState message="Downloading daily activity transcripts and milestones..." />;
  if (error) return <ErrorState message={error} onRetry={fetchQuestDetails} />;
  if (!quest) return <ErrorState message="Quest not found." onRetry={fetchQuestDetails} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <div>
        <Link
          to="/daily-quests"
          className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-text dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Daily Quests</span>
        </Link>
      </div>

      {/* Main Quest Spec sheet */}
      <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-subtle font-bold bg-bg px-2 py-0.5 rounded">
              ID: {quest.id}
            </span>
            <span className="px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 text-xs font-bold uppercase tracking-wider">
              Daily Activity Assignment
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-text">
            {quest.task_name || `Daily Task #${quest.id}`}
          </h1>

          {quest.description && (
            <div className="p-4 rounded-xl bg-bg/40 border border-border">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-subtle">Quest Briefing Instructions</span>
              <p className="mt-1 text-sm text-muted dark:text-subtle leading-relaxed font-semibold italic">
                "{quest.description}"
              </p>
            </div>
          )}

          {/* Execution Criteria Parameters */}
          {quest.instant_json && (
            <div className="p-4 rounded-xl border border-border/80 bg-bg/30 dark:bg-bg/10 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-subtle flex items-center gap-1">
                <Target size={14} className="text-orange-500" />
                <span>Completion Target Parameters</span>
              </span>
              <div className="bg-surface border border-border p-3 rounded-lg flex flex-wrap items-center gap-6 text-xs md:text-sm">
                <div>
                  <span className="text-subtle block mb-0.5 font-semibold">Target Action type</span>
                  <span className="font-mono font-bold text-text dark:text-zinc-200">
                    {Array.isArray(quest.instant_json) ? quest.instant_json[0] : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-subtle block mb-0.5 font-semibold">Required Execution Count</span>
                  <span className="font-mono font-bold text-text dark:text-zinc-200">
                    {Array.isArray(quest.instant_json) ? quest.instant_json[1] : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quest Properties block */}
        <div className="w-full md:w-64 border border-border rounded-xl p-4 bg-bg/50 space-y-3 shrink-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-subtle border-b border-border pb-1.5">Task Properties</h4>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
            <div>
              <span className="text-subtle block mb-0.5">Task Type</span>
              <span className="font-semibold text-muted">Type {quest.type}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Event Type</span>
              <span className="font-semibold text-muted">Action {quest.event_type}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Activity Points</span>
              <span className="font-bold text-emerald-600 font-mono">+{quest.point ?? 0}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Weight Rate</span>
              <span className="font-semibold text-muted font-mono">{quest.rate ?? 1}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Allow Cancel</span>
              <span className="font-semibold text-muted">{quest.cancel === 1 ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Instant Teleport</span>
              <span className="font-semibold text-muted">{quest.isgoto === 1 ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards panel */}
      <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
          <Award size={18} className="text-violet-500" />
          <span>Clear Reward Package</span>
        </h3>
        <RewardList rewardsJson={quest.rewards_json} articles={articles} />
      </div>

      {/* Mechanics parameters */}
      <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
          <ShieldAlert size={18} className="text-amber-500" />
          <span>System Mechanics & Unlock Conditions</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Pre-requisite Complete ID</span>
            <span className="font-semibold text-muted">ID #{quest.complete ?? 0}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5 font-sans font-semibold">Small Sprite ID</span>
            <span className="font-semibold text-muted">Sprite #{quest.small_picture ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Raw entry */}
      <JsonViewer data={quest} title={`Raw JSON Database Entry: DailyQuest #${quest.id}`} />
    </div>
  );
};
