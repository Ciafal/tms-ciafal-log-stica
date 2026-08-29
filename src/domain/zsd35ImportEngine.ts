// TMS CIAFAL — Sprint 6: Mapeador, Validador e Motor de Carga ZSD35 (28 Campos Oficiais)
// Detecta e rejeita subtotais, linhas agregadas e cabeçalhos repetidos.
// Garante chave técnica única (Documento de Vendas + Material / Item) para evitar duplicidade.

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
  'Q.Dias'?: any
  Gerar?: any
  Status?: any
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

export interface Zsd35ValidatedOrder {
  order_number: string
  item_number?: string
  technical_key: string // chave técnica única: order_number + '_' + material
  customer_code: string
  customer_name: string
  destination_city: string
  uf: string
  itinerary_code: string
  material: string
  material_description: string
  weight_kg: number
  total_value: number
  credit_status: 'Liberado' | 'Bloqueado' | 'Em Análise'
  production_status: 'Pronto' | 'Em Produção' | 'Programado' | 'Aguardando PCP'
  discharge_type: string
  order_date?: string
  desired_date?: string
  stock_quantity_kg: number
  balance_quantity_kg: number
  is_sidercentro: boolean
  raw_q_dias?: number
  q_dias?: number
  freight_value?: number
  credit_limit?: number
  credit_reason?: string
  stock_total?: number
  stock_sider?: number
  order_hour?: string
  quantity_order?: number
  delivery_week?: string
  incoterms?: string
  // Cruzamentos visuais calculados
  walletDays?: number
  overdueDays?: number
  delayText?: string
  isOverdue?: boolean
  stockIntersectionType?: 'ESTOQUE_ATUAL' | 'PRODUCAO_FUTURA' | 'SEM_PREVISAO'
}

export interface Zsd35ImportValidationReport {
  totalRowsRead: number
  validOrders: Zsd35ValidatedOrder[]
  ignoredRowsCount: number
  rejectedRowsCount: number
  ignoredReasons: string[]
  rejectionsLog: Array<{ rowNumber: number; reason: string; sampleData: any }>
  newCount: number
  updatedCount: number
  summaryStatus: 'VALIDO' | 'VALIDO_COM_AVISOS' | 'INVALIDO'
  technicalKeysSeen?: string[]
}

/**
 * Função de Validação, Deduplicação e Limpeza da Planilha ZSD35
 */
export function processZsd35Rows(
  rows: any[],
  customMapping?: Record<string, string>,
): Zsd35ImportValidationReport {
  const validOrders: Zsd35ValidatedOrder[] = []
  const ignoredReasons: string[] = []
  const rejectionsLog: Array<{ rowNumber: number; reason: string; sampleData: any }> = []
  const seenTechnicalKeys = new Map<string, number>() // technicalKey -> index in validOrders
  let ignoredRowsCount = 0
  let rejectedRowsCount = 0
  let updatedCount = 0

  const getVal = (row: any, stdKey: string, altKeys: string[] = []): any => {
    if (customMapping && customMapping[stdKey] && row[customMapping[stdKey]] !== undefined) {
      return row[customMapping[stdKey]]
    }
    if (row[stdKey] !== undefined) return row[stdKey]
    for (const alt of altKeys) {
      if (row[alt] !== undefined) return row[alt]
    }
    // Suporte case-insensitive fallback para chaves customizadas
    const lowerStd = stdKey.toLowerCase().replace(/[^a-z0-9]/g, '')
    for (const k of Object.keys(row)) {
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (cleanK === lowerStd) return row[k]
    }
    return undefined
  }

  // Conversão segura de Números e Pesos
  const parseNum = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val
    if (!val) return 0
    let str = String(val).trim()
    if (!str) return 0

    // Detecta formato brasileiro (ex: 104.944,72 ou 158.565 ou 0,747) vs internacional (104944.72)
    const hasComma = str.includes(',')
    const hasDot = str.includes('.')

    if (hasComma && hasDot) {
      // Formato PT-BR: "104.944,72" -> ponto é milhar, vírgula é decimal
      str = str.replace(/\./g, '').replace(',', '.')
    } else if (hasComma && !hasDot) {
      // "0,747" ou "14,50" -> vírgula é decimal
      str = str.replace(',', '.')
    } else if (!hasComma && hasDot) {
      // Ex: "158.565" ou "242580.24" ou "34.2026"
      // Se tiver mais de um ponto, todos exceto o último são milhares
      const parts = str.split('.')
      if (parts.length > 2) {
        str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]
      }
    }

    const clean = str.replace(/[^0-9.-]/g, '')
    const n = parseFloat(clean)
    return isNaN(n) ? 0 : n
  }

  // Normalização de Datas
  const parseDateStr = (val: any): string => {
    if (!val) return ''
    if (val instanceof Date) {
      return val.toISOString().split('T')[0]
    }
    const s = String(val).trim()
    // Caso ISO "2026-08-20 00:00:00" ou "2026-08-20"
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.substring(0, 10)
    }
    // Caso BR "20/08/2026"
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
      const [d, m, y] = s.split('/')
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    // Caso numérico Excel serial (ex: 46254)
    if (typeof val === 'number' && val > 30000 && val < 60000) {
      const utcDate = new Date(Math.round((val - 25569) * 86400 * 1000))
      return utcDate.toISOString().split('T')[0]
    }
    return s.substring(0, 10)
  }

  rows.forEach((row, index) => {
    const rowNum = index + 1

    // 1. Detectar e ignorar cabeçalhos repetidos
    const docVendasRaw = String(
      getVal(row, 'Documento de vendas', ['doc_vendas', 'Ordem', 'Pedido', 'VBELN']) || '',
    ).trim()

    if (
      !docVendasRaw ||
      docVendasRaw.toLowerCase().includes('documento') ||
      docVendasRaw.toLowerCase().includes('vendas')
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
      docVendasRaw.startsWith('---')
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

    const materialText = String(
      getVal(row, 'Texto breve de material', ['Material', 'Descricao', 'ARKTX']) ||
        'PERFIL ESTRUTURAL AÇO',
    ).trim()

    const city = String(getVal(row, 'Cidade', ['Municipio', 'ORT01']) || 'São Paulo').trim()
    const uf = String(getVal(row, 'Região', ['UF', 'Estado', 'REGIO']) || 'SP')
      .trim()
      .toUpperCase()
    const itineraryCode = String(
      getVal(row, 'Itinerário', ['Itinerario', 'Rota', 'ROUTE']) || 'SP001A',
    )
      .trim()
      .toUpperCase()

    const customerName = String(
      getVal(row, 'Recebedor Merc', ['Cliente', 'Nome Cliente', 'NAME1']) ||
        `CLIENTE ${city.toUpperCase()}`,
    ).trim()
    const customerCode = String(
      getVal(row, 'Emissor da ordem', ['Cod Cliente', 'Emissor', 'KUNNR']) || `CLI-${orderNumber}`,
    ).trim()

    // Q.Dias
    const qDiasVal = parseNum(getVal(row, 'Q.Dias', ['Dias', 'q_dias']))

    // Quantidade Real / Saldo
    const rawQtdeReal = parseNum(getVal(row, 'Qtde Real', ['Quantidade Real', 'Qtde_Real']))
    const rawSaldo = parseNum(getVal(row, 'Saldo', ['Saldo Pedido']))
    const rawQtdeOrdem = parseNum(getVal(row, 'Quantidade da ordem', ['Qtde Ordem', 'Qtde_Ordem']))

    // Unidades de Peso no SAP: 2.0 (t) => 2000 kg, 0.747 => 747 kg, 158.565 => 158565 kg
    let weightKg = 0
    if (rawQtdeReal > 0) {
      weightKg = rawQtdeReal < 500 ? rawQtdeReal * 1000 : rawQtdeReal
    } else if (rawSaldo > 0) {
      weightKg = rawSaldo < 500 ? rawSaldo * 1000 : rawSaldo
    } else if (rawQtdeOrdem > 0) {
      weightKg = rawQtdeOrdem < 500 ? rawQtdeOrdem * 1000 : rawQtdeOrdem
    } else {
      weightKg = 5000
    }

    // Valores Financeiros & Frete
    const rawValorFrete = parseNum(getVal(row, 'Valor do Frete', ['Frete', 'valor_frete']))
    const rawLimiteCredito = parseNum(
      getVal(row, 'Limite de Crédito', ['Limite Credito', 'limite_credito']),
    )
    const rawTotalReceber = parseNum(
      getVal(row, 'Total a Receber', ['Valor Total', 'total_receber']),
    )
    const totalValue = rawTotalReceber > 0 ? rawTotalReceber : weightKg * 4.5

    // Estoques
    const rawEstSider = parseNum(getVal(row, 'Est. Sider', ['Estoque Sider', 'est_sider']))
    const rawEstoqueTotal = parseNum(getVal(row, 'Estoque Total', ['Estoque', 'estoque_total']))
    const rawQtdeEstoque = parseNum(getVal(row, 'Qtde.Estoque', ['qtde_estoque']))

    const stockQtyKg =
      (rawEstoqueTotal > 0 ? rawEstoqueTotal : rawQtdeEstoque > 0 ? rawQtdeEstoque : 0) *
      (rawEstoqueTotal < 500 && rawEstoqueTotal > 0 ? 1000 : 1)
    const balanceQtyKg = rawSaldo > 0 ? (rawSaldo < 500 ? rawSaldo * 1000 : rawSaldo) : weightKg

    // Status de Crédito
    const rawCredit = String(
      getVal(row, 'Motivo Crédito', ['Status Crédito', 'motivo_credito']) || '',
    )
    let credit_status: 'Liberado' | 'Bloqueado' | 'Em Análise' = 'Liberado'
    const lowerCredit = rawCredit.toLowerCase()
    if (
      lowerCredit.includes('bloq') ||
      lowerCredit.includes('rejeit') ||
      lowerCredit.includes('estourado')
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

    // Status de Produção & PCP
    const rawStockMotiv = String(
      getVal(row, 'Motivo Estoque', ['Status PCP', 'motivo_estoque']) || '',
    ).toLowerCase()
    let production_status: 'Pronto' | 'Em Produção' | 'Programado' | 'Aguardando PCP' = 'Pronto'
    if (stockQtyKg >= weightKg && stockQtyKg > 0) {
      production_status = 'Pronto'
    } else if (
      rawStockMotiv.includes('falta') ||
      rawStockMotiv.includes('prod') ||
      rawStockMotiv.includes('fabrica')
    ) {
      production_status = 'Em Produção'
    } else if (rawStockMotiv.includes('prog') || rawStockMotiv.includes('pcp')) {
      production_status = 'Programado'
    } else if (rawEstSider > 0 || stockQtyKg > 0) {
      production_status = 'Pronto'
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
      String(getVal(row, 'Est. Sider', ['Sidercentro']) || '').trim().length > 0 ||
      materialText.toUpperCase().includes('SIDER')

    // Datas
    const rawDesired = getVal(row, 'Data Remessa(Semana)', [
      'Data Desejada',
      'Remessa',
      'data_remessa',
    ])
    const rawOrderDate = getVal(row, 'Data do Pedido', ['Data Pedido', 'data_pedido'])
    const orderDate = parseDateStr(rawOrderDate) || new Date().toISOString().split('T')[0]
    const desiredDate = parseDateStr(rawDesired) || orderDate

    // Indicadores calculados (Tempo em Carteira e Atraso)
    const today = new Date()
    let walletDays = 0
    if (orderDate) {
      const d = new Date(orderDate + 'T12:00:00')
      walletDays = Math.max(0, Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)))
    }
    if (qDiasVal > 0 && walletDays === 0) {
      walletDays = qDiasVal
    }

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

    // 4. Chave Técnica Única: Documento de Vendas + Material (ou item)
    const cleanMaterialKey = materialText.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30)
    const technicalKey = `${orderNumber}_${cleanMaterialKey}`

    const validatedOrder: Zsd35ValidatedOrder = {
      order_number: orderNumber,
      item_number: '000010',
      technical_key: technicalKey,
      customer_code: customerCode,
      customer_name: customerName,
      destination_city: city,
      uf,
      itinerary_code: itineraryCode,
      material: materialText.substring(0, 40),
      material_description: materialText,
      weight_kg: Math.round(weightKg),
      total_value: Math.round(totalValue * 100) / 100,
      credit_status,
      production_status,
      discharge_type: 'Ponte Rolante',
      order_date: orderDate,
      desired_date: desiredDate,
      stock_quantity_kg: Math.round(stockQtyKg),
      balance_quantity_kg: Math.round(balanceQtyKg),
      is_sidercentro: isSidercentro,
      raw_q_dias: qDiasVal,
      q_dias: qDiasVal,
      freight_value: rawValorFrete,
      credit_limit: rawLimiteCredito,
      credit_reason: rawCredit || 'CRÉDITO OK',
      stock_total: rawEstoqueTotal,
      stock_sider: rawEstSider,
      order_hour: String(getVal(row, 'Hora do Pedido', ['hora_pedido']) || '00:00:00'),
      quantity_order: rawQtdeOrdem,
      delivery_week: String(getVal(row, 'Data Remessa(Semana)', ['Semana']) || ''),
      incoterms: String(getVal(row, 'Inco', ['Incoterms', 'inco']) || 'CIF'),
      walletDays,
      overdueDays,
      delayText,
      isOverdue,
      stockIntersectionType,
    }

    // Deduplicação: se a mesma chave técnica já apareceu neste mesmo lote, atualiza em vez de duplicar
    if (seenTechnicalKeys.has(technicalKey)) {
      const prevIdx = seenTechnicalKeys.get(technicalKey)!
      validOrders[prevIdx] = validatedOrder
      updatedCount++
    } else {
      seenTechnicalKeys.set(technicalKey, validOrders.length)
      validOrders.push(validatedOrder)
    }
  })

  const summaryStatus =
    rejectedRowsCount > 0 && validOrders.length === 0
      ? 'INVALIDO'
      : rejectedRowsCount > 0
        ? 'VALIDO_COM_AVISOS'
        : 'VALIDO'

  return {
    totalRowsRead: rows.length,
    validOrders,
    ignoredRowsCount,
    rejectedRowsCount,
    ignoredReasons,
    rejectionsLog,
    newCount: validOrders.length - updatedCount,
    updatedCount,
    summaryStatus,
    technicalKeysSeen: Array.from(seenTechnicalKeys.keys()),
  }
}

/**
 * Normaliza e parseia CSV bruto de ZSD35 respeitando delimitadores (;, \t, ,)
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
      rowObj[hdr] = parts[idx] !== undefined ? parts[idx] : ''
    })
    rows.push(rowObj)
  }
  return rows
}
