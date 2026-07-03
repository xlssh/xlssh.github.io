import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadCullingStages, loadCullingMagics, loadArticles } from '../data/loaders';
import { CullingStage, CullingMagic, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { 
  Swords, Shield, Compass, ChevronRight, Zap, Target,
  Info, Award, ShieldAlert, BookOpen, AlertCircle, Sparkles, Coins, Gem
} from 'lucide-react';

export const CullingPage: React.FC = () => {
  const [stages, setStages] = useState<CullingStage[]>([]);
  const [magics, setMagics] = useState<CullingMagic[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'stages' | 'calculator'
  const [activeTab, setActiveTab] = useState<'stages' | 'calculator'>('stages');

  // Stages Selections
  const [selectedStageId, setSelectedStageId] = useState<number>(0);

  // Calculator Selections
  const [selectedMagicType, setSelectedMagicType] = useState<number>(1); // Type 1: Vanguard, 2: Attacker, 3: Support, 4: Wind Force
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [targetStep, setTargetStep] = useState<number>(10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [stagesRes, magicsRes, artRes] = await Promise.all([
          loadCullingStages(),
          loadCullingMagics(),
          loadArticles()
        ]);
        
        const sortedStages = stagesRes.rows.sort((a, b) => a.id - b.id);
        setStages(sortedStages);
        setMagics(magicsRes.rows);
        setArticles(artRes.rows);
        
        if (sortedStages.length > 0) {
          setSelectedStageId(sortedStages[0].id);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load Culling Game database.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const articlesMap = useMemo(() => {
    const map: Record<number, Article> = {};
    articles.forEach(a => {
      map[a.id] = a;
    });
    return map;
  }, [articles]);

  const activeStage = useMemo(() => {
    return stages.find(s => s.id === selectedStageId) || null;
  }, [stages, selectedStageId]);

  // Find boss properties linked to this stage
  const activeBoss = useMemo(() => {
    if (!activeStage) return null;
    
    // Stage references boss detail ID in culling_magics
    const boss = magics.find(m => m.id === activeStage.id);
    return boss || null;
  }, [magics, activeStage]);

  // Decode drop list award array
  const decodeAwardsList = (awardData: any) => {
    if (!awardData) return [];
    
    let list: any[] = [];
    if (Array.isArray(awardData)) {
      list = awardData;
    } else if (typeof awardData === 'object' && awardData.award) {
      list = awardData.award;
    } else if (typeof awardData === 'string') {
      try {
        const decoded = JSON.parse(awardData);
        list = Array.isArray(decoded) ? decoded : decoded.award || [];
      } catch {
        list = [];
      }
    }
    
    return list.map(item => {
      const art = articlesMap[item.code];
      return {
        code: item.code,
        name: art ? art.name : `Material #${item.code}`,
        amount: item.amount || 0,
        quality: art ? art.quality : 1
      };
    });
  };

  const firstClearAwards = useMemo(() => {
    return activeStage ? decodeAwardsList(activeStage.award) : [];
  }, [activeStage, articlesMap]);

  const extraAwards = useMemo(() => {
    return activeStage ? decodeAwardsList(activeStage.award_ex) : [];
  }, [activeStage, articlesMap]);

  // Sequential Chain Builder for Culling Magic Upgrades
  const selectedChain = useMemo(() => {
    if (magics.length === 0) return [];
    const filtered = magics.filter(m => m.type === selectedMagicType);
    const magicsMap: Record<number, CullingMagic> = {};
    filtered.forEach(m => {
      magicsMap[m.id] = m;
    });

    const startId = selectedMagicType * 1000000;
    const chain: CullingMagic[] = [];
    let currId = startId;
    const visited = new Set<number>();
    
    // Phase 0 Tracing
    while (currId in magicsMap && !visited.has(currId)) {
      visited.add(currId);
      const r = magicsMap[currId];
      chain.push(r);
      currId = r.next_id;
    }

    // Phase 1-4 Transcend Tracing (starts at startId + 101)
    const transcendStartId = startId + 101;
    let currTransId = transcendStartId;
    while (currTransId in magicsMap && !visited.has(currTransId)) {
      visited.add(currTransId);
      const r = magicsMap[currTransId];
      chain.push(r);
      currTransId = r.next_id;
    }

    return chain;
  }, [magics, selectedMagicType]);

  // Adjust selections on chain change
  useEffect(() => {
    if (selectedChain.length > 0) {
      setCurrentStep(0);
      setTargetStep(Math.min(selectedChain.length - 1, 10));
    }
  }, [selectedChain]);

  // Experience and Practice Estimations
  const trainingCalculations = useMemo(() => {
    if (selectedChain.length === 0 || currentStep >= targetStep) {
      return { totalExp: 0, silver: 0, gold: 0, items: 0, silverSteps: 0, goldSteps: 0, itemSteps: 0 };
    }

    let totalExp = 0;
    for (let i = currentStep; i < targetStep; i++) {
      totalExp += selectedChain[i]?.need_exp || 0;
    }

    const current = selectedChain[currentStep];
    const silverExp = current?.silver_exp || 10;
    const silverCost = current?.need_silver || 100;
    const goldExp = current?.gold_exp || 30;
    const goldCost = current?.need_gold || 10;
    const itemExp = current?.item_exp || 100;
    const itemCost = current?.need_item || 1;

    const silverSteps = Math.ceil(totalExp / silverExp);
    const goldSteps = Math.ceil(totalExp / goldExp);
    const itemSteps = Math.ceil(totalExp / itemExp);

    return {
      totalExp,
      silverSteps,
      silver: silverSteps * silverCost,
      goldSteps,
      gold: goldSteps * goldCost,
      itemSteps,
      items: itemSteps * itemCost
    };
  }, [selectedChain, currentStep, targetStep]);

  const statGains = useMemo(() => {
    const current = selectedChain[currentStep];
    const target = selectedChain[targetStep];
    if (!current || !target) return { power: 0, agile: 0, intelligence: 0, life: 0 };
    return {
      power: (target.power || 0) - (current.power || 0),
      agile: (target.agile || 0) - (current.agile || 0),
      intelligence: (target.intelligence || 0) - (current.intelligence || 0),
      life: (target.life || 0) - (current.life || 0)
    };
  }, [selectedChain, currentStep, targetStep]);

  if (loading) return <LoadingState message="Decoding Culling Game and Magic database tables..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
            <Link to="/" className="hover:text-subtle transition-colors">Dashboard</Link>
            <ChevronRight size={12} />
            <span className="text-muted">Tools</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text flex items-center gap-2.5">
            <Swords className="text-red-500 animate-pulse" size={28} />
            Culling Game & Magic training Auditor
          </h1>
          <p className="text-xs text-muted mt-1">
            Analyze endless abyss trial drops, culling stage layouts, and optimize culling magic training requirements.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-bg p-1.5 rounded-xl border border-border self-end">
          <button
            onClick={() => setActiveTab('stages')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'stages'
                ? 'bg-surface text-text shadow-sm'
                : 'text-muted hover:text-text dark:hover:text-zinc-200'
            }`}
          >
            Endless Abyss stages
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'calculator'
                ? 'bg-surface text-text shadow-sm'
                : 'text-muted hover:text-text dark:hover:text-zinc-200'
            }`}
          >
            Magic Upgrades Optimizer
          </button>
        </div>
      </div>

      {activeTab === 'stages' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Left Column: Culling Floors selection */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
              <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Abyss Floors</span>
              
              <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                {stages.map((stage) => {
                  const isSelected = selectedStageId === stage.id;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => setSelectedStageId(stage.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400 shadow-sm'
                          : 'border-border bg-bg/50 hover:border-border text-muted'
                      }`}
                    >
                      <span>{stage.name || `Floor #${stage.id}`}</span>
                      <span className="font-mono text-[9px] text-subtle bg-bg px-2 py-0.5 rounded">
                        Lv. {stage.need_level}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Stage Details & Drops list */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Boss Encounter card */}
            <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-5">
              <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Floor Encounter Boss Profile</span>
              
              {activeStage ? (
                <div className="space-y-5">
                  <div className="flex justify-between items-start pb-3 border-b border-border/60">
                    <div>
                      <h3 className="font-black text-base text-text">
                        {activeStage.name || `Floor #${activeStage.id}`}
                      </h3>
                      <p className="text-[10px] text-subtle mt-1 font-mono">
                        Location Index: {activeStage.location} | Entry level limit: {activeStage.need_level}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-red-500/10 text-red-700 dark:text-red-400 uppercase">
                      Tactical Altar
                    </span>
                  </div>

                  {/* Boss Attributes block */}
                  {activeBoss ? (
                    <div className="space-y-4">
                      <span className="text-[9.5px] font-semibold text-subtle uppercase block">Boss Combat Properties</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        
                        <div className="p-3 bg-bg/20 border border-border/50 rounded-xl">
                          <span className="text-subtle text-[9px] uppercase block mb-0.5 font-bold">Health (HP)</span>
                          <span className="font-mono font-black text-text text-sm">
                            {activeBoss.life.toLocaleString()}
                          </span>
                        </div>

                        <div className="p-3 bg-bg/20 border border-border/50 rounded-xl">
                          <span className="text-subtle text-[9px] uppercase block mb-0.5 font-bold">Strength</span>
                          <span className="font-mono font-black text-text text-sm">
                            {activeBoss.power.toLocaleString()}
                          </span>
                        </div>

                        <div className="p-3 bg-bg/20 border border-border/50 rounded-xl">
                          <span className="text-subtle text-[9px] uppercase block mb-0.5 font-bold">Agility</span>
                          <span className="font-mono font-black text-text text-sm">
                            {activeBoss.agile.toLocaleString()}
                          </span>
                        </div>

                        <div className="p-3 bg-bg/20 border border-border/50 rounded-xl">
                          <span className="text-subtle text-[9px] uppercase block mb-0.5 font-bold">Wisdom</span>
                          <span className="font-mono font-black text-text text-sm">
                            {activeBoss.intelligence.toLocaleString()}
                          </span>
                        </div>

                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-bg/20 border border-border/60 rounded-xl text-center text-xs text-subtle italic">
                      Boss stats parameters not defined for this stage level.
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-subtle italic">
                  Select a floor to view details.
                </div>
              )}
            </div>

            {/* Floor Loot Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* First Clear rewards */}
              <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
                <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">First-Clear Drop Package</span>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {firstClearAwards.length > 0 ? (
                    firstClearAwards.map((item, idx) => (
                      <div key={idx} className="p-2.5 border border-border/80 bg-bg/20 dark:bg-bg/15 rounded-xl flex items-center justify-between text-xs font-bold">
                        <span className="text-muted">{item.name}</span>
                        <span className="font-mono text-red-600 dark:text-red-400 font-bold">{item.amount.toLocaleString()}x</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-subtle italic">
                      No first-clear drop package registered.
                    </div>
                  )}
                </div>
              </div>

              {/* Daily sweeps drops */}
              <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
                <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Daily Extra Sweep Drops</span>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {extraAwards.length > 0 ? (
                    extraAwards.map((item, idx) => (
                      <div key={idx} className="p-2.5 border border-border/80 bg-bg/20 dark:bg-bg/15 rounded-xl flex items-center justify-between text-xs font-bold">
                        <span className="text-muted">{item.name}</span>
                        <span className="font-mono text-text font-bold">{item.amount.toLocaleString()}x</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-subtle italic">
                      No extra sweep drops registered.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      ) : (
        /* Culling Magic Optimizer Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Settings panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
              <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Configure Magic Node</span>
              
              {/* Magic Category Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-subtle uppercase block mb-1">Select Magic Force</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { type: 1, label: 'Vanguard Force', desc: 'HP & Defense boost' },
                    { type: 2, label: 'Attacker Force', desc: 'Attack & Crit boost' },
                    { type: 3, label: 'Support Force', desc: 'Speed & Heal boost' },
                    { type: 4, label: 'Wind Force', desc: 'Awakened stats boost' }
                  ].map((m) => (
                    <button
                      key={m.type}
                      onClick={() => setSelectedMagicType(m.type)}
                      className={`text-left p-3 rounded-xl border text-xs font-bold transition-all ${
                        selectedMagicType === m.type
                          ? 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-400'
                          : 'border-border bg-bg/50 hover:border-border text-muted'
                      }`}
                    >
                      <div className="font-extrabold text-sm">{m.label}</div>
                      <span className="text-[10px] text-subtle block font-normal mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Levels range Selector */}
              {selectedChain.length > 0 && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-subtle uppercase block">Current Step</label>
                    <select
                      value={currentStep}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setCurrentStep(val);
                        if (val >= targetStep) {
                          setTargetStep(Math.min(selectedChain.length - 1, val + 1));
                        }
                      }}
                      className="w-full px-3 py-2 border border-border rounded-xl bg-bg text-xs font-bold text-text focus:outline-none"
                    >
                      {selectedChain.map((step, idx) => (
                        <option key={idx} value={idx}>
                          Step {idx} ({step.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-subtle uppercase block">Target Step</label>
                    <select
                      value={targetStep}
                      onChange={(e) => setTargetStep(Math.max(currentStep + 1, parseInt(e.target.value)))}
                      className="w-full px-3 py-2 border border-border rounded-xl bg-bg text-xs font-bold text-text focus:outline-none"
                    >
                      {selectedChain.map((step, idx) => (
                        <option key={idx} value={idx} disabled={idx <= currentStep}>
                          Step {idx} ({step.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Calculator Output and Optimization panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Required Resources Card */}
            <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-5">
              <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Required Training Resources</span>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Silver Practice */}
                <div className="p-4 bg-bg/20 border border-border rounded-xl flex flex-col gap-1 text-xs">
                  <span className="font-bold text-subtle flex items-center gap-1 uppercase text-[10px]">
                    <Coins size={14} className="text-subtle" />
                    Silver Practice Cost
                  </span>
                  <div className="mt-2 font-mono font-black text-text text-base">
                    {trainingCalculations.silver.toLocaleString()} Silver
                  </div>
                  <span className="text-[10px] text-subtle mt-1 font-normal block">
                    Requires {trainingCalculations.silverSteps.toLocaleString()} practice attempts.
                  </span>
                </div>

                {/* Gold Practice */}
                <div className="p-4 bg-bg/20 border border-border rounded-xl flex flex-col gap-1 text-xs">
                  <span className="font-bold text-subtle flex items-center gap-1 uppercase text-[10px]">
                    <Sparkles size={14} className="text-violet-500" />
                    Gold Practice Cost
                  </span>
                  <div className="mt-2 font-mono font-black text-violet-600 dark:text-violet-400 text-base">
                    {trainingCalculations.gold.toLocaleString()} Gold
                  </div>
                  <span className="text-[10px] text-subtle mt-1 font-normal block">
                    Requires {trainingCalculations.goldSteps.toLocaleString()} practice attempts.
                  </span>
                </div>

                {/* Fragment Practice */}
                <div className="p-4 bg-bg/20 border border-border rounded-xl flex flex-col gap-1 text-xs">
                  <span className="font-bold text-subtle flex items-center gap-1 uppercase text-[10px]">
                    <Gem size={14} className="text-emerald-500" />
                    Fragments Required
                  </span>
                  <div className="mt-2 font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                    {trainingCalculations.items.toLocaleString()} Fragments
                  </div>
                  <span className="text-[10px] text-subtle mt-1 font-normal block font-sans">
                    Requires {trainingCalculations.itemSteps.toLocaleString()} practice attempts ({selectedMagicType === 4 ? 'Awakened' : 'Normal'}).
                  </span>
                </div>
              </div>

              {/* Training Progression parameters info */}
              <div className="p-4 bg-bg/30 rounded-xl border border-border flex items-center gap-3 text-xs leading-normal text-muted italic">
                <Info size={24} className="text-violet-500 shrink-0" />
                <p>
                  Optimized for total experience of <span className="font-bold font-mono text-muted">+{trainingCalculations.totalExp.toLocaleString()} Exp</span> to advance from Step {currentStep} to Step {targetStep}. Values correspond to the training coefficients at your current tier.
                </p>
              </div>
            </div>

            {/* Total Stats Gain Card */}
            <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
              <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Cumulative Attribute Increases</span>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-3 bg-bg/50 rounded-xl border border-border flex flex-col gap-0.5">
                  <span className="text-[9px] text-subtle font-sans font-bold uppercase">Power Boost</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    +{statGains.power.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 bg-bg/50 rounded-xl border border-border flex flex-col gap-0.5">
                  <span className="text-[9px] text-subtle font-sans font-bold uppercase">Agility Boost</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    +{statGains.agile.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 bg-bg/50 rounded-xl border border-border flex flex-col gap-0.5">
                  <span className="text-[9px] text-subtle font-sans font-bold uppercase">Wisdom Boost</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    +{statGains.intelligence.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 bg-bg/50 rounded-xl border border-border flex flex-col gap-0.5">
                  <span className="text-[9px] text-subtle font-sans font-bold uppercase">HP Life Boost</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    +{statGains.life.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
