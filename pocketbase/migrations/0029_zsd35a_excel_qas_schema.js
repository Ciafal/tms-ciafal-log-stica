migrate(
  (app) => {
    // 1. Adicionar campos na coleção sap_sales_orders
    const salesCol = app.findCollectionByNameOrId('sap_sales_orders')

    const newFields = [
      { name: 'origem_dado', type: 'select', values: ['SAP', 'EXCEL_QAS'], maxSelect: 1 },
      { name: 'import_batch_id', type: 'text' },
      { name: 'source_file', type: 'text' },
      { name: 'imported_by_user', type: 'text' },
      { name: 'imported_at', type: 'date' },
      { name: 'template_version', type: 'text' },
      { name: 'company_code', type: 'text' },
      { name: 'plant_code', type: 'text' },
      { name: 'supplying_plant', type: 'text' },
      { name: 'storage_location', type: 'text' },
      { name: 'route_code', type: 'text' },
      { name: 'credit_limit', type: 'number' },
      { name: 'credit_condition', type: 'text' },
      { name: 'credit_reason', type: 'text' },
      { name: 'stock_situation', type: 'text' },
      { name: 'stock_available', type: 'number' },
      { name: 'stock_dp34', type: 'number' },
      { name: 'stock_total', type: 'number' },
      { name: 'stock_sider', type: 'number' },
      { name: 'missing_quantity', type: 'number' },
      { name: 'pcp_status', type: 'text' },
      { name: 'pcp_forecast_date', type: 'date' },
      { name: 'wallet_days', type: 'number' },
      { name: 'delay_days', type: 'number' },
      { name: 'delivery_number', type: 'text' },
      { name: 'delivery_week', type: 'text' },
      { name: 'discharges_count', type: 'number' },
      { name: 'logistic_restrictions', type: 'text' },
      { name: 'order_value', type: 'number' },
      { name: 'freight_value', type: 'number' },
      { name: 'toll_forecast_value', type: 'number' },
      { name: 'priority_level', type: 'text' },
      { name: 'raw_q_dias', type: 'number' },
      { name: 'q_dias', type: 'number' },
      { name: 'order_hour', type: 'text' },
      { name: 'incoterms', type: 'text' },
      { name: 'is_sidercentro', type: 'bool' },
      { name: 'stock_quantity_kg', type: 'number' },
      { name: 'balance_quantity_kg', type: 'number' },
      { name: 'technical_key', type: 'text' },
    ]

    for (const f of newFields) {
      if (!salesCol.fields.getByName(f.name)) {
        if (f.type === 'text') {
          salesCol.fields.add(new TextField({ name: f.name }))
        } else if (f.type === 'number') {
          salesCol.fields.add(new NumberField({ name: f.name }))
        } else if (f.type === 'bool') {
          salesCol.fields.add(new BoolField({ name: f.name }))
        } else if (f.type === 'date') {
          salesCol.fields.add(new DateField({ name: f.name }))
        } else if (f.type === 'select') {
          salesCol.fields.add(
            new SelectField({
              name: f.name,
              values: f.values,
              maxSelect: f.maxSelect || 1,
            }),
          )
        }
      }
    }

    // Adicionar índices úteis
    try {
      salesCol.addIndex('idx_sales_origem_dado', false, 'origem_dado', '')
      salesCol.addIndex('idx_sales_import_batch', false, 'import_batch_id', '')
    } catch (_) {}

    app.save(salesCol)

    // 2. Expandir sap_imports com campos de controle ZSD35A
    const importsCol = app.findCollectionByNameOrId('sap_imports')
    const importExtraFields = [
      { name: 'batch_id', type: 'text' },
      { name: 'origem_dado', type: 'select', values: ['SAP', 'EXCEL_QAS'], maxSelect: 1 },
      { name: 'template_version', type: 'text' },
      { name: 'total_weight_ton', type: 'number' },
      { name: 'valid_count', type: 'number' },
      { name: 'warning_count', type: 'number' },
      { name: 'clients_count', type: 'number' },
      { name: 'materials_count', type: 'number' },
      { name: 'summary_report', type: 'json' },
    ]

    for (const f of importExtraFields) {
      if (!importsCol.fields.getByName(f.name)) {
        if (f.type === 'text') {
          importsCol.fields.add(new TextField({ name: f.name }))
        } else if (f.type === 'number') {
          importsCol.fields.add(new NumberField({ name: f.name }))
        } else if (f.type === 'json') {
          importsCol.fields.add(new JSONField({ name: f.name }))
        } else if (f.type === 'select') {
          importsCol.fields.add(
            new SelectField({
              name: f.name,
              values: f.values,
              maxSelect: f.maxSelect || 1,
            }),
          )
        }
      }
    }

    try {
      importsCol.addIndex('idx_sap_imports_batch', false, 'batch_id', '')
    } catch (_) {}

    app.save(importsCol)

    // 3. Atualizar registros existentes para origem_dado = 'SAP'
    try {
      app
        .db()
        .newQuery(
          "UPDATE sap_sales_orders SET origem_dado = 'SAP' WHERE origem_dado IS NULL OR origem_dado = ''",
        )
        .execute()
    } catch (_) {}
  },
  (app) => {
    // Revert se necessário
  },
)
