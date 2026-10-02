import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  GENERAL_TRANSPORT_COLUMNS,
  formatReportValue,
  GeneralTransportRecord,
} from '@/domain/generalTransportReportEngine'
import { generalTransportReportService } from '@/services/generalTransportReportService'
import { pb } from '@/lib/pocketbase/client'

describe('Motor do Relatório Geral Transporte (43 Colunas Canônicas SAP)', () => {
  it('deve conter exatamente 43 colunas canônicas na sequência correta de 1 a 43', () => {
    expect(GENERAL_TRANSPORT_COLUMNS.length).toBe(43)

    // Validar sequência ordinal 1 a 43
    GENERAL_TRANSPORT_COLUMNS.forEach((col, index) => {
      expect(col.seq).toBe(index + 1)
      expect(col.sapTitle).toBeTruthy()
      expect(col.label).toBeTruthy()
      expect(col.key).toBeTruthy()
    })

    // Checar campos críticos da especificação
    expect(GENERAL_TRANSPORT_COLUMNS[0].sapTitle).toBe('Cen.')
    expect(GENERAL_TRANSPORT_COLUMNS[1].sapTitle).toBe('Descrição Centro')
    expect(GENERAL_TRANSPORT_COLUMNS[2].sapTitle).toBe('Stts.Trnsp')
    expect(GENERAL_TRANSPORT_COLUMNS[3].sapTitle).toBe('Transporte')
    expect(GENERAL_TRANSPORT_COLUMNS[7].sapTitle).toBe('Motivo Balança')
    expect(GENERAL_TRANSPORT_COLUMNS[8].sapTitle).toBe('ID ext.1')
    expect(GENERAL_TRANSPORT_COLUMNS[9].sapTitle).toBe('Frete')
    expect(GENERAL_TRANSPORT_COLUMNS[10].sapTitle).toBe('Pedágio')
    expect(GENERAL_TRANSPORT_COLUMNS[11].sapTitle).toBe('Peso Br(t)')
    expect(GENERAL_TRANSPORT_COLUMNS[12].sapTitle).toBe('Tara')
    expect(GENERAL_TRANSPORT_COLUMNS[13].sapTitle).toBe('Peso Líq.')
    expect(GENERAL_TRANSPORT_COLUMNS[14].sapTitle).toBe('Peso NF(t)')
    expect(GENERAL_TRANSPORT_COLUMNS[15].sapTitle).toBe('Dif. (t)')
    expect(GENERAL_TRANSPORT_COLUMNS[16].sapTitle).toBe('Dif. (%)')

    // Validar os pares duplicados com chaves independentes
    // Par 1 (posições 30 e 31): Data Fim 1 / Hora Fim 1
    expect(GENERAL_TRANSPORT_COLUMNS[29].key).toBe('end_date_1')
    expect(GENERAL_TRANSPORT_COLUMNS[30].key).toBe('end_time_1')
    // Par 2 (posições 33 e 34): Data Fim 2 / Hora Fim 2
    expect(GENERAL_TRANSPORT_COLUMNS[32].key).toBe('end_date_2')
    expect(GENERAL_TRANSPORT_COLUMNS[33].key).toBe('end_time_2')

    // Último campo (posição 43): RFID
    expect(GENERAL_TRANSPORT_COLUMNS[42].sapTitle).toBe('RFID')
    expect(GENERAL_TRANSPORT_COLUMNS[42].key).toBe('rfid_code')
  })

  it('deve formatar valores monetários, pesos, percentuais e datas no padrão brasileiro ABNT', () => {
    // Monetário (R$)
    const formattedCurrency = formatReportValue(3300, 'currency')
    expect(formattedCurrency).toContain('3.300,00')
    expect(formattedCurrency).toContain('R$')

    // Peso em toneladas com 3 casas decimais
    const formattedWeight = formatReportValue(21.42, 'weight')
    expect(formattedWeight).toBe('21,420 t')

    // Percentual com 2 casas decimais
    const formattedPercent = formatReportValue(97.65, 'percent')
    expect(formattedPercent).toBe('97,65%')

    // Distância em km
    const formattedDist = formatReportValue(480, 'distance')
    expect(formattedDist).toBe('480 km')

    // Duração em minutos
    const formattedDur = formatReportValue(130, 'duration')
    expect(formattedDur).toBe('130 min')

    // Valores nulos ou vazios
    expect(formatReportValue(null, 'text')).toBe('—')
    expect(formatReportValue(undefined, 'currency')).toBe('—')
    expect(formatReportValue('', 'weight')).toBe('—')
  })

  it('deve consultar e mapear os registros históricos integrados do PocketBase', async () => {
    const result = await generalTransportReportService.getGeneralTransportReport(
      { page: 1, perPage: 25 },
      { email: 'test@ciafal.com.br', name: 'Test Operator', role: 'admin_master' },
    )

    expect(result).toBeDefined()
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.totalItems).toBeGreaterThan(0)
    expect(result.availableStatuses.length).toBeGreaterThan(0)

    const first = result.items[0]
    expect(first.transport_number).toBeTruthy()
    expect(first.center_code).toBeTruthy()
    expect(first.transport_status).toBeTruthy()
    expect(first.external_id_1).toBeTruthy()
    expect(first.gross_weight_ton).toBeGreaterThanOrEqual(0)
    expect(first.tare_weight_ton).toBeGreaterThanOrEqual(0)
    expect(first.net_weight_ton).toBeGreaterThanOrEqual(0)
  })

  it('deve filtrar corretamente por número de transporte e por placa', async () => {
    // Filtro por transporte específico (ex: 800101)
    const filterTransp = await generalTransportReportService.getGeneralTransportReport({
      transport: '800101',
    })
    expect(filterTransp.items.length).toBeGreaterThanOrEqual(1)
    expect(
      filterTransp.items.every(
        (i) => i.transport_number.includes('800101') || i.sap_transport_number.includes('800101'),
      ),
    ).toBe(true)

    // Filtro por placa
    const filterPlate = await generalTransportReportService.getGeneralTransportReport({
      plate: 'CIA1A23',
    })
    expect(filterPlate.items.length).toBeGreaterThanOrEqual(1)
    expect(filterPlate.items[0].external_id_1.replace(/[^A-Za-z0-9]/g, '')).toContain('CIA1A23')
  })
})
