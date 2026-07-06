import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadManifest, loadHeroes } from '../data/loaders';
import { Manifest, Hero } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { calcHeroBP } from '../utils/battlePower';
import {
  Users, Package, BookOpen, Calendar, Map, Swords, ShoppingBag, Flame,
  ArrowRight, Database, CalendarDays, ShieldCheck, Search, Clock,
  Wand2, Scale, Sparkles, BarChart3, Trophy, Globe, Star, Compass,
  Coins, HeartHandshake, Shield, LayoutGrid
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [heroes, setHeroes] = useState<Hero[]>([]);

  const fetchManifestData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, heroesRes] = await Promise.all([loadManifest(), loadHeroes()]);
      setManifest(data);
      setHeroes(heroesRes.rows);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load manifest.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchManifestData(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
  };

  // Compute total row counts from manifest + BP stats
  const stats = useMemo(() => {
    if (!manifest) return null;
    const tables = manifest.tables;
    const totalRows = Object.values(tables).reduce((sum, t) => sum + (t.rowCount || 0), 0);
    const tableCount = Object.keys(tables).length;
    const generatedAt = manifest.generatedAt ? new Date(manifest.generatedAt) : null;

    // BP stats
    const topHeroes = heroes
      .map(h => ({ name: h.name || `#${h.id}`, bp: calcHeroBP(h, 1), quality: h.quality }))
      .sort((a, b) => b.bp - a.bp)
      .slice(0, 5);
    const avgBP = heroes.length > 0 ? Math.round(heroes.reduce((s, h) => s + calcHeroBP(h, 1), 0) / heroes.length) : 0;
    const maxBP = topHeroes.length > 0 ? topHeroes[0].bp : 0;

    return { totalRows, tableCount, generatedAt, topHeroes, avgBP, maxBP };
  }, [manifest, heroes]);

  if (loading) return <LoadingState message="Connecting to client database files..." />;
  if (error) return <ErrorState message={error} onRetry={fetchManifestData} />;
  if (!manifest) return <ErrorState message="Manifest data is empty." onRetry={fetchManifestData} />;

  const catalogCards = [
    { key: 'heroes', title: 'Heroes', icon: Users, desc: 'Stats, growth, bonds', link: '/heroes', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    { key: 'articles', title: 'Items', icon: Package, desc: 'Gear, materials, drops', link: '/articles', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { key: 'story_quests', title: 'Story Quests', icon: BookOpen, desc: 'Campaign missions', link: '/story-quests', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
    { key: 'daily_quests', title: 'Daily Quests', icon: CalendarDays, desc: 'Recurring tasks', link: '/daily-quests', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
    { key: 'cities', title: 'Cities', icon: Map, desc: 'World progression', link: '/cities', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    { key: 'stages', title: 'Stages', icon: Swords, desc: 'Combat stages', link: '/stages', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { key: 'mall_items', title: 'Mall Shop', icon: ShoppingBag, desc: 'Cash shop items', link: '/mall-items', color: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400' },
    { key: 'promotional_activities', title: 'Promotions', icon: Flame, desc: 'Events & rewards', link: '/promotions', color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  ];

  const popularTools = [
    { name: 'Formation Builder', to: '/tools/formation', icon: Wand2, desc: 'Build & simulate team lineups', color: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400' },
    { name: 'Hero Comparison', to: '/heroes/compare', icon: Scale, desc: 'Side-by-side hero stat analysis', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    { name: 'Counter Triangle', to: '/tools/counters', icon: Shield, desc: 'Profession matchup matrix', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { name: 'Tier Heatmap', to: '/tools/tier-heatmap', icon: LayoutGrid, desc: 'Visual hero tier ranking grid', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { name: 'Skill Handbook', to: '/tools/skills', icon: Sparkles, desc: 'Browse all hero skills', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  ];

  const plannerTools = [
    { name: 'Event ROI & VIP', to: '/tools/vip-planner', icon: Coins },
    { name: 'Campaign Roadmap', to: '/tools/campaign-roadmap', icon: Map },
    { name: 'Bond Optimizer', to: '/tools/bond-optimizer', icon: HeartHandshake },
    { name: 'Hero Talents', to: '/tools/talents', icon: Wand2 },
    { name: 'Loot Table Oracle', to: '/tools/loot-oracle', icon: Sparkles },
    { name: 'Black Market', to: '/tools/black-market', icon: Coins },
    { name: 'Beast Souls', to: '/tools/beast-souls', icon: BarChart3 },
    { name: 'Military Ranks', to: '/tools/military', icon: Trophy },
  ];

  const endgameTools = [
    { name: "Yammy's Rampage", to: '/tools/yammy-rampage', icon: Swords, desc: 'Evil Shards & silver drops' },
    { name: 'Cross Server Battle', to: '/tools/cross-server-battle', icon: ShieldCheck, desc: 'Pyramid rewards & shop' },
    { name: 'Culling Abyss Tower', to: '/tools/culling-tower', icon: Database, desc: 'Training optimization' },
    { name: 'Seven Souls Altar', to: '/tools/seven-souls', icon: Star, desc: 'Seven soul progression' },
    { name: 'Conquest of Might', to: '/tools/nightmare-realms', icon: Globe, desc: 'Nightmare realm clears' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero: Search + Branding */}
      <section className="text-center space-y-5 py-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">
            Game Database
          </h1>
          <p className="mt-2 text-sm text-muted max-w-lg mx-auto">
            Search, filter, and plan across every system in the game.
          </p>
        </div>

        <form onSubmit={handleSearch} className="max-w-xl mx-auto relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search heroes, items, skills, quests..."
            className="w-full pl-11 pr-5 py-3.5 border border-border rounded-2xl bg-surface text-text placeholder-subtle font-medium focus:outline-none focus:ring-2 focus:ring-brand shadow-sm text-sm"
          />
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden={true} />
        </form>

        {stats && (
          <div className="flex items-center justify-center gap-6 text-xs text-muted">
            <span><span className="font-bold text-text font-mono">{stats.tableCount}</span> tables</span>
            <span className="text-border">|</span>
            <span><span className="font-bold text-text font-mono">{stats.totalRows.toLocaleString()}</span> total records</span>
            <span className="text-border">|</span>
            <span>Avg BP: <span className="font-bold text-brand font-mono">{stats.avgBP.toLocaleString()}</span></span>
            {stats.generatedAt && (
              <>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  Updated {stats.generatedAt.toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/search" className="p-4 border border-border rounded-xl bg-surface flex items-center gap-3 hover:shadow-md hover:border-brand-soft transition-all group">
          <div className="p-2.5 rounded-lg bg-brand-soft text-brand"><Search size={18} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-text group-hover:text-brand transition-colors">Global Search</div>
            <div className="text-[11px] text-muted truncate">Query all tables at once</div>
          </div>
          <ArrowRight size={14} className="text-brand opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </Link>
        <Link to="/calendar" className="p-4 border border-border rounded-xl bg-surface flex items-center gap-3 hover:shadow-md hover:border-brand-soft transition-all group">
          <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-500"><Calendar size={18} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-text group-hover:text-brand transition-colors">Event Calendar</div>
            <div className="text-[11px] text-muted truncate">Promotions, schedules, timers</div>
          </div>
          <ArrowRight size={14} className="text-brand opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </Link>
        <Link to="/tools/formation" className="p-4 border border-border rounded-xl bg-surface flex items-center gap-3 hover:shadow-md hover:border-brand-soft transition-all group">
          <div className="p-2.5 rounded-lg bg-fuchsia-500/10 text-fuchsia-500"><Wand2 size={18} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-text group-hover:text-brand transition-colors">Formation Builder</div>
            <div className="text-[11px] text-muted truncate">Build & simulate team lineups</div>
          </div>
          <ArrowRight size={14} className="text-brand opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </Link>
      </section>

      {/* Fighting Power Leaderboard */}
      {stats && stats.topHeroes.length > 0 && (
        <section className="p-5 border border-border bg-surface rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <Swords size={18} className="text-brand" />
              Fighting Power Leaderboard
            </h2>
            <Link to="/tools/battle-power" className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1">
              Full Calculator <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {stats.topHeroes.map((h, idx) => (
              <div key={idx} className="p-3 border border-border rounded-xl bg-bg/50 text-center space-y-1">
                <span className="text-[10px] font-bold text-subtle">#{idx + 1}</span>
                <div className="text-sm font-bold text-text truncate">{h.name}</div>
                <div className="text-lg font-black font-mono text-brand">{h.bp.toLocaleString()}</div>
                <div className="text-[10px] text-muted">Lv.1 Base BP</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Popular Tools */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h2 className="text-lg font-bold text-text">Popular Tools</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {popularTools.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="p-4 border border-border bg-surface rounded-xl flex items-center gap-3 hover:shadow-md hover:border-brand-soft transition-all group"
            >
              <div className={`p-2 rounded-lg ${tool.color}`}>
                <tool.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-text group-hover:text-brand transition-colors">{tool.name}</div>
                <div className="text-[11px] text-muted truncate">{tool.desc}</div>
              </div>
              <ArrowRight size={14} className="text-brand opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* Database Catalog */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h2 className="text-lg font-bold text-text">Database Catalog</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {catalogCards.map((card) => {
            const tableData = manifest.tables[card.key];
            const rowCount = tableData?.rowCount ?? 0;
            return (
              <Link
                key={card.key}
                to={card.link}
                className="border border-border bg-surface rounded-xl p-4 hover:shadow-md hover:border-brand-soft transition-all group flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${card.color}`}>
                    <card.icon size={18} />
                  </div>
                  <span className="font-mono text-xs font-bold text-subtle">
                    {rowCount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text group-hover:text-brand transition-colors">{card.title}</h3>
                  <p className="text-[11px] text-muted mt-0.5">{card.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Planners & Simulators */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h2 className="text-lg font-bold text-text">Planners & Simulators</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {plannerTools.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="p-3 border border-border bg-surface rounded-xl flex items-center gap-2.5 hover:shadow-md hover:border-brand-soft transition-all group text-sm font-semibold text-muted hover:text-text"
            >
              <tool.icon size={15} className="shrink-0" />
              <span className="truncate">{tool.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Endgame & PvP */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h2 className="text-lg font-bold text-text">Endgame & PvP</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {endgameTools.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="p-4 border border-border bg-surface rounded-xl flex items-center gap-3 hover:shadow-md hover:border-brand-soft transition-all group"
            >
              <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                <tool.icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-text group-hover:text-brand transition-colors">{tool.name}</div>
                <div className="text-[11px] text-muted truncate">{tool.desc}</div>
              </div>
              <ArrowRight size={14} className="text-brand opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
