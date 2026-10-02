/**
 * MOTOR DE OTIMIZAÇÃO LEXICOGRÁFICO DE CARGAS (TMS CIAFAL)
 *
 * CONCEITO DO PRODUTO:
 * Carga Proposta = "VEÍCULO DISPONÍVEL + PEDIDOS COMPATÍVEIS + MESMO ITINERÁRIO +
 * MENOR NÚMERO POSSÍVEL DE CLIENTES + MENOR NÚMERO POSSÍVEL DE DESCARGAS +
 * OCUPAÇÃO OTIMIZADA + MENOR DESVIO DE ROTA + MENOR FRETE LOGISTICAMENTE VIÁVEL +
 * CONFORMIDADE COM A REGRA ANTT".
 *
 * ORDEM DE PRIORIDADE HIERÁRQUICA (LEXICOGRÁFICA) — Não média ponderada simples:
 * 1. Filtro eliminatório de viabilidade: capacidade, ocupação mínima/máxima, disponibilidade,
 *    itinerário, estoque físico/DP34, PCP, crédito, anti-antecipação (data), restrições de veículo, piso ANTT.
 * 2. P1: Mesmo Itinerário (não misturar sem compatibilidade explícita).
 * 3. P2: Janela de expedição (pedidos atrasados/urgentes têm prioridade).
 * 4. P3: Menor quantidade de CLIENTES (proibido pequeno ganho de custo trocar 2 clientes por 6).
 * 5. P4: Menor quantidade de DESCARGAS (considera endereços/locais de entrega / discharges_count).
 * 6. P5: Ocupação dentro da faixa configurada (mín/máx).
 * 7. P6: Menor custo ANTT / logístico total.
 * 8. P7: Menor desvio / km adicional.
 * 9. P8: Melhor custo por tonelada (R$/t).
 *
 * MÚLTIPLAS ALTERNATIVAS: Até 3 melhores alternativas por itinerário/cenário.
 * EXPLICABILIDADE DETERMINÍSTICA: Detalhamento explícito de por que a carga foi selecionada
 * e comparação clara com alternativas e pedidos não selecionados.
 */

import {
  SapSalesOrderEntity,
  SapStockCurrentEntity,
  PcpProductionOrderEntity,
  QueueEntryEntity,
  anttService,
  AnttCalculationResult,
} from './rules'
import {
  validateDesiredDate,
  validateDp34Stock,
  classifyCredit,
  classifyOccupancyBand,
  ProposedCargoEntity,
  OccupancyBandConfig,
  DEFAULT_OCCUPANCY_BANDS,
  OptimizationScoreBreakdown,
  CreditClassification,
  OperationalReadinessStatus,
} from './optimizerEngine'

export interface EvaluatedOrder {
  order: SapSalesOrderEntity
  weightKg: number
  volumeM3: number
  customerCode: string
  customerName: string
  destinationCity: string
  uf: string
  dischargesCount: number
  deliveryAddressKey: string
  isOverdue: boolean
  overdueDays: number
  isDesiredDateValid: boolean
  isCreditApproved: boolean
  isCreditInAnalysis: boolean
  isCreditBlocked: boolean
  isStockAvailable: boolean
  stockMissingKg: number
  isIncompatibleVehicle: boolean
  rejectionReasons: string[]
}

export interface CandidateLoadCombination {
  orders: SapSalesOrderEntity[]
  evaluatedOrders: EvaluatedOrder[]
  totalWeightKg: number
  occupancyPct: number
  customersCount: number
  dischargesCount: number
  overdueOrdersCount: number
  maxOverdueDays: number
  totalOverdueDays: number
  distanceKm: number
  additionalKm: number
  durationMinutes: number
  tollsValue: number
  anttCalculation: AnttCalculationResult
  anttFloorValue: number
  estimatedCost: number
  costPerTon: number
  costPerTonKm: number
  costPerCustomer: number
  // Regra fundamental ANTT
  isBelowAnttFloor: boolean
  anttAlert?: string
  // Restrições operacionais
  isStockReady: boolean
  isCreditReady: boolean
  creditClassification: CreditClassification
  readinessStatus: OperationalReadinessStatus
  readinessLabel:
    | 'SAÍDA IMEDIATA'
    | 'PROGRAMAÇÃO FUTURA'
    | 'AGUARDANDO COMPLEMENTO'
    | 'BLOQUEADA / EXCEÇÃO'
  classificationStatus:
    | 'Aguardando consolidação'
    | 'Carga parcial — Complemento Comercial'
    | 'Carga dentro da faixa'
    | 'Capacidade excedida — Reotimizar'
  targetWeightKg: number
  missingWeightKg: number
  whyProposed: string
  reasons: string[]
  unselectedOrdersRationale: Array<{
    orderNumber: string
    customerName: string
    weightKg: number
    reason: string
  }>
  scoreBreakdown: OptimizationScoreBreakdown
}

export interface LexicographicOptimizationInput {
  itineraryCode: string
  itineraryDescription?: string
  uf?: string
  region?: string
  plannedDate: string
  orders: SapSalesOrderEntity[]
  stocks: SapStockCurrentEntity[]
  pcpOrders: PcpProductionOrderEntity[]
  queueEntries: QueueEntryEntity[]
  vehicleCapacityKg: number
  vehicleType: string
  minOccupancyPct?: number
  maxOccupancyPct?: number
  occupancyBands?: OccupancyBandConfig
  allowedMixedItineraries?: string[] // Apenas misturar se compatibilidade explícita
  negotiatedFreightCost?: number // Se houver valor negociado vindo de mesa
}

export interface LexicographicOptimizationResult {
  itineraryCode: string
  topProposals: ProposedCargoEntity[] // Até 3 alternativas
  bestProposal: ProposedCargoEntity | null
  combinationsEvaluated: number
  unviableCombinationsCount: number
  totalOrdersEvaluated: number
  eligibleOrdersCount: number
  ineligibleOrdersCount: number
}

/**
 * Normaliza e pré-avalia os pedidos individuais antes da formação de combinações.
 */
export function preEvaluateOrder(
  order: SapSalesOrderEntity,
  plannedDate: string,
  stocks: SapStockCurrentEntity[],
  pcpOrders: PcpProductionOrderEntity[],
  requiredVehicleType?: string,
): EvaluatedOrder {
  const rejectionReasons: string[] = []

  const dateCheck = validateDesiredDate(order.desired_date, plannedDate)
  if (!dateCheck.isValid) {
    rejectionReasons.push(
      `Anti-antecipação: Data desejada (${order.desired_date?.split('T')[0] || 'N/I'}) posterior a ${plannedDate}.`,
    )
  }

  const stockCheck = validateDp34Stock(order.material || '', order.weight_kg, stocks, pcpOrders)
  if (!stockCheck.isDp34Available) {
    rejectionReasons.push(`Estoque DP34 insuficiente: ${stockCheck.statusMessage}`)
  }

  const creditCheck = classifyCredit(order)
  if (creditCheck.classification === 'BLOQUEADO') {
    rejectionReasons.push('Crédito bloqueado no financeiro SAP.')
  }

  let isIncompatibleVehicle = false
  if (order.required_vehicle_type && requiredVehicleType) {
    const req = order.required_vehicle_type.toLowerCase()
    const cur = requiredVehicleType.toLowerCase()
    if (!cur.includes(req) && !req.includes(cur)) {
      isIncompatibleVehicle = true
      rejectionReasons.push(
        `Exigência de veículo específico (${order.required_vehicle_type}) incompatível com ${requiredVehicleType}.`,
      )
    }
  }

  const customerCode = (order.customer_code || '').trim() || 'CLI-AVULSO'
  const destinationCity = (order.destination_city || '').trim()
  const uf = (order.uf || 'SP').trim()
  const deliveryAddressKey = `${customerCode}_${destinationCity}_${uf}`

  const dischargesCount = Math.max(1, order.discharges_count || 1)

  return {
    order,
    weightKg: order.weight_kg || 0,
    volumeM3: order.volume_m3 || 0,
    customerCode,
    customerName: order.customer_name || 'Cliente Sem Razão Social',
    destinationCity,
    uf,
    dischargesCount,
    deliveryAddressKey,
    isOverdue: dateCheck.isOverdue,
    overdueDays: dateCheck.overdueDays,
    isDesiredDateValid: dateCheck.isValid,
    isCreditApproved: creditCheck.classification === 'LIBERADO',
    isCreditInAnalysis: creditCheck.classification === 'LIBERADO_COM_APROVACAO',
    isCreditBlocked: creditCheck.classification === 'BLOQUEADO',
    isStockAvailable: stockCheck.isDp34Available,
    stockMissingKg: stockCheck.isDp34Available
      ? 0
      : Math.max(0, order.weight_kg - stockCheck.dp34AvailableKg),
    isIncompatibleVehicle,
    rejectionReasons,
  }
}

/**
 * Calcula quantidade de eixos do veículo
 */
export function getAxlesForVehicle(vehicleType: string): number {
  const v = (vehicleType || '').toLowerCase()
  if (v.includes('toco') || v.includes('2 eixos') || v.includes('3/4')) return 2
  if (v.includes('truck') || v.includes('3 eixos')) return 3
  if (v.includes('bitruck') || v.includes('4 eixos')) return 4
  if (v.includes('bitrem') || v.includes('7 eixos')) return 7
  if (v.includes('rodotrem') || v.includes('9 eixos')) return 9
  if (v.includes('6 eixos') || v.includes('vanderleia')) return 6
  return 5 // Carreta 5 Eixos Padrão
}

/**
 * Calcula parâmetros logísticos e regulatórios ANTT para uma combinação candidata.
 * O piso ANTT é restrição do motor: não sugere frete abaixo do mínimo.
 */
export function calculateCandidateLogistics(
  orders: SapSalesOrderEntity[],
  vehicleType: string,
  vehicleCapacityKg: number,
  negotiatedFreightCost?: number,
): {
  distanceKm: number
  additionalKm: number
  durationMinutes: number
  tollsValue: number
  anttCalculation: AnttCalculationResult
  anttFloorValue: number
  estimatedCost: number
  costPerTon: number
  costPerTonKm: number
  costPerCustomer: number
  isBelowAnttFloor: boolean
  anttAlert?: string
  customersCount: number
  dischargesCount: number
} {
  const uniqueCustomers = Array.from(new Set(orders.map((o) => (o.customer_code || '').trim())))
  const customersCount = Math.max(1, uniqueCustomers.length)

  // Descargas: considera locais de entrega e pontos quando disponíveis
  const deliveryPoints = new Set(
    orders.map(
      (o) =>
        `${(o.customer_code || '').trim()}_${(o.destination_city || '').trim()}_${(o.uf || '').trim()}`,
    ),
  )
  const explicitDischarges = orders.reduce(
    (sum, o) => sum + Math.max(1, o.discharges_count || 1),
    0,
  )
  const dischargesCount = Math.max(customersCount, deliveryPoints.size, explicitDischarges)

  const axles = getAxlesForVehicle(vehicleType)
  const baseDistance = 380
  // Penalidade de km por cliente adicional (desvio de rota)
  const additionalKm =
    Math.max(0, customersCount - 1) * 18 + Math.max(0, dischargesCount - customersCount) * 8
  const distanceKm = baseDistance + additionalKm
  const durationMinutes = Math.round((distanceKm / 65) * 60)

  // Cálculo ANTT pela tabela e fórmula oficial vigente no sistema
  const anttCalculation = anttService.calculateFloorPrice({
    distanceKm,
    vehicleType,
    axlesCount: axles,
  })
  const anttFloorValue = anttCalculation.floorValue

  const tollsCount = Math.max(1, Math.floor(distanceKm / 55))
  const tollsValue = Math.round(tollsCount * (4.2 * axles) * 100) / 100

  // Se houver valor negociado pelo comercial/mesa, validar estritamente contra o piso ANTT
  let estimatedCost = anttFloorValue + tollsValue
  let isBelowAnttFloor = false
  let anttAlert: string | undefined = undefined

  if (typeof negotiatedFreightCost === 'number' && negotiatedFreightCost > 0) {
    if (negotiatedFreightCost < anttFloorValue) {
      isBelowAnttFloor = true
      anttAlert = `Valor negociado (R$ ${negotiatedFreightCost.toLocaleString('pt-BR')}) abaixo do mínimo ANTT aplicável (R$ ${anttFloorValue.toLocaleString('pt-BR')}). Bloqueio de conformidade regulatória.`
      // O motor eleva para o piso ou mantém o valor com alerta e recusa aprovação automática
      estimatedCost = negotiatedFreightCost
    } else {
      estimatedCost = negotiatedFreightCost
    }
  }

  const totalWeightKg = orders.reduce((sum, o) => sum + (o.weight_kg || 0), 0)
  const totalTons = totalWeightKg > 0 ? totalWeightKg / 1000 : 1

  const costPerTon = Math.round((estimatedCost / totalTons) * 100) / 100
  const costPerTonKm =
    distanceKm > 0 ? Math.round((estimatedCost / (totalTons * distanceKm)) * 1000) / 1000 : 0
  const costPerCustomer = Math.round((estimatedCost / customersCount) * 100) / 100

  return {
    distanceKm,
    additionalKm,
    durationMinutes,
    tollsValue,
    anttCalculation,
    anttFloorValue,
    estimatedCost,
    costPerTon,
    costPerTonKm,
    costPerCustomer,
    isBelowAnttFloor,
    anttAlert,
    customersCount,
    dischargesCount,
  }
}

/**
 * COMPARAÇÃO LEXICOGRÁFICA ENTRE DUAS COMBINAÇÕES CANDIDATAS
 *
 * Retorna:
 * < 0 se A é estritamente melhor que B
 * > 0 se B é estritamente melhor que A
 * 0 se são equivalentes em todos os critérios lexicográficos
 *
 * HIERARQUIA:
 * 1. Viabilidade ANTT (Combinação regular vence combinação com frete < piso ANTT).
 * 2. Prontidão Operacional: Saída imediata (Estoque + Crédito liberado) vence pendências.
 * 3. Janela de expedição: Mais pedidos atrasados e maior dias de atraso atendidos.
 * 4. P3 — MENOR NÚMERO DE CLIENTES (absolutamente prioritário: trocar 2 clientes por 6 é proibido).
 * 5. P4 — MENOR NÚMERO DE DESCARGAS (endereços e pontos de entrega).
 * 6. P5 — Ocupação dentro da faixa (preferência pela faixa configurada ou maior ocupação viável).
 * 7. P6 — Menor custo ANTT / logístico total (quando empate de clientes/descargas).
 * 8. P7 — Menor desvio / km adicional.
 * 9. P8 — Menor custo por tonelada (R$/t).
 */
export function compareCombinationsLexicographically(
  a: CandidateLoadCombination,
  b: CandidateLoadCombination,
  minOccupancyPct: number,
  maxOccupancyPct: number,
): number {
  // 1. Conformidade ANTT: Infracional nunca vence combinação conforme
  if (!a.isBelowAnttFloor && b.isBelowAnttFloor) return -1
  if (a.isBelowAnttFloor && !b.isBelowAnttFloor) return 1

  // 2. Prontidão operacional imediata (Estoque DP34 + Crédito)
  const aReadyScore = (a.isStockReady ? 2 : 0) + (a.isCreditReady ? 2 : 0)
  const bReadyScore = (b.isStockReady ? 2 : 0) + (b.isCreditReady ? 2 : 0)
  if (aReadyScore !== bReadyScore) {
    return bReadyScore - aReadyScore
  }

  // 3. Janela de expedição: prioridade máxima a pedidos atrasados
  if (a.overdueOrdersCount !== b.overdueOrdersCount) {
    return b.overdueOrdersCount - a.overdueOrdersCount
  }
  if (a.maxOverdueDays !== b.maxOverdueDays) {
    return b.maxOverdueDays - a.maxOverdueDays
  }

  // 4. P3 — MENOR QUANTIDADE DE CLIENTES (Hierarquia estrita)
  // Se A tem 2 clientes e B tem 4 clientes (ou 5 ou 6), A VENCE IMEDIATAMENTE
  if (a.customersCount !== b.customersCount) {
    return a.customersCount - b.customersCount
  }

  // 5. P4 — MENOR QUANTIDADE DE DESCARGAS
  if (a.dischargesCount !== b.dischargesCount) {
    return a.dischargesCount - b.dischargesCount
  }

  // 6. P5 — OCUPAÇÃO DENTRO DA FAIXA CONFIGURADA (ou mais próxima da meta)
  const aInBand = a.occupancyPct >= minOccupancyPct && a.occupancyPct <= 100
  const bInBand = b.occupancyPct >= minOccupancyPct && b.occupancyPct <= 100

  if (aInBand && !bInBand) return -1
  if (!aInBand && bInBand) return 1

  // Se ambas estão na faixa, a que tem maior ocupação até a meta máxima tem vantagem suave
  const diffOcc = b.occupancyPct - a.occupancyPct
  if (Math.abs(diffOcc) >= 2.0) {
    return diffOcc // Maior ocupação vence empate de clientes e descargas
  }

  // 7. P6 — MENOR CUSTO LOGÍSTICO / FRETE ESTIMADO
  if (Math.abs(a.estimatedCost - b.estimatedCost) >= 50) {
    return a.estimatedCost - b.estimatedCost
  }

  // 8. P7 — MENOR DESVIO / KM ADICIONAL
  if (Math.abs(a.additionalKm - b.additionalKm) >= 5) {
    return a.additionalKm - b.additionalKm
  }

  // 9. P8 — MELHOR CUSTO POR TONELADA (R$/t)
  if (Math.abs(a.costPerTon - b.costPerTon) >= 1) {
    return a.costPerTon - b.costPerTon
  }

  // Critério de desempate determinístico estável: peso total descendente
  return b.totalWeightKg - a.totalWeightKg
}

/**
 * GERAÇÃO DE COMBINAÇÕES CANDIDATAS INTELIGENTE (Segmentação prévia sem força bruta irrestrita)
 * 1. Segmenta por cliente.
 * 2. Testa combinações de 1 cliente (carga direta dedicada).
 * 3. Testa combinações de 2 clientes.
 * 4. Testa combinações de 3 clientes.
 * 5. Se necessário, expande para 4+ clientes até atingir a capacidade.
 * Desta forma, o motor lexicográfico naturalmente prioriza 1 ou 2 clientes antes de avaliar 5 ou 6.
 */
export function generateCandidateCombinations(
  evaluatedOrders: EvaluatedOrder[],
  vehicleCapacityKg: number,
  vehicleType: string,
  minOccupancyPct: number,
  maxOccupancyPct: number,
  occupancyBands: OccupancyBandConfig,
  negotiatedFreightCost?: number,
): CandidateLoadCombination[] {
  const eligibleOrders = evaluatedOrders.filter(
    (e) => !e.isIncompatibleVehicle && e.isDesiredDateValid,
  )

  if (eligibleOrders.length === 0) {
    return []
  }

  // Agrupar pedidos por cliente para evitar combinações fragmentadas
  const ordersByCustomer = new Map<string, EvaluatedOrder[]>()
  eligibleOrders.forEach((item) => {
    const list = ordersByCustomer.get(item.customerCode) || []
    list.push(item)
    ordersByCustomer.set(item.customerCode, list)
  })

  const customerCodes = Array.from(ordersByCustomer.keys())
  const rawCombinations: SapSalesOrderEntity[][] = []

  // ESTRATÉGIA 1: Cargas diretas de 1 único cliente (todas as variações de pedidos do mesmo cliente que cabem)
  customerCodes.forEach((custCode) => {
    const custOrders = ordersByCustomer.get(custCode)!
    const custTotalWeight = custOrders.reduce((sum, o) => sum + o.weightKg, 0)

    if (custTotalWeight <= vehicleCapacityKg) {
      rawCombinations.push(custOrders.map((o) => o.order))
    } else {
      // Se o cliente tem mais pedidos que a capacidade, pegar subconjuntos gulosos
      const sortedCust = [...custOrders].sort((a, b) => b.weightKg - a.weightKg)
      let curBatch: SapSalesOrderEntity[] = []
      let curWeight = 0
      sortedCust.forEach((it) => {
        if (curWeight + it.weightKg <= vehicleCapacityKg) {
          curBatch.push(it.order)
          curWeight += it.weightKg
        }
      })
      if (curBatch.length > 0) {
        rawCombinations.push(curBatch)
      }
    }
  })

  // ESTRATÉGIA 2: Combinações de 2 clientes (par de clientes)
  for (let i = 0; i < customerCodes.length; i++) {
    for (let j = i + 1; j < customerCodes.length; j++) {
      const custA = ordersByCustomer.get(customerCodes[i])!
      const custB = ordersByCustomer.get(customerCodes[j])!
      const combined = [...custA, ...custB].sort((a, b) => {
        if (b.isOverdue && !a.isOverdue) return 1
        if (!b.isOverdue && a.isOverdue) return -1
        return b.weightKg - a.weightKg
      })

      let batch: SapSalesOrderEntity[] = []
      let weight = 0
      let hasA = false
      let hasB = false

      combined.forEach((item) => {
        if (weight + item.weightKg <= vehicleCapacityKg) {
          batch.push(item.order)
          weight += item.weightKg
          if (item.customerCode === customerCodes[i]) hasA = true
          if (item.customerCode === customerCodes[j]) hasB = true
        }
      })

      // Adiciona apenas se realmente reuniu pedidos de ambos os clientes e tem peso expressivo
      if (hasA && hasB && weight >= vehicleCapacityKg * 0.5) {
        rawCombinations.push(batch)
      }
    }
  }

  // ESTRATÉGIA 3: Combinações de 3 clientes
  if (customerCodes.length >= 3) {
    const topCustomers = [...customerCodes].slice(0, 8) // Limite inteligente para evitar explosão combinatória
    for (let i = 0; i < topCustomers.length; i++) {
      for (let j = i + 1; j < topCustomers.length; j++) {
        for (let k = j + 1; k < topCustomers.length; k++) {
          const list = [
            ...(ordersByCustomer.get(topCustomers[i]) || []),
            ...(ordersByCustomer.get(topCustomers[j]) || []),
            ...(ordersByCustomer.get(topCustomers[k]) || []),
          ].sort((a, b) => b.weightKg - a.weightKg)

          let batch: SapSalesOrderEntity[] = []
          let weight = 0
          list.forEach((item) => {
            if (weight + item.weightKg <= vehicleCapacityKg) {
              batch.push(item.order)
              weight += item.weightKg
            }
          })

          const distinctCusts = new Set(batch.map((b) => b.customer_code)).size
          if (distinctCusts === 3 && weight >= vehicleCapacityKg * 0.6) {
            rawCombinations.push(batch)
          }
        }
      }
    }
  }

  // ESTRATÉGIA 4: Bin-Packing First-Fit Decreasing ordenado por atraso e peso para garantir cobertura total
  const sortedEligible = [...eligibleOrders].sort((a, b) => {
    if (b.isOverdue && !a.isOverdue) return 1
    if (!b.isOverdue && a.isOverdue) return -1
    return b.weightKg - a.weightKg
  })

  let greedyBatch: SapSalesOrderEntity[] = []
  let greedyWeight = 0
  sortedEligible.forEach((item) => {
    if (greedyWeight + item.weightKg <= vehicleCapacityKg) {
      greedyBatch.push(item.order)
      greedyWeight += item.weightKg
    }
  })
  if (greedyBatch.length > 0) {
    rawCombinations.push(greedyBatch)
  }

  // Deduplicação de combinações por conjunto ordenado de IDs de pedidos
  const seenCombKeys = new Set<string>()
  const uniqueCombinations: SapSalesOrderEntity[][] = []

  rawCombinations.forEach((comb) => {
    if (comb.length === 0) return
    const key = comb
      .map((o) => o.id)
      .sort()
      .join('|')
    if (!seenCombKeys.has(key)) {
      seenCombKeys.add(key)
      uniqueCombinations.push(comb)
    }
  })

  // Converter para objetos CandidateLoadCombination detalhados
  const evaluatedMap = new Map<string, EvaluatedOrder>()
  evaluatedOrders.forEach((e) => evaluatedMap.set(e.order.id, e))

  const candidateCombinations: CandidateLoadCombination[] = uniqueCombinations.map((combOrders) => {
    const totalWeightKg = combOrders.reduce((sum, o) => sum + (o.weight_kg || 0), 0)
    const occupancyPct = Math.min(
      100,
      Math.round((totalWeightKg / Math.max(1, vehicleCapacityKg)) * 1000) / 10,
    )

    const combEvaluated = combOrders.map((o) => evaluatedMap.get(o.id)!).filter(Boolean)

    const overdueOrders = combEvaluated.filter((e) => e.isOverdue)
    const overdueOrdersCount = overdueOrders.length
    const maxOverdueDays = overdueOrders.reduce((max, e) => Math.max(max, e.overdueDays), 0)
    const totalOverdueDays = overdueOrders.reduce((sum, e) => sum + e.overdueDays, 0)

    const logistics = calculateCandidateLogistics(
      combOrders,
      vehicleType,
      vehicleCapacityKg,
      negotiatedFreightCost,
    )

    const isStockReady = combEvaluated.every((e) => e.isStockAvailable)
    const isCreditBlocked = combEvaluated.some((e) => e.isCreditBlocked)
    const isCreditInAnalysis = combEvaluated.some((e) => e.isCreditInAnalysis)

    let creditClassification: CreditClassification = 'LIBERADO'
    if (isCreditBlocked) creditClassification = 'BLOQUEADO'
    else if (isCreditInAnalysis) creditClassification = 'LIBERADO_COM_APROVACAO'

    const isCreditReady = creditClassification === 'LIBERADO'

    const targetWeightKg = Math.round(vehicleCapacityKg * (maxOccupancyPct / 100) * 10) / 10
    const missingWeightKg = Math.max(0, Math.round((targetWeightKg - totalWeightKg) * 10) / 10)

    let classificationStatus: CandidateLoadCombination['classificationStatus'] =
      'Carga dentro da faixa'
    if (totalWeightKg > vehicleCapacityKg) {
      classificationStatus = 'Capacidade excedida — Reotimizar'
    } else if (occupancyPct < minOccupancyPct) {
      classificationStatus = 'Aguardando consolidação'
    } else if (occupancyPct < maxOccupancyPct) {
      classificationStatus = 'Carga parcial — Complemento Comercial'
    } else {
      classificationStatus = 'Carga dentro da faixa'
    }

    let readinessStatus: OperationalReadinessStatus = 'PRONTA_SAIDA_IMEDIATA'
    let readinessLabel: CandidateLoadCombination['readinessLabel'] = 'SAÍDA IMEDIATA'
    const reasons: string[] = []

    if (logistics.isBelowAnttFloor) {
      readinessStatus = 'BLOQUEADA'
      readinessLabel = 'BLOQUEADA / EXCEÇÃO'
      reasons.push(logistics.anttAlert || 'Valor abaixo do mínimo ANTT aplicável.')
    }

    if (totalWeightKg > vehicleCapacityKg) {
      readinessStatus = 'BLOQUEADA'
      readinessLabel = 'BLOQUEADA / EXCEÇÃO'
      reasons.push(
        `Capacidade excedida: ${(totalWeightKg / 1000).toFixed(1)}t excede a capacidade do veículo (${(vehicleCapacityKg / 1000).toFixed(1)}t).`,
      )
    }

    if (!isCreditReady) {
      if (creditClassification === 'BLOQUEADO') {
        readinessStatus = 'BLOQUEADA'
        readinessLabel = 'BLOQUEADA / EXCEÇÃO'
        reasons.push('Contém pedidos com crédito bloqueado no financeiro SAP.')
      } else {
        readinessStatus = 'PROGRAMACAO_IMPACTADA_REANALISE_NECESSARIA'
        reasons.push('Crédito com aprovação de alçada necessária.')
      }
    }

    if (!isStockReady) {
      if (readinessStatus !== 'BLOQUEADA') {
        readinessStatus = 'PLANEJAMENTO_FUTURO'
        readinessLabel = 'PROGRAMAÇÃO FUTURA'
      }
      reasons.push('Saldo DP34 incompleto; aguarda liberação de pátio ou produção PCP.')
    }

    if (
      isStockReady &&
      isCreditReady &&
      !logistics.isBelowAnttFloor &&
      totalWeightKg <= vehicleCapacityKg
    ) {
      if (occupancyPct < minOccupancyPct) {
        readinessLabel = 'AGUARDANDO COMPLEMENTO'
        reasons.push(`Ocupação (${occupancyPct}%) abaixo da meta mínima (${minOccupancyPct}%).`)
      } else if (occupancyPct < maxOccupancyPct) {
        readinessLabel = 'AGUARDANDO COMPLEMENTO'
        reasons.push(
          `Carga parcial (${occupancyPct}%). Complemento necessário de ${(missingWeightKg / 1000).toFixed(1)}t para atingir ${maxOccupancyPct}%.`,
        )
      } else {
        readinessStatus = 'PRONTA_SAIDA_IMEDIATA'
        readinessLabel = 'SAÍDA IMEDIATA'
        reasons.push(
          `Carga dentro da faixa (${occupancyPct}%). Pronta para saída imediata com ${logistics.customersCount} cliente(s) e ${logistics.dischargesCount} descarga(s).`,
        )
      }
    }

    // Explicabilidade detalhada
    const selectedIds = new Set(combOrders.map((o) => o.id))
    const unselectedOrdersRationale = evaluatedOrders
      .filter((e) => !selectedIds.has(e.order.id))
      .slice(0, 10)
      .map((e) => {
        let reason = 'Não selecionado para evitar excesso de peso ou mais clientes.'
        if (!e.isDesiredDateValid) {
          reason = `Data desejada futura (${e.order.desired_date?.split('T')[0] || 'N/I'}) — anti-antecipação.`
        } else if (e.isCreditBlocked) {
          reason = 'Crédito financeiro bloqueado no SAP.'
        } else if (!e.isStockAvailable) {
          reason = 'Sem saldo físico imediato no Depósito DP34.'
        } else if (e.isIncompatibleVehicle) {
          reason = `Incompatível com o veículo ${vehicleType}.`
        } else if (totalWeightKg + e.weightKg > vehicleCapacityKg) {
          reason = `Peso (${(e.weightKg / 1000).toFixed(1)}t) ultrapassaria a capacidade máxima do veículo.`
        } else {
          reason = `Eliminado pela hierarquia lexicográfica para manter menor número de clientes (${logistics.customersCount}).`
        }
        return {
          orderNumber: e.order.order_number,
          customerName: e.customerName,
          weightKg: e.weightKg,
          reason,
        }
      })

    const whyProposed = `Esta proposta foi selecionada pelo motor lexicográfico porque atende ${(totalWeightKg / 1000).toFixed(1)} t utilizando apenas ${logistics.customersCount} cliente(s) do mesmo itinerário (${logistics.dischargesCount} descargas previstas), atinge ocupação de ${occupancyPct}% e apresenta menor custo logístico e regulatório ANTT (R$ ${logistics.estimatedCost.toLocaleString('pt-BR')} — R$ ${logistics.costPerTon}/t) dentre as combinações equivalentes.`

    const scoreOccupancy = Math.min(40, (occupancyPct / 100) * 40)
    const calcOverdueScore = Math.min(25, overdueOrdersCount * 5 + maxOverdueDays * 2)
    const scoreEfficiency = Math.max(0, 20 - Math.max(0, logistics.customersCount - 1) * 5)
    const scoreStock = isStockReady ? 10 : 0
    const scoreCredit = isCreditReady ? 10 : 0
    const totalScore = Math.min(
      100,
      Math.round(scoreOccupancy + calcOverdueScore + scoreEfficiency + scoreStock + scoreCredit),
    )

    const scoreBreakdown: OptimizationScoreBreakdown = {
      totalScore,
      occupancyScore: scoreOccupancy,
      overdueScore: calcOverdueScore,
      portaDriverScore: 0,
      routeEfficiencyScore: scoreEfficiency,
      tollImpactScore: 10,
      economicResultScore: 10,
      stockConfidenceScore: scoreStock,
      creditConfidenceScore: scoreCredit,
      explanation: `Hierarquia Lexicográfica: ${logistics.customersCount} cliente(s) • ${logistics.dischargesCount} descargas • ${occupancyPct}% ocupação • Custo R$ ${logistics.costPerTon}/t • Piso ANTT R$ ${logistics.anttFloorValue.toLocaleString('pt-BR')}.`,
    }

    return {
      orders: combOrders,
      evaluatedOrders: combEvaluated,
      totalWeightKg,
      occupancyPct,
      customersCount: logistics.customersCount,
      dischargesCount: logistics.dischargesCount,
      overdueOrdersCount,
      maxOverdueDays,
      totalOverdueDays,
      distanceKm: logistics.distanceKm,
      additionalKm: logistics.additionalKm,
      durationMinutes: logistics.durationMinutes,
      tollsValue: logistics.tollsValue,
      anttCalculation: logistics.anttCalculation,
      anttFloorValue: logistics.anttFloorValue,
      estimatedCost: logistics.estimatedCost,
      costPerTon: logistics.costPerTon,
      costPerTonKm: logistics.costPerTonKm,
      costPerCustomer: logistics.costPerCustomer,
      isBelowAnttFloor: logistics.isBelowAnttFloor,
      anttAlert: logistics.anttAlert,
      isStockReady,
      isCreditReady,
      creditClassification,
      readinessStatus,
      readinessLabel,
      classificationStatus,
      targetWeightKg,
      missingWeightKg,
      whyProposed,
      reasons,
      unselectedOrdersRationale,
      scoreBreakdown,
    }
  })

  return candidateCombinations
}

/**
 * MOTOR DE OTIMIZAÇÃO LEXICOGRÁFICO PRINCIPAL
 * Executa para um itinerário ou grupo de pedidos e retorna até 3 melhores alternativas rankeadas.
 */
export function runLexicographicOptimizerForItinerary(
  input: LexicographicOptimizationInput,
): LexicographicOptimizationResult {
  const {
    itineraryCode,
    itineraryDescription = itineraryCode,
    uf = 'SP',
    region = '',
    plannedDate,
    orders,
    stocks,
    pcpOrders,
    queueEntries,
    vehicleCapacityKg,
    vehicleType,
    minOccupancyPct = 70,
    maxOccupancyPct = 95,
    occupancyBands = DEFAULT_OCCUPANCY_BANDS,
    negotiatedFreightCost,
  } = input

  // 1. Pré-avaliação determinística de cada pedido
  const evaluatedOrders = orders.map((o) =>
    preEvaluateOrder(o, plannedDate, stocks, pcpOrders, vehicleType),
  )

  const eligibleCount = evaluatedOrders.filter(
    (e) => !e.isIncompatibleVehicle && e.isDesiredDateValid,
  ).length
  const ineligibleCount = evaluatedOrders.length - eligibleCount

  // 2. Geração das combinações candidatas orientadas por clientes e capacidade
  const candidates = generateCandidateCombinations(
    evaluatedOrders,
    vehicleCapacityKg,
    vehicleType,
    minOccupancyPct,
    maxOccupancyPct,
    occupancyBands,
    negotiatedFreightCost,
  )

  const combinationsEvaluated = candidates.length
  const unviableCombinationsCount = candidates.filter(
    (c) => c.isBelowAnttFloor || c.totalWeightKg > vehicleCapacityKg || !c.isCreditReady,
  ).length

  // 3. Ordenação estrita pela hierarquia lexicográfica
  candidates.sort((a, b) =>
    compareCombinationsLexicographically(a, b, minOccupancyPct, maxOccupancyPct),
  )

  // Motoristas PORTA compatíveis com o itinerário
  const portaDrivers = queueEntries.filter(
    (q) =>
      q.type === 'PORTA' &&
      q.status === 'disponivel' &&
      (!q.preferred_itinerary || q.preferred_itinerary === itineraryCode),
  )

  // Veículos futuros programados
  const scheduledFuture = queueEntries.find(
    (q) =>
      q.type === 'PROGRAMADO' &&
      (!q.preferred_itinerary || q.preferred_itinerary === itineraryCode),
  )

  // 4. Selecionar até 3 melhores propostas (Top 3 Alternativas)
  const topCandidates = candidates.slice(0, 3)

  const topProposals: ProposedCargoEntity[] = topCandidates.map((cand, index) => {
    const cargoNumber = `PROPOSTA TMS ${itineraryCode}-${String(index + 1).padStart(3, '0')}`

    const eligiblePortaDrivers = portaDrivers.filter((p) => {
      if (!p.vehicle_capacity_kg_cached) return true
      return p.vehicle_capacity_kg_cached >= cand.totalWeightKg * 0.95
    })
    const hasPortaDriver = eligiblePortaDrivers.length > 0

    // Se é a 1ª alternativa, a 2ª ou a 3ª, explicitar o diferencial
    let why = cand.whyProposed
    if (index === 0) {
      why = `[Alternativa 1 — Recomendada]: ${cand.whyProposed}`
    } else if (index === 1) {
      why = `[Alternativa 2 — Secundária]: Opção com ${(cand.totalWeightKg / 1000).toFixed(1)} t (${cand.occupancyPct}%), atendendo ${cand.customersCount} cliente(s) e ${cand.dischargesCount} descargas por R$ ${cand.costPerTon}/t.`
    } else {
      why = `[Alternativa 3 — Contingência]: Alternativa com ${(cand.totalWeightKg / 1000).toFixed(1)} t (${cand.occupancyPct}%), ${cand.customersCount} cliente(s) e frete previsto de R$ ${cand.estimatedCost.toLocaleString('pt-BR')}.`
    }

    const bandResult = classifyOccupancyBand(cand.occupancyPct, occupancyBands)

    return {
      id: cargoNumber,
      cargoNumber,
      itineraryCode,
      itineraryDescription,
      uf,
      region,
      isSuggestedItinerary: false,
      plannedExpeditionDate: plannedDate,
      vehicleType,
      vehicleCapacityKg,
      totalWeightKg: cand.totalWeightKg,
      occupancyPct: cand.occupancyPct,
      occupancyBand: bandResult.band,
      occupancyAlert: cand.anttAlert || bandResult.alert,
      readinessStatus: cand.readinessStatus,
      readinessLabel: cand.readinessLabel,
      classificationStatus: cand.classificationStatus,
      minOccupancyPct,
      maxOccupancyPct,
      targetWeightKg: cand.targetWeightKg,
      missingWeightKg: cand.missingWeightKg,
      isFutureMatch: Boolean(scheduledFuture),
      scheduledVehicleDate:
        scheduledFuture?.calculated_logistics_date ||
        scheduledFuture?.scheduled_arrival_date ||
        scheduledFuture?.entry_time?.split('T')[0],
      scheduledVehiclePlate: scheduledFuture?.vehicle_plate_cached,
      orders: cand.orders,
      customersCount: cand.customersCount,
      ordersCount: cand.orders.length,
      dischargesCount: cand.dischargesCount,
      hasPortaDriver,
      eligiblePortaDriversCount: eligiblePortaDrivers.length,
      eligiblePortaDriverNames: eligiblePortaDrivers.map(
        (d) => d.driver_name_cached || 'Motorista PORTA',
      ),
      distanceKm: cand.distanceKm,
      durationMinutes: cand.durationMinutes,
      tollsValue: cand.tollsValue,
      anttFloorValue: cand.anttFloorValue,
      estimatedCost: cand.estimatedCost,
      costPerTon: cand.costPerTon,
      costPerTonKm: cand.costPerTonKm,
      costPerCustomer: cand.costPerCustomer,
      scoreBreakdown: cand.scoreBreakdown,
      priorityRanking: index + 1,
      whyProposed: why,
      reasons: cand.reasons,
      suggestedAction:
        cand.readinessLabel === 'SAÍDA IMEDIATA'
          ? 'Aprovar carga e encaminhar para Leilão/Mesa de Fretes.'
          : cand.readinessLabel === 'AGUARDANDO COMPLEMENTO'
            ? `Buscar complemento comercial de ${(cand.missingWeightKg / 1000).toFixed(1)}t no itinerário ${itineraryCode}.`
            : cand.readinessLabel === 'PROGRAMAÇÃO FUTURA'
              ? 'Acompanhar liberação de estoque DP34 / PCP robotizado.'
              : 'Revisar bloqueios regulatórios ANTT ou crédito.',
    }
  })

  return {
    itineraryCode,
    topProposals,
    bestProposal: topProposals[0] || null,
    combinationsEvaluated,
    unviableCombinationsCount,
    totalOrdersEvaluated: orders.length,
    eligibleOrdersCount: eligibleCount,
    ineligibleOrdersCount: ineligibleCount,
  }
}
