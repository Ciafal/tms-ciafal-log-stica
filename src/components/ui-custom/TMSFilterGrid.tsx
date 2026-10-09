import React from 'react'
import { cn } from '@/lib/utils'

export interface TMSFilterGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  minItemWidth?: number
  gapClassName?: string
}

/**
 * Grid responsivo padronizado para barras de filtros do TMS CIAFAL.
 * Em telas grandes (desktop) distribui colunas fluidas proporcionais (auto-fit).
 * Em telas médias quebra em 2 a 3 linhas; celular em 1 coluna.
 * Evita overflow horizontal na página e mantém alinhamento vertical na base (align-items: end).
 */
export const TMSFilterGrid: React.FC<TMSFilterGridProps> = ({
  children,
  className,
  minItemWidth = 160,
  gapClassName = 'gap-2.5',
  style,
  ...props
}) => {
  return (
    <div
      className={cn('w-full min-w-0 grid items-end text-xs', gapClassName, className)}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minItemWidth}px), 1fr))`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
