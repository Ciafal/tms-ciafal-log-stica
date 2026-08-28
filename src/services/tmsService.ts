// TMS CIAFAL Centralized PocketBase Data Services

import pb from '@/lib/pocketbase/client'
import {
  DriverEntity,
  QueueEntryEntity,
  PreRegistrationEntity,
  AuditLogEntity,
  isValidDocument,
  validateGeofence,
} from '@/domain/rules'

export interface CreateQueueEntryParams {
  document: string
  whatsapp: string
  plate: string
  vehicleType: string
  type: 'PORTA' | 'FORA'
  latitude?: number
  longitude?: number
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

  // Check if driver is already in queue
  async findActiveQueueEntryByDriver(driverId: string): Promise<QueueEntryEntity | null> {
    try {
      const records = await pb.collection('queue_entries').getList<QueueEntryEntity>(1, 1, {
        filter: `driver = "${driverId}" && (status != "removido" && status != "atribuido")`,
      })
      return records.items[0] || null
    } catch (_) {
      return null
    }
  },

  // Get full operational queue
  async getOperationalQueue(): Promise<QueueEntryEntity[]> {
    try {
      const records = await pb.collection('queue_entries').getFullList<QueueEntryEntity>({
        sort: '-type,entry_time', // PORTA first, then by earliest entry_time
        expand: 'driver,vehicle',
      })
      return records
    } catch (err) {
      console.error('Failed to fetch queue:', err)
      return []
    }
  },

  // Submit Totem Entry (PORTA)
  async submitTotemEntry(
    params: CreateQueueEntryParams,
  ): Promise<{ success: boolean; message: string; data?: any; isPreReg?: boolean }> {
    const cleanDoc = params.document.replace(/\D/g, '')
    const cleanPhone = params.whatsapp.replace(/\D/g, '').replace(/^55/, '')

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
          plate: params.plate.toUpperCase().trim(),
          origin: 'PORTA',
          status: 'pendente',
          reviewer_notes: 'Entrada pelo Totem da Portaria. CPF/CNPJ sem cadastro ativo no SAP.',
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

    // Check duplicate
    const activeEntry = await this.findActiveQueueEntryByDriver(driver.id)
    if (activeEntry) {
      return {
        success: false,
        message: `Motorista já se encontra na fila (Grupo: ${activeEntry.type}, Status: ${activeEntry.status.toUpperCase()}).`,
      }
    }

    // Find or create vehicle
    let vehicleId = ''
    const cleanPlate = (params.plate || '').toUpperCase().trim()
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

    // Create entry in PORTA
    try {
      const entry = await pb.collection('queue_entries').create({
        driver: driver.id,
        vehicle: vehicleId || null,
        type: 'PORTA',
        status: 'disponivel',
        entry_time: new Date().toISOString(),
        location_status: 'validada',
        distance_km: 0,
        driver_name_cached: driver.name,
        driver_doc_cached: driver.document,
        driver_whatsapp_cached: cleanPhone || driver.whatsapp,
        vehicle_plate_cached: cleanPlate,
        vehicle_type_cached: params.vehicleType || 'Carreta',
        reason: 'Entrada registrada via Totem da Portaria',
        last_event: 'Entrada na Fila (PORTA)',
        last_operator: 'Totem Portaria',
      })

      return {
        success: true,
        message: 'Entrada na Fila PORTA registrada com sucesso!',
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

    const docValidation = isValidDocument(cleanDoc)
    if (!docValidation.valid) {
      return { success: false, message: 'Documento (CPF/CNPJ) inválido.' }
    }

    // Geolocation check
    if (!params.latitude || !params.longitude) {
      return {
        success: false,
        message:
          'Acesso à localização obrigatório: autorize o GPS do seu celular para entrar no grupo FORA.',
      }
    }

    const geoCheck = validateGeofence(params.latitude, params.longitude)
    if (!geoCheck.isWithinRadius) {
      return {
        success: false,
        message: `Localização fora do raio permitido: Você está a ${geoCheck.distanceKm} km da CIAFAL. O limite máximo é de 60 km.`,
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
          plate: params.plate?.toUpperCase().trim(),
          origin: 'FORA',
          status: 'pendente',
          latitude: params.latitude,
          longitude: params.longitude,
          reviewer_notes: `Check-in Externo GPS a ${geoCheck.distanceKm} km da CIAFAL. CPF/CNPJ sem cadastro ativo.`,
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
      const cleanPlate = (params.plate || '').toUpperCase().trim()
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
        reason: `Disponibilidade informada via link externo (Distância: ${geoCheck.distanceKm} km)`,
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

  // Update Queue Status with Operator Audit
  async updateQueueStatus(
    entryId: string,
    newStatus: string,
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

      // Also explicitly write to audit_logs
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
          notes: operatorNotes,
        },
      })

      return true
    } catch (err) {
      console.error('Error updating queue status:', err)
      return false
    }
  },

  // Pre-registrations
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
    status: 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado',
    reviewerUser: string,
    reviewerNotes: string,
    rejectionReason?: string,
  ): Promise<boolean> {
    try {
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
        new_state: status,
        reason: reviewerNotes || rejectionReason || 'Análise de pré-cadastro',
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
}
