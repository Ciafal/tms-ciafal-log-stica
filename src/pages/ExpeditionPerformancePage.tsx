import React, { useState, useEffect, useMemo } from 'react'
import {
  Clock,
  Activity,
  AlertOctagon,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Truck,
  CheckCircle2,
  FileText,
  BarChart2,
  Sliders,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import {
  calculateMilestoneIntervals,
  aggregateExpeditionPerformance,
  generateExpeditionAiImprovementProposals,
  ExpeditionMilestoneRecord,
} from '@/domain/expeditionEngine'

export const ExpeditionPerformancePage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [milestones, setMilestones] = useState<ExpeditionMilestoneRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const data = await TmsService.getExpeditionMilestones()
      setMilestones(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar marcos de expedição',
        description: err?.message || 'Falha ao buscar dados de pátio.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const summary = useMemo(() => {
    return aggregateExpeditionPerformance(milestones)
  }, [milestones])

  const aiProposals = useMemo(() => {
    return generateExpeditionAiImprovementProposals(summary)
  }, [summary])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Performance da Expedição & Marcos T0–T10
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              LEAD TIME & GARGALOS
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Medição contínua desde a entrada do caminhão (T0) até a saída faturada (T10), com
            apuração de gargalos e P90.
          </p>
        </div>

        <Button onClick={fetchData} variant="outline" size="sm" className="text-xs h-8">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Pátio
        </Button>
      </div>

      {/* KPI Cards — Marcos & Lead Times */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Lead Time Médio</div>
            <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
              {summary.leadTimeMedioMin} min
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {(summary.leadTimeMedioMin / 60).toFixed(1)} horas / caminhão
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Mediana (T10-T0)</div>
            <div className="text-lg font-black text-slate-800 font-mono mt-0.5">
              {summary.leadTimeMedianaMin} min
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Tempo típico de pátio</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Percentil 90 (P90)</div>
            <div className="text-lg font-black text-amber-600 font-mono mt-0.5">
              {summary.leadTimeP90Min} min
            </div>
            <div className="text-[10px] text-amber-500 mt-1">90% saem antes desse tempo</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Aderência à Meta</div>
            <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
              {summary.pctDentroMeta}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Meta: ≤ {summary.metaLeadTimeMin} min (4h)
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Gargalo Principal</div>
            <div className="text-xs font-black text-rose-700 truncate mt-1">
              {summary.gargaloMaisFrequente}
            </div>
            <div className="text-[10px] text-rose-500 mt-1">
              Espera média: {summary.tempoEsperaDocaMedioMin} min
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Marcos e Decomposição de Lead Time */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase text-slate-800">
                Acompanhamento Individual de Veículos ({milestones.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="p-2.5">Carga / Placa</th>
                    <th className="p-2.5">Motorista</th>
                    <th className="p-2.5 text-right">T0 Entrada</th>
                    <th className="p-2.5 text-right">T5 Início</th>
                    <th className="p-2.5 text-right">T8 Faturado</th>
                    <th className="p-2.5 text-right">T10 Saída</th>
                    <th className="p-2.5 text-right">Lead Time Total</th>
                    <th className="p-2.5">Gargalo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {milestones.map((m, idx) => {
                    const intervals = calculateMilestoneIntervals(m)
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">
                          {m.cargo_id}
                          <div className="text-[10px] text-slate-500">{m.vehicle_plate}</div>
                        </td>
                        <td className="p-2.5 font-sans">{m.driver_name || 'Motorista'}</td>
                        <td className="p-2.5 text-right text-slate-600">
                          {m.t0_entrada
                            ? new Date(m.t0_entrada).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="p-2.5 text-right text-slate-600">
                          {m.t5_inicio_carregamento
                            ? new Date(m.t5_inicio_carregamento).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="p-2.5 text-right text-slate-600">
                          {m.t8_faturamento
                            ? new Date(m.t8_faturamento).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="p-2.5 text-right text-slate-600">
                          {m.t10_saida
                            ? new Date(m.t10_saida).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          {intervals.t10_t0_lead_time_total_min} min
                        </td>
                        <td className="p-2.5 font-sans">
                          <Badge
                            variant="outline"
                            className="text-[9px] border-amber-400 text-amber-800 bg-amber-50"
                          >
                            {intervals.gargaloPrincipal} ({intervals.gargaloDuracaoMin}m)
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Painel de Recomendações e Melhoria Contínua IA */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-sky-50/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  Propostas de Otimização IA
                </CardTitle>
                <Badge className="bg-[#005596] text-white text-[9px]">Sem Auto-Execução</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-3 text-xs">
              {aiProposals.map((p, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <strong className="text-slate-900 text-[11px]">{p.problema}</strong>
                    <Badge className="bg-amber-600 text-white text-[8px]">{p.prioridade}</Badge>
                  </div>
                  <div className="text-[10px] text-slate-600">
                    <strong>Evidência:</strong> {p.evidencia}
                  </div>
                  <div className="text-[10px] text-purple-700 bg-purple-50 p-1.5 rounded border border-purple-100 italic">
                    {p.hipotese}
                  </div>
                  <div className="text-[10px] text-slate-700">
                    <strong>Ação Proposta:</strong> {p.acaoProposta}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-200">
                    <span>Resp: {p.responsavelSugerido}</span>
                    <span className="text-emerald-600 font-bold">{p.resultadoEsperado}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
export default ExpeditionPerformancePage
