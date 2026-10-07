/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('route_additions')

    const fieldsToAdd = [
      new Field({
        name: 'transport_order_id',
        type: 'text',
        required: false,
      }),
      new Field({
        name: 'fractions_before',
        type: 'number',
        required: false,
      }),
      new Field({
        name: 'fractions_after',
        type: 'number',
        required: false,
      }),
      new Field({
        name: 'remessas_before',
        type: 'number',
        required: false,
      }),
      new Field({
        name: 'remessas_after',
        type: 'number',
        required: false,
      }),
      new Field({
        name: 'ai_alignment',
        type: 'text',
        required: false,
      }),
      new Field({
        name: 'ai_risk',
        type: 'text',
        required: false,
      }),
    ]

    fieldsToAdd.forEach((f) => {
      try {
        collection.fields.add(f)
      } catch (e) {
        // Ignora se o campo já existir
      }
    })

    // Torna create/update/delete acessíveis para operações de demonstração/planejador
    collection.createRule = ''
    collection.updateRule = ''

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('route_additions')
    const fieldNames = [
      'transport_order_id',
      'fractions_before',
      'fractions_after',
      'remessas_before',
      'remessas_after',
      'ai_alignment',
      'ai_risk',
    ]
    fieldNames.forEach((name) => {
      try {
        collection.fields.removeByName(name)
      } catch (e) {}
    })
    app.save(collection)
  },
)
