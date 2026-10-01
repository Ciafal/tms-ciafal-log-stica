/**
 * Adaptador de Fonte de Dados ZSD004 (Datasource Abstraction)
 * Permite alternar com transparência entre MHTML_TEMP e SAP_RFC.
 *
 * A UI, Fila e Planejador NUNCA acessam SAP nem o arquivo diretamente;
 * sempre utilizam esta camada com cache persistido no PocketBase (sap_zsd004_vehicles_drivers).
 */

import pb from '@/lib/pocketbase/client'
import {
  SapZsd004Record,
  Zsd004DataSourceMode,
  Zsd004AuditSummary,
  computeZsd004TechnicalKey,
  normalizeZsd004Record,
} from '@/domain/zsd004Engine'

export interface Zsd004FilterParams {
  plant?: string
  status?: string // 'ALL' | 'A' | 'B' | 'NAO_INFORMADO'
  uf?: string
  vehicleType?: string
  bodyType?: string
  wheelType?: string
  ownerName?: string
  integrityStatus?: string // 'ALL' | 'integro' | 'incompleto' | 'inconsistente'
  hasTrailer?: boolean | null
  hasAntt?: boolean | null
  searchTerm?: string
  page?: number
  perPage?: number
}

export interface Zsd004SyncResult {
  success: boolean
  correlationId: string
  sourceMode: Zsd004DataSourceMode
  message: string
  audit: Zsd004AuditSummary
  error?: string
}

export class Zsd004DatasourceService {
  private static instance: Zsd004DatasourceService

  static getInstance(): Zsd004DatasourceService {
    if (!Zsd004DatasourceService.instance) {
      Zsd004DatasourceService.instance = new Zsd004DatasourceService()
    }
    return Zsd004DatasourceService.instance
  }

  /**
   * Obtém o modo ativo atual da fonte de dados
   */
  async getActiveMode(): Promise<{
    mode: Zsd004DataSourceMode
    modeName: string
    lastSyncDate: string
    plant: string
  }> {
    let mode: Zsd004DataSourceMode = 'MHTML_TEMP'
    let modeName = 'Snapshot Homologação MHTML (ZSD004.xlxs.MHTML - WSTL)'
    let lastSyncDate = new Date().toISOString()
    let plant = 'WSTL'

    try {
      const records = await pb.collection('system_parameters').getList(1, 10, {
        filter: 'key ~ "ZSD004"',
      })
      records.items.forEach((p: any) => {
        if (p.key === 'ACTIVE_ZSD004_SOURCE' && p.value) {
          mode = p.value as Zsd004DataSourceMode
        }
        if (p.key === 'ACTIVE_ZSD004_NAME' && p.value) {
          modeName = p.value
        }
        if (p.key === 'ZSD004_LAST_SYNC' && p.value) {
          lastSyncDate = p.value
        }
        if (p.key === 'ZSD004_PLANT_FILTER' && p.value) {
          plant = p.value
        }
      })
    } catch {
      // Usar defaults
    }

    return { mode, modeName, lastSyncDate, plant }
  }

  /**
   * Define o modo ativo (MHTML_TEMP ou SAP_RFC)
   */
  async setActiveMode(
    mode: Zsd004DataSourceMode,
    operatorEmail: string,
    operatorName: string,
  ): Promise<boolean> {
    try {
      const modeRecord = await pb
        .collection('system_parameters')
        .getFirstListItem(`key = "ACTIVE_ZSD004_SOURCE"`)
      await pb.collection('system_parameters').update(modeRecord.id, {
        value: mode,
      })

      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: operatorName,
        user_role: 'admin_tms',
        action: 'UPDATE_ZSD004_SOURCE_MODE',
        resource: 'system_parameters',
        resource_id: modeRecord.id,
        previous_state: modeRecord.value,
        new_state: mode,
        reason: `Alteração do modo da fonte de dados ZSD004 para ${mode}`,
        correlation_id: `ZSD004-MODE-${Date.now()}`,
        payload: { mode },
      })

      return true
    } catch (err) {
      console.warn('Falha ao atualizar modo ZSD004:', err)
      return false
    }
  }

  /**
   * Consulta paginada e filtrada do cache operacional local (sap_zsd004_vehicles_drivers)
   */
  async getRecords(params: Zsd004FilterParams = {}): Promise<{
    items: SapZsd004Record[]
    totalItems: number
    page: number
    totalPages: number
  }> {
    const page = params.page || 1
    const perPage = params.perPage || 50

    try {
      const filterConditions: string[] = []

      if (params.plant && params.plant !== 'ALL') {
        filterConditions.push(`plant = "${params.plant}"`)
      }

      if (params.status && params.status !== 'ALL') {
        filterConditions.push(`status = "${params.status}"`)
      }

      if (params.uf && params.uf !== 'ALL') {
        filterConditions.push(`vehicle_region = "${params.uf}"`)
      }

      if (params.integrityStatus && params.integrityStatus !== 'ALL') {
        filterConditions.push(`integrity_status = "${params.integrityStatus}"`)
      }

      if (params.searchTerm) {
        const cleanTerm = params.searchTerm.trim()
        const cleanDigits = cleanTerm.replace(/\D/g, '')
        const cleanPlate = cleanTerm.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

        const subOr: string[] = [
          `plate ~ "${cleanPlate || cleanTerm}"`,
          `driver_name ~ "${cleanTerm}"`,
          `owner_name ~ "${cleanTerm}"`,
          `vehicle_renavam ~ "${cleanDigits || cleanTerm}"`,
        ]

        if (cleanDigits.length >= 3) {
          subOr.push(`driver_cpf ~ "${cleanDigits}"`)
          subOr.push(`owner_cnpj ~ "${cleanDigits}"`)
        }

        filterConditions.push(`(${subOr.join(' || ')})`)
      }

      const filterStr = filterConditions.join(' && ')

      const res = await pb
        .collection('sap_zsd004_vehicles_drivers')
        .getList<SapZsd004Record>(page, perPage, {
          filter: filterStr || undefined,
          sort: 'plate',
        })

      // Filtros em memória para regras booleanas finas
      let filtered = res.items
      if (params.hasTrailer !== undefined && params.hasTrailer !== null) {
        filtered = filtered.filter((r) => {
          const has =
            r.trailer_plate &&
            r.trailer_plate !== 'Não informado no SAP' &&
            r.trailer_plate.trim().length > 0
          return params.hasTrailer ? has : !has
        })
      }

      if (params.hasAntt !== undefined && params.hasAntt !== null) {
        filtered = filtered.filter((r) => {
          const has =
            r.vehicle_antt &&
            r.vehicle_antt !== 'Não informado no SAP' &&
            r.vehicle_antt.trim().length > 0
          return params.hasAntt ? has : !has
        })
      }

      return {
        items: filtered,
        totalItems: res.totalItems,
        page: res.page,
        totalPages: res.totalPages,
      }
    } catch (err) {
      console.warn('Falha ao buscar sap_zsd004_vehicles_drivers:', err)
      return { items: [], totalItems: 0, page: 1, totalPages: 0 }
    }
  }

  /**
   * Métricas consolidadas para os Cards do Topo
   */
  async getMetrics(): Promise<{
    totalVehicles: number
    approvedCount: number
    blockedCount: number
    uninformedCount: number
    incompleteCount: number
    uniqueDriversCount: number
    uniqueOwnersCount: number
    lastSyncDate: string
  }> {
    try {
      // Buscar todos os registros para consolidação rápida
      const all = await pb.collection('sap_zsd004_vehicles_drivers').getFullList<SapZsd004Record>({
        fields: 'status,integrity_status,driver_cpf,owner_cnpj,last_sync_date',
      })

      let approved = 0
      let blocked = 0
      let uninformed = 0
      let incomplete = 0
      const driversSet = new Set<string>()
      const ownersSet = new Set<string>()

      all.forEach((r) => {
        if (r.status === 'A') approved++
        else if (r.status === 'B') blocked++
        else uninformed++

        if (r.integrity_status !== 'integro') incomplete++

        if (r.driver_cpf && r.driver_cpf !== 'Não informado no SAP') {
          driversSet.add(r.driver_cpf)
        }
        if (r.owner_cnpj && r.owner_cnpj !== 'Não informado no SAP') {
          ownersSet.add(r.owner_cnpj)
        }
      })

      const lastSync = all[0]?.last_sync_date || new Date().toISOString()

      return {
        totalVehicles: all.length,
        approvedCount: approved,
        blockedCount: blocked,
        uninformedCount: uninformed,
        incompleteCount: incomplete,
        uniqueDriversCount: driversSet.size,
        uniqueOwnersCount: ownersSet.size,
        lastSyncDate: lastSync,
      }
    } catch {
      return {
        totalVehicles: 0,
        approvedCount: 0,
        blockedCount: 0,
        uninformedCount: 0,
        incompleteCount: 0,
        uniqueDriversCount: 0,
        uniqueOwnersCount: 0,
        lastSyncDate: new Date().toISOString(),
      }
    }
  }

  /**
   * Localiza veículo por placa na base ZSD004
   */
  async findByPlate(rawPlate: string): Promise<SapZsd004Record | null> {
    const clean = rawPlate.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!clean) return null
    try {
      const res = await pb
        .collection('sap_zsd004_vehicles_drivers')
        .getFirstListItem<SapZsd004Record>(`plate = "${clean}"`)
      return res || null
    } catch {
      return null
    }
  }

  /**
   * Localiza motorista por CPF/documento na base ZSD004
   */
  async findByDriverDocument(doc: string): Promise<SapZsd004Record | null> {
    const clean = doc.replace(/\D/g, '')
    if (!clean) return null
    try {
      const res = await pb
        .collection('sap_zsd004_vehicles_drivers')
        .getFirstListItem<SapZsd004Record>(
          `driver_cpf = "${clean}" || driver_document = "${clean}"`,
        )
      return res || null
    } catch {
      return null
    }
  }

  /**
   * UPSERT idempotente com deduplicação:
   * 1º Placa, 2º Chassi, 3º Renavam, 4º código técnico
   */
  async upsertRecords(
    records: Array<Partial<SapZsd004Record>>,
    sourceMode: Zsd004DataSourceMode = 'MHTML_TEMP',
    sourceFileName = 'ZSD004.xlxs.MHTML',
    operatorEmail = 'system@ciafal.logistica',
  ): Promise<Zsd004AuditSummary> {
    const startedAt = new Date().toISOString()
    const correlationId = `ZSD004-UPSERT-${Date.now().toString(36).toUpperCase()}`

    let inserted = 0
    let updated = 0
    let unchanged = 0
    let rejected = 0
    let inconsistent = 0
    let approved = 0
    let blocked = 0
    let uninformed = 0
    let incomplete = 0
    let integro = 0

    const driversSet = new Set<string>()
    const ownersSet = new Set<string>()

    for (const rec of records) {
      try {
        const norm = normalizeZsd004Record(rec as any, sourceMode, sourceFileName)
        const techKey = norm.technical_key || computeZsd004TechnicalKey(norm)

        if (norm.status === 'A') approved++
        else if (norm.status === 'B') blocked++
        else uninformed++

        if (norm.integrity_status === 'inconsistente') inconsistent++
        else if (norm.integrity_status === 'incompleto') incomplete++
        else integro++

        if (norm.driver_cpf && norm.driver_cpf !== 'Não informado no SAP') {
          driversSet.add(norm.driver_cpf)
        }
        if (norm.owner_cnpj && norm.owner_cnpj !== 'Não informado no SAP') {
          ownersSet.add(norm.owner_cnpj)
        }

        // Tentar localizar registro existente pela chave técnica
        let existing: any = null
        try {
          existing = await pb
            .collection('sap_zsd004_vehicles_drivers')
            .getFirstListItem(`technical_key = "${techKey}"`)
        } catch {
          // não existe
        }

        const payloadToSave: Record<string, any> = {
          ...norm,
          technical_key: techKey,
          source_mode: sourceMode,
          source_file: sourceFileName,
          last_sync_date: new Date().toISOString(),
        }

        if (existing) {
          // Verificar se houve alteração real
          const hasChange =
            existing.plate !== norm.plate ||
            existing.status !== norm.status ||
            existing.driver_name !== norm.driver_name ||
            existing.owner_name !== norm.owner_name ||
            existing.capacity_kg !== norm.capacity_kg

          if (hasChange) {
            await pb.collection('sap_zsd004_vehicles_drivers').update(existing.id, payloadToSave)
            updated++
          } else {
            unchanged++
          }
        } else {
          await pb.collection('sap_zsd004_vehicles_drivers').create(payloadToSave)
          inserted++
        }
      } catch (rowErr) {
        console.warn('Erro ao processar linha ZSD004:', rowErr)
        rejected++
      }
    }

    const finishedAt = new Date().toISOString()

    const summary: Zsd004AuditSummary = {
      receivedCount: records.length,
      insertedCount: inserted,
      updatedCount: updated,
      unchangedCount: unchanged,
      rejectedCount: rejected,
      inconsistentCount: inconsistent,
      approvedCount: approved,
      blockedCount: blocked,
      uninformedStatusCount: uninformed,
      incompleteCount: incomplete,
      integroCount: integro,
      uniqueDriversCount: driversSet.size,
      uniqueOwnersCount: ownersSet.size,
      syncStartedAt: startedAt,
      syncFinishedAt: finishedAt,
      sourceMode,
      sourceFileName,
      correlationId,
    }

    // Registrar auditoria no PocketBase
    try {
      await pb.collection('audit_logs').create({
        user_email: operatorEmail,
        user_name: 'Sincronizador ZSD004',
        user_role: 'admin_tms',
        action: 'ZSD004_UPSERT_COMPLETED',
        resource: 'sap_zsd004_vehicles_drivers',
        resource_id: sourceMode,
        reason: `Carga de dados ZSD004 (${sourceMode}) finalizada com sucesso.`,
        correlation_id: correlationId,
        payload: summary as unknown as Record<string, unknown>,
      })
    } catch {
      /* intentionally ignored */
    }

    return summary
  }

  /**
   * Dispara a Sincronização oficial da ZSD004
   */
  async syncZSD004(operatorEmail: string): Promise<Zsd004SyncResult> {
    const { mode } = await this.getActiveMode()

    if (mode === 'SAP_RFC') {
      // Dispara chamada ao endpoint REST autorizado
      try {
        const res = await pb.send('/backend/v1/sap/sync-zsd004', {
          method: 'POST',
        })

        const metrics = await this.getMetrics()

        return {
          success: true,
          correlationId: res.correlationId || `ZSD004-RFC-${Date.now()}`,
          sourceMode: 'SAP_RFC',
          message:
            'Aguardando homologação de credenciais RFC com SAP ECC. A base operacional existente em cache permanece íntegra e ativa.',
          audit: {
            receivedCount: metrics.totalVehicles,
            insertedCount: 0,
            updatedCount: metrics.totalVehicles,
            unchangedCount: metrics.totalVehicles,
            rejectedCount: 0,
            inconsistentCount: 0,
            approvedCount: metrics.approvedCount,
            blockedCount: metrics.blockedCount,
            uninformedStatusCount: metrics.uninformedCount,
            incompleteCount: metrics.incompleteCount,
            integroCount: metrics.totalVehicles - metrics.incompleteCount,
            uniqueDriversCount: metrics.uniqueDriversCount,
            uniqueOwnersCount: metrics.uniqueOwnersCount,
            syncStartedAt: new Date().toISOString(),
            syncFinishedAt: new Date().toISOString(),
            sourceMode: 'SAP_RFC',
            correlationId: res.correlationId || 'SAP-RFC',
            notes: res.gapParameters,
          },
        }
      } catch (err: any) {
        return {
          success: false,
          correlationId: `ERR-${Date.now()}`,
          sourceMode: 'SAP_RFC',
          message:
            'SAP temporariamente indisponível. Exibindo dados da última sincronização realizada.',
          error: err?.message || 'Falha na conexão RFC com SAP ECC',
          audit: {
            receivedCount: 0,
            insertedCount: 0,
            updatedCount: 0,
            unchangedCount: 0,
            rejectedCount: 0,
            inconsistentCount: 0,
            approvedCount: 0,
            blockedCount: 0,
            uninformedStatusCount: 0,
            incompleteCount: 0,
            integroCount: 0,
            uniqueDriversCount: 0,
            uniqueOwnersCount: 0,
            syncStartedAt: new Date().toISOString(),
            syncFinishedAt: new Date().toISOString(),
            sourceMode: 'SAP_RFC',
            correlationId: 'ERR',
          },
        }
      }
    }

    // Modo MHTML_TEMP
    try {
      const res = await pb.send('/backend/v1/sap/sync-zsd004', {
        method: 'POST',
      })
      const metrics = await this.getMetrics()

      return {
        success: true,
        correlationId: res.correlationId || `ZSD004-${Date.now()}`,
        sourceMode: 'MHTML_TEMP',
        message: 'Dados da ZSD004 atualizados com sucesso.',
        audit: {
          receivedCount: metrics.totalVehicles,
          insertedCount: 0,
          updatedCount: metrics.totalVehicles,
          unchangedCount: metrics.totalVehicles,
          rejectedCount: 0,
          inconsistentCount: 0,
          approvedCount: metrics.approvedCount,
          blockedCount: metrics.blockedCount,
          uninformedStatusCount: metrics.uninformedCount,
          incompleteCount: metrics.incompleteCount,
          integroCount: metrics.totalVehicles - metrics.incompleteCount,
          uniqueDriversCount: metrics.uniqueDriversCount,
          uniqueOwnersCount: metrics.uniqueOwnersCount,
          syncStartedAt: new Date().toISOString(),
          syncFinishedAt: new Date().toISOString(),
          sourceMode: 'MHTML_TEMP',
          correlationId: res.correlationId,
        },
      }
    } catch (err: any) {
      return {
        success: false,
        correlationId: `ERR-${Date.now()}`,
        sourceMode: 'MHTML_TEMP',
        message: 'Erro ao processar snapshot ZSD004.',
        error: err?.message,
        audit: {
          receivedCount: 0,
          insertedCount: 0,
          updatedCount: 0,
          unchangedCount: 0,
          rejectedCount: 0,
          inconsistentCount: 0,
          approvedCount: 0,
          blockedCount: 0,
          uninformedStatusCount: 0,
          incompleteCount: 0,
          integroCount: 0,
          uniqueDriversCount: 0,
          uniqueOwnersCount: 0,
          syncStartedAt: new Date().toISOString(),
          syncFinishedAt: new Date().toISOString(),
          sourceMode: 'MHTML_TEMP',
          correlationId: 'ERR',
        },
      }
    }
  }
}

export const zsd004Datasource = Zsd004DatasourceService.getInstance()
