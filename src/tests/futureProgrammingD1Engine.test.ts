import { describe, it, expect } from 'vitest'
import {
  getDefaultD1Date,
  isExactD1Date,
  calculateProjectedStockByMaterial,
  aggregateVehiclesD1,
  buildEligibleWalletList,
  calculateItineraryBalanceMatrix,
  calculateExecutiveCardsD1,
  findComplementCandidatesForVehicle,
  simulateComplementLoad,
  formatTons,
  classifyOccupancyBand,
  isPcpProductionPriorToNeed,
  hasGeneratedRemessa,
  VehicleD1PlanItem,
} from '../domain/futureProgrammingD1Engine'
import {
  SapSalesOrderEntity,
  SapStockCurrentEntity,
  PcpProductionOrderEntity,
  SapItineraryEntity,
  QueueEntryEntity,
  VehicleEntity,
  DriverEntity,
  PreRegistrationEntity,
  ChicaoFreightOfferEntity,
  FreightOfferEntity,
  LoadProposalEntity,
} from '../domain/rules'

describe('Torre de Programação Logística D+1 - Cenários Obrigatórios (Item 22)', () => {
  const targetD1Date = getDefaultD1Date()

  // 1. Veículo D+1 sem carga
  it('Cenário 1: Veículo D+1 sem carga (0% ocupação, espaço total disponível)', () => {
    const queueEntry: QueueEntryEntity = {
      id: 'q1',
      driver: 'd1',
      vehicle_plate_cached: 'ABC1D23',
      vehicle_type_cached: 'Carreta LS',
      driver_name_cached: 'José da Silva',
      carrier_name_cached: 'Transportes Brasil',
      vehicle_capacity_kg_cached: 30000,
      preferred_itinerary_code: 'SP001A',
      type: 'PROGRAMADO',
      status: 'disponivel',
      scheduled_arrival_date: targetD1Date,
      entry_time: `${targetD1Date}T07:00:00`,
      created: '',
      updated: '',
    }

    const itin: SapItineraryEntity = {
      id: 'it1',
      sap_code: 'SP001A',
      description: 'Campinas e Região',
      region: 'Interior SP',
      uf: 'SP',
      is_active: true,
      created: '',
      updated: '',
    }

    const vehicles = aggregateVehiclesD1({
      targetD1Date,
      queueEntries: [queueEntry],
      preRegistrations: [],
      chicaoOffers: [],
      freightOffers: [],
      proposals: [],
      registeredVehicles: [],
      drivers: [],
      itineraries: [itin],
      salesOrders: [],
      stockSummaries: new Map(),
    })

    expect(vehicles).toHaveLength(1)
    const v = vehicles[0]
    expect(v.plate).toBe('ABC1D23')
    expect(v.programmedWeightKg).toBe(0)
    expect(v.availableCapacityKg).toBe(30000)
    expect(v.occupancyPct).toBe(0)
    expect(v.occupancyBand).toBe('baixa')
    expect(v.operationalStatus).toBe('Sem carteira compatível')
  })

  // 2. Veículo parcialmente carregado
  it('Cenário 2: Veículo parcialmente carregado (com espaço para complemento)', () => {
    const queueEntry: QueueEntryEntity = {
      id: 'q2',
      driver: 'd2',
      vehicle_plate_cached: 'XYZ9A88',
      vehicle_type_cached: 'Carreta LS',
      driver_name_cached: 'Carlos Mendes',
      carrier_name_cached: 'Transportes Brasil',
      vehicle_capacity_kg_cached: 30000,
      preferred_itinerary_code: 'SP001A',
      type: 'PROGRAMADO',
      status: 'disponivel',
      scheduled_arrival_date: targetD1Date,
      entry_time: `${targetD1Date}T07:00:00`,
      created: '',
      updated: '',
    }

    const prop: LoadProposalEntity = {
      id: 'prop1',
      proposal_number: 'PROP-2025-001',
      vehicle_plate: 'XYZ9A88',
      vehicle_type: 'Carreta LS',
      itinerary_code: 'SP001A',
      classification_status: 'Carga dentro da faixa',
      lifecycle_stage: 'Programação futura',
      current_weight_kg: 24000,
      vehicle_capacity_kg: 30000,
      current_occupancy_pct: 80,
      min_occupancy_pct: 70,
      max_occupancy_pct: 100,
      orders_count: 2,
      customers_count: 2,
      planned_dispatch_date: targetD1Date,
      discharges_count: 2,
      created: '',
      updated: '',
    }

    const itin: SapItineraryEntity = {
      id: 'it1',
      sap_code: 'SP001A',
      description: 'Campinas e Região',
      region: 'Interior SP',
      uf: 'SP',
      is_active: true,
      created: '',
      updated: '',
    }

    const vehicles = aggregateVehiclesD1({
      targetD1Date,
      queueEntries: [queueEntry],
      preRegistrations: [],
      chicaoOffers: [],
      freightOffers: [],
      proposals: [prop],
      registeredVehicles: [],
      drivers: [],
      itineraries: [itin],
      salesOrders: [],
      stockSummaries: new Map(),
    })

    expect(vehicles).toHaveLength(1)
    const v = vehicles[0]
    expect(v.programmedWeightKg).toBe(24000)
    expect(v.availableCapacityKg).toBe(6000)
    expect(v.occupancyPct).toBe(80)
    expect(v.occupancyBand).toBe('proxima_da_capacidade')
  })

  // 3. Veículo 100% ocupado (Carga completa)
  it('Cenário 3: Veículo 100% ocupado (Carga completa)', () => {
    const queueEntry: QueueEntryEntity = {
      id: 'q3',
      driver: 'd3',
      vehicle_plate_cached: 'FUL1000',
      vehicle_type_cached: 'Carreta Graneleiro',
      driver_name_cached: 'Marcos Paulo',
      vehicle_capacity_kg_cached: 30000,
      preferred_itinerary_code: 'SP001A',
      type: 'PROGRAMADO',
      status: 'disponivel',
      entry_time: `${targetD1Date}T07:00:00`,
      created: '',
      updated: '',
    }

    const prop: LoadProposalEntity = {
      id: 'prop3',
      proposal_number: 'PROP-2025-100',
      vehicle_plate: 'FUL1000',
      vehicle_type: 'Carreta Graneleiro',
      itinerary_code: 'SP001A',
      classification_status: 'Carga dentro da faixa',
      lifecycle_stage: 'Carga consolidada',
      current_weight_kg: 30000,
      vehicle_capacity_kg: 30000,
      current_occupancy_pct: 100,
      min_occupancy_pct: 70,
      max_occupancy_pct: 100,
      orders_count: 1,
      customers_count: 1,
      planned_dispatch_date: targetD1Date,
      discharges_count: 1,
      created: '',
      updated: '',
    }

    const itin: SapItineraryEntity = {
      id: 'it1',
      sap_code: 'SP001A',
      description: 'Campinas e Região',
      region: 'Interior SP',
      uf: 'SP',
      is_active: true,
      created: '',
      updated: '',
    }

    const vehicles = aggregateVehiclesD1({
      targetD1Date,
      queueEntries: [queueEntry],
      preRegistrations: [],
      chicaoOffers: [],
      freightOffers: [],
      proposals: [prop],
      registeredVehicles: [],
      drivers: [],
      itineraries: [itin],
      salesOrders: [],
      stockSummaries: new Map(),
    })

    const v = vehicles[0]
    expect(v.occupancyPct).toBe(100)
    expect(v.occupancyBand).toBe('carga_completa')
    expect(v.operationalStatus).toBe('Carga completa')
    expect(v.availableCapacityKg).toBe(0)
  })

  // 4. Veículo acima da capacidade (Divergência de capacidade)
  it('Cenário 4: Veículo acima da capacidade (Divergência de capacidade > 100%)', () => {
    const queueEntry: QueueEntryEntity = {
      id: 'q4',
      driver: 'd4',
      vehicle_plate_cached: 'EXC9999',
      vehicle_capacity_kg_cached: 28000,
      preferred_itinerary_code: 'SP001A',
      type: 'PROGRAMADO',
      status: 'disponivel',
      entry_time: `${targetD1Date}T07:00:00`,
      created: '',
      updated: '',
    }

    const prop: LoadProposalEntity = {
      id: 'prop4',
      proposal_number: 'PROP-EXC',
      vehicle_plate: 'EXC9999',
      vehicle_type: 'Carreta',
      itinerary_code: 'SP001A',
      classification_status: 'Capacidade excedida — Reotimizar',
      lifecycle_stage: 'Carga consolidada',
      current_weight_kg: 31000, // 31t em veículo de 28t
      vehicle_capacity_kg: 28000,
      current_occupancy_pct: 110,
      min_occupancy_pct: 70,
      max_occupancy_pct: 100,
      orders_count: 1,
      customers_count: 1,
      planned_dispatch_date: targetD1Date,
      discharges_count: 1,
      created: '',
      updated: '',
    }

    const itin: SapItineraryEntity = {
      id: 'it1',
      sap_code: 'SP001A',
      description: 'Campinas e Região',
      region: 'Interior SP',
      uf: 'SP',
      is_active: true,
      created: '',
      updated: '',
    }

    const vehicles = aggregateVehiclesD1({
      targetD1Date,
      queueEntries: [queueEntry],
      preRegistrations: [],
      chicaoOffers: [],
      freightOffers: [],
      proposals: [prop],
      registeredVehicles: [],
      drivers: [],
      itineraries: [itin],
      salesOrders: [],
      stockSummaries: new Map(),
    })

    const v = vehicles[0]
    expect(v.occupancyPct).toBeGreaterThan(100.5)
    expect(v.occupancyBand).toBe('excedida')
    expect(v.operationalStatus).toBe('Divergência de capacidade')
  })

  // 5. Carteira sem estoque (Estoque insuficiente e alerta)
  it('Cenário 5: Carteira sem estoque (Estoque projetado insuficiente)', () => {
    // Estoque zero, 5000 kg comprometidos em remessas anteriores
    const stockCurrent: SapStockCurrentEntity[] = [
      {
        id: 'st1',
        material_code: 'BOB-A36-2.00',
        material_description: 'Bobina A36',
        plant: '1010',
        storage_location: '0001',
        weight_kg: 0,
        quantity: 0,
        available_qty: 0,
        unit: 'KG',
        created: '',
        updated: '',
      },
    ]

    const remessaOrder: SapSalesOrderEntity = {
      id: 'ord-rem1',
      order_number: '00100500',
      item_number: '000010',
      customer_code: 'CLI-001',
      customer_name: 'Cliente Indústria A',
      destination_city: 'Campinas',
      uf: 'SP',
      itinerary_code: 'SP001A',
      material: 'BOB-A36-2.00',
      weight_kg: 5000,
      balance_quantity_kg: 5000,
      order_value: 25000,
      total_value: 25000,
      production_status: 'Pronto',
      credit_status: 'Liberado',
      desired_date: targetD1Date,
      status: 'disponivel',
      delivery_number: '0080001234', // Remessa existente
      created: '',
      updated: '',
    }

    const stockSummaries = calculateProjectedStockByMaterial({
      materials: ['BOB-A36-2.00'],
      currentStockList: stockCurrent,
      pcpOrdersList: [],
      salesOrdersList: [remessaOrder],
      targetD1Date,
    })

    const summary = stockSummaries.get('BOB-A36-2.00')!
    expect(summary.projectedStockKg).toBe(-5000)
    expect(summary.isInsufficient).toBe(true)
    expect(summary.alertMessage).toBe('⚠ Estoque projetado insuficiente')
  })

  // 6. Carteira com estoque atual suficiente
  it('Cenário 6: Carteira com estoque atual (projetado positivo sem remessa)', () => {
    const stockCurrent: SapStockCurrentEntity[] = [
      {
        id: 'st2',
        material_code: 'CHAPA-X',
        material_description: 'Chapa Fina Frio',
        plant: '1010',
        storage_location: '0001',
        weight_kg: 40000,
        quantity: 40000,
        available_qty: 40000,
        unit: 'KG',
        created: '',
        updated: '',
      },
    ]

    const openOrder: SapSalesOrderEntity = {
      id: 'ord-open1',
      order_number: '00100600',
      item_number: '000010',
      customer_code: 'CLI-002',
      customer_name: 'Metalúrgica Boa',
      destination_city: 'Campinas',
      uf: 'SP',
      itinerary_code: 'SP001A',
      material: 'CHAPA-X',
      weight_kg: 10000,
      balance_quantity_kg: 10000,
      order_value: 50000,
      total_value: 50000,
      production_status: 'Pronto',
      desired_date: targetD1Date,
      status: 'disponivel',
      credit_status: 'Liberado',
      created: '',
      updated: '',
    }

    const stockSummaries = calculateProjectedStockByMaterial({
      materials: ['CHAPA-X'],
      currentStockList: stockCurrent,
      pcpOrdersList: [],
      salesOrdersList: [openOrder],
      targetD1Date,
    })

    const summary = stockSummaries.get('CHAPA-X')!
    expect(summary.projectedStockKg).toBe(40000)
    expect(summary.isInsufficient).toBe(false)
    expect(summary.alertMessage).toBeUndefined()

    const wallet = buildEligibleWalletList({
      salesOrders: [openOrder],
      stockSummaries,
      targetD1Date,
    })

    expect(wallet).toHaveLength(1)
    expect(wallet[0].isOpenAndEligible).toBe(true)
    expect(wallet[0].quantityEligibleKg).toBe(10000)
  })

  // 7. Carga dependente de produção PCP programada
  it('Cenário 7: Carga dependente de produção PCP programada antes da necessidade', () => {
    // Estoque atual 2.000 kg, PCP produzirá 8.000 kg até D+1 às 14:00
    const stockCurrent: SapStockCurrentEntity[] = [
      {
        id: 'st3',
        material_code: 'TUBO-IND',
        material_description: 'Tubo Industrial',
        plant: '1010',
        storage_location: '0001',
        weight_kg: 2000,
        quantity: 2000,
        available_qty: 2000,
        unit: 'KG',
        created: '',
        updated: '',
      },
    ]

    const pcpOrder: PcpProductionOrderEntity = {
      id: 'pcp1',
      production_order_number: 'OF-9901',
      material_code: 'TUBO-IND',
      material_description: 'Tubo Industrial',
      line: 'Linha 1 Tubos',
      quantity_planned: 8000,
      weight_kg_planned: 8000,
      unit: 'KG',
      scheduled_date: `${targetD1Date}T14:00:00`,
      status: 'Programada',
      created: '',
      updated: '',
    }

    const openOrder: SapSalesOrderEntity = {
      id: 'ord-pcp',
      order_number: '00100700',
      item_number: '000010',
      customer_code: 'CLI-003',
      customer_name: 'Tubos e Aço SA',
      destination_city: 'Campinas',
      uf: 'SP',
      itinerary_code: 'SP001A',
      material: 'TUBO-IND',
      weight_kg: 9000, // Demanda 9t > Estoque atual 2t, mas < Projetado (2t + 8t = 10t)
      balance_quantity_kg: 9000,
      order_value: 45000,
      total_value: 45000,
      production_status: 'Pronto',
      desired_date: targetD1Date,
      status: 'disponivel',
      credit_status: 'Liberado',
      created: '',
      updated: '',
    }

    const stockSummaries = calculateProjectedStockByMaterial({
      materials: ['TUBO-IND'],
      currentStockList: stockCurrent,
      pcpOrdersList: [pcpOrder],
      salesOrdersList: [openOrder],
      targetD1Date,
    })

    const summary = stockSummaries.get('TUBO-IND')!
    expect(summary.currentStockKg).toBe(2000)
    expect(summary.pcpD1Kg).toBe(8000)
    expect(summary.projectedStockKg).toBe(10000)
    expect(summary.pcpScheduleNotice).toContain('Produção prevista:')

    // Veículo com espaço para carregar
    const queueEntry: QueueEntryEntity = {
      id: 'q-pcp',
      driver: 'd-pcp',
      vehicle_plate_cached: 'PCP1000',
      vehicle_type_cached: 'Carreta',
      vehicle_capacity_kg_cached: 20000,
      preferred_itinerary_code: 'SP001A',
      type: 'PROGRAMADO',
      status: 'disponivel',
      entry_time: `${targetD1Date}T07:00:00`,
      created: '',
      updated: '',
    }

    const itin: SapItineraryEntity = {
      id: 'it1',
      sap_code: 'SP001A',
      description: 'Campinas e Região',
      region: 'Interior SP',
      uf: 'SP',
      is_active: true,
      created: '',
      updated: '',
    }

    const vehicles = aggregateVehiclesD1({
      targetD1Date,
      queueEntries: [queueEntry],
      preRegistrations: [],
      chicaoOffers: [],
      freightOffers: [],
      proposals: [],
      registeredVehicles: [],
      drivers: [],
      itineraries: [itin],
      salesOrders: [openOrder],
      stockSummaries,
    })

    const v = vehicles[0]
    expect(v.isPcpDependent).toBe(true)
    expect(v.pcpAlertMessage).toBe('⚠ CARGA DEPENDENTE DE PRODUÇÃO PCP')
  })

  // 8. Pedido já em remessa (não duplicar remessas)
  it('Cenário 8: Não duplicar remessas (pedido com remessa nunca é sugerido como elegível)', () => {
    const orderWithRemessa: SapSalesOrderEntity = {
      id: 'ord-has-rem',
      order_number: '00100800',
      item_number: '000010',
      customer_code: 'CLI-004',
      customer_name: 'Cliente Remessado',
      destination_city: 'Campinas',
      uf: 'SP',
      itinerary_code: 'SP001A',
      material: 'BOB-01',
      weight_kg: 15000,
      balance_quantity_kg: 15000,
      order_value: 60000,
      total_value: 60000,
      production_status: 'Pronto',
      credit_status: 'Liberado',
      desired_date: targetD1Date,
      status: 'disponivel',
      delivery_number: '0080009999', // VL01N já executada
      created: '',
      updated: '',
    }

    expect(hasGeneratedRemessa(orderWithRemessa)).toBe(true)

    const wallet = buildEligibleWalletList({
      salesOrders: [orderWithRemessa],
      stockSummaries: new Map(),
      targetD1Date,
    })

    expect(wallet[0].isOpenAndEligible).toBe(false)
    expect(wallet[0].quantityEligibleKg).toBe(0)
    expect(wallet[0].ineligibilityReasons).toContain(
      'Pedido já possui remessa gerada (VL01N) ou transporte vinculado',
    )
  })

  // 9. PCP com produção posterior ao horário necessário (não entra no projetado)
  it('Cenário 9: PCP com produção posterior ao horário necessário não compõe o D+1', () => {
    const pcpAfterNeed: PcpProductionOrderEntity = {
      id: 'pcp-late',
      production_order_number: 'OF-LATE',
      material_code: 'MAT-TARDE',
      material_description: 'Material Tarde',
      line: 'Linha Geral',
      unit: 'KG',
      quantity_planned: 12000,
      weight_kg_planned: 12000,
      // Prevista para depois de D+1 (ex: D+2)
      scheduled_date: '2099-12-31T20:00:00',
      status: 'Programada',
      created: '',
      updated: '',
    }

    expect(isPcpProductionPriorToNeed(pcpAfterNeed.scheduled_date, targetD1Date)).toBe(false)

    const stockSummaries = calculateProjectedStockByMaterial({
      materials: ['MAT-TARDE'],
      currentStockList: [],
      pcpOrdersList: [pcpAfterNeed],
      salesOrdersList: [],
      targetD1Date,
    })

    const summary = stockSummaries.get('MAT-TARDE')!
    expect(summary.pcpD1Kg).toBe(0)
    expect(summary.projectedStockKg).toBe(0)
  })

  // 10. Dois veículos consumindo o mesmo estoque (Reserva Provisória anti-duplicidade)
  it('Cenário 10: Dois veículos consumindo o mesmo estoque aplicam reserva provisória', () => {
    // Estoque total livre: 15.000 kg
    const stockCurrent: SapStockCurrentEntity[] = [
      {
        id: 'st-res',
        material_code: 'PERFIL-U',
        material_description: 'Perfil U Aço',
        plant: '1010',
        storage_location: '0001',
        weight_kg: 15000,
        quantity: 15000,
        available_qty: 15000,
        unit: 'KG',
        created: '',
        updated: '',
      },
    ]

    const orderA: SapSalesOrderEntity = {
      id: 'ord-a',
      order_number: '00100901',
      item_number: '000010',
      customer_code: 'CLI-A',
      customer_name: 'Cliente A',
      destination_city: 'Campinas',
      uf: 'SP',
      itinerary_code: 'SP001A',
      material: 'PERFIL-U',
      weight_kg: 10000,
      balance_quantity_kg: 10000,
      order_value: 50000,
      total_value: 50000,
      production_status: 'Pronto',
      desired_date: targetD1Date,
      status: 'disponivel',
      credit_status: 'Liberado',
      created: '',
      updated: '',
    }

    const orderB: SapSalesOrderEntity = {
      id: 'ord-b',
      order_number: '00100902',
      item_number: '000010',
      customer_code: 'CLI-B',
      customer_name: 'Cliente B',
      destination_city: 'Campinas',
      uf: 'SP',
      itinerary_code: 'SP001A',
      material: 'PERFIL-U',
      weight_kg: 10000,
      balance_quantity_kg: 10000,
      order_value: 50000,
      total_value: 50000,
      production_status: 'Pronto',
      desired_date: targetD1Date,
      status: 'disponivel',
      credit_status: 'Liberado',
      created: '',
      updated: '',
    }

    const stockSummaries = calculateProjectedStockByMaterial({
      materials: ['PERFIL-U'],
      currentStockList: stockCurrent,
      pcpOrdersList: [],
      salesOrdersList: [orderA, orderB],
      targetD1Date,
    })

    // Reserva provisória de 10.000 kg já alocada ao Veículo 1
    const reservations = new Map<string, number>()
    reservations.set('PERFIL-U', 10000)

    // O segundo veículo/carteira só tem acesso aos 5.000 kg restantes, nunca aos 15.000 originais
    const wallet = buildEligibleWalletList({
      salesOrders: [orderB],
      stockSummaries,
      targetD1Date,
      temporaryReservations: reservations,
    })

    expect(wallet[0].quantityEligibleKg).toBe(5000) // MIN(10.000 pedido, 15.000 - 10.000 reservado)
  })

  // 11. Complemento com 1 cliente e com múltiplos clientes
  it('Cenário 11: Simulação de complemento com 1 cliente e múltiplos clientes (antes, depois, ganho)', () => {
    const vehicle: VehicleD1PlanItem = {
      id: 'v-test',
      source: 'queue',
      date: targetD1Date,
      scheduledTime: '07:00',
      plate: 'CMP1000',
      vehicleType: 'Carreta LS',
      driverName: 'Motorista Teste',
      carrierName: 'Transportes CIAFAL',
      itineraryCode: 'SP001A',
      itineraryDesc: 'Campinas e Região',
      region: 'Interior SP',
      uf: 'SP',
      origin: 'Planta Matriz',
      destination: 'Campinas',
      dischargesCount: 1,
      capacityKg: 30000,
      capacityTons: 30.0,
      programmedWeightKg: 24600,
      programmedWeightTons: 24.6,
      availableCapacityKg: 5400,
      availableCapacityTons: 5.4,
      occupancyPct: 82.0,
      occupancyBand: 'proxima_da_capacidade',
      compatibleWalletTons: 10.0,
      currentStockTons: 20.0,
      remessasGeneratedTons: 0,
      pcpD1Tons: 0,
      projectedStockD1Tons: 20.0,
      possibleComplementTons: 5.4,
      operationalStatus: 'Complemento disponível',
      matchReasons: [],
      isPcpDependent: false,
      allocatedOrderNumbers: [],
      allocatedItems: [],
    }

    // Candidato 1: Cliente A (3.000 kg)
    // Candidato 2: Cliente B (2.200 kg)
    const cand1 = {
      id: 'c1',
      orderNumber: 'PED-1',
      itemNumber: '10',
      customerCode: 'CLI-A',
      customerName: 'Cliente A',
      destinationCity: 'Campinas',
      uf: 'SP',
      priorityLevel: 'Alta',
      material: 'MAT-1',
      materialDescription: 'Material 1',
      walletBalanceKg: 3000,
      walletBalanceTons: 3.0,
      projectedStockD1Kg: 10000,
      projectedStockD1Tons: 10.0,
      suggestedQuantityKg: 3000,
      suggestedQuantityTons: 3.0,
      resultingOccupancyPct: 92.0,
      isPcpDependent: false,
      reasons: [],
    }

    const cand2 = {
      id: 'c2',
      orderNumber: 'PED-2',
      itemNumber: '10',
      customerCode: 'CLI-B',
      customerName: 'Cliente B',
      destinationCity: 'Sumaré',
      uf: 'SP',
      priorityLevel: 'Normal',
      material: 'MAT-2',
      materialDescription: 'Material 2',
      walletBalanceKg: 2200,
      walletBalanceTons: 2.2,
      projectedStockD1Kg: 8000,
      projectedStockD1Tons: 8.0,
      suggestedQuantityKg: 2200,
      suggestedQuantityTons: 2.2,
      resultingOccupancyPct: 99.3,
      isPcpDependent: false,
      reasons: [],
    }

    const simResult = simulateComplementLoad({
      vehicle,
      selectedCandidates: [cand1, cand2],
    })

    expect(simResult.beforeWeightTons).toBe(24.6)
    expect(simResult.beforeOccupancyPct).toBe(82.0)
    expect(simResult.afterWeightTons).toBe(29.8)
    expect(simResult.afterOccupancyPct).toBe(99.3)
    expect(simResult.weightGainTons).toBe(5.2)
    expect(simResult.isFeasible).toBe(true)
    expect(simResult.routeEstimate.stopsCount).toBe(3) // 1 descarga inicial + 2 cidades novas
  })

  // 12. Matriz de Balanço Logístico por Itinerário
  it('Cenário 12: Matriz de Balanço por itinerário reflete diagnósticos de transporte e complemento', () => {
    const itin: SapItineraryEntity = {
      id: 'it1',
      sap_code: 'SP001A',
      description: 'Campinas e Região',
      region: 'Interior SP',
      uf: 'SP',
      is_active: true,
      created: '',
      updated: '',
    }

    const v1: VehicleD1PlanItem = {
      id: 'v1',
      source: 'queue',
      date: targetD1Date,
      scheduledTime: '07:00',
      plate: 'PL1000',
      vehicleType: 'Carreta',
      driverName: 'Motorista 1',
      carrierName: 'Carrier',
      itineraryCode: 'SP001A',
      itineraryDesc: 'Campinas e Região',
      region: 'Interior SP',
      uf: 'SP',
      origin: 'Planta',
      destination: 'Campinas',
      dischargesCount: 1,
      capacityKg: 30000,
      capacityTons: 30.0,
      programmedWeightKg: 20000,
      programmedWeightTons: 20.0,
      availableCapacityKg: 10000,
      availableCapacityTons: 10.0,
      occupancyPct: 66.7,
      occupancyBand: 'intermediaria',
      compatibleWalletTons: 8.0,
      currentStockTons: 15.0,
      remessasGeneratedTons: 0,
      pcpD1Tons: 0,
      projectedStockD1Tons: 15.0,
      possibleComplementTons: 8.0,
      operationalStatus: 'Complemento disponível',
      matchReasons: [],
      isPcpDependent: false,
      allocatedOrderNumbers: [],
      allocatedItems: [],
    }

    const matrix = calculateItineraryBalanceMatrix({
      itineraries: [itin],
      vehicles: [v1],
      eligibleWallet: [
        {
          id: 'ord-m',
          orderNumber: 'P1',
          itemNumber: '1',
          customerCode: 'C1',
          customerName: 'Cliente 1',
          destinationCity: 'Campinas',
          uf: 'SP',
          itineraryCode: 'SP001A',
          region: 'SP001A',
          material: 'MAT-1',
          materialDescription: 'Material 1',
          weightKg: 8000,
          weightTons: 8.0,
          orderValue: 40000,
          desiredDate: targetD1Date,
          priorityLevel: 'Alta',
          creditStatus: 'Liberado',
          isOpenAndEligible: true,
          hasRemessa: false,
          stockSituation: 'CONFORME',
          currentStockKg: 15000,
          projectedStockKg: 15000,
          quantityEligibleKg: 8000,
          quantityEligibleTons: 8.0,
          matchReasons: [],
          ineligibilityReasons: [],
        },
      ],
      stockSummaries: new Map([
        [
          'MAT-1',
          {
            materialCode: 'MAT-1',
            materialDescription: 'Material 1',
            plant: '1010',
            storageLocation: '0001',
            currentStockKg: 15000,
            currentStockTons: 15.0,
            remessasGeneratedKg: 0,
            remessasGeneratedTons: 0,
            pcpD1Kg: 0,
            pcpD1Tons: 0,
            projectedStockKg: 15000,
            projectedStockTons: 15.0,
            isInsufficient: false,
            ordersCount: 1,
            walletDemandKg: 8000,
            walletDemandTons: 8.0,
            availableFreeKg: 15000,
          },
        ],
      ]),
    })

    expect(matrix).toHaveLength(1)
    const row = matrix[0]
    expect(row.itineraryCode).toBe('SP001A')
    expect(row.vehiclesD1Count).toBe(1)
    expect(row.totalCapacityTons).toBe(30.0)
    expect(row.programmedLoadTons).toBe(20.0)
    expect(row.freeSpaceTons).toBe(10.0)
    expect(row.eligibleWalletTons).toBe(8.0)
    expect(row.potentialComplementTons).toBe(8.0)
    expect(row.balanceDiagnosis).toBe('COMPLEMENTO POSSÍVEL')
  })

  // 13. Verificação de data D+1 e badge
  it('Cenário 13: Verificação de data de programação e badge [D+1]', () => {
    expect(isExactD1Date(targetD1Date)).toBe(true)
    expect(isExactD1Date('2025-01-01')).toBe(false)
    expect(isExactD1Date('')).toBe(false)
  })
})
