/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. Tabela Comercial Oficial BASE SP
  try {
    app.findFirstRecordByData('commercial_freight_tables', 'version', 'TAB-COM-2025.1')
  } catch (_) {
    const col = app.findCollectionByNameOrId('commercial_freight_tables')
    const rec = new Record(col)
    rec.set('version', 'TAB-COM-2025.1')
    rec.set('name', 'Tabela Comercial de Fretes CIAFAL — Base SP (São Paulo Capital/Interior)')
    rec.set('base_origin', 'SP')
    rec.set('effective_date_start', '2025-01-01 00:00:00')
    rec.set('is_active', true)
    rec.set('notes', 'Tabela auditável para cobrança de frete a clientes com base de expedição SP.')
    rec.set('rates_json', [
      {
        itinerary_code: 'MG001A',
        destination: 'Belo Horizonte / Contagem',
        rate_per_ton: 210.5,
        min_freight: 4200.0,
      },
      {
        itinerary_code: 'MG002B',
        destination: 'Juiz de Fora / Zona da Mata',
        rate_per_ton: 195.0,
        min_freight: 3900.0,
      },
      {
        itinerary_code: 'RJ001A',
        destination: 'Rio de Janeiro / Baixada',
        rate_per_ton: 240.0,
        min_freight: 4800.0,
      },
      {
        itinerary_code: 'SP001A',
        destination: 'Campinas / Paulínia',
        rate_per_ton: 120.0,
        min_freight: 2400.0,
      },
      {
        itinerary_code: 'SP002B',
        destination: 'Ribeirão Preto / Sertãozinho',
        rate_per_ton: 165.0,
        min_freight: 3300.0,
      },
      {
        itinerary_code: 'PR001A',
        destination: 'Curitiba / Região Metropolitana',
        rate_per_ton: 225.0,
        min_freight: 4500.0,
      },
      {
        itinerary_code: 'GO001A',
        destination: 'Goiânia / Anápolis',
        rate_per_ton: 285.0,
        min_freight: 5700.0,
      },
    ])
    app.save(rec)
  }

  // 2. Mapeamento Padrão ZSD35 (28 Campos Exatos da Carteira)
  try {
    app.findFirstRecordByData('zsd35_column_mappings', 'profile_name', 'PADRAO_SAP_ECC_ZSD35')
  } catch (_) {
    const col = app.findCollectionByNameOrId('zsd35_column_mappings')
    const rec = new Record(col)
    rec.set('profile_name', 'PADRAO_SAP_ECC_ZSD35')
    rec.set('is_default', true)
    rec.set('description', 'Mapeamento oficial das 28 colunas do relatório SAP ZSD35 da CIAFAL')
    rec.set('mappings_json', {
      q_dias: 'Q.Dias',
      gerar: 'Gerar',
      status: 'Status',
      inco: 'Inco',
      documento_vendas: 'Documento de vendas',
      regiao: 'Região',
      cidade: 'Cidade',
      qtde_real: 'Qtde Real',
      qtde_amar: 'Qtde.Amar.',
      est_sider: 'Est. Sider',
      texto_breve_material: 'Texto breve de material',
      valor_frete: 'Valor do Frete',
      recebedor_merc: 'Recebedor Merc',
      limite_credito: 'Limite de Crédito',
      emissor_ordem: 'Emissor da ordem',
      compromisso_especial: 'Compromisso especial',
      condicao_pagament: 'Condição de Pagament',
      motivo_estoque: 'Motivo Estoque',
      qtde_estoque: 'Qtde.Estoque',
      saldo: 'Saldo',
      data_pedido: 'Data do Pedido',
      hora_pedido: 'Hora do Pedido',
      quantidade_ordem: 'Quantidade da ordem',
      data_remessa: 'Data Remessa(Semana)',
      itinerario: 'Itinerário',
      motivo_credito: 'Motivo Crédito',
      total_receber: 'Total a Receber',
      estoque_total: 'Estoque Total',
    })
    app.save(rec)
  }

  // 3. Parâmetros do Planejador IA em system_parameters
  const paramsToSeed = [
    {
      key: 'AI_PLANNER_SCHEDULE_MORNING',
      value: '07:30',
      description: 'Execução automática do Planejador IA - Início do dia',
    },
    {
      key: 'AI_PLANNER_SCHEDULE_MIDSHIFT',
      value: '12:30',
      description: 'Execução automática do Planejador IA - Meio do turno',
    },
    {
      key: 'AI_PLANNER_SCHEDULE_EVENING',
      value: '17:00',
      description: 'Execução automática do Planejador IA - Final do dia',
    },
    {
      key: 'AI_PLANNER_AUTO_TRIGGER_EVENTS',
      value: 'true',
      description: 'Habilita reanálise automática por eventos críticos da Fila/PCP/Crédito',
    },
    {
      key: 'AI_PLANNER_WEIGHT_OCCUPANCY',
      value: '40',
      description: 'Peso do critério de Ocupação no score IA (0-100)',
    },
    {
      key: 'AI_PLANNER_WEIGHT_OVERDUE',
      value: '20',
      description: 'Peso do critério de Pedidos Atrasados no score IA (0-100)',
    },
    {
      key: 'AI_PLANNER_WEIGHT_PORTA_DRIVER',
      value: '15',
      description: 'Peso do bônus de Motorista PORTA no score IA (0-100)',
    },
    {
      key: 'AI_PLANNER_WEIGHT_PROFIT',
      value: '15',
      description: 'Peso do Resultado Econômico no score IA (0-100)',
    },
    {
      key: 'AI_PLANNER_WEIGHT_ROUTE_EFFICIENCY',
      value: '10',
      description: 'Peso da Eficiência de Rota no score IA (0-100)',
    },
    {
      key: 'OVERDUE_BUCKET_1_3_DAYS',
      value: '5',
      description: 'Pontos adicionais para atraso 1 a 3 dias',
    },
    {
      key: 'OVERDUE_BUCKET_4_7_DAYS',
      value: '10',
      description: 'Pontos adicionais para atraso 4 a 7 dias',
    },
    {
      key: 'OVERDUE_BUCKET_8_15_DAYS',
      value: '15',
      description: 'Pontos adicionais para atraso 8 a 15 dias',
    },
    {
      key: 'OVERDUE_BUCKET_GT_15_DAYS',
      value: '20',
      description: 'Pontos adicionais para atraso superior a 15 dias',
    },
  ]

  const sysCol = app.findCollectionByNameOrId('system_parameters')
  for (const p of paramsToSeed) {
    try {
      app.findFirstRecordByData('system_parameters', 'key', p.key)
    } catch (_) {
      const rec = new Record(sysCol)
      rec.set('key', p.key)
      rec.set('value', p.value)
      rec.set('description', p.description)
      app.save(rec)
    }
  }

  // 4. Seed de Resultados de Frete (Previsto x Realizado)
  const frCol = app.findCollectionByNameOrId('freight_results')
  const sampleResults = [
    {
      cargo_id: 'CARGA-SP001-0891',
      sap_transport_number: 'SAP-TR-9901',
      itinerary_code: 'MG001A',
      customer_code: 'CLI-00101',
      customer_name: 'ESTRUTURAS METALICAS MINAS LTDA',
      customer_tier: 'A',
      destination_city: 'Contagem',
      uf: 'MG',
      vehicle_type: 'Carreta LS 32t',
      vehicle_plate: 'ABC-1D23',
      driver_name: 'Carlos Eduardo Silva',
      driver_group: 'PORTA',
      total_weight_kg: 31200,
      occupancy_pct: 97.5,
      distance_km: 540,
      receita_frete_prevista: 6567.6,
      frete_previsto_motorista: 4850.0,
      pedagio_previsto: 420.0,
      outros_custos_previstos: 100.0,
      resultado_previsto: 1197.6,
      margem_prevista_pct: 18.23,
      receita_frete_real: 6567.6,
      frete_pago_motorista: 4700.0,
      pedagio_real: 420.0,
      outros_custos_reais: 100.0,
      resultado_realizado: 1347.6,
      margem_realizada_pct: 20.52,
      desvio_resultado: 150.0,
      desvio_resultado_pct: 12.52,
      desvio_frete_motorista: -150.0,
      status_fechamento: 'REALIZADO',
      tabela_comercial_versao: 'TAB-COM-2025.1',
      base_calculo: 'BASE_SP',
    },
    {
      cargo_id: 'CARGA-SP002-0892',
      sap_transport_number: 'SAP-TR-9902',
      itinerary_code: 'RJ001A',
      customer_code: 'CLI-00204',
      customer_name: 'AÇO NORTE FLUMINENSE S.A.',
      customer_tier: 'B',
      destination_city: 'Duque de Caxias',
      uf: 'RJ',
      vehicle_type: 'Carreta LS 32t',
      vehicle_plate: 'XYZ-9K88',
      driver_name: 'Marcos Vinicius Pereira',
      driver_group: 'FORA',
      total_weight_kg: 24500,
      occupancy_pct: 76.5,
      distance_km: 480,
      receita_frete_prevista: 5880.0,
      frete_previsto_motorista: 4600.0,
      pedagio_previsto: 380.0,
      outros_custos_previstos: 150.0,
      resultado_previsto: 750.0,
      margem_prevista_pct: 12.75,
      receita_frete_real: 5880.0,
      frete_pago_motorista: 5100.0,
      pedagio_real: 410.0,
      outros_custos_reais: 180.0,
      resultado_realizado: 190.0,
      margem_realizada_pct: 3.23,
      desvio_resultado: -560.0,
      desvio_resultado_pct: -74.67,
      desvio_frete_motorista: 500.0,
      status_fechamento: 'REALIZADO',
      tabela_comercial_versao: 'TAB-COM-2025.1',
      base_calculo: 'BASE_SP',
    },
    {
      cargo_id: 'CARGA-SP003-0893',
      sap_transport_number: 'SAP-TR-9903',
      itinerary_code: 'SP002B',
      customer_code: 'CLI-00305',
      customer_name: 'AGROINDUSTRIA CANAVIEIRA RIBEIRAO',
      customer_tier: 'A',
      destination_city: 'Ribeirão Preto',
      uf: 'SP',
      vehicle_type: 'Bitrem 45t',
      vehicle_plate: 'BIT-7X99',
      driver_name: 'Roberto Justino Santos',
      driver_group: 'PORTA',
      total_weight_kg: 44100,
      occupancy_pct: 98.0,
      distance_km: 320,
      receita_frete_prevista: 7276.5,
      frete_previsto_motorista: 5200.0,
      pedagio_previsto: 290.0,
      outros_custos_previstos: 80.0,
      resultado_previsto: 1706.5,
      margem_prevista_pct: 23.45,
      receita_frete_real: 7276.5,
      frete_pago_motorista: 5050.0,
      pedagio_real: 290.0,
      outros_custos_reais: 80.0,
      resultado_realizado: 1856.5,
      margem_realizada_pct: 25.51,
      desvio_resultado: 150.0,
      desvio_resultado_pct: 8.79,
      desvio_frete_motorista: -150.0,
      status_fechamento: 'REALIZADO',
      tabela_comercial_versao: 'TAB-COM-2025.1',
      base_calculo: 'BASE_SP',
    },
  ]

  for (const sr of sampleResults) {
    try {
      app.findFirstRecordByData('freight_results', 'cargo_id', sr.cargo_id)
    } catch (_) {
      const rec = new Record(frCol)
      for (const k of Object.keys(sr)) {
        rec.set(k, sr[k])
      }
      app.save(rec)
    }
  }

  // 5. Seed de Marcos de Expedição (Performance T0 a T10)
  const expCol = app.findCollectionByNameOrId('expedition_milestones')
  const sampleMilestones = [
    {
      cargo_id: 'CARGA-SP001-0891',
      vehicle_plate: 'ABC-1D23',
      driver_name: 'Carlos Eduardo Silva',
      sap_transport_number: 'SAP-TR-9901',
      itinerary_code: 'MG001A',
      t0_entrada: '2025-05-10 07:15:00',
      t1_disponibilizacao: '2025-05-10 07:30:00',
      t2_carga_atribuida: '2025-05-10 07:55:00',
      t3_ordem_sap: '2025-05-10 08:10:00',
      t4_chamado_doca: '2025-05-10 08:35:00',
      t5_inicio_carregamento: '2025-05-10 09:10:00',
      t6_fim_carregamento: '2025-05-10 10:20:00',
      t7_conferencia: '2025-05-10 10:45:00',
      t8_faturamento: '2025-05-10 11:10:00',
      t9_documento_entregue: '2025-05-10 11:25:00',
      t10_saida: '2025-05-10 11:35:00',
      lead_time_total_min: 260,
      gargalo_principal: 'Espera Carregamento (T5-T3)',
      gargalo_duracao_min: 60,
      status: 'CONCLUIDO',
    },
    {
      cargo_id: 'CARGA-SP002-0892',
      vehicle_plate: 'XYZ-9K88',
      driver_name: 'Marcos Vinicius Pereira',
      sap_transport_number: 'SAP-TR-9902',
      itinerary_code: 'RJ001A',
      t0_entrada: '2025-05-10 08:00:00',
      t1_disponibilizacao: '2025-05-10 08:20:00',
      t2_carga_atribuida: '2025-05-10 09:00:00',
      t3_ordem_sap: '2025-05-10 09:25:00',
      t4_chamado_doca: '2025-05-10 10:45:00',
      t5_inicio_carregamento: '2025-05-10 11:30:00',
      t6_fim_carregamento: '2025-05-10 13:00:00',
      t7_conferencia: '2025-05-10 13:30:00',
      t8_faturamento: '2025-05-10 14:15:00',
      t9_documento_entregue: '2025-05-10 14:30:00',
      t10_saida: '2025-05-10 14:40:00',
      lead_time_total_min: 400,
      gargalo_principal: 'Espera Carregamento (T5-T3)',
      gargalo_duracao_min: 125,
      status: 'CONCLUIDO',
    },
  ]

  for (const sm of sampleMilestones) {
    try {
      app.findFirstRecordByData('expedition_milestones', 'cargo_id', sm.cargo_id)
    } catch (_) {
      const rec = new Record(expCol)
      for (const k of Object.keys(sm)) {
        rec.set(k, sm[k])
      }
      app.save(rec)
    }
  }
})
