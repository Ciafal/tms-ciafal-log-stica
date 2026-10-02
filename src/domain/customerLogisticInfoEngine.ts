/**
 * customerLogisticInfoEngine.ts
 *
 * Motor Determinístico de Restrições Logísticas de Clientes do TMS CIAFAL.
 * Fonte Única Canônica: SAP ECC via RFC (ZTMS_INFO_CLIENTE / Z_RFC_TMS_INFO_CLIENTE).
 *
 * Classificação estrita de regras:
 * - CRITICA: Bloqueia formação de carga (eliminação determinística). Override exige justificativa + auditoria.
 * - RESTRITIVA: Bloqueia formação de carga (eliminação determinística).
 * - ALERTA: Permite montagem porém gera advertência visual e exige ciência do operador.
 * - INFORMATIVA: Apenas orienta o operador / motorista / torre.
 */

import { SapSalesOrderEntity, VehicleEntity } from './rules'

export type RestrictionLevel = 'INFORMATIVA' | 'ALERTA' | 'RESTRITIVA' | 'CRITICA'

export interface MaterialRestrictions {
  minLengthM?: number
  maxLengthM?: number
  forbiddenLengthsM?: number[]
  maxUnitWeightKg?: number
  maxTotalQuantity?: number
  requiresSpecialStrapping?: boolean
  prohibitMaterialMixing?: boolean
  stackingAllowed?: boolean
  maxStackingTiers?: number
  mandatoryProtection?: string[]
  notes?: string
}

export interface LoadFormationRestrictions {
  exclusiveLoadOnly?: boolean
  allowSharedLoad?: boolean
  maxOrdersPerLoad?: number
  maxDischargesPerLoad?: number
  maxWeightPerDischargeKg?: number
  maxTotalWeightTons?: number
  mandatoryUnloadingOrder?: boolean
  physicalSeparationRequired?: boolean
  separationCriteria?: string
  individualMaterialTagging?: boolean
  notes?: string
}

export interface VehicleRestrictions {
  allowedVehicleTypes?: string[]
  forbiddenVehicleTypes?: string[]
  maxLengthM?: number
  maxHeightM?: number
  maxWidthM?: number
  maxGrossWeightTons?: number
  maxAxlesCount?: number
  mandatoryVehicleType?: string
  notes?: string
}

export interface AccessRestrictions {
  hasRestrictedStreet?: boolean
  restrictedStreetDetails?: string
  allowedTimeStart?: string
  allowedTimeEnd?: string
  urbanAccessType?: string
  unpavedRoad?: boolean
  requiresPriorAuthorization?: boolean
  authorizationLeadTimeHours?: number
  referencePoint?: string
  accessInstructions?: string
}

export interface DischargeRestrictions {
  dischargeType?: string
  secondaryDischargeType?: string
  equipmentCapacityTons?: number
  maxBundleWeightKg?: number
  dischargeSide?: string
  requiresTarpRemoval?: boolean
  numberOfTieDownPoints?: number
  historicalAvgUnloadingTimeMin?: number
  mandatoryDischargeSequence?: boolean
  notes?: string
}

export interface SchedulingRestrictions {
  requiresScheduling?: boolean
  mandatoryBeforeDeparture?: boolean
  minAdvanceNoticeHours?: number
  communicationChannel?: string
  contactName?: string
  contactPhone?: string
  contactWhatsapp?: string
  contactEmail?: string
  receivingWindowStart?: string
  receivingWindowEnd?: string
  lunchBreakStart?: string
  lunchBreakEnd?: string
  allowedDays?: string[]
  acceptsSaturday?: boolean
  acceptsSunday?: boolean
  acceptsHoliday?: boolean
  arrivalToleranceMinutes?: number
  requiresConfirmationToken?: boolean
  notes?: string
}

export interface DocumentationRestrictions {
  requiredDocuments?: string[]
  specialAuthorizationRequired?: boolean
  notes?: string
}

export interface SafetyDriverRestrictions {
  mandatoryEpiList?: string[]
  requiresSafetyTraining?: boolean
  trainingValidityMonths?: number
  requiresSafetyIntegration?: boolean
  requiresDriverPreRegistration?: boolean
  minVehicleYear?: number
  internalRules?: string
}

export interface CustomerLogisticInfoEntity {
  id: string
  technical_key: string
  customer_code: string
  customer_name: string
  ship_to_code: string
  ship_to_name: string
  cnpj?: string
  plant_code?: string
  sales_org?: string
  distribution_channel?: string
  sector?: string
  delivery_address?: string
  delivery_city: string
  delivery_uf: string
  delivery_cep?: string
  itinerary_code?: string
  logistic_region?: string
  highest_restriction_level: RestrictionLevel
  is_active: boolean
  valid_from?: string
  valid_to?: string
  sap_user?: string
  origin_rfc?: string
  origin_table?: string
  last_sync_date?: string
  observations?: string
  material_restrictions_json?: MaterialRestrictions
  load_formation_restrictions_json?: LoadFormationRestrictions
  vehicle_restrictions_json?: VehicleRestrictions
  access_restrictions_json?: AccessRestrictions
  discharge_restrictions_json?: DischargeRestrictions
  scheduling_restrictions_json?: SchedulingRestrictions
  documentation_restrictions_json?: DocumentationRestrictions
  safety_driver_restrictions_json?: SafetyDriverRestrictions
  history_changelog_json?: Array<{
    timestamp: string
    user: string
    action: string
    description: string
  }>
  created?: string
  updated?: string
}

export interface RestrictionValidationDivergence {
  field: string
  level: RestrictionLevel
  plannedValue: string | number
  allowedValue: string | number
  message: string
  customerCode: string
  customerName: string
}

export interface CustomerValidationResult {
  isCompatible: boolean
  hasCriticalBlock: boolean
  hasRestrictiveBlock: boolean
  hasWarning: boolean
  decision: 'COMPATIVEL' | 'ALERTA' | 'REJEITADA'
  divergences: RestrictionValidationDivergence[]
  criticalDivergences: RestrictionValidationDivergence[]
  restrictiveDivergences: RestrictionValidationDivergence[]
  warningDivergences: RestrictionValidationDivergence[]
  informativeNotes: string[]
  applicableRulesSummary: string[]
}

/**
 * Normaliza textos para comparação insensível a acentuação e caixa
 */
export function normalizeString(str?: string): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Extrai o comprimento em metros a partir da descrição ou código do material
 * Exemplo: "B. CH. 1 X 1/8 - 6,00M" -> 6.0 | "14,0 m" -> 14.0
 */
export function extractMaterialLengthMeters(materialDesc?: string): number | null {
  if (!materialDesc) return null
  const regex = /(\d+(?:[.,]\d+)?)\s*(?:m\b|metros\b|m-)/i
  const match = materialDesc.match(regex)
  if (match && match[1]) {
    const val = parseFloat(match[1].replace(',', '.'))
    return isNaN(val) ? null : val
  }
  return null
}

/**
 * Validador Central das Restrições Logísticas de Clientes
 * Executado determinística e rigorosamente pelo Planejador de Cargas e pelos Encontros
 */
export function evaluateCustomerLogisticRules(params: {
  orders: SapSalesOrderEntity[]
  vehicle: VehicleEntity | null
  customerProfiles: CustomerLogisticInfoEntity[]
  planningDate?: string // Data de planejamento (ISO ou YYYY-MM-DD)
}): CustomerValidationResult {
  const { orders, vehicle, customerProfiles, planningDate = new Date().toISOString() } = params

  const divergences: RestrictionValidationDivergence[] = []
  const informativeNotes: string[] = []
  const applicableRulesSummary: string[] = []

  if (!orders || orders.length === 0) {
    return {
      isCompatible: true,
      hasCriticalBlock: false,
      hasRestrictiveBlock: false,
      hasWarning: false,
      decision: 'COMPATIVEL',
      divergences: [],
      criticalDivergences: [],
      restrictiveDivergences: [],
      warningDivergences: [],
      informativeNotes: [],
      applicableRulesSummary: [],
    }
  }

  // Agrupar pedidos por cliente e recebedor
  const ordersByCustomer = new Map<string, SapSalesOrderEntity[]>()
  orders.forEach((o) => {
    const key = o.customer_code || o.customer_name
    const current = ordersByCustomer.get(key) || []
    current.push(o)
    ordersByCustomer.set(key, current)
  })

  // Para cada cliente presente na carga
  ordersByCustomer.forEach((custOrders, custKey) => {
    const custCode = custOrders[0]?.customer_code || custKey
    const custName = custOrders[0]?.customer_name || custKey

    // Localizar ficha de inteligência logística correspondente
    const profile = customerProfiles.find(
      (p) =>
        (p.customer_code === custCode ||
          p.ship_to_code === custCode ||
          normalizeString(p.customer_name) === normalizeString(custName)) &&
        p.is_active !== false,
    )

    if (!profile) {
      // Cliente sem restrição específica cadastrada -> segue fluxo padrão
      return
    }

    // Verificar validade temporal da ficha na data de planejamento
    const planTime = new Date(planningDate).getTime()
    if (profile.valid_from && new Date(profile.valid_from).getTime() > planTime) return
    if (profile.valid_to && new Date(profile.valid_to).getTime() < planTime) return

    applicableRulesSummary.push(
      `Cliente ${custCode} (${custName}) - Nível ${profile.highest_restriction_level}`,
    )

    const ruleLevel = profile.highest_restriction_level || 'RESTRITIVA'

    // 1. Restrições de Formação da Carga & Peso Total
    const loadForm = profile.load_formation_restrictions_json
    const custTotalWeightKg = custOrders.reduce((sum, o) => sum + (o.weight_kg || 0), 0)
    const custTotalWeightTons = custTotalWeightKg / 1000

    if (loadForm) {
      // Limite máximo de peso (em toneladas ou kg)
      const maxTons =
        loadForm.maxTotalWeightTons ||
        (loadForm.maxWeightPerDischargeKg ? loadForm.maxWeightPerDischargeKg / 1000 : null)
      if (maxTons !== null && custTotalWeightTons > maxTons) {
        divergences.push({
          field: 'peso_maximo_cliente',
          level: ruleLevel,
          plannedValue: `${custTotalWeightTons.toFixed(1)} t`,
          allowedValue: `${maxTons.toFixed(1)} t`,
          message: `Peso planejado para o cliente (${custTotalWeightTons.toFixed(1)} t) excede o limite aceito de ${maxTons.toFixed(1)} t.`,
          customerCode: custCode,
          customerName: custName,
        })
      }

      // Carga exclusiva
      if (loadForm.exclusiveLoadOnly && ordersByCustomer.size > 1) {
        divergences.push({
          field: 'carga_exclusiva',
          level: ruleLevel,
          plannedValue: `${ordersByCustomer.size} clientes`,
          allowedValue: 'Carga Exclusiva (1 cliente)',
          message: `Cliente exige carga exclusiva (não permite consolidação com outros clientes).`,
          customerCode: custCode,
          customerName: custName,
        })
      }

      // Máximo de pedidos por carga
      if (loadForm.maxOrdersPerLoad && custOrders.length > loadForm.maxOrdersPerLoad) {
        divergences.push({
          field: 'max_pedidos',
          level: ruleLevel === 'CRITICA' ? 'CRITICA' : 'ALERTA',
          plannedValue: custOrders.length,
          allowedValue: loadForm.maxOrdersPerLoad,
          message: `Quantidade de pedidos do cliente na carga (${custOrders.length}) excede o máximo permitido (${loadForm.maxOrdersPerLoad}).`,
          customerCode: custCode,
          customerName: custName,
        })
      }
    }

    // 2. Restrições de Tipo de Veículo
    const vehRules = profile.vehicle_restrictions_json
    if (vehicle && vehRules) {
      const vTypeNorm = normalizeString(vehicle.type || (vehicle as any).vehicle_type_cached || '')

      // Tipos proibidos
      if (vehRules.forbiddenVehicleTypes && vehRules.forbiddenVehicleTypes.length > 0) {
        const isForbidden = vehRules.forbiddenVehicleTypes.some((fb) => {
          const fbNorm = normalizeString(fb)
          return vTypeNorm.includes(fbNorm) || fbNorm.includes(vTypeNorm)
        })

        if (isForbidden) {
          divergences.push({
            field: 'tipo_veiculo_proibido',
            level: ruleLevel,
            plannedValue: vehicle.type || 'Veículo atual',
            allowedValue: `Não permitido: ${vehRules.forbiddenVehicleTypes.join(', ')}`,
            message: `Tipo de veículo planejado (${vehicle.type}) é expressamente proibido no cliente.`,
            customerCode: custCode,
            customerName: custName,
          })
        }
      }

      // Tipos permitidos (whitelist explícita)
      if (vehRules.allowedVehicleTypes && vehRules.allowedVehicleTypes.length > 0) {
        const isAllowed = vehRules.allowedVehicleTypes.some((al) => {
          const alNorm = normalizeString(al)
          return vTypeNorm.includes(alNorm) || alNorm.includes(vTypeNorm)
        })

        if (!isAllowed) {
          divergences.push({
            field: 'tipo_veiculo_permitido',
            level: ruleLevel,
            plannedValue: vehicle.type || 'Veículo atual',
            allowedValue: vehRules.allowedVehicleTypes.join(' ou '),
            message: `Veículo planejado (${vehicle.type}) não consta na lista de tipos aceitos pelo cliente (${vehRules.allowedVehicleTypes.join(', ')}).`,
            customerCode: custCode,
            customerName: custName,
          })
        }
      }

      // Veículo obrigatório específico
      if (vehRules.mandatoryVehicleType && vehRules.mandatoryVehicleType.trim().length > 0) {
        const mandNorm = normalizeString(vehRules.mandatoryVehicleType)
        if (!vTypeNorm.includes(mandNorm) && !mandNorm.includes(vTypeNorm)) {
          divergences.push({
            field: 'veiculo_obrigatorio',
            level: ruleLevel,
            plannedValue: vehicle.type || 'Veículo atual',
            allowedValue: vehRules.mandatoryVehicleType,
            message: `Cliente exige estritamente o veículo tipo "${vehRules.mandatoryVehicleType}".`,
            customerCode: custCode,
            customerName: custName,
          })
        }
      }
    }

    // 3. Restrições de Material e Comprimentos
    const matRules = profile.material_restrictions_json
    if (matRules) {
      custOrders.forEach((ord) => {
        const lengthM = extractMaterialLengthMeters(ord.material_description || ord.material || '')
        if (lengthM !== null) {
          // Comprimento máximo aceito
          if (matRules.maxLengthM && lengthM > matRules.maxLengthM) {
            divergences.push({
              field: 'comprimento_maximo',
              level: ruleLevel,
              plannedValue: `${lengthM} m (${ord.material_description || ord.material})`,
              allowedValue: `${matRules.maxLengthM} m`,
              message: `Material de comprimento ${lengthM}m excede o comprimento máximo permitido no cliente de ${matRules.maxLengthM}m.`,
              customerCode: custCode,
              customerName: custName,
            })
          }

          // Comprimentos proibidos
          if (matRules.forbiddenLengthsM && matRules.forbiddenLengthsM.includes(lengthM)) {
            divergences.push({
              field: 'comprimento_proibido',
              level: ruleLevel,
              plannedValue: `${lengthM} m`,
              allowedValue: `Proibidos: ${matRules.forbiddenLengthsM.join('m, ')}m`,
              message: `Material de comprimento ${lengthM}m é proibido para este cliente.`,
              customerCode: custCode,
              customerName: custName,
            })
          }
        }
      })
    }

    // 4. Restrições de Agendamento
    const schedRules = profile.scheduling_restrictions_json
    if (schedRules?.requiresScheduling) {
      if (schedRules.mandatoryBeforeDeparture) {
        informativeNotes.push(
          `Cliente ${custCode} exige agendamento obrigatório ANTES da saída do veículo da fábrica CIAFAL (Canal: ${schedRules.communicationChannel || 'Portal/WhatsApp'}, Contato: ${schedRules.contactName || 'Recebimento'}).`,
        )
      } else {
        informativeNotes.push(
          `Cliente ${custCode} requer agendamento de janela de entrega (Antecedência: ${schedRules.minAdvanceNoticeHours || 24}h).`,
        )
      }
    }

    // 5. Restrições de Descarga
    const dischRules = profile.discharge_restrictions_json
    if (dischRules?.dischargeType) {
      informativeNotes.push(
        `Cliente ${custCode} utiliza descarga por ${dischRules.dischargeType} (Capacidade máx: ${dischRules.equipmentCapacityTons || 10} t).`,
      )
    }
  })

  // Categorização das Divergências por Nível de Criticidade
  const criticalDivergences = divergences.filter((d) => d.level === 'CRITICA')
  const restrictiveDivergences = divergences.filter((d) => d.level === 'RESTRITIVA')
  const warningDivergences = divergences.filter((d) => d.level === 'ALERTA')

  const hasCriticalBlock = criticalDivergences.length > 0
  const hasRestrictiveBlock = restrictiveDivergences.length > 0
  const hasWarning = warningDivergences.length > 0

  let decision: 'COMPATIVEL' | 'ALERTA' | 'REJEITADA' = 'COMPATIVEL'
  if (hasCriticalBlock || hasRestrictiveBlock) {
    decision = 'REJEITADA'
  } else if (hasWarning) {
    decision = 'ALERTA'
  }

  return {
    isCompatible: decision !== 'REJEITADA',
    hasCriticalBlock,
    hasRestrictiveBlock,
    hasWarning,
    decision,
    divergences,
    criticalDivergences,
    restrictiveDivergences,
    warningDivergences,
    informativeNotes,
    applicableRulesSummary,
  }
}
