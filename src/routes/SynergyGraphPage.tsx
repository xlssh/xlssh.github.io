import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadHeroes, loadRecommendHeroes } from '../data/loaders';
import { Hero, RecommendHero } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getProfessionLabel } from '../data/relationships';
import { Network, Filter, Star } from 'lucide-react';

const TIER_ORDER = ['SS', 'S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'C', 'D'];
function tierValue(tier: string | null): number {
  if (!tier) return 0;
  const idx = TIER_ORDER.indexOf(tier);
  return idx >= 0 ? TIER_ORDER.length - idx : 0;
}

const PROF_COLOR_HEX: Record<number, string> = {
  1: '#f59e0b',  // Agility - amber
  2: '#10b981',  // Defending - emerald
  3: '#8b5cf6',  // Intellect - violet
  4: '#f43f5e',  // Strength - rose
  5: '#d946ef',  // Warlock - fuchsia
};

const PROF_LABEL_COLOR: Record<number, string> = {
  1: 'text-amber-955 dark:text-amber-400',
  2: 'text-emerald-800 dark:text-emerald-400',
  3: 'text-violet-850 dark:text-violet-400',
  4: 'text-rose-800 dark:text-rose-400',
  5: 'text-fuchsia-800 dark:text-fuchsia-400',
};

interface Node {
  id: number;
  name: string;
  profession: number | null;
  role: string | null;
  quality: number | null;
  isRecommended: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  source: number;
  target: number;
}

function runForce(nodes: Node[], edges: Edge[], iterations = 80): Node[] {
  const ns = nodes.map(n => ({ ...n }));
  const W = 800, H = 600;
  const centerX = W / 2, centerY = H / 2;

  for (let iter = 0; iter < iterations; iter++) {
    const cooling = 1 - iter / iterations;

    // Repulsion between all nodes
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const dx = ns[i].x - ns[j].x;
        const dy = ns[i].y - ns[j].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.1);
        const force = (3000 / (dist * dist)) * cooling;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        ns[i].vx += fx; ns[i].vy += fy;
        ns[j].vx -= fx; ns[j].vy -= fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const s = ns.find(n => n.id === edge.source);
      const t = ns.find(n => n.id === edge.target);
      if (!s || !t) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.1);
      const force = (dist - 120) * 0.05;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      s.vx += fx; s.vy += fy;
      t.vx -= fx; t.vy -= fy;
    }

    // Center gravity
    ns.forEach(n => {
      n.vx += (centerX - n.x) * 0.01;
      n.vy += (centerY - n.y) * 0.01;
    });

    // Apply velocity with damping
    ns.forEach(n => {
      n.x += n.vx * cooling;
      n.y += n.vy * cooling;
      n.vx *= 0.5;
      n.vy *= 0.5;
      n.x = Math.max(30, Math.min(W - 30, n.x));
      n.y = Math.max(30, Math.min(H - 30, n.y));
    });
  }

  return ns;
}

export const SynergyGraphPage: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendHero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterProf, setFilterProf] = useState<number>(0);
  const [filterRecommended, setFilterRecommended] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [layoutNodes, setLayoutNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [heroRes, recRes] = await Promise.all([loadHeroes(), loadRecommendHeroes()]);
      setHeroes(heroRes.rows);
      setRecommendations(recRes.rows);
    } catch (e: any) {
      setError(e.message || "Failed to load synergy databases.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build graph from recommendations
  const { allNodes, allEdges } = useMemo(() => {
    const nodeMap = new Map<number, Node>();
    const edgeSet = new Set<string>();
    const edgeList: Edge[] = [];

    const recSet = new Set(recommendations.filter(r => r.if_recommend === 1).map(r => r.id));

    recommendations.forEach(rec => {
      const hero = heroes.find(h => h.id === rec.id);
      if (!hero) return;

      if (!nodeMap.has(hero.id)) {
        nodeMap.set(hero.id, {
          id: hero.id,
          name: hero.name ?? `Hero ${hero.id}`,
          profession: hero.profession,
          role: hero.role,
          quality: hero.quality,
          isRecommended: recSet.has(hero.id),
          x: 400 + (Math.random() - 0.5) * 400,
          y: 300 + (Math.random() - 0.5) * 300,
          vx: 0,
          vy: 0,
        });
      }

      (rec.friends ?? []).forEach(friendId => {
        const friendHero = heroes.find(h => h.id === friendId);
        if (!friendHero) return;
        if (!nodeMap.has(friendId)) {
          nodeMap.set(friendId, {
            id: friendId,
            name: friendHero.name ?? `Hero ${friendId}`,
            profession: friendHero.profession,
            role: friendHero.role,
            quality: friendHero.quality,
            isRecommended: recSet.has(friendId),
            x: 400 + (Math.random() - 0.5) * 400,
            y: 300 + (Math.random() - 0.5) * 300,
            vx: 0,
            vy: 0,
          });
        }

        const edgeKey = [Math.min(rec.id, friendId), Math.max(rec.id, friendId)].join('-');
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edgeList.push({ source: rec.id, target: friendId });
        }
      });
    });

    return { allNodes: [...nodeMap.values()], allEdges: edgeList };
  }, [heroes, recommendations]);

  // Run force layout
  useEffect(() => {
    if (allNodes.length === 0) return;
    const laid = runForce([...allNodes], allEdges, 120);
    setLayoutNodes(laid);
    setEdges(allEdges);
  }, [allNodes, allEdges]);

  // Filtered view
  const { visibleNodes, visibleEdges } = useMemo(() => {
    let vn = layoutNodes;
    if (filterProf !== 0) vn = vn.filter(n => n.profession === filterProf);
    if (filterRecommended) vn = vn.filter(n => n.isRecommended);
    const visibleIds = new Set(vn.map(n => n.id));
    const ve = edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));
    return { visibleNodes: vn, visibleEdges: ve };
  }, [layoutNodes, edges, filterProf, filterRecommended]);

  const hoveredConnections = useMemo(() => {
    if (!hoveredId) return new Set<number>();
    const connected = new Set<number>();
    edges.forEach(e => {
      if (e.source === hoveredId) connected.add(e.target);
      if (e.target === hoveredId) connected.add(e.source);
    });
    return connected;
  }, [hoveredId, edges]);

  const hoveredHero = useMemo(() => {
    if (!hoveredId) return null;
    return layoutNodes.find(n => n.id === hoveredId) ?? null;
  }, [hoveredId, layoutNodes]);

  const hoveredHeroData = useMemo(() => {
    if (!hoveredId) return null;
    return recommendations.find(r => r.id === hoveredId) ?? null;
  }, [hoveredId, recommendations]);

  if (loading) return <LoadingState message="Building synergy graph…" />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text tracking-tight">🕸 Synergy Network Graph</h1>
        <p className="text-sm text-muted mt-1">
          Force-directed graph of <span className="font-mono text-xs">friends[]</span> connections from <span className="font-mono text-xs">recommend_heroes.json</span>
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center p-3 bg-surface border border-border rounded-xl shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Filter size={12} aria-hidden="true" /> Filters:
        </div>
        <div className="flex gap-1 flex-wrap">
          {[0, 1, 2, 3, 4, 5].map(p => (
            <button 
              key={p} 
              onClick={() => setFilterProf(p)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                filterProf === p
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                  : 'border-border bg-bg dark:bg-surface text-muted hover:text-text dark:hover:text-zinc-200'
              }`}
            >
              {p === 0 ? 'All' : getProfessionLabel(p)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setFilterRecommended(prev => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            filterRecommended
              ? 'border-amber-600 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
              : 'border-border bg-bg dark:bg-surface text-muted hover:text-text dark:hover:text-zinc-200'
          }`}
        >
          <Star size={10} fill={filterRecommended ? 'currentColor' : 'none'} aria-hidden="true" /> Game Picks Only
        </button>
        <span className="text-[10px] text-muted ml-auto">{visibleNodes.length} nodes · {visibleEdges.length} edges</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* SVG Graph */}
        <div className="xl:col-span-3">
          <div className="bg-bg border border-border rounded-2xl overflow-hidden shadow-sm">
            <svg viewBox="0 0 800 600" className="w-full" style={{ minHeight: '400px' }}>
              {/* Edges */}
              {visibleEdges.map((edge, i) => {
                const s = visibleNodes.find(n => n.id === edge.source);
                const t = visibleNodes.find(n => n.id === edge.target);
                if (!s || !t) return null;
                const isHovered = hoveredId && (edge.source === hoveredId || edge.target === hoveredId);
                return (
                  <line key={i}
                    x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                    className={isHovered ? 'stroke-indigo-500 dark:stroke-indigo-400' : 'stroke-zinc-200 dark:stroke-zinc-800/80'}
                    strokeWidth={isHovered ? 2.5 : 0.8}
                    strokeOpacity={isHovered ? 0.95 : 0.4}
                  />
                );
              })}

              {/* Nodes */}
              {visibleNodes.map(node => {
                const color = PROF_COLOR_HEX[node.profession ?? 0] ?? '#71717a';
                const r = node.isRecommended ? 10 : 7;
                const isHovered = hoveredId === node.id;
                const isConnected = hoveredConnections.has(node.id);
                const isDimmed = hoveredId !== null && !isHovered && !isConnected;

                return (
                  <g key={node.id}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Outer glow for hovered */}
                    {isHovered && (
                      <circle cx={node.x} cy={node.y} r={r + 8} fill={color} opacity={0.15} />
                    )}
                    {isConnected && (
                      <circle cx={node.x} cy={node.y} r={r + 4} fill={color} opacity={0.1} />
                    )}
                    {/* Main circle */}
                    <circle
                      cx={node.x} cy={node.y} r={r}
                      fill={color}
                      fillOpacity={isDimmed ? 0.15 : 0.8}
                      className={isHovered ? 'stroke-zinc-900 dark:stroke-white' : isConnected ? 'stroke-zinc-800 dark:stroke-zinc-200' : 'stroke-transparent'}
                      strokeWidth={isHovered ? 2 : 1.5}
                    />
                    {/* Star for game-recommended */}
                    {node.isRecommended && !isDimmed && (
                      <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="middle"
                        fontSize="8" fill="white" fontWeight="bold">★</text>
                    )}
                    {/* Label on hover or for small graphs */}
                    {(isHovered || isConnected || visibleNodes.length <= 8) && (
                      <text
                        x={node.x} y={node.y + r + 10}
                        textAnchor="middle"
                        fontSize="9"
                        className={isDimmed ? 'fill-zinc-300 dark:fill-zinc-700' : 'fill-zinc-800 dark:fill-zinc-200 font-bold'}
                      >
                        {node.name.length > 14 ? node.name.slice(0, 12) + '…' : node.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 text-[9px]">
            {[1, 2, 3, 4, 5].map(p => (
              <div key={p} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: PROF_COLOR_HEX[p] }} />
                <span className="text-muted">{getProfessionLabel(p)}</span>
              </div>
            ))}
            <div className="flex items-center gap-1 ml-2">
              <div className="w-3 h-3 rounded-full border border-border-strong flex items-center justify-center">
                <span className="text-[6px] text-muted">★</span>
              </div>
              <span className="text-muted">Game pick</span>
            </div>
          </div>
        </div>

        {/* Sidebar: Hover Details */}
        <div className="space-y-4">
          {hoveredHero ? (
            <div className="p-4 bg-surface border border-border rounded-2xl space-y-3 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-text">{hoveredHero.name}</span>
                  {hoveredHero.isRecommended && (
                    <Star size={12} className="text-amber-500" fill="currentColor" aria-hidden="true" />
                  )}
                </div>
                <div className={`text-xs font-bold ${PROF_LABEL_COLOR[hoveredHero.profession ?? 0] ?? 'text-muted'}`}>
                  {getProfessionLabel(hoveredHero.profession)} · {hoveredHero.role ?? '?'}
                </div>
              </div>

              {hoveredHeroData?.ability && (
                <div>
                  <span className="text-[9px] font-bold text-muted uppercase">Type</span>
                  <div className="text-xs text-text dark:text-subtle font-semibold">{hoveredHeroData.ability}</div>
                </div>
              )}

              {hoveredHeroData?.get_rode && (
                <div>
                  <span className="text-[9px] font-bold text-muted uppercase">Source</span>
                  <div className="text-xs text-text dark:text-subtle font-semibold">{hoveredHeroData.get_rode}</div>
                </div>
              )}

              <div>
                <span className="text-[9px] font-bold text-muted uppercase">Synergy Partners ({hoveredConnections.size})</span>
                <div className="space-y-1 mt-1">
                  {[...hoveredConnections].map(cid => {
                    const cn = layoutNodes.find(n => n.id === cid);
                    if (!cn) return null;
                    return (
                      <div key={cid} className="flex items-center justify-between">
                        <span className="text-xs text-text">{cn.name}</span>
                        <span className={`text-[9px] font-bold ${PROF_LABEL_COLOR[cn.profession ?? 0] ?? 'text-subtle'}`}>
                          {getProfessionLabel(cn.profession)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Link to={`/heroes/${hoveredHero.id}`}
                className="block text-center text-xs font-bold text-indigo-700 dark:text-fuchsia-400 hover:text-indigo-800 dark:hover:text-fuchsia-300 transition-colors border border-indigo-200 dark:border-fuchsia-800/50 rounded-xl py-2 mt-2 bg-indigo-50 dark:bg-transparent">
                View Full Profile →
              </Link>
            </div>
          ) : (
            <div className="p-4 bg-surface border border-border rounded-2xl text-center text-xs text-muted shadow-sm">
              <Network size={24} className="mx-auto mb-2 text-subtle dark:text-muted" aria-hidden="true" />
              Hover a node to see synergy details
            </div>
          )}

          {/* All nodes list */}
          <div className="p-4 bg-surface border border-border rounded-2xl space-y-2 max-h-64 overflow-y-auto shadow-sm">
            <span className="text-[9px] font-bold text-muted uppercase">All Nodes ({visibleNodes.length})</span>
            {visibleNodes
              .sort((a, b) => tierValue(b.role) - tierValue(a.role))
              .map(n => (
                <div key={n.id}
                  onMouseEnter={() => setHoveredId(n.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`flex items-center justify-between cursor-pointer py-1 px-2 rounded-lg transition-colors ${
                    hoveredId === n.id ? 'bg-surface-raised' : 'hover:bg-bg dark:hover:bg-surface/50'
                  }`}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: PROF_COLOR_HEX[n.profession ?? 0] ?? '#71717a' }} />
                    <span className="text-xs text-text dark:text-subtle truncate">{n.name}</span>
                    {n.isRecommended && <Star size={8} className="text-amber-500 shrink-0" fill="currentColor" aria-hidden="true" />}
                  </div>
                  <span className="text-[9px] text-muted shrink-0">{n.role ?? '?'}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
