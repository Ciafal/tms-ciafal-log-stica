// TMS CIAFAL — Sprint 6: Motor de Rentabilidade Logística & Previsto x Realizado
// Arquitetura: DADOS CORPORATIVOS → MOTOR DETERMINÍSTICO → OTIMIZADOR → IA ANALISA E EXPLICA → PROGRAMAÇÃO PROPOSTA → HUMANO APROVA → EXECUÇÃO.

export interface CommercialRateItem {
  itinerary_code: string
  destination: string
  rate_per_ton: number
  min_freight: number
}

export interface CommercialFreightTable {
  id?: string
  version: string
  name: string
  base_origin: string
  effective_date_start: string
  effective_date_end?: string
  is_active: boolean
  rates: CommercialRateItem[]
  notes?: string
}

export const DEFAULT_COMMERCIAL_TABLE: CommercialFreightTable = {
  version: 'TAB-COM-2025.1',
  name: 'Tabela Comercial de Fretes CIAFAL — Base SP',
  base_origin: 'SP',
  effective_date_start: '2025-01-01',
  is_active: true,
  notes: 'Tabela versionada e auditável para precificação com BASE SP.',
  rates: [
    {
      itinerary_code: 'MG001A',
      destination: 'Belo Horizonte / Contagem',
      rate_per_ton: 210.5,
      min_freight: 4200,
    },
    {
      itinerary_code: 'MG002B',
      destination: 'Juiz de Fora / Zona da Mata',
      rate_per_ton: 195.0,
      min_freight: 3900,
    },
    {
      itinerary_code: 'RJ001A',
      destination: 'Rio de Janeiro / Baixada',
      rate_per_ton: 240.0,
      min_freight: 4800,
    },
    {
      itinerary_code: 'SP001A',
      destination: 'Campinas / Paulínia',
      rate_per_ton: 120.0,
      min_freight: 2400,
    },
    {
      itinerary_code: 'SP002B',
      destination: 'Ribeirão Preto / Sertãozinho',
      rate_per_ton: 165.0,
      min_freight: 3300,
    },
    {
      itinerary_code: 'PR001A',
      destination: 'Curitiba / Região Metropolitana',
      rate_per_ton: 225.0,
      min_freight: 4500,
    },
    {
      itinerary_code: 'GO001A',
      destination: 'Goiânia / Anápolis',
      rate_per_ton: 285.0,
      min_freight: 5700,
    },
  ],
}

export interface FreightPlannedCalculationInput {
  itineraryCode: string
  weightKg: number
  distanceKm: number
  vehicleType: string
  axlesCount?: number
  customerRatesOverride?: { ratePerTon?: number; totalCharged?: number }
  table?: CommercialFreightTable
}

export interface FreightPlannedCalculationResult {
  receitaFretePrevista: number
  fretePrevistoMotorista: number
  pedagioPrevisto: number
  outrosCustosPrevistos: number
  custoTotalPrevisto: number
  resultadoPrevisto: number
  margemPrevistaPct: number
  ratePerTonUsed: number
  baseOrigin: string
  tableVersion: string
}

export interface FreightRealizedCalculationInput {
  receitaFreteReal: number
  fretePagoMotorista: number
  pedagioReal: number
  outrosCustosReais?: number
  resultadoPrevistoRef?: number
  fretePrevistoMotoristaRef?: number
}

export interface FreightRealizedCalculationResult {
  receitaFreteReal: number
  fretePagoMotorista: number
  pedagioReal: number
  outrosCustosReais: number
  custoTotalReal: number
  resultadoRealizado: number
  margemRealizadaPct: number
  desvioResultado: number
  desvioResultadoPct: number
  desvioFreteMotorista: number
  isDesvioFavoravel: boolean
  isLucrativo: boolean
}

/**
 * Motor de Cálculo do Resultado Previsto (Antes da Contratação)
 * Fórmula: resultado_previsto = receita_frete_prevista - frete_previsto_motorista - pedagio_previsto - outros_custos_previstos
 */
export function calculatePlannedFreightResult(
  input: FreightPlannedCalculationInput,
): FreightPlannedCalculationResult {
  const {
    itineraryCode,
    weightKg,
    distanceKm,
    vehicleType,
    axlesCount = 5,
    customerRatesOverride,
    table = DEFAULT_COMMERCIAL_TABLE,
  } = input

  const weightTons = Math.max(0, weightKg / 1000)
  const matchingRate = table.rates.find((r) => r.itinerary_code === itineraryCode)
  const defaultRatePerTon = matchingRate?.rate_per_ton || 180.0
  const ratePerTonUsed = customerRatesOverride?.ratePerTon || defaultRatePerTon

  let receitaFretePrevista = 0
  if (customerRatesOverride?.totalCharged !== undefined) {
    receitaFretePrevista = customerRatesOverride.totalCharged
  } else {
    receitaFretePrevista = Math.max(
      matchingRate?.min_freight || 0,
      Math.round(weightTons * ratePerTonUsed * 100) / 100,
    )
  }

  // Estimativa de Frete Motorista baseado em ANTT + Fator de Mercado
  const baseCostPerKm = vehicleType.toLowerCase().includes('bitrem')
    ? 9.5
    : vehicleType.toLowerCase().includes('truck')
      ? 5.8
      : 7.8
  const fretePrevistoMotorista = Math.round(distanceKm * baseCostPerKm * 100) / 100

  // Pedágio estimado por eixos
  const tollsCount = Math.max(1, Math.floor(distanceKm / 60))
  const pedagioPrevisto = Math.round(tollsCount * (4.5 * axlesCount) * 100) / 100
  const outrosCustosPrevistos = 50.0 // Despesas operacionais acessórias estimadas

  const custoTotalPrevisto =
    Math.round((fretePrevistoMotorista + pedagioPrevisto + outrosCustosPrevistos) * 100) / 100
  const resultadoPrevisto = Math.round((receitaFretePrevista - custoTotalPrevisto) * 100) / 100
  const margemPrevistaPct =
    receitaFretePrevista > 0
      ? Math.round((resultadoPrevisto / receitaFretePrevista) * 10000) / 100
      : 0

  return {
    receitaFretePrevista,
    fretePrevistoMotorista,
    pedagioPrevisto,
    outrosCustosPrevistos,
    custoTotalPrevisto,
    resultadoPrevisto,
    margemPrevistaPct,
    ratePerTonUsed,
    baseOrigin: table.base_origin,
    tableVersion: table.version,
  }
}

/**
 * Motor de Cálculo do Resultado Realizado (Após Fechamento na Mesa de Fretes)
 * Fórmula: resultado_realizado = receita_frete_real - frete_pago_motorista - pedagio_real - outros_custos_reais
 * Desvios: desvio_resultado = resultado_realizado - resultado_previsto
 *          desvio_frete_motorista = frete_real - frete_previsto
 */
export function calculateRealizedFreightResult(
  input: FreightRealizedCalculationInput,
): FreightRealizedCalculationResult {
  const {
    receitaFreteReal,
    fretePagoMotorista,
    pedagioReal,
    outrosCustosReais = 0,
    resultadoPrevistoRef = 0,
    fretePrevistoMotoristaRef = fretePagoMotorista,
  } = input

  const custoTotalReal =
    Math.round((fretePagoMotorista + pedagioReal + outrosCustosReais) * 100) / 100
  const resultadoRealizado = Math.round((receitaFreteReal - custoTotalReal) * 100) / 100
  const margemRealizadaPct =
    receitaFreteReal > 0 ? Math.round((resultadoRealizado / receitaFreteReal) * 10000) / 100 : 0

  const desvioResultado = Math.round((resultadoRealizado - resultadoPrevistoRef) * 100) / 100
  const desvioResultadoPct =
    resultadoPrevistoRef !== 0
      ? Math.round((desvioResultado / Math.abs(resultadoPrevistoRef)) * 10000) / 100
      : 0

  const desvioFreteMotorista =
    Math.round((fretePagoMotorista - fretePrevistoMotoristaRef) * 100) / 100

  const isDesvioFavoravel = desvioResultado >= 0
  const isLucrativo = resultadoRealizado > 0

  return {
    receitaFreteReal,
    fretePagoMotorista,
    pedagioReal,
    outrosCustosReais,
    custoTotalReal,
    resultadoRealizado,
    margemRealizadaPct,
    desvioResultado,
    desvioResultadoPct,
    desvioFreteMotorista,
    isDesvioFavoravel,
    isLucrativo,
  }
}

export interface ProfitabilityAggregations {
  totalCargas: number
  totalPesoTons: number
  totalReceitaFrete: number
  totalFretePago: number
  totalPedagio: number
  totalOutrosCustos: number
  totalResultadoPrevisto: number
  totalResultadoRealizado: number
  totalDesvio: number
  margemMediaPct: number
  acuraciaPrevisaoFretePct: number
  erroMedioReais: number
  rotasPrejuizoCount: number
  cargasComPrejuizoCount: number
}

/**
 * Agregador e Analisador de Rentabilidade por Dimensões
 */
export function aggregateProfitability(records: any[]): ProfitabilityAggregations {
  const totalCargas = records.length
  if (totalCargas === 0) {
    return {
      totalCargas: 0,
      totalPesoTons: 0,
      totalReceitaFrete: 0,
      totalFretePago: 0,
      totalPedagio: 0,
      totalOutrosCustos: 0,
      totalResultadoPrevisto: 0,
      totalResultadoRealizado: 0,
      totalDesvio: 0,
      margemMediaPct: 0,
      acuraciaPrevisaoFretePct: 100,
      erroMedioReais: 0,
      rotasPrejuizoCount: 0,
      cargasComPrejuizoCount: 0,
    }
  }

  let totalPesoKg = 0
  let totalReceita = 0
  let totalFretePago = 0
  let totalPedagio = 0
  let totalOutros = 0
  let totalPrevisto = 0
  let totalRealizado = 0
  let totalAbsError = 0
  let cargasNegativas = 0

  records.forEach((r) => {
    totalPesoKg += Number(r.total_weight_kg || 0)
    totalReceita += Number(r.receita_frete_real || r.receita_frete_prevista || 0)
    totalFretePago += Number(r.frete_pago_motorista || r.frete_previsto_motorista || 0)
    totalPedagio += Number(r.pedagio_real || r.pedagio_previsto || 0)
    totalOutros += Number(r.outros_custos_reais || r.outros_custos_previstos || 0)
    totalPrevisto += Number(r.resultado_previsto || 0)
    const real = Number(r.resultado_realizado ?? r.resultado_previsto ?? 0)
    totalRealizado += real

    const fretePrev = Number(r.frete_previsto_motorista || 0)
    const freteReal = Number(r.frete_pago_motorista || fretePrev)
    totalAbsError += Math.abs(freteReal - fretePrev)

    if (real < 0) cargasNegativas++
  })

  const totalDesvio = Math.round((totalRealizado - totalPrevisto) * 100) / 100
  const margemMediaPct =
    totalReceita > 0 ? Math.round((totalRealizado / totalReceita) * 10000) / 100 : 0
  const erroMedioReais = Math.round((totalAbsError / totalCargas) * 100) / 100
  const acuraciaPrevisaoFretePct =
    totalFretePago > 0
      ? Math.max(0, Math.round((1 - totalAbsError / totalFretePago) * 10000) / 100)
      : 100

  return {
    totalCargas,
    totalPesoTons: Math.round((totalPesoKg / 1000) * 10) / 10,
    totalReceitaFrete: Math.round(totalReceita * 100) / 100,
    totalFretePago: Math.round(totalFretePago * 100) / 100,
    totalPedagio: Math.round(totalPedagio * 100) / 100,
    totalOutrosCustos: Math.round(totalOutros * 100) / 100,
    totalResultadoPrevisto: Math.round(totalPrevisto * 100) / 100,
    totalResultadoRealizado: Math.round(totalRealizado * 100) / 100,
    totalDesvio,
    margemMediaPct,
    acuraciaPrevisaoFretePct,
    erroMedioReais,
    rotasPrejuizoCount: 0,
    cargasComPrejuizoCount: cargasNegativas,
  }
}
