// TMS CIAFAL — Motor de Importação, Validação e Normalização ZSD35A
// Suporta 40 colunas padrão SAP ZSD35A + retrocompatibilidade com 28 colunas anteriores.
// Proteção contra Excel Formula Injection, tipagem estrita, deduplicação por chave técnica,
// classificação de registros (🟢 Válido, 🟡 Válido com alerta, 🔴 Erro impeditivo) e exportação de Template Excel oficial.

import * as XLSX from 'xlsx'

/**
 * 40 Campos Oficiais da Transação SAP ZSD35A
 * Na exata ordenação do layout padrão SAP ECC / ZSD35A
 */
export const ZSD35A_OFFICIAL_FIELDS = [
  'Empresa',
  'Centro',
  'Documento de vendas',
  'Item',
  'Data do pedido',
  'Data desejada',
  'Código cliente SAP',
  'Cliente',
  'Cidade',
  'UF',
  'Região',
  'Material SAP',
  'Texto breve do material',
  'Quantidade',
  'Unidade de medida',
  'Quantidade real',
  'Peso em kg',
  'Peso em t',
  'Centro fornecedor',
  'Depósito',
  'Itinerário SAP',
  'Rota',
  'Condição de crédito',
  'Limite de crédito',
  'Status de crédito',
  'Motivo de crédito/bloqueio',
  'Situação de estoque',
  'Estoque disponível',
  'Estoque DP34',
  'Quantidade faltante',
  'Status PCP',
  'Data prevista PCP',
  'Dias em carteira',
  'Atraso',
  'Remessa',
  'Tipo de descarga',
  'Número de descargas',
  'Veículo exigido',
  'Restrições logísticas',
  'Valor do pedido',
  'Frete previsto',
  'Pedágio previsto',
  'Prioridade',
] as const

// Retrocompatibilidade para testes e referências legadas
export const ZSD35_OFFICIAL_FIELDS = [
  'Q.Dias',
  'Gerar',
  'Status',
  'Inco',
  'Documento de vendas',
  'Região',
  'Cidade',
  'Qtde Real',
  'Qtde.Amar.',
  'Est. Sider',
  'Texto breve de material',
  'Valor do Frete',
  'Recebedor Merc',
  'Limite de Crédito',
  'Emissor da ordem',
  'Compromisso especial',
  'Condição de Pagament',
  'Motivo Estoque',
  'Qtde.Estoque',
  'Saldo',
  'Data do Pedido',
  'Hora do Pedido',
  'Quantidade da ordem',
  'Data Remessa(Semana)',
  'Itinerário',
  'Motivo Crédito',
  'Total a Receber',
  'Estoque Total',
] as const

export interface Zsd35RawRow {
  Empresa?: any
  Centro?: any
  'Documento de vendas'?: any
  Item?: any
  'Data do pedido'?: any
  'Data desejada'?: any
  'Código cliente SAP'?: any
  Cliente?: any
  Cidade?: any
  UF?: any
  Região?: any
  'Material SAP'?: any
  'Texto breve do material'?: any
  Quantidade?: any
  'Unidade de medida'?: any
  'Quantidade real'?: any
  'Peso em kg'?: any
  'Peso em t'?: any
  'Centro fornecedor'?: any
  Depósito?: any
  'Itinerário SAP'?: any
  Rota?: any
  'Condição de crédito'?: any
  'Limite de crédito'?: any
  'Status de crédito'?: any
  'Motivo de crédito/bloqueio'?: any
  'Situação de estoque'?: any
  'Estoque disponível'?: any
  'Estoque DP34'?: any
  'Quantidade faltante'?: any
  'Status PCP'?: any
  'Data prevista PCP'?: any
  'Dias em carteira'?: any
  Atraso?: any
  Remessa?: any
  'Tipo de descarga'?: any
  'Número de descargas'?: any
  'Veículo exigido'?: any
  'Restrições logísticas'?: any
  'Valor do pedido'?: any
  'Frete previsto'?: any
  'Pedágio previsto'?: any
  Prioridade?: any
  // Campos legados
  'Q.Dias'?: any
  Gerar?: any
  Status?: any
  Inco?: any
  'Qtde Real'?: any
  'Qtde.Amar.'?: any
  'Est. Sider'?: any
  'Texto breve de material'?: any
  'Valor do Frete'?: any
  'Recebedor Merc'?: any
  'Limite de Crédito'?: any
  'Emissor da ordem'?: any
  'Compromisso especial'?: any
  'Condição de Pagament'?: any
  'Motivo Estoque'?: any
  'Qtde.Estoque'?: any
  Saldo?: any
  'Data do Pedido'?: any
  'Hora do Pedido'?: any
  'Quantidade da ordem'?: any
  'Data Remessa(Semana)'?: any
  Itinerário?: any
  'Motivo Crédito'?: any
  'Total a Receber'?: any
  'Estoque Total'?: any
  [key: string]: any
}

export type Zsd35RecordValidationStatus = 'VALID' | 'WARNING' | 'REJECTED'

export interface Zsd35ValidatedOrder {
  order_number: string
  item_number: string
  technical_key: string // chave técnica única: order_number + '_' + item_number (ou material)
  origem_dado: 'SAP' | 'EXCEL_QAS'
  customer_code: string
  customer_name: string
  destination_city: string
  uf: string
  itinerary_code: string
  route_code?: string
  material: string
  material_description: string
  weight_kg: number
  weight_ton: number
  total_value: number
  credit_status: 'Liberado' | 'Bloqueado' | 'Em Análise'
  credit_condition?: string
  credit_limit?: number
  credit_reason?: string
  production_status: 'Pronto' | 'Em Produção' | 'Programado' | 'Aguardando PCP'
  discharge_type: string
  discharges_count?: number
  required_vehicle_type?: string
  logistic_restrictions?: string
  order_date: string
  desired_date: string
  company_code?: string
  plant_code?: string
  supplying_plant?: string
  storage_location?: string
  stock_quantity_kg: number
  stock_available?: number
  stock_dp34?: number
  missing_quantity?: number
  balance_quantity_kg: number
  is_sidercentro: boolean
  raw_q_dias?: number
  q_dias?: number
  freight_value?: number
  toll_forecast_value?: number
  priority_level?: string
  delivery_number?: string
  delivery_week?: string
  incoterms?: string
  order_hour?: string
  pcp_status?: string
  pcp_forecast_date?: string
  stock_total?: number
  stock_sider?: number
  quantity_order?: number
  unit?: string

  // Calculados dinamicamente
  walletDays: number
  overdueDays: number
  delayText: string
  isOverdue: boolean
  stockIntersectionType: 'ESTOQUE_ATUAL' | 'PRODUCAO_FUTURA' | 'SEM_PREVISAO'

  // Validação
  validation_status: Zsd35RecordValidationStatus
  validation_messages: string[]
  import_batch_id?: string
  source_file?: string
}

export interface Zsd35ImportValidationReport {
  batchId: string
  fileName: string
  importedAt: string
  totalRowsRead: number
  validOrders: Zsd35ValidatedOrder[]
  validCount: number
  warningCount: number
  rejectedRowsCount: number
  ignoredRowsCount: number
  duplicateCount: number
  uniqueOrdersCount: number
  uniqueClientsCount: number
  uniqueMaterialsCount: number
  totalWeightTon: number
  totalValue: number
  ignoredReasons: string[]
  rejectionsLog: Array<{ rowNumber: number; reason: string; sampleData: any }>
  warningsLog: Array<{ rowNumber: number; orderNumber: string; warning: string }>
  newCount: number
  updatedCount: number
  summaryStatus: 'VALIDO' | 'VALIDO_COM_AVISOS' | 'INVALIDO'
  technicalKeysSeen: string[]
  origem_dado: 'EXCEL_QAS'
}

/**
 * Sanitiza texto para proteção contra Excel Formula Injection (DDE / CSV Injection).
 * Previne execução de fórmulas iniciadas com '=', '+', '-', '@', '\t', '\r'.
 */
export function sanitizeCellValue(val: any): any {
  if (val === null || val === undefined) return ''
  if (typeof val === 'number' || typeof val === 'boolean') return val
  if (val instanceof Date) return val.toISOString().split('T')[0]

  let str = String(val).trim()
  if (!str) return ''

  // Se inicia com caracteres de fórmula, prefixa com apóstrofo para tratar como literal
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  return str
}

/**
 * Converte qualquer representação numérica (PT-BR, INT, formatação SAP) para float seguro
 */
export function parseNumberSafely(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  if (!val) return 0
  let str = String(val).trim()
  if (!str) return 0

  // Se tiver apóstrofo sanitizado no início, remove para calcular
  if (str.startsWith("'")) {
    str = str.substring(1).trim()
  }

  // Detecta formato brasileiro (ex: 104.944,72 ou 158.565 ou 0,747) vs internacional (104944.72)
  const hasComma = str.includes(',')
  const hasDot = str.includes('.')

  if (hasComma && hasDot) {
    // PT-BR: 1.234,56
    str = str.replace(/\./g, '').replace(',', '.')
  } else if (hasComma && !hasDot) {
    // 1234,56 ou 0,75
    str = str.replace(',', '.')
  } else if (!hasComma && hasDot) {
    // Se tiver mais de um ponto (ex: 1.234.567), todos exceto o último são milhares
    const parts = str.split('.')
    if (parts.length > 2) {
      str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]
    }
  }

  const clean = str.replace(/[^0-9.-]/g, '')
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

/**
 * Normaliza qualquer formato de data (Excel serial, ISO YYYY-MM-DD, PT-BR DD/MM/YYYY) para YYYY-MM-DD
 */
export function parseDateSafely(val: any): string {
  if (!val) return ''
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? '' : val.toISOString().split('T')[0]
  }

  let s = String(val).trim()
  if (s.startsWith("'")) s = s.substring(1).trim()
  if (!s) return ''

  // ISO "2026-08-20" ou "2026-08-20T..."
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10)
  }

  // BR "20/08/2026" ou "20-08-2026"
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(s)) {
    const parts = s.split(/[/-]/)
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2]
    return `${year}-${month}-${day}`
  }
  // Número serial do Excel (ex: 45000)
  const numVal = typeof val === 'number' ? val : parseFloat(s)
  if (!isNaN(numVal) && numVal > 30000 && numVal < 65000) {
    const utcDate = new Date(Math.round((numVal - 25569) * 86400 * 1000))
    if (!isNaN(utcDate.getTime())) {
      return utcDate.toISOString().split('T')[0]
    }
  }

  return s.substring(0, 10)
}

/**
 * Calcula Dias em Carteira automaticamente: Data Atual - Data de Entrada do Pedido
 */
export function calculateWalletDays(orderDateStr?: string, fallbackDays?: number): number {
  if (!orderDateStr) return fallbackDays || 0
  try {
    const orderDate = new Date(orderDateStr + 'T12:00:00')
    if (isNaN(orderDate.getTime())) return fallbackDays || 0
    const today = new Date()
    const diffMs = today.getTime() - orderDate.getTime()
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  } catch {
    return fallbackDays || 0
  }
}

/**
 * Busca valor na linha comparando chaves padrão, alternativas e case/accent-insensitive
 */
function extractRowValue(
  row: any,
  stdKey: string,
  altKeys: string[] = [],
  customMapping?: Record<string, string>,
): any {
  if (customMapping && customMapping[stdKey] && row[customMapping[stdKey]] !== undefined) {
    return row[customMapping[stdKey]]
  }
  if (row[stdKey] !== undefined && row[stdKey] !== null && String(row[stdKey]).trim() !== '') {
    return row[stdKey]
  }
  for (const alt of altKeys) {
    if (row[alt] !== undefined && row[alt] !== null && String(row[alt]).trim() !== '') {
      return row[alt]
    }
  }
  // Normalização case-insensitive e sem acentos
  const normalizeKey = (k: string) =>
    k
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')

  const stdNorm = normalizeKey(stdKey)
  const altNorms = altKeys.map(normalizeKey)

  for (const k of Object.keys(row)) {
    const rowKeyNorm = normalizeKey(k)
    if (rowKeyNorm === stdNorm || altNorms.includes(rowKeyNorm)) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
        return row[k]
      }
    }
  }
  return undefined
}

/**
 * Motor Principal: Processa e Valida linhas do Excel/CSV ZSD35A
 */
export function processZsd35Rows(
  rows: any[],
  customMapping?: Record<string, string>,
  options?: {
    batchId?: string
    fileName?: string
    userName?: string
  },
): Zsd35ImportValidationReport {
  const batchId = options?.batchId || `LOTE-QAS-${Date.now().toString(36).toUpperCase()}`
  const fileName = options?.fileName || 'TMS_CIAFAL_ZSD35A_QAS.xlsx'
  const importedAt = new Date().toISOString()

  const validOrders: Zsd35ValidatedOrder[] = []
  const ignoredReasons: string[] = []
  const rejectionsLog: Array<{ rowNumber: number; reason: string; sampleData: any }> = []
  const warningsLog: Array<{ rowNumber: number; orderNumber: string; warning: string }> = []
  const seenTechnicalKeys = new Map<string, number>() // technicalKey -> index in validOrders

  let ignoredRowsCount = 0
  let rejectedRowsCount = 0
  let duplicateCount = 0
  let updatedCount = 0

  const getVal = (stdKey: string, altKeys: string[] = [], rowObj: any): any => {
    return extractRowValue(rowObj, stdKey, altKeys, customMapping)
  }

  const today = new Date()

  rows.forEach((row, index) => {
    const rowNum = index + 1
    if (!row || typeof row !== 'object') {
      ignoredRowsCount++
      return
    }

    // 1. Detectar e ignorar cabeçalhos repetidos
    const docVendasRaw = String(
      getVal(
        'Documento de vendas',
        ['doc_vendas', 'Ordem', 'Pedido', 'VBELN', 'Doc. Vendas', 'Doc Vendas', 'Nº Pedido'],
        row,
      ) || '',
    ).trim()

    if (
      !docVendasRaw ||
      docVendasRaw.toLowerCase().includes('documento') ||
      docVendasRaw.toLowerCase().includes('vendas') ||
      docVendasRaw.toLowerCase() === 'doc'
    ) {
      ignoredRowsCount++
      ignoredReasons.push(`Linha ${rowNum}: Cabeçalho repetido ou linha vazia descartada.`)
      return
    }

    // 2. Detectar e ignorar linhas de subtotal, total e agregadas
    const rawText = JSON.stringify(row).toLowerCase()
    if (
      rawText.includes('total geral') ||
      rawText.includes('subtotal') ||
      rawText.includes('resultado') ||
      docVendasRaw.startsWith('*') ||
      docVendasRaw.startsWith('---') ||
      docVendasRaw.toLowerCase() === 'total'
    ) {
      ignoredRowsCount++
      ignoredReasons.push(`Linha ${rowNum}: Linha agregada/subtotal detectada e ignorada.`)
      return
    }

    // 3. Validação dos campos essenciais
    const orderNumber = docVendasRaw.replace(/[^0-9a-zA-Z_-]/g, '')
    if (!orderNumber || orderNumber.length < 3) {
      rejectedRowsCount++
      rejectionsLog.push({
        rowNumber: rowNum,
        reason: 'Número de documento de vendas inválido ou ausente.',
        sampleData: row,
      })
      return
    }

    const itemRaw = String(
      getVal('Item', ['item_number', 'POSNR', 'Item SAP', 'Item Pedido'], row) || '000010',
    ).trim()
    const itemNumber = itemRaw.padStart(6, '0')

    const warnings: string[] = []

    // Dados do Cliente
    const customerName = String(
      getVal(
        'Cliente',
        ['Recebedor Merc', 'Nome Cliente', 'NAME1', 'Cliente SAP', 'Razão Social'],
        row,
      ) || `CLIENTE ${orderNumber}`,
    ).trim()

    const customerCode = String(
      getVal(
        'Código cliente SAP',
        ['Emissor da ordem', 'Cod Cliente', 'Emissor', 'KUNNR', 'Código Cliente'],
        row,
      ) || `CLI-${orderNumber}`,
    ).trim()

    // Destino
    let city = String(
      getVal('Cidade', ['Municipio', 'ORT01', 'Cidade Destino', 'Destino'], row) || '',
    ).trim()
    if (!city) {
      city = 'São Paulo'
      warnings.push('Cidade não informada; adotado padrão.')
    }

    let uf = String(getVal('UF', ['Região', 'Estado', 'REGIO', 'Uf Destino'], row) || 'SP')
      .trim()
      .toUpperCase()
    if (uf.length > 2) {
      uf = uf.substring(0, 2)
    }

    let itineraryCode = String(
      getVal(
        'Itinerário SAP',
        ['Itinerário', 'Itinerario', 'Rota', 'ROUTE', 'Itinerario SAP'],
        row,
      ) || 'SP001A',
    )
      .trim()
      .toUpperCase()

    const routeCode = String(getVal('Rota', ['Codigo Rota', 'ROUTA'], row) || itineraryCode).trim()

    // Material
    const materialCode = String(
      getVal('Material SAP', ['Material', 'MATNR', 'Código Material'], row) || `MAT-${orderNumber}`,
    ).trim()

    const materialText = String(
      getVal(
        'Texto breve do material',
        ['Texto breve de material', 'Material', 'Descricao', 'ARKTX', 'Descrição Material'],
        row,
      ) || 'PERFIL ESTRUTURAL AÇO',
    ).trim()

    // Pesos e Quantidades
    const rawPesoKg = parseNumberSafely(
      getVal('Peso em kg', ['peso_kg', 'Peso Líquido', 'Peso Liq'], row),
    )
    const rawPesoTon = parseNumberSafely(
      getVal('Peso em t', ['peso_t', 'Peso Ton', 'Peso (t)'], row),
    )
    const rawQtdeReal = parseNumberSafely(
      getVal('Quantidade real', ['Qtde Real', 'Quantidade Real', 'Qtde_Real'], row),
    )
    const rawQtde = parseNumberSafely(
      getVal('Quantidade', ['Quantidade da ordem', 'Qtde Ordem', 'KWMENG'], row),
    )
    const rawSaldo = parseNumberSafely(getVal('Saldo', ['Saldo Pedido', 'Saldo'], row))

    let weightKg = 0
    if (rawPesoKg > 0) {
      weightKg = rawPesoKg
    } else if (rawPesoTon > 0) {
      weightKg = rawPesoTon * 1000
    } else if (rawQtdeReal > 0) {
      weightKg = rawQtdeReal < 500 ? rawQtdeReal * 1000 : rawQtdeReal
    } else if (rawSaldo > 0) {
      weightKg = rawSaldo < 500 ? rawSaldo * 1000 : rawSaldo
    } else if (rawQtde > 0) {
      weightKg = rawQtde < 500 ? rawQtde * 1000 : rawQtde
    } else {
      weightKg = 5000
      warnings.push('Peso não informado na linha; estimado em 5.000 kg.')
    }

    const weightTon = Math.round((weightKg / 1000) * 1000) / 1000

    // Valores Financeiros
    const rawValorPedido = parseNumberSafely(
      getVal(
        'Valor do pedido',
        ['Total a Receber', 'Valor Total', 'total_receber', 'NETWR', 'Valor'],
        row,
      ),
    )
    const totalValue = rawValorPedido > 0 ? rawValorPedido : weightKg * 4.5

    const rawFretePrevisto = parseNumberSafely(
      getVal('Frete previsto', ['Valor do Frete', 'Frete', 'valor_frete'], row),
    )
    const rawPedagioPrevisto = parseNumberSafely(
      getVal('Pedágio previsto', ['Pedágio', 'Pedagio', 'valor_pedagio'], row),
    )

    // Crédito
    const rawLimiteCredito = parseNumberSafely(
      getVal('Limite de crédito', ['Limite de Crédito', 'Limite Credito', 'limite_credito'], row),
    )
    const creditCond = String(
      getVal('Condição de crédito', ['Condição de Pagament', 'Condicao Pagamento', 'ZTERM'], row) ||
        '30 DDL',
    ).trim()

    const rawCreditStatus = String(
      getVal('Status de crédito', ['Motivo Crédito', 'Status Crédito', 'motivo_credito'], row) ||
        '',
    )
    const creditReason = String(
      getVal(
        'Motivo de crédito/bloqueio',
        ['Motivo Crédito', 'Motivo Bloqueio', 'motivo_credito'],
        row,
      ) || (rawCreditStatus ? rawCreditStatus : 'CRÉDITO OK'),
    ).trim()

    let credit_status: 'Liberado' | 'Bloqueado' | 'Em Análise' = 'Liberado'
    const lowerCredit = (rawCreditStatus + ' ' + creditReason).toLowerCase()
    if (
      lowerCredit.includes('bloq') ||
      lowerCredit.includes('rejeit') ||
      lowerCredit.includes('estourado') ||
      lowerCredit.includes('inadimplente')
    ) {
      credit_status = 'Bloqueado'
    } else if (
      lowerCredit.includes('analis') ||
      lowerCredit.includes('checar') ||
      lowerCredit.includes('revis') ||
      lowerCredit.includes('seguinte') ||
      lowerCredit.includes('pendente')
    ) {
      credit_status = 'Em Análise'
    } else if (lowerCredit.includes('ok') || lowerCredit.includes('liberado')) {
      credit_status = 'Liberado'
    }

    // Estoques e PCP
    const rawEstoqueDisp = parseNumberSafely(
      getVal('Estoque disponível', ['Estoque Total', 'Estoque', 'estoque_total'], row),
    )
    const rawEstoqueDP34 = parseNumberSafely(
      getVal('Estoque DP34', ['Qtde.Estoque', 'qtde_estoque', 'DP34'], row),
    )
    const rawEstSider = parseNumberSafely(
      getVal('Est. Sider', ['Estoque Sider', 'est_sider', 'Sider'], row),
    )
    const rawFaltante = parseNumberSafely(
      getVal('Quantidade faltante', ['Qtde Faltante', 'Faltante'], row),
    )

    const stockQtyKg =
      (rawEstoqueDisp > 0 ? rawEstoqueDisp : rawEstoqueDP34 > 0 ? rawEstoqueDP34 : 0) *
      (rawEstoqueDisp < 500 && rawEstoqueDisp > 0 ? 1000 : 1)

    const balanceQtyKg = rawSaldo > 0 ? (rawSaldo < 500 ? rawSaldo * 1000 : rawSaldo) : weightKg

    const rawStockSit = String(
      getVal('Situação de estoque', ['Motivo Estoque', 'motivo_estoque'], row) || '',
    ).trim()

    const rawPcpStatus = String(
      getVal('Status PCP', ['Status Producao', 'status_pcp'], row) || '',
    ).trim()

    const rawPcpData = getVal(
      'Data prevista PCP',
      ['Data Prevista Producao', 'Previsão PCP', 'pcp_forecast_date'],
      row,
    )
    const pcpForecastDate = parseDateSafely(rawPcpData)

    let production_status: 'Pronto' | 'Em Produção' | 'Programado' | 'Aguardando PCP' = 'Pronto'
    const lowerPcp = (rawPcpStatus + ' ' + rawStockSit).toLowerCase()
    if (stockQtyKg >= weightKg && stockQtyKg > 0) {
      production_status = 'Pronto'
    } else if (
      lowerPcp.includes('falta') ||
      lowerPcp.includes('prod') ||
      lowerPcp.includes('fabrica') ||
      lowerPcp.includes('em produção')
    ) {
      production_status = 'Em Produção'
    } else if (
      lowerPcp.includes('prog') ||
      lowerPcp.includes('pcp') ||
      lowerPcp.includes('programado')
    ) {
      production_status = 'Programado'
    } else if (rawEstSider > 0 || stockQtyKg > 0) {
      production_status = 'Pronto'
    } else {
      production_status = 'Aguardando PCP'
    }

    // Cruzamento Estoque DP34 x PCP
    let stockIntersectionType: 'ESTOQUE_ATUAL' | 'PRODUCAO_FUTURA' | 'SEM_PREVISAO' =
      'ESTOQUE_ATUAL'
    if (stockQtyKg >= weightKg || rawEstSider >= weightKg / 1000) {
      stockIntersectionType = 'ESTOQUE_ATUAL'
    } else if (production_status === 'Em Produção' || production_status === 'Programado') {
      stockIntersectionType = 'PRODUCAO_FUTURA'
    } else {
      stockIntersectionType = 'SEM_PREVISAO'
    }

    const isSidercentro =
      rawEstSider > 0 ||
      String(getVal('Est. Sider', ['Sidercentro'], row) || '').trim().length > 0 ||
      materialText.toUpperCase().includes('SIDER')

    // Datas
    const rawOrderDate = getVal(
      'Data do pedido',
      ['Data do Pedido', 'Data Pedido', 'data_pedido', 'ERDAT'],
      row,
    )
    const orderDate = parseDateSafely(rawOrderDate) || today.toISOString().split('T')[0]

    const rawDesired = getVal(
      'Data desejada',
      ['Data Remessa(Semana)', 'Data Desejada', 'Remessa', 'data_remessa', 'VDATU'],
      row,
    )
    const desiredDate = parseDateSafely(rawDesired) || orderDate

    // Dias em Carteira (cálculo dinâmico automático)
    const rawQDias = parseNumberSafely(
      getVal('Dias em carteira', ['Q.Dias', 'Dias', 'q_dias'], row),
    )
    const walletDays = calculateWalletDays(orderDate, rawQDias)

    // Atraso
    let overdueDays = 0
    let delayText = 'No prazo'
    let isOverdue = false
    if (desiredDate) {
      const desired = new Date(desiredDate + 'T12:00:00')
      const diffDays = Math.floor((today.getTime() - desired.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays > 0) {
        overdueDays = diffDays
        delayText = `${diffDays} dias de atraso`
        isOverdue = true
      } else if (diffDays === 0) {
        delayText = 'Vence hoje'
      } else {
        delayText = `Faltam ${Math.abs(diffDays)} dias`
      }
    }

    // Campos adicionais
    const companyCode = String(getVal('Empresa', ['BUKRS', 'empresa'], row) || '1000').trim()
    const plantCode = String(getVal('Centro', ['WERKS', 'centro'], row) || '1010').trim()
    const supplyingPlant = String(
      getVal('Centro fornecedor', ['WERKS_FORN', 'centro_fornecedor'], row) || plantCode,
    ).trim()
    const storageLocation = String(
      getVal('Depósito', ['Deposito', 'LGORT', 'deposito'], row) || '0001',
    ).trim()

    const dischargeType = String(
      getVal('Tipo de descarga', ['tipo_descarga', 'Descarga'], row) || 'Ponte Rolante',
    ).trim()
    const dischargesCount =
      parseNumberSafely(getVal('Número de descargas', ['num_descargas'], row)) || 1
    const requiredVehicle = String(
      getVal('Veículo exigido', ['veiculo_exigido', 'Tipo Veículo'], row) || 'Carreta / Bitrem',
    ).trim()
    const logisticRestrictions = String(
      getVal('Restrições logísticas', ['restricoes_logisticas', 'Restrições'], row) || '',
    ).trim()
    const priorityLevel = String(
      getVal('Prioridade', ['prioridade', 'Priority'], row) || 'Normal',
    ).trim()
    const deliveryNumber = String(
      getVal('Remessa', ['remessa', 'Documento Remessa', 'VBELN_VL'], row) || '',
    ).trim()

    // Classificação do Registro (🟢 Válido, 🟡 Válido com alerta, 🔴 Erro impeditivo)
    let validation_status: Zsd35RecordValidationStatus = 'VALID'
    if (warnings.length > 0) {
      validation_status = 'WARNING'
      warnings.forEach((w) => {
        warningsLog.push({ rowNumber: rowNum, orderNumber, warning: w })
      })
    }

    // 4. Chave Técnica Única: Documento de Vendas + Item (ou Material)
    const cleanItemKey = itemNumber || '000010'
    const cleanMaterialKey = materialCode.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)
    const technicalKey = `${orderNumber}_${cleanItemKey}_${cleanMaterialKey}`

    const validatedOrder: Zsd35ValidatedOrder = {
      order_number: orderNumber,
      item_number: itemNumber,
      technical_key: technicalKey,
      origem_dado: 'EXCEL_QAS',
      customer_code: customerCode,
      customer_name: customerName,
      destination_city: city,
      uf,
      itinerary_code: itineraryCode,
      route_code: routeCode,
      material: materialCode || materialText.substring(0, 40),
      material_description: materialText,
      weight_kg: Math.round(weightKg),
      weight_ton: weightTon,
      total_value: Math.round(totalValue * 100) / 100,
      credit_status,
      credit_condition: creditCond,
      credit_limit: rawLimiteCredito,
      credit_reason: creditReason,
      production_status,
      discharge_type: dischargeType,
      discharges_count: dischargesCount,
      required_vehicle_type: requiredVehicle,
      logistic_restrictions: logisticRestrictions,
      order_date: orderDate,
      desired_date: desiredDate,
      company_code: companyCode,
      plant_code: plantCode,
      supplying_plant: supplyingPlant,
      storage_location: storageLocation,
      stock_quantity_kg: Math.round(stockQtyKg),
      stock_available: rawEstoqueDisp,
      stock_dp34: rawEstoqueDP34,
      missing_quantity: rawFaltante,
      balance_quantity_kg: Math.round(balanceQtyKg),
      is_sidercentro: isSidercentro,
      raw_q_dias: rawQDias,
      q_dias: walletDays,
      freight_value: rawFretePrevisto,
      toll_forecast_value: rawPedagioPrevisto,
      priority_level: priorityLevel,
      delivery_number: deliveryNumber,
      delivery_week: String(getVal('Data Remessa(Semana)', ['Semana'], row) || ''),
      incoterms: String(getVal('Inco', ['Incoterms', 'inco'], row) || 'CIF'),
      order_hour: String(getVal('Hora do Pedido', ['hora_pedido'], row) || '00:00:00'),
      pcp_status: rawPcpStatus,
      pcp_forecast_date: pcpForecastDate,
      stock_total: rawEstoqueDisp,
      stock_sider: rawEstSider,
      quantity_order: rawQtde,
      unit: String(getVal('Unidade de medida', ['Unidade', 'MEINS'], row) || 'KG'),
      walletDays,
      overdueDays,
      delayText,
      isOverdue,
      stockIntersectionType,
      validation_status,
      validation_messages: warnings,
      import_batch_id: batchId,
      source_file: fileName,
    }

    // Deduplicação: se a mesma chave técnica já apareceu neste mesmo lote, atualiza
    if (seenTechnicalKeys.has(technicalKey)) {
      const prevIdx = seenTechnicalKeys.get(technicalKey)!
      validOrders[prevIdx] = validatedOrder
      duplicateCount++
      updatedCount++
    } else {
      seenTechnicalKeys.set(technicalKey, validOrders.length)
      validOrders.push(validatedOrder)
    }
  })

  const validCount = validOrders.filter((o) => o.validation_status === 'VALID').length
  const warningCount = validOrders.filter((o) => o.validation_status === 'WARNING').length
  const uniqueOrders = new Set(validOrders.map((o) => o.order_number)).size
  const uniqueClients = new Set(validOrders.map((o) => o.customer_code)).size
  const uniqueMaterials = new Set(validOrders.map((o) => o.material)).size
  const totalWeightTon =
    Math.round(validOrders.reduce((sum, o) => sum + o.weight_ton, 0) * 1000) / 1000
  const totalValue = Math.round(validOrders.reduce((sum, o) => sum + o.total_value, 0) * 100) / 100

  const summaryStatus =
    rejectedRowsCount > 0 && validOrders.length === 0
      ? 'INVALIDO'
      : rejectedRowsCount > 0 || warningCount > 0
        ? 'VALIDO_COM_AVISOS'
        : 'VALIDO'

  return {
    batchId,
    fileName,
    importedAt,
    totalRowsRead: rows.length,
    validOrders,
    validCount,
    warningCount,
    rejectedRowsCount,
    ignoredRowsCount,
    duplicateCount,
    uniqueOrdersCount: uniqueOrders,
    uniqueClientsCount: uniqueClients,
    uniqueMaterialsCount: uniqueMaterials,
    totalWeightTon,
    totalValue,
    ignoredReasons,
    rejectionsLog,
    warningsLog,
    newCount: validOrders.length - updatedCount,
    updatedCount,
    summaryStatus,
    technicalKeysSeen: Array.from(seenTechnicalKeys.keys()),
    origem_dado: 'EXCEL_QAS',
  }
}

/**
 * Normaliza e parseia CSV bruto respeitando delimitadores (;, \t, ,)
 */
export function parseZsd35CsvText(csvText: string): any[] {
  if (!csvText || !csvText.trim()) return []
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  // Detecta separador da primeira linha
  const firstLine = lines[0]
  let delimiter = ';'
  if (firstLine.split('\t').length > firstLine.split(';').length) delimiter = '\t'
  else if (firstLine.split(',').length > firstLine.split(';').length) delimiter = ','

  const headers = firstLine.split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim())

  const rows: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i]
    if (!rawLine.trim()) continue
    const parts = rawLine.split(delimiter).map((p) => p.replace(/^["']|["']$/g, '').trim())
    const rowObj: Record<string, any> = {}
    headers.forEach((hdr, idx) => {
      rowObj[hdr] = parts[idx] !== undefined ? sanitizeCellValue(parts[idx]) : ''
    })
    rows.push(rowObj)
  }
  return rows
}

/**
 * Gera e realiza download do arquivo template oficial ZSD35A em formato .xlsx
 * Contém os 40 campos com dados de exemplo realistas da CIAFAL para homologação QAS.
 */
export function generateZsd35aTemplateWorkbook(): XLSX.WorkBook {
  const sampleRows: Record<string, any>[] = [
    {
      Empresa: '1000',
      Centro: '1010',
      'Documento de vendas': '10494472',
      Item: '000010',
      'Data do pedido': '20/03/2026',
      'Data desejada': '28/03/2026',
      'Código cliente SAP': 'CLI-20041',
      Cliente: 'AÇOS BRASIL ESTRUTURAS METÁLICAS LTDA',
      Cidade: 'Campinas',
      UF: 'SP',
      Região: 'SUDESTE',
      'Material SAP': 'PERFIL-W-250X32',
      'Texto breve do material': 'PERFIL ESTRUTURAL W 250 X 32,8 KG/M 12M',
      Quantidade: 28000,
      'Unidade de medida': 'KG',
      'Quantidade real': 28.0,
      'Peso em kg': 28000,
      'Peso em t': 28.0,
      'Centro fornecedor': '1010',
      Depósito: '0001',
      'Itinerário SAP': 'SP001A',
      Rota: 'SP-CAMP-01',
      'Condição de crédito': '30 DDL',
      'Limite de crédito': 500000,
      'Status de crédito': 'Liberado',
      'Motivo de crédito/bloqueio': 'CRÉDITO APROVADO MATRIZ',
      'Situação de estoque': 'Estoque DP34 Disponível',
      'Estoque disponível': 32000,
      'Estoque DP34': 32000,
      'Quantidade faltante': 0,
      'Status PCP': 'Concluído no Pátio',
      'Data prevista PCP': '20/03/2026',
      'Dias em carteira': 4,
      Atraso: 'No prazo',
      Remessa: '80041201',
      'Tipo de descarga': 'Ponte Rolante',
      'Número de descargas': 1,
      'Veículo exigido': 'Carreta Sider / Aberta',
      'Restrições logísticas': 'Descarga até as 17h, Eixo livre',
      'Valor do pedido': 148500.0,
      'Frete previsto': 3450.0,
      'Pedágio previsto': 320.0,
      Prioridade: 'Alta',
    },
    {
      Empresa: '1000',
      Centro: '1010',
      'Documento de vendas': '10494473',
      Item: '000010',
      'Data do pedido': '15/03/2026',
      'Data desejada': '25/03/2026',
      'Código cliente SAP': 'CLI-30089',
      Cliente: 'CONSTRUTORA E METALÚRGICA VALE DO TIETÊ',
      Cidade: 'Ribeirão Preto',
      UF: 'SP',
      Região: 'SUDESTE',
      'Material SAP': 'TUBO-IND-150X150',
      'Texto breve do material': 'TUBO INDUSTRIAL QUADRADO 150X150 E=4.75MM',
      Quantidade: 18500,
      'Unidade de medida': 'KG',
      'Quantidade real': 18.5,
      'Peso em kg': 18500,
      'Peso em t': 18.5,
      'Centro fornecedor': '1010',
      Depósito: '0001',
      'Itinerário SAP': 'SP003B',
      Rota: 'SP-RIB-02',
      'Condição de crédito': '45 DDL',
      'Limite de crédito': 350000,
      'Status de crédito': 'Liberado',
      'Motivo de crédito/bloqueio': 'CRÉDITO OK',
      'Situação de estoque': 'Em Produção PCP',
      'Estoque disponível': 0,
      'Estoque DP34': 0,
      'Quantidade faltante': 18500,
      'Status PCP': 'Programado OP 9042',
      'Data prevista PCP': '26/03/2026',
      'Dias em carteira': 9,
      Atraso: 'No prazo',
      Remessa: '',
      'Tipo de descarga': 'Empilhadeira',
      'Número de descargas': 1,
      'Veículo exigido': 'Truck / Carreta',
      'Restrições logísticas': 'Agendamento prévio com 24h',
      'Valor do pedido': 96200.0,
      'Frete previsto': 2890.0,
      'Pedágio previsto': 280.0,
      Prioridade: 'Normal',
    },
    {
      Empresa: '1000',
      Centro: '1010',
      'Documento de vendas': '10494474',
      Item: '000010',
      'Data do pedido': '10/03/2026',
      'Data desejada': '20/03/2026',
      'Código cliente SAP': 'CLI-40112',
      Cliente: 'CIA SIDERÚRGICA SUL MINEIRA',
      Cidade: 'Pouso Alegre',
      UF: 'MG',
      Região: 'SUDESTE',
      'Material SAP': 'CHAPA-FINA-QUENTE-475',
      'Texto breve do material': 'CHAPA FINA A QUENTE ESPESSURA 4.75MM X 1200',
      Quantidade: 26000,
      'Unidade de medida': 'KG',
      'Quantidade real': 26.0,
      'Peso em kg': 26000,
      'Peso em t': 26.0,
      'Centro fornecedor': '1010',
      Depósito: '0002',
      'Itinerário SAP': 'MG002A',
      Rota: 'MG-SUL-01',
      'Condição de crédito': '28 DDL',
      'Limite de crédito': 200000,
      'Status de crédito': 'Em Análise',
      'Motivo de crédito/bloqueio': 'ANÁLISE DE LIMITE EXCEDIDO',
      'Situação de estoque': 'Sem Previsão Estoque',
      'Estoque disponível': 0,
      'Estoque DP34': 0,
      'Quantidade faltante': 26000,
      'Status PCP': 'Aguardando Matéria Prima',
      'Data prevista PCP': '05/04/2026',
      'Dias em carteira': 14,
      Atraso: '4 dias de atraso',
      Remessa: '',
      'Tipo de descarga': 'Ponte Rolante',
      'Número de descargas': 2,
      'Veículo exigido': 'Bitrem / Carreta LS',
      'Restrições logísticas': 'Entrega filial 1 e 2',
      'Valor do pedido': 132600.0,
      'Frete previsto': 4120.0,
      'Pedágio previsto': 490.0,
      Prioridade: 'Urgente',
    },
  ]

  const ws = XLSX.utils.json_to_sheet(sampleRows, {
    header: ZSD35A_OFFICIAL_FIELDS as unknown as string[],
  })

  // Ajusta larguras de coluna
  ws['!cols'] = [
    { wch: 10 }, // Empresa
    { wch: 10 }, // Centro
    { wch: 22 }, // Documento de vendas
    { wch: 10 }, // Item
    { wch: 14 }, // Data do pedido
    { wch: 14 }, // Data desejada
    { wch: 18 }, // Código cliente SAP
    { wch: 38 }, // Cliente
    { wch: 20 }, // Cidade
    { wch: 6 }, // UF
    { wch: 12 }, // Região
    { wch: 24 }, // Material SAP
    { wch: 42 }, // Texto breve do material
    { wch: 14 }, // Quantidade
    { wch: 18 }, // Unidade de medida
    { wch: 16 }, // Quantidade real
    { wch: 14 }, // Peso em kg
    { wch: 12 }, // Peso em t
    { wch: 18 }, // Centro fornecedor
    { wch: 12 }, // Depósito
    { wch: 16 }, // Itinerário SAP
    { wch: 16 }, // Rota
    { wch: 20 }, // Condição de crédito
    { wch: 18 }, // Limite de crédito
    { wch: 18 }, // Status de crédito
    { wch: 30 }, // Motivo de crédito/bloqueio
    { wch: 24 }, // Situação de estoque
    { wch: 18 }, // Estoque disponível
    { wch: 16 }, // Estoque DP34
    { wch: 20 }, // Quantidade faltante
    { wch: 24 }, // Status PCP
    { wch: 18 }, // Data prevista PCP
    { wch: 16 }, // Dias em carteira
    { wch: 16 }, // Atraso
    { wch: 16 }, // Remessa
    { wch: 20 }, // Tipo de descarga
    { wch: 20 }, // Número de descargas
    { wch: 24 }, // Veículo exigido
    { wch: 32 }, // Restrições logísticas
    { wch: 18 }, // Valor do pedido
    { wch: 16 }, // Frete previsto
    { wch: 16 }, // Pedágio previsto
    { wch: 14 }, // Prioridade
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'ZSD35A_QAS')

  // Adiciona aba explicativa de instruções
  const instructions = [
    {
      Campo: 'ZSD35A — HOMOLOGAÇÃO QAS TMS CIAFAL',
      Descrição: 'Planilha padrão para carga de massa de dados na Carteira de Pedidos',
      Regra: 'Não cadastra cadastros mestres. Alimenta o mesmo modelo que a integração online SAP.',
    },
    {
      Campo: 'Documento de vendas',
      Descrição: 'Número do Pedido de Vendas SAP (ex: 10494472)',
      Regra: 'Obrigatório. Identificador único do pedido.',
    },
    {
      Campo: 'Material SAP & Item',
      Descrição: 'Código do Material e número do Item da ordem',
      Regra: 'Compõe a chave técnica única Documento_Item_Material.',
    },
    {
      Campo: 'Peso em kg / Peso em t',
      Descrição: 'Peso líquido da carga para roteirização e cálculo de frete',
      Regra: 'Preencher em kg ou toneladas.',
    },
    {
      Campo: 'Situação de Estoque & PCP',
      Descrição: 'Estoque DP34, WMS e Programação de Produção',
      Regra: 'Cruza automaticamente com os indicadores da Carteira e Planejador de Cargas.',
    },
    {
      Campo: 'Dias em Carteira',
      Descrição: 'Tempo do pedido em carteira',
      Regra: 'Calculado automaticamente pela fórmula (Data Atual - Data do Pedido).',
    },
  ]
  const wsInst = XLSX.utils.json_to_sheet(instructions)
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucoes_QAS')

  return wb
}

/**
 * Dispara o download do template oficial ZSD35A (.xlsx) no navegador
 */
export function downloadZsd35aTemplateFile(): void {
  const wb = generateZsd35aTemplateWorkbook()
  XLSX.writeFile(wb, 'TMS_CIAFAL_ZSD35A_QAS.xlsx')
}
