/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Definir Agente IA Nativo Skip Cloud — Carlão
    try {
      $ai.agents.define(app, {
        slug: 'carlao-negociador',
        name: 'CARLÃO',
        description:
          'Agente de IA da CIAFAL responsável pela negociação e contratação inteligente de fretes com motoristas parceiros.',
        systemPrompt:
          'Você é o CARLÃO, agente de IA corporativo da CIAFAL responsável pela negociação e contratação inteligente de fretes com motoristas parceiros. Você busca sempre o MELHOR CUSTO SUSTENTÁVEL, avaliando simultaneamente Custo, Qualidade, Probabilidade de Aceite, Disponibilidade, Histórico, Relacionamento e Risco de Cancelamento. PERSONALIDADE: simples, profissional, amigável, cordial, objetiva, respeitosa, agradável e natural. O motorista é um parceiro estratégico fundamental da CIAFAL. NUNCA use linguagem agressiva ou robótica. REGRAS CRÍTICAS: 1) Nunca ultrapasse o limite de autonomia financeira configurado; 2) Separe OBRIGATORIAMENTE Frete, Pedágio e Outros Custos; 3) Solicite confirmação explícita com botões [CONFIRMAR CARGA] e [TENHO UMA DÚVIDA]; 4) Quando o humano assumir a conversa, pause sua atuação imediatamente e só retorne quando devolvido com as devidas diretrizes; 5) Se o motorista fizer contraproposta ou enviar áudio, identifique intenção, valores e disponibilidade.',
        tier: 'fast',
        tools: [
          { collection: 'drivers', perms: { read: true, list: true } },
          { collection: 'vehicles', perms: { read: true, list: true } },
          { collection: 'queue_entries', perms: { read: true, list: true } },
          { collection: 'freight_offers', perms: { read: true, list: true } },
          { collection: 'freight_proposals', perms: { read: true, list: true, create: true } },
          { collection: 'sap_sales_orders', perms: { read: true, list: true } },
        ],
        memory: [
          {
            type: 'text',
            payload: {
              text: 'Exemplo de Abertura Carlão: "Olá, João! Tudo bem? Temos uma carga CIAFAL para Campinas com previsão de carregamento hoje. Vi que seu veículo atende essa operação. Quer que eu te passe os detalhes?"',
            },
          },
          {
            type: 'text',
            payload: {
              text: 'Separação Obrigatória de Custos: Frete pago ao motorista e Pedágio são calculados e apresentados de forma estritamente separada em todas as mensagens e ordens.',
            },
          },
          {
            type: 'text',
            payload: {
              text: 'Índice de Custo Sustentável: Não avaliar a contratação apenas pelo menor valor nominal; considerar pontualidade, taxa histórica de cancelamento e tempo de pátio.',
            },
          },
          {
            type: 'text',
            payload: {
              text: 'Autonomia Nível 1: Carlão negocia dentro da faixa inteligente parametrizada (Piso, Meta, Referência, Teto Autonomia), mas a confirmação final passa por validação humana.',
            },
          },
        ],
      })
    } catch (err) {
      console.log('Erro ao registrar agente carlao-negociador:', err)
    }

    // 2. Coleção: freight_negotiations (Negociações ativas com Motoristas & Carlão)
    if (!app.hasTable('freight_negotiations')) {
      const col = new Collection({
        name: 'freight_negotiations',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'cargo_id', type: 'text', required: true },
          {
            name: 'offer_id',
            type: 'relation',
            collectionId: app.findCollectionByNameOrId('freight_offers').id,
            maxSelect: 1,
          },
          {
            name: 'driver_id',
            type: 'relation',
            collectionId: app.findCollectionByNameOrId('drivers').id,
            maxSelect: 1,
          },
          { name: 'driver_name', type: 'text', required: true },
          { name: 'driver_phone', type: 'text' },
          { name: 'driver_plate', type: 'text' },
          {
            name: 'channel',
            type: 'select',
            values: ['WHATSAPP', 'TELEGRAM', 'WEB', 'TOTEM', 'MANUAL'],
          },
          { name: 'channel_status', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: [
              'OFERTADA',
              'EM_NEGOCIACAO',
              'CONTRATADO',
              'RECUSADO',
              'PAUSADO_HUMANO',
              'CANCELADO',
              'EXPIRADO',
            ],
          },
          {
            name: 'active_actor',
            type: 'select',
            values: ['CARLAO', 'HUMANO', 'MOTORISTA', 'SISTEMA'],
          },
          { name: 'human_takeover_user', type: 'text' },
          { name: 'human_takeover_reason', type: 'text' },
          { name: 'human_takeover_at', type: 'date' },
          { name: 'handback_notes', type: 'text' },
          { name: 'eligibility_score', type: 'number' },
          { name: 'score_breakdown', type: 'json' },
          { name: 'offer_wave', type: 'number' },
          { name: 'current_round', type: 'number' },
          { name: 'rounds_data', type: 'json' },
          { name: 'initial_offer_value', type: 'number' },
          { name: 'current_counter_value', type: 'number' },
          { name: 'final_freight_value', type: 'number' },
          { name: 'pedagio_value', type: 'number' },
          { name: 'outros_custos_value', type: 'number' },
          { name: 'total_contract_value', type: 'number' },
          { name: 'target_value', type: 'number' },
          { name: 'reference_value', type: 'number' },
          { name: 'max_autonomy_value', type: 'number' },
          { name: 'floor_antt_value', type: 'number' },
          { name: 'explicabilidade_json', type: 'json' },
          { name: 'ai_autonomous_completion', type: 'bool' },
          { name: 'messages_history', type: 'json' },
          { name: 'audios_received', type: 'json' },
          { name: 'last_interaction_at', type: 'date' },
          { name: 'sap_transport_number', type: 'text' },
          { name: 'sap_status', type: 'text' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_fneg_cargo ON freight_negotiations (cargo_id)',
          'CREATE INDEX idx_fneg_driver ON freight_negotiations (driver_id)',
          'CREATE INDEX idx_fneg_status ON freight_negotiations (status)',
          'CREATE INDEX idx_fneg_actor ON freight_negotiations (active_actor)',
        ],
      })
      app.save(col)
    }

    // 3. Coleção: negotiation_parameters (Faixas Inteligentes, Ondas e Autonomia do Carlão)
    if (!app.hasTable('negotiation_parameters')) {
      const col = new Collection({
        name: 'negotiation_parameters',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'rule_name', type: 'text', required: true },
          { name: 'itinerary_code', type: 'text' },
          { name: 'region', type: 'text' },
          { name: 'vehicle_type', type: 'text' },
          { name: 'autonomy_level', type: 'number' }, // 0: assist, 1: negocia+aprova humana, 2: semi-auto, 3: full auto
          { name: 'max_counter_rounds', type: 'number' },
          { name: 'wave1_duration_min', type: 'number' },
          { name: 'wave2_duration_min', type: 'number' },
          { name: 'wave3_duration_min', type: 'number' },
          { name: 'default_margin_target_pct', type: 'number' },
          { name: 'max_autonomy_spread_pct', type: 'number' },
          { name: 'is_active', type: 'bool' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_negparam_rule ON negotiation_parameters (rule_name)',
          'CREATE INDEX idx_negparam_active ON negotiation_parameters (is_active)',
        ],
      })
      app.save(col)
    }

    // 4. Coleção: sap_reprocessing_queue (Fila de Reprocessamento de Transporte SAP)
    if (!app.hasTable('sap_reprocessing_queue')) {
      const col = new Collection({
        name: 'sap_reprocessing_queue',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'cargo_id', type: 'text', required: true },
          { name: 'negotiation_id', type: 'text' },
          { name: 'driver_id', type: 'text' },
          { name: 'driver_name', type: 'text' },
          { name: 'vehicle_plate', type: 'text' },
          { name: 'freight_value', type: 'number' },
          { name: 'pedagio_value', type: 'number' },
          { name: 'payload_json', type: 'json' },
          {
            name: 'status',
            type: 'select',
            values: ['PENDENTE', 'EM_PROCESSAMENTO', 'SUCESSO', 'ERRO_DEFINITIVO', 'CANCELADO'],
          },
          { name: 'attempts_count', type: 'number' },
          { name: 'max_attempts', type: 'number' },
          { name: 'last_error_message', type: 'text' },
          { name: 'last_attempt_at', type: 'date' },
          { name: 'next_retry_at', type: 'date' },
          { name: 'sap_transport_number', type: 'text' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_sapretry_cargo ON sap_reprocessing_queue (cargo_id)',
          'CREATE INDEX idx_sapretry_status ON sap_reprocessing_queue (status)',
        ],
      })
      app.save(col)
    }

    // 5. Coleção: expedition_tracking (Workflow Completo de Expedição Operacional em Tempo Real)
    if (!app.hasTable('expedition_tracking')) {
      const col = new Collection({
        name: 'expedition_tracking',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'cargo_id', type: 'text', required: true },
          { name: 'sap_transport_number', type: 'text' },
          { name: 'driver_name', type: 'text', required: true },
          { name: 'driver_document', type: 'text' },
          { name: 'driver_phone', type: 'text' },
          { name: 'vehicle_plate', type: 'text', required: true },
          { name: 'carrier_name', type: 'text' },
          { name: 'itinerary_code', type: 'text' },
          { name: 'destination_cities', type: 'text' },
          { name: 'clients_summary', type: 'text' },
          { name: 'weight_total_kg', type: 'number' },
          { name: 'volume_total_m3', type: 'number' },
          { name: 'deliveries_count', type: 'number' },
          {
            name: 'operational_status',
            type: 'select',
            values: [
              'PROGRAMADA',
              'MOTORISTA_CONFIRMADO',
              'A_CAMINHO_CIAFAL',
              'PRESENCA_NO_PATIO',
              'CHECK_IN',
              'AGUARDANDO_LIBERACAO',
              'AGUARDANDO_ESTOQUE',
              'ESTOQUE_LIBERADO',
              'EM_SEPARACAO',
              'SEPARACAO_CONCLUIDA',
              'AGUARDANDO_CARREGAMENTO',
              'EM_CARREGAMENTO',
              'CARREGAMENTO_CONCLUIDO',
              'CONFERENCIA',
              'AGUARDANDO_FATURAMENTO',
              'FATURADO',
              'LIBERADO',
              'SAIDA_DO_PATIO',
              'EM_VIAGEM',
            ],
          },
          { name: 'current_stage_name', type: 'text' },
          { name: 'current_stage_start', type: 'date' },
          { name: 'current_stage_duration_min', type: 'number' },
          { name: 'entry_time', type: 'date' },
          { name: 'exit_time', type: 'date' },
          { name: 'total_lead_time_min', type: 'number' },
          { name: 'target_lead_time_min', type: 'number' },
          { name: 'sla_status', type: 'select', values: ['NORMAL', 'ATENCAO', 'CRITICO_ATRASADO'] },
          { name: 'delay_risk_pct', type: 'number' },
          { name: 'delay_root_cause', type: 'text' },
          { name: 'delay_evidence', type: 'text' },
          { name: 'delay_suggested_action', type: 'text' },
          {
            name: 'delay_reason_category',
            type: 'select',
            values: [
              'MOTORISTA',
              'DOCUMENTACAO',
              'ESTOQUE',
              'WMS',
              'SEPARACAO',
              'CARREGAMENTO',
              'BALANCA',
              'CONFERENCIA',
              'SAP',
              'FATURAMENTO',
              'QUALIDADE',
              'MANUTENCAO',
              'LOGISTICA',
              'CLIENTE',
              'OUTRO',
            ],
          },
          {
            name: 'priority_level',
            type: 'select',
            values: ['NORMAL', 'ALTA', 'URGENTE', 'CRITICA'],
          },
          { name: 'wms_status_detail', type: 'text' },
          { name: 'wms_available_weight_kg', type: 'number' },
          { name: 'wms_pending_weight_kg', type: 'number' },
          { name: 'wms_priority_requested', type: 'bool' },
          { name: 'wms_priority_requested_at', type: 'date' },
          { name: 'stages_log', type: 'json' },
          { name: 'timeline_events', type: 'json' },
          { name: 'assigned_dock', type: 'text' },
          { name: 'source_system', type: 'text' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_exptrack_cargo ON expedition_tracking (cargo_id)',
          'CREATE INDEX idx_exptrack_plate ON expedition_tracking (vehicle_plate)',
          'CREATE INDEX idx_exptrack_status ON expedition_tracking (operational_status)',
          'CREATE INDEX idx_exptrack_sla ON expedition_tracking (sla_status)',
        ],
      })
      app.save(col)
    }

    // 6. Coleção: expedition_sla_parameters (Configuração de SLAs por Etapa)
    if (!app.hasTable('expedition_sla_parameters')) {
      const col = new Collection({
        name: 'expedition_sla_parameters',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'stage_name', type: 'text', required: true },
          { name: 'stage_code', type: 'text', required: true },
          { name: 'target_min', type: 'number', required: true },
          { name: 'warning_threshold_pct', type: 'number' },
          { name: 'critical_threshold_pct', type: 'number' },
          { name: 'responsible_sector', type: 'text' },
          { name: 'is_active', type: 'bool' },
          { name: 'description', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_exp_sla_code ON expedition_sla_parameters (stage_code)'],
      })
      app.save(col)
    }

    // 7. Coleção: driver_performance_indicators (Índice de Custo Sustentável & Métricas)
    if (!app.hasTable('driver_performance_indicators')) {
      const col = new Collection({
        name: 'driver_performance_indicators',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'driver_id', type: 'text', required: true },
          { name: 'driver_name', type: 'text', required: true },
          { name: 'driver_document', type: 'text' },
          { name: 'sustainable_cost_index', type: 'number' }, // 0 a 100
          { name: 'offers_received_count', type: 'number' },
          { name: 'offers_accepted_count', type: 'number' },
          { name: 'offers_refused_count', type: 'number' },
          { name: 'cancellations_count', type: 'number' },
          { name: 'accept_rate_pct', type: 'number' },
          { name: 'avg_response_time_min', type: 'number' },
          { name: 'avg_price_deviation_pct', type: 'number' },
          { name: 'avg_punctuality_pct', type: 'number' },
          { name: 'avg_yard_stay_min', type: 'number' },
          { name: 'delivery_performance_pct', type: 'number' },
          { name: 'historical_trips_count', type: 'number' },
          { name: 'preferred_regions', type: 'json' },
          { name: 'operational_metrics', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_driver_perf_driver ON driver_performance_indicators (driver_id)',
          'CREATE INDEX idx_driver_perf_sci ON driver_performance_indicators (sustainable_cost_index)',
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'carlao-negociador')
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('driver_performance_indicators'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('expedition_sla_parameters'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('expedition_tracking'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('sap_reprocessing_queue'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('negotiation_parameters'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('freight_negotiations'))
    } catch (_) {}
  },
)
