import React from 'react'
import {
  Sparkles,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  TrendingUp,
  Scale,
  Clock,
  DollarSign,
  Activity,
  Layers,
  Info,
  Truck,
  RotateCcw,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AiReportAnalysisResult,
  WeightAnomaly,
  TimeOutlier,
  FinancialAnomaly,
} from '@/domain/transportAnalyticsEngine'
import { formatCurrency, formatWeight, formatPercent } from '@/lib/utils'

interface ReportAiAnalysisModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysis: AiReportAnalysisResult | null
  isLoading: boolean
  isFiltersDirty: boolean
  onRefreshAnalysis: () => void
  onDrillDownTransport?: (transportNumber: string) => void
}

export const ReportAiAnalysisModal: React.FC<ReportAiAnalysisModalProps> = ({
  open,
  onOpenChange,
  analysis,
  isLoading,
  isFiltersDirty,
  onRefreshAnalysis,
  onDrillDownTransport,
}) => {
  if (!analysis) return null

  const exec = analysis.executiveSummary
  const op = analysis.operational
  const w = analysis.weighing
  const t = analysis.times
  const f = analysis.financial

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-slate-200">
        {/* Header com Identidade HUB CIAFAL */}
        <DialogHeader className="p-5 pb-3 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#005596]/10 text-[#005596]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
                    Análise IA Operacional
                  </DialogTitle>
                  <Badge className="bg-[#005596] text-white text-[10px] font-bold">
                    HUB CIAFAL Logística
                  </Badge>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {analysis.filteredCount} transportes analisados
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Diagnóstico estatístico preditivo, detecção automática de anomalias, pesagem e
                  custos baseados exclusivamente no dataset filtrado ativo.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshAnalysis}
                disabled={isLoading}
                className="text-xs h-8 gap-1.5 border-slate-300 text-slate-700 bg-white shadow-sm hover:border-[#005596]"
              >
                <RotateCcw
                  className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#005596]' : ''}`}
                />
                <span>Atualizar</span>
              </Button>
            </div>
          </div>

          {/* Banner de aviso se filtros foram modificados na tela de origem */}
          {isFiltersDirty && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Os filtros do relatório foram alterados. Atualizar análise?</span>
              </div>
              <Button
                size="sm"
                onClick={onRefreshAnalysis}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-3 font-semibold shadow-sm"
              >
                Atualizar Análise
              </Button>
            </div>
          )}

          {/* Filtros Ativos Legíveis */}
          <div className="mt-3 p-2.5 bg-slate-100/80 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
              Filtros considerados nesta análise:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {analysis.activeFiltersFormatted.map((filtro, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="bg-white text-slate-700 border-slate-300 text-[10px] font-medium py-0.5"
                >
                  {filtro}
                </Badge>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Resumo Executivo em Cards */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#005596]" />
              Resumo Executivo (Dados Reais Filtrados)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardContent className="p-3">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">
                    Transportes Analisados
                  </span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {exec.transportsCount}
                  </div>
                  <span className="text-[9px] text-slate-400">100% da consulta</span>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-white">
                <CardContent className="p-3">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">
                    Peso Transportado
                  </span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {formatWeight(exec.totalNetWeightTon * 1000)}
                  </div>
                  <span className="text-[9px] text-slate-400">
                    {exec.totalNetWeightTon.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t
                    líquido
                  </span>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-white">
                <CardContent className="p-3">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">
                    Ocupação Média
                  </span>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">
                    {formatPercent(exec.avgOccupancyPct, 1)}
                  </div>
                  <span className="text-[9px] text-slate-400">Capacidade útil aferida</span>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-white">
                <CardContent className="p-3">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">
                    Frete Contratado
                  </span>
                  <div className="text-lg font-black text-[#005596] mt-0.5">
                    {formatCurrency(exec.totalFreightCost)}
                  </div>
                  <span className="text-[9px] text-slate-400">Custo direto de frete</span>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-white">
                <CardContent className="p-3">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">
                    Tempo Médio Total
                  </span>
                  <div className="text-lg font-black text-slate-800 mt-0.5">
                    {exec.avgOperationalDwellMin} min
                  </div>
                  <span className="text-[9px] text-slate-400">Permanência no pátio</span>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-white">
                <CardContent className="p-3">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">
                    Divergências Balança
                  </span>
                  <div
                    className={`text-lg font-black mt-0.5 ${
                      exec.divergentWeightTransportsCount > 0 ? 'text-amber-600' : 'text-slate-800'
                    }`}
                  >
                    {exec.divergentWeightTransportsCount}
                  </div>
                  <span className="text-[9px] text-slate-400">Peso NF × Líquido</span>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 2. Principais Constatações e Anomalias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Principais Constatações (Máx 5 insights) */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Principais Constatações Operacionais (Top 5)
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] border-amber-200 text-amber-800 bg-amber-50"
                >
                  Prioritário
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                {analysis.topInsights.length > 0 ? (
                  analysis.topInsights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-[#005596]/10 text-[#005596] font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed">{insight}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">Nenhuma constatação prioritária.</p>
                )}
              </CardContent>
            </Card>

            {/* Anomalias Detectadas Reais */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Anomalias Detectadas
                </CardTitle>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    analysis.anomaliesDetected.length > 0
                      ? 'border-rose-200 text-rose-800 bg-rose-50'
                      : 'border-emerald-200 text-emerald-800 bg-emerald-50'
                  }`}
                >
                  {analysis.anomaliesDetected.length} identificada(s)
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                {analysis.anomaliesDetected.length > 0 ? (
                  analysis.anomaliesDetected.map((anom, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-200/80 text-rose-900 leading-relaxed"
                    >
                      {anom}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-emerald-700 p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Nenhuma anomalia de pesagem, tempo ou custo identificada nos filtros atuais.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 3. Abas Detalhadas por Dimensão */}
          <Tabs defaultValue="operacao" className="w-full">
            <TabsList className="bg-white border border-slate-200 p-1 w-full justify-start overflow-x-auto h-auto">
              <TabsTrigger
                value="operacao"
                className="text-xs data-[state=active]:bg-[#005596] data-[state=active]:text-white gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                Operação & Frota
              </TabsTrigger>
              <TabsTrigger
                value="pesagem"
                className="text-xs data-[state=active]:bg-[#005596] data-[state=active]:text-white gap-1.5"
              >
                <Scale className="w-3.5 h-3.5" />
                Pesagem & Balança
              </TabsTrigger>
              <TabsTrigger
                value="tempos"
                className="text-xs data-[state=active]:bg-[#005596] data-[state=active]:text-white gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Tempos & Gargalos
              </TabsTrigger>
              <TabsTrigger
                value="financeiro"
                className="text-xs data-[state=active]:bg-[#005596] data-[state=active]:text-white gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Financeiro & Eficiência
              </TabsTrigger>
            </TabsList>

            {/* Aba Operação */}
            <TabsContent value="operacao" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="p-3 pb-2 border-b border-slate-100">
                    <CardTitle className="text-xs font-bold uppercase text-slate-700">
                      Distribuição por Status SAP
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600">Concluído</span>
                      <span className="font-bold text-emerald-700">{op.completed}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600">Em Expedição</span>
                      <span className="font-bold text-sky-700">{op.inExpedition}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600">Em Viagem</span>
                      <span className="font-bold text-indigo-700">{op.inTrip}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600">Encerrado com Ocorrência</span>
                      <span className="font-bold text-rose-700">{op.withOccurrence}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">Outros Status</span>
                      <span className="font-bold text-slate-700">{op.otherStatus}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="p-3 pb-2 border-b border-slate-100">
                    <CardTitle className="text-xs font-bold uppercase text-slate-700">
                      Distribuição por Centro / Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-xs">
                    {Object.entries(op.distributionByCenter).map(([center, count]) => (
                      <div
                        key={center}
                        className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0"
                      >
                        <span className="text-slate-700 font-medium">{center}</span>
                        <Badge variant="outline" className="text-xs font-bold">
                          {count} ({Math.round((count / op.totalTransports) * 100)}%)
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Itinerários e Tipos de Veículos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="p-3 pb-2 border-b border-slate-100">
                    <CardTitle className="text-xs font-bold uppercase text-slate-700">
                      Distribuição por Itinerário (Top 5)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-xs">
                    {Object.entries(op.distributionByItinerary)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([itin, count]) => (
                        <div
                          key={itin}
                          className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0"
                        >
                          <span className="text-slate-700 truncate max-w-[280px]" title={itin}>
                            {itin}
                          </span>
                          <span className="font-bold text-[#005596]">{count} viagens</span>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="p-3 pb-2 border-b border-slate-100">
                    <CardTitle className="text-xs font-bold uppercase text-slate-700">
                      Distribuição por Tipo de Veículo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-xs">
                    {Object.entries(op.distributionByVehicleType).map(([vt, count]) => (
                      <div
                        key={vt}
                        className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0"
                      >
                        <span className="text-slate-700">{vt}</span>
                        <span className="font-bold text-slate-900">{count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Aba Pesagem */}
            <TabsContent value="pesagem" className="space-y-4 pt-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Peso Bruto Total
                  </span>
                  <div className="text-base font-black text-slate-900 mt-1">
                    {w.totalGrossTon.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t
                  </div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Tara Total
                  </span>
                  <div className="text-base font-black text-slate-900 mt-1">
                    {w.totalTareTon.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t
                  </div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Peso Líquido Total
                  </span>
                  <div className="text-base font-black text-slate-900 mt-1">
                    {w.totalNetTon.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t
                  </div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Peso NF Total
                  </span>
                  <div className="text-base font-black text-slate-900 mt-1">
                    {w.totalNfTon.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t
                  </div>
                </div>
              </div>

              {/* Status de Balança & Motivos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="p-3 pb-2 border-b border-slate-100">
                    <CardTitle className="text-xs font-bold uppercase text-slate-700">
                      Aferição na Balança Rodoviária
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600">Com registro de balança</span>
                      <span className="font-bold text-emerald-700">{w.withScaleCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600">Sem pesagem vinculada</span>
                      <span className="font-bold text-amber-600">{w.withoutScaleCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">Divergência média percentual</span>
                      <span className="font-bold text-slate-900">{formatPercent(w.avgDiffPct, 2)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="p-3 pb-2 border-b border-slate-100">
                    <CardTitle className="text-xs font-bold uppercase text-slate-700">
                      Motivos / Classificações de Balança
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-1.5 text-xs">
                    {Object.entries(w.scaleReasonsBreakdown).map(([reason, count]) => (
                      <div
                        key={reason}
                        className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0"
                      >
                        <span className="text-slate-700 truncate max-w-[280px]" title={reason}>
                          {reason}
                        </span>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Tabela de Outliers de Pesagem */}
              {w.anomalies.length > 0 && (
                <div className="bg-white border border-amber-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Divergências de Pesagem Detectadas pela IA (Outliers Relativos)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                          <th className="p-2">Transporte</th>
                          <th className="p-2">Placa</th>
                          <th className="p-2">Itinerário</th>
                          <th className="p-2 text-right">Peso Líq.</th>
                          <th className="p-2 text-right">Peso NF</th>
                          <th className="p-2 text-right">Diferença (t)</th>
                          <th className="p-2 text-right">Diferença (%)</th>
                          <th className="p-2">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {w.anomalies.map((anom, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                            onClick={() => onDrillDownTransport?.(anom.transportNumber)}
                          >
                            <td className="p-2 font-mono font-bold text-[#005596]">
                              {anom.transportNumber}
                            </td>
                            <td className="p-2 font-mono">{anom.plate}</td>
                            <td className="p-2 truncate max-w-[180px]">{anom.itinerary}</td>
                            <td className="p-2 text-right">
                              {anom.netWeight?.toLocaleString('pt-BR', {
                                minimumFractionDigits: 3,
                              })}{' '}
                              t
                            </td>
                            <td className="p-2 text-right">
                              {anom.nfWeight?.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}{' '}
                              t
                            </td>
                            <td className="p-2 text-right font-bold text-amber-700">
                              {anom.diffTon > 0 ? `+${anom.diffTon}` : anom.diffTon} t
                            </td>
                            <td className="p-2 text-right font-bold text-amber-700">
                              {formatPercent(anom.diffPct, 2)}
                            </td>
                            <td className="p-2 truncate max-w-[180px] text-slate-500">
                              {anom.reason || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Aba Tempos */}
            <TabsContent value="tempos" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Tempo Médio Pátio (Dwell)
                  </span>
                  <div className="text-lg font-black text-slate-900 mt-1">
                    {t.avgTotalDwellMin} min
                  </div>
                  <span className="text-[9px] text-slate-400">Entrada até saída final</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Tempo Médio Carregamento
                  </span>
                  <div className="text-lg font-black text-[#005596] mt-1">
                    {t.avgLoadingTimeMin} min
                  </div>
                  <span className="text-[9px] text-slate-400">Coleta e amarração física</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Principal Gargalo Apurado
                  </span>
                  <div className="text-sm font-black text-rose-700 mt-1 truncate">
                    {t.topBottleneckCenter
                      ? `Centro ${t.topBottleneckCenter} (${t.byCenter[t.topBottleneckCenter]?.avgDwell} min)`
                      : 'Nenhum gargalo identificado'}
                  </div>
                  <span className="text-[9px] text-slate-400">Maior média de permanência</span>
                </div>
              </div>

              {/* Tempos Médios por Centro e Itinerário */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="p-3 pb-2 border-b border-slate-100">
                    <CardTitle className="text-xs font-bold uppercase text-slate-700">
                      Tempo Médio por Centro Expedidor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-xs">
                    {Object.entries(t.byCenter).map(([c, val]) => (
                      <div
                        key={c}
                        className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0"
                      >
                        <span className="text-slate-700 font-medium">{c}</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">{val.avgDwell} min total</span>
                          <span className="text-[10px] text-slate-500 block">
                            ({val.avgLoading} min carreg.)
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="p-3 pb-2 border-b border-slate-100">
                    <CardTitle className="text-xs font-bold uppercase text-slate-700">
                      Horários com Maior Concentração de Expedição
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-xs">
                    {t.busiestHours.length > 0 ? (
                      t.busiestHours.map((h) => (
                        <div
                          key={h.hour}
                          className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0"
                        >
                          <span className="text-slate-700 font-mono">{h.hour}</span>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {h.count} liberação(ões)
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic">Horários não especificados.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Aba Financeiro */}
            <TabsContent value="financeiro" className="space-y-4 pt-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Custo Total Contratado
                  </span>
                  <div className="text-base font-black text-slate-900 mt-1">
                    {formatCurrency(f.totalCost)}
                  </div>
                  <span className="text-[9px] text-slate-400">
                    Frete ({formatCurrency(f.totalFreight)}) + Pedágio (
                    {formatCurrency(f.totalToll)})
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Custo por Tonelada (R$/t)
                  </span>
                  <div className="text-base font-black text-[#005596] mt-1">
                    {f.sufficientDataForCostPerTon && f.avgCostPerTon !== null
                      ? formatCurrency(f.avgCostPerTon)
                      : 'Dados insuficientes para esta análise.'}
                  </div>
                  <span className="text-[9px] text-slate-400">Total custo / peso líq.</span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Custo por Km (R$/km)
                  </span>
                  <div className="text-base font-black text-slate-900 mt-1">
                    {f.sufficientDataForCostPerKm && f.avgCostPerKm !== null
                      ? formatCurrency(f.avgCostPerKm)
                      : 'Dados insuficientes para esta análise.'}
                  </div>
                  <span className="text-[9px] text-slate-400">Total custo / distância</span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Baixa Ocupação (&lt;70%)
                  </span>
                  <div
                    className={`text-base font-black mt-1 ${
                      f.lowOccupancyCount > 0 ? 'text-amber-600' : 'text-slate-900'
                    }`}
                  >
                    {f.lowOccupancyCount} transporte(s)
                  </div>
                  <span className="text-[9px] text-slate-400">Potencial de economia</span>
                </div>
              </div>

              {/* R$/t por Itinerário */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="p-3 pb-2 border-b border-slate-100">
                    <CardTitle className="text-xs font-bold uppercase text-slate-700">
                      Custo Médio por Tonelada por Itinerário
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-xs">
                    {f.highCostItineraries.length > 0 ? (
                      f.highCostItineraries.slice(0, 5).map((it) => (
                        <div
                          key={it.itinerary}
                          className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0"
                        >
                          <span className="text-slate-700 font-medium">{it.itinerary}</span>
                          <span className="font-bold text-[#005596]">
                            {formatCurrency(it.costPerTon)} / t
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic">
                        Dados insuficientes para esta análise.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="p-3 pb-2 border-b border-slate-100">
                    <CardTitle className="text-xs font-bold uppercase text-slate-700">
                      Veículos com Ocupação Inferior à Capacidade
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-xs">
                    {f.lowUtilizationVehicles.length > 0 ? (
                      f.lowUtilizationVehicles.slice(0, 5).map((v) => (
                        <div
                          key={v.plate}
                          className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0"
                        >
                          <div>
                            <span className="font-mono font-bold text-slate-800">{v.plate}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {v.vehicleType}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-300 text-amber-800 bg-amber-50"
                          >
                            {v.avgOccupancy}% ocupação
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-700 py-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Todos os veículos operaram dentro da taxa ideal de ocupação.</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* 4. Pontos de Atenção & Sugestões de Atuação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-sky-600" />
                  Pontos de Atenção Identificados
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                {analysis.attentionPoints.length > 0 ? (
                  analysis.attentionPoints.map((pt, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-600 mt-1.5 flex-shrink-0" />
                      <span>{pt}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">Nenhum ponto de atenção crítico.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Sugestões de Atuação Consultiva
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                {analysis.actionSuggestions.map((sug, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                    <span>{sug}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px]">
            Auditoria registrada: Consulta baseada em <strong>{analysis.filteredCount}</strong>{' '}
            registros operacionais.
          </span>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs h-8 px-4"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
