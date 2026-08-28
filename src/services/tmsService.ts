// TMS CIAFAL Centralized PocketBase Data Services

import pb from '@/lib/pocketbase/client'
import {
  DriverEntity,
  VehicleEntity,
  QueueEntryEntity,
  PreRegistrationEntity,
  AuditLogEntity,
  FreightOfferEntity,
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
  CIAFAL_PLANT_LOCATION,
} from '@/domain/rules'

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
      await pb.collection('oportunidade_complemento_carga').update(id, {
        status: 'Enviada CRM',
        enviado_crm: true,
        data_envio: sendDate,
      })

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
        reason: 'Alerta comercial de oportunidade de complemento gerado para CRM 360°',
        correlation_id: opp.correlation_id || `CRM-${Date.now()}`,
        payload: {
          cargo: opp.cargo_code,
          itinerary: opp.itinerary_code,
          balance_kg: opp.balance_kg,
          sent_at: sendDate,
        },
      })
      return true
    } catch (err) {
      console.error('Failed to send opportunity to CRM:', err)
      return false
    }
  },
}
