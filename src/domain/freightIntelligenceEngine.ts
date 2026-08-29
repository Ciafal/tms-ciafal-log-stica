// TMS CIAFAL — Inteligência de Fretes, Análise de Anomalias e Rentabilidade Cruzada

export interface RouteFreightIntelligence {
  itineraryCode: string
  region: string
  totalCargosCount: number
  totalTonnage: number
  avgFreightValue: number
  avgTollValue: number
  costPerTon: number
  costPerKm: number
  medianFreightValue: number
  minFreightValue: number
  maxFreightValue: number
  acceptanceRatePct: number
  avgDelayMinutes: number
  driverAvailabilityScore: number
  anomaliesDetected: FreightAnomaly[]
}

export interface FreightAnomaly {
  id: string
  tipo:
    | 'CONTRAPROPOSTA_ELEVADA'
    | 'QUEDA_ACEITE'
    | 'DESVIO_CUSTO_KM'
    | 'ATRASO_CRONICO'
    | 'CONFLITO_ESTOQUE'
  observacao: string
  evidencia: string
  desvio: string
  hipoteses: string
  confianca: 'Alta' | 'Média' | 'Muito Alta'
  recomendacaoInvestigacao: string
}

export interface FinancialFreightComparison {
  cargoId: string
  itineraryCode: string
  destinationCity: string
  clientName: string
  receitaFreteCliente: number
  fretePagoMotorista: number
  pedagioPago: number
  outrosCustos: number
  resultadoLogistico: number
  margemLogisticaPct: number
  classificacao: 'ALTA_RENTABILIDADE' | 'BAIXA_RENTABILIDADE' | 'PREJUIZO'
}

/**
 * Detecta tendências e anomalias na inteligência de fretes
 */
export function detectFreightAnomalies(routesData: RouteFreightIntelligence[]): FreightAnomaly[] {
  const anomalies: FreightAnomaly[] = []

  routesData.forEach((r) => {
    if (r.acceptanceRatePct < 55) {
      anomalies.push({
        id: `ANOM-${r.itineraryCode}-01`,
        tipo: 'QUEDA_ACEITE',
        observacao: `Taxa de aceite na rota ${r.itineraryCode} (${r.region}) caiu para ${r.acceptanceRatePct.toFixed(1)}%.`,
        evidencia: `Histórico mostra redução significativa nas respostas positivas dos motoristas PORTA/FORA.`,
        desvio: `Desvio de -${(75 - r.acceptanceRatePct).toFixed(1)} pontos percentuais abaixo da meta esperada.`,
        hipoteses: `Possível pressão de ofertas concorrentes na região ou descompasso entre a meta CIAFAL e o diesel local.`,
        confianca: 'Alta',
        recomendacaoInvestigacao: `Reavaliar a referência de mercado da rota e consultar motoristas parceiros habituais.`,
      })
    }

    if (r.costPerKm > 9.5) {
      anomalies.push({
        id: `ANOM-${r.itineraryCode}-02`,
        tipo: 'DESVIO_CUSTO_KM',
        observacao: `Custo por km na rota ${r.itineraryCode} atingiu R$ ${r.costPerKm.toFixed(2)}/km.`,
        evidencia: `Média do corredor estadual é de R$ 7,80/km para veículos vanderléia/bitrem.`,
        desvio: `Desvio de +${(((r.costPerKm - 7.8) / 7.8) * 100).toFixed(1)}% acima da mediana.`,
        hipoteses: `Concentração de poucas descargas pesadas com baixa densidade de retorno.`,
        confianca: 'Média',
        recomendacaoInvestigacao: `Verificar potencial de cargas de retorno e repassar oportunidades ao CRM 360°.`,
      })
    }
  })

  return anomalies
}

/**
 * Calcula o resultado financeiro logístico comparativo
 */
export function calculateLogisticFinancialResult(
  receitaCliente: number,
  freteMotorista: number,
  pedagio: number,
  outrosCustos: number = 0,
): {
  custoTotal: number
  resultadoLogistico: number
  margemLogisticaPct: number
  classificacao: 'ALTA_RENTABILIDADE' | 'BAIXA_RENTABILIDADE' | 'PREJUIZO'
} {
  const custoTotal = freteMotorista + pedagio + outrosCustos
  const resultado = receitaCliente - custoTotal
  const margemPct = receitaCliente > 0 ? Math.round((resultado / receitaCliente) * 1000) / 10 : 0

  let classificacao: 'ALTA_RENTABILIDADE' | 'BAIXA_RENTABILIDADE' | 'PREJUIZO' =
    'ALTA_RENTABILIDADE'
  if (resultado < 0) {
    classificacao = 'PREJUIZO'
  } else if (margemPct < 8.0) {
    classificacao = 'BAIXA_RENTABILIDADE'
  }

  return {
    custoTotal,
    resultadoLogistico: resultado,
    margemLogisticaPct: margemPct,
    classificacao,
  }
}
