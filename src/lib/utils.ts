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
 */

/**
 * Formata moeda em Real (BRL) - Ex: R$ 12.450,80
 */
export function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00'
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Formata massa conforme ABNT/SI (kg ou t com espaço)
 * Ex: 28 500 kg ou 28,50 t (nunca KG, Kg, TON)
 */
export function formatWeight(weightKg?: number | null, useTonsThreshold = 1000): string {
  if (weightKg === null || weightKg === undefined || isNaN(weightKg)) return '0 kg'
  if (weightKg >= useTonsThreshold) {
    const tons = weightKg / 1000
    return `${tons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t`
  }
  return `${Math.round(weightKg).toLocaleString('pt-BR')} kg`
}

/**
 * Formata distância conforme ABNT/SI - Ex: "1.248,7 km"
 */
export function formatDistance(km?: number | null): string {
  if (km === null || km === undefined || isNaN(km)) return '0 km'
  return `${km.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
}

/**
 * Formata percentual conforme norma pt-BR (com espaço antes de %) - Ex: "95,5 %"
 */
export function formatPercent(pct?: number | null, decimals = 1): string {
  if (pct === null || pct === undefined || isNaN(pct)) return '0 %'
  return `${pct.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} %`
}

/**
 * Formata data pt-BR: DD/MM/AAAA
 */
export function formatDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '—'
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Formata data e hora pt-BR: DD/MM/AAAA HH:mm
 */
export function formatDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '—'
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

/**
 * Formata duração em minutos para formato operacional: "02 h 35 min"
 */
export function formatDurationMinutes(minutes?: number | null): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '0 min'
  const hrs = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hrs === 0) return `${mins} min`
  return `${String(hrs).padStart(2, '0')} h ${String(mins).padStart(2, '0')} min`
}
