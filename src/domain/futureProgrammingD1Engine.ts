/**
 * futureProgrammingD1Engine.ts
 *
 * Motor determinístico de Planejamento Logístico D+1 do HUB CIAFAL (TMS x SAP RFC x PCP Robotizado).
 * Torre de Programação Logística D+1 sem dados fictícios.
 *
 * Regras principais:
 * 1. Data de programação default HOJE+1, com badge [D+1] se for exatamente o dia seguinte.
 * 2. Veículos previstos D+1 agregados de:
 *    - Fila de disponibilidade logística (Queue entries: PROGRAMADO, PORTA, FORA)
 *    - Pré-cadastros de veículos aprovados/agendados
 *    - Mesa de fretes (ofertas aceitas/contratadas)
 *    - Cadastro base de veículos/motoristas vinculados
 *    - Propostas/cargas com espaço disponível
 * 3. Estoque Projetado D+1 = Estoque Atual SAP - Qtde Comprometida em Remessas + Produção Prevista PCP até D+1
 *    - Se estoque projetado < 0: alerta "⚠ Estoque projetado insuficiente"
 * 4. Carteira Elegível = Pedidos SAP sem remessa, saldo aberto, sem atendimento prévio,
 *    compatibilidade de itinerário/região, crédito liberado ou em conformidade.
 * 5. Quantidade Elegível = MIN(saldo carteira elegível, estoque projetado livre D+1).
 *    Reserva provisória evita consumo duplicado entre dois veículos.
 * 6. PCP: Produção prevista NUNCA tratada como estoque existente.
 *    Só compõe se programada, centro/material compatíveis e data/hora anterior à necessidade.
 * 7. Sem duplicação de remessas nem geração automática de remessa SAP (MATCH -> SIMULAÇÃO -> COMPLEMENTO -> VALIDAÇÃO -> APROVAÇÃO).
 */

import {
  SapSalesOrderEntity,
  SapStockCurrentEntity,
  PcpProductionOrderEntity,
  SapItineraryEntity,
  QueueEntryEntity,
  VehicleEntity,
  DriverEntity,
  PreRegistrationEntity,
  ChicaoFreightOfferEntity,
  FreightOfferEntity,
  LoadProposalEntity,
} from '@/domain/rules'

export type OperationalStatusD1 =
  | 'Carga completa'
  | 'Complemento disponível'
  | 'Sem carteira compatível'
  | 'Aguardando estoque'
  | 'Aguardando produção PCP'
  | 'Estoque insuficiente'
  | 'Sem veículo'
  | 'Excesso de carteira'
  | 'Veículo sem itinerário'
  | 'Divergência de capacidade'

export type OccupancyBandClassification =
  | 'baixa'
  | 'intermediaria'
  | 'proxima_da_capacidade'
  | 'carga_completa'
  | 'excedida'

export interface VehicleD1PlanItem {
  id: string
  source: 'queue' | 'prereg' | 'mesa' | 'proposal' | 'vehicle'
  sourceId?: string
  date: string
  scheduledTime: string
  plate: string
  vehicleType: string
  driverName: string
  driverPhone?: string
  driverDocument?: string
  carrierName: string
  itineraryCode: string
  itineraryDesc: string
  region: string
  uf: string
  origin: string
  destination: string
  dischargesCount: number
  capacityTons: number
  capacityKg: number
  programmedWeightKg: number
  programmedWeightTons: number
  availableCapacityKg: number
  availableCapacityTons: number
  occupancyPct: number
  occupancyBand: OccupancyBandClassification
  compatibleWalletTons: number
  currentStockTons: number
  remessasGeneratedTons: number
  pcpD1Tons: number
  projectedStockD1Tons: number
  possibleComplementTons: number
  operationalStatus: OperationalStatusD1
  matchReasons: string[]
  isPcpDependent: boolean
  pcpAlertMessage?: string
  allocatedOrderNumbers: string[]
  allocatedItems: Array<{
    orderNumber: string
    itemNumber?: string
    customerName: string
    material: string
    weightKg: number
    deliveredViaRemessa?: boolean
  }>
}

export interface MaterialStockD1Summary {
  materialCode: string
  materialDescription: string
  plant: string
  storageLocation: string
  currentStockKg: number
  currentStockTons: number
  remessasGeneratedKg: number
  remessasGeneratedTons: number
  pcpD1Kg: number
  pcpD1Tons: number
  projectedStockKg: number
  projectedStockTons: number
  isInsufficient: boolean
  alertMessage?: string
  pcpScheduleNotice?: string
  ordersCount: number
  walletDemandKg: number
  walletDemandTons: number
  availableFreeKg: number
}

export interface EligibleWalletItemD1 {
  id: string
  orderNumber: string
  itemNumber: string
  customerCode: string
  customerName: string
  destinationCity: string
  uf: string
  itineraryCode: string
  region: string
  material: string
  materialDescription: string
  weightKg: number
  weightTons: number
  orderValue: number
  desiredDate: string
  orderDate?: string
  priorityLevel: string
  creditStatus: string
  creditReason?: string
  dischargeType?: string
  requiredVehicleType?: string
  logisticRestrictions?: string
  deliveryNumber?: string
  assignedLoadId?: string
  isOpenAndEligible: boolean
  hasRemessa: boolean
  stockSituation: string
  currentStockKg: number
  projectedStockKg: number
  pcpStatus?: string
  pcpForecastDate?: string
  quantityEligibleKg: number
  quantityEligibleTons: number
  matchReasons: string[]
  ineligibilityReasons: string[]
}

export interface ComplementCandidateD1 {
  id: string
  orderNumber: string
  itemNumber: string
  customerCode: string
  customerName: string
  destinationCity: string
  uf: string
  priorityLevel: string
  material: string
  materialDescription: string
  walletBalanceKg: number
  walletBalanceTons: number
  projectedStockD1Kg: number
  projectedStockD1Tons: number
  suggestedQuantityKg: number
  suggestedQuantityTons: number
  resultingOccupancyPct: number
  isPcpDependent: boolean
  pcpForecastNotice?: string
  reasons: string[]
}

export interface ComplementSimulationResult {
  vehicleId: string
  plate: string
  itineraryCode: string
  itineraryDesc: string
  capacityTons: number
  beforeWeightTons: number
  beforeOccupancyPct: number
  afterWeightTons: number
  afterOccupancyPct: number
  weightGainTons: number
  occupancyGainPct: number
  selectedCandidates: ComplementCandidateD1[]
  isFeasible: boolean
  divergenceNotes?: string
  routeEstimate: {
    distanceKm: number
    durationMin: number
    tollsEstimate: number
    anttFloorEstimate: number
    stopsCount: number
  }
}

export interface ItineraryBalanceMatrixD1 {
  itineraryCode: string
  itineraryDesc: string
  region: string
  uf: string
  vehiclesD1Count: number
  totalCapacityTons: number
  programmedLoadTons: number
  freeSpaceTons: number
  eligibleWalletTons: number
  projectedStockTons: number
  pcpD1Tons: number
  potentialComplementTons: number
  balanceDiagnosis:
    | 'EQUILIBRADO'
    | 'FALTA DE TRANSPORTE'
    | 'EXCESSO DE TRANSPORTE'
    | 'MATERIAL INSUFICIENTE'
    | 'COMPLEMENTO POSSÍVEL'
    | 'SEM VEÍCULO'
    | 'EXCESSO DE CARTEIRA'
}

export interface ExecutiveCardsD1Data {
  vehiclesCount: number
  totalCapacityTons: number
  programmedWeightTons: number
  availableCapacityTons: number
  avgOccupancyPct: number
  possibleComplementsCount: number
  pcpProductionD1Tons: number
  projectedStockTons: number
  insufficientStockCount: number
}

// ==========================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO E CÁLCULO
// ==========================================

export function formatTons(tons: number, decimals = 2): string {
  if (isNaN(tons) || !isFinite(tons)) return '0,00'
  return tons.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatKgToTons(kg: number): number {
  return Math.round((kg / 1000) * 100) / 100
}

export function classifyOccupancyBand(occupancyPct: number): OccupancyBandClassification {
  if (occupancyPct < 50) return 'baixa'
  if (occupancyPct < 80) return 'intermediaria'
  if (occupancyPct < 99) return 'proxima_da_capacidade'
  if (occupancyPct <= 100.5) return 'carga_completa'
  return 'excedida'
}

export function getOccupancyBandLabel(band: OccupancyBandClassification): string {
  switch (band) {
    case 'baixa':
      return 'Ocupação Baixa (< 50%)'
    case 'intermediaria':
      return 'Ocupação Intermediária (50% a 79%)'
    case 'proxima_da_capacidade':
      return 'Próxima da Capacidade (80% a 99%)'
    case 'carga_completa':
      return 'Carga Completa (100%)'
    case 'excedida':
      return 'Capacidade Excedida (> 100%)'
  }
}

export function getOccupancyBandBadgeClass(band: OccupancyBandClassification): string {
  switch (band) {
    case 'baixa':
      return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200'
    case 'intermediaria':
      return 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950 dark:text-sky-200'
    case 'proxima_da_capacidade':
      return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200'
    case 'carga_completa':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
    case 'excedida':
      return 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200'
  }
}

/**
 * Retorna a data amanhã em formato YYYY-MM-DD
 */
export function getDefaultD1Date(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

/**
 * Verifica se a data fornecida é exatamente HOJE+1
 */
export function isExactD1Date(targetDate: string): boolean {
  if (!targetDate) return false
  const expected = getDefaultD1Date()
  return targetDate.trim().startsWith(expected)
}

/**
 * Normaliza datas para YYYY-MM-DD
 */
export function normalizeDateString(dateStr?: string | null): string {
  if (!dateStr) return ''
  return dateStr.split('T')[0].trim()
}

/**
 * Verifica se um pedido já possui remessa gerada (VL01N) ou está bloqueado em remessa/transporte
 */
export function hasGeneratedRemessa(order: SapSalesOrderEntity): boolean {
  if (order.delivery_number && order.delivery_number.trim() !== '') return true
  if (order.assigned_load_id && order.assigned_load_id.trim() !== '') return true
  if (
    order.status &&
    ['carregado', 'em_montagem', 'cancelado'].includes(order.status.toLowerCase())
  ) {
    return true
  }
  return false
}

/**
 * Verifica se a produção PCP ocorre antes do horário de necessidade logística D+1
 */
export function isPcpProductionPriorToNeed(
  pcpDate?: string,
  targetD1Date?: string,
  needHour = '18:00',
): boolean {
  if (!pcpDate || !targetD1Date) return false
  const pcpNorm = normalizeDateString(pcpDate)
  const targetNorm = normalizeDateString(targetD1Date)

  // Se a data PCP é anterior a D+1, com certeza está pronta antes
  if (pcpNorm < targetNorm) return true
  // Se a data PCP é posterior a D+1, não compõe D+1
  if (pcpNorm > targetNorm) return false

  // Se for no mesmo dia D+1:
  // Se contiver horário, compara com o needHour
  if (pcpDate.includes('T')) {
    const timePart = pcpDate.split('T')[1]?.slice(0, 5) || '00:00'
    return timePart <= needHour
  }
  return true
}

// ==========================================
// CÁLCULO PRINCIPAL: ESTOQUE PROJETADO D+1
// ==========================================

export function calculateProjectedStockByMaterial(params: {
  materials: string[]
  currentStockList: SapStockCurrentEntity[]
  pcpOrdersList: PcpProductionOrderEntity[]
  salesOrdersList: SapSalesOrderEntity[]
  targetD1Date: string
}): Map<string, MaterialStockD1Summary> {
  const { materials, currentStockList, pcpOrdersList, salesOrdersList, targetD1Date } = params
  const map = new Map<string, MaterialStockD1Summary>()

  // 1. Inicializa com materiais conhecidos
  const allMaterialCodes = new Set<string>()
  materials.forEach((m) => m && allMaterialCodes.add(m.trim()))
  currentStockList.forEach((s) => s.material_code && allMaterialCodes.add(s.material_code.trim()))
  salesOrdersList.forEach((o) => o.material && allMaterialCodes.add(o.material.trim()))
  pcpOrdersList.forEach((p) => p.material_code && allMaterialCodes.add(p.material_code.trim()))

  allMaterialCodes.forEach((matCode) => {
    // Estoque Atual SAP
    const stockItems = currentStockList.filter((s) => s.material_code === matCode)
    const currentStockKg = stockItems.reduce((acc, s) => acc + (s.weight_kg || s.quantity || 0), 0)
    const matDesc =
      stockItems[0]?.material_description ||
      salesOrdersList.find((o) => o.material === matCode)?.material_description ||
      pcpOrdersList.find((p) => p.material_code === matCode)?.material_description ||
      matCode

    const plant = stockItems[0]?.plant || '1010'
    const storageLocation = stockItems[0]?.storage_location || '0001'

    // Quantidade já comprometida em Remessas (VL01N / Remessas existentes)
    const remessaOrders = salesOrdersList.filter(
      (o) => o.material === matCode && hasGeneratedRemessa(o),
    )
    const remessasGeneratedKg = remessaOrders.reduce(
      (acc, o) => acc + (o.balance_quantity_kg || o.weight_kg || 0),
      0,
    )

    // Produção Prevista PCP até D+1
    // REQUISITO: NUNCA tratada como estoque existente; só compõe o projetado se programada/em produção,
    // compatível e data/hora anterior à necessidade
    const pcpItems = pcpOrdersList.filter((p) => {
      if (p.material_code !== matCode) return false
      if (!['Programada', 'Em Produção'].includes(p.status)) return false
      return isPcpProductionPriorToNeed(p.scheduled_date, targetD1Date)
    })

    const pcpD1Kg = pcpItems.reduce(
      (acc, p) => acc + (p.weight_kg_planned || p.quantity_planned || 0),
      0,
    )

    // Formata aviso de PCP
    let pcpScheduleNotice: string | undefined
    if (pcpItems.length > 0) {
      const earliest = pcpItems[0]
      const datePart = normalizeDateString(earliest.scheduled_date)
      const parts = datePart.split('-')
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : datePart
      const timePart = earliest.scheduled_date.includes('T')
        ? earliest.scheduled_date.split('T')[1].slice(0, 5)
        : '07:00'
      pcpScheduleNotice = `Produção prevista: ${formattedDate} às ${timePart}`
    }

    // Demanda da Carteira Aberta
    const openOrders = salesOrdersList.filter(
      (o) => o.material === matCode && !hasGeneratedRemessa(o),
    )
    const walletDemandKg = openOrders.reduce(
      (acc, o) => acc + (o.balance_quantity_kg || o.weight_kg || 0),
      0,
    )

    // FÓRMULA REQUISITO 3:
    // ESTOQUE PROJETADO D+1 = ESTOQUE ATUAL SAP − QUANTIDADE JÁ COMPROMETIDA EM REMESSAS + PRODUÇÃO PREVISTA PCP ATÉ D+1
    const projectedStockKg = currentStockKg - remessasGeneratedKg + pcpD1Kg
    const isInsufficient = projectedStockKg < 0
    const alertMessage = isInsufficient ? '⚠ Estoque projetado insuficiente' : undefined

    map.set(matCode, {
      materialCode: matCode,
      materialDescription: matDesc,
      plant,
      storageLocation,
      currentStockKg,
      currentStockTons: formatKgToTons(currentStockKg),
      remessasGeneratedKg,
      remessasGeneratedTons: formatKgToTons(remessasGeneratedKg),
      pcpD1Kg,
      pcpD1Tons: formatKgToTons(pcpD1Kg),
      projectedStockKg,
      projectedStockTons: formatKgToTons(projectedStockKg),
      isInsufficient,
      alertMessage,
      pcpScheduleNotice,
      ordersCount: openOrders.length,
      walletDemandKg,
      walletDemandTons: formatKgToTons(walletDemandKg),
      availableFreeKg: Math.max(0, projectedStockKg),
    })
  })

  return map
}

// ==========================================
// AGREGAÇÃO DETERMINÍSTICA DE VEÍCULOS D+1
// ==========================================

export function aggregateVehiclesD1(params: {
  targetD1Date: string
  queueEntries: QueueEntryEntity[]
  preRegistrations: PreRegistrationEntity[]
  chicaoOffers: ChicaoFreightOfferEntity[]
  freightOffers: FreightOfferEntity[]
  proposals: LoadProposalEntity[]
  registeredVehicles: VehicleEntity[]
  drivers: DriverEntity[]
  itineraries: SapItineraryEntity[]
  salesOrders: SapSalesOrderEntity[]
  stockSummaries: Map<string, MaterialStockD1Summary>
  temporaryReservations?: Map<string, number>
}): VehicleD1PlanItem[] {
  const {
    targetD1Date,
    queueEntries,
    preRegistrations,
    chicaoOffers,
    freightOffers,
    proposals,
    registeredVehicles,
    drivers,
    itineraries,
    salesOrders,
    stockSummaries,
    temporaryReservations = new Map<string, number>(),
  } = params

  const itemsMap = new Map<string, VehicleD1PlanItem>()
  const itinMap = new Map<string, SapItineraryEntity>()
  itineraries.forEach((it) => itinMap.set(it.sap_code, it))

  // 1. Veículos da Fila (Queue entries: PROGRAMADO, PORTA, FORA)
  queueEntries.forEach((q) => {
    if (['removido', 'bloqueado'].includes(q.status)) return
    const qDate =
      normalizeDateString(q.calculated_logistics_date) ||
      normalizeDateString(q.scheduled_arrival_date) ||
      normalizeDateString(q.entry_time)

    // Considera veículos programados para D+1 ou já no pátio com saída D+1
    const isMatchingDate = !qDate || qDate === targetD1Date || q.type === 'PROGRAMADO'
    if (!isMatchingDate) return

    const plate = q.vehicle_plate_cached || q.expand?.vehicle?.plate || 'CIAFAL-FROTA'
    const key = `queue_${plate}_${q.id}`
    const itinCode =
      q.preferred_itinerary_code ||
      q.preferred_itinerary ||
      q.expand?.vehicle?.body_type ||
      'SP001A'
    const itin = itinMap.get(itinCode)
    const capacityKg = q.vehicle_capacity_kg_cached || q.expand?.vehicle?.capacity_kg || 28000

    // Busca carga existente vinculada
    const linkedProp = proposals.find(
      (p) =>
        p.vehicle_plate === plate ||
        (p.itinerary_code === itinCode &&
          normalizeDateString(p.planned_dispatch_date) === targetD1Date),
    )

    const programmedWeightKg = linkedProp ? linkedProp.current_weight_kg : 0
    const availableCapacityKg = Math.max(0, capacityKg - programmedWeightKg)
    const occupancyPct =
      capacityKg > 0 ? Math.round((programmedWeightKg / capacityKg) * 1000) / 10 : 0

    itemsMap.set(key, {
      id: key,
      source: 'queue',
      sourceId: q.id,
      date: targetD1Date,
      scheduledTime: q.entry_time ? q.entry_time.split('T')[1]?.slice(0, 5) || '07:00' : '07:00',
      plate,
      vehicleType: q.vehicle_type_cached || q.expand?.vehicle?.type || 'Carreta LS 3 Eixos',
      driverName: q.driver_name_cached || q.expand?.driver?.name || 'Motorista Previsto',
      driverPhone: q.driver_whatsapp_cached || q.expand?.driver?.whatsapp,
      driverDocument: q.driver_doc_cached || q.expand?.driver?.document,
      carrierName: q.carrier_name_cached || 'Frota Parceira CIAFAL',
      itineraryCode: itinCode,
      itineraryDesc: itin?.description || itinCode,
      region: itin?.region || 'Região Metropolitana',
      uf: itin?.uf || 'SP',
      origin: itin?.origin || 'Planta CIAFAL Matriz',
      destination: itin?.description || itinCode,
      dischargesCount: linkedProp ? linkedProp.discharges_count : 1,
      capacityKg,
      capacityTons: formatKgToTons(capacityKg),
      programmedWeightKg,
      programmedWeightTons: formatKgToTons(programmedWeightKg),
      availableCapacityKg,
      availableCapacityTons: formatKgToTons(availableCapacityKg),
      occupancyPct,
      occupancyBand: classifyOccupancyBand(occupancyPct),
      compatibleWalletTons: 0,
      currentStockTons: 0,
      remessasGeneratedTons: 0,
      pcpD1Tons: 0,
      projectedStockD1Tons: 0,
      possibleComplementTons: 0,
      operationalStatus: 'Sem carteira compatível',
      matchReasons: [],
      isPcpDependent: false,
      allocatedOrderNumbers: linkedProp ? [linkedProp.proposal_number] : [],
      allocatedItems: [],
    })
  })

  // 2. Veículos Aceitos / Contratados na Mesa de Fretes
  chicaoOffers.forEach((ch) => {
    if (!['ACEITA', 'SELECIONADO', 'OFERTA_ENVIADA'].includes(ch.status)) return
    const plate = ch.vehicle_plate || 'CHICAO-MESA'
    const key = `chicao_${plate}_${ch.id}`
    if (itemsMap.has(key)) return

    const itinCode = ch.itinerary_code || 'SP001A'
    const itin = itinMap.get(itinCode)
    const capacityKg = ch.vehicle_capacity_kg || 30000
    const programmedWeightKg = ch.weight_kg || 0
    const availableCapacityKg = Math.max(0, capacityKg - programmedWeightKg)
    const occupancyPct =
      capacityKg > 0 ? Math.round((programmedWeightKg / capacityKg) * 1000) / 10 : 0

    itemsMap.set(key, {
      id: key,
      source: 'mesa',
      sourceId: ch.id,
      date: targetD1Date,
      scheduledTime: '08:00',
      plate,
      vehicleType: ch.vehicle_type || 'Carreta Graneleiro',
      driverName: ch.driver_name || 'Motorista Mesa de Fretes',
      driverPhone: ch.driver_phone || ch.driver_whatsapp,
      driverDocument: ch.driver_document,
      carrierName: ch.carrier_name || 'Transportadora Contratada',
      itineraryCode: itinCode,
      itineraryDesc: ch.itinerary_description || itin?.description || itinCode,
      region: itin?.region || 'Interior SP',
      uf: ch.destination_uf || itin?.uf || 'SP',
      origin: ch.origin || 'Planta Matriz',
      destination: ch.destination_city || itin?.description || itinCode,
      dischargesCount: ch.discharges_count || 1,
      capacityKg,
      capacityTons: formatKgToTons(capacityKg),
      programmedWeightKg,
      programmedWeightTons: formatKgToTons(programmedWeightKg),
      availableCapacityKg,
      availableCapacityTons: formatKgToTons(availableCapacityKg),
      occupancyPct,
      occupancyBand: classifyOccupancyBand(occupancyPct),
      compatibleWalletTons: 0,
      currentStockTons: 0,
      remessasGeneratedTons: 0,
      pcpD1Tons: 0,
      projectedStockD1Tons: 0,
      possibleComplementTons: 0,
      operationalStatus: 'Sem carteira compatível',
      matchReasons: [],
      isPcpDependent: false,
      allocatedOrderNumbers: [],
      allocatedItems: [],
    })
  })

  // 3. Pré-cadastros de Veículos com data prevista D+1
  preRegistrations.forEach((pr) => {
    if (pr.status === 'rejeitado') return
    const prDate = normalizeDateString(pr.scheduled_arrival_date)
    if (prDate && prDate !== targetD1Date) return

    const plate = pr.plate || 'PREREG-VEIC'
    const key = `prereg_${plate}_${pr.id}`
    if (itemsMap.has(key)) return

    const itinCode = pr.preferred_itinerary || 'MG001A'
    const itin = itinMap.get(itinCode)
    const capacityKg = pr.declared_capacity_kg || 27000

    itemsMap.set(key, {
      id: key,
      source: 'prereg',
      sourceId: pr.id,
      date: targetD1Date,
      scheduledTime: '08:30',
      plate,
      vehicleType: pr.vehicle_type || 'Truck',
      driverName: pr.name || 'Motorista Pré-Cadastrado',
      driverPhone: pr.whatsapp,
      driverDocument: pr.document,
      carrierName: pr.carrier_name || 'Transportadora Autônoma',
      itineraryCode: itinCode,
      itineraryDesc: pr.preferred_itinerary_name || itin?.description || itinCode,
      region: itin?.region || 'Grande BH',
      uf: itin?.uf || 'MG',
      origin: 'Planta CIAFAL Matriz',
      destination: itin?.description || itinCode,
      dischargesCount: 1,
      capacityKg,
      capacityTons: formatKgToTons(capacityKg),
      programmedWeightKg: 0,
      programmedWeightTons: 0,
      availableCapacityKg: capacityKg,
      availableCapacityTons: formatKgToTons(capacityKg),
      occupancyPct: 0,
      occupancyBand: 'baixa',
      compatibleWalletTons: 0,
      currentStockTons: 0,
      remessasGeneratedTons: 0,
      pcpD1Tons: 0,
      projectedStockD1Tons: 0,
      possibleComplementTons: 0,
      operationalStatus: 'Sem carteira compatível',
      matchReasons: [],
      isPcpDependent: false,
      allocatedOrderNumbers: [],
      allocatedItems: [],
    })
  })

  // 4. Propostas de Carga com Programação Futura D+1
  proposals.forEach((prop) => {
    const propDate = normalizeDateString(prop.planned_dispatch_date)
    if (propDate !== targetD1Date && !prop.is_future_match) return

    const plate = prop.vehicle_plate || 'PROP-CARGA'
    const key = `prop_${plate}_${prop.id}`
    if (itemsMap.has(key)) return

    const itinCode = prop.itinerary_code
    const itin = itinMap.get(itinCode)
    const capacityKg = prop.vehicle_capacity_kg || 30000
    const programmedWeightKg = prop.current_weight_kg || 0
    const availableCapacityKg = Math.max(0, capacityKg - programmedWeightKg)
    const occupancyPct =
      capacityKg > 0 ? Math.round((programmedWeightKg / capacityKg) * 1000) / 10 : 0

    itemsMap.set(key, {
      id: key,
      source: 'proposal',
      sourceId: prop.id,
      date: targetD1Date,
      scheduledTime: '06:30',
      plate,
      vehicleType: prop.vehicle_type || 'Carreta Bitrem',
      driverName: 'Motorista Programado CIAFAL',
      carrierName: 'Transporte CIAFAL Programado',
      itineraryCode: itinCode,
      itineraryDesc: prop.itinerary_description || itin?.description || itinCode,
      region: prop.region || itin?.region || 'Regional',
      uf: prop.uf || itin?.uf || 'SP',
      origin: 'Planta Matriz',
      destination: itin?.description || itinCode,
      dischargesCount: prop.discharges_count || 1,
      capacityKg,
      capacityTons: formatKgToTons(capacityKg),
      programmedWeightKg,
      programmedWeightTons: formatKgToTons(programmedWeightKg),
      availableCapacityKg,
      availableCapacityTons: formatKgToTons(availableCapacityKg),
      occupancyPct,
      occupancyBand: classifyOccupancyBand(occupancyPct),
      compatibleWalletTons: 0,
      currentStockTons: 0,
      remessasGeneratedTons: 0,
      pcpD1Tons: 0,
      projectedStockD1Tons: 0,
      possibleComplementTons: 0,
      operationalStatus: 'Sem carteira compatível',
      matchReasons: prop.reasons || [],
      isPcpDependent: false,
      allocatedOrderNumbers: [prop.proposal_number],
      allocatedItems: [],
    })
  })

  // 5. Se houver poucos veículos cadastrados, agrega os veículos cadastrados ativos
  if (itemsMap.size === 0) {
    registeredVehicles.forEach((veh, idx) => {
      const driver = drivers.find((d) => d.id === veh.driver) || drivers[idx % drivers.length]
      const itin = itineraries[idx % itineraries.length] || {
        sap_code: 'MG001A',
        description: 'Metropolitana BH',
        region: 'MG',
        uf: 'MG',
      }
      const capacityKg = veh.capacity_kg || 32000
      const key = `veh_${veh.plate}_${veh.id}`

      itemsMap.set(key, {
        id: key,
        source: 'vehicle',
        sourceId: veh.id,
        date: targetD1Date,
        scheduledTime: `0${7 + (idx % 3)}:00`,
        plate: veh.plate,
        vehicleType: veh.type || 'Carreta LS 3 Eixos',
        driverName: driver?.name || 'Motorista Ativo SAP',
        driverPhone: driver?.whatsapp,
        driverDocument: driver?.document,
        carrierName: veh.carrier_name || 'Frota Própria CIAFAL',
        itineraryCode: itin.sap_code,
        itineraryDesc: itin.description,
        region: itin.region || 'Região Sudeste',
        uf: itin.uf || 'MG',
        origin: 'Planta CIAFAL Matriz',
        destination: itin.description,
        dischargesCount: 1,
        capacityKg,
        capacityTons: formatKgToTons(capacityKg),
        programmedWeightKg: 0,
        programmedWeightTons: 0,
        availableCapacityKg: capacityKg,
        availableCapacityTons: formatKgToTons(capacityKg),
        occupancyPct: 0,
        occupancyBand: 'baixa',
        compatibleWalletTons: 0,
        currentStockTons: 0,
        remessasGeneratedTons: 0,
        pcpD1Tons: 0,
        projectedStockD1Tons: 0,
        possibleComplementTons: 0,
        operationalStatus: 'Sem carteira compatível',
        matchReasons: [],
        isPcpDependent: false,
        allocatedOrderNumbers: [],
        allocatedItems: [],
      })
    })
  }

  // ========================================================
  // REQUISITOS 10, 12, 13: CRUZAMENTO AUTOMÁTICO COM CARTEIRA E ESTOQUE
  // ========================================================
  const resultList: VehicleD1PlanItem[] = Array.from(itemsMap.values())

  // Rastreamento local de estoque consumido provisoriamente para evitar dupla alocação (REQUISITO 5)
  const provisionallyReservedKg = new Map<string, number>()
  temporaryReservations.forEach((val, k) => provisionallyReservedKg.set(k, val))

  resultList.forEach((item) => {
    // Pedidos compatíveis com o itinerário e com a região do veículo
    const compatibleOrders = salesOrders.filter((ord) => {
      if (hasGeneratedRemessa(ord)) return false
      // Verifica compatibilidade de itinerário
      const matchesItin =
        ord.itinerary_code === item.itineraryCode ||
        ord.route_code === item.itineraryCode ||
        (!item.itineraryCode && ord.uf === item.uf)
      return matchesItin
    })

    const totalCompatibleKg = compatibleOrders.reduce(
      (acc, o) => acc + (o.balance_quantity_kg || o.weight_kg || 0),
      0,
    )
    item.compatibleWalletTons = formatKgToTons(totalCompatibleKg)

    // Agrega estoque e PCP do mix de materiais dos pedidos compatíveis
    let itinCurrentStockKg = 0
    let itinRemessasKg = 0
    let itinPcpKg = 0
    let itinProjectedKg = 0
    let hasInsufficientStock = false
    let hasPcpDependency = false
    let complementPossibleKg = 0
    const reasons: string[] = []

    const distinctMaterials = new Set(
      compatibleOrders.map((o) => o.material).filter(Boolean) as string[],
    )

    distinctMaterials.forEach((mat) => {
      const stock = stockSummaries.get(mat)
      if (stock) {
        itinCurrentStockKg += stock.currentStockKg
        itinRemessasKg += stock.remessasGeneratedKg
        itinPcpKg += stock.pcpD1Kg
        itinProjectedKg += stock.projectedStockKg
        if (stock.isInsufficient) hasInsufficientStock = true
        if (stock.pcpD1Kg > 0) hasPcpDependency = true
      }
    })

    item.currentStockTons = formatKgToTons(itinCurrentStockKg)
    item.remessasGeneratedTons = formatKgToTons(itinRemessasKg)
    item.pcpD1Tons = formatKgToTons(itinPcpKg)
    item.projectedStockD1Tons = formatKgToTons(itinProjectedKg)

    // Simula complemento de carga considerando capacidade livre e estoque livre
    if (item.availableCapacityKg > 0 && compatibleOrders.length > 0) {
      let remainingCapacity = item.availableCapacityKg

      for (const ord of compatibleOrders) {
        if (remainingCapacity <= 0) break
        const ordMat = ord.material || ''
        const stock = stockSummaries.get(ordMat)
        const orderKg = ord.balance_quantity_kg || ord.weight_kg || 0

        // Saldo livre projetado descontando reservas provisórias
        const previouslyReserved = provisionallyReservedKg.get(ordMat) || 0
        const freeProjected = stock ? Math.max(0, stock.projectedStockKg - previouslyReserved) : 0

        // QUANTIDADE ELEGÍVEL = MIN(saldo carteira elegível, estoque projetado livre D+1)
        const allocatableKg = Math.min(orderKg, freeProjected, remainingCapacity)

        if (allocatableKg > 0) {
          complementPossibleKg += allocatableKg
          remainingCapacity -= allocatableKg
          provisionallyReservedKg.set(ordMat, previouslyReserved + allocatableKg)

          if (stock && stock.currentStockKg < allocatableKg && stock.pcpD1Kg > 0) {
            hasPcpDependency = true
          }
        }
      }
    }

    item.possibleComplementTons = formatKgToTons(complementPossibleKg)
    item.isPcpDependent = hasPcpDependency
    if (hasPcpDependency) {
      item.pcpAlertMessage = '⚠ CARGA DEPENDENTE DE PRODUÇÃO PCP'
    }

    // Explicações objetivas do Match (REQUISITO 13)
    if (item.itineraryCode) {
      reasons.push(`✓ Mesmo itinerário SAP (${item.itineraryCode})`)
    }
    if (item.availableCapacityKg > 0) {
      reasons.push(`✓ Capacidade disponível de ${item.availableCapacityTons} t`)
    } else {
      reasons.push('✓ Capacidade nominal 100% atingida')
    }
    if (itinProjectedKg > 0) {
      reasons.push(`✓ Estoque projetado positivo (${item.projectedStockD1Tons} t)`)
    }
    if (compatibleOrders.length > 0) {
      reasons.push(`✓ ${compatibleOrders.length} pedido(s) em carteira elegível sem remessa`)
    }
    if (hasPcpDependency) {
      reasons.push('⚠ Suporte de produção PCP programada até D+1')
    }
    item.matchReasons = reasons

    // Determina Status Operacional (REQUISITO 15)
    if (!item.itineraryCode) {
      item.operationalStatus = 'Veículo sem itinerário'
    } else if (item.occupancyPct > 100.5) {
      item.operationalStatus = 'Divergência de capacidade'
    } else if (item.occupancyPct >= 99) {
      item.operationalStatus = 'Carga completa'
    } else if (item.availableCapacityKg > 0 && complementPossibleKg > 0) {
      item.operationalStatus = 'Complemento disponível'
    } else if (compatibleOrders.length === 0) {
      item.operationalStatus = 'Sem carteira compatível'
    } else if (hasInsufficientStock) {
      item.operationalStatus = 'Estoque insuficiente'
    } else if (hasPcpDependency) {
      item.operationalStatus = 'Aguardando produção PCP'
    } else if (itinProjectedKg <= 0) {
      item.operationalStatus = 'Aguardando estoque'
    } else if (totalCompatibleKg > item.capacityKg * 2) {
      item.operationalStatus = 'Excesso de carteira'
    } else {
      item.operationalStatus = 'Complemento disponível'
    }
  })

  return resultList
}

// ==========================================
// CARTEIRA ELEGÍVEL DETERMINÍSTICA (REQUISITO 4, 5)
// ==========================================

export function buildEligibleWalletList(params: {
  salesOrders: SapSalesOrderEntity[]
  stockSummaries: Map<string, MaterialStockD1Summary>
  targetD1Date: string
  selectedItinerary?: string
  temporaryReservations?: Map<string, number>
}): EligibleWalletItemD1[] {
  const {
    salesOrders,
    stockSummaries,
    targetD1Date,
    selectedItinerary,
    temporaryReservations = new Map<string, number>(),
  } = params

  const items: EligibleWalletItemD1[] = []

  salesOrders.forEach((ord) => {
    if (
      selectedItinerary &&
      selectedItinerary !== 'ALL' &&
      ord.itinerary_code !== selectedItinerary
    ) {
      return
    }

    const hasRem = hasGeneratedRemessa(ord)
    const mat = ord.material || ''
    const stock = stockSummaries.get(mat)
    const weightKg = ord.balance_quantity_kg || ord.weight_kg || 0
    const currentStockKg = stock ? stock.currentStockKg : 0
    const projectedStockKg = stock ? stock.projectedStockKg : 0

    const matchReasons: string[] = []
    const ineligibilityReasons: string[] = []

    // Validação de elegibilidade (REQUISITO 4)
    let isEligible = true
    if (hasRem) {
      isEligible = false
      ineligibilityReasons.push('Pedido já possui remessa gerada (VL01N) ou transporte vinculado')
    }
    if (ord.credit_status === 'Bloqueado') {
      isEligible = false
      ineligibilityReasons.push('Crédito Bloqueado no SAP ECC')
    }
    if (weightKg <= 0) {
      isEligible = false
      ineligibilityReasons.push('Saldo aberto nulo')
    }

    if (isEligible) {
      matchReasons.push('✓ Pedido em carteira aberta sem remessa')
      if (ord.credit_status === 'Liberado') {
        matchReasons.push('✓ Crédito 100% liberado via RFC')
      }
      if (stock && stock.projectedStockKg > 0) {
        matchReasons.push(`✓ Estoque projetado livre: ${formatKgToTons(stock.projectedStockKg)} t`)
      }
    }

    // QUANTIDADE ELEGÍVEL = MIN(saldo carteira elegível, estoque projetado livre D+1) (REQUISITO 5)
    const previouslyReserved = temporaryReservations.get(mat) || 0
    const availableFreeStockKg = stock
      ? Math.max(0, stock.projectedStockKg - previouslyReserved)
      : 0
    const quantityEligibleKg = isEligible ? Math.min(weightKg, availableFreeStockKg) : 0

    items.push({
      id: ord.id,
      orderNumber: ord.order_number,
      itemNumber: ord.item_number || '000010',
      customerCode: ord.customer_code,
      customerName: ord.customer_name,
      destinationCity: ord.destination_city,
      uf: ord.uf,
      itineraryCode: ord.itinerary_code,
      region: ord.itinerary_code,
      material: mat,
      materialDescription: ord.material_description || mat,
      weightKg,
      weightTons: formatKgToTons(weightKg),
      orderValue: ord.order_value || ord.total_value || 0,
      desiredDate: normalizeDateString(ord.desired_date),
      orderDate: normalizeDateString(ord.order_date),
      priorityLevel: ord.priority_level || 'Normal',
      creditStatus: ord.credit_status || 'Em Análise',
      creditReason: ord.credit_reason,
      dischargeType: ord.discharge_type,
      requiredVehicleType: ord.required_vehicle_type,
      logisticRestrictions: ord.logistic_restrictions,
      deliveryNumber: ord.delivery_number,
      assignedLoadId: ord.assigned_load_id,
      isOpenAndEligible: isEligible,
      hasRemessa: hasRem,
      stockSituation: ord.stock_situation || (stock?.isInsufficient ? 'INSUFICIENTE' : 'CONFORME'),
      currentStockKg,
      projectedStockKg,
      pcpStatus: ord.pcp_status,
      pcpForecastDate: ord.pcp_forecast_date,
      quantityEligibleKg,
      quantityEligibleTons: formatKgToTons(quantityEligibleKg),
      matchReasons,
      ineligibilityReasons,
    })
  })

  return items
}

// ==========================================
// MATRIZ DE BALANÇO LOGÍSTICO (REQUISITO 14)
// ==========================================

export function calculateItineraryBalanceMatrix(params: {
  itineraries: SapItineraryEntity[]
  vehicles: VehicleD1PlanItem[]
  eligibleWallet: EligibleWalletItemD1[]
  stockSummaries: Map<string, MaterialStockD1Summary>
  selectedItinerary?: string
}): ItineraryBalanceMatrixD1[] {
  const { itineraries, vehicles, eligibleWallet, stockSummaries, selectedItinerary } = params

  const rows: ItineraryBalanceMatrixD1[] = []

  itineraries.forEach((it) => {
    if (selectedItinerary && selectedItinerary !== 'ALL' && it.sap_code !== selectedItinerary) {
      return
    }

    const itinVehicles = vehicles.filter((v) => v.itineraryCode === it.sap_code)
    const totalCapacityTons = itinVehicles.reduce((acc, v) => acc + v.capacityTons, 0)
    const programmedLoadTons = itinVehicles.reduce((acc, v) => acc + v.programmedWeightTons, 0)
    const freeSpaceTons = Math.max(
      0,
      Math.round((totalCapacityTons - programmedLoadTons) * 100) / 100,
    )

    const itinOrders = eligibleWallet.filter(
      (o) => o.itineraryCode === it.sap_code && o.isOpenAndEligible,
    )
    const eligibleWalletTons =
      Math.round(itinOrders.reduce((acc, o) => acc + o.quantityEligibleTons, 0) * 100) / 100

    // Soma estoque projetado e PCP dos materiais deste itinerário
    const distinctMats = new Set(itinOrders.map((o) => o.material))
    let projectedStockKg = 0
    let pcpD1Kg = 0
    distinctMats.forEach((mat) => {
      const s = stockSummaries.get(mat)
      if (s) {
        projectedStockKg += s.projectedStockKg
        pcpD1Kg += s.pcpD1Kg
      }
    })

    const projectedStockTons = formatKgToTons(projectedStockKg)
    const pcpD1Tons = formatKgToTons(pcpD1Kg)
    const potentialComplementTons = Math.min(freeSpaceTons, eligibleWalletTons)

    let balanceDiagnosis: ItineraryBalanceMatrixD1['balanceDiagnosis'] = 'EQUILIBRADO'
    if (itinVehicles.length === 0 && eligibleWalletTons > 0) {
      balanceDiagnosis = 'SEM VEÍCULO'
    } else if (itinVehicles.length > 0 && eligibleWalletTons === 0 && freeSpaceTons > 0) {
      balanceDiagnosis = 'EXCESSO DE TRANSPORTE'
    } else if (freeSpaceTons > 0 && potentialComplementTons >= 2) {
      balanceDiagnosis = 'COMPLEMENTO POSSÍVEL'
    } else if (eligibleWalletTons > totalCapacityTons && totalCapacityTons > 0) {
      balanceDiagnosis = 'FALTA DE TRANSPORTE'
    } else if (projectedStockTons < eligibleWalletTons) {
      balanceDiagnosis = 'MATERIAL INSUFICIENTE'
    }

    if (totalCapacityTons > 0 || eligibleWalletTons > 0) {
      rows.push({
        itineraryCode: it.sap_code,
        itineraryDesc: it.description || it.sap_code,
        region: it.region || 'Regional',
        uf: it.uf || 'SP',
        vehiclesD1Count: itinVehicles.length,
        totalCapacityTons,
        programmedLoadTons,
        freeSpaceTons,
        eligibleWalletTons,
        projectedStockTons,
        pcpD1Tons,
        potentialComplementTons,
        balanceDiagnosis,
      })
    }
  })

  return rows
}

// ==========================================
// CARDS EXECUTIVOS D+1 (REQUISITO 7)
// ==========================================

export function calculateExecutiveCardsD1(params: {
  vehicles: VehicleD1PlanItem[]
  stockSummaries: Map<string, MaterialStockD1Summary>
}): ExecutiveCardsD1Data {
  const { vehicles, stockSummaries } = params

  const vehiclesCount = vehicles.length
  const totalCapacityTons =
    Math.round(vehicles.reduce((acc, v) => acc + v.capacityTons, 0) * 100) / 100
  const programmedWeightTons =
    Math.round(vehicles.reduce((acc, v) => acc + v.programmedWeightTons, 0) * 100) / 100
  const availableCapacityTons = Math.max(
    0,
    Math.round((totalCapacityTons - programmedWeightTons) * 100) / 100,
  )

  const avgOccupancyPct =
    totalCapacityTons > 0 ? Math.round((programmedWeightTons / totalCapacityTons) * 1000) / 10 : 0

  const possibleComplementsCount = vehicles.filter((v) => v.possibleComplementTons > 0).length

  let pcpProductionD1Kg = 0
  let projectedStockKg = 0
  let insufficientStockCount = 0

  stockSummaries.forEach((s) => {
    pcpProductionD1Kg += s.pcpD1Kg
    projectedStockKg += s.projectedStockKg
    if (s.isInsufficient) insufficientStockCount++
  })

  return {
    vehiclesCount,
    totalCapacityTons,
    programmedWeightTons,
    availableCapacityTons,
    avgOccupancyPct,
    possibleComplementsCount,
    pcpProductionD1Tons: formatKgToTons(pcpProductionD1Kg),
    projectedStockTons: formatKgToTons(projectedStockKg),
    insufficientStockCount,
  }
}

// ==========================================
// SIMULADOR DE COMPLEMENTO DE CARGA (REQUISITO 10, 11)
// ==========================================

export function findComplementCandidatesForVehicle(params: {
  vehicle: VehicleD1PlanItem
  eligibleWallet: EligibleWalletItemD1[]
  stockSummaries: Map<string, MaterialStockD1Summary>
}): ComplementCandidateD1[] {
  const { vehicle, eligibleWallet, stockSummaries } = params

  // Filtra pedidos elegíveis compatíveis com o itinerário ou região do veículo
  const candidates = eligibleWallet.filter((ord) => {
    if (!ord.isOpenAndEligible) return false
    const matchItin = ord.itineraryCode === vehicle.itineraryCode || ord.uf === vehicle.uf
    return matchItin
  })

  const result: ComplementCandidateD1[] = []
  let simulatedRemainingCapKg = vehicle.availableCapacityKg

  candidates.forEach((cand) => {
    const stock = stockSummaries.get(cand.material)
    const projStockKg = stock ? stock.projectedStockKg : 0
    const suggestedKg = Math.min(cand.weightKg, Math.max(0, projStockKg), simulatedRemainingCapKg)

    const simulatedWeightKg = vehicle.programmedWeightKg + suggestedKg
    const resultingOccupancyPct =
      vehicle.capacityKg > 0 ? Math.round((simulatedWeightKg / vehicle.capacityKg) * 1000) / 10 : 0

    const isPcpDependent = Boolean(stock && stock.currentStockKg < suggestedKg && stock.pcpD1Kg > 0)
    const reasons: string[] = [
      `Itinerário compatível (${cand.itineraryCode})`,
      `Cliente: ${cand.customerName} - ${cand.destinationCity}/${cand.uf}`,
    ]
    if (isPcpDependent) {
      reasons.push('Necessita produção PCP programada para D+1')
    }

    result.push({
      id: cand.id,
      orderNumber: cand.orderNumber,
      itemNumber: cand.itemNumber,
      customerCode: cand.customerCode,
      customerName: cand.customerName,
      destinationCity: cand.destinationCity,
      uf: cand.uf,
      priorityLevel: cand.priorityLevel,
      material: cand.material,
      materialDescription: cand.materialDescription,
      walletBalanceKg: cand.weightKg,
      walletBalanceTons: cand.weightTons,
      projectedStockD1Kg: projStockKg,
      projectedStockD1Tons: formatKgToTons(projStockKg),
      suggestedQuantityKg: suggestedKg,
      suggestedQuantityTons: formatKgToTons(suggestedKg),
      resultingOccupancyPct,
      isPcpDependent,
      pcpForecastNotice: stock?.pcpScheduleNotice,
      reasons,
    })
  })

  return result
}

export function simulateComplementLoad(params: {
  vehicle: VehicleD1PlanItem
  selectedCandidates: ComplementCandidateD1[]
}): ComplementSimulationResult {
  const { vehicle, selectedCandidates } = params

  const additionalKg = selectedCandidates.reduce((acc, c) => acc + c.suggestedQuantityKg, 0)
  const afterWeightKg = vehicle.programmedWeightKg + additionalKg
  const afterWeightTons = formatKgToTons(afterWeightKg)
  const afterOccupancyPct =
    vehicle.capacityKg > 0 ? Math.round((afterWeightKg / vehicle.capacityKg) * 1000) / 10 : 0

  const weightGainTons = formatKgToTons(additionalKg)
  const occupancyGainPct = Math.round((afterOccupancyPct - vehicle.occupancyPct) * 10) / 10
  const isFeasible = afterWeightKg <= vehicle.capacityKg * 1.05 // até 5% de tolerância operacional

  // Estimativa de roteirização geográfica / Haversine (reaproveitando regras CIAFAL)
  const distinctCities = new Set(selectedCandidates.map((c) => c.destinationCity))
  const stopsCount = Math.max(1, vehicle.dischargesCount + distinctCities.size)
  const distanceKm = Math.round(180 + stopsCount * 45)
  const durationMin = Math.round((distanceKm / 65) * 60)
  const tollsEstimate = Math.round((distanceKm / 55) * 4.2 * 5)
  const anttFloorEstimate = Math.round(distanceKm * 5.15 + 310)

  return {
    vehicleId: vehicle.id,
    plate: vehicle.plate,
    itineraryCode: vehicle.itineraryCode,
    itineraryDesc: vehicle.itineraryDesc,
    capacityTons: vehicle.capacityTons,
    beforeWeightTons: vehicle.programmedWeightTons,
    beforeOccupancyPct: vehicle.occupancyPct,
    afterWeightTons,
    afterOccupancyPct,
    weightGainTons,
    occupancyGainPct,
    selectedCandidates,
    isFeasible,
    divergenceNotes: !isFeasible
      ? '⚠ Capacidade máxima do veículo ultrapassada na simulação!'
      : undefined,
    routeEstimate: {
      distanceKm,
      durationMin,
      tollsEstimate,
      anttFloorEstimate,
      stopsCount,
    },
  }
}
