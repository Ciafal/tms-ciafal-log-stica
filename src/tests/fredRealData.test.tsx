// @vitest-environment happy-dom
import React from 'react'
import {afterEach,describe,it,expect,vi} from 'vitest'
import {render,screen,waitFor,cleanup,fireEvent} from '@testing-library/react'
import {MemoryRouter,Routes,Route} from 'react-router-dom'
const api=vi.hoisted(()=>({create:vi.fn(),webhook:vi.fn(),toast:vi.fn()}))
vi.mock('@/lib/pocketbase/client',()=>({default:{authStore:{token:''},collection:()=>({getFirstListItem:async()=>({id:'fixture-only',sap_transport_number:'TEST_ONLY',driver_name:'Fixture do teste',status:'EM_TRANSITO'}),getFullList:async()=>[],create:api.create})}}))
vi.mock('@/services/tmsService',()=>({tmsService:{sendWhatsAppWebhookEvent:api.webhook}}))
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{name:'Operação'},permissions:{}})}))
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:api.toast})}))
import {FredTransport360Page} from '@/pages/FredTransport360Page'
afterEach(()=>{cleanup();vi.clearAllMocks()})
describe('Fred sem gravação de simulações',()=>{
 it('repete os dois controles de simulação sem criar evento ou evidência',async()=>{
  render(<MemoryRouter initialEntries={['/teste/fixture-only?tab=evidencias']}><Routes><Route path="/teste/:id" element={<FredTransport360Page/>}/></Routes></MemoryRouter>)
  await waitFor(()=>expect(screen.getByRole('button',{name:'Simular Áudio/WhatsApp'})).toBeTruthy())
  fireEvent.click(screen.getByRole('button',{name:'Simular Áudio/WhatsApp'}))
  const webhook=await screen.findByRole('button',{name:'Processar Webhook'})
  fireEvent.click(webhook);fireEvent.click(webhook)
  expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({title:'Simulação indisponível'}))
  fireEvent.click(screen.getByRole('button',{name:'Cancelar'}))
  fireEvent.click(screen.getAllByRole('button',{name:'Simular Envio de Foto/Áudio'})[0])
  const evidence=await screen.findByRole('button',{name:'Enviar para o Fred'})
  fireEvent.click(evidence);fireEvent.click(evidence)
  expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({title:'Arquivo real obrigatório'}))
  expect(api.create).not.toHaveBeenCalled();expect(api.webhook).not.toHaveBeenCalled()
 })
})
