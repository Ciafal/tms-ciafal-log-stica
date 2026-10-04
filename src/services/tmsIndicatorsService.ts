import { pb } from '@/lib/pocketbase/client'
import {
  KpiTargetConfig,
  KpiFilterParams,
  KpiRowData,
  buildKpiMatrix,
  OFFICIAL_TMS_KPIS,
} from '@/domain/tmsIndicatorsEngine'

export interface DeviationActionRecord {
  id?: string
  action_code: string
  kpi_id: string
  kpi_name: string
  category: 'EXPEDICAO' | 'LOGISTICA' | 'TRANSPORTE'
  period_ref: string
  month: number
  year: number
  identified_problem: string
  probable_cause: string
  action_description: string
  responsible_name: string
  responsible_email?: string
  target_module:
    | 'TMS'
    | 'WMS'
    | 'PCP_ROBOTIZADO'
    | 'MANUTENCAO'
    | 'COMERCIAL_CRM'
    | 'EXPEDICAO'
    | 'OUTRO'
  responsible_sector: string
  deadline: string
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  status: 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_VALIDACAO' | 'CONCLUIDA' | 'CANCELADA'
  ai_suggested?: boolean
  ai_diagnosis_summary?: string
  evidence_notes?: string
  evidences_json?: any
  completion_notes?: string
  effectiveness_evaluation?: string
  closed_at?: string
  closed_by_email?: string
  created?: string
}

export interface FilterOptionsData {
  companies: string[]
  centers: string[]
  itineraries: string[]
  regionsUf: string[]
  carriers: string[]
  drivers: string[]
  customers: string[]
}

class TmsIndicatorsService {
  /**
   * Carrega os dados reais de carrier_operational_history
   */
  async fetchOperationalHistory(): Promise<any[]> {
    try {
      // Buscar registros reais de transporte operacional
      const records = await pb.collection('carrier_operational_history').getFullList({
        sort: '-transport_date',
        requestKey: null,
      })
      return records || []
    } catch (err) {
      console.warn('[tmsIndicatorsService] Erro ao buscar carrier_operational_history:', err)
      return []
    }
  }

  /**
   * Carrega as configurações de metas do ano selecionado
   */
  async fetchKpiTargets(year: number): Promise<Record<string, KpiTargetConfig>> {
    const targetMap: Record<string, KpiTargetConfig> = {}
    try {
      const records = await pb.collection('tms_kpi_targets').getFullList({
        filter: `year = ${year}`,
        requestKey: null,
      })

      records.forEach((rec: any) => {
        targetMap[rec.kpi_id] = {
          id: rec.id,
          kpi_id: rec.kpi_id,
          kpi_name: rec.kpi_name,
          category: rec.category,
          year: rec.year,
          company: rec.company,
          center: rec.center,
          target_value: rec.target_value,
          rule: rec.rule,
          target_value_max: rec.target_value_max,
          unit: rec.unit,
          valid_from: rec.valid_from,
          valid_to: rec.valid_to,
          responsible: rec.responsible,
          responsible_email: rec.responsible_email,
          change_justification: rec.change_justification,
          previous_value: rec.previous_value,
          is_active: rec.is_active,
        }
      })
    } catch (err) {
      console.warn('[tmsIndicatorsService] Falha ao carregar tms_kpi_targets:', err)
    }

    // Preenche com padrão caso algum KPI não tenha registro no banco
    OFFICIAL_TMS_KPIS.forEach((kpi) => {
      if (!targetMap[kpi.id]) {
        targetMap[kpi.id] = {
          kpi_id: kpi.id,
          kpi_name: kpi.name,
          category: kpi.category,
          year,
          target_value: kpi.defaultTarget,
          rule: kpi.defaultRule,
          unit: kpi.unit,
          responsible: kpi.defaultResponsible,
          is_active: true,
        }
      }
    })

    return targetMap
  }

  /**
   * Salva ou atualiza uma meta de KPI e grava trilha de auditoria
   */
  async saveKpiTarget(
    target: KpiTargetConfig,
    userEmail: string,
    justification: string,
  ): Promise<void> {
    try {
      let existingRecord: any = null
      if (target.id) {
        existingRecord = await pb.collection('tms_kpi_targets').getOne(target.id)
      } else {
        const found = await pb.collection('tms_kpi_targets').getList(1, 1, {
          filter: `kpi_id = "${target.kpi_id}" && year = ${target.year}`,
        })
        if (found.items.length > 0) {
          existingRecord = found.items[0]
        }
      }

      const prevValue = existingRecord ? existingRecord.target_value : target.previous_value || 0
      const prevRule = existingRecord ? existingRecord.rule : target.rule
      const historyEntry = {
        timestamp: new Date().toISOString(),
        user: userEmail,
        action: existingRecord ? 'TARGET_UPDATE' : 'TARGET_CREATE',
        previous_value: prevValue,
        new_value: target.target_value,
        previous_rule: prevRule,
        new_rule: target.rule,
        justification,
      }

      const currentHistory = Array.isArray(existingRecord?.history_log)
        ? [...existingRecord.history_log, historyEntry]
        : [historyEntry]

      const payload = {
        kpi_id: target.kpi_id,
        kpi_name: target.kpi_name,
        category: target.category,
        year: target.year,
        company: target.company || 'CIAFAL',
        center: target.center || 'TODOS',
        target_value: target.target_value,
        rule: target.rule,
        target_value_max: target.target_value_max || null,
        unit: target.unit,
        valid_from: target.valid_from || `${target.year}-01-01 00:00:00.000Z`,
        valid_to: target.valid_to || `${target.year}-12-31 23:59:59.000Z`,
        responsible: target.responsible,
        responsible_email: target.responsible_email || userEmail,
        change_justification: justification,
        previous_value: prevValue,
        history_log: currentHistory,
        is_active: true,
      }

      if (existingRecord) {
        await pb.collection('tms_kpi_targets').update(existingRecord.id, payload)
      } else {
        await pb.collection('tms_kpi_targets').create(payload)
      }

      // Registrar em audit_logs corporativo
      await this.logAudit({
        event_type: 'TMS_KPI_TARGET_CHANGED',
        user_email: userEmail,
        description: `Meta do indicador "${target.kpi_name}" (${target.year}) alterada para ${target.target_value} ${target.unit} (Regra: ${target.rule}). Justificativa: ${justification}`,
        old_data: { value: prevValue, rule: prevRule },
        new_data: { value: target.target_value, rule: target.rule },
      })
    } catch (err) {
      console.error('[tmsIndicatorsService] Erro ao salvar meta:', err)
      throw err
    }
  }

  /**
   * Cria uma Ação Corretiva para tratamento de desvio
   */
  async createDeviationAction(
    action: Omit<DeviationActionRecord, 'id' | 'action_code' | 'created'>,
    userEmail: string,
  ): Promise<DeviationActionRecord> {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const code = `ACT-TMS-${action.year}-${String(action.month).padStart(2, '0')}-${randomSuffix}`

    const payload = {
      ...action,
      action_code: code,
      status: action.status || 'ABERTA',
    }

    try {
      const record = await pb.collection('tms_deviation_actions').create(payload)

      // Registrar auditoria
      await this.logAudit({
        event_type: 'TMS_DEVIATION_ACTION_CREATED',
        user_email: userEmail,
        description: `Ação ${code} gerada para o desvio do indicador "${action.kpi_name}" em ${action.period_ref}. Responsável: ${action.responsible_name} (${action.responsible_sector}).`,
        new_data: payload,
      })

      return record as unknown as DeviationActionRecord
    } catch (err) {
      console.error('[tmsIndicatorsService] Erro ao criar ação corretiva:', err)
      throw err
    }
  }

  /**
   * Busca ações cadastradas para um determinado KPI e ano
   */
  async fetchActionsByKpi(kpiId: string, year: number): Promise<DeviationActionRecord[]> {
    try {
      const records = await pb.collection('tms_deviation_actions').getFullList({
        filter: `kpi_id = "${kpiId}" && year = ${year}`,
        sort: '-created',
        requestKey: null,
      })
      return records as unknown as DeviationActionRecord[]
    } catch (err) {
      console.warn('[tmsIndicatorsService] Erro ao buscar ações:', err)
      return []
    }
  }

  /**
   * Conclui ou atualiza status de uma ação com avaliação de eficácia
   */
  async updateActionStatus(
    actionId: string,
    status: 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_VALIDACAO' | 'CONCLUIDA' | 'CANCELADA',
    userEmail: string,
    notes?: string,
    effectivenessEvaluation?: string,
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        completion_notes: notes || '',
        effectiveness_evaluation: effectivenessEvaluation || '',
      }
      if (status === 'CONCLUIDA' || status === 'CANCELADA') {
        updateData.closed_at = new Date().toISOString()
        updateData.closed_by_email = userEmail
      }

      await pb.collection('tms_deviation_actions').update(actionId, updateData)

      await this.logAudit({
        event_type: 'TMS_DEVIATION_ACTION_STATUS_CHANGED',
        user_email: userEmail,
        description: `Status da ação ID ${actionId} alterado para ${status}. Notas: ${notes || 'Sem observações'}`,
        new_data: updateData,
      })
    } catch (err) {
      console.error('[tmsIndicatorsService] Erro ao atualizar status da ação:', err)
      throw err
    }
  }

  /**
   * Extrai opções únicas dos dados operacionais para alimentar os selects de filtro
   */
  extractFilterOptions(records: any[]): FilterOptionsData {
    const companiesSet = new Set<string>()
    const centersSet = new Set<string>()
    const itinSet = new Set<string>()
    const regionsSet = new Set<string>()
    const carriersSet = new Set<string>()
    const driversSet = new Set<string>()
    const custSet = new Set<string>()

    records.forEach((r) => {
      if (r.company_code) companiesSet.add(r.company_code)
      if (r.origin_plant) centersSet.add(r.origin_plant)
      if (r.center_code) centersSet.add(r.center_code)
      if (r.itinerary_code) itinSet.add(r.itinerary_code)
      if (r.destination_uf) regionsSet.add(r.destination_uf)
      if (r.region) regionsSet.add(r.region)
      if (r.carrier_name) carriersSet.add(r.carrier_name)
      if (r.driver_name) driversSet.add(r.driver_name)
      if (r.customers_summary) {
        // Separa clientes caso venham com vírgula
        r.customers_summary.split(',').forEach((c: string) => {
          const trim = c.trim()
          if (trim.length > 2 && trim.length < 40) custSet.add(trim)
        })
      }
    })

    return {
      companies: Array.from(companiesSet).sort(),
      centers: Array.from(centersSet).sort(),
      itineraries: Array.from(itinSet).sort(),
      regionsUf: Array.from(regionsSet).sort(),
      carriers: Array.from(carriersSet).sort(),
      drivers: Array.from(driversSet).sort(),
      customers: Array.from(custSet).slice(0, 50).sort(),
    }
  }

  /**
   * Monta a Matriz Anual consolidada
   */
  async buildConsolidatedMatrix(
    year: number,
    filters: KpiFilterParams,
  ): Promise<{ rows: KpiRowData[]; rawRecords: any[]; filterOptions: FilterOptionsData }> {
    const [rawRecords, targetConfigs] = await Promise.all([
      this.fetchOperationalHistory(),
      this.fetchKpiTargets(year),
    ])

    const rows = buildKpiMatrix(rawRecords, targetConfigs, year, filters)
    const filterOptions = this.extractFilterOptions(rawRecords)

    return {
      rows,
      rawRecords,
      filterOptions,
    }
  }

  /**
   * Grava evento no audit_logs corporativo
   */
  private async logAudit(payload: {
    event_type: string
    user_email: string
    description: string
    old_data?: any
    new_data?: any
  }): Promise<void> {
    try {
      await pb.collection('audit_logs').create({
        user_name: payload.user_email || 'Operador TMS CIAFAL',
        user_email: payload.user_email || 'sistema@ciafal.com.br',
        action: payload.event_type,
        collection_name: 'tms_indicators',
        record_id: 'TMS_KPIS',
        changes: {
          description: payload.description,
          old_data: payload.old_data || null,
          new_data: payload.new_data || null,
        },
      })
    } catch (err) {
      console.warn('[tmsIndicatorsService] Aviso ao gravar audit_logs:', err)
    }
  }
}

export const tmsIndicatorsService = new TmsIndicatorsService()
