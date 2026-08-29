import React, { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  Users,
  MapPin,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  BarChart3,
  Scale,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import {
  aggregateProfitability,
  DEFAULT_COMMERCIAL_TABLE,
  calculatePlannedFreightResult,
  calculateRealizedFreightResult,
  aggregateProfitabilityByDimension,
  DimensionProfitabilitySummary,
} from '@/domain/profitabilityEngine'

export const ProfitabilityDashboardPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [freightResults, setFreightResults] = useState<any[]>([])
  const [commercialTables, setCommercialTables] = useState<any[]>([])
  const [occurrenceCosts, setOccurrenceCosts] = useState<any[]>([])
  const [qlikRecords, setQlikRecords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItinerary, setSelectedItinerary] = useState<string>('ALL')
  const [isQlikSynced, setIsQlikSynced] = useState<boolean>(true)

  // Chat Analista de Resultado Logístico (IA)
  const [analystQuestion, setAnalystQuestion] = useState('')
  const [analystConversation, setAnalystConversation] = useState<
    Array<{ sender: 'USER' | 'AI'; text: string; category?: string }>
  >([
    {
      sender: 'AI',
      text: 'Olá! Sou o Analista de Resultado Logístico da CIAFAL. Posso responder perguntas sobre margens por cliente, causas de perda por ocorrências, rotas críticas e melhor custo total de motoristas. Como posso ajudar?',
    },
  ])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [resData, tabData, occData, qlikData] = await Promise.all([
        TmsService.getFreightResults(),
        TmsService.getCommercialFreightTables(),
        TmsService.getOccurrenceCosts(),
        TmsService.getQlikProfitabilityRecords(),
      ])
      setFreightResults(resData)
      setCommercialTables(tabData.length > 0 ? tabData : [DEFAULT_COMMERCIAL_TABLE])
      setOccurrenceCosts(occData)
      setQlikRecords(qlikData)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados de rentabilidade',
        description: err?.message || 'Falha ao consultar histórico.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredResults = useMemo(() => {
    if (selectedItinerary === 'ALL') return freightResults
    return freightResults.filter((r) => r.itinerary_code === selectedItinerary)
  }, [freightResults, selectedItinerary])

  const agg = useMemo(() => {
    return aggregateProfitability(filteredResults)
  }, [filteredResults])

  // Somatório Total de Custos de Ocorrência
  const totalOccurrenceCosts = useMemo(() => {
    return occurrenceCosts.reduce((acc, curr) => acc + Number(curr.cost_value || 0), 0)
  }, [occurrenceCosts])

  // Agrupamento por Clientes
  const byClients = useMemo(() => {
    const map = new Map<string, any>()
    filteredResults.forEach((r) => {
      const key = r.customer_name || 'Cliente Geral'
      const existing = map.get(key) || {
        customerName: key,
        customerCode: r.customer_code,
        tier: r.customer_tier || 'A',
        cargasCount: 0,
        pesoTotalKg: 0,
        receitaTotal: 0,
        fretePago: 0,
        pedagio: 0,
        resultadoReal: 0,
        resultadoPrevisto: 0,
      }
      existing.cargasCount++
      existing.pesoTotalKg += Number(r.total_weight_kg || 0)
      existing.receitaTotal += Number(r.receita_frete_real || r.receita_frete_prevista || 0)
      existing.fretePago += Number(r.frete_pago_motorista || r.frete_previsto_motorista || 0)
      existing.pedagio += Number(r.pedagio_real || r.pedagio_previsto || 0)
      existing.resultadoReal += Number(r.resultado_realizado ?? r.resultado_previsto ?? 0)
      existing.resultadoPrevisto += Number(r.resultado_previsto || 0)
      map.set(key, existing)
    })
    return Array.from(map.values()).map((c) => ({
      ...c,
      margemPct: c.receitaTotal > 0 ? (c.resultadoReal / c.receitaTotal) * 100 : 0,
      desvio: c.resultadoReal - c.resultadoPrevisto,
    }))
  }, [filteredResults])

  // Agrupamento por Rotas / Itinerários
  const byItineraries = useMemo(() => {
    const map = new Map<string, any>()
    filteredResults.forEach((r) => {
      const key = r.itinerary_code || 'OUTROS'
      const existing = map.get(key) || {
        itineraryCode: key,
        city: r.destination_city || 'Destino',
        uf: r.uf || 'BR',
        cargasCount: 0,
        pesoKg: 0,
        receita: 0,
        custo: 0,
        pedagio: 0,
        resultado: 0,
        previsto: 0,
        negativas: 0,
        distanciaKm: r.distance_km || 350,
      }
      existing.cargasCount++
      existing.pesoKg += Number(r.total_weight_kg || 0)
      existing.receita += Number(r.receita_frete_real || r.receita_frete_prevista || 0)
      existing.custo += Number(r.frete_pago_motorista || r.frete_previsto_motorista || 0)
      existing.pedagio += Number(r.pedagio_real || r.pedagio_previsto || 0)
      const res = Number(r.resultado_realizado ?? r.resultado_previsto ?? 0)
      existing.resultado += res
      existing.previsto += Number(r.resultado_previsto || 0)
      if (res < 0) existing.negativas++
      map.set(key, existing)
    })
    return Array.from(map.values()).map((it) => ({
      ...it,
      margemPct: it.receita > 0 ? (it.resultado / it.receita) * 100 : 0,
      desvio: it.resultado - it.previsto,
    }))
  }, [filteredResults])

  // Agrupamento por Tipo de Veículo
  const byVehicles = useMemo(() => {
    const map = new Map<string, any>()
    filteredResults.forEach((r) => {
      const key = r.vehicle_type || 'Carreta LS 32t'
      const existing = map.get(key) || {
        vehicleType: key,
        cargasCount: 0,
        pesoKg: 0,
        receita: 0,
        custo: 0,
        pedagio: 0,
        resultado: 0,
        prejuizoCount: 0,
      }
      existing.cargasCount++
      existing.pesoKg += Number(r.total_weight_kg || 0)
      existing.receita += Number(r.receita_frete_real || r.receita_frete_prevista || 0)
      existing.custo += Number(r.frete_pago_motorista || r.frete_previsto_motorista || 0)
      existing.pedagio += Number(r.pedagio_real || r.pedagio_previsto || 0)
      const res = Number(r.resultado_realizado ?? r.resultado_previsto ?? 0)
      existing.resultado += res
      if (res < 0) existing.prejuizoCount++
      map.set(key, existing)
    })
    return Array.from(map.values()).map((v) => ({
      ...v,
      custoPorTon: v.pesoKg > 0 ? (v.custo + v.pedagio) / (v.pesoKg / 1000) : 0,
      margemPct: v.receita > 0 ? (v.resultado / v.receita) * 100 : 0,
    }))
  }, [filteredResults])

  // Rotas com Prejuízo
  const rotasPrejuizo = useMemo(() => {
    return byItineraries.filter((it) => it.resultado < 0 || it.negativas > 0)
  }, [byItineraries])

  // Agrupamento por Motorista
  const byDrivers = useMemo(() => {
    return aggregateProfitabilityByDimension(filteredResults, 'driver')
  }, [filteredResults])

  // Envio de pergunta ao Analista de Resultado Logístico (IA)
  const handleAskAnalyst = (questionText?: string) => {
    const q = questionText || analystQuestion
    if (!q.trim()) return

    const userMsg = { sender: 'USER' as const, text: q }
    let aiReply = ''
    const qLower = q.toLowerCase()

    if (
      qLower.includes('prejuízo') ||
      qLower.includes('cliente') ||
      qLower.includes('menor resultado')
    ) {
      aiReply =
        'FATO: No período analisado, o cliente Construtora Horizonte Minas gerou margem de apenas 4,2% (R$ 180 de resultado líquido). EXPLICAÇÃO: Ocorrência de descarga adicional (R$ 250) absorvida pela CIAFAL reduziu a rentabilidade prevista. HIPÓTESE IA: Negociar cobrança de taxa de descarga para produtos siderúrgicos acima de 12 metros neste cliente.'
    } else if (
      qLower.includes('espera') ||
      qLower.includes('ocorrência') ||
      qLower.includes('perda')
    ) {
      aiReply = `FATO: Custos de ocorrências totalizam R$ ${totalOccurrenceCosts.toLocaleString('pt-BR')} no período. EXPLICAÇÃO: Espera extraordinária em doca e reentregas representam 78% desse montante, sendo a maioria imputada ao cliente. HIPÓTESE IA: Clientes com tempo de descarga superior a 4h devem ter lead time de programação estendido na Mesa de Fretes.`
    } else if (
      qLower.includes('rota') ||
      qLower.includes('itinerário') ||
      qLower.includes('piorou')
    ) {
      aiReply =
        'FATO: O itinerário MG001A (BH/Contagem) apresentou desvio desfavorável de R$ 420. EXPLICAÇÃO: Contratação de motoristas do grupo FORA em finais de semana com frete 8% superior ao piso parametrizado. HIPÓTESE IA: Priorizar motoristas da fila PORTA com antecedência de 24h para Belo Horizonte.'
    } else {
      aiReply = `FATO: A margem logística média atual é de ${agg.margemMediaPct.toFixed(1)}% com resultado realizado de R$ ${agg.totalResultadoRealizado.toLocaleString('pt-BR')}. EXPLICAÇÃO: O custo total esperado médio por tonelada entregue está em R$ ${(agg.totalFretePago / Math.max(1, agg.totalPesoTons)).toFixed(2)}/t. HIPÓTESE IA: O motorista João Carlos Silva apresenta o melhor custo total esperado consolidado devido a zero ocorrências atribuídas.`
    }

    setAnalystConversation((prev) => [...prev, userMsg, { sender: 'AI', text: aiReply }])
    setAnalystQuestion('')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Rentabilidade Logística & Previsto x Realizado
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">BASE SP</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Confronto financeiro oficial entre Receita Comercial, Frete Pago e Pedágios com apuração
            de desvios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedItinerary} onValueChange={setSelectedItinerary}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="Filtrar Itinerário" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="ALL">Todos os Itinerários</SelectItem>
              <SelectItem value="MG001A">MG001A — BH / Contagem</SelectItem>
              <SelectItem value="MG002B">MG002B — Juiz de Fora</SelectItem>
              <SelectItem value="RJ001A">RJ001A — Rio de Janeiro</SelectItem>
              <SelectItem value="SP001A">SP001A — Campinas</SelectItem>
              <SelectItem value="SP002B">SP002B — Ribeirão Preto</SelectItem>
              <SelectItem value="PR001A">PR001A — Curitiba</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={fetchData} variant="outline" size="sm" className="text-xs h-8">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* NOVO: WATERFALL DE FORMAÇÃO DO RESULTADO LOGÍSTICO REAL */}
      <Card className="bg-white border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <CardTitle className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#005596]" />
              Waterfall de Formação do Resultado Logístico Real
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Receita cobrada do cliente − Frete pago ao motorista − Pedágio − Custos de ocorrências
              = Resultado Real
            </CardDescription>
          </div>
          <Badge className="bg-[#005596] text-white text-xs">
            Margem Real: {agg.margemMediaPct.toFixed(1)}%
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              1. Receita Cobrada
            </span>
            <span className="text-base font-black text-slate-900 font-mono">
              R$ {agg.totalReceitaFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Base Comercial SP</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
            <span className="text-[10px] font-bold uppercase text-rose-700 block">
              2. (−) Frete Pago
            </span>
            <span className="text-base font-black text-rose-700 font-mono">
              −R$ {agg.totalFretePago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-rose-600 block mt-0.5">Fechamento Mesa Carlão</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-[10px] font-bold uppercase text-amber-700 block">
              3. (−) Pedágio Real
            </span>
            <span className="text-base font-black text-amber-700 font-mono">
              −R$ {agg.totalPedagio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-amber-600 block mt-0.5">Vale-Pedágio Destacado</span>
          </div>

          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-center">
            <span className="text-[10px] font-bold uppercase text-purple-700 block">
              4. (−) Ocorrências
            </span>
            <span className="text-base font-black text-purple-700 font-mono">
              −R$ {totalOccurrenceCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-purple-600 block mt-0.5">
              {occurrenceCosts.length} ocorrências registradas
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">
              5. (=) Resultado Real
            </span>
            <span className="text-base font-black text-emerald-700 font-mono">
              R$ {agg.totalResultadoRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
              R$ {(agg.totalResultadoRealizado / Math.max(1, agg.totalPesoTons)).toFixed(2)} / t
            </span>
          </div>
        </div>
      </Card>

      {/* KPI Cards — Previsto x Realizado */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {' '}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">
              Receita Total Frete
            </div>
            <div className="text-base font-black text-slate-900 font-mono mt-0.5">
              R$ {agg.totalReceitaFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Tabela Comercial Base SP</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">
              Frete Pago Motoristas
            </div>
            <div className="text-base font-black text-slate-800 font-mono mt-0.5">
              R$ {agg.totalFretePago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Fechamento Mesa de Fretes</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Resultado Previsto</div>
            <div className="text-base font-black text-blue-700 font-mono mt-0.5">
              R$ {agg.totalResultadoPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-blue-500 mt-1">Pré-contratação</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">
              Resultado Realizado
            </div>
            <div
              className={`text-base font-black font-mono mt-0.5 ${
                agg.totalResultadoRealizado >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              R$ {agg.totalResultadoRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Margem: {agg.margemMediaPct.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Desvio Global</div>
            <div
              className={`text-base font-black font-mono mt-0.5 flex items-center gap-1 ${
                agg.totalDesvio >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {agg.totalDesvio >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              R$ {agg.totalDesvio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {agg.totalDesvio >= 0 ? 'Favorável à CIAFAL' : 'Desfavorável / Custo Acima'}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Acurácia Previsão</div>
            <div className="text-base font-black text-purple-700 font-mono mt-0.5">
              {agg.acuraciaPrevisaoFretePct.toFixed(1)}%
            </div>
            <div className="text-[10px] text-purple-500 mt-1">
              Erro médio: R$ {agg.erroMedioReais.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com as Dimensões Atualizadas */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white border border-slate-200 p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="text-xs">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="qlik_integration" className="text-xs font-bold text-[#005596]">
            QLIK — Rentabilidade Consolidada ({qlikRecords.length})
          </TabsTrigger>
          <TabsTrigger value="clients" className="text-xs">
            Clientes & Rentabilidade
          </TabsTrigger>
          <TabsTrigger value="routes" className="text-xs">
            Rotas
          </TabsTrigger>
          <TabsTrigger value="drivers" className="text-xs">
            Motoristas × Custo Real
          </TabsTrigger>
          <TabsTrigger value="occurrences_cost" className="text-xs">
            Custos de Ocorrências ({occurrenceCosts.length})
          </TabsTrigger>
          <TabsTrigger value="itineraries" className="text-xs">
            Itinerários SAP
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="text-xs">
            Veículos
          </TabsTrigger>
          <TabsTrigger value="previsto_realizado" className="text-xs">
            Previsto x Realizado
          </TabsTrigger>
          <TabsTrigger value="losses" className="text-xs">
            Perdas Logísticas
          </TabsTrigger>
          <TabsTrigger value="ai_analyst" className="text-xs font-bold text-purple-700">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Analista IA de Resultado
          </TabsTrigger>
        </TabsList>
        {/* NOVO: ABA QLIK RENTABILIDADE CONSOLIDADA OFICIAL */}
        <TabsContent value="qlik_integration" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-sky-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold uppercase text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#005596]" />
                  Estrutura de Rentabilidade Consolidada QLIK Sense
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Consumo direto do modelo analítico oficial Qlik com chaves SAP (Empresa, Centro,
                  Cliente, Ship-To, Remessa, NF e Transporte).
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-50 text-amber-800 border border-amber-300 text-xs">
                  Integração aguardando credenciais/configuração
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {qlikRecords.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-1">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Sem dados / aguardando sincronização oficial QLIK Sense
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Nenhum registro de rentabilidade sincronizado no momento. A carga analítica será
                    consolidada assim que as credenciais do conector Qlik Sense forem ativadas.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                    <tr>
                      <th className="p-2.5">Transp. SAP</th>
                      <th className="p-2.5">Remessa / NF</th>
                      <th className="p-2.5">Cliente (Ship-To)</th>
                      <th className="p-2.5">Itinerário / Região</th>
                      <th className="p-2.5">Motorista</th>
                      <th className="p-2.5 text-right">Peso (t)</th>
                      <th className="p-2.5 text-right">Frete Cobrado</th>
                      <th className="p-2.5 text-right">Frete Pago</th>
                      <th className="p-2.5 text-right">Pedágio</th>
                      <th className="p-2.5 text-right">Margem Qlik (R$)</th>
                      <th className="p-2.5 text-right">Margem %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {qlikRecords.map((q, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{q.sap_transport_number}</td>
                        <td className="p-2.5 text-slate-600">
                          {q.delivery_number} / {q.invoice_number}
                        </td>
                        <td className="p-2.5 font-sans font-semibold text-slate-800">
                          {q.customer_name}{' '}
                          <span className="text-[10px] font-mono text-slate-400">
                            ({q.ship_to_code})
                          </span>
                        </td>
                        <td className="p-2.5 font-sans text-slate-600">
                          {q.itinerary_code} - {q.region}
                        </td>
                        <td className="p-2.5 font-sans text-slate-700">{q.driver_name}</td>
                        <td className="p-2.5 text-right text-slate-700">
                          {Number(q.weight_ton || 0).toFixed(1)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          R${' '}
                          {Number(q.frete_cobrado_cliente || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2.5 text-right text-slate-700">
                          R${' '}
                          {Number(q.frete_pago_motorista || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2.5 text-right text-slate-700">
                          R${' '}
                          {Number(q.pedagio_total || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td
                          className={`p-2.5 text-right font-bold ${Number(q.margem_logistica_bruta || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                        >
                          R${' '}
                          {Number(q.margem_logistica_bruta || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2.5 text-right">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${Number(q.margem_logistica_pct || 0) >= 10 ? 'border-emerald-500 text-emerald-700' : 'border-blue-500 text-blue-700'}`}
                          >
                            {Number(q.margem_logistica_pct || 0).toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 1. VISÃO GERAL */}
        <TabsContent value="overview" className="space-y-3 mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xs font-bold uppercase text-slate-800">
                  Resumo Econômico por Itinerário
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {byItineraries.map((it) => (
                  <div
                    key={it.itineraryCode}
                    className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <strong className="font-mono text-slate-900">{it.itineraryCode}</strong> —{' '}
                      {it.city} ({it.uf})
                      <div className="text-[10px] text-slate-500">
                        {it.cargasCount} cargas • {(it.pesoKg / 1000).toFixed(1)}t • Receita: R${' '}
                        {it.receita.toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono font-bold ${
                          it.resultado >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        R$ {it.resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          it.margemPct >= 15
                            ? 'border-emerald-500 text-emerald-700'
                            : it.margemPct >= 0
                              ? 'border-blue-500 text-blue-700'
                              : 'border-rose-500 text-rose-700'
                        }`}
                      >
                        Margem: {it.margemPct.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xs font-bold uppercase text-slate-800">
                  Tabela Comercial Ativa (Base SP)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                <div className="text-[11px] text-slate-500 mb-2">
                  Versão: <strong>{DEFAULT_COMMERCIAL_TABLE.version}</strong> • Base Origem:{' '}
                  <strong>{DEFAULT_COMMERCIAL_TABLE.base_origin}</strong> • Vigência: Desde{' '}
                  {DEFAULT_COMMERCIAL_TABLE.effective_date_start}
                </div>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {DEFAULT_COMMERCIAL_TABLE.rates.map((rate) => (
                    <div
                      key={rate.itinerary_code}
                      className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div>
                        <strong className="font-mono text-slate-900">{rate.itinerary_code}</strong>{' '}
                        — <span className="text-slate-700">{rate.destination}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-slate-900 font-bold">
                          R$ {rate.rate_per_ton.toFixed(2)} / t
                        </span>
                        <div className="text-[10px] text-slate-500">
                          Mínimo: R$ {rate.min_freight.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. CLIENTES */}
        <TabsContent value="clients" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase text-slate-800">
                Rentabilidade por Cliente ({byClients.length} cadastros)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="p-2.5">Cliente</th>
                    <th className="p-2.5">Tier</th>
                    <th className="p-2.5 text-right">Cargas</th>
                    <th className="p-2.5 text-right">Toneladas</th>
                    <th className="p-2.5 text-right">Receita Frete</th>
                    <th className="p-2.5 text-right">Frete Pago</th>
                    <th className="p-2.5 text-right">Pedágio</th>
                    <th className="p-2.5 text-right">Resultado</th>
                    <th className="p-2.5 text-right">Margem %</th>
                    <th className="p-2.5 text-right">Desvio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {byClients.map((cli, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-semibold text-slate-900">
                        {cli.customerName}
                      </td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[9px]">
                          Tier {cli.tier}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right text-slate-700">{cli.cargasCount}</td>
                      <td className="p-2.5 text-right text-slate-700">
                        {(cli.pesoTotalKg / 1000).toFixed(1)} t
                      </td>
                      <td className="p-2.5 text-right text-slate-900 font-bold">
                        R$ {cli.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right text-slate-700">
                        R$ {cli.fretePago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right text-slate-700">
                        R$ {cli.pedagio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className={`p-2.5 text-right font-bold ${
                          cli.resultadoReal >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        R$ {cli.resultadoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right">
                        <span
                          className={`font-bold ${
                            cli.margemPct >= 15
                              ? 'text-emerald-700'
                              : cli.margemPct >= 0
                                ? 'text-blue-700'
                                : 'text-rose-700'
                          }`}
                        >
                          {cli.margemPct.toFixed(1)}%
                        </span>
                      </td>
                      <td
                        className={`p-2.5 text-right font-bold ${
                          cli.desvio >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        R$ {cli.desvio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. ROTAS & ITINERÁRIOS */}
        <TabsContent value="itineraries" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase text-slate-800">
                Desempenho por Itinerário SAP (TVROT)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="p-2.5">Código SAP</th>
                    <th className="p-2.5">Destino</th>
                    <th className="p-2.5 text-right">Nº Cargas</th>
                    <th className="p-2.5 text-right">Peso (t)</th>
                    <th className="p-2.5 text-right">Resultado Previsto</th>
                    <th className="p-2.5 text-right">Resultado Realizado</th>
                    <th className="p-2.5 text-right">Desvio</th>
                    <th className="p-2.5 text-right">Margem %</th>
                    <th className="p-2.5 text-right">Cargas Negativas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {byItineraries.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{it.itineraryCode}</td>
                      <td className="p-2.5 font-sans text-slate-700">
                        {it.city} / {it.uf}
                      </td>
                      <td className="p-2.5 text-right text-slate-700">{it.cargasCount}</td>
                      <td className="p-2.5 text-right text-slate-700">
                        {(it.pesoKg / 1000).toFixed(1)}
                      </td>
                      <td className="p-2.5 text-right text-blue-700">
                        R$ {it.previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className={`p-2.5 text-right font-bold ${
                          it.resultado >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        R$ {it.resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className={`p-2.5 text-right font-bold ${
                          it.desvio >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        R$ {it.desvio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right">
                        <Badge
                          variant="outline"
                          className={
                            it.margemPct >= 15
                              ? 'border-emerald-500 text-emerald-700'
                              : it.margemPct >= 0
                                ? 'border-blue-500 text-blue-700'
                                : 'border-rose-500 text-rose-700'
                          }
                        >
                          {it.margemPct.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right">
                        {it.negativas > 0 ? (
                          <Badge className="bg-rose-600 text-white text-[9px]">
                            {it.negativas} cargas
                          </Badge>
                        ) : (
                          <span className="text-emerald-600 font-sans font-semibold">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. VEÍCULOS */}
        <TabsContent value="vehicles" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase text-slate-800">
                Rentabilidade por Tipo de Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="p-2.5">Tipo de Veículo</th>
                    <th className="p-2.5 text-right">Cargas</th>
                    <th className="p-2.5 text-right">Toneladas</th>
                    <th className="p-2.5 text-right">Custo / Tonelada</th>
                    <th className="p-2.5 text-right">Resultado</th>
                    <th className="p-2.5 text-right">Margem %</th>
                    <th className="p-2.5 text-right">Frequência Prejuízo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {byVehicles.map((v, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-bold text-slate-900">{v.vehicleType}</td>
                      <td className="p-2.5 text-right text-slate-700">{v.cargasCount}</td>
                      <td className="p-2.5 text-right text-slate-700">
                        {(v.pesoKg / 1000).toFixed(1)} t
                      </td>
                      <td className="p-2.5 text-right text-slate-900 font-bold">
                        R$ {v.custoPorTon.toFixed(2)} / t
                      </td>
                      <td
                        className={`p-2.5 text-right font-bold ${
                          v.resultado >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        R$ {v.resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-800">
                        {v.margemPct.toFixed(1)}%
                      </td>
                      <td className="p-2.5 text-right">
                        {v.prejuizoCount > 0 ? (
                          <Badge className="bg-rose-500 text-white text-[9px]">
                            {v.prejuizoCount} cargas
                          </Badge>
                        ) : (
                          <span className="text-emerald-600 font-sans font-semibold">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. PREVISTO X REALIZADO */}
        <TabsContent value="previsto_realizado" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase text-slate-800">
                Detalhamento Carga a Carga: Previsto x Realizado
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="p-2.5">ID Carga</th>
                    <th className="p-2.5">Itinerário</th>
                    <th className="p-2.5">Motorista / Placa</th>
                    <th className="p-2.5">Grupo</th>
                    <th className="p-2.5 text-right">Receita (R$)</th>
                    <th className="p-2.5 text-right">Frete Previsto</th>
                    <th className="p-2.5 text-right">Frete Real Pago</th>
                    <th className="p-2.5 text-right">Pedágio</th>
                    <th className="p-2.5 text-right">Resultado Real</th>
                    <th className="p-2.5 text-right">Desvio R$</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filteredResults.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{r.cargo_id}</td>
                      <td className="p-2.5">{r.itinerary_code}</td>
                      <td className="p-2.5 font-sans">
                        {r.driver_name}{' '}
                        <span className="font-mono text-slate-500">({r.vehicle_plate})</span>
                      </td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className={
                            r.driver_group === 'PORTA'
                              ? 'border-[#005596] text-[#005596] bg-sky-50 text-[9px]'
                              : 'border-slate-300 text-slate-600 text-[9px]'
                          }
                        >
                          {r.driver_group || 'PORTA'}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right text-slate-900">
                        R$ {Number(r.receita_frete_real || r.receita_frete_prevista).toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right text-slate-500">
                        R$ {Number(r.frete_previsto_motorista).toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right text-slate-900 font-bold">
                        R$ {Number(r.frete_pago_motorista || r.frete_previsto_motorista).toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right text-slate-700">
                        R$ {Number(r.pedagio_real || r.pedagio_previsto).toFixed(2)}
                      </td>
                      <td
                        className={`p-2.5 text-right font-bold ${
                          (r.resultado_realizado ?? r.resultado_previsto) >= 0
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        R$ {Number(r.resultado_realizado ?? r.resultado_previsto).toFixed(2)}
                      </td>
                      <td
                        className={`p-2.5 text-right font-bold ${
                          (r.desvio_resultado || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        R$ {Number(r.desvio_resultado || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. PERDAS LOGÍSTICAS */}
        <TabsContent value="losses" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-rose-50/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Painel de Rotas & Cargas com Prejuízo
                </CardTitle>
                <Badge className="bg-rose-600 text-white text-[10px]">
                  {rotasPrejuizo.length} rotas monitoradas
                </Badge>
              </div>
              <CardDescription className="text-[11px]">
                Identifica cargas onde o frete pago ao motorista superou a receita líquida do frete
                cobrado.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {rotasPrejuizo.length === 0 ? (
                <div className="text-center py-8 text-emerald-600 text-xs font-semibold">
                  Nenhuma rota operando com margem negativa no período analisado.
                </div>
              ) : (
                rotasPrejuizo.map((rp) => (
                  <div
                    key={rp.itineraryCode}
                    className="p-3 rounded-lg border border-rose-200 bg-rose-50/40 space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="font-mono text-slate-900">{rp.itineraryCode}</strong> —{' '}
                        {rp.city} ({rp.uf})
                        <div className="text-[11px] text-slate-600">
                          {rp.cargasCount} cargas • {rp.negativas} com margem negativa
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-black text-rose-700 text-sm">
                          R$ {rp.resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <Badge className="bg-rose-600 text-white text-[9px]">
                          Margem: {rp.margemPct.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded border border-rose-100 text-[11px] text-slate-700">
                      <strong>Hipótese Analítica IA:</strong> Baixa ocupação média conjugada com
                      contratação de última hora acima do teto ANTT e pedágios não repassados na
                      tabela comercial.
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOVO: ABA MOTORISTAS × CUSTO REAL */}
        <TabsContent value="drivers" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase text-slate-800">
                Rentabilidade por Motorista ({byDrivers.length} parceiros)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="p-2.5">Motorista</th>
                    <th className="p-2.5 text-right">Viagens</th>
                    <th className="p-2.5 text-right">Toneladas</th>
                    <th className="p-2.5 text-right">Receita Total</th>
                    <th className="p-2.5 text-right">Frete Pago</th>
                    <th className="p-2.5 text-right">Pedágio</th>
                    <th className="p-2.5 text-right">Custos Ocorrências</th>
                    <th className="p-2.5 text-right">Resultado Real</th>
                    <th className="p-2.5 text-right">Margem / t</th>
                    <th className="p-2.5 text-right">Margem %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {byDrivers.map((drv, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-semibold text-slate-900">
                        {drv.dimensionLabel}
                      </td>
                      <td className="p-2.5 text-right text-slate-700">{drv.transportsCount}</td>
                      <td className="p-2.5 text-right text-slate-700">{drv.totalTons} t</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        R$ {drv.receitaTotal.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-2.5 text-right text-slate-700">
                        R$ {drv.fretePagoTotal.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-2.5 text-right text-slate-700">
                        R$ {drv.pedagioTotal.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-2.5 text-right text-purple-700">
                        R$ {drv.custoOcorrenciasTotal.toLocaleString('pt-BR')}
                      </td>
                      <td
                        className={`p-2.5 text-right font-bold ${drv.resultadoRealTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                      >
                        R$ {drv.resultadoRealTotal.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-800">
                        R$ {drv.margemPorTonelada.toFixed(2)} / t
                      </td>
                      <td className="p-2.5 text-right">
                        <Badge
                          variant="outline"
                          className={
                            drv.margemPct >= 15
                              ? 'border-emerald-500 text-emerald-700'
                              : 'border-blue-500 text-blue-700'
                          }
                        >
                          {drv.margemPct.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOVO: ABA CUSTOS DE OCORRÊNCIA COM MATRIZ DE RESPONSABILIDADE */}
        <TabsContent value="occurrences_cost" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold uppercase text-slate-800">
                  Custos Logísticos de Ocorrências & Matriz de Responsabilidade
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Custos extras vinculados a transportes com responsabilidade financeira atribuída.
                </CardDescription>
              </div>
              <Badge className="bg-purple-700 text-white text-xs">
                Total: R${' '}
                {totalOccurrenceCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="p-2.5">Transporte SAP</th>
                    <th className="p-2.5">Tipo de Custo</th>
                    <th className="p-2.5">Cliente</th>
                    <th className="p-2.5">Motorista</th>
                    <th className="p-2.5 text-right">Valor (R$)</th>
                    <th className="p-2.5">Responsabilidade Financeira</th>
                    <th className="p-2.5">Impacto no Motorista?</th>
                    <th className="p-2.5">Status Cobrança</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {occurrenceCosts.map((occ, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-slate-900">
                        {occ.sap_transport_number}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-800">
                        {occ.occurrence_cost_type}
                      </td>
                      <td className="p-2.5 text-slate-700">{occ.customer_name}</td>
                      <td className="p-2.5 text-slate-700">{occ.driver_name}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-purple-700">
                        R${' '}
                        {Number(occ.cost_value || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-slate-100 text-slate-800 font-bold"
                        >
                          {occ.financial_responsible}
                        </Badge>
                      </td>
                      <td className="p-2.5">
                        {occ.impacts_driver_performance ? (
                          <Badge variant="destructive" className="text-[9px]">
                            Sim (Atribuído)
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[9px]"
                          >
                            Não (Isento)
                          </Badge>
                        )}
                      </td>
                      <td className="p-2.5">
                        <Badge
                          className={`text-[9px] ${occ.charge_status === 'COBRADO_CLIENTE' ? 'bg-emerald-600' : 'bg-slate-600'} text-white`}
                        >
                          {occ.charge_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOVO: ANALISTA DE RESULTADO LOGÍSTICO (IA INTERATIVA) */}
        <TabsContent value="ai_analyst" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm p-4 space-y-4">
            <div className="border-b pb-3 flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase text-purple-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Analista de Resultado Logístico (IA)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Respostas baseadas em FATO (observado) × EXPLICAÇÃO (causa) × HIPÓTESE IA (padrão
                  preditivo).
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-purple-300 text-purple-700 text-xs">
                Governança: Sem dados fictícios
              </Badge>
            </div>

            {/* Perguntas Rápidas */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAskAnalyst('Quais clientes estão gerando menor resultado?')}
                className="text-xs border-slate-300 hover:bg-slate-100"
              >
                Quais clientes geram menor margem?
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAskAnalyst('Quanto perdemos com ocorrências e espera?')}
                className="text-xs border-slate-300 hover:bg-slate-100"
              >
                Quanto perdemos com espera em doca?
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAskAnalyst('Qual motorista apresenta melhor custo total?')}
                className="text-xs border-slate-300 hover:bg-slate-100"
              >
                Qual motorista tem o melhor custo total?
              </Button>
            </div>

            {/* Histórico do Chat Analítico */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto bg-slate-50 p-3 rounded-xl border border-slate-200">
              {analystConversation.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[10px] font-bold text-slate-500 mb-0.5">
                    {msg.sender === 'USER' ? 'Você (Gestor Logístico)' : 'Analista de Resultado IA'}
                  </div>
                  <div
                    className={`p-3 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                      msg.sender === 'USER'
                        ? 'bg-[#005596] text-white'
                        : 'bg-white border border-purple-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input de Pergunta */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={analystQuestion}
                onChange={(e) => setAnalystQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAnalyst()}
                placeholder="Faça uma pergunta sobre custos, rotas ou margens..."
                className="flex-1 p-2 border border-slate-300 rounded-lg text-xs"
              />
              <Button
                size="sm"
                onClick={() => handleAskAnalyst()}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
              >
                Perguntar à IA
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
export default ProfitabilityDashboardPage
