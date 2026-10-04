import { describe, it, expect } from 'vitest'
import {
  evaluateDriverStructured,
  evaluateVehicleStructured,
  calculateCarrierScore,
} from '@/domain/carrierHistoryEngine'
import { carrierHistoryService } from '@/services/carrierHistoryService'

describe('Carrier Complaint Governance & Integration Verification', () => {
  it('garante que reclamação EM_ANALISE / REGISTRADA não pontua como falha confirmada no score', () => {
    const weights = {
      servicesEvaluationPct: 30,
      punctualityPct: 20,
      procedenteComplaintsPct: 15,
      occurrencesPct: 10,
      communicationPct: 10,
      deliveryHistoryPct: 10,
      complimentsPct: 5,
    }

    const evaluationWithUnconfirmedComplaints = {
      servicesAvgScore: 4.8,
      punctualityPct: 98,
      totalComplaintsCount: 5,
      procedenteComplaintsCount: 0, // Nenhuma confirmada procedente (estão REGISTRADA ou EM_ANALISE)
      occurrencesCount: 0,
      communicationScore: 5,
      onTimeDeliveriesPct: 99,
      complimentsCount: 3,
    }

    const score = calculateCarrierScore(evaluationWithUnconfirmedComplaints, weights)
    // Se procedenteComplaintsCount é 0, a nota de reclamações procedentes é 100% (nota máxima)
    expect(score.complaintsScore).toBe(100)
    expect(score.finalScore).toBeGreaterThan(95)
  })

  it('valida que carrierHistoryService possui o método registerComplaintGoverned', () => {
    expect(typeof carrierHistoryService.registerComplaintGoverned).toBe('function')
    expect(typeof carrierHistoryService.getComplaintReasons).toBe('function')
  })

  it('valida segregação estrita entre avaliação de motorista e de veículo', () => {
    const driverResult = evaluateDriverStructured({
      pontualidade: 5,
      cumprimentoOrientacoes: 5,
      relacionamentoInterno: 5,
      cuidadoCarga: 5,
      regrasSeguranca: 5,
      qualidadeGeral: 5,
    })

    const vehicleResult = evaluateVehicleStructured({
      conservacao: 1,
      limpeza: 1,
      condicoesAparentes: 1,
      amarracao: 1,
      regrasInternas: 1,
    })

    // Motorista excelente não mascara veículo precário
    expect(driverResult.averageScore).toBe(5)
    expect(vehicleResult.averageScore).toBe(1)
  })
})
