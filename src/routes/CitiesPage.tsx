import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadCities } from '../data/loaders';
import { City } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Map } from 'lucide-react';

export const CitiesPage: React.FC = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchCitiesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadCities();
      setCities(data.rows);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load cities database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCitiesData();
  }, []);

  const columns = useMemo<ColumnDef<City>[]>(() => [
    {
      accessorKey: 'id',
      header: 'City ID',
      cell: (info) => <span className="font-mono text-muted font-semibold">{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'name',
      header: 'City Name',
      cell: (info) => (
        <span className="font-bold text-text hover:text-violet-600 transition-colors">
          {info.getValue() as string || `City #${info.row.original.id}`}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Map Type',
      cell: (info) => <span className="text-xs font-semibold text-muted">Type {info.getValue() as number}</span>,
    },
    {
      accessorKey: 'map_id',
      header: 'Map Asset ID',
      cell: (info) => <span className="font-mono text-xs text-subtle">#{info.getValue() as number}</span>,
    },
    {
      accessorKey: 'open_level',
      header: 'Unlock Level',
      cell: (info) => <span className="font-mono text-xs font-bold text-indigo-600">Lv. {info.getValue() as number || 1}</span>,
    },
    {
      accessorKey: 'start',
      header: 'Start Node ID',
      cell: (info) => <span className="font-mono text-xs text-subtle">{info.getValue() as number || 0}</span>,
    },
    {
      accessorKey: 'last',
      header: 'Last Node ID',
      cell: (info) => <span className="font-mono text-xs text-subtle">{info.getValue() as number || 0}</span>,
    },
    {
      accessorKey: 'pre_city',
      header: 'Pre-requisite Town',
      cell: (info) => {
        const val = info.getValue() as number | null;
        if (!val) return <span className="text-subtle italic text-xs">None (Starter Town)</span>;
        return <span className="font-mono text-xs text-violet-500 font-semibold">City #{val}</span>;
      },
    },
  ], []);

  const handleRowClick = (city: City) => {
    navigate(`/cities/${city.id}`);
  };

  if (loading) return <LoadingState message="Downloading global map matrices and town models..." />;
  if (error) return <ErrorState message={error} onRetry={fetchCitiesData} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl">
            <Map size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text dark:text-zinc-100">Cities & Towns</h1>
            <p className="text-sm text-muted">Explore the game's geographical hubs, unlock parameters, and map node linkages.</p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={cities}
        searchPlaceholder="Filter towns by name..."
        onRowClick={handleRowClick}
      />
    </div>
  );
};
