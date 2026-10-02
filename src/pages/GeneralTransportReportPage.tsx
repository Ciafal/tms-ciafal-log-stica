import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FileSpreadsheet,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Truck,
  Layers,
  Scale,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  GENERAL_TRANSPORT_COLUMNS,
  ColumnDefinition,
  GeneralTransportRecord,
  GeneralTransportFilterParams,
} from '@/domain/generalTransportReportEngine'
import { generalTransportReportService } from '@/services/generalTransportReportService'
import { ReportFilterBar } from '@/components/general-transport-report/ReportFilterBar'
import { ReportDataTable } from '@/components/general-transport-report/ReportDataTable'
import { ReportPagination } from '@/components/general-transport-report/ReportPagination'
import { ColumnConfigDialog } from '@/components/general-transport-report/ColumnConfigDialog'
import { ReportDetailModal } from '@/components/general-transport-report/ReportDetailModal'

const STORAGE_VISIBLE_COLS_KEY = 'ciafal_tms_gtr_visible_cols_v1'
const STORAGE_ORDER_COLS_KEY = 'ciafal_tms_gtr_order_cols_v1'

export const GeneralTransportReportPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  // Estado dos filtros
  const [filters, setFilters] = useState<GeneralTransportFilterParams>({
    transport: '',
    startDate: '',
    endDate: '',
    startInvoicingDate: '',
    endInvoicingDate: '',
    statuses: [],
    scaleLogFilter: 'ALL',
    scaleReasons: [],
    plate: '',
    page: 1,
    perPage: 25,
    sortField: 'transport_date',
    sortOrder: 'desc',
  })

  // Estado dos dados
  const [records, setRecords] = useState<GeneralTransportRecord[]>([])
  const [totalItems, setTotalItems] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])
  const [availableScaleReasons, setAvailableScaleReasons] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Configuração de colunas e modais
  const [columnsOrder, setColumnsOrder] = useState<ColumnDefinition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ORDER_COLS_KEY)
      if (saved) {
        const parsedKeys: string[] = JSON.parse(saved)
        const reordered = parsedKeys
          .map((k) => GENERAL_TRANSPORT_COLUMNS.find((c) => c.key === k))
          .filter(Boolean) as ColumnDefinition[]
        // Adiciona colunas novas que porventura não estavam salvas
        const missing = GENERAL_TRANSPORT_COLUMNS.filter(
          (c) => !parsedKeys.includes(c.key as string),
        )
        return [...reordered, ...missing]
      }
    } catch {
      /* intentionally ignored */
    }
    return GENERAL_TRANSPORT_COLUMNS
  })

  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_VISIBLE_COLS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      /* intentionally ignored */
    }
    return GENERAL_TRANSPORT_COLUMNS.map((c) => c.key as string)
  })

  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false)
  const [selectedRecordForDetail, setSelectedRecordForDetail] =
    useState<GeneralTransportRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Colunas ativas ordenadas
  const activeColumns = useMemo(() => {
    return columnsOrder.filter((col) => visibleColumnKeys.includes(col.key as string))
  }, [columnsOrder, visibleColumnKeys])

  // Busca de dados
  const loadReportData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const result = await generalTransportReportService.getGeneralTransportReport(
        filters,
        user
          ? {
              email: user.email || 'operador@ciafal.com.br',
              name: user.name || 'Operador Logístico',
              role: user.role,
            }
          : undefined,
      )

      setRecords(result.items)
      setTotalItems(result.totalItems)
      setTotalPages(result.totalPages)
      if (result.availableStatuses.length > 0) {
        setAvailableStatuses(result.availableStatuses)
      }
      if (result.availableScaleReasons.length > 0) {
        setAvailableScaleReasons(result.availableScaleReasons)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao consultar base operacional do relatório geral.')
    } finally {
      setIsLoading(false)
    }
  }, [filters, user])

  useEffect(() => {
    loadReportData()
  }, [loadReportData])

  // Ações de ordenação
  const handleSort = (field: string) => {
    setFilters((prev) => {
      const isSame = prev.sortField === field
      const newOrder = isSame && prev.sortOrder === 'asc' ? 'desc' : 'asc'
      return {
        ...prev,
        sortField: field,
        sortOrder: newOrder,
        page: 1,
      }
    })
  }

  // Ações de paginação
  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
  }

  const handlePerPageChange = (newPerPage: number) => {
    setFilters((prev) => ({ ...prev, perPage: newPerPage, page: 1 }))
  }

  // Ações de filtros
  const handleClearFilters = () => {
    setFilters({
      transport: '',
      startDate: '',
      endDate: '',
      startInvoicingDate: '',
      endInvoicingDate: '',
      statuses: [],
      scaleLogFilter: 'ALL',
      scaleReasons: [],
      plate: '',
      page: 1,
      perPage: filters.perPage || 25,
      sortField: 'transport_date',
      sortOrder: 'desc',
    })
  }

  // Detalhamento do transporte
  const handleSelectTransport = (transportNumber: string, rec: GeneralTransportRecord) => {
    setSelectedRecordForDetail(rec)
    setIsDetailOpen(true)
  }

  // Exportação completa
  const handleExport = async (format: 'EXCEL' | 'CSV' | 'PDF') => {
    try {
      toast({
        title: 'Gerando arquivo de exportação...',
        description: `Processando registros respeitando os filtros aplicados no formato ${format}.`,
      })

      const res = await generalTransportReportService.exportFullReport(
        format,
        filters,
        {
          email: user?.email || 'operador@ciafal.com.br',
          name: user?.name || 'Operador TMS',
          role: user?.role,
        },
        visibleColumnKeys,
      )

      toast({
        title: 'Exportação concluída com sucesso!',
        description: `${res.totalExported} registros foram exportados para ${format}.`,
      })
    } catch (err: any) {
      toast({
        title: 'Falha na exportação',
        description: 'Não foi possível gerar o arquivo. Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  // Salvar configuração de colunas
  const handleSaveColumns = (keys: string[], orderedCols: ColumnDefinition[]) => {
    setVisibleColumnKeys(keys)
    setColumnsOrder(orderedCols)
    localStorage.setItem(STORAGE_VISIBLE_COLS_KEY, JSON.stringify(keys))
    localStorage.setItem(STORAGE_ORDER_COLS_KEY, JSON.stringify(orderedCols.map((c) => c.key)))
    toast({
      title: 'Colunas atualizadas',
      description: `${keys.length} colunas ativas na exibição da grade.`,
    })
  }

  // Restaurar padrão SAP
  const handleResetColumns = () => {
    const defaultKeys = GENERAL_TRANSPORT_COLUMNS.map((c) => c.key as string)
    setVisibleColumnKeys(defaultKeys)
    setColumnsOrder(GENERAL_TRANSPORT_COLUMNS)
    localStorage.removeItem(STORAGE_VISIBLE_COLS_KEY)
    localStorage.removeItem(STORAGE_ORDER_COLS_KEY)
    setIsColumnConfigOpen(false)
    toast({
      title: 'Estrutura restaurada',
      description: 'As 43 colunas canônicas do SAP ZSD40 foram restauradas.',
    })
  }

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-[1920px] mx-auto min-h-screen bg-slate-50/60">
      {/* Cabeçalho da Página com Identidade Visual CIAFAL */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#005596] bg-[#005596]/10 px-2 py-0.5 rounded">
              TMS • Análises & Inteligência
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-mono text-slate-500">SAP ZSD004 / ZSD40</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            <FileSpreadsheet className="w-6 h-6 text-[#005596]" />
            Relatório Geral Transporte
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visão gerencial consolidada com os 43 campos canônicos da operação: faturamento, pesagem
            na balança, itinerários e dados de frota.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadReportData}
            disabled={isLoading}
            className="text-xs h-9 gap-1.5 border-slate-300 text-slate-700 bg-white shadow-sm hover:border-[#005596]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#005596]' : ''}`}
            />
            <span>Atualizar Base</span>
          </Button>
        </div>
      </div>

      {/* Alerta de erro com possibilidade de nova tentativa */}
      {errorMessage && (
        <Alert variant="destructive" className="bg-rose-50 border-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <AlertTitle className="text-xs font-bold text-rose-800">
            Erro na Consulta Operacional
          </AlertTitle>
          <AlertDescription className="text-xs text-rose-700 flex items-center justify-between">
            <span>{errorMessage}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadReportData}
              className="text-xs h-7 ml-4 bg-white border-rose-300 text-rose-800 hover:bg-rose-100"
            >
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Barra de Filtros Integrada */}
      <ReportFilterBar
        filters={filters}
        onFiltersChange={(newFilters) => setFilters(newFilters)}
        onSearch={loadReportData}
        onClear={handleClearFilters}
        onExport={handleExport}
        onOpenColumnConfig={() => setIsColumnConfigOpen(true)}
        availableStatuses={availableStatuses}
        availableScaleReasons={availableScaleReasons}
        isLoading={isLoading}
        totalCount={totalItems}
      />

      {/* Grade de 43 Colunas do Relatório */}
      <div className="space-y-2">
        <ReportDataTable
          records={records}
          columns={activeColumns}
          sortField={filters.sortField}
          sortOrder={filters.sortOrder}
          onSort={handleSort}
          onSelectTransport={handleSelectTransport}
          isLoading={isLoading}
        />

        {/* Paginação Server-side */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-1">
          <ReportPagination
            currentPage={filters.page || 1}
            totalPages={totalPages}
            totalItems={totalItems}
            perPage={filters.perPage || 25}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Modal de Personalização e Reorganização de Colunas */}
      <ColumnConfigDialog
        open={isColumnConfigOpen}
        onOpenChange={setIsColumnConfigOpen}
        columns={columnsOrder}
        visibleKeys={visibleColumnKeys}
        onSave={handleSaveColumns}
        onReset={handleResetColumns}
      />

      {/* Modal de Detalhamento Existente do Transporte */}
      <ReportDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        record={selectedRecordForDetail}
      />
    </div>
  )
}

export default GeneralTransportReportPage
