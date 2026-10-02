import React, { useState } from 'react'
import {
  Search,
  RotateCcw,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Calendar,
  Truck,
  Hash,
  Scale,
  FileSpreadsheet,
  FileText,
  Printer,
  CheckCircle2,
  Sparkles,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { GeneralTransportFilterParams } from '@/domain/generalTransportReportEngine'

interface ReportFilterBarProps {
  filters: GeneralTransportFilterParams
  onFiltersChange: (newFilters: GeneralTransportFilterParams) => void
  onSearch: () => void
  onClear: () => void
  onExport: (format: 'EXCEL' | 'CSV' | 'PDF') => void
  onOpenColumnConfig: () => void
  onOpenAiAnalysis?: () => void
  onOpenCharts?: () => void
  availableStatuses: string[]
  availableScaleReasons: string[]
  isLoading: boolean
  totalCount: number
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  onClear,
  onExport,
  onOpenColumnConfig,
  onOpenAiAnalysis,
  onOpenCharts,
  availableStatuses,
  availableScaleReasons,
  isLoading,
  totalCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)

  const handleInputChange = (field: keyof GeneralTransportFilterParams, value: any) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    })
  }

  const toggleStatus = (status: string) => {
    const current = filters.statuses || []
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]
    handleInputChange('statuses', updated)
  }

  const toggleScaleReason = (reason: string) => {
    const current = filters.scaleReasons || []
    const updated = current.includes(reason)
      ? current.filter((r) => r !== reason)
      : [...current, reason]
    handleInputChange('scaleReasons', updated)
  }

  const activeFiltersCount = [
    Boolean(filters.transport),
    Boolean(filters.startDate || filters.endDate),
    Boolean(filters.startInvoicingDate || filters.endInvoicingDate),
    Boolean(filters.statuses?.length),
    Boolean(filters.scaleLogFilter && filters.scaleLogFilter !== 'ALL'),
    Boolean(filters.scaleReasons?.length),
    Boolean(filters.plate),
  ].filter(Boolean).length

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-5">
      {/* Top Bar with Title, Actions & Toggle */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#005596]/10 text-[#005596]">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm">Filtros de Pesquisa & Parâmetros</h3>
              {activeFiltersCount > 0 && (
                <Badge className="bg-[#005596] text-white text-[10px] font-bold">
                  {activeFiltersCount}{' '}
                  {activeFiltersCount === 1 ? 'filtro ativo' : 'filtros ativos'}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Combine números de transporte, placas, datas e balança para consulta server-side
              direta.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenColumnConfig}
            className="text-xs h-8 gap-1.5 border-slate-300 text-slate-700 hover:text-[#005596] hover:border-[#005596]"
            title="Personalizar colunas visíveis e ordenação"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Colunas (43)</span>
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exportar</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 text-xs">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-400">
                Formatos Disponíveis ({totalCount} registros):
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onExport('EXCEL')}
                className="gap-2 cursor-pointer font-medium"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Exportar para Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onExport('CSV')}
                className="gap-2 cursor-pointer font-medium"
              >
                <FileText className="w-4 h-4 text-sky-600" />
                Exportar para CSV (.csv UTF-8)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onExport('PDF')}
                className="gap-2 cursor-pointer font-medium"
              >
                <Printer className="w-4 h-4 text-rose-600" />
                Imprimir / Salvar em PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botão Análise IA */}
          <Button
            size="sm"
            onClick={onOpenAiAnalysis}
            className="bg-[#005596] hover:bg-[#004275] text-white text-xs h-8 gap-1.5 shadow-sm font-semibold rounded-lg"
            title="Diagnóstico preditivo, anomalias e pesagem com base no dataset filtrado"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Análise IA</span>
          </Button>

          {/* Botão Análises Gráficas */}
          <Button
            size="sm"
            onClick={onOpenCharts}
            className="bg-sky-700 hover:bg-sky-800 text-white text-xs h-8 gap-1.5 shadow-sm font-semibold rounded-lg"
            title="Dashboard com 10 gráficos analíticos e gráfico customizável sobre os dados filtrados"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Análises Gráficas</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-500 hover:text-slate-800 text-xs h-8 px-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                <span className="hidden md:inline">Recolher</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                <span className="hidden md:inline">Expandir</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expandable Filters Body */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Transporte */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Hash className="w-3 h-3 text-[#005596]" />
                Nº Transporte (parcial ou múltiplos)
              </Label>
              <Input
                placeholder="Ex: 800101, 800102 ou OT-..."
                value={filters.transport || ''}
                onChange={(e) => handleInputChange('transport', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className="h-8 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 block">
                Separe por vírgula para buscar vários
              </span>
            </div>

            {/* 2 e 3. Período do Transporte */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#005596]" />
                Data Início / Fim Transporte
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="h-8 text-[11px]"
                  title="Data Início Transporte"
                />
                <Input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="h-8 text-[11px]"
                  title="Data Fim Transporte"
                />
              </div>
              <span className="text-[10px] text-slate-400 block">Intervalo operacional</span>
            </div>

            {/* 4 e 5. Período do Faturamento */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-sky-600" />
                Data Início / Fim Faturamento
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  type="date"
                  value={filters.startInvoicingDate || ''}
                  onChange={(e) => handleInputChange('startInvoicingDate', e.target.value)}
                  className="h-8 text-[11px]"
                  title="Data Início Faturamento"
                />
                <Input
                  type="date"
                  value={filters.endInvoicingDate || ''}
                  onChange={(e) => handleInputChange('endInvoicingDate', e.target.value)}
                  className="h-8 text-[11px]"
                  title="Data Fim Faturamento"
                />
              </div>
              <span className="text-[10px] text-slate-400 block">Competência fiscal</span>
            </div>

            {/* 8. Placa (ID ext.1) */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Truck className="w-3 h-3 text-[#005596]" />
                Placa do Veículo (ID ext.1)
              </Label>
              <Input
                placeholder="Ex: CIA-1A23 ou RDO9E88"
                value={filters.plate || ''}
                onChange={(e) => handleInputChange('plate', e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className="h-8 text-xs font-mono uppercase"
              />
              <span className="text-[10px] text-slate-400 block">
                Vinculado ao cadastro mestre SAP
              </span>
            </div>
          </div>

          {/* Segunda linha de filtros: Status e Balança */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
            {/* 6. Status Transporte (Seleção múltipla) */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>Status do Transporte (Stts.Trnsp SAP)</span>
                {filters.statuses && filters.statuses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleInputChange('statuses', [])}
                    className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Limpar ({filters.statuses.length})
                  </button>
                )}
              </Label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
                {availableStatuses.map((st) => {
                  const isSelected = filters.statuses?.includes(st)
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => toggleStatus(st)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition border ${
                        isSelected
                          ? 'bg-[#005596] text-white border-[#004275]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 7. Logs Balança & Motivos */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Scale className="w-3 h-3 text-[#005596]" />
                Registros & Logs da Balança
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleInputChange('scaleLogFilter', 'ALL')}
                  className={`text-xs h-8 px-2 rounded-lg font-medium border text-center transition ${
                    !filters.scaleLogFilter || filters.scaleLogFilter === 'ALL'
                      ? 'bg-[#005596] text-white border-[#004275]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('scaleLogFilter', 'WITH_LOG')}
                  className={`text-xs h-8 px-2 rounded-lg font-medium border text-center transition ${
                    filters.scaleLogFilter === 'WITH_LOG'
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Com Balança
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('scaleLogFilter', 'WITHOUT_LOG')}
                  className={`text-xs h-8 px-2 rounded-lg font-medium border text-center transition ${
                    filters.scaleLogFilter === 'WITHOUT_LOG'
                      ? 'bg-amber-600 text-white border-amber-700'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Sem Balança
                </button>
              </div>

              {availableScaleReasons.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {availableScaleReasons.slice(0, 3).map((r) => {
                    const isSelected = filters.scaleReasons?.includes(r)
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleScaleReason(r)}
                        className={`text-[9px] px-1.5 py-0.5 rounded border truncate max-w-[180px] transition ${
                          isSelected
                            ? 'bg-sky-700 text-white border-sky-800'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                        title={r}
                      >
                        {r}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-xs text-slate-500 hover:text-slate-800 gap-1.5 h-8"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar Filtros
            </Button>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={onSearch}
                disabled={isLoading}
                className="bg-[#005596] hover:bg-[#004275] text-white text-xs h-8 px-5 gap-1.5 font-bold shadow-sm"
              >
                <Search className="w-3.5 h-3.5" />
                {isLoading ? 'Pesquisando...' : 'Pesquisar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
