/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Criar collection sap_zsd004_vehicles_drivers
    const zsd004Col = new Collection({
      name: 'sap_zsd004_vehicles_drivers',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'technical_key', type: 'text', required: true },
        { name: 'plant', type: 'text' },
        { name: 'plate', type: 'text', required: true },
        { name: 'vehicle_brand_model', type: 'text' },
        { name: 'vehicle_model', type: 'text' },
        { name: 'vehicle_color', type: 'text' },
        { name: 'vehicle_chassis', type: 'text' },
        { name: 'vehicle_city', type: 'text' },
        { name: 'vehicle_region', type: 'text' },
        { name: 'vehicle_renavam', type: 'text' },
        { name: 'vehicle_year_fab', type: 'text' },
        { name: 'vehicle_year_model', type: 'text' },
        { name: 'vehicle_antt', type: 'text' },

        { name: 'trailer_plate', type: 'text' },
        { name: 'trailer_antt', type: 'text' },
        { name: 'trailer_region', type: 'text' },

        { name: 'driver_name', type: 'text' },
        { name: 'driver_ddd_phone', type: 'text' },
        { name: 'driver_phone', type: 'text' },
        { name: 'driver_document', type: 'text' },
        { name: 'driver_issuer_org', type: 'text' },
        { name: 'driver_issuer_state', type: 'text' },
        { name: 'driver_cnh', type: 'text' },
        { name: 'driver_street', type: 'text' },
        { name: 'driver_number', type: 'text' },
        { name: 'driver_complement', type: 'text' },
        { name: 'driver_district', type: 'text' },
        { name: 'driver_mobile', type: 'text' },
        { name: 'driver_email', type: 'text' },
        { name: 'driver_birth_date', type: 'text' },
        { name: 'driver_marital_status', type: 'text' },
        { name: 'driver_cnh_expiration', type: 'text' },
        { name: 'driver_dependents', type: 'text' },
        { name: 'driver_nationality', type: 'text' },
        { name: 'driver_country_key', type: 'text' },
        { name: 'driver_cpf', type: 'text' },
        { name: 'driver_zipcode', type: 'text' },
        { name: 'driver_inss_registry', type: 'text' },
        { name: 'driver_autonomous_category', type: 'text' },
        { name: 'driver_autonomous_cbo', type: 'text' },

        { name: 'owner_type', type: 'text' },
        { name: 'owner_name', type: 'text' },
        { name: 'owner_document', type: 'text' },
        { name: 'owner_phone', type: 'text' },
        { name: 'owner_cei', type: 'text' },
        { name: 'owner_state_registration', type: 'text' },
        { name: 'owner_municipal_registration', type: 'text' },
        { name: 'owner_cnpj', type: 'text' },
        { name: 'owner_zipcode', type: 'text' },
        { name: 'owner_street', type: 'text' },
        { name: 'owner_number', type: 'text' },
        { name: 'owner_complement', type: 'text' },
        { name: 'owner_district', type: 'text' },
        { name: 'owner_city', type: 'text' },

        { name: 'last_freight_date', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['A', 'B', 'NAO_INFORMADO'],
          maxSelect: 1,
        },
        { name: 'block_reason', type: 'text' },
        { name: 'totvs_code', type: 'text' },

        { name: 'vehicle_type', type: 'text' },
        { name: 'wheel_type', type: 'text' },
        { name: 'body_type', type: 'text' },
        { name: 'tare_kg', type: 'number' },
        { name: 'capacity_kg', type: 'number' },
        { name: 'capacity_m3', type: 'number' },
        { name: 'supplier_code', type: 'text' },
        { name: 'axles_count', type: 'number' },

        { name: 'reconciliation_account', type: 'text' },
        { name: 'irrf_fleet', type: 'text' },
        { name: 'sest_entry', type: 'text' },
        { name: 'senat_entry', type: 'text' },
        { name: 'inss_entry', type: 'text' },
        { name: 'treasury_admin_group', type: 'text' },

        { name: 'aux_plate_1', type: 'text' },
        { name: 'aux_antt_1', type: 'text' },
        { name: 'aux_plate_2', type: 'text' },
        { name: 'aux_antt_2', type: 'text' },

        { name: 'cnh_attached', type: 'bool' },
        { name: 'vehicle_doc_attached', type: 'bool' },
        { name: 'contract_attached', type: 'bool' },

        {
          name: 'integrity_status',
          type: 'select',
          values: ['integro', 'incompleto', 'inconsistente'],
          maxSelect: 1,
        },
        { name: 'validation_issues', type: 'json' },
        { name: 'raw_source_values', type: 'json' },
        {
          name: 'source_mode',
          type: 'select',
          values: ['MHTML_TEMP', 'SAP_RFC'],
          maxSelect: 1,
        },
        { name: 'source_file', type: 'text' },
        { name: 'last_sync_date', type: 'date' },

        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_zsd004_tech_key ON sap_zsd004_vehicles_drivers (technical_key)',
        'CREATE INDEX idx_zsd004_plate ON sap_zsd004_vehicles_drivers (plate)',
        'CREATE INDEX idx_zsd004_status ON sap_zsd004_vehicles_drivers (status)',
        'CREATE INDEX idx_zsd004_driver_cpf ON sap_zsd004_vehicles_drivers (driver_cpf)',
        'CREATE INDEX idx_zsd004_owner_cnpj ON sap_zsd004_vehicles_drivers (owner_cnpj)',
        'CREATE INDEX idx_zsd004_plant ON sap_zsd004_vehicles_drivers (plant)',
        'CREATE INDEX idx_zsd004_integrity ON sap_zsd004_vehicles_drivers (integrity_status)',
      ],
    })
    app.save(zsd004Col)

    // 2. Parâmetros de Sistema para ZSD004
    const sysCol = app.findCollectionByNameOrId('system_parameters')
    const zsd004Params = [
      {
        key: 'ACTIVE_ZSD004_SOURCE',
        value: 'MHTML_TEMP',
        description: 'Fonte Ativa de Motoristas & Veículos ZSD004 (MHTML_TEMP | SAP_RFC)',
      },
      {
        key: 'ACTIVE_ZSD004_NAME',
        value: 'Snapshot Homologação MHTML (ZSD004.xlxs.MHTML - WSTL)',
        description: 'Nome legível da fonte de cadastro de veículos/motoristas ativa.',
      },
      {
        key: 'ZSD004_LAST_SYNC',
        value: new Date().toISOString(),
        description: 'Timestamp da última sincronização bem-sucedida da ZSD004.',
      },
      {
        key: 'ZSD004_RFC_FUNCTION',
        value: 'ZSD004_GET_VEHICLES_DRIVERS',
        description: 'Função RFC SAP para cadastro de motoristas e veículos.',
      },
      {
        key: 'ZSD004_PLANT_FILTER',
        value: 'WSTL',
        description: 'Centro/Empresa padrão para filtragem da tabela ZSD004.',
      },
    ]

    for (const p of zsd004Params) {
      try {
        const existing = app.findFirstRecordByData('system_parameters', 'key', p.key)
        if (existing) {
          existing.set('value', p.value)
          existing.set('description', p.description)
          app.save(existing)
        }
      } catch (_) {
        const record = new Record(sysCol)
        record.set('key', p.key)
        record.set('value', p.value)
        record.set('description', p.description)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('sap_zsd004_vehicles_drivers')
      app.delete(col)
    } catch (_) {}
  },
)
