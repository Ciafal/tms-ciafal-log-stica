import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ReportPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  isLoading: boolean
}

export const ReportPagination: React.FC<ReportPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
  isLoading,
}) => {
  const fromRecord = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1
  const toRecord = Math.min(currentPage * perPage, totalItems)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-2 text-xs text-slate-600">
      {/* Controles de granularidade (25 / 50 / 100 / 250) */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 font-medium">Registros por página:</span>
        <Select
          value={String(perPage)}
          onValueChange={(val) => onPerPageChange(Number(val))}
          disabled={isLoading}
        >
          <SelectTrigger className="w-20 h-8 text-xs font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="250">250</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-slate-400 pl-2">
          Exibindo <strong className="text-slate-700">{fromRecord}</strong>–
          <strong className="text-slate-700">{toRecord}</strong> de{' '}
          <strong className="text-[#005596]">{totalItems}</strong> transportes
        </span>
      </div>

      {/* Navegação entre páginas */}
      <div className="flex items-center gap-1.5">
        <span className="text-slate-500 pr-2">
          Página <strong className="text-slate-800">{currentPage}</strong> de{' '}
          <strong className="text-slate-800">{Math.max(1, totalPages)}</strong>
        </span>

        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => onPageChange(1)}
          title="Primeira página"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => onPageChange(currentPage - 1)}
          title="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={currentPage >= totalPages || isLoading}
          onClick={() => onPageChange(currentPage + 1)}
          title="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={currentPage >= totalPages || isLoading}
          onClick={() => onPageChange(totalPages)}
          title="Última página"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
