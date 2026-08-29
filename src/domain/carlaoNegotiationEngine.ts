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
  score: number // 0 a 100
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
