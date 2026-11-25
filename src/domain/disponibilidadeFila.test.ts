import { expect, it } from 'vitest'
import type { QueueEntryEntity } from './rules'
import { diaDaFila, entradaAtivaNaFila, entradasParaDisponibilidade, placasIndisponiveisNaFila } from './disponibilidadeFila'

const entrada = (resto: Partial<QueueEntryEntity>): QueueEntryEntity => ({
  id: '1', driver: 'motorista', type: 'PORTA', status: 'disponivel', entry_time: '2026-11-25T08:00:00Z',
  ...resto,
})

it('mantém a entrada indisponível por 24 horas a partir da mudança de status', () => {
  const desde = '2026-11-25T12:00:00Z'
  const fila = entrada({ status: 'indisponivel', indisponivel_desde: desde, updated: '2026-11-25T18:00:00Z' })
  const prazo = Date.parse(desde) + 86_400_000
  expect(entradaAtivaNaFila(fila, prazo - 1)).toBe(true)
  expect(entradaAtivaNaFila(fila, prazo)).toBe(false)
  expect(entradaAtivaNaFila({ ...fila, status: 'disponivel' }, prazo)).toBe(true)
})

it('exclui também os veículos de mesma placa nas outras fontes de disponibilidade', () => {
  const entradas = [
    entrada({ id: '1', status: 'indisponivel', vehicle_plate_cached: 'ABC-1D23' }),
    entrada({ id: '2', status: 'disponivel', vehicle_plate_cached: 'abc1d23' }),
    entrada({ id: '3', status: 'disponivel', vehicle_plate_cached: 'DEF4G56' }),
    entrada({ id: '4', status: 'bloqueado', vehicle_plate_cached: 'GHI7J89' }),
  ]
  expect(entradasParaDisponibilidade(entradas).map(item => item.id)).toEqual(['3'])
  expect(placasIndisponiveisNaFila(entradas)('ABC1D23')).toBe(true)
  expect(placasIndisponiveisNaFila(entradas)('DEF4G56')).toBe(false)
  expect(diaDaFila('2026-11-25T00:00:00Z')).toBe('2026-11-25')
})
