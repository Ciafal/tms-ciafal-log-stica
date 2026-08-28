// TMS CIAFAL Domain Rules & Security Engine

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

export type QueueGroup = 'PORTA' | 'FORA'

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
  document: string // Clean numbers
  whatsapp: string
  status: 'ativo' | 'bloqueado' | 'pendente_sap'
  sap_id?: string
  rg?: string
  cnh?: string
  cnh_category?: string
  cnh_validity?: string
  channel_telegram?: string
  notes?: string
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
  capacity_kg?: number
  driver?: string
}

export interface QueueEntryEntity {
  id: string
  driver: string
  vehicle?: string
  type: QueueGroup
  status: QueueStatus
  entry_time: string
  exit_time?: string
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
  vehicle_type?: string
  plate?: string
  origin: QueueGroup
  status: PreRegistrationStatus
  latitude?: number
  longitude?: number
  ip_address?: string
  reviewer_notes?: string
  reviewer_user?: string
  rejection_reason?: string
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
  ceiling_value_protected?: number // Never exposed to drivers or LLMs
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
  maxRadiusKm: 60,
}

/**
 * Validates if coordinates are within the configured Geofence of CIAFAL
 * Includes checks for invalid coordinates, non-Brazil coordinates and zero values
 */
export function validateGeofence(
  lat: number,
  lon: number,
  plantLat = CIAFAL_PLANT_LOCATION.latitude,
  plantLon = CIAFAL_PLANT_LOCATION.longitude,
  maxKm = CIAFAL_PLANT_LOCATION.maxRadiusKm,
  accuracyMeters = 0,
  maxAccuracyTolerance = 500,
): { isWithinRadius: boolean; distanceKm: number; reason?: string } {
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
      reason: 'Coordenadas geográficas não fornecidas ou inválidas.',
    }
  }

  // Basic sanity check for Brazil coordinate bounds
  // Lat: roughly +5 to -34, Lon: roughly -34 to -74
  if (lat > 6 || lat < -35 || lon > -30 || lon < -75) {
    return {
      isWithinRadius: false,
      distanceKm: -1,
      reason: 'Coordenadas geográficas fora do território nacional (Brasil).',
    }
  }

  if (accuracyMeters > 0 && accuracyMeters > maxAccuracyTolerance) {
    return {
      isWithinRadius: false,
      distanceKm: -1,
      reason: `Precisão do GPS inadequada (${Math.round(accuracyMeters)}m). Máximo permitido: ${maxAccuracyTolerance}m.`,
    }
  }

  const dist = calculateDistanceKm(lat, lon, plantLat, plantLon)
  return {
    isWithinRadius: dist <= maxKm,
    distanceKm: dist,
    reason:
      dist > maxKm ? `Distância de ${dist} km excede o raio máximo de ${maxKm} km.` : undefined,
  }
}

// ----------------------------------------------------
// SECURITY & DATA MASKING (LGPD)
// ----------------------------------------------------

/**
 * Masks CPF for display: ***.456.***-01
 */
export function maskCPF(cpfRaw: string): string {
  const clean = (cpfRaw || '').replace(/\D/g, '')
  if (clean.length !== 11) return cpfRaw || '---'
  return `***.${clean.substring(3, 6)}.${clean.substring(6, 9)}-**`
}

/**
 * Masks CNPJ for display: **.***.678/0001-**
 */
export function maskCNPJ(cnpjRaw: string): string {
  const clean = (cnpjRaw || '').replace(/\D/g, '')
  if (clean.length !== 14) return cnpjRaw || '---'
  return `**.***.${clean.substring(5, 8)}/${clean.substring(8, 12)}-**`
}

/**
 * Generic Document Masker
 */
export function maskDocument(docRaw: string): string {
  const clean = (docRaw || '').replace(/\D/g, '')
  if (clean.length === 11) return maskCPF(clean)
  if (clean.length === 14) return maskCNPJ(clean)
  return docRaw || '---'
}

/**
 * Masks Phone / WhatsApp: (11) 9****-1234
 */
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

/**
 * Formats Clean Phone to Standard UI: (11) 98765-4321
 */
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

/**
 * Formats Document (full formatted CPF or CNPJ)
 */
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
  canViewFullSensitiveData: boolean // Without masking
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
    }
  }
  return ROLE_PERMISSIONS[role]
}

// ----------------------------------------------------
// SPRINT 1.1: DETERMINISTIC ELIGIBILITY EVALUATION
// ----------------------------------------------------

export interface DriverEligibilityEvaluation {
  isEligible: boolean
  reasons: string[] // COMPLETE list of reasons (never just the first one)
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

/**
 * Deterministic freight offer eligibility service
 * Evaluates all 8 corporate rules and returns full diagnostic breakdown
 */
export function avaliar_elegibilidade_motorista_oferta(
  input: EvaluateEligibilityInput,
): DriverEligibilityEvaluation {
  const reasons: string[] = []
  const evaluatedAt = new Date().toISOString()
  const ruleEngineVersion = '1.1.0-SPRINT1.1'

  const { driver, queueEntry, offerStageGroup, requiredVehicleType } = input

  // 1. Motorista na fila
  const inQueue = !!queueEntry && queueEntry.status !== 'removido'
  if (!inQueue) {
    reasons.push('Motorista não se encontra registrado na fila operacional.')
  }

  // 2. Cadastro ativo
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

  // 5. Veículo compatível quando a regra for conhecida
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

  // 8. Pertence ao grupo correto da etapa do leilão (PORTA na 1ª janela, FORA na 2ª janela)
  const correctAuctionGroup = !!queueEntry && queueEntry.type === offerStageGroup
  if (queueEntry && queueEntry.type !== offerStageGroup) {
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
// SPRINT 1.1: ABSTRACT MESSAGING INTERFACES (ADAPTER PATTERN)
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

/**
 * WhatsApp Adapter - Sprint 1.1 Simulation & Readiness for Sprint 2
 */
export class WhatsAppAdapter implements CanalMensagem {
  readonly channelName = 'whatsapp'
  private isConnected = false

  isConfigured(): boolean {
    return this.isConnected
  }

  async sendMessage(payload: OutboundMessagePayload): Promise<MessageDispatchResult> {
    // Sprint 1.1: Simulation only, no fake credentials or real network calls
    return {
      success: true,
      channel: 'whatsapp',
      dispatchId: `WPP-${Date.now()}-${payload.correlationId}`,
      dispatchedAt: new Date().toISOString(),
    }
  }
}

/**
 * Telegram Adapter - Sprint 1.1 Simulation & Readiness for Sprint 2
 */
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
