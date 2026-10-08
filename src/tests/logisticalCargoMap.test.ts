import { describe, it, expect } from 'vitest'
import {
  resolveOrderLocation,
  computeAddressHash,
  BRAZIL_CITY_COORDINATES,
} from '@/domain/geographicEngine'
import {
  buildClientDeliveryStops,
  runMulticriteriaClusterization,
  buildItineraryRouteInfo,
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

  /**
   * --------------------------------------------------------------------
   * TESTES OBRIGATÓRIOS DO ITINERÁRIO (Cenários A, B, C, D e E do Usuário)
   * --------------------------------------------------------------------
   */

  // Teste A — Itinerário com pedidos e múltiplos destinos: desenhar rota + km + pedágios + heatmap
  it('Teste A: Itinerário com pedidos e múltiplos destinos calcula rota, km total consolidado, pedágios e waypoints', () => {
    const ordersGoiás: SapSalesOrderEntity[] = [
      {
        id: 'ord-go-1',
        order_number: 101,
        customer_code: 501,
        customer_name: 'AÇOS GOIÁS LTDA',
        destination_city: 'GOIANIA',
        uf: 'GO',
        weight_kg: 24000,
        itinerary_code: 'G0001A',
        credit_status: 'Liberado',
      } as any,
      {
        id: 'ord-go-2',
        order_number: 102,
        customer_code: 502,
        customer_name: 'ESTRUTURAS ANÁPOLIS S/A',
        destination_city: 'ANAPOLIS',
        uf: 'GO',
        weight_kg: 18500,
        itinerary_code: 'G0001A',
        credit_status: 'Liberado',
      } as any,
      {
        id: 'ord-go-3',
        order_number: 103,
        customer_code: 503,
        customer_name: 'METALÚRGICA RIO VERDE',
        destination_city: 'RIO VERDE',
        uf: 'GO',
        weight_kg: 21000,
        itinerary_code: 'G0001A',
        credit_status: 'Liberado',
      } as any,
    ]

    const stops = buildClientDeliveryStops(ordersGoiás)
    expect(stops).toHaveLength(3)

    const routeInfo = buildItineraryRouteInfo({
      itineraryCode: 'G0001A',
      itineraryDescription: 'G0001A — Goiânia / Anápolis / Rio Verde',
      stops,
      proposedLoadsCount: 3,
    })

    expect(routeInfo.hasValidRoute).toBe(true)
    expect(routeInfo.itineraryCode).toBe('G0001A')
    expect(routeInfo.totalWeightTon).toBe(63.5)
    expect(routeInfo.totalClientsCount).toBe(3)
    expect(routeInfo.totalOrdersCount).toBe(3)
    expect(routeInfo.proposedLoadsCount).toBe(3)

    // Distância estimada total > 0 (considerando percurso rodoviário com sinuosidade 1.25x e retorno)
    expect(routeInfo.estimatedDistanceKm).toBeGreaterThan(1000)
    expect(routeInfo.straightLineDistanceKm).toBeLessThan(routeInfo.estimatedDistanceKm)

    // Pedágio calculado e atualizado
    expect(routeInfo.estimatedTollBrl).toBeGreaterThan(100)
    expect(routeInfo.tollCalculationMode).toBe('ESTIMATED_RULE_AXLES')

    // Waypoints sequenciados (Origem -> Paradas -> Retorno)
    expect(routeInfo.waypoints.length).toBe(5) // 1 Origem + 3 Paradas + 1 Retorno
    expect(routeInfo.waypoints[0].type).toBe('ORIGIN')
    expect(routeInfo.waypoints[4].type).toBe('RETURN')
    expect(routeInfo.routeSegments.length).toBe(4)
  })

  // Teste B — Trocar para outro itinerário: limpar dados anteriores e recalcular novo traçado
  it('Teste B: Troca de itinerário recalcula e reflete exclusivamente os dados do novo itinerário selecionado', () => {
    // 1. Itinerário inicial (MG001A)
    const ordersMG: SapSalesOrderEntity[] = [
      {
        id: 'ord-mg-1',
        order_number: 201,
        customer_code: 601,
        customer_name: 'METALÚRGICA SETE LAGOAS',
        destination_city: 'SETE LAGOAS',
        uf: 'MG',
        weight_kg: 15000,
        itinerary_code: 'MG001A',
      } as any,
    ]
    const stopsMG = buildClientDeliveryStops(ordersMG)
    const routeMG = buildItineraryRouteInfo({
      itineraryCode: 'MG001A',
      stops: stopsMG,
    })

    expect(routeMG.itineraryCode).toBe('MG001A')
    expect(routeMG.totalWeightTon).toBe(15)
    expect(routeMG.destinationCities).toEqual(['SETE LAGOAS/MG'])

    // 2. Troca para SP001A (São Paulo)
    const ordersSP: SapSalesOrderEntity[] = [
      {
        id: 'ord-sp-1',
        order_number: 301,
        customer_code: 701,
        customer_name: 'DISTRIBUIDORA CAMPINAS',
        destination_city: 'CAMPINAS',
        uf: 'SP',
        weight_kg: 32000,
        itinerary_code: 'SP001A',
      } as any,
    ]
    const stopsSP = buildClientDeliveryStops(ordersSP)
    const routeSP = buildItineraryRouteInfo({
      itineraryCode: 'SP001A',
      stops: stopsSP,
    })

    expect(routeSP.itineraryCode).toBe('SP001A')
    expect(routeSP.totalWeightTon).toBe(32)
    expect(routeSP.destinationCities).toEqual(['CAMPINAS/SP'])
    expect(routeSP.estimatedDistanceKm).toBeGreaterThan(routeMG.estimatedDistanceKm)
  })

  // Teste C — Itinerário sem pedidos: sem rota, sem heatmap indevido e mensagem adequada
  it('Teste C: Itinerário sem pedidos resulta em rota desativada com mensagem exata de estado vazio', () => {
    const emptyStops: any[] = []
    const routeInfo = buildItineraryRouteInfo({
      itineraryCode: 'G0001A',
      stops: emptyStops,
    })

    expect(routeInfo.hasValidRoute).toBe(false)
    expect(routeInfo.failureReason).toBe('Nenhum pedido liberado para este itinerário.')
    expect(routeInfo.waypoints).toHaveLength(0)
    expect(routeInfo.routeSegments).toHaveLength(0)
    expect(routeInfo.totalWeightTon).toBe(0)
    expect(routeInfo.estimatedDistanceKm).toBe(0)
    expect(routeInfo.estimatedTollBrl).toBe(0)
  })

  // Teste D — Itinerário com pedidos mas cliente sem coordenada válida
  it('Teste D: Itinerário com cliente sem coordenada válida mantém os demais pontos válidos e emite alerta de inconsistência', () => {
    const ordersMistas: SapSalesOrderEntity[] = [
      {
        id: 'ord-valid-1',
        order_number: 401,
        customer_code: 801,
        customer_name: 'CLIENTE VÁLIDO BH',
        destination_city: 'BELO HORIZONTE',
        uf: 'MG',
        weight_kg: 10000,
        itinerary_code: 'MG001A',
      } as any,
      {
        id: 'ord-invalid-2',
        order_number: 402,
        customer_code: 802,
        customer_name: 'CLIENTE SEM COORDENADA',
        destination_city: 'MUNICIPIO_INEXISTENTE_SEM_GPS',
        uf: '',
        weight_kg: 5000,
        itinerary_code: 'MG001A',
      } as any,
    ]

    const stops = buildClientDeliveryStops(ordersMistas)
    const routeInfo = buildItineraryRouteInfo({
      itineraryCode: 'MG001A',
      stops,
    })

    // Deve traçar a rota com o cliente válido
    expect(routeInfo.hasValidRoute).toBe(true)
    expect(routeInfo.validStops).toHaveLength(1)
    expect(routeInfo.invalidStops).toHaveLength(1)
    expect(routeInfo.warningMessage).toContain('inconsistência cadastral de coordenadas')
    expect(routeInfo.warningMessage).toContain('mantendo os demais 1 pontos operacionais')
    // Waypoints traçados apenas para a origem + 1 cliente válido + retorno
    expect(routeInfo.waypoints.length).toBe(3)
  })

  // Teste E — Totais de toneladas, km e pedágios correspondem estritamente ao itinerário selecionado
  it('Teste E: Totais de toneladas, km e pedágios exibidos correspondem ao itinerário selecionado', () => {
    const orders: SapSalesOrderEntity[] = [
      {
        id: 'ord-e1',
        order_number: 501,
        customer_code: 901,
        customer_name: 'CLIENTE UBERABA',
        destination_city: 'UBERABA',
        uf: 'MG',
        weight_kg: 22400,
        itinerary_code: 'MG_TRIANGULO',
      } as any,
      {
        id: 'ord-e2',
        order_number: 502,
        customer_code: 902,
        customer_name: 'CLIENTE UBERLÂNDIA',
        destination_city: 'UBERLANDIA',
        uf: 'MG',
        weight_kg: 17600,
        itinerary_code: 'MG_TRIANGULO',
      } as any,
    ]

    const stops = buildClientDeliveryStops(orders)
    const routeInfo = buildItineraryRouteInfo({
      itineraryCode: 'MG_TRIANGULO',
      stops,
      proposedLoadsCount: 2,
    })

    expect(routeInfo.totalWeightTon).toBe(40.0) // 22.4 + 17.6
    expect(routeInfo.totalOrdersCount).toBe(2)
    expect(routeInfo.totalClientsCount).toBe(2)
    expect(routeInfo.proposedLoadsCount).toBe(2)

    // O somatório dos trechos deve bater exatamente com a distância estimada total
    const sumSegmentsDist = routeInfo.routeSegments.reduce((acc, s) => acc + s.distanceKm, 0)
    expect(sumSegmentsDist).toBe(routeInfo.estimatedDistanceKm)

    // O somatório dos pedágios de cada trecho deve bater com o total estimado
    const sumSegmentsToll = Math.round(routeInfo.routeSegments.reduce((acc, s) => acc + s.tollBrl, 0) * 100) / 100
    expect(sumSegmentsToll).toBe(routeInfo.estimatedTollBrl)
  })
})
