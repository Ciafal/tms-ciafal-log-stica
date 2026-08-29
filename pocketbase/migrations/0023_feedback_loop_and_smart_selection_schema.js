/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Coleção: selection_criteria_templates (Templates & Pesos Parametrizáveis de Seleção Multicritério)
    if (!app.hasTable('selection_criteria_templates')) {
      const col = new Collection({
        name: 'selection_criteria_templates',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'template_code', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text' },
          {
            name: 'operation_type',
            type: 'select',
            values: [
              'NORMAL',
              'CLIENTE_CRITICO',
              'ENTREGA_URGENTE',
              'OPERACAO_COMPLEXA',
              'PERSONALIZADO',
            ],
          },
          { name: 'model_version', type: 'text', required: true }, // ex: "Modelo Seleção v1.0"
          { name: 'is_active', type: 'bool' },
          { name: 'is_default', type: 'bool' },
          // 9 Pesos Parametrizáveis (Total = 100%)
          { name: 'weight_operational_compatibility_pct', type: 'number' }, // 20%
          { name: 'weight_historical_performance_pct', type: 'number' }, // 15%
          { name: 'weight_route_experience_pct', type: 'number' }, // 10%
          { name: 'weight_customer_experience_pct', type: 'number' }, // 10%
          { name: 'weight_location_availability_pct', type: 'number' }, // 10%
          { name: 'weight_expected_cost_pct', type: 'number' }, // 20%
          { name: 'weight_punctuality_pct', type: 'number' }, // 5%
          { name: 'weight_occurrences_pct', type: 'number' }, // 5%
          { name: 'weight_fred_collaboration_pct', type: 'number' }, // 5%
          // Governança e Auditoria da Fórmula
          { name: 'effective_date_start', type: 'date' },
          { name: 'responsible_user_email', type: 'text' },
          { name: 'responsible_user_name', type: 'text' },
          { name: 'expected_impact_notes', type: 'text' },
          { name: 'version_changelog_json', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_seltemp_code ON selection_criteria_templates (template_code)',
          'CREATE INDEX idx_seltemp_op ON selection_criteria_templates (operation_type)',
          'CREATE INDEX idx_seltemp_active ON selection_criteria_templates (is_active)',
        ],
      })
      app.save(col)
    }

    // 2. Coleção: cargo_driver_fitness_scores (Score de Adequação à Carga por Candidato + Explicabilidade)
    if (!app.hasTable('cargo_driver_fitness_scores')) {
      const col = new Collection({
        name: 'cargo_driver_fitness_scores',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'cargo_id', type: 'text', required: true },
          { name: 'driver_id', type: 'text', required: true },
          { name: 'driver_name', type: 'text', required: true },
          { name: 'vehicle_plate', type: 'text' },
          { name: 'vehicle_type', type: 'text' },
          { name: 'template_code_applied', type: 'text' },
          { name: 'formula_version_applied', type: 'text' },
          { name: 'fitness_score', type: 'number', required: true }, // 0 a 100
          { name: 'is_eligible', type: 'bool' },
          { name: 'is_recommended', type: 'bool' },
          { name: 'ranking_position', type: 'number' },
          // Detalhamento dos 9 Critérios
          { name: 'subscore_operational_compatibility', type: 'number' },
          { name: 'subscore_historical_performance', type: 'number' },
          { name: 'subscore_route_experience', type: 'number' },
          { name: 'subscore_customer_experience', type: 'number' },
          { name: 'subscore_location_availability', type: 'number' },
          { name: 'subscore_expected_cost', type: 'number' },
          { name: 'subscore_punctuality', type: 'number' },
          { name: 'subscore_occurrences', type: 'number' },
          { name: 'subscore_fred_collaboration', type: 'number' },
          // Contribuições Ponderadas (Pontos de 0 a 100)
          { name: 'points_breakdown_json', type: 'json' },
          // Custo Total Esperado Preditivo
          { name: 'nominal_freight_expected', type: 'number' },
          { name: 'pedagio_expected', type: 'number' },
          { name: 'occurrence_risk_cost_expected', type: 'number' },
          { name: 'total_expected_cost', type: 'number' },
          {
            name: 'cost_confidence_level',
            type: 'select',
            values: ['ALTA', 'MEDIA', 'BAIXA', 'INSUFICIENTE'],
          },
          { name: 'cost_range_min', type: 'number' },
          { name: 'cost_range_max', type: 'number' },
          // Explicabilidade da IA
          { name: 'ai_recommendation_justification', type: 'text' },
          { name: 'ai_strengths_json', type: 'json' },
          { name: 'ai_risks_json', type: 'json' },
          { name: 'confidence_statistical', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_fitness_cargo ON cargo_driver_fitness_scores (cargo_id)',
          'CREATE INDEX idx_fitness_driver ON cargo_driver_fitness_scores (driver_id)',
          'CREATE INDEX idx_fitness_score ON cargo_driver_fitness_scores (fitness_score DESC)',
          'CREATE INDEX idx_fitness_cargo_drv ON cargo_driver_fitness_scores (cargo_id, driver_id)',
        ],
      })
      app.save(col)
    }

    // 3. Coleção: selection_decision_audits (Auditoria Completa da Decisão de Contratação / Override Humano)
    if (!app.hasTable('selection_decision_audits')) {
      const col = new Collection({
        name: 'selection_decision_audits',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'cargo_id', type: 'text', required: true },
          { name: 'sap_transport_number', type: 'text' },
          { name: 'template_code_used', type: 'text' },
          { name: 'formula_version_used', type: 'text' },
          { name: 'eligible_candidates_count', type: 'number' },
          { name: 'candidates_snapshot_json', type: 'json' },
          { name: 'ai_top_recommended_driver_id', type: 'text' },
          { name: 'ai_top_recommended_driver_name', type: 'text' },
          { name: 'ai_top_recommended_score', type: 'number' },
          { name: 'ai_top_recommended_expected_cost', type: 'number' },
          { name: 'selected_driver_id', type: 'text', required: true },
          { name: 'selected_driver_name', type: 'text', required: true },
          { name: 'selected_driver_score', type: 'number' },
          { name: 'selected_driver_negotiated_freight', type: 'number' },
          { name: 'selected_driver_total_cost', type: 'number' },
          { name: 'is_human_override', type: 'bool' },
          {
            name: 'override_reason_category',
            type: 'select',
            values: [
              'NENHUM',
              'RELACIONAMENTO_ESTRATEGICO',
              'NECESSIDADE_OPERACIONAL_URGENTE',
              'ACORDO_COMERCIAL_ESPECIFICO',
              'DISPONIBILIDADE_IMEDIATA',
              'DECISAO_GESTAO',
              'OUTRO',
            ],
          },
          { name: 'override_justification_text', type: 'text' },
          { name: 'decided_by_user_email', type: 'text' },
          { name: 'decided_by_user_name', type: 'text' },
          { name: 'decision_timestamp', type: 'date' },
          { name: 'estimated_avoided_cost', type: 'number' }, // Economia estimada da decisão
          { name: 'ai_post_analysis_notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_selaudit_cargo ON selection_decision_audits (cargo_id)',
          'CREATE INDEX idx_selaudit_drv ON selection_decision_audits (selected_driver_id)',
          'CREATE INDEX idx_selaudit_override ON selection_decision_audits (is_human_override)',
        ],
      })
      app.save(col)
    }

    // 4. Coleção: occurrence_costs (Estrutura de Custos Logísticos de Ocorrência por Transporte e Matriz de Responsabilidade)
    if (!app.hasTable('occurrence_costs')) {
      const col = new Collection({
        name: 'occurrence_costs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'sap_transport_number', type: 'text', required: true },
          { name: 'cargo_id', type: 'text' },
          { name: 'customer_code', type: 'text' },
          { name: 'customer_name', type: 'text' },
          { name: 'driver_id', type: 'text' },
          { name: 'driver_name', type: 'text' },
          { name: 'occurrence_id', type: 'text' },
          {
            name: 'occurrence_cost_type',
            type: 'select',
            values: [
              'REENTREGA',
              'DEVOLUCAO',
              'VIAGEM_ADICIONAL',
              'ESPERA_EXTRAORDINARIA',
              'ESTADIA',
              'DIARIA',
              'DESCARGA_ADICIONAL',
              'MOVIMENTACAO_EXTRAORDINARIA',
              'RETORNO',
              'MUDANCA_DE_ROTA',
              'QUILOMETRAGEM_EXTRA',
              'PEDAGIO_ADICIONAL',
              'CUSTO_ADMINISTRATIVO',
              'AVARIA',
              'PERDA',
              'RETRABALHO',
              'HORA_PARADA',
              'CUSTO_COMERCIAL',
              'OUTROS',
            ],
          },
          { name: 'cost_value', type: 'number', required: true },
          // Responsabilidade Financeira (Matriz de Responsabilidade)
          {
            name: 'financial_responsible',
            type: 'select',
            values: [
              'CLIENTE',
              'CIAFAL',
              'MOTORISTA',
              'TRANSPORTADORA',
              'FORNECEDOR_TERCEIRO',
              'COMPARTILHADA',
              'EM_NEGOCIACAO',
              'SUBSIDIADO_CIAFAL',
            ],
          },
          { name: 'impacts_driver_performance', type: 'bool' }, // Por regra, custos do cliente NÃO afetam driver
          {
            name: 'charge_status',
            type: 'select',
            values: [
              'COBRADO_CLIENTE',
              'DEBITADO_PARCEIRO',
              'ABSORVIDO_CIAFAL',
              'PENDENTE_CONCILIACAO',
            ],
          },
          { name: 'evidence_url', type: 'text' },
          { name: 'notes', type: 'text' },
          { name: 'registered_by_user', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_occcost_sap ON occurrence_costs (sap_transport_number)',
          'CREATE INDEX idx_occcost_type ON occurrence_costs (occurrence_cost_type)',
          'CREATE INDEX idx_occcost_resp ON occurrence_costs (financial_responsible)',
        ],
      })
      app.save(col)
    }

    // 5. Coleção: driver_performance_appeals (Direito de Contestação de Avaliação/Ocorrência do Motorista)
    if (!app.hasTable('driver_performance_appeals')) {
      const col = new Collection({
        name: 'driver_performance_appeals',
        type: 'base',
        listRule: '', // Motorista com link temporário pode consultar/criar
        viewRule: '',
        createRule: '',
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'driver_id', type: 'text', required: true },
          { name: 'driver_name', type: 'text', required: true },
          { name: 'driver_phone', type: 'text' },
          { name: 'sap_transport_number', type: 'text' },
          { name: 'occurrence_code', type: 'text' },
          {
            name: 'appeal_type',
            type: 'select',
            values: ['OCORRENCIA_ATRIBUIDA', 'AVALIACAO_NOTA', 'ATRASO_IMPUTADO', 'OUTRO'],
          },
          { name: 'reason_text', type: 'text', required: true },
          { name: 'audio_evidence_url', type: 'text' },
          { name: 'photo_evidence_url', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: [
              'SOLICITADA',
              'EM_ANALISE_HUMANA',
              'DEFERIDA_SCORE_RESTAURADO',
              'INDEFERIDA',
              'AJUSTADA_PARCIALMENTE',
            ],
          },
          { name: 'ai_pre_summary', type: 'text' },
          { name: 'human_reviewer_email', type: 'text' },
          { name: 'human_reviewer_name', type: 'text' },
          { name: 'human_decision_notes', type: 'text' },
          { name: 'decision_timestamp', type: 'date' },
          { name: 'score_impact_reverted', type: 'number' },
          { name: 'notified_driver_fred_status', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_drvapp_drv ON driver_performance_appeals (driver_id)',
          'CREATE INDEX idx_drvapp_status ON driver_performance_appeals (status)',
          'CREATE INDEX idx_drvapp_sap ON driver_performance_appeals (sap_transport_number)',
        ],
      })
      app.save(col)
    }

    // 6. Coleção: driver_feedback_tokens (Tokens Temporários Seguros de Acesso Mobile Fred / LGPD)
    if (!app.hasTable('driver_feedback_tokens')) {
      const col = new Collection({
        name: 'driver_feedback_tokens',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'token', type: 'text', required: true },
          { name: 'driver_id', type: 'text', required: true },
          { name: 'driver_phone', type: 'text', required: true },
          { name: 'sap_transport_number', type: 'text' },
          { name: 'expires_at', type: 'date', required: true },
          { name: 'is_revoked', type: 'bool' },
          { name: 'access_count', type: 'number' },
          { name: 'last_accessed_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_fbtoken_tok ON driver_feedback_tokens (token)',
          'CREATE INDEX idx_fbtoken_drv ON driver_feedback_tokens (driver_id)',
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('driver_feedback_tokens'))
      app.delete(app.findCollectionByNameOrId('driver_performance_appeals'))
      app.delete(app.findCollectionByNameOrId('occurrence_costs'))
      app.delete(app.findCollectionByNameOrId('selection_decision_audits'))
      app.delete(app.findCollectionByNameOrId('cargo_driver_fitness_scores'))
      app.delete(app.findCollectionByNameOrId('selection_criteria_templates'))
    } catch (_) {}
  },
)
