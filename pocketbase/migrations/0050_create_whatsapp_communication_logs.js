migrate(
  (app) => {
    // Criação da coleção de logs de comunicação do WhatsApp Gateway
    try {
      app.findCollectionByNameOrId('whatsapp_communication_logs')
      return // já existe
    } catch (_) {}

    const collection = new Collection({
      name: 'whatsapp_communication_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'timestamp', type: 'date', required: false },
        { name: 'driver_id', type: 'text', required: false },
        { name: 'driver_name', type: 'text', required: false },
        { name: 'phone_number', type: 'text', required: false },
        {
          name: 'direction',
          type: 'select',
          values: ['OUTBOUND', 'INBOUND'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'message_type',
          type: 'select',
          values: ['TEXT', 'OFFER', 'AUDIO', 'IMAGE', 'DOCUMENT', 'LOCATION', 'DECISION'],
          maxSelect: 1,
          required: true,
        },
        { name: 'content', type: 'text', required: false },
        {
          name: 'agent_sender',
          type: 'select',
          values: ['CARLAO', 'FRED', 'CHICAO', 'HUMANO', 'MOTORISTA'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          values: ['PREPARADO', 'ENVIADO', 'ENTREGUE', 'LIDO', 'RESPONDIDO', 'ERRO'],
          maxSelect: 1,
          required: true,
        },
        { name: 'external_id', type: 'text', required: false },
        { name: 'cargo_id', type: 'text', required: false },
        { name: 'transport_id', type: 'text', required: false },
        { name: 'negotiation_id', type: 'text', required: false },
        { name: 'error_details', type: 'text', required: false },
        { name: 'payload_json', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_wa_comm_driver ON whatsapp_communication_logs (driver_id)',
        'CREATE INDEX idx_wa_comm_cargo ON whatsapp_communication_logs (cargo_id)',
        'CREATE INDEX idx_wa_comm_status ON whatsapp_communication_logs (status)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('whatsapp_communication_logs')
      app.delete(col)
    } catch (_) {}
  },
)
