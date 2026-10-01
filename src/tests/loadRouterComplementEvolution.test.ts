import { describe, it, expect } from 'vitest'
import {
  runGlobalCiafalOptimizer,
  evaluateComplementCandidates,
} from '../domain/optimizerEngine'
import { SapSalesOrderEntity, QueueEntryEntity, SapStockCurrentEntity, PcpProductionOrderEntity } from '../domain/rules'

describe('Cenários de Aceite - Evolução Multicritério TMS & Complemento de Cargas CIAFAL', () => {
  // Cenário 1: Veículo 28 t, mín 70%, máx 95%, carteira elegível 21 t
  it('Cenário 1: Veículo 28 t, mín 70%, máx 95%, carteira elegível 21 t -> proposta criada, ocupação 75%, carga parcial, ~5,6 t complemento', () => {
    const orders: SapSalesOrderEntity[] = [
      {
        id: 'ord-1',
        order_number: 'PED-MG-01',
        customer_code: 'CLI-001',
        customer_name: 'Aço Minas Ltda',
        destination_city: 'Belo Horizonte',
        uf: 'MG',
        itinerary_code: 'MG-05',
        material: 'CA-50 10 mm',
        material_description: 'Vergalhão CA-50 10 mm',
        weight_kg: 21000,
        total_value: 120000,
        desired_date: '2026-10-08',
        credit_status: 'Liberado',
        production_status: 'Pronto',
        stock_situation: 'Totalmente Disponível',
      },
    ]

    const stocks: SapStockCurrentEntity[] = [
      {
        id: 'st-1',
        material_code: 'CA-50 10 mm',
        material_description: 'Vergalhão CA-50 10 mm',
        storage_location: 'DP34',
        plant: '3000',
        quantity: 30,
        available_qty: 30,
        unit: 'TO',
        weight_kg: 30000,
      },
    ]

    const queueEntries: QueueEntryEntity[] = [
      {
        id: 'q-1',
        driver: 'drv-1',
        driver_name_cached: 'Carlos Silva',
        vehicle_plate_cached: 'ABC-1234',
        vehicle_capacity_kg_cached: 28000,
        status: 'disponivel',
        type: 'PORTA',
        entry_time: '2026-10-08T07:00:00Z',
        preferred_itinerary: 'MG-05',
        calculated_logistics_date: '2026-10-08',
      },
    ]

    const result = runGlobalCiafalOptimizer({
      itineraryCode: 'MG-05',
      plannedDate: '2026-10-08',
      orders,
      stocks,
      pcpOrders: [],
      queueEntries,
      vehicleCapacityKg: 28000,
      vehicleType: 'Carreta 5 Eixos',
      minOccupancyPct: 70,
      maxOccupancyPct: 95,
    })

    expect(result.allProposedCargos.length).toBeGreaterThan(0)
    const cargo = result.allProposedCargos[0]

    expect(cargo.vehicleCapacityKg).toBe(28000)
    expect(cargo.totalWeightKg).toBe(21000)
    expect(cargo.occupancyPct).toBe(75)
    expect(cargo.classificationStatus).toBe('Carga parcial — Complemento Comercial')
    expect(cargo.targetWeightKg).toBe(26600) // 28.000 * 95% = 26.600
    expect(cargo.missingWeightKg).toBe(5600) // 26.600 - 21.000 = 5.600

    // Avaliação de candidatos comerciais
    const candidates = evaluateComplementCandidates({
      cargo,
      allOrders: orders,
      stocks,
      pcpOrders: [],
    })

    expect(candidates.length).toBeGreaterThan(0)
    const topCand = candidates[0]
    expect(topCand.customerCode).toBe('CLI-001')
    expect(topCand.creditStatus).toBe('Crédito OK')
    expect(topCand.logisticAdherence).toBe('Alta')
  })

  // Cenário 2: Novo pedido entra no SAP (5t) e incorpora à carga
  it('Cenário 2: Carga de 21 t recebe 5 t -> atinge 26 t, ocupação 92,9%, recalcula complemento', () => {
    const orders: SapSalesOrderEntity[] = [
      {
        id: 'ord-1',
        order_number: 'PED-MG-01',
        customer_code: 'CLI-001',
        customer_name: 'Aço Minas Ltda',
        destination_city: 'Belo Horizonte',
        uf: 'MG',
        itinerary_code: 'MG-05',
        material: 'CA-50 10 mm',
        material_description: 'Vergalhão CA-50 10 mm',
        weight_kg: 21000,
        total_value: 120000,
        desired_date: '2026-10-08',
        credit_status: 'Liberado',
        production_status: 'Pronto',
        stock_situation: 'Totalmente Disponível',
      },
      {
        id: 'ord-2',
        order_number: 'PED-MG-02',
        customer_code: 'CLI-002',
        customer_name: 'Estruturas Mineiras',
        destination_city: 'Contagem',
        uf: 'MG',
        itinerary_code: 'MG-05',
        material: 'CA-50 10 mm',
        material_description: 'Vergalhão CA-50 10 mm',
        weight_kg: 5000,
        total_value: 30000,
        desired_date: '2026-10-08',
        credit_status: 'Liberado',
        production_status: 'Pronto',
        stock_situation: 'Totalmente Disponível',
      },
    ]

    const stocks: SapStockCurrentEntity[] = [
      {
        id: 'st-1',
        material_code: 'CA-50 10 mm',
        material_description: 'Vergalhão CA-50 10 mm',
        storage_location: 'DP34',
        plant: '3000',
        quantity: 40,
        unit: 'TO',
        available_qty: 40,
        weight_kg: 40000,
      },
    ]

    const result = runGlobalCiafalOptimizer({
      itineraryCode: 'MG-05',
      plannedDate: '2026-10-08',
      orders,
      stocks,
      pcpOrders: [],
      queueEntries: [],
      vehicleCapacityKg: 28000,
      vehicleType: 'Carreta 5 Eixos',
      minOccupancyPct: 70,
      maxOccupancyPct: 95,
    })

    const cargo = result.allProposedCargos[0]
    expect(cargo.totalWeightKg).toBe(26000)
    // 26000 / 28000 = 92.857% -> 93% ou 92,9%
    expect(cargo.occupancyPct).toBe(93)
    expect(cargo.missingWeightKg).toBe(600) // 26600 - 26000 = 600
  })

  // Cenário 3: Carga atinge ou supera o máximo -> Carga dentro da faixa
  it('Cenário 3: Carga atinge o máximo (>=95%) sem exceder capacidade -> Carga dentro da faixa', () => {
    const orders: SapSalesOrderEntity[] = [
      {
        id: 'ord-1',
        order_number: 'PED-MG-01',
        customer_code: 'CLI-001',
        customer_name: 'Aço Minas Ltda',
        destination_city: 'Belo Horizonte',
        uf: 'MG',
        itinerary_code: 'MG-05',
        material: 'CA-50 10 mm',
        weight_kg: 27000, // 27000/28000 = 96.4%
        total_value: 150000,
        desired_date: '2026-10-08',
        credit_status: 'Liberado',
        production_status: 'Pronto',
        stock_situation: 'Totalmente Disponível',
      },
    ]

    const result = runGlobalCiafalOptimizer({
      itineraryCode: 'MG-05',
      plannedDate: '2026-10-08',
      orders,
      stocks: [{ id: 'st-1', material_code: 'CA-50 10 mm', material_description: 'Vergalhão CA-50 10 mm', storage_location: 'DP34', plant: '3000', quantity: 30, unit: 'TO', available_qty: 30, weight_kg: 30000 }],
      pcpOrders: [],
      queueEntries: [],
      vehicleCapacityKg: 28000,
      vehicleType: 'Carreta 5 Eixos',
      minOccupancyPct: 70,
      maxOccupancyPct: 95,
    })

    const cargo = result.allProposedCargos[0]
    expect(cargo.classificationStatus).toBe('Carga dentro da faixa')
    expect(cargo.missingWeightKg).toBe(0)
  })

  // Cenário 4: Cliente sem crédito -> não é oportunidade prioritária (exceção "Crédito insuficiente/bloqueado")
  it('Cenário 4: Cliente sem crédito é classificado como exceção', () => {
    const cargoOrders: SapSalesOrderEntity[] = [
      {
        id: 'ord-1',
        order_number: 'PED-MG-01',
        customer_code: 'CLI-BLOQ',
        customer_name: 'Cliente Sem Crédito',
        destination_city: 'Belo Horizonte',
        uf: 'MG',
        itinerary_code: 'MG-05',
        material: 'CA-50 10 mm',
        weight_kg: 15000,
        total_value: 50000,
        credit_status: 'Bloqueado',
        production_status: 'Pronto',
        stock_situation: 'Totalmente Disponível',
      },
    ]

    const candidates = evaluateComplementCandidates({
      cargo: {
        id: 'c-1',
        cargoNumber: 'PROP-01',
        itineraryCode: 'MG-05',
        itineraryDescription: 'Belo Horizonte',
        uf: 'MG',
        region: 'Sudeste',
        plannedExpeditionDate: '2026-10-08',
        vehicleType: 'Carreta 5 Eixos',
        vehicleCapacityKg: 28000,
        totalWeightKg: 15000,
        occupancyPct: 53.6,
        occupancyBand: 'BAIXA',
        occupancyAlert: '',
        readinessStatus: 'PRONTA_PARA_OFERTA',
        readinessLabel: 'AGUARDANDO COMPLEMENTO',
        orders: [],
        customersCount: 1,
        ordersCount: 1,
        dischargesCount: 1,
        hasPortaDriver: false,
        eligiblePortaDriversCount: 0,
        eligiblePortaDriverNames: [],
        distanceKm: 400,
        durationMinutes: 300,
        tollsValue: 200,
        anttFloorValue: 3000,
        estimatedCost: 3500,
        costPerTon: 233,
        costPerTonKm: 0.58,
        costPerCustomer: 3500,
        scoreBreakdown: { totalScore: 70, occupancyScore: 50, overdueScore: 10, portaDriverScore: 0, routeEfficiencyScore: 10, tollImpactScore: 10, economicResultScore: 10, stockConfidenceScore: 10, creditConfidenceScore: 0, explanation: '' },
        priorityRanking: 1,
        whyProposed: '',
        reasons: [],
        minOccupancyPct: 70,
        maxOccupancyPct: 95,
        targetWeightKg: 26600,
        missingWeightKg: 11600,
      },
      allOrders: cargoOrders,
      stocks: [{ id: 'st-1', material_code: 'CA-50 10 mm', material_description: 'Vergalhão CA-50 10 mm', storage_location: 'DP34', plant: '3000', quantity: 30, unit: 'TO', available_qty: 30, weight_kg: 30000 }],
      pcpOrders: [],
    })

    expect(candidates.length).toBeGreaterThan(0)
    const cand = candidates[0]
    expect(cand.isException).toBe(true)
    expect(cand.exceptionReason).toContain('Crédito insuficiente/bloqueado')
  })

  // Cenário 5: Produto indisponível até a expedição -> não recomendado como principal (exceção "Produto incompatível com a data da carga")
  it('Cenário 5: Produto sem estoque ou previsão até a expedição vira exceção', () => {
    const cargoOrders: SapSalesOrderEntity[] = [
      {
        id: 'ord-1',
        order_number: 'PED-MG-01',
        customer_code: 'CLI-001',
        customer_name: 'Cliente Material Específico',
        destination_city: 'Belo Horizonte',
        uf: 'MG',
        itinerary_code: 'MG-05',
        material: 'PERFIL-ESPECIAL-999',
        weight_kg: 10000,
        total_value: 60000,
        credit_status: 'Liberado',
        production_status: 'Pronto',
        stock_situation: 'Sem Estoque',
      },
    ]

    const candidates = evaluateComplementCandidates({
      cargo: {
        id: 'c-2',
        cargoNumber: 'PROP-02',
        itineraryCode: 'MG-05',
        itineraryDescription: 'Belo Horizonte',
        uf: 'MG',
        region: 'Sudeste',
        plannedExpeditionDate: '2026-10-08',
        vehicleType: 'Carreta 5 Eixos',
        vehicleCapacityKg: 28000,
        totalWeightKg: 15000,
        occupancyPct: 53.6,
        occupancyBand: 'BAIXA',
        occupancyAlert: '',
        readinessStatus: 'PRONTA_PARA_OFERTA',
        readinessLabel: 'AGUARDANDO COMPLEMENTO',
        orders: [],
        customersCount: 1,
        ordersCount: 1,
        dischargesCount: 1,
        hasPortaDriver: false,
        eligiblePortaDriversCount: 0,
        eligiblePortaDriverNames: [],
        distanceKm: 400,
        durationMinutes: 300,
        tollsValue: 200,
        anttFloorValue: 3000,
        estimatedCost: 3500,
        costPerTon: 233,
        costPerTonKm: 0.58,
        costPerCustomer: 3500,
        scoreBreakdown: { totalScore: 70, occupancyScore: 50, overdueScore: 10, portaDriverScore: 0, routeEfficiencyScore: 10, tollImpactScore: 10, economicResultScore: 10, stockConfidenceScore: 0, creditConfidenceScore: 10, explanation: '' },
        priorityRanking: 1,
        whyProposed: '',
        reasons: [],
        minOccupancyPct: 70,
        maxOccupancyPct: 95,
        targetWeightKg: 26600,
        missingWeightKg: 11600,
      },
      allOrders: cargoOrders,
      stocks: [], // Sem estoque
      pcpOrders: [], // Sem PCP
    })

    expect(candidates.length).toBeGreaterThan(0)
    const cand = candidates[0]
    expect(cand.isException).toBe(true)
    expect(cand.exceptionReason).toContain('Produto incompatível com a data da carga')
  })
})
