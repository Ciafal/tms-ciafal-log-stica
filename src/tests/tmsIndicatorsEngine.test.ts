import { describe, it, expect } from 'vitest'
import {
  OFFICIAL_TMS_KPIS,
  formatKpiValue,
  evaluateKpiStatus,
  buildKpiMatrix,
  runAiKpiDiagnosis,
  KpiTargetConfig,
} from '@/domain/tmsIndicatorsEngine'

describe('tmsIndicatorsEngine', () => {
  it('deve conter exatamente os 22 indicadores oficiais (8 Expedição, 6 Logística, 8 Transporte)', () => {
    expect(OFFICIAL_TMS_KPIS.length).toBe(22)

    const expedicao = OFFICIAL_TMS_KPIS.filter((k) => k.category === 'EXPEDICAO')
    const logistica = OFFICIAL_TMS_KPIS.filter((k) => k.category === 'LOGISTICA')
    const transporte = OFFICIAL_TMS_KPIS.filter((k) => k.category === 'TRANSPORTE')

    expect(expedicao.length).toBe(8)
    expect(logistica.length).toBe(6)
    expect(transporte.length).toBe(8)
  })

  it('deve formatar valores segundo padrão brasileiro estrito ABNT', () => {
    expect(formatKpiValue(95.4, '%')).toBe('95,4 %')
    expect(formatKpiValue(125.4, 'R$')).toBe('R$ 125,40')
    expect(formatKpiValue(142.5, 'R$/t')).toBe('R$ 142,50/t')
    expect(formatKpiValue(25.8, 't')).toBe('25,80 t')
    expect(formatKpiValue(84, 'min')).toBe('01h 24min')
    expect(formatKpiValue(458, 'km')).toBe('458 km')
    expect(formatKpiValue(null, '%')).toBe('—')
  })

  it('deve avaliar regras de meta Real x Meta corretamente (GTE, LTE, EQ, BETWEEN)', () => {
    // GTE (Maior ou igual)
    expect(evaluateKpiStatus(96, 95, 'GTE')).toBe('ATENDIDA')
    expect(evaluateKpiStatus(94.9, 95, 'GTE')).toBe('FORA_DA_META')

    // LTE (Menor ou igual)
    expect(evaluateKpiStatus(110, 120, 'LTE')).toBe('ATENDIDA')
    expect(evaluateKpiStatus(125, 120, 'LTE')).toBe('FORA_DA_META')

    // EQ
    expect(evaluateKpiStatus(100, 100, 'EQ')).toBe('ATENDIDA')
    expect(evaluateKpiStatus(98, 100, 'EQ')).toBe('FORA_DA_META')

    // BETWEEN
    expect(evaluateKpiStatus(95, 90, 'BETWEEN', 98)).toBe('ATENDIDA')
    expect(evaluateKpiStatus(99, 90, 'BETWEEN', 98)).toBe('FORA_DA_META')

    // Sem dados
    expect(evaluateKpiStatus(null, 95, 'GTE')).toBe('SEM_DADOS')
  })

  it('deve marcar "Sem dados disponíveis / integração pendente" e zero dados fictícios para KPIs sem suporte', () => {
    const mockTargets: Record<string, KpiTargetConfig> = {}
    const matrix = buildKpiMatrix(
      [],
      mockTargets,
      2026,
      { year: 2026, category: 'TODOS' },
    )

    expect(matrix.length).toBe(22)

    // Cargas Impedidas por Falta de Estoque (Item 12 - sem dados simulados)
    const faltaEstoque = matrix.find((k) => k.id === 'cargas_impedidas_falta_estoque')
    expect(faltaEstoque).toBeDefined()
    expect(faltaEstoque?.hasIntegration).toBe(false)
    expect(faltaEstoque?.ytdStatus).toBe('SEM_DADOS')
    expect(faltaEstoque?.formattedYtdReal).toBe('Sem dados disponíveis')
  })

  it('deve calcular corretamente indicadores reais a partir de registros operacionais', () => {
    const sampleRecords = [
      {
        id: 'rec-1',
        transport_date: '2026-02-10T10:00:00.000Z',
        company_code: 'CIAFAL',
        origin_plant: 'Matriz Contagem',
        carrier_name: 'TRANSLOG CIAFAL',
        driver_name: 'Carlos da Silva',
        is_on_time: true,
        final_status: 'CONCLUIDO',
        total_internal_dwell_min: 95,
        internal_waiting_min: 20,
        loading_duration_min: 50,
        invoicing_duration_min: 15,
        weight_ton: 30.0,
        vehicle_capacity_ton: 32.0,
        occupancy_pct: 93.75,
        freight_cost_driver: 3000,
        freight_billed_customer: 4200,
        margin_pct: 28.5,
        delay_minutes: 0,
        driver_rating: 4.8,
      },
      {
        id: 'rec-2',
        transport_date: '2026-02-15T14:00:00.000Z',
        company_code: 'CIAFAL',
        origin_plant: 'Matriz Contagem',
        carrier_name: 'TRANSLOG CIAFAL',
        driver_name: 'Jose Pereira',
        is_on_time: false,
        final_status: 'ENCERRADO_COM_OCORRENCIA',
        total_internal_dwell_min: 160,
        internal_waiting_min: 45,
        loading_duration_min: 75,
        invoicing_duration_min: 40,
        weight_ton: 20.0,
        vehicle_capacity_ton: 30.0,
        occupancy_pct: 66.6,
        freight_cost_driver: 2500,
        freight_billed_customer: 2800,
        margin_pct: 10.7,
        delay_minutes: 45,
        driver_rating: 3.5,
      },
    ]

    const matrix = buildKpiMatrix(
      sampleRecords,
      {},
      2026,
      { year: 2026, category: 'TODOS' },
    )

    // OTIF Expedição: 1 on_time em 2 = 50%
    const otif = matrix.find((k) => k.id === 'otif_expedicao')
    expect(otif?.ytdReal).toBe(50.0)
    expect(otif?.ytdStatus).toBe('FORA_DA_META') // Meta padrão 95%
    expect(otif?.months[1].hasData).toBe(true) // Fevereiro
    expect(otif?.months[1].realValue).toBe(50.0)

    // Tempo de Permanência do Veículo: (95 + 160) / 2 = 127.5 min
    const dwell = matrix.find((k) => k.id === 'tempo_permanencia_veiculo')
    expect(dwell?.ytdReal).toBe(127.5)
    expect(dwell?.ytdStatus).toBe('FORA_DA_META') // Meta padrão <= 120 min

    // Custo Médio Frete por Tonelada: (3000 + 2500) / (30 + 20) = 5500 / 50 = 110 R$/t
    const freightTon = matrix.find((k) => k.id === 'custo_medio_frete_tonelada')
    expect(freightTon?.ytdReal).toBe(110.0)
    expect(freightTon?.ytdStatus).toBe('ATENDIDA') // Meta padrão <= 160 R$/t
  })

  it('deve acionar diagnóstico determinístico de IA correlacionando causas reais sem alucinação', () => {
    const sampleRecords = [
      {
        id: 'rec-1',
        transport_date: '2026-02-10T10:00:00.000Z',
        carrier_name: 'TRANSLOG EXPRESS',
        itinerary_code: 'IT-BH-SP',
        is_on_time: false,
        final_status: 'ENCERRADO_COM_OCORRENCIA',
        total_internal_dwell_min: 155,
        occurrences_summary: 'Atraso na balança de saída e conferência de amarração',
      },
    ]

    const matrix = buildKpiMatrix(sampleRecords, {}, 2026, { year: 2026 })
    const dwellKpi = matrix.find((k) => k.id === 'tempo_permanencia_veiculo')!
    const fevCell = dwellKpi.months[1]

    const diagnosis = runAiKpiDiagnosis(dwellKpi, fevCell)

    expect(diagnosis.hasDeviation).toBe(true)
    expect(diagnosis.status).toBe('FORA_DA_META')
    expect(diagnosis.diagnostic).toContain('TRANSLOG EXPRESS')
    expect(diagnosis.diagnostic).toContain('IT-BH-SP')
    expect(diagnosis.suggestedAction.targetModule).toBe('EXPEDICAO')
    expect(diagnosis.suggestedAction.action).toBeTruthy()
  })

  it('deve retornar mensagem canônica caso não haja evidências suficientes', () => {
    const mockKpi = {
      id: 'mock_sem_dados',
      seq: 99,
      name: 'Indicador Sem Dados',
      category: 'LOGISTICA' as const,
      description: 'Desc',
      unit: '%',
      rule: 'GTE' as const,
      targetConfig: {
        kpi_id: 'mock_sem_dados',
        kpi_name: 'Indicador Sem Dados',
        category: 'LOGISTICA' as const,
        year: 2026,
        target_value: 95,
        rule: 'GTE' as const,
        unit: '%',
        responsible: 'Gestor',
      },
      months: [
        {
          month: 1,
          monthLabel: 'Jan',
          year: 2026,
          realValue: null,
          targetValue: 95,
          status: 'SEM_DADOS' as const,
          formattedValue: '—',
          formattedTarget: '95,0 %',
          recordsCount: 0,
          hasData: false,
          drillDownRecords: [],
        },
      ],
      ytdReal: null,
      ytdTarget: 95,
      ytdStatus: 'SEM_DADOS' as const,
      formattedYtdReal: 'Sem dados',
      formattedYtdTarget: '95,0 %',
      bestMonth: '—',
      worstMonth: '—',
      trend: 'STABLE' as const,
      totalRecordsYear: 0,
      dataSource: 'Fonte Externa',
      hasIntegration: false,
      lastUpdate: new Date().toISOString(),
    }

    const diagnosis = runAiKpiDiagnosis(mockKpi, mockKpi.months[0])
    expect(diagnosis.diagnostic).toBe(
      'Não há evidências suficientes para confirmar a causa. Recomenda-se verificar a integração com a fonte de dados primária.',
    )
    expect(diagnosis.evidenceSufficient).toBe(false)
  })
})
