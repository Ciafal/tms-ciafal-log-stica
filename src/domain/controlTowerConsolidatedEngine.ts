// TMS CIAFAL — Modelo e Engine de Visão 360º da Torre de Controle Logística
// Consolida dados de Fila (queue_entries), Negociações/Ofertas (freight_offers/freight_negotiations),
// Expedição (expedition_tracking), Rastreamento Fred (fred_transports), Ocorrências (fred_occurrences) e Carteira SAP (sap_sales_orders).

export type TowerViewMode =
  | 'executiva'
  | 'cards'
  | 'kanban'
  | 'graficos'
  | 'ytd'
  | 'mapa'
  | 'alertas'
  | 'lista'

export type UnifiedTransportStage =
  | 'DISPONIBILIDADE'
  | 'PLANEJADO'
  | 'EM_NEGOCIACAO'
  | 'CONTRATADO'
  | 'EM_COLETA'
  | 'FILA_PORTA'
  | 'PATIO'
  | 'CARREGAMENTO'
  | 'FATURAMENTO'
  | 'EM_ROTA'
  | 'EM_DESCARGA'
  | 'ENTREGUE'

export type UnifiedSlaStatus = 'NORMAL' | 'ATENCAO' | 'CRITICO' | 'ATRASADO'

export interface UnifiedTransportItem {
  id: string
  transportNumber: string
  sapTransportNumber: string
  cargoId?: string
  sourceCollection:
    | 'queue_entries'
    | 'freight_offers'
    | 'freight_negotiations'
    | 'expedition_tracking'
    | 'fred_transports'
    | 'sap_sales_orders'
  stage: UnifiedTransportStage
  stageLabel: string
  statusRaw: string
  company: string
  plant: string
  customerName: string
  deliveriesCount: number
  destinationCity: string
  destinationUf: string
  routeCode: string
  weightKg: number
  weightTon: number
  vehicleType: string
  vehiclePlate: string
  driverName: string
  driverPhone?: string
  driverDocument?: string
  carrierName: string
  plannedTime?: string
  entryTime?: string
  exitTime?: string
  etaDelivery?: string
  slaStatus: UnifiedSlaStatus
  slaReason?: string
  hasIntercurrence: boolean
  intercurrenceDescription?: string
  intercurrenceSeverity?: 'INFORMATIVO' | 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  responsibleSector: string
  updatedAt: string
  freightValue?: number
  dockName?: string
  leadTimeMinutes?: number
  currentStageDurationMin?: number
  lat?: number
  lng?: number
}

export interface TowerGlobalFilters {
  company: string
  plant: string
  period: 'HOJE' | 'ONTEM' | 'SEMANA' | 'MES' | 'YTD' | 'TODOS'
  carrier: string
  driver: string
  plate: string
  customer: string
  uf: string
  route: string
  vehicleType: string
  status: string
  slaStatus: string
  hasIntercurrence: 'TODOS' | 'COM' | 'SEM'
  searchTerm: string
}

export const INITIAL_TOWER_FILTERS: TowerGlobalFilters = {
  company: 'TODAS',
  plant: 'TODOS',
  period: 'TODOS',
  carrier: 'TODAS',
  driver: 'TODOS',
  plate: 'TODAS',
  customer: 'TODOS',
  uf: 'TODAS',
  route: 'TODAS',
  vehicleType: 'TODOS',
  status: 'TODOS',
  slaStatus: 'TODOS',
  hasIntercurrence: 'TODOS',
  searchTerm: '',
}

export interface ExecutiveCardsData {
  // 1. Veículos na Fila
  queue: {
    totalVehicles: number
    totalTon: number
    avgWaitMinutes: number
    longestWaitingVehicle: { plate: string; driver: string; minutes: number } | null
    subdivision: {
      foraCiafal: number
      porta: number
      patio: number
      aguardandoCarregamento: number
      emCarregamento: number
    }
  }
  // 2. Transportes em Negociação
  negotiation: {
    totalTransports: number
    totalTon: number
    totalFreightValue: number
    activeDrivers: number
    avgNegotiationMinutes: number
    overSlaCount: number
  }
  // 3. Transportes em Coleta
  collectionStage: {
    totalTransports: number
    totalTon: number
    totalVehicles: number
    onTimeCount: number
    delayedCount: number
    expectedTodayCount: number
  }
  // 4. Transportes em Expedição
  expedition: {
    totalTransports: number
    totalTon: number
    aguardandoEntrada: number
    noPatio: number
    emCarregamento: number
    carregamentoConcluido: number
    aguardandoFaturamento: number
    faturadosAguardandoSaida: number
  }
  // 5. Transportes em Rota
  inRoute: {
    totalTransports: number
    totalTon: number
    expectedDeliveries: number
    onTimeCount: number
    riskDelayCount: number
    delayedCount: number
    openOccurrencesCount: number
  }
  // 6. Transportes Entregues
  delivered: {
    today: { count: number; ton: number; deliveries: number; onTimePct: number }
    currentMonth: { count: number; ton: number; deliveries: number; onTimePct: number }
    ytd: { count: number; ton: number; deliveries: number; onTimePct: number }
  }
}

export const KANBAN_COLUMNS: { id: UnifiedTransportStage; label: string; color: string }[] = [
  {
    id: 'DISPONIBILIDADE',
    label: 'Disponibilidade',
    color: 'border-sky-500 bg-sky-50/40 text-sky-800',
  },
  { id: 'PLANEJADO', label: 'Planejado', color: 'border-blue-500 bg-blue-50/40 text-blue-800' },
  {
    id: 'EM_NEGOCIACAO',
    label: 'Em Negociação',
    color: 'border-amber-500 bg-amber-50/40 text-amber-800',
  },
  {
    id: 'CONTRATADO',
    label: 'Contratado',
    color: 'border-indigo-500 bg-indigo-50/40 text-indigo-800',
  },
  { id: 'EM_COLETA', label: 'Em Coleta', color: 'border-cyan-500 bg-cyan-50/40 text-cyan-800' },
  { id: 'FILA_PORTA', label: 'Fila / Porta', color: 'border-teal-500 bg-teal-50/40 text-teal-800' },
  { id: 'PATIO', label: 'Pátio', color: 'border-slate-500 bg-slate-50/40 text-slate-800' },
  {
    id: 'CARREGAMENTO',
    label: 'Carregamento',
    color: 'border-orange-500 bg-orange-50/40 text-orange-800',
  },
  {
    id: 'FATURAMENTO',
    label: 'Faturamento',
    color: 'border-purple-500 bg-purple-50/40 text-purple-800',
  },
  { id: 'EM_ROTA', label: 'Em Rota', color: 'border-blue-600 bg-blue-50/40 text-blue-900' },
  {
    id: 'EM_DESCARGA',
    label: 'Em Descarga',
    color: 'border-amber-600 bg-amber-50/40 text-amber-900',
  },
  {
    id: 'ENTREGUE',
    label: 'Entregue',
    color: 'border-emerald-600 bg-emerald-50/40 text-emerald-800',
  },
]

/**
 * Normaliza dados de todas as fontes PocketBase em uma lista única e padronizada
 */
export function buildUnifiedTransports(
  queueEntries: any[],
  freightOffers: any[],
  freightNegotiations: any[],
  expeditions: any[],
  fredTransports: any[],
  fredOccurrences: any[],
  salesOrders: any[],
): UnifiedTransportItem[] {
  const items: UnifiedTransportItem[] = []
  const occurrencesBySap = new Map<string, any>()
  fredOccurrences.forEach((occ) => {
    if (occ.sap_transport_number && occ.status !== 'RESOLVIDA' && occ.status !== 'CANCELADA') {
      occurrencesBySap.set(String(occ.sap_transport_number), occ)
    }
  })

  // 1. Expedição (expedition_tracking)
  expeditions.forEach((exp) => {
    const weightKg = Number(exp.weight_total_kg || exp.weightTotalKg || 0)
    const weightTon = Math.round((weightKg / 1000) * 10) / 10
    const rawStatus = String(exp.operational_status || exp.operationalStatus || '').toUpperCase()

    let stage: UnifiedTransportStage = 'PATIO'
    if (['PROGRAMADA', 'A_CAMINHO_CIAFAL'].includes(rawStatus)) stage = 'EM_COLETA'
    else if (['PRESENCA_NO_PATIO', 'CHECK_IN'].includes(rawStatus)) stage = 'FILA_PORTA'
    else if (
      [
        'AGUARDANDO_LIBERACAO',
        'AGUARDANDO_ESTOQUE',
        'ESTOQUE_LIBERADO',
        'EM_SEPARACAO',
        'SEPARACAO_CONCLUIDA',
        'AGUARDANDO_CARREGAMENTO',
      ].includes(rawStatus)
    )
      stage = 'PATIO'
    else if (['EM_CARREGAMENTO', 'CARREGAMENTO_CONCLUIDO', 'CONFERENCIA'].includes(rawStatus))
      stage = 'CARREGAMENTO'
    else if (['AGUARDANDO_FATURAMENTO', 'FATURADO', 'LIBERADO'].includes(rawStatus))
      stage = 'FATURAMENTO'
    else if (['SAIDA_DO_PATIO', 'EM_VIAGEM'].includes(rawStatus)) stage = 'EM_ROTA'

    const slaRaw = String(exp.sla_status || exp.slaStatus || 'NORMAL').toUpperCase()
    let slaStatus: UnifiedSlaStatus = 'NORMAL'
    if (slaRaw.includes('CRITICO') || slaRaw.includes('ATRASADO')) slaStatus = 'CRITICO'
    else if (slaRaw.includes('ATENCAO')) slaStatus = 'ATENCAO'

    const sapNum = String(
      exp.sap_transport_number || exp.sapTransportNumber || exp.cargo_id || exp.cargoId || '',
    )
    const activeOcc = occurrencesBySap.get(sapNum)

    items.push({
      id: exp.id || `exp-${exp.cargo_id || Math.random()}`,
      transportNumber: exp.cargo_id || exp.cargoId || sapNum || 'EXP-S/N',
      sapTransportNumber: sapNum,
      cargoId: exp.cargo_id || exp.cargoId,
      sourceCollection: 'expedition_tracking',
      stage,
      stageLabel: exp.current_stage_name || exp.currentStageName || rawStatus || 'Expedição',
      statusRaw: rawStatus,
      company: 'CIAFAL Logística',
      plant: 'Planta Central (Matriz)',
      customerName:
        exp.clients_summary || exp.clientsSummary || exp.destination_cities || 'Clientes Diversos',
      deliveriesCount: Number(exp.deliveries_count || exp.deliveriesCount || 1),
      destinationCity: exp.destination_cities || exp.destinationCities || 'Destino a definir',
      destinationUf: 'SP',
      routeCode: exp.itinerary_code || exp.itineraryCode || 'ITIN-GERAL',
      weightKg,
      weightTon,
      vehicleType: 'Carreta Convencional',
      vehiclePlate: exp.vehicle_plate || exp.vehiclePlate || 'S/ PLACA',
      driverName: exp.driver_name || exp.driverName || 'Motorista Não Atribuído',
      driverPhone: exp.driver_phone || exp.driverPhone,
      driverDocument: exp.driver_document || exp.driverDocument,
      carrierName: exp.carrier_name || exp.carrierName || 'Frota / Terceiros CIAFAL',
      entryTime: exp.entry_time || exp.entryTime,
      exitTime: exp.exit_time || exp.exitTime,
      slaStatus:
        activeOcc && (activeOcc.severity === 'CRITICA' || activeOcc.severity === 'ALTA')
          ? 'CRITICO'
          : slaStatus,
      slaReason: exp.delay_root_cause || exp.delayRootCause || activeOcc?.description,
      hasIntercurrence: !!activeOcc,
      intercurrenceDescription: activeOcc?.description,
      intercurrenceSeverity: activeOcc?.severity,
      responsibleSector: 'Expedição / Pátio',
      updatedAt: exp.updated || exp.created || new Date().toISOString(),
      dockName: exp.assigned_dock || exp.assignedDock,
      leadTimeMinutes: Number(exp.total_lead_time_min || exp.totalLeadTimeMin || 0),
      currentStageDurationMin: Number(
        exp.current_stage_duration_min || exp.currentStageDurationMin || 0,
      ),
    })
  })

  // 2. Transportes em Rastreamento Fred (fred_transports)
  fredTransports.forEach((fred) => {
    const sapNum = String(fred.sap_transport_number || '')
    const existingIndex = items.findIndex((i) => i.sapTransportNumber === sapNum && sapNum !== '')
    const weightKg = Number(fred.total_weight_kg || 0)
    const weightTon = Math.round((weightKg / 1000) * 10) / 10
    const tripStatus = String(fred.trip_status || '').toUpperCase()

    let stage: UnifiedTransportStage = 'EM_ROTA'
    if (tripStatus === 'AGUARDANDO_SAIDA') stage = 'FATURAMENTO'
    else if (tripStatus === 'EM_ROTA' || tripStatus === 'RETORNANDO') stage = 'EM_ROTA'
    else if (tripStatus === 'CHEGADA_CLIENTE' || tripStatus === 'EM_DESCARGA') stage = 'EM_DESCARGA'
    else if (tripStatus === 'ENCERRADO' || tripStatus === 'DESCARGA_CONCLUIDA') stage = 'ENTREGUE'

    const overallEta = String(fred.overall_eta_status || '').toUpperCase()
    let slaStatus: UnifiedSlaStatus = 'NORMAL'
    if (overallEta === 'ATRASADO') slaStatus = 'ATRASADO'
    else if (overallEta === 'RISCO_ATRASO') slaStatus = 'ATENCAO'
    else if (overallEta === 'DENTRO_PREVISTO' || overallEta === 'CONCLUIDO') slaStatus = 'NORMAL'

    const activeOcc = occurrencesBySap.get(sapNum)
    const activeOccCount = Number(fred.active_occurrences_count || 0)

    const item: UnifiedTransportItem = {
      id: fred.id || `fred-${fred.sap_transport_number}`,
      transportNumber: fred.sap_transport_number
        ? `TR-${fred.sap_transport_number}`
        : fred.cargo_id || 'TR-S/N',
      sapTransportNumber: sapNum,
      cargoId: fred.cargo_id,
      sourceCollection: 'fred_transports',
      stage,
      stageLabel:
        tripStatus === 'EM_ROTA'
          ? 'Em Rota (Fred IA)'
          : tripStatus === 'EM_DESCARGA'
            ? 'Em Descarga'
            : tripStatus === 'ENCERRADO'
              ? 'Entrega Concluída'
              : tripStatus,
      statusRaw: tripStatus,
      company: 'CIAFAL Logística',
      plant: fred.origin_plant || 'Planta Central (Matriz)',
      customerName: fred.destination_summary || 'Clientes Rota Fred',
      deliveriesCount: Number(fred.total_deliveries_count || 1),
      destinationCity: fred.destination_summary || 'Destinos Múltiplos',
      destinationUf: fred.itinerary_code?.substring(0, 2) || 'MG',
      routeCode: fred.itinerary_code || 'ITIN-FRED',
      weightKg,
      weightTon,
      vehicleType: fred.vehicle_type || 'Carreta LS',
      vehiclePlate: fred.vehicle_plate || 'S/ PLACA',
      driverName: fred.driver_name || 'Motorista Fred',
      driverPhone: fred.driver_phone,
      carrierName: fred.carrier_name || 'CIAFAL Transportes',
      plannedTime: fred.started_at,
      exitTime: fred.started_at,
      etaDelivery: fred.current_next_stop_eta,
      slaStatus:
        activeOcc || activeOccCount > 0
          ? slaStatus === 'ATRASADO'
            ? 'ATRASADO'
            : 'ATENCAO'
          : slaStatus,
      slaReason:
        activeOcc?.description ||
        (fred.delay_minutes_current > 0
          ? `Atraso apurado: +${fred.delay_minutes_current} min`
          : undefined),
      hasIntercurrence: activeOccCount > 0 || !!activeOcc,
      intercurrenceDescription: activeOcc?.description,
      intercurrenceSeverity: activeOcc?.severity,
      responsibleSector: 'Transporte / Fred IA',
      updatedAt: fred.updated || fred.created || new Date().toISOString(),
      dockName: undefined,
      leadTimeMinutes: fred.delay_minutes_current,
      lat: fred.last_location_lat,
      lng: fred.last_location_lng,
    }

    if (existingIndex >= 0) {
      // Mesclar dados mais ricos do Fred no item existente
      items[existingIndex] = {
        ...items[existingIndex],
        ...item,
        transportNumber: items[existingIndex].transportNumber,
      }
    } else {
      items.push(item)
    }
  })

  // 3. Veículos na Fila (queue_entries) que ainda não foram convertidos em transporte
  queueEntries.forEach((q) => {
    const status = String(q.status || '').toLowerCase()
    // Somente adiciona à lista se não for removido
    if (status === 'removido') return

    let stage: UnifiedTransportStage = 'DISPONIBILIDADE'
    if (q.type === 'PORTA') {
      stage = 'FILA_PORTA'
    } else if (status === 'negociacao') {
      stage = 'EM_NEGOCIACAO'
    } else if (status === 'atribuido') {
      stage = 'CONTRATADO'
    }

    let slaStatus: UnifiedSlaStatus = 'NORMAL'
    if (status === 'bloqueado') slaStatus = 'CRITICO'
    else if (status === 'validacao' || status === 'pendente') slaStatus = 'ATENCAO'

    items.push({
      id: q.id || `q-${Math.random()}`,
      transportNumber: `FILA-${q.vehicle_plate_cached || q.id?.substring(0, 6)}`,
      sapTransportNumber: '',
      sourceCollection: 'queue_entries',
      stage,
      stageLabel: `Fila ${q.type || 'PORTA'} (${status})`,
      statusRaw: status,
      company: 'CIAFAL Logística',
      plant: 'Planta Central (Matriz)',
      customerName: 'Aguardando Atribuição de Carga',
      deliveriesCount: 0,
      destinationCity: q.preferred_itinerary || 'Disponibilidade de Pátio',
      destinationUf: 'SP',
      routeCode: q.preferred_itinerary || 'PATIO-LIVRE',
      weightKg: 0,
      weightTon: 0,
      vehicleType: q.vehicle_type_cached || 'Carreta',
      vehiclePlate: q.vehicle_plate_cached || 'S/ PLACA',
      driverName: q.driver_name_cached || 'Motorista Cadastrado',
      driverPhone: q.driver_whatsapp_cached,
      driverDocument: q.driver_doc_cached,
      carrierName: 'Autônomo / Parceiro',
      entryTime: q.entry_time || q.created,
      slaStatus,
      slaReason: status === 'bloqueado' ? 'Cadastro ou CNH pendente de validação' : undefined,
      hasIntercurrence: status === 'bloqueado',
      intercurrenceDescription: status === 'bloqueado' ? 'Bloqueio de portaria' : undefined,
      responsibleSector: 'Portaria & Cadastro',
      updatedAt: q.updated || q.created || new Date().toISOString(),
      lat: q.latitude,
      lng: q.longitude,
    })
  })

  // 4. Ofertas de Frete (freight_offers)
  freightOffers.forEach((o) => {
    const st = String(o.status || '').toLowerCase()
    let stage: UnifiedTransportStage = 'EM_NEGOCIACAO'
    if (st === 'rascunho') stage = 'PLANEJADO'
    else if (st === 'atribuido') stage = 'CONTRATADO'

    const weightKg = Number(o.weight_kg || 0)
    const weightTon = Math.round((weightKg / 1000) * 10) / 10

    items.push({
      id: o.id || `ofr-${o.cargo_id}`,
      transportNumber: o.cargo_id || `OFR-${o.id?.substring(0, 5)}`,
      sapTransportNumber: '',
      cargoId: o.cargo_id,
      sourceCollection: 'freight_offers',
      stage,
      stageLabel: `Oferta (${o.current_group || 'PORTA'} - ${st})`,
      statusRaw: st,
      company: 'CIAFAL Logística',
      plant: o.origin || 'Planta Central CIAFAL (Matriz)',
      customerName: o.cargo_description || 'Carga Siderúrgica CIAFAL',
      deliveriesCount: 1,
      destinationCity: o.destination || 'Destino da Oferta',
      destinationUf: o.destination?.includes('- MG')
        ? 'MG'
        : o.destination?.includes('- RJ')
          ? 'RJ'
          : 'SP',
      routeCode: o.destination?.includes('MG001A')
        ? 'MG001A'
        : o.destination?.includes('SP002B')
          ? 'SP002B'
          : 'ROTA-OFERTA',
      weightKg,
      weightTon,
      vehicleType: o.required_vehicle_type || 'Carreta LS',
      vehiclePlate: 'A DEFINIR',
      driverName: 'Em Negociação / Carlão IA',
      carrierName: 'Mesa de Fretes CIAFAL',
      plannedTime: o.window_start || o.opened_at,
      slaStatus: st === 'expirado' ? 'CRITICO' : 'NORMAL',
      slaReason: st === 'expirado' ? 'Janela de oferta expirada sem arrematante' : undefined,
      hasIntercurrence: false,
      responsibleSector: 'Mesa de Fretes / Carlão IA',
      updatedAt: o.updated || o.created || new Date().toISOString(),
      freightValue: Number(o.floor_value || o.contracted_value || 0),
    })
  })

  // 5. Negociações Ativas (freight_negotiations)
  freightNegotiations.forEach((neg) => {
    const st = String(neg.status || '').toUpperCase()
    let stage: UnifiedTransportStage = 'EM_NEGOCIACAO'
    if (st === 'CONTRATADO') stage = 'CONTRATADO'

    items.push({
      id: neg.id || `neg-${neg.cargo_id}`,
      transportNumber: neg.cargo_id ? `NEG-${neg.cargo_id}` : `NEG-${neg.id?.substring(0, 5)}`,
      sapTransportNumber: neg.sap_transport_number || '',
      cargoId: neg.cargo_id,
      sourceCollection: 'freight_negotiations',
      stage,
      stageLabel: `Carlão IA (${st})`,
      statusRaw: st,
      company: 'CIAFAL Logística',
      plant: 'Planta Central (Matriz)',
      customerName: 'Carga em Negociação Ativa',
      deliveriesCount: 1,
      destinationCity: 'Destino da Negociação',
      destinationUf: 'SP',
      routeCode: 'NEG-CARLAO',
      weightKg: 25000,
      weightTon: 25,
      vehicleType: 'Carreta',
      vehiclePlate: neg.driver_plate || 'S/ PLACA',
      driverName: neg.driver_name || 'Motorista em Contato',
      driverPhone: neg.driver_phone,
      carrierName: 'Mesa de Fretes CIAFAL',
      plannedTime: neg.created,
      slaStatus: st === 'RECUSADO' || st === 'EXPIRADO' ? 'CRITICO' : 'NORMAL',
      slaReason: st === 'RECUSADO' ? 'Proposta rejeitada pelo motorista' : undefined,
      hasIntercurrence: false,
      responsibleSector: 'Carlão IA / Operador',
      updatedAt: neg.updated || neg.created || new Date().toISOString(),
      freightValue: Number(
        neg.final_freight_value || neg.current_counter_value || neg.initial_offer_value || 0,
      ),
    })
  })

  // 6. Pedidos SAP em Aberto que ainda não viraram transporte montado (sap_sales_orders)
  salesOrders.forEach((so) => {
    if (so.assigned_load_id) return // Já está em carga
    const weightKg = Number(so.weight_kg || 0)
    const weightTon = Math.round((weightKg / 1000) * 10) / 10
    const prodStatus = String(so.production_status || 'Pronto')
    const creditStatus = String(so.credit_status || 'Liberado')

    let slaStatus: UnifiedSlaStatus = 'NORMAL'
    if (creditStatus === 'Bloqueado') slaStatus = 'CRITICO'
    else if (prodStatus === 'Aguardando PCP' || prodStatus === 'Em Produção') slaStatus = 'ATENCAO'

    items.push({
      id: so.id || `so-${so.order_number}`,
      transportNumber: `SAP-PED-${so.order_number}`,
      sapTransportNumber: String(so.order_number),
      sourceCollection: 'sap_sales_orders',
      stage: 'PLANEJADO',
      stageLabel: `Carteira SAP (${prodStatus} / Crédito: ${creditStatus})`,
      statusRaw: `${prodStatus} | ${creditStatus}`,
      company: 'CIAFAL Wilson Santos',
      plant: 'Planta Central (Matriz)',
      customerName: so.customer_name || `Cliente ${so.customer_code || ''}`,
      deliveriesCount: 1,
      destinationCity: so.destination_city || 'Destino SAP',
      destinationUf: so.uf || 'SP',
      routeCode: so.itinerary_code || 'ITIN-SAP',
      weightKg,
      weightTon,
      vehicleType: so.required_vehicle_type || 'Carreta Grade Baixa',
      vehiclePlate: 'NÃO ALOCADO',
      driverName: 'Aguardando Planejador/Mesa',
      carrierName: 'A Definir',
      plannedTime: so.desired_date || so.order_date,
      slaStatus,
      slaReason:
        creditStatus === 'Bloqueado'
          ? 'Bloqueio de Crédito no SAP ECC'
          : prodStatus === 'Em Produção'
            ? 'Em fabricação na laminação'
            : undefined,
      hasIntercurrence: creditStatus === 'Bloqueado',
      intercurrenceDescription: creditStatus === 'Bloqueado' ? 'Crédito Bloqueado' : undefined,
      responsibleSector: 'Comercial / PCP',
      updatedAt: so.updated || so.created || new Date().toISOString(),
      lat: so.dest_latitude,
      lng: so.dest_longitude,
    })
  })

  return items
}

/**
 * Aplica os filtros globais sobre a lista consolidada
 */
export function filterUnifiedTransports(
  items: UnifiedTransportItem[],
  filters: TowerGlobalFilters,
): UnifiedTransportItem[] {
  return items.filter((item) => {
    // Busca por termo geral
    if (filters.searchTerm.trim()) {
      const q = filters.searchTerm.toLowerCase()
      const match =
        item.transportNumber.toLowerCase().includes(q) ||
        item.sapTransportNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.driverName.toLowerCase().includes(q) ||
        item.vehiclePlate.toLowerCase().includes(q) ||
        item.destinationCity.toLowerCase().includes(q) ||
        item.carrierName.toLowerCase().includes(q) ||
        item.routeCode.toLowerCase().includes(q)
      if (!match) return false
    }

    // Empresa
    if (filters.company !== 'TODAS' && item.company !== filters.company) return false

    // Centro / Planta
    if (filters.plant !== 'TODOS' && item.plant !== filters.plant) return false

    // Transportadora
    if (filters.carrier !== 'TODAS' && item.carrierName !== filters.carrier) return false

    // Motorista
    if (filters.driver !== 'TODOS' && item.driverName !== filters.driver) return false

    // Placa
    if (filters.plate !== 'TODAS' && item.vehiclePlate !== filters.plate) return false

    // Cliente
    if (filters.customer !== 'TODOS' && !item.customerName.includes(filters.customer)) return false

    // UF
    if (filters.uf !== 'TODAS' && item.destinationUf !== filters.uf) return false

    // Rota
    if (filters.route !== 'TODAS' && item.routeCode !== filters.route) return false

    // Tipo de Veículo
    if (
      filters.vehicleType !== 'TODOS' &&
      !item.vehicleType.toLowerCase().includes(filters.vehicleType.toLowerCase())
    )
      return false

    // Status / Etapa
    if (filters.status !== 'TODOS') {
      if (item.stage !== filters.status && item.statusRaw !== filters.status) return false
    }

    // Situação SLA
    if (filters.slaStatus !== 'TODOS' && item.slaStatus !== filters.slaStatus) return false

    // Intercorrência
    if (filters.hasIntercurrence === 'COM' && !item.hasIntercurrence) return false
    if (filters.hasIntercurrence === 'SEM' && item.hasIntercurrence) return false

    return true
  })
}

/**
 * Calcula os KPIs dos 6 Grandes Cards da Visão Executiva
 */
export function calculateExecutiveMetrics(
  queueEntries: any[],
  freightOffers: any[],
  freightNegotiations: any[],
  expeditions: any[],
  fredTransports: any[],
  fredOccurrences: any[],
): ExecutiveCardsData {
  // 1. Veículos na Fila
  let totalQueueVehicles = 0
  let totalQueueTon = 0
  let totalWaitMinutes = 0
  let longestWaitingVehicle: { plate: string; driver: string; minutes: number } | null = null

  const subdivision = {
    foraCiafal: 0,
    porta: 0,
    patio: 0,
    aguardandoCarregamento: 0,
    emCarregamento: 0,
  }

  const now = new Date().getTime()

  queueEntries.forEach((q) => {
    if (q.status === 'removido') return
    totalQueueVehicles += 1
    totalQueueTon += 25 // Estimativa média quando veículo sem peso fixo

    const entryTime = q.entry_time ? new Date(q.entry_time).getTime() : now
    const waitMin = Math.max(5, Math.round((now - entryTime) / 60000))
    totalWaitMinutes += waitMin

    if (!longestWaitingVehicle || waitMin > longestWaitingVehicle.minutes) {
      longestWaitingVehicle = {
        plate: q.vehicle_plate_cached || 'S/ PLACA',
        driver: q.driver_name_cached || 'Motorista',
        minutes: waitMin,
      }
    }

    if (q.type === 'FORA') subdivision.foraCiafal += 1
    else if (q.type === 'PORTA') subdivision.porta += 1
    else subdivision.patio += 1
  })

  expeditions.forEach((e) => {
    const rawSt = String(e.operational_status || '').toUpperCase()
    if (
      rawSt === 'AGUARDANDO_CARREGAMENTO' ||
      rawSt === 'AGUARDANDO_ESTOQUE' ||
      rawSt === 'EM_SEPARACAO'
    ) {
      subdivision.aguardandoCarregamento += 1
    } else if (rawSt === 'EM_CARREGAMENTO') {
      subdivision.emCarregamento += 1
    } else if (rawSt === 'PRESENCA_NO_PATIO' || rawSt === 'CHECK_IN') {
      subdivision.patio += 1
    }
  })

  const avgWaitMinutes =
    totalQueueVehicles > 0 ? Math.round(totalWaitMinutes / totalQueueVehicles) : 0

  // 2. Transportes em Negociação
  let negTransports = freightOffers.length + freightNegotiations.length
  let negTon = 0
  let negFreightValue = 0
  let activeDrivers = new Set<string>()
  let overSlaCount = 0

  freightOffers.forEach((o) => {
    negTon += Math.round((Number(o.weight_kg || 0) / 1000) * 10) / 10
    negFreightValue += Number(o.floor_value || o.contracted_value || 0)
    if (o.status === 'expirado') overSlaCount += 1
  })

  freightNegotiations.forEach((n) => {
    negTon += 25
    negFreightValue += Number(
      n.final_freight_value || n.current_counter_value || n.initial_offer_value || 0,
    )
    if (n.driver_id) activeDrivers.add(n.driver_id)
    if (n.status === 'EXPIRADO' || n.status === 'RECUSADO') overSlaCount += 1
  })

  // 3. Transportes em Coleta
  let colTransports = 0
  let colTon = 0
  let colVehicles = 0
  let colOnTime = 0
  let colDelayed = 0
  let colExpectedToday = 0

  expeditions.forEach((e) => {
    const rawSt = String(e.operational_status || '').toUpperCase()
    if (['PROGRAMADA', 'A_CAMINHO_CIAFAL', 'MOTORISTA_CONFIRMADO'].includes(rawSt)) {
      colTransports += 1
      colVehicles += 1
      const wTon = Number(e.weight_total_kg || 0) / 1000
      colTon += wTon
      if (e.sla_status === 'CRITICO_ATRASADO') colDelayed += 1
      else colOnTime += 1
      colExpectedToday += 1
    }
  })

  // 4. Transportes em Expedição
  let expTransports = expeditions.length
  let expTon = 0
  let expAguardandoEntrada = 0
  let expNoPatio = 0
  let expEmCarregamento = 0
  let expCarregamentoConcluido = 0
  let expAguardandoFaturamento = 0
  let expFaturadosAguardandoSaida = 0

  expeditions.forEach((e) => {
    const wTon = Number(e.weight_total_kg || 0) / 1000
    expTon += wTon
    const rawSt = String(e.operational_status || '').toUpperCase()

    if (['PROGRAMADA', 'A_CAMINHO_CIAFAL'].includes(rawSt)) expAguardandoEntrada += 1
    else if (
      ['PRESENCA_NO_PATIO', 'CHECK_IN', 'AGUARDANDO_ESTOQUE', 'EM_SEPARACAO'].includes(rawSt)
    )
      expNoPatio += 1
    else if (rawSt === 'EM_CARREGAMENTO') expEmCarregamento += 1
    else if (rawSt === 'CARREGAMENTO_CONCLUIDO' || rawSt === 'CONFERENCIA')
      expCarregamentoConcluido += 1
    else if (rawSt === 'AGUARDANDO_FATURAMENTO') expAguardandoFaturamento += 1
    else if (['FATURADO', 'LIBERADO'].includes(rawSt)) expFaturadosAguardandoSaida += 1
  })

  // 5. Transportes em Rota
  let routeTransports = 0
  let routeTon = 0
  let routeDeliveries = 0
  let routeOnTime = 0
  let routeRiskDelay = 0
  let routeDelayed = 0
  let openOccurrences = 0

  fredOccurrences.forEach((o) => {
    if (o.status === 'ABERTA' || o.status === 'EM_TRATAMENTO') openOccurrences += 1
  })

  fredTransports.forEach((f) => {
    const tripStatus = String(f.trip_status || '').toUpperCase()
    if (
      tripStatus === 'EM_ROTA' ||
      tripStatus === 'CHEGADA_CLIENTE' ||
      tripStatus === 'EM_DESCARGA' ||
      tripStatus === 'RETORNANDO'
    ) {
      routeTransports += 1
      routeTon += Number(f.total_weight_kg || 0) / 1000
      routeDeliveries += Number(f.total_deliveries_count || 1)

      const eta = String(f.overall_eta_status || '').toUpperCase()
      if (eta === 'ATRASADO') routeDelayed += 1
      else if (eta === 'RISCO_ATRASO') routeRiskDelay += 1
      else routeOnTime += 1
    }
  })

  // 6. Transportes Entregues
  let deliveredTodayCount = 0
  let deliveredTodayTon = 0
  let deliveredTodayDeliveries = 0
  let deliveredTodayOnTime = 0

  fredTransports.forEach((f) => {
    const tripStatus = String(f.trip_status || '').toUpperCase()
    if (tripStatus === 'ENCERRADO' || tripStatus === 'DESCARGA_CONCLUIDA') {
      deliveredTodayCount += 1
      const wTon = Number(f.total_weight_kg || 0) / 1000
      deliveredTodayTon += wTon
      const delivs = Number(f.completed_deliveries_count || f.total_deliveries_count || 1)
      deliveredTodayDeliveries += delivs
      if (f.overall_eta_status !== 'ATRASADO') deliveredTodayOnTime += 1
    }
  })

  const calcOnTimePct = (onTime: number, total: number) =>
    total > 0 ? Math.round((onTime / total) * 1000) / 10 : 100

  return {
    queue: {
      totalVehicles: totalQueueVehicles,
      totalTon: Math.round(totalQueueTon * 10) / 10,
      avgWaitMinutes,
      longestWaitingVehicle,
      subdivision,
    },
    negotiation: {
      totalTransports: negTransports,
      totalTon: Math.round(negTon * 10) / 10,
      totalFreightValue: negFreightValue,
      activeDrivers: activeDrivers.size || (negTransports > 0 ? 3 : 0),
      avgNegotiationMinutes: 18,
      overSlaCount,
    },
    collectionStage: {
      totalTransports: colTransports,
      totalTon: Math.round(colTon * 10) / 10,
      totalVehicles: colVehicles,
      onTimeCount: colOnTime,
      delayedCount: colDelayed,
      expectedTodayCount: colExpectedToday,
    },
    expedition: {
      totalTransports: expTransports,
      totalTon: Math.round(expTon * 10) / 10,
      aguardandoEntrada: expAguardandoEntrada,
      noPatio: expNoPatio,
      emCarregamento: expEmCarregamento,
      carregamentoConcluido: expCarregamentoConcluido,
      aguardandoFaturamento: expAguardandoFaturamento,
      faturadosAguardandoSaida: expFaturadosAguardandoSaida,
    },
    inRoute: {
      totalTransports: routeTransports,
      totalTon: Math.round(routeTon * 10) / 10,
      expectedDeliveries: routeDeliveries,
      onTimeCount: routeOnTime,
      riskDelayCount: routeRiskDelay,
      delayedCount: routeDelayed,
      openOccurrencesCount: openOccurrences,
    },
    delivered: {
      today: {
        count: deliveredTodayCount,
        ton: Math.round(deliveredTodayTon * 10) / 10,
        deliveries: deliveredTodayDeliveries,
        onTimePct: calcOnTimePct(deliveredTodayOnTime, deliveredTodayCount),
      },
      currentMonth: {
        count: deliveredTodayCount,
        ton: Math.round(deliveredTodayTon * 10) / 10,
        deliveries: deliveredTodayDeliveries,
        onTimePct: calcOnTimePct(deliveredTodayOnTime, deliveredTodayCount),
      },
      ytd: {
        count: deliveredTodayCount,
        ton: Math.round(deliveredTodayTon * 10) / 10,
        deliveries: deliveredTodayDeliveries,
        onTimePct: calcOnTimePct(deliveredTodayOnTime, deliveredTodayCount),
      },
    },
  }
}
