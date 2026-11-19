import React, { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { QueueSapVehicle, normalizeQueuePlate, searchQueueSapVehicles } from '@/services/queue-sap-vehicle'

interface Props {
  value: string
  selectedId?: string
  disabled?: boolean
  onChange: (plate: string, vehicle: QueueSapVehicle | null) => void
}

export function QueueSapVehicleSelect({ value, selectedId, disabled, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [result, setResult] = useState<{ items: QueueSapVehicle[]; totalPages: number; totalItems: number }>({ items: [], totalPages: 0, totalItems: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    // Foco e campo vazio não consultam nem abrem uma lista. A placa completa é validada
    // em segundo plano; a pesquisa com resultados só abre por ação explícita.
    if (!open && (selectedId || !/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(value))) return
    let current = true
    setLoading(true)
    setError('')
    const timer = setTimeout(async () => {
      try {
        const response = await searchQueueSapVehicles(open ? searchTerm : value, open ? page : 1)
        if (!current) return
        setResult(response)
        // A placa digitada completa só é vinculada se identificar um único cadastro.
        if (!open && !selectedId) {
          if (response.totalItems === 1 && response.items[0]?.plate === normalizeQueuePlate(value)) {
            onChangeRef.current(response.items[0].plate, response.items[0])
          } else {
            setError(response.totalItems ? 'Selecione o cadastro na pesquisa.' : 'Placa não localizada no SAP.')
          }
        }
      } catch (e: any) {
        if (current) { setResult({ items: [], totalItems: 0, totalPages: 0 }); setError(e.message) }
      } finally {
        if (current) setLoading(false)
      }
    }, 250)
    return () => { current = false; clearTimeout(timer) }
  }, [value, page, open, selectedId, searchTerm])

  const changeOpen = (next: boolean) => {
    setOpen(next)
    setError('')
    if (next) { setSearchTerm(value); setPage(1) }
  }

  return <div className="space-y-1">
    <Popover open={open} onOpenChange={changeOpen}>
      <div className="relative">
        <Input id="manual-plate" role="combobox" aria-label="Placa do Veículo" aria-expanded={open}
          aria-controls={open ? 'manual-sap-plates' : undefined} aria-haspopup="dialog" autoComplete="off"
          aria-invalid={Boolean(error) && !open} aria-describedby={error && !open ? 'manual-plate-error' : undefined}
          placeholder="Digite ou pesquise a placa" value={value} disabled={disabled} required
          className="pr-9 font-mono text-xs uppercase"
          onKeyDown={e => {
            if (e.key === 'Escape') changeOpen(false)
            if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); changeOpen(true) }
          }}
          onChange={e => {
            setPage(1); setLoading(false); setError('');
            setResult({ items: [], totalPages: 0, totalItems: 0 });
            onChange(normalizeQueuePlate(e.target.value), null)
          }} />
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label="Pesquisar placa no SAP"
            disabled={disabled} className="absolute right-0 top-0 h-9 w-9 text-slate-500">
            {loading && !open ? <Loader2 aria-label="Validando placa" className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] bg-white p-2 text-xs">
        <Input aria-label="Buscar placa no SAP" placeholder="Pesquisar placa" value={searchTerm}
          className="mb-2 h-9 font-mono text-xs uppercase" autoFocus
          onChange={e => { setSearchTerm(normalizeQueuePlate(e.target.value)); setPage(1) }}
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }} />
      {loading ? <p role="status" className="p-2">Consultando placas…</p> : error ? <p role="alert" className="p-2 text-red-700">{error}</p> : <>
        <div id="manual-sap-plates" role="listbox" aria-label="Placas SAP" className="max-h-40 overflow-auto">
          {result.items.map(vehicle => <button key={vehicle.id} type="button" role="option"
            aria-selected={selectedId === vehicle.id} disabled={disabled}
            className="block w-full rounded px-2 py-1.5 text-left font-mono hover:bg-slate-100 focus:bg-slate-100"
            onClick={() => { onChange(vehicle.plate, vehicle); setOpen(false) }}>
            {vehicle.plate} <span className="text-slate-500">· {vehicle.plant}{vehicle.status === 'B' ? ' · Bloqueado' : ''}</span>
          </button>)}
          {!result.items.length && <p className="p-2 text-slate-500">Nenhuma placa encontrada.</p>}
        </div>
        <div className="flex items-center justify-between gap-1 border-t pt-1">
          <Button type="button" variant="ghost" size="sm" disabled={disabled || page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span>{result.totalItems} placas · {result.totalPages ? page : 0}/{result.totalPages}</span>
          <Button type="button" variant="ghost" size="sm" disabled={disabled || page >= result.totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
        </div>
      </>}
      </PopoverContent>
    </Popover>
    {!open && error && <p id="manual-plate-error" role="alert" className="text-[11px] text-red-700">{error}</p>}
  </div>
}
