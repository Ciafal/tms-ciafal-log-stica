import type { SapSalesOrderEntity } from './rules'

export interface VeiculoDePlanejamento {
  id: string
  placa: string
  tipo: string
  capacidadeKg: number
  limitesPorItem: Record<string, number>
}

const chaveDoItem = (o: SapSalesOrderEntity) =>
  [o.order_number, o.item_number].map(v => String(v ?? '').trim().replace(/^0+/, '')).join('/')

export function limiteDosItens(veiculo: VeiculoDePlanejamento, pedidos: SapSalesOrderEntity[]) {
  let limite = veiculo.capacidadeKg
  for (const pedido of pedidos) {
    limite = Math.min(limite, veiculo.limitesPorItem[chaveDoItem(pedido)] || 0)
  }
  return limite
}
