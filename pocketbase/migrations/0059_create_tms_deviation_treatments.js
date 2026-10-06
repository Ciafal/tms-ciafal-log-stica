migrate(
  (app) => {
    // 1. Coleção tms_deviation_treatments (Workflow completo de 8 etapas para tratamento de desvios de KPIs do TMS)
    if (!app.hasTable('tms_deviation_treatments')) {
      const colTreatments = new Collection({
        name: 'tms_deviation_treatments',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'treatment_code', type: 'text', required: true }, // ex: TRAT-TMS-2026-09-0012
          { name: 'kpi_id', type: 'text', required: true },
          { name: 'kpi_name', type: 'text', required: true },
          {
            name: 'category',
            type: 'select',
            required: true,
            values: ['EXPEDICAO', 'LOGISTICA', 'TRANSPORTE'],
            maxSelect: 1,
          },
          { name: 'company', type: 'text' },
          { name: 'center', type: 'text' },
          { name: 'period_ref', type: 'text', required: true }, // ex: "Setembro/2026"
          { name: 'month', type: 'number', required: true },
          { name: 'year', type: 'number', required: true },
          { name: 'target_value', type: 'number', required: true },
          { name: 'real_value', type: 'number', required: true },
          { name: 'unit', type: 'text', required: true },
          { name: 'deviation_abs', type: 'number', required: true },
          { name: 'deviation_pct', type: 'number', required: true },
          { name: 'trend_label', type: 'text' }, // ex: "Queda", "Alta", "Estável"
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'EM_ANALISE',
              'PLANO_CRIADO',
              'EM_EXECUCAO',
              'AGUARDANDO_EFICACIA',
              'CONCLUIDO_EFICAZ',
              'CONCLUIDO_PARCIAL',
              'CONCLUIDO_INEFICAZ',
              'CANCELADO',
            ],
            maxSelect: 1,
          },
          { name: 'current_step', type: 'number', required: true }, // 1 a 8

          // Responsabilidades (com usuários reais do HUB)
          { name: 'responsible_analyst_id', type: 'text', required: true },
          { name: 'responsible_analyst_name', type: 'text', required: true },
          { name: 'responsible_analyst_email', type: 'text', required: true },
          { name: 'area_supervisor_id', type: 'text' },
          { name: 'area_supervisor_name', type: 'text' },
          { name: 'area_supervisor_email', type: 'text' },
          { name: 'plan_approver_id', type: 'text' },
          { name: 'plan_approver_name', type: 'text' },
          { name: 'plan_approver_email', type: 'text' },

          // Etapa 1: Identificação e descrição automática do desvio
          { name: 'deviation_description', type: 'text', required: true },
          { name: 'ai_initial_analysis', type: 'text' },
          { name: 'ai_analysis_json', type: 'json' },

          // Etapa 2: Hipóteses de Análise de Causa
          { name: 'hypotheses_json', type: 'json' },

          // Etapa 3: 5 Porquês
          { name: 'five_whys_json', type: 'json' },

          // Etapa 4: Ishikawa 6M
          { name: 'ishikawa_json', type: 'json' },

          // Etapa 5: Causa Raiz Validada
          { name: 'root_causes_json', type: 'json' },
          { name: 'root_cause_validated', type: 'bool' },
          { name: 'impossibility_justification', type: 'text' },

          // Etapa 6: Plano de Ação 5W2H
          { name: 'actions_5w2h_json', type: 'json' },

          // Etapa 7: Acompanhamento & Histórico
          { name: 'tracking_updates_json', type: 'json' },

          // Etapa 8: Eficácia
          { name: 'effectiveness_status', type: 'text' }, // EFICAZ | PARCIALMENTE_EFICAZ | INEFICAZ | AGUARDANDO_AVALIACAO
          { name: 'effectiveness_before_value', type: 'number' },
          { name: 'effectiveness_after_value', type: 'number' },
          { name: 'effectiveness_evaluation_notes', type: 'text' },
          { name: 'effectiveness_evaluated_at', type: 'date' },
          { name: 'effectiveness_evaluated_by', type: 'text' },
          { name: 'effectiveness_ai_opinion', type: 'text' },

          // Vínculos & metadados
          { name: 'linked_sap_orders', type: 'text' },
          { name: 'origin_filters_json', type: 'json' },
          { name: 'metadata_json', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_tms_treatment_code ON tms_deviation_treatments (treatment_code)',
          'CREATE INDEX idx_tms_treatment_kpi ON tms_deviation_treatments (kpi_id, year, month)',
          'CREATE INDEX idx_tms_treatment_status ON tms_deviation_treatments (status)',
          'CREATE INDEX idx_tms_treatment_resp ON tms_deviation_treatments (responsible_analyst_id)',
        ],
      })
      app.save(colTreatments)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('tms_deviation_treatments')
      app.delete(col)
    } catch (_) {}
  },
)
