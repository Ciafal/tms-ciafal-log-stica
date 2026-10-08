import { describe, it, expect } from 'vitest'
import {
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

describe('ABNT NBR ISO 80000 Unit Formatters for TMS CIAFAL', () => {
  describe('Carga mass (t)', () => {
    it('formats 28.0 tons to "28,00 t"', () => {
      expect(formatTons(28)).toBe('28,00 t')
      expect(formatTons(28.0)).toBe('28,00 t')
    })

    it('formats decimals and thousands correctly ("1.258,40 t")', () => {
      expect(formatTons(1258.4)).toBe('1.258,40 t')
      expect(formatTons(486.75)).toBe('486,75 t')
    })

    it('handles zero, negative, null and undefined gracefully', () => {
      expect(formatTons(0)).toBe('0,00 t')
      expect(formatTons(null)).toBe('0,00 t')
      expect(formatTons(undefined)).toBe('0,00 t')
      expect(formatTons(NaN)).toBe('0,00 t')
    })

    it('converts from kg when fromKg option is true', () => {
      expect(formatTons(28000, { fromKg: true })).toBe('28,00 t')
      expect(formatTons(14500, { fromKg: true })).toBe('14,50 t')
    })
  })

  describe('formatWeight helper (backward-compatible & enhanced)', () => {
    it('formats standard weights to "28,00 t"', () => {
      expect(formatWeight(28)).toBe('28,00 t')
      expect(formatWeight(28.5)).toBe('28,50 t')
    })

    it('handles formatWeight with threshold number signature', () => {
      expect(formatWeight(25000, 1000)).toBe('25,00 t')
      expect(formatWeight(850, 1000)).toBe('850 kg')
    })

    it('handles unit options (kg, forceTons)', () => {
      expect(formatWeight(28000, { unit: 'KG', forceTons: true })).toBe('28,00 t')
      expect(formatWeight(1250, { unit: 'KG' })).toBe('1.250 kg')
    })
  })

  describe('Individual mass (kg)', () => {
    it('formats 1250 kg to "1.250 kg" and 1250.5 kg to "1.250,50 kg"', () => {
      expect(formatKg(1250)).toBe('1.250 kg')
      expect(formatKg(1250.5, 2)).toBe('1.250,50 kg')
    })

    it('handles null, undefined and zero', () => {
      expect(formatKg(0)).toBe('0 kg')
      expect(formatKg(null)).toBe('0 kg')
      expect(formatKg(undefined)).toBe('0 kg')
    })
  })

  describe('Distance (km)', () => {
    it('formats 425.5 km to "425,50 km" with 2 decimals', () => {
      expect(formatDistance(425.5)).toBe('425,50 km')
      expect(formatDistance(1250.75)).toBe('1.250,75 km')
    })

    it('supports custom decimal precision', () => {
      expect(formatDistance(450, 0)).toBe('450 km')
      expect(formatDistance(425.5, 1)).toBe('425,5 km')
    })

    it('handles edge cases', () => {
      expect(formatDistance(0)).toBe('0,00 km')
      expect(formatDistance(null)).toBe('0,00 km')
      expect(formatDistance(undefined)).toBe('0,00 km')
    })
  })

  describe('Speed (km/h)', () => {
    it('formats 80 to "80 km/h"', () => {
      expect(formatSpeed(80)).toBe('80 km/h')
      expect(formatSpeed(85.5, 1)).toBe('85,5 km/h')
    })
  })

  describe('Duration / Time (h/min)', () => {
    it('formats 150 minutes to "2 h 30 min"', () => {
      expect(formatDurationMinutes(150)).toBe('2 h 30 min')
    })

    it('formats 45 minutes to "45 min"', () => {
      expect(formatDurationMinutes(45)).toBe('45 min')
    })

    it('formats 120 minutes to "2 h"', () => {
      expect(formatDurationMinutes(120)).toBe('2 h')
    })

    it('handles zero or null minutes', () => {
      expect(formatDurationMinutes(0)).toBe('0 min')
      expect(formatDurationMinutes(null)).toBe('0 min')
    })
  })

  describe('Volume (m³)', () => {
    it('formats 12.5 to "12,50 m³"', () => {
      expect(formatVolume(12.5)).toBe('12,50 m³')
      expect(formatVolume(0)).toBe('0,00 m³')
      expect(formatVolume(null)).toBe('0,00 m³')
    })
  })

  describe('Percentage (%) with space BEFORE symbol', () => {
    it('formats 95 to "95,00 %" with space before %', () => {
      expect(formatPercent(95)).toBe('95,00 %')
      expect(formatPercent(95, 0)).toBe('95 %')
      expect(formatPercent(95.5, 1)).toBe('95,5 %')
    })

    it('formats fraction 0.95 to "95,00 %" or "95 %" with isFraction: true', () => {
      expect(formatPercent(0.95, 2, { isFraction: true })).toBe('95,00 %')
      expect(formatPercent(0.95, 0, { isFraction: true })).toBe('95 %')
    })

    it('formats 0% properly to "0,00 %" or "0 %"', () => {
      expect(formatPercent(0)).toBe('0,00 %')
      expect(formatPercent(0, 0)).toBe('0 %')
      expect(formatPercent(null)).toBe('0,00 %')
    })
  })

  describe('Money (R$)', () => {
    it('formats 2450.75 to "R$ 2.450,75"', () => {
      const formatted = formatCurrency(2450.75)
      // Normaliza non-breaking spaces que toLocaleString pode produzir
      const normalized = formatted.replace(/\u00a0/g, ' ')
      expect(normalized).toBe('R$ 2.450,75')
    })

    it('handles 0, null, undefined and negative values', () => {
      expect(formatCurrency(0).replace(/\u00a0/g, ' ')).toBe('R$ 0,00')
      expect(formatCurrency(null).replace(/\u00a0/g, ' ')).toBe('R$ 0,00')
      expect(formatCurrency(undefined).replace(/\u00a0/g, ' ')).toBe('R$ 0,00')
      expect(formatCurrency(-150.5).replace(/\u00a0/g, ' ')).toContain('-R$ 150,50')
    })

    it('formats very large values properly', () => {
      const formatted = formatCurrency(12500450.8).replace(/\u00a0/g, ' ')
      expect(formatted).toBe('R$ 12.500.450,80')
    })
  })

  describe('Fuel consumption and Costs per distance/mass', () => {
    it('formats fuel consumption to "3,20 km/L"', () => {
      expect(formatFuelConsumption(3.2)).toBe('3,20 km/L')
    })

    it('formats cost per distance to "R$ 4,25/km"', () => {
      expect(formatCostPerKm(4.25)).toBe('R$ 4,25/km')
    })

    it('formats cost per ton to "R$ 85,50/t"', () => {
      expect(formatCostPerTon(85.5)).toBe('R$ 85,50/t')
    })
  })

  describe('Date and Time formats', () => {
    it('formats dates to dd/MM/aaaa', () => {
      expect(formatDate('2026-10-08')).toBe('08/10/2026')
    })

    it('formats time to HH:mm', () => {
      expect(formatTime('14:35:00')).toBe('14:35')
      expect(formatTime('14:35')).toBe('14:35')
    })

    it('formats datetime to dd/MM/aaaa HH:mm', () => {
      const dt = new Date(2026, 9, 8, 14, 35)
      expect(formatDateTime(dt)).toBe('08/10/2026 14:35')
    })
  })

  describe('Vehicle type with capacity standard fix', () => {
    it('replaces "Carreta 5 Eixos (28.0t Padrão)" with "Carreta 5 Eixos (28,00 t)"', () => {
      expect(formatVehicleTypeWithCapacity('Carreta 5 Eixos', 28000)).toBe('Carreta 5 Eixos (28,00 t)')
      expect(formatVehicleTypeWithCapacity('Truck 3 Eixos', 14000)).toBe('Truck 3 Eixos (14,00 t)')
      expect(formatVehicleTypeWithCapacity('Toco 2 Eixos', 8000)).toBe('Toco 2 Eixos (8,00 t)')
      expect(formatVehicleTypeWithCapacity('Carreta 6 Eixos', 32000)).toBe('Carreta 6 Eixos (32,00 t)')
      expect(formatVehicleTypeWithCapacity('Bitrem 7 Eixos', 37000)).toBe('Bitrem 7 Eixos (37,00 t)')
    })
  })
})
