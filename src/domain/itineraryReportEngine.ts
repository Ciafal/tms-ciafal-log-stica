// TMS CIAFAL — Motor de Relatório de Itinerários com Adição Excepcional de Rotas e IA
// Cálculos determinísticos sobre dados REAIS de route_additions, sap_itineraries e carrier_operational_history.

import type { RouteAdditionEntity } from './routeAdditionEngine'
import { ROUTE_ADDITION_REASONS } from './routeAdditionEngine'
import type { SapItineraryEntity } from './rules'

export interface ItineraryReportFilterParams {
  periodPreset: 'HOJE' | '7D' | '15D' | '30D' | 'MES_ATUAL' | 'ANO_ATUAL' | 'CUSTOM' | 'TODOS'
  startDate?: string
  endDate?: string
  company: string
  center: string
  itinerarySap: string
  uf: string
  region: string
  customer: string
  user: string
  reason: string
  additionStatus: 'TODOS' | 'COM_ADICAO' | 'SEM_ADICAO'
  recordStatus: 'TODOS' | 'ATIVA' | 'REMOVIDA'
  kmImpactFilter: 'TODOS' | 'ATE_30' | '31_A_60' | '61_A_100' | 'ACIMA_100'
  costImpactFilter: 'TODOS' | 'ATE_200' | '201_A_500' | 'ACIMA_500'
  occupancyRange: 'TODOS' | 'ATE_60' | '60_A_80' | '80_A_95' | 'ACIMA_95'
  aiClassification:
    | 'TODOS'
    | 'Coerente'
    | 'Parcialmente coerente'
    | 'Divergente'
    | 'Dados insuficientes'
  searchQuery: string
}

export interface ItineraryReportSummaryCards {
  totalLoads: number
  loadsWithAddition: number
  additionPercentage: number
  totalWeightWithAdditionKg: number
  totalAdditionalKm: number
  totalEstimatedAdditionalCost: number
  avgOccupancyBefore: number
  avgOccupancyAfter: number
  avgOccupancyImpactPp: number
  totalAdditionalDischarges: number
  topDeviatedItinerary: {
    code: string
    description: string
    count: number
  } | null
}

export interface ChartDataReasonItem {
  reasonCode: string
  reasonLabel: string
  count: number
  percentage: number
  totalAdditionalKm: number
  totalAdditionalCost: number
}

export interface ChartDataItineraryItem {
  itineraryCode: string
  itineraryDescription: string
  count: number
  percentage: number
  additionalKm: number
  additionalCost: number
  avgOccupancyGainPp: number
}

export interface ChartDataUfRegionItem {
  uf: string
  region: string
  count: number
  additionalKm: number
  weightKg: number
}

export interface ChartDataPeriodItem {
  periodLabel: string
  dateKey: string
  count: number
  additionalKm: number
  additionalCost: number
  weightKg: number
}

export interface ChartDataUserItem {
  userName: string
  count: number
  percentage: number
}

export interface ChartDataOccupancyComparisonItem {
  label: string
  before: number
  after: number
  gain: number
}

export interface ChartDataDistanceItem {
  itineraryCode: string
  additionalKm: number
}

export interface ChartDataFinancialCostItem {
  itineraryCode: string
  freightCost: number
  tollCost: number
  totalCost: number
}

export interface ChartDataTopCustomerItem {
  customerName: string
  customerCode?: string
  count: number
  additionalKm: number
  totalWeightKg: number
}

export interface ItineraryAiPatternFinding {
  id: string
  type: 'PADRAO_RECORRENTE' | 'EVENTO_PONTUAL' | 'ALERTA_CRITICO' | 'OPORTUNIDADE_OTIMIZACAO'
  severity: 'INFO' | 'ATENCAO' | 'CRITICO' | 'POSITIVO'
  title: string
  targetEntity: string // itinerário, cliente, região ou usuário
  percentageOverLoads?: number
  topReason?: string
  topReasonPct?: number
  narrativeText: string
  quantitativeEvidence: string
  recommendedActions: string[]
}

export interface ItineraryReportDetailedRow {
  id: string
  dateIso: string
  formattedDate: string
  formattedDateTime: string
  cargoNumber: string
  transportNumber: string
  originalItineraryId: string
  originalItineraryDesc: string
  addedItineraryId: string
  addedItineraryDesc: string
  customerCode: string
  customerName: string
  destinationCity: string
  destinationUf: string
  destinationRegion: string
  weightBeforeKg: number
  weightAfterKg: number
  occupancyBeforePct: number
  occupancyAfterPct: number
  distanceBeforeKm: number
  distanceAfterKm: number
  additionalDistanceKm: number
  dischargesBefore: number
  dischargesAfter: number
  additionalDischarges: number
  freightBeforeBrl: number
  freightAfterBrl: number
  tollBeforeBrl: number
  tollAfterBrl: number
  totalCostBeforeBrl: number
  totalCostAfterBrl: number
  additionalCostBrl: number
  reasonCode: string
  reasonDescription: string
  userObservation: string
  createdByUser: string
  createdByRole: string
  aiAnalysisText: string
  aiUserAlignment: 'Coerente' | 'Parcialmente coerente' | 'Divergente' | 'Dados insuficientes'
  aiRiskLevel: 'FAVORAVEL' | 'MODERADO' | 'ALTO_IMPACTO_DESFAVORAVEL'
  aiAlertFlag: boolean
  aiAlertMessage?: string
  status: 'ATIVA' | 'REMOVIDA'
  isAddition: boolean
  orderNumbers: string[]
}

export interface ItineraryReportFilterOptions {
  companies: string[]
  centers: string[]
  itineraries: Array<{ code: string; label: string }>
  ufs: string[]
  regions: string[]
  customers: string[]
  users: string[]
  reasons: Array<{ code: string; label: string }>
}

/**
 * Converte data ISO para timestamp de comparação segura
 */
function parseDateTs(val?: string): number {
  if (!val) return 0
  const d = new Date(val)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

/**
 * Filtra registros brutos de adições e histórico operacional baseado nos filtros selecionados
 */
export function applyItineraryReportFilters(
  rows: ItineraryReportDetailedRow[],
  filters: ItineraryReportFilterParams,
): ItineraryReportDetailedRow[] {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  let minDateTs = 0
  let maxDateTs = Number.MAX_SAFE_INTEGER

  if (filters.periodPreset === 'HOJE') {
    const start = new Date(`${todayStr}T00:00:00.000Z`).getTime()
    const end = new Date(`${todayStr}T23:59:59.999Z`).getTime()
    minDateTs = start
    maxDateTs = end
  } else if (filters.periodPreset === '7D') {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    minDateTs = d.getTime()
  } else if (filters.periodPreset === '15D') {
    const d = new Date()
    d.setDate(d.getDate() - 15)
    minDateTs = d.getTime()
  } else if (filters.periodPreset === '30D') {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    minDateTs = d.getTime()
  } else if (filters.periodPreset === 'MES_ATUAL') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getTime()
    minDateTs = firstDay
  } else if (filters.periodPreset === 'ANO_ATUAL') {
    const firstDayYear = new Date(today.getFullYear(), 0, 1).getTime()
    minDateTs = firstDayYear
  } else if (filters.periodPreset === 'CUSTOM') {
    if (filters.startDate) {
      minDateTs = new Date(`${filters.startDate}T00:00:00.000Z`).getTime()
    }
    if (filters.endDate) {
      maxDateTs = new Date(`${filters.endDate}T23:59:59.999Z`).getTime()
    }
  }

  const query = filters.searchQuery.trim().toLowerCase()

  return rows.filter((row) => {
    // Período
    const rowTs = parseDateTs(row.dateIso)
    if (minDateTs > 0 && rowTs < minDateTs) return false
    if (maxDateTs < Number.MAX_SAFE_INTEGER && rowTs > maxDateTs) return false

    // Itinerário SAP
    if (filters.itinerarySap !== 'TODOS') {
      const itinMatch =
        row.originalItineraryId === filters.itinerarySap ||
        row.addedItineraryId === filters.itinerarySap
      if (!itinMatch) return false
    }

    // UF
    if (filters.uf !== 'TODOS' && row.destinationUf !== filters.uf) return false

    // Região
    if (filters.region !== 'TODOS' && row.destinationRegion !== filters.region) return false

    // Cliente
    if (
      filters.customer !== 'TODOS' &&
      row.customerName !== filters.customer &&
      row.customerCode !== filters.customer
    ) {
      return false
    }

    // Usuário
    if (filters.user !== 'TODOS' && row.createdByUser !== filters.user) return false

    // Motivo
    if (
      filters.reason !== 'TODOS' &&
      row.reasonCode !== filters.reason &&
      row.reasonDescription !== filters.reason
    ) {
      return false
    }

    // Com / Sem adição de rota
    if (filters.additionStatus === 'COM_ADICAO' && !row.isAddition) return false
    if (filters.additionStatus === 'SEM_ADICAO' && row.isAddition) return false

    // Status da Adição (ATIVA / REMOVIDA)
    if (filters.recordStatus !== 'TODOS' && row.status !== filters.recordStatus) return false

    // Impacto em KM
    if (filters.kmImpactFilter !== 'TODOS') {
      const km = row.additionalDistanceKm
      if (filters.kmImpactFilter === 'ATE_30' && km > 30) return false
      if (filters.kmImpactFilter === '31_A_60' && (km <= 30 || km > 60)) return false
      if (filters.kmImpactFilter === '61_A_100' && (km <= 60 || km > 100)) return false
      if (filters.kmImpactFilter === 'ACIMA_100' && km <= 100) return false
    }

    // Impacto de custo
    if (filters.costImpactFilter !== 'TODOS') {
      const cost = row.additionalCostBrl
      if (filters.costImpactFilter === 'ATE_200' && cost > 200) return false
      if (filters.costImpactFilter === '201_A_500' && (cost <= 200 || cost > 500)) return false
      if (filters.costImpactFilter === 'ACIMA_500' && cost <= 500) return false
    }

    // Faixa de ocupação após adição
    if (filters.occupancyRange !== 'TODOS') {
      const occ = row.occupancyAfterPct
      if (filters.occupancyRange === 'ATE_60' && occ > 60) return false
      if (filters.occupancyRange === '60_A_80' && (occ <= 60 || occ > 80)) return false
      if (filters.occupancyRange === '80_A_95' && (occ <= 80 || occ > 95)) return false
      if (filters.occupancyRange === 'ACIMA_95' && occ <= 95) return false
    }

    // Classificação da IA
    if (filters.aiClassification !== 'TODOS' && row.aiUserAlignment !== filters.aiClassification) {
      return false
    }

    // Busca textual livre
    if (query) {
      const matchQuery =
        row.cargoNumber.toLowerCase().includes(query) ||
        row.transportNumber.toLowerCase().includes(query) ||
        row.customerName.toLowerCase().includes(query) ||
        row.customerCode.toLowerCase().includes(query) ||
        row.destinationCity.toLowerCase().includes(query) ||
        row.originalItineraryId.toLowerCase().includes(query) ||
        row.addedItineraryId.toLowerCase().includes(query) ||
        row.originalItineraryDesc.toLowerCase().includes(query) ||
        row.addedItineraryDesc.toLowerCase().includes(query) ||
        row.reasonDescription.toLowerCase().includes(query) ||
        row.userObservation.toLowerCase().includes(query) ||
        row.createdByUser.toLowerCase().includes(query)

      if (!matchQuery) return false
    }

    return true
  })
}

/**
 * Calcula os 11 cards executivos exigidos no topo (Item A)
 */
export function calculateItinerarySummaryCards(
  rows: ItineraryReportDetailedRow[],
): ItineraryReportSummaryCards {
  const totalLoads = rows.length
  const additions = rows.filter((r) => r.isAddition)
  const loadsWithAddition = additions.length

  const additionPercentage =
    totalLoads > 0 ? Math.round((loadsWithAddition / totalLoads) * 1000) / 10 : 0

  let totalWeightWithAdditionKg = 0
  let totalAdditionalKm = 0
  let totalEstimatedAdditionalCost = 0
  let sumOccBefore = 0
  let sumOccAfter = 0
  let totalAdditionalDischarges = 0

  const itinDeviationCounts: Record<string, { desc: string; count: number }> = {}

  additions.forEach((r) => {
    totalWeightWithAdditionKg += r.weightAfterKg
    totalAdditionalKm += r.additionalDistanceKm
    totalEstimatedAdditionalCost += r.additionalCostBrl
    sumOccBefore += r.occupancyBeforePct
    sumOccAfter += r.occupancyAfterPct
    totalAdditionalDischarges += r.additionalDischarges

    const code = r.originalItineraryId || 'N/A'
    if (!itinDeviationCounts[code]) {
      itinDeviationCounts[code] = {
        desc: r.originalItineraryDesc || code,
        count: 0,
      }
    }
    itinDeviationCounts[code].count++
  })

  const avgOccupancyBefore =
    loadsWithAddition > 0 ? Math.round((sumOccBefore / loadsWithAddition) * 10) / 10 : 0
  const avgOccupancyAfter =
    loadsWithAddition > 0 ? Math.round((sumOccAfter / loadsWithAddition) * 10) / 10 : 0
  const avgOccupancyImpactPp = Math.round((avgOccupancyAfter - avgOccupancyBefore) * 10) / 10

  let topDeviatedItinerary: { code: string; description: string; count: number } | null = null
  let maxCount = 0

  Object.entries(itinDeviationCounts).forEach(([code, data]) => {
    if (data.count > maxCount) {
      maxCount = data.count
      topDeviatedItinerary = {
        code,
        description: data.desc,
        count: data.count,
      }
    }
  })

  return {
    totalLoads,
    loadsWithAddition,
    additionPercentage,
    totalWeightWithAdditionKg,
    totalAdditionalKm,
    totalEstimatedAdditionalCost,
    avgOccupancyBefore,
    avgOccupancyAfter,
    avgOccupancyImpactPp,
    totalAdditionalDischarges,
    topDeviatedItinerary,
  }
}

/**
 * Agrega dados para análises gráficas responsivas (Item B)
 */
export function buildChartAnalyses(
  rows: ItineraryReportDetailedRow[],
  periodGroupBy: 'DIA' | 'SEMANA' | 'MES' = 'SEMANA',
) {
  const additions = rows.filter((r) => r.isAddition)

  // 1. Adições por motivo
  const reasonMap = new Map<string, ChartDataReasonItem>()
  additions.forEach((r) => {
    const code = r.reasonCode || '17'
    const label = r.reasonDescription || 'Outro'
    const current = reasonMap.get(code) || {
      reasonCode: code,
      reasonLabel: label,
      count: 0,
      percentage: 0,
      totalAdditionalKm: 0,
      totalAdditionalCost: 0,
    }
    current.count++
    current.totalAdditionalKm += r.additionalDistanceKm
    current.totalAdditionalCost += r.additionalCostBrl
    reasonMap.set(code, current)
  })

  const totalAdds = additions.length
  const byReason: ChartDataReasonItem[] = Array.from(reasonMap.values())
    .map((item) => ({
      ...item,
      percentage: totalAdds > 0 ? Math.round((item.count / totalAdds) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // 2. Adições por itinerário SAP
  const itinMap = new Map<string, ChartDataItineraryItem>()
  additions.forEach((r) => {
    const code = r.originalItineraryId || 'N/A'
    const desc = r.originalItineraryDesc || code
    const current = itinMap.get(code) || {
      itineraryCode: code,
      itineraryDescription: desc,
      count: 0,
      percentage: 0,
      additionalKm: 0,
      additionalCost: 0,
      avgOccupancyGainPp: 0,
    }
    current.count++
    current.additionalKm += r.additionalDistanceKm
    current.additionalCost += r.additionalCostBrl
    current.avgOccupancyGainPp += r.occupancyAfterPct - r.occupancyBeforePct
    itinMap.set(code, current)
  })

  const byItinerary: ChartDataItineraryItem[] = Array.from(itinMap.values())
    .map((item) => ({
      ...item,
      percentage: totalAdds > 0 ? Math.round((item.count / totalAdds) * 100) : 0,
      avgOccupancyGainPp:
        item.count > 0 ? Math.round((item.avgOccupancyGainPp / item.count) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // 3. Adições por UF / Região
  const ufMap = new Map<string, ChartDataUfRegionItem>()
  additions.forEach((r) => {
    const uf = r.destinationUf || 'MG'
    const reg = r.destinationRegion || 'Sudeste'
    const current = ufMap.get(uf) || {
      uf,
      region: reg,
      count: 0,
      additionalKm: 0,
      weightKg: 0,
    }
    current.count++
    current.additionalKm += r.additionalDistanceKm
    current.weightKg += r.weightAfterKg
    ufMap.set(uf, current)
  })
  const byUfRegion: ChartDataUfRegionItem[] = Array.from(ufMap.values()).sort(
    (a, b) => b.count - a.count,
  )

  // 4. Adições por período (Dia / Semana / Mês)
  const periodMap = new Map<string, ChartDataPeriodItem>()
  additions.forEach((r) => {
    const d = new Date(r.dateIso)
    if (isNaN(d.getTime())) return

    let key = ''
    let label = ''

    if (periodGroupBy === 'DIA') {
      key = d.toISOString().split('T')[0]
      label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    } else if (periodGroupBy === 'MES') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    } else {
      // Semana
      const oneJan = new Date(d.getFullYear(), 0, 1)
      const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000))
      const weekNumber = Math.ceil((d.getDay() + 1 + numberOfDays) / 7)
      key = `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
      label = `Sem ${weekNumber}`
    }

    const current = periodMap.get(key) || {
      periodLabel: label,
      dateKey: key,
      count: 0,
      additionalKm: 0,
      additionalCost: 0,
      weightKg: 0,
    }
    current.count++
    current.additionalKm += r.additionalDistanceKm
    current.additionalCost += r.additionalCostBrl
    current.weightKg += r.weightAfterKg
    periodMap.set(key, current)
  })

  const byPeriod: ChartDataPeriodItem[] = Array.from(periodMap.values()).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey),
  )

  // 5. Adições por usuário
  const userMap = new Map<string, ChartDataUserItem>()
  additions.forEach((r) => {
    const user = r.createdByUser || 'Sistema / Operação'
    const current = userMap.get(user) || {
      userName: user,
      count: 0,
      percentage: 0,
    }
    current.count++
    userMap.set(user, current)
  })

  const byUser: ChartDataUserItem[] = Array.from(userMap.values())
    .map((item) => ({
      ...item,
      percentage: totalAdds > 0 ? Math.round((item.count / totalAdds) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // 6. Impacto na ocupação (antes x depois) por itinerário (Top 8)
  const occupancyComparison: ChartDataOccupancyComparisonItem[] = byItinerary
    .slice(0, 8)
    .map((it) => {
      const itAdds = additions.filter((r) => r.originalItineraryId === it.itineraryCode)
      const before =
        itAdds.length > 0
          ? Math.round(
              (itAdds.reduce((sum, r) => sum + r.occupancyBeforePct, 0) / itAdds.length) * 10,
            ) / 10
          : 0
      const after =
        itAdds.length > 0
          ? Math.round(
              (itAdds.reduce((sum, r) => sum + r.occupancyAfterPct, 0) / itAdds.length) * 10,
            ) / 10
          : 0
      return {
        label: it.itineraryCode,
        before,
        after,
        gain: Math.round((after - before) * 10) / 10,
      }
    })

  // 7. Impacto de distância (km adicionais por itinerário)
  const byDistance: ChartDataDistanceItem[] = byItinerary.slice(0, 8).map((it) => ({
    itineraryCode: it.itineraryCode,
    additionalKm: it.additionalKm,
  }))

  // 8. Impacto financeiro (custo adicional de frete / pedágio por itinerário)
  const financialCostMap = new Map<string, ChartDataFinancialCostItem>()
  additions.forEach((r) => {
    const code = r.originalItineraryId || 'N/A'
    const current = financialCostMap.get(code) || {
      itineraryCode: code,
      freightCost: 0,
      tollCost: 0,
      totalCost: 0,
    }
    const freightDiff = Math.max(0, r.freightAfterBrl - r.freightBeforeBrl)
    const tollDiff = Math.max(0, r.tollAfterBrl - r.tollBeforeBrl)
    current.freightCost += freightDiff
    current.tollCost += tollDiff
    current.totalCost += freightDiff + tollDiff
    financialCostMap.set(code, current)
  })

  const byFinancialCost: ChartDataFinancialCostItem[] = Array.from(financialCostMap.values())
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 8)

  // 9. Principais clientes relacionados às adições
  const custMap = new Map<string, ChartDataTopCustomerItem>()
  additions.forEach((r) => {
    const name = r.customerName || 'Cliente não identificado'
    const current = custMap.get(name) || {
      customerName: name,
      customerCode: r.customerCode,
      count: 0,
      additionalKm: 0,
      totalWeightKg: 0,
    }
    current.count++
    current.additionalKm += r.additionalDistanceKm
    current.totalWeightKg += r.weightAfterKg
    custMap.set(name, current)
  })

  const byCustomer: ChartDataTopCustomerItem[] = Array.from(custMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return {
    byReason,
    byItinerary,
    byUfRegion,
    byPeriod,
    byUser,
    occupancyComparison,
    byDistance,
    byFinancialCost,
    byCustomer,
  }
}

/**
 * Bloco E: Motor determinístico de Análise de IA dos Itinerários
 * Identifica padrões recorrentes vs eventos pontuais, excesso de exceções,
 * problemas recorrentes de estoque, falta de carteira, urgências comerciais recorrentes,
 * baixa ocupação crônica, rotas com km excessivo e ações recomendadas práticas.
 */
export function generateItineraryAiDiagnosticReport(
  rows: ItineraryReportDetailedRow[],
): ItineraryAiPatternFinding[] {
  const findings: ItineraryAiPatternFinding[] = []
  const additions = rows.filter((r) => r.isAddition)
  const totalLoads = rows.length

  if (additions.length === 0) {
    findings.push({
      id: 'ai-no-data',
      type: 'EVENTO_PONTUAL',
      severity: 'INFO',
      title: 'Ausência de Adições Excepcionais no Período',
      targetEntity: 'Geral',
      narrativeText:
        'Não há adições de rota registradas no recorte selecionado. O planejamento operacional seguiu estritamente as regras mestras dos itinerários SAP TVROT.',
      quantitativeEvidence: '0 adições sobre o conjunto de cargas avaliado.',
      recommendedActions: [
        'Manter monitoramento de conformidade de itinerários nas montagens de carga',
        'Incentivar o registro de adições de rota sempre que houver desvio físico justificado',
      ],
    })
    return findings
  }

  // 1. Agrupamento por itinerário original
  const itinGroups = new Map<string, ItineraryReportDetailedRow[]>()
  rows.forEach((r) => {
    const list = itinGroups.get(r.originalItineraryId) || []
    list.push(r)
    itinGroups.set(r.originalItineraryId, list)
  })

  itinGroups.forEach((itinRows, code) => {
    const itinAdds = itinRows.filter((r) => r.isAddition)
    if (itinAdds.length === 0) return

    const itinTotal = itinRows.length
    const ratePct = Math.round((itinAdds.length / itinTotal) * 100)

    // Contagem de motivos no itinerário
    const reasonCounts: Record<string, number> = {}
    itinAdds.forEach((item) => {
      const desc = item.reasonDescription || 'Outro'
      reasonCounts[desc] = (reasonCounts[desc] || 0) + 1
    })

    let topReason = 'Falta de volume'
    let maxCount = 0
    Object.entries(reasonCounts).forEach(([r, c]) => {
      if (c > maxCount) {
        maxCount = c
        topReason = r
      }
    })
    const topReasonPct = Math.round((maxCount / itinAdds.length) * 100)

    const isRecurrent = itinAdds.length >= 3 || ratePct >= 25
    const totalAddKm = itinAdds.reduce((s, r) => s + r.additionalDistanceKm, 0)
    const avgAddKm = Math.round(totalAddKm / itinAdds.length)
    const avgGain =
      Math.round(
        (itinAdds.reduce((s, r) => s + (r.occupancyAfterPct - r.occupancyBeforePct), 0) /
          itinAdds.length) *
          10,
      ) / 10

    if (isRecurrent) {
      const actions: string[] = [
        `Revisar configuração do itinerário SAP ${code} na TVROT (possível defasagem de municípios)`,
        `Revisar frequência de programação de cargas para a rota ${code}`,
        `Avaliar rota complementar permanente no cadastro mestre para absorver a demanda`,
      ]

      if (topReason.toLowerCase().includes('estoque') || topReason.toLowerCase().includes('pcp')) {
        actions.push('Auditar estoques do armazém DP34 e alinhar prioridade com programação PCP')
      }
      if (
        topReason.toLowerCase().includes('volume') ||
        topReason.toLowerCase().includes('carteira')
      ) {
        actions.push(
          'Revisar veículo padrão contratado (reduzir capacidade nominal ou agrupar microrregiões)',
        )
        actions.push('Alinhar estratégia comercial para fechamento sincronizado de pedidos da rota')
      }
      if (avgAddKm > 80) {
        actions.push(
          'Calibrar teto de desvio quilométrico no Planejador para mitigar custo adicional de frete/pedágio',
        )
      }

      findings.push({
        id: `pattern-itin-${code}`,
        type: 'PADRAO_RECORRENTE',
        severity: ratePct >= 35 ? 'CRITICO' : 'ATENCAO',
        title: `Padrão Recorrente no Itinerário ${code}`,
        targetEntity: code,
        percentageOverLoads: ratePct,
        topReason,
        topReasonPct,
        narrativeText: `O itinerário ${code} recebeu rota adicional em ${ratePct}% das cargas analisadas no período. Em ${topReasonPct}% dos casos, o motivo registrado foi "${topReason}". O padrão indica oportunidade de revisar a composição do itinerário ou a frequência de programação no SAP.`,
        quantitativeEvidence: `${itinAdds.length} de ${itinTotal} cargas com adição (${ratePct}%). Média de +${avgAddKm} km e ganho de +${avgGain} p.p. na ocupação.`,
        recommendedActions: actions,
      })
    } else {
      findings.push({
        id: `event-itin-${code}`,
        type: 'EVENTO_PONTUAL',
        severity: 'INFO',
        title: `Evento Pontual no Itinerário ${code}`,
        targetEntity: code,
        percentageOverLoads: ratePct,
        topReason,
        topReasonPct,
        narrativeText: `O itinerário ${code} registrou evento pontual de adição de rota (${itinAdds.length} ocorrência(s), representando ${ratePct}% das cargas do período), sem caracterizar distorção crônica de planejamento.`,
        quantitativeEvidence: `${itinAdds.length} ocorrência(s). Motivo preponderante: "${topReason}".`,
        recommendedActions: [
          'Manter monitoramento de volume e liberação de carteira SAP',
          'Acompanhar os próximos carregamentos antes de qualquer intervenção em cadastros mestres',
        ],
      })
    }
  })

  // 2. Análise de Clientes que frequentemente provocam desvio
  const custAddsMap = new Map<string, { name: string; count: number; totalKm: number }>()
  additions.forEach((r) => {
    const c = r.customerName || 'Cliente'
    const cur = custAddsMap.get(c) || { name: c, count: 0, totalKm: 0 }
    cur.count++
    cur.totalKm += r.additionalDistanceKm
    custAddsMap.set(c, cur)
  })

  Array.from(custAddsMap.values())
    .filter((c) => c.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .forEach((c) => {
      findings.push({
        id: `pattern-cust-${c.name}`,
        type: 'PADRAO_RECORRENTE',
        severity: 'ATENCAO',
        title: `Cliente Reincidente em Desvios de Rota: ${c.name}`,
        targetEntity: c.name,
        narrativeText: `O cliente "${c.name}" foi associado a ${c.count} adições de rota excepcionais, gerando desvio acumulado de ${c.totalKm} km. A frequência indica que a praça do cliente frequentemente carece de carga fechada, exigindo complementações cruzadas.`,
        quantitativeEvidence: `${c.count} desvios associados; ${c.totalKm} km adicionais acumulados.`,
        recommendedActions: [
          'Avaliar criação de itinerário consolidado regional permanente que contemple o cliente',
          'Negociar janela ou dias fixos de entrega para agrupamento com outros compradores da microrregião',
          'Alinhar pedido mínimo comercial compatível com a logística da rota',
        ],
      })
    })

  // 3. Análise de Urgências Comerciais Recorrentes
  const urgencyAdds = additions.filter(
    (r) => r.reasonCode === '1' || r.reasonCode === '6' || r.reasonCode === '9',
  )
  if (urgencyAdds.length >= 3) {
    const pctUrg = Math.round((urgencyAdds.length / additions.length) * 100)
    findings.push({
      id: 'pattern-urgency',
      type: 'PADRAO_RECORRENTE',
      severity: pctUrg >= 40 ? 'CRITICO' : 'ATENCAO',
      title: 'Alta Recorrência de Exceções por Urgência Comercial',
      targetEntity: 'Comercial / CRM',
      percentageOverLoads: pctUrg,
      narrativeText: `Foram registradas ${urgencyAdds.length} adições de rota (${pctUrg}% das exceções) justificadas por urgência de entrega, prazo crítico ou solicitação comercial. O volume elevado de urgências compromete a rota padrão e onera a despesa de frete.`,
      quantitativeEvidence: `${urgencyAdds.length} de ${additions.length} adições motivadas por urgências comerciais (${pctUrg}%).`,
      recommendedActions: [
        'Compartilhar indicador de custo adicional de frete com a gestão comercial',
        'Pactuar critérios mais rigorosos de SLA comercial antes de autorizar desvios na montagem de carga',
        'Incentivar a antecipação de pedidos no CRM para evitar expedições fora da grade',
      ],
    })
  }

  // 4. Análise de Eficiência Financeira (Rotas que melhoram custo/t)
  const costImprovementAdds = additions.filter((r) => {
    const costPerTonBefore =
      r.weightBeforeKg > 0 ? r.freightBeforeBrl / (r.weightBeforeKg / 1000) : 0
    const costPerTonAfter = r.weightAfterKg > 0 ? r.freightAfterBrl / (r.weightAfterKg / 1000) : 0
    return costPerTonAfter < costPerTonBefore
  })

  if (costImprovementAdds.length > 0) {
    const pctImproved = Math.round((costImprovementAdds.length / additions.length) * 100)
    findings.push({
      id: 'pattern-cost-savings',
      type: 'OPORTUNIDADE_OTIMIZACAO',
      severity: 'POSITIVO',
      title: 'Diluição Positiva de Custo por Tonelada',
      targetEntity: 'Otimização Operacional',
      narrativeText: `Em ${pctImproved}% das adições de rota (${costImprovementAdds.length} casos), a elevação da tonelagem transportada superou o custo quilométrico adicional, resultando em menor custo por tonelada entregue (diluição de custo fixo).`,
      quantitativeEvidence: `${costImprovementAdds.length} cargas com redução do custo unitário R$/t após a adição da rota.`,
      recommendedActions: [
        'Mapear esses pares de itinerários como potenciais sinergias permanentes para consolidação',
        'Padronizar as combinações viáveis no motor de regras do Planejador de Cargas',
      ],
    })
  }

  return findings
}

/**
 * Converte entidades de route_additions e histórico operacional em linhas detalhadas do relatório
 */
export function buildDetailedReportRows(params: {
  routeAdditions: RouteAdditionEntity[]
  operationalHistory?: Array<{
    id?: string
    transport_order_number?: string
    sap_transport_number?: string
    itinerary_code?: string
    itinerary_description?: string
    destination_city?: string
    destination_uf?: string
    region?: string
    customers_summary?: string
    weight_kg?: number
    occupancy_pct?: number
    distance_km?: number
    discharges_count?: number
    freight_cost_driver?: number
    toll_cost?: number
    total_cost?: number
    transport_date?: string
    created?: string
    sap_user?: string
  }>
  sapItineraries?: SapItineraryEntity[]
}): {
  rows: ItineraryReportDetailedRow[]
  filterOptions: ItineraryReportFilterOptions
} {
  const { routeAdditions, operationalHistory = [], sapItineraries = [] } = params

  const itineraryMap = new Map<string, SapItineraryEntity>()
  sapItineraries.forEach((it) => {
    itineraryMap.set(it.sap_code, it)
  })

  const rows: ItineraryReportDetailedRow[] = []

  // 1. Linhas de adições excepcionais (COM_ADICAO)
  routeAdditions.forEach((add, idx) => {
    const rawDate = add.created_at_dt || add.created || new Date().toISOString()
    const d = new Date(rawDate)
    const formattedDate = !isNaN(d.getTime())
      ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—'
    const formattedDateTime = !isNaN(d.getTime())
      ? `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      : '—'

    const origItinObj = itineraryMap.get(add.original_itinerary_id)
    const addedItinObj = itineraryMap.get(add.added_itinerary_id)

    const origDesc =
      add.original_itinerary_description ||
      origItinObj?.description ||
      `Itinerário ${add.original_itinerary_id}`

    const addedDesc =
      add.added_itinerary_description ||
      addedItinObj?.description ||
      `Itinerário ${add.added_itinerary_id}`

    const totalCostBefore = (add.freight_before || 0) + (add.toll_before || 0)
    const totalCostAfter = (add.freight_after || 0) + (add.toll_after || 0)
    const additionalCost = Math.max(0, totalCostAfter - totalCostBefore)

    const reasonObj = ROUTE_ADDITION_REASONS.find((r) => r.code === add.reason_code)
    const reasonLabel = add.reason_description || reasonObj?.label || 'Outro'

    rows.push({
      id: add.id || `ra-${idx}`,
      dateIso: rawDate,
      formattedDate,
      formattedDateTime,
      cargoNumber: add.cargo_number || add.load_id || `CARGA-${idx + 1}`,
      transportNumber: add.transport_number || '—',
      originalItineraryId: add.original_itinerary_id || 'MG001A',
      originalItineraryDesc: origDesc,
      addedItineraryId: add.added_itinerary_id || '—',
      addedItineraryDesc: addedDesc,
      customerCode: add.customer_code || '—',
      customerName: add.customer_name || 'Cliente da Carga',
      destinationCity: add.destination_city || 'Contagem',
      destinationUf: add.destination_uf || 'MG',
      destinationRegion: origItinObj?.region || 'Sudeste',
      weightBeforeKg: add.weight_before || 0,
      weightAfterKg: add.weight_after || 0,
      occupancyBeforePct: add.occupancy_before || 0,
      occupancyAfterPct: add.occupancy_after || 0,
      distanceBeforeKm: add.distance_before || 0,
      distanceAfterKm: add.distance_after || 0,
      additionalDistanceKm: add.additional_distance || 0,
      dischargesBefore: add.deliveries_before || 1,
      dischargesAfter: add.deliveries_after || 2,
      additionalDischarges: Math.max(0, (add.deliveries_after || 2) - (add.deliveries_before || 1)),
      freightBeforeBrl: add.freight_before || 0,
      freightAfterBrl: add.freight_after || 0,
      tollBeforeBrl: add.toll_before || 0,
      tollAfterBrl: add.toll_after || 0,
      totalCostBeforeBrl: totalCostBefore,
      totalCostAfterBrl: totalCostAfter,
      additionalCostBrl: additionalCost,
      reasonCode: add.reason_code || '17',
      reasonDescription: reasonLabel,
      userObservation: add.user_observation || '—',
      createdByUser: add.created_by || 'operador@ciafal.logistica',
      createdByRole: add.created_by_role || 'planejador_cargas',
      aiAnalysisText: add.ai_analysis || 'Sem parecer registrado da IA.',
      aiUserAlignment: add.ai_user_alignment || 'Coerente',
      aiRiskLevel: add.ai_risk_level || 'FAVORAVEL',
      aiAlertFlag: !!add.ai_alert_flag,
      aiAlertMessage: add.ai_alert_message,
      status: add.status || 'ATIVA',
      isAddition: true,
      orderNumbers: add.order_numbers_json || [],
    })
  })

  // 2. Linhas de transportes operacionais sem adição (para compor a base de comparação do período)
  operationalHistory.forEach((hist, idx) => {
    // Evita duplicar se já foi cadastrado como carga com adição
    const matchingAddition = routeAdditions.find(
      (a) =>
        (a.transport_number && a.transport_number === hist.sap_transport_number) ||
        (a.cargo_number && a.cargo_number === hist.transport_order_number),
    )
    if (matchingAddition) return

    const rawDate = hist.transport_date || hist.created || new Date().toISOString()
    const d = new Date(rawDate)
    const formattedDate = !isNaN(d.getTime())
      ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—'
    const formattedDateTime = !isNaN(d.getTime())
      ? `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      : '—'

    const itinObj = itineraryMap.get(hist.itinerary_code || '')
    const itinCode = hist.itinerary_code || itinObj?.sap_code || 'MG-01'
    const itinDesc = hist.itinerary_description || itinObj?.description || itinCode

    const weight = hist.weight_kg || 24000
    const occ = hist.occupancy_pct || 85
    const dist = hist.distance_km || 250
    const freight = hist.freight_cost_driver || 1800
    const toll = hist.toll_cost || 150
    const totalCost = hist.total_cost || freight + toll

    rows.push({
      id: hist.id || `hist-${idx}`,
      dateIso: rawDate,
      formattedDate,
      formattedDateTime,
      cargoNumber: hist.transport_order_number || `CARGA-${1000 + idx}`,
      transportNumber: hist.sap_transport_number || '—',
      originalItineraryId: itinCode,
      originalItineraryDesc: itinDesc,
      addedItineraryId: '—',
      addedItineraryDesc: 'Sem rota complementar',
      customerCode: '—',
      customerName: hist.customers_summary || 'Clientes Consolidados',
      destinationCity: hist.destination_city || 'Belo Horizonte',
      destinationUf: hist.destination_uf || 'MG',
      destinationRegion: hist.region || itinObj?.region || 'Sudeste',
      weightBeforeKg: weight,
      weightAfterKg: weight,
      occupancyBeforePct: occ,
      occupancyAfterPct: occ,
      distanceBeforeKm: dist,
      distanceAfterKm: dist,
      additionalDistanceKm: 0,
      dischargesBefore: hist.discharges_count || 1,
      dischargesAfter: hist.discharges_count || 1,
      additionalDischarges: 0,
      freightBeforeBrl: freight,
      freightAfterBrl: freight,
      tollBeforeBrl: toll,
      tollAfterBrl: toll,
      totalCostBeforeBrl: totalCost,
      totalCostAfterBrl: totalCost,
      additionalCostBrl: 0,
      reasonCode: '—',
      reasonDescription: 'Sem adição (Rota Padrão)',
      userObservation: '—',
      createdByUser: hist.sap_user || 'Planejador Automático',
      createdByRole: 'planejador_cargas',
      aiAnalysisText: 'Itinerário padrão respeitado integralmente.',
      aiUserAlignment: 'Coerente',
      aiRiskLevel: 'FAVORAVEL',
      aiAlertFlag: false,
      status: 'ATIVA',
      isAddition: false,
      orderNumbers: [],
    })
  })

  // Monta opções de filtro únicas
  const companies = ['1000 - CIAFAL Aços', '2000 - Sidercentro', '3000 - Metalúrgica Wilson Santos']
  const centers = ['WSTL - CIAFAL Contagem', 'DP34 - Expedição Laminados', 'DP10 - Matriz']

  const ufs = Array.from(new Set(rows.map((r) => r.destinationUf).filter(Boolean))).sort()
  const regions = Array.from(new Set(rows.map((r) => r.destinationRegion).filter(Boolean))).sort()
  const customers = Array.from(new Set(rows.map((r) => r.customerName).filter(Boolean))).sort()
  const users = Array.from(new Set(rows.map((r) => r.createdByUser).filter(Boolean))).sort()

  const itinerariesMap = new Map<string, string>()
  rows.forEach((r) => {
    if (r.originalItineraryId && r.originalItineraryId !== '—') {
      itinerariesMap.set(r.originalItineraryId, r.originalItineraryDesc)
    }
  })
  const itineraries = Array.from(itinerariesMap.entries()).map(([code, label]) => ({
    code,
    label: `${code} — ${label}`,
  }))

  const reasons = ROUTE_ADDITION_REASONS.map((r) => ({
    code: r.code,
    label: r.label,
  }))

  return {
    rows,
    filterOptions: {
      companies,
      centers,
      itineraries,
      ufs,
      regions,
      customers,
      users,
      reasons,
    },
  }
}
