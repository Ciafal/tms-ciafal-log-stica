import React from 'react'
import {describe,it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {TransportStatusBadge,TRANSPORT_STATUS_VISUALS} from '../components/transport/TransportStatusBadge'
describe('Status operacional',()=>{
 it('distingue todas as etapas e reserva verde para entregue',()=>{
  const entries=Object.entries(TRANSPORT_STATUS_VISUALS)
  expect(entries).toHaveLength(9)
  expect(new Set(entries.map(([,v])=>v.icon)).size).toBe(9)
  expect(new Set(entries.map(([,v])=>v.color)).size).toBe(9)
  for(const [status,v] of entries){
   expect(v.color.includes('emerald')).toBe(status==='Entregue')
   const html=renderToStaticMarkup(<TransportStatusBadge status={status}/> )
   expect(html).toContain(status);expect(html).toContain('<svg')
   expect(renderToStaticMarkup(<TransportStatusBadge status={status}/>)).toBe(html)
  }
 })
 it('mantém desconhecido neutro',()=>{
  const html=renderToStaticMarkup(<TransportStatusBadge status="Desconhecido"/> )
  expect(html).toContain('bg-gray-100');expect(html).not.toContain('emerald')
 })
})
