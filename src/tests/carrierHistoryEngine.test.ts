import { describe, it, expect } from 'vitest'
import {
  CarrierOperationalRecord,
  CarrierEvaluationRecord,
  CarrierComplaintRecord,
  CarrierComplimentRecord,
  buildDriver360,
  buildVehicleConsolidated,
  buildItineraryAnalysis,
  buildExpeditionTimesAnalysis,
  calculateExplicableScore,
  getDriverHiringSupport,
} from '@/domain/carrierHistoryEngine'

describe('Motor de Histórico Motoristas/Veículos e Avaliação de Prestadores', () => {
  // Dados de teste realistas
  const mockHistory: CarrierOperationalRecord[] = [
    {
      id: 'hist-1',
      transport_order_number: 'OT-800101',
      sap_transport_number: '800101',
      transport_date: '2026-09-10',
      driver_name: 'João da Silva',
      driver_id: 'DRV-001',
      driver_document_masked: '***.456.789-**',
      vehicle_plate: 'ABC1D23',
      vehicle_type: 'Carreta Bitrem',
      carrier_name: 'TransCiafal',
      itinerary_code: 'MG-SP-01',
      itinerary_description: 'Contagem MG -> Grande SP',
      destination_city: 'São Paulo',
      destination_uf: 'SP',
      discharges_count: 2,
      weight_ton: 32,
      weight_kg: 32000,
      loading_duration_min: 75,
      invoicing_duration_min: 30,
      total_internal_dwell_min: 135,
      route_actual_min: 520,
      route_estimated_min: 500,
      is_on_time: true,
      freight_cost_driver: 3500,
      freight_billed_customer: 4200,
      margin_pct: 16.6,
      driver_rating: 4.8,
      vehicle_rating: 4.5,
      final_status: 'CONCLUIDO',
    },
    {
      id: 'hist-2',
      transport_order_number: 'OT-800102',
      sap_transport_number: '800102',
      transport_date: '2026-09-15',
      driver_name: 'Pedro Alcantara', // Outro motorista no MESMO veículo ABC1D23
      driver_id: 'DRV-002',
      driver_document_masked: '***.123.456-**',
      vehicle_plate: 'ABC1D23',
      vehicle_type: 'Carreta Bitrem',
      carrier_name: 'TransCiafal',
      itinerary_code: 'MG-SP-01',
      destination_city: 'Campinas',
      destination_uf: 'SP',
      discharges_count: 1,
      weight_ton: 30,
      weight_kg: 30000,
      loading_duration_min: 60,
      total_internal_dwell_min: 110,
      route_actual_min: 550,
      is_on_time: true,
      freight_cost_driver: 3400,
      freight_billed_customer: 4100,
      margin_pct: 17.0,
      driver_rating: 4.2,
      vehicle_rating: 4.5,
      final_status: 'CONCLUIDO',
    },
    {
      id: 'hist-3',
      transport_order_number: 'OT-800103',
      sap_transport_number: '800103',
      transport_date: '2026-09-20',
      driver_name: 'João da Silva', // Mesmo motorista em OUTRO veículo XYZ9A88
      driver_id: 'DRV-001',
      driver_document_masked: '***.456.789-**',
      vehicle_plate: 'XYZ9A88',
      vehicle_type: 'Truck Graneleiro',
      carrier_name: 'TransCiafal',
      itinerary_code: 'MG-RJ-02',
      destination_city: 'Rio de Janeiro',
      destination_uf: 'RJ',
      discharges_count: 3,
      weight_ton: 14,
      weight_kg: 14000,
      loading_duration_min: 90,
      total_internal_dwell_min: 160,
      route_actual_min: 480,
      is_on_time: false,
      delay_minutes: 40,
      occurrences_count: 1,
      freight_cost_driver: 2100,
      freight_billed_customer: 2450,
      margin_pct: 14.2,
      driver_rating: 4.5,
      vehicle_rating: 3.8,
      final_status: 'ENCERRADO_COM_OCORRENCIA',
    },
  ]

  const mockComplaints: CarrierComplaintRecord[] = [
    {
      complaint_number: 'REC-2026-001',
      target_type: 'MOTORISTA',
      driver_name: 'João da Silva',
      category: 'ATRASO',
      severity: 'BAIXA',
      origin_type: 'CLIENTE',
      description: 'Cliente relatou atraso de 40 min na descarga no Rio de Janeiro',
      status: 'PROCEDENTE', // Julgada procedente
    },
    {
      complaint_number: 'REC-2026-002',
      target_type: 'VEICULO',
      vehicle_plate: 'XYZ9A88',
      category: 'VEICULO',
      severity: 'MEDIA',
      origin_type: 'EXPEDICAO',
      description: 'Lona com pequeno rasgo no veículo XYZ9A88',
      status: 'PROCEDENTE', // Afeta veículo, NÃO João
    },
    {
      complaint_number: 'REC-2026-003',
      target_type: 'MOTORISTA',
      driver_name: 'Pedro Alcantara',
      category: 'COMPORTAMENTO',
      severity: 'MEDIA',
      origin_type: 'EXPEDICAO',
      description: 'Discussão na portaria',
      status: 'EM_ANALISE', // Ainda em análise — NÃO pode deduzir score definitivo
    },
  ]

  const mockCompliments: CarrierComplimentRecord[] = [
    {
      compliment_number: 'ELOG-2026-001',
      category: 'ELOGIO_CLIENTE',
      driver_name: 'João da Silva',
      vehicle_plate: 'ABC1D23',
      origin_type: 'CLIENTE',
      description: 'Excelente atendimento e descarregamento rápido',
    },
  ]

  it('1. Deve segregar veículo e motorista: 1 veículo com vários motoristas (ABC1D23)', () => {
    const v360 = buildVehicleConsolidated('ABC1D23', mockHistory, [], mockComplaints)
    expect(v360).not.toBeNull()
    expect(v360!.totalTransports).toBe(2)
    // O ranking de condutores do veículo ABC1D23 deve conter João e Pedro
    expect(v360!.driverRanking.length).toBe(2)
    const driverNames = v360!.driverRanking.map((d) => d.driverName)
    expect(driverNames).toContain('João da Silva')
    expect(driverNames).toContain('Pedro Alcantara')
  })

  it('2. Deve segregar motorista e veículo: 1 motorista com vários veículos (João da Silva)', () => {
    const d360 = buildDriver360('João da Silva', mockHistory, [], mockComplaints, mockCompliments)
    expect(d360).not.toBeNull()
    expect(d360!.totalTransports).toBe(2)
    // Conduziu 2 veículos distintos
    expect(d360!.uniqueVehicles.length).toBe(2)
    const plates = d360!.uniqueVehicles.map((v) => v.plate)
    expect(plates).toContain('ABC1D23')
    expect(plates).toContain('XYZ9A88')
  })

  it('3. Princípio de segregação de reclamação: falha no veículo XYZ9A88 não penaliza o motorista', () => {
    // A reclamação REC-2026-002 é sobre lona no veículo XYZ9A88
    const d360 = buildDriver360('João da Silva', mockHistory, [], mockComplaints, mockCompliments)
    expect(d360).not.toBeNull()
    // Apenas a reclamação com target_type MOTORISTA de João da Silva deve ser contada para ele
    expect(d360!.complaintsCount).toBe(1) // Apenas REC-2026-001
  })

  it('4. Reclamação em análise NÃO deduz o score definitivo (Direito de Contraditório)', () => {
    // Pedro Alcantara tem 1 reclamação EM_ANALISE
    const scorePedro = calculateExplicableScore({
      totalTransports: 5,
      onTimePct: 95,
      avgRating: 4.5,
      complaintsProcedenteCount: 0,
      complaintsEmAnaliseCount: 1, // Não penaliza
      complimentsCount: 0,
      occurrencesCount: 0,
    })

    // Score não pode ter dedução negativa pela reclamação em análise
    const fatorAnalise = scorePedro.fatores.find((f) => f.nome === 'Reclamações em Análise')
    expect(fatorAnalise).toBeDefined()
    expect(fatorAnalise!.tipo).toBe('neutro')
    expect(scorePedro.scoreFinal).toBeGreaterThanOrEqual(80)
  })

  it('5. Motorista sem histórico retorna indicador neutro de "NOVO_SEM_HISTORICO"', () => {
    const card = getDriverHiringSupport('Carlos Novo Prestador', mockHistory, mockComplaints, mockCompliments)
    expect(card.recommendation).toBe('NOVO_SEM_HISTORICO')
    expect(card.totalTransports).toBe(0)
    expect(card.justificationText).toContain('sem histórico prévio')
  })

  it('6. Análise por Itinerário compara motoristas e calcula métricas operacionais', () => {
    const itinAnalysis = buildItineraryAnalysis('MG-SP-01', mockHistory)
    expect(itinAnalysis).not.toBeNull()
    expect(itinAnalysis!.totalTransports).toBe(2)
    expect(itinAnalysis!.distinctDriversCount).toBe(2)
    expect(itinAnalysis!.driversComparison.length).toBe(2)
  })

  it('7. Tempos da Expedição separam tempo interno de responsabilidade do prestador', () => {
    const times = buildExpeditionTimesAnalysis(mockHistory)
    expect(times.totalRecords).toBe(3)
    expect(times.avgLoadingDurationMin).toBeGreaterThan(0)
    expect(times.pctInternalResponsibility).toBeGreaterThan(0)
    expect(times.pctCarrierResponsibility).toBeGreaterThan(0)
  })
})
