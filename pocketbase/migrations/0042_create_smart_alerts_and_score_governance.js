migrate(
  (app) => {
    // 1. Coleção: carrier_smart_alerts (Alertas Inteligentes Determinísticos com Anti-Ruído e Workflow Completo)
    const alertCol = new Collection({
      name: 'carrier_smart_alerts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'alert_code', type: 'text', required: true },
        {
          name: 'alert_type',
          type: 'select',
          required: true,
          values: [
            'QUEDA_AVALIACAO',
            'QTD_RECLAMACOES',
            'REINCIDENCIA_CATEGORIA',
            'QUEDA_PONTUALIDADE',
            'AUMENTO_TEMPO_ROTA',
            'AUMENTO_TEMPO_INTERNO',
            'VEICULO_REINCIDENCIA',
            'MOTORISTA_NOVO',
            'VEICULO_NOVO',
            'DIVERGENCIA_SCORE_COMPORTAMENTO',
          ],
          maxSelect: 1,
        },
        {
          name: 'severity',
          type: 'select',
          required: true,
          values: ['INFORMATIVO', 'ATENCAO', 'IMPORTANTE', 'CRITICO'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: [
            'NOVO',
            'EM_ANALISE',
            'ACAO_NECESSARIA',
            'EM_TRATAMENTO',
            'RESOLVIDO',
            'ENCERRADO',
            'DESCARTADO',
            'FALSO_POSITIVO',
          ],
          maxSelect: 1,
        },
        { name: 'target_type', type: 'text' }, // MOTORISTA | VEICULO | MOTORISTA_VEICULO | TRANSPORTADORA
        { name: 'driver_id', type: 'text' },
        { name: 'driver_name', type: 'text' },
        { name: 'vehicle_plate', type: 'text' },
        { name: 'carrier_name', type: 'text' },
        { name: 'transport_order_number', type: 'text' },
        { name: 'sap_transport_number', type: 'text' },
        { name: 'itinerary_code', type: 'text' },
        { name: 'detection_date', type: 'date' },
        { name: 'evidence_summary', type: 'text', required: true },
        { name: 'historical_value', type: 'text' },
        { name: 'current_value', type: 'text' },
        { name: 'triggered_criteria', type: 'text', required: true },
        { name: 'internal_external_origin', type: 'text' }, // "provavel_origem_interna" | "provavel_origem_externa" | "origem_indeterminada" | "requer_analise"
        { name: 'responsible_handler_email', type: 'text' },
        { name: 'responsible_handler_name', type: 'text' },
        { name: 'action_plan', type: 'text' },
        { name: 'action_deadline', type: 'date' },
        { name: 'resolution_notes', type: 'text' },
        { name: 'discard_justification', type: 'text' }, // Obrigatória para descartar/falso positivo
        { name: 'resolved_at', type: 'date' },
        { name: 'related_transports_json', type: 'json' },
        { name: 'related_evaluations_json', type: 'json' },
        { name: 'related_complaints_json', type: 'json' },
        { name: 'attachments_json', type: 'json' },
        { name: 'audit_trail_json', type: 'json' },
        { name: 'metadata_json', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_smrtalt_code ON carrier_smart_alerts (alert_code)',
        'CREATE INDEX idx_smrtalt_type ON carrier_smart_alerts (alert_type)',
        'CREATE INDEX idx_smrtalt_status ON carrier_smart_alerts (status)',
        'CREATE INDEX idx_smrtalt_sev ON carrier_smart_alerts (severity)',
        'CREATE INDEX idx_smrtalt_drv ON carrier_smart_alerts (driver_id)',
        'CREATE INDEX idx_smrtalt_plt ON carrier_smart_alerts (vehicle_plate)',
        'CREATE INDEX idx_smrtalt_sap ON carrier_smart_alerts (sap_transport_number)',
      ],
    })
    app.save(alertCol)

    // 2. Coleção: carrier_score_rule_versions (Versionamento imutável de pesos e critérios do Score Operacional)
    const ruleCol = new Collection({
      name: 'carrier_score_rule_versions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'version_code', type: 'text', required: true },
        { name: 'rule_name', type: 'text', required: true },
        {
          name: 'lifecycle_status',
          type: 'select',
          required: true,
          values: ['RASCUNHO', 'SIMULADO', 'HOMOLOGADO', 'VIGENTE', 'ARQUIVADO'],
          maxSelect: 1,
        },
        // Pesos configuráveis (Soma obrigatória 100%)
        { name: 'weight_services_evaluation_pct', type: 'number', required: true }, // Default: 30
        { name: 'weight_punctuality_pct', type: 'number', required: true }, // Default: 20
        { name: 'weight_procedente_complaints_pct', type: 'number', required: true }, // Default: 15
        { name: 'weight_occurrences_pct', type: 'number', required: true }, // Default: 10
        { name: 'weight_communication_pct', type: 'number', required: true }, // Default: 10
        { name: 'weight_delivery_history_pct', type: 'number', required: true }, // Default: 10
        { name: 'weight_compliments_pct', type: 'number', required: true }, // Default: 5
        { name: 'weights_sum_pct', type: 'number', required: true }, // Deve ser exatamente 100
        // Parâmetros de Amostra e Cobertura
        { name: 'target_coverage_pct', type: 'number' }, // Meta ex: 80%
        { name: 'min_transports_for_high_confidence', type: 'number' }, // ex: 15
        { name: 'min_transports_for_medium_confidence', type: 'number' }, // ex: 5
        // Governança & Vigência
        { name: 'effective_start_date', type: 'date' },
        { name: 'effective_end_date', type: 'date' },
        { name: 'justification', type: 'text', required: true },
        { name: 'created_by_user_email', type: 'text' },
        { name: 'created_by_user_name', type: 'text' },
        { name: 'homologated_by_user_email', type: 'text' },
        { name: 'homologated_by_user_name', type: 'text' },
        { name: 'homologated_at', type: 'date' },
        { name: 'previous_values_json', type: 'json' },
        { name: 'simulation_impact_json', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_scrrul_ver ON carrier_score_rule_versions (version_code)',
        'CREATE INDEX idx_scrrul_status ON carrier_score_rule_versions (lifecycle_status)',
      ],
    })
    app.save(ruleCol)

    // 3. Coleção: carrier_score_snapshots (Snapshots históricos do score com rule version da época)
    const snapCol = new Collection({
      name: 'carrier_score_snapshots',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'snapshot_period', type: 'text', required: true }, // AAAA-MM
        { name: 'target_type', type: 'text', required: true }, // MOTORISTA | VEICULO
        { name: 'target_id', type: 'text', required: true }, // driver_id ou vehicle_plate
        { name: 'target_name', type: 'text', required: true },
        { name: 'rule_version_code', type: 'text', required: true },
        { name: 'score_final', type: 'number', required: true },
        {
          name: 'confidence_level',
          type: 'select',
          required: true,
          values: ['BAIXA', 'MEDIA', 'ALTA'],
          maxSelect: 1,
        },
        { name: 'transports_count', type: 'number' },
        { name: 'evaluations_count', type: 'number' },
        { name: 'score_breakdown_json', type: 'json' },
        { name: 'input_metrics_json', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_scrsnap_period ON carrier_score_snapshots (snapshot_period)',
        'CREATE INDEX idx_scrsnap_target ON carrier_score_snapshots (target_id, target_type)',
        'CREATE INDEX idx_scrsnap_ver ON carrier_score_snapshots (rule_version_code)',
      ],
    })
    app.save(snapCol)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('carrier_score_snapshots'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('carrier_score_rule_versions'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('carrier_smart_alerts'))
    } catch (_) {}
  },
)
