import React,{useEffect,useState} from 'react'
import {ChevronsUpDown,Check,Loader2} from 'lucide-react'
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {transportEditService} from '@/services/transportEditService'

export type SapTransportFilterField='transport_number'|'delivery_number'|'order_number'|'customer'|'customer_cnpj'|'driver'|'plate'|'itinerary'|'responsible_user'
interface Props{campo:SapTransportFilterField;titulo:string;value:string;onChange:(v:string)=>void}
export function SapTransportFilter({campo,titulo,value,onChange}:Props){
 const [open,setOpen]=useState(false),[termo,setTermo]=useState(''),[pagina,setPagina]=useState(1)
 const [itens,setItens]=useState<{valor:string;rotulo:string}[]>([]),[total,setTotal]=useState(0)
 const [loading,setLoading]=useState(false),[erro,setErro]=useState(''),[selecionado,setSelecionado]=useState({valor:'',rotulo:''})
 useEffect(()=>{if(!value)setSelecionado({valor:'',rotulo:''})},[value])
 useEffect(()=>{
  if(!open)return
  let ativo=true
  setLoading(true);setErro('')
  const timeout=setTimeout(()=>{
   transportEditService.searchFilterOptions(campo,termo,pagina).then(r=>{
    if(ativo){setItens(r.itens);setTotal(r.total)}
   }).catch(e=>{if(ativo){setItens([]);setTotal(0);setErro(e?.response?.error||e.message)}}).finally(()=>{if(ativo)setLoading(false)})
  },250)
  return()=>{ativo=false;clearTimeout(timeout)}
 },[campo,termo,pagina,open])
 const label=selecionado.valor===value?selecionado.rotulo:value
 const escolher=(v:string,rotulo:string)=>{onChange(v);setSelecionado({valor:v,rotulo});setOpen(false)}
 return <Popover open={open} onOpenChange={v=>{setOpen(v);if(v){setTermo('');setPagina(1)}}}>
  <PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-label={titulo} aria-expanded={open} className="h-9 w-full min-w-0 justify-between bg-white px-3 text-xs font-normal">
   <span className="truncate" title={label||value}>{label||value||'Selecione no SAP...'}</span><ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50"/>
  </Button></PopoverTrigger>
  <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-72 max-w-[calc(100vw-2rem)] p-2">
   <Input autoFocus aria-label={'Buscar '+titulo} placeholder="Buscar no SAP (até 80 caracteres)" value={termo} maxLength={80} onChange={e=>{setTermo(e.target.value);setPagina(1)}} className="mb-2 h-9 text-xs"/>
   <button type="button" onClick={()=>escolher('','')} className="mb-1 w-full rounded px-2 py-2 text-left text-xs text-slate-500 hover:bg-slate-100">Todos / Limpar seleção</button>
   {loading?<div className="flex items-center gap-2 p-3 text-xs"><Loader2 className="h-3 w-3 animate-spin"/>Consultando SAP...</div>:erro?<p role="alert" className="p-2 text-xs text-red-700">{erro}</p>:
    <div role="listbox" aria-label={'Opções de '+titulo} className="max-h-56 overflow-y-auto">
     {!itens.length&&<p className="p-3 text-xs text-slate-500">Nenhuma opção encontrada.</p>}
     {itens.map(i=><button type="button" role="option" aria-selected={value===i.valor} key={i.valor} onClick={()=>escolher(i.valor,i.rotulo)} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-slate-100">
      <Check className={'h-3 w-3 shrink-0 '+(value===i.valor?'opacity-100':'opacity-0')}/><span className="break-words">{i.rotulo}</span>
     </button>)}
    </div>}
   <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2 text-[10px] text-slate-500">
    <span>{total} opções · Página {pagina} de {Math.max(1,Math.ceil(total/50))}</span>
    <div className="flex gap-1"><Button type="button" size="sm" variant="outline" disabled={loading||pagina===1} onClick={()=>setPagina(pagina-1)}>Anterior</Button><Button type="button" size="sm" variant="outline" disabled={loading||pagina*50>=total} onClick={()=>setPagina(pagina+1)}>Próxima</Button></div>
   </div>
  </PopoverContent>
 </Popover>
}
