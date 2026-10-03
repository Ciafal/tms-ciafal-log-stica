import { describe, it, expect } from 'vitest'
import {
  formatBrazilianTons,
  formatBrazilianLoads,
  formatBrazilianCurrency,
  ControlTowerService,
} from '@/services/controlTowerService'

describe('Control Tower Service & Brazilian Formatter Tests', () => {
  it('formats tons correctly in Brazilian Portuguese standard ("1.258,40 t")', () => {
    expect(formatBrazilianTons(1258.4)).toBe('1.258,40 t')
    expect(formatBrazilianTons(486.75)).toBe('486,75 t')
    expect(formatBrazilianTons(0)).toBe('0,00 t')
    expect(formatBrazilianTons(-5)).toBe('0,00 t')
  })

  it('formats load counts according to Brazilian rules ("18 cargas", "1 carga", "0 cargas")', () => {
    expect(formatBrazilianLoads(18)).toBe('18 cargas')
    expect(formatBrazilianLoads(1)).toBe('1 carga')
    expect(formatBrazilianLoads(0)).toBe('0 cargas')
  })

  it('formats currency in BRL', () => {
    const val = formatBrazilianCurrency(2500)
    expect(val).toContain('2.500,00')
  })

  it('calculates local tower summary for different time periods with zero mocks', async () => {
    const todaySummary = await ControlTowerService.calculateLocalTowerSummary('today')
    expect(todaySummary).toBeDefined()
    expect(todaySummary.period).toBe('today')
    expect(todaySummary.fluxo_cargas).toHaveProperty('em_negociacao')
    expect(todaySummary.fluxo_cargas).toHaveProperty('com_contraproposta')
    expect(todaySummary.fluxo_cargas).toHaveProperty('recusadas')
    expect(todaySummary.fluxo_cargas).toHaveProperty('em_expedicao')
    expect(todaySummary.fluxo_cargas).toHaveProperty('faturadas')

    const yesterdaySummary = await ControlTowerService.calculateLocalTowerSummary('yesterday')
    expect(yesterdaySummary.period).toBe('yesterday')

    const weekSummary = await ControlTowerService.calculateLocalTowerSummary('week')
    expect(weekSummary.period).toBe('week')
    expect(weekSummary.period_label).toContain('a')

    const monthSummary = await ControlTowerService.calculateLocalTowerSummary('month')
    expect(monthSummary.period).toBe('month')

    const yearSummary = await ControlTowerService.calculateLocalTowerSummary('year')
    expect(yearSummary.period).toBe('year')
  })
})
