// TMS CIAFAL — Motor de Regras de Gestão de Performance e Experiência dos Motoristas
// Princípio Fundamental: Avaliação Tripla (Motorista + CIAFAL + Operação/Cliente)
// Princípio de Responsabilidade: Causa x Fato x Responsabilidade (Não punitivo, explicável)

export type DriverClassification =
  | 'EXCELENTE'
  | 'MUITO_BOM'
  | 'ADEQUADO'
  | 'ATENCAO'
  | 'NECESSITA_AVALIACAO'

export type OperationalStatus =
  | 'ATIVO'
  | 'PREFERENCIAL'
  | 'EM_OBSERVACAO'
  | 'SUSPENSO'
  | 'BLOQUEADO'
  | 'INATIVO'

export type ConfidenceLevel =
  | 'PROVISORIO_AMOSTRA_INSUFICIENTE'
  | 'CONFIANCA_MODERADA'
  | 'SCORE_CONSOLIDADO'

export type PrimaryResponsibleActor =
  | 'MOTORISTA'
  | 'TRANSPORTADORA'
  | 'CIAFAL'
  | 'EXPEDICAO_CIAFAL'
  | 'FATURAMENTO'
  | 'COMERCIAL'
  | 'PCP'
  | 'TMS_PLANEJAMENTO'
  | 'CLIENTE'
  | 'FORNECEDOR_TERCEIRO'
  | 'RODOVIA_TRANSITO'
  | 'FORCA_MAIOR'
  | 'COMPARTILHADA'
  | 'NAO_IDENTIFICADA'

export type AiConfidenceLevel = 'ALTA' | 'MEDIA' | 'BAIXA'

export interface PerformanceWeights {
  punctualityPct: number // Padrão: 20
  routeAdherencePct: number // Padrão: 15
  communicationPct: number // Padrão: 15
  fredCollaborationPct: number // Padrão: 10
  deliveryQualityPct: number // Padrão: 15
  procedureDocPct: number // Padrão: 10
  humanEvaluationsPct: number // Padrão: 15
}

export const DEFAULT_PERFORMANCE_WEIGHTS: PerformanceWeights = {
  punctualityPct: 20,
  routeAdherencePct: 15,
  communicationPct: 15,
  fredCollaborationPct: 10,
  deliveryQualityPct: 15,
  procedureDocPct: 10,
  humanEvaluationsPct: 15,
}

export interface DriverPerformanceScoreEntity {
  id: string
  driver_id: string
  driver_name: string
  driver_document?: string
  driver_phone?: string
  carrier_name?: string
  score_consolidated: number // 0 a 100
  score_objective: number // 0 a 100
  score_evaluative: number // 0 a 100
  stars_rating: number // 1.0 a 5.0
  classification: DriverClassification
  operational_status: OperationalStatus
  confidence_level: ConfidenceLevel
  trips_evaluated_count: number
  last_transport_sap?: string
  last_evaluation_date?: string
  score_punctuality: number
  score_route_adherence: number
  score_communication: number
  score_fred_collaboration: number
  score_delivery_quality: number
  score_procedure_doc: number
  score_human_evaluations: number
  ciafal_experience_score?: number
  driver_nps_rating?: number
  formula_model_version?: string
  parameters_used_json?: string | Record<string, unknown>
  weights_applied_json?: string | Record<string, unknown>
  explicability_json?: string | Record<string, unknown>
  monthly_trend_json?: string | Array<{ month: string; score: number; trips: number }>
  badges_recognition_json?:
    | string
    | Array<{ id: string; name: string; icon: string; category: string }>
  status_audit_log_json?: string | Array<Record<string, unknown>>
  created?: string
  updated?: string
}

export interface DriverCiafalSurveyEntity {
  id: string
  sap_transport_number: string
  driver_id: string
  driver_name: string
  carrier_name?: string
  origin_plant?: string
  expedition_shift?: string
  cargo_type?: string
  rating_arrival_reception: number // 1-5
  rating_waiting_time: number // 1-5
  rating_loading_process: number // 1-5
  rating_info_clarity: number // 1-5
  rating_invoicing_doc: number // 1-5
  rating_trip_communication: number // 1-5
  rating_fred_experience: number // 1-5
  rating_overall_ciafal: number // 1-5
  score_calculated_pct: number // 0-100
  nps_recommendation_score: number // 0-10
  nps_category: 'PROMOTOR' | 'NEUTRO' | 'DETRATOR'
  feedback_text?: string
  audio_file_url?: string
  audio_transcription?: string
  ai_sentiment?: string
  expedition_dwell_time_min?: number
  fact_consistency_status?: string
  fact_consistency_explanation?: string
  created?: string
  updated?: string
}

export interface CustomerLogisticProfileEntity {
  id: string
  customer_code: string
  customer_name: string
  customer_city?: string
  customer_uf?: string
  sales_rep?: string
  customer_tier?: string
  logistic_score: number
  stars_rating: number
  logistic_classification: 'EXCELENTE' | 'BOM' | 'REGULAR' | 'CRITICO_REQUER_NEGOCIACAO'
  deliveries_analyzed_count: number
  avg_waiting_time_min: number
  avg_unloading_time_min: number
  p90_unloading_time_min: number
  window_compliance_rate_pct: number
  occurrences_rate_pct: number
  avg_driver_rating: number
  recurring_issues_json?: string | string[]
  ai_recommendations?: string
  financial_impact_notes?: string
  best_matched_drivers_json?: string | Array<{ driverName: string; reason: string }>
  is_confidential_internal: boolean
  created?: string
  updated?: string
}

export interface PerformanceResponsibilityMatrixEntity {
  id: string
  occurrence_code: string
  sap_transport_number: string
  driver_id?: string
  driver_name?: string
  customer_code?: string
  customer_name?: string
  category: string
  description: string
  primary_responsible: PrimaryResponsibleActor
  contributing_actors_json?: string | string[]
  root_cause_explanation?: string
  evidence_ids_json?: string | string[]
  total_impact_minutes: number
  minutes_driver_imputable: number
  minutes_ciafal_imputable: number
  minutes_client_imputable: number
  minutes_external_imputable: number
  driver_score_penalty_points: number
  ai_hypothesis?: string
  ai_confidence_level: AiConfidenceLevel
  ai_confidence_pct?: number
  ai_next_recommended_action?: string
  driver_justification_status?: string
  driver_justification_text?: string
  driver_justification_audio_url?: string
  is_human_verified: boolean
  verified_by_user?: string
  verified_at?: string
  verification_notes?: string
  created?: string
  updated?: string
}

export interface PerformanceAuditLedgerEntity {
  id: string
  driver_id: string
  driver_name: string
  transport_sap?: string
  event_type: string
  score_before: number
  score_after: number
  formula_version_used?: string
  weights_snapshot_json?: string | Record<string, unknown>
  included_events_json?: string | string[]
  discarded_events_json?: string | string[]
  justifications_applied_json?: string | string[]
  user_email?: string
  user_name?: string
  human_notes?: string
  created?: string
  updated?: string
}

// -------------------------------------------------------------------------
// 1. CÁLCULO DAS 7 DIMENSÕES E CONSOLIDAÇÃO DO SCORE DO MOTORISTA
// -------------------------------------------------------------------------

export interface CalculateDriverScoreInput {
  subscores: {
    punctuality: number // 0-100 (apenas atraso imputável ao motorista)
    routeAdherence: number // 0-100 (desvios não justificados)
    communication: number // 0-100 (qualidade, aviso prévio, proatividade)
    fredCollaboration: number // 0-100 (resposta a solicitações, fotos, áudios)
    deliveryQuality: number // 0-100 (comprovantes legíveis, integridade)
    procedureDoc: number // 0-100 (documentos e procedimentos)
    humanEvaluations: number // 0-100 (avaliações humanas qualificadas)
  }
  weights?: Partial<PerformanceWeights>
  tripsCount: number
  occurrencesAnalysis?: {
    totalOccurrences: number
    driverImputableCount: number
    discardedCount: number
    explanations: string[]
  }
  modelVersion?: string
}

export interface CalculateDriverScoreResult {
  scoreConsolidated: number
  scoreObjective: number
  scoreEvaluative: number
  starsRating: number
  classification: DriverClassification
  confidenceLevel: ConfidenceLevel
  calculationExplanation: {
    punctualityTerm: number
    routeAdherenceTerm: number
    communicationTerm: number
    fredCollaborationTerm: number
    deliveryQualityTerm: number
    procedureDocTerm: number
    humanEvaluationsTerm: number
    weightedSum: number
    stepByStepText: string[]
  }
}

/**
 * Motor Determinístico de Performance do Motorista
 * Respeita pesos configuráveis e gera a explicabilidade aberta do cálculo.
 */
export function calculateDriverPerformanceScore(
  input: CalculateDriverScoreInput,
): CalculateDriverScoreResult {
  const w: PerformanceWeights = {
    punctualityPct: input.weights?.punctualityPct ?? DEFAULT_PERFORMANCE_WEIGHTS.punctualityPct,
    routeAdherencePct:
      input.weights?.routeAdherencePct ?? DEFAULT_PERFORMANCE_WEIGHTS.routeAdherencePct,
    communicationPct:
      input.weights?.communicationPct ?? DEFAULT_PERFORMANCE_WEIGHTS.communicationPct,
    fredCollaborationPct:
      input.weights?.fredCollaborationPct ?? DEFAULT_PERFORMANCE_WEIGHTS.fredCollaborationPct,
    deliveryQualityPct:
      input.weights?.deliveryQualityPct ?? DEFAULT_PERFORMANCE_WEIGHTS.deliveryQualityPct,
    procedureDocPct: input.weights?.procedureDocPct ?? DEFAULT_PERFORMANCE_WEIGHTS.procedureDocPct,
    humanEvaluationsPct:
      input.weights?.humanEvaluationsPct ?? DEFAULT_PERFORMANCE_WEIGHTS.humanEvaluationsPct,
  }

  const {
    punctuality,
    routeAdherence,
    communication,
    fredCollaboration,
    deliveryQuality,
    procedureDoc,
    humanEvaluations,
  } = input.subscores

  // 1. Termos ponderados
  const punctualityTerm = (punctuality * w.punctualityPct) / 100
  const routeAdherenceTerm = (routeAdherence * w.routeAdherencePct) / 100
  const communicationTerm = (communication * w.communicationPct) / 100
  const fredCollaborationTerm = (fredCollaboration * w.fredCollaborationPct) / 100
  const deliveryQualityTerm = (deliveryQuality * w.deliveryQualityPct) / 100
  const procedureDocTerm = (procedureDoc * w.procedureDocPct) / 100
  const humanEvaluationsTerm = (humanEvaluations * w.humanEvaluationsPct) / 100

  const weightedSum =
    punctualityTerm +
    routeAdherenceTerm +
    communicationTerm +
    fredCollaborationTerm +
    deliveryQualityTerm +
    procedureDocTerm +
    humanEvaluationsTerm

  const scoreConsolidated = Math.min(100, Math.max(0, Math.round(weightedSum)))

  // Score Objetivo (dados operacionais das 6 primeiras dimensões normalizadas para 100%)
  const objectiveWeightSum = 100 - w.humanEvaluationsPct
  const scoreObjective =
    objectiveWeightSum > 0
      ? Math.round(
          ((punctualityTerm +
            routeAdherenceTerm +
            communicationTerm +
            fredCollaborationTerm +
            deliveryQualityTerm +
            procedureDocTerm) /
            objectiveWeightSum) *
            100,
        )
      : scoreConsolidated

  // Score Avaliativo Humano
  const scoreEvaluative = Math.round(humanEvaluations)

  // 2. Estrelas (0 a 100 -> 1.0 a 5.0)
  const starsRating = Number(Math.max(1, scoreConsolidated / 20).toFixed(1))

  // 3. Faixas de Classificação
  let classification: DriverClassification = 'NECESSITA_AVALIACAO'
  if (scoreConsolidated >= 90) {
    classification = 'EXCELENTE'
  } else if (scoreConsolidated >= 80) {
    classification = 'MUITO_BOM'
  } else if (scoreConsolidated >= 70) {
    classification = 'ADEQUADO'
  } else if (scoreConsolidated >= 60) {
    classification = 'ATENCAO'
  }

  // 4. Confiabilidade Estatística / Amostra Mínima
  let confidenceLevel: ConfidenceLevel = 'PROVISORIO_AMOSTRA_INSUFICIENTE'
  if (input.tripsCount >= 20) {
    confidenceLevel = 'SCORE_CONSOLIDADO'
  } else if (input.tripsCount >= 5) {
    confidenceLevel = 'CONFIANCA_MODERADA'
  }

  const stepByStepText = [
    `Pontualidade Atribuível: ${punctuality}/100 × ${w.punctualityPct}% = ${punctualityTerm.toFixed(1)} pts`,
    `Cumprimento de Rota: ${routeAdherence}/100 × ${w.routeAdherencePct}% = ${routeAdherenceTerm.toFixed(1)} pts`,
    `Comunicação Qualificada: ${communication}/100 × ${w.communicationPct}% = ${communicationTerm.toFixed(1)} pts`,
    `Colaboração com Fred: ${fredCollaboration}/100 × ${w.fredCollaborationPct}% = ${fredCollaborationTerm.toFixed(1)} pts`,
    `Qualidade da Entrega: ${deliveryQuality}/100 × ${w.deliveryQualityPct}% = ${deliveryQualityTerm.toFixed(1)} pts`,
    `Procedimentos e Documentação: ${procedureDoc}/100 × ${w.procedureDocPct}% = ${procedureDocTerm.toFixed(1)} pts`,
    `Avaliações Humanas: ${humanEvaluations}/100 × ${w.humanEvaluationsPct}% = ${humanEvaluationsTerm.toFixed(1)} pts`,
    `Total Ponderado: ${weightedSum.toFixed(1)} → Score Consolidado: ${scoreConsolidated}/100`,
  ]

  return {
    scoreConsolidated,
    scoreObjective,
    scoreEvaluative,
    starsRating,
    classification,
    confidenceLevel,
    calculationExplanation: {
      punctualityTerm,
      routeAdherenceTerm,
      communicationTerm,
      fredCollaborationTerm,
      deliveryQualityTerm,
      procedureDocTerm,
      humanEvaluationsTerm,
      weightedSum,
      stepByStepText,
    },
  }
}

// -------------------------------------------------------------------------
// 2. MATRIZ DE RESPONSABILIDADE & DECOMPOSIÇÃO DE ATRASO
// -------------------------------------------------------------------------

export interface DecomposeDelayInput {
  totalDelayMinutes: number
  events: Array<{
    actor: PrimaryResponsibleActor
    minutes: number
    description: string
    isAuthorizedOrForceMajeure?: boolean
    hasEvidence?: boolean
  }>
}

export interface DelayDecompositionResult {
  totalMinutes: number
  driverImputableMinutes: number
  ciafalImputableMinutes: number
  clientImputableMinutes: number
  externalImputableMinutes: number
  driverPenaltyPoints: number
  driverPunctualitySubscore: number // 0 a 100
  auditBreakdown: Array<{ actor: string; minutes: number; impactsDriver: boolean }>
}

/**
 * Aplica o Princípio de Responsabilidade:
 * Uma ocorrência só afeta negativamente o score do motorista quando houver evidência suficiente de responsabilidade.
 */
export function decomposeDelayAndCalculateImputability(
  input: DecomposeDelayInput,
): DelayDecompositionResult {
  let driverMins = 0
  let ciafalMins = 0
  let clientMins = 0
  let externalMins = 0

  const auditBreakdown: Array<{ actor: string; minutes: number; impactsDriver: boolean }> = []

  for (const ev of input.events) {
    if (ev.actor === 'MOTORISTA') {
      if (ev.isAuthorizedOrForceMajeure) {
        externalMins += ev.minutes
        auditBreakdown.push({
          actor: 'MOTORISTA (Desvio Autorizado / Força Maior)',
          minutes: ev.minutes,
          impactsDriver: false,
        })
      } else {
        driverMins += ev.minutes
        auditBreakdown.push({ actor: 'MOTORISTA', minutes: ev.minutes, impactsDriver: true })
      }
    } else if (
      ev.actor === 'CIAFAL' ||
      ev.actor === 'EXPEDICAO_CIAFAL' ||
      ev.actor === 'FATURAMENTO' ||
      ev.actor === 'PCP' ||
      ev.actor === 'COMERCIAL' ||
      ev.actor === 'TMS_PLANEJAMENTO'
    ) {
      ciafalMins += ev.minutes
      auditBreakdown.push({
        actor: `CIAFAL (${ev.actor})`,
        minutes: ev.minutes,
        impactsDriver: false,
      })
    } else if (ev.actor === 'CLIENTE') {
      clientMins += ev.minutes
      auditBreakdown.push({ actor: 'CLIENTE', minutes: ev.minutes, impactsDriver: false })
    } else {
      externalMins += ev.minutes
      auditBreakdown.push({
        actor: `EXTERNO (${ev.actor})`,
        minutes: ev.minutes,
        impactsDriver: false,
      })
    }
  }

  // Penalidade de pontualidade: apenas sobre os minutos imputáveis ao motorista
  // 0-10m: 100, 11-30m: 85, 31-60m: 70, >60m: 50
  let driverPunctualitySubscore = 100
  let driverPenaltyPoints = 0

  if (driverMins > 60) {
    driverPenaltyPoints = 15
    driverPunctualitySubscore = 50
  } else if (driverMins > 30) {
    driverPenaltyPoints = 8
    driverPunctualitySubscore = 70
  } else if (driverMins > 10) {
    driverPenaltyPoints = 4
    driverPunctualitySubscore = 85
  }

  return {
    totalMinutes: input.totalDelayMinutes,
    driverImputableMinutes: driverMins,
    ciafalImputableMinutes: ciafalMins,
    clientImputableMinutes: clientMins,
    externalImputableMinutes: externalMins,
    driverPenaltyPoints,
    driverPunctualitySubscore,
    auditBreakdown,
  }
}

// -------------------------------------------------------------------------
// 3. ANÁLISE CRUZADA DE EXPERIÊNCIA CIAFAL × MOTORISTA (MATRIZ 4 QUADRANTES)
// -------------------------------------------------------------------------

export type ExperienceMatrixQuadrant =
  | 'CASO_A_EXCELENTE_INSATISFEITO'
  | 'CASO_B_MOTORISTA_DESENVOLVER'
  | 'CASO_C_PARCERIA_SAUDAVEL'
  | 'CASO_D_RELACAO_PROBLEMATICA'

export interface CrossExperienceAnalysisResult {
  quadrant: ExperienceMatrixQuadrant
  quadrantTitle: string
  driverScore: number
  ciafalExpScore: number
  aiDiagnosis: string
  priorityAction: string
  badgeVariant: string
}

/**
 * Cruza o Score de Performance do Motorista com o Score de Experiência com a CIAFAL
 */
export function analyzeCrossExperienceMatrix(
  driverScore: number,
  ciafalExpScore: number,
): CrossExperienceAnalysisResult {
  if (driverScore >= 80 && ciafalExpScore < 60) {
    return {
      quadrant: 'CASO_A_EXCELENTE_INSATISFEITO',
      quadrantTitle: 'Excelente Parceiro Insatisfeito',
      driverScore,
      ciafalExpScore,
      aiDiagnosis:
        'Motorista de alta performance (score > 80), mas com baixa satisfação com a CIAFAL (< 60). Risco alto de perda do parceiro por gargalos internos na expedição ou faturamento.',
      priorityAction:
        'PRIORIDADE MÁXIMA: Gestor de Logística contatar o motorista e investigar tempos de espera e docas.',
      badgeVariant: 'bg-rose-500 text-white',
    }
  }

  if (driverScore < 70 && ciafalExpScore >= 80) {
    return {
      quadrant: 'CASO_B_MOTORISTA_DESENVOLVER',
      quadrantTitle: 'Alta Satisfação com Necessidade de Desenvolvimento',
      driverScore,
      ciafalExpScore,
      aiDiagnosis:
        'Motorista valoriza muito a CIAFAL (avaliação > 80), porém apresenta desvios operacionais ou atrasos recorrentes.',
      priorityAction:
        'Ação de Capacitação: Orientar sobre uso do Fred, envio antecipado de comprovantes e rotas otimizadas.',
      badgeVariant: 'bg-amber-500 text-white',
    }
  }

  if (driverScore >= 80 && ciafalExpScore >= 80) {
    return {
      quadrant: 'CASO_C_PARCERIA_SAUDAVEL',
      quadrantTitle: 'Parceria Saudável e de Alta Confiança',
      driverScore,
      ciafalExpScore,
      aiDiagnosis:
        'Relação equilibrada e virtuosa de mão dupla. Motorista com alta entrega e satisfeito com o atendimento CIAFAL.',
      priorityAction:
        'Manter em lista de Motoristas Preferenciais (⭐) para cargas de alto valor e janelas críticas.',
      badgeVariant: 'bg-emerald-600 text-white',
    }
  }

  return {
    quadrant: 'CASO_D_RELACAO_PROBLEMATICA',
    quadrantTitle: 'Relação Problemática Bilateral',
    driverScore,
    ciafalExpScore,
    aiDiagnosis:
      'Baixo desempenho operacional e baixa satisfação mútua. Indício de atrito estrutural de processo.',
    priorityAction:
      'Reunião de alinhamento com a transportadora parceira antes de novas alocações.',
    badgeVariant: 'bg-slate-700 text-white',
  }
}

// -------------------------------------------------------------------------
// 4. VALIDAÇÃO DE OPINIÃO CONTRA FATOS DA EXPEDIÇÃO
// -------------------------------------------------------------------------

export interface ValidateSurveyAgainstFactsResult {
  status: 'Consistente com os dados observados' | 'Abaixo do esperado' | 'Acima do esperado'
  explanation: string
  measuredDwellMinutes: number
}

/**
 * Valida a avaliação de permanência do motorista contra os marcos temporais da expedição
 */
export function validateSurveyAgainstFacts(
  ratingWaitingTime: number, // 1 a 5
  dwellTimeMinutes: number, // tempo total real
  targetMinutes = 120, // meta padrão de 2h
): ValidateSurveyAgainstFactsResult {
  if (ratingWaitingTime <= 2) {
    if (dwellTimeMinutes > targetMinutes * 1.25) {
      return {
        status: 'Consistente com os dados observados',
        explanation: `Tempo de permanência real foi de ${Math.round(dwellTimeMinutes)} min (acima da meta de ${targetMinutes} min). Crítica do motorista é fundamentada nos fatos registrados.`,
        measuredDwellMinutes: dwellTimeMinutes,
      }
    } else {
      return {
        status: 'Abaixo do esperado',
        explanation: `Tempo de permanência registrado foi de ${Math.round(dwellTimeMinutes)} min (dentro da meta). A nota baixa pode indicar outro motivo qualitativo (atendimento, comunicação ou fila externa).`,
        measuredDwellMinutes: dwellTimeMinutes,
      }
    }
  }

  if (ratingWaitingTime >= 4) {
    if (dwellTimeMinutes <= targetMinutes) {
      return {
        status: 'Consistente com os dados observados',
        explanation: `Tempo de pátio rápido (${Math.round(dwellTimeMinutes)} min). Nota positiva condizente com a eficiência da expedição.`,
        measuredDwellMinutes: dwellTimeMinutes,
      }
    } else {
      return {
        status: 'Acima do esperado',
        explanation: `O tempo de permanência foi de ${Math.round(dwellTimeMinutes)} min, mas o motorista avaliou positivamente (bom atendimento da equipe compensou a espera).`,
        measuredDwellMinutes: dwellTimeMinutes,
      }
    }
  }

  return {
    status: 'Consistente com os dados observados',
    explanation: `Avaliação intermediária compatível com a operação regular (${Math.round(dwellTimeMinutes)} min registrados).`,
    measuredDwellMinutes: dwellTimeMinutes,
  }
}

// -------------------------------------------------------------------------
// 5. CÁLCULO DE NPS DO MOTORISTA
// -------------------------------------------------------------------------

export interface CalculateNpsResult {
  npsScore: number // -100 a +100
  promotersCount: number
  neutralsCount: number
  detractorsCount: number
  totalSurveys: number
  zone: 'EXCELENCIA' | 'QUALIDADE' | 'APERFEICOAMENTO' | 'CRITICA'
}

export function calculateDriverNps(ratings: number[]): CalculateNpsResult {
  if (!ratings || ratings.length === 0) {
    return {
      npsScore: 0,
      promotersCount: 0,
      neutralsCount: 0,
      detractorsCount: 0,
      totalSurveys: 0,
      zone: 'APERFEICOAMENTO',
    }
  }

  let promoters = 0
  let neutrals = 0
  let detractors = 0

  for (const r of ratings) {
    if (r >= 9) promoters++
    else if (r >= 7) neutrals++
    else detractors++
  }

  const total = ratings.length
  const npsScore = Math.round(((promoters - detractors) / total) * 100)

  let zone: CalculateNpsResult['zone'] = 'CRITICA'
  if (npsScore >= 75) zone = 'EXCELENCIA'
  else if (npsScore >= 50) zone = 'QUALIDADE'
  else if (npsScore >= 0) zone = 'APERFEICOAMENTO'

  return {
    npsScore,
    promotersCount: promoters,
    neutralsCount: neutrals,
    detractorsCount: detractors,
    totalSurveys: total,
    zone,
  }
}

// -------------------------------------------------------------------------
// 6. SCORE LOGÍSTICO DO CLIENTE (USO INTERNO TMS / CRM 360º)
// -------------------------------------------------------------------------

export interface CalculateCustomerLogisticScoreInput {
  avgWaitingTimeMin: number // meta ideal <= 30 min
  avgUnloadingTimeMin: number // meta ideal <= 60 min
  p90UnloadingTimeMin: number
  windowComplianceRatePct: number // meta >= 90%
  occurrencesRatePct: number // meta <= 5%
  avgDriverRating: number // 1 a 5
}

export interface CalculateCustomerLogisticScoreResult {
  logisticScore: number // 0 a 100
  starsRating: number
  classification: 'EXCELENTE' | 'BOM' | 'REGULAR' | 'CRITICO_REQUER_NEGOCIACAO'
  aiRecommendation: string
  internalWarningNotes: string
}

export interface DriverPersonalFeedbackData {
  driverId: string
  driverName: string
  scoreConsolidated: number // 0-100
  classification: DriverClassification
  starsRating: number
  punctualityPct: number
  cleanDeliveriesPct: number // % entregas sem ocorrência atribuída
  fredCollaborationPct: number
  tripsEvaluatedCount: number
  trend: 'POSITIVA_SUBINDO' | 'ESTAVEL' | 'REQUER_ATENCAO'
  topStrengths: Array<{ title: string; detail: string }>
  growthOpportunities: Array<{ title: string; suggestion: string }>
  recognitions: Array<{
    id: string
    title: string
    description: string
    icon: string
    achievedDate: string
  }>
  monthlyHistory: Array<{ month: string; score: number; trips: number }>
  fredConversationalText: string
}

export function generateDriverPersonalFeedback(
  scoreEntity: Partial<DriverPerformanceScoreEntity>,
  stats?: { cleanDeliveriesCount?: number; totalTrips?: number },
): DriverPersonalFeedbackData {
  const driverName = scoreEntity.driver_name || 'Motorista Parceiro'
  const score = scoreEntity.score_consolidated ?? 93
  const punct = scoreEntity.score_punctuality ?? 96
  const fredCollab = scoreEntity.score_fred_collaboration ?? 94
  const trips = scoreEntity.trips_evaluated_count ?? stats?.totalTrips ?? 28
  const cleanPct =
    stats?.cleanDeliveriesCount && stats?.totalTrips
      ? Math.round((stats.cleanDeliveriesCount / stats.totalTrips) * 100)
      : 96

  let classification: DriverClassification = 'EXCELENTE'
  if (score >= 90) classification = 'EXCELENTE'
  else if (score >= 80) classification = 'MUITO_BOM'
  else if (score >= 70) classification = 'ADEQUADO'
  else if (score >= 60) classification = 'ATENCAO'
  else classification = 'NECESSITA_AVALIACAO'

  const stars = Number(Math.max(1, score / 20).toFixed(1))

  // Pontos Fortes (máx 3)
  const topStrengths: Array<{ title: string; detail: string }> = []
  if (punct >= 90) {
    topStrengths.push({
      title: 'Pontualidade Exemplar',
      detail: `${punct}% das entregas realizadas estritamente no horário previsto da janela.`,
    })
  }
  if (cleanPct >= 90) {
    topStrengths.push({
      title: 'Viagens Sem Ocorrência',
      detail: `${cleanPct}% dos transportes entregues com integridade total e canhoto legível.`,
    })
  }
  if (fredCollab >= 85) {
    topStrengths.push({
      title: 'Colaboração com Fred',
      detail: `Alta taxa de resposta e compartilhamento proativo de status e fotos durante a rota.`,
    })
  }
  if (topStrengths.length < 3) {
    topStrengths.push({
      title: 'Experiência Acumulada',
      detail: `${trips} viagens completadas com a CIAFAL com alto índice de confiança.`,
    })
  }

  // Oportunidades de Melhoria (máx 3, tom não punitivo)
  const growthOpportunities: Array<{ title: string; suggestion: string }> = []
  if (scoreEntity.score_communication && scoreEntity.score_communication < 85) {
    growthOpportunities.push({
      title: 'Aviso Antecipado de Paradas',
      suggestion:
        'Sempre que houver fila ou retenção na rodovia, envie uma mensagem rápida ou áudio para o Fred. Isso ajusta o ETA do cliente e protege seu indicador.',
    })
  } else {
    growthOpportunities.push({
      title: 'Envio Imediato do Canhoto',
      suggestion:
        'Fotografar o comprovante assim que a descarga for finalizada agiliza a liberação do seu próximo frete na Mesa.',
    })
  }

  // Reconhecimentos Positivos
  const recognitions: Array<{
    id: string
    title: string
    description: string
    icon: string
    achievedDate: string
  }> = []
  if (trips >= 50) {
    recognitions.push({
      id: 'rec_50_trips',
      title: 'Marca de 50+ Viagens CIAFAL',
      description: 'Parceiro com mais de 50 transportes executados com sucesso.',
      icon: '🏆',
      achievedDate: '2025-01-15',
    })
  } else if (trips >= 20) {
    recognitions.push({
      id: 'rec_20_trips',
      title: 'Marca de 20+ Viagens',
      description: 'Constância e confiabilidade operacional comprovada.',
      icon: '🎖️',
      achievedDate: '2025-01-10',
    })
  }
  if (punct >= 95) {
    recognitions.push({
      id: 'rec_punct_star',
      title: 'Pontualidade 95%+',
      description: 'Destaque contínuo no cumprimento das janelas de descarga.',
      icon: '⭐',
      achievedDate: '2025-01-20',
    })
  }

  const fredConversationalText = `${driverName.split(' ')[0]}, considerando seus últimos ${trips} transportes com a CIAFAL: Score atual ${score}/100, Classificação ${classification.replace('_', ' ')}, Pontualidade ${punct}%, Entregas sem ocorrência ${cleanPct}%, Colaboração comigo ${fredCollab}%, Tendência estável. Seu principal ponto positivo é a ${topStrengths[0]?.title.toLowerCase() || 'qualidade da entrega'}. ${growthOpportunities[0]?.suggestion ? `Dica de melhoria: ${growthOpportunities[0].suggestion}` : ''}`

  const monthlyHistory = [
    { month: 'Set/24', score: Math.max(70, score - 3), trips: Math.max(2, Math.round(trips / 5)) },
    { month: 'Out/24', score: Math.max(70, score - 2), trips: Math.max(3, Math.round(trips / 4)) },
    { month: 'Nov/24', score: Math.max(70, score - 1), trips: Math.max(4, Math.round(trips / 3)) },
    { month: 'Dez/24', score: score, trips: Math.max(5, Math.round(trips / 2)) },
    { month: 'Jan/25', score: score, trips: Math.max(6, trips) },
  ]

  return {
    driverId: scoreEntity.driver_id || 'drv_01',
    driverName,
    scoreConsolidated: score,
    classification,
    starsRating: stars,
    punctualityPct: punct,
    cleanDeliveriesPct: cleanPct,
    fredCollaborationPct: fredCollab,
    tripsEvaluatedCount: trips,
    trend: 'ESTAVEL',
    topStrengths: topStrengths.slice(0, 3),
    growthOpportunities: growthOpportunities.slice(0, 3),
    recognitions,
    monthlyHistory,
    fredConversationalText,
  }
}

export function calculateCustomerLogisticScore(
  input: CalculateCustomerLogisticScoreInput,
): CalculateCustomerLogisticScoreResult {
  const {
    avgWaitingTimeMin,
    avgUnloadingTimeMin,
    windowComplianceRatePct,
    occurrencesRatePct,
    avgDriverRating,
  } = input

  // Dimensão Espera (peso 25%)
  const waitScore = Math.max(0, 100 - Math.max(0, avgWaitingTimeMin - 20) * 1.5)
  // Dimensão Descarga (peso 25%)
  const unloadScore = Math.max(0, 100 - Math.max(0, avgUnloadingTimeMin - 45) * 1.0)
  // Dimensão Janela (peso 20%)
  const windowScore = Math.min(100, windowComplianceRatePct)
  // Dimensão Ocorrências (peso 15%)
  const occScore = Math.max(0, 100 - occurrencesRatePct * 3)
  // Dimensão Avaliação dos Motoristas (peso 15%)
  const driverEvalScore = Math.min(100, avgDriverRating * 20)

  const score = Math.round(
    waitScore * 0.25 +
      unloadScore * 0.25 +
      windowScore * 0.2 +
      occScore * 0.15 +
      driverEvalScore * 0.15,
  )

  const starsRating = Number(Math.max(1, score / 20).toFixed(1))

  let classification: CalculateCustomerLogisticScoreResult['classification'] =
    'CRITICO_REQUER_NEGOCIACAO'
  let aiRecommendation = ''
  let internalWarningNotes = ''

  if (score >= 85) {
    classification = 'EXCELENTE'
    aiRecommendation =
      'Cliente de alta fluidez logística. Priorizar na programação de cargas com giros múltiplos.'
    internalWarningNotes = 'Excelente histórico operacional.'
  } else if (score >= 70) {
    classification = 'BOM'
    aiRecommendation = 'Operação regular. Manter monitoramento padrão de janelas de descarga.'
    internalWarningNotes = 'Pequenos desvios em horários de pico.'
  } else if (score >= 55) {
    classification = 'REGULAR'
    aiRecommendation =
      'Tempo de descarga acima da média (+40 min). Considerar acréscimo de R$ 150 a R$ 250 na formação do frete.'
    internalWarningNotes = 'Atenção: portaria com fila frequente.'
  } else {
    classification = 'CRITICO_REQUER_NEGOCIACAO'
    aiRecommendation =
      'Cliente crítico: média de espera/descarga gera impacto financeiro severo. Recomenda-se alinhamento comercial antes da próxima cotação.'
    internalWarningNotes =
      'Alto índice de paradas não programadas e recusas no recebimento vespertino.'
  }

  return {
    logisticScore: score,
    starsRating,
    classification,
    aiRecommendation,
    internalWarningNotes,
  }
}
