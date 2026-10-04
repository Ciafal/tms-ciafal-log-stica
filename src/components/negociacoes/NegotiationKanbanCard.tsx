import React from 'react'
import {
  NegociacaoRecord,
  formatCurrencyBRL,
  formatWeightTon,
  formatDistanceKm,
  formatDateTimeBR,
} from '@/domain/negociacoesEngine'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Bot,
  User,
  Truck,
  MapPin,
  Clock,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'

interface NegotiationKanbanCardProps {
  negotiation: NegociacaoRecord
  onOpenDetail: (neg: NegociacaoRecord) => void
  onMoveToNext?: (neg: NegociacaoRecord) => void
  onConcludeModal?: (neg: NegociacaoRecord) => void
  onTriggerSap?: (neg: NegociacaoRecord) => void
  onTakeover?: (neg: NegociacaoRecord) => void
  onHandback?: (neg: NegociacaoRecord) => void
  isProcessingSap?: boolean
}

export const NegotiationKanbanCard: React.FC<NegotiationKanbanCardProps> = ({
  negotiation,
  onOpenDetail,
  onMoveToNext,
  onConcludeModal,
  onTriggerSap,
  onTakeover,
  onHandback,
  isProcessingSap = false,
}) => {
  const dates = formatDateTimeBR(negotiation.opened_at)
  const isChicao = negotiation.responsible_type === 'CHICAO_IA'
  const isHuman = negotiation.responsible_type === 'HUMANO'
  const initialFre = negotiation.initial_freight_value || 0
  const driverCounter = negotiation.counter_value_requested
  const negotiatedFre = negotiation.negotiated_freight_value || initialFre
  const toll = negotiation.toll_value || 0
  const totalCost = negotiation.total_contracted_value || negotiatedFre + toll
  const minNoReply = negotiation.minutes_without_reply

  return (
    <Card className="bg-white border-slate-200 shadow-xs hover:shadow-md transition-all rounded-xl overflow-hidden flex flex-col justify-between group">
      <CardContent className="p-3.5 space-y-2.5">
        {/* Top Header: ID + Status SAP ou Ator */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Badge className="bg-[#005596] text-white font-mono text-[10px] font-bold px-1.5 py-0.5 shrink-0">
              {negotiation.negotiation_number}
            </Badge>
            <span className="text-xs font-black text-slate-900 font-mono truncate">
              {negotiation.cargo_id}
            </span>
          </div>

          <div className="shrink-0">
            {isChicao ? (
              <Badge
                variant="outline"
                className="bg-sky-50 text-[#005596] border-sky-200 text-[10px] font-bold px-1.5 py-0.5 gap-1"
                title="Conduzido pelo Agente Chicão (IA)"
              >
                <Bot className="w-3 h-3 text-[#005596]" />
                Chicão IA
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold px-1.5 py-0.5 gap-1"
                title="Conduzido por Atendimento Humano"
              >
                <User className="w-3 h-3 text-amber-600" />
                Humano
              </Badge>
            )}
          </div>
        </div>

        {/* Rota & Destino */}
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold truncate">
            <MapPin className="w-3.5 h-3.5 text-[#005596] shrink-0" />
            <span className="truncate">{negotiation.destination || 'Destino não informado'}</span>
            <Badge variant="secondary" className="text-[9px] px-1 py-0 font-bold">
              {negotiation.uf || 'BR'}
            </Badge>
          </div>
          <div className="text-[11px] text-slate-500 pl-5 flex items-center gap-2">
            <span>{formatDistanceKm(negotiation.distance_km)}</span>
            <span>•</span>
            <span>{negotiation.discharges_count || 1} descarga(s)</span>
            <span>•</span>
            <span>{negotiation.customers_count || 1} cliente(s)</span>
          </div>
        </div>

        {/* Motorista & Veículo */}
        <div className="bg-slate-50/90 rounded-lg p-2 border border-slate-100 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 truncate">
              {negotiation.driver_name || 'Motorista a definir'}
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
              {negotiation.vehicle_plate || 'SEM PLACA'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center justify-between truncate">
            <span className="truncate">{negotiation.carrier_name || 'Autônomo'}</span>
            <span>{formatWeightTon(negotiation.total_weight_kg)}</span>
          </div>
        </div>

        {/* Valores Comerciais Detalhados (Inicial, Solicitado pelo motorista, Negociado, Pedágio, Total) */}
        <div className="pt-1 border-t border-slate-100 space-y-1.5 text-xs">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[10px] text-slate-400 block">Valor Inicial</span>
              <span className="font-mono text-slate-600 font-semibold">
                {formatCurrencyBRL(initialFre)}
              </span>
            </div>
            {driverCounter ? (
              <div className="text-right">
                <span className="text-[10px] text-amber-700 font-bold block">
                  Solicitado Motorista
                </span>
                <span className="font-mono font-bold text-amber-800">
                  {formatCurrencyBRL(driverCounter)}
                </span>
              </div>
            ) : (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Frete Acordo</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrencyBRL(negotiatedFre)}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[10px] text-slate-400 block">Pedágio Integral</span>
              <span className="font-mono font-bold text-amber-700">{formatCurrencyBRL(toll)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Custo Total</span>
              <span className="font-mono font-black text-slate-900">
                {formatCurrencyBRL(totalCost)}
              </span>
            </div>
          </div>
        </div>

        {/* Alerta de Tempo Sem Resposta (quando houver) */}
        {minNoReply !== undefined && minNoReply > 0 && negotiation.status === 'EM_NEGOCIACAO' && (
          <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1 flex items-center justify-between text-[10px] text-amber-800">
            <span className="flex items-center gap-1 font-semibold">
              <AlertTriangle className="w-3 h-3 text-amber-600" /> Sem resposta:
            </span>
            <span className="font-bold">{minNoReply} min</span>
          </div>
        )}

        {/* Total Contratado Concluído */}
        {negotiation.status === 'CONCLUIDA' && (
          <div className="bg-emerald-50/70 p-1.5 rounded-md border border-emerald-100 flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">Total Fechado:</span>
            <span className="font-mono font-black text-emerald-800">
              {formatCurrencyBRL(totalCost)}
            </span>
          </div>
        )}

        {/* Status da Integração SAP (Itens 11 e 12) */}
        {negotiation.status === 'CONCLUIDA' && (
          <div className="pt-1.5 border-t border-slate-100 text-[11px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600">Status SAP:</span>
              {negotiation.sap_pipeline_status === 'INTEGRADO_SAP' ? (
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ✓ Integrado ao SAP
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold"
                >
                  SAP: {negotiation.sap_pipeline_status || 'Aguardando'}
                </Badge>
              )}
            </div>

            {/* Números SAP quando existirem */}
            {negotiation.sap_remessas_summary && (
              <div className="text-[10px] text-slate-500 font-mono truncate">
                Remessas: {negotiation.sap_remessas_summary}
              </div>
            )}
            {negotiation.sap_transport_number && (
              <div className="text-[10px] text-emerald-700 font-mono font-bold truncate">
                Transporte: {negotiation.sap_transport_number}
              </div>
            )}
          </div>
        )}

        {/* Informações de Tempo e Rodadas */}
        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {dates.date} {dates.time}
          </span>
          <span>{negotiation.rounds_count || 1} rodada(s)</span>
        </div>
      </CardContent>

      {/* Card Footer Actions */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenDetail(negotiation)}
          className="h-8 text-xs font-bold text-[#005596] hover:bg-sky-50 px-2"
        >
          Ver Detalhes
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>

        <div className="flex items-center gap-1">
          {negotiation.responsible_type === 'CHICAO_IA' && onTakeover && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTakeover(negotiation)}
              className="h-8 text-[10px] font-bold border-amber-300 text-amber-800 hover:bg-amber-50 px-2"
              title="Assumir negociação do Chicão (Takeover Humano)"
            >
              <User className="w-3 h-3 mr-1 text-amber-600" />
              Assumir
            </Button>
          )}

          {negotiation.responsible_type === 'HUMANO' && onHandback && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onHandback(negotiation)}
              className="h-8 text-[10px] font-bold border-sky-300 text-[#005596] hover:bg-sky-50 px-2"
              title="Devolver negociação para o Chicão IA"
            >
              <Bot className="w-3 h-3 mr-1 text-[#005596]" />
              Devolver
            </Button>
          )}

          {negotiation.status === 'ABERTO' && onMoveToNext && (
            <Button
              size="sm"
              onClick={() => onMoveToNext(negotiation)}
              className="h-8 text-xs font-bold bg-[#005596] hover:bg-[#004275] text-white px-2.5"
            >
              Iniciar Negociação
            </Button>
          )}

          {negotiation.status === 'EM_NEGOCIACAO' && onConcludeModal && (
            <Button
              size="sm"
              onClick={() => onConcludeModal(negotiation)}
              className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5"
            >
              Concluir
            </Button>
          )}

          {negotiation.status === 'CONCLUIDA' && onTriggerSap && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTriggerSap(negotiation)}
              disabled={isProcessingSap}
              className="h-8 text-[11px] font-bold border-slate-300 hover:bg-white text-slate-700 px-2 gap-1"
              title="Executar ou Reprocessar Pipeline SAP"
            >
              <RotateCcw className={`w-3 h-3 ${isProcessingSap ? 'animate-spin' : ''}`} />
              SAP
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
