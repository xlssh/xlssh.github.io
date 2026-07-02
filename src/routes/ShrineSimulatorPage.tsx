import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadArticles, loadTemplePoints, loadTempleValues, loadTemplePVPs, loadTemplePlies } from '../data/loaders';
import { Article, TemplePoint, TempleValue, TemplePVP, TemplePliesNumber } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { 
  Trophy, Shield, AlertCircle, Sparkles, ChevronRight, Swords,
  Activity, Star, Heart, Award, ArrowRight, Dices, ShieldCheck
} from 'lucide-react';

const SHRINE_TIERS = [
  { id: 1, name: 'Rukongai Gateways', startId: 1, endId: 80, bg: 'from-amber-500/10 to-orange-500/5 border-orange-500/20' },
  { id: 2, name: 'Seireitei Altars', startId: 81, endId: 160, bg: 'from-blue-500/10 to-indigo-500/5 border-indigo-500/20' },
  { id: 3, name: 'Senkaimon Portals', startId: 161, endId: 240, bg: 'from-purple-500/10 to-fuchsia-500/5 border-fuchsia-500/20' },
  { id: 4, name: 'Soul King Palace Shrine', startId: 241, endId: 360, bg: 'from-rose-500/10 to-red-500/5 border-red-500/20' },
];

export const ShrineSimulatorPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [points, setPoints] = useState<TemplePoint[]>([]);
  const [values, setValues] = useState<TempleValue[]>([]);
  const [pvps, setPvps] = useState<TemplePVP[]>([]);
  const [plies, setPlies] = useState<TemplePliesNumber[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selector state
  const [selectedTier, setSelectedTier] = useState<number>(1);
  const [selectedPointId, setSelectedPointId] = useState<number>(1);
  const [altarLevel, setAltarLevel] = useState<number>(1);

  // Roll simulator state
  const [rollResult, setRollResult] = useState<{ status: 'idle' | 'success' | 'fail'; msg: string }>({ status: 'idle', msg: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [artRes, ptsRes, valRes, pvpRes, pliesRes] = await Promise.all([
          loadArticles(),
          loadTemplePoints(),
          loadTempleValues(),
          loadTemplePVPs(),
          loadTemplePlies()
        ]);
        setArticles(artRes.rows);
        setPoints(ptsRes.rows);
        setValues(valRes.rows);
        setPvps(pvpRes.rows);
        setPlies(pliesRes.rows);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load Temple Shrine databases.');
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

  const activeTier = useMemo(() => {
    return SHRINE_TIERS.find(t => t.id === selectedTier) || SHRINE_TIERS[0];
  }, [selectedTier]);

  // Points in this tier
  const tierPoints = useMemo(() => {
    return points
      .filter(p => p.id >= activeTier.startId && p.id <= activeTier.endId)
      .sort((a, b) => a.id - b.id);
  }, [points, activeTier]);

  // Set default selected point when tier changes
  useEffect(() => {
    if (tierPoints.length > 0) {
      setSelectedPointId(tierPoints[0].id);
      setRollResult({ status: 'idle', msg: '' });
    }
  }, [tierPoints]);

  const activePoint = useMemo(() => {
    return points.find(p => p.id === selectedPointId) || null;
  }, [points, selectedPointId]);

  // Altar level config lookup
  const activeLevelConfig = useMemo(() => {
    // Altar level maps to row ID or level index
    const levelRow = values.find(v => v.id === altarLevel) || values[0];
    return levelRow || null;
  }, [values, altarLevel]);

  // Simulate upgrade roll
  const triggerUpgradeRoll = () => {
    if (!activeLevelConfig) return;
    
    const rate = activeLevelConfig.flush_spirit_successrate || 100;
    const roll = Math.random() * 100;

    if (roll <= rate) {
      setRollResult({
        status: 'success',
        msg: `🎉 Success! Altar upgraded to Level ${altarLevel + 1}!`
      });
      setAltarLevel(prev => Math.min(prev + 1, values.length));
    } else {
      setRollResult({
        status: 'fail',
        msg: `❌ Upgrade failed! (${rate}% success rate). Protection Charm prevented level drop.`
      });
    }
  };

  if (loading) return <LoadingState message="Decoding Temple & Shrine Altars..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-xs font-semibold mb-1">
            <Link to="/" className="hover:text-zinc-300 transition-colors">Dashboard</Link>
            <ChevronRight size={12} />
            <span className="text-zinc-500 dark:text-zinc-400">Tools</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Trophy className="text-amber-500" size={28} />
            Soul Society Shrine & Temple Simulator
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Track temple nodes paths, calculate altar level-up coefficients, and simulate flush spirit offering rolls.
          </p>
        </div>
      </div>

      {/* Tier Selector altars */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {SHRINE_TIERS.map((tier) => (
          <button
            key={tier.id}
            onClick={() => setSelectedTier(tier.id)}
            className={`p-5 rounded-2xl border text-left bg-gradient-to-br transition-all ${
              selectedTier === tier.id
                ? `${tier.bg} border-amber-500 shadow-sm scale-[1.02]`
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300'
            }`}
          >
            <span className="text-[10px] text-zinc-400 font-mono block">Tier {tier.id}</span>
            <span className="text-sm font-extrabold text-zinc-850 dark:text-zinc-100 block mt-1">{tier.name}</span>
            <span className="text-[10px] text-zinc-400 block mt-2">Gates {tier.startId} - {tier.endId}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Gates Timeline list */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm space-y-4">
            <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Gates Checklist</span>
            
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {tierPoints.map((pt) => {
                const isSelected = selectedPointId === pt.id;
                return (
                  <button
                    key={pt.id}
                    onClick={() => setSelectedPointId(pt.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-sm'
                        : 'border-zinc-50 dark:border-zinc-950 bg-zinc-50/50 dark:bg-zinc-950/20 hover:border-zinc-200 text-zinc-650 dark:text-zinc-305'
                    }`}
                  >
                    <span>{pt.name || `Gate #${pt.id}`}</span>
                    <div className="flex items-center gap-1 font-mono text-[9px] text-zinc-400">
                      <span>Index {pt.id}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Altar details & upgrade simulator */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Node details */}
          <div className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm space-y-5">
            <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Gate Details</span>
            
            {activePoint ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
                  <div>
                    <h3 className="font-black text-base text-zinc-850 dark:text-zinc-100">
                      {activePoint.name || `Gate #${activePoint.id}`}
                    </h3>
                    <span className="text-[10px] text-zinc-450 font-mono">Battle Scene: {activePoint.battle_scene}</span>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[9px] text-zinc-400 block uppercase font-mono">Sweep Cost</span>
                    <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-400">
                      {activePoint.akey_price.toLocaleString()} Silver
                    </span>
                  </div>
                </div>

                {/* Linking details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/30 dark:bg-zinc-950/5 rounded-xl space-y-1">
                    <span className="font-semibold text-zinc-450 uppercase text-[9px] block">Next Gate Target</span>
                    <div className="flex items-center gap-1.5">
                      <ArrowRight size={14} className="text-amber-500" />
                      <span className="font-bold text-zinc-750 dark:text-zinc-250">
                        {activePoint.next_point_id > 0 ? `Gate #${activePoint.next_point_id}` : 'End Altar'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/30 dark:bg-zinc-950/5 rounded-xl space-y-1">
                    <span className="font-semibold text-zinc-450 uppercase text-[9px] block">Enemy Armies Assigned</span>
                    <div className="flex items-center gap-1.5">
                      <Swords size={14} className="text-red-500" />
                      <span className="font-bold text-zinc-750 dark:text-zinc-250">
                        {activePoint.army_ids.length > 0 ? activePoint.army_ids.join(', ') : 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-zinc-400 italic">
                Select a gate node to inspect.
              </div>
            )}
          </div>

          {/* Offerings & Flush Spirit Upgrade simulator */}
          <div className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm space-y-5">
            <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Flush Spirit Offerings Simulator</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Offering State */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-bold">Offerings Altar Level</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">Lv. {altarLevel}</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] text-zinc-400 block uppercase font-mono">Level Multipliers</span>
                  <div className="p-3 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800/60 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-450">Base Buff Factor</span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        x{activeLevelConfig?.level_coefficient.toFixed(2) || '1.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-450">Altar Type Factor</span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        x{activeLevelConfig?.type_coefficient.toFixed(2) || '1.00'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upgrade simulator offering */}
              <div className="space-y-4 p-4 border border-amber-500/25 bg-amber-500/5 rounded-xl flex flex-col justify-between">
                <div className="space-y-2 text-xs">
                  <span className="text-[10px] text-zinc-400 block uppercase font-mono">Offerings Cost</span>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-zinc-750 dark:text-zinc-300">Energy Consume:</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">
                      {activeLevelConfig?.flush_spirit_consume.toLocaleString() || '10'} Spirit
                    </span>
                  </div>

                  {/* Consumed stones */}
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-zinc-750 dark:text-zinc-300">Upgrade Materials:</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">
                      {activeLevelConfig?.flush_spirit_stone.map(code => articlesMap[code]?.name || `Stone #${code}`).join(', ') || 'Altars Stones'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-zinc-750 dark:text-zinc-300">Success Rate:</span>
                    <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                      {activeLevelConfig?.flush_spirit_successrate ?? 100}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={triggerUpgradeRoll}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Dices size={14} />
                    Simulate Offering Upgrade
                  </button>
                  
                  {rollResult.status !== 'idle' && (
                    <div className={`p-2.5 rounded-lg text-center text-[10.5px] font-bold ${
                      rollResult.status === 'success' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600'
                    }`}>
                      {rollResult.msg}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
