// TMS CIAFAL — Torre de Controle de Expedição, SLAs Operacionais e Diagnóstico de Gargalos por IA

export type OperationalExpeditionStatus =
  | 'PROGRAMADA'
  | 'MOTORISTA_CONFIRMADO'
  | 'A_CAMINHO_CIAFAL'
  | 'PRESENCA_NO_PATIO'
  | 'CHECK_IN'
  | 'AGUARDANDO_LIBERACAO'
  | 'AGUARDANDO_ESTOQUE'
  | 'ESTOQUE_LIBERADO'
  | 'EM_SEPARACAO'
  | 'SEPARACAO_CONCLUIDA'
  | 'AGUARDANDO_CARREGAMENTO'
  | 'EM_CARREGAMENTO'
  | 'CARREGAMENTO_CONCLUIDO'
  | 'CONFERENCIA'
  | 'AGUARDANDO_FATURAMENTO'
  | 'FATURADO'
  | 'LIBERADO'
  | 'SAIDA_DO_PATIO'
  | 'EM_VIAGEM'

export interface StageSlaConfig {
  stageCode: string
  stageName: string
  targetMin: number
  warningThresholdPct: number
  criticalThresholdPct: number
  responsibleSector: string
}

export const DEFAULT_EXPEDITION_SLAS: StageSlaConfig[] = [
  {
    stageCode: 'CHECK_IN',
    stageName: 'Entrada / Check-in',
    targetMin: 10,
    warningThresholdPct: 80,
    criticalThresholdPct: 100,
    responsibleSector: 'Portaria e Acesso',
  },
  {
    stageCode: 'AGUARDANDO_ESTOQUE',
    stageName: 'Liberação de Estoque DP34',
    targetMin: 20,
    warningThresholdPct: 80,
    criticalThresholdPct: 100,
    responsibleSector: 'WMS / DP34',
  },
  {
    stageCode: 'EM_SEPARACAO',
    stageName: 'Separação e Picking de Aço',
    targetMin: 30,
    warningThresholdPct: 80,
    criticalThresholdPct: 100,
    responsibleSector: 'WMS / Ponte Rolante',
  },
  {
    stageCode: 'EM_CARREGAMENTO',
    stageName: 'Operação de Carregamento',
    targetMin: 45,
    warningThresholdPct: 80,
    criticalThresholdPct: 100,
    responsibleSector: 'Doca / Expedição',
  },
  {
    stageCode: 'CONFERENCIA',
    stageName: 'Conferência Operacional & Balança',
    targetMin: 15,
    warningThresholdPct: 80,
    criticalThresholdPct: 100,
    responsibleSector: 'Qualidade / Expedição',
  },
  {
    stageCode: 'AGUARDANDO_FATURAMENTO',
    stageName: 'Faturamento SAP & NF-e',
    targetMin: 15,
    warningThresholdPct: 80,
    criticalThresholdPct: 100,
    responsibleSector: 'Fiscal / SAP ECC',
  },
  {
    stageCode: 'LIBERADO',
    stageName: 'Liberação Final de Saída',
    targetMin: 10,
    warningThresholdPct: 80,
    criticalThresholdPct: 100,
    responsibleSector: 'Portaria',
  },
]

export interface ExpeditionTrackingItem {
  id?: string
  cargoId: string
  sapTransportNumber?: string
  driverName: string
  driverDocument?: string
  driverPhone?: string
  vehiclePlate: string
  carrierName?: string
  itineraryCode?: string
  destinationCities: string
  clientsSummary?: string
  weightTotalKg: number
  volumeTotalM3?: number
  deliveriesCount: number
  operationalStatus: OperationalExpeditionStatus
  currentStageName: string
  currentStageStart: string
  currentStageDurationMin: number
  entryTime?: string
  exitTime?: string
  totalLeadTimeMin: number
  targetLeadTimeMin: number
  slaStatus: 'NORMAL' | 'ATENCAO' | 'CRITICO_ATRASADO'
  delayRiskPct: number
  delayRootCause?: string
  delayEvidence?: string
  delaySuggestedAction?: string
  delayReasonCategory?: string
  priorityLevel: 'NORMAL' | 'ALTA' | 'URGENTE' | 'CRITICA'
  wmsStatusDetail?: string
  wmsAvailableWeightKg?: number
  wmsPendingWeightKg?: number
  wmsPriorityRequested?: boolean
  assignedDock?: string
  sourceSystem?: string
  correlationId?: string
}

export interface BottleneckParetoCause {
  category: string
  occurrencesCount: number
  totalDelayMinutes: number
  percentage: number
  accumulatedPercentage: number
  mainRecommendation: string
}

/**
 * Avalia o SLA de uma etapa operacional
 */
export function evaluateStageSla(
  stageCode: string,
  durationMinutes: number,
  customSlas: StageSlaConfig[] = DEFAULT_EXPEDITION_SLAS,
): {
  status: 'NORMAL' | 'ATENCAO' | 'CRITICO_ATRASADO'
  targetMin: number
  deviationMin: number
  pctOfTarget: number
  responsibleSector: string
} {
  const sla = customSlas.find((s) => s.stageCode === stageCode) || {
    targetMin: 30,
    warningThresholdPct: 80,
    criticalThresholdPct: 100,
    responsibleSector: 'Operação Logística',
  }

  const pct = Math.round((durationMinutes / sla.targetMin) * 100)
  const deviation = Math.max(0, durationMinutes - sla.targetMin)

  let status: 'NORMAL' | 'ATENCAO' | 'CRITICO_ATRASADO' = 'NORMAL'
  if (pct >= sla.criticalThresholdPct) {
    status = 'CRITICO_ATRASADO'
  } else if (pct >= sla.warningThresholdPct) {
    status = 'ATENCAO'
  }

  return {
    status,
    targetMin: sla.targetMin,
    deviationMin: deviation,
    pctOfTarget: pct,
    responsibleSector: sla.responsibleSector,
  }
}

/**
 * Calcula o Pareto de Causas Raízes de Atraso na Expedição
 */
export function calculateBottleneckPareto(
  expeditions: ExpeditionTrackingItem[],
): BottleneckParetoCause[] {
  const causesMap: Record<string, { count: number; delayMinutes: number; recommendation: string }> =
    {
      ESTOQUE: {
        count: 0,
        delayMinutes: 0,
        recommendation:
          'Priorizar liberação de saldo no depósito DP34 antes do check-in do motorista.',
      },
      CARREGAMENTO: {
        count: 0,
        delayMinutes: 0,
        recommendation:
          'Sequenciar carretas por doca de acordo com compatibilidade de pontes rolantes.',
      },
      FATURAMENTO: {
        count: 0,
        delayMinutes: 0,
        recommendation: 'Automatizar emissão de NF-e na pesagem final da balança.',
      },
      WMS: {
        count: 0,
        delayMinutes: 0,
        recommendation: 'Adotar pré-separação de bobinas e barras pesadas L2.',
      },
      MOTORISTA: {
        count: 0,
        delayMinutes: 0,
        recommendation: 'Monitorar tempo de rota no app e enviar alerta prévio de pátio.',
      },
      CONFERENCIA: {
        count: 0,
        delayMinutes: 0,
        recommendation: 'Implantar conferência cega via leitores de código de barras.',
      },
      OUTRO: {
        count: 0,
        delayMinutes: 0,
        recommendation: 'Investigar anomalias não mapeadas na trilha de auditoria.',
      },
    }

  let totalDelay = 0

  expeditions.forEach((exp) => {
    if (exp.slaStatus === 'CRITICO_ATRASADO' || exp.delayRiskPct > 50) {
      const cat = exp.delayReasonCategory || 'ESTOQUE'
      const key = causesMap[cat] ? cat : 'OUTRO'
      const delay = Math.max(10, exp.totalLeadTimeMin - exp.targetLeadTimeMin)
      causesMap[key].count += 1
      causesMap[key].delayMinutes += delay
      totalDelay += delay
    }
  })

  const sorted = Object.entries(causesMap)
    .filter(([_, data]) => data.count > 0)
    .sort((a, b) => b[1].delayMinutes - a[1].delayMinutes)

  let runningTotal = 0
  return sorted.map(([category, data]) => {
    runningTotal += data.delayMinutes
    const pct = totalDelay > 0 ? (data.delayMinutes / totalDelay) * 100 : 0
    const accumPct = totalDelay > 0 ? (runningTotal / totalDelay) * 100 : 0

    return {
      category,
      occurrencesCount: data.count,
      totalDelayMinutes: data.delayMinutes,
      percentage: Math.round(pct * 10) / 10,
      accumulatedPercentage: Math.round(accumPct * 10) / 10,
      mainRecommendation: data.recommendation,
    }
  })
}
