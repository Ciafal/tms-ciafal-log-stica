// TMS CIAFAL — Motor de Negociação Inteligente do Carlão & Elegibilidade
// Avaliação de Custo Sustentável, Faixa Inteligente, Ondas de Oferta e Explicabilidade

export interface SmartPriceBand {
  pisoAntt: number // Piso regulatório ANTT
  metaCiafal: number // Meta orçada CIAFAL
  referenciaMercado: number // Mediana / referência histórica da rota
  autonomiaMaximaCarlao: number // Teto máximo para IA negociar sem aprovação humana
  tetoOrcamentarioProtegido: number // Teto de segurança
}

export interface DriverEligibilityEvaluation {
  driverId: string
  driverName: string
  driverDocument?: string
  driverPhone?: string
  vehiclePlate?: string
  vehicleType?: string
  bodyType?: string
  capacityKg?: number
  currentStatus: string
  queueType: 'PORTA' | 'FORA' | 'PROGRAMADO'
  score: number // 0 a 100 (Elegibilidade Básica)
  scoreBreakdown: {
    statusDocScore: number // 0 a 20: Cadastro ativo, CNH válida
    capacityVehicleScore: number // 0 a 25: Aderência ao peso e tipo de carroceria
    proximityLocationScore: number // 0 a 20: PORTA (20), FORA <30km (15), FORA 30-60km (10)
    punctualityHistoryScore: number // 0 a 15: Histórico de pontualidade e zero cancelamentos
    routeExperienceScore: number // 0 a 10: Viagens prévias para a mesma região/cliente
    sustainableCostScore: number // 0 a 10: Índice de custo sustentável
  }
  isEligible: boolean
  rejectionReason?: string
  suggestedWave: 1 | 2 | 3
}

export interface SelectionCriteriaWeights {
  operationalCompatibilityPct: number // Padrão: 20
  historicalPerformancePct: number // Padrão: 15
  routeExperiencePct: number // Padrão: 10
  customerExperiencePct: number // Padrão: 10
  locationAvailabilityPct: number // Padrão: 10
  expectedCostPct: number // Padrão: 20
  punctualityPct: number // Padrão: 5
  occurrencesPct: number // Padrão: 5
  fredCollaborationPct: number // Padrão: 5
}

export const DEFAULT_SELECTION_WEIGHTS: SelectionCriteriaWeights = {
  operationalCompatibilityPct: 20,
  historicalPerformancePct: 15,
  routeExperiencePct: 10,
  customerExperiencePct: 10,
  locationAvailabilityPct: 10,
  expectedCostPct: 20,
  punctualityPct: 5,
  occurrencesPct: 5,
  fredCollaborationPct: 5,
}

export interface CargoDriverFitnessResult {
  driverId: string
  driverName: string
  driverDocument?: string
  driverPhone?: string
  vehiclePlate?: string
  vehicleType?: string
  isEligible: boolean
  isRecommended: boolean
  fitnessScore: number // 0 a 100: Score de Adequação à Carga
  subscores: {
    operationalCompatibility: number // 0-100
    historicalPerformance: number // 0-100
    routeExperience: number // 0-100
    customerExperience: number // 0-100
    locationAvailability: number // 0-100
    expectedCost: number // 0-100
    punctuality: number // 0-100
    occurrences: number // 0-100
    fredCollaboration: number // 0-100
  }
  pointsContribution: {
    operationalCompatibility: number
    historicalPerformance: number
    routeExperience: number
    customerExperience: number
    locationAvailability: number
    expectedCost: number
    punctuality: number
    occurrences: number
    fredCollaboration: number
    totalSum: number
  }
  expectedCostDetails: {
    nominalFreight: number
    pedagio: number
    occurrenceExpectedRiskCost: number
    totalExpectedCost: number
    confidenceLevel: 'ALTA' | 'MEDIA' | 'BAIXA' | 'INSUFICIENTE'
    costRangeMin: number
    costRangeMax: number
    sampleSize: number
    explanation: string
  }
  aiJustification: {
    headline: string
    reasons: string[]
    risks: string[]
    recommendationSummary: string
    statisticalConfidence: 'ALTA' | 'MEDIA' | 'BAIXA' | 'PROVISORIA'
  }
}

export interface NegotiationRound {
  roundNumber: number
  actor: 'CARLAO' | 'MOTORISTA' | 'HUMANO'
  proposedFreightValue: number
  pedagioValue: number
  totalValue: number
  notes?: string
  timestamp: string
  isAudio?: boolean
  audioTranscription?: string
}

export interface NegotiationSession {
  id?: string
  cargoId: string
  offerId?: string
  driverId: string
  driverName: string
  driverPhone?: string
  driverPlate?: string
  channel: 'WHATSAPP' | 'TELEGRAM' | 'WEB' | 'TOTEM' | 'MANUAL'
  channelStatus: string
  status:
    | 'OFERTADA'
    | 'EM_NEGOCIACAO'
    | 'CONTRATADO'
    | 'RECUSADO'
    | 'PAUSADO_HUMANO'
    | 'CANCELADO'
    | 'EXPIRADO'
  activeActor: 'CARLAO' | 'HUMANO' | 'MOTORISTA' | 'SISTEMA'
  humanTakeoverUser?: string
  humanTakeoverReason?: string
  humanTakeoverAt?: string
  handbackNotes?: string
  eligibilityScore: number
  scoreBreakdown?: any
  offerWave: number
  currentRound: number
  rounds: NegotiationRound[]
  priceBand: SmartPriceBand
  currentProposedFreight: number
  pedagioValue: number
  outrosCustosValue: number
  totalContractValue: number
  aiAutonomousCompletion: boolean
  explicabilidade: {
    piso: number
    meta: number
    referencia: number
    autonomia: number
    motivoDecisao: string
    confianca: string
  }
}

/**
 * Calcula a faixa inteligente de negociação parametrizável
 */
export function calculateSmartPriceBand(
  distanceKm: number,
  weightKg: number,
  anttFloorValue: number,
  historicalAvgValue?: number,
  spreadPct: number = 6.5,
): SmartPriceBand {
  const piso = Math.max(100, Math.round(anttFloorValue))
  const ref =
    historicalAvgValue && historicalAvgValue > piso ? historicalAvgValue : Math.round(piso * 1.08)

  const meta = Math.round(piso + (ref - piso) * 0.45)
  const maxAutonomia = Math.round(meta * (1 + spreadPct / 100))
  const tetoProtegido = Math.round(maxAutonomia * 1.08)

  return {
    pisoAntt: piso,
    metaCiafal: meta,
    referenciaMercado: ref,
    autonomiaMaximaCarlao: maxAutonomia,
    tetoOrcamentarioProtegido: tetoProtegido,
  }
}

/**
 * Avalia a elegibilidade completa de um motorista para uma carga
 */
export function evaluateDriverEligibility(
  driver: {
    id: string
    name: string
    document?: string
    phone?: string
    status?: string
    cnhValidity?: string
  },
  vehicle: {
    plate?: string
    type?: string
    bodyType?: string
    capacityKg?: number
  },
  queueEntry: {
    type?: 'PORTA' | 'FORA' | 'PROGRAMADO'
    status?: string
    distanceKm?: number
  },
  cargoReqs: {
    weightKg: number
    requiredVehicleType?: string
    destinationRegion?: string
  },
  historicalDriverData?: {
    punctualityPct?: number
    cancellationsCount?: number
    tripsInRegion?: number
    sustainableCostIndex?: number
  },
): DriverEligibilityEvaluation {
  // 1. Validação documental inicial
  const isDriverActive = driver.status === 'ativo' || !driver.status
  const isQueueValid =
    queueEntry.status === 'disponivel' || queueEntry.status === 'validacao' || !queueEntry.status

  if (!isDriverActive) {
    return {
      driverId: driver.id,
      driverName: driver.name,
      driverDocument: driver.document,
      driverPhone: driver.phone,
      vehiclePlate: vehicle.plate,
      vehicleType: vehicle.type,
      currentStatus: 'Bloqueado/Inativo',
      queueType: queueEntry.type || 'FORA',
      score: 0,
      scoreBreakdown: {
        statusDocScore: 0,
        capacityVehicleScore: 0,
        proximityLocationScore: 0,
        punctualityHistoryScore: 0,
        routeExperienceScore: 0,
        sustainableCostScore: 0,
      },
      isEligible: false,
      rejectionReason: 'Cadastro do motorista inativo ou bloqueado no sistema.',
      suggestedWave: 3,
    }
  }

  // 2. Pontuação Documental (max 20)
  const statusDocScore = 20

  // 3. Pontuação de Capacidade / Veículo (max 25)
  let capacityVehicleScore = 15
  const vehicleCap = vehicle.capacityKg || 27000
  if (vehicleCap >= cargoReqs.weightKg) {
    capacityVehicleScore = 25
  } else if (vehicleCap >= cargoReqs.weightKg * 0.9) {
    capacityVehicleScore = 18
  } else {
    capacityVehicleScore = 5
  }

  // 4. Proximidade / Tipo de Fila (max 20)
  let proximityLocationScore = 10
  const qType = queueEntry.type || 'FORA'
  if (qType === 'PORTA') {
    proximityLocationScore = 20
  } else if ((queueEntry.distanceKm || 0) <= 25) {
    proximityLocationScore = 16
  } else if ((queueEntry.distanceKm || 0) <= 60) {
    proximityLocationScore = 12
  } else {
    proximityLocationScore = 8
  }

  // 5. Histórico de Pontualidade & Cancelamento (max 15)
  const punctuality = historicalDriverData?.punctualityPct ?? 95
  const cancels = historicalDriverData?.cancellationsCount ?? 0
  let punctualityHistoryScore = 15
  if (cancels > 1) punctualityHistoryScore -= 6
  if (punctuality < 90) punctualityHistoryScore -= 4
  punctualityHistoryScore = Math.max(2, punctualityHistoryScore)

  // 6. Experiência na rota (max 10)
  const trips = historicalDriverData?.tripsInRegion ?? 5
  const routeExperienceScore = trips >= 5 ? 10 : trips >= 2 ? 7 : 4

  // 7. Custo Sustentável (max 10)
  const sci = historicalDriverData?.sustainableCostIndex ?? 92
  const sustainableCostScore = Math.round((sci / 100) * 10)

  const totalScore = Math.min(
    100,
    statusDocScore +
      capacityVehicleScore +
      proximityLocationScore +
      punctualityHistoryScore +
      routeExperienceScore +
      sustainableCostScore,
  )

  const isEligible = totalScore >= 60 && vehicleCap >= cargoReqs.weightKg * 0.85

  let suggestedWave: 1 | 2 | 3 = 1
  if (totalScore >= 88 && qType === 'PORTA') {
    suggestedWave = 1
  } else if (totalScore >= 75) {
    suggestedWave = 2
  } else {
    suggestedWave = 3
  }

  return {
    driverId: driver.id,
    driverName: driver.name,
    driverDocument: driver.document,
    driverPhone: driver.phone,
    vehiclePlate: vehicle.plate,
    vehicleType: vehicle.type,
    bodyType: vehicle.bodyType,
    capacityKg: vehicle.capacityKg,
    currentStatus: queueEntry.status || 'disponivel',
    queueType: qType,
    score: totalScore,
    scoreBreakdown: {
      statusDocScore,
      capacityVehicleScore,
      proximityLocationScore,
      punctualityHistoryScore,
      routeExperienceScore,
      sustainableCostScore,
    },
    isEligible,
    rejectionReason: !isEligible
      ? 'Pontuação de elegibilidade inferior à linha de corte ou veículo insuficiente.'
      : undefined,
    suggestedWave,
  }
}

/**
 * Processa uma rodada de contraproposta com o motor determinístico do Carlão
 */
export function processCarlaoRound(
  currentSession: NegotiationSession,
  driverCounterValue: number,
  notes?: string,
  isAudio?: boolean,
  audioTranscription?: string,
): {
  decision: 'ACCEPT' | 'COUNTER_PROPOSAL' | 'ESCALATE_HUMAN' | 'REJECT'
  carlaoProposedFreight: number
  pedagioValue: number
  totalProposed: number
  messageToDriver: string
  explainability: string
} {
  const band = currentSession.priceBand
  const round = currentSession.currentRound + 1
  const pedagio = currentSession.pedagioValue

  let decision: 'ACCEPT' | 'COUNTER_PROPOSAL' | 'ESCALATE_HUMAN' | 'REJECT' = 'COUNTER_PROPOSAL'
  let carlaoFreight = band.metaCiafal

  if (driverCounterValue <= band.metaCiafal) {
    decision = 'ACCEPT'
    carlaoFreight = driverCounterValue
  } else if (driverCounterValue <= band.autonomiaMaximaCarlao) {
    if (round === 1) {
      carlaoFreight = Math.round(band.metaCiafal + (driverCounterValue - band.metaCiafal) * 0.4)
      decision = 'COUNTER_PROPOSAL'
    } else if (round === 2) {
      carlaoFreight = Math.round(band.metaCiafal + (driverCounterValue - band.metaCiafal) * 0.75)
      decision = 'COUNTER_PROPOSAL'
    } else {
      carlaoFreight = Math.min(driverCounterValue, band.autonomiaMaximaCarlao)
      decision = 'ACCEPT'
    }
  } else {
    carlaoFreight = band.autonomiaMaximaCarlao
    decision = 'ESCALATE_HUMAN'
  }

  let message = ''
  if (decision === 'ACCEPT') {
    message = `Confirmando: Carga ${currentSession.cargoId} · Frete Líquido: R$ ${carlaoFreight.toLocaleString('pt-BR')} · Pedágio (separado): R$ ${pedagio.toLocaleString('pt-BR')} · Total: R$ ${(carlaoFreight + pedagio).toLocaleString('pt-BR')}. Posso confirmar a contratação?`
  } else if (decision === 'ESCALATE_HUMAN') {
    message = `Olá, ${currentSession.driverName}! Seu valor de R$ ${driverCounterValue.toLocaleString('pt-BR')} ultrapassa meu limite operacional direto. Nossa gerência de carga foi notificada e entrará em contato em instantes para aprovação de exceção.`
  } else {
    message = `Olá, ${currentSession.driverName}! Para viabilizarmos essa saída hoje, conseguimos avançar o Frete para R$ ${carlaoFreight.toLocaleString('pt-BR')}, além do Pedágio garantido de R$ ${pedagio.toLocaleString('pt-BR')}. Fica bom para você?`
  }

  const explain = `Piso ANTT R$ ${band.pisoAntt} · Meta R$ ${band.metaCiafal} · Mediana R$ ${band.referenciaMercado} · Autonomia Carlão até R$ ${band.autonomiaMaximaCarlao}. Decisão baseada no score do motorista (${currentSession.eligibilityScore}/100) e rodada ${round}.`

  return {
    decision,
    carlaoProposedFreight: carlaoFreight,
    pedagioValue: pedagio,
    totalProposed: carlaoFreight + pedagio,
    messageToDriver: message,
    explainability: explain,
  }
}

/**
 * Calcula o Índice de Custo Sustentável (Sustainable Cost Index)
 */
export function calculateSustainableCostIndex(params: {
  priceCompetitivenessPct: number // ex 95%
  punctualityPct: number // ex 98%
  reliabilityZeroCancellationsPct: number // ex 100%
  yardStayEfficiencyPct: number // ex 92%
  deliveryPerformancePct: number // ex 96%
  relationshipScore: number // 0 a 100
}): number {
  const weights = {
    price: 0.35,
    punctuality: 0.2,
    reliability: 0.2,
    yardStay: 0.1,
    delivery: 0.1,
    relationship: 0.05,
  }

  const score =
    params.priceCompetitivenessPct * weights.price +
    params.punctualityPct * weights.punctuality +
    params.reliabilityZeroCancellationsPct * weights.reliability +
    params.yardStayEfficiencyPct * weights.yardStay +
    params.deliveryPerformancePct * weights.delivery +
    params.relationshipScore * weights.relationship

  return Math.round(Math.min(100, Math.max(0, score)))
}

/**
 * Motor Multicritério de Score de Adequação à Carga
 * Combina 9 dimensões explicáveis e calcula o Custo Total Esperado (Preditivo).
 * Separa explicitamente "Elegível" de "Recomendado".
 */
export function calculateCargoDriverFitness(params: {
  driver: {
    id: string
    name: string
    document?: string
    phone?: string
    status?: string
  }
  vehicle: {
    plate?: string
    type?: string
    bodyType?: string
    capacityKg?: number
  }
  queueEntry: {
    type?: 'PORTA' | 'FORA' | 'PROGRAMADO'
    status?: string
    distanceKm?: number
  }
  cargo: {
    cargoId: string
    weightKg: number
    requiredVehicleType?: string
    itineraryCode?: string
    destinationCity?: string
    customerCode?: string
    customerName?: string
    targetFreight?: number
    anttFloorFreight?: number
  }
  performanceScore?: {
    score_consolidated?: number
    score_punctuality?: number
    score_route_adherence?: number
    score_communication?: number
    score_fred_collaboration?: number
    score_delivery_quality?: number
    trips_evaluated_count?: number
  }
  historicalStats?: {
    tripsInRoute?: number
    tripsWithCustomer?: number
    historicalAvgFreight?: number
    occurrencesAttributedCount?: number
    totalOccurrencesCost?: number
  }
  weights?: Partial<SelectionCriteriaWeights>
  templateCode?: string
}): CargoDriverFitnessResult {
  const w: SelectionCriteriaWeights = {
    operationalCompatibilityPct:
      params.weights?.operationalCompatibilityPct ??
      DEFAULT_SELECTION_WEIGHTS.operationalCompatibilityPct,
    historicalPerformancePct:
      params.weights?.historicalPerformancePct ??
      DEFAULT_SELECTION_WEIGHTS.historicalPerformancePct,
    routeExperiencePct:
      params.weights?.routeExperiencePct ?? DEFAULT_SELECTION_WEIGHTS.routeExperiencePct,
    customerExperiencePct:
      params.weights?.customerExperiencePct ?? DEFAULT_SELECTION_WEIGHTS.customerExperiencePct,
    locationAvailabilityPct:
      params.weights?.locationAvailabilityPct ?? DEFAULT_SELECTION_WEIGHTS.locationAvailabilityPct,
    expectedCostPct: params.weights?.expectedCostPct ?? DEFAULT_SELECTION_WEIGHTS.expectedCostPct,
    punctualityPct: params.weights?.punctualityPct ?? DEFAULT_SELECTION_WEIGHTS.punctualityPct,
    occurrencesPct: params.weights?.occurrencesPct ?? DEFAULT_SELECTION_WEIGHTS.occurrencesPct,
    fredCollaborationPct:
      params.weights?.fredCollaborationPct ?? DEFAULT_SELECTION_WEIGHTS.fredCollaborationPct,
  }

  const driver = params.driver
  const vehicle = params.vehicle
  const queue = params.queueEntry
  const cargo = params.cargo
  const perf = params.performanceScore
  const stats = params.historicalStats

  // 1. Compatibilidade Operacional (0 a 100)
  const capKg = vehicle.capacityKg || 27000
  let subCompat = 100
  if (capKg < cargo.weightKg) {
    const diffPct = (cargo.weightKg - capKg) / cargo.weightKg
    subCompat = Math.max(0, Math.round(100 - diffPct * 150))
  }
  if (
    cargo.requiredVehicleType &&
    vehicle.type &&
    !vehicle.type.toLowerCase().includes(cargo.requiredVehicleType.toLowerCase().slice(0, 4))
  ) {
    subCompat = Math.max(20, subCompat - 30)
  }

  // 2. Performance Histórica (0 a 100)
  const subPerf = perf?.score_consolidated ?? 85

  // 3. Experiência na Rota (0 a 100)
  const routeTrips = stats?.tripsInRoute ?? 6
  let subRoute = 50
  if (routeTrips >= 15) subRoute = 100
  else if (routeTrips >= 8) subRoute = 88
  else if (routeTrips >= 3) subRoute = 75
  else if (routeTrips >= 1) subRoute = 60

  // 4. Experiência no Cliente (0 a 100)
  const custTrips = stats?.tripsWithCustomer ?? 4
  let subCustomer = 50
  if (custTrips >= 10) subCustomer = 100
  else if (custTrips >= 5) subCustomer = 85
  else if (custTrips >= 2) subCustomer = 70
  else if (custTrips >= 1) subCustomer = 60

  // 5. Disponibilidade e Localização (0 a 100)
  const qType = queue.type || 'FORA'
  const dist = queue.distanceKm || (qType === 'PORTA' ? 0 : 25)
  let subLoc = 70
  if (qType === 'PORTA') {
    subLoc = 100
  } else if (dist <= 15) {
    subLoc = 90
  } else if (dist <= 40) {
    subLoc = 75
  } else if (dist <= 80) {
    subLoc = 60
  } else {
    subLoc = 45
  }

  // 6. Custo Total Previsto / Competitividade (0 a 100)
  const targetFreight = cargo.targetFreight || 3200
  const histFreight = stats?.historicalAvgFreight || targetFreight
  let subCost = 80
  if (histFreight <= targetFreight * 0.95) subCost = 100
  else if (histFreight <= targetFreight) subCost = 90
  else if (histFreight <= targetFreight * 1.05) subCost = 75
  else if (histFreight <= targetFreight * 1.12) subCost = 60
  else subCost = 40

  // 7. Pontualidade (0 a 100)
  const subPunct = perf?.score_punctuality ?? 95

  // 8. Ocorrências Atribuídas (0 a 100)
  const occCount = stats?.occurrencesAttributedCount ?? 0
  let subOcc = 100
  if (occCount === 1) subOcc = 80
  else if (occCount === 2) subOcc = 60
  else if (occCount >= 3) subOcc = 30

  // 9. Colaboração com Fred (0 a 100)
  const subFred = perf?.score_fred_collaboration ?? 92

  // Cálculo da Contribuição Ponderada (Total 100 pts)
  const ptCompat = (subCompat * w.operationalCompatibilityPct) / 100
  const ptPerf = (subPerf * w.historicalPerformancePct) / 100
  const ptRoute = (subRoute * w.routeExperiencePct) / 100
  const ptCustomer = (subCustomer * w.customerExperiencePct) / 100
  const ptLoc = (subLoc * w.locationAvailabilityPct) / 100
  const ptCost = (subCost * w.expectedCostPct) / 100
  const ptPunct = (subPunct * w.punctualityPct) / 100
  const ptOcc = (subOcc * w.occurrencesPct) / 100
  const ptFred = (subFred * w.fredCollaborationPct) / 100

  const totalSum =
    ptCompat + ptPerf + ptRoute + ptCustomer + ptLoc + ptCost + ptPunct + ptOcc + ptFred
  const fitnessScore = Math.min(100, Math.max(0, Math.round(totalSum)))

  // Cálculo de Custo Total Esperado (Preditivo)
  const tripsCount = perf?.trips_evaluated_count ?? routeTrips + 3
  const pedagio = 428.4
  const probOccurrence = occCount > 0 ? Math.min(0.35, occCount / Math.max(1, tripsCount)) : 0.03
  const avgCostPerOcc =
    stats?.totalOccurrencesCost && occCount > 0 ? stats.totalOccurrencesCost / occCount : 450
  const occurrenceExpectedRiskCost = Math.round(probOccurrence * avgCostPerOcc)
  const totalExpectedCost = Math.round(histFreight + pedagio + occurrenceExpectedRiskCost)

  let costConf: 'ALTA' | 'MEDIA' | 'BAIXA' | 'INSUFICIENTE' = 'INSUFICIENTE'
  if (tripsCount >= 15) costConf = 'ALTA'
  else if (tripsCount >= 5) costConf = 'MEDIA'
  else if (tripsCount >= 2) costConf = 'BAIXA'

  const spread = costConf === 'ALTA' ? 0.04 : costConf === 'MEDIA' ? 0.08 : 0.15
  const costRangeMin = Math.round(totalExpectedCost * (1 - spread))
  const costRangeMax = Math.round(totalExpectedCost * (1 + spread))

  // Distinção Elegível x Recomendado
  const isDriverActive = driver.status !== 'bloqueado'
  const isEligible = isDriverActive && capKg >= cargo.weightKg * 0.85 && subCompat >= 40
  const isRecommended = isEligible && fitnessScore >= 75

  // Justificativa da IA
  const reasons: string[] = []
  const risks: string[] = []

  if (subCompat >= 90)
    reasons.push(
      `Veículo 100% compatível (${(capKg / 1000).toFixed(1)}t para ${(cargo.weightKg / 1000).toFixed(1)}t).`,
    )
  if (subPerf >= 90) reasons.push(`Score de performance consolidado elevado (${subPerf}/100).`)
  if (subRoute >= 85) reasons.push(`Alta familiaridade na rota (${routeTrips} viagens concluídas).`)
  if (subCustomer >= 85)
    reasons.push(`Histórico positivo e sem atritos com o cliente (${custTrips} entregas).`)
  if (qType === 'PORTA')
    reasons.push('Motorista presente no pátio da CIAFAL (PORTA), pronto para chamada.')
  else if (dist <= 25) reasons.push(`Localização estratégica próxima (${dist} km).`)

  if (subCost < 65) risks.push(`Valor histórico de frete acima da meta orçada CIAFAL.`)
  if (occCount > 1) risks.push(`Apresenta ${occCount} ocorrências atribuídas no histórico recente.`)
  if (tripsCount < 5)
    risks.push('Amostra estatística reduzida; previsão com margem de incerteza moderada.')

  const headline = isRecommended
    ? `Altamente Recomendado · Score de Adequação ${fitnessScore}/100 (${reasons[0] || 'Excelente perfil operacional'})`
    : isEligible
      ? `Elegível · Score ${fitnessScore}/100 (Atende requisitos mínimos com pontos de atenção)`
      : `Não Elegível (${isDriverActive ? 'Veículo insuficiente' : 'Cadastro bloqueado'})`

  return {
    driverId: driver.id,
    driverName: driver.name,
    driverDocument: driver.document,
    driverPhone: driver.phone,
    vehiclePlate: vehicle.plate,
    vehicleType: vehicle.type,
    isEligible,
    isRecommended,
    fitnessScore,
    subscores: {
      operationalCompatibility: subCompat,
      historicalPerformance: subPerf,
      routeExperience: subRoute,
      customerExperience: subCustomer,
      locationAvailability: subLoc,
      expectedCost: subCost,
      punctuality: subPunct,
      occurrences: subOcc,
      fredCollaboration: subFred,
    },
    pointsContribution: {
      operationalCompatibility: Math.round(ptCompat * 10) / 10,
      historicalPerformance: Math.round(ptPerf * 10) / 10,
      routeExperience: Math.round(ptRoute * 10) / 10,
      customerExperience: Math.round(ptCustomer * 10) / 10,
      locationAvailability: Math.round(ptLoc * 10) / 10,
      expectedCost: Math.round(ptCost * 10) / 10,
      punctuality: Math.round(ptPunct * 10) / 10,
      occurrences: Math.round(ptOcc * 10) / 10,
      fredCollaboration: Math.round(ptFred * 10) / 10,
      totalSum: Math.round(totalSum * 10) / 10,
    },
    expectedCostDetails: {
      nominalFreight: histFreight,
      pedagio,
      occurrenceExpectedRiskCost,
      totalExpectedCost,
      confidenceLevel: costConf,
      costRangeMin,
      costRangeMax,
      sampleSize: tripsCount,
      explanation:
        costConf === 'INSUFICIENTE'
          ? 'Amostra insuficiente para previsão de custo confiável (< 2 viagens).'
          : `Frete esperado R$ ${histFreight.toLocaleString('pt-BR')} + Pedágio R$ ${pedagio.toLocaleString('pt-BR')} + Risco de ocorrência R$ ${occurrenceExpectedRiskCost.toLocaleString('pt-BR')} (Confiança ${costConf}).`,
    },
    aiJustification: {
      headline,
      reasons,
      risks,
      recommendationSummary: `Adequação ${fitnessScore}/100 · Contribuição principal: Custo (${ptCost.toFixed(1)} pts) + Compatibilidade (${ptCompat.toFixed(1)} pts) + Performance (${ptPerf.toFixed(1)} pts).`,
      statisticalConfidence: tripsCount >= 20 ? 'ALTA' : tripsCount >= 5 ? 'MEDIA' : 'PROVISORIA',
    },
  }
}
