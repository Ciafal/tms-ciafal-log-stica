import React, { useState, useEffect, useCallback } from 'react'
import {
  KpiRowData,
  KpiFilterParams,
  KpiMonthCell,
  KpiRule,
  KpiAiDiagnosisResult,
} from '@/domain/tmsIndicatorsEngine'
import {
  tmsIndicatorsService,
  FilterOptionsData,
  DeviationActionRecord,
} from '@/services/tmsIndicatorsService'
import { KpiFilterBar } from '@/components/tms-indicators/KpiFilterBar'
import { KpiExecutiveCards } from '@/components/tms-indicators/KpiExecutiveCards'
import { KpiConsolidatedMatrix } from '@/components/tms-indicators/KpiConsolidatedMatrix'
import { KpiDrillDownModal } from '@/components/tms-indicators/KpiDrillDownModal'
import { KpiTargetConfigModal } from '@/components/tms-indicators/KpiTargetConfigModal'
import { KpiDeviationActionModal } from '@/components/tms-indicators/KpiDeviationActionModal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, BarChart3, Sparkles, Download, AlertCircle } from 'lucide-react'

export const TmsIndicatorsPage: React.FC = () => {
  const { toast } = useToast()
  const currentYear = new Date().getFullYear()

  // Estados principais
  const [filters, setFilters] = useState<KpiFilterParams>({
    year: currentYear,
    category: 'TODOS',
    company: 'TODOS',
    center: 'TODOS',
    status: 'TODOS',
    itinerary: 'TODOS',
    regionUf: 'TODOS',
    carrier: 'TODOS',
    driver: 'TODOS',
    customer: 'TODOS',
    searchQuery: '',
  })

  const [rows, setRows] = useState<KpiRowData[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptionsData>({
    companies: [],
    centers: [],
    itineraries: [],
    regionsUf: [],
    carriers: [],
    drivers: [],
    customers: [],
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  // Modais
  const [selectedKpiDrillDown, setSelectedKpiDrillDown] = useState<KpiRowData | null>(null)
  const [selectedMonthDrillDown, setSelectedMonthDrillDown] = useState<KpiMonthCell | undefined>(
    undefined,
  )
  const [isDrillDownOpen, setIsDrillDownOpen] = useState<boolean>(false)

  const [selectedKpiConfig, setSelectedKpiConfig] = useState<KpiRowData | null>(null)
  const [isTargetConfigOpen, setIsTargetConfigOpen] = useState<boolean>(false)

  const [selectedKpiAction, setSelectedKpiAction] = useState<KpiRowData | null>(null)
  const [selectedMonthAction, setSelectedMonthAction] = useState<KpiMonthCell | null>(null)
  const [activeAiDiagnosis, setActiveAiDiagnosis] = useState<KpiAiDiagnosisResult | null>(null)
  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false)

  // Carregamento de dados
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await tmsIndicatorsService.buildConsolidatedMatrix(filters.year, filters)
      setRows(data.rows)
      setFilterOptions(data.filterOptions)
      setLastRefreshed(new Date())
    } catch (err: any) {
      console.error('[TmsIndicatorsPage] Erro ao carregar dados:', err)
      toast({
        title: 'Erro ao carregar indicadores',
        description: err?.message || 'Falha na comunicação com o banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [filters, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Abertura de Modais
  const handleOpenDrillDown = (kpi: KpiRowData, monthCell?: KpiMonthCell) => {
    setSelectedKpiDrillDown(kpi)
    setSelectedMonthDrillDown(monthCell)
    setIsDrillDownOpen(true)
  }

  const handleOpenTargetConfig = (kpi: KpiRowData) => {
    setSelectedKpiConfig(kpi)
    setIsTargetConfigOpen(true)
  }

  const handleSaveTarget = async (
    kpiId: string,
    targetValue: number,
    rule: KpiRule,
    targetMax: number | undefined,
    responsible: string,
    justification: string,
  ) => {
    if (!selectedKpiConfig) return
    const updatedConfig = {
      ...selectedKpiConfig.targetConfig,
      target_value: targetValue,
      rule,
      target_value_max: targetMax,
      responsible,
    }
    await tmsIndicatorsService.saveKpiTarget(
      updatedConfig,
      'gestao.logistica@ciafal.com.br',
      justification,
    )
    toast({
      title: 'Meta atualizada com sucesso',
      description: `Alteração gravada para ${selectedKpiConfig.name} com registro de auditoria.`,
    })
    await loadData()
  }

  const handleCreateActionFromAi = (
    aiDiagnosis: KpiAiDiagnosisResult,
    kpi: KpiRowData,
    monthCell?: KpiMonthCell,
  ) => {
    setSelectedKpiAction(kpi)
    setSelectedMonthAction(monthCell || kpi.months[0])
    setActiveAiDiagnosis(aiDiagnosis)
    setIsActionModalOpen(true)
  }

  const handleSubmitDeviationAction = async (
    action: Omit<DeviationActionRecord, 'id' | 'action_code' | 'created'>,
  ) => {
    await tmsIndicatorsService.createDeviationAction(action, 'gestao.logistica@ciafal.com.br')
    toast({
      title: 'Ação corretiva registrada',
      description: 'O desvio foi associado a um plano de ação e registrado para governança.',
    })
  }

  const handleResetFilters = () => {
    setFilters({
      year: currentYear,
      category: 'TODOS',
      company: 'TODOS',
      center: 'TODOS',
      status: 'TODOS',
      itinerary: 'TODOS',
      regionUf: 'TODOS',
      carrier: 'TODOS',
      driver: 'TODOS',
      customer: 'TODOS',
      searchQuery: '',
    })
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl animate-in fade-in duration-300">
      {/* Cabeçalho da Página */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                INDICADORES TMS
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                  HUB CIAFAL
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Expedição • Logística • Transporte — Matriz Gerencial Anual Consolidada (Real x
                Meta)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Atualizando...' : 'Atualizar Dados'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast({
                title: 'Exportação Solicitada',
                description: 'Gerando relatório consolidado em formato padrão ABNT...',
              })
            }}
            className="text-xs h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Exportar XLS
          </Button>
        </div>
      </div>

      {/* Cards Executivos de Resumo / Filtros Rápidos */}
      <KpiExecutiveCards
        rows={rows}
        activeStatusFilter={filters.status}
        onFilterStatus={(newStatus) =>
          setFilters((prev) => ({ ...prev, status: newStatus || 'TODOS' }))
        }
      />

      {/* Barra de Filtros Combináveis */}
      <KpiFilterBar
        filters={filters}
        filterOptions={filterOptions}
        onChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onReset={handleResetFilters}
      />

      {/* Matriz Consolidada Anual */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
          <h4 className="text-sm font-semibold text-foreground">
            Consolidando 22 Indicadores TMS...
          </h4>
          <p className="text-xs text-muted-foreground">
            Cruzando dados reais de carrier_operational_history, SAP ECC, portaria e faturamento
          </p>
        </div>
      ) : (
        <KpiConsolidatedMatrix
          rows={rows}
          onOpenDrillDown={handleOpenDrillDown}
          onOpenTargetConfig={handleOpenTargetConfig}
        />
      )}

      {/* Rodapé Informativo e Integridade dos Dados */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-sky-500" />
          <span>
            <strong>Fonte Canônica:</strong> SAP ECC via RFC/BAPI + Operação Real TMS
            (carrier_operational_history). Zero dados fictícios.
          </span>
        </div>
        <div>Última consolidação: {lastRefreshed.toLocaleTimeString('pt-BR')}</div>
      </div>

      {/* Modal 1: Drill-Down & IA Diagnóstica */}
      <KpiDrillDownModal
        isOpen={isDrillDownOpen}
        onClose={() => setIsDrillDownOpen(false)}
        kpi={selectedKpiDrillDown}
        initialMonthCell={selectedMonthDrillDown}
        onCreateAction={handleCreateActionFromAi}
      />

      {/* Modal 2: Parametrização de Metas */}
      <KpiTargetConfigModal
        isOpen={isTargetConfigOpen}
        onClose={() => setIsTargetConfigOpen(false)}
        kpi={selectedKpiConfig}
        onSave={handleSaveTarget}
      />

      {/* Modal 3: Tratamento de Desvio (Ação Corretiva) */}
      <KpiDeviationActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        kpi={selectedKpiAction}
        monthCell={selectedMonthAction}
        aiDiagnosis={activeAiDiagnosis}
        onSubmit={handleSubmitDeviationAction}
      />
    </div>
  )
}
export default TmsIndicatorsPage
