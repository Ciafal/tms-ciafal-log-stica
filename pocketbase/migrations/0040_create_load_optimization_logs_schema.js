/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 0040_create_load_optimization_logs_schema.js
    const logCol = new Collection({
      name: 'load_optimization_logs',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'executed_at', type: 'date', required: true },
        { name: 'user_name', type: 'text' },
        { name: 'user_id', type: 'text' },
        { name: 'itinerary_filter', type: 'text' },
        { name: 'planned_date', type: 'date' },
        { name: 'vehicle_type', type: 'text' },
        { name: 'min_occupancy_pct', type: 'number' },
        { name: 'max_occupancy_pct', type: 'number' },
        { name: 'orders_count', type: 'number' },
        { name: 'vehicles_count', type: 'number' },
        { name: 'itineraries_count', type: 'number' },
        { name: 'combinations_evaluated', type: 'number' },
        { name: 'proposals_selected', type: 'number' },
        { name: 'antt_total_cost', type: 'number' },
        { name: 'total_planned_weight_kg', type: 'number' },
        { name: 'avg_occupancy_pct', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['sucesso', 'erro', 'sem_propostas'],
          maxSelect: 1,
        },
        { name: 'result_summary', type: 'text' },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lol_exec ON load_optimization_logs (executed_at)',
        'CREATE INDEX idx_lol_status ON load_optimization_logs (status)',
      ],
    })
    app.save(logCol)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('load_optimization_logs')
      app.delete(col)
    } catch (_) {}
  },
)
