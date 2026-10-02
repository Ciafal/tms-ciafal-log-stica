// Instância canônica do cliente PocketBase para o Relatório Geral
import { pb } from '@/lib/pocketbase/client'
import {
  GeneralTransportRecord,
  GeneralTransportFilterParams,
  GENERAL_TRANSPORT_COLUMNS,
  formatReportValue,
} from '@/domain/generalTransportReportEngine'
import { exportToCsv, exportToXlsxXml } from '@/lib/exportUtils'

export interface GeneralTransportQueryResult {
  items: GeneralTransportRecord[]
  totalItems: number
  page: number
  perPage: number
  totalPages: number
  availableStatuses: string[]
  availableScaleReasons: string[]
}

export interface ReportExportAuditPayload {
  userEmail: string
  userName: string
  userRole?: string
  exportFormat: 'EXCEL' | 'CSV' | 'PDF'
  filters: GeneralTransportFilterParams
  totalRows: number
  executionTimeMs?: number
}

class GeneralTransportReportService {
  /**
   * Registra log de auditoria oficial para consultas e exportações
   */
  async logReportAudit(
    action:
      | 'QUERY_REPORT'
      | 'EXPORT_REPORT'
      | 'INTEGRATION_ERROR'
      | 'OPEN_AI_ANALYSIS'
      | 'OPEN_CHARTS_ANALYSIS'
      | 'EXPORT_CHARTS_ANALYSIS',
    payload: {
      userEmail: string
      userName: string
      userRole?: string
      filters?: GeneralTransportFilterParams
      totalItems?: number
      exportFormat?: string
      errorMessage?: string
      details?: Record<string, any>
    },
  ): Promise<void> {
    try {
      let reason = ''
      if (action === 'OPEN_AI_ANALYSIS') {
        reason = `Abertura da Análise IA do Relatório Geral Transporte (${payload.totalItems} registros considerados)`
      } else if (action === 'OPEN_CHARTS_ANALYSIS') {
        reason = `Abertura do Dashboard de Análises Gráficas (${payload.totalItems} registros considerados)`
      } else if (action === 'EXPORT_CHARTS_ANALYSIS') {
        reason = `Exportação da Análise Gráfica em ${payload.exportFormat} (${payload.totalItems} registros considerados)`
      } else if (action === 'EXPORT_REPORT') {
        reason = `Exportação do Relatório Geral Transporte em ${payload.exportFormat} (${payload.totalItems} registros)`
      } else if (action === 'QUERY_REPORT') {
        reason = `Consulta filtrada no Relatório Geral Transporte (${payload.totalItems} registros)`
      } else {
        reason = `Falha na consulta ao Relatório Geral Transporte: ${payload.errorMessage}`
      }

      await pb.collection('audit_logs').create({
        action: `GENERAL_TRANSPORT_${action}`,
        user_email: payload.userEmail || 'operador@ciafal.com.br',
        user_name: payload.userName || 'Operador Logística',
        user_role: payload.userRole || 'operador_logistica',
        resource: 'carrier_operational_history',
        correlation_id: `GTR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        reason,
        payload: {
          filters: payload.filters,
          total_items: payload.totalItems,
          format: payload.exportFormat,
          error: payload.errorMessage,
          details: payload.details,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (err) {
      console.warn('Falha ao gravar audit_logs do Relatório Geral:', err)
    }
  }

  /**
   * Converte registro bruto de carrier_operational_history para a estrutura canônica de 43 colunas
   */
  private mapRecordToReport(rec: any): GeneralTransportRecord {
    const rawDate = rec.transport_date || rec.created || ''
    let datePart = ''
    let timePart = ''

    if (rawDate) {
      try {
        const d = new Date(rawDate)
        if (!isNaN(d.getTime())) {
          datePart = d.toISOString().split('T')[0]
          timePart = d.toISOString().split('T')[1]?.substring(0, 8) || '00:00:00'
        }
      } catch {
        /* intentionally ignored */
      }
    }

    const weightTon = rec.weight_ton || (rec.weight_kg ? rec.weight_kg / 1000 : 0)
    const tareTon = rec.tare_weight_ton || (rec.tare_kg ? rec.tare_kg / 1000 : 14.5)
    const grossTon = rec.gross_weight_ton || (weightTon > 0 ? weightTon + tareTon : 0)
    const nfTon = rec.nf_weight_ton || weightTon
    const diffTon =
      rec.diff_weight_ton !== undefined
        ? rec.diff_weight_ton
        : Number((grossTon - (tareTon + nfTon)).toFixed(3))
    const diffPct =
      rec.diff_weight_pct !== undefined
        ? rec.diff_weight_pct
        : nfTon > 0
          ? Number(((diffTon / nfTon) * 100).toFixed(2))
          : 0

    const plate = rec.vehicle_plate || rec.external_id_1 || ''
    const sapNumber = rec.sap_transport_number || ''
    const orderNumber = rec.transport_order_number || (sapNumber ? `OT-${sapNumber}` : rec.id)
    const vType = rec.vehicle_type || 'Carreta Bitrem'
    const capTon =
      rec.vehicle_capacity_ton || (vType.toLowerCase().includes('bitrem') ? 35.0 : 28.0)
    const occupPct =
      rec.occupancy_pct || (capTon > 0 ? Number(((weightTon / capTon) * 100).toFixed(2)) : 0)

    return {
      id: rec.id,
      // 1. Cen.
      center_code: rec.center_code || 'WSTL',
      // 2. Descrição Centro
      center_description: rec.center_description || 'CIAFAL Matriz Contagem / WSTL',
      // 3. Stts.Trnsp
      transport_status: rec.final_status || 'CONCLUIDO',
      // 4. Transporte
      transport_number: orderNumber,
      sap_transport_number: sapNumber,
      // 5. Usuário
      user_name: rec.sap_user || 'OPER_CIAFAL',
      // 6. Data
      transport_date: datePart || rawDate,
      // 7. Hora
      transport_time: timePart || '08:00:00',
      // 8. Motivo Balança
      scale_reason:
        rec.scale_reason ||
        (rec.has_scale_log ? 'Pesagem regular aprovada' : 'Sem registro de balança'),
      has_scale_log: rec.has_scale_log !== false && rec.has_scale_log !== undefined,
      // 9. ID ext.1 (Placa)
      external_id_1: rec.external_id_1 || plate,
      // 10. Frete
      freight_cost: rec.freight_cost_driver || rec.freight_cost || 0,
      // 11. Pedágio
      toll_cost: rec.toll_cost || 0,
      // 12. Peso Br(t)
      gross_weight_ton: Number(grossTon.toFixed(3)),
      // 13. Tara
      tare_weight_ton: Number(tareTon.toFixed(3)),
      // 14. Peso Líq.
      net_weight_ton: Number(weightTon.toFixed(3)),
      // 15. Peso NF(t)
      nf_weight_ton: Number(nfTon.toFixed(3)),
      // 16. Dif. (t)
      diff_weight_ton: Number(diffTon.toFixed(3)),
      // 17. Dif. (%)
      diff_weight_pct: Number(diffPct.toFixed(2)),
      // 18. Itin.
      itinerary_code: rec.itinerary_code || 'MG-SP-01',
      // 19. Descrição itinerário
      itinerary_description: rec.itinerary_description || 'Contagem (MG) → Grande São Paulo (SP)',
      // 20. Tp Expediç
      expedition_type: rec.expedition_type || '01 - Rodoviário Lotação',
      // 21. Tp transp.
      transport_type: rec.transport_type || 'Rodoviário Padrão',
      // 22. Distância
      distance_km:
        rec.distance_km ||
        (rec.route_estimated_min ? Math.round(rec.route_estimated_min * 1.05) : 480),
      // 23. Tp Frete
      freight_type: rec.freight_type || 'CIF',
      // 24. Organ.
      sales_organization: rec.sales_organization || '1000 - CIAFAL Aços',
      // 25. Hr Início
      start_time: rec.start_time_str || '08:00:00',
      // 26. Data Tara
      tare_date: rec.tare_date || datePart,
      // 27. Hora Tara
      tare_time: rec.tare_time_str || '08:30:00',
      // 28. Data Iní.
      initial_date: rec.initial_date || datePart,
      // 29. Hora Iní.
      initial_time: rec.initial_time_str || '09:00:00',
      // 30. Data Fim (1)
      end_date_1: rec.end_date_1 || datePart,
      // 31. Hora Fim (1)
      end_time_1: rec.end_time_1_str || '11:30:00',
      // 32. Tempo Col
      collection_time_min: rec.collection_time_min || rec.loading_duration_min || 75,
      // 33. Data Fim (2)
      end_date_2: rec.end_date_2 || datePart,
      // 34. Hora Fim (2)
      end_time_2: rec.end_time_2_str || '12:15:00',
      // 35. Tempo Tot
      total_time_min: rec.total_time_min || rec.total_internal_dwell_min || 130,
      // 36. Capac Veíc
      vehicle_capacity_ton: Number(capTon.toFixed(2)),
      // 37. Tp Veículo
      vehicle_type: vType,
      // 38. Tp Rodado
      wheel_type: rec.wheel_type || 'Rodado Duplo',
      // 39. Tp Carroce
      body_type: rec.body_type_desc || rec.body_type || vType,
      // 40. Eixos
      axles_count: rec.axles_count || (vType.toLowerCase().includes('bitrem') ? 7 : 3),
      // 41. Ocup. (%)
      occupancy_pct: Number(occupPct.toFixed(2)),
      // 42. Frac. (nº)
      fractions_count: rec.fractions_count || rec.discharges_count || 1,
      // 43. RFID
      rfid_code: rec.rfid_code || `TAG-RFID-${sapNumber || plate.replace(/[^A-Z0-9]/g, '')}`,

      // Metadados
      driver_name: rec.driver_name,
      driver_document: rec.driver_document_masked || rec.driver_document_full,
      carrier_name: rec.carrier_name,
      destination_city: rec.destination_city,
      destination_uf: rec.destination_uf,
      invoicing_date: rec.invoicing_date || datePart,
      source_collection: 'carrier_operational_history',
    }
  }

  /**
   * Busca TODOS os registros que atendem exatamente ao filtro atual para cálculo analítico no backend
   * e agregação em tempo de execução sem paginação artificial (até 1500 registros para inteligência).
   */
  async getAllFilteredRecords(
    params: GeneralTransportFilterParams,
  ): Promise<GeneralTransportRecord[]> {
    const filter = this.buildPbFilter(params)
    const response = await pb.collection('carrier_operational_history').getList(1, 1500, {
      filter: filter || undefined,
      sort: '-transport_date',
    })
    return response.items.map((rec) => this.mapRecordToReport(rec))
  }

  /**
   * Constrói filtro PocketBase a partir dos parâmetros de busca combináveis
   */
  private buildPbFilter(params: GeneralTransportFilterParams): string {
    const parts: string[] = []

    // 1. Transporte (um ou vários números, exato ou parcial)
    if (params.transport && params.transport.trim()) {
      const raw = params.transport.trim()
      // Se houver vírgula, ponto e vírgula ou espaço separando números
      const tokens = raw
        .split(/[\s,;]+/)
        .map((t) => t.trim())
        .filter(Boolean)
      if (tokens.length > 1) {
        const sub = tokens
          .map((t) => `(transport_order_number ~ "${t}" || sap_transport_number ~ "${t}")`)
          .join(' || ')
        parts.push(`(${sub})`)
      } else if (tokens.length === 1) {
        const t = tokens[0]
        parts.push(`(transport_order_number ~ "${t}" || sap_transport_number ~ "${t}")`)
      }
    }

    // 2. Data Início / Fim do Transporte
    if (params.startDate) {
      parts.push(`transport_date >= "${params.startDate} 00:00:00"`)
    }
    if (params.endDate) {
      parts.push(`transport_date <= "${params.endDate} 23:59:59"`)
    }

    // 3. Data Início / Fim do Faturamento
    if (params.startInvoicingDate) {
      parts.push(`invoicing_date >= "${params.startInvoicingDate} 00:00:00"`)
    }
    if (params.endInvoicingDate) {
      parts.push(`invoicing_date <= "${params.endInvoicingDate} 23:59:59"`)
    }

    // 4. Status Transporte (múltiplos)
    if (params.statuses && params.statuses.length > 0) {
      const statusSub = params.statuses.map((s) => `final_status = "${s}"`).join(' || ')
      parts.push(`(${statusSub})`)
    }

    // 5. Logs Balança
    if (params.scaleLogFilter === 'WITH_LOG') {
      parts.push('has_scale_log = true')
    } else if (params.scaleLogFilter === 'WITHOUT_LOG') {
      parts.push('has_scale_log = false')
    }

    // Motivos específicos de balança
    if (params.scaleReasons && params.scaleReasons.length > 0) {
      const reasonSub = params.scaleReasons.map((r) => `scale_reason ~ "${r}"`).join(' || ')
      parts.push(`(${reasonSub})`)
    }

    // 6. Placa (pesquisa por placa no campo vehicle_plate ou external_id_1)
    if (params.plate && params.plate.trim()) {
      const cleanPlate = params.plate.trim().replace(/[^a-zA-Z0-9]/g, '')
      parts.push(`(vehicle_plate ~ "${cleanPlate}" || external_id_1 ~ "${cleanPlate}")`)
    }

    return parts.join(' && ')
  }

  /**
   * Consulta server-side paginada e filtrada
   */
  async getGeneralTransportReport(
    params: GeneralTransportFilterParams,
    userContext?: { email: string; name: string; role?: string },
  ): Promise<GeneralTransportQueryResult> {
    const page = params.page && params.page > 0 ? params.page : 1
    const perPage =
      params.perPage && [25, 50, 100, 250].includes(params.perPage) ? params.perPage : 25

    let sort = '-transport_date'
    if (params.sortField) {
      const orderPrefix = params.sortOrder === 'asc' ? '+' : '-'
      // Mapeia chaves do relatório para campos do PocketBase
      const fieldMapping: Record<string, string> = {
        transport_number: 'transport_order_number',
        sap_transport_number: 'sap_transport_number',
        transport_status: 'final_status',
        transport_date: 'transport_date',
        external_id_1: 'vehicle_plate',
        freight_cost: 'freight_cost_driver',
        toll_cost: 'toll_cost',
        gross_weight_ton: 'gross_weight_ton',
        net_weight_ton: 'weight_ton',
        diff_weight_ton: 'diff_weight_ton',
        itinerary_code: 'itinerary_code',
        distance_km: 'distance_km',
        total_time_min: 'total_internal_dwell_min',
      }
      const mapped = fieldMapping[params.sortField] || params.sortField
      sort = `${orderPrefix}${mapped}`
    }

    const filter = this.buildPbFilter(params)

    try {
      const response = await pb.collection('carrier_operational_history').getList(page, perPage, {
        filter: filter || undefined,
        sort,
      })

      const items = response.items.map((rec) => this.mapRecordToReport(rec))

      // Statuses e Motivos disponíveis para preencher os selects dinamicamente
      const allSample = await pb.collection('carrier_operational_history').getList(1, 100, {
        fields: 'final_status,scale_reason',
      })
      const availableStatuses: string[] = Array.from(
        new Set(allSample.items.map((i: any) => i.final_status).filter(Boolean)),
      ) as string[]
      const availableScaleReasons: string[] = Array.from(
        new Set(allSample.items.map((i: any) => i.scale_reason).filter(Boolean)),
      ) as string[]

      // Registrar auditoria da consulta de forma não bloqueante
      if (userContext) {
        this.logReportAudit('QUERY_REPORT', {
          userEmail: userContext.email,
          userName: userContext.name,
          userRole: userContext.role,
          filters: params,
          totalItems: response.totalItems,
        })
      }

      return {
        items,
        totalItems: response.totalItems,
        page: response.page,
        perPage: response.perPage,
        totalPages: response.totalPages,
        availableStatuses:
          availableStatuses.length > 0
            ? availableStatuses
            : ['CONCLUIDO', 'ENCERRADO_COM_OCORRENCIA', 'EM_VIAGEM', 'EM_EXPEDICAO'],
        availableScaleReasons:
          availableScaleReasons.length > 0
            ? availableScaleReasons
            : [
                'Pesagem regular aprovada',
                'Divergência de pesagem conferida e autorizada',
                'Aguardando pesagem saída',
              ],
      }
    } catch (err: any) {
      console.warn('Erro ao consultar carrier_operational_history:', err)
      if (userContext) {
        this.logReportAudit('INTEGRATION_ERROR', {
          userEmail: userContext.email,
          userName: userContext.name,
          userRole: userContext.role,
          errorMessage: err?.message || 'Falha na conexão com a base de dados operacional',
        })
      }
      throw new Error(
        'Não foi possível carregar o relatório operacional. Verifique sua conexão ou tente novamente.',
      )
    }
  }

  /**
   * Exporta TODOS os registros correspondentes aos filtros aplicados (não apenas a página atual)
   */
  async exportFullReport(
    format: 'EXCEL' | 'CSV' | 'PDF',
    params: GeneralTransportFilterParams,
    userContext: { email: string; name: string; role?: string },
    visibleColumnsKeys?: string[],
  ): Promise<{ totalExported: number }> {
    const filter = this.buildPbFilter(params)
    const startTime = Date.now()

    // Busca até 1000 registros para exportação completa respeitando filtros
    const response = await pb.collection('carrier_operational_history').getList(1, 1000, {
      filter: filter || undefined,
      sort: '-transport_date',
    })

    const records = response.items.map((rec) => this.mapRecordToReport(rec))

    // Filtra colunas que estão visíveis ou usa todas as 43
    const colsToExport =
      visibleColumnsKeys && visibleColumnsKeys.length > 0
        ? GENERAL_TRANSPORT_COLUMNS.filter((c) => visibleColumnsKeys.includes(c.key))
        : GENERAL_TRANSPORT_COLUMNS

    const headers = colsToExport.map((c) => `${c.seq}. ${c.label} (${c.sapTitle})`)

    const rows = records.map((rec) =>
      colsToExport.map((col) => {
        const val = rec[col.key]
        return formatReportValue(val, col.format)
      }),
    )

    const dateStr = new Date().toISOString().split('T')[0]
    const timestampFormatted = new Date().toLocaleString('pt-BR')
    const filename = `Relatorio_Geral_Transporte_CIAFAL_${dateStr}`

    // Monta bloco de metadados para auditoria e cabeçalho do arquivo
    const appliedFiltersText =
      [
        params.transport ? `Transporte: ${params.transport}` : '',
        params.startDate || params.endDate
          ? `Período Transporte: ${params.startDate || 'Início'} até ${params.endDate || 'Hoje'}`
          : '',
        params.startInvoicingDate || params.endInvoicingDate
          ? `Período Faturamento: ${params.startInvoicingDate || 'Início'} até ${params.endInvoicingDate || 'Hoje'}`
          : '',
        params.statuses?.length ? `Status: ${params.statuses.join(', ')}` : '',
        params.scaleLogFilter ? `Balança: ${params.scaleLogFilter}` : '',
        params.plate ? `Placa: ${params.plate}` : '',
      ]
        .filter(Boolean)
        .join(' | ') || 'Nenhum filtro aplicado (Base completa)'

    if (format === 'CSV') {
      const metadataRows = [
        ['HUB CIAFAL - TMS LOGÍSTICA INTEGRADA'],
        ['RELATÓRIO GERAL TRANSPORTE (SAP ZSD40 & BASES TMS)'],
        [`Data/Hora Emissão: ${timestampFormatted}`],
        [`Usuário Emissor: ${userContext.name} (${userContext.email})`],
        [`Filtros Aplicados: ${appliedFiltersText}`],
        [`Total de Registros: ${records.length}`],
        [''], // Linha em branco separadora
      ]
      exportToCsv(filename, headers, [
        ...metadataRows.map((r) => [r[0], ...Array(headers.length - 1).fill('')]),
        ...rows,
      ])
    } else if (format === 'EXCEL') {
      exportToXlsxXml(filename, 'Relatório Geral Transporte', headers, rows)
    } else if (format === 'PDF') {
      // Dispara janela de impressão customizada formatada para relatório gerencial
      this.triggerPdfPrintWindow({
        headers,
        rows,
        totalRows: records.length,
        timestampFormatted,
        userContext,
        appliedFiltersText,
      })
    }

    // Registra evento de exportação na auditoria
    await this.logReportAudit('EXPORT_REPORT', {
      userEmail: userContext.email,
      userName: userContext.name,
      userRole: userContext.role,
      exportFormat: format,
      filters: params,
      totalItems: records.length,
    })

    return { totalExported: records.length }
  }

  /**
   * Monta janela limpa de impressão PDF com cabeçalho institucional CIAFAL e tabela completa
   */
  private triggerPdfPrintWindow(data: {
    headers: string[]
    rows: (string | number)[][]
    totalRows: number
    timestampFormatted: string
    userContext: { email: string; name: string }
    appliedFiltersText: string
  }): void {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      window.print()
      return
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatório Geral Transporte — CIAFAL</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 8px; color: #1e293b; margin: 0; padding: 12px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #005596; padding-bottom: 8px; margin-bottom: 10px; }
          .brand { font-size: 14px; font-weight: 900; color: #005596; }
          .meta { font-size: 8px; color: #64748b; text-align: right; }
          .filters { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: 4px; margin-bottom: 10px; font-size: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 7.5px; }
          th { background: #005596; color: white; padding: 4px 3px; border: 1px solid #004275; text-align: left; white-space: nowrap; }
          td { padding: 3px; border: 1px solid #cbd5e1; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 10px; font-size: 7.5px; color: #64748b; text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">HUB CIAFAL — TMS LOGÍSTICA INTEGRADA</div>
            <div style="font-weight: bold; color: #334155;">Relatório Geral Transporte (Estrutura ZSD40)</div>
          </div>
          <div class="meta">
            <div>Emissão: <strong>${data.timestampFormatted}</strong></div>
            <div>Usuário: <strong>${data.userContext.name} (${data.userContext.email})</strong></div>
            <div>Total: <strong>${data.totalRows} transportes</strong></div>
          </div>
        </div>

        <div class="filters">
          <strong>Filtros aplicados:</strong> ${data.appliedFiltersText}
        </div>

        <table>
          <thead>
            <tr>
              ${data.headers.map((h) => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>

        <div class="footer">
          Documento gerado eletronicamente para fins de controle e auditoria operacional • CIAFAL Wilson Santos S.A.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }
}

export const generalTransportReportService = new GeneralTransportReportService()
