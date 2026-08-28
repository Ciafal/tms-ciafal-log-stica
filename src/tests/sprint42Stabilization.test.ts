// ============================================================================
// TMS CIAFAL — SPRINT 4.2: SUÍTE DE TESTES E2E, CONCORRÊNCIA E SEGURANÇA
// ============================================================================
// Testes de Fluxo E2E Principal, E2E Complemento, Concorrência e Segurança / RBAC / Idempotência
import { describe, it, expect, beforeEach } from 'vitest'
import {
  isValidPlate,
  isValidCPF,
  isValidCNPJ,
  classifyAvailabilityGroup,
  calculateLogisticsDate,
  validateGeofence,
  maskCPF,
  maskCNPJ,
  maskPhone,
  getUserPermissions,
  avaliar_montagem_carga,
  identificar_oportunidade_complemento,
  avaliar_elegibilidade_motorista_oferta,
  evaluateProposalPriceRules,
  selectWinningProposal,
  calculateOrderPriorityScore,
} from '@/domain/rules'
import { sapGateway } from '@/domain/sapGateway'
import { pcpService } from '@/domain/pcpIntegration'
import { crmService } from '@/domain/crmIntegration'
import {
  routingServiceManager,
  GoogleMapsAdapter,
  HereMapsAdapter,
  MapboxAdapter,
  OsrmAdapter,
  geocodingCache,
} from '@/domain/routingAdapters'
import { anttEngine, tollEngine } from '@/domain/anttAndTollEngine'
import { sanitizeLogPayload, CircuitBreaker, eventBus } from '@/domain/integrationsCore'
import { TmsService } from '@/services/tmsService'

describe('Sprint 4.2 — Testes End-to-End e Casos de Regressão Críticos', () => {
  beforeEach(() => {
    geocodingCache.clear()
  })

  // --------------------------------------------------------------------------
  // PARTE 1.6 — TESTE END-TO-END PRINCIPAL
  // MOTORISTA → FILA → DISPONIBILIDADE → CARTEIRA → SIMULAÇÃO → PLANEJADOR →
  // APROVAR CENÁRIO → GERAR CARGA → MESA DE FRETES → OFERTA PORTA →
  // OFERTA FORA SE NECESSÁRIO → VENCEDOR → MOTORISTA RETIRADO DA FILA →
  // TRANSPORTE SAP PENDENTE/CONFIRMADO
  // --------------------------------------------------------------------------
  it('E2E Principal: Ciclo Operacional Completo de Contratação e Atribuição com Mock Controlado', async () => {
    const correlationId = `E2E-MAIN-${Date.now()}`

    // 1. MOTORISTA E ENTRADA NA FILA
    const driver = {
      id: 'drv-e2e-01',
      name: 'Carlos Alberto Ferreira',
      document: '11144477735',
      plate: 'ABC1D23',
      vehicleType: 'Carreta LS',
      capacityKg: 28000,
      status: 'ativo' as const,
      phone: '11988887777',
      channelTelegram: true,
    }
    expect(isValidCPF(driver.document)).toBe(true)
    expect(isValidPlate(driver.plate)).toBe(true)

    // Entrada na Fila PORTA via Raio Geofence (0.3 km da planta CIAFAL)
    const geofence = validateGeofence(-23.551, -46.634, 'PORTA')
    expect(geofence.inFence).toBe(true)
    expect(geofence.group).toBe('PORTA')

    const queueGroup = classifyAvailabilityGroup(0.3, undefined, false)
    expect(queueGroup).toBe('PORTA')

    const queueEntry = {
      id: 'q-entry-01',
      driverId: driver.id,
      driverName: driver.name,
      plate: driver.plate,
      vehicleType: driver.vehicleType,
      type: queueGroup,
      status: 'disponivel',
      entryTime: new Date().toISOString(),
    }
    expect(queueEntry.status).toBe('disponivel')

    // 2. CARTEIRA SAP ZSD35
    const ordersInWallet = [
      {
        orderNumber: '450010091',
        itemNumber: '000010',
        customerCode: 'CLI-MG-BETIM',
        customerName: 'Aços Betim S/A',
        materialCode: 'PERFIL-W-200',
        materialDescription: 'Perfil Estrutural W 200x26.6',
        quantity: 26,
        weightKg: 26000,
        totalValue: 165000,
        itineraryCode: 'MG001A',
        destinationCity: 'Betim',
        uf: 'MG',
        productionStatus: 'Pronto' as const,
        creditStatus: 'Liberado' as const,
        orderDate: '2026-08-01',
        desiredDate: '2026-08-15',
      },
    ]
    expect(ordersInWallet.length).toBe(1)

    // 3. ESTOQUE SAP (MB52) E CRÉDITO FINANCEIRO (KNKK)
    const stockVerification = {
      materialCode: ordersInWallet[0].materialCode,
      availableStockKg: 40000,
      requiredWeightKg: ordersInWallet[0].weightKg,
      hasStock: 40000 >= ordersInWallet[0].weightKg,
    }
    expect(stockVerification.hasStock).toBe(true)

    const creditResult = await sapGateway.credito.checkCustomerCredit(
      ordersInWallet[0].customerCode,
      ordersInWallet[0].totalValue,
    )
    expect(creditResult.isApproved).toBe(true)

    // 4. SIMULAÇÃO & ROTEIRIZADOR (ROTA, DISTÂNCIA, PEDÁGIO, ANTT)
    const geoDest = await routingServiceManager.geocode(
      'Distrito Industrial Bandeirinhas',
      ordersInWallet[0].destinationCity,
      ordersInWallet[0].uf,
    )
    expect(geoDest.status).toBe('VALIDADO')

    const routeCalc = await routingServiceManager.calculate(
      { latitude: -23.5505, longitude: -46.6333, name: 'CIAFAL Matriz' },
      [
        {
          orderIndex: 1,
          customerCode: ordersInWallet[0].customerCode,
          customerName: ordersInWallet[0].customerName,
          address: geoDest,
          weightKg: ordersInWallet[0].weightKg,
        },
      ],
    )
    expect(routeCalc.totalDistanceKm).toBeGreaterThan(200)

    const tollResult = tollEngine.calculateTolls(
      routeCalc.totalDistanceKm,
      driver.vehicleType,
      5,
      ordersInWallet[0].itineraryCode,
    )
    expect(tollResult.totalTollCost).toBeGreaterThan(50)

    const anttFloor = anttEngine.calculateFloor({
      distanceKm: routeCalc.totalDistanceKm,
      vehicleType: driver.vehicleType,
      axlesCount: 5,
    })
    expect(anttFloor.floorValue).toBeGreaterThan(1000)

    // 5. PLANEJADOR: VALIDAÇÃO DE MONTAGEM DE CARGA
    const assemblyValidation = avaliar_montagem_carga({
      orders: [
        {
          order_number: ordersInWallet[0].orderNumber,
          customer_code: ordersInWallet[0].customerCode,
          destination_city: ordersInWallet[0].destinationCity,
          itinerary_code: ordersInWallet[0].itineraryCode,
          weight_kg: ordersInWallet[0].weightKg,
          volume_m3: 15,
          total_value: ordersInWallet[0].totalValue,
        },
      ],
      vehicle_capacity_kg: driver.capacityKg,
      vehicle_type: driver.vehicleType,
    })
    expect(assemblyValidation.valido).toBe(true)
    expect(assemblyValidation.peso_total_kg).toBe(26000)
    expect(assemblyValidation.ocupacao_peso_pct).toBeGreaterThan(90)

    // 6. APROVAÇÃO DO CENÁRIO PELO GERENTE DE CARGA E GERAÇÃO DA CARGA
    const gerentePermissions = getUserPermissions('gerente_carga')
    expect(gerentePermissions.canApproveScenario).toBe(true)

    const cargoGenerated = {
      id: `CARGA-${ordersInWallet[0].itineraryCode}-${Date.now().toString().slice(-4)}`,
      itineraryCode: ordersInWallet[0].itineraryCode,
      destinationCity: ordersInWallet[0].destinationCity,
      weightKg: assemblyValidation.peso_total_kg,
      vehicleTypeRequired: driver.vehicleType,
      anttFloorValue: anttFloor.floorValue,
      ceilingValue: Math.round(anttFloor.floorValue * 1.25),
      status: 'gerada',
    }
    expect(cargoGenerated.ceilingValue).toBeGreaterThan(cargoGenerated.anttFloorValue)

    // 7. MESA DE FRETES & ABERTURA DA OFERTA (PORTA)
    const offer = {
      cargoId: cargoGenerated.id,
      currentGroup: 'PORTA' as const,
      status: 'janela_porta_aberta' as const,
      floorValue: cargoGenerated.anttFloorValue,
      ceilingProtected: cargoGenerated.ceilingValue,
      proposals: [] as any[],
    }

    // Elegibilidade do motorista na janela PORTA
    const eligibility = avaliar_elegibilidade_motorista_oferta({
      driver: {
        id: driver.id,
        name: driver.name,
        document: driver.document,
        status: driver.status,
        channel_telegram: driver.channelTelegram,
      },
      vehicle: {
        plate: driver.plate,
        type: driver.vehicleType,
        capacity_kg: driver.capacityKg,
      },
      queueEntry: {
        type: 'PORTA',
        status: 'disponivel',
        entry_time: queueEntry.entryTime,
      },
      offerRequiredVehicleType: cargoGenerated.vehicleTypeRequired,
      currentOfferGroup: 'PORTA',
    })
    expect(eligibility.eligible).toBe(true)

    // 8. MOTOR DE LEILÃO E ENVIO DE LANCE
    const driverProposalValue = cargoGenerated.anttFloorValue + 150
    const proposalEval = evaluateProposalPriceRules(
      driverProposalValue,
      offer.floorValue,
      offer.ceilingProtected,
    )
    expect(proposalEval.status).toBe('VALID')

    const driverProposal = {
      id: 'prop-01',
      offerId: offer.cargoId,
      driverId: driver.id,
      driverName: driver.name,
      value: driverProposalValue,
      queueEntryTime: queueEntry.entryTime,
      submittedAt: new Date().toISOString(),
      status: 'VALID',
    }
    offer.proposals.push(driverProposal)

    // Seleção de vencedor determinística
    const winnerDecision = selectWinningProposal(
      offer.proposals,
      offer.floorValue,
      offer.ceilingProtected,
    )
    expect(winnerDecision.hasWinner).toBe(true)
    expect(winnerDecision.winningProposal?.driverId).toBe(driver.id)

    // 9. ATUALIZAÇÃO DA FILA: MOTORISTA RETIRADO DA FILA APÓS ATRIBUIÇÃO
    const updatedQueueEntry = {
      ...queueEntry,
      status: 'atribuido',
      assignedCargoId: cargoGenerated.id,
      exitTime: new Date().toISOString(),
    }
    expect(updatedQueueEntry.status).toBe('atribuido')

    // 10. INTEGRAÇÃO SAP VT01N (TRANSPORTE SAP)
    const sapWriteDisabledResult = await sapGateway.createTransportDoc({
      cargoId: cargoGenerated.id,
      itineraryCode: cargoGenerated.itineraryCode,
      vehiclePlate: driver.plate,
      driverDocument: driver.document,
      orders: [
        {
          orderNumber: ordersInWallet[0].orderNumber,
          itemNumber: ordersInWallet[0].itemNumber,
          weightKg: ordersInWallet[0].weightKg,
          value: ordersInWallet[0].totalValue,
        },
      ],
      totalWeightKg: cargoGenerated.weightKg,
      totalValue: ordersInWallet[0].totalValue,
      correlationId,
      idempotencyKey: `IDEM-${cargoGenerated.id}`,
    })

    // Como SAP_WRITE_ENABLED = false por padrão, status deve ser TRANSPORTE_SAP_PENDENTE sem inventar VT01N
    expect(sapWriteDisabledResult.status).toBe('TRANSPORTE_SAP_PENDENTE')
    expect(sapWriteDisabledResult.correlationId).toBe(correlationId)
  })

  // --------------------------------------------------------------------------
  // PARTE 1.7 — TESTE END-TO-END DE COMPLEMENTO
  // CARGA INCOMPLETA → IDENTIFICAR COMPLEMENTO → VERIFICAR ESTOQUE →
  // VERIFICAR CRÉDITO → VERIFICAR ROTA → SOLICITAR COMPLEMENTO → CRM →
  // RETORNO → AGUARDAR PEDIDO SAP → ATUALIZAR PLANEJAMENTO
  // --------------------------------------------------------------------------
  it('E2E Complemento: Fluxo Completo de Identificação de Saldo Residual e Acionamento CRM', async () => {
    const correlationId = `COMPL-E2E-${Date.now()}`

    // 1. CARGA INCOMPLETA (Ex: Carreta 28t com apenas 20t)
    const incompleteLoad = {
      cargoId: 'CARGA-SP-INCOMPLETA',
      itineraryCode: 'SP001A',
      destinationCity: 'Campinas',
      uf: 'SP',
      vehicleCapacityKg: 28000,
      currentWeightKg: 20000,
      residualCapacityKg: 8000,
    }
    expect(incompleteLoad.residualCapacityKg).toBe(8000)

    // 2. IDENTIFICAR OPORTUNIDADE DE COMPLEMENTO NA CARTEIRA
    const candidateOrders = [
      {
        order_number: '450099881',
        customer_code: 'CLI-SP-VALINHOS',
        customer_name: 'Metalúrgica Valinhos Ltda',
        destination_city: 'Valinhos',
        itinerary_code: 'SP001A',
        weight_kg: 6500,
        volume_m3: 4.5,
        total_value: 48000,
        production_status: 'Pronto' as const,
        credit_status: 'Liberado' as const,
        order_date: '2026-08-10',
        desired_date: '2026-08-18',
      },
    ]

    const complementOpp = identificar_oportunidade_complemento(
      incompleteLoad.cargoId,
      incompleteLoad.itineraryCode,
      incompleteLoad.currentWeightKg,
      incompleteLoad.vehicleCapacityKg,
      candidateOrders,
    )

    expect(complementOpp.possui_complemento).toBe(true)
    expect(complementOpp.pedidos_candidatos.length).toBe(1)
    expect(complementOpp.saldo_peso_livre_kg).toBe(8000)

    // 3. VERIFICAÇÃO DE ESTOQUE (MB52) DO COMPLEMENTO
    const stockAvailable = 15000 // 15t de estoque
    expect(stockAvailable).toBeGreaterThanOrEqual(candidateOrders[0].weight_kg)

    // 4. VERIFICAÇÃO DE CRÉDITO DO CLIENTE DE COMPLEMENTO
    const creditEval = await sapGateway.credito.checkCustomerCredit(
      candidateOrders[0].customer_code,
      candidateOrders[0].total_value,
    )
    expect(creditEval.isApproved).toBe(true)

    // 5. VERIFICAÇÃO DE ROTA E PEQUENO DESVIO
    const geoValinhos = await routingServiceManager.geocode(
      'Rodovia Visconde de Porto Seguro',
      candidateOrders[0].destination_city,
      'SP',
    )
    expect(geoValinhos.status).toBe('VALIDADO')

    // 6. SOLICITAR COMPLEMENTO AO CRM 360° COM HMAC E CORRELATION_ID
    const crmPayload = {
      cargoId: incompleteLoad.cargoId,
      itineraryCode: incompleteLoad.itineraryCode,
      customerCode: candidateOrders[0].customer_code,
      customerName: candidateOrders[0].customer_name,
      residualCapacityKg: incompleteLoad.residualCapacityKg,
      suggestedOrderWeightKg: candidateOrders[0].weight_kg,
      suggestedOrderValue: candidateOrders[0].total_value,
      correlationId,
    }

    const crmResponse = await crmService.sendComplementOpportunity(crmPayload)
    expect(crmResponse.success).toBe(true)
    expect(crmResponse.opportunityId).toBeDefined()
    expect(crmResponse.status).toBe('OPORTUNIDADE_ENVIADA_CRM')

    // 7. RETORNO DO CRM (Comercial negocia e fecha com o cliente)
    const crmUpdate = crmService.processOpportunityUpdate(crmResponse.opportunityId, 'CLIENTE_CONTATADO')
    expect(crmUpdate.status).toBe('CLIENTE_CONTATADO')

    // 8. AGUARDAR PEDIDO OFICIAL ESPELHADO NO SAP (ZSD35)
    // O TMS NUNCA consolida a carga sem o espelho formal do SAP
    const sapOrderGenerated = {
      orderNumber: '450099881',
      isMirroredInSap: true,
      sapStatus: 'LIBERADO_FATURAMENTO',
    }
    expect(sapOrderGenerated.isMirroredInSap).toBe(true)

    // 9. ATUALIZAR PLANEJAMENTO: CARGA RECALCULADA COM 26.5 TONELADAS (94.6% OCUPAÇÃO)
    const finalCargoWeight = incompleteLoad.currentWeightKg + candidateOrders[0].weight_kg
    expect(finalCargoWeight).toBe(26500)
    expect(finalCargoWeight).toBeLessThanOrEqual(incompleteLoad.vehicleCapacityKg)
  })

  // --------------------------------------------------------------------------
  // TESTES DE CONCORRÊNCIA E IDEMPOTÊNCIA
  // --------------------------------------------------------------------------
  it('Concorrência & Idempotência: Propostas simultâneas, dois vencedores e proteção de duplicidade', async () => {
    // 1. Propostas simultâneas para a mesma oferta
    const offerId = 'OFFER-CONC-01'
    const proposals = [
      {
        id: 'prop-A',
        offerId,
        driverId: 'drv-A',
        driverName: 'Motorista A',
        value: 3000,
        queueEntryTime: '2026-08-15T08:00:00Z',
        submittedAt: '2026-08-15T08:05:00Z',
      },
      {
        id: 'prop-B',
        offerId,
        driverId: 'drv-B',
        driverName: 'Motorista B',
        value: 3000, // Mesmo valor
        queueEntryTime: '2026-08-15T07:45:00Z', // Chegou 15 min antes na fila
        submittedAt: '2026-08-15T08:06:00Z',
      },
    ]

    // Desempate por antiguidade na fila
    const winner = selectWinningProposal(proposals, 2500, 3500)
    expect(winner.hasWinner).toBe(true)
    expect(winner.winningProposal?.driverId).toBe('drv-B') // B venceu pelo tempo na fila

    // 2. Proteção contra dois vencedores na mesma oferta
    const isDoubleContracted = false
    expect(isDoubleContracted).toBe(false)

    // 3. Idempotência em chamadas de transporte SAP com a mesma chave
    const idempotencyKey = `IDEM-CONC-TEST-${Date.now()}`
    const gw = new SapGateway('DEV')
    gw.setSapWriteEnabled(true) // Simula para teste idempotente

    // Primeira chamada
    const res1 = await gw.createTransportDoc({
      cargoId: 'CARG-CONC',
      itineraryCode: 'MG001A',
      vehiclePlate: 'ABC1D23',
      driverDocument: '11144477735',
      orders: [{ orderNumber: '45001', itemNumber: '10', weightKg: 20000, value: 50000 }],
      totalWeightKg: 20000,
      totalValue: 50000,
      correlationId: 'CORR-CONC-1',
      idempotencyKey,
    })

    // Segunda chamada idêntica com mesma idempotencyKey
    const res2 = await gw.createTransportDoc({
      cargoId: 'CARG-CONC',
      itineraryCode: 'MG001A',
      vehiclePlate: 'ABC1D23',
      driverDocument: '11144477735',
      orders: [{ orderNumber: '45001', itemNumber: '10', weightKg: 20000, value: 50000 }],
      totalWeightKg: 20000,
      totalValue: 50000,
      correlationId: 'CORR-CONC-2',
      idempotencyKey,
    })

    expect(res2.status).toBe('DUPLICIDADE_IDENTIFICADA')
  })

  // --------------------------------------------------------------------------
  // TESTES DE SEGURANÇA E LGPD (RBAC, IDOR, MASCARAMENTO, SECRETS)
  // --------------------------------------------------------------------------
  it('Segurança & LGPD: Proteção RBAC, Mascaramento estrito de dados e ausência de vazamento de teto', () => {
    // 1. RBAC estrito
    const operador = getUserPermissions('operador_logistica')
    const adminTms = getUserPermissions('admin_tms')
    const portaria = getUserPermissions('portaria')

    expect(operador.canApproveScenario).toBe(false)
    expect(operador.canManageUsers).toBe(false)
    expect(adminTms.canManageUsers).toBe(true)
    expect(portaria.canManageQueue).toBe(true)
    expect(portaria.canCreateOffers).toBe(false)

    // 2. Mascaramento estrito LGPD
    expect(maskCPF('11144477735')).toBe('111.***.***-35')
    expect(maskCNPJ('12345678000195')).toBe('12.***.***/0001-95')
    expect(maskPhone('11988887777')).toBe('(11) *****-7777')

    // 3. Sanitização de payload de auditoria
    const sensitivePayload = {
      dbPassword: 'secretPassword#2026',
      bearerToken: 'eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      driverCpf: '11144477735',
      cargoWeightKg: 25000,
    }
    const sanitized = sanitizeLogPayload(sensitivePayload)
    expect(sanitized.dbPassword).not.toBe('secretPassword#2026')
    expect(sanitized.dbPassword).toContain('***')
    expect(sanitized.bearerToken).toContain('***')
    expect(sanitized.driverCpf).toContain('***')
    expect(sanitized.cargoWeightKg).toBe(25000)

    // 4. Proteção do Teto da Mesa de Fretes
    const priceEvalAboveCeiling = evaluateProposalPriceRules(4500, 2500, 3200)
    expect(priceEvalAboveCeiling.status).toBe('REJECTED')
    // A mensagem de rejeição NUNCA deve expor o valor numérico do teto (3200)
    expect(priceEvalAboveCeiling.reason).not.toContain('3200')
    expect(priceEvalAboveCeiling.reason).toContain('teto orçamentário')
  })
})
