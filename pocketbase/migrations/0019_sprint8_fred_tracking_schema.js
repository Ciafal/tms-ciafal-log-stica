/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Atualizar / Definir Agente de IA Nativo Skip Cloud — Fred (slug: "fred-rastreamento")
    try {
      $ai.agents.define(app, {
        slug: 'fred-rastreamento',
        name: 'FRED — Acompanhamento de Viagens e Entregas',
        description:
          'Agente operacional de IA da CIAFAL para acompanhamento de transporte pós-SAP: saídas, entregas, ETA inteligente, ocorrências, contato com motorista/cliente/vendedor e transcrição de evidências.',
        systemPrompt:
          'Você é o FRED, assistente e agente operacional de inteligência artificial da CIAFAL responsável pelo acompanhamento proativo de transportes após a carga ter sido contratada e gerado transporte no SAP. SEU PAPEL: 1) Acompanhar o motorista em toda a viagem via WhatsApp, mensagens e áudios com comunicação cordial, objetiva, amigável e natural; 2) Localizar transportes prioritariamente pelo NÚMERO DO TRANSPORTE SAP (e complementarmente por Pedido, NF, Cliente ou Placa); 3) Monitorar evolução de rota, horários de descarga e ETA dinâmico; 4) Tratar intercorrências e apoiar o motorista; 5) Coletar evidências (fotos, canhotos, áudios transcritos); 6) Integrar-se com Vendedores/Representantes via CRM 360º CIAFAL e com Clientes autorizados, ajustando tom e visibilidade sem vazar dados comerciais confidenciais; 7) Suportar escalonamento humano com preservação de histórico. NUNCA invente informações. Em caso de dúvida sobre evidências, faça perguntas de confirmação antes de assumir como fato definitivo.',
        tier: 'fast',
        tools: [
          { collection: 'drivers', perms: { read: true, list: true } },
          { collection: 'vehicles', perms: { read: true, list: true } },
          { collection: 'expedition_tracking', perms: { read: true, list: true } },
          { collection: 'sap_sales_orders', perms: { read: true, list: true } },
        ],
        memory: [
          {
            type: 'text',
            payload: {
              text: 'Abertura Padrão com Motorista: "Olá! Sou o Fred, assistente de acompanhamento de transporte da CIAFAL. Vou acompanhar sua viagem e ajudar caso tenha alguma necessidade durante as entregas."',
            },
          },
          {
            type: 'text',
            payload: {
              text: 'Identificador Principal: Número do Transporte SAP. O Fred localiza automaticamente todos os pedidos, clientes, notas fiscais, pesos, sequência de entregas, motorista e veículo a partir desse número.',
            },
          },
          {
            type: 'text',
            payload: {
              text: 'Classificação de ETA: Verde (No prazo), Amarelo (Risco de atraso), Vermelho (Atrasado), Azul (Entregue), Branco (Aguardando). Atualize sempre com base em tempo real e nunca apresente localização antiga como atual.',
            },
          },
          {
            type: 'text',
            payload: {
              text: 'Comunicação Multicanal Segregada: Ajuste o tom e os dados para Motorista, Cliente, Vendedor/Representante e Operação CIAFAL. Nunca revele dados estratégicos restritos a públicos externos.',
            },
          },
        ],
      })
    } catch (err) {
      console.log('Erro ao definir agente fred-rastreamento:', err)
    }

    // 2. Coleção: fred_transports (Acompanhamento do Transporte em Viagem)
    if (!app.hasTable('fred_transports')) {
      const col = new Collection({
        name: 'fred_transports',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'sap_transport_number', type: 'text', required: true },
          { name: 'cargo_id', type: 'text' },
          { name: 'negotiation_id', type: 'text' },
          { name: 'driver_id', type: 'text' },
          { name: 'driver_name', type: 'text', required: true },
          { name: 'driver_phone', type: 'text' },
          { name: 'vehicle_plate', type: 'text', required: true },
          { name: 'vehicle_type', type: 'text' },
          { name: 'carrier_name', type: 'text' },
          { name: 'origin_plant', type: 'text' },
          { name: 'itinerary_code', type: 'text' },
          { name: 'destination_summary', type: 'text' },
          { name: 'total_weight_kg', type: 'number' },
          { name: 'total_deliveries_count', type: 'number' },
          { name: 'completed_deliveries_count', type: 'number' },
          {
            name: 'trip_status',
            type: 'select',
            values: [
              'AGUARDANDO_SAIDA',
              'EM_ROTA',
              'CHEGADA_CLIENTE',
              'EM_DESCARGA',
              'DESCARGA_CONCLUIDA',
              'INTERCORRENCIA',
              'RETORNANDO',
              'ENCERRADO',
              'CANCELADO',
            ],
          },
          { name: 'started_at', type: 'date' },
          { name: 'finished_at', type: 'date' },
          { name: 'last_location_lat', type: 'number' },
          { name: 'last_location_lng', type: 'number' },
          { name: 'last_location_city', type: 'number' }, // text or number fallback
          { name: 'last_location_name', type: 'text' },
          { name: 'last_location_updated_at', type: 'date' },
          { name: 'last_location_is_stale', type: 'bool' },
          { name: 'current_next_stop_name', type: 'text' },
          { name: 'current_next_stop_eta', type: 'date' },
          {
            name: 'overall_eta_status',
            type: 'select',
            values: ['DENTRO_PREVISTO', 'RISCO_ATRASO', 'ATRASADO', 'CONCLUIDO', 'AGUARDANDO'],
          },
          { name: 'delay_minutes_current', type: 'number' },
          { name: 'active_occurrences_count', type: 'number' },
          { name: 'active_actor', type: 'select', values: ['FRED_IA', 'HUMANO', 'PAUSADO'] },
          { name: 'human_takeover_user', type: 'text' },
          { name: 'human_takeover_reason', type: 'text' },
          { name: 'human_takeover_at', type: 'date' },
          { name: 'total_ai_messages_count', type: 'number' },
          { name: 'total_human_messages_count', type: 'number' },
          { name: 'ai_duration_seconds', type: 'number' },
          { name: 'human_duration_seconds', type: 'number' },
          { name: 'geo_tracking_authorized', type: 'bool' },
          { name: 'geo_authorized_at', type: 'date' },
          { name: 'sales_representatives_json', type: 'json' },
          { name: 'metadata_json', type: 'json' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_fredtrans_sap ON fred_transports (sap_transport_number)',
          'CREATE INDEX idx_fredtrans_plate ON fred_transports (vehicle_plate)',
          'CREATE INDEX idx_fredtrans_status ON fred_transports (trip_status)',
          'CREATE INDEX idx_fredtrans_actor ON fred_transports (active_actor)',
        ],
      })
      app.save(col)
    }

    // 3. Coleção: fred_deliveries (Paradas / Entregas da Viagem)
    if (!app.hasTable('fred_deliveries')) {
      const col = new Collection({
        name: 'fred_deliveries',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'sap_transport_number', type: 'text', required: true },
          { name: 'sequence_order', type: 'number', required: true },
          { name: 'customer_code', type: 'text', required: true },
          { name: 'customer_name', type: 'text', required: true },
          { name: 'destination_city', type: 'text' },
          { name: 'destination_uf', type: 'text' },
          { name: 'street_address', type: 'text' },
          { name: 'contact_name', type: 'text' },
          { name: 'contact_phone', type: 'text' },
          { name: 'sales_rep_name', type: 'text' },
          { name: 'sales_rep_phone', type: 'text' },
          { name: 'orders_list_json', type: 'json' },
          { name: 'invoice_numbers_json', type: 'json' },
          { name: 'weight_kg', type: 'number' },
          { name: 'window_start_time', type: 'text' },
          { name: 'window_end_time', type: 'text' },
          { name: 'unloading_restriction_notes', type: 'text' },
          { name: 'initial_planned_arrival', type: 'date' },
          { name: 'current_eta', type: 'date' },
          { name: 'actual_arrival_at', type: 'date' },
          { name: 'unloading_started_at', type: 'date' },
          { name: 'unloading_finished_at', type: 'date' },
          { name: 'departure_at', type: 'date' },
          { name: 'avg_historical_unloading_min', type: 'number' },
          { name: 'measured_unloading_min', type: 'number' },
          {
            name: 'status',
            type: 'select',
            values: [
              'PENDENTE',
              'EM_DESLOCAMENTO',
              'PROXIMO',
              'NA_PORTARIA',
              'EM_DESCARGA',
              'ENTREGUE',
              'RECUSADO',
              'REAGENDADO',
            ],
          },
          {
            name: 'eta_status',
            type: 'select',
            values: ['DENTRO_PREVISTO', 'RISCO_ATRASO', 'ATRASADO', 'ENTREGUE', 'AGUARDANDO'],
          },
          { name: 'discharge_confirmed_by_client', type: 'bool' },
          { name: 'discharge_confirmed_at', type: 'date' },
          { name: 'confirmation_notes', type: 'text' },
          { name: 'delay_deviation_minutes', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_freddeliv_sap ON fred_deliveries (sap_transport_number)',
          'CREATE INDEX idx_freddeliv_cust ON fred_deliveries (customer_code)',
          'CREATE INDEX idx_freddeliv_status ON fred_deliveries (status)',
        ],
      })
      app.save(col)
    }

    // 4. Coleção: fred_occurrences (Intercorrências Estruturadas)
    if (!app.hasTable('fred_occurrences')) {
      const col = new Collection({
        name: 'fred_occurrences',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'sap_transport_number', type: 'text', required: true },
          { name: 'customer_code', type: 'text' },
          { name: 'customer_name', type: 'text' },
          { name: 'driver_name', type: 'text' },
          {
            name: 'category',
            type: 'select',
            values: [
              'CONGESTIONAMENTO',
              'ACIDENTE',
              'PANE_MECANICA',
              'PNEU',
              'RESTRICAO_RODOVIARIA',
              'DESVIO_ROTA',
              'CHUVA_CLIMA',
              'BLOQUEIO_ESTRADA',
              'CLIENTE_FECHADO',
              'CLIENTE_RECUSOU',
              'DEMORA_DESCARGA',
              'FILA_ESPERA',
              'DIVERGENCIA_PRODUTO',
              'DIVERGENCIA_QUANTIDADE',
              'PROBLEMA_DOCUMENTACAO',
              'ENDERECO_INCORRETO',
              'IMPOSSIBILIDADE_DESCARGA',
              'AVARIA_CARGA',
              'MOTORISTA_SEM_CONTATO',
              'ATRASO_OPERACIONAL_CIAFAL',
              'OUTROS',
            ],
          },
          {
            name: 'severity',
            type: 'select',
            values: ['INFORMATIVO', 'BAIXA', 'MEDIA', 'ALTA', 'CRITICA'],
          },
          { name: 'description', type: 'text', required: true },
          { name: 'location_description', type: 'text' },
          { name: 'latitude', type: 'number' },
          { name: 'longitude', type: 'number' },
          { name: 'eta_before', type: 'date' },
          { name: 'eta_after', type: 'date' },
          { name: 'estimated_impact_minutes', type: 'number' },
          {
            name: 'status',
            type: 'select',
            values: ['ABERTA', 'EM_TRATAMENTO', 'RESOLVIDA', 'CANCELADA'],
          },
          { name: 'responsible_handler', type: 'text' },
          { name: 'solution_notes', type: 'text' },
          { name: 'normalized_at', type: 'date' },
          { name: 'ai_suggested_classification', type: 'text' },
          { name: 'ai_classification_confidence', type: 'number' },
          { name: 'human_confirmed', type: 'bool' },
          { name: 'human_confirmed_by', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_fredocc_sap ON fred_occurrences (sap_transport_number)',
          'CREATE INDEX idx_fredocc_cat ON fred_occurrences (category)',
          'CREATE INDEX idx_fredocc_status ON fred_occurrences (status)',
        ],
      })
      app.save(col)
    }

    // 5. Coleção: fred_evidences (Fotos, Canhotos, Documentos e Áudios Transcritos)
    if (!app.hasTable('fred_evidences')) {
      const col = new Collection({
        name: 'fred_evidences',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'sap_transport_number', type: 'text', required: true },
          { name: 'customer_code', type: 'text' },
          { name: 'occurrence_id', type: 'text' },
          {
            name: 'evidence_type',
            type: 'select',
            values: [
              'CANHOTO_ASSINADO',
              'FOTO_MERCADORIA',
              'FOTO_FILA_DESCARGA',
              'FOTO_PORTARIA_FECHADA',
              'FOTO_AVARIA',
              'FOTO_ACIDENTE_OU_TRANSITO',
              'FOTO_PNEU_OU_MECANICA',
              'DOCUMENTO_FISCAL',
              'AUDIO_MOTORISTA',
              'AUDIO_CLIENTE',
              'OUTRO',
            ],
          },
          { name: 'sender_role', type: 'text' }, // MOTORISTA | CLIENTE | VENDEDOR | OPERADOR
          { name: 'sender_name', type: 'text' },
          { name: 'sender_phone', type: 'text' },
          { name: 'file_url', type: 'text' },
          { name: 'file_name', type: 'text' },
          { name: 'audio_duration_seconds', type: 'number' },
          { name: 'audio_transcription', type: 'text' },
          { name: 'ai_vision_description', type: 'text' },
          { name: 'ai_suggested_tag', type: 'text' },
          { name: 'ai_confidence_pct', type: 'number' },
          { name: 'is_human_validated', type: 'bool' },
          { name: 'validated_by_user', type: 'text' },
          { name: 'validation_notes', type: 'text' },
          { name: 'latitude', type: 'number' },
          { name: 'longitude', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_fredevid_sap ON fred_evidences (sap_transport_number)',
          'CREATE INDEX idx_fredevid_type ON fred_evidences (evidence_type)',
        ],
      })
      app.save(col)
    }

    // 6. Coleção: fred_messages (Histórico Único de Conversas Multicanal)
    if (!app.hasTable('fred_messages')) {
      const col = new Collection({
        name: 'fred_messages',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'sap_transport_number', type: 'text', required: true },
          {
            name: 'sender_type',
            type: 'select',
            values: [
              'FRED_IA',
              'MOTORISTA',
              'VENDEDOR',
              'REPRESENTANTE',
              'CLIENTE',
              'OPERADOR_HUMANO',
            ],
          },
          { name: 'sender_id', type: 'text' },
          { name: 'sender_name', type: 'text', required: true },
          { name: 'sender_contact', type: 'text' },
          {
            name: 'target_audience',
            type: 'select',
            values: ['MOTORISTA', 'VENDEDOR', 'REPRESENTANTE', 'CLIENTE', 'OPERACAO_INTERNA'],
          },
          {
            name: 'message_channel',
            type: 'select',
            values: ['WHATSAPP', 'CRM_360', 'TMS_PANEL', 'TELEGRAM', 'SMS'],
          },
          { name: 'message_text', type: 'text', required: true },
          {
            name: 'message_type',
            type: 'select',
            values: ['TEXTO', 'AUDIO', 'IMAGEM', 'LOCALIZACAO', 'ALERTA_PROATIVO', 'SISTEMA'],
          },
          { name: 'media_url', type: 'text' },
          { name: 'audio_transcription', type: 'text' },
          { name: 'ai_intent', type: 'text' },
          { name: 'is_proactive_alert', type: 'bool' },
          {
            name: 'alert_category',
            type: 'select',
            values: ['INFORMATIVO', 'ATENCAO', 'CRITICO'],
          },
          { name: 'is_delivered', type: 'bool' },
          { name: 'is_read', type: 'bool' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_fredmsg_sap ON fred_messages (sap_transport_number)',
          'CREATE INDEX idx_fredmsg_sender ON fred_messages (sender_type)',
          'CREATE INDEX idx_fredmsg_created ON fred_messages (created)',
        ],
      })
      app.save(col)
    }

    // 7. Coleção: fred_timeline_events (Linha do Tempo Integrada do Transporte)
    if (!app.hasTable('fred_timeline_events')) {
      const col = new Collection({
        name: 'fred_timeline_events',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'sap_transport_number', type: 'text', required: true },
          { name: 'event_code', type: 'text', required: true },
          { name: 'event_title', type: 'text', required: true },
          { name: 'event_description', type: 'text' },
          {
            name: 'event_source',
            type: 'select',
            values: ['SAP', 'FRED_IA', 'MOTORISTA', 'GPS_TORRE', 'HUMANO', 'CLIENTE', 'VENDEDOR'],
          },
          {
            name: 'event_severity',
            type: 'select',
            values: ['INFO', 'SUCCESS', 'WARNING', 'DANGER'],
          },
          { name: 'customer_code', type: 'text' },
          { name: 'customer_name', type: 'text' },
          { name: 'location_name', type: 'text' },
          { name: 'latitude', type: 'number' },
          { name: 'longitude', type: 'number' },
          { name: 'payload_json', type: 'json' },
          { name: 'event_timestamp', type: 'date', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_fredtime_sap ON fred_timeline_events (sap_transport_number)',
          'CREATE INDEX idx_fredtime_source ON fred_timeline_events (event_source)',
          'CREATE INDEX idx_fredtime_ts ON fred_timeline_events (event_timestamp)',
        ],
      })
      app.save(col)
    }

    // 8. Coleção: fred_ai_analytics (Análise de Hipóteses x Fatos e SLAs)
    if (!app.hasTable('fred_ai_analytics')) {
      const col = new Collection({
        name: 'fred_ai_analytics',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'analysis_type', type: 'text', required: true },
          { name: 'entity_target', type: 'text' }, // CLIENTE | ROTA | REGIAO | MOTORISTA | TRANSPORTADORA
          { name: 'entity_id', type: 'text' },
          { name: 'entity_name', type: 'text' },
          { name: 'observed_fact', type: 'text', required: true },
          { name: 'ai_hypothesis', type: 'text', required: true },
          { name: 'confidence_pct', type: 'number' },
          { name: 'evidence_data_json', type: 'json' },
          { name: 'historical_benchmark_json', type: 'json' },
          { name: 'recommended_action', type: 'text' },
          { name: 'master_parameter_suggested_change', type: 'text' },
          { name: 'reviewed_by_human', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_fredanal_type ON fred_ai_analytics (analysis_type)',
          'CREATE INDEX idx_fredanal_target ON fred_ai_analytics (entity_target)',
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('fred_ai_analytics'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('fred_timeline_events'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('fred_messages'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('fred_evidences'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('fred_occurrences'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('fred_deliveries'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('fred_transports'))
    } catch (_) {}
  },
)
