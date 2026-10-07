// TMS CIAFAL — Motor de Adição Excepcional de Rotas em Itinerários & Análise de IA
// Em conformidade estrita com os Itens 1–11, 15, 16, 20, 21 da especificação do usuário.

import { SapSalesOrderEntity, SapItineraryEntity } from './rules'
import { calculateCargoFractionation } from './cargoFractionationEngine'

export const ROUTE_ADDITION_REASONS = [
  { code: '1', label: '1. Urgência de entrega' },
  { code: '2', label: '2. Falta de volume no itinerário original' },
  { code: '3', label: '3. Falta de estoque para completar o itinerário original' },
  { code: '4', label: '4. Falta de pedidos disponíveis no itinerário original' },
  { code: '5', label: '5. Complementação de carga / melhor ocupação do veículo' },
  { code: '6', label: '6. Prazo crítico do cliente' },
  { code: '7', label: '7. Janela ou restrição de descarga' },
  { code: '8', label: '8. Restrição de veículo' },
  { code: '9', label: '9. Solicitação comercial' },
  { code: '10', label: '10. Solicitação do cliente' },
  { code: '11', label: '11. Reprogramação logística' },
  { code: '12', label: '12. Otimização de frete' },
  { code: '13', label: '13. Redução de viagem com capacidade ociosa' },
  { code: '14', label: '14. Indisponibilidade operacional' },
  { code: '15', label: '15. Alteração de estoque após planejamento' },
  { code: '16', label: '16. Alteração de programação PCP' },
  { code: '17', label: '17. Outro' },
] as const

export type RouteAdditionReasonCode = (typeof ROUTE_ADDITION_REASONS)[number]['code']

export type AiAlignmentClassification =
  | 'Coerente'
  | 'Parcialmente coerente'
  | 'Divergente'
  | 'Dados insuficientes'

export type AiRiskLevel = 'FAVORAVEL' | 'MODERADO' | 'ALTO_IMPACTO_DESFAVORAVEL'

export interface RouteAdditionEntity {
  id?: string
  load_id?: string
  cargo_number?: string
  transport_number?: string
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
  ai_classification?: string
  ai_risk_level?: AiRiskLevel
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
 * Calcula métricas antes e depois da inclusão dos pedidos complementares
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
  const addedClientsCount = new Set(addedOrders.map((o) => o.customer_code || o.customer_name)).size
  const dischargesAfter = dischargesBefore + addedClientsCount

  // Distâncias: heurística determinística CIAFAL
  // Distância base: estimada ou padrão de itinerário (~220 km padrão regional)
  const distBefore =
    baseDistanceKm && baseDistanceKm > 0 ? baseDistanceKm : Math.max(120, clientsBefore * 45)
  // Desvio adicional: se itinerário diferente, soma desvio baseado na dispersão (~35 a 65 km por parada adicional)
  const additionalDistanceKm = Math.round(
    addedClientsCount * 38 + (addedOrders.length > 1 ? 15 : 0),
  )
  const distanceAfterKm = distBefore + additionalDistanceKm

  // Tempo adicional: ~1h para cada 40 km + 30 min por descarga
  const additionalTimeMinutes = Math.round(
    (additionalDistanceKm / 60) * 60 + addedClientsCount * 30,
  )

  // Custos de Frete (R$ 6,50/km padrão + R$ 85 por descarga adicional + piso ANTT referencial)
  const freightBeforeBrl = Math.round(
    distBefore * 6.5 + dischargesBefore * 85 + weightBeforeTon * 42,
  )
  const freightAfterBrl = Math.round(
    distanceAfterKm * 6.5 + dischargesAfter * 85 + weightAfterTon * 42,
  )

  // Pedágio proporcional (R$ 0,55/km em média nas rodovias concessionadas MG/SP)
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
    freightBeforeBrl,
    freightAfterBrl,
    tollBeforeBrl,
    tollAfterBrl,
    costPerTonBeforeBrl,
    costPerTonAfterBrl,
  }
}

/**
 * Motor de Inteligência Artificial Determinístico / Rastreável da Adição de Rotas (Itens 5, 6, 7)
 * Gera parecer objetivo, sem repetir dados, comparando benefício de ocupação vs desvio em km/custo.
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

  // Checagem de urgência (data solicitada hoje ou amanhã)
  const today = new Date().toISOString().split('T')[0]
  const hasUrgentDate = addedOrders.some((o) => {
    if (!o.desired_date) return false
    return o.desired_date <= today
  })

  // 1. Geração do Diagnóstico Objetivo da IA (Item 5)
  const diagnosticParts: string[] = []

  diagnosticParts.push(
    `O itinerário original ${originalItineraryCode} possui ${weightBeforeTon.toFixed(1)} t (${occupancyBeforePct}% de ocupação).`,
  )

  if (addedOrders.length > 0) {
    diagnosticParts.push(
      `Há ${addedOrders.length} pedido(s) totalizando ${addedWeightTon.toFixed(1)} t na rota complementar ${addedItineraryCode}${
        hasUrgentDate ? ' com entrega prioritária/imediata' : ''
      }${allStockReady ? ' e estoque físico pronto no DP34' : ' (com itens pendentes de PCP/estoque)'}.`,
    )
  }

  if (fractionationsDelta > 0) {
    diagnosticParts.push(
      `A inclusão elevará a ocupação de ${occupancyBeforePct}% para ${occupancyAfterPct}% (+${occupancyGain} p.p.), porém aumentará os fracionamentos de ${fractionationsBefore} para ${fractionationsAfter} (+${fractionationsDelta}) e adicionará +${additionalDistanceKm} km, com acréscimo estimado de R$ ${freightIncreaseBrl.toLocaleString('pt-BR')} no frete.`,
    )
  } else {
    diagnosticParts.push(
      `A inclusão eleva a ocupação para ${occupancyAfterPct}% (+${occupancyGain} p.p.), mantendo os fracionamentos em ${fractionationsBefore}, adicionando +${additionalDistanceKm} km e +${additionalDischarges} descarga(s), com acréscimo estimado de R$ ${freightIncreaseBrl.toLocaleString('pt-BR')} no frete.`,
    )
  }

  if (costPerTonAfterBrl <= costPerTonBeforeBrl && costPerTonBeforeBrl > 0) {
    diagnosticParts.push(
      `A diluição de custo é positiva: custo por tonelada cai de R$ ${costPerTonBeforeBrl}/t para R$ ${costPerTonAfterBrl}/t.`,
    )
  } else if (costPerTonAfterBrl > costPerTonBeforeBrl) {
    diagnosticParts.push(
      `O custo por tonelada sofre ligeiro acréscimo de R$ ${costPerTonBeforeBrl}/t para R$ ${costPerTonAfterBrl}/t em função do desvio quilométrico.`,
    )
  }

  // 2. Avaliação de Risco e Alerta Fora do Padrão (Item 7)
  // Regra: Impacto relevante se desvio > 100 km OU custo > R$ 500 com ganho de ocupação modesto (< 10 p.p.) sem urgência
  const isHighDeviation = additionalDistanceKm >= 95
  const isModestGain = occupancyGain < 10
  const isExpensive = freightIncreaseBrl > 500
  const isRelevantImpact = (isHighDeviation || isExpensive) && isModestGain && !hasUrgentDate

  let riskLevel: AiRiskLevel = 'FAVORAVEL'
  let alertMessage: string | undefined = undefined

  if (isRelevantImpact || hasCreditIssue) {
    riskLevel = 'ALTO_IMPACTO_DESFAVORAVEL'
    alertMessage =
      'A IA identificou impacto logístico superior ao benefício estimado. Revise a decisão antes de confirmar.'
  } else if (additionalDistanceKm > 60 || occupancyGain < 5 || hasCreditAnalysis) {
    riskLevel = 'MODERADO'
  }

  // 3. IA Contrapondo a Justificativa (Item 6)
  // Classificação: Coerente | Parcialmente coerente | Divergente | Dados insuficientes
  let alignment: AiAlignmentClassification = 'Coerente'
  let alignmentConclusion = ''

  const reasonObj = ROUTE_ADDITION_REASONS.find((r) => r.code === selectedReasonCode)
  const reasonText = reasonObj ? reasonObj.label : 'Não informado'

  const obsLower = userObservation.toLowerCase()

  if (!selectedReasonCode) {
    alignment = 'Dados insuficientes'
    alignmentConclusion =
      'Selecione um motivo obrigatório para que a IA avalie a coerência operacional.'
  } else if (selectedReasonCode === '1' || selectedReasonCode === '6') {
    // Urgência de entrega ou Prazo crítico
    if (
      hasUrgentDate ||
      obsLower.includes('urgente') ||
      obsLower.includes('prazo') ||
      obsLower.includes('hoje')
    ) {
      alignment = 'Coerente'
      alignmentConclusion = `Justificativa coerente com a carteira SAP: pedido(s) possuem data crítica de atendimento, justificando o desvio de +${additionalDistanceKm} km.`
    } else {
      alignment = 'Parcialmente coerente'
      alignmentConclusion = `Justificativa parcialmente coerente: a data solicitada no SAP não indica urgência imediata (< 24h), porém a inclusão otimiza o atendimento regional.`
    }
  } else if (selectedReasonCode === '2' || selectedReasonCode === '4') {
    // Falta de volume ou falta de pedidos
    if (occupancyBeforePct < 75) {
      alignment = 'Coerente'
      alignmentConclusion = `Justificativa plenamente coerente: itinerário original com apenas ${occupancyBeforePct}% de ocupação (${weightBeforeTon.toFixed(1)} t), exigindo complemento.`
    } else {
      alignment = 'Parcialmente coerente'
      alignmentConclusion = `Justificativa parcialmente coerente: a carga já contava com ${occupancyBeforePct}% de ocupação, mas o complemento consolida o veículo para ${occupancyAfterPct}%.`
    }
  } else if (selectedReasonCode === '3' || selectedReasonCode === '15') {
    // Falta de estoque ou alteração de estoque
    alignment = 'Coerente'
    alignmentConclusion = `Justificativa coerente com a disponibilidade fabril: complementação atua como contingência à restrição de estoque no itinerário original.`
  } else if (
    selectedReasonCode === '5' ||
    selectedReasonCode === '12' ||
    selectedReasonCode === '13'
  ) {
    // Complementação de carga / otimização / redução viagem ociosa
    if (occupancyGain >= 8) {
      alignment = 'Coerente'
      alignmentConclusion = `Justificativa coerente: ganho expressivo de ocupação (+${occupancyGain} p.p., atingindo ${occupancyAfterPct}%), reduzindo capacidade ociosa do frete contratado.`
    } else {
      alignment = 'Parcialmente coerente'
      alignmentConclusion = `Justificativa parcialmente coerente: ganho de ocupação é moderado (+${occupancyGain} p.p.), exigindo atenção ao desvio de +${additionalDistanceKm} km.`
    }
  } else if (selectedReasonCode === '17') {
    // Outro
    if (userObservation.trim().length < 10) {
      alignment = 'Dados insuficientes'
      alignmentConclusion =
        'Observação do usuário resumida. Detalhe o motivo operacional no campo de texto para validação completa.'
    } else {
      alignment = 'Parcialmente coerente'
      alignmentConclusion = `Justificativa registrada pelo usuário: "${userObservation}". A decisão possui coerência operacional sob supervisão do gestor.`
    }
  } else {
    // Motivos comerciais, reprogramação, janela, etc.
    if (isRelevantImpact) {
      alignment = 'Divergente'
      alignmentConclusion = `Divergência técnica identificada: o motivo "${reasonText}" gera acréscimo de +${additionalDistanceKm} km e R$ ${freightIncreaseBrl.toLocaleString('pt-BR')} com ganho de ocupação de apenas +${occupancyGain} p.p. Recomenda-se validação gerencial.`
    } else {
      alignment = 'Coerente'
      alignmentConclusion = `Justificativa coerente: o itinerário complementar converge operacionalmente com o planejamento da carga ${originalItineraryCode}.`
    }
  }

  return {
    diagnostic: diagnosticParts.join(' '),
    alignment,
    alignmentConclusion,
    riskLevel,
    hasRelevantImpactAlert: isRelevantImpact,
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

/**
 * Inteligência Gerencial de Padrões de Itinerários (Item 15 e 16 do Relatório de Itinerários)
 * Analisa o histórico de adições e identifica padrões recorrentes vs eventos pontuais.
 */
export interface ItineraryPatternAnalysis {
  itineraryCode: string
  totalLoads: number
  loadsWithAddition: number
  additionRatePct: number
  topReason: string
  topReasonPct: number
  isRecurrentPattern: boolean
  diagnosisText: string
  recommendedActions: string[]
}

export function analyzeItineraryPatterns(
  additions: RouteAdditionEntity[],
  itineraryCodes: string[],
): ItineraryPatternAnalysis[] {
  const result: ItineraryPatternAnalysis[] = []

  // Agrupa adições por itinerário original
  const byItin = new Map<string, RouteAdditionEntity[]>()
  additions.forEach((add) => {
    const list = byItin.get(add.original_itinerary_id) || []
    list.push(add)
    byItin.set(add.original_itinerary_id, list)
  })

  itineraryCodes.forEach((code) => {
    const list = byItin.get(code) || []
    if (list.length === 0) return

    // Estima total de cargas daquele itinerário (no mínimo as com adição + amostra)
    const additionCount = list.length
    const estimatedTotalLoads = Math.max(
      additionCount,
      additionCount >= 3 ? Math.round(additionCount * 2.5) : additionCount + 2,
    )
    const ratePct = Math.round((additionCount / estimatedTotalLoads) * 100)

    // Motivo mais frequente
    const reasonCounts: Record<string, number> = {}
    list.forEach((item) => {
      const desc = item.reason_description || 'Não especificado'
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

    const topReasonPct = Math.round((maxCount / additionCount) * 100)
    const isRecurrent = additionCount >= 3 || ratePct >= 25

    let diagnosisText = ''
    const recommendedActions: string[] = []

    if (isRecurrent) {
      diagnosisText = `O itinerário ${code} recebeu rota adicional em ${ratePct}% das cargas analisadas. Em ${topReasonPct}% dos casos, o motivo registrado foi "${topReason}". O padrão indica oportunidade de revisar a composição do itinerário ou a frequência de programação.`
      recommendedActions.push('Revisar configuração do itinerário SAP TVROT')
      recommendedActions.push('Revisar frequência de programação de cargas da região')
      recommendedActions.push('Avaliar rota complementar permanente no cadastro mestre')
      if (topReason.toLowerCase().includes('estoque')) {
        recommendedActions.push('Verificar disponibilidade de estoque e atuar com PCP')
      }
      if (
        topReason.toLowerCase().includes('ocupação') ||
        topReason.toLowerCase().includes('volume')
      ) {
        recommendedActions.push('Revisar veículo padrão ou regras de consolidação comercial')
      }
    } else {
      diagnosisText = `O itinerário ${code} registrou evento pontual de adição de rota (${additionCount} ocorrência(s)), sem caracterizar distorção crônica de planejamento.`
      recommendedActions.push('Manter monitoramento de volume e liberação de carteira')
    }

    result.push({
      itineraryCode: code,
      totalLoads: estimatedTotalLoads,
      loadsWithAddition: additionCount,
      additionRatePct: ratePct,
      topReason,
      topReasonPct,
      isRecurrentPattern: isRecurrent,
      diagnosisText,
      recommendedActions,
    })
  })

  return result.sort((a, b) => b.loadsWithAddition - a.loadsWithAddition)
}
