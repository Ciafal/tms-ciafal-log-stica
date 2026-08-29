import React from 'react'
import {
  Truck,
  MessageSquare,
  PackageCheck,
  Warehouse,
  Route,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Scale,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExecutiveCardsData } from '@/domain/controlTowerConsolidatedEngine'

interface ExecutiveViewProps {
  metrics: ExecutiveCardsData
  onSelectStage?: (stage: string) => void
}

export const ExecutiveView: React.FC<ExecutiveViewProps> = ({ metrics, onSelectStage }) => {
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* CARD 1: VEÍCULOS NA FILA */}
      <Card className="border-slate-200 shadow-sm bg-white hover:border-[#005596] transition overflow-hidden">
        <div className="h-2 w-full bg-[#005596]" />
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-50 text-[#005596]">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-slate-900">
                  VEÍCULOS NA FILA
                </CardTitle>
                <p className="text-[11px] text-slate-500">Disponibilidade e triagem de pátio</p>
              </div>
            </div>
            <Badge className="bg-[#005596] text-white font-bold text-xs">
              {metrics.queue.totalVehicles} veículos
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3.5 text-xs">
          {/* Métricas Principais */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Toneladas Previstas
              </span>
              <span className="text-base font-black text-slate-900">
                {metrics.queue.totalTon.toLocaleString('pt-BR')} t
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Tempo Médio Espera
              </span>
              <span className="text-base font-black text-[#005596] flex items-center gap-1">
                <Clock className="w-4 h-4 text-slate-400" />
                {metrics.queue.avgWaitMinutes} min
              </span>
            </div>
          </div>

          {/* Subdivisão da Fila */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Subdivisão Operacional:
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <div className="bg-slate-100 p-2 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Fora da CIAFAL</span>
                <strong className="text-slate-900 font-bold">
                  {metrics.queue.subdivision.foraCiafal}
                </strong>
              </div>
              <div className="bg-sky-50 p-2 rounded border border-sky-200">
                <span className="text-sky-700 block text-[10px]">Porta (Totem)</span>
                <strong className="text-sky-900 font-bold">
                  {metrics.queue.subdivision.porta}
                </strong>
              </div>
              <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                <span className="text-emerald-700 block text-[10px]">No Pátio</span>
                <strong className="text-emerald-900 font-bold">
                  {metrics.queue.subdivision.patio}
                </strong>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
              <div className="bg-amber-50 p-2 rounded border border-amber-200">
                <span className="text-amber-700 block text-[10px]">Aguard. Carregamento</span>
                <strong className="text-amber-900 font-bold">
                  {metrics.queue.subdivision.aguardandoCarregamento}
                </strong>
              </div>
              <div className="bg-indigo-50 p-2 rounded border border-indigo-200">
                <span className="text-indigo-700 block text-[10px]">Em Carregamento</span>
                <strong className="text-indigo-900 font-bold">
                  {metrics.queue.subdivision.emCarregamento}
                </strong>
              </div>
            </div>
          </div>

          {/* Veículo com maior tempo */}
          {metrics.queue.longestWaitingVehicle ? (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span className="text-[11px] font-bold">
                  Maior tempo: {metrics.queue.longestWaitingVehicle.plate} (
                  {metrics.queue.longestWaitingVehicle.driver.split(' ')[0]})
                </span>
              </div>
              <Badge
                variant="outline"
                className="bg-rose-100 text-rose-800 border-rose-300 font-mono text-[10px] font-black"
              >
                {metrics.queue.longestWaitingVehicle.minutes} min
              </Badge>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 italic">
              Sem veículos em fila prolongada.
            </div>
          )}
        </CardContent>
      </Card>

      {/* CARD 2: TRANSPORTES EM NEGOCIAÇÃO */}
      <Card className="border-slate-200 shadow-sm bg-white hover:border-[#005596] transition overflow-hidden">
        <div className="h-2 w-full bg-amber-500" />
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-slate-900">
                  TRANSPORTES EM NEGOCIAÇÃO
                </CardTitle>
                <p className="text-[11px] text-slate-500">Mesa de fretes & Carlão IA</p>
              </div>
            </div>
            <Badge className="bg-amber-600 text-white font-bold text-xs">
              {metrics.negotiation.totalTransports} cargas
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3.5 text-xs">
          {/* Métricas Principais */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Volume Previsto
              </span>
              <span className="text-base font-black text-slate-900">
                {metrics.negotiation.totalTon.toLocaleString('pt-BR')} t
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Valor de Frete Previsto
              </span>
              <span className="text-base font-black text-emerald-700">
                {formatMoney(metrics.negotiation.totalFreightValue)}
              </span>
            </div>
          </div>

          {/* Indicadores de Ritmo e SLA */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-100 p-2 rounded border border-slate-200 text-center">
              <span className="text-slate-500 block text-[10px]">Motoristas Acionados</span>
              <strong className="text-slate-900 font-black text-sm">
                {metrics.negotiation.activeDrivers}
              </strong>
            </div>
            <div className="bg-slate-100 p-2 rounded border border-slate-200 text-center">
              <span className="text-slate-500 block text-[10px]">Tempo Médio Negoc.</span>
              <strong className="text-[#005596] font-black text-sm">
                {metrics.negotiation.avgNegotiationMinutes} min
              </strong>
            </div>
            <div
              className={`p-2 rounded border text-center ${metrics.negotiation.overSlaCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-100 border-slate-200'}`}
            >
              <span className="block text-[10px]">Acima do SLA</span>
              <strong
                className={`font-black text-sm ${metrics.negotiation.overSlaCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}
              >
                {metrics.negotiation.overSlaCount}
              </strong>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 flex items-center justify-between text-[11px]">
            <span className="font-semibold">Autonomia Carlão IA ativa em ondas 1 e 2</span>
            <Badge className="bg-sky-600 text-white font-bold text-[10px]">Mesa Live</Badge>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: TRANSPORTES EM COLETA */}
      <Card className="border-slate-200 shadow-sm bg-white hover:border-[#005596] transition overflow-hidden">
        <div className="h-2 w-full bg-cyan-600" />
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-slate-900">
                  TRANSPORTES EM COLETA
                </CardTitle>
                <p className="text-[11px] text-slate-500">A caminho da CIAFAL e agendados</p>
              </div>
            </div>
            <Badge className="bg-cyan-600 text-white font-bold text-xs">
              {metrics.collectionStage.totalTransports} transportes
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3.5 text-xs">
          {/* Métricas Principais */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Volume a Coletar
              </span>
              <span className="text-base font-black text-slate-900">
                {metrics.collectionStage.totalTon.toLocaleString('pt-BR')} t
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Veículos Vinculados
              </span>
              <span className="text-base font-black text-cyan-800">
                {metrics.collectionStage.totalVehicles} veículos
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 p-2 rounded border border-emerald-200 text-center">
              <span className="text-emerald-700 block text-[10px]">No Prazo</span>
              <strong className="text-emerald-900 font-black text-sm">
                {metrics.collectionStage.onTimeCount}
              </strong>
            </div>
            <div
              className={`p-2 rounded border text-center ${metrics.collectionStage.delayedCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-100 border-slate-200'}`}
            >
              <span className="block text-[10px]">Atrasados</span>
              <strong
                className={`font-black text-sm ${metrics.collectionStage.delayedCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}
              >
                {metrics.collectionStage.delayedCount}
              </strong>
            </div>
            <div className="bg-sky-50 p-2 rounded border border-sky-200 text-center">
              <span className="text-sky-700 block text-[10px]">Prev. Coleta Hoje</span>
              <strong className="text-sky-900 font-black text-sm">
                {metrics.collectionStage.expectedTodayCount}
              </strong>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
            <span>Integração de agendamento & Portaria</span>
            <span className="font-mono text-slate-700 font-bold">100% Sincronizado</span>
          </div>
        </CardContent>
      </Card>

      {/* CARD 4: TRANSPORTES EM EXPEDIÇÃO */}
      <Card className="border-slate-200 shadow-sm bg-white hover:border-[#005596] transition overflow-hidden">
        <div className="h-2 w-full bg-orange-500" />
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                <Warehouse className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-slate-900">
                  TRANSPORTES EM EXPEDIÇÃO
                </CardTitle>
                <p className="text-[11px] text-slate-500">Docas, pontes rolantes & faturamento</p>
              </div>
            </div>
            <Badge className="bg-orange-600 text-white font-bold text-xs">
              {metrics.expedition.totalTransports} em processo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3 text-xs">
          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-600 font-medium">
              Volume Total em Pátio/Expedição:
            </span>
            <span className="text-sm font-black text-slate-900">
              {metrics.expedition.totalTon.toLocaleString('pt-BR')} t
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-600 text-[11px]">Aguardando Entrada:</span>
              <strong className="text-slate-900 font-bold">
                {metrics.expedition.aguardandoEntrada}
              </strong>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-600 text-[11px]">No Pátio (WMS / Liberação):</span>
              <strong className="text-slate-900 font-bold">{metrics.expedition.noPatio}</strong>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-amber-50 rounded border border-amber-200">
              <span className="text-amber-800 text-[11px] font-medium">
                Em Carregamento na Doca:
              </span>
              <strong className="text-amber-900 font-bold">
                {metrics.expedition.emCarregamento}
              </strong>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-sky-50 rounded border border-sky-200">
              <span className="text-sky-800 text-[11px]">Carregamento Concluído / Balança:</span>
              <strong className="text-sky-900 font-bold">
                {metrics.expedition.carregamentoConcluido}
              </strong>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-purple-50 rounded border border-purple-200">
              <span className="text-purple-800 text-[11px]">
                Aguardando Faturamento SAP (NF-e):
              </span>
              <strong className="text-purple-900 font-bold">
                {metrics.expedition.aguardandoFaturamento}
              </strong>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-emerald-50 rounded border border-emerald-200">
              <span className="text-emerald-800 text-[11px]">Faturados Aguardando Saída:</span>
              <strong className="text-emerald-900 font-bold">
                {metrics.expedition.faturadosAguardandoSaida}
              </strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 5: TRANSPORTES EM ROTA */}
      <Card className="border-slate-200 shadow-sm bg-white hover:border-[#005596] transition overflow-hidden">
        <div className="h-2 w-full bg-blue-600" />
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-slate-900">
                  TRANSPORTES EM ROTA
                </CardTitle>
                <p className="text-[11px] text-slate-500">Rastreamento Fred IA & Entregas</p>
              </div>
            </div>
            <Badge className="bg-blue-600 text-white font-bold text-xs">
              {metrics.inRoute.totalTransports} em trânsito
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Volume em Trânsito
              </span>
              <span className="text-base font-black text-slate-900">
                {metrics.inRoute.totalTon.toLocaleString('pt-BR')} t
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Entregas Previstas
              </span>
              <span className="text-base font-black text-blue-800">
                {metrics.inRoute.expectedDeliveries} clientes
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
              <span className="text-emerald-700 block text-[10px]">No Prazo</span>
              <strong className="text-emerald-900 font-black text-sm">
                {metrics.inRoute.onTimeCount}
              </strong>
            </div>
            <div className="bg-amber-50 p-2 rounded border border-amber-200">
              <span className="text-amber-700 block text-[10px]">Risco Atraso</span>
              <strong className="text-amber-900 font-black text-sm">
                {metrics.inRoute.riskDelayCount}
              </strong>
            </div>
            <div className="bg-rose-50 p-2 rounded border border-rose-200">
              <span className="text-rose-700 block text-[10px]">Atrasadas</span>
              <strong className="text-rose-900 font-black text-sm">
                {metrics.inRoute.delayedCount}
              </strong>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-lg border flex items-center justify-between ${metrics.inRoute.openOccurrencesCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
          >
            <span className="font-semibold text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Intercorrências Abertas:
            </span>
            <Badge
              className={
                metrics.inRoute.openOccurrencesCount > 0
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-400 text-white'
              }
            >
              {metrics.inRoute.openOccurrencesCount} ocorrências
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* CARD 6: TRANSPORTES ENTREGUES */}
      <Card className="border-slate-200 shadow-sm bg-white hover:border-[#005596] transition overflow-hidden">
        <div className="h-2 w-full bg-emerald-600" />
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-slate-900">
                  TRANSPORTES ENTREGUES
                </CardTitle>
                <p className="text-[11px] text-slate-500">OTIF e performance de entrega</p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white font-bold text-xs">
              OTIF {metrics.delivered.currentMonth.onTimePct}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3 text-xs">
          {/* HOJE */}
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 text-[11px]">Hoje:</span>
              <span className="text-emerald-700 font-extrabold text-[11px]">
                {metrics.delivered.today.onTimePct}% no prazo
              </span>
            </div>
            <div className="flex justify-between text-slate-600 text-[10px]">
              <span>{metrics.delivered.today.count} viagens</span>
              <span>{metrics.delivered.today.ton.toLocaleString('pt-BR')} t</span>
              <span>{metrics.delivered.today.deliveries} descargas</span>
            </div>
          </div>

          {/* MÊS ATUAL */}
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 text-[11px]">Mês Atual:</span>
              <span className="text-emerald-700 font-extrabold text-[11px]">
                {metrics.delivered.currentMonth.onTimePct}% no prazo
              </span>
            </div>
            <div className="flex justify-between text-slate-600 text-[10px]">
              <span>{metrics.delivered.currentMonth.count} viagens</span>
              <span>{metrics.delivered.currentMonth.ton.toLocaleString('pt-BR')} t</span>
              <span>{metrics.delivered.currentMonth.deliveries} descargas</span>
            </div>
          </div>

          {/* YTD */}
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 text-[11px]">YTD (Ano até a Data):</span>
              <span className="text-emerald-700 font-extrabold text-[11px]">
                {metrics.delivered.ytd.onTimePct}% no prazo
              </span>
            </div>
            <div className="flex justify-between text-slate-600 text-[10px]">
              <span>{metrics.delivered.ytd.count} viagens</span>
              <span>{metrics.delivered.ytd.ton.toLocaleString('pt-BR')} t</span>
              <span>{metrics.delivered.ytd.deliveries} descargas</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
