import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateDesiredDate,
  validateDp34Stock,
  classifyCredit,
  classifyOccupancyBand,
  runCiafalOptimizer,
  DEFAULT_OPTIMIZATION_WEIGHTS,
  DEFAULT_OCCUPANCY_BANDS,
} from '../domain/optimizerEngine'
import {
  checkLoadingReleaseReadiness,
  PrinterDeviceEntity,
  PrintJobEntity,
} from '../domain/printingAndTransportEngine'
import {
  ROLE_PERMISSIONS,
  getUserPermissions,
  SapSalesOrderEntity,
  SapStockCurrentEntity,
  PcpProductionOrderEntity,
  QueueEntryEntity,
} from '../domain/rules'
import { sapGateway, SapGateway } from '../domain/sapGateway'
import { tmsService, TmsService } from '../services/tmsService'

describe('SPRINT 5 — SUÍTE DE TESTES DE OTIMIZADOR, SAP E IMPRESSÃO', () => {
  // ==========================================
  // 1. DATA DESEJADA (REGRA ABSOLUTA)
  // ==========================================
  describe('1. Data Desejada & Bloqueio de Antecipação', () => {
    it('1.1 Expedição na data desejada exata: deve aprovar como válida', () => {
      const res = validateDesiredDate('2025-05-10', '2025-05-10')
      expect(res.isValid).toBe(true)
      expect(res.isAnticipated).toBe(false)
      expect(res.isOverdue).toBe(false)
    })

    it('1.2 Expedição posterior à data desejada: deve aprovar sem bloqueio de antecipação', () => {
      const res = validateDesiredDate('2025-05-10', '2025-05-12')
      expect(res.isValid).toBe(true)
      expect(res.isAnticipated).toBe(false)
    })

    it('1.3 Tentativa de antecipação: deve BLOQUEAR com motivo DATA_ANTECIPADA_NAO_PERMITIDA', () => {
      const res = validateDesiredDate('2025-05-15', '2025-05-10')
      expect(res.isValid).toBe(false)
      expect(res.isAnticipated).toBe(true)
      expect(res.rejectionReason).toContain('DATA_ANTECIPADA_NAO_PERMITIDA')
      expect(res.rejectionReason).toContain('2025-05-15')
    })

    it('1.4 Pedido atrasado: deve identificar atraso e calcular dias de atraso', () => {
      const pastDate = '2020-01-01'
      const todayStr = new Date().toISOString().split('T')[0]
      const res = validateDesiredDate(pastDate, todayStr)
      expect(res.isValid).toBe(true)
      expect(res.isOverdue).toBe(true)
      expect(res.overdueDays).toBeGreaterThan(1000)
    })

    it('1.5 Pedido futuro em simulação: não bloqueia simulações cuja data planejada seja no futuro >= desejada', () => {
      const futureDesired = '2026-11-20'
      const futurePlanned = '2026-11-25'
      const res = validateDesiredDate(futureDesired, futurePlanned)
      expect(res.isValid).toBe(true)
      expect(res.isAnticipated).toBe(false)
    })

    it('1.6 Pedido sem data desejada informada: assume comportamento seguro e válido', () => {
      const res = validateDesiredDate(undefined, '2026-05-10')
      expect(res.isValid).toBe(true)
      expect(res.isAnticipated).toBe(false)
      expect(res.overdueDays).toBe(0)
    })
  })

  // ==========================================
  // 2. ESTOQUE OFICIAL DP34
  // ==========================================
  describe('2. Estoque DP34 & Depósitos Separados', () => {
    const mockStocks: SapStockCurrentEntity[] = [
      {
        id: 'stk-1',
        material_code: 'BARRA CHATA 1/2X1/8',
        material_description: 'Barra Chata Laminada',
        plant: '1000',
        storage_location: 'DP34',
        quantity: 25,
        unit: 'TON',
        available_qty: 25,
        weight_kg: 25000,
      },
      {
        id: 'stk-2',
        material_code: 'BARRA CHATA 1/2X1/8',
        material_description: 'Barra Chata Laminada',
        plant: '1000',
        storage_location: 'DP01',
        quantity: 10,
        unit: 'TON',
        available_qty: 10,
        weight_kg: 10000,
      },
      {
        id: 'stk-3',
        material_code: 'CANTONEIRA 2X3/16',
        material_description: 'Cantoneira Estrutural',
        plant: '1000',
        storage_location: 'DP01', // Apenas em outro depósito
        quantity: 30,
        unit: 'TON',
        available_qty: 30,
        weight_kg: 30000,
      },
    ]

    it('2.1 Estoque suficiente no DP34: deve marcar como 100% disponível', () => {
      const res = validateDp34Stock('BARRA CHATA 1/2X1/8', 20000, mockStocks)
      expect(res.isDp34Available).toBe(true)
      expect(res.dp34AvailableKg).toBe(25000)
      expect(res.statusMessage).toContain('ESTOQUE DP34 100% DISPONÍVEL')
    })

    it('2.2 Estoque insuficiente no DP34: deve acusar saldo insuficiente', () => {
      const res = validateDp34Stock('BARRA CHATA 1/2X1/8', 28000, mockStocks)
      expect(res.isDp34Available).toBe(false)
      expect(res.dp34AvailableKg).toBe(25000)
      expect(res.statusMessage).toContain('ESTOQUE DP34 INSUFICIENTE')
    })

    it('2.3 Estoque em outro depósito (DP01): NÃO deve somar automaticamente com DP34', () => {
      // Necessidade: 28t. DP34 tem 25t e DP01 tem 10t. Soma daria 35t, mas DP34 isolado tem 25t.
      const res = validateDp34Stock('BARRA CHATA 1/2X1/8', 28000, mockStocks)
      expect(res.isDp34Available).toBe(false)
      expect(res.dp34AvailableKg).toBe(25000)
      expect(res.otherDepositsKg).toBe(10000)
      expect(res.otherDepositsBreakdown.length).toBe(1)
      expect(res.otherDepositsBreakdown[0].storageLocation).toBe('DP01')
    })

    it('2.4 PCP futuro não conta como DP34 disponível: saldo fica como previsão futura', () => {
      const pcpOrders: PcpProductionOrderEntity[] = [
        {
          id: 'pcp-1',
          production_order_number: 'OF-2026-99',
          material_code: 'CANTONEIRA 2X3/16',
          material_description: 'Cantoneira',
          line: 'L1',
          quantity_planned: 15,
          unit: 'TON',
          weight_kg_planned: 15000,
          scheduled_date: '2026-09-01',
          status: 'Programada',
        },
      ]
      const res = validateDp34Stock('CANTONEIRA 2X3/16', 15000, mockStocks, pcpOrders)
      expect(res.isDp34Available).toBe(false)
      expect(res.dp34AvailableKg).toBe(0)
      expect(res.pcpFutureKg).toBe(15000)
      expect(res.statusMessage).toContain('PCP Previsto')
    })

    it('2.5 Divergência / Saldo Limítrofe: exige confirmação de estoque quando saldo é insuficiente ou limítrofe', () => {
      const resNear = validateDp34Stock('BARRA CHATA 1/2X1/8', 24500, mockStocks)
      expect(resNear.needsStockConfirmation).toBe(true)

      const resZero = validateDp34Stock('PERFIL-W-INEXISTENTE', 10000, mockStocks)
      expect(resZero.needsStockConfirmation).toBe(true)
      expect(resZero.isDp34Available).toBe(false)
    })
  })

  // ==========================================
  // 3. CRÉDITO & MULTI-CLIENTE
  // ==========================================
  describe('3. Crédito por Valor Monetário & Multi-Cliente', () => {
    it('3.1 Pedido com crédito liberado', () => {
      const res = classifyCredit({ credit_status: 'Liberado' } as any)
      expect(res.classification).toBe('LIBERADO')
      expect(res.reason).toContain('aprovado e liberado')
    })

    it('3.2 Pedido com crédito bloqueado', () => {
      const res = classifyCredit({ credit_status: 'Bloqueado' } as any)
      expect(res.classification).toBe('BLOQUEADO')
      expect(res.reason).toContain('BLOQUEADO')
    })

    it('3.3 Pedido com crédito em análise: classificação LIBERADO_COM_APROVACAO', () => {
      const res = classifyCredit({ credit_status: 'Em Análise' } as any)
      expect(res.classification).toBe('LIBERADO_COM_APROVACAO')
      expect(res.reason).toContain('aprovação de alçada')
    })

    it('3.4 Crédito desatualizado ou não informado: classificado com segurança', () => {
      const res = classifyCredit({ credit_status: undefined } as any)
      expect(res.classification).toBe('DADO_DESATUALIZADO')
    })

    it('3.5 Carga multi-cliente: pedido bloqueado NÃO contamina outros pedidos e sugere remoção', () => {
      const orderOk1: SapSalesOrderEntity = {
        id: 'ord-c1',
        order_number: 'PED-101',
        customer_code: 'CLI-01',
        customer_name: 'Cliente A',
        destination_city: 'São Paulo',
        uf: 'SP',
        itinerary_code: 'SP001A',
        weight_kg: 10000,
        total_value: 60000,
        credit_status: 'Liberado',
        production_status: 'Pronto',
        desired_date: new Date().toISOString().split('T')[0],
      }
      const orderBlocked: SapSalesOrderEntity = {
        id: 'ord-c2',
        order_number: 'PED-102',
        customer_code: 'CLI-02',
        customer_name: 'Cliente B (Bloqueado)',
        destination_city: 'São Paulo',
        uf: 'SP',
        itinerary_code: 'SP001A',
        weight_kg: 8000,
        total_value: 45000,
        credit_status: 'Bloqueado',
        production_status: 'Pronto',
        desired_date: new Date().toISOString().split('T')[0],
      }

      const res = runCiafalOptimizer({
        itineraryCode: 'SP001A',
        plannedDate: new Date().toISOString().split('T')[0],
        orders: [orderOk1, orderBlocked],
        stocks: [
          {
            id: 's1',
            material_code: 'GEN',
            material_description: '',
            plant: '1000',
            storage_location: 'DP34',
            quantity: 50,
            unit: 'TON',
            available_qty: 50,
            weight_kg: 50000,
          },
        ],
        pcpOrders: [],
        queueEntries: [],
        vehicleCapacityKg: 28000,
        vehicleType: 'Carreta LS',
      })

      // O cenário que contém o pedido bloqueado deve indicar a sugestão de remover o pedido
      const scenarioWithBlocked = res.scenarios.find((s) => s.blockedOrders.length > 0)
      expect(scenarioWithBlocked).toBeDefined()
      expect(scenarioWithBlocked?.suggestedAction).toContain('Remover pedido bloqueado')
      expect(scenarioWithBlocked?.blockedCreditValue).toBe(45000)
    })
  })

  // ==========================================
  // 4. MOTOR DETERMINÍSTICO DE OTIMIZAÇÃO
  // ==========================================
  describe('4. Motor Determinístico de Otimização Multicritério', () => {
    const orders: SapSalesOrderEntity[] = [
      {
        id: 'ord-1',
        order_number: 'PED-1',
        customer_code: 'CLI-1',
        customer_name: 'Cliente 1',
        destination_city: 'Campinas',
        uf: 'SP',
        itinerary_code: 'ITIN-SP',
        material: 'BARRA CHATA',
        weight_kg: 14000,
        total_value: 80000,
        desired_date: new Date().toISOString().split('T')[0],
        credit_status: 'Liberado',
        production_status: 'Pronto',
      },
      {
        id: 'ord-2',
        order_number: 'PED-2',
        customer_code: 'CLI-2',
        customer_name: 'Cliente 2',
        destination_city: 'Campinas',
        uf: 'SP',
        itinerary_code: 'ITIN-SP',
        material: 'BARRA CHATA',
        weight_kg: 13200,
        total_value: 75000,
        desired_date: new Date().toISOString().split('T')[0],
        credit_status: 'Liberado',
        production_status: 'Pronto',
      },
      {
        id: 'ord-3',
        order_number: 'PED-3',
        customer_code: 'CLI-3',
        customer_name: 'Cliente 3',
        destination_city: 'Campinas',
        uf: 'SP',
        itinerary_code: 'ITIN-SP',
        material: 'BARRA CHATA',
        weight_kg: 10000,
        total_value: 60000,
        desired_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], // Futuro (+5 dias)
        credit_status: 'Liberado',
        production_status: 'Pronto',
      },
    ]

    const stocks: SapStockCurrentEntity[] = [
      {
        id: 's-1',
        material_code: 'BARRA CHATA',
        material_description: '',
        plant: '1000',
        storage_location: 'DP34',
        quantity: 40,
        unit: 'TON',
        available_qty: 40,
        weight_kg: 40000,
      },
    ]

    const queue: QueueEntryEntity[] = [
      {
        id: 'q-1',
        driver: 'drv-1',
        type: 'PORTA',
        status: 'disponivel',
        entry_time: new Date().toISOString(),
        driver_name_cached: 'Carlos Motorista PORTA',
        vehicle_capacity_kg_cached: 28000,
      },
    ]

    it('4.1 Ocupação máxima: calcula taxa de ocupação precisa e classifica faixa', () => {
      const res = runCiafalOptimizer({
        itineraryCode: 'ITIN-SP',
        plannedDate: new Date().toISOString().split('T')[0],
        orders,
        stocks,
        pcpOrders: [],
        queueEntries: queue,
        vehicleCapacityKg: 28000,
        vehicleType: 'Carreta LS',
      })

      const maxOcc = res.scenarios.find((s) => s.scenarioType === 'max_occupancy')
      expect(maxOcc).toBeDefined()
      // 14000 + 13200 = 27200 kg / 28000 kg = 97.1%
      expect(maxOcc?.occupancyPct).toBe(97.1)
      expect(maxOcc?.occupancyBand).toBe('EXCELENTE')
    })

    it('4.2 Baixa ocupação: emite alerta quando ocupação está abaixo de 80%', () => {
      const lowOrder: SapSalesOrderEntity = {
        id: 'ord-low',
        order_number: 'PED-LOW',
        customer_code: 'CLI-LOW',
        customer_name: 'Cliente Baixo',
        destination_city: 'Campinas',
        uf: 'SP',
        itinerary_code: 'ITIN-LOW',
        material: 'BARRA CHATA',
        weight_kg: 15000, // 15t em carreta de 28t = 53.6%
        total_value: 50000,
        desired_date: new Date().toISOString().split('T')[0],
        credit_status: 'Liberado',
        production_status: 'Pronto',
      }

      const res = runCiafalOptimizer({
        itineraryCode: 'ITIN-LOW',
        plannedDate: new Date().toISOString().split('T')[0],
        orders: [lowOrder],
        stocks,
        pcpOrders: [],
        queueEntries: [],
        vehicleCapacityKg: 28000,
        vehicleType: 'Carreta LS',
      })

      const scen = res.scenarios[0]
      expect(scen.occupancyPct).toBeLessThan(80)
      expect(scen.occupancyBand).toBe('BAIXA')
      expect(scen.occupancyAlert).toContain('ALERTA DE BAIXA OCUPAÇÃO')
      expect(scen.suggestedAction).toContain('complemento')
    })

    it('4.3 Priorização de motorista PORTA: confere bônus de score e presença', () => {
      const resWithPorta = runCiafalOptimizer({
        itineraryCode: 'ITIN-SP',
        plannedDate: new Date().toISOString().split('T')[0],
        orders,
        stocks,
        pcpOrders: [],
        queueEntries: queue, // com motorista PORTA
        vehicleCapacityKg: 28000,
        vehicleType: 'Carreta LS',
      })

      const resWithoutPorta = runCiafalOptimizer({
        itineraryCode: 'ITIN-SP',
        plannedDate: new Date().toISOString().split('T')[0],
        orders,
        stocks,
        pcpOrders: [],
        queueEntries: [], // sem motorista PORTA
        vehicleCapacityKg: 28000,
        vehicleType: 'Carreta LS',
      })

      expect(resWithPorta.scenarios[0].scoreBreakdown.portaDriverScore).toBeGreaterThan(0)
      expect(resWithoutPorta.scenarios[0].scoreBreakdown.portaDriverScore).toBe(0)
      expect(resWithPorta.scenarios[0].hasPortaDriver).toBe(true)
      expect(resWithoutPorta.scenarios[0].hasPortaDriver).toBe(false)
    })

    it('4.4 Motorista FORA: não concede bônus exclusivo da PORTA', () => {
      const queueFora: QueueEntryEntity[] = [
        {
          id: 'q-fora',
          driver: 'drv-fora',
          type: 'FORA',
          status: 'disponivel',
          entry_time: new Date().toISOString(),
          driver_name_cached: 'Motorista Fora',
          vehicle_capacity_kg_cached: 28000,
        },
      ]

      const res = runCiafalOptimizer({
        itineraryCode: 'ITIN-SP',
        plannedDate: new Date().toISOString().split('T')[0],
        orders,
        stocks,
        pcpOrders: [],
        queueEntries: queueFora,
        vehicleCapacityKg: 28000,
        vehicleType: 'Carreta LS',
      })

      expect(res.scenarios[0].scoreBreakdown.portaDriverScore).toBe(0)
      expect(res.scenarios[0].hasPortaDriver).toBe(false)
    })

    it('4.5 Pedido futuro não antecipado: não entra em carga para a data de hoje', () => {
      const res = runCiafalOptimizer({
        itineraryCode: 'ITIN-SP',
        plannedDate: new Date().toISOString().split('T')[0],
        orders,
        stocks,
        pcpOrders: [],
        queueEntries: queue,
        vehicleCapacityKg: 28000,
        vehicleType: 'Carreta LS',
      })

      expect(res.summary.blockedFutureDateCount).toBe(1)
      res.scenarios.forEach((scen) => {
        expect(scen.orders.some((o) => o.id === 'ord-3')).toBe(false)
      })
    })

    it('4.6 Score reproduzível e explicável: composição visível e determinística', () => {
      const res1 = runCiafalOptimizer({
        itineraryCode: 'ITIN-SP',
        plannedDate: new Date().toISOString().split('T')[0],
        orders,
        stocks,
        pcpOrders: [],
        queueEntries: queue,
        vehicleCapacityKg: 28000,
        vehicleType: 'Carreta LS',
      })

      const res2 = runCiafalOptimizer({
        itineraryCode: 'ITIN-SP',
        plannedDate: new Date().toISOString().split('T')[0],
        orders,
        stocks,
        pcpOrders: [],
        queueEntries: queue,
        vehicleCapacityKg: 28000,
        vehicleType: 'Carreta LS',
      })

      expect(res1.scenarios[0].scoreBreakdown.totalScore).toBe(
        res2.scenarios[0].scoreBreakdown.totalScore,
      )
      expect(res1.scenarios[0].scoreBreakdown.explanation).toContain('Score')
    })
  })

  // ==========================================
  // 5. ORDEM DE TRANSPORTE SAP (MOCK EXPLÍCITO)
  // ==========================================
  describe('5. Ordem de Transporte SAP Gateway & Idempotência', () => {
    let gw: SapGateway

    beforeEach(() => {
      gw = new SapGateway('DEV')
    })

    it('5.1 Solicitação criada com SAP_WRITE_ENABLED = false: status TRANSPORTE_SAP_PENDENTE', async () => {
      const res = await gw.createTransportDoc({
        cargoId: 'CARG-SAP-01',
        itineraryCode: 'SP001A',
        vehiclePlate: 'ABC1D23',
        driverDocument: '11144477735',
        orders: [{ orderNumber: 'PED-1', itemNumber: '10', weightKg: 15000, value: 50000 }],
        totalWeightKg: 15000,
        totalValue: 50000,
        correlationId: 'CORR-01',
        idempotencyKey: 'IDEM-01',
      })

      expect(res.status).toBe('TRANSPORTE_SAP_PENDENTE')
      expect(res.correlationId).toBe('CORR-01')
      expect(res.sapTransportNumber).toBeUndefined()
    })

    it('5.2 SAP retorna número com gravação habilitada em DEV: status SIMULADO_DEV', async () => {
      gw.setSapWriteEnabled(true)
      const res = await gw.createTransportDoc({
        cargoId: 'CARG-SAP-02',
        itineraryCode: 'SP001A',
        vehiclePlate: 'ABC1D23',
        driverDocument: '11144477735',
        orders: [{ orderNumber: 'PED-1', itemNumber: '10', weightKg: 15000, value: 50000 }],
        totalWeightKg: 15000,
        totalValue: 50000,
        correlationId: 'CORR-02',
        idempotencyKey: 'IDEM-02',
      })

      expect(res.status).toBe('SIMULADO_DEV')
      expect(res.sapTransportNumber).toBeDefined()
      expect(res.sapTransportNumber).toContain('00009')
    })

    it('5.3 Idempotência: chamada repetida com mesma idempotencyKey detecta duplicidade', async () => {
      gw.setSapWriteEnabled(true)
      const req = {
        cargoId: 'CARG-SAP-03',
        itineraryCode: 'SP001A',
        vehiclePlate: 'ABC1D23',
        driverDocument: '11144477735',
        orders: [{ orderNumber: 'PED-1', itemNumber: '10', weightKg: 15000, value: 50000 }],
        totalWeightKg: 15000,
        totalValue: 50000,
        correlationId: 'CORR-03',
        idempotencyKey: 'IDEM-03-UNIQUE',
      }

      const res1 = await gw.createTransportDoc(req)
      expect(res1.status).toBe('SIMULADO_DEV')

      const res2 = await gw.createTransportDoc(req)
      expect(res2.status).toBe('DUPLICIDADE_IDENTIFICADA')
      expect(res2.correlationId).toBe(req.correlationId)
    })

    it('5.4 Ambiente PRD protegido: bloqueia chamadas não autorizadas de escrita', async () => {
      const gwPrd = new SapGateway('PRODUCAO')
      const res = await gwPrd.createTransportDoc({
        cargoId: 'CARG-PRD-01',
        itineraryCode: 'SP001A',
        vehiclePlate: 'ABC1D23',
        driverDocument: '11144477735',
        orders: [],
        totalWeightKg: 10000,
        totalValue: 50000,
        correlationId: 'CORR-PRD',
        idempotencyKey: 'IDEM-PRD',
      })

      expect(res.status).toBe('TRANSPORTE_SAP_PENDENTE')
      expect(res.errorMessage).toContain('Bloqueio de Segurança')
    })
  })

  // ==========================================
  // 6. MOTOR DE IMPRESSÃO & SEGURANÇA
  // ==========================================
  describe('6. Motor de Impressão, Fila e Permissões RBAC', () => {
    it('6.1 Impressão antes da confirmação SAP deve FALHAR e ser BLOQUEADA', async () => {
      await expect(
        tmsService.printTransportOrder({
          cargoId: 'c-test-no-sap',
          sapTransportNumber: '', // Ausente
          operatorEmail: 'operador@ciafal.com.br',
        }),
      ).rejects.toThrow('REGRA_SEGURANCA')

      await expect(
        tmsService.printTransportOrder({
          cargoId: 'c-test-pendente',
          sapTransportNumber: 'PENDENTE',
          operatorEmail: 'operador@ciafal.com.br',
        }),
      ).rejects.toThrow('REGRA_SEGURANCA')
    })

    it('6.2 Reimpressão: exige motivo operacional obrigatório de no mínimo 5 caracteres', async () => {
      await expect(
        tmsService.printTransportOrder({
          cargoId: 'c-test-reprint',
          sapTransportNumber: 'OT-2025-123456',
          isReprint: true,
          reprintReason: 'ok', // Curto demais (< 5 chars)
          operatorEmail: 'operador@ciafal.com.br',
        }),
      ).rejects.toThrow('REIMPRESSAO_REQUER_MOTIVO')
    })

    it('6.3 Validação de prontidão para liberação de carregamento', () => {
      // Incompleto (sem motorista, sem ordem SAP)
      const incomplete = checkLoadingReleaseReadiness({
        sapTransportStatus: 'Pendente',
        driverId: undefined,
        documentDeliveryStatus: 'Aguardando_Impressao',
      })
      expect(incomplete.isReady).toBe(false)
      expect(incomplete.missingRequirements.length).toBeGreaterThanOrEqual(3)

      // Completo (todos os 6 requisitos cumpridos)
      const complete = checkLoadingReleaseReadiness({
        sapTransportNumber: 'OT-2025-999888',
        sapTransportStatus: 'Criado',
        driverId: 'drv-01',
        driverName: 'Carlos Silva',
        vehiclePlate: 'ABC-1D23',
        documentDeliveryStatus: 'Entregue_Motorista',
      })
      expect(complete.isReady).toBe(true)
      expect(complete.missingRequirements.length).toBe(0)
    })

    it('6.4 RBAC Sprint 5: Validação de papéis para gestão de impressoras e reimpressão', () => {
      const adminMaster = getUserPermissions('admin_master')
      const adminTms = getUserPermissions('admin_tms')
      const gerenteCarga = getUserPermissions('gerente_carga')
      const operador = getUserPermissions('operador_logistica')
      const portaria = getUserPermissions('portaria')
      const comercial = getUserPermissions('comercial')
      const financeiro = getUserPermissions('financeiro')

      // Gestão de impressoras (apenas admins e gestor)
      expect(adminMaster.canManagePrinters).toBe(true)
      expect(adminTms.canManagePrinters).toBe(true)
      expect(gerenteCarga.canManagePrinters).toBe(false)
      expect(portaria.canManagePrinters).toBe(false)

      // Impressão da Ordem
      expect(gerenteCarga.canPrintTransport).toBe(true)
      expect(operador.canPrintTransport).toBe(true)
      expect(portaria.canPrintTransport).toBe(true)
      expect(comercial.canPrintTransport).toBe(false)
      expect(financeiro.canPrintTransport).toBe(false)

      // Reimpressão da Ordem (apenas gerência e admins)
      expect(adminMaster.canReprintTransport).toBe(true)
      expect(gerenteCarga.canReprintTransport).toBe(true)
      expect(operador.canReprintTransport).toBe(false)
      expect(portaria.canReprintTransport).toBe(false)
    })
  })
})
