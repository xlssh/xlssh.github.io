import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadHeroes, loadRecommendHeroes, loadRelatedPartners, loadRelatedPartnerTypes, loadRelatedConditions, loadRelatedPartnerPoints, loadPartnerChanges, loadHeroChangeAttrs, loadArticles, loadBaseStones, loadSkills, loadHeroTalents, loadAwards, loadActivityDetails, loadPromotionalActivities } from '../data/loaders';
import { Hero, RecommendHero, RelatedPartner, RelatedPartnerType, RelatedCondition, RelatedPartnerPoint, PartnerChange, HeroChangeAttr, Article, BaseStone, Skill, HeroTalent, Award as AwardType, ActivityDetailsJson, PromotionalActivity } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { JsonViewer } from '../components/JsonViewer';
import { getQualityLabel, getQualityColorClass } from './HeroesPage';
import { getProfessionLabel, getAttributeName, getActivationArticleForHero, getActivitiesAwardingArticle } from '../data/relationships';
import { ArrowLeft, Swords, Sparkles, TrendingUp, ShieldAlert, Share2, Check, Scale, Cpu, Lock, HeartHandshake, HelpCircle, Activity, Star, AlertCircle } from 'lucide-react';
import { RelatedTools } from '../components/RelatedTools';
import { calcHeroBP, getBPBreakdown } from '../utils/battlePower';

export const HeroDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [hero, setHero] = useState<Hero | null>(null);
  const [allHeroes, setAllHeroes] = useState<Hero[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendHero[]>([]);

  const [partners, setPartners] = useState<RelatedPartner[]>([]);
  const [partnerTypes, setPartnerTypes] = useState<RelatedPartnerType[]>([]);
  const [conditions, setConditions] = useState<RelatedCondition[]>([]);
  const [partnerPoints, setPartnerPoints] = useState<RelatedPartnerPoint[]>([]);
  const [bondLevelsState, setBondLevelsState] = useState<Record<number, number>>({});
  const [skills, setSkills] = useState<Skill[]>([]);
  const [heroTalents, setHeroTalents] = useState<HeroTalent[]>([]);

  const [partnerChanges, setPartnerChanges] = useState<PartnerChange[]>([]);
  const [heroChangeAttrs, setHeroChangeAttrs] = useState<HeroChangeAttr[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'bonds' | 'modify'>('bonds');
  const [simulatedStars, setSimulatedStars] = useState<number>(1);
  const [baseStones, setBaseStones] = useState<BaseStone[]>([]);
  const [simulatedJadeLevels, setSimulatedJadeLevels] = useState<Record<number, number>>({ 0: 10, 1: 10, 2: 10 }); // default to level 10 suggest
  const [awardsList, setAwardsList] = useState<AwardType[]>([]);
  const [activityDetails, setActivityDetails] = useState<ActivityDetailsJson>({});
  const [promos, setPromos] = useState<PromotionalActivity[]>([]);


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [targetLevel, setTargetLevel] = useState<number>(50);

  const jadeUnlockLevels = useMemo(() => {
    if (!hero?.crash_jade_open_level) return [];
    if (Array.isArray(hero.crash_jade_open_level)) return hero.crash_jade_open_level;
    if (typeof hero.crash_jade_open_level === 'string') {
        try {
            const parsed = JSON.parse(hero.crash_jade_open_level);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }
    return [];
  }, [hero?.crash_jade_open_level]);

  const recommendedJades = useMemo(() => {
    if (!hero) return null;
    switch (hero.profession) {
      case 1: // Agility
        return {
          archetype: 'Striker / Assassin (Agility)',
          jades: ['Swift Jade (Crit Rate)', 'Zephyr Jade (Attack Speed)', 'Pierce Jade (Armor Pen)']
        };
      case 2: // Defending
        return {
          archetype: 'Guardian / Tank (Defending)',
          jades: ['Bastion Jade (Block Rate)', 'Vigor Jade (Max HP)', 'Aegis Jade (Damage Avoidance)']
        };
      case 3: // Intellect
      case 5: // Warlock
        return {
          archetype: 'Tactician / Supporter (Intellect)',
          jades: ['Focus Jade (Strategy Atk)', 'Spirit Jade (Energy Recovery)', 'Curse Jade (Debuff Chance)']
        };
      case 4: // Strength
        return {
          archetype: 'Bruiser / Duelist (Strength)',
          jades: ['Fierce Jade (Physical Atk)', 'Rage Jade (Crit Damage)', 'Precision Jade (Hit Rate)']
        };
      default:
        return {
          archetype: 'Vanguard (General)',
          jades: ['Heroic Jade (Attack & HP)', 'Iron Soul Jade (Resistances)']
        };
    }
  }, [hero]);

  const fetchHero = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [
        heroesRes,
        recsRes,
        partnersRes,
        typesRes,
        conditionsRes,
        pointsRes,
        changesRes,
        attrsRes,
        artRes,
        stonesRes,
        skillsRes,
        talentsRes,
        awardsRes,
        actDetailsRes,
        promosRes
      ] = await Promise.all([
        loadHeroes(),
        loadRecommendHeroes(),
        loadRelatedPartners(),
        loadRelatedPartnerTypes(),
        loadRelatedConditions(),
        loadRelatedPartnerPoints(),
        loadPartnerChanges(),
        loadHeroChangeAttrs(),
        loadArticles(),
        loadBaseStones(),
        loadSkills(),
        loadHeroTalents(),
        loadAwards(),
        loadActivityDetails(),
        loadPromotionalActivities()
      ]);
      const match = heroesRes.rows.find(h => h.id === parseInt(id || ''));
      setAllHeroes(heroesRes.rows);
      setRecommendations(recsRes.rows);
      setPartners(partnersRes.rows);
      setPartnerTypes(typesRes.rows);
      setConditions(conditionsRes.rows);
      setPartnerPoints(pointsRes.rows);
      setPartnerChanges(changesRes.rows);
      setHeroChangeAttrs(attrsRes.rows);
      setArticles(artRes.rows);
      setBaseStones(stonesRes.rows);
      setSkills(skillsRes.rows);
      setHeroTalents(talentsRes.rows);
      setAwardsList(awardsRes.rows);
      setActivityDetails(actDetailsRes);
      setPromos(promosRes.rows);
      if (match) {
        setHero(match);
      } else {
        setError(`Hero with ID ${id} not found in the database.`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load hero record.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchHero();
  }, [fetchHero]);

  const copyDirectLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const getJadeStoneAndAttrType = useCallback((jadeName: string) => {
    const lower = jadeName.toLowerCase();

    // Default values
    let stoneType = 101;
    let attrType = 101;

    if (lower.includes('swift')) {
      stoneType = 24; // Crit Stone
      attrType = 24;  // Crit Rate
    } else if (lower.includes('zephyr')) {
      stoneType = 2;  // Agility Stone
      attrType = 11;  // Speed
    } else if (lower.includes('pierce')) {
      stoneType = 30; // Break Def Stone
      attrType = 30;  // Break Defense Rate
    } else if (lower.includes('bastion')) {
      stoneType = 25; // Block Stone
      attrType = 25;  // Block Rate
    } else if (lower.includes('vigor')) {
      stoneType = 4;  // Stamina Stone
      attrType = 101; // Max HP
    } else if (lower.includes('aegis')) {
      stoneType = 104; // Fury Stone
      attrType = 29;  // Damage Avoidance (Immunity)
    } else if (lower.includes('focus')) {
      stoneType = 3;  // Wisdom Stone
      attrType = 20;  // Kido/Strategy Attack
    } else if (lower.includes('spirit')) {
      stoneType = 104; // Fury Stone
      attrType = 34;  // Energy Recovery Rate
    } else if (lower.includes('curse')) {
      stoneType = 22; // Hit Stone
      attrType = 22;  // Hit Rate / Debuff Chance
    } else if (lower.includes('fierce')) {
      stoneType = 1;  // Strength Stone
      attrType = 16;  // Physical Attack
    } else if (lower.includes('rage')) {
      stoneType = 24; // Crit Stone
      attrType = 24;  // Crit Rate
    } else if (lower.includes('precision')) {
      stoneType = 22; // Hit Stone
      attrType = 22;  // Hit Rate
    } else if (lower.includes('heroic')) {
      stoneType = 1;  // Strength Stone
      attrType = 16;  // Physical Attack
    } else if (lower.includes('iron soul')) {
      stoneType = 4;  // Stamina Stone
      attrType = 17;  // Physical Defense
    }

    return { stoneType, attrType };
  }, []);

  const getJadeAtLevel = useCallback((addType: number, lvl: number) => {
    const candidates = baseStones.filter(s => s.add_type === addType);
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.id - b.id);
    let current = candidates[0];
    for (let i = 1; i < lvl; i++) {
      const next = candidates.find(s => s.id === current.next_id);
      if (next) {
        current = next;
      } else {
        break;
      }
    }
    return current;
  }, [baseStones]);

  const simulatedJadeStatsTotal = useMemo(() => {
    const totals: Record<number, number> = {};
    if (!recommendedJades) return totals;

    recommendedJades.jades.forEach((jadeName, idx) => {
      const { stoneType } = getJadeStoneAndAttrType(jadeName);
      const lvl = simulatedJadeLevels[idx] || 10;

      const stone = getJadeAtLevel(stoneType, lvl);
      if (stone) {
        totals[stoneType] = (totals[stoneType] || 0) + stone.add_value;
      }
    });
    return totals;
  }, [recommendedJades, getJadeAtLevel, simulatedJadeLevels, getJadeStoneAndAttrType]);

  const calculatedStats = useMemo(() => {
    if (!hero) return [];

    const strPct = simulatedJadeStatsTotal[1] || 0;
    const agiPct = simulatedJadeStatsTotal[2] || 0;
    const intPct = simulatedJadeStatsTotal[3] || 0;
    const hpPct = simulatedJadeStatsTotal[4] || 0;
    const spdPct = 0; // Speed not boosted by percentage stones

    const basePower = (hero.power ?? 0) + Math.round((hero.power_grow ?? 0) * (targetLevel - 1));
    const baseAgile = (hero.agile ?? 0) + Math.round((hero.agile_grow ?? 0) * (targetLevel - 1));
    const baseIntel = (hero.intelligence ?? 0) + Math.round((hero.intelligence_grow ?? 0) * (targetLevel - 1));
    const baseLife = (hero.life ?? 0) + Math.round((hero.life_grow ?? 0) * (targetLevel - 1));
    const baseSpeed = (hero.speed ?? 0) + Math.round((hero.speed_grow ?? 0) * (targetLevel - 1));

    return [
      { label: 'Power (STR)', base: hero.power ?? 0, growth: hero.power_grow ?? 0, val: basePower + Math.round(basePower * strPct) },
      { label: 'Agile (AGI)', base: hero.agile ?? 0, growth: hero.agile_grow ?? 0, val: baseAgile + Math.round(baseAgile * agiPct) },
      { label: 'Intelligence (INT)', base: hero.intelligence ?? 0, growth: hero.intelligence_grow ?? 0, val: baseIntel + Math.round(baseIntel * intPct) },
      { label: 'Life (HP)', base: hero.life ?? 0, growth: hero.life_grow ?? 0, val: baseLife + Math.round(baseLife * hpPct) },
      { label: 'Speed (SPD)', base: hero.speed ?? 0, growth: hero.speed_grow ?? 0, val: baseSpeed + Math.round(baseSpeed * spdPct) },
    ];
  }, [hero, targetLevel, simulatedJadeStatsTotal]);

  const currentRec = useMemo(() => {
    if (!hero || !recommendations.length) return null;
    return recommendations.find(r => r.id === hero.id) || null;
  }, [hero, recommendations]);

  const heroBonds = useMemo(() => {
    if (!hero) return [];
    return partners.filter(p => p.hero_id === hero.id);
  }, [partners, hero]);

  const heroChangeAttr = useMemo(() => {
    if (!hero) return null;
    return heroChangeAttrs.find(attr => attr.id === hero.id) || null;
  }, [heroChangeAttrs, hero]);

  const heroModifyStages = useMemo(() => {
    if (!heroChangeAttr || !partnerChanges.length) return [];
    return heroChangeAttr.star
      .map(stageId => partnerChanges.find(pc => pc.id === stageId))
      .filter(Boolean) as PartnerChange[];
  }, [heroChangeAttr, partnerChanges]);

  const heroSkills = useMemo(() => {
    if (!hero || !skills.length) return null;
    const normalAttack = skills.find(s => s.id === hero.normal_attack);
    const activeSkill = skills.find(s => s.id === hero.active);
    return { normalAttack, activeSkill };
  }, [hero, skills]);

  const heroTalent = useMemo(() => {
    if (!hero || !heroTalents.length) return null;
    return heroTalents.find(t => t.id === hero.talent);
  }, [hero, heroTalents]);

  const activationArticle = useMemo(() => {
    if (!hero) return null;
    return getActivationArticleForHero(articles, hero.id) || null;
  }, [hero, articles]);

  const heroObtainSources = useMemo(() => {
    if (!activationArticle) return [];
    return getActivitiesAwardingArticle(awardsList, activityDetails, activationArticle.id, promos);
  }, [activationArticle, awardsList, activityDetails, promos]);

  const getItemName = (code: number) => {
    const art = articles.find(a => a.id === code);
    return art ? art.name : `Item #${code}`;
  };

  if (loading) return <LoadingState message="Downloading character sheet & model coefficient matrix..." />;
  if (error) return <ErrorState message={error} onRetry={fetchHero} />;
  if (!hero) return <ErrorState message="Hero not found." onRetry={fetchHero} />;

  const baseStats = [
    { label: 'Power (STR)', value: hero.power, labelDesc: 'Physical attack power influence' },
    { label: 'Agile (AGI)', value: hero.agile, labelDesc: 'Speed and critical hit rate' },
    { label: 'Intelligence (INT)', value: hero.intelligence, labelDesc: 'Strategy attack and strategy defense' },
    { label: 'Life (HP)', value: hero.life?.toLocaleString(), labelDesc: 'Total maximum health points' },
    { label: 'Speed (SPD)', value: hero.speed, labelDesc: 'Determines attack priority queue' },
  ];

  const growthStats = [
    { label: 'Power Growth', value: hero.power_grow },
    { label: 'Agile Growth', value: hero.agile_grow },
    { label: 'Intelligence Growth', value: hero.intelligence_grow },
    { label: 'Life Growth', value: hero.life_grow },
    { label: 'Speed Growth', value: hero.speed_grow },
  ];

  const rates = [
    { label: 'Hit Rate', value: hero.hit_rate },
    { label: 'Dodge Rate', value: hero.dodge_rate },
    { label: 'Crit Rate', value: hero.crit_rate },
    { label: 'Block Rate', value: hero.block_rate },
    { label: 'Punch Rate', value: hero.punch_rate },
    { label: 'Help Rate', value: hero.help_rate },
    { label: 'Hurt Rate', value: hero.hurt_rate },
    { label: 'Avoid Hurt Rate', value: hero.avoid_hurt_rate },
    { label: 'Wreck Rate', value: hero.wreck_rate },
    { label: 'Anti-knock Rate', value: hero.antiknock_rate },
    { label: 'Attach Rate', value: hero.attach_rate },
    { label: 'Defense Rate', value: hero.defense_rate },
    { label: 'Recover Rate', value: hero.recover_rate },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link & Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/heroes"
          className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-text dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Heroes</span>
        </Link>

        <button
          onClick={copyDirectLink}
          className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 font-semibold px-3 py-1.5 border border-violet-100 dark:border-violet-950 rounded-lg bg-violet-50/50 dark:bg-violet-950/25 transition-colors cursor-pointer"
        >
          {copiedLink ? (
            <>
              <Check size={14} className="text-emerald-500" />
              <span className="text-emerald-500">Copied!</span>
            </>
          ) : (
            <>
              <Share2 size={14} />
              <span>Copy Shareable Link</span>
            </>
          )}
        </button>
      </div>

      {/* Hero Header panel */}
      <div className="p-6 md:p-8 border border-border bg-surface rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs text-muted font-bold bg-bg px-2 py-0.5 rounded">
              ID: {hero.id}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getQualityColorClass(hero.quality as number)}`}>
              {getQualityLabel(hero.quality as number)}
            </span>
            {hero.is_main ? (
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                Protagonist Character
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-surface-raised text-muted">
                Mercenary Ally
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-black text-text">{hero.name}</h1>
            {hero.role && <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">{hero.role}</p>}
          </div>

          {hero.description && (
            <div className="space-y-1.5 p-4 rounded-xl bg-bg/40 border border-border/50">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-subtle">Lore Bio</span>
              <p className="text-sm text-muted dark:text-subtle leading-relaxed italic">
                "{hero.description}"
              </p>
            </div>
          )}

          {hero.assess && (
            <div className="space-y-1.5 p-4 rounded-xl bg-violet-500/5 dark:bg-violet-950/20 border border-violet-100/50 dark:border-violet-950/50">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Tactical Assessment</span>
              <p className="text-sm text-muted leading-relaxed">
                {hero.assess}
              </p>
            </div>
          )}
        </div>

        {/* Quick Identity Grid */}
        <div className="w-full md:w-64 border border-border rounded-xl p-4 bg-bg/50 space-y-3 shrink-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-subtle border-b border-border pb-1.5">Entity Meta</h4>
          {/* Battle Power Display */}
          <div className="p-3 bg-brand-soft/50 border border-brand-soft rounded-xl text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand block">Fighting Power (Lv.1)</span>
            <span className="text-2xl font-black font-mono text-brand">{calcHeroBP(hero, 1).toLocaleString()}</span>
            <div className="flex justify-between text-[9px] text-muted mt-1">
              {(() => { const bp = getBPBreakdown(hero, 1); return (
                <>
                  <span>STR:{bp.str}</span>
                  <span>AGI:{bp.agi}</span>
                  <span>INT:{bp.int}</span>
                  <span>HP:{bp.hp}</span>
                </>
              ); })()}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
            <div>
              <span className="text-subtle block mb-0.5">Gender</span>
              <span className="font-semibold text-muted">{hero.sex === 0 ? 'Female' : hero.sex === 1 ? 'Male' : `Sex ${hero.sex}`}</span>
            </div>

            <div>
              <span className="text-subtle block mb-0.5">Class</span>
              <span className="font-semibold text-muted">{getProfessionLabel(hero.profession)}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Unlock Level</span>
              <span className="font-semibold text-muted">Level {hero.need_level ?? 1}</span>
            </div>
            {hero.source !== null && (
              <div className="col-span-2">
                <span className="text-subtle block mb-0.5">Sourcing ID</span>
                <span className="font-mono text-muted dark:text-subtle font-semibold">{hero.source}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats and Rates panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Base, Growth and calculator */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Stats card */}
            <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
              <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
                <Swords size={18} className="text-indigo-500" />
                <span>Base Level-1 Attributes</span>
              </h3>
              <div className="space-y-3">
                {baseStats.map((stat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-zinc-50 dark:border-border/40 last:border-0">
                    <div>
                      <span className="font-semibold text-muted block">{stat.label}</span>
                      <span className="text-[10px] text-subtle">{stat.labelDesc}</span>
                    </div>
                    <span className="font-mono font-bold text-text text-base">{stat.value ?? 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Growth stats card */}
            <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
              <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
                <TrendingUp size={18} className="text-emerald-500" />
                <span>Level Growth Multipliers</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {growthStats.map((stat, idx) => (
                  <div key={idx} className="p-3 border border-border/80 rounded-lg bg-bg/50 dark:bg-bg/30">
                    <span className="text-xs text-subtle block">{stat.label}</span>
                    <span className="font-mono text-base font-extrabold text-text">
                      +{stat.value?.toFixed(2) ?? '0.00'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Stats Progression Calculator */}
          <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Scale size={18} className="text-fuchsia-500" />
                <h3 className="font-bold text-text">Attribute Progression Calculator</h3>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-subtle uppercase">Target Level:</label>
                <input
                  type="number"
                  min="1"
                  max="159"
                  value={targetLevel}
                  onChange={(e) => setTargetLevel(Math.max(1, Math.min(159, parseInt(e.target.value) || 1)))}
                  className="w-16 px-2 py-1 border border-border rounded bg-bg text-text font-mono font-bold text-center"
                />
              </div>
            </div>

            {/* Slider control */}
            <div className="space-y-2">
              <input
                type="range"
                min="1"
                max="159"
                value={targetLevel}
                onChange={(e) => setTargetLevel(parseInt(e.target.value))}
                className="w-full h-1.5 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-fuchsia-600"
              />
            </div>

            {/* Simulated Stats display */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {calculatedStats.map((stat, idx) => (
                <div key={idx} className="p-3 border border-border bg-fuchsia-500/5 rounded-xl text-center space-y-1">
                  <span className="text-[10px] text-subtle block font-semibold">{stat.label}</span>
                  <span className="font-mono text-base font-black text-fuchsia-600 dark:text-fuchsia-400 block">
                    {stat.val.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-subtle font-mono block">
                    {stat.base} + {stat.growth}×{targetLevel - 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Rates */}
        <div className="lg:col-span-1">
          {/* Combat coefficients & Rates */}
          <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4 h-full">
            <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
              <Sparkles size={18} className="text-violet-500" />
              <span>Combat Rate Coefficients</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {rates.map((rate, idx) => (
                <div key={idx} className="p-2.5 border border-border/50 rounded-lg text-center bg-bg/10">
                  <span className="text-[11px] text-subtle block mb-0.5 truncate">{rate.label}</span>
                  <span className="font-mono font-bold text-xs text-muted">
                    {rate.value !== null && rate.value !== undefined ? `${rate.value}%` : '0.00%'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden system settings */}
      <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
          <ShieldAlert size={18} className="text-amber-500" />
          <span>Internal Mechanics & System Configs</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-subtle block mb-0.5">Active Skill ID</span>
            <span className="font-mono font-semibold text-muted">{hero.active ?? 'None'}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5">Normal Attack ID</span>
            <span className="font-mono font-semibold text-muted">{hero.normal_attack ?? 'None'}</span>
          </div>
          <div>
            <span className="text-subtle block mb-0.5">Talent ID</span>
            <span className="font-mono font-semibold text-muted">{hero.talent ?? 'None'}</span>
          </div>
          {hero.sound !== null && (
            <div>
              <span className="text-subtle block mb-0.5">Vocal Sound Package</span>
              <span className="font-mono font-semibold text-muted">{hero.sound}</span>
            </div>
          )}
          {hero.head_style && (
            <div className="col-span-2">
              <span className="text-subtle block mb-0.5">UI Sprite Head Style</span>
              <span className="font-mono font-semibold text-muted bg-bg px-2 py-1 rounded border border-border inline-block">
                {typeof hero.head_style === 'object' ? JSON.stringify(hero.head_style) : hero.head_style}
              </span>
            </div>
          )}
          {hero.hero_soul && (
            <div className="col-span-2">
              <span className="text-subtle block mb-0.5">Hero Soul Item Configuration</span>
              <span className="font-mono text-xs text-muted dark:text-subtle leading-relaxed font-semibold">
                {typeof hero.hero_soul === 'object' ? JSON.stringify(hero.hero_soul) : hero.hero_soul}
              </span>
            </div>
          )}
          {hero.crash_jade_open_level && (
            <div className="col-span-2">
              <span className="text-subtle block mb-0.5">Jade System Unlocks</span>
              <span className="font-mono text-xs text-muted dark:text-subtle leading-relaxed font-semibold">
                {typeof hero.crash_jade_open_level === 'object' ? JSON.stringify(hero.crash_jade_open_level) : hero.crash_jade_open_level}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* How to Obtain */}
      <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
        <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
          <Activity size={18} className="text-emerald-500" />
          <span>How to Obtain</span>
        </h3>

        {activationArticle && (
          <div className="p-3 bg-bg/50 rounded-lg border border-border text-xs">
            <span className="text-subtle block mb-1 font-semibold">Activation Item:</span>
            <Link to={`/articles/${activationArticle.id}`} className="font-bold text-violet-600 dark:text-violet-400 hover:underline">
              {activationArticle.name} (ID: {activationArticle.id})
            </Link>
          </div>
        )}

        {heroObtainSources.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {heroObtainSources.map((src, i) => {
              const content = (
                <div className="p-3 border border-border rounded-lg flex items-center justify-between text-sm">
                  <div>
                    <span className="font-bold text-text">
                      {src.activityDisplayName || src.activityName}
                    </span>
                    <span className="block text-[11px] text-subtle">
                      {src.mechanism} · {src.className}
                      {src.limitLabel && ` · ${src.limitLabel}`}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                    {src.costLabel}
                  </span>
                </div>
              );
              return src.promoId ? (
                <Link key={i} to={`/promotions/${src.promoId}`} className="block hover:border-emerald-500 hover:shadow-sm transition-all rounded-lg">
                  {content}
                </Link>
              ) : (
                <div key={i}>{content}</div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-subtle italic py-2 flex items-center gap-1.5">
            <AlertCircle size={14} />
            <span>No event/activity obtain sources found for this hero.</span>
          </div>
        )}
      </div>

      {/* Skills and Talent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {heroSkills?.normalAttack && (
          <div className="p-5 border border-border bg-surface rounded-xl shadow-sm">
            <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
              <Swords size={18} className="text-muted" />
              <span>Normal Attack: {heroSkills.normalAttack.name}</span>
            </h3>
            <p className="text-sm text-muted dark:text-subtle mt-2">{heroSkills.normalAttack.description}</p>
          </div>
        )}
        {heroSkills?.activeSkill && (
          <div className="p-5 border border-border bg-surface rounded-xl shadow-sm">
            <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
              <Sparkles size={18} className="text-yellow-500" />
              <span>Active Skill: {heroSkills.activeSkill.name}</span>
            </h3>
            <p className="text-sm text-muted dark:text-subtle mt-2">{heroSkills.activeSkill.description}</p>
          </div>
        )}
      </div>

      {heroTalent && (
        <div className="p-5 border border-border bg-surface rounded-xl shadow-sm">
          <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
            <Star size={18} className="text-blue-500" />
            <span>Talent: {heroTalent.talent_name}</span>
          </h3>
          <p className="text-sm text-muted dark:text-subtle mt-2">{heroTalent.talent_desc}</p>
        </div>
      )}

      {/* Soul Jade Progression & Build Recommendations */}
      {hero.crash_jade_open_level && (
        <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4 animate-fade-in">
          <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
            <Cpu size={18} className="text-fuchsia-500" />
            <span>Soul Jade Progression & Build Suggestions</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Slot roadmap */}
            <div className="md:col-span-2 space-y-3">
              <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Unlock Milestones (Affected by Target Level Simulator)</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {jadeUnlockLevels.map((lvl: number, idx: number) => {
                  const unlocked = targetLevel >= lvl;
                  return (
                    <div
                      key={idx}
                      className={`p-3 border rounded-xl text-center space-y-1.5 transition-all ${unlocked
                        ? 'border-fuchsia-500 bg-fuchsia-500/5 text-fuchsia-850 dark:text-fuchsia-400 font-bold'
                        : 'border-border bg-bg/40 dark:bg-bg/20 text-subtle'
                        }`}
                    >
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] uppercase font-bold text-subtle">Slot {idx + 1}</span>
                        {unlocked ? <Check size={12} className="text-fuchsia-500" /> : <Lock size={10} className="text-subtle" />}
                      </div>
                      <span className="block font-mono text-sm">Lv. {lvl}</span>
                      <span className="block text-[9px] uppercase font-bold tracking-wider">
                        {unlocked ? 'Unlocked' : 'Locked'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Build Recommendation */}
            <div className="p-4 border border-border/80 rounded-xl bg-bg/50 dark:bg-bg/30 space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-subtle uppercase">Recommended Archetype</span>
                <span className="font-extrabold text-sm text-text">{recommendedJades?.archetype}</span>
              </div>
              <div className="space-y-3.5">
                <span className="block text-[10px] font-bold text-subtle uppercase">Spirit Jade Loadout Simulator</span>
                <div className="space-y-3">
                  {recommendedJades?.jades.map((jade, idx) => {
                    const lvl = simulatedJadeLevels[idx] || 10;
                    const { stoneType, attrType } = getJadeStoneAndAttrType(jade);
                    const stoneData = getJadeAtLevel(stoneType, lvl);
                    const name = getAttributeName(attrType);

                    const isDecimal = stoneData && stoneData.add_value > 0 && stoneData.add_value < 1;
                    const isNamedPercent = name.toLowerCase().includes('rate') || name.toLowerCase().includes('immunity') || name.toLowerCase().includes('avoidance');
                    const treatAsPercent = isNamedPercent || isDecimal;

                    const formattedValue = stoneData
                      ? (treatAsPercent ? `+${(stoneData.add_value < 1 ? stoneData.add_value * 100 : stoneData.add_value).toFixed(1)}%` : `+${stoneData.add_value.toLocaleString()}`)
                      : 'N/A';

                    const baseStonesRequired = Math.pow(2, lvl - 1);
                    const goldRequired = (baseStonesRequired - 1) * 1000;

                    return (
                      <div key={idx} className="p-2.5 bg-surface border border-border rounded-lg space-y-1.5 text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-text truncate">{jade.split(' (')[0]}</span>
                          <span className="font-mono text-fuchsia-600 dark:text-fuchsia-400 font-extrabold">{formattedValue} {name}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-subtle font-semibold font-mono">Lv. {lvl}</span>
                          <input
                            type="range"
                            min="1"
                            max="12"
                            value={lvl}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setSimulatedJadeLevels(prev => ({ ...prev, [idx]: val }));
                            }}
                            className="flex-1 accent-fuchsia-500 bg-surface-raised h-1 rounded appearance-none cursor-pointer"
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-subtle border-t border-border/40 pt-1">
                          <span>Merge: {baseStonesRequired.toLocaleString()}x Lv.1</span>
                          <span>Cost: {goldRequired.toLocaleString()} Gold</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Team Synergy Board */}
      {currentRec && (
        <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4 animate-fade-in">
          <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
            <HeartHandshake size={18} className="text-fuchsia-500" />
            <span>Recommended Team Synergy & Partners</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-3.5 text-xs">
              {currentRec.ability && (
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-subtle uppercase">Combat Synergy Analysis</span>
                  <p className="text-muted font-semibold leading-relaxed">{currentRec.ability}</p>
                </div>
              )}
              {currentRec.get_rode && (
                <div className="space-y-1 pt-3 border-t border-border/80">
                  <span className="block text-[10px] font-bold text-subtle uppercase">Obtain & Sourcing Tip</span>
                  <p className="text-muted font-semibold">{currentRec.get_rode}</p>
                </div>
              )}
            </div>

            {currentRec.friends && currentRec.friends.length > 0 && (
              <div className="p-4 border border-border rounded-xl bg-bg/50 dark:bg-bg/30 space-y-3">
                <span className="block text-[10px] font-bold text-subtle uppercase">Best Synergy Partners</span>
                <div className="space-y-2">
                  {currentRec.friends.map(friendId => {
                    const friendHero = allHeroes.find(h => h.id === friendId);
                    if (!friendHero) return null;
                    return (
                      <Link
                        key={friendId}
                        to={`/heroes/${friendId}`}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface hover:border-fuchsia-500 transition-colors"
                      >
                        <span className="text-xs font-bold text-text">{friendHero.name}</span>
                        <span className={`text-[10px] font-bold ${getQualityColorClass(friendHero.quality)}`}>
                          {getQualityLabel(friendHero.quality)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Partner Bonds & Modify Section */}
      {(heroBonds.length > 0 || heroModifyStages.length > 0) && (
        <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-5 animate-fade-in">
          {/* Tab Headers */}
          <div className="flex border-b border-border pb-0.5 justify-between items-center flex-wrap gap-2">
            <div className="flex gap-4">
              {heroBonds.length > 0 && (
                <button
                  onClick={() => setActiveSubTab('bonds')}
                  className={`pb-2 text-sm font-black flex items-center gap-1.5 transition-colors cursor-pointer ${activeSubTab === 'bonds'
                    ? 'text-fuchsia-600 dark:text-fuchsia-400 border-b-2 border-fuchsia-600 dark:border-fuchsia-400'
                    : 'text-subtle hover:text-text dark:hover:text-zinc-200'
                    }`}
                >
                  <HeartHandshake size={16} />
                  <span>Partner Bonds ({heroBonds.length})</span>
                </button>
              )}
              {heroModifyStages.length > 0 && (
                <button
                  onClick={() => setActiveSubTab('modify')}
                  className={`pb-2 text-sm font-black flex items-center gap-1.5 transition-colors cursor-pointer ${activeSubTab === 'modify'
                    ? 'text-fuchsia-600 dark:text-fuchsia-400 border-b-2 border-fuchsia-600 dark:border-fuchsia-400'
                    : 'text-subtle hover:text-text dark:hover:text-zinc-200'
                    }`}
                >
                  <Star size={16} />
                  <span>Modify & Star Upgrades</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB: BONDS */}
          {activeSubTab === 'bonds' && heroBonds.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {heroBonds.map((bond) => {
                const connectedHero = allHeroes.find(h => h.id === bond.connect_id);
                const bondLevels = partnerTypes.filter(t => t.type === bond.type).sort((a, b) => a.level - b.level);
                const maxLvl = bondLevels.length;

                const currentLvl = bondLevelsState[bond.id] ?? 1;
                const activeLevelData = bondLevels.find(l => l.level === currentLvl) || bondLevels[0];

                // Requirements
                const reqPoint = partnerPoints.find(p => p.id === bond.condition_point);
                const reqCond = conditions.find(c => c.id === bond.condition_id);

                return (
                  <div
                    key={bond.id}
                    className="p-4 border border-border/80 bg-bg/15 dark:bg-bg/15 rounded-2xl space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                        <div>
                          <span className="text-[10px] font-mono text-subtle block font-bold">BOND TYPE ID: {bond.type}</span>
                          <h4 className="font-extrabold text-sm text-text">
                            {activeLevelData ? activeLevelData.name : `Bond #${bond.id}`}
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-800 dark:text-fuchsia-400 text-[10px] font-black uppercase">
                          Level {currentLvl} / {maxLvl || 30}
                        </span>
                      </div>

                      {/* Synergy Partner Hero link */}
                      {connectedHero && (
                        <div className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="block text-[8px] font-bold text-subtle uppercase">Connected Partner required</span>
                            <Link
                              to={`/heroes/${connectedHero.id}`}
                              className="font-bold text-violet-600 dark:text-violet-400 hover:underline"
                            >
                              {connectedHero.name}
                            </Link>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getQualityColorClass(connectedHero.quality)}`}>
                            {getQualityLabel(connectedHero.quality)}
                          </span>
                        </div>
                      )}

                      {/* Stats Modifiers Preview */}
                      {activeLevelData && activeLevelData.properties && (
                        <div className="space-y-1.5">
                          <span className="block text-[9px] font-bold text-subtle uppercase">Bonds Active Stat Bonuses</span>
                          <div className="grid grid-cols-2 gap-2">
                            {activeLevelData.properties.map((prop, pIdx) => {
                              const name = getAttributeName(prop.type);

                              if (name === 'Passive Skill' || name === 'Halo') {
                                const skill = skills.find(s => s.id === prop.value);
                                const isGeneric = skill && (skill.name === 'Passive Skill' || skill.name === 'Halo');
                                return (
                                  <div
                                    key={pIdx}
                                    className="p-3 border border-border bg-surface rounded-xl flex flex-col gap-1 text-xs col-span-2"
                                  >
                                    <div className="flex justify-between items-center font-bold text-fuchsia-600 dark:text-fuchsia-400">
                                      <span className="text-subtle font-semibold">{name}</span>
                                      <span>{skill && !isGeneric ? skill.name : `ID: ${prop.value}`}</span>
                                    </div>
                                    {skill?.description && (
                                      <p className="text-[10px] text-muted dark:text-zinc-400 italic leading-relaxed pt-1.5 border-t border-border/30 mt-1">
                                        {skill.description.replace(/<[^>]*>/g, '')}
                                      </p>
                                    )}
                                  </div>
                                )
                              }

                              const isPercent = prop.oper === 2 || (prop.oper === 1 && prop.value < 1 && prop.value !== 0);
                              const formattedVal = isPercent
                                ? `+${(prop.value * 100).toFixed(2)}%`
                                : `+${prop.value}`;
                              return (
                                <div
                                  key={pIdx}
                                  className="p-2 border border-border bg-surface rounded-lg flex items-center justify-between text-xs"
                                >
                                  <span className="text-subtle font-semibold">{name}</span>
                                  <span className="font-mono font-bold text-fuchsia-600 dark:text-fuchsia-400">{formattedVal}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Unlock Milestones & Requirements */}
                      {(reqPoint || reqCond) && (
                        <div className="space-y-1.5">
                          <span className="block text-[9px] font-bold text-subtle uppercase">Unlock Requirements</span>
                          <div className="p-3 border border-border bg-bg/40 dark:bg-bg/20 rounded-xl text-[11px] leading-relaxed text-muted space-y-1">
                            {reqPoint && (
                              <p className="flex items-center gap-1.5 font-bold">
                                <Activity size={12} className="text-subtle shrink-0" />
                                <span>Clear: {reqPoint.name} (★{bond.condition_star}+ required)</span>
                              </p>
                            )}
                            {reqCond && (
                              <p className="flex items-start gap-1.5 italic">
                                <ShieldAlert size={12} className="text-subtle mt-0.5 shrink-0" />
                                <span>"{reqCond.description}"</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bond interactive Level slider */}
                    {maxLvl > 1 && (
                      <div className="pt-3 border-t border-border/60 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-subtle uppercase text-[9px] font-bold">Simulate Bond Upgrades</span>
                          <span className="font-mono text-[11px] font-bold text-muted">
                            Cost: {activeLevelData?.material_count ?? 0} bond chips
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max={maxLvl}
                          value={currentLvl}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setBondLevelsState(prev => ({ ...prev, [bond.id]: val }));
                          }}
                          className="w-full accent-fuchsia-600 bg-surface-raised h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: MODIFY (STAR-UP) */}
          {activeSubTab === 'modify' && heroModifyStages.length > 0 && (
            <div className="space-y-6">
              {/* Star Slider Simulator */}
              <div className="p-4 bg-bg rounded-xl border border-border flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-amber-500" fill="currentColor" />
                  <span className="text-xs font-bold text-text dark:text-zinc-200">Simulated Star Level:</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max={heroModifyStages.length}
                  value={simulatedStars}
                  onChange={(e) => setSimulatedStars(parseInt(e.target.value))}
                  className="flex-1 accent-amber-500 bg-surface-raised h-1.5 rounded-lg appearance-none cursor-pointer min-w-[150px]"
                />
                <span className="text-sm font-black text-amber-500 font-mono">{simulatedStars}★ / {heroModifyStages.length}★</span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* 7 Star Nodes Timeline */}
                <div className="xl:col-span-1 space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {heroModifyStages.map((stage, idx) => {
                    const isUnlocked = idx < simulatedStars;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => setSimulatedStars(idx + 1)}
                        className={`w-full p-3 text-left border rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${simulatedStars === idx + 1
                          ? 'border-amber-500 bg-amber-500/5 text-amber-700 dark:text-amber-400 font-bold'
                          : isUnlocked
                            ? 'border-border/80 bg-bg/50 text-muted'
                            : 'border-border border-border opacity-60 text-subtle'
                          }`}
                      >
                        <div className="space-y-0.5">
                          <span className="font-extrabold block">{stage.name}</span>
                          <span className="text-[10px] text-subtle block font-mono">Stage ID: {stage.id} · Node {idx + 1}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: idx + 1 }, (_, i) => (
                            <Star key={i} size={8} className="text-amber-500" fill="currentColor" />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right: Node Info & Cumulative Simulator Results */}
                <div className="xl:col-span-2 space-y-6">
                  {/* Selected Node Details */}
                  {heroModifyStages[simulatedStars - 1] && (
                    <div className="p-4 border border-border bg-surface rounded-xl space-y-4">
                      <div className="flex justify-between items-start gap-2 border-b border-border pb-2">
                        <div>
                          <span className="text-[9px] font-mono text-subtle uppercase font-black block">Star Node {simulatedStars} Detail</span>
                          <h4 className="text-base font-black text-text">{heroModifyStages[simulatedStars - 1].name}</h4>
                        </div>
                        <span className="text-xs font-mono font-bold text-subtle">Req. Level: Lv. {heroModifyStages[simulatedStars - 1].hero_level}</span>
                      </div>

                      {/* Node description */}
                      <p className="text-xs text-muted italic font-semibold">
                        "{heroModifyStages[simulatedStars - 1].description}"
                      </p>

                      {/* Cost details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-bg rounded-lg border border-border space-y-1.5">
                          <span className="block text-[8px] font-bold text-subtle uppercase">Upgrade Cost for Node</span>
                          <div className="text-xs space-y-1">
                            {heroChangeAttr && (
                              <div className="flex justify-between font-mono">
                                <span className="text-subtle">{getItemName(heroChangeAttr.chip_id) || 'Hero Shard'}</span>
                                <span className="font-bold">x{heroChangeAttr.chip_val * simulatedStars}</span>
                              </div>
                            )}
                            {heroModifyStages[simulatedStars - 1].rewards?.map((cost, cIdx) => (
                              <div key={cIdx} className="flex justify-between font-mono">
                                <span className="text-subtle">{cost.type === 2 ? 'Gold' : getItemName(cost.code)}</span>
                                <span className="font-bold">{cost.type === 2 ? cost.amount.toLocaleString() : `x${cost.amount}`}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Connected battle stage */}
                        {heroChangeAttr?.city_id && (
                          <div className="p-3 bg-bg rounded-lg border border-border space-y-1.5 text-xs">
                            <span className="block text-[8px] font-bold text-subtle uppercase">Modify Battle Trial Stage</span>
                            {(() => {
                              const point = partnerPoints.find(p => p.id === heroChangeAttr.city_id);
                              if (!point) return <span className="text-muted">Trial Stage #{heroChangeAttr.city_id}</span>;
                              return (
                                <div className="space-y-1">
                                  <span className="font-bold block text-fuchsia-600 dark:text-fuchsia-400">{point.name}</span>
                                  <div className="text-[10px] text-subtle font-mono">Battle Scene: {point.battle_scene}</div>
                                  <div className="space-y-0.5 pt-1 border-t border-border/40 mt-1">
                                    <span className="block text-[8px] font-bold text-subtle">Unlock Achievements:</span>
                                    {point.stars?.slice(0, 3).map((stArr, stIdx) => {
                                      const cDetail = conditions.find(c => c.id === stArr[0]);
                                      return (
                                        <div key={stIdx} className="text-[9px] text-subtle truncate">
                                          ★{stIdx + 1}: {cDetail ? cDetail.description : `Achievement #${stArr[0]}`}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cumulative stats & cost results */}
                  {(() => {
                    const statsSum: Record<number, number> = {};
                    let totalGold = 0;
                    const totalMaterials: Record<number, number> = {};
                    let totalShards = 0;

                    heroModifyStages.slice(0, simulatedStars).forEach((stage, idx) => {
                      const baseShardCost = heroChangeAttr?.chip_val ? heroChangeAttr.chip_val * (idx + 1) : 0;
                      totalShards += baseShardCost;
                      if (stage.rewards) {
                        stage.rewards.forEach(r => {
                          if (r.type === 2) {
                            totalGold += r.amount;
                          } else {
                            totalMaterials[r.code] = (totalMaterials[r.code] || 0) + r.amount;
                          }
                        });
                      }
                      if (stage.effect) {
                        stage.effect.forEach(eff => {
                          const name = getAttributeName(eff.addType);
                          if (name === 'Passive Skill' || name === 'Halo' || eff.addValue > 1000000) {
                            statsSum[eff.addType] = eff.addValue; // Keep the latest ID instead of summing
                          } else {
                            statsSum[eff.addType] = (statsSum[eff.addType] || 0) + eff.addValue;
                          }
                        });
                      }
                    });

                    return (
                      <div className="p-4 border border-border bg-bg/20 rounded-xl space-y-4">
                        <h4 className="font-extrabold text-xs text-text dark:text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
                          <Scale size={14} className="text-amber-500" />
                          <span>Simulated Cumulative {simulatedStars}★ Modify Bonuses</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Stat totals */}
                          <div className="space-y-1.5">
                            <span className="block text-[8px] font-bold text-subtle uppercase">Cumulative Stat Modifiers</span>
                            <div className="space-y-1">
                              {Object.keys(statsSum).length > 0 ? (
                                Object.entries(statsSum).map(([type, val]) => {
                                  const name = getAttributeName(parseInt(type));

                                  if (name === 'Passive Skill' || name === 'Halo' || val > 1000000) {
                                    const skill = skills.find(s => s.id === val);
                                    const isGeneric = skill && (skill.name === 'Passive Skill' || skill.name === 'Halo');
                                    return (
                                      <div key={type} className="flex flex-col text-xs font-mono border-b border-border pb-2 pt-1.5 last:border-0 last:pb-0">
                                        <div className="flex justify-between font-bold text-amber-600 dark:text-amber-400">
                                          <span className="text-muted">{name}</span>
                                          <span>{skill && !isGeneric ? skill.name : `ID: ${val}`}</span>
                                        </div>
                                        {skill?.description && (
                                          <p className="text-[10px] text-muted dark:text-zinc-400 italic leading-relaxed mt-1">
                                            {skill.description.replace(/<[^>]*>/g, '')}
                                          </p>
                                        )}
                                      </div>
                                    )
                                  }

                                  const isPercent = name.toLowerCase().includes('rate') || name.toLowerCase().includes('immunity');
                                  let displayValue: number = val;

                                  if (isPercent && val > 100) { // Scaled percentage e.g. 5000 = 0.5%
                                    displayValue = val / 10000;
                                  } else if (!isPercent && val > 50000) { // Scaled raw value e.g. 526344
                                    displayValue = val; // Display as raw, but formatted
                                  }

                                  const formatted = isPercent
                                    ? `+${displayValue.toFixed(2)}%`
                                    : `+${displayValue.toLocaleString()}`;

                                  return (
                                    <div key={type} className="flex justify-between text-xs font-mono border-b border-border pb-1 last:border-0 last:pb-0">
                                      <span className="text-muted">{name}</span>
                                      <span className="text-amber-600 dark:text-amber-400 font-bold">{formatted}</span>
                                    </div>
                                  );
                                })
                              ) : (
                                <span className="text-muted italic text-xs">No modifiers active</span>
                              )}
                            </div>
                          </div>

                          {/* Cost totals */}
                          <div className="space-y-1.5">
                            <span className="block text-[8px] font-bold text-subtle uppercase">Total Currency & Materials Consumed</span>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between font-mono border-b border-border pb-1">
                                <span className="text-muted">Gold Coins</span>
                                <span className="font-bold text-amber-600">{totalGold.toLocaleString()} Gold</span>
                              </div>
                              {heroChangeAttr && (
                                <div className="flex justify-between font-mono border-b border-border pb-1">
                                  <span className="text-muted">{getItemName(heroChangeAttr.chip_id) || 'Hero Shards'}</span>
                                  <span className="font-bold text-amber-600">{totalShards.toLocaleString()}</span>
                                </div>
                              )}
                              {Object.entries(totalMaterials).map(([code, amount]) => (
                                <div key={code} className="flex justify-between font-mono">
                                  <span className="text-muted">{getItemName(parseInt(code))}</span>
                                  <span className="font-bold text-amber-600">{amount.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Related Tools */}
      <RelatedTools
        title="Related Tools & Pages"
        links={[
          { label: 'Formation Builder', to: '/tools/formation', description: 'Build a team with this hero' },
          { label: 'Hero Comparison', to: '/heroes/compare', description: 'Compare stats side-by-side' },
          { label: 'Tier Heatmap', to: '/tools/tier-heatmap', description: 'See tier rankings' },
          { label: 'Bond Optimizer', to: '/tools/bond-optimizer', description: 'Optimize bond synergies' },
          { label: 'Hero Talents', to: '/tools/talents', description: 'Plan talent upgrades' },
          { label: 'Skill Handbook', to: '/tools/skills', description: 'Browse all skills' },
        ]}
      />

      {/* Raw Record FALLBACK for Dataminers */}
      <JsonViewer data={hero} title={`Raw JSON Database Entry: Hero #${hero.id}`} />
    </div>
  );
};
