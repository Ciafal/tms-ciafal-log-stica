import React, { useState } from 'react'
import {
  NegociacaoRecord,
  validateNegotiationForCompletion,
  formatCurrencyBRL,
} from '@/domain/negociacoesEngine'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle, AlertCircle, ShieldCheck } from 'lucide-react'

interface NegotiationConcludeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  negotiation: NegociacaoRecord | null
  onConfirm: (
    negotiationId: string,
    acceptedBy: string,
    acceptanceAt: string,
    completionNotes: string,
  ) => Promise<void>
  isSubmitting?: boolean
}

export const NegotiationConcludeModal: React.FC<NegotiationConcludeModalProps> = ({
  open,
  onOpenChange,
  negotiation,
  onConfirm,
  isSubmitting = false,
}) => {
  const [acceptedBy, setAcceptedBy] = useState(
    negotiation ? negotiation.accepted_by || negotiation.driver_name || '' : '',
  )
  const [acceptanceAt, setAcceptanceAt] = useState(
    negotiation && negotiation.acceptance_at
      ? new Date(negotiation.acceptance_at).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
  )
  const [completionNotes, setCompletionNotes] = useState(
    negotiation ? negotiation.completion_notes || '' : '',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!negotiation) return null

  const validation = validateNegotiationForCompletion(negotiation)

  const handleConclude = async () => {
    if (!validation.isValid) {
      setErrorMessage(
        'Não foi possível concluir a negociação. Existem informações obrigatórias pendentes.',
      )
      return
    }
    if (!acceptedBy.trim()) {
      setErrorMessage('Por favor, informe quem realizou o aceite formal.')
      return
    }

    try {
      setErrorMessage(null)
      await onConfirm(
        negotiation.id,
        acceptedBy,
        new Date(acceptanceAt).toISOString(),
        completionNotes,
      )
      onOpenChange(false)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao concluir negociação.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#005596] text-white font-mono text-xs">
              {negotiation.negotiation_number}
            </Badge>
            <DialogTitle className="text-base font-black text-slate-900">
              Concluir Negociação Comercial
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Validação estrita de requisitos para avanço à coluna Concluídas e disparo do pipeline
            SAP.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo da Validação Obrigatória (Item 6) */}
        {!validation.isValid ? (
          <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-900 py-3">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <AlertTitle className="text-xs font-bold">
              Não foi possível concluir a negociação. Existem informações obrigatórias pendentes:
            </AlertTitle>
            <AlertDescription className="text-[11px] mt-1 space-y-1">
              <ul className="list-disc pl-4 space-y-0.5 font-medium">
                {validation.pendingFields.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <p className="text-[10px] text-rose-700 pt-1">
                A negociação não pode avançar para Concluídas sem atender todos os critérios do
                processo.
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Todos os dados obrigatórios da carga, parceiro e valores foram validados com êxito.
            </span>
          </div>
        )}

        {errorMessage && (
          <Alert variant="destructive" className="text-xs py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Resumo Comercial */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-400 block text-[10px]">Carga:</span>
              <strong className="text-slate-900 font-mono">{negotiation.cargo_id}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Motorista:</span>
              <strong className="text-slate-900">{negotiation.driver_name || '---'}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Veículo & Placa:</span>
              <span className="text-slate-800">
                {negotiation.vehicle_type || '---'} • {negotiation.vehicle_plate || '---'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Itinerário SAP:</span>
              <span className="text-slate-800">{negotiation.itinerary_code || '---'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Frete Negociado:</span>
              <strong className="text-[#005596] font-mono">
                {formatCurrencyBRL(negotiation.negotiated_freight_value)}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Pedágio Integral:</span>
              <strong className="text-amber-700 font-mono">
                {formatCurrencyBRL(negotiation.toll_value)}
              </strong>
            </div>
          </div>
        </div>

        {/* Formulário de Aceite Formal */}
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <Label htmlFor="acceptedBy" className="text-xs font-bold text-slate-700">
              Aceite Formal Realizado por: *
            </Label>
            <Input
              id="acceptedBy"
              value={acceptedBy}
              onChange={(e) => setAcceptedBy(e.target.value)}
              placeholder="Nome do motorista ou transportadora..."
              className="text-xs h-9 bg-white"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="acceptanceAt" className="text-xs font-bold text-slate-700">
              Data e Hora do Aceite: *
            </Label>
            <Input
              id="acceptanceAt"
              type="datetime-local"
              value={acceptanceAt}
              onChange={(e) => setAcceptanceAt(e.target.value)}
              className="text-xs h-9 bg-white"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="completionNotes" className="text-xs font-bold text-slate-700">
              Notas e Justificativa de Fechamento (Opcional):
            </Label>
            <Textarea
              id="completionNotes"
              rows={2}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Registrar condições operacionais ou acordos complementares..."
              className="text-xs bg-white"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConclude}
            disabled={!validation.isValid || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Validando...' : 'Confirmar Conclusão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
