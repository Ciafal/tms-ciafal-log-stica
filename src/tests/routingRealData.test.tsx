// @vitest-environment happy-dom
import React from 'react'
import {afterEach,describe,it,expect,vi} from 'vitest'
import {render,screen,cleanup,fireEvent} from '@testing-library/react'
const api=vi.hoisted(()=>({toast:vi.fn(),calculate:vi.fn()}))
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:api.toast})}))
vi.mock('@/domain/routingAdapters',()=>({routingServiceManager:{activeId:'google_maps',getActiveAdapter:()=>({name:'Pendente'}),calculate:api.calculate}}))
import {RoutingProvidersAdminPage} from '@/pages/RoutingProvidersAdminPage'
afterEach(cleanup)
describe('POC sem rotas demonstrativas',()=>{
 it('repetir teste sem referência real não calcula nem registra rota',()=>{
  render(<RoutingProvidersAdminPage/> )
  const button=screen.getAllByRole('button',{name:'Executar Teste POC'})[0]
  fireEvent.click(button);fireEvent.click(button)
  expect(api.calculate).not.toHaveBeenCalled()
  expect(api.toast).toHaveBeenCalledTimes(2)
  expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({title:'Nenhuma referência de rota cadastrada'}))
 })
})
