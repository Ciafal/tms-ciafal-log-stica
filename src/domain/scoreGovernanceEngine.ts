/**
 * TMS CIAFAL — Governança e Calibração do Score Operacional
 *
 * Princípios Fundamentais:
 * 1. Pesos Configuráveis com Soma Obrigatória de 100%:
 *    - Avaliação dos serviços: default 30%
 *    - Pontualidade: default 20%
 *    - Reclamações procedentes: default 15%
 *    - Ocorrências: default 10%
 *    - Atendimento/comunicação: default 10%
 *    - Histórico de entregas: default 10%
 *    - Elogios/reconhecimentos: default 5%
 *    Validação estrita: soma !== 100% => bloqueia salvamento com erro explicativo.
 * 2. Versionamento dos Pesos:
 *    NUNCA sobrescreve configuração anterior. Grava version_code, usuário, data, justificativa,
 *    valores anteriores, valores novos e data de vigência.
 * 3. Score Explicável:
 *    Detalhamento completo: Critério | Resultado | Peso | Contribuição.
 *    Mostra dados utilizados, período, versão da regra, quantidade de transportes e avaliações.
 * 4. Não Penalizar Falta de Avaliação:
 *    Ausência de avaliação NUNCA é nota zero. Exibe "Histórico insuficiente para este critério."
 *    e redistribui proporcionalmente ou isola o critério.
 * 5. Confiabilidade da Amostra:
 *    BAIXA / MEDIA / ALTA baseada no volume de transportes, avaliações e itinerários.
 *    (Ex.: Score 92 com 2 transportes => Baixa).
 * 6. Fluxo de Homologação e Simulador:
 *    RASCUNHO -> SIMULADO -> HOMOLOGADO -> VIGENTE.
 *    Simulador compara o impacto nos dados reais antes de ativar (ex.: "18 aumentam, 7 reduzem, 2 iguais").
 */

import {
  CarrierOperationalRecord,
  CarrierEvaluationRecord,
  CarrierComplaintRecord,
  CarrierComplimentRecord,
} from './carrierHistoryEngine'

export interface ScoreWeights {
  servicesEvaluationPct: number // default 30
  punctualityPct: number // default 20
  procedenteComplaintsPct: number // default 15
  occurrencesPct: number // default 10
  communicationPct: number // default 10
  deliveryHistoryPct: number // default 10
  complimentsPct: number // default 5
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  servicesEvaluationPct: 30,
  punctualityPct: 20,
  procedenteComplaintsPct: 15,
  occurrencesPct: 10,
  communicationPct: 10,
  deliveryHistoryPct: 10,
  complimentsPct: 5,
}

export type ScoreLifecycleStatus = 'RASCUNHO' | 'SIMULADO' | 'HOMOLOGADO' | 'VIGENTE' | 'ARQUIVADO'

export interface ScoreRuleVersion {
  id?: string
  version_code: string
  rule_name: string
  lifecycle_status: ScoreLifecycleStatus
  weights: ScoreWeights
  target_coverage_pct: number // default 80%
  min_transports_for_high_confidence: number // default 15
  min_transports_for_medium_confidence: number // default 5
  effective_start_date?: string
  effective_end_date?: string
  justification: string
  created_by_user_email?: string
  created_by_user_name?: string
  homologated_by_user_email?: string
  homologated_by_user_name?: string
  homologated_at?: string
  previous_values_json?: any
  simulation_impact_json?: {
    drivers_improved: number
    drivers_reduced: number
    drivers_unchanged: number
    total_evaluated: number
  }
}

export interface ScoreCriterionBreakdown {
  criterionName: string
  rawMetricDisplay: string
  normalizedScore: number // 0 a 100
  weightPct: number // ex: 30
  weightedContribution: number // normalizedScore * weightPct / 100
  hasSufficientData: boolean
  explanationNote: string
}

export type ConfidenceLevel = 'BAIXA' | 'MEDIA' | 'ALTA'

export interface ExplainableScoreResult {
  finalScore: number // 0 a 100
  confidenceLevel: ConfidenceLevel
  confidenceReason: string
  ruleVersionCode: string
  transportsTotal: number
  evaluationsTotal: number
  coverageEvaluationPct: number
  hasSufficientSample: boolean
  criteriaBreakdown: ScoreCriterionBreakdown[]
  usedTransportsSummary: string
  divergenceWarning?: string
}

/**
 * Valida se a soma dos pesos é rigorosamente 100%.
 */
export function validateWeightsSum(w: ScoreWeights): {
  isValid: boolean
  currentSum: number
  errorMessage?: string
} {
  const sum =
    w.servicesEvaluationPct +
    w.punctualityPct +
    w.procedenteComplaintsPct +
    w.occurrencesPct +
    w.communicationPct +
    w.deliveryHistoryPct +
    w.complimentsPct

  if (Math.abs(sum - 100) > 0.001) {
    return {
      isValid: false,
      currentSum: sum,
      errorMessage: `A soma dos pesos deve ser exatamente 100%. Soma calculada: ${sum}%. Ajuste os valores antes de salvar.`,
    }
  }
  return { isValid: true, currentSum: sum }
}

/**
 * Avalia o nível de confiabilidade amostral de um prestador.
 */
export function evaluateSampleConfidence(
  transportsCount: number,
  evaluationsCount: number,
  itinerariesCount: number,
  minHigh = 15,
  minMedium = 5,
): { level: ConfidenceLevel; reason: string } {
  if (transportsCount < minMedium) {
    return {
      level: 'BAIXA',
      reason: `Amostra incipiente com apenas ${transportsCount} transporte(s) e ${evaluationsCount} avaliação(ões). Histórico insuficiente para conclusões estatísticas seguras.`,
    }
  }
  if (transportsCount < minHigh || itinerariesCount < 2) {
    return {
      level: 'MEDIA',
      reason: `Amostra intermediária (${transportsCount} transportes em ${itinerariesCount} rota(s)). Confiabilidade estatística moderada.`,
    }
  }
  return {
    level: 'ALTA',
    reason: `Amostra robusta e consolidada (${transportsCount} transportes em ${itinerariesCount} itinerários com ${evaluationsCount} avaliações).`,
  }
}

/**
 * Calcula o Score Explicável sobre os dados reais sem dados fictícios.
 * Não penaliza a ausência de avaliação com nota zero.
 */
export function calculateGovernedScore(
  driverOrPlate: string,
  targetType: 'MOTORISTA' | 'VEICULO',
  historyRecords: CarrierOperationalRecord[],
  evaluations: CarrierEvaluationRecord[],
  complaints: CarrierComplaintRecord[],
  compliments: CarrierComplimentRecord[],
  rule: ScoreRuleVersion,
): ExplainableScoreResult {
  const matchingHistory = historyRecords.filter((r) => {
    if (targetType === 'MOTORISTA') {
      return (
        r.driver_name?.toLowerCase() === driverOrPlate.toLowerCase() ||
        r.driver_id?.toLowerCase() === driverOrPlate.toLowerCase()
      )
    }
    return (
      r.vehicle_plate?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() ===
      driverOrPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    )
  })

  const matchingEvals = evaluations.filter((e) => {
    if (targetType === 'MOTORISTA') {
      return (
        e.driver_name?.toLowerCase() === driverOrPlate.toLowerCase() ||
        e.driver_id?.toLowerCase() === driverOrPlate.toLowerCase()
      )
    }
    return (
      e.vehicle_plate?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() ===
      driverOrPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    )
  })

  const matchingComplaints = complaints.filter((c) => {
    if (targetType === 'MOTORISTA') {
      return c.driver_name?.toLowerCase() === driverOrPlate.toLowerCase()
    }
    return (
      c.vehicle_plate?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() ===
      driverOrPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    )
  })

  const matchingCompliments = compliments.filter((c) => {
    if (targetType === 'MOTORISTA') {
      return c.driver_name?.toLowerCase() === driverOrPlate.toLowerCase()
    }
    return (
      c.vehicle_plate?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() ===
      driverOrPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    )
  })

  const transportsCount = matchingHistory.length
  const evaluationsCount = matchingEvals.length
  const itinerariesSet = new Set(matchingHistory.map((r) => r.itinerary_code).filter(Boolean))

  const confidence = evaluateSampleConfidence(
    transportsCount,
    evaluationsCount,
    itinerariesSet.size,
    rule.min_transports_for_high_confidence,
    rule.min_transports_for_medium_confidence,
  )

  const coveragePct = transportsCount > 0 ? (evaluationsCount / transportsCount) * 100 : 0

  // 1. Avaliação dos serviços (30%)
  const ratings = matchingEvals
    .map((e) => (targetType === 'MOTORISTA' ? e.driver_avg_score : e.vehicle_avg_score))
    .filter((n): n is number => typeof n === 'number' && n > 0)
  const hasRatingData = ratings.length > 0
  const avgRating = hasRatingData ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
  const normalizedRating = hasRatingData ? (avgRating / 5) * 100 : 80 // Base neutra se ausente, não zero

  // 2. Pontualidade (20%)
  const punctualityRecords = matchingHistory.filter((r) => typeof r.is_on_time === 'boolean')
  const hasPunctualityData = punctualityRecords.length > 0
  const onTimeCount = punctualityRecords.filter((r) => r.is_on_time).length
  const normalizedPunctuality = hasPunctualityData
    ? (onTimeCount / punctualityRecords.length) * 100
    : 85

  // 3. Reclamações procedentes (15%)
  const procedentesCount = matchingComplaints.filter((c) => c.status === 'PROCEDENTE').length
  const normalizedComplaints = Math.max(0, 100 - procedentesCount * 25)

  // 4. Ocorrências (10%)
  const occurrencesTotal = matchingHistory.reduce((acc, r) => acc + (r.occurrences_count || 0), 0)
  const normalizedOccurrences = Math.max(0, 100 - occurrencesTotal * 15)

  // 5. Atendimento / Comunicação (10%)
  const commRatings = matchingEvals
    .map((e) => e.driver_relacionamento_interno || e.driver_cumprimento_orientacoes)
    .filter((n): n is number => typeof n === 'number' && n > 0)
  const hasCommData = commRatings.length > 0
  const avgComm = hasCommData ? commRatings.reduce((a, b) => a + b, 0) / commRatings.length : 0
  const normalizedComm = hasCommData ? (avgComm / 5) * 100 : 80

  // 6. Histórico de entregas (10%)
  const completedCount = matchingHistory.filter((r) => r.final_status === 'CONCLUIDO').length
  const normalizedHistory = transportsCount > 0 ? (completedCount / transportsCount) * 100 : 80

  // 7. Elogios / reconhecimentos (5%)
  const complimentsCount = matchingCompliments.length
  const normalizedCompliments = Math.min(100, 70 + complimentsCount * 15)

  const w = rule.weights
  const criteriaBreakdown: ScoreCriterionBreakdown[] = [
    {
      criterionName: 'Avaliação dos serviços',
      rawMetricDisplay: hasRatingData
        ? `${avgRating.toFixed(1)} / 5,0 (${ratings.length} aval.)`
        : 'Histórico insuficiente para este critério.',
      normalizedScore: normalizedRating,
      weightPct: w.servicesEvaluationPct,
      weightedContribution: (normalizedRating * w.servicesEvaluationPct) / 100,
      hasSufficientData: hasRatingData,
      explanationNote: hasRatingData
        ? `Média calculada sobre ${ratings.length} avaliações registradas de ponta a ponta.`
        : 'Ausência de avaliação não zera a pontuação; ponderado com nota neutra de referência.',
    },
    {
      criterionName: 'Pontualidade de entrega',
      rawMetricDisplay: hasPunctualityData
        ? `${((onTimeCount / punctualityRecords.length) * 100).toFixed(0)}% no prazo (${onTimeCount}/${punctualityRecords.length})`
        : 'Histórico insuficiente para este critério.',
      normalizedScore: normalizedPunctuality,
      weightPct: w.punctualityPct,
      weightedContribution: (normalizedPunctuality * w.punctualityPct) / 100,
      hasSufficientData: hasPunctualityData,
      explanationNote: `${onTimeCount} de ${punctualityRecords.length} entregas concluídas dentro do SLA programado.`,
    },
    {
      criterionName: 'Reclamações procedentes',
      rawMetricDisplay: `${procedentesCount} procedente(s) de ${matchingComplaints.length} total`,
      normalizedScore: normalizedComplaints,
      weightPct: w.procedenteComplaintsPct,
      weightedContribution: (normalizedComplaints * w.procedenteComplaintsPct) / 100,
      hasSufficientData: true,
      explanationNote:
        procedentesCount === 0
          ? 'Nenhuma reclamação procedente registrada no período.'
          : 'Impacto ponderado de 25 pontos deduzidos por reclamação julgada procedente.',
    },
    {
      criterionName: 'Ocorrências operacionais',
      rawMetricDisplay: `${occurrencesTotal} ocorrência(s) em rota`,
      normalizedScore: normalizedOccurrences,
      weightPct: w.occurrencesPct,
      weightedContribution: (normalizedOccurrences * w.occurrencesPct) / 100,
      hasSufficientData: true,
      explanationNote: `Total de ${occurrencesTotal} intercorrências operacionais documentadas nas ordens de transporte.`,
    },
    {
      criterionName: 'Atendimento e comunicação',
      rawMetricDisplay: hasCommData
        ? `${avgComm.toFixed(1)} / 5,0`
        : 'Histórico insuficiente para este critério.',
      normalizedScore: normalizedComm,
      weightPct: w.communicationPct,
      weightedContribution: (normalizedComm * w.communicationPct) / 100,
      hasSufficientData: hasCommData,
      explanationNote: hasCommData
        ? 'Média obtida no checklist de expedição e retorno dos clientes.'
        : 'Não avaliado formalmente na amostra disponível.',
    },
    {
      criterionName: 'Histórico de entregas e finalização',
      rawMetricDisplay: `${completedCount} concluída(s) de ${transportsCount} totais`,
      normalizedScore: normalizedHistory,
      weightPct: w.deliveryHistoryPct,
      weightedContribution: (normalizedHistory * w.deliveryHistoryPct) / 100,
      hasSufficientData: transportsCount > 0,
      explanationNote:
        'Taxa de sucesso na conclusão de viagens sem quebras ou cancelamentos operacionais.',
    },
    {
      criterionName: 'Elogios e reconhecimentos',
      rawMetricDisplay: `${complimentsCount} elogio(s) registrado(s)`,
      normalizedScore: normalizedCompliments,
      weightPct: w.complimentsPct,
      weightedContribution: (normalizedCompliments * w.complimentsPct) / 100,
      hasSufficientData: true,
      explanationNote:
        complimentsCount > 0
          ? `${complimentsCount} registro(s) formal(is) de elogio por clientes ou equipe interna.`
          : 'Sem elogios adicionais pontuados.',
    },
  ]

  const totalWeighted = criteriaBreakdown.reduce((sum, item) => sum + item.weightedContribution, 0)
  const finalScore = Math.min(100, Math.max(0, Math.round(totalWeighted)))

  return {
    finalScore,
    confidenceLevel: confidence.level,
    confidenceReason: confidence.reason,
    ruleVersionCode: rule.version_code,
    transportsTotal: transportsCount,
    evaluationsTotal: evaluationsCount,
    coverageEvaluationPct: Math.round(coveragePct),
    hasSufficientSample: transportsCount >= rule.min_transports_for_medium_confidence,
    criteriaBreakdown,
    usedTransportsSummary: `${transportsCount} viagens registradas (${itinerariesSet.size} rotas distintas)`,
  }
}

/**
 * Simula o impacto de novos pesos em toda a base histórica.
 */
export function simulateScoreImpact(
  sampleDrivers: string[],
  historyRecords: CarrierOperationalRecord[],
  evaluations: CarrierEvaluationRecord[],
  complaints: CarrierComplaintRecord[],
  compliments: CarrierComplimentRecord[],
  currentRule: ScoreRuleVersion,
  candidateRule: ScoreRuleVersion,
): {
  drivers_improved: number
  drivers_reduced: number
  drivers_unchanged: number
  total_evaluated: number
  sampleImpacts: Array<{
    driverName: string
    currentScore: number
    simulatedScore: number
    delta: number
    mainFactor: string
  }>
} {
  let improved = 0
  let reduced = 0
  let unchanged = 0

  const sampleImpacts = sampleDrivers.map((driverName) => {
    const cur = calculateGovernedScore(
      driverName,
      'MOTORISTA',
      historyRecords,
      evaluations,
      complaints,
      compliments,
      currentRule,
    )
    const sim = calculateGovernedScore(
      driverName,
      'MOTORISTA',
      historyRecords,
      evaluations,
      complaints,
      compliments,
      candidateRule,
    )
    const delta = sim.finalScore - cur.finalScore

    if (delta > 0) improved++
    else if (delta < 0) reduced++
    else unchanged++

    let mainFactor = 'Ponderações equilibradas'
    if (delta !== 0) {
      if (candidateRule.weights.servicesEvaluationPct > currentRule.weights.servicesEvaluationPct) {
        mainFactor = 'Maior peso em avaliação dos serviços'
      } else if (candidateRule.weights.punctualityPct > currentRule.weights.punctualityPct) {
        mainFactor = 'Maior rigor em pontualidade'
      } else if (
        candidateRule.weights.procedenteComplaintsPct > currentRule.weights.procedenteComplaintsPct
      ) {
        mainFactor = 'Aumento de peso em reclamações procedentes'
      }
    }

    return {
      driverName,
      currentScore: cur.finalScore,
      simulatedScore: sim.finalScore,
      delta,
      mainFactor,
    }
  })

  return {
    drivers_improved: improved,
    drivers_reduced: reduced,
    drivers_unchanged: unchanged,
    total_evaluated: sampleDrivers.length,
    sampleImpacts,
  }
}
