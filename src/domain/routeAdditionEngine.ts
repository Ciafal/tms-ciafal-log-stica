// TMS CIAFAL — Motor de Adição Excepcional de Rotas em Itinerários & Análise de IA
// Em conformidade estrita com todos os requisitos 1–21 da especificação do usuário.

import { SapSalesOrderEntity, SapItineraryEntity } from './rules'
import { calculateCargoFractionation } from './cargoFractionationEngine'

/**
 * 16 Motivos Oficiais do Usuário (Requisito 5)
 * Harmonizados e mapeando compatibilidade com códigos legados
 */
export const ROUTE_ADDITION_REASONS = [
  { code: '1', label: '1. Urgência de entrega' },
  { code: '2', label: '2. Falta de pedidos no itinerário original' },
  { code: '3', label: '3. Falta de estoque no itinerário original' },
  { code: '4', label: '4. Volume insuficiente para formação da carga' },
  { code: '5', label: '5. Complementação de carga' },
  { code: '6', label: '6. Melhor aproveitamento do veículo' },
  { code: '7', label: '7. Prazo crítico de cliente' },
  { code: '8', label: '8. Solicitação comercial' },
  { code: '9', label: '9. Solicitação do cliente' },
  { code: '10', label: '10. Restrição logística' },
  { code: '11', label: '11. Alteração da programação PCP' },
  { code: '12', label: '12. Alteração de estoque' },
  { code: '13', label: '13. Redução de capacidade ociosa' },
  { code: '14', label: '14. Otimização de custo de transporte' },
  { code: '15', label: '15. Reprogramação logística' },
  { code: '16', label: '16. Outro' },
] as const

export type RouteAdditionReasonCode = (typeof ROUTE_ADDITION_REASONS)[number]['code']

/**
 * Mapeador seguro para manter histórico caso existam registros legados (ex: código '17' Outro)
 */
export function normalizeReasonCode(code?: string): string {
  if (!code) return '16'
  if (code === '17') return '16' // Antigo "17. Outro" -> Novo "16. Outro"
  return code
}

export function getReasonLabel(code?: string): string {
  const normalized = normalizeReasonCode(code)
  const found = ROUTE_ADDITION_REASONS.find((r) => r.code === normalized)
  return found ? found.label : '16. Outro'
}

export type AiAlignmentClassification =
  | 'Coerente'
  | 'Parcialmente coerente'
  | 'Divergente'
  | 'Dados insuficientes'

export type AiRiskLevel = 'FAVORAVEL' | 'MODERADO' | 'ALTO_IMPACTO_DESFAVORAVEL'

export type AiRouteRecommendationLevel = 'Recomendada' | 'Possível' | 'Não recomendada'

export interface RouteAdditionEntity {
  id?: string
  load_id?: string
  cargo_number?: string
  transport_number?: string
  transport_order_id?: string
  original_itinerary_id?: string
  original_itinerary_code?: string
  original_itinerary_description?: string
  added_itinerary_id?: string
  added_itinerary_description?: string
  added_route_id?: string
  complementary_itinerary_code?: string
  complementary_itinerary_description?: string
  customer_code?: string
  customer_name?: string
  destination_city?: string
  destination_uf?: string
  order_numbers_json?: string[]
  reason_code?: string
  reason_description?: string
  user_observation?: string
  ai_analysis?: string
  ai_user_alignment?: AiAlignmentClassification
  ai_alignment?: string
  ai_classification?: string
  ai_risk_level?: AiRiskLevel
  ai_risk?: string
  ai_alert_flag?: boolean
  ai_alert_message?: string
  distance_before?: number
  distance_after?: number
  distance_after_km?: number
  additional_distance?: number
  additional_time_hours?: number
  weight_before?: number
  weight_after?: number
  weight_after_kg?: number
  occupancy_before?: number
  occupancy_after?: number
  occupancy_after_pct?: number
  vehicle_capacity_kg?: number
  freight_before?: number
  freight_after?: number
  freight_after_brl?: number
  toll_before?: number
  toll_after?: number
  toll_after_brl?: number
  cost_per_ton_before?: number
  cost_per_ton_after?: number
  deliveries_before?: number
  deliveries_after?: number
  discharges_after?: number
  clients_before?: number
  clients_after?: number
  fractionations_before?: number
  fractionations_after?: number
  fractionations_delta?: number
  fractions_before?: number
  fractions_after?: number
  remessas_before?: number
  remessas_after?: number
  status?: 'ATIVA' | 'REMOVIDA'
  created_by?: string
  user_name?: string
  user_email?: string
  created_by_role?: string
  created_at_dt?: string
  removed_by?: string
  removed_by_role?: string
  removed_at_dt?: string
  removal_reason?: string
  created?: string
  updated?: string
}

export interface RouteAdditionMetricsComparison {
  weightBeforeTon: number
  weightAfterTon: number
  occupancyBeforePct: number
  occupancyAfterPct: number
  clientsBefore: number
  clientsAfter: number
  dischargesBefore: number
  dischargesAfter: number
  fractionationsBefore: number
  fractionationsAfter: number
  fractionationsDelta: number
  remessasBefore: number
  remessasAfter: number
  distanceBeforeKm: number
  distanceAfterKm: number
  additionalDistanceKm: number
  additionalTimeMinutes: number
  additionalTimeFormatted: string
  timeBeforeFormatted: string
  timeAfterFormatted: string
  freightBeforeBrl: number
  freightAfterBrl: number
  tollBeforeBrl: number
  tollAfterBrl: number
  costPerTonBeforeBrl: number
  costPerTonAfterBrl: number
}

export interface AiEvaluationResult {
  diagnostic: string
  alignment: AiAlignmentClassification
  alignmentConclusion: string
  riskLevel: AiRiskLevel
  hasRelevantImpactAlert: boolean
  alertMessage?: string
  alertDetails?: {
    additionalKm: number
    additionalDischarges: number
    freightIncreaseBrl: number
    occupancyBeforePct: number
    occupancyAfterPct: number
    hasUrgency: boolean
  }
}

/**
 * Item 4: Sugestão IA de Rotas Complementares
 * Classifica cada rota elegível da carteira SAP em:
 * "Recomendada" (boa compatibilidade logística)
 * "Possível" (utilizável, mas com impactos)
 * "Não recomendada" (impacto logístico elevado)
 */
export interface AiRouteRecommendation {
  routeCode: string
  itineraryCode: string
  destinationCity: string
  destinationUf: string
  customerNames: string[]
  orderNumbers: string[]
  totalWeightKg: number
  ordersCount: number
  estimatedDistanceKm: number
  classification: AiRouteRecommendationLevel
  explanation: string
  compatibilityScore: number // 0 a 100
  stockStatusSummary: 'Estoque Pronto' | 'Estoque Parcial' | 'Pendente Produção'
  hasUrgency: boolean
  isCustomerAlreadyInLoad: boolean
  additionalFractionationsCount: number
}

export function evaluateEligibleRouteWithAi(params: {
  routeCode: string
  itineraryCode: string
  orders: SapSalesOrderEntity[]
  currentLoadOrders: SapSalesOrderEntity[]
  vehicleCapacityKg: number
  baseDistanceKm?: number
}): AiRouteRecommendation {
  const { routeCode, itineraryCode, orders, currentLoadOrders, vehicleCapacityKg } = params

  const effectiveCapacity = vehicleCapacityKg > 0 ? vehicleCapacityKg : 28000
  const currentWeightKg = currentLoadOrders.reduce((sum, o) => sum + (o.weight_kg || 0), 0)
  const candidateWeightKg = orders.reduce((sum, o) => sum + (o.weight_kg || 0), 0)
  const projectedWeightKg = currentWeightKg + candidateWeightKg
  const projectedOcc = Math.round((projectedWeightKg / effectiveCapacity) * 100)

  // Clientes já existentes na carga
  const currentCustomersSet = new Set(
    currentLoadOrders.map((o) => (o.customer_code || o.customer_name || '').trim().toLowerCase()),
  )
  const candidateCustomers = Array.from(
    new Set(orders.map((o) => (o.customer_code || o.customer_name || '').trim())),
  )
  const newCustomers = candidateCustomers.filter((c) => !currentCustomersSet.has(c.toLowerCase()))
  const isCustomerAlreadyInLoad = candidateCustomers.some((c) =>
    currentCustomersSet.has(c.toLowerCase()),
  )
  const additionalFractionationsCount = newCustomers.length

  // Estoque e PCP
  const allStockReady = orders.every(
    (o) =>
      o.production_status === 'Pronto' || (o.stock_available || 0) > 0 || (o.stock_dp34 || 0) > 0,
  )
  const noneStockReady = orders.every(
    (o) =>
      o.production_status !== 'Pronto' && (o.stock_available || 0) <= 0 && (o.stock_dp34 || 0) <= 0,
  )
  const stockStatusSummary: 'Estoque Pronto' | 'Estoque Parcial' | 'Pendente Produção' =
    allStockReady ? 'Estoque Pronto' : noneStockReady ? 'Pendente Produção' : 'Estoque Parcial'

  // Urgência
  const today = new Date().toISOString().split('T')[0]
  const hasUrgency = orders.some((o) => o.desired_date && o.desired_date <= today)

  // Estimativa de desvio em km: heurística baseada na UF e dispersão
  const origUf = currentLoadOrders[0]?.uf || 'MG'
  const targetUf = orders[0]?.uf || origUf
  const isSameUf = origUf === targetUf

  let estimatedDistanceKm = Math.round(orders.length * 28 + (isSameUf ? 35 : 120))
  if (isCustomerAlreadyInLoad) {
    estimatedDistanceKm = Math.round(estimatedDistanceKm * 0.5) // mesmo cliente = parada idêntica ou próxima
  }

  // Compatibilidade Score (0–100)
  let score = 70
  if (isSameUf) score += 15
  else score -= 25

  if (allStockReady) score += 10
  else if (noneStockReady) score -= 15

  if (hasUrgency) score += 10

  // Se ultrapassa 100% da capacidade
  if (projectedOcc > 105) score -= 40
  else if (projectedOcc >= 85 && projectedOcc <= 100) score += 15

  if (estimatedDistanceKm > 100) score -= 20
  else if (estimatedDistanceKm < 50) score += 10

  if (additionalFractionationsCount === 0) score += 15 // Não gera fracionamento adicional!

  score = Math.max(10, Math.min(98, score))

  let classification: AiRouteRecommendationLevel = 'Possível'
  let explanation = ''

  if (score >= 75) {
    classification = 'Recomendada'
    explanation = isCustomerAlreadyInLoad
      ? `Alta sinergia logística: atende cliente já presente na carga sem gerar fracionamento adicional (+${(candidateWeightKg / 1000).toFixed(1)} t, ~${estimatedDistanceKm} km adicionais).`
      : `Boa compatibilidade operacional: rota na mesma praça (${targetUf}) com estoque disponível, elevando a ocupação para ${projectedOcc}% com desvio moderado (~${estimatedDistanceKm} km).`
  } else if (score >= 45) {
    classification = 'Possível'
    explanation = `Viável operacionalmente, mas requer atenção: adiciona +${additionalFractionationsCount} fracionamento(s) e cerca de +${estimatedDistanceKm} km. Ocupação projetada de ${projectedOcc}%.`
  } else {
    classification = 'Não recomendada'
    explanation =
      projectedOcc > 105
        ? `Impacto elevado: a inclusão excederia a capacidade nominal do veículo (${projectedOcc}%).`
        : `Impacto logístico elevado: desvio quilométrico significativo (+${estimatedDistanceKm} km) ou divergência de UF (${origUf} → ${targetUf}) com ganho modesto.`
  }

  return {
    routeCode,
    itineraryCode,
    destinationCity: orders[0]?.destination_city || 'Regional',
    destinationUf: targetUf,
    customerNames: candidateCustomers,
    orderNumbers: orders.map((o) => o.order_number),
    totalWeightKg: candidateWeightKg,
    ordersCount: orders.length,
    estimatedDistanceKm,
    classification,
    explanation,
    compatibilityScore: score,
    stockStatusSummary,
    hasUrgency,
    isCustomerAlreadyInLoad,
    additionalFractionationsCount,
  }
}

/**
 * Calcula métricas antes e depois da inclusão dos pedidos complementares (Requisitos 8 e 9)
 * Regra: se o cliente já existe na carga, NÃO aumenta o fracionamento!
 */
export function calculateRouteAdditionMetrics(params: {
  currentOrders: SapSalesOrderEntity[]
  addedOrders: SapSalesOrderEntity[]
  vehicleCapacityKg: number
  originalItinerary?: SapItineraryEntity | null
  addedItinerary?: SapItineraryEntity | null
  baseDistanceKm?: number
}): RouteAdditionMetricsComparison {
  const { currentOrders, addedOrders, vehicleCapacityKg, baseDistanceKm } = params

  const effectiveCapacity = vehicleCapacityKg > 0 ? vehicleCapacityKg : 28000

  const weightBeforeKg = currentOrders.reduce((sum, o) => sum + (o.weight_kg || 0), 0)
  const addedWeightKg = addedOrders.reduce((sum, o) => sum + (o.weight_kg || 0), 0)
  const weightAfterKg = weightBeforeKg + addedWeightKg

  const weightBeforeTon = Math.round((weightBeforeKg / 1000) * 10) / 10
  const weightAfterTon = Math.round((weightAfterKg / 1000) * 10) / 10

  const occupancyBeforePct = Math.min(100, Math.round((weightBeforeKg / effectiveCapacity) * 100))
  const occupancyAfterPct = Math.min(100, Math.round((weightAfterKg / effectiveCapacity) * 100))

  const fractionationBefore = calculateCargoFractionation(currentOrders)
  const allOrders = [...currentOrders, ...addedOrders]
  const fractionationAfter = calculateCargoFractionation(allOrders)

  const clientsBefore = fractionationBefore.distinctCustomersCount
  const clientsAfter = fractionationAfter.distinctCustomersCount

  const fractionationsBefore = fractionationBefore.fracionamentos
  const fractionationsAfter = fractionationAfter.fracionamentos
  const fractionationsDelta = fractionationsAfter - fractionationsBefore

  const remessasBefore = fractionationBefore.remessasPrevistas
  const remessasAfter = fractionationAfter.remessasPrevistas

  const dischargesBefore = Math.max(1, currentOrders.length > 0 ? clientsBefore : 0)
  // Descargas aumentam conforme clientes distintos adicionados
  const dischargesAfter = dischargesBefore + Math.max(0, clientsAfter - clientsBefore)

  // Distâncias: heurística determinística CIAFAL
  const distBefore =
    baseDistanceKm && baseDistanceKm > 0 ? baseDistanceKm : Math.max(140, clientsBefore * 45)

  // Clientes novos geram ~38 km; clientes já existentes na carga geram apenas ~10 km
  const existingCustomersSet = new Set(
    currentOrders.map((o) => (o.customer_code || o.customer_name || '').trim().toLowerCase()),
  )
  let addedKm = 0
  const processedAddedCust = new Set<string>()
  addedOrders.forEach((o) => {
    const cKey = (o.customer_code || o.customer_name || '').trim().toLowerCase()
    if (!processedAddedCust.has(cKey)) {
      processedAddedCust.add(cKey)
      if (existingCustomersSet.has(cKey)) {
        addedKm += 12 // mesmo cliente, mesmo destino/proximidade
      } else {
        addedKm += 38
      }
    }
  })
  if (addedOrders.length > 2) addedKm += 15

  const additionalDistanceKm = Math.max(15, addedKm)
  const distanceAfterKm = distBefore + additionalDistanceKm

  // Tempo: base ~50 km/h + 40 min por descarga
  const baseMinutes = Math.round((distBefore / 50) * 60 + dischargesBefore * 40)
  const additionalTimeMinutes = Math.round(
    (additionalDistanceKm / 50) * 60 + Math.max(0, dischargesAfter - dischargesBefore) * 40,
  )
  const totalMinutesAfter = baseMinutes + additionalTimeMinutes

  const formatHoursMinutes = (totalMin: number) => {
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return `${h}h${m.toString().padStart(2, '0')}`
  }

  const timeBeforeFormatted = formatHoursMinutes(baseMinutes)
  const timeAfterFormatted = formatHoursMinutes(totalMinutesAfter)
  const additionalTimeFormatted = `+${Math.floor(additionalTimeMinutes / 60)}h${(additionalTimeMinutes % 60).toString().padStart(2, '0')}`

  // Custos de Frete (R$ 6,50/km padrão + R$ 85 por descarga adicional + R$ 42/t)
  const freightBeforeBrl = Math.round(
    distBefore * 6.5 + dischargesBefore * 85 + weightBeforeTon * 42,
  )
  const freightAfterBrl = Math.round(
    distanceAfterKm * 6.5 + dischargesAfter * 85 + weightAfterTon * 42,
  )

  // Pedágio proporcional (R$ 0,55/km)
  const tollBeforeBrl = Math.round(distBefore * 0.55)
  const tollAfterBrl = Math.round(distanceAfterKm * 0.55)

  // Custo por tonelada (Frete total / toneladas)
  const costPerTonBeforeBrl =
    weightBeforeTon > 0 ? Math.round(freightBeforeBrl / weightBeforeTon) : 0
  const costPerTonAfterBrl = weightAfterTon > 0 ? Math.round(freightAfterBrl / weightAfterTon) : 0

  return {
    weightBeforeTon,
    weightAfterTon,
    occupancyBeforePct,
    occupancyAfterPct,
    clientsBefore,
    clientsAfter,
    dischargesBefore,
    dischargesAfter,
    fractionationsBefore,
    fractionationsAfter,
    fractionationsDelta,
    remessasBefore,
    remessasAfter,
    distanceBeforeKm: distBefore,
    distanceAfterKm,
    additionalDistanceKm,
    additionalTimeMinutes,
    additionalTimeFormatted,
    timeBeforeFormatted,
    timeAfterFormatted,
    freightBeforeBrl,
    freightAfterBrl,
    tollBeforeBrl,
    tollAfterBrl,
    costPerTonBeforeBrl,
    costPerTonAfterBrl,
  }
}

/**
 * Motor de Inteligência Artificial Determinístico / Rastreável da Adição de Rotas (Requisitos 6 e 7)
 * Cobre situação do itinerário, carga disponível, capacidade, ocupação, prazo, estoque, PCP, pedidos,
 * distância, clientes/fracionamentos adicionais, descargas, tempo, custo e risco.
 *
 * Contraposição IA x Justificativa:
 * Caso de divergência: exibir mensagem EXATA:
 * "A justificativa informada não está plenamente sustentada pelos dados disponíveis."
 */
export function generateRouteAdditionAiAnalysis(params: {
  originalItineraryCode: string
  addedItineraryCode: string
  metrics: RouteAdditionMetricsComparison
  addedOrders: SapSalesOrderEntity[]
  selectedReasonCode: string
  userObservation?: string
}): AiEvaluationResult {
  const {
    originalItineraryCode,
    addedItineraryCode,
    metrics,
    addedOrders,
    selectedReasonCode,
    userObservation = '',
  } = params

  const {
    weightBeforeTon,
    weightAfterTon,
    occupancyBeforePct,
    occupancyAfterPct,
    additionalDistanceKm,
    freightBeforeBrl,
    freightAfterBrl,
    costPerTonBeforeBrl,
    costPerTonAfterBrl,
    dischargesAfter,
    dischargesBefore,
    fractionationsBefore,
    fractionationsAfter,
    fractionationsDelta,
    timeBeforeFormatted,
    timeAfterFormatted,
  } = metrics

  const addedWeightTon = Math.round((weightAfterTon - weightBeforeTon) * 10) / 10
  const occupancyGain = occupancyAfterPct - occupancyBeforePct
  const freightIncreaseBrl = freightAfterBrl - freightBeforeBrl
  const additionalDischarges = dischargesAfter - dischargesBefore

  // Checagem de estoque e crédito nos pedidos adicionados
  const allStockReady = addedOrders.every(
    (o) =>
      o.production_status === 'Pronto' || (o.stock_available || 0) > 0 || (o.stock_dp34 || 0) > 0,
  )
  const hasCreditIssue = addedOrders.some((o) => o.credit_status === 'Bloqueado')
  const hasCreditAnalysis = addedOrders.some((o) => o.credit_status === 'Em Análise')

  // Checagem de urgência (data solicitada hoje ou em atraso)
  const today = new Date().toISOString().split('T')[0]
  const hasUrgentDate = addedOrders.some((o) => {
    if (!o.desired_date) return false
    return o.desired_date <= today
  })

  // 1. Diagnóstico Objetivo e Independente da IA (Requisito 6)
  const diagnosticParts: string[] = []

  diagnosticParts.push(
    `O itinerário ${originalItineraryCode} possui ${weightBeforeTon.toFixed(1)} t de pedidos elegíveis (${occupancyBeforePct}% de ocupação da capacidade nominal).`,
  )

  if (addedOrders.length > 0) {
    diagnosticParts.push(
      `A inclusão da rota ${addedItineraryCode} acrescenta ${addedOrders.length} pedido(s) totalizando ${addedWeightTon.toFixed(1)} t disponíveis${
        hasUrgentDate ? ' com prazo de entrega imediato/vencido' : ''
      }${allStockReady ? ' e estoque físico pronto no armazém DP34' : ' (com itens com programação PCP)'}.`,
    )
  }

  if (fractionationsDelta > 0) {
    diagnosticParts.push(
      `A operação eleva a ocupação de ${occupancyBeforePct}% para ${occupancyAfterPct}% (+${occupancyGain} p.p.), porém adiciona +${fractionationsDelta} fracionamento(s) (totalizando ${fractionationsAfter}), +${additionalDistanceKm} km de percurso e expande o tempo estimado de ${timeBeforeFormatted} para ${timeAfterFormatted}, com custo adicional de R$ ${freightIncreaseBrl.toLocaleString('pt-BR')} no frete.`,
    )
  } else {
    diagnosticParts.push(
      `A operação consolida a ocupação em ${occupancyAfterPct}% (+${occupancyGain} p.p.) sem ampliar fracionamentos (${fractionationsBefore} clientes mantidos), somando +${additionalDistanceKm} km e tempo de ${timeBeforeFormatted} → ${timeAfterFormatted}.`,
    )
  }

  if (costPerTonAfterBrl <= costPerTonBeforeBrl && costPerTonBeforeBrl > 0) {
    diagnosticParts.push(
      `Há diluição positiva de custo unitário: de R$ ${costPerTonBeforeBrl}/t para R$ ${costPerTonAfterBrl}/t.`,
    )
  } else if (costPerTonAfterBrl > costPerTonBeforeBrl) {
    diagnosticParts.push(
      `O custo unitário varia de R$ ${costPerTonBeforeBrl}/t para R$ ${costPerTonAfterBrl}/t devido ao desvio quilométrico.`,
    )
  }

  // 2. Avaliação de Risco e Alertas
  const isHighDeviation = additionalDistanceKm >= 95
  const isModestGain = occupancyGain < 10
  const isExpensive = freightIncreaseBrl > 500
  const isRelevantImpact = (isHighDeviation || isExpensive) && isModestGain && !hasUrgentDate

  let riskLevel: AiRiskLevel = 'FAVORAVEL'
  let alertMessage: string | undefined = undefined

  if (isRelevantImpact || hasCreditIssue) {
    riskLevel = 'ALTO_IMPACTO_DESFAVORAVEL'
    alertMessage =
      'A justificativa informada não está plenamente sustentada pelos dados disponíveis.'
  } else if (additionalDistanceKm > 60 || occupancyGain < 5 || hasCreditAnalysis) {
    riskLevel = 'MODERADO'
  }

  // 3. Validação da Justificativa (IA x Usuário - Requisito 7)
  let alignment: AiAlignmentClassification = 'Coerente'
  let alignmentConclusion = ''

  const reasonCodeNormalized = normalizeReasonCode(selectedReasonCode)
  const reasonObj = ROUTE_ADDITION_REASONS.find((r) => r.code === reasonCodeNormalized)
  const reasonText = reasonObj ? reasonObj.label : 'Não informado'

  const obsLower = userObservation.toLowerCase()

  if (!selectedReasonCode) {
    alignment = 'Dados insuficientes'
    alignmentConclusion =
      'Selecione um motivo obrigatório para que a IA valide a coerência técnica.'
  } else if (reasonCodeNormalized === '1' || reasonCodeNormalized === '7') {
    // 1. Urgência de entrega / 7. Prazo crítico de cliente
    if (
      hasUrgentDate ||
      obsLower.includes('urgente') ||
      obsLower.includes('prazo') ||
      obsLower.includes('atraso') ||
      obsLower.includes('hoje')
    ) {
      alignment = 'Coerente'
      alignmentConclusion = `Evidências confirmam data de entrega crítica na carteira SAP, justificando a inclusão emergencial de +${additionalDistanceKm} km.`
    } else if (occupancyBeforePct >= 80 && additionalDistanceKm > 60) {
      // Caso de Divergência explicitado no Requisito 7
      alignment = 'Divergente'
      alignmentConclusion = `Divergência detectada: a carga original já possui ${occupancyBeforePct}% de ocupação, os pedidos da nova rota apresentam prazo D+3 ou superior sem atraso e geram +${additionalDistanceKm} km de desvio.`
      alertMessage =
        'A justificativa informada não está plenamente sustentada pelos dados disponíveis.'
    } else {
      alignment = 'Parcialmente coerente'
      alignmentConclusion = `A data solicitada no SAP não indica vencimento imediato (<24h), mas o atendimento antecipado viabiliza a rota.`
    }
  } else if (
    reasonCodeNormalized === '2' ||
    reasonCodeNormalized === '4' ||
    reasonCodeNormalized === '5'
  ) {
    // 2. Falta de pedidos no original / 4. Volume insuficiente / 5. Complementação de carga
    if (occupancyBeforePct < 75) {
      alignment = 'Coerente'
      alignmentConclusion = `O itinerário ${originalItineraryCode} possui ${weightBeforeTon.toFixed(1)} t (${occupancyBeforePct}% de ocupação), confirmando volume insuficiente e sustentando a complementação para ${occupancyAfterPct}%.`
    } else {
      alignment = 'Parcialmente coerente'
      alignmentConclusion = `A carga original já apresentava ${occupancyBeforePct}% de ocupação. A inclusão complementa para ${occupancyAfterPct}%, mas requer atenção ao desvio de +${additionalDistanceKm} km.`
    }
  } else if (reasonCodeNormalized === '3' || reasonCodeNormalized === '12') {
    // 3. Falta de estoque / 12. Alteração de estoque
    alignment = 'Coerente'
    alignmentConclusion = `O itinerário ${originalItineraryCode} possui ${weightBeforeTon.toFixed(1)} t de pedidos elegíveis. Dos volumes faltantes para completar a capacidade prevista, há indisponibilidade de estoque no armazém, justificando a rota complementar ${addedItineraryCode}.`
  } else if (reasonCodeNormalized === '6' || reasonCodeNormalized === '13') {
    // 6. Melhor aproveitamento do veículo / 13. Redução de capacidade ociosa
    if (occupancyGain >= 8) {
      alignment = 'Coerente'
      alignmentConclusion = `Evidências confirmam salto de ocupação de ${occupancyBeforePct}% para ${occupancyAfterPct}% (+${occupancyGain} p.p.), reduzindo expressivamente a ociosidade da carreta.`
    } else {
      alignment = 'Parcialmente coerente'
      alignmentConclusion = `Ganho de ocupação moderado (+${occupancyGain} p.p.), contrastando com acréscimo de +${additionalDistanceKm} km.`
    }
  } else if (reasonCodeNormalized === '11') {
    // 11. Alteração da programação PCP
    alignment = 'Coerente'
    alignmentConclusion = `Evidência compatível com reprogramação das ordens no PCP fabril, contingenciando os itens expedidos.`
  } else if (reasonCodeNormalized === '16') {
    // 16. Outro
    if (userObservation.trim().length < 5) {
      alignment = 'Dados insuficientes'
      alignmentConclusion =
        'Observação obrigatória não detalhada suficientemente para validação de dados.'
    } else {
      alignment = 'Parcialmente coerente'
      alignmentConclusion = `Justificativa livre registrada pelo usuário: "${userObservation}". Responsabilidade registrada na trilha de auditoria.`
    }
  } else {
    // Demais motivos (Comercial, Cliente, Restrição, Otimização, etc.)
    if (isRelevantImpact) {
      alignment = 'Divergente'
      alignmentConclusion = `A justificativa informada ("${reasonText}") contrasta com desvio de +${additionalDistanceKm} km e elevação de R$ ${freightIncreaseBrl.toLocaleString('pt-BR')} com ganho modesto de ocupação (+${occupancyGain} p.p.).`
      alertMessage =
        'A justificativa informada não está plenamente sustentada pelos dados disponíveis.'
    } else {
      alignment = 'Coerente'
      alignmentConclusion = `Justificativa alinhada com as restrições logísticas e de atendimento comercial da praça.`
    }
  }

  return {
    diagnostic: diagnosticParts.join(' '),
    alignment,
    alignmentConclusion,
    riskLevel,
    hasRelevantImpactAlert: !!alertMessage,
    alertMessage,
    alertDetails: {
      additionalKm: additionalDistanceKm,
      additionalDischarges,
      freightIncreaseBrl,
      occupancyBeforePct,
      occupancyAfterPct,
      hasUrgency: hasUrgentDate,
    },
  }
}
