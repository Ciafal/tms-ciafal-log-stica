import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface KpiCardProps {
  title: string
  value: string | number
  unit?: string
  description?: string
  status?: string
  statusColor?: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'slate' | 'sky'
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive'
  badgeColor?: string
  icon?: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'highlight' | 'warning' | 'success' | 'purple' | 'sky'
  className?: string
  onClick?: () => void
  tooltip?: string
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit,
  description,
  status,
  statusColor = 'slate',
  badge,
  badgeVariant = 'outline',
  badgeColor,
  icon: Icon,
  variant = 'default',
  className,
  onClick,
  tooltip,
}) => {
  const variantStyles = {
    default: 'bg-white border-slate-200 hover:border-slate-300',
    highlight: 'bg-white border-[#005596]/30 hover:border-[#005596]',
    sky: 'bg-white border-sky-200 hover:border-sky-300',
    success: 'bg-white border-emerald-200 hover:border-emerald-300',
    warning: 'bg-white border-amber-200 hover:border-amber-300',
    purple: 'bg-white border-purple-200 hover:border-purple-300',
  }

  const valueColorStyles = {
    default: 'text-slate-900',
    highlight: 'text-[#005596]',
    sky: 'text-sky-700',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    purple: 'text-purple-700',
  }

  const statusColors = {
    emerald: 'text-emerald-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
    purple: 'text-purple-700',
    slate: 'text-slate-500',
    sky: 'text-sky-700',
  }

  const cardContent = (
    <Card
      onClick={onClick}
      className={cn(
        'transition-all duration-200 shadow-xs flex flex-col justify-between min-h-[105px] h-full',
        variantStyles[variant],
        onClick && 'cursor-pointer hover:shadow-sm',
        className,
      )}
    >
      <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
        {/* Header do Card: Título + Badge / Ícone */}
        <div className="flex items-start justify-between gap-1.5 min-w-0">
          <span
            className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight block break-words line-clamp-2"
            title={title}
          >
            {title}
          </span>
          {badge && (
            <Badge
              variant={badgeVariant}
              className={cn('text-[9px] px-1.5 py-0 font-bold shrink-0', badgeColor)}
            >
              {badge}
            </Badge>
          )}
          {Icon && !badge && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
        </div>

        {/* Valor Principal + Unidade */}
        <div className="flex items-baseline gap-1.5 flex-wrap min-w-0 my-0.5">
          <strong
            className={cn(
              'text-2xl sm:text-2xl font-mono font-black tracking-tight leading-none truncate max-w-full',
              valueColorStyles[variant],
            )}
            title={String(value)}
          >
            {value}
          </strong>
          {unit && (
            <span className="text-xs font-semibold text-slate-500 font-sans tracking-normal shrink-0">
              {unit}
            </span>
          )}
        </div>

        {/* Descrição / Status Complementar */}
        {(description || status) && (
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium leading-tight min-w-0 pt-0.5 border-t border-slate-100">
            {description && (
              <span className="truncate" title={description}>
                {description}
              </span>
            )}
            {status && (
              <span className={cn('font-bold shrink-0 ml-auto pl-1', statusColors[statusColor])}>
                {status}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
          <TooltipContent className="text-xs max-w-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return cardContent
}
