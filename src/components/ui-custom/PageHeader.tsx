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
  /** Título principal da página — NUNCA truncado com reticências */
  title: string
  /** Subtítulo / descrição contextual */
  subtitle?: string
  /** Badge opcional exibido junto ao título */
  badge?: React.ReactNode
  /** Ícone representativo do módulo / página */
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
  /** Breadcrumb navegável */
  breadcrumbs?: BreadcrumbCrumb[]
  /** Ações principais da página (botões de atualizar, exportar, criar, etc.) */
  actions?: React.ReactNode
  /** Metadados contextuais (status de sincronização, última atualização, etc.) */
  meta?: React.ReactNode
  /** Status explícito (ex.: tag de ambiente, RFC Online, etc.) */
  status?: React.ReactNode
  /** Classes CSS extras para o container */
  className?: string
}

/**
 * PageHeader / TmsPageHeader
 *
 * Padrão Canônico do HUB CIAFAL para Cabeçalhos do TMS:
 * 1. Breadcrumb no topo: caminho claro (ex.: TMS CIAFAL > Planejamento Logístico > ...)
 * 2. Título completo 100% visível — SEM truncate, SEM text-overflow:ellipsis, sem corte por largura fixa.
 *    Em desktop, prioridade de espaço para exibição limpa em uma linha (~24–28px, font-bold).
 *    Em tablet/mobile, quebra natural de linha sem sobrepor botões ou breadcrumbs.
 * 3. Bloco de Ações e Metadados com layout inteligente:
 *    - Desktop (xl/2xl): título e badges à esquerda com prioridade; botões/ações à direita.
 *    - Telas médias/zoom (1366px / zoom 125%): quebra suave das ações para linha seguinte se o espaço for estreito,
 *      NUNCA forçando truncamento ou reticências no título.
 * 4. Identidade institucional HUB CIAFAL (Pantone 2945 #005596, cinzas claros, tipografia limpa).
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  icon: Icon,
  breadcrumbs,
  actions,
  meta,
  status,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full min-w-0 flex flex-col gap-3 pb-4 border-b border-slate-200/90 mb-5',
        className,
      )}
    >
      {/* 1. Breadcrumb: caminho rastreável */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb className="text-xs text-slate-500 min-w-0">
          <BreadcrumbList className="flex-wrap gap-1 sm:gap-1.5">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <React.Fragment key={idx}>
                  <BreadcrumbItem className="min-w-0">
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage className="font-semibold text-slate-700 whitespace-normal">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        href={crumb.href}
                        className="hover:text-[#005596] transition-colors whitespace-normal"
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator className="text-slate-400" />}
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* 2. Bloco Principal: [Identificação da Tela] + [Ações & Contexto] */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3.5 min-w-0 w-full">
        {/* Bloco de Identificação: Ícone + Título + Badges + Subtítulo */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {Icon && (
            <div className="p-2.5 rounded-xl bg-[#005596]/10 text-[#005596] shrink-0 mt-0.5 shadow-2xs border border-[#005596]/15">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-[26px] font-bold tracking-tight text-slate-900 leading-tight break-words">
                {title}
              </h1>

              {status && <div className="shrink-0">{status}</div>}

              {badge && (
                <div className="shrink-0 flex items-center gap-1.5 flex-wrap">
                  {typeof badge === 'string' ? (
                    <Badge
                      variant="outline"
                      className="border-sky-300 bg-sky-50 text-[#005596] text-xs font-semibold"
                    >
                      {badge}
                    </Badge>
                  ) : (
                    badge
                  )}
                </div>
              )}
            </div>

            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-4xl break-words">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Bloco de Metadados e Ações da Página: botões têm espaço próprio e descem se necessário */}
        {(actions || meta) && (
          <div className="flex items-center flex-wrap gap-2 shrink-0 justify-start xl:justify-end xl:max-w-[55%] w-full xl:w-auto pt-1 xl:pt-0 border-t xl:border-t-0 border-slate-100">
            {meta}
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * TmsPageHeader — Alias canônico para PageHeader conforme especificação do TMS HUB CIAFAL
 */
export const TmsPageHeader = PageHeader
export default PageHeader
