import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadCities } from '../data/loaders';
import { City } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { JsonViewer } from '../components/JsonViewer';
import { ArrowLeft, MapPin, Compass, AlertCircle, RefreshCw } from 'lucide-react';

export const CityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [city, setCity] = useState<City | null>(null);
  const [allCities, setAllCities] = useState<City[]>([]);

  const fetchCityDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const cityId = parseInt(id || '');

      const citiesRes = await loadCities();
      setAllCities(citiesRes.rows);

      const match = citiesRes.rows.find(c => c.id === cityId);
      if (match) {
        setCity(match);
      } else {
        setError(`City with ID ${id} not found in the geographic indexes.`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load city/town configurations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCityDetails();
  }, [id]);

  const preCityRecord = useMemo(() => {
    if (!city || !city.pre_city) return null;
    return allCities.find(c => c.id === city.pre_city);
  }, [city, allCities]);

  const postCities = useMemo(() => {
    if (!city) return [];
    return allCities.filter(c => c.pre_city === city.id);
  }, [city, allCities]);

  if (loading) return <LoadingState message="Downloading town coordinate nodes and pre-requisite linkages..." />;
  if (error) return <ErrorState message={error} onRetry={fetchCityDetails} />;
  if (!city) return <ErrorState message="City not found." onRetry={fetchCityDetails} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <div>
        <Link
          to="/cities"
          className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-text dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Cities</span>
        </Link>
      </div>

      {/* Main City card */}
      <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-subtle font-bold bg-bg px-2 py-0.5 rounded">
              ID: {city.id}
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/40 text-rose-750 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
              Geographic Town Hub
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-text flex items-center gap-2">
            <MapPin size={28} className="text-rose-500" />
            <span>{city.name || `City #${city.id}`}</span>
          </h1>

          <p className="text-sm text-muted leading-relaxed">
            Geographical zone mapped to Map Asset ID <span className="font-mono font-bold text-muted">#{city.map_id}</span>. Requires level <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">Lv. {city.open_level || 1}</span> to entry.
          </p>
        </div>

        {/* Map specifications Block */}
        <div className="w-full md:w-64 border border-border rounded-xl p-4 bg-bg/50 space-y-3 shrink-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-subtle border-b border-border pb-1.5">Map Properties</h4>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
            <div>
              <span className="text-subtle block mb-0.5">Map Category</span>
              <span className="font-semibold text-muted">Type {city.type}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Asset Sprite ID</span>
              <span className="font-semibold text-muted">Icon {city.icon ?? 'None'}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Start Node ID</span>
              <span className="font-mono text-muted">{city.start ?? 0}</span>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">End Node ID</span>
              <span className="font-mono text-muted">{city.last ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progression Linkage graphs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pre-requisite Town */}
        <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
            <Compass size={18} className="text-rose-500" />
            <span>Predecessor Town Pathway</span>
          </h3>

          {preCityRecord ? (
            <Link
              to={`/cities/${preCityRecord.id}`}
              className="p-4 border border-border rounded-xl flex items-center justify-between hover:border-rose-500 hover:shadow-sm transition-all text-sm block"
            >
              <div>
                <span className="font-bold text-text hover:text-rose-600 transition-colors">{preCityRecord.name}</span>
                <span className="block text-[11px] text-subtle font-medium">Req Level: Lv. {preCityRecord.open_level} | Map ID: {preCityRecord.map_id}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-surface-raised font-mono text-[10px] text-muted">
                City #{preCityRecord.id}
              </span>
            </Link>
          ) : (
            <div className="text-sm text-subtle italic py-2 flex items-center gap-1.5">
              <AlertCircle size={14} />
              <span>This is the first starter town in the progression map tree.</span>
            </div>
          )}
        </div>

        {/* Following unlocked Town paths */}
        <div className="p-5 border border-border bg-surface rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2 border-b border-border pb-2">
            <RefreshCw size={18} className="text-indigo-500" />
            <span>Unlocked Future Pathways</span>
          </h3>

          {postCities.length > 0 ? (
            <div className="space-y-3">
              {postCities.map((postCity) => (
                <Link
                  key={postCity.id}
                  to={`/cities/${postCity.id}`}
                  className="p-3 border border-border rounded-lg flex items-center justify-between hover:border-indigo-500 hover:shadow-sm transition-all text-sm block"
                >
                  <div>
                    <span className="font-bold text-text hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{postCity.name}</span>
                    <span className="block text-[11px] text-subtle">Unlock level: Lv. {postCity.open_level}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-surface-raised font-mono text-[10px] text-muted">
                    City #{postCity.id}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-sm text-subtle italic py-2 flex items-center gap-1.5">
              <AlertCircle size={14} />
              <span>No further town expansions branch out from here in our database files.</span>
            </div>
          )}
        </div>
      </div>

      {/* Raw entry fallback */}
      <JsonViewer data={city} title={`Raw JSON Database Entry: City #${city.id}`} />
    </div>
  );
};
