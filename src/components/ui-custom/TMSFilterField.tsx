import React from 'react'
import { cn } from '@/lib/utils'

export interface TMSFilterFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode
  id?: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}

/**
 * Campo de filtro padronizado do TMS CIAFAL.
 * Layout flex-col com label na parte superior, suporte à quebra de linha natural
 * e min-width: 0 para evitar estouro de container.
 */
export const TMSFilterField: React.FC<TMSFilterFieldProps> = ({
  label,
  id,
  required = false,
  hint,
  error,
  children,
  className,
  ...props
}) => {
  return (
    <div className={cn('flex flex-col min-w-0 w-full space-y-1', className)} {...props}>
      {label && (
        <label
          htmlFor={id}
          className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none flex items-center justify-between gap-1 leading-tight"
        >
          <span className="truncate" title={typeof label === 'string' ? label : undefined}>
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </span>
          {hint && <span className="text-[9px] font-normal text-slate-400 font-sans">{hint}</span>}
        </label>
      )}
      <div className="w-full min-w-0 relative">{children}</div>
      {error && (
        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium leading-none">
          {error}
        </p>
      )}
    </div>
  )
}
