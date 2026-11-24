import type { SapStockCurrentEntity } from '@/domain/rules'

export interface StockLocation {
  plant: string
  plantName?: string
  storageLocation: string
  storageLocationName?: string
}

export const stockStatuses = [
  { code: 'DISPONIVEL', label: 'Disponível', field: 'available_qty' },
  { code: 'RESERVADO', label: 'Com Reserva', field: 'reserved_qty' },
  { code: 'BLOQUEADO', label: 'Com Bloqueio', field: 'blocked_qty' },
] as const

export function normalizeStockSearch(value: string) {
  return value.trim().normalize('NFD').replace(/\p{M}/gu, '').toUpperCase()
}

export function matchesStockLocation(value: string, code: string, name?: string) {
  const query = normalizeStockSearch(value)
  return !query || normalizeStockSearch(code || '').includes(query) ||
    normalizeStockSearch(name || '').includes(query)
}

export function matchesStockStatus(stock: SapStockCurrentEntity, value: string) {
  const query = normalizeStockSearch(value)
  if (!query) return true

  return stockStatuses.some(({ code, label, field }) =>
    (stock[field] ?? 0) > 0 &&
    (code.includes(query) || normalizeStockSearch(label).includes(query)),
  )
}
