/**
 * CommercialFeedbackModal.tsx
 *
 * Popup para registro do Retorno do Representante Comercial
 *
 * Requisito 10:
 * - "Cliente interessado": material, quantidade, observação, condição negociada quando aplicável
 * - "Cliente sem interesse": com motivo OBRIGATÓRIO dentre:
 *   - sem necessidade
 *   - preço
 *   - prazo
 *   - estoque próprio
 *   - não conseguiu contato
 *   - material não atende
 *   - outro (com observação OBRIGATÓRIA quando "Outro")
 *
 * Transições de status:
 * - Interessado -> "Cliente interessado" (podendo evoluir para "Complemento confirmado")
 * - Sem interesse -> "Cliente sem interesse"
 */

import React, { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ThumbsUp, ThumbsDown, Building, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { LoadComplementOpportunityEntity, CommercialRejectionReason } from '@/domain/rules'
import { CommercialComplementEngine } from '@/domain/commercialComplementEngine'
import { useToast } from '@/hooks/use-toast'

interface CommercialFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  opportunity: LoadComplementOpportunityEntity | null
  onSuccess: () => void
  userRole?: string
  userName?: string
  userEmail?: string
}

export const CommercialFeedbackModal: React.FC<CommercialFeedbackModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  onSuccess,
  userRole = 'comercial',
  userName = 'Representante Comercial',
  userEmail = 'comercial@ciafal.com.br',
}) => {
  const { toast } = useToast()

  const [decision, setDecision] = useState<'INTERESTED' | 'NOT_INTERESTED'>('INTERESTED')
  const [materialConfirmed, setMaterialConfirmed] = useState('')
  const [confirmedQtyTons, setConfirmedQtyTons] = useState<number | ''>('')
  const [negotiatedCondition, setNegotiatedCondition] = useState('')
  const [rejectionReason, setRejectionReason] =
    useState<CommercialRejectionReason>('sem necessidade')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Resetar ao abrir
  React.useEffect(() => {
    if (opportunity && isOpen) {
      setDecision('INTERESTED')
      setMaterialConfirmed(
        opportunity.material_description || opportunity.material_id || 'Fio Máquina CA-60 5.0mm',
      )
      setConfirmedQtyTons(
        opportunity.missing_weight_kg
          ? Number((opportunity.missing_weight_kg / 1000).toFixed(1))
          : 8.0,
      )
      setNegotiatedCondition('Preço padrão de tabela à vista / 30 DDL')
      setRejectionReason('sem necessidade')
      setNotes('')
    }
  }, [opportunity, isOpen])

  if (!opportunity) return null

  const handleSubmit = async () => {
    if (decision === 'NOT_INTERESTED') {
      if (rejectionReason === 'outro' && !notes.trim()) {
        toast({
          title: 'Observação obrigatória',
          description: 'Por favor, detalhe o motivo em observações ao selecionar "Outro".',
          variant: 'destructive',
        })
        return
      }
    } else {
      if (!materialConfirmed.trim()) {
        toast({
          title: 'Material obrigatório',
          description: 'Informe o material confirmado pelo cliente.',
          variant: 'destructive',
        })
        return
      }
    }

    setIsSubmitting(true)
    try {
      const confirmedKg =
        decision === 'INTERESTED' && typeof confirmedQtyTons === 'number'
          ? confirmedQtyTons * 1000
          : undefined

      const res = await CommercialComplementEngine.recordCommercialResponse({
        opportunity,
        isInterested: decision === 'INTERESTED',
        materialConfirmed: decision === 'INTERESTED' ? materialConfirmed : undefined,
        confirmedQtyKg: confirmedKg,
        notes,
        negotiatedCondition: decision === 'INTERESTED' ? negotiatedCondition : undefined,
        rejectionReason: decision === 'NOT_INTERESTED' ? rejectionReason : undefined,
        responderName: userName,
        responderEmail: userEmail,
        responderRole: userRole,
      })

      if (res.success) {
        toast({
          title: 'Retorno Comercial Registrado',
          description: res.message,
        })
        onSuccess()
        onClose()
      } else {
        toast({
          title: 'Erro ao registrar retorno',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Falha na comunicação',
        description: err?.message || 'Erro inesperado ao registrar resposta.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-[#005596]">
              Retorno Comercial do Representante
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-[11px]">
              {opportunity.opportunity_code}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Registre o resultado do contato realizado com o cliente para a oportunidade de
            complemento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* IDENTIFICAÇÃO RÁPIDA */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded border text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {opportunity.customer_name} ({opportunity.customer_sap_code || 'SAP'})
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Itinerário / Destino:</span>
              <span>
                {opportunity.itinerary_id} • {opportunity.destination_city || 'Destino'}/
                {opportunity.destination_uf || 'BR'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Capacidade Residual Carga:</span>
              <strong className="text-amber-700">
                {((opportunity.missing_weight_kg || 0) / 1000).toFixed(1)} t
              </strong>
            </div>
          </div>

          {/* ESCOLHA DO RETORNO: INTERESSADO VS SEM INTERESSE */}
          <div>
            <label className="font-semibold block mb-2 text-slate-700 dark:text-slate-300">
              Parecer Comercial do Cliente:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision('INTERESTED')}
                className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition-all ${
                  decision === 'INTERESTED'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-600'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    decision === 'INTERESTED'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-xs">Cliente Interessado</strong>
                  <span className="text-[10px] text-slate-500">Aceitou complementar a carga</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDecision('NOT_INTERESTED')}
                className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition-all ${
                  decision === 'NOT_INTERESTED'
                    ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-600'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    decision === 'NOT_INTERESTED'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-xs">Cliente Sem Interesse</strong>
                  <span className="text-[10px] text-slate-500">Declinar oportunidade</span>
                </div>
              </button>
            </div>
          </div>

          {/* CAMPOS PARA CLIENTE INTERESSADO */}
          {decision === 'INTERESTED' ? (
            <div className="space-y-3 p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Material Confirmado pelo Cliente:
                </label>
                <Input
                  value={materialConfirmed}
                  onChange={(e) => setMaterialConfirmed(e.target.value)}
                  placeholder="Ex: Fio Máquina CA-60 5.0mm"
                  className="text-xs bg-white dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Quantidade Fechada (t):
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={confirmedQtyTons}
                    onChange={(e) =>
                      setConfirmedQtyTons(e.target.value ? parseFloat(e.target.value) : '')
                    }
                    className="text-xs bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Condição Negociada:
                  </label>
                  <Input
                    value={negotiatedCondition}
                    onChange={(e) => setNegotiatedCondition(e.target.value)}
                    placeholder="Ex: Tabela regular / 30 DDL"
                    className="text-xs bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Observações da Negociação (opcional):
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Cliente aguardando formalização do pedido no SAP ECC para expedição..."
                  rows={2}
                  className="text-xs bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          ) : (
            /* CAMPOS PARA CLIENTE SEM INTERESSE (REQUISITO 10: MOTIVOS OBRIGATÓRIOS) */
            <div className="space-y-3 p-3 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg">
              <div>
                <label className="text-[11px] font-semibold text-rose-900 dark:text-rose-200 block mb-1">
                  Motivo da Recusa (Obrigatório):
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value as CommercialRejectionReason)}
                  className="w-full h-9 border rounded p-2 text-xs bg-white dark:bg-slate-900 border-slate-300"
                >
                  <option value="sem necessidade">Sem necessidade</option>
                  <option value="preço">Preço</option>
                  <option value="prazo">Prazo</option>
                  <option value="estoque próprio">Estoque próprio</option>
                  <option value="não conseguiu contato">Não conseguiu contato</option>
                  <option value="material não atende">Material não atende</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Observações{' '}
                  {rejectionReason === 'outro' ? '(Obrigatória para "Outro")' : '(Opcional)'}:
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    rejectionReason === 'outro'
                      ? 'Descreva obrigatoriamente a justificativa apresentada pelo cliente...'
                      : 'Detalhes adicionais sobre o retorno do cliente...'
                  }
                  rows={3}
                  className={`text-xs bg-white dark:bg-slate-900 ${
                    rejectionReason === 'outro' && !notes.trim()
                      ? 'border-rose-400 focus:border-rose-500'
                      : ''
                  }`}
                />
              </div>

              <div className="text-[10px] text-slate-500 italic">
                * O motivo registrado alimentará o aprendizado do motor de IA para calibrar futuras
                sugestões neste itinerário e cliente.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`text-xs font-semibold text-white ${
              decision === 'INTERESTED'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isSubmitting ? 'Registrando...' : 'Salvar Retorno Comercial'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
