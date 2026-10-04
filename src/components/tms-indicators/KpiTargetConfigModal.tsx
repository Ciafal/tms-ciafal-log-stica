import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KpiRowData, KpiRule } from '@/domain/tmsIndicatorsEngine'
import { Settings2, History } from 'lucide-react'

interface KpiTargetConfigModalProps {
  isOpen: boolean
  onClose: () => void
  kpi: KpiRowData | null
  onSave: (
    kpiId: string,
    targetValue: number,
    rule: KpiRule,
    targetMax: number | undefined,
    responsible: string,
    justification: string,
  ) => Promise<void>
}

export const KpiTargetConfigModal: React.FC<KpiTargetConfigModalProps> = ({
  isOpen,
  onClose,
  kpi,
  onSave,
}) => {
  const [targetValue, setTargetValue] = useState<string>(
    kpi ? String(kpi.targetConfig.target_value) : '0',
  )
  const [rule, setRule] = useState<KpiRule>(kpi ? kpi.targetConfig.rule : 'GTE')
  const [targetMax, setTargetMax] = useState<string>(
    kpi?.targetConfig.target_value_max ? String(kpi.targetConfig.target_value_max) : '',
  )
  const [responsible, setResponsible] = useState<string>(kpi ? kpi.targetConfig.responsible : '')
  const [justification, setJustification] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  // Sincroniza estado quando muda o kpi selecionado
  React.useEffect(() => {
    if (kpi) {
      setTargetValue(String(kpi.targetConfig.target_value))
      setRule(kpi.targetConfig.rule)
      setTargetMax(
        kpi.targetConfig.target_value_max ? String(kpi.targetConfig.target_value_max) : '',
      )
      setResponsible(kpi.targetConfig.responsible)
      setJustification('')
      setErrorMsg('')
    }
  }, [kpi])

  if (!kpi) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!justification.trim()) {
      setErrorMsg('A justificativa de alteração é obrigatória para fins de governança e auditoria.')
      return
    }
    const numVal = parseFloat(targetValue.replace(',', '.'))
    if (isNaN(numVal)) {
      setErrorMsg('Valor da meta inválido.')
      return
    }

    const numMax = targetMax ? parseFloat(targetMax.replace(',', '.')) : undefined

    try {
      setIsSubmitting(true)
      setErrorMsg('')
      await onSave(kpi.id, numVal, rule, numMax, responsible, justification)
      onClose()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao salvar alteração de meta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Parametrização de Meta • {kpi.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Ano {kpi.targetConfig.year} • {kpi.category}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs border border-rose-500/20">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Valor da Meta */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Valor da Meta ({kpi.unit})
              </label>
              <Input
                type="text"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="Ex: 95.0"
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Regra de Avaliação */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Regra</label>
              <Select value={rule} onValueChange={(val) => setRule(val as KpiRule)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Regra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GTE" className="text-xs">
                    Maior ou igual (≥)
                  </SelectItem>
                  <SelectItem value="LTE" className="text-xs">
                    Menor ou igual (≤)
                  </SelectItem>
                  <SelectItem value="EQ" className="text-xs">
                    Igual exato (=)
                  </SelectItem>
                  <SelectItem value="BETWEEN" className="text-xs">
                    Intervalo (Entre)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {rule === 'BETWEEN' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Valor Máximo do Intervalo ({kpi.unit})
              </label>
              <Input
                type="text"
                value={targetMax}
                onChange={(e) => setTargetMax(e.target.value)}
                placeholder="Ex: 98.0"
                className="h-9 text-xs"
              />
            </div>
          )}

          {/* Responsável pela Meta */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Responsável pela Meta</label>
            <Input
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              placeholder="Nome ou setor responsável"
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Justificativa de alteração (Obrigatória por compliance) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Justificativa da Alteração *
              </label>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <History className="w-3 h-3" /> Auditável no log corporativo
              </span>
            </div>
            <Textarea
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Descreva o motivo da alteração de meta/regra (revisão orçamentária, acordo de nível de serviço, etc.)..."
              className="text-xs"
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs bg-sky-600 hover:bg-sky-700 text-white"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Alteração'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
