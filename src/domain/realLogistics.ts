import type { AnttCalculationResult } from './rules'

export interface RealLogistics {
  sourceReference: string
  vehiclePlate: string
  distanceKm: number
  durationMinutes: number
  tollsValue: number
  antt: AnttCalculationResult
}
export const LOGISTICS_PENDING = 'Aguardando integração de distância, pedágios e piso ANTT.'
export function hasRealLogistics(q?: RealLogistics): q is RealLogistics {
  return !!q && !!q.sourceReference?.trim() && /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(q.vehiclePlate || '')
    && Number.isFinite(q.distanceKm) && q.distanceKm > 0
    && Number.isFinite(q.durationMinutes) && q.durationMinutes > 0
    && Number.isFinite(q.tollsValue) && q.tollsValue >= 0
    && q.antt?.isOfficialSourceConnected === true && !!q.antt.tableVersion
    && Number.isFinite(q.antt.floorValue) && q.antt.floorValue > 0
    && q.antt.distanceKm === q.distanceKm
}
export function requireRealLogistics(q?: RealLogistics): RealLogistics {
  if (!hasRealLogistics(q)) throw new Error(LOGISTICS_PENDING)
  return q
}
