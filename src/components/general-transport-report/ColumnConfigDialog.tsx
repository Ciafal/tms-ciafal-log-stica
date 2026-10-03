import React, { useState } from 'react'
import { X, RotateCcw, Eye, EyeOff, Check, Search, MoveVertical } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ColumnDefinition,
  SUGGESTED_DEFAULT_COLUMN_KEYS,
} from '@/domain/generalTransportReportEngine'

interface ColumnConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ColumnDefinition[]
  visibleKeys: string[]
  onSave: (visibleKeys: string[], orderedColumns: ColumnDefinition[]) => void
  onReset: () => void
  onApplySuggested?: () => void
}

export const ColumnConfigDialog: React.FC<ColumnConfigDialogProps> = ({
  open,
  onOpenChange,
  columns,
  visibleKeys,
  onSave,
  onReset,
  onApplySuggested,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentVisible, setCurrentVisible] = useState<string[]>(visibleKeys)
  const [currentOrder, setCurrentOrder] = useState<ColumnDefinition[]>(columns)

  // Sincroniza estado local quando o modal é aberto
  React.useEffect(() => {
    if (open) {
      setCurrentVisible(visibleKeys)
      setCurrentOrder(columns)
      setSearchTerm('')
    }
  }, [open, visibleKeys, columns])

  const toggleColumn = (key: string) => {
    // Manter as colunas essenciais sempre visíveis
    if (key === 'transport_number') return

    if (currentVisible.includes(key)) {
      setCurrentVisible(currentVisible.filter((k) => k !== key))
    } else {
      setCurrentVisible([...currentVisible, key])
    }
  }

  const handleSelectAll = () => {
    setCurrentVisible(columns.map((c) => c.key as string))
  }

  const handleClearSelection = () => {
    // Mantém apenas a coluna de identificação essencial
    const minimal = columns.filter((c) => c.key === 'transport_number').map((c) => c.key as string)
    setCurrentVisible(minimal)
  }

  const handleApplySuggested = () => {
    if (onApplySuggested) {
      onApplySuggested()
    } else {
      setCurrentVisible(SUGGESTED_DEFAULT_COLUMN_KEYS)
    }
  }

  const handleDeselectNonSticky = () => {
    const stickyOnly = columns
      .filter((c) => c.sticky || c.key === 'transport_number' || c.key === 'transport_status')
      .map((c) => c.key as string)
    setCurrentVisible(stickyOnly)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...currentOrder]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    setCurrentOrder(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index === currentOrder.length - 1) return
    const updated = [...currentOrder]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    setCurrentOrder(updated)
  }

  const filteredColumns = currentOrder.filter(
    (col) =>
      col.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.sapTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(col.seq).includes(searchTerm),
  )

  const handleApply = () => {
    onSave(currentVisible, currentOrder)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                Personalização de Colunas (43 campos SAP)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Ative ou oculte colunas e ajuste a ordem de exibição na grade. As preferências são
                salvas localmente.
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className="text-xs bg-white text-[#005596] border-[#005596]/30"
            >
              {currentVisible.length} de {columns.length} ativas
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                placeholder="Filtrar coluna por nome ou campo SAP (ex: Tara, Frete, Stts)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs h-8 text-slate-700 font-semibold"
                title="Selecionar todas as 43 colunas canônicas"
              >
                Selecionar Todas (43)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplySuggested}
                className="text-xs h-8 text-[#005596] border-[#005596]/30 bg-blue-50/50 hover:bg-blue-100/60 font-semibold"
                title="Restaurar colunas principais sugeridas"
              >
                Padrão Sugerido
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="text-xs h-8 text-slate-500 hover:text-slate-800"
                title="Limpar seleção de colunas"
              >
                Limpar Seleção
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-1 divide-y divide-slate-100">
          {filteredColumns.map((col, index) => {
            const isVisible = currentVisible.includes(col.key as string)
            const isLocked = col.key === 'transport_number'

            return (
              <div
                key={col.key}
                className={`pt-1 pb-1 flex items-center justify-between gap-3 px-2 rounded-lg transition ${
                  isVisible ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] font-mono font-bold text-slate-400 w-6 text-right">
                    #{col.seq}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleColumn(col.key as string)}
                    disabled={isLocked}
                    className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                      isVisible
                        ? 'bg-[#005596] border-[#004275] text-white'
                        : 'bg-white border-slate-300 text-transparent'
                    } ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {col.label}
                      </span>
                      {col.sticky && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] px-1 py-0 h-4">
                          Fixa
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      SAP: {col.sapTitle} • {col.format}
                    </span>
                  </div>
                </div>

                {/* Controles de Ordenação Up/Down */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                    title="Mover coluna para a esquerda"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === currentOrder.length - 1}
                    onClick={() => handleMoveDown(index)}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                    title="Mover coluna para a direita"
                  >
                    ↓
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-xs text-[#005596] hover:text-[#004275] hover:bg-blue-50 gap-1.5 h-8"
              title="Ativa todas as 43 colunas canônicas da especificação SAP ZSD40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Todas (43 SAP)
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="bg-[#005596] hover:bg-[#004275] text-white text-xs h-8 px-4 font-bold shadow-sm"
            >
              Aplicar ({currentVisible.length} colunas)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
