import { describe, it, expect } from 'vitest'
import {
  resolveOrderLocation,
  BRAZIL_CITY_COORDINATES,
  OFFICIAL_ORIGIN_HUBS,
  normalizeCityName,
  latLngToSvgPoint,
} from '@/domain/geographicEngine'
import { processGeographicDemands } from '@/domain/geographicClusterEngine'
import {
  buildClientDeliveryStops,
  runMulticriteriaClusterization,
  calculateScenarioComparison,
  haversineDistanceKm,
  sequenceStopsFromOrigin,
  CLUSTER_COLOR_PALETTE,
} from '@/domain/logisticRoutingEngine'
import { SapSalesOrderEntity, SapItineraryEntity } from '@/domain/rules'

describe('Central Visual de Roteirização e Clusterização - TMS CIAFAL', () => {
  it('deve resolver coordenadas prioritariamente por dados cadastrados, banco de cidades ou centroide UF', () => {
    // 1) Coordenada exata
    const ord1 = {
      dest_latitude: -19.92,
      dest_longitude: -44.05,
      destination_city: 'Contagem',
      uf: 'MG',
    }
    const res1 = resolveOrderLocation(ord1)
    expect(res1.status).toBe('EXACT_COORDINATE')
    expect(res1.lat).toBe(-19.92)
    expect(res1.isPending).toBe(false)

    // 2) Banco oficial de cidades
    const ord2 = {
      destination_city: 'Uberlândia',
      uf: 'MG',
    }
    const res2 = resolveOrderLocation(ord2)
    expect(res2.status).toBe('CITY_DATABASE')
    expect(res2.lat).toBeCloseTo(-18.9186, 2)
    expect(res2.isPending).toBe(false)

    // 3) Centroide de estado
    const ord3 = {
      destination_city: 'Cidade Desconhecida',
      uf: 'GO',
    }
    const res3 = resolveOrderLocation(ord3)
    expect(res3.status).toBe('UF_CENTROID')
    expect(res3.isPending).toBe(false)

    // 4) Sem dados -> Localização Pendente sem quebrar
    const ord4 = {
      destination_city: '',
      uf: '',
    }
    const res4 = resolveOrderLocation(ord4)
    expect(res4.isPending).toBe(true)
  })

  it('deve conter as origens canônicas oficiais CIAFAL Matriz e Sidercentro', () => {
    expect(OFFICIAL_ORIGIN_HUBS.length).toBeGreaterThanOrEqual(2)
    const matriz = OFFICIAL_ORIGIN_HUBS.find((h) => h.type === 'MATRIZ_CIAFAL')
    const sider = OFFICIAL_ORIGIN_HUBS.find((h) => h.type === 'SIDERCENTRO')
    expect(matriz).toBeDefined()
    expect(sider).toBeDefined()
    expect(matriz?.city).toBe('CONTAGEM')
  })

  it('deve consolidar múltiplos pedidos do mesmo cliente/endereço no mesmo marcador (#2)', () => {
    const orders: SapSalesOrderEntity[] = [
      {
        id: 'o-1',
        order_number: '1001',
        customer_code: 'CLI-001',
        customer_name: 'METALURGICA ALVORADA',
        destination_city: 'Contagem',
        uf: 'MG',
        weight_kg: 8000,
        itinerary_code: 'MG001',
        status: 'ativo',
      } as any,
      {
        id: 'o-2',
        order_number: '1002',
        customer_code: 'CLI-001',
        customer_name: 'METALURGICA ALVORADA',
        destination_city: 'Contagem',
        uf: 'MG',
        weight_kg: 12000,
        itinerary_code: 'MG001',
        status: 'ativo',
      } as any,
      {
        id: 'o-3',
        order_number: '1003',
        customer_code: 'CLI-002',
        customer_name: 'SIDERURGICA BETIM',
        destination_city: 'Betim',
        uf: 'MG',
        weight_kg: 7500,
        itinerary_code: 'MG001',
        status: 'ativo',
      } as any,
    ]

    const stops = buildClientDeliveryStops(orders)

    // Devem existir 2 paradas consolidadas (Alvorada e Betim)
    expect(stops.length).toBe(2)

    const alvorada = stops.find((s) => s.customerCode === 'CLI-001')
    expect(alvorada).toBeDefined()
    expect(alvorada?.ordersCount).toBe(2)
    expect(alvorada?.totalWeightTon).toBe(20) // 8t + 12t
  })

  it('deve executar clusterização logística multicritério gerando cores semânticas e sequenciamento (#3, #4, #8)', () => {
    const orders: SapSalesOrderEntity[] = [
      {
        id: 'o-1',
        order_number: '1001',
        customer_code: 'CLI-001',
        customer_name: 'CLIENTE UBERABA',
        destination_city: 'Uberaba',
        uf: 'MG',
        weight_kg: 15000,
        itinerary_code: 'MG002',
        production_status: 'Pronto',
        status: 'ativo',
      } as any,
      {
        id: 'o-2',
        order_number: '1002',
        customer_code: 'CLI-002',
        customer_name: 'CLIENTE UBERLANDIA',
        destination_city: 'Uberlândia',
        uf: 'MG',
        weight_kg: 13000,
        itinerary_code: 'MG002',
        production_status: 'Pronto',
        status: 'ativo',
      } as any,
      {
        id: 'o-3',
        order_number: '1003',
        customer_code: 'CLI-003',
        customer_name: 'CLIENTE DIVINOPOLIS',
        destination_city: 'Divinópolis',
        uf: 'MG',
        weight_kg: 27000,
        itinerary_code: 'MG003',
        production_status: 'Pronto',
        status: 'ativo',
      } as any,
    ]

    const stops = buildClientDeliveryStops(orders)
    const result = runMulticriteriaClusterization({
      stops,
      priorityMode: 'EQUILIBRIO_GERAL',
    })

    expect(result.clusters.length).toBeGreaterThanOrEqual(1)

    // Cada carga tem cor própria semântica
    const firstCluster = result.clusters[0]
    expect(firstCluster.color).toBeDefined()
    expect(firstCluster.color.hex).toBe(CLUSTER_COLOR_PALETTE[0].hex)

    // Sequenciamento de paradas numerado
    expect(firstCluster.stops.length).toBeGreaterThan(0)
    expect(firstCluster.stops[0].stopSequence).toBe(1)

    // IA Explicável com justificativa quantitativa (#19)
    expect(firstCluster.aiRationale).toContain('Carga formada por')
    expect(firstCluster.aiRationale).toContain('reduz ~')
  })

  it('deve calcular comparação de cenários A (Convencional) vs B (Clusterização IA) com métricas de redução (#5)', () => {
    const orders: SapSalesOrderEntity[] = [
      {
        id: 'o-1',
        order_number: '2001',
        customer_code: 'CLI-A',
        customer_name: 'AÇOS CAMPINAS',
        destination_city: 'Campinas',
        uf: 'SP',
        weight_kg: 14000,
        itinerary_code: 'SP002',
        status: 'ativo',
      } as any,
      {
        id: 'o-2',
        order_number: '2002',
        customer_code: 'CLI-B',
        customer_name: 'TUBOS JUNDIAI',
        destination_city: 'Jundiaí',
        uf: 'SP',
        weight_kg: 13500,
        itinerary_code: 'SP002',
        status: 'ativo',
      } as any,
    ]

    const stops = buildClientDeliveryStops(orders)
    const clusterRes = runMulticriteriaClusterization({ stops })
    const comparison = calculateScenarioComparison({
      stops,
      clustersIa: clusterRes.clusters,
      unplannedIa: clusterRes.unplannedStops,
    })

    expect(comparison.scenarioA).toBeDefined()
    expect(comparison.scenarioB).toBeDefined()
    expect(comparison.savings).toBeDefined()

    // Cenário B deve ter menos ou iguais cargas que o convencional fracionado
    expect(comparison.scenarioB.loadsCount).toBeLessThanOrEqual(comparison.scenarioA.loadsCount)
    expect(comparison.savings.freightSavingsBrl).toBeGreaterThanOrEqual(0)
  })

  it('deve calcular distâncias geográficas corretas via Haversine', () => {
    // Contagem (-19.9317, -44.0536) até Betim (-19.9678, -44.1983) ~15.7 km
    const d = haversineDistanceKm(-19.9317, -44.0536, -19.9678, -44.1983)
    expect(d).toBeGreaterThan(10)
    expect(d).toBeLessThan(25)
  })
})
