// Migration 0008: Sprint 3 - Roteirizador, Simulador Logístico, Carteira, Estoque/PCP, Solicitações e ANTT

migrate(
  (app) => {
    // 1. Estoque Atual (SAP MB52)
    if (!app.hasTable('sap_stock_current')) {
      const stockCurrent = new Collection({
        name: 'sap_stock_current',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_description', type: 'text', required: true },
          { name: 'plant', type: 'text', required: true },
          { name: 'storage_location', type: 'text', required: true },
          { name: 'batch', type: 'text' },
          { name: 'quantity', type: 'number', required: true },
          { name: 'unit', type: 'text', required: true },
          { name: 'weight_kg', type: 'number', required: true },
          { name: 'available_qty', type: 'number', required: true },
          { name: 'reserved_qty', type: 'number' },
          { name: 'blocked_qty', type: 'number' },
          { name: 'read_timestamp', type: 'date' },
          { name: 'source', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_stock_material ON sap_stock_current (material_code)',
          'CREATE INDEX idx_stock_plant ON sap_stock_current (plant)',
        ],
      })
      app.save(stockCurrent)
    }

    // 2. Produção Programada / Estoque Futuro (PCP Robotizado)
    if (!app.hasTable('pcp_production_orders')) {
      const pcpOrders = new Collection({
        name: 'pcp_production_orders',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'production_order_number', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_description', type: 'text', required: true },
          { name: 'line', type: 'text', required: true },
          { name: 'quantity_planned', type: 'number', required: true },
          { name: 'quantity_produced', type: 'number' },
          { name: 'unit', type: 'text', required: true },
          { name: 'weight_kg_planned', type: 'number', required: true },
          { name: 'scheduled_date', type: 'date', required: true },
          { name: 'shift', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['Programada', 'Em Produção', 'Reprogramada', 'Concluída', 'Cancelada'],
            maxSelect: 1,
            required: true,
          },
          { name: 'confidence_pct', type: 'number' },
          { name: 'related_sales_order', type: 'text' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pcp_material ON pcp_production_orders (material_code)',
          'CREATE INDEX idx_pcp_date ON pcp_production_orders (scheduled_date)',
          'CREATE INDEX idx_pcp_status ON pcp_production_orders (status)',
        ],
      })
      app.save(pcpOrders)
    }

    // 3. Solicitações de Confirmação de Estoque
    if (!app.hasTable('stock_confirmation_requests')) {
      const stockRequests = new Collection({
        name: 'stock_confirmation_requests',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'order_number', type: 'text', required: true },
          { name: 'item_number', type: 'text' },
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_description', type: 'text' },
          { name: 'required_quantity', type: 'number', required: true },
          { name: 'stock_informed', type: 'number' },
          { name: 'unit', type: 'text' },
          { name: 'requested_by', type: 'text', required: true },
          { name: 'requester_name', type: 'text' },
          { name: 'reason', type: 'text', required: true },
          { name: 'notes', type: 'text' },
          { name: 'deadline', type: 'date' },
          { name: 'assigned_to', type: 'text' },
          { name: 'response_notes', type: 'text' },
          { name: 'confirmed_quantity', type: 'number' },
          { name: 'response_date', type: 'date' },
          {
            name: 'status',
            type: 'select',
            values: [
              'Solicitada',
              'Em análise',
              'Confirmada',
              'Confirmada parcialmente',
              'Negada',
              'Expirada',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_stock_req_order ON stock_confirmation_requests (order_number)',
          'CREATE INDEX idx_stock_req_status ON stock_confirmation_requests (status)',
        ],
      })
      app.save(stockRequests)
    }

    // 4. Solicitações de Reavaliação de Crédito
    if (!app.hasTable('credit_reassessment_requests')) {
      const creditRequests = new Collection({
        name: 'credit_reassessment_requests',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'customer_code', type: 'text', required: true },
          { name: 'customer_name', type: 'text', required: true },
          { name: 'order_number', type: 'text', required: true },
          { name: 'order_value', type: 'number', required: true },
          { name: 'credit_limit', type: 'number' },
          { name: 'current_exposure', type: 'number' },
          { name: 'requested_value', type: 'number', required: true },
          { name: 'logistic_reason', type: 'text', required: true },
          { name: 'related_load_id', type: 'text' },
          { name: 'desired_delivery_date', type: 'date' },
          { name: 'days_overdue', type: 'number' },
          { name: 'requested_by', type: 'text', required: true },
          { name: 'requester_name', type: 'text' },
          { name: 'financial_analyst', type: 'text' },
          { name: 'analyst_notes', type: 'text' },
          { name: 'approved_value', type: 'number' },
          { name: 'response_date', type: 'date' },
          {
            name: 'status',
            type: 'select',
            values: [
              'Solicitada',
              'Em análise',
              'Aprovada',
              'Aprovada parcialmente',
              'Rejeitada',
              'Expirada',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_credit_req_customer ON credit_reassessment_requests (customer_code)',
          'CREATE INDEX idx_credit_req_order ON credit_reassessment_requests (order_number)',
          'CREATE INDEX idx_credit_req_status ON credit_reassessment_requests (status)',
        ],
      })
      app.save(creditRequests)
    }

    // 5. Cenários do Roteirizador / Simulador Logístico
    if (!app.hasTable('load_simulation_scenarios')) {
      const scenarios = new Collection({
        name: 'load_simulation_scenarios',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'text' },
          {
            name: 'scenario_type',
            type: 'select',
            values: [
              'custom',
              'max_occupancy',
              'prioritize_overdue',
              'lowest_cost',
              'tomorrow_pcp',
              'max_complement',
            ],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'classification',
            type: 'select',
            values: ['VIÁVEL', 'VIÁVEL COM APROVAÇÃO', 'NÃO VIÁVEL', 'SIMULAÇÃO FUTURA'],
            maxSelect: 1,
            required: true,
          },
          { name: 'reasons', type: 'json' },
          { name: 'itinerary_code', type: 'text', required: true },
          { name: 'planned_date', type: 'date', required: true },
          { name: 'vehicle_type', type: 'text' },
          { name: 'vehicle_plate', type: 'text' },
          { name: 'driver_id', type: 'text' },
          { name: 'driver_name', type: 'text' },
          { name: 'queue_group', type: 'text' },
          { name: 'selected_orders', type: 'json', required: true },
          { name: 'customer_sequence', type: 'json' },
          { name: 'total_weight_kg', type: 'number', required: true },
          { name: 'total_volume_m3', type: 'number' },
          { name: 'vehicle_capacity_kg', type: 'number', required: true },
          { name: 'occupancy_pct', type: 'number', required: true },
          { name: 'orders_count', type: 'number', required: true },
          { name: 'customers_count', type: 'number', required: true },
          { name: 'distance_km', type: 'number', required: true },
          { name: 'duration_minutes', type: 'number' },
          { name: 'tolls_count', type: 'number' },
          { name: 'tolls_value', type: 'number' },
          { name: 'antt_floor_value', type: 'number', required: true },
          { name: 'antt_version', type: 'text' },
          { name: 'estimated_freight_cost', type: 'number', required: true },
          { name: 'cost_per_ton', type: 'number' },
          { name: 'orders_total_value', type: 'number' },
          { name: 'blocked_credit_value', type: 'number' },
          { name: 'confirmed_stock_weight_kg', type: 'number' },
          { name: 'future_stock_weight_kg', type: 'number' },
          { name: 'overdue_orders_count', type: 'number' },
          { name: 'complement_possible_kg', type: 'number' },
          { name: 'routing_provider', type: 'text' },
          { name: 'is_address_validated', type: 'bool' },
          { name: 'route_polyline', type: 'text' },
          { name: 'created_by', type: 'text' },
          { name: 'is_favorite', type: 'bool' },
          {
            name: 'status',
            type: 'select',
            values: ['simulado', 'aprovado', 'descartado', 'convertido_carga'],
            maxSelect: 1,
            required: true,
          },
          { name: 'generated_load_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_scen_itinerary ON load_simulation_scenarios (itinerary_code)',
          'CREATE INDEX idx_scen_classification ON load_simulation_scenarios (classification)',
          'CREATE INDEX idx_scen_status ON load_simulation_scenarios (status)',
        ],
      })
      app.save(scenarios)
    }

    // 6. Tabela Oficial ANTT (com versionamento e auditoria)
    if (!app.hasTable('antt_rate_tables')) {
      const anttTable = new Collection({
        name: 'antt_rate_tables',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'table_version', type: 'text', required: true },
          { name: 'resolution_number', type: 'text', required: true },
          { name: 'effective_date_start', type: 'date', required: true },
          { name: 'effective_date_end', type: 'date' },
          { name: 'is_active', type: 'bool' },
          {
            name: 'cargo_type',
            type: 'select',
            values: ['Geral', 'Granel Sólido', 'Granel Líquido', 'Frigorificada', 'Perigosa'],
            maxSelect: 1,
            required: true,
          },
          { name: 'rates_json', type: 'json', required: true },
          { name: 'notes', type: 'text' },
          { name: 'source_url', type: 'text' },
          { name: 'registered_by', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_antt_version_cargo ON antt_rate_tables (table_version, cargo_type)',
          'CREATE INDEX idx_antt_active ON antt_rate_tables (is_active)',
        ],
      })
      app.save(anttTable)
    }

    // 7. Expandir sap_sales_orders com novos campos ZSD35
    const ordersCol = app.findCollectionByNameOrId('sap_sales_orders')
    if (!ordersCol.fields.getByName('customer_tier')) {
      ordersCol.fields.add(new TextField({ name: 'customer_tier' })) // Classificação do cliente (A, B, C, Gold, etc.)
    }
    if (!ordersCol.fields.getByName('sales_rep')) {
      ordersCol.fields.add(new TextField({ name: 'sales_rep' })) // Representante / Vendedor
    }
    if (!ordersCol.fields.getByName('segment')) {
      ordersCol.fields.add(new TextField({ name: 'segment' })) // Segmento de mercado
    }
    if (!ordersCol.fields.getByName('order_date')) {
      ordersCol.fields.add(new DateField({ name: 'order_date' })) // Data de entrada do pedido
    }
    if (!ordersCol.fields.getByName('desired_date')) {
      ordersCol.fields.add(new DateField({ name: 'desired_date' })) // Data desejada pelo cliente
    }
    if (!ordersCol.fields.getByName('production_forecast_date')) {
      ordersCol.fields.add(new DateField({ name: 'production_forecast_date' })) // Previsão de término da produção
    }
    if (!ordersCol.fields.getByName('item_number')) {
      ordersCol.fields.add(new TextField({ name: 'item_number' })) // Item SAP (ex: 000010)
    }
    if (!ordersCol.fields.getByName('material_description')) {
      ordersCol.fields.add(new TextField({ name: 'material_description' }))
    }
    if (!ordersCol.fields.getByName('balance_quantity')) {
      ordersCol.fields.add(new NumberField({ name: 'balance_quantity' }))
    }
    if (!ordersCol.fields.getByName('unit')) {
      ordersCol.fields.add(new TextField({ name: 'unit' }))
    }
    if (!ordersCol.fields.getByName('street_address')) {
      ordersCol.fields.add(new TextField({ name: 'street_address' }))
    }
    if (!ordersCol.fields.getByName('postal_code')) {
      ordersCol.fields.add(new TextField({ name: 'postal_code' }))
    }
    if (!ordersCol.fields.getByName('dest_latitude')) {
      ordersCol.fields.add(new NumberField({ name: 'dest_latitude' }))
    }
    if (!ordersCol.fields.getByName('dest_longitude')) {
      ordersCol.fields.add(new NumberField({ name: 'dest_longitude' }))
    }
    if (!ordersCol.fields.getByName('address_validated')) {
      ordersCol.fields.add(new BoolField({ name: 'address_validated' }))
    }
    app.save(ordersCol)
  },
  (app) => {
    try {
      const t1 = app.findCollectionByNameOrId('sap_stock_current')
      app.delete(t1)
    } catch (_) {}
    try {
      const t2 = app.findCollectionByNameOrId('pcp_production_orders')
      app.delete(t2)
    } catch (_) {}
    try {
      const t3 = app.findCollectionByNameOrId('stock_confirmation_requests')
      app.delete(t3)
    } catch (_) {}
    try {
      const t4 = app.findCollectionByNameOrId('credit_reassessment_requests')
      app.delete(t4)
    } catch (_) {}
    try {
      const t5 = app.findCollectionByNameOrId('load_simulation_scenarios')
      app.delete(t5)
    } catch (_) {}
    try {
      const t6 = app.findCollectionByNameOrId('antt_rate_tables')
      app.delete(t6)
    } catch (_) {}
  },
)
