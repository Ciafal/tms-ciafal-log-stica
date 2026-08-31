import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from './StatusBadge'
import { cn } from '@/lib/utils'

export interface IntegrationCardProps {
  systemName: string
  integrationType: string
  typeBadgeColor?: string
  description: string
  status: string
  statusLabel?: string
  statusDetails?: string
  icon?: React.ComponentType<{ className?: string }>
  className?: string
  disabled?: boolean
  onClick?: () => void
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  systemName,
  integrationType,
  typeBadgeColor = 'bg-[#005596] text-white',
  description,
  status,
  statusLabel,
  statusDetails,
  icon: Icon,
  className,
  disabled = false,
  onClick,
}) => {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'bg-white border-slate-200 shadow-xs flex flex-col justify-between h-full transition-all duration-200 hover:border-slate-300',
        disabled && 'opacity-75 bg-slate-50/50',
        onClick && 'cursor-pointer hover:shadow-sm',
        className,
      )}
    >
      <CardContent className="p-3.5 space-y-2.5 flex flex-col justify-between h-full">
        {/* Header: Nome do Sistema e Badge de Tipo */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {Icon && <Icon className="w-4 h-4 text-slate-500 shrink-0" />}
            <span className="font-bold text-xs text-slate-900 truncate" title={systemName}>
              {systemName}
            </span>
          </div>
          <Badge
            className={cn('text-[9px] px-1.5 py-0 font-bold shrink-0 border-0', typeBadgeColor)}
          >
            {integrationType}
          </Badge>
        </div>

        {/* Descrição */}
        <p
          className="text-[11px] text-slate-600 leading-snug line-clamp-2 min-h-[28px]"
          title={description}
        >
          {description}
        </p>

        {/* Status com Texto e Cor Padronizados */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <StatusBadge status={status} label={statusLabel || status} size="sm" />
          {statusDetails && (
            <span
              className="text-[10px] text-slate-400 truncate text-right font-medium"
              title={statusDetails}
            >
              {statusDetails}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
