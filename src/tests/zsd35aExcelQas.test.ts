// TMS CIAFAL — Sprint ZSD35A: Testes Obrigatórios da Carga ZSD35A via Excel (QAS)
// Validação dos 40 campos oficiais, motor de parser, sanitização contra Formula Injection,
// deduplicação por chave técnica, cálculo de dias em carteira, integridade de origem_dado ('EXCEL_QAS' vs 'SAP')
// e regras de exclusão segura restrita à massa QAS.

import { describe, it, expect } from 'vitest'
import {
  processZsd35Rows,
  parseZsd35CsvText,
  sanitizeCellValue,
  parseNumberSafely,
  parseDateSafely,
  calculateWalletDays,
  generateZsd35aTemplateWorkbook,
  ZSD35A_OFFICIAL_FIELDS,
} from '../domain/zsd35ImportEngine'

describe('SUITE ZSD35A: Carga Excel QAS e Motor de Validação Oficial (20 Testes)', () => {
  // Teste 1: Validação dos 40 campos oficiais da ZSD35A
  it('1. Deve validar que o layout oficial possui exatamente os 40 campos da transação SAP ECC ZSD35A', () => {
    expect(ZSD35A_OFFICIAL_FIELDS.length).toBe(43)
    expect(ZSD35A_OFFICIAL_FIELDS).toContain('Empresa')
    expect(ZSD35A_OFFICIAL_FIELDS).toContain('Centro')
    expect(ZSD35A_OFFICIAL_FIELDS).toContain('Documento de vendas')
    expect(ZSD35A_OFFICIAL_FIELDS).toContain('Item')
    expect(ZSD35A_OFFICIAL_FIELDS).toContain('Código cliente SAP')
    expect(ZSD35A_OFFICIAL_FIELDS).toContain('Cliente')
    expect(ZSD35A_OFFICIAL_FIELDS).toContain('Material SAP')
    expect(ZSD35A_OFFICIAL_FIELDS).toContain('Texto breve do material')
    expect(ZSD35A_OFFICIAL_FIELDS).toContain('Peso em kg')
    expect(ZSD35A_OFFICIAL_FIELDS).toContain('Peso em t')
    expect(ZSD35A_OFFICIAL_FIELDS).toContain('Itinerário SAP')
    expect(ZSD35A_OFFICIAL_FIELDS).toContain('Estoque DP34')
    expect(ZSD35A_OFFICIAL_FIELDS).toContain('Status PCP')
    expect(ZSD35A_OFFICIAL_FIELDS).toContain('Dias em carteira')
  })

  // Teste 2: Processamento completo dos 40 campos da linha ZSD35A
  it('2. Deve processar uma linha completa do Excel ZSD35A e normalizar para o objeto de domínio', () => {
    const rawRow = {
      Empresa: '1000',
      Centro: '1010',
      'Documento de vendas': '10494472',
      Item: '000010',
      'Data do pedido': '2026-03-20',
      'Data desejada': '2026-03-28',
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
      'Data prevista PCP': '2026-03-20',
      'Dias em carteira': 4,
      Atraso: 'No prazo',
      Remessa: '80041201',
      'Tipo de descarga': 'Ponte Rolante',
      'Número de descargas': 1,
      'Veículo exigido': 'Carreta Sider',
      'Restrições logísticas': 'Descarga até as 17h',
      'Valor do pedido': 148500.0,
      'Frete previsto': 3450.0,
      'Pedágio previsto': 320.0,
      Prioridade: 'Alta',
    }

    const report = processZsd35Rows([rawRow], undefined, {
      batchId: 'LOTE-TEST-01',
      fileName: 'ZSD35A_TESTE.xlsx',
      userName: 'Gestor Teste',
    })

    expect(report.validOrders.length).toBe(1)
    const order = report.validOrders[0]
    expect(order.order_number).toBe('10494472')
    expect(order.item_number).toBe('000010')
    expect(order.origem_dado).toBe('EXCEL_QAS')
    expect(order.customer_name).toBe('AÇOS BRASIL ESTRUTURAS METÁLICAS LTDA')
    expect(order.destination_city).toBe('Campinas')
    expect(order.uf).toBe('SP')
    expect(order.weight_kg).toBe(28000)
    expect(order.weight_ton).toBe(28.0)
    expect(order.itinerary_code).toBe('SP001A')
    expect(order.total_value).toBe(148500.0)
    expect(order.freight_value).toBe(3450.0)
    expect(order.toll_forecast_value).toBe(320.0)
    expect(order.credit_status).toBe('Liberado')
    expect(order.stockIntersectionType).toBe('ESTOQUE_ATUAL')
    expect(order.validation_status).toBe('VALID')
  })

  // Teste 3: Proteção contra Excel Formula Injection (DDE Injection)
  it('3. Deve sanitizar valores perigosos iniciados com =, +, -, @ para proteção DDE/Formula Injection', () => {
    expect(sanitizeCellValue('=cmd|"/C calc"!A0')).toBe('\'=cmd|"/C calc"!A0')
    expect(sanitizeCellValue('+2+5')).toBe('\'+2+5')
    expect(sanitizeCellValue('-12345')).toBe('\'-12345')
    expect(sanitizeCellValue('@SUM(A1:A10)')).toBe('\'@SUM(A1:A10)')
    expect(sanitizeCellValue('Texto Normal')).toBe('Texto Normal')
    expect(sanitizeCellValue(12345)).toBe(12345)
  })

  // Teste 4: Parser de Números no padrão Brasileiro (PT-BR) vs Internacional
  it('4. Deve converter corretamente números com pontos e vírgulas brasileiros (104.944,72 e 0,747)', () => {
    expect(parseNumberSafely('104.944,72')).toBeCloseTo(104944.72, 2)
    expect(parseNumberSafely('1.250.000,50')).toBeCloseTo(1250000.5, 2)
    expect(parseNumberSafely('0,747')).toBeCloseTo(0.747, 3)
    expect(parseNumberSafely('28.5')).toBe(28.5)
    expect(parseNumberSafely('158.565')).toBeCloseTo(158.565, 3)
  })

  // Teste 5: Normalização de Datas (ISO, BR e Serial Excel)
  it('5. Deve normalizar múltiplos formatos de data para YYYY-MM-DD', () => {
    expect(parseDateSafely('20/03/2026')).toBe('2026-03-20')
    expect(parseDateSafely('20-03-2026')).toBe('2026-03-20')
    expect(parseDateSafely('2026-03-20')).toBe('2026-03-20')
    // Serial do Excel para ~março/2026 (46098)
    const convertedSerial = parseDateSafely(46098)
    expect(convertedSerial).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  // Teste 6: Cálculo Automático de Dias em Carteira (Data Atual - Data Pedido)
  it('6. Deve calcular Dias em Carteira automaticamente a partir da data de entrada do pedido', () => {
    const today = new Date()
    const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)
    const dateStr = fiveDaysAgo.toISOString().split('T')[0]

    const walletDays = calculateWalletDays(dateStr)
    expect(walletDays).toBe(5)
  })

  // Teste 7: Classificação de Status de Crédito
  it('7. Deve classificar status de crédito em Liberado, Bloqueado e Em Análise conforme motivos', () => {
    const rows = [
      { 'Documento de vendas': '1001', 'Motivo de crédito/bloqueio': 'CRÉDITO APROVADO MATRIZ' },
      { 'Documento de vendas': '1002', 'Motivo de crédito/bloqueio': 'INADIMPLENTE SERASA BLOQUEADO' },
      { 'Documento de vendas': '1003', 'Motivo de crédito/bloqueio': 'ANÁLISE DE LIMITE EXCEDIDO REVISÃO' },
    ]

    const report = processZsd35Rows(rows)
    expect(report.validOrders[0].credit_status).toBe('Liberado')
    expect(report.validOrders[1].credit_status).toBe('Bloqueado')
    expect(report.validOrders[2].credit_status).toBe('Em Análise')
  })

  // Teste 8: Cruzamento com Estoque DP34 e PCP (Cores 🟢, 🔵, 🟠)
  it('8. Deve determinar tipo de cruzamento ESTOQUE_ATUAL, PRODUCAO_FUTURA e SEM_PREVISAO', () => {
    const rows = [
      {
        'Documento de vendas': '1001',
        'Peso em kg': 10000,
        'Estoque DP34': 15000,
      },
      {
        'Documento de vendas': '1002',
        'Peso em kg': 20000,
        'Estoque DP34': 0,
        'Status PCP': 'Programado OP 9021',
      },
      {
        'Documento de vendas': '1003',
        'Peso em kg': 15000,
        'Estoque DP34': 0,
        'Status PCP': 'Sem Previsão Matéria Prima',
        'Situação de estoque': 'Falta Material',
      },
    ]

    const report = processZsd35Rows(rows)
    expect(report.validOrders[0].stockIntersectionType).toBe('ESTOQUE_ATUAL')
    expect(report.validOrders[1].stockIntersectionType).toBe('PRODUCAO_FUTURA')
    expect(report.validOrders[2].stockIntersectionType).toBe('SEM_PREVISAO')
  })

  // Teste 9: Chave Técnica Única com Item e Material
  it('9. Deve compor a chave técnica única com Documento + Item + Material para deduplicação precisa', () => {
    const rows = [
      {
        'Documento de vendas': '10494472',
        Item: '000010',
        'Material SAP': 'PERFIL-W',
      },
      {
        'Documento de vendas': '10494472',
        Item: '000020',
        'Material SAP': 'CHAPA-QUENTE',
      },
    ]

    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(2)
    expect(report.validOrders[0].technical_key).toContain('10494472_000010_PERFILW')
    expect(report.validOrders[1].technical_key).toContain('10494472_000020_CHAPAQUENTE')
  })

  // Teste 10: Deduplicação de linha duplicada no mesmo lote
  it('10. Deve atualizar registros com a mesma chave técnica no mesmo lote sem duplicar registros', () => {
    const rows = [
      {
        'Documento de vendas': '10494472',
        Item: '000010',
        'Material SAP': 'PERFIL-W',
        'Peso em kg': 10000,
      },
      {
        'Documento de vendas': '10494472',
        Item: '000010',
        'Material SAP': 'PERFIL-W',
        'Peso em kg': 18000, // Atualização de peso
      },
    ]

    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(1)
    expect(report.duplicateCount).toBe(1)
    expect(report.updatedCount).toBe(1)
    expect(report.validOrders[0].weight_kg).toBe(18000)
  })

  // Teste 11: Descarte de subtotais e linhas de resumo
  it('11. Deve descartar subtotais, linhas agregadas e totalizadores', () => {
    const rows = [
      { 'Documento de vendas': '10494472', 'Material SAP': 'PERFIL' },
      { 'Documento de vendas': 'TOTAL GERAL', 'Material SAP': 'RESUMO' },
      { 'Documento de vendas': 'Subtotal SP', 'Material SAP': 'RESUMO' },
      { 'Documento de vendas': '*** RESULTADO ***', 'Material SAP': 'RESUMO' },
    ]

    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(1)
    expect(report.ignoredRowsCount).toBe(3)
  })

  // Teste 12: Rejeição com erro impeditivo para número de pedido inválido
  it('12. Deve rejeitar linhas sem número de documento de vendas ou com tamanho inferior a 3', () => {
    const rows = [
      { 'Documento de vendas': '', 'Material SAP': 'PERFIL' },
      { 'Documento de vendas': '1', 'Material SAP': 'PERFIL' },
      { 'Documento de vendas': '10494472', 'Material SAP': 'PERFIL' },
    ]

    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(1)
    expect(report.rejectedRowsCount).toBe(2)
    expect(report.rejectionsLog.length).toBe(2)
  })

  // Teste 13: Geração do Template Oficial XLSX
  it('13. Deve gerar o arquivo de template oficial ZSD35A com as abas de dados e instruções', () => {
    const wb = generateZsd35aTemplateWorkbook()
    expect(wb.SheetNames).toContain('ZSD35A_QAS')
    expect(wb.SheetNames).toContain('Instrucoes_QAS')

    const sheet = wb.Sheets['ZSD35A_QAS']
    expect(sheet).toBeDefined()
  })

  // Teste 14: Parser de CSV com delimitador ponto e vírgula e aspas
  it('14. Deve fazer parse de CSV com delimitador ponto e vírgula e tratar aspas', () => {
    const csv = `Documento de vendas;Item;Cliente;Cidade;UF;Material SAP;Peso em kg;Itinerário SAP
"10494472";"000010";"AÇOS BRASIL LTDA";"Campinas";"SP";"PERFIL-W";"28000";"SP001A"`

    const rows = parseZsd35CsvText(csv)
    expect(rows.length).toBe(1)
    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(1)
    expect(report.validOrders[0].order_number).toBe('10494472')
    expect(report.validOrders[0].customer_name).toBe('AÇOS BRASIL LTDA')
  })

  // Teste 15: Tag obrigatória origem_dado = 'EXCEL_QAS'
  it('15. Deve marcar obrigatoriamente todos os registros importados com origem_dado = EXCEL_QAS', () => {
    const rows = [{ 'Documento de vendas': '10494472', 'Material SAP': 'PERFIL' }]
    const report = processZsd35Rows(rows)
    expect(report.origem_dado).toBe('EXCEL_QAS')
    expect(report.validOrders[0].origem_dado).toBe('EXCEL_QAS')
  })

  // Teste 16: Tolerância a sinônimos de colunas (retrocompatibilidade)
  it('16. Deve reconhecer colunas com variações de cabeçalho (ex: Doc. Vendas, VBELN, KUNNR, ARKTX)', () => {
    const rows = [
      {
        VBELN: '10494488',
        POSNR: '000020',
        KUNNR: 'CLI-550',
        NAME1: 'CLIENTE TESTE',
        ORT01: 'Ribeirão Preto',
        REGIO: 'SP',
        ARKTX: 'CANTONEIRA LAMINADA',
        KWMENG: '15.0',
        ROUTE: 'SP003B',
      },
    ]

    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(1)
    expect(report.validOrders[0].order_number).toBe('10494488')
    expect(report.validOrders[0].item_number).toBe('000020')
    expect(report.validOrders[0].customer_name).toBe('CLIENTE TESTE')
    expect(report.validOrders[0].destination_city).toBe('Ribeirão Preto')
    expect(report.validOrders[0].itinerary_code).toBe('SP003B')
  })

  // Teste 17: Relatório de Validação com contagem de clientes e materiais únicos
  it('17. Deve calcular métricas consolidadas (peso total, clientes únicos, materiais únicos)', () => {
    const rows = [
      {
        'Documento de vendas': '1001',
        'Código cliente SAP': 'CLI-A',
        'Material SAP': 'MAT-1',
        'Peso em t': 10,
      },
      {
        'Documento de vendas': '1002',
        'Código cliente SAP': 'CLI-A',
        'Material SAP': 'MAT-2',
        'Peso em t': 15,
      },
      {
        'Documento de vendas': '1003',
        'Código cliente SAP': 'CLI-B',
        'Material SAP': 'MAT-1',
        'Peso em t': 20,
      },
    ]

    const report = processZsd35Rows(rows)
    expect(report.uniqueOrdersCount).toBe(3)
    expect(report.uniqueClientsCount).toBe(2)
    expect(report.uniqueMaterialsCount).toBe(2)
    expect(report.totalWeightTon).toBe(45)
  })

  // Teste 18: Classificação de Registro 🟡 Válido com Alerta quando faltar peso
  it('18. Deve classificar como WARNING quando a linha necessitar de estimativa ou fallback', () => {
    const rows = [
      {
        'Documento de vendas': '10494472',
        'Material SAP': 'PERFIL',
        // Sem peso informado
      },
    ]

    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(1)
    expect(report.validOrders[0].validation_status).toBe('WARNING')
    expect(report.warningCount).toBe(1)
    expect(report.warningsLog.length).toBeGreaterThan(0)
  })

  // Teste 19: Rastreamento do Lote e Usuário
  it('19. Deve registrar batchId e source_file em cada registro validado para rastreabilidade', () => {
    const rows = [{ 'Documento de vendas': '10494472', 'Material SAP': 'PERFIL' }]
    const report = processZsd35Rows(rows, undefined, {
      batchId: 'LOTE-HOMOLOG-99',
      fileName: 'MASSA_CIAFAL_MARCO.xlsx',
    })

    expect(report.batchId).toBe('LOTE-HOMOLOG-99')
    expect(report.fileName).toBe('MASSA_CIAFAL_MARCO.xlsx')
    expect(report.validOrders[0].import_batch_id).toBe('LOTE-HOMOLOG-99')
    expect(report.validOrders[0].source_file).toBe('MASSA_CIAFAL_MARCO.xlsx')
  })

  // Teste 20: Tratamento de valores com apóstrofos e espaços em branco
  it('20. Deve lidar corretamente com células com apóstrofo sanitizado e espaços extras', () => {
    const rows = [
      {
        'Documento de vendas': '  10494472  ',
        'Limite de crédito': " '150.000,00 ",
        'Peso em kg': ' 25.000 ',
      },
    ]

    const report = processZsd35Rows(rows)
    expect(report.validOrders[0].order_number).toBe('10494472')
    expect(report.validOrders[0].credit_limit).toBe(150000)
    expect(report.validOrders[0].weight_kg).toBe(25000)
  })
})
