import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  STANDARDIZED_EDIT_REASONS,
  StandardizedEditReason,
  FieldComparison,
} from '@/domain/transportEditEngine'
import { AlertCircle, CheckCircle, ShieldAlert, ArrowRight, Save, X } from 'lucide-react'

interface TransportChangeConfirmationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  changes: FieldComparison[]
  selectedReason: StandardizedEditReason | ''
  setSelectedReason: (reason: StandardizedEditReason) => void
  customReasonDesc: string
  setCustomReasonDesc: (desc: string) => void
  justification: string
  setJustification: (just: string) => void
  isSubmitting: boolean
  requiresApproval?: boolean
  approvalReasons?: string[]
}

export const TransportChangeConfirmationModal: React.FC<TransportChangeConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  changes,
  selectedReason,
  setSelectedReason,
  customReasonDesc,
  setCustomReasonDesc,
  justification,
  setJustification,
  isSubmitting,
  requiresApproval,
  approvalReasons = [],
}) => {
  const isReasonOther = selectedReason === 'Outro'
  const isCustomReasonValid = !isReasonOther || customReasonDesc.trim().length >= 5
  const isJustificationValid = justification.trim().length >= 10
  const canConfirm =
    !!selectedReason && isCustomReasonValid && isJustificationValid && !isSubmitting

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2 text-primary font-bold">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <DialogTitle className="text-xl">Confirmação de alteração do transporte</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Conforme a política de governança da CIAFAL Logística e integração SAP, toda alteração
            requer motivo padronizado, justificativa auditável e validação prévia dos dados
            alterados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {requiresApproval && (
            <Alert className="bg-amber-50 border-amber-300 text-amber-900">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="font-semibold text-amber-900">
                Atenção: Alteração Crítica Detectada
              </AlertTitle>
              <AlertDescription className="text-xs text-amber-800 mt-1">
                Esta alteração envolve parâmetros sensíveis e entrará com status{' '}
                <strong>Pendente de aprovação</strong>:
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {approvalReasons.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* TABELA DE COMPARAÇÃO ANTES / DEPOIS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-800">
                Dados alterados ({changes.length})
              </h4>
              <span className="text-xs text-muted-foreground">
                Comparação detalhada antes da gravação
              </span>
            </div>

            <div className="border rounded-md overflow-hidden bg-white shadow-xs max-h-56 overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-1/3 text-xs font-semibold">Campo</TableHead>
                    <TableHead className="w-1/3 text-xs font-semibold text-rose-700">
                      Valor anterior
                    </TableHead>
                    <TableHead className="w-1/3 text-xs font-semibold text-emerald-700">
                      Novo valor
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changes.map((c, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-medium py-2">
                        {c.field_label}
                        {c.is_critical && (
                          <span className="ml-1 text-[10px] bg-rose-100 text-rose-800 px-1 py-0.5 rounded font-bold">
                            Crítico
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 font-mono py-2 bg-rose-50/30">
                        {String(c.old_value || '—')}
                      </TableCell>
                      <TableCell className="text-xs text-gray-900 font-semibold font-mono py-2 bg-emerald-50/40">
                        <div className="flex items-center gap-1">
                          <ArrowRight className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>{String(c.new_value || '—')}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* MOTIVO OBRIGATÓRIO (LISTA PADRONIZADA EXATA) */}
          <div className="space-y-2 bg-muted/20 p-3 rounded-lg border">
            <Label
              htmlFor="reason-select"
              className="text-xs font-bold text-gray-800 flex items-center justify-between"
            >
              <span>Motivo da alteração *</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                Lista padronizada oficial
              </span>
            </Label>
            <Select
              value={selectedReason}
              onValueChange={(val) => setSelectedReason(val as StandardizedEditReason)}
            >
              <SelectTrigger id="reason-select" className="w-full bg-white text-xs">
                <SelectValue placeholder="Selecione o motivo oficial da alteração..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {STANDARDIZED_EDIT_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason} className="text-xs">
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isReasonOther && (
              <div className="mt-2 space-y-1">
                <Label htmlFor="custom-reason" className="text-xs font-semibold text-rose-700">
                  Descrição detalhada para motivo "Outro" * (mínimo 5 caracteres)
                </Label>
                <Input
                  id="custom-reason"
                  placeholder="Especifique detalhadamente a razão não contemplada na lista padrão..."
                  value={customReasonDesc}
                  onChange={(e) => setCustomReasonDesc(e.target.value)}
                  className="bg-white text-xs"
                />
              </div>
            )}
          </div>

          {/* JUSTIFICATIVA OBRIGATÓRIA (MÍNIMO 10 CARACTERES) */}
          <div className="space-y-2 bg-muted/20 p-3 rounded-lg border">
            <div className="flex items-center justify-between">
              <Label htmlFor="justification-text" className="text-xs font-bold text-gray-800">
                Justificativa detalhada da alteração *
              </Label>
              <span
                className={`text-[11px] font-medium ${
                  justification.trim().length >= 10 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {justification.trim().length} / 10 caracteres mínimos
              </span>
            </div>
            <Textarea
              id="justification-text"
              rows={3}
              placeholder="Explique tecnicamente o motivo desta alteração no transporte (ex: reprogramação solicitada pelo cliente devido a atraso na obra)..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="bg-white text-xs resize-none"
            />
            {justification.trim().length > 0 && justification.trim().length < 10 && (
              <p className="text-[11px] text-rose-600">
                A justificativa ainda é muito curta. Digite pelo menos 10 caracteres explicativos.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando alteração...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Save className="h-3.5 w-3.5" />
                Confirmar alteração
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
