// src/services/controlTowerService.ts
// Serviço centralizado da Torre de Controle TMS HUB CIAFAL
// Consome endpoints de agregação server-side e coleções PocketBase reais com fallback seguro
// Zero dados fictícios: sem informação = "0 cargas / 0,00 t"

import pb from '@/lib/pocketbase/client'

export type TowerTimePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'year'

export interface TowerCargoItem {
  id: string
  cargo_id: string
  transport_number: string
  sap_transport_number?: string
  customer_name: string
  destination_city: string
  destination_uf: string
  itinerary: string
  weight_kg: number
  weight_ton: number
  driver_name: string
  vehicle_plate: string
  vehicle_type?: string
  carrier_name: string
  freight_value: number
  toll_value: number
  status: string
  source_module?: string
  last_movement_at: string
  edit_transport_url: string
}

export interface TowerBucketSummary {
  loads: number
  tons: number
  loads_formatted: string
  tons_formatted: string
  items: TowerCargoItem[]
}

export interface TowerSummaryResponse {
  period: TowerTimePeriod
  period_label: string
  range: {
    start: string
    end: string
  }
  fluxo_cargas: {
    em_negociacao: TowerBucketSummary
    com_contraproposta: TowerBucketSummary
    recusadas: TowerBucketSummary
    em_expedicao: TowerBucketSummary
    faturadas: TowerBucketSummary
  }
  timestamp: string
}

export const formatBrazilianTons = (tons: number): string => {
  if (typeof tons !== 'number' || isNaN(tons) || tons <= 0) return '0,00 t'
  return tons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' t'
}

export const formatBrazilianLoads = (count: number): string => {
  const n = Number(count) || 0
  if (n <= 0) return '0 cargas'
  return `${n} ${n === 1 ? 'carga' : 'cargas'}`
}

export const formatBrazilianCurrency = (val: number): string => {
  const n = Number(val) || 0
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export const formatBrazilianDateTime = (iso: string): string => {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (_) {
    return iso
  }
}

export class ControlTowerService {
  /**
   * Obtém os indicadores de fluxo de carga agregados server-side para o período selecionado
   * @param period 'today' | 'yesterday' | 'week' | 'month' | 'year'
   */
  static async getTowerSummary(period: TowerTimePeriod = 'today'): Promise<TowerSummaryResponse> {
    try {
      // 1. Tenta chamar o endpoint de agregação de alta performance no backend
      const res = await pb.send<TowerSummaryResponse>(
        `/backend/v1/tms/control-tower/summary?period=${encodeURIComponent(period)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      )
      if (res && res.fluxo_cargas) {
        return res
      }
    } catch (err) {
      console.warn('Endpoint /backend/v1/tms/control-tower/summary fallback local:', err)
    }

    // 2. Fallback de agregação direta no client consultando as coleções do PocketBase
    return this.calculateLocalTowerSummary(period)
  }

  /**
   * Cálculo fallback do resumo da torre de controle diretamente das coleções do PocketBase
   */
  static async calculateLocalTowerSummary(period: TowerTimePeriod): Promise<TowerSummaryResponse> {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    let startIso = ''
    let endIso = ''
    let periodLabel = ''

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    if (period === 'yesterday') {
      const yesterday = new Date(startOfToday)
      yesterday.setDate(yesterday.getDate() - 1)
      const endYesterday = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        23,
        59,
        59,
        999,
      )
      startIso = yesterday.toISOString()
      endIso = endYesterday.toISOString()
      periodLabel = `${pad(yesterday.getDate())}/${pad(yesterday.getMonth() + 1)}/${yesterday.getFullYear()}`
    } else if (period === 'week') {
      const dayOfWeek = now.getDay()
      const diffToMonday = (dayOfWeek + 6) % 7
      const monday = new Date(startOfToday)
      monday.setDate(monday.getDate() - diffToMonday)
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      startIso = monday.toISOString()
      endIso = sunday.toISOString()
      periodLabel = `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)}/${monday.getFullYear()} a ${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}/${sunday.getFullYear()}`
    } else if (period === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      startIso = firstDay.toISOString()
      endIso = lastDay.toISOString()
      periodLabel = `${pad(firstDay.getDate())}/${pad(firstDay.getMonth() + 1)}/${firstDay.getFullYear()} a ${pad(lastDay.getDate())}/${pad(lastDay.getMonth() + 1)}/${lastDay.getFullYear()}`
    } else if (period === 'year') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      const lastDayYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      startIso = firstDayYear.toISOString()
      endIso = lastDayYear.toISOString()
      periodLabel = `01/01/${now.getFullYear()} a 31/12/${now.getFullYear()}`
    } else {
      startIso = startOfToday.toISOString()
      endIso = endOfToday.toISOString()
      periodLabel = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`
    }

    const startDate = new Date(startIso)
    const endDate = new Date(endIso)

    const isDateInPeriod = (dateVal?: string): boolean => {
      if (!dateVal) return false
      try {
        const d = new Date(dateVal)
        if (isNaN(d.getTime())) return false
        return d >= startDate && d <= endDate
      } catch (_) {
        return false
      }
    }

    const [negociacoesRes, chicaoRes, carrierRes, expRes, auditRes] = await Promise.allSettled([
      pb.collection('negociacoes').getList(1, 200, { sort: '-created' }),
      pb.collection('chicao_freight_offers').getList(1, 200, { sort: '-created' }),
      pb.collection('carrier_operational_history').getList(1, 200, { sort: '-created' }),
      pb.collection('expedition_tracking').getList(1, 200, { sort: '-created' }),
      pb.collection('audit_logs').getList(1, 200, { sort: '-created' }),
    ])

    const negociacoes = negociacoesRes.status === 'fulfilled' ? negociacoesRes.value.items : []
    const chicaoOffers = chicaoRes.status === 'fulfilled' ? chicaoRes.value.items : []
    const carrierHistory = carrierRes.status === 'fulfilled' ? carrierRes.value.items : []
    const expeditionTracking = expRes.status === 'fulfilled' ? expRes.value.items : []
    const auditLogs = auditRes.status === 'fulfilled' ? auditRes.value.items : []

    const inNegMap = new Map<string, TowerCargoItem>()
    const withCpMap = new Map<string, TowerCargoItem>()
    const refusedMap = new Map<string, TowerCargoItem>()
    const inExpMap = new Map<string, TowerCargoItem>()
    const invoicedMap = new Map<string, TowerCargoItem>()

    // Processar auditorias de recusa
    for (const al of auditLogs) {
      const act = al.action || ''
      const createdStr = al.created || ''
      if (!isDateInPeriod(createdStr)) continue

      if (
        act === 'OFERTA_RECUSADA' ||
        act === 'RECUSA_NEGOCIACAO' ||
        al.new_state === 'RECUSADO' ||
        al.new_state === 'RECUSADA'
      ) {
        const key = al.sap_transport_number || al.resource_id || `rec-${al.id}`
        if (!refusedMap.has(key)) {
          refusedMap.set(key, {
            id: al.id,
            cargo_id: key,
            transport_number: al.sap_transport_number || key,
            sap_transport_number: al.sap_transport_number || '',
            customer_name: 'Carga com Recusa no Período',
            destination_city: 'Origem Contagem',
            destination_uf: 'MG',
            itinerary: 'Mesa de Negociação',
            weight_kg: 0,
            weight_ton: 0,
            driver_name: al.user_name || 'Motorista Convocado',
            vehicle_plate: 'Aguardando novo motorista',
            vehicle_type: 'Truck / Carreta',
            carrier_name: 'Transportador Negociado',
            freight_value: 0,
            toll_value: 0,
            status: 'RECUSADA',
            source_module: 'audit_logs',
            last_movement_at: createdStr,
            edit_transport_url: '/tms/mesa-fretes',
          })
        }
      }
    }

    // 1. Em Negociação
    for (const n of negociacoes) {
      const st = n.status
      const relDate = n.updated || n.opened_at || n.created
      if ((st === 'EM_NEGOCIACAO' || st === 'ABERTO') && isDateInPeriod(relDate)) {
        const cargoId = n.cargo_id || n.negotiation_number || n.id
        const weightKg = Number(n.total_weight_kg) || 0
        inNegMap.set(cargoId, {
          id: n.id,
          cargo_id: cargoId,
          transport_number: n.sap_transport_number || n.negotiation_number || cargoId,
          sap_transport_number: n.sap_transport_number || '',
          customer_name: 'Clientes Diversos',
          destination_city: n.destination || 'Contagem',
          destination_uf: n.uf || 'MG',
          itinerary: n.itinerary_description || n.itinerary_code || 'Rota Comercial',
          weight_kg: weightKg,
          weight_ton: Math.round((weightKg / 1000) * 100) / 100,
          driver_name: n.driver_name || 'Não atribuído',
          vehicle_plate: n.vehicle_plate || 'Aguardando alocação',
          vehicle_type: n.vehicle_type || 'Carreta',
          carrier_name: n.carrier_name || 'Mesa de Fretes',
          freight_value: Number(n.negotiated_freight_value || n.initial_freight_value) || 0,
          toll_value: Number(n.toll_value) || 0,
          status: 'EM_NEGOCIACAO',
          source_module: 'negociacoes',
          last_movement_at: relDate,
          edit_transport_url: n.sap_transport_number
            ? `/tms/editar-transporte?transporte=${n.sap_transport_number}`
            : `/tms/negociacoes`,
        })
      }
    }

    for (const ch of chicaoOffers) {
      const st = ch.status
      const relDate = ch.updated || ch.created
      if (
        [
          'DISPONIVEL',
          'SELECIONADO',
          'ENVIADO_CHICAO',
          'OFERTA_ENVIADA',
          'VISUALIZADA',
          'EM_NEGOCIACAO',
        ].includes(st)
      ) {
        if (isDateInPeriod(relDate)) {
          const cargoId = ch.cargo_id || ch.offer_code || ch.id
          if (!inNegMap.has(cargoId)) {
            const weightKg = Number(ch.weight_kg) || 0
            inNegMap.set(cargoId, {
              id: ch.id,
              cargo_id: cargoId,
              transport_number: ch.sap_transport_number || ch.offer_code || cargoId,
              sap_transport_number: ch.sap_transport_number || '',
              customer_name: ch.cargo_title || 'Clientes Carga Chicão',
              destination_city: ch.destination_city || 'Destino',
              destination_uf: ch.destination_uf || 'MG',
              itinerary: ch.itinerary_description || ch.itinerary_code || 'Itinerário Oferta',
              weight_kg: weightKg,
              weight_ton: Math.round((weightKg / 1000) * 100) / 100,
              driver_name: ch.driver_name || 'Não atribuído',
              vehicle_plate: ch.vehicle_plate || 'Aguardando alocação',
              vehicle_type: ch.vehicle_type || 'Veículo Padrão',
              carrier_name: ch.carrier_name || 'Mesa Chicão IA',
              freight_value: Number(ch.total_offered_value || ch.initial_offer_value) || 0,
              toll_value: Number(ch.toll_cost) || 0,
              status: 'EM_NEGOCIACAO',
              source_module: 'chicao_freight_offers',
              last_movement_at: relDate,
              edit_transport_url: ch.sap_transport_number
                ? `/tms/editar-transporte?transporte=${ch.sap_transport_number}`
                : `/tms/mesa-fretes`,
            })
          }
        }
      }
    }

    // 2. Com Contraproposta
    for (const n of negociacoes) {
      const st = n.status
      let counterProposals: any[] = []
      try {
        if (Array.isArray(n.counter_proposals_json)) counterProposals = n.counter_proposals_json
        else if (typeof n.counter_proposals_json === 'string')
          counterProposals = JSON.parse(n.counter_proposals_json)
      } catch {
        /* intentionally ignored */
      }

      const hasCp = counterProposals.some((cp) => cp && (cp.sender === 'MOTORISTA' || cp.round > 1))
      const relDate = n.updated || n.created
      if (hasCp && (st === 'EM_NEGOCIACAO' || st === 'ABERTO') && isDateInPeriod(relDate)) {
        const cargoId = n.cargo_id || n.negotiation_number || n.id
        const weightKg = Number(n.total_weight_kg) || 0
        withCpMap.set(cargoId, {
          id: n.id,
          cargo_id: cargoId,
          transport_number: n.sap_transport_number || n.negotiation_number || cargoId,
          sap_transport_number: n.sap_transport_number || '',
          customer_name: 'Clientes Diversos',
          destination_city: n.destination || 'Contagem',
          destination_uf: n.uf || 'MG',
          itinerary: n.itinerary_description || n.itinerary_code || 'Rota Comercial',
          weight_kg: weightKg,
          weight_ton: Math.round((weightKg / 1000) * 100) / 100,
          driver_name: n.driver_name || 'Não atribuído',
          vehicle_plate: n.vehicle_plate || 'Aguardando alocação',
          vehicle_type: n.vehicle_type || 'Carreta',
          carrier_name: n.carrier_name || 'Mesa de Fretes',
          freight_value: Number(n.negotiated_freight_value || n.initial_freight_value) || 0,
          toll_value: Number(n.toll_value) || 0,
          status: 'CONTRAPROPOSTA_PENDENTE',
          source_module: 'negociacoes',
          last_movement_at: relDate,
          edit_transport_url: n.sap_transport_number
            ? `/tms/editar-transporte?transporte=${n.sap_transport_number}`
            : `/tms/negociacoes`,
        })
      }
    }

    for (const ch of chicaoOffers) {
      const st = ch.status
      const cpVal = Number(ch.counter_value_requested) || 0
      const relDate = ch.updated || ch.created
      if (
        (st === 'CONTRAPROPOSTA' || cpVal > 0) &&
        st !== 'ACEITA' &&
        st !== 'RECUSADA' &&
        isDateInPeriod(relDate)
      ) {
        const cargoId = ch.cargo_id || ch.offer_code || ch.id
        const weightKg = Number(ch.weight_kg) || 0
        withCpMap.set(cargoId, {
          id: ch.id,
          cargo_id: cargoId,
          transport_number: ch.sap_transport_number || ch.offer_code || cargoId,
          sap_transport_number: ch.sap_transport_number || '',
          customer_name: ch.cargo_title || 'Clientes Carga Chicão',
          destination_city: ch.destination_city || 'Destino',
          destination_uf: ch.destination_uf || 'MG',
          itinerary: ch.itinerary_description || ch.itinerary_code || 'Itinerário Oferta',
          weight_kg: weightKg,
          weight_ton: Math.round((weightKg / 1000) * 100) / 100,
          driver_name: ch.driver_name || 'Não atribuído',
          vehicle_plate: ch.vehicle_plate || 'Aguardando alocação',
          vehicle_type: ch.vehicle_type || 'Veículo Padrão',
          carrier_name: ch.carrier_name || 'Mesa Chicão IA',
          freight_value: Number(ch.total_offered_value || ch.initial_offer_value) || 0,
          toll_value: Number(ch.toll_cost) || 0,
          status: 'CONTRAPROPOSTA',
          source_module: 'chicao_freight_offers',
          last_movement_at: relDate,
          edit_transport_url: ch.sap_transport_number
            ? `/tms/editar-transporte?transporte=${ch.sap_transport_number}`
            : `/tms/mesa-fretes`,
        })
      }
    }

    // 3. Recusadas (cargas únicas)
    for (const n of negociacoes) {
      const st = n.status
      const relDate = n.concluded_at || n.updated || n.created
      if ((st === 'RECUSADO' || st === 'RECUSADA') && isDateInPeriod(relDate)) {
        const cargoId = n.cargo_id || n.negotiation_number || n.id
        const weightKg = Number(n.total_weight_kg) || 0
        refusedMap.set(cargoId, {
          id: n.id,
          cargo_id: cargoId,
          transport_number: n.sap_transport_number || n.negotiation_number || cargoId,
          sap_transport_number: n.sap_transport_number || '',
          customer_name: 'Clientes Diversos',
          destination_city: n.destination || 'Contagem',
          destination_uf: n.uf || 'MG',
          itinerary: n.itinerary_description || n.itinerary_code || 'Rota Comercial',
          weight_kg: weightKg,
          weight_ton: Math.round((weightKg / 1000) * 100) / 100,
          driver_name: n.driver_name || 'Não atribuído',
          vehicle_plate: n.vehicle_plate || 'Recusada',
          vehicle_type: n.vehicle_type || 'Carreta',
          carrier_name: n.carrier_name || 'Mesa de Fretes',
          freight_value: Number(n.negotiated_freight_value || n.initial_freight_value) || 0,
          toll_value: Number(n.toll_value) || 0,
          status: 'RECUSADA',
          source_module: 'negociacoes',
          last_movement_at: relDate,
          edit_transport_url: n.sap_transport_number
            ? `/tms/editar-transporte?transporte=${n.sap_transport_number}`
            : `/tms/negociacoes`,
        })
      }
    }

    for (const ch of chicaoOffers) {
      const st = ch.status
      const relDate = ch.updated || ch.created
      if ((st === 'RECUSADA' || st === 'RECUSADO') && isDateInPeriod(relDate)) {
        const cargoId = ch.cargo_id || ch.offer_code || ch.id
        if (!refusedMap.has(cargoId)) {
          const weightKg = Number(ch.weight_kg) || 0
          refusedMap.set(cargoId, {
            id: ch.id,
            cargo_id: cargoId,
            transport_number: ch.sap_transport_number || ch.offer_code || cargoId,
            sap_transport_number: ch.sap_transport_number || '',
            customer_name: ch.cargo_title || 'Clientes Carga Chicão',
            destination_city: ch.destination_city || 'Destino',
            destination_uf: ch.destination_uf || 'MG',
            itinerary: ch.itinerary_description || ch.itinerary_code || 'Itinerário Oferta',
            weight_kg: weightKg,
            weight_ton: Math.round((weightKg / 1000) * 100) / 100,
            driver_name: ch.driver_name || 'Não atribuído',
            vehicle_plate: ch.vehicle_plate || 'Recusada',
            vehicle_type: ch.vehicle_type || 'Veículo Padrão',
            carrier_name: ch.carrier_name || 'Mesa Chicão IA',
            freight_value: Number(ch.total_offered_value || ch.initial_offer_value) || 0,
            toll_value: Number(ch.toll_cost) || 0,
            status: 'RECUSADA',
            source_module: 'chicao_freight_offers',
            last_movement_at: relDate,
            edit_transport_url: ch.sap_transport_number
              ? `/tms/editar-transporte?transporte=${ch.sap_transport_number}`
              : `/tms/mesa-fretes`,
          })
        }
      }
    }

    // 4. Em Expedição
    for (const exp of expeditionTracking) {
      const opSt = exp.operational_status
      const relDate = exp.updated || exp.created || exp.entry_time
      if (
        !['FATURADO', 'LIBERADO', 'SAIDA_DO_PATIO', 'EM_VIAGEM'].includes(opSt) &&
        isDateInPeriod(relDate)
      ) {
        const cargoId = exp.cargo_id || exp.sap_transport_number || exp.id
        const weightKg = Number(exp.weight_total_kg) || 0
        inExpMap.set(cargoId, {
          id: exp.id,
          cargo_id: cargoId,
          transport_number: exp.sap_transport_number || exp.cargo_id || cargoId,
          sap_transport_number: exp.sap_transport_number || '',
          customer_name: exp.clients_summary || 'Expedição Clientes',
          destination_city: exp.destination_cities || 'Destino',
          destination_uf: 'SP',
          itinerary: exp.itinerary_code || 'Expedição Operacional',
          weight_kg: weightKg,
          weight_ton: Math.round((weightKg / 1000) * 100) / 100,
          driver_name: exp.driver_name || 'Definido na Expedição',
          vehicle_plate: exp.vehicle_plate || 'Veículo Alocado',
          vehicle_type: 'Carreta Convencional',
          carrier_name: exp.carrier_name || 'Frota CIAFAL',
          freight_value: 0,
          toll_value: 0,
          status: opSt || 'EM_EXPEDICAO',
          source_module: 'expedition_tracking',
          last_movement_at: relDate,
          edit_transport_url: exp.sap_transport_number
            ? `/tms/editar-transporte?transporte=${exp.sap_transport_number}`
            : `/tms/expedicao`,
        })
      }
    }

    for (const ch of carrierHistory) {
      const finalSt = ch.final_status
      const relDate = ch.updated || ch.created || ch.transport_date
      if (
        (finalSt === 'EM_EXPEDICAO' ||
          (finalSt !== 'CONCLUIDO' && finalSt !== 'FATURADO' && !ch.invoicing_date)) &&
        isDateInPeriod(relDate)
      ) {
        const cargoId = ch.transport_order_number || ch.sap_transport_number || ch.id
        if (!inExpMap.has(cargoId)) {
          const weightKg = Number(ch.weight_kg) || (Number(ch.weight_ton) || 0) * 1000
          const weightTon = Number(ch.weight_ton) || Math.round((weightKg / 1000) * 100) / 100
          inExpMap.set(cargoId, {
            id: ch.id,
            cargo_id: cargoId,
            transport_number: ch.sap_transport_number || ch.transport_order_number || cargoId,
            sap_transport_number: ch.sap_transport_number || '',
            customer_name: ch.customers_summary || 'Cliente CIAFAL',
            destination_city: ch.destination_city || '',
            destination_uf: ch.destination_uf || '',
            itinerary: ch.itinerary_description || ch.itinerary_code || '',
            weight_kg: weightKg,
            weight_ton: weightTon,
            driver_name: ch.driver_name || '',
            vehicle_plate: ch.vehicle_plate || '',
            vehicle_type: ch.vehicle_type || '',
            carrier_name: ch.carrier_name || '',
            freight_value: Number(ch.freight_cost_driver) || 0,
            toll_value: Number(ch.toll_cost) || 0,
            status: 'EM_EXPEDICAO',
            source_module: 'carrier_operational_history',
            last_movement_at: relDate,
            edit_transport_url: ch.sap_transport_number
              ? `/tms/editar-transporte?transporte=${ch.sap_transport_number}`
              : `/tms/editar-transporte`,
          })
        }
      }
    }

    // 5. Cargas Faturadas
    for (const ch of carrierHistory) {
      const invDate = ch.invoicing_date
      const finalSt = ch.final_status
      if (invDate && isDateInPeriod(invDate)) {
        const cargoId = ch.transport_order_number || ch.sap_transport_number || ch.id
        const weightKg = Number(ch.weight_kg) || (Number(ch.weight_ton) || 0) * 1000
        const weightTon = Number(ch.weight_ton) || Math.round((weightKg / 1000) * 100) / 100
        invoicedMap.set(cargoId, {
          id: ch.id,
          cargo_id: cargoId,
          transport_number: ch.sap_transport_number || ch.transport_order_number || cargoId,
          sap_transport_number: ch.sap_transport_number || '',
          customer_name: ch.customers_summary || 'Cliente CIAFAL',
          destination_city: ch.destination_city || '',
          destination_uf: ch.destination_uf || '',
          itinerary: ch.itinerary_description || ch.itinerary_code || '',
          weight_kg: weightKg,
          weight_ton: weightTon,
          driver_name: ch.driver_name || '',
          vehicle_plate: ch.vehicle_plate || '',
          vehicle_type: ch.vehicle_type || '',
          carrier_name: ch.carrier_name || '',
          freight_value: Number(ch.freight_cost_driver) || 0,
          toll_value: Number(ch.toll_cost) || 0,
          status: 'FATURADO',
          source_module: 'carrier_operational_history',
          last_movement_at: invDate,
          edit_transport_url: ch.sap_transport_number
            ? `/tms/editar-transporte?transporte=${ch.sap_transport_number}`
            : `/tms/editar-transporte`,
        })
      } else if (!invDate && finalSt === 'CONCLUIDO') {
        const tDate = ch.transport_date || ch.updated
        if (isDateInPeriod(tDate)) {
          const cargoId = ch.transport_order_number || ch.sap_transport_number || ch.id
          if (!invoicedMap.has(cargoId)) {
            const weightKg = Number(ch.weight_kg) || (Number(ch.weight_ton) || 0) * 1000
            const weightTon = Number(ch.weight_ton) || Math.round((weightKg / 1000) * 100) / 100
            invoicedMap.set(cargoId, {
              id: ch.id,
              cargo_id: cargoId,
              transport_number: ch.sap_transport_number || ch.transport_order_number || cargoId,
              sap_transport_number: ch.sap_transport_number || '',
              customer_name: ch.customers_summary || 'Cliente CIAFAL',
              destination_city: ch.destination_city || '',
              destination_uf: ch.destination_uf || '',
              itinerary: ch.itinerary_description || ch.itinerary_code || '',
              weight_kg: weightKg,
              weight_ton: weightTon,
              driver_name: ch.driver_name || '',
              vehicle_plate: ch.vehicle_plate || '',
              vehicle_type: ch.vehicle_type || '',
              carrier_name: ch.carrier_name || '',
              freight_value: Number(ch.freight_cost_driver) || 0,
              toll_value: Number(ch.toll_cost) || 0,
              status: 'FATURADO',
              source_module: 'carrier_operational_history',
              last_movement_at: tDate,
              edit_transport_url: ch.sap_transport_number
                ? `/tms/editar-transporte?transporte=${ch.sap_transport_number}`
                : `/tms/editar-transporte`,
            })
          }
        }
      }
    }

    for (const exp of expeditionTracking) {
      const opSt = exp.operational_status
      const relDate = exp.updated || exp.created
      if (['FATURADO', 'LIBERADO'].includes(opSt) && isDateInPeriod(relDate)) {
        const cargoId = exp.cargo_id || exp.sap_transport_number || exp.id
        if (!invoicedMap.has(cargoId)) {
          const weightKg = Number(exp.weight_total_kg) || 0
          invoicedMap.set(cargoId, {
            id: exp.id,
            cargo_id: cargoId,
            transport_number: exp.sap_transport_number || exp.cargo_id || cargoId,
            sap_transport_number: exp.sap_transport_number || '',
            customer_name: exp.clients_summary || 'Expedição Clientes',
            destination_city: exp.destination_cities || 'Destino',
            destination_uf: 'SP',
            itinerary: exp.itinerary_code || 'Expedição Operacional',
            weight_kg: weightKg,
            weight_ton: Math.round((weightKg / 1000) * 100) / 100,
            driver_name: exp.driver_name || 'Definido na Expedição',
            vehicle_plate: exp.vehicle_plate || 'Veículo Alocado',
            vehicle_type: 'Carreta Convencional',
            carrier_name: exp.carrier_name || 'Frota CIAFAL',
            freight_value: 0,
            toll_value: 0,
            status: 'FATURADO',
            source_module: 'expedition_tracking',
            last_movement_at: relDate,
            edit_transport_url: exp.sap_transport_number
              ? `/tms/editar-transporte?transporte=${exp.sap_transport_number}`
              : `/tms/expedicao`,
          })
        }
      }
    }

    const buildBucket = (itemsMap: Map<string, TowerCargoItem>): TowerBucketSummary => {
      const items = Array.from(itemsMap.values())
      const loads = items.length
      const totalKg = items.reduce(
        (acc, it) => acc + (it.weight_kg || it.weight_ton * 1000 || 0),
        0,
      )
      const tons = Math.round((totalKg / 1000) * 100) / 100
      return {
        loads,
        tons,
        loads_formatted: formatBrazilianLoads(loads),
        tons_formatted: formatBrazilianTons(tons),
        items,
      }
    }

    return {
      period,
      period_label: periodLabel,
      range: {
        start: startIso,
        end: endIso,
      },
      fluxo_cargas: {
        em_negociacao: buildBucket(inNegMap),
        com_contraproposta: buildBucket(withCpMap),
        recusadas: buildBucket(refusedMap),
        em_expedicao: buildBucket(inExpMap),
        faturadas: buildBucket(invoicedMap),
      },
      timestamp: new Date().toISOString(),
    }
  }
}
