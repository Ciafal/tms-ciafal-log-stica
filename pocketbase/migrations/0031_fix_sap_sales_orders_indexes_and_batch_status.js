migrate(
  (app) => {
    // 1. Atualizar índice de sap_sales_orders:
    // Remover idx_sales_order_number que era UNIQUE(order_number), pois um mesmo pedido SAP tem múltiplos itens/materiais.
    // Criar índice não-exclusivo em order_number e índice em technical_key e (order_number, item_number)
    const salesCol = app.findCollectionByNameOrId('sap_sales_orders')
    try {
      salesCol.removeIndex('idx_sales_order_number')
    } catch (_) {}

    try {
      salesCol.addIndex('idx_sales_order_num', false, 'order_number', '')
      salesCol.addIndex('idx_sales_order_item', false, 'order_number, item_number', '')
      salesCol.addIndex('idx_sales_tech_key', false, 'technical_key', '')
    } catch (_) {}

    app.save(salesCol)

    // 2. Atualizar sap_imports para permitir todos os status da máquina de estados do lote:
    // RECEBIDO, VALIDADO, PROCESSANDO, CONCLUIDO, CONCLUIDO_COM_ALERTAS, ERRO, CANCELADO, concluido, concluido_com_erros, falha
    const importsCol = app.findCollectionByNameOrId('sap_imports')
    const statusField = importsCol.fields.getByName('status')
    if (statusField) {
      importsCol.fields.removeByName('status')
      importsCol.fields.add(
        new SelectField({
          name: 'status',
          values: [
            'RECEBIDO',
            'VALIDADO',
            'PROCESSANDO',
            'CONCLUIDO',
            'CONCLUIDO_COM_ALERTAS',
            'ERRO',
            'CANCELADO',
            'concluido',
            'concluido_com_erros',
            'falha',
          ],
          maxSelect: 1,
        }),
      )
    }

    if (!importsCol.fields.getByName('error_message')) {
      importsCol.fields.add(new TextField({ name: 'error_message' }))
    }
    if (!importsCol.fields.getByName('step_current')) {
      importsCol.fields.add(new TextField({ name: 'step_current' }))
    }
    if (!importsCol.fields.getByName('progress_pct')) {
      importsCol.fields.add(new NumberField({ name: 'progress_pct' }))
    }

    app.save(importsCol)
  },
  (app) => {
    // Revert
  },
)
