import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface SectionHeaderProps {
  title: string
  subtitle?: string
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive'
  icon?: React.ComponentType<{ className?: string }>
  iconColor?: string
  action?: React.ReactNode
  className?: string
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  badge,
  badgeVariant = 'outline',
  icon: Icon,
  iconColor = 'text-[#005596]',
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1',
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className={cn('w-4 h-4 shrink-0', iconColor)} />}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 truncate">
            {title}
          </h2>
          {badge && (
            <Badge variant={badgeVariant} className="text-xs text-slate-600 font-semibold shrink-0">
              {badge}
            </Badge>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
      {subtitle && !action && (
        <span className="text-xs text-slate-500 font-normal hidden md:inline truncate">
          {subtitle}
        </span>
      )}
    </div>
  )
}
