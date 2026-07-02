import React, { useEffect, useState } from 'react';
import { loadAchievements, loadAchievementTitles, loadAchievementGroups, loadAchievementClasses, loadArticles } from '../data/loaders';
import { Achievement, AchievementTitle, AchievementGroup, AchievementClass, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';

export function AchievementTitlePage() {
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [titles, setTitles] = useState<AchievementTitle[]>([]);
  const [groups, setGroups] = useState<AchievementGroup[]>([]);
  const [classes, setClasses] = useState<AchievementClass[]>([]);
  const [articlesMap, setArticlesMap] = useState<Record<number, Article>>({});

  const [activeTab, setActiveTab] = useState<'achievements' | 'titles'>('achievements');
  
  // Filtering state
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      loadAchievements(),
      loadAchievementTitles(),
      loadAchievementGroups(),
      loadAchievementClasses(),
      loadArticles()
    ]).then(([achRes, titleRes, groupRes, classRes, articlesRes]) => {
      setAchievements(achRes.rows);
      setTitles(titleRes.rows);
      setGroups(groupRes.rows);
      setClasses(classRes.rows);
      
      const aMap: Record<number, Article> = {};
      articlesRes.rows.forEach(art => {
        aMap[art.id] = art;
      });
      setArticlesMap(aMap);

      if (classRes.rows.length > 0) {
        setSelectedClassId(classRes.rows[0].id);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <LoadingState message="Extracting achievement archives & title stat matrix…" />;
  }

  const getStatName = (type: number): string => {
    switch (type) {
      case 1: return 'Strength';
      case 2: return 'Agility';
      case 3: return 'Wisdom';
      case 4: return 'Stamina';
      case 11: return 'Speed';
      case 12: return 'Strength Growth';
      case 13: return 'Agility Growth';
      case 14: return 'Int Growth';
      case 15: return 'Stamina Growth';
      case 16: return 'Physical Attack';
      case 17: return 'Physical Defense';
      case 18: return 'Ranged Attack';
      case 19: return 'Defense vs Ranged';
      case 20: return 'Kido Attack';
      case 21: return 'Kido Defense';
      case 22: return 'Hit Rate';
      case 23: return 'Dodge Rate';
      case 24: return 'Crit Rate';
      case 25: return 'Block Rate';
      case 26: return 'Combo Rate';
      case 27: return 'Aid Rate';
      case 28: return 'Damage Rate';
      case 29: return 'Damage Immunity';
      case 30: return 'Break Defense';
      case 31: return 'Counter Rate';
      case 32: return 'Attack Rate';
      case 33: return 'Defense Rate';
      case 34: return 'Recovery Rate';
      case 35: return 'Reduce Enemy Attack';
      case 36: return 'Reduce Enemy Defense';
      case 37: return 'Silence Rate';
      case 38: return 'Anti-silence';
      case 39: return 'Stun Rate';
      case 40: return 'Anti-stun';
      case 41: return 'Fury Deduction %';
      case 42: return 'Anti-fury Restriction';
      case 43: return 'Crit Damage %';
      case 44: return 'Physical Damage Rate';
      case 45: return 'Physical Damage Rate';
      case 46: return 'Physical Damage Immune';
      case 47: return 'Spell Immunity';
      case 48: return 'Attack';
      case 49: return 'Defense';
      case 50: return 'Str Jade Growth';
      case 51: return 'Int Jade Growth';
      case 52: return 'Agile Jade Growth';
      case 53: return 'Stamina Jade Growth';
      case 101: return 'HP';
      case 102: return 'Current HP';
      case 103: return 'Max Fury';
      case 104: return 'Current Fury';
      default: return `Stat #${type}`;
    }
  };

  // Find active class
  const activeClass = classes.find(c => c.id === selectedClassId) || classes[0];

  // Resolve achievements in this class
  const getAchievementsForClass = () => {
    if (!activeClass || !activeClass.achievement_groups_id) return [];
    
    const groupIds = activeClass.achievement_groups_id;
    const activeGroups = groups.filter(g => groupIds.includes(g.id));
    
    const achIds: number[] = [];
    activeGroups.forEach(g => {
      if (g.achievements_id) {
        achIds.push(...g.achievements_id);
      }
    });

    return achievements.filter(a => achIds.includes(a.id));
  };

  const filteredAchievements = getAchievementsForClass();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
          🏆 ACHIEVEMENT HALL & TITLE BOARD
        </h1>
        <p className="text-muted text-sm mt-1">
          Catalog of spiritual feats, unlock milestones, and combat stats awarded by active titles.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setActiveTab('achievements')}
          className={`px-4 py-2 text-sm tracking-wider font-semibold rounded transition-all ${
            activeTab === 'achievements'
              ? 'bg-brand-soft border border-brand text-brand shadow-sm'
              : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          🏆 COMPLETED FEATS
        </button>
        <button
          onClick={() => setActiveTab('titles')}
          className={`px-4 py-2 text-sm tracking-wider font-semibold rounded transition-all ${
            activeTab === 'titles'
              ? 'bg-brand-soft border border-brand text-brand shadow-sm'
              : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          🏅 SPIRITUAL TITLE BOARD
        </button>
      </div>

      {/* Content */}
      {activeTab === 'achievements' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Class Navigation */}
          <div className="bg-surface border border-border rounded p-5 space-y-3 lg:col-span-1">
            <h3 className="text-xs font-bold tracking-wider text-brand uppercase mb-4">
              FEAT CATEGORIES
            </h3>
            {classes.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClassId(c.id)}
                className={`w-full text-left p-3 rounded transition-all flex justify-between items-center ${
                  selectedClassId === c.id
                    ? 'bg-brand-soft border border-brand text-brand'
                    : 'bg-bg border border-transparent text-muted hover:text-text'
                }`}
              >
                <span className="font-semibold text-xs">{c.name}</span>
                <span className="text-[10px] font-mono text-subtle">ID: {c.id}</span>
              </button>
            ))}
          </div>

          {/* Achievements Grid */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-surface border border-border rounded p-4 flex justify-between items-center">
              <span className="text-xs text-muted uppercase tracking-wider">
                Feats registered in class: <span className="text-brand font-bold font-mono">{activeClass?.name}</span>
              </span>
              <span className="text-xs font-mono text-subtle">Total Count: {filteredAchievements.length}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAchievements.map(ach => (
                <div key={ach.id} className="bg-surface border border-border rounded p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-subtle font-mono">Feat ID: {ach.id}</span>
                      <h4 className="text-base font-bold text-text tracking-wide mt-0.5">{ach.name}</h4>
                    </div>
                    {ach.if_have_title === 1 && (
                      <span className="text-[10px] px-2 py-0.5 border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 font-mono rounded">
                        Awards Title
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted leading-relaxed font-mono">
                    Requirement: {ach.condition_str || 'Unlock conditions details omitted in logs.'}
                  </p>

                  {/* Rewards display */}
                  <div className="border-t border-border pt-3">
                    <span className="text-[10px] text-subtle uppercase font-semibold block mb-1">Rewards</span>
                    {ach.rewards && ach.rewards.length > 0 ? (
                      <div className="space-y-1">
                        {ach.rewards.map((r, idx) => {
                          const itemName = articlesMap[r.code]?.name || `Item #${r.code}`;
                          return (
                            <div key={idx} className="flex justify-between text-xs font-mono">
                              <span className="text-muted">{itemName}</span>
                              <span className="text-success font-bold">x{r.amount}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[11px] text-subtle italic">Spiritual title unlocked only.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'titles' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded p-5">
            <h3 className="text-lg font-bold text-text mb-1">🏅 Active Spiritual Titles</h3>
            <p className="text-muted text-sm">
              Displays unlocked titles and the active attribute additions they apply to your deployment team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {titles.map(t => (
              <div key={t.id} className="bg-surface border border-border rounded p-5 space-y-4 hover:border-brand-soft transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-subtle font-mono">Title ID: {t.id}</span>
                      <h4 className="text-lg font-bold text-yellow-400 tracking-wide">{t.name}</h4>
                    </div>
                    {t.val_time_limit > 0 && (
                      <span className="text-[10px] px-2 py-0.5 bg-bg text-muted font-mono rounded">
                        Limit: {t.val_time_limit}h
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-xs border-b border-border pb-1">
                      <span className="text-subtle">Group Association</span>
                      <span className="text-text font-mono">Group #{t.title_type_group}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-border pb-1">
                      <span className="text-subtle">Required Level</span>
                      <span className="text-text font-mono">Lv. {t.level_title}</span>
                    </div>
                  </div>
                </div>

                {/* Passive Attributes */}
                <div className="mt-4 border-t border-border pt-3">
                  <span className="text-[10px] text-orange-500 font-semibold block mb-2 tracking-wider uppercase">
                    DEPLOYMENT STAT INCREMENTS
                  </span>
                  <div className="space-y-1.5">
                    {t.add_other_array && t.add_other_array.length > 0 ? (
                      t.add_other_array.map((add, idx) => (
                        <div key={idx} className="flex justify-between text-xs font-mono bg-bg px-2 py-1 rounded">
                          <span className="text-muted">{getStatName(add.type)}</span>
                          <span className="text-success font-bold">
                            +{add.oper === 1 ? `${add.value / 100}%` : add.value}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-subtle italic">No passive stats provided.</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
