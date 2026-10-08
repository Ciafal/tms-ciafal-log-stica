/**
 * Módulo Centralizado de Formatação ABNT / NBR ISO 80000 e Convenções Brasileiras
 * TMS CIAFAL Logística
 *
 * Padrões Canônicos:
 * - Carga mass: t -> 28,00 t
 * - Individual mass: kg -> 1.250 kg (ou 1.250,50 kg se fracionado)
 * - Distance: km -> 425,50 km
 * - Speed: km/h -> 80 km/h (ou 80,00 km/h)
 * - Time/Duration: h/min -> 2 h 30 min (ou 45 min)
 * - Volume: m³ -> 12,50 m³
 * - Percentage: % -> 95,00 % (espaço antes do % e vírgula decimal)
 * - Money: R$ -> R$ 2.450,75
 * - Fuel consumption: km/L -> 3,20 km/L
 * - Cost/distance: R$/km -> R$ 4,25/km
 * - Cost/mass: R$/t -> R$ 85,50/t
 * - Date: dd/MM/aaaa -> 08/10/2026
 * - Time: HH:mm -> 14:35
 * - DateTime: dd/MM/aaaa HH:mm -> 08/10/2026 14:35
 *
 * Regras estritas:
 * - Vírgula como separador decimal, ponto como separador de milhar.
 * - Espaço entre o valor numérico e o símbolo de unidade (inclusive antes de %).
 * - Não converte chaves, códigos ou identificadores técnicos SAP.
 * - Trata de forma graciosa null, undefined, NaN e valores zerados.
 */

export interface FormatNumberOptions {
  decimals?: number
  minDecimals?: number
  maxDecimals?: number
  unit?: string
  fallback?: string
}

/**
 * Formata um número genérico de acordo com a norma pt-BR (milhar ponto, decimal vírgula)
 */
export function formatAbntNumber(
  value: number | null | undefined,
  decimals = 2,
  fallback = '0,00',
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback
  }
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Massa de carga em Toneladas (t)
 * Ex: 28 -> "28,00 t", 1258.4 -> "1.258,40 t"
 * @param value Valor em toneladas (ou em kg se unit="kg")
 * @param options Opções de decimais e unidade de origem
 */
export function formatTons(
  value: number | null | undefined,
  options?: { decimals?: number; fromKg?: boolean; fallback?: string },
): string {
  const fallback = options?.fallback ?? '0,00 t'
  if (value === null || value === undefined || isNaN(value)) {
    return fallback
  }
  const decimals = options?.decimals ?? 2
  const numInTons = options?.fromKg ? value / 1000 : value
  return `${numInTons.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} t`
}

/**
 * Formata peso para TMS CIAFAL de forma inteligente:
 * Suporta toneladas (padrão) e quilogramas, respeitando ABNT ("28,00 t", "1.250 kg").
 */
export function formatWeight(
  value?: number | null,
  options?:
    | {
        unit?: 't' | 'kg' | 'auto' | string
        forceTons?: boolean
        decimals?: number
        fallback?: string
      }
    | number,
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0,00 t'
  }

  // Compatibilidade com assinatura histórica formatWeight(weightKg, useTonsThreshold)
  if (typeof options === 'number') {
    const threshold = options
    if (value >= threshold) {
      const tons = value / 1000
      return `${tons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t`
    }
    return `${Math.round(value).toLocaleString('pt-BR')} kg`
  }

  const opts = options || {}
  const unit = (opts.unit || 't').toUpperCase()
  const decimals = opts.decimals !== undefined ? opts.decimals : 2

  if (unit === 'KG') {
    // Se o valor de entrada é kg e forceTons for true
    if (opts.forceTons) {
      const tons = value / 1000
      return `${tons.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} t`
    }
    // Formata em kg
    return `${value.toLocaleString('pt-BR', { minimumFractionDigits: decimals === 0 ? 0 : decimals, maximumFractionDigits: decimals })} kg`
  }

  // Padrão: Toneladas
  let tonsValue = value
  if (opts.unit === 'fromKg' || opts.unit === 'kg_to_t') {
    tonsValue = value / 1000
  }

  return `${tonsValue.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} t`
}

/**
 * Massa individual em Quilogramas (kg)
 * Ex: 1250 -> "1.250 kg", 1250.5 -> "1.250,50 kg"
 */
export function formatKg(
  value: number | null | undefined,
  decimals = 0,
  fallback = '0 kg',
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback
  }
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} kg`
}

/**
 * Distância em Quilômetros (km)
 * Ex: 425.5 -> "425,50 km", 450 -> "450,00 km" (ou 450 km se decimals = 0)
 */
export function formatDistance(
  km: number | null | undefined,
  decimals = 2,
  fallback = '0,00 km',
): string {
  if (km === null || km === undefined || isNaN(km)) {
    return fallback
  }
  return `${km.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} km`
}

/**
 * Velocidade em km/h
 * Ex: 80 -> "80 km/h" ou "80,00 km/h"
 */
export function formatSpeed(
  speed: number | null | undefined,
  decimals = 0,
  fallback = '0 km/h',
): string {
  if (speed === null || speed === undefined || isNaN(speed)) {
    return fallback
  }
  return `${speed.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} km/h`
}

/**
 * Tempo / Duração em h e min
 * Ex: 150 minutos -> "2 h 30 min", 45 minutos -> "45 min", 120 minutos -> "2 h 00 min"
 */
export function formatDurationMinutes(
  minutes: number | null | undefined,
  fallback = '0 min',
): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) {
    return fallback
  }
  const totalMin = Math.round(minutes)
  const hrs = Math.floor(totalMin / 60)
  const mins = totalMin % 60

  if (hrs === 0) {
    return `${mins} min`
  }
  if (mins === 0) {
    return `${hrs} h`
  }
  return `${hrs} h ${String(mins).padStart(2, '0')} min`
}

/**
 * Volume em Metros Cúbicos (m³)
 * Ex: 12.5 -> "12,50 m³"
 */
export function formatVolume(
  m3: number | null | undefined,
  decimals = 2,
  fallback = '0,00 m³',
): string {
  if (m3 === null || m3 === undefined || isNaN(m3)) {
    return fallback
  }
  return `${m3.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} m³`
}

/**
 * Percentual padronizado ABNT / pt-BR (com espaço ANTES de %)
 * Ex: 95 -> "95,00 %" ou "95 %"
 * Se isFraction = true (ex: 0.95), multiplica por 100 -> "95,00 %"
 */
export function formatPercent(
  pct: number | null | undefined,
  decimals = 2,
  options?: { isFraction?: boolean; fallback?: string },
): string {
  const fallback = options?.fallback ?? '0,00 %'
  if (pct === null || pct === undefined || isNaN(pct)) {
    return fallback
  }
  const numericVal = options?.isFraction ? pct * 100 : pct
  return `${numericVal.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} %`
}

/**
 * Moeda Real Brasileiro (BRL / R$)
 * Ex: 2450.75 -> "R$ 2.450,75"
 */
export function formatCurrency(value?: number | null, fallback = 'R$ 0,00'): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Consumo de combustível em km/L
 * Ex: 3.2 -> "3,20 km/L"
 */
export function formatFuelConsumption(
  kmPerLiter: number | null | undefined,
  decimals = 2,
  fallback = '0,00 km/L',
): string {
  if (kmPerLiter === null || kmPerLiter === undefined || isNaN(kmPerLiter)) {
    return fallback
  }
  return `${kmPerLiter.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} km/L`
}

/**
 * Custo por distância (R$/km)
 * Ex: 4.25 -> "R$ 4,25/km"
 */
export function formatCostPerKm(
  cost: number | null | undefined,
  decimals = 2,
  fallback = 'R$ 0,00/km',
): string {
  if (cost === null || cost === undefined || isNaN(cost)) {
    return fallback
  }
  return `R$ ${cost.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}/km`
}

/**
 * Custo por massa (R$/t)
 * Ex: 85.5 -> "R$ 85,50/t"
 */
export function formatCostPerTon(
  cost: number | null | undefined,
  decimals = 2,
  fallback = 'R$ 0,00/t',
): string {
  if (cost === null || cost === undefined || isNaN(cost)) {
    return fallback
  }
  return `R$ ${cost.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}/t`
}

/**
 * Formata data pt-BR: dd/MM/aaaa
 * Ex: "2026-10-08" -> "08/10/2026"
 */
export function formatDate(dateInput?: string | Date | null, fallback = '—'): string {
  if (!dateInput) return fallback
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) return fallback
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: typeof dateInput === 'string' && dateInput.length === 10 ? 'UTC' : undefined,
  })
}

/**
 * Formata hora pt-BR: HH:mm
 * Ex: "14:35" ou Date -> "14:35"
 */
export function formatTime(dateInput?: string | Date | null, fallback = '—'): string {
  if (!dateInput) return fallback
  if (typeof dateInput === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(dateInput)) {
    return dateInput.substring(0, 5)
  }
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) return fallback
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Formata data e hora pt-BR: dd/MM/aaaa HH:mm
 * Ex: "2026-10-08T14:35:00Z" -> "08/10/2026 14:35"
 */
export function formatDateTime(dateInput?: string | Date | null, fallback = '—'): string {
  if (!dateInput) return fallback
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) return fallback
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

/**
 * Formata label de veículo com capacidade padronizada ABNT
 * Ex: "Carreta 5 Eixos", 28000 -> "Carreta 5 Eixos (28,00 t)"
 */
export function formatVehicleTypeWithCapacity(
  vehicleType: string,
  capacityKg?: number | null,
): string {
  if (!capacityKg || capacityKg <= 0) {
    return vehicleType
  }
  const tons = capacityKg / 1000
  return `${vehicleType} (${formatTons(tons, { decimals: 2 })})`
}
