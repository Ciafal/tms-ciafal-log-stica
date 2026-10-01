import { describe, it, expect } from 'vitest'
import {
  calculatePlannedFreightResult,
  calculateRealizedFreightResult,
  aggregateProfitability,
  DEFAULT_COMMERCIAL_TABLE,
} from '../domain/profitabilityEngine'
import {
  generateWmsLoadingMap,
} from '../domain/wmsEngine'
import {
  calculateMilestoneIntervals,
  aggregateExpeditionPerformance,
  generateExpeditionAiImprovementProposals,
} from '../domain/expeditionEngine'
import {
  runCiafalOptimizer,
} from '../domain/optimizerEngine'
import { SapSalesOrderEntity, SapStockCurrentEntity, QueueEntryEntity, PcpProductionOrderEntity } from '../domain/rules'

describe('SPRINT 6 SUITE: Previsto x Realizado & Rentabilidade Logística', () => {
  it('1. Deve calcular o resultado previsto positivo com base na tabela comercial SP', () => {
    const planned = calculatePlannedFreightResult({
      itineraryCode: 'MG001A',
      weightKg: 30000,
      distanceKm: 500,
      vehicleType: 'Carreta LS 32t',
      axlesCount: 5,
    })

    expect(planned.receitaFretePrevista).toBe(6315) // 30t * 210.50
    expect(planned.fretePrevistoMotorista).toBeGreaterThan(0)
    expect(planned.pedagioPrevisto).toBeGreaterThan(0)
    expect(planned.resultadoPrevisto).toBe(
      Math.round((planned.receitaFretePrevista - (planned.fretePrevistoMotorista + planned.pedagioPrevisto + planned.outrosCustosPrevistos)) * 100) / 100
    )
    expect(planned.margemPrevistaPct).toBeGreaterThan(0)
  })

  it('2. Deve calcular o resultado realizado e apurar desvios favoráveis quando o frete real for menor que o previsto', () => {
    const realized = calculateRealizedFreightResult({
      receitaFreteReal: 6500,
      fretePagoMotorista: 4500,
      pedagioReal: 400,
      outrosCustosReais: 100,
      resultadoPrevistoRef: 1200,
      fretePrevistoMotoristaRef: 4800,
    })

    expect(realized.custoTotalReal).toBe(5000)
    expect(realized.resultadoRealizado).toBe(1500)
    expect(realized.margemRealizadaPct).toBeCloseTo(23.08, 1)
    expect(realized.desvioResultado).toBe(300)
    expect(realized.desvioFreteMotorista).toBe(-300)
    expect(realized.isDesvioFavoravel).toBe(true)
    expect(realized.isLucrativo).toBe(true)
  })

  it('3. Deve apurar desvio desfavorável quando o frete pago ao motorista superar a estimativa', () => {
    const realized = calculateRealizedFreightResult({
      receitaFreteReal: 5000,
      fretePagoMotorista: 5200,
      pedagioReal: 300,
      outrosCustosReais: 50,
      resultadoPrevistoRef: 500,
      fretePrevistoMotoristaRef: 4200,
    })

    expect(realized.resultadoRealizado).toBe(-550)
    expect(realized.isDesvioFavoravel).toBe(false)
    expect(realized.isLucrativo).toBe(false)
    expect(realized.desvioFreteMotorista).toBe(1000)
  })

  it('4. Deve agregar rentabilidade com cálculo de erro médio e acurácia de previsão', () => {
    const sampleRecords = [
      {
        cargo_id: 'C1',
        total_weight_kg: 30000,
        receita_frete_real: 6000,
        frete_pago_motorista: 4500,
        frete_previsto_motorista: 4500,
        pedagio_real: 300,
        resultado_previsto: 1200,
        resultado_realizado: 1200,
      },
      {
        cargo_id: 'C2',
        total_weight_kg: 25000,
        receita_frete_real: 5000,
        frete_pago_motorista: 4800,
        frete_previsto_motorista: 4000,
        pedagio_real: 400,
        resultado_previsto: 600,
        resultado_realizado: -200,
      },
    ]

    const agg = aggregateProfitability(sampleRecords)
    expect(agg.totalCargas).toBe(2)
    expect(agg.totalPesoTons).toBe(55)
    expect(agg.totalResultadoRealizado).toBe(1000)
    expect(agg.cargasComPrejuizoCount).toBe(1)
    expect(agg.erroMedioReais).toBe(400) // (0 + 800) / 2
  })
})

describe('SPRINT 6 SUITE: WMS & Mapa de Carregamento', () => {
  const sampleOrders = [
    {
      id: 'O1',
      order_number: 'P01',
      customer_code: 'C1',
      customer_name: 'Cliente Próximo (São Paulo)',
      destination_city: 'São Paulo',
      uf: 'SP',
      weight_kg: 10000,
      distance_km: 50,
      plant: 'SDPL',
      storage_location: 'DP34',
    },
    {
      id: 'O2',
      order_number: 'P02',
      customer_code: 'C2',
      customer_name: 'Cliente Distante Sidercentro',
      destination_city: 'Belo Horizonte',
      uf: 'MG',
      weight_kg: 12000,
      distance_km: 580,
      plant: 'SDPL',
      storage_location: 'DS11', // SIDERCENTRO
      material_description: 'Chapa Sidercentro DS11',
    },
    {
      id: 'O3',
      order_number: 'P03',
      customer_code: 'C3',
      customer_name: 'Cliente Intermediário L2 Pesado',
      destination_city: 'Campinas',
      uf: 'SP',
      weight_kg: 8000,
      distance_km: 100,
      plant: 'SDPL',
      storage_location: 'DP34',
      is_perfil_pesado_l2: true,
      material: 'L2-PERFIL-W310',
    },
  ]

  it('5. Deve ordenar o carregamento colocando Sidercentro (DS11) e Perfil Pesado L2 primeiro', () => {
    const map = generateWmsLoadingMap({
      cargoId: 'CARGA-TESTE-01',
      vehiclePlate: 'ABC-1234',
      vehicleType: 'Carreta Aberta',
      itineraryCode: 'MG001A',
      capacityKg: 32000,
      orders: sampleOrders,
      wmsConfigured: false,
    })

    expect(map.items.length).toBe(3)
    // Sidercentro deve ser o 1º a carregar
    expect(map.items[0].isSidercentro).toBe(true)
    expect(map.items[0].specialHandlingFlag).toBe('PRIORIDADE_CARREGAMENTO_SIDERCENTRO')
    expect(map.items[0].loadingSequenceOrder).toBe(1)

    // Perfil Pesado L2 deve ser o 2º
    expect(map.items[1].isPerfilPesadoL2).toBe(true)
    expect(map.items[1].specialHandlingFlag).toBe('PRIORIDADE_CARREGAMENTO_PERFIL_PESADO_L2')

    // Integração WMS deve estar explicitamente marcada como AGUARDANDO_CONFIGURACAO
    expect(map.wmsIntegrationStatus).toBe('AGUARDANDO_CONFIGURACAO')
  })

  it('6. Deve detectar conflito de carregamento quando item prioritário no fundo for a 1ª parada em veículo baú', () => {
    const ordersConflict = [
      {
        id: 'O1',
        order_number: 'P01',
        customer_code: 'C1',
        customer_name: 'Cliente Muito Próximo (1ª Descarga)',
        destination_city: 'Osasco',
        uf: 'SP',
        weight_kg: 15000,
        distance_km: 20,
        plant: 'SDPL',
        storage_location: 'DS11', // Sidercentro precisa do fundo, mas é 1ª parada
        material_description: 'Sidercentro',
      },
      {
        id: 'O2',
        order_number: 'P02',
        customer_code: 'C2',
        customer_name: 'Cliente Distante',
        destination_city: 'Ribeirão Preto',
        uf: 'SP',
        weight_kg: 10000,
        distance_km: 320,
        plant: 'SDPL',
        storage_location: 'DP34',
      },
    ]

    const map = generateWmsLoadingMap({
      cargoId: 'CARGA-CONFLITO-01',
      vehiclePlate: 'BAU-9988',
      vehicleType: 'Carreta Baú Fechado',
      itineraryCode: 'SP002B',
      capacityKg: 30000,
      orders: ordersConflict,
      wmsConfigured: true,
    })

    expect(map.hasConflicts).toBe(true)
    expect(map.conflictNotes.length).toBeGreaterThan(0)
    expect(map.conflictNotes[0]).toContain('CONFLITO DE CARREGAMENTO')
    expect(map.isReadyForLoading).toBe(false)
  })
})

describe('SPRINT 6 SUITE: Carteira SAP RFC — Fonte Única da Carteira Comercial', () => {
  it('1. Deve validar entidade oficial SapSalesOrderEntity espelhada do SAP RFC', () => {
    const order: SapSalesOrderEntity = {
      id: 'ord-sap-001',
      order_number: '258477',
      item_number: '000010',
      customer_code: 'CLI-258477',
      customer_name: 'METALURGICA ALAGOAS S.A.',
      destination_city: 'MACEIO',
      uf: 'AL',
      weight_kg: 2000,
      total_value: 12500,
      freight_value: 531,
      credit_limit: 104944.72,
      itinerary_code: 'AL001C',
      credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
      credit_status: 'Liberado',
      production_status: 'Pronto',
      origem_dado: 'SAP',
    }

    expect(order.order_number).toBe('258477')
    expect(order.origem_dado).toBe('SAP')
    expect(order.weight_kg).toBe(2000)
    expect(order.itinerary_code).toBe('AL001C')
    expect(order.credit_status).toBe('Liberado')
  })

  it('2. Deve garantir chave técnica operacional e integridade com SAP ECC', () => {
    const order1: SapSalesOrderEntity = {
      id: 'ord-1',
      order_number: '258090',
      item_number: '000010',
      customer_code: 'CLI-258090',
      customer_name: 'CLIENTE EXEMPLO S.A.',
      destination_city: 'CONTAGEM',
      uf: 'MG',
      itinerary_code: 'MG001A',
      material: 'B. RED. 1/2',
      weight_kg: 1000,
      total_value: 5000,
      credit_status: 'Liberado',
      production_status: 'Pronto',
      origem_dado: 'SAP',
    }
    const order2: SapSalesOrderEntity = {
      id: 'ord-2',
      order_number: '258090',
      item_number: '000020',
      customer_code: 'CLI-258090',
      customer_name: 'CLIENTE EXEMPLO S.A.',
      destination_city: 'CONTAGEM',
      uf: 'MG',
      itinerary_code: 'MG001A',
      material: 'CANT. 1.1/2 X 1/8',
      weight_kg: 1000,
      total_value: 5000,
      credit_status: 'Liberado',
      production_status: 'Pronto',
      origem_dado: 'SAP',
    }

    const key1 = `${order1.order_number}_${order1.item_number}`
    const key2 = `${order2.order_number}_${order2.item_number}`

    expect(key1).not.toBe(key2)
    expect(order1.origem_dado).toBe('SAP')
    expect(order2.origem_dado).toBe('SAP')
  })
})

describe('SPRINT 6 SUITE: Performance da Expedição (Marcos T0 a T10)', () => {
  it('8. Deve calcular os intervalos de marcos e identificar o gargalo principal', () => {
    const milestone = {
      cargo_id: 'C-01',
      vehicle_plate: 'ABC-1234',
      t0_entrada: '2025-05-10T08:00:00Z',
      t1_disponibilizacao: '2025-05-10T08:15:00Z',
      t2_carga_atribuida: '2025-05-10T08:30:00Z',
      t3_ordem_sap: '2025-05-10T08:45:00Z',
      t4_chamado_doca: '2025-05-10T09:30:00Z',
      t5_inicio_carregamento: '2025-05-10T10:15:00Z', // 90 min de espera T5-T3
      t6_fim_carregamento: '2025-05-10T11:00:00Z',
      t7_conferencia: '2025-05-10T11:20:00Z',
      t8_faturamento: '2025-05-10T11:45:00Z',
      t9_documento_entregue: '2025-05-10T11:55:00Z',
      t10_saida: '2025-05-10T12:00:00Z',
    }

    const intervals = calculateMilestoneIntervals(milestone)
    expect(intervals.t10_t0_lead_time_total_min).toBe(240)
    expect(intervals.t5_t3_espera_carregamento_min).toBe(90)
    expect(intervals.gargaloPrincipal).toContain('Espera para Carregamento')
    expect(intervals.gargaloDuracaoMin).toBe(90)
  })

  it('9. Deve agregar performance com cálculo de P90 e gerar propostas IA sem auto-execução', () => {
    const milestones = [
      {
        cargo_id: 'C1',
        vehicle_plate: 'P1',
        t0_entrada: '2025-05-10T08:00:00Z',
        t10_saida: '2025-05-10T11:00:00Z', // 180 min
      },
      {
        cargo_id: 'C2',
        vehicle_plate: 'P2',
        t0_entrada: '2025-05-10T08:00:00Z',
        t10_saida: '2025-05-10T13:00:00Z', // 300 min
      },
    ]

    const summary = aggregateExpeditionPerformance(milestones, 240)
    expect(summary.totalExpedicoes).toBe(2)
    expect(summary.leadTimeMedioMin).toBe(240)
    expect(summary.pctDentroMeta).toBe(50)

    const proposals = generateExpeditionAiImprovementProposals(summary)
    expect(proposals.length).toBeGreaterThan(0)
    expect(proposals[0].hipotese).toContain('Hipótese analítica')
    expect(proposals[0].prioridade).toBeDefined()
  })
})

describe('SPRINT 6 SUITE: Otimizador & Cenários do Planejador IA', () => {
  it('10. Deve gerar os 6 cenários exigidos da Sprint 6 (A até F)', () => {
    const orders: SapSalesOrderEntity[] = [
      {
        id: 'ord-1',
        order_number: 'PED-001',
        customer_code: 'CLI-01',
        customer_name: 'CLIENTE A',
        destination_city: 'Contagem',
        uf: 'MG',
        itinerary_code: 'MG001A',
        material: 'PERFIL',
        weight_kg: 12000,
        total_value: 50000,
        credit_status: 'Liberado',
        production_status: 'Pronto',
        discharge_type: 'Ponte Rolante',
        desired_date: '2025-05-01', // Atrasado
      },
      {
        id: 'ord-2',
        order_number: 'PED-002',
        customer_code: 'CLI-02',
        customer_name: 'CLIENTE B',
        destination_city: 'Betim',
        uf: 'MG',
        itinerary_code: 'MG001A',
        material: 'CHAPA',
        weight_kg: 18000,
        total_value: 80000,
        credit_status: 'Liberado',
        production_status: 'Pronto',
        discharge_type: 'Ponte Rolante',
        desired_date: '2025-05-10',
      },
    ]

    const stock: SapStockCurrentEntity[] = [
      {
        id: 'stk-1',
        material_code: 'PERFIL',
        material_description: 'PERFIL ESTRUTURAL',
        plant: 'SDPL',
        storage_location: 'DP34',
        quantity: 20000,
        unit: 'KG',
        weight_kg: 20000,
        available_qty: 20000,
      },
      {
        id: 'stk-2',
        material_code: 'CHAPA',
        material_description: 'CHAPA AÇO',
        plant: 'SDPL',
        storage_location: 'DP34',
        quantity: 25000,
        unit: 'KG',
        weight_kg: 25000,
        available_qty: 25000,
      },
    ]

    const queue: QueueEntryEntity[] = [
      {
        id: 'q-1',
        driver: 'drv-01',
        driver_name_cached: 'Motorista Porta',
        vehicle_plate_cached: 'ABC-1234',
        vehicle_type_cached: 'Carreta LS',
        vehicle_capacity_kg_cached: 32000,
        type: 'PORTA',
        status: 'disponivel',
        entry_time: '2025-05-10T07:30:00Z',
        preferred_itinerary: 'MG001A',
      },
    ]

    const res = runCiafalOptimizer({
      itineraryCode: 'MG001A',
      plannedDate: '2025-05-10',
      vehicleCapacityKg: 32000,
      vehicleType: 'Carreta LS 32t',
      orders,
      stocks: stock,
      pcpOrders: [],
      queueEntries: queue,
    })

    expect(res.scenarios.length).toBe(6)
    const types = res.scenarios.map((s) => s.scenarioType)
    expect(types).toContain('scenario_a_immediate')
    expect(types).toContain('scenario_b_max_occupancy')
    expect(types).toContain('scenario_c_overdue')
    expect(types).toContain('scenario_d_best_profit')
    expect(types).toContain('scenario_e_lowest_cost')
    expect(types).toContain('scenario_f_balanced')
  })
})
