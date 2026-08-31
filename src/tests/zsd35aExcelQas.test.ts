// TMS CIAFAL — Testes da Carga ZSD35A V3 via Excel / QAS (27 Campos Canônicos)
// Validação do layout operacional oficial "ZSD35 Carga TMS v3.xlsx",
// motor de parser tolerante, tipagem estrita (Data Remessa como texto, valores negativos, 3 casas decimais),
// sanitização contra Formula Injection, deduplicação por chave técnica (lote + linha),
// não-deduplicação por Documento de Vendas (múltiplas linhas preservadas),
// e teste direto com a estrutura canônica de 27 campos.

import { describe, it, expect } from 'vitest'
import {
  processZsd35Rows,
  parseZsd35CsvText,
  sanitizeCellValue,
  parseNumberSafely,
  parseDateSafely,
  parseTimeSafely,
  parseDeliveryWeekSafely,
  calculateWalletDays,
  validateZsd35Layout,
  generateZsd35aV3TemplateWorkbook,
  ZSD35A_V3_OFFICIAL_FIELDS,
} from '../domain/zsd35ImportEngine'

describe('SUITE ZSD35A V3: Carga Operacional Oficial (27 Campos Canônicos)', () => {
  // Teste 1: Validação exata dos 27 campos oficiais na ordem canônica
  it('1. Deve validar que o layout oficial possui exatamente os 27 campos na ordem canônica do arquivo operacional', () => {
    expect(ZSD35A_V3_OFFICIAL_FIELDS.length).toBe(27)
    expect(ZSD35A_V3_OFFICIAL_FIELDS[0]).toBe('Q.Dias')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[1]).toBe('Gerar')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[2]).toBe('Inco')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[3]).toBe('Documento de vendas')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[4]).toBe('Região')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[5]).toBe('Cidade')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[6]).toBe('Qtde Real')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[7]).toBe('Qtde.Amar.')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[8]).toBe('Est. Sider')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[9]).toBe('Texto breve de material')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[10]).toBe('Valor do Frete')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[11]).toBe('Recebedor Merc')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[12]).toBe('Limite de Crédito')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[13]).toBe('Emissor da ordem')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[14]).toBe('Compromisso especial')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[15]).toBe('Condição de Pagament')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[16]).toBe('Motivo Estoque')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[17]).toBe('Qtde.Estoque')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[18]).toBe('Saldo')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[19]).toBe('Data do Pedido')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[20]).toBe('Hora do Pedido')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[21]).toBe('Quantidade da ordem')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[22]).toBe('Data Remessa(Semana)')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[23]).toBe('Itinerário')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[24]).toBe('Motivo Crédito')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[25]).toBe('Total a Receber')
    expect(ZSD35A_V3_OFFICIAL_FIELDS[26]).toBe('Estoque Total')
  })

  // Teste 2: Processamento do arquivo operacional ZSD35 Carga TMS v3.xlsx diretamente
  it('2. Deve processar diretamente uma linha real da planilha operacional ZSD35 Carga TMS v3', () => {
    const rawRow = {
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
    }

    const report = processZsd35Rows([rawRow], undefined, {
      batchId: 'LOTE-TEST-V3',
      fileName: 'ZSD35 Carga TMS v3.xlsx',
      userName: 'Gestor Operacional',
    })

    expect(report.layoutRecognized).toBe(true)
    expect(report.layoutVersion).toBe('ZSD35A_V3_27_CAMPOS')
    expect(report.origem_dado).toBe('EXCEL_QAS_ZSD35_V3')
    expect(report.validOrders.length).toBe(1)

    const order = report.validOrders[0]
    expect(order.order_number).toBe('10494472')
    expect(order.item_number).toBe('000010')
    expect(order.customer_code).toBe('CLI-20041')
    expect(order.customer_name).toBe('AÇOS BRASIL ESTRUTURAS METÁLICAS LTDA')
    expect(order.destination_city).toBe('Campinas')
    expect(order.uf).toBe('SP')
    expect(order.weight_ton).toBe(28.0)
    expect(order.weight_kg).toBe(28000)
    expect(order.material_description).toBe('PERFIL ESTRUTURAL W 250 X 32,8 KG/M 12M')
    expect(order.freight_value).toBe(3450.0)
    expect(order.credit_limit).toBe(500000.0)
    expect(order.credit_condition).toBe('30 DDL')
    expect(order.credit_reason).toBe('CRÉDITO OK')
    expect(order.credit_status).toBe('Liberado')
    expect(order.order_date).toBe('2026-03-20')
    expect(order.order_hour).toBe('09:15:00')
    expect(order.delivery_week).toBe('34.2026')
    expect(order.itinerary_code).toBe('SP001A')
    expect(order.total_value).toBe(148500.0)
    expect(order.stock_available).toBe(32.0)
    expect(order.stockIntersectionType).toBe('ESTOQUE_ATUAL')
    expect(order.validation_status).toBe('VALID')
  })

  // Teste 3: Não deduplicação indevida por Documento de Vendas (múltiplas linhas preservadas)
  it('3. Deve preservar múltiplas linhas com o mesmo Documento de Vendas (Pedido com múltiplos itens)', () => {
    const rows = [
      {
        'Documento de vendas': '10494472',
        'Texto breve de material': 'PERFIL W 250X32',
        'Qtde Real': 15.0,
      },
      {
        'Documento de vendas': '10494472',
        'Texto breve de material': 'CANTONEIRA LAMINADA 2 POL',
        'Qtde Real': 13.0,
      },
      {
        'Documento de vendas': '10494472',
        'Texto breve de material': 'BARRA CHATA 3 POL',
        'Qtde Real': 8.5,
      },
    ]

    const report = processZsd35Rows(rows, undefined, { batchId: 'LOTE-MULTI-ITEM' })
    expect(report.validOrders.length).toBe(3)
    expect(report.uniqueOrdersCount).toBe(1) // 1 pedido único

    expect(report.validOrders[0].item_number).toBe('000010')
    expect(report.validOrders[0].material_description).toBe('PERFIL W 250X32')
    expect(report.validOrders[0].weight_ton).toBe(15.0)

    expect(report.validOrders[1].item_number).toBe('000020')
    expect(report.validOrders[1].material_description).toBe('CANTONEIRA LAMINADA 2 POL')
    expect(report.validOrders[1].weight_ton).toBe(13.0)

    expect(report.validOrders[2].item_number).toBe('000030')
    expect(report.validOrders[2].material_description).toBe('BARRA CHATA 3 POL')
    expect(report.validOrders[2].weight_ton).toBe(8.5)
  })

  // Teste 4: Compromisso especial aceitando valores NEGATIVOS, zero e positivos
  it('4. Deve suportar valores negativos em Compromisso especial sem bloquear a linha', () => {
    expect(parseNumberSafely('-1250,50')).toBeCloseTo(-1250.5, 2)
    expect(parseNumberSafely('-1.250,50')).toBeCloseTo(-1250.5, 2)
    expect(parseNumberSafely('1250,50-')).toBeCloseTo(-1250.5, 2)
    expect(parseNumberSafely('(1250.50)')).toBeCloseTo(-1250.5, 2)

    const row = {
      'Documento de vendas': '10494499',
      'Compromisso especial': '-1.250,00',
      'Qtde Real': 20.0,
    }

    const report = processZsd35Rows([row])
    expect(report.validOrders.length).toBe(1)
    expect(report.validOrders[0].special_commitment).toBe(-1250.0)
    expect(report.validOrders[0].validation_status).toBe('VALID')
  })

  // Teste 5: Data Remessa(Semana) deve ser tratada como TEXTO (ex: 34.2026) e nunca como decimal
  it('5. Deve manter Data Remessa(Semana) como texto exato (ex: 34.2026) sem conversão numérica', () => {
    expect(parseDeliveryWeekSafely('34.2026')).toBe('34.2026')
    expect(parseDeliveryWeekSafely("'34.2026")).toBe('34.2026')
    expect(parseDeliveryWeekSafely(34.2026)).toBe('34.2026')

    const row = {
      'Documento de vendas': '10494500',
      'Data Remessa(Semana)': '34.2026',
    }

    const report = processZsd35Rows([row])
    expect(report.validOrders[0].delivery_week).toBe('34.2026')
  })

  // Teste 6: Parsing de Hora do Pedido
  it('6. Deve interpretar horas no formato HH:mm:ss ou fração de dia do Excel', () => {
    expect(parseTimeSafely('14:30:22')).toBe('14:30:22')
    expect(parseTimeSafely('09:15')).toBe('09:15:00')
    // Fração de dia: 0.5 = 12:00:00
    expect(parseTimeSafely(0.5)).toBe('12:00:00')
  })

  // Teste 7: Preservação de 3 casas decimais em quantidades
  it('7. Deve preservar até 3 casas decimais em quantidades (ex: 0,747 t ou 158.565 kg)', () => {
    expect(parseNumberSafely('0,747')).toBeCloseTo(0.747, 3)
    expect(parseNumberSafely('158.565')).toBeCloseTo(158.565, 3)
    expect(parseNumberSafely('18,450')).toBeCloseTo(18.45, 3)

    const row = {
      'Documento de vendas': '10494501',
      'Qtde Real': '0,747',
    }

    const report = processZsd35Rows([row])
    expect(report.validOrders[0].weight_ton).toBe(0.747)
  })

  // Teste 8: Preservação de Motivos de Estoque e Crédito Informativos
  it('8. Deve preservar textos informativos de Motivo Estoque e Motivo Crédito sem impor cadastros rígidos', () => {
    const rows = [
      {
        'Documento de vendas': '1001',
        'Motivo Estoque': 'ESTOQUE CIAFAL',
        'Motivo Crédito': 'CRÉDITO OK',
      },
      {
        'Documento de vendas': '1002',
        'Motivo Estoque': 'ESTOQUE INSUFICIENTE',
        'Motivo Crédito': 'DATA SEGUINTE P/ REVISÃO CRÉDITO CLIENTE FOI ULTRAPASSADA',
      },
      {
        'Documento de vendas': '1003',
        'Motivo Estoque': 'ESTOQUE SUBCONTRATADA',
        'Motivo Crédito': 'TÍTULOS EM ABERTO ATRASADOS A MAIS DE 5 DIAS',
      },
    ]

    const report = processZsd35Rows(rows)
    expect(report.validOrders[0].credit_reason).toBe('CRÉDITO OK')
    expect(report.validOrders[1].credit_reason).toBe(
      'DATA SEGUINTE P/ REVISÃO CRÉDITO CLIENTE FOI ULTRAPASSADA',
    )
    expect(report.validOrders[2].credit_reason).toBe(
      'TÍTULOS EM ABERTO ATRASADOS A MAIS DE 5 DIAS',
    )
    expect(report.validOrders[1].credit_status).toBe('Em Análise')
    expect(report.validOrders[2].credit_status).toBe('Bloqueado')
  })

  // Teste 9: Reconhecimento de Regiões sem limitar a lista (AL, AM, BA, CE, DF, ES, GO, MG, MS, MT, PA, PR, RJ, RN, RO, etc.)
  it('9. Deve suportar qualquer UF/Região brasileira informada na planilha', () => {
    const ufs = ['AL', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MG', 'MS', 'MT', 'PA', 'PR', 'RJ', 'RN', 'RO', 'SP']
    const rows = ufs.map((uf, idx) => ({
      'Documento de vendas': `100${idx}`,
      Região: uf,
    }))

    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(ufs.length)
    ufs.forEach((uf, idx) => {
      expect(report.validOrders[idx].uf).toBe(uf)
    })
  })

  // Teste 10: Sanitização contra Formula Injection
  it('10. Deve sanitizar valores iniciados com =, +, -, @ para proteção DDE', () => {
    expect(sanitizeCellValue('=cmd|"/C calc"!A0')).toBe('\'=cmd|"/C calc"!A0')
    expect(sanitizeCellValue('+2+5')).toBe('\'+2+5')
    expect(sanitizeCellValue('@SUM(A1:A10)')).toBe('\'@SUM(A1:A10)')
    expect(sanitizeCellValue('Texto Seguro')).toBe('Texto Seguro')
    expect(sanitizeCellValue(12345)).toBe(12345)
  })

  // Teste 11: Reconhecimento do Layout ZSD35A V3 (validador de layout)
  it('11. Deve reconhecer o Layout ZSD35A V3 e não exigir campos antigos', () => {
    const sampleRow = {
      'Q.Dias': 4,
      Gerar: 'não',
      Inco: 'CIF',
      'Documento de vendas': '10494472',
      Região: 'SP',
      Cidade: 'Campinas',
      'Qtde Real': 28.0,
      'Texto breve de material': 'PERFIL W',
      'Recebedor Merc': 'CLIENTE TESTE',
      'Valor do Frete': 3450.0,
    }

    const check = validateZsd35Layout(sampleRow)
    expect(check.isRecognized).toBe(true)
    expect(check.message).toContain('Layout ZSD35A V3 reconhecido')
  })

  // Teste 12: Geração do Template Oficial ZSD35A V3 XLSX
  it('12. Deve gerar o template oficial ZSD35A V3 com 27 colunas exatas e apenas 1 aba operacional', () => {
    const wb = generateZsd35aV3TemplateWorkbook(false)
    expect(wb.SheetNames.length).toBe(1)
    expect(wb.SheetNames[0]).toBe('ZSD35_CARGA_TMS')

    const ws = wb.Sheets['ZSD35_CARGA_TMS']
    expect(ws).toBeDefined()
    expect(ws['!cols']?.length).toBe(27)
  })

  // Teste 13: Descarte de linhas de cabeçalho repetido e subtotais
  it('13. Deve descartar subtotais, linhas agregadas e cabeçalhos duplicados', () => {
    const rows = [
      { 'Documento de vendas': 'Documento de vendas' }, // Cabeçalho repetido
      { 'Documento de vendas': 'TOTAL GERAL' },          // Subtotal
      { 'Documento de vendas': '10494472', 'Qtde Real': 10 }, // Válido
    ]

    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(1)
    expect(report.ignoredRowsCount).toBe(2)
  })

  // Teste 14: CSV Parser com delimitador ponto e vírgula e 27 campos
  it('14. Deve fazer parse de CSV com delimitador ; respeitando as 27 colunas', () => {
    const csv = `Q.Dias;Gerar;Inco;Documento de vendas;Região;Cidade;Qtde Real;Qtde.Amar.;Est. Sider;Texto breve de material;Valor do Frete;Recebedor Merc;Limite de Crédito;Emissor da ordem;Compromisso especial;Condição de Pagament;Motivo Estoque;Qtde.Estoque;Saldo;Data do Pedido;Hora do Pedido;Quantidade da ordem;Data Remessa(Semana);Itinerário;Motivo Crédito;Total a Receber;Estoque Total
4;não;CIF;10494472;SP;Campinas;28.0;14;0;PERFIL W;3450;AÇOS BRASIL;500000;CLI-20041;0;30 DDL;ESTOQUE CIAFAL;32;28;2026-03-20;09:15:00;28;34.2026;SP001A;CRÉDITO OK;148500;32`

    const rows = parseZsd35CsvText(csv)
    expect(rows.length).toBe(1)

    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(1)
    expect(report.validOrders[0].order_number).toBe('10494472')
    expect(report.validOrders[0].delivery_week).toBe('34.2026')
  })

  // Teste 15: Tag obrigatória origem_dado = 'EXCEL_QAS_ZSD35_V3'
  it('15. Deve marcar obrigatoriamente todos os registros com origem_dado = EXCEL_QAS_ZSD35_V3', () => {
    const rows = [{ 'Documento de vendas': '10494472' }]
    const report = processZsd35Rows(rows)
    expect(report.origem_dado).toBe('EXCEL_QAS_ZSD35_V3')
    expect(report.validOrders[0].origem_dado).toBe('EXCEL_QAS_ZSD35_V3')
  })

  // Teste 16: Parser tolerante a espaços antes/depois (trim) e caixa alta/baixa
  it('16. Deve aplicar trim e tolerar variações de case e acentuação nos cabeçalhos', () => {
    const row = {
      '  documento de vendas  ': '10494488',
      ' regiao ': 'MG',
      'cidade': 'Belo Horizonte',
      'qtde real': '25,50',
      'texto breve de material': 'TUBO RETANGULAR',
      'itinerario': 'MG001A',
    }

    const report = processZsd35Rows([row])
    expect(report.validOrders.length).toBe(1)
    expect(report.validOrders[0].order_number).toBe('10494488')
    expect(report.validOrders[0].uf).toBe('MG')
    expect(report.validOrders[0].destination_city).toBe('Belo Horizonte')
    expect(report.validOrders[0].weight_ton).toBe(25.5)
  })

  // Teste 17: Preservação de Itinerário SAP
  it('17. Deve preservar o código de Itinerário informado no arquivo (ex: SP001A, MG002A)', () => {
    const row = {
      'Documento de vendas': '10494490',
      Itinerário: 'MG002A',
    }

    const report = processZsd35Rows([row])
    expect(report.validOrders[0].itinerary_code).toBe('MG002A')
  })

  // Teste 18: Rejeição impeditiva apenas para Documento de vendas ausente
  it('18. Deve rejeitar apenas linhas com documento de vendas vazio ou menor que 3 caracteres', () => {
    const rows = [
      { 'Documento de vendas': '' },
      { 'Documento de vendas': '1' },
      { 'Documento de vendas': '10494472' },
    ]

    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(1)
    expect(report.rejectedRowsCount).toBe(2)
  })

  // Teste 19: Rastreamento do Lote e Usuário
  it('19. Deve registrar identificador de lote e arquivo fonte em cada registro validado', () => {
    const rows = [{ 'Documento de vendas': '10494472' }]
    const report = processZsd35Rows(rows, undefined, {
      batchId: 'LOTE-ZSD35-V3-001',
      fileName: 'ZSD35 Carga TMS v3.xlsx',
      userName: 'Operador Logístico',
    })

    expect(report.batchId).toBe('LOTE-ZSD35-V3-001')
    expect(report.fileName).toBe('ZSD35 Carga TMS v3.xlsx')
    expect(report.validOrders[0].import_batch_id).toBe('LOTE-ZSD35-V3-001')
    expect(report.validOrders[0].source_file).toBe('ZSD35 Carga TMS v3.xlsx')
  })

  // Teste 20: Cálculo automático de dias em carteira
  it('20. Deve calcular dias em carteira automaticamente a partir da Data do Pedido', () => {
    const today = new Date()
    const tenDaysAgo = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)
    const dateStr = tenDaysAgo.toISOString().split('T')[0]

    const days = calculateWalletDays(dateStr)
    expect(days).toBe(10)
  })
})
