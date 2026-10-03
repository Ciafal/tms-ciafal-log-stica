import React from 'react'
import { Search, RotateCw, X, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface RegionConsultaProps {
  searchTerm?: string
  onSearchChange?: (val: string) => void
  searchPlaceholder?: string
  isSearching?: boolean
  onRefresh?: () => void
  onClearFilters?: () => void
  activeFiltersCount?: number
  filtersContent?: React.ReactNode
  extraActions?: React.ReactNode
  totalRecords?: number
  filteredRecords?: number
  className?: string
  children?: React.ReactNode
  title?: string
  subtitle?: string
  totalCount?: number
  filteredCount?: number
  onSearch?: (term?: string) => void
  onClear?: () => void
}

export const RegionConsulta: React.FC<RegionConsultaProps> = ({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Buscar por placa, motorista, destino, documento...',
  isSearching = false,
  onRefresh,
  onClearFilters,
  activeFiltersCount = 0,
  filtersContent,
  extraActions,
  totalRecords,
  filteredRecords,
  className,
  children,
  title,
  subtitle,
  totalCount,
  filteredCount,
  onSearch,
  onClear,
}) => {
  const effectiveTotal = totalRecords ?? totalCount
  const effectiveFiltered = filteredRecords ?? filteredCount
  const handleClear = onClearFilters || onClear
  const handleRefresh = onRefresh || (onSearch ? () => onSearch() : undefined)

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-xs p-3 sm:p-4 mb-4 space-y-3 transition-all',
        className,
      )}
    >
      {(title || subtitle) && (
        <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between gap-2">
          <div>
            {title && <h3 className="text-xs sm:text-sm font-bold text-slate-800">{title}</h3>}
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {(onSearch || onClear) && (
            <div className="flex items-center gap-2">
              {handleClear && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-8 text-xs text-slate-600 hover:text-slate-900"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Limpar
                </Button>
              )}
              {onSearch && (
                <Button
                  size="sm"
                  onClick={() => onSearch()}
                  disabled={isSearching}
                  className="h-8 text-xs font-semibold bg-[#005596] hover:bg-[#004275] text-white"
                >
                  <Search className="w-3.5 h-3.5 mr-1" />
                  Consultar
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {onSearchChange !== undefined && (
          <div className="relative flex-1 min-w-[220px] max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="search"
              value={searchTerm ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-8 text-xs sm:text-sm h-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {activeFiltersCount > 0 && (
            <Badge
              variant="secondary"
              className="gap-1 text-xs font-medium bg-amber-50 text-amber-800 border-amber-200"
            >
              <Filter className="w-3 h-3" />
              {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo
              {activeFiltersCount > 1 ? 's' : ''}
            </Badge>
          )}

          {onClearFilters && activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-9 text-xs text-slate-600 hover:text-slate-900"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Limpar filtros
            </Button>
          )}

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isSearching}
              className="h-9 text-xs font-semibold text-slate-700 hover:bg-slate-50 border-slate-200"
              title="Atualizar dados"
            >
              <RotateCw
                className={cn('w-3.5 h-3.5 mr-1.5', isSearching && 'animate-spin text-[#005596]')}
              />
              Atualizar
            </Button>
          )}

          {extraActions}
        </div>
      </div>

      {filtersContent && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
          {filtersContent}
        </div>
      )}

      {children && <div className="pt-2 border-t border-slate-100">{children}</div>}

      {(effectiveTotal !== undefined || effectiveFiltered !== undefined) && (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            {effectiveFiltered !== undefined &&
            effectiveTotal !== undefined &&
            effectiveFiltered !== effectiveTotal ? (
              <>
                Exibindo <strong>{effectiveFiltered}</strong> de <strong>{effectiveTotal}</strong>{' '}
                registros
              </>
            ) : effectiveTotal !== undefined ? (
              <>
                Total de <strong>{effectiveTotal}</strong> registros
              </>
            ) : null}
          </span>
        </div>
      )}
    </div>
  )
}
