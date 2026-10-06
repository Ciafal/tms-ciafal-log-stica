// TMS CIAFAL — Visão Completa da Torre Geográfica: "Mapa Logístico de Cargas"
// Integra:
// 1. Cards Superiores Dinâmicos (#18)
// 2. Filtros Compactos Simultâneos (#17)
// 3. Toggle de Previsão Futura: Carteira Atual vs Carteira + PCP Futuro (#21)
// 4. Seletor de Variável do Heatmap (#4)
// 5. O Mapa Logístico Interativo (#2, #10)
// 6. Painel "Onde está a Demanda?" com centralização (#19)
// 7. Painel de Oportunidades de Consolidação com Economia Estimada (#12, #13)
// 8. Painel de Insights da IA com Rastreabilidade aos Dados (#20)
// 9. Relatório de Qualidade Cadastral e Localização Pendente (#24)
// 10. Painel Lateral de Detalhamento com Seleção Múltipla e Simulação de Carga (#9, #15)

import React, { useState, useMemo } from 'react'
import {
  MapPin,
  Package,
  Users,
  Truck,
  TrendingUp,
  Percent,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  Calendar,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  Info,
  Clock,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SapSalesOrderEntity, SapItineraryEntity } from '@/domain/rules'
import {
  processGeographicDemands,
  CityDemandCluster,
  ConsolidationOpportunity,
  AiGeoInsight,
} from '@/domain/geographicClusterEngine'
import { LogisticalCargoMap } from '@/components/load-planner/LogisticalCargoMap'
import { CityDetailDrawer } from '@/components/load-planner/CityDetailDrawer'

interface LogisticalMapTowerViewProps {
  orders: SapSalesOrderEntity[]
  itineraries: SapItineraryEntity[]
  onSimulateLoadFromMap: (orders: SapSalesOrderEntity[], label: string) => void
  onOpenCustomerProfile?: (customerCode?: string, customerName?: string) => void
  onSwitchToPlannerTab?: () => void
}

export const LogisticalMapTowerView: React.FC<LogisticalMapTowerViewProps> = ({
  orders,
  itineraries,
  onSimulateLoadFromMap,
  onOpenCustomerProfile,
  onSwitchToPlannerTab,
}) => {
  // Filtros Globais Simultâneos (#17)
  const [filterUf, setFilterUf] = useState<string>('ALL')
  const [filterItinerary, setFilterItinerary] = useState<string>('ALL')
  const [filterOriginPlant, setFilterOriginPlant] = useState<string>('ALL')
  const [filterSearchQuery, setFilterSearchQuery] = useState<string>('')
  const [filterStockStatus, setFilterStockStatus] = useState<string>('ALL')

  // Toggle Carteira Atual vs Carteira + Estoque Futuro (#21)
  const [includeFuturePcp, setIncludeFuturePcp] = useState<boolean>(false)

  // Seletor de Variável do Heatmap (#4)
  const [heatmapVar, setHeatmapVar] = useState<
    'TONELADAS' | 'PEDIDOS' | 'CLIENTES' | 'VALOR' | 'CARGAS' | 'ITENS'
  >('TONELADAS')

  // Estado do Drawer de Detalhes da Cidade (#9)
  const [selectedCity, setSelectedCity] = useState<CityDemandCluster | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)

  // Modal / Seção de Detalhamento da Origem do Insight da IA (#20)
  const [selectedInsightTrace, setSelectedInsightTrace] = useState<AiGeoInsight | null>(null)

  // Filtragem inicial dos pedidos da carteira real SAP
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterUf !== 'ALL' && (o.uf || '').toUpperCase() !== filterUf.toUpperCase()) {
        return false
      }
      if (
        filterItinerary !== 'ALL' &&
        (o.itinerary_code || '').toUpperCase() !== filterItinerary.toUpperCase()
      ) {
        return false
      }
      if (filterOriginPlant !== 'ALL') {
        if (filterOriginPlant === 'SIDERCENTRO' && !o.is_sidercentro && o.plant_code !== '1020') {
          return false
        }
        if (
          filterOriginPlant === 'CIAFAL_CONTAGEM' &&
          (o.is_sidercentro || o.plant_code === '1020')
        ) {
          return false
        }
      }
      if (filterStockStatus !== 'ALL') {
        const isReady =
          o.production_status === 'Pronto' ||
          (o.stock_available && o.stock_available > 0) ||
          (o.stock_dp34 && o.stock_dp34 > 0)
        if (filterStockStatus === 'READY' && !isReady) return false
        if (filterStockStatus === 'PENDING' && isReady) return false
      }
      if (filterSearchQuery.trim()) {
        const q = filterSearchQuery.toLowerCase()
        const matchesClient = (o.customer_name || '').toLowerCase().includes(q)
        const matchesCity = (o.destination_city || '').toLowerCase().includes(q)
        const matchesOrder = (o.order_number || '').toLowerCase().includes(q)
        const matchesMaterial = (o.material || '').toLowerCase().includes(q)
        if (!matchesClient && !matchesCity && !matchesOrder && !matchesMaterial) {
          return false
        }
      }
      return true
    })
  }, [orders, filterUf, filterItinerary, filterOriginPlant, filterStockStatus, filterSearchQuery])

  // Processamento Geográfico Completo
  const geoAnalysis = useMemo(() => {
    return processGeographicDemands({
      orders: filteredOrders,
      itineraries,
      includeFuturePcp,
      variableHeatmap: heatmapVar,
    })
  }, [filteredOrders, itineraries, includeFuturePcp, heatmapVar])

  // Abertura do Drawer da Cidade
  const handleSelectCity = (city: CityDemandCluster) => {
    setSelectedCity(city)
    setIsDrawerOpen(true)
  }

  // Centralização ao clicar na tabela "Onde está a Demanda?" (#19)
  const handleSelectUfFromTable = (uf: string) => {
    setFilterUf(uf)
  }

  // Ação de Simular Carga vinda do Drawer (#15)
  const handleSimulateLoad = (selectedOrders: SapSalesOrderEntity[], label: string) => {
    setIsDrawerOpen(false)
    onSimulateLoadFromMap(selectedOrders, label)
  }

  // Aplicar filtro originado de Insight da IA (#20)
  const handleApplyAiInsightFilter = (insight: AiGeoInsight) => {
    if (insight.filterToApply?.uf) {
      setFilterUf(insight.filterToApply.uf)
    }
    if (insight.filterToApply?.itineraryCode) {
      setFilterItinerary(insight.filterToApply.itineraryCode)
    }
    if (insight.filterToApply?.mode === 'FUTURO') {
      setIncludeFuturePcp(true)
    }
  }

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setFilterUf('ALL')
    setFilterItinerary('ALL')
    setFilterOriginPlant('ALL')
    setFilterStockStatus('ALL')
    setFilterSearchQuery('')
  }

  return (
    <div className="space-y-4">
      {/* 1. CARDS SUPERIORES DINÂMICOS (#18 e #26) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Carteira Disponível
              </span>
              <Package className="w-4 h-4 text-[#005596]" />
            </div>
            <div className="text-xl font-black font-mono text-slate-900">
              {geoAnalysis.availableWeightTon.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Total: <strong>{geoAnalysis.totalWeightTon.toFixed(1)} t</strong>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Pedidos SAP</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black font-mono text-slate-900">
              {geoAnalysis.totalOrdersCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {geoAnalysis.totalItemsCount} posições/itens
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Clientes Ativos
              </span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-black font-mono text-slate-900">
              {geoAnalysis.totalClientsCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {geoAnalysis.cities.length} cidades mapeadas
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Cargas Potenciais
              </span>
              <Truck className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-black font-mono text-purple-700">
              ~{geoAnalysis.potentialLoadsCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Capacidade 28t a 32t</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Estados Atendidos
              </span>
              <MapPin className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-black font-mono text-slate-900">
              {geoAnalysis.activeUfsCount} UFs
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {geoAnalysis.regions.length} macrorregiões
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Ocupação Média Est.
              </span>
              <Percent className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black font-mono text-emerald-700">
              {geoAnalysis.avgOccupancyPct.toLocaleString('pt-BR')} %
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Economia ~R$ {Math.round(geoAnalysis.availableWeightTon * 85).toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. BARRA DE FILTROS COMPACTA SIMULTÂNEA (#17) & TOGGLE PREVISÃO FUTURA (#21) */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardContent className="p-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            {/* Linha de Filtros Compactos */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Filter className="w-3.5 h-3.5 text-[#005596]" />
                <span>Filtros:</span>
              </div>

              {/* Origem / Centro Expedidor (#3) */}
              <Select value={filterOriginPlant} onValueChange={setFilterOriginPlant}>
                <SelectTrigger className="h-8 text-xs w-[140px] bg-slate-50">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Origens</SelectItem>
                  <SelectItem value="CIAFAL_CONTAGEM">CIAFAL Matriz (1010)</SelectItem>
                  <SelectItem value="SIDERCENTRO">Sidercentro (1020)</SelectItem>
                </SelectContent>
              </Select>

              {/* UF */}
              <Select value={filterUf} onValueChange={setFilterUf}>
                <SelectTrigger className="h-8 text-xs w-[100px] bg-slate-50">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas UFs</SelectItem>
                  {geoAnalysis.ufs.map((u) => (
                    <SelectItem key={u.uf} value={u.uf}>
                      {u.uf} ({u.totalWeightTon.toFixed(0)}t)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Itinerário SAP (#6) */}
              <Select value={filterItinerary} onValueChange={setFilterItinerary}>
                <SelectTrigger className="h-8 text-xs w-[150px] bg-slate-50">
                  <SelectValue placeholder="Itinerário SAP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos Itinerários</SelectItem>
                  {geoAnalysis.itineraries.map((it) => (
                    <SelectItem key={it.itineraryCode} value={it.itineraryCode}>
                      {it.itineraryCode} ({it.destinationCities.slice(0, 2).join('/')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Disponibilidade de Estoque */}
              <Select value={filterStockStatus} onValueChange={setFilterStockStatus}>
                <SelectTrigger className="h-8 text-xs w-[130px] bg-slate-50">
                  <SelectValue placeholder="Estoque" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Estoques</SelectItem>
                  <SelectItem value="READY">Disponível (DP34)</SelectItem>
                  <SelectItem value="PENDING">Em Produção / PCP</SelectItem>
                </SelectContent>
              </Select>

              {/* Busca Livre */}
              <div className="relative min-w-[160px] flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Buscar cliente, cidade, pedido..."
                  value={filterSearchQuery}
                  onChange={(e) => setFilterSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-slate-50"
                />
              </div>

              {(filterUf !== 'ALL' ||
                filterItinerary !== 'ALL' ||
                filterOriginPlant !== 'ALL' ||
                filterStockStatus !== 'ALL' ||
                filterSearchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Alternadores Especiais: Heatmap e Previsão Futura (#4 e #21) */}
            <div className="flex items-center gap-2 border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-100">
              {/* Variável do Heatmap */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg text-xs">
                <span className="text-[10px] font-bold text-slate-500 px-1.5 uppercase">
                  Calor:
                </span>
                <select
                  value={heatmapVar}
                  onChange={(e) =>
                    setHeatmapVar(
                      e.target.value as
                        | 'TONELADAS'
                        | 'PEDIDOS'
                        | 'CLIENTES'
                        | 'VALOR'
                        | 'CARGAS'
                        | 'ITENS',
                    )
                  }
                  className="bg-white border border-slate-200 text-xs rounded-md px-2 py-1 font-semibold text-slate-800 focus:outline-hidden"
                >
                  <option value="TONELADAS">Toneladas (t)</option>
                  <option value="PEDIDOS">Qtd. Pedidos</option>
                  <option value="CLIENTES">Qtd. Clientes</option>
                  <option value="VALOR">Valor (R$)</option>
                  <option value="CARGAS">Cargas Potenciais</option>
                  <option value="ITENS">Qtd. Itens</option>
                </select>
              </div>

              {/* Toggle Carteira Atual vs Carteira + PCP Futuro (#21) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <Button
                  size="sm"
                  variant={!includeFuturePcp ? 'default' : 'ghost'}
                  onClick={() => setIncludeFuturePcp(false)}
                  className={`h-6 text-[10px] px-2 font-bold ${
                    !includeFuturePcp
                      ? 'bg-[#005596] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Carteira Atual
                </Button>
                <Button
                  size="sm"
                  variant={includeFuturePcp ? 'default' : 'ghost'}
                  onClick={() => setIncludeFuturePcp(true)}
                  className={`h-6 text-[10px] px-2 font-bold ${
                    includeFuturePcp
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Inclui ordens de produção PCP programadas para os próximos dias"
                >
                  + PCP Futuro
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. MAPA LOGÍSTICO DO BRASIL INTERATIVO (#2 a #14) */}
      <LogisticalCargoMap
        cities={geoAnalysis.cities}
        ufs={geoAnalysis.ufs}
        itineraries={geoAnalysis.itineraries}
        consolidationOpportunities={geoAnalysis.consolidationOpportunities}
        selectedUf={filterUf}
        selectedItinerary={filterItinerary}
        heatmapVariable={heatmapVar}
        onSelectCity={handleSelectCity}
        onSelectItinerary={(itCode) => setFilterItinerary(itCode)}
        onSelectUf={(uf) => setFilterUf(uf)}
      />

      {/* 4. SEÇÃO EM DUAS COLUNAS: DEMANDA POR ESTADO + OPORTUNIDADES DA IA (#12, #13, #19, #20) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Painel "Onde está a Demanda?" (#19) */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="border-slate-200 shadow-xs bg-white">
            <div className="p-3 bg-slate-900 text-white rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Onde está a Demanda?</h3>
              </div>
              <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                {geoAnalysis.ufs.length} Estados
              </Badge>
            </div>
            <CardContent className="p-0">
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 text-xs">
                {geoAnalysis.ufs.map((u) => {
                  const isCurrent = filterUf === u.uf
                  return (
                    <div
                      key={u.uf}
                      onClick={() => handleSelectUfFromTable(isCurrent ? 'ALL' : u.uf)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition ${
                        isCurrent
                          ? 'bg-sky-50 text-[#005596] font-bold border-l-4 border-[#005596]'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                      title="Clique para filtrar e centralizar no mapa"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900 font-mono">
                            {u.uf}
                          </span>
                          <span className="text-slate-600 text-xs">{u.ufName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {u.citiesCount} cidades • {u.ordersCount} pedidos • {u.uniqueClientsCount}{' '}
                          clientes
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-black text-slate-900 text-sm">
                          {u.totalWeightTon.toFixed(1)} t
                        </div>
                        <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-full inline-block">
                          ~{u.potentialLoadsCount} cargas
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Qualidade Cadastral & Localização Pendente (#24) */}
          {geoAnalysis.cadastralAlerts.length > 0 && (
            <Card className="border-amber-200 shadow-xs bg-amber-50/50">
              <div className="p-2.5 px-3 bg-amber-100 text-amber-900 rounded-t-xl flex items-center justify-between border-b border-amber-200">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Alertas de Qualidade Cadastral</span>
                </div>
                <Badge className="bg-amber-600 text-white text-[9px]">
                  {geoAnalysis.cadastralAlerts.length}
                </Badge>
              </div>
              <CardContent className="p-2.5 space-y-2 max-h-[160px] overflow-y-auto text-xs">
                {geoAnalysis.cadastralAlerts.slice(0, 4).map((al) => (
                  <div
                    key={al.id}
                    className="p-2 bg-white rounded-lg border border-amber-200 text-[11px] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-amber-900">
                        {al.orderNumber} • {al.customerName}
                      </strong>
                      <span className="text-[9px] uppercase font-bold text-amber-700 bg-amber-100 px-1 rounded">
                        {al.category}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[10px]">{al.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Painel Central e Direito: Oportunidades de Consolidação (#12) & Insights da IA (#20) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Card de Oportunidades de Consolidação (#12, #13) */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <div className="p-3 bg-slate-900 text-white rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Oportunidades de Consolidação de Cargas (IA)
                </h3>
              </div>
              <Badge className="bg-purple-600 text-white text-[10px]">
                {geoAnalysis.consolidationOpportunities.length} identificadas
              </Badge>
            </div>
            <CardContent className="p-3 space-y-3">
              {geoAnalysis.consolidationOpportunities.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Nenhuma consolidação imediata identificada para os filtros selecionados.
                </div>
              ) : (
                geoAnalysis.consolidationOpportunities.slice(0, 3).map((opp) => (
                  <div
                    key={opp.id}
                    className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/30 hover:border-purple-300 transition space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 text-sm font-bold">
                            Itinerário {opp.itineraryCode}
                          </strong>
                          <span className="text-xs text-slate-600 font-medium">
                            ({opp.itineraryDescription})
                          </span>
                          <Badge className="bg-emerald-600 text-white text-[9px]">
                            Ocupação: {opp.estimatedOccupancyPct} %
                          </Badge>
                        </div>
                        <p className="text-xs text-purple-900 mt-0.5">
                          Rotas: <strong>{opp.cities.join(' → ')}</strong> ({opp.uf})
                        </p>
                      </div>

                      <div className="text-right sm:text-right">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">
                          Economia Estimada
                        </span>
                        <span className="text-sm font-black font-mono text-emerald-700">
                          R$ {opp.estimatedSavingsBrl.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">{opp.rationale}</p>

                    {/* Rodapé da Proposta com Métricas e Ações (#12) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-3 text-slate-600 text-[11px] flex-wrap">
                        <span>
                          Peso Total:{' '}
                          <strong className="text-slate-900">{opp.totalWeightTon} t</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Veículo:{' '}
                          <strong className="text-slate-900">{opp.vehicleTypeSuggested}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Descargas:{' '}
                          <strong className="text-slate-900">{opp.estimatedDischargesCount}</strong>
                        </span>
                        <span>•</span>
                        <Badge
                          variant="outline"
                          className={
                            opp.stockReadinessStatus === 'DISPONIVEL_IMEDIATO'
                              ? 'border-emerald-400 text-emerald-800 bg-emerald-50 text-[9px]'
                              : 'border-amber-400 text-amber-800 bg-amber-50 text-[9px]'
                          }
                        >
                          {opp.stockReadinessStatus === 'DISPONIVEL_IMEDIATO'
                            ? 'Estoque Físico Pronto'
                            : 'Aguardando PCP'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleSimulateLoad(
                              opp.orders,
                              `Consolidação ${opp.itineraryCode} (${opp.cities.join('/')})`,
                            )
                          }
                          className="bg-[#005596] hover:bg-[#004275] text-white text-xs h-8 font-bold px-3 shadow-xs"
                          title="Simular e injetar no Planejador de Cargas"
                        >
                          <Play className="w-3 h-3 mr-1 fill-white" />
                          Simular Carga ({opp.orders.length} pedidos)
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Painel de Análise da IA Rastreável (#20) */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <div className="p-3 bg-slate-900 text-white rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Análise da IA — Insights Logísticos Acionáveis
                </h3>
              </div>
              <span className="text-[10px] text-slate-300">
                100% Auditável e Rastreável aos Pedidos SAP
              </span>
            </div>
            <CardContent className="p-3 space-y-2.5">
              {geoAnalysis.aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[9px] font-bold border-sky-400 text-sky-800 bg-sky-50 uppercase"
                      >
                        {insight.category}
                      </Badge>
                      <strong className="text-xs text-slate-900">{insight.title}</strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedInsightTrace(insight)}
                        className="h-6 text-[10px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 px-2"
                        title="Ver lista de pedidos SAP reais que originaram esta recomendação"
                      >
                        Ver dados de origem ({insight.sourceOrders.length})
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleApplyAiInsightFilter(insight)}
                        className="h-6 text-[10px] font-bold bg-[#005596] text-white hover:bg-[#004275] px-2.5"
                      >
                        {insight.actionLabel}
                      </Button>
                    </div>
                  </div>

                  <div className="font-semibold text-xs text-slate-800">{insight.highlight}</div>
                  <p className="text-[11px] text-slate-600 leading-normal">{insight.explanation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Auditoria e Rastreabilidade do Insight da IA (#20 e #25) */}
      {selectedInsightTrace && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h4 className="text-sm font-bold">Rastreabilidade do Insight da IA</h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedInsightTrace(null)}
                className="h-7 w-7 p-0 text-slate-300 hover:text-white"
              >
                ✕
              </Button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-slate-50 text-xs space-y-1">
              <strong className="text-slate-900 block font-bold">
                {selectedInsightTrace.highlight}
              </strong>
              <p className="text-slate-600">{selectedInsightTrace.explanation}</p>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2 text-xs">
              <span className="font-bold text-slate-700 block uppercase text-[10px]">
                Pedidos da Carteira SAP (ZSD35) Auditados (
                {selectedInsightTrace.sourceOrders.length})
              </span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {selectedInsightTrace.sourceOrders.map((ord) => (
                  <div key={ord.id} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-900 font-mono">{ord.order_number}</strong>
                      <span className="text-slate-500 ml-2">{ord.customer_name}</span>
                      <div className="text-[10px] text-slate-400">
                        {ord.destination_city}/{ord.uf} • Itinerário: {ord.itinerary_code || 'S/I'}{' '}
                        • Material: {ord.material}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900">
                        {((ord.weight_kg || 0) / 1000).toFixed(1)} t
                      </span>
                      <div className="text-[10px] text-slate-500">
                        Status: {ord.production_status || 'Pendente'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button
                size="sm"
                onClick={() => setSelectedInsightTrace(null)}
                className="bg-slate-800 text-white text-xs h-8"
              >
                Fechar Rastreabilidade
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. PAINEL LATERAL DE DETALHAMENTO DA CIDADE COM SELEÇÃO MÚLTIPLA (#9 e #15) */}
      <CityDetailDrawer
        city={selectedCity}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSimulateLoad={handleSimulateLoad}
        onOpenCustomerProfile={onOpenCustomerProfile}
      />
    </div>
  )
}
