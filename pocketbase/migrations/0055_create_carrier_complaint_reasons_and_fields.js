migrate(
  (app) => {
    // 1. Criar collection carrier_complaint_reasons para parametrização dos motivos
    if (!app.hasTable('carrier_complaint_reasons')) {
      const reasonCol = new Collection({
        name: 'carrier_complaint_reasons',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text' },
          { name: 'order_index', type: 'number' },
          { name: 'is_active', type: 'bool' },
          { name: 'requires_specification', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_complaint_reason_code ON carrier_complaint_reasons (code)',
          'CREATE INDEX idx_complaint_reason_order ON carrier_complaint_reasons (order_index)',
        ],
      })
      app.save(reasonCol)
    }

    // Seed dos 23 motivos oficiais exigidos
    const initialReasons = [
      { code: 'MOT-01', name: 'Atraso / Prazo de entrega', order: 1, requiresSpec: false },
      { code: 'MOT-02', name: 'Cordialidade / Atendimento', order: 2, requiresSpec: false },
      { code: 'MOT-03', name: 'Entrega de documentos', order: 3, requiresSpec: false },
      {
        code: 'MOT-04',
        name: 'Documentação incorreta ou incompleta',
        order: 4,
        requiresSpec: false,
      },
      { code: 'MOT-05', name: 'Segurança no transporte', order: 5, requiresSpec: false },
      {
        code: 'MOT-06',
        name: 'Descumprimento de regras de segurança',
        order: 6,
        requiresSpec: false,
      },
      { code: 'MOT-07', name: 'Erro de descarga', order: 7, requiresSpec: false },
      { code: 'MOT-08', name: 'Descarga em local incorreto', order: 8, requiresSpec: false },
      { code: 'MOT-09', name: 'Avaria de material', order: 9, requiresSpec: false },
      { code: 'MOT-10', name: 'Condição inadequada do veículo', order: 10, requiresSpec: false },
      { code: 'MOT-11', name: 'Proteção inadequada da carga', order: 11, requiresSpec: false },
      { code: 'MOT-12', name: 'Problema com amarração da carga', order: 12, requiresSpec: false },
      { code: 'MOT-13', name: 'Recusa ou dificuldade na descarga', order: 13, requiresSpec: false },
      {
        code: 'MOT-14',
        name: 'Não cumprimento do horário agendado',
        order: 14,
        requiresSpec: false,
      },
      {
        code: 'MOT-15',
        name: 'Não cumprimento de orientação do cliente',
        order: 15,
        requiresSpec: false,
      },
      { code: 'MOT-16', name: 'Comunicação inadequada', order: 16, requiresSpec: false },
      { code: 'MOT-17', name: 'Falta de retorno/comunicação', order: 17, requiresSpec: false },
      { code: 'MOT-18', name: 'Conduta inadequada do motorista', order: 18, requiresSpec: false },
      { code: 'MOT-19', name: 'Documentos não devolvidos', order: 19, requiresSpec: false },
      {
        code: 'MOT-20',
        name: 'Divergência de quantidade/material',
        order: 20,
        requiresSpec: false,
      },
      {
        code: 'MOT-21',
        name: 'Descumprimento de procedimento CIAFAL',
        order: 21,
        requiresSpec: false,
      },
      {
        code: 'MOT-22',
        name: 'Descumprimento de procedimento do cliente',
        order: 22,
        requiresSpec: false,
      },
      { code: 'MOT-23', name: 'Outros', order: 23, requiresSpec: true },
    ]

    const reasonCollection = app.findCollectionByNameOrId('carrier_complaint_reasons')
    initialReasons.forEach((item) => {
      try {
        app.findFirstRecordByData('carrier_complaint_reasons', 'code', item.code)
      } catch (_) {
        const rec = new Record(reasonCollection)
        rec.set('code', item.code)
        rec.set('name', item.name)
        rec.set('description', item.name)
        rec.set('order_index', item.order)
        rec.set('is_active', true)
        rec.set('requires_specification', item.requiresSpec)
        app.save(rec)
      }
    })

    // 2. Expandir collection carrier_complaints com novos campos
    const compCol = app.findCollectionByNameOrId('carrier_complaints')

    if (!compCol.fields.getByName('origin_channel')) {
      compCol.fields.add(
        new SelectField({
          name: 'origin_channel',
          required: false,
          values: ['WS', 'CLIENTE'],
          maxSelect: 1,
        }),
      )
    }

    if (!compCol.fields.getByName('reason_code')) {
      compCol.fields.add(new TextField({ name: 'reason_code' }))
    }

    if (!compCol.fields.getByName('reason_name')) {
      compCol.fields.add(new TextField({ name: 'reason_name' }))
    }

    if (!compCol.fields.getByName('reason_specification')) {
      compCol.fields.add(new TextField({ name: 'reason_specification' }))
    }

    if (!compCol.fields.getByName('delivery_number')) {
      compCol.fields.add(new TextField({ name: 'delivery_number' }))
    }

    if (!compCol.fields.getByName('customer_display')) {
      compCol.fields.add(new TextField({ name: 'customer_display' }))
    }

    if (!compCol.fields.getByName('unlinked_transport_justification')) {
      compCol.fields.add(new TextField({ name: 'unlinked_transport_justification' }))
    }

    if (!compCol.fields.getByName('has_transport_link')) {
      compCol.fields.add(new BoolField({ name: 'has_transport_link' }))
    }

    if (!compCol.fields.getByName('operation_date')) {
      compCol.fields.add(new DateField({ name: 'operation_date' }))
    }

    if (!compCol.fields.getByName('snapshot_data')) {
      compCol.fields.add(new JSONField({ name: 'snapshot_data' }))
    }

    app.save(compCol)

    // Adicionar índices úteis
    try {
      compCol.addIndex('idx_carcomp_deliv', false, 'delivery_number', '')
      compCol.addIndex('idx_carcomp_orig_chan', false, 'origin_channel', '')
      compCol.addIndex('idx_carcomp_reason_code', false, 'reason_code', '')
      app.save(compCol)
    } catch (_) {
      // Índice já pode existir
    }
  },
  (app) => {
    try {
      const compCol = app.findCollectionByNameOrId('carrier_complaints')
      compCol.removeIndex('idx_carcomp_deliv')
      compCol.removeIndex('idx_carcomp_orig_chan')
      compCol.removeIndex('idx_carcomp_reason_code')
      app.save(compCol)
    } catch (_) {}

    try {
      app.delete(app.findCollectionByNameOrId('carrier_complaint_reasons'))
    } catch (_) {}
  },
)
