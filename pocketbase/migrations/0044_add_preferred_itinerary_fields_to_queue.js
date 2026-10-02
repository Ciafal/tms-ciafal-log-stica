migrate(
  (app) => {
    try {
      const queueCol = app.findCollectionByNameOrId('queue_entries')
      let changed = false

      if (!queueCol.fields.getByName('preferred_itinerary_code')) {
        queueCol.fields.add(new TextField({ name: 'preferred_itinerary_code' }))
        changed = true
      }

      if (!queueCol.fields.getByName('preferred_itinerary_name')) {
        queueCol.fields.add(new TextField({ name: 'preferred_itinerary_name' }))
        changed = true
      }

      if (changed) {
        app.save(queueCol)
      }
    } catch (err) {
      console.log('Error updating queue_entries in 0044:', err)
      throw err
    }
  },
  (app) => {
    try {
      const queueCol = app.findCollectionByNameOrId('queue_entries')
      let changed = false
      const f1 = queueCol.fields.getByName('preferred_itinerary_code')
      if (f1) {
        queueCol.fields.removeByName('preferred_itinerary_code')
        changed = true
      }
      const f2 = queueCol.fields.getByName('preferred_itinerary_name')
      if (f2) {
        queueCol.fields.removeByName('preferred_itinerary_name')
        changed = true
      }
      if (changed) {
        app.save(queueCol)
      }
    } catch (_) {}
  },
)
