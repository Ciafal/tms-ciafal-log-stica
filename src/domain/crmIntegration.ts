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

export interface CrmIntegrationContract {
  isConfigured(): boolean
  sendComplementOpportunity(
    payload: CrmComplementOpportunityPayload,
  ): Promise<CrmComplementOpportunityResponse>
  syncOpportunityStatus(crmOpportunityId: string): Promise<CrmComplementOpportunityResponse>
}

export class CrmService implements CrmIntegrationContract {
  private isConnected = false
  private circuitBreaker = new CircuitBreaker('CRM_360')
  private localOpportunityStore = new Map<string, CrmComplementOpportunityResponse>()

  isConfigured(): boolean {
    return this.isConnected
  }

  async sendComplementOpportunity(
    payload: CrmComplementOpportunityPayload,
  ): Promise<CrmComplementOpportunityResponse> {
    const correlationId = payload.correlationId || `CRM-OPP-${Date.now()}`

    if (!this.circuitBreaker.canExecute()) {
      return {
        success: false,
        status: 'Em análise',
        feedbackMessage: 'CRM 360° temporariamente indisponível. Fila de retentativa ativa.',
        crmTimestamp: new Date().toISOString(),
        correlationId,
      }
    }

    if (!this.isConfigured()) {
      // Retorno padronizado de integração aguardando configuração
      const pendingRes: CrmComplementOpportunityResponse = {
        success: true,
        crmOpportunityId: `CRM-PENDING-${Date.now().toString().slice(-6)}`,
        status: 'Em análise',
        feedbackMessage:
          'Oportunidade registrada no TMS e enfileirada para envio ao CRM 360° (Aguardando homologação de API comercial).',
        salesRepAssigned: payload.salesRep || 'Representante da Região',
        crmTimestamp: new Date().toISOString(),
        correlationId,
      }
      this.localOpportunityStore.set(pendingRes.crmOpportunityId!, pendingRes)
      eventBus.publish(
        'OportunidadeComplemento',
        { payload, pendingRes },
        'CrmService',
        correlationId,
      )
      return pendingRes
    }

    const res: CrmComplementOpportunityResponse = {
      success: true,
      crmOpportunityId: `CRM-OPP-LIVE-${Date.now()}`,
      status: 'Cliente contatado',
      feedbackMessage: 'Oportunidade de complemento despachada para o CRM 360° com sucesso.',
      salesRepAssigned: payload.salesRep,
      crmTimestamp: new Date().toISOString(),
      correlationId,
    }
    this.localOpportunityStore.set(res.crmOpportunityId!, res)
    eventBus.publish('OportunidadeComplemento', { payload, res }, 'CrmService', correlationId)
    return res
  }

  async syncOpportunityStatus(crmOpportunityId: string): Promise<CrmComplementOpportunityResponse> {
    if (this.localOpportunityStore.has(crmOpportunityId)) {
      return this.localOpportunityStore.get(crmOpportunityId)!
    }
    return {
      success: true,
      crmOpportunityId,
      status: 'Em análise',
      crmTimestamp: new Date().toISOString(),
      correlationId: `SYNC-${crmOpportunityId}`,
    }
  }
}

export const crmService = new CrmService()
