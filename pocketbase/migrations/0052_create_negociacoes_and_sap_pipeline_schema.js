migrate(
  (app) => {
    // 1. Coleção 'negociacoes' (Área de GESTÃO, Acompanhamento, Histórico e Integração SAP)
    if (!app.hasTable('negociacoes')) {
      const negociacoesCol = new Collection({
        name: 'negociacoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          // Identificação
          { name: 'negotiation_number', type: 'text', required: true },
          { name: 'cargo_id', type: 'text', required: true },
          { name: 'cargo_description', type: 'text' },
          { name: 'offer_code', type: 'text' },

          // Rota e Itinerário
          { name: 'origin', type: 'text' },
          { name: 'destination', type: 'text' },
          { name: 'uf', type: 'text' },
          { name: 'itinerary_code', type: 'text' },
          { name: 'itinerary_description', type: 'text' },
          { name: 'distance_km', type: 'number' },
          { name: 'discharges_count', type: 'number' },
          { name: 'customers_count', type: 'number' },

          // Motorista & Veículo
          { name: 'driver_id', type: 'text' },
          { name: 'driver_name', type: 'text' },
          { name: 'driver_phone', type: 'text' },
          { name: 'driver_cpf', type: 'text' },
          { name: 'driver_cpf_masked', type: 'text' },
          { name: 'carrier_name', type: 'text' },
          { name: 'vehicle_plate', type: 'text' },
          { name: 'vehicle_type', type: 'text' },
          { name: 'vehicle_body_type', type: 'text' },
          { name: 'total_weight_kg', type: 'number' },

          // Valores Comerciais (Separados Frete x Pedágio)
          { name: 'initial_freight_value', type: 'number' },
          { name: 'negotiated_freight_value', type: 'number' },
          { name: 'toll_value', type: 'number' },
          { name: 'other_costs_value', type: 'number' },
          { name: 'total_contracted_value', type: 'number' },
          { name: 'antt_floor_value', type: 'number' },

          // Status do Kanban (4 colunas estritas)
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ABERTO', 'EM_NEGOCIACAO', 'RECUSADO', 'CONCLUIDA'],
            maxSelect: 1,
          },

          // Responsável e Atuação IA x Humano
          {
            name: 'responsible_type',
            type: 'select',
            values: ['CHICAO_IA', 'HUMANO'],
            maxSelect: 1,
          },
          { name: 'responsible_user_name', type: 'text' },
          { name: 'responsible_user_email', type: 'text' },
          { name: 'ai_messages_count', type: 'number' },
          { name: 'human_messages_count', type: 'number' },
          { name: 'ai_duration_minutes', type: 'number' },
          { name: 'human_duration_minutes', type: 'number' },
          { name: 'human_takeover_at', type: 'date' },
          { name: 'human_takeover_reason', type: 'text' },
          { name: 'rounds_count', type: 'number' },

          // Regras de Conclusão e Aceite
          { name: 'acceptance_at', type: 'date' },
          { name: 'accepted_by', type: 'text' },
          { name: 'completion_notes', type: 'text' },
          { name: 'opened_at', type: 'date' },
          { name: 'concluded_at', type: 'date' },

          // Pipeline de Integração SAP
          {
            name: 'sap_pipeline_status',
            type: 'select',
            values: [
              'AGUARDANDO_INTEGRACAO',
              'VALIDANDO_DADOS',
              'CRIANDO_REMESSAS',
              'REMESSAS_CRIADAS',
              'CRIANDO_TRANSPORTE',
              'INTEGRADO_SAP',
              'ERRO_INTEGRACAO',
              'INTEGRACAO_PARCIAL',
            ],
            maxSelect: 1,
          },
          { name: 'sap_pipeline_current_step', type: 'text' },
          { name: 'sap_transport_number', type: 'text' },
          { name: 'sap_remessas_summary', type: 'text' },
          { name: 'sap_last_attempt_at', type: 'date' },
          { name: 'sap_error_technical', type: 'text' },
          { name: 'sap_error_message', type: 'text' },
          { name: 'sap_error_step', type: 'text' },
          { name: 'sap_retry_count', type: 'number' },

          // Estruturas JSON ricas
          { name: 'orders_items_json', type: 'json' },
          { name: 'remessas_sap_json', type: 'json' },
          { name: 'timeline_events_json', type: 'json' },
          { name: 'counter_proposals_json', type: 'json' },

          // Metadados
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_neg_number ON negociacoes (negotiation_number)',
          'CREATE INDEX idx_neg_cargo ON negociacoes (cargo_id)',
          'CREATE INDEX idx_neg_status ON negociacoes (status)',
          'CREATE INDEX idx_neg_sap_status ON negociacoes (sap_pipeline_status)',
          'CREATE INDEX idx_neg_driver ON negociacoes (driver_id)',
          'CREATE INDEX idx_neg_plate ON negociacoes (vehicle_plate)',
          'CREATE INDEX idx_neg_created ON negociacoes (created)',
        ],
      })
      app.save(negociacoesCol)
    }

    // 2. Coleção 'sap_remessas_transporte' (Rastreabilidade Carga -> Cliente -> Pedido -> Remessa SAP -> Transporte SAP)
    if (!app.hasTable('sap_remessas_transporte')) {
      const remessasCol = new Collection({
        name: 'sap_remessas_transporte',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'negotiation_number', type: 'text', required: true },
          { name: 'cargo_id', type: 'text', required: true },
          { name: 'customer_code', type: 'text', required: true },
          { name: 'customer_name', type: 'text' },
          { name: 'plant_code', type: 'text' },
          { name: 'shipping_point', type: 'text' },
          { name: 'orders_numbers', type: 'text' },
          { name: 'total_items_count', type: 'number' },
          { name: 'total_weight_kg', type: 'number' },
          { name: 'remessa_sap_number', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['PENDENTE', 'CRIANDO', 'CRIADA', 'ERRO', 'CANCELADA'],
            maxSelect: 1,
          },
          { name: 'sap_transport_number', type: 'text' },
          { name: 'vehicle_plate', type: 'text' },
          { name: 'driver_name', type: 'text' },
          { name: 'sap_message', type: 'text' },
          { name: 'technical_details', type: 'text' },
          { name: 'idempotency_key', type: 'text' },
          { name: 'items_json', type: 'json' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_remessa_unique_key ON sap_remessas_transporte (cargo_id, customer_code, negotiation_number)',
          'CREATE INDEX idx_remessa_neg ON sap_remessas_transporte (negotiation_number)',
          'CREATE INDEX idx_remessa_sap_num ON sap_remessas_transporte (remessa_sap_number)',
          'CREATE INDEX idx_remessa_transp ON sap_remessas_transporte (sap_transport_number)',
        ],
      })
      app.save(remessasCol)
    }
  },
  (app) => {
    try {
      const r = app.findCollectionByNameOrId('sap_remessas_transporte')
      app.delete(r)
    } catch (_) {}
    try {
      const n = app.findCollectionByNameOrId('negociacoes')
      app.delete(n)
    } catch (_) {}
  },
)
