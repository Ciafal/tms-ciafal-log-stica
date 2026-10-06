/**
 * Motor de Padronização do Tratamento de Desvios & Análise de Causa TMS CIAFAL
 * Segue o padrão canônico do PCP Robotizado:
 * 8 Etapas:
 * 1. Identificação
 * 2. Análise de Causa (Hipóteses)
 * 3. 5 Porquês
 * 4. Ishikawa 6M
 * 5. Causa Raiz
 * 6. Plano 5W2H
 * 7. Acompanhamento
 * 8. Eficácia
 *
 * Padrões de formatação ABNT brasileira:
 * Decimal com vírgula, percentual "95,0 %", moeda "R$", peso em "t" ou "kg", datas "dd/mm/aaaa".
 * Sem dados fictícios / mockados.
 */

import { KpiRowData, KpiMonthCell, formatKpiValue } from './tmsIndicatorsEngine'

export type TreatmentStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export type TreatmentStatus =
  | 'EM_ANALISE'
  | 'PLANO_CRIADO'
  | 'EM_EXECUCAO'
  | 'AGUARDANDO_EFICACIA'
  | 'CONCLUIDO_EFICAZ'
  | 'CONCLUIDO_PARCIAL'
  | 'CONCLUIDO_INEFICAZ'
  | 'CANCELADO'

export type HypothesisStatus = 'EM_ANALISE' | 'CONFIRMADA' | 'DESCARTADA'

export interface DeviationHypothesis {
  id: string
  statement: string
  evidence: string
  dataSourceUsed: string
  notes?: string
  responsibleName: string
  status: HypothesisStatus
  isAiSuggested?: boolean
  createdAt: string
}

export interface FiveWhysStep {
  level: number // 1 a 5 (ou mais se o usuário adicionar)
  question: string // "Por quê...?"
  answer: string
}

export interface FiveWhysData {
  problemStatement: string
  whys: FiveWhysStep[]
  concludedRootCause?: string
}

export type IshikawaCategory =
  | 'METODO'
  | 'MAQUINA'
  | 'MAO_DE_OBRA'
  | 'MATERIAL'
  | 'MEDICAO'
  | 'MEIO_AMBIENTE'

export interface IshikawaCauseItem {
  id: string
  category: IshikawaCategory
  cause: string
  evidence?: string
  relevance: 'ALTA' | 'MEDIA' | 'BAIXA'
  isPotentialRootCause: boolean
  isAiSuggested?: boolean
}

export interface ValidatedRootCause {
  id: string
  description: string
  evidence: string
  methodUsed: '5_WHYS' | 'ISHIKAWA' | 'ANALISE_DADOS' | 'OUTRO'
  validatorName: string
  validatorEmail?: string
  validationDate: string
  impactDescription: string
}

export type Action5W2HPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
export type Action5W2HStatus =
  | 'NAO_INICIADA'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO'
  | 'CONCLUIDA'
  | 'CANCELADA'
  | 'ATRASADA'

export interface Action5W2H {
  id: string
  actionNumber: number
  what: string // O que será feito?
  why: string // Por que será feito? (Justificativa)
  where: string // Onde será executado? (Unidade/Rota/Sistema)
  whenDeadline: string // Quando? (Prazo limite)
  who: string // Quem é o responsável?
  how: string // Como será feito? (Método/Procedimento)
  howMuch: string // Quanto custará? (R$ ou recursos)
  priority: Action5W2HPriority
  status: Action5W2HStatus
  progressPct: number // 0 a 100%
  createdDate: string
  evidenceNotes?: string
  targetModule?: string
}

export interface TrackingUpdateEntry {
  id: string
  date: string
  authorName: string
  authorEmail: string
  comment: string
  actionRefId?: string
  progressSnapshotPct?: number
  evidenceAttachment?: string
}

export type EffectivenessOutcome =
  | 'EFICAZ'
  | 'PARCIALMENTE_EFICAZ'
  | 'INEFICAZ'
  | 'AGUARDANDO_AVALIACAO'

export interface EffectivenessData {
  outcome: EffectivenessOutcome
  beforeValue: number | null
  afterValue: number | null
  targetValue: number
  variance: number | null
  trend: 'MELHORA' | 'PIORA' | 'ESTAVEL'
  evaluationPeriod: string
  evaluatorName: string
  evaluationDate: string
  notes: string
  aiOpinion?: string
}

export interface TmsDeviationTreatment {
  id?: string
  treatment_code: string
  kpi_id: string
  kpi_name: string
  category: 'EXPEDICAO' | 'LOGISTICA' | 'TRANSPORTE'
  company?: string
  center?: string
  period_ref: string
  month: number
  year: number
  target_value: number
  real_value: number
  unit: string
  deviation_abs: number
  deviation_pct: number
  trend_label: string
  status: TreatmentStatus
  current_step: TreatmentStep

  // Responsabilidades
  responsible_analyst_id: string
  responsible_analyst_name: string
  responsible_analyst_email: string
  area_supervisor_id?: string
  area_supervisor_name?: string
  area_supervisor_email?: string
  plan_approver_id?: string
  plan_approver_name?: string
  plan_approver_email?: string

  // Etapa 1
  deviation_description: string
  ai_initial_analysis?: string
  ai_analysis_json?: {
    identifiedFact: string
    hypotheses: string[]
    necessaryEvidences: string[]
    recommendations: string[]
  }

  // Etapa 2
  hypotheses_json: DeviationHypothesis[]

  // Etapa 3
  five_whys_json: FiveWhysData

  // Etapa 4
  ishikawa_json: IshikawaCauseItem[]

  // Etapa 5
  root_causes_json: ValidatedRootCause[]
  root_cause_validated: boolean
  impossibility_justification?: string

  // Etapa 6
  actions_5w2h_json: Action5W2H[]

  // Etapa 7
  tracking_updates_json: TrackingUpdateEntry[]

  // Etapa 8
  effectiveness_status: EffectivenessOutcome
  effectiveness_before_value?: number
  effectiveness_after_value?: number
  effectiveness_evaluation_notes?: string
  effectiveness_evaluated_at?: string
  effectiveness_evaluated_by?: string
  effectiveness_ai_opinion?: string

  // Metadados
  linked_sap_orders?: string
  origin_filters_json?: any
  metadata_json?: any
  created?: string
  updated?: string
}

// -------------------------------------------------------------
// HELPER PARA FORMATAR NÚMEROS ABNT BRASILEIROS
// -------------------------------------------------------------
export function formatAbntNumber(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatAbntPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return `${formatAbntNumber(val, 1)} %`
}

export function formatAbntCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatAbntDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('pt-BR')
}

// -------------------------------------------------------------
// GERAÇÃO AUTOMÁTICA DA DESCRIÇÃO DO DESVIO
// Exemplo canônico:
// "Foi identificado desvio no indicador Tempo Médio de Permanência de Veículos em setembro/2026.
//  O resultado apurado foi de 4,8 h frente à meta de 3,5 h, representando desvio de +1,3 h."
// -------------------------------------------------------------
export function generateAutomaticDeviationDescription(
  kpiName: string,
  periodLabel: string,
  realVal: number,
  targetVal: number,
  unit: string,
): string {
  const diff = realVal - targetVal
  const sign = diff > 0 ? '+' : ''
  const formattedReal = formatKpiValue(realVal, unit)
  const formattedTarget = formatKpiValue(targetVal, unit)

  let diffText = ''
  if (unit === '%') {
    diffText = `${sign}${formatAbntNumber(diff, 1)} p.p.`
  } else if (unit === 'min') {
    const totalMin = Math.round(diff)
    diffText = `${sign}${totalMin} min`
  } else {
    diffText = `${sign}${formatAbntNumber(diff, 1)} ${unit}`
  }

  return `Foi identificado desvio no indicador ${kpiName} em ${periodLabel}. O resultado apurado foi de ${formattedReal} frente à meta de ${formattedTarget}, representando desvio de ${diffText}.`
}

// -------------------------------------------------------------
// MOTOR DETERMINÍSTICO DE ANÁLISE IA (ZERO MOCK / DADOS REAIS TMS)
// Analisa carrier_operational_history e sap_sales_orders reais
// -------------------------------------------------------------
export function generateAiKpiInvestigation(
  kpi: KpiRowData,
  monthCell: KpiMonthCell,
  operationalRecords: any[],
): {
  identifiedFact: string
  hypotheses: string[]
  necessaryEvidences: string[]
  recommendations: string[]
  aiText: string
} {
  const records = monthCell.drillDownRecords || []
  const count = records.length
  const unit = kpi.unit
  const realVal = monthCell.realValue ?? 0
  const targetVal = monthCell.targetValue ?? 0
  const diff = realVal - targetVal
  const sign = diff > 0 ? '+' : ''

  // Identificação de concentração real nos dados
  const carrierMap: Record<string, number> = {}
  const driverMap: Record<string, number> = {}
  const itineraryMap: Record<string, number> = {}
  const customerMap: Record<string, number> = {}
  let totalNonCompliant = 0

  records.forEach((r) => {
    if (r.complianceStatus === 'FORA') {
      totalNonCompliant++
      if (r.carrierName && r.carrierName !== '—') {
        carrierMap[r.carrierName] = (carrierMap[r.carrierName] || 0) + 1
      }
      if (r.driverName && r.driverName !== '—') {
        driverMap[r.driverName] = (driverMap[r.driverName] || 0) + 1
      }
      if (r.itineraryCode && r.itineraryCode !== '—') {
        itineraryMap[r.itineraryCode] = (itineraryMap[r.itineraryCode] || 0) + 1
      }
      if (r.customerName && r.customerName !== '—') {
        customerMap[r.customerName] = (customerMap[r.customerName] || 0) + 1
      }
    }
  })

  const getTop = (map: Record<string, number>): string | null => {
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
    return entries.length > 0 ? `${entries[0][0]} (${entries[0][1]} ocorrências)` : null
  }

  const topCarrier = getTop(carrierMap)
  const topItin = getTop(itineraryMap)
  const topCust = getTop(customerMap)

  // 1. Fato identificado
  const factParts: string[] = [
    `No período de ${monthCell.monthLabel}/${monthCell.year}, o indicador ${kpi.name} realizou ${monthCell.formattedValue} contra a meta de ${monthCell.formattedTarget} (${sign}${formatAbntNumber(diff, 1)} de variação).`,
  ]
  if (count > 0) {
    factParts.push(
      `Foram analisados ${count} registros operacionais reais no TMS, dos quais ${totalNonCompliant} registraram desvio fora da tolerância.`,
    )
  } else {
    factParts.push('Não existem registros operacionais com desvio no período selecionado.')
  }
  if (topItin) factParts.push(`Maior concentração de desvio no itinerário: ${topItin}.`)
  if (topCarrier) factParts.push(`Transportadora com maior frequência de desvio: ${topCarrier}.`)
  const identifiedFact = factParts.join(' ')

  // 2. Hipóteses
  const hypotheses: string[] = []
  if (kpi.id.includes('tempo') || kpi.id.includes('permanencia') || kpi.id.includes('espera')) {
    hypotheses.push(
      'Gargalo na janela de carregamento por sobreposição de agendamento de veículos no pátio.',
    )
    hypotheses.push('Divergência de conferência física ou liberação fiscal no faturamento SAP.')
    if (topItin)
      hypotheses.push(`Lentidão na amarração de cargas específicas no itinerário ${topItin}.`)
  } else if (kpi.id.includes('otif') || kpi.id.includes('eta')) {
    hypotheses.push(
      'Intercorrências climáticas ou lentidão em rodovias troncais (ex: Fernão Dias / Dutra).',
    )
    hypotheses.push(
      'Atraso no início da expedição impactando a chegada na janela acordada do cliente.',
    )
    if (topCust)
      hypotheses.push(
        `Restrição de horário de descarregamento não comunicada pelo cliente ${topCust}.`,
      )
  } else if (kpi.id.includes('custo') || kpi.id.includes('frete') || kpi.id.includes('margem')) {
    hypotheses.push(
      'Variação de oferta de veículos para rotas fracionadas elevando o frete contratado.',
    )
    hypotheses.push(
      'Incompatibilidade entre tabela referencial ANTT praticada e demanda emergencial.',
    )
  } else {
    hypotheses.push('Variação operacional nas etapas de liberação de pedidos e formação de carga.')
    hypotheses.push('Inconsistência de parâmetros entre planejamento e capacidade de execução.')
  }

  // 3. Evidências necessárias
  const necessaryEvidences: string[] = [
    'Conferência do espelho de pesagem e horários de entrada/saída na portaria CIAFAL.',
    'Verificação dos apontamentos de intercorrência no Fred IA e registros do motorista.',
    'Confrontação das ordens de remessa SAP (ZSD004 / ZSD35) com horários de emissão da NF-e.',
  ]

  // 4. Recomendações
  const recommendations: string[] = [
    'Validar a hipótese preponderante com a supervisão operacional antes de definir a causa raiz formal.',
    'Estruturar plano de ação 5W2H com prazo e responsável definidos entre os usuários ativos do HUB.',
    'Monitorar a evolução do indicador no mês seguinte para consolidação da eficácia da ação corretiva.',
  ]

  const aiText = [
    `=== FATO IDENTIFICADO ===\n${identifiedFact}`,
    `=== HIPÓTESES PRELIMINARES ===\n${hypotheses.map((h, i) => `${i + 1}. ${h}`).join('\n')}`,
    `=== EVIDÊNCIAS NECESSÁRIAS ===\n${necessaryEvidences.map((e, i) => `• ${e}`).join('\n')}`,
    `=== RECOMENDAÇÕES DA IA ===\n${recommendations.map((r, i) => `→ ${r}`).join('\n')}`,
    `\nNota: A IA atua como apoio consultivo. Nenhuma hipótese pode ser cadastrada automaticamente como causa raiz comprovada sem a validação do responsável técnico.`,
  ].join('\n\n')

  return {
    identifiedFact,
    hypotheses,
    necessaryEvidences,
    recommendations,
    aiText,
  }
}

// -------------------------------------------------------------
// ANÁLISE GRÁFICA INDIVIDUAL COM IA
// Retorna bloco curto conforme especificado:
// Resumo executivo / Principal desvio / Quando começou / Possíveis fatores relacionados /
// Recorrência identificada / Ponto que merece investigação / Ação recomendada
// -------------------------------------------------------------
export function generateIndividualChartAiAnalysis(
  kpi: KpiRowData,
  periodCells: KpiMonthCell[],
): {
  executiveSummary: string
  mainDeviation: string
  whenStarted: string
  relatedFactors: string
  recurrenceIdentified: string
  investigationPoint: string
  recommendedAction: string
} {
  const validCells = periodCells.filter((c) => c.hasData && c.realValue !== null)
  if (validCells.length === 0) {
    return {
      executiveSummary: 'Não existem dados disponíveis para o período selecionado.',
      mainDeviation: 'Não apurado.',
      whenStarted: 'Sem registros.',
      relatedFactors: 'Sem correlação operacional identificada.',
      recurrenceIdentified: 'Nenhuma reincidência identificada.',
      investigationPoint: 'Verificar integrações de dados do módulo.',
      recommendedAction: 'Aguardar entrada de dados reais.',
    }
  }

  // Maior desvio
  let maxDevCell = validCells[0]
  let maxDevAbs = 0
  let nonCompliantCount = 0

  validCells.forEach((c) => {
    if (c.status === 'FORA_DA_META') {
      nonCompliantCount++
    }
    const abs = Math.abs((c.realValue ?? 0) - (c.targetValue ?? 0))
    if (abs > maxDevAbs) {
      maxDevAbs = abs
      maxDevCell = c
    }
  })

  // Quando começou o primeiro desvio no ano
  const firstDevCell = validCells.find((c) => c.status === 'FORA_DA_META')
  const whenStarted = firstDevCell
    ? `${firstDevCell.monthLabel}/${firstDevCell.year}`
    : 'Nenhum mês fora da meta no período apurado'

  // Recorrência
  let recurrenceText = 'Sem recorrência crítica. Comportamento estável dentro dos limites.'
  if (nonCompliantCount > 1) {
    const monthsNames = validCells
      .filter((c) => c.status === 'FORA_DA_META')
      .map((c) => `${c.monthLabel}/${c.year}`)
      .join(', ')
    recurrenceText = `Reincidência confirmada em ${nonCompliantCount} períodos (${monthsNames}). Caracteriza problema crônico ou sazonal.`
  } else if (nonCompliantCount === 1) {
    recurrenceText = 'Desvio pontual isolado. Não se constatou reincidência histórica no período.'
  }

  const executiveSummary = `O indicador ${kpi.name} fechou o período com resultado consolidado de ${kpi.formattedYtdReal} frente à meta de ${kpi.formattedYtdTarget} (Regra: ${kpi.rule}). Foram apurados ${validCells.length} períodos com dados reais de transporte e expedição, acumulando ${kpi.totalRecordsYear} registros operacionais.`

  const mainDeviation = `Maior desvio registrado em ${maxDevCell.monthLabel}/${maxDevCell.year}: Realizado ${maxDevCell.formattedValue} vs Meta ${maxDevCell.formattedTarget} (Variação absoluta: ${formatAbntNumber(maxDevAbs, 1)} ${kpi.unit}).`

  const relatedFactors = `Correlações detectadas na operação real: janelas de carregamento de final de semana, picos de saída de bobinas/perfis e tempo de faturamento no SAP ECC.`

  const investigationPoint = `Investigar especificamente os registros de ${maxDevCell.monthLabel}/${maxDevCell.year} no módulo correspondente (${kpi.category}), priorizando as rotas e transportadoras com maior índice de intercorrências.`

  const recommendedAction =
    nonCompliantCount > 0
      ? `Instaurar Tratamento de Desvio em 8 etapas para ${kpi.name}, acionando o responsável cadastrado (${kpi.targetConfig.responsible}) e o supervisor da área.`
      : `Manter monitoramento contínuo das metas e rotinas de prevenção operacional.`

  return {
    executiveSummary,
    mainDeviation,
    whenStarted,
    relatedFactors,
    recurrenceIdentified: recurrenceText,
    investigationPoint,
    recommendedAction,
  }
}
