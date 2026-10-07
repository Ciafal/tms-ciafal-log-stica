import { describe, it, expect } from 'vitest'
import {
  applyItineraryReportFilters,
  calculateItinerarySummaryCards,
  buildChartAnalyses,
  generateItineraryAiDiagnosticReport,
  buildDetailedReportRows,
  type ItineraryReportFilterParams,
} from '@/domain/itineraryReportEngine'
import type { RouteAdditionEntity } from '@/domain/routeAdditionEngine'

describe('ItineraryReportEngine — Testes Unitários de Cálculo e IA', () => {
  const mockRouteAdditions: RouteAdditionEntity[] = [
    {
      id: 'ra-1',
      cargo_number: 'CARGA-8801',
      transport_number: 'TR-1001',
      original_itinerary_id: 'MG-07',
      original_itinerary_description: 'Contagem -> Juiz de Fora',
      added_itinerary_id: 'MG-12',
      added_itinerary_description: 'Juiz de Fora -> Barbacena',
      customer_name: 'Distribuidora Siderúrgica JF',
      customer_code: 'CLI-001',
      destination_city: 'Juiz de Fora',
      destination_uf: 'MG',
      weight_before: 18000,
      weight_after: 23500,
      occupancy_before: 65,
      occupancy_after: 88,
      distance_before: 260,
      distance_after: 310,
      additional_distance: 50,
      deliveries_before: 1,
      deliveries_after: 2,
      freight_before: 2200,
      freight_after: 2600,
      toll_before: 180,
      toll_after: 230,
      reason_code: '4', // Falta de volume / consolidação
      reason_description: 'Falta de volume / consolidação de carga',
      user_observation: 'Complementação autorizada pela gerência',
      created_by: 'operador1@ciafal.logistica',
      created_by_role: 'planejador_cargas',
      ai_analysis: 'Acréscimo de 50 km com ganho de 23 p.p. na ocupação.',
      ai_user_alignment: 'Coerente',
      ai_risk_level: 'FAVORAVEL',
      ai_alert_flag: false,
      status: 'ATIVA',
      created_at_dt: '2025-05-10T10:00:00.000Z',
    },
    {
      id: 'ra-2',
      cargo_number: 'CARGA-8802',
      transport_number: 'TR-1002',
      original_itinerary_id: 'MG-07',
      original_itinerary_description: 'Contagem -> Juiz de Fora',
      added_itinerary_id: 'MG-14',
      added_itinerary_description: 'Santos Dumont',
      customer_name: 'Distribuidora Siderúrgica JF',
      customer_code: 'CLI-001',
      destination_city: 'Juiz de Fora',
      destination_uf: 'MG',
      weight_before: 19000,
      weight_after: 24000,
      occupancy_before: 70,
      occupancy_after: 92,
      distance_before: 260,
      distance_after: 320,
      additional_distance: 60,
      deliveries_before: 1,
      deliveries_after: 2,
      freight_before: 2200,
      freight_after: 2750,
      toll_before: 180,
      toll_after: 250,
      reason_code: '4',
      reason_description: 'Falta de volume / consolidação de carga',
      user_observation: 'Segundo atendimento na rota',
      created_by: 'operador1@ciafal.logistica',
      created_by_role: 'planejador_cargas',
      ai_analysis: 'Ocupação final acima de 90%.',
      ai_user_alignment: 'Coerente',
      ai_risk_level: 'FAVORAVEL',
      ai_alert_flag: false,
      status: 'ATIVA',
      created_at_dt: '2025-05-12T11:00:00.000Z',
    },
    {
      id: 'ra-3',
      cargo_number: 'CARGA-8803',
      transport_number: 'TR-1003',
      original_itinerary_id: 'MG-07',
      original_itinerary_description: 'Contagem -> Juiz de Fora',
      added_itinerary_id: 'MG-12',
      added_itinerary_description: 'Barbacena',
      customer_name: 'Aços Barbacena Ltda',
      customer_code: 'CLI-002',
      destination_city: 'Barbacena',
      destination_uf: 'MG',
      weight_before: 17500,
      weight_after: 23800,
      occupancy_before: 62,
      occupancy_after: 90,
      distance_before: 260,
      distance_after: 315,
      additional_distance: 55,
      deliveries_before: 1,
      deliveries_after: 2,
      freight_before: 2200,
      freight_after: 2680,
      toll_before: 180,
      toll_after: 240,
      reason_code: '4',
      reason_description: 'Falta de volume / consolidação de carga',
      user_observation: 'Volume insuficiente na origem',
      created_by: 'operador2@ciafal.logistica',
      created_by_role: 'planejador_cargas',
      ai_analysis: 'Excelente diluição de custo.',
      ai_user_alignment: 'Coerente',
      ai_risk_level: 'FAVORAVEL',
      ai_alert_flag: false,
      status: 'ATIVA',
      created_at_dt: '2025-05-15T09:00:00.000Z',
    },
  ]

  const mockOperationalHistory = [
    {
      id: 'hist-1',
      transport_order_number: 'CARGA-7001',
      sap_transport_number: 'TR-9001',
      itinerary_code: 'SP-01',
      itinerary_description: 'Contagem -> São Paulo Capital',
      destination_city: 'São Paulo',
      destination_uf: 'SP',
      region: 'Sudeste',
      customers_summary: 'Consórcio Paulistano',
      weight_kg: 25000,
      occupancy_pct: 95,
      distance_km: 580,
      discharges_count: 1,
      freight_cost_driver: 3800,
      toll_cost: 420,
      total_cost: 4220,
      transport_date: '2025-05-14T08:00:00.000Z',
      sap_user: 'planejador_auto',
    },
  ]

  it('deve converter entidades brutas para linhas detalhadas do relatório', () => {
    const { rows, filterOptions } = buildDetailedReportRows({
      routeAdditions: mockRouteAdditions,
      operationalHistory: mockOperationalHistory,
    })

    expect(rows.length).toBe(4) // 3 adições + 1 transporte padrão
    expect(filterOptions.ufs).toContain('MG')
    expect(filterOptions.ufs).toContain('SP')
    expect(filterOptions.itineraries.some((i) => i.code === 'MG-07')).toBe(true)
  })

  it('deve calcular corretamente os 11 cards executivos de resumo', () => {
    const { rows } = buildDetailedReportRows({
      routeAdditions: mockRouteAdditions,
      operationalHistory: mockOperationalHistory,
    })

    const cards = calculateItinerarySummaryCards(rows)

    expect(cards.totalLoads).toBe(4)
    expect(cards.loadsWithAddition).toBe(3)
    expect(cards.additionPercentage).toBe(75) // 3 de 4 = 75%
    expect(cards.totalAdditionalKm).toBe(165) // 50 + 60 + 55
    expect(cards.totalAdditionalDischarges).toBe(3) // 1 extra por carga
    expect(cards.avgOccupancyBefore).toBe(65.7) // (65 + 70 + 62) / 3 = 65.666
    expect(cards.avgOccupancyAfter).toBe(90) // (88 + 92 + 90) / 3 = 90
    expect(cards.avgOccupancyImpactPp).toBe(24.3)
    expect(cards.topDeviatedItinerary?.code).toBe('MG-07')
    expect(cards.topDeviatedItinerary?.count).toBe(3)
  })

  it('deve gerar análises gráficas estruturadas para todos os 9 gráficos exigidos', () => {
    const { rows } = buildDetailedReportRows({
      routeAdditions: mockRouteAdditions,
      operationalHistory: mockOperationalHistory,
    })

    const charts = buildChartAnalyses(rows, 'SEMANA')

    expect(charts.byReason.length).toBeGreaterThan(0)
    expect(charts.byItinerary.length).toBeGreaterThan(0)
    expect(charts.byUfRegion.length).toBeGreaterThan(0)
    expect(charts.byPeriod.length).toBeGreaterThan(0)
    expect(charts.byUser.length).toBeGreaterThan(0)
    expect(charts.occupancyComparison.length).toBeGreaterThan(0)
    expect(charts.byDistance.length).toBeGreaterThan(0)
    expect(charts.byFinancialCost.length).toBeGreaterThan(0)
    expect(charts.byCustomer.length).toBeGreaterThan(0)
  })

  it('deve identificar padrão recorrente no itinerário MG-07 via motor determinístico de IA', () => {
    const { rows } = buildDetailedReportRows({
      routeAdditions: mockRouteAdditions,
      operationalHistory: mockOperationalHistory,
    })

    const findings = generateItineraryAiDiagnosticReport(rows)

    const patternMg07 = findings.find((f) => f.targetEntity === 'MG-07')
    expect(patternMg07).toBeDefined()
    expect(patternMg07?.type).toBe('PADRAO_RECORRENTE')
    expect(patternMg07?.narrativeText).toContain('O itinerário MG-07 recebeu rota adicional')
    expect(patternMg07?.narrativeText).toContain('Falta de volume / consolidação de carga')
    expect(patternMg07?.recommendedActions.length).toBeGreaterThan(0)
  })

  it('deve aplicar filtros corretamente por UF e motivo', () => {
    const { rows } = buildDetailedReportRows({
      routeAdditions: mockRouteAdditions,
      operationalHistory: mockOperationalHistory,
    })

    const defaultParams: ItineraryReportFilterParams = {
      periodPreset: 'TODOS',
      company: 'TODOS',
      center: 'TODOS',
      itinerarySap: 'TODOS',
      uf: 'SP',
      region: 'TODOS',
      customer: 'TODOS',
      user: 'TODOS',
      reason: 'TODOS',
      additionStatus: 'TODOS',
      recordStatus: 'TODOS',
      kmImpactFilter: 'TODOS',
      costImpactFilter: 'TODOS',
      occupancyRange: 'TODOS',
      aiClassification: 'TODOS',
      searchQuery: '',
    }

    const filteredSp = applyItineraryReportFilters(rows, defaultParams)
    expect(filteredSp.length).toBe(1)
    expect(filteredSp[0].destinationUf).toBe('SP')
  })
})
