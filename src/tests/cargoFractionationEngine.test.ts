// TMS CIAFAL — Testes Unitários de Fracionamento de Carga e Remessas Previstas
// Cenários exigidos na especificação:
// Cenário A: Carga com clientes A + B => 2 clientes, 2 fracionamentos, 2 remessas previstas
// Cenário B: + Pedido do cliente A => 2 clientes, 2 fracionamentos, 2 remessas previstas (não duplica cliente)
// Cenário C: + Adição de rota com cliente C => 3 clientes, 3 fracionamentos, 3 remessas previstas
// Cenário D: Remoção do cliente B => 2 clientes, 2 fracionamentos, 2 remessas previstas
// Chave de distinct = customer_code || customer_name

import { describe, it, expect } from 'vitest'
import { calculateCargoFractionation } from '../domain/cargoFractionationEngine'
import { calculateRouteAdditionMetrics } from '../domain/routeAdditionEngine'
import type { SapSalesOrderEntity } from '../domain/rules'

const orderClienteA1: SapSalesOrderEntity = {
  id: 'ord-a1',
  order_number: 'PED-1001',
  item_number: '000010',
  customer_code: 'CLI-001',
  customer_name: 'Metalúrgica Alvorada Ltda',
  destination_city: 'Contagem',
  uf: 'MG',
  weight_kg: 5000,
  total_value: 35000,
  material: 'Viga I 6"',
  production_status: 'Pronto',
  credit_status: 'Liberado',
  discharge_type: 'Ponte Rolante',
  itinerary_code: 'IT-MG-01',
  delivery_number: '80012345',
}

const orderClienteB1: SapSalesOrderEntity = {
  id: 'ord-b1',
  order_number: 'PED-2001',
  item_number: '000010',
  customer_code: 'CLI-002',
  customer_name: 'Estruturas Metálicas Betim SA',
  destination_city: 'Betim',
  uf: 'MG',
  weight_kg: 8000,
  total_value: 56000,
  material: 'Tubo Industrial',
  production_status: 'Pronto',
  credit_status: 'Liberado',
  discharge_type: 'Empilhadeira',
  itinerary_code: 'IT-MG-01',
  delivery_number: '', // Sem remessa => deve vir "A gerar"
}

const orderClienteA2: SapSalesOrderEntity = {
  id: 'ord-a2',
  order_number: 'PED-1002',
  item_number: '000020',
  customer_code: 'CLI-001',
  customer_name: 'Metalúrgica Alvorada Ltda',
  destination_city: 'Contagem',
  uf: 'MG',
  weight_kg: 3500,
  total_value: 24000,
  material: 'Barra Chata',
  production_status: 'Pronto',
  credit_status: 'Liberado',
  discharge_type: 'Ponte Rolante',
  itinerary_code: 'IT-MG-01',
  delivery_number: '80012345',
}

const orderClienteC1: SapSalesOrderEntity = {
  id: 'ord-c1',
  order_number: 'PED-3001',
  item_number: '000010',
  customer_code: 'CLI-003',
  customer_name: 'Caldeiraria Central Eireli',
  destination_city: 'Sete Lagoas',
  uf: 'MG',
  weight_kg: 4000,
  total_value: 30000,
  material: 'Chapa Grossa',
  production_status: 'Pronto',
  credit_status: 'Liberado',
  discharge_type: 'Munck',
  itinerary_code: 'IT-MG-02',
  delivery_number: '80099999',
}

describe('Motor de Fracionamento de Carga e Remessas Previstas (cargoFractionationEngine)', () => {
  it('Cenário A: Carga com clientes distintos A + B retorna 2 clientes, 2 fracionamentos e 2 remessas previstas', () => {
    const orders = [orderClienteA1, orderClienteB1]
    const result = calculateCargoFractionation(orders)

    expect(result.distinctCustomersCount).toBe(2)
    expect(result.fracionamentos).toBe(2)
    expect(result.remessasPrevistas).toBe(2)
    expect(result.totalOrdersCount).toBe(2)
    expect(result.totalWeightKg).toBe(13000)
    expect(result.customers).toHaveLength(2)

    // Cliente A
    const custA = result.customers.find((c) => c.customerCode === 'CLI-001')
    expect(custA).toBeDefined()
    expect(custA?.ordersCount).toBe(1)
    expect(custA?.totalWeightKg).toBe(5000)
    expect(custA?.sapDeliveryNumber).toBe('80012345')

    // Cliente B sem remessa SAP => "A gerar"
    const custB = result.customers.find((c) => c.customerCode === 'CLI-002')
    expect(custB).toBeDefined()
    expect(custB?.ordersCount).toBe(1)
    expect(custB?.totalWeightKg).toBe(8000)
    expect(custB?.sapDeliveryNumber).toBe('A gerar')
  })

  it('Cenário B: Adição de segundo pedido do cliente A mantém 2 clientes, 2 fracionamentos e 2 remessas previstas', () => {
    const orders = [orderClienteA1, orderClienteB1, orderClienteA2]
    const result = calculateCargoFractionation(orders)

    expect(result.distinctCustomersCount).toBe(2)
    expect(result.fracionamentos).toBe(2)
    expect(result.remessasPrevistas).toBe(2)
    expect(result.totalOrdersCount).toBe(3)
    expect(result.totalWeightKg).toBe(16500)

    const custA = result.customers.find((c) => c.customerCode === 'CLI-001')
    expect(custA?.ordersCount).toBe(2)
    expect(custA?.totalWeightKg).toBe(8500)
    expect(custA?.orderNumbers).toContain('PED-1001')
    expect(custA?.orderNumbers).toContain('PED-1002')
  })

  it('Cenário C: Adição de rota com cliente C eleva para 3 clientes, 3 fracionamentos e 3 remessas previstas', () => {
    const orders = [orderClienteA1, orderClienteB1, orderClienteA2, orderClienteC1]
    const result = calculateCargoFractionation(orders)

    expect(result.distinctCustomersCount).toBe(3)
    expect(result.fracionamentos).toBe(3)
    expect(result.remessasPrevistas).toBe(3)
    expect(result.totalOrdersCount).toBe(4)
    expect(result.totalWeightKg).toBe(20500)

    const custC = result.customers.find((c) => c.customerCode === 'CLI-003')
    expect(custC).toBeDefined()
    expect(custC?.customerName).toBe('Caldeiraria Central Eireli')
    expect(custC?.sapDeliveryNumber).toBe('80099999')
  })

  it('Cenário D: Remoção do cliente B retorna a carga para 2 clientes, 2 fracionamentos e 2 remessas previstas (A + C)', () => {
    const orders = [orderClienteA1, orderClienteA2, orderClienteC1]
    const result = calculateCargoFractionation(orders)

    expect(result.distinctCustomersCount).toBe(2)
    expect(result.fracionamentos).toBe(2)
    expect(result.remessasPrevistas).toBe(2)
    expect(result.totalOrdersCount).toBe(3)
    expect(result.totalWeightKg).toBe(12500)

    const codes = result.customers.map((c) => c.customerCode)
    expect(codes).toContain('CLI-001')
    expect(codes).toContain('CLI-003')
    expect(codes).not.toContain('CLI-002')
  })

  it('Calcula adequadamente quando a lista de pedidos estiver vazia', () => {
    const result = calculateCargoFractionation([])
    expect(result.distinctCustomersCount).toBe(0)
    expect(result.fracionamentos).toBe(0)
    expect(result.remessasPrevistas).toBe(0)
    expect(result.totalWeightKg).toBe(0)
    expect(result.customers).toEqual([])
  })

  it('Integração com calculateRouteAdditionMetrics: calcula fractionationsBefore/After/Delta e remessasBefore/After', () => {
    const currentOrders = [orderClienteA1, orderClienteB1]
    const addedOrders = [orderClienteC1]

    const comparison = calculateRouteAdditionMetrics({
      currentOrders,
      addedOrders,
      vehicleCapacityKg: 28000,
    })

    expect(comparison.fractionationsBefore).toBe(2)
    expect(comparison.fractionationsAfter).toBe(3)
    expect(comparison.fractionationsDelta).toBe(1)
    expect(comparison.remessasBefore).toBe(2)
    expect(comparison.remessasAfter).toBe(3)
    expect(comparison.clientsBefore).toBe(2)
    expect(comparison.clientsAfter).toBe(3)
  })
})
