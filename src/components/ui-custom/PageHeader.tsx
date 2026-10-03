import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { cn } from '@/lib/utils'

export interface BreadcrumbCrumb {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: string
  subtitle?: string
  badge?: React.ReactNode
  icon?: LucideIcon
  breadcrumbs?: BreadcrumbCrumb[]
  actions?: React.ReactNode
  meta?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  icon: Icon,
  breadcrumbs,
  actions,
  meta,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-2.5 pb-4 border-b border-slate-200/80 mb-5', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb className="text-xs text-slate-500">
          <BreadcrumbList>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <React.Fragment key={idx}>
                  <BreadcrumbItem>
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage className="font-semibold text-slate-700 truncate max-w-[200px]">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        href={crumb.href}
                        className="hover:text-[#005596] transition-colors"
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {Icon && (
            <div className="p-2 sm:p-2.5 rounded-lg bg-[#005596]/10 text-[#005596] shrink-0 mt-0.5 sm:mt-0 shadow-xs">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-slate-900 truncate">
                {title}
              </h1>
              {typeof badge === 'string' ? (
                <Badge
                  variant="outline"
                  className="border-sky-300 bg-sky-50 text-sky-800 text-xs font-semibold shrink-0"
                >
                  {badge}
                </Badge>
              ) : (
                badge
              )}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 line-clamp-2 sm:line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {(actions || meta) && (
          <div className="flex items-center flex-wrap gap-2 shrink-0 justify-start lg:justify-end">
            {meta}
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
