import React from 'react'
import { cn } from '@/lib/utils'

export interface TMSActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  leftActions?: React.ReactNode
  rightActions?: React.ReactNode
  children?: React.ReactNode
}

/**
 * Barra de Ações Operacionais Padronizada do TMS CIAFAL.
 * Flex-wrap dinâmico, espaçamento de 8-12px, sem sobreposição nem overflow.
 */
export const TMSActionBar: React.FC<TMSActionBarProps> = ({
  leftActions,
  rightActions,
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'w-full min-w-0 flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800',
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-2 min-w-0">{leftActions}</div>
      {children && <div className="flex flex-wrap items-center gap-2 min-w-0">{children}</div>}
      <div className="flex flex-wrap items-center gap-2 min-w-0 ml-auto">{rightActions}</div>
    </div>
  )
}
