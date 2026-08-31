import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CheckCircle2, Clock, AlertTriangle, XCircle, Info } from 'lucide-react'

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'pending' | 'active'

interface StatusBadgeProps {
  status?: StatusType | string
  label?: string
  showIcon?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'neutral',
  label,
  showIcon = true,
  className,
  size = 'sm',
}) => {
  const norm = String(status).toLowerCase().trim()

  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200'
  let Icon = Info
  let text = label || status

  if (
    norm.includes('online') ||
    norm.includes('conectado') ||
    norm.includes('sincronizado') ||
    norm.includes('sucesso') ||
    norm.includes('success') ||
    norm.includes('aprovado') ||
    norm.includes('homologad') ||
    norm.includes('produção') ||
    norm.includes('pronto') ||
    norm.includes('ativo') ||
    norm.includes('equilibrado')
  ) {
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
    Icon = CheckCircle2
  } else if (
    norm.includes('preparado') ||
    norm.includes('mensageria') ||
    norm.includes('planejad') ||
    norm.includes('em viagem') ||
    norm.includes('em transito') ||
    norm.includes('info')
  ) {
    badgeColor = 'bg-sky-50 text-[#005596] border-sky-300 font-bold'
    Icon = Info
  } else if (
    norm.includes('atenção') ||
    norm.includes('degradado') ||
    norm.includes('pendente') ||
    norm.includes('em desenvolv') ||
    norm.includes('warning') ||
    norm.includes('aguardando') ||
    norm.includes('em homologação') ||
    norm.includes('parcial')
  ) {
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
    Icon = AlertTriangle
  } else if (
    norm.includes('erro') ||
    norm.includes('falha') ||
    norm.includes('offline') ||
    norm.includes('bloqueado') ||
    norm.includes('cancelado') ||
    norm.includes('rejeitado') ||
    norm.includes('atrasado')
  ) {
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-300 font-bold'
    Icon = XCircle
  }

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center rounded-md font-semibold tracking-wide shadow-none border shrink-0',
        sizeClasses[size],
        badgeColor,
        className,
      )}
    >
      {showIcon && <Icon className={cn('shrink-0', iconSizes[size])} />}
      <span className="truncate">{text}</span>
    </Badge>
  )
}
