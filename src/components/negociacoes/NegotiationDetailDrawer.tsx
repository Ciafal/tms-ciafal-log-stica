import React, { useState } from 'react'
import {
  NegociacaoRecord,
  formatCurrencyBRL,
  formatWeightTon,
  formatDistanceKm,
  formatDateTimeBR,
  validateNegotiationForCompletion,
} from '@/domain/negociacoesEngine'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Bot,
  User,
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Package,
} from 'lucide-react'

interface NegotiationDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  negotiation: NegociacaoRecord | null
  canViewCpf?: boolean
  onConclude?: (neg: NegociacaoRecord) => void
  onTriggerSap?: (neg: NegociacaoRecord) => void
  isProcessingSap?: boolean
}

export const NegotiationDetailDrawer: React.FC<NegotiationDetailDrawerProps> = ({
  open,
  onOpenChange,
  negotiation,
  canViewCpf = false,
  onConclude,
  onTriggerSap,
  isProcessingSap = false,
}) => {
  const [activeTab, setActiveTab] = useState<
    'geral' | 'rotas' | 'clientes' | 'comercial' | 'historico' | 'sap'
  >('geral')

  if (!negotiation) return null

  const datesOpened = formatDateTimeBR(negotiation.opened_at)
  const datesConcluded = formatDateTimeBR(negotiation.concluded_at)
  const datesAccepted = formatDateTimeBR(negotiation.acceptance_at)

  const validation = validateNegotiationForCompletion(negotiation)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-4 sm:p-6 bg-slate-50 flex flex-col gap-4"
      >
        <SheetHeader className="border-b border-slate-200 pb-3 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#005596] text-white text-xs font-mono font-bold px-2.5 py-1">
                {negotiation.negotiation_number}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs font-bold ${
                  negotiation.status === 'CONCLUIDA'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : negotiation.status === 'EM_NEGOCIACAO'
                      ? 'bg-sky-50 text-[#005596] border-sky-200'
                      : negotiation.status === 'RECUSADO'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                Status: {negotiation.status}
              </Badge>
            </div>

            {/* Badges de Ator */}
            <div className="flex items-center gap-1.5">
              {negotiation.responsible_type === 'CHICAO_IA' ? (
                <Badge className="bg-sky-100 text-[#005596] border border-sky-300 font-bold text-xs gap-1">
                  <Bot className="w-3.5 h-3.5" />🤖 Chicão — IA
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs gap-1">
                  <User className="w-3.5 h-3.5" />👤 Atendimento humano
                </Badge>
              )}
            </div>
          </div>

          <SheetTitle className="text-base sm:text-lg font-black text-slate-900 mt-2">
            Carga {negotiation.cargo_id} —{' '}
            {negotiation.cargo_description || 'Frete Corporativo CIAFAL'}
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500">
            Abertura: {datesOpened.full} •{' '}
            {negotiation.itinerary_description || negotiation.destination}
          </SheetDescription>
        </SheetHeader>

        {/* Banners contextuais de ação */}
        {negotiation.status === 'EM_NEGOCIACAO' && (
          <div className="bg-white p-3 rounded-xl border border-sky-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-800">Pronto para concluir o fechamento?</p>
              <p className="text-[11px] text-slate-500">
                A conclusão requer todos os dados do parceiro, valores, pedidos SAP e aceite
                registrados.
              </p>
            </div>
            {onConclude && (
              <Button
                size="sm"
                onClick={() => onConclude(negotiation)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                Concluir Negociação
              </Button>
            )}
          </div>
        )}

        {negotiation.status === 'CONCLUIDA' && (
          <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-900">
                  Negociação Concluída e Aceite Registrado
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Pipeline SAP:{' '}
                <strong>{negotiation.sap_pipeline_status || 'AGUARDANDO_INTEGRACAO'}</strong> •{' '}
                {negotiation.sap_pipeline_current_step || 'Aguardando sincronização'}
              </p>
            </div>
            {onTriggerSap && (
              <Button
                size="sm"
                onClick={() => onTriggerSap(negotiation)}
                disabled={isProcessingSap}
                className="bg-[#005596] hover:bg-[#004275] text-white font-bold text-xs gap-1.5 shrink-0"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isProcessingSap ? 'animate-spin' : ''}`} />
                {isProcessingSap ? 'Processando SAP...' : 'Reprocessar Pipeline SAP'}
              </Button>
            )}
          </div>
        )}

        {/* PENDÊNCIAS SE HOUVER */}
        {!validation.isValid && negotiation.status !== 'RECUSADO' && (
          <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-900 py-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <AlertTitle className="text-xs font-bold">
              Campos Obrigatórios Pendentes para Conclusão
            </AlertTitle>
            <AlertDescription className="text-[11px] mt-1 space-y-0.5">
              <p>
                Não foi possível concluir a negociação. Existem informações obrigatórias pendentes:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 font-medium">
                {validation.pendingFields.map((field, idx) => (
                  <li key={idx}>{field}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* TABS DE DETALHAMENTO */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1">
          <TabsList className="bg-white border border-slate-200 p-1 w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="geral" className="text-xs font-bold whitespace-nowrap">
              Geral & Autonomia
            </TabsTrigger>
            <TabsTrigger value="rotas" className="text-xs font-bold whitespace-nowrap">
              Motorista & Rota
            </TabsTrigger>
            <TabsTrigger value="clientes" className="text-xs font-bold whitespace-nowrap">
              Clientes & Pedidos ({negotiation.orders_items_json?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="comercial" className="text-xs font-bold whitespace-nowrap">
              Valores Comerciais
            </TabsTrigger>
            <TabsTrigger value="historico" className="text-xs font-bold whitespace-nowrap">
              Histórico & Timeline ({negotiation.timeline_events_json?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="sap" className="text-xs font-bold whitespace-nowrap">
              Integração SAP
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: GERAL & AUTONOMIA IA X HUMANO */}
          <TabsContent value="geral" className="space-y-4 mt-3">
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Identificação Operacional
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nº Negociação:</span>
                    <strong className="text-slate-900 font-mono">
                      {negotiation.negotiation_number}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nº Carga:</span>
                    <strong className="text-slate-900 font-mono">{negotiation.cargo_id}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Código Oferta:</span>
                    <span className="text-slate-700">{negotiation.offer_code || '---'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Data/Hora Abertura:</span>
                    <span className="text-slate-700">{datesOpened.full}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Data/Hora Conclusão:</span>
                    <span className="text-slate-700">{datesConcluded.full}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Responsável Atual:</span>
                    <span className="text-slate-900 font-semibold">
                      {negotiation.responsible_user_name || 'Agente Chicão (IA)'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seção Prescritiva: Diferenciar IA e Intervenção Humana (Item 5) */}
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Métricas de Autonomia do Chicão & Intervenção Humana
                    </h4>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    Alimenta Governança
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-sky-50 p-2.5 rounded-lg border border-sky-100">
                    <span className="text-[10px] uppercase font-bold text-sky-700 block">
                      Mensagens IA
                    </span>
                    <strong className="text-lg font-mono text-[#005596]">
                      {negotiation.ai_messages_count || 0}
                    </strong>
                    <span className="text-[10px] text-sky-600 block">Chicão</span>
                  </div>

                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">
                      Mensagens Humanas
                    </span>
                    <strong className="text-lg font-mono text-amber-800">
                      {negotiation.human_messages_count || 0}
                    </strong>
                    <span className="text-[10px] text-amber-600 block">Operador</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-600 block">
                      Tempo Chicão
                    </span>
                    <strong className="text-lg font-mono text-slate-800">
                      {negotiation.ai_duration_minutes || 0} min
                    </strong>
                    <span className="text-[10px] text-slate-500 block">Operação IA</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-600 block">
                      Tempo Humano
                    </span>
                    <strong className="text-lg font-mono text-slate-800">
                      {negotiation.human_duration_minutes || 0} min
                    </strong>
                    <span className="text-[10px] text-slate-500 block">Operação Humana</span>
                  </div>
                </div>

                {negotiation.human_takeover_at && (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <User className="w-3.5 h-3.5 text-amber-700" />
                      <span>
                        Momento em que humano assumiu:{' '}
                        {formatDateTimeBR(negotiation.human_takeover_at).full}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      <strong>Motivo da intervenção:</strong>{' '}
                      {negotiation.human_takeover_reason ||
                        'Solicitação operacional extraordinária.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: MOTORISTA & ROTA */}
          <TabsContent value="rotas" className="space-y-4 mt-3">
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Truck className="w-4 h-4 text-[#005596]" />
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Dados do Motorista & Veículo
                  </h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Motorista:</span>
                    <strong className="text-slate-900">
                      {negotiation.driver_name || 'Não definido'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Telefone/WhatsApp:</span>
                    <span className="text-slate-700">{negotiation.driver_phone || '---'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">CPF:</span>
                    <span className="text-slate-800 font-mono">
                      {canViewCpf
                        ? negotiation.driver_cpf || negotiation.driver_cpf_masked || '---'
                        : negotiation.driver_cpf_masked || '***.***.***-**'}
                    </span>
                    {!canViewCpf && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-slate-400" /> Mascarado por RBAC
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Transportadora:</span>
                    <span className="text-slate-700">
                      {negotiation.carrier_name || 'Motorista Autônomo'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Placa do Veículo:</span>
                    <strong className="text-slate-900 font-mono">
                      {negotiation.vehicle_plate || 'Pendente'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      Tipo de Veículo / Carroceria:
                    </span>
                    <span className="text-slate-700">
                      {negotiation.vehicle_type || '---'} • {negotiation.vehicle_body_type || '---'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <MapPin className="w-4 h-4 text-[#005596]" />
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Itinerário & Rota Logística
                  </h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Origem:</span>
                    <strong className="text-slate-900">
                      {negotiation.origin || 'Contagem - MG'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      Destino Principal / UF:
                    </span>
                    <strong className="text-slate-900">
                      {negotiation.destination} ({negotiation.uf})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Distância Prevista:</span>
                    <strong className="text-slate-900">
                      {formatDistanceKm(negotiation.distance_km)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      Quantidade de Descargas:
                    </span>
                    <strong className="text-slate-900">
                      {negotiation.discharges_count || 1} descarga(s)
                    </strong>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Itinerário SAP (TVROT): </span>
                  <code>{negotiation.itinerary_code || '---'}</code> —{' '}
                  {negotiation.itinerary_description || 'Itinerário oficial da carteira CIAFAL'}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: CLIENTES DA CARGA & TABELA PRESCRITIVA (Item 4) */}
          <TabsContent value="clientes" className="space-y-4 mt-3">
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#005596]" />
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Clientes da Carga & Pedidos SAP (Base para Remessas)
                    </h4>
                  </div>
                  <Badge variant="outline" className="text-xs font-bold text-slate-700">
                    Peso Total: {formatWeightTon(negotiation.total_weight_kg)}
                  </Badge>
                </div>

                {negotiation.orders_items_json && negotiation.orders_items_json.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Cliente</th>
                          <th className="p-2.5">Pedido SAP</th>
                          <th className="p-2.5">Item</th>
                          <th className="p-2.5">Produto</th>
                          <th className="p-2.5 text-right">Quantidade</th>
                          <th className="p-2.5 text-right">Peso</th>
                          <th className="p-2.5">Destino</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {negotiation.orders_items_json.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            <td className="p-2.5 font-medium text-slate-900">
                              <div>{item.customerName}</div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Cód: {item.customerCode}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono font-bold text-[#005596]">
                              {item.orderNumber}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">{item.itemNumber}</td>
                            <td className="p-2.5 text-slate-800">{item.product}</td>
                            <td className="p-2.5 text-right font-mono">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="p-2.5 text-right font-mono font-semibold text-slate-900">
                              {formatWeightTon(item.weightKg)}
                            </td>
                            <td className="p-2.5 text-slate-600">{item.destination}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400">
                    Nenhum item de pedido vinculado a esta negociação.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: VALORES COMERCIAIS */}
          <TabsContent value="comercial" className="space-y-4 mt-3">
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Condições Comerciais Acordadas (Separação Frete x Pedágio)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Oferta Inicial
                    </span>
                    <strong className="text-base font-mono text-slate-700">
                      {formatCurrencyBRL(negotiation.initial_freight_value)}
                    </strong>
                    <span className="text-[10px] text-slate-400 block">Meta CIAFAL</span>
                  </div>

                  <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
                    <span className="text-[10px] uppercase font-bold text-[#005596] block">
                      Frete Negociado
                    </span>
                    <strong className="text-base font-mono text-[#005596]">
                      {formatCurrencyBRL(negotiation.negotiated_freight_value)}
                    </strong>
                    <span className="text-[10px] text-sky-700 block">Valor líquido</span>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-800 block">
                      Pedágio Integral
                    </span>
                    <strong className="text-base font-mono text-amber-700">
                      {formatCurrencyBRL(negotiation.toll_value)}
                    </strong>
                    <span className="text-[10px] text-amber-600 block">
                      Obrigatório / Sem margem
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                      Total Contratado
                    </span>
                    <strong className="text-base font-mono text-emerald-700">
                      {formatCurrencyBRL(negotiation.total_contracted_value)}
                    </strong>
                    <span className="text-[10px] text-emerald-600 block">Frete + Pedágio</span>
                  </div>
                </div>

                {/* Dados de Aceite */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Aceite Registrado por:</span>
                    <strong className="text-slate-800">
                      {negotiation.accepted_by || 'Aguardando aceite'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data/Hora do Aceite:</span>
                    <span className="text-slate-800 font-mono">{datesAccepted.full}</span>
                  </div>
                  {negotiation.completion_notes && (
                    <div className="pt-2 border-t text-slate-600">
                      <strong>Observações:</strong> {negotiation.completion_notes}
                    </div>
                  )}
                </div>

                {/* Contrapropostas */}
                {negotiation.counter_proposals_json &&
                  negotiation.counter_proposals_json.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-slate-700">
                        Rodadas de Contrapropostas:
                      </h5>
                      <div className="space-y-1.5">
                        {negotiation.counter_proposals_json.map((cp, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs p-2 rounded bg-slate-50 border border-slate-100"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                Rodada {cp.round}
                              </Badge>
                              <span className="font-semibold text-slate-800">{cp.sender}</span>
                              <span className="text-slate-500 text-[11px]">{cp.note}</span>
                            </div>
                            <span className="font-mono font-bold text-slate-900">
                              {formatCurrencyBRL(cp.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: HISTÓRICO & TIMELINE */}
          <TabsContent value="historico" className="space-y-4 mt-3">
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#005596]" />
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Timeline Completa de Interações
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500">
                    {negotiation.timeline_events_json?.length || 0} eventos registrados
                  </span>
                </div>

                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                  {negotiation.timeline_events_json &&
                  negotiation.timeline_events_json.length > 0 ? (
                    negotiation.timeline_events_json.map((evt, idx) => (
                      <div key={evt.id || idx} className="relative pl-8 text-xs space-y-1">
                        <div className="absolute left-1.5 top-0.5 w-4 h-4 rounded-full bg-white border-2 border-[#005596]" />
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{evt.actor}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {evt.timestamp}
                          </span>
                        </div>
                        <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                          {evt.message}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400">
                      Nenhum evento registrado no histórico.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 6: INTEGRAÇÃO SAP (Pipeline, Remessas, Transporte RFC) */}
          <TabsContent value="sap" className="space-y-4 mt-3">
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#005596]" />
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Pipeline de Integração SAP ECC
                    </h4>
                  </div>
                  <Badge
                    className={`text-xs font-bold ${
                      negotiation.sap_pipeline_status === 'INTEGRADO_SAP'
                        ? 'bg-emerald-600 text-white'
                        : negotiation.sap_pipeline_status === 'ERRO_INTEGRACAO'
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-500 text-white'
                    }`}
                  >
                    {negotiation.sap_pipeline_status || 'AGUARDANDO_INTEGRACAO'}
                  </Badge>
                </div>

                {/* Pipeline Steps Visuais */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Orquestração do Pipeline (Itens 7, 8, 9, 10):</span>
                    <span className="text-slate-500 font-normal">
                      Tentativas: {negotiation.sap_retry_count || 0}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <strong>1. Validar Carga & Pedidos:</strong>
                      <span className="text-emerald-600 block font-semibold">✓ Concluído</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <strong>2. Remessas SAP por Cliente:</strong>
                      <span className="text-amber-700 block font-semibold">
                        Aguardando RFC escrita no QAS
                      </span>
                    </div>
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <strong>3. Validar Remessas Geradas:</strong>
                      <span className="text-slate-400 block">Pendente remessas</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <strong>4. Criar Transporte por Veículo:</strong>
                      <span className="text-slate-400 block">Pendente remessas</span>
                    </div>
                  </div>
                </div>

                {/* Números SAP se houver */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Remessas SAP (Outbound Deliveries)
                    </span>
                    <div className="font-mono font-bold text-[#005596] mt-1">
                      {negotiation.sap_remessas_summary || 'Nenhuma remessa confirmada'}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Nº Transporte SAP (Shipment)
                    </span>
                    <div className="font-mono font-bold text-emerald-700 mt-1">
                      {negotiation.sap_transport_number || 'Aguardando criação'}
                    </div>
                  </div>
                </div>

                {/* Status Técnico da RFC e Mensagens */}
                {negotiation.sap_error_message && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                      <span>
                        Diagnóstico RFC SAP: {negotiation.sap_error_technical || 'RFC_PENDING'}
                      </span>
                    </div>
                    <p className="text-amber-800 text-[11px]">{negotiation.sap_error_message}</p>
                    <div className="pt-1 text-[10px] text-amber-700">
                      <strong>Etapa da pendência:</strong>{' '}
                      {negotiation.sap_error_step || 'CRIAR_REMESSAS'}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
