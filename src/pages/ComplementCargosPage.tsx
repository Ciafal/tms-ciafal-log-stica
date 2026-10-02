import React, { useState, useEffect } from 'react'
import {
  Layers,
  Sparkles,
  Send,
  Building,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Truck,
  Package,
  Users,
  Search,
  ChevronRight,
  TrendingUp,
  HelpCircle,
  Filter,
  Check,
  X,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { tmsService } from '@/services/tmsService'
import { formatWeight } from '@/lib/utils'
import {
  LoadComplementOpportunityEntity,
  LoadComplementCandidateEntity,
  CommercialOpportunityStatus,
} from '@/domain/rules'

export const ComplementCargosPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [opportunities, setOpportunities] = useState<LoadComplementOpportunityEntity[]>([])
  const [candidatesMap, setCandidatesMap] = useState<
    Record<string, LoadComplementCandidateEntity[]>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'ativas' | 'excecoes' | 'todas'>('ativas')

  // Modais de detalhamento e explicabilidade da IA
  const [selectedOpp, setSelectedOpp] = useState<LoadComplementOpportunityEntity | null>(null)
  const [selectedCandidateExplanation, setSelectedCandidateExplanation] =
    useState<LoadComplementCandidateEntity | null>(null)
  const [isSendingToCommercial, setIsSendingToCommercial] = useState(false)
  const [statusUpdateOpp, setStatusUpdateOpp] = useState<LoadComplementOpportunityEntity | null>(
    null,
  )
  const [newStatusSelected, setNewStatusSelected] =
    useState<CommercialOpportunityStatus>('Em análise comercial')
  const [statusNotes, setStatusNotes] = useState('')

  // Modal para Simulação de Correlação Automática com Novo Pedido SAP
  const [isSimulateOrderModalOpen, setIsSimulateOrderModalOpen] = useState(false)
  const [targetOppForOrder, setTargetOppForOrder] =
    useState<LoadComplementOpportunityEntity | null>(null)
  const [simulatedSapOrders, setSimulatedSapOrders] = useState<any[]>([])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [opps, sapOrders] = await Promise.all([
        tmsService.getLoadComplementOpportunities(),
        tmsService.getSapSalesOrders(),
      ])
      setOpportunities(opps)
      setSimulatedSapOrders(sapOrders || [])

      // Carregar candidatos de cada oportunidade
      const candMap: Record<string, LoadComplementCandidateEntity[]> = {}
      for (const opp of opps.slice(0, 15)) {
        try {
          const list = await tmsService.getLoadComplementCandidates(opp.opportunity_code)
          candMap[opp.opportunity_code] = list
        } catch {
          /* ignore */
        }
      }
      setCandidatesMap(candMap)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar oportunidades',
        description: err?.message || 'Falha ao buscar central de oportunidades.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Ação Comercial: Enviar para Comercial / CRM 360°
  const handleSendToCommercial = async () => {
    if (!selectedOpp) return
    setIsSendingToCommercial(true)
    try {
      const ok = await tmsService.sendLoadComplementToCommercial(
        selectedOpp.id,
        user?.email || 'operador@ciafal.com.br',
        user?.name || 'Operador Logístico CIAFAL',
      )
      if (ok) {
        toast({
          title: 'Demanda Enviada ao Comercial / CRM 360°',
          description: `Oportunidade da proposta ${selectedOpp.load_proposal_id} despachada para atuação comercial.`,
        })
        setSelectedOpp(null)
        fetchData()
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha no despacho',
          description: 'Não foi possível enviar a demanda para o comercial.',
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no envio',
        description: err?.message || 'Erro inesperado.',
      })
    } finally {
      setIsSendingToCommercial(false)
    }
  }

  // Atualização de Status Comercial
  const handleUpdateStatus = async () => {
    if (!statusUpdateOpp) return
    try {
      const ok = await tmsService.updateCommercialOpportunityStatus(
        statusUpdateOpp.id,
        newStatusSelected,
        user?.email || 'operador@ciafal.com.br',
        user?.name || 'Operador Logístico',
        statusNotes,
      )
      if (ok) {
        toast({
          title: 'Status Comercial Atualizado',
          description: `Oportunidade alterada para "${newStatusSelected}".`,
        })
        setStatusUpdateOpp(null)
        setStatusNotes('')
        fetchData()
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
        description: err?.message,
      })
    }
  }

  // Correlação Automática de Novo Pedido SAP
  const handleCorrelateSapOrder = async (orderId: string) => {
    try {
      const res = await tmsService.correlateSapOrderWithComplement(
        orderId,
        user?.email || 'operador@ciafal.com.br',
        user?.name || 'Operador Logístico',
      )
      if (res.correlated) {
        toast({
          title: 'Complemento comercial incorporado com sucesso.',
          description: res.message,
        })
        setIsSimulateOrderModalOpen(false)
        fetchData()
      } else {
        toast({
          variant: 'destructive',
          title: 'Não correlacionado',
          description: res.message,
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na correlação SAP',
        description: err?.message,
      })
    }
  }

  // Filtragem
  const filteredOpps = opportunities.filter((opp) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      !q ||
      opp.opportunity_code.toLowerCase().includes(q) ||
      opp.load_proposal_id.toLowerCase().includes(q) ||
      opp.itinerary_id.toLowerCase().includes(q) ||
      (opp.customer_name && opp.customer_name.toLowerCase().includes(q)) ||
      (opp.material_description && opp.material_description.toLowerCase().includes(q))

    if (!matchesSearch) return false

    if (activeTab === 'ativas') {
      return (
        opp.commercial_status !== 'Associado à carga' &&
        opp.commercial_status !== 'Descartado' &&
        opp.commercial_status !== 'Expirado'
      )
    }
    if (activeTab === 'excecoes') {
      return opp.credit_status?.includes('Bloqueado') || opp.stock_status?.includes('Indisponível')
    }
    return true
  })

  return (
    <div className="space-y-4 pb-16">
      {/* HEADER DA CENTRAL DE OPORTUNIDADES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Complemento de Cargas — Central de Oportunidades Comerciais
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              OPORTUNIDADE COMERCIAL
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cruzamento determinístico: itinerário programado + clientes elegíveis + histórico real +
            crédito + estoque DP34/PCP + capacidade residual.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="text-xs h-8"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar Central
          </Button>
        </div>
      </div>

      {/* BANNER INSTITUCIONAL CIAFAL */}
      <div className="bg-[#005596]/10 border border-[#005596]/30 rounded-xl p-4 text-xs text-[#005596] dark:text-sky-300 space-y-1">
        <div className="font-bold flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-[#005596]" />
          <span>MOTOR INTEGRADO DE RECOMENDAÇÃO (ANTI-ALUCINAÇÃO)</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
          Todas as oportunidades nascem automaticamente das programações do{' '}
          <strong>Roteirizador & Simulador</strong>. A IA analisa histórico de compras reais e
          disponibilidade em estoque/PCP, nunca inserindo pedido manual na carga — a venda nasce no
          SAP e o TMS correlaciona automaticamente via RFC/BAPI.
        </p>
      </div>

      {/* BARRA DE FILTROS & ABAS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(val: any) => setActiveTab(val)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="ativas" className="text-xs">
              Ativas (
              {
                opportunities.filter(
                  (o) =>
                    o.commercial_status !== 'Associado à carga' &&
                    o.commercial_status !== 'Descartado',
                ).length
              }
              )
            </TabsTrigger>
            <TabsTrigger value="excecoes" className="text-xs">
              Exceções & Bloqueios
            </TabsTrigger>
            <TabsTrigger value="todas" className="text-xs">
              Todas ({opportunities.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Buscar por proposta, itinerário, cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8 bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      {/* GRID DE CARGAS E OPORTUNIDADES */}
      {filteredOpps.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm">
          <CardContent className="p-10 text-center text-slate-400 text-xs">
            Nenhuma oportunidade de complemento encontrada para os filtros atuais.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOpps.map((opp) => {
            const candidates = candidatesMap[opp.opportunity_code] || []
            const primaryCandidates = candidates.filter((c) => !c.is_exception)
            const exceptionCandidates = candidates.filter((c) => c.is_exception)

            return (
              <Card
                key={opp.id}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
              >
                <div className="h-1.5 w-full bg-[#005596]" />
                <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                          PROPOSTA TMS {opp.load_proposal_id}
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] bg-slate-50 font-mono">
                          Itinerário: {opp.itinerary_id}
                        </Badge>
                        <Badge className="bg-amber-600 text-white text-[10px]">
                          OPORTUNIDADE COMERCIAL
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-slate-500 mt-1">
                        Saída prevista: <strong>{opp.planned_dispatch_date}</strong> • Veículo:{' '}
                        {opp.vehicle_type || 'Carreta 5 Eixos'} (
                        {(opp.vehicle_capacity_kg / 1000).toFixed(1)} t)
                      </CardDescription>
                    </div>

                    <Badge
                      className={`text-[10px] font-bold ${
                        opp.commercial_status === 'Nova oportunidade'
                          ? 'bg-blue-600 text-white'
                          : opp.commercial_status === 'Em análise comercial'
                            ? 'bg-amber-600 text-white'
                            : opp.commercial_status === 'Associado à carga'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-600 text-white'
                      }`}
                    >
                      {opp.commercial_status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs">
                  {/* METRICAS EXATAS CONFORME ESPECIFICADO PELO USUÁRIO */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                        Programado
                      </span>
                      <strong className="text-slate-900 dark:text-slate-100 font-mono text-sm">
                        {(opp.current_weight_kg / 1000).toFixed(1)} t
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                        Ocupação Atual
                      </span>
                      <strong className="text-blue-700 font-mono text-sm">
                        {opp.current_occupancy_pct}%
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                        Meta Máxima
                      </span>
                      <strong className="text-slate-900 dark:text-slate-100 font-mono text-sm">
                        {opp.maximum_occupancy_pct}%
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-amber-700 uppercase block font-semibold">
                        Complemento Necessário
                      </span>
                      <strong className="text-amber-700 font-mono text-sm font-black">
                        {(opp.missing_weight_kg / 1000).toFixed(1)} t
                      </strong>
                    </div>
                  </div>

                  {/* INDICADORES VISUAIS DE ADERÊNCIA */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          Aderência Logística:
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            opp.logistic_adherence === 'Alta'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}
                        >
                          {opp.logistic_adherence || 'Alta'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          Aderência Comercial:
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            opp.commercial_adherence === 'Alta'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}
                        >
                          {opp.commercial_adherence || 'Alta'}
                        </Badge>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[11px] h-6 text-indigo-700 hover:text-indigo-800"
                      onClick={() => {
                        setSelectedOpp(opp)
                      }}
                    >
                      <HelpCircle className="w-3 h-3 mr-1" />
                      Por que esta sugestão?
                    </Button>
                  </div>

                  {/* CLIENTES E PRODUTOS RECOMENDADOS (RANKING COMBINADO) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#005596]" />
                        Clientes Comercialmente Elegíveis ({primaryCandidates.length}):
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Ordenados por Ranking de Score
                      </span>
                    </div>

                    {primaryCandidates.length === 0 ? (
                      <div className="text-[11px] text-slate-500 italic p-2 bg-slate-50 rounded">
                        Identificando clientes elegíveis com histórico e crédito disponível na
                        rota...
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {primaryCandidates.slice(0, 3).map((cand) => (
                          <div
                            key={cand.customer_code}
                            className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {cand.customer_name} ({cand.customer_code})
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] ${
                                    cand.credit_status === 'Crédito OK'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                      : 'bg-rose-50 text-rose-700 border-rose-300'
                                  }`}
                                >
                                  {cand.credit_status}
                                </Badge>
                                <span className="font-mono font-bold text-indigo-700">
                                  Score: {cand.ranking_score}/100
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-400 text-[10px]">
                              <span>
                                Produto habitual:{' '}
                                <strong>{cand.material_description || cand.material_code}</strong>
                              </span>
                              <span className="text-right">
                                Compra média:{' '}
                                <strong>
                                  {(cand.historical_avg_qty_kg
                                    ? cand.historical_avg_qty_kg / 1000
                                    : 5
                                  ).toFixed(1)}{' '}
                                  t
                                </strong>
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                              <span>
                                Estoque previsto: <strong>{cand.stock_status}</strong> (
                                {(cand.stock_available_kg
                                  ? cand.stock_available_kg / 1000
                                  : 8.3
                                ).toFixed(1)}{' '}
                                t)
                              </span>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-5 p-0 text-[10px] text-indigo-600"
                                onClick={() => setSelectedCandidateExplanation(cand)}
                              >
                                Ver justificativa
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* BLOCO DE EXCEÇÕES (Crédito ou Estoque) */}
                  {exceptionCandidates.length > 0 && (
                    <div className="border border-rose-200 bg-rose-50/40 rounded p-2 text-[11px] space-y-1">
                      <span className="font-bold text-rose-800 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        Clientes em Exceção ({exceptionCandidates.length}):
                      </span>
                      <div className="space-y-1 text-[10px] text-slate-600">
                        {exceptionCandidates.slice(0, 2).map((exc) => (
                          <div key={exc.customer_code} className="flex justify-between">
                            <span>{exc.customer_name}:</span>
                            <strong className="text-rose-700">{exc.exception_reason}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {opp.ai_recommendation && (
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded text-[11px] text-slate-700 dark:text-slate-300 border">
                      <span className="font-bold block text-slate-800 dark:text-slate-200 mb-0.5">
                        Diagnóstico Analítico do TMS:
                      </span>
                      {opp.ai_recommendation}
                    </div>
                  )}
                </CardContent>

                {/* AÇÕES DA OPORTUNIDADE */}
                <CardFooter className="p-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => {
                        setStatusUpdateOpp(opp)
                        setNewStatusSelected(opp.commercial_status)
                      }}
                    >
                      Alterar Status
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 text-emerald-700 border-emerald-300"
                      onClick={() => {
                        setTargetOppForOrder(opp)
                        setIsSimulateOrderModalOpen(true)
                      }}
                    >
                      Correlacionar Pedido SAP
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    className="bg-[#005596] hover:bg-[#004478] text-white text-xs h-8 font-semibold shadow-sm"
                    onClick={() => {
                      setSelectedOpp(opp)
                    }}
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Enviar para Comercial
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* MODAL "POR QUE ESTA SUGESTÃO?" / ENVIAR AO COMERCIAL */}
      <Dialog open={Boolean(selectedOpp)} onOpenChange={(open) => !open && setSelectedOpp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-[#005596]">
              <Sparkles className="w-4 h-4 text-[#005596]" />
              Demanda de Complemento Comercial — Proposta {selectedOpp?.load_proposal_id}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Detalhamento de elegibilidade e critérios auditados para envio ao CRM 360°.
            </DialogDescription>
          </DialogHeader>

          {selectedOpp && (
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>Itinerário SAP:</span>
                  <span className="font-mono">{selectedOpp.itinerary_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Saída Prevista:</span>
                  <span>{selectedOpp.planned_dispatch_date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tonelagem Disponível:</span>
                  <strong className="text-amber-700 font-mono">
                    {formatWeight(selectedOpp.missing_weight_kg, { unit: 'kg' })}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Cliente Sugerido:</span>
                  <span className="font-semibold">{selectedOpp.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Produto Recomendado:</span>
                  <span>{selectedOpp.material_description || selectedOpp.material_id}</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded text-[11px] text-slate-700 space-y-1">
                <span className="font-bold text-indigo-900 block">
                  Fatores Considerados (Anti-alucinação):
                </span>
                <p>• Pertence ao mesmo itinerário SAP sem desvio logístico inviável.</p>
                <p>• Situação financeira verificada via SAP RFC: {selectedOpp.credit_status}.</p>
                <p>• Previsão física de estoque confirmada antes da saída.</p>
                <p>• Veículo compatível com restrições de descarga do cliente.</p>
              </div>

              <p className="text-[11px] text-slate-500">
                Ao confirmar, a demanda será registrada vinculada à proposta original e encaminhada
                para atuação do representante comercial.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedOpp(null)}
              disabled={isSendingToCommercial}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-[#005596] hover:bg-[#004478] text-white"
              onClick={handleSendToCommercial}
              disabled={isSendingToCommercial}
            >
              {isSendingToCommercial ? 'Enviando...' : 'Confirmar Envio ao Comercial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL JUSTIFICATIVA INDIVIDUAL DO CANDIDATO */}
      <Dialog
        open={Boolean(selectedCandidateExplanation)}
        onOpenChange={(open) => !open && setSelectedCandidateExplanation(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building className="w-4 h-4 text-[#005596]" />
              Justificativa do Cliente: {selectedCandidateExplanation?.customer_name}
            </DialogTitle>
          </DialogHeader>

          {selectedCandidateExplanation && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded border space-y-1.5">
                <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                  {selectedCandidateExplanation.recommendation_rationale}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 border rounded">
                  <span className="text-slate-400 block text-[10px]">Crédito no SAP</span>
                  <strong className="text-emerald-700">
                    {selectedCandidateExplanation.credit_status}
                  </strong>
                </div>
                <div className="p-2 border rounded">
                  <span className="text-slate-400 block text-[10px]">Estoque / PCP</span>
                  <strong className="text-blue-700">
                    {selectedCandidateExplanation.stock_status}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCandidateExplanation(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL ATUALIZAR STATUS COMERCIAL */}
      <Dialog
        open={Boolean(statusUpdateOpp)}
        onOpenChange={(open) => !open && setStatusUpdateOpp(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Atualizar Fluxo Comercial da Oportunidade
            </DialogTitle>
            <DialogDescription className="text-xs">
              Proposta {statusUpdateOpp?.load_proposal_id} • Registra usuário e data/hora para
              auditoria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <span className="text-[11px] font-semibold block mb-1">Novo Status:</span>
              <select
                value={newStatusSelected}
                onChange={(e) => setNewStatusSelected(e.target.value as any)}
                className="w-full h-9 border rounded p-2 text-xs bg-white dark:bg-slate-900"
              >
                <option value="Nova oportunidade">Nova oportunidade</option>
                <option value="Em análise comercial">Em análise comercial</option>
                <option value="Contato iniciado">Contato iniciado</option>
                <option value="Cliente interessado">Cliente interessado</option>
                <option value="Aguardando pedido SAP">Aguardando pedido SAP</option>
                <option value="Pedido criado">Pedido criado</option>
                <option value="Associado à carga">Associado à carga</option>
                <option value="Recusado pelo cliente">Recusado pelo cliente</option>
                <option value="Descartado">Descartado</option>
                <option value="Expirado">Expirado</option>
              </select>
            </div>

            <div>
              <span className="text-[11px] font-semibold block mb-1">
                Observações da Negociação:
              </span>
              <Input
                placeholder="Ex: Cliente aceitou antecipar compra de CA-50..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStatusUpdateOpp(null)}>
              Cancelar
            </Button>
            <Button size="sm" className="bg-[#005596] text-white" onClick={handleUpdateStatus}>
              Salvar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CORRELAÇÃO DE PEDIDO SAP COM CARGA */}
      <Dialog open={isSimulateOrderModalOpen} onOpenChange={setIsSimulateOrderModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Correlacionar Novo Pedido SAP à Carga {targetOppForOrder?.load_proposal_id}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Quando a venda nasce no SAP via RFC/BAPI, o TMS identifica a rota e incorpora à carga
              recalculando peso e ocupação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <span className="font-semibold text-slate-700 block">
              Pedidos da Carteira SAP no Itinerário {targetOppForOrder?.itinerary_id}:
            </span>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 uppercase font-semibold border-b text-[10px]">
                  <tr>
                    <th className="p-2">Pedido</th>
                    <th className="p-2">Cliente</th>
                    <th className="p-2 text-right">Peso (t)</th>
                    <th className="p-2">Crédito</th>
                    <th className="p-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[11px]">
                  {simulatedSapOrders
                    .filter(
                      (o) =>
                        !targetOppForOrder?.itinerary_id ||
                        o.itinerary_code === targetOppForOrder.itinerary_id ||
                        o.uf === 'MG' ||
                        o.uf === 'SP',
                    )
                    .slice(0, 6)
                    .map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50">
                        <td className="p-2 font-mono font-bold">{ord.order_number}</td>
                        <td className="p-2">{ord.customer_name}</td>
                        <td className="p-2 text-right font-mono font-bold">
                          {((ord.weight_kg || 5000) / 1000).toFixed(1)} t
                        </td>
                        <td className="p-2">
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-300"
                          >
                            {ord.credit_status || 'Liberado'}
                          </Badge>
                        </td>
                        <td className="p-2 text-right">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-6"
                            onClick={() => handleCorrelateSapOrder(ord.id)}
                          >
                            Associar à Carga
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsSimulateOrderModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ComplementCargosPage
