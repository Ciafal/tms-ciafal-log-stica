migrate(
  (app) => {
    // 1. Update freight_offers collection fields if needed
    const offersCol = app.findCollectionByNameOrId('freight_offers')

    // Add rules_version if not present
    if (!offersCol.fields.getByName('rules_version')) {
      offersCol.fields.add(new TextField({ name: 'rules_version' }))
    }
    // Add contracted_value if not present
    if (!offersCol.fields.getByName('contracted_value')) {
      offersCol.fields.add(new NumberField({ name: 'contracted_value' }))
    }
    // Add sap_integration_status if not present (e.g. 'nao_iniciado', 'aguardando_sap', 'sincronizado_sap', 'falha')
    if (!offersCol.fields.getByName('sap_integration_status')) {
      offersCol.fields.add(new TextField({ name: 'sap_integration_status' }))
    }

    // Make sure ceiling_value_protected is hidden or protected in API
    const ceilingField = offersCol.fields.getByName('ceiling_value_protected')
    if (ceilingField) {
      ceilingField.hidden = true
    }

    // Adjust freight_offers access rules so anyone can view public offers but ceiling is protected
    offersCol.listRule = "@request.auth.id != '' || @request.query.public = 'true'"
    offersCol.viewRule = "@request.auth.id != '' || @request.query.public = 'true'"
    offersCol.createRule = "@request.auth.id != ''"
    offersCol.updateRule = "@request.auth.id != ''"
    app.save(offersCol)

    // 2. Create freight_proposals collection
    try {
      app.findCollectionByNameOrId('freight_proposals')
    } catch (_) {
      const driversCol = app.findCollectionByNameOrId('drivers')
      const proposalsCol = new Collection({
        name: 'freight_proposals',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.query.public = 'true'",
        viewRule: "@request.auth.id != '' || @request.query.public = 'true'",
        createRule: '', // Public drivers can submit proposals
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'offer_id',
            type: 'relation',
            required: true,
            collectionId: offersCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'driver_id',
            type: 'relation',
            required: true,
            collectionId: driversCol.id,
            maxSelect: 1,
          },
          { name: 'value', type: 'number', required: true },
          { name: 'arrival_time', type: 'text' }, // e.g. "45 min" ou "14:30"
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['VALID', 'REJECTED', 'WINNER'],
            maxSelect: 1,
          },
          { name: 'reason', type: 'text' }, // Motivo de recusa se REJECTED
          { name: 'driver_name_cached', type: 'text' },
          { name: 'driver_doc_cached', type: 'text' },
          { name: 'driver_phone_cached', type: 'text' },
          { name: 'vehicle_plate_cached', type: 'text' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_proposals_offer ON freight_proposals (offer_id)',
          'CREATE INDEX idx_proposals_driver ON freight_proposals (driver_id)',
          'CREATE INDEX idx_proposals_status ON freight_proposals (status)',
          'CREATE INDEX idx_proposals_created ON freight_proposals (created)',
        ],
      })
      app.save(proposalsCol)
    }

    // 3. Seed plant_parameters / system_parameters for Sprint 2 auction windows
    const sysCol = app.findCollectionByNameOrId('system_parameters')
    const paramsToEnsure = [
      {
        key: 'janela_porta_min',
        value: '15',
        description: 'Tempo de duração da janela exclusiva PORTA em minutos',
      },
      {
        key: 'janela_fora_min',
        value: '15',
        description: 'Tempo de duração da janela de leilão FORA em minutos',
      },
      {
        key: 'RATE_LIMIT_PROPOSALS_PER_MIN',
        value: '10',
        description: 'Limite de envio de propostas por IP/motorista por minuto',
      },
    ]

    for (const p of paramsToEnsure) {
      try {
        app.findFirstRecordByData('system_parameters', 'key', p.key)
      } catch (_) {
        const rec = new Record(sysCol)
        rec.set('key', p.key)
        rec.set('value', p.value)
        rec.set('description', p.description)
        app.save(rec)
      }
    }

    // 4. Seed sample initial freight offers for testing and operational demo
    const sampleOffers = [
      {
        cargo_id: 'CARGA-MG-8801',
        cargo_description: 'Vigas W e Tubos Estruturais (23.5t)',
        origin: 'Planta Central CIAFAL (Matriz)',
        destination: 'Contagem / Belo Horizonte - MG (Itinerário MG001A)',
        weight_kg: 23500,
        required_vehicle_type: 'Carreta Grade Baixa',
        status: 'janela_porta_aberta',
        current_group: 'PORTA',
        floor_value: 3800,
        ceiling_value_protected: 4400,
        rules_version: '2.0.0-LEILAO-DETERMINISTICO',
        correlation_id: 'OFR-2026-8801',
        sap_integration_status: 'nao_iniciado',
      },
      {
        cargo_id: 'CARGA-SP-8802',
        cargo_description: 'Perfis e Cantoneiras Laminadas (26.0t)',
        origin: 'Planta Central CIAFAL (Matriz)',
        destination: 'Campinas / Paulínia - SP (Itinerário SP002B)',
        weight_kg: 26000,
        required_vehicle_type: 'Carreta LS',
        status: 'rascunho',
        current_group: 'PORTA',
        floor_value: 2900,
        ceiling_value_protected: 3500,
        rules_version: '2.0.0-LEILAO-DETERMINISTICO',
        correlation_id: 'OFR-2026-8802',
        sap_integration_status: 'nao_iniciado',
      },
      {
        cargo_id: 'CARGA-MG-8803',
        cargo_description: 'Chapas Grossas ASTM A36 (27.0t)',
        origin: 'Planta Central CIAFAL (Matriz)',
        destination: 'Uberlândia / Araguari - MG (Itinerário MG002B)',
        weight_kg: 27000,
        required_vehicle_type: 'Bitrem',
        status: 'janela_fora_aberta',
        current_group: 'FORA',
        floor_value: 5200,
        ceiling_value_protected: 6100,
        rules_version: '2.0.0-LEILAO-DETERMINISTICO',
        correlation_id: 'OFR-2026-8803',
        sap_integration_status: 'nao_iniciado',
      },
    ]

    for (const offerData of sampleOffers) {
      try {
        app.findFirstRecordByData('freight_offers', 'cargo_id', offerData.cargo_id)
      } catch (_) {
        const now = new Date()
        const end = new Date(now.getTime() + 15 * 60 * 1000)
        const rec = new Record(offersCol)
        rec.set('cargo_id', offerData.cargo_id)
        rec.set('cargo_description', offerData.cargo_description)
        rec.set('origin', offerData.origin)
        rec.set('destination', offerData.destination)
        rec.set('weight_kg', offerData.weight_kg)
        rec.set('required_vehicle_type', offerData.required_vehicle_type)
        rec.set('status', offerData.status)
        rec.set('current_group', offerData.current_group)
        rec.set('opened_at', now.toISOString())
        rec.set('window_start', now.toISOString())
        rec.set('window_end', end.toISOString())
        rec.set('floor_value', offerData.floor_value)
        rec.set('ceiling_value_protected', offerData.ceiling_value_protected)
        rec.set('rules_version', offerData.rules_version)
        rec.set('correlation_id', offerData.correlation_id)
        rec.set('sap_integration_status', offerData.sap_integration_status)
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      const proposalsCol = app.findCollectionByNameOrId('freight_proposals')
      app.delete(proposalsCol)
    } catch (_) {}
  },
)
