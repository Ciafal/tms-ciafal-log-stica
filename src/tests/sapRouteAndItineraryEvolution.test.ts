import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SapRouteService } from '@/services/sapRouteService'
import pb from '@/lib/pocketbase/client'

describe('SapRouteService and Master Data Architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. should fetch itineraries from sap_itineraries collection', async () => {
    const listSpy = vi.spyOn(pb.collection('sap_itineraries'), 'getFullList').mockResolvedValueOnce([
      {
        id: 'itin-1',
        sap_code: 'AL001C',
        description: 'ALAGOAS GERAL',
        uf: 'AL',
        region: 'NORDESTE',
        avg_transit_days: 4,
        is_active: true,
      } as any,
    ])

    const itineraries = await SapRouteService.getItineraries()
    expect(listSpy).toHaveBeenCalled()
    expect(itineraries).toHaveLength(1)
    expect(itineraries[0].sap_code).toBe('AL001C')
  })

  it('2. should fetch routes from sap_routes collection', async () => {
    const listSpy = vi.spyOn(pb.collection('sap_routes'), 'getFullList').mockResolvedValueOnce([
      {
        id: 'route-1',
        sap_route_code: 'ROT-AL-01',
        description: 'Rota Maceió e Região Metropolitana',
        origin: 'Matriz Betim',
        destination: 'Maceió AL',
        uf: 'AL',
        lead_time_days: 4,
        status_sap: 'ATIVO',
        status_tms: 'ATIVO',
        is_active: true,
      } as any,
    ])

    const routes = await SapRouteService.getRoutes()
    expect(listSpy).toHaveBeenCalled()
    expect(routes).toHaveLength(1)
    expect(routes[0].sap_route_code).toBe('ROT-AL-01')
  })

  it('3. should fetch combinations from sap_itinerary_routes without cartesian explosion', async () => {
    const listSpy = vi
      .spyOn(pb.collection('sap_itinerary_routes'), 'getFullList')
      .mockResolvedValueOnce([
        {
          id: 'combo-1',
          technical_key: 'AL001C_ROT-AL-01',
          itinerary_sap_code: 'AL001C',
          itinerary_description: 'ALAGOAS GERAL',
          route_sap_code: 'ROT-AL-01',
          route_description: 'Rota Maceió e Região Metropolitana',
          uf: 'AL',
          region: 'NORDESTE',
          lead_time_days: 4,
          status_sap: 'ATIVO',
          status_tms: 'ATIVO',
          is_active: true,
        } as any,
      ])

    const combinations = await SapRouteService.getItineraryRouteCombinations()
    expect(listSpy).toHaveBeenCalled()
    expect(combinations).toHaveLength(1)
    expect(combinations[0].technical_key).toBe('AL001C_ROT-AL-01')
  })

  it('4. should update itinerary TMS metadata with audit logging without overwriting SAP master data', async () => {
    const getOneSpy = vi.spyOn(pb.collection('sap_itineraries'), 'getOne').mockResolvedValueOnce({
      id: 'itin-1',
      sap_code: 'AL001C',
      description: 'ALAGOAS GERAL',
      operational_notes: 'Nota antiga',
    } as any)

    const updateSpy = vi.spyOn(pb.collection('sap_itineraries'), 'update').mockResolvedValueOnce({
      id: 'itin-1',
    } as any)

    const auditSpy = vi.spyOn(pb.collection('audit_logs'), 'create').mockResolvedValueOnce({
      id: 'audit-1',
    } as any)

    const success = await SapRouteService.updateItineraryTmsMetadata(
      'itin-1',
      {
        operational_notes: 'Janela de descarga especial',
        calculated_lead_time_days: 3,
        logistics_priority: 'ALTA',
      },
      'analista@ciafal.com.br',
      'Analista Logístico',
    )

    expect(success).toBe(true)
    expect(getOneSpy).toHaveBeenCalledWith('itin-1')
    expect(updateSpy).toHaveBeenCalledWith('itin-1', {
      operational_notes: 'Janela de descarga especial',
      calculated_lead_time_days: 3,
      logistics_priority: 'ALTA',
    })
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE_ITINERARY_TMS_METADATA',
        resource: 'sap_itineraries',
      }),
    )
  })

  it('5. should execute findLogisticsCompatibility identifying orders on the same route', async () => {
    vi.spyOn(pb.collection('sap_itinerary_routes'), 'getFullList').mockResolvedValueOnce([
      {
        id: 'c1',
        technical_key: 'AL001C_ROT-AL-01',
        itinerary_sap_code: 'AL001C',
        route_sap_code: 'ROT-AL-01',
        uf: 'AL',
        region: 'NORDESTE',
        destination: 'Maceió',
        is_active: true,
      } as any,
    ])

    vi.spyOn(pb.collection('sap_sales_orders'), 'getFullList').mockResolvedValueOnce([
      {
        id: 'order-1',
        order_number: 'PED-1001',
        customer_code: 'CLI-01',
        customer_name: 'Cliente A',
        destination_city: 'Maceió',
        uf: 'AL',
        itinerary_code: 'AL001C',
        route_code: 'ROT-AL-01',
        weight_kg: 14000,
        status: 'disponivel',
      } as any,
      {
        id: 'order-2',
        order_number: 'PED-1002',
        customer_code: 'CLI-02',
        customer_name: 'Cliente B',
        destination_city: 'Rio Largo',
        uf: 'AL',
        itinerary_code: 'AL001C',
        route_code: 'ROT-AL-01',
        weight_kg: 12000,
        status: 'disponivel',
      } as any,
    ])

    vi.spyOn(pb.collection('sap_routes'), 'getFullList').mockResolvedValueOnce([
      {
        id: 'r1',
        sap_route_code: 'ROT-AL-01',
        description: 'Rota Alagoas 01',
        is_active: true,
      } as any,
    ])

    const result = await SapRouteService.findLogisticsCompatibility('AL001C', 'ROT-AL-01')

    expect(result.primaryRoute?.sap_route_code).toBe('ROT-AL-01')
    expect(result.compatibleOrders).toHaveLength(2)
    expect(result.compatibleOrders[0].orderNumber).toBe('PED-1001')
    expect(result.compatibleOrders[1].orderNumber).toBe('PED-1002')
    expect(result.aiRecommendation).toContain('ROT-AL-01')
  })
})
