import type { SapSalesOrderEntity } from './rules'

export interface VeiculoDePlanejamento {
  id: string
  placa: string
  tipo: string
  capacidadeKg: number
  limitesPorItem: Record<string, number>
}

const calendarioTms = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
})

export const diaOperacionalTms = (agora = new Date()) => calendarioTms.format(agora)

// A data desejada do SAP é uma data civil, mesmo quando a API acrescenta hora UTC.
export function dataCivilTms(valor?: string | null) {
  const dia = valor?.slice(0, 10) || ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return ''
  const instante = new Date(dia + 'T00:00:00Z')
  return Number.isFinite(instante.getTime()) && instante.toISOString().slice(0, 10) === dia ? dia : ''
}

export function dataDesejadaApta(valor?: string | null, hoje = diaOperacionalTms()) {
  const dia = dataCivilTms(valor)
  return Boolean(dia && dia <= hoje)
}

const chaveDoItem = (o: SapSalesOrderEntity) =>
  [o.order_number, o.item_number].map(v => String(v ?? '').trim().replace(/^0+/, '')).join('/')

export function limiteDosItens(veiculo: VeiculoDePlanejamento, pedidos: SapSalesOrderEntity[], hoje = diaOperacionalTms()) {
  let limite = veiculo.capacidadeKg
  for (const pedido of pedidos) {
    if (!dataDesejadaApta(pedido.desired_date, hoje)) return 0
    limite = Math.min(limite, veiculo.limitesPorItem[chaveDoItem(pedido)] || 0)
  }
  return limite
}
