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
} from '@/domain/profitabilityEngine'

export const ProfitabilityDashboardPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [freightResults, setFreightResults] = useState<any[]>([])
  const [commercialTables, setCommercialTables] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItinerary, setSelectedItinerary] = useState<string>('ALL')

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [resData, tabData] = await Promise.all([
        TmsService.getFreightResults(),
        TmsService.getCommercialFreightTables(),
      ])
      setFreightResults(resData)
      setCommercialTables(tabData.length > 0 ? tabData : [DEFAULT_COMMERCIAL_TABLE])
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

      {/* KPI Cards — Previsto x Realizado */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

      {/* Tabs com as 8 Dimensões Exigidas na Sprint 6 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white border border-slate-200 p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="text-xs">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="clients" className="text-xs">
            Clientes
          </TabsTrigger>
          <TabsTrigger value="routes" className="text-xs">
            Rotas
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
          <TabsTrigger value="ai_analysis" className="text-xs">
            Análise IA
          </TabsTrigger>
        </TabsList>

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

        {/* 7. ANÁLISE IA & OPORTUNIDADES */}
        <TabsContent value="ai_analysis" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Insights & Padrões Detectados pela IA
                </CardTitle>
                <Badge variant="outline" className="text-[9px] border-purple-400 text-purple-700">
                  Hipótese Analítica (Sem alteração automática)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-3 text-xs">
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-1.5">
                <div className="font-bold text-purple-900 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-700" />
                  Padrão de Contratação MG001A (Belo Horizonte)
                </div>
                <p className="text-[11px] text-purple-800">
                  Os fretes do itinerário <strong>MG001A</strong> vêm sendo fechados com média{' '}
                  <strong>8% acima da previsão</strong> nos últimos 15 dias quando contratados via
                  grupo FORA. Cargas fechadas com motoristas PORTA apresentaram resultado 14% mais
                  favorável.
                </p>
                <div className="text-[10px] text-purple-600 italic">
                  Sugestão Operacional: Priorizar leilão com motoristas do pátio PORTA antes de
                  abrir para transportadores externos.
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-1.5">
                <div className="font-bold text-blue-900 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-blue-700" />
                  Oportunidade Perdida Registrada no Histórico
                </div>
                <p className="text-[11px] text-blue-800">
                  No dia 10/05, a carga <strong>CARGA-SP002-0892</strong> foi direcionada ao
                  motorista FORA por decisão manual do operador, abrindo mão de uma economia
                  prevista de R$ 560,00 com veículo Bitrem PORTA.
                </p>
                <div className="text-[10px] text-slate-500 italic">
                  Nota de Governança: Registrado como dado histórico para calibração do modelo. Não
                  classificado como erro.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
export default ProfitabilityDashboardPage
