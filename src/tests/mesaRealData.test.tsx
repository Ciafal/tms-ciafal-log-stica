// @vitest-environment happy-dom
import React from 'react'
import {afterEach,describe,it,expect,vi} from 'vitest'
import {render,screen,waitFor,cleanup,fireEvent} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
const api=vi.hoisted(()=>({read:vi.fn(async()=>[]),toast:vi.fn()}))
vi.mock('@/services/carrierHistoryService',()=>({carrierHistoryService:{getOperationalHistory:async()=>[],getComplaints:async()=>[],getCompliments:async()=>[]}}))
vi.mock('@/services/tmsService',()=>({tmsService:new Proxy({}, {get:()=>api.read})}))
vi.mock('@/components/mesa-fretes/ChicaoFreightMesaView',()=>({ChicaoFreightMesaView:()=>null}))
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{name:'Operação'},permissions:{}})}))
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:api.toast})}))
import {MesaFretesPage} from '@/pages/MesaFretesPage'
afterEach(cleanup)
describe('Mesa sem indicadores demonstrativos',()=>{
 it('consulta vazia permanece sem contratações ou medições, inclusive após duas atualizações',async()=>{
  render(<MemoryRouter><MesaFretesPage/></MemoryRouter>)
  await waitFor(()=>expect(api.read).toHaveBeenCalledTimes(6))
  const card=screen.getByText('Contratadas Hoje').parentElement!
  expect(card.textContent).toContain('0')
  expect(screen.queryByText('82,4 %')).toBeNull();expect(screen.queryByText('14 min 48 s')).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Atualizar Mesa'}))
  await waitFor(()=>expect(api.read).toHaveBeenCalledTimes(12))
  fireEvent.click(screen.getByRole('button',{name:'Atualizar Mesa'}))
  await waitFor(()=>expect(api.read).toHaveBeenCalledTimes(18))
  expect(card.textContent).toContain('0')
 })
})
