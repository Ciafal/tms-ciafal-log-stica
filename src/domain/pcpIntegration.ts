// TMS CIAFAL — Sprint 4: Contrato de Integração PCP Robotizado
// Fonte de programação operacional de produção.
// Não duplica o Planejamento Mestre SAP.
// Evento de alteração de PCP: identifica simulações, cargas, complementos e veículos impactados.
// Estoque futuro do PCP é PREVISÃO, nunca estoque existente.

import { eventBus, CircuitBreaker, sanitizeLogPayload } from './integrationsCore'

export interface PcpProgramItem {
  line: string
  productionOrderNumber: string
  materialCode: string
  materialDescription: string
  family: string
  quantityPlanned: number
  quantityProduced: number
  unit: string
  weightKgPlanned: number
  scheduledDate: string
  shift: string
  sequence: number
  status: 'Programada' | 'Em Produção' | 'Reprogramada' | 'Concluída' | 'Cancelada'
  programVersion: string
  lastModified: string
  estimatedCompletion?: string
  confidencePct: number
}

export interface PcpChangeEvent {
  materialCode: string
  materialDescription: string
  originalDate: string
  newDate: string
  originalQuantity: number
  newQuantity: number
  productionOrderNumber: string
  reason: string
  timestamp: string
  affectedScenarios: string[]
  affectedCargos: string[]
  affectedComplements: string[]
  affectedVehicles: string[]
}

export interface PcpIntegrationContract {
  isConfigured(): boolean
  fetchActiveProgram(targetDate?: string): Promise<{
    version: string
    timestamp: string
    items: PcpProgramItem[]
    status: string
  }>
  processScheduleChange(change: {
    productionOrderNumber: string
    materialCode: string
    newDate: string
    newQuantity?: number
    activeScenarios: Array<{ id: string; title: string; orders: Array<{ material?: string }> }>
    activeCargos: Array<{ id: string; material?: string }>
  }): PcpChangeEvent
}

export class PcpService implements PcpIntegrationContract {
  private isConnected = false
  private circuitBreaker = new CircuitBreaker('PCP_ROBOTIZADO')

  isConfigured(): boolean {
    return this.isConnected
  }

  async fetchActiveProgram(targetDate?: string): Promise<{
    version: string
    timestamp: string
    items: PcpProgramItem[]
    status: string
  }> {
    if (!this.isConfigured()) {
      return {
        version: 'v2026.08-PRD-01',
        timestamp: new Date().toISOString(),
        status: 'Aguardando configuração',
        items: [],
      }
    }
    return {
      version: 'v2026.08-LIVE-02',
      timestamp: new Date().toISOString(),
      status: 'Conectado',
      items: [],
    }
  }

  processScheduleChange(change: {
    productionOrderNumber: string
    materialCode: string
    newDate: string
    newQuantity?: number
    activeScenarios: Array<{ id: string; title: string; orders: Array<{ material?: string }> }>
    activeCargos: Array<{ id: string; material?: string }>
  }): PcpChangeEvent {
    const affectedScenarios: string[] = []
    const affectedCargos: string[] = []

    change.activeScenarios.forEach((scen) => {
      const hasMat = scen.orders.some((o) => o.material === change.materialCode)
      if (hasMat) {
        affectedScenarios.push(scen.id)
      }
    })

    change.activeCargos.forEach((c) => {
      if (c.material === change.materialCode) {
        affectedCargos.push(c.id)
      }
    })

    const pcpEvent: PcpChangeEvent = {
      materialCode: change.materialCode,
      materialDescription: `Material ${change.materialCode}`,
      originalDate: '2026-08-29',
      newDate: change.newDate,
      originalQuantity: 20,
      newQuantity: change.newQuantity || 20,
      productionOrderNumber: change.productionOrderNumber,
      reason: 'Ajuste de sequência operacional do laminador no PCP Robotizado',
      timestamp: new Date().toISOString(),
      affectedScenarios,
      affectedCargos,
      affectedComplements: affectedScenarios.map((id) => `COMPL-${id}`),
      affectedVehicles: affectedCargos.map((id) => `VEIC-${id}`),
    }

    // Publica no event bus para alertar os operadores
    eventBus.publish('ProgramacaoPCPAlterada', pcpEvent, 'PcpService')

    return pcpEvent
  }
}

export const pcpService = new PcpService()
