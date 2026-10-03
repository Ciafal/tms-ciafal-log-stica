migrate(
  (app) => {
    // 1. Coleção financial_complement_requests
    if (!app.hasTable('financial_complement_requests')) {
      const col = new Collection({
        name: 'financial_complement_requests',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          // Identificação sequencial e rastreabilidade
          { name: 'request_number', type: 'text', required: true },
          { name: 'opportunity_id', type: 'text', required: true },
          { name: 'opportunity_code', type: 'text', required: true },
          { name: 'load_proposal_id', type: 'text' },
          { name: 'itinerary_id', type: 'text' },
          { name: 'planned_dispatch_date', type: 'date' },

          // Veículo e Carga
          { name: 'vehicle_plate', type: 'text' },
          { name: 'vehicle_type', type: 'text' },
          { name: 'vehicle_capacity_kg', type: 'number' },
          { name: 'current_weight_kg', type: 'number' },
          { name: 'current_occupancy_pct', type: 'number' },
          { name: 'missing_weight_kg', type: 'number' },

          // Cliente
          { name: 'customer_sap_code', type: 'text', required: true },
          { name: 'customer_name', type: 'text', required: true },
          { name: 'destination_city', type: 'text' },
          { name: 'destination_uf', type: 'text' },
          { name: 'sales_rep', type: 'text' },

          // Item / Material
          { name: 'material_id', type: 'text' },
          { name: 'material_description', type: 'text' },
          { name: 'suggested_quantity_kg', type: 'number' },
          { name: 'sap_order_id', type: 'text' },

          // Situação Financeira no Momento da Solicitação
          { name: 'credit_status_sap', type: 'text' },
          { name: 'block_reason', type: 'text' },
          { name: 'credit_limit', type: 'number' },
          { name: 'credit_used', type: 'number' },
          { name: 'credit_available', type: 'number' },
          { name: 'required_value', type: 'number' },
          { name: 'last_sap_query_at', type: 'date' },

          // Dados do Solicitante e Observação
          { name: 'requester_email', type: 'text' },
          { name: 'requester_name', type: 'text', required: true },
          { name: 'requester_role', type: 'text' },
          { name: 'requester_observation', type: 'text' },
          { name: 'requested_at', type: 'date' },

          // Status do Ciclo Financeiro
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'AGUARDANDO_ANALISE',
              'EM_ANALISE',
              'LIBERADO_FINANCEIRO',
              'REPROVADO_FINANCEIRO',
              'INFORMACOES_SOLICITADAS',
              'REVALIDACAO_SAP_PENDENTE',
              'REVALIDACAO_SAP_CONFIRMADA',
              'REVALIDACAO_SAP_DIVERGENTE',
            ],
            maxSelect: 1,
          },

          // Decisão do Financeiro (Obrigatória observação/justificativa)
          { name: 'decision', type: 'text' },
          { name: 'decision_justification', type: 'text' },
          { name: 'financial_analyst_name', type: 'text' },
          { name: 'financial_analyst_email', type: 'text' },
          { name: 'financial_decided_at', type: 'date' },

          // Reconsulta SAP e Auditoria
          { name: 'sap_recheck_status', type: 'text' },
          { name: 'sap_recheck_at', type: 'date' },
          { name: 'sap_recheck_response', type: 'text' },
          { name: 'sap_recheck_credit_status', type: 'text' },
          { name: 'sap_recheck_credit_limit', type: 'number' },
          { name: 'sap_recheck_credit_used', type: 'number' },
          { name: 'sap_recheck_credit_available', type: 'number' },

          // JSON Ricos para Snapshot de Auditoria
          { name: 'credit_snapshot_at_request', type: 'json' },
          { name: 'sap_recheck_snapshot', type: 'json' },
          { name: 'metadata', type: 'json' },
          { name: 'correlation_id', type: 'text' },

          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_fin_req_num ON financial_complement_requests (request_number)',
          'CREATE INDEX idx_fin_req_opp ON financial_complement_requests (opportunity_id)',
          'CREATE INDEX idx_fin_req_opp_code ON financial_complement_requests (opportunity_code)',
          'CREATE INDEX idx_fin_req_cust ON financial_complement_requests (customer_sap_code)',
          'CREATE INDEX idx_fin_req_status ON financial_complement_requests (status)',
          'CREATE INDEX idx_fin_req_created ON financial_complement_requests (created)',
        ],
      })
      app.save(col)
    }

    // 2. Adicionar campos de substatus financeiro em load_complement_opportunities
    const oppsCol = app.findCollectionByNameOrId('load_complement_opportunities')
    if (!oppsCol.fields.getByName('financial_substatus')) {
      oppsCol.fields.add(
        new TextField({
          name: 'financial_substatus',
        }),
      )
    }
    if (!oppsCol.fields.getByName('financial_request_id')) {
      oppsCol.fields.add(
        new TextField({
          name: 'financial_request_id',
        }),
      )
    }
    if (!oppsCol.fields.getByName('financial_request_number')) {
      oppsCol.fields.add(
        new TextField({
          name: 'financial_request_number',
        }),
      )
    }
    if (!oppsCol.fields.getByName('financial_requested_at')) {
      oppsCol.fields.add(
        new DateField({
          name: 'financial_requested_at',
        }),
      )
    }
    if (!oppsCol.fields.getByName('financial_requested_by')) {
      oppsCol.fields.add(
        new TextField({
          name: 'financial_requested_by',
        }),
      )
    }
    app.save(oppsCol)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('financial_complement_requests')
      app.delete(col)
    } catch (_) {}
  },
)
