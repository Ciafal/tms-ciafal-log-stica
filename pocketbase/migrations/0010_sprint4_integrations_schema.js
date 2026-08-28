migrate(
  (app) => {
    // 1. Tabela para logs detalhados de chamadas de integração
    const integrationLogs = new Collection({
      name: 'integration_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'integration_id', type: 'text', required: true },
        { name: 'correlation_id', type: 'text', required: true },
        { name: 'idempotency_key', type: 'text' },
        {
          name: 'direction',
          type: 'select',
          values: ['INBOUND', 'OUTBOUND'],
          required: true,
          maxSelect: 1,
        },
        { name: 'endpoint_or_rfc', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['SUCCESS', 'ERROR', 'PENDING', 'RETRYING'],
          required: true,
          maxSelect: 1,
        },
        { name: 'http_or_sap_code', type: 'text' },
        { name: 'payload_masked', type: 'json' },
        { name: 'error_message', type: 'text' },
        { name: 'latency_ms', type: 'number' },
        {
          name: 'environment',
          type: 'select',
          values: ['DEV', 'HOMOLOGACAO', 'PRODUCAO'],
          required: true,
          maxSelect: 1,
        },
        { name: 'user_email', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_intlogs_corr ON integration_logs (correlation_id)',
        'CREATE INDEX idx_intlogs_id_status ON integration_logs (integration_id, status)',
      ],
    })
    app.save(integrationLogs)

    // 2. Tabela para Blueprint SAP/TMS
    const sapBlueprint = new Collection({
      name: 'sap_blueprint_mappings',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        { name: 'process_name', type: 'text', required: true },
        { name: 'origin_system', type: 'text', required: true },
        { name: 'sap_object', type: 'text', required: true },
        {
          name: 'integration_type',
          type: 'select',
          values: ['RFC', 'BAPI', 'IDOC', 'tRFC', 'qRFC'],
          required: true,
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: [
            'Confirmado',
            'A confirmar',
            'Não existe standard',
            'Será Z',
            'Em desenvolvimento',
            'Homologado',
          ],
          required: true,
          maxSelect: 1,
        },
        { name: 'tms_field', type: 'text', required: true },
        { name: 'sap_field', type: 'text', required: true },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_sap_blueprint_proc ON sap_blueprint_mappings (process_name, status)',
      ],
    })
    app.save(sapBlueprint)

    // 3. Tabela de Cache de Geocodificação Versionada
    const geocodingCacheCol = new Collection({
      name: 'geocoding_cache',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'address_hash', type: 'text', required: true },
        { name: 'raw_address', type: 'text', required: true },
        { name: 'city', type: 'text', required: true },
        { name: 'uf', type: 'text', required: true },
        { name: 'latitude', type: 'number', required: true },
        { name: 'longitude', type: 'number', required: true },
        {
          name: 'precision',
          type: 'select',
          values: ['ROOFTOP', 'INTERPOLATED', 'GEOMETRIC_CENTER', 'APPROXIMATE', 'FAILED'],
          required: true,
          maxSelect: 1,
        },
        { name: 'confidence_pct', type: 'number' },
        { name: 'provider_used', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['VALIDADO', 'ENDERECO_REQUER_VALIDACAO', 'FALHA_GEOCODING'],
          required: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_geocache_hash ON geocoding_cache (address_hash)'],
    })
    app.save(geocodingCacheCol)
  },
  (app) => {
    try {
      const l = app.findCollectionByNameOrId('integration_logs')
      app.delete(l)
    } catch (_) {}
    try {
      const b = app.findCollectionByNameOrId('sap_blueprint_mappings')
      app.delete(b)
    } catch (_) {}
    try {
      const g = app.findCollectionByNameOrId('geocoding_cache')
      app.delete(g)
    } catch (_) {}
  },
)
