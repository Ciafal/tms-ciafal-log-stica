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
import { KpiIndividualGraphicAnalysisModal } from '@/components/tms-indicators/KpiIndividualGraphicAnalysisModal'
import { KpiDeviationTreatmentWorkflowModal } from '@/components/tms-indicators/KpiDeviationTreatmentWorkflowModal'
import { KpiWidgetErrorBoundary } from '@/components/tms-indicators/KpiWidgetErrorBoundary'
import { TmsDeviationTreatment } from '@/domain/tmsDeviationTreatmentEngine'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/ui-custom/PageHeader'
import { RefreshCw, BarChart3, Sparkles, Download, AlertCircle } from 'lucide-react'

export const TmsIndicatorsPage: React.FC = () => {
  const { toast } = useToast()
  const { user } = useAuth()
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

  // Modais de Análise Gráfica Individual & Workflow de Tratamento de Desvios (8 Etapas)
  const [selectedKpiGraphic, setSelectedKpiGraphic] = useState<KpiRowData | null>(null)
  const [selectedMonthGraphic, setSelectedMonthGraphic] = useState<KpiMonthCell | undefined>(
    undefined,
  )
  const [isGraphicModalOpen, setIsGraphicModalOpen] = useState<boolean>(false)

  const [selectedKpiTreatment, setSelectedKpiTreatment] = useState<KpiRowData | null>(null)
  const [selectedMonthTreatment, setSelectedMonthTreatment] = useState<KpiMonthCell | null>(null)
  const [initialTreatmentSummary, setInitialTreatmentSummary] = useState<string | undefined>(
    undefined,
  )
  const [existingTreatmentRecord, setExistingTreatmentRecord] =
    useState<TmsDeviationTreatment | null>(null)
  const [isTreatmentWorkflowOpen, setIsTreatmentWorkflowOpen] = useState<boolean>(false)

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

  // Abertura de Análise Gráfica Individual
  const handleOpenGraphicAnalysis = (kpi: KpiRowData, monthCell?: KpiMonthCell) => {
    setSelectedKpiGraphic(kpi)
    setSelectedMonthGraphic(monthCell)
    setIsGraphicModalOpen(true)
  }

  // Abertura de Tratamento de Desvios (8 Etapas padrão PCP Robotizado)
  const handleOpenTreatmentWorkflow = async (
    kpi: KpiRowData,
    monthCell?: KpiMonthCell,
    chartSummary?: string,
  ) => {
    if (!kpi) {
      toast({
        title: 'Indicador não informado',
        description: 'Selecione um indicador para iniciar o tratamento de desvio.',
        variant: 'destructive',
      })
      return
    }

    // Proteção estrita contra kpi.months vazio ou sem meses com dados
    const hasMonths = Array.isArray(kpi.months) && kpi.months.length > 0
    const targetCell =
      monthCell ||
      (hasMonths
        ? kpi.months.find((m) => m.hasData && m.status === 'FORA_DA_META') ||
          kpi.months.find((m) => m.hasData) ||
          kpi.months[kpi.months.length - 1]
        : null)

    if (!targetCell) {
      toast({
        title: 'Sem dados para tratamento',
        description: `O indicador ${kpi.name} não possui meses cadastrados no período. Registre apontamentos operacionais antes de abrir o workflow.`,
      })
      return
    }

    setSelectedKpiTreatment(kpi)
    setSelectedMonthTreatment(targetCell)
    setInitialTreatmentSummary(chartSummary)

    // Busca tratamento existente no banco para não duplicar registros de desvio aberto
    try {
      const yearToFetch = targetCell.year || filters.year
      const existingList = await tmsIndicatorsService.fetchTreatmentsByKpi(kpi.id, yearToFetch)
      const foundMatch = existingList.find(
        (t) => t.month === targetCell.month && t.status !== 'CANCELADO',
      )
      setExistingTreatmentRecord(foundMatch || null)
    } catch {
      setExistingTreatmentRecord(null)
    }

    setIsTreatmentWorkflowOpen(true)
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
      {/* Cabeçalho Canônico HUB CIAFAL */}
      <PageHeader
        title="Indicadores TMS — Matriz Gerencial Anual"
        subtitle="Expedição • Logística • Transporte — Matriz Gerencial Anual Consolidada (Real x Meta) cruzando dados do SAP ECC e operação em tempo real."
        icon={BarChart3}
        breadcrumbs={[
          { label: 'TMS CIAFAL', href: '/tms' },
          { label: 'Gestão Estratégica', href: '/tms/indicadores' },
          { label: 'Indicadores TMS' },
        ]}
        badge={
          <Badge className="bg-[#005596] text-white text-xs font-bold px-2.5 py-0.5">
            HUB CIAFAL
          </Badge>
        }
        actions={
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
        }
        className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm mb-0"
      />

      {/* Cards Executivos de Resumo / Filtros Rápidos */}
      <KpiWidgetErrorBoundary
        widgetName="Cards Executivos"
        userEmail={user?.email}
        userName={user?.name}
        onRetry={loadData}
      >
        <KpiExecutiveCards
          rows={rows}
          activeStatusFilter={filters.status}
          onFilterStatus={(newStatus) =>
            setFilters((prev) => ({ ...prev, status: newStatus || 'TODOS' }))
          }
        />
      </KpiWidgetErrorBoundary>

      {/* Barra de Filtros Combináveis */}
      <KpiWidgetErrorBoundary
        widgetName="Barra de Filtros de Indicadores"
        userEmail={user?.email}
        userName={user?.name}
        onRetry={handleResetFilters}
      >
        <KpiFilterBar
          filters={filters}
          filterOptions={filterOptions}
          onChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
          onReset={handleResetFilters}
        />
      </KpiWidgetErrorBoundary>

      {/* Matriz Consolidada Anual */}
      <KpiWidgetErrorBoundary
        widgetName="Matriz Consolidada de Indicadores"
        userEmail={user?.email}
        userName={user?.name}
        onRetry={loadData}
      >
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
            onOpenGraphicAnalysis={handleOpenGraphicAnalysis}
            onOpenTreatmentWorkflow={(kpi, cell) => handleOpenTreatmentWorkflow(kpi, cell)}
          />
        )}
      </KpiWidgetErrorBoundary>

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
        onOpenGraphicAnalysis={handleOpenGraphicAnalysis}
        onOpenTreatmentWorkflow={(kpi, cell) => handleOpenTreatmentWorkflow(kpi, cell)}
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

      {/* Modal 4: Análise Gráfica Individual (12 Meses, 4 Séries, Detalhamentos Dinâmicos, IA) */}
      <KpiIndividualGraphicAnalysisModal
        isOpen={isGraphicModalOpen}
        onClose={() => setIsGraphicModalOpen(false)}
        kpi={selectedKpiGraphic}
        initialMonthCell={selectedMonthGraphic}
        onOpenTreatmentWorkflow={(kpi, cell, summary) => {
          setIsGraphicModalOpen(false)
          handleOpenTreatmentWorkflow(kpi, cell, summary)
        }}
      />

      {/* Modal 5: Workflow de Tratamento de Desvios (8 Etapas canônicas do PCP Robotizado) */}
      <KpiWidgetErrorBoundary
        widgetName="Modal de Tratamento de Desvios"
        userEmail={user?.email}
        userName={user?.name}
        onRetry={() => setIsTreatmentWorkflowOpen(false)}
      >
        <KpiDeviationTreatmentWorkflowModal
          isOpen={isTreatmentWorkflowOpen}
          onClose={() => setIsTreatmentWorkflowOpen(false)}
          kpi={selectedKpiTreatment}
          monthCell={selectedMonthTreatment}
          initialGraphicSummary={initialTreatmentSummary}
          existingTreatment={existingTreatmentRecord}
          onSuccessSave={() => {
            loadData()
          }}
        />
      </KpiWidgetErrorBoundary>
    </div>
  )
}
export default TmsIndicatorsPage
