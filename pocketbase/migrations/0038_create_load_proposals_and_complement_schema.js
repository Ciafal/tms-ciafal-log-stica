/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. load_optimization_runs
    const runsCol = new Collection({
      name: 'load_optimization_runs',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'correlation_id', type: 'text', required: true },
        { name: 'itinerary_code', type: 'text' },
        { name: 'planned_date', type: 'date' },
        { name: 'vehicle_type', type: 'text' },
        { name: 'min_occupancy_pct', type: 'number' },
        { name: 'max_occupancy_pct', type: 'number' },
        { name: 'total_orders_considered', type: 'number' },
        { name: 'total_proposals_created', type: 'number' },
        { name: 'total_weight_kg', type: 'number' },
        { name: 'avg_occupancy_pct', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['executado', 'em_processamento', 'erro'],
          maxSelect: 1,
        },
        { name: 'executed_by', type: 'text' },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lor_corr ON load_optimization_runs (correlation_id)',
        'CREATE INDEX idx_lor_date ON load_optimization_runs (planned_date)',
        'CREATE INDEX idx_lor_itin ON load_optimization_runs (itinerary_code)',
      ],
    })
    app.save(runsCol)

    // 2. load_proposals
    const proposalsCol = new Collection({
      name: 'load_proposals',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'proposal_number', type: 'text', required: true },
        { name: 'correlation_id', type: 'text' },
        { name: 'itinerary_code', type: 'text', required: true },
        { name: 'itinerary_description', type: 'text' },
        { name: 'uf', type: 'text' },
        { name: 'region', type: 'text' },
        { name: 'planned_dispatch_date', type: 'date', required: true },
        { name: 'vehicle_id', type: 'text' },
        { name: 'vehicle_plate', type: 'text' },
        { name: 'vehicle_type', type: 'text' },
        { name: 'vehicle_capacity_kg', type: 'number', required: true },
        { name: 'current_weight_kg', type: 'number', required: true },
        { name: 'current_occupancy_pct', type: 'number', required: true },
        { name: 'min_occupancy_pct', type: 'number', required: true },
        { name: 'max_occupancy_pct', type: 'number', required: true },
        { name: 'target_weight_kg', type: 'number' },
        { name: 'missing_weight_kg', type: 'number' },
        {
          name: 'classification_status',
          type: 'select',
          values: [
            'Aguardando consolidação',
            'Carga parcial — Complemento Comercial',
            'Carga dentro da faixa',
            'Capacidade excedida — Reotimizar',
          ],
          maxSelect: 1,
        },
        {
          name: 'lifecycle_stage',
          type: 'select',
          values: [
            'Simulação',
            'Proposta TMS',
            'Programação futura',
            'Aguardando complemento',
            'Carga consolidada',
            'Aprovada',
            'Transporte SAP',
          ],
          maxSelect: 1,
        },
        { name: 'orders_count', type: 'number' },
        { name: 'customers_count', type: 'number' },
        { name: 'discharges_count', type: 'number' },
        { name: 'estimated_freight_cost', type: 'number' },
        { name: 'antt_floor_value', type: 'number' },
        { name: 'tolls_value', type: 'number' },
        { name: 'is_future_match', type: 'bool' },
        { name: 'scheduled_vehicle_date', type: 'date' },
        { name: 'score', type: 'number' },
        { name: 'why_proposed', type: 'text' },
        { name: 'reasons', type: 'json' },
        { name: 'sap_transport_number', type: 'text' },
        { name: 'created_by', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_lp_num ON load_proposals (proposal_number)',
        'CREATE INDEX idx_lp_itin ON load_proposals (itinerary_code)',
        'CREATE INDEX idx_lp_date ON load_proposals (planned_dispatch_date)',
        'CREATE INDEX idx_lp_status ON load_proposals (classification_status)',
        'CREATE INDEX idx_lp_stage ON load_proposals (lifecycle_stage)',
        'CREATE INDEX idx_lp_corr ON load_proposals (correlation_id)',
      ],
    })
    app.save(proposalsCol)

    // 3. load_proposal_items
    const itemsCol = new Collection({
      name: 'load_proposal_items',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'load_proposal_number', type: 'text', required: true },
        { name: 'order_number', type: 'text', required: true },
        { name: 'item_number', type: 'text' },
        { name: 'customer_code', type: 'text' },
        { name: 'customer_name', type: 'text' },
        { name: 'destination_city', type: 'text' },
        { name: 'uf', type: 'text' },
        { name: 'material_code', type: 'text' },
        { name: 'material_description', type: 'text' },
        { name: 'weight_kg', type: 'number' },
        { name: 'order_value', type: 'number' },
        { name: 'desired_date', type: 'date' },
        { name: 'credit_status', type: 'text' },
        { name: 'stock_situation', type: 'text' },
        { name: 'pcp_status', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lpi_prop ON load_proposal_items (load_proposal_number)',
        'CREATE INDEX idx_lpi_ord ON load_proposal_items (order_number)',
        'CREATE INDEX idx_lpi_cust ON load_proposal_items (customer_code)',
      ],
    })
    app.save(itemsCol)

    // 4. load_complement_opportunities
    const oppsCol = new Collection({
      name: 'load_complement_opportunities',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'opportunity_code', type: 'text', required: true },
        { name: 'load_proposal_id', type: 'text', required: true },
        { name: 'itinerary_id', type: 'text', required: true },
        { name: 'planned_dispatch_date', type: 'date', required: true },
        { name: 'vehicle_id', type: 'text' },
        { name: 'vehicle_plate', type: 'text' },
        { name: 'vehicle_type', type: 'text' },
        { name: 'vehicle_capacity_kg', type: 'number', required: true },
        { name: 'current_weight_kg', type: 'number', required: true },
        { name: 'current_occupancy_pct', type: 'number', required: true },
        { name: 'minimum_occupancy_pct', type: 'number', required: true },
        { name: 'maximum_occupancy_pct', type: 'number', required: true },
        { name: 'target_weight_kg', type: 'number', required: true },
        { name: 'missing_weight_kg', type: 'number', required: true },
        { name: 'customer_id', type: 'text' },
        { name: 'customer_name', type: 'text' },
        { name: 'material_id', type: 'text' },
        { name: 'material_description', type: 'text' },
        { name: 'suggested_quantity_kg', type: 'number' },
        { name: 'credit_status', type: 'text' },
        { name: 'stock_status', type: 'text' },
        { name: 'projected_stock_date', type: 'date' },
        { name: 'salesperson_id', type: 'text' },
        {
          name: 'commercial_status',
          type: 'select',
          values: [
            'Nova oportunidade',
            'Em análise comercial',
            'Contato iniciado',
            'Cliente interessado',
            'Aguardando pedido SAP',
            'Pedido criado',
            'Associado à carga',
            'Recusado pelo cliente',
            'Descartado',
            'Expirado',
          ],
          maxSelect: 1,
        },
        { name: 'sap_order_id', type: 'text' },
        {
          name: 'logistic_adherence',
          type: 'select',
          values: ['Alta', 'Média', 'Baixa'],
          maxSelect: 1,
        },
        {
          name: 'commercial_adherence',
          type: 'select',
          values: ['Alta', 'Média', 'Baixa'],
          maxSelect: 1,
        },
        { name: 'adherence_explanation', type: 'text' },
        { name: 'ai_recommendation', type: 'text' },
        { name: 'audit_status', type: 'text' },
        { name: 'created_by', type: 'text' },
        { name: 'deadline_hours', type: 'number' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_lco_code ON load_complement_opportunities (opportunity_code)',
        'CREATE INDEX idx_lco_prop ON load_complement_opportunities (load_proposal_id)',
        'CREATE INDEX idx_lco_itin ON load_complement_opportunities (itinerary_id)',
        'CREATE INDEX idx_lco_status ON load_complement_opportunities (commercial_status)',
        'CREATE INDEX idx_lco_cust ON load_complement_opportunities (customer_id)',
      ],
    })
    app.save(oppsCol)

    // 5. load_complement_candidates
    const candidatesCol = new Collection({
      name: 'load_complement_candidates',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'opportunity_code', type: 'text', required: true },
        { name: 'customer_code', type: 'text', required: true },
        { name: 'customer_name', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'uf', type: 'text' },
        { name: 'itinerary_code', type: 'text' },
        { name: 'credit_status', type: 'text' },
        { name: 'material_code', type: 'text' },
        { name: 'material_description', type: 'text' },
        { name: 'historical_avg_qty_kg', type: 'number' },
        { name: 'last_purchase_date', type: 'date' },
        { name: 'stock_status', type: 'text' },
        { name: 'stock_available_kg', type: 'number' },
        { name: 'projected_availability_date', type: 'date' },
        { name: 'suggested_qty_kg', type: 'number' },
        { name: 'logistic_adherence', type: 'text' },
        { name: 'commercial_adherence', type: 'text' },
        { name: 'ranking_score', type: 'number' },
        { name: 'recommendation_rationale', type: 'text' },
        { name: 'is_exception', type: 'bool' },
        { name: 'exception_reason', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lcc_opp ON load_complement_candidates (opportunity_code)',
        'CREATE INDEX idx_lcc_cust ON load_complement_candidates (customer_code)',
        'CREATE INDEX idx_lcc_rank ON load_complement_candidates (ranking_score)',
      ],
    })
    app.save(candidatesCol)
  },
  (app) => {
    try {
      const c5 = app.findCollectionByNameOrId('load_complement_candidates')
      app.delete(c5)
    } catch (_) {}
    try {
      const c4 = app.findCollectionByNameOrId('load_complement_opportunities')
      app.delete(c4)
    } catch (_) {}
    try {
      const c3 = app.findCollectionByNameOrId('load_proposal_items')
      app.delete(c3)
    } catch (_) {}
    try {
      const c2 = app.findCollectionByNameOrId('load_proposals')
      app.delete(c2)
    } catch (_) {}
    try {
      const c1 = app.findCollectionByNameOrId('load_optimization_runs')
      app.delete(c1)
    } catch (_) {}
  },
)
