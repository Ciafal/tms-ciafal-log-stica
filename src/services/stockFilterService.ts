import type { StockLocation } from '@/domain/stockFilters'
import pb from '@/lib/pocketbase/client'

export async function getStockLocations(): Promise<StockLocation[]> {
  // No Hub, o endereço relativo usa a sessão corporativa e a carga SAP compartilhada.
  if (pb.baseURL !== '/') return []
  const { locations } = await pb.send<{ locations: StockLocation[] }>(
    '/backend/v1/tms/estoque-producao/filtros',
    { method: 'GET', requestKey: null },
  )
  return locations
}
