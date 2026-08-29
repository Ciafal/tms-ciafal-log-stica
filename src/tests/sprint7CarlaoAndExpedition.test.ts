import { describe, it, expect } from 'vitest'
import {
  calculateSmartPriceBand,
  evaluateDriverEligibility,
  processCarlaoRound,
  calculateSustainableCostIndex,
} from '../domain/carlaoNegotiationEngine'
import {
  evaluateStageSla,
  calculateBottleneckPareto,
  DEFAULT_EXPEDITION_SLAS,
  ExpeditionTrackingItem,
} from '../domain/expeditionTowerEngine'
import {
  detectFreightAnomalies,
  calculateLogisticFinancialResult,
} from '../domain/freightIntelligenceEngine'
import { getUserPermissions, UserRole } from '../domain/rules'

describe('Sprint 7 — Agente Carlão, Mesa de Fretes, Expedição e Inteligência Logística', () => {
  // 1. Faixa Inteligente & Separação de Pedágio
  it('deve calcular a Faixa Inteligente de Preço separando piso ANTT, meta CIAFAL e autonomia do Carlão', () => {
    const band = calculateSmartPriceBand(120, 27000, 2532, 2720, 6.5)

    expect(band.pisoAntt).toBe(2532)
    expect(band.metaCiafal).toBeGreaterThanOrEqual(2532)
    expect(band.autonomiaMaximaCarlao).toBeGreaterThan(band.metaCiafal)
    expect(band.tetoOrcamentarioProtegido).toBeGreaterThan(band.autonomiaMaximaCarlao)
  })

  // 2. Score de Elegibilidade do Motorista & Ondas de Oferta
  it('deve calcular o Score de Elegibilidade considerando documentação, veículo, fila e custo sustentável', () => {
    const evalResult = evaluateDriverEligibility(
      { id: 'drv-01', name: 'João Silva Santos', status: 'ativo' },
      { plate: 'ABC1D23', type: 'Carreta Vanderléia 3E', capacityKg: 28000 },
      { type: 'PORTA', status: 'disponivel', distanceKm: 0 },
      { weightKg: 27000, destinationRegion: 'Campinas' },
      { punctualityPct: 98, cancellationsCount: 0, tripsInRegion: 5, sustainableCostIndex: 96 },
    )

    expect(evalResult.isEligible).toBe(true)
    expect(evalResult.score).toBeGreaterThanOrEqual(85)
    expect(evalResult.suggestedWave).toBe(1)
    expect(evalResult.scoreBreakdown.statusDocScore).toBe(20)
    expect(evalResult.scoreBreakdown.capacityVehicleScore).toBe(25)
    expect(evalResult.scoreBreakdown.proximityLocationScore).toBe(20)
  })

  it('deve rejeitar ou pontuar como Onda 3 motorista bloqueado ou capacidade insuficiente', () => {
    const evalBlocked = evaluateDriverEligibility(
      { id: 'drv-02', name: 'Motorista Bloqueado', status: 'bloqueado' },
      { plate: 'XYZ9999', type: 'Truck', capacityKg: 14000 },
      { type: 'FORA', status: 'bloqueado' },
      { weightKg: 27000 },
    )

    expect(evalBlocked.isEligible).toBe(false)
    expect(evalBlocked.score).toBe(0)
    expect(evalBlocked.rejectionReason).toBeDefined()
  })

  // 3. Motor Determinístico de Rodadas do Carlão & Explicabilidade
  it('deve aceitar contraproposta do motorista se estiver abaixo ou igual à Meta CIAFAL', () => {
    const sessionMock: any = {
      cargoId: 'CARGA-5522',
      driverName: 'João Silva',
      currentRound: 0,
      eligibilityScore: 94,
      pedagioValue: 428.4,
      priceBand: {
        pisoAntt: 2532,
        metaCiafal: 2650,
        referenciaMercado: 2720,
        autonomiaMaximaCarlao: 2820,
        tetoOrcamentarioProtegido: 3000,
      },
    }

    const round = processCarlaoRound(sessionMock, 2600)
    expect(round.decision).toBe('ACCEPT')
    expect(round.carlaoProposedFreight).toBe(2600)
    expect(round.pedagioValue).toBe(428.4)
    expect(round.totalProposed).toBe(3028.4)
    expect(round.messageToDriver).toContain('Confirmando: Carga CARGA-5522')
  })

  it('deve realizar contraproposta cordial se valor estiver dentro da autonomia do Carlão', () => {
    const sessionMock: any = {
      cargoId: 'CARGA-5522',
      driverName: 'Carlos Oliveira',
      currentRound: 0,
      eligibilityScore: 91,
      pedagioValue: 428.4,
      priceBand: {
        pisoAntt: 2532,
        metaCiafal: 2650,
        referenciaMercado: 2720,
        autonomiaMaximaCarlao: 2820,
        tetoOrcamentarioProtegido: 3000,
      },
    }

    const round = processCarlaoRound(sessionMock, 2800)
    expect(round.decision).toBe('COUNTER_PROPOSAL')
    expect(round.carlaoProposedFreight).toBeGreaterThanOrEqual(2650)
    expect(round.carlaoProposedFreight).toBeLessThanOrEqual(2820)
    expect(round.explainability).toContain('Meta R$ 2650')
  })

  it('deve escalar para aprovação humana se contraproposta exceder a autonomia máxima do Carlão', () => {
    const sessionMock: any = {
      cargoId: 'CARGA-5522',
      driverName: 'Pedro Souza',
      currentRound: 0,
      eligibilityScore: 87,
      pedagioValue: 428.4,
      priceBand: {
        pisoAntt: 2532,
        metaCiafal: 2650,
        referenciaMercado: 2720,
        autonomiaMaximaCarlao: 2820,
        tetoOrcamentarioProtegido: 3000,
      },
    }

    const round = processCarlaoRound(sessionMock, 3100) // Excede R$ 2.820
    expect(round.decision).toBe('ESCALATE_HUMAN')
    expect(round.messageToDriver).toContain('ultrapassa meu limite operacional direto')
  })

  // 4. Índice de Custo Sustentável (Sustainable Cost Index)
  it('deve calcular o Índice de Custo Sustentável integrando preço, pontualidade e zero cancelamento', () => {
    const sci = calculateSustainableCostIndex({
      priceCompetitivenessPct: 95,
      punctualityPct: 98,
      reliabilityZeroCancellationsPct: 100,
      yardStayEfficiencyPct: 92,
      deliveryPerformancePct: 96,
      relationshipScore: 95,
    })

    expect(sci).toBeGreaterThanOrEqual(90)
    expect(sci).toBeLessThanOrEqual(100)
  })

  // 5. Gestão da Expedição & SLAs Operacionais (T1 a T8)
  it('deve avaliar o SLA da etapa de carregamento e sinalizar semáforo crítico quando estourado', () => {
    const okEval = evaluateStageSla('EM_CARREGAMENTO', 35, DEFAULT_EXPEDITION_SLAS)
    expect(okEval.status).toBe('NORMAL')
    expect(okEval.deviationMin).toBe(0)

    const critEval = evaluateStageSla('EM_CARREGAMENTO', 52, DEFAULT_EXPEDITION_SLAS)
    expect(critEval.status).toBe('CRITICO_ATRASADO')
    expect(critEval.deviationMin).toBe(7)
  })

  // 6. Pareto de Causas de Atraso por IA
  it('deve calcular o Pareto de gargalos agrupando motivos e ordenando por minutos de desvio', () => {
    const sampleExpeditions: ExpeditionTrackingItem[] = [
      {
        cargoId: 'CARGA-1',
        driverName: 'A',
        vehiclePlate: 'A1',
        destinationCities: 'Campinas',
        weightTotalKg: 27000,
        deliveriesCount: 1,
        operationalStatus: 'AGUARDANDO_ESTOQUE',
        currentStageName: 'WMS',
        currentStageStart: '',
        currentStageDurationMin: 45,
        totalLeadTimeMin: 180,
        targetLeadTimeMin: 145,
        slaStatus: 'CRITICO_ATRASADO',
        delayRiskPct: 80,
        delayReasonCategory: 'ESTOQUE',
        priorityLevel: 'URGENTE',
      },
      {
        cargoId: 'CARGA-2',
        driverName: 'B',
        vehiclePlate: 'B1',
        destinationCities: 'Sumaré',
        weightTotalKg: 27000,
        deliveriesCount: 1,
        operationalStatus: 'EM_CARREGAMENTO',
        currentStageName: 'Doca',
        currentStageStart: '',
        currentStageDurationMin: 60,
        totalLeadTimeMin: 165,
        targetLeadTimeMin: 145,
        slaStatus: 'CRITICO_ATRASADO',
        delayRiskPct: 75,
        delayReasonCategory: 'CARREGAMENTO',
        priorityLevel: 'ALTA',
      },
    ]

    const pareto = calculateBottleneckPareto(sampleExpeditions)
    expect(pareto.length).toBeGreaterThan(0)
    expect(pareto[0].percentage).toBeGreaterThan(0)
    expect(pareto[0].mainRecommendation).toBeDefined()
  })

  // 7. Inteligência de Fretes & Detecção de Anomalias
  it('deve identificar anomalia de queda de taxa de aceite e desvio de custo por km', () => {
    const routesData = [
      {
        itineraryCode: 'ITIN-SP-SJC-02',
        region: 'Vale do Paraíba',
        totalCargosCount: 30,
        totalTonnage: 800,
        avgFreightValue: 3100,
        avgTollValue: 500,
        costPerTon: 110,
        costPerKm: 10.2, // > 9.5
        medianFreightValue: 3050,
        minFreightValue: 2800,
        maxFreightValue: 3400,
        acceptanceRatePct: 45.0, // < 55%
        avgDelayMinutes: 22,
        driverAvailabilityScore: 70,
        anomaliesDetected: [],
      },
    ]

    const anomalies = detectFreightAnomalies(routesData)
    expect(anomalies.length).toBe(2)
    expect(anomalies.some((a) => a.tipo === 'QUEDA_ACEITE')).toBe(true)
    expect(anomalies.some((a) => a.tipo === 'DESVIO_CUSTO_KM')).toBe(true)
  })

  // 8. Resultado Financeiro Logístico Comparativo
  it('deve calcular a margem logística e resultado da carga', () => {
    const fin = calculateLogisticFinancialResult(3800, 2750, 428.4, 0)
    expect(fin.custoTotal).toBe(3178.4)
    expect(fin.resultadoLogistico).toBeCloseTo(621.6)
    expect(fin.margemLogisticaPct).toBeGreaterThan(15.0)
    expect(fin.classificacao).toBe('ALTA_RENTABILIDADE')
  })

  // 9. Permissões RBAC para novos módulos
  it('deve validar permissões RBAC para Mesa de Fretes, Carlão e Expedição', () => {
    const adminPerms = getUserPermissions('admin_master' as UserRole)
    expect(adminPerms.canNegotiateFreights).toBe(true)
    expect(adminPerms.canSuperviseCarlao).toBe(true)
    expect(adminPerms.canManageCarlaoAutonomy).toBe(true)
    expect(adminPerms.canManageExpeditionWorkflow).toBe(true)
    expect(adminPerms.canConfigureExpeditionSla).toBe(true)
    expect(adminPerms.canViewFreightIntelligence).toBe(true)

    const opPerms = getUserPermissions('operador_logistica' as UserRole)
    expect(opPerms.canNegotiateFreights).toBe(true)
    expect(opPerms.canManageCarlaoAutonomy).toBe(false)
    expect(opPerms.canConfigureExpeditionSla).toBe(false)
  })
})
