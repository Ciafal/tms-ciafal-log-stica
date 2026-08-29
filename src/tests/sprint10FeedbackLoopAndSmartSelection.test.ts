import { describe, it, expect } from 'vitest'
import {
  calculateCargoDriverFitness,
  DEFAULT_SELECTION_WEIGHTS,
} from '@/domain/carlaoNegotiationEngine'
import {
  calculateRealizedFreightResult,
  aggregateProfitabilityByDimension,
} from '@/domain/profitabilityEngine'
import {
  generateDriverPersonalFeedback,
} from '@/domain/driverPerformanceEngine'

describe('FEEDBACK LOOP & SELEÇÃO MULTICRITÉRIO CIAFAL — PARTE 1, 2, 3, 4', () => {
  // -------------------------------------------------------------
  // PARTE 1: SCORE DE ADEQUAÇÃO À CARGA & SELEÇÃO MULTICRITÉRIO
  // -------------------------------------------------------------
  describe('Parte 1 — Score Multicritério e Adequação à Carga', () => {
    it('deve calcular o Score de Adequação ponderando os 9 critérios com explicabilidade', () => {
      const fitness = calculateCargoDriverFitness({
        driver: {
          id: 'drv_01',
          name: 'João Carlos Silva',
          status: 'ativo',
        },
        vehicle: {
          plate: 'ABC1D23',
          type: 'Carreta Vanderléia 3E',
          capacityKg: 28000,
        },
        queueEntry: {
          type: 'PORTA',
          distanceKm: 0,
        },
        cargo: {
          cargoId: 'CARGA-SP001A',
          weightKg: 27000,
          requiredVehicleType: 'Vanderléia',
          destinationCity: 'Campinas/SP',
          targetFreight: 3200,
        },
        performanceScore: {
          score_consolidated: 94,
          score_punctuality: 98,
          score_fred_collaboration: 95,
          trips_evaluated_count: 28,
        },
        historicalStats: {
          tripsInRoute: 15,
          tripsWithCustomer: 8,
          historicalAvgFreight: 3100,
          occurrencesAttributedCount: 0,
          totalOccurrencesCost: 0,
        },
      })

      expect(fitness.fitnessScore).toBeGreaterThanOrEqual(85)
      expect(fitness.isEligible).toBe(true)
      expect(fitness.isRecommended).toBe(true)
      expect(fitness.pointsContribution.totalSum).toBe(fitness.fitnessScore)
      expect(fitness.expectedCostDetails.totalExpectedCost).toBeGreaterThan(3100)
      expect(fitness.expectedCostDetails.confidenceLevel).toBe('ALTA')
      expect(fitness.aiJustification.headline).toContain('Score de Adequação')
    })

    it('deve separar claramente "Motorista Elegível" de "Motorista Recomendado"', () => {
      const lowScoreFitness = calculateCargoDriverFitness({
        driver: {
          id: 'drv_02',
          name: 'Motorista Novo',
          status: 'ativo',
        },
        vehicle: {
          plate: 'XYZ9876',
          type: 'Carreta Convencional',
          capacityKg: 25000,
        },
        queueEntry: {
          type: 'FORA',
          distanceKm: 90,
        },
        cargo: {
          cargoId: 'CARGA-SP002B',
          weightKg: 24000,
          targetFreight: 3000,
        },
        performanceScore: {
          score_consolidated: 60,
          score_punctuality: 70,
          trips_evaluated_count: 2,
        },
        historicalStats: {
          tripsInRoute: 0,
          tripsWithCustomer: 0,
          historicalAvgFreight: 3500,
          occurrencesAttributedCount: 2,
          totalOccurrencesCost: 800,
        },
      })

      expect(lowScoreFitness.isEligible).toBe(true)
      expect(lowScoreFitness.isRecommended).toBe(false)
      expect(lowScoreFitness.fitnessScore).toBeLessThan(75)
    })
  })

  // -------------------------------------------------------------
  // PARTE 2: CUSTO LOGÍSTICO REAL & RENTABILIDADE
  // -------------------------------------------------------------
  describe('Parte 2 — Custo Logístico Real do Transporte e Ocorrências', () => {
    it('deve calcular o resultado real subtraindo frete, pedágio e custos de ocorrências', () => {
      const result = calculateRealizedFreightResult({
        receitaFreteReal: 6000,
        fretePagoMotorista: 4300,
        pedagioReal: 400,
        occurrenceCosts: [
          {
            occurrenceType: 'ESPERA_EXTRAORDINARIA',
            costValue: 300,
            financialResponsible: 'CLIENTE',
            impactsDriverPerformance: false,
            chargeStatus: 'COBRADO_CLIENTE',
          },
          {
            occurrenceType: 'REENTREGA',
            costValue: 700,
            financialResponsible: 'CLIENTE',
            impactsDriverPerformance: false,
            chargeStatus: 'COBRADO_CLIENTE',
          },
        ],
        resultadoPrevistoRef: 1300,
      })

      // Receita 6000 - Frete 4300 - Pedágio 400 - Ocorrências 1000 = Margem Real R$ 300
      expect(result.resultadoRealizado).toBe(300)
      expect(result.totalCustosOcorrencias).toBe(1000)
      expect(result.desvioResultado).toBe(-1000)
      expect(result.occurrenceImpactSummary.topOccurrenceCostType).toBe('REENTREGA')
      expect(result.occurrenceImpactSummary.costsByResponsible['CLIENTE']).toBe(1000)
    })

    it('deve agregar rentabilidade por dimensões (motorista, rota, cliente)', () => {
      const sampleTransports = [
        {
          driver_id: 'drv_01',
          driver_name: 'João Carlos Silva',
          total_weight_kg: 27000,
          receita_frete_real: 5000,
          frete_pago_motorista: 3500,
          pedagio_real: 400,
          outros_custos_reais: 0,
          resultado_realizado: 1100,
        },
        {
          driver_id: 'drv_01',
          driver_name: 'João Carlos Silva',
          total_weight_kg: 27000,
          receita_frete_real: 5000,
          frete_pago_motorista: 3600,
          pedagio_real: 400,
          outros_custos_reais: 100,
          resultado_realizado: 900,
        },
      ]

      const byDrivers = aggregateProfitabilityByDimension(sampleTransports, 'driver')
      expect(byDrivers).toHaveLength(1)
      expect(byDrivers[0].dimensionLabel).toBe('João Carlos Silva')
      expect(byDrivers[0].transportsCount).toBe(2)
      expect(byDrivers[0].resultadoRealTotal).toBe(2000)
      expect(byDrivers[0].margemPorTonelada).toBeGreaterThan(30)
    })
  })

  // -------------------------------------------------------------
  // PARTE 3: FEEDBACK DIRETO AO MOTORISTA PELO FRED IA
  // -------------------------------------------------------------
  describe('Parte 3 — Meu Desempenho Fred & Tom Não Punitivo', () => {
    it('deve gerar feedback seguro com tom construtivo, reconhecimentos e pontos fortes', () => {
      const feedback = generateDriverPersonalFeedback({
        driver_id: 'drv_01',
        driver_name: 'João Carlos Silva',
        score_consolidated: 93,
        score_punctuality: 96,
        score_fred_collaboration: 94,
        score_communication: 92,
        trips_evaluated_count: 28,
      })

      expect(feedback.scoreConsolidated).toBe(93)
      expect(feedback.classification).toBe('EXCELENTE')
      expect(feedback.topStrengths.length).toBeGreaterThanOrEqual(2)
      expect(feedback.growthOpportunities.length).toBeGreaterThanOrEqual(1)
      expect(feedback.fredConversationalText).toContain('João, considerando seus últimos 28 transportes')
      expect(feedback.recognitions.length).toBeGreaterThanOrEqual(1)
      // Não deve conter palavras punitivas agressivas
      expect(feedback.fredConversationalText).not.toContain('Você perdeu pontos')
    })
  })

  // -------------------------------------------------------------
  // PARTE 4: GOVERNANÇA, VERSIONAMENTO E PESOS PARAMETRIZÁVEIS
  // -------------------------------------------------------------
  describe('Parte 4 — Governança e Pesos Parametrizáveis', () => {
    it('deve somar 100% nos pesos parametrizáveis padrão', () => {
      const sum =
        DEFAULT_SELECTION_WEIGHTS.operationalCompatibilityPct +
        DEFAULT_SELECTION_WEIGHTS.historicalPerformancePct +
        DEFAULT_SELECTION_WEIGHTS.routeExperiencePct +
        DEFAULT_SELECTION_WEIGHTS.customerExperiencePct +
        DEFAULT_SELECTION_WEIGHTS.locationAvailabilityPct +
        DEFAULT_SELECTION_WEIGHTS.expectedCostPct +
        DEFAULT_SELECTION_WEIGHTS.punctualityPct +
        DEFAULT_SELECTION_WEIGHTS.occurrencesPct +
        DEFAULT_SELECTION_WEIGHTS.fredCollaborationPct

      expect(sum).toBe(100)
    })
  })
})
