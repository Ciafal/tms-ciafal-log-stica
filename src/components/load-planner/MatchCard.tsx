import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Truck,
  User,
  Clock,
  MapPin,
  Package,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  FileText,
  DollarSign,
  BookmarkCheck,
  Bot,
} from 'lucide-react'
import type { VehicleLoadMatch } from '@/domain/vehicleLoadMatchingEngine'

interface MatchCardProps {
  match: VehicleLoadMatch
  isSelected?: boolean
  onToggleSelect?: (matchId: string) => void
  onViewComposition: (match: VehicleLoadMatch) => void
  onSimulate: (match: VehicleLoadMatch) => void
  onReserveVehicle: (match: VehicleLoadMatch) => void
  onSendToFreightDesk: (match: VehicleLoadMatch) => void
  onCallAiExplain: (match: VehicleLoadMatch) => void
  onSendSingleToChicao?: (match: VehicleLoadMatch) => void
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  isSelected = false,
  onToggleSelect,
  onViewComposition,
  onSimulate,
  onReserveVehicle,
  onSendToFreightDesk,
  onCallAiExplain,
  onSendSingleToChicao,
}) => {
  const {
    matchId,
    candidateLoad,
    vehiclePlate,
    vehicleType,
    vehicleCapacityKg,
    driverName,
    driverQueueGroup,
    waitingMinutes,
    driverPreferredItinerary,
    driverPreferredItineraryName,
    occupancyPct,
    balanceKg,
    distanceKm,
    anttFloorValue,
    tollCost,
    totalSuggestedFreight,
    costPerTon,
    score,
    checks,
    isOpportunity,
  } = match

  // Estilos do badge de grupo de fila
  const groupBadgeClass =
    driverQueueGroup === 'PORTA'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : driverQueueGroup === 'FORA'
        ? 'bg-blue-100 text-blue-800 border-blue-300'
        : 'bg-purple-100 text-purple-800 border-purple-300'

  // Formatação de moeda
  const fmtBrl = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <Card
      className={`border transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'ring-2 ring-[#005596] border-[#005596] bg-blue-50/25'
          : isOpportunity
            ? 'border-emerald-500/80 bg-emerald-50/20'
            : 'border-slate-200 bg-white hover:border-blue-300'
      }`}
    >
      <CardContent className="p-4 sm:p-5">
        {/* Banner de Oportunidade Verde se preencher os critérios */}
        {isOpportunity && (
          <div className="mb-3 flex items-center justify-between rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span>OPORTUNIDADE DE CARGA — ALTA PRIORIDADE OPERACIONAL</span>
            </div>
            <span className="text-[11px] font-mono opacity-90">
              Ocupação ≥95% + PORTA {waitingMinutes}min
            </span>
          </div>
        )}

        {/* Topo do Card: Checkbox + Identificador do Match + Score */}
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            {onToggleSelect && (
              <input
                type="checkbox"
                aria-label={`Selecionar encontro ${matchId}`}
                checked={isSelected}
                onChange={() => onToggleSelect(matchId)}
                className="h-4 w-4 rounded border-slate-300 text-[#005596] focus:ring-[#005596] cursor-pointer"
              />
            )}
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-800 border-blue-200 font-mono font-bold text-xs"
            >
              {matchId}
            </Badge>
            {match.offerCode && (
              <Badge className="bg-[#005596] text-white text-[10px] font-mono font-bold px-1.5 py-0.5">
                {match.offerCode}
              </Badge>
            )}
            {match.offerStatus && (
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold ${
                  match.offerStatus === 'ACEITA'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : match.offerStatus === 'ERRO_ENVIO'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : match.offerStatus === 'RECUSADA'
                        ? 'bg-slate-100 text-slate-600 border-slate-300'
                        : 'bg-blue-50 text-[#005596] border-blue-300'
                }`}
              >
                {match.offerStatus}
              </Badge>
            )}
            <h3 className="font-bold text-slate-900 text-base tracking-tight">
              {candidateLoad.title}
            </h3>
            <Badge variant="secondary" className="text-xs font-medium">
              Rota {candidateLoad.itineraryCode}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Score Multicritério
              </span>
              <div className="flex items-center gap-1 justify-end">
                <span
                  className={`text-xl font-black font-mono ${
                    score.totalScore >= 80
                      ? 'text-emerald-600'
                      : score.totalScore >= 60
                        ? 'text-blue-600'
                        : 'text-amber-600'
                  }`}
                >
                  {score.totalScore}%
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onCallAiExplain(match)}
              className="h-8 px-2.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center gap-1"
              title="Solicitar Análise de IA para esta combinação"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>IA</span>
            </Button>
          </div>
        </div>

        {/* Grid Principal: Veículo/Motorista vs Carga/Logística */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3">
          {/* Coluna 1: Veículo e Motorista na Fila */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                <Truck className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="font-mono">{vehiclePlate}</span>
                <span className="text-slate-400 font-normal">•</span>
                <span className="text-slate-600 font-medium text-xs truncate max-w-[140px]">
                  {vehicleType}
                </span>
              </div>
              <Badge variant="outline" className={`font-semibold text-[11px] ${groupBadgeClass}`}>
                {driverQueueGroup}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-800 truncate">{driverName}</span>
                {match.driverPhone && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({match.driverPhone})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>{waitingMinutes} min na fila</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
              <span className="text-slate-500">Capacidade Veículo:</span>
              <span className="font-bold text-slate-800 font-mono">
                {(vehicleCapacityKg / 1000).toFixed(1)} t
              </span>
            </div>

            {driverPreferredItinerary && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Itinerário Preferencial:</span>
                <span
                  className="font-semibold text-blue-700 truncate max-w-[140px]"
                  title={driverPreferredItineraryName || driverPreferredItinerary}
                >
                  {driverPreferredItinerary}
                </span>
              </div>
            )}
          </div>

          {/* Coluna 2: Carga Proposta, Ocupação e Itinerário */}
          <div className="space-y-2 text-xs md:border-l md:pl-4 border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Package className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{(candidateLoad.totalWeightKg / 1000).toFixed(2)} t propostas</span>
              </div>
              <span className="text-slate-500 text-[11px]">
                {candidateLoad.dischargesCount} descarga(s) • {candidateLoad.customersCount}{' '}
                cliente(s)
              </span>
            </div>

            {/* Barra de Ocupação */}
            <div>
              <div className="flex justify-between items-center mb-1 text-[11px]">
                <span className="text-slate-500">Ocupação do Veículo</span>
                <span className="font-bold font-mono text-slate-800">{occupancyPct}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    occupancyPct >= 95
                      ? 'bg-emerald-500'
                      : occupancyPct >= 80
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, occupancyPct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Distância: {distanceKm} km</span>
                <span>Saldo livre: {(balanceKg / 1000).toFixed(1)} t</span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-600 pt-0.5">
              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
              <span className="truncate">
                Destino Polo: {candidateLoad.destinationCity} / {candidateLoad.destinationUf}
              </span>
            </div>
          </div>
        </div>

        {/* Linha de Custos Econômicos: Frete ANTT, Pedágio e R$/t */}
        <div className="my-2.5 rounded-lg bg-slate-50 p-2.5 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] uppercase text-slate-500 block font-semibold">
                Piso Mínimo ANTT
              </span>
              <span className="font-mono font-bold text-slate-800">{fmtBrl(anttFloorValue)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 block font-semibold">
                Pedágio Regulado
              </span>
              <span className="font-mono font-semibold text-slate-700">{fmtBrl(tollCost)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 block font-semibold">
                Frete Sugerido Total
              </span>
              <span className="font-mono font-extrabold text-blue-900 text-sm">
                {fmtBrl(totalSuggestedFreight)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-white border-slate-300 font-mono text-[11px] text-slate-700"
            >
              R$ {costPerTon.toFixed(2)} / t
            </Badge>
          </div>
        </div>

        {/* Barra de Checks de Validação Determinística */}
        <div className="flex flex-wrap items-center gap-2 py-2 border-t border-slate-100 text-[11px]">
          <span className="text-slate-400 font-semibold mr-1">Checks:</span>

          <TooltipProvider>
            {/* Estoque */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 cursor-help">
                  {checks.stock ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  )}
                  <span>Estoque</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {checks.stock
                  ? 'Estoque físico DP34 confirmado'
                  : 'Sem saldo suficiente de estoque'}
              </TooltipContent>
            </Tooltip>

            {/* Crédito */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 cursor-help">
                  {checks.credit ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  )}
                  <span>Crédito</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {checks.credit
                  ? 'Crédito financeiro liberado no SAP'
                  : 'Crédito bloqueado no financeiro'}
              </TooltipContent>
            </Tooltip>

            {/* PCP */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 cursor-help">
                  {checks.pcp ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  )}
                  <span>PCP</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {checks.pcp
                  ? 'Lotes PCP programados ou prontos'
                  : 'Pendência na programação industrial'}
              </TooltipContent>
            </Tooltip>

            {/* Veículo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 cursor-help">
                  {checks.vehicleCapacity ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  )}
                  <span>Capacidade</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {checks.vehicleCapacity
                  ? 'Peso compatível com a capacidade técnica'
                  : 'Excede limite técnico'}
              </TooltipContent>
            </Tooltip>

            {/* Descarga */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 cursor-help">
                  {checks.dischargeCompatibility ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  )}
                  <span>Descarga</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {checks.dischargeCompatibility
                  ? 'Tipo de descarga compatível com a carroceria'
                  : 'Incompatível com método de descarga'}
              </TooltipContent>
            </Tooltip>

            {/* Itinerário */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 cursor-help">
                  {checks.itineraryCompatibility ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  )}
                  <span>Itinerário</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {checks.itineraryCompatibility
                  ? 'Rota sem restrições territoriais'
                  : 'Itinerário divergente'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Rodapé de Ações Operacionais */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewComposition(match)}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 h-8 px-2.5"
          >
            <FileText className="h-3.5 w-3.5 mr-1 text-slate-500" />
            VER COMPOSIÇÃO
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSimulate(match)}
              className="text-xs h-8 px-2.5 text-blue-700 border-blue-200 hover:bg-blue-50"
            >
              SIMULAR
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onReserveVehicle(match)}
              className="text-xs h-8 px-2.5 text-amber-700 border-amber-200 hover:bg-amber-50"
            >
              <BookmarkCheck className="h-3.5 w-3.5 mr-1" />
              RESERVAR VEÍCULO
            </Button>

            {onSendSingleToChicao && (
              <Button
                size="sm"
                onClick={() => onSendSingleToChicao(match)}
                className="text-xs h-8 px-3 bg-[#005596] hover:bg-[#004275] text-white shadow-xs font-medium flex items-center gap-1.5"
                title="Valida os dados e despacha a oferta diretamente ao Agente Chicão"
              >
                <Bot className="h-3.5 w-3.5 text-blue-200" />
                <span>Enviar Chicão</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => onSendToFreightDesk(match)}
              className="text-xs h-8 px-3 text-slate-700 border-slate-300 hover:bg-slate-50 font-medium"
            >
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              Mesa Fretes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
