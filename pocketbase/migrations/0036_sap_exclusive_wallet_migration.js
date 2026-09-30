/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Atualizar origem_dado dos 396 registros de sap_sales_orders para 'SAP'
    app
      .db()
      .newQuery(
        `UPDATE sap_sales_orders
         SET origem_dado = 'SAP',
             source_file = 'SAP ECC 6.0 (RFC ZSD35_CARTEIRA_GET)',
             template_version = 'SAP_RFC_CANONICAL'
         WHERE origem_dado != 'SAP' OR origem_dado IS NULL`,
      )
      .execute()

    // 2. Garantir que campos company_code, order_number e item_number têm índice composto único para UPSERT idempotente
    const ordersCol = app.findCollectionByNameOrId('sap_sales_orders')
    try {
      ordersCol.addIndex(
        'idx_sales_company_order_item_unique',
        true,
        'company_code, order_number, item_number',
        '',
      )
      app.save(ordersCol)
    } catch (e) {
      console.log('Nota sobre índice idx_sales_company_order_item_unique:', e)
    }

    // 3. Remover collections exclusivas de Excel/ZSD35A após validar ausência de FKs
    try {
      if (app.hasTable('sap_imports')) {
        const col = app.findCollectionByNameOrId('sap_imports')
        app.delete(col)
      }
    } catch (e) {
      console.log('sap_imports remove error:', e)
    }

    try {
      if (app.hasTable('zsd35_column_mappings')) {
        const col = app.findCollectionByNameOrId('zsd35_column_mappings')
        app.delete(col)
      }
    } catch (e) {
      console.log('zsd35_column_mappings remove error:', e)
    }

    // 4. Remover / Atualizar parâmetros obsoletos em system_parameters
    try {
      app
        .db()
        .newQuery(
          `DELETE FROM system_parameters
           WHERE key IN ('ACTIVE_SALES_WALLET_SOURCE', 'ACTIVE_SALES_WALLET_NAME', 'SALES_WALLET_SAP_FALLBACK_ALLOWED')`,
        )
        .execute()
    } catch (e) {
      console.log('Erro ao limpar system_parameters de wallet:', e)
    }
  },
  (app) => {
    // Reverter índice único
    try {
      const ordersCol = app.findCollectionByNameOrId('sap_sales_orders')
      ordersCol.removeIndex('idx_sales_company_order_item_unique')
      app.save(ordersCol)
    } catch (_) {}
  },
)
