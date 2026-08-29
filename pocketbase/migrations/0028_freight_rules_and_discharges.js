migrate(
  (app) => {
    // Collection: freight_rule_parameters (Parametrização administrativa de regras de frete e múltiplas descargas)
    const freightRules = new Collection({
      name: 'freight_rule_parameters',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'rule_name', type: 'text', required: true },
        { name: 'rule_code', type: 'text', required: true },
        { name: 'additional_discharge_value', type: 'number', required: false },
        {
          name: 'value_type',
          type: 'select',
          required: true,
          values: ['FIXO', 'VARIAVEL_PERCENTUAL'],
          maxSelect: 1,
        },
        { name: 'applies_from_discharge_num', type: 'number', required: true },
        { name: 'region_scope', type: 'text', required: false },
        { name: 'customer_scope', type: 'text', required: false },
        { name: 'vehicle_type_scope', type: 'text', required: false },
        { name: 'effective_date_start', type: 'date', required: true },
        { name: 'effective_date_end', type: 'date', required: false },
        { name: 'is_active', type: 'bool', required: false },
        { name: 'responsible_user', type: 'text', required: false },
        { name: 'notes', type: 'text', required: false },
        { name: 'changelog_json', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_freight_rule_code ON freight_rule_parameters (rule_code)',
        'CREATE INDEX idx_freight_rule_active ON freight_rule_parameters (is_active)',
      ],
    })
    app.save(freightRules)

    // Seed initial freight rule parameter for multiple discharges
    try {
      const record = new Record(freightRules)
      record.set('rule_name', 'Adicional Padrão por Descarga Extra CIAFAL')
      record.set('rule_code', 'ADICIONAL_DESCARGA_PADRAO')
      record.set('additional_discharge_value', 250.0)
      record.set('value_type', 'FIXO')
      record.set('applies_from_discharge_num', 2)
      record.set('region_scope', 'TODAS')
      record.set('customer_scope', 'TODOS')
      record.set('vehicle_type_scope', 'TODOS')
      record.set('effective_date_start', new Date().toISOString())
      record.set('is_active', true)
      record.set('responsible_user', 'gestor.fretes@ciafal.logistica')
      record.set(
        'notes',
        '1ª descarga inclusa no frete padrão; a partir da 2ª descarga aplica R$ 250,00 fixos por parada adicional.',
      )
      record.set(
        'changelog_json',
        JSON.stringify([
          {
            timestamp: new Date().toISOString(),
            user: 'sistema.implantacao@ciafal.logistica',
            action: 'Criação inicial da regra padrão de descargas adicionais',
            previous_value: 0,
            new_value: 250.0,
          },
        ]),
      )
      app.save(record)
    } catch (err) {
      console.log('Error seeding initial freight rule:', err)
    }

    // Also seed default system parameters if missing
    try {
      const sysParams = app.findCollectionByNameOrId('system_parameters')
      const defaultParams = [
        {
          key: 'FRETE_ADICIONAL_DESCARGA_PADRAO',
          value: '250.00',
          description:
            'Custo adicional em R$ por ponto de descarga extra (a partir da 2ª descarga)',
        },
        {
          key: 'FRETE_DESCARGA_INCLUSA_CONTRATACAO',
          value: '1',
          description: 'Número de descargas inclusas na tarifa base padrão CIAFAL',
        },
        {
          key: 'ANTT_TABELA_PADRAO_VIGENTE',
          value: '2024-V2-PORTARIA-12',
          description: 'Versão ativa da Resolução ANTT para simulação',
        },
      ]
      defaultParams.forEach((p) => {
        try {
          app.findFirstRecordByData('system_parameters', 'key', p.key)
        } catch (_) {
          const rec = new Record(sysParams)
          rec.set('key', p.key)
          rec.set('value', p.value)
          rec.set('description', p.description)
          app.save(rec)
        }
      })
    } catch (e) {
      console.log('Error checking system_parameters:', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('freight_rule_parameters')
      app.delete(col)
    } catch (_) {}
  },
)
