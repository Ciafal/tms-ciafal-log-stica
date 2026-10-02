import { describe, it, expect } from 'vitest'
import {
  evaluateCustomerLogisticRules,
  CustomerLogisticInfoEntity,
  extractMaterialLengthMeters,
} from '../domain/customerLogisticInfoEngine'
import { SapSalesOrderEntity, VehicleEntity, avaliar_montagem_carga } from '../domain/rules'

describe('Motor Determinístico de Restrições Logísticas de Clientes', () => {
  const customerProfile13371: CustomerLogisticInfoEntity = {
    id: 'rec_13371',
    technical_key: 'CLI-13371-REC-001',
    customer_code: '13371',
    customer_name: 'COMERCIAL DE LAMINADOS E FERROS LTDA',
    ship_to_code: 'REC-13371-01',
    ship_to_name: 'FILIAL MACEIO CENTRO LOGÍSTICO',
    delivery_city: 'MACEIO',
    delivery_uf: 'AL',
    itinerary_code: 'AL001C',
    highest_restriction_level: 'CRITICA',
    is_active: true,
    material_restrictions_json: {
      minLengthM: 2.0,
      maxLengthM: 12.0,
      forbiddenLengthsM: [14.0, 15.0, 16.0],
      maxUnitWeightKg: 3000,
    },
    load_formation_restrictions_json: {
      exclusiveLoadOnly: false,
      allowSharedLoad: true,
      maxTotalWeightTons: 28.0,
      maxWeightPerDischargeKg: 28000,
    },
    vehicle_restrictions_json: {
      allowedVehicleTypes: ['Carreta LS', 'Carreta Grade Baixa', 'Truck'],
      forbiddenVehicleTypes: ['Carreta Convencional', 'Bitrem', 'Rodotrem'],
      mandatoryVehicleType: 'Carreta LS',
    },
    scheduling_restrictions_json: {
      requiresScheduling: true,
      mandatoryBeforeDeparture: true,
    },
  }

  it('deve extrair o comprimento de materiais corretamente a partir da descrição', () => {
    expect(extractMaterialLengthMeters('B. CH. 1 X 1/8 - 6,00M')).toBe(6.0)
    expect(extractMaterialLengthMeters('PERFIL W 200 X 15,0 - 12,00M')).toBe(12.0)
    expect(extractMaterialLengthMeters('CANTONEIRA 2 X 3/16 14,0 m')).toBe(14.0)
    expect(extractMaterialLengthMeters('BOBINA ACO')).toBe(null)
  })

  it('deve REJEITAR carga com 32t, Carreta Convencional e peças de 14m contra restrições de 28t, Carreta LS e 12m', () => {
    // Pedido com 32t e material de 14m
    const incompatibleOrder: SapSalesOrderEntity = {
      id: 'ord-test-01',
      order_number: '99001',
      customer_code: '13371',
      customer_name: 'COMERCIAL DE LAMINADOS E FERROS LTDA',
      material: 'PERFIL PESADO 14,0 m',
      material_description: 'PERFIL ESTRUTURAL 14,0 m',
      weight_kg: 32000,
      total_value: 120000,
      itinerary_code: 'AL001C',
      destination_city: 'MACEIO',
      uf: 'AL',
      status: 'disponivel',
      credit_status: 'Liberado',
      production_status: 'Pronto',
      discharge_type: 'Ponte Rolante',
    }

    // Veículo Carreta Convencional (proibido no cliente)
    const incompatibleVehicle: VehicleEntity = {
      id: 'veh-conv',
      plate: 'ABC-1234',
      type: 'Carreta Convencional',
      capacity_kg: 35000,
    }

    const result = evaluateCustomerLogisticRules({
      orders: [incompatibleOrder],
      vehicle: incompatibleVehicle,
      customerProfiles: [customerProfile13371],
    })

    expect(result.isCompatible).toBe(false)
    expect(result.decision).toBe('REJEITADA')
    expect(result.hasCriticalBlock).toBe(true)

    // Verificar se as 3 divergências foram detectadas
    const fields = result.divergences.map((d) => d.field)
    expect(fields).toContain('peso_maximo_cliente')
    expect(fields).toContain('tipo_veiculo_proibido')
    expect(fields).toContain('comprimento_maximo')

    // Verificar notas operacionais geradas
    expect(result.informativeNotes.some((n) => n.includes('agendamento obrigatório'))).toBe(true)
  })

  it('deve APROVAR carga compatível com 26t, Carreta LS e peças de 12m', () => {
    const compatibleOrder: SapSalesOrderEntity = {
      id: 'ord-test-02',
      order_number: '99002',
      customer_code: '13371',
      customer_name: 'COMERCIAL DE LAMINADOS E FERROS LTDA',
      material: 'BARRA CHATA 12,0 m',
      material_description: 'BARRA CHATA 12,0 m',
      weight_kg: 26000,
      total_value: 95000,
      itinerary_code: 'AL001C',
      destination_city: 'MACEIO',
      uf: 'AL',
      status: 'disponivel',
      credit_status: 'Liberado',
      production_status: 'Pronto',
      discharge_type: 'Ponte Rolante',
    }

    const compatibleVehicle: VehicleEntity = {
      id: 'veh-ls',
      plate: 'XYZ-9876',
      type: 'Carreta LS',
      capacity_kg: 28000,
    }

    const result = evaluateCustomerLogisticRules({
      orders: [compatibleOrder],
      vehicle: compatibleVehicle,
      customerProfiles: [customerProfile13371],
    })

    expect(result.isCompatible).toBe(true)
    expect(result.decision).toBe('COMPATIVEL')
    expect(result.criticalDivergences.length).toBe(0)
    expect(result.divergences.length).toBe(0)
  })

  it('deve integrar com o motor avaliar_montagem_carga recusando quando houver violação', () => {
    const incompatibleOrder: SapSalesOrderEntity = {
      id: 'ord-test-03',
      order_number: '99003',
      customer_code: '13371',
      customer_name: 'COMERCIAL DE LAMINADOS E FERROS LTDA',
      material: 'TUBOS 14,0 m',
      weight_kg: 32000,
      total_value: 120000,
      itinerary_code: 'AL001C',
      destination_city: 'MACEIO',
      uf: 'AL',
      status: 'disponivel',
      credit_status: 'Liberado',
      production_status: 'Pronto',
      discharge_type: 'Ponte Rolante',
    }

    const incompatibleVehicle: VehicleEntity = {
      id: 'veh-conv',
      plate: 'ABC-1234',
      type: 'Carreta Convencional',
      capacity_kg: 35000,
    }

    const assembly = avaliar_montagem_carga({
      orders: [incompatibleOrder],
      vehicle: incompatibleVehicle,
      targetItineraryCode: 'AL001C',
      customerLogisticProfiles: [customerProfile13371],
    })

    expect(assembly.decision).toBe('recusada')
    expect(assembly.reasons.some((r) => r.includes('restrições logísticas do cliente'))).toBe(true)
  })
})
