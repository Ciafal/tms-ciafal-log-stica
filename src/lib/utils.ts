/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Padronização de Formatação pt-BR e ABNT/SI para TMS CIAFAL
 * Re-exporta e unifica todas as funções a partir de src/utils/format
 */
export {
  formatAbntNumber,
  formatTons,
  formatWeight,
  formatKg,
  formatDistance,
  formatSpeed,
  formatDurationMinutes,
  formatVolume,
  formatPercent,
  formatCurrency,
  formatFuelConsumption,
  formatCostPerKm,
  formatCostPerTon,
  formatDate,
  formatTime,
  formatDateTime,
  formatVehicleTypeWithCapacity,
} from '@/utils/format'
export type { FormatNumberOptions } from '@/utils/format'
