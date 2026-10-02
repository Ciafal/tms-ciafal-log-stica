/**
 * SUÍTE DE TESTES OBRIGATÓRIOS DO MOTOR DE OTIMIZAÇÃO LEXICOGRÁFICO (TMS CIAFAL)
 *
 * Testes Funcionais P1 a P8 & Cenários de Homologação:
 * (T1) Menor nº de clientes: 28t, faixa 70–95%, mesmo itinerário — A: 26t / 2 clientes DEVE vencer B: 26,4t / 4 clientes se demais fatores equivalentes.
 * (T2) Custo: A: 26t / 2 clientes / R$ 4.200 vs B: 26t / 2 clientes / R$ 4.000 -> B na frente.
 * (T3) Não sacrificar operação por pequeno ganho: A: 26t / 2 clientes / R$ 4.100 vs B: 26,2t / 5 clientes / R$ 4.000 -> motor NÃO prioriza B automaticamente por R$ 100.
 * (T4) Itinerário: pedidos em dois itinerários não são misturados automaticamente; primeiro melhores alternativas dentro de cada itinerário; consolidação só com compatibilidade explícita.
 * (T5) ANTT: combinação com valor abaixo do mínimo ANTT gera alerta "Valor abaixo do mínimo ANTT aplicável." e não é aprovada automaticamente.
 * (T6) Geração de até 3 alternativas ordenadas corretamente.
 * Exemplo numérico de referência do usuário: veículo 28t, ocupação 70–95%, itinerário MG-05, clientes A=14t, B=12t, C=5t, D=4t -> A+B = 26t = 2 clientes = 2 descargas = 92,9% deve vencer A+C+D = 23t = 3 clientes = 82,1%.
 */

import { describe, it, expect } from 'vitest'
import {
  runLexicographicOptimizerForItinerary,
  compareCombinationsLexicographically,
  calculateCandidateLogistics,
  CandidateLoadCombination,
} from '../domain/lexicographicOptimizationEngine'
import { runGlobalCiafalOptimizer } from '../domain/optimizerEngine'
import { SapSalesOrderEntity, SapStockCurrentEntity, QueueEntryEntity } from '../domain/rules'

function createMockOrder(params: {
  id: string
  order_number: string
  customer_code: string
  customer_name: string
  itinerary: string
  weight_kg: number
  desired_date?: string
  credit_status?: 'Liberado' | 'Bloqueado' | 'Em Análise'
  discharges_count?: number
  destination_city?: string
  uf?: string
}): SapSalesOrderEntity {
  return {
    id: params.id,
    order_number: params.order_number,
    item_number: '000010',
    customer_code: params.customer_code,
    customer_name: params.customer_name,
    material: 'PERFIL-ACO-100',
    material_description: 'Perfil de Aço Galvanizado',
    weight_kg: params.weight_kg,
    volume_m3: params.weight_kg / 2500,
    itinerary_code: params.itinerary,
    destination_city: params.destination_city || 'Belo Horizonte',
    uf: params.uf || 'MG',
    desired_date: params.desired_date || '2026-08-10',
    order_date: '2026-08-01',
    credit_status: params.credit_status || 'Liberado',
    discharges_count: params.discharges_count || 1,
    status: 'disponivel',
    total_value: 50000,
    production_status: 'Pronto',
  }
}

describe('Motor de Otimização Lexicográfico — TMS CIAFAL', () => {
  const defaultStocks: SapStockCurrentEntity[] = [
    {
      id: 'stk-1',
      material_code: 'PERFIL-ACO-100',
      material_description: 'Perfil de Aço Galvanizado',
      plant: '1000',
      storage_location: 'DP34',
      quantity: 200,
      unit: 'TO',
      weight_kg: 200000,
      available_qty: 200,
    },
  ]

  const defaultQueue: QueueEntryEntity[] = [
    {
      id: 'q-1',
      driver: 'drv-1',
      driver_name_cached: 'Carlos Motorista PORTA',
      driver_doc_cached: '111.222.333-44',
      vehicle_plate_cached: 'ABC1D23',
      vehicle_type_cached: 'Carreta 5 Eixos',
      vehicle_capacity_kg_cached: 28000,
      entry_time: '2026-08-10T08:00:00Z',
      status: 'disponivel',
      type: 'PORTA',
      preferred_itinerary: 'MG-05',
    },
  ]

  it('T1: Menor número de clientes deve vencer quando ocupação e fatores são comparáveis (26t/2 cli vence 26,4t/4 cli)', () => {
    // A: 26t / 2 clientes
    // B: 26,4t / 4 clientes
    const mockA: Partial<CandidateLoadCombination> = {
      isBelowAnttFloor: false,
      isStockReady: true,
      isCreditReady: true,
      overdueOrdersCount: 0,
      maxOverdueDays: 0,
      customersCount: 2,
      dischargesCount: 2,
      occupancyPct: 92.8,
      totalWeightKg: 26000,
      estimatedCost: 4000,
      additionalKm: 18,
      costPerTon: 153.8,
    }

    const mockB: Partial<CandidateLoadCombination> = {
      isBelowAnttFloor: false,
      isStockReady: true,
      isCreditReady: true,
      overdueOrdersCount: 0,
      maxOverdueDays: 0,
      customersCount: 4,
      dischargesCount: 4,
      occupancyPct: 94.2,
      totalWeightKg: 26400,
      estimatedCost: 4050,
      additionalKm: 54,
      costPerTon: 153.4,
    }

    const comparison = compareCombinationsLexicographically(
      mockA as CandidateLoadCombination,
      mockB as CandidateLoadCombination,
      70,
      95,
    )

    // Negativo significa que mockA vence mockB estritamente
    expect(comparison).toBeLessThan(0)
  })

  it('T2: Custo desempatador: com mesmo número de clientes e descargas, menor custo vence (R$ 4.000 vence R$ 4.200)', () => {
    const mockA: Partial<CandidateLoadCombination> = {
      isBelowAnttFloor: false,
      isStockReady: true,
      isCreditReady: true,
      overdueOrdersCount: 0,
      maxOverdueDays: 0,
      customersCount: 2,
      dischargesCount: 2,
      occupancyPct: 92.8,
      totalWeightKg: 26000,
      estimatedCost: 4200,
      additionalKm: 18,
      costPerTon: 161.5,
    }

    const mockB: Partial<CandidateLoadCombination> = {
      isBelowAnttFloor: false,
      isStockReady: true,
      isCreditReady: true,
      overdueOrdersCount: 0,
      maxOverdueDays: 0,
      customersCount: 2,
      dischargesCount: 2,
      occupancyPct: 92.8,
      totalWeightKg: 26000,
      estimatedCost: 4000,
      additionalKm: 18,
      costPerTon: 153.8,
    }

    const comp = compareCombinationsLexicographically(
      mockA as CandidateLoadCombination,
      mockB as CandidateLoadCombination,
      70,
      95,
    )

    // mockB (R$ 4.000) deve vencer mockA (R$ 4.200) -> comp > 0
    expect(comp).toBeGreaterThan(0)
  })

  it('T3: Não sacrificar operação por pequeno ganho: 2 clientes (R$ 4.100) vence 5 clientes (R$ 4.000) pelo critério P3', () => {
    // Proibido permitir que um pequeno ganho de custo troque 2 clientes por 5 ou 6
    const mock2Cli: Partial<CandidateLoadCombination> = {
      isBelowAnttFloor: false,
      isStockReady: true,
      isCreditReady: true,
      overdueOrdersCount: 0,
      maxOverdueDays: 0,
      customersCount: 2,
      dischargesCount: 2,
      occupancyPct: 92.8,
      totalWeightKg: 26000,
      estimatedCost: 4100,
      additionalKm: 18,
      costPerTon: 157.6,
    }

    const mock5Cli: Partial<CandidateLoadCombination> = {
      isBelowAnttFloor: false,
      isStockReady: true,
      isCreditReady: true,
      overdueOrdersCount: 0,
      maxOverdueDays: 0,
      customersCount: 5,
      dischargesCount: 5,
      occupancyPct: 93.5,
      totalWeightKg: 26200,
      estimatedCost: 4000, // Ganho de apenas R$ 100
      additionalKm: 72,
      costPerTon: 152.6,
    }

    const comp = compareCombinationsLexicographically(
      mock2Cli as CandidateLoadCombination,
      mock5Cli as CandidateLoadCombination,
      70,
      95,
    )

    // O motor DEVE priorizar 2 clientes mesmo com custo ligeiramente maior
    expect(comp).toBeLessThan(0)
  })

  it('T4: Itinerário: pedidos de diferentes itinerários não são misturados automaticamente', () => {
    const ordersItin1 = [
      createMockOrder({
        id: 'ord-mg-1',
        order_number: 'PED-MG-1',
        customer_code: 'CLI-MG1',
        customer_name: 'Cliente Minas 1',
        itinerary: 'MG-05',
        weight_kg: 14000,
      }),
      createMockOrder({
        id: 'ord-mg-2',
        order_number: 'PED-MG-2',
        customer_code: 'CLI-MG2',
        customer_name: 'Cliente Minas 2',
        itinerary: 'MG-05',
        weight_kg: 12000,
      }),
    ]

    const ordersItin2 = [
      createMockOrder({
        id: 'ord-sp-1',
        order_number: 'PED-SP-1',
        customer_code: 'CLI-SP1',
        customer_name: 'Cliente SP 1',
        itinerary: 'SP-01',
        weight_kg: 15000,
        destination_city: 'São Paulo',
        uf: 'SP',
      }),
    ]

    const allOrders = [...ordersItin1, ...ordersItin2]

    const result = runGlobalCiafalOptimizer({
      itineraryCode: 'ALL',
      plannedDate: '2026-08-10',
      orders: allOrders,
      stocks: defaultStocks,
      pcpOrders: [],
      queueEntries: defaultQueue,
      vehicleCapacityKg: 28000,
      vehicleType: 'Carreta 5 Eixos',
      itinerariesMetadata: {
        'MG-05': { description: 'Belo Horizonte e Região', uf: 'MG', region: 'Sudeste' },
        'SP-01': { description: 'São Paulo Capital', uf: 'SP', region: 'Sudeste' },
      },
    })

    // Cada carga proposta deve conter apenas pedidos do seu respectivo itinerário
    result.allProposedCargos.forEach((cargo) => {
      const distinctItins = new Set(cargo.orders.map((o) => o.itinerary_code))
      expect(distinctItins.size).toBe(1)
    })
  })

  it('T5: ANTT: combinação com valor negociado abaixo do mínimo ANTT gera alerta e não é aprovada automaticamente', () => {
    const orders = [
      createMockOrder({
        id: 'ord-mg-1',
        order_number: 'PED-MG-1',
        customer_code: 'CLI-MG1',
        customer_name: 'Cliente Minas 1',
        itinerary: 'MG-05',
        weight_kg: 14000,
      }),
      createMockOrder({
        id: 'ord-mg-2',
        order_number: 'PED-MG-2',
        customer_code: 'CLI-MG2',
        customer_name: 'Cliente Minas 2',
        itinerary: 'MG-05',
        weight_kg: 12000,
      }),
    ]

    // Tabela ANTT para 5 eixos e ~398km dá em torno de R$ 3.000+. Passando R$ 1.500 como negociado:
    const logistics = calculateCandidateLogistics(orders, 'Carreta 5 Eixos', 28000, 1500)

    expect(logistics.isBelowAnttFloor).toBe(true)
    expect(logistics.anttAlert).toContain('abaixo do mínimo ANTT aplicável')
    expect(logistics.anttFloorValue).toBeGreaterThan(1500)

    const optResult = runLexicographicOptimizerForItinerary({
      itineraryCode: 'MG-05',
      plannedDate: '2026-08-10',
      orders,
      stocks: defaultStocks,
      pcpOrders: [],
      queueEntries: defaultQueue,
      vehicleCapacityKg: 28000,
      vehicleType: 'Carreta 5 Eixos',
      negotiatedFreightCost: 1500,
    })

    const prop = optResult.bestProposal
    expect(prop).toBeDefined()
    expect(prop?.occupancyAlert).toContain('abaixo do mínimo ANTT aplicável')
    expect(prop?.readinessLabel).toBe('BLOQUEADA / EXCEÇÃO')
  })

  it('T6: Geração de até 3 alternativas e caso numérico de referência (A+B = 26t / 2 cli vence A+C+D = 23t / 3 cli)', () => {
    // Exemplo numérico de referência do usuário:
    // veículo 28t, ocupação 70–95%, itinerário MG-05
    // clientes: A = 14t, B = 12t, C = 5t, D = 4t
    // Combinação 1: A + B = 26t = 2 clientes = 2 descargas = 92,9%
    // Combinação 2: A + C + D = 23t = 3 clientes = 82,1%
    // A + B deve vencer A + C + D
    const orderA = createMockOrder({
      id: 'ord-A',
      order_number: 'PED-A',
      customer_code: 'CLI-A',
      customer_name: 'Cliente A',
      itinerary: 'MG-05',
      weight_kg: 14000,
    })
    const orderB = createMockOrder({
      id: 'ord-B',
      order_number: 'PED-B',
      customer_code: 'CLI-B',
      customer_name: 'Cliente B',
      itinerary: 'MG-05',
      weight_kg: 12000,
    })
    const orderC = createMockOrder({
      id: 'ord-C',
      order_number: 'PED-C',
      customer_code: 'CLI-C',
      customer_name: 'Cliente C',
      itinerary: 'MG-05',
      weight_kg: 5000,
    })
    const orderD = createMockOrder({
      id: 'ord-D',
      order_number: 'PED-D',
      customer_code: 'CLI-D',
      customer_name: 'Cliente D',
      itinerary: 'MG-05',
      weight_kg: 4000,
    })

    const optResult = runLexicographicOptimizerForItinerary({
      itineraryCode: 'MG-05',
      plannedDate: '2026-08-10',
      orders: [orderA, orderB, orderC, orderD],
      stocks: defaultStocks,
      pcpOrders: [],
      queueEntries: defaultQueue,
      vehicleCapacityKg: 28000,
      vehicleType: 'Carreta 5 Eixos',
      minOccupancyPct: 70,
      maxOccupancyPct: 95,
    })

    expect(optResult.topProposals.length).toBeGreaterThanOrEqual(1)
    expect(optResult.topProposals.length).toBeLessThanOrEqual(3)

    // A melhor proposta (Alternativa 1) DEVE ser A + B com 26t e 2 clientes
    const best = optResult.bestProposal!
    expect(best).toBeDefined()
    expect(best.totalWeightKg).toBe(26000)
    expect(best.customersCount).toBe(2)
    expect(best.occupancyPct).toBe(92.9)
    expect(best.priorityRanking).toBe(1)

    // Verifica que os pedidos contidos são exatamente A e B
    const bestOrderIds = best.orders.map((o) => o.id).sort()
    expect(bestOrderIds).toEqual(['ord-A', 'ord-B'])

    // A explicabilidade deve conter menção aos 2 clientes e aos 26.0 t
    expect(best.whyProposed).toContain('26.0 t')
    expect(best.whyProposed).toContain('2 cliente(s)')
  })
})
