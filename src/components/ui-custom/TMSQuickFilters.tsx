import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface TMSQuickFilterItem {
  id: string
  label: string
  count?: number
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  icon?: React.ComponentType<{ className?: string }>
}

export interface TMSQuickFiltersProps {
  items: TMSQuickFilterItem[]
  activeId: string
  onSelect: (id: string) => void
  label?: React.ReactNode
  className?: string
  actionSlot?: React.ReactNode
}

/**
 * Barra de Filtros Rápidos Padronizada do TMS CIAFAL.
 *
 * Características essenciais:
 * - Layout com flex-wrap: wrap real, auto-ajustável para qualquer viewport.
 * - white-space normal: não comprime textos nem corta opções quando a tela estreita.
 * - min-height padronizada (~32-36px) e padding horizontal consistente.
 * - Indicador visual claro do filtro ativo (Azul institucional CIAFAL #005596).
 * - Acessibilidade completa por teclado (tab + enter/space).
 */
export const TMSQuickFilters: React.FC<TMSQuickFiltersProps> = ({
  items,
  activeId,
  onSelect,
  label,
  className,
  actionSlot,
}) => {
  return (
    <div
      className={cn(
        'w-full min-w-0 max-w-full flex flex-wrap items-center justify-between gap-2.5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
        {label && (
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center mr-1 shrink-0 select-none py-1">
            {label}
          </div>
        )}

        {items.map((item) => {
          const isActive = activeId === item.id
          const Icon = item.icon

          return (
            <Button
              key={item.id}
              type="button"
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelect(item.id)}
              className={cn(
                'min-h-[32px] sm:min-h-[34px] h-auto py-1.5 px-3 rounded-full text-xs transition-all cursor-pointer',
                'border text-center leading-snug whitespace-normal break-words',
                isActive
                  ? 'bg-[#005596] hover:bg-[#004275] text-white border-[#005596] font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 font-medium',
              )}
              aria-pressed={isActive}
            >
              <span className="flex items-center gap-1.5 justify-center">
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                <span>{item.label}</span>
                {typeof item.count === 'number' && (
                  <Badge
                    variant={isActive ? 'secondary' : 'outline'}
                    className={cn(
                      'text-[9px] px-1.5 py-0 font-mono ml-0.5',
                      isActive ? 'bg-white/20 text-white border-transparent' : 'text-slate-600',
                    )}
                  >
                    {item.count}
                  </Badge>
                )}
              </span>
            </Button>
          )
        })}
      </div>

      {actionSlot && <div className="flex items-center gap-2 shrink-0 ml-auto">{actionSlot}</div>}
    </div>
  )
}
