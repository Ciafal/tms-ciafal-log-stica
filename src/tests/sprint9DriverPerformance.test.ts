import { describe, it, expect } from 'vitest'
import {
  calculateDriverPerformanceScore,
  decomposeDelayAndCalculateImputability,
  analyzeCrossExperienceMatrix,
  validateSurveyAgainstFacts,
  calculateDriverNps,
  calculateCustomerLogisticScore,
  DEFAULT_PERFORMANCE_WEIGHTS,
} from '../domain/driverPerformanceEngine'

describe('Sprint 9: Gestão de Performance e Experiência dos Motoristas (TMS CIAFAL)', () => {
  describe('1. Motor Determinístico de Score do Motorista (7 Dimensões Parametrizáveis)', () => {
    it('deve calcular o score consolidado com os pesos oficiais padrão somando 100%', () => {
      const sumWeights =
        DEFAULT_PERFORMANCE_WEIGHTS.punctualityPct +
        DEFAULT_PERFORMANCE_WEIGHTS.routeAdherencePct +
        DEFAULT_PERFORMANCE_WEIGHTS.communicationPct +
        DEFAULT_PERFORMANCE_WEIGHTS.fredCollaborationPct +
        DEFAULT_PERFORMANCE_WEIGHTS.deliveryQualityPct +
        DEFAULT_PERFORMANCE_WEIGHTS.procedureDocPct +
        DEFAULT_PERFORMANCE_WEIGHTS.humanEvaluationsPct

      expect(sumWeights).toBe(100)
    })

    it('deve gerar classificação EXCELENTE (score >= 90) e explicabilidade passo a passo', () => {
      const result = calculateDriverPerformanceScore({
        subscores: {
          punctuality: 95,
          routeAdherence: 94,
          communication: 92,
          fredCollaboration: 96,
          deliveryQuality: 98,
          procedureDoc: 90,
          humanEvaluations: 88,
        },
        tripsCount: 25,
      })

      expect(result.scoreConsolidated).toBeGreaterThanOrEqual(90)
      expect(result.classification).toBe('EXCELENTE')
      expect(result.confidenceLevel).toBe('SCORE_CONSOLIDADO')
      expect(result.starsRating).toBeGreaterThanOrEqual(4.5)
      expect(result.calculationExplanation.stepByStepText.length).toBe(8)
    })

    it('deve sinalizar amostra insuficiente para menos de 5 viagens (Score Provisório)', () => {
      const result = calculateDriverPerformanceScore({
        subscores: {
          punctuality: 80,
          routeAdherence: 80,
          communication: 80,
          fredCollaboration: 80,
          deliveryQuality: 80,
          procedureDoc: 80,
          humanEvaluations: 80,
        },
        tripsCount: 3,
      })

      expect(result.confidenceLevel).toBe('PROVISORIO_AMOSTRA_INSUFICIENTE')
    })
  })

  describe('2. Princípio de Responsabilidade e Decomposição de Atraso', () => {
    it('NÃO deve penalizar o motorista quando o atraso for da CIAFAL, Trânsito ou Cliente', () => {
      const result = decomposeDelayAndCalculateImputability({
        totalDelayMinutes: 110,
        events: [
          { actor: 'EXPEDICAO_CIAFAL', minutes: 35, description: 'Fila na doca 02' },
          { actor: 'FATURAMENTO', minutes: 20, description: 'Demora na emissão da NF' },
          { actor: 'RODOVIA_TRANSITO', minutes: 15, description: 'Acidente na BR-381' },
          { actor: 'MOTORISTA', minutes: 40, description: 'Parada sem comunicação' },
        ],
      })

      expect(result.totalMinutes).toBe(110)
      expect(result.driverImputableMinutes).toBe(40)
      expect(result.ciafalImputableMinutes).toBe(55)
      expect(result.externalImputableMinutes).toBe(15)
      // Apenas os 40 min do motorista influenciam a pontualidade
      expect(result.driverPenaltyPoints).toBe(8)
      expect(result.driverPunctualitySubscore).toBe(70)
    })

    it('deve isentar completamente desvios autorizados ou decorrentes de força maior', () => {
      const result = decomposeDelayAndCalculateImputability({
        totalDelayMinutes: 50,
        events: [
          {
            actor: 'MOTORISTA',
            minutes: 50,
            description: 'Bloqueio de pista indicado pelo Fred',
            isAuthorizedOrForceMajeure: true,
          },
        ],
      })

      expect(result.driverImputableMinutes).toBe(0)
      expect(result.driverPenaltyPoints).toBe(0)
      expect(result.driverPunctualitySubscore).toBe(100)
    })
  })

  describe('3. Matriz Cruzada de Experiência CIAFAL x Motorista (4 Quadrantes)', () => {
    it('deve detectar Caso A (Excelente parceiro insatisfeito) quando score motorista >= 80 e exp CIAFAL < 60', () => {
      const res = analyzeCrossExperienceMatrix(92, 55)
      expect(res.quadrant).toBe('CASO_A_EXCELENTE_INSATISFEITO')
      expect(res.priorityAction).toContain('PRIORIDADE MÁXIMA')
    })

    it('deve detectar Caso C (Parceria Saudável) quando ambos os scores forem altos (>= 80)', () => {
      const res = analyzeCrossExperienceMatrix(94, 91)
      expect(res.quadrant).toBe('CASO_C_PARCERIA_SAUDAVEL')
    })
  })

  describe('4. Validação de Opinião contra Marcos Reais da Expedição', () => {
    it('deve validar consistência quando tempo real é alto e a nota de espera é baixa', () => {
      const res = validateSurveyAgainstFacts(1, 185, 120)
      expect(res.status).toBe('Consistente com os dados observados')
    })

    it('deve sinalizar nota abaixo do esperado quando o tempo real foi muito rápido', () => {
      const res = validateSurveyAgainstFacts(1, 45, 120)
      expect(res.status).toBe('Abaixo do esperado')
    })
  })

  describe('5. NPS dos Motoristas', () => {
    it('deve calcular corretamente a zona de excelência (NPS >= 75)', () => {
      const ratings = [10, 10, 9, 10, 8, 9, 10]
      const res = calculateDriverNps(ratings)
      expect(res.npsScore).toBeGreaterThanOrEqual(75)
      expect(res.zone).toBe('EXCELENCIA')
      expect(res.promotersCount).toBe(6)
      expect(res.neutralsCount).toBe(1)
      expect(res.detractorsCount).toBe(0)
    })
  })

  describe('6. Score Logístico do Cliente (Uso Interno TMS / CRM)', () => {
    it('deve calcular score do cliente e classificar adequadamente sem expor externamente', () => {
      const res = calculateCustomerLogisticScore({
        avgWaitingTimeMin: 15,
        avgUnloadingTimeMin: 38,
        p90UnloadingTimeMin: 55,
        windowComplianceRatePct: 98,
        occurrencesRatePct: 2,
        avgDriverRating: 4.8,
      })

      expect(res.logisticScore).toBeGreaterThanOrEqual(90)
      expect(res.classification).toBe('EXCELENTE')
      expect(res.starsRating).toBeGreaterThanOrEqual(4.5)
    })
  })
})
