import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MapPin,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Search,
  X,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Info,
  Truck,
  Building,
  User,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Scale,
  DollarSign,
  Maximize2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PageHeader } from '@/components/ui-custom/PageHeader'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import { carrierHistoryService } from '@/services/carrierHistoryService'
import {
  formatCurrency,
  formatWeight,
  formatDistance,
  formatPercent,
  formatDate,
  formatDateTime,
} from '@/lib/utils'
import { exportToCsv, exportToXlsxXml, triggerPrintPdf } from '@/lib/exportUtils'
import {
  ItineraryReportFilterParams,
  ItineraryReportDetailedRow,
  ItineraryReportFilterOptions,
  buildDetailedReportRows,
  applyItineraryReportFilters,
  calculateItinerarySummaryCards,
  buildChartAnalyses,
  generateItineraryAiDiagnosticReport,
  ItineraryAiPatternFinding,
} from '@/domain/itineraryReportEngine'
import type { RouteAdditionEntity } from '@/domain/routeAdditionEngine'

const CHART_COLORS = [
  '#005596',
  '#0284c7',
  '#0d9488',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
]

const DEFAULT_FILTERS: ItineraryReportFilterParams = {
  periodPreset: 'TODOS',
  startDate: '',
  endDate: '',
  company: 'TODOS',
  center: 'TODOS',
  itinerarySap: 'TODOS',
  uf: 'TODOS',
  region: 'TODOS',
  customer: 'TODOS',
  user: 'TODOS',
  reason: 'TODOS',
  additionStatus: 'TODOS',
  recordStatus: 'TODOS',
  kmImpactFilter: 'TODOS',
  costImpactFilter: 'TODOS',
  occupancyRange: 'TODOS',
  aiClassification: 'TODOS',
  searchQuery: '',
}

export const ItineraryReportPage: React.FC = () => {
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [routeAdditions, setRouteAdditions] = useState<RouteAdditionEntity[]>([])
  const [operationalHistory, setOperationalHistory] = useState<any[]>([])
  const [sapItineraries, setSapItineraries] = useState<any[]>([])

  const [filters, setFilters] = useState<ItineraryReportFilterParams>(DEFAULT_FILTERS)
  const [periodGroupBy, setPeriodGroupBy] = useState<'DIA' | 'SEMANA' | 'MES'>('SEMANA')
  const [isFilterBarExpanded, setIsFilterBarExpanded] = useState<boolean>(true)

  // Paginação da tabela
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 15

  // Modal de Detalhe da Adição/Carga
  const [selectedRowDetail, setSelectedRowDetail] = useState<ItineraryReportDetailedRow | null>(
    null,
  )

  // Carrega dados REAIS do backend (PocketBase)
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [additionsData, histData, itinData] = await Promise.all([
        TmsService.getRouteAdditions('', '-created'),
        carrierHistoryService.getOperationalHistory(200).catch(() => []),
        TmsService.getSapItineraries().catch(() => []),
      ])

      setRouteAdditions(additionsData || [])
      setOperationalHistory(Array.isArray(histData) ? histData : (histData as any)?.items || [])
      setSapItineraries(itinData || [])
    } catch (err: any) {
      console.error('[ItineraryReportPage] Erro ao carregar dados:', err)
      toast({
        title: 'Erro ao carregar dados do relatório',
        description: err?.message || 'Falha ao buscar registros na base.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Processa dados brutos em linhas analíticas detalhadas
  const { rawRows, filterOptions } = useMemo(() => {
    const res = buildDetailedReportRows({
      routeAdditions,
      operationalHistory,
      sapItineraries,
    })
    return { rawRows: res.rows, filterOptions: res.filterOptions }
  }, [routeAdditions, operationalHistory, sapItineraries])

  // Aplica filtros ativos
  const filteredRows = useMemo(() => {
    return applyItineraryReportFilters(rawRows, filters)
  }, [rawRows, filters])

  // Reset de página ao alterar filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // 11 Cards do Topo (Item A)
  const summaryCards = useMemo(() => {
    return calculateItinerarySummaryCards(filteredRows)
  }, [filteredRows])

  // Análises Gráficas (Item B)
  const chartData = useMemo(() => {
    return buildChartAnalyses(filteredRows, periodGroupBy)
  }, [filteredRows, periodGroupBy])

  // Motor determinístico de IA dos Itinerários (Item E)
  const aiFindings = useMemo(() => {
    return generateItineraryAiDiagnosticReport(filteredRows)
  }, [filteredRows])

  // Linhas paginadas
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage, pageSize])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))

  // Handlers de Filtros
  const handleFilterChange = (key: keyof ItineraryReportFilterParams, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    toast({
      title: 'Filtros limpos',
      description: 'Todos os parâmetros de filtragem foram redefinidos para o padrão.',
    })
  }

  // Exportação Excel XML (compatível nativamente com Excel)
  const handleExportExcel = () => {
    if (filteredRows.length === 0) {
      toast({
        title: 'Sem dados para exportar',
        description: 'Nenhum registro atende aos filtros atuais.',
        variant: 'destructive',
      })
      return
    }

    const headers = [
      'Data',
      'Nº Carga',
      'Nº Transporte SAP',
      'Itinerário Original',
      'Descrição Itinerário Original',
      'Rota Adicionada',
      'Descrição Rota Adicionada',
      'Cliente',
      'Cidade',
      'UF',
      'Região',
      'Peso Antes (t)',
      'Peso Depois (t)',
      'Ocupação Antes (%)',
      'Ocupação Depois (%)',
      'Distância Antes (km)',
      'Distância Depois (km)',
      'Km Adicionais',
      'Descargas Antes',
      'Descargas Depois',
      'Descargas Adicionais',
      'Custo Frete Antes (R$)',
      'Custo Frete Depois (R$)',
      'Pedágio Antes (R$)',
      'Pedágio Depois (R$)',
      'Custo Total Antes (R$)',
      'Custo Total Depois (R$)',
      'Custo Adicional (R$)',
      'Motivo Selecionado',
      'Observação do Usuário',
      'Usuário',
      'Perfil',
      'Parecer IA',
      'Classificação IA x Justificativa',
      'Status da Adição',
      'Data/Hora Alteração',
    ]

    const rows = filteredRows.map((r) => [
      r.formattedDate,
      r.cargoNumber,
      r.transportNumber,
      r.originalItineraryId,
      r.originalItineraryDesc,
      r.addedItineraryId,
      r.addedItineraryDesc,
      r.customerName,
      r.destinationCity,
      r.destinationUf,
      r.destinationRegion,
      (r.weightBeforeKg / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      (r.weightAfterKg / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      formatPercent(r.occupancyBeforePct),
      formatPercent(r.occupancyAfterPct),
      r.distanceBeforeKm,
      r.distanceAfterKm,
      r.additionalDistanceKm,
      r.dischargesBefore,
      r.dischargesAfter,
      r.additionalDischarges,
      r.freightBeforeBrl,
      r.freightAfterBrl,
      r.tollBeforeBrl,
      r.tollAfterBrl,
      r.totalCostBeforeBrl,
      r.totalCostAfterBrl,
      r.additionalCostBrl,
      r.reasonDescription,
      r.userObservation,
      r.createdByUser,
      r.createdByRole,
      r.aiAnalysisText,
      r.aiUserAlignment,
      r.status,
      r.formattedDateTime,
    ])

    const dateStr = new Date().toISOString().split('T')[0]
    exportToXlsxXml(`Relatorio_Itinerarios_CIAFAL_${dateStr}.xlsx`, 'Itinerários', headers, rows)

    toast({
      title: 'Exportação Excel Gerada',
      description: `${filteredRows.length} registros exportados com formatação ABNT pt-BR.`,
    })
  }

  // Exportação PDF via Print Dialog estilizado
  const handleExportPdf = () => {
    triggerPrintPdf('Relatório de Itinerários — TMS CIAFAL Logística')
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-[1600px] animate-in fade-in duration-300">
      {/* Cabeçalho Canônico HUB CIAFAL (Padrão v0.0.99 para evitar truncamento) */}
      <PageHeader
        title="Relatório de Itinerários — Análise de Adições & Ocupação"
        subtitle="Expedição • Planejamento • Análises — Auditoria de adições excepcionais de rotas, desvios quilométricos, impacto financeiro e inteligência preditiva de itinerários SAP."
        icon={MapPin}
        breadcrumbs={[
          { label: 'TMS CIAFAL', href: '/tms/dashboard' },
          { label: 'Análises', href: '/tms/analises/indicadores-tms' },
          { label: 'Relatório de Itinerários' },
        ]}
        badge={
          <Badge className="bg-[#005596] text-white text-xs font-bold px-2.5 py-0.5">
            ANÁLISES TMS
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="text-xs h-9 bg-white hover:bg-slate-50 border-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Atualizando...' : 'Atualizar Dados'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="text-xs h-9 bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300 font-medium"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Exportar Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              className="text-xs h-9 bg-[#005596] hover:bg-[#004275] text-white border-transparent font-medium shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Exportar PDF
            </Button>
          </div>
        }
        className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm mb-0"
      />

      {/* BLOCO D: BARRA DE FILTROS DO RELATÓRIO */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#005596]" />
            <CardTitle className="text-sm font-bold text-slate-800">
              Filtros Analíticos de Itinerários
            </CardTitle>
            <Badge variant="outline" className="text-[10px] text-slate-500 font-normal">
              {filteredRows.length} de {rawRows.length} cargas filtradas
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Limpar filtros
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFilterBarExpanded(!isFilterBarExpanded)}
              className="text-xs text-slate-600 h-8"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-[#005596]" />
              {isFilterBarExpanded ? 'Recolher' : 'Expandir'}
            </Button>
          </div>
        </CardHeader>

        {isFilterBarExpanded && (
          <CardContent className="p-4 pt-3 space-y-3 text-xs">
            {/* Linha 1: Período, Adição, Itinerário, UF, Região */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Período
                </label>
                <Select
                  value={filters.periodPreset}
                  onValueChange={(val: any) => handleFilterChange('periodPreset', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="TODOS">Todo o Histórico</SelectItem>
                    <SelectItem value="HOJE">Hoje</SelectItem>
                    <SelectItem value="7D">Últimos 7 dias</SelectItem>
                    <SelectItem value="15D">Últimos 15 dias</SelectItem>
                    <SelectItem value="30D">Últimos 30 dias</SelectItem>
                    <SelectItem value="MES_ATUAL">Mês Atual</SelectItem>
                    <SelectItem value="ANO_ATUAL">Ano Atual</SelectItem>
                    <SelectItem value="CUSTOM">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Adição de Rota
                </label>
                <Select
                  value={filters.additionStatus}
                  onValueChange={(val: any) => handleFilterChange('additionStatus', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Com / sem adição" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="TODOS">Todas as Cargas</SelectItem>
                    <SelectItem value="COM_ADICAO">Apenas com Rota Adicionada</SelectItem>
                    <SelectItem value="SEM_ADICAO">Sem Adição (Rota Padrão)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Itinerário SAP
                </label>
                <Select
                  value={filters.itinerarySap}
                  onValueChange={(val: any) => handleFilterChange('itinerarySap', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 truncate">
                    <SelectValue placeholder="Todos os itinerários" />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-56">
                    <SelectItem value="TODOS">Todos os Itinerários</SelectItem>
                    {filterOptions.itineraries.map((it) => (
                      <SelectItem key={it.code} value={it.code} className="truncate">
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  UF de Destino
                </label>
                <Select
                  value={filters.uf}
                  onValueChange={(val: any) => handleFilterChange('uf', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Todas as UFs" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="TODOS">Todas as UFs</SelectItem>
                    {filterOptions.ufs.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Região
                </label>
                <Select
                  value={filters.region}
                  onValueChange={(val: any) => handleFilterChange('region', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Todas as regiões" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="TODOS">Todas as Regiões</SelectItem>
                    {filterOptions.regions.map((reg) => (
                      <SelectItem key={reg} value={reg}>
                        {reg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 2: Cliente, Usuário, Motivo, Status Adição, Classificação IA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Cliente
                </label>
                <Select
                  value={filters.customer}
                  onValueChange={(val: any) => handleFilterChange('customer', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 truncate">
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-56">
                    <SelectItem value="TODOS">Todos os Clientes</SelectItem>
                    {filterOptions.customers.map((c) => (
                      <SelectItem key={c} value={c} className="truncate">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Usuário Operador
                </label>
                <Select
                  value={filters.user}
                  onValueChange={(val: any) => handleFilterChange('user', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 truncate">
                    <SelectValue placeholder="Todos os usuários" />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-56">
                    <SelectItem value="TODOS">Todos os Usuários</SelectItem>
                    {filterOptions.users.map((u) => (
                      <SelectItem key={u} value={u} className="truncate">
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Motivo da Adição (17 Motivos)
                </label>
                <Select
                  value={filters.reason}
                  onValueChange={(val: any) => handleFilterChange('reason', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 truncate">
                    <SelectValue placeholder="Todos os motivos" />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-56">
                    <SelectItem value="TODOS">Todos os Motivos Oficiais</SelectItem>
                    {filterOptions.reasons.map((r) => (
                      <SelectItem key={r.code} value={r.code} className="truncate">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Classificação da IA
                </label>
                <Select
                  value={filters.aiClassification}
                  onValueChange={(val: any) => handleFilterChange('aiClassification', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Todas as classificações" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="TODOS">Todas as Classificações</SelectItem>
                    <SelectItem value="Coerente">Coerente</SelectItem>
                    <SelectItem value="Parcialmente coerente">Parcialmente coerente</SelectItem>
                    <SelectItem value="Divergente">Divergente</SelectItem>
                    <SelectItem value="Dados insuficientes">Dados insuficientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Status Registro
                </label>
                <Select
                  value={filters.recordStatus}
                  onValueChange={(val: any) => handleFilterChange('recordStatus', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Ativa / Removida" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="TODOS">Todos os Status</SelectItem>
                    <SelectItem value="ATIVA">Ativa</SelectItem>
                    <SelectItem value="REMOVIDA">Removida pelo Usuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 3: Impactos e Busca */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Impacto em KM
                </label>
                <Select
                  value={filters.kmImpactFilter}
                  onValueChange={(val: any) => handleFilterChange('kmImpactFilter', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Faixa de km" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="TODOS">Qualquer Impacto KM</SelectItem>
                    <SelectItem value="ATE_30">Até 30 km adicionais</SelectItem>
                    <SelectItem value="31_A_60">31 a 60 km adicionais</SelectItem>
                    <SelectItem value="61_A_100">61 a 100 km adicionais</SelectItem>
                    <SelectItem value="ACIMA_100">Acima de 100 km (Desvio Alto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Impacto de Custo
                </label>
                <Select
                  value={filters.costImpactFilter}
                  onValueChange={(val: any) => handleFilterChange('costImpactFilter', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Faixa de custo" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="TODOS">Qualquer Custo Adicional</SelectItem>
                    <SelectItem value="ATE_200">Até R$ 200,00</SelectItem>
                    <SelectItem value="201_A_500">R$ 201,00 a R$ 500,00</SelectItem>
                    <SelectItem value="ACIMA_500">Acima de R$ 500,00</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Faixa de Ocupação Final
                </label>
                <Select
                  value={filters.occupancyRange}
                  onValueChange={(val: any) => handleFilterChange('occupancyRange', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Faixa de ocupação" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="TODOS">Qualquer Ocupação</SelectItem>
                    <SelectItem value="ATE_60">Até 60 %</SelectItem>
                    <SelectItem value="60_A_80">60 % a 80 %</SelectItem>
                    <SelectItem value="80_A_95">80 % a 95 %</SelectItem>
                    <SelectItem value="ACIMA_95">Acima de 95 % (Lotação)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Busca Textual (Carga, Cliente, Itinerário)
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <Input
                    value={filters.searchQuery}
                    onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                    placeholder="Filtrar por qualquer campo..."
                    className="h-8 pl-8 text-xs bg-slate-50 border-slate-200"
                  />
                  {filters.searchQuery && (
                    <button
                      type="button"
                      onClick={() => handleFilterChange('searchQuery', '')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* BLOCO A: OS 12 CARDS EXECUTIVOS OFICIAIS (Requisito 16) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2.5">
        {/* 1. Total de Itinerários Executados */}
        <Card className="border-slate-200 bg-white shadow-2xs p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            1. Itinerários Executados
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-slate-900">
              {summaryCards.totalItinerariesExecuted.toLocaleString('pt-BR')}
            </span>
            <Route className="w-3.5 h-3.5 text-[#005596]/70" />
          </div>
          <div className="text-[9px] text-slate-400 mt-1">Códigos SAP TVROT</div>
        </Card>

        {/* 2. Cargas Planejadas */}
        <Card className="border-slate-200 bg-white shadow-2xs p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            2. Cargas Planejadas
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-slate-900">
              {summaryCards.totalLoads.toLocaleString('pt-BR')}
            </span>
            <Layers className="w-3.5 h-3.5 text-[#005596]/60" />
          </div>
          <div className="text-[9px] text-slate-400 mt-1">Total de viagens</div>
        </Card>

        {/* 3. Cargas com Adição de Rota */}
        <Card className="border-amber-200 bg-amber-50/40 shadow-2xs p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">
            3. Cargas c/ Adição Rota
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-amber-700">
              {summaryCards.loadsWithAddition.toLocaleString('pt-BR')}
            </span>
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-[9px] text-amber-700 mt-1 font-medium">Exceções ativas</div>
        </Card>

        {/* 4. % com Adição de Rota */}
        <Card className="border-slate-200 bg-white shadow-2xs p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            4. % c/ Adição Rota
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-slate-900">
              {formatPercent(summaryCards.additionPercentage)}
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-[9px] text-slate-400 mt-1">Taxa de complementação</div>
        </Card>

        {/* 5. Nº Total de Rotas Adicionadas */}
        <Card className="border-amber-200 bg-amber-50/20 shadow-2xs p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-amber-900 uppercase tracking-tight">
            5. Nº Rotas Adicionadas
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-amber-800">
              {summaryCards.totalRoutesAddedCount.toLocaleString('pt-BR')}
            </span>
            <Plus className="w-3.5 h-3.5 text-amber-700" />
          </div>
          <div className="text-[9px] text-amber-700 mt-1 font-medium">Trechos extras</div>
        </Card>

        {/* 6. Km Adicionais */}
        <Card className="border-slate-200 bg-white shadow-2xs p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            6. Km Adicionais
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-amber-600">
              +{formatDistance(summaryCards.totalAdditionalKm)}
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-[9px] text-slate-400 mt-1">Desvio físico total</div>
        </Card>

        {/* 7. Custo Adicional */}
        <Card className="border-slate-200 bg-white shadow-2xs p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            7. Custo Adicional
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-black text-rose-600">
              {formatCurrency(summaryCards.totalEstimatedAdditionalCost)}
            </span>
            <DollarSign className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-[9px] text-slate-400 mt-1">Frete + pedágio extra</div>
        </Card>

        {/* 8. Peso Adicionado */}
        <Card className="border-slate-200 bg-white shadow-2xs p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            8. Peso Adicionado
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-black text-emerald-700">
              +{summaryCards.totalAddedWeightTon.toFixed(1)} t
            </span>
            <Scale className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-[9px] text-slate-400 mt-1">Carga complementar</div>
        </Card>

        {/* 9. Média de Fracionamentos */}
        <Card className="border-blue-200 bg-blue-50/40 shadow-2xs p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-[#005596] uppercase tracking-tight">
            9. Média Fracionamentos
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-[#005596]">
              {summaryCards.avgFractionations.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </span>
            <Users className="w-3.5 h-3.5 text-[#005596]" />
          </div>
          <div className="text-[9px] text-blue-700 mt-1">Clientes por carga</div>
        </Card>

        {/* 10. Média de Ocupação Antes */}
        <Card className="border-slate-200 bg-white shadow-2xs p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            10. Ocupação Antes
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-slate-700">
              {formatPercent(summaryCards.avgOccupancyBefore)}
            </span>
            <Truck className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-[9px] text-slate-400 mt-1">Média pré-inclusão</div>
        </Card>

        {/* 11. Média de Ocupação Depois */}
        <Card className="border-slate-200 bg-white shadow-2xs p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            11. Ocupação Depois
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-emerald-600">
              {formatPercent(summaryCards.avgOccupancyAfter)}
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-[9px] text-slate-400 mt-1">Média pós-inclusão</div>
        </Card>

        {/* 12. Ganho Médio de Ocupação */}
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-tight">
            12. Ganho Médio Ocup.
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-emerald-700">
              +{formatPercent(summaryCards.avgOccupancyImpactPp)}
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-[9px] text-emerald-700 mt-1 font-medium">Pontos percentuais</div>
        </Card>
      </div>

      {/* BLOCO E: ANÁLISE DE IA DOS ITINERÁRIOS (Motor determinístico sobre dados reais) */}
      <Card className="border-sky-200 bg-gradient-to-r from-sky-50/80 via-white to-blue-50/60 shadow-sm">
        <CardHeader className="p-4 pb-2 border-b border-sky-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#005596] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-[#005596] flex items-center gap-2">
                Análise de IA dos Itinerários — Diagnósticos & Ações Recomendadas
                <Badge className="bg-sky-600 text-white text-[10px]">IA Deterministica</Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Padrões recorrentes vs eventos pontuais, excesso de exceções, deficiências de
                carteira/estoque e recomendações logísticas. A IA apenas sugere; a decisão é do
                usuário.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiFindings.map((finding) => {
              const isCrit = finding.severity === 'CRITICO'
              const isAtt = finding.severity === 'ATENCAO'
              const isPos = finding.severity === 'POSITIVO'

              return (
                <div
                  key={finding.id}
                  className={`rounded-xl border p-4 space-y-3 bg-white shadow-sm flex flex-col justify-between ${
                    isCrit
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : isAtt
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : isPos
                          ? 'border-emerald-300'
                          : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          className={
                            finding.type === 'PADRAO_RECORRENTE'
                              ? 'bg-amber-600 text-white text-[9px] font-bold'
                              : finding.type === 'OPORTUNIDADE_OTIMIZACAO'
                                ? 'bg-emerald-600 text-white text-[9px] font-bold'
                                : 'bg-slate-600 text-white text-[9px] font-bold'
                          }
                        >
                          {finding.type === 'PADRAO_RECORRENTE'
                            ? 'Padrão Recorrente'
                            : finding.type === 'OPORTUNIDADE_OTIMIZACAO'
                              ? 'Oportunidade Otimização'
                              : 'Evento Pontual'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[9px] text-slate-600 font-semibold"
                        >
                          {finding.targetEntity}
                        </Badge>
                      </div>

                      {finding.severity === 'CRITICO' && (
                        <Badge className="bg-rose-100 text-rose-700 border border-rose-300 text-[9px] font-bold">
                          Impacto Alto
                        </Badge>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {finding.title}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {finding.narrativeText}
                    </p>

                    <div className="p-2 rounded bg-slate-50 border border-slate-100 text-[11px] text-slate-700 font-mono">
                      <strong>Evidência quantitativa:</strong> {finding.quantitativeEvidence}
                    </div>
                  </div>

                  {/* Ações recomendadas pela IA */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#005596]" />
                      Ações Recomendadas pela IA:
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-700">
                      {finding.recommendedActions.map((act, aIdx) => (
                        <li key={aIdx} className="flex items-start gap-1.5">
                          <ArrowRight className="w-3 h-3 text-[#005596] shrink-0 mt-0.5" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* BLOCO B: ANÁLISES GRÁFICAS RESPONSIVAS */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#005596]" />
            <h3 className="text-sm font-bold text-slate-900">
              Análises Gráficas de Adições & Itinerários
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Agrupamento Temporal:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setPeriodGroupBy('DIA')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  periodGroupBy === 'DIA'
                    ? 'bg-[#005596] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dia
              </button>
              <button
                type="button"
                onClick={() => setPeriodGroupBy('SEMANA')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  periodGroupBy === 'SEMANA'
                    ? 'bg-[#005596] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => setPeriodGroupBy('MES')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  periodGroupBy === 'MES'
                    ? 'bg-[#005596] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mês
              </button>
            </div>
          </div>
        </div>

        {summaryCards.loadsWithAddition === 0 ? (
          <Card className="border-slate-200 bg-white p-8 text-center space-y-2">
            <Info className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">
              Nenhuma adição de rota registrada no período
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Quando houver adições de rotas excepcionais cadastradas no Planejador de Cargas para
              este recorte, os 9 gráficos de distribuição analítica serão exibidos aqui.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Adições por Motivo */}
            <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  1. Adições por Motivo Oficial
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Distribuição dos 17 motivos oficiais registrados
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.byReason.slice(0, 6)}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                      <XAxis type="number" textAnchor="middle" tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="reasonLabel"
                        width={130}
                        tick={{ fontSize: 9 }}
                        tickFormatter={(v) => (v.length > 20 ? `${v.substring(0, 18)}...` : v)}
                      />
                      <RechartsTooltip
                        formatter={(val: any) => [`${val} cargas`, 'Adições']}
                        labelFormatter={(lbl) => `Motivo: ${lbl}`}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="count" fill="#005596" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 2. Adições por Itinerário SAP */}
            <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  2. Adições por Itinerário SAP
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Itinerários que mais receberam rotas complementares
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.byItinerary.slice(0, 6)}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="itineraryCode"
                        tick={{ fontSize: 10 }}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip
                        formatter={(val: any) => [`${val} cargas`, 'Adições']}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 3. Adições por UF / Região */}
            <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  3. Adições por UF / Região
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Concentração geográfica dos desvios
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.byUfRegion.slice(0, 6)}
                        dataKey="count"
                        nameKey="uf"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={35}
                        paddingAngle={3}
                        label={({ name, percent }: any) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {chartData.byUfRegion.slice(0, 6).map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [`${val} cargas`, `UF ${name}`]}
                        contentStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 4. Adições por Período */}
            <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  4. Evolução Temporal de Adições
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Ocorrências agrupadas por {periodGroupBy.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData.byPeriod}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="periodLabel" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip
                        formatter={(val: any) => [`${val} cargas`, 'Adições']}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#005596"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#005596' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 5. Adições por Usuário */}
            <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  5. Adições por Usuário Operador
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Planejadores que registraram adições no período
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.byUser.slice(0, 5)}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="userName"
                        width={110}
                        tick={{ fontSize: 9 }}
                        tickFormatter={(v) => (v.length > 16 ? `${v.substring(0, 14)}...` : v)}
                      />
                      <RechartsTooltip
                        formatter={(val: any) => [`${val} adições`, 'Operador']}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="count" fill="#0d9488" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 6. Impacto na Ocupação (Antes x Depois) */}
            <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  6. Impacto na Ocupação (Antes × Depois)
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Média de ocupação % por itinerário
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.occupancyComparison}
                      margin={{ top: 10, right: 10, left: -20, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [
                          `${val} %`,
                          name === 'before' ? 'Antes' : 'Depois',
                        ]}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="before" name="Antes" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="after" name="Depois" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 7. Impacto de Distância (Km Adicionais) */}
            <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  7. Distância Adicional por Itinerário
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Desvios acumulados em quilômetros
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.byDistance}
                      margin={{ top: 10, right: 10, left: -10, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="itineraryCode" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip
                        formatter={(val: any) => [`+${val} km`, 'Km Adicionais']}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="additionalKm" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 8. Impacto Financeiro (Custo Adicional Frete + Pedágio) */}
            <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  8. Impacto Financeiro Estimado
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Custo adicional acumulado (Frete + Pedágio)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.byFinancialCost}
                      margin={{ top: 10, right: 10, left: 0, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="itineraryCode" tick={{ fontSize: 9 }} />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                      />
                      <RechartsTooltip
                        formatter={(val: any) => [formatCurrency(val), 'Custo Adicional']}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="totalCost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 9. Principais Clientes Relacionados às Adições */}
            <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  9. Principais Clientes em Adições
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Destinatários que mais demandaram rota complementar
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.byCustomer.slice(0, 5)}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="customerName"
                        width={120}
                        tick={{ fontSize: 9 }}
                        tickFormatter={(v) => (v.length > 18 ? `${v.substring(0, 16)}...` : v)}
                      />
                      <RechartsTooltip
                        formatter={(val: any) => [`${val} cargas`, 'Adições']}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 10. Cargas por Nº de Fracionamentos (Requisito 10) */}
            <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  10. Cargas por Nº de Fracionamentos (1, 2, 3, 4, 5+)
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Distribuição de cargas por quantidade de clientes/paradas
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.byFractionationBuckets}
                      margin={{ top: 10, right: 10, left: -20, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [
                          name === 'count' ? `${val} cargas` : `${val}%`,
                          name === 'count' ? 'Qtd Cargas' : '% do Total',
                        ]}
                        labelFormatter={(lbl) => `${lbl} fracionamento(s)`}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="count" fill="#005596" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 11. Custo x Fracionamento & Ocupação x Fracionamento (Requisito 10) */}
            <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  11. Ocupação % e Custo R$/t × Fracionamento
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Ocupação média e custo por tonelada por faixa de fracionamento
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.byFractionationBuckets}
                      margin={{ top: 10, right: 10, left: -10, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                      <YAxis
                        yAxisId="left"
                        domain={[0, 100]}
                        tick={{ fontSize: 9 }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 9 }}
                        tickFormatter={(v) => `R$${v}`}
                      />
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [
                          name === 'avgOccupancyPct' ? `${val}%` : formatCurrency(val),
                          name === 'avgOccupancyPct' ? 'Ocupação Média' : 'Custo R$/t',
                        ]}
                        labelFormatter={(lbl) => `${lbl} fracionamento(s)`}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar
                        yAxisId="left"
                        dataKey="avgOccupancyPct"
                        name="Ocupação %"
                        fill="#0284c7"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="avgCostPerTonBrl"
                        name="Custo R$/t"
                        fill="#ea580c"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 12. Itinerários com Maior Média de Fracionamentos (Requisito 10) */}
            <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  12. Itinerários com Maior Média de Fracionamentos
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Rotas com entregas mais pulverizadas
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.byItineraryFractionation}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="itineraryCode"
                        tick={{ fontSize: 10 }}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [
                          `${val}`,
                          name === 'avgFractionation'
                            ? 'Média Fracionamentos'
                            : 'Máx Fracionamento',
                        ]}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Bar
                        dataKey="avgFractionation"
                        name="Média Fracionamentos"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* BLOCO C: TABELA ANALÍTICA DETALHADA */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Tabela Analítica de Cargas & Itinerários
              <Badge className="bg-[#005596] text-white text-[10px]">
                {filteredRows.length} registros
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Detalhamento de peso, ocupação, km, custo, descargas, parecer determinístico da IA e
              conformidade.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 text-xs"
            >
              Próxima
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px] font-bold tracking-tight uppercase">
                  <th className="p-2.5 whitespace-nowrap">Data / Hora</th>
                  <th className="p-2.5 whitespace-nowrap">Nº Carga</th>
                  <th className="p-2.5 whitespace-nowrap">Nº Transp. SAP</th>
                  <th className="p-2.5 whitespace-nowrap">Itinerário Original</th>
                  <th className="p-2.5 whitespace-nowrap">Rota Adicionada</th>
                  <th className="p-2.5 whitespace-nowrap">Cliente</th>
                  <th className="p-2.5 whitespace-nowrap">Cidade / UF</th>
                  <th className="p-2.5 whitespace-nowrap text-right">Peso Antes / Depois</th>
                  <th className="p-2.5 whitespace-nowrap text-right">Ocup. Antes / Depois</th>
                  <th className="p-2.5 whitespace-nowrap text-right">Km Antes / Depois (+Km)</th>
                  <th className="p-2.5 whitespace-nowrap text-center">Descargas</th>
                  <th className="p-2.5 whitespace-nowrap text-right">Custo Antes / Depois</th>
                  <th className="p-2.5 whitespace-nowrap">Motivo Selecionado</th>
                  <th className="p-2.5 whitespace-nowrap">Usuário</th>
                  <th className="p-2.5 whitespace-nowrap">Classif. IA</th>
                  <th className="p-2.5 whitespace-nowrap">Status</th>
                  <th className="p-2.5 whitespace-nowrap text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="p-8 text-center text-slate-400">
                      Nenhum registro encontrado com os filtros ativos.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => {
                    const isAddition = row.isAddition
                    const alignBadgeColor =
                      row.aiUserAlignment === 'Coerente'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : row.aiUserAlignment === 'Parcialmente coerente'
                          ? 'bg-sky-100 text-sky-800 border-sky-300'
                          : row.aiUserAlignment === 'Divergente'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'

                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isAddition ? 'bg-amber-50/15' : ''
                        }`}
                      >
                        {/* Data / Hora */}
                        <td className="p-2.5 whitespace-nowrap font-mono text-[11px]">
                          <div>{row.formattedDate}</div>
                          <div className="text-[10px] text-slate-400">
                            {row.formattedDateTime.split(' ')[1] || ''}
                          </div>
                        </td>

                        {/* Nº Carga */}
                        <td className="p-2.5 whitespace-nowrap font-semibold text-slate-900">
                          {row.cargoNumber}
                        </td>

                        {/* Nº Transporte SAP */}
                        <td className="p-2.5 whitespace-nowrap font-mono text-slate-600">
                          {row.transportNumber}
                        </td>

                        {/* Itinerário Original */}
                        <td className="p-2.5 whitespace-nowrap">
                          <div className="font-bold text-[#005596]">{row.originalItineraryId}</div>
                          <div
                            className="text-[10px] text-slate-500 truncate max-w-[140px]"
                            title={row.originalItineraryDesc}
                          >
                            {row.originalItineraryDesc}
                          </div>
                        </td>

                        {/* Rota Adicionada */}
                        <td className="p-2.5 whitespace-nowrap">
                          {isAddition ? (
                            <div>
                              <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                                + {row.addedItineraryId}
                              </Badge>
                              <div
                                className="text-[10px] text-slate-500 truncate max-w-[130px]"
                                title={row.addedItineraryDesc}
                              >
                                {row.addedItineraryDesc}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Cliente */}
                        <td
                          className="p-2.5 whitespace-nowrap max-w-[140px] truncate"
                          title={row.customerName}
                        >
                          <div className="font-medium text-slate-900 truncate">
                            {row.customerName}
                          </div>
                          {row.customerCode !== '—' && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Cód: {row.customerCode}
                            </div>
                          )}
                        </td>

                        {/* Cidade / UF */}
                        <td className="p-2.5 whitespace-nowrap text-slate-700">
                          {row.destinationCity} /{' '}
                          <span className="font-bold">{row.destinationUf}</span>
                        </td>

                        {/* Peso Antes / Depois */}
                        <td className="p-2.5 whitespace-nowrap text-right font-mono">
                          {isAddition ? (
                            <div>
                              <span className="text-slate-500">
                                {formatWeight(row.weightBeforeKg, { unit: 'kg', decimals: 1 })}
                              </span>
                              <span className="mx-1 text-slate-400">→</span>
                              <span className="font-bold text-slate-900">
                                {formatWeight(row.weightAfterKg, { unit: 'kg', decimals: 1 })}
                              </span>
                            </div>
                          ) : (
                            <span className="font-medium text-slate-700">
                              {formatWeight(row.weightBeforeKg, { unit: 'kg', decimals: 1 })}
                            </span>
                          )}
                        </td>

                        {/* Ocupação Antes / Depois */}
                        <td className="p-2.5 whitespace-nowrap text-right font-mono">
                          {isAddition ? (
                            <div>
                              <span className="text-slate-500">
                                {formatPercent(row.occupancyBeforePct)}
                              </span>
                              <span className="mx-1 text-slate-400">→</span>
                              <span className="font-bold text-emerald-700">
                                {formatPercent(row.occupancyAfterPct)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-700">
                              {formatPercent(row.occupancyBeforePct)}
                            </span>
                          )}
                        </td>

                        {/* Km Antes / Depois (+Km) */}
                        <td className="p-2.5 whitespace-nowrap text-right font-mono">
                          {isAddition ? (
                            <div>
                              <span>{row.distanceAfterKm} km</span>
                              <span className="text-amber-700 font-bold ml-1">
                                (+{row.additionalDistanceKm} km)
                              </span>
                            </div>
                          ) : (
                            <span>{row.distanceBeforeKm} km</span>
                          )}
                        </td>

                        {/* Descargas */}
                        <td className="p-2.5 whitespace-nowrap text-center">
                          {isAddition ? (
                            <span className="font-medium">
                              {row.dischargesBefore} → {row.dischargesAfter} (+
                              {row.additionalDischarges})
                            </span>
                          ) : (
                            <span>{row.dischargesBefore}</span>
                          )}
                        </td>

                        {/* Custo Antes / Depois */}
                        <td className="p-2.5 whitespace-nowrap text-right font-mono">
                          {isAddition ? (
                            <div>
                              <span className="text-slate-500">
                                {formatCurrency(row.totalCostBeforeBrl)}
                              </span>
                              <span className="mx-1 text-slate-400">→</span>
                              <span className="font-bold text-slate-900">
                                {formatCurrency(row.totalCostAfterBrl)}
                              </span>
                            </div>
                          ) : (
                            <span>{formatCurrency(row.totalCostBeforeBrl)}</span>
                          )}
                        </td>

                        {/* Motivo Selecionado */}
                        <td
                          className="p-2.5 whitespace-nowrap max-w-[140px] truncate"
                          title={row.reasonDescription}
                        >
                          {isAddition ? (
                            <span className="text-slate-700 font-medium">
                              {row.reasonDescription}
                            </span>
                          ) : (
                            <span className="text-slate-400">Rota Padrão</span>
                          )}
                        </td>

                        {/* Usuário */}
                        <td
                          className="p-2.5 whitespace-nowrap text-slate-600 truncate max-w-[120px]"
                          title={row.createdByUser}
                        >
                          {row.createdByUser}
                        </td>

                        {/* Classificação IA */}
                        <td className="p-2.5 whitespace-nowrap">
                          {isAddition ? (
                            <Badge
                              className={`text-[10px] font-semibold border ${alignBadgeColor}`}
                            >
                              {row.aiUserAlignment}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-2.5 whitespace-nowrap">
                          {row.status === 'ATIVA' ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 text-[10px]">
                              Ativa
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-700 border-rose-300 text-[10px]">
                              Removida
                            </Badge>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="p-2.5 whitespace-nowrap text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRowDetail(row)}
                            className="h-7 px-2 text-xs text-[#005596] hover:bg-sky-50"
                            title="Ver detalhes da carga e parecer completo da IA"
                          >
                            <Maximize2 className="w-3.5 h-3.5 mr-1" />
                            Detalhes
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL DE DETALHES COMPLETOS DA CARGA / ADIÇÃO */}
      {selectedRowDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-[#005596] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-sky-200" />
                <div>
                  <h3 className="font-bold text-sm">
                    Detalhes da Carga {selectedRowDetail.cargoNumber}
                  </h3>
                  <p className="text-[11px] text-sky-200">
                    Itinerário Original: {selectedRowDetail.originalItineraryId} •{' '}
                    {selectedRowDetail.originalItineraryDesc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-700">
              {/* Comparativo Antes x Depois */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Peso (t)</div>
                  <div className="font-mono text-sm font-black text-slate-900 mt-0.5">
                    {formatWeight(selectedRowDetail.weightBeforeKg, { unit: 'kg', decimals: 1 })} →{' '}
                    {formatWeight(selectedRowDetail.weightAfterKg, { unit: 'kg', decimals: 1 })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Ocupação</div>
                  <div className="font-mono text-sm font-black text-emerald-700 mt-0.5">
                    {formatPercent(selectedRowDetail.occupancyBeforePct)} →{' '}
                    {formatPercent(selectedRowDetail.occupancyAfterPct)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Distância</div>
                  <div className="font-mono text-sm font-black text-slate-900 mt-0.5">
                    {selectedRowDetail.distanceAfterKm} km{' '}
                    <span className="text-amber-600">
                      (+{selectedRowDetail.additionalDistanceKm})
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Custo Total</div>
                  <div className="font-mono text-sm font-black text-slate-900 mt-0.5">
                    {formatCurrency(selectedRowDetail.totalCostAfterBrl)}
                  </div>
                </div>
              </div>

              {/* Rota Adicionada e Motivo */}
              {selectedRowDetail.isAddition && (
                <div className="space-y-2 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-600 text-white font-bold text-xs">
                      Rota Adicionada: {selectedRowDetail.addedItineraryId}
                    </Badge>
                    <span className="font-semibold text-slate-800">
                      {selectedRowDetail.addedItineraryDesc}
                    </span>
                  </div>
                  <div>
                    <strong>Motivo Oficial:</strong> {selectedRowDetail.reasonDescription}
                  </div>
                  {selectedRowDetail.userObservation &&
                    selectedRowDetail.userObservation !== '—' && (
                      <div>
                        <strong>Observação do Usuário:</strong> &quot;
                        {selectedRowDetail.userObservation}&quot;
                      </div>
                    )}
                </div>
              )}

              {/* Bloco de IA com Parecer Objetivo */}
              <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[#005596] text-xs">
                    <Sparkles className="w-4 h-4 text-sky-600" />
                    Parecer de Inteligência Artificial CIAFAL
                  </div>
                  <Badge
                    className={
                      selectedRowDetail.aiUserAlignment === 'Coerente'
                        ? 'bg-emerald-600 text-white'
                        : selectedRowDetail.aiUserAlignment === 'Divergente'
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-600 text-white'
                    }
                  >
                    {selectedRowDetail.aiUserAlignment}
                  </Badge>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {selectedRowDetail.aiAnalysisText}
                </p>
                {selectedRowDetail.aiAlertFlag && (
                  <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>
                      {selectedRowDetail.aiAlertMessage ||
                        'Alerta de impacto relevante fora do padrão.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Rastreabilidade e Auditoria */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                <div>
                  <strong>Operador:</strong> {selectedRowDetail.createdByUser} (
                  {selectedRowDetail.createdByRole})
                </div>
                <div>
                  <strong>Data/Hora do Registro:</strong> {selectedRowDetail.formattedDateTime}
                </div>
                <div>
                  <strong>Nº Transporte SAP:</strong> {selectedRowDetail.transportNumber}
                </div>
                <div>
                  <strong>Status:</strong> {selectedRowDetail.status}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRowDetail(null)}
                className="text-xs"
              >
                Fechar Detalhes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ItineraryReportPage
