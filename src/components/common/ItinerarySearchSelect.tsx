import React, { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Search, Route } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface ItineraryOption {
  code: string
  name: string
  label: string
}

interface ItinerarySearchSelectProps {
  valueCode: string // '' or 'SEM_PREFERENCIA' or official code
  onChange: (code: string, name: string) => void
  itineraries: Array<{
    id?: string
    code?: string
    name?: string
    description?: string
    uf?: string
  }>
  disabled?: boolean
  className?: string
  placeholder?: string
}

export const ItinerarySearchSelect: React.FC<ItinerarySearchSelectProps> = ({
  valueCode,
  onChange,
  itineraries,
  disabled = false,
  className,
  placeholder = 'Selecione o itinerário ou Sem preferência...',
}) => {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Normalização das opções
  const options = useMemo(() => {
    const list: ItineraryOption[] = [
      {
        code: 'SEM_PREFERENCIA',
        name: 'Sem preferência',
        label: 'Sem preferência (qualquer rota/região)',
      },
    ]

    for (const it of itineraries) {
      const code = (it.code || it.id || '').trim()
      const name = (it.name || it.description || '').trim()
      if (code && !list.some((item) => item.code === code)) {
        list.push({
          code,
          name: name || code,
          label: `${code} — ${name || 'Itinerário SAP'}`,
        })
      }
    }
    return list
  }, [itineraries])

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options
    const term = searchTerm.toLowerCase().trim()
    return options.filter(
      (opt) =>
        opt.code.toLowerCase().includes(term) ||
        opt.name.toLowerCase().includes(term) ||
        opt.label.toLowerCase().includes(term),
    )
  }, [options, searchTerm])

  const selectedOption = useMemo(() => {
    if (!valueCode) return null
    return options.find((opt) => opt.code === valueCode) || null
  }, [options, valueCode])

  const handleSelect = (opt: ItineraryOption) => {
    if (opt.code === 'SEM_PREFERENCIA') {
      onChange('SEM_PREFERENCIA', 'Sem preferência')
    } else {
      onChange(opt.code, opt.name)
    }
    setOpen(false)
    setSearchTerm('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between text-left font-normal h-10 px-3 text-xs bg-white border-slate-300 hover:bg-slate-50',
            !selectedOption && 'text-slate-500',
            className,
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Route className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] sm:w-[420px] p-2 bg-white shadow-xl rounded-xl border border-slate-200 z-50">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Digite código, estado ou descrição..."
            className="pl-8 text-xs h-9 bg-slate-50 border-slate-200"
            autoFocus
          />
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1 text-xs">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-slate-400 text-xs">
              Nenhum itinerário encontrado para "{searchTerm}"
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = selectedOption?.code === opt.code
              const isNeutral = opt.code === 'SEM_PREFERENCIA'
              return (
                <div
                  key={opt.code}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-[#005596]/10 text-[#005596] font-semibold'
                      : 'hover:bg-slate-100 text-slate-700',
                    isNeutral && 'border-b border-slate-100 pb-2 mb-1 text-amber-900 font-medium',
                  )}
                >
                  <div className="truncate pr-2">
                    <span className="font-mono text-[11px] font-bold text-slate-900 mr-1.5">
                      {opt.code === 'SEM_PREFERENCIA' ? '★' : opt.code}
                    </span>
                    <span className="text-slate-600">{opt.name}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#005596] shrink-0" />}
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
