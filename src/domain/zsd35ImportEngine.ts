// TMS CIAFAL — Sprint 6: Mapeador e Validador de Importação da Carteira ZSD35 (28 Colunas Oficiais)
// Detecta e rejeita subtotais, linhas agregadas e cabeçalhos repetidos.

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
}

/**
 * Função de Validação e Limpeza da Planilha ZSD35
 */
export function processZsd35Rows(
  rows: any[],
  customMapping?: Record<string, string>,
): Zsd35ImportValidationReport {
  const validOrders: Zsd35ValidatedOrder[] = []
  const ignoredReasons: string[] = []
  const rejectionsLog: Array<{ rowNumber: number; reason: string; sampleData: any }> = []
  let ignoredRowsCount = 0
  let rejectedRowsCount = 0

  const getVal = (row: any, stdKey: string, altKeys: string[] = []): any => {
    if (customMapping && customMapping[stdKey] && row[customMapping[stdKey]] !== undefined) {
      return row[customMapping[stdKey]]
    }
    if (row[stdKey] !== undefined) return row[stdKey]
    for (const alt of altKeys) {
      if (row[alt] !== undefined) return row[alt]
    }
    return undefined
  }

  rows.forEach((row, index) => {
    const rowNum = index + 1

    // 1. Detectar e ignorar cabeçalhos repetidos
    const docVendasRaw = String(
      getVal(row, 'Documento de vendas', ['doc_vendas', 'Ordem', 'Pedido']) || '',
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

    const customerName = String(
      getVal(row, 'Recebedor Merc', ['Cliente', 'Nome Cliente']) || 'CLIENTE NÃO INFORMADO',
    ).trim()
    const customerCode = String(
      getVal(row, 'Emissor da ordem', ['Cod Cliente', 'Emissor']) || `CLI-${orderNumber}`,
    ).trim()
    const city = String(getVal(row, 'Cidade', ['Municipio']) || 'São Paulo').trim()
    const uf = String(getVal(row, 'Região', ['UF', 'Estado']) || 'SP')
      .trim()
      .toUpperCase()
    const itineraryCode = String(getVal(row, 'Itinerário', ['Itinerario', 'Rota']) || 'SP001A')
      .trim()
      .toUpperCase()

    // Conversão de Pesos e Valores
    const parseNum = (val: any): number => {
      if (typeof val === 'number') return val
      if (!val) return 0
      const clean = String(val)
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^0-9.-]/g, '')
      const n = parseFloat(clean)
      return isNaN(n) ? 0 : n
    }

    const weightKg =
      parseNum(getVal(row, 'Qtde Real', ['Quantidade Real', 'Peso'])) * 1000 ||
      parseNum(getVal(row, 'Saldo', ['Saldo Pedido'])) * 1000 ||
      parseNum(getVal(row, 'Quantidade da ordem', ['Qtde Ordem'])) * 1000 ||
      5000

    const totalValue =
      parseNum(getVal(row, 'Total a Receber', ['Valor Total', 'Valor do Frete'])) || weightKg * 4.5
    const stockQty = parseNum(getVal(row, 'Qtde.Estoque', ['Estoque Total', 'Estoque'])) * 1000
    const balanceQty = parseNum(getVal(row, 'Saldo', ['Saldo'])) * 1000 || weightKg

    // Crédito e PCP
    const rawCredit = String(
      getVal(row, 'Motivo Crédito', ['Status Crédito', 'Status Credito']) || '',
    ).toLowerCase()
    let credit_status: 'Liberado' | 'Bloqueado' | 'Em Análise' = 'Liberado'
    if (rawCredit.includes('bloq') || rawCredit.includes('rejeit')) {
      credit_status = 'Bloqueado'
    } else if (rawCredit.includes('analis') || rawCredit.includes('limite')) {
      credit_status = 'Em Análise'
    }

    const rawStockMotiv = String(getVal(row, 'Motivo Estoque', ['Status PCP']) || '').toLowerCase()
    let production_status: 'Pronto' | 'Em Produção' | 'Programado' | 'Aguardando PCP' = 'Pronto'
    if (stockQty < weightKg || rawStockMotiv.includes('falta') || rawStockMotiv.includes('prod')) {
      production_status = 'Em Produção'
    }

    const materialText = String(
      getVal(row, 'Texto breve de material', ['Material', 'Descricao']) || 'PERFIL ESTRUTURAL AÇO',
    ).trim()
    const isSidercentro =
      String(getVal(row, 'Est. Sider', ['Sidercentro']) || '').trim().length > 0 ||
      materialText.toUpperCase().includes('SIDER')

    // Datas
    const desiredDate =
      getVal(row, 'Data Remessa(Semana)', ['Data Desejada', 'Remessa']) ||
      new Date().toISOString().split('T')[0]
    const orderDate =
      getVal(row, 'Data do Pedido', ['Data Pedido']) || new Date().toISOString().split('T')[0]

    validOrders.push({
      order_number: orderNumber,
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
      order_date: String(orderDate),
      desired_date: String(desiredDate),
      stock_quantity_kg: Math.round(stockQty),
      balance_quantity_kg: Math.round(balanceQty),
      is_sidercentro: isSidercentro,
      raw_q_dias: parseNum(getVal(row, 'Q.Dias', ['Dias'])),
    })
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
    newCount: validOrders.length,
    updatedCount: 0,
    summaryStatus,
  }
}
