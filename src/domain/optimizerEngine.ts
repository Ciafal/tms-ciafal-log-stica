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
  | 'PROGRAMACAO_IMPACTADA_REANALISE_NECESSARIA'

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
  economicResultScore: number // pontuação por resultado econômico previsto (+5 a +15)
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
    | 'scenario_a_immediate'
    | 'scenario_b_max_occupancy'
    | 'scenario_c_overdue'
    | 'scenario_d_best_profit'
    | 'scenario_e_lowest_cost'
    | 'scenario_f_balanced'
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

export interface ItinerarySuggestion {
  suggestedCode: string
  confidence: number // 0 a 100
  reason: string
  source: 'SAP_EXACT' | 'UF_CITY_MATCH' | 'SIMILAR_CUSTOMER' | 'GEOGRAPHIC_INFERENCE'
  humanValidationRequired: boolean
}

export type OrderRoutingStatus =
  | 'ROTEIRIZADO_IMEDIATO'
  | 'ROTEIRIZADO_PROPOSTA'
  | 'PROGRAMACAO_FUTURA'
  | 'AGUARDANDO_ESTOQUE'
  | 'AGUARDANDO_CREDITO'
  | 'AGUARDANDO_DATA_DESEJADA'
  | 'SEM_ITINERARIO_CADASTRADO'
  | 'RESTRICAO_LOGISTICA'
  | 'INCOMPATIVEL_VEICULO'
  | 'AGUARDANDO_COMPLEMENTO'
  | 'EXCECAO_CADASTRAL'

export interface OrderReconciliationItem {
  orderId: string
  orderNumber: string
  itemNumber?: string
  customerName: string
  customerCode: string
  destinationCity: string
  uf: string
  itineraryCode?: string
  suggestedItinerary?: ItinerarySuggestion
  weightKg: number
  totalValue: number
  desiredDate?: string
  status: OrderRoutingStatus
  statusLabel: string
  statusDetail: string
  assignedCargoId?: string
  assignedScenarioType?: string
  isAssignedToCargo: boolean
  reasons: string[]
}

export interface WalletReconciliationSummary {
  totalWalletOrders: number
  totalWalletWeightKg: number
  totalWalletValue: number
  routedOrdersCount: number
  routedWeightKg: number
  futureOrdersCount: number
  futureWeightKg: number
  blockedStockCount: number
  blockedCreditCount: number
  blockedDateCount: number
  unmappedItineraryCount: number
  waitingComplementCount: number
  exceptionCount: number
  reconciliationDiff: number // DEVE SER 0: totalWalletOrders - (routed + future + blockedStock + blockedCredit + blockedDate + unmapped + waitingComplement + exception)
  items: OrderReconciliationItem[]
}

export interface ProposedCargoEntity {
  id: string
  cargoNumber: string
  itineraryCode: string
  itineraryDescription?: string
  uf?: string
  region?: string
  isSuggestedItinerary: boolean
  suggestedItineraryInfo?: ItinerarySuggestion
  plannedExpeditionDate: string
  vehicleType: string
  vehicleCapacityKg: number
  totalWeightKg: number
  occupancyPct: number
  occupancyBand: 'EXCELENTE' | 'BOA' | 'ATENCAO' | 'BAIXA'
  occupancyAlert?: string
  readinessStatus: OperationalReadinessStatus
  readinessLabel:
    | 'SAÍDA IMEDIATA'
    | 'PROGRAMAÇÃO FUTURA'
    | 'AGUARDANDO COMPLEMENTO'
    | 'BLOQUEADA / EXCEÇÃO'
  orders: SapSalesOrderEntity[]
  customersCount: number
  ordersCount: number
  dischargesCount: number
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
  costPerCustomer: number
  scoreBreakdown: OptimizationScoreBreakdown
  priorityRanking: number
  whyProposed: string
  reasons: string[]
  suggestedAction?: string
}

export interface GlobalOptimizerResult {
  allProposedCargos: ProposedCargoEntity[]
  immediateExitCargos: ProposedCargoEntity[]
  futureProgrammingCargos: ProposedCargoEntity[]
  complementCargos: ProposedCargoEntity[]
  exceptionOrders: OrderReconciliationItem[]
  discoveredItineraries: Array<{
    code: string
    description: string
    region?: string
    uf?: string
    ordersCount: number
    totalWeightKg: number
    cargosCount: number
  }>
  kpis: {
    totalProposedCargos: number
    readyForImmediateExitCount: number
    waitingComplementCount: number
    futureProgrammingCount: number
    totalPlannedWeightKg: number
    avgOccupancyPct: number
    attendedOrdersCount: number
    pendingOrdersCount: number
    totalWalletOrdersCount: number
    totalPortaDriversCount: number
  }
  reconciliation: WalletReconciliationSummary
}

export interface OptimizerEngineInput {
  itineraryCode?: string // Se vazio ou "ALL", otimiza todos os itinerários
  plannedDate: string
  orders: SapSalesOrderEntity[]
  stocks: SapStockCurrentEntity[]
  pcpOrders: PcpProductionOrderEntity[]
  queueEntries: QueueEntryEntity[]
  vehicleCapacityKg: number
  vehicleType: string
  weights?: OptimizationWeights
  occupancyBands?: OccupancyBandConfig
  itinerariesMetadata?: Record<string, { description: string; region?: string; uf?: string }>
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
/**
 * Motor de Inferência / Sugestão Inteligente de Itinerário
 * Utilizado quando o pedido da ZSD35A não possui itinerário SAP preenchido.
 */
export function inferItineraryForOrder(
  order: SapSalesOrderEntity,
  allOrdersWithItinerary: SapSalesOrderEntity[],
  itinerariesMetadata: Record<string, { description: string; region?: string; uf?: string }> = {},
): ItinerarySuggestion {
  const uf = (order.uf || '').trim().toUpperCase()
  const city = (order.destination_city || '').trim().toUpperCase()
  const customerCode = (order.customer_code || '').trim()

  // 1. Buscar se o mesmo cliente já teve entregas no mesmo itinerário
  if (customerCode) {
    const sameCustomerOrder = allOrdersWithItinerary.find(
      (o) =>
        o.customer_code === customerCode &&
        o.itinerary_code &&
        o.itinerary_code.trim().length > 0 &&
        o.id !== order.id,
    )
    if (sameCustomerOrder && sameCustomerOrder.itinerary_code) {
      const code = sameCustomerOrder.itinerary_code.trim()
      return {
        suggestedCode: code,
        confidence: 90,
        reason: `Histórico do cliente ${order.customer_name || customerCode} com entregas frequentes em ${code}.`,
        source: 'SIMILAR_CUSTOMER',
        humanValidationRequired: true,
      }
    }
  }

  // 2. Buscar correspondência exata por Cidade + UF em pedidos existentes
  if (city && uf) {
    const sameCityOrder = allOrdersWithItinerary.find(
      (o) =>
        (o.destination_city || '').trim().toUpperCase() === city &&
        (o.uf || '').trim().toUpperCase() === uf &&
        o.itinerary_code &&
        o.itinerary_code.trim().length > 0,
    )
    if (sameCityOrder && sameCityOrder.itinerary_code) {
      const code = sameCityOrder.itinerary_code.trim()
      return {
        suggestedCode: code,
        confidence: 85,
        reason: `Mesmo município (${order.destination_city}/${uf}) de pedidos consolidados na rota ${code}.`,
        source: 'UF_CITY_MATCH',
        humanValidationRequired: true,
      }
    }
  }

  // 3. Buscar nos metadados cadastrais de sap_itineraries por UF e Cidade/Descrição
  const itinEntries = Object.entries(itinerariesMetadata)
  if (city) {
    const matchingMeta = itinEntries.find(
      ([, meta]) =>
        meta.description?.toUpperCase().includes(city) || meta.region?.toUpperCase().includes(city),
    )
    if (matchingMeta) {
      return {
        suggestedCode: matchingMeta[0],
        confidence: 80,
        reason: `Descrição do itinerário SAP (${matchingMeta[1].description}) contempla a cidade ${order.destination_city}.`,
        source: 'GEOGRAPHIC_INFERENCE',
        humanValidationRequired: true,
      }
    }
  }

  // 4. Buscar por UF principal
  if (uf) {
    const ufItin = itinEntries.find(
      ([code, meta]) => meta.uf?.toUpperCase() === uf || code.startsWith(uf),
    )
    if (ufItin) {
      return {
        suggestedCode: ufItin[0],
        confidence: 65,
        reason: `Itinerário padrão para o estado de ${uf} (${ufItin[1].description || ufItin[0]}).`,
        source: 'GEOGRAPHIC_INFERENCE',
        humanValidationRequired: true,
      }
    }
    // Fallback por prefixo de UF nos códigos (ex: SP001A, MG001A, RJ001A, etc.)
    const codeWithPrefix = allOrdersWithItinerary.find((o) =>
      o.itinerary_code?.toUpperCase().startsWith(uf),
    )
    if (codeWithPrefix && codeWithPrefix.itinerary_code) {
      return {
        suggestedCode: codeWithPrefix.itinerary_code.trim(),
        confidence: 60,
        reason: `Agrupamento geográfico por UF (${uf}) no itinerário ativo ${codeWithPrefix.itinerary_code}.`,
        source: 'GEOGRAPHIC_INFERENCE',
        humanValidationRequired: true,
      }
    }
  }

  return {
    suggestedCode: 'ITIN-GERAL',
    confidence: 30,
    reason:
      'Itinerário a determinar: sem correspondência exata de UF/Município. Exige validação humana.',
    source: 'GEOGRAPHIC_INFERENCE',
    humanValidationRequired: true,
  }
}

/**
 * MOTOR GLOBAL DE PROPOSTAS AUTOMÁTICAS DE CARGA (SPRINT CORREÇÃO FUNCIONAL PRIORITÁRIA)
 * Lê toda a Carteira Única (ZSD35A) -> Identifica todos os itinerários ->
 * Avalia elegibilidade -> Otimiza multicritério -> Propondo todas as cargas automaticamente.
 */
export function runGlobalCiafalOptimizer(input: OptimizerEngineInput): GlobalOptimizerResult {
  const {
    itineraryCode,
    plannedDate,
    orders = [],
    stocks = [],
    pcpOrders = [],
    queueEntries = [],
    vehicleCapacityKg = 28000,
    vehicleType = 'Carreta 5 Eixos',
    weights = DEFAULT_OPTIMIZATION_WEIGHTS,
    occupancyBands = DEFAULT_OCCUPANCY_BANDS,
    itinerariesMetadata = {},
  } = input

  const mappedOrdersWithItin = orders.filter(
    (o) => o.itinerary_code && o.itinerary_code.trim().length > 0,
  )

  // 1. Identificar todos os itinerários presentes na carteira
  const discoveredItinerariesMap: Record<
    string,
    {
      code: string
      orders: SapSalesOrderEntity[]
      isSuggestedGroup?: boolean
      suggestionInfo?: ItinerarySuggestion
    }
  > = {}

  orders.forEach((ord) => {
    let itin = (ord.itinerary_code || '').trim()
    let isSuggested = false
    let suggestion: ItinerarySuggestion | undefined

    if (!itin) {
      suggestion = inferItineraryForOrder(ord, mappedOrdersWithItin, itinerariesMetadata)
      itin = suggestion.suggestedCode
      isSuggested = true
    }

    if (!discoveredItinerariesMap[itin]) {
      discoveredItinerariesMap[itin] = {
        code: itin,
        orders: [],
        isSuggestedGroup: isSuggested,
        suggestionInfo: suggestion,
      }
    }
    discoveredItinerariesMap[itin].orders.push(ord)
  })

  // Se o usuário filtrou um itinerário específico, foca nele, caso contrário processa todos
  const targetItinCodes =
    itineraryCode && itineraryCode !== 'ALL' && itineraryCode !== '__ALL__' && itineraryCode !== ''
      ? [itineraryCode]
      : Object.keys(discoveredItinerariesMap).sort()

  const allProposedCargos: ProposedCargoEntity[] = []
  const assignedOrderIds = new Set<string>()
  const orderRoutingStatusMap = new Map<
    string,
    {
      status: OrderRoutingStatus
      label: string
      detail: string
      assignedCargoId?: string
      assignedScenarioType?: string
      reasons: string[]
    }
  >()

  let cargoIndexCounter = 1

  // Base de cálculo de eixos
  let axles = 5
  if (vehicleType.toLowerCase().includes('toco')) axles = 2
  else if (vehicleType.toLowerCase().includes('truck')) axles = 3
  else if (
    vehicleType.toLowerCase().includes('bitrem') ||
    vehicleType.toLowerCase().includes('7 eixos')
  )
    axles = 7
  else if (vehicleType.toLowerCase().includes('6 eixos')) axles = 6

  // 2. Para cada itinerário identificado, gerar propostas automáticas
  targetItinCodes.forEach((itin) => {
    const itinData = discoveredItinerariesMap[itin]
    if (!itinData) return

    const itinOrders = itinData.orders
    const meta = (itinerariesMetadata && itinerariesMetadata[itin]) || {
      description: itin,
      region: '',
      uf: 'SP',
    }
    const itinDescription =
      meta.description ||
      meta.region ||
      (itinData.isSuggestedGroup ? 'Itinerário Sugerido TMS' : itin)
    const itinUf = meta.uf || (itin.length >= 2 ? itin.substring(0, 2) : 'SP')
    const itinRegion = meta.region || itinDescription

    // Motoristas PORTA compatíveis com este itinerário
    const portaDrivers = queueEntries.filter(
      (q) =>
        q.type === 'PORTA' &&
        q.status === 'disponivel' &&
        (!q.preferred_itinerary || q.preferred_itinerary === itin),
    )

    // Avaliação detalhada de cada pedido do itinerário
    const evaluatedItinOrders = itinOrders.map((ord) => {
      const dateCheck = validateDesiredDate(ord.desired_date, plannedDate)
      const dp34Check = validateDp34Stock(ord.material || '', ord.weight_kg, stocks, pcpOrders)
      const creditCheck = classifyCredit(ord)

      return {
        order: ord,
        dateCheck,
        dp34Check,
        creditCheck,
      }
    })

    // Separar pedidos elegíveis (respeitam a data de expedição planejada)
    const eligibleOrders = evaluatedItinOrders.filter((e) => e.dateCheck.isValid)
    const futureDateOrders = evaluatedItinOrders.filter((e) => !e.dateCheck.isValid)

    // Marcar inicialmente pedidos com bloqueio de data
    futureDateOrders.forEach((item) => {
      orderRoutingStatusMap.set(item.order.id, {
        status: 'AGUARDANDO_DATA_DESEJADA',
        label: 'Aguardando Data Desejada',
        detail: `Data desejada (${item.order.desired_date?.split('T')[0] || 'N/I'}) é posterior à data prevista (${plannedDate}). Anti-antecipação ativa.`,
        reasons: ['Anti-antecipação: Data desejada futura.'],
      })
    })

    // Função interna para construir uma proposta de carga completa
    const buildCargoProposal = (
      cargoOrders: SapSalesOrderEntity[],
      proposalType: 'IMMEDIATE' | 'MAX_OCC' | 'OVERDUE' | 'BALANCED' | 'FUTURE_PCP' | 'COMPLEMENT',
      customWhyProposed?: string,
    ): ProposedCargoEntity => {
      const totalWeightKg = cargoOrders.reduce((sum, o) => sum + (o.weight_kg || 0), 0)
      const occupancyPct = Math.min(
        100,
        Math.round((totalWeightKg / Math.max(1, vehicleCapacityKg)) * 1000) / 10,
      )
      const occBand = classifyOccupancyBand(occupancyPct, occupancyBands)

      const uniqueCustomers = Array.from(new Set(cargoOrders.map((s) => s.customer_code)))
      const customersCount = uniqueCustomers.length
      const ordersCount = cargoOrders.length
      const dischargesCount = Math.max(
        customersCount,
        cargoOrders.reduce((sum, o) => sum + (o.discharges_count || 1), 0),
      )

      // Atrasos
      let totalOverdueDays = 0
      let maxOverdueDays = 0
      let overdueCount = 0
      cargoOrders.forEach((o) => {
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
      cargoOrders.forEach((o) => {
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
      cargoOrders.forEach((o) => {
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

      // Distância, ANTT e Pedágio
      const baseDistance = 380
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
      const costPerCustomer =
        customersCount > 0
          ? Math.round((estimatedCost / customersCount) * 100) / 100
          : estimatedCost

      // Motoristas PORTA
      const eligiblePortaDrivers = portaDrivers.filter((p) => {
        if (!p.vehicle_capacity_kg_cached) return true
        return p.vehicle_capacity_kg_cached >= totalWeightKg * 0.95
      })
      const hasPortaDriver = eligiblePortaDrivers.length > 0

      // Score Explícito
      const occupancyScore = Math.min(40, (occupancyPct / 100) * weights.weightOccupancy)
      const overdueScore = Math.min(
        25,
        Math.min(20, maxOverdueDays * 3) + (overdueCount > 0 ? 5 : 0),
      )
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

      // Determinar Status de Prontidão e Rótulo
      let readinessStatus: OperationalReadinessStatus = 'PRONTA_PARA_OFERTA'
      let readinessLabel: ProposedCargoEntity['readinessLabel'] = 'SAÍDA IMEDIATA'
      const reasons: string[] = []

      if (totalWeightKg > vehicleCapacityKg) {
        readinessStatus = 'BLOQUEADA'
        readinessLabel = 'BLOQUEADA / EXCEÇÃO'
        reasons.push(
          `Excesso de peso: ${(totalWeightKg / 1000).toFixed(1)}t excede a capacidade (${(vehicleCapacityKg / 1000).toFixed(1)}t).`,
        )
      }

      if (creditClassification === 'BLOQUEADO') {
        readinessStatus = 'BLOQUEADA'
        readinessLabel = 'BLOQUEADA / EXCEÇÃO'
        reasons.push(
          `Contém pedido(s) com Crédito Bloqueado (Total: R$ ${blockedCreditValue.toLocaleString('pt-BR')}).`,
        )
      }

      if (!isDp34FullyStocked) {
        if (readinessStatus !== 'BLOQUEADA') {
          readinessStatus = 'PLANEJAMENTO_FUTURO'
          readinessLabel = 'PROGRAMAÇÃO FUTURA'
        }
        reasons.push(
          `Estoque DP34 insuficiente (faltam ${(dp34MissingSum / 1000).toFixed(1)}t em outros depósitos ou PCP).`,
        )
      }

      if (
        isDp34FullyStocked &&
        creditClassification === 'LIBERADO' &&
        totalWeightKg <= vehicleCapacityKg
      ) {
        if (occupancyPct < 80) {
          readinessLabel = 'AGUARDANDO COMPLEMENTO'
          reasons.push(
            `Ocupação de ${occupancyPct}% abaixo de 80%. Recomenda-se complemento de carga.`,
          )
        } else {
          readinessStatus = 'PRONTA_SAIDA_IMEDIATA'
          readinessLabel = 'SAÍDA IMEDIATA'
          reasons.push(
            '100% Apta para SAÍDA IMEDIATA: Estoque DP34 + Crédito liberado + Ocupação excelente/boa.',
          )
        }
      }

      // Explicabilidade: "Por que o TMS propôs esta carga?"
      let whyProposed = customWhyProposed
      if (!whyProposed) {
        const overdueText =
          overdueCount > 0 ? `contempla ${overdueCount} pedido(s) atrasado(s), ` : ''
        const portaText = hasPortaDriver ? `possui motorista PORTA disponível no pátio, ` : ''
        const stockText = isDp34FullyStocked
          ? '100% dos materiais confirmados no DP34'
          : 'com produção programada PCP'
        const creditText =
          creditClassification === 'LIBERADO'
            ? 'todos os clientes com crédito liberado'
            : 'crédito sob análise com aprovação'
        whyProposed = `Carga priorizada automaticamente pelo TMS: ${overdueText}aproveita ${occupancyPct}% de ocupação (${(totalWeightKg / 1000).toFixed(1)}t), ${portaText}${stockText} e ${creditText}.`
      }

      const explanation = `Score ${totalScore}/100: Ocupação ${occupancyPct}% (+${occupancyScore.toFixed(0)}), Atrasos +${overdueScore}, Motorista PORTA +${portaDriverScore}, Eficiência +${routeEfficiencyScore}, Estoque DP34 +${stockConfidenceScore}, Crédito +${creditConfidenceScore}.`

      let suggestedAction = ''
      if (readinessLabel === 'SAÍDA IMEDIATA') {
        suggestedAction = 'Aprovar carga e encaminhar para Leilão/Mesa de Fretes.'
      } else if (readinessLabel === 'AGUARDANDO COMPLEMENTO') {
        suggestedAction = 'Buscar pedidos complementares para atingir 95% de ocupação.'
      } else if (readinessLabel === 'PROGRAMAÇÃO FUTURA') {
        suggestedAction = 'Acompanhar liberação de estoque DP34 / PCP.'
      } else {
        suggestedAction = 'Revisar bloqueios de crédito ou excesso de peso.'
      }

      const cargoId = `CARGA-${itin}-${String(cargoIndexCounter++).padStart(3, '0')}`

      return {
        id: cargoId,
        cargoNumber: cargoId,
        itineraryCode: itin,
        itineraryDescription: itinDescription,
        uf: itinUf,
        region: itinRegion,
        isSuggestedItinerary: Boolean(itinData.isSuggestedGroup),
        suggestedItineraryInfo: itinData.suggestionInfo,
        plannedExpeditionDate: plannedDate,
        vehicleType,
        vehicleCapacityKg,
        totalWeightKg,
        occupancyPct,
        occupancyBand: occBand.band,
        occupancyAlert: occBand.alert,
        readinessStatus,
        readinessLabel,
        orders: cargoOrders,
        customersCount,
        ordersCount,
        dischargesCount,
        hasPortaDriver,
        eligiblePortaDriversCount: eligiblePortaDrivers.length,
        eligiblePortaDriverNames: eligiblePortaDrivers.map(
          (d) => d.driver_name_cached || 'Motorista PORTA',
        ),
        distanceKm,
        durationMinutes,
        tollsValue,
        anttFloorValue: antt.floorValue,
        estimatedCost,
        costPerTon,
        costPerTonKm,
        costPerCustomer,
        scoreBreakdown: {
          totalScore,
          occupancyScore,
          overdueScore,
          portaDriverScore,
          routeEfficiencyScore,
          tollImpactScore,
          economicResultScore: 10,
          stockConfidenceScore,
          creditConfidenceScore,
          explanation,
        },
        priorityRanking: 0,
        whyProposed,
        reasons,
        suggestedAction,
      }
    }

    // ALGORITMO DE AGRUPAMENTO E MONTAGEM DE CARGAS DETERMINÍSTICO:
    // Passo A: Agrupar pedidos totalmente aptos (DP34 + Crédito Liberado) em cargas completas
    const readyItems = eligibleOrders.filter(
      (e) => e.dp34Check.isDp34Available && e.creditCheck.classification === 'LIBERADO',
    )

    // Ordenar prioritariamente por pedidos atrasados e peso
    const sortedReady = [...readyItems].sort((a, b) => {
      if (b.dateCheck.isOverdue && !a.dateCheck.isOverdue) return 1
      if (!b.dateCheck.isOverdue && a.dateCheck.isOverdue) return -1
      if (b.dateCheck.overdueDays !== a.dateCheck.overdueDays) {
        return b.dateCheck.overdueDays - a.dateCheck.overdueDays
      }
      return (b.order.weight_kg || 0) - (a.order.weight_kg || 0)
    })

    // Montar cargas com capacidade do veículo (Bin-packing First-Fit Decreasing)
    const currentBatches: SapSalesOrderEntity[][] = []
    let currentBatch: SapSalesOrderEntity[] = []
    let currentWeight = 0

    sortedReady.forEach((item) => {
      const ordWeight = item.order.weight_kg || 0
      if (currentWeight + ordWeight <= vehicleCapacityKg) {
        currentBatch.push(item.order)
        currentWeight += ordWeight
      } else {
        if (currentBatch.length > 0) {
          currentBatches.push(currentBatch)
        }
        currentBatch = [item.order]
        currentWeight = ordWeight
      }
    })
    if (currentBatch.length > 0) {
      currentBatches.push(currentBatch)
    }

    currentBatches.forEach((batch) => {
      const prop = buildCargoProposal(batch, 'IMMEDIATE')
      allProposedCargos.push(prop)
      batch.forEach((o) => {
        assignedOrderIds.add(o.id)
        orderRoutingStatusMap.set(o.id, {
          status: prop.occupancyPct >= 80 ? 'ROTEIRIZADO_IMEDIATO' : 'AGUARDANDO_COMPLEMENTO',
          label:
            prop.occupancyPct >= 80 ? 'Roteirizado (Saída Imediata)' : 'Aguardando Complemento',
          detail: `Alocado na proposta ${prop.cargoNumber} (${prop.occupancyPct}% ocupação).`,
          assignedCargoId: prop.cargoNumber,
          reasons: prop.reasons,
        })
      })
    })

    // Passo B: Pedidos com crédito a aprovar ou estoque PCP/outro depósito não contemplados
    const remainingEligible = eligibleOrders.filter((e) => !assignedOrderIds.has(e.order.id))
    if (remainingEligible.length > 0) {
      // Tentar formar cargas de Programação Futura ou Complemento
      let futureBatch: SapSalesOrderEntity[] = []
      let futureWeight = 0

      remainingEligible.forEach((item) => {
        const ordWeight = item.order.weight_kg || 0
        if (futureWeight + ordWeight <= vehicleCapacityKg) {
          futureBatch.push(item.order)
          futureWeight += ordWeight
        } else {
          if (futureBatch.length > 0) {
            const fProp = buildCargoProposal(
              futureBatch,
              'FUTURE_PCP',
              `Carga sugerida para programação futura: aguarda saldo DP34/PCP ou liberação de crédito.`,
            )
            allProposedCargos.push(fProp)
            futureBatch.forEach((o) => {
              assignedOrderIds.add(o.id)
              orderRoutingStatusMap.set(o.id, {
                status: 'PROGRAMACAO_FUTURA',
                label: 'Programação Futura',
                detail: `Alocado na proposta futura ${fProp.cargoNumber}.`,
                assignedCargoId: fProp.cargoNumber,
                reasons: fProp.reasons,
              })
            })
          }
          futureBatch = [item.order]
          futureWeight = ordWeight
        }
      })

      if (futureBatch.length > 0) {
        const fProp = buildCargoProposal(
          futureBatch,
          'FUTURE_PCP',
          `Carga sugerida para programação futura: aguarda saldo DP34/PCP ou liberação de crédito.`,
        )
        allProposedCargos.push(fProp)
        futureBatch.forEach((o) => {
          assignedOrderIds.add(o.id)
          orderRoutingStatusMap.set(o.id, {
            status: 'PROGRAMACAO_FUTURA',
            label: 'Programação Futura',
            detail: `Alocado na proposta futura ${fProp.cargoNumber}.`,
            assignedCargoId: fProp.cargoNumber,
            reasons: fProp.reasons,
          })
        })
      }
    }
  })

  // 3. Atribuir ranking às cargas propostas ordenadas por Score e Aptidão
  allProposedCargos.sort((a, b) => {
    // Prioridade 1: SAÍDA IMEDIATA
    if (a.readinessLabel === 'SAÍDA IMEDIATA' && b.readinessLabel !== 'SAÍDA IMEDIATA') return -1
    if (a.readinessLabel !== 'SAÍDA IMEDIATA' && b.readinessLabel === 'SAÍDA IMEDIATA') return 1
    // Prioridade 2: Score multicritério total
    return b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore
  })

  allProposedCargos.forEach((cargo, index) => {
    cargo.priorityRanking = index + 1
  })

  // 4. Reconciliação Total da Carteira Única (RECONCILIAÇÃO MATEMÁTICA DE 100% DOS PEDIDOS)
  const reconciliationItems: OrderReconciliationItem[] = orders.map((ord) => {
    const routingInfo = orderRoutingStatusMap.get(ord.id)
    const itin = (ord.itinerary_code || '').trim()
    const suggestion = !itin
      ? inferItineraryForOrder(ord, mappedOrdersWithItin, itinerariesMetadata)
      : undefined

    let status: OrderRoutingStatus = 'EXCECAO_CADASTRAL'
    let statusLabel = 'Exceção Cadastral'
    let statusDetail = 'Não classificado em nenhuma carga.'
    let assignedCargoId: string | undefined = undefined
    let reasons: string[] = []

    if (routingInfo) {
      status = routingInfo.status
      statusLabel = routingInfo.label
      statusDetail = routingInfo.detail
      assignedCargoId = routingInfo.assignedCargoId
      reasons = routingInfo.reasons
    } else {
      const dateCheck = validateDesiredDate(ord.desired_date, plannedDate)
      const dp34Check = validateDp34Stock(ord.material || '', ord.weight_kg, stocks, pcpOrders)
      const creditCheck = classifyCredit(ord)

      if (!dateCheck.isValid) {
        status = 'AGUARDANDO_DATA_DESEJADA'
        statusLabel = 'Aguardando Data Desejada'
        statusDetail = `Data desejada (${ord.desired_date?.split('T')[0] || 'N/I'}) posterior a ${plannedDate}.`
        reasons.push('Anti-antecipação: Data futura')
      } else if (creditCheck.classification === 'BLOQUEADO') {
        status = 'AGUARDANDO_CREDITO'
        statusLabel = 'Crédito Bloqueado'
        statusDetail = 'Pedido com crédito bloqueado pelo financeiro SAP.'
        reasons.push('Crédito Bloqueado no SAP')
      } else if (!dp34Check.isDp34Available) {
        status = 'AGUARDANDO_ESTOQUE'
        statusLabel = 'Aguardando Saldo DP34'
        statusDetail = dp34Check.statusMessage
        reasons.push('Estoque DP34 não disponível')
      } else if (!itin) {
        status = 'SEM_ITINERARIO_CADASTRADO'
        statusLabel = 'Sem Itinerário SAP'
        statusDetail = `Sugerido pelo TMS: ${suggestion?.suggestedCode} (${suggestion?.reason}). Exige validação humana.`
        reasons.push('Itinerário não cadastrado no SAP')
      }
    }

    return {
      orderId: ord.id,
      orderNumber: ord.order_number,
      itemNumber: ord.item_number,
      customerName: ord.customer_name,
      customerCode: ord.customer_code,
      destinationCity: ord.destination_city || 'N/I',
      uf: ord.uf || 'SP',
      itineraryCode: ord.itinerary_code,
      suggestedItinerary: suggestion,
      weightKg: ord.weight_kg || 0,
      totalValue: ord.total_value || 0,
      desiredDate: ord.desired_date,
      status,
      statusLabel,
      statusDetail,
      assignedCargoId,
      isAssignedToCargo: Boolean(assignedCargoId),
      reasons,
    }
  })

  // Agrupamentos por Abas
  const immediateExitCargos = allProposedCargos.filter((c) => c.readinessLabel === 'SAÍDA IMEDIATA')
  const futureProgrammingCargos = allProposedCargos.filter(
    (c) => c.readinessLabel === 'PROGRAMAÇÃO FUTURA',
  )
  const complementCargos = allProposedCargos.filter(
    (c) => c.readinessLabel === 'AGUARDANDO COMPLEMENTO',
  )
  const exceptionOrders = reconciliationItems.filter((item) => !item.isAssignedToCargo)

  // Descoberta e contagem de itinerários para exibição nos filtros
  const discoveredItineraries = Object.entries(discoveredItinerariesMap)
    .map(([code, data]) => {
      const meta = (itinerariesMetadata && itinerariesMetadata[code]) || {
        description: code,
        region: '',
        uf: 'SP',
      }
      const totalWeight = data.orders.reduce((sum, o) => sum + (o.weight_kg || 0), 0)
      const cargosForItin = allProposedCargos.filter((c) => c.itineraryCode === code).length
      return {
        code,
        description:
          meta.description ||
          meta.region ||
          (data.isSuggestedGroup ? 'Itinerário Sugerido TMS' : code),
        region: meta.region,
        uf: meta.uf,
        ordersCount: data.orders.length,
        totalWeightKg: totalWeight,
        cargosCount: cargosForItin,
      }
    })
    .sort((a, b) => b.ordersCount - a.ordersCount)

  // Resumo de Reconciliação
  const totalWalletOrders = orders.length
  const totalWalletWeightKg = orders.reduce((sum, o) => sum + (o.weight_kg || 0), 0)
  const totalWalletValue = orders.reduce((sum, o) => sum + (o.total_value || 0), 0)

  const routedOrdersCount = reconciliationItems.filter(
    (i) => i.status === 'ROTEIRIZADO_IMEDIATO' || i.status === 'ROTEIRIZADO_PROPOSTA',
  ).length
  const routedWeightKg = reconciliationItems
    .filter((i) => i.status === 'ROTEIRIZADO_IMEDIATO' || i.status === 'ROTEIRIZADO_PROPOSTA')
    .reduce((sum, i) => sum + i.weightKg, 0)

  const futureOrdersCount = reconciliationItems.filter(
    (i) => i.status === 'PROGRAMACAO_FUTURA',
  ).length
  const futureWeightKg = reconciliationItems
    .filter((i) => i.status === 'PROGRAMACAO_FUTURA')
    .reduce((sum, i) => sum + i.weightKg, 0)

  const blockedStockCount = reconciliationItems.filter(
    (i) => i.status === 'AGUARDANDO_ESTOQUE',
  ).length
  const blockedCreditCount = reconciliationItems.filter(
    (i) => i.status === 'AGUARDANDO_CREDITO',
  ).length
  const blockedDateCount = reconciliationItems.filter(
    (i) => i.status === 'AGUARDANDO_DATA_DESEJADA',
  ).length
  const unmappedItineraryCount = reconciliationItems.filter(
    (i) => i.status === 'SEM_ITINERARIO_CADASTRADO',
  ).length
  const waitingComplementCount = reconciliationItems.filter(
    (i) => i.status === 'AGUARDANDO_COMPLEMENTO',
  ).length
  const exceptionCount = reconciliationItems.filter(
    (i) =>
      i.status === 'RESTRICAO_LOGISTICA' ||
      i.status === 'INCOMPATIVEL_VEICULO' ||
      i.status === 'EXCECAO_CADASTRAL',
  ).length

  const sumClassified =
    routedOrdersCount +
    futureOrdersCount +
    blockedStockCount +
    blockedCreditCount +
    blockedDateCount +
    unmappedItineraryCount +
    waitingComplementCount +
    exceptionCount

  const reconciliationDiff = totalWalletOrders - sumClassified

  const totalPlannedWeight = allProposedCargos.reduce((sum, c) => sum + c.totalWeightKg, 0)
  const avgOccupancy =
    allProposedCargos.length > 0
      ? Math.round(
          (allProposedCargos.reduce((sum, c) => sum + c.occupancyPct, 0) /
            allProposedCargos.length) *
            10,
        ) / 10
      : 0

  const attendedOrdersCount = assignedOrderIds.size
  const pendingOrdersCount = totalWalletOrders - attendedOrdersCount

  return {
    allProposedCargos,
    immediateExitCargos,
    futureProgrammingCargos,
    complementCargos,
    exceptionOrders,
    discoveredItineraries,
    kpis: {
      totalProposedCargos: allProposedCargos.length,
      readyForImmediateExitCount: immediateExitCargos.length,
      waitingComplementCount: complementCargos.length,
      futureProgrammingCount: futureProgrammingCargos.length,
      totalPlannedWeightKg: totalPlannedWeight,
      avgOccupancyPct: avgOccupancy,
      attendedOrdersCount,
      pendingOrdersCount,
      totalWalletOrdersCount: totalWalletOrders,
      totalPortaDriversCount: queueEntries.filter(
        (q) => q.type === 'PORTA' && q.status === 'disponivel',
      ).length,
    },
    reconciliation: {
      totalWalletOrders,
      totalWalletWeightKg,
      totalWalletValue,
      routedOrdersCount,
      routedWeightKg,
      futureOrdersCount,
      futureWeightKg,
      blockedStockCount,
      blockedCreditCount,
      blockedDateCount,
      unmappedItineraryCount,
      waitingComplementCount,
      exceptionCount,
      reconciliationDiff,
      items: reconciliationItems,
    },
  }
}

/**
 * Motor Determinístico de Otimização Multicritério da CIAFAL (Sprint 5 - Cenários de um itinerário específico)
 * Preservado integralmente para compatibilidade com testes e análises aprofundadas de itinerário.
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
    itineraryCode = '',
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

  // 1. Filtrar pedidos do itinerário (se "ALL" ou vazio, pega todos com itinerário ou o primeiro)
  const itinOrders =
    itineraryCode && itineraryCode !== 'ALL' && itineraryCode !== '__ALL__'
      ? orders.filter((o) => o.itinerary_code === itineraryCode)
      : orders

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

    // Resultado econômico previsto da carga (Sprint 6)
    const totalOrderValue = selected.reduce((sum, o) => sum + (o.total_value || 0), 0)
    const revenueEst = (totalWeightKg / 1000) * 210.0 // Base comercial média
    const predictedResult = Math.round((revenueEst - estimatedCost) * 100) / 100

    // Score Explícito (0 a 100)
    const occupancyScore = Math.min(40, (occupancyPct / 100) * weights.weightOccupancy)
    const overdueScore = Math.min(25, Math.min(20, maxOverdueDays * 3) + (overdueCount > 0 ? 5 : 0))
    const portaDriverScore = hasPortaDriver ? weights.weightPortaDriver : 0
    const routeEfficiencyScore = Math.max(0, 10 - Math.max(0, customersCount - 2) * 3)
    const tollImpactScore = Math.max(0, 15 - Math.round(tollsValue / 50))
    const economicResultScore = predictedResult > 1000 ? 10 : predictedResult > 0 ? 5 : 0
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
      economicResultScore +
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

    const explanation = `Score ${totalScore}/100: Ocupação ${occupancyPct}% (+${occupancyScore.toFixed(0)}), Atrasos +${overdueScore}, Motorista PORTA +${portaDriverScore}, Eficiência Rota +${routeEfficiencyScore}, Resultado Previsto +${economicResultScore}, Estoque DP34 +${stockConfidenceScore}, Crédito +${creditConfidenceScore}.`

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
        economicResultScore,
        stockConfidenceScore,
        creditConfidenceScore,
        explanation,
      },
      reasons,
      suggestedAction,
    }
  }

  // GERAR OS 6 CENÁRIOS OBRIGATÓRIOS DA SPRINT 6:
  // Cenário A — Saída Imediata
  // Cenário B — Ocupação Máxima
  // Cenário C — Pedidos Atrasados
  // Cenário D — Melhor Resultado Econômico
  // Cenário E — Menor Custo Logístico
  // Cenário F — Melhor Equilíbrio Geral
  const scenarios: OptimizedScenario[] = []

  // CENÁRIO A: Saída Imediata (DP34 100% + Crédito Liberado + Motorista PORTA)
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
  if (immediateOrders.length > 0) {
    scenarios.push(
      buildScenarioMetrics(
        immediateOrders,
        'scenario_a_immediate',
        'Cenário A — Saída Imediata',
        'Foca exclusivamente em pedidos com estoque DP34 confirmado, crédito aprovado e motoristas na PORTA prontos para carregamento.',
      ),
    )
  }

  // CENÁRIO B: Ocupação Máxima (Maximiza capacidade volumétrica/peso)
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
  if (maxOccOrders.length > 0) {
    scenarios.push(
      buildScenarioMetrics(
        maxOccOrders,
        'max_occupancy',
        'Cenário B — Ocupação Máxima',
        'Maximiza o aproveitamento da capacidade volumétrica e de peso do veículo até o teto regulatório.',
      ),
    )
  }
  // CENÁRIO C: Pedidos Atrasados (Prioriza clientes com maior tempo de carteira/atraso)
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
  if (overdueOrders.length > 0) {
    scenarios.push(
      buildScenarioMetrics(
        overdueOrders,
        'scenario_c_overdue',
        'Cenário C — Pedidos Atrasados',
        'Prioriza o atendimento a clientes com pedidos que ultrapassaram a data desejada.',
      ),
    )
  }

  // CENÁRIO D: Melhor Resultado Econômico (Maximiza margem líquida prevista)
  const sortedByRevenue = [...validForExpedition].sort(
    (a, b) => (b.order.total_value || 0) - (a.order.total_value || 0),
  )
  const profitOrders: SapSalesOrderEntity[] = []
  let wProfit = 0
  for (const item of sortedByRevenue) {
    if (wProfit + item.order.weight_kg <= vehicleCapacityKg) {
      profitOrders.push(item.order)
      wProfit += item.order.weight_kg
    }
  }
  if (profitOrders.length > 0) {
    scenarios.push(
      buildScenarioMetrics(
        profitOrders,
        'scenario_d_best_profit',
        'Cenário D — Melhor Resultado Econômico',
        'Maximiza a margem líquida prevista e o valor faturado da carga combinando clientes de alta rentabilidade.',
      ),
    )
  }

  // CENÁRIO E: Menor Custo Logístico (Agrupamento com menor km e menor pedágio)
  const compactGroup = [...validForExpedition].slice(0, 3).map((e) => e.order)
  if (compactGroup.length > 0) {
    scenarios.push(
      buildScenarioMetrics(
        compactGroup,
        'scenario_e_lowest_cost',
        'Cenário E — Menor Custo Logístico',
        'Minimiza paradas intermediárias, custos adicionais de pedágio e desvio de rota.',
      ),
    )
  }

  // CENÁRIO F: Melhor Equilíbrio Geral (Otimização balanceada multicritério)
  const balancedOrders: SapSalesOrderEntity[] = []
  let wBalanced = 0
  const atrasadosComEstoque = validForExpedition.filter(
    (e) => e.dateCheck.isOverdue && e.dp34Check.isDp34Available,
  )
  for (const item of atrasadosComEstoque) {
    if (wBalanced + item.order.weight_kg <= vehicleCapacityKg) {
      balancedOrders.push(item.order)
      wBalanced += item.order.weight_kg
    }
  }
  for (const item of validForExpedition) {
    if (!balancedOrders.some((b) => b.id === item.order.id)) {
      if (wBalanced + item.order.weight_kg <= vehicleCapacityKg) {
        balancedOrders.push(item.order)
        wBalanced += item.order.weight_kg
      }
    }
  }
  if (balancedOrders.length > 0) {
    scenarios.push(
      buildScenarioMetrics(
        balancedOrders,
        'scenario_f_balanced',
        'Cenário F — Melhor Equilíbrio Geral',
        'Ponto de equilíbrio ótimo entre ocupação elevada, atendimento a atrasados e baixo custo operacional.',
      ),
    )
  }

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
