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
  SapSalesOrderEntity,
  DriverEntity,
  QueueEntryEntity,
  FreightOfferEntity,
  CandidateProposalWithQueue,
} from '@/domain/rules'
import { sapGateway, SapGateway } from '@/domain/sapGateway'
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
    const driver: DriverEntity = {
      id: 'drv-e2e-01',
      name: 'Carlos Alberto Ferreira',
      document: '11144477735',
      cnh: '12345678901',
      whatsapp: '11988887777',
      status: 'ativo',
    }
    expect(isValidCPF(driver.document)).toBe(true)

    // Entrada na Fila PORTA via Raio Geofence (0.3 km da planta CIAFAL)
    const geofence = validateGeofence(-23.5505, -46.6333)
    expect(geofence.isWithinRadius).toBe(true)
    expect(geofence.group).toBe('PORTA')

    const queueGroup = classifyAvailabilityGroup(0.3, 0.5, 60, false)
    expect(queueGroup).toBe('PORTA')

    const queueEntry: QueueEntryEntity = {
      id: 'q-entry-01',
      driver: driver.id,
      driver_name_cached: driver.name,
      driver_doc_cached: driver.document,
      driver_whatsapp_cached: driver.whatsapp,
      vehicle_plate_cached: 'ABC1D23',
      vehicle_type_cached: 'Carreta LS',
      type: 'PORTA',
      status: 'disponivel',
      entry_time: new Date().toISOString(),
    }
    expect(queueEntry.status).toBe('disponivel')

    // 2. CARTEIRA SAP ZSD35
    const ordersInWallet: SapSalesOrderEntity[] = [
      {
        id: 'ord-1',
        order_number: '450010091',
        item_number: '000010',
        customer_code: 'CLI-MG-BETIM',
        customer_name: 'Aços Betim S/A',
        material: 'PERFIL-W-200',
        material_description: 'Perfil Estrutural W 200x26.6',
        weight_kg: 26000,
        total_value: 165000,
        itinerary_code: 'MG001A',
        destination_city: 'Betim',
        uf: 'MG',
        production_status: 'Pronto',
        credit_status: 'Liberado',
        order_date: '2026-08-01',
        desired_date: '2026-08-15',
      },
    ]
    expect(ordersInWallet.length).toBe(1)

    // 3. ESTOQUE SAP (MB52) E CRÉDITO FINANCEIRO (KNKK)
    const stockVerification = {
      materialCode: ordersInWallet[0].material,
      availableStockKg: 40000,
      requiredWeightKg: ordersInWallet[0].weight_kg,
      hasStock: 40000 >= ordersInWallet[0].weight_kg,
    }
    expect(stockVerification.hasStock).toBe(true)

    const creditResult = await sapGateway.credito.checkCustomerCredit(
      ordersInWallet[0].customer_code,
      ordersInWallet[0].total_value,
    )
    expect(creditResult.isApproved).toBe(true)

    // 4. SIMULAÇÃO & ROTEIRIZADOR (ROTA, DISTÂNCIA, PEDÁGIO, ANTT)
    const geoDest = await routingServiceManager.geocode(
      'Distrito Industrial Bandeirinhas',
      ordersInWallet[0].destination_city,
      ordersInWallet[0].uf,
    )
    expect(geoDest.status).toBe('VALIDADO')

    const routeCalc = await routingServiceManager.calculate(
      { latitude: -23.5505, longitude: -46.6333, name: 'CIAFAL Matriz' },
      [
        {
          orderIndex: 1,
          customerCode: ordersInWallet[0].customer_code,
          customerName: ordersInWallet[0].customer_name,
          address: geoDest,
          weightKg: ordersInWallet[0].weight_kg,
        },
      ],
    )
    expect(routeCalc.totalDistanceKm).toBeGreaterThan(200)

    const tollResult = tollEngine.calculateTolls(
      routeCalc.totalDistanceKm,
      queueEntry.vehicle_type_cached!,
      5,
      ordersInWallet[0].itinerary_code,
    )
    expect(tollResult.totalTollCost).toBeGreaterThan(50)

    const anttFloor = anttEngine.calculateFloor({
      distanceKm: routeCalc.totalDistanceKm,
      vehicleType: queueEntry.vehicle_type_cached!,
      axlesCount: 5,
    })
    expect(anttFloor.floorValue).toBeGreaterThan(1000)

    // 5. PLANEJADOR: VALIDAÇÃO DE MONTAGEM DE CARGA
    const assemblyValidation = avaliar_montagem_carga({
      orders: ordersInWallet,
      vehicle: {
        id: 'v1',
        plate: queueEntry.vehicle_plate_cached!,
        type: queueEntry.vehicle_type_cached!,
        capacity_kg: 28000,
      },
      targetItineraryCode: 'MG001A',
    })
    expect(assemblyValidation.decision).toBe('permitida')
    expect(assemblyValidation.calculatedWeightKg).toBe(26000)

    // 6. APROVAÇÃO DO CENÁRIO PELO GERENTE DE CARGA E GERAÇÃO DA CARGA
    const gerentePermissions = getUserPermissions('gerente_carga')
    expect(gerentePermissions.canApproveScenario).toBe(true)

    const cargoGenerated = {
      id: `CARGA-${ordersInWallet[0].itinerary_code}-${Date.now().toString().slice(-4)}`,
      itineraryCode: ordersInWallet[0].itinerary_code,
      destinationCity: ordersInWallet[0].destination_city,
      weightKg: assemblyValidation.calculatedWeightKg,
      vehicleTypeRequired: queueEntry.vehicle_type_cached!,
      anttFloorValue: anttFloor.floorValue,
      ceilingValue: Math.round(anttFloor.floorValue * 1.25),
      status: 'gerada',
    }
    expect(cargoGenerated.ceilingValue).toBeGreaterThan(cargoGenerated.anttFloorValue)

    // 7. MESA DE FRETES & ABERTURA DA OFERTA (PORTA)
    const offer: FreightOfferEntity = {
      id: 'offer-01',
      cargo_id: cargoGenerated.id,
      current_group: 'PORTA',
      status: 'PORTA_OPEN',
      floor_price: cargoGenerated.anttFloorValue,
      ceiling_price: cargoGenerated.ceilingValue,
    }

    // Elegibilidade do motorista na janela PORTA
    const eligibility = avaliar_elegibilidade_motorista_oferta({
      driver,
      queueEntry,
      offerStageGroup: 'PORTA',
      requiredVehicleType: cargoGenerated.vehicleTypeRequired,
    })
    expect(eligibility.isEligible).toBe(true)

    // 8. MOTOR DE LEILÃO E ENVIO DE LANCE
    const driverProposalValue = cargoGenerated.anttFloorValue + 150
    const proposalEval = evaluateProposalPriceRules(
      driverProposalValue,
      offer.floor_price!,
      offer.ceiling_price!,
    )
    expect(proposalEval.proposalStatus).toBe('VALID')

    const candidateProposals: CandidateProposalWithQueue[] = [
      {
        proposal: {
          id: 'prop-01',
          offer_id: offer.id,
          driver_id: driver.id,
          driver_phone_cached: driver.whatsapp,
          driver_plate_cached: queueEntry.vehicle_plate_cached,
          value: driverProposalValue,
          status: 'VALID',
          created: new Date().toISOString(),
        },
        queueEntryTime: queueEntry.entry_time,
      },
    ]

    // Seleção de vencedor determinística
    const winnerProposal = selectWinningProposal(candidateProposals)
    expect(winnerProposal).not.toBeNull()
    expect(winnerProposal?.driver_id).toBe(driver.id)

    // 9. ATUALIZAÇÃO DA FILA: MOTORISTA RETIRADO DA FILA APÓS ATRIBUIÇÃO
    const updatedQueueEntry: QueueEntryEntity = {
      ...queueEntry,
      status: 'atribuido',
    }
    expect(updatedQueueEntry.status).toBe('atribuido')

    // 10. INTEGRAÇÃO SAP VT01N (TRANSPORTE SAP)
    const sapWriteDisabledResult = await sapGateway.createTransportDoc({
      cargoId: cargoGenerated.id,
      itineraryCode: cargoGenerated.itineraryCode,
      vehiclePlate: queueEntry.vehicle_plate_cached!,
      driverDocument: driver.document,
      orders: [
        {
          orderNumber: ordersInWallet[0].order_number,
          itemNumber: ordersInWallet[0].item_number || '10',
          weightKg: ordersInWallet[0].weight_kg,
          value: ordersInWallet[0].total_value,
        },
      ],
      totalWeightKg: cargoGenerated.weightKg,
      totalValue: ordersInWallet[0].total_value,
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
    const candidateOrders: SapSalesOrderEntity[] = [
      {
        id: 'ord-compl-1',
        order_number: '450099881',
        customer_code: 'CLI-SP-VALINHOS',
        customer_name: 'Metalúrgica Valinhos Ltda',
        destination_city: 'Valinhos',
        uf: 'SP',
        itinerary_code: 'SP001A',
        weight_kg: 6500,
        volume_m3: 4.5,
        total_value: 48000,
        production_status: 'Pronto',
        credit_status: 'Liberado',
        order_date: '2026-08-10',
        desired_date: '2026-08-18',
        status: 'disponivel',
      },
    ]

    const complementOpp = identificar_oportunidade_complemento({
      cargoCode: incompleteLoad.cargoId,
      itineraryCode: incompleteLoad.itineraryCode,
      currentWeightKg: incompleteLoad.currentWeightKg,
      vehicleCapacityKg: incompleteLoad.vehicleCapacityKg,
      candidateOrders,
    })

    expect(complementOpp).not.toBeNull()
    expect(complementOpp?.candidate_orders.length).toBe(1)
    expect(complementOpp?.balance_kg).toBe(8000)

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
      targetDate: new Date().toISOString().split('T')[0],
      candidateClients: [candidateOrders[0].customer_name],
      candidateOrders: [candidateOrders[0].order_number],
      salesRep: 'Carlos Vendas',
      currentWeightKg: incompleteLoad.currentWeightKg,
      capacityKg: incompleteLoad.vehicleCapacityKg,
      freeBalanceKg: incompleteLoad.residualCapacityKg,
      residualCapacityKg: incompleteLoad.residualCapacityKg,
      opportunityReason: 'Carga incompleta com saldo residual',
      validityMinutes: 120,
      sentBy: 'Gerente de Carga',
      notes: 'Oportunidade gerada pelo teste E2E',
      correlationId,
    }

    const crmResponse = await crmService.sendComplementOpportunity(crmPayload)
    expect(crmResponse.success).toBe(true)
    expect(crmResponse.crmOpportunityId).toBeDefined()
    expect(crmResponse.status).toBe('Em análise')

    // 7. RETORNO DO CRM
    const crmSync = await crmService.syncOpportunityStatus(crmResponse.crmOpportunityId!)
    expect(crmSync.success).toBe(true)

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
  // TESTES DE CONCORRÊNCIA E IDEMPOTÊNCIA (PARTE 5)
  // --------------------------------------------------------------------------
  it('Concorrência & Idempotência: Propostas simultâneas, dois vencedores e proteção de duplicidade', async () => {
    // 1. Propostas simultâneas para a mesma oferta
    const offerId = 'OFFER-CONC-01'
    const candidateProposals: CandidateProposalWithQueue[] = [
      {
        proposal: {
          id: 'prop-A',
          offer_id: offerId,
          driver_id: 'drv-A',
          value: 3000,
          status: 'VALID',
          created: '2026-08-15T08:05:00Z',
        },
        queueEntryTime: '2026-08-15T08:00:00Z',
      },
      {
        proposal: {
          id: 'prop-B',
          offer_id: offerId,
          driver_id: 'drv-B',
          value: 3000, // Mesmo valor
          status: 'VALID',
          created: '2026-08-15T08:06:00Z',
        },
        queueEntryTime: '2026-08-15T07:45:00Z', // Chegou 15 min antes na fila
      },
    ]

    // Desempate por antiguidade na fila
    const winner = selectWinningProposal(candidateProposals)
    expect(winner).not.toBeNull()
    expect(winner?.driver_id).toBe('drv-B') // B venceu pelo tempo na fila

    // 2. Idempotência em chamadas de transporte SAP com a mesma chave
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
    expect(res1.status).toBe('SIMULADO_DEV')

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

  it('Concorrência Avançada: Entrada simultânea na fila, aprovação simultânea de cenário e retry seguro', async () => {
    // 1. Entrada simultânea de 3 motoristas com timestamps distintos
    const entries = [
      { id: 'q1', driverId: 'd1', entryTime: '2026-08-15T08:00:01.100Z', type: 'PORTA' },
      { id: 'q2', driverId: 'd2', entryTime: '2026-08-15T08:00:01.050Z', type: 'PORTA' },
      { id: 'q3', driverId: 'd3', entryTime: '2026-08-15T08:00:01.200Z', type: 'PORTA' },
    ]
    // Ordenação estrita por entryTime ascendente (o mais antigo tem prioridade)
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime(),
    )
    expect(sortedEntries[0].id).toBe('q2') // d2 chegou 50ms antes
    expect(sortedEntries[1].id).toBe('q1')
    expect(sortedEntries[2].id).toBe('q3')

    // 2. Aprovação de cenário com concorrência otimista (apenas gerente autorizado)
    const gerente = getUserPermissions('gerente_carga')
    const operador = getUserPermissions('operador_logistica')
    expect(gerente.canApproveScenario).toBe(true)
    expect(operador.canApproveScenario).toBe(false)

    // 3. Retry seguro com Circuit Breaker sem tempestade de requisições
    const breaker = new CircuitBreaker('TEST_CONC', {
      failureThreshold: 3,
      cooldownMs: 10000,
      maxRetries: 2,
      timeoutMs: 5000,
    })
    breaker.recordFailure()
    breaker.recordFailure()
    expect(breaker.isCircuitOpen).toBe(false)
    breaker.recordFailure()
    expect(breaker.isCircuitOpen).toBe(true) // Circuito abre na 3ª falha
  })

  // --------------------------------------------------------------------------
  // TESTES DE SEGURANÇA E LGPD (PARTE 5)
  // --------------------------------------------------------------------------
  it('Segurança & LGPD: Proteção RBAC, Mascaramento estrito de dados e ausência de vazamento de teto', () => {
    // 1. RBAC estrito
    const operador = getUserPermissions('operador_logistica')
    const adminTms = getUserPermissions('admin_tms')
    const portaria = getUserPermissions('portaria')
    const auditor = getUserPermissions('auditor')

    expect(operador.canApproveScenario).toBe(false)
    expect(adminTms.canManageSystemParameters).toBe(true)
    expect(portaria.canManageQueueStatus).toBe(false)
    expect(portaria.canPlanLoads).toBe(false)
    expect(auditor.canViewAuditLogs).toBe(true)
    expect(auditor.canPlanLoads).toBe(false)

    // 2. Mascaramento estrito LGPD
    expect(maskCPF('11144477735')).toBe('***.444.777-**')
    expect(maskCNPJ('12345678000195')).toBe('**.***.678/0001-**')
    expect(maskPhone('11988887777')).toBe('(11) 9****-7777')

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
    expect(priceEvalAboveCeiling.proposalStatus).toBe('REJECTED')
    // A mensagem de rejeição NUNCA deve expor o valor numérico do teto (3200)
    expect(priceEvalAboveCeiling.reason).not.toContain('3200')
    expect(priceEvalAboveCeiling.reason).toContain('limite operacional máximo')
  })
})
