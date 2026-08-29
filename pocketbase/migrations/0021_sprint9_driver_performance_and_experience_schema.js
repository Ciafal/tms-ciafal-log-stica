/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Coleção: driver_performance_scores (Score do Motorista, Dimensões e Versionamento)
    if (!app.hasTable('driver_performance_scores')) {
      const col = new Collection({
        name: 'driver_performance_scores',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'driver_id', type: 'text', required: true },
          { name: 'driver_name', type: 'text', required: true },
          { name: 'driver_document', type: 'text' },
          { name: 'driver_phone', type: 'text' },
          { name: 'carrier_name', type: 'text' },
          { name: 'score_consolidated', type: 'number', required: true }, // 0 a 100
          { name: 'score_objective', type: 'number', required: true }, // 0 a 100
          { name: 'score_evaluative', type: 'number', required: true }, // 0 a 100
          { name: 'stars_rating', type: 'number' }, // 1.0 a 5.0
          {
            name: 'classification',
            type: 'select',
            values: ['EXCELENTE', 'MUITO_BOM', 'ADEQUADO', 'ATENCAO', 'NECESSITA_AVALIACAO'],
          },
          {
            name: 'operational_status',
            type: 'select',
            values: ['ATIVO', 'PREFERENCIAL', 'EM_OBSERVACAO', 'SUSPENSO', 'BLOQUEADO', 'INATIVO'],
          },
          {
            name: 'confidence_level',
            type: 'select',
            values: ['PROVISORIO_AMOSTRA_INSUFICIENTE', 'CONFIANCA_MODERADA', 'SCORE_CONSOLIDADO'],
          },
          { name: 'trips_evaluated_count', type: 'number' },
          { name: 'last_transport_sap', type: 'text' },
          { name: 'last_evaluation_date', type: 'date' },
          // Subscores das 7 dimensões (0 a 100)
          { name: 'score_punctuality', type: 'number' },
          { name: 'score_route_adherence', type: 'number' },
          { name: 'score_communication', type: 'number' },
          { name: 'score_fred_collaboration', type: 'number' },
          { name: 'score_delivery_quality', type: 'number' },
          { name: 'score_procedure_doc', type: 'number' },
          { name: 'score_human_evaluations', type: 'number' },
          // Experiência do motorista com a CIAFAL (mão dupla)
          { name: 'ciafal_experience_score', type: 'number' }, // 0 a 100
          { name: 'driver_nps_rating', type: 'number' }, // 0 a 10
          // Metadados, audit e explicabilidade
          { name: 'formula_model_version', type: 'text' }, // ex: "Modelo Score v1.0"
          { name: 'parameters_used_json', type: 'json' },
          { name: 'weights_applied_json', type: 'json' },
          { name: 'explicability_json', type: 'json' },
          { name: 'monthly_trend_json', type: 'json' },
          { name: 'badges_recognition_json', type: 'json' },
          { name: 'status_audit_log_json', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_drv_perf_id ON driver_performance_scores (driver_id)',
          'CREATE INDEX idx_drv_perf_score ON driver_performance_scores (score_consolidated)',
          'CREATE INDEX idx_drv_perf_status ON driver_performance_scores (operational_status)',
          'CREATE INDEX idx_drv_perf_class ON driver_performance_scores (classification)',
        ],
      })
      app.save(col)
    }

    // 2. Coleção: transport_performance_evaluations (Avaliação Detalhada por Transporte pós-Fred)
    if (!app.hasTable('transport_performance_evaluations')) {
      const col = new Collection({
        name: 'transport_performance_evaluations',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'sap_transport_number', type: 'text', required: true },
          { name: 'cargo_id', type: 'text' },
          { name: 'driver_id', type: 'text', required: true },
          { name: 'driver_name', type: 'text', required: true },
          { name: 'vehicle_plate', type: 'text' },
          { name: 'carrier_name', type: 'text' },
          { name: 'itinerary_code', type: 'text' },
          { name: 'formula_version', type: 'text' },
          // Notas do Transporte (0 a 100)
          { name: 'driver_trip_score', type: 'number' },
          { name: 'score_breakdown_json', type: 'json' },
          // Fatos Coletados pelo Fred
          { name: 'total_delay_minutes_gross', type: 'number' },
          { name: 'delay_minutes_driver_imputable', type: 'number' },
          { name: 'delay_breakdown_json', type: 'json' },
          { name: 'route_deviations_count', type: 'number' },
          { name: 'authorized_deviations_count', type: 'number' },
          { name: 'fred_interactions_count', type: 'number' },
          { name: 'fred_collaboration_pct', type: 'number' },
          { name: 'occurrences_summary_json', type: 'json' },
          { name: 'occurrences_discarded_json', type: 'json' },
          { name: 'justifications_json', type: 'json' },
          // Avaliações de Mão Dupla do Transporte
          { name: 'driver_ciafal_eval_json', type: 'json' }, // Notas que motorista deu para CIAFAL
          { name: 'driver_client_evals_json', type: 'json' }, // Notas que motorista deu para os Clientes
          { name: 'ciafal_driver_eval_json', type: 'json' }, // Notas humanas de expedição/comercial
          { name: 'ai_synthesis_explanation', type: 'text' },
          { name: 'is_reviewed_by_human', type: 'bool' },
          { name: 'reviewed_by_user', type: 'text' },
          { name: 'review_notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_transpeval_sap ON transport_performance_evaluations (sap_transport_number)',
          'CREATE INDEX idx_transpeval_driver ON transport_performance_evaluations (driver_id)',
          'CREATE INDEX idx_transpeval_itin ON transport_performance_evaluations (itinerary_code)',
        ],
      })
      app.save(col)
    }

    // 3. Coleção: driver_ciafal_surveys (Pesquisas e Avaliações de Experiência com a CIAFAL + NPS)
    if (!app.hasTable('driver_ciafal_surveys')) {
      const col = new Collection({
        name: 'driver_ciafal_surveys',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'sap_transport_number', type: 'text', required: true },
          { name: 'driver_id', type: 'text', required: true },
          { name: 'driver_name', type: 'text', required: true },
          { name: 'carrier_name', type: 'text' },
          { name: 'origin_plant', type: 'text' },
          { name: 'expedition_shift', type: 'text' }, // Turno 1, Turno 2, etc.
          { name: 'cargo_type', type: 'text' },
          // Critérios de 1 a 5
          { name: 'rating_arrival_reception', type: 'number' }, // Atendimento na chegada
          { name: 'rating_waiting_time', type: 'number' }, // Tempo de espera
          { name: 'rating_loading_process', type: 'number' }, // Processo de carregamento
          { name: 'rating_info_clarity', type: 'number' }, // Clareza das informações
          { name: 'rating_invoicing_doc', type: 'number' }, // Processo de faturamento/documentação
          { name: 'rating_trip_communication', type: 'number' }, // Comunicação durante a viagem
          { name: 'rating_fred_experience', type: 'number' }, // Experiência com o Fred
          { name: 'rating_overall_ciafal', type: 'number' }, // Experiência geral com a CIAFAL
          { name: 'score_calculated_pct', type: 'number' }, // 0 a 100
          // NPS de 0 a 10
          { name: 'nps_recommendation_score', type: 'number' }, // 0 a 10
          {
            name: 'nps_category',
            type: 'select',
            values: ['PROMOTOR', 'NEUTRO', 'DETRATOR'],
          },
          // Feedback Aberto & Áudio
          { name: 'feedback_text', type: 'text' },
          { name: 'audio_file_url', type: 'text' },
          { name: 'audio_transcription', type: 'text' },
          { name: 'ai_sentiment', type: 'text' }, // Positivo, Neutro, Crítico
          // Validação Cruzada contra Fatos da Expedição
          { name: 'expedition_dwell_time_min', type: 'number' },
          { name: 'fact_consistency_status', type: 'text' }, // Consistente com os dados / Abaixo do esperado / Acima do esperado
          { name: 'fact_consistency_explanation', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ciafalsurv_driver ON driver_ciafal_surveys (driver_id)',
          'CREATE INDEX idx_ciafalsurv_sap ON driver_ciafal_surveys (sap_transport_number)',
          'CREATE INDEX idx_ciafalsurv_nps ON driver_ciafal_surveys (nps_category)',
          'CREATE INDEX idx_ciafalsurv_shift ON driver_ciafal_surveys (expedition_shift)',
        ],
      })
      app.save(col)
    }

    // 4. Coleção: client_logistic_evaluations (Avaliação de Clientes pelo Motorista e Fatos)
    if (!app.hasTable('client_logistic_evaluations')) {
      const col = new Collection({
        name: 'client_logistic_evaluations',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'customer_code', type: 'text', required: true },
          { name: 'customer_name', type: 'text', required: true },
          { name: 'sap_transport_number', type: 'text', required: true },
          { name: 'driver_id', type: 'text' },
          { name: 'driver_name', type: 'text' },
          // Notas dadas pelo motorista (1 a 5)
          { name: 'rating_access_ease', type: 'number' }, // Facilidade de acesso
          { name: 'rating_organization', type: 'number' }, // Organização
          { name: 'rating_waiting_time', type: 'number' }, // Tempo de espera
          { name: 'rating_reception_service', type: 'number' }, // Atendimento na recepção
          { name: 'rating_unloading_structure', type: 'number' }, // Estrutura de descarga
          { name: 'rating_guidance_clarity', type: 'number' }, // Orientação da equipe
          { name: 'score_pct', type: 'number' }, // 0 a 100
          { name: 'feedback_text', type: 'text' },
          // Tempos Reais Registrados
          { name: 'waiting_time_minutes', type: 'number' },
          { name: 'unloading_time_minutes', type: 'number' },
          { name: 'total_dwell_minutes', type: 'number' },
          { name: 'window_complied', type: 'bool' },
          { name: 'occurrences_count', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_clieval_cust ON client_logistic_evaluations (customer_code)',
          'CREATE INDEX idx_clieval_sap ON client_logistic_evaluations (sap_transport_number)',
          'CREATE INDEX idx_clieval_driver ON client_logistic_evaluations (driver_id)',
        ],
      })
      app.save(col)
    }

    // 5. Coleção: customer_logistic_profiles (Score Logístico do Cliente — Uso Interno TMS/CRM)
    if (!app.hasTable('customer_logistic_profiles')) {
      const col = new Collection({
        name: 'customer_logistic_profiles',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'customer_code', type: 'text', required: true },
          { name: 'customer_name', type: 'text', required: true },
          { name: 'customer_city', type: 'text' },
          { name: 'customer_uf', type: 'text' },
          { name: 'sales_rep', type: 'text' },
          { name: 'customer_tier', type: 'text' },
          { name: 'logistic_score', type: 'number', required: true }, // 0 a 100
          { name: 'stars_rating', type: 'number' }, // 1 a 5
          {
            name: 'logistic_classification',
            type: 'select',
            values: ['EXCELENTE', 'BOM', 'REGULAR', 'CRITICO_REQUER_NEGOCIACAO'],
          },
          { name: 'deliveries_analyzed_count', type: 'number' },
          { name: 'avg_waiting_time_min', type: 'number' },
          { name: 'avg_unloading_time_min', type: 'number' },
          { name: 'p90_unloading_time_min', type: 'number' },
          { name: 'window_compliance_rate_pct', type: 'number' },
          { name: 'occurrences_rate_pct', type: 'number' },
          { name: 'avg_driver_rating', type: 'number' }, // Média das avaliações dos motoristas
          { name: 'recurring_issues_json', type: 'json' },
          { name: 'ai_recommendations', type: 'text' },
          { name: 'financial_impact_notes', type: 'text' },
          { name: 'best_matched_drivers_json', type: 'json' }, // Afinidade de motoristas
          { name: 'is_confidential_internal', type: 'bool' }, // Sempre true por regra
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_custlog_code ON customer_logistic_profiles (customer_code)',
          'CREATE INDEX idx_custlog_score ON customer_logistic_profiles (logistic_score)',
          'CREATE INDEX idx_custlog_class ON customer_logistic_profiles (logistic_classification)',
        ],
      })
      app.save(col)
    }

    // 6. Coleção: performance_responsibility_matrix (Matriz de Responsabilidade e Evidências)
    if (!app.hasTable('performance_responsibility_matrix')) {
      const col = new Collection({
        name: 'performance_responsibility_matrix',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'occurrence_code', type: 'text', required: true },
          { name: 'sap_transport_number', type: 'text', required: true },
          { name: 'driver_id', type: 'text' },
          { name: 'driver_name', type: 'text' },
          { name: 'customer_code', type: 'text' },
          { name: 'customer_name', type: 'text' },
          { name: 'category', type: 'text', required: true },
          { name: 'description', type: 'text', required: true },
          // Matriz de Responsabilidade (Permite Múltiplos)
          {
            name: 'primary_responsible',
            type: 'select',
            values: [
              'MOTORISTA',
              'TRANSPORTADORA',
              'CIAFAL',
              'EXPEDICAO_CIAFAL',
              'FATURAMENTO',
              'COMERCIAL',
              'PCP',
              'TMS_PLANEJAMENTO',
              'CLIENTE',
              'FORNECEDOR_TERCEIRO',
              'RODOVIA_TRANSITO',
              'FORCA_MAIOR',
              'COMPARTILHADA',
              'NAO_IDENTIFICADA',
            ],
          },
          { name: 'contributing_actors_json', type: 'json' },
          { name: 'root_cause_explanation', type: 'text' },
          { name: 'evidence_ids_json', type: 'json' },
          // Decomposição de Atraso e Impacto
          { name: 'total_impact_minutes', type: 'number' },
          { name: 'minutes_driver_imputable', type: 'number' },
          { name: 'minutes_ciafal_imputable', type: 'number' },
          { name: 'minutes_client_imputable', type: 'number' },
          { name: 'minutes_external_imputable', type: 'number' },
          { name: 'driver_score_penalty_points', type: 'number' }, // 0 se não for culpa do motorista
          // Hipótese e Confiança da IA
          { name: 'ai_hypothesis', type: 'text' },
          {
            name: 'ai_confidence_level',
            type: 'select',
            values: ['ALTA', 'MEDIA', 'BAIXA'],
          },
          { name: 'ai_confidence_pct', type: 'number' },
          { name: 'ai_next_recommended_action', type: 'text' },
          { name: 'driver_justification_status', type: 'text' }, // AGUARDANDO | JUSTIFICADO | RECUSADO | ISENTO
          { name: 'driver_justification_text', type: 'text' },
          { name: 'driver_justification_audio_url', type: 'text' },
          { name: 'is_human_verified', type: 'bool' },
          { name: 'verified_by_user', type: 'text' },
          { name: 'verified_at', type: 'date' },
          { name: 'verification_notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_prm_sap ON performance_responsibility_matrix (sap_transport_number)',
          'CREATE INDEX idx_prm_driver ON performance_responsibility_matrix (driver_id)',
          'CREATE INDEX idx_prm_resp ON performance_responsibility_matrix (primary_responsible)',
          'CREATE INDEX idx_prm_conf ON performance_responsibility_matrix (ai_confidence_level)',
        ],
      })
      app.save(col)
    }

    // 7. Coleção: performance_score_parameters (Pesos Parametrizáveis e Governança de Fórmulas)
    if (!app.hasTable('performance_score_parameters')) {
      const col = new Collection({
        name: 'performance_score_parameters',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'model_version', type: 'text', required: true }, // ex: "Modelo Score v1.0"
          { name: 'is_active', type: 'bool' },
          { name: 'description', type: 'text' },
          // 7 Dimensões Parametrizáveis (Soma = 100%)
          { name: 'weight_punctuality_pct', type: 'number' }, // 20%
          { name: 'weight_route_adherence_pct', type: 'number' }, // 15%
          { name: 'weight_communication_pct', type: 'number' }, // 15%
          { name: 'weight_fred_collaboration_pct', type: 'number' }, // 10%
          { name: 'weight_delivery_quality_pct', type: 'number' }, // 15%
          { name: 'weight_procedure_doc_pct', type: 'number' }, // 10%
          { name: 'weight_human_evaluations_pct', type: 'number' }, // 15%
          // Regras de Amostra Mínima
          { name: 'min_trips_provisional', type: 'number' }, // 5
          { name: 'min_trips_consolidated', type: 'number' }, // 20
          // Critérios para Motorista Preferencial (⭐)
          { name: 'preferential_min_score', type: 'number' }, // 90
          { name: 'preferential_min_trips', type: 'number' }, // 20
          { name: 'preferential_clean_days', type: 'number' }, // 90 dias sem ocorrência grave
          // Critérios para Observação (⚠️)
          { name: 'observation_score_threshold', type: 'number' }, // < 70
          { name: 'observation_drop_threshold_points', type: 'number' }, // Queda > 15 pontos
          { name: 'approved_by_user', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_perfparam_model ON performance_score_parameters (model_version)',
          'CREATE INDEX idx_perfparam_active ON performance_score_parameters (is_active)',
        ],
      })
      app.save(col)
    }

    // 8. Coleção: performance_audit_ledger (Trilha Imutável de Auditoria dos Scores)
    if (!app.hasTable('performance_audit_ledger')) {
      const col = new Collection({
        name: 'performance_audit_ledger',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'driver_id', type: 'text', required: true },
          { name: 'driver_name', type: 'text', required: true },
          { name: 'transport_sap', type: 'text' },
          { name: 'event_type', type: 'text', required: true }, // SCORE_CALCULATED | SCORE_REVISED | STATUS_CHANGED | JUSTIFICATION_APPROVED
          { name: 'score_before', type: 'number' },
          { name: 'score_after', type: 'number' },
          { name: 'formula_version_used', type: 'text' },
          { name: 'weights_snapshot_json', type: 'json' },
          { name: 'included_events_json', type: 'json' },
          { name: 'discarded_events_json', type: 'json' },
          { name: 'justifications_applied_json', type: 'json' },
          { name: 'user_email', type: 'text' },
          { name: 'user_name', type: 'text' },
          { name: 'human_notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_perfaudit_drv ON performance_audit_ledger (driver_id)',
          'CREATE INDEX idx_perfaudit_event ON performance_audit_ledger (event_type)',
          'CREATE INDEX idx_perfaudit_created ON performance_audit_ledger (created DESC)',
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('performance_audit_ledger'))
      app.delete(app.findCollectionByNameOrId('performance_score_parameters'))
      app.delete(app.findCollectionByNameOrId('performance_responsibility_matrix'))
      app.delete(app.findCollectionByNameOrId('customer_logistic_profiles'))
      app.delete(app.findCollectionByNameOrId('client_logistic_evaluations'))
      app.delete(app.findCollectionByNameOrId('driver_ciafal_surveys'))
      app.delete(app.findCollectionByNameOrId('transport_performance_evaluations'))
      app.delete(app.findCollectionByNameOrId('driver_performance_scores'))
    } catch (_) {}
  },
)
