import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadNightmareCities, loadNightmarePoints, loadArticles } from '../data/loaders';
import { NightmareCity, NightmarePoint, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { 
  Globe, Shield, Swords, Info, ChevronRight, Compass,
  Award, TrendingUp, AlertCircle, Sparkles
} from 'lucide-react';

const CITIES_METADATA = [
  { id: 1, name: 'Karakura Town (Nightmare)', desc: 'Unlocks advanced soul fragments and rank merit gems.' },
  { id: 2, name: 'Rukongai Suburbs (Nightmare)', desc: 'Features elite Hollow squad bosses and high silver yields.' },
  { id: 3, name: 'Seireitei Gates (Nightmare)', desc: 'Challenge Squad Vice-Captains in high-pressure soul duels.' },
  { id: 4, name: 'Senkaimon Abyss (Nightmare)', desc: 'Fierce battle portal dropping refinement shards and crystals.' },
  { id: 5, name: 'Hueco Mundo Plains (Nightmare)', desc: 'Realm of Menos Grande. High-tier hollow drops.' },
  { id: 6, name: 'Las Noches Ruins (Nightmare)', desc: 'Desolate palace checkpoints guarding Espada fragments.' },
  { id: 7, name: 'Sokyoku Hill (Nightmare)', desc: 'Altar duel portal dropping legendary zanpakuto souls.' },
  { id: 8, name: 'Central 46 Chambers (Nightmare)', desc: 'Heavy security compound with elite Shinigami patrols.' },
  { id: 9, name: 'Fake Karakura Realm (Nightmare)', desc: 'Ultimate dimension battle portal featuring Espada commanders.' },
  { id: 10, name: 'Garanta Abyss (Nightmare)', desc: 'Dimensional void filled with chaotic spirit anomalies.' },
  { id: 11, name: 'Soul King Palace (Nightmare)', desc: 'Altar of the royal guard. High-tier refined accessories drops.' },
  { id: 12, name: 'Royal Altar Shrine (Nightmare)', desc: 'Descent of the final bosses. Ultimate endgame challenges.' },
];

export const NightmareRealmsPage: React.FC = () => {
  const [cities, setCities] = useState<NightmareCity[]>([]);
  const [points, setPoints] = useState<NightmarePoint[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selector state
  const [selectedCityId, setSelectedCityId] = useState<number>(1);
  const [selectedPointId, setSelectedPointId] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [citiesRes, ptsRes, artRes] = await Promise.all([
          loadNightmareCities(),
          loadNightmarePoints(),
          loadArticles()
        ]);
        
        setCities(citiesRes.rows.sort((a, b) => a.id - b.id));
        setPoints(ptsRes.rows.sort((a, b) => a.id - b.id));
        setArticles(artRes.rows);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load Nightmare Trial databases.');
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

  const activeCity = useMemo(() => {
    return cities.find(c => c.id === selectedCityId) || null;
  }, [cities, selectedCityId]);

  // Points belonging to selected city/chapter
  // Points are grouped by city, e.g. City 1 points usually start at index 1-15, City 2 at index 16-30.
  // We can filter points based on coordinates, name indices, or ID grouping ranges
  const cityPoints = useMemo(() => {
    // There are 180 points and 12 cities, which means exactly 15 points per city!
    // City 1: 1-15
    // City 2: 16-30
    // ...
    const startIdx = (selectedCityId - 1) * 15 + 1;
    const endIdx = selectedCityId * 15;
    return points.filter(p => p.id >= startIdx && p.id <= endIdx);
  }, [points, selectedCityId]);

  // Default selection when city changes
  useEffect(() => {
    if (cityPoints.length > 0) {
      setSelectedPointId(cityPoints[0].id);
    }
  }, [cityPoints]);

  const activePoint = useMemo(() => {
    return points.find(p => p.id === selectedPointId) || null;
  }, [points, selectedPointId]);

  // Decode rewards
  const firstClearAwards = useMemo(() => {
    if (!activeCity || !activeCity.pass_awards) return [];
    return activeCity.pass_awards.map(item => {
      const art = articlesMap[item.code];
      return {
        name: art ? art.name : `Item #${item.code}`,
        amount: item.amount || 0
      };
    });
  }, [activeCity, articlesMap]);

  if (loading) return <LoadingState message="Decoding Hueco Mundo Nightmare realms..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const activeMeta = CITIES_METADATA.find(c => c.id === selectedCityId) || CITIES_METADATA[0];

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
            <Globe className="text-red-500 animate-pulse" size={28} />
            Nightmare Trial & Realm Campaign Guide
          </h1>
          <p className="text-xs text-muted mt-1">
            Browse high-difficulty campaign checkpoints, audit enemy army IDs, and check chapter first-clear rewards.
          </p>
        </div>
      </div>

      {/* Chapters Grid */}
      <div className="p-4 border border-border bg-surface rounded-2xl shadow-sm space-y-3">
        <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Select Nightmare City</span>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {CITIES_METADATA.map((city) => (
            <button
              key={city.id}
              onClick={() => setSelectedCityId(city.id)}
              className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all ${
                selectedCityId === city.id
                  ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400 shadow-sm'
                  : 'border-border bg-bg/50 hover:border-border text-muted'
              }`}
            >
              <span className="block text-[9px] text-subtle font-mono">Chapter {city.id}</span>
              <span className="block truncate">{city.name.split(' (')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Points list */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Checkpoints Timeline</span>
            
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {cityPoints.map((pt, idx) => {
                const isSelected = selectedPointId === pt.id;
                return (
                  <button
                    key={pt.id}
                    onClick={() => setSelectedPointId(pt.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400 shadow-sm'
                        : 'border-border bg-bg/50 hover:border-border text-muted'
                    }`}
                  >
                    <span>{pt.name || `Point #${idx + 1}`}</span>
                    <span className="font-mono text-[9px] text-subtle">Node {pt.id}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Checkpoint Details & Rewards */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Checkpoint Details card */}
          <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-border/60">
              <div>
                <span className="text-[10px] text-subtle block uppercase font-mono">{activeMeta?.name}</span>
                <h3 className="font-black text-base text-text mt-0.5">
                  {activePoint?.name || 'Campaign Checkpoint'}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-red-500/10 text-red-700 dark:text-red-400 font-semibold font-mono">
                Stage ID: {activePoint?.id}
              </span>
            </div>

            {/* Stage Specifications */}
            {activePoint ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                <div className="p-3 border border-border bg-bg/10 rounded-xl space-y-1">
                  <span className="font-semibold text-subtle uppercase text-[9px] block">Enemy Army ID</span>
                  <div className="flex items-center gap-1.5">
                    <Swords size={14} className="text-red-500" />
                    <span className="font-bold text-text">
                      Army #{activePoint.army_ids[0] || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="p-3 border border-border bg-bg/10 rounded-xl space-y-1">
                  <span className="font-semibold text-subtle uppercase text-[9px] block">Battle Scene Backdrop</span>
                  <div className="flex items-center gap-1.5">
                    <Compass size={14} className="text-subtle" />
                    <span className="font-bold text-text">
                      Scene #{activePoint.battle_scene}
                    </span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-8 text-center text-xs text-subtle italic">
                Select a checkpoint to view details.
              </div>
            )}
          </div>

          {/* Chapter Pass Rewards */}
          <div className="p-5 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <span className="block text-[10px] font-bold text-subtle uppercase tracking-wider">Chapter Clear Reward Package</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {firstClearAwards.length > 0 ? (
                firstClearAwards.map((item, idx) => (
                  <div key={idx} className="p-3 border border-border bg-bg/20 dark:bg-bg/15 rounded-xl flex items-center justify-between">
                    <span className="font-bold text-text">{item.name}</span>
                    <span className="font-mono font-black text-red-600 dark:text-red-400">{item.amount.toLocaleString()}x</span>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-6 text-center text-xs text-subtle italic">
                  No clear reward package registered for this chapter.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
