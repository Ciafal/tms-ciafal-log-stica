import { describe, it, expect } from 'vitest'
import {
  generateTransportAiAnalysis,
  formatActiveFilters,
} from '@/domain/transportAnalyticsEngine'
import {
  GeneralTransportRecord,
  GeneralTransportFilterParams,
} from '@/domain/generalTransportReportEngine'

describe('Motor Analítico e IA do Relatório Geral Transporte (Zero dados fictícios)', () => {
  const mockFilters: GeneralTransportFilterParams = {
    transport: '800101',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    statuses: ['CONCLUÍDO'],
    plate: 'ABC1D23',
    scaleLogFilter: 'WITH_LOG',
  }

  const sampleRecords: GeneralTransportRecord[] = [
    {
      id: 'rec-1',
      transport_number: '800101',
      sap_transport_number: '800101',
      transport_date: '2026-10-15',
      transport_time: '14:30',
      invoicing_date: '2026-10-15',
      transport_status: 'CONCLUÍDO',
      center_code: 'WSTL',
      center_description: 'CIAFAL Contagem Matriz',
      itinerary_code: '0101',
      itinerary_description: 'Belo Horizonte e Grande BH',
      external_id_1: 'ABC1D23',
      vehicle_type: 'CARRETA',
      user_name: 'SAP_OPER',
      carrier_name: 'TRANSLOG CIAFAL',
      driver_name: 'CARLOS SILVA',
      gross_weight_ton: 32.5,
      tare_weight_ton: 12.0,
      net_weight_ton: 20.5,
      nf_weight_ton: 20.0,
      diff_weight_ton: 0.5,
      diff_weight_pct: 2.5,
      scale_reason: 'CARGA PADRÃO',
      has_scale_log: true,
      total_time_min: 120,
      collection_time_min: 75,
      freight_cost: 3200,
      toll_cost: 250,
      distance_km: 150,
      occupancy_pct: 92.5,
      expedition_type: 'LOTAÇÃO',
      transport_type: 'TRANSFERÊNCIA',
      freight_type: 'FOB',
      sales_organization: 'CIAF',
      start_time: '14:00',
      tare_date: '2026-10-15',
      tare_time: '14:10',
      initial_date: '2026-10-15',
      initial_time: '14:15',
      end_date_1: '2026-10-15',
      end_time_1: '15:30',
      end_date_2: '2026-10-15',
      end_time_2: '16:00',
      vehicle_capacity_ton: 25,
      wheel_type: 'RODADO',
      body_type: 'ABERTA',
      axles_count: 5,
      fractions_count: 1,
      rfid_code: 'RFID-1234',
    },
    {
      id: 'rec-2',
      transport_number: '800102',
      sap_transport_number: '800102',
      transport_date: '2026-10-16',
      transport_time: '14:15',
      invoicing_date: '2026-10-16',
      transport_status: 'CONCLUÍDO',
      center_code: 'WSTL',
      center_description: 'CIAFAL Contagem Matriz',
      itinerary_code: '0101',
      itinerary_description: 'Belo Horizonte e Grande BH',
      external_id_1: 'ABC1D23',
      vehicle_type: 'TRUCK',
      user_name: 'SAP_OPER',
      carrier_name: 'TRANSLOG CIAFAL',
      driver_name: 'CARLOS SILVA',
      gross_weight_ton: 22.0,
      tare_weight_ton: 8.0,
      net_weight_ton: 14.0,
      nf_weight_ton: 14.02,
      diff_weight_ton: -0.02,
      diff_weight_pct: -0.14,
      scale_reason: 'CARGA PADRÃO',
      has_scale_log: true,
      total_time_min: 90,
      collection_time_min: 50,
      freight_cost: 2100,
      toll_cost: 150,
      distance_km: 120,
      occupancy_pct: 64.0, // < 70% ocupação baixa
      expedition_type: 'DISTRIBUIÇÃO',
      transport_type: 'DISTRIBUIÇÃO',
      freight_type: 'CIF',
      sales_organization: 'CIAF',
      start_time: '13:50',
      tare_date: '2026-10-16',
      tare_time: '14:00',
      initial_date: '2026-10-16',
      initial_time: '14:05',
      end_date_1: '2026-10-16',
      end_time_1: '14:55',
      end_date_2: '2026-10-16',
      end_time_2: '15:20',
      vehicle_capacity_ton: 15,
      wheel_type: 'RODADO',
      body_type: 'FECHADA',
      axles_count: 3,
      fractions_count: 1,
      rfid_code: 'RFID-1235',
    },
  ]

  it('formata filtros ativos em texto legível para auditoria e cabeçalho', () => {
    const formatted = formatActiveFilters(mockFilters)
    expect(formatted).toContain('Nº Transporte: 800101')
    expect(formatted).toContain('Período Transporte: 01/10/2026 a 31/10/2026')
    expect(formatted).toContain('Status: CONCLUÍDO')
    expect(formatted).toContain('Balança: Com Balança')
    expect(formatted).toContain('Placa: ABC1D23')
  })

  it('calcula métricas de operação, pesagem e custos estritamente sobre os registros filtrados', () => {
    const analysis = generateTransportAiAnalysis(sampleRecords, mockFilters)

    expect(analysis.hasData).toBe(true)
    expect(analysis.filteredCount).toBe(2)

    // Resumo Executivo
    expect(analysis.executiveSummary.transportsCount).toBe(2)
    expect(analysis.executiveSummary.totalNetWeightTon).toBe(34.5)
    expect(analysis.executiveSummary.totalFreightCost).toBe(5300)

    // Pesagem
    expect(analysis.weighing.withScaleCount).toBe(2)
    expect(analysis.weighing.withoutScaleCount).toBe(0)
    expect(analysis.weighing.divergentTransportsCount).toBe(1) // rec-1 tem diff 0.5 t

    // Financeiro
    expect(analysis.financial.totalFreight).toBe(5300)
    expect(analysis.financial.totalToll).toBe(400)
    expect(analysis.financial.totalCost).toBe(5700)
    expect(analysis.financial.lowOccupancyCount).toBe(1) // rec-2 tem 64%

    // Custo por tonelada R$/t = 5700 / 34.5 = ~165.22
    expect(analysis.financial.sufficientDataForCostPerTon).toBe(true)
    expect(analysis.financial.avgCostPerTon).toBeCloseTo(165.22, 1)

    // Anomalias detectadas
    expect(analysis.anomaliesDetected.length).toBeGreaterThan(0)
    expect(analysis.topInsights.length).toBeGreaterThan(0)
  })

  it('trata graciosamente dataset vazio sem inventar números', () => {
    const emptyAnalysis = generateTransportAiAnalysis([], mockFilters)
    expect(emptyAnalysis.hasData).toBe(false)
    expect(emptyAnalysis.filteredCount).toBe(0)
    expect(emptyAnalysis.executiveSummary.transportsCount).toBe(0)
    expect(emptyAnalysis.financial.avgCostPerTon).toBeNull()
    expect(emptyAnalysis.financial.sufficientDataForCostPerTon).toBe(false)
  })
})
