// TMS CIAFAL — Sprint 5: Motor de Impressão de Ordem de Transporte e Integração SAP
// Fluxo: CARGA APROVADA → MESA DE FRETES → CONTRATAÇÃO → SOLICITAR ORDEM SAP → ORDEM CRIADA → IMPRESSÃO FÍSICA → ENTREGA MOTORISTA

export type PrintProtocol = 'IPP' | 'CUPS' | 'WINDOWS_SPOOLER' | 'LPR_LPD' | 'RAW_SOCKET'
export type PrinterEnvironment = 'DEV' | 'HOMOLOGACAO' | 'PRODUCAO'
export type PrintJobStatus = 'Pendente' | 'Enviado' | 'Impresso' | 'Erro' | 'Cancelado'
export type SapTransportStatus = 'Pendente' | 'Criado' | 'Erro' | 'Nao_Solicitado'
export type DocumentDeliveryStatus = 'Aguardando_Impressao' | 'Impresso' | 'Entregue_Motorista'

export interface PrinterDeviceEntity {
  id: string
  name: string
  description?: string
  location: string // Ex: "Portaria 1 - Expedição Principal"
  plant: string // Ex: "Planta CIAFAL Matriz"
  sector?: string // Ex: "Expedição de Laminados"
  ip_hostname: string // Ex: "10.10.5.42" (nunca expor credenciais)
  port: number // Ex: 631 (IPP) ou 9100 (RAW)
  print_queue_name: string // Ex: "PRT_EXP_DP34_01"
  protocol: PrintProtocol
  driver_type: string // Ex: "Zebra ZT411 / Laser HP LaserJet Enterprise"
  is_active: boolean
  is_default_transport: boolean // Impressora padrão para Ordem de Transporte
  environment: PrinterEnvironment
  status: 'ONLINE' | 'OFFLINE' | 'EM_ERRO' | 'MANUTENCAO'
  last_communication?: string
  last_test_timestamp?: string
  last_error_message?: string
  created?: string
  updated?: string
}

export interface PrintJobEntity {
  id: string
  print_job_id: string // UUID de idempotência
  document_type: 'ORDEM_TRANSPORTE' | 'ROMANEIO_EXPEDICAO' | 'TESTE_IMPRESSAO' | 'REIMPRESSAO_ORDEM'
  cargo_id: string
  sap_transport_number: string // Obrigatório para ordem oficial
  printer_id: string
  printer_name_cached: string
  printer_location_cached: string
  user_email: string
  user_name: string
  copies: number
  is_reprint: boolean
  reprint_reason?: string
  status: PrintJobStatus
  attempts_count: number
  max_attempts: number
  raw_payload_size_bytes?: number
  error_message?: string
  sent_at?: string
  printed_at?: string
  correlation_id: string
  created?: string
  updated?: string
}

export interface DocumentHandoverEntity {
  id: string
  cargo_id: string
  sap_transport_number: string
  print_job_id: string
  driver_id: string
  driver_name: string
  driver_document: string
  vehicle_plate: string
  delivered_by_operator_email: string
  delivered_by_operator_name: string
  delivery_timestamp: string
  notes?: string
  correlation_id: string
  created?: string
}

export interface CargoOperationalTimelineEvent {
  step:
    | 'SCENARIO_CREATED'
    | 'SCENARIO_APPROVED'
    | 'CARGO_GENERATED'
    | 'MESA_FRETES_OFFER'
    | 'DRIVER_CONTRACTED'
    | 'SAP_ORDER_REQUESTED'
    | 'SAP_ORDER_CREATED'
    | 'PRINT_REQUESTED'
    | 'PRINT_COMPLETED'
    | 'DOCUMENT_DELIVERED'
    | 'RELEASED_FOR_LOADING'
  title: string
  description: string
  timestamp: string
  operator: string
  status: 'DONE' | 'IN_PROGRESS' | 'PENDING' | 'ERROR'
  referenceCode?: string
}

export interface CargoDetailedView {
  cargoId: string
  itineraryCode: string
  status:
    | 'Em simulação'
    | 'Planejada'
    | 'Pronta para oferta'
    | 'Em contratação'
    | 'Contratada'
    | 'Ordem SAP pendente'
    | 'Ordem SAP criada'
    | 'Aguardando impressão'
    | 'Documento impresso'
    | 'Documento entregue'
    | 'Liberada para carregamento'
    | 'Cancelada'
  plannedDate: string
  vehicleType: string
  vehiclePlate?: string
  vehicleCapacityKg: number
  totalWeightKg: number
  occupancyPct: number
  ordersCount: number
  customersCount: number
  driverId?: string
  driverName?: string
  driverPhone?: string
  driverDocument?: string
  isPortaDriver: boolean
  contractedFreightValue?: number
  anttFloorValue: number
  sapTransportNumber?: string
  sapTransportStatus: SapTransportStatus
  sapOrderCreatedAt?: string
  printJobStatus: PrintJobStatus
  printJobId?: string
  printedAt?: string
  documentDeliveryStatus: DocumentDeliveryStatus
  deliveredAt?: string
  isReleasedForLoading: boolean
  releasedAt?: string
  timeline: CargoOperationalTimelineEvent[]
}

/**
 * Validação de Elegibilidade para Liberação de Carregamento:
 * "LIBERADA PARA CARREGAMENTO" somente quando:
 * 1. Ordem SAP confirmada e válida
 * 2. Motorista contratado e elegível
 * 3. Veículo validado
 * 4. Estoque DP34 conferido
 * 5. Crédito liberado
 * 6. Documento impresso e entregue ao motorista
 */
export function checkLoadingReleaseReadiness(cargo: Partial<CargoDetailedView>): {
  isReady: boolean
  missingRequirements: string[]
} {
  const missingRequirements: string[] = []

  if (!cargo.sapTransportNumber || cargo.sapTransportStatus !== 'Criado') {
    missingRequirements.push(
      'Ordem de Transporte Oficial SAP não confirmada (pendente retorno SAP).',
    )
  }

  if (!cargo.driverId || !cargo.driverName) {
    missingRequirements.push('Motorista não contratado ou sem cadastro ativo.')
  }

  if (!cargo.vehiclePlate) {
    missingRequirements.push('Placa do veículo não informada ou validada.')
  }

  if (cargo.documentDeliveryStatus !== 'Entregue_Motorista') {
    missingRequirements.push(
      'Documento físico da Ordem de Transporte ainda não entregue ao motorista.',
    )
  }

  return {
    isReady: missingRequirements.length === 0,
    missingRequirements,
  }
}
