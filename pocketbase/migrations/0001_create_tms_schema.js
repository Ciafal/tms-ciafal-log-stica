/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Update users collection with role
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: [
            'admin_master',
            'admin_tms',
            'gestor_logistica',
            'gerente_carga',
            'operador_logistica',
            'portaria',
            'financeiro',
            'comercial',
            'auditor',
          ],
          maxSelect: 1,
        }),
      )
    }
    if (!users.fields.getByName('document')) {
      users.fields.add(new TextField({ name: 'document' }))
    }
    if (!users.fields.getByName('phone')) {
      users.fields.add(new TextField({ name: 'phone' }))
    }
    app.save(users)

    // 2. drivers collection
    const drivers = new Collection({
      name: 'drivers',
      type: 'base',
      listRule: "@request.auth.id != '' || @request.body.document != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'document', type: 'text', required: true },
        { name: 'whatsapp', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'bloqueado', 'pendente_sap'],
          maxSelect: 1,
        },
        { name: 'sap_id', type: 'text' },
        { name: 'rg', type: 'text' },
        { name: 'cnh', type: 'text' },
        { name: 'cnh_category', type: 'text' },
        { name: 'cnh_validity', type: 'text' },
        { name: 'channel_telegram', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_drivers_document ON drivers (document)',
        'CREATE INDEX idx_drivers_status ON drivers (status)',
      ],
    })
    app.save(drivers)

    const driversCol = app.findCollectionByNameOrId('drivers')

    // 3. vehicles collection
    const vehicles = new Collection({
      name: 'vehicles',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'plate', type: 'text', required: true },
        { name: 'type', type: 'text', required: true }, // e.g. Carreta LS, VUC, Toco, Truck, Bitrem, Rodotrem
        { name: 'body_type', type: 'text' }, // Grade Baixa, Sider, Bau, Graneleiro, Prancha
        { name: 'brand_model', type: 'text' },
        { name: 'year', type: 'text' },
        { name: 'capacity_kg', type: 'number' },
        {
          name: 'driver',
          type: 'relation',
          required: false,
          collectionId: driversCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_vehicles_plate ON vehicles (plate)',
        'CREATE INDEX idx_vehicles_driver ON vehicles (driver)',
      ],
    })
    app.save(vehicles)

    const vehiclesCol = app.findCollectionByNameOrId('vehicles')

    // 4. queue_entries collection
    const queueEntries = new Collection({
      name: 'queue_entries',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '', // Public create allowed (subject to hook validation / IP / GPS)
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'driver',
          type: 'relation',
          required: true,
          collectionId: driversCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'vehicle',
          type: 'relation',
          required: false,
          collectionId: vehiclesCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['PORTA', 'FORA'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: [
            'disponivel',
            'validacao',
            'pendente',
            'indisponivel',
            'selecionado',
            'negociacao',
            'atribuido',
            'removido',
            'bloqueado',
          ],
          maxSelect: 1,
        },
        { name: 'entry_time', type: 'date' },
        { name: 'exit_time', type: 'date' },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'distance_km', type: 'number' },
        { name: 'location_status', type: 'text' }, // "validada", "pendente", "fora_raio", "nao_informada"
        { name: 'ip_address', type: 'text' },
        { name: 'driver_name_cached', type: 'text' },
        { name: 'driver_doc_cached', type: 'text' },
        { name: 'driver_whatsapp_cached', type: 'text' },
        { name: 'vehicle_plate_cached', type: 'text' },
        { name: 'vehicle_type_cached', type: 'text' },
        { name: 'reason', type: 'text' },
        { name: 'operator_notes', type: 'text' },
        { name: 'last_event', type: 'text' },
        { name: 'last_operator', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_queue_type_status ON queue_entries (type, status)',
        'CREATE INDEX idx_queue_driver ON queue_entries (driver)',
        'CREATE INDEX idx_queue_status ON queue_entries (status)',
        'CREATE INDEX idx_queue_entry_time ON queue_entries (entry_time DESC)',
      ],
    })
    app.save(queueEntries)

    // 5. pre_registrations collection
    const preRegistrations = new Collection({
      name: 'pre_registrations',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '', // Public form submission allowed
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'document', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'whatsapp', type: 'text', required: true },
        { name: 'vehicle_type', type: 'text' },
        { name: 'plate', type: 'text' },
        {
          name: 'origin',
          type: 'select',
          required: true,
          values: ['PORTA', 'FORA'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'em_analise', 'aprovado', 'rejeitado'],
          maxSelect: 1,
        },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'ip_address', type: 'text' },
        { name: 'reviewer_notes', type: 'text' },
        { name: 'reviewer_user', type: 'text' },
        { name: 'rejection_reason', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_prereg_document ON pre_registrations (document)',
        'CREATE INDEX idx_prereg_status ON pre_registrations (status)',
      ],
    })
    app.save(preRegistrations)

    // 6. audit_logs collection
    const auditLogs = new Collection({
      name: 'audit_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null, // Immutable audit logs!
      deleteRule: null, // Cannot be deleted
      fields: [
        { name: 'user_email', type: 'text' },
        { name: 'user_name', type: 'text' },
        { name: 'user_role', type: 'text' },
        { name: 'action', type: 'text', required: true },
        { name: 'resource', type: 'text', required: true }, // e.g. "queue_entries", "drivers", "sap_import"
        { name: 'resource_id', type: 'text' },
        { name: 'previous_state', type: 'text' },
        { name: 'new_state', type: 'text' },
        { name: 'reason', type: 'text' },
        { name: 'ip_address', type: 'text' },
        { name: 'correlation_id', type: 'text' },
        { name: 'payload', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_audit_resource ON audit_logs (resource, resource_id)',
        'CREATE INDEX idx_audit_created ON audit_logs (created DESC)',
        'CREATE INDEX idx_audit_correlation ON audit_logs (correlation_id)',
      ],
    })
    app.save(auditLogs)

    // 7. whitelist_ips collection
    const whitelistIps = new Collection({
      name: 'whitelist_ips',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'ip', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'is_active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_whitelist_ip ON whitelist_ips (ip)'],
    })
    app.save(whitelistIps)

    // 8. system_parameters collection
    const systemParams = new Collection({
      name: 'system_parameters',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_system_params_key ON system_parameters (key)'],
    })
    app.save(systemParams)

    // 9. sap_imports collection
    const sapImports = new Collection({
      name: 'sap_imports',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'file_name', type: 'text', required: true },
        { name: 'imported_by', type: 'text', required: true },
        { name: 'total_read', type: 'number' },
        { name: 'created_count', type: 'number' },
        { name: 'updated_count', type: 'number' },
        { name: 'ignored_count', type: 'number' },
        { name: 'rejected_count', type: 'number' },
        { name: 'rejections_log', type: 'json' },
        {
          name: 'status',
          type: 'select',
          values: ['concluido', 'concluido_com_erros', 'falha'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(sapImports)
  },
  (app) => {
    const toDelete = [
      'sap_imports',
      'system_parameters',
      'whitelist_ips',
      'audit_logs',
      'pre_registrations',
      'queue_entries',
      'vehicles',
      'drivers',
    ]
    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
