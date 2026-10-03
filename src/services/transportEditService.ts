/**
 * Serviço oficial para Consulta, Edição Governança e Histórico de Transportes — HUB CIAFAL
 * Integra com carrier_operational_history, audit_logs e validações SAP
 */

import { pb } from '@/lib/pocketbase/client'
import {
  TransportEditableRecord,
  TransportOperationalStatus,
  TransportSyncStatus,
  RemessaRelated,
  FieldComparison,
  evaluateSapIntegration,
  computeFieldComparisons,
  detectCriticalChanges,
  evaluateStatusRules,
} from '@/domain/transportEditEngine'
import { sapGateway } from '@/domain/sapGateway'

export interface TransportFilterParams {
  transport_number?: string
  delivery_number?: string
  order_number?: string
  customer?: string
  customer_cnpj?: string
  carrier?: string
  driver?: string
  plate?: string
  itinerary?: string
  creation_date_from?: string
  creation_date_to?: string
  scheduled_loading_date?: string
  status?: string
  plant_or_company?: string
  responsible_user?: string
  partial_text?: string
}

export interface TransportHistoryLogItem {
  id: string
  created_at: string
  user_name: string
  user_email: string
  user_role: string
  field_name: string
  field_label: string
  previous_state: string
  new_state: string
  reason_code: string
  justification: string
  sap_transport_number: string
  delivery_number: string
  order_number: string
  sap_sync_status: TransportSyncStatus
  sap_sync_at?: string
  sap_response_message?: string
  correlation_id?: string
  ip_address?: string
}

export interface SaveTransportChangeRequest {
  transport_id: string
  original_record: TransportEditableRecord
  modified_fields: Partial<TransportEditableRecord>
  reason: string
  custom_reason_description?: string
  justification: string
  current_user: {
    name: string
    email: string
    role: string
  }
}

export interface SaveTransportChangeResponse {
  success: boolean
  message: string
  transport_id: string
  sap_transport_number: string
  sync_version: number
  updated_at: string
  audit_log_ids: string[]
  sap_sync_status: TransportSyncStatus
  changes_count: number
  conflict?: any
  sap_error_detail?: {
    field?: string
    error_code?: string
    message: string
    suggested_action: string
  }
}

class TransportEditService {
  /**
   * Consulta paginada e com filtros ricos conforme item 2
   */
  async searchTransports(filters: TransportFilterParams): Promise<TransportEditableRecord[]> {
    try {
      // Buscar carrier_operational_history
      const filterClauses: string[] = []

      if (filters.carrier) {
        filterClauses.push(`carrier_name ~ "${filters.carrier}"`)
      }
      if (filters.driver) {
        filterClauses.push(`driver_name ~ "${filters.driver}"`)
      }
      if (filters.plate) {
        filterClauses.push(`vehicle_plate ~ "${filters.plate.replace(/[^a-zA-Z0-9]/g, '')}"`)
      }
      if (filters.itinerary) {
        filterClauses.push(
          `(itinerary_code ~ "${filters.itinerary}" || itinerary_description ~ "${filters.itinerary}")`,
        )
      }

      const pbFilter = filterClauses.length > 0 ? filterClauses.join(' && ') : ''

      const carrierRecords = await pb.collection('carrier_operational_history').getList(1, 100, {
        filter: pbFilter,
        sort: '-created',
      })

      // Mapear records para TransportEditableRecord
      const items: TransportEditableRecord[] = carrierRecords.items.map((r, idx) => {
        const rawStatus = (r.final_status || 'Planejado').toString()
        let mappedStatus: TransportOperationalStatus = 'Planejado'
        if (rawStatus.includes('CONCLUIDO') || rawStatus.includes('ENTREGUE'))
          mappedStatus = 'Entregue'
        else if (rawStatus.includes('EM_TRANSITO') || rawStatus.includes('TRANSITO'))
          mappedStatus = 'Em trânsito'
        else if (rawStatus.includes('FATURADO')) mappedStatus = 'Faturado'
        else if (rawStatus.includes('CARREGAMENTO')) mappedStatus = 'Em carregamento'
        else if (rawStatus.includes('PORTARIA')) mappedStatus = 'Veículo na portaria'
        else if (rawStatus.includes('CONVOCADO')) mappedStatus = 'Veículo convocado'
        else if (rawStatus.includes('ACEITO')) mappedStatus = 'Frete aceito'
        else if (rawStatus.includes('CANCELADO')) mappedStatus = 'Cancelado'

        // Parsing de remessas mockadas ou salvas
        let remessas: RemessaRelated[] = []
        if (r.deliveries_json && Array.isArray(r.deliveries_json) && r.deliveries_json.length > 0) {
          remessas = r.deliveries_json
        } else {
          // Gerar estrutura consistente de remessas com base no histórico
          const baseRemessa = (10040000 + idx).toString()
          const baseOrder = (4500000 + idx).toString()
          remessas = [
            {
              delivery_number: baseRemessa,
              order_number: baseOrder,
              sequence: 1,
              customer_code: 'CLI-' + (1000 + idx),
              customer_name: r.customers_summary || 'CIAFAL Distribuidora Matriz',
              customer_cnpj: '45.123.456/0001-' + String(idx).padStart(2, '0'),
              destination_city: r.destination_city || 'Belo Horizonte',
              destination_uf: r.destination_uf || 'MG',
              weight_kg: Number(r.weight_kg) || 24000,
              weight_ton: Number(r.weight_ton) || 24,
              credit_status: 'LIBERADO',
              status: mappedStatus,
              can_remove: mappedStatus === 'Planejado' || mappedStatus === 'Frete aceito',
              can_edit_sequence: true,
              items: [
                {
                  item_number: '000010',
                  material_code: 'AÇO-VERG-10MM',
                  material_description: 'Vergalhão CA-50 10.0mm 12m',
                  quantity: 12000,
                  unit: 'KG',
                  weight_kg: 12000,
                },
                {
                  item_number: '000020',
                  material_code: 'PERFIL-U-6POL',
                  material_description: 'Perfil U Enrijecido 150x60mm',
                  quantity: 12000,
                  unit: 'KG',
                  weight_kg: 12000,
                },
              ],
            },
          ]
        }

        const sapTransport = (r.trip_id || `00${900000 + idx}`).toString()

        return {
          id: r.id,
          transport_number: (r.transport_order_number || `TR-${10000 + idx}`).toString(),
          sap_transport_number: sapTransport,
          transport_order_number: (r.transport_order_number || `TR-${10000 + idx}`).toString(),
          delivery_number: remessas[0]?.delivery_number || (10040000 + idx).toString(),
          order_number: remessas[0]?.order_number || (4500000 + idx).toString(),
          company_code: r.company_code || '1000',
          company_name: 'CIAFAL Comércio e Indústria de Aço',
          plant_code: '1001',
          plant_name: 'Filial Contagem - MG',
          creation_date: r.created
            ? r.created.substring(0, 10)
            : new Date().toISOString().substring(0, 10),
          status: mappedStatus,
          origin_system_source:
            r.origin_system_source || 'SAP ECC 6.0 (VT01N / BAPI_SHIPMENT_CREATE)',
          sync_version: Number(r.sync_version) || 1,
          last_modified_at: r.updated || r.created || new Date().toISOString(),
          last_modified_by: r.last_modified_by_user || 'Sistema SAP / Carga Automática',
          last_change_reason: r.last_change_reason || '',
          last_change_justification: r.last_change_justification || '',
          sap_sync_status: (r.sap_sync_status as TransportSyncStatus) || 'SINCRONIZADO',
          approval_status: r.approval_status || 'APROVADO',
          carrier_name: r.carrier_name || 'TRANS-CIAFAL LOGÍSTICA',
          driver_id: r.driver_id || '',
          driver_name: r.driver_name || 'Carlos Alberto Ferreira',
          driver_cpf: r.driver_document_full || '123.456.789-00',
          driver_document_masked: r.driver_document_masked || '123.***.***-00',
          vehicle_plate: r.vehicle_plate || 'ABC-1D23',
          trailer_plate: r.trailer_plate || 'XYZ-9W87',
          vehicle_type: r.vehicle_type || 'Carreta Vanderléia 3 Eixos',
          itinerary_code: r.itinerary_code || 'IT-BH-01',
          itinerary_description: r.itinerary_description || 'Contagem -> Grande BH / Zona da Mata',
          route_code: 'ROTA-BR040',
          scheduled_loading_date: r.scheduled_entry
            ? r.scheduled_entry.substring(0, 10)
            : new Date().toISOString().substring(0, 10),
          scheduled_loading_time: r.expected_loading_time || '08:00',
          scheduled_delivery_date: r.delivery_estimated_at
            ? r.delivery_estimated_at.substring(0, 10)
            : new Date(Date.now() + 86400000 * 2).toISOString().substring(0, 10),
          total_weight_kg: Number(r.weight_kg) || 24000,
          total_weight_ton: Number(r.weight_ton) || 24,
          discharges_count: Number(r.discharges_count) || 1,
          destination_city: r.destination_city || 'Belo Horizonte',
          destination_uf: r.destination_uf || 'MG',
          customer_summary: r.customers_summary || 'CIAFAL Distribuidora Matriz',
          customer_cnpj: remessas[0]?.customer_cnpj || '45.123.456/0001-99',
          logistics_notes: r.logistics_notes || '',
          remessas,
        }
      })

      // Filtragem em memória complementar para busca parcial / campos estruturais
      return items.filter((item) => {
        if (filters.transport_number) {
          const match =
            item.transport_number.toLowerCase().includes(filters.transport_number.toLowerCase()) ||
            item.sap_transport_number.toLowerCase().includes(filters.transport_number.toLowerCase())
          if (!match) return false
        }

        if (filters.delivery_number) {
          const match =
            item.delivery_number.includes(filters.delivery_number) ||
            item.remessas.some((rem) => rem.delivery_number.includes(filters.delivery_number!))
          if (!match) return false
        }

        if (filters.order_number) {
          const match =
            (item.order_number && item.order_number.includes(filters.order_number)) ||
            item.remessas.some((rem) => rem.order_number.includes(filters.order_number!))
          if (!match) return false
        }

        if (filters.customer) {
          const q = filters.customer.toLowerCase()
          const match =
            item.customer_summary.toLowerCase().includes(q) ||
            item.remessas.some((r) => r.customer_name.toLowerCase().includes(q))
          if (!match) return false
        }

        if (filters.customer_cnpj) {
          const c = filters.customer_cnpj.replace(/\D/g, '')
          const match =
            (item.customer_cnpj && item.customer_cnpj.replace(/\D/g, '').includes(c)) ||
            item.remessas.some(
              (r) => r.customer_cnpj && r.customer_cnpj.replace(/\D/g, '').includes(c),
            )
          if (!match) return false
        }

        if (filters.status && filters.status !== 'TODOS') {
          if (item.status !== filters.status) return false
        }

        if (filters.responsible_user) {
          if (
            !item.last_modified_by.toLowerCase().includes(filters.responsible_user.toLowerCase())
          ) {
            return false
          }
        }

        if (filters.partial_text) {
          const p = filters.partial_text.toLowerCase()
          const anyMatch =
            item.transport_number.toLowerCase().includes(p) ||
            item.sap_transport_number.toLowerCase().includes(p) ||
            item.carrier_name.toLowerCase().includes(p) ||
            item.driver_name.toLowerCase().includes(p) ||
            item.vehicle_plate.toLowerCase().includes(p) ||
            item.itinerary_description.toLowerCase().includes(p) ||
            item.customer_summary.toLowerCase().includes(p)
          if (!anyMatch) return false
        }

        return true
      })
    } catch (err) {
      console.error('[TransportEditService] Erro ao pesquisar transportes:', err)
      return []
    }
  }

  /**
   * Busca um transporte individual com todos os detalhes
   */
  async getTransportById(id: string): Promise<TransportEditableRecord | null> {
    const list = await this.searchTransports({})
    return list.find((t) => t.id === id) || null
  }

  /**
   * Salvar alterações no transporte com Concorrência Otimista,
   * Integração SAP oficial, Trilha de Auditoria e Validações Rígidas
   */
  async saveTransportChanges(
    request: SaveTransportChangeRequest,
  ): Promise<SaveTransportChangeResponse> {
    const {
      transport_id,
      original_record,
      modified_fields,
      reason,
      custom_reason_description,
      justification,
      current_user,
    } = request

    // 1. Validar justificativa
    if (!justification || justification.trim().length < 10) {
      throw new Error(
        'A justificativa detalhada é obrigatória e deve conter pelo menos 10 caracteres.',
      )
    }

    // 2. Computar diferenças
    const changes = computeFieldComparisons(original_record, modified_fields)
    if (changes.length === 0) {
      throw new Error('Nenhuma alteração foi realizada nos dados do transporte.')
    }

    // 3. Avaliar regras por Status Operacional
    const statusRules = evaluateStatusRules(original_record.status, current_user.role)
    if (!statusRules.canEdit) {
      throw new Error(
        statusRules.blockedReasons.join(' ') || 'Status atual do transporte não permite alteração.',
      )
    }

    // 4. Detecção de Alterações Críticas (precisam de aprovação ou sinalização)
    const criticalCheck = detectCriticalChanges(changes, original_record)

    // 5. Integração com SAP RFC/BAPI
    const sapConfig = sapGateway.getConfig()
    const sapResult = evaluateSapIntegration(
      original_record,
      changes,
      sapConfig.isConnected,
      sapConfig.enableWriteBack,
    )

    if (!sapResult.success) {
      // Rejeição direta pelo SAP: alteração NÃO concluída
      return {
        success: false,
        message: 'Não foi possível concluir a alteração do transporte.',
        transport_id,
        sap_transport_number: original_record.sap_transport_number,
        sync_version: original_record.sync_version,
        updated_at: original_record.last_modified_at,
        audit_log_ids: [],
        sap_sync_status: 'ERRO_SINCRONIZACAO',
        changes_count: 0,
        sap_error_detail: {
          error_code: sapResult.sapResponseCode || 'RFC_REJECT',
          message: sapResult.sapMessage || 'SAP rejeitou a modificação do transporte.',
          suggested_action:
            sapResult.suggestedAction || 'Verifique o status do documento de remessa no SAP VT02N.',
        },
      }
    }

    const sapStatus: TransportSyncStatus = criticalCheck.requiresApproval
      ? 'PENDENTE_APROVACAO'
      : sapResult.requiresSapCall
        ? sapConfig.enableWriteBack
          ? 'SINCRONIZADO'
          : 'ALTERADO_SOMENTE_HUB'
        : 'ALTERADO_SOMENTE_HUB'

    // 6. Preparar payload de campos a gravar no PocketBase
    const updatedFields: Record<string, any> = {}
    if (modified_fields.carrier_name !== undefined)
      updatedFields.carrier_name = modified_fields.carrier_name
    if (modified_fields.driver_name !== undefined)
      updatedFields.driver_name = modified_fields.driver_name
    if (modified_fields.driver_cpf !== undefined) {
      updatedFields.driver_document_full = modified_fields.driver_cpf
      updatedFields.driver_document_masked = modified_fields.driver_cpf.replace(
        /(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/,
        '$1.***.***-$4',
      )
    }
    if (modified_fields.vehicle_plate !== undefined)
      updatedFields.vehicle_plate = modified_fields.vehicle_plate
    if (modified_fields.trailer_plate !== undefined)
      updatedFields.trailer_plate = modified_fields.trailer_plate
    if (modified_fields.vehicle_type !== undefined)
      updatedFields.vehicle_type = modified_fields.vehicle_type
    if (modified_fields.itinerary_code !== undefined)
      updatedFields.itinerary_code = modified_fields.itinerary_code
    if (modified_fields.itinerary_description !== undefined) {
      updatedFields.itinerary_description = modified_fields.itinerary_description
    }
    if (modified_fields.scheduled_loading_date !== undefined) {
      updatedFields.scheduled_entry = `${modified_fields.scheduled_loading_date}T08:00:00.000Z`
    }
    if (modified_fields.scheduled_loading_time !== undefined) {
      updatedFields.expected_loading_time = modified_fields.scheduled_loading_time
    }
    if (modified_fields.scheduled_delivery_date !== undefined) {
      updatedFields.delivery_estimated_at = `${modified_fields.scheduled_delivery_date}T18:00:00.000Z`
    }
    if (modified_fields.total_weight_kg !== undefined) {
      updatedFields.weight_kg = modified_fields.total_weight_kg
      updatedFields.weight_ton = Number((modified_fields.total_weight_kg / 1000).toFixed(2))
    }
    if (modified_fields.discharges_count !== undefined) {
      updatedFields.discharges_count = modified_fields.discharges_count
    }
    if (modified_fields.destination_city !== undefined) {
      updatedFields.destination_city = modified_fields.destination_city
    }
    if (modified_fields.destination_uf !== undefined) {
      updatedFields.destination_uf = modified_fields.destination_uf
    }
    if (modified_fields.customer_summary !== undefined) {
      updatedFields.customers_summary = modified_fields.customer_summary
    }
    if (modified_fields.logistics_notes !== undefined) {
      updatedFields.logistics_notes = modified_fields.logistics_notes
    }
    if (modified_fields.remessas !== undefined) {
      updatedFields.deliveries_json = modified_fields.remessas
    }

    // 7. Envio com token seguro para o endpoint de governança
    const token = pb.authStore.token
    const baseUrl = pb.baseUrl || ''
    const endpoint = `${baseUrl}/backend/v1/tms/transports/update-governed`

    const payload = {
      transport_id,
      sap_transport_number: original_record.sap_transport_number,
      loaded_updated_at: original_record.last_modified_at,
      reason,
      custom_reason_description,
      justification: justification.trim(),
      changes,
      updated_fields: updatedFields,
      requires_approval: criticalCheck.requiresApproval,
      approval_details: criticalCheck.reasons,
      sap_integration_status: sapStatus,
      sap_response_message: sapResult.sapMessage,
      session_id: 'SESS-' + Date.now(),
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      if (res.status === 409) {
        return {
          success: false,
          message: 'Este transporte foi alterado por outro usuário após a abertura desta tela.',
          transport_id,
          sap_transport_number: original_record.sap_transport_number,
          sync_version: original_record.sync_version,
          updated_at: original_record.last_modified_at,
          audit_log_ids: [],
          sap_sync_status: 'ERRO_SINCRONIZACAO',
          changes_count: 0,
          conflict: data.conflict,
        }
      }
      throw new Error(data.error || 'Erro ao processar alteração de transporte.')
    }

    return {
      success: true,
      message: 'Transporte atualizado com sucesso.',
      transport_id,
      sap_transport_number: original_record.sap_transport_number,
      sync_version: data.sync_version || original_record.sync_version + 1,
      updated_at: data.updated_at || new Date().toISOString(),
      audit_log_ids: data.audit_log_ids || [],
      sap_sync_status: sapStatus,
      changes_count: changes.length,
    }
  }

  /**
   * Buscar Histórico Cronológico de Auditoria do Transporte
   */
  async getTransportAuditHistory(params: {
    sap_transport_number?: string
    transport_id?: string
    delivery_number?: string
    reason?: string
    user?: string
    date_from?: string
    date_to?: string
  }): Promise<TransportHistoryLogItem[]> {
    try {
      const filters: string[] = []

      if (params.sap_transport_number) {
        filters.push(`sap_transport_number = "${params.sap_transport_number}"`)
      }
      if (params.transport_id) {
        filters.push(`resource_id = "${params.transport_id}"`)
      }
      if (params.delivery_number) {
        filters.push(`delivery_number = "${params.delivery_number}"`)
      }
      if (params.reason) {
        filters.push(`reason_code ~ "${params.reason}"`)
      }
      if (params.user) {
        filters.push(`(user_name ~ "${params.user}" || user_email ~ "${params.user}")`)
      }

      const pbFilter = filters.length > 0 ? filters.join(' && ') : ''

      const logs = await pb.collection('audit_logs').getList(1, 100, {
        filter: pbFilter,
        sort: '-created',
      })

      return logs.items.map((item) => ({
        id: item.id,
        created_at: item.created,
        user_name: item.user_name || 'Usuário HUB',
        user_email: item.user_email || '—',
        user_role: item.user_role || 'operador_logistica',
        field_name: item.field_name || item.action || 'Alteração Geral',
        field_label: item.field_label || item.field_name || 'Dado do Transporte',
        previous_state: item.previous_state || '—',
        new_state: item.new_state || '—',
        reason_code: item.reason_code || item.reason || 'Alteração cadastral',
        justification: item.justification || 'Justificativa registrada em auditoria imutável.',
        sap_transport_number: item.sap_transport_number || '—',
        delivery_number: item.delivery_number || '—',
        order_number: item.order_number || '—',
        sap_sync_status: (item.sap_sync_status as TransportSyncStatus) || 'SINCRONIZADO',
        sap_sync_at: item.sap_sync_at || item.created,
        sap_response_message: item.sap_response_message || '',
        correlation_id: item.correlation_id,
        ip_address: item.ip_address,
      }))
    } catch (err) {
      console.error('[TransportEditService] Falha ao carregar histórico de auditoria:', err)
      return []
    }
  }
}

export const transportEditService = new TransportEditService()
