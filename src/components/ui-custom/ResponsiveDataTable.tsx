import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState, LoadingState, ErrorState } from './FeedbackStates'
import { cn } from '@/lib/utils'

export interface ColumnDef<T> {
  key: string
  header: React.ReactNode
  render?: (row: T, index: number) => React.ReactNode
  className?: string
  headerClassName?: string
  align?: 'left' | 'center' | 'right'
}

export interface ResponsiveDataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  keyExtractor: (row: T, index: number) => string
  isLoading?: boolean
  loadingMessage?: string
  isError?: boolean
  errorMessage?: string
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
  className?: string
  compact?: boolean
  stickyHeader?: boolean
}

export function ResponsiveDataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  loadingMessage = 'Carregando registros...',
  isError = false,
  errorMessage,
  onRetry,
  emptyTitle = 'Nenhum dado encontrado',
  emptyDescription = 'Não existem registros para os filtros selecionados.',
  onRowClick,
  className,
  compact = false,
  stickyHeader = false,
}: ResponsiveDataTableProps<T>) {
  if (isLoading) {
    return <LoadingState message={loadingMessage} rows={5} className={className} />
  }

  if (isError) {
    return (
      <ErrorState
        title="Erro ao carregar tabela"
        description={errorMessage}
        onAction={onRetry}
        className={className}
      />
    )
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className={className} />
  }

  return (
    <div
      className={cn(
        'w-full max-w-full min-w-0 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all',
        className,
      )}
    >
      <div className="overflow-x-auto max-w-full w-full min-w-0">
        <Table className="w-max min-w-full">
          <TableHeader
            className={cn('bg-slate-50/80', stickyHeader && 'sticky top-0 z-10 backdrop-blur-xs')}
          >
            <TableRow className="border-b border-slate-200 hover:bg-transparent">
              {columns.map((col) => {
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                return (
                  <TableHead
                    key={col.key}
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider text-slate-700 whitespace-nowrap',
                      compact ? 'py-2 px-2.5' : 'py-3 px-3 sm:px-4',
                      alignClass,
                      col.headerClassName,
                    )}
                  >
                    {col.header}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => {
              const rowKey = keyExtractor(row, idx)
              return (
                <TableRow
                  key={rowKey}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-slate-100 hover:bg-sky-50/40 transition-colors',
                    onRowClick && 'cursor-pointer',
                    idx % 2 === 1 && 'bg-slate-50/30',
                  )}
                >
                  {columns.map((col) => {
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    return (
                      <TableCell
                        key={col.key}
                        className={cn(
                          'text-xs sm:text-sm text-slate-700',
                          compact ? 'py-2 px-2.5' : 'py-2.5 sm:py-3 px-3 sm:px-4',
                          alignClass,
                          col.className,
                        )}
                      >
                        {col.render ? col.render(row, idx) : (row as any)[col.key]}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
