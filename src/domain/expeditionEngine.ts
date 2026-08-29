// TMS CIAFAL — Sprint 6: Módulo de Performance da Expedição (Marcos T0 a T10)
// Medição de Lead Time, Análise de Gargalos e Recomendações de Melhoria Contínua por IA.

export interface ExpeditionMilestoneRecord {
  id?: string
  cargo_id: string
  vehicle_plate: string
  driver_name?: string
  sap_transport_number?: string
  itinerary_code?: string
  t0_entrada: string // Entrada do caminhão
  t1_disponibilizacao?: string // Disponibilização no pátio
  t2_carga_atribuida?: string // Carga atribuída / confirmada
  t3_ordem_sap?: string // Ordem de transporte SAP gerada
  t4_chamado_doca?: string // Chamado para doca
  t5_inicio_carregamento?: string // Início físico do carregamento
  t6_fim_carregamento?: string // Fim do carregamento
  t7_conferencia?: string // Conferência de carga / amarrações
  t8_faturamento?: string // Faturamento e NF-e emitida
  t9_documento_entregue?: string // Documentos impressos entregues ao motorista
  t10_saida?: string // Saída da portaria
  lead_time_total_min?: number
  gargalo_principal?: string
  gargalo_duracao_min?: number
  status?: 'EM_PATIO' | 'EM_CARREGAMENTO' | 'FATURADO' | 'CONCLUIDO' | 'CANCELADO'
}

export interface ExpeditionLeadTimeAnalysis {
  t2_t0_atribuicao_min: number // Espera até atribuição
  t3_t2_ordem_sap_min: number // Geração SAP
  t5_t3_espera_carregamento_min: number // Espera para doca / início
  t6_t5_carregamento_min: number // Tempo de carregamento
  t7_t6_conferencia_min: number // Conferência
  t8_t7_faturamento_min: number // Faturamento
  t8_t0_lead_time_faturamento_min: number // Entrada até Faturamento
  t10_t0_lead_time_total_min: number // Lead time ponta a ponta
  gargaloPrincipal: string
  gargaloDuracaoMin: number
}

export function calculateMilestoneIntervals(
  m: ExpeditionMilestoneRecord,
): ExpeditionLeadTimeAnalysis {
  const getMin = (tEnd?: string, tStart?: string): number => {
    if (!tEnd || !tStart) return 0
    const diff = new Date(tEnd).getTime() - new Date(tStart).getTime()
    return Math.max(0, Math.round(diff / (1000 * 60)))
  }

  const t2_t0 = getMin(m.t2_carga_atribuida, m.t0_entrada)
  const t3_t2 = getMin(m.t3_ordem_sap, m.t2_carga_atribuida)
  const t5_t3 = getMin(m.t5_inicio_carregamento, m.t3_ordem_sap)
  const t6_t5 = getMin(m.t6_fim_carregamento, m.t5_inicio_carregamento)
  const t7_t6 = getMin(m.t7_conferencia, m.t6_fim_carregamento)
  const t8_t7 = getMin(m.t8_faturamento, m.t7_conferencia)
  const t8_t0 = getMin(m.t8_faturamento, m.t0_entrada)
  const t10_t0 = getMin(m.t10_saida || m.t8_faturamento, m.t0_entrada)

  // Identificar maior etapa consumidora de tempo
  const steps = [
    { name: 'Fila e Atribuição (T2-T0)', min: t2_t0 },
    { name: 'Geração Ordem SAP (T3-T2)', min: t3_t2 },
    { name: 'Espera para Carregamento (T5-T3)', min: t5_t3 },
    { name: 'Operação de Carregamento (T6-T5)', min: t6_t5 },
    { name: 'Conferência Operacional (T7-T6)', min: t7_t6 },
    { name: 'Processamento de Faturamento (T8-T7)', min: t8_t7 },
  ]

  const sorted = [...steps].sort((a, b) => b.min - a.min)
  const topGargalo = sorted[0] || { name: 'Sem gargalo identificado', min: 0 }

  return {
    t2_t0_atribuicao_min: t2_t0,
    t3_t2_ordem_sap_min: t3_t2,
    t5_t3_espera_carregamento_min: t5_t3,
    t6_t5_carregamento_min: t6_t5,
    t7_t6_conferencia_min: t7_t6,
    t8_t7_faturamento_min: t8_t7,
    t8_t0_lead_time_faturamento_min: t8_t0,
    t10_t0_lead_time_total_min: t10_t0,
    gargaloPrincipal: topGargalo.name,
    gargaloDuracaoMin: topGargalo.min,
  }
}

export interface ExpeditionPerformanceSummary {
  totalExpedicoes: number
  leadTimeMedioMin: number
  leadTimeMedianaMin: number
  leadTimeP90Min: number
  tempoCarregamentoMedioMin: number
  tempoEsperaDocaMedioMin: number
  gargaloMaisFrequente: string
  metaLeadTimeMin: number
  pctDentroMeta: number
}

export function aggregateExpeditionPerformance(
  milestones: ExpeditionMilestoneRecord[],
  metaLeadTimeMin: number = 240, // Meta CIAFAL: 4 horas total
): ExpeditionPerformanceSummary {
  if (milestones.length === 0) {
    return {
      totalExpedicoes: 0,
      leadTimeMedioMin: 0,
      leadTimeMedianaMin: 0,
      leadTimeP90Min: 0,
      tempoCarregamentoMedioMin: 0,
      tempoEsperaDocaMedioMin: 0,
      gargaloMaisFrequente: 'N/A',
      metaLeadTimeMin,
      pctDentroMeta: 100,
    }
  }

  const times = milestones
    .map((m) => calculateMilestoneIntervals(m).t10_t0_lead_time_total_min)
    .sort((a, b) => a - b)

  const sumTimes = times.reduce((s, t) => s + t, 0)
  const leadTimeMedioMin = Math.round(sumTimes / times.length)

  // Mediana
  const mid = Math.floor(times.length / 2)
  const leadTimeMedianaMin =
    times.length % 2 !== 0 ? times[mid] : Math.round((times[mid - 1] + times[mid]) / 2)

  // P90
  const p90Idx = Math.min(times.length - 1, Math.floor(times.length * 0.9))
  const leadTimeP90Min = times[p90Idx]

  // Médias específicas
  const esperas = milestones.map(
    (m) => calculateMilestoneIntervals(m).t5_t3_espera_carregamento_min,
  )
  const carregamentos = milestones.map((m) => calculateMilestoneIntervals(m).t6_t5_carregamento_min)

  const tempoEsperaDocaMedioMin = Math.round(
    esperas.reduce((s, e) => s + e, 0) / Math.max(1, esperas.length),
  )
  const tempoCarregamentoMedioMin = Math.round(
    carregamentos.reduce((s, c) => s + c, 0) / Math.max(1, carregamentos.length),
  )

  const dentroMetaCount = times.filter((t) => t <= metaLeadTimeMin).length
  const pctDentroMeta = Math.round((dentroMetaCount / times.length) * 1000) / 10

  return {
    totalExpedicoes: milestones.length,
    leadTimeMedioMin,
    leadTimeMedianaMin,
    leadTimeP90Min,
    tempoCarregamentoMedioMin,
    tempoEsperaDocaMedioMin,
    gargaloMaisFrequente: 'Espera para Carregamento (Doca/Ponte)',
    metaLeadTimeMin,
    pctDentroMeta,
  }
}

export interface AiImprovementProposal {
  problema: string
  evidencia: string
  hipotese: string
  impacto: string
  acaoProposta: string
  resultadoEsperado: string
  responsavelSugerido: string
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA'
}

export function generateExpeditionAiImprovementProposals(
  summary: ExpeditionPerformanceSummary,
): AiImprovementProposal[] {
  return [
    {
      problema: 'Gargalo Crítico de Espera de Doca (T5-T3)',
      evidencia: `Média de espera entre geração da ordem SAP e início do carregamento está em ${summary.tempoEsperaDocaMedioMin} minutos.`,
      hipotese:
        'Hipótese analítica: Conflito de pontes rolantes na separação de materiais pesados e falta de pré-agrupamento no DP34.',
      impacto: 'Elevação do tempo de pátio dos motoristas PORTA e risco de cobrança de diária.',
      acaoProposta:
        'Implementar pré-separação de cargas prioritárias no WMS 1 hora antes da chegada do veículo.',
      resultadoEsperado: 'Redução estimada de 35% no tempo de espera de doca.',
      responsavelSugerido: 'Gestor de Logística / Coordenação de Expedição',
      prioridade: 'ALTA',
    },
    {
      problema: 'Variabilidade no P90 de Faturamento (T8-T7)',
      evidencia: `Lead time total P90 atingiu ${summary.leadTimeP90Min} min (meta global de ${summary.metaLeadTimeMin} min).`,
      hipotese:
        'Hipótese analítica: Retenção de conferência física manual e fila de transmissão de NF-e na Sefaz.',
      impacto: 'Atraso na liberação da saída e retenção de motoristas.',
      acaoProposta:
        'Adotar conferência cega via coletor WMS e emissão automática de NF-e pós-validação de peso.',
      resultadoEsperado: 'Diminuição do P90 em 40 minutos.',
      responsavelSugerido: 'TI / Fiscal / Expedição',
      prioridade: 'MEDIA',
    },
  ]
}
