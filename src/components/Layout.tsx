import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Users,
  Package,
  BookOpen,
  Calendar,
  CalendarDays,
  Map,
  Swords,
  ShoppingBag,
  Flame,
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  Compass,
  ChevronRight,
  ChevronLeft,
  Scale,
  GitFork,
  Coins,
  Navigation,
  Volume2,
  BarChart3,
  Clock,
  Network,
  Shield,
  LayoutGrid,
  Wand2,
  Sparkles,
  HeartHandshake,
  Trophy
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  const navigate = useNavigate();
  const location = useLocation();
  const [searchVal, setSearchVal] = useState('');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Sync mobile menu close on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  const menuItems = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Global Search', to: '/search', icon: Search },
    { name: 'Event Calendar', to: '/calendar', icon: Calendar },
    { name: 'Promotion Schedules', to: '/calendar/schedules', icon: Clock },
    { name: 'Heroes', to: '/heroes', icon: Users },
    { name: 'Hero Comparison', to: '/heroes/compare', icon: Scale },
    { name: 'Hero SFX Board', to: '/heroes/sounds', icon: Volume2 },
    { name: 'Class Stat Curves', to: '/heroes/stats', icon: BarChart3 },
    { name: 'Articles / Items', to: '/articles', icon: Package },
    { name: 'Farming Planner', to: '/articles/farming', icon: Navigation },
    { name: 'Zanpakuto Evolution', to: '/weapons/evolution', icon: Swords },
    { name: 'Zanpakuto Stats', to: '/weapons/stats', icon: BarChart3 },
    { name: 'Story Quests', to: '/story-quests', icon: BookOpen },
    { name: 'Quest Tree', to: '/story-quests/tree', icon: GitFork },
    { name: 'Daily Quests', to: '/daily-quests', icon: CalendarDays },
    { name: 'Cities', to: '/cities', icon: Map },
    { name: 'World Unlock Map', to: '/cities/map', icon: Globe },
    { name: 'Stages', to: '/stages', icon: Swords },
    { name: 'Mall Items', to: '/mall-items', icon: ShoppingBag },
    { name: 'Shop Analytics', to: '/mall/analytics', icon: Coins },
    { name: 'Promotions', to: '/promotions', icon: Flame },
    { name: 'Formation Builder', to: '/tools/formation', icon: Wand2 },
    { name: 'Counter Triangle', to: '/tools/counters', icon: Shield },
    //{ name: 'Synergy Graph', to: '/tools/synergy', icon: Network },
    { name: 'Tier Heatmap', to: '/tools/tier-heatmap', icon: LayoutGrid },
    { name: 'Skill Handbook', to: '/tools/skills', icon: BookOpen },
    { name: 'Bond Optimizer', to: '/tools/bond-optimizer', icon: Sparkles },
    { name: 'Event ROI & VIP Planner', to: '/tools/vip-planner', icon: Coins },
    //{ name: 'Combat Simulator', to: '/tools/combat-simulator', icon: Swords },
    { name: 'Campaign Roadmap', to: '/tools/campaign-roadmap', icon: Map },
    { name: 'Home Dating & Intimacy', to: '/tools/dating', icon: HeartHandshake },
    { name: 'Equipment & Suits', to: '/tools/equipment', icon: Swords },
    { name: 'Awakening Console', to: '/tools/awakening', icon: Sparkles },
    { name: 'Pet Sanctuary', to: '/tools/pets', icon: LayoutGrid },
    { name: 'Achievement & Titles', to: '/tools/achievements', icon: Shield },
    //{ name: 'Gacha & Shop Rates', to: '/tools/shops', icon: Coins },
    { name: 'Academy & Relics', to: '/tools/academy', icon: BookOpen },
    { name: 'Loot Table Oracle', to: '/tools/loot-oracle', icon: Sparkles },
    { name: 'Campaign Encounters', to: '/tools/pve-campaign', icon: Swords },
    { name: 'Guild Devotion & VIP', to: '/tools/guild-vip', icon: Trophy },
    { name: 'Spiritual Ornaments', to: '/tools/ornaments', icon: Sparkles },
    { name: 'MC Soul Maps', to: '/tools/soul-maps', icon: Compass },
    { name: 'Black Market Deals', to: '/tools/black-market', icon: Coins },
    { name: 'Beast Souls Planner', to: '/tools/beast-souls', icon: BarChart3 },
    { name: 'Temple Shrine', to: '/tools/shrine-simulator', icon: Trophy },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text transition-colors duration-200">
      {/* Skip Link for Keyboard Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:rounded-xl font-semibold text-sm transition-all"
      >
        Skip to main content
      </a>

      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-surface/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-hover md:hidden text-muted"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>

          <Link to="/" className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg p-1">
            <span className="font-display font-extrabold text-lg md:text-xl tracking-wider bg-gradient-to-r from-indigo-600 to-fuchsia-600 dark:from-indigo-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
              SHINIGAMIWORLD DB
            </span>
            <span className="hidden md:inline px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-brand-soft text-brand border border-indigo-100/50 dark:border-indigo-950/40">
              Datamining
            </span>
          </Link>
        </div>

        {/* Global Search Bar in Header (Desktop Only) */}
        <form onSubmit={handleGlobalSearchSubmit} className="hidden md:flex items-center relative w-80">
          <input
            id="global-search-input"
            type="text"
            placeholder="Search characters, items, skills…"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-full border border-border bg-bg focus:outline-none focus:ring-2 focus:ring-brand placeholder-subtle"
            aria-label="Search everything in database"
          />
          <Search size={14} className="absolute left-3 text-muted" aria-hidden="true" />
        </form>

        <div className="flex items-center gap-3">

          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted hover:bg-hover transition-colors cursor-pointer"
            aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex">
        {/* Sidebar Nav (Desktop Only) */}
        <aside
          className={`hidden md:flex flex-col border-r border-border bg-surface shrink-0 p-4 justify-between transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'
            }`}
        >
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
            <div className="pb-2 border-b border-border flex items-center justify-between">
              {!sidebarCollapsed && (
                <span className="text-[10px] font-extrabold text-subtle uppercase tracking-widest px-3">
                  Database Menu
                </span>
              )}
            </div>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${isActive
                      ? 'bg-brand-soft text-brand border border-indigo-100/50 dark:border-indigo-950/40 shadow-sm'
                      : 'text-muted hover:bg-hover hover:text-text'
                    } ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={18} className="shrink-0" aria-hidden="true" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-subtle" aria-hidden="true" />
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Sidebar Collapse Toggle Button */}
          <div className="pt-3 border-t border-border">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? "Expand sidebar menu" : "Collapse sidebar menu"}
              className="w-full flex items-center justify-center p-2 rounded-xl border border-border hover:bg-hover text-muted hover:text-text font-semibold transition-all text-xs"
            >
              {sidebarCollapsed ? (
                <ChevronRight size={16} aria-hidden="true" />
              ) : (
                <span className="flex items-center gap-1.5">
                  <ChevronLeft size={14} aria-hidden="true" />
                  Collapse Menu
                </span>
              )}
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex" role="dialog" aria-modal="true">
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            ></div>

            {/* Drawer Body */}
            <aside className="relative w-72 max-w-[80vw] bg-surface h-full p-4 flex flex-col shadow-2xl z-50">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
                <span className="font-display font-extrabold text-brand uppercase tracking-widest text-sm">BLEACHFLASH DB</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-muted hover:text-text"
                  aria-label="Close menu"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              {/* Global Search in Mobile Menu */}
              <form onSubmit={handleGlobalSearchSubmit} className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search database…"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-bg focus:outline-none focus:ring-2 focus:ring-brand placeholder-subtle"
                  aria-label="Search mobile menu"
                />
                <Search size={16} className="absolute left-3 top-3 text-muted" aria-hidden="true" />
              </form>

              <nav className="space-y-1.5 overflow-y-auto flex-1">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                        ? 'bg-brand-soft text-brand border border-indigo-100/50 dark:border-indigo-950/40 shadow-sm'
                        : 'text-muted hover:bg-hover hover:text-text'
                      }`
                    }
                  >
                    <item.icon size={18} className="shrink-0" aria-hidden="true" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 overflow-y-auto p-6 sm:p-8 outline-none">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
