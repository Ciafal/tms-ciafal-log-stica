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
import { KpiRowData, KpiMonthCell, KpiAiDiagnosisResult } from '@/domain/tmsIndicatorsEngine'
import { DeviationActionRecord } from '@/services/tmsIndicatorsService'
import { ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react'

interface KpiDeviationActionModalProps {
  isOpen: boolean
  onClose: () => void
  kpi: KpiRowData | null
  monthCell: KpiMonthCell | null
  aiDiagnosis: KpiAiDiagnosisResult | null
  onSubmit: (action: Omit<DeviationActionRecord, 'id' | 'action_code' | 'created'>) => Promise<void>
}

export const KpiDeviationActionModal: React.FC<KpiDeviationActionModalProps> = ({
  isOpen,
  onClose,
  kpi,
  monthCell,
  aiDiagnosis,
  onSubmit,
}) => {
  const [problem, setProblem] = useState('')
  const [cause, setCause] = useState('')
  const [actionDesc, setActionDesc] = useState('')
  const [responsibleName, setResponsibleName] = useState('')
  const [responsibleSector, setResponsibleSector] = useState('')
  const [targetModule, setTargetModule] = useState<
    'TMS' | 'WMS' | 'PCP_ROBOTIZADO' | 'MANUTENCAO' | 'COMERCIAL_CRM' | 'EXPEDICAO' | 'OUTRO'
  >('TMS')
  const [priority, setPriority] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'>('ALTA')
  const [deadline, setDeadline] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Preenche dados sugeridos da IA ou valores padrão
  React.useEffect(() => {
    if (kpi && monthCell) {
      const d = new Date()
      d.setDate(d.getDate() + (aiDiagnosis?.suggestedAction?.suggestedDeadlineDays || 10))
      const dateStr = d.toISOString().split('T')[0]

      setProblem(
        aiDiagnosis?.suggestedAction?.problem ||
          `Desvio no indicador ${kpi.name} (${monthCell.monthLabel}/${monthCell.year}): Realizado ${monthCell.formattedValue} vs Meta ${monthCell.formattedTarget}`,
      )
      setCause(
        aiDiagnosis?.suggestedAction?.cause ||
          aiDiagnosis?.probableCauses?.join('; ') ||
          'Aguardando investigação detalhada da causa raiz.',
      )
      setActionDesc(aiDiagnosis?.suggestedAction?.action || '')
      setResponsibleName(kpi.targetConfig.responsible || 'Coordenador Operacional')
      setResponsibleSector(
        aiDiagnosis?.suggestedAction?.responsibleSector || 'Logística & Expedição',
      )
      setTargetModule(aiDiagnosis?.suggestedAction?.targetModule || 'TMS')
      setPriority(aiDiagnosis?.suggestedAction?.priority || 'ALTA')
      setDeadline(dateStr)
      setIsSuccess(false)
      setErrorMsg('')
    }
  }, [kpi, monthCell, aiDiagnosis])

  if (!kpi || !monthCell) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!actionDesc.trim()) {
      setErrorMsg('Descreva o plano de ação corretiva.')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMsg('')

      await onSubmit({
        kpi_id: kpi.id,
        kpi_name: kpi.name,
        category: kpi.category,
        period_ref: `${monthCell.monthLabel}/${monthCell.year}`,
        month: monthCell.month,
        year: monthCell.year,
        identified_problem: problem,
        probable_cause: cause,
        action_description: actionDesc,
        responsible_name: responsibleName,
        target_module: targetModule,
        responsible_sector: responsibleSector,
        deadline,
        priority,
        status: 'ABERTA',
        ai_suggested: Boolean(aiDiagnosis?.suggestedAction),
        ai_diagnosis_summary: aiDiagnosis?.diagnostic,
      })

      setIsSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao registrar ação corretiva.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Tratamento de Desvio • Criar Ação Corretiva
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {kpi.name} • Período {monthCell.monthLabel}/{monthCell.year}
              </p>
            </div>
          </div>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-semibold text-foreground">
              Ação Corretiva Registrada com Sucesso!
            </h4>
            <p className="text-xs text-muted-foreground">
              Trilha de governança e auditoria atualizada. Notificações vinculadas ao setor
              responsável.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 text-xs">
                {errorMsg}
              </div>
            )}

            {aiDiagnosis?.suggestedAction && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 text-xs">
                <Sparkles className="w-4 h-4 shrink-0 text-sky-500" />
                <span>
                  Campos pré-preenchidos com a recomendação inteligente da IA integrada sobre os
                  desvios reais do período.
                </span>
              </div>
            )}

            {/* Problema Identificado */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Problema Identificado</label>
              <Input
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            {/* Causa Provável */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Causa Provável Identificada
              </label>
              <Input
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            {/* Ação Proposta */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Ação Corretiva / Plano de Mitigação *
              </label>
              <Textarea
                rows={3}
                value={actionDesc}
                onChange={(e) => setActionDesc(e.target.value)}
                placeholder="Detalhe o plano de contenção, responsabilidades operacionais e entregáveis..."
                className="text-xs"
                required
              />
            </div>

            {/* Direcionamento para Módulo do HUB & Setor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Módulo de Ação do HUB
                </label>
                <Select value={targetModule} onValueChange={(val) => setTargetModule(val as any)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TMS" className="text-xs">
                      TMS (Transporte e Rotas)
                    </SelectItem>
                    <SelectItem value="EXPEDICAO" className="text-xs">
                      Expedição (Pátio e Portaria)
                    </SelectItem>
                    <SelectItem value="WMS" className="text-xs">
                      WMS (Armazenagem e Docas)
                    </SelectItem>
                    <SelectItem value="PCP_ROBOTIZADO" className="text-xs">
                      PCP Robotizado (Produção)
                    </SelectItem>
                    <SelectItem value="COMERCIAL_CRM" className="text-xs">
                      Comercial / CRM 360°
                    </SelectItem>
                    <SelectItem value="MANUTENCAO" className="text-xs">
                      Manutenção de Frotas
                    </SelectItem>
                    <SelectItem value="OUTRO" className="text-xs">
                      Outro Setor
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Setor Responsável</label>
                <Input
                  value={responsibleSector}
                  onChange={(e) => setResponsibleSector(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>
            </div>

            {/* Responsável, Prazo e Prioridade */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Responsável</label>
                <Input
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Prazo Limite</label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Prioridade</label>
                <Select value={priority} onValueChange={(val) => setPriority(val as any)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAIXA" className="text-xs">
                      Baixa
                    </SelectItem>
                    <SelectItem value="MEDIA" className="text-xs">
                      Média
                    </SelectItem>
                    <SelectItem value="ALTA" className="text-xs text-amber-600 font-semibold">
                      Alta
                    </SelectItem>
                    <SelectItem value="CRITICA" className="text-xs text-rose-600 font-semibold">
                      Crítica
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isSubmitting ? 'Registrando...' : 'Registrar Ação'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
