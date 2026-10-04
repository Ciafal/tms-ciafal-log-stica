migrate(
  (app) => {
    const targetsCol = app.findCollectionByNameOrId('tms_kpi_targets')
    const currentYear = 2026

    const initialTargets = [
      // EXPEDIÇÃO (8)
      {
        kpi_id: 'otif_expedicao',
        kpi_name: 'OTIF de Expedição',
        category: 'EXPEDICAO',
        target_value: 95.0,
        rule: 'GTE',
        unit: '%',
        responsible: 'Gerência de Expedição & Logística',
      },
      {
        kpi_id: 'tempo_permanencia_veiculo',
        kpi_name: 'Tempo Médio de Permanência do Veículo',
        category: 'EXPEDICAO',
        target_value: 120.0, // 2 horas (120 min)
        rule: 'LTE',
        unit: 'min',
        responsible: 'Supervisão de Pátio & Balança',
      },
      {
        kpi_id: 'tempo_espera_carregamento',
        kpi_name: 'Tempo Médio de Espera para Carregamento',
        category: 'EXPEDICAO',
        target_value: 30.0, // 30 min
        rule: 'LTE',
        unit: 'min',
        responsible: 'Coordenação de Docas & Doca WSTL',
      },
      {
        kpi_id: 'tempo_carregamento',
        kpi_name: 'Tempo Médio de Carregamento',
        category: 'EXPEDICAO',
        target_value: 60.0, // 60 min
        rule: 'LTE',
        unit: 'min',
        responsible: 'Liderança de Carregamento Físico',
      },
      {
        kpi_id: 'tempo_emissao_nf',
        kpi_name: 'Tempo Médio para Emissão da Nota Fiscal',
        category: 'EXPEDICAO',
        target_value: 20.0, // 20 min
        rule: 'LTE',
        unit: 'min',
        responsible: 'Faturamento & Fiscal CIAFAL',
      },
      {
        kpi_id: 'cargas_faturadas_no_prazo',
        kpi_name: 'Cargas Faturadas no Prazo',
        category: 'EXPEDICAO',
        target_value: 95.0,
        rule: 'GTE',
        unit: '%',
        responsible: 'Faturamento & Expedição',
      },
      {
        kpi_id: 'produtividade_expedicao',
        kpi_name: 'Produtividade da Expedição',
        category: 'EXPEDICAO',
        target_value: 15.0, // 15 t/h
        rule: 'GTE',
        unit: 't/h',
        responsible: 'Operações Industriais & Expedição',
      },
      {
        kpi_id: 'veiculos_permanencia_acima_meta',
        kpi_name: 'Veículos com Permanência Acima da Meta',
        category: 'EXPEDICAO',
        target_value: 5.0, // no máximo 5%
        rule: 'LTE',
        unit: '%',
        responsible: 'Supervisão Geral de Pátio',
      },

      // LOGÍSTICA (6)
      {
        kpi_id: 'aderencia_planejamento_cargas',
        kpi_name: 'Aderência ao Planejamento de Cargas',
        category: 'LOGISTICA',
        target_value: 95.0,
        rule: 'GTE',
        unit: '%',
        responsible: 'Planejamento Logístico & PCP',
      },
      {
        kpi_id: 'ocupacao_media_veiculos',
        kpi_name: 'Ocupação Média dos Veículos',
        category: 'LOGISTICA',
        target_value: 85.0,
        rule: 'GTE',
        unit: '%',
        responsible: 'Planejador de Cargas & Torre',
      },
      {
        kpi_id: 'cargas_reprogramadas',
        kpi_name: 'Cargas Reprogramadas',
        category: 'LOGISTICA',
        target_value: 5.0,
        rule: 'LTE',
        unit: '%',
        responsible: 'Planejamento de Cargas',
      },
      {
        kpi_id: 'cargas_impedidas_falta_estoque',
        kpi_name: 'Cargas Impedidas por Falta de Estoque',
        category: 'LOGISTICA',
        target_value: 2.0,
        rule: 'LTE',
        unit: '%',
        responsible: 'WMS & PCP Robotizado',
      },
      {
        kpi_id: 'indice_ocorrencias_logisticas',
        kpi_name: 'Índice de Ocorrências Logísticas',
        category: 'LOGISTICA',
        target_value: 3.0,
        rule: 'LTE',
        unit: '%',
        responsible: 'Gestão de Qualidade & Logística',
      },
      {
        kpi_id: 'utilizacao_docas',
        kpi_name: 'Utilização das Docas',
        category: 'LOGISTICA',
        target_value: 75.0,
        rule: 'GTE',
        unit: '%',
        responsible: 'Gestão de Docas & WMS',
      },

      // TRANSPORTE (8)
      {
        kpi_id: 'otif_entrega_cliente',
        kpi_name: 'OTIF de Entrega ao Cliente',
        category: 'TRANSPORTE',
        target_value: 95.0,
        rule: 'GTE',
        unit: '%',
        responsible: 'Gestão de Transportes & Fred IA',
      },
      {
        kpi_id: 'custo_medio_frete_tonelada',
        kpi_name: 'Custo Médio de Frete por Tonelada',
        category: 'TRANSPORTE',
        target_value: 160.0, // R$ 160,00/t
        rule: 'LTE',
        unit: 'R$/t',
        responsible: 'Mesa de Fretes & Controladoria',
      },
      {
        kpi_id: 'frete_sobre_receita',
        kpi_name: 'Frete sobre Receita',
        category: 'TRANSPORTE',
        target_value: 8.5,
        rule: 'LTE',
        unit: '%',
        responsible: 'Controladoria & Comercial',
      },
      {
        kpi_id: 'resultado_financeiro_frete',
        kpi_name: 'Resultado Financeiro do Frete (Margem)',
        category: 'TRANSPORTE',
        target_value: 15.0, // margem mínima de 15%
        rule: 'GTE',
        unit: '%',
        responsible: 'Gestão de Fretes & Chicão IA',
      },
      {
        kpi_id: 'desvio_frete_negociado_referencia',
        kpi_name: 'Desvio do Frete Negociado x Referência',
        category: 'TRANSPORTE',
        target_value: 3.0, // desvio máximo de 3%
        rule: 'LTE',
        unit: '%',
        responsible: 'Mesa de Fretes & Governança ANTT',
      },
      {
        kpi_id: 'aderencia_eta',
        kpi_name: 'Aderência ao ETA',
        category: 'TRANSPORTE',
        target_value: 90.0,
        rule: 'GTE',
        unit: '%',
        responsible: 'Torre de Controle Fred IA',
      },
      {
        kpi_id: 'indice_ocorrencias_transporte',
        kpi_name: 'Índice de Ocorrências em Transporte',
        category: 'TRANSPORTE',
        target_value: 4.0,
        rule: 'LTE',
        unit: '%',
        responsible: 'Acompanhamento Fred & Sinistros',
      },
      {
        kpi_id: 'avaliacao_motoristas_transportadores',
        kpi_name: 'Avaliação de Motoristas/Transportadores',
        category: 'TRANSPORTE',
        target_value: 4.2, // escala de 1 a 5
        rule: 'GTE',
        unit: 'pts',
        responsible: 'Qualidade & Cadastro de Transportes',
      },
    ]

    for (const t of initialTargets) {
      try {
        const existing = app.findRecordsByFilter(
          'tms_kpi_targets',
          `kpi_id = "${t.kpi_id}" && year = ${currentYear}`,
          '',
          1,
          0,
        )
        if (existing && existing.length > 0) continue
      } catch (_) {}

      const record = new Record(targetsCol)
      record.set('kpi_id', t.kpi_id)
      record.set('kpi_name', t.kpi_name)
      record.set('category', t.category)
      record.set('year', currentYear)
      record.set('company', 'CIAFAL')
      record.set('center', 'TODOS')
      record.set('target_value', t.target_value)
      record.set('rule', t.rule)
      record.set('unit', t.unit)
      record.set('valid_from', '2026-01-01 00:00:00.000Z')
      record.set('valid_to', '2026-12-31 23:59:59.000Z')
      record.set('responsible', t.responsible)
      record.set('responsible_email', 'gestao.logistica@ciafal.com.br')
      record.set('change_justification', 'Calibração inicial do painel anual de Indicadores TMS')
      record.set('is_active', true)
      record.set('history_log', [
        {
          timestamp: '2026-01-01T00:00:00.000Z',
          user: 'Admin Master CIAFAL',
          action: 'INITIAL_TARGET_SETUP',
          value: t.target_value,
          rule: t.rule,
        },
      ])
      app.save(record)
    }
  },
  (app) => {
    try {
      app.db().newQuery('DELETE FROM tms_kpi_targets WHERE year = 2026').execute()
    } catch (_) {}
  },
)
