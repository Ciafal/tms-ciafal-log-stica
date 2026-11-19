import React from 'react'
import {describe,it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {TransportResults,pesoEmToneladas,dataTransporte,usuarioSap} from '../components/transport/TransportResults'
import type {TransportEditableRecord} from '../domain/transportEditEngine'
import {evaluateStatusRules} from '../domain/transportEditEngine'

describe('Apresentação dos transportes',()=>{
 it('converte kg em toneladas com três casas e trata valores ausentes',()=>{
  expect(pesoEmToneladas(1206)).toBe('1,206 t');expect(pesoEmToneladas(24388)).toBe('24,388 t')
  expect(pesoEmToneladas(0)).toBe('0,000 t');expect(pesoEmToneladas(1234567)).toBe('1.234,567 t');expect(pesoEmToneladas(NaN)).toBe('—')
 })
 it('preserva a data SAP sem deslocar o dia e não exibe Invalid Date',()=>{
  expect(dataTransporte('2026-11-10')).toBe('10/11/2026');expect(dataTransporte('2026-11-10T00:00:00Z')).toBe('10/11/2026')
  for(const v of ['','0000-00-00','2026-02-30','invalida'])expect(dataTransporte(v)).toBe('—')
 })
 it('identifica o usuário SAP e distingue a criação da alteração',()=>{
  const registro={sap_user:'SAPCRIADOR',sap_user_source:'criacao',last_modified_by:''} as TransportEditableRecord
  const html=renderToStaticMarkup(usuarioSap(registro));expect(html).toContain('SAPCRIADOR');expect(html).toContain('Usuário SAP de criação')
 })
 it('exibe ações legíveis, sem Origem, com layout móvel e bloqueio dos concluídos',()=>{
  const item={id:'123',transport_number:'123',status:'Entregue',total_weight_kg:1206,scheduled_loading_date:'',last_modified_at:'2026-11-10',sap_user:'SAPUSER'} as TransportEditableRecord
  const render=(status:TransportEditableRecord['status'])=>renderToStaticMarkup(<TransportResults items={[{...item,status}]} canEdit={r=>evaluateStatusRules(r.status,'HUB_ADMIN').canEdit} onView={()=>{}} onEdit={()=>{}} onHistory={()=>{}} />)
  const html=render('Entregue');expect(html).toContain('1,206 t');expect(html).toContain('SAPUSER');expect(html).not.toContain('Origem');expect(html).not.toContain('Invalid Date')
  expect(html).toContain('Transportes em cartões');expect(html).toContain('Tabela de transportes');expect(html).not.toContain('Editar transporte 123');expect(render('Planejado')).toContain('Editar transporte 123');expect(render('Entregue')).toBe(html)
 })
})
