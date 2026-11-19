import React, { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  const [result, setResult] = useState<{ items: QueueSapVehicle[]; totalPages: number; totalItems: number }>({ items: [], totalPages: 0, totalItems: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!open) return
    let current = true
    setLoading(true)
    setError('')
    const timer = setTimeout(async () => {
      try {
        const response = await searchQueueSapVehicles(value, page)
        if (!current) return
        setResult(response)
        // A placa digitada completa só é vinculada se identificar um único cadastro.
        if (!selectedId && response.totalItems === 1 && response.items[0]?.plate === normalizeQueuePlate(value)) {
          onChangeRef.current(response.items[0].plate, response.items[0])
        }
      } catch (e: any) {
        if (current) { setResult({ items: [], totalItems: 0, totalPages: 0 }); setError(e.message) }
      } finally {
        if (current) setLoading(false)
      }
    }, 250)
    return () => { current = false; clearTimeout(timer) }
  }, [value, page, open, selectedId])

  return <div className="space-y-1">
    <Input id="manual-plate" role="combobox" aria-label="Placa do Veículo" aria-expanded={open}
      aria-controls="manual-sap-plates" aria-autocomplete="list" autoComplete="off"
      placeholder="Buscar placa SAP" value={value} disabled={disabled} required
      className="font-mono text-xs uppercase" onFocus={() => setOpen(true)}
      onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
      onChange={e => { setPage(1); setResult({ items: [], totalPages: 0, totalItems: 0 }); onChange(normalizeQueuePlate(e.target.value), null); setOpen(true) }} />
    {open && <div id="manual-sap-plates" className="rounded-md border border-slate-200 bg-white p-1">
      {loading ? <p role="status" className="p-2">Consultando placas…</p> : error ? <p role="alert" className="p-2 text-red-700">{error}</p> : <>
        <div role="listbox" aria-label="Placas SAP" className="max-h-40 overflow-auto">
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
      <button type="button" className="w-full p-1 text-right text-slate-500" onClick={() => setOpen(false)}>Fechar lista</button>
    </div>}
  </div>
}
