// TMS CIAFAL — Sprint 5: Motor de Otimização Multicritério Determinístico
// Arquitetura: O agente conversa. O motor de regras decide. O SAP registra. O TMS orquestra.

import {
  SapSalesOrderEntity,
  SapStockCurrentEntity,
  PcpProductionOrderEntity,
  QueueEntryEntity,
  VehicleEntity,
} from './rules'
import { routingService, tollService, anttService } from './rules'

export type OperationalReadinessStatus =
  | 'PRONTA_SAIDA_IMEDIATA'
  | 'PRONTA_PARA_OFERTA'
  | 'PLANEJAMENTO_FUTURO'
  | 'BLOQUEADA'

export type CreditClassification =
  | 'LIBERADO'
  | 'LIBERADO_COM_APROVACAO'
  | 'BLOQUEADO'
  | 'DADO_DESATUALIZADO'

export interface OptimizationScoreBreakdown {
  totalScore: number // 0 a 100
  occupancyScore: number // baseado em ocupação %
  overdueScore: number // pontos adicionais por atraso de pedidos
  portaDriverScore: number // bônus de presença física na PORTA (+10 a +15)
  routeEfficiencyScore: number // penalidade por desvio / km adicional
  tollImpactScore: number // impacto de pedágios
  stockConfidenceScore: number // 100% DP34 disponível
  creditConfidenceScore: number // penalidade se requerer aprovação
  explanation: string
}

export interface OptimizationWeights {
  weightOccupancy: number // default 40
  weightOverdue: number // default 20
  weightPortaDriver: number // default 15
  weightRouteEfficiency: number // default 10
  weightCost: number // default 15
}

export const DEFAULT_OPTIMIZATION_WEIGHTS: OptimizationWeights = {
  weightOccupancy: 40,
  weightOverdue: 20,
  weightPortaDriver: 15,
  weightRouteEfficiency: 10,
  weightCost: 15,
}

export interface OccupancyBandConfig {
  excelenteMin: number // >= 95%
  boaMin: number // 90% a 94.99%
  atencaoMin: number // 80% a 89.99%
  baixaMax: number // < 80%
}

export const DEFAULT_OCCUPANCY_BANDS: OccupancyBandConfig = {
  excelenteMin: 95,
  boaMin: 90,
  atencaoMin: 80,
  baixaMax: 79.99,
}

export function classifyOccupancyBand(
  occupancyPct: number,
  bands: OccupancyBandConfig = DEFAULT_OCCUPANCY_BANDS,
): {
  band: 'EXCELENTE' | 'BOA' | 'ATENCAO' | 'BAIXA'
  color: string
  alert?: string
} {
  if (occupancyPct >= bands.excelenteMin) {
    return { band: 'EXCELENTE', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' }
  }
  if (occupancyPct >= bands.boaMin) {
    return { band: 'BOA', color: 'text-blue-700 bg-blue-50 border-blue-300' }
  }
  if (occupancyPct >= bands.atencaoMin) {
    return {
      band: 'ATENCAO',
      color: 'text-amber-700 bg-amber-50 border-amber-300',
      alert: 'Ocupação entre 80% e 90%. Avaliar complemento.',
    }
  }
  return {
    band: 'BAIXA',
    color: 'text-rose-700 bg-rose-50 border-rose-300',
    alert: 'ALERTA DE BAIXA OCUPAÇÃO: Carga abaixo de 80%. Sugerido complemento ou adiar.',
  }
}

/**
 * REGRA ABSOLUTA DE DATA DESEJADA:
 * Formalmente: data_expedicao >= data_desejada
 * Carga NUNCA pode ser expedida antes da data desejada sem alteração oficial.
 */
export function validateDesiredDate(
  orderDesiredDate: string | undefined,
  plannedExpeditionDate: string,
): {
  isValid: boolean
  isAnticipated: boolean
  isOverdue: boolean
  overdueDays: number
  rejectionReason?: string
} {
  if (!orderDesiredDate) {
    return {
      isValid: true,
      isAnticipated: false,
      isOverdue: false,
      overdueDays: 0,
    }
  }

  const desiredStr = orderDesiredDate.split('T')[0]
  const plannedStr = plannedExpeditionDate.split('T')[0]

  const desiredTime = new Date(desiredStr).getTime()
  const plannedTime = new Date(plannedStr).getTime()
  const todayStr = new Date().toISOString().split('T')[0]
  const todayTime = new Date(todayStr).getTime()

  // Tentativa de antecipação
  if (plannedTime < desiredTime) {
    return {
      isValid: false,
      isAnticipated: true,
      isOverdue: false,
      overdueDays: 0,
      rejectionReason: `DATA_ANTECIPADA_NAO_PERMITIDA: Pedido programado para ${plannedStr}, antes da data desejada pelo cliente (${desiredStr}).`,
    }
  }

  // Pedido atrasado em relação a hoje
  let isOverdue = false
  let overdueDays = 0
  if (todayTime > desiredTime) {
    isOverdue = true
    overdueDays = Math.floor((todayTime - desiredTime) / (1000 * 60 * 60 * 24))
  }

  return {
    isValid: true,
    isAnticipated: false,
    isOverdue,
    overdueDays,
  }
}

/**
 * REGRA OFICIAL DE ESTOQUE DP34:
 * O depósito oficial de expedição da CIAFAL é o DP34.
 * NÃO somar automaticamente com outros depósitos (ex: DP01, DP10, Almoxarifado).
 */
export function validateDp34Stock(
  materialCode: string,
  requiredWeightKg: number,
  stocks: SapStockCurrentEntity[],
  pcpOrders: PcpProductionOrderEntity[] = [],
): {
  isDp34Available: boolean
  dp34AvailableKg: number
  otherDepositsKg: number
  otherDepositsBreakdown: Array<{ storageLocation: string; availableKg: number }>
  pcpFutureKg: number
  needsStockConfirmation: boolean
  statusMessage: string
} {
  const matchingStocks = stocks.filter((s) => s.material_code === materialCode)

  const dp34Stocks = matchingStocks.filter(
    (s) =>
      s.storage_location?.toUpperCase() === 'DP34' ||
      s.storage_location?.toUpperCase().includes('DP34'),
  )

  const dp34AvailableKg = dp34Stocks.reduce(
    (sum, s) => sum + (s.available_qty * 1000 || s.weight_kg || 0),
    0,
  )

  const otherStocks = matchingStocks.filter(
    (s) =>
      s.storage_location?.toUpperCase() !== 'DP34' &&
      !s.storage_location?.toUpperCase().includes('DP34'),
  )

  const otherDepositsBreakdown = otherStocks.map((s) => ({
    storageLocation: s.storage_location || 'OUTROS',
    availableKg: s.available_qty * 1000 || s.weight_kg || 0,
  }))

  const otherDepositsKg = otherDepositsBreakdown.reduce((sum, o) => sum + o.availableKg, 0)

  // PCP Robotizado (Previsão futura de produção, NÃO estoque DP34 disponível)
  const pcpMatching = pcpOrders.filter(
    (p) => p.material_code === materialCode && p.status !== 'Cancelada',
  )
  const pcpFutureKg = pcpMatching.reduce((sum, p) => sum + (p.weight_kg_planned || 0), 0)

  const isDp34Available = dp34AvailableKg >= requiredWeightKg
  const needsStockConfirmation =
    !isDp34Available ||
    Math.abs(dp34AvailableKg - requiredWeightKg) < 1000 || // saldo muito próximo (margem de 1t)
    (dp34AvailableKg < requiredWeightKg && otherDepositsKg + dp34AvailableKg >= requiredWeightKg)

  let statusMessage = ''
  if (isDp34Available) {
    statusMessage = `ESTOQUE DP34 100% DISPONÍVEL (${(dp34AvailableKg / 1000).toFixed(1)}t disponíveis para ${(requiredWeightKg / 1000).toFixed(1)}t necessárias)`
  } else if (dp34AvailableKg > 0) {
    statusMessage = `ESTOQUE DP34 INSUFICIENTE: DP34 tem ${(dp34AvailableKg / 1000).toFixed(1)}t. Outros depósitos somam ${(otherDepositsKg / 1000).toFixed(1)}t (não combinados automaticamente). Necessidade: ${(requiredWeightKg / 1000).toFixed(1)}t.`
  } else {
    statusMessage = `MATERIAL SEM SALDO NO DP34. Outros depósitos: ${(otherDepositsKg / 1000).toFixed(1)}t. PCP Previsto: ${(pcpFutureKg / 1000).toFixed(1)}t.`
  }

  return {
    isDp34Available,
    dp34AvailableKg,
    otherDepositsKg,
    otherDepositsBreakdown,
    pcpFutureKg,
    needsStockConfirmation,
    statusMessage,
  }
}

/**
 * REVALIDAÇÃO DE CRÉDITO ANTES DE PROGRAMAR:
 * Avalia por VALOR FINANCEIRO do pedido/cliente.
 */
export function classifyCredit(order: SapSalesOrderEntity): {
  classification: CreditClassification
  reason: string
} {
  const status = order.credit_status
  if (status === 'Liberado') {
    return {
      classification: 'LIBERADO',
      reason: 'Crédito aprovado e liberado pelo financeiro.',
    }
  }
  if (status === 'Em Análise') {
    return {
      classification: 'LIBERADO_COM_APROVACAO',
      reason: 'Crédito sob análise do financeiro. Requer aprovação de alçada.',
    }
  }
  if (status === 'Bloqueado') {
    return {
      classification: 'BLOQUEADO',
      reason: 'Crédito BLOQUEADO pelo financeiro no SAP.',
    }
  }
  return {
    classification: 'DADO_DESATUALIZADO',
    reason: 'Status de crédito não informado ou desatualizado.',
  }
}

/**
 * Cenário Gerado pelo Otimizador
 */
export interface OptimizedScenario {
  id: string
  title: string
  scenarioType:
    | 'max_occupancy'
    | 'immediate_exit'
    | 'prioritize_overdue'
    | 'lowest_cost'
    | 'balanced'
    | 'future_pcp'
  description: string
  readinessStatus: OperationalReadinessStatus
  itineraryCode: string
  plannedExpeditionDate: string
  vehicleType: string
  vehicleCapacityKg: number
  totalWeightKg: number
  occupancyPct: number
  occupancyBand: 'EXCELENTE' | 'BOA' | 'ATENCAO' | 'BAIXA'
  occupancyAlert?: string
  orders: SapSalesOrderEntity[]
  blockedOrders: SapSalesOrderEntity[]
  customersCount: number
  ordersCount: number
  avgOverdueDays: number
  maxOverdueDays: number
  hasPortaDriver: boolean
  eligiblePortaDriversCount: number
  eligiblePortaDriverNames: string[]
  distanceKm: number
  durationMinutes: number
  tollsValue: number
  anttFloorValue: number
  estimatedCost: number
  costPerTon: number
  costPerTonKm: number
  dp34StockAvailableKg: number
  dp34StockMissingKg: number
  isDp34FullyStocked: boolean
  creditClassification: CreditClassification
  ordersTotalValue: number
  blockedCreditValue: number
  scoreBreakdown: OptimizationScoreBreakdown
  reasons: string[]
  suggestedAction?: string
}

export interface OptimizerEngineInput {
  itineraryCode: string
  plannedDate: string
  orders: SapSalesOrderEntity[]
  stocks: SapStockCurrentEntity[]
  pcpOrders: PcpProductionOrderEntity[]
  queueEntries: QueueEntryEntity[]
  vehicleCapacityKg: number
  vehicleType: string
  weights?: OptimizationWeights
  occupancyBands?: OccupancyBandConfig
}

/**
 * Motor Determinístico de Otimização Multicritério da CIAFAL (Sprint 5)
 * Gera 5 cenários com objetivos claros:
 * 1. Ocupação Máxima
 * 2. Saída Imediata (DP34 + Crédito + Data + PORTA)
 * 3. Pedidos Mais Atrasados
 * 4. Menor Custo por Tonelada
 * 5. Melhor Equilíbrio (Equilibrado)
 * + Cenário Opcional: Produção Futura PCP
 */
export function runCiafalOptimizer(input: OptimizerEngineInput): {
  scenarios: OptimizedScenario[]
  immediateExitCargos: OptimizedScenario[]
  summary: {
    totalOrdersEvaluated: number
    validOrdersCount: number
    blockedFutureDateCount: number
    blockedCreditCount: number
    blockedStockCount: number
    portaDriversAvailableCount: number
  }
} {
  const {
    itineraryCode,
    plannedDate,
    orders,
    stocks,
    pcpOrders,
    queueEntries,
    vehicleCapacityKg,
    vehicleType,
    weights = DEFAULT_OPTIMIZATION_WEIGHTS,
    occupancyBands = DEFAULT_OCCUPANCY_BANDS,
  } = input

  // 1. Filtrar pedidos do itinerário
  const itinOrders = orders.filter((o) => o.itinerary_code === itineraryCode)

  // 2. Motoristas PORTA disponíveis e compatíveis
  const portaDrivers = queueEntries.filter(
    (q) =>
      q.type === 'PORTA' &&
      q.status === 'disponivel' &&
      (!q.preferred_itinerary || q.preferred_itinerary === itineraryCode),
  )

  // 3. Filtrar pedidos e validar data desejada (REGRA ABSOLUTA)
  let blockedFutureDateCount = 0
  let blockedCreditCount = 0
  let blockedStockCount = 0

  const evaluatedOrders = itinOrders.map((ord) => {
    const dateCheck = validateDesiredDate(ord.desired_date, plannedDate)
    if (!dateCheck.isValid) blockedFutureDateCount++

    const dp34Check = validateDp34Stock(ord.material || '', ord.weight_kg, stocks, pcpOrders)
    if (!dp34Check.isDp34Available) blockedStockCount++

    const creditCheck = classifyCredit(ord)
    if (creditCheck.classification === 'BLOQUEADO') blockedCreditCount++

    return {
      order: ord,
      dateCheck,
      dp34Check,
      creditCheck,
    }
  })

  // Pedidos válidos para simulação (respeitam data_expedicao >= data_desejada)
  const validForExpedition = evaluatedOrders.filter((e) => e.dateCheck.isValid)

  // Base de cálculo de rotas e ANTT
  const baseDistance = 380
  let axles = 5
  if (vehicleType.toLowerCase().includes('toco')) axles = 2
  else if (vehicleType.toLowerCase().includes('truck')) axles = 3
  else if (vehicleType.toLowerCase().includes('bitrem')) axles = 7

  // Função auxiliar para calcular métricas de um conjunto de pedidos
  const buildScenarioMetrics = (
    selected: SapSalesOrderEntity[],
    scenarioType: OptimizedScenario['scenarioType'],
    title: string,
    description: string,
  ): OptimizedScenario => {
    const totalWeightKg = selected.reduce((sum, o) => sum + (o.weight_kg || 0), 0)
    const occupancyPct = Math.min(
      100,
      Math.round((totalWeightKg / Math.max(1, vehicleCapacityKg)) * 1000) / 10,
    )
    const occBand = classifyOccupancyBand(occupancyPct, occupancyBands)

    const uniqueCustomers = Array.from(new Set(selected.map((s) => s.customer_code)))
    const customersCount = uniqueCustomers.length
    const ordersCount = selected.length

    // Atrasos
    let totalOverdueDays = 0
    let maxOverdueDays = 0
    let overdueCount = 0
    selected.forEach((o) => {
      const chk = validateDesiredDate(o.desired_date, plannedDate)
      if (chk.isOverdue) {
        totalOverdueDays += chk.overdueDays
        overdueCount++
        if (chk.overdueDays > maxOverdueDays) maxOverdueDays = chk.overdueDays
      }
    })
    const avgOverdueDays = overdueCount > 0 ? Math.round(totalOverdueDays / overdueCount) : 0

    // Estoque DP34
    let dp34AvailableSum = 0
    let dp34MissingSum = 0
    let isDp34FullyStocked = true
    selected.forEach((o) => {
      const st = validateDp34Stock(o.material || '', o.weight_kg, stocks, pcpOrders)
      if (st.isDp34Available) {
        dp34AvailableSum += o.weight_kg
      } else {
        isDp34FullyStocked = false
        dp34MissingSum += o.weight_kg - st.dp34AvailableKg
      }
    })

    // Crédito
    let blockedCreditValue = 0
    let hasApprovalNeeded = false
    let hasBlocked = false
    selected.forEach((o) => {
      const cr = classifyCredit(o)
      if (cr.classification === 'BLOQUEADO') {
        hasBlocked = true
        blockedCreditValue += o.total_value || 0
      } else if (cr.classification === 'LIBERADO_COM_APROVACAO') {
        hasApprovalNeeded = true
      }
    })

    let creditClassification: CreditClassification = 'LIBERADO'
    if (hasBlocked) creditClassification = 'BLOQUEADO'
    else if (hasApprovalNeeded) creditClassification = 'LIBERADO_COM_APROVACAO'

    // Rota, ANTT e Pedágio
    const extraStopsDist = Math.max(0, customersCount - 1) * 18
    const distanceKm = baseDistance + extraStopsDist
    const durationMinutes = Math.round((distanceKm / 65) * 60)

    const antt = anttService.calculateFloorPrice({
      distanceKm,
      vehicleType,
      axlesCount: axles,
    })

    const tollsCount = Math.max(1, Math.floor(distanceKm / 55))
    const tollsValue = Math.round(tollsCount * (4.2 * axles) * 100) / 100
    const estimatedCost = antt.floorValue + tollsValue
    const costPerTon =
      totalWeightKg > 0 ? Math.round((estimatedCost / (totalWeightKg / 1000)) * 100) / 100 : 0
    const costPerTonKm =
      totalWeightKg > 0 && distanceKm > 0
        ? Math.round((estimatedCost / ((totalWeightKg / 1000) * distanceKm)) * 1000) / 1000
        : 0

    // Motoristas PORTA
    const eligiblePortaDrivers = portaDrivers.filter((p) => {
      if (!p.vehicle_capacity_kg_cached) return true
      return p.vehicle_capacity_kg_cached >= totalWeightKg * 0.95
    })
    const hasPortaDriver = eligiblePortaDrivers.length > 0

    // Score Explícito (0 a 100)
    const occupancyScore = Math.min(40, (occupancyPct / 100) * weights.weightOccupancy)
    const overdueScore = Math.min(25, Math.min(20, maxOverdueDays * 3) + (overdueCount > 0 ? 5 : 0))
    const portaDriverScore = hasPortaDriver ? weights.weightPortaDriver : 0
    const routeEfficiencyScore = Math.max(0, 10 - Math.max(0, customersCount - 2) * 3)
    const tollImpactScore = Math.max(0, 15 - Math.round(tollsValue / 50))
    const stockConfidenceScore = isDp34FullyStocked ? 10 : 0
    const creditConfidenceScore =
      creditClassification === 'LIBERADO'
        ? 10
        : creditClassification === 'LIBERADO_COM_APROVACAO'
          ? 5
          : 0

    const rawTotal =
      occupancyScore +
      overdueScore +
      portaDriverScore +
      routeEfficiencyScore +
      stockConfidenceScore +
      creditConfidenceScore

    const totalScore = Math.min(100, Math.max(10, Math.round(rawTotal)))

    // Classificação de Prontidão Operacional
    let readinessStatus: OperationalReadinessStatus = 'PRONTA_PARA_OFERTA'
    const reasons: string[] = []

    if (totalWeightKg > vehicleCapacityKg) {
      readinessStatus = 'BLOQUEADA'
      reasons.push(
        `Excesso de peso: ${(totalWeightKg / 1000).toFixed(1)}t excede a capacidade (${(vehicleCapacityKg / 1000).toFixed(1)}t).`,
      )
    }

    if (creditClassification === 'BLOQUEADO') {
      readinessStatus = 'BLOQUEADA'
      reasons.push(
        `Contém pedido(s) com Crédito Bloqueado (Total: R$ ${blockedCreditValue.toLocaleString('pt-BR')}).`,
      )
    }

    if (!isDp34FullyStocked) {
      if (readinessStatus !== 'BLOQUEADA') {
        readinessStatus = 'PLANEJAMENTO_FUTURO'
      }
      reasons.push(`Estoque DP34 insuficiente (faltam ${(dp34MissingSum / 1000).toFixed(1)}t).`)
    }

    if (
      isDp34FullyStocked &&
      creditClassification === 'LIBERADO' &&
      totalWeightKg <= vehicleCapacityKg &&
      hasPortaDriver
    ) {
      readinessStatus = 'PRONTA_SAIDA_IMEDIATA'
      reasons.push(
        'Apto para SAÍDA IMEDIATA: Estoque DP34 pronto + Crédito liberado + Motorista PORTA elegível.',
      )
    } else if (
      isDp34FullyStocked &&
      (creditClassification === 'LIBERADO' || creditClassification === 'LIBERADO_COM_APROVACAO') &&
      totalWeightKg <= vehicleCapacityKg
    ) {
      readinessStatus = 'PRONTA_PARA_OFERTA'
      reasons.push(
        'Pronta para Oferta na Mesa de Fretes: aguardando contratação de motorista compatível.',
      )
    }

    const explanation = `Score ${totalScore}/100: Ocupação ${occupancyPct}% (+${occupancyScore.toFixed(0)}), Atrasos +${overdueScore}, Motorista PORTA +${portaDriverScore}, Eficiência Rota +${routeEfficiencyScore}, Estoque DP34 +${stockConfidenceScore}, Crédito +${creditConfidenceScore}.`

    const ordersTotalValue = selected.reduce((sum, o) => sum + (o.total_value || 0), 0)

    let suggestedAction = ''
    if (readinessStatus === 'PRONTA_SAIDA_IMEDIATA') {
      suggestedAction = 'Aprovar carga e encaminhar para Leilão PORTA imediato.'
    } else if (readinessStatus === 'PRONTA_PARA_OFERTA') {
      suggestedAction = 'Aprovar carga e abrir oferta na Mesa de Fretes.'
    } else if (hasBlocked) {
      suggestedAction = 'Remover pedido bloqueado e recalcular carga.'
    } else if (occBand.band === 'BAIXA') {
      suggestedAction = 'Buscar pedido de complemento no mesmo itinerário.'
    }

    return {
      id: `scen-${scenarioType}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      scenarioType,
      description,
      readinessStatus,
      itineraryCode,
      plannedExpeditionDate: plannedDate,
      vehicleType,
      vehicleCapacityKg,
      totalWeightKg,
      occupancyPct,
      occupancyBand: occBand.band,
      occupancyAlert: occBand.alert,
      orders: selected,
      blockedOrders: selected.filter((o) => classifyCredit(o).classification === 'BLOQUEADO'),
      customersCount,
      ordersCount,
      avgOverdueDays,
      maxOverdueDays,
      hasPortaDriver,
      eligiblePortaDriversCount: eligiblePortaDrivers.length,
      eligiblePortaDriverNames: eligiblePortaDrivers.map(
        (d) => d.driver_name_cached || 'Motorista',
      ),
      distanceKm,
      durationMinutes,
      tollsValue,
      anttFloorValue: antt.floorValue,
      estimatedCost,
      costPerTon,
      costPerTonKm,
      dp34StockAvailableKg: dp34AvailableSum,
      dp34StockMissingKg: dp34MissingSum,
      isDp34FullyStocked,
      creditClassification,
      ordersTotalValue,
      blockedCreditValue,
      scoreBreakdown: {
        totalScore,
        occupancyScore,
        overdueScore,
        portaDriverScore,
        routeEfficiencyScore,
        tollImpactScore,
        stockConfidenceScore,
        creditConfidenceScore,
        explanation,
      },
      reasons,
      suggestedAction,
    }
  }

  // GERAR OS 5 CENÁRIOS PRINCIPAIS
  const scenarios: OptimizedScenario[] = []

  // 1. Cenário Ocupação Máxima
  const maxOccOrders: SapSalesOrderEntity[] = []
  let wMaxOcc = 0
  const sortedByWeightDesc = [...validForExpedition].sort(
    (a, b) => (b.order.weight_kg || 0) - (a.order.weight_kg || 0),
  )
  for (const item of sortedByWeightDesc) {
    if (wMaxOcc + item.order.weight_kg <= vehicleCapacityKg) {
      maxOccOrders.push(item.order)
      wMaxOcc += item.order.weight_kg
    }
  }
  scenarios.push(
    buildScenarioMetrics(
      maxOccOrders,
      'max_occupancy',
      'Cenário 1 — Ocupação Máxima',
      'Maximiza o aproveitamento da capacidade volumétrica e de peso do veículo.',
    ),
  )

  // 2. Cenário Saída Imediata (DP34 Disponível + Crédito Liberado + Motorista PORTA)
  const immediateCandidates = validForExpedition.filter(
    (e) => e.dp34Check.isDp34Available && e.creditCheck.classification === 'LIBERADO',
  )
  const immediateOrders: SapSalesOrderEntity[] = []
  let wImmediate = 0
  for (const item of immediateCandidates) {
    if (wImmediate + item.order.weight_kg <= vehicleCapacityKg) {
      immediateOrders.push(item.order)
      wImmediate += item.order.weight_kg
    }
  }
  scenarios.push(
    buildScenarioMetrics(
      immediateOrders.length > 0 ? immediateOrders : maxOccOrders.slice(0, 2),
      'immediate_exit',
      'Cenário 2 — Saída Imediata',
      'Foca exclusivamente em pedidos com estoque DP34 confirmado, crédito aprovado e motoristas na PORTA.',
    ),
  )

  // 3. Cenário Pedidos Mais Atrasados
  const sortedByOverdue = [...validForExpedition].sort((a, b) => {
    const diffA = b.dateCheck.overdueDays - a.dateCheck.overdueDays
    if (diffA !== 0) return diffA
    return (b.order.weight_kg || 0) - (a.order.weight_kg || 0)
  })
  const overdueOrders: SapSalesOrderEntity[] = []
  let wOverdue = 0
  for (const item of sortedByOverdue) {
    if (wOverdue + item.order.weight_kg <= vehicleCapacityKg) {
      overdueOrders.push(item.order)
      wOverdue += item.order.weight_kg
    }
  }
  scenarios.push(
    buildScenarioMetrics(
      overdueOrders,
      'prioritize_overdue',
      'Cenário 3 — Pedidos Mais Atrasados',
      'Prioriza o atendimento de clientes com pedidos que ultrapassaram a data desejada.',
    ),
  )

  // 4. Cenário Menor Custo (Agrupamento com menor número de paradas/desvios)
  const compactGroup = [...validForExpedition].slice(0, 3).map((e) => e.order)
  scenarios.push(
    buildScenarioMetrics(
      compactGroup,
      'lowest_cost',
      'Cenário 4 — Menor Custo por Tonelada',
      'Minimiza paradas intermediárias e custos adicionais de pedágio e desvio de rota.',
    ),
  )

  // 5. Cenário Equilibrado (Melhor Equilíbrio Ocupação + Atraso + PORTA + DP34)
  // Combina pedidos atrasados que tenham estoque e completam carga
  const balancedOrders: SapSalesOrderEntity[] = []
  let wBalanced = 0
  // Adiciona primeiro os atrasados com DP34
  const atrasadosComEstoque = validForExpedition.filter(
    (e) => e.dateCheck.isOverdue && e.dp34Check.isDp34Available,
  )
  for (const item of atrasadosComEstoque) {
    if (wBalanced + item.order.weight_kg <= vehicleCapacityKg) {
      balancedOrders.push(item.order)
      wBalanced += item.order.weight_kg
    }
  }
  // Completa com demais pedidos compatíveis
  for (const item of validForExpedition) {
    if (!balancedOrders.some((b) => b.id === item.order.id)) {
      if (wBalanced + item.order.weight_kg <= vehicleCapacityKg) {
        balancedOrders.push(item.order)
        wBalanced += item.order.weight_kg
      }
    }
  }
  scenarios.push(
    buildScenarioMetrics(
      balancedOrders,
      'balanced',
      'Cenário 5 — Melhor Equilíbrio',
      'Ponto de equilíbrio ótimo entre ocupação elevada, atendimento a atrasados e baixo custo operacional.',
    ),
  )

  // Painel de Saída Imediata (cargas com status PRONTA_SAIDA_IMEDIATA ordenadas por score)
  const immediateExitCargos = scenarios
    .filter((s) => s.readinessStatus === 'PRONTA_SAIDA_IMEDIATA' || s.hasPortaDriver)
    .sort((a, b) => b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore)

  return {
    scenarios,
    immediateExitCargos,
    summary: {
      totalOrdersEvaluated: itinOrders.length,
      validOrdersCount: validForExpedition.length,
      blockedFutureDateCount,
      blockedCreditCount,
      blockedStockCount,
      portaDriversAvailableCount: portaDrivers.length,
    },
  }
}
