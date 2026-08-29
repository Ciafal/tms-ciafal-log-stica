import { describe, it, expect } from 'vitest'
import {
  classifyFredIntent,
  WhatsAppWebhookEventEntity,
} from '../domain/fredTrackingEngine'
import {
  calculateExecutiveSavingsSummary,
  SmartSelectionSavingsRecord,
} from '../domain/profitabilityEngine'

describe('Sprint 11 - Inteligência Logística, WhatsApp Oficial & Economia da Seleção', () => {
  // FLUXO 1: FRED WHATSAPP & AUDIOS & INTENÇÕES
  describe('Fluxo 1: Fred WhatsApp Webhook, Áudios & Intenções', () => {
    it('deve classificar intenção de atraso a partir de áudio transcrito', () => {
      const result = classifyFredIntent({
        rawText: '',
        audioTranscription: 'Vou atrasar umas duas horas por causa de congestionamento na rodovia.',
      })
      expect(result.intent).toBe('ATRASO')
      expect(result.confidencePct).toBeGreaterThanOrEqual(90)
      expect(result.standardFriendlyResponse).toContain('atraso')
    })

    it('deve identificar pane mecânica e marcar intervenção humana necessária', () => {
      const result = classifyFredIntent({
        rawText: 'Estou parado no acostamento porque furou o pneu e quebrou a barra.',
      })
      expect(result.intent).toBe('PROBLEMA_MECANICO')
      expect(result.requiresHumanIntervention).toBe(true)
    })

    it('deve classificar intenção de contestação de avaliação', () => {
      const result = classifyFredIntent({
        audioTranscription: 'Quero contestar minha avaliação dessa viagem, a culpa foi da expedição.',
      })
      expect(result.intent).toBe('CONTESTACAO_AVALIACAO')
      expect(result.requiresHumanIntervention).toBe(true)
    })

    it('deve classificar localização GPS compartilhada', () => {
      const result = classifyFredIntent({
        hasLocation: true,
      })
      expect(result.intent).toBe('POSICAO_LOCALIZACAO')
      expect(result.suggestedAction).toContain('GPS')
    })
  })

  // FLUXO 2 & 3: ECONOMIA DA SELEÇÃO INTELIGENTE & RENTABILIDADE
  describe('Fluxos 2 e 3: Economia da Seleção Inteligente & Rentabilidade Qlik', () => {
    it('deve calcular corretamente os indicadores do dashboard executivo de economia', () => {
      const mockSavings: SmartSelectionSavingsRecord[] = [
        {
          cargo_id: 'CARGO-001',
          baseline_type_used: 'HISTORICO_ROTAS',
          baseline_value: 5000,
          target_value: 4200,
          contracted_freight_value: 4300,
          pedagio_value: 300,
          adicionais_value: 0,
          total_negotiated_cost: 4600,
          realized_cost: 4600,
          estimated_savings: 700,
          estimated_savings_pct: 14,
          contracted_savings: 700,
          contracted_savings_pct: 14,
          realized_savings: 700,
          realized_savings_pct: 14,
          negotiation_mode: 'PREDOMINANTE_CARLAO',
          weight_ton: 25,
          duration_minutes: 10,
          rounds_count: 2,
        },
        {
          cargo_id: 'CARGO-002',
          baseline_type_used: 'MEDIANA_OFERTAS',
          baseline_value: 4000,
          target_value: 3400,
          contracted_freight_value: 3500,
          pedagio_value: 200,
          adicionais_value: 0,
          total_negotiated_cost: 3700,
          realized_cost: 3700,
          estimated_savings: 500,
          estimated_savings_pct: 12.5,
          contracted_savings: 500,
          contracted_savings_pct: 12.5,
          realized_savings: 500,
          realized_savings_pct: 12.5,
          negotiation_mode: 'APOIADA_IA',
          weight_ton: 15,
          duration_minutes: 15,
          rounds_count: 3,
          had_human_intervention: true,
        },
      ]

      const summary = calculateExecutiveSavingsSummary(mockSavings)
      expect(summary.fretesNegociadosCount).toBe(2)
      expect(summary.toneladasTransportadas).toBe(40)
      expect(summary.gastoTotalFretes).toBe(8300)
      expect(summary.baselineEstimadoTotal).toBe(9000)
      expect(summary.economiaRealizadaTotal).toBe(1200)
      expect(summary.economiaMediaPorTransporte).toBe(600)
      expect(summary.economiaMediaPorTonelada).toBe(30)
      expect(summary.pctCargasSelecionadasComIA).toBe(100)
      expect(summary.byNegotiationMode.PREDOMINANTE_CARLAO.count).toBe(1)
      expect(summary.byNegotiationMode.APOIADA_IA.handoffsCount).toBe(1)
    })
  })
})
