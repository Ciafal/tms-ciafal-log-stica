// TMS CIAFAL — Sprint 4: Contrato de Integração CRM 360°
// Plataforma da ação comercial e relacionamento.
// Oportunidades de Complemento de Carga (TMS → CRM 360°).
// Retorno CRM → TMS: Em análise, Cliente contatado, Sem interesse, Cotação criada, Pedido gerado.
// O TMS somente considera novo pedido oficial após retorno pelo SAP.

import { eventBus, CircuitBreaker, sanitizeLogPayload } from './integrationsCore'

export type CrmOpportunityStatus =
  | 'Em análise'
  | 'Cliente contatado'
  | 'Sem interesse'
  | 'Cotação criada'
  | 'Pedido gerado'
  | 'Rejeitado'

export interface CrmComplementOpportunityPayload {
  cargoId: string
  itineraryCode: string
  targetDate: string
  residualCapacityKg: number
  candidateClients: Array<{ customerCode: string; customerName: string; salesRep?: string }>
  candidateOrders: string[]
  salesRep: string
  opportunityReason: string
  validityMinutes: number
  correlationId: string
  sentBy: string
}

export interface CrmComplementOpportunityResponse {
  success: boolean
  crmOpportunityId?: string
  status: CrmOpportunityStatus
  feedbackMessage?: string
  salesRepAssigned?: string
  crmTimestamp: string
  generatedOrderSapNumber?: string // Preenchido apenas quando Pedido gerado no SAP
  correlationId: string
}

export interface CrmContractConfig {
  endpoint: string
  webhookUrl: string
  version: string
  authType: string
  rateLimitPerMinute: number
  replayProtectionSeconds: number
  isWebhookSecured: boolean
  isHomologated: boolean
}

export interface CrmIntegrationContract {
  isConfigured(): boolean
  getContractConfig(): CrmContractConfig
  testCrmConnection(): Promise<{
    success: boolean
    endpoint: string
    webhookStatus: string
    responseCode: number
    latencyMs: number
    timestamp: string
    correlationId: string
    message: string
  }>
  sendComplementOpportunity(
    payload: CrmComplementOpportunityPayload,
  ): Promise<CrmComplementOpportunityResponse>
  syncOpportunityStatus(crmOpportunityId: string): Promise<CrmComplementOpportunityResponse>
}

export class CrmService implements CrmIntegrationContract {
  private isConnected = false
  private circuitBreaker = new CircuitBreaker('CRM_360')
  private localOpportunityStore = new Map<string, CrmComplementOpportunityResponse>()
  private contractConfig: CrmContractConfig = {
    endpoint: 'https://crm360.ciafal.corp/api/v2/oportunidades-logistica',
    webhookUrl: 'https://tms.ciafal.corp/api/webhooks/crm-status',
    version: 'CRM-OPP-V1.2',
    authType: 'Bearer HMAC-SHA256 Token Mascarado',
    rateLimitPerMinute: 60,
    replayProtectionSeconds: 300,
    isWebhookSecured: true,
    isHomologated: false,
  }

  isConfigured(): boolean {
    return this.isConnected
  }

  getContractConfig(): CrmContractConfig {
    return this.contractConfig
  }

  async testCrmConnection(): Promise<{
    success: boolean
    endpoint: string
    webhookStatus: string
    responseCode: number
    latencyMs: number
    timestamp: string
    correlationId: string
    message: string
  }> {
    throw new Error('Integração CRM não configurada. Conectividade não foi simulada.')
  }

  async sendComplementOpportunity(
    payload: CrmComplementOpportunityPayload,
  ): Promise<CrmComplementOpportunityResponse> {
    throw new Error('Integração CRM indisponível. Nenhuma oportunidade foi enviada.')
  }

  async syncOpportunityStatus(crmOpportunityId: string): Promise<CrmComplementOpportunityResponse> {
    throw new Error('Status CRM não disponível. Nenhum retorno foi simulado.')
  }
}

export const crmService = new CrmService()
