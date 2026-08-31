import { describe, it, expect } from 'vitest'
import {
  runGlobalCiafalOptimizer,
  inferItineraryForOrder,
  classifyOccupancyBand,
  validateDesiredDate,
  validateDp34Stock,
  classifyCredit,
} from '../domain/optimizerEngine'
import {
  SapSalesOrderEntity,
  SapStockCurrentEntity,
  PcpProductionOrderEntity,
  QueueEntryEntity,
} from '../domain/rules'

describe('CORREÇÃO FUNCIONAL — PROPOSTA AUTOMÁTICA DE CARGAS POR ITINERÁRIO (TMS CIAFAL)', () => {
  const mockOrders: SapSalesOrderEntity[] = [
    // Pedidos do itinerário SP001A (São Paulo)
    {
      id: 'ord-sp-1',
      order_number: '258837',
      item_number: '000010',
      customer_code: '10928',
      customer_name: 'EQUIPAMENTOS RODOVIARIOS RODRIGUES',
      destination_city: 'VOTUPORANGA',
      uf: 'SP',
      itinerary_code: 'SP001A',
      material: 'MAT-258837-000010',
      material_description: 'B. RED. 1/2',
      weight_kg: 14000,
      total_value: 45000,
      desired_date: '2026-08-20T00:00:00.000Z',
      credit_status: 'Liberado',
      production_status: 'Pronto',
      discharges_count: 1,
    },
    {
      id: 'ord-sp-2',
      order_number: '258837',
      item_number: '000020',
      customer_code: '10928',
      customer_name: 'EQUIPAMENTOS RODOVIARIOS RODRIGUES',
      destination_city: 'VOTUPORANGA',
      uf: 'SP',
      itinerary_code: 'SP001A',
      material: 'MAT-258837-000020',
      material_description: 'B. RED. 5/8',
      weight_kg: 13000,
      total_value: 42000,
      desired_date: '2026-08-20T00:00:00.000Z',
      credit_status: 'Liberado',
      production_status: 'Pronto',
      discharges_count: 1,
    },
    // Pedidos do itinerário MG001A (Belo Horizonte)
    {
      id: 'ord-mg-1',
      order_number: '258967',
      item_number: '000060',
      customer_code: '16946',
      customer_name: 'GBL IND E COM DE ARTEF DE METAIS',
      destination_city: 'CONTAGEM',
      uf: 'MG',
      itinerary_code: 'MG001A',
      material: 'MAT-258967-000060',
      material_description: 'CANT. 1.1/2 X 3/16',
      weight_kg: 27000,
      total_value: 89000,
      desired_date: '2026-08-25T00:00:00.000Z',
      credit_status: 'Liberado',
      production_status: 'Pronto',
      discharges_count: 2,
    },
    // Pedido com Data Futura (Anti-antecipação)
    {
      id: 'ord-future-1',
      order_number: '259000',
      item_number: '000010',
      customer_code: '18000',
      customer_name: 'CLIENTE DATA FUTURA LTDA',
      destination_city: 'RIBEIRAO PRETO',
      uf: 'SP',
      itinerary_code: 'SP002B',
      material: 'MAT-FUTURE-01',
      weight_kg: 10000,
      total_value: 30000,
      desired_date: '2026-09-15T00:00:00.000Z',
      credit_status: 'Liberado',
      production_status: 'Pronto',
      discharges_count: 1,
    },
    // Pedido SEM Itinerário SAP Cadastrado (A Determinar pelo TMS)
    {
      id: 'ord-unmapped-1',
      order_number: '259100',
      item_number: '000010',
      customer_code: '19000',
      customer_name: 'NOVO CLIENTE MACEIO',
      destination_city: 'MACEIO',
      uf: 'AL',
      itinerary_code: '', // Vazio
      material: 'MAT-UNMAPPED-01',
      weight_kg: 15000,
      total_value: 50000,
      desired_date: '2026-08-20T00:00:00.000Z',
      credit_status: 'Liberado',
      production_status: 'Pronto',
      discharges_count: 1,
    },
    // Pedido com Crédito Bloqueado
    {
      id: 'ord-blocked-credit',
      order_number: '259200',
      item_number: '000010',
      customer_code: '20000',
      customer_name: 'CLIENTE BLOQUEADO S/A',
      destination_city: 'CAMPINAS',
      uf: 'SP',
      itinerary_code: 'SP001A',
      material: 'MAT-BLOCKED-01',
      weight_kg: 8000,
      total_value: 25000,
      desired_date: '2026-08-20T00:00:00.000Z',
      credit_status: 'Bloqueado',
      production_status: 'Pronto',
      discharges_count: 1,
    },
  ]

  const mockStocks: SapStockCurrentEntity[] = [
    {
      id: 'st-1',
      material_code: 'MAT-258837-000010',
      material_description: '',
      plant: '1010',
      storage_location: 'DP34',
      quantity: 50,
      unit: 'TON',
      available_qty: 50,
      weight_kg: 50000,
    },
    {
      id: 'st-2',
      material_code: 'MAT-258837-000020',
      material_description: '',
      plant: '1010',
      storage_location: 'DP34',
      quantity: 50,
      unit: 'TON',
      available_qty: 50,
      weight_kg: 50000,
    },
    {
      id: 'st-3',
      material_code: 'MAT-258967-000060',
      material_description: '',
      plant: '1010',
      storage_location: 'DP34',
      quantity: 50,
      unit: 'TON',
      available_qty: 50,
      weight_kg: 50000,
    },
    {
      id: 'st-4',
      material_code: 'MAT-UNMAPPED-01',
      material_description: '',
      plant: '1010',
      storage_location: 'DP34',
      quantity: 50,
      unit: 'TON',
      available_qty: 50,
      weight_kg: 50000,
    },
  ]

  const mockQueue: QueueEntryEntity[] = [
    {
      id: 'q-porta-1',
      driver: 'drv-1',
      type: 'PORTA',
      status: 'disponivel',
      entry_time: new Date().toISOString(),
      driver_name_cached: 'Carlos Motorista PORTA',
      vehicle_capacity_kg_cached: 28000,
      preferred_itinerary: 'SP001A',
    },
  ]

  const itinerariesMeta = {
    SP001A: { description: 'Grande São Paulo / ABCD', region: 'Grande SP', uf: 'SP' },
    MG001A: { description: 'Grande BH / Contagem / Betim', region: 'Metropolitana BH', uf: 'MG' },
    AL001C: { description: 'Maceió e Região Metropolitana AL', region: 'Alagoas', uf: 'AL' },
  }

  it('1. Deve propor cargas automaticamente para todos os itinerários sem exigir seleção manual', () => {
    const result = runGlobalCiafalOptimizer({
      itineraryCode: 'ALL',
      plannedDate: '2026-08-30',
      orders: mockOrders,
      stocks: mockStocks,
      pcpOrders: [],
      queueEntries: mockQueue,
      vehicleCapacityKg: 28000,
      vehicleType: 'Carreta 5 Eixos',
      itinerariesMetadata: itinerariesMeta,
    })

    expect(result.allProposedCargos.length).toBeGreaterThanOrEqual(2)

    // Carga SP001A deve ser gerada automaticamente com 27t (14t + 13t)
    const spCargo = result.allProposedCargos.find((c) => c.itineraryCode === 'SP001A')
    expect(spCargo).toBeDefined()
    expect(spCargo?.totalWeightKg).toBe(27000)
    expect(spCargo?.occupancyPct).toBe(96.4)
    expect(spCargo?.ordersCount).toBe(2)
    expect(spCargo?.readinessLabel).toBe('SAÍDA IMEDIATA')
    expect(spCargo?.hasPortaDriver).toBe(true)

    // Carga MG001A deve ser gerada automaticamente com 27t
    const mgCargo = result.allProposedCargos.find((c) => c.itineraryCode === 'MG001A')
    expect(mgCargo).toBeDefined()
    expect(mgCargo?.totalWeightKg).toBe(27000)
    expect(mgCargo?.occupancyPct).toBe(96.4)
  })

  it('2. Inferência de itinerário inteligente para pedidos sem itinerário SAP (Exige validação humana)', () => {
    const unmappedOrder = mockOrders.find((o) => o.id === 'ord-unmapped-1')!
    const suggestion = inferItineraryForOrder(unmappedOrder, mockOrders, itinerariesMeta)

    expect(suggestion.suggestedCode).toBe('AL001C')
    expect(suggestion.humanValidationRequired).toBe(true)
    expect(suggestion.confidence).toBeGreaterThanOrEqual(60)
  })

  it('3. Reconciliação Matemática Estrita: Nenhum pedido pode sumir (Diferença = 0)', () => {
    const result = runGlobalCiafalOptimizer({
      itineraryCode: 'ALL',
      plannedDate: '2026-08-30',
      orders: mockOrders,
      stocks: mockStocks,
      pcpOrders: [],
      queueEntries: mockQueue,
      vehicleCapacityKg: 28000,
      vehicleType: 'Carreta 5 Eixos',
      itinerariesMetadata: itinerariesMeta,
    })

    expect(result.reconciliation.totalWalletOrders).toBe(mockOrders.length)
    expect(result.reconciliation.reconciliationDiff).toBe(0)
    expect(result.reconciliation.items.length).toBe(mockOrders.length)

    // Pedido com data futura deve estar classificado como AGUARDANDO_DATA_DESEJADA
    const futureItem = result.reconciliation.items.find((i) => i.orderId === 'ord-future-1')
    expect(futureItem?.status).toBe('AGUARDANDO_DATA_DESEJADA')

    // Pedido com crédito bloqueado deve estar classificado como AGUARDANDO_CREDITO
    const creditBlockedItem = result.reconciliation.items.find((i) => i.orderId === 'ord-blocked-credit')
    expect(creditBlockedItem?.status).toBe('AGUARDANDO_CREDITO')
  })

  it('4. Explicabilidade da Proposta: Por que o TMS propôs esta carga?', () => {
    const result = runGlobalCiafalOptimizer({
      itineraryCode: 'ALL',
      plannedDate: '2026-08-30',
      orders: mockOrders,
      stocks: mockStocks,
      pcpOrders: [],
      queueEntries: mockQueue,
      vehicleCapacityKg: 28000,
      vehicleType: 'Carreta 5 Eixos',
      itinerariesMetadata: itinerariesMeta,
    })

    const spCargo = result.allProposedCargos.find((c) => c.itineraryCode === 'SP001A')!
    expect(spCargo.whyProposed).toContain('Carga priorizada automaticamente pelo TMS')
    expect(spCargo.whyProposed).toContain('96.4%')
    expect(spCargo.whyProposed).toContain('DP34')
  })

  it('5. Filtro de Itinerário específico recalcula apenas o cenário desejado', () => {
    const result = runGlobalCiafalOptimizer({
      itineraryCode: 'MG001A',
      plannedDate: '2026-08-30',
      orders: mockOrders,
      stocks: mockStocks,
      pcpOrders: [],
      queueEntries: mockQueue,
      vehicleCapacityKg: 28000,
      vehicleType: 'Carreta 5 Eixos',
      itinerariesMetadata: itinerariesMeta,
    })

    expect(result.allProposedCargos.length).toBe(1)
    expect(result.allProposedCargos[0].itineraryCode).toBe('MG001A')
  })
})
