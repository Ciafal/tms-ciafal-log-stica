import type { QueueEntryEntity } from './rules'

const placaNormalizada = (placa?: string) => (placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const placaDaEntrada = (entrada: QueueEntryEntity) => entrada.vehicle_plate_cached || entrada.expand?.vehicle?.plate

export function entradaAtivaNaFila(entrada: QueueEntryEntity, agora: number) {
  if (entrada.status === 'removido' || entrada.status === 'atribuido') return false
  if (entrada.status !== 'indisponivel' || !entrada.indisponivel_desde) return true
  return agora < Date.parse(entrada.indisponivel_desde) + 24 * 60 * 60 * 1000
}

export function placasIndisponiveisNaFila(entradas: QueueEntryEntity[]) {
  const placas = new Set(entradas.filter(entrada => entrada.status === 'indisponivel')
    .map(entrada => placaNormalizada(placaDaEntrada(entrada))).filter(Boolean))
  return (placa?: string) => placas.has(placaNormalizada(placa))
}

export function entradasParaDisponibilidade(entradas: QueueEntryEntity[]) {
  const placaIndisponivel = placasIndisponiveisNaFila(entradas)
  return entradas.filter(
    entrada => !['removido', 'atribuido', 'bloqueado', 'indisponivel'].includes(entrada.status) &&
      !placaIndisponivel(placaDaEntrada(entrada)),
  )
}

export function diaDaFila(valor?: string) {
  return valor?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || ''
}

export function tempoNaFila(entrada: string | undefined, agora: number) {
  const inicio = entrada ? Date.parse(entrada) : NaN
  if (!Number.isFinite(inicio)) return '—'

  const totalMinutos = Math.max(0, Math.floor((agora - inicio) / 60_000))
  const dias = Math.floor(totalMinutos / 1440)
  const horas = Math.floor((totalMinutos % 1440) / 60)
  const minutos = totalMinutos % 60
  return `${dias} ${dias === 1 ? 'dia' : 'dias'}, ${horas} ${horas === 1 ? 'hora' : 'horas'} e ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`
}
