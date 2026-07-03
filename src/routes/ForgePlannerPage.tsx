import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadEquipForging, loadEquipAdvancement, loadArticles } from '../data/loaders';
import { EquipForging, EquipAdvancement, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { 
  Wand2, Shield, Sparkles, Swords, Info, ChevronRight,
  TrendingUp, Compass, ArrowRight, CheckCircle2, Award
} from 'lucide-react';

export const ForgePlannerPage: React.FC = () => {
  const [forgings, setForgings] = useState<EquipForging[]>([]);
  const [advancements, setAdvancements] = useState<EquipAdvancement[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selections
  const [selectedBaseItemId, setSelectedBaseItemId] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [forgeRes, advRes, artRes] = await Promise.all([
          loadEquipForging(),
          loadEquipAdvancement(),
          loadArticles()
        ]);
        setForgings(forgeRes.rows);
        setAdvancements(advRes.rows);
        setArticles(artRes.rows);
        
        // Select first available base item that is in the forging table
        if (forgeRes.rows.length > 0) {
          setSelectedBaseItemId(forgeRes.rows[0].id);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load Equipment Forging database.');
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

  // List of all base equipment items available for forging
  const baseItemsList = useMemo(() => {
    return forgings.map(f => {
      const art = articlesMap[f.id];
      return {
        id: f.id,
        name: art ? art.name : `Cyclone Item #${f.id}`,
        level: (art && art.level !== null) ? art.level : 85
      };
    }).sort((a, b) => b.level - a.level || a.id - b.id);
  }, [forgings, articlesMap]);

  // Selected upgrading chain details
  const upgradeChain = useMemo(() => {
    if (selectedBaseItemId === 0) return null;
    
    // Step 1: Base to Forged
    const forgeStep = forgings.find(f => f.id === selectedBaseItemId);
    if (!forgeStep) return null;
    
    const baseArt = articlesMap[forgeStep.id];
    const forgedArt = articlesMap[forgeStep.target_item_id];
    
    // Step 2: Forged to Advanced
    const advStep = advancements.find(a => a.id === forgeStep.target_item_id);
    const advancedArt = advStep ? articlesMap[advStep.target_item_id] : null;

    return {
      baseId: forgeStep.id,
      baseName: baseArt?.name || `Item #${forgeStep.id}`,
      baseLevel: baseArt?.level || 85,
      baseDesc: baseArt?.function_desc || '',
      
      forgedId: forgeStep.target_item_id,
      forgedName: forgedArt?.name || `Forged #${forgeStep.target_item_id}`,
      forgedLevel: forgedArt?.level || 100,
      forgedDesc: forgedArt?.function_desc || '',
      forgeCost: forgeStep.material_amount,
      
      advancedId: advStep?.target_item_id || 0,
      advancedName: advancedArt?.name || 'Firelord Ultimate Tier',
      advancedLevel: advancedArt?.level || 120,
      advancedDesc: advancedArt?.function_desc || '',
      advanceCost: advStep?.material_amount || 0
    };
  }, [selectedBaseItemId, forgings, advancements, articlesMap]);

  // Clean html helper for descriptions
  const cleanHtml = (htmlStr: string) => {
    if (!htmlStr) return 'No spec details available.';
    return htmlStr
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  };

  if (loading) return <LoadingState message="Decoding equipment evolution trees..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
            <Link to="/" className="hover:text-subtle transition-colors">Dashboard</Link>
            <ChevronRight size={12} />
            <span className="text-muted">Tools</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text flex items-center gap-2.5">
            <Wand2 className="text-amber-500" size={28} />
            Advanced Equipment Forging & Star Planner
          </h1>
          <p className="text-xs text-muted mt-1">
            Simulate Cyclone to Aquaria/Firelord upgrades, calculate forging crystals, and check gear stat boosts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Equipment selection list */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Select Base Equipment</span>
            
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {baseItemsList.map((item) => {
                const isSelected = selectedBaseItemId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedBaseItemId(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-sm'
                        : 'border-border bg-bg/50 hover:border-border text-muted'
                    }`}
                  >
                    <span className="truncate pr-2">{item.name}</span>
                    <span className="font-mono text-[9px] text-subtle whitespace-nowrap">Lv. {item.level}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Upgrading Path details */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-6">
            <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Upgrade Progression Path</span>
            
            {upgradeChain ? (
              <div className="space-y-6">
                
                {/* 3 Step upgrading process chain */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-xs pt-2">
                  
                  {/* Step 1: Base Cyclone Gear */}
                  <div className="p-4 border border-border bg-bg/25 dark:bg-bg/10 rounded-xl w-full md:w-1/3 text-center space-y-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-surface-raised text-muted uppercase font-mono">
                      Tier 1: Base
                    </span>
                    <span className="font-bold text-text dark:text-zinc-250 block line-clamp-1">
                      {upgradeChain.baseName}
                    </span>
                    <span className="text-[10px] text-subtle block font-mono">Lv. {upgradeChain.baseLevel}</span>
                  </div>

                  {/* Transition 1 Arrow */}
                  <div className="flex flex-col items-center">
                    <ArrowRight className="text-amber-500 rotate-90 md:rotate-0" size={16} />
                    <span className="text-[8px] text-subtle font-bold font-mono mt-0.5">
                      Cost: {upgradeChain.forgeCost}x Crystals
                    </span>
                  </div>

                  {/* Step 2: Refined Aquaria Gear */}
                  <div className="p-4 border border-amber-500/25 bg-amber-500/5 rounded-xl w-full md:w-1/3 text-center space-y-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase font-mono">
                      Tier 2: Refined
                    </span>
                    <span className="font-bold text-amber-700 dark:text-amber-400 block line-clamp-1">
                      {upgradeChain.forgedName}
                    </span>
                    <span className="text-[10px] text-subtle block font-mono">Lv. {upgradeChain.forgedLevel}</span>
                  </div>

                  {/* Transition 2 Arrow */}
                  {upgradeChain.advancedId > 0 && (
                    <div className="flex flex-col items-center">
                      <ArrowRight className="text-fuchsia-500 rotate-90 md:rotate-0" size={16} />
                      <span className="text-[8px] text-subtle font-bold font-mono mt-0.5">
                        Cost: {upgradeChain.advanceCost}x Stones
                      </span>
                    </div>
                  )}

                  {/* Step 3: Advanced Firelord Gear */}
                  {upgradeChain.advancedId > 0 && (
                    <div className="p-4 border border-fuchsia-500/25 bg-fuchsia-500/5 rounded-xl w-full md:w-1/3 text-center space-y-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 uppercase font-mono">
                        Tier 3: Ultimate
                      </span>
                      <span className="font-bold text-fuchsia-700 dark:text-fuchsia-450 block line-clamp-1">
                        {upgradeChain.advancedName}
                      </span>
                      <span className="text-[10px] text-subtle block font-mono">Lv. {upgradeChain.advancedLevel}</span>
                    </div>
                  )}

                </div>

                {/* Stat gains detail cards */}
                <div className="space-y-4 pt-4 border-t border-border/60">
                  <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">Equipment Attribute Details</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    
                    {/* Forged step attributes */}
                    <div className="p-4 bg-bg/50 border border-border rounded-xl space-y-2">
                      <span className="font-bold text-text block border-b border-border pb-1.5">
                        Refining Stage (Tier 1 ➔ Tier 2)
                      </span>
                      <div className="space-y-1">
                        <span className="text-[9px] text-subtle uppercase block font-mono">Refined Stats addition</span>
                        <p className="text-[10.5px] text-muted italic">
                          {cleanHtml(upgradeChain.forgedDesc)}
                        </p>
                      </div>
                    </div>

                    {/* Advanced step attributes */}
                    {upgradeChain.advancedId > 0 && (
                      <div className="p-4 bg-bg/50 border border-border rounded-xl space-y-2">
                        <span className="font-bold text-text block border-b border-border pb-1.5">
                          Ultimate Stage (Tier 2 ➔ Tier 3)
                        </span>
                        <div className="space-y-1">
                          <span className="text-[9px] text-subtle uppercase block font-mono">Ultimate Stats addition</span>
                          <p className="text-[10.5px] text-muted italic">
                            {cleanHtml(upgradeChain.advancedDesc)}
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

              </div>
            ) : (
              <div className="py-8 text-center text-xs text-subtle italic">
                Select an equipment item to display its upgrade chain.
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
