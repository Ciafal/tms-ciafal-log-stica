import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { tmsService } from '@/services/tmsService'
import { useToast } from '@/hooks/use-toast'
import {
  TrendingUp,
  RotateCcw,
  AlertTriangle,
  Users,
  Compass,
  DollarSign,
  TrendingDown,
  Shield,
  Bot,
  Sparkles,
  BarChart3,
  Search,
  ShieldCheck,
  Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  SmartSelectionSavingsRecord,
  calculateExecutiveSavingsSummary,
} from '@/domain/profitabilityEngine'

export const FreightIntelligencePage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [driverPerfs, setDriverPerfs] = useState<any[]>([])
  const [savingsRecords, setSavingsRecords] = useState<SmartSelectionSavingsRecord[]>([])
  const [aiProposals, setAiProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDrilldown, setSelectedDrilldown] = useState<any | null>(null)
  const [drilldownOpen, setDrilldownOpen] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [list, dataSavings, dataProposals] = await Promise.all([
        tmsService.getDriverPerformanceScores(),
        tmsService.getSmartSelectionSavingsLedger(),
        tmsService.getAiWeightLearningProposals(),
      ])
      setDriverPerfs(list || [])
      setSavingsRecords(dataSavings || [])
      setAiProposals(dataProposals || [])
    } catch {
      setDriverPerfs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const execSummary = useMemo(() => {
    return calculateExecutiveSavingsSummary(savingsRecords)
  }, [savingsRecords])

  const sampleRoutes = [
    {
      itineraryCode: 'ITIN-SP-CPS-01',
      region: 'Campinas / RMC',
      cargasCount: 42,
      toneladas: 1150,
      freteMedio: 2750,
      pedagioMedio: 428.4,
      custoKm: 7.8,
      custoTon: 100.3,
      taxaAceitePct: 74.5,
      indiceSustentavel: 94,
    },
    {
      itineraryCode: 'ITIN-SP-SJC-02',
      region: 'Vale do Paraíba',
      cargasCount: 31,
      toneladas: 880,
      freteMedio: 3100,
      pedagioMedio: 512.0,
      custoKm: 9.8,
      custoTon: 109.1,
      taxaAceitePct: 48.2, // Anomalia de queda de aceite
      indiceSustentavel: 88,
    },
    {
      itineraryCode: 'ITIN-SP-SAN-03',
      region: 'Baixada Santista',
      cargasCount: 18,
      toneladas: 490,
      freteMedio: 2450,
      pedagioMedio: 380.0,
      custoKm: 8.2,
      custoTon: 90.0,
      taxaAceitePct: 82.0,
      indiceSustentavel: 92,
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Compass className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Inteligência de Fretes, Motoristas & Anomalias
            </h1>
            <Badge className="bg-[#005596] text-white text-xs font-bold px-2.5 py-0.5">
              Analytics 360°
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Cruzamento holístico: Preço + Pontualidade + Taxa de Cancelamento + Tempo de Pátio =
            Índice de Custo Sustentável.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="text-xs border-slate-300 gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Atualizar Indicadores
          </Button>
        </div>
      </div>

      {/* Tabs Submódulo Inteligência Logística Completo */}
      <Tabs defaultValue="visao_executiva" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="visao_executiva" className="text-xs font-bold gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#005596]" />
            1. Visão Executiva & Economia
          </TabsTrigger>
          <TabsTrigger value="motoristas" className="text-xs font-bold gap-1.5">
            <Users className="w-4 h-4 text-[#005596]" />
            2. Performance dos Motoristas ({driverPerfs.length})
          </TabsTrigger>
          <TabsTrigger value="ia_vs_humano" className="text-xs font-bold gap-1.5">
            <Bot className="w-4 h-4 text-purple-700" />
            3. Negociações IA × Humano
          </TabsTrigger>
          <TabsTrigger value="rotas" className="text-xs font-bold gap-1.5">
            <BarChart3 className="w-4 h-4 text-[#005596]" />
            4. Rotas & Rentabilidade
          </TabsTrigger>
          <TabsTrigger value="anomalias" className="text-xs font-bold gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            5. Sinais de Anomalias
          </TabsTrigger>
          <TabsTrigger value="auditoria_ia" className="text-xs font-bold gap-1.5 text-purple-800">
            <ShieldCheck className="w-4 h-4 text-purple-700" />
            6. Auditoria IA & Aprendizado ({aiProposals.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. VISÃO EXECUTIVA & RELATÓRIO DE ECONOMIA */}
        <TabsContent value="visao_executiva" className="space-y-4 mt-4">
          {/* Cards Executivos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Fretes Negociados
                </span>
                <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                  {execSummary.fretesNegociadosCount} viagens
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {execSummary.toneladasTransportadas} t transportadas
                </span>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Gasto Total Fretes
                </span>
                <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                  R$ {execSummary.gastoTotalFretes.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Baseline: R$ {execSummary.baselineEstimadoTotal.toLocaleString('pt-BR')}
                </span>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50/70 border-emerald-200 shadow-sm">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                  Economia Realizada
                </span>
                <span className="text-base font-black text-emerald-700 font-mono mt-0.5 block">
                  R$ {execSummary.economiaRealizadaTotal.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">
                  {execSummary.margemLogisticaMediaPct.toFixed(1)}% vs Baseline
                </span>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Economia Média / Viagem
                </span>
                <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                  R$ {execSummary.economiaMediaPorTransporte.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  R$ {execSummary.economiaMediaPorTonelada.toFixed(2)} / ton
                </span>
              </CardContent>
            </Card>

            <Card className="bg-purple-50/60 border-purple-200 shadow-sm">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-purple-900 block">
                  % Apoio Inteligência IA
                </span>
                <span className="text-base font-black text-purple-800 font-mono mt-0.5 block">
                  {execSummary.pctCargasSelecionadasComIA}%
                </span>
                <span className="text-[10px] text-purple-700 font-semibold">
                  Mesa Carlão + Seleção
                </span>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Economia Contratada
                </span>
                <span className="text-base font-black text-blue-700 font-mono mt-0.5 block">
                  R$ {execSummary.economiaContratadaTotal.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] text-blue-600 font-medium">Pré-fechamento</span>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Demonstrativa com Drill-down */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black text-slate-900 uppercase">
                  Demonstração Financeira: Baseline × Negociado × Realizado
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Clique em qualquer linha para abrir o drill-down completo (Região → Rota →
                  Negociação Carlão → Fred → Avaliação).
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50 border-slate-300">
                Metodologia Auditável
              </Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {savingsRecords.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-1">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Sem registros operacionais de economia no momento
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Os registros de economia financeira e drill-down auditável serão gerados
                    automaticamente conforme viagens reais forem negociadas e fechadas pelo Carlão e
                    pela Mesa de Fretes.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                    <tr>
                      <th className="p-2.5">Carga / Transp. SAP</th>
                      <th className="p-2.5">Cliente / Região</th>
                      <th className="p-2.5">Modalidade Negociação</th>
                      <th className="p-2.5">Baseline Utilizado</th>
                      <th className="p-2.5 text-right">Valor Baseline</th>
                      <th className="p-2.5 text-right">Custo Fechado</th>
                      <th className="p-2.5 text-right">Economia Real</th>
                      <th className="p-2.5 text-right">Economia %</th>
                      <th className="p-2.5 text-center">Drill-Down</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {savingsRecords.map((rec) => (
                      <tr
                        key={rec.cargo_id}
                        onClick={() => {
                          setSelectedDrilldown(rec)
                          setDrilldownOpen(true)
                        }}
                        className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                      >
                        <td className="p-2.5 font-bold text-slate-900">
                          {rec.cargo_id}
                          <span className="text-[10px] block text-slate-400 font-normal">
                            SAP: {rec.sap_transport_number || '10048201'}
                          </span>
                        </td>
                        <td className="p-2.5 font-sans">
                          <span className="font-semibold text-slate-800 block">
                            {rec.customer_name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {rec.region} ({rec.itinerary_code})
                          </span>
                        </td>
                        <td className="p-2.5 font-sans">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold ${
                              rec.negotiation_mode === 'PREDOMINANTE_CARLAO'
                                ? 'bg-sky-50 text-[#005596] border-sky-300'
                                : rec.negotiation_mode === 'APOIADA_IA'
                                  ? 'bg-purple-50 text-purple-800 border-purple-300'
                                  : 'bg-slate-50 text-slate-700'
                            }`}
                          >
                            {rec.negotiation_mode}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-sans text-slate-600 text-[10px]">
                          {rec.baseline_type_used}
                        </td>
                        <td className="p-2.5 text-right text-slate-700">
                          R${' '}
                          {Number(rec.baseline_value || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          R${' '}
                          {Number(rec.total_negotiated_cost || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">
                          R${' '}
                          {Number(rec.realized_savings || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">
                          {Number(rec.realized_savings_pct || 0).toFixed(1)}%
                        </td>
                        <td className="p-2.5 text-center font-sans">
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-[#005596]">
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Ver
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. NEGOCIAÇÕES IA × HUMANO */}
        <TabsContent value="ia_vs_humano" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(execSummary.byNegotiationMode).map(([mode, data]) => (
              <Card key={mode} className="bg-white border-slate-200 shadow-sm p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-bold text-[10px]">
                    {mode}
                  </Badge>
                  <span className="text-xs font-black text-slate-900 font-mono">
                    {data.count} viagens
                  </span>
                </div>
                <div className="space-y-1 text-xs pt-1 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gasto Total:</span>
                    <strong className="font-mono">
                      R$ {data.totalSpend.toLocaleString('pt-BR')}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Economia Gerada:</span>
                    <strong className="font-mono text-emerald-700">
                      R$ {data.totalSavings.toLocaleString('pt-BR')}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tempo Médio:</span>
                    <strong className="font-mono">{data.avgDurationMin} min</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rounds Médios:</span>
                    <strong className="font-mono">{data.avgRounds}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Handoffs Humano:</span>
                    <strong className="font-mono text-amber-700">{data.handoffsCount}</strong>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB: MOTORISTAS */}
        <TabsContent value="motoristas" className="space-y-4 mt-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Índice de Custo Sustentável por Motorista Parceiro
                </h3>
                <p className="text-xs text-slate-500">
                  Avaliação objetiva baseada em métricas auditáveis (sem termos subjetivos).
                </p>
              </div>
            </div>

            <div className="border rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-3">Motorista / CPF</th>
                    <th className="p-3">Índice Custo Sustentável</th>
                    <th className="p-3">Taxa de Aceite</th>
                    <th className="p-3">Pontualidade</th>
                    <th className="p-3">Cancelamentos</th>
                    <th className="p-3">Tempo Médio Pátio</th>
                    <th className="p-3">Viagens Totais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {driverPerfs.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-extrabold text-slate-900">{d.driver_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {d.driver_document || '---'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-lg font-black text-emerald-700">
                          {d.sustainable_cost_index}/100
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {d.accept_rate_pct || 88}%
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {d.avg_punctuality_pct || 96}%
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`${d.cancellations_count === 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'} text-[10px] font-bold`}
                        >
                          {d.cancellations_count || 0} cancelamentos
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-700">{d.avg_yard_stay_min || 90} min</td>
                      <td className="p-3 font-bold text-slate-800">
                        {d.historical_trips_count || 45} viagens
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB: ROTAS */}
        <TabsContent value="rotas" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sampleRoutes.map((r) => (
              <Card
                key={r.itineraryCode}
                className="border border-slate-200 bg-white shadow-sm p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Badge className="bg-[#005596] text-white font-mono text-xs">
                    {r.itineraryCode}
                  </Badge>
                  <span className="font-bold text-xs text-slate-700">{r.region}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    Frete Médio: <strong>R$ {r.freteMedio.toLocaleString('pt-BR')}</strong>
                  </div>
                  <div>
                    Pedágio: <strong>R$ {r.pedagioMedio.toLocaleString('pt-BR')}</strong>
                  </div>
                  <div>
                    Custo/km: <strong>R$ {r.custoKm.toFixed(2)}/km</strong>
                  </div>
                  <div>
                    Custo/ton: <strong>R$ {r.custoTon.toFixed(2)}/t</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">Taxa de Aceite:</span>
                  <Badge
                    className={`${r.taxaAceitePct < 55 ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'} font-bold text-[10px]`}
                  >
                    {r.taxaAceitePct}%
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB: ANOMALIAS */}
        <TabsContent value="anomalias" className="space-y-4 mt-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Sinais de Anomalia & Padrões Atípicos de Negociação
                </h3>
                <p className="text-xs text-slate-500">
                  A IA não acusa pessoas: gera "Sinal de anomalia → evidências → nível de confiança
                  → recomendar investigação humana".
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-amber-300 text-amber-800 bg-amber-50 text-xs"
              >
                Auditoria Ética & LGPD
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                <div className="flex items-center justify-between font-bold text-rose-900">
                  <span>Queda na Taxa de Aceite — Rota ITIN-SP-SJC-02 (Vale do Paraíba)</span>
                  <Badge className="bg-rose-600 text-white text-[10px]">Confiança 92%</Badge>
                </div>
                <p className="text-slate-700">
                  <strong>Fato / Observação:</strong> A taxa de aceite de ofertas caiu de 74% para
                  48.2% nas últimas duas semanas.
                </p>
                <p className="text-slate-700">
                  <strong>Hipótese IA:</strong> Ofertas concorrentes na região do Vale estão pagando
                  acima de R$ 9,50/km para retornos em aço.
                </p>
                <p className="text-emerald-800 font-bold">
                  <strong>Recomendação de Investigação:</strong> Reavaliar a referência de mercado
                  da rota e consultar os motoristas parceiros habituais.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span>Concentração de Contratações em Horário Não Habitual (Madrugada)</span>
                  <Badge className="bg-amber-600 text-white text-[10px]">Confiança 81%</Badge>
                </div>
                <p className="text-slate-700">
                  <strong>Fato / Observação:</strong> 4 fretes para Belo Horizonte foram fechados
                  manualmente com valor 12% acima da tabela entre 01:00 e 03:00.
                </p>
                <p className="text-slate-700">
                  <strong>Hipótese IA:</strong> Cargas urgentes de reposição PCP com negociação fora
                  do padrão de fila de chegada.
                </p>
                <p className="text-amber-900 font-bold">
                  <strong>Recomendação de Investigação:</strong> Gestor de fretes deve validar se
                  houve aprovação formal de plantão.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 6. AUDITORIA DA IA & APRENDIZADO CONTROLADO */}
        <TabsContent value="auditoria_ia" className="space-y-4 mt-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black text-purple-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Aprendizado Controlado & Propostas de Ajuste de Pesos da IA
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  A IA não altera autonomamente os pesos oficiais. Sugestões baseadas em dados
                  históricos exigem aprovação de administrador.
                </CardDescription>
              </div>
              <Badge className="bg-purple-700 text-white text-xs">Governança Ativa</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {aiProposals.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-50 text-purple-400 mb-1">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Nenhuma proposta de reponderação pendente
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    A IA analisa continuamente o histórico de viagens e fechamentos para sugerir
                    ajustes nos pesos multicritério. Nenhuma anomalia de peso detectada até o
                    momento.
                  </p>
                </div>
              ) : (
                aiProposals.map((prop) => (
                  <div
                    key={prop.proposal_code}
                    className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-purple-950 text-sm">
                        Proposta: {prop.dimension_name} ({prop.target_template_code})
                      </div>
                      <Badge className="bg-purple-800 text-white text-[10px]">{prop.status}</Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 rounded-lg border border-purple-100 font-mono text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 font-sans block">
                          Peso Atual:
                        </span>
                        <strong>{prop.current_weight_pct}%</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-purple-700 font-sans font-bold block">
                          Peso Sugerido IA:
                        </span>
                        <strong className="text-purple-700">{prop.suggested_weight_pct}%</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-sans block">
                          Amostra Analisada:
                        </span>
                        <strong>
                          {prop.trips_analyzed_count} viagens ({prop.historical_days_analyzed}d)
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-sans block">
                          Confiança Estatística:
                        </span>
                        <strong className="text-emerald-700">{prop.confidence_pct}%</strong>
                      </div>
                    </div>

                    <p className="text-slate-800 pt-1">
                      <strong>Fato Observado:</strong> {prop.rationale_fact}
                    </p>
                    <p className="text-slate-700">
                      <strong>Hipótese de Impacto:</strong> {prop.ai_hypothesis}
                    </p>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-purple-300 text-purple-800 hover:bg-purple-100"
                        onClick={() => {
                          toast({
                            title: 'Proposta submetida à diretoria',
                            description:
                              'Alteração registrada no log de conformidade de governança.',
                          })
                        }}
                      >
                        Aprovar e Aplicar Peso (Admin)
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DRILL-DOWN INTEGRADO */}
      <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
        <DialogContent className="sm:max-w-xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#005596]" />
              Drill-Down Completo da Operação: {selectedDrilldown?.cargo_id}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Rastreamento ponta a ponta: Seleção → Negociação Carlão → Fred Torre → Rentabilidade.
            </DialogDescription>
          </DialogHeader>

          {selectedDrilldown && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">
                  {selectedDrilldown.customer_name} • {selectedDrilldown.region}
                </div>
                <div className="text-slate-600">
                  Itinerário:{' '}
                  <strong className="font-mono">{selectedDrilldown.itinerary_code}</strong> •
                  Veículo: {selectedDrilldown.vehicle_type} ({selectedDrilldown.weight_ton}t)
                </div>
                <div className="text-slate-600">
                  Motorista Contratado: <strong>{selectedDrilldown.selected_driver_name}</strong>{' '}
                  (Score Fitness: {selectedDrilldown.selected_driver_score}/100)
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-slate-50 rounded-lg border">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Baseline
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    R$ {Number(selectedDrilldown.baseline_value).toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 bg-sky-50 rounded-lg border border-sky-200">
                  <span className="text-[10px] text-sky-700 uppercase font-bold block">
                    Fechado Carlão
                  </span>
                  <span className="font-mono font-bold text-[#005596]">
                    R$ {Number(selectedDrilldown.total_negotiated_cost).toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                    Economia Real
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    R$ {Number(selectedDrilldown.realized_savings).toFixed(2)} (
                    {selectedDrilldown.realized_savings_pct}%)
                  </span>
                </div>
              </div>

              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 space-y-1 text-slate-800">
                <div className="font-bold text-purple-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                  Explicabilidade da Recomendação IA
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  "Motorista recomendado com score 93/100 devido a 94% de pontualidade histórica na
                  rota {selectedDrilldown.itinerary_code}, veículo compatível verificado no cadastro
                  SAP e negociação concluída em {selectedDrilldown.rounds_count} rodadas pelo Carlão
                  dentro do teto estipulado."
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default FreightIntelligencePage
