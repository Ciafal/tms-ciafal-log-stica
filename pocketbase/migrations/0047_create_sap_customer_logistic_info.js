migrate(
  (app) => {
    // Criar collection 'sap_customer_logistic_info'
    const collection = new Collection({
      name: 'sap_customer_logistic_info',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        // Identificação Técnica & Local de Entrega (Recebedor / Ship-to)
        { name: 'technical_key', type: 'text', required: true },
        { name: 'customer_code', type: 'text', required: true },
        { name: 'customer_name', type: 'text', required: true },
        { name: 'ship_to_code', type: 'text', required: true },
        { name: 'ship_to_name', type: 'text', required: true },
        { name: 'cnpj', type: 'text' },
        { name: 'plant_code', type: 'text' },
        { name: 'sales_org', type: 'text' },
        { name: 'distribution_channel', type: 'text' },
        { name: 'sector', type: 'text' },
        { name: 'delivery_address', type: 'text' },
        { name: 'delivery_city', type: 'text', required: true },
        { name: 'delivery_uf', type: 'text', required: true },
        { name: 'delivery_cep', type: 'text' },
        { name: 'itinerary_code', type: 'text' },
        { name: 'logistic_region', type: 'text' },

        // Classificação e Validade Geral da Ficha Logística
        {
          name: 'highest_restriction_level',
          type: 'select',
          values: ['INFORMATIVA', 'ALERTA', 'RESTRITIVA', 'CRITICA'],
          maxSelect: 1,
        },
        { name: 'is_active', type: 'bool' },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_to', type: 'date' },
        { name: 'sap_user', type: 'text' },
        { name: 'origin_rfc', type: 'text' },
        { name: 'origin_table', type: 'text' },
        { name: 'last_sync_date', type: 'date' },
        { name: 'observations', type: 'text' },

        // Grupos Estruturados de Restrições (JSON com tipagem forte e validação)
        // 1. Material & Dimensões
        { name: 'material_restrictions_json', type: 'json' },
        // 2. Formação da Carga & Consolidação
        { name: 'load_formation_restrictions_json', type: 'json' },
        // 3. Tipos de Veículo & Dimensões Máximas
        { name: 'vehicle_restrictions_json', type: 'json' },
        // 4. Acesso, Tráfego & Restrições Viárias
        { name: 'access_restrictions_json', type: 'json' },
        // 5. Descarga & Equipamentos
        { name: 'discharge_restrictions_json', type: 'json' },
        // 6. Agendamento & Janelas de Recebimento
        { name: 'scheduling_restrictions_json', type: 'json' },
        // 7. Documentação Exigida
        { name: 'documentation_restrictions_json', type: 'json' },
        // 8. Segurança & EPIs do Motorista
        { name: 'safety_driver_restrictions_json', type: 'json' },

        // Histórico de Alterações SAP / Governança
        { name: 'history_changelog_json', type: 'json' },

        // Campos autodate obrigatórios
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_cust_info_tech_key ON sap_customer_logistic_info (technical_key)',
        'CREATE INDEX idx_cust_info_customer_code ON sap_customer_logistic_info (customer_code)',
        'CREATE INDEX idx_cust_info_ship_to ON sap_customer_logistic_info (ship_to_code)',
        'CREATE INDEX idx_cust_info_itinerary ON sap_customer_logistic_info (itinerary_code)',
        'CREATE INDEX idx_cust_info_city_uf ON sap_customer_logistic_info (delivery_city, delivery_uf)',
        'CREATE INDEX idx_cust_info_level ON sap_customer_logistic_info (highest_restriction_level)',
        'CREATE INDEX idx_cust_info_active ON sap_customer_logistic_info (is_active)',
      ],
    })

    app.save(collection)

    // Inserir Parâmetros de Configuração SAP RFC para Informações de Clientes
    try {
      const sysParamCol = app.findCollectionByNameOrId('system_parameters')

      const defaultParams = [
        {
          key: 'SAP_CUSTOMER_INFO_RFC',
          value: 'Z_RFC_TMS_INFO_CLIENTE',
          description:
            'Nome da função RFC do SAP ECC para extração em lote das restrições logísticas de clientes',
        },
        {
          key: 'SAP_CUSTOMER_INFO_TABLE',
          value: 'ZTMS_INFO_CLIENTE',
          description:
            'Tabela customizada Z do SAP ECC com a base mestra de restrições por recebedor',
        },
        {
          key: 'SAP_CUSTOMER_INFO_LAST_SYNC',
          value: new Date().toISOString(),
          description: 'Timestamp da última sincronização bem-sucedida da base de clientes SAP RFC',
        },
        {
          key: 'SAP_CUSTOMER_INFO_CACHE_TTL_HOURS',
          value: '12',
          description:
            'Tempo de validade do cache local HUB antes de alerta de atualização recomendada',
        },
      ]

      for (const p of defaultParams) {
        try {
          app.findFirstRecordByData('system_parameters', 'key', p.key)
        } catch (_) {
          const rec = new Record(sysParamCol)
          rec.set('key', p.key)
          rec.set('value', p.value)
          rec.set('description', p.description)
          app.save(rec)
        }
      }
    } catch (err) {
      console.log('Aviso ao semear system_parameters para cliente info:', err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('sap_customer_logistic_info')
      app.delete(col)
    } catch (_) {}
  },
)
