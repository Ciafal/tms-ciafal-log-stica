import { describe, it, expect } from 'vitest'
import {
  detectSmartAlerts,
  DEFAULT_ALERT_RULES,
  SmartAlertRuleConfig,
} from '@/domain/smartAlertsEngine'
import {
  validateWeightsSum,
  evaluateSampleConfidence,
  calculateGovernedScore,
  simulateScoreImpact,
  DEFAULT_SCORE_WEIGHTS,
  ScoreRuleVersion,
} from '@/domain/scoreGovernanceEngine'
import {
  calculateExecutiveCards,
  filterHistoricalTransports,
  generateAiExecutiveAnalysis,
} from '@/domain/executiveDashboardEngine'
import {
  CarrierOperationalRecord,
  CarrierEvaluationRecord,
  CarrierComplaintRecord,
  CarrierComplimentRecord,
  getDriverHiringSupport,
} from '@/domain/carrierHistoryEngine'

describe('Suíte Completa: Alertas Inteligentes, Governança de Score e Dashboard Executivo', () => {
  // Dados de teste mockados fiéis aos padrões de produção
  const sampleHistory: CarrierOperationalRecord[] = [
    {
      id: 'h1',
      transport_order_number: 'OT-9001',
      sap_transport_number: '9001',
      transport_date: '2026-02-01T10:00:00Z',
      driver_id: 'DRV-A',
      driver_name: 'Carlos Alberto Lima',
      vehicle_plate: 'ABC-1234',
      carrier_name: 'TransAço Ltda',
      itinerary_code: 'MG-SP-01',
      weight_ton: 30,
      loading_duration_min: 60,
      invoicing_duration_min: 20,
      total_internal_dwell_min: 100,
      route_estimated_min: 500,
      route_actual_min: 490,
      is_on_time: true,
      driver_rating: 5.0,
      final_status: 'CONCLUIDO',
    },
    {
      id: 'h2',
      transport_order_number: 'OT-9002',
      sap_transport_number: '9002',
      transport_date: '2026-02-05T10:00:00Z',
      driver_id: 'DRV-A',
      driver_name: 'Carlos Alberto Lima',
      vehicle_plate: 'ABC-1234',
      carrier_name: 'TransAço Ltda',
      itinerary_code: 'MG-SP-01',
      weight_ton: 32,
      loading_duration_min: 70,
      invoicing_duration_min: 30,
      total_internal_dwell_min: 120,
      route_estimated_min: 500,
      route_actual_min: 505,
      is_on_time: true,
      driver_rating: 4.8,
      final_status: 'CONCLUIDO',
    },
    {
      id: 'h3',
      transport_order_number: 'OT-9003',
      sap_transport_number: '9003',
      transport_date: '2026-02-10T10:00:00Z',
      driver_id: 'DRV-A',
      driver_name: 'Carlos Alberto Lima',
      vehicle_plate: 'ABC-1234',
      carrier_name: 'TransAço Ltda',
      itinerary_code: 'MG-SP-01',
      weight_ton: 28,
      loading_duration_min: 80,
      invoicing_duration_min: 30,
      total_internal_dwell_min: 140,
      route_estimated_min: 500,
      route_actual_min: 510,
      is_on_time: true,
      driver_rating: 4.9,
      final_status: 'CONCLUIDO',
    },
    {
      id: 'h4',
      transport_order_number: 'OT-9004',
      sap_transport_number: '9004',
      transport_date: '2026-02-15T10:00:00Z',
      driver_id: 'DRV-A',
      driver_name: 'Carlos Alberto Lima',
      vehicle_plate: 'ABC-1234',
      carrier_name: 'TransAço Ltda',
      itinerary_code: 'MG-SP-01',
      weight_ton: 31,
      loading_duration_min: 65,
      invoicing_duration_min: 25,
      total_internal_dwell_min: 110,
      route_estimated_min: 500,
      route_actual_min: 650, // Aumento de rota no mesmo itinerário
      is_on_time: false,
      delay_minutes: 150,
      driver_rating: 3.0, // Queda de avaliação
      final_status: 'CONCLUIDO',
    },
  ]

  const sampleRule: ScoreRuleVersion = {
    version_code: 'REG-TEST-v1',
    rule_name: 'Regra de Teste',
    lifecycle_status: 'VIGENTE',
    weights: DEFAULT_SCORE_WEIGHTS,
    target_coverage_pct: 80,
    min_transports_for_high_confidence: 15,
    min_transports_for_medium_confidence: 5,
    justification: 'Regra de teste unitário',
  }

  // -------------------------------------------------------------------------
  // PARTE 1: ALERTAS INTELIGENTES DETERMINÍSTICOS (10 TIPOS E ANTI-RUÍDO)
  // -------------------------------------------------------------------------

  it('1. Deve detectar alerta de QUEDA DE AVALIAÇÃO ao comparar histórico x recentes', () => {
    const alerts = detectSmartAlerts(sampleHistory, [], [], {
      ...DEFAULT_ALERT_RULES,
      ratingDropMinTransportsTotal: 4,
      ratingDropPercentageThreshold: 20,
    })
    const dropAlert = alerts.find((a) => a.alert_type === 'QUEDA_AVALIACAO')
    expect(dropAlert).toBeDefined()
    expect(dropAlert?.driver_name).toBe('Carlos Alberto Lima')
    expect(dropAlert?.evidence_summary).toContain('caiu')
  })

  it('2. Deve detectar alerta de QUANTIDADE DE RECLAMAÇÕES com 3 ocorrências no período', () => {
    const complaints: CarrierComplaintRecord[] = [
      { id: 'c1', complaint_number: 'REC-1', driver_name: 'Carlos Alberto Lima', target_type: 'MOTORISTA', category: 'ATRASO', severity: 'MEDIA', status: 'PROCEDENTE', origin_type: 'CLIENTE', description: 'Atraso na entrega' },
      { id: 'c2', complaint_number: 'REC-2', driver_name: 'Carlos Alberto Lima', target_type: 'MOTORISTA', category: 'ATRASO', severity: 'MEDIA', status: 'PROCEDENTE', origin_type: 'CLIENTE', description: 'Atraso na entrega' },
      { id: 'c3', complaint_number: 'REC-3', driver_name: 'Carlos Alberto Lima', target_type: 'MOTORISTA', category: 'COMUNICACAO', severity: 'BAIXA', status: 'EM_ANALISE', origin_type: 'EXPEDICAO', description: 'Sem comunicacao' },
    ]

    const alerts = detectSmartAlerts(sampleHistory, [], complaints, {
      ...DEFAULT_ALERT_RULES,
      complaintsThresholdCount: 3,
    })

    const complaintAlert = alerts.find((a) => a.alert_type === 'QTD_RECLAMACOES')
    expect(complaintAlert).toBeDefined()
    expect(complaintAlert?.current_value).toContain('3 reclamações acumuladas')
  })

  it('3. Deve detectar alerta de REINCIDÊNCIA DE CATEGORIA na repetição do mesmo problema', () => {
    const complaints: CarrierComplaintRecord[] = [
      { id: 'c1', complaint_number: 'REC-1', driver_name: 'Carlos Alberto Lima', target_type: 'MOTORISTA', category: 'COMUNICACAO', severity: 'MEDIA', status: 'PROCEDENTE', origin_type: 'CLIENTE', description: 'Falta de retorno' },
      { id: 'c2', complaint_number: 'REC-2', driver_name: 'Carlos Alberto Lima', target_type: 'MOTORISTA', category: 'COMUNICACAO', severity: 'MEDIA', status: 'PROCEDENTE', origin_type: 'CLIENTE', description: 'Falta de retorno' },
    ]

    const alerts = detectSmartAlerts(sampleHistory, [], complaints, {
      ...DEFAULT_ALERT_RULES,
      categoryRecurrenceThresholdCount: 2,
    })

    const catAlert = alerts.find((a) => a.alert_type === 'REINCIDENCIA_CATEGORIA')
    expect(catAlert).toBeDefined()
    expect(catAlert?.evidence_summary).toContain("categoria 'COMUNICACAO'")
  })

  it('4. Deve detectar alerta de QUEDA DE PONTUALIDADE relevante', () => {
    const alerts = detectSmartAlerts(sampleHistory, [], [], {
      ...DEFAULT_ALERT_RULES,
      punctualityDropMinTransports: 4,
      punctualityDropThresholdPct: 20,
    })

    const pontAlert = alerts.find((a) => a.alert_type === 'QUEDA_PONTUALIDADE')
    expect(pontAlert).toBeDefined()
    expect(pontAlert?.evidence_summary).toContain('Pontualidade recente caiu')
  })

  it('5. Deve comparar AUMENTO DO TEMPO DE ROTA SEMPRE no mesmo par Motorista + Itinerário', () => {
    const alerts = detectSmartAlerts(sampleHistory, [], [], {
      ...DEFAULT_ALERT_RULES,
      routeTimeIncreaseThresholdPct: 20,
    })

    const routeAlert = alerts.find((a) => a.alert_type === 'AUMENTO_TEMPO_ROTA')
    expect(routeAlert).toBeDefined()
    expect(routeAlert?.itinerary_code).toBe('MG-SP-01')
    expect(routeAlert?.evidence_summary).toContain('MESMO motorista no MESMO itinerário')
  })

  it('6. Deve emitir alerta de AUMENTO DO TEMPO INTERNO segregando causa sem culpar motorista', () => {
    const longDwellHistory: CarrierOperationalRecord[] = [
      {
        ...sampleHistory[0],
        transport_order_number: 'OT-LONG-DWELL',
        total_internal_dwell_min: 220,
        internal_responsibility_min: 180,
        carrier_responsibility_min: 40,
      },
    ]

    const alerts = detectSmartAlerts(longDwellHistory, [], [], {
      ...DEFAULT_ALERT_RULES,
      internalDwellThresholdMin: 180,
    })

    const internalAlert = alerts.find((a) => a.alert_type === 'AUMENTO_TEMPO_INTERNO')
    expect(internalAlert).toBeDefined()
    expect(internalAlert?.internal_external_origin).toBe('provavel_origem_interna')
    expect(internalAlert?.evidence_summary).toContain('provavel_origem_interna')
  })

  it('7. Deve alertar VEÍCULO COM REINCIDÊNCIA específico', () => {
    const vehComplaints: CarrierComplaintRecord[] = [
      { id: 'c1', complaint_number: 'REC-V1', vehicle_plate: 'ABC-1234', target_type: 'VEICULO', category: 'VEICULO', severity: 'MEDIA', status: 'PROCEDENTE', origin_type: 'EXPEDICAO', description: 'Problema na lona' },
      { id: 'c2', complaint_number: 'REC-V2', vehicle_plate: 'ABC-1234', target_type: 'VEICULO', category: 'VEICULO', severity: 'MEDIA', status: 'PROCEDENTE', origin_type: 'EXPEDICAO', description: 'Problema na amarracao' },
    ]

    const alerts = detectSmartAlerts(sampleHistory, [], vehComplaints, {
      ...DEFAULT_ALERT_RULES,
      vehicleRecurrenceThresholdCount: 2,
    })

    const vehAlert = alerts.find((a) => a.alert_type === 'VEICULO_REINCIDENCIA')
    expect(vehAlert).toBeDefined()
    expect(vehAlert?.vehicle_plate).toBe('ABC1234')
  })

  it('8. MOTORISTA NOVO deve emitir mensagem sem rotular risco sem dados', () => {
    const newDriverHistory: CarrierOperationalRecord[] = [
      {
        id: 'h-new',
        transport_order_number: 'OT-NEW',
        driver_name: 'Motorista Estreante',
        vehicle_plate: 'NEW-0001',
        transport_date: '2026-02-20T10:00:00Z',
        final_status: 'CONCLUIDO',
      },
    ]

    const alerts = detectSmartAlerts(newDriverHistory, [], [])
    const newDriverAlert = alerts.find((a) => a.alert_type === 'MOTORISTA_NOVO')
    expect(newDriverAlert).toBeDefined()
    expect(newDriverAlert?.evidence_summary).toBe('Motorista sem histórico suficiente para avaliação estatística.')
    expect(newDriverAlert?.severity).toBe('INFORMATIVO')
  })

  it('9. VEÍCULO NOVO deve emitir aviso cadastral sem dados suficientes', () => {
    const newVehHistory: CarrierOperationalRecord[] = [
      {
        id: 'h-vnew',
        transport_order_number: 'OT-VNEW',
        driver_name: 'Motorista Qualquer',
        vehicle_plate: 'NOVO-999',
        transport_date: '2026-02-20T10:00:00Z',
        final_status: 'CONCLUIDO',
      },
    ]

    const alerts = detectSmartAlerts(newVehHistory, [], [])
    const newVehAlert = alerts.find((a) => a.alert_type === 'VEICULO_NOVO')
    expect(newVehAlert).toBeDefined()
    expect(newVehAlert?.evidence_summary).toBe('Veículo sem histórico suficiente.')
  })

  it('10. DIVERGÊNCIA SCORE X COMPORTAMENTO RECENTE deve detectar anomalia pontual', () => {
    const alerts = detectSmartAlerts(sampleHistory, [], [])
    const divAlert = alerts.find((a) => a.alert_type === 'DIVERGENCIA_SCORE_COMPORTAMENTO')
    expect(divAlert).toBeDefined()
    expect(divAlert?.evidence_summary).toBe('Desempenho recente diverge do histórico consolidado.')
  })

  // -------------------------------------------------------------------------
  // PARTE 2: GOVERNANÇA, PESOS 100%, SIMULAÇÃO E SCORE EXPLICÁVEL
  // -------------------------------------------------------------------------

  it('11. Deve validar que os pesos DEVEM somar exatamente 100% e bloquear se menor ou maior', () => {
    // Caso 1: Soma correta 100%
    const valid = validateWeightsSum({
      servicesEvaluationPct: 30,
      punctualityPct: 20,
      procedenteComplaintsPct: 15,
      occurrencesPct: 10,
      communicationPct: 10,
      deliveryHistoryPct: 10,
      complimentsPct: 5,
    })
    expect(valid.isValid).toBe(true)
    expect(valid.currentSum).toBe(100)

    // Caso 2: Menor que 100% (ex: 95%)
    const under = validateWeightsSum({
      ...DEFAULT_SCORE_WEIGHTS,
      servicesEvaluationPct: 25, // -5%
    })
    expect(under.isValid).toBe(false)
    expect(under.errorMessage).toContain('A soma dos pesos deve ser exatamente 100%')

    // Caso 3: Maior que 100% (ex: 105%)
    const over = validateWeightsSum({
      ...DEFAULT_SCORE_WEIGHTS,
      punctualityPct: 25, // +5%
    })
    expect(over.isValid).toBe(false)
    expect(over.errorMessage).toContain('A soma dos pesos deve ser exatamente 100%')
  })

  it('12. Confiabilidade da amostra deve ser Baixa com poucas viagens e Alta com amostra robusta', () => {
    const lowConf = evaluateSampleConfidence(2, 1, 1, 15, 5)
    expect(lowConf.level).toBe('BAIXA')

    const medConf = evaluateSampleConfidence(8, 6, 2, 15, 5)
    expect(medConf.level).toBe('MEDIA')

    const highConf = evaluateSampleConfidence(20, 18, 4, 15, 5)
    expect(highConf.level).toBe('ALTA')
  })

  it('13. Não deve penalizar falta de avaliação com nota zero', () => {
    const scoreWithoutRating = calculateGovernedScore(
      'Carlos Alberto Lima',
      'MOTORISTA',
      sampleHistory,
      [], // Sem avaliações
      [],
      [],
      sampleRule,
    )

    const evalCriterion = scoreWithoutRating.criteriaBreakdown.find((c) => c.criterionName === 'Avaliação dos serviços')
    expect(evalCriterion?.rawMetricDisplay).toBe('Histórico insuficiente para este critério.')
    expect(evalCriterion?.normalizedScore).toBeGreaterThan(0) // Ponderação neutra, não zero
    expect(scoreWithoutRating.finalScore).toBeGreaterThan(60)
  })

  it('14. Simulador deve calcular variação de impacto sem alterar vigência', () => {
    const candidateRule: ScoreRuleVersion = {
      ...sampleRule,
      version_code: 'REG-SIMULATED-v2',
      weights: {
        servicesEvaluationPct: 40, // Aumenta peso de serviços
        punctualityPct: 15,
        procedenteComplaintsPct: 15,
        occurrencesPct: 10,
        communicationPct: 10,
        deliveryHistoryPct: 5,
        complimentsPct: 5,
      },
    }

    const impact = simulateScoreImpact(
      ['Carlos Alberto Lima'],
      sampleHistory,
      [],
      [],
      [],
      sampleRule,
      candidateRule,
    )

    expect(impact.total_evaluated).toBe(1)
    expect(impact.sampleImpacts.length).toBe(1)
  })

  // -------------------------------------------------------------------------
  // PARTE 3: DASHBOARD EXECUTIVO & ANÁLISE IA (4 BLOCOS)
  // -------------------------------------------------------------------------

  it('15. Dashboard sem filtro e com filtros combináveis reativos', () => {
    const all = filterHistoricalTransports(sampleHistory, {})
    expect(all.length).toBe(4)

    const filtered = filterHistoricalTransports(sampleHistory, {
      driverName: 'Carlos Alberto Lima',
      itineraryCode: 'MG-SP-01',
    })
    expect(filtered.length).toBe(4)

    const none = filterHistoricalTransports(sampleHistory, {
      destinationUf: 'RS',
    })
    expect(none.length).toBe(0)
  })

  it('16. Cards executivos devem consolidar os 4 grupos com métricas reais', () => {
    const cards = calculateExecutiveCards(sampleHistory, [], [], [], [])
    expect(cards.totalTransports).toBe(4)
    expect(cards.uniqueDrivers).toBe(1)
    expect(cards.uniqueVehicles).toBe(1)
    expect(cards.totalTonnageTon).toBe(121)
    expect(cards.onTimeDeliveriesPct).toBe(75) // 3 de 4 no prazo
  })

  it('17. Análise IA deve gerar estritamente os 4 blocos obrigatórios', () => {
    const cards = calculateExecutiveCards(sampleHistory, [], [], [], [])
    const aiBlocks = generateAiExecutiveAnalysis(cards, sampleHistory, [])

    expect(aiBlocks.length).toBeGreaterThan(0)
    aiBlocks.forEach((block) => {
      expect(block.observedFact).toBeTruthy()
      expect(block.identifiedCorrelation).toBeTruthy()
      expect(block.workingHypothesis).toBeTruthy()
      expect(block.suggestedAction).toBeTruthy()
    })
  })

  // -------------------------------------------------------------------------
  // PARTE 4: INTEGRAÇÃO COM CONTRATAÇÃO / MESA DE FRETES
  // -------------------------------------------------------------------------

  it('18. Card de apoio na contratação deve retornar indicadores reais e nunca bloquear por IA', () => {
    const support = getDriverHiringSupport('Carlos Alberto Lima', sampleHistory, [], [])
    expect(support.totalTransports).toBe(4)
    expect(support.scoreFinal).toBeGreaterThan(0)
    expect(support.topItineraryCode).toBe('MG-SP-01')
    expect(support.topItineraryCount).toBe(4)
  })
})
