import React, { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  Row,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  searchPlaceholder?: string;
  filterComponent?: (props: {
    globalFilter: string;
    setGlobalFilter: (val: string) => void;
  }) => React.ReactNode;
  onRowClick?: (row: TData) => void;
  pageSize?: number;
}

export function DataTable<TData extends { id: any }>({
  columns,
  data,
  searchPlaceholder = "Search record…",
  filterComponent,
  onRowClick,
  pageSize = 15,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState({});
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | number | null>(null);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
  });

  const handleRowInteraction = (row: Row<TData>) => {
    setSelectedRowId(row.original.id);
    if (onRowClick) {
      onRowClick(row.original);
    }
  };
  
  useEffect(() => {
    setShowVisibilityMenu(false)
  }, [columnVisibility]);

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
            <Search size={18} aria-hidden="true" />
          </div>
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="block w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-surface text-text placeholder-subtle focus:outline-none focus:ring-2 focus:ring-brand text-sm transition-all"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Custom Filters Slot */}
          {filterComponent && filterComponent({ globalFilter, setGlobalFilter })}

          {/* Column Visibility Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowVisibilityMenu(prev => !prev)}
              aria-haspopup="menu"
              aria-expanded={showVisibilityMenu}
              className="px-4 py-2 border border-border rounded-xl text-sm bg-surface text-muted hover:bg-hover hover:text-text font-medium flex items-center gap-1.5 transition-colors"
            >
              <Eye size={16} aria-hidden="true" />
              <span>Columns</span>
            </button>
            {showVisibilityMenu && (
              <div 
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface shadow-lg z-20 max-h-64 overflow-y-auto p-2 space-y-1"
              >
                <div className="text-xs font-semibold text-subtle px-2 py-1 border-b border-border mb-1">
                  Toggle Visibility
                </div>
                {table.getAllLeafColumns().map((column) => {
                  return (
                    <label
                      key={column.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-hover text-sm font-medium text-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="rounded border-border text-brand focus:ring-brand bg-bg"
                      />
                      <span>{String(column.columnDef.header ?? column.id)}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Grid */}
      <section className="border border-border rounded-xl overflow-x-auto bg-surface shadow-sm backdrop-blur-sm">
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead className="sticky top-0 bg-surface/80 backdrop-blur-md text-muted font-medium">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      tabIndex={canSort ? 0 : undefined}
                      role={canSort ? 'button' : undefined}
                      aria-label={canSort ? `Sort by ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.id}` : undefined}
                      className={`px-4 py-3.5 whitespace-nowrap select-none transition-colors focus:outline-none focus-visible:bg-hover ${
                        canSort ? 'cursor-pointer hover:bg-hover' : ''
                      }`}
                      onClick={header.column.getToggleSortingHandler()}
                      onKeyDown={(e) => {
                        if (canSort && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          header.column.getToggleSortingHandler()?.(e);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {canSort && (
                          <span className="text-subtle">
                            {{
                              asc: <ChevronUp size={14} aria-hidden="true" />,
                              desc: <ChevronDown size={14} aria-hidden="true" />,
                            }[header.column.getIsSorted() as string] ?? <ChevronsUpDown size={14} aria-hidden="true" />}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border text-text">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-selected={selectedRowId === row.original.id}
                  onClick={() => handleRowInteraction(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowInteraction(row);
                    }
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  className="transition-colors focus:outline-none data-[selected=true]:bg-brand-soft hover:bg-brand-soft/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 whitespace-nowrap text-xs md:text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted italic bg-surface"
                >
                  No records match your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-sm text-muted py-2 px-1">
        <div className="text-muted">
          Showing{' '}
          <span className="font-semibold text-text font-mono font-tabular">
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
          </span>{' '}
          to{' '}
          <span className="font-semibold text-text font-mono font-tabular">
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}
          </span>{' '}
          of{' '}
          <span className="font-semibold text-text font-mono font-tabular">
            {table.getFilteredRowModel().rows.length}
          </span>{' '}
          records
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
            className="p-1.5 border border-border rounded-lg bg-surface disabled:opacity-50 hover:bg-hover transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span className="font-medium text-text">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
            className="p-1.5 border border-border rounded-lg bg-surface disabled:opacity-50 hover:bg-hover transition-colors cursor-pointer"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
