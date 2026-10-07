import { describe, it, expect } from 'vitest'
import {
  evaluateEliminationFilters,
  calculateMulticriteriaScore,
  isDischargeCompatibleWithBody,
  normalizeBodyType,
  normalizeDischargeType,
  runVehicleLoadMatchingEngine,
  type CandidateLoadProposal,
} from '../domain/vehicleLoadMatchingEngine'
import type { QueueEntryEntity } from '../domain/rules'

describe('Motor Determinístico de Encontros Veículo × Carga (TMS CIAFAL)', () => {
  const mockBaseVehicle: QueueEntryEntity = {
    id: 'queue_v1',
    driver: 'driver_01',
    vehicle: 'vehicle_01',
    type: 'PORTA',
    status: 'disponivel',
    entry_time: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 min atrás
    driver_name_cached: 'Sebastião Carlos',
    driver_doc_cached: '111.222.333-44',
    driver_whatsapp_cached: '11988887777',
    vehicle_plate_cached: 'ABC-1234',
    vehicle_type_cached: 'Carreta LS',
    vehicle_capacity_kg_cached: 27000,
    preferred_itinerary: 'SP-CAMPINAS',
    preferred_itinerary_name: 'Campinas e Região Metropolitana',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  } as QueueEntryEntity

  const mockBaseLoad: CandidateLoadProposal = {
    id: 'load_test_01',
    title: 'CARGA-SP-CAMPINAS-01',
    itineraryCode: 'SP-CAMPINAS',
    destinationCity: 'Campinas',
    destinationUf: 'SP',
    orders: [
      {
        id: 'ord_1',
        order_number: '0010992341',
        customer_code: 'CUST-001',
        customer_name: 'Metalúrgica Campinas Ltda',
        destination_city: 'Campinas',
        uf: 'SP',
        itinerary_code: 'SP-CAMPINAS',
        weight_kg: 26000,
        volume_m3: 35,
        total_value: 120000,
        line: 'Perfis e Laminados',
        family: 'Cantoneiras',
        material: 'PERFIL-L-50X50',
        production_status: 'Pronto',
        credit_status: 'Liberado',
        discharge_type: 'Ponte Rolante',
        required_vehicle_type: 'Carreta LS',
        status: 'disponivel',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ],
    totalWeightKg: 26000,
    customersCount: 1,
    dischargesCount: 1,
    fracionamentos: 1,
    remessasPrevistas: 1,
    hasBlockedCredit: false,
    hasInAnalysisCredit: false,
    isStockReady: true,
    isPcpReady: true,
    requiredBodyTypes: ['Carreta LS'],
    requiredDischargeTypes: ['Ponte Rolante'],
    logisticRestrictions: [],
    priorityLevel: 'ALTA',
    maxOverdueDays: 2,
  }

  describe('Filtros Eliminatórios', () => {
    it('deve aprovar veículo e carga quando todos os critérios forem atendidos', () => {
      const res = evaluateEliminationFilters({
        vehicle: mockBaseVehicle,
        vehicleMaster: {
          id: 'v1',
          plate: 'ABC-1234',
          type: 'Carreta LS',
          body_type: 'Grade Baixa',
          capacity_kg: 27000,
          driver: 'd1',
        } as any,
        driverMaster: {
          id: 'd1',
          name: 'Sebastião Carlos',
          document: '11122233344',
          whatsapp: '11988887777',
          status: 'ativo',
          created: '',
          updated: '',
        },
        load: mockBaseLoad,
      })

      expect(res.isEliminated).toBe(false)
      expect(res.reasons).toHaveLength(0)
      expect(res.checks.vehicleCapacity).toBe(true)
      expect(res.checks.credit).toBe(true)
      expect(res.checks.stock).toBe(true)
      expect(res.checks.documentation).toBe(true)
    })

    it('deve eliminar por capacidade excedida (peso carga > capacidade veículo)', () => {
      const overloadedVehicle: QueueEntryEntity = {
        ...mockBaseVehicle,
        vehicle_capacity_kg_cached: 20000, // Menor que 26.000 kg da carga
      }

      const res = evaluateEliminationFilters({
        vehicle: overloadedVehicle,
        vehicleMaster: {
          id: 'v1',
          plate: 'ABC-1234',
          type: 'Truck',
          body_type: 'Grade Baixa',
          capacity_kg: 20000,
          driver: 'd1',
        } as any,
        load: mockBaseLoad,
      })

      expect(res.isEliminated).toBe(true)
      expect(res.primaryReason).toBe('exceedsCapacity')
      expect(res.checks.vehicleCapacity).toBe(false)
      expect(res.reasons[0]).toContain('excede a capacidade')
    })

    it('deve eliminar por incompatibilidade de carroceria vs descarga (ex: Baú fechado com descarga por Ponte Rolante/Munck)', () => {
      const bauVehicle: QueueEntryEntity = {
        ...mockBaseVehicle,
        vehicle_type_cached: 'Baú Fechado',
      }

      const res = evaluateEliminationFilters({
        vehicle: bauVehicle,
        vehicleMaster: {
          id: 'v1',
          plate: 'ABC-1234',
          type: 'Baú Fechado',
          body_type: 'Baú',
          capacity_kg: 27000,
          driver: 'd1',
        } as any,
        load: {
          ...mockBaseLoad,
          requiredBodyTypes: ['Grade Baixa', 'Sider'],
          requiredDischargeTypes: ['Ponte Rolante'],
        },
      })

      expect(res.isEliminated).toBe(true)
      expect(res.checks.vehicleBodyType).toBe(false)
      expect(res.checks.dischargeCompatibility).toBe(false)
    })

    it('deve eliminar por crédito financeiro bloqueado', () => {
      const blockedCreditLoad: CandidateLoadProposal = {
        ...mockBaseLoad,
        hasBlockedCredit: true,
      }

      const res = evaluateEliminationFilters({
        vehicle: mockBaseVehicle,
        load: blockedCreditLoad,
      })

      expect(res.isEliminated).toBe(true)
      expect(res.primaryReason).toBe('blockedCredit')
      expect(res.checks.credit).toBe(false)
    })

    it('deve eliminar por falta de estoque físico e PCP', () => {
      const noStockLoad: CandidateLoadProposal = {
        ...mockBaseLoad,
        isStockReady: false,
        isPcpReady: false,
      }

      const res = evaluateEliminationFilters({
        vehicle: mockBaseVehicle,
        load: noStockLoad,
      })

      expect(res.isEliminated).toBe(true)
      expect(res.primaryReason).toBe('missingStock')
      expect(res.checks.stock).toBe(false)
    })

    it('deve eliminar se motorista estiver bloqueado no cadastro', () => {
      const res = evaluateEliminationFilters({
        vehicle: {
          ...mockBaseVehicle,
          status: 'bloqueado',
        },
        driverMaster: {
          id: 'd1',
          name: 'Sebastião Carlos',
          document: '11122233344',
          whatsapp: '11988887777',
          status: 'bloqueado',
          created: '',
          updated: '',
        },
        load: mockBaseLoad,
      })

      expect(res.isEliminated).toBe(true)
      expect(res.primaryReason).toBe('blockedDocumentation')
      expect(res.checks.documentation).toBe(false)
    })
  })

  describe('Funções de Normalização e Descarga', () => {
    it('normaliza corretamente carrocerias e tipos de descarga', () => {
      expect(normalizeBodyType('Sider Centro')).toBe('SIDER')
      expect(normalizeBodyType('Grade Baixa Aberta')).toBe('GRADE_BAIXA')
      expect(normalizeBodyType('Baú')).toBe('BAU')

      expect(normalizeDischargeType('Ponte Rolante')).toBe('PONTE_ROLANTE')
      expect(normalizeDischargeType('Munck Içamento')).toBe('MUNCK')
      expect(normalizeDischargeType('Livre / Manual')).toBe('LIVRE')
    })

    it('avalia incompatibilidade física entre baú e içamento superior', () => {
      const r1 = isDischargeCompatibleWithBody('Baú', 'Ponte Rolante')
      expect(r1.compatible).toBe(false)

      const r2 = isDischargeCompatibleWithBody('Grade Baixa', 'Ponte Rolante')
      expect(r2.compatible).toBe(true)
    })
  })

  describe('Cálculo de Score Multicritério (0–100 pts)', () => {
    it('deve conceder pontuação máxima (≥95 pts) para encontro perfeito com ocupação ≥95% e espera em PORTA', () => {
      const score = calculateMulticriteriaScore({
        occupancyPct: 96.3, // 30 pts
        driverPreferredItinerary: 'SP-CAMPINAS',
        cargoItineraryCode: 'SP-CAMPINAS', // 20 pts
        dischargesCount: 1, // 15 pts
        isStockReady: true,
        isCreditLiberated: true,
        isCreditInAnalysis: false,
        isPcpReady: true, // 15 pts
        driverQueueGroup: 'PORTA',
        waitingMinutes: 65, // 10 pts
        costPerTon: 110, // 10 pts
        targetCostPerTon: 115,
      })

      expect(score.occupancyPoints).toBe(30)
      expect(score.itineraryAdherencePoints).toBe(20)
      expect(score.dischargesPoints).toBe(15)
      expect(score.readinessPoints).toBe(15)
      expect(score.queueWaitPoints).toBe(10)
      expect(score.costEfficiencyPoints).toBe(10)
      expect(score.totalScore).toBe(100)
    })

    it('deve calcular pontuação proporcional para ocupação média e preferências neutras', () => {
      const score = calculateMulticriteriaScore({
        occupancyPct: 82.0, // 18 pts
        driverPreferredItinerary: 'SEM_PREFERENCIA',
        cargoItineraryCode: 'SP-VALE-PARAIBA', // 12 pts (neutro)
        dischargesCount: 3, // 8 pts
        isStockReady: true,
        isCreditLiberated: false,
        isCreditInAnalysis: true,
        isPcpReady: true, // 10 pts
        driverQueueGroup: 'FORA',
        waitingMinutes: 10, // 4 pts
        costPerTon: 120, // 5 pts
        targetCostPerTon: 115,
      })

      expect(score.occupancyPoints).toBe(18)
      expect(score.itineraryAdherencePoints).toBe(12)
      expect(score.dischargesPoints).toBe(8)
      expect(score.readinessPoints).toBe(10)
      expect(score.queueWaitPoints).toBe(4)
      expect(score.totalScore).toBe(57)
    })
  })

  describe('Execução do Motor Completo (runVehicleLoadMatchingEngine)', () => {
    it('gera matches viáveis, diagnósticos de não-match e matriz de células', () => {
      const result = runVehicleLoadMatchingEngine({
        queueEntries: [
          mockBaseVehicle,
          {
            id: 'queue_v2_small',
            driver: 'driver_02',
            vehicle: 'vehicle_02',
            type: 'FORA',
            status: 'disponivel',
            entry_time: new Date().toISOString(),
            driver_name_cached: 'Joaquim Silva',
            vehicle_plate_cached: 'TRK-9988',
            vehicle_type_cached: 'Toco',
            vehicle_capacity_kg_cached: 8000, // Não suporta a carga de 26t
            preferred_itinerary: 'SP-SANTOS',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          },
        ],
        salesOrders: mockBaseLoad.orders,
      })

      expect(result.totalVehiclesAnalyzed).toBe(2)
      expect(result.viableMatchesCount).toBeGreaterThan(0)

      // Veículo 1 teve match viável
      const v1Match = result.matches.find((m) => m.queueVehicle.id === 'queue_v1')
      expect(v1Match).toBeDefined()
      expect(v1Match?.occupancyPct).toBeGreaterThan(90)
      expect(v1Match?.totalSuggestedFreight).toBeGreaterThan(0)
      expect(v1Match?.anttFloorValue).toBeGreaterThan(0)
      // Frete sugerido nunca abaixo do piso ANTT
      expect(v1Match!.totalSuggestedFreight).toBeGreaterThanOrEqual(v1Match!.anttFloorValue)

      // Veículo 2 não teve match (capacidade 8t < 26t) e deve ter diagnóstico detalhado
      const v2Diag = result.nonMatchDiagnoses.find((d) => d.vehicleId === 'queue_v2_small')
      expect(v2Diag).toBeDefined()
      expect(v2Diag?.eliminations.exceedsCapacity).toBeGreaterThan(0)
      expect(v2Diag?.summaryMessage).toContain('excedem a capacidade')

      // Matriz de encontros
      expect(result.matrixVehicles).toHaveLength(2)
      expect(result.matrixCargas).toHaveLength(1)
      const cellV1 = result.matrixCells[`queue_v1_${result.matrixCargas[0].id}`]
      expect(cellV1.status).toBe('VIABLE')

      const cellV2 = result.matrixCells[`queue_v2_small_${result.matrixCargas[0].id}`]
      expect(cellV2.status).toBe('INVIABLE')
      expect(cellV2.reason).toContain('excede a capacidade')
    })
  })
})
