import { describe, it, expect } from 'vitest'
import {
  resolveOrderLocation,
  computeAddressHash,
  BRAZIL_CITY_COORDINATES,
} from '@/domain/geographicEngine'
import {
  buildClientDeliveryStops,
  runMulticriteriaClusterization,
} from '@/domain/logisticRoutingEngine'
import { SapSalesOrderEntity } from '@/domain/rules'

describe('Mapa de Calor Inteligente por Itinerário - Requisitos de Negócio (v0.0.117)', () => {
  // Cenário A: Itinerário com pedidos -> heatmap automático com indicadores/destinos corretos
  it('(A) Itinerário com pedidos -> gera paradas agrupadas com destinos e pesos consolidados', () => {
    const orders: SapSalesOrderEntity[] = [
      {
        id: 'ord-1',
        order_number: 1001,
        customer_code: 100,
        customer_name: 'METALURGICA ALFA',
        destination_city: 'BETIM',
        uf: 'MG',
        weight_kg: 15000,
        itinerary_code: 'MG001A',
        credit_status: 'Liberado',
        status: 'disponivel',
        material: 'PERFIL I',
        total_value: 90000,
      } as any,
      {
        id: 'ord-2',
        order_number: 1002,
        customer_code: 101,
        customer_name: 'ACOS BRAVO',
        destination_city: 'CONTAGEM',
        uf: 'MG',
        weight_kg: 13000,
        itinerary_code: 'MG001A',
        credit_status: 'Liberado',
        status: 'disponivel',
        material: 'BARRA CHATA',
        total_value: 75000,
      } as any,
    ]

    const stops = buildClientDeliveryStops(orders)
    expect(stops).toHaveLength(2)

    const totalWeightTon = stops.reduce((acc, s) => acc + s.totalWeightTon, 0)
    expect(totalWeightTon).toBe(28)

    const clusterResult = runMulticriteriaClusterization({ stops })
    expect(clusterResult.clusters.length).toBeGreaterThanOrEqual(1)
    expect(clusterResult.clusters[0].totalWeightTon).toBe(28)
  })

  // Cenário B: Itinerário sem pedidos -> zerado, sem paradas fictícias
  it('(B) Itinerário sem pedidos -> lista vazia de paradas e sem pontos fictícios', () => {
    const emptyOrders: SapSalesOrderEntity[] = []
    const stops = buildClientDeliveryStops(emptyOrders)
    expect(stops).toHaveLength(0)

    const clusterResult = runMulticriteriaClusterization({ stops })
    expect(clusterResult.clusters).toHaveLength(0)
    expect(clusterResult.unplannedStops).toHaveLength(0)
  })

  // Cenário C: Múltiplos clientes no mesmo município -> agrupamento e soma sem duplicidade
  it('(C) Múltiplos clientes no mesmo município -> consolida paradas por cliente/endereço sem duplicar peso', () => {
    const ordersSameCity: SapSalesOrderEntity[] = [
      {
        id: 'ord-c1',
        order_number: 2001,
        customer_code: 200,
        customer_name: 'INDUSTRIA MECANICA 1',
        destination_city: 'CAMPINAS',
        uf: 'SP',
        weight_kg: 12000,
        itinerary_code: 'SP001A',
        credit_status: 'Liberado',
      } as any,
      {
        id: 'ord-c2',
        order_number: 2002,
        customer_code: 200, // mesmo cliente
        customer_name: 'INDUSTRIA MECANICA 1',
        destination_city: 'CAMPINAS',
        uf: 'SP',
        weight_kg: 8000,
        itinerary_code: 'SP001A',
        credit_status: 'Liberado',
      } as any,
      {
        id: 'ord-c3',
        order_number: 2003,
        customer_code: 201, // outro cliente na mesma cidade
        customer_name: 'SERRALHERIA CAMPINAS',
        destination_city: 'CAMPINAS',
        uf: 'SP',
        weight_kg: 7500,
        itinerary_code: 'SP001A',
        credit_status: 'Liberado',
      } as any,
    ]

    const stops = buildClientDeliveryStops(ordersSameCity)
    // Devem ser 2 paradas de clientes distintos em Campinas
    expect(stops).toHaveLength(2)

    const stopClient1 = stops.find((s) => s.customerCode === '200')
    expect(stopClient1).toBeDefined()
    expect(stopClient1?.ordersCount).toBe(2)
    expect(stopClient1?.totalWeightTon).toBe(20) // 12 + 8 t

    const stopClient2 = stops.find((s) => s.customerCode === '201')
    expect(stopClient2).toBeDefined()
    expect(stopClient2?.totalWeightTon).toBe(7.5)

    const totalWeight = stops.reduce((acc, s) => acc + s.totalWeightTon, 0)
    expect(totalWeight).toBe(27.5)
  })

  // Cenário D: Pedidos sem geolocalização -> alerta com PENDING_GEOCODING e nunca inventar coordenadas
  it('(D) Pedidos com município desconhecido -> PENDING_GEOCODING com lat: 0, lng: 0 sem inventar coordenadas', () => {
    const unknownOrder = {
      order_number: 9999,
      destination_city: 'CIDADE_INEXISTENTE_XYZ',
      uf: '',
    }

    const loc = resolveOrderLocation(unknownOrder)
    expect(loc.isPending).toBe(true)
    expect(loc.status).toBe('PENDING_GEOCODING')
    expect(loc.lat).toBe(0)
    expect(loc.lng).toBe(0)
    expect(loc.confidencePct).toBe(0)

    // Compute address hash
    const hash = computeAddressHash(unknownOrder)
    expect(hash).toContain('cidade_inexistente_xyz')
  })

  // Cenário E: Resolução de coordenadas prioritárias e determinísticas
  it('(E) Resolução geográfica: GPS direto > base oficial cidades > centroide UF', () => {
    // 1) GPS direto
    const orderGps = {
      dest_latitude: -19.95,
      dest_longitude: -44.2,
      destination_city: 'BETIM',
      uf: 'MG',
    }
    const locGps = resolveOrderLocation(orderGps)
    expect(locGps.status).toBe('EXACT_COORDINATE')
    expect(locGps.lat).toBe(-19.95)
    expect(locGps.lng).toBe(-44.2)

    // 2) Base oficial de cidades
    const orderCity = {
      destination_city: 'UBERLANDIA',
      uf: 'MG',
    }
    const locCity = resolveOrderLocation(orderCity)
    expect(locCity.status).toBe('CITY_DATABASE')
    expect(locCity.lat).toBe(BRAZIL_CITY_COORDINATES['UBERLANDIA'].lat)

    // 3) Centroide de UF se cidade não cadastrada mas UF existe
    const orderUf = {
      destination_city: 'POVOADO_DESCONHECIDO',
      uf: 'GO',
    }
    const locUf = resolveOrderLocation(orderUf)
    expect(locUf.status).toBe('UF_CENTROID')
    expect(locUf.isPending).toBe(false)
  })

  // Cenário F: Integração com cargas propostas -> correspondência pedidos/toneladas/cargas
  it('(F) Correspondência exata entre pedidos, toneladas consolidadas e formação de cargas propostas', () => {
    const orders: SapSalesOrderEntity[] = [
      {
        id: 'ord-f1',
        order_number: 3001,
        customer_code: 301,
        customer_name: 'CLIENTE SUL 1',
        destination_city: 'CURITIBA',
        uf: 'PR',
        weight_kg: 18000,
        itinerary_code: 'PR001A',
        credit_status: 'Liberado',
      } as any,
      {
        id: 'ord-f2',
        order_number: 3002,
        customer_code: 302,
        customer_name: 'CLIENTE SUL 2',
        destination_city: 'SAO JOSE DOS PINHAIS',
        uf: 'PR',
        weight_kg: 11000,
        itinerary_code: 'PR001A',
        credit_status: 'Liberado',
      } as any,
    ]

    const stops = buildClientDeliveryStops(orders)
    const clusterResult = runMulticriteriaClusterization({ stops })

    expect(clusterResult.clusters.length).toBe(1)
    const cluster = clusterResult.clusters[0]
    expect(cluster.totalWeightTon).toBe(29)
    expect(cluster.ordersCount).toBe(2)
    expect(cluster.clientsCount).toBe(2)
    expect(cluster.occupancyPct).toBeGreaterThanOrEqual(90)
    expect(cluster.aiRationale).toContain('t disponíveis')
  })
})
