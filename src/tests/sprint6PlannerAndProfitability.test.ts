import { describe, it, expect } from 'vitest'
import {
  calculatePlannedFreightResult,
  calculateRealizedFreightResult,
  aggregateProfitability,
  DEFAULT_COMMERCIAL_TABLE,
} from '../domain/profitabilityEngine'
import {
  generateWmsLoadingMap,
} from '../domain/wmsEngine'
import {
  processZsd35Rows,
  parseZsd35CsvText,
} from '../domain/zsd35ImportEngine'
import {
  calculateMilestoneIntervals,
  aggregateExpeditionPerformance,
  generateExpeditionAiImprovementProposals,
} from '../domain/expeditionEngine'
import {
  runCiafalOptimizer,
} from '../domain/optimizerEngine'
import { SapSalesOrderEntity, SapStockCurrentEntity, QueueEntryEntity, PcpProductionOrderEntity } from '../domain/rules'

describe('SPRINT 6 SUITE: Previsto x Realizado & Rentabilidade Logística', () => {
  it('1. Deve calcular o resultado previsto positivo com base na tabela comercial SP', () => {
    const planned = calculatePlannedFreightResult({
      itineraryCode: 'MG001A',
      weightKg: 30000,
      distanceKm: 500,
      vehicleType: 'Carreta LS 32t',
      axlesCount: 5,
    })

    expect(planned.receitaFretePrevista).toBe(6315) // 30t * 210.50
    expect(planned.fretePrevistoMotorista).toBeGreaterThan(0)
    expect(planned.pedagioPrevisto).toBeGreaterThan(0)
    expect(planned.resultadoPrevisto).toBe(
      Math.round((planned.receitaFretePrevista - (planned.fretePrevistoMotorista + planned.pedagioPrevisto + planned.outrosCustosPrevistos)) * 100) / 100
    )
    expect(planned.margemPrevistaPct).toBeGreaterThan(0)
  })

  it('2. Deve calcular o resultado realizado e apurar desvios favoráveis quando o frete real for menor que o previsto', () => {
    const realized = calculateRealizedFreightResult({
      receitaFreteReal: 6500,
      fretePagoMotorista: 4500,
      pedagioReal: 400,
      outrosCustosReais: 100,
      resultadoPrevistoRef: 1200,
      fretePrevistoMotoristaRef: 4800,
    })

    expect(realized.custoTotalReal).toBe(5000)
    expect(realized.resultadoRealizado).toBe(1500)
    expect(realized.margemRealizadaPct).toBeCloseTo(23.08, 1)
    expect(realized.desvioResultado).toBe(300)
    expect(realized.desvioFreteMotorista).toBe(-300)
    expect(realized.isDesvioFavoravel).toBe(true)
    expect(realized.isLucrativo).toBe(true)
  })

  it('3. Deve apurar desvio desfavorável quando o frete pago ao motorista superar a estimativa', () => {
    const realized = calculateRealizedFreightResult({
      receitaFreteReal: 5000,
      fretePagoMotorista: 5200,
      pedagioReal: 300,
      outrosCustosReais: 50,
      resultadoPrevistoRef: 500,
      fretePrevistoMotoristaRef: 4200,
    })

    expect(realized.resultadoRealizado).toBe(-550)
    expect(realized.isDesvioFavoravel).toBe(false)
    expect(realized.isLucrativo).toBe(false)
    expect(realized.desvioFreteMotorista).toBe(1000)
  })

  it('4. Deve agregar rentabilidade com cálculo de erro médio e acurácia de previsão', () => {
    const sampleRecords = [
      {
        cargo_id: 'C1',
        total_weight_kg: 30000,
        receita_frete_real: 6000,
        frete_pago_motorista: 4500,
        frete_previsto_motorista: 4500,
        pedagio_real: 300,
        resultado_previsto: 1200,
        resultado_realizado: 1200,
      },
      {
        cargo_id: 'C2',
        total_weight_kg: 25000,
        receita_frete_real: 5000,
        frete_pago_motorista: 4800,
        frete_previsto_motorista: 4000,
        pedagio_real: 400,
        resultado_previsto: 600,
        resultado_realizado: -200,
      },
    ]

    const agg = aggregateProfitability(sampleRecords)
    expect(agg.totalCargas).toBe(2)
    expect(agg.totalPesoTons).toBe(55)
    expect(agg.totalResultadoRealizado).toBe(1000)
    expect(agg.cargasComPrejuizoCount).toBe(1)
    expect(agg.erroMedioReais).toBe(400) // (0 + 800) / 2
  })
})

describe('SPRINT 6 SUITE: WMS & Mapa de Carregamento', () => {
  const sampleOrders = [
    {
      id: 'O1',
      order_number: 'P01',
      customer_code: 'C1',
      customer_name: 'Cliente Próximo (São Paulo)',
      destination_city: 'São Paulo',
      uf: 'SP',
      weight_kg: 10000,
      distance_km: 50,
      plant: 'SDPL',
      storage_location: 'DP34',
    },
    {
      id: 'O2',
      order_number: 'P02',
      customer_code: 'C2',
      customer_name: 'Cliente Distante Sidercentro',
      destination_city: 'Belo Horizonte',
      uf: 'MG',
      weight_kg: 12000,
      distance_km: 580,
      plant: 'SDPL',
      storage_location: 'DS11', // SIDERCENTRO
      material_description: 'Chapa Sidercentro DS11',
    },
    {
      id: 'O3',
      order_number: 'P03',
      customer_code: 'C3',
      customer_name: 'Cliente Intermediário L2 Pesado',
      destination_city: 'Campinas',
      uf: 'SP',
      weight_kg: 8000,
      distance_km: 100,
      plant: 'SDPL',
      storage_location: 'DP34',
      is_perfil_pesado_l2: true,
      material: 'L2-PERFIL-W310',
    },
  ]

  it('5. Deve ordenar o carregamento colocando Sidercentro (DS11) e Perfil Pesado L2 primeiro', () => {
    const map = generateWmsLoadingMap({
      cargoId: 'CARGA-TESTE-01',
      vehiclePlate: 'ABC-1234',
      vehicleType: 'Carreta Aberta',
      itineraryCode: 'MG001A',
      capacityKg: 32000,
      orders: sampleOrders,
      wmsConfigured: false,
    })

    expect(map.items.length).toBe(3)
    // Sidercentro deve ser o 1º a carregar
    expect(map.items[0].isSidercentro).toBe(true)
    expect(map.items[0].specialHandlingFlag).toBe('PRIORIDADE_CARREGAMENTO_SIDERCENTRO')
    expect(map.items[0].loadingSequenceOrder).toBe(1)

    // Perfil Pesado L2 deve ser o 2º
    expect(map.items[1].isPerfilPesadoL2).toBe(true)
    expect(map.items[1].specialHandlingFlag).toBe('PRIORIDADE_CARREGAMENTO_PERFIL_PESADO_L2')

    // Integração WMS deve estar explicitamente marcada como AGUARDANDO_CONFIGURACAO
    expect(map.wmsIntegrationStatus).toBe('AGUARDANDO_CONFIGURACAO')
  })

  it('6. Deve detectar conflito de carregamento quando item prioritário no fundo for a 1ª parada em veículo baú', () => {
    const ordersConflict = [
      {
        id: 'O1',
        order_number: 'P01',
        customer_code: 'C1',
        customer_name: 'Cliente Muito Próximo (1ª Descarga)',
        destination_city: 'Osasco',
        uf: 'SP',
        weight_kg: 15000,
        distance_km: 20,
        plant: 'SDPL',
        storage_location: 'DS11', // Sidercentro precisa do fundo, mas é 1ª parada
        material_description: 'Sidercentro',
      },
      {
        id: 'O2',
        order_number: 'P02',
        customer_code: 'C2',
        customer_name: 'Cliente Distante',
        destination_city: 'Ribeirão Preto',
        uf: 'SP',
        weight_kg: 10000,
        distance_km: 320,
        plant: 'SDPL',
        storage_location: 'DP34',
      },
    ]

    const map = generateWmsLoadingMap({
      cargoId: 'CARGA-CONFLITO-01',
      vehiclePlate: 'BAU-9988',
      vehicleType: 'Carreta Baú Fechado',
      itineraryCode: 'SP002B',
      capacityKg: 30000,
      orders: ordersConflict,
      wmsConfigured: true,
    })

    expect(map.hasConflicts).toBe(true)
    expect(map.conflictNotes.length).toBeGreaterThan(0)
    expect(map.conflictNotes[0]).toContain('CONFLITO DE CARREGAMENTO')
    expect(map.isReadyForLoading).toBe(false)
  })
})

describe('SPRINT 6 SUITE: Importação Carteira ZSD35 (.xlsx / .csv) — 20 Casos de Teste Oficiais', () => {
  // Teste 1: XLSX com cabeçalho oficial de 28 campos
  it('1. Deve importar planilha XLSX com os 28 campos oficiais da Sprint 6', () => {
    const rawRows = [
      {
        'Q.Dias': 9,
        Gerar: 'SIM',
        Status: 'Aberto',
        Inco: 'CIF',
        'Documento de vendas': '258477',
        Região: 'AL',
        Cidade: 'MACEIO',
        'Qtde Real': '2.0',
        'Qtde.Amar.': '10',
        'Est. Sider': '158.565',
        'Texto breve de material': 'B. CH. 1 X 1/8 - 6,00M - 10',
        'Valor do Frete': '531',
        'Recebedor Merc': 'METALURGICA ALAGOAS S.A.',
        'Limite de Crédito': '104944.72',
        'Emissor da ordem': 'CLI-258477',
        'Compromisso especial': 'NORMAL',
        'Condição de Pagament': '30 DIAS',
        'Motivo Estoque': 'DISPONIVEL',
        'Qtde.Estoque': '159.825',
        Saldo: '2.0',
        'Data do Pedido': '2026-08-20',
        'Hora do Pedido': '00:00:00',
        'Quantidade da ordem': '2.0',
        'Data Remessa(Semana)': '34.2026',
        Itinerário: 'AL001C',
        'Motivo Crédito': 'CRÉDITO OK/CHECAR LIMITE',
        'Total a Receber': '12500',
        'Estoque Total': '159.825',
      },
    ]

    const report = processZsd35Rows(rawRows)
    expect(report.validOrders.length).toBe(1)
    expect(report.validOrders[0].order_number).toBe('258477')
    expect(report.validOrders[0].uf).toBe('AL')
    expect(report.validOrders[0].destination_city).toBe('MACEIO')
    expect(report.validOrders[0].weight_kg).toBe(2000)
    expect(report.validOrders[0].freight_value).toBe(531)
    expect(report.validOrders[0].credit_limit).toBe(104944.72)
    expect(report.validOrders[0].itinerary_code).toBe('AL001C')
    expect(report.validOrders[0].credit_reason).toBe('CRÉDITO OK/CHECAR LIMITE')
  })

  // Teste 2: CSV delimitado por ponto e vírgula
  it('2. Deve parsear CSV delimitado por ponto e vírgula com cabeçalho padrão', () => {
    const csv = `Documento de vendas;Região;Cidade;Qtde Real;Texto breve de material;Itinerário;Motivo Crédito
258506;AL;MACEIO;2.0;B. CH. 2 X 1/8 - 6,00 M - 10;AL001C;CRÉDITO OK`
    const parsed = parseZsd35CsvText(csv)
    expect(parsed.length).toBe(1)
    const report = processZsd35Rows(parsed)
    expect(report.validOrders.length).toBe(1)
    expect(report.validOrders[0].order_number).toBe('258506')
  })

  // Teste 3: CSV delimitado por tabulação
  it('3. Deve parsear CSV delimitado por tabulação (TSV)', () => {
    const tsv = `Documento de vendas\tRegião\tCidade\tQtde Real\tTexto breve de material\tItinerário
257591\tAM\tMANAUS\t2.0\tB.RED.107,95MM-NBR1129\tAM001C`
    const parsed = parseZsd35CsvText(tsv)
    const report = processZsd35Rows(parsed)
    expect(report.validOrders.length).toBe(1)
    expect(report.validOrders[0].order_number).toBe('257591')
    expect(report.validOrders[0].uf).toBe('AM')
  })

  // Teste 4: Descarte de linhas com subtotais e totais gerais
  it('4. Deve identificar e ignorar linhas de subtotal e total geral', () => {
    const rows = [
      { 'Documento de vendas': '258520', 'Texto breve de material': 'CANT. 2 X 3/16', 'Qtde Real': 1.0 },
      { 'Documento de vendas': '*** TOTAL GERAL ***', 'Qtde Real': 100.0 },
      { 'Documento de vendas': 'Subtotal AL', 'Qtde Real': 10.0 },
      { 'Documento de vendas': 'Resultado Final', 'Qtde Real': 50.0 },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(1)
    expect(report.ignoredRowsCount).toBe(3)
  })

  // Teste 5: Descarte de cabeçalhos repetidos no meio da planilha
  it('5. Deve descartar cabeçalhos repetidos no meio do arquivo', () => {
    const rows = [
      { 'Documento de vendas': '258679', 'Texto breve de material': 'B. CH. 1 X 1/4', 'Qtde Real': 1.0 },
      { 'Documento de vendas': 'Documento de vendas', 'Texto breve de material': 'Texto breve de material' },
      { 'Documento de vendas': '258679', 'Texto breve de material': 'CANT. 1.1/4 X 1/8', 'Qtde Real': 2.0 },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(2)
    expect(report.ignoredRowsCount).toBe(1)
  })

  // Teste 6: Chave técnica única composta por Documento de Vendas + Material
  it('6. Deve gerar chave técnica única combinando ordem e material', () => {
    const rows = [
      { 'Documento de vendas': '258090', 'Texto breve de material': 'B. RED. 1/2', 'Qtde Real': 1.0 },
      { 'Documento de vendas': '258090', 'Texto breve de material': 'CANT. 1.1/2 X 1/8', 'Qtde Real': 1.0 },
      { 'Documento de vendas': '258090', 'Texto breve de material': 'CANT. 1.1/2 X 3/16', 'Qtde Real': 1.0 },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(3)
    const keys = report.validOrders.map((o) => o.technical_key)
    expect(new Set(keys).size).toBe(3)
  })

  // Teste 7: Deduplicação e atualização de registros com mesma chave técnica no lote
  it('7. Deve deduplicar e atualizar registros com mesma chave técnica dentro do mesmo lote', () => {
    const rows = [
      { 'Documento de vendas': '257690', 'Texto breve de material': 'B. QUAD. 2" - 102', 'Qtde Real': 1.0, Saldo: 1.0 },
      { 'Documento de vendas': '257690', 'Texto breve de material': 'B. QUAD. 2" - 102', 'Qtde Real': 2.5, Saldo: 2.5 },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(1)
    expect(report.updatedCount).toBe(1)
    expect(report.validOrders[0].weight_kg).toBe(2500)
  })

  // Teste 8: Formato de número com padrão brasileiro de vírgula e milhar
  it('8. Deve converter valores monetários e pesos no formato brasileiro (104.944,72)', () => {
    const rows = [
      {
        'Documento de vendas': '258477',
        'Texto breve de material': 'B. CHAPA',
        'Limite de Crédito': '104.944,72',
        'Qtde Real': '0,747',
        'Est. Sider': '158,565',
      },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders[0].credit_limit).toBeCloseTo(104944.72, 2)
    expect(report.validOrders[0].weight_kg).toBe(747)
  })

  // Teste 9: Tratamento de valores negativos (Limite de Crédito negativo)
  it('9. Deve suportar limites de crédito e saldos negativos (-5636.0)', () => {
    const rows = [
      {
        'Documento de vendas': '256473',
        'Texto breve de material': 'B. RED. 3/4',
        'Limite de Crédito': '-5636.0',
        'Valor do Frete': '500',
      },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders[0].credit_limit).toBe(-5636.0)
  })

  // Teste 10: Classificação do Status de Crédito: Liberado
  it('10. Deve classificar status de crédito como Liberado quando motivo for CRÉDITO OK', () => {
    const rows = [
      {
        'Documento de vendas': '256473',
        'Texto breve de material': 'CANT. 1 X 1/8',
        'Motivo Crédito': 'CRÉDITO OK',
      },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders[0].credit_status).toBe('Liberado')
  })

  // Teste 11: Classificação do Status de Crédito: Em Análise
  it('11. Deve classificar status como Em Análise para REVISÃO ou CHECAR LIMITE', () => {
    const rows = [
      {
        'Documento de vendas': '257690',
        'Texto breve de material': 'B. QUAD 2',
        'Motivo Crédito': 'DATA SEGUINTE P/ REVISÃO',
      },
      {
        'Documento de vendas': '258477',
        'Texto breve de material': 'B. CHAPA',
        'Motivo Crédito': 'CRÉDITO OK/CHECAR LIMITE',
      },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders[0].credit_status).toBe('Em Análise')
    expect(report.validOrders[1].credit_status).toBe('Em Análise')
  })

  // Teste 12: Classificação do Status de Crédito: Bloqueado
  it('12. Deve classificar status como Bloqueado quando cliente tiver bloqueio ou limite estourado', () => {
    const rows = [
      {
        'Documento de vendas': '259999',
        'Texto breve de material': 'VIGA W',
        'Motivo Crédito': 'BLOQUEIO FINANCEIRO SERASA',
      },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders[0].credit_status).toBe('Bloqueado')
  })

  // Teste 13: Cálculo do indicador de Tempo em Carteira (Q.Dias)
  it('13. Deve preservar e calcular corretamente o tempo em carteira (Q.Dias)', () => {
    const rows = [
      {
        'Documento de vendas': '256473',
        'Texto breve de material': 'BARRA',
        'Q.Dias': 50,
        'Data do Pedido': '2026-07-10',
      },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders[0].q_dias).toBe(50)
    expect(report.validOrders[0].walletDays).toBeDefined()
  })

  // Teste 14: Indicador de Atraso e Comparação com Data de Remessa
  it('14. Deve calcular atraso em dias quando data remessa for anterior à data corrente', () => {
    const rows = [
      {
        'Documento de vendas': '258000',
        'Texto breve de material': 'PERFIL',
        'Data Remessa(Semana)': '2020-01-01',
      },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders[0].isOverdue).toBe(true)
    expect(report.validOrders[0].overdueDays).toBeGreaterThan(100)
  })

  // Teste 15: Cruzamento Visual: Classificação ESTOQUE_ATUAL (DP34)
  it('15. Deve classificar como ESTOQUE_ATUAL quando houver saldo em estoque suficiente', () => {
    const rows = [
      {
        'Documento de vendas': '258477',
        'Texto breve de material': 'BARRA AÇO',
        'Qtde Real': '2.0',
        'Estoque Total': '159.825',
      },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders[0].stockIntersectionType).toBe('ESTOQUE_ATUAL')
  })

  // Teste 16: Cruzamento Visual: Classificação PRODUCAO_FUTURA (PCP)
  it('16. Deve classificar como PRODUCAO_FUTURA quando estoque for insuficiente e houver apontamento PCP', () => {
    const rows = [
      {
        'Documento de vendas': '259001',
        'Texto breve de material': 'CANTONEIRA ESPECIAL',
        'Qtde Real': '10.0',
        'Estoque Total': '0.0',
        'Motivo Estoque': 'Em Producao Laminador 02',
      },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders[0].stockIntersectionType).toBe('PRODUCAO_FUTURA')
  })

  // Teste 17: Cruzamento Visual: Classificação SEM_PREVISAO
  it('17. Deve classificar como SEM_PREVISAO quando estoque for zero e sem PCP', () => {
    const rows = [
      {
        'Documento de vendas': '259002',
        'Texto breve de material': 'TUBO REQ',
        'Qtde Real': '5.0',
        'Estoque Total': '0.0',
        'Motivo Estoque': 'Sem Estoque e Sem Programacao',
      },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders[0].stockIntersectionType).toBe('SEM_PREVISAO')
  })

  // Teste 18: Suporte a Mapeamento Customizado de Colunas
  it('18. Deve aplicar dicionário de mapeamento customizado de colunas', () => {
    const rows = [
      {
        OrdemVenda: '998877',
        EstadoDestino: 'CE',
        Municipio: 'JUAZEIRO DO NORTE',
        DescricaoMaterial: 'PERFIL I 150',
        PesoTotal: '1.5',
      },
    ]
    const customMap = {
      'Documento de vendas': 'OrdemVenda',
      Região: 'EstadoDestino',
      Cidade: 'Municipio',
      'Texto breve de material': 'DescricaoMaterial',
      'Qtde Real': 'PesoTotal',
    }
    const report = processZsd35Rows(rows, customMap)
    expect(report.validOrders.length).toBe(1)
    expect(report.validOrders[0].order_number).toBe('998877')
    expect(report.validOrders[0].uf).toBe('CE')
    expect(report.validOrders[0].destination_city).toBe('JUAZEIRO DO NORTE')
    expect(report.validOrders[0].material).toBe('PERFIL I 150')
  })

  // Teste 19: Rejeição de linhas inválidas sem Doc de Vendas
  it('19. Deve registrar rejeições em log para linhas sem número de documento de vendas', () => {
    const rows = [
      { 'Documento de vendas': '', 'Texto breve de material': 'TESTE' },
      { 'Documento de vendas': '12', 'Texto breve de material': 'MUITO CURTO' },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(0)
    expect(report.rejectedRowsCount).toBe(2)
    expect(report.rejectionsLog.length).toBe(2)
  })

  // Teste 20: Idempotência e Suporte a Rollback por correlação auditável
  it('20. Deve permitir rastreabilidade de correlação para auditoria e suporte a rollback', () => {
    const rows = [
      {
        'Documento de vendas': '258713',
        'Texto breve de material': 'B. RED.3/8',
        'Qtde Real': '1.0',
        Cidade: 'CACHOEIRO DE ITAPEMIRIM',
        Região: 'ES',
        Itinerário: 'ES001A',
      },
    ]
    const report = processZsd35Rows(rows)
    expect(report.validOrders.length).toBe(1)
    expect(report.validOrders[0].technical_key).toBe('258713_BRED38')
    expect(report.summaryStatus).toBe('VALIDO')
  })
})

describe('SPRINT 6 SUITE: Performance da Expedição (Marcos T0 a T10)', () => {
  it('8. Deve calcular os intervalos de marcos e identificar o gargalo principal', () => {
    const milestone = {
      cargo_id: 'C-01',
      vehicle_plate: 'ABC-1234',
      t0_entrada: '2025-05-10T08:00:00Z',
      t1_disponibilizacao: '2025-05-10T08:15:00Z',
      t2_carga_atribuida: '2025-05-10T08:30:00Z',
      t3_ordem_sap: '2025-05-10T08:45:00Z',
      t4_chamado_doca: '2025-05-10T09:30:00Z',
      t5_inicio_carregamento: '2025-05-10T10:15:00Z', // 90 min de espera T5-T3
      t6_fim_carregamento: '2025-05-10T11:00:00Z',
      t7_conferencia: '2025-05-10T11:20:00Z',
      t8_faturamento: '2025-05-10T11:45:00Z',
      t9_documento_entregue: '2025-05-10T11:55:00Z',
      t10_saida: '2025-05-10T12:00:00Z',
    }

    const intervals = calculateMilestoneIntervals(milestone)
    expect(intervals.t10_t0_lead_time_total_min).toBe(240)
    expect(intervals.t5_t3_espera_carregamento_min).toBe(90)
    expect(intervals.gargaloPrincipal).toContain('Espera para Carregamento')
    expect(intervals.gargaloDuracaoMin).toBe(90)
  })

  it('9. Deve agregar performance com cálculo de P90 e gerar propostas IA sem auto-execução', () => {
    const milestones = [
      {
        cargo_id: 'C1',
        vehicle_plate: 'P1',
        t0_entrada: '2025-05-10T08:00:00Z',
        t10_saida: '2025-05-10T11:00:00Z', // 180 min
      },
      {
        cargo_id: 'C2',
        vehicle_plate: 'P2',
        t0_entrada: '2025-05-10T08:00:00Z',
        t10_saida: '2025-05-10T13:00:00Z', // 300 min
      },
    ]

    const summary = aggregateExpeditionPerformance(milestones, 240)
    expect(summary.totalExpedicoes).toBe(2)
    expect(summary.leadTimeMedioMin).toBe(240)
    expect(summary.pctDentroMeta).toBe(50)

    const proposals = generateExpeditionAiImprovementProposals(summary)
    expect(proposals.length).toBeGreaterThan(0)
    expect(proposals[0].hipotese).toContain('Hipótese analítica')
    expect(proposals[0].prioridade).toBeDefined()
  })
})

describe('SPRINT 6 SUITE: Otimizador & Cenários do Planejador IA', () => {
  it('10. Deve gerar os 6 cenários exigidos da Sprint 6 (A até F)', () => {
    const orders: SapSalesOrderEntity[] = [
      {
        id: 'ord-1',
        order_number: 'PED-001',
        customer_code: 'CLI-01',
        customer_name: 'CLIENTE A',
        destination_city: 'Contagem',
        uf: 'MG',
        itinerary_code: 'MG001A',
        material: 'PERFIL',
        weight_kg: 12000,
        total_value: 50000,
        credit_status: 'Liberado',
        production_status: 'Pronto',
        discharge_type: 'Ponte Rolante',
        desired_date: '2025-05-01', // Atrasado
      },
      {
        id: 'ord-2',
        order_number: 'PED-002',
        customer_code: 'CLI-02',
        customer_name: 'CLIENTE B',
        destination_city: 'Betim',
        uf: 'MG',
        itinerary_code: 'MG001A',
        material: 'CHAPA',
        weight_kg: 18000,
        total_value: 80000,
        credit_status: 'Liberado',
        production_status: 'Pronto',
        discharge_type: 'Ponte Rolante',
        desired_date: '2025-05-10',
      },
    ]

    const stock: SapStockCurrentEntity[] = [
      {
        id: 'stk-1',
        material_code: 'PERFIL',
        material_description: 'PERFIL ESTRUTURAL',
        plant: 'SDPL',
        storage_location: 'DP34',
        quantity: 20000,
        unit: 'KG',
        weight_kg: 20000,
        available_qty: 20000,
      },
      {
        id: 'stk-2',
        material_code: 'CHAPA',
        material_description: 'CHAPA AÇO',
        plant: 'SDPL',
        storage_location: 'DP34',
        quantity: 25000,
        unit: 'KG',
        weight_kg: 25000,
        available_qty: 25000,
      },
    ]

    const queue: QueueEntryEntity[] = [
      {
        id: 'q-1',
        driver: 'drv-01',
        driver_name_cached: 'Motorista Porta',
        vehicle_plate_cached: 'ABC-1234',
        vehicle_type_cached: 'Carreta LS',
        vehicle_capacity_kg_cached: 32000,
        type: 'PORTA',
        status: 'disponivel',
        entry_time: '2025-05-10T07:30:00Z',
        preferred_itinerary: 'MG001A',
      },
    ]

    const res = runCiafalOptimizer({
      itineraryCode: 'MG001A',
      plannedDate: '2025-05-10',
      vehicleCapacityKg: 32000,
      vehicleType: 'Carreta LS 32t',
      orders,
      stocks: stock,
      pcpOrders: [],
      queueEntries: queue,
    })

    expect(res.scenarios.length).toBe(6)
    const types = res.scenarios.map((s) => s.scenarioType)
    expect(types).toContain('scenario_a_immediate')
    expect(types).toContain('scenario_b_max_occupancy')
    expect(types).toContain('scenario_c_overdue')
    expect(types).toContain('scenario_d_best_profit')
    expect(types).toContain('scenario_e_lowest_cost')
    expect(types).toContain('scenario_f_balanced')
  })
})
