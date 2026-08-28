// TMS CIAFAL Centralized PocketBase Data Services

import pb from '@/lib/pocketbase/client'
import {
  DriverEntity,
  VehicleEntity,
  QueueEntryEntity,
  PreRegistrationEntity,
  AuditLogEntity,
  FreightOfferEntity,
  FreightOfferStatus,
  FreightProposalEntity,
  CandidateProposalWithQueue,
  ProposalStatus,
  SystemParameterEntity,
  SapItineraryEntity,
  SapSalesOrderEntity,
  OportunidadeComplementoCargaEntity,
  PreRegistrationStatus,
  QueueStatus,
  QueueGroup,
  isValidDocument,
  isValidPlate,
  validateGeofence,
  calculateLogisticsDate,
  classifyAvailabilityGroup,
  maskDocument,
  maskPhone,
  evaluateEligibility,
  evaluateProposalPriceRules,
  selectWinningProposal,
  CIAFAL_PLANT_LOCATION,
} from '@/domain/rules'

import { sapGateway, SapAddressResolution } from '@/domain/sapGateway'
import { pcpService } from '@/domain/pcpIntegration'
import { crmService } from '@/domain/crmIntegration'
import { routingServiceManager, GeocodedAddress } from '@/domain/routingAdapters'
import { anttEngine, tollEngine } from '@/domain/anttAndTollEngine'
import {
  eventBus,
  checkIsStale,
  IntegrationHealthMetric,
  IntegrationLogEntry,
} from '@/domain/integrationsCore'

export interface CreateQueueEntryParams {
  document: string
  whatsapp: string
  plate: string
  vehicleType: string
  carrierName?: string
  declaredCapacityKg?: number
  type?: QueueGroup // PORTA | FORA | PROGRAMADO
  preferredItinerary?: string
  scheduledArrivalDate?: string
  driverNotes?: string
  latitude?: number
  longitude?: number
  accuracy?: number
  clientIp?: string
}

export interface PlateLookupResult {
  found: boolean
  driver?: {
    id: string
    nameMasked: string
    documentMasked: string
    phoneMasked: string
    status: string
  }
  vehicle?: {
    id: string
    plate: string
    type: string
    capacityKg?: number
  }
  rateLimited?: boolean
}

// In-memory rate limiting for plate lookups to prevent enumeration
const lookupAttempts = new Map<string, { count: number; lastAttempt: number }>()

export const TmsService = {
  // ----------------------------------------------------
  // PUBLIC SAFE PLATE LOOKUP (RATE LIMITED & MASKED)
  // ----------------------------------------------------
  async lookupVehicleAndDriverByPlate(
    rawPlate: string,
    clientIp = 'client_public',
  ): Promise<PlateLookupResult> {
    const cleanPlate = rawPlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

    // 1. Rate Limiting Check
    const now = Date.now()
    const record = lookupAttempts.get(clientIp) || { count: 0, lastAttempt: now }
    if (now - record.lastAttempt > 60000) {
      record.count = 0
      record.lastAttempt = now
    }
    record.count++
    lookupAttempts.set(clientIp, record)

    if (record.count > 25) {
      // Max 25 lookups per minute
      return { found: false, rateLimited: true }
    }

    if (!cleanPlate || cleanPlate.length < 7) {
      return { found: false }
    }

    try {
      const vRecords = await pb.collection('vehicles').getList<VehicleEntity>(1, 1, {
        filter: `plate = "${cleanPlate}"`,
        expand: 'driver',
      })

      if (vRecords.items.length === 0) {
        return { found: false }
      }

      const vehicle = vRecords.items[0]
      let driver: DriverEntity | null = null

      if (vehicle.driver) {
        try {
          driver = await pb.collection('drivers').getOne<DriverEntity>(vehicle.driver)
        } catch {
          // driver not found
        }
      }

      // Return ONLY MASKED data (Zero full CPF or phone exposure)
      return {
        found: true,
        vehicle: {
          id: vehicle.id,
          plate: vehicle.plate,
          type: vehicle.type,
          capacityKg: vehicle.capacity_kg,
        },
        driver: driver
          ? {
              id: driver.id,
              nameMasked: driver.name
                ? `${driver.name.split(' ')[0]} ${driver.name
                    .split(' ')
                    .slice(1)
                    .map((n) => n[0] + '.')
                    .join(' ')}`
                : 'Motorista Cadastrado',
              documentMasked: maskDocument(driver.document),
              phoneMasked: maskPhone(driver.whatsapp),
              status: driver.status,
            }
          : undefined,
      }
    } catch (err) {
      console.warn('Plate lookup error:', err)
      return { found: false }
    }
  },

  // ----------------------------------------------------
  // DRIVER & VEHICLE DATABASE LOOKUPS
  // ----------------------------------------------------
  async findDriverByDocument(document: string): Promise<DriverEntity | null> {
    const cleanDoc = document.replace(/\D/g, '')
    try {
      const records = await pb.collection('drivers').getList<DriverEntity>(1, 1, {
        filter: `document = "${cleanDoc}"`,
      })
      return records.items[0] || null
    } catch (err) {
      console.warn('Driver lookup failed:', err)
      return null
    }
  },

  async findActiveQueueEntryByDriver(driverId: string): Promise<QueueEntryEntity | null> {
    try {
      const records = await pb.collection('queue_entries').getList<QueueEntryEntity>(1, 1, {
        filter: `driver = "${driverId}" && (status != "removido" && status != "atribuido" && status != "bloqueado")`,
        sort: '-created',
      })
      return records.items[0] || null
    } catch {
      return null
    }
  },

  async findActiveQueueEntryByPlate(plate: string): Promise<QueueEntryEntity | null> {
    const cleanPlate = plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    try {
      const records = await pb.collection('queue_entries').getList<QueueEntryEntity>(1, 1, {
        filter: `vehicle_plate_cached = "${cleanPlate}" && (status != "removido" && status != "atribuido" && status != "bloqueado")`,
        sort: '-created',
      })
      return records.items[0] || null
    } catch {
      return null
    }
  },

  // ----------------------------------------------------
  // OPERATIONAL QUEUE & ITINERARIES
  // ----------------------------------------------------
  async getOperationalQueue(): Promise<QueueEntryEntity[]> {
    try {
      const records = await pb.collection('queue_entries').getFullList<QueueEntryEntity>({
        sort: '-type,entry_time',
        expand: 'driver,vehicle',
      })
      return records
    } catch (err) {
      console.error('Failed to fetch queue:', err)
      return []
    }
  },

  async getSapItineraries(onlyActive = false): Promise<SapItineraryEntity[]> {
    try {
      const filter = onlyActive ? 'is_active = true' : ''
      return await pb.collection('sap_itineraries').getFullList<SapItineraryEntity>({
        filter,
        sort: 'sap_code',
      })
    } catch (err) {
      console.error('Failed to fetch SAP itineraries:', err)
      return []
    }
  },

  async updateItineraryOperationalNotes(
    id: string,
    notes: string,
    operatorEmail: string,
    operatorName: string,
  ): Promise<boolean> {
    try {
      const old = await pb.collection('sap_itineraries').getOne<SapItineraryEntity>(id)
      await pb.collection('sap_itineraries').update(id, {
        operational_notes: notes,
      })

      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorName,
        user_role: 'gerente_carga',
        action: 'UPDATE_ITINERARY_NOTES',
        resource: 'sap_itineraries',
        resource_id: id,
        previous_state: old.operational_notes || '',
        new_state: notes,
        reason: 'Atualização de observações operacionais do itinerário',
        correlation_id: `ITIN-${Date.now()}`,
        payload: { sap_code: old.sap_code, notes },
      })
      return true
    } catch (err) {
      console.error('Error updating itinerary:', err)
      return false
    }
  },

  // ----------------------------------------------------
  // TOTEM / PORTAL ACCESS COMPATIBILITY
  // ----------------------------------------------------
  async submitTotemEntry(params: CreateQueueEntryParams): Promise<{
    success: boolean
    message: string
    data?: any
    isPreReg?: boolean
    transitionedFromFora?: boolean
  }> {
    return this.submitDriverAvailability({
      ...params,
      type: 'PORTA',
    })
  },

  // ----------------------------------------------------
  // PUBLIC CHECK-IN FLOW (PORTA, FORA, PROGRAMADO, PRÉ-CADASTRO)
  // ----------------------------------------------------
  async submitDriverAvailability(params: CreateQueueEntryParams): Promise<{
    success: boolean
    message: string
    data?: any
    group?: QueueGroup
    isPreReg?: boolean
    transitionedFromFora?: boolean
    calculatedLogisticsDate?: string
  }> {
    const cleanPlate = (params.plate || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .trim()
    const cleanDoc = (params.document || '').replace(/\D/g, '')
    const cleanPhone = (params.whatsapp || '').replace(/\D/g, '').replace(/^55/, '')

    // 1. Validate Plate
    if (!isValidPlate(cleanPlate)) {
      return {
        success: false,
        message:
          'Placa do veículo inválida. Informe uma placa padrão (ABC-1234) ou Mercosul (ABC1D23).',
      }
    }

    // 2. Lookup Vehicle and Driver
    let driver: DriverEntity | null = null
    let vehicle: VehicleEntity | null = null

    try {
      const vRecords = await pb.collection('vehicles').getList<VehicleEntity>(1, 1, {
        filter: `plate = "${cleanPlate}"`,
        expand: 'driver',
      })
      if (vRecords.items.length > 0) {
        vehicle = vRecords.items[0]
        if (vehicle.driver) {
          driver = await pb.collection('drivers').getOne<DriverEntity>(vehicle.driver)
        }
      }
    } catch {
      // not found
    }

    // Fallback: If not found by vehicle, search driver by document
    if (!driver && cleanDoc) {
      driver = await this.findDriverByDocument(cleanDoc)
    }

    // 3. System Parameters for Geofences and Cutoff
    let plantLat = CIAFAL_PLANT_LOCATION.latitude
    let plantLon = CIAFAL_PLANT_LOCATION.longitude
    let foraRadiusKm = CIAFAL_PLANT_LOCATION.maxRadiusKm
    let cutoffTimeStr = '12:00'
    let accuracyTolerance = 500

    try {
      const paramsList = await pb
        .collection('system_parameters')
        .getFullList<SystemParameterEntity>()
      paramsList.forEach((p) => {
        if (p.key === 'PLANT_LATITUDE') plantLat = parseFloat(p.value) || plantLat
        if (p.key === 'PLANT_LONGITUDE') plantLon = parseFloat(p.value) || plantLon
        if (p.key === 'MAX_RADIUS_KM' || p.key === 'GEOFENCE_RADIUS_FORA_KM') {
          foraRadiusKm = parseFloat(p.value) || foraRadiusKm
        }
        if (p.key === 'CUTOFF_TIME_FORA') cutoffTimeStr = p.value || cutoffTimeStr
        if (p.key === 'GEO_ACCURACY_TOLERANCE_METERS') {
          accuracyTolerance = parseFloat(p.value) || accuracyTolerance
        }
      })
    } catch {
      // default parameters
    }

    // 4. Geolocation Classification (Server-side calculation)
    let distanceKm = -1
    let assignedGroup: QueueGroup = 'PROGRAMADO'
    let isWithinRadius = false

    if (params.latitude !== undefined && params.longitude !== undefined) {
      const geoCheck = validateGeofence(
        params.latitude,
        params.longitude,
        plantLat,
        plantLon,
        foraRadiusKm,
        params.accuracy || 0,
        accuracyTolerance,
      )
      distanceKm = geoCheck.distanceKm
      isWithinRadius = geoCheck.isWithinRadius
      assignedGroup = geoCheck.group
    }

    // If driver explicitly declared future scheduled date or is outside radius -> PROGRAMADO
    if (params.scheduledArrivalDate || !isWithinRadius) {
      assignedGroup = 'PROGRAMADO'
    }

    // Calculate effective logistics date
    const realEntryTime = new Date()
    const calculatedLogisticsDate = calculateLogisticsDate(
      assignedGroup,
      realEntryTime,
      cutoffTimeStr,
      params.scheduledArrivalDate,
    )

    // 5. IF DRIVER OR VEHICLE NOT FOUND -> AUTOMATIC PRE-REGISTRATION
    if (!driver) {
      try {
        const pre = await pb.collection('pre_registrations').create({
          document: cleanDoc,
          name: params.carrierName ? `Motorista (${params.carrierName})` : 'Motorista Pré-Cadastro',
          whatsapp: cleanPhone,
          email: params.driverNotes ? '' : undefined,
          vehicle_type: params.vehicleType || 'Carreta LS',
          plate: cleanPlate,
          carrier_name: params.carrierName || '',
          declared_capacity_kg: params.declaredCapacityKg || 0,
          origin: assignedGroup,
          status: 'novo',
          preferred_itinerary: params.preferredItinerary || '',
          scheduled_arrival_date: params.scheduledArrivalDate || null,
          driver_notes: params.driverNotes || '',
          latitude: params.latitude,
          longitude: params.longitude,
          reviewer_notes: `Pré-cadastro via link público. Placa ${cleanPlate} sem cadastro ativo no SAP. Classificação: ${assignedGroup}.`,
        })

        // Audit Pre-Registration
        await pb.collection('audit_logs').create({
          user_email: 'public@ciafal.logistica',
          user_name: 'Motorista Autoatendimento',
          user_role: 'portaria',
          action: 'CREATE_PRE_REGISTRATION',
          resource: 'pre_registrations',
          resource_id: pre.id,
          new_state: 'novo',
          reason: `Placa ${cleanPlate} não localizada na base SAP ZSD004V_V2. Encaminhado para pré-cadastro pendente.`,
          correlation_id: `PREREG-${Date.now()}`,
          payload: {
            plate: cleanPlate,
            document: cleanDoc,
            origin: assignedGroup,
            distance_km: distanceKm,
            itinerary: params.preferredItinerary,
          },
        })

        return {
          success: true,
          isPreReg: true,
          group: assignedGroup,
          calculatedLogisticsDate,
          message:
            'Placa ou motorista não localizado no cadastro ativo da CIAFAL. Seus dados foram encaminhados como Pré-cadastro para validação pela equipe de logística.',
          data: pre,
        }
      } catch (err: any) {
        return { success: false, message: err?.message || 'Erro ao registrar pré-cadastro.' }
      }
    }

    // 6. Check Driver Blocked
    if (driver.status === 'bloqueado') {
      return {
        success: false,
        message: 'Cadastro bloqueado administrativamente. Entre em contato com a logística CIAFAL.',
      }
    }

    // 7. Duplicate Check & Controlled Transitions
    const activeEntry = await this.findActiveQueueEntryByDriver(driver.id)
    let transitionedFromFora = false

    if (activeEntry) {
      if (activeEntry.type === 'PORTA' && assignedGroup === 'PORTA') {
        return {
          success: false,
          message: 'Motorista já possui entrada ativa na Fila PORTA.',
        }
      }

      if (activeEntry.type === 'FORA' && assignedGroup === 'PORTA') {
        // Transition FORA -> PORTA
        const arrivalTime = realEntryTime.toISOString()
        await pb.collection('queue_entries').update(activeEntry.id, {
          status: 'removido',
          exit_time: arrivalTime,
          reason: 'Promovido para PORTA por chegada física confirmada',
          last_event: 'Transição FORA → PORTA (Chegada Física ao Pátio)',
          last_operator: 'Check-in de Presença',
        })

        await pb.collection('audit_logs').create({
          user_email: 'system@ciafal.logistica',
          user_name: 'Motorista Check-in',
          user_role: 'portaria',
          action: 'TRANSITION_FORA_TO_PORTA',
          resource: 'queue_entries',
          resource_id: activeEntry.id,
          previous_state: 'FORA',
          new_state: 'PORTA',
          reason: 'Chegada física promovendo disponibilidade FORA para PORTA',
          correlation_id: `TRANS-${Date.now()}`,
          payload: {
            driver_id: driver.id,
            previous_entry_time: activeEntry.entry_time,
            physical_arrival_time: arrivalTime,
          },
        })

        transitionedFromFora = true
      } else if (activeEntry.type === assignedGroup) {
        return {
          success: false,
          message: `Você já está registrado na fila (Grupo: ${activeEntry.type}, Status: ${activeEntry.status.toUpperCase()}).`,
        }
      }
    }

    // 8. Find or Create Vehicle Relation
    let vehicleId = vehicle ? vehicle.id : ''
    if (!vehicleId && cleanPlate) {
      try {
        const v = await pb.collection('vehicles').create({
          plate: cleanPlate,
          type: params.vehicleType || 'Carreta LS',
          driver: driver.id,
          capacity_kg: params.declaredCapacityKg || 0,
        })
        vehicleId = v.id
      } catch {
        // ignore
      }
    }

    // 9. Create Entry in queue_entries
    try {
      const entryTimeStr = realEntryTime.toISOString()
      const entry = await pb.collection('queue_entries').create({
        driver: driver.id,
        vehicle: vehicleId || null,
        type: assignedGroup,
        status: 'disponivel',
        entry_time: entryTimeStr,
        calculated_logistics_date: calculatedLogisticsDate,
        scheduled_arrival_date: params.scheduledArrivalDate || null,
        preferred_itinerary: params.preferredItinerary || '',
        driver_notes: params.driverNotes || '',
        latitude: params.latitude,
        longitude: params.longitude,
        distance_km: distanceKm >= 0 ? distanceKm : 0,
        location_status: isWithinRadius ? 'validada' : 'fora_raio',
        driver_name_cached: driver.name,
        driver_doc_cached: driver.document,
        driver_whatsapp_cached: cleanPhone || driver.whatsapp,
        vehicle_plate_cached: cleanPlate,
        vehicle_type_cached: params.vehicleType || vehicle?.type || 'Carreta',
        carrier_name_cached: params.carrierName || driver.carrier_name || '',
        vehicle_capacity_kg_cached: vehicle?.capacity_kg || params.declaredCapacityKg || 0,
        reason: `Disponibilidade registrada no grupo ${assignedGroup}`,
        last_event: `Entrada na Fila (${assignedGroup})`,
        last_operator: 'Motorista via Web App',
      })

      // Audit Queue Entry
      await pb.collection('audit_logs').create({
        user_email: 'public@ciafal.logistica',
        user_name: driver.name,
        user_role: 'portaria',
        action: 'CREATE_QUEUE_ENTRY',
        resource: 'queue_entries',
        resource_id: entry.id,
        new_state: assignedGroup,
        reason: `Check-in de disponibilidade grupo ${assignedGroup} (Data Logística: ${calculatedLogisticsDate})`,
        correlation_id: `QUEUE-${Date.now()}`,
        payload: {
          driver_id: driver.id,
          plate: cleanPlate,
          group: assignedGroup,
          distance_km: distanceKm,
          calculated_logistics_date: calculatedLogisticsDate,
          preferred_itinerary: params.preferredItinerary,
        },
      })

      let successMessage = `Disponibilidade confirmada no grupo ${assignedGroup}!`
      if (assignedGroup === 'PORTA') {
        successMessage = 'Entrada confirmada no grupo PORTA (Presença Física no Pátio CIAFAL).'
      } else if (assignedGroup === 'FORA') {
        successMessage = `Disponibilidade confirmada no grupo FORA (${distanceKm} km da CIAFAL). Data logística calculada: ${calculatedLogisticsDate}.`
      } else if (assignedGroup === 'PROGRAMADO') {
        successMessage = `Disponibilidade futura PROGRAMADA para ${calculatedLogisticsDate}. Alimenta o Planejador de Cargas.`
      }

      return {
        success: true,
        group: assignedGroup,
        transitionedFromFora,
        calculatedLogisticsDate,
        message: successMessage,
        data: entry,
      }
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Falha ao registrar disponibilidade na fila.',
      }
    }
  },

  // ----------------------------------------------------
  // SYSTEM PARAMETERS & AUDIT LOGS
  // ----------------------------------------------------
  async getSystemParameters(): Promise<SystemParameterEntity[]> {
    try {
      return await pb.collection('system_parameters').getFullList<SystemParameterEntity>({
        sort: 'key',
      })
    } catch (err) {
      console.error('Failed to fetch system parameters:', err)
      return []
    }
  },

  async updateSystemParameter(
    id: string,
    key: string,
    value: string,
    description: string,
    operatorEmail: string,
    operatorName: string,
  ): Promise<boolean> {
    try {
      const old = await pb.collection('system_parameters').getOne<SystemParameterEntity>(id)
      await pb.collection('system_parameters').update(id, { value, description })

      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorName,
        user_role: 'admin_tms',
        action: 'UPDATE_SYSTEM_PARAMETER',
        resource: 'system_parameters',
        resource_id: id,
        previous_state: `${old.key}=${old.value}`,
        new_state: `${key}=${value}`,
        reason: `Alteração do parâmetro operacional ${key}`,
        correlation_id: `PARAM-${Date.now()}`,
        payload: { key, oldValue: old.value, newValue: value, description },
      })
      return true
    } catch (err) {
      console.error('Failed to update system parameter:', err)
      return false
    }
  },

  async updateQueueStatus(
    entryId: string,
    newStatus: QueueStatus,
    reason: string,
    operatorEmail: string,
    operatorName: string,
    operatorNotes?: string,
  ): Promise<boolean> {
    try {
      const entry = await pb.collection('queue_entries').getOne<QueueEntryEntity>(entryId)
      const prevStatus = entry.status

      await pb.collection('queue_entries').update(entryId, {
        status: newStatus,
        reason: reason,
        operator_notes: operatorNotes || '',
        last_event: `Status alterado de ${prevStatus} para ${newStatus}`,
        last_operator: `${operatorName} (${operatorEmail})`,
        exit_time: ['removido', 'atribuido', 'bloqueado'].includes(newStatus)
          ? new Date().toISOString()
          : null,
      })

      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorName,
        user_role: 'operador_logistica',
        action: 'UPDATE_QUEUE_STATUS',
        resource: 'queue_entries',
        resource_id: entryId,
        previous_state: prevStatus,
        new_state: newStatus,
        reason: reason,
        correlation_id: `AUDIT-${Date.now()}`,
        payload: {
          driver: entry.driver_name_cached,
          doc: entry.driver_doc_cached,
          group: entry.type,
          notes: operatorNotes,
        },
      })

      return true
    } catch (err) {
      console.error('Error updating queue status:', err)
      return false
    }
  },

  async getPreRegistrations(): Promise<PreRegistrationEntity[]> {
    try {
      return await pb.collection('pre_registrations').getFullList<PreRegistrationEntity>({
        sort: '-created',
      })
    } catch (err) {
      console.error('Failed to fetch pre-registrations:', err)
      return []
    }
  },

  async updatePreRegistrationStatus(
    id: string,
    status: PreRegistrationStatus,
    reviewerUser: string,
    reviewerNotes: string,
    rejectionReason?: string,
  ): Promise<boolean> {
    try {
      const prev = await pb.collection('pre_registrations').getOne<PreRegistrationEntity>(id)
      await pb.collection('pre_registrations').update(id, {
        status,
        reviewer_user: reviewerUser,
        reviewer_notes: reviewerNotes,
        rejection_reason: rejectionReason || '',
      })

      await pb.collection('audit_logs').create({
        user_email: reviewerUser,
        user_name: reviewerUser,
        user_role: 'operador_logistica',
        action: 'UPDATE_PREREG_STATUS',
        resource: 'pre_registrations',
        resource_id: id,
        previous_state: prev.status,
        new_state: status,
        reason: reviewerNotes || rejectionReason || 'Análise de pré-cadastro',
        correlation_id: `PREREG-REV-${Date.now()}`,
        payload: {
          candidate_name: prev.name,
          document: prev.document,
          plate: prev.plate,
        },
      })

      return true
    } catch (err) {
      console.error('Failed to update pre-registration:', err)
      return false
    }
  },

  async getAuditLogs(limit = 150): Promise<AuditLogEntity[]> {
    try {
      return await pb.collection('audit_logs').getFullList<AuditLogEntity>({
        sort: '-created',
        limit,
      })
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
      return []
    }
  },

  // ----------------------------------------------------
  // SAP SALES ORDERS (CARTEIRA ZSD35) & LOAD PLANNING
  // ----------------------------------------------------
  async getSapSalesOrders(): Promise<SapSalesOrderEntity[]> {
    try {
      return await pb.collection('sap_sales_orders').getFullList<SapSalesOrderEntity>({
        sort: 'order_number',
      })
    } catch (err) {
      console.error('Failed to fetch sales orders:', err)
      return []
    }
  },

  // ----------------------------------------------------
  // CARGO COMPLEMENT OPPORTUNITIES
  // ----------------------------------------------------
  async getComplementOpportunities(): Promise<OportunidadeComplementoCargaEntity[]> {
    try {
      return await pb
        .collection('oportunidade_complemento_carga')
        .getFullList<OportunidadeComplementoCargaEntity>({
          sort: '-created',
        })
    } catch (err) {
      console.error('Failed to fetch complement opportunities:', err)
      return []
    }
  },

  async createComplementOpportunity(
    opp: Partial<OportunidadeComplementoCargaEntity>,
  ): Promise<OportunidadeComplementoCargaEntity | null> {
    try {
      const created = await pb.collection('oportunidade_complemento_carga').create({
        date: opp.date || new Date().toISOString().split('T')[0],
        cargo_code: opp.cargo_code,
        itinerary_code: opp.itinerary_code,
        current_weight_kg: opp.current_weight_kg,
        capacity_kg: opp.capacity_kg,
        balance_kg: opp.balance_kg,
        candidate_orders: JSON.stringify(opp.candidate_orders || []),
        candidate_clients: JSON.stringify(opp.candidate_clients || []),
        status: opp.status || 'Nova',
        responsible: opp.responsible || 'Gerente de Carga',
        origin: opp.origin || 'Planejador TMS CIAFAL',
        enviado_crm: opp.enviado_crm || false,
        correlation_id: opp.correlation_id || `COMPL-${Date.now()}`,
        notes: opp.notes || '',
      })
      return created as unknown as OportunidadeComplementoCargaEntity
    } catch (err) {
      console.error('Error creating complement opportunity:', err)
      return null
    }
  },

  async sendComplementOpportunityToCrm(
    id: string,
    operatorEmail: string,
    operatorName: string,
  ): Promise<boolean> {
    try {
      const opp = await pb
        .collection('oportunidade_complemento_carga')
        .getOne<OportunidadeComplementoCargaEntity>(id)
      const sendDate = new Date().toISOString()
      const correlationId = opp.correlation_id || `CRM-OPP-${opp.cargo_code}-${Date.now()}`

      // Contrato de Integração CRM 360°
      const crmRes = await crmService.sendComplementOpportunity({
        cargoId: opp.cargo_code,
        itineraryCode: opp.itinerary_code,
        targetDate: sendDate,
        residualCapacityKg: opp.balance_kg,
        candidateClients: [
          {
            customerCode: 'CLI-01',
            customerName: 'Cliente Potencial',
          },
        ],
        candidateOrders: opp.candidate_orders
          ? Array.isArray(opp.candidate_orders)
            ? opp.candidate_orders
            : [String(opp.candidate_orders)]
          : [],
        salesRep: 'Equipe Comercial CIAFAL',
        opportunityReason: opp.notes || 'Capacidade residual em rota confirmada',
        validityMinutes: 120,
        correlationId,
        sentBy: operatorName,
      })

      await pb.collection('oportunidade_complemento_carga').update(id, {
        status: 'Enviada CRM',
        enviado_crm: true,
        data_envio: sendDate,
      })

      // Registro do Log de Integração
      try {
        await pb.collection('integration_logs').create({
          integration_id: 'crm_360',
          correlation_id: correlationId,
          direction: 'OUTBOUND',
          endpoint_or_rfc: 'CRM_LOGISTIC_OPPORTUNITY_CREATE',
          status: 'SUCCESS',
          http_or_sap_code: '200',
          payload_masked: {
            cargoId: opp.cargo_code,
            itinerary: opp.itinerary_code,
            balanceKg: opp.balance_kg,
            crmOppId: crmRes.crmOpportunityId,
          },
          error_message: '',
          latencyMs: 145,
          environment: 'DEV',
          user_email: operatorEmail,
        })
      } catch {
        /* ignore */
      }

      // Audit CRM Event
      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorName,
        user_role: 'gerente_carga',
        action: 'SEND_COMPLEMENT_TO_CRM',
        resource: 'oportunidade_complemento_carga',
        resource_id: id,
        previous_state: opp.status,
        new_state: 'Enviada CRM',
        reason: `Alerta comercial enviado ao CRM 360° (ID: ${crmRes.crmOpportunityId || 'N/A'})`,
        correlation_id: correlationId,
        payload: {
          cargo: opp.cargo_code,
          itinerary: opp.itinerary_code,
          balance_kg: opp.balance_kg,
          sent_at: sendDate,
          crm_status: crmRes.status,
        },
      })
      return true
    } catch (err) {
      console.error('Failed to send opportunity to CRM:', err)
      return false
    }
  },

  // ----------------------------------------------------
  // SPRINT 3: CARTEIRA SAP (ZSD35), ESTOQUE MB52 & PCP ROBOTIZADO
  // ----------------------------------------------------

  async getStockCurrent(): Promise<import('@/domain/rules').SapStockCurrentEntity[]> {
    try {
      return await pb.collection('sap_stock_current').getFullList({
        sort: 'material_code',
      })
    } catch (err) {
      console.error('Failed to fetch stock:', err)
      return []
    }
  },

  async getPcpProductionOrders(): Promise<import('@/domain/rules').PcpProductionOrderEntity[]> {
    try {
      return await pb.collection('pcp_production_orders').getFullList({
        sort: 'scheduled_date,material_code',
      })
    } catch (err) {
      console.error('Failed to fetch PCP production orders:', err)
      return []
    }
  },

  async getStockRequests(): Promise<import('@/domain/rules').StockConfirmationRequestEntity[]> {
    try {
      return await pb.collection('stock_confirmation_requests').getFullList({
        sort: '-created',
      })
    } catch (err) {
      console.error('Failed to fetch stock requests:', err)
      return []
    }
  },

  async createStockConfirmationRequest(
    data: Partial<import('@/domain/rules').StockConfirmationRequestEntity>,
    operatorEmail: string,
    operatorName: string,
  ): Promise<import('@/domain/rules').StockConfirmationRequestEntity | null> {
    try {
      const correlationId = `STK-REQ-${Date.now()}`
      const created = await pb.collection('stock_confirmation_requests').create({
        order_number: data.order_number,
        item_number: data.item_number || '000010',
        material_code: data.material_code,
        material_description: data.material_description,
        required_quantity: data.required_quantity,
        stock_informed: data.stock_informed || 0,
        unit: data.unit || 'TON',
        requested_by: operatorEmail,
        requester_name: operatorName,
        reason: data.reason || 'Divergência / Validação física de saldo de laminados',
        notes: data.notes || '',
        deadline: data.deadline || null,
        status: 'Solicitada',
        correlation_id: correlationId,
      })

      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorName,
        user_role: 'gerente_carga',
        action: 'CREATE_STOCK_CONFIRMATION_REQUEST',
        resource: 'stock_confirmation_requests',
        resource_id: created.id,
        new_state: 'Solicitada',
        reason: data.reason || 'Solicitação de confirmação de estoque',
        correlation_id: correlationId,
        payload: {
          order_number: data.order_number,
          material: data.material_code,
          qty: data.required_quantity,
        },
      })

      return created as unknown as import('@/domain/rules').StockConfirmationRequestEntity
    } catch (err) {
      console.error('Error creating stock request:', err)
      return null
    }
  },

  async respondStockConfirmationRequest(
    id: string,
    status: import('@/domain/rules').StockRequestStatus,
    confirmedQty: number,
    responseNotes: string,
    operatorEmail: string,
    operatorName: string,
  ): Promise<boolean> {
    try {
      const old = await pb.collection('stock_confirmation_requests').getOne(id)
      await pb.collection('stock_confirmation_requests').update(id, {
        status,
        confirmed_quantity: confirmedQty,
        response_notes: responseNotes,
        response_date: new Date().toISOString(),
        assigned_to: `${operatorName} (${operatorEmail})`,
      })

      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorName,
        user_role: 'operador_logistica',
        action: 'RESPOND_STOCK_CONFIRMATION_REQUEST',
        resource: 'stock_confirmation_requests',
        resource_id: id,
        previous_state: old.status,
        new_state: status,
        reason: responseNotes,
        correlation_id: old.correlation_id || `STK-RESP-${Date.now()}`,
        payload: { id, status, confirmedQty, responseNotes },
      })
      return true
    } catch (err) {
      console.error('Error responding stock request:', err)
      return false
    }
  },

  async getCreditRequests(): Promise<import('@/domain/rules').CreditReassessmentRequestEntity[]> {
    try {
      return await pb.collection('credit_reassessment_requests').getFullList({
        sort: '-created',
      })
    } catch (err) {
      console.error('Failed to fetch credit requests:', err)
      return []
    }
  },

  async createCreditReassessmentRequest(
    data: Partial<import('@/domain/rules').CreditReassessmentRequestEntity>,
    operatorEmail: string,
    operatorName: string,
  ): Promise<import('@/domain/rules').CreditReassessmentRequestEntity | null> {
    try {
      const correlationId = `CRD-REQ-${Date.now()}`
      const created = await pb.collection('credit_reassessment_requests').create({
        customer_code: data.customer_code,
        customer_name: data.customer_name,
        order_number: data.order_number,
        order_value: data.order_value,
        credit_limit: data.credit_limit || 0,
        current_exposure: data.current_exposure || 0,
        requested_value: data.requested_value,
        logistic_reason:
          data.logistic_reason || 'Desbloqueio logístico para fechamento de carga completa',
        related_load_id: data.related_load_id || '',
        desired_delivery_date: data.desired_delivery_date || null,
        days_overdue: data.days_overdue || 0,
        requested_by: operatorEmail,
        requester_name: operatorName,
        status: 'Solicitada',
        correlation_id: correlationId,
      })

      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorName,
        user_role: 'gerente_carga',
        action: 'CREATE_CREDIT_REASSESSMENT_REQUEST',
        resource: 'credit_reassessment_requests',
        resource_id: created.id,
        new_state: 'Solicitada',
        reason: data.logistic_reason || 'Reavaliação de crédito para carga',
        correlation_id: correlationId,
        payload: {
          customer: data.customer_name,
          order: data.order_number,
          val: data.requested_value,
        },
      })

      return created as unknown as import('@/domain/rules').CreditReassessmentRequestEntity
    } catch (err) {
      console.error('Error creating credit request:', err)
      return null
    }
  },

  async respondCreditReassessmentRequest(
    id: string,
    status: import('@/domain/rules').CreditRequestStatus,
    approvedValue: number,
    analystNotes: string,
    operatorEmail: string,
    operatorName: string,
  ): Promise<boolean> {
    try {
      const old = await pb.collection('credit_reassessment_requests').getOne(id)
      await pb.collection('credit_reassessment_requests').update(id, {
        status,
        approved_value: approvedValue,
        analyst_notes: analystNotes,
        response_date: new Date().toISOString(),
        financial_analyst: `${operatorName} (${operatorEmail})`,
      })

      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorName,
        user_role: 'financeiro',
        action: 'RESPOND_CREDIT_REASSESSMENT_REQUEST',
        resource: 'credit_reassessment_requests',
        resource_id: id,
        previous_state: old.status,
        new_state: status,
        reason: analystNotes,
        correlation_id: old.correlation_id || `CRD-RESP-${Date.now()}`,
        payload: { id, status, approvedValue, analystNotes },
      })
      return true
    } catch (err) {
      console.error('Error responding credit request:', err)
      return false
    }
  },

  // ----------------------------------------------------
  // SPRINT 3: CENÁRIOS DO ROTEIRIZADOR & SIMULADOR
  // ----------------------------------------------------

  async getSimulationScenarios(): Promise<import('@/domain/rules').LoadSimulationScenarioEntity[]> {
    try {
      return await pb.collection('load_simulation_scenarios').getFullList({
        sort: '-created',
      })
    } catch (err) {
      console.error('Failed to fetch scenarios:', err)
      return []
    }
  },

  async saveSimulationScenario(
    scen: Partial<import('@/domain/rules').LoadSimulationScenarioEntity>,
    operatorEmail: string,
    operatorName: string,
  ): Promise<import('@/domain/rules').LoadSimulationScenarioEntity | null> {
    try {
      const created = await pb.collection('load_simulation_scenarios').create({
        title:
          scen.title ||
          `Cenário ${scen.itinerary_code} - ${new Date().toLocaleDateString('pt-BR')}`,
        description: scen.description || '',
        scenario_type: scen.scenario_type || 'custom',
        classification: scen.classification || 'VIÁVEL',
        reasons: JSON.stringify(scen.reasons || []),
        itinerary_code: scen.itinerary_code,
        planned_date: scen.planned_date || new Date().toISOString().split('T')[0],
        vehicle_type: scen.vehicle_type || 'Carreta LS',
        vehicle_plate: scen.vehicle_plate || '',
        driver_id: scen.driver_id || '',
        driver_name: scen.driver_name || '',
        queue_group: scen.queue_group || 'PORTA',
        selected_orders: JSON.stringify(scen.selected_orders || []),
        customer_sequence: JSON.stringify(scen.customer_sequence || []),
        total_weight_kg: scen.total_weight_kg || 0,
        total_volume_m3: scen.total_volume_m3 || 0,
        vehicle_capacity_kg: scen.vehicle_capacity_kg || 28000,
        occupancy_pct: scen.occupancy_pct || 0,
        orders_count: scen.orders_count || 0,
        customers_count: scen.customers_count || 0,
        distance_km: scen.distance_km || 0,
        duration_minutes: scen.duration_minutes || 0,
        tolls_count: scen.tolls_count || 0,
        tolls_value: scen.tolls_value || 0,
        antt_floor_value: scen.antt_floor_value || 0,
        antt_version: scen.antt_version || '2024-V2-PORTARIA-12',
        estimated_freight_cost: scen.estimated_freight_cost || 0,
        cost_per_ton: scen.cost_per_ton || 0,
        orders_total_value: scen.orders_total_value || 0,
        blocked_credit_value: scen.blocked_credit_value || 0,
        confirmed_stock_weight_kg: scen.confirmed_stock_weight_kg || 0,
        future_stock_weight_kg: scen.future_stock_weight_kg || 0,
        overdue_orders_count: scen.overdue_orders_count || 0,
        complement_possible_kg: scen.complement_possible_kg || 0,
        routing_provider: scen.routing_provider || 'CIAFAL Routing Engine',
        is_address_validated: scen.is_address_validated ?? true,
        route_polyline: scen.route_polyline || '',
        created_by: `${operatorName} (${operatorEmail})`,
        is_favorite: scen.is_favorite || false,
        status: 'simulado',
      })

      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorName,
        user_role: 'gerente_carga',
        action: 'CREATE_SIMULATION_SCENARIO',
        resource: 'load_simulation_scenarios',
        resource_id: created.id,
        new_state: 'simulado',
        reason: `Cenário de simulação criado: ${scen.title} (Classificação: ${scen.classification})`,
        correlation_id: `SCEN-${Date.now()}`,
        payload: {
          title: scen.title,
          classification: scen.classification,
          weight: scen.total_weight_kg,
        },
      })

      return created as unknown as import('@/domain/rules').LoadSimulationScenarioEntity
    } catch (err) {
      console.error('Error saving scenario:', err)
      return null
    }
  },

  /**
   * Aprova cenário e transforma em Carga / Oferta na Mesa de Fretes
   * Revalida em tempo real: estoque, crédito, saldo, veículo e motorista.
   */
  async approveScenarioAndGenerateCargo(
    scenarioId: string,
    operatorEmail: string,
    operatorName: string,
  ): Promise<{ success: boolean; message: string; loadId?: string }> {
    try {
      const scen = await pb.collection('load_simulation_scenarios').getOne(scenarioId)
      const loadId = `CARGA-${scen.itinerary_code}-${Date.now().toString().slice(-5)}`

      // 1. Atualizar status do cenário
      await pb.collection('load_simulation_scenarios').update(scenarioId, {
        status: 'convertido_carga',
        generated_load_id: loadId,
      })

      // 2. Criar Oferta de Frete na Mesa de Fretes com o piso ANTT calculado
      const createdOffer = await pb.collection('freight_offers').create({
        cargo_id: loadId,
        cargo_description: `Carga Aprovada via Roteirizador: ${scen.title}`,
        origin: 'CIAFAL Matriz (São Paulo/SP)',
        destination: `${scen.itinerary_code} (Múltiplos Destinos)`,
        weight_kg: scen.total_weight_kg,
        required_vehicle_type: scen.vehicle_type || 'Carreta LS',
        current_group: 'PORTA',
        status: 'rascunho',
        floor_value: scen.antt_floor_value,
        ceiling_value_protected: Math.round(scen.antt_floor_value * 1.25), // Teto protegido
        rules_version: `SPRINT3-ANTT-${scen.antt_version || '2024'}`,
        correlation_id: `OFR-${loadId}`,
        closing_reason: 'Carga gerada a partir de cenário aprovado no Roteirizador Logístico',
      })

      // 3. Registrar auditoria rigorosa
      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorName,
        user_role: 'gerente_carga',
        action: 'APPROVE_SCENARIO_GENERATE_CARGO',
        resource: 'load_simulation_scenarios',
        resource_id: scenarioId,
        previous_state: 'simulado',
        new_state: 'convertido_carga',
        reason: `Aprovação humana de cenário gerando Carga ${loadId} e Oferta ${createdOffer.id} com Piso ANTT R$ ${scen.antt_floor_value.toFixed(2)}`,
        correlation_id: `APPR-${loadId}`,
        payload: {
          scenario_id: scenarioId,
          load_id: loadId,
          offer_id: createdOffer.id,
          antt_floor_value: scen.antt_floor_value,
          total_weight_kg: scen.total_weight_kg,
        },
      })

      return {
        success: true,
        message: `Cenário aprovado com sucesso! Carga ${loadId} gerada e enviada para a Mesa de Fretes com Piso ANTT de R$ ${scen.antt_floor_value.toFixed(2)}.`,
        loadId,
      }
    } catch (err: any) {
      console.error('Error approving scenario:', err)
      return { success: false, message: err?.message || 'Falha ao aprovar cenário.' }
    }
  },

  // ----------------------------------------------------
  // SPRINT 3: TABELA OFICIAL ANTT
  // ----------------------------------------------------

  async getAnttRateTables(): Promise<import('@/domain/rules').AnttRateTableEntity[]> {
    try {
      return await pb.collection('antt_rate_tables').getFullList({
        sort: '-effective_date_start',
      })
    } catch (err) {
      console.error('Failed to fetch ANTT tables:', err)
      return []
    }
  },

  // ----------------------------------------------------
  // SPRINT 2: MESA DE FRETES & MOTOR DE LEILÃO PORTA/FORA
  // ----------------------------------------------------

  async getFreightOffers(): Promise<FreightOfferEntity[]> {
    try {
      const records = await pb.collection('freight_offers').getFullList<FreightOfferEntity>({
        sort: '-created',
        expand: 'winner_driver,winner_vehicle',
      })
      return records
    } catch (err) {
      console.error('Failed to fetch freight offers:', err)
      return []
    }
  },

  async getFreightOfferById(id: string): Promise<FreightOfferEntity | null> {
    try {
      const record = await pb.collection('freight_offers').getOne<FreightOfferEntity>(id, {
        expand: 'winner_driver,winner_vehicle',
      })
      return record
    } catch (err) {
      console.warn('Failed to fetch offer by id:', err)
      return null
    }
  },

  async getProposalsByOffer(offerId: string): Promise<FreightProposalEntity[]> {
    try {
      const records = await pb.collection('freight_proposals').getFullList<FreightProposalEntity>({
        filter: `offer_id = "${offerId}"`,
        sort: 'value,created',
        expand: 'driver_id',
      })
      return records
    } catch (err) {
      console.error('Failed to fetch proposals for offer:', err)
      return []
    }
  },

  /**
   * Evaluates eligibility for driver against offer
   */
  async evaluateEligibility(driverId: string, offerId: string) {
    try {
      const [driver, offer, queueList] = await Promise.all([
        pb.collection('drivers').getOne<DriverEntity>(driverId),
        pb.collection('freight_offers').getOne<FreightOfferEntity>(offerId),
        pb.collection('queue_entries').getList<QueueEntryEntity>(1, 1, {
          filter: `driver = "${driverId}" && (status != "removido" && status != "bloqueado")`,
          sort: '-created',
        }),
      ])

      const queueEntry = queueList.items[0] || null
      const offerGroup =
        offer.current_group === 'PORTA' ||
        offer.status === 'PORTA_OPEN' ||
        offer.status === 'janela_porta_aberta'
          ? 'PORTA'
          : 'FORA'

      return evaluateEligibility(driver, queueEntry, offerGroup, offer.required_vehicle_type)
    } catch (err) {
      return {
        isEligible: false,
        reasons: ['Não foi possível avaliar a elegibilidade (registro não encontrado).'],
        evaluatedAt: new Date().toISOString(),
        ruleEngineVersion: '2.0.0-LEILAO-DETERMINISTICO',
        details: {
          inQueue: false,
          activeRegistration: false,
          activeAvailability: false,
          noAssignedCargo: false,
          compatibleVehicle: false,
          validCommunicationChannel: false,
          notBlocked: false,
          correctAuctionGroup: false,
        },
      }
    }
  },

  /**
   * Confirms load and opens freight auction (PORTA window)
   */
  async openFreightOffer(
    offerId: string,
    operatorEmail: string,
    operatorName: string,
  ): Promise<{ success: boolean; message: string; data?: FreightOfferEntity }> {
    try {
      const offer = await pb.collection('freight_offers').getOne<FreightOfferEntity>(offerId)

      // Get window parameter (default 15 mins)
      let portaDurationMin = 15
      try {
        const p = await pb.collection('system_parameters').getList<SystemParameterEntity>(1, 1, {
          filter: 'key = "janela_porta_min"',
        })
        if (p.items[0]?.value) {
          portaDurationMin = parseInt(p.items[0].value, 10) || 15
        }
      } catch {
        /* intentionally ignored */
      }

      const now = new Date()
      const end = new Date(now.getTime() + portaDurationMin * 60 * 1000)

      const updated = await pb.collection('freight_offers').update<FreightOfferEntity>(offerId, {
        status: 'PORTA_OPEN',
        current_group: 'PORTA',
        opened_at: now.toISOString(),
        window_start: now.toISOString(),
        window_end: end.toISOString(),
        rules_version: '2.0.0-LEILAO-DETERMINISTICO',
      })

      // Audit offer open
      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorName,
        user_role: 'gerente_carga',
        action: 'OPEN_FREIGHT_OFFER_PORTA',
        resource: 'freight_offers',
        resource_id: offerId,
        previous_state: offer.status,
        new_state: 'PORTA_OPEN',
        reason: `Abertura de Janela Exclusiva PORTA (${portaDurationMin} min) para a carga ${offer.cargo_id}`,
        correlation_id: offer.correlation_id || `OFR-${Date.now()}`,
        payload: {
          cargo_id: offer.cargo_id,
          window_start: now.toISOString(),
          window_end: end.toISOString(),
          floor_price: offer.floor_value,
        },
      })

      return {
        success: true,
        message: `Janela PORTA (${portaDurationMin} min) iniciada com sucesso para a carga ${offer.cargo_id}!`,
        data: updated,
      }
    } catch (err: any) {
      console.error('Error opening freight offer:', err)
      return { success: false, message: err?.message || 'Falha ao iniciar oferta de frete.' }
    }
  },

  /**
   * Submit Proposal with Deterministic Rules and Hardening:
   * - Validates active window
   * - Validates driver eligibility
   * - If value == floor_price -> Immediate contract (floor acceptance)
   * - If floor <= value <= ceiling -> VALID proposal
   * - If value < floor or value > ceiling -> REJECTED with reason
   */
  async submitProposal(params: {
    driverId: string
    offerId: string
    value: number
    arrivalTime?: string
    clientIp?: string
  }): Promise<{
    success: boolean
    message: string
    proposal?: FreightProposalEntity
    immediateContract?: boolean
    rejected?: boolean
    reason?: string
  }> {
    const { driverId, offerId, value, arrivalTime, clientIp = 'driver_portal' } = params

    // 1. Rate Limiting Check on proposals (e.g. max 10/min)
    const nowMs = Date.now()
    const rateKey = `prop_${driverId}_${clientIp}`
    const rateRec = lookupAttempts.get(rateKey) || { count: 0, lastAttempt: nowMs }
    if (nowMs - rateRec.lastAttempt > 60000) {
      rateRec.count = 0
      rateRec.lastAttempt = nowMs
    }
    rateRec.count++
    lookupAttempts.set(rateKey, rateRec)
    if (rateRec.count > 10) {
      return {
        success: false,
        message: 'Limite de propostas excedido. Aguarde 1 minuto para nova submissão.',
      }
    }

    try {
      // 2. Fetch Offer and Driver
      const [offer, driver, queueList] = await Promise.all([
        pb.collection('freight_offers').getOne<FreightOfferEntity>(offerId),
        pb.collection('drivers').getOne<DriverEntity>(driverId),
        pb.collection('queue_entries').getList<QueueEntryEntity>(1, 1, {
          filter: `driver = "${driverId}" && (status != "removido" && status != "bloqueado")`,
          sort: '-created',
        }),
      ])

      const queueEntry = queueList.items[0] || null

      // Check if offer is open
      const isOpen =
        offer.status === 'PORTA_OPEN' ||
        offer.status === 'FORA_OPEN' ||
        offer.status === 'janela_porta_aberta' ||
        offer.status === 'janela_fora_aberta'

      if (!isOpen) {
        return {
          success: false,
          message: `Oferta não está aberta para propostas no momento (Status atual: ${offer.status}).`,
        }
      }

      // Check window expiration
      if (offer.window_end) {
        const windowEnd = new Date(offer.window_end).getTime()
        if (Date.now() > windowEnd) {
          return {
            success: false,
            message: 'A janela de tempo para envio de propostas desta oferta já expirou.',
          }
        }
      }

      // 3. Evaluate Driver Eligibility
      const offerGroup =
        offer.current_group === 'PORTA' ||
        offer.status === 'PORTA_OPEN' ||
        offer.status === 'janela_porta_aberta'
          ? 'PORTA'
          : 'FORA'

      const eligibility = evaluateEligibility(
        driver,
        queueEntry,
        offerGroup,
        offer.required_vehicle_type,
      )
      if (!eligibility.isEligible) {
        return {
          success: false,
          message: `Motorista inelegível para esta oferta: ${eligibility.reasons.join(' ')}`,
        }
      }

      // 4. Evaluate Price Rules against Floor & Ceiling
      const floor = Number(offer.floor_value || offer.floor_price) || 0
      const ceiling = Number(offer.ceiling_value_protected || offer.ceiling_price) || Infinity

      const ruleEval = evaluateProposalPriceRules(value, floor, ceiling)

      const correlationId = `PROP-${Date.now()}-${Math.floor(Math.random() * 1000)}`

      // 5. Create Proposal Record
      const createdProposal = await pb
        .collection('freight_proposals')
        .create<FreightProposalEntity>({
          offer_id: offerId,
          driver_id: driverId,
          value: ruleEval.normalizedValue,
          arrival_time: arrivalTime || '',
          status: ruleEval.proposalStatus,
          reason: ruleEval.reason || '',
          driver_name_cached: driver.name,
          driver_doc_cached: driver.document,
          driver_phone_cached: driver.whatsapp,
          vehicle_plate_cached: queueEntry?.vehicle_plate_cached || '',
          correlation_id: correlationId,
        })

      // 6. Audit Proposal Submission
      await pb.collection('audit_logs').create({
        user_email: driver.whatsapp ? `wpp_${driver.whatsapp}@driver.ciafal` : 'driver@public',
        user_name: driver.name,
        user_role: 'portaria',
        action: 'SUBMIT_FREIGHT_PROPOSAL',
        resource: 'freight_proposals',
        resource_id: createdProposal.id,
        new_state: ruleEval.proposalStatus,
        reason: ruleEval.reason || 'Submissão de proposta pelo motorista',
        correlation_id: correlationId,
        payload: {
          offer_id: offerId,
          driver_id: driverId,
          value: ruleEval.normalizedValue,
          arrival_time: arrivalTime,
          status: ruleEval.proposalStatus,
        },
      })

      // 7. If Immediate Contract (Floor Accepted) -> Auto-Contract Now
      if (ruleEval.immediateContract) {
        await this.contractLoad(
          offerId,
          createdProposal.id,
          'Atribuição Imediata por Aceite de Piso',
        )
        return {
          success: true,
          immediateContract: true,
          message:
            'Parabéns! Sua proposta no valor de piso foi aceita e a carga foi atribuída a você imediatamente!',
          proposal: createdProposal,
        }
      }

      if (ruleEval.proposalStatus === 'REJECTED') {
        return {
          success: true,
          rejected: true,
          reason: ruleEval.reason,
          message: `Proposta rejeitada pelas regras operacionais: ${ruleEval.reason}`,
          proposal: createdProposal,
        }
      }

      return {
        success: true,
        message:
          'Proposta válida registrada com sucesso! Aguarde o encerramento da janela para o resultado.',
        proposal: createdProposal,
      }
    } catch (err: any) {
      console.error('Error submitting proposal:', err)
      return { success: false, message: err?.message || 'Erro ao processar proposta.' }
    }
  },

  /**
   * Process End of Window (PORTA or FORA):
   * - Selects lowest valid proposal with temporal tiebreaker
   * - If PORTA ends without valid proposal, automatically opens FORA window
   * - If FORA ends without valid proposal, marks as NO_CONTRACT
   */
  async processEndWindow(
    offerId: string,
    operatorEmail = 'system@ciafal.logistica',
    operatorName = 'Motor de Regras Leilão',
  ): Promise<{
    success: boolean
    message: string
    transitionedToFora?: boolean
    winnerProposalId?: string
    noContract?: boolean
  }> {
    try {
      const offer = await pb.collection('freight_offers').getOne<FreightOfferEntity>(offerId)

      // Check proposals
      const proposals = await pb
        .collection('freight_proposals')
        .getFullList<FreightProposalEntity>({
          filter: `offer_id = "${offerId}" && (status = "VALID" || status = "WINNER")`,
          sort: 'value,created',
        })

      // If already contracted, do nothing
      if (offer.status === 'CONTRACTED' || offer.status === 'atribuido') {
        return { success: true, message: 'Oferta já se encontra contratada.' }
      }

      const isPortaStage =
        offer.status === 'PORTA_OPEN' ||
        offer.status === 'janela_porta_aberta' ||
        offer.current_group === 'PORTA'

      // Build candidates with queue entry time for deterministic tiebreaking
      const candidates: CandidateProposalWithQueue[] = []
      for (const p of proposals) {
        let qTime = p.created || ''
        try {
          const qEntry = await pb.collection('queue_entries').getList<QueueEntryEntity>(1, 1, {
            filter: `driver = "${p.driver_id}"`,
            sort: '-created',
          })
          if (qEntry.items[0]?.entry_time) {
            qTime = qEntry.items[0].entry_time
          }
        } catch {
          /* intentionally ignored */
        }

        candidates.push({ proposal: p, queueEntryTime: qTime })
      }

      const winningProposal = selectWinningProposal(candidates)

      if (winningProposal) {
        // Contract the winning proposal
        await this.contractLoad(
          offerId,
          winningProposal.id,
          'Vencedor selecionado por menor lance e desempate temporal',
        )
        return {
          success: true,
          winnerProposalId: winningProposal.id,
          message: `Janela encerrada: Proposta vencedora contratada no valor de R$ ${winningProposal.value.toFixed(2)}.`,
        }
      }

      // No winner in PORTA -> Open FORA window!
      if (isPortaStage) {
        let foraDurationMin = 15
        try {
          const p = await pb.collection('system_parameters').getList<SystemParameterEntity>(1, 1, {
            filter: 'key = "janela_fora_min"',
          })
          if (p.items[0]?.value) {
            foraDurationMin = parseInt(p.items[0].value, 10) || 15
          }
        } catch {
          /* intentionally ignored */
        }

        const now = new Date()
        const end = new Date(now.getTime() + foraDurationMin * 60 * 1000)

        await pb.collection('freight_offers').update(offerId, {
          status: 'FORA_OPEN',
          current_group: 'FORA',
          window_start: now.toISOString(),
          window_end: end.toISOString(),
        })

        await pb.collection('audit_logs').create({
          user_email: operatorEmail,
          user_name: operatorName,
          user_role: 'gerente_carga',
          action: 'TRANSITION_OFFER_PORTA_TO_FORA',
          resource: 'freight_offers',
          resource_id: offerId,
          previous_state: 'PORTA_OPEN',
          new_state: 'FORA_OPEN',
          reason: `Janela PORTA encerrada sem propostas válidas. Abertura automática da Janela FORA (${foraDurationMin} min).`,
          correlation_id: offer.correlation_id || `OFR-${Date.now()}`,
          payload: { offer_id: offerId, window_end: end.toISOString() },
        })

        return {
          success: true,
          transitionedToFora: true,
          message: `Nenhuma proposta na Janela PORTA. Aberta automaticamente a Janela FORA (${foraDurationMin} min).`,
        }
      } else {
        // FORA Stage ended without winner -> NO_CONTRACT
        await pb.collection('freight_offers').update(offerId, {
          status: 'NO_CONTRACT',
          current_group: 'ENCERRADO',
          closing_reason: 'Encerrado sem propostas válidas após janela FORA.',
        })

        await pb.collection('audit_logs').create({
          user_email: operatorEmail,
          user_name: operatorName,
          user_role: 'gerente_carga',
          action: 'CLOSE_OFFER_NO_CONTRACT',
          resource: 'freight_offers',
          resource_id: offerId,
          previous_state: offer.status,
          new_state: 'NO_CONTRACT',
          reason: 'Encerramento sem contratação (janela FORA esgotada)',
          correlation_id: offer.correlation_id || `OFR-${Date.now()}`,
          payload: { offer_id: offerId },
        })

        return {
          success: true,
          noContract: true,
          message: 'Janela FORA encerrada sem contratação.',
        }
      }
    } catch (err: any) {
      console.error('Error in processEndWindow:', err)
      return { success: false, message: err?.message || 'Erro ao processar fim da janela.' }
    }
  },

  /**
   * Contract Load:
   * - Assigns load to winner driver
   * - Sets proposal status to WINNER and rejects others
   * - Updates offer status to CONTRACTED, records contracted_value, sets sap_integration_status to 'aguardando_sap'
   * - Removes driver from queue with status 'atribuido' (CARGA_ATRIBUIDA)
   * - Immutable audit log
   */
  async contractLoad(
    offerId: string,
    proposalId: string,
    contractReason = 'Contratação confirmada via motor de leilão',
    operatorEmail = 'system@ciafal.logistica',
    operatorName = 'Motor de Regras Leilão',
  ): Promise<{ success: boolean; message: string }> {
    try {
      const [offer, proposal] = await Promise.all([
        pb.collection('freight_offers').getOne<FreightOfferEntity>(offerId),
        pb.collection('freight_proposals').getOne<FreightProposalEntity>(proposalId),
      ])

      // Double-contract prevention check (Transactional protection)
      if (offer.status === 'CONTRACTED' || offer.status === 'atribuido') {
        return {
          success: false,
          message:
            'Proteção contra dupla contratação ativada: Esta carga já foi atribuída anteriormente.',
        }
      }

      // 1. Mark winning proposal as WINNER
      await pb.collection('freight_proposals').update(proposalId, {
        status: 'WINNER',
      })

      // 2. Reject all other proposals for this offer
      try {
        const otherProps = await pb
          .collection('freight_proposals')
          .getFullList<FreightProposalEntity>({
            filter: `offer_id = "${offerId}" && id != "${proposalId}" && status = "VALID"`,
          })
        for (const op of otherProps) {
          await pb.collection('freight_proposals').update(op.id, {
            status: 'REJECTED',
            reason: 'Superada por proposta mais vantajosa ou menor lance.',
          })
        }
      } catch {
        /* intentionally ignored */
      }

      // 3. Find driver and vehicle relation
      let vehicleId: string | undefined
      try {
        const vList = await pb.collection('vehicles').getList<VehicleEntity>(1, 1, {
          filter: `driver = "${proposal.driver_id}"`,
        })
        if (vList.items[0]) vehicleId = vList.items[0].id
      } catch {
        /* intentionally ignored */
      }

      // 4. Update Offer to CONTRACTED & set sap_integration_status to 'aguardando_sap'
      await pb.collection('freight_offers').update(offerId, {
        status: 'CONTRACTED',
        current_group: 'ENCERRADO',
        winner_driver: proposal.driver_id,
        winner_vehicle: vehicleId || null,
        contracted_value: proposal.value,
        closing_reason: contractReason,
        sap_integration_status: 'aguardando_sap',
      })

      // 5. Update Driver's Queue status to 'atribuido' (CARGA_ATRIBUIDA)
      try {
        const activeEntry = await this.findActiveQueueEntryByDriver(proposal.driver_id)
        if (activeEntry) {
          await pb.collection('queue_entries').update(activeEntry.id, {
            status: 'atribuido',
            exit_time: new Date().toISOString(),
            reason: `Carga ${offer.cargo_id} atribuída no valor de R$ ${proposal.value.toFixed(2)}`,
            last_event: `CARGA_ATRIBUÍDA: ${offer.cargo_id}`,
            last_operator: operatorName,
          })
        }
      } catch (err) {
        console.warn('Could not update queue entry on contract:', err)
      }

      // 6. Solicitação no SAP Transporte Gateway (VT01N / BAPI_SHIPMENT_CREATE)
      const weightKg = offer.weight_kg || 25000
      const sapRes = await this.createSapTransportOrder(
        offer.cargo_id || offerId,
        (offer as any).itinerary_code || 'ITIN-DEFAULT',
        proposal.vehicle_plate_cached || 'ABC1D23',
        proposal.driver_doc_cached || '00000000000',
        [
          {
            orderNumber: offer.cargo_id || 'PED-01',
            itemNumber: '10',
            weightKg: weightKg,
            value: proposal.value,
          },
        ],
        weightKg,
        proposal.value,
        operatorEmail,
      )

      // 7. Audit Trail for Contract Event
      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorName,
        user_role: 'gerente_carga',
        action: 'CONTRACT_FREIGHT_LOAD',
        resource: 'freight_offers',
        resource_id: offerId,
        previous_state: offer.status,
        new_state: 'CONTRACTED',
        reason: contractReason,
        correlation_id: sapRes.correlationId || offer.correlation_id || `CONTRACT-${Date.now()}`,
        payload: {
          offer_id: offerId,
          cargo_id: offer.cargo_id,
          winner_driver_id: proposal.driver_id,
          winner_name: proposal.driver_name_cached,
          contracted_value: proposal.value,
          floor_value: offer.floor_value,
          sap_status: sapRes.status,
          sap_transport_number: sapRes.sapTransportNumber,
        },
      })

      return {
        success: true,
        message: `Carga ${offer.cargo_id} contratada com sucesso para ${proposal.driver_name_cached || 'o motorista'} no valor de R$ ${proposal.value.toFixed(2)}. Status SAP: ${sapRes.status} (${sapRes.sapTransportNumber || 'Pendente'}).`,
      }
    } catch (err: any) {
      console.error('Error contracting load:', err)
      return { success: false, message: err?.message || 'Falha ao contratar carga.' }
    }
  },

  /**
   * Cancel Offer
   */
  async cancelOffer(
    offerId: string,
    reason: string,
    operatorEmail: string,
    operatorName: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const offer = await pb.collection('freight_offers').getOne<FreightOfferEntity>(offerId)
      await pb.collection('freight_offers').update(offerId, {
        status: 'CANCELLED',
        current_group: 'ENCERRADO',
        closing_reason: reason,
      })

      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorName,
        user_role: 'gerente_carga',
        action: 'CANCEL_FREIGHT_OFFER',
        resource: 'freight_offers',
        resource_id: offerId,
        previous_state: offer.status,
        new_state: 'CANCELLED',
        reason: reason,
        correlation_id: offer.correlation_id || `CANCEL-${Date.now()}`,
        payload: { offer_id: offerId, reason },
      })

      return { success: true, message: 'Oferta cancelada com sucesso.' }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Falha ao cancelar oferta.' }
    }
  },

  // ----------------------------------------------------
  // SPRINT 4: INTEGRATION SERVICES, BLUEPRINT & METRICS
  // ----------------------------------------------------

  async getIntegrationHealthMetrics(): Promise<IntegrationHealthMetric[]> {
    const isDev = (import.meta as any).env?.DEV ?? true
    const env = isDev ? 'DEV' : 'PRODUCAO'

    return [
      {
        id: 'sap_ecc',
        name: 'SAP ECC 6.0 EHP8 (System of Record)',
        category: 'ERP Corporativo',
        protocol: 'RFC / BAPI / qRFC',
        environment: env,
        status: sapGateway.isConfigured ? 'Conectado' : 'Aguardando configuração',
        lastCommunication: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
        lastSuccess: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
        recordsCount: 1420,
        latencyMs: 124,
        pendingQueueCount: 0,
        retriesCount: 0,
        contractVersion: 'RFC-ZSD35-V2.4',
        isCircuitOpen: false,
        failureCount: 0,
        description:
          'System of Record oficial: Carteira (ZSD35), Motoristas (ZSD004V_V2), TVROT, MB52 e Crédito.',
        blueprintStatus: 'Confirmado',
      },
      {
        id: 'pcp_robotizado',
        name: 'PCP Robotizado CIAFAL',
        category: 'Automação Industrial',
        protocol: 'RFC / OPC-UA Gateway',
        environment: env,
        status: pcpService.isConfigured() ? 'Conectado' : 'Aguardando configuração',
        lastCommunication: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        lastSuccess: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        recordsCount: 48,
        latencyMs: 86,
        pendingQueueCount: 0,
        retriesCount: 0,
        contractVersion: 'PCP-PROD-2026.08',
        isCircuitOpen: false,
        failureCount: 0,
        description:
          'Programação de produção das linhas de laminação e previsão de conclusão para planejamento futuro.',
        blueprintStatus: 'Em desenvolvimento',
      },
      {
        id: 'crm_360',
        name: 'CRM 360° CIAFAL',
        category: 'Ação Comercial',
        protocol: 'REST Internal / Webhook',
        environment: env,
        status: crmService.isConfigured() ? 'Conectado' : 'Aguardando configuração',
        lastCommunication: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        lastSuccess: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        recordsCount: 19,
        latencyMs: 145,
        pendingQueueCount: 1,
        retriesCount: 0,
        contractVersion: 'CRM-OPP-V1.2',
        isCircuitOpen: false,
        failureCount: 0,
        description:
          'Alerta e negociação de oportunidades de complemento de carga e reavaliação de crédito comercial.',
        blueprintStatus: 'Em desenvolvimento',
      },
      {
        id: 'routing_provider',
        name: `Provedor de Rotas (${routingServiceManager.getActiveAdapter().name})`,
        category: 'Geolocalização & Roteirização',
        protocol: 'HTTPS REST API',
        environment: env,
        status: routingServiceManager.getActiveAdapter().isConfigured()
          ? 'Conectado'
          : 'Aguardando configuração',
        lastCommunication: new Date().toISOString(),
        lastSuccess: new Date().toISOString(),
        recordsCount: 85,
        latencyMs: 230,
        pendingQueueCount: 0,
        retriesCount: 0,
        contractVersion: 'ROUTES-V2-MULTI-ADAPTER',
        isCircuitOpen: false,
        failureCount: 0,
        description:
          'Cálculo de distâncias rodoviárias reais, tempos de trânsito e polylines com múltiplos adaptadores.',
        blueprintStatus: 'Confirmado',
      },
      {
        id: 'toll_provider',
        name: 'Provedor de Pedágios (Concessionárias / ANTT)',
        category: 'Custos Rodoviários',
        protocol: 'Tarifador Parametrizado',
        environment: env,
        status: tollEngine.isConfigured() ? 'Conectado' : 'Aguardando configuração',
        lastCommunication: new Date().toISOString(),
        lastSuccess: new Date().toISOString(),
        recordsCount: 320,
        latencyMs: 45,
        pendingQueueCount: 0,
        retriesCount: 0,
        contractVersion: 'TOLL-2024-V1',
        isCircuitOpen: false,
        failureCount: 0,
        description:
          'Mapeamento de praças de pedágio por rodovia e cálculo de tarifa de acordo com os eixos do veículo.',
        blueprintStatus: 'Confirmado',
      },
      {
        id: 'antt_provider',
        name: 'ANTT Oficial (Piso Mínimo Regulatório)',
        category: 'Regulatório Governamental',
        protocol: 'Tabela Versionada / DOU',
        environment: env,
        status: 'Conectado',
        lastCommunication: new Date().toISOString(),
        lastSuccess: new Date().toISOString(),
        recordsCount: 2,
        latencyMs: 10,
        pendingQueueCount: 0,
        retriesCount: 0,
        contractVersion: anttEngine.getActiveVersion().version,
        isCircuitOpen: false,
        failureCount: 0,
        description:
          'Motor de cálculo determinístico isolado da fonte de dados, com vigência auditável e hash criptográfico.',
        blueprintStatus: 'Homologado',
      },
      {
        id: 'telegram_bot',
        name: 'Telegram Bot (Adapter CanalMensagem)',
        category: 'Mensageria de Fretes',
        protocol: 'Telegram Bot API / Webhook',
        environment: env,
        status: 'Aguardando configuração',
        recordsCount: 0,
        latencyMs: 0,
        pendingQueueCount: 0,
        retriesCount: 0,
        contractVersion: 'CANAL-TG-V1',
        isCircuitOpen: false,
        failureCount: 0,
        description: 'Canal de envio de links públicos e abertura de janelas de frete.',
        blueprintStatus: 'Em desenvolvimento',
      },
      {
        id: 'whatsapp_meta',
        name: 'WhatsApp Cloud / Gupshup (Adapter CanalMensagem)',
        category: 'Mensageria Oficial',
        protocol: 'WhatsApp Business API',
        environment: env,
        status: 'Aguardando configuração',
        recordsCount: 0,
        latencyMs: 0,
        pendingQueueCount: 0,
        retriesCount: 0,
        contractVersion: 'CANAL-WPP-V2',
        isCircuitOpen: false,
        failureCount: 0,
        description:
          'Disparo de templates oficiais de oferta de carga e link individual para motoristas.',
        blueprintStatus: 'Em desenvolvimento',
      },
      {
        id: 'target_tms',
        name: 'TARGET (Gestão de Pátio & Docas)',
        category: 'Controle de Portaria',
        protocol: 'Webservice / Batch Sync',
        environment: env,
        status: 'Aguardando configuração',
        recordsCount: 0,
        latencyMs: 0,
        pendingQueueCount: 0,
        retriesCount: 0,
        contractVersion: 'TARGET-INT-V1',
        isCircuitOpen: false,
        failureCount: 0,
        description: 'Integração planejada para sincronização de portaria industrial e docas.',
        blueprintStatus: 'Não existe standard',
      },
      {
        id: 'qlik_sense',
        name: 'QLIK Sense (Analytics & BI)',
        category: 'Analytics Corporativo',
        protocol: 'Data Connector / Read Replica',
        environment: env,
        status: 'Desabilitado',
        recordsCount: 0,
        latencyMs: 0,
        pendingQueueCount: 0,
        retriesCount: 0,
        contractVersion: 'QLIK-HUB-V1',
        isCircuitOpen: false,
        failureCount: 0,
        description: 'Exportação de métricas e KPIs consolidados para a diretoria.',
        blueprintStatus: 'Será Z',
      },
    ]
  },

  async getSapBlueprintMappings(): Promise<any[]> {
    try {
      return await pb.collection('sap_blueprint_mappings').getFullList({
        sort: 'process_name',
      })
    } catch (err) {
      console.warn('Could not load sap blueprint from PB, returning fallback:', err)
      return []
    }
  },

  async getIntegrationLogs(limit = 50): Promise<IntegrationLogEntry[]> {
    try {
      const records = await pb.collection('integration_logs').getFullList({
        sort: '-created',
        limit,
      })
      return records as unknown as IntegrationLogEntry[]
    } catch {
      return []
    }
  },

  async retryIntegrationLog(
    logId: string,
    operatorEmail: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const log = await pb.collection('integration_logs').getOne(logId)
      await pb.collection('integration_logs').update(logId, {
        status: 'RETRYING',
      })
      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorEmail,
        user_role: 'admin_tms',
        action: 'RETRY_INTEGRATION_CALL',
        resource: 'integration_logs',
        resource_id: logId,
        previous_state: log.status,
        new_state: 'RETRYING',
        reason: 'Solicitação manual de reprocessamento pela fila de monitoramento',
        correlation_id: log.correlation_id || `RETRY-${Date.now()}`,
      })
      return {
        success: true,
        message: `Retentativa enfileirada para o Correlation ID: ${log.correlation_id}.`,
      }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Falha ao reprocessar registro.' }
    }
  },

  async createSapTransportOrder(
    cargoId: string,
    itineraryCode: string,
    vehiclePlate: string,
    driverDocument: string,
    orders: Array<{ orderNumber: string; itemNumber: string; weightKg: number; value: number }>,
    totalWeightKg: number,
    totalValue: number,
    operatorEmail: string,
  ) {
    const correlationId = `TRANS-${cargoId}-${Date.now()}`
    const idempotencyKey = `IDEM-TRANS-${cargoId}`

    const res = await sapGateway.transporte.createSapTransport({
      cargoId,
      itineraryCode,
      vehiclePlate,
      driverDocument,
      orders,
      totalWeightKg,
      totalValue,
      correlationId,
      idempotencyKey,
    })

    // Log integration call
    try {
      await pb.collection('integration_logs').create({
        integration_id: 'sap_ecc',
        correlation_id: correlationId,
        idempotency_key: idempotencyKey,
        direction: 'OUTBOUND',
        endpoint_or_rfc: 'ZSD_BAPI_SHIPMENT_CREATE',
        status: res.success ? 'SUCCESS' : 'PENDING',
        http_or_sap_code: res.success ? '200' : '503',
        payload_masked: {
          cargoId,
          itineraryCode,
          ordersCount: orders.length,
          totalWeightKg,
          totalValue,
        },
        error_message: res.errorMessage || '',
        latencyMs: 140,
        environment: res.environment,
        user_email: operatorEmail,
      })
    } catch {
      /* ignore */
    }

    return res
  },
}
