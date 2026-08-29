// TMS CIAFAL — Motor de Regras e Lógica de Acompanhamento do Agente Fred
// Versão Sprint 8: Acompanhamento de Viagens, Entregas, Ocorrências, Evidências e CRM 360º

export type TripStatus =
  | 'AGUARDANDO_SAIDA'
  | 'EM_ROTA'
  | 'CHEGADA_CLIENTE'
  | 'EM_DESCARGA'
  | 'DESCARGA_CONCLUIDA'
  | 'INTERCORRENCIA'
  | 'RETORNANDO'
  | 'ENCERRADO'
  | 'CANCELADO'

export type EtaStatus =
  | 'DENTRO_PREVISTO'
  | 'RISCO_ATRASO'
  | 'ATRASADO'
  | 'CONCLUIDO'
  | 'ENTREGUE'
  | 'AGUARDANDO'

export type OccurrenceCategory =
  | 'CONGESTIONAMENTO'
  | 'ACIDENTE'
  | 'PANE_MECANICA'
  | 'PNEU'
  | 'RESTRICAO_RODOVIARIA'
  | 'DESVIO_ROTA'
  | 'CHUVA_CLIMA'
  | 'BLOQUEIO_ESTRADA'
  | 'CLIENTE_FECHADO'
  | 'CLIENTE_RECUSOU'
  | 'DEMORA_DESCARGA'
  | 'FILA_ESPERA'
  | 'DIVERGENCIA_PRODUTO'
  | 'DIVERGENCIA_QUANTIDADE'
  | 'PROBLEMA_DOCUMENTACAO'
  | 'ENDERECO_INCORRETO'
  | 'IMPOSSIBILIDADE_DESCARGA'
  | 'AVARIA_CARGA'
  | 'MOTORISTA_SEM_CONTATO'
  | 'ATRASO_OPERACIONAL_CIAFAL'
  | 'OUTROS'

export type OccurrenceSeverity = 'INFORMATIVO' | 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'

export type TargetAudience =
  | 'MOTORISTA'
  | 'VENDEDOR'
  | 'REPRESENTANTE'
  | 'CLIENTE'
  | 'OPERACAO_INTERNA'

export type SenderRole =
  | 'FRED_IA'
  | 'MOTORISTA'
  | 'VENDEDOR'
  | 'REPRESENTANTE'
  | 'CLIENTE'
  | 'OPERADOR_HUMANO'

export interface FredTransportEntity {
  id: string
  sap_transport_number: string
  cargo_id?: string
  negotiation_id?: string
  driver_id?: string
  driver_name: string
  driver_phone?: string
  vehicle_plate: string
  vehicle_type?: string
  carrier_name?: string
  origin_plant?: string
  itinerary_code?: string
  destination_summary?: string
  total_weight_kg?: number
  total_deliveries_count?: number
  completed_deliveries_count?: number
  trip_status: TripStatus
  started_at?: string
  finished_at?: string
  last_location_lat?: number
  last_location_lng?: number
  last_location_name?: string
  last_location_updated_at?: string
  last_location_is_stale?: boolean
  current_next_stop_name?: string
  current_next_stop_eta?: string
  overall_eta_status: EtaStatus
  delay_minutes_current?: number
  active_occurrences_count?: number
  active_actor: 'FRED_IA' | 'HUMANO' | 'PAUSADO'
  human_takeover_user?: string
  human_takeover_reason?: string
  human_takeover_at?: string
  total_ai_messages_count?: number
  total_human_messages_count?: number
  ai_duration_seconds?: number
  human_duration_seconds?: number
  geo_tracking_authorized?: boolean
  geo_authorized_at?: string
  sales_representatives_json?: string
  metadata_json?: string
  created?: string
  updated?: string
}

export interface FredDeliveryEntity {
  id: string
  sap_transport_number: string
  sequence_order: number
  customer_code: string
  customer_name: string
  destination_city?: string
  destination_uf?: string
  street_address?: string
  contact_name?: string
  contact_phone?: string
  sales_rep_name?: string
  sales_rep_phone?: string
  orders_list_json?: string | string[]
  invoice_numbers_json?: string | string[]
  weight_kg?: number
  window_start_time?: string
  window_end_time?: string
  unloading_restriction_notes?: string
  initial_planned_arrival?: string
  current_eta?: string
  actual_arrival_at?: string
  unloading_started_at?: string
  unloading_finished_at?: string
  departure_at?: string
  avg_historical_unloading_min?: number
  measured_unloading_min?: number
  status:
    | 'PENDENTE'
    | 'EM_DESLOCAMENTO'
    | 'PROXIMO'
    | 'NA_PORTARIA'
    | 'EM_DESCARGA'
    | 'ENTREGUE'
    | 'RECUSADO'
    | 'REAGENDADO'
  eta_status: EtaStatus
  discharge_confirmed_by_client?: boolean
  discharge_confirmed_at?: string
  confirmation_notes?: string
  delay_deviation_minutes?: number
  created?: string
  updated?: string
}

export interface FredOccurrenceEntity {
  id: string
  sap_transport_number: string
  customer_code?: string
  customer_name?: string
  driver_name?: string
  category: OccurrenceCategory
  severity: OccurrenceSeverity
  description: string
  location_description?: string
  latitude?: number
  longitude?: number
  eta_before?: string
  eta_after?: string
  estimated_impact_minutes?: number
  status: 'ABERTA' | 'EM_TRATAMENTO' | 'RESOLVIDA' | 'CANCELADA'
  responsible_handler?: string
  solution_notes?: string
  normalized_at?: string
  ai_suggested_classification?: string
  ai_classification_confidence?: number
  human_confirmed?: boolean
  human_confirmed_by?: string
  created?: string
  updated?: string
}

export interface FredEvidenceEntity {
  id: string
  sap_transport_number: string
  customer_code?: string
  occurrence_id?: string
  evidence_type:
    | 'CANHOTO_ASSINADO'
    | 'FOTO_MERCADORIA'
    | 'FOTO_FILA_DESCARGA'
    | 'FOTO_PORTARIA_FECHADA'
    | 'FOTO_AVARIA'
    | 'FOTO_ACIDENTE_OU_TRANSITO'
    | 'FOTO_PNEU_OU_MECANICA'
    | 'DOCUMENTO_FISCAL'
    | 'AUDIO_MOTORISTA'
    | 'AUDIO_CLIENTE'
    | 'OUTRO'
  sender_role: string
  sender_name?: string
  sender_phone?: string
  file_url?: string
  file_name?: string
  audio_duration_seconds?: number
  audio_transcription?: string
  ai_vision_description?: string
  ai_suggested_tag?: string
  ai_confidence_pct?: number
  is_human_validated?: boolean
  validated_by_user?: string
  validation_notes?: string
  latitude?: number
  longitude?: number
  created?: string
  updated?: string
}

export interface FredMessageEntity {
  id: string
  sap_transport_number: string
  sender_type: SenderRole
  sender_id?: string
  sender_name: string
  sender_contact?: string
  target_audience: TargetAudience
  message_channel: 'WHATSAPP' | 'CRM_360' | 'TMS_PANEL' | 'TELEGRAM' | 'SMS'
  message_text: string
  message_type: 'TEXTO' | 'AUDIO' | 'IMAGEM' | 'LOCALIZACAO' | 'ALERTA_PROATIVO' | 'SISTEMA'
  media_url?: string
  audio_transcription?: string
  ai_intent?: string
  is_proactive_alert?: boolean
  alert_category?: 'INFORMATIVO' | 'ATENCAO' | 'CRITICO'
  is_delivered?: boolean
  is_read?: boolean
  correlation_id?: string
  created?: string
  updated?: string
}

export interface FredTimelineEventEntity {
  id: string
  sap_transport_number: string
  event_code: string
  event_title: string
  event_description?: string
  event_source: 'SAP' | 'FRED_IA' | 'MOTORISTA' | 'GPS_TORRE' | 'HUMANO' | 'CLIENTE' | 'VENDEDOR'
  event_severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER'
  customer_code?: string
  customer_name?: string
  location_name?: string
  latitude?: number
  longitude?: number
  payload_json?: Record<string, unknown> | string
  event_timestamp: string
  created?: string
  updated?: string
}

export interface FredAiAnalyticsEntity {
  id: string
  analysis_type: string
  entity_target?: string
  entity_id?: string
  entity_name?: string
  observed_fact: string
  ai_hypothesis: string
  confidence_pct?: number
  evidence_data_json?: Record<string, unknown> | string
  historical_benchmark_json?: Record<string, unknown> | string
  recommended_action?: string
  master_parameter_suggested_change?: string
  reviewed_by_human?: boolean
  created?: string
  updated?: string
}

// -------------------------------------------------------------------------
// 1. REGRAS DE TRANSIÇÃO AUTOMÁTICA (SAP -> FRED)
// -------------------------------------------------------------------------

export interface AutoTransitionSapToFredInput {
  sapTransportNumber: string
  cargoId: string
  negotiationId?: string
  driverId: string
  driverName: string
  driverPhone?: string
  vehiclePlate: string
  vehicleType?: string
  carrierName?: string
  originPlant?: string
  itineraryCode: string
  deliveries: Array<{
    sequence: number
    customerCode: string
    customerName: string
    destinationCity: string
    destinationUf: string
    streetAddress?: string
    contactName?: string
    contactPhone?: string
    salesRepName?: string
    salesRepPhone?: string
    orders: string[]
    invoices: string[]
    weightKg: number
    windowStart?: string
    windowEnd?: string
    unloadingNotes?: string
    initialPlannedArrival: string
  }>
}

/**
 * Cria a estrutura de acompanhamento do Fred sem exigir recadastro manual
 */
export function initializeFredTrackingFromSap(input: AutoTransitionSapToFredInput): {
  transport: Omit<FredTransportEntity, 'id' | 'created' | 'updated'>
  deliveries: Array<Omit<FredDeliveryEntity, 'id' | 'created' | 'updated'>>
  initialTimelineEvent: Omit<FredTimelineEventEntity, 'id' | 'created' | 'updated'>
  welcomeMessage: Omit<FredMessageEntity, 'id' | 'created' | 'updated'>
} {
  const nowIso = new Date().toISOString()
  const totalWeight = input.deliveries.reduce((sum, d) => sum + (d.weightKg || 0), 0)
  const destSummary = Array.from(new Set(input.deliveries.map((d) => d.destinationCity))).join(
    ' / ',
  )

  const transport: Omit<FredTransportEntity, 'id' | 'created' | 'updated'> = {
    sap_transport_number: input.sapTransportNumber,
    cargo_id: input.cargoId,
    negotiation_id: input.negotiationId,
    driver_id: input.driverId,
    driver_name: input.driverName,
    driver_phone: input.driverPhone,
    vehicle_plate: input.vehiclePlate,
    vehicle_type: input.vehicleType,
    carrier_name: input.carrierName,
    origin_plant: input.originPlant || 'CIAFAL Matriz (São Paulo/SP)',
    itinerary_code: input.itineraryCode,
    destination_summary: destSummary,
    total_weight_kg: totalWeight,
    total_deliveries_count: input.deliveries.length,
    completed_deliveries_count: 0,
    trip_status: 'AGUARDANDO_SAIDA',
    started_at: nowIso,
    overall_eta_status: 'AGUARDANDO',
    delay_minutes_current: 0,
    active_occurrences_count: 0,
    active_actor: 'FRED_IA',
    total_ai_messages_count: 1,
    total_human_messages_count: 0,
    ai_duration_seconds: 0,
    human_duration_seconds: 0,
    geo_tracking_authorized: false,
    sales_representatives_json: JSON.stringify(
      input.deliveries.map((d) => ({
        salesRep: d.salesRepName,
        phone: d.salesRepPhone,
        customer: d.customerName,
      })),
    ),
  }

  const deliveries: Array<Omit<FredDeliveryEntity, 'id' | 'created' | 'updated'>> =
    input.deliveries.map((d) => ({
      sap_transport_number: input.sapTransportNumber,
      sequence_order: d.sequence,
      customer_code: d.customerCode,
      customer_name: d.customerName,
      destination_city: d.destinationCity,
      destination_uf: d.destinationUf,
      street_address: d.streetAddress,
      contact_name: d.contactName,
      contact_phone: d.contactPhone,
      sales_rep_name: d.salesRepName,
      sales_rep_phone: d.salesRepPhone,
      orders_list_json: JSON.stringify(d.orders),
      invoice_numbers_json: JSON.stringify(d.invoices),
      weight_kg: d.weightKg,
      window_start_time: d.windowStart || '08:00',
      window_end_time: d.windowEnd || '17:00',
      unloading_restriction_notes: d.unloadingNotes,
      initial_planned_arrival: d.initialPlannedArrival,
      current_eta: d.initialPlannedArrival,
      avg_historical_unloading_min: 45,
      status: 'PENDENTE',
      eta_status: 'AGUARDANDO',
      discharge_confirmed_by_client: false,
    }))

  const initialTimelineEvent: Omit<FredTimelineEventEntity, 'id' | 'created' | 'updated'> = {
    sap_transport_number: input.sapTransportNumber,
    event_code: 'FRED_TRACKING_STARTED',
    event_title: 'Acompanhamento Fred Iniciado',
    event_description: `Transporte SAP ${input.sapTransportNumber} transferido automaticamente para o Fred com ${input.deliveries.length} entregas previstas.`,
    event_source: 'FRED_IA',
    event_severity: 'INFO',
    event_timestamp: nowIso,
  }

  const firstName = input.driverName.split(' ')[0]
  const welcomeMessage: Omit<FredMessageEntity, 'id' | 'created' | 'updated'> = {
    sap_transport_number: input.sapTransportNumber,
    sender_type: 'FRED_IA',
    sender_name: 'Fred IA (CIAFAL)',
    target_audience: 'MOTORISTA',
    message_channel: 'WHATSAPP',
    message_text: `Olá, ${firstName}. Sou o Fred, assistente de acompanhamento de transporte da CIAFAL. Vou acompanhar sua viagem do Transporte SAP ${input.sapTransportNumber} e ajudar caso tenha alguma necessidade durante as entregas.`,
    message_type: 'TEXTO',
    is_delivered: true,
    is_read: false,
  }

  return { transport, deliveries, initialTimelineEvent, welcomeMessage }
}

// -------------------------------------------------------------------------
// 2. CÁLCULO INTELIGENTE DE ETA E CLASSIFICAÇÃO DE STATUS
// -------------------------------------------------------------------------

export interface CalculateEtaInput {
  initialPlannedArrival: string | Date
  currentEstimatedArrival: string | Date
  actualArrival?: string | Date
  isDelivered?: boolean
  windowEndTimeStr?: string // ex: "16:00"
}

export interface EtaClassificationResult {
  status: EtaStatus
  delayMinutes: number
  badgeColor: string
  badgeLabel: string
  isOverCustomerWindow: boolean
}

/**
 * Classifica a pontualidade da parada:
 * 🟢 Dentro do previsto (delay <= 10 min)
 * 🟡 Risco de atraso (delay 11-30 min)
 * 🔴 Atrasado (delay > 30 min ou ultrapassa janela do cliente)
 * 🔵 Entregue
 * ⚪ Aguardando
 */
export function calculateEtaClassification(input: CalculateEtaInput): EtaClassificationResult {
  if (input.isDelivered) {
    return {
      status: 'ENTREGUE',
      delayMinutes: 0,
      badgeColor: 'bg-blue-600 text-white',
      badgeLabel: 'Entregue',
      isOverCustomerWindow: false,
    }
  }

  const initialTime = new Date(input.initialPlannedArrival).getTime()
  const currentTime = new Date(input.currentEstimatedArrival).getTime()

  if (isNaN(initialTime) || isNaN(currentTime)) {
    return {
      status: 'AGUARDANDO',
      delayMinutes: 0,
      badgeColor: 'bg-slate-200 text-slate-700',
      badgeLabel: 'Aguardando',
      isOverCustomerWindow: false,
    }
  }

  const diffMinutes = Math.round((currentTime - initialTime) / (1000 * 60))

  let isOverCustomerWindow = false
  if (input.windowEndTimeStr) {
    const [h, m] = input.windowEndTimeStr.split(':').map((v) => parseInt(v, 10) || 0)
    const etaDate = new Date(input.currentEstimatedArrival)
    const windowDate = new Date(etaDate)
    windowDate.setHours(h, m, 0, 0)
    if (etaDate.getTime() > windowDate.getTime()) {
      isOverCustomerWindow = true
    }
  }

  if (diffMinutes <= 10 && !isOverCustomerWindow) {
    return {
      status: 'DENTRO_PREVISTO',
      delayMinutes: Math.max(0, diffMinutes),
      badgeColor: 'bg-emerald-600 text-white',
      badgeLabel: diffMinutes > 0 ? `No prazo (+${diffMinutes}m)` : 'No prazo',
      isOverCustomerWindow: false,
    }
  }

  if (diffMinutes <= 30 && !isOverCustomerWindow) {
    return {
      status: 'RISCO_ATRASO',
      delayMinutes: diffMinutes,
      badgeColor: 'bg-amber-500 text-white',
      badgeLabel: `Risco (+${diffMinutes}m)`,
      isOverCustomerWindow: false,
    }
  }

  return {
    status: 'ATRASADO',
    delayMinutes: diffMinutes,
    badgeColor: 'bg-rose-600 text-white',
    badgeLabel: isOverCustomerWindow
      ? `Atrasado (+${diffMinutes}m / Fora Janela)`
      : `Atrasado (+${diffMinutes}m)`,
    isOverCustomerWindow,
  }
}

// -------------------------------------------------------------------------
// 3. REGRA DE GEOLOCALIZAÇÃO: NUNCA MOSTRAR LOCALIZAÇÃO ANTIGA COMO ATUAL
// -------------------------------------------------------------------------

export interface FormatLocationTimestampResult {
  formattedText: string
  minutesAgo: number
  isStale: boolean
  indicatorColor: string
}

/**
 * Formata a última localização informando a defasagem temporal (ex: "Última localização: 14:37 — atualizada há 8 minutos")
 * Se > 30 minutos sem sinal, marca como defasada/sem comunicação.
 */
export function formatLocationFreshness(
  updatedAtIso?: string,
  staleThresholdMinutes = 30,
): FormatLocationTimestampResult {
  if (!updatedAtIso) {
    return {
      formattedText: 'Localização não disponível',
      minutesAgo: -1,
      isStale: true,
      indicatorColor: 'text-slate-400 bg-slate-100',
    }
  }

  const updatedDate = new Date(updatedAtIso)
  const now = new Date()
  const diffMinutes = Math.max(0, Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60)))

  const timeStr = updatedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const isStale = diffMinutes >= staleThresholdMinutes

  let formattedText = `Última localização: ${timeStr} — atualizada há ${diffMinutes} minuto${diffMinutes === 1 ? '' : 's'}`
  if (diffMinutes === 0) {
    formattedText = `Última localização: ${timeStr} — atualizada agora`
  } else if (isStale) {
    formattedText = `⚠️ Sinal antigo: ${timeStr} (há ${diffMinutes} min) — Sem atualização recente`
  }

  return {
    formattedText,
    minutesAgo: diffMinutes,
    isStale,
    indicatorColor: isStale
      ? 'text-amber-700 bg-amber-50 border-amber-300'
      : 'text-emerald-700 bg-emerald-50 border-emerald-300',
  }
}

// -------------------------------------------------------------------------
// 4. CLASSIFICAÇÃO E SUGESTÃO DE IMAGENS COM EXIGÊNCIA DE CONFIRMAÇÃO HUMANA
// -------------------------------------------------------------------------

// WHATSAPP BUSINESS & AUDIO TRANSCRIBER INTERFACES
export type WhatsAppSenderRole =
  | 'MOTORISTA'
  | 'REPRESENTANTE'
  | 'VENDEDOR'
  | 'CLIENTE'
  | 'OPERADOR_INTERNO'
  | 'DESCONHECIDO'

export type WhatsAppMessageType =
  | 'TEXTO'
  | 'AUDIO'
  | 'IMAGEM'
  | 'DOCUMENTO'
  | 'LOCALIZACAO'
  | 'STATUS_ENTREGA'
  | 'OUTRO'

export type FredIntentCategory =
  | 'POSICAO_LOCALIZACAO'
  | 'PREVISAO_CHEGADA'
  | 'ATRASO'
  | 'CHEGADA_CLIENTE'
  | 'INICIO_DESCARGA'
  | 'FIM_DESCARGA'
  | 'RECUSA_RECEBIMENTO'
  | 'ESPERA_FILA'
  | 'PROBLEMA_MECANICO'
  | 'ACIDENTE'
  | 'BLOQUEIO_RODOVIA'
  | 'PROBLEMA_DOCUMENTAL'
  | 'SOLICITACAO_CLIENTE'
  | 'ALTERACAO_JANELA'
  | 'FOTO_COMPROVANTE'
  | 'OCORRENCIA_GERAL'
  | 'SOLICITACAO_VENDEDOR'
  | 'CONSULTA_TRANSPORTE'
  | 'AVALIACAO_MOTORISTA'
  | 'CONTESTACAO_AVALIACAO'
  | 'OUTROS'

export interface WhatsAppWebhookEventEntity {
  id?: string
  message_wamid?: string
  phone_number: string
  sender_role: WhatsAppSenderRole
  sender_name?: string
  sap_transport_number?: string
  driver_id?: string
  customer_code?: string
  message_type: WhatsAppMessageType
  raw_text?: string
  media_url?: string
  media_file_name?: string
  media_mime_type?: string
  audio_duration_seconds?: number
  audio_transcription?: string
  transcription_confidence_pct?: number
  ai_intent: FredIntentCategory
  ai_intent_confidence?: number
  latitude?: number
  longitude?: number
  location_address?: string
  location_speed_kmh?: number
  is_proactive_alert?: boolean
  message_status:
    | 'RECEBIDA'
    | 'TRANSCRITA'
    | 'INTENCAO_IDENTIFICADA'
    | 'PROCESSADA'
    | 'HUMAN_REVIEW_REQUIRED'
    | 'FALHA'
  response_sent_text?: string
  action_executed?: string
  read_at?: string
  is_ai_origin?: boolean
  correlation_id?: string
  created?: string
}

export interface ClassifyFredIntentInput {
  rawText?: string
  audioTranscription?: string
  hasImage?: boolean
  hasLocation?: boolean
  hasDocument?: boolean
}

export interface ClassifyFredIntentResult {
  intent: FredIntentCategory
  confidencePct: number
  suggestedAction: string
  standardFriendlyResponse: string
  requiresHumanIntervention: boolean
}

/**
 * Classificador Determinístico e Semântico de Intenções do Fred
 */
export function classifyFredIntent(input: ClassifyFredIntentInput): ClassifyFredIntentResult {
  const combined = ((input.rawText || '') + ' ' + (input.audioTranscription || '')).toLowerCase()

  if (input.hasLocation) {
    return {
      intent: 'POSICAO_LOCALIZACAO',
      confidencePct: 98,
      suggestedAction: 'Atualizar coordenadas GPS, calcular distância restante e reestimar ETA.',
      standardFriendlyResponse:
        'Localização recebida. Atualizamos sua posição na Torre de Controle.',
      requiresHumanIntervention: false,
    }
  }

  if (
    combined.includes('contest') ||
    combined.includes('revis') ||
    combined.includes('injusta') ||
    combined.includes('descont')
  ) {
    return {
      intent: 'CONTESTACAO_AVALIACAO',
      confidencePct: 95,
      suggestedAction: 'Abrir protocolo formal em driver_performance_appeals e notificar gestor.',
      standardFriendlyResponse:
        'Recebi sua solicitação de revisão de avaliação. O caso foi registrado e será analisado pela gestão com apoio da IA.',
      requiresHumanIntervention: true,
    }
  }

  if (
    combined.includes('atras') ||
    combined.includes('demorar') ||
    combined.includes('transito') ||
    combined.includes('engarraf')
  ) {
    return {
      intent: 'ATRASO',
      confidencePct: 92,
      suggestedAction: 'Recalcular ETA e atualizar status do transporte para RISCO_ATRASO.',
      standardFriendlyResponse:
        'Entendido. Registrei a informação de atraso e estamos recalculando sua janela de chegada.',
      requiresHumanIntervention: false,
    }
  }

  if (
    combined.includes('pneu') ||
    combined.includes('quebr') ||
    combined.includes('mecanic') ||
    combined.includes('guincho')
  ) {
    return {
      intent: 'PROBLEMA_MECANICO',
      confidencePct: 94,
      suggestedAction: 'Criar ocorrência PANE_MECANICA (severidade ALTA) e acionar suporte.',
      standardFriendlyResponse:
        'Ocorrência mecânica registrada. Você já acionou o socorro ou necessita de apoio da CIAFAL?',
      requiresHumanIntervention: true,
    }
  }

  if (
    combined.includes('recus') ||
    combined.includes('não quer receber') ||
    combined.includes('portaria fechada') ||
    combined.includes('fechou')
  ) {
    return {
      intent: 'RECUSA_RECEBIMENTO',
      confidencePct: 96,
      suggestedAction: 'Gerar alerta crítico para o Representante Comercial no CRM 360.',
      standardFriendlyResponse:
        'Alerta de recusa/impossibilidade de entrega registrado. Estamos contatando o vendedor e cliente imediatamente.',
      requiresHumanIntervention: true,
    }
  }

  if (
    combined.includes('cheguei') ||
    combined.includes('na portaria') ||
    combined.includes('no cliente') ||
    combined.includes('no patio')
  ) {
    return {
      intent: 'CHEGADA_CLIENTE',
      confidencePct: 95,
      suggestedAction: 'Atualizar parada para NA_PORTARIA e iniciar cronômetro de espera.',
      standardFriendlyResponse:
        'Perfeito! Chegada no cliente confirmada. Me avise quando chamarem para a doca de descarga.',
      requiresHumanIntervention: false,
    }
  }

  if (
    combined.includes('descarreg') ||
    combined.includes('finaliz') ||
    combined.includes('conclui') ||
    combined.includes('liberado')
  ) {
    return {
      intent: 'FIM_DESCARGA',
      confidencePct: 96,
      suggestedAction: 'Atualizar parada para ENTREGUE e solicitar canhoto assinado.',
      standardFriendlyResponse:
        'Excelente! Descarga concluída. Por gentileza, nos envie a foto do canhoto ou comprovante assinado.',
      requiresHumanIntervention: false,
    }
  }

  if (
    input.hasImage ||
    combined.includes('foto') ||
    combined.includes('canhoto') ||
    combined.includes('comprovante')
  ) {
    return {
      intent: 'FOTO_COMPROVANTE',
      confidencePct: 90,
      suggestedAction: 'Vincular imagem como evidência fiscal no transporte SAP.',
      standardFriendlyResponse:
        'Comprovante recebido com sucesso. Anexado ao registro fiscal da viagem.',
      requiresHumanIntervention: false,
    }
  }

  return {
    intent: 'OUTROS',
    confidencePct: 75,
    suggestedAction: 'Registrar mensagem no histórico para auditoria e acompanhamento humano.',
    standardFriendlyResponse: 'Mensagem recebida pelo assistente Fred.',
    requiresHumanIntervention: false,
  }
}

export interface ImageAnalysisSuggestion {
  suggestedTag: FredEvidenceEntity['evidence_type']
  suggestedOccurrenceCategory?: OccurrenceCategory
  confidencePct: number
  description: string
  requiresHumanConfirmation: boolean
  questionToDriver: string
}

/**
 * Analisa a evidência visual e sugere classificação SEM torná-la fato definitivo antes da confirmação.
 */
export function analyzeImageEvidence(
  fileName: string,
  rawDescription = '',
): ImageAnalysisSuggestion {
  const lower = (fileName + ' ' + rawDescription).toLowerCase()

  if (
    lower.includes('canhoto') ||
    lower.includes('assinado') ||
    lower.includes('carimbo') ||
    lower.includes('nf')
  ) {
    return {
      suggestedTag: 'CANHOTO_ASSINADO',
      confidencePct: 96,
      description: 'Documento aparenta ser canhoto de nota fiscal com assinatura.',
      requiresHumanConfirmation: true,
      questionToDriver:
        'Entendi que você enviou o canhoto assinado. Deseja registrar a entrega como concluída?',
    }
  }

  if (lower.includes('fila') || lower.includes('espera') || lower.includes('patio')) {
    return {
      suggestedTag: 'FOTO_FILA_DESCARGA',
      suggestedOccurrenceCategory: 'FILA_ESPERA',
      confidencePct: 88,
      description: 'Imagem com veículos alinhados sugerindo fila de espera na recepção.',
      requiresHumanConfirmation: true,
      questionToDriver: 'Entendi. Você está aguardando na fila para descarga no cliente?',
    }
  }

  if (
    lower.includes('portaria') ||
    lower.includes('fechada') ||
    lower.includes('fechado') ||
    lower.includes('portao')
  ) {
    return {
      suggestedTag: 'FOTO_PORTARIA_FECHADA',
      suggestedOccurrenceCategory: 'CLIENTE_FECHADO',
      confidencePct: 91,
      description: 'Portão ou portaria fechada identificado na imagem.',
      requiresHumanConfirmation: true,
      questionToDriver: 'Você está no cliente e encontrou a portaria fechada?',
    }
  }

  if (
    lower.includes('avaria') ||
    lower.includes('danificado') ||
    lower.includes('quebrado') ||
    lower.includes('amassado')
  ) {
    return {
      suggestedTag: 'FOTO_AVARIA',
      suggestedOccurrenceCategory: 'AVARIA_CARGA',
      confidencePct: 89,
      description: 'Indício de avaria ou inconformidade visual no produto.',
      requiresHumanConfirmation: true,
      questionToDriver:
        'Identifiquei possível avaria na mercadoria. Deseja abrir uma ocorrência de inspeção?',
    }
  }

  return {
    suggestedTag: 'FOTO_MERCADORIA',
    confidencePct: 75,
    description: 'Registro fotográfico geral da operação.',
    requiresHumanConfirmation: true,
    questionToDriver:
      'Foto recebida. Gostaria de vincular esta imagem a qual parada ou ocorrência?',
  }
}

// -------------------------------------------------------------------------
// 5. SEGURANÇA, PRIVACIDADE E SEGREGACÃO DE PÚBLICOS (LGPD & RBAC)
// -------------------------------------------------------------------------

export interface FormatMessageForAudienceInput {
  rawContent: string
  audience: TargetAudience
  sapTransportNumber: string
  driverName: string
  vehiclePlate: string
  currentEtaStr?: string
  clientName?: string
  freightFinancialDetails?: {
    freightValueDriver?: number
    tollCost?: number
    marginPct?: number
  }
}

/**
 * Garante que informações comerciais confidenciais (margens, valores pagos a terceiros, dados restritos)
 * NUNCA sejam vazadas para Motoristas ou Clientes.
 */
export function formatMessageForAudience(input: FormatMessageForAudienceInput): string {
  const {
    audience,
    rawContent,
    sapTransportNumber,
    driverName,
    vehiclePlate,
    currentEtaStr,
    clientName,
  } = input

  if (audience === 'CLIENTE') {
    // Cliente recebe apenas dados da sua entrega, veículo e ETA
    return `Olá! A CIAFAL informa que o Transporte ${sapTransportNumber} (Veículo ${vehiclePlate}) está a caminho de ${clientName || 'sua unidade'}. Previsão atual: ${currentEtaStr || 'em rota'}.`
  }

  if (audience === 'MOTORISTA') {
    // Motorista não vê margem corporativa da CIAFAL
    return rawContent
  }

  if (audience === 'VENDEDOR' || audience === 'REPRESENTANTE') {
    // Vendedor vê status de entrega e ocorrências de seus clientes
    return `[CIAFAL Logística] Transporte SAP ${sapTransportNumber} | Motorista: ${driverName} (${vehiclePlate}) | Próxima Parada: ${clientName || 'Cliente'} | Previsão: ${currentEtaStr || 'Conforme agendado'}. Mensagem: ${rawContent}`
  }

  // OPERACAO_INTERNA: Acesso completo
  return rawContent
}

// -------------------------------------------------------------------------
// 6. ANÁLISE DE IA: SEPARAÇÃO ESTRITA ENTRE FATO OBSERVADO × HIPÓTESE
// -------------------------------------------------------------------------

export interface FormattedAiAnomalyAnalysis {
  detectedFact: string
  aiHypothesis: string
  confidenceLevel: 'ALTA' | 'MEDIA' | 'BAIXA'
  evidenceComparison: string
  recommendedInvestigation: string
  disclaimerText: string
}

/**
 * Gera estrutura analítica garantindo que a IA nunca acuse motorista/cliente exclusivamente por correlação estatística.
 */
export function buildAiAnomalyReport(
  entityName: string,
  measuredAvgMinutes: number,
  registeredParamMinutes: number,
  sampleCount: number,
): FormattedAiAnomalyAnalysis {
  const deviation = measuredAvgMinutes - registeredParamMinutes
  const confLevel = sampleCount >= 10 ? 'ALTA' : sampleCount >= 5 ? 'MEDIA' : 'BAIXA'

  return {
    detectedFact: `FATO OBSERVADO: ${entityName} apresentou tempo médio real de descarga de ${measuredAvgMinutes} minutos em ${sampleCount} viagens analisadas (Parâmetro cadastrado: ${registeredParamMinutes} min).`,
    aiHypothesis: `HIPÓTESE DA IA: Possível gargalo na triagem de entrada ou pico de recebimento no período vespertino gerando desvio médio de +${deviation} min.`,
    confidenceLevel: confLevel,
    evidenceComparison: `Comparativo: Cadastrado = ${registeredParamMinutes} min | Real Médio = ${measuredAvgMinutes} min | Desvio = +${deviation} min (${Math.round((deviation / registeredParamMinutes) * 100)}%).`,
    recommendedInvestigation: `Recomendação: Avaliar histórico com o representante comercial e investigar processo de recepção antes de alterar cadastro mestre.`,
    disclaimerText:
      '⚠️ Princípio de Auditoria CIAFAL: Hipótese estatística da IA sujeita a verificação humana. Não constitui penalidade automática.',
  }
}
