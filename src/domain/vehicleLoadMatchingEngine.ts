// TMS CIAFAL — Motor Determinístico de Encontros Veículo × Carga
// Duas etapas: (1) Filtro eliminatório estrito + Diagnóstico de Não-Match
//              (2) Score multicritério explicável (0–100%) + Referência Econômica ANTT Oficial

import {
  anttEngine,
  calculateTripOperationalAnalysis,
  tollEngine,
  type TripOperationalAnalysisResult,
} from './anttAndTollEngine'
import { getAxlesForVehicle } from './lexicographicOptimizationEngine'
import type {
  QueueEntryEntity,
  SapSalesOrderEntity,
  SapStockCurrentEntity,
  PcpProductionOrderEntity,
  VehicleEntity,
  DriverEntity,
  FreightRuleParameterEntity,
} from './rules'
import { calculateCargoFractionation } from './cargoFractionationEngine'

export type TemporalTab = 'AGORA' | 'PROXIMAS_HORAS' | 'FUTURO'

export type SortCriteria =
  | 'MENOR_FRETE'
  | 'MENOR_RS_POR_TON'
  | 'MAIOR_OCUPACAO'
  | 'MENOR_DISTANCIA'
  | 'MENOR_ESPERA'
  | 'MAIOR_PRIORIDADE'
  | 'MELHOR_SCORE'
  | 'MENOR_DESCARGAS'

export interface EliminationCounter {
  exceedsCapacity: number
  incompatibleDischarge: number
  incompatibleBodyType: number
  blockedCredit: number
  missingStock: number
  incompatibleItinerary: number
  blockedDocumentation: number
}

export interface CandidateLoadProposal {
  id: string
  title: string
  itineraryCode: string
  itineraryDescription?: string
  destinationCity: string
  destinationUf: string
  orders: SapSalesOrderEntity[]
  totalWeightKg: number
  customersCount: number
  dischargesCount: number
  fracionamentos: number
  remessasPrevistas: number
  hasBlockedCredit: boolean
  hasInAnalysisCredit: boolean
  isStockReady: boolean
  isPcpReady: boolean
  requiredBodyTypes: string[]
  requiredDischargeTypes: string[]
  logisticRestrictions: string[]
  priorityLevel: 'ALTA' | 'MEDIA' | 'NORMAL'
  maxOverdueDays: number
}

export interface EliminationCheckResult {
  isEliminated: boolean
  primaryReason?: keyof EliminationCounter
  reasons: string[]
  checks: {
    stock: boolean
    credit: boolean
    pcp: boolean
    vehicleCapacity: boolean
    vehicleBodyType: boolean
    dischargeCompatibility: boolean
    itineraryCompatibility: boolean
    documentation: boolean
  }
}

export interface ScoreBreakdown {
  occupancyPoints: number // até 30
  itineraryAdherencePoints: number // até 20
  dischargesPoints: number // até 15
  readinessPoints: number // até 15
  queueWaitPoints: number // até 10
  costEfficiencyPoints: number // até 10
  totalScore: number // 0 - 100
  explanations: string[]
}

export interface VehicleLoadMatch {
  matchId: string
  temporalTab: TemporalTab
  queueVehicle: QueueEntryEntity
  driverName: string
  driverDocument?: string
  driverPhone?: string
  vehiclePlate: string
  vehicleType: string
  vehicleCapacityKg: number
  axlesCount: number
  driverQueueGroup: 'PORTA' | 'FORA' | 'PROGRAMADO'
  waitingMinutes: number
  driverPreferredItinerary?: string
  driverPreferredItineraryName?: string
  candidateLoad: CandidateLoadProposal
  fracionamentos: number
  remessasPrevistas: number
  occupancyPct: number
  balanceKg: number
  distanceKm: number
  anttFloorValue: number
  tollCost: number
  totalSuggestedFreight: number
  costPerTon: number
  costPerKm: number
  extraDischargesCost: number
  operationalAnalysis: TripOperationalAnalysisResult
  score: ScoreBreakdown
  hasRouteAddition?: boolean
  routeAdditionData?: import('@/domain/routeAdditionEngine').RouteAdditionEntity | null
  checks: EliminationCheckResult['checks']
  isOpportunity: boolean // Oportunidade verde (≥95% ocupação, PORTA > 30min, pronto)
  createdAt: string
  // Estado e histórico da oferta de frete ao Agente Chicão
  offerStatus?:
    | 'DISPONIVEL'
    | 'SELECIONADO'
    | 'ENVIADO_CHICAO'
    | 'OFERTA_ENVIADA'
    | 'VISUALIZADA'
    | 'EM_NEGOCIACAO'
    | 'CONTRAPROPOSTA'
    | 'AGUARDANDO_APROVACAO'
    | 'ACEITA'
    | 'RECUSADA'
    | 'EXPIRADA'
    | 'CANCELADA'
    | 'ERRO_ENVIO'
  offerCode?: string
  whatsappStatus?: string
  lastErrorReason?: string
}

export interface VehicleNonMatchDiagnosis {
  vehicleId: string
  vehiclePlate: string
  driverName: string
  queueGroup: 'PORTA' | 'FORA' | 'PROGRAMADO'
  waitingMinutes: number
  vehicleCapacityKg: number
  vehicleType: string
  preferredItinerary?: string
  totalCargasEvaluated: number
  eliminations: EliminationCounter
  detailedReasons: string[]
  summaryMessage: string
}

export interface EngineExecutionResult {
  matches: VehicleLoadMatch[]
  viableMatchesCount: number
  totalVehiclesAnalyzed: number
  totalCargasAnalyzed: number
  potentialSavingsTotal: number
  nonMatchDiagnoses: VehicleNonMatchDiagnosis[]
  matrixVehicles: Array<{
    id: string
    plate: string
    driverName: string
    group: 'PORTA' | 'FORA' | 'PROGRAMADO'
    capacityKg: number
  }>
  matrixCargas: Array<{
    id: string
    title: string
    itineraryCode: string
    weightKg: number
    dischargesCount: number
  }>
  matrixCells: Record<
    string,
    {
      status: 'VIABLE' | 'CONDITIONED' | 'INVIABLE'
      matchId?: string
      score?: number
      reason?: string
    }
  >
  generatedAt: string
}

/**
 * Normaliza carroceria para verificação de compatibilidade
 */
export function normalizeBodyType(body?: string): string {
  const b = (body || '').toLowerCase().trim()
  if (b.includes('sider') || b.includes('sidercentro')) return 'SIDER'
  if (b.includes('grade baixa') || b.includes('aberta') || b.includes('grade_baixa'))
    return 'GRADE_BAIXA'
  if (b.includes('baú') || b.includes('bau') || b.includes('fechada')) return 'BAU'
  if (b.includes('graneleiro') || b.includes('graneleira')) return 'GRANELEIRA'
  if (b.includes('prancha')) return 'PRANCHA'
  return b ? b.toUpperCase() : 'ABERTA'
}

/**
 * Normaliza tipo de descarga exigido pelo cliente
 */
export function normalizeDischargeType(type?: string): string {
  const d = (type || '').toLowerCase().trim()
  if (d.includes('ponte') || d.includes('rolante')) return 'PONTE_ROLANTE'
  if (d.includes('munck')) return 'MUNCK'
  if (d.includes('empilhadeira')) return 'EMPILHADEIRA'
  if (d.includes('lateral')) return 'LATERAL'
  if (d.includes('traseira')) return 'TRASEIRA'
  return d ? d.toUpperCase() : 'LIVRE'
}

/**
 * Valida se a carroceria do veículo permite o tipo de descarga exigido.
 * Exemplo CIAFAL: Ponte rolante / içamento exige abertura total por cima (Grade Baixa ou Sider com teto removível).
 * Baú fechado NÃO aceita içamento / ponte rolante nem Munck por cima.
 */
export function isDischargeCompatibleWithBody(
  bodyType: string,
  dischargeType: string,
): { compatible: boolean; reason?: string } {
  const normBody = normalizeBodyType(bodyType)
  const normDischarge = normalizeDischargeType(dischargeType)

  if (normDischarge === 'LIVRE') return { compatible: true }

  if (normDischarge === 'PONTE_ROLANTE' || normDischarge === 'MUNCK') {
    if (normBody === 'BAU') {
      return {
        compatible: false,
        reason: `Descarga por ${dischargeType} não é viável em veículo tipo Baú Fechado (exige Grade Baixa ou Sider).`,
      }
    }
  }

  return { compatible: true }
}

/**
 * Calcula o tempo de espera na fila em minutos a partir de entry_time
 */
export function calculateQueueWaitingMinutes(entryTime?: string): number {
  if (!entryTime) return 0
  const entry = new Date(entryTime).getTime()
  const now = Date.now()
  if (isNaN(entry) || entry > now) return 0
  return Math.max(0, Math.floor((now - entry) / (1000 * 60)))
}

/**
 * Avalia filtros eliminatórios para o par (Veículo, Carga Proposta)
 */
export function evaluateEliminationFilters(params: {
  vehicle: QueueEntryEntity
  vehicleMaster?: VehicleEntity | null
  driverMaster?: DriverEntity | null
  load: CandidateLoadProposal
}): EliminationCheckResult {
  const { vehicle, vehicleMaster, driverMaster, load } = params
  const reasons: string[] = []

  const capacityKg =
    vehicle.vehicle_capacity_kg_cached ||
    vehicleMaster?.capacity_kg ||
    (vehicle.expand?.vehicle as any)?.capacity_kg ||
    0

  const bodyType =
    vehicleMaster?.body_type ||
    (vehicle.expand?.vehicle as any)?.body_type ||
    vehicle.vehicle_type_cached ||
    ''

  const checks = {
    stock: true,
    credit: true,
    pcp: true,
    vehicleCapacity: true,
    vehicleBodyType: true,
    dischargeCompatibility: true,
    itineraryCompatibility: true,
    documentation: true,
  }

  let primaryReason: keyof EliminationCounter | undefined

  // 1. Documentação / Bloqueio cadastral (Driver ou Veículo)
  const isDriverBlocked =
    driverMaster?.status === 'bloqueado' ||
    vehicle.status === 'bloqueado' ||
    (vehicle.expand?.driver as any)?.status === 'bloqueado'
  if (isDriverBlocked) {
    checks.documentation = false
    reasons.push('Motorista ou veículo com bloqueio cadastral ativo (SAP ZSD004 / Fila).')
    if (!primaryReason) primaryReason = 'blockedDocumentation'
  }

  // 2. Capacidade de Carga vs Peso Total
  if (capacityKg > 0 && load.totalWeightKg > capacityKg) {
    checks.vehicleCapacity = false
    const diff = load.totalWeightKg - capacityKg
    reasons.push(
      `Peso da carga (${(load.totalWeightKg / 1000).toFixed(1)}t) excede a capacidade do veículo (${(capacityKg / 1000).toFixed(1)}t) em ${(diff / 1000).toFixed(1)}t.`,
    )
    if (!primaryReason) primaryReason = 'exceedsCapacity'
  } else if (capacityKg <= 0) {
    // Veículo sem capacidade definida não pode ser aprovado automaticamente
    checks.vehicleCapacity = false
    reasons.push('Veículo sem capacidade de peso cadastrada.')
    if (!primaryReason) primaryReason = 'exceedsCapacity'
  }

  // 3. Compatibilidade de Carroceria vs Exigências do Pedido
  const reqVehicles = load.requiredBodyTypes.filter(Boolean)
  if (reqVehicles.length > 0) {
    const vTypeNorm = (vehicle.vehicle_type_cached || '').toLowerCase()
    const bodyNorm = bodyType.toLowerCase()
    const matchesAny = reqVehicles.some((req) => {
      const r = req.toLowerCase()
      return vTypeNorm.includes(r) || bodyNorm.includes(r) || r.includes(vTypeNorm)
    })
    if (!matchesAny) {
      checks.vehicleBodyType = false
      reasons.push(
        `Carroceria (${vehicle.vehicle_type_cached || bodyType}) incompatível com exigência dos pedidos: ${reqVehicles.join(', ')}.`,
      )
      if (!primaryReason) primaryReason = 'incompatibleBodyType'
    }
  }

  // 4. Carroceria × Tipo de Descarga do Cliente
  for (const dischargeType of load.requiredDischargeTypes) {
    const comp = isDischargeCompatibleWithBody(
      bodyType || vehicle.vehicle_type_cached || '',
      dischargeType,
    )
    if (!comp.compatible) {
      checks.dischargeCompatibility = false
      reasons.push(comp.reason || `Incompatibilidade com descarga: ${dischargeType}.`)
      if (!primaryReason) primaryReason = 'incompatibleDischarge'
      break
    }
  }

  // 5. Crédito Bloqueado
  if (load.hasBlockedCredit) {
    checks.credit = false
    reasons.push('Pedido(s) da carga possuem CRÉDITO BLOQUEADO no SAP pelo financeiro.')
    if (!primaryReason) primaryReason = 'blockedCredit'
  }

  // 6. Estoque Ausente (sem estoque físico pronto)
  if (!load.isStockReady && !load.isPcpReady) {
    checks.stock = false
    checks.pcp = false
    reasons.push('Itens da carga sem estoque físico disponível e sem lote PCP pronto.')
    if (!primaryReason) primaryReason = 'missingStock'
  }

  // 7. Compatibilidade de Itinerário
  // Se o motorista informou preferência explícita (diferente de SEM_PREFERENCIA)
  // e o itinerário for totalmente diferente da rota da carga
  const prefItin = (vehicle.preferred_itinerary || (vehicle as any).preferred_itinerary_code || '')
    .trim()
    .toUpperCase()
  const cargoItin = (load.itineraryCode || '').trim().toUpperCase()
  if (
    prefItin &&
    prefItin !== 'SEM_PREFERENCIA' &&
    prefItin !== 'TODOS' &&
    cargoItin &&
    prefItin !== cargoItin
  ) {
    // Atenção: a regra do TMS CIAFAL permite alocação quando não há motorista dedicado,
    // mas na etapa eliminatória se houver restrição estrita de região o motorista pode ser incompatível.
    // Conforme especificação: itinerário incompatível quando houver veto de região ou discrepância total de UF.
    // Não eliminamos totalmente se for apenas preferência do motorista, a menos que o destino seja de UF divergente
    // e o motorista pertença a frota regional dedicada. Para ser eliminatório estrito:
    const prefUf = prefItin.slice(0, 2)
    const cargoUf = cargoItin.slice(0, 2)
    if (
      prefUf.length === 2 &&
      cargoUf.length === 2 &&
      prefUf !== cargoUf &&
      prefItin.startsWith('SP-LOCAL')
    ) {
      checks.itineraryCompatibility = false
      reasons.push(
        `Itinerário incompatível: motorista dedicado a rota local (${prefItin}) e carga de rota interestadual (${cargoItin}).`,
      )
      if (!primaryReason) primaryReason = 'incompatibleItinerary'
    }
  }

  const isEliminated = reasons.length > 0

  return {
    isEliminated,
    primaryReason,
    reasons,
    checks,
  }
}

/**
 * Calcula o Score Multicritério Determinístico de 0 a 100 pontos:
 * - Ocupação: até 30 pts (95-100% = 30pts; 90-94% = 25pts; 80-89% = 18pts; 70-79% = 10pts; <70% = 5pts)
 * - Aderência ao Itinerário Preferencial: até 20 pts (Reaproveita lógica já implementada: mesmo itin = 20pts; sem preferência = 12pts; outro = 4pts)
 * - Descargas: até 15 pts (1 descarga = 15pts; 2 descargas = 12pts; 3 descargas = 8pts; ≥4 descargas = 4pts)
 * - Prontidão Estoque + Crédito: até 15 pts (Estoque 100% + Crédito Liberado = 15pts; Estoque pronto + Crédito Análise = 10pts; PCP Pronto = 8pts; Parcial = 4pts)
 * - Espera na Fila: até 10 pts (PORTA > 60min = 10pts; PORTA > 30min = 8pts; PORTA ≤ 30min = 6pts; FORA = 4pts; PROGRAMADO = 2pts)
 * - Eficiência R$/t (Econômico): até 10 pts (Maior R$/t orçado / melhor aproveitamento financeiro)
 */
export function calculateMulticriteriaScore(params: {
  occupancyPct: number
  driverPreferredItinerary?: string
  cargoItineraryCode: string
  dischargesCount: number
  isStockReady: boolean
  isCreditLiberated: boolean
  isCreditInAnalysis: boolean
  isPcpReady: boolean
  driverQueueGroup: 'PORTA' | 'FORA' | 'PROGRAMADO'
  waitingMinutes: number
  costPerTon: number
  targetCostPerTon?: number
}): ScoreBreakdown {
  const {
    occupancyPct,
    driverPreferredItinerary,
    cargoItineraryCode,
    dischargesCount,
    isStockReady,
    isCreditLiberated,
    isCreditInAnalysis,
    isPcpReady,
    driverQueueGroup,
    waitingMinutes,
    costPerTon,
    targetCostPerTon = 115,
  } = params

  const explanations: string[] = []

  // 1. Ocupação (30 pts)
  let occupancyPoints = 5
  if (occupancyPct >= 95) {
    occupancyPoints = 30
    explanations.push(`Ocupação máxima (${occupancyPct.toFixed(1)}%): +30 pts`)
  } else if (occupancyPct >= 90) {
    occupancyPoints = 25
    explanations.push(`Ocupação alta (${occupancyPct.toFixed(1)}%): +25 pts`)
  } else if (occupancyPct >= 80) {
    occupancyPoints = 18
    explanations.push(`Ocupação satisfatória (${occupancyPct.toFixed(1)}%): +18 pts`)
  } else if (occupancyPct >= 70) {
    occupancyPoints = 10
    explanations.push(`Ocupação regular (${occupancyPct.toFixed(1)}%): +10 pts`)
  } else {
    explanations.push(`Ocupação baixa (${occupancyPct.toFixed(1)}%): +5 pts`)
  }

  // 2. Aderência ao Itinerário Preferencial (20 pts)
  const pref = (driverPreferredItinerary || '').trim().toUpperCase()
  const cargo = (cargoItineraryCode || '').trim().toUpperCase()
  let itineraryAdherencePoints = 12
  if (pref && pref !== 'SEM_PREFERENCIA' && pref !== 'TODOS' && cargo && pref === cargo) {
    itineraryAdherencePoints = 20
    explanations.push(`Itinerário preferencial exato (${pref}): +20 pts`)
  } else if (!pref || pref === 'SEM_PREFERENCIA' || pref === 'TODOS') {
    itineraryAdherencePoints = 12
    explanations.push('Motorista sem preferência restritiva (Neutro): +12 pts')
  } else {
    itineraryAdherencePoints = 5
    explanations.push(`Preferência em outra rota (${pref}): +5 pts`)
  }

  // 3. Descargas (15 pts)
  let dischargesPoints = 4
  if (dischargesCount <= 1) {
    dischargesPoints = 15
    explanations.push('Descarga única (Ponto a ponto dedicado): +15 pts')
  } else if (dischargesCount === 2) {
    dischargesPoints = 12
    explanations.push('2 descargas na rota: +12 pts')
  } else if (dischargesCount === 3) {
    dischargesPoints = 8
    explanations.push('3 descargas na rota: +8 pts')
  } else {
    explanations.push(`Múltiplas descargas (${dischargesCount}): +4 pts`)
  }

  // 4. Prontidão Estoque + Crédito (15 pts)
  let readinessPoints = 4
  if (isStockReady && isCreditLiberated) {
    readinessPoints = 15
    explanations.push('Prontidão total (Estoque DP34 100% + Crédito Liberado): +15 pts')
  } else if (isStockReady && isCreditInAnalysis) {
    readinessPoints = 10
    explanations.push('Estoque disponível com crédito em análise: +10 pts')
  } else if (isPcpReady && isCreditLiberated) {
    readinessPoints = 9
    explanations.push('PCP com lote pronto + Crédito Liberado: +9 pts')
  } else if (isCreditLiberated) {
    readinessPoints = 6
    explanations.push('Crédito liberado com estoque parcial: +6 pts')
  } else {
    explanations.push('Prontidão operacional parcial: +4 pts')
  }

  // 5. Espera na Fila (10 pts)
  let queueWaitPoints = 4
  if (driverQueueGroup === 'PORTA') {
    if (waitingMinutes >= 60) {
      queueWaitPoints = 10
      explanations.push(`PORTA em espera prioritária (${waitingMinutes} min): +10 pts`)
    } else if (waitingMinutes >= 30) {
      queueWaitPoints = 8
      explanations.push(`PORTA com tempo hábil (${waitingMinutes} min): +8 pts`)
    } else {
      queueWaitPoints = 6
      explanations.push(`PORTA recém-chegado (${waitingMinutes} min): +6 pts`)
    }
  } else if (driverQueueGroup === 'FORA') {
    queueWaitPoints = 4
    explanations.push('Motorista FORA do pátio (raio próximo): +4 pts')
  } else {
    queueWaitPoints = 2
    explanations.push('Programação futura: +2 pts')
  }

  // 6. R$/t e Eficiência de Custo (10 pts)
  let costEfficiencyPoints = 6
  if (costPerTon > 0 && targetCostPerTon > 0) {
    const ratio = costPerTon / targetCostPerTon
    if (ratio <= 0.95) {
      costEfficiencyPoints = 10
      explanations.push(`Custo/t econômico (R$ ${costPerTon.toFixed(2)}/t): +10 pts`)
    } else if (ratio <= 1.05) {
      costEfficiencyPoints = 8
      explanations.push(`Custo/t alinhado à meta (R$ ${costPerTon.toFixed(2)}/t): +8 pts`)
    } else if (ratio <= 1.15) {
      costEfficiencyPoints = 5
      explanations.push(`Custo/t acima da meta (R$ ${costPerTon.toFixed(2)}/t): +5 pts`)
    } else {
      costEfficiencyPoints = 3
      explanations.push(`Custo/t elevado (R$ ${costPerTon.toFixed(2)}/t): +3 pts`)
    }
  }

  const totalScore = Math.min(
    100,
    Math.max(
      0,
      occupancyPoints +
        itineraryAdherencePoints +
        dischargesPoints +
        readinessPoints +
        queueWaitPoints +
        costEfficiencyPoints,
    ),
  )

  return {
    occupancyPoints,
    itineraryAdherencePoints,
    dischargesPoints,
    readinessPoints,
    queueWaitPoints,
    costEfficiencyPoints,
    totalScore,
    explanations,
  }
}

/**
 * Agrupa pedidos da carteira SAP em propostas de carga candidatas por itinerário
 */
export function buildCandidateLoadsFromOrders(
  orders: SapSalesOrderEntity[],
  stockRecords: SapStockCurrentEntity[] = [],
  pcpRecords: PcpProductionOrderEntity[] = [],
): CandidateLoadProposal[] {
  const mapByItin = new Map<string, SapSalesOrderEntity[]>()

  orders.forEach((ord) => {
    const code = ord.itinerary_code || 'OUTROS'
    const list = mapByItin.get(code) || []
    list.push(ord)
    mapByItin.set(code, list)
  })

  const candidateLoads: CandidateLoadProposal[] = []

  // Mapa de estoque rápido por material
  const stockAvailableMap = new Map<string, number>()
  stockRecords.forEach((s) => {
    const key = (s.material_code || '').trim()
    const cur = stockAvailableMap.get(key) || 0
    stockAvailableMap.set(key, cur + (s.available_qty || s.quantity || 0))
  })

  // Mapa de PCP por material
  const pcpStatusMap = new Map<string, string>()
  pcpRecords.forEach((p) => {
    const key = (p.material_code || '').trim()
    pcpStatusMap.set(key, p.status || '')
  })

  mapByItin.forEach((itinOrders, itinCode) => {
    // Ordenar pedidos por atraso e peso
    const sorted = [...itinOrders].sort((a, b) => {
      const pA = a.priority_level === 'Alta' ? 1 : 0
      const pB = b.priority_level === 'Alta' ? 1 : 0
      if (pA !== pB) return pB - pA
      return (b.weight_kg || 0) - (a.weight_kg || 0)
    })

    // Agrupar em fatias realistas de até 32t (Capacidade de Bitrem)
    let curBatch: SapSalesOrderEntity[] = []
    let curWeight = 0
    let batchIndex = 1

    const flushBatch = () => {
      if (curBatch.length === 0) return
      const totalWeightKg = curWeight
      const uniqueClients = new Set(curBatch.map((o) => o.customer_code || o.customer_name))
      const deliveryPoints = new Set(
        curBatch.map((o) => `${o.customer_code}_${o.destination_city}_${o.uf}`),
      )
      const explicitDischarges = curBatch.reduce(
        (sum, o) => sum + Math.max(1, o.discharges_count || 1),
        0,
      )
      const dischargesCount = Math.max(uniqueClients.size, deliveryPoints.size, explicitDischarges)

      const hasBlockedCredit = curBatch.some((o) => o.credit_status === 'Bloqueado')
      const hasInAnalysisCredit = curBatch.some((o) => o.credit_status === 'Em Análise')

      // Checa estoque e PCP
      const isStockReady = curBatch.every((o) => {
        if (o.production_status === 'Pronto') return true
        if (o.stock_available && o.stock_available > 0) return true
        const matKey = (o.material || '').trim()
        const avail = stockAvailableMap.get(matKey) || 0
        return avail > 0
      })

      const isPcpReady = curBatch.every((o) => {
        if (o.production_status === 'Pronto') return true
        const matKey = (o.material || '').trim()
        const st = pcpStatusMap.get(matKey)
        return st === 'Concluída' || st === 'Programada'
      })

      const requiredBodyTypes = Array.from(
        new Set(curBatch.map((o) => o.required_vehicle_type).filter(Boolean) as string[]),
      )
      const requiredDischargeTypes = Array.from(
        new Set(curBatch.map((o) => o.discharge_type).filter(Boolean) as string[]),
      )
      const logisticRestrictions = Array.from(
        new Set(curBatch.map((o) => o.logistic_restrictions).filter(Boolean) as string[]),
      )

      const maxOverdueDays = curBatch.reduce((max, o) => Math.max(max, o.delay_days || 0), 0)
      const priorityLevel: CandidateLoadProposal['priorityLevel'] = curBatch.some(
        (o) => o.priority_level === 'Alta' || (o.delay_days && o.delay_days > 3),
      )
        ? 'ALTA'
        : curBatch.some((o) => o.priority_level === 'Media')
          ? 'MEDIA'
          : 'NORMAL'

      const firstOrd = curBatch[0]
      const title = `CARGA-${itinCode}-${batchIndex.toString().padStart(2, '0')}`
      const fractionationResult = calculateCargoFractionation(curBatch)

      candidateLoads.push({
        id: `load_${itinCode}_${batchIndex}`,
        title,
        itineraryCode: itinCode,
        itineraryDescription: firstOrd.itinerary_code || itinCode,
        destinationCity: firstOrd.destination_city || 'Destino Polo',
        destinationUf: firstOrd.uf || 'SP',
        orders: [...curBatch],
        totalWeightKg,
        customersCount: fractionationResult.distinctCustomersCount,
        dischargesCount,
        fracionamentos: fractionationResult.fracionamentos,
        remessasPrevistas: fractionationResult.remessasPrevistas,
        hasBlockedCredit,
        hasInAnalysisCredit,
        isStockReady,
        isPcpReady,
        requiredBodyTypes,
        requiredDischargeTypes,
        logisticRestrictions,
        priorityLevel,
        maxOverdueDays,
      })

      batchIndex++
      curBatch = []
      curWeight = 0
    }

    sorted.forEach((ord) => {
      const w = ord.weight_kg || 0
      if (curWeight + w > 32000 && curBatch.length > 0) {
        flushBatch()
      }
      curBatch.push(ord)
      curWeight += w
    })
    flushBatch()
  })

  return candidateLoads
}

/**
 * Executa o motor completo de matching determinístico entre a fila e a carteira de cargas
 */
export function runVehicleLoadMatchingEngine(params: {
  queueEntries: QueueEntryEntity[]
  salesOrders: SapSalesOrderEntity[]
  stockCurrent?: SapStockCurrentEntity[]
  pcpOrders?: PcpProductionOrderEntity[]
  vehicles?: VehicleEntity[]
  drivers?: DriverEntity[]
  freightRuleParameters?: FreightRuleParameterEntity[]
  activeTemporalTab?: TemporalTab
  sortCriteria?: SortCriteria
  targetItineraryCode?: string
}): EngineExecutionResult {
  const {
    queueEntries,
    salesOrders,
    stockCurrent = [],
    pcpOrders = [],
    vehicles = [],
    drivers = [],
    freightRuleParameters = [],
    activeTemporalTab = 'AGORA',
    sortCriteria = 'MENOR_FRETE',
    targetItineraryCode,
  } = params

  // 1. Filtrar veículos ativos da fila (remover saídos, bloqueados ou atribuídos de forma definitiva)
  const activeQueue = queueEntries.filter((q) => {
    if (['removido', 'atribuido'].includes(q.status)) return false
    return true
  })

  // 2. Parâmetro de adicionais de descarga
  const activeDischargeRule = freightRuleParameters.find((r) => r.is_active !== false)
  const additionalPerDischarge = activeDischargeRule?.additional_discharge_value ?? 250
  const appliesFromDischargeNum = activeDischargeRule?.applies_from_discharge_num ?? 2

  // 3. Montar propostas candidatas de cargas a partir da carteira
  const relevantOrders =
    targetItineraryCode && targetItineraryCode !== 'ALL'
      ? salesOrders.filter((o) => o.itinerary_code === targetItineraryCode)
      : salesOrders

  const candidateLoads = buildCandidateLoadsFromOrders(relevantOrders, stockCurrent, pcpOrders)

  // Mapas mestres de veículos e motoristas
  const vehiclesMap = new Map<string, VehicleEntity>()
  vehicles.forEach((v) => {
    if (v.id) vehiclesMap.set(v.id, v)
    if (v.plate) vehiclesMap.set(v.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(), v)
  })

  const driversMap = new Map<string, DriverEntity>()
  drivers.forEach((d) => {
    if (d.id) driversMap.set(d.id, d)
    if (d.document) driversMap.set(d.document.replace(/\D/g, ''), d)
  })

  const matches: VehicleLoadMatch[] = []
  const nonMatchDiagnoses: VehicleNonMatchDiagnosis[] = []

  const matrixCells: EngineExecutionResult['matrixCells'] = {}

  let matchSeq = 1

  // 4. Cruzamento exaustivo Veículos × Cargas
  activeQueue.forEach((vehicle) => {
    const vPlateClean = (vehicle.vehicle_plate_cached || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
    const vDocClean = (vehicle.driver_doc_cached || '').replace(/\D/g, '')

    const vehicleMaster =
      vehiclesMap.get(vPlateClean) || vehiclesMap.get(vehicle.vehicle || '') || null
    const driverMaster = driversMap.get(vDocClean) || driversMap.get(vehicle.driver || '') || null

    const waitingMinutes = calculateQueueWaitingMinutes(vehicle.entry_time)

    // Classificação de aba temporal do veículo:
    // AGORA: PORTA (já no pátio da CIAFAL)
    // PROXIMAS_HORAS: FORA (em trânsito ou pátio externo)
    // FUTURO: PROGRAMADO (com data agendada futura)
    let vehicleTab: TemporalTab = 'AGORA'
    if (vehicle.type === 'FORA') vehicleTab = 'PROXIMAS_HORAS'
    else if (vehicle.type === 'PROGRAMADO') vehicleTab = 'FUTURO'

    const capacityKg = vehicle.vehicle_capacity_kg_cached || vehicleMaster?.capacity_kg || 27000

    const vehicleType = vehicle.vehicle_type_cached || vehicleMaster?.type || 'Carreta LS'
    const axles = getAxlesForVehicle(vehicleType)

    const elimCounter: EliminationCounter = {
      exceedsCapacity: 0,
      incompatibleDischarge: 0,
      incompatibleBodyType: 0,
      blockedCredit: 0,
      missingStock: 0,
      incompatibleItinerary: 0,
      blockedDocumentation: 0,
    }
    const vehicleDetailedReasons: string[] = []
    let hasViableMatch = false

    candidateLoads.forEach((load) => {
      const cellKey = `${vehicle.id}_${load.id}`

      // Etapa 1: Filtro Eliminatório
      const elim = evaluateEliminationFilters({
        vehicle,
        vehicleMaster,
        driverMaster,
        load,
      })

      if (elim.isEliminated) {
        if (elim.primaryReason) {
          elimCounter[elim.primaryReason]++
        }
        vehicleDetailedReasons.push(...elim.reasons)

        matrixCells[cellKey] = {
          status: 'INVIABLE',
          reason: elim.reasons[0] || 'Incompatibilidade eliminatória detectada',
        }
        return
      }

      // Etapa 2: Cálculo ANTT Oficial + Pedágios + Operacional
      // Distância de referência com base na rota
      const baseDistanceKm = 360
      const additionalKm =
        Math.max(0, load.customersCount - 1) * 16 +
        Math.max(0, load.dischargesCount - load.customersCount) * 8
      const distanceKm = baseDistanceKm + additionalKm

      // ANTT oficial vigente
      const anttFloor = anttEngine.calculateFloor({
        distanceKm,
        vehicleType,
        axlesCount: axles,
        cargoType: 'Geral',
      })

      // Pedágios
      const tollRes = tollEngine.calculateTolls(distanceKm, vehicleType, axles, load.itineraryCode)

      // Operacional e Múltiplas Descargas
      const totalWeightTon = Math.max(0.01, load.totalWeightKg / 1000)
      const opAnalysis = calculateTripOperationalAnalysis({
        distanceKm,
        weightTon: totalWeightTon,
        axlesCount: axles,
        cargoType: 'Geral',
        dischargesCount: load.dischargesCount,
        anttFloorValue: anttFloor.floorValue,
        tollCost: tollRes.totalTollCost,
        additionalPerDischarge,
        appliesFromDischargeNum,
      })

      // Frete sugerido = Piso ANTT + Adicional de Descargas + Pedágio
      // NUNCA abaixo do piso regulatório
      const totalSuggestedFreight = opAnalysis.ciafalEconomicReferenceTotal

      const occupancyPct = Math.min(
        100,
        Math.round((load.totalWeightKg / Math.max(1, capacityKg)) * 1000) / 10,
      )
      const balanceKg = Math.max(0, capacityKg - load.totalWeightKg)

      // Etapa 3: Score Multicritério Explicável
      const score = calculateMulticriteriaScore({
        occupancyPct,
        driverPreferredItinerary:
          vehicle.preferred_itinerary || (vehicle as any).preferred_itinerary_code,
        cargoItineraryCode: load.itineraryCode,
        dischargesCount: load.dischargesCount,
        isStockReady: load.isStockReady,
        isCreditLiberated: !load.hasBlockedCredit && !load.hasInAnalysisCredit,
        isCreditInAnalysis: load.hasInAnalysisCredit,
        isPcpReady: load.isPcpReady,
        driverQueueGroup: vehicle.type,
        waitingMinutes,
        costPerTon: opAnalysis.costPerTon,
      })

      // Alerta de Oportunidade: ocupação ≥ 95% + PORTA espera > 30min + estoque e crédito prontos
      const isOpportunity =
        occupancyPct >= 95 &&
        vehicle.type === 'PORTA' &&
        waitingMinutes >= 30 &&
        load.isStockReady &&
        !load.hasBlockedCredit &&
        !load.hasInAnalysisCredit

      const matchId = `MATCH-${matchSeq.toString().padStart(3, '0')}`
      matchSeq++
      hasViableMatch = true

      const matchObj: VehicleLoadMatch = {
        matchId,
        temporalTab: vehicleTab,
        queueVehicle: vehicle,
        driverName:
          vehicle.driver_name_cached || driverMaster?.name || 'Motorista Não Identificado',
        driverDocument: vehicle.driver_doc_cached || driverMaster?.document,
        driverPhone: vehicle.driver_whatsapp_cached || driverMaster?.whatsapp,
        vehiclePlate: vehicle.vehicle_plate_cached || vehicleMaster?.plate || 'SEM PLACA',
        vehicleType,
        vehicleCapacityKg: capacityKg,
        axlesCount: axles,
        driverQueueGroup: vehicle.type,
        waitingMinutes,
        driverPreferredItinerary:
          vehicle.preferred_itinerary || (vehicle as any).preferred_itinerary_code,
        driverPreferredItineraryName: vehicle.preferred_itinerary_name,
        candidateLoad: load,
        fracionamentos: load.fracionamentos,
        remessasPrevistas: load.remessasPrevistas,
        occupancyPct,
        balanceKg,
        distanceKm,
        anttFloorValue: anttFloor.floorValue,
        tollCost: tollRes.totalTollCost,
        totalSuggestedFreight,
        costPerTon: opAnalysis.costPerTon,
        costPerKm: opAnalysis.costPerKm,
        extraDischargesCost: opAnalysis.totalDischargesAdditionalCost,
        operationalAnalysis: opAnalysis,
        score,
        checks: elim.checks,
        isOpportunity,
        createdAt: new Date().toISOString(),
      }

      matches.push(matchObj)

      // Status da Célula na Matriz
      const cellStatus = load.hasInAnalysisCredit || !load.isStockReady ? 'CONDITIONED' : 'VIABLE'
      matrixCells[cellKey] = {
        status: cellStatus,
        matchId,
        score: score.totalScore,
        reason:
          cellStatus === 'CONDITIONED'
            ? 'Carga viável condicionada à aprovação gerencial de crédito ou lote PCP'
            : 'Encontro 100% viável e regulamentado pela ANTT',
      }
    })

    // Se o veículo não teve match viável nenhum, montar diagnóstico detalhado
    if (!hasViableMatch) {
      const summaryParts: string[] = []
      if (elimCounter.exceedsCapacity > 0) {
        summaryParts.push(
          `${elimCounter.exceedsCapacity} carga(s) excedem a capacidade de ${(capacityKg / 1000).toFixed(1)}t`,
        )
      }
      if (elimCounter.incompatibleBodyType > 0) {
        summaryParts.push(
          `${elimCounter.incompatibleBodyType} carga(s) exigem carroceria diferente de ${vehicleType}`,
        )
      }
      if (elimCounter.incompatibleDischarge > 0) {
        summaryParts.push(
          `${elimCounter.incompatibleDischarge} carga(s) com método de descarga incompatível com o veículo`,
        )
      }
      if (elimCounter.blockedCredit > 0) {
        summaryParts.push(`${elimCounter.blockedCredit} carga(s) com crédito financeiro bloqueado`)
      }
      if (elimCounter.missingStock > 0) {
        summaryParts.push(`${elimCounter.missingStock} carga(s) sem saldo em estoque DP34/PCP`)
      }
      if (elimCounter.incompatibleItinerary > 0) {
        summaryParts.push(
          `${elimCounter.incompatibleItinerary} carga(s) incompatíveis com a rota preferencial`,
        )
      }
      if (elimCounter.blockedDocumentation > 0) {
        summaryParts.push('Bloqueio no cadastro SAP ZSD004')
      }

      const summaryMessage =
        summaryParts.length > 0
          ? summaryParts.join('; ') + '.'
          : 'Nenhuma carga compatível com o perfil operacional deste veículo no momento.'

      nonMatchDiagnoses.push({
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.vehicle_plate_cached || 'SEM PLACA',
        driverName: vehicle.driver_name_cached || 'Motorista',
        queueGroup: vehicle.type,
        waitingMinutes,
        vehicleCapacityKg: capacityKg,
        vehicleType,
        preferredItinerary:
          vehicle.preferred_itinerary || (vehicle as any).preferred_itinerary_code,
        totalCargasEvaluated: candidateLoads.length,
        eliminations: elimCounter,
        detailedReasons: Array.from(new Set(vehicleDetailedReasons)),
        summaryMessage,
      })
    }
  })

  // 5. Ordenação dos Encontros segundo critério selecionado com desempate bonificando menor fracionamento
  const sortedMatches = [...matches].sort((a, b) => {
    let primaryDiff = 0
    switch (sortCriteria) {
      case 'MENOR_FRETE':
        primaryDiff = a.totalSuggestedFreight - b.totalSuggestedFreight
        break
      case 'MENOR_RS_POR_TON':
        primaryDiff = a.costPerTon - b.costPerTon
        break
      case 'MAIOR_OCUPACAO':
        primaryDiff = b.occupancyPct - a.occupancyPct
        break
      case 'MENOR_DISTANCIA':
        primaryDiff = a.distanceKm - b.distanceKm
        break
      case 'MENOR_ESPERA':
        primaryDiff = a.waitingMinutes - b.waitingMinutes
        break
      case 'MAIOR_PRIORIDADE': {
        const pOrder = { ALTA: 3, MEDIA: 2, NORMAL: 1 }
        const diffP = pOrder[b.candidateLoad.priorityLevel] - pOrder[a.candidateLoad.priorityLevel]
        if (diffP !== 0) primaryDiff = diffP
        else primaryDiff = b.candidateLoad.maxOverdueDays - a.candidateLoad.maxOverdueDays
        break
      }
      case 'MELHOR_SCORE':
        primaryDiff = b.score.totalScore - a.score.totalScore
        break
      case 'MENOR_DESCARGAS':
        primaryDiff = a.candidateLoad.dischargesCount - b.candidateLoad.dischargesCount
        break
      default:
        primaryDiff = a.totalSuggestedFreight - b.totalSuggestedFreight
    }

    // Se o critério principal for equivalente (ou diferença menor que 1% / empate técnico),
    // bonifica menor fracionamento (e menor remessas previstas)
    const isEquivalent =
      Math.abs(primaryDiff) <
      (sortCriteria === 'MENOR_FRETE' || sortCriteria === 'MENOR_RS_POR_TON'
        ? 5
        : sortCriteria === 'MAIOR_OCUPACAO'
          ? 0.5
          : 0.001)

    if (isEquivalent) {
      const fracDiff = (a.fracionamentos || 0) - (b.fracionamentos || 0)
      if (fracDiff !== 0) return fracDiff
    }

    return primaryDiff
  })

  // Economia Potencial: estimada pela redução de frete spot/mercado vs Piso ANTT regulado + ganho de ocupação
  const potentialSavingsTotal = Math.round(
    sortedMatches.reduce((sum, m) => {
      // Benchmark padrão: frete negociado médio spot é cerca de 12-15% superior à meta otimizada
      const baseline = m.totalSuggestedFreight * 1.12
      return sum + Math.max(0, baseline - m.totalSuggestedFreight)
    }, 0),
  )

  const matrixVehicles = activeQueue.map((v) => ({
    id: v.id,
    plate: v.vehicle_plate_cached || 'SEM PLACA',
    driverName: v.driver_name_cached || 'Motorista',
    group: v.type,
    capacityKg: v.vehicle_capacity_kg_cached || 27000,
  }))

  const matrixCargas = candidateLoads.map((c) => ({
    id: c.id,
    title: c.title,
    itineraryCode: c.itineraryCode,
    weightKg: c.totalWeightKg,
    dischargesCount: c.dischargesCount,
  }))

  return {
    matches: sortedMatches,
    viableMatchesCount: sortedMatches.length,
    totalVehiclesAnalyzed: activeQueue.length,
    totalCargasAnalyzed: candidateLoads.length,
    potentialSavingsTotal,
    nonMatchDiagnoses,
    matrixVehicles,
    matrixCargas,
    matrixCells,
    generatedAt: new Date().toISOString(),
  }
}
