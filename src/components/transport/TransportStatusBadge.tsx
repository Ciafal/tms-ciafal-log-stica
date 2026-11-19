import React from 'react'
import {CalendarClock,Handshake,PhoneCall,Warehouse,PackageOpen,ReceiptText,Truck,CircleCheck,CircleX,CircleHelp} from 'lucide-react'
import {TransportOperationalStatus} from '@/domain/transportEditEngine'
export const TRANSPORT_STATUS_VISUALS = {
 'Planejado':{icon:CalendarClock,color:'bg-slate-100 text-slate-700 border-slate-300'},
 'Frete aceito':{icon:Handshake,color:'bg-blue-50 text-blue-700 border-blue-300'},
 'Veículo convocado':{icon:PhoneCall,color:'bg-violet-50 text-violet-700 border-violet-300'},
 'Veículo na portaria':{icon:Warehouse,color:'bg-amber-50 text-amber-800 border-amber-300'},
 'Em carregamento':{icon:PackageOpen,color:'bg-orange-50 text-orange-800 border-orange-300'},
 'Faturado':{icon:ReceiptText,color:'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-300'},
 'Em trânsito':{icon:Truck,color:'bg-cyan-50 text-cyan-800 border-cyan-300'},
 'Entregue':{icon:CircleCheck,color:'bg-emerald-50 text-emerald-800 border-emerald-300'},
 'Cancelado':{icon:CircleX,color:'bg-rose-50 text-rose-800 border-rose-300'},
} satisfies Record<TransportOperationalStatus,{icon:typeof Truck;color:string}>
export function TransportStatusBadge({status}:{status:string}){
 const visual=TRANSPORT_STATUS_VISUALS[status as TransportOperationalStatus]||{icon:CircleHelp,color:'bg-gray-100 text-gray-700 border-gray-300'}
 const Icon=visual.icon
 return <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-semibold whitespace-nowrap ${visual.color}`} title={status}><Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0"/><span>{status||'Não informado'}</span></span>
}
