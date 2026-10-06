import { describe, it, expect } from 'vitest'
import {
  generateAutomaticDeviationDescription,
  generateAiKpiInvestigation,
  generateIndividualChartAiAnalysis,
  formatAbntNumber,
  formatAbntPercent,
  formatAbntCurrency,
  formatAbntDate,
} from '@/domain/tmsDeviationTreatmentEngine'
import { buildKpiMatrix } from '@/domain/tmsIndicatorsEngine'

describe('tmsDeviationTreatmentEngine (Padrão 8 Etapas e Análise Gráfica)', () => {
  it('deve gerar descrição automática do desvio no padrão canônico ABNT', () => {
    // Exemplo do usuário:
    // "Foi identificado desvio no indicador Tempo Médio de Permanência de Veículos em setembro/2026.
    // O resultado apurado foi de 4,8 h frente à meta de 3,5 h, representando desvio de +1,3 h."
    const desc = generateAutomaticDeviationDescription(
      'Tempo Médio de Permanência de Veículos',
      'Setembro/2026',
      4.8,
      3.5,
      'h',
    )

    expect(desc).toContain('Foi identificado desvio no indicador Tempo Médio de Permanência de Veículos em Setembro/2026.')
    expect(desc).toContain('O resultado apurado foi de 4,8 h frente à meta de 3,5 h')
    expect(desc).toContain('representando desvio de +1,3 h')
  })

  it('deve formatar valores estritamente segundo as normas ABNT brasileiras', () => {
    expect(formatAbntNumber(95.42, 1)).toBe('95,4')
    expect(formatAbntPercent(95.0)).toBe('95,0 %')
    expect(formatAbntCurrency(15420.5)).toBe('R$ 15.420,50')
    expect(formatAbntDate('2026-09-15T00:00:00.000Z')).toBe('15/09/2026')
  })

  it('deve estruturar investigação de IA separando Fato Identificado / Hipóteses / Evidências / Recomendações', () => {
    const sampleRecords = [
      {
        id: 'rec-1',
        transport_date: '2026-09-10T10:00:00.000Z',
        company_code: 'CIAFAL',
        origin_plant: 'Matriz Contagem',
        carrier_name: 'TRANSLOG EXPRESS',
        itinerary_code: 'IT-BH-SP',
        driver_name: 'Marcos Vinicius',
        destination_uf: 'SP',
        customer_name: 'METALURGICA ABC',
        is_on_time: false,
        final_status: 'ENCERRADO_COM_OCORRENCIA',
        total_internal_dwell_min: 190,
      },
    ]

    const matrix = buildKpiMatrix(sampleRecords, {}, 2026, { year: 2026 })
    const kpi = matrix.find((k) => k.id === 'tempo_permanencia_veiculo')!
    const setCell = kpi.months[8] // Setembro

    const res = generateAiKpiInvestigation(kpi, setCell, sampleRecords)

    expect(res.identifiedFact).toBeTruthy()
    expect(res.hypotheses.length).toBeGreaterThan(0)
    expect(res.necessaryEvidences.length).toBeGreaterThan(0)
    expect(res.recommendations.length).toBeGreaterThan(0)
    expect(res.aiText).toContain('=== FATO IDENTIFICADO ===')
    expect(res.aiText).toContain('=== HIPÓTESES PRELIMINARES ===')
    expect(res.aiText).toContain('=== EVIDÊNCIAS NECESSÁRIAS ===')
    expect(res.aiText).toContain('=== RECOMENDAÇÕES DA IA ===')
    expect(res.aiText).toContain('requer validação humana')
  })

  it('deve gerar análise executiva para o gráfico individual sem dados mockados', () => {
    const sampleRecords = [
      {
        id: 'rec-1',
        transport_date: '2026-03-10T10:00:00.000Z',
        company_code: 'CIAFAL',
        carrier_name: 'RODOLOG',
        is_on_time: false,
        final_status: 'ENCERRADO_COM_OCORRENCIA',
        total_internal_dwell_min: 180,
      },
    ]

    const matrix = buildKpiMatrix(sampleRecords, {}, 2026, { year: 2026 })
    const kpi = matrix.find((k) => k.id === 'tempo_permanencia_veiculo')!

    const chartAi = generateIndividualChartAiAnalysis(kpi, kpi.months)

    expect(chartAi.executiveSummary).toBeTruthy()
    expect(chartAi.mainDeviation).toBeTruthy()
    expect(chartAi.whenStarted).toBeTruthy()
    expect(chartAi.recurrenceIdentified).toBeTruthy()
    expect(chartAi.investigationPoint).toBeTruthy()
    expect(chartAi.recommendedAction).toBeTruthy()
  })

  it('deve retornar mensagem clara caso não existam dados disponíveis para o período', () => {
    const emptyKpi = {
      id: 'kpi_vazio',
      seq: 1,
      name: 'KPI Sem Dados',
      category: 'LOGISTICA' as const,
      description: 'Desc',
      unit: '%',
      rule: 'GTE' as const,
      targetConfig: {
        kpi_id: 'kpi_vazio',
        kpi_name: 'KPI Sem Dados',
        category: 'LOGISTICA' as const,
        year: 2026,
        target_value: 95,
        rule: 'GTE' as const,
        unit: '%',
        responsible: 'Carlos',
      },
      months: [],
      ytdReal: null,
      ytdTarget: 95,
      ytdStatus: 'SEM_DADOS' as const,
      formattedYtdReal: 'Sem dados',
      formattedYtdTarget: '95,0 %',
      bestMonth: '—',
      worstMonth: '—',
      trend: 'STABLE' as const,
      totalRecordsYear: 0,
      dataSource: 'SAP',
      hasIntegration: false,
      lastUpdate: new Date().toISOString(),
    }

    const chartAi = generateIndividualChartAiAnalysis(emptyKpi, [])
    expect(chartAi.executiveSummary).toBe('Não existem dados disponíveis para o período selecionado.')
  })
})
