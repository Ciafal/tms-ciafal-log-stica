import { describe, it, expect } from 'vitest'
import {
  calculateNegotiationIndicators,
  validateNegotiationForCompletion,
  formatCurrencyBRL,
  formatWeightTon,
  formatDistanceKm,
  formatDateTimeBR,
  NegociacaoRecord,
  mapNegotiationToConsolidatedColumn,
  computeNegotiationIntelligence,
  detectOperationalAlerts,
} from '../domain/negociacoesEngine'

describe('Motor de Domínio de Negociações & Pipeline SAP (HUB CIAFAL)', () => {
  const mockRecords: NegociacaoRecord[] = [
    {
      id: 'neg-1',
      negotiation_number: 'NEG-2026-000101',
      cargo_id: 'CARGA-SP-101',
      driver_name: 'Antônio Carlos Silveira',
      vehicle_type: 'Carreta Bitrem',
      vehicle_plate: 'CIA-1A23',
      itinerary_code: 'MG-SP-01',
      negotiated_freight_value: 5850,
      toll_value: 480,
      accepted_by: 'Antônio Carlos Silveira',
      acceptance_at: '2026-10-03T14:35:00.000Z',
      status: 'CONCLUIDA',
      responsible_type: 'CHICAO_IA',
      ai_duration_minutes: 12,
      human_duration_minutes: 0,
      sap_pipeline_status: 'AGUARDANDO_INTEGRACAO',
      orders_items_json: [
        {
          customerCode: '100025',
          customerName: 'Aço Forte',
          orderNumber: '450001',
          itemNumber: '000010',
          product: 'Bobina',
          quantity: 1,
          unit: 'PC',
          weightKg: 14500,
          destination: 'SP',
        },
      ],
    },
    {
      id: 'neg-2',
      negotiation_number: 'NEG-2026-000102',
      cargo_id: 'CARGA-RJ-202',
      driver_name: 'Marcos Vinicius Rezende',
      vehicle_type: 'Truck',
      vehicle_plate: 'RDO-9E88',
      itinerary_code: 'MG-RJ-02',
      negotiated_freight_value: 2450,
      toll_value: 320,
      status: 'EM_NEGOCIACAO',
      responsible_type: 'CHICAO_IA',
      ai_duration_minutes: 8,
      human_duration_minutes: 0,
      orders_items_json: [],
    },
    {
      id: 'neg-3',
      negotiation_number: 'NEG-2026-000103',
      cargo_id: 'CARGA-ES-303',
      driver_name: 'Cláudio Roberto Dias',
      vehicle_type: 'Carreta Sider',
      vehicle_plate: 'SID-4K11',
      itinerary_code: 'MG-ES-03',
      negotiated_freight_value: 4300,
      toll_value: 420,
      status: 'EM_NEGOCIACAO',
      responsible_type: 'HUMANO',
      human_takeover_at: '2026-10-03T15:40:00.000Z',
      human_takeover_reason: 'Exceção financeira',
      ai_duration_minutes: 10,
      human_duration_minutes: 15,
      orders_items_json: [],
    },
    {
      id: 'neg-4',
      negotiation_number: 'NEG-2026-000104',
      cargo_id: 'CARGA-GO-404',
      driver_name: 'Sebastião Pedro Duarte',
      status: 'RECUSADO',
      responsible_type: 'CHICAO_IA',
      ai_duration_minutes: 5,
      human_duration_minutes: 0,
      orders_items_json: [],
    },
    {
      id: 'neg-5',
      negotiation_number: 'NEG-2026-000105',
      cargo_id: 'CARGA-MG-505',
      status: 'ABERTO',
      responsible_type: 'CHICAO_IA',
      orders_items_json: [],
    },
  ]

  it('1. Deve calcular os indicadores do topo dinamicamente e com precisão', () => {
    const kpis = calculateNegotiationIndicators(mockRecords)

    expect(kpis.totalGeral).toBe(5)
    expect(kpis.abertasCount).toBe(1)
    expect(kpis.emNegociacaoCount).toBe(2)
    expect(kpis.recusadasCount).toBe(1)
    expect(kpis.concluidasCount).toBe(1)
    expect(kpis.pendentesIntegracaoCount).toBe(1)
    expect(kpis.integradasSapCount).toBe(0)

    // Autonomia Chicão: total elegíveis = neg-1 (IA), neg-2 (IA), neg-3 (Humano), neg-4 (IA) => 3/4 = 75%
    expect(kpis.autonomiaChicaoPct).toBe(75)

    // Tempo médio: (12 + 8 + 25 + 5) / 4 = 50 / 4 = 12.5 min
    expect(kpis.tempoMedioNegociacaoMin).toBe(12.5)
  })

  it('2. Deve validar estritamente as regras de conclusão (Item 6)', () => {
    // Negociação incompleta (faltando placa, aceite, etc.)
    const incomplete: Partial<NegociacaoRecord> = {
      cargo_id: 'CARGA-001',
      driver_name: 'João da Silva',
      negotiated_freight_value: 3000,
    }

    const validation1 = validateNegotiationForCompletion(incomplete)
    expect(validation1.isValid).toBe(false)
    expect(validation1.pendingFields).toContain('Placa do veículo')
    expect(validation1.pendingFields).toContain('Veículo definido')
    expect(validation1.pendingFields).toContain('Pedágio (mesmo R$ 0,00)')
    expect(validation1.pendingFields).toContain('Aceite registrado (responsável pelo aceite)')
    expect(validation1.pendingFields).toContain('Clientes definidos e Pedidos SAP relacionados')

    // Negociação 1 completa
    const validation2 = validateNegotiationForCompletion(mockRecords[0])
    expect(validation2.isValid).toBe(true)
    expect(validation2.pendingFields).toHaveLength(0)
  })

  it('3. Deve formatar adequadamente os valores padrão Brasil', () => {
    expect(formatCurrencyBRL(5850)).toContain('5.850,00')
    expect(formatWeightTon(28500)).toBe('28,500 t')
    expect(formatDistanceKm(450)).toBe('450 km')

    const dt = formatDateTimeBR('2026-10-03T14:35:00.000Z')
    expect(dt.date).toBeDefined()
    expect(dt.time).toBeDefined()
  })

  it('4. Deve mapear corretamente as negociações para as 10 colunas consolidadas', () => {
    // mockRecords[0]: status CONCLUIDA, sap_pipeline_status AGUARDANDO_INTEGRACAO => PENDENTE_SAP
    expect(mapNegotiationToConsolidatedColumn(mockRecords[0])).toBe('PENDENTE_SAP')

    // mockRecords[4]: status ABERTO => AGUARDANDO_NEGOCIACAO
    expect(mapNegotiationToConsolidatedColumn(mockRecords[4])).toBe('AGUARDANDO_NEGOCIACAO')

    // mockRecords[3]: status RECUSADO => RECUSADA
    expect(mapNegotiationToConsolidatedColumn(mockRecords[3])).toBe('RECUSADA')

    // Inteligência de rota
    const intel = computeNegotiationIntelligence(mockRecords[0], mockRecords)
    expect(intel.historicalAvgFreight).toBeGreaterThan(0)
    expect(intel.benchmarkMessage).toBeDefined()
    expect(intel.anttMessage).toBeDefined()

    // Alertas operacionais
    const alerts = detectOperationalAlerts(mockRecords[0])
    expect(alerts.length).toBeGreaterThanOrEqual(1)
    expect(alerts.some((a: any) => a.id === 'aceite_sem_sap')).toBe(true)
  })
})
