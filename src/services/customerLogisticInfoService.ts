/**
 * customerLogisticInfoService.ts
 *
 * Serviço de Integração e Cache Local HUB para Informações Logísticas de Clientes (SAP ECC RFC).
 * Fornece dados em lote com cache em memória para o Planejador de Cargas, Mesa de Fretes, Torre e Fred.
 * Política de Alta Disponibilidade: Em caso de falha de conexão com SAP ECC, os dados do cache
 * NUNCA são apagados; o sistema preserva o último estado válido homologado.
 */

import { pb } from '@/lib/pocketbase/client'
import {
  CustomerLogisticInfoEntity,
  evaluateCustomerLogisticRules,
  CustomerValidationResult,
} from '@/domain/customerLogisticInfoEngine'
import { SapSalesOrderEntity, VehicleEntity } from '@/domain/rules'

export interface CustomerFilterParams {
  searchTerm?: string
  customerCode?: string
  cnpj?: string
  city?: string
  uf?: string
  itineraryCode?: string
  restrictionLevel?: string
  status?: 'ativo' | 'inativo' | 'todos'
  requiresScheduling?: boolean
  vehicleType?: string
}

export interface SyncCustomerInfoResult {
  success: boolean
  correlationId?: string
  rfc?: string
  table?: string
  lastSyncDate: string
  recordsCount: number
  message: string
  isFallback?: boolean
}

// Cache local HUB em memória para ultra-performance (zero latência no Planejador de Cargas)
let memoryCache: CustomerLogisticInfoEntity[] = []
let lastCacheFetchTime = 0
const CACHE_TTL_MS = 60 * 1000 // 1 minuto de cache em memória antes de revalidar com o PB

export const customerLogisticInfoService = {
  /**
   * Obtém lista de parâmetros de configuração do SAP
   */
  async getSapConfig(): Promise<{ rfc: string; table: string; lastSync: string }> {
    try {
      const records = await pb.collection('system_parameters').getFullList({
        filter: "key ~ 'SAP_CUSTOMER_INFO'",
      })
      const rfc =
        records.find((r) => r.key === 'SAP_CUSTOMER_INFO_RFC')?.value || 'Z_RFC_TMS_INFO_CLIENTE'
      const table =
        records.find((r) => r.key === 'SAP_CUSTOMER_INFO_TABLE')?.value || 'ZTMS_INFO_CLIENTE'
      const lastSync =
        records.find((r) => r.key === 'SAP_CUSTOMER_INFO_LAST_SYNC')?.value ||
        new Date().toISOString()
      return { rfc, table, lastSync }
    } catch (_) {
      return {
        rfc: 'Z_RFC_TMS_INFO_CLIENTE',
        table: 'ZTMS_INFO_CLIENTE',
        lastSync: new Date().toISOString(),
      }
    }
  },

  /**
   * Busca todas as informações logísticas ativas do cache local HUB
   */
  async getAllCustomers(forceRefresh = false): Promise<CustomerLogisticInfoEntity[]> {
    const now = Date.now()
    if (!forceRefresh && memoryCache.length > 0 && now - lastCacheFetchTime < CACHE_TTL_MS) {
      return memoryCache
    }

    try {
      const records = await pb.collection('sap_customer_logistic_info').getFullList({
        sort: 'customer_name',
      })

      const mapped: CustomerLogisticInfoEntity[] = records.map((r: any) => ({
        id: r.id,
        technical_key: r.technical_key,
        customer_code: r.customer_code,
        customer_name: r.customer_name,
        ship_to_code: r.ship_to_code,
        ship_to_name: r.ship_to_name,
        cnpj: r.cnpj,
        plant_code: r.plant_code,
        sales_org: r.sales_org,
        distribution_channel: r.distribution_channel,
        sector: r.sector,
        delivery_address: r.delivery_address,
        delivery_city: r.delivery_city,
        delivery_uf: r.delivery_uf,
        delivery_cep: r.delivery_cep,
        itinerary_code: r.itinerary_code,
        logistic_region: r.logistic_region,
        highest_restriction_level: r.highest_restriction_level || 'INFORMATIVA',
        is_active: r.is_active !== false,
        valid_from: r.valid_from,
        valid_to: r.valid_to,
        sap_user: r.sap_user,
        origin_rfc: r.origin_rfc,
        origin_table: r.origin_table,
        last_sync_date: r.last_sync_date,
        observations: r.observations,
        material_restrictions_json: r.material_restrictions_json,
        load_formation_restrictions_json: r.load_formation_restrictions_json,
        vehicle_restrictions_json: r.vehicle_restrictions_json,
        access_restrictions_json: r.access_restrictions_json,
        discharge_restrictions_json: r.discharge_restrictions_json,
        scheduling_restrictions_json: r.scheduling_restrictions_json,
        documentation_restrictions_json: r.documentation_restrictions_json,
        safety_driver_restrictions_json: r.safety_driver_restrictions_json,
        history_changelog_json: r.history_changelog_json,
        created: r.created,
        updated: r.updated,
      }))

      if (mapped.length > 0) {
        memoryCache = mapped
        lastCacheFetchTime = now
      }

      return mapped.length > 0 ? mapped : memoryCache
    } catch (err) {
      console.warn(
        'Aviso: Falha ao carregar sap_customer_logistic_info do PocketBase. Mantendo cache anterior seguro:',
        err,
      )
      return memoryCache
    }
  },

  /**
   * Busca um cliente/recebedor específico por código ou chave técnica
   */
  async getCustomerByCode(code: string): Promise<CustomerLogisticInfoEntity | null> {
    const all = await this.getAllCustomers()
    return (
      all.find(
        (c) => c.customer_code === code || c.ship_to_code === code || c.technical_key === code,
      ) || null
    )
  },

  /**
   * Valida restrições logísticas de clientes para uma carga planejada
   */
  async validateLoadRestrictions(params: {
    orders: SapSalesOrderEntity[]
    vehicle: VehicleEntity | null
    planningDate?: string
  }): Promise<CustomerValidationResult> {
    const allProfiles = await this.getAllCustomers()
    return evaluateCustomerLogisticRules({
      orders: params.orders,
      vehicle: params.vehicle,
      customerProfiles: allProfiles,
      planningDate: params.planningDate,
    })
  },

  /**
   * Obtém veículos estritamente elegíveis para um conjunto de clientes (consumido pela Mesa de Fretes)
   */
  async getEligibleVehiclesForCustomers(customerCodes: string[]): Promise<{
    allowedVehicleTypes: string[]
    forbiddenVehicleTypes: string[]
    mandatoryVehicleType?: string
    maxGrossWeightTons?: number
  }> {
    const all = await this.getAllCustomers()
    const matching = all.filter(
      (c) => customerCodes.includes(c.customer_code) || customerCodes.includes(c.ship_to_code),
    )

    const forbidden = new Set<string>()
    let allowed: string[] | null = null
    let mandatory: string | undefined = undefined
    let minPbt: number | undefined = undefined

    for (const c of matching) {
      const v = c.vehicle_restrictions_json
      if (!v) continue
      if (v.forbiddenVehicleTypes) {
        v.forbiddenVehicleTypes.forEach((t) => forbidden.add(t))
      }
      if (v.mandatoryVehicleType) {
        mandatory = v.mandatoryVehicleType
      }
      if (v.allowedVehicleTypes && v.allowedVehicleTypes.length > 0) {
        if (allowed === null) {
          allowed = [...v.allowedVehicleTypes]
        } else {
          allowed = allowed.filter((t) => v.allowedVehicleTypes?.includes(t))
        }
      }
      if (v.maxGrossWeightTons) {
        minPbt = minPbt ? Math.min(minPbt, v.maxGrossWeightTons) : v.maxGrossWeightTons
      }
    }

    return {
      allowedVehicleTypes: allowed || [],
      forbiddenVehicleTypes: Array.from(forbidden),
      mandatoryVehicleType: mandatory,
      maxGrossWeightTons: minPbt,
    }
  },

  /**
   * Consulta orientações operacionais para a Torre de Controle e Assistente Fred IA
   */
  async getOperationalInstructionsForCustomer(customerCode: string): Promise<{
    customerName: string
    address: string
    accessInstructions?: string
    restrictedStreet?: string
    receivingWindow?: string
    requiresScheduling: boolean
    contactName?: string
    contactPhone?: string
    contactWhatsapp?: string
    dischargeType?: string
    requiredDocuments?: string[]
    safetyRules?: string
  } | null> {
    const cust = await this.getCustomerByCode(customerCode)
    if (!cust) return null

    const acc = cust.access_restrictions_json
    const sch = cust.scheduling_restrictions_json
    const dis = cust.discharge_restrictions_json
    const doc = cust.documentation_restrictions_json
    const sft = cust.safety_driver_restrictions_json

    return {
      customerName: cust.customer_name,
      address: `${cust.delivery_address || ''} - ${cust.delivery_city}/${cust.delivery_uf}`,
      accessInstructions: acc?.accessInstructions,
      restrictedStreet: acc?.hasRestrictedStreet ? acc?.restrictedStreetDetails : undefined,
      receivingWindow: sch
        ? `${sch.receivingWindowStart || '08:00'} às ${sch.receivingWindowEnd || '17:00'}`
        : undefined,
      requiresScheduling: !!sch?.requiresScheduling,
      contactName: sch?.contactName,
      contactPhone: sch?.contactPhone,
      contactWhatsapp: sch?.contactWhatsapp,
      dischargeType: dis?.dischargeType,
      requiredDocuments: doc?.requiredDocuments,
      safetyRules: sft?.internalRules,
    }
  },

  /**
   * Aciona a sincronização em lote SAP ECC via RFC
   */
  async triggerSapSync(): Promise<SyncCustomerInfoResult> {
    try {
      const res = await pb.send('/backend/v1/sap/sync-customer-info', {
        method: 'POST',
      })

      // Atualiza o cache imediatamente
      await this.getAllCustomers(true)

      return {
        success: true,
        correlationId: res.correlationId,
        rfc: res.rfc,
        table: res.table,
        lastSyncDate: res.execution?.finishedAt || new Date().toISOString(),
        recordsCount: res.execution?.recordsUpdated || memoryCache.length,
        message: res.message || 'Sincronização SAP RFC concluída com sucesso.',
      }
    } catch (err: any) {
      console.error('Erro na sincronização SAP RFC de clientes:', err)
      // Em falha RFC, NÃO apaga a última informação válida
      return {
        success: false,
        lastSyncDate: new Date().toISOString(),
        recordsCount: memoryCache.length,
        isFallback: true,
        message:
          'Não foi possível atualizar as informações logísticas no SAP. Os últimos dados sincronizados continuam disponíveis.',
      }
    }
  },

  /**
   * Registra justificativa de override quando um gestor decide deliberadamente aprovar carga com restrição crítica
   */
  async recordRestrictionOverrideAudit(payload: {
    cargoId: string
    customerCode: string
    restrictionField: string
    plannedValue: string | number
    allowedValue: string | number
    justification: string
    userEmail: string
    userName: string
    userRole: string
  }): Promise<boolean> {
    try {
      await pb.collection('audit_logs').create({
        user_email: payload.userEmail,
        user_name: payload.userName,
        user_role: payload.userRole,
        action: 'CUSTOMER_RESTRICTION_OVERRIDE_APPROVED',
        resource: 'sap_customer_logistic_info',
        resource_id: payload.customerCode,
        correlation_id: `OVR-${Date.now().toString(36).toUpperCase()}`,
        reason: payload.justification,
        payload: {
          cargo_id: payload.cargoId,
          restriction_field: payload.restrictionField,
          planned_value: payload.plannedValue,
          allowed_value: payload.allowedValue,
          justification: payload.justification,
          timestamp: new Date().toISOString(),
        },
      })
      return true
    } catch (err) {
      console.error('Erro ao gravar log de auditoria de override:', err)
      return false
    }
  },
}
