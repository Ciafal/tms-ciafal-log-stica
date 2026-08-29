/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Definir Agente IA Nativo — Planejador de Cargas
    try {
      $ai.agents.define(app, {
        slug: 'planejador-cargas-ia',
        name: 'AGENTE IA — PLANEJADOR DE CARGAS',
        description:
          'Agente de IA corporativo para análise multicritério, geração de cenários de carga, otimização física e econômica e recomendações explicáveis.',
        systemPrompt:
          'Você é o AGENTE IA — PLANEJADOR DE CARGAS do TMS CIAFAL Logística. Você analisa dados de Demanda (Carteira ZSD35), Estoque (DP34 vs PCP), Crédito, Fila/Disponibilidade (PORTA/FORA/PROGRAMADOS), Roteirização, ANTT e Histórico Econômico. Você gera cenários explicáveis com scores de 0 a 100, apontando oportunidades e riscos. REGRAS ABSOLUTAS: 1) Nunca libere crédito bloqueado; 2) Nunca invente estoque físico (DP34 é a referência imediata; PCP é apenas cenário futuro); 3) Nunca antecipe pedido (data_expedicao >= data_desejada); 4) Nunca contrate motorista autonomamente (decisão sempre humana); 5) Sempre justifique detalhadamente cada recomendação.',
        tier: 'fast',
        tools: [
          { collection: 'sap_sales_orders', perms: { read: true, list: true } },
          { collection: 'sap_stock_current', perms: { read: true, list: true } },
          { collection: 'pcp_production_orders', perms: { read: true, list: true } },
          { collection: 'queue_entries', perms: { read: true, list: true } },
          {
            collection: 'load_simulation_scenarios',
            perms: { read: true, list: true, create: true },
          },
          { collection: 'freight_offers', perms: { read: true, list: true } },
        ],
        memory: [
          {
            type: 'text',
            payload: {
              text: 'Regra DP34: Cargas prontas para saída imediata exigem 100% de saldo físico no depósito DP34. Saldo em outros depósitos não é somado automaticamente.',
            },
          },
          {
            type: 'text',
            payload: {
              text: 'Regra Data Desejada: A data de expedição programada deve ser maior ou igual à data desejada do pedido SAP. Antecipações são estritamente proibidas sem alteração oficial.',
            },
          },
          {
            type: 'text',
            payload: {
              text: 'Regra Motorista PORTA: Motoristas com status PORTA e presentes no pátio da CIAFAL têm prioridade máxima de saída e aumentam o score de prontidão imediata.',
            },
          },
          {
            type: 'text',
            payload: {
              text: 'Regra WMS Mapa de Carregamento: Materiais da Sidercentro (SDPL/DS11) e Perfil Pesado L2 devem ser carregados PRIMEIRO no veículo, respeitando a ordem inversa de descarga.',
            },
          },
        ],
      })
    } catch (err) {
      console.log('Erro ao registrar agente planejador-cargas-ia:', err)
    }

    // 2. Coleção: freight_results (Previsto x Realizado & Rentabilidade)
    if (!app.hasTable('freight_results')) {
      const freightResults = new Collection({
        name: 'freight_results',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'cargo_id', type: 'text', required: true },
          { name: 'sap_transport_number', type: 'text' },
          { name: 'itinerary_code', type: 'text', required: true },
          { name: 'customer_code', type: 'text' },
          { name: 'customer_name', type: 'text' },
          { name: 'customer_tier', type: 'text' },
          { name: 'destination_city', type: 'text' },
          { name: 'uf', type: 'text' },
          { name: 'vehicle_type', type: 'text' },
          { name: 'vehicle_plate', type: 'text' },
          { name: 'driver_name', type: 'text' },
          { name: 'driver_group', type: 'text' },
          { name: 'total_weight_kg', type: 'number' },
          { name: 'occupancy_pct', type: 'number' },
          { name: 'distance_km', type: 'number' },
          { name: 'receita_frete_prevista', type: 'number' },
          { name: 'frete_previsto_motorista', type: 'number' },
          { name: 'pedagio_previsto', type: 'number' },
          { name: 'outros_custos_previstos', type: 'number' },
          { name: 'resultado_previsto', type: 'number' },
          { name: 'margem_prevista_pct', type: 'number' },
          { name: 'receita_frete_real', type: 'number' },
          { name: 'frete_pago_motorista', type: 'number' },
          { name: 'pedagio_real', type: 'number' },
          { name: 'outros_custos_reais', type: 'number' },
          { name: 'resultado_realizado', type: 'number' },
          { name: 'margem_realizada_pct', type: 'number' },
          { name: 'desvio_resultado', type: 'number' },
          { name: 'desvio_resultado_pct', type: 'number' },
          { name: 'desvio_frete_motorista', type: 'number' },
          {
            name: 'status_fechamento',
            type: 'select',
            values: ['PREVISTO', 'REALIZADO', 'CONCILIADO', 'EM_DISPUTA'],
          },
          { name: 'tabela_comercial_versao', type: 'text' },
          { name: 'base_calculo', type: 'text' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_fr_cargo ON freight_results (cargo_id)',
          'CREATE INDEX idx_fr_itin ON freight_results (itinerary_code)',
          'CREATE INDEX idx_fr_cust ON freight_results (customer_code)',
          'CREATE INDEX idx_fr_status ON freight_results (status_fechamento)',
        ],
      })
      app.save(freightResults)
    }

    // 3. Coleção: expedition_milestones (Marcos T0 a T10 de Expedição)
    if (!app.hasTable('expedition_milestones')) {
      const expMilestones = new Collection({
        name: 'expedition_milestones',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'cargo_id', type: 'text', required: true },
          { name: 'vehicle_plate', type: 'text', required: true },
          { name: 'driver_name', type: 'text' },
          { name: 'sap_transport_number', type: 'text' },
          { name: 'itinerary_code', type: 'text' },
          { name: 't0_entrada', type: 'date' },
          { name: 't1_disponibilizacao', type: 'date' },
          { name: 't2_carga_atribuida', type: 'date' },
          { name: 't3_ordem_sap', type: 'date' },
          { name: 't4_chamado_doca', type: 'date' },
          { name: 't5_inicio_carregamento', type: 'date' },
          { name: 't6_fim_carregamento', type: 'date' },
          { name: 't7_conferencia', type: 'date' },
          { name: 't8_faturamento', type: 'date' },
          { name: 't9_documento_entregue', type: 'date' },
          { name: 't10_saida', type: 'date' },
          { name: 'lead_time_total_min', type: 'number' },
          { name: 'gargalo_principal', type: 'text' },
          { name: 'gargalo_duracao_min', type: 'number' },
          {
            name: 'status',
            type: 'select',
            values: ['EM_PATIO', 'EM_CARREGAMENTO', 'FATURADO', 'CONCLUIDO', 'CANCELADO'],
          },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_em_cargo ON expedition_milestones (cargo_id)',
          'CREATE INDEX idx_em_plate ON expedition_milestones (vehicle_plate)',
          'CREATE INDEX idx_em_status ON expedition_milestones (status)',
        ],
      })
      app.save(expMilestones)
    }

    // 4. Coleção: wms_loading_maps (Mapa de Carregamento & WMS)
    if (!app.hasTable('wms_loading_maps')) {
      const wmsMaps = new Collection({
        name: 'wms_loading_maps',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'cargo_id', type: 'text', required: true },
          { name: 'vehicle_plate', type: 'text', required: true },
          { name: 'vehicle_type', type: 'text', required: true },
          { name: 'itinerary_code', type: 'text', required: true },
          {
            name: 'status',
            type: 'select',
            values: [
              'PLANEJADO',
              'EM_SEPARACAO',
              'CONFERIDO',
              'CARREGADO',
              'CONFLITO_IDENTIFICADO',
            ],
          },
          { name: 'has_sidercentro', type: 'bool' },
          { name: 'has_perfil_pesado_l2', type: 'bool' },
          { name: 'has_conflict', type: 'bool' },
          { name: 'conflict_description', type: 'text' },
          { name: 'loading_sequence_json', type: 'json' },
          { name: 'internal_picking_sequence_json', type: 'json' },
          { name: 'wms_integration_status', type: 'text' },
          { name: 'approved_by_user', type: 'text' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_wms_cargo ON wms_loading_maps (cargo_id)',
          'CREATE INDEX idx_wms_plate ON wms_loading_maps (vehicle_plate)',
          'CREATE INDEX idx_wms_status ON wms_loading_maps (status)',
        ],
      })
      app.save(wmsMaps)
    }

    // 5. Coleção: ai_planner_recommendations (Governança e Decisões de IA)
    if (!app.hasTable('ai_planner_recommendations')) {
      const aiRecs = new Collection({
        name: 'ai_planner_recommendations',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'scenario_id', type: 'text', required: true },
          { name: 'scenario_code', type: 'text' },
          { name: 'scenario_title', type: 'text', required: true },
          { name: 'itinerary_code', type: 'text', required: true },
          { name: 'planned_date', type: 'date' },
          { name: 'score', type: 'number' },
          { name: 'score_breakdown_json', type: 'json' },
          { name: 'occupancy_pct', type: 'number' },
          { name: 'resultado_previsto', type: 'number' },
          { name: 'readiness_status', type: 'text' },
          { name: 'driver_group', type: 'text' },
          { name: 'suggested_driver_id', type: 'text' },
          { name: 'suggested_driver_name', type: 'text' },
          { name: 'ai_explanation', type: 'text' },
          { name: 'model_version', type: 'text' },
          { name: 'rules_version', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['SUGERIDO', 'APROVADO', 'AJUSTADO', 'REJEITADO', 'IMPACTADO_REANALISE'],
          },
          { name: 'approval_decision', type: 'text' },
          { name: 'approval_notes', type: 'text' },
          { name: 'approved_by_email', type: 'text' },
          { name: 'approved_at', type: 'date' },
          { name: 'converted_cargo_id', type: 'text' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_airec_scen ON ai_planner_recommendations (scenario_id)',
          'CREATE INDEX idx_airec_itin ON ai_planner_recommendations (itinerary_code)',
          'CREATE INDEX idx_airec_status ON ai_planner_recommendations (status)',
        ],
      })
      app.save(aiRecs)
    }

    // 6. Coleção: commercial_freight_tables (Tabela Comercial BASE SP Versionada)
    if (!app.hasTable('commercial_freight_tables')) {
      const commTables = new Collection({
        name: 'commercial_freight_tables',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'version', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'base_origin', type: 'text', required: true },
          { name: 'effective_date_start', type: 'date', required: true },
          { name: 'effective_date_end', type: 'date' },
          { name: 'is_active', type: 'bool' },
          { name: 'rates_json', type: 'json' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_cft_version ON commercial_freight_tables (version)',
          'CREATE INDEX idx_cft_active ON commercial_freight_tables (is_active)',
        ],
      })
      app.save(commTables)
    }

    // 7. Coleção: zsd35_column_mappings (Mapeamento ZSD35 Configurável)
    if (!app.hasTable('zsd35_column_mappings')) {
      const zsdMap = new Collection({
        name: 'zsd35_column_mappings',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'profile_name', type: 'text', required: true },
          { name: 'is_default', type: 'bool' },
          { name: 'mappings_json', type: 'json', required: true },
          { name: 'description', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_zsd_prof ON zsd35_column_mappings (profile_name)'],
      })
      app.save(zsdMap)
    }
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'planejador-cargas-ia')
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('zsd35_column_mappings'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('commercial_freight_tables'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('ai_planner_recommendations'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('wms_loading_maps'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('expedition_milestones'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('freight_results'))
    } catch (_) {}
  },
)
