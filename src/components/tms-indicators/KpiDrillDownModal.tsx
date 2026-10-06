import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  KpiRowData,
  KpiMonthCell,
  runAiKpiDiagnosis,
  KpiAiDiagnosisResult,
} from '@/domain/tmsIndicatorsEngine'
import {
  Sparkles,
  Database,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  BarChart3,
} from 'lucide-react'

interface KpiDrillDownModalProps {
  isOpen: boolean
  onClose: () => void
  kpi: KpiRowData | null
  initialMonthCell?: KpiMonthCell
  onCreateAction: (
    aiDiagnosis: KpiAiDiagnosisResult,
    kpi: KpiRowData,
    monthCell?: KpiMonthCell,
  ) => void
  onOpenGraphicAnalysis?: (kpi: KpiRowData, monthCell?: KpiMonthCell) => void
  onOpenTreatmentWorkflow?: (kpi: KpiRowData, monthCell?: KpiMonthCell) => void
}

export const KpiDrillDownModal: React.FC<KpiDrillDownModalProps> = ({
  isOpen,
  onClose,
  kpi,
  initialMonthCell,
  onCreateAction,
  onOpenGraphicAnalysis,
  onOpenTreatmentWorkflow,
}) => {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(() => {
    if (initialMonthCell) return initialMonthCell.month - 1
    return 0
  })

  if (!kpi) return null

  const activeCell = kpi.months[selectedMonthIndex] || kpi.months[0]
  const aiDiagnosis = runAiKpiDiagnosis(kpi, activeCell)
  const records = activeCell?.drillDownRecords || []

  // Cálculos rápidos de histórico do ano
  const validMonths = kpi.months.filter((m) => m.hasData && m.realValue !== null)
  const averageReal =
    validMonths.length > 0
      ? validMonths.reduce((acc, m) => acc + (m.realValue || 0), 0) / validMonths.length
      : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  KPI #{kpi.seq}
                </span>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  {kpi.name}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={
                    kpi.category === 'EXPEDICAO'
                      ? 'border-sky-500 text-sky-600'
                      : kpi.category === 'LOGISTICA'
                        ? 'border-amber-500 text-amber-600'
                        : 'border-indigo-500 text-indigo-600'
                  }
                >
                  {kpi.category}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{kpi.description}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onOpenGraphicAnalysis && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose()
                    onOpenGraphicAnalysis(kpi, activeCell)
                  }}
                  className="text-xs border-[#005596] text-[#005596] hover:bg-sky-50"
                >
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                  Análise Gráfica Individual
                </Button>
              )}

              {onOpenTreatmentWorkflow && (
                <Button
                  size="sm"
                  onClick={() => {
                    onClose()
                    onOpenTreatmentWorkflow(kpi, activeCell)
                  }}
                  className="bg-[#005596] hover:bg-[#004276] text-white shadow-sm text-xs font-semibold"
                >
                  <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                  Tratar Desvio (8 Etapas)
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Barra de Seleção Rápida de Mês */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 border-b text-xs">
          <span className="text-muted-foreground font-medium text-[11px] shrink-0 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Mês de Análise:
          </span>
          {kpi.months.map((m, idx) => (
            <button
              key={m.month}
              type="button"
              onClick={() => setSelectedMonthIndex(idx)}
              className={`px-2.5 py-1 rounded text-xs transition-all font-medium ${
                selectedMonthIndex === idx
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : m.hasData
                    ? m.status === 'ATENDIDA'
                      ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/20'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted'
              }`}
            >
              {m.monthLabel}
            </button>
          ))}
        </div>

        {/* Conteúdo em Abas: 1. Diagnóstico de IA | 2. Detalhamento dos Registros | 3. Histórico Anual */}
        <Tabs defaultValue="ia" className="mt-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="ia" className="text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              IA & Diagnóstico
            </TabsTrigger>
            <TabsTrigger value="registros" className="text-xs flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Registros Reais ({records.length})
            </TabsTrigger>
            <TabsTrigger value="historico" className="text-xs flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Histórico & Tendência
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: IA INTEGRADA & DIAGNÓSTICO */}
          <TabsContent value="ia" className="space-y-4 pt-3">
            {/* Bloco Diagnóstico */}
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Diagnóstico Factual de Desvio ({activeCell.monthLabel}/{activeCell.year})
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Análise determinística cruzando TMS, SAP ECC, portaria e fretes
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={
                    activeCell.status === 'ATENDIDA'
                      ? 'border-emerald-500 text-emerald-600'
                      : activeCell.status === 'FORA_DA_META'
                        ? 'border-rose-500 text-rose-600'
                        : 'border-muted text-muted-foreground'
                  }
                >
                  Real: {activeCell.formattedValue} | Meta: {activeCell.formattedTarget}
                </Badge>
              </div>

              <p className="text-xs leading-relaxed text-foreground/90 font-medium bg-background/50 p-3 rounded-lg border border-border/50">
                {aiDiagnosis.diagnostic}
              </p>
            </div>

            {/* Causas Prováveis */}
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Causas Prováveis Correlacionadas aos Dados
              </h5>
              <div className="space-y-1.5">
                {aiDiagnosis.probableCauses.map((cause, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40"
                  >
                    <ArrowRight className="w-3 h-3 text-sky-500 shrink-0 mt-0.5" />
                    <span>{cause}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Desdobramento Dimensional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border bg-card space-y-2">
                <span className="text-[11px] font-medium text-muted-foreground uppercase flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-sky-500" />
                  Concentração Dimensional
                </span>
                <p className="text-xs font-semibold text-foreground">
                  {aiDiagnosis.dimensionalBreakdown.concentratedIn}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-card space-y-2">
                <span className="text-[11px] font-medium text-muted-foreground uppercase">
                  Ação Recomendada pela IA
                </span>
                <p className="text-xs text-foreground font-medium">
                  {aiDiagnosis.suggestedAction.action}
                </p>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                  <span>
                    Módulo: <strong>{aiDiagnosis.suggestedAction.targetModule}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Setor: <strong>{aiDiagnosis.suggestedAction.responsibleSector}</strong>
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ABA 2: REGISTROS REAIS FORMADORES DO KPI */}
          <TabsContent value="registros" className="pt-3">
            <div className="border rounded-xl overflow-hidden bg-card">
              <div className="p-3 bg-muted/30 border-b flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Registros Operacionais que Formaram o Indicador em {activeCell.monthLabel}/
                  {activeCell.year}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  Fonte: {kpi.dataSource}
                </span>
              </div>

              {records.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Nenhum registro operacional encontrado para este mês ou integração pendente.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground sticky top-0">
                      <tr className="border-b">
                        <th className="py-2 px-3">Data</th>
                        <th className="py-2 px-3">Nº Ordem / SAP</th>
                        <th className="py-2 px-3">Cliente</th>
                        <th className="py-2 px-3">Transportadora / Motorista</th>
                        <th className="py-2 px-3">Itinerário / Destino</th>
                        <th className="py-2 px-3 text-right">Peso (t)</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-3">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {records.map((rec) => (
                        <tr key={rec.id} className="hover:bg-muted/20">
                          <td className="py-2 px-3 font-mono text-[11px]">{rec.date}</td>
                          <td className="py-2 px-3">
                            <div className="font-semibold">{rec.orderNumber}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              SAP: {rec.sapTransportNumber}
                            </div>
                          </td>
                          <td className="py-2 px-3 max-w-[160px] truncate" title={rec.customerName}>
                            {rec.customerName}
                          </td>
                          <td className="py-2 px-3">
                            <div
                              className="truncate max-w-[150px] font-medium"
                              title={rec.carrierName}
                            >
                              {rec.carrierName}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                              {rec.driverName} ({rec.vehiclePlate})
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-mono text-[11px]">{rec.itineraryCode}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {rec.destinationCity}/{rec.destinationUf}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
                            {rec.weightTon.toFixed(2)} t
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[9px] h-4 ${
                                rec.complianceStatus === 'ATINGIU'
                                  ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                                  : rec.complianceStatus === 'FORA'
                                    ? 'border-rose-500 text-rose-600 bg-rose-500/10'
                                    : 'border-muted text-muted-foreground'
                              }`}
                            >
                              {rec.primaryValueFormatted}
                            </Badge>
                          </td>
                          <td
                            className="py-2 px-3 text-muted-foreground text-[11px] max-w-[200px] truncate"
                            title={rec.detailText}
                          >
                            {rec.detailText}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ABA 3: HISTÓRICO & TENDÊNCIA ANUAL */}
          <TabsContent value="historico" className="pt-3 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  YTD Consolidado
                </span>
                <div className="text-base font-bold text-foreground mt-0.5">
                  {kpi.formattedYtdReal}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Meta: {kpi.formattedYtdTarget}
                </span>
              </div>

              <div className="p-3 rounded-xl border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  Média Mensal
                </span>
                <div className="text-base font-bold text-foreground mt-0.5">
                  {averageReal !== null ? `${averageReal.toFixed(1)} ${kpi.unit}` : '—'}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {validMonths.length} meses apurados
                </span>
              </div>

              <div className="p-3 rounded-xl border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  Melhor Mês
                </span>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {kpi.bestMonth}
                </div>
                <span className="text-[10px] text-muted-foreground">Pico de aderência</span>
              </div>

              <div className="p-3 rounded-xl border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  Pior Mês
                </span>
                <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  {kpi.worstMonth}
                </div>
                <span className="text-[10px] text-muted-foreground">Pior desvio</span>
              </div>
            </div>

            {/* Metadados e Governança */}
            <div className="p-4 rounded-xl border bg-muted/20 space-y-2 text-xs">
              <h5 className="font-semibold text-foreground">
                Metadados de Governança do Indicador
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground text-[11px]">
                <div>
                  <strong>Responsável:</strong> {kpi.targetConfig.responsible}
                </div>
                <div>
                  <strong>Fonte de Dados:</strong> {kpi.dataSource}
                </div>
                <div>
                  <strong>Unidade de Medida:</strong> {kpi.unit}
                </div>
                <div>
                  <strong>Última Atualização:</strong>{' '}
                  {new Date(kpi.lastUpdate).toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
