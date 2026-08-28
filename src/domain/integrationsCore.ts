// TMS CIAFAL — Sprint 4: Arquitetura de Integrações Operacionais Reais
// Regra central: SAP é System of Record, PCP é fonte de produção, CRM é ação comercial, TMS orquestra.
// Sem endpoints simulados como operacionais: se pendente -> "Aguardando configuração".

export type IntegrationEnvironment = 'DEV' | 'HOMOLOGACAO' | 'PRODUCAO'

export type IntegrationStatus =
  | 'Conectado'
  | 'Degradado'
  | 'Aguardando configuração'
  | 'Erro'
  | 'Desabilitado'
  | 'Simulação'

export type HomologationStatus =
  | 'Não iniciada'
  | 'Configuração pendente'
  | 'Pronta para teste'
  | 'Em homologação'
  | 'Homologada'
  | 'Bloqueada'
  | 'Produção'

export interface IntegrationHealthMetric {
  id: string
  name: string
  category: string
  protocol: string
  environment: IntegrationEnvironment
  status: IntegrationStatus
  maskedEndpointOrDest: string
  isContractConfigured: boolean
  isCredentialConfigured: boolean
  isConnectionTested: boolean
  lastTestTimestamp?: string
  lastCommunication?: string
  lastSuccess?: string
  lastError?: string
  recordsCount: number
  latencyMs: number
  pendingQueueCount: number
  retriesCount: number
  contractVersion: string
  isCircuitOpen: boolean
  failureCount: number
  technicalOwner: string
  homologationStatus: HomologationStatus
  description: string
  blueprintStatus:
    | 'Confirmado'
    | 'A confirmar'
    | 'Não existe standard'
    | 'Será Z'
    | 'Em desenvolvimento'
    | 'Homologado'
}

export interface DeadLetterEntry {
  id: string
  integrationId: string
  correlationId: string
  idempotencyKey: string
  direction: 'INBOUND' | 'OUTBOUND'
  endpointOrRfc: string
  payloadMasked: Record<string, any>
  attempts: number
  maxAttempts: number
  lastError: string
  nextAttempt?: string
  createdAt: string
  status: 'QUEUED' | 'RETRYING' | 'DEAD_LETTER' | 'RESOLVED'
}

export interface CorrelationContext {
  correlationId: string
  idempotencyKey: string
  timestamp: string
  origin: string
  destination: string
  retryCount: number
  userEmail?: string
}

export interface IntegrationLogEntry {
  id: string
  integrationId: string
  correlationId: string
  idempotencyKey: string
  direction: 'INBOUND' | 'OUTBOUND'
  endpointOrRfc: string
  status: 'SUCCESS' | 'ERROR' | 'PENDING' | 'RETRYING'
  httpOrSapCode?: number | string
  payloadMasked?: Record<string, any>
  errorMessage?: string
  latencyMs: number
  timestamp: string
  environment: IntegrationEnvironment
}

// ----------------------------------------------------
// EVENT BUS INTERNO
// ----------------------------------------------------
export type InternalEventType =
  | 'PedidoAtualizado'
  | 'EstoqueAtualizado'
  | 'CreditoAtualizado'
  | 'ProgramacaoPCPAlterada'
  | 'RotaAtualizada'
  | 'OportunidadeComplemento'
  | 'OfertaCriada'
  | 'TransporteSAPConfirmado'
  | 'TransporteSAPPendente'

export interface InternalEvent<T = any> {
  type: InternalEventType
  payload: T
  correlationId: string
  timestamp: string
  source: string
}

type EventListener<T = any> = (event: InternalEvent<T>) => void

class InternalEventBus {
  private listeners: Map<InternalEventType, Set<EventListener>> = new Map()

  subscribe<T = any>(type: InternalEventType, listener: EventListener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)
    return () => this.unsubscribe(type, listener)
  }

  unsubscribe<T = any>(type: InternalEventType, listener: EventListener<T>) {
    const set = this.listeners.get(type)
    if (set) {
      set.delete(listener)
    }
  }

  publish<T = any>(type: InternalEventType, payload: T, source = 'TMS', correlationId?: string) {
    const event: InternalEvent<T> = {
      type,
      payload,
      correlationId: correlationId || `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      source,
    }
    const set = this.listeners.get(type)
    if (set) {
      set.forEach((listener) => {
        try {
          listener(event)
        } catch (err) {
          console.error(`Error in event listener for ${type}:`, err)
        }
      })
    }
  }
}

export const eventBus = new InternalEventBus()

// ----------------------------------------------------
// CIRCUIT BREAKER & RETRY POLICY
// ----------------------------------------------------
export interface CircuitBreakerConfig {
  failureThreshold: number
  cooldownMs: number
  maxRetries: number
  timeoutMs: number
}

export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private isOpen = false

  constructor(
    public readonly name: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 3,
      cooldownMs: 30000,
      maxRetries: 2,
      timeoutMs: 8000,
    },
  ) {}

  get status(): 'OPEN' | 'HALF_OPEN' | 'CLOSED' {
    if (!this.isOpen) return 'CLOSED'
    if (Date.now() - this.lastFailureTime > this.config.cooldownMs) {
      return 'HALF_OPEN'
    }
    return 'OPEN'
  }

  recordSuccess() {
    this.failureCount = 0
    this.isOpen = false
  }

  recordFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()
    if (this.failureCount >= this.config.failureThreshold) {
      this.isOpen = true
    }
  }

  canExecute(): boolean {
    const s = this.status
    return s === 'CLOSED' || s === 'HALF_OPEN'
  }

  get isCircuitOpen(): boolean {
    return this.status === 'OPEN'
  }

  get currentFailures(): number {
    return this.failureCount
  }
}

// ----------------------------------------------------
// STALE DATA MANAGER & CACHE (TTL)
// ----------------------------------------------------
export interface StaleConfig {
  maxAgeMinutes: number
}

export const STALE_POLICIES: Record<string, StaleConfig> = {
  SAP_CARTEIRA: { maxAgeMinutes: 15 },
  SAP_ESTOQUE: { maxAgeMinutes: 10 },
  SAP_CREDITO: { maxAgeMinutes: 30 },
  PCP_ROBOTIZADO: { maxAgeMinutes: 20 },
  ROUTING_CACHE: { maxAgeMinutes: 1440 }, // 24h
  ANTT_TABLE: { maxAgeMinutes: 10080 }, // 7 dias
}

export function checkIsStale(lastUpdate: Date | string | undefined, sourceKey: string): boolean {
  if (!lastUpdate) return true
  const policy = STALE_POLICIES[sourceKey] || { maxAgeMinutes: 15 }
  const time =
    typeof lastUpdate === 'string' ? new Date(lastUpdate).getTime() : lastUpdate.getTime()
  const ageMs = Date.now() - time
  return ageMs > policy.maxAgeMinutes * 60 * 1000
}

// ----------------------------------------------------
// SENSITIVE DATA MASKING UTILITY
// ----------------------------------------------------
export function sanitizeLogPayload(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  const clone = Array.isArray(obj) ? [...obj] : { ...obj }
  const sensitiveKeys = ['password', 'token', 'secret', 'apikey', 'cpf', 'cnpj', 'auth']

  for (const key of Object.keys(clone)) {
    const lower = key.toLowerCase()
    if (sensitiveKeys.some((s) => lower.includes(s))) {
      if (typeof clone[key] === 'string') {
        const val = clone[key]
        if (val.length > 6) {
          clone[key] = val.substring(0, 3) + '***' + val.substring(val.length - 2)
        } else {
          clone[key] = '***'
        }
      } else {
        clone[key] = '***'
      }
    } else if (typeof clone[key] === 'object') {
      clone[key] = sanitizeLogPayload(clone[key])
    }
  }
  return clone
}
