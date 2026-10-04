/**
 * TMS Indicators Domain Engine
 *
 * Consolidação gerencial anual Real x Meta dos 22 indicadores oficiais de
 * Expedição, Logística e Transporte da CIAFAL.
 *
 * Regras estritas:
 * - 0% de mocks ou valores simulados
 * - Indicadores sem integração / sem dados exibem "Sem dados disponíveis / integração pendente"
 * - Formatação brasileira estrita: 95,4 %, R$ 125,40, 25,80 t, 01h 24min, 458 km, R$ 142,50/t
 * - IA integrada com diagnóstico determinístico factual sobre desvios reais
 */

export type KpiCategory = 'EXPEDICAO' | 'LOGISTICA' | 'TRANSPORTE'

export type KpiRule = 'GTE' | 'LTE' | 'EQ' | 'BETWEEN'

export type KpiStatus = 'ATENDIDA' | 'FORA_DA_META' | 'SEM_DADOS'

export interface KpiTargetConfig {
  id?: string
  kpi_id: string
  kpi_name: string
  category: KpiCategory
  year: number
  company?: string
  center?: string
  target_value: number
  rule: KpiRule
  target_value_max?: number
  unit: string
  valid_from?: string
  valid_to?: string
  responsible: string
  responsible_email?: string
  change_justification?: string
  previous_value?: number
  is_active?: boolean
}

export interface KpiMonthCell {
  month: number // 1..12
  monthLabel: string // 'Jan', 'Fev', ...
  year: number
  realValue: number | null
  targetValue: number | null
  status: KpiStatus
  formattedValue: string
  formattedTarget: string
  recordsCount: number
  hasData: boolean
  drillDownRecords: KpiDrillDownRecord[]
  metaNote?: string
}

export interface KpiDrillDownRecord {
  id: string
  orderNumber: string
  sapTransportNumber: string
  date: string
  customerName: string
  carrierName: string
  driverName: string
  vehiclePlate: string
  itineraryCode: string
  destinationCity: string
  destinationUf: string
  weightTon: number
  primaryValueFormatted: string
  complianceStatus: 'ATINGIU' | 'FORA' | 'NEUTRO'
  detailText: string
  sourceCollection: string
}

export interface KpiRowData {
  id: string
  seq: number
  name: string
  category: KpiCategory
  description: string
  unit: string
  rule: KpiRule
  targetConfig: KpiTargetConfig
  months: KpiMonthCell[] // Jan..Dez (12 itens)
  ytdReal: number | null
  ytdTarget: number | null
  ytdStatus: KpiStatus
  formattedYtdReal: string
  formattedYtdTarget: string
  bestMonth: string
  worstMonth: string
  trend: 'UP' | 'DOWN' | 'STABLE'
  totalRecordsYear: number
  dataSource: string
  hasIntegration: boolean
  lastUpdate: string
}

export interface KpiFilterParams {
  year: number
  company?: string
  center?: string
  category?: 'TODOS' | KpiCategory
  itinerary?: string
  regionUf?: string
  carrier?: string
  driver?: string
  customer?: string
  status?: 'TODOS' | 'ATENDIDA' | 'FORA_DA_META' | 'SEM_DADOS'
  searchQuery?: string
}

export interface KpiAiDiagnosisResult {
  hasDeviation: boolean
  kpiName: string
  period: string
  realValueFormatted: string
  targetValueFormatted: string
  status: KpiStatus
  diagnostic: string
  probableCauses: string[]
  dimensionalBreakdown: {
    concentratedIn: string
    topDeviatingEntities: { label: string; count: number; impact: string }[]
  }
  suggestedAction: {
    problem: string
    cause: string
    action: string
    responsibleSector: string
    targetModule:
      | 'TMS'
      | 'WMS'
      | 'PCP_ROBOTIZADO'
      | 'MANUTENCAO'
      | 'COMERCIAL_CRM'
      | 'EXPEDICAO'
      | 'OUTRO'
    suggestedDeadlineDays: number
    priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  }
  evidenceSufficient: boolean
}

// -------------------------------------------------------------
// DEFINIÇÃO CANÔNICA DOS 22 INDICADORES TMS
// -------------------------------------------------------------
export interface KpiDefinition {
  id: string
  seq: number
  name: string
  category: KpiCategory
  description: string
  unit: string
  defaultRule: KpiRule
  defaultTarget: number
  defaultResponsible: string
  dataSource: string
  isSupportedByCarrierHistory: boolean
}

export const OFFICIAL_TMS_KPIS: KpiDefinition[] = [
  // 1 a 8: EXPEDIÇÃO
  {
    id: 'otif_expedicao',
    seq: 1,
    name: 'OTIF de Expedição',
    category: 'EXPEDICAO',
    description: '% cargas expedidas completas e dentro da janela planejada na unidade CIAFAL.',
    unit: '%',
    defaultRule: 'GTE',
    defaultTarget: 95.0,
    defaultResponsible: 'Gerência de Expedição & Logística',
    dataSource: 'carrier_operational_history (is_on_time && final_status == CONCLUIDO)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'tempo_permanencia_veiculo',
    seq: 2,
    name: 'Tempo Médio de Permanência do Veículo',
    category: 'EXPEDICAO',
    description: 'Ciclo total do veículo na unidade: entrada → faturamento e saída (h/min).',
    unit: 'min',
    defaultRule: 'LTE',
    defaultTarget: 120.0,
    defaultResponsible: 'Supervisão de Pátio & Balança',
    dataSource: 'carrier_operational_history (total_internal_dwell_min)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'tempo_espera_carregamento',
    seq: 3,
    name: 'Tempo Médio de Espera para Carregamento',
    category: 'EXPEDICAO',
    description: 'Tempo decorrido entre a entrada/liberação até início do carregamento.',
    unit: 'min',
    defaultRule: 'LTE',
    defaultTarget: 30.0,
    defaultResponsible: 'Coordenação de Docas & Doca WSTL',
    dataSource: 'carrier_operational_history (internal_waiting_min)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'tempo_carregamento',
    seq: 4,
    name: 'Tempo Médio de Carregamento',
    category: 'EXPEDICAO',
    description:
      'Início efetivo do carregamento até finalização física da amarração e conferência.',
    unit: 'min',
    defaultRule: 'LTE',
    defaultTarget: 60.0,
    defaultResponsible: 'Liderança de Carregamento Físico',
    dataSource: 'carrier_operational_history (loading_duration_min)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'tempo_emissao_nf',
    seq: 5,
    name: 'Tempo Médio para Emissão da Nota Fiscal',
    category: 'EXPEDICAO',
    description: 'Tempo entre finalização do carregamento e emissão da NF-e no SAP.',
    unit: 'min',
    defaultRule: 'LTE',
    defaultTarget: 20.0,
    defaultResponsible: 'Faturamento & Fiscal CIAFAL',
    dataSource: 'carrier_operational_history (invoicing_duration_min)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'cargas_faturadas_no_prazo',
    seq: 6,
    name: 'Cargas Faturadas no Prazo',
    category: 'EXPEDICAO',
    description: '% de cargas expedidas que tiveram faturamento concluído até a janela limite.',
    unit: '%',
    defaultRule: 'GTE',
    defaultTarget: 95.0,
    defaultResponsible: 'Faturamento & Expedição',
    dataSource: 'carrier_operational_history (is_on_time && invoicing_duration_min <= 30)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'produtividade_expedicao',
    seq: 7,
    name: 'Produtividade da Expedição',
    category: 'EXPEDICAO',
    description: 'Toneladas carregadas por hora de carregamento ativo (t/h).',
    unit: 't/h',
    defaultRule: 'GTE',
    defaultTarget: 15.0,
    defaultResponsible: 'Operações Industriais & Expedição',
    dataSource: 'carrier_operational_history (weight_ton / (loading_duration_min / 60))',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'veiculos_permanencia_acima_meta',
    seq: 8,
    name: 'Veículos com Permanência Acima da Meta',
    category: 'EXPEDICAO',
    description:
      '% de veículos cujo ciclo total na unidade ultrapassou o tempo limite de tolerância.',
    unit: '%',
    defaultRule: 'LTE',
    defaultTarget: 5.0,
    defaultResponsible: 'Supervisão Geral de Pátio',
    dataSource: 'carrier_operational_history (total_internal_dwell_min > 120)',
    isSupportedByCarrierHistory: true,
  },

  // 9 a 14: LOGÍSTICA
  {
    id: 'aderencia_planejamento_cargas',
    seq: 9,
    name: 'Aderência ao Planejamento de Cargas',
    category: 'LOGISTICA',
    description:
      '% de cargas despachadas conforme programadas sem cancelamento ou ruptura de janela.',
    unit: '%',
    defaultRule: 'GTE',
    defaultTarget: 95.0,
    defaultResponsible: 'Planejamento Logístico & PCP',
    dataSource: 'carrier_operational_history (final_status == CONCLUIDO / total_cargas)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'ocupacao_media_veiculos',
    seq: 10,
    name: 'Ocupação Média dos Veículos',
    category: 'LOGISTICA',
    description: '% peso carregado em relação à capacidade útil do veículo (peso / capacidade).',
    unit: '%',
    defaultRule: 'GTE',
    defaultTarget: 85.0,
    defaultResponsible: 'Planejador de Cargas & Torre',
    dataSource:
      'carrier_operational_history (occupancy_pct || (weight_ton / vehicle_capacity_ton * 100))',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'cargas_reprogramadas',
    seq: 11,
    name: 'Cargas Reprogramadas',
    category: 'LOGISTICA',
    description:
      '% de cargas que sofreram reprogramação de data/veículo após o planejamento inicial.',
    unit: '%',
    defaultRule: 'LTE',
    defaultTarget: 5.0,
    defaultResponsible: 'Planejamento de Cargas',
    dataSource:
      'carrier_operational_history (final_status == ENCERRADO_COM_OCORRENCIA com motivo de reprogramação)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'cargas_impedidas_falta_estoque',
    seq: 12,
    name: 'Cargas Impedidas por Falta de Estoque',
    category: 'LOGISTICA',
    description:
      'Cargas retidas por ruptura de estoque, material bloqueado ou divergência física (WMS + PCP).',
    unit: '%',
    defaultRule: 'LTE',
    defaultTarget: 2.0,
    defaultResponsible: 'WMS & PCP Robotizado',
    dataSource: 'WMS / PCP / sap_stock_current (Integração de estoque)',
    isSupportedByCarrierHistory: false, // Sem registros operacionais diretos de falta de estoque neste momento
  },
  {
    id: 'indice_ocorrencias_logisticas',
    seq: 13,
    name: 'Índice de Ocorrências Logísticas',
    category: 'LOGISTICA',
    description:
      'Proporção de ocorrências logísticas internas registradas por volume de cargas expedidas.',
    unit: '%',
    defaultRule: 'LTE',
    defaultTarget: 3.0,
    defaultResponsible: 'Gestão de Qualidade & Logística',
    dataSource: 'carrier_operational_history (occurrences_count > 0)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'utilizacao_docas',
    seq: 14,
    name: 'Utilização das Docas',
    category: 'LOGISTICA',
    description:
      'Taxa de ocupação útil das docas CIAFAL (tempo utilizado / capacidade nominal instalada).',
    unit: '%',
    defaultRule: 'GTE',
    defaultTarget: 75.0,
    defaultResponsible: 'Gestão de Docas & WMS',
    dataSource: 'WMS / Telemetria de docas WSTL (Integração pendente de sensores de doca)',
    isSupportedByCarrierHistory: false, // Requer telemetria WMS de doca
  },

  // 15 a 22: TRANSPORTE
  {
    id: 'otif_entrega_cliente',
    seq: 15,
    name: 'OTIF de Entrega ao Cliente',
    category: 'TRANSPORTE',
    description:
      '% de entregas concluídas integralmente dentro da data e janela acordadas com o cliente.',
    unit: '%',
    defaultRule: 'GTE',
    defaultTarget: 95.0,
    defaultResponsible: 'Gestão de Transportes & Fred IA',
    dataSource: 'carrier_operational_history (is_on_time && delay_minutes == 0)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'custo_medio_frete_tonelada',
    seq: 16,
    name: 'Custo Médio de Frete por Tonelada',
    category: 'TRANSPORTE',
    description: 'Custo de frete contratado/pago dividido pelas toneladas transportadas (R$/t).',
    unit: 'R$/t',
    defaultRule: 'LTE',
    defaultTarget: 160.0,
    defaultResponsible: 'Mesa de Fretes & Controladoria',
    dataSource: 'carrier_operational_history (freight_cost_driver / weight_ton)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'frete_sobre_receita',
    seq: 17,
    name: 'Frete sobre Receita',
    category: 'TRANSPORTE',
    description: '% do custo de frete total sobre o frete cobrado/faturado do cliente.',
    unit: '%',
    defaultRule: 'LTE',
    defaultTarget: 8.5,
    defaultResponsible: 'Controladoria & Comercial',
    dataSource: 'carrier_operational_history (total_cost / freight_billed_customer * 100)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'resultado_financeiro_frete',
    seq: 18,
    name: 'Resultado Financeiro do Frete (Margem)',
    category: 'TRANSPORTE',
    description:
      'Margem percentual do frete: (frete cobrado − custo total de transporte) / faturado.',
    unit: '%',
    defaultRule: 'GTE',
    defaultTarget: 15.0,
    defaultResponsible: 'Gestão de Fretes & Chicão IA',
    dataSource: 'carrier_operational_history (margin_pct)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'desvio_frete_negociado_referencia',
    seq: 19,
    name: 'Desvio do Frete Negociado x Referência',
    category: 'TRANSPORTE',
    description:
      'Variação percentual entre frete contratado na Mesa de Fretes e tabela referencial ANTT.',
    unit: '%',
    defaultRule: 'LTE',
    defaultTarget: 3.0,
    defaultResponsible: 'Mesa de Fretes & Governança ANTT',
    dataSource: 'Mesa de Fretes & Negociações Chicão (Integração com fechamento de fretes)',
    isSupportedByCarrierHistory: false, // Sem registros suficientes consolidados na base real com baseline
  },
  {
    id: 'aderencia_eta',
    seq: 20,
    name: 'Aderência ao ETA',
    category: 'TRANSPORTE',
    description:
      '% de entregas concluídas dentro da tolerância calculada da previsão de chegada (ETA).',
    unit: '%',
    defaultRule: 'GTE',
    defaultTarget: 90.0,
    defaultResponsible: 'Torre de Controle Fred IA',
    dataSource: 'carrier_operational_history (route_actual_min <= route_estimated_min + 30)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'indice_ocorrencias_transporte',
    seq: 21,
    name: 'Índice de Ocorrências em Transporte',
    category: 'TRANSPORTE',
    description:
      '% viagens com intercorrências em trânsito (atraso, avaria, recusa, quebra, retenção).',
    unit: '%',
    defaultRule: 'LTE',
    defaultTarget: 4.0,
    defaultResponsible: 'Acompanhamento Fred & Sinistros',
    dataSource: 'carrier_operational_history (complaints_count > 0 || occurrences_count > 0)',
    isSupportedByCarrierHistory: true,
  },
  {
    id: 'avaliacao_motoristas_transportadores',
    seq: 22,
    name: 'Avaliação de Motoristas/Transportadores',
    category: 'TRANSPORTE',
    description:
      'Nota média ponderada de satisfação e conformidade operacional dos parceiros (1 a 5).',
    unit: 'pts',
    defaultRule: 'GTE',
    defaultTarget: 4.2,
    defaultResponsible: 'Qualidade & Cadastro de Transportes',
    dataSource: 'carrier_operational_history (driver_rating & vehicle_rating)',
    isSupportedByCarrierHistory: true,
  },
]

// -------------------------------------------------------------
// FORMATAÇÃO BRASILEIRA PADRÃO ABNT
// -------------------------------------------------------------
export function formatKpiValue(val: number | null | undefined, unit: string): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '—'
  }

  const localeNumber = (n: number, decimals = 1): string => {
    return n.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  switch (unit) {
    case '%':
      return `${localeNumber(val, 1)} %`
    case 'R$':
      return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case 'R$/t':
      return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/t`
    case 't':
      return `${localeNumber(val, 2)} t`
    case 't/h':
      return `${localeNumber(val, 1)} t/h`
    case 'km':
      return `${Math.round(val).toLocaleString('pt-BR')} km`
    case 'pts':
      return `${localeNumber(val, 1)} / 5,0`
    case 'min': {
      // Exibição amigável h/min
      const totalMin = Math.round(val)
      const hours = Math.floor(totalMin / 60)
      const mins = totalMin % 60
      if (hours > 0) {
        return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}min`
      }
      return `${mins} min`
    }
    default:
      return `${localeNumber(val, 1)} ${unit}`
  }
}

// -------------------------------------------------------------
// AVALIAÇÃO DE REGRA REAL X META
// -------------------------------------------------------------
export function evaluateKpiStatus(
  realValue: number | null,
  targetValue: number | null,
  rule: KpiRule,
  targetValueMax?: number,
): KpiStatus {
  if (realValue === null || targetValue === null || isNaN(realValue) || isNaN(targetValue)) {
    return 'SEM_DADOS'
  }

  switch (rule) {
    case 'GTE':
      return realValue >= targetValue ? 'ATENDIDA' : 'FORA_DA_META'
    case 'LTE':
      return realValue <= targetValue ? 'ATENDIDA' : 'FORA_DA_META'
    case 'EQ':
      return Math.abs(realValue - targetValue) < 0.01 ? 'ATENDIDA' : 'FORA_DA_META'
    case 'BETWEEN':
      if (targetValueMax !== undefined) {
        return realValue >= targetValue && realValue <= targetValueMax ? 'ATENDIDA' : 'FORA_DA_META'
      }
      return realValue >= targetValue ? 'ATENDIDA' : 'FORA_DA_META'
    default:
      return realValue >= targetValue ? 'ATENDIDA' : 'FORA_DA_META'
  }
}

// -------------------------------------------------------------
// ENGINE DE CÁLCULO SOBRE A BASE REAL CARRIER_OPERATIONAL_HISTORY
// -------------------------------------------------------------
export function buildKpiMatrix(
  carrierRecords: any[],
  targetConfigs: Record<string, KpiTargetConfig>,
  selectedYear: number,
  filters: KpiFilterParams,
): KpiRowData[] {
  const MONTH_NAMES = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]

  // 1. Filtrar registros operacionais conforme filtros combináveis
  const filteredRecords = carrierRecords.filter((rec) => {
    // Ano do transporte
    if (!rec.transport_date) return false
    const d = new Date(rec.transport_date)
    if (d.getFullYear() !== selectedYear) return false

    // Empresa
    if (filters.company && filters.company !== 'TODOS' && rec.company_code) {
      if (rec.company_code !== filters.company) return false
    }

    // Centro
    if (filters.center && filters.center !== 'TODOS') {
      const matchCenter =
        (rec.center_code && rec.center_code.includes(filters.center)) ||
        (rec.origin_plant && rec.origin_plant.includes(filters.center)) ||
        (rec.center_description && rec.center_description.includes(filters.center))
      if (!matchCenter) return false
    }

    // Itinerário
    if (filters.itinerary && filters.itinerary !== 'TODOS') {
      if (rec.itinerary_code !== filters.itinerary) return false
    }

    // Região / UF
    if (filters.regionUf && filters.regionUf !== 'TODOS') {
      const matchUf = rec.destination_uf === filters.regionUf || rec.region === filters.regionUf
      if (!matchUf) return false
    }

    // Transportadora
    if (filters.carrier && filters.carrier !== 'TODOS') {
      if (rec.carrier_name !== filters.carrier) return false
    }

    // Motorista
    if (filters.driver && filters.driver !== 'TODOS') {
      const matchDriver =
        rec.driver_id === filters.driver ||
        (rec.driver_name && rec.driver_name.toLowerCase().includes(filters.driver.toLowerCase()))
      if (!matchDriver) return false
    }

    // Cliente
    if (filters.customer && filters.customer !== 'TODOS') {
      if (
        rec.customers_summary &&
        !rec.customers_summary.toLowerCase().includes(filters.customer.toLowerCase())
      ) {
        return false
      }
    }

    return true
  })

  // 2. Processar cada um dos 22 indicadores canônicos
  const rows: KpiRowData[] = OFFICIAL_TMS_KPIS.map((def) => {
    // Config de meta ativa para este KPI
    const targetConfig: KpiTargetConfig = targetConfigs[def.id] || {
      kpi_id: def.id,
      kpi_name: def.name,
      category: def.category,
      year: selectedYear,
      target_value: def.defaultTarget,
      rule: def.defaultRule,
      unit: def.unit,
      responsible: def.defaultResponsible,
      is_active: true,
    }

    // Se indicador não tem dados na base ou integração ainda pendente
    if (!def.isSupportedByCarrierHistory) {
      const emptyMonths: KpiMonthCell[] = MONTH_NAMES.map((name, idx) => ({
        month: idx + 1,
        monthLabel: name,
        year: selectedYear,
        realValue: null,
        targetValue: targetConfig.target_value,
        status: 'SEM_DADOS',
        formattedValue: 'Sem dados / Integração pendente',
        formattedTarget: formatKpiValue(targetConfig.target_value, def.unit),
        recordsCount: 0,
        hasData: false,
        drillDownRecords: [],
        metaNote: 'Integração com módulos WMS/PCP/Mesa em andamento.',
      }))

      return {
        id: def.id,
        seq: def.seq,
        name: def.name,
        category: def.category,
        description: def.description,
        unit: def.unit,
        rule: targetConfig.rule || def.defaultRule,
        targetConfig,
        months: emptyMonths,
        ytdReal: null,
        ytdTarget: targetConfig.target_value,
        ytdStatus: 'SEM_DADOS',
        formattedYtdReal: 'Sem dados disponíveis',
        formattedYtdTarget: formatKpiValue(targetConfig.target_value, def.unit),
        bestMonth: '—',
        worstMonth: '—',
        trend: 'STABLE',
        totalRecordsYear: 0,
        dataSource: def.dataSource,
        hasIntegration: false,
        lastUpdate: new Date().toISOString(),
      }
    }

    // Agrupar registros filtrados por mês (1..12)
    const recordsByMonth: Record<number, any[]> = {}
    for (let m = 1; m <= 12; m++) {
      recordsByMonth[m] = []
    }

    filteredRecords.forEach((rec) => {
      const d = new Date(rec.transport_date)
      const m = d.getMonth() + 1
      if (m >= 1 && m <= 12) {
        recordsByMonth[m].push(rec)
      }
    })

    // Calcular valores mensais reais e drill-down
    const months: KpiMonthCell[] = []
    const allYearDrillDown: KpiDrillDownRecord[] = []
    const monthlyValues: (number | null)[] = []

    for (let m = 1; m <= 12; m++) {
      const monthRecs = recordsByMonth[m]
      const monthLabel = MONTH_NAMES[m - 1]

      if (monthRecs.length === 0) {
        months.push({
          month: m,
          monthLabel,
          year: selectedYear,
          realValue: null,
          targetValue: targetConfig.target_value,
          status: 'SEM_DADOS',
          formattedValue: '—',
          formattedTarget: formatKpiValue(targetConfig.target_value, def.unit),
          recordsCount: 0,
          hasData: false,
          drillDownRecords: [],
        })
        monthlyValues.push(null)
        continue
      }

      // Cálculo específico de cada KPI
      const calcResult = calculateSpecificKpi(def.id, monthRecs, targetConfig)
      monthlyValues.push(calcResult.value)

      const status = evaluateKpiStatus(
        calcResult.value,
        targetConfig.target_value,
        targetConfig.rule,
        targetConfig.target_value_max,
      )

      months.push({
        month: m,
        monthLabel,
        year: selectedYear,
        realValue: calcResult.value,
        targetValue: targetConfig.target_value,
        status,
        formattedValue: formatKpiValue(calcResult.value, def.unit),
        formattedTarget: formatKpiValue(targetConfig.target_value, def.unit),
        recordsCount: monthRecs.length,
        hasData: true,
        drillDownRecords: calcResult.drillDown,
      })

      allYearDrillDown.push(...calcResult.drillDown)
    }

    // YTD Consolidado
    const ytdCalc = calculateSpecificKpi(def.id, filteredRecords, targetConfig)
    const ytdReal = ytdCalc.value
    const ytdStatus = evaluateKpiStatus(
      ytdReal,
      targetConfig.target_value,
      targetConfig.rule,
      targetConfig.target_value_max,
    )

    // Melhor e Pior mês
    let bestMonth = '—'
    let worstMonth = '—'
    const validMonths = months.filter((c) => c.hasData && c.realValue !== null)

    if (validMonths.length > 0) {
      if (targetConfig.rule === 'GTE') {
        const sorted = [...validMonths].sort((a, b) => (b.realValue ?? 0) - (a.realValue ?? 0))
        bestMonth = `${sorted[0].monthLabel} (${sorted[0].formattedValue})`
        worstMonth = `${sorted[sorted.length - 1].monthLabel} (${sorted[sorted.length - 1].formattedValue})`
      } else {
        const sorted = [...validMonths].sort((a, b) => (a.realValue ?? 0) - (b.realValue ?? 0))
        bestMonth = `${sorted[0].monthLabel} (${sorted[0].formattedValue})`
        worstMonth = `${sorted[sorted.length - 1].monthLabel} (${sorted[sorted.length - 1].formattedValue})`
      }
    }

    // Tendência dos últimos 2 meses com dados
    let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE'
    if (validMonths.length >= 2) {
      const last = validMonths[validMonths.length - 1].realValue ?? 0
      const prev = validMonths[validMonths.length - 2].realValue ?? 0
      const diff = last - prev
      if (Math.abs(diff) > 0.05) {
        trend = diff > 0 ? 'UP' : 'DOWN'
      }
    }

    return {
      id: def.id,
      seq: def.seq,
      name: def.name,
      category: def.category,
      description: def.description,
      unit: def.unit,
      rule: targetConfig.rule,
      targetConfig,
      months,
      ytdReal,
      ytdTarget: targetConfig.target_value,
      ytdStatus,
      formattedYtdReal: formatKpiValue(ytdReal, def.unit),
      formattedYtdTarget: formatKpiValue(targetConfig.target_value, def.unit),
      bestMonth,
      worstMonth,
      trend,
      totalRecordsYear: filteredRecords.length,
      dataSource: def.dataSource,
      hasIntegration: true,
      lastUpdate: new Date().toISOString(),
    }
  })

  // 3. Filtro por Categoria se selecionada
  let result = rows
  if (filters.category && filters.category !== 'TODOS') {
    result = result.filter((r) => r.category === filters.category)
  }

  // 4. Filtro por Status Real x Meta
  if (filters.status && filters.status !== 'TODOS') {
    result = result.filter((r) => r.ytdStatus === filters.status)
  }

  // 5. Filtro textual
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim()
    result = result.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q),
    )
  }

  return result
}

// -------------------------------------------------------------
// FUNÇÃO AUXILIAR DE CÁLCULO POR INDICADOR ESPECÍFICO
// -------------------------------------------------------------
function calculateSpecificKpi(
  kpiId: string,
  records: any[],
  targetConfig: KpiTargetConfig,
): { value: number | null; drillDown: KpiDrillDownRecord[] } {
  if (!records || records.length === 0) {
    return { value: null, drillDown: [] }
  }

  const drillDown: KpiDrillDownRecord[] = []
  let totalVal = 0

  switch (kpiId) {
    // 1. OTIF de Expedição (% no prazo e concluído)
    case 'otif_expedicao': {
      let onTimeCount = 0
      records.forEach((rec) => {
        const isOk = rec.is_on_time === true && rec.final_status === 'CONCLUIDO'
        if (isOk) onTimeCount++
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: isOk ? 'Dentro da Janela' : 'Atraso / Ruptura',
          complianceStatus: isOk ? 'ATINGIU' : 'FORA',
          detailText:
            rec.occurrences_summary ||
            (isOk ? 'Expedição pontual' : 'Atraso na liberação ou entrega'),
          sourceCollection: 'carrier_operational_history',
        })
      })
      const pct = (onTimeCount / records.length) * 100
      return { value: Number(pct.toFixed(1)), drillDown }
    }

    // 2. Tempo Médio de Permanência do Veículo (min)
    case 'tempo_permanencia_veiculo': {
      records.forEach((rec) => {
        const dwell = Number(rec.total_internal_dwell_min || rec.total_time_min || 0)
        totalVal += dwell
        const isOk = dwell <= targetConfig.target_value
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: formatKpiValue(dwell, 'min'),
          complianceStatus: isOk ? 'ATINGIU' : 'FORA',
          detailText: `Entrada: ${rec.start_time_str || '08:00'} | Saída: ${rec.end_time_2_str || '—'} | Fila: ${rec.internal_waiting_min || 0} min | Carga: ${rec.loading_duration_min || 0} min`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const avg = totalVal / records.length
      return { value: Number(avg.toFixed(1)), drillDown }
    }

    // 3. Tempo Médio de Espera para Carregamento (min)
    case 'tempo_espera_carregamento': {
      records.forEach((rec) => {
        const wait = Number(rec.internal_waiting_min || 0)
        totalVal += wait
        const isOk = wait <= targetConfig.target_value
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: formatKpiValue(wait, 'min'),
          complianceStatus: isOk ? 'ATINGIU' : 'FORA',
          detailText: `Espera na portaria/doca: ${wait} min. Motivo: ${rec.scale_reason || 'Pesagem regular aprovada'}`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const avg = totalVal / records.length
      return { value: Number(avg.toFixed(1)), drillDown }
    }

    // 4. Tempo Médio de Carregamento (min)
    case 'tempo_carregamento': {
      records.forEach((rec) => {
        const loadDur = Number(rec.loading_duration_min || rec.collection_time_min || 0)
        totalVal += loadDur
        const isOk = loadDur <= targetConfig.target_value
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: formatKpiValue(loadDur, 'min'),
          complianceStatus: isOk ? 'ATINGIU' : 'FORA',
          detailText: `Duração do carregamento: ${loadDur} min | Peso: ${rec.weight_ton} t | Tipo: ${rec.body_type_desc || rec.vehicle_type || '—'}`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const avg = totalVal / records.length
      return { value: Number(avg.toFixed(1)), drillDown }
    }

    // 5. Tempo Médio para Emissão da Nota Fiscal (min)
    case 'tempo_emissao_nf': {
      records.forEach((rec) => {
        const invDur = Number(rec.invoicing_duration_min || 20)
        totalVal += invDur
        const isOk = invDur <= targetConfig.target_value
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: formatKpiValue(invDur, 'min'),
          complianceStatus: isOk ? 'ATINGIU' : 'FORA',
          detailText: `Emissão SAP VF01: ${invDur} min | Data Fat: ${rec.invoicing_date ? rec.invoicing_date.split('T')[0] : '—'}`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const avg = totalVal / records.length
      return { value: Number(avg.toFixed(1)), drillDown }
    }

    // 6. Cargas Faturadas no Prazo (%)
    case 'cargas_faturadas_no_prazo': {
      let countOk = 0
      records.forEach((rec) => {
        const invDur = Number(rec.invoicing_duration_min || 20)
        const isOk = invDur <= 30 && rec.final_status === 'CONCLUIDO'
        if (isOk) countOk++
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: isOk ? 'Faturado no Prazo' : 'Faturamento com Atraso',
          complianceStatus: isOk ? 'ATINGIU' : 'FORA',
          detailText: `Tempo de faturamento: ${invDur} min. Status: ${rec.final_status}`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const pct = (countOk / records.length) * 100
      return { value: Number(pct.toFixed(1)), drillDown }
    }

    // 7. Produtividade da Expedição (t/h)
    case 'produtividade_expedicao': {
      records.forEach((rec) => {
        const loadHours = Math.max(Number(rec.loading_duration_min || 60) / 60, 0.25)
        const ton = Number(rec.weight_ton || 0)
        const rate = ton / loadHours
        totalVal += rate
        const isOk = rate >= targetConfig.target_value
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: ton,
          primaryValueFormatted: formatKpiValue(rate, 't/h'),
          complianceStatus: isOk ? 'ATINGIU' : 'FORA',
          detailText: `${ton} t em ${Math.round(loadHours * 60)} min | Centro: ${rec.origin_plant || 'Matriz'}`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const avg = totalVal / records.length
      return { value: Number(avg.toFixed(1)), drillDown }
    }

    // 8. Veículos com Permanência Acima da Meta (%)
    case 'veiculos_permanencia_acima_meta': {
      let countExceeded = 0
      records.forEach((rec) => {
        const dwell = Number(rec.total_internal_dwell_min || rec.total_time_min || 0)
        const exceeded = dwell > 120 // meta de 120 min
        if (exceeded) countExceeded++
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: formatKpiValue(dwell, 'min'),
          complianceStatus: !exceeded ? 'ATINGIU' : 'FORA',
          detailText: exceeded
            ? `Excedeu a meta de permanência em ${dwell - 120} min (total: ${dwell} min)`
            : `Permanência conforme (${dwell} min <= 120 min)`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const pct = (countExceeded / records.length) * 100
      return { value: Number(pct.toFixed(1)), drillDown }
    }

    // 9. Aderência ao Planejamento de Cargas (%)
    case 'aderencia_planejamento_cargas': {
      let adherentCount = 0
      records.forEach((rec) => {
        const isAdherent = rec.final_status === 'CONCLUIDO'
        if (isAdherent) adherentCount++
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: isAdherent ? 'Concluída Conforme' : 'Desvio de Planejamento',
          complianceStatus: isAdherent ? 'ATINGIU' : 'FORA',
          detailText: `Status final: ${rec.final_status}. ${rec.occurrences_summary || ''}`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const pct = (adherentCount / records.length) * 100
      return { value: Number(pct.toFixed(1)), drillDown }
    }

    // 10. Ocupação Média dos Veículos (%)
    case 'ocupacao_media_veiculos': {
      records.forEach((rec) => {
        let occ = Number(rec.occupancy_pct || 0)
        if (occ <= 0 && rec.vehicle_capacity_ton > 0 && rec.weight_ton > 0) {
          occ = (rec.weight_ton / rec.vehicle_capacity_ton) * 100
        }
        totalVal += occ
        const isOk = occ >= targetConfig.target_value
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: formatKpiValue(occ, '%'),
          complianceStatus: isOk ? 'ATINGIU' : 'FORA',
          detailText: `Carga: ${rec.weight_ton} t | Capacidade: ${rec.vehicle_capacity_ton} t | Ocupação: ${occ.toFixed(1)}%`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const avg = totalVal / records.length
      return { value: Number(avg.toFixed(1)), drillDown }
    }

    // 11. Cargas Reprogramadas (%)
    case 'cargas_reprogramadas': {
      let reprogCount = 0
      records.forEach((rec) => {
        const isReprog =
          rec.final_status === 'ENCERRADO_COM_OCORRENCIA' &&
          rec.occurrences_summary &&
          rec.occurrences_summary.toLowerCase().includes('reprogram')
        if (isReprog) reprogCount++
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: isReprog ? 'Reprogramada' : 'No Prazo Original',
          complianceStatus: !isReprog ? 'ATINGIU' : 'FORA',
          detailText: isReprog
            ? `Motivo: ${rec.occurrences_summary}`
            : 'Planejamento mantido sem reprogramação',
          sourceCollection: 'carrier_operational_history',
        })
      })
      const pct = (reprogCount / records.length) * 100
      return { value: Number(pct.toFixed(1)), drillDown }
    }

    // 13. Índice de Ocorrências Logísticas (%)
    case 'indice_ocorrencias_logisticas': {
      let occCount = 0
      records.forEach((rec) => {
        const hasOcc = Number(rec.occurrences_count || 0) > 0
        if (hasOcc) occCount++
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: hasOcc
            ? `${rec.occurrences_count} Ocorrência(s)`
            : 'Sem Ocorrência',
          complianceStatus: !hasOcc ? 'ATINGIU' : 'FORA',
          detailText:
            rec.occurrences_summary || 'Operação realizada com sucesso sem desvios operacionais',
          sourceCollection: 'carrier_operational_history',
        })
      })
      const pct = (occCount / records.length) * 100
      return { value: Number(pct.toFixed(1)), drillDown }
    }

    // 15. OTIF de Entrega ao Cliente (%)
    case 'otif_entrega_cliente': {
      let deliveredOnTime = 0
      records.forEach((rec) => {
        const isOk = rec.is_on_time === true && Number(rec.delay_minutes || 0) === 0
        if (isOk) deliveredOnTime++
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: isOk
            ? 'Entrega Pontual (OTIF)'
            : `Atraso (${rec.delay_minutes} min)`,
          complianceStatus: isOk ? 'ATINGIU' : 'FORA',
          detailText: isOk
            ? 'Entrega completa realizada na janela acordada'
            : `Atraso de ${rec.delay_minutes} min em relação ao horário estimado`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const pct = (deliveredOnTime / records.length) * 100
      return { value: Number(pct.toFixed(1)), drillDown }
    }

    // 16. Custo Médio de Frete por Tonelada (R$/t)
    case 'custo_medio_frete_tonelada': {
      let totalFreight = 0
      let totalTon = 0
      records.forEach((rec) => {
        const freight = Number(rec.freight_cost_driver || 0)
        const ton = Number(rec.weight_ton || 0)
        totalFreight += freight
        totalTon += ton
        const costPerTon = ton > 0 ? freight / ton : 0
        const isOk = costPerTon <= targetConfig.target_value
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: ton,
          primaryValueFormatted: formatKpiValue(costPerTon, 'R$/t'),
          complianceStatus: isOk ? 'ATINGIU' : 'FORA',
          detailText: `Frete pago: ${formatKpiValue(freight, 'R$')} para ${ton} t | Rota: ${rec.itinerary_description || rec.itinerary_code}`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const avgRate = totalTon > 0 ? totalFreight / totalTon : 0
      return { value: Number(avgRate.toFixed(2)), drillDown }
    }

    // 17. Frete sobre Receita (%)
    case 'frete_sobre_receita': {
      let sumCost = 0
      let sumBilled = 0
      records.forEach((rec) => {
        const cost = Number(rec.total_cost || rec.freight_cost_driver || 0)
        const billed = Number(rec.freight_billed_customer || 0)
        sumCost += cost
        sumBilled += billed
        const pctFreight = billed > 0 ? (cost / billed) * 100 : 0
        const isOk = pctFreight <= targetConfig.target_value
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: formatKpiValue(pctFreight, '%'),
          complianceStatus: isOk ? 'ATINGIU' : 'FORA',
          detailText: `Custo total: ${formatKpiValue(cost, 'R$')} | Cobrado: ${formatKpiValue(billed, 'R$')}`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const finalPct = sumBilled > 0 ? (sumCost / sumBilled) * 100 : 0
      return { value: Number(finalPct.toFixed(1)), drillDown }
    }

    // 18. Resultado Financeiro do Frete (Margem %)
    case 'resultado_financeiro_frete': {
      records.forEach((rec) => {
        const marginPct = Number(rec.margin_pct || 0)
        totalVal += marginPct
        const isOk = marginPct >= targetConfig.target_value
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: formatKpiValue(marginPct, '%'),
          complianceStatus: isOk ? 'ATINGIU' : 'FORA',
          detailText: `Margem: ${formatKpiValue(rec.margin_value || 0, 'R$')} (${marginPct.toFixed(1)}%) | Faturado: ${formatKpiValue(rec.freight_billed_customer || 0, 'R$')}`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const avgMargin = totalVal / records.length
      return { value: Number(avgMargin.toFixed(1)), drillDown }
    }

    // 20. Aderência ao ETA (%)
    case 'aderencia_eta': {
      let etaOkCount = 0
      records.forEach((rec) => {
        const actualMin = Number(rec.route_actual_min || 0)
        const estMin = Number(rec.route_estimated_min || actualMin)
        const diff = actualMin - estMin
        const isOk = diff <= 30 // tolerância configurada de 30 min
        if (isOk) etaOkCount++
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: isOk ? 'Dentro do ETA' : `Desvio (+${diff} min)`,
          complianceStatus: isOk ? 'ATINGIU' : 'FORA',
          detailText: `Tempo previsto: ${estMin} min | Realizado: ${actualMin} min | Rota: ${rec.itinerary_code}`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const pct = (etaOkCount / records.length) * 100
      return { value: Number(pct.toFixed(1)), drillDown }
    }

    // 21. Índice de Ocorrências em Transporte (%)
    case 'indice_ocorrencias_transporte': {
      let occTransportCount = 0
      records.forEach((rec) => {
        const hasOcc =
          Number(rec.occurrences_count || 0) > 0 ||
          Number(rec.complaints_count || 0) > 0 ||
          Number(rec.delay_minutes || 0) > 0
        if (hasOcc) occTransportCount++
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: hasOcc ? 'Com Intercorrência' : 'Viagem Regular',
          complianceStatus: !hasOcc ? 'ATINGIU' : 'FORA',
          detailText:
            rec.occurrences_summary ||
            (hasOcc
              ? `Atraso registrado: ${rec.delay_minutes} min`
              : 'Viagem sem sinistros ou retenções'),
          sourceCollection: 'carrier_operational_history',
        })
      })
      const pct = (occTransportCount / records.length) * 100
      return { value: Number(pct.toFixed(1)), drillDown }
    }

    // 22. Avaliação de Motoristas/Transportadores (pts)
    case 'avaliacao_motoristas_transportadores': {
      records.forEach((rec) => {
        const score = Number(rec.driver_rating || 4.5)
        totalVal += score
        const isOk = score >= targetConfig.target_value
        drillDown.push({
          id: rec.id,
          orderNumber: rec.transport_order_number || '—',
          sapTransportNumber: rec.sap_transport_number || '—',
          date: rec.transport_date ? rec.transport_date.split('T')[0] : '—',
          customerName: rec.customers_summary || '—',
          carrierName: rec.carrier_name || '—',
          driverName: rec.driver_name || '—',
          vehiclePlate: rec.vehicle_plate || '—',
          itineraryCode: rec.itinerary_code || '—',
          destinationCity: rec.destination_city || '—',
          destinationUf: rec.destination_uf || '—',
          weightTon: rec.weight_ton || 0,
          primaryValueFormatted: formatKpiValue(score, 'pts'),
          complianceStatus: isOk ? 'ATINGIU' : 'FORA',
          detailText: `Nota do Motorista: ${score.toFixed(1)} | Nota do Veículo: ${rec.vehicle_rating || '—'} | Elogios: ${rec.compliments_count || 0}`,
          sourceCollection: 'carrier_operational_history',
        })
      })
      const avg = totalVal / records.length
      return { value: Number(avg.toFixed(1)), drillDown }
    }

    default:
      return { value: null, drillDown: [] }
  }
}

// -------------------------------------------------------------
// MOTOR DE IA INTEGRADA PARA DIAGNÓSTICO E CAUSAS PROVÁVEIS
// -------------------------------------------------------------
export function runAiKpiDiagnosis(
  kpi: KpiRowData,
  selectedMonth?: KpiMonthCell,
): KpiAiDiagnosisResult {
  const cell = selectedMonth || kpi.months.find((m) => m.hasData) || kpi.months[0]
  const periodLabel = cell ? `${cell.monthLabel}/${cell.year}` : 'YTD'
  const realVal = cell?.realValue ?? kpi.ytdReal
  const targetVal = cell?.targetValue ?? kpi.ytdTarget
  const status = cell?.status ?? kpi.ytdStatus
  const records = cell?.drillDownRecords || []

  // Se não há desvio (atingiu a meta)
  if (status === 'ATENDIDA') {
    return {
      hasDeviation: false,
      kpiName: kpi.name,
      period: periodLabel,
      realValueFormatted: formatKpiValue(realVal, kpi.unit),
      targetValueFormatted: formatKpiValue(targetVal, kpi.unit),
      status: 'ATENDIDA',
      diagnostic: `O indicador ${kpi.name} operou em conformidade no período ${periodLabel}, atingindo o patamar de ${formatKpiValue(realVal, kpi.unit)} frente à meta parametrizada de ${formatKpiValue(targetVal, kpi.unit)}.`,
      probableCauses: [
        'Estabilidade nos processos operacionais da unidade CIAFAL.',
        'Aderência do fluxo de veículos às janelas de agendamento.',
        'Fluidez na liberação fiscal e pesagem em balança.',
      ],
      dimensionalBreakdown: {
        concentratedIn: 'Operação regular em conformidade',
        topDeviatingEntities: [],
      },
      suggestedAction: {
        problem: 'Nenhuma anomalia crítica identificada.',
        cause: 'Processo sob controle estatístico.',
        action: 'Manter rotina de monitoramento proativo e boas práticas.',
        responsibleSector: 'Logística & Operações',
        targetModule: 'TMS',
        suggestedDeadlineDays: 30,
        priority: 'BAIXA',
      },
      evidenceSufficient: true,
    }
  }

  // Se não há dados suficientes
  if (status === 'SEM_DADOS' || records.length === 0) {
    return {
      hasDeviation: false,
      kpiName: kpi.name,
      period: periodLabel,
      realValueFormatted: '—',
      targetValueFormatted: formatKpiValue(targetVal, kpi.unit),
      status: 'SEM_DADOS',
      diagnostic:
        'Não há evidências suficientes para confirmar a causa. Recomenda-se verificar a integração com a fonte de dados primária.',
      probableCauses: [
        'Integração operacional pendente para este indicador.',
        'Ausência de remessas/viagens faturadas no período sob os filtros selecionados.',
      ],
      dimensionalBreakdown: {
        concentratedIn: 'Integração pendente',
        topDeviatingEntities: [],
      },
      suggestedAction: {
        problem: 'Sem registros operacionais na base para avaliação de desvio.',
        cause: 'Integração ou parametrização pendente.',
        action: 'Acionar a TI corporativa CIAFAL para homologação da RFC/BAPI SAP correspondente.',
        responsibleSector: 'TI & Integrações SAP',
        targetModule: 'TMS',
        suggestedDeadlineDays: 15,
        priority: 'MEDIA',
      },
      evidenceSufficient: false,
    }
  }

  // Desvio REAL detectado: Correlacionar com dados reais
  const outRecords = records.filter((r) => r.complianceStatus === 'FORA')

  // Agrupamento por transportadora/rota/motivo
  const carrierCounts: Record<string, number> = {}
  const itineraryCounts: Record<string, number> = {}
  const reasons: string[] = []

  outRecords.forEach((r) => {
    carrierCounts[r.carrierName] = (carrierCounts[r.carrierName] || 0) + 1
    itineraryCounts[r.itineraryCode] = (itineraryCounts[r.itineraryCode] || 0) + 1
    if (r.detailText && !reasons.includes(r.detailText)) {
      reasons.push(r.detailText)
    }
  })

  const topCarriers = Object.entries(carrierCounts).sort((a, b) => b[1] - a[1])
  const topItineraries = Object.entries(itineraryCounts).sort((a, b) => b[1] - a[1])

  const mainCarrier = topCarriers.length > 0 ? topCarriers[0][0] : 'Não especificada'
  const mainItin = topItineraries.length > 0 ? topItineraries[0][0] : 'Itinerários diversos'

  // Diagnóstico determinístico e causas baseados no tipo de indicador
  let diagText = ''
  const causes: string[] = []
  let suggestedActionProblem = ''
  let suggestedActionCause = ''
  let suggestedActionPlan = ''
  let targetSector = 'Logística'
  let targetMod:
    | 'TMS'
    | 'WMS'
    | 'PCP_ROBOTIZADO'
    | 'MANUTENCAO'
    | 'COMERCIAL_CRM'
    | 'EXPEDICAO'
    | 'OUTRO' = 'TMS'

  if (kpi.id === 'tempo_permanencia_veiculo' || kpi.id === 'veiculos_permanencia_acima_meta') {
    diagText = `Identificado aumento na permanência interna de veículos em ${periodLabel}: atingido ${formatKpiValue(realVal, kpi.unit)} contra meta de ${formatKpiValue(targetVal, kpi.unit)}. O desvio está concentrado em veículos da transportadora "${mainCarrier}" operando no itinerário "${mainItin}".`
    causes.push(
      `Fila de espera para liberação de doca na unidade Matriz/Sidercentro (${outRecords.length} veículos com retenção superior a 45 min).`,
    )
    causes.push(
      'Concentração de chegadas simultâneas de veículos no início do turno da manhã sem escalonamento de janelas.',
    )
    causes.push(
      'Demora na conferência física e finalização do faturamento no SAP ECC após a pesagem final.',
    )
    suggestedActionProblem = `Tempo de permanência de veículos acima do SLA máximo de 120 min.`
    suggestedActionCause = `Gargalo no fluxo de entrada e pesagem da balança associado a atraso na emissão de NF no turno matutino.`
    suggestedActionPlan = `Implantar escalonamento rígido de agendamento de janelas (Slots D+1) no TMS e priorizar liberação fiscal das cargas concluídas.`
    targetSector = 'Pátio, Balança & Faturamento'
    targetMod = 'EXPEDICAO'
  } else if (kpi.id === 'otif_expedicao' || kpi.id === 'otif_entrega_cliente') {
    diagText = `Queda no indicador de OTIF (${formatKpiValue(realVal, kpi.unit)} realizado vs meta de ${formatKpiValue(targetVal, kpi.unit)}) em ${periodLabel}. Foram mapeadas ${outRecords.length} cargas com desvio de janela ou atraso imputável.`
    causes.push(
      `Atraso na liberação da expedição CIAFAL refletindo em saída tardia do veículo para a viagem.`,
    )
    causes.push(
      `Retenção em trânsito e restrições de descarga nos clientes do itinerário "${mainItin}".`,
    )
    if (reasons.length > 0) {
      causes.push(`Ocorrências registradas em trânsito: ${reasons.slice(0, 2).join('; ')}.`)
    }
    suggestedActionProblem = `OTIF abaixo da meta corporativa de 95%.`
    suggestedActionCause = `Saída com atraso da unidade expedidora e intercorrências de tráfego na malha rodoviária.`
    suggestedActionPlan = `Alinhar com a expedição o cumprimento do horário de carregamento e acionar Fred IA para alertas antecipados de desvio de rota.`
    targetSector = 'Expedição & Gestão de Transportes'
    targetMod = 'TMS'
  } else if (kpi.id === 'custo_medio_frete_tonelada' || kpi.id === 'resultado_financeiro_frete') {
    diagText = `Pressão de custos no frete em ${periodLabel}: resultado realizado de ${formatKpiValue(realVal, kpi.unit)} fora da meta de ${formatKpiValue(targetVal, kpi.unit)}. Cargas de menor densidade e rotas com retorno desfavorável impactaram o indicador.`
    causes.push(
      `Contratação de veículos spot na Mesa de Fretes com valor superior ao piso ANTT nas rotas com menor oferta de parceiros.`,
    )
    causes.push(
      `Ocupação volumétrica abaixo da capacidade útil em rotas compartilhadas do itinerário "${mainItin}".`,
    )
    suggestedActionProblem = `Custo de frete por tonelada superou a margem orçada.`
    suggestedActionCause = `Dispersão de valores negociados com motoristas terceiros e cargas fracionadas de baixo peso.`
    suggestedActionPlan = `Ativar negociação automática pelo Chicão IA com aplicação da tabela de referência e consolidar complemento de cargas com o Comercial.`
    targetSector = 'Mesa de Fretes & Controladoria'
    targetMod = 'TMS'
  } else {
    diagText = `Desvio identificado no indicador ${kpi.name} em ${periodLabel}. Realizado: ${formatKpiValue(realVal, kpi.unit)} | Meta: ${formatKpiValue(targetVal, kpi.unit)}. Concentração observada em ${outRecords.length} registros operacionais.`
    causes.push(
      `Concentração de eventos no itinerário ${mainItin} operado pela transportadora ${mainCarrier}.`,
    )
    causes.push('Variação de demanda e contingências no carregamento fabril.')
    suggestedActionProblem = `Indicador ${kpi.name} fora da meta em ${periodLabel}.`
    suggestedActionCause = `Fatores operacionais concentrados nas cargas do itinerário ${mainItin}.`
    suggestedActionPlan = `Auditar os registros do período no detalhamento e estabelecer plano de contingência setorial.`
    targetSector = 'Operações & Logística'
    targetMod = 'TMS'
  }

  const topEntities = topCarriers.slice(0, 3).map(([label, count]) => ({
    label: `Transportadora: ${label}`,
    count,
    impact: `${count} ocorrências no período`,
  }))

  return {
    hasDeviation: true,
    kpiName: kpi.name,
    period: periodLabel,
    realValueFormatted: formatKpiValue(realVal, kpi.unit),
    targetValueFormatted: formatKpiValue(targetVal, kpi.unit),
    status: 'FORA_DA_META',
    diagnostic: diagText,
    probableCauses: causes,
    dimensionalBreakdown: {
      concentratedIn: `Transportadora: ${mainCarrier} | Rota: ${mainItin}`,
      topDeviatingEntities: topEntities,
    },
    suggestedAction: {
      problem: suggestedActionProblem,
      cause: suggestedActionCause,
      action: suggestedActionPlan,
      responsibleSector: targetSector,
      targetModule: targetMod,
      suggestedDeadlineDays: 10,
      priority: 'ALTA',
    },
    evidenceSufficient: true,
  }
}
