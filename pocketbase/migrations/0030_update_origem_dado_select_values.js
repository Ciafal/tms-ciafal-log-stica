migrate(
  (app) => {
    // 1. Atualizar SelectField 'origem_dado' em sap_sales_orders para incluir EXCEL_QAS_ZSD35_V3
    const salesCol = app.findCollectionByNameOrId('sap_sales_orders')
    const salesOrigem = salesCol.fields.getByName('origem_dado')
    if (salesOrigem) {
      salesCol.fields.removeByName('origem_dado')
      salesCol.fields.add(
        new SelectField({
          name: 'origem_dado',
          values: ['SAP', 'EXCEL_QAS', 'EXCEL_QAS_ZSD35_V3'],
          maxSelect: 1,
        }),
      )
      app.save(salesCol)
    }

    // 2. Atualizar SelectField 'origem_dado' em sap_imports para incluir EXCEL_QAS_ZSD35_V3
    const importsCol = app.findCollectionByNameOrId('sap_imports')
    const importsOrigem = importsCol.fields.getByName('origem_dado')
    if (importsOrigem) {
      importsCol.fields.removeByName('origem_dado')
      importsCol.fields.add(
        new SelectField({
          name: 'origem_dado',
          values: ['SAP', 'EXCEL_QAS', 'EXCEL_QAS_ZSD35_V3'],
          maxSelect: 1,
        }),
      )
      app.save(importsCol)
    }
  },
  (app) => {
    // Revert
  },
)
