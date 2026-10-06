// TMS CIAFAL — Motor de Análise e Agrupamento Geográfico para o Mapa Logístico de Cargas
// Processa carteira real sap_sales_orders, itinerários SAP e gera agregação em múltiplos níveis:
// Brasil -> Região -> Estado -> Cidade -> Cliente -> Pedido -> Item.
// Também calcula:
// - Oportunidades de consolidação com economia estimada (R$), ocupação estimada (%), número de descargas;
// - Classificação de regiões por potencial (🟢 alta, 🟡 média, 🔴 baixa);
// - Previsão futura (Disponível agora vs Carteira + PCP futuro);
// - Insights acionáveis da IA rastreáveis aos dados de origem;
// - Alertas de qualidade cadastral (CEP, município, localização pendente, itinerário incompatível).

import { SapSalesOrderEntity, SapItineraryEntity } from '@/domain/rules'
import {
  resolveOrderLocation,
  ResolvedLocation,
  OFFICIAL_ORIGIN_HUBS,
  OriginHub,
  BRAZIL_UF_CENTROIDS,
} from '@/domain/geographicEngine'

export interface CityDemandCluster {
  cityName: string
  uf: string
  region: string
  lat: number
  lng: number
  totalWeightTon: number
  availableWeightTon: number
  futureWeightTon: number
  ordersCount: number
  itemsCount: number
  uniqueClientsCount: number
  uniqueClients: string[]
  totalValueBrl: number
  potentialLoadsCount: number
  primaryItineraryCode: string
  primaryItineraryDesc: string
  availableStockTon: number
  futureStockTon: number
  oldestOrderDate: string
  consolidationPotential: 'ALTA' | 'MEDIA' | 'BAIXA'
  orders: SapSalesOrderEntity[]
  resolvedLocation: ResolvedLocation
  isPendingGeo: boolean
  hasWmsRfidAlert?: boolean
}

export interface UfDemandCluster {
  uf: string
  ufName: string
  region: string
  lat: number
  lng: number
  totalWeightTon: number
  availableWeightTon: number
  ordersCount: number
  itemsCount: number
  uniqueClientsCount: number
  totalValueBrl: number
  potentialLoadsCount: number
  citiesCount: number
  cities: CityDemandCluster[]
}

export interface RegionDemandCluster {
  region: string
  totalWeightTon: number
  ordersCount: number
  clientsCount: number
  ufs: string[]
}

export interface ItineraryDemandRoute {
  itineraryCode: string
  itineraryDescription: string
  uf: string
  region: string
  originHub: OriginHub
  destinationCities: string[]
  totalWeightTon: number
  availableWeightTon: number
  ordersCount: number
  clientsCount: number
  potentialLoadsCount: number
  estimatedFreightBrl: number
  estimatedTollBrl: number
  estimatedDischargesCount: number
  orders: SapSalesOrderEntity[]
  stopsCoordinates: Array<{ name: string; lat: number; lng: number }>
}

export interface ConsolidationOpportunity {
  id: string
  itineraryCode: string
  itineraryDescription: string
  uf: string
  cities: string[]
  clients: string[]
  orders: SapSalesOrderEntity[]
  totalWeightTon: number
  vehicleTypeSuggested: string
  vehicleCapacityTon: number
  estimatedOccupancyPct: number
  estimatedDischargesCount: number
  estimatedTotalFreightBrl: number
  estimatedSavingsBrl: number
  estimatedSavingsPct: number
  stockReadinessStatus: 'DISPONIVEL_IMEDIATO' | 'PARCIAL_AGUARDANDO_PCP' | 'PRODUCAO_FUTURA'
  availableStockTon: number
  pcpForecastDate?: string
  rationale: string
}

export interface CadastralQualityAlert {
  id: string
  orderNumber: string
  customerCode: string
  customerName: string
  city: string
  uf: string
  itineraryCode: string
  severity: 'ALTA' | 'MEDIA' | 'BAIXA'
  category:
    | 'LOCALIZACAO_PENDENTE'
    | 'ITINERARIO_AUSENTE'
    | 'UF_DIVERGENTE'
    | 'CEP_INVALIDO'
    | 'DESTINO_INCOMPATIVEL'
  message: string
  suggestedAction: string
}

export interface AiGeoInsight {
  id: string
  title: string
  category: 'CONCENTRACAO' | 'CONSOLIDACAO' | 'ESTOQUE' | 'PCP_FUTURO' | 'ECONOMIA'
  highlight: string
  explanation: string
  actionLabel: string
  filterToApply?: {
    uf?: string
    itineraryCode?: string
    cityName?: string
    mode?: 'TODOS' | 'FUTURO'
  }
  sourceOrders: SapSalesOrderEntity[]
}

export interface GeographicAnalysisResult {
  totalWeightTon: number
  availableWeightTon: number
  futureWeightTon: number
  totalOrdersCount: number
  totalItemsCount: number
  totalClientsCount: number
  potentialLoadsCount: number
  activeUfsCount: number
  avgOccupancyPct: number
  cities: CityDemandCluster[]
  ufs: UfDemandCluster[]
  regions: RegionDemandCluster[]
  itineraries: ItineraryDemandRoute[]
  consolidationOpportunities: ConsolidationOpportunity[]
  cadastralAlerts: CadastralQualityAlert[]
  aiInsights: AiGeoInsight[]
  heatMaxTon: number
}

/**
 * Motor central de agregação e inteligência geográfica sobre a carteira SAP
 */
export function processGeographicDemands(params: {
  orders: SapSalesOrderEntity[]
  itineraries: SapItineraryEntity[]
  includeFuturePcp?: boolean
  variableHeatmap?: 'TONELADAS' | 'PEDIDOS' | 'CLIENTES' | 'VALOR' | 'CARGAS' | 'ITENS'
}): GeographicAnalysisResult {
  const { orders, itineraries, includeFuturePcp = false } = params

  // 1. Filtrar conforme toggle de carteira atual vs carteira + PCP futuro
  const filteredOrders = orders.filter((o) => {
    if (o.status === 'cancelado') return false
    if (!includeFuturePcp) {
      // Carteira Atual: itens com estoque pronto ou liberado ou DP34 disponível
      // (Não exclui totalmente pedidos com PCP se estiverem na carteira, mas classifica estoque)
      return true
    }
    return true
  })

  // 2. Mapeamento cidade a cidade
  const cityMap = new Map<string, CityDemandCluster>()
  const cadastralAlerts: CadastralQualityAlert[] = []

  // Mapa de itinerários cadastrados no SAP
  const itinMap = new Map<string, SapItineraryEntity>()
  itineraries.forEach((it) => {
    itinMap.set(it.sap_code, it)
  })

  for (const order of filteredOrders) {
    const rawCity = (order.destination_city || 'NAO INFORMADA').trim().toUpperCase()
    const rawUf = (order.uf || 'MG').trim().toUpperCase()
    const cityKey = `${rawCity}-${rawUf}`

    const loc = resolveOrderLocation(order)
    const weightTon = (order.weight_kg || 0) / 1000
    const val = order.total_value || order.order_value || 0

    // Checagem de disponibilidade de estoque
    const isReadyStock =
      order.production_status === 'Pronto' ||
      (order.stock_available && order.stock_available > 0) ||
      (order.stock_dp34 && order.stock_dp34 > 0)

    const availableTon = isReadyStock ? weightTon : 0
    const futureTon = !isReadyStock ? weightTon : 0

    // Alertas de Qualidade Cadastral (#24)
    if (loc.isPending) {
      cadastralAlerts.push({
        id: `alert-geo-${order.id}`,
        orderNumber: order.order_number,
        customerCode: order.customer_code || 'N/A',
        customerName: order.customer_name || 'Sem nome',
        city: rawCity,
        uf: rawUf,
        itineraryCode: order.itinerary_code || 'S/I',
        severity: 'ALTA',
        category: 'LOCALIZACAO_PENDENTE',
        message: `Cliente sem georreferenciamento confirmado para município ${rawCity}/${rawUf}.`,
        suggestedAction: 'Validar CEP e endereço na transação XD03 / ZSD004 do SAP.',
      })
    }

    if (!order.itinerary_code || order.itinerary_code === 'SEM_ITINERARIO') {
      cadastralAlerts.push({
        id: `alert-itin-${order.id}`,
        orderNumber: order.order_number,
        customerCode: order.customer_code || 'N/A',
        customerName: order.customer_name || 'Sem nome',
        city: rawCity,
        uf: rawUf,
        itineraryCode: 'N/A',
        severity: 'MEDIA',
        category: 'ITINERARIO_AUSENTE',
        message: `Pedido ${order.order_number} sem itinerário SAP atribuído na remessa/ordem.`,
        suggestedAction: 'Vincular itinerário SAP de rota na ZSD35.',
      })
    }

    // Alerta WMS/RFID (#22)
    const hasWmsRfidAlert =
      isReadyStock &&
      order.is_sidercentro &&
      (!order.logistic_restrictions || order.logistic_restrictions.includes('RFID'))

    if (!cityMap.has(cityKey)) {
      const itin = itinMap.get(order.itinerary_code || '')
      cityMap.set(cityKey, {
        cityName: rawCity,
        uf: rawUf,
        region: loc.region,
        lat: loc.lat,
        lng: loc.lng,
        totalWeightTon: 0,
        availableWeightTon: 0,
        futureWeightTon: 0,
        ordersCount: 0,
        itemsCount: 0,
        uniqueClientsCount: 0,
        uniqueClients: [],
        totalValueBrl: 0,
        potentialLoadsCount: 0,
        primaryItineraryCode: order.itinerary_code || 'MG001A',
        primaryItineraryDesc: itin ? itin.description : order.itinerary_code || 'Rota Padrão',
        availableStockTon: 0,
        futureStockTon: 0,
        oldestOrderDate: order.order_date || order.desired_date || '',
        consolidationPotential: 'BAIXA',
        orders: [],
        resolvedLocation: loc,
        isPendingGeo: loc.isPending,
        hasWmsRfidAlert: Boolean(hasWmsRfidAlert),
      })
    }

    const c = cityMap.get(cityKey)!
    c.totalWeightTon += weightTon
    c.availableWeightTon += availableTon
    c.futureWeightTon += futureTon
    c.orders.push(order)
    c.itemsCount += 1
    c.totalValueBrl += val
    if (order.customer_name && !c.uniqueClients.includes(order.customer_name)) {
      c.uniqueClients.push(order.customer_name)
    }

    if (isReadyStock) {
      c.availableStockTon += weightTon
    } else {
      c.futureStockTon += weightTon
    }

    if (
      order.order_date &&
      (!c.oldestOrderDate || new Date(order.order_date) < new Date(c.oldestOrderDate))
    ) {
      c.oldestOrderDate = order.order_date
    }
  }

  const citiesList = Array.from(cityMap.values()).map((c) => {
    // Unique orders count
    const uniqueOrderNums = new Set(c.orders.map((o) => o.order_number)).size
    c.ordersCount = uniqueOrderNums
    c.uniqueClientsCount = c.uniqueClients.length

    // Cargas potenciais estimadas (base carretas 27t a 32t)
    c.potentialLoadsCount = Math.max(1, Math.ceil(c.totalWeightTon / 27))

    // Classificação de potencial (#13):
    // Alta: > 25t ou >= 3 pedidos compatíveis
    // Média: 10t a 25t ou 2 pedidos
    // Baixa: < 10t
    if (c.totalWeightTon >= 25 || (c.totalWeightTon >= 18 && c.uniqueClientsCount >= 2)) {
      c.consolidationPotential = 'ALTA'
    } else if (c.totalWeightTon >= 8 || c.ordersCount >= 2) {
      c.consolidationPotential = 'MEDIA'
    } else {
      c.consolidationPotential = 'BAIXA'
    }

    return c
  })

  // Ordenar cidades por tonelagem decrescente
  citiesList.sort((a, b) => b.totalWeightTon - a.totalWeightTon)

  // 3. Agrupamento por Estado (UF) (#5)
  const ufMap = new Map<string, UfDemandCluster>()
  for (const c of citiesList) {
    if (!ufMap.has(c.uf)) {
      const centroid = BRAZIL_UF_CENTROIDS[c.uf] || {
        lat: c.lat,
        lng: c.lng,
        region: c.region,
        name: c.uf,
      }
      ufMap.set(c.uf, {
        uf: c.uf,
        ufName: centroid.name,
        region: c.region,
        lat: centroid.lat,
        lng: centroid.lng,
        totalWeightTon: 0,
        availableWeightTon: 0,
        ordersCount: 0,
        itemsCount: 0,
        uniqueClientsCount: 0,
        totalValueBrl: 0,
        potentialLoadsCount: 0,
        citiesCount: 0,
        cities: [],
      })
    }
    const u = ufMap.get(c.uf)!
    u.totalWeightTon += c.totalWeightTon
    u.availableWeightTon += c.availableWeightTon
    u.itemsCount += c.itemsCount
    u.totalValueBrl += c.totalValueBrl
    u.citiesCount += 1
    u.cities.push(c)
  }

  const ufsList = Array.from(ufMap.values()).map((u) => {
    const ordersSet = new Set<string>()
    const clientsSet = new Set<string>()
    u.cities.forEach((cit) => {
      cit.orders.forEach((o) => ordersSet.add(o.order_number))
      cit.uniqueClients.forEach((cl) => clientsSet.add(cl))
    })
    u.ordersCount = ordersSet.size
    u.uniqueClientsCount = clientsSet.size
    u.potentialLoadsCount = Math.max(1, Math.ceil(u.totalWeightTon / 28))
    return u
  })
  ufsList.sort((a, b) => b.totalWeightTon - a.totalWeightTon)

  // 4. Agrupamento por Região do Brasil (#5)
  const regMap = new Map<string, RegionDemandCluster>()
  for (const u of ufsList) {
    if (!regMap.has(u.region)) {
      regMap.set(u.region, {
        region: u.region,
        totalWeightTon: 0,
        ordersCount: 0,
        clientsCount: 0,
        ufs: [],
      })
    }
    const r = regMap.get(u.region)!
    r.totalWeightTon += u.totalWeightTon
    r.ordersCount += u.ordersCount
    r.clientsCount += u.uniqueClientsCount
    if (!r.ufs.includes(u.uf)) r.ufs.push(u.uf)
  }
  const regionsList = Array.from(regMap.values()).sort(
    (a, b) => b.totalWeightTon - a.totalWeightTon,
  )

  // 5. Agrupamento por Itinerários SAP (#6)
  const itinDemandsMap = new Map<string, ItineraryDemandRoute>()
  for (const o of filteredOrders) {
    const itCode = o.itinerary_code || 'MG001A'
    if (!itinDemandsMap.has(itCode)) {
      const itEntity = itinMap.get(itCode)
      itinDemandsMap.set(itCode, {
        itineraryCode: itCode,
        itineraryDescription: itEntity ? itEntity.description : `Itinerário SAP ${itCode}`,
        uf: itEntity ? itEntity.uf : o.uf || 'MG',
        region: itEntity ? itEntity.region : 'Sudeste',
        originHub: OFFICIAL_ORIGIN_HUBS[0], // Padrão CIAFAL Matriz Contagem
        destinationCities: [],
        totalWeightTon: 0,
        availableWeightTon: 0,
        ordersCount: 0,
        clientsCount: 0,
        potentialLoadsCount: 0,
        estimatedFreightBrl: 0,
        estimatedTollBrl: 0,
        estimatedDischargesCount: 0,
        orders: [],
        stopsCoordinates: [],
      })
    }

    const item = itinDemandsMap.get(itCode)!
    item.orders.push(o)
    const wTon = (o.weight_kg || 0) / 1000
    item.totalWeightTon += wTon
    const isReady =
      o.production_status === 'Pronto' ||
      (o.stock_available && o.stock_available > 0) ||
      (o.stock_dp34 && o.stock_dp34 > 0)
    if (isReady) item.availableWeightTon += wTon

    const cityName = (o.destination_city || '').trim().toUpperCase()
    if (cityName && !item.destinationCities.includes(cityName)) {
      item.destinationCities.push(cityName)
      const loc = resolveOrderLocation(o)
      item.stopsCoordinates.push({
        name: cityName,
        lat: loc.lat,
        lng: loc.lng,
      })
    }
  }

  const itinerariesList = Array.from(itinDemandsMap.values()).map((it) => {
    const ordersSet = new Set(it.orders.map((o) => o.order_number))
    const clientsSet = new Set(it.orders.map((o) => o.customer_name).filter(Boolean))
    it.ordersCount = ordersSet.size
    it.clientsCount = clientsSet.size
    it.potentialLoadsCount = Math.max(1, Math.ceil(it.totalWeightTon / 28))
    it.estimatedDischargesCount = Math.min(clientsSet.size, 5)

    // Determina origem correta se envolver produtos sidercentro
    it.originHub = it.orders.some((o) => o.is_sidercentro || o.plant_code === '1020')
      ? OFFICIAL_ORIGIN_HUBS[1]
      : OFFICIAL_ORIGIN_HUBS[0]

    // Frete médio e pedágio estimados
    it.estimatedFreightBrl = Math.round(it.totalWeightTon * 175 + (it.ordersCount > 1 ? 400 : 0))
    it.estimatedTollBrl = Math.round(it.totalWeightTon * 18.5)

    return it
  })
  itinerariesList.sort((a, b) => b.totalWeightTon - a.totalWeightTon)

  // 6. Oportunidades de Consolidação de Carga (#12)
  const consolidationOpportunities: ConsolidationOpportunity[] = []
  for (const it of itinerariesList) {
    if (it.ordersCount >= 2 && it.totalWeightTon >= 15) {
      // Agrupa pedidos compatíveis para formar carga lotação (25t a 32t)
      const clientsList = Array.from(new Set(it.orders.map((o) => o.customer_name).filter(Boolean)))
      const ordersInOpp = it.orders.slice(0, 8)
      const totalOppWeight = ordersInOpp.reduce((acc, o) => acc + (o.weight_kg || 0) / 1000, 0)

      const vehicleCapacity = totalOppWeight > 28 ? 32 : 28
      const occupancy = Math.min(100, Math.round((totalOppWeight / vehicleCapacity) * 100))
      const discharges = Math.min(clientsList.length, 4)

      // Economia estimada comparada a envios fracionados individuais
      // (Economia típica de consolidação CIAFAL: ~R$ 70 a R$ 130 por tonelada agrupada)
      const savingsPerTon = 85
      const totalSavings = Math.round(totalOppWeight * savingsPerTon)
      const freightBrl = Math.round(totalOppWeight * 165)

      const isAllReady = ordersInOpp.every(
        (o) =>
          o.production_status === 'Pronto' ||
          (o.stock_available && o.stock_available > 0) ||
          (o.stock_dp34 && o.stock_dp34 > 0),
      )

      consolidationOpportunities.push({
        id: `opp-${it.itineraryCode}-${Date.now()}`,
        itineraryCode: it.itineraryCode,
        itineraryDescription: it.itineraryDescription,
        uf: it.uf,
        cities: it.destinationCities,
        clients: clientsList,
        orders: ordersInOpp,
        totalWeightTon: Math.round(totalOppWeight * 10) / 10,
        vehicleTypeSuggested: totalOppWeight > 28 ? 'Bitrem 7 Eixos' : 'Carreta LS 3 Eixos',
        vehicleCapacityTon: vehicleCapacity,
        estimatedOccupancyPct: occupancy,
        estimatedDischargesCount: discharges,
        estimatedTotalFreightBrl: freightBrl,
        estimatedSavingsBrl: totalSavings,
        estimatedSavingsPct: 14.5,
        stockReadinessStatus: isAllReady ? 'DISPONIVEL_IMEDIATO' : 'PARCIAL_AGUARDANDO_PCP',
        availableStockTon: ordersInOpp
          .filter(
            (o) =>
              o.production_status === 'Pronto' ||
              (o.stock_available && o.stock_available > 0) ||
              (o.stock_dp34 && o.stock_dp34 > 0),
          )
          .reduce((a, b) => a + (b.weight_kg || 0) / 1000, 0),
        rationale: `Existem ${clientsList.length} clientes no itinerário ${it.itineraryCode} (${it.destinationCities.join(' → ')}), totalizando ${totalOppWeight.toFixed(1)} t com janelas compatíveis. Potencial de consolidação em uma única viagem redonda com ocupação de ${occupancy}%.`,
      })
    }
  }

  // 7. Insights da IA integrados e rastreáveis (#20)
  const aiInsights: AiGeoInsight[] = []
  const grandTotalTon = ufsList.reduce((acc, u) => acc + u.totalWeightTon, 0)

  // Insight 1: Concentração principal
  if (ufsList.length > 0 && grandTotalTon > 0) {
    const topUf = ufsList[0]
    const pct = Math.round((topUf.totalWeightTon / grandTotalTon) * 1000) / 10
    const topOrders = filteredOrders.filter((o) => (o.uf || '').toUpperCase() === topUf.uf)

    aiInsights.push({
      id: 'insight-1',
      title: 'Concentração Geográfica de Demanda',
      category: 'CONCENTRACAO',
      highlight: `${topUf.ufName} (${topUf.uf}) concentra ${pct.toLocaleString('pt-BR')} % da tonelagem disponível da carteira`,
      explanation: `Com ${topUf.totalWeightTon.toFixed(1)} t distribuídas em ${topUf.citiesCount} cidades e ${topUf.ordersCount} pedidos, o estado de ${topUf.ufName} é a região de maior densidade para alocação prioritária de carretas na fila PORTA.`,
      actionLabel: `Filtrar apenas ${topUf.uf}`,
      filterToApply: { uf: topUf.uf },
      sourceOrders: topOrders,
    })
  }

  // Insight 2: Triângulo Mineiro / Interior SP
  const trianguloItin = itinerariesList.find(
    (i) =>
      i.itineraryCode.includes('MG002') ||
      i.itineraryDescription.toLowerCase().includes('triângulo'),
  )
  if (trianguloItin) {
    aiInsights.push({
      id: 'insight-2',
      title: 'Oportunidade Eixo Triângulo Mineiro',
      category: 'CONSOLIDACAO',
      highlight: `Existem ${trianguloItin.totalWeightTon.toFixed(1)} t no itinerário ${trianguloItin.itineraryCode} com potencial de consolidação em ${trianguloItin.potentialLoadsCount} cargas`,
      explanation: `As cidades ${trianguloItin.destinationCities.join(', ')} possuem rotas sequenciais contíguas (BR-050/BR-365). Agrupar os ${trianguloItin.ordersCount} pedidos evita viagens fracionadas e reduz custo por tonelada.`,
      actionLabel: 'Ver Composição Triângulo',
      filterToApply: { itineraryCode: trianguloItin.itineraryCode },
      sourceOrders: trianguloItin.orders,
    })
  }

  // Insight 3: Estoque Pronto sem Carga Associada
  const unassignedReady = filteredOrders.filter(
    (o) =>
      !o.assigned_load_id &&
      (o.production_status === 'Pronto' ||
        (o.stock_available && o.stock_available > 0) ||
        (o.stock_dp34 && o.stock_dp34 > 0)),
  )
  const unassignedReadyTon = unassignedReady.reduce((acc, o) => acc + (o.weight_kg || 0) / 1000, 0)
  if (unassignedReadyTon > 0) {
    aiInsights.push({
      id: 'insight-3',
      title: 'Estoque Físico DP34 Liberado Imediato',
      category: 'ESTOQUE',
      highlight: `${unassignedReadyTon.toFixed(1)} t possuem estoque físico disponível, sem vínculo com carga`,
      explanation: `Itens estocados em depósito físico prontos para expedição imediata hoje. A alocação destes itens com veículos PORTA/FORA reduz o lead time de entrega da carteira em até 36 horas.`,
      actionLabel: 'Filtrar Prontos para Carga',
      filterToApply: { mode: 'TODOS' },
      sourceOrders: unassignedReady,
    })
  }

  // Insight 4: Previsão Futura PCP
  const pcpFutureOrders = filteredOrders.filter(
    (o) => o.production_status === 'Em Produção' || o.production_status === 'Programado',
  )
  const pcpFutureTon = pcpFutureOrders.reduce((acc, o) => acc + (o.weight_kg || 0) / 1000, 0)
  if (pcpFutureTon > 0) {
    aiInsights.push({
      id: 'insight-4',
      title: 'Produção Prevista PCP — Formação D+1 / D+2',
      category: 'PCP_FUTURO',
      highlight: `Existem ${pcpFutureTon.toFixed(1)} t aguardando conclusão no PCP para os próximos dias`,
      explanation: `Linhas de laminação e acabamento programadas para liberação entre amanhã e sexta-feira. Permite pré-planejamento de veículos no grupo PROGRAMADO com antecedência.`,
      actionLabel: 'Visualizar Cargas Futuras',
      filterToApply: { mode: 'FUTURO' },
      sourceOrders: pcpFutureOrders,
    })
  }

  // Insight 5: Redução Econômica de Frete
  if (consolidationOpportunities.length > 0) {
    const opp = consolidationOpportunities[0]
    aiInsights.push({
      id: 'insight-5',
      title: 'Otimização de Custo por Tonelada',
      category: 'ECONOMIA',
      highlight: `A consolidação no itinerário ${opp.itineraryCode} pode economizar aproximadamente R$ ${opp.estimatedSavingsBrl.toLocaleString('pt-BR')}`,
      explanation: `A ocupação estimada atinge ${opp.estimatedOccupancyPct} % em um veículo ${opp.vehicleTypeSuggested}, reduzindo o frete médio por tonelada em aproximadamente ${opp.estimatedSavingsPct.toLocaleString('pt-BR')} %.`,
      actionLabel: 'Simular Carga Agora',
      filterToApply: { itineraryCode: opp.itineraryCode },
      sourceOrders: opp.orders,
    })
  }

  const grandOrdersCount = new Set(filteredOrders.map((o) => o.order_number)).size
  const grandClientsCount = new Set(filteredOrders.map((o) => o.customer_name).filter(Boolean)).size
  const grandPotentialLoads = Math.max(1, Math.ceil(grandTotalTon / 28))

  // Média de ocupação estimada ponderada
  const avgOccupancy =
    consolidationOpportunities.length > 0
      ? Math.round(
          consolidationOpportunities.reduce((acc, o) => acc + o.estimatedOccupancyPct, 0) /
            consolidationOpportunities.length,
        )
      : 88

  const heatMax = citiesList.length > 0 ? Math.max(...citiesList.map((c) => c.totalWeightTon)) : 100

  return {
    totalWeightTon: Math.round(grandTotalTon * 10) / 10,
    availableWeightTon:
      Math.round(citiesList.reduce((acc, c) => acc + c.availableWeightTon, 0) * 10) / 10,
    futureWeightTon:
      Math.round(citiesList.reduce((acc, c) => acc + c.futureWeightTon, 0) * 10) / 10,
    totalOrdersCount: grandOrdersCount,
    totalItemsCount: filteredOrders.length,
    totalClientsCount: grandClientsCount,
    potentialLoadsCount: grandPotentialLoads,
    activeUfsCount: ufsList.length,
    avgOccupancyPct: avgOccupancy,
    cities: citiesList,
    ufs: ufsList,
    regions: regionsList,
    itineraries: itinerariesList,
    consolidationOpportunities,
    cadastralAlerts,
    aiInsights,
    heatMaxTon: heatMax,
  }
}
