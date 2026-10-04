import { pb } from '@/lib/pocketbase/client'
import {
  CarrierOperationalRecord,
  CarrierEvaluationRecord,
  CarrierComplaintRecord,
  CarrierComplimentRecord,
  CarrierComplaintReason,
} from '@/domain/carrierHistoryEngine'
import {
  SmartAlertItem,
  detectSmartAlerts,
  DEFAULT_ALERT_RULES,
  SmartAlertRuleConfig,
} from '@/domain/smartAlertsEngine'
import { ScoreRuleVersion, DEFAULT_SCORE_WEIGHTS } from '@/domain/scoreGovernanceEngine'

export interface AuditLogPayload {
  action_type: string
  entity_name: string
  record_id?: string
  user_email: string
  user_name: string
  before_data?: any
  after_data?: any
  justification?: string
}

class CarrierHistoryService {
  /**
   * Registra log de auditoria oficial
   */
  async logAudit(payload: AuditLogPayload): Promise<void> {
    try {
      await pb.collection('audit_logs').create({
        action: payload.action_type,
        user_email: payload.user_email || 'admin.master@ciafal.com.br',
        details: JSON.stringify({
          entity: payload.entity_name,
          record_id: payload.record_id,
          user_name: payload.user_name,
          before: payload.before_data,
          after: payload.after_data,
          justification: payload.justification,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (e) {
      console.warn('Falha ao gravar audit_logs:', e)
    }
  }

  /**
   * Busca registros operacionais reais da coleção carrier_operational_history
   */
  async getOperationalHistory(
    optionsOrLimit?: { perPage?: number; page?: number } | number,
  ): Promise<
    CarrierOperationalRecord[] & { items: CarrierOperationalRecord[]; totalItems: number }
  > {
    const limit =
      typeof optionsOrLimit === 'number' ? optionsOrLimit : optionsOrLimit?.perPage || 200
    try {
      const records = await pb
        .collection('carrier_operational_history')
        .getList<CarrierOperationalRecord>(1, limit, {
          sort: '-transport_date',
        })
      const arr = [...records.items] as any
      arr.items = records.items
      arr.totalItems = records.totalItems
      return arr
    } catch (err) {
      console.warn('Erro ao carregar carrier_operational_history:', err)
      const empty = [] as any
      empty.items = []
      empty.totalItems = 0
      return empty
    }
  }

  /**
   * Busca avaliações reais
   */
  async getEvaluations(limit = 200): Promise<CarrierEvaluationRecord[]> {
    try {
      const records = await pb
        .collection('carrier_evaluations')
        .getList<CarrierEvaluationRecord>(1, limit, {
          sort: '-evaluation_date',
        })
      return records.items
    } catch (err) {
      console.warn('Erro ao carregar carrier_evaluations:', err)
      return []
    }
  }

  /**
   * Busca reclamações reais
   */
  async getComplaints(limit = 200): Promise<CarrierComplaintRecord[]> {
    try {
      const records = await pb
        .collection('carrier_complaints')
        .getList<CarrierComplaintRecord>(1, limit, {
          sort: '-occurrence_date',
        })
      return records.items
    } catch (err) {
      console.warn('Erro ao carregar carrier_complaints:', err)
      return []
    }
  }

  /**
   * Busca elogios reais
   */
  async getCompliments(limit = 200): Promise<CarrierComplimentRecord[]> {
    try {
      const records = await pb
        .collection('carrier_compliments')
        .getList<CarrierComplimentRecord>(1, limit, {
          sort: '-compliment_date',
        })
      return records.items
    } catch (err) {
      console.warn('Erro ao carregar carrier_compliments:', err)
      return []
    }
  }

  /**
   * Salva avaliação com auditoria
   */
  async createEvaluation(
    data: Partial<CarrierEvaluationRecord>,
    userEmail = 'admin.master@ciafal.com.br',
    userName = 'Administrador Master',
  ): Promise<CarrierEvaluationRecord> {
    const created = await pb.collection('carrier_evaluations').create<CarrierEvaluationRecord>(data)
    await this.logAudit({
      action_type: 'CARRIER_EVALUATION_CREATE',
      entity_name: 'carrier_evaluations',
      record_id: created.id,
      user_email: userEmail,
      user_name: userName,
      after_data: data,
      justification: 'Registro de avaliação formal de prestador',
    })
    return created
  }

  /**
   * Busca transportes operacionais para autocomplete de Ordem de Transporte (OT)
   */
  async getAvailableTransportOrders(limit = 100): Promise<
    Array<{
      transport_order_number: string
      sap_transport_number: string
      driver_name: string
      driver_id: string
      vehicle_plate: string
      carrier_name: string
      itinerary_code: string
      itinerary_description: string
      operation_date: string
      customer_summary: string
      remessas: Array<{
        delivery_number: string
        order_number: string
        customer_code: string
        customer_name: string
      }>
    }>
  > {
    try {
      const records = await pb.collection('carrier_operational_history').getList(1, limit, {
        sort: '-transport_date',
      })

      return records.items.map((r, idx) => {
        let remessas: Array<{
          delivery_number: string
          order_number: string
          customer_code: string
          customer_name: string
        }> = []

        if (r.deliveries_json && Array.isArray(r.deliveries_json) && r.deliveries_json.length > 0) {
          remessas = r.deliveries_json.map((rem: any) => ({
            delivery_number: rem.delivery_number || '',
            order_number: rem.order_number || '',
            customer_code: rem.customer_code || '',
            customer_name: rem.customer_name || '',
          }))
        } else {
          // Extrair remessas padrão baseadas nos registros existentes
          const baseRem = (10040000 + idx).toString()
          const cust = r.customers_summary || 'CIAFAL Distribuidora Matriz'
          remessas = [
            {
              delivery_number: baseRem,
              order_number: (4500000 + idx).toString(),
              customer_code: 'CLI-' + (1000 + idx),
              customer_name: cust,
            },
          ]
        }

        const otNumber =
          r.transport_order_number ||
          (r.sap_transport_number ? `OT-${r.sap_transport_number}` : `OT-80010${idx + 1}`)

        return {
          transport_order_number: otNumber,
          sap_transport_number: r.sap_transport_number || '',
          driver_name: r.driver_name || '',
          driver_id: r.driver_id || '',
          vehicle_plate: r.vehicle_plate || '',
          carrier_name: r.carrier_name || '',
          itinerary_code: r.itinerary_code || '',
          itinerary_description: r.itinerary_description || '',
          operation_date: r.transport_date || r.created || new Date().toISOString(),
          customer_summary: r.customers_summary || remessas[0]?.customer_name || '',
          remessas,
        }
      })
    } catch (err) {
      console.warn('Erro ao carregar carrier_operational_history para OT autocomplete:', err)
      return []
    }
  }

  /**
   * Busca motivos cadastrados e ativos de reclamação
   */
  async getComplaintReasons(): Promise<CarrierComplaintReason[]> {
    try {
      const records = await pb
        .collection('carrier_complaint_reasons')
        .getList<CarrierComplaintReason>(1, 100, {
          sort: 'order_index',
          filter: 'is_active = true',
        })
      return records.items
    } catch (err) {
      console.warn('Erro ao carregar carrier_complaint_reasons do banco:', err)
      return [
        { code: 'MOT-01', name: 'Atraso / Prazo de entrega', order_index: 1, is_active: true },
        { code: 'MOT-02', name: 'Cordialidade / Atendimento', order_index: 2, is_active: true },
        { code: 'MOT-03', name: 'Entrega de documentos', order_index: 3, is_active: true },
        {
          code: 'MOT-04',
          name: 'Documentação incorreta ou incompleta',
          order_index: 4,
          is_active: true,
        },
        { code: 'MOT-05', name: 'Segurança no transporte', order_index: 5, is_active: true },
        {
          code: 'MOT-06',
          name: 'Descumprimento de regras de segurança',
          order_index: 6,
          is_active: true,
        },
        { code: 'MOT-07', name: 'Erro de descarga', order_index: 7, is_active: true },
        { code: 'MOT-08', name: 'Descarga em local incorreto', order_index: 8, is_active: true },
        { code: 'MOT-09', name: 'Avaria de material', order_index: 9, is_active: true },
        {
          code: 'MOT-10',
          name: 'Condição inadequada do veículo',
          order_index: 10,
          is_active: true,
        },
        { code: 'MOT-11', name: 'Proteção inadequada da carga', order_index: 11, is_active: true },
        {
          code: 'MOT-12',
          name: 'Problema com amarração da carga',
          order_index: 12,
          is_active: true,
        },
        {
          code: 'MOT-13',
          name: 'Recusa ou dificuldade na descarga',
          order_index: 13,
          is_active: true,
        },
        {
          code: 'MOT-14',
          name: 'Não cumprimento do horário agendado',
          order_index: 14,
          is_active: true,
        },
        {
          code: 'MOT-15',
          name: 'Não cumprimento de orientação do cliente',
          order_index: 15,
          is_active: true,
        },
        { code: 'MOT-16', name: 'Comunicação inadequada', order_index: 16, is_active: true },
        { code: 'MOT-17', name: 'Falta de retorno/comunicação', order_index: 17, is_active: true },
        {
          code: 'MOT-18',
          name: 'Conduta inadequada do motorista',
          order_index: 18,
          is_active: true,
        },
        { code: 'MOT-19', name: 'Documentos não devolvidos', order_index: 19, is_active: true },
        {
          code: 'MOT-20',
          name: 'Divergência de quantidade/material',
          order_index: 20,
          is_active: true,
        },
        {
          code: 'MOT-21',
          name: 'Descumprimento de procedimento CIAFAL',
          order_index: 21,
          is_active: true,
        },
        {
          code: 'MOT-22',
          name: 'Descumprimento de procedimento do cliente',
          order_index: 22,
          is_active: true,
        },
        {
          code: 'MOT-23',
          name: 'Outros',
          order_index: 23,
          is_active: true,
          requires_specification: true,
        },
      ]
    }
  }

  /**
   * Registra reclamação com endpoint governado, número único (REC-TMS-XXXXXX/YYYY),
   * auditoria completa e status inicial 'REGISTRADA'
   */
  async registerComplaintGoverned(payload: {
    target_type: 'MOTORISTA' | 'VEICULO' | 'MOTORISTA_VEICULO' | 'TRANSPORTADORA'
    severity: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
    origin_channel: 'WS' | 'CLIENTE'
    reason_code?: string
    reason_name: string
    reason_specification?: string
    description: string
    transport_order_number?: string
    sap_transport_number?: string
    delivery_number?: string
    customer_code?: string
    customer_name?: string
    customer_display?: string
    driver_name?: string
    driver_id?: string
    vehicle_plate?: string
    carrier_name?: string
    itinerary_code?: string
    operation_date?: string
    has_transport_link: boolean
    unlinked_transport_justification?: string
    user_email?: string
    user_name?: string
    user_role?: string
  }): Promise<{
    success: boolean
    complaint_number: string
    record: CarrierComplaintRecord
    message: string
  }> {
    try {
      const res = await pb.send<{
        success: boolean
        complaint_number: string
        record: CarrierComplaintRecord
        message: string
      }>('/backend/v1/carrier-complaints/register', {
        method: 'POST',
        body: payload,
      })
      return res
    } catch (err: any) {
      console.warn('Fallback para criação direta de carrier_complaints:', err)
      const currentYear = new Date().getFullYear()
      const fallbackSeq = String(Date.now()).slice(-6)
      const complaintNumber = `REC-TMS-${fallbackSeq}/${currentYear}`
      const directData: Partial<CarrierComplaintRecord> = {
        complaint_number: complaintNumber,
        transport_order_number: payload.transport_order_number,
        sap_transport_number: payload.sap_transport_number,
        delivery_number: payload.delivery_number,
        customer_display:
          payload.customer_display ||
          (payload.customer_code
            ? `${payload.customer_code} — ${payload.customer_name}`
            : payload.customer_name),
        customer_code: payload.customer_code,
        customer_name: payload.customer_name,
        target_type: payload.target_type,
        severity: payload.severity,
        origin_channel: payload.origin_channel,
        reason_code: payload.reason_code,
        reason_name: payload.reason_name,
        reason_specification: payload.reason_specification,
        category: payload.origin_channel === 'CLIENTE' ? 'RECLAMACAO_CLIENTE' : 'TRANSPORTE',
        origin_type: payload.origin_channel === 'CLIENTE' ? 'CLIENTE' : 'TRANSPORTE_LOGISTICA',
        description: payload.description,
        driver_name: payload.driver_name,
        driver_id: payload.driver_id,
        vehicle_plate: payload.vehicle_plate,
        carrier_name: payload.carrier_name,
        itinerary_code: payload.itinerary_code,
        operation_date: payload.operation_date || new Date().toISOString(),
        occurrence_date: new Date().toISOString(),
        has_transport_link: payload.has_transport_link,
        unlinked_transport_justification: payload.unlinked_transport_justification,
        status: 'REGISTRADA',
        registered_by_email: payload.user_email || 'operador.tms@ciafal.com.br',
        registered_by_name: payload.user_name || 'Operador Logístico',
        audit_trail_json: [
          {
            date: new Date().toISOString(),
            user: `${payload.user_name || 'Operador'} (${payload.user_email || 'operador@ciafal.com.br'})`,
            action: 'REGISTRO_RECLAMACAO',
            previous_status: '',
            new_status: 'REGISTRADA',
            notes: 'Registro inicial de reclamação encaminhada para análise.',
          },
        ],
      }
      const created = await this.createComplaint(directData, payload.user_email, payload.user_name)
      return {
        success: true,
        complaint_number: complaintNumber,
        record: created,
        message: 'Reclamação registrada com sucesso e encaminhada para análise.',
      }
    }
  }

  /**
   * Salva reclamação com auditoria (legado / fallback)
   */
  async createComplaint(
    data: Partial<CarrierComplaintRecord>,
    userEmail = 'admin.master@ciafal.com.br',
    userName = 'Administrador Master',
  ): Promise<CarrierComplaintRecord> {
    const created = await pb.collection('carrier_complaints').create<CarrierComplaintRecord>(data)
    await this.logAudit({
      action_type: 'CARRIER_COMPLAINT_CREATE',
      entity_name: 'carrier_complaints',
      record_id: created.id,
      user_email: userEmail,
      user_name: userName,
      after_data: data,
      justification: 'Registro de ocorrência/reclamação de prestador',
    })
    return created
  }

  /**
   * Salva elogio com auditoria
   */
  async createCompliment(
    data: Partial<CarrierComplimentRecord>,
    userEmail = 'admin.master@ciafal.com.br',
    userName = 'Administrador Master',
  ): Promise<CarrierComplimentRecord> {
    const created = await pb.collection('carrier_compliments').create<CarrierComplimentRecord>(data)
    await this.logAudit({
      action_type: 'CARRIER_COMPLIMENT_CREATE',
      entity_name: 'carrier_compliments',
      record_id: created.id,
      user_email: userEmail,
      user_name: userName,
      after_data: data,
      justification: 'Registro formal de elogio de cliente/operação',
    })
    return created
  }

  /**
   * Atualiza status/tratamento de uma reclamação
   */
  async updateComplaintTreatment(
    id: string,
    data: Partial<CarrierComplaintRecord>,
    userEmail = 'supervisor@ciafal.com.br',
    userName = 'Supervisor Logística',
  ): Promise<CarrierComplaintRecord> {
    const updated = await pb
      .collection('carrier_complaints')
      .update<CarrierComplaintRecord>(id, data)
    await this.logAudit({
      action_type: 'CARRIER_COMPLAINT_UPDATE_TREATMENT',
      entity_name: 'carrier_complaints',
      record_id: id,
      user_email: userEmail,
      user_name: userName,
      after_data: data,
      justification: `Tratamento formal de reclamação: ${data.status} - ${data.conclusion || ''}`,
    })
    return updated
  }

  // =========================================================================
  // GESTÃO DE ALERTAS INTELIGENTES
  // =========================================================================

  /**
   * Carrega alertas do banco ou calcula dinamicamente com base nas coleções reais
   */
  async getSmartAlerts(
    ruleConfig: SmartAlertRuleConfig = DEFAULT_ALERT_RULES,
  ): Promise<SmartAlertItem[]> {
    try {
      const persisted = await pb.collection('carrier_smart_alerts').getList<any>(1, 100, {
        sort: '-detection_date',
      })
      if (persisted.items.length > 0) {
        return persisted.items.map((it) => ({
          ...it,
          related_transports_json: Array.isArray(it.related_transports_json)
            ? it.related_transports_json
            : typeof it.related_transports_json === 'string'
              ? JSON.parse(it.related_transports_json || '[]')
              : [],
          related_complaints_json: Array.isArray(it.related_complaints_json)
            ? it.related_complaints_json
            : typeof it.related_complaints_json === 'string'
              ? JSON.parse(it.related_complaints_json || '[]')
              : [],
          audit_trail_json: Array.isArray(it.audit_trail_json)
            ? it.audit_trail_json
            : typeof it.audit_trail_json === 'string'
              ? JSON.parse(it.audit_trail_json || '[]')
              : [],
        }))
      }
    } catch (err) {
      console.warn('Erro ao listar carrier_smart_alerts do banco:', err)
    }

    // Se ainda não persistido no banco, calcula em tempo de execução pelos dados reais
    const [history, evaluations, complaints] = await Promise.all([
      this.getOperationalHistory(),
      this.getEvaluations(),
      this.getComplaints(),
    ])

    return detectSmartAlerts(history, evaluations, complaints, ruleConfig)
  }

  /**
   * Atualiza status ou tratamento de um alerta com auditoria
   */
  async updateAlertTreatment(
    alertCode: string,
    updateData: Partial<SmartAlertItem>,
    userEmail: string,
    userName: string,
    justification?: string,
  ): Promise<SmartAlertItem> {
    try {
      // Localiza registro no banco
      const existing = await pb
        .collection('carrier_smart_alerts')
        .getFirstListItem<any>(`alert_code = "${alertCode}"`)
      const currentAuditTrail = Array.isArray(existing.audit_trail_json)
        ? existing.audit_trail_json
        : JSON.parse(existing.audit_trail_json || '[]')

      currentAuditTrail.push({
        date: new Date().toISOString(),
        user: `${userName} (${userEmail})`,
        action: `Alteração de status para ${updateData.status || existing.status}`,
        notes: justification || updateData.action_plan || 'Tratamento de alerta registrado',
      })

      const payload = {
        ...updateData,
        audit_trail_json: currentAuditTrail,
      }

      const updated = await pb.collection('carrier_smart_alerts').update<any>(existing.id, payload)

      await this.logAudit({
        action_type: 'CARRIER_SMART_ALERT_UPDATE',
        entity_name: 'carrier_smart_alerts',
        record_id: existing.id,
        user_email: userEmail,
        user_name: userName,
        before_data: { status: existing.status, plan: existing.action_plan },
        after_data: updateData,
        justification: justification || 'Tratamento de anomalia logística',
      })

      return updated
    } catch (_) {
      // Se ainda não estava persistido, cria agora
      const created = await pb.collection('carrier_smart_alerts').create<any>({
        ...updateData,
        alert_code: alertCode,
        audit_trail_json: [
          {
            date: new Date().toISOString(),
            user: `${userName} (${userEmail})`,
            action: `Criação e tratamento inicial (${updateData.status})`,
            notes: justification,
          },
        ],
      })

      await this.logAudit({
        action_type: 'CARRIER_SMART_ALERT_PERSIST_AND_UPDATE',
        entity_name: 'carrier_smart_alerts',
        record_id: created.id,
        user_email: userEmail,
        user_name: userName,
        after_data: updateData,
        justification: justification || 'Registro formal de tratamento em carrier_smart_alerts',
      })

      return created
    }
  }

  // =========================================================================
  // GESTÃO E VERSIONAMENTO DE REGRAS DE SCORE
  // =========================================================================

  /**
   * Obtém a versão vigente do Score Operacional
   */
  async getActiveScoreRule(): Promise<ScoreRuleVersion> {
    try {
      const record = await pb
        .collection('carrier_score_rule_versions')
        .getFirstListItem<any>('lifecycle_status = "VIGENTE"', {
          sort: '-effective_start_date',
        })
      return {
        id: record.id,
        version_code: record.version_code,
        rule_name: record.rule_name,
        lifecycle_status: record.lifecycle_status,
        weights: {
          servicesEvaluationPct: record.weight_services_evaluation_pct,
          punctualityPct: record.weight_punctuality_pct,
          procedenteComplaintsPct: record.weight_procedente_complaints_pct,
          occurrencesPct: record.weight_occurrences_pct,
          communicationPct: record.weight_communication_pct,
          deliveryHistoryPct: record.weight_delivery_history_pct,
          complimentsPct: record.weight_compliments_pct,
        },
        target_coverage_pct: record.target_coverage_pct || 80,
        min_transports_for_high_confidence: record.min_transports_for_high_confidence || 15,
        min_transports_for_medium_confidence: record.min_transports_for_medium_confidence || 5,
        effective_start_date: record.effective_start_date,
        effective_end_date: record.effective_end_date,
        justification: record.justification,
        created_by_user_email: record.created_by_user_email,
        created_by_user_name: record.created_by_user_name,
        homologated_by_user_email: record.homologated_by_user_email,
        homologated_by_user_name: record.homologated_by_user_name,
        homologated_at: record.homologated_at,
        previous_values_json: record.previous_values_json,
        simulation_impact_json: record.simulation_impact_json,
      }
    } catch (_) {
      // Fallback para padrão
      return {
        version_code: 'REG-SCORE-v1.0.0',
        rule_name: 'Matriz de Score Operacional Padrão CIAFAL 2026',
        lifecycle_status: 'VIGENTE',
        weights: DEFAULT_SCORE_WEIGHTS,
        target_coverage_pct: 80,
        min_transports_for_high_confidence: 15,
        min_transports_for_medium_confidence: 5,
        justification: 'Regra canônica padrão CIAFAL',
      }
    }
  }

  /**
   * Lista todas as versões de regras cadastradas (histórico imutável)
   */
  async listScoreRuleVersions(): Promise<ScoreRuleVersion[]> {
    try {
      const list = await pb.collection('carrier_score_rule_versions').getList<any>(1, 50, {
        sort: '-created',
      })
      return list.items.map((record) => ({
        id: record.id,
        version_code: record.version_code,
        rule_name: record.rule_name,
        lifecycle_status: record.lifecycle_status,
        weights: {
          servicesEvaluationPct: record.weight_services_evaluation_pct,
          punctualityPct: record.weight_punctuality_pct,
          procedenteComplaintsPct: record.weight_procedente_complaints_pct,
          occurrencesPct: record.weight_occurrences_pct,
          communicationPct: record.weight_communication_pct,
          deliveryHistoryPct: record.weight_delivery_history_pct,
          complimentsPct: record.weight_compliments_pct,
        },
        target_coverage_pct: record.target_coverage_pct,
        min_transports_for_high_confidence: record.min_transports_for_high_confidence,
        min_transports_for_medium_confidence: record.min_transports_for_medium_confidence,
        effective_start_date: record.effective_start_date,
        effective_end_date: record.effective_end_date,
        justification: record.justification,
        created_by_user_email: record.created_by_user_email,
        created_by_user_name: record.created_by_user_name,
        homologated_by_user_email: record.homologated_by_user_email,
        homologated_by_user_name: record.homologated_by_user_name,
        homologated_at: record.homologated_at,
        previous_values_json: record.previous_values_json,
        simulation_impact_json: record.simulation_impact_json,
      }))
    } catch (_) {
      return []
    }
  }

  /**
   * Salva nova versão de regra de score (Rascunho ou Homologada) com auditoria
   */
  async createScoreRuleVersion(
    version: ScoreRuleVersion,
    userEmail: string,
    userName: string,
  ): Promise<ScoreRuleVersion> {
    const payload = {
      version_code: version.version_code,
      rule_name: version.rule_name,
      lifecycle_status: version.lifecycle_status,
      weight_services_evaluation_pct: version.weights.servicesEvaluationPct,
      weight_punctuality_pct: version.weights.punctualityPct,
      weight_procedente_complaints_pct: version.weights.procedenteComplaintsPct,
      weight_occurrences_pct: version.weights.occurrencesPct,
      weight_communication_pct: version.weights.communicationPct,
      weight_delivery_history_pct: version.weights.deliveryHistoryPct,
      weight_compliments_pct: version.weights.complimentsPct,
      weights_sum_pct: 100,
      target_coverage_pct: version.target_coverage_pct,
      min_transports_for_high_confidence: version.min_transports_for_high_confidence,
      min_transports_for_medium_confidence: version.min_transports_for_medium_confidence,
      effective_start_date: version.effective_start_date || new Date().toISOString(),
      justification: version.justification,
      created_by_user_email: userEmail,
      created_by_user_name: userName,
      homologated_by_user_email: version.homologated_by_user_email,
      homologated_by_user_name: version.homologated_by_user_name,
      homologated_at: version.homologated_at,
      previous_values_json: version.previous_values_json,
      simulation_impact_json: version.simulation_impact_json,
    }

    const created = await pb.collection('carrier_score_rule_versions').create<any>(payload)

    await this.logAudit({
      action_type: 'CARRIER_SCORE_RULE_CREATE',
      entity_name: 'carrier_score_rule_versions',
      record_id: created.id,
      user_email: userEmail,
      user_name: userName,
      after_data: payload,
      justification: version.justification,
    })

    return {
      ...version,
      id: created.id,
    }
  }

  /**
   * Ativa uma regra homologada tornando-a VIGENTE e arquivando a anterior
   */
  async activateScoreRuleVersion(
    ruleId: string,
    userEmail: string,
    userName: string,
    justification: string,
  ): Promise<void> {
    // 1. Arquiva a regra vigente atual
    try {
      const activeCurrent = await pb
        .collection('carrier_score_rule_versions')
        .getFirstListItem<any>('lifecycle_status = "VIGENTE"')
      if (activeCurrent && activeCurrent.id !== ruleId) {
        await pb.collection('carrier_score_rule_versions').update(activeCurrent.id, {
          lifecycle_status: 'ARQUIVADO',
          effective_end_date: new Date().toISOString(),
        })
      }
    } catch {
      /* intentionally ignored */
    }

    // 2. Torna vigente a nova
    await pb.collection('carrier_score_rule_versions').update(ruleId, {
      lifecycle_status: 'VIGENTE',
      effective_start_date: new Date().toISOString(),
      homologated_by_user_email: userEmail,
      homologated_by_user_name: userName,
      homologated_at: new Date().toISOString(),
    })

    await this.logAudit({
      action_type: 'CARRIER_SCORE_RULE_ACTIVATE',
      entity_name: 'carrier_score_rule_versions',
      record_id: ruleId,
      user_email: userEmail,
      user_name: userName,
      justification,
    })
  }
}

export const carrierHistoryService = new CarrierHistoryService()
