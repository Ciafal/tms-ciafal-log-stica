import { describe, it, expect } from 'vitest'
import {
  validateDesiredDate,
  validateDp34Stock,
  classifyCredit,
  classifyOccupancyBand,
  runCiafalOptimizer,
} from '../domain/optimizerEngine'
import { checkLoadingReleaseReadiness } from '../domain/printingAndTransportEngine'
import { ROLE_PERMISSIONS } from '../domain/rules'
import { tmsService } from '../services/tmsService'

describe('SPRINT 5 — SUÍTE DE TESTES DE OTIMIZADOR, SAP E IMPRESSÃO', () => {
  // ==========================================
  // 1. TESTES DE DATA DESEJADA (REGRA ABSOLUTA)
  // ==========================================
  describe('1. Data Desejada & Bloqueio de Antecipação', () => {
    it('Deve aprovar expedição na data desejada exata', () => {
      const res = validateDesiredDate('2025-05-10', '2025-05-10')
      expect(res.isValid).toBe(true)
      expect(res.isAnticipated).toBe(false)
    })

    it('Deve aprovar expedição em data posterior à desejada', () => {
      const res = validateDesiredDate('2025-05-10', '2025-05-12')
      expect(res.isValid).toBe(true)
      expect(res.isAnticipated).toBe(false)
    })

    it('Deve BLOQUEAR com motivo claro quando tentar antecipar expedição', () => {
      const res = validateDesiredDate('2025-05-15', '2025-05-10')
      expect(res.isValid).toBe(false)
      expect(res.isAnticipated).toBe(true)
      expect(res.rejectionReason).toContain('DATA_ANTECIPADA_NAO_PERMITIDA')
    })

    it('Deve identificar pedidos atrasados e calcular número de dias de atraso', () => {
      // Data desejada no passado
      const pastDate = '2020-01-01'
      const res = validateDesiredDate(pastDate, new Date().toISOString().split('T')[0])
      expect(res.isValid).toBe(true)
      expect(res.isOverdue).toBe(true)
      expect(res.overdueDays).toBeGreaterThan(1000)
    })
  })

  // ==========================================
  // 2. TESTES DE ESTOQUE OFICIAL DP34
  // ==========================================
  describe('2. Estoque DP34 & Depósitos Separados', () => {
    const mockStocks: any[] = [
      {
        material_code: 'BARRA CHATA 1/2X1/8',
        storage_location: 'DP34',
        available_qty: 25,
        weight_kg: 25000,
      },
      {
        material_code: 'BARRA CHATA 1/2X1/8',
        storage_location: 'DP01',
        available_qty: 10,
        weight_kg: 10000,
      },
      {
        material_code: 'CANTONEIRA 2X3/16',
        storage_location: 'DP01', // Apenas em outro depósito
        available_qty: 30,
        weight_kg: 30000,
      },
    ]

    it('Deve validar como disponível quando DP34 tem saldo suficiente', () => {
      const res = validateDp34Stock('BARRA CHATA 1/2X1/8', 20000, mockStocks)
      expect(res.isDp34Available).toBe(true)
      expect(res.dp34AvailableKg).toBe(25000)
    })

    it('NÃO deve somar automaticamente depósitos diferentes e acusar insuficiência DP34', () => {
      // Necessidade: 28t. DP34 tem 25t e DP01 tem 10t. Soma daria 35t, mas DP34 sozinho tem 25t.
      const res = validateDp34Stock('BARRA CHATA 1/2X1/8', 28000, mockStocks)
      expect(res.isDp34Available).toBe(false)
      expect(res.dp34AvailableKg).toBe(25000)
      expect(res.otherDepositsKg).toBe(10000)
      expect(res.statusMessage).toContain('ESTOQUE DP34 INSUFICIENTE')
      expect(res.needsStockConfirmation).toBe(true)
    })

    it('Deve registrar previsão futura de produção PCP sem marcar como DP34 disponível', () => {
      const pcpOrders: any[] = [
        {
          material_code: 'CANTONEIRA 2X3/16',
          weight_kg_planned: 15000,
          status: 'Planejada',
        },
      ]
      const res = validateDp34Stock('CANTONEIRA 2X3/16', 15000, mockStocks, pcpOrders)
      expect(res.isDp34Available).toBe(false)
      expect(res.pcpFutureKg).toBe(15000)
      expect(res.statusMessage).toContain('PCP Previsto')
    })
  })

  // ==========================================
  // 3. TESTES DE CRÉDITO & MULTI-CLIENTE
  // ==========================================
  describe('3. Crédito por Valor Monetário & Multi-cliente', () => {
    it('Deve classificar pedidos Liberados, Em Análise e Bloqueados', () => {
      const c1 = classifyCredit({ credit_status: 'Liberado' } as any)
      expect(c1.classification).toBe('LIBERADO')

      const c2 = classifyCredit({ credit_status: 'Em Análise' } as any)
      expect(c2.classification).toBe('LIBERADO_COM_APROVACAO')

      const c3 = classifyCredit({ credit_status: 'Bloqueado' } as any)
      expect(c3.classification).toBe('BLOQUEADO')
    })

    it('Deve calcular faixas de ocupação configuráveis', () => {
      expect(classifyOccupancyBand(97.5).band).toBe('EXCELENTE')
      expect(classifyOccupancyBand(92.0).band).toBe('BOA')
      expect(classifyOccupancyBand(85.0).band).toBe('ATENCAO')
      expect(classifyOccupancyBand(75.0).band).toBe('BAIXA')
      expect(classifyOccupancyBand(75.0).alert).toContain('ALERTA DE BAIXA OCUPAÇÃO')
    })
  })

  // ==========================================
  // 4. TESTES DO MOTOR DE OTIMIZAÇÃO MULTICRITÉRIO
  // ==========================================
  describe('4. Motor Determinístico de Otimização Multicritério', () => {
    const orders: any[] = [
      {
        id: 'ord-1',
        order_number: 'PED-1',
        customer_code: 'CLI-1',
        itinerary_code: 'ITIN-SP-INTERIOR',
        material: 'BARRA CHATA 1/2X1/8',
        weight_kg: 14000,
        total_value: 80000,
        desired_date: new Date().toISOString().split('T')[0],
        credit_status: 'Liberado',
      },
      {
        id: 'ord-2',
        order_number: 'PED-2',
        customer_code: 'CLI-2',
        itinerary_code: 'ITIN-SP-INTERIOR',
        material: 'BARRA CHATA 1/2X1/8',
        weight_kg: 13200,
        total_value: 75000,
        desired_date: new Date().toISOString().split('T')[0],
        credit_status: 'Liberado',
      },
      {
        id: 'ord-3',
        order_number: 'PED-3',
        customer_code: 'CLI-3',
        itinerary_code: 'ITIN-SP-INTERIOR',
        material: 'BARRA CHATA 1/2X1/8',
        weight_kg: 10000,
        total_value: 60000,
        desired_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], // Futuro (+5 dias)
        credit_status: 'Liberado',
      },
    ]

    const stocks: any[] = [
      {
        material_code: 'BARRA CHATA 1/2X1/8',
        storage_location: 'DP34',
        available_qty: 40,
        weight_kg: 40000,
      },
    ]

    const queue: any[] = [
      {
        id: 'q-1',
        type: 'PORTA',
        status: 'disponivel',
        driver_name_cached: 'Carlos Motorista PORTA',
        vehicle_capacity_kg_cached: 28000,
      },
    ]

    it('Deve gerar 5 cenários com ocupação calculada e explicabilidade do score', () => {
      const res = runCiafalOptimizer({
        itineraryCode: 'ITIN-SP-INTERIOR',
        plannedDate: new Date().toISOString().split('T')[0],
        orders,
        stocks,
        pcpOrders: [],
        queueEntries: queue,
        vehicleCapacityKg: 28000,
        vehicleType: 'Carreta 5 Eixos',
      })

      expect(res.scenarios.length).toBe(5)
      expect(res.scenarios[0].scenarioType).toBe('max_occupancy')
      expect(res.scenarios[1].scenarioType).toBe('immediate_exit')
      expect(res.scenarios[2].scenarioType).toBe('prioritize_overdue')

      // Pedido futuro não deve ter sido alocado na data atual
      expect(res.summary.blockedFutureDateCount).toBe(1)

      // Cenário com motorista PORTA deve receber bônus de score
      expect(res.scenarios[0].scoreBreakdown.portaDriverScore).toBeGreaterThan(0)
      expect(res.scenarios[0].scoreBreakdown.explanation).toContain('Score')
    })
  })

  // ==========================================
  // 5. TESTES DE SAP ORDEM DE TRANSPORTE E IMPRESSÃO
  // ==========================================
  describe('5. Ordem de Transporte SAP & Regras de Impressão', () => {
    it('Deve bloquear impressão antes da confirmação do SAP', async () => {
      await expect(
        tmsService.printTransportOrder({
          cargoId: 'c-test',
          sapTransportNumber: '', // Ausente
          operatorEmail: 'operador@ciafal.com.br',
        }),
      ).rejects.toThrow('REGRA_SEGURANCA')
    })

    it('Deve exigir motivo operacional para autorizar reimpressão', async () => {
      await expect(
        tmsService.printTransportOrder({
          cargoId: 'c-test',
          sapTransportNumber: 'OT-2025-123456',
          isReprint: true,
          reprintReason: '', // Vazio
          operatorEmail: 'operador@ciafal.com.br',
        }),
      ).rejects.toThrow('REIMPRESSAO_REQUER_MOTIVO')
    })

    it('Deve validar elegibilidade rigorosa para liberação de carregamento', () => {
      // Incompleto
      const incomplete = checkLoadingReleaseReadiness({
        sapTransportStatus: 'Pendente',
        driverId: undefined,
        documentDeliveryStatus: 'Aguardando_Impressao',
      })
      expect(incomplete.isReady).toBe(false)
      expect(incomplete.missingRequirements.length).toBeGreaterThan(1)

      // Completo
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
  })

  // ==========================================
  // 6. TESTES DE PERMISSÕES RBAC SPRINT 5
  // ==========================================
  describe('6. Segurança e Permissões RBAC Sprint 5', () => {
    it('Admin Master deve ter todas as permissões de impressora e transporte', () => {
      const perms = ROLE_PERMISSIONS['admin_master']
      expect(perms.canViewPrinters).toBe(true)
      expect(perms.canManagePrinters).toBe(true)
      expect(perms.canPrintTransport).toBe(true)
      expect(perms.canReprintTransport).toBe(true)
    })

    it('Portaria pode visualizar e imprimir mas NÃO reimprimir sem autorização de gerência', () => {
      const perms = ROLE_PERMISSIONS['portaria']
      expect(perms.canViewPrinters).toBe(true)
      expect(perms.canPrintTransport).toBe(true)
      expect(perms.canReprintTransport).toBe(false)
    })

    it('Comercial não possui permissão de gestão de impressoras', () => {
      const perms = ROLE_PERMISSIONS['comercial']
      expect(perms.canViewPrinters).toBe(false)
      expect(perms.canManagePrinters).toBe(false)
    })
  })
})
