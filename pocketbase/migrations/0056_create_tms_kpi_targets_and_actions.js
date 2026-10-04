migrate(
  (app) => {
    // 1. Coleção tms_kpi_targets (Metas configuráveis dos Indicadores TMS)
    if (!app.hasTable('tms_kpi_targets')) {
      const colTargets = new Collection({
        name: 'tms_kpi_targets',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'kpi_id', type: 'text', required: true },
          { name: 'kpi_name', type: 'text', required: true },
          {
            name: 'category',
            type: 'select',
            required: true,
            values: ['EXPEDICAO', 'LOGISTICA', 'TRANSPORTE'],
            maxSelect: 1,
          },
          { name: 'year', type: 'number', required: true },
          { name: 'company', type: 'text' },
          { name: 'center', type: 'text' },
          { name: 'target_value', type: 'number', required: true },
          {
            name: 'rule',
            type: 'select',
            required: true,
            values: ['GTE', 'LTE', 'EQ', 'BETWEEN'],
            maxSelect: 1,
          },
          { name: 'target_value_max', type: 'number' }, // para regra BETWEEN
          { name: 'unit', type: 'text', required: true },
          { name: 'valid_from', type: 'date' },
          { name: 'valid_to', type: 'date' },
          { name: 'responsible', type: 'text', required: true },
          { name: 'responsible_email', type: 'text' },
          { name: 'change_justification', type: 'text' },
          { name: 'previous_value', type: 'number' },
          { name: 'history_log', type: 'json' },
          { name: 'is_active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_tms_target_kpi ON tms_kpi_targets (kpi_id, year)',
          'CREATE INDEX idx_tms_target_cat ON tms_kpi_targets (category)',
          'CREATE INDEX idx_tms_target_center ON tms_kpi_targets (center)',
        ],
      })
      app.save(colTargets)
    }

    // 2. Coleção tms_deviation_actions (Tratamento de Desvios / Ações Corretivas)
    if (!app.hasTable('tms_deviation_actions')) {
      const colActions = new Collection({
        name: 'tms_deviation_actions',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'action_code', type: 'text', required: true },
          { name: 'kpi_id', type: 'text', required: true },
          { name: 'kpi_name', type: 'text', required: true },
          {
            name: 'category',
            type: 'select',
            required: true,
            values: ['EXPEDICAO', 'LOGISTICA', 'TRANSPORTE'],
            maxSelect: 1,
          },
          { name: 'period_ref', type: 'text', required: true }, // ex: "02/2026", "Jan/2026"
          { name: 'month', type: 'number', required: true },
          { name: 'year', type: 'number', required: true },
          { name: 'identified_problem', type: 'text', required: true },
          { name: 'probable_cause', type: 'text', required: true },
          { name: 'action_description', type: 'text', required: true },
          { name: 'responsible_name', type: 'text', required: true },
          { name: 'responsible_email', type: 'text' },
          {
            name: 'target_module',
            type: 'select',
            required: true,
            values: [
              'TMS',
              'WMS',
              'PCP_ROBOTIZADO',
              'MANUTENCAO',
              'COMERCIAL_CRM',
              'EXPEDICAO',
              'OUTRO',
            ],
            maxSelect: 1,
          },
          { name: 'responsible_sector', type: 'text', required: true },
          { name: 'deadline', type: 'date', required: true },
          {
            name: 'priority',
            type: 'select',
            required: true,
            values: ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_VALIDACAO', 'CONCLUIDA', 'CANCELADA'],
            maxSelect: 1,
          },
          { name: 'ai_suggested', type: 'bool' },
          { name: 'ai_diagnosis_summary', type: 'text' },
          { name: 'evidence_notes', type: 'text' },
          { name: 'evidences_json', type: 'json' },
          { name: 'completion_notes', type: 'text' },
          { name: 'effectiveness_evaluation', type: 'text' }, // Avaliação da eficácia pós-conclusão
          { name: 'closed_at', type: 'date' },
          { name: 'closed_by_email', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_tms_action_code ON tms_deviation_actions (action_code)',
          'CREATE INDEX idx_tms_action_kpi ON tms_deviation_actions (kpi_id)',
          'CREATE INDEX idx_tms_action_status ON tms_deviation_actions (status)',
          'CREATE INDEX idx_tms_action_period ON tms_deviation_actions (year, month)',
        ],
      })
      app.save(colActions)
    }
  },
  (app) => {
    try {
      const colActions = app.findCollectionByNameOrId('tms_deviation_actions')
      app.delete(colActions)
    } catch (_) {}
    try {
      const colTargets = app.findCollectionByNameOrId('tms_kpi_targets')
      app.delete(colTargets)
    } catch (_) {}
  },
)
