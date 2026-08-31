migrate(
  (app) => {
    // 1. Atualizar SelectField 'origem_dado' em sap_sales_orders para incluir EXCEL_QAS_ZSD35A_V3
    try {
      const ordersCol = app.findCollectionByNameOrId('sap_sales_orders')
      if (ordersCol) {
        const field = ordersCol.fields.getByName('origem_dado')
        if (field) {
          ordersCol.fields.add(
            new SelectField({
              name: 'origem_dado',
              values: ['SAP', 'EXCEL_QAS', 'EXCEL_QAS_ZSD35_V3', 'EXCEL_QAS_ZSD35A_V3'],
              maxSelect: 1,
            }),
          )
          app.save(ordersCol)
        }
      }
    } catch (err) {
      console.log('Erro ao atualizar campo origem_dado em sap_sales_orders:', err)
    }

    // 2. Atualizar SelectField 'origem_dado' em sap_imports para incluir EXCEL_QAS_ZSD35A_V3
    try {
      const importsCol = app.findCollectionByNameOrId('sap_imports')
      if (importsCol) {
        const field = importsCol.fields.getByName('origem_dado')
        if (field) {
          importsCol.fields.add(
            new SelectField({
              name: 'origem_dado',
              values: ['SAP', 'EXCEL_QAS', 'EXCEL_QAS_ZSD35_V3', 'EXCEL_QAS_ZSD35A_V3'],
              maxSelect: 1,
            }),
          )
          app.save(importsCol)
        }
      }
    } catch (err) {
      console.log('Erro ao atualizar campo origem_dado em sap_imports:', err)
    }

    // 3. Atualizar registros existentes de EXCEL_QAS_ZSD35_V3 para EXCEL_QAS_ZSD35A_V3
    try {
      app
        .db()
        .newQuery(
          "UPDATE sap_sales_orders SET origem_dado = 'EXCEL_QAS_ZSD35A_V3' WHERE origem_dado = 'EXCEL_QAS_ZSD35_V3'",
        )
        .execute()
      app
        .db()
        .newQuery(
          "UPDATE sap_imports SET origem_dado = 'EXCEL_QAS_ZSD35A_V3' WHERE origem_dado = 'EXCEL_QAS_ZSD35_V3'",
        )
        .execute()
    } catch (err) {
      console.log('Erro ao atualizar dados existentes para EXCEL_QAS_ZSD35A_V3:', err)
    }
  },
  (app) => {
    try {
      app
        .db()
        .newQuery(
          "UPDATE sap_sales_orders SET origem_dado = 'EXCEL_QAS_ZSD35_V3' WHERE origem_dado = 'EXCEL_QAS_ZSD35A_V3'",
        )
        .execute()
      app
        .db()
        .newQuery(
          "UPDATE sap_imports SET origem_dado = 'EXCEL_QAS_ZSD35_V3' WHERE origem_dado = 'EXCEL_QAS_ZSD35A_V3'",
        )
        .execute()
    } catch (_) {}
  },
)
