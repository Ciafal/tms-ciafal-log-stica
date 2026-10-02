/**
 * Motor analítico e de IA para o Relatório Geral Transporte (SAP ZSD40 & Bases TMS).
 *
 * Regra fundamental: ZERO dados fictícios ou valores mockados.
 * Opera exclusivamente sobre o dataset filtrado ativo.
 * Quando faltar dado, registra explicitamente: "Dados insuficientes para esta análise."
 */

import {
  GeneralTransportRecord,
  GeneralTransportFilterParams,
} from './generalTransportReportEngine'

export interface OperationalMetrics {
  totalTransports: number
  completed: number
  inExpedition: number
  inTrip: number
  withOccurrence: number
  otherStatus: number
  distributionByCenter: Record<string, number>
  distributionByItinerary: Record<string, number>
  distributionByPlate: Record<string, number>
  distributionByVehicleType: Record<string, number>
}

export interface WeightAnomaly {
  transportNumber: string
  sapNumber: string
  plate: string
  itinerary: string
  grossWeight: number
  tareWeight: number
  netWeight: number
  nfWeight: number
  diffTon: number
  diffPct: number
  reason: string
  observation: string
}

export interface WeighingAnalysis {
  totalGrossTon: number
  totalTareTon: number
  totalNetTon: number
  totalNfTon: number
  totalDiffTon: number
  avgDiffPct: number
  withoutScaleCount: number
  withScaleCount: number
  scaleReasonsBreakdown: Record<string, number>
  divergentTransportsCount: number
  anomalies: WeightAnomaly[]
}

export interface TimeOutlier {
  transportNumber: string
  plate: string
  center: string
  itinerary: string
  dwellTimeMin: number
  loadingTimeMin: number
  avgComparisonDiffPct: number
}

export interface TimeAnalysis {
  avgTotalDwellMin: number
  avgLoadingTimeMin: number
  avgInitialToFirstEndMin: number
  byCenter: Record<string, { count: number; avgDwell: number; avgLoading: number }>
  byItinerary: Record<string, { count: number; avgDwell: number; avgLoading: number }>
  byVehicleType: Record<string, { count: number; avgDwell: number; avgLoading: number }>
  byDriver: Record<string, { count: number; avgDwell: number; name: string }>
  outliers: TimeOutlier[]
  busiestHours: { hour: string; count: number }[]
  topBottleneckCenter: string | null
  topBottleneckItinerary: string | null
}

export interface FinancialAnomaly {
  transportNumber: string
  itinerary: string
  vehicleType: string
  costPerTon: number
  costPerKm: number
  occupancyPct: number
  freightCost: number
  reason: string
}

export interface FinancialAnalysis {
  totalFreight: number
  totalToll: number
  totalCost: number
  totalWeightTon: number
  totalDistanceKm: number
  avgCostPerTon: number | null
  avgCostPerKm: number | null
  avgOccupancyPct: number
  lowOccupancyCount: number // < 70%
  highCostItineraries: { itinerary: string; costPerTon: number; count: number }[]
  lowUtilizationVehicles: { plate: string; vehicleType: string; avgOccupancy: number }[]
  anomalies: FinancialAnomaly[]
  sufficientDataForCostPerTon: boolean
  sufficientDataForCostPerKm: boolean
}

export interface ExecutiveSummary {
  transportsCount: number
  totalNetWeightTon: number
  avgOccupancyPct: number
  totalFreightCost: number
  avgOperationalDwellMin: number
  divergentWeightTransportsCount: number
}

export interface AiReportAnalysisResult {
  hasData: boolean
  filteredCount: number
  activeFiltersFormatted: string[]
  executiveSummary: ExecutiveSummary
  operational: OperationalMetrics
  weighing: WeighingAnalysis
  times: TimeAnalysis
  financial: FinancialAnalysis
  topInsights: string[] // máx 5
  anomaliesDetected: string[]
  attentionPoints: string[]
  actionSuggestions: string[]
}

/**
 * Formata os parâmetros de filtro em lista legível
 */
export function formatActiveFilters(filters: GeneralTransportFilterParams): string[] {
  const list: string[] = []

  if (filters.transport && filters.transport.trim()) {
    list.push(`Nº Transporte: ${filters.transport.trim()}`)
  }
  if (filters.startDate || filters.endDate) {
    const s = filters.startDate
      ? new Date(filters.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
      : 'Início'
    const e = filters.endDate
      ? new Date(filters.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
      : 'Atual'
    list.push(`Período Transporte: ${s} a ${e}`)
  }
  if (filters.startInvoicingDate || filters.endInvoicingDate) {
    const s = filters.startInvoicingDate
      ? new Date(filters.startInvoicingDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
      : 'Início'
    const e = filters.endInvoicingDate
      ? new Date(filters.endInvoicingDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
      : 'Atual'
    list.push(`Período Faturamento: ${s} a ${e}`)
  }
  if (filters.statuses && filters.statuses.length > 0) {
    list.push(`Status: ${filters.statuses.join(', ')}`)
  } else {
    list.push('Status: Todos')
  }
  if (filters.scaleLogFilter === 'WITH_LOG') {
    list.push('Balança: Com Balança')
  } else if (filters.scaleLogFilter === 'WITHOUT_LOG') {
    list.push('Balança: Sem Balança')
  } else {
    list.push('Balança: Todos os Registros')
  }
  if (filters.scaleReasons && filters.scaleReasons.length > 0) {
    list.push(`Motivo Balança: ${filters.scaleReasons.join(', ')}`)
  }
  if (filters.plate && filters.plate.trim()) {
    list.push(`Placa: ${filters.plate.trim().toUpperCase()}`)
  }

  return list.length > 0 ? list : ['Filtros: Nenhum (Todos os registros)']
}

/**
 * Motor de IA e Diagnóstico Estatístico
 */
export function generateTransportAiAnalysis(
  records: GeneralTransportRecord[],
  filters: GeneralTransportFilterParams,
): AiReportAnalysisResult {
  const activeFiltersFormatted = formatActiveFilters(filters)

  if (!records || records.length === 0) {
    return {
      hasData: false,
      filteredCount: 0,
      activeFiltersFormatted,
      executiveSummary: {
        transportsCount: 0,
        totalNetWeightTon: 0,
        avgOccupancyPct: 0,
        totalFreightCost: 0,
        avgOperationalDwellMin: 0,
        divergentWeightTransportsCount: 0,
      },
      operational: {
        totalTransports: 0,
        completed: 0,
        inExpedition: 0,
        inTrip: 0,
        withOccurrence: 0,
        otherStatus: 0,
        distributionByCenter: {},
        distributionByItinerary: {},
        distributionByPlate: {},
        distributionByVehicleType: {},
      },
      weighing: {
        totalGrossTon: 0,
        totalTareTon: 0,
        totalNetTon: 0,
        totalNfTon: 0,
        totalDiffTon: 0,
        avgDiffPct: 0,
        withoutScaleCount: 0,
        withScaleCount: 0,
        scaleReasonsBreakdown: {},
        divergentTransportsCount: 0,
        anomalies: [],
      },
      times: {
        avgTotalDwellMin: 0,
        avgLoadingTimeMin: 0,
        avgInitialToFirstEndMin: 0,
        byCenter: {},
        byItinerary: {},
        byVehicleType: {},
        byDriver: {},
        outliers: [],
        busiestHours: [],
        topBottleneckCenter: null,
        topBottleneckItinerary: null,
      },
      financial: {
        totalFreight: 0,
        totalToll: 0,
        totalCost: 0,
        totalWeightTon: 0,
        totalDistanceKm: 0,
        avgCostPerTon: null,
        avgCostPerKm: null,
        avgOccupancyPct: 0,
        lowOccupancyCount: 0,
        highCostItineraries: [],
        lowUtilizationVehicles: [],
        anomalies: [],
        sufficientDataForCostPerTon: false,
        sufficientDataForCostPerKm: false,
      },
      topInsights: ['Nenhum registro encontrado para os filtros selecionados.'],
      anomaliesDetected: [],
      attentionPoints: ['Ajuste os parâmetros de pesquisa para visualizar análises analíticas.'],
      actionSuggestions: [
        'Amplie o período ou remova filtros restritivos para obter amostra operacional.',
      ],
    }
  }

  // 1. Operação
  let completed = 0
  let inExpedition = 0
  let inTrip = 0
  let withOccurrence = 0
  let otherStatus = 0
  const distributionByCenter: Record<string, number> = {}
  const distributionByItinerary: Record<string, number> = {}
  const distributionByPlate: Record<string, number> = {}
  const distributionByVehicleType: Record<string, number> = {}

  records.forEach((r) => {
    const st = (r.transport_status || '').toUpperCase()
    if (st.includes('CONCLU')) completed++
    else if (st.includes('EXPED')) inExpedition++
    else if (st.includes('VIAGEM') || st.includes('ROTA')) inTrip++
    else if (st.includes('OCORR') || st.includes('ENCERRADO_COM_OCORRENCIA')) withOccurrence++
    else otherStatus++

    const c = r.center_code || r.center_description || 'N/A'
    distributionByCenter[c] = (distributionByCenter[c] || 0) + 1

    const itin = r.itinerary_description || r.itinerary_code || 'N/A'
    distributionByItinerary[itin] = (distributionByItinerary[itin] || 0) + 1

    const plt = r.external_id_1 || 'N/A'
    distributionByPlate[plt] = (distributionByPlate[plt] || 0) + 1

    const vt = r.vehicle_type || 'N/A'
    distributionByVehicleType[vt] = (distributionByVehicleType[vt] || 0) + 1
  })

  // 2. Pesagem
  let totalGrossTon = 0
  let totalTareTon = 0
  let totalNetTon = 0
  let totalNfTon = 0
  let totalDiffTon = 0
  let sumDiffPct = 0
  let withScaleCount = 0
  let withoutScaleCount = 0
  let divergentTransportsCount = 0
  const scaleReasonsBreakdown: Record<string, number> = {}
  const weightAnomalies: WeightAnomaly[] = []

  // Calcular média de divergência por itinerário para identificar outliers relativos
  const itineraryDiffMap: Record<string, { sumDiffTon: number; count: number }> = {}
  records.forEach((r) => {
    const key = r.itinerary_code || 'GERAL'
    if (!itineraryDiffMap[key]) itineraryDiffMap[key] = { sumDiffTon: 0, count: 0 }
    itineraryDiffMap[key].sumDiffTon += Math.abs(r.diff_weight_ton || 0)
    itineraryDiffMap[key].count++
  })

  records.forEach((r) => {
    totalGrossTon += r.gross_weight_ton || 0
    totalTareTon += r.tare_weight_ton || 0
    totalNetTon += r.net_weight_ton || 0
    totalNfTon += r.nf_weight_ton || 0
    totalDiffTon += r.diff_weight_ton || 0
    sumDiffPct += Math.abs(r.diff_weight_pct || 0)

    if (r.has_scale_log) {
      withScaleCount++
    } else {
      withoutScaleCount++
    }

    if (r.scale_reason) {
      scaleReasonsBreakdown[r.scale_reason] = (scaleReasonsBreakdown[r.scale_reason] || 0) + 1
    }

    const diffAbsTon = Math.abs(r.diff_weight_ton || 0)
    const diffPct = Math.abs(r.diff_weight_pct || 0)

    // Divergência relevante: diferença > 0.05 t (50kg) ou diffPct > 0.5%
    if (diffAbsTon > 0.05 || diffPct > 0.5) {
      divergentTransportsCount++
    }

    // Regra de Outlier Relativo de Pesagem:
    const itinStats = itineraryDiffMap[r.itinerary_code || 'GERAL']
    const avgItinDiff = itinStats ? itinStats.sumDiffTon / itinStats.count : 0.02
    if (diffAbsTon > avgItinDiff * 2 && diffAbsTon > 0.05) {
      weightAnomalies.push({
        transportNumber: r.transport_number,
        sapNumber: r.sap_transport_number,
        plate: r.external_id_1,
        itinerary: r.itinerary_description || r.itinerary_code,
        grossWeight: r.gross_weight_ton,
        tareWeight: r.tare_weight_ton,
        netWeight: r.net_weight_ton,
        nfWeight: r.nf_weight_ton,
        diffTon: r.diff_weight_ton,
        diffPct: r.diff_weight_pct,
        reason: r.scale_reason,
        observation: `Transporte ${r.transport_number} apresenta diferença de pesagem (${r.diff_weight_ton > 0 ? '+' : ''}${r.diff_weight_ton} t) superior ao padrão observado para transportes do itinerário ${r.itinerary_code}.`,
      })
    }
  })

  const avgDiffPct = records.length > 0 ? sumDiffPct / records.length : 0

  // 3. Tempos Operacionais
  let sumDwell = 0
  let sumLoading = 0
  const byCenterTimes: Record<string, { count: number; sumDwell: number; sumLoading: number }> = {}
  const byItineraryTimes: Record<string, { count: number; sumDwell: number; sumLoading: number }> =
    {}
  const byVehicleTypeTimes: Record<
    string,
    { count: number; sumDwell: number; sumLoading: number }
  > = {}
  const byDriverTimes: Record<string, { count: number; sumDwell: number; name: string }> = {}
  const hoursMap: Record<string, number> = {}

  records.forEach((r) => {
    const dwell = r.total_time_min || 0
    const loading = r.collection_time_min || 0
    sumDwell += dwell
    sumLoading += loading

    // Centro
    const c = r.center_code || 'WSTL'
    if (!byCenterTimes[c]) byCenterTimes[c] = { count: 0, sumDwell: 0, sumLoading: 0 }
    byCenterTimes[c].count++
    byCenterTimes[c].sumDwell += dwell
    byCenterTimes[c].sumLoading += loading

    // Itinerário
    const itin = r.itinerary_code || 'GERAL'
    if (!byItineraryTimes[itin]) byItineraryTimes[itin] = { count: 0, sumDwell: 0, sumLoading: 0 }
    byItineraryTimes[itin].count++
    byItineraryTimes[itin].sumDwell += dwell
    byItineraryTimes[itin].sumLoading += loading

    // Tipo de Veículo
    const vt = r.vehicle_type || 'Geral'
    if (!byVehicleTypeTimes[vt]) byVehicleTypeTimes[vt] = { count: 0, sumDwell: 0, sumLoading: 0 }
    byVehicleTypeTimes[vt].count++
    byVehicleTypeTimes[vt].sumDwell += dwell
    byVehicleTypeTimes[vt].sumLoading += loading

    // Motorista
    if (r.driver_name) {
      if (!byDriverTimes[r.driver_name])
        byDriverTimes[r.driver_name] = { count: 0, sumDwell: 0, name: r.driver_name }
      byDriverTimes[r.driver_name].count++
      byDriverTimes[r.driver_name].sumDwell += dwell
    }

    // Horário de concentração
    if (r.transport_time) {
      const hh = r.transport_time.substring(0, 2) + ':00'
      hoursMap[hh] = (hoursMap[hh] || 0) + 1
    }
  })

  const avgTotalDwellMin = records.length > 0 ? Math.round(sumDwell / records.length) : 0
  const avgLoadingTimeMin = records.length > 0 ? Math.round(sumLoading / records.length) : 0

  // Converte agregações
  const byCenterFormatted: Record<string, { count: number; avgDwell: number; avgLoading: number }> =
    {}
  Object.entries(byCenterTimes).forEach(([k, v]) => {
    byCenterFormatted[k] = {
      count: v.count,
      avgDwell: Math.round(v.sumDwell / v.count),
      avgLoading: Math.round(v.sumLoading / v.count),
    }
  })

  const byItineraryFormatted: Record<
    string,
    { count: number; avgDwell: number; avgLoading: number }
  > = {}
  Object.entries(byItineraryTimes).forEach(([k, v]) => {
    byItineraryFormatted[k] = {
      count: v.count,
      avgDwell: Math.round(v.sumDwell / v.count),
      avgLoading: Math.round(v.sumLoading / v.count),
    }
  })

  const byVehicleTypeFormatted: Record<
    string,
    { count: number; avgDwell: number; avgLoading: number }
  > = {}
  Object.entries(byVehicleTypeTimes).forEach(([k, v]) => {
    byVehicleTypeFormatted[k] = {
      count: v.count,
      avgDwell: Math.round(v.sumDwell / v.count),
      avgLoading: Math.round(v.sumLoading / v.count),
    }
  })

  const byDriverFormatted: Record<string, { count: number; avgDwell: number; name: string }> = {}
  Object.entries(byDriverTimes).forEach(([k, v]) => {
    byDriverFormatted[k] = {
      count: v.count,
      avgDwell: Math.round(v.sumDwell / v.count),
      name: v.name,
    }
  })

  // Identificar gargalos
  let maxCenterDwell = -1
  let topBottleneckCenter: string | null = null
  Object.entries(byCenterFormatted).forEach(([c, val]) => {
    if (val.avgDwell > maxCenterDwell) {
      maxCenterDwell = val.avgDwell
      topBottleneckCenter = c
    }
  })

  let maxItinDwell = -1
  let topBottleneckItinerary: string | null = null
  Object.entries(byItineraryFormatted).forEach(([it, val]) => {
    if (val.avgDwell > maxItinDwell) {
      maxItinDwell = val.avgDwell
      topBottleneckItinerary = it
    }
  })

  // Outliers de tempo (> 40% acima da média do grupo)
  const timeOutliers: TimeOutlier[] = []
  records.forEach((r) => {
    const dwell = r.total_time_min || 0
    if (avgTotalDwellMin > 0 && dwell > avgTotalDwellMin * 1.4) {
      const diffPct = Math.round(((dwell - avgTotalDwellMin) / avgTotalDwellMin) * 100)
      timeOutliers.push({
        transportNumber: r.transport_number,
        plate: r.external_id_1,
        center: r.center_code,
        itinerary: r.itinerary_code,
        dwellTimeMin: dwell,
        loadingTimeMin: r.collection_time_min || 0,
        avgComparisonDiffPct: diffPct,
      })
    }
  })

  const busiestHours = Object.entries(hoursMap)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 4. Financeiro
  let totalFreight = 0
  let totalToll = 0
  let totalCost = 0
  let totalWeightForCost = 0
  let totalDistForCost = 0
  let sumOccupancy = 0
  let lowOccupancyCount = 0

  const itinCostMap: Record<string, { totalCost: number; totalWeight: number; count: number }> = {}
  const vehicleOccupMap: Record<string, { sumOccup: number; count: number; vehicleType: string }> =
    {}
  const financialAnomalies: FinancialAnomaly[] = []

  records.forEach((r) => {
    const fr = r.freight_cost || 0
    const to = r.toll_cost || 0
    const cost = fr + to
    totalFreight += fr
    totalToll += to
    totalCost += cost

    const wTon = r.net_weight_ton || 0
    const dist = r.distance_km || 0
    totalWeightForCost += wTon
    totalDistForCost += dist

    const occ = r.occupancy_pct || 0
    sumOccupancy += occ
    if (occ > 0 && occ < 70) {
      lowOccupancyCount++
    }

    const itin = r.itinerary_code || 'GERAL'
    if (!itinCostMap[itin]) itinCostMap[itin] = { totalCost: 0, totalWeight: 0, count: 0 }
    itinCostMap[itin].totalCost += cost
    itinCostMap[itin].totalWeight += wTon
    itinCostMap[itin].count++

    const plt = r.external_id_1 || 'N/A'
    if (!vehicleOccupMap[plt]) {
      vehicleOccupMap[plt] = { sumOccup: 0, count: 0, vehicleType: r.vehicle_type || 'Veículo' }
    }
    vehicleOccupMap[plt].sumOccup += occ
    vehicleOccupMap[plt].count++

    const cpt = wTon > 0 ? cost / wTon : 0
    const cpk = dist > 0 ? cost / dist : 0

    if (occ > 0 && occ < 65) {
      financialAnomalies.push({
        transportNumber: r.transport_number,
        itinerary: r.itinerary_description || r.itinerary_code,
        vehicleType: r.vehicle_type,
        costPerTon: Number(cpt.toFixed(2)),
        costPerKm: Number(cpk.toFixed(2)),
        occupancyPct: occ,
        freightCost: cost,
        reason: `Baixa ocupação de carga (${occ.toFixed(1)}%) resultando em custo elevado por tonelada transportada (R$ ${cpt.toFixed(2)}/t).`,
      })
    }
  })

  const avgOccupancyPct = records.length > 0 ? sumOccupancy / records.length : 0
  const sufficientDataForCostPerTon = totalWeightForCost > 0
  const sufficientDataForCostPerKm = totalDistForCost > 0
  const avgCostPerTon = sufficientDataForCostPerTon ? totalCost / totalWeightForCost : null
  const avgCostPerKm = sufficientDataForCostPerKm ? totalCost / totalDistForCost : null

  const highCostItineraries = Object.entries(itinCostMap)
    .filter(([_, data]) => data.totalWeight > 0)
    .map(([itinerary, data]) => ({
      itinerary,
      costPerTon: Number((data.totalCost / data.totalWeight).toFixed(2)),
      count: data.count,
    }))
    .sort((a, b) => b.costPerTon - a.costPerTon)

  const lowUtilizationVehicles = Object.entries(vehicleOccupMap)
    .map(([plate, data]) => ({
      plate,
      vehicleType: data.vehicleType,
      avgOccupancy: Number((data.sumOccup / data.count).toFixed(2)),
    }))
    .filter((v) => v.avgOccupancy < 75)
    .sort((a, b) => a.avgOccupancy - b.avgOccupancy)

  // 5. Síntese Executiva e Insights
  const topInsights: string[] = []
  const anomaliesDetected: string[] = []
  const attentionPoints: string[] = []
  const actionSuggestions: string[] = []

  // Top Itinerário de maior custo ou volume
  const topItinKey = Object.entries(distributionByItinerary).sort((a, b) => b[1] - a[1])[0]
  if (topItinKey && records.length > 0) {
    const itinShare = Math.round((topItinKey[1] / records.length) * 100)
    const costForTop = records
      .filter((r) => (r.itinerary_description || r.itinerary_code) === topItinKey[0])
      .reduce((acc, c) => acc + (c.freight_cost + c.toll_cost), 0)
    const costShare = totalCost > 0 ? Math.round((costForTop / totalCost) * 100) : 0
    topInsights.push(
      `O itinerário ${topItinKey[0]} representa ${itinShare}% dos transportes filtrados (${topItinKey[1]} viagens) e concentra ${costShare}% do custo total contratado.`,
    )
  }

  // Gargalo de permanência
  if (topBottleneckCenter && byCenterFormatted[topBottleneckCenter]) {
    const centerAvg = byCenterFormatted[topBottleneckCenter].avgDwell
    if (avgTotalDwellMin > 0 && centerAvg > avgTotalDwellMin) {
      const overPct = Math.round(((centerAvg - avgTotalDwellMin) / avgTotalDwellMin) * 100)
      topInsights.push(
        `O Centro ${topBottleneckCenter} apresenta tempo operacional médio (${centerAvg} min) ${overPct}% superior à média geral apurada (${avgTotalDwellMin} min).`,
      )
    }
  }

  // Ocupação média
  if (lowOccupancyCount > 0) {
    topInsights.push(
      `${lowOccupancyCount} transporte(s) apresentaram ocupação volumétrica/peso inferior a 70%, gerando oportunidade de consolidação de frete.`,
    )
  }

  // Balança e pesagem
  if (divergentTransportsCount > 0) {
    topInsights.push(
      `${divergentTransportsCount} transporte(s) registraram divergência física entre Peso NF e Peso Líquido na balança superior à tolerância operacional.`,
    )
  }

  // Status de ocorrências
  if (withOccurrence > 0) {
    topInsights.push(
      `${withOccurrence} transporte(s) foram encerrados com ocorrência pendente no SAP, exigindo conciliação de comprovantes ou sinistros.`,
    )
  }

  // Preenche anomalias detectadas
  weightAnomalies.slice(0, 3).forEach((wa) => {
    anomaliesDetected.push(wa.observation)
  })
  timeOutliers.slice(0, 3).forEach((to) => {
    anomaliesDetected.push(
      `Transporte ${to.transportNumber} (Placa ${to.plate}) permaneceu ${to.dwellTimeMin} min no pátio, ${to.avgComparisonDiffPct}% acima da média do centro ${to.center}.`,
    )
  })

  // Pontos de atenção
  if (withoutScaleCount > 0) {
    attentionPoints.push(
      `${withoutScaleCount} transporte(s) não possuem registro formal de balança vinculado ao cadastro de expedição.`,
    )
  }
  if (lowUtilizationVehicles.length > 0) {
    attentionPoints.push(
      `Veículo(s) com baixa utilização identificados: ${lowUtilizationVehicles
        .slice(0, 2)
        .map((v) => `${v.plate} (${v.avgOccupancy}%)`)
        .join(', ')}.`,
    )
  }
  if (busiestHours.length > 0 && busiestHours[0].count > 1) {
    attentionPoints.push(
      `Pico de liberação concentrado às ${busiestHours[0].hour} com ${busiestHours[0].count} expedições simultâneas.`,
    )
  }

  // Sugestões de atuação
  if (lowOccupancyCount > 0) {
    actionSuggestions.push(
      'Avaliar uso do módulo de Complemento Comercial de Carga para itinerários que frequentemente rodam abaixo de 70% de capacidade nominal.',
    )
  }
  if (divergentTransportsCount > 0) {
    actionSuggestions.push(
      'Revisar calibração das células de carga nas balanças rodoviárias dos centros com maior divergência entre Peso NF e Líquido.',
    )
  }
  if (topBottleneckCenter) {
    actionSuggestions.push(
      `Auditar o fluxo de docas e conferência no Centro ${topBottleneckCenter} para mitigar tempos mortos entre início de carregamento e emissão fiscal.`,
    )
  }
  actionSuggestions.push(
    'As recomendações da Análise IA têm caráter consultivo de apoio à gestão operacional e não modificam registros do SAP.',
  )

  return {
    hasData: true,
    filteredCount: records.length,
    activeFiltersFormatted,
    executiveSummary: {
      transportsCount: records.length,
      totalNetWeightTon: Number(totalNetTon.toFixed(3)),
      avgOccupancyPct: Number(avgOccupancyPct.toFixed(2)),
      totalFreightCost: totalFreight,
      avgOperationalDwellMin: avgTotalDwellMin,
      divergentWeightTransportsCount: divergentTransportsCount,
    },
    operational: {
      totalTransports: records.length,
      completed,
      inExpedition,
      inTrip,
      withOccurrence,
      otherStatus,
      distributionByCenter,
      distributionByItinerary,
      distributionByPlate,
      distributionByVehicleType,
    },
    weighing: {
      totalGrossTon: Number(totalGrossTon.toFixed(3)),
      totalTareTon: Number(totalTareTon.toFixed(3)),
      totalNetTon: Number(totalNetTon.toFixed(3)),
      totalNfTon: Number(totalNfTon.toFixed(3)),
      totalDiffTon: Number(totalDiffTon.toFixed(3)),
      avgDiffPct: Number(avgDiffPct.toFixed(2)),
      withoutScaleCount,
      withScaleCount,
      scaleReasonsBreakdown,
      divergentTransportsCount,
      anomalies: weightAnomalies,
    },
    times: {
      avgTotalDwellMin,
      avgLoadingTimeMin,
      avgInitialToFirstEndMin: avgLoadingTimeMin,
      byCenter: byCenterFormatted,
      byItinerary: byItineraryFormatted,
      byVehicleType: byVehicleTypeFormatted,
      byDriver: byDriverFormatted,
      outliers: timeOutliers,
      busiestHours,
      topBottleneckCenter,
      topBottleneckItinerary,
    },
    financial: {
      totalFreight,
      totalToll,
      totalCost,
      totalWeightTon: Number(totalWeightForCost.toFixed(3)),
      totalDistanceKm: totalDistForCost,
      avgCostPerTon: avgCostPerTon !== null ? Number(avgCostPerTon.toFixed(2)) : null,
      avgCostPerKm: avgCostPerKm !== null ? Number(avgCostPerKm.toFixed(2)) : null,
      avgOccupancyPct: Number(avgOccupancyPct.toFixed(2)),
      lowOccupancyCount,
      highCostItineraries,
      lowUtilizationVehicles,
      anomalies: financialAnomalies,
      sufficientDataForCostPerTon,
      sufficientDataForCostPerKm,
    },
    topInsights: topInsights.slice(0, 5),
    anomaliesDetected,
    attentionPoints,
    actionSuggestions,
  }
}
