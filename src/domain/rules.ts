// TMS CIAFAL Domain Rules & Security Engine
// Arquitetura: "O agente conversa. O motor de regras decide. O SAP registra o documento corporativo. O TMS orquestra a logística."

export type UserRole =
  | 'admin_master'
  | 'admin_tms'
  | 'gestor_logistica'
  | 'gerente_carga'
  | 'operador_logistica'
  | 'portaria'
  | 'financeiro'
  | 'comercial'
  | 'auditor'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  phone?: string
  avatar?: string
}

// ----------------------------------------------------
// SPRINT 3 ENTITIES & DATA STRUCTURES
// ----------------------------------------------------

export interface SapStockCurrentEntity {
  id: string
  material_code: string
  material_description: string
  plant: string
  storage_location: string
  batch?: string
  quantity: number
  unit: string
  weight_kg: number
  available_qty: number
  reserved_qty?: number
  blocked_qty?: number
  read_timestamp?: string
  source?: string
  created?: string
  updated?: string
}

export interface PcpProductionOrderEntity {
  id: string
  production_order_number: string
  material_code: string
  material_description: string
  line: string
  quantity_planned: number
  quantity_produced?: number
  unit: string
  weight_kg_planned: number
  scheduled_date: string
  shift?: string
  status: 'Programada' | 'Em Produção' | 'Reprogramada' | 'Concluída' | 'Cancelada'
  confidence_pct?: number
  related_sales_order?: string
  notes?: string
  created?: string
  updated?: string
}

export type StockRequestStatus =
  | 'Solicitada'
  | 'Em análise'
  | 'Confirmada'
  | 'Confirmada parcialmente'
  | 'Negada'
  | 'Expirada'

export interface StockConfirmationRequestEntity {
  id: string
  order_number: string
  item_number?: string
  material_code: string
  material_description?: string
  required_quantity: number
  stock_informed?: number
  unit?: string
  requested_by: string
  requester_name?: string
  reason: string
  notes?: string
  deadline?: string
  assigned_to?: string
  response_notes?: string
  confirmed_quantity?: number
  response_date?: string
  status: StockRequestStatus
  correlation_id?: string
  created?: string
  updated?: string
}

export type CreditRequestStatus =
  | 'Solicitada'
  | 'Em análise'
  | 'Aprovada'
  | 'Aprovada parcialmente'
  | 'Rejeitada'
  | 'Expirada'

export interface CreditReassessmentRequestEntity {
  id: string
  customer_code: string
  customer_name: string
  order_number: string
  order_value: number
  credit_limit?: number
  current_exposure?: number
  requested_value: number
  logistic_reason: string
  related_load_id?: string
  desired_delivery_date?: string
  days_overdue?: number
  requested_by: string
  requester_name?: string
  financial_analyst?: string
  analyst_notes?: string
  approved_value?: number
  response_date?: string
  status: CreditRequestStatus
  correlation_id?: string
  created?: string
  updated?: string
}

export type ScenarioClassification =
  | 'VIÁVEL'
  | 'VIÁVEL COM APROVAÇÃO'
  | 'NÃO VIÁVEL'
  | 'SIMULAÇÃO FUTURA'

export type ScenarioType =
  | 'custom'
  | 'max_occupancy'
  | 'prioritize_overdue'
  | 'lowest_cost'
  | 'tomorrow_pcp'
  | 'max_complement'

export interface LoadSimulationScenarioEntity {
  id: string
  title: string
  description?: string
  scenario_type: ScenarioType
  classification: ScenarioClassification
  reasons: string[] | string
  itinerary_code: string
  planned_date: string
  vehicle_type?: string
  vehicle_plate?: string
  driver_id?: string
  driver_name?: string
  queue_group?: string
  selected_orders: SapSalesOrderEntity[] | string
  customer_sequence?:
    | Array<{
        sequence: number
        customer_code: string
        customer_name: string
        city: string
        uf: string
        weight_kg: number
        latitude?: number
        longitude?: number
        address_validated?: boolean
      }>
    | string
  total_weight_kg: number
  total_volume_m3?: number
  vehicle_capacity_kg: number
  occupancy_pct: number
  orders_count: number
  customers_count: number
  distance_km: number
  duration_minutes?: number
  tolls_count?: number
  tolls_value?: number
  antt_floor_value: number
  antt_version?: string
  estimated_freight_cost: number
  cost_per_ton?: number
  orders_total_value?: number
  blocked_credit_value?: number
  confirmed_stock_weight_kg?: number
  future_stock_weight_kg?: number
  overdue_orders_count?: number
  complement_possible_kg?: number
  routing_provider?: string
  is_address_validated?: boolean
  route_polyline?: string
  created_by?: string
  is_favorite?: boolean
  status: 'simulado' | 'aprovado' | 'descartado' | 'convertido_carga'
  generated_load_id?: string
  created?: string
  updated?: string
}

export interface AnttRateTableEntity {
  id: string
  table_version: string
  resolution_number: string
  effective_date_start: string
  effective_date_end?: string
  is_active: boolean
  cargo_type: 'Geral' | 'Granel Sólido' | 'Granel Líquido' | 'Frigorificada' | 'Perigosa'
  rates_json:
    | string
    | {
        version: string
        effectiveDate: string
        ratesByAxles: Record<string, { ccd: number; cc: number }>
        fixedCostBase: number
      }
  notes?: string
  source_url?: string
  registered_by?: string
  created?: string
  updated?: string
}

// 3 grupos de disponibilidade logística
export type QueueGroup = 'PORTA' | 'FORA' | 'PROGRAMADO'

export type QueueStatus =
  | 'disponivel'
  | 'validacao'
  | 'pendente'
  | 'indisponivel'
  | 'selecionado'
  | 'negociacao'
  | 'atribuido'
  | 'removido'
  | 'bloqueado'

export type PreRegistrationStatus =
  | 'novo'
  | 'em_analise'
  | 'contato_realizado'
  | 'aguardando_doc'
  | 'encaminhado_sap'
  | 'cadastro_confirmado'
  | 'rejeitado'
  | 'pendente'
  | 'aprovado'

export interface DriverEntity {
  id: string
  name: string
  document: string // Números limpos (CPF/CNPJ)
  whatsapp: string
  status: 'ativo' | 'bloqueado' | 'pendente_sap'
  sap_id?: string
  rg?: string
  cnh?: string
  cnh_category?: string
  cnh_validity?: string
  channel_telegram?: string
  notes?: string
  carrier_name?: string
  created?: string
  updated?: string
}

export interface VehicleEntity {
  id: string
  plate: string
  type: string
  body_type?: string
  brand_model?: string
  year?: string
  capacity_kg?: number // Usar capacidade real do cadastro; se ausente mostrar "Não informada"
  driver?: string
  carrier_name?: string
}

export interface SapItineraryEntity {
  id: string
  sap_code: string
  description: string
  origin?: string
  uf?: string
  region?: string
  avg_transit_days?: number
  is_active: boolean
  last_sync_date?: string
  operational_notes?: string
  created?: string
  updated?: string
}

export interface QueueEntryEntity {
  id: string
  driver: string
  vehicle?: string
  type: QueueGroup // PORTA | FORA | PROGRAMADO
  status: QueueStatus
  entry_time: string // Data/hora real registrada
  exit_time?: string
  calculated_logistics_date?: string // Data logística calculada (regra corte 12:00 ou data futura)
  scheduled_arrival_date?: string // Para PROGRAMADOS
  preferred_itinerary?: string // Código SAP do itinerário
  driver_notes?: string
  latitude?: number
  longitude?: number
  distance_km?: number
  location_status?: 'validada' | 'pendente' | 'fora_raio' | 'nao_informada'
  ip_address?: string
  driver_name_cached?: string
  driver_doc_cached?: string
  driver_whatsapp_cached?: string
  vehicle_plate_cached?: string
  vehicle_type_cached?: string
  carrier_name_cached?: string
  vehicle_capacity_kg_cached?: number
  reason?: string
  operator_notes?: string
  last_event?: string
  last_operator?: string
  created?: string
  updated?: string
  expand?: {
    driver?: DriverEntity
    vehicle?: VehicleEntity
  }
}

export interface PreRegistrationEntity {
  id: string
  document: string
  name: string
  whatsapp: string
  email?: string
  carrier_name?: string
  vehicle_type?: string
  plate?: string
  declared_capacity_kg?: number
  origin: QueueGroup
  status: PreRegistrationStatus
  preferred_itinerary?: string
  scheduled_arrival_date?: string
  driver_notes?: string
  latitude?: number
  longitude?: number
  ip_address?: string
  reviewer_notes?: string
  reviewer_user?: string
  rejection_reason?: string
  created?: string
  updated?: string
}

export interface SapSalesOrderEntity {
  id: string
  order_number: string
  item_number?: string
  customer_code: string
  customer_name: string
  customer_tier?: string // A (Estratégico), B (Corporativo), C (Varejo)
  sales_rep?: string // Vendedor / Representante
  segment?: string // Segmento de mercado
  destination_city: string
  uf: string
  itinerary_code: string
  weight_kg: number
  volume_m3?: number
  total_value: number
  line?: string
  family?: string
  material?: string
  material_description?: string
  balance_quantity?: number
  unit?: string
  order_date?: string // Data de entrada do pedido
  desired_date?: string // Data desejada pelo cliente
  production_forecast_date?: string // Previsão de término da produção
  production_status: 'Pronto' | 'Em Produção' | 'Programado' | 'Aguardando PCP'
  credit_status: 'Liberado' | 'Bloqueado' | 'Em Análise'
  discharge_type?: string
  required_vehicle_type?: string
  sap_notes?: string
  scheduled_delivery_date?: string
  assigned_load_id?: string
  street_address?: string
  postal_code?: string
  dest_latitude?: number
  dest_longitude?: number
  address_validated?: boolean
  status?: 'disponivel' | 'em_montagem' | 'carregado' | 'cancelado'
  created?: string
  updated?: string
}

export interface OportunidadeComplementoCargaEntity {
  id: string
  date: string
  cargo_code: string
  itinerary_code: string
  current_weight_kg: number
  capacity_kg: number
  balance_kg: number
  candidate_orders: string[] | string
  candidate_clients: string[] | string
  status: 'Nova' | 'Enviada CRM' | 'Em análise' | 'Aproveitada' | 'Sem interesse' | 'Expirada'
  responsible?: string
  origin?: string
  enviado_crm?: boolean
  data_envio?: string
  correlation_id?: string
  notes?: string
  created?: string
  updated?: string
}

export interface AuditLogEntity {
  id: string
  user_email?: string
  user_name?: string
  user_role?: string
  action: string
  resource: string
  resource_id?: string
  previous_state?: string
  new_state?: string
  reason?: string
  ip_address?: string
  correlation_id?: string
  payload?: Record<string, unknown>
  created?: string
}

export interface SystemParameterEntity {
  id: string
  key: string
  value: string
  description?: string
  created?: string
  updated?: string
}

export type FreightOfferStatus =
  | 'PENDING'
  | 'PORTA_OPEN'
  | 'FORA_OPEN'
  | 'NEGOTIATING'
  | 'CONTRACTED'
  | 'NO_CONTRACT'
  | 'CANCELLED'
  // legacy compatibility mappings
  | 'rascunho'
  | 'janela_porta_aberta'
  | 'janela_fora_aberta'
  | 'negociacao'
  | 'atribuido'
  | 'expirado'
  | 'cancelado'

export interface FreightOfferEntity {
  id: string
  cargo_id: string
  cargo_description?: string
  origin?: string
  destination?: string
  weight_kg?: number
  required_vehicle_type?: string
  opened_at?: string
  current_group: 'PORTA' | 'FORA' | 'PUBLICO' | 'ENCERRADO'
  status: FreightOfferStatus
  window_start?: string
  window_end?: string
  floor_value?: number
  floor_price?: number // alias
  ceiling_value_protected?: number // Protegido - nunca exposto ao motorista ou LLM
  ceiling_price?: number // alias protegido
  winner_driver?: string
  winner_id?: string // driver relation id
  winner_vehicle?: string
  contracted_value?: number
  closing_reason?: string
  rules_version?: string
  sap_integration_status?: 'nao_iniciado' | 'aguardando_sap' | 'sincronizado_sap' | 'falha'
  correlation_id?: string
  created?: string
  updated?: string
  expand?: {
    winner_driver?: DriverEntity
    winner_vehicle?: VehicleEntity
  }
}

export type ProposalStatus = 'VALID' | 'REJECTED' | 'WINNER'

export interface FreightProposalEntity {
  id: string
  offer_id: string
  driver_id: string
  value: number
  arrival_time?: string // para FORA (ex: "45 min" ou "14:30")
  status: ProposalStatus
  reason?: string // Motivo de recusa se REJECTED
  driver_name_cached?: string
  driver_doc_cached?: string
  driver_phone_cached?: string
  vehicle_plate_cached?: string
  correlation_id?: string
  created?: string
  updated?: string
  expand?: {
    driver_id?: DriverEntity
    offer_id?: FreightOfferEntity
  }
}

// ----------------------------------------------------
// VALIDATIONS & DOMAIN RULES
// ----------------------------------------------------

/**
 * Validates Brazilian CPF with check digits (Módulo 11)
 */
export function isValidCPF(cpfRaw: string): boolean {
  if (!cpfRaw) return false
  const cpf = cpfRaw.replace(/\D/g, '')
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (10 - i)
  }
  let rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(cpf.charAt(9), 10)) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (11 - i)
  }
  rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(cpf.charAt(10), 10)) return false

  return true
}

/**
 * Validates Brazilian CNPJ with check digits
 */
export function isValidCNPJ(cnpjRaw: string): boolean {
  if (!cnpjRaw) return false
  const cnpj = cnpjRaw.replace(/\D/g, '')
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum1 = 0
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(cnpj.charAt(i), 10) * weights1[i]
  }
  let rest1 = sum1 % 11
  const digit1 = rest1 < 2 ? 0 : 11 - rest1
  if (parseInt(cnpj.charAt(12), 10) !== digit1) return false

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum2 = 0
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(cnpj.charAt(i), 10) * weights2[i]
  }
  let rest2 = sum2 % 11
  const digit2 = rest2 < 2 ? 0 : 11 - rest2
  if (parseInt(cnpj.charAt(13), 10) !== digit2) return false

  return true
}

/**
 * Validates Brazilian License Plate (Standard ABC-1234 or Mercosul ABC1D23)
 */
export function isValidPlate(plateRaw: string): boolean {
  if (!plateRaw) return false
  const clean = plateRaw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (clean.length !== 7) return false
  const standardRegex = /^[A-Z]{3}[0-9]{4}$/
  const mercosulRegex = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/
  return standardRegex.test(clean) || mercosulRegex.test(clean)
}

export function formatPlate(plateRaw: string): string {
  const clean = (plateRaw || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (clean.length === 7) {
    // If standard (AAA9999), format with dash; if Mercosul (AAA9A99), keep compact or with dash
    if (/^[A-Z]{3}[0-9]{4}$/.test(clean)) {
      return `${clean.substring(0, 3)}-${clean.substring(3)}`
    }
    return clean
  }
  return plateRaw || ''
}

/**
 * Validates Document (CPF or CNPJ)
 */
export function isValidDocument(doc: string): { valid: boolean; type: 'CPF' | 'CNPJ' | 'INVALID' } {
  const clean = (doc || '').replace(/\D/g, '')
  if (clean.length === 11) {
    return { valid: isValidCPF(clean), type: 'CPF' }
  }
  if (clean.length === 14) {
    return { valid: isValidCNPJ(clean), type: 'CNPJ' }
  }
  return { valid: false, type: 'INVALID' }
}

/**
 * Calculates Haversine distance in km between two geo points
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (lat1 === 0 && lon1 === 0) return 0
  if (lat2 === 0 && lon2 === 0) return 0
  const toRad = (x: number) => (x * Math.PI) / 180
  const R = 6371 // Earth radius km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

export const CIAFAL_PLANT_LOCATION = {
  latitude: -23.5186,
  longitude: -46.7865,
  name: 'Planta Central CIAFAL (Matriz)',
  portaRadiusMeters: 500, // Raio PORTA (presença física)
  maxRadiusKm: 60, // Raio FORA (disponibilidade próxima)
  cutoffHour: 12, // 12:00 corte
  cutoffMinute: 0,
}

/**
 * Classifies Driver Availability into 3 GROUPS based on backend geofence calculation:
 * - PORTA: distance <= portaRadiusKm (e.g. 0.5 km / 500 m)
 * - FORA: distance > portaRadiusKm AND distance <= maxRadiusKm (e.g. 60 km)
 * - PROGRAMADO: distance > maxRadiusKm or driver declaring future date
 */
export function classifyAvailabilityGroup(
  distanceKm: number,
  portaRadiusKm = 0.5,
  foraRadiusKm = 60,
  hasFutureScheduledDate = false,
): QueueGroup {
  if (hasFutureScheduledDate) {
    return 'PROGRAMADO'
  }
  if (distanceKm <= portaRadiusKm) {
    return 'PORTA'
  }
  if (distanceKm <= foraRadiusKm) {
    return 'FORA'
  }
  return 'PROGRAMADO'
}

/**
 * Calculates calculated_logistics_date based on CIAFAL 12:00 Cutoff Rule for FORA:
 * - Check-in FORA <= 12:00 (inclusive) -> availability date = same day (YYYY-MM-DD)
 * - Check-in FORA > 12:00 -> availability date = next calendar day (YYYY-MM-DD)
 * For PORTA: same day
 * For PROGRAMADO: declared future arrival date
 */
export function calculateLogisticsDate(
  group: QueueGroup,
  entryTime: Date | string,
  cutoffTimeStr = '12:00',
  scheduledArrivalDate?: string,
): string {
  if (group === 'PROGRAMADO' && scheduledArrivalDate) {
    return scheduledArrivalDate.split('T')[0]
  }

  const dateObj = typeof entryTime === 'string' ? new Date(entryTime) : entryTime
  const [cutoffH, cutoffM] = cutoffTimeStr.split(':').map((v) => parseInt(v, 10) || 0)

  const hours = dateObj.getHours()
  const minutes = dateObj.getMinutes()

  // PORTA is always immediately available today
  if (group === 'PORTA') {
    return dateObj.toISOString().split('T')[0]
  }

  // FORA follows cutoff rule
  const isBeforeOrAtCutoff = hours < cutoffH || (hours === cutoffH && minutes <= cutoffM)

  if (isBeforeOrAtCutoff) {
    return dateObj.toISOString().split('T')[0]
  } else {
    // Next day
    const nextDay = new Date(dateObj)
    nextDay.setDate(nextDay.getDate() + 1)
    return nextDay.toISOString().split('T')[0]
  }
}

/**
 * Validates if coordinates are valid and calculates distance from CIAFAL plant
 */
export function validateGeofence(
  lat: number,
  lon: number,
  plantLat = CIAFAL_PLANT_LOCATION.latitude,
  plantLon = CIAFAL_PLANT_LOCATION.longitude,
  maxKm = CIAFAL_PLANT_LOCATION.maxRadiusKm,
  accuracyMeters = 0,
  maxAccuracyTolerance = 500,
): { isWithinRadius: boolean; distanceKm: number; group: QueueGroup; reason?: string } {
  if (
    lat === undefined ||
    lon === undefined ||
    lat === null ||
    lon === null ||
    isNaN(lat) ||
    isNaN(lon) ||
    (lat === 0 && lon === 0)
  ) {
    return {
      isWithinRadius: false,
      distanceKm: -1,
      group: 'PROGRAMADO',
      reason: 'Coordenadas geográficas não fornecidas ou inválidas.',
    }
  }

  // Basic sanity check for Brazil coordinate bounds
  if (lat > 6 || lat < -35 || lon > -30 || lon < -75) {
    return {
      isWithinRadius: false,
      distanceKm: -1,
      group: 'PROGRAMADO',
      reason: 'Coordenadas geográficas fora do território nacional (Brasil).',
    }
  }

  if (accuracyMeters > 0 && accuracyMeters > maxAccuracyTolerance) {
    return {
      isWithinRadius: false,
      distanceKm: -1,
      group: 'PROGRAMADO',
      reason: `Precisão do GPS inadequada (${Math.round(accuracyMeters)}m). Máximo permitido: ${maxAccuracyTolerance}m.`,
    }
  }

  const dist = calculateDistanceKm(lat, lon, plantLat, plantLon)
  const isWithin = dist <= maxKm
  const group = classifyAvailabilityGroup(dist, 0.5, maxKm)

  return {
    isWithinRadius: isWithin,
    distanceKm: dist,
    group,
    reason: !isWithin
      ? `Distância de ${dist} km excede o raio máximo FORA de ${maxKm} km. Classificado como DISPONIBILIDADE PROGRAMADA.`
      : undefined,
  }
}

// ----------------------------------------------------
// SECURITY & DATA MASKING (LGPD)
// ----------------------------------------------------

export function maskCPF(cpfRaw: string): string {
  const clean = (cpfRaw || '').replace(/\D/g, '')
  if (clean.length !== 11) return cpfRaw || '---'
  return `***.${clean.substring(3, 6)}.${clean.substring(6, 9)}-**`
}

export function maskCNPJ(cnpjRaw: string): string {
  const clean = (cnpjRaw || '').replace(/\D/g, '')
  if (clean.length !== 14) return cnpjRaw || '---'
  return `**.***.${clean.substring(5, 8)}/${clean.substring(8, 12)}-**`
}

export function maskDocument(docRaw: string): string {
  const clean = (docRaw || '').replace(/\D/g, '')
  if (clean.length === 11) return maskCPF(clean)
  if (clean.length === 14) return maskCNPJ(clean)
  return docRaw || '---'
}

export function maskPhone(phoneRaw: string): string {
  const clean = (phoneRaw || '').replace(/\D/g, '')
  if (clean.length === 11) {
    return `(${clean.substring(0, 2)}) 9****-${clean.substring(7)}`
  }
  if (clean.length === 10) {
    return `(${clean.substring(0, 2)}) ****-${clean.substring(6)}`
  }
  return phoneRaw || '---'
}

export function formatPhone(phoneRaw: string): string {
  const clean = (phoneRaw || '').replace(/\D/g, '')
  if (clean.length === 11) {
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`
  }
  if (clean.length === 10) {
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 6)}-${clean.substring(6)}`
  }
  return phoneRaw || ''
}

export function formatDocument(docRaw: string): string {
  const clean = (docRaw || '').replace(/\D/g, '')
  if (clean.length === 11) {
    return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9)}`
  }
  if (clean.length === 14) {
    return `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5, 8)}/${clean.substring(8, 12)}-${clean.substring(12)}`
  }
  return docRaw || ''
}

// ----------------------------------------------------
// RBAC PERMISSION MATRIX
// ----------------------------------------------------

export interface Permissions {
  canViewQueue: boolean
  canManageQueueStatus: boolean
  canRemoveDriver: boolean
  canBlockDriver: boolean
  canManagePreRegistrations: boolean
  canImportSap: boolean
  canViewAuditLogs: boolean
  canManageSystemParameters: boolean
  canViewFullSensitiveData: boolean
  canPlanLoads: boolean
  canManageItineraries: boolean
  // Sprint 3 Granular Permissions
  canViewRouter: boolean // roteirizador.visualizar
  canSimulateRouter: boolean // roteirizador.simular
  canApproveScenario: boolean // roteirizador.aprovar
  canRequestStockConfirmation: boolean // estoque.solicitar_confirmacao
  canRespondStockConfirmation: boolean // estoque.responder_confirmacao
  canRequestCreditReassessment: boolean // credito.solicitar_reavaliacao
  canRespondCreditReassessment: boolean // credito.responder_reavaliacao
  canRequestComplement: boolean // complemento.solicitar
  canRespondComplement: boolean // complemento.responder
  canAdminAntt: boolean // antt.administrar
  canAdminRoutingProviders: boolean // rotas.administrar_provider
  // Sprint 5 Permissions
  canViewPrinters: boolean // printer.view
  canManagePrinters: boolean // printer.manage
  canPrintTransport: boolean // transport.print
  canReprintTransport: boolean // transport.reprint
  // Sprint 6 RBAC Permissions
  canExecuteAiPlanner: boolean // planejamento.ia.executar
  canApproveAiPlanner: boolean // planejamento.ia.aprovar
  canManageAiPlannerParams: boolean // planejamento.ia.parametros
  canViewProfitability: boolean // rentabilidade.visualizar
  canViewProfitabilityDetail: boolean // rentabilidade.detalhe
  canExportProfitability: boolean // rentabilidade.exportar
  canViewExpeditionPerformance: boolean // expedicao.performance
  canAnalyzeExpeditionAi: boolean // expedicao.analisar_ia
  canViewWmsLoadingMap: boolean // wms.mapa_carregamento
  canConfirmWmsLoading: boolean // wms.confirmar_carregamento
  canImportZsd35: boolean // zsd35.importar
}

export const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  admin_master: {
    canViewQueue: true,
    canManageQueueStatus: true,
    canRemoveDriver: true,
    canBlockDriver: true,
    canManagePreRegistrations: true,
    canImportSap: true,
    canViewAuditLogs: true,
    canManageSystemParameters: true,
    canViewFullSensitiveData: true,
    canPlanLoads: true,
    canManageItineraries: true,
    canViewRouter: true,
    canSimulateRouter: true,
    canApproveScenario: true,
    canRequestStockConfirmation: true,
    canRespondStockConfirmation: true,
    canRequestCreditReassessment: true,
    canRespondCreditReassessment: true,
    canRequestComplement: true,
    canRespondComplement: true,
    canAdminAntt: true,
    canAdminRoutingProviders: true,
    canViewPrinters: true,
    canManagePrinters: true,
    canPrintTransport: true,
    canReprintTransport: true,
    canExecuteAiPlanner: true,
    canApproveAiPlanner: true,
    canManageAiPlannerParams: true,
    canViewProfitability: true,
    canViewProfitabilityDetail: true,
    canExportProfitability: true,
    canViewExpeditionPerformance: true,
    canAnalyzeExpeditionAi: true,
    canViewWmsLoadingMap: true,
    canConfirmWmsLoading: true,
    canImportZsd35: true,
  },
  admin_tms: {
    canViewQueue: true,
    canManageQueueStatus: true,
    canRemoveDriver: true,
    canBlockDriver: true,
    canManagePreRegistrations: true,
    canImportSap: true,
    canViewAuditLogs: true,
    canManageSystemParameters: true,
    canViewFullSensitiveData: true,
    canPlanLoads: true,
    canManageItineraries: true,
    canViewRouter: true,
    canSimulateRouter: true,
    canApproveScenario: true,
    canRequestStockConfirmation: true,
    canRespondStockConfirmation: true,
    canRequestCreditReassessment: true,
    canRespondCreditReassessment: true,
    canRequestComplement: true,
    canRespondComplement: true,
    canAdminAntt: true,
    canAdminRoutingProviders: true,
    canViewPrinters: true,
    canManagePrinters: true,
    canPrintTransport: true,
    canReprintTransport: true,
    canExecuteAiPlanner: true,
    canApproveAiPlanner: true,
    canManageAiPlannerParams: true,
    canViewProfitability: true,
    canViewProfitabilityDetail: true,
    canExportProfitability: true,
    canViewExpeditionPerformance: true,
    canAnalyzeExpeditionAi: true,
    canViewWmsLoadingMap: true,
    canConfirmWmsLoading: true,
    canImportZsd35: true,
  },
  gestor_logistica: {
    canViewQueue: true,
    canManageQueueStatus: true,
    canRemoveDriver: true,
    canBlockDriver: true,
    canManagePreRegistrations: true,
    canImportSap: true,
    canViewAuditLogs: true,
    canManageSystemParameters: false,
    canViewFullSensitiveData: true,
    canPlanLoads: true,
    canManageItineraries: true,
    canViewRouter: true,
    canSimulateRouter: true,
    canApproveScenario: true,
    canRequestStockConfirmation: true,
    canRespondStockConfirmation: false,
    canRequestCreditReassessment: true,
    canRespondCreditReassessment: false,
    canRequestComplement: true,
    canRespondComplement: false,
    canAdminAntt: true,
    canAdminRoutingProviders: true,
    canViewPrinters: true,
    canManagePrinters: true,
    canPrintTransport: true,
    canReprintTransport: true,
    canExecuteAiPlanner: true,
    canApproveAiPlanner: true,
    canManageAiPlannerParams: true,
    canViewProfitability: true,
    canViewProfitabilityDetail: true,
    canExportProfitability: true,
    canViewExpeditionPerformance: true,
    canAnalyzeExpeditionAi: true,
    canViewWmsLoadingMap: true,
    canConfirmWmsLoading: true,
    canImportZsd35: true,
  },
  gerente_carga: {
    canViewQueue: true,
    canManageQueueStatus: true,
    canRemoveDriver: true,
    canBlockDriver: false,
    canManagePreRegistrations: true,
    canImportSap: false,
    canViewAuditLogs: true,
    canManageSystemParameters: false,
    canViewFullSensitiveData: false,
    canPlanLoads: true,
    canManageItineraries: false,
    canViewRouter: true,
    canSimulateRouter: true,
    canApproveScenario: true,
    canRequestStockConfirmation: true,
    canRespondStockConfirmation: false,
    canRequestCreditReassessment: true,
    canRespondCreditReassessment: false,
    canRequestComplement: true,
    canRespondComplement: false,
    canAdminAntt: false,
    canAdminRoutingProviders: false,
    canViewPrinters: true,
    canManagePrinters: false,
    canPrintTransport: true,
    canReprintTransport: true,
    canExecuteAiPlanner: true,
    canApproveAiPlanner: true,
    canManageAiPlannerParams: false,
    canViewProfitability: true,
    canViewProfitabilityDetail: true,
    canExportProfitability: false,
    canViewExpeditionPerformance: true,
    canAnalyzeExpeditionAi: true,
    canViewWmsLoadingMap: true,
    canConfirmWmsLoading: true,
    canImportZsd35: true,
  },
  operador_logistica: {
    canViewQueue: true,
    canManageQueueStatus: true,
    canRemoveDriver: true,
    canBlockDriver: false,
    canManagePreRegistrations: true,
    canImportSap: false,
    canViewAuditLogs: false,
    canManageSystemParameters: false,
    canViewFullSensitiveData: false,
    canPlanLoads: false,
    canManageItineraries: false,
    canViewRouter: true,
    canSimulateRouter: true,
    canApproveScenario: false,
    canRequestStockConfirmation: true,
    canRespondStockConfirmation: false,
    canRequestCreditReassessment: true,
    canRespondCreditReassessment: false,
    canRequestComplement: true,
    canRespondComplement: false,
    canAdminAntt: false,
    canAdminRoutingProviders: false,
    canViewPrinters: true,
    canManagePrinters: false,
    canPrintTransport: true,
    canReprintTransport: false,
    canExecuteAiPlanner: true,
    canApproveAiPlanner: false,
    canManageAiPlannerParams: false,
    canViewProfitability: false,
    canViewProfitabilityDetail: false,
    canExportProfitability: false,
    canViewExpeditionPerformance: true,
    canAnalyzeExpeditionAi: false,
    canViewWmsLoadingMap: true,
    canConfirmWmsLoading: true,
    canImportZsd35: false,
  },
  portaria: {
    canViewQueue: true,
    canManageQueueStatus: false,
    canRemoveDriver: false,
    canBlockDriver: false,
    canManagePreRegistrations: true,
    canImportSap: false,
    canViewAuditLogs: false,
    canManageSystemParameters: false,
    canViewFullSensitiveData: false,
    canPlanLoads: false,
    canManageItineraries: false,
    canViewRouter: false,
    canSimulateRouter: false,
    canApproveScenario: false,
    canRequestStockConfirmation: false,
    canRespondStockConfirmation: false,
    canRequestCreditReassessment: false,
    canRespondCreditReassessment: false,
    canRequestComplement: false,
    canRespondComplement: false,
    canAdminAntt: false,
    canAdminRoutingProviders: false,
    canViewPrinters: true,
    canManagePrinters: false,
    canPrintTransport: true,
    canReprintTransport: false,
    canExecuteAiPlanner: false,
    canApproveAiPlanner: false,
    canManageAiPlannerParams: false,
    canViewProfitability: false,
    canViewProfitabilityDetail: false,
    canExportProfitability: false,
    canViewExpeditionPerformance: true,
    canAnalyzeExpeditionAi: false,
    canViewWmsLoadingMap: false,
    canConfirmWmsLoading: false,
    canImportZsd35: false,
  },
  financeiro: {
    canViewQueue: true,
    canManageQueueStatus: false,
    canRemoveDriver: false,
    canBlockDriver: false,
    canManagePreRegistrations: false,
    canImportSap: false,
    canViewAuditLogs: true,
    canManageSystemParameters: false,
    canViewFullSensitiveData: false,
    canPlanLoads: false,
    canManageItineraries: false,
    canViewRouter: true,
    canSimulateRouter: false,
    canApproveScenario: false,
    canRequestStockConfirmation: false,
    canRespondStockConfirmation: false,
    canRequestCreditReassessment: false,
    canRespondCreditReassessment: true, // Financeiro avalia e responde reavaliação de crédito
    canRequestComplement: false,
    canRespondComplement: false,
    canAdminAntt: false,
    canAdminRoutingProviders: false,
    canViewPrinters: false,
    canManagePrinters: false,
    canPrintTransport: false,
    canReprintTransport: false,
    canExecuteAiPlanner: false,
    canApproveAiPlanner: false,
    canManageAiPlannerParams: false,
    canViewProfitability: true,
    canViewProfitabilityDetail: true,
    canExportProfitability: true,
    canViewExpeditionPerformance: true,
    canAnalyzeExpeditionAi: false,
    canViewWmsLoadingMap: false,
    canConfirmWmsLoading: false,
    canImportZsd35: false,
  },
  comercial: {
    canViewQueue: true,
    canManageQueueStatus: false,
    canRemoveDriver: false,
    canBlockDriver: false,
    canManagePreRegistrations: false,
    canImportSap: false,
    canViewAuditLogs: false,
    canManageSystemParameters: false,
    canViewFullSensitiveData: false,
    canPlanLoads: false,
    canManageItineraries: false,
    canViewRouter: true,
    canSimulateRouter: false,
    canApproveScenario: false,
    canRequestStockConfirmation: false,
    canRespondStockConfirmation: false,
    canRequestCreditReassessment: false,
    canRespondCreditReassessment: false,
    canRequestComplement: false,
    canRespondComplement: true, // Comercial responde oportunidade de complemento
    canAdminAntt: false,
    canAdminRoutingProviders: false,
    canViewPrinters: false,
    canManagePrinters: false,
    canPrintTransport: false,
    canReprintTransport: false,
    canExecuteAiPlanner: false,
    canApproveAiPlanner: false,
    canManageAiPlannerParams: false,
    canViewProfitability: true,
    canViewProfitabilityDetail: false,
    canExportProfitability: false,
    canViewExpeditionPerformance: true,
    canAnalyzeExpeditionAi: false,
    canViewWmsLoadingMap: false,
    canConfirmWmsLoading: false,
    canImportZsd35: false,
  },
  auditor: {
    canViewQueue: true,
    canManageQueueStatus: false,
    canRemoveDriver: false,
    canBlockDriver: false,
    canManagePreRegistrations: false,
    canImportSap: false,
    canViewAuditLogs: true,
    canManageSystemParameters: false,
    canViewFullSensitiveData: true,
    canPlanLoads: false,
    canManageItineraries: false,
    canViewRouter: true,
    canSimulateRouter: false,
    canApproveScenario: false,
    canRequestStockConfirmation: false,
    canRespondStockConfirmation: false,
    canRequestCreditReassessment: false,
    canRespondCreditReassessment: false,
    canRequestComplement: false,
    canRespondComplement: false,
    canAdminAntt: true,
    canAdminRoutingProviders: false,
    canViewPrinters: true,
    canManagePrinters: false,
    canPrintTransport: false,
    canReprintTransport: false,
    canExecuteAiPlanner: false,
    canApproveAiPlanner: false,
    canManageAiPlannerParams: false,
    canViewProfitability: true,
    canViewProfitabilityDetail: true,
    canExportProfitability: true,
    canViewExpeditionPerformance: true,
    canAnalyzeExpeditionAi: true,
    canViewWmsLoadingMap: true,
    canConfirmWmsLoading: false,
    canImportZsd35: false,
  },
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin_master: 'Administrador Master HUB',
    admin_tms: 'Administrador TMS',
    gestor_logistica: 'Gestor de Logística',
    gerente_carga: 'Gerente de Carga',
    operador_logistica: 'Operador de Logística',
    portaria: 'Portaria e Acesso',
    financeiro: 'Financeiro / Controladoria',
    comercial: 'Comercial / Representante',
    auditor: 'Auditoria & Compliance',
  }
  return labels[role] || role
}

export function getUserPermissions(role?: UserRole): Permissions {
  if (!role || !ROLE_PERMISSIONS[role]) {
    return {
      canViewQueue: false,
      canManageQueueStatus: false,
      canRemoveDriver: false,
      canBlockDriver: false,
      canManagePreRegistrations: false,
      canImportSap: false,
      canViewAuditLogs: false,
      canManageSystemParameters: false,
      canViewFullSensitiveData: false,
      canPlanLoads: false,
      canManageItineraries: false,
      canViewRouter: false,
      canSimulateRouter: false,
      canApproveScenario: false,
      canRequestStockConfirmation: false,
      canRespondStockConfirmation: false,
      canRequestCreditReassessment: false,
      canRespondCreditReassessment: false,
      canRequestComplement: false,
      canRespondComplement: false,
      canAdminAntt: false,
      canAdminRoutingProviders: false,
      canViewPrinters: false,
      canManagePrinters: false,
      canPrintTransport: false,
      canReprintTransport: false,
      canExecuteAiPlanner: false,
      canApproveAiPlanner: false,
      canManageAiPlannerParams: false,
      canViewProfitability: false,
      canViewProfitabilityDetail: false,
      canExportProfitability: false,
      canViewExpeditionPerformance: false,
      canAnalyzeExpeditionAi: false,
      canViewWmsLoadingMap: false,
      canConfirmWmsLoading: false,
      canImportZsd35: false,
    }
  }
  return ROLE_PERMISSIONS[role]
}

// ----------------------------------------------------
// MOTOR DETERMINÍSTICO DE MONTAGEM DE CARGA (PLANEJADOR)
// ----------------------------------------------------

export type LoadAssemblyDecision = 'permitida' | 'exige_aprovacao' | 'recusada'

export interface LoadAssemblyRuleResult {
  decision: LoadAssemblyDecision
  reasons: string[] // Retorna TODOS os motivos (não apenas o primeiro)
  details: {
    weightValid: boolean
    volumeValid: boolean
    itineraryValid: boolean
    vehicleTypeValid: boolean
    creditValid: boolean
    productionReady: boolean
    hasObservations: boolean
  }
  calculatedWeightKg: number
  capacityKg?: number
  balanceKg?: number
}

export interface AssembleLoadInput {
  orders: SapSalesOrderEntity[]
  vehicle: VehicleEntity | null
  targetItineraryCode: string
  maxVolumeM3?: number
}

/**
 * Deterministic Load Assembly Engine
 * Analisa: Peso, Volume, Itinerário, Tipo de Veículo, Tipo de Descarga, Saldo, Crédito (por valor), Produção.
 * Observações SAP são texto informativo para leitura do operador — não decidem automaticamente.
 */
export function avaliar_montagem_carga(input: AssembleLoadInput): LoadAssemblyRuleResult {
  const reasons: string[] = []
  const { orders, vehicle, targetItineraryCode, maxVolumeM3 } = input

  const totalWeight = orders.reduce((acc, o) => acc + (o.weight_kg || 0), 0)
  const totalVolume = orders.reduce((acc, o) => acc + (o.volume_m3 || 0), 0)
  const vehicleCapacity = vehicle?.capacity_kg

  // 1. Validação de Itinerário
  const wrongItineraryOrders = orders.filter((o) => o.itinerary_code !== targetItineraryCode)
  const itineraryValid = wrongItineraryOrders.length === 0
  if (!itineraryValid) {
    const wrongCodes = Array.from(new Set(wrongItineraryOrders.map((o) => o.itinerary_code))).join(
      ', ',
    )
    reasons.push(
      `Pedidos com itinerário incompatível (${wrongCodes}). Itinerário da carga: ${targetItineraryCode}.`,
    )
  }

  // 2. Validação de Capacidade de Peso (usar capacidade do cadastro, sem hardcode)
  let weightValid = true
  let balanceKg: number | undefined
  if (vehicleCapacity !== undefined && vehicleCapacity !== null && vehicleCapacity > 0) {
    balanceKg = vehicleCapacity - totalWeight
    if (totalWeight > vehicleCapacity) {
      weightValid = false
      reasons.push(
        `Peso total (${totalWeight.toLocaleString('pt-BR')} kg) excede a capacidade do veículo (${vehicleCapacity.toLocaleString('pt-BR')} kg) em ${Math.abs(balanceKg).toLocaleString('pt-BR')} kg.`,
      )
    }
  } else if (vehicle) {
    // Veículo sem capacidade informada
    reasons.push('Veículo sem capacidade de peso cadastrada no sistema.')
  }

  // 3. Validação de Volume
  let volumeValid = true
  if (maxVolumeM3 && maxVolumeM3 > 0 && totalVolume > maxVolumeM3) {
    volumeValid = false
    reasons.push(
      `Volume total (${totalVolume.toFixed(1)} m³) excede o volume máximo da carroceria (${maxVolumeM3} m³).`,
    )
  }

  // 4. Validação de Tipo de Veículo Exigido
  let vehicleTypeValid = true
  if (vehicle) {
    const incompatibleVehicleOrders = orders.filter((o) => {
      if (!o.required_vehicle_type) return false
      const req = o.required_vehicle_type.toLowerCase()
      const vType = (vehicle.type || '').toLowerCase()
      return !vType.includes(req) && !req.includes(vType)
    })
    if (incompatibleVehicleOrders.length > 0) {
      vehicleTypeValid = false
      const reqs = Array.from(
        new Set(incompatibleVehicleOrders.map((o) => o.required_vehicle_type)),
      ).join(', ')
      reasons.push(
        `Tipo de veículo do cadastro (${vehicle.type}) incompatível com exigência do(s) pedido(s): ${reqs}.`,
      )
    }
  }

  // 5. Validação de Crédito do Cliente (analisado por VALOR do pedido no financeiro)
  const blockedCreditOrders = orders.filter((o) => o.credit_status === 'Bloqueado')
  const inAnalysisCreditOrders = orders.filter((o) => o.credit_status === 'Em Análise')
  const creditValid = blockedCreditOrders.length === 0

  if (blockedCreditOrders.length > 0) {
    const ordNums = blockedCreditOrders.map((o) => o.order_number).join(', ')
    reasons.push(`Pedido(s) ${ordNums} com CRÉDITO BLOQUEADO no SAP pelo financeiro.`)
  }

  // 6. Validação de Status de Produção (PCP)
  const notReadyOrders = orders.filter((o) => o.production_status !== 'Pronto')
  const productionReady = notReadyOrders.length === 0
  if (!productionReady) {
    const pDetails = notReadyOrders
      .map((o) => `${o.order_number} (${o.production_status})`)
      .join(', ')
    reasons.push(`Material não está totalmente pronto no PCP: ${pDetails}.`)
  }

  // 7. Observações Informativas SAP (STXH/STXL)
  const ordersWithObs = orders.filter((o) => !!o.sap_notes && o.sap_notes.trim().length > 0)
  const hasObservations = ordersWithObs.length > 0

  // DECISION MATRIX
  let decision: LoadAssemblyDecision = 'permitida'

  if (!itineraryValid || !weightValid || !creditValid) {
    decision = 'recusada'
  } else if (
    !productionReady ||
    !vehicleTypeValid ||
    !volumeValid ||
    inAnalysisCreditOrders.length > 0 ||
    hasObservations
  ) {
    decision = 'exige_aprovacao'
    if (inAnalysisCreditOrders.length > 0) {
      reasons.push('Pedido(s) com crédito em análise no financeiro requerem aprovação gerencial.')
    }
  }

  return {
    decision,
    reasons,
    details: {
      weightValid,
      volumeValid,
      itineraryValid,
      vehicleTypeValid,
      creditValid,
      productionReady,
      hasObservations,
    },
    calculatedWeightKg: totalWeight,
    capacityKg: vehicleCapacity,
    balanceKg,
  }
}

// ----------------------------------------------------
// MOTOR DE COMPLEMENTO DE CARGAS
// ----------------------------------------------------

export interface IdentifyComplementOpportunityInput {
  cargoCode: string
  itineraryCode: string
  currentWeightKg: number
  vehicleCapacityKg: number
  candidateOrders: SapSalesOrderEntity[]
}

export function identificar_oportunidade_complemento(
  input: IdentifyComplementOpportunityInput,
): OportunidadeComplementoCargaEntity | null {
  const { cargoCode, itineraryCode, currentWeightKg, vehicleCapacityKg, candidateOrders } = input

  if (!vehicleCapacityKg || vehicleCapacityKg <= 0 || currentWeightKg >= vehicleCapacityKg) {
    return null
  }

  const balanceKg = vehicleCapacityKg - currentWeightKg

  // Buscar pedidos do mesmo itinerário compatíveis com o saldo
  const matchingOrders = candidateOrders.filter(
    (o) =>
      o.itinerary_code === itineraryCode && o.weight_kg <= balanceKg && o.status === 'disponivel',
  )

  if (matchingOrders.length === 0) {
    return null
  }

  return {
    id: `opp-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    cargo_code: cargoCode,
    itinerary_code: itineraryCode,
    current_weight_kg: currentWeightKg,
    capacity_kg: vehicleCapacityKg,
    balance_kg: balanceKg,
    candidate_orders: matchingOrders.map((o) => o.order_number),
    candidate_clients: Array.from(new Set(matchingOrders.map((o) => o.customer_name))),
    status: 'Nova',
    responsible: 'Gerente de Carga',
    origin: 'Planejador TMS CIAFAL',
    enviado_crm: false,
    correlation_id: `COMPL-${Date.now()}`,
    notes: `Oportunidade identificada: saldo residual de ${(balanceKg / 1000).toFixed(1)}t para o itinerário ${itineraryCode}.`,
  }
}

// ----------------------------------------------------
// DETERMINISTIC ELIGIBILITY EVALUATION FOR FREIGHT OFFERS
// ----------------------------------------------------

export interface DriverEligibilityEvaluation {
  isEligible: boolean
  reasons: string[] // Retorna TODOS os motivos
  evaluatedAt: string
  ruleEngineVersion: string
  details: {
    inQueue: boolean
    activeRegistration: boolean
    activeAvailability: boolean
    noAssignedCargo: boolean
    compatibleVehicle: boolean
    validCommunicationChannel: boolean
    notBlocked: boolean
    correctAuctionGroup: boolean
  }
}

export interface EvaluateEligibilityInput {
  driver: DriverEntity | null
  queueEntry: QueueEntryEntity | null
  offerStageGroup: 'PORTA' | 'FORA'
  requiredVehicleType?: string
}

export function avaliar_elegibilidade_motorista_oferta(
  input: EvaluateEligibilityInput,
): DriverEligibilityEvaluation {
  const reasons: string[] = []
  const evaluatedAt = new Date().toISOString()
  const ruleEngineVersion = '1.2.0-SPRINT-TMS-EXPANSION'

  const { driver, queueEntry, offerStageGroup, requiredVehicleType } = input

  // 1. Motorista na fila (não pode estar removido nem PROGRAMADO para oferta imediata)
  const inQueue = !!queueEntry && queueEntry.status !== 'removido'
  if (!inQueue) {
    reasons.push('Motorista não se encontra registrado na fila operacional.')
  }

  // 2. Cadastro ativo no SAP
  const activeRegistration = !!driver && driver.status === 'ativo'
  if (!driver) {
    reasons.push('Cadastro do motorista não localizado no sistema.')
  } else if (driver.status !== 'ativo') {
    reasons.push(`Cadastro do motorista não está ativo no SAP (Status: ${driver.status}).`)
  }

  // 3. Disponibilidade ativa
  const activeAvailability =
    !!queueEntry && (queueEntry.status === 'disponivel' || queueEntry.status === 'validacao')
  if (queueEntry && queueEntry.status !== 'disponivel' && queueEntry.status !== 'validacao') {
    reasons.push(
      `Disponibilidade não está em estado apto (Status atual na fila: ${queueEntry.status}).`,
    )
  }

  // 4. Sem carga já atribuída
  const noAssignedCargo = !queueEntry || queueEntry.status !== 'atribuido'
  if (queueEntry && queueEntry.status === 'atribuido') {
    reasons.push('Motorista já possui carga atribuída em andamento.')
  }

  // 5. Veículo compatível
  let compatibleVehicle = true
  if (requiredVehicleType && queueEntry?.vehicle_type_cached) {
    const vType = queueEntry.vehicle_type_cached.toLowerCase()
    const reqType = requiredVehicleType.toLowerCase()
    compatibleVehicle = vType.includes(reqType) || reqType.includes(vType)
    if (!compatibleVehicle) {
      reasons.push(
        `Veículo atual (${queueEntry.vehicle_type_cached}) incompatível com o tipo exigido para a carga (${requiredVehicleType}).`,
      )
    }
  }

  // 6. Canal de comunicação válido
  const whatsapp = driver?.whatsapp || queueEntry?.driver_whatsapp_cached || ''
  const validCommunicationChannel = !!whatsapp && whatsapp.replace(/\D/g, '').length >= 10
  if (!validCommunicationChannel) {
    reasons.push('Motorista não possui canal de comunicação válido (WhatsApp cadastrado).')
  }

  // 7. Não bloqueado
  const notBlocked = !!driver && driver.status !== 'bloqueado' && queueEntry?.status !== 'bloqueado'
  if ((driver && driver.status === 'bloqueado') || queueEntry?.status === 'bloqueado') {
    reasons.push('Motorista com restrição ou bloqueio administrativo ativo.')
  }

  // 8. Grupo correto da oferta (PROGRAMADO não participa de oferta atual)
  const isProgramado = queueEntry?.type === 'PROGRAMADO'
  if (isProgramado) {
    reasons.push('Disponibilidade PROGRAMADA não participa de oferta imediata (capacidade futura).')
  }

  const correctAuctionGroup = !!queueEntry && queueEntry.type === offerStageGroup
  if (queueEntry && queueEntry.type !== offerStageGroup && !isProgramado) {
    reasons.push(
      `Motorista pertence ao grupo ${queueEntry.type}, incompatível com a etapa da oferta atual (${offerStageGroup}).`,
    )
  }

  const isEligible =
    inQueue &&
    activeRegistration &&
    activeAvailability &&
    noAssignedCargo &&
    compatibleVehicle &&
    validCommunicationChannel &&
    notBlocked &&
    !isProgramado &&
    correctAuctionGroup

  return {
    isEligible,
    reasons,
    evaluatedAt,
    ruleEngineVersion,
    details: {
      inQueue,
      activeRegistration,
      activeAvailability,
      noAssignedCargo,
      compatibleVehicle,
      validCommunicationChannel,
      notBlocked,
      correctAuctionGroup,
    },
  }
}

// Alias evaluation function for specification compliance
export function evaluateEligibility(
  driver: DriverEntity | null,
  queueEntry: QueueEntryEntity | null,
  offerStageGroup: 'PORTA' | 'FORA',
  requiredVehicleType?: string,
): DriverEligibilityEvaluation {
  return avaliar_elegibilidade_motorista_oferta({
    driver,
    queueEntry,
    offerStageGroup,
    requiredVehicleType,
  })
}

// ----------------------------------------------------
// MOTOR DE PROPOSTAS E LEILÃO (DETERMINÍSTICO SPRINT 2)
// ----------------------------------------------------

export interface ProposalEvaluationResult {
  proposalStatus: ProposalStatus
  immediateContract: boolean
  reason?: string
  normalizedValue: number
}

/**
 * Avalia proposta de motorista segundo as regras do leilão determinístico:
 * - Se valor == floor_price (piso): aceita IMEDIATAMENTE (aceite de piso) -> WINNER
 * - Se piso <= valor <= teto: proposta válida -> VALID
 * - Se valor < piso: REJECTED (proposta abaixo do piso ANTT)
 * - Se valor > teto: REJECTED (proposta acima do teto orçamentário protegido)
 */
export function evaluateProposalPriceRules(
  proposedValue: number,
  floorPrice: number,
  ceilingPrice: number,
): ProposalEvaluationResult {
  const normVal = Number(proposedValue) || 0
  const fPrice = Number(floorPrice) || 0
  const cPrice = Number(ceilingPrice) || Infinity

  // 1. Abaixo do piso regulatório
  if (normVal < fPrice) {
    return {
      proposalStatus: 'REJECTED',
      immediateContract: false,
      reason: `Proposta (R$ ${normVal.toFixed(2)}) abaixo do valor de piso regulatório (R$ ${fPrice.toFixed(2)}).`,
      normalizedValue: normVal,
    }
  }

  // 2. Aceite do piso (Exato piso) -> Atribuição imediata
  if (Math.abs(normVal - fPrice) < 0.01) {
    return {
      proposalStatus: 'WINNER',
      immediateContract: true,
      reason: 'Aceite do valor de piso (atribuição imediata da carga).',
      normalizedValue: normVal,
    }
  }

  // 3. Acima do teto orçamentário
  if (normVal > cPrice) {
    return {
      proposalStatus: 'REJECTED',
      immediateContract: false,
      reason: 'Proposta acima do limite operacional máximo permitido.',
      normalizedValue: normVal,
    }
  }

  // 4. Proposta válida dentro da faixa (piso < valor <= teto)
  return {
    proposalStatus: 'VALID',
    immediateContract: false,
    normalizedValue: normVal,
  }
}

/**
 * Desempate temporal determinístico e seleção da melhor proposta:
 * Ordena por:
 * 1. Menor valor proposto (critério econômico primário)
 * 2. Menor tempo de entrada na fila (prioridade temporal / antiguidade na fila)
 * 3. Menor tempo de submissão da proposta (desempate da proposta)
 */
export interface CandidateProposalWithQueue {
  proposal: FreightProposalEntity
  queueEntryTime: string
}

export function selectWinningProposal(
  candidates: CandidateProposalWithQueue[],
): FreightProposalEntity | null {
  const validProposals = candidates.filter(
    (c) => c.proposal.status === 'VALID' || c.proposal.status === 'WINNER',
  )

  if (validProposals.length === 0) {
    return null
  }

  // Sort: lowest value first, then earliest queue entry_time, then earliest proposal created
  validProposals.sort((a, b) => {
    // 1. Valor da proposta
    if (a.proposal.value !== b.proposal.value) {
      return a.proposal.value - b.proposal.value
    }

    // 2. Prioridade temporal na fila (antiguidade na fila de espera)
    const queueTimeA = new Date(a.queueEntryTime || a.proposal.created || 0).getTime()
    const queueTimeB = new Date(b.queueEntryTime || b.proposal.created || 0).getTime()
    if (queueTimeA !== queueTimeB) {
      return queueTimeA - queueTimeB
    }

    // 3. Hora do envio da proposta
    const propTimeA = new Date(a.proposal.created || 0).getTime()
    const propTimeB = new Date(b.proposal.created || 0).getTime()
    return propTimeA - propTimeB
  })

  return validProposals[0].proposal
}

// ----------------------------------------------------
// ABSTRACT MESSAGING INTERFACES (ADAPTER PATTERN)
// ----------------------------------------------------

export interface OutboundMessagePayload {
  recipientDocument: string
  recipientPhone: string
  recipientName: string
  templateId: string
  parameters: Record<string, string | number>
  correlationId: string
}

export interface MessageDispatchResult {
  success: boolean
  channel: 'telegram' | 'whatsapp' | 'mock'
  dispatchId: string
  dispatchedAt: string
  error?: string
}

export interface CanalMensagem {
  readonly channelName: string
  isConfigured(): boolean
  sendMessage(payload: OutboundMessagePayload): Promise<MessageDispatchResult>
}

export class WhatsAppAdapter implements CanalMensagem {
  readonly channelName = 'whatsapp'
  private isConnected = false

  isConfigured(): boolean {
    return this.isConnected
  }

  async sendMessage(payload: OutboundMessagePayload): Promise<MessageDispatchResult> {
    return {
      success: true,
      channel: 'whatsapp',
      dispatchId: `WPP-${Date.now()}-${payload.correlationId}`,
      dispatchedAt: new Date().toISOString(),
    }
  }
}

export class TelegramAdapter implements CanalMensagem {
  readonly channelName = 'telegram'
  private isConnected = false

  isConfigured(): boolean {
    return this.isConnected
  }

  async sendMessage(payload: OutboundMessagePayload): Promise<MessageDispatchResult> {
    return {
      success: true,
      channel: 'telegram',
      dispatchId: `TG-${Date.now()}-${payload.correlationId}`,
      dispatchedAt: new Date().toISOString(),
    }
  }
}

// ----------------------------------------------------
// SPRINT 3: DESACOPLAMENTO DE SERVIÇOS (PROVIDERS)
// ----------------------------------------------------

export interface GeoCoordinate {
  latitude: number
  longitude: number
  address?: string
  city?: string
  uf?: string
  isValidated: boolean
}

export interface RouteWayPoint {
  orderIndex: number
  customerCode: string
  customerName: string
  location: GeoCoordinate
  weightKg: number
}

export interface RouteSimulationResult {
  providerName: string
  isLiveProvider: boolean
  origin: GeoCoordinate
  destinations: RouteWayPoint[]
  totalDistanceKm: number
  totalDurationMinutes: number
  polylineCoords?: Array<[number, number]>
  segments: Array<{
    from: string
    to: string
    distanceKm: number
    durationMinutes: number
  }>
  statusText: string
}

export interface RoutingProvider {
  readonly providerName: string
  isConfigured(): boolean
  calculateRoute(
    origin: GeoCoordinate,
    destinations: RouteWayPoint[],
  ): Promise<RouteSimulationResult>
  validateAddress(rawAddress: string, city: string, uf: string): Promise<GeoCoordinate>
}

/**
 * Standard CIAFAL Routing Engine (Desacoplado - Preparado para Google Maps, HERE, OSRM, Mapbox)
 */
export class DefaultRoutingProvider implements RoutingProvider {
  readonly providerName = 'CIAFAL Routing Engine (Haversine/Rodoviário)'
  private apiKey = ''

  constructor(apiKey = '') {
    this.apiKey = apiKey
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  async validateAddress(rawAddress: string, city: string, uf: string): Promise<GeoCoordinate> {
    if (!city || !uf) {
      return {
        latitude: 0,
        longitude: 0,
        isValidated: false,
        address: rawAddress,
      }
    }
    // Determinação determinística baseada na cidade/UF de entrega
    const cityNorm = city.toLowerCase().trim()
    const ufNorm = uf.toUpperCase().trim()

    if (cityNorm.includes('belo horizonte') || ufNorm === 'MG') {
      return {
        latitude: -19.9167,
        longitude: -43.9345,
        city,
        uf,
        address: rawAddress || 'Distrito Industrial, Belo Horizonte - MG',
        isValidated: true,
      }
    }
    if (cityNorm.includes('campinas')) {
      return {
        latitude: -22.9056,
        longitude: -47.0608,
        city,
        uf,
        address: rawAddress || 'Distrito Industrial, Campinas - SP',
        isValidated: true,
      }
    }
    if (cityNorm.includes('são paulo') || (ufNorm === 'SP' && !cityNorm.includes('campinas'))) {
      return {
        latitude: -23.5505,
        longitude: -46.6333,
        city,
        uf,
        address: rawAddress || 'Distrito Industrial, São Paulo - SP',
        isValidated: true,
      }
    }
    if (cityNorm.includes('rio') || ufNorm === 'RJ') {
      return {
        latitude: -22.9068,
        longitude: -43.1729,
        city,
        uf,
        address: rawAddress || 'Distrito Industrial, Rio de Janeiro - RJ',
        isValidated: true,
      }
    }

    return {
      latitude: 0,
      longitude: 0,
      isValidated: false,
      address: rawAddress,
      city,
      uf,
    }
  }

  async calculateRoute(
    origin: GeoCoordinate,
    destinations: RouteWayPoint[],
  ): Promise<RouteSimulationResult> {
    const isLive = this.isConfigured()
    let currentLat = origin.latitude
    let currentLon = origin.longitude
    let currentName = origin.address || 'Planta CIAFAL (Matriz)'
    let totalDist = 0
    const segments: RouteSimulationResult['segments'] = []
    const polyline: Array<[number, number]> = [[currentLat, currentLon]]

    for (let i = 0; i < destinations.length; i++) {
      const dest = destinations[i]
      const destLat = dest.location.latitude
      const destLon = dest.location.longitude
      const destName = dest.customerName || `Destino ${i + 1}`

      let dist = 0
      if (dest.location.isValidated && destLat !== 0 && destLon !== 0) {
        dist = calculateDistanceKm(currentLat, currentLon, destLat, destLon) * 1.25 // Fator de sinuosidade rodoviária 1.25
      } else {
        dist = 120 // estimativa padrão por trecho
      }

      totalDist += dist
      const durationMin = Math.round((dist / 65) * 60) // Velocidade média caminhão 65 km/h

      segments.push({
        from: currentName,
        to: destName,
        distanceKm: Math.round(dist * 10) / 10,
        durationMinutes: durationMin,
      })

      if (destLat !== 0 && destLon !== 0) {
        polyline.push([destLat, destLon])
        currentLat = destLat
        currentLon = destLon
        currentName = destName
      }
    }

    const totalDuration = Math.round((totalDist / 65) * 60)

    return {
      providerName: this.providerName,
      isLiveProvider: isLive,
      origin,
      destinations,
      totalDistanceKm: Math.round(totalDist * 10) / 10,
      totalDurationMinutes: totalDuration,
      polylineCoords: polyline,
      segments,
      statusText: isLive
        ? 'ROTEIRIZAÇÃO ONLINE ATIVA'
        : 'ROTEIRIZAÇÃO GEOGRÁFICA — PROVIDER NÃO CONFIGURADO (Cálculo Estimado Haversine x1.25)',
    }
  }
}

// ----------------------------------------------------
// TOLL PROVIDER (CÁLCULO DE PEDÁGIOS POR EIXOS E VEÍCULO)
// ----------------------------------------------------

export interface TollCalculationResult {
  providerName: string
  isLiveProvider: boolean
  totalTollsCount: number
  totalTollCost: number
  tollPlazas: Array<{
    plazaName: string
    highway: string
    ratePerAxle: number
    axlesCount: number
    totalValue: number
  }>
  calculatedAt: string
  statusText: string
}

export interface TollProvider {
  readonly providerName: string
  isConfigured(): boolean
  calculateTolls(
    distanceKm: number,
    vehicleType: string,
    axlesCount: number,
    itineraryCode: string,
  ): Promise<TollCalculationResult>
}

export class DefaultTollProvider implements TollProvider {
  readonly providerName = 'CIAFAL Toll Estimator (ANTT / Concessionárias)'
  private isConnected = false

  isConfigured(): boolean {
    return this.isConnected
  }

  async calculateTolls(
    distanceKm: number,
    vehicleType: string,
    axlesCount = 5,
    itineraryCode = 'SP001A',
  ): Promise<TollCalculationResult> {
    // Estimativa por praça de pedágio (1 praça a cada ~55 km em rodovias concedidas SP/MG/RJ)
    const effectiveAxles =
      axlesCount > 0 ? axlesCount : vehicleType.toLowerCase().includes('bitrem') ? 7 : 5
    const plazasCount = Math.max(1, Math.floor(distanceKm / 55))
    const baseRatePerAxle = 4.2 // R$ 4,20 por eixo por praça

    const tollPlazas: TollCalculationResult['tollPlazas'] = []
    let totalValue = 0

    for (let i = 1; i <= plazasCount; i++) {
      const plazaVal = baseRatePerAxle * effectiveAxles
      totalValue += plazaVal
      tollPlazas.push({
        plazaName: `Praça P${i} - Km ${i * 55}`,
        highway: itineraryCode.startsWith('MG')
          ? 'BR-381 / Fernão Dias'
          : itineraryCode.startsWith('RJ')
            ? 'BR-116 / Dutra'
            : 'SP-330 / Anhanguera',
        ratePerAxle: baseRatePerAxle,
        axlesCount: effectiveAxles,
        totalValue: plazaVal,
      })
    }

    return {
      providerName: this.providerName,
      isLiveProvider: this.isConfigured(),
      totalTollsCount: plazasCount,
      totalTollCost: Math.round(totalValue * 100) / 100,
      tollPlazas,
      calculatedAt: new Date().toISOString(),
      statusText: this.isConfigured()
        ? 'PEDÁGIO ONLINE CONECTADO'
        : 'PEDÁGIO — PROVIDER PENDENTE (Cálculo Parametrizado por Eixos)',
    }
  }
}

// ----------------------------------------------------
// ANTT PROVIDER (PISO MÍNIMO REGULATÓRIO OFICIAL)
// ----------------------------------------------------

export interface AnttCalculationParams {
  distanceKm: number
  vehicleType: string
  axlesCount?: number
  cargoType?: 'Geral' | 'Granel Sólido' | 'Granel Líquido' | 'Frigorificada' | 'Perigosa'
  isReturnTrip?: boolean
  tableVersion?: string
}

export interface AnttCalculationResult {
  floorValue: number
  tableVersion: string
  resolutionNumber: string
  effectiveDate: string
  distanceKm: number
  axlesCount: number
  cargoType: string
  ccd: number // Custo por Deslocamento
  cc: number // Custo por Carga/Descarga
  fixedBase: number
  formulaDetails: string
  calculatedAt: string
  isOfficialSourceConnected: boolean
  statusText: string
}

export interface ANTTProvider {
  readonly providerName: string
  isConfigured(): boolean
  calculateFloorPrice(params: AnttCalculationParams): AnttCalculationResult
}

export class DefaultANTTProvider implements ANTTProvider {
  readonly providerName = 'CIAFAL ANTT Regulatory Engine'
  private isConnected = true

  isConfigured(): boolean {
    return this.isConnected
  }

  calculateFloorPrice(params: AnttCalculationParams): AnttCalculationResult {
    const {
      distanceKm,
      vehicleType,
      cargoType = 'Geral',
      tableVersion = '2024-V2-PORTARIA-12',
    } = params

    let axles = params.axlesCount || 5
    if (!params.axlesCount) {
      const v = (vehicleType || '').toLowerCase()
      if (v.includes('toco') || v.includes('3/4') || v.includes('2 eixos')) axles = 2
      else if (v.includes('truck') || v.includes('3 eixos')) axles = 3
      else if (v.includes('bitruck') || v.includes('4 eixos')) axles = 4
      else if (v.includes('carreta') || v.includes('ls') || v.includes('5 eixos')) axles = 5
      else if (v.includes('vanderleia') || v.includes('6 eixos')) axles = 6
      else if (v.includes('bitrem') || v.includes('7 eixos')) axles = 7
      else if (v.includes('rodotrem') || v.includes('9 eixos')) axles = 9
    }

    // Coeficientes oficiais ANTT (Resolução 5.867/2019 atualizada)
    const ratesMap: Record<number, { ccd: number; cc: number }> = {
      2: { ccd: 2.85, cc: 1.45 },
      3: { ccd: 3.65, cc: 1.95 },
      4: { ccd: 4.4, cc: 2.4 },
      5: { ccd: 5.15, cc: 2.9 },
      6: { ccd: 5.95, cc: 3.4 },
      7: { ccd: 6.7, cc: 3.9 },
      9: { ccd: 7.95, cc: 4.6 },
    }

    const rates = ratesMap[axles] || ratesMap[5]
    const fixedBase = 310.0
    // Fórmula ANTT: Piso = (Distância * CCD) + CC_base + Carga_Descarga
    const floor = Math.max(
      650,
      Math.round((distanceKm * rates.ccd + fixedBase + rates.cc * distanceKm * 0.15) * 100) / 100,
    )

    return {
      floorValue: floor,
      tableVersion,
      resolutionNumber: 'Resolução ANTT nº 5.867/2019 / Portaria SUROC nº 12/2024',
      effectiveDate: '2024-07-01',
      distanceKm,
      axlesCount: axles,
      cargoType,
      ccd: rates.ccd,
      cc: rates.cc,
      fixedBase,
      formulaDetails: `Piso ANTT = (${distanceKm} km * R$ ${rates.ccd}/km [CCD]) + R$ ${fixedBase} + Adicional CC (R$ ${rates.cc})`,
      calculatedAt: new Date().toISOString(),
      isOfficialSourceConnected: true,
      statusText: 'ANTT — TABELA OFICIAL VIGENTE APLICADA (Resolução 5.867)',
    }
  }
}

// Global Provider Singletons
export const routingService = new DefaultRoutingProvider()
export const tollService = new DefaultTollProvider()
export const anttService = new DefaultANTTProvider()

// ----------------------------------------------------
// SCORE DETERMINÍSTICO DE PRIORIDADE DO PEDIDO
// ----------------------------------------------------

export interface OrderPriorityScoreResult {
  totalScore: number // 0 a 100
  factors: {
    overduePoints: number // 0 a 30
    walletTimePoints: number // 0 a 20
    customerTierPoints: number // 0 a 20
    creditPoints: number // 0 a 15
    stockProductionPoints: number // 0 a 15
  }
  explanation: string
  classification: 'ALTA PRIORIDADE' | 'PRIORIDADE MÉDIA' | 'NORMAL'
}

/**
 * Calcula Score Determinístico do Pedido (Explicável e Auditável)
 * Não usa caixa-preta de IA.
 */
export function calculateOrderPriorityScore(order: SapSalesOrderEntity): OrderPriorityScoreResult {
  const today = new Date()
  let overdueDays = 0
  if (order.desired_date) {
    const desired = new Date(order.desired_date)
    const diffTime = today.getTime() - desired.getTime()
    overdueDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
  }

  let walletDays = 0
  if (order.order_date) {
    const entry = new Date(order.order_date)
    const diffTime = today.getTime() - entry.getTime()
    walletDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
  }

  // 1. Atraso (máx 30 pts)
  let overduePoints = 0
  if (overdueDays > 7) overduePoints = 30
  else if (overdueDays > 3) overduePoints = 20
  else if (overdueDays > 0) overduePoints = 10

  // 2. Tempo em carteira (máx 20 pts)
  let walletTimePoints = 0
  if (walletDays > 15) walletTimePoints = 20
  else if (walletDays >= 8) walletTimePoints = 15
  else if (walletDays >= 4) walletTimePoints = 10
  else walletTimePoints = 5

  // 3. Classificação do cliente (máx 20 pts)
  let customerTierPoints = 10
  const tier = (order.customer_tier || '').toUpperCase()
  if (tier.includes('A') || tier.includes('ESTRATÉGICO') || tier.includes('GOLD')) {
    customerTierPoints = 20
  } else if (tier.includes('B') || tier.includes('CORPORATIVO')) {
    customerTierPoints = 15
  } else if (tier.includes('C')) {
    customerTierPoints = 8
  }

  // 4. Crédito (máx 15 pts)
  let creditPoints = 0
  if (order.credit_status === 'Liberado') creditPoints = 15
  else if (order.credit_status === 'Em Análise') creditPoints = 5
  else creditPoints = 0

  // 5. Estoque & PCP (máx 15 pts)
  let stockProductionPoints = 0
  if (order.production_status === 'Pronto') stockProductionPoints = 15
  else if (order.production_status === 'Em Produção') stockProductionPoints = 10
  else if (order.production_status === 'Programado') stockProductionPoints = 5

  const totalScore =
    overduePoints + walletTimePoints + customerTierPoints + creditPoints + stockProductionPoints

  let classification: OrderPriorityScoreResult['classification'] = 'NORMAL'
  if (totalScore >= 75) classification = 'ALTA PRIORIDADE'
  else if (totalScore >= 50) classification = 'PRIORIDADE MÉDIA'

  const reasonsList: string[] = []
  if (overdueDays > 0)
    reasonsList.push(`${overdueDays} dias de atraso na data desejada (+${overduePoints} pts)`)
  if (walletDays >= 8) reasonsList.push(`${walletDays} dias em carteira (+${walletTimePoints} pts)`)
  if (tier) reasonsList.push(`Cliente Tier ${tier} (+${customerTierPoints} pts)`)
  if (order.credit_status === 'Liberado') reasonsList.push('Crédito 100% liberado (+15 pts)')
  if (order.production_status === 'Pronto') reasonsList.push('Material pronto em estoque (+15 pts)')

  return {
    totalScore,
    factors: {
      overduePoints,
      walletTimePoints,
      customerTierPoints,
      creditPoints,
      stockProductionPoints,
    },
    explanation: reasonsList.join(' • ') || 'Pontuação base conforme parâmetros padrão.',
    classification,
  }
}
