// TMS CIAFAL Centralized PocketBase Data Services

import pb from '@/lib/pocketbase/client'
import {
  DriverEntity,
  QueueEntryEntity,
  PreRegistrationEntity,
  AuditLogEntity,
  FreightOfferEntity,
  SystemParameterEntity,
  PreRegistrationStatus,
  QueueStatus,
  isValidDocument,
  validateGeofence,
  CIAFAL_PLANT_LOCATION,
} from '@/domain/rules'

export interface CreateQueueEntryParams {
  document: string
  whatsapp: string
  plate: string
  vehicleType: string
  type: 'PORTA' | 'FORA'
  latitude?: number
  longitude?: number
  accuracy?: number
  clientIp?: string
}

export const TmsService = {
  // Check if driver exists by document
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

  // Check if driver is already in queue (active entry)
  async findActiveQueueEntryByDriver(driverId: string): Promise<QueueEntryEntity | null> {
    try {
      const records = await pb.collection('queue_entries').getList<QueueEntryEntity>(1, 1, {
        filter: `driver = "${driverId}" && (status != "removido" && status != "atribuido" && status != "bloqueado")`,
        sort: '-created',
      })
      return records.items[0] || null
    } catch (_) {
      return null
    }
  },

  // Get full operational queue sorted with PORTA first, then arrival time
  async getOperationalQueue(): Promise<QueueEntryEntity[]> {
    try {
      const records = await pb.collection('queue_entries').getFullList<QueueEntryEntity>({
        sort: '-type,entry_time', // PORTA first, then earlier entry_time
        expand: 'driver,vehicle',
      })
      return records
    } catch (err) {
      console.error('Failed to fetch queue:', err)
      return []
    }
  },

  // Fetch dynamic system parameters
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
      await pb.collection('system_parameters').update(id, {
        value,
        description,
      })

      // Audit parameter change
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

  // Submit Totem Entry (PORTA) with Controlled Transition (FORA -> PORTA) & Duplicate Prevention
  async submitTotemEntry(params: CreateQueueEntryParams): Promise<{
    success: boolean
    message: string
    data?: any
    isPreReg?: boolean
    transitionedFromFora?: boolean
  }> {
    const cleanDoc = params.document.replace(/\D/g, '')
    const cleanPhone = params.whatsapp.replace(/\D/g, '').replace(/^55/, '')
    const cleanPlate = (params.plate || '').toUpperCase().trim()

    const docValidation = isValidDocument(cleanDoc)
    if (!docValidation.valid) {
      return {
        success: false,
        message: 'Documento (CPF/CNPJ) inválido com base no algoritmo verificador.',
      }
    }

    // Check if driver exists
    const driver = await this.findDriverByDocument(cleanDoc)
    if (!driver) {
      // Create Pre-registration
      try {
        const pre = await pb.collection('pre_registrations').create({
          document: cleanDoc,
          name: 'Motorista Não Cadastrado (Totem)',
          whatsapp: cleanPhone,
          vehicle_type: params.vehicleType,
          plate: cleanPlate,
          origin: 'PORTA',
          status: 'novo',
          reviewer_notes: 'Entrada pelo Totem da Portaria. CPF/CNPJ sem cadastro ativo no SAP.',
        })

        // Audit pre-registration creation
        await pb.collection('audit_logs').create({
          user_email: 'totem@ciafal.internal',
          user_name: 'Totem Portaria Autoatendimento',
          user_role: 'portaria',
          action: 'CREATE_PRE_REGISTRATION',
          resource: 'pre_registrations',
          resource_id: pre.id,
          new_state: 'novo',
          reason: 'Tentativa de entrada no Totem por motorista não cadastrado no SAP',
          correlation_id: `PREREG-${Date.now()}`,
          payload: { document: cleanDoc, plate: cleanPlate, origin: 'PORTA' },
        })

        return {
          success: true,
          isPreReg: true,
          message:
            'Documento não encontrado no cadastro ativo. Foi gerado um Pré-cadastro Pendente para conferência na portaria.',
          data: pre,
        }
      } catch (err: any) {
        return { success: false, message: err?.message || 'Erro ao criar pré-cadastro.' }
      }
    }

    if (driver.status === 'bloqueado') {
      return {
        success: false,
        message: 'Motorista bloqueado administrativamente. Dirija-se à guarita da portaria.',
      }
    }

    // Duplicate Check & Transition FORA -> PORTA
    const activeEntry = await this.findActiveQueueEntryByDriver(driver.id)
    let transitionedFromFora = false

    if (activeEntry) {
      if (activeEntry.type === 'PORTA') {
        return {
          success: false,
          message: 'Motorista já possui entrada ativa na Fila PORTA.',
        }
      } else if (activeEntry.type === 'FORA') {
        // Transição Controlada FORA -> PORTA
        // 1. Encerrar o estado FORA com auditoria e histórico
        const arrivalTime = new Date().toISOString()
        await pb.collection('queue_entries').update(activeEntry.id, {
          status: 'removido',
          exit_time: arrivalTime,
          reason: 'Promovido para PORTA por chegada física confirmada no Totem Portaria',
          last_event: 'Transição FORA → PORTA (Chegada Física ao Pátio)',
          last_operator: 'Totem Portaria Autoatendimento',
        })

        // 2. Criar log de auditoria específico da transição
        await pb.collection('audit_logs').create({
          user_email: 'totem@ciafal.internal',
          user_name: 'Totem Portaria Autoatendimento',
          user_role: 'portaria',
          action: 'TRANSITION_FORA_TO_PORTA',
          resource: 'queue_entries',
          resource_id: activeEntry.id,
          previous_state: 'FORA',
          new_state: 'PORTA',
          reason:
            'Chegada física no Totem da Portaria promovendo disponibilidade externa para física',
          correlation_id: `TRANS-${Date.now()}`,
          payload: {
            driver_id: driver.id,
            driver_name: driver.name,
            previous_entry_time: activeEntry.entry_time,
            physical_arrival_time: arrivalTime,
          },
        })

        transitionedFromFora = true
      }
    }

    // Find or create vehicle
    let vehicleId = ''
    if (cleanPlate) {
      try {
        const vehicles = await pb
          .collection('vehicles')
          .getList(1, 1, { filter: `plate = "${cleanPlate}"` })
        if (vehicles.items.length > 0) {
          vehicleId = vehicles.items[0].id
        } else {
          const v = await pb.collection('vehicles').create({
            plate: cleanPlate,
            type: params.vehicleType || 'Carreta LS',
            driver: driver.id,
          })
          vehicleId = v.id
        }
      } catch {
        /* intentionally ignored */
      }
    }

    // Create entry in PORTA with real effective arrival time
    try {
      const entryTime = new Date().toISOString()
      const entry = await pb.collection('queue_entries').create({
        driver: driver.id,
        vehicle: vehicleId || null,
        type: 'PORTA',
        status: 'disponivel',
        entry_time: entryTime,
        location_status: 'validada',
        distance_km: 0,
        driver_name_cached: driver.name,
        driver_doc_cached: driver.document,
        driver_whatsapp_cached: cleanPhone || driver.whatsapp,
        vehicle_plate_cached: cleanPlate,
        vehicle_type_cached: params.vehicleType || 'Carreta',
        reason: transitionedFromFora
          ? 'Transição FORA → PORTA confirmada pelo Totem da Portaria'
          : 'Entrada física registrada via Totem da Portaria',
        last_event: transitionedFromFora
          ? 'Transição FORA → PORTA (Presença Confirmada)'
          : 'Entrada na Fila (PORTA)',
        last_operator: 'Totem Portaria',
      })

      return {
        success: true,
        transitionedFromFora,
        message: transitionedFromFora
          ? 'Transição FORA → PORTA realizada com sucesso! Presença física confirmada no pátio com nova prioridade temporal.'
          : 'Entrada na Fila PORTA registrada com sucesso!',
        data: entry,
      }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Falha ao registrar entrada na fila.' }
    }
  },

  // Submit External Link Entry (FORA)
  async submitExternalCheckin(
    params: CreateQueueEntryParams,
  ): Promise<{ success: boolean; message: string; data?: any; isPreReg?: boolean }> {
    const cleanDoc = params.document.replace(/\D/g, '')
    const cleanPhone = params.whatsapp.replace(/\D/g, '').replace(/^55/, '')
    const cleanPlate = (params.plate || '').toUpperCase().trim()

    const docValidation = isValidDocument(cleanDoc)
    if (!docValidation.valid) {
      return { success: false, message: 'Documento (CPF/CNPJ) inválido.' }
    }

    // Geolocation check
    if (params.latitude === undefined || params.longitude === undefined) {
      return {
        success: false,
        message:
          'Acesso à localização obrigatório: autorize o GPS do seu celular para entrar no grupo FORA.',
      }
    }

    // Retrieve plant dynamic parameters or defaults
    let plantLat = CIAFAL_PLANT_LOCATION.latitude
    let plantLon = CIAFAL_PLANT_LOCATION.longitude
    let maxRadiusKm = CIAFAL_PLANT_LOCATION.maxRadiusKm
    let accuracyTolerance = 500

    try {
      const pLat = await pb
        .collection('system_parameters')
        .getFirstListItem('key = "PLANT_LATITUDE"')
      plantLat = parseFloat(pLat.value) || plantLat
    } catch {
      /* intentionally ignored */
    }
    try {
      const pLon = await pb
        .collection('system_parameters')
        .getFirstListItem('key = "PLANT_LONGITUDE"')
      plantLon = parseFloat(pLon.value) || plantLon
    } catch {
      /* intentionally ignored */
    }
    try {
      const pRad = await pb
        .collection('system_parameters')
        .getFirstListItem('key = "MAX_RADIUS_KM"')
      maxRadiusKm = parseFloat(pRad.value) || maxRadiusKm
    } catch {
      /* intentionally ignored */
    }
    try {
      const pAcc = await pb
        .collection('system_parameters')
        .getFirstListItem('key = "GEO_ACCURACY_TOLERANCE_METERS"')
      accuracyTolerance = parseFloat(pAcc.value) || accuracyTolerance
    } catch {
      /* intentionally ignored */
    }

    const geoCheck = validateGeofence(
      params.latitude,
      params.longitude,
      plantLat,
      plantLon,
      maxRadiusKm,
      params.accuracy || 0,
      accuracyTolerance,
    )

    if (!geoCheck.isWithinRadius) {
      return {
        success: false,
        message:
          geoCheck.reason ||
          `Localização fora do raio permitido: Você está a ${geoCheck.distanceKm} km da CIAFAL. O limite máximo é de ${maxRadiusKm} km.`,
      }
    }

    // Check if driver exists
    const driver = await this.findDriverByDocument(cleanDoc)
    if (!driver) {
      // Create pre-registration
      try {
        const pre = await pb.collection('pre_registrations').create({
          document: cleanDoc,
          name: 'Motorista Externo (Link)',
          whatsapp: cleanPhone,
          vehicle_type: params.vehicleType,
          plate: cleanPlate,
          origin: 'FORA',
          status: 'novo',
          latitude: params.latitude,
          longitude: params.longitude,
          reviewer_notes: `Check-in Externo GPS a ${geoCheck.distanceKm} km da CIAFAL. CPF/CNPJ sem cadastro ativo no SAP.`,
        })

        // Audit pre-registration
        await pb.collection('audit_logs').create({
          user_email: 'checkin@ciafal.public',
          user_name: 'Link Externo Motorista',
          user_role: 'portaria',
          action: 'CREATE_PRE_REGISTRATION',
          resource: 'pre_registrations',
          resource_id: pre.id,
          new_state: 'novo',
          reason: `Check-in externo sem cadastro ativo no SAP (${geoCheck.distanceKm} km)`,
          correlation_id: `PREREG-EXT-${Date.now()}`,
          payload: {
            document: cleanDoc,
            plate: cleanPlate,
            distance_km: geoCheck.distanceKm,
            origin: 'FORA',
          },
        })

        return {
          success: true,
          isPreReg: true,
          message:
            'Você ainda não possui cadastro ativo na CIAFAL. Seu pré-cadastro foi recebido e será analisado pela equipe de logística.',
          data: pre,
        }
      } catch (err: any) {
        return { success: false, message: err?.message || 'Erro ao registrar pré-cadastro.' }
      }
    }

    if (driver.status === 'bloqueado') {
      return {
        success: false,
        message: 'Cadastro bloqueado. Entre em contato com a logística CIAFAL.',
      }
    }

    // Check duplicate
    const activeEntry = await this.findActiveQueueEntryByDriver(driver.id)
    if (activeEntry) {
      return {
        success: false,
        message: `Você já está registrado na fila (Grupo: ${activeEntry.type}, Status: ${activeEntry.status.toUpperCase()}).`,
      }
    }

    // Create entry in FORA
    try {
      const entry = await pb.collection('queue_entries').create({
        driver: driver.id,
        type: 'FORA',
        status: 'disponivel',
        entry_time: new Date().toISOString(),
        latitude: params.latitude,
        longitude: params.longitude,
        distance_km: geoCheck.distanceKm,
        location_status: 'validada',
        driver_name_cached: driver.name,
        driver_doc_cached: driver.document,
        driver_whatsapp_cached: cleanPhone || driver.whatsapp,
        vehicle_plate_cached: cleanPlate,
        vehicle_type_cached: params.vehicleType || 'Carreta',
        reason: `Disponibilidade informada via link externo (Distância recalculada: ${geoCheck.distanceKm} km)`,
        last_event: 'Check-in Externo (FORA)',
        last_operator: 'Motorista via Web App',
      })

      return {
        success: true,
        message: `Disponibilidade confirmada no grupo FORA! Distância calculada: ${geoCheck.distanceKm} km da CIAFAL.`,
        data: entry,
      }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Falha ao processar check-in externo.' }
    }
  },

  // Update Queue Status with Operator Audit & State Tracking
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

      // Explicit audit log
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

  // Pre-registrations CRUD
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

      // Audit
      await pb.collection('audit_logs').create({
        user_email: reviewerUser,
        user_name: reviewerUser,
        user_role: 'operador_logistica',
        action: 'UPDATE_PREREG_STATUS',
        resource: 'pre_registrations',
        resource_id: id,
        previous_state: prev.status,
        new_state: status,
        reason: reviewerNotes || rejectionReason || 'Análise e triagem de pré-cadastro',
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

  // Audit Logs
  async getAuditLogs(limit = 100): Promise<AuditLogEntity[]> {
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

  // Freight Offers (Sprint 1.1 Model Inspection / Preparation)
  async getFreightOffers(): Promise<FreightOfferEntity[]> {
    try {
      return await pb.collection('freight_offers').getFullList<FreightOfferEntity>({
        sort: '-created',
      })
    } catch (err) {
      console.error('Failed to fetch freight offers:', err)
      return []
    }
  },
}
