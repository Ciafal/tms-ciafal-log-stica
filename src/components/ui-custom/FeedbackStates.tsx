import React from 'react'
import { AlertCircle, Inbox, RotateCw, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface StateDisplayProps {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ComponentType<{ className?: string }>
  className?: string
  children?: React.ReactNode
}

export const EmptyState: React.FC<StateDisplayProps> = ({
  title = 'Nenhum registro encontrado',
  description = 'Não há itens correspondentes aos critérios de busca ou filtros aplicados.',
  actionLabel,
  onAction,
  icon: Icon = Inbox,
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-xl bg-slate-50/60 border border-dashed border-slate-200',
        className,
      )}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="text-xs font-semibold">
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  )
}

export const ErrorState: React.FC<StateDisplayProps> = ({
  title = 'Erro ao carregar dados',
  description = 'Ocorreu uma falha na comunicação ou no processamento dos dados. Tente novamente.',
  actionLabel = 'Tentar novamente',
  onAction,
  icon: Icon = AlertCircle,
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-xl bg-red-50/40 border border-dashed border-red-200',
        className,
      )}
    >
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-3 shadow-xs">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-red-900 mb-1">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-red-700/80 max-w-md mb-4">{description}</p>
      )}
      {onAction && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          className="text-xs font-semibold bg-white border-red-200 text-red-800 hover:bg-red-50"
        >
          <RotateCw className="w-3.5 h-3.5 mr-1.5" />
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  )
}

export interface LoadingStateProps {
  message?: string
  rows?: number
  className?: string
  variant?: 'spinner' | 'skeleton'
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Carregando informações...',
  rows = 4,
  className,
  variant = 'skeleton',
}) => {
  if (variant === 'spinner') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-12 text-center text-slate-500 gap-3',
          className,
        )}
      >
        <Loader2 className="w-7 h-7 animate-spin text-[#005596]" />
        <span className="text-xs sm:text-sm font-medium">{message}</span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3 p-4 bg-white rounded-xl border border-slate-200', className)}>
      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-[#005596]" />
        <span>{message}</span>
      </div>
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex items-center gap-4">
          <Skeleton className="h-10 w-1/4 rounded-md" />
          <Skeleton className="h-10 w-2/4 rounded-md" />
          <Skeleton className="h-10 w-1/4 rounded-md" />
        </div>
      ))}
    </div>
  )
}

export const SuccessState: React.FC<StateDisplayProps> = ({
  title = 'Operação concluída com sucesso',
  description,
  actionLabel,
  onAction,
  icon: Icon = CheckCircle2,
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-xl bg-emerald-50/50 border border-emerald-200',
        className,
      )}
    >
      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-emerald-900 mb-1">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-emerald-700 max-w-md mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="text-xs font-semibold">
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  )
}
