// TMS CIAFAL — Central Visual de Roteirização e Clusterização (Visão Mapa Logístico)
//
// Atende integralmente aos requisitos:
// #1, #6: Layout protagonista: Filtros compactos no topo -> Mapa à esquerda + Painel de Cargas à direita -> Indicadores no rodapé
// #4, #18: Botão "Recalcular Clusterização" com opções: Menor custo, Menor distância, Maior ocupação, Menor nº veículos, Data de entrega, Equilíbrio geral (Padrão)
// #5: Comparação Roteirização: Cenário A (Convencional) vs Cenário B (Clusterização IA) com métricas de veículos economizados, km, frete e viagens
// #7: Painel Lateral de Cargas: Cor | Carga | Peso | Clientes | Descargas | Ocupação. Clique destaca clientes no mapa.
// #11: Filtro por Itinerário SAP com resumo dinâmico
// #15: Interação direta: Clicar no ponto -> Detalhes do cliente/pedidos -> Retirar de carga / mover para outra / criar nova carga / solicitar recálculo
// #16: Recálculo automático em memória sem recarregar a página
// #17: Indicadores resumidos objetivos: Carteira disponível (t), Clientes, Cargas IA, Não planejado (t), Ocupação média, Economia estimada (R$)
// #19: IA Explicável com justificativa específica e quantitativa
// #21: Transformar proposta em carga do Planejador ("Simular / Injetar Carga")

import React, { useState, useMemo, useCallback, useEffect } from 'react'
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
  Scale,
  Plus,
  ArrowUpDown,
  Building2,
  HelpCircle,
  ExternalLink,
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
  ClientDeliveryStop,
  ProposedLoadCluster,
  ClusterPriorityMode,
  buildClientDeliveryStops,
  runMulticriteriaClusterization,
  calculateScenarioComparison,
  buildItineraryRouteInfo,
  RoutingScenarioComparison,
  ItineraryRouteInfo,
} from '@/domain/logisticRoutingEngine'
import { RealGeographicMap } from '@/components/load-planner/RealGeographicMap'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { MapPinOff } from 'lucide-react'
import { CityDetailDrawer } from '@/components/load-planner/CityDetailDrawer'
import { CityDemandCluster } from '@/domain/geographicClusterEngine'
import { RouteAdditionModal } from '@/components/load-planner/RouteAdditionModal'
import { CreateMixedLoadModal } from '@/components/load-planner/CreateMixedLoadModal'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { tmsService } from '@/services/tmsService'
import { useToast } from '@/hooks/use-toast'
import { formatTons, formatPercent } from '@/utils/format'

interface LogisticalMapTowerViewProps {
  orders: SapSalesOrderEntity[]
  itineraries: SapItineraryEntity[]
  selectedItinerary?: string
  onSelectItinerary?: (itineraryCode: string) => void
  onSimulateLoadFromMap: (orders: SapSalesOrderEntity[], label: string) => void
  onOpenCustomerProfile?: (customerCode?: string, customerName?: string) => void
  onSwitchToPlannerTab?: () => void
}

export const LogisticalMapTowerView: React.FC<LogisticalMapTowerViewProps> = ({
  orders,
  itineraries,
  selectedItinerary,
  onSelectItinerary,
  onSimulateLoadFromMap,
  onOpenCustomerProfile,
  onSwitchToPlannerTab,
}) => {
  const { toast } = useToast()
  // Filtros compactos de topo (#6, #11)
  const [filterUf, setFilterUf] = useState<string>('ALL')
  const effectiveFilterItinerary = selectedItinerary !== undefined ? selectedItinerary : 'ALL'
  const setFilterItinerary = (val: string) => {
    if (onSelectItinerary) {
      onSelectItinerary(val)
    }
  }
  const filterItinerary = effectiveFilterItinerary
  const [filterOriginPlant, setFilterOriginPlant] = useState<string>('ALL')
  const [filterStockStatus, setFilterStockStatus] = useState<string>('ALL')
  const [filterSearchQuery, setFilterSearchQuery] = useState<string>('')

  // Modo de Priorização da IA (#4, #18: Padrão = EQUILIBRIO_GERAL)
  const [priorityMode, setPriorityMode] = useState<ClusterPriorityMode>('EQUILIBRIO_GERAL')
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false)

  // Seleções no mapa e no painel lateral (#7)
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null)
  const [selectedStop, setSelectedStop] = useState<ClientDeliveryStop | null>(null)

  // Drawer de Cidade mantido para retrocompatibilidade do fluxo
  const [selectedCityForDrawer, setSelectedCityForDrawer] = useState<CityDemandCluster | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)

  // Modal / Diálogo de Comparação de Cenários (A vs B) (#5)
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false)

  // Modificações Manuais de Cargas (Requisito #15 e #16: reatribuição de paradas entre clusters)
  const [manualStopAssignments, setManualStopAssignments] = useState<Record<string, string | null>>(
    {},
  )

  // 1. Filtragem dos pedidos reais da carteira SAP (#20) — Estritamente Liberados e não cancelados
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === 'cancelado') return false
      // Exigir status de crédito 'Liberado'
      if (o.credit_status && o.credit_status !== 'Liberado') return false

      if (filterUf !== 'ALL' && (o.uf || '').toUpperCase() !== filterUf.toUpperCase()) {
        return false
      }
      if (
        filterItinerary !== 'ALL' &&
        (o.itinerary_code || '').toUpperCase() !== filterItinerary.toUpperCase() &&
        (o.route_code || '').toUpperCase() !== filterItinerary.toUpperCase()
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

  // 2. Consolidação de Paradas por Cliente / Endereço (#2)
  const rawStops = useMemo(() => {
    return buildClientDeliveryStops(filteredOrders)
  }, [filteredOrders])

  // 3. Execução do Motor de Clusterização Multicritério (#4, #18)
  const baseClusterResult = useMemo(() => {
    return runMulticriteriaClusterization({
      stops: rawStops,
      priorityMode,
    })
  }, [rawStops, priorityMode])

  // 4. Aplicação de Ajustes Manuais do Usuário com Recálculo Instantâneo (#15, #16)
  const { baseClusters, stops, unplannedStops } = useMemo(() => {
    const clusterMap = new Map<string, ProposedLoadCluster>()
    baseClusterResult.clusters.forEach((c) => {
      clusterMap.set(c.id, {
        ...c,
        stops: [...c.stops],
      })
    })

    const allStops = rawStops.map((st) => {
      // Verifica se houve override manual do usuário
      const manualAssigned = manualStopAssignments[st.id]
      if (manualAssigned !== undefined) {
        if (manualAssigned === null) {
          // Removido da carga -> vai para não planejado
          return {
            ...st,
            assignedClusterId: undefined,
            isPlanned: false,
            stopSequence: undefined,
          }
        } else {
          // Atribuído para outro cluster
          return {
            ...st,
            assignedClusterId: manualAssigned,
            isPlanned: true,
          }
        }
      }

      // Procura cluster original sugerido pela IA
      const origCluster = baseClusterResult.clusters.find((c) =>
        c.stops.some((s) => s.id === st.id),
      )
      if (origCluster) {
        const origStop = origCluster.stops.find((s) => s.id === st.id)
        return {
          ...st,
          assignedClusterId: origCluster.id,
          clusterIndex: origCluster.stops.findIndex((s) => s.id === st.id) + 1,
          stopSequence: origStop?.stopSequence || 1,
          isPlanned: true,
        }
      }

      return {
        ...st,
        assignedClusterId: undefined,
        isPlanned: false,
      }
    })

    const unplanned = allStops.filter((s) => !s.isPlanned || !s.assignedClusterId)

    return {
      baseClusters: baseClusterResult.clusters,
      stops: allStops,
      unplannedStops: unplanned,
    }
  }, [baseClusterResult, rawStops, manualStopAssignments])

  // Adições excepcionais de rotas ativas (tmsService / collection route_additions)
  const [activeAdditions, setActiveAdditions] = useState<
    Record<string, import('@/domain/routeAdditionEngine').RouteAdditionEntity>
  >({})
  const [routeAdditionModalOpen, setRouteAdditionModalOpen] = useState(false)
  const [clusterForRouteAddition, setClusterForRouteAddition] =
    useState<ProposedLoadCluster | null>(null)
  const [createMixedLoadModalOpen, setCreateMixedLoadModalOpen] = useState(false)

  const loadRouteAdditions = useCallback(async () => {
    try {
      const list = await tmsService.getRouteAdditions("status = 'ATIVA'")
      const map: Record<string, import('@/domain/routeAdditionEngine').RouteAdditionEntity> = {}
      list.forEach((item) => {
        if (item.load_id) {
          map[item.load_id] = item
        }
      })
      setActiveAdditions(map)
    } catch (e) {
      console.warn('Erro ao carregar route_additions ativas no LogisticalMapTowerView', e)
    }
  }, [])

  useEffect(() => {
    loadRouteAdditions()
  }, [loadRouteAdditions])

  // Reconstrói clusters atualizados com métricas recalculadas instantaneamente e adições ativas (#16)
  const clusters = useMemo(() => {
    const updatedClusters: ProposedLoadCluster[] = []
    baseClusters.forEach((baseC) => {
      const stopsForThisCluster = stops.filter((s) => s.assignedClusterId === baseC.id)

      if (stopsForThisCluster.length > 0) {
        const addition = activeAdditions[baseC.id] || activeAdditions[baseC.code]
        const hasAddition = !!addition

        let weightTon =
          Math.round(stopsForThisCluster.reduce((a, b) => a + b.totalWeightTon, 0) * 10) / 10
        let distanceKm = baseC.estimatedDistanceKm
        let discharges = stopsForThisCluster.length
        let estimatedFreight = Math.round(weightTon * 165 + distanceKm * 3.8)
        let estimatedToll = baseC.estimatedTollBrl

        if (hasAddition && addition) {
          const wAfter = addition.weight_after ?? addition.weight_after_kg
          if (wAfter !== undefined) weightTon = Math.round((wAfter / 1000) * 10) / 10
          const dAfter = addition.distance_after ?? addition.distance_after_km
          if (dAfter !== undefined) distanceKm = dAfter
          const discAfter = addition.deliveries_after ?? addition.discharges_after
          if (discAfter !== undefined) discharges = discAfter
          const fAfter = addition.freight_after ?? addition.freight_after_brl
          if (fAfter !== undefined) estimatedFreight = fAfter
          const tAfter = addition.toll_after ?? addition.toll_after_brl
          if (tAfter !== undefined) estimatedToll = tAfter
        }

        const capacity = weightTon > 28.5 ? 32 : 28
        const occAfter = addition
          ? (addition.occupancy_after ?? addition.occupancy_after_pct)
          : undefined
        const occupancy =
          hasAddition && occAfter !== undefined
            ? occAfter
            : Math.min(100, Math.round((weightTon / capacity) * 1000) / 10)

        // Sequencia as paradas
        stopsForThisCluster.forEach((s, idx) => {
          s.stopSequence = idx + 1
        })

        updatedClusters.push({
          ...baseC,
          stops: stopsForThisCluster,
          totalWeightTon: weightTon,
          capacityTon: capacity,
          occupancyPct: occupancy,
          estimatedDistanceKm: distanceKm,
          clientsCount: stopsForThisCluster.length,
          ordersCount: stopsForThisCluster.reduce((a, b) => a + b.ordersCount, 0),
          dischargesCount: discharges,
          estimatedFreightBrl: estimatedFreight,
          estimatedTollBrl: estimatedToll,
          hasRouteAddition: hasAddition,
          routeAdditionData: addition || null,
        })
      }
    })
    return updatedClusters
  }, [baseClusters, stops, activeAdditions])

  // 5. Comparação de Cenários (A vs B) (#5)
  const scenarioComparison: RoutingScenarioComparison = useMemo(() => {
    return calculateScenarioComparison({
      stops,
      clustersIa: clusters,
      unplannedIa: unplannedStops,
    })
  }, [stops, clusters, unplannedStops])

  // 5.B Rota Consolidada do Itinerário Selecionado (Requisitos 1, 2, 3, 5, 6, 8, 9, 11)
  const itineraryRouteInfo: ItineraryRouteInfo | null = useMemo(() => {
    if (!filterItinerary || filterItinerary === 'ALL') {
      return null
    }

    const matchedItin = itineraries.find((it) => it.sap_code === filterItinerary)
    const itinDescription = matchedItin
      ? `${matchedItin.sap_code} — ${matchedItin.description}`
      : undefined

    return buildItineraryRouteInfo({
      itineraryCode: filterItinerary,
      itineraryDescription: itinDescription,
      stops,
      proposedLoadsCount: clusters.length,
      savingsPotentialBrl: scenarioComparison.savings.freightSavingsBrl,
    })
  }, [
    filterItinerary,
    itineraries,
    stops,
    clusters.length,
    scenarioComparison.savings.freightSavingsBrl,
  ])

  // Pedidos e paradas com geolocalização pendente (PENDING_GEOCODING) — Requisito #1 e #4
  const pendingGeoStops = useMemo(() => {
    return stops.filter((s) => s.isPendingGeo || (s.lat === 0 && s.lng === 0))
  }, [stops])

  const pendingGeoOrders = useMemo(() => {
    return pendingGeoStops.flatMap((s) => s.orders)
  }, [pendingGeoStops])

  // 6. 8 KPIs Compactos Responsivos do Topo do Mapa (Passo 3)
  // 1) Carteira Liberada (t), 2) Clientes distintos, 3) Pedidos elegíveis, 4) Municípios distintos,
  // 5) Cargas Propostas, 6) Toneladas Planejadas (t), 7) Saldo Não Planejado (t), 8) Ocupação Estimada (%)
  const summaryKpis = useMemo(() => {
    if (stops.length === 0 || filteredOrders.length === 0) {
      return {
        carteiraLiberadaTon: 0,
        clientesDistintos: 0,
        pedidosElegiveis: 0,
        municipiosDistintos: 0,
        cargasPropostas: 0,
        toneladasPlanejadas: 0,
        saldoNaoPlanejado: 0,
        ocupacaoEstimadaPct: 0,
        economiaEstimadaBrl: 0,
      }
    }

    const totalWeightTon = Math.round(stops.reduce((a, b) => a + b.totalWeightTon, 0) * 10) / 10
    const unplannedWeightTon =
      Math.round(unplannedStops.reduce((a, b) => a + b.totalWeightTon, 0) * 10) / 10
    const plannedWeightTon = Math.max(
      0,
      Math.round((totalWeightTon - unplannedWeightTon) * 10) / 10,
    )

    const distinctClientsCount = new Set(stops.map((s) => s.customerCode || s.customerName)).size
    const eligibleOrdersCount = filteredOrders.length
    const distinctCitiesCount = new Set(stops.map((s) => `${s.city}_${s.uf}`)).size
    const proposedLoadsCount = clusters.length

    const avgOccupancy =
      clusters.length > 0
        ? Math.round(clusters.reduce((a, b) => a + b.occupancyPct, 0) / clusters.length)
        : 0

    return {
      carteiraLiberadaTon: totalWeightTon,
      clientesDistintos: distinctClientsCount,
      pedidosElegiveis: eligibleOrdersCount,
      municipiosDistintos: distinctCitiesCount,
      cargasPropostas: proposedLoadsCount,
      toneladasPlanejadas: plannedWeightTon,
      saldoNaoPlanejado: unplannedWeightTon,
      ocupacaoEstimadaPct: avgOccupancy,
      economiaEstimadaBrl:
        proposedLoadsCount > 0 ? scenarioComparison.savings.freightSavingsBrl : 0,
    }
  }, [stops, unplannedStops, clusters, filteredOrders, scenarioComparison])

  // Carga ativa em destaque (#7)
  const activeCluster = useMemo(() => {
    if (!selectedClusterId) return null
    return clusters.find((c) => c.id === selectedClusterId) || null
  }, [clusters, selectedClusterId])

  // Handler de Recalcular Clusterização com simulação visual
  const handleRecalculate = (newMode?: ClusterPriorityMode) => {
    setIsRecalculating(true)
    if (newMode) setPriorityMode(newMode)
    // Limpa ajustes manuais para que a IA recalcule do zero
    setManualStopAssignments({})
    setTimeout(() => {
      setIsRecalculating(false)
    }, 400)
  }

  // Interação direta (#15): Mover ou Retirar cliente de uma carga
  const handleRemoveStopFromCluster = (stopId: string) => {
    setManualStopAssignments((prev) => ({
      ...prev,
      [stopId]: null, // null = joga para não planejado
    }))
  }

  const handleMoveStopToCluster = (stopId: string, targetClusterId: string) => {
    setManualStopAssignments((prev) => ({
      ...prev,
      [stopId]: targetClusterId,
    }))
  }

  // Enviar carga proposta diretamente para o Planejador (#21)
  const handleSendLoadToPlanner = (cluster: ProposedLoadCluster) => {
    const ordersInCluster = cluster.stops.flatMap((s) => s.orders)
    onSimulateLoadFromMap(ordersInCluster, `${cluster.code} - ${cluster.label}`)
  }

  // Enviar cliente selecionado para o Planejador
  const handleSendStopToPlanner = (stop: ClientDeliveryStop) => {
    onSimulateLoadFromMap(stop.orders, `Cliente ${stop.customerName}`)
  }

  return (
    <div className="space-y-3">
      {/* 1. FILTROS COMPACTOS NO TOPO E BARRA DE AÇÕES (#6, #11, #18) */}
      <Card className="border-slate-200 shadow-xs bg-white w-full box-border min-w-0">
        <CardContent className="p-3 sm:p-4 space-y-3">
          {/* CONTAINER EXCLUSIVO 1: FILTROS DA CENTRAL (Linha horizontal responsiva com quebra automática) */}
          <div className="w-full box-border min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 w-full">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
                <Filter className="w-4 h-4 text-[#005596]" />
                <span className="whitespace-nowrap">Filtros da Central:</span>
              </div>

              {/* Origem */}
              <div className="min-w-[140px] flex-1 sm:flex-initial">
                <Select value={filterOriginPlant} onValueChange={setFilterOriginPlant}>
                  <SelectTrigger className="h-9 min-h-[38px] text-xs w-full bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas Origens</SelectItem>
                    <SelectItem value="CIAFAL_CONTAGEM">CIAFAL Matriz (1010)</SelectItem>
                    <SelectItem value="SIDERCENTRO">Sidercentro (1020)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* UF */}
              <div className="min-w-[95px] flex-1 sm:flex-initial">
                <Select value={filterUf} onValueChange={setFilterUf}>
                  <SelectTrigger className="h-9 min-h-[38px] text-xs w-full bg-slate-50 border-slate-200">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas UFs</SelectItem>
                    {Array.from(new Set(orders.map((o) => (o.uf || 'MG').toUpperCase()))).map(
                      (uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Itinerário SAP (#11 e #7: limpa seleções e propaga para o mapa) */}
              <div className="min-w-[180px] flex-1 sm:flex-initial">
                <Select
                  value={filterItinerary}
                  onValueChange={(val) => {
                    setSelectedClusterId(null)
                    setSelectedStop(null)
                    setFilterItinerary(val)
                  }}
                >
                  <SelectTrigger className="h-9 min-h-[38px] text-xs w-full bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Itinerário SAP" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos Itinerários SAP</SelectItem>
                    {itineraries.map((it) => (
                      <SelectItem key={it.sap_code} value={it.sap_code}>
                        {it.sap_code} — {it.description.slice(0, 22)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Disponibilidade de Estoque */}
              <div className="min-w-[140px] flex-1 sm:flex-initial">
                <Select value={filterStockStatus} onValueChange={setFilterStockStatus}>
                  <SelectTrigger className="h-9 min-h-[38px] text-xs w-full bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Estoque" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os Estoques</SelectItem>
                    <SelectItem value="READY">Disponível DP34</SelectItem>
                    <SelectItem value="PENDING">Em Produção / PCP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Busca Livre */}
              <div className="relative min-w-[200px] flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Buscar cliente, cidade, pedido..."
                  value={filterSearchQuery}
                  onChange={(e) => setFilterSearchQuery(e.target.value)}
                  className="h-9 min-h-[38px] pl-9 text-xs bg-slate-50 border-slate-200 w-full"
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
                  onClick={() => {
                    setFilterUf('ALL')
                    setFilterItinerary('ALL')
                    setFilterOriginPlant('ALL')
                    setFilterStockStatus('ALL')
                    setFilterSearchQuery('')
                  }}
                  className="h-9 px-2.5 text-xs text-slate-500 hover:text-slate-800 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* CONTAINER EXCLUSIVO 2: BARRA DE AÇÕES INDEPENDENTE (Linha própria sem sobreposição) */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 w-full min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* Botão + Criar Carga Mista (Passo 2) */}
              <Button
                size="sm"
                onClick={() => setCreateMixedLoadModalOpen(true)}
                className="h-9 text-xs font-bold bg-[#005596] hover:bg-[#004275] text-white shadow-xs px-3.5 shrink-0"
                title="Criar carga mista combinando múltiplos itinerários ou rotas SAP"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span>+ Criar Carga Mista</span>
              </Button>

              {/* Botão Comparar Roteirização (A vs B) (#5) */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsComparisonModalOpen(true)}
                className="h-9 text-xs font-bold border-purple-300 text-purple-700 bg-purple-50/50 hover:bg-purple-100 hover:text-purple-900 shadow-xs px-3 shrink-0"
                title="Comparar Cenário Convencional SAP vs Cenário IA Otimizado"
              >
                <Scale className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                <span>Comparar Cenários (A × B)</span>
                <Badge className="bg-purple-600 text-white font-mono text-[9px] px-1.5 py-0 ml-1.5">
                  -{scenarioComparison.savings.vehiclesReduced} v.
                </Badge>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Seletor de Priorização da IA (#18) */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs shrink-0">
                <span className="text-[10px] font-bold text-slate-500 px-1 uppercase tracking-wider">
                  Priorização:
                </span>
                <select
                  value={priorityMode}
                  onChange={(e) => handleRecalculate(e.target.value as ClusterPriorityMode)}
                  className="bg-white border border-slate-200 text-xs rounded-md px-2 py-1 font-semibold text-slate-800 focus:outline-hidden"
                >
                  <option value="EQUILIBRIO_GERAL">Equilíbrio Geral (Padrão)</option>
                  <option value="MENOR_CUSTO">Menor Custo Logístico</option>
                  <option value="MENOR_DISTANCIA">Menor Distância (km)</option>
                  <option value="MAIOR_OCUPACAO">Maior Ocupação de Veículo</option>
                  <option value="MENOR_VEICULOS">Menor Número de Veículos</option>
                  <option value="DATA_ENTREGA">Data Crítica de Entrega</option>
                </select>
              </div>

              {/* Botão Recalcular Clusterização (#18) */}
              <Button
                size="sm"
                onClick={() => handleRecalculate()}
                disabled={isRecalculating}
                className="bg-[#005596] hover:bg-[#004275] text-white text-xs h-9 font-bold px-3.5 shadow-xs shrink-0"
                title="Recalcular agrupamentos e roteirização da IA"
              >
                <Sparkles
                  className={`w-3.5 h-3.5 mr-1.5 ${isRecalculating ? 'animate-spin' : ''}`}
                />
                <span>Recalcular Clusterização</span>
              </Button>
            </div>
          </div>

          {/* 8 KPIs Compactos Responsivos do Topo do Mapa (Passo 1 e 3) — CSS Grid responsivo com formatTons e formatPercent ABNT, sem truncamento */}
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5">
            <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg text-center shadow-xs min-h-[72px] flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block leading-tight">
                Carteira Liberada
              </span>
              <strong className="text-sm sm:text-base font-black font-mono text-[#005596] mt-0.5">
                {formatTons(summaryKpis.carteiraLiberadaTon, { decimals: 2 })}
              </strong>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg text-center shadow-xs min-h-[72px] flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block leading-tight">
                Clientes Distintos
              </span>
              <strong className="text-sm sm:text-base font-black font-mono text-slate-900 mt-0.5">
                {summaryKpis.clientesDistintos}
              </strong>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg text-center shadow-xs min-h-[72px] flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block leading-tight">
                Pedidos Elegíveis
              </span>
              <strong className="text-sm sm:text-base font-black font-mono text-slate-900 mt-0.5">
                {summaryKpis.pedidosElegiveis}
              </strong>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg text-center shadow-xs min-h-[72px] flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block leading-tight">
                Municípios
              </span>
              <strong className="text-sm sm:text-base font-black font-mono text-slate-900 mt-0.5">
                {summaryKpis.municipiosDistintos}
              </strong>
            </div>

            <div className="bg-purple-50/70 border border-purple-200/80 p-2.5 rounded-lg text-center shadow-xs min-h-[72px] flex flex-col justify-center">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block leading-tight">
                Cargas Propostas
              </span>
              <strong className="text-sm sm:text-base font-black font-mono text-purple-900 mt-0.5">
                {summaryKpis.cargasPropostas}
              </strong>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 p-2.5 rounded-lg text-center shadow-xs min-h-[72px] flex flex-col justify-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block leading-tight">
                Toneladas Planejadas
              </span>
              <strong className="text-sm sm:text-base font-black font-mono text-emerald-900 mt-0.5">
                {formatTons(summaryKpis.toneladasPlanejadas, { decimals: 2 })}
              </strong>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg text-center shadow-xs min-h-[72px] flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block leading-tight">
                Saldo Não Planejado
              </span>
              <strong className="text-sm sm:text-base font-black font-mono text-slate-700 mt-0.5">
                {formatTons(summaryKpis.saldoNaoPlanejado, { decimals: 2 })}
              </strong>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg text-center shadow-xs min-h-[72px] flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block leading-tight">
                Ocupação Estimada
              </span>
              <strong className="text-sm sm:text-base font-black font-mono text-emerald-700 mt-0.5">
                {formatPercent(summaryKpis.ocupacaoEstimadaPct, 1)}
              </strong>
            </div>
          </div>

          {/* Alerta de Qualidade Cadastral: Pedidos com PENDING_GEOCODING (#1, #4) */}
          {pendingGeoOrders.length > 0 && (
            <Alert className="mt-2 border-amber-300 bg-amber-50/90 text-amber-900 text-xs py-2 px-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <div className="ml-2">
                <AlertTitle className="text-xs font-bold flex items-center gap-1.5 text-amber-900">
                  <MapPinOff className="w-3.5 h-3.5 text-amber-700" />
                  Alerta de Qualidade Cadastral — {pendingGeoOrders.length} pedido(s) pendente(s) de
                  geocodificação
                </AlertTitle>
                <AlertDescription className="text-[11px] text-amber-800 space-y-1 mt-0.5">
                  <p>
                    Estes pedidos possuem pendência geográfica (município não mapeado ou sem
                    coordenadas GPS). As coordenadas não foram inventadas para não distorcer o
                    cálculo térmico do mapa:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {pendingGeoOrders.slice(0, 5).map((po) => (
                      <span
                        key={po.id || po.order_number}
                        className="bg-white px-2 py-0.5 rounded border border-amber-300 font-mono text-[10px] text-slate-800"
                      >
                        Ped. {po.order_number} — {po.customer_name?.slice(0, 20)} (
                        {po.destination_city || 'S/C'}/{po.uf || 'S/UF'})
                      </span>
                    ))}
                    {pendingGeoOrders.length > 5 && (
                      <span className="text-[10px] font-bold text-amber-900 self-center">
                        +{pendingGeoOrders.length - 5} outros
                      </span>
                    )}
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Mensagem exata de estado vazio quando não há pedidos elegíveis no itinerário (#1 e #11) */}
          {filterItinerary !== 'ALL' && filteredOrders.length === 0 && (
            <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-600 font-medium">
              Nenhum pedido liberado para este itinerário.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. ÁREA PRINCIPAL: MAPA À ESQUERDA + PAINEL DE CARGAS À DIREITA (#6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* MAPA À ESQUERDA (8 Colunas na tela grande — Protagonista com Base Geográfica Real MapLibre/OSM) */}
        <div className="lg:col-span-8">
          <RealGeographicMap
            stops={stops}
            clusters={clusters}
            unplannedStops={unplannedStops}
            selectedClusterId={selectedClusterId}
            selectedStopId={selectedStop?.id || null}
            selectedUf={filterUf}
            selectedItinerary={filterItinerary}
            itineraryRouteInfo={itineraryRouteInfo}
            onSelectCluster={(cid) => {
              setSelectedClusterId(cid)
              setSelectedStop(null)
            }}
            onSelectStop={(st) => {
              setSelectedStop(st)
              if (st.assignedClusterId) {
                setSelectedClusterId(st.assignedClusterId)
              }
            }}
            onSwitchToPlannerTab={onSwitchToPlannerTab}
            onOpenCustomerProfile={onOpenCustomerProfile}
          />
        </div>

        {/* PAINEL LATERAL DE CARGAS / CLUSTERS À DIREITA (4 Colunas) (#6, #7, #15, #19) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Card Tabular de Cargas Propostas (#7) */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <div className="p-3 bg-slate-900 text-white rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Cargas Propostas ({clusters.length})
                </h3>
              </div>
              <span className="text-[10px] text-slate-300">Clique para isolar rota</span>
            </div>

            <CardContent className="p-0">
              <div className="max-h-[310px] overflow-y-auto divide-y divide-slate-100 text-xs">
                {clusters.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    Nenhuma carga formada para os filtros selecionados.
                  </div>
                ) : (
                  clusters.map((cl) => {
                    const isSelected = selectedClusterId === cl.id

                    return (
                      <div
                        key={cl.id}
                        onClick={() => setSelectedClusterId(isSelected ? null : cl.id)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-sky-50 font-semibold border-l-4 border-[#005596]'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                        title="Clique para destacar somente os clientes desta carga no mapa"
                      >
                        {/* Identificador com Cor Semântica (#3, #7) */}
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow-xs"
                            style={{ backgroundColor: cl.color.hex }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">{cl.code}</span>
                              <span className="text-[10px] text-slate-500">
                                ({cl.destinationCities.slice(0, 2).join('/')})
                              </span>
                              {cl.hasRouteAddition && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-[9px] px-1.5 py-0">
                                        + Rota
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs p-2 bg-slate-900 text-white">
                                      <p className="font-bold text-amber-300">ROTA ADICIONADA</p>
                                      <p>
                                        Original: {cl.routeAdditionData?.original_itinerary_code}
                                      </p>
                                      <p>
                                        Adicional:{' '}
                                        {cl.routeAdditionData?.complementary_itinerary_code}
                                      </p>
                                      <p>Motivo: {cl.routeAdditionData?.reason_description}</p>
                                      <p>
                                        Usuário: {cl.routeAdditionData?.user_name || 'Operador'}
                                      </p>
                                      <p>
                                        Data/hora:{' '}
                                        {cl.routeAdditionData?.created
                                          ? new Date(cl.routeAdditionData.created).toLocaleString(
                                              'pt-BR',
                                            )
                                          : '-'}
                                      </p>
                                      {cl.routeAdditionData?.ai_analysis && (
                                        <p className="text-amber-200 text-[10px] pt-1">
                                          IA: {cl.routeAdditionData.ai_analysis}
                                        </p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {cl.clientsCount} clientes • {cl.dischargesCount} descargas • ~
                              {cl.estimatedDistanceKm} km
                            </div>
                          </div>
                        </div>

                        {/* Métricas e Ocupação */}
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {formatTons(cl.totalWeightTon, { decimals: 2 })}
                          </div>
                          <Badge
                            className={`text-[9px] px-1.5 py-0 font-bold ${
                              cl.occupancyPct >= 90
                                ? 'bg-emerald-600 text-white'
                                : cl.occupancyPct >= 80
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-600 text-white'
                            }`}
                          >
                            {cl.occupancyPct}%
                          </Badge>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card de Carga Selecionada / IA Explicável (#19) */}
          {activeCluster ? (
            <Card className="border-sky-300 shadow-xs bg-sky-50/40">
              <div className="p-2.5 bg-sky-100 text-[#005596] rounded-t-xl flex items-center justify-between border-b border-sky-200">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: activeCluster.color.hex }}
                  />
                  <span>Detalhamento: {activeCluster.code}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {activeCluster.hasRouteAddition ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          'Deseja remover esta rota adicional do itinerário?',
                        )
                        if (!confirmed) return
                        const addition = activeCluster.routeAdditionData
                        if (addition?.id) {
                          try {
                            await tmsService.removeRouteAddition(addition.id)
                            toast({
                              title: 'Rota adicional removida',
                              description:
                                'A rota adicional foi removida mantendo o histórico de auditoria.',
                            })
                            loadRouteAdditions()
                          } catch (err: any) {
                            toast({
                              title: 'Erro ao remover rota',
                              description: err?.message || 'Falha ao remover.',
                              variant: 'destructive',
                            })
                          }
                        }
                      }}
                      className="h-6 text-[10px] font-bold text-rose-700 border-rose-300 hover:bg-rose-50 px-2"
                      title="Remover rota adicional do itinerário"
                    >
                      Remover rota
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setClusterForRouteAddition(activeCluster)
                        setRouteAdditionModalOpen(true)
                      }}
                      className="h-6 text-[10px] font-bold text-[#005596] border-[#005596]/40 hover:bg-sky-50 px-2"
                      title="Adicionar rotas complementares ao itinerário"
                    >
                      + Adicionar Rotas
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleSendLoadToPlanner(activeCluster)}
                    className="h-6 text-[10px] font-bold bg-[#005596] hover:bg-[#004275] text-white px-2 shadow-xs"
                    title="Transformar esta proposta diretamente em carga do Planejador"
                  >
                    <Play className="w-2.5 h-2.5 mr-1 fill-white" />
                    Enviar p/ Planejador
                  </Button>
                </div>
              </div>

              <CardContent className="p-3 space-y-2.5 text-xs">
                {/* Rota Sequencial Prevista (#8: Origem -> Cliente 1 -> 2...) */}
                <div className="bg-white p-2 rounded-lg border border-sky-200 space-y-1.5">
                  <span className="font-bold text-[10px] uppercase text-slate-500 block">
                    Sequência Prevista de Descargas:
                  </span>
                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
                      <span>🏭</span>
                      <span>Origem: {activeCluster.originHub.name}</span>
                    </div>
                    {activeCluster.stops.map((st, idx) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between text-[11px] pl-4 border-l-2 border-sky-400 py-0.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-[#005596] text-white font-mono text-[9px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-slate-800 font-medium truncate max-w-[130px]">
                            {st.customerName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className="text-slate-700">
                            {formatTons(st.totalWeightTon, { decimals: 2 })}
                          </span>
                          <button
                            onClick={() => handleRemoveStopFromCluster(st.id)}
                            className="text-slate-400 hover:text-rose-600 font-bold px-1"
                            title="Retirar cliente desta carga"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Por que a IA formou esta carga? (#19: IA Explicável com Justificativa Quantitativa) */}
                <div className="bg-white p-2.5 rounded-lg border border-sky-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-900 font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Por que a IA formou esta carga?</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed italic">
                    "{activeCluster.aiRationale}"
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <div>
                      Frete Estimado:{' '}
                      <strong className="text-emerald-700 font-mono">
                        R$ {activeCluster.estimatedFreightBrl.toLocaleString('pt-BR')}
                      </strong>
                    </div>
                    <div>
                      Pedágio Estimado:{' '}
                      <strong className="text-slate-800 font-mono">
                        R$ {activeCluster.estimatedTollBrl.toLocaleString('pt-BR')}
                      </strong>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Detalhes do Cliente Selecionado (#2, #15) */
            selectedStop && (
              <Card className="border-slate-200 shadow-xs bg-white">
                <div className="p-2.5 bg-slate-900 text-white rounded-t-xl flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span className="truncate">{selectedStop.customerName}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSendStopToPlanner(selectedStop)}
                    className="h-6 text-[10px] font-bold bg-[#005596] hover:bg-[#004275] text-white px-2"
                  >
                    Montar Carga
                  </Button>
                </div>

                <CardContent className="p-3 space-y-2 text-xs">
                  <div className="text-[11px] text-slate-600">
                    <div>
                      Município:{' '}
                      <strong>
                        {selectedStop.city} / {selectedStop.uf}
                      </strong>
                    </div>
                    <div>
                      Itinerário SAP: <strong>{selectedStop.itineraryCode}</strong>
                    </div>
                    <div>
                      Data Solicitada:{' '}
                      <strong>
                        {selectedStop.requestedDate
                          ? new Date(selectedStop.requestedDate + 'T12:00:00').toLocaleDateString(
                              'pt-BR',
                            )
                          : 'A combinar'}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Peso Total:</span>
                      <strong className="text-slate-900 font-mono text-sm">
                        {formatTons(selectedStop.totalWeightTon, { decimals: 2 })}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Pedidos SAP:</span>
                      <strong className="text-slate-900 font-mono text-sm">
                        {selectedStop.ordersCount}
                      </strong>
                    </div>
                  </div>

                  {/* Interação Direta: Mover para outra carga (#15) */}
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase">
                      Alocar / Mover para Carga:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleMoveStopToCluster(selectedStop.id, e.target.value)
                          }
                        }}
                        className="bg-slate-50 border border-slate-200 text-xs rounded px-2 py-1 flex-1 font-semibold text-slate-800"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Selecione a carga destino...
                        </option>
                        {clusters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} ({formatTons(c.totalWeightTon, { decimals: 2 })} -{' '}
                            {c.occupancyPct}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}

          {/* Card de Pedidos Não Planejados (#13) */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <div className="p-2.5 px-3 bg-slate-100 rounded-t-xl flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                <span>Não Planejados ({unplannedStops.length} clientes)</span>
              </div>
              <span className="font-mono text-xs font-bold text-slate-800">
                {formatTons(summaryKpis.saldoNaoPlanejado, { decimals: 2 })}
              </span>
            </div>

            <CardContent className="p-2 max-h-[140px] overflow-y-auto space-y-1 text-xs">
              {unplannedStops.length === 0 ? (
                <div className="p-3 text-center text-emerald-700 font-medium text-[11px]">
                  ✓ Todos os pedidos foram alocados em cargas propostas!
                </div>
              ) : (
                unplannedStops.slice(0, 6).map((st) => (
                  <div
                    key={st.id}
                    onClick={() => setSelectedStop(st)}
                    className="p-1.5 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center justify-between text-[11px]"
                  >
                    <span className="truncate max-w-[170px] text-slate-800">{st.customerName}</span>
                    <span className="font-mono font-bold text-slate-700">
                      {formatTons(st.totalWeightTon, { decimals: 2 })}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. INDICADORES RESUMIDOS NO RODAPÉ (#6, #17) com unidades formatTons ABNT */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs text-center h-full flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
            Carteira Disponível
          </span>
          <strong className="text-base font-black font-mono text-[#005596]">
            {formatTons(summaryKpis.carteiraLiberadaTon, { decimals: 2 })}
          </strong>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs text-center h-full flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
            Clientes Ativos
          </span>
          <strong className="text-base font-black font-mono text-slate-900">
            {summaryKpis.clientesDistintos}
          </strong>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs text-center h-full flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
            Cargas IA Propostas
          </span>
          <strong className="text-base font-black font-mono text-purple-700">
            {summaryKpis.cargasPropostas}
          </strong>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs text-center h-full flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
            Não Planejado
          </span>
          <strong className="text-base font-black font-mono text-slate-600">
            {formatTons(summaryKpis.saldoNaoPlanejado, { decimals: 2 })}
          </strong>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs text-center h-full flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
            Ocupação Média
          </span>
          <strong className="text-base font-black font-mono text-emerald-700">
            {summaryKpis.ocupacaoEstimadaPct}%
          </strong>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs text-center h-full flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
            Economia Estimada
          </span>
          <strong className="text-base font-black font-mono text-emerald-700">
            R$ {summaryKpis.economiaEstimadaBrl.toLocaleString('pt-BR')}
          </strong>
        </div>
      </div>

      {/* MODAL DE ADIÇÃO EXCEPCIONAL DE ROTA AO ITINERÁRIO */}
      {clusterForRouteAddition && (
        <RouteAdditionModal
          open={routeAdditionModalOpen}
          onOpenChange={(isOpen) => {
            setRouteAdditionModalOpen(isOpen)
            if (!isOpen) setClusterForRouteAddition(null)
          }}
          candidateLoad={{
            id: clusterForRouteAddition.id,
            title: `Carga ${clusterForRouteAddition.code} - ${clusterForRouteAddition.destinationCities.join('/')}`,
            itineraryCode: clusterForRouteAddition.code.replace('CL-', '') || '',
            itineraryDescription: `Itinerário ${clusterForRouteAddition.code}`,
            originPlant: clusterForRouteAddition.originHub.plantCode || '1010',
            destinationCity: clusterForRouteAddition.destinationCities[0] || 'Belo Horizonte',
            destinationUf: 'MG',
            totalWeightKg: Math.round(clusterForRouteAddition.totalWeightTon * 1000),
            capacityKg: clusterForRouteAddition.capacityTon * 1000,
            occupancyPct: clusterForRouteAddition.occupancyPct,
            dischargesCount: clusterForRouteAddition.dischargesCount,
            customersCount: clusterForRouteAddition.clientsCount,
            distanceKm: clusterForRouteAddition.estimatedDistanceKm,
            estimatedTimeHours: Math.round(clusterForRouteAddition.estimatedDistanceKm / 60),
            suggestedFreightBrl: clusterForRouteAddition.estimatedFreightBrl,
            tollCostBrl: clusterForRouteAddition.estimatedTollBrl,
            orders: clusterForRouteAddition.stops.flatMap((s) => s.orders),
          }}
          onSuccess={() => {
            loadRouteAdditions()
            setRouteAdditionModalOpen(false)
            setClusterForRouteAddition(null)
          }}
        />
      )}

      {/* 4. MODAL DE COMPARAÇÃO DE CENÁRIOS (A vs B) COM JUSTIFICATIVA IA E APROVAÇÃO HUMANA OBRIGATÓRIA */}
      {isComparisonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#005596] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-white" />
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <span>
                      Comparador de Cenários: Cenário A (Convencional) × Cenário B (Cargas Mistas
                      IA)
                    </span>
                    <Badge className="bg-white/20 text-white font-mono text-[9px] uppercase border-none">
                      Simulação Multicritério
                    </Badge>
                  </h4>
                  <p className="text-[11px] text-sky-100">
                    Avaliação comparativa de veículos necessários, ocupação, km e frete total.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsComparisonModalOpen(false)}
                className="text-white/80 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Alerta de Governança: Aprovação Humana Obrigatória */}
              <Alert className="border-amber-300 bg-amber-50/90 text-amber-900 py-2.5 px-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="ml-2">
                  <AlertTitle className="text-xs font-bold text-amber-900">
                    Aprovação Humana Obrigatória — Governança CIAFAL
                  </AlertTitle>
                  <AlertDescription className="text-[11px] text-amber-800">
                    A IA calcula e recomenda o agrupamento otimizado, mas nunca confirma ou grava
                    transportes no SAP automaticamente. A decisão de efetivar o transporte cabe
                    exclusivamente ao operador logístico.
                  </AlertDescription>
                </div>
              </Alert>

              {/* Resumo de Economia no Topo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                <div>
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                    Redução de Veículos
                  </span>
                  <strong className="text-xl font-black font-mono text-emerald-900">
                    -{scenarioComparison.savings.vehiclesReduced} veículo(s)
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                    Redução de Viagens
                  </span>
                  <strong className="text-xl font-black font-mono text-emerald-900">
                    -{scenarioComparison.savings.tripsReducedPct}%
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                    Km Reduzidos
                  </span>
                  <strong className="text-xl font-black font-mono text-emerald-900">
                    -{scenarioComparison.savings.distanceReducedKm} km
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                    Economia Estimada
                  </span>
                  <strong className="text-xl font-black font-mono text-emerald-900">
                    R$ {scenarioComparison.savings.freightSavingsBrl.toLocaleString('pt-BR')}
                  </strong>
                </div>
              </div>

              {/* Tabela de Comparação Lado a Lado (Cenário A vs Cenário B) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Cenário A (Convencional SAP) */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <strong className="text-slate-900 font-bold text-xs">
                      Cenário A: Convencional (Itinerário Padrão)
                    </strong>
                    <Badge variant="outline" className="text-[10px] text-slate-600 bg-white">
                      Baseline SAP
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Roteirização segmentada estritamente por código de itinerário original, sem
                    mescla de rotas.
                  </p>
                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Veículos Necessários:</span>
                      <strong className="font-mono text-slate-900">
                        {scenarioComparison.scenarioA.loadsCount} veículos
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Ocupação Média:</span>
                      <strong className="font-mono text-slate-900">
                        {scenarioComparison.scenarioA.avgOccupancyPct}%
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Distância Total:</span>
                      <strong className="font-mono text-slate-900">
                        {scenarioComparison.scenarioA.totalDistanceKm} km
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Custo Total de Frete:</span>
                      <strong className="font-mono text-slate-900">
                        R${' '}
                        {scenarioComparison.scenarioA.estimatedFreightBrl.toLocaleString('pt-BR')}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Custo Médio / Tonelada:</span>
                      <strong className="font-mono text-slate-900">
                        R${' '}
                        {summaryKpis.carteiraLiberadaTon > 0
                          ? (
                              scenarioComparison.scenarioA.estimatedFreightBrl /
                              summaryKpis.carteiraLiberadaTon
                            ).toFixed(2)
                          : '0,00'}{' '}
                        / t
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Paradas Improdutivas:</span>
                      <strong className="font-mono text-amber-700">
                        {scenarioComparison.scenarioA.unproductiveStops} paradas
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Cenário B (Cargas Mistas IA) */}
                <div className="p-3.5 bg-sky-50/40 rounded-xl border border-sky-300 space-y-2">
                  <div className="flex items-center justify-between border-b border-sky-200 pb-1.5">
                    <strong className="text-[#005596] font-bold text-xs">
                      Cenário B: Cargas Mistas Otimizadas (IA)
                    </strong>
                    <Badge className="bg-[#005596] text-white text-[10px]">Recomendado IA</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Agrupamento geográfico multicritério combinando itinerários contíguos com
                    maximização de ocupação.
                  </p>
                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Veículos Necessários:</span>
                      <strong className="font-mono text-[#005596] font-black">
                        {scenarioComparison.scenarioB.loadsCount} veículos
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Ocupação Média:</span>
                      <strong className="font-mono text-emerald-700 font-black">
                        {scenarioComparison.scenarioB.avgOccupancyPct}% (+
                        {scenarioComparison.savings.occupancyGainPctPoints} p.p.)
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Distância Total:</span>
                      <strong className="font-mono text-[#005596] font-black">
                        {scenarioComparison.scenarioB.totalDistanceKm} km
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Custo Total de Frete:</span>
                      <strong className="font-mono text-emerald-700 font-black">
                        R${' '}
                        {scenarioComparison.scenarioB.estimatedFreightBrl.toLocaleString('pt-BR')}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Custo Médio / Tonelada:</span>
                      <strong className="font-mono text-emerald-700 font-black">
                        R${' '}
                        {summaryKpis.carteiraLiberadaTon > 0
                          ? (
                              scenarioComparison.scenarioB.estimatedFreightBrl /
                              summaryKpis.carteiraLiberadaTon
                            ).toFixed(2)
                          : '0,00'}{' '}
                        / t
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Paradas Otimizadas:</span>
                      <strong className="font-mono text-emerald-700">
                        {scenarioComparison.scenarioB.unproductiveStops} paradas (-
                        {scenarioComparison.savings.unproductiveStopsAvoided})
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parecer / Justificativa Explicável da IA */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Justificativa da IA para a Roteirização Mista:</span>
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed italic">
                  "O Cenário B consolida pedidos vizinhos ao longo do mesmo corredor rodoviário,
                  elevando a ocupação média para {scenarioComparison.scenarioB.avgOccupancyPct}% e
                  poupando
                  {scenarioComparison.savings.vehiclesReduced} veículo(s) de grande porte. A
                  economia líquida de frete atinge R${' '}
                  {scenarioComparison.savings.freightSavingsBrl.toLocaleString('pt-BR')}, mantendo
                  as janelas de descarga dos clientes e conformidade fiscal integral."
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsComparisonModalOpen(false)}
                className="text-xs h-8"
              >
                Fechar Comparação
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsComparisonModalOpen(false)
                  if (clusters.length > 0) {
                    handleSendLoadToPlanner(clusters[0])
                  }
                }}
                className="bg-[#005596] hover:bg-[#004275] text-white text-xs h-8 font-bold px-3 shadow-xs"
              >
                Aprovar & Aplicar Cenário B no Planejador
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO DE CARGA MISTA (Passo 2) */}
      <CreateMixedLoadModal
        open={createMixedLoadModalOpen}
        onOpenChange={setCreateMixedLoadModalOpen}
        orders={orders}
        itineraries={itineraries}
        defaultItinerary={filterItinerary}
        userEmail="operador@ciafal.logistica"
        userName="Operador Logístico"
        onLoadCreated={(loadId) => {
          loadRouteAdditions()
          toast({
            title: 'Carga Mista Integrada',
            description: `Carga ${loadId} gerada e pronta na carteira de simulações.`,
          })
        }}
      />

      {/* Drawer de Cidade mantido para retrocompatibilidade */}
      <CityDetailDrawer
        city={selectedCityForDrawer}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSimulateLoad={(selectedOrd, label) => {
          setIsDrawerOpen(false)
          onSimulateLoadFromMap(selectedOrd, label)
        }}
        onOpenCustomerProfile={onOpenCustomerProfile}
      />
    </div>
  )
}
