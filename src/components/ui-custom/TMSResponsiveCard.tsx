import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface TMSResponsiveCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  badge?: React.ReactNode
  actions?: React.ReactNode
  headerClassName?: string
  contentClassName?: string
  children: React.ReactNode
  noPadding?: boolean
}

/**
 * Card Responsivo do TMS CIAFAL.
 * Garante min-width: 0, box-sizing, bordas suaves e flex-wrap seguro em títulos e ações.
 */
export const TMSResponsiveCard: React.FC<TMSResponsiveCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  headerClassName,
  contentClassName,
  children,
  className,
  noPadding = false,
  ...props
}) => {
  const hasHeader = Boolean(title || subtitle || Icon || badge || actions)

  return (
    <Card
      className={cn(
        'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm w-full min-w-0 overflow-hidden',
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <CardHeader
          className={cn(
            'p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40',
            headerClassName,
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {Icon && (
                <div className="p-1.5 rounded-md bg-[#005596]/10 text-[#005596] shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {title && (
                  <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 truncate">
                    {title}
                  </CardTitle>
                )}
                {subtitle && (
                  <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {subtitle}
                  </CardDescription>
                )}
              </div>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(noPadding ? 'p-0' : 'p-3.5 sm:p-4', 'min-w-0', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
