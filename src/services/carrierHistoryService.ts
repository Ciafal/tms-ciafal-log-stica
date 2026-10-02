import pb from '@/lib/pocketbase/client'
import {
  CarrierOperationalRecord,
  CarrierEvaluationRecord,
  CarrierComplaintRecord,
  CarrierComplimentRecord,
} from '@/domain/carrierHistoryEngine'

export class CarrierHistoryService {
  /**
   * Busca registros operacionais históricos com paginação e filtros
   */
  async getOperationalHistory(params?: {
    filter?: string
    sort?: string
    page?: number
    perPage?: number
  }): Promise<{ items: CarrierOperationalRecord[]; totalItems: number }> {
    try {
      const res = await pb
        .collection('carrier_operational_history')
        .getList<CarrierOperationalRecord>(params?.page || 1, params?.perPage || 100, {
          filter: params?.filter || '',
          sort: params?.sort || '-transport_date',
        })
      return { items: res.items, totalItems: res.totalItems }
    } catch (err) {
      console.warn('Falha ao listar carrier_operational_history:', err)
      return { items: [], totalItems: 0 }
    }
  }

  /**
   * Salva ou cria registro histórico operacional
   */
  async saveOperationalRecord(
    record: Partial<CarrierOperationalRecord>,
  ): Promise<CarrierOperationalRecord> {
    if (record.id) {
      return await pb
        .collection('carrier_operational_history')
        .update<CarrierOperationalRecord>(record.id, record)
    }
    return await pb
      .collection('carrier_operational_history')
      .create<CarrierOperationalRecord>(record)
  }

  /**
   * Lista avaliações estruturadas
   */
  async getEvaluations(filter?: string): Promise<CarrierEvaluationRecord[]> {
    try {
      return await pb.collection('carrier_evaluations').getFullList<CarrierEvaluationRecord>({
        filter: filter || '',
        sort: '-created',
      })
    } catch (err) {
      console.warn('Falha ao listar carrier_evaluations:', err)
      return []
    }
  }

  /**
   * Cria nova avaliação com auditoria
   */
  async createEvaluation(
    evaluation: CarrierEvaluationRecord,
    userEmail?: string,
    userName?: string,
  ): Promise<CarrierEvaluationRecord> {
    const created = await pb.collection('carrier_evaluations').create<CarrierEvaluationRecord>({
      ...evaluation,
      origin_user_email: userEmail || evaluation.origin_user_email,
      origin_user_name: userName || evaluation.origin_user_name,
      evaluation_date: evaluation.evaluation_date || new Date().toISOString(),
    })

    // Registrar em audit_logs
    try {
      await pb.collection('audit_logs').create({
        user_email: userEmail || 'operador@ciafal.com.br',
        user_name: userName || 'Operador TMS',
        user_role: 'operador_logistica',
        action: 'CRIAR_AVALIACAO_PRESTADOR',
        resource: 'carrier_evaluations',
        resource_id: created.id,
        new_state: JSON.stringify({
          target: created.target_type,
          driver: created.driver_name,
          plate: created.vehicle_plate,
          rating_driver: created.driver_avg_score,
          rating_vehicle: created.vehicle_avg_score,
        }),
        reason: 'Registro de avaliação de qualidade operacional de prestador',
        correlation_id: `EVAL-${Date.now()}`,
      })
    } catch {
      /* intentionally ignored */
    }

    return created
  }

  /**
   * Lista reclamações
   */
  async getComplaints(filter?: string): Promise<CarrierComplaintRecord[]> {
    try {
      return await pb.collection('carrier_complaints').getFullList<CarrierComplaintRecord>({
        filter: filter || '',
        sort: '-created',
      })
    } catch (err) {
      console.warn('Falha ao listar carrier_complaints:', err)
      return []
    }
  }

  /**
   * Registra nova reclamação
   */
  async createComplaint(
    complaint: Omit<CarrierComplaintRecord, 'id'>,
    userEmail?: string,
    userName?: string,
  ): Promise<CarrierComplaintRecord> {
    const complaintNumber = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
    const payload = {
      ...complaint,
      complaint_number: complaint.complaint_number || complaintNumber,
      status: complaint.status || 'REGISTRADA',
      registered_by_email: userEmail || complaint.registered_by_email,
      registered_by_name: userName || complaint.registered_by_name,
      occurrence_date: complaint.occurrence_date || new Date().toISOString(),
      audit_trail_json: [
        {
          date: new Date().toISOString(),
          user: userName || 'Operador',
          action: 'REGISTRO_INICIAL',
          new_status: 'REGISTRADA',
        },
      ],
    }

    const created = await pb
      .collection('carrier_complaints')
      .create<CarrierComplaintRecord>(payload)

    // Audit log
    try {
      await pb.collection('audit_logs').create({
        user_email: userEmail || 'operador@ciafal.com.br',
        user_name: userName || 'Operador TMS',
        user_role: 'operador_logistica',
        action: 'REGISTRAR_RECLAMACAO_PRESTADOR',
        resource: 'carrier_complaints',
        resource_id: created.id,
        new_state: JSON.stringify({
          number: created.complaint_number,
          category: created.category,
          severity: created.severity,
          driver: created.driver_name,
          plate: created.vehicle_plate,
        }),
        reason: 'Registro formal de reclamação operacional',
        correlation_id: `COMP-${Date.now()}`,
      })
    } catch {
      /* intentionally ignored */
    }

    return created
  }

  /**
   * Tratamento / Atualização de Reclamação por responsável autorizado (Supervisor / Gestor)
   */
  async updateComplaintTreatment(
    id: string,
    data: {
      status: CarrierComplaintRecord['status']
      analysis_notes?: string
      driver_carrier_manifestation?: string
      conclusion?: string
      action_taken?: string
      analyst_email: string
      analyst_name: string
    },
  ): Promise<CarrierComplaintRecord> {
    const existing = await pb.collection('carrier_complaints').getOne<CarrierComplaintRecord>(id)
    const auditTrail = Array.isArray(existing.audit_trail_json)
      ? [...existing.audit_trail_json]
      : []

    auditTrail.push({
      date: new Date().toISOString(),
      user: data.analyst_name,
      action: `TRATAMENTO_STATUS_${data.status}`,
      previous_status: existing.status,
      new_status: data.status,
    })

    const payload = {
      ...data,
      resolved_at: [
        'PROCEDENTE',
        'IMPROCEDENTE',
        'PARCIALMENTE_PROCEDENTE',
        'TRATADA',
        'ENCERRADA',
      ].includes(data.status)
        ? new Date().toISOString()
        : existing.resolved_at,
      audit_trail_json: auditTrail,
    }

    const updated = await pb
      .collection('carrier_complaints')
      .update<CarrierComplaintRecord>(id, payload)

    // Log de auditoria
    try {
      await pb.collection('audit_logs').create({
        user_email: data.analyst_email,
        user_name: data.analyst_name,
        user_role: 'supervisor',
        action: 'TRATAMENTO_RECLAMACAO',
        resource: 'carrier_complaints',
        resource_id: id,
        previous_state: existing.status,
        new_state: data.status,
        reason: data.conclusion || data.analysis_notes || 'Tratamento de reclamação de prestador',
        correlation_id: `TREAT-${id}-${Date.now()}`,
      })
    } catch {
      /* intentionally ignored */
    }

    return updated
  }

  /**
   * Lista elogios
   */
  async getCompliments(filter?: string): Promise<CarrierComplimentRecord[]> {
    try {
      return await pb.collection('carrier_compliments').getFullList<CarrierComplimentRecord>({
        filter: filter || '',
        sort: '-created',
      })
    } catch (err) {
      console.warn('Falha ao listar carrier_compliments:', err)
      return []
    }
  }

  /**
   * Cria novo elogio
   */
  async createCompliment(
    compliment: Omit<CarrierComplimentRecord, 'id'>,
    userName?: string,
  ): Promise<CarrierComplimentRecord> {
    const complimentNumber = `ELOG-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
    const payload = {
      ...compliment,
      compliment_number: compliment.compliment_number || complimentNumber,
      registered_by_name: userName || compliment.registered_by_name || 'Operador TMS',
      compliment_date: compliment.compliment_date || new Date().toISOString(),
    }

    const created = await pb
      .collection('carrier_compliments')
      .create<CarrierComplimentRecord>(payload)

    // Audit log
    try {
      await pb.collection('audit_logs').create({
        user_email: 'operador@ciafal.com.br',
        user_name: userName || 'Operador TMS',
        user_role: 'operador_logistica',
        action: 'REGISTRAR_ELOGIO_PRESTADOR',
        resource: 'carrier_compliments',
        resource_id: created.id,
        new_state: JSON.stringify({
          number: created.compliment_number,
          category: created.category,
          driver: created.driver_name,
        }),
        reason: 'Registro de ocorrência positiva / elogio',
        correlation_id: `COMPL-${Date.now()}`,
      })
    } catch {
      /* intentionally ignored */
    }

    return created
  }
}

export const carrierHistoryService = new CarrierHistoryService()
