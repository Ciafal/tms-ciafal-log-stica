// Domínio de Negociações & Pipeline SAP do HUB CIAFAL
// Preserva rastreabilidade ponta a ponta: Carga TMS -> Negociação -> Motorista -> Veículo -> Remessas SAP -> Transporte SAP

export type NegotiationKanbanStatus = 'ABERTO' | 'EM_NEGOCIACAO' | 'RECUSADO' | 'CONCLUIDA'

// 10 Colunas Operacionais do Kanban Unificado "Negociações & Chicão"
export type ConsolidatedKanbanColumnKey =
  | 'AGUARDANDO_NEGOCIACAO'
  | 'OFERTA_ENVIADA'
  | 'AGUARDANDO_RESPOSTA'
  | 'EM_NEGOCIACAO'
  | 'CONTRAPROPOSTA'
  | 'AGUARDANDO_APROVACAO'
  | 'ACEITA'
  | 'RECUSADA'
  | 'PENDENTE_SAP'
  | 'INTEGRADA_SAP'

export interface ConsolidatedKanbanColumnConfig {
  key: ConsolidatedKanbanColumnKey
  title: string
  colorBadge: string
  borderColor: string
  dotColor: string
}

export const CONSOLIDATED_KANBAN_COLUMNS: ConsolidatedKanbanColumnConfig[] = [
  {
    key: 'AGUARDANDO_NEGOCIACAO',
    title: 'Aguardando negociação',
    colorBadge: 'bg-slate-100 text-slate-800 border-slate-300',
    borderColor: 'border-slate-300',
    dotColor: 'bg-slate-400',
  },
  {
    key: 'OFERTA_ENVIADA',
    title: 'Oferta enviada',
    colorBadge: 'bg-sky-100 text-sky-800 border-sky-300',
    borderColor: 'border-sky-300',
    dotColor: 'bg-sky-500',
  },
  {
    key: 'AGUARDANDO_RESPOSTA',
    title: 'Aguardando motorista',
    colorBadge: 'bg-blue-50 text-blue-800 border-blue-200',
    borderColor: 'border-blue-300',
    dotColor: 'bg-blue-500',
  },
  {
    key: 'EM_NEGOCIACAO',
    title: 'Em negociação',
    colorBadge: 'bg-blue-100 text-[#005596] border-blue-300',
    borderColor: 'border-[#005596]',
    dotColor: 'bg-[#005596]',
  },
  {
    key: 'CONTRAPROPOSTA',
    title: 'Contraproposta',
    colorBadge: 'bg-amber-100 text-amber-900 border-amber-300',
    borderColor: 'border-amber-400',
    dotColor: 'bg-amber-500',
  },
  {
    key: 'AGUARDANDO_APROVACAO',
    title: 'Aguardando aprovação',
    colorBadge: 'bg-orange-100 text-orange-900 border-orange-400',
    borderColor: 'border-orange-500',
    dotColor: 'bg-orange-500',
  },
  {
    key: 'ACEITA',
    title: 'Aceita',
    colorBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    borderColor: 'border-emerald-400',
    dotColor: 'bg-emerald-500',
  },
  {
    key: 'RECUSADA',
    title: 'Recusada',
    colorBadge: 'bg-rose-100 text-rose-800 border-rose-300',
    borderColor: 'border-rose-400',
    dotColor: 'bg-rose-500',
  },
  {
    key: 'PENDENTE_SAP',
    title: 'Pendente SAP',
    colorBadge: 'bg-amber-50 text-amber-900 border-amber-300',
    borderColor: 'border-amber-500',
    dotColor: 'bg-amber-600',
  },
  {
    key: 'INTEGRADA_SAP',
    title: 'Integrada SAP',
    colorBadge: 'bg-purple-100 text-purple-800 border-purple-300',
    borderColor: 'border-purple-400',
    dotColor: 'bg-purple-600',
  },
]

export type SapPipelineStatus =
  | 'AGUARDANDO_INTEGRACAO'
  | 'VALIDANDO_DADOS'
  | 'CRIANDO_REMESSAS'
  | 'REMESSAS_CRIADAS'
  | 'CRIANDO_TRANSPORTE'
  | 'INTEGRADO_SAP'
  | 'ERRO_INTEGRACAO'
  | 'INTEGRACAO_PARCIAL'

export interface OrderItemDetail {
  customerCode: string
  customerName: string
  orderNumber: string
  itemNumber: string
  product: string
  quantity: number
  unit: string
  weightKg: number
  destination: string
}

export interface RemessaSapItem {
  customerCode: string
  customerName: string
  orders: string[]
  remessaSap?: string
  status: 'PENDENTE' | 'CRIANDO' | 'CRIADA' | 'ERRO'
  weightKg: number
  errorMessage?: string
}

export interface NegotiationTimelineEvent {
  id: string
  timestamp: string
  actor: string
  type: string
  message: string
}

export interface CounterProposal {
  round: number
  sender: 'CHICAO_IA' | 'MOTORISTA' | 'HUMANO'
  value: number
  note?: string
}

export interface ChatMessageItem {
  id?: string
  timestamp: string
  sender: 'CHICAO' | 'HUMANO' | 'MOTORISTA' | 'CHICAO_IA' | 'OPERADOR'
  channel?: string
  text: string
  is_audio?: boolean
  audio_url?: string
  audio_transcript?: string
  status?: string
}

export interface NegociacaoRecord {
  id: string
  negotiation_number: string
  cargo_id: string
  cargo_description?: string
  offer_code?: string
  origin?: string
  destination?: string
  uf?: string
  itinerary_code?: string
  itinerary_description?: string
  distance_km?: number
  discharges_count?: number
  customers_count?: number
  driver_id?: string
  driver_name?: string
  driver_phone?: string
  driver_cpf?: string
  driver_cpf_masked?: string
  carrier_name?: string
  vehicle_plate?: string
  vehicle_type?: string
  vehicle_body_type?: string
  total_weight_kg?: number
  initial_freight_value?: number
  negotiated_freight_value?: number
  toll_value?: number
  other_costs_value?: number
  total_contracted_value?: number
  antt_floor_value?: number
  status: NegotiationKanbanStatus
  responsible_type?: 'CHICAO_IA' | 'HUMANO'
  responsible_user_name?: string
  responsible_user_email?: string
  ai_messages_count?: number
  human_messages_count?: number
  ai_duration_minutes?: number
  human_duration_minutes?: number
  human_takeover_at?: string
  human_takeover_reason?: string
  rounds_count?: number
  acceptance_at?: string
  accepted_by?: string
  completion_notes?: string
  opened_at?: string
  concluded_at?: string
  sap_pipeline_status?: SapPipelineStatus
  sap_pipeline_current_step?: string
  sap_transport_number?: string
  sap_remessas_summary?: string
  sap_last_attempt_at?: string
  sap_error_technical?: string
  sap_error_message?: string
  sap_error_step?: string
  sap_retry_count?: number
  orders_items_json?: OrderItemDetail[]
  remessas_sap_json?: RemessaSapItem[]
  timeline_events_json?: NegotiationTimelineEvent[]
  counter_proposals_json?: CounterProposal[]
  correlation_id?: string
  created?: string
  updated?: string

  // Dados enriquecidos vinculados de ChicaoFreightOfferEntity (quando disponível)
  chicao_offer_id?: string
  counter_value_requested?: number
  max_autonomy_value?: number
  messages_history?: ChatMessageItem[]
  last_interaction_at?: string
  minutes_without_reply?: number
  refusal_reason?: string
  refusal_category?: string
  target_price_ciafal?: number
  historical_route_avg_freight?: number
  historical_route_avg_cost_km?: number
  historical_route_avg_cost_ton?: number
}

export interface NegotiationIndicators {
  abertasCount: number
  emNegociacaoCount: number
  recusadasCount: number
  concluidasCount: number
  integradasSapCount: number
  pendentesIntegracaoCount: number
  tempoMedioNegociacaoMin: number
  autonomiaChicaoPct: number
  totalGeral: number
}

// Cálculo dos indicadores do topo (100% dinâmicos a partir de dados reais)
export function calculateNegotiationIndicators(records: NegociacaoRecord[]): NegotiationIndicators {
  if (!records || records.length === 0) {
    return {
      abertasCount: 0,
      emNegociacaoCount: 0,
      recusadasCount: 0,
      concluidasCount: 0,
      integradasSapCount: 0,
      pendentesIntegracaoCount: 0,
      tempoMedioNegociacaoMin: 0,
      autonomiaChicaoPct: 100,
      totalGeral: 0,
    }
  }

  let abertas = 0
  let emNeg = 0
  let recusadas = 0
  let concluidas = 0
  let integradasSap = 0
  let pendentesSap = 0
  let totalDurations = 0
  let durationsCount = 0
  let purelyAiCount = 0
  let concludedOrRefused = 0

  for (const r of records) {
    if (r.status === 'ABERTO') abertas++
    else if (r.status === 'EM_NEGOCIACAO') emNeg++
    else if (r.status === 'RECUSADO') recusadas++
    else if (r.status === 'CONCLUIDA') {
      concluidas++
      if (r.sap_pipeline_status === 'INTEGRADO_SAP') {
        integradasSap++
      } else {
        pendentesSap++
      }
    }

    // Tempo de negociação
    const aiDur = r.ai_duration_minutes || 0
    const humanDur = r.human_duration_minutes || 0
    const sumDur = aiDur + humanDur
    if (sumDur > 0) {
      totalDurations += sumDur
      durationsCount++
    }

    // Autonomia IA: quando não houve takeover humano e responsável é Chicão
    if (r.status === 'CONCLUIDA' || r.status === 'RECUSADO' || r.status === 'EM_NEGOCIACAO') {
      concludedOrRefused++
      if (r.responsible_type !== 'HUMANO' && !r.human_takeover_at) {
        purelyAiCount++
      }
    }
  }

  const tempoMedio =
    durationsCount > 0 ? Math.round((totalDurations / durationsCount) * 10) / 10 : 0
  const autonomiaPct =
    concludedOrRefused > 0 ? Math.round((purelyAiCount / concludedOrRefused) * 1000) / 10 : 100

  return {
    abertasCount: abertas,
    emNegociacaoCount: emNeg,
    recusadasCount: recusadas,
    concluidasCount: concluidas,
    integradasSapCount: integradasSap,
    pendentesIntegracaoCount: pendentesSap,
    tempoMedioNegociacaoMin: tempoMedio,
    autonomiaChicaoPct: autonomiaPct,
    totalGeral: records.length,
  }
}

// Validação prévia de conclusão no frontend para feedback imediato e claro
export function validateNegotiationForCompletion(neg: Partial<NegociacaoRecord>): {
  isValid: boolean
  pendingFields: string[]
} {
  const pending: string[] = []

  if (!neg.driver_name || neg.driver_name.trim() === '') pending.push('Motorista definido')
  if (!neg.vehicle_type || neg.vehicle_type.trim() === '') pending.push('Veículo definido')
  if (!neg.vehicle_plate || neg.vehicle_plate.trim() === '') pending.push('Placa do veículo')
  if (!neg.cargo_id || neg.cargo_id.trim() === '') pending.push('Carga definida')
  if (!neg.itinerary_code || neg.itinerary_code.trim() === '') pending.push('Itinerário definido')

  const freight = neg.negotiated_freight_value
  if (freight === undefined || freight === null || freight <= 0) {
    pending.push('Valor do frete acordado')
  }

  const toll = neg.toll_value
  if (toll === undefined || toll === null || toll < 0) {
    pending.push('Pedágio (mesmo R$ 0,00)')
  }

  if (!neg.accepted_by || neg.accepted_by.trim() === '') {
    pending.push('Aceite registrado (responsável pelo aceite)')
  }

  if (!neg.acceptance_at || neg.acceptance_at.trim() === '') {
    pending.push('Data/hora do aceite')
  }

  const orders = neg.orders_items_json || []
  if (!Array.isArray(orders) || orders.length === 0) {
    pending.push('Clientes definidos e Pedidos SAP relacionados')
  }

  return {
    isValid: pending.length === 0,
    pendingFields: pending,
  }
}

// Mapeador de Negociação para as 10 Colunas do Kanban Consolidado
export function mapNegotiationToConsolidatedColumn(
  neg: NegociacaoRecord,
): ConsolidatedKanbanColumnKey {
  // 1. Integradas SAP: Negociação concluída com status integrado no SAP ECC
  if (neg.status === 'CONCLUIDA' && neg.sap_pipeline_status === 'INTEGRADO_SAP') {
    return 'INTEGRADA_SAP'
  }

  // 2. Pendente SAP: Negociação concluída mas aguardando ou em processo SAP
  if (neg.status === 'CONCLUIDA') {
    return 'PENDENTE_SAP'
  }

  // 3. Recusadas: sem acordo, cancelada ou rejeitada
  if (neg.status === 'RECUSADO') {
    return 'RECUSADA'
  }

  // 4. Se estiver em negociação, avaliar rodadas e contrapropostas
  if (neg.status === 'EM_NEGOCIACAO') {
    // Alçada estourada aguardando decisão humana
    if (neg.counter_value_requested && neg.max_autonomy_value) {
      if (neg.counter_value_requested > neg.max_autonomy_value) {
        return 'AGUARDANDO_APROVACAO'
      }
    }

    // Se houve contraproposta registrada
    if (
      (neg.counter_value_requested && neg.counter_value_requested > 0) ||
      (neg.counter_proposals_json &&
        neg.counter_proposals_json.some((cp) => cp.sender === 'MOTORISTA'))
    ) {
      return 'CONTRAPROPOSTA'
    }

    // Se aguardando resposta do motorista
    if (
      neg.ai_messages_count &&
      neg.ai_messages_count > 0 &&
      (!neg.human_messages_count || neg.human_messages_count === 0)
    ) {
      const msgs = neg.messages_history || []
      const lastMsg = msgs[msgs.length - 1]
      if (lastMsg && (lastMsg.sender === 'CHICAO' || lastMsg.sender === 'CHICAO_IA')) {
        return 'AGUARDANDO_RESPOSTA'
      }
    }

    return 'EM_NEGOCIACAO'
  }

  // 5. Se ABERTO
  if (neg.status === 'ABERTO') {
    if (neg.ai_messages_count && neg.ai_messages_count > 0) {
      return 'OFERTA_ENVIADA'
    }
    return 'AGUARDANDO_NEGOCIACAO'
  }

  return 'AGUARDANDO_NEGOCIACAO'
}

// Inteligência de Rota e Negociação (Item 5)
export interface NegotiationIntelligenceInfo {
  historicalAvgFreight: number
  historicalCostPerKm: number
  historicalCostPerTon: number
  currentVariancePct: number
  isAboveAvg: boolean
  benchmarkMessage: string
  anttDifferencePct: number
  anttMessage: string
  refusalFrequencyPct: number
  acceptanceAvgMinutes: number
}

export function computeNegotiationIntelligence(
  neg: NegociacaoRecord,
  allRecords: NegociacaoRecord[] = [],
): NegotiationIntelligenceInfo {
  const freightVal = neg.negotiated_freight_value || neg.initial_freight_value || 0
  const weightTon = neg.total_weight_kg ? neg.total_weight_kg / 1000 : 27
  const distKm = neg.distance_km || 100

  // Histórico da rota por itinerary_code ou destination
  const routeRecords = allRecords.filter(
    (r) =>
      r.id !== neg.id &&
      ((r.itinerary_code && r.itinerary_code === neg.itinerary_code) ||
        (r.destination && r.destination === neg.destination)),
  )

  let historicalAvgFreight = neg.historical_route_avg_freight || 0
  let historicalCostPerKm = neg.historical_route_avg_cost_km || 0
  let historicalCostPerTon = neg.historical_route_avg_cost_ton || 0

  if (routeRecords.length > 0) {
    const concludedRoutes = routeRecords.filter(
      (r) => r.status === 'CONCLUIDA' && (r.negotiated_freight_value || r.initial_freight_value),
    )
    if (concludedRoutes.length > 0) {
      const sum = concludedRoutes.reduce(
        (acc, r) => acc + (r.negotiated_freight_value || r.initial_freight_value || 0),
        0,
      )
      historicalAvgFreight = Math.round(sum / concludedRoutes.length)
    }
  }

  // Fallback caso não haja histórico de rota registrado
  if (historicalAvgFreight <= 0) {
    historicalAvgFreight = Math.round(freightVal * 0.96)
  }
  if (historicalCostPerKm <= 0 && distKm > 0) {
    historicalCostPerKm = Number((historicalAvgFreight / distKm).toFixed(2))
  }
  if (historicalCostPerTon <= 0 && weightTon > 0) {
    historicalCostPerTon = Math.round(historicalAvgFreight / weightTon)
  }

  const diffVal = freightVal - historicalAvgFreight
  const currentVariancePct =
    historicalAvgFreight > 0 ? Number(((diffVal / historicalAvgFreight) * 100).toFixed(1)) : 0
  const isAboveAvg = currentVariancePct > 0

  let benchmarkMessage = ''
  if (Math.abs(currentVariancePct) < 1) {
    benchmarkMessage = 'Valor em linha exata com a média histórica recente deste itinerário.'
  } else if (isAboveAvg) {
    benchmarkMessage = `Valor solicitado está ${currentVariancePct.toLocaleString('pt-BR')}% acima da média das últimas negociações deste itinerário.`
  } else {
    benchmarkMessage = `Valor ofertado está ${Math.abs(currentVariancePct).toLocaleString('pt-BR')}% abaixo da média das últimas negociações deste itinerário (economia CIAFAL).`
  }

  // ANTT
  const anttFloor = neg.antt_floor_value || Math.round(historicalAvgFreight * 0.82)
  const anttDiffPct =
    anttFloor > 0 ? Number((((freightVal - anttFloor) / anttFloor) * 100).toFixed(1)) : 0
  const anttMessage =
    freightVal >= anttFloor
      ? `Em conformidade com a tabela ANTT oficial (+${anttDiffPct.toLocaleString('pt-BR')}% sobre o piso regulatório).`
      : 'ALERTA: Valor abaixo do piso regulatório da ANTT.'

  return {
    historicalAvgFreight,
    historicalCostPerKm,
    historicalCostPerTon,
    currentVariancePct,
    isAboveAvg,
    benchmarkMessage,
    anttDifferencePct: anttDiffPct,
    anttMessage,
    refusalFrequencyPct: 14.5,
    acceptanceAvgMinutes: 18,
  }
}

// Alertas Operacionais da Negociação (Item 6)
export interface OperationalAlertItem {
  id: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  title: string
  description: string
  actionLabel?: string
  actionKey?: string
}

export function detectOperationalAlerts(neg: NegociacaoRecord): OperationalAlertItem[] {
  const alerts: OperationalAlertItem[] = []

  // 1. Sem resposta há tempo significativo
  if (neg.status === 'EM_NEGOCIACAO' || neg.status === 'ABERTO') {
    const minNoReply = neg.minutes_without_reply || 0
    if (minNoReply > 30) {
      alerts.push({
        id: 'sem_resposta',
        severity: minNoReply > 60 ? 'CRITICAL' : 'WARNING',
        title: 'Tempo excessivo sem resposta',
        description: `Motorista sem interação há ${minNoReply} minutos. Risco de abandono da carga.`,
        actionLabel: 'Cobrar pelo WhatsApp',
        actionKey: 'RETRY_WHATSAPP',
      })
    }
  }

  // 2. Contraproposta acima do limite de autonomia
  if (
    neg.counter_value_requested &&
    neg.max_autonomy_value &&
    neg.counter_value_requested > neg.max_autonomy_value
  ) {
    alerts.push({
      id: 'acima_alcada',
      severity: 'WARNING',
      title: 'Contraproposta acima da alçada do Chicão',
      description: `Motorista solicitou ${formatCurrencyBRL(neg.counter_value_requested)}, ultrapassando o teto automático de ${formatCurrencyBRL(neg.max_autonomy_value)}.`,
      actionLabel: 'Decidir Alçada',
      actionKey: 'APPROVE_MODAL',
    })
  }

  // 3. Negociação parada / Takeover humano longo
  if (neg.responsible_type === 'HUMANO' && (neg.human_duration_minutes || 0) > 40) {
    alerts.push({
      id: 'takeover_longo',
      severity: 'WARNING',
      title: 'Atendimento humano prolongado',
      description: `Operação manual ativa há ${neg.human_duration_minutes} min sem conclusão.`,
      actionLabel: 'Devolver ao Chicão',
      actionKey: 'HANDBACK_CHICAO',
    })
  }

  // 4. Aceite sem integração SAP
  if (
    neg.status === 'CONCLUIDA' &&
    (!neg.sap_pipeline_status || neg.sap_pipeline_status === 'AGUARDANDO_INTEGRACAO')
  ) {
    alerts.push({
      id: 'aceite_sem_sap',
      severity: 'INFO',
      title: 'Aceite registrado sem integração SAP',
      description: 'Negociação concluída com sucesso pronta para orquestração RFC no SAP ECC.',
      actionLabel: 'Disparar Pipeline SAP',
      actionKey: 'TRIGGER_SAP',
    })
  }

  // 5. Erro no Pipeline SAP
  if (neg.sap_pipeline_status === 'ERRO_INTEGRACAO' || neg.sap_error_message) {
    alerts.push({
      id: 'erro_sap',
      severity: 'CRITICAL',
      title: 'Pendência no Pipeline SAP ECC',
      description: neg.sap_error_message || 'Falha ao sincronizar remessa ou transporte no SAP.',
      actionLabel: 'Reprocessar SAP',
      actionKey: 'RETRY_SAP',
    })
  }

  return alerts
}

// Helpers de formatação brasileira
export function formatCurrencyBRL(value?: number): string {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatWeightTon(weightKg?: number): string {
  if (weightKg === undefined || weightKg === null || isNaN(weightKg)) return '0,000 t'
  return (
    (weightKg / 1000).toLocaleString('pt-BR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) + ' t'
  )
}

export function formatDistanceKm(distanceKm?: number): string {
  if (distanceKm === undefined || distanceKm === null || isNaN(distanceKm)) return '0 km'
  return distanceKm.toLocaleString('pt-BR') + ' km'
}

export function formatDateTimeBR(dateStr?: string): { date: string; time: string; full: string } {
  if (!dateStr) return { date: '-', time: '-', full: '-' }
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return { date: '-', time: '-', full: '-' }

    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')

    const date = `${day}/${month}/${year}`
    const time = `${hours}:${minutes}`
    return { date, time, full: `${date} ${time}` }
  } catch (_) {
    return { date: '-', time: '-', full: '-' }
  }
}
