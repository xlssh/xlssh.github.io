import React, { useEffect, useState, useMemo } from 'react';
import { loadOrgPointInfos, loadOrgPointAwards, loadArticles, loadEnemies } from '../data/loaders';
import { OrgPointInfo, OrgPointAward, Article, Enemy } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { 
  Shield, Map as MapIcon, Swords, Coins, Zap, Calendar, Plus, Trash2, 
  ChevronRight, Compass, Layers, Users, Sparkles
} from 'lucide-react';

export const GuildTacticsPlannerPage: React.FC = () => {
  const [points, setPoints] = useState<OrgPointInfo[]>([]);
  const [awards, setAwards] = useState<OrgPointAward[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selector state
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Tactical Route Planner state
  const [tacticalRoute, setTacticalRoute] = useState<OrgPointInfo[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pointsRes, awardsRes, articlesRes, enemiesRes] = await Promise.all([
        loadOrgPointInfos(),
        loadOrgPointAwards(),
        loadArticles(),
        loadEnemies()
      ]);
      setPoints(pointsRes.rows);
      setAwards(awardsRes.rows);
      setArticles(articlesRes.rows);
      setEnemies(enemiesRes.rows);

      if (pointsRes.rows.length > 0) {
        setSelectedPointId(pointsRes.rows[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load Organization Point Map database tables.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick lookup maps
  const articlesMap = useMemo(() => {
    const map = new Map<number, string>();
    articles.forEach(a => {
      map.set(a.id, a.name || `Item #${a.id}`);
    });
    return map;
  }, [articles]);

  const enemiesMap = useMemo(() => {
    const map = new Map<number, string>();
    enemies.forEach(e => {
      map.set(e.id, e.name || `Enemy Squad #${e.id}`);
    });
    return map;
  }, [enemies]);

  const selectedPoint = useMemo(() => {
    return points.find(p => p.id === selectedPointId) || null;
  }, [points, selectedPointId]);

  // Find rewards linked to the current selected point
  const currentAwards = useMemo(() => {
    if (!selectedPoint) return null;
    
    // Look up the show rate award in our awards array
    const showRateId = selectedPoint.show_rate_award;
    const rateAward = awards.find(a => a.id === showRateId);
    
    const guildRateId = selectedPoint.guild_rate_award;
    const guildAward = awards.find(a => a.id === guildRateId);

    return {
      rate: rateAward?.arr || [],
      guild: guildAward?.arr || []
    };
  }, [selectedPoint, awards]);

  // Filters points by search query
  const filteredPoints = useMemo(() => {
    if (searchQuery.trim() === '') return points;
    const query = searchQuery.toLowerCase();
    return points.filter(p => p.name.toLowerCase().includes(query) || String(p.id).includes(query));
  }, [points, searchQuery]);

  // Route Planning calculation stats
  const routeStats = useMemo(() => {
    let totalAP = 0;
    const totalRewards: { [key: string]: { name: string; amount: number } } = {};

    tacticalRoute.forEach(point => {
      totalAP += (point.action_eexertion || 0);

      // Add show rate awards
      const rateAward = awards.find(a => a.id === point.show_rate_award);
      if (rateAward && Array.isArray(rateAward.arr)) {
        rateAward.arr.forEach((reward: any) => {
          const name = articlesMap.get(reward.code) || `Item #${reward.code}`;
          const key = `rate_${reward.code}`;
          if (totalRewards[key]) {
            totalRewards[key].amount += reward.amount;
          } else {
            totalRewards[key] = { name, amount: reward.amount };
          }
        });
      }

      // Add guild awards
      const guildAward = awards.find(a => a.id === point.guild_rate_award);
      if (guildAward && Array.isArray(guildAward.arr)) {
        guildAward.arr.forEach((reward: any) => {
          const name = articlesMap.get(reward.code) || `Guild Resource #${reward.code}`;
          const key = `guild_${reward.code}`;
          if (totalRewards[key]) {
            totalRewards[key].amount += reward.amount;
          } else {
            totalRewards[key] = { name: `${name} (Guild)`, amount: reward.amount };
          }
        });
      }
    });

    return {
      totalAP,
      rewards: Object.values(totalRewards)
    };
  }, [tacticalRoute, awards, articlesMap]);

  // Route operations
  const handleAddToRoute = (point: OrgPointInfo) => {
    // Check if point is already in route
    if (tacticalRoute.some(p => p.id === point.id)) return;
    
    // Check path connectivity validation
    if (tacticalRoute.length > 0) {
      const lastPoint = tacticalRoute[tacticalRoute.length - 1];
      const isConnected = 
        lastPoint.next_point === point.id || 
        (Array.isArray(lastPoint.to_target) && lastPoint.to_target.includes(point.id)) ||
        point.next_point === lastPoint.id || 
        (Array.isArray(point.to_target) && point.to_target.includes(lastPoint.id));

      if (!isConnected) {
        alert(`Tactical Route Error: Node "${point.name}" is not directly linked to previous node "${lastPoint.name}". You must select a connected path node!`);
        return;
      }
    }

    setTacticalRoute(prev => [...prev, point]);
  };

  const handleRemoveFromRoute = (id: number) => {
    const idx = tacticalRoute.findIndex(p => p.id === id);
    if (idx !== -1) {
      setTacticalRoute(prev => prev.slice(0, idx));
    }
  };

  const handleClearRoute = () => {
    setTacticalRoute([]);
  };

  // Renders connections in details list
  const pointConnections = useMemo(() => {
    if (!selectedPoint) return [];
    const connectedIds: number[] = [];
    if (selectedPoint.next_point && selectedPoint.next_point > 0) {
      connectedIds.push(selectedPoint.next_point);
    }
    if (Array.isArray(selectedPoint.to_target)) {
      selectedPoint.to_target.forEach((id: number) => {
        if (id > 0 && !connectedIds.includes(id)) {
          connectedIds.push(id);
        }
      });
    }
    return points.filter(p => connectedIds.includes(p.id));
  }, [selectedPoint, points]);

  // Grid / Layout View bounding box calc for scaling
  const mapCoordinates = useMemo(() => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    points.forEach(p => {
      if (p.coordinate && typeof p.coordinate === 'object') {
        const x = (p.coordinate as any).x;
        const y = (p.coordinate as any).y;
        if (typeof x === 'number' && typeof y === 'number') {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    });

    if (minX === Infinity) {
      return { minX: 0, maxX: 1000, minY: 0, maxY: 1000, width: 1000, height: 1000 };
    }

    // Add small padding buffer
    const padding = 60;
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2
    };
  }, [points]);

  if (loading) return <LoadingState message="Reconstructing Guild League battlefields..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-brand-soft border border-brand/20 rounded-3xl p-8 shadow-sm">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-soft border border-brand/20 text-brand rounded-full text-xs font-semibold uppercase tracking-wider">
            <MapIcon size={13} />
            Coordinated Conquest
          </div>
          <div className="space-y-2 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-text">
              Guild League Node <span className="text-brand">Battle Tactics Planner</span>
            </h1>
            <p className="text-muted text-sm sm:text-base leading-relaxed">
              Plan and simulate optimal territory assault routes. Coordinate sequential point capturing, 
              view AP cost (Exertion), examine enemy squad arrays, and calculate accumulated guild resources.
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Screen Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Coordinates Canvas Grid & List Selector */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass size={20} className="text-brand" />
                <h2 className="font-bold text-text text-lg tracking-tight">Interactive Conquest Nodes Map</h2>
              </div>
              <div className="text-xs text-muted bg-bg px-3 py-1 border border-border rounded-full font-mono">
                Canvas scale: {Math.round(mapCoordinates.width)} x {Math.round(mapCoordinates.height)}
              </div>
            </div>

            {/* Bounding Box SVG Map Canvas */}
            <div className="relative w-full aspect-[4/3] bg-bg border border-border rounded-2xl overflow-auto p-4 group">
              <svg 
                viewBox={`${mapCoordinates.minX} ${mapCoordinates.minY} ${mapCoordinates.width} ${mapCoordinates.height}`}
                className="w-full h-full select-none cursor-grab active:cursor-grabbing"
              >
                {/* SVG Definitions for arrows and markers */}
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--app-border-strong)" />
                  </marker>
                  <marker id="arrow-selected" viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--app-brand)" />
                  </marker>
                </defs>

                {/* Draw Connection Links / Paths */}
                {points.map(p => {
                  if (!p.coordinate || typeof p.coordinate !== 'object') return null;
                  const x1 = (p.coordinate as any).x;
                  const y1 = (p.coordinate as any).y;

                  const nextP = points.find(np => np.id === p.next_point);
                  const targets = Array.isArray(p.to_target) ? points.filter(tp => p.to_target?.includes(tp.id)) : [];

                  return (
                    <g key={`links-${p.id}`} className="opacity-40 hover:opacity-100 transition-opacity">
                      {/* Next Point connection */}
                      {nextP && nextP.coordinate && (
                        <line
                          x1={x1}
                          y1={y1}
                          x2={(nextP.coordinate as any).x}
                          y2={(nextP.coordinate as any).y}
                          stroke={selectedPointId === p.id || selectedPointId === nextP.id ? 'var(--app-brand)' : 'var(--app-border)'}
                          strokeWidth={selectedPointId === p.id || selectedPointId === nextP.id ? 2 : 1.5}
                          strokeDasharray={selectedPointId === p.id || selectedPointId === nextP.id ? 'none' : '4,4'}
                          markerEnd={selectedPointId === p.id || selectedPointId === nextP.id ? 'url(#arrow-selected)' : 'url(#arrow)'}
                        />
                      )}

                      {/* Additional Targets connections */}
                      {targets.map(tp => {
                        if (!tp.coordinate) return null;
                        return (
                          <line
                            key={`target-${p.id}-${tp.id}`}
                            x1={x1}
                            y1={y1}
                            x2={(tp.coordinate as any).x}
                            y2={(tp.coordinate as any).y}
                            stroke={selectedPointId === p.id || selectedPointId === tp.id ? 'var(--app-brand)' : 'var(--app-border)'}
                            strokeWidth={selectedPointId === p.id || selectedPointId === tp.id ? 2 : 1.5}
                            markerEnd={selectedPointId === p.id || selectedPointId === tp.id ? 'url(#arrow-selected)' : 'url(#arrow)'}
                          />
                        );
                      })}
                    </g>
                  );
                })}

                {/* Draw Node Dots & Labels */}
                {points.map(p => {
                  if (!p.coordinate || typeof p.coordinate !== 'object') return null;
                  const x = (p.coordinate as any).x;
                  const y = (p.coordinate as any).y;
                  const isSelected = p.id === selectedPointId;
                  const isInRoute = tacticalRoute.some(rp => rp.id === p.id);

                  return (
                    <g 
                      key={`node-${p.id}`}
                      className="cursor-pointer group/node"
                      onClick={() => setSelectedPointId(p.id)}
                    >
                      {/* Interactive ring hover bubble */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 16 : 10}
                        className={`transition-all ${
                          isSelected 
                            ? 'fill-brand/20 stroke-brand' 
                            : isInRoute 
                              ? 'fill-indigo-500/20 stroke-indigo-500 dark:stroke-indigo-400' 
                              : 'fill-surface stroke-border hover:stroke-brand/50'
                        }`}
                        strokeWidth={isSelected ? 2 : 1.5}
                      />

                      {/* Small Center core */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 6 : 4}
                        className={isSelected ? 'fill-brand' : isInRoute ? 'fill-indigo-500' : 'fill-subtle'}
                      />

                      {/* Node index tooltip label (visible on select or hover) */}
                      <g transform={`translate(${x}, ${y - 18})`} className="pointer-events-none">
                        <text
                          textAnchor="middle"
                          fill={isSelected ? 'var(--app-brand)' : isInRoute ? '#6366f1' : 'var(--app-muted)'}
                          fontSize={isSelected ? '10px' : '8px'}
                          fontWeight="bold"
                          className="font-sans select-none"
                        >
                          {p.name}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>

              {/* Map help HUD overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex gap-4 bg-surface/90 border border-border rounded-xl p-3 text-[10px] sm:text-xs text-muted backdrop-blur-md justify-between items-center select-none shadow-sm">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-brand rounded-full inline-block" />
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full inline-block" />
                    <span>Tactical Route</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-subtle rounded-full inline-block" />
                    <span>Locked Territory</span>
                  </div>
                </div>
                <div className="text-subtle font-semibold uppercase text-[9px] sm:text-[11px]">Territory Map Canvas</div>
              </div>
            </div>
          </div>

          {/* Connected Nodes List Quick Navigator */}
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-brand" />
              <h3 className="font-bold text-text text-md">Adjacent connected paths from selected point</h3>
            </div>
            
            {pointConnections.length === 0 ? (
              <p className="text-muted text-sm">No connected paths recorded. This node is a terminal boundary point.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {pointConnections.map(cp => (
                  <button
                    key={`conn-${cp.id}`}
                    onClick={() => setSelectedPointId(cp.id)}
                    className="flex items-center justify-between px-4 py-2.5 bg-bg hover:bg-hover border border-border hover:border-border-strong text-text rounded-xl text-xs transition-all text-left group cursor-pointer"
                  >
                    <span className="font-semibold truncate">{cp.name}</span>
                    <ChevronRight size={14} className="text-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Inspector Panel & Route Tactics Planner */}
        <div className="xl:col-span-4 space-y-6">
          {/* Node Inspector Detail Panel */}
          {selectedPoint && (
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-mono font-bold">Node ID: {selectedPoint.id}</span>
                  <h3 className="text-xl font-bold text-text tracking-tight flex items-center gap-1.5">
                    <Shield size={18} className="text-brand" />
                    {selectedPoint.name}
                  </h3>
                </div>
                
                <button
                  onClick={() => handleAddToRoute(selectedPoint)}
                  disabled={tacticalRoute.some(p => p.id === selectedPoint.id)}
                  className="px-3 py-1.5 bg-brand hover:bg-brand-hover disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer disabled:pointer-events-none"
                >
                  <Plus size={13} />
                  Add to Route
                </button>
              </div>

              {/* Conquest stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg rounded-xl p-3 border border-border space-y-0.5">
                  <span className="text-[10px] text-muted uppercase font-semibold">AP Cost (Exertion)</span>
                  <div className="text-base font-bold text-brand flex items-center gap-1">
                    <Zap size={15} />
                    <span>{selectedPoint.action_eexertion} AP</span>
                  </div>
                </div>

                <div className="bg-bg rounded-xl p-3 border border-border space-y-0.5">
                  <span className="text-[10px] text-muted uppercase font-semibold">Daily Conquest Cap</span>
                  <div className="text-base font-bold text-text">
                    <span>{selectedPoint.remaining_number} clears</span>
                  </div>
                </div>
              </div>

              {/* Defending Army Squad */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Swords size={13} />
                  Defending Army Squad
                </h4>

                {selectedPoint.army ? (
                  <div className="bg-bg border border-border rounded-xl p-4 space-y-3 text-xs">
                    {/* Front */}
                    {Array.isArray((selectedPoint.army as any).front) && (selectedPoint.army as any).front.length > 0 && (
                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <span className="text-muted font-medium">Front Line</span>
                        <span className="font-bold text-text">
                          {(selectedPoint.army as any).front.map((id: number) => enemiesMap.get(id) || `Guard #${id}`).join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Middle */}
                    {Array.isArray((selectedPoint.army as any).middle) && (selectedPoint.army as any).middle.length > 0 && (
                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <span className="text-muted font-medium">Midfield</span>
                        <span className="font-bold text-text">
                          {(selectedPoint.army as any).middle.map((id: number) => enemiesMap.get(id) || `Guard #${id}`).join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Back */}
                    {Array.isArray((selectedPoint.army as any).back) && (selectedPoint.army as any).back.length > 0 && (
                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <span className="text-muted font-medium">Back Line</span>
                        <span className="font-bold text-text">
                          {(selectedPoint.army as any).back.map((id: number) => enemiesMap.get(id) || `Guard #${id}`).join(', ')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-muted font-medium">Squad Commander</span>
                      <span className="font-bold text-brand">
                        {enemiesMap.get((selectedPoint.army as any).leader_id) || `Commander #${(selectedPoint.army as any).leader_id}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted text-xs">No active squad defending this node. Boundary map zone.</p>
                )}
              </div>

              {/* Conquest Rewards */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Coins size={13} />
                  Conquest Rewards Yield
                </h4>

                {currentAwards ? (
                  <div className="grid grid-cols-1 gap-3">
                    {/* Rate Award */}
                    {currentAwards.rate.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-muted uppercase font-semibold">Personal Rate Loot Pool</span>
                        <div className="flex flex-wrap gap-2">
                          {currentAwards.rate.map((reward: any, idx: number) => (
                            <div key={`rate-loot-${idx}`} className="px-2.5 py-1 bg-bg border border-border text-text rounded-lg text-xs font-semibold flex items-center gap-1">
                              <Sparkles size={11} className="text-brand" />
                              <span>{articlesMap.get(reward.code) || `Item #${reward.code}`}</span>
                              <span className="text-brand font-bold">x{reward.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Guild Award */}
                    {currentAwards.guild.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[10px] text-muted uppercase font-semibold">Guild Territory Resource Yield</span>
                        <div className="flex flex-wrap gap-2">
                          {currentAwards.guild.map((reward: any, idx: number) => (
                            <div key={`guild-loot-${idx}`} className="px-2.5 py-1 bg-brand-soft border border-brand/20 text-brand rounded-lg text-xs font-semibold flex items-center gap-1">
                              <Users size={11} className="text-brand" />
                              <span>{articlesMap.get(reward.code) || `Guild Resource #${reward.code}`}</span>
                              <span className="text-brand font-bold">x{reward.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted text-xs">No conquests recorded. No resources yields detected.</p>
                )}
              </div>
            </div>
          )}

          {/* Tactical Route Planner Draft Section */}
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Compass size={18} className="text-brand" />
                <h3 className="font-bold text-text text-md">Assault Route Planner</h3>
              </div>
              
              {tacticalRoute.length > 0 && (
                <button
                  onClick={handleClearRoute}
                  className="text-subtle hover:text-danger transition-colors p-1.5 rounded-lg hover:bg-hover cursor-pointer"
                  title="Clear Assault Route Draft"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {tacticalRoute.length === 0 ? (
              <div className="text-center py-10 bg-bg border border-dashed border-border rounded-xl space-y-3">
                <Compass size={20} className="text-subtle mx-auto" />
                <p className="text-muted text-xs max-w-[240px] mx-auto leading-relaxed">
                  No nodes added to the route. Click any coordinate point on the map and click "Add to Route" to build your campaign.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Visual Steps Chain */}
                <div className="space-y-2">
                  <span className="text-[10px] text-muted uppercase font-semibold">Conquest Route steps</span>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {tacticalRoute.map((point, index) => (
                      <div 
                        key={`route-step-${point.id}-${index}`}
                        className="flex items-center justify-between p-2.5 bg-bg border border-border rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-5 h-5 bg-surface border border-border text-muted rounded-full flex items-center justify-center font-bold text-[10px]">
                            {index + 1}
                          </span>
                          <span className="font-bold text-text truncate">{point.name}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFromRoute(point.id)}
                          className="text-subtle hover:text-danger text-[10px] font-bold cursor-pointer"
                        >
                          Cut Here
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulated Tactical Accumulation Results */}
                <div className="border-t border-border pt-4 space-y-4">
                  <div className="flex justify-between items-center bg-bg border border-border p-3 rounded-xl">
                    <span className="text-xs text-muted font-semibold uppercase tracking-wider">Total AP consumed</span>
                    <span className="text-base font-black text-brand flex items-center gap-1 font-mono">
                      <Zap size={14} />
                      {routeStats.totalAP} AP
                    </span>
                  </div>

                  {/* Route Loot Yield */}
                  {routeStats.rewards.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] text-muted uppercase font-semibold">Total rewards yielded from assault route</span>
                      <div className="grid grid-cols-1 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {routeStats.rewards.map((rew, idx) => (
                          <div key={`route-total-rew-${idx}`} className="flex justify-between items-center text-xs px-3 py-1.5 bg-bg rounded-lg">
                            <span className="text-muted font-medium truncate pr-4">{rew.name}</span>
                            <span className="font-bold text-brand font-mono">x{rew.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
