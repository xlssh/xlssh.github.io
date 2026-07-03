import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  loadHeroes,
  loadArticles,
  loadDailyQuests,
  loadStoryQuests,
  loadCities,
  loadStages,
  loadMallItems,
  loadPromotionalActivities
} from '../data/loaders';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Search, ChevronRight } from 'lucide-react';

interface SearchResult {
  table: string;
  id: number;
  title: string;
  subtitle: string;
  link: string;
}

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(queryParam);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cached data state
  const [datasets, setDatasets] = useState<{
    heroes: any[];
    articles: any[];
    dailyQuests: any[];
    storyQuests: any[];
    cities: any[];
    stages: any[];
    mallItems: any[];
    promotions: any[];
  } | null>(null);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [
        heroesRes,
        articlesRes,
        dailyRes,
        storyRes,
        citiesRes,
        stagesRes,
        mallRes,
        promotionsRes
      ] = await Promise.all([
        loadHeroes(),
        loadArticles(),
        loadDailyQuests(),
        loadStoryQuests(),
        loadCities(),
        loadStages(),
        loadMallItems(),
        loadPromotionalActivities()
      ]);

      setDatasets({
        heroes: heroesRes.rows,
        articles: articlesRes.rows,
        dailyQuests: dailyRes.rows,
        storyQuests: storyRes.rows,
        cities: citiesRes.rows,
        stages: stagesRes.rows,
        mallItems: mallRes.rows,
        promotions: promotionsRes.rows
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to download search indexes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Sync state if URL changes externally
  useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: searchInput.trim() });
  };

  const results = useMemo<SearchResult[]>(() => {
    if (!datasets || !queryParam.trim()) return [];

    const query = queryParam.toLowerCase().trim();
    const matches: SearchResult[] = [];

    // 1. Heroes
    datasets.heroes.forEach(h => {
      const matchName = (h.name || '').toLowerCase().includes(query);
      const matchDesc = (h.description || '').toLowerCase().includes(query);
      const matchAssess = (h.assess || '').toLowerCase().includes(query);
      if (matchName || matchDesc || matchAssess) {
        matches.push({
          table: 'Heroes',
          id: h.id,
          title: h.name || `Hero #${h.id}`,
          subtitle: h.description || h.assess || 'No description available.',
          link: `/heroes/${h.id}`
        });
      }
    });

    // 2. Articles
    datasets.articles.forEach(a => {
      const matchName = (a.name || '').toLowerCase().includes(query);
      const matchDesc = (a.function_desc || '').toLowerCase().includes(query);
      if (matchName || matchDesc) {
        matches.push({
          table: 'Articles / Items',
          id: a.id,
          title: a.name || `Article #${a.id}`,
          subtitle: a.function_desc || 'No item description.',
          link: `/articles/${a.id}`
        });
      }
    });

    // 3. Story Quests
    datasets.storyQuests.forEach(q => {
      const matchName = (q.name || '').toLowerCase().includes(query);
      const matchDesc = (q.description || '').toLowerCase().includes(query);
      if (matchName || matchDesc) {
        matches.push({
          table: 'Story Quests',
          id: q.id,
          title: q.name || `Quest #${q.id}`,
          subtitle: q.description || 'No quest description.',
          link: `/story-quests/${q.id}`
        });
      }
    });

    // 4. Daily Quests
    datasets.dailyQuests.forEach(q => {
      const matchName = (q.task_name || '').toLowerCase().includes(query);
      const matchDesc = (q.description || '').toLowerCase().includes(query);
      if (matchName || matchDesc) {
        matches.push({
          table: 'Daily Quests',
          id: q.id,
          title: q.task_name || `Daily Task #${q.id}`,
          subtitle: q.description || 'No description.',
          link: `/daily-quests/${q.id}`
        });
      }
    });

    // 5. Cities
    datasets.cities.forEach(c => {
      const matchName = (c.name || '').toLowerCase().includes(query);
      if (matchName) {
        matches.push({
          table: 'Cities',
          id: c.id,
          title: c.name || `City #${c.id}`,
          subtitle: `Map ID: ${c.map_id} | Open Level: ${c.open_level}`,
          link: `/cities/${c.id}`
        });
      }
    });

    // 6. Stages
    datasets.stages.forEach(s => {
      const matchName = (s.name || '').toLowerCase().includes(query);
      const matchDesc = (s.desc || '').toLowerCase().includes(query);
      if (matchName || matchDesc) {
        matches.push({
          table: 'Stages',
          id: s.id,
          title: s.name || `Stage #${s.id}`,
          subtitle: s.desc || `Stage range: ${s.start_id} - ${s.end_id}`,
          link: `/stages/${s.id}`
        });
      }
    });

    // 7. Mall Items
    datasets.mallItems.forEach(m => {
      const matchName = (m.name || '').toLowerCase().includes(query);
      if (matchName) {
        matches.push({
          table: 'Mall Items',
          id: m.id,
          title: m.name || `Mall Item #${m.id}`,
          subtitle: `Cost: ${m.gold} Gold | VIP Level Required: ${m.vip}`,
          link: `/mall-items` // mall-items has a list view where we can navigate or search
        });
      }
    });

    // 8. Promotions
    datasets.promotions.forEach(p => {
      const matchName = (p.name || '').toLowerCase().includes(query);
      if (matchName) {
        matches.push({
          table: 'Promotional Activities',
          id: p.id,
          title: p.name || `Promotion #${p.id}`,
          subtitle: `Activity ID: ${p.act_id} | Target Lv: ${p.player_lv}`,
          link: `/promotions`
        });
      }
    });

    return matches;
  }, [datasets, queryParam]);

  // Grouped search results
  const groupedResults = useMemo(() => {
    const groups: { [key: string]: SearchResult[] } = {};
    results.forEach(res => {
      if (!groups[res.table]) {
        groups[res.table] = [];
      }
      groups[res.table].push(res);
    });
    return groups;
  }, [results]);

  if (loading) return <LoadingState message="Downloading global game database indexes (this might take a second due to size)..." />;
  if (error) return <ErrorState message={error} onRetry={loadAllData} />;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text dark:text-zinc-100">Global Search</h1>
        <p className="text-sm text-muted">Query all 8 database tables instantly in the browser.</p>
      </div>

      {/* Main Search Input Form */}
      <form onSubmit={handleSearchSubmit} className="max-w-3xl flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-surface text-text placeholder-zinc-400 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
            placeholder="Search characters, items, quest details, stages, maps..."
          />
          <Search className="absolute left-3.5 top-3.5 text-subtle w-5 h-5" />
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm shadow transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>Search</span>
        </button>
      </form>

      {/* Search results stats */}
      {queryParam && (
        <div className="text-sm text-muted">
          Found <span className="font-semibold text-text">{results.length}</span> matches for "{queryParam}"
        </div>
      )}

      {/* Results Rendering */}
      {results.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedResults).map(([groupName, items]) => (
            <div key={groupName} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-subtle border-b border-border pb-2">
                {groupName} ({items.length})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.slice(0, 50).map((item) => ( // limit to 50 results per table in view to be fast
                  <Link
                    key={`${item.table}-${item.id}`}
                    to={item.link}
                    className="flex flex-col justify-between p-4 border border-border rounded-xl bg-surface hover:border-violet-500/50 dark:hover:border-violet-500/50 hover:shadow-sm transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-subtle mb-1">
                        <span className="font-mono">ID: {item.id}</span>
                        <span className="px-2 py-0.5 rounded bg-surface-raised font-medium text-[10px] text-muted">
                          {item.table}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-text group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {item.title}
                      </h4>
                      <p className="mt-1.5 text-xs text-muted leading-relaxed line-clamp-2">
                        {item.subtitle}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>View Record</span>
                      <ChevronRight size={12} />
                    </div>
                  </Link>
                ))}
                {items.length > 50 && (
                  <div className="col-span-full text-center py-2 text-xs text-subtle italic">
                    Showing first 50 results. Narrow down your query to view remaining results.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        queryParam && (
          <div className="border border-border rounded-xl p-12 bg-surface/50 text-center text-muted">
            <Search className="w-12 h-12 text-subtle mx-auto mb-3" />
            <h3 className="font-semibold text-text mb-1">No results found</h3>
            <p className="text-xs">Try searching for other terms like "ichigo", "sword", "stamina", or "quest".</p>
          </div>
        )
      )}
    </div>
  );
};
