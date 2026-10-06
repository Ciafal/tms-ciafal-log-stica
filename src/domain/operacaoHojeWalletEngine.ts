/**
 * OperacaoHojeWalletEngine - Motor de classificação e cruzamento de indicadores
 * para a seção "Operação Hoje (Disponibilidade & Montagem)" da Torre de Controle / Home TMS CIAFAL.
 *
 * Fontes oficiais: SAP ECC (sap_sales_orders / ZSD35 via RFC), sap_stock_current, sap_zsd004, queue_entries.
 * Regras estritas:
 * 1. Carteira com Estoque s/ Crédito:
 *    - Pendente > 0 E estoque disponível (suficiente ou parcial) E restrição/bloqueio de crédito
 *    - Não contar estoque comprometido/reservado
 * 2. Carteira s/ Estoque:
 *    - Pendente > estoque disponível para atendimento
 *    - Diferenciar "Sem estoque" (estoque = 0) e "Estoque parcial" (estoque > 0, mas insuficiente)
 * 3. Match Veículos × Estoque:
 *    - Cruza veículos disponíveis (PORTA / FORA / PROGRAMADO) + carteira apta + estoque + itinerário + capacidade
 *    - Score 0-100 explicável por oportunidade
 *    - Evita dupla contagem entre os 3 estados da carteira única
 */

import type {
  SapSalesOrderEntity,
  QueueEntryEntity,
  VehicleEntity,
  DriverEntity,
  FreightRuleParameterEntity,
} from '@/domain/rules'
import {
  runVehicleLoadMatchingEngine,
  type VehicleLoadMatch,
  type CandidateLoadProposal,
} from '@/domain/vehicleLoadMatchingEngine'

export interface OrderStockCreditClassification {
  order: SapSalesOrderEntity
  // Quantidade solicitada
  quantityRequested: number
  // Quantidade pendente
  pendingQty: number
  // Peso pendente em kg e toneladas
  pendingWeightKg: number
  pendingWeightTon: number
  // Estoque efetivamente disponível (considerando estoque físico subtraído de reservas)
  effectiveStockTon: number
  effectiveStockKg: number
  // Déficit
  deficitTon: number
  deficitKg: number
  // Status de Estoque
  stockClassification: 'SUFICIENTE' | 'PARCIAL' | 'SEM_ESTOQUE'
  // Status de Crédito
  hasCreditRestriction: boolean
  creditStatus: string
  creditReason: string
  // Categoria na Home
  category: 'ESTOQUE_SEM_CREDITO' | 'SEM_ESTOQUE' | 'ESTOQUE_PARCIAL' | 'APTO_LOGISTICA'
}

export interface CarteiraEstoqueSemCreditoSummary {
  ordersCount: number
  itemsCount: number
  totalTons: number
  items: OrderStockCreditClassification[]
}

export interface CarteiraSemEstoqueSummary {
  ordersCount: number
  itemsCount: number
  missingTons: number
  totalPendingTons: number
  semEstoqueCount: number
  semEstoqueTons: number
  estoqueParcialCount: number
  estoqueParcialTons: number
  items: OrderStockCreditClassification[]
}

export interface MatchVeiculosEstoqueSummary {
  matchesCount: number
  vehiclesWithMatchesCount: number
  potentialTons: number
  matches: VehicleLoadMatch[]
}

export interface OperacaoHojeAnalysis {
  estoqueSemCredito: CarteiraEstoqueSemCreditoSummary
  semEstoque: CarteiraSemEstoqueSummary
  matchVeiculosEstoque: MatchVeiculosEstoqueSummary
  totalOrdersAnalyzed: number
  generatedAt: string
}

/**
 * Calcula o estoque efetivamente disponível do item do pedido
 * considerando saldo total ou estoque_disponivel / stock_dp34 menos reservas
 */
export function getOrderEffectiveStockTon(order: SapSalesOrderEntity): {
  stockTon: number
  stockKg: number
} {
  // Se houver saldo declarado no pedido ZSD35:
  // stock_available ou stock_total ou stock_dp34 ou stock_quantity_kg
  let stockTon = 0

  if (typeof order.stock_available === 'number' && order.stock_available > 0) {
    stockTon = order.stock_available
  } else if (typeof order.stock_total === 'number' && order.stock_total > 0) {
    stockTon = order.stock_total
  } else if (typeof order.stock_dp34 === 'number' && order.stock_dp34 > 0) {
    stockTon = order.stock_dp34
  } else if (typeof order.stock_quantity_kg === 'number' && order.stock_quantity_kg > 0) {
    stockTon = order.stock_quantity_kg / 1000
  }

  // Descontar estoque reservado/bloqueado se reportado
  const reservedTon = (order as any).reserved_quantity_ton || 0
  stockTon = Math.max(0, stockTon - reservedTon)

  return {
    stockTon,
    stockKg: stockTon * 1000,
  }
}

/**
 * Verifica se um pedido possui restrição ou bloqueio de crédito
 */
export function isOrderCreditRestricted(order: SapSalesOrderEntity): boolean {
  if (order.credit_status === 'Bloqueado') return true

  // Verificações em credit_reason e credit_condition
  const reason = (order.credit_reason || '').toUpperCase()
  if (
    reason.includes('BLOQUEADO') ||
    reason.includes('ATRASADO') ||
    reason.includes('TÍTULOS EM ABERTO') ||
    reason.includes('TITULOS EM ABERTO') ||
    reason.includes('LIMITE DE CRÉDITO') ||
    reason.includes('LIMITE EXCEDIDO')
  ) {
    return true
  }

  // Pedidos 'Em Análise' com pendência financeira que impeça liberação
  if (order.credit_status === 'Em Análise') {
    // Se limite de crédito for 0 ou menor que o valor do pedido, é restrição
    const limit = order.credit_limit || 0
    const orderVal = order.total_value || order.order_value || 0
    if (limit <= 0 || (orderVal > 0 && limit < orderVal)) {
      return true
    }
  }

  return false
}

/**
 * Classifica a carteira de pedidos com regras unificadas sem dupla contagem
 */
export function classifySalesOrdersForOperacaoHoje(orders: SapSalesOrderEntity[]): {
  classifications: OrderStockCreditClassification[]
  estoqueSemCredito: CarteiraEstoqueSemCreditoSummary
  semEstoque: CarteiraSemEstoqueSummary
} {
  const classifications: OrderStockCreditClassification[] = []

  const semCreditoItems: OrderStockCreditClassification[] = []
  const semEstoqueItems: OrderStockCreditClassification[] = []

  orders.forEach((ord) => {
    // Quantidade pendente: se balance_quantity_kg existir e for > 0, usar; caso contrário weight_kg
    const pendingWeightKg =
      typeof ord.balance_quantity_kg === 'number' && ord.balance_quantity_kg > 0
        ? ord.balance_quantity_kg
        : ord.weight_kg || 0
    const pendingWeightTon = pendingWeightKg / 1000

    // Se o pedido não tem peso pendente > 0, não é considerado pendente
    if (pendingWeightKg <= 0) return

    const { stockTon, stockKg } = getOrderEffectiveStockTon(ord)
    const hasCreditRestriction = isOrderCreditRestricted(ord)

    let stockClassification: 'SUFICIENTE' | 'PARCIAL' | 'SEM_ESTOQUE' = 'SUFICIENTE'
    if (stockTon <= 0) {
      stockClassification = 'SEM_ESTOQUE'
    } else if (stockTon < pendingWeightTon) {
      stockClassification = 'PARCIAL'
    } else {
      stockClassification = 'SUFICIENTE'
    }

    const deficitTon = Math.max(0, pendingWeightTon - stockTon)
    const deficitKg = deficitTon * 1000

    let category: OrderStockCreditClassification['category'] = 'APTO_LOGISTICA'

    // Regra 1: Carteira com Estoque s/ Crédito
    // Pedido possui material disponível fisicamente (suficiente ou parcial)
    // E possui restrição ou bloqueio de crédito do cliente
    if (stockTon > 0 && hasCreditRestriction) {
      category = 'ESTOQUE_SEM_CREDITO'
    }
    // Regra 2: Carteira s/ Estoque
    // Pedido liberado comercialmente (ou com crédito não impeditivo) mas estoque insuficiente
    else if (stockTon < pendingWeightTon) {
      category = stockTon <= 0 ? 'SEM_ESTOQUE' : 'ESTOQUE_PARCIAL'
    } else {
      category = 'APTO_LOGISTICA'
    }

    const classified: OrderStockCreditClassification = {
      order: ord,
      quantityRequested:
        ord.quantity_order || ord.balance_quantity || (ord.weight_kg ? ord.weight_kg / 1000 : 1),
      pendingQty: ord.balance_quantity || (pendingWeightKg ? pendingWeightKg / 1000 : 1),
      pendingWeightKg,
      pendingWeightTon,
      effectiveStockTon: stockTon,
      effectiveStockKg: stockKg,
      deficitTon,
      deficitKg,
      stockClassification,
      hasCreditRestriction,
      creditStatus: ord.credit_status || 'Em Análise',
      creditReason:
        ord.credit_reason ||
        (hasCreditRestriction ? 'Restrição de Crédito Ativa' : 'Crédito Liberado'),
      category,
    }

    classifications.push(classified)

    if (category === 'ESTOQUE_SEM_CREDITO') {
      semCreditoItems.push(classified)
    } else if (category === 'SEM_ESTOQUE' || category === 'ESTOQUE_PARCIAL') {
      semEstoqueItems.push(classified)
    }
  })

  // Agregações Carteira com Estoque s/ Crédito
  const uniqueOrdersSemCredito = new Set(semCreditoItems.map((i) => i.order.order_number)).size
  const totalTonsSemCredito = semCreditoItems.reduce((sum, i) => sum + i.pendingWeightTon, 0)

  // Agregações Carteira s/ Estoque
  const uniqueOrdersSemEstoque = new Set(semEstoqueItems.map((i) => i.order.order_number)).size
  const missingTonsSemEstoque = semEstoqueItems.reduce((sum, i) => sum + i.deficitTon, 0)
  const totalPendingTonsSemEstoque = semEstoqueItems.reduce((sum, i) => sum + i.pendingWeightTon, 0)

  const semEstoqueOnly = semEstoqueItems.filter((i) => i.stockClassification === 'SEM_ESTOQUE')
  const estoqueParcialOnly = semEstoqueItems.filter((i) => i.stockClassification === 'PARCIAL')

  return {
    classifications,
    estoqueSemCredito: {
      ordersCount: uniqueOrdersSemCredito,
      itemsCount: semCreditoItems.length,
      totalTons: Math.round(totalTonsSemCredito * 100) / 100,
      items: semCreditoItems,
    },
    semEstoque: {
      ordersCount: uniqueOrdersSemEstoque,
      itemsCount: semEstoqueItems.length,
      missingTons: Math.round(missingTonsSemEstoque * 100) / 100,
      totalPendingTons: Math.round(totalPendingTonsSemEstoque * 100) / 100,
      semEstoqueCount: semEstoqueOnly.length,
      semEstoqueTons: Math.round(semEstoqueOnly.reduce((s, i) => s + i.deficitTon, 0) * 100) / 100,
      estoqueParcialCount: estoqueParcialOnly.length,
      estoqueParcialTons:
        Math.round(estoqueParcialOnly.reduce((s, i) => s + i.deficitTon, 0) * 100) / 100,
      items: semEstoqueItems,
    },
  }
}

/**
 * Executa o cálculo consolidado para a Seção "Operação Hoje"
 */
export function computeOperacaoHojeAnalysis(params: {
  orders: SapSalesOrderEntity[]
  queueEntries: QueueEntryEntity[]
  vehicles?: VehicleEntity[]
  drivers?: DriverEntity[]
  freightRuleParameters?: FreightRuleParameterEntity[]
}): OperacaoHojeAnalysis {
  const { orders, queueEntries, vehicles = [], drivers = [], freightRuleParameters = [] } = params

  // 1. Classificação de Carteira com Estoque s/ Crédito e Carteira s/ Estoque
  const { estoqueSemCredito, semEstoque } = classifySalesOrdersForOperacaoHoje(orders)

  // 2. Executar motor determinístico de Match Veículos × Estoque
  // Considera apenas pedidos que NÃO tenham restrição de crédito e que tenham estoque pronto/parcial
  const aptOrders = orders.filter((o) => !isOrderCreditRestricted(o))

  const engineResult = runVehicleLoadMatchingEngine({
    queueEntries,
    salesOrders: aptOrders,
    vehicles,
    drivers,
    freightRuleParameters,
    sortCriteria: 'MELHOR_SCORE',
  })

  // Agrupar veículos distintos com ao menos 1 match viável
  const matchedVehiclePlates = new Set(engineResult.matches.map((m) => m.vehiclePlate))
  const potentialTons = engineResult.matches.reduce(
    (sum: number, m: VehicleLoadMatch) => sum + (m.candidateLoad.totalWeightKg || 0) / 1000,
    0,
  )

  return {
    estoqueSemCredito,
    semEstoque,
    matchVeiculosEstoque: {
      matchesCount: engineResult.viableMatchesCount,
      vehiclesWithMatchesCount: matchedVehiclePlates.size,
      potentialTons: Math.round(potentialTons * 100) / 100,
      matches: engineResult.matches,
    },
    totalOrdersAnalyzed: orders.length,
    generatedAt: new Date().toISOString(),
  }
}
