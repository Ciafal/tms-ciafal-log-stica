import React from 'react'
import {describe,it,expect,vi} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
const mocks=vi.hoisted(()=>({send:vi.fn(async()=>({itens:[],total:0,pagina:1,porPagina:50}))}))
vi.mock('@/lib/pocketbase/client',()=>({pb:mocks}))
import {SapTransportFilter,type SapTransportFilterField} from '@/components/transport/SapTransportFilter'
import {transportEditService} from '@/services/transportEditService'
const campos:SapTransportFilterField[]=['transport_number','delivery_number','order_number','customer','customer_cnpj','driver','plate','itinerary','responsible_user']
describe('Seletores SAP dos filtros de transporte',()=>{
 it('oferece os nove seletores sem inventar opções nem disparar consultas ao renderizar',()=>{
  mocks.send.mockClear()
  for(const campo of campos){
   const montar=()=>renderToStaticMarkup(<SapTransportFilter campo={campo} titulo={campo} value="" onChange={()=>{}}/>)
   const html=montar();expect(html).toContain('role="combobox"');expect(html).toContain('Selecione no SAP');expect(montar()).toBe(html)
  }
  expect(mocks.send).not.toHaveBeenCalled()
 })
 it('busca e pagina repetidamente usando apenas GET',async()=>{
  mocks.send.mockClear()
  for(const campo of campos)for(let i=0;i<2;i++)await transportEditService.searchFilterOptions(campo,'123',2)
  expect(mocks.send).toHaveBeenCalledTimes(18)
  for(const [url,opcoes]of mocks.send.mock.calls as unknown as [string,object][]){
   expect(url).toMatch(/^\/backend\/v1\/tms\/transportes\/filtros\//)
   expect(opcoes).toMatchObject({method:'GET',query:{termo:'123',pagina:2},requestKey:null})
  }
 })
})
