migrate(
  (app) => {
    // 1. Create sap_routes collection (Rotas SAP - TVRO)
    let routesCol
    try {
      routesCol = app.findCollectionByNameOrId('sap_routes')
    } catch (_) {
      routesCol = new Collection({
        name: 'sap_routes',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'sap_route_code', type: 'text', required: true },
          { name: 'description', type: 'text', required: true },
          { name: 'origin', type: 'text' },
          { name: 'destination', type: 'text' },
          { name: 'uf', type: 'text' },
          { name: 'region', type: 'text' },
          { name: 'lead_time_days', type: 'number' },
          { name: 'status_sap', type: 'text' }, // ATIVO | INATIVO
          { name: 'status_tms', type: 'text' }, // ATIVO | INATIVO | EM_ANALISE
          { name: 'is_active', type: 'bool' },
          { name: 'last_sync_date', type: 'date' },
          { name: 'operational_notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_routes_sap_code ON sap_routes (sap_route_code)',
          'CREATE INDEX idx_routes_active ON sap_routes (is_active)',
          'CREATE INDEX idx_routes_uf ON sap_routes (uf)',
        ],
      })
      app.save(routesCol)
    }

    // 2. Create sap_itinerary_routes collection (Combinações Itinerário x Rota SAP)
    try {
      app.findCollectionByNameOrId('sap_itinerary_routes')
    } catch (_) {
      const itinCol = app.findCollectionByNameOrId('sap_itineraries')
      const targetRoutesCol = app.findCollectionByNameOrId('sap_routes')

      const comboCol = new Collection({
        name: 'sap_itinerary_routes',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'technical_key', type: 'text', required: true }, // ex: AL001C_ROT-AL-01
          { name: 'itinerary_sap_code', type: 'text', required: true },
          { name: 'itinerary_description', type: 'text' },
          { name: 'itinerary_id', type: 'relation', collectionId: itinCol.id, maxSelect: 1 },
          { name: 'route_sap_code', type: 'text', required: true },
          { name: 'route_description', type: 'text' },
          { name: 'route_id', type: 'relation', collectionId: targetRoutesCol.id, maxSelect: 1 },
          { name: 'uf', type: 'text' },
          { name: 'region', type: 'text' },
          { name: 'origin', type: 'text' },
          { name: 'destination', type: 'text' },
          { name: 'lead_time_days', type: 'number' },
          { name: 'status_sap', type: 'text' }, // ATIVO | INATIVO
          { name: 'status_tms', type: 'text' }, // ATIVO | INATIVO | EM_REVISAO
          { name: 'is_active', type: 'bool' },
          { name: 'last_sync_date', type: 'date' },
          { name: 'operational_notes', type: 'text' },
          { name: 'calculated_lead_time_days', type: 'number' },
          { name: 'logistics_priority', type: 'text' },
          { name: 'discharge_restrictions', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_itin_route_tech_key ON sap_itinerary_routes (technical_key)',
          'CREATE INDEX idx_itin_route_itin ON sap_itinerary_routes (itinerary_sap_code)',
          'CREATE INDEX idx_itin_route_route ON sap_itinerary_routes (route_sap_code)',
          'CREATE INDEX idx_itin_route_active ON sap_itinerary_routes (is_active)',
        ],
      })
      app.save(comboCol)
    }

    // 3. Create sap_route_sync_logs collection (Auditoria de sincronização SAP)
    try {
      app.findCollectionByNameOrId('sap_route_sync_logs')
    } catch (_) {
      const syncLogsCol = new Collection({
        name: 'sap_route_sync_logs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'sync_timestamp', type: 'date', required: true },
          { name: 'user_email', type: 'text' },
          { name: 'user_name', type: 'text' },
          { name: 'source_sap', type: 'text' }, // RFC_READ_TABLE_TVRO / ECC 6.0
          { name: 'itineraries_processed', type: 'number' },
          { name: 'routes_processed', type: 'number' },
          { name: 'combinations_processed', type: 'number' },
          { name: 'insertions_count', type: 'number' },
          { name: 'updates_count', type: 'number' },
          { name: 'deactivations_count', type: 'number' },
          { name: 'errors_count', type: 'number' },
          { name: 'status', type: 'text' }, // SUCESSO | SUCESSO_PARCIAL | ERRO
          { name: 'details_json', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_routesync_date ON sap_route_sync_logs (sync_timestamp)',
          'CREATE INDEX idx_routesync_status ON sap_route_sync_logs (status)',
        ],
      })
      app.save(syncLogsCol)
    }
  },
  (app) => {
    try {
      const syncLogsCol = app.findCollectionByNameOrId('sap_route_sync_logs')
      app.delete(syncLogsCol)
    } catch (_) {}
    try {
      const comboCol = app.findCollectionByNameOrId('sap_itinerary_routes')
      app.delete(comboCol)
    } catch (_) {}
    try {
      const routesCol = app.findCollectionByNameOrId('sap_routes')
      app.delete(routesCol)
    } catch (_) {}
  },
)
