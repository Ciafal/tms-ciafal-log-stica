/**
 * SendCommercialProposalModal.tsx
 *
 * Popup de confirmação do botão "Enviar Comercial"
 *
 * Atende aos requisitos prescritivos 6, 7 e 13:
 * - Não envia imediatamente. Abre popup "Oportunidade de Complemento de Carga"
 * - Exibe dados do cabeçalho: Cliente, Representante, Itinerário, Saída prevista, Veículo, Carga atual, Complemento disponível
 * - Tabela "Produto sugerido": Código SAP | Produto | Estoque | Quantidade sugerida (seleção de um ou mais produtos)
 * - Mensagem gerada pela IA EDITÁVEL antes do envio (com botões: Editar mensagem, Cancelar, Confirmar envio)
 * - Se houver impedimento de crédito ou restrição, exibe expressamente:
 *   "Oportunidade comercial identificada, condicionada à regularização/liberação financeira."
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Send,
  Sparkles,
  AlertTriangle,
  Building,
  UserCheck,
  Calendar,
  Truck,
  Layers,
  Edit3,
  Check,
  RotateCcw,
} from 'lucide-react'
import { LoadComplementOpportunityEntity } from '@/domain/rules'
import {
  CommercialSuggestedProduct,
  CommercialAiEvaluationResult,
} from '@/domain/commercialComplementEngine'
import { formatDate } from '@/lib/utils'

interface SendCommercialProposalModalProps {
  isOpen: boolean
  onClose: () => void
  opportunity: LoadComplementOpportunityEntity | null
  aiEvaluation: CommercialAiEvaluationResult | null
  onConfirmSend: (selectedProducts: CommercialSuggestedProduct[], message: string) => Promise<void>
  isSending: boolean
}

export const SendCommercialProposalModal: React.FC<SendCommercialProposalModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  aiEvaluation,
  onConfirmSend,
  isSending,
}) => {
  const [selectedProductCodes, setSelectedProductCodes] = useState<string[]>([])
  const [editableMessage, setEditableMessage] = useState('')
  const [isEditingMessage, setIsEditingMessage] = useState(false)

  // Sincronizar estado inicial com base na avaliação da IA
  useEffect(() => {
    if (aiEvaluation) {
      setEditableMessage(aiEvaluation.defaultMessage || '')
      const initialCodes = aiEvaluation.suggestedProducts.map((p) => p.code)
      setSelectedProductCodes(initialCodes)
      setIsEditingMessage(false)
    }
  }, [aiEvaluation, isOpen])

  if (!opportunity || !aiEvaluation) return null

  const targetRep =
    opportunity.commercial_representative ||
    opportunity.salesperson_id ||
    'Representante Comercial CIAFAL'

  const dispatchDate = opportunity.planned_dispatch_date
    ? formatDate(opportunity.planned_dispatch_date)
    : 'A definir'

  const currentWeightTons = ((opportunity.current_weight_kg || 0) / 1000).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  const residualWeightTons = ((opportunity.missing_weight_kg || 0) / 1000).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  const handleToggleProduct = (code: string) => {
    setSelectedProductCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    )
  }

  const selectedProducts = aiEvaluation.suggestedProducts.filter((p) =>
    selectedProductCodes.includes(p.code),
  )

  const handleConfirm = () => {
    if (selectedProducts.length === 0) return
    onConfirmSend(selectedProducts, editableMessage)
  }

  const handleResetMessage = () => {
    setEditableMessage(aiEvaluation.defaultMessage)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSending && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-[#005596] flex items-center gap-2">
              <Send className="w-5 h-5 text-[#005596]" />
              Oportunidade de Complemento de Carga
            </DialogTitle>
            <Badge
              variant="outline"
              className="font-mono text-[11px] text-[#005596] border-[#005596]/40"
            >
              {opportunity.opportunity_code}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Geração de solicitação comercial contextualizada e direcionada ao representante
            responsável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* REQUISITO 13: ALERTA DE REGRA IMPEDITIVA / CONDICIONAMENTO FINANCEIRO */}
          {aiEvaluation.isConditionalOnFinance && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-xs font-semibold">
                  Condição Comercial Especial:
                </strong>
                <p className="text-[11px]">
                  {aiEvaluation.financialNotice ||
                    'Oportunidade comercial identificada, condicionada à regularização/liberação financeira.'}
                </p>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 mt-1 block">
                  Regra Impeditiva: Crédito pendente no SAP. O envio alerta o vendedor mas mantém o
                  bloqueio de liberação automática.
                </span>
              </div>
            </div>
          )}

          {/* REQUISITO 6: CABEÇALHO COM DADOS DA CARGA & CLIENTE */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">Cliente:</span>
                <strong
                  className="text-slate-900 dark:text-slate-100 block truncate"
                  title={opportunity.customer_name}
                >
                  {opportunity.customer_name || 'Não localizado'}
                </strong>
                <span className="text-[10px] text-slate-500 font-mono">
                  SAP:{' '}
                  {opportunity.customer_sap_code || opportunity.customer_id || 'Não localizado'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">Representante:</span>
                <strong
                  className="text-slate-900 dark:text-slate-100 block truncate"
                  title={targetRep}
                >
                  {targetRep}
                </strong>
                <span className="text-[10px] text-slate-500">
                  {opportunity.destination_city || 'Destino'}/{opportunity.destination_uf || 'BR'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">
                  Itinerário / Saída Prevista:
                </span>
                <strong className="text-slate-900 dark:text-slate-100 font-mono block">
                  {opportunity.itinerary_id || 'Não localizado'}
                </strong>
                <span className="text-[10px] text-slate-600 dark:text-slate-400">
                  {dispatchDate}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">Veículo Programado:</span>
                <strong className="text-slate-900 dark:text-slate-100 block truncate">
                  {opportunity.vehicle_type || 'Carreta'}
                </strong>
                <span className="text-[10px] font-mono text-slate-500">
                  Placa: {opportunity.vehicle_plate || 'PROGRAMADO'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 pt-2.5 mt-2.5 border-t border-slate-200 dark:border-slate-700 text-[11px]">
              <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded border">
                <span className="text-slate-600 dark:text-slate-400">Carga Atual:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono">
                  {currentWeightTons} t ({opportunity.current_occupancy_pct || 0} %)
                </strong>
              </div>

              <div className="flex items-center justify-between p-2 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded">
                <span className="text-amber-800 dark:text-amber-300 font-medium">
                  Complemento Disponível:
                </span>
                <strong className="text-amber-700 dark:text-amber-400 font-mono font-black text-xs">
                  {residualWeightTons} t
                </strong>
              </div>
            </div>
          </div>

          {/* REQUISITO 6: TABELA "PRODUTO SUGERIDO" */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                <Layers className="w-4 h-4 text-[#005596]" />
                Produtos Sugeridos pelo Motor de IA:
              </span>
              <span className="text-[10px] text-slate-500">
                Selecione os produtos aplicáveis para o complemento
              </span>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b text-[10px] uppercase font-semibold text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="p-2.5 w-10 text-center">Sel.</th>
                    <th className="p-2.5">Código SAP</th>
                    <th className="p-2.5">Produto</th>
                    <th className="p-2.5 text-right">Estoque</th>
                    <th className="p-2.5 text-right">Quantidade sugerida</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[11px]">
                  {aiEvaluation.suggestedProducts.map((prod) => {
                    const isSelected = selectedProductCodes.includes(prod.code)
                    return (
                      <tr
                        key={prod.code}
                        onClick={() => handleToggleProduct(prod.code)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/60 dark:bg-blue-950/30'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleProduct(prod.code)}
                            className="rounded border-slate-300 text-[#005596] focus:ring-[#005596] cursor-pointer"
                          />
                        </td>
                        <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                          {prod.code}
                        </td>
                        <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {prod.name}
                        </td>
                        <td className="p-2.5 text-right font-mono text-blue-700 dark:text-blue-400 font-bold">
                          {prod.stockAvailableTons.toLocaleString('pt-BR', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}{' '}
                          t
                        </td>
                        <td className="p-2.5 text-right font-mono text-amber-700 dark:text-amber-400 font-bold">
                          {prod.suggestedQtyTons.toLocaleString('pt-BR', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}{' '}
                          t
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* REQUISITO 7: MENSAGEM SUGERIDA PELA IA (EDITÁVEL) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#005596] flex items-center gap-1.5 text-xs">
                <Sparkles className="w-4 h-4 text-[#005596]" />
                Mensagem Sugerida pela IA (Contextualizada)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetMessage}
                  className="h-7 text-[10px] text-slate-500 hover:text-slate-700"
                  title="Restaurar texto original da IA"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Restaurar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingMessage(!isEditingMessage)}
                  className="h-7 text-[10px] border-[#005596]/30 text-[#005596]"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  {isEditingMessage ? 'Concluir edição' : 'Editar mensagem'}
                </Button>
              </div>
            </div>

            {isEditingMessage ? (
              <Textarea
                value={editableMessage}
                onChange={(e) => setEditableMessage(e.target.value)}
                rows={7}
                className="text-xs font-sans leading-relaxed border-[#005596]/40 focus:border-[#005596]"
                placeholder="Edite a mensagem antes de enviar ao representante comercial..."
              />
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border rounded-lg whitespace-pre-wrap text-slate-800 dark:text-slate-200 text-xs leading-relaxed font-sans">
                {editableMessage}
              </div>
            )}

            <div className="text-[10px] text-slate-500 italic">
              * A mensagem será transmitida internamente no HUB CIAFAL ao representante responsável
              com link direto de atendimento.
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSending}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isSending || selectedProducts.length === 0}
            className="bg-[#005596] hover:bg-[#004478] text-white text-xs font-semibold shadow-sm"
          >
            {isSending ? (
              'Enviando...'
            ) : (
              <>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Confirmar envio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
