import React, { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { KpiRowData, KpiMonthCell, formatKpiValue } from '@/domain/tmsIndicatorsEngine'
import {
  generateIndividualChartAiAnalysis,
  formatAbntNumber,
  formatAbntDate,
} from '@/domain/tmsDeviationTreatmentEngine'
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Building2,
  MapPin,
  Clock,
  Truck,
  User,
  Filter,
} from 'lucide-react'

interface KpiIndividualGraphicAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  kpi: KpiRowData | null
  initialMonthCell?: KpiMonthCell
  allRecords?: any[]
  onOpenTreatmentWorkflow: (kpi: KpiRowData, monthCell: KpiMonthCell, chartSummary?: string) => void
}

export const KpiIndividualGraphicAnalysisModal: React.FC<
  KpiIndividualGraphicAnalysisModalProps
> = ({ isOpen, onClose, kpi, initialMonthCell, allRecords = [], onOpenTreatmentWorkflow }) => {
  // Filtros internos da análise gráfica
  const [selectedPeriodStart, setSelectedPeriodStart] = useState<number>(1) // Jan
  const [selectedPeriodEnd, setSelectedPeriodEnd] = useState<number>(12) // Dez
  const [selectedCompany, setSelectedCompany] = useState<string>('TODAS')
  const [selectedCenter, setSelectedCenter] = useState<string>('TODOS')
  const [selectedPeriodicity, setSelectedPeriodicity] = useState<'MES' | 'TRIMESTRE'>('MES')
  const [activeDimension, setActiveDimension] = useState<
    'TRANSPORTADORA' | 'MOTORISTA' | 'ITINERARIO' | 'UF' | 'CLIENTE'
  >('TRANSPORTADORA')

  // IA State
  const [isAiRunning, setIsAiRunning] = useState(false)
  const [aiReport, setAiReport] = useState<any>(null)

  // Mês selecionado no gráfico para acionar ação ou inspeção
  const [focusedMonthIndex, setFocusedMonthIndex] = useState<number>(() => {
    if (initialMonthCell) return initialMonthCell.month - 1
    return 0
  })

  // Sincroniza mês inicial caso mude kpi ou initialMonthCell
  React.useEffect(() => {
    if (initialMonthCell) {
      setFocusedMonthIndex(initialMonthCell.month - 1)
    }
  }, [initialMonthCell, kpi])

  // Detalhamento dimensional dinâmico baseado nos drillDownRecords reais
  const focusedCell = kpi ? kpi.months[focusedMonthIndex] || kpi.months[0] : null
  const focusedRecords = focusedCell?.drillDownRecords || []

  // Agregações dimensionais (Hook incondicional no topo)
  const dimensionAggregations = useMemo(() => {
    const carrierMap: Record<string, { count: number; outCount: number }> = {}
    const driverMap: Record<string, { count: number; outCount: number }> = {}
    const itinMap: Record<string, { count: number; outCount: number }> = {}
    const ufMap: Record<string, { count: number; outCount: number }> = {}
    const custMap: Record<string, { count: number; outCount: number }> = {}

    focusedRecords.forEach((r) => {
      const isOut = r.complianceStatus === 'FORA'

      if (r.carrierName && r.carrierName !== '—') {
        const entry = carrierMap[r.carrierName] || { count: 0, outCount: 0 }
        entry.count++
        if (isOut) entry.outCount++
        carrierMap[r.carrierName] = entry
      }

      if (r.driverName && r.driverName !== '—') {
        const entry = driverMap[r.driverName] || { count: 0, outCount: 0 }
        entry.count++
        if (isOut) entry.outCount++
        driverMap[r.driverName] = entry
      }

      if (r.itineraryCode && r.itineraryCode !== '—') {
        const entry = itinMap[r.itineraryCode] || { count: 0, outCount: 0 }
        entry.count++
        if (isOut) entry.outCount++
        itinMap[r.itineraryCode] = entry
      }

      if (r.destinationUf && r.destinationUf !== '—') {
        const entry = ufMap[r.destinationUf] || { count: 0, outCount: 0 }
        entry.count++
        if (isOut) entry.outCount++
        ufMap[r.destinationUf] = entry
      }

      if (r.customerName && r.customerName !== '—') {
        const entry = custMap[r.customerName] || { count: 0, outCount: 0 }
        entry.count++
        if (isOut) entry.outCount++
        custMap[r.customerName] = entry
      }
    })

    const toChartData = (map: Record<string, { count: number; outCount: number }>) => {
      return Object.entries(map)
        .map(([name, stat]) => ({
          name,
          total: stat.count,
          desvios: stat.outCount,
          aderenciaPct:
            stat.count > 0 ? Math.round(((stat.count - stat.outCount) / stat.count) * 100) : 100,
        }))
        .sort((a, b) => b.desvios - a.desvios || b.total - a.total)
        .slice(0, 10)
    }

    return {
      carriers: toChartData(carrierMap),
      drivers: toChartData(driverMap),
      itineraries: toChartData(itinMap),
      ufs: toChartData(ufMap),
      customers: toChartData(custMap),
    }
  }, [focusedRecords])

  // IA Analysis
  const runAiAnalysis = () => {
    if (!kpi) return
    setIsAiRunning(true)
    setTimeout(() => {
      const res = generateIndividualChartAiAnalysis(kpi, kpi.months)
      setAiReport(res)
      setIsAiRunning(false)
    }, 300)
  }

  if (!kpi || !focusedCell) return null

  const targetValue = kpi.targetConfig.target_value

  // Montagem da série temporal de 12 meses
  const monthlyChartData = kpi.months
    .filter((m) => m.month >= selectedPeriodStart && m.month <= selectedPeriodEnd)
    .map((m) => {
      const real = m.realValue !== null ? m.realValue : null
      const diff = real !== null ? real - targetValue : null
      return {
        month: m.month,
        monthLabel: m.monthLabel,
        year: m.year,
        fullPeriod: `${m.monthLabel}/${m.year}`,
        realizado: real,
        meta: targetValue,
        desvio: diff,
        status: m.status,
        recordsCount: m.recordsCount,
        hasData: m.hasData,
      }
    })

  // Média histórica calculada sobre dados reais apurados
  const validRealValues = monthlyChartData
    .filter((d) => d.realizado !== null)
    .map((d) => d.realizado as number)
  const mediaHistorica =
    validRealValues.length > 0
      ? validRealValues.reduce((a, b) => a + b, 0) / validRealValues.length
      : null

  // Série com linha de tendência e média histórica
  const enrichedChartData = monthlyChartData.map((d) => {
    // Linha de tendência simplificada móvel
    let trendVal: number | null = null
    if (d.realizado !== null && mediaHistorica !== null) {
      trendVal = Number((mediaHistorica + (d.realizado - mediaHistorica) * 0.4).toFixed(2))
    }
    return {
      ...d,
      mediaHistorica: mediaHistorica !== null ? Number(mediaHistorica.toFixed(2)) : null,
      tendencia: trendVal,
    }
  })

  // Destaques automáticos
  const maxDeviationPoint = enrichedChartData
    .filter((d) => d.realizado !== null)
    .sort((a, b) => Math.abs(b.desvio || 0) - Math.abs(a.desvio || 0))[0]

  const bestResultPoint = enrichedChartData
    .filter((d) => d.realizado !== null)
    .sort((a, b) => {
      if (kpi.rule === 'GTE') return (b.realizado || 0) - (a.realizado || 0)
      return (a.realizado || 0) - (b.realizado || 0)
    })[0]

  const outOfTargetCount = enrichedChartData.filter((d) => d.status === 'FORA_DA_META').length

  const handleStartTreatment = () => {
    const summary = aiReport
      ? `${aiReport.executiveSummary} ${aiReport.mainDeviation}`
      : `Análise gráfica do indicador ${kpi.name} em ${focusedCell.monthLabel}/${focusedCell.year}. Realizado ${focusedCell.formattedValue} vs Meta ${focusedCell.formattedTarget}.`
    onOpenTreatmentWorkflow(kpi, focusedCell, summary)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 bg-background">
        {/* CABEÇALHO PADRÃO CIAFAL / HUB */}
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-[#005596] text-white text-[11px] font-bold px-2 py-0.5">
                  HUB CIAFAL
                </Badge>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                  KPI #{kpi.seq} • {kpi.category}
                </span>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  Análise Gráfica — {kpi.name}
                </DialogTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
                {kpi.description} • <strong>Fonte:</strong> {kpi.dataSource}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={runAiAnalysis}
                disabled={isAiRunning}
                className="text-xs border-sky-300 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
              >
                <Sparkles
                  className={`w-3.5 h-3.5 mr-1.5 text-sky-600 ${isAiRunning ? 'animate-spin' : ''}`}
                />
                {isAiRunning ? 'Analisando...' : '✨ Analisar Gráfico com IA'}
              </Button>

              <Button
                size="sm"
                onClick={handleStartTreatment}
                className="text-xs bg-[#005596] hover:bg-[#004276] text-white font-semibold shadow-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                Criar Análise de Causa / Tratar Desvio
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* BARRA DE FILTROS DO GRÁFICO (12 MESES, EMPRESA, UNIDADE, PERIODICIDADE) */}
        <div className="bg-muted/30 border border-border/70 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground font-semibold flex items-center gap-1 text-[11px]">
              <Filter className="w-3.5 h-3.5 text-[#005596]" />
              Filtros:
            </span>

            {/* Período Inicial */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground">De:</span>
              <Select
                value={String(selectedPeriodStart)}
                onValueChange={(v) => setSelectedPeriodStart(Number(v))}
              >
                <SelectTrigger className="h-7 w-20 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kpi.months.map((m) => (
                    <SelectItem key={m.month} value={String(m.month)} className="text-xs">
                      {m.monthLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Período Final */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground">Até:</span>
              <Select
                value={String(selectedPeriodEnd)}
                onValueChange={(v) => setSelectedPeriodEnd(Number(v))}
              >
                <SelectTrigger className="h-7 w-20 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kpi.months.map((m) => (
                    <SelectItem key={m.month} value={String(m.month)} className="text-xs">
                      {m.monthLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Periodicidade */}
            <div className="flex items-center gap-1 ml-2">
              <span className="text-[11px] text-muted-foreground">Visão:</span>
              <Select
                value={selectedPeriodicity}
                onValueChange={(v) => setSelectedPeriodicity(v as any)}
              >
                <SelectTrigger className="h-7 w-28 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MES" className="text-xs">
                    Mensal
                  </SelectItem>
                  <SelectItem value="TRIMESTRE" className="text-xs">
                    Trimestral
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              Unidade Vigente: <strong>{kpi.unit}</strong> | Regra: <strong>{kpi.rule}</strong> |
              Meta: <strong>{kpi.formattedYtdTarget}</strong>
            </span>
          </div>
        </div>

        {/* CARDS COM DESTAQUES VISUAIS AUTOMÁTICOS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border bg-card shadow-2xs">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Realizado Consolidado
            </span>
            <div className="text-lg font-bold text-foreground mt-0.5">{kpi.formattedYtdReal}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span>Meta: {kpi.formattedYtdTarget}</span>
              {kpi.trend === 'UP' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
              {kpi.trend === 'DOWN' && <ArrowDownRight className="w-3 h-3 text-rose-500" />}
            </div>
          </div>

          <div className="p-3 rounded-xl border bg-card shadow-2xs">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Períodos com Desvio
            </span>
            <div
              className={`text-lg font-bold mt-0.5 ${
                outOfTargetCount > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {outOfTargetCount} {outOfTargetCount === 1 ? 'mês' : 'meses'}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {outOfTargetCount > 0 ? 'Requer análise de causa' : 'Dentro da meta'}
            </div>
          </div>

          <div className="p-3 rounded-xl border bg-card shadow-2xs">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Maior Desvio Registrado
            </span>
            <div className="text-lg font-bold text-rose-600 mt-0.5">
              {maxDeviationPoint ? maxDeviationPoint.fullPeriod : '—'}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {maxDeviationPoint && maxDeviationPoint.desvio !== null
                ? `Desvio: ${formatAbntNumber(maxDeviationPoint.desvio, 1)} ${kpi.unit}`
                : 'Sem desvios'}
            </div>
          </div>

          <div className="p-3 rounded-xl border bg-card shadow-2xs">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Média Histórica Calculada
            </span>
            <div className="text-lg font-bold text-foreground mt-0.5">
              {mediaHistorica !== null ? `${formatAbntNumber(mediaHistorica, 1)} ${kpi.unit}` : '—'}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Base: {validRealValues.length} meses apurados
            </div>
          </div>
        </div>

        {/* BLOCO IA EXECUTIVO CASO ACIONADO */}
        {aiReport && (
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-sky-500/20 text-sky-700 dark:text-sky-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-100">
                  Diagnóstico Executivo da Análise Gráfica (IA Especialista TMS)
                </h4>
              </div>
              <Badge variant="outline" className="text-[10px] border-sky-400 text-sky-700">
                Dados reais de operação
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 bg-white dark:bg-card p-3 rounded-lg border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  1. Resumo Executivo
                </span>
                <p className="text-foreground leading-relaxed">{aiReport.executiveSummary}</p>
              </div>

              <div className="space-y-1 bg-white dark:bg-card p-3 rounded-lg border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  2. Principal Desvio & Início
                </span>
                <p className="text-foreground leading-relaxed">{aiReport.mainDeviation}</p>
                <div className="text-[11px] text-muted-foreground pt-1">
                  Início identificado: <strong>{aiReport.whenStarted}</strong>
                </div>
              </div>

              <div className="space-y-1 bg-white dark:bg-card p-3 rounded-lg border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  3. Recorrência & Fatores Correlacionados
                </span>
                <p className="text-foreground leading-relaxed">{aiReport.recurrenceIdentified}</p>
                <p className="text-[11px] text-muted-foreground">{aiReport.relatedFactors}</p>
              </div>

              <div className="space-y-1 bg-white dark:bg-card p-3 rounded-lg border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  4. Ponto de Investigação & Ação Recomendada
                </span>
                <p className="text-foreground font-medium leading-relaxed">
                  {aiReport.investigationPoint}
                </p>
                <p className="text-[11px] text-sky-700 dark:text-sky-300 font-semibold pt-0.5">
                  → {aiReport.recommendedAction}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* GRÁFICO PRINCIPAL COM 4 SÉRIES (REALIZADO, META VIGENTE, TENDÊNCIA, MÉDIA HISTÓRICA) */}
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-[#005596]" />
                Comportamento Histórico (Últimos 12 Meses) • Realizado x Meta x Tendência
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Clique nos pontos ou selecione o mês na barra inferior para sincronizar o
                detalhamento operacional.
              </p>
            </div>

            {/* Legenda visual das séries */}
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-[#005596]" />
                <span className="font-semibold text-foreground">Série 1: Realizado</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-rose-500 border border-rose-500 border-dashed" />
                <span className="font-semibold text-rose-600">Série 2: Meta Vigente</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-amber-500" />
                <span className="text-muted-foreground">Série 3: Tendência</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-slate-400" />
                <span className="text-muted-foreground">Série 4: Média Histórica</span>
              </div>
            </div>
          </div>

          {/* Gráfico Recharts */}
          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={enrichedChartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const monthNum = e.activePayload[0].payload.month
                    setFocusedMonthIndex(monthNum - 1)
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="fullPeriod" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-popover border border-border shadow-md rounded-lg p-2.5 text-xs text-popover-foreground space-y-1">
                          <div className="font-bold border-b pb-1 text-foreground flex items-center justify-between gap-3">
                            <span>Período: {label}</span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] ${
                                data.status === 'ATENDIDA'
                                  ? 'border-emerald-500 text-emerald-600'
                                  : data.status === 'FORA_DA_META'
                                    ? 'border-rose-500 text-rose-600'
                                    : 'border-muted text-muted-foreground'
                              }`}
                            >
                              {data.status === 'ATENDIDA'
                                ? 'Atingida'
                                : data.status === 'FORA_DA_META'
                                  ? 'Fora da Meta'
                                  : 'Sem dados'}
                            </Badge>
                          </div>
                          <div className="text-[11px] space-y-0.5">
                            <div className="flex justify-between gap-4">
                              <span>Realizado:</span>
                              <strong className="text-foreground">
                                {data.realizado !== null
                                  ? `${formatAbntNumber(data.realizado, 1)} ${kpi.unit}`
                                  : 'Sem dados'}
                              </strong>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span>Meta Vigente:</span>
                              <strong className="text-foreground">
                                {formatAbntNumber(data.meta, 1)} {kpi.unit}
                              </strong>
                            </div>
                            {data.desvio !== null && (
                              <div className="flex justify-between gap-4">
                                <span>Desvio:</span>
                                <strong
                                  className={data.desvio > 0 ? 'text-rose-600' : 'text-emerald-600'}
                                >
                                  {data.desvio > 0
                                    ? `+${formatAbntNumber(data.desvio, 1)}`
                                    : formatAbntNumber(data.desvio, 1)}{' '}
                                  {kpi.unit}
                                </strong>
                              </div>
                            )}
                            <div className="flex justify-between gap-4 text-muted-foreground">
                              <span>Registros no mês:</span>
                              <span>{data.recordsCount}</span>
                            </div>
                          </div>
                          <div className="text-[9px] text-sky-600 pt-1 border-t border-border/50">
                            Clique para focar no mês e ver detalhamentos.
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                {/* Linha 1: Realizado */}
                <Line
                  type="monotone"
                  dataKey="realizado"
                  name="Realizado"
                  stroke="#005596"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#005596' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                {/* Linha 2: Meta */}
                <Line
                  type="monotone"
                  dataKey="meta"
                  name="Meta Vigente"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
                {/* Linha 3: Tendência */}
                <Line
                  type="monotone"
                  dataKey="tendencia"
                  name="Tendência"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                />
                {/* Linha 4: Média Histórica */}
                <Line
                  type="monotone"
                  dataKey="mediaHistorica"
                  name="Média Histórica"
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Seleção rápida do mês focado */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs border-t pt-2">
            <span className="text-[11px] text-muted-foreground font-semibold shrink-0 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Mês Focado:
            </span>
            {kpi.months.map((m, idx) => (
              <button
                key={m.month}
                type="button"
                onClick={() => setFocusedMonthIndex(idx)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  focusedMonthIndex === idx
                    ? 'bg-[#005596] text-white shadow-xs'
                    : m.hasData
                      ? m.status === 'ATENDIDA'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                }`}
              >
                {m.monthLabel}
              </button>
            ))}
          </div>
        </div>

        {/* DETALHAMENTO DINÂMICO CONFORME A ORIGEM DOS DADOS (Transportadora, Motorista, Itinerário, UF, Cliente) */}
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
            <div>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#005596]" />
                Detalhamento Dinâmico em {focusedCell.monthLabel}/{focusedCell.year}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Cruzamento analítico dos {focusedRecords.length} registros operacionais reais deste
                período.
              </p>
            </div>

            {/* Abas das dimensões existentes */}
            <div className="flex items-center gap-1 overflow-x-auto">
              <Button
                size="sm"
                variant={activeDimension === 'TRANSPORTADORA' ? 'default' : 'outline'}
                onClick={() => setActiveDimension('TRANSPORTADORA')}
                className={`h-7 text-[11px] ${
                  activeDimension === 'TRANSPORTADORA' ? 'bg-[#005596] text-white' : ''
                }`}
              >
                <Truck className="w-3 h-3 mr-1" />
                Transportadoras ({dimensionAggregations.carriers.length})
              </Button>

              <Button
                size="sm"
                variant={activeDimension === 'ITINERARIO' ? 'default' : 'outline'}
                onClick={() => setActiveDimension('ITINERARIO')}
                className={`h-7 text-[11px] ${
                  activeDimension === 'ITINERARIO' ? 'bg-[#005596] text-white' : ''
                }`}
              >
                <MapPin className="w-3 h-3 mr-1" />
                Itinerários ({dimensionAggregations.itineraries.length})
              </Button>

              <Button
                size="sm"
                variant={activeDimension === 'MOTORISTA' ? 'default' : 'outline'}
                onClick={() => setActiveDimension('MOTORISTA')}
                className={`h-7 text-[11px] ${
                  activeDimension === 'MOTORISTA' ? 'bg-[#005596] text-white' : ''
                }`}
              >
                <User className="w-3 h-3 mr-1" />
                Motoristas ({dimensionAggregations.drivers.length})
              </Button>

              <Button
                size="sm"
                variant={activeDimension === 'UF' ? 'default' : 'outline'}
                onClick={() => setActiveDimension('UF')}
                className={`h-7 text-[11px] ${
                  activeDimension === 'UF' ? 'bg-[#005596] text-white' : ''
                }`}
              >
                UF / Região ({dimensionAggregations.ufs.length})
              </Button>

              <Button
                size="sm"
                variant={activeDimension === 'CLIENTE' ? 'default' : 'outline'}
                onClick={() => setActiveDimension('CLIENTE')}
                className={`h-7 text-[11px] ${
                  activeDimension === 'CLIENTE' ? 'bg-[#005596] text-white' : ''
                }`}
              >
                <Building2 className="w-3 h-3 mr-1" />
                Clientes ({dimensionAggregations.customers.length})
              </Button>
            </div>
          </div>

          {/* Gráfico de Barras / Lista da Dimensão Ativa */}
          {focusedRecords.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Não existem dados disponíveis para o período selecionado ({focusedCell.monthLabel}/
              {focusedCell.year}).
            </div>
          ) : (
            <div>
              {activeDimension === 'TRANSPORTADORA' && (
                <DimensionChartTable
                  title="Detalhamento por Transportadora"
                  data={dimensionAggregations.carriers}
                  unit={kpi.unit}
                />
              )}
              {activeDimension === 'ITINERARIO' && (
                <DimensionChartTable
                  title="Detalhamento por Itinerário Logístico"
                  data={dimensionAggregations.itineraries}
                  unit={kpi.unit}
                />
              )}
              {activeDimension === 'MOTORISTA' && (
                <DimensionChartTable
                  title="Detalhamento por Motorista"
                  data={dimensionAggregations.drivers}
                  unit={kpi.unit}
                />
              )}
              {activeDimension === 'UF' && (
                <DimensionChartTable
                  title="Detalhamento por Destino / UF"
                  data={dimensionAggregations.ufs}
                  unit={kpi.unit}
                />
              )}
              {activeDimension === 'CLIENTE' && (
                <DimensionChartTable
                  title="Detalhamento por Cliente Receptador"
                  data={dimensionAggregations.customers}
                  unit={kpi.unit}
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface DimensionChartTableProps {
  title: string
  data: Array<{ name: string; total: number; desvios: number; aderenciaPct: number }>
  unit: string
}

const DimensionChartTable: React.FC<DimensionChartTableProps> = ({ title, data }) => {
  if (data.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        Não existem dados disponíveis nesta dimensão para o período selecionado.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
      {/* Gráfico de Barras */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 10 }}
              tickFormatter={(val) => (val.length > 15 ? `${val.substring(0, 15)}...` : val)}
            />
            <RechartsTooltip
              formatter={(val: any, name: any) => [
                val,
                name === 'desvios' ? 'Registros Fora da Meta' : 'Total de Viagens',
              ]}
            />
            <Bar dataKey="total" name="Total de Cargas" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
            <Bar dataKey="desvios" name="Fora da Meta" fill="#ef4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de Valores */}
      <div className="border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground sticky top-0 border-b">
            <tr>
              <th className="py-2 px-3">Entidade</th>
              <th className="py-2 px-2 text-center">Total Cargas</th>
              <th className="py-2 px-2 text-center">Desvios</th>
              <th className="py-2 px-2 text-right">Aderência %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-[11px]">
            {data.map((item, idx) => (
              <tr key={idx} className="hover:bg-muted/20">
                <td
                  className="py-1.5 px-3 font-medium text-foreground truncate max-w-[160px]"
                  title={item.name}
                >
                  {item.name}
                </td>
                <td className="py-1.5 px-2 text-center font-mono">{item.total}</td>
                <td className="py-1.5 px-2 text-center font-mono">
                  <span
                    className={
                      item.desvios > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-medium'
                    }
                  >
                    {item.desvios}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-right font-semibold">{item.aderenciaPct} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
