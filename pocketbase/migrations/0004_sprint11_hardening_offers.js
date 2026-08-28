/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Update pre_registrations status select values to include all Kanban stages
    try {
      const preRegCol = app.findCollectionByNameOrId('pre_registrations')
      const statusField = preRegCol.fields.getByName('status')
      if (statusField) {
        preRegCol.fields.removeByName('status')
      }
      preRegCol.fields.add(
        new SelectField({
          name: 'status',
          required: true,
          values: [
            'novo',
            'em_analise',
            'contato_realizado',
            'aguardando_doc',
            'encaminhado_sap',
            'cadastro_confirmado',
            'rejeitado',
            // legacy compatibility
            'pendente',
            'aprovado',
          ],
          maxSelect: 1,
        }),
      )
      app.save(preRegCol)
    } catch (e) {
      console.log('Error updating pre_registrations status values:', e)
    }

    // 2. Add extra system_parameters defaults if not present
    const defaultParams = [
      {
        key: 'GEO_ACCURACY_TOLERANCE_METERS',
        value: '150',
        description: 'Tolerância técnica máxima de precisão GPS (accuracy) em metros',
      },
      {
        key: 'MAX_HOURS_FORA_AVAILABILITY',
        value: '24',
        description: 'Tempo máximo de disponibilidade FORA em horas antes da expiração automática',
      },
      {
        key: 'MAX_HOURS_UNCONFIRMED_STAY',
        value: '12',
        description: 'Tempo máximo de permanência sem confirmação em horas',
      },
      {
        key: 'SYSTEM_TIMEZONE',
        value: 'America/Sao_Paulo',
        description: 'Fuso horário operacional de referência da planta CIAFAL',
      },
      {
        key: 'ALLOWLIST_ENFORCEMENT',
        value: 'STRICT_FAIL_CLOSED',
        description: 'Modo de aplicação da Allowlist do Totem (STRICT_FAIL_CLOSED | PERMISSIVE)',
      },
    ]

    for (let p of defaultParams) {
      try {
        app.findFirstRecordByData('system_parameters', 'key', p.key)
      } catch (_) {
        try {
          const sysParamsCol = app.findCollectionByNameOrId('system_parameters')
          const rec = new Record(sysParamsCol)
          rec.set('key', p.key)
          rec.set('value', p.value)
          rec.set('description', p.description)
          app.save(rec)
        } catch (err) {
          console.log('Error inserting parameter ' + p.key, err)
        }
      }
    }

    // 3. Create freight_offers collection (Sprint 1.1 preparation, Sprint 2 ready)
    try {
      app.findCollectionByNameOrId('freight_offers')
    } catch (_) {
      const driversCol = app.findCollectionByNameOrId('drivers')
      const vehiclesCol = app.findCollectionByNameOrId('vehicles')

      const freightOffers = new Collection({
        name: 'freight_offers',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'cargo_id', type: 'text', required: true },
          { name: 'cargo_description', type: 'text' },
          { name: 'origin', type: 'text' },
          { name: 'destination', type: 'text' },
          { name: 'weight_kg', type: 'number' },
          { name: 'required_vehicle_type', type: 'text' },
          { name: 'opened_at', type: 'date' },
          {
            name: 'current_group',
            type: 'select',
            required: true,
            values: ['PORTA', 'FORA', 'PUBLICO', 'ENCERRADO'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'rascunho',
              'janela_porta_aberta',
              'janela_fora_aberta',
              'negociacao',
              'atribuido',
              'expirado',
              'cancelado',
            ],
            maxSelect: 1,
          },
          { name: 'window_start', type: 'date' },
          { name: 'window_end', type: 'date' },
          { name: 'floor_value', type: 'number' }, // Piso do frete
          { name: 'ceiling_value_protected', type: 'number' }, // TETO PROTEGIDO - NUNCA exposto ao motorista ou LLM
          {
            name: 'winner_driver',
            type: 'relation',
            collectionId: driversCol.id,
            maxSelect: 1,
          },
          {
            name: 'winner_vehicle',
            type: 'relation',
            collectionId: vehiclesCol.id,
            maxSelect: 1,
          },
          { name: 'closing_reason', type: 'text' },
          { name: 'correlation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_freight_cargo ON freight_offers (cargo_id)',
          'CREATE INDEX idx_freight_status ON freight_offers (status)',
          'CREATE INDEX idx_freight_group ON freight_offers (current_group)',
        ],
      })
      app.save(freightOffers)
    }
  },
  (app) => {
    try {
      const freightOffers = app.findCollectionByNameOrId('freight_offers')
      app.delete(freightOffers)
    } catch (_) {}
  },
)
