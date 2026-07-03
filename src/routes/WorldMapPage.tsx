import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadCities } from '../data/loaders';
import { City } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Compass, ArrowLeft, ArrowDown, MapPin, Search } from 'lucide-react';

export const WorldMapPage: React.FC = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await loadCities();
      const sorted = [...res.rows].sort((a, b) => a.id - b.id);
      setCities(sorted);
      if (sorted.length > 0) {
        setSelectedCityId(sorted[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load cities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return cities;
    const query = searchQuery.toLowerCase();
    return cities.filter(c =>
      (c.name && c.name.toLowerCase().includes(query)) ||
      c.id.toString().includes(query)
    );
  }, [cities, searchQuery]);

  // Trace the progression path for the selected city
  const cityChain = useMemo(() => {
    if (!selectedCityId || cities.length === 0) return [];

    // Predecessors (trace backwards)
    const predecessors: City[] = [];
    let current = cities.find(c => c.id === selectedCityId);
    while (current && current.pre_city !== 0) {
      const parent = cities.find(c => c.id === current?.pre_city);
      if (parent) {
        predecessors.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }

    const target = cities.find(c => c.id === selectedCityId);

    // Successors (trace forwards - follow single chain)
    const successors: City[] = [];
    let child = target ? cities.find(c => c.pre_city === target.id) : null;
    let iterations = 0;
    while (child && iterations < 15) {
      successors.push(child);
      child = cities.find(c => c.pre_city === child?.id);
      iterations++;
    }

    const fullChain = [...predecessors];
    if (target) fullChain.push(target);
    fullChain.push(...successors);
    return fullChain;
  }, [cities, selectedCityId]);

  if (loading) return <LoadingState message="Drawing geographical nodes and unlocking coordinates..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <div>
        <Link
          to="/cities"
          className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-text dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Cities Catalog</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 rounded-xl">
            <Compass size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-text">World Map Progression Flow</h1>
            <p className="text-xs text-muted font-semibold">Visualize chapter unlock pathways, required level criteria, and campaign stage limits.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left selector */}
        <div className="xl:col-span-1 border border-border bg-surface p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-text border-b border-border pb-2.5">
            Focus Map Zone
          </h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search zones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-border bg-bg focus:outline-none focus:ring-1.5 focus:ring-fuchsia-500 placeholder-zinc-400"
            />
            <Search size={14} className="absolute left-3.5 top-3.5 text-subtle" />
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredCities.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCityId(c.id)}
                className={`w-full p-3 text-left border rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                  selectedCityId === c.id
                    ? 'border-fuchsia-500 bg-fuchsia-500/5 text-fuchsia-800 dark:text-fuchsia-400 font-bold'
                    : 'border-border hover:border-border-strong hover:bg-hover/50 text-muted'
                }`}
              >
                <div className="truncate pr-2">
                  <span className="font-semibold block truncate">{c.name}</span>
                  <span className="text-[10px] text-subtle">Unlock: Lv. {c.open_level}</span>
                </div>
                <span className="font-mono text-[9px] text-subtle shrink-0">#{c.id}</span>
              </button>
            ))}
            {filteredCities.length === 0 && (
              <p className="text-xs text-subtle text-center py-8">No zones match query.</p>
            )}
          </div>
        </div>

        {/* Progression path visualizer */}
        <div className="xl:col-span-2 space-y-6">
          <div className="border border-border bg-surface p-6 rounded-2xl shadow-sm">
            <h3 className="font-extrabold text-sm text-text border-b border-border pb-3">
              Geographical Chapter Timeline
            </h3>

            <div className="pt-6 relative pl-6 md:pl-8 space-y-8 before:absolute before:left-[11px] before:top-8 before:bottom-8 before:w-0.5 before:bg-surface-raised dark:before:bg-surface">
              {cityChain.map((c, idx) => {
                const isTarget = c.id === selectedCityId;

                return (
                  <div key={c.id} className="relative space-y-3">
                    {/* Circle marker */}
                    <div className={`absolute -left-[27px] md:-left-[35px] top-1.5 w-4 h-4 rounded-full border-2 bg-surface transition-all flex items-center justify-center ${
                      isTarget
                        ? 'border-fuchsia-500 scale-125 ring-4 ring-fuchsia-500/20'
                        : 'border-border-strong'
                    }`}>
                      {isTarget && <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" />}
                    </div>

                    {/* Timeline card */}
                    <div className={`p-4 md:p-5 border rounded-2xl shadow-sm transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4 ${
                      isTarget
                        ? 'border-fuchsia-555 dark:border-fuchsia-800 bg-fuchsia-500/5'
                        : 'border-border bg-bg/10'
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-subtle font-bold">Zone ID: {c.id}</span>
                          {c.pre_city === 0 && (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-450 text-[9px] font-black uppercase tracking-wider">
                              Origin Zone
                            </span>
                          )}
                        </div>
                        <h4 className="font-black text-text text-base">{c.name}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle font-semibold pt-1">
                          <span className="flex items-center gap-1">
                            <MapPin size={13} className="text-subtle" />
                            <span>First Battle: Stage #{c.start}</span>
                          </span>
                          <span>•</span>
                          <span>Last Battle: Stage #{c.last}</span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-1.5 text-xs">
                        <span className="px-2 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-800 dark:text-fuchsia-400 font-black text-[9px] uppercase tracking-wider">
                          Required Lv. {c.open_level}
                        </span>
                        <Link
                          to={`/cities/${c.id}`}
                          className="text-violet-600 hover:text-violet-700 dark:text-violet-450 dark:hover:text-violet-350 font-bold"
                        >
                          Explore Details →
                        </Link>
                      </div>
                    </div>

                    {/* Connector Arrow */}
                    {idx < cityChain.length - 1 && (
                      <div className="flex justify-center w-4 -ml-[27px] md:-ml-[35px] text-zinc-350 dark:text-text py-1">
                        <ArrowDown size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
