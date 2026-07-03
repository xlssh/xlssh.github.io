import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadRelatedPartners, loadRelatedPartnerTypes, loadHeroes } from '../data/loaders';
import { RelatedPartner, RelatedPartnerType, Hero } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getAttributeName, getProfessionLabel } from '../data/relationships';
import { Sparkles, Info, Users, Plus, X, Search, Check, AlertTriangle, ChevronRight, TrendingUp } from 'lucide-react';

export const BondOptimizerPage: React.FC = () => {
  const [partners, setRelatedPartners] = useState<RelatedPartner[]>([]);
  const [partnerTypes, setRelatedPartnerTypes] = useState<RelatedPartnerType[]>([]);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core Simulation Team (Array of up to 5 Hero IDs)
  const [teamIds, setTeamIds] = useState<number[]>([]);
  const [simLevel, setSimLevel] = useState<number>(10); // Simulation level (1-30)

  // Search & Filter for pool
  const [searchQuery, setSearchQuery] = useState('');
  const [profFilter, setProfFilter] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pRes, ptRes, hRes] = await Promise.all([
        loadRelatedPartners(),
        loadRelatedPartnerTypes(),
        loadHeroes()
      ]);
      setRelatedPartners(pRes.rows);
      setRelatedPartnerTypes(ptRes.rows);
      setHeroes(hRes.rows);
      
      // Pre-fill with a few iconic characters if empty
      if (hRes.rows.length > 0) {
        // e.g. Ichigo (11101001) and Rukia (11101004)
        setTeamIds([11101001, 11101004].filter(id => hRes.rows.some(h => h.id === id)));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load bond synergy optimizer databases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeHeroes = useMemo(() => {
    return teamIds.map(id => heroes.find(h => h.id === id)).filter(Boolean) as Hero[];
  }, [teamIds, heroes]);

  // All potential bonds for the current active team
  const teamBonds = useMemo(() => {
    const list: {
      bond: RelatedPartner;
      hero: Hero;
      partner: Hero | null;
      isActive: boolean;
      activeStats: { label: string; value: string }[];
    }[] = [];

    activeHeroes.forEach(hero => {
      // Find all partner bonds for this hero
      const hb = partners.filter(p => p.hero_id === hero.id);
      hb.forEach(bond => {
        const partner = heroes.find(h => h.id === bond.connect_id) || null;
        const isActive = teamIds.includes(bond.connect_id);

        // Find the stats growth based on type and simulated level
        // types map level 1-30
        const matchedType = partnerTypes.find(t => t.type === bond.type && t.level === simLevel);
        const stats: { label: string; value: string }[] = [];
        if (matchedType && matchedType.properties) {
          matchedType.properties.forEach(p => {
            const attrLabel = getAttributeName(p.type);
            const valSign = p.oper === 2 ? '×' : p.value > 0 ? '+' : '';
            const percentSign = p.type >= 16 && p.type <= 47 ? '%' : '';
            stats.push({
              label: attrLabel,
              value: `${valSign}${p.value}${percentSign}`
            });
          });
        }

        list.push({
          bond,
          hero,
          partner,
          isActive,
          activeStats: stats
        });
      });
    });

    return list;
  }, [activeHeroes, partners, heroes, teamIds, partnerTypes, simLevel]);

  // Aggregate active stat bonuses
  const totalSynergyStats = useMemo(() => {
    const totals: Record<string, { val: number; unit: string }> = {};
    teamBonds.filter(b => b.isActive).forEach(b => {
      // Find properties
      const matchedType = partnerTypes.find(t => t.type === b.bond.type && t.level === simLevel);
      if (matchedType && matchedType.properties) {
        matchedType.properties.forEach(p => {
          const attrLabel = getAttributeName(p.type);
          const percentSign = p.type >= 16 && p.type <= 47 ? '%' : '';
          if (!totals[attrLabel]) {
            totals[attrLabel] = { val: 0, unit: percentSign };
          }
          totals[attrLabel].val += p.value;
        });
      }
    });
    return Object.entries(totals).map(([label, s]) => ({
      label,
      value: `+${s.val.toLocaleString()}${s.unit}`
    }));
  }, [teamBonds, partnerTypes, simLevel]);

  // Calculate missing partners ranked by how many bonds they would unlock
  const recommendedPartners = useMemo(() => {
    const counts: Record<number, { hero: Hero; count: number; unlocksFor: string[] }> = {};
    
    teamBonds.filter(b => !b.isActive).forEach(b => {
      if (b.partner) {
        const pId = b.partner.id;
        if (!counts[pId]) {
          counts[pId] = {
            hero: b.partner,
            count: 0,
            unlocksFor: []
          };
        }
        counts[pId].count += 1;
        if (!counts[pId].unlocksFor.includes(b.hero.name || '')) {
          counts[pId].unlocksFor.push(b.hero.name || '');
        }
      }
    });

    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [teamBonds]);

  // Add a hero to the simulation team (max 5)
  const handleAddHero = (id: number) => {
    setTeamIds(prev => {
      if (prev.includes(id)) return prev;
      if (prev.length >= 5) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const handleRemoveHero = (id: number) => {
    setTeamIds(prev => prev.filter(x => x !== id));
  };

  const heroPool = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return heroes
      .filter(h => {
        if (teamIds.includes(h.id)) return false; // Already in team
        if (q && !(h.name || '').toLowerCase().includes(q)) return false;
        if (profFilter && h.profession !== profFilter) return false;
        return true;
      })
      .slice(0, 12); // Limit visible list
  }, [heroes, searchQuery, profFilter, teamIds]);

  if (loading) return <LoadingState message="Recalculating team synergy lattices..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-text tracking-tight flex items-center gap-2">
          <Sparkles className="text-sky-400" />
          Interactive Bond Synergy Optimizer
        </h1>
        <p className="text-sm text-muted mt-1">
          Simulate a 5-man team to automatically calculate unlocked partner bonds, preview stat growth up to Level 30, and find missing core synergy candidates.
        </p>
      </div>

      {/* Grid Layout: Left Team Simulator + Right Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Simulation Roster */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Team Grid (Max 5 Slots) */}
          <div className="p-6 bg-surface border border-border rounded-2xl space-y-5">
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <Users size={18} className="text-sky-400" />
              Deployment Roster (Up to 5 Heroes)
            </h2>

            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, idx) => {
                const hero = activeHeroes[idx];
                if (!hero) {
                  return (
                    <div
                      key={idx}
                      className="border-2 border-dashed border-border rounded-xl h-36 flex flex-col items-center justify-center text-subtle bg-bg/20"
                    >
                      <span className="text-xs font-bold text-muted">Slot #{idx + 1}</span>
                      <span className="text-[10px] mt-1">+ Empty</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={hero.id}
                    className="relative border border-border bg-bg rounded-xl p-3 h-36 flex flex-col justify-between hover:border-border-strong transition-all"
                  >
                    <button
                      onClick={() => handleRemoveHero(hero.id)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-surface hover:bg-danger/20 text-muted hover:text-danger transition-colors cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                    <div>
                      <span className="text-[8px] font-bold text-subtle block">SLOT #{idx + 1}</span>
                      <span className="text-xs font-black text-text mt-1 block leading-tight">{hero.name}</span>
                      <span className="text-[9px] text-brand mt-0.5 block">{getProfessionLabel(hero.profession)}</span>
                    </div>
                    <Link
                      to={`/heroes/${hero.id}`}
                      className="text-[9px] text-muted hover:text-brand flex items-center gap-0.5"
                    >
                      Inspect <ChevronRight size={8} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Heroes Selector Pool */}
          <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
            <h3 className="text-sm font-black text-subtle uppercase tracking-widest">Available Mercenary Pool</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Filter pool by hero name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-border bg-bg text-xs rounded-xl focus:outline-none placeholder-subtle text-text"
                />
                <Search size={12} className="absolute left-3 top-2.5 text-subtle" />
              </div>
              <select
                value={profFilter}
                onChange={(e) => setProfFilter(parseInt(e.target.value))}
                className="px-3 py-1.5 border border-border bg-bg text-xs rounded-xl text-subtle focus:outline-none"
              >
                <option value={0}>All Professions</option>
                <option value={1}>Agility</option>
                <option value={2}>Defending</option>
                <option value={3}>Intellect</option>
                <option value={4}>Strength</option>
                <option value={5}>Warlock</option>
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {heroPool.map(h => (
                <button
                  key={h.id}
                  onClick={() => handleAddHero(h.id)}
                  className="p-2.5 text-left border border-border bg-bg/60 hover:border-brand-soft rounded-xl transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-text block group-hover:text-brand transition-colors">{h.name}</span>
                    <span className="text-[9px] text-muted block">{getProfessionLabel(h.profession)}</span>
                  </div>
                  <Plus size={12} className="text-muted group-hover:text-brand" />
                </button>
              ))}
            </div>
          </div>

          {/* Active Bonds Details */}
          <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
            <h3 className="text-sm font-black text-subtle uppercase tracking-widest">Team Bonds Breakdown</h3>
            <div className="space-y-3">
              {teamBonds.map((tb, idx) => (
                <div
                  key={idx}
                  className={`p-4 border rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                    tb.isActive
                      ? 'border-success/30 bg-success/5'
                      : 'border-border bg-bg/40 opacity-70'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-text">{tb.hero.name}</span>
                      <ChevronRight size={10} className="text-muted" />
                      <span className="text-xs font-bold text-brand">{tb.partner?.name || `Partner #${tb.bond.connect_id}`}</span>
                    </div>
                    <div className="text-[10px] text-muted font-mono">
                      Bond Type: {tb.bond.type} • Required Points: {tb.bond.condition_point} ★
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {tb.activeStats.map((stat, sIdx) => (
                      <span
                        key={sIdx}
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          tb.isActive
                            ? 'bg-success/10 border border-success/20 text-success'
                            : 'bg-bg border border-border text-muted'
                        }`}
                      >
                        {stat.label}: {stat.value}
                      </span>
                    ))}
                    {tb.isActive ? (
                      <span className="text-[9px] font-black uppercase text-success bg-success/10 px-1.5 py-0.5 rounded border border-success/20 flex items-center gap-0.5">
                        <Check size={8} /> Active
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase text-muted bg-bg px-1.5 py-0.5 rounded border border-border flex items-center gap-0.5">
                        <AlertTriangle size={8} /> Inactive
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {teamBonds.length === 0 && (
                <div className="p-8 text-center text-muted border border-dashed border-border rounded-xl">
                  Add heroes above to simulate their active synergistic partner bonds.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Synergy Results & Recommendations */}
        <div className="lg:col-span-1 space-y-6">
          {/* Level slider for growth curves */}
          <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-subtle">
                <TrendingUp size={14} className="text-sky-400" />
                Bond Level curves
              </div>
              <div className="text-xs font-black font-mono text-brand bg-brand-soft px-2 py-0.5 rounded border border-border">
                Lv.{simLevel} / 30
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={simLevel}
              onChange={(e) => setSimLevel(parseInt(e.target.value))}
              className="w-full accent-brand cursor-pointer"
            />
            <span className="text-[10px] text-muted block leading-normal">
              Adjust level to simulate the chip costs and stat growths of active bonds.
            </span>
          </div>

          {/* Combined active stats results */}
          <div className="p-5 bg-surface border border-border rounded-2xl space-y-4">
            <h3 className="text-xs font-black text-subtle uppercase tracking-widest border-b border-border pb-2">
              Combined Stat Boosts
            </h3>
            <div className="space-y-2.5">
              {totalSynergyStats.map((stat, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-mono">
                  <span className="text-muted">{stat.label}</span>
                  <span className="text-success font-extrabold">{stat.value}</span>
                </div>
              ))}
              {totalSynergyStats.length === 0 && (
                <div className="text-center text-muted text-xs py-4">No active bonds yet</div>
              )}
            </div>
          </div>

          {/* Missing Partner Recommendations */}
          <div className="p-5 bg-surface border border-border rounded-2xl space-y-4">
            <h3 className="text-xs font-black text-subtle uppercase tracking-widest border-b border-border pb-2">
              Synergy Solver Recommendations
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {recommendedPartners.map((rec, idx) => (
                <div
                  key={rec.hero.id}
                  onClick={() => handleAddHero(rec.hero.id)}
                  className="p-3 border border-border bg-bg/60 rounded-xl hover:border-brand-soft transition-all cursor-pointer flex justify-between items-center"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-text block">{rec.hero.name}</span>
                    <span className="text-[10px] text-muted block">
                      Unlocks bonds for: <span className="text-brand font-medium">{rec.unlocksFor.join(', ')}</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-black font-mono text-brand bg-brand-soft px-2 py-1 rounded border border-border shrink-0">
                    +{rec.count} Bonds
                  </span>
                </div>
              ))}
              {recommendedPartners.length === 0 && (
                <div className="text-center text-muted text-xs py-4">All deployed hero bonds are unlocked!</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
