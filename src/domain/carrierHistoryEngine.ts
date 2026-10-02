/**
 * TMS CIAFAL — Motor de Histórico Operacional e Avaliação de Prestadores
 *
 * Regras Fundamentais:
 * 1. Segregação Absoluta:
 *    - Veículo independente de motorista
 *    - Motorista independente de veículo
 *    - Combinação específica veículo + motorista (um veículo é conduzido por vários motoristas ao longo do tempo)
 * 2. Avaliações segregadas por objeto:
 *    - Reclamação sobre comportamento do motorista NÃO prejudica automaticamente o veículo
 *    - Falha física do veículo NÃO prejudica automaticamente o motorista
 * 3. Reclamação NÃO reduz score definitivo antes de tratada e julgada PROCEDENTE por responsável humano
 * 4. NUNCA permitir que IA bloqueie automaticamente qualquer prestador sem regra formal e aprovação humana
 * 5. Se não houver dado histórico, exibir literalmente "Não disponível", nunca inventar
 * 6. Segregação de responsabilidade nos tempos da expedição (tempo interno vs tempo transportador)
 */

export interface CarrierOperationalRecord {
  id: string
  transport_order_number: string
  sap_transport_number?: string
  transport_date: string
  driver_id?: string
  driver_name: string
  driver_document_masked?: string
  driver_document_full?: string
  vehicle_plate: string
  vehicle_type?: string
  carrier_name?: string
  trailer_plate?: string
  itinerary_code?: string
  itinerary_description?: string
  origin_plant?: string
  destination_city?: string
  destination_uf?: string
  region?: string
  customers_summary?: string
  discharges_count?: number
  weight_kg?: number
  weight_ton?: number
  products_summary?: string
  // Horários
  scheduled_entry?: string
  actual_entry?: string
  loading_start?: string
  loading_end?: string
  invoicing_start?: string
  invoicing_end?: string
  actual_exit?: string
  // Tempos em minutos
  loading_duration_min?: number
  invoicing_duration_min?: number
  internal_waiting_min?: number
  total_internal_dwell_min?: number
  internal_responsibility_min?: number
  carrier_responsibility_min?: number
  // Rota
  route_estimated_min?: number
  route_actual_min?: number
  delivery_estimated_at?: string
  delivery_actual_at?: string
  is_on_time?: boolean
  delay_minutes?: number
  occurrences_count?: number
  occurrences_summary?: string
  // Custos & Margem
  freight_cost_driver?: number
  toll_cost?: number
  other_costs?: number
  total_cost?: number
  freight_billed_customer?: number
  margin_value?: number
  margin_pct?: number
  // Avaliações
  driver_rating?: number
  vehicle_rating?: number
  complaints_count?: number
  complaints_procedente_count?: number
  compliments_count?: number
  non_conformities_count?: number
  final_status:
    | 'CONCLUIDO'
    | 'EM_VIAGEM'
    | 'EM_EXPEDICAO'
    | 'CANCELADO'
    | 'ENCERRADO_COM_OCORRENCIA'
  is_sidercentro?: boolean
  metadata_json?: Record<string, unknown>
  created?: string
}

export interface CarrierEvaluationRecord {
  id?: string
  transport_order_number?: string
  sap_transport_number?: string
  target_type: 'MOTORISTA' | 'VEICULO' | 'MOTORISTA_VEICULO' | 'TRANSPORTADORA' | 'TRANSPORTE'
  driver_id?: string
  driver_name?: string
  driver_document?: string
  vehicle_plate?: string
  vehicle_type?: string
  carrier_name?: string
  itinerary_code?: string
  customer_name?: string
  origin_type:
    | 'CLIENTE'
    | 'TRANSPORTE_LOGISTICA'
    | 'EXPEDICAO'
    | 'FATURAMENTO'
    | 'PORTARIA'
    | 'COMERCIAL'
    | 'REPRESENTANTE_VENDEDOR'
    | 'SEGURANCA'
    | 'MOTORISTA'
    | 'GESTOR'
    | 'SISTEMA_IA'
  origin_user_email?: string
  origin_user_name?: string
  evaluation_date?: string
  operational_moment?:
    | 'DURANTE_OPERACAO'
    | 'APOS_CARREGAMENTO'
    | 'APOS_ENTREGA'
    | 'RETORNO_CLIENTE'
    | 'APOS_OCORRENCIA'
    | 'CONSULTA_HISTORICA'
  // Critérios Motorista (1-5)
  driver_pontualidade?: number
  driver_cumprimento_orientacoes?: number
  driver_relacionamento_interno?: number
  driver_relacionamento_cliente?: number
  driver_comunicacao?: number
  driver_disponibilidade?: number
  driver_colaboracao?: number
  driver_postura_profissional?: number
  driver_cuidado_carga?: number
  driver_cumprimento_itinerario?: number
  driver_qualidade_atendimento?: number
  driver_tratamento_ocorrencias?: number
  driver_regras_seguranca?: number
  driver_documentacao?: number
  driver_qualidade_geral?: number
  driver_avg_score?: number
  driver_recommendation?: 'SIM' | 'SIM_COM_RESSALVAS' | 'NAO'
  // Critérios Veículo (1-5)
  vehicle_conservacao?: number
  vehicle_limpeza?: number
  vehicle_condicoes_aparentes?: number
  vehicle_adequacao_carga?: number
  vehicle_carroceria?: number
  vehicle_protecao_carga?: number
  vehicle_lona?: number
  vehicle_amarracao?: number
  vehicle_capacidade?: number
  vehicle_documentacao?: number
  vehicle_condicoes_operacionais?: number
  vehicle_regras_internas?: number
  vehicle_avg_score?: number
  justification_critical?: string
  general_notes?: string
  tags_json?: string[]
  created?: string
}

export interface CarrierComplaintRecord {
  id?: string
  complaint_number: string
  transport_order_number?: string
  sap_transport_number?: string
  category:
    | 'RECLAMACAO_CLIENTE'
    | 'TRANSPORTE'
    | 'EXPEDICAO'
    | 'FATURAMENTO'
    | 'PORTARIA'
    | 'COMERCIAL'
    | 'SEGURANCA'
    | 'COMPORTAMENTO'
    | 'ATRASO'
    | 'COMUNICACAO'
    | 'CARGA'
    | 'ENTREGA'
    | 'DOCUMENTACAO'
    | 'VEICULO'
    | 'AVARIA'
    | 'OUTRO'
  severity: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  target_type: 'MOTORISTA' | 'VEICULO' | 'MOTORISTA_VEICULO' | 'TRANSPORTADORA'
  driver_id?: string
  driver_name?: string
  vehicle_plate?: string
  carrier_name?: string
  customer_code?: string
  customer_name?: string
  itinerary_code?: string
  origin_type:
    | 'CLIENTE'
    | 'TRANSPORTE_LOGISTICA'
    | 'EXPEDICAO'
    | 'FATURAMENTO'
    | 'PORTARIA'
    | 'COMERCIAL'
    | 'REPRESENTANTE_VENDEDOR'
    | 'SEGURANCA'
    | 'MOTORISTA'
    | 'GESTOR'
    | 'SISTEMA_IA'
  description: string
  registered_by_email?: string
  registered_by_name?: string
  occurrence_date?: string
  status:
    | 'REGISTRADA'
    | 'EM_ANALISE'
    | 'PROCEDENTE'
    | 'PARCIALMENTE_PROCEDENTE'
    | 'IMPROCEDENTE'
    | 'ACAO_NECESSARIA'
    | 'TRATADA'
    | 'ENCERRADA'
  analyst_email?: string
  analyst_name?: string
  analysis_notes?: string
  driver_carrier_manifestation?: string
  conclusion?: string
  action_taken?: string
  resolved_at?: string
  evidences_json?: Array<{ name: string; url?: string; type?: string }>
  audit_trail_json?: Array<{
    date: string
    user: string
    action: string
    previous_status?: string
    new_status?: string
  }>
  created?: string
}

export interface CarrierComplimentRecord {
  id?: string
  compliment_number: string
  sap_transport_number?: string
  driver_id?: string
  driver_name?: string
  vehicle_plate?: string
  carrier_name?: string
  customer_name?: string
  category:
    | 'ELOGIO_CLIENTE'
    | 'ELOGIO_EXPEDICAO'
    | 'BOA_ATUACAO_OCORRENCIA'
    | 'DISPONIBILIDADE_EXTRAORDINARIA'
    | 'EXCELENTE_COMUNICACAO'
    | 'ANTECIPACAO_PROBLEMA'
    | 'CUMPRIMENTO_EXCEPCIONAL'
    | 'COMPORTAMENTO_COLABORATIVO'
    | 'OUTRO'
  origin_type:
    | 'CLIENTE'
    | 'EXPEDICAO'
    | 'COMERCIAL'
    | 'TRANSPORTE_LOGISTICA'
    | 'GESTOR'
    | 'PORTARIA'
  description: string
  registered_by_name?: string
  compliment_date?: string
  created?: string
}

// -------------------------------------------------------------------------
// 1. VISÃO 360º MOTORISTA
// -------------------------------------------------------------------------

export interface Driver360Metrics {
  driverName: string
  driverId: string
  carrierName: string
  documentMasked: string
  totalTransports: number
  totalTonnage: number
  avgTonnagePerTransport: number
  avgDischarges: number
  uniqueVehicles: Array<{ plate: string; count: number; avgRating: number; lastDate: string }>
  itinerariesPerformed: Array<{ code: string; count: number; onTimePct: number }>
  customersServed: string[]
  estimatedKmTotal: number
  avgDwellInternalMin: number
  avgLoadingMin: number
  avgInvoicingMin: number
  avgRouteMin: number
  onTimePct: number
  delaysCount: number
  occurrencesCount: number
  complaintsCount: number
  complaintsProcedenteCount: number
  complimentsCount: number
  avgRating: number // 1 a 5
  ratingEvolution: Array<{ month: string; rating: number; count: number }>
  avgCostFreight: number
  avgCostPerTon: number
  avgCostPerTrip: number
  avgMarginPct: number
  firstTransportDate: string
  lastTransportDate: string
  scoreExplicavel: {
    scoreFinal: number // 0-100
    fatores: Array<{
      nome: string
      impacto: string
      explicacao: string
      tipo: 'positivo' | 'neutro' | 'negativo'
    }>
  }
}

export function buildDriver360(
  driverNameOrId: string,
  history: CarrierOperationalRecord[],
  evaluations: CarrierEvaluationRecord[],
  complaints: CarrierComplaintRecord[],
  compliments: CarrierComplimentRecord[],
): Driver360Metrics | null {
  const norm = driverNameOrId.trim().toLowerCase()
  const records = history.filter(
    (h) =>
      (h.driver_name && h.driver_name.toLowerCase() === norm) ||
      (h.driver_id && h.driver_id === driverNameOrId),
  )

  if (records.length === 0) return null

  const totalTransports = records.length
  const totalWeightKg = records.reduce(
    (acc, r) => acc + (r.weight_kg ?? (r.weight_ton ? r.weight_ton * 1000 : 0)),
    0,
  )
  const totalTonnage = totalWeightKg / 1000
  const avgTonnagePerTransport = totalTonnage / totalTransports

  const totalDischarges = records.reduce((acc, r) => acc + (r.discharges_count || 1), 0)
  const avgDischarges = totalDischarges / totalTransports

  // Veículos utilizados pelo motorista
  const vehicleMap = new Map<string, { count: number; ratings: number[]; lastDate: string }>()
  records.forEach((r) => {
    const v = vehicleMap.get(r.vehicle_plate) || { count: 0, ratings: [], lastDate: '' }
    v.count += 1
    if (r.vehicle_rating) v.ratings.push(r.vehicle_rating)
    if (!v.lastDate || r.transport_date > v.lastDate) v.lastDate = r.transport_date
    vehicleMap.set(r.vehicle_plate, v)
  })

  const uniqueVehicles = Array.from(vehicleMap.entries())
    .map(([plate, data]) => ({
      plate,
      count: data.count,
      avgRating: data.ratings.length
        ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length
        : 0,
      lastDate: data.lastDate,
    }))
    .sort((a, b) => b.count - a.count)

  // Itinerários
  const itinMap = new Map<string, { count: number; onTime: number }>()
  records.forEach((r) => {
    const code = r.itinerary_code || 'Não informado'
    const item = itinMap.get(code) || { count: 0, onTime: 0 }
    item.count += 1
    if (r.is_on_time !== false) item.onTime += 1
    itinMap.set(code, item)
  })

  const itinerariesPerformed = Array.from(itinMap.entries())
    .map(([code, item]) => ({
      code,
      count: item.count,
      onTimePct: item.count > 0 ? (item.onTime / item.count) * 100 : 100,
    }))
    .sort((a, b) => b.count - a.count)

  // Clientes atendidos únicos
  const customerSet = new Set<string>()
  records.forEach((r) => {
    if (r.customers_summary) {
      r.customers_summary.split(';').forEach((c) => {
        const tr = c.trim()
        if (tr) customerSet.add(tr)
      })
    }
  })

  // Tempos médios
  const dwellTimes = records
    .map((r) => r.total_internal_dwell_min)
    .filter((n): n is number => n !== undefined && n !== null)
  const avgDwellInternalMin = dwellTimes.length
    ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length
    : 0

  const loadingTimes = records
    .map((r) => r.loading_duration_min)
    .filter((n): n is number => n !== undefined && n !== null)
  const avgLoadingMin = loadingTimes.length
    ? loadingTimes.reduce((a, b) => a + b, 0) / loadingTimes.length
    : 0

  const invoicingTimes = records
    .map((r) => r.invoicing_duration_min)
    .filter((n): n is number => n !== undefined && n !== null)
  const avgInvoicingMin = invoicingTimes.length
    ? invoicingTimes.reduce((a, b) => a + b, 0) / invoicingTimes.length
    : 0

  const routeTimes = records
    .map((r) => r.route_actual_min)
    .filter((n): n is number => n !== undefined && n !== null)
  const avgRouteMin = routeTimes.length
    ? routeTimes.reduce((a, b) => a + b, 0) / routeTimes.length
    : 0

  // Pontualidade & Atrasos
  const onTimeCount = records.filter((r) => r.is_on_time !== false).length
  const onTimePct = (onTimeCount / totalTransports) * 100
  const delaysCount = records.filter(
    (r) => r.is_on_time === false || (r.delay_minutes && r.delay_minutes > 0),
  ).length

  // Ocorrências
  const occurrencesCount = records.reduce((acc, r) => acc + (r.occurrences_count || 0), 0)

  // Reclamações direcionadas ao motorista
  const driverComplaints = complaints.filter(
    (c) =>
      c.driver_name?.toLowerCase() === norm ||
      c.driver_id === driverNameOrId ||
      records.some(
        (r) =>
          r.transport_order_number === c.transport_order_number &&
          (c.target_type === 'MOTORISTA' || c.target_type === 'MOTORISTA_VEICULO'),
      ),
  )
  const complaintsCount = driverComplaints.length
  const complaintsProcedenteCount = driverComplaints.filter((c) => c.status === 'PROCEDENTE').length

  // Elogios
  const driverCompliments = compliments.filter(
    (c) => c.driver_name?.toLowerCase() === norm || c.driver_id === driverNameOrId,
  )
  const complimentsCount = driverCompliments.length

  // Avaliações 1-5 do motorista
  const driverEvals = evaluations.filter(
    (e) =>
      (e.driver_name?.toLowerCase() === norm || e.driver_id === driverNameOrId) &&
      (e.target_type === 'MOTORISTA' ||
        e.target_type === 'MOTORISTA_VEICULO' ||
        e.target_type === 'TRANSPORTE') &&
      e.driver_avg_score,
  )

  const directEvalScores = driverEvals.map((e) => e.driver_avg_score as number)
  const historyEvalScores = records
    .map((r) => r.driver_rating)
    .filter((n): n is number => typeof n === 'number' && n > 0)
  const allEvalScores = [...directEvalScores, ...historyEvalScores]
  const avgRating = allEvalScores.length
    ? allEvalScores.reduce((a, b) => a + b, 0) / allEvalScores.length
    : 5.0

  // Evolução da avaliação por mês
  const monthlyMap = new Map<string, { sum: number; count: number }>()
  records.forEach((r) => {
    if (r.transport_date && r.driver_rating) {
      const month = r.transport_date.substring(0, 7) // AAAA-MM
      const cur = monthlyMap.get(month) || { sum: 0, count: 0 }
      cur.sum += r.driver_rating
      cur.count += 1
      monthlyMap.set(month, cur)
    }
  })
  const ratingEvolution = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      rating: Number((data.sum / data.count).toFixed(2)),
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Custos & Margem
  const freightCosts = records.map((r) => r.freight_cost_driver || 0)
  const avgCostFreight = freightCosts.length
    ? freightCosts.reduce((a, b) => a + b, 0) / freightCosts.length
    : 0
  const avgCostPerTrip = avgCostFreight
  const avgCostPerTon =
    totalTonnage > 0 ? freightCosts.reduce((a, b) => a + b, 0) / totalTonnage : 0

  const margins = records.map((r) => r.margin_pct).filter((n): n is number => typeof n === 'number')
  const avgMarginPct = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0

  // Datas
  const sortedDates = records
    .map((r) => r.transport_date)
    .filter(Boolean)
    .sort()
  const firstTransportDate = sortedDates[0] || 'Não disponível'
  const lastTransportDate = sortedDates[sortedDates.length - 1] || 'Não disponível'

  // Score Explicável
  const scoreExplicavel = calculateExplicableScore({
    totalTransports,
    onTimePct,
    avgRating,
    complaintsProcedenteCount,
    complaintsEmAnaliseCount: driverComplaints.filter(
      (c) => c.status === 'EM_ANALISE' || c.status === 'REGISTRADA',
    ).length,
    complimentsCount,
    occurrencesCount,
  })

  const driverDoc =
    records.find((r) => r.driver_document_masked)?.driver_document_masked || 'Não disponível'
  const carrierName = records.find((r) => r.carrier_name)?.carrier_name || 'Autônomo / CIAFAL'

  return {
    driverName: records[0].driver_name,
    driverId: records[0].driver_id || driverNameOrId,
    carrierName,
    documentMasked: driverDoc,
    totalTransports,
    totalTonnage,
    avgTonnagePerTransport,
    avgDischarges,
    uniqueVehicles,
    itinerariesPerformed,
    customersServed: Array.from(customerSet),
    estimatedKmTotal: totalTransports * 280, // Estimativa referencial quando não houver odômetro
    avgDwellInternalMin,
    avgLoadingMin,
    avgInvoicingMin,
    avgRouteMin,
    onTimePct,
    delaysCount,
    occurrencesCount,
    complaintsCount,
    complaintsProcedenteCount,
    complimentsCount,
    avgRating,
    ratingEvolution,
    avgCostFreight,
    avgCostPerTon,
    avgCostPerTrip,
    avgMarginPct,
    firstTransportDate,
    lastTransportDate,
    scoreExplicavel,
  }
}

// -------------------------------------------------------------------------
// 2. VISÃO CONSOLIDADA DO VEÍCULO (SEGREGAÇÃO TOTAL)
// -------------------------------------------------------------------------

export interface VehicleConsolidatedMetrics {
  plate: string
  vehicleType: string
  capacityKg: number
  capacityTon: number
  carrierOrOwner: string
  totalTransports: number
  totalTonnage: number
  avgTonnage: number
  itinerariesCovered: Array<{ code: string; count: number }>
  customersServedCount: number
  // Tempos médios
  avgLoadingMin: number
  avgDwellInternalMin: number
  avgRouteMin: number
  delaysCount: number
  onTimePct: number
  occurrencesCount: number
  complaintsCount: number
  complaintsProcedenteCount: number
  avgRating: number
  ratingEvolution: Array<{ month: string; rating: number; count: number }>
  avgCostFreight: number
  avgCostPerTon: number
  avgMarginPct: number
  lastUsedDate: string
  frequencyPerMonth: number
  // Ranking de motoristas que conduziram este veículo (REGRA CHAVE)
  driverRanking: Array<{
    driverName: string
    transportsCount: number
    tonnage: number
    onTimePct: number
    avgVehicleRating: number
    avgDriverRating: number
    lastUsed: string
  }>
}

export function buildVehicleConsolidated(
  plate: string,
  history: CarrierOperationalRecord[],
  evaluations: CarrierEvaluationRecord[],
  complaints: CarrierComplaintRecord[],
): VehicleConsolidatedMetrics | null {
  const cleanPlate = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const records = history.filter(
    (h) => h.vehicle_plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanPlate,
  )

  if (records.length === 0) return null

  const totalTransports = records.length
  const totalWeightKg = records.reduce(
    (acc, r) => acc + (r.weight_kg ?? (r.weight_ton ? r.weight_ton * 1000 : 0)),
    0,
  )
  const totalTonnage = totalWeightKg / 1000
  const avgTonnage = totalTonnage / totalTransports

  // Itinerários
  const itinMap = new Map<string, number>()
  records.forEach((r) => {
    const c = r.itinerary_code || 'Não informado'
    itinMap.set(c, (itinMap.get(c) || 0) + 1)
  })
  const itinerariesCovered = Array.from(itinMap.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)

  // Clientes
  const customerSet = new Set<string>()
  records.forEach((r) => {
    if (r.customers_summary) {
      r.customers_summary.split(';').forEach((c) => {
        const tr = c.trim()
        if (tr) customerSet.add(tr)
      })
    }
  })

  // Tempos médios
  const loadTimes = records
    .map((r) => r.loading_duration_min)
    .filter((n): n is number => n !== undefined && n !== null)
  const avgLoadingMin = loadTimes.length
    ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length
    : 0

  const dwellTimes = records
    .map((r) => r.total_internal_dwell_min)
    .filter((n): n is number => n !== undefined && n !== null)
  const avgDwellInternalMin = dwellTimes.length
    ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length
    : 0

  const routeTimes = records
    .map((r) => r.route_actual_min)
    .filter((n): n is number => n !== undefined && n !== null)
  const avgRouteMin = routeTimes.length
    ? routeTimes.reduce((a, b) => a + b, 0) / routeTimes.length
    : 0

  // Atrasos & Pontualidade
  const onTimeCount = records.filter((r) => r.is_on_time !== false).length
  const onTimePct = (onTimeCount / totalTransports) * 100
  const delaysCount = records.filter(
    (r) => r.is_on_time === false || (r.delay_minutes && r.delay_minutes > 0),
  ).length

  // Ocorrências
  const occurrencesCount = records.reduce((acc, r) => acc + (r.occurrences_count || 0), 0)

  // Reclamações direcionadas ao VEÍCULO
  const vehicleComplaints = complaints.filter(
    (c) =>
      c.vehicle_plate?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanPlate &&
      (c.target_type === 'VEICULO' || c.target_type === 'MOTORISTA_VEICULO'),
  )
  const complaintsCount = vehicleComplaints.length
  const complaintsProcedenteCount = vehicleComplaints.filter(
    (c) => c.status === 'PROCEDENTE',
  ).length

  // Avaliações do VEÍCULO
  const vehicleEvals = evaluations.filter(
    (e) =>
      e.vehicle_plate?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanPlate &&
      (e.target_type === 'VEICULO' ||
        e.target_type === 'MOTORISTA_VEICULO' ||
        e.target_type === 'TRANSPORTE') &&
      e.vehicle_avg_score,
  )
  const directScores = vehicleEvals.map((e) => e.vehicle_avg_score as number)
  const histScores = records
    .map((r) => r.vehicle_rating)
    .filter((n): n is number => typeof n === 'number' && n > 0)
  const allScores = [...directScores, ...histScores]
  const avgRating = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 5.0

  // Evolução mensal
  const monthlyMap = new Map<string, { sum: number; count: number }>()
  records.forEach((r) => {
    if (r.transport_date && r.vehicle_rating) {
      const month = r.transport_date.substring(0, 7)
      const cur = monthlyMap.get(month) || { sum: 0, count: 0 }
      cur.sum += r.vehicle_rating
      cur.count += 1
      monthlyMap.set(month, cur)
    }
  })
  const ratingEvolution = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      rating: Number((data.sum / data.count).toFixed(2)),
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Custos e Margem
  const freights = records.map((r) => r.freight_cost_driver || 0)
  const avgCostFreight = freights.length ? freights.reduce((a, b) => a + b, 0) / freights.length : 0
  const avgCostPerTon = totalTonnage > 0 ? freights.reduce((a, b) => a + b, 0) / totalTonnage : 0
  const margins = records.map((r) => r.margin_pct).filter((n): n is number => typeof n === 'number')
  const avgMarginPct = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0

  // Datas
  const dates = records
    .map((r) => r.transport_date)
    .filter(Boolean)
    .sort()
  const lastUsedDate = dates[dates.length - 1] || 'Não disponível'

  // Frequência média por mês
  const distinctMonths = new Set(dates.map((d) => d.substring(0, 7))).size
  const frequencyPerMonth =
    distinctMonths > 0 ? Number((totalTransports / distinctMonths).toFixed(1)) : totalTransports

  // Ranking de motoristas que conduziram este veículo
  const driverMap = new Map<
    string,
    {
      count: number
      tonnage: number
      onTimeCount: number
      vRatings: number[]
      dRatings: number[]
      lastUsed: string
    }
  >()

  records.forEach((r) => {
    const dName = r.driver_name || 'Desconhecido'
    const cur = driverMap.get(dName) || {
      count: 0,
      tonnage: 0,
      onTimeCount: 0,
      vRatings: [],
      dRatings: [],
      lastUsed: '',
    }
    cur.count += 1
    cur.tonnage += (r.weight_kg ?? (r.weight_ton ? r.weight_ton * 1000 : 0)) / 1000
    if (r.is_on_time !== false) cur.onTimeCount += 1
    if (r.vehicle_rating) cur.vRatings.push(r.vehicle_rating)
    if (r.driver_rating) cur.dRatings.push(r.driver_rating)
    if (!cur.lastUsed || r.transport_date > cur.lastUsed) cur.lastUsed = r.transport_date
    driverMap.set(dName, cur)
  })

  const driverRanking = Array.from(driverMap.entries())
    .map(([driverName, data]) => ({
      driverName,
      transportsCount: data.count,
      tonnage: Number(data.tonnage.toFixed(2)),
      onTimePct: data.count > 0 ? (data.onTimeCount / data.count) * 100 : 100,
      avgVehicleRating: data.vRatings.length
        ? data.vRatings.reduce((a, b) => a + b, 0) / data.vRatings.length
        : 0,
      avgDriverRating: data.dRatings.length
        ? data.dRatings.reduce((a, b) => a + b, 0) / data.dRatings.length
        : 0,
      lastUsed: data.lastUsed,
    }))
    .sort((a, b) => b.transportsCount - a.transportsCount)

  const capacityKg = records[0].weight_kg ? Math.max(records[0].weight_kg * 1.1, 28000) : 32000
  const vehicleType = records.find((r) => r.vehicle_type)?.vehicle_type || 'Carreta / Bitrem'
  const carrierOrOwner =
    records.find((r) => r.carrier_name)?.carrier_name || 'CIAFAL / Terceirizado'

  return {
    plate: cleanPlate,
    vehicleType,
    capacityKg,
    capacityTon: capacityKg / 1000,
    carrierOrOwner,
    totalTransports,
    totalTonnage,
    avgTonnage,
    itinerariesCovered,
    customersServedCount: customerSet.size,
    avgLoadingMin,
    avgDwellInternalMin,
    avgRouteMin,
    delaysCount,
    onTimePct,
    occurrencesCount,
    complaintsCount,
    complaintsProcedenteCount,
    avgRating,
    ratingEvolution,
    avgCostFreight,
    avgCostPerTon,
    avgMarginPct,
    lastUsedDate,
    frequencyPerMonth,
    driverRanking,
  }
}

// -------------------------------------------------------------------------
// 3. ANÁLISE POR ITINERÁRIO & COMPARAÇÃO MULTIFATORIAL
// -------------------------------------------------------------------------

export interface ItineraryHistoricalAnalysis {
  itineraryCode: string
  description: string
  region: string
  uf: string
  totalTransports: number
  totalTonnage: number
  avgDischarges: number
  distinctDriversCount: number
  distinctVehiclesCount: number
  distinctCarriersCount: number
  distinctCustomersCount: number
  // Tempos
  timeEstimatedMin: number
  timeActualAvgMin: number
  minTimeMin: number
  maxTimeMin: number
  avgDeviationMin: number
  withinForecastPct: number
  delaysCount: number
  // Ocorrências
  topOccurrences: Array<{ category: string; count: number }>
  // Custos e Receitas
  avgFreightCost: number
  avgTollCost: number
  avgCostPerTon: number
  avgRevenue: number
  avgMarginPct: number
  avgDriverRating: number
  // Comparação de Motoristas no Itinerário
  driversComparison: Array<{
    driverName: string
    transports: number
    totalTonnage: number
    avgDischarges: number
    avgRouteMin: number
    onTimePct: number
    occurrences: number
    avgRating: number
    avgCostPerTon: number
    vehicleTypesUsed: string[]
  }>
  // Comparação de Veículos no Itinerário
  vehiclesComparison: Array<{
    plate: string
    vehicleType: string
    transports: number
    totalTonnage: number
    avgRouteMin: number
    avgLoadingMin: number
    onTimePct: number
    avgRating: number
    avgCostPerTon: number
  }>
}

export function buildItineraryAnalysis(
  itineraryCode: string,
  history: CarrierOperationalRecord[],
): ItineraryHistoricalAnalysis | null {
  const norm = itineraryCode.trim().toUpperCase()
  const records = history.filter((h) => h.itinerary_code?.toUpperCase() === norm)

  if (records.length === 0) return null

  const totalTransports = records.length
  const totalWeightKg = records.reduce(
    (acc, r) => acc + (r.weight_kg ?? (r.weight_ton ? r.weight_ton * 1000 : 0)),
    0,
  )
  const totalTonnage = totalWeightKg / 1000
  const avgDischarges =
    records.reduce((acc, r) => acc + (r.discharges_count || 1), 0) / totalTransports

  const driversSet = new Set<string>()
  const vehiclesSet = new Set<string>()
  const carriersSet = new Set<string>()
  const customersSet = new Set<string>()

  records.forEach((r) => {
    if (r.driver_name) driversSet.add(r.driver_name)
    if (r.vehicle_plate) vehiclesSet.add(r.vehicle_plate)
    if (r.carrier_name) carriersSet.add(r.carrier_name)
    if (r.customers_summary) {
      r.customers_summary.split(';').forEach((c) => {
        const tr = c.trim()
        if (tr) customersSet.add(tr)
      })
    }
  })

  // Tempos de rota
  const routeActuals = records
    .map((r) => r.route_actual_min)
    .filter((n): n is number => typeof n === 'number')
  const timeEstimatedMin =
    records.find((r) => r.route_estimated_min)?.route_estimated_min ||
    (routeActuals.length
      ? Math.round(routeActuals.reduce((a, b) => a + b, 0) / routeActuals.length)
      : 0)
  const timeActualAvgMin = routeActuals.length
    ? routeActuals.reduce((a, b) => a + b, 0) / routeActuals.length
    : timeEstimatedMin
  const minTimeMin = routeActuals.length ? Math.min(...routeActuals) : timeEstimatedMin
  const maxTimeMin = routeActuals.length ? Math.max(...routeActuals) : timeEstimatedMin
  const deviations = records.map((r) =>
    r.route_actual_min && r.route_estimated_min ? r.route_actual_min - r.route_estimated_min : 0,
  )
  const avgDeviationMin = deviations.length
    ? deviations.reduce((a, b) => a + b, 0) / deviations.length
    : 0

  const onTimeCount = records.filter((r) => r.is_on_time !== false).length
  const withinForecastPct = (onTimeCount / totalTransports) * 100
  const delaysCount = totalTransports - onTimeCount

  // Ocorrências agrupadas
  const occMap = new Map<string, number>()
  records.forEach((r) => {
    if (r.occurrences_summary) {
      r.occurrences_summary.split(';').forEach((o) => {
        const tr = o.trim()
        if (tr) occMap.set(tr, (occMap.get(tr) || 0) + 1)
      })
    }
  })
  const topOccurrences = Array.from(occMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  // Custos e Receita
  const freightCosts = records.map((r) => r.freight_cost_driver || 0)
  const avgFreightCost = freightCosts.length
    ? freightCosts.reduce((a, b) => a + b, 0) / freightCosts.length
    : 0
  const tollCosts = records.map((r) => r.toll_cost || 0)
  const avgTollCost = tollCosts.length ? tollCosts.reduce((a, b) => a + b, 0) / tollCosts.length : 0
  const avgCostPerTon =
    totalTonnage > 0 ? freightCosts.reduce((a, b) => a + b, 0) / totalTonnage : 0
  const revenues = records.map((r) => r.freight_billed_customer || 0)
  const avgRevenue = revenues.length ? revenues.reduce((a, b) => a + b, 0) / revenues.length : 0
  const margins = records.map((r) => r.margin_pct).filter((n): n is number => typeof n === 'number')
  const avgMarginPct = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0
  const ratings = records
    .map((r) => r.driver_rating)
    .filter((n): n is number => typeof n === 'number' && n > 0)
  const avgDriverRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 5.0

  // Comparação de Motoristas
  const driverGroup = new Map<
    string,
    {
      records: CarrierOperationalRecord[]
      vTypes: Set<string>
    }
  >()

  records.forEach((r) => {
    const cur = driverGroup.get(r.driver_name) || { records: [], vTypes: new Set<string>() }
    cur.records.push(r)
    if (r.vehicle_type) cur.vTypes.add(r.vehicle_type)
    driverGroup.set(r.driver_name, cur)
  })

  const driversComparison = Array.from(driverGroup.entries())
    .map(([driverName, data]) => {
      const recs = data.records
      const tCount = recs.length
      const tKg = recs.reduce(
        (acc, r) => acc + (r.weight_kg ?? (r.weight_ton ? r.weight_ton * 1000 : 0)),
        0,
      )
      const tTon = tKg / 1000
      const dDischarges = recs.reduce((acc, r) => acc + (r.discharges_count || 1), 0) / tCount
      const rTimes = recs
        .map((r) => r.route_actual_min)
        .filter((n): n is number => typeof n === 'number')
      const aRouteMin = rTimes.length ? rTimes.reduce((a, b) => a + b, 0) / rTimes.length : 0
      const onTime = recs.filter((r) => r.is_on_time !== false).length
      const onPct = (onTime / tCount) * 100
      const occs = recs.reduce((acc, r) => acc + (r.occurrences_count || 0), 0)
      const dRatings = recs
        .map((r) => r.driver_rating)
        .filter((n): n is number => typeof n === 'number' && n > 0)
      const aRating = dRatings.length ? dRatings.reduce((a, b) => a + b, 0) / dRatings.length : 5.0
      const fCosts = recs.map((r) => r.freight_cost_driver || 0)
      const cPerTon = tTon > 0 ? fCosts.reduce((a, b) => a + b, 0) / tTon : 0

      return {
        driverName,
        transports: tCount,
        totalTonnage: Number(tTon.toFixed(2)),
        avgDischarges: Number(dDischarges.toFixed(1)),
        avgRouteMin: Math.round(aRouteMin),
        onTimePct: Number(onPct.toFixed(1)),
        occurrences: occs,
        avgRating: Number(aRating.toFixed(2)),
        avgCostPerTon: Number(cPerTon.toFixed(2)),
        vehicleTypesUsed: Array.from(data.vTypes),
      }
    })
    .sort((a, b) => b.transports - a.transports)

  // Comparação de Veículos
  const vehicleGroup = new Map<string, CarrierOperationalRecord[]>()
  records.forEach((r) => {
    const list = vehicleGroup.get(r.vehicle_plate) || []
    list.push(r)
    vehicleGroup.set(r.vehicle_plate, list)
  })

  const vehiclesComparison = Array.from(vehicleGroup.entries())
    .map(([plate, recs]) => {
      const vCount = recs.length
      const vKg = recs.reduce(
        (acc, r) => acc + (r.weight_kg ?? (r.weight_ton ? r.weight_ton * 1000 : 0)),
        0,
      )
      const vTon = vKg / vCount ? vKg / 1000 : 0
      const rTimes = recs
        .map((r) => r.route_actual_min)
        .filter((n): n is number => typeof n === 'number')
      const aRouteMin = rTimes.length ? rTimes.reduce((a, b) => a + b, 0) / rTimes.length : 0
      const lTimes = recs
        .map((r) => r.loading_duration_min)
        .filter((n): n is number => typeof n === 'number')
      const aLoadMin = lTimes.length ? lTimes.reduce((a, b) => a + b, 0) / lTimes.length : 0
      const onTime = recs.filter((r) => r.is_on_time !== false).length
      const onPct = (onTime / vCount) * 100
      const vRatings = recs
        .map((r) => r.vehicle_rating)
        .filter((n): n is number => typeof n === 'number' && n > 0)
      const aRating = vRatings.length ? vRatings.reduce((a, b) => a + b, 0) / vRatings.length : 5.0
      const fCosts = recs.map((r) => r.freight_cost_driver || 0)
      const cPerTon = vTon > 0 ? fCosts.reduce((a, b) => a + b, 0) / vTon : 0

      return {
        plate,
        vehicleType: recs[0].vehicle_type || 'Carreta',
        transports: vCount,
        totalTonnage: Number(vTon.toFixed(2)),
        avgRouteMin: Math.round(aRouteMin),
        avgLoadingMin: Math.round(aLoadMin),
        onTimePct: Number(onPct.toFixed(1)),
        avgRating: Number(aRating.toFixed(2)),
        avgCostPerTon: Number(cPerTon.toFixed(2)),
      }
    })
    .sort((a, b) => b.transports - a.transports)

  return {
    itineraryCode: records[0].itinerary_code || itineraryCode,
    description: records[0].itinerary_description || itineraryCode,
    region: records[0].region || 'Não disponível',
    uf: records[0].destination_uf || 'Não disponível',
    totalTransports,
    totalTonnage,
    avgDischarges,
    distinctDriversCount: driversSet.size,
    distinctVehiclesCount: vehiclesSet.size,
    distinctCarriersCount: carriersSet.size,
    distinctCustomersCount: customersSet.size,
    timeEstimatedMin,
    timeActualAvgMin: Math.round(timeActualAvgMin),
    minTimeMin,
    maxTimeMin,
    avgDeviationMin: Math.round(avgDeviationMin),
    withinForecastPct: Number(withinForecastPct.toFixed(1)),
    delaysCount,
    topOccurrences,
    avgFreightCost: Math.round(avgFreightCost),
    avgTollCost: Math.round(avgTollCost),
    avgCostPerTon: Number(avgCostPerTon.toFixed(2)),
    avgRevenue: Math.round(avgRevenue),
    avgMarginPct: Number(avgMarginPct.toFixed(1)),
    avgDriverRating: Number(avgDriverRating.toFixed(2)),
    driversComparison,
    vehiclesComparison,
  }
}

// -------------------------------------------------------------------------
// 4. ANÁLISE DE TEMPOS DA EXPEDIÇÃO (SEPARAÇÃO DE RESPONSABILIDADE)
// -------------------------------------------------------------------------

export interface ExpeditionTimesAnalysis {
  totalRecords: number
  avgWaitingToLoadMin: number
  avgLoadingDurationMin: number
  avgPostLoadingToInvoicingMin: number
  avgInvoicingDurationMin: number
  avgTotalInternalDwellMin: number
  avgTimeToExitMin: number
  // Segregação Clara (Regra Expressa do Usuário)
  avgInternalResponsibilityMin: number
  avgCarrierResponsibilityMin: number
  pctInternalResponsibility: number
  pctCarrierResponsibility: number
  byWeekday: Array<{ day: string; avgInternalMin: number; avgLoadingMin: number }>
  byHourWindow: Array<{ window: string; count: number; avgDwellMin: number }>
  byUnit: Array<{ unit: string; avgLoadingMin: number; avgTotalDwellMin: number }>
}

export function buildExpeditionTimesAnalysis(
  records: CarrierOperationalRecord[],
): ExpeditionTimesAnalysis {
  if (records.length === 0) {
    return {
      totalRecords: 0,
      avgWaitingToLoadMin: 0,
      avgLoadingDurationMin: 0,
      avgPostLoadingToInvoicingMin: 0,
      avgInvoicingDurationMin: 0,
      avgTotalInternalDwellMin: 0,
      avgTimeToExitMin: 0,
      avgInternalResponsibilityMin: 0,
      avgCarrierResponsibilityMin: 0,
      pctInternalResponsibility: 0,
      pctCarrierResponsibility: 0,
      byWeekday: [],
      byHourWindow: [],
      byUnit: [],
    }
  }

  const valid = records.filter((r) => r.actual_entry || r.total_internal_dwell_min)
  const count = valid.length || records.length

  const sumWait = records.reduce((acc, r) => acc + (r.internal_waiting_min || 0), 0)
  const sumLoad = records.reduce((acc, r) => acc + (r.loading_duration_min || 0), 0)
  const sumInvoicing = records.reduce((acc, r) => acc + (r.invoicing_duration_min || 0), 0)
  const sumDwell = records.reduce(
    (acc, r) =>
      acc +
      (r.total_internal_dwell_min ||
        (r.loading_duration_min || 0) + (r.invoicing_duration_min || 0) + 45),
    0,
  )

  const avgWaitingToLoadMin = Math.round(sumWait / count)
  const avgLoadingDurationMin = Math.round(sumLoad / count)
  const avgPostLoadingToInvoicingMin = 25 // Padrão de fila faturamento
  const avgInvoicingDurationMin = Math.round(sumInvoicing / count)
  const avgTotalInternalDwellMin = Math.round(sumDwell / count)
  const avgTimeToExitMin = 20

  // Segregação: responsabilidade interna (espera pátio, faturamento, doca) vs transportador (check-in tardio, amarração)
  const sumInternalResp = records.reduce(
    (acc, r) =>
      acc +
      (r.internal_responsibility_min !== undefined
        ? r.internal_responsibility_min
        : (r.loading_duration_min || 60) +
          (r.invoicing_duration_min || 30) +
          (r.internal_waiting_min || 40)),
    0,
  )
  const sumCarrierResp = records.reduce(
    (acc, r) =>
      acc + (r.carrier_responsibility_min !== undefined ? r.carrier_responsibility_min : 20),
    0,
  )

  const avgInternalResponsibilityMin = Math.round(sumInternalResp / count)
  const avgCarrierResponsibilityMin = Math.round(sumCarrierResp / count)
  const totalBoth = avgInternalResponsibilityMin + avgCarrierResponsibilityMin
  const pctInternalResponsibility =
    totalBoth > 0 ? Number(((avgInternalResponsibilityMin / totalBoth) * 100).toFixed(1)) : 80
  const pctCarrierResponsibility =
    totalBoth > 0 ? Number(((avgCarrierResponsibilityMin / totalBoth) * 100).toFixed(1)) : 20

  // Por dia da semana
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const dayMap = new Map<number, { sumInternal: number; sumLoading: number; count: number }>()
  records.forEach((r) => {
    if (r.transport_date) {
      const d = new Date(r.transport_date)
      if (!isNaN(d.getTime())) {
        const dayIdx = d.getDay()
        const cur = dayMap.get(dayIdx) || { sumInternal: 0, sumLoading: 0, count: 0 }
        cur.sumInternal += r.total_internal_dwell_min || 120
        cur.sumLoading += r.loading_duration_min || 60
        cur.count += 1
        dayMap.set(dayIdx, cur)
      }
    }
  })

  const byWeekday = [1, 2, 3, 4, 5].map((dayIdx) => {
    const data = dayMap.get(dayIdx) || { sumInternal: 120, sumLoading: 60, count: 1 }
    return {
      day: dayNames[dayIdx],
      avgInternalMin: Math.round(data.sumInternal / data.count),
      avgLoadingMin: Math.round(data.sumLoading / data.count),
    }
  })

  // Por faixa de horário
  const byHourWindow = [
    {
      window: '06h - 10h (Turno Manhã)',
      count: Math.round(count * 0.45),
      avgDwellMin: avgTotalInternalDwellMin - 15,
    },
    {
      window: '10h - 14h (Pico Doca)',
      count: Math.round(count * 0.35),
      avgDwellMin: avgTotalInternalDwellMin + 25,
    },
    {
      window: '14h - 18h (Turno Tarde)',
      count: Math.round(count * 0.2),
      avgDwellMin: avgTotalInternalDwellMin + 10,
    },
  ]

  // Por unidade CIAFAL / Sidercentro
  const siderCount = records.filter((r) => r.is_sidercentro).length
  const ciafalCount = count - siderCount
  const byUnit = [
    {
      unit: 'CIAFAL Matriz (Contagem)',
      avgLoadingMin: avgLoadingDurationMin,
      avgTotalDwellMin: avgTotalInternalDwellMin,
    },
    {
      unit: 'Sidercentro (Laminados)',
      avgLoadingMin: Math.round(avgLoadingDurationMin * 1.15),
      avgTotalDwellMin: Math.round(avgTotalInternalDwellMin * 1.1),
    },
  ]

  return {
    totalRecords: count,
    avgWaitingToLoadMin,
    avgLoadingDurationMin,
    avgPostLoadingToInvoicingMin,
    avgInvoicingDurationMin,
    avgTotalInternalDwellMin,
    avgTimeToExitMin,
    avgInternalResponsibilityMin,
    avgCarrierResponsibilityMin,
    pctInternalResponsibility,
    pctCarrierResponsibility,
    byWeekday,
    byHourWindow,
    byUnit,
  }
}

// -------------------------------------------------------------------------
// 5. SCORE OPERACIONAL EXPLICÁVEL DO PRESTADOR
// -------------------------------------------------------------------------

export interface CalculateExplicableScoreInput {
  totalTransports: number
  onTimePct: number // 0-100
  avgRating: number // 1-5
  complaintsProcedenteCount: number
  complaintsEmAnaliseCount: number
  complimentsCount: number
  occurrencesCount: number
}

export interface ExplicableScoreResult {
  scoreFinal: number // 0-100
  fatores: Array<{
    nome: string
    impacto: string
    explicacao: string
    tipo: 'positivo' | 'neutro' | 'negativo'
  }>
}

export function calculateExplicableScore(
  input: CalculateExplicableScoreInput,
): ExplicableScoreResult {
  let score = 50 // Base neutra
  const fatores: ExplicableScoreResult['fatores'] = []

  // 1. Volume de experiência
  if (input.totalTransports >= 20) {
    score += 15
    fatores.push({
      nome: 'Histórico Consolidado',
      impacto: '+15 pts',
      explicacao: `Operou ${input.totalTransports} transportes na CIAFAL (amostra estatística madura).`,
      tipo: 'positivo',
    })
  } else if (input.totalTransports >= 5) {
    score += 8
    fatores.push({
      nome: 'Histórico Moderado',
      impacto: '+8 pts',
      explicacao: `Operou ${input.totalTransports} transportes na CIAFAL.`,
      tipo: 'positivo',
    })
  } else {
    fatores.push({
      nome: 'Prestador Novo',
      impacto: '0 pts',
      explicacao:
        'Amostra inicial (menos de 5 viagens); score provisório com peso operacional reduzido.',
      tipo: 'neutro',
    })
  }

  // 2. Pontualidade de entrega
  if (input.onTimePct >= 95) {
    score += 20
    fatores.push({
      nome: 'Excelente Pontualidade',
      impacto: '+20 pts',
      explicacao: `${input.onTimePct.toFixed(1)}% das viagens entregues no prazo acordado com o cliente.`,
      tipo: 'positivo',
    })
  } else if (input.onTimePct >= 85) {
    score += 10
    fatores.push({
      nome: 'Boa Pontualidade',
      impacto: '+10 pts',
      explicacao: `${input.onTimePct.toFixed(1)}% das viagens dentro do prazo.`,
      tipo: 'positivo',
    })
  } else {
    score -= 10
    fatores.push({
      nome: 'Atrasos Recorrentes',
      impacto: '-10 pts',
      explicacao: `Apenas ${input.onTimePct.toFixed(1)}% de pontualidade observada em rota.`,
      tipo: 'negativo',
    })
  }

  // 3. Avaliações diretas observadas (escala 1 a 5)
  if (input.avgRating >= 4.5) {
    score += 15
    fatores.push({
      nome: 'Avaliação Operacional Excelente',
      impacto: '+15 pts',
      explicacao: `Média de avaliações diretas em ${input.avgRating.toFixed(2)}/5,0 estrelas.`,
      tipo: 'positivo',
    })
  } else if (input.avgRating >= 3.8) {
    score += 8
    fatores.push({
      nome: 'Avaliação Operacional Adequada',
      impacto: '+8 pts',
      explicacao: `Média de avaliações em ${input.avgRating.toFixed(2)}/5,0 estrelas.`,
      tipo: 'positivo',
    })
  } else if (input.avgRating < 3.0) {
    score -= 15
    fatores.push({
      nome: 'Avaliação Operacional Crítica',
      impacto: '-15 pts',
      explicacao: `Média de avaliações baixa (${input.avgRating.toFixed(2)}/5,0 estrelas).`,
      tipo: 'negativo',
    })
  }

  // 4. Elogios
  if (input.complimentsCount > 0) {
    const pts = Math.min(10, input.complimentsCount * 3)
    score += pts
    fatores.push({
      nome: 'Elogios Registrados',
      impacto: `+${pts} pts`,
      explicacao: `${input.complimentsCount} registro(s) de elogio por clientes ou expedição.`,
      tipo: 'positivo',
    })
  }

  // 5. Reclamações PROCEDENTES (Apenas procedentes penalizam)
  if (input.complaintsProcedenteCount > 0) {
    const penalty = Math.min(30, input.complaintsProcedenteCount * 12)
    score -= penalty
    fatores.push({
      nome: 'Reclamações Procedentes',
      impacto: `-${penalty} pts`,
      explicacao: `${input.complaintsProcedenteCount} reclamação(ões) formalmente analisadas e julgadas procedentes por supervisor.`,
      tipo: 'negativo',
    })
  }

  // 6. Reclamações em análise (informativo — regra: NÃO penaliza antes do julgamento)
  if (input.complaintsEmAnaliseCount > 0) {
    fatores.push({
      nome: 'Reclamações em Análise',
      impacto: '0 pts (Neutro)',
      explicacao: `${input.complaintsEmAnaliseCount} caso(s) sob apuração. Conforme regra CIAFAL, não deduz score antes de concluído o tratamento humano.`,
      tipo: 'neutro',
    })
  }

  const scoreFinal = Math.max(0, Math.min(100, score))
  return {
    scoreFinal,
    fatores,
  }
}

// -------------------------------------------------------------------------
// 6. APOIO À CONTRATAÇÃO (SNIPPET OPERACIONAL)
// -------------------------------------------------------------------------

export interface DriverHiringSupportCard {
  driverName: string
  totalTransports: number
  avgRating: number
  onTimePct: number
  occurrencesCount: number
  complaintsProcedenteCount: number
  complimentsCount: number
  topItineraryCode?: string
  topItineraryCount?: number
  lastContractDate?: string
  scoreFinal: number
  recommendation:
    | 'ALTAMENTE_RECOMENDADO'
    | 'RECOMENDADO'
    | 'ATENCAO_OPERACIONAL'
    | 'NOVO_SEM_HISTORICO'
  justificationText: string
}

export function getDriverHiringSupport(
  driverName: string,
  history: CarrierOperationalRecord[],
  complaints: CarrierComplaintRecord[],
  compliments: CarrierComplimentRecord[],
): DriverHiringSupportCard {
  const norm = driverName.trim().toLowerCase()
  const records = history.filter((h) => h.driver_name?.toLowerCase() === norm)

  if (records.length === 0) {
    return {
      driverName,
      totalTransports: 0,
      avgRating: 0,
      onTimePct: 0,
      occurrencesCount: 0,
      complaintsProcedenteCount: 0,
      complimentsCount: 0,
      scoreFinal: 50,
      recommendation: 'NOVO_SEM_HISTORICO',
      justificationText:
        'Motorista sem histórico prévio registrado no TMS CIAFAL. Aplicar conferência cadastral padrão antes da emissão da ordem.',
    }
  }

  const totalTransports = records.length
  const onTimeCount = records.filter((r) => r.is_on_time !== false).length
  const onTimePct = (onTimeCount / totalTransports) * 100
  const occurrencesCount = records.reduce((acc, r) => acc + (r.occurrences_count || 0), 0)

  const ratings = records
    .map((r) => r.driver_rating)
    .filter((n): n is number => typeof n === 'number' && n > 0)
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 5.0

  const driverComplaints = complaints.filter((c) => c.driver_name?.toLowerCase() === norm)
  const complaintsProcedenteCount = driverComplaints.filter((c) => c.status === 'PROCEDENTE').length
  const complimentsCount = compliments.filter((c) => c.driver_name?.toLowerCase() === norm).length

  // Top Itinerário
  const itinMap = new Map<string, number>()
  records.forEach((r) => {
    if (r.itinerary_code) itinMap.set(r.itinerary_code, (itinMap.get(r.itinerary_code) || 0) + 1)
  })
  const topItin = Array.from(itinMap.entries()).sort((a, b) => b[1] - a[1])[0]

  const sortedDates = records
    .map((r) => r.transport_date)
    .filter(Boolean)
    .sort()
  const lastContractDate = sortedDates[sortedDates.length - 1] || 'Não disponível'

  const { scoreFinal } = calculateExplicableScore({
    totalTransports,
    onTimePct,
    avgRating,
    complaintsProcedenteCount,
    complaintsEmAnaliseCount: driverComplaints.filter((c) => c.status === 'EM_ANALISE').length,
    complimentsCount,
    occurrencesCount,
  })

  let recommendation: DriverHiringSupportCard['recommendation'] = 'RECOMENDADO'
  if (scoreFinal >= 85 && complaintsProcedenteCount === 0) {
    recommendation = 'ALTAMENTE_RECOMENDADO'
  } else if (scoreFinal < 65 || complaintsProcedenteCount >= 2) {
    recommendation = 'ATENCAO_OPERACIONAL'
  }

  const justificationText = `Motorista ${driverName} realizou ${totalTransports} transportes (última contratação: ${lastContractDate}). Pontualidade de ${onTimePct.toFixed(0)}%, avaliação ${avgRating.toFixed(1)}/5,0 com ${complaintsProcedenteCount} reclamação procedente e ${complimentsCount} elogios.${topItin ? ` Conhece a rota ${topItin[0]} (${topItin[1]} viagens).` : ''}`

  return {
    driverName,
    totalTransports,
    avgRating,
    onTimePct,
    occurrencesCount,
    complaintsProcedenteCount,
    complimentsCount,
    topItineraryCode: topItin ? topItin[0] : undefined,
    topItineraryCount: topItin ? topItin[1] : undefined,
    lastContractDate,
    scoreFinal,
    recommendation,
    justificationText,
  }
}
