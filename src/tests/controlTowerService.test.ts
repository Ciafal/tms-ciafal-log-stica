import { describe, it, expect, vi } from 'vitest'
import {
  formatBrazilianTons,
  formatBrazilianLoads,
  formatBrazilianCurrency,
  ControlTowerService,
} from '@/services/controlTowerService'

const { enviar } = vi.hoisted(() => ({ enviar: vi.fn() }))
vi.mock('@/lib/pocketbase/client', () => ({
  default: { send: enviar, collection: () => ({ getList: async () => ({ items: [] }) }) },
}))

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

  it('usa o resumo SAP QAS e nunca exibe zero local quando a consulta falha', async () => {
    const local = await ControlTowerService.calculateLocalTowerSummary('year')
    const sap = { loads: 18, tons: 420, items: [], loads_formatted: '18 cargas', tons_formatted: '420,00 t' }
    enviar.mockImplementation(async (path: string) => path.endsWith('/faturadas') ? sap : local)
    const ok = await ControlTowerService.getTowerSummary('year')
    expect(enviar).toHaveBeenCalledWith('/backend/v1/tms/control-tower/faturadas',
      expect.objectContaining({ method: 'GET', query: { period: 'year', page: 1, busca: '' } }))
    expect(ok.fluxo_cargas.faturadas).toBe(sap)
    enviar.mockImplementation(async (path: string) => {
      if (path.endsWith('/faturadas')) throw new Error('SAP indisponível')
      return local
    })
    expect((await ControlTowerService.getTowerSummary('year')).fluxo_cargas.faturadas)
      .toMatchObject({ indisponivel: true, loads_formatted: '—' })
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
