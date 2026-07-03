import React, { useEffect, useState, useMemo } from 'react';
import { loadBeauty, loadBeautifulClothes, loadArticles } from '../data/loaders';
import { Beauty, BeautifulClothes, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Sparkles, Heart, Gift, Award, Calendar, HelpCircle, CheckCircle2 } from 'lucide-react';

export const WardrobePage: React.FC = () => {
  const [beauties, setBeauties] = useState<Beauty[]>([]);
  const [clothes, setClothes] = useState<BeautifulClothes[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBeautyId, setSelectedBeautyId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [beautyRes, clothesRes, articlesRes] = await Promise.all([
        loadBeauty(),
        loadBeautifulClothes(),
        loadArticles()
      ]);
      setBeauties(beautyRes.rows);
      setClothes(clothesRes.rows);
      setArticles(articlesRes.rows);

      if (beautyRes.rows.length > 0) {
        setSelectedBeautyId(beautyRes.rows[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load Gotei 13 Wardrobe databases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const articlesMap = useMemo(() => {
    const map = new Map<number, string>();
    articles.forEach(a => {
      map.set(a.id, a.name || `Item #${a.id}`);
    });
    return map;
  }, [articles]);

  const selectedBeauty = useMemo(() => {
    return beauties.find(b => b.id === selectedBeautyId) || null;
  }, [beauties, selectedBeautyId]);

  const selectedBeautyStages = useMemo(() => {
    if (!selectedBeauty) return [];
    return selectedBeauty.clothes_id.map(cid => {
      const match = clothes.find(c => c.id === cid);
      return match || {
        id: cid,
        factor: 0,
        scores: [[0, 0, 0]],
        question: "Unknown Dialogue Stage",
        answers: []
      };
    });
  }, [selectedBeauty, clothes]);

  if (loading) return <LoadingState message="Cataloging designer kimonos, seasonal outfits, and intimacy dialogues..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-2xl border border-border bg-surface shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
            <Sparkles size={24} />
            <span className="text-xs font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-950/40 px-2.5 py-0.5 rounded">Gotei 13 Dress-Up Contest</span>
          </div>
          <h1 className="text-3xl font-black text-text">Fashion Wardrobe & Date Simulator</h1>
          <p className="text-xs text-muted max-w-xl">
            Simulate beauty dressing rooms, audit rewards, and solve dating dialogue trees. Select a model to reveal the correct conversation choices to maximize intimacy scores.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left: Beauty Roster */}
        <div className="xl:col-span-1 border border-border bg-surface p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-text border-b border-border pb-2.5">
            Select Fashion Model
          </h3>
          <div className="space-y-2">
            {beauties.map((beauty) => (
              <button
                key={beauty.id}
                onClick={() => setSelectedBeautyId(beauty.id)}
                className={`w-full p-4 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                  selectedBeautyId === beauty.id
                    ? 'border-violet-500 bg-violet-500/5 text-violet-900 dark:text-violet-400 font-bold'
                    : 'border-border hover:border-border-strong hover:bg-hover/50 text-muted'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-bold">{beauty.name}</span>
                  <span className="text-[10px] font-mono text-subtle">ID: {beauty.id}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-subtle font-mono">
                  <Calendar size={12} />
                  <span>Unlocks Server Day {beauty.day}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Dialogue Oracle / Wardrobe Stage Simulator */}
        <div className="xl:col-span-3 space-y-6">
          {selectedBeauty && (
            <div className="space-y-6">
              {/* Model Info Card */}
              <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-subtle uppercase tracking-widest block">ACTIVE MODEL PROFILE</span>
                    <h2 className="text-2xl font-black text-text">{selectedBeauty.name}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-400 text-xs font-black uppercase">
                      Day {selectedBeauty.day} Unlock
                    </span>
                  </div>
                </div>

                {/* Passive Attributes Rewards */}
                <div className="p-4 bg-bg rounded-xl border border-border border-border space-y-3">
                  <div className="flex items-center gap-2 text-rose-500 font-bold text-xs">
                    <Award size={16} />
                    <span>Permanent Collection Stat Rewards</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {selectedBeauty.rewards.map((rew, idx) => (
                      <div key={idx} className="bg-surface px-3 py-2 rounded-lg border border-border/80 flex items-center justify-between">
                        <span className="text-subtle font-semibold">Reward Code: {rew.code}</span>
                        <span className="font-mono font-bold text-text dark:text-zinc-250">Reward Type: #{rew.type}</span>
                      </div>
                    ))}
                    {selectedBeauty.rewards.length === 0 && (
                      <span className="text-subtle italic">No static rewards defined.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dating Dialogue & Intimacy Choices Oracle */}
              <div className="space-y-4">
                <h3 className="font-extrabold text-base text-text flex items-center gap-2 px-1">
                  <Heart className="text-rose-500" size={18} />
                  <span>Dating Chapters Dialogue Oracle</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedBeautyStages.map((stage, idx) => {
                    const maxScoreIndex = stage.scores[0] ? stage.scores[0].indexOf(Math.max(...stage.scores[0])) : -1;
                    return (
                      <div
                        key={stage.id}
                        className="p-5 border border-border bg-surface rounded-2xl shadow-sm flex flex-col justify-between space-y-4 hover:border-border-strong transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between w-full border-b border-border pb-2">
                            <span className="font-bold text-xs text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                              Stage #{idx + 1}
                            </span>
                            <span className="font-mono text-[9px] text-subtle">ID: {stage.id}</span>
                          </div>
                          
                          {/* Question */}
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-subtle block">Dialogue Trigger / Prompt</span>
                            <p className="text-sm font-semibold text-text">
                              {stage.question === "0" ? "Standard Outfit Fitting / Greetings" : stage.question}
                            </p>
                          </div>
                        </div>

                        {/* Choices */}
                        {stage.answers.length > 0 ? (
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold text-subtle block">Answers & Intimacy Gain</span>
                            <div className="space-y-1.5 text-xs">
                              {stage.answers.map((answer, ansIdx) => {
                                const score = stage.scores[0]?.[ansIdx] ?? 0;
                                const isBest = ansIdx === maxScoreIndex;
                                return (
                                  <div
                                    key={ansIdx}
                                    className={`p-2 rounded-lg border transition-all flex items-center justify-between ${
                                      isBest
                                        ? 'border-emerald-300 dark:border-emerald-950 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-400 font-semibold'
                                        : 'border-border/60 text-muted'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      {isBest ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> : <HelpCircle size={14} className="text-subtle shrink-0" />}
                                      <span className="truncate">{answer.replace(/^\d+:/, '')}</span>
                                    </div>
                                    <span className={`font-mono text-xs font-bold shrink-0 ${isBest ? 'text-emerald-600 dark:text-emerald-400' : 'text-subtle'}`}>
                                      +{score} Pts
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-bg rounded-xl border border-border border-border text-xs text-subtle italic text-center">
                            Cosmetic dressing stage. Unlocks dating chapter.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
