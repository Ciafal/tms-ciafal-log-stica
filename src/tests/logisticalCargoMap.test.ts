import { describe, it, expect } from 'vitest'
import {
  resolveOrderLocation,
  BRAZIL_CITY_COORDINATES,
  OFFICIAL_ORIGIN_HUBS,
  normalizeCityName,
  latLngToSvgPoint,
} from '@/domain/geographicEngine'
import { processGeographicDemands } from '@/domain/geographicClusterEngine'
import { SapSalesOrderEntity, SapItineraryEntity } from '@/domain/rules'

describe('Torre Geográfica - Mapa Logístico de Cargas CIAFAL', () => {
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

  it('deve processar agrupamentos por Brasil, Região, UF, Cidade e Itinerários SAP com cálculos reais', () => {
    const mockOrders: SapSalesOrderEntity[] = [
      {
        id: 'ord-1',
        order_number: '10001',
        customer_name: 'METALURGICA TRIANGULO',
        customer_code: 'CLI-01',
        destination_city: 'Uberlândia',
        uf: 'MG',
        itinerary_code: 'MG002',
        weight_kg: 18500,
        total_value: 120000,
        production_status: 'Pronto',
        credit_status: 'Liberado',
      } as any,
      {
        id: 'ord-2',
        order_number: '10002',
        customer_name: 'ACO UBERABA LTDA',
        customer_code: 'CLI-02',
        destination_city: 'Uberaba',
        uf: 'MG',
        itinerary_code: 'MG002',
        weight_kg: 9500,
        total_value: 65000,
        production_status: 'Pronto',
        credit_status: 'Liberado',
      } as any,
      {
        id: 'ord-3',
        order_number: '10003',
        customer_name: 'CONSTRUTORA SAO PAULO',
        customer_code: 'CLI-03',
        destination_city: 'São Paulo',
        uf: 'SP',
        itinerary_code: 'SP001',
        weight_kg: 24000,
        total_value: 180000,
        production_status: 'Programado',
        credit_status: 'Liberado',
      } as any,
    ]

    const mockItineraries: SapItineraryEntity[] = [
      {
        id: 'itin-1',
        sap_code: 'MG002',
        description: 'Triângulo Mineiro (Uberaba/Uberlândia)',
        uf: 'MG',
        region: 'Sudeste',
        active: true,
      } as any,
      {
        id: 'itin-2',
        sap_code: 'SP001',
        description: 'Grande São Paulo / Capital',
        uf: 'SP',
        region: 'Sudeste',
        active: true,
      } as any,
    ]

    const result = processGeographicDemands({
      orders: mockOrders,
      itineraries: mockItineraries,
      includeFuturePcp: true,
      variableHeatmap: 'TONELADAS',
    })

    // Totais
    expect(result.totalWeightTon).toBe(52) // 18.5 + 9.5 + 24
    expect(result.totalOrdersCount).toBe(3)
    expect(result.totalClientsCount).toBe(3)
    expect(result.activeUfsCount).toBe(2) // MG e SP

    // Oportunidade de consolidação no itinerário MG002 (18.5 + 9.5 = 28t)
    expect(result.consolidationOpportunities.length).toBeGreaterThanOrEqual(1)
    const mgOpp = result.consolidationOpportunities.find((o) => o.itineraryCode === 'MG002')
    expect(mgOpp).toBeDefined()
    expect(mgOpp?.totalWeightTon).toBe(28)
    expect(mgOpp?.estimatedOccupancyPct).toBe(100)
    expect(mgOpp?.estimatedSavingsBrl).toBeGreaterThan(0)

    // Insights da IA rastreáveis
    expect(result.aiInsights.length).toBeGreaterThan(0)
    expect(result.aiInsights[0].sourceOrders.length).toBeGreaterThan(0)
  })

  it('deve projetar coordenadas geográficas corretamente dentro dos limites do SVG 800x640', () => {
    const pt = latLngToSvgPoint(-19.9317, -44.0536, 800, 640)
    expect(pt.x).toBeGreaterThan(0)
    expect(pt.x).toBeLessThan(800)
    expect(pt.y).toBeGreaterThan(0)
    expect(pt.y).toBeLessThan(640)
  })
})
