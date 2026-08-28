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
  customer_code: string
  customer_name: string
  destination_city: string
  uf: string
  itinerary_code: string
  weight_kg: number
  volume_m3?: number
  total_value: number
  line?: string
  family?: string
  material?: string
  production_status: 'Pronto' | 'Em Produção' | 'Programado' | 'Aguardando PCP'
  credit_status: 'Liberado' | 'Bloqueado' | 'Em Análise'
  discharge_type?: string
  required_vehicle_type?: string
  sap_notes?: string
  scheduled_delivery_date?: string
  assigned_load_id?: string
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
  status:
    | 'rascunho'
    | 'janela_porta_aberta'
    | 'janela_fora_aberta'
    | 'negociacao'
    | 'atribuido'
    | 'expirado'
    | 'cancelado'
  window_start?: string
  window_end?: string
  floor_value?: number
  ceiling_value_protected?: number // Protegido - nunca exposto ao motorista ou LLM
  winner_driver?: string
  winner_vehicle?: string
  closing_reason?: string
  correlation_id?: string
  created?: string
  updated?: string
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
