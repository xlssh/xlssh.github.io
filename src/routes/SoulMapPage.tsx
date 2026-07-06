import React, { useEffect, useState, useMemo } from 'react';
import { loadStarMaps, loadStarPoints } from '../data/loaders';
import type { StarMap, StarPoint } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getQualityLabel, getQualityColorClass } from './HeroesPage';
import { getProfessionLabel } from '../data/relationships';
import { Compass, Star, Sparkles, Zap, Shield, RotateCcw, Award } from 'lucide-react';

// Attribute type labels
const ATTR_LABELS: Record<number, string> = {
  1: 'STR', 2: 'AGI', 3: 'INT', 4: 'HP', 11: 'Speed',
  16: 'Phys ATK', 17: 'Phys DEF', 20: 'Kido ATK', 21: 'Kido DEF',
  100: 'Skill Unlock',
};

function formatAddType(addType: any): string {
  if (!addType?.add) return 'None';
  return addType.add.map((a: any) => {
    const label = ATTR_LABELS[a.type] || `Type ${a.type}`;
    if (a.type === 100) return `Skill #${a.value}`;
    return `+${a.value} ${label}`;
  }).join(', ');
}

export const SoulMapPage: React.FC = () => {
  const [maps, setMaps] = useState<StarMap[]>([]);
  const [points, setPoints] = useState<StarPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<number>(0);
  
  // Simulation State: Map of point_id -> active boolean
  const [activeNodes, setActiveNodes] = useState<Record<number, boolean>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mRes, pRes] = await Promise.all([loadStarMaps(), loadStarPoints()]);
      setMaps(mRes.rows);
      setPoints(pRes.rows);
      if (mRes.rows.length > 0) {
        setSelectedMapId(mRes.rows[0].id);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const map = useMemo(() => maps.find(m => m.id === selectedMapId), [maps, selectedMapId]);

  // Points for selected map
  const mapPoints = useMemo(() => {
    if (!selectedMapId) return [];
    return points
      .filter(p => {
        const mapSuffix = selectedMapId % 100;
        return p.map_id === mapSuffix || p.map_id === selectedMapId;
      })
      .sort((a, b) => a.index - b.index);
  }, [points, selectedMapId]);

  // Clear or fill nodes
  const clearAllNodes = () => {
    setActiveNodes({});
  };

  const fillAllNodes = () => {
    const filled: Record<number, boolean> = {};
    mapPoints.forEach(p => {
      filled[p.id] = true;
    });
    setActiveNodes(filled);
  };

  // Toggle active node and enforce progression (prefix nodes must be activated first)
  const toggleNode = (point: StarPoint) => {
    setActiveNodes(prev => {
      const next = { ...prev };
      const isActive = !!prev[point.id];

      if (isActive) {
        // Deactivate this and any subsequent nodes in index order
        mapPoints.forEach(p => {
          if (p.index >= point.index) {
            delete next[p.id];
          }
        });
      } else {
        // Activate this and all previous nodes in index order
        mapPoints.forEach(p => {
          if (p.index <= point.index) {
            next[p.id] = true;
          }
        });
      }
      return next;
    });
  };

  // Simulation telemetry totals
  const telemetry = useMemo(() => {
    let totalSouls = 0;
    const stats: Record<string, number> = { STR: 0, AGI: 0, INT: 0, HP: 0, Speed: 0, 'Phys ATK': 0, 'Phys DEF': 0, 'Kido ATK': 0, 'Kido DEF': 0 };
    const unlockedSkills: string[] = [];

    mapPoints.forEach(p => {
      if (activeNodes[p.id]) {
        totalSouls += p.need_fetch || 0;
        if (p.add_type?.add) {
          p.add_type.add.forEach((a: any) => {
            const label = ATTR_LABELS[a.type];
            if (a.type === 100) {
              unlockedSkills.push(p.name);
            } else if (label && label in stats) {
              stats[label] += a.value;
            }
          });
        }
      }
    });

    return { totalSouls, stats, unlockedSkills };
  }, [mapPoints, activeNodes]);

  // Generate tactical network coordinates dynamically for SVG
  const nodeCoords = useMemo(() => {
    const count = mapPoints.length;
    if (count === 0) return [];
    
    // Layout nodes in a beautiful sinuous/circuit path on SVG space
    return mapPoints.map((p, i) => {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const direction = row % 2 === 0 ? col : 4 - col; // Left-to-right, then right-to-left
      
      const x = 80 + direction * 150;
      const y = 80 + row * 120;
      return { point: p, x, y };
    });
  }, [mapPoints]);

  if (loading) return <LoadingState message="Loading soul map databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in text-text">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-soft text-brand rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.15)]">
            <Compass size={24} className="animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text flex items-center gap-2">
              Soul Map Point Visualizer
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 border border-brand bg-brand-soft text-brand font-mono font-bold rounded">Console HUD</span>
            </h1>
            <p className="text-sm text-muted">Tactical graph mapping out the nodes (Vanguard, Assault, Support) and calculating progression paths.</p>
          </div>
        </div>
      </div>

      {/* Selector & HUD Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="p-4 border border-border bg-surface rounded-xl shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <label className="block text-xs font-bold text-subtle uppercase tracking-wider mb-1.5">Select Active Soul Map</label>
            <select
              value={selectedMapId}
              onChange={(e) => { setSelectedMapId(parseInt(e.target.value)); clearAllNodes(); }}
              className="block w-full py-2.5 px-3 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand font-mono cursor-pointer"
            >
              {maps.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({getQualityLabel(m.quality)} · {getProfessionLabel(m.profession)})</option>
              ))}
            </select>
          </div>
          {map && (
            <div className="mt-4 flex gap-3 text-xs">
              <button
                onClick={fillAllNodes}
                className="px-4 py-2 border border-brand/40 bg-brand-soft/50 text-brand font-bold rounded-lg hover:bg-brand/15 transition-all"
              >
                Simulate Max Map
              </button>
              <button
                onClick={clearAllNodes}
                className="px-4 py-2 border border-border bg-bg/50 text-subtle font-bold rounded-lg hover:bg-hover transition-all flex items-center gap-1.5"
              >
                <RotateCcw size={13} /> Reset Sandbox
              </button>
            </div>
          )}
        </section>

        {/* Live Simulator Totals */}
        {map && (
          <section className="p-4 border border-brand/20 bg-brand-soft/5 rounded-xl shadow-md space-y-2 flex flex-col justify-between">
            <div>
              <div className="text-xs text-subtle uppercase font-bold tracking-widest">Active Simulator Cost</div>
              <div className="text-3xl font-black text-brand font-mono leading-none tracking-tight my-1.5">
                {telemetry.totalSouls.toLocaleString()} <span className="text-xs font-bold uppercase text-subtle">Souls</span>
              </div>
              <div className="text-[11px] text-muted">
                Active Nodes: {Object.keys(activeNodes).length} / {mapPoints.length}
              </div>
            </div>
            <div className="h-2 bg-bg border border-border rounded-full overflow-hidden">
              <div
                className="h-full bg-brand shadow-[0_0_10px_#00f2fe] rounded-full transition-all duration-300"
                style={{ width: `${(Object.keys(activeNodes).length / Math.max(mapPoints.length, 1)) * 100}%` }}
              />
            </div>
          </section>
        )}
      </div>

      {map && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Tactical Graph Visualizer */}
          <section className="p-5 border border-border bg-surface rounded-xl shadow-sm xl:col-span-2 space-y-4">
            <h3 className="font-black text-text flex items-center gap-2 text-sm uppercase tracking-wider">
              <Zap size={16} className="text-brand animate-pulse-slow" />
              Reaper Telemetry Node Network
            </h3>
            
            {/* SVG Visual Canvas */}
            <div className="w-full overflow-x-auto border border-border bg-bg/30 rounded-xl p-4 flex justify-center">
              <div className="relative min-w-[760px] h-[360px]">
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Drawing connecting path wires */}
                  {nodeCoords.map((coord, idx) => {
                    if (idx === 0) return null;
                    const prev = nodeCoords[idx - 1];
                    const isActive = activeNodes[coord.point.id] && activeNodes[prev.point.id];
                    return (
                      <line
                        key={idx}
                        x1={prev.x}
                        y1={prev.y}
                        x2={coord.x}
                        y2={coord.y}
                        stroke={isActive ? 'var(--app-brand)' : 'var(--app-border)'}
                        strokeWidth={isActive ? 3 : 1.5}
                        strokeDasharray={isActive ? 'none' : '4 4'}
                        className="transition-all duration-300"
                      />
                    );
                  })}
                </svg>

                {/* SVG Nodes */}
                {nodeCoords.map((coord) => {
                  const p = coord.point;
                  const isActive = !!activeNodes[p.id];
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleNode(p)}
                      style={{ left: coord.x - 22, top: coord.y - 22 }}
                      className={`absolute w-11 h-11 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-200 focus:outline-none ${isActive ? 'bg-brand-soft border-brand text-brand shadow-[0_0_12px_var(--app-brand)] scale-110 font-black' : p.is_skill ? 'bg-amber-500/5 border-amber-500/50 text-amber-500 hover:border-amber-500 hover:scale-105' : 'bg-surface border-border text-muted hover:border-text hover:text-text hover:scale-105'}`}
                      title={`${p.name}: ${formatAddType(p.add_type)}`}
                    >
                      <span className="text-[10px] font-mono leading-none">#{p.index}</span>
                      {p.is_skill && <Sparkles size={8} className="absolute top-1 right-1 animate-pulse-slow" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between items-center text-[11px] text-muted px-2">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-border bg-surface" /> Available</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-brand bg-brand-soft shadow-[0_0_5px_var(--app-brand)]" /> Activated</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-amber-500/50 bg-amber-500/5" /> Skill Node</span>
            </div>
          </section>

          {/* Aggregate Stats Dashboard */}
          <section className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-black text-text flex items-center gap-2 text-sm uppercase tracking-wider">
                <Shield size={16} className="text-emerald-500" />
                Activated Telemetry Bonuses
              </h3>

              {/* Stat breakdown */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {Object.entries(telemetry.stats).map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center p-2 border border-border/60 bg-bg/40 rounded-lg text-xs">
                    <span className="font-bold text-muted">{label}</span>
                    <span className={`font-mono font-black ${val > 0 ? 'text-emerald-500' : 'text-subtle'}`}>
                      {val > 0 ? `+${val.toLocaleString()}` : '-'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Skills Unlock Tracker */}
              {telemetry.unlockedSkills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] uppercase tracking-wider font-bold text-subtle flex items-center gap-1">
                    <Award size={13} className="text-amber-500" />
                    Unlocked Skill Milestones ({telemetry.unlockedSkills.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {telemetry.unlockedSkills.map(name => (
                      <span key={name} className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-mono text-[9px] font-bold rounded">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Path description */}
            <div className="p-3 bg-bg/50 border border-border/80 rounded-xl text-[11px] text-muted leading-relaxed">
              <span className="font-bold text-text uppercase block mb-1">Grid Progression System:</span>
              Nodes must be unlocked sequentially. Clicking a future node triggers a simulator cascading logic, pre-filling all required path requirements automatically.
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
