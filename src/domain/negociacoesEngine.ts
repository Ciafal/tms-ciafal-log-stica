// Domínio de Negociações & Pipeline SAP do HUB CIAFAL
// Preserva rastreabilidade ponta a ponta: Carga TMS -> Negociação -> Motorista -> Veículo -> Remessas SAP -> Transporte SAP

export type NegotiationKanbanStatus = 'ABERTO' | 'EM_NEGOCIACAO' | 'RECUSADO' | 'CONCLUIDA'

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
