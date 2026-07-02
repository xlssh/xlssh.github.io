import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadSpiritSchools, loadSpiritSchoolExps } from '../data/loaders';
import { SpiritSchool, SpiritSchoolExp } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { 
  Zap, Shield, Heart, Activity, Swords, Wand2, Info, ChevronRight,
  TrendingUp, BarChart3, HelpCircle, Compass, CheckCircle2, Award
} from 'lucide-react';

const ALTARS_METADATA: Record<number, { name: string; stat: string; icon: any; color: string; desc: string }> = {
  18301000: { name: 'Brave Beast Soul', stat: 'Physical ATK', icon: Swords, color: 'rose', desc: 'Boosts physical penetration and strike damage.' },
  18302000: { name: 'Fortitude Beast Soul', stat: 'Physical DEF', icon: Shield, color: 'blue', desc: 'Blocks enemy physical attacks and reduces heavy damage.' },
  18303000: { name: 'Wisdom Beast Soul', stat: 'Kido ATK', icon: Wand2, color: 'indigo', desc: 'Improves spell power, Kido spells, and tactical damage.' },
  18304000: { name: 'Insight Beast Soul', stat: 'Kido DEF', icon: Shield, color: 'teal', desc: 'Increases spiritual defense against enemy Kido casts.' },
  18305000: { name: 'Agility Beast Soul', stat: 'Speed', icon: Activity, color: 'amber', desc: 'Determines battlefield action sequence and turn order.' },
  18306000: { name: 'Vigor Beast Soul', stat: 'HP Pool', icon: Heart, color: 'emerald', desc: 'Improves total stamina and overall combat durability.' },
};

export const BeastSoulsPlannerPage: React.FC = () => {
  const [spiritSchools, setSpiritSchools] = useState<SpiritSchool[]>([]);
  const [spiritSchoolExps, setSpiritSchoolExps] = useState<SpiritSchoolExp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selections
  const [selectedAltarId, setSelectedAltarId] = useState<number>(18301000); // Brave Beast Soul
  const [startLevel, setStartLevel] = useState<number>(0);
  const [endLevel, setEndLevel] = useState<number>(100);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [schoolsRes, expsRes] = await Promise.all([
          loadSpiritSchools(),
          loadSpiritSchoolExps()
        ]);
        setSpiritSchools(schoolsRes.rows);
        setSpiritSchoolExps(expsRes.rows);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load Beast Souls database.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeAltarExps = useMemo(() => {
    return spiritSchoolExps
      .filter(e => e.monster_id === selectedAltarId)
      .sort((a, b) => a.monster_level - b.monster_level);
  }, [spiritSchoolExps, selectedAltarId]);

  // Adjust sliders
  useEffect(() => {
    if (activeAltarExps.length > 0) {
      const maxLvl = activeAltarExps[activeAltarExps.length - 1].monster_level;
      if (endLevel > maxLvl) setEndLevel(maxLvl);
    }
  }, [selectedAltarId, activeAltarExps]);

  useEffect(() => {
    if (startLevel > endLevel) {
      setEndLevel(startLevel);
    }
  }, [startLevel]);

  useEffect(() => {
    if (endLevel < startLevel) {
      setStartLevel(endLevel);
    }
  }, [endLevel]);

  // Simulation calculations
  const simulationResults = useMemo(() => {
    if (activeAltarExps.length === 0) return null;

    let totalExp = 0;
    
    // Find matching level records
    const startRecord = activeAltarExps.find(e => e.monster_level === startLevel) || activeAltarExps[0];
    const endRecord = activeAltarExps.find(e => e.monster_level === endLevel) || activeAltarExps[activeAltarExps.length - 1];

    // Accumulate exp between start and end level
    for (let l = startLevel; l < endLevel; l++) {
      const record = activeAltarExps.find(e => e.monster_level === l);
      if (record) {
        totalExp += record.need_exp;
      }
    }

    const startStat = startRecord.add_type;
    const endStat = endRecord.add_type;
    const statDiff = Math.max(0, endStat - startStat);

    // EXP Item Estimation: assume 1 Beast Soul Pill equals 100 EXP
    const expPills = Math.ceil(totalExp / 100);

    return {
      startStat,
      endStat,
      statDiff,
      totalExp,
      expPills
    };
  }, [activeAltarExps, startLevel, endLevel]);

  if (loading) return <LoadingState message="Decoding Beast Souls Altar matrix..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const activeMeta = ALTARS_METADATA[selectedAltarId];
  const maxSimLevel = activeAltarExps.length > 0 ? activeAltarExps[activeAltarExps.length - 1].monster_level : 500;

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
            <BarChart3 className="text-indigo-500" size={28} />
            Beast Souls Upgrade Planner
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Calculate level progression costs, experience curve requirements, and stat scaling for all 6 Beast Soul Altars.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Altar Selection Grid */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm space-y-4">
            <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Select Beast Soul Altar</span>
            
            <div className="space-y-2">
              {Object.entries(ALTARS_METADATA).map(([idStr, meta]) => {
                const id = parseInt(idStr);
                const Icon = meta.icon;
                const isSelected = selectedAltarId === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedAltarId(id)}
                    className={`w-full flex items-center justify-between p-3.5 border rounded-xl transition-all text-left ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold shadow-sm shadow-indigo-500/5'
                        : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 hover:border-zinc-200 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 ${isSelected ? 'text-indigo-500 bg-indigo-500/10' : 'text-zinc-400'}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-bold block">{meta.name}</span>
                        <span className="text-[9px] text-zinc-450 uppercase">{meta.stat}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-zinc-400" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Level Simulator & Cost results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm space-y-6">
            
            {/* Overview details */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-zinc-100 dark:border-zinc-800/60 gap-4">
              <div>
                <span className="text-[9px] font-mono text-zinc-400 uppercase block">Active Altar Spec</span>
                <h3 className="font-black text-lg text-zinc-850 dark:text-zinc-100">
                  {activeMeta?.name}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold font-mono">
                Adds {activeMeta?.stat}
              </span>
            </div>

            {/* Altar Description block */}
            <div className="p-3 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-850 rounded-xl space-y-1">
              <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">Altar Buff Description</span>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                {activeMeta?.desc} Active level range goes up to **Level {maxSimLevel}**.
              </p>
            </div>

            {/* Slider Setup */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Start Level slider */}
              <div className="p-4 border border-zinc-100 dark:border-zinc-855 bg-zinc-50/20 dark:bg-zinc-950/10 rounded-xl space-y-3">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">Starting Altar Level</span>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-450">Select Level</span>
                  <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">Lv. {startLevel}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={maxSimLevel}
                  value={startLevel}
                  onChange={(e) => setStartLevel(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Target Level slider */}
              <div className="p-4 border border-zinc-100 dark:border-zinc-855 bg-zinc-50/20 dark:bg-zinc-950/10 rounded-xl space-y-3">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">Target Altar Level</span>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-450">Select Level</span>
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">Lv. {endLevel}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={maxSimLevel}
                  value={endLevel}
                  onChange={(e) => setEndLevel(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

            </div>

            {/* Calculations display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
              
              {/* Stat gain */}
              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Stat progression details</span>
                <div className="p-4 bg-zinc-50/40 dark:bg-zinc-950/15 border border-zinc-150/45 dark:border-zinc-850 rounded-xl space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="block text-[8px] text-zinc-400 uppercase font-mono">Current Stat</span>
                      <span className="font-mono font-bold text-zinc-700 dark:text-zinc-350">
                        +{simulationResults?.startStat.toLocaleString()}
                      </span>
                    </div>
                    <ChevronRight className="text-zinc-350" size={16} />
                    <div className="text-right">
                      <span className="block text-[8px] text-zinc-400 uppercase font-mono">Target Stat</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        +{simulationResults?.endStat.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-indigo-500/5 border border-indigo-500/25 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-650 dark:text-zinc-300">Total Net Gain</span>
                    <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <TrendingUp size={12} />
                      +{simulationResults?.statDiff.toLocaleString()} {activeMeta?.stat}
                    </span>
                  </div>
                </div>
              </div>

              {/* Exp summary */}
              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Exp Costs Summary</span>
                <div className="p-4 bg-zinc-50/40 dark:bg-zinc-950/15 border border-zinc-150/45 dark:border-zinc-850 rounded-xl space-y-3.5 text-xs">
                  
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800/40">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Total EXP Needed</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">
                      {simulationResults?.totalExp.toLocaleString()} EXP
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 block">Beast Soul EXP Pills</span>
                      <span className="text-[9px] text-zinc-450 italic">Estimated at 100 EXP/pill</span>
                    </div>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {simulationResults?.expPills.toLocaleString()}x Pills
                    </span>
                  </div>

                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
