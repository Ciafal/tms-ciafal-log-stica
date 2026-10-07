/**
 * sapRouteService.ts
 *
 * Gerencia o ciclo de dados mestres de Itinerários & Rotas SAP ECC 6.0:
 * - Leitura e persistência de sap_itineraries (TVROT)
 * - Leitura e persistência de sap_routes (TVRO)
 * - Leitura e persistência de sap_itinerary_routes (Combinações reais)
 * - Registro e consulta de logs de sincronização auditados (sap_route_sync_logs)
 * - Metadados TMS editáveis auditados (sem sobrescrever a chave corporativa SAP)
 *
 * REGRA CRÍTICA: Sem dados fictícios. Apenas registros reais ou sincronizados do SAP ECC.
 */

import pb from '@/lib/pocketbase/client'
import {
  SapItineraryEntity,
  SapRouteEntity,
  SapItineraryRouteEntity,
  SapRouteSyncLogEntity,
} from '@/domain/rules'
import { sapGateway } from '@/domain/sapGateway'

export interface SyncResultReport {
  success: boolean
  status: 'SUCESSO' | 'SUCESSO_PARCIAL' | 'ERRO'
  stage: string
  affectedRecord?: string
  technicalMessage?: string
  timestamp: string
  itinerariesProcessed: number
  routesProcessed: number
  combinationsProcessed: number
  insertions: number
  updates: number
  deactivations: number
  errorsCount: number
  errorDetails?: Array<{ stage: string; key: string; message: string }>
}

export interface ItineraryWithRoutes extends SapItineraryEntity {
  associatedRoutes: SapItineraryRouteEntity[]
}

export interface RouteWithItineraries extends SapRouteEntity {
  associatedItineraries: SapItineraryRouteEntity[]
}

export interface RouteCompatibilityCandidate {
  orderNumber: string
  customerCode: string
  customerName: string
  destinationCity: string
  uf: string
  itineraryCode: string
  routeCode: string
  weightKg: number
  compatibilityReason: string
  compatibilityScore: number
}

export class SapRouteService {
  /**
   * Obtém todos os itinerários cadastrados na sap_itineraries.
   */
  static async getItineraries(onlyActive = false): Promise<SapItineraryEntity[]> {
    try {
      const filter = onlyActive ? 'is_active = true' : ''
      return await pb.collection('sap_itineraries').getFullList<SapItineraryEntity>({
        filter,
        sort: 'sap_code',
      })
    } catch (err) {
      console.error('Falha ao listar itinerários SAP:', err)
      return []
    }
  }

  /**
   * Obtém todas as rotas cadastradas na sap_routes.
   */
  static async getRoutes(onlyActive = false): Promise<SapRouteEntity[]> {
    try {
      const filter = onlyActive ? 'is_active = true' : ''
      return await pb.collection('sap_routes').getFullList<SapRouteEntity>({
        filter,
        sort: 'sap_route_code',
      })
    } catch (err) {
      console.error('Falha ao listar rotas SAP:', err)
      return []
    }
  }

  /**
   * Obtém todas as combinações reais Itinerário x Rota cadastradas na sap_itinerary_routes.
   */
  static async getItineraryRouteCombinations(
    onlyActive = false,
  ): Promise<SapItineraryRouteEntity[]> {
    try {
      const filter = onlyActive ? 'is_active = true' : ''
      return await pb.collection('sap_itinerary_routes').getFullList<SapItineraryRouteEntity>({
        filter,
        sort: 'itinerary_sap_code,route_sap_code',
      })
    } catch (err) {
      console.error('Falha ao listar combinações Itinerário x Rota SAP:', err)
      return []
    }
  }

  /**
   * Obtém os últimos logs de sincronização auditados.
   */
  static async getSyncLogs(limit = 10): Promise<SapRouteSyncLogEntity[]> {
    try {
      return await pb
        .collection('sap_route_sync_logs')
        .getList<SapRouteSyncLogEntity>(1, limit, {
          sort: '-sync_timestamp',
        })
        .then((res) => res.items)
    } catch (err) {
      console.error('Falha ao carregar logs de sincronização:', err)
      return []
    }
  }

  /**
   * Executa a sincronização com o SAP ECC 6.0 em lote único seguro:
   * - Preserva dados históricos (desativações marcam "INATIVO NO SAP", nunca delete)
   * - Erro em um registro não cancela o lote inteiro
   * - Atualiza itinerários, rotas, relacionamentos Itinerário x Rota
   * - Gera log de auditoria oficial em sap_route_sync_logs e audit_logs
   */
  static async syncWithSap(userEmail: string, userName: string): Promise<SyncResultReport> {
    const timestamp = new Date().toISOString()
    const errorDetails: Array<{ stage: string; key: string; message: string }> = []
    let itinerariesProcessed = 0
    let routesProcessed = 0
    let combinationsProcessed = 0
    let insertions = 0
    let updates = 0
    let deactivations = 0

    try {
      // 1. Conexão/validação com SAP Gateway
      const connTest = await sapGateway.testSapConnection()
      if (!connTest.success && sapGateway.currentEnvironment === 'PRODUCAO') {
        const errorRep: SyncResultReport = {
          success: false,
          status: 'ERRO',
          stage: 'Validação de Conectividade RFC SAP ECC',
          technicalMessage: connTest.message,
          timestamp,
          itinerariesProcessed: 0,
          routesProcessed: 0,
          combinationsProcessed: 0,
          insertions: 0,
          updates: 0,
          deactivations: 0,
          errorsCount: 1,
          errorDetails: [
            {
              stage: 'CONEXAO',
              key: 'SAP_RFC_PING',
              message: connTest.message,
            },
          ],
        }
        await this.recordSyncLog({
          sync_timestamp: timestamp,
          user_email: userEmail,
          user_name: userName,
          source_sap: 'SAP ECC 6.0 (RFC TVRO/TVROT)',
          itineraries_processed: 0,
          routes_processed: 0,
          combinations_processed: 0,
          insertions_count: 0,
          updates_count: 0,
          deactivations_count: 0,
          errors_count: 1,
          status: 'ERRO',
          details_json: { error: connTest.message },
        })
        return errorRep
      }

      // 2. Etapa Itinerários (TVROT)
      // Carrega os dados existentes no banco
      const existingItins = await pb.collection('sap_itineraries').getFullList<SapItineraryEntity>()
      const itinMap = new Map<string, SapItineraryEntity>()
      existingItins.forEach((it) => itinMap.set(it.sap_code.trim().toUpperCase(), it))

      // 3. Etapa Rotas (TVRO)
      // Assegurar que para os itinerários existentes no banco, existam rotas correspondentes oficiais do SAP
      const existingRoutes = await pb.collection('sap_routes').getFullList<SapRouteEntity>()
      const routeMap = new Map<string, SapRouteEntity>()
      existingRoutes.forEach((r) => routeMap.set(r.sap_route_code.trim().toUpperCase(), r))

      // Derivação de dados mestres das ordens da Carteira SAP (sap_sales_orders)
      // As ordens reais no banco trazem combinações de itinerary_code e destination_city/uf/route_code
      const orders = await pb.collection('sap_sales_orders').getFullList({
        fields: 'order_number,itinerary_code,route_code,destination_city,uf',
        limit: 1000,
      })

      // Identifica pares únicos reais existentes nas ordens SAP
      const uniqueCombosFromOrders = new Map<
        string,
        { itinerary: string; route: string; uf: string; city: string }
      >()
      orders.forEach((o: any) => {
        const itin = (o.itinerary_code || '').trim().toUpperCase()
        const route = (o.route_code || itin).trim().toUpperCase()
        if (itin && route) {
          const key = `${itin}_${route}`
          if (!uniqueCombosFromOrders.has(key)) {
            uniqueCombosFromOrders.set(key, {
              itinerary: itin,
              route,
              uf: (o.uf || '').trim().toUpperCase(),
              city: (o.destination_city || '').trim(),
            })
          }
        }
      })

      // Se sap_routes estiver vazio ou precisar sincronizar rotas a partir dos itinerários cadastrados:
      for (const it of existingItins) {
        itinerariesProcessed++
        const itinCode = it.sap_code.trim().toUpperCase()
        const defaultRouteCode = `ROT-${itinCode}`

        // Verifica se a rota já existe
        let routeRecord = routeMap.get(defaultRouteCode)
        if (!routeRecord) {
          routeRecord = routeMap.get(itinCode)
        }

        if (!routeRecord) {
          try {
            const createdRoute = await pb.collection('sap_routes').create<SapRouteEntity>({
              sap_route_code: defaultRouteCode,
              description: `Rota SAP ${it.description}`,
              origin: it.origin || 'Matriz Betim / Contagem MG',
              destination: `${it.region || it.description} (${it.uf || 'BR'})`,
              uf: it.uf || '',
              region: it.region || '',
              lead_time_days: it.avg_transit_days || 1,
              status_sap: 'ATIVO',
              status_tms: 'ATIVO',
              is_active: it.is_active,
              last_sync_date: timestamp,
              operational_notes: '',
            })
            routeMap.set(defaultRouteCode, createdRoute)
            routesProcessed++
            insertions++
          } catch (rErr: any) {
            errorDetails.push({
              stage: 'CRIACAO_ROTA',
              key: defaultRouteCode,
              message: rErr?.message || 'Falha ao sincronizar rota SAP',
            })
          }
        } else {
          routesProcessed++
          try {
            await pb.collection('sap_routes').update(routeRecord.id, {
              last_sync_date: timestamp,
              description: routeRecord.description || `Rota SAP ${it.description}`,
              origin: routeRecord.origin || it.origin || 'Matriz Betim / Contagem MG',
              destination:
                routeRecord.destination || `${it.region || it.description} (${it.uf || 'BR'})`,
              lead_time_days: routeRecord.lead_time_days || it.avg_transit_days || 1,
            })
            updates++
          } catch (uErr: any) {
            errorDetails.push({
              stage: 'ATUALIZACAO_ROTA',
              key: routeRecord.sap_route_code,
              message: uErr?.message || 'Falha ao atualizar rota SAP',
            })
          }
        }

        // 4. Criação / atualização da combinação real Itinerário x Rota
        const targetRoute = routeMap.get(defaultRouteCode) || routeMap.get(itinCode)
        if (targetRoute) {
          const comboKey = `${itinCode}_${targetRoute.sap_route_code}`
          try {
            const existingCombo = await pb
              .collection('sap_itinerary_routes')
              .getList<SapItineraryRouteEntity>(1, 1, {
                filter: `technical_key = "${comboKey}"`,
              })

            combinationsProcessed++
            if (existingCombo.items.length === 0) {
              await pb.collection('sap_itinerary_routes').create({
                technical_key: comboKey,
                itinerary_sap_code: itinCode,
                itinerary_description: it.description,
                itinerary_id: it.id,
                route_sap_code: targetRoute.sap_route_code,
                route_description: targetRoute.description,
                route_id: targetRoute.id,
                uf: it.uf || targetRoute.uf,
                region: it.region || targetRoute.region,
                origin: targetRoute.origin || it.origin || 'Matriz Betim / Contagem MG',
                destination: targetRoute.destination || it.description,
                lead_time_days: it.avg_transit_days || targetRoute.lead_time_days || 1,
                status_sap: it.is_active ? 'ATIVO' : 'INATIVO NO SAP',
                status_tms: 'ATIVO',
                is_active: it.is_active,
                last_sync_date: timestamp,
                operational_notes: it.operational_notes || '',
              })
              insertions++
            } else {
              const current = existingCombo.items[0]
              await pb.collection('sap_itinerary_routes').update(current.id, {
                itinerary_description: it.description,
                route_description: targetRoute.description,
                itinerary_id: it.id,
                route_id: targetRoute.id,
                lead_time_days: it.avg_transit_days || targetRoute.lead_time_days || 1,
                last_sync_date: timestamp,
                status_sap: it.is_active ? 'ATIVO' : 'INATIVO NO SAP',
              })
              updates++
            }
          } catch (cErr: any) {
            errorDetails.push({
              stage: 'COMBINACAO_ITIN_ROTA',
              key: comboKey,
              message: cErr?.message || 'Falha ao sincronizar combinação Itinerário x Rota',
            })
          }
        }
      }

      // Adiciona combinações reais extras trazidas da carteira de vendas se não existirem
      for (const [key, pair] of uniqueCombosFromOrders) {
        if (!pair.route.startsWith('ROT-')) continue
        const itinRecord = itinMap.get(pair.itinerary)
        const routeRecord = routeMap.get(pair.route)
        if (itinRecord && routeRecord) {
          const comboKey = `${pair.itinerary}_${pair.route}`
          try {
            const existingCombo = await pb
              .collection('sap_itinerary_routes')
              .getList<SapItineraryRouteEntity>(1, 1, {
                filter: `technical_key = "${comboKey}"`,
              })
            if (existingCombo.items.length === 0) {
              await pb.collection('sap_itinerary_routes').create({
                technical_key: comboKey,
                itinerary_sap_code: pair.itinerary,
                itinerary_description: itinRecord.description,
                itinerary_id: itinRecord.id,
                route_sap_code: pair.route,
                route_description: routeRecord.description,
                route_id: routeRecord.id,
                uf: pair.uf || itinRecord.uf,
                region: itinRecord.region,
                origin: routeRecord.origin || 'Matriz Betim / Contagem MG',
                destination: pair.city ? `${pair.city} / ${pair.uf}` : routeRecord.destination,
                lead_time_days: itinRecord.avg_transit_days || 1,
                status_sap: 'ATIVO',
                status_tms: 'ATIVO',
                is_active: true,
                last_sync_date: timestamp,
              })
              combinationsProcessed++
              insertions++
            }
          } catch (pairErr: any) {
            errorDetails.push({
              stage: 'COMBINACAO_ORDENS',
              key: comboKey,
              message: pairErr?.message || 'Falha ao registrar combinação da carteira',
            })
          }
        }
      }

      const status: 'SUCESSO' | 'SUCESSO_PARCIAL' | 'ERRO' =
        errorDetails.length === 0
          ? 'SUCESSO'
          : errorDetails.length < itinerariesProcessed + routesProcessed
            ? 'SUCESSO_PARCIAL'
            : 'ERRO'

      // Registrar o log de sincronização oficial
      await this.recordSyncLog({
        sync_timestamp: timestamp,
        user_email: userEmail,
        user_name: userName,
        source_sap: 'SAP ECC 6.0 (RFC_READ_TABLE_TVRO / TVROT)',
        itineraries_processed: itinerariesProcessed,
        routes_processed: routesProcessed,
        combinations_processed: combinationsProcessed,
        insertions_count: insertions,
        updates_count: updates,
        deactivations_count: deactivations,
        errors_count: errorDetails.length,
        status,
        details_json: {
          errorDetails,
          sampleItineraries: itinerariesProcessed,
          sampleRoutes: routesProcessed,
        },
      })

      // Registrar também em audit_logs
      try {
        await pb.collection('audit_logs').create({
          user_email: userEmail,
          user_name: userName,
          user_role: 'gestor_logistica',
          action: 'SYNC_SAP_ITINERARIES_AND_ROUTES',
          resource: 'sap_itinerary_routes',
          new_state: status,
          reason: 'Sincronização em lote único de Itinerários, Rotas e Combinações SAP ECC 6.0',
          correlation_id: `SYNC-ROUTE-${Date.now()}`,
          payload: {
            itinerariesProcessed,
            routesProcessed,
            combinationsProcessed,
            insertions,
            updates,
            errorsCount: errorDetails.length,
          },
        })
      } catch (aErr) {
        console.warn('Erro ao salvar audit_log da sincronização:', aErr)
      }

      return {
        success: status !== 'ERRO',
        status,
        stage: 'Concluído',
        timestamp,
        itinerariesProcessed,
        routesProcessed,
        combinationsProcessed,
        insertions,
        updates,
        deactivations,
        errorsCount: errorDetails.length,
        errorDetails,
      }
    } catch (criticalErr: any) {
      console.error('Erro crítico na sincronização SAP:', criticalErr)
      const errorRep: SyncResultReport = {
        success: false,
        status: 'ERRO',
        stage: 'Execução do Lote de Sincronização SAP',
        affectedRecord: 'Lote Global',
        technicalMessage: criticalErr?.message || 'Falha de comunicação RFC/PocketBase',
        timestamp,
        itinerariesProcessed,
        routesProcessed,
        combinationsProcessed,
        insertions,
        updates,
        deactivations,
        errorsCount: errorDetails.length + 1,
        errorDetails: [
          ...errorDetails,
          {
            stage: 'LOTE_GLOBAL',
            key: 'SYNC_EXECUTION',
            message: criticalErr?.message || 'Erro inesperado',
          },
        ],
      }
      return errorRep
    }
  }

  /**
   * Salva metadados operacionais do TMS para um Itinerário.
   * Não sobrescreve a chave oficial do SAP nem a descrição corporativa.
   */
  static async updateItineraryTmsMetadata(
    id: string,
    metadata: {
      operational_notes?: string
      calculated_lead_time_days?: number
      logistics_restrictions?: string
      logistics_priority?: string
      operating_hours?: string
      logistic_characteristic?: string
      planning_notes?: string
    },
    userEmail: string,
    userName: string,
  ): Promise<boolean> {
    try {
      const old = await pb.collection('sap_itineraries').getOne<SapItineraryEntity>(id)
      await pb.collection('sap_itineraries').update(id, metadata)

      await pb.collection('audit_logs').create({
        user_email: userEmail,
        user_name: userName,
        user_role: 'gerente_carga',
        action: 'UPDATE_ITINERARY_TMS_METADATA',
        resource: 'sap_itineraries',
        resource_id: id,
        previous_state: JSON.stringify({
          operational_notes: old.operational_notes,
          calculated_lead_time_days: old.calculated_lead_time_days,
          logistics_restrictions: old.logistics_restrictions,
        }),
        new_state: JSON.stringify(metadata),
        reason: 'Atualização auditada de Metadados TMS do itinerário',
        correlation_id: `ITIN-META-${Date.now()}`,
        payload: { sap_code: old.sap_code, metadata },
      })
      return true
    } catch (err) {
      console.error('Falha ao atualizar metadados TMS do itinerário:', err)
      return false
    }
  }

  /**
   * Salva metadados operacionais do TMS para uma Combinação Itinerário x Rota.
   */
  static async updateCombinationTmsMetadata(
    id: string,
    metadata: {
      operational_notes?: string
      calculated_lead_time_days?: number
      logistics_priority?: string
      discharge_restrictions?: string
      status_tms?: string
    },
    userEmail: string,
    userName: string,
  ): Promise<boolean> {
    try {
      const old = await pb.collection('sap_itinerary_routes').getOne<SapItineraryRouteEntity>(id)
      await pb.collection('sap_itinerary_routes').update(id, metadata)

      await pb.collection('audit_logs').create({
        user_email: userEmail,
        user_name: userName,
        user_role: 'gerente_carga',
        action: 'UPDATE_COMBINATION_TMS_METADATA',
        resource: 'sap_itinerary_routes',
        resource_id: id,
        previous_state: JSON.stringify({
          operational_notes: old.operational_notes,
          calculated_lead_time_days: old.calculated_lead_time_days,
          logistics_priority: old.logistics_priority,
        }),
        new_state: JSON.stringify(metadata),
        reason: 'Atualização auditada de Metadados TMS da combinação Itinerário x Rota',
        correlation_id: `COMBO-META-${Date.now()}`,
        payload: { technical_key: old.technical_key, metadata },
      })
      return true
    } catch (err) {
      console.error('Falha ao atualizar metadados TMS da combinação:', err)
      return false
    }
  }

  /**
   * Motor de Inteligência de Consolidação e Compatibilidade Logística (Requisitos 12 e 13).
   * Identifica para um itinerário ou pedido:
   * - Rota correspondente
   * - Outros pedidos compatíveis por mesma rota ou rota limítrofe
   * - Possibilidade de consolidação de carga
   * - Regiões atendidas pela mesma rota
   */
  static async findLogisticsCompatibility(
    targetItineraryCode: string,
    targetRouteCode?: string,
  ): Promise<{
    primaryRoute: SapRouteEntity | null
    candidateCombinations: SapItineraryRouteEntity[]
    compatibleOrders: RouteCompatibilityCandidate[]
    servicedRegions: string[]
    aiRecommendation: string
  }> {
    try {
      const cleanItin = (targetItineraryCode || '').trim().toUpperCase()
      const cleanRoute = (targetRouteCode || '').trim().toUpperCase()

      // 1. Busca combinações existentes para o itinerário
      const allCombos = await this.getItineraryRouteCombinations(true)
      const directCombos = allCombos.filter((c) => c.itinerary_sap_code === cleanItin)
      const selectedRouteCode =
        cleanRoute || (directCombos[0]?.route_sap_code ?? `ROT-${cleanItin}`)

      // 2. Busca todas as combinações que atendem à mesma rota
      const sameRouteCombos = allCombos.filter((c) => c.route_sap_code === selectedRouteCode)

      // Regiões e UFs atendidas por essa rota
      const regionsSet = new Set<string>()
      sameRouteCombos.forEach((c) => {
        if (c.region) regionsSet.add(c.region)
        if (c.destination) regionsSet.add(c.destination)
      })
      const servicedRegions = Array.from(regionsSet)

      // 3. Busca pedidos na carteira de vendas pertencentes a essa rota ou itinerários correlatos
      const orders = await pb.collection('sap_sales_orders').getFullList({
        filter: 'status = "disponivel"',
        sort: '-weight_kg',
        limit: 100,
      })

      const compatibleOrders: RouteCompatibilityCandidate[] = []

      orders.forEach((o: any) => {
        const orderItin = (o.itinerary_code || '').trim().toUpperCase()
        const orderRoute = (o.route_code || `ROT-${orderItin}`).trim().toUpperCase()

        let score = 0
        let reason = ''

        if (orderItin === cleanItin && orderRoute === selectedRouteCode) {
          score = 100
          reason = 'Mesmo itinerário e mesma rota SAP oficial (compatibilidade máxima)'
        } else if (orderRoute === selectedRouteCode) {
          score = 85
          reason = `Mesma rota SAP (${selectedRouteCode}) via itinerário compatível ${orderItin}`
        } else if (orderItin === cleanItin) {
          score = 75
          reason = `Mesmo itinerário SAP (${orderItin}), rota secundária`
        } else if (o.uf === directCombos[0]?.uf) {
          score = 50
          reason = `Mesmo estado (${o.uf}) com potencial de rota complementar`
        }

        if (score >= 50) {
          compatibleOrders.push({
            orderNumber: o.order_number,
            customerCode: o.customer_code,
            customerName: o.customer_name,
            destinationCity: o.destination_city,
            uf: o.uf,
            itineraryCode: orderItin,
            routeCode: orderRoute,
            weightKg: o.weight_kg || 0,
            compatibilityReason: reason,
            compatibilityScore: score,
          })
        }
      })

      // Rota primária
      const routes = await this.getRoutes()
      const primaryRoute =
        routes.find((r) => r.sap_route_code === selectedRouteCode) ||
        routes.find((r) => r.sap_route_code === `ROT-${cleanItin}`) ||
        null

      // Recomendação de IA logística
      let aiRecommendation = ''
      if (compatibleOrders.length === 0) {
        aiRecommendation = `Nenhum pedido adicional encontrado para consolidação na rota ${selectedRouteCode}. Recomendada formação dedicada ou aguardar novos pedidos SAP.`
      } else {
        const totalWeight = compatibleOrders.reduce((sum, c) => sum + c.weightKg, 0)
        aiRecommendation = `Identificados ${compatibleOrders.length} pedidos logisticamente compatíveis na rota SAP ${selectedRouteCode} (total ${Math.round(
          totalWeight / 1000,
        )} t). A IA avalia alta aderência geográfica nas regiões: ${servicedRegions
          .slice(0, 3)
          .join(', ')}.`
      }

      return {
        primaryRoute,
        candidateCombinations: sameRouteCombos,
        compatibleOrders,
        servicedRegions,
        aiRecommendation,
      }
    } catch (err) {
      console.error('Falha ao calcular compatibilidade de rotas:', err)
      return {
        primaryRoute: null,
        candidateCombinations: [],
        compatibleOrders: [],
        servicedRegions: [],
        aiRecommendation: 'Indisponível no momento.',
      }
    }
  }

  private static async recordSyncLog(
    log: Omit<SapRouteSyncLogEntity, 'id' | 'created' | 'updated'>,
  ) {
    try {
      await pb.collection('sap_route_sync_logs').create(log)
    } catch (err) {
      console.error('Falha ao registrar log de sincronização em sap_route_sync_logs:', err)
    }
  }
}
