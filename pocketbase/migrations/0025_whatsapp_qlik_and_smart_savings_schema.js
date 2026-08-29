/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Coleção: qlik_profitability_records (Rentabilidade Consolidada por Pedido/Remessa/Transporte)
    if (!app.hasTable('qlik_profitability_records')) {
      const qlikCol = new Collection({
        name: 'qlik_profitability_records',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'sap_transport_number', type: 'text', required: true },
          { name: 'order_number', type: 'text' },
          { name: 'delivery_number', type: 'text' },
          { name: 'invoice_number', type: 'text' },
          { name: 'company_code', type: 'text' },
          { name: 'plant_code', type: 'text' },
          { name: 'customer_code', type: 'text' },
          { name: 'customer_name', type: 'text' },
          { name: 'ship_to_code', type: 'text' },
          { name: 'itinerary_code', type: 'text' },
          { name: 'region', type: 'text' },
          { name: 'product_family', type: 'text' },
          { name: 'driver_id', type: 'text' },
          { name: 'driver_name', type: 'text' },
          { name: 'carrier_name', type: 'text' },
          { name: 'vehicle_plate', type: 'text' },
          { name: 'vehicle_type', type: 'text' },
          { name: 'weight_ton', type: 'number' },
          { name: 'distance_km', type: 'number' },
          { name: 'receita_liquida', type: 'number' },
          { name: 'frete_cobrado_cliente', type: 'number' },
          { name: 'frete_pago_motorista', type: 'number' },
          { name: 'pedagio_total', type: 'number' },
          { name: 'custos_adicionais', type: 'number' },
          { name: 'custo_logistico_total', type: 'number' },
          { name: 'margem_logistica_bruta', type: 'number' },
          { name: 'margem_logistica_pct', type: 'number' },
          { name: 'reais_por_tonelada', type: 'number' },
          { name: 'reais_por_km', type: 'number' },
          { name: 'period_reference', type: 'text' },
          { name: 'qlik_sync_timestamp', type: 'date' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_qlik_transp ON qlik_profitability_records (sap_transport_number)',
          'CREATE INDEX idx_qlik_cust ON qlik_profitability_records (customer_code)',
          'CREATE INDEX idx_qlik_itin ON qlik_profitability_records (itinerary_code)',
          'CREATE INDEX idx_qlik_driver ON qlik_profitability_records (driver_id)',
        ],
      })
      app.save(qlikCol)
    }

    // 2. Coleção: smart_selection_savings_ledger (Demonstração Financeira e Baseline de Economia)
    if (!app.hasTable('smart_selection_savings_ledger')) {
      const savingsCol = new Collection({
        name: 'smart_selection_savings_ledger',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'cargo_id', type: 'text', required: true },
          { name: 'sap_transport_number', type: 'text' },
          { name: 'itinerary_code', type: 'text' },
          { name: 'region', type: 'text' },
          { name: 'customer_code', type: 'text' },
          { name: 'customer_name', type: 'text' },
          { name: 'vehicle_type', type: 'text' },
          { name: 'weight_ton', type: 'number' },
          {
            name: 'baseline_type_used',
            type: 'select',
            values: [
              'HISTORICO_ROTAS',
              'MEDIANA_OFERTAS',
              'TABELA_REFERENCIA',
              'SEGUNDA_MELHOR_OFERTA',
            ],
            maxSelect: 1,
          },
          { name: 'baseline_value', type: 'number' },
          { name: 'target_value', type: 'number' },
          { name: 'contracted_freight_value', type: 'number' },
          { name: 'pedagio_value', type: 'number' },
          { name: 'adicionais_value', type: 'number' },
          { name: 'total_negotiated_cost', type: 'number' },
          { name: 'realized_cost', type: 'number' },
          { name: 'estimated_savings', type: 'number' },
          { name: 'estimated_savings_pct', type: 'number' },
          { name: 'contracted_savings', type: 'number' },
          { name: 'contracted_savings_pct', type: 'number' },
          { name: 'realized_savings', type: 'number' },
          { name: 'realized_savings_pct', type: 'number' },
          {
            name: 'negotiation_mode',
            type: 'select',
            values: [
              'EXCLUSIVAMENTE_HUMANA',
              'APOIADA_IA',
              'PREDOMINANTE_CARLAO',
              'INTERVENCAO_HUMANA',
            ],
            maxSelect: 1,
          },
          { name: 'selected_driver_id', type: 'text' },
          { name: 'selected_driver_name', type: 'text' },
          { name: 'selected_driver_score', type: 'number' },
          { name: 'rounds_count', type: 'number' },
          { name: 'messages_ai_count', type: 'number' },
          { name: 'messages_human_count', type: 'number' },
          { name: 'duration_minutes', type: 'number' },
          { name: 'had_human_intervention', type: 'bool' },
          { name: 'intervention_reason', type: 'text' },
          { name: 'model_version', type: 'text' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_savings_cargo ON smart_selection_savings_ledger (cargo_id)',
          'CREATE INDEX idx_savings_transp ON smart_selection_savings_ledger (sap_transport_number)',
          'CREATE INDEX idx_savings_mode ON smart_selection_savings_ledger (negotiation_mode)',
          'CREATE INDEX idx_savings_driver ON smart_selection_savings_ledger (selected_driver_id)',
        ],
      })
      app.save(savingsCol)
    }

    // 3. Coleção: whatsapp_webhook_events (Eventos Reais/Homologação do WhatsApp Business API)
    if (!app.hasTable('whatsapp_webhook_events')) {
      const wppCol = new Collection({
        name: 'whatsapp_webhook_events',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'message_wamid', type: 'text' },
          { name: 'phone_number', type: 'text', required: true },
          {
            name: 'sender_role',
            type: 'select',
            values: [
              'MOTORISTA',
              'REPRESENTANTE',
              'VENDEDOR',
              'CLIENTE',
              'OPERADOR_INTERNO',
              'DESCONHECIDO',
            ],
            maxSelect: 1,
          },
          { name: 'sender_name', type: 'text' },
          { name: 'sap_transport_number', type: 'text' },
          { name: 'driver_id', type: 'text' },
          { name: 'customer_code', type: 'text' },
          {
            name: 'message_type',
            type: 'select',
            values: [
              'TEXTO',
              'AUDIO',
              'IMAGEM',
              'DOCUMENTO',
              'LOCALIZACAO',
              'STATUS_ENTREGA',
              'OUTRO',
            ],
            maxSelect: 1,
          },
          { name: 'raw_text', type: 'text' },
          { name: 'media_url', type: 'text' },
          { name: 'media_file_name', type: 'text' },
          { name: 'media_mime_type', type: 'text' },
          { name: 'audio_duration_seconds', type: 'number' },
          { name: 'audio_transcription', type: 'text' },
          { name: 'transcription_confidence_pct', type: 'number' },
          {
            name: 'ai_intent',
            type: 'select',
            values: [
              'POSICAO_LOCALIZACAO',
              'PREVISAO_CHEGADA',
              'ATRASO',
              'CHEGADA_CLIENTE',
              'INICIO_DESCARGA',
              'FIM_DESCARGA',
              'RECUSA_RECEBIMENTO',
              'ESPERA_FILA',
              'PROBLEMA_MECANICO',
              'ACIDENTE',
              'BLOQUEIO_RODOVIA',
              'PROBLEMA_DOCUMENTAL',
              'SOLICITACAO_CLIENTE',
              'ALTERACAO_JANELA',
              'FOTO_COMPROVANTE',
              'OCORRENCIA_GERAL',
              'SOLICITACAO_VENDEDOR',
              'CONSULTA_TRANSPORTE',
              'AVALIACAO_MOTORISTA',
              'CONTESTACAO_AVALIACAO',
              'OUTROS',
            ],
            maxSelect: 1,
          },
          { name: 'ai_intent_confidence', type: 'number' },
          { name: 'latitude', type: 'number' },
          { name: 'longitude', type: 'number' },
          { name: 'location_address', type: 'text' },
          { name: 'location_speed_kmh', type: 'number' },
          { name: 'is_proactive_alert', type: 'bool' },
          {
            name: 'message_status',
            type: 'select',
            values: [
              'RECEBIDA',
              'TRANSCRITA',
              'INTENCAO_IDENTIFICADA',
              'PROCESSADA',
              'HUMAN_REVIEW_REQUIRED',
              'FALHA',
            ],
            maxSelect: 1,
          },
          { name: 'response_sent_text', type: 'text' },
          { name: 'action_executed', type: 'text' },
          { name: 'read_at', type: 'date' },
          { name: 'is_ai_origin', type: 'bool' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_wpp_phone ON whatsapp_webhook_events (phone_number)',
          'CREATE INDEX idx_wpp_transp ON whatsapp_webhook_events (sap_transport_number)',
          'CREATE INDEX idx_wpp_intent ON whatsapp_webhook_events (ai_intent)',
          'CREATE INDEX idx_wpp_status ON whatsapp_webhook_events (message_status)',
        ],
      })
      app.save(wppCol)
    }

    // 4. Coleção: ai_weight_learning_proposals (Propostas de Aprendizado Controlado e Sugestões da IA com Aprovação Humana)
    if (!app.hasTable('ai_weight_learning_proposals')) {
      const learnCol = new Collection({
        name: 'ai_weight_learning_proposals',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'proposal_code', type: 'text', required: true },
          { name: 'target_template_code', type: 'text', required: true },
          { name: 'dimension_name', type: 'text', required: true },
          { name: 'current_weight_pct', type: 'number' },
          { name: 'suggested_weight_pct', type: 'number' },
          { name: 'historical_days_analyzed', type: 'number' },
          { name: 'trips_analyzed_count', type: 'number' },
          { name: 'statistical_correlation_r', type: 'number' },
          { name: 'rationale_fact', type: 'text' },
          { name: 'ai_hypothesis', type: 'text' },
          { name: 'expected_impact_summary', type: 'text' },
          { name: 'confidence_pct', type: 'number' },
          {
            name: 'status',
            type: 'select',
            values: ['SUGERIDA', 'APROVADA_E_APLICADA', 'REJEITADA_GESTOR', 'EXPIRADA'],
            maxSelect: 1,
          },
          { name: 'reviewed_by_user_email', type: 'text' },
          { name: 'reviewed_by_user_name', type: 'text' },
          { name: 'review_decision_notes', type: 'text' },
          { name: 'applied_at', type: 'date' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_learn_code ON ai_weight_learning_proposals (proposal_code)',
          'CREATE INDEX idx_learn_status ON ai_weight_learning_proposals (status)',
        ],
      })
      app.save(learnCol)
    }
  },
  (app) => {
    try {
      if (app.hasTable('ai_weight_learning_proposals')) {
        app.delete(app.findCollectionByNameOrId('ai_weight_learning_proposals'))
      }
      if (app.hasTable('whatsapp_webhook_events')) {
        app.delete(app.findCollectionByNameOrId('whatsapp_webhook_events'))
      }
      if (app.hasTable('smart_selection_savings_ledger')) {
        app.delete(app.findCollectionByNameOrId('smart_selection_savings_ledger'))
      }
      if (app.hasTable('qlik_profitability_records')) {
        app.delete(app.findCollectionByNameOrId('qlik_profitability_records'))
      }
    } catch (_) {}
  },
)
