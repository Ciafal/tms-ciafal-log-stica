// @vitest-environment happy-dom
import React from 'react'
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest'
import {render,screen,waitFor,cleanup} from '@testing-library/react'
const api=vi.hoisted(()=>({orders:vi.fn(),itineraries:vi.fn(async()=>[]),save:vi.fn()}))
vi.mock('@/services/tmsService',()=>({TmsService:{getSapSalesOrders:api.orders,getSapItineraries:api.itineraries},tmsService:{seedSapData:api.save}}))
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{email:'operador@example.test',name:'Operação'},permissions:{}})}))
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}))
import {SalesWalletPage} from '@/pages/SalesWalletPage'
const order={id:'SAP:123/10',order_number:'123',item_number:'10',customer_code:'C1',customer_name:'Cliente SAP',destination_city:'Cidade SAP',uf:'MG',itinerary_code:'MG01',material:'MAT123',material_description:'Descrição real do material',weight_kg:1234,total_value:5678,production_status:'Pronto',credit_status:'Liberado',freight_value:0,credit_limit:0,stock_sider:0,stock_total:0,balance_quantity_kg:0}
beforeEach(()=>{vi.clearAllMocks()})
afterEach(cleanup)
describe('Carteira SAP sem carga demonstrativa',()=>{
 it('mantém a consulta vazia e não grava exemplos mesmo ao consultar novamente',async()=>{
  api.orders.mockResolvedValue([])
  render(<SalesWalletPage/>)
  await waitFor(()=>expect(screen.getByText('Nenhum pedido SAP encontrado com os filtros selecionados.')).toBeTruthy())
  cleanup()
  render(<SalesWalletPage/>)
  await waitFor(()=>expect(api.orders).toHaveBeenCalledTimes(2))
  expect(api.save).not.toHaveBeenCalled()
  expect(screen.queryByText('Metalúrgica Horizonte')).toBeNull()
 })
 it('mostra código e descrição reais, preserva zeros e não inventa datas',async()=>{
  api.orders.mockResolvedValue([order])
  render(<SalesWalletPage/>)
  await waitFor(()=>expect(screen.getByText('MAT123 · Descrição real do material')).toBeTruthy())
  const row=screen.getByText('MAT123 · Descrição real do material').closest('tr')!
  expect(row.textContent).not.toContain('2026-08-20')
  expect(row.textContent).not.toContain('34.2026')
  expect(row.textContent).toContain('—')
  expect(api.save).not.toHaveBeenCalled()
 })
})
