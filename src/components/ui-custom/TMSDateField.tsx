import React, { useRef } from 'react'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TMSDateFieldProps {
  id?: string
  value?: string // formato YYYY-MM-DD
  onChange?: (isoDate: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  clearable?: boolean
  min?: string
  max?: string
  name?: string
  required?: boolean
}

/**
 * Campo de data padronizado do TMS CIAFAL com formatação brasileira integral (dd/MM/aaaa).
 *
 * Resolve o problema crítico de truncamento:
 * 1. Exibe a data legível formatada por extenso no padrão brasileiro (DD/MM/AAAA) sem cortar o ano.
 * 2. Posiciona o ícone do calendário à direita com área clicável e espaçamento interno correto.
 * 3. Integra nativamente com o datepicker do navegador (showPicker / overlay invisível)
 *    e preserva fallback robusto para seleção rápida.
 */
export const TMSDateField: React.FC<TMSDateFieldProps> = ({
  id,
  value = '',
  onChange,
  disabled = false,
  className,
  placeholder = 'dd/mm/aaaa',
  clearable = false,
  min,
  max,
  name,
  required = false,
}) => {
  const hiddenInputRef = useRef<HTMLInputElement>(null)

  // Formata YYYY-MM-DD em DD/MM/AAAA para exibição límpida
  const displayValue = React.useMemo(() => {
    if (!value) return ''
    const parts = value.split('-')
    if (parts.length === 3) {
      const [year, month, day] = parts
      if (year && month && day) {
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
      }
    }
    return value
  }, [value])

  const handleClickContainer = () => {
    if (disabled) return
    if (hiddenInputRef.current) {
      if (typeof hiddenInputRef.current.showPicker === 'function') {
        try {
          hiddenInputRef.current.showPicker()
        } catch {
          hiddenInputRef.current.focus()
        }
      } else {
        hiddenInputRef.current.focus()
      }
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    onChange?.('')
  }

  return (
    <div
      onClick={handleClickContainer}
      className={cn(
        'relative flex items-center w-full min-w-0 h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs cursor-pointer transition-colors',
        'hover:border-slate-400 focus-within:ring-2 focus-within:ring-[#005596]/30 focus-within:border-[#005596]',
        disabled && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800',
        className,
      )}
    >
      {/* Texto da data no padrão ABNT / pt-BR (dd/MM/aaaa) com fonte mono legível */}
      <span
        className={cn(
          'flex-1 min-w-0 pl-3 pr-2 font-mono text-xs select-none truncate',
          displayValue
            ? 'text-slate-900 dark:text-slate-100 font-semibold'
            : 'text-slate-400 dark:text-slate-500 font-normal',
        )}
      >
        {displayValue || placeholder}
      </span>

      {/* Ações / Ícone alinhado à direita com espaçamento adequado */}
      <div className="flex items-center gap-1 pr-2.5 shrink-0">
        {clearable && !!value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Limpar data"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <CalendarIcon className="w-4 h-4 text-[#005596] shrink-0 pointer-events-none" />
      </div>

      {/* Input nativo invisível cobrindo a área para acessibilidade e abertura do seletor */}
      <input
        ref={hiddenInputRef}
        id={id}
        name={name}
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="sr-only"
        tabIndex={disabled ? -1 : 0}
        aria-label="Selecionar data de carregamento"
      />
    </div>
  )
}
