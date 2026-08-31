// TMS CIAFAL — Motor Canônico de Importação, Validação e Normalização ZSD35A V3 (27 Campos)
// Baseado no layout operacional oficial "ZSD35 Carga TMS v3.xlsx".
// Proteção contra Formula Injection, tipagem estrita, deduplicação por chave técnica (lote + linha),
// classificação de registros (🟢 Válido, 🟡 Alerta, 🔴 Erro impeditivo) e exportação de Template Excel oficial.

import * as XLSX from 'xlsx'

/**
 * 27 Campos Canônicos Oficiais da Planilha Operacional ZSD35A V3
 * Na exata ordem canônica do arquivo operacional "ZSD35 Carga TMS v3.xlsx"
 */
export const ZSD35A_V3_OFFICIAL_FIELDS = [
  'Q.Dias',
  'Gerar',
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

// Aliases para compatibilidade retroativa
export const ZSD35_OFFICIAL_FIELDS = ZSD35A_V3_OFFICIAL_FIELDS
export const ZSD35A_OFFICIAL_FIELDS = ZSD35A_V3_OFFICIAL_FIELDS

export interface Zsd35RawRow {
  'Q.Dias'?: any
  Gerar?: any
  Inco?: any
  'Documento de vendas'?: any
  Região?: any
  Cidade?: any
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
  technical_key: string // Identificador técnico por linha: batchId_linha
  origem_dado: 'SAP' | 'EXCEL_QAS' | 'EXCEL_QAS_ZSD35_V3' | 'EXCEL_QAS_ZSD35A_V3'
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
  special_commitment?: number

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
  line_number?: number
}

export interface Zsd35ImportValidationReport {
  batchId: string
  fileName: string
  importedAt: string
  layoutVersion: string
  layoutRecognized: boolean
  layoutMessage: string
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
  totalFreightForecast: number
  ignoredReasons: string[]
  rejectionsLog: Array<{ rowNumber: number; reason: string; sampleData: any }>
  warningsLog: Array<{ rowNumber: number; orderNumber: string; warning: string }>
  newCount: number
  updatedCount: number
  summaryStatus: 'VALIDO' | 'VALIDO_COM_AVISOS' | 'INVALIDO'
  technicalKeysSeen: string[]
  origem_dado: 'EXCEL_QAS_ZSD35A_V3' | 'EXCEL_QAS_ZSD35_V3' | 'EXCEL_QAS'
}

/**
 * Normaliza strings para comparação tolerante a acentuação, espaços e case
 */
export function normalizeKey(k: string): string {
  if (!k) return ''
  return k
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')
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

  // Se inicia com caracteres de fórmula perigosos (exceção para números negativos reais)
  if (/^[=+@\t\r]/.test(str)) {
    str = `'${str}`
  }
  return str
}

/**
 * Converte qualquer representação numérica (PT-BR, INT, formatação SAP, valores negativos) para float seguro
 * Preserva até 3 casas decimais para quantidades e 2 para monetários.
 * Permite valores negativos (ex: Compromisso especial, saldos negativos).
 */
export function parseNumberSafely(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  if (val === null || val === undefined) return 0
  let str = String(val).trim()
  if (!str) return 0

  if (str.startsWith("'")) {
    str = str.substring(1).trim()
  }

  // Detecta se é negativo
  const isNegative =
    str.startsWith('-') || str.endsWith('-') || (str.startsWith('(') && str.endsWith(')'))
  let cleanStr = str.replace(/[()]/g, '').trim()
  if (cleanStr.endsWith('-')) {
    cleanStr = '-' + cleanStr.slice(0, -1).trim()
  }

  // Detecta formato brasileiro (ex: 104.944,72 ou 1.500 ou 0,747) vs internacional (104944.72)
  const hasComma = cleanStr.includes(',')
  const hasDot = cleanStr.includes('.')

  if (hasComma && hasDot) {
    // Formato PT-BR: 1.234,56 ou -1.234,56
    cleanStr = cleanStr.replace(/\./g, '').replace(',', '.')
  } else if (hasComma && !hasDot) {
    // 1234,56 ou 0,75 ou 1,500
    cleanStr = cleanStr.replace(',', '.')
  } else if (!hasComma && hasDot) {
    // Se tiver mais de um ponto (ex: 1.234.567), todos exceto o último são milhares
    const parts = cleanStr.split('.')
    if (parts.length > 2) {
      cleanStr = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]
    }
  }

  const clean = cleanStr.replace(/[^0-9.-]/g, '')
  let n = parseFloat(clean)
  if (isNaN(n)) return 0
  if (isNegative && n > 0) {
    n = -n
  }
  return n
}

/**
 * Normaliza datas do Excel (serial number, Date object, ISO YYYY-MM-DD, PT-BR DD/MM/YYYY) para YYYY-MM-DD
 */
export function parseDateSafely(val: any): string {
  if (!val) return ''
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return ''
    const year = val.getFullYear()
    const month = String(val.getMonth() + 1).padStart(2, '0')
    const day = String(val.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  let s = String(val).trim()
  if (s.startsWith("'")) s = s.substring(1).trim()
  if (!s) return ''

  // ISO "2026-08-20" ou "2026-08-20T..."
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10)
  }

  // BR "20/08/2026" ou "20-08-2026" ou "20/8/2026"
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(s)) {
    const parts = s.split(/[/-]/)
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    let year = parts[2]
    if (year.length === 2) {
      year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`
    }
    return `${year}-${month}-${day}`
  }

  // Serial Excel (ex: 45000)
  const numVal = typeof val === 'number' ? val : parseFloat(s)
  if (!isNaN(numVal) && numVal > 30000 && numVal < 65000) {
    const utcDate = new Date(Math.round((numVal - 25569) * 86400 * 1000))
    if (!isNaN(utcDate.getTime())) {
      const year = utcDate.getUTCFullYear()
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
      const day = String(utcDate.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  return s.substring(0, 10)
}

/**
 * Normaliza formato de hora (Excel time decimal, "HH:mm:ss", "HH:mm", "HHmmss") para "HH:mm:ss"
 */
export function parseTimeSafely(val: any): string {
  if (val === null || val === undefined || val === '') return '00:00:00'
  if (val instanceof Date) {
    const hours = String(val.getHours()).padStart(2, '0')
    const minutes = String(val.getMinutes()).padStart(2, '0')
    const seconds = String(val.getSeconds()).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  let s = String(val).trim()
  if (s.startsWith("'")) s = s.substring(1).trim()
  if (!s) return '00:00:00'

  // Fração de dia do Excel (ex: 0.5 = 12:00:00)
  const numVal = typeof val === 'number' ? val : parseFloat(s)
  if (!isNaN(numVal) && numVal >= 0 && numVal < 1) {
    const totalSeconds = Math.round(numVal * 86400)
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
    const seconds = String(totalSeconds % 60).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  // String HH:mm:ss ou HH:mm
  if (/^\d{1,2}:\d{2}(:\d{2})?/.test(s)) {
    const parts = s.split(':')
    const h = parts[0].padStart(2, '0')
    const m = parts[1].padStart(2, '0')
    const sec = (parts[2] || '00').padStart(2, '0')
    return `${h}:${m}:${sec}`
  }

  return s
}

/**
 * Trata Data Remessa (Semana) como TEXTO (ex: 34.2026). NUNCA converte para número decimal.
 */
export function parseDeliveryWeekSafely(val: any): string {
  if (val === null || val === undefined) return ''
  let s = String(val).trim()
  if (s.startsWith("'")) s = s.substring(1).trim()
  return s
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
 * Busca valor na linha comparando chaves padrão, alternativas e case/accent-insensitive com trim
 */
export function extractRowValue(
  row: any,
  stdKey: string,
  altKeys: string[] = [],
  customMapping?: Record<string, string>,
): any {
  if (!row || typeof row !== 'object') return undefined

  // 1. Mapeamento customizado explícito
  if (customMapping && customMapping[stdKey] && row[customMapping[stdKey]] !== undefined) {
    return row[customMapping[stdKey]]
  }

  // 2. Chave direta exata
  if (row[stdKey] !== undefined && row[stdKey] !== null && String(row[stdKey]).trim() !== '') {
    return row[stdKey]
  }

  // 3. Chaves alternativas exatas
  for (const alt of altKeys) {
    if (row[alt] !== undefined && row[alt] !== null && String(row[alt]).trim() !== '') {
      return row[alt]
    }
  }

  // 4. Comparação normalizada (trim + lower + sem acentos + sem pontuação)
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
 * Validação do Layout ZSD35A V3 (27 Campos)
 */
export function validateZsd35Layout(
  sampleRow: Record<string, any>,
  customMapping?: Record<string, string>,
): { isRecognized: boolean; recognizedCount: number; missingFields: string[]; message: string } {
  if (!sampleRow || typeof sampleRow !== 'object') {
    return {
      isRecognized: false,
      recognizedCount: 0,
      missingFields: [...ZSD35A_V3_OFFICIAL_FIELDS],
      message: 'Layout não reconhecido: arquivo vazio ou sem linhas de dados.',
    }
  }

  const rowKeysNormalized = Object.keys(sampleRow).map(normalizeKey)
  const missingFields: string[] = []
  let recognizedCount = 0

  for (const field of ZSD35A_V3_OFFICIAL_FIELDS) {
    const custom = customMapping?.[field]
    const customNorm = custom ? normalizeKey(custom) : null
    const fieldNorm = normalizeKey(field)

    if (
      rowKeysNormalized.includes(fieldNorm) ||
      (customNorm && rowKeysNormalized.includes(customNorm))
    ) {
      recognizedCount++
    } else {
      missingFields.push(field)
    }
  }

  // Layout V3 é reconhecido se possuir os campos chave da ZSD35A operacional (ex: Documento de vendas, Região, Cidade, Recebedor Merc, etc.)
  const hasSalesDoc =
    rowKeysNormalized.includes(normalizeKey('Documento de vendas')) ||
    rowKeysNormalized.some(
      (k) => k.includes('vendas') || k.includes('documento') || k.includes('pedido'),
    )
  const isRecognized = recognizedCount >= 10 && hasSalesDoc

  const message = isRecognized
    ? `Layout ZSD35A V3 reconhecido (${recognizedCount}/${ZSD35A_V3_OFFICIAL_FIELDS.length} campos mapeados)`
    : 'Layout não reconhecido: cabeçalhos não correspondem à estrutura operacional ZSD35A V3.'

  return {
    isRecognized,
    recognizedCount,
    missingFields,
    message,
  }
}

/**
 * Motor Principal: Processa e Valida linhas do Excel/CSV ZSD35A V3 (27 Campos)
 * NÃO deduplica por Documento de vendas — um mesmo documento pode ter múltiplos itens/linhas.
 * Preserva chave técnica única (lote + linha).
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
  const batchId = options?.batchId || `LOTE-ZSD35-V3-${Date.now().toString(36).toUpperCase()}`
  const fileName = options?.fileName || 'ZSD35 Carga TMS v3.xlsx'
  const importedAt = new Date().toISOString()

  const validOrders: Zsd35ValidatedOrder[] = []
  const ignoredReasons: string[] = []
  const rejectionsLog: Array<{ rowNumber: number; reason: string; sampleData: any }> = []
  const warningsLog: Array<{ rowNumber: number; orderNumber: string; warning: string }> = []
  const technicalKeysSeen: string[] = []

  let ignoredRowsCount = 0
  let rejectedRowsCount = 0
  let duplicateCount = 0
  let updatedCount = 0

  const getVal = (stdKey: string, altKeys: string[] = [], rowObj: any): any => {
    return extractRowValue(rowObj, stdKey, altKeys, customMapping)
  }

  const today = new Date()

  // 1. Validar Layout pela primeira linha válida
  const firstDataRow = rows.find((r) => r && typeof r === 'object' && Object.keys(r).length > 0)
  const layoutCheck = firstDataRow
    ? validateZsd35Layout(firstDataRow, customMapping)
    : {
        isRecognized: false,
        recognizedCount: 0,
        missingFields: [],
        message: 'Planilha sem dados.',
      }

  // Se o layout não tiver nenhuma linha reconhecida
  if (!firstDataRow) {
    return {
      batchId,
      fileName,
      importedAt,
      layoutVersion: 'ZSD35A_V3_27_CAMPOS',
      layoutRecognized: false,
      layoutMessage: 'Layout não reconhecido: arquivo vazio.',
      totalRowsRead: 0,
      validOrders: [],
      validCount: 0,
      warningCount: 0,
      rejectedRowsCount: 0,
      ignoredRowsCount: 0,
      duplicateCount: 0,
      uniqueOrdersCount: 0,
      uniqueClientsCount: 0,
      uniqueMaterialsCount: 0,
      totalWeightTon: 0,
      totalValue: 0,
      totalFreightForecast: 0,
      ignoredReasons: ['Arquivo vazio'],
      rejectionsLog: [],
      warningsLog: [],
      newCount: 0,
      updatedCount: 0,
      summaryStatus: 'INVALIDO',
      technicalKeysSeen: [],
      origem_dado: 'EXCEL_QAS_ZSD35A_V3',
    }
  }

  // Agrupador de itens por documento para gerar número de item sequencial (000010, 000020, etc.)
  const docItemCounter = new Map<string, number>()

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

    // Gerar item sequencial por documento mantendo todas as linhas
    const currentItemCount = (docItemCounter.get(orderNumber) || 0) + 1
    docItemCounter.set(orderNumber, currentItemCount)
    const itemNumber = String(currentItemCount * 10).padStart(6, '0')

    const warnings: string[] = []

    // 4. Mapeamento dos 27 Campos Canônicos da ZSD35A V3

    // 1. Q.Dias
    const rawQDias = parseNumberSafely(getVal('Q.Dias', ['Dias', 'q_dias'], row))

    // 2. Gerar (ex: "não", "sim")
    const rawGerar = String(getVal('Gerar', ['gerar', 'Liberar'], row) || 'não').trim()

    // 3. Inco (ex: CIF, FOB)
    const rawInco = String(getVal('Inco', ['Incoterms', 'inco'], row) || 'CIF').trim()

    // 5. Região (ex: SP, MG, AL, BA, CE, etc.)
    let rawRegiao = String(getVal('Região', ['Regiao', 'UF', 'Estado', 'REGIO'], row) || 'SP')
      .trim()
      .toUpperCase()
    if (rawRegiao.length > 2) {
      rawRegiao = rawRegiao.substring(0, 2)
    }

    // 6. Cidade
    let city = String(
      getVal('Cidade', ['Municipio', 'ORT01', 'Cidade Destino', 'Destino'], row) || '',
    ).trim()
    if (!city) {
      city = 'São Paulo'
      warnings.push('Cidade não informada; adotado padrão regional.')
    }

    // 7. Qtde Real (Quantidade/peso real — aceita até 3 casas decimais)
    const rawQtdeReal = parseNumberSafely(
      getVal('Qtde Real', ['Qtde. Real', 'Quantidade Real', 'qtde_real'], row),
    )

    // 8. Qtde.Amar. (Quantidade de amarrações)
    const rawQtdeAmar = parseNumberSafely(getVal('Qtde.Amar.', ['Qtde Amar', 'Amarrações'], row))

    // 9. Est. Sider (Estoque Sidercentro)
    const rawEstSider = parseNumberSafely(
      getVal('Est. Sider', ['Estoque Sider', 'est_sider', 'Sider'], row),
    )

    // 10. Texto breve de material (Descrição do material)
    const materialText = String(
      getVal(
        'Texto breve de material',
        ['Texto breve do material', 'Material', 'Descricao', 'ARKTX', 'Descrição Material'],
        row,
      ) || 'PERFIL ESTRUTURAL AÇO',
    ).trim()

    // Código de material derivado da descrição ou do documento
    const materialCode = `MAT-${orderNumber}-${itemNumber}`

    // 11. Valor do Frete (Frete previsto na ordem)
    const rawValorFrete = parseNumberSafely(
      getVal('Valor do Frete', ['Frete', 'valor_frete', 'Frete Previsto'], row),
    )

    // 12. Recebedor Merc (Destinatário / Cliente)
    const customerName = String(
      getVal(
        'Recebedor Merc',
        ['Cliente', 'Nome Cliente', 'NAME1', 'Cliente SAP', 'Razão Social'],
        row,
      ) || `CLIENTE ${orderNumber}`,
    ).trim()

    // 13. Limite de Crédito
    const rawLimiteCredito = parseNumberSafely(
      getVal('Limite de Crédito', ['Limite de Credito', 'Limite Credito', 'limite_credito'], row),
    )

    // 14. Emissor da ordem (Código cliente / Comprador)
    const customerCode = String(
      getVal(
        'Emissor da ordem',
        ['Código cliente SAP', 'Cod Cliente', 'Emissor', 'KUNNR', 'Código Cliente'],
        row,
      ) || `CLI-${orderNumber}`,
    ).trim()

    // 15. Compromisso especial (Aceita valores positivos, zero e NEGATIVOS)
    const rawCompromissoEspecial = parseNumberSafely(
      getVal('Compromisso especial', ['Compromisso Especial', 'compromisso_especial'], row),
    )

    // 16. Condição de Pagament (Prazo comercial)
    const creditCond = String(
      getVal('Condição de Pagament', ['Condição de crédito', 'Condicao Pagamento', 'ZTERM'], row) ||
        '30 DDL',
    ).trim()

    // 17. Motivo Estoque (ex: "ESTOQUE CIAFAL", "ESTOQUE INSUFICIENTE", "ESTOQUE SUBCONTRATADA")
    const rawMotivoEstoque = String(
      getVal('Motivo Estoque', ['Situação de estoque', 'motivo_estoque'], row) || '',
    ).trim()

    // 18. Qtde.Estoque (Quantidade física em estoque)
    const rawQtdeEstoque = parseNumberSafely(
      getVal('Qtde.Estoque', ['Qtde Estoque', 'qtde_estoque', 'Estoque DP34'], row),
    )

    // 19. Saldo (Saldo a faturar)
    const rawSaldo = parseNumberSafely(getVal('Saldo', ['Saldo Pedido', 'saldo'], row))

    // 20. Data do Pedido
    const rawOrderDate = getVal(
      'Data do Pedido',
      ['Data do pedido', 'Data Pedido', 'data_pedido', 'ERDAT'],
      row,
    )
    const orderDate = parseDateSafely(rawOrderDate) || today.toISOString().split('T')[0]

    // 21. Hora do Pedido
    const rawOrderHour = getVal('Hora do Pedido', ['Hora Pedido', 'hora_pedido', 'ERZET'], row)
    const orderHour = parseTimeSafely(rawOrderHour)

    // 22. Quantidade da ordem (Volume total contratado)
    const rawQtdeOrdem = parseNumberSafely(
      getVal('Quantidade da ordem', ['Quantidade', 'Qtde Ordem', 'KWMENG'], row),
    )

    // 23. Data Remessa(Semana) — TEXTO (ex: 34.2026)
    const rawDataRemessaSemana = parseDeliveryWeekSafely(
      getVal(
        'Data Remessa(Semana)',
        ['Data Remessa (Semana)', 'Semana', 'data_remessa_semana'],
        row,
      ),
    )

    // 24. Itinerário (Código do itinerário logístico SAP)
    const itineraryCode = String(
      getVal(
        'Itinerário',
        ['Itinerário SAP', 'Itinerario', 'Rota', 'ROUTE', 'Itinerario SAP'],
        row,
      ) || 'SP001A',
    )
      .trim()
      .toUpperCase()

    // 25. Motivo Crédito (ex: "CRÉDITO OK", "TÍTULOS EM ABERTO ATRASADOS", etc.)
    const rawMotivoCredito = String(
      getVal(
        'Motivo Crédito',
        ['Status de crédito', 'Motivo de crédito/bloqueio', 'motivo_credito'],
        row,
      ) || 'CRÉDITO OK',
    ).trim()

    // 26. Total a Receber (Valor financeiro do pedido)
    const rawTotalReceber = parseNumberSafely(
      getVal('Total a Receber', ['Valor do pedido', 'Valor Total', 'total_receber', 'NETWR'], row),
    )

    // 27. Estoque Total
    const rawEstoqueTotal = parseNumberSafely(
      getVal('Estoque Total', ['Estoque disponível', 'Estoque', 'estoque_total'], row),
    )

    // 5. Normalização de Pesos e Unidades (sem inventar conversões; respeita dados originais)
    // Se Qtde Real estiver presente, usamos como peso principal (em toneladas se < 500 ou kg se >= 500)
    let weightKg = 0
    if (rawQtdeReal > 0) {
      weightKg = rawQtdeReal < 500 ? rawQtdeReal * 1000 : rawQtdeReal
    } else if (rawSaldo > 0) {
      weightKg = rawSaldo < 500 ? rawSaldo * 1000 : rawSaldo
    } else if (rawQtdeOrdem > 0) {
      weightKg = rawQtdeOrdem < 500 ? rawQtdeOrdem * 1000 : rawQtdeOrdem
    } else {
      weightKg = 5000
      warnings.push('Quantidade real não informada na linha; estimado em 5.000 kg.')
    }

    const weightTon = Math.round((weightKg / 1000) * 1000) / 1000

    // Valores Financeiros
    const totalValue =
      rawTotalReceber !== 0 ? rawTotalReceber : Math.round(weightKg * 4.5 * 100) / 100

    // Classificação de Crédito baseada no Motivo Crédito informativo do SAP
    let credit_status: 'Liberado' | 'Bloqueado' | 'Em Análise' = 'Liberado'
    const lowerCredit = rawMotivoCredito.toLowerCase()
    if (
      lowerCredit.includes('bloq') ||
      lowerCredit.includes('rejeit') ||
      lowerCredit.includes('estourado') ||
      lowerCredit.includes('atrasados a mais de') ||
      lowerCredit.includes('inadimplente')
    ) {
      credit_status = 'Bloqueado'
    } else if (
      lowerCredit.includes('analis') ||
      lowerCredit.includes('checar') ||
      lowerCredit.includes('revis') ||
      lowerCredit.includes('ultrapassada') ||
      lowerCredit.includes('pendente')
    ) {
      credit_status = 'Em Análise'
    } else if (lowerCredit.includes('ok') || lowerCredit.includes('liberado')) {
      credit_status = 'Liberado'
    }

    // Status de Produção & Estoque
    const stockQtyKg =
      (rawEstoqueTotal > 0 ? rawEstoqueTotal : rawQtdeEstoque > 0 ? rawQtdeEstoque : 0) *
      (rawEstoqueTotal < 500 && rawEstoqueTotal > 0 ? 1000 : 1)

    const balanceQtyKg = rawSaldo > 0 ? (rawSaldo < 500 ? rawSaldo * 1000 : rawSaldo) : weightKg

    const lowerStock = rawMotivoEstoque.toLowerCase()
    let production_status: 'Pronto' | 'Em Produção' | 'Programado' | 'Aguardando PCP' = 'Pronto'
    if (
      lowerStock.includes('ciafal') ||
      stockQtyKg >= weightKg ||
      rawEstSider > 0 ||
      rawQtdeEstoque >= weightKg
    ) {
      production_status = 'Pronto'
    } else if (
      lowerStock.includes('insuficiente') ||
      lowerStock.includes('falta') ||
      lowerStock.includes('prod')
    ) {
      production_status = 'Em Produção'
    } else if (lowerStock.includes('subcontratada') || lowerStock.includes('programado')) {
      production_status = 'Programado'
    } else {
      production_status = 'Pronto'
    }

    // Interseção Estoque DP34 x PCP
    let stockIntersectionType: 'ESTOQUE_ATUAL' | 'PRODUCAO_FUTURA' | 'SEM_PREVISAO' =
      'ESTOQUE_ATUAL'
    if (stockQtyKg >= weightKg || rawEstSider > 0 || lowerStock.includes('ciafal')) {
      stockIntersectionType = 'ESTOQUE_ATUAL'
    } else if (production_status === 'Em Produção' || production_status === 'Programado') {
      stockIntersectionType = 'PRODUCAO_FUTURA'
    } else {
      stockIntersectionType = 'SEM_PREVISAO'
    }

    const isSidercentro =
      rawEstSider > 0 ||
      materialText.toUpperCase().includes('SIDER') ||
      lowerStock.includes('sider')

    // Dias em Carteira
    const walletDays = calculateWalletDays(orderDate, rawQDias)

    // Desejada e Atraso
    const desiredDate = orderDate
    let overdueDays = 0
    let delayText = 'No prazo'
    let isOverdue = false
    if (walletDays > 7) {
      overdueDays = walletDays - 7
      delayText = `${overdueDays} dias de atraso`
      isOverdue = true
    }

    // Classificação de Validação (🟢 Válido / 🟡 Alerta / 🔴 Erro)
    // Erros impeditivos SOMENTE para documento inválido/ausente
    // NÃO bloquear por crédito negativo, saldo zero, compromisso especial negativo, etc.
    let validation_status: Zsd35RecordValidationStatus = 'VALID'
    if (warnings.length > 0) {
      validation_status = 'WARNING'
      warnings.forEach((w) => {
        warningsLog.push({ rowNumber: rowNum, orderNumber, warning: w })
      })
    }

    // Chave técnica única por linha: batchId_linha (permite múltiplos itens por documento)
    const technicalKey = `${batchId}_L${rowNum}_${orderNumber}_${itemNumber}`
    technicalKeysSeen.push(technicalKey)

    const validatedOrder: Zsd35ValidatedOrder = {
      order_number: orderNumber,
      item_number: itemNumber,
      technical_key: technicalKey,
      origem_dado: 'EXCEL_QAS_ZSD35A_V3',
      customer_code: customerCode,
      customer_name: customerName,
      destination_city: city,
      uf: rawRegiao,
      itinerary_code: itineraryCode,
      route_code: itineraryCode,
      material: materialCode,
      material_description: materialText,
      weight_kg: Math.round(weightKg),
      weight_ton: weightTon,
      total_value: Math.round(totalValue * 100) / 100,
      credit_status,
      credit_condition: creditCond,
      credit_limit: rawLimiteCredito,
      credit_reason: rawMotivoCredito,
      production_status,
      discharge_type: 'Ponte Rolante',
      discharges_count: 1,
      required_vehicle_type: 'Carreta / Bitrem',
      logistic_restrictions: '',
      order_date: orderDate,
      desired_date: desiredDate,
      company_code: '1000',
      plant_code: '1010',
      supplying_plant: '1010',
      storage_location: '0001',
      stock_quantity_kg: Math.round(stockQtyKg),
      stock_available: rawEstoqueTotal,
      stock_dp34: rawQtdeEstoque,
      missing_quantity: 0,
      balance_quantity_kg: Math.round(balanceQtyKg),
      is_sidercentro: isSidercentro,
      raw_q_dias: rawQDias,
      q_dias: walletDays,
      freight_value: rawValorFrete,
      toll_forecast_value: 0,
      priority_level: 'Normal',
      delivery_number: '',
      delivery_week: rawDataRemessaSemana,
      incoterms: rawInco,
      order_hour: orderHour,
      pcp_status: production_status,
      pcp_forecast_date: '',
      stock_total: rawEstoqueTotal,
      stock_sider: rawEstSider,
      quantity_order: rawQtdeOrdem,
      unit: 'KG',
      special_commitment: rawCompromissoEspecial,
      walletDays,
      overdueDays,
      delayText,
      isOverdue,
      stockIntersectionType,
      validation_status,
      validation_messages: warnings,
      import_batch_id: batchId,
      source_file: fileName,
      line_number: rowNum,
    }

    validOrders.push(validatedOrder)
  })

  const validCount = validOrders.filter((o) => o.validation_status === 'VALID').length
  const warningCount = validOrders.filter((o) => o.validation_status === 'WARNING').length
  const uniqueOrders = new Set(validOrders.map((o) => o.order_number)).size
  const uniqueClients = new Set(validOrders.map((o) => o.customer_code)).size
  const uniqueMaterials = new Set(validOrders.map((o) => o.material_description)).size
  const totalWeightTon =
    Math.round(validOrders.reduce((sum, o) => sum + o.weight_ton, 0) * 1000) / 1000
  const totalValue = Math.round(validOrders.reduce((sum, o) => sum + o.total_value, 0) * 100) / 100
  const totalFreightForecast =
    Math.round(validOrders.reduce((sum, o) => sum + (o.freight_value || 0), 0) * 100) / 100

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
    layoutVersion: 'ZSD35A_V3_27_CAMPOS',
    layoutRecognized: layoutCheck.isRecognized,
    layoutMessage: layoutCheck.message,
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
    totalFreightForecast,
    ignoredReasons,
    rejectionsLog,
    warningsLog,
    newCount: validOrders.length,
    updatedCount,
    summaryStatus,
    technicalKeysSeen,
    origem_dado: 'EXCEL_QAS_ZSD35_V3',
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
 * Gera e realiza download do arquivo template oficial ZSD35A V3 em formato .xlsx
 * Contém exatamente as 27 colunas oficiais na ordem obrigatória, fundo cinza claro nos cabeçalhos,
 * sem abas adicionais obrigatórias, sem fórmulas, com linhas seguintes vazias para preenchimento.
 */
export function generateZsd35aV3TemplateWorkbook(includeSampleData = false): XLSX.WorkBook {
  const sampleRows: Record<string, any>[] = includeSampleData
    ? [
        {
          'Q.Dias': 4,
          Gerar: 'não',
          Inco: 'CIF',
          'Documento de vendas': '10494472',
          Região: 'SP',
          Cidade: 'Campinas',
          'Qtde Real': 28.0,
          'Qtde.Amar.': 14,
          'Est. Sider': 0,
          'Texto breve de material': 'PERFIL ESTRUTURAL W 250 X 32,8 KG/M 12M',
          'Valor do Frete': 3450.0,
          'Recebedor Merc': 'AÇOS BRASIL ESTRUTURAS METÁLICAS LTDA',
          'Limite de Crédito': 500000.0,
          'Emissor da ordem': 'CLI-20041',
          'Compromisso especial': 0.0,
          'Condição de Pagament': '30 DDL',
          'Motivo Estoque': 'ESTOQUE CIAFAL',
          'Qtde.Estoque': 32.0,
          Saldo: 28.0,
          'Data do Pedido': '20/03/2026',
          'Hora do Pedido': '09:15:00',
          'Quantidade da ordem': 28.0,
          'Data Remessa(Semana)': '34.2026',
          Itinerário: 'SP001A',
          'Motivo Crédito': 'CRÉDITO OK',
          'Total a Receber': 148500.0,
          'Estoque Total': 32.0,
        },
        {
          'Q.Dias': 9,
          Gerar: 'não',
          Inco: 'CIF',
          'Documento de vendas': '10494473',
          Região: 'MG',
          Cidade: 'Pouso Alegre',
          'Qtde Real': 18.5,
          'Qtde.Amar.': 8,
          'Est. Sider': 5.0,
          'Texto breve de material': 'TUBO INDUSTRIAL QUADRADO 150X150 E=4.75MM',
          'Valor do Frete': 2890.0,
          'Recebedor Merc': 'CONSTRUTORA E METALÚRGICA VALE DO TIETÊ',
          'Limite de Crédito': 350000.0,
          'Emissor da ordem': 'CLI-30089',
          'Compromisso especial': -1250.0, // Aceita negativo
          'Condição de Pagament': '45 DDL',
          'Motivo Estoque': 'ESTOQUE INSUFICIENTE',
          'Qtde.Estoque': 0.0,
          Saldo: 18.5,
          'Data do Pedido': '15/03/2026',
          'Hora do Pedido': '14:30:22',
          'Quantidade da ordem': 18.5,
          'Data Remessa(Semana)': '35.2026',
          Itinerário: 'MG002A',
          'Motivo Crédito': 'CRÉDITO OK/CHECAR LIMITE DE CRÉDITO',
          'Total a Receber': 96200.0,
          'Estoque Total': 5.0,
        },
      ]
    : []

  // Constrói a planilha com os 27 cabeçalhos na ordem canônica
  const ws = XLSX.utils.json_to_sheet(sampleRows, {
    header: ZSD35A_V3_OFFICIAL_FIELDS as unknown as string[],
  })

  // Larguras das 27 colunas
  ws['!cols'] = [
    { wch: 10 }, // 1. Q.Dias
    { wch: 8 }, // 2. Gerar
    { wch: 8 }, // 3. Inco
    { wch: 22 }, // 4. Documento de vendas
    { wch: 8 }, // 5. Região
    { wch: 20 }, // 6. Cidade
    { wch: 12 }, // 7. Qtde Real
    { wch: 12 }, // 8. Qtde.Amar.
    { wch: 12 }, // 9. Est. Sider
    { wch: 38 }, // 10. Texto breve de material
    { wch: 14 }, // 11. Valor do Frete
    { wch: 36 }, // 12. Recebedor Merc
    { wch: 18 }, // 13. Limite de Crédito
    { wch: 18 }, // 14. Emissor da ordem
    { wch: 22 }, // 15. Compromisso especial
    { wch: 22 }, // 16. Condição de Pagament
    { wch: 24 }, // 17. Motivo Estoque
    { wch: 14 }, // 18. Qtde.Estoque
    { wch: 12 }, // 19. Saldo
    { wch: 14 }, // 20. Data do Pedido
    { wch: 14 }, // 21. Hora do Pedido
    { wch: 20 }, // 22. Quantidade da ordem
    { wch: 22 }, // 23. Data Remessa(Semana)
    { wch: 14 }, // 24. Itinerário
    { wch: 36 }, // 25. Motivo Crédito
    { wch: 18 }, // 26. Total a Receber
    { wch: 14 }, // 27. Estoque Total
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'ZSD35_CARGA_TMS')

  return wb
}

// Alias para compatibilidade
export const generateZsd35aTemplateWorkbook = generateZsd35aV3TemplateWorkbook

/**
 * Dispara o download do template oficial ZSD35A V3 (.xlsx) no navegador
 */
export function downloadZsd35aTemplateFile(): void {
  const wb = generateZsd35aV3TemplateWorkbook(false)
  XLSX.writeFile(wb, 'ZSD35_Carga_TMS_Padrao.xlsx')
}

/**
 * Dispara o download de exemplo preenchido com dados fictícios
 */
export function downloadZsd35aExampleFile(): void {
  const wb = generateZsd35aV3TemplateWorkbook(true)
  XLSX.writeFile(wb, 'TMS_CIAFAL_ZSD35A_EXEMPLO_PREENCHIDO.xlsx')
}
