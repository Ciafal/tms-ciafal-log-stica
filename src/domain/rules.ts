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
  status: 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado'
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
  // Reject all same digits (00000000000, 11111111111, etc.)
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
 * Validates if coordinates are within the 60km Geofence of CIAFAL
 */
export function validateGeofence(
  lat: number,
  lon: number,
  plantLat = CIAFAL_PLANT_LOCATION.latitude,
  plantLon = CIAFAL_PLANT_LOCATION.longitude,
  maxKm = CIAFAL_PLANT_LOCATION.maxRadiusKm,
): { isWithinRadius: boolean; distanceKm: number } {
  if (!lat || !lon || isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) {
    return { isWithinRadius: false, distanceKm: -1 }
  }
  const dist = calculateDistanceKm(lat, lon, plantLat, plantLon)
  return {
    isWithinRadius: dist <= maxKm,
    distanceKm: dist,
  }
}

// ----------------------------------------------------
// SECURITY & DATA MASKING
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
