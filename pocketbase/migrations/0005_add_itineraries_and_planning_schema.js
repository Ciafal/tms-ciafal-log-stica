migrate(
  (app) => {
    // 1. Create sap_itineraries collection (Itinerários SAP - fonte TVROT)
    try {
      app.findCollectionByNameOrId('sap_itineraries')
    } catch (_) {
      const sapItineraries = new Collection({
        name: 'sap_itineraries',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'sap_code', type: 'text', required: true },
          { name: 'description', type: 'text', required: true },
          { name: 'origin', type: 'text' },
          { name: 'uf', type: 'text' },
          { name: 'region', type: 'text' },
          { name: 'avg_transit_days', type: 'number' },
          { name: 'is_active', type: 'bool' },
          { name: 'last_sync_date', type: 'date' },
          { name: 'operational_notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_itineraries_sap_code ON sap_itineraries (sap_code)',
          'CREATE INDEX idx_itineraries_active ON sap_itineraries (is_active)',
        ],
      })
      app.save(sapItineraries)
    }

    // 2. Create oportunidade_complemento_carga collection
    try {
      app.findCollectionByNameOrId('oportunidade_complemento_carga')
    } catch (_) {
      const oppCol = new Collection({
        name: 'oportunidade_complemento_carga',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'date', type: 'date', required: true },
          { name: 'cargo_code', type: 'text', required: true },
          { name: 'itinerary_code', type: 'text', required: true },
          { name: 'current_weight_kg', type: 'number', required: true },
          { name: 'capacity_kg', type: 'number', required: true },
          { name: 'balance_kg', type: 'number', required: true },
          { name: 'candidate_orders', type: 'json' },
          { name: 'candidate_clients', type: 'json' },
          {
            name: 'status',
            type: 'select',
            values: [
              'Nova',
              'Enviada CRM',
              'Em análise',
              'Aproveitada',
              'Sem interesse',
              'Expirada',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'responsible', type: 'text' },
          { name: 'origin', type: 'text' },
          { name: 'enviado_crm', type: 'bool' },
          { name: 'data_envio', type: 'date' },
          { name: 'correlation_id', type: 'text' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_opp_status ON oportunidade_complemento_carga (status)',
          'CREATE INDEX idx_opp_itinerary ON oportunidade_complemento_carga (itinerary_code)',
          'CREATE INDEX idx_opp_date ON oportunidade_complemento_carga (date)',
        ],
      })
      app.save(oppCol)
    }

    // 3. Create sap_sales_orders collection (Carteira SAP ZSD35 / Pedidos)
    try {
      app.findCollectionByNameOrId('sap_sales_orders')
    } catch (_) {
      const ordersCol = new Collection({
        name: 'sap_sales_orders',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'order_number', type: 'text', required: true },
          { name: 'customer_code', type: 'text', required: true },
          { name: 'customer_name', type: 'text', required: true },
          { name: 'destination_city', type: 'text', required: true },
          { name: 'uf', type: 'text', required: true },
          { name: 'itinerary_code', type: 'text', required: true },
          { name: 'weight_kg', type: 'number', required: true },
          { name: 'volume_m3', type: 'number' },
          { name: 'total_value', type: 'number', required: true },
          { name: 'line', type: 'text' },
          { name: 'family', type: 'text' },
          { name: 'material', type: 'text' },
          {
            name: 'production_status',
            type: 'select',
            values: ['Pronto', 'Em Produção', 'Programado', 'Aguardando PCP'],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'credit_status',
            type: 'select',
            values: ['Liberado', 'Bloqueado', 'Em Análise'],
            maxSelect: 1,
            required: true,
          },
          { name: 'discharge_type', type: 'text' }, // Ex: Munck, Ponte Rolante, Traseira, Lateral
          { name: 'required_vehicle_type', type: 'text' },
          { name: 'sap_notes', type: 'text' }, // Informative text from STXH/STXL
          { name: 'scheduled_delivery_date', type: 'date' },
          { name: 'assigned_load_id', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['disponivel', 'em_montagem', 'carregado', 'cancelado'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_sales_order_number ON sap_sales_orders (order_number)',
          'CREATE INDEX idx_sales_order_itinerary ON sap_sales_orders (itinerary_code)',
          'CREATE INDEX idx_sales_order_status ON sap_sales_orders (status)',
        ],
      })
      app.save(ordersCol)
    }

    // 4. Update queue_entries to support PROGRAMADO, preferred_itinerary, scheduled_date, calculated_logistics_date
    try {
      const queueCol = app.findCollectionByNameOrId('queue_entries')
      const typeField = queueCol.fields.getByName('type')
      if (typeField) {
        typeField.values = ['PORTA', 'FORA', 'PROGRAMADO']
      }
      if (!queueCol.fields.getByName('preferred_itinerary')) {
        queueCol.fields.add(new TextField({ name: 'preferred_itinerary' }))
      }
      if (!queueCol.fields.getByName('scheduled_arrival_date')) {
        queueCol.fields.add(new DateField({ name: 'scheduled_arrival_date' }))
      }
      if (!queueCol.fields.getByName('calculated_logistics_date')) {
        queueCol.fields.add(new DateField({ name: 'calculated_logistics_date' }))
      }
      if (!queueCol.fields.getByName('driver_notes')) {
        queueCol.fields.add(new TextField({ name: 'driver_notes' }))
      }
      app.save(queueCol)
    } catch (err) {
      console.log('Error updating queue_entries:', err)
    }

    // 5. Update pre_registrations to support PROGRAMADO, preferred_itinerary, scheduled_date
    try {
      const preCol = app.findCollectionByNameOrId('pre_registrations')
      const originField = preCol.fields.getByName('origin')
      if (originField) {
        originField.values = ['PORTA', 'FORA', 'PROGRAMADO']
      }
      if (!preCol.fields.getByName('preferred_itinerary')) {
        preCol.fields.add(new TextField({ name: 'preferred_itinerary' }))
      }
      if (!preCol.fields.getByName('scheduled_arrival_date')) {
        preCol.fields.add(new DateField({ name: 'scheduled_arrival_date' }))
      }
      if (!preCol.fields.getByName('email')) {
        preCol.fields.add(new EmailField({ name: 'email' }))
      }
      if (!preCol.fields.getByName('carrier_name')) {
        preCol.fields.add(new TextField({ name: 'carrier_name' }))
      }
      if (!preCol.fields.getByName('declared_capacity_kg')) {
        preCol.fields.add(new NumberField({ name: 'declared_capacity_kg' }))
      }
      if (!preCol.fields.getByName('driver_notes')) {
        preCol.fields.add(new TextField({ name: 'driver_notes' }))
      }
      app.save(preCol)
    } catch (err) {
      console.log('Error updating pre_registrations:', err)
    }
  },
  (app) => {
    try {
      const opp = app.findCollectionByNameOrId('oportunidade_complemento_carga')
      app.delete(opp)
    } catch (_) {}
    try {
      const orders = app.findCollectionByNameOrId('sap_sales_orders')
      app.delete(orders)
    } catch (_) {}
    try {
      const itin = app.findCollectionByNameOrId('sap_itineraries')
      app.delete(itin)
    } catch (_) {}
  },
)
