// TMS CIAFAL — Motor de Fracionamento de Carga e Remessas Previstas
// Em conformidade estrita com a regra de negócio da CIAFAL Logística:
// - Chave de unicidade do cliente: customer_code || customer_name
// - Remessas previstas: quantidade de clientes distintos (cada cliente gera 1 remessa SAP)
// - Fracionamentos: quantidade de clientes distintos atendidos pelo veículo
// - Status de remessa SAP: "A gerar" quando não existe sap_delivery_number

import type { SapSalesOrderEntity } from './rules'

export interface CargoCustomerFractionation {
  customerCode: string
  customerName: string
  city: string
  uf: string
  ordersCount: number
  totalWeightKg: number
  itemsCount: number
  sapDeliveryNumber: string // "A gerar" ou número SAP real
  orderNumbers: string[]
}

export interface CargoFractionationResult {
  distinctCustomersCount: number
  fracionamentos: number
  remessasPrevistas: number
  totalWeightKg: number
  totalOrdersCount: number
  totalItemsCount: number
  customers: CargoCustomerFractionation[]
}

/**
 * Calcula o fracionamento da carga e o detalhamento dos clientes atendidos.
 * Chave de distinct do cliente = customer_code || customer_name.
 * Remessas previstas = clientes distintos.
 */
export function calculateCargoFractionation(
  orders: SapSalesOrderEntity[] = [],
): CargoFractionationResult {
  if (!orders || orders.length === 0) {
    return {
      distinctCustomersCount: 0,
      fracionamentos: 0,
      remessasPrevistas: 0,
      totalWeightKg: 0,
      totalOrdersCount: 0,
      totalItemsCount: 0,
      customers: [],
    }
  }

  // Agrupar por customer_code || customer_name
  const customerMap = new Map<
    string,
    {
      customerCode: string
      customerName: string
      city: string
      uf: string
      ordersCount: number
      totalWeightKg: number
      itemsCount: number
      sapDeliveryNumber: string
      orderNumbers: Set<string>
    }
  >()

  let totalWeightKg = 0
  let totalItemsCount = 0

  orders.forEach((order) => {
    const rawKey = (order.customer_code || order.customer_name || 'CLIENTE_NAO_IDENTIFICADO').trim()
    const customerCode = (order.customer_code || rawKey).trim()
    const customerName = (order.customer_name || rawKey).trim()
    const city = (order.destination_city || (order as any).city || '-').trim()
    const uf = (order.uf || '-').trim().toUpperCase()
    const weight = Number(order.weight_kg) || 0
    const items = Number((order as any).items_count) || 1
    const sapDelivery = (
      (order as any).sap_delivery_number ||
      order.delivery_number ||
      (order as any).remessa ||
      ''
    ).trim()

    totalWeightKg += weight
    totalItemsCount += items

    const existing = customerMap.get(rawKey)
    if (!existing) {
      const orderSet = new Set<string>()
      if (order.order_number) orderSet.add(order.order_number)
      customerMap.set(rawKey, {
        customerCode,
        customerName,
        city,
        uf,
        ordersCount: 1,
        totalWeightKg: weight,
        itemsCount: items,
        sapDeliveryNumber: sapDelivery || 'A gerar',
        orderNumbers: orderSet,
      })
    } else {
      existing.ordersCount += 1
      existing.totalWeightKg += weight
      existing.itemsCount += items
      if (order.order_number) existing.orderNumbers.add(order.order_number)
      if (existing.city === '-' && city !== '-') existing.city = city
      if (existing.uf === '-' && uf !== '-') existing.uf = uf
      if (existing.sapDeliveryNumber === 'A gerar' && sapDelivery) {
        existing.sapDeliveryNumber = sapDelivery
      }
    }
  })

  const customers: CargoCustomerFractionation[] = Array.from(customerMap.values()).map((c) => ({
    customerCode: c.customerCode,
    customerName: c.customerName,
    city: c.city,
    uf: c.uf,
    ordersCount: c.ordersCount,
    totalWeightKg: Math.round(c.totalWeightKg * 100) / 100,
    itemsCount: c.itemsCount,
    sapDeliveryNumber: c.sapDeliveryNumber || 'A gerar',
    orderNumbers: Array.from(c.orderNumbers),
  }))

  // Ordenar clientes por maior peso decrescente
  customers.sort((a, b) => b.totalWeightKg - a.totalWeightKg)

  const distinctCustomersCount = customers.length
  const fracionamentos = distinctCustomersCount
  const remessasPrevistas = distinctCustomersCount

  return {
    distinctCustomersCount,
    fracionamentos,
    remessasPrevistas,
    totalWeightKg: Math.round(totalWeightKg * 100) / 100,
    totalOrdersCount: orders.length,
    totalItemsCount,
    customers,
  }
}
