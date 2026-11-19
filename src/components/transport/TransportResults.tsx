import React from 'react'
import {Eye,Edit,History,UserRound} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Table,TableHeader,TableRow,TableHead,TableBody,TableCell} from '@/components/ui/table'
import type {TransportEditableRecord as Registro} from '@/domain/transportEditEngine'
import {TransportStatusBadge} from './TransportStatusBadge'

export const pesoEmToneladas=(kg:number)=>Number.isFinite(kg)?`${(kg/1000).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3})} t`:'—'
export function dataTransporte(value:string){
 const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})/)
 if(!m)return '—'
 const [,a,mes,d]=m,dt=new Date(`${a}-${mes}-${d}T12:00:00Z`)
 return !Number.isNaN(dt.getTime())&&dt.toISOString().slice(0,10)===`${a}-${mes}-${d}`?`${d}/${mes}/${a}`:'—'
}
export function usuarioSap(item:Registro){
 const nome=item.sap_user||item.last_modified_by||item.sap_created_by||'—'
 const detalhe=item.sap_user_source==='criacao'?'Usuário SAP de criação':'Usuário SAP da alteração'
 return <span className="inline-flex max-w-full items-center gap-1.5 font-mono text-xs font-medium text-slate-700" title={`${detalhe}: ${nome}`}><UserRound aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400"/><span className="break-all">{nome}</span></span>
}
interface Props{items:Registro[];canEdit:(item:Registro)=>boolean;onView:(item:Registro)=>void;onEdit:(item:Registro)=>void;onHistory:(item:Registro)=>void}
export function TransportResults({items,canEdit,onView,onEdit,onHistory}:Props){
 const actions=(item:Registro)=><div className="flex flex-wrap items-center gap-1.5">
  <Button size="sm" variant="outline" className="h-8 gap-1.5 px-2 text-xs" aria-label={`Visualizar transporte ${item.transport_number}`} onClick={()=>onView(item)}><Eye className="h-3.5 w-3.5"/>Visualizar</Button>
  {canEdit(item)&&<Button size="sm" variant="outline" className="h-8 gap-1.5 px-2 text-xs text-primary border-primary/25" aria-label={`Editar transporte ${item.transport_number}`} onClick={()=>onEdit(item)}><Edit className="h-3.5 w-3.5"/>Editar</Button>}
  <Button size="sm" variant="outline" className="h-8 gap-1.5 px-2 text-xs" aria-label={`Histórico do transporte ${item.transport_number}`} onClick={()=>onHistory(item)}><History className="h-3.5 w-3.5"/>Histórico</Button>
 </div>
 const detalhe=(label:string,value:React.ReactNode)=><div className="min-w-0"><dt className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">{label}</dt><dd className="break-words text-xs font-medium text-slate-800">{value||'—'}</dd></div>
 return <>
  <div className="grid gap-3 bg-slate-50/50 p-3 xl:hidden" aria-label="Transportes em cartões">
   {items.map(item=><article key={item.id} className="min-w-0 rounded-lg border bg-white p-4 shadow-sm" aria-label={`Transporte ${item.transport_number}`}>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><strong className="font-mono text-sm text-primary">{item.transport_number}</strong><TransportStatusBadge status={item.status}/></div>
    <p className="mb-1 break-words text-sm font-semibold text-slate-900">{item.customer_summary||'—'}</p><p className="mb-4 break-words text-xs text-slate-500">{[item.destination_city,item.destination_uf].filter(Boolean).join(' / ')}</p>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
     {detalhe('Remessa',item.delivery_number)}{detalhe('Pedido',item.order_number)}{detalhe('Peso (t)',pesoEmToneladas(item.total_weight_kg))}
     {detalhe('Transportadora',item.carrier_name)}{detalhe('Motorista',item.driver_name)}{detalhe('Veículo / Placa',[item.vehicle_plate,item.trailer_plate].filter(Boolean).join(' / '))}
     {detalhe('Itinerário',[item.itinerary_code,item.itinerary_description].filter(Boolean).join(' · '))}{detalhe('Data prevista',dataTransporte(item.scheduled_loading_date))}{detalhe('Última alteração',dataTransporte(item.last_modified_at))}{detalhe('Usuário SAP',usuarioSap(item))}
    </dl><div className="mt-4 border-t pt-3">{actions(item)}</div>
   </article>)}
  </div>
  <div className="hidden min-w-0 max-w-full xl:block" aria-label="Tabela de transportes">
   <Table className="min-w-[1380px] text-xs [&_th]:h-11 [&_th]:px-2.5 [&_th]:text-[11px] [&_td]:px-2.5 [&_td]:py-3">
    <TableHeader className="bg-slate-50"><TableRow>
     {['Transporte','Remessa','Pedido','Cliente','Transportadora','Motorista','Veículo / Placa','Itinerário','Peso (t)','Data prevista','Status','Última alteração','Usuário SAP','Ações'].map(label=><TableHead key={label} className={`font-semibold text-slate-700 ${label==='Ações'?'sticky right-0 z-10 min-w-[110px] bg-slate-50 shadow-[-3px_0_6px_-3px_#cbd5e1]':label==='Peso (t)'?'text-right whitespace-nowrap':''}`}>{label}</TableHead>)}
    </TableRow></TableHeader>
    <TableBody>{items.map(item=><TableRow key={item.id} className="group hover:bg-slate-50/60">
     <TableCell className="font-mono font-semibold text-primary">{item.transport_number}</TableCell>
     <TableCell className="font-mono">{item.delivery_number||'—'}</TableCell><TableCell className="font-mono">{item.order_number||'—'}</TableCell>
     <TableCell className="min-w-[145px] max-w-[230px]"><div className="font-medium break-words">{item.customer_summary||'—'}</div><div className="mt-1 text-[10px] text-slate-500">{[item.destination_city,item.destination_uf].filter(Boolean).join(' / ')}</div></TableCell>
     <TableCell className="max-w-[130px] break-words">{item.carrier_name||'—'}</TableCell><TableCell className="min-w-[115px] max-w-[160px] break-words">{item.driver_name||'—'}</TableCell>
     <TableCell className="font-mono whitespace-nowrap"><div>{item.vehicle_plate||'—'}</div><div className="mt-1 text-slate-500">{item.trailer_plate}</div></TableCell>
     <TableCell className="max-w-[140px]"><div className="font-mono text-primary">{item.itinerary_code||'—'}</div><div className="mt-1 break-words text-[10px] text-slate-500">{item.itinerary_description}</div></TableCell>
     <TableCell className="whitespace-nowrap text-right font-mono tabular-nums font-semibold">{pesoEmToneladas(item.total_weight_kg)}</TableCell>
     <TableCell className="whitespace-nowrap tabular-nums">{dataTransporte(item.scheduled_loading_date)}<div className="text-[10px] text-slate-500">{item.scheduled_loading_time}</div></TableCell>
     <TableCell><TransportStatusBadge status={item.status}/></TableCell>
     <TableCell className="whitespace-nowrap tabular-nums text-slate-600">{dataTransporte(item.last_modified_at)}</TableCell><TableCell className="min-w-[100px]">{usuarioSap(item)}</TableCell>
     <TableCell className="sticky right-0 z-10 w-[110px] bg-white shadow-[-3px_0_6px_-3px_#cbd5e1] group-hover:bg-slate-50">{actions(item)}</TableCell>
    </TableRow>)}</TableBody>
   </Table>
  </div>
 </>
}
