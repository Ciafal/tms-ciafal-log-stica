import { describe, it, expect } from 'vitest'
import {
  initializeFredTrackingFromSap,
  calculateEtaClassification,
  formatLocationFreshness,
  analyzeImageEvidence,
  formatMessageForAudience,
  buildAiAnomalyReport,
  AutoTransitionSapToFredInput,
} from '@/domain/fredTrackingEngine'
import { ROLE_PERMISSIONS } from '@/domain/rules'

describe('Sprint 8: Agente Fred — Acompanhamento de Viagens, Entregas, Ocorrências e SLAs', () => {
  // 1. Início automático do acompanhamento após transporte criado no SAP
  it('1. Deve inicializar acompanhamento Fred automaticamente a partir de dados do transporte SAP sem recadastro manual', () => {
    const input: AutoTransitionSapToFredInput = {
      sapTransportNumber: '998877',
      cargoId: 'CARGA-TEST-01',
      driverId: 'drv-010',
      driverName: 'Marcos de Oliveira',
      driverPhone: '11999998888',
      vehiclePlate: 'CIA8899',
      vehicleType: 'Carreta LS',
      carrierName: 'Expresso CIAFAL',
      itineraryCode: 'SP001',
      deliveries: [
        {
          sequence: 1,
          customerCode: 'CLI-001',
          customerName: 'Cliente Alpha',
          destinationCity: 'Campinas',
          destinationUf: 'SP',
          orders: ['PED-101'],
          invoices: ['NF-201'],
          weightKg: 12000,
          initialPlannedArrival: '2025-05-10T10:00:00Z',
          windowEnd: '12:00',
        },
        {
          sequence: 2,
          customerCode: 'CLI-002',
          customerName: 'Cliente Beta',
          destinationCity: 'Americana',
          destinationUf: 'SP',
          orders: ['PED-102'],
          invoices: ['NF-202'],
          weightKg: 14000,
          initialPlannedArrival: '2025-05-10T14:00:00Z',
          windowEnd: '16:00',
        },
      ],
    }

    const result = initializeFredTrackingFromSap(input)

    expect(result.transport.sap_transport_number).toBe('998877')
    expect(result.transport.driver_name).toBe('Marcos de Oliveira')
    expect(result.transport.total_weight_kg).toBe(26000)
    expect(result.transport.total_deliveries_count).toBe(2)
    expect(result.transport.trip_status).toBe('AGUARDANDO_SAIDA')
    expect(result.transport.active_actor).toBe('FRED_IA')

    expect(result.deliveries).toHaveLength(2)
    expect(result.deliveries[0].customer_name).toBe('Cliente Alpha')

    expect(result.welcomeMessage.target_audience).toBe('MOTORISTA')
    expect(result.welcomeMessage.message_text).toContain('Sou o Fred, assistente de acompanhamento de transporte da CIAFAL')
  })

  // 2. Cálculo e classificação inteligente de ETA
  it('2. Deve classificar ETA corretamente (Dentro do previsto, Risco, Atrasado, Entregue)', () => {
    // No prazo (desvio de 5 minutos)
    const onTime = calculateEtaClassification({
      initialPlannedArrival: '2025-05-10T10:00:00Z',
      currentEstimatedArrival: '2025-05-10T10:05:00Z',
    })
    expect(onTime.status).toBe('DENTRO_PREVISTO')
    expect(onTime.delayMinutes).toBe(5)

    // Risco de atraso (desvio de 20 minutos)
    const atRisk = calculateEtaClassification({
      initialPlannedArrival: '2025-05-10T10:00:00Z',
      currentEstimatedArrival: '2025-05-10T10:20:00Z',
    })
    expect(atRisk.status).toBe('RISCO_ATRASO')
    expect(atRisk.delayMinutes).toBe(20)

    // Atrasado (> 30 minutos)
    const delayed = calculateEtaClassification({
      initialPlannedArrival: '2025-05-10T10:00:00Z',
      currentEstimatedArrival: '2025-05-10T10:45:00Z',
    })
    expect(delayed.status).toBe('ATRASADO')
    expect(delayed.delayMinutes).toBe(45)

    // Entregue
    const delivered = calculateEtaClassification({
      initialPlannedArrival: '2025-05-10T10:00:00Z',
      currentEstimatedArrival: '2025-05-10T10:00:00Z',
      isDelivered: true,
    })
    expect(delivered.status).toBe('ENTREGUE')
  })

  // 3. Regra de Geolocalização: Nunca apresentar localização antiga como atual
  it('3. Deve sinalizar defasagem temporal de GPS e nunca omitir tempo decorrido', () => {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    const fortyMinutesAgo = new Date(now.getTime() - 40 * 60 * 1000).toISOString()

    const freshResult = formatLocationFreshness(fiveMinutesAgo)
    expect(freshResult.isStale).toBe(false)
    expect(freshResult.minutesAgo).toBe(5)
    expect(freshResult.formattedText).toContain('atualizada há 5 minutos')

    const staleResult = formatLocationFreshness(fortyMinutesAgo, 30)
    expect(staleResult.isStale).toBe(true)
    expect(staleResult.minutesAgo).toBe(40)
    expect(staleResult.formattedText).toContain('Sinal antigo')
  })

  // 4. Classificação de imagem exigindo confirmação humana antes de virar fato
  it('4. Deve sugerir classificação de imagem pelo Fred exigindo confirmação humana', () => {
    const canhoto = analyzeImageEvidence('foto_canhoto_nf5501.jpg', 'Canhoto assinado pelo cliente')
    expect(canhoto.suggestedTag).toBe('CANHOTO_ASSINADO')
    expect(canhoto.requiresHumanConfirmation).toBe(true)
    expect(canhoto.confidencePct).toBeGreaterThanOrEqual(90)

    const fila = analyzeImageEvidence('espera_patio.jpg', 'Fila de caminhões na portaria')
    expect(canhoto.requiresHumanConfirmation).toBe(true)
    expect(fila.suggestedOccurrenceCategory).toBe('FILA_ESPERA')
  })

  // 5. Segregação de públicos (Cliente vs Vendedor vs Motorista) e não vazamento comercial
  it('5. Deve formatar dados para o cliente e motorista sem vazar margens corporativas ou custos de pedágio internos', () => {
    const clientMsg = formatMessageForAudience({
      audience: 'CLIENTE',
      rawContent: 'Valor pago frete R$ 4.500, pedágio R$ 320, margem 14%',
      sapTransportNumber: '123456',
      driverName: 'João Silva',
      vehiclePlate: 'BRA2E19',
      currentEtaStr: '15:18',
      clientName: 'Comercial ABC Metais',
    })

    expect(clientMsg).toContain('Transporte 123456 (Veículo BRA2E19)')
    expect(clientMsg).toContain('15:18')
    expect(clientMsg).not.toContain('margem')
    expect(clientMsg).not.toContain('pedágio R$ 320')
  })

  // 6. Princípio de Auditoria IA: Separação entre Fato Observado e Hipótese
  it('6. Deve separar claramente Fato Observado de Hipótese da IA no relatório de anomalias', () => {
    const report = buildAiAnomalyReport('Comercial ABC Metais Ltda', 97, 45, 14)
    expect(report.detectedFact).toContain('FATO OBSERVADO:')
    expect(report.detectedFact).toContain('97 minutos em 14 viagens')
    expect(report.aiHypothesis).toContain('HIPÓTESE DA IA:')
    expect(report.confidenceLevel).toBe('ALTA')
    expect(report.disclaimerText).toContain('Princípio de Auditoria CIAFAL')
  })

  // 7. Permissões RBAC do Fred
  it('7. Deve validar permissões de acompanhamento, supervisão e controle do Fred', () => {
    expect(ROLE_PERMISSIONS.admin_master.canTrackFred).toBe(true)
    expect(ROLE_PERMISSIONS.admin_master.canTakeoverFredConversation).toBe(true)
    expect(ROLE_PERMISSIONS.operador_logistica.canTakeoverFredConversation).toBe(true)
    expect(ROLE_PERMISSIONS.portaria.canTakeoverFredConversation).toBe(false)
    expect(ROLE_PERMISSIONS.comercial.canTrackFred).toBe(true)
    expect(ROLE_PERMISSIONS.comercial.canTakeoverFredConversation).toBe(false)
  })
})
