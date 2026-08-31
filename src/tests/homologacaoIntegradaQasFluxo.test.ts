import { describe, it, expect, beforeEach } from 'vitest'
import {
  parseZsd35WorksheetData,
  createZsd35ImportReport,
  transformZsd35RowsToSalesOrders,
  SAMPLE_VALID_ZSD35_ROW,
} from '@/domain/zsd35ImportEngine'
import {
  avaliar_montagem_carga,
  avaliar_alocacao_motorista,
  SapSalesOrder,
  Vehicle,
  Driver,
  QueueEntry,
} from '@/domain/rules'
import { generateOptimizationScenarios } from '@/domain/optimizerEngine'
import {
  createFreightNegotiation,
  generateCarlaoFirstOffer,
} from '@/domain/carlaoNegotiationEngine'
import {
  createFredTransportRecord,
  registerFredTrackingCheckpoint,
} from '@/domain/fredTrackingEngine'
import {
  registerExpeditionTrackingEvent,
} from '@/domain/expeditionTowerEngine'

describe('Homologação Integrada QAS — Fluxo Completo Ponta a Ponta Sem Mocks', () => {
  // ETAPA 1: IMPORTAÇÃO ZSD35A EXCEL
  it('ETAPA 1: Importação ZSD35A com origem EXCEL_QAS_ZSD35A_V3 e sem mocks', () => {
    const rawRows = [
      SAMPLE_VALID_ZSD35_ROW,
      {
        ...SAMPLE_VALID_ZSD35_ROW,
        'Doc.vendas': '258521',
        Item: '000010',
        'Material ': 'CANTONEIRA 2X3/16',
        'Denominação': 'Cantoneira Abas Iguais 2 x 3/16',
        'Qtd.confirmada': '12.000',
        'Valor líquido': '48.000,00',
      },
      {
        'Doc.vendas': 'Total Geral',
        'Qtd.confirmada': '26.500',
      },
    ]

    const parsed = parseZsd35WorksheetData(rawRows)
    expect(parsed.totalRowsRead).toBe(3)
    expect(parsed.validRows.length).toBe(2)
    expect(parsed.discardedSubtotalRows).toBe(1)
    expect(parsed.uniqueSalesOrdersCount).toBe(2)

    const report = createZsd35ImportReport(parsed, 'ZSD35 Carga TMS v3.xlsx', 'test_user')
    expect(report.origem_dado).toBe('EXCEL_QAS_ZSD35A_V3')
    expect(report.status).toBe('VALIDADO_COM_SUCESSO')
    expect(report.total_items_read).toBe(3)
    expect(report.total_valid_items).toBe(2)

    const orders = transformZsd35RowsToSalesOrders(parsed.validRows, report.batch_code)
    expect(orders.length).toBe(2)
    expect(orders[0].origem_dado).toBe('EXCEL_QAS_ZSD35A_V3')
    expect(orders[0].order_number).toBe('258520')
  })

  // ETAPA 2 & 4: CARTEIRA → PLANEJADOR & MONTAGEM DETERMINÍSTICA
  it('ETAPA 2 & 4 & 5: Carteira → Planejador → Avaliação Determinística de Carga', () => {
    const order1: SapSalesOrder = {
      id: 'ord-1',
      order_number: '258520',
      item_number: '000010',
      customer_code: '100452',
      customer_name: 'METALURGICA SAO CARLOS LTDA',
      destination_city: 'Sao Carlos',
      uf: 'SP',
      material: 'BARRA CHATA 1/2X1/8',
      material_description: 'Barra Chata Laminada 1/2 x 1/8',
      weight_kg: 14500,
      total_value: 58000,
      itinerary_code: 'ITIN-SP-INTERIOR',
      production_status: 'Pronto',
      credit_status: 'Liberado',
      origem_dado: 'EXCEL_QAS_ZSD35A_V3',
    }

    const order2: SapSalesOrder = {
      id: 'ord-2',
      order_number: '258521',
      item_number: '000010',
      customer_code: '100453',
      customer_name: 'ESTRUTURAS METALICAS ARARAQUARA',
      destination_city: 'Araraquara',
      uf: 'SP',
      material: 'CANTONEIRA 2X3/16',
      material_description: 'Cantoneira Abas Iguais 2 x 3/16',
      weight_kg: 12500,
      total_value: 49000,
      itinerary_code: 'ITIN-SP-INTERIOR',
      production_status: 'Pronto',
      credit_status: 'Liberado',
      origem_dado: 'EXCEL_QAS_ZSD35A_V3',
    }

    const vehicle: Vehicle = {
      id: 'v-01',
      plate: 'ABC-1D23',
      type: 'Carreta 5 Eixos',
      capacity_kg: 28000,
    }

    const evaluation = avaliar_montagem_carga({
      orders: [order1, order2],
      vehicle,
      targetItineraryCode: 'ITIN-SP-INTERIOR',
    })

    expect(evaluation.calculatedWeightKg).toBe(27000)
    expect(evaluation.capacityKg).toBe(28000)
    expect(evaluation.occupancyPercentage).toBeCloseTo(96.4, 1)
    expect(evaluation.decision).toBe('permitida')
  })

  // ETAPA 6 & 7: ROTEIRIZADOR & OTIMIZADOR (SEM CENÁRIOS PREENCHIDOS SE VAZIO)
  it('ETAPA 6: Otimizador não inventa cenários se a base for vazia (Regra de ouro)', () => {
    const emptyScenarios = generateOptimizationScenarios({
      orders: [],
      stocks: [],
      pcpOrders: [],
      queueEntries: [],
      itineraryCode: 'ITIN-SP-INTERIOR',
      plannedDate: '2026-08-31',
      vehicleCapacityKg: 28000,
      vehicleType: 'Carreta 5 Eixos',
    })

    expect(emptyScenarios.length).toBe(0)
  })

  it('ETAPA 6 & 7: Otimizador gera cenários com dados reais e score rastreável', () => {
    const orders: SapSalesOrder[] = [
      {
        id: 'ord-1',
        order_number: '258520',
        item_number: '000010',
        customer_code: '100452',
        customer_name: 'METALURGICA SAO CARLOS LTDA',
        destination_city: 'Sao Carlos',
        uf: 'SP',
        material: 'BARRA CHATA 1/2X1/8',
        material_description: 'Barra Chata Laminada 1/2 x 1/8',
        weight_kg: 14500,
        total_value: 58000,
        itinerary_code: 'ITIN-SP-INTERIOR',
        production_status: 'Pronto',
        credit_status: 'Liberado',
        origem_dado: 'EXCEL_QAS_ZSD35A_V3',
      },
      {
        id: 'ord-2',
        order_number: '258521',
        item_number: '000010',
        customer_code: '100453',
        customer_name: 'ESTRUTURAS METALICAS ARARAQUARA',
        destination_city: 'Araraquara',
        uf: 'SP',
        material: 'CANTONEIRA 2X3/16',
        material_description: 'Cantoneira Abas Iguais 2 x 3/16',
        weight_kg: 12500,
        total_value: 49000,
        itinerary_code: 'ITIN-SP-INTERIOR',
        production_status: 'Pronto',
        credit_status: 'Liberado',
        origem_dado: 'EXCEL_QAS_ZSD35A_V3',
      },
    ]

    const stocks = [
      {
        id: 'stk-1',
        material_code: 'BARRA CHATA 1/2X1/8',
        material_description: 'Barra Chata Laminada 1/2 x 1/8',
        plant: '1000',
        storage_location: 'DP34',
        available_qty: 30,
        weight_kg: 30000,
        unit: 'TO',
        status: 'Disponivel',
        last_sync: '2026-08-31T10:00:00Z',
      },
      {
        id: 'stk-2',
        material_code: 'CANTONEIRA 2X3/16',
        material_description: 'Cantoneira Abas Iguais 2 x 3/16',
        plant: '1000',
        storage_location: 'DP34',
        available_qty: 20,
        weight_kg: 20000,
        unit: 'TO',
        status: 'Disponivel',
        last_sync: '2026-08-31T10:00:00Z',
      },
    ]

    const queueEntries: QueueEntry[] = [
      {
        id: 'q-1',
        driver_id: 'drv-01',
        driver_name_cached: 'Motorista Real QAS',
        driver_phone_cached: '(11) 99999-0000',
        type: 'PORTA',
        status: 'disponivel',
        position: 1,
        preferred_itinerary: 'ITIN-SP-INTERIOR',
        vehicle_capacity_kg_cached: 28000,
        vehicle_plate_cached: 'QAS-1234',
        vehicle_type_cached: 'Carreta 5 Eixos',
        checkin_time: '2026-08-31T08:00:00Z',
      },
    ]

    const scenarios = generateOptimizationScenarios({
      orders,
      stocks,
      pcpOrders: [],
      queueEntries,
      itineraryCode: 'ITIN-SP-INTERIOR',
      plannedDate: '2026-08-31',
      vehicleCapacityKg: 28000,
      vehicleType: 'Carreta 5 Eixos',
    })

    expect(scenarios.length).toBeGreaterThan(0)
    const immediate = scenarios.find((s) => s.id === 'scenario_a_immediate')
    expect(immediate).toBeDefined()
    if (immediate) {
      expect(immediate.totalWeightKg).toBe(27000)
      expect(immediate.occupancyPct).toBeCloseTo(96.4, 1)
      expect(immediate.scoreBreakdown.totalScore).toBeGreaterThan(50)
      expect(immediate.eligiblePortaDriversCount).toBe(1)
    }
  })

  // ETAPA 8 & 9: MESA DE FRETES & CONTRATAÇÃO
  it('ETAPA 8 & 9: Mesa de Fretes e Negociação Carlão em cima da mesma CargaTMS', () => {
    const neg = createFreightNegotiation({
      cargo_id: 'CARGA-QAS-001',
      itinerary_code: 'ITIN-SP-INTERIOR',
      driver_id: 'drv-01',
      driver_name: 'Motorista Real QAS',
      target_value: 4000.0,
      antt_floor_value: 3600.0,
      operator: 'operador@ciafal.com.br',
    })

    expect(neg.cargo_id).toBe('CARGA-QAS-001')
    expect(neg.status).toBe('Aguardando envio')
    expect(neg.target_value).toBe(4000.0)

    const firstOffer = generateCarlaoFirstOffer({
      cargoId: 'CARGA-QAS-001',
      targetValue: 4000.0,
      anttFloorValue: 3600.0,
      driverName: 'Motorista Real QAS',
      vehiclePlate: 'QAS-1234',
      itineraryCode: 'ITIN-SP-INTERIOR',
      totalWeightKg: 27000,
    })

    expect(firstOffer.offerValue).toBeGreaterThanOrEqual(3600.0)
    expect(firstOffer.offerValue).toBeLessThanOrEqual(4000.0)
  })

  // ETAPA 10, 11 & 12: EXPEDIÇÃO → TRANSPORTE → FRED
  it('ETAPA 10 & 11 & 12: Expedição e Telemetria Fred vinculadas a CargaTMS e Transporte', () => {
    const transport = createFredTransportRecord({
      cargo_id: 'CARGA-QAS-001',
      driver_id: 'drv-01',
      driver_name: 'Motorista Real QAS',
      driver_phone: '(11) 99999-0000',
      vehicle_plate: 'QAS-1234',
      vehicle_type: 'Carreta 5 Eixos',
      itinerary_code: 'ITIN-SP-INTERIOR',
      origin_city: 'Piracicaba',
      destination_city: 'Sao Carlos',
      destination_uf: 'SP',
      total_weight_kg: 27000,
      contracted_freight_value: 3900.0,
      orders_count: 2,
    })

    expect(transport.cargo_id).toBe('CARGA-QAS-001')
    expect(transport.status).toBe('CRIADO')

    const checkpoint = registerFredTrackingCheckpoint({
      transport_id: transport.id,
      checkpoint_type: 'CHECKIN_EXPEDICAO',
      description: 'Veículo deu entrada na portaria industrial CIAFAL',
      operator: 'portaria@ciafal.com.br',
    })

    expect(checkpoint.transport_id).toBe(transport.id)
    expect(checkpoint.checkpoint_type).toBe('CHECKIN_EXPEDICAO')
  })
})
