/// <reference path="../pb_data/types.d.ts" />
/**
 * Migração 0027: Correção de Conformidade — Remoção de Dados Fictícios Semeados na 0026
 *
 * Requisito: "NÃO UTILIZAR DADOS FICTÍCIOS EM PRODUÇÃO"
 * Remove exclusivamente os registros demonstrativos identificados por chave inseridos na 0026:
 * - qlik_profitability_records: corr-qlik-001, corr-qlik-002, corr-qlik-003
 * - smart_selection_savings_ledger: corr-savings-001, corr-savings-002, corr-savings-003
 * - ai_weight_learning_proposals: PROP-2025-01
 *
 * Migração idempotente e sem re-semeadura.
 */

migrate(
  (app) => {
    // 1. Remover registros fictícios de qlik_profitability_records
    if (app.hasTable('qlik_profitability_records')) {
      const qlikCorrs = ['corr-qlik-001', 'corr-qlik-002', 'corr-qlik-003']
      for (const corr of qlikCorrs) {
        try {
          const records = app.findRecordsByFilter(
            'qlik_profitability_records',
            `correlation_id = '${corr}'`,
            '-created',
            50,
            0,
          )
          for (const rec of records) {
            app.delete(rec)
          }
        } catch (e) {
          // Idempotência
        }
      }
    }

    // 2. Remover registros fictícios de smart_selection_savings_ledger
    if (app.hasTable('smart_selection_savings_ledger')) {
      const savingsCorrs = ['corr-savings-001', 'corr-savings-002', 'corr-savings-003']
      for (const corr of savingsCorrs) {
        try {
          const records = app.findRecordsByFilter(
            'smart_selection_savings_ledger',
            `correlation_id = '${corr}'`,
            '-created',
            50,
            0,
          )
          for (const rec of records) {
            app.delete(rec)
          }
        } catch (e) {
          // Idempotência
        }
      }
    }

    // 3. Remover propostas fictícias de ai_weight_learning_proposals
    if (app.hasTable('ai_weight_learning_proposals')) {
      try {
        const records = app.findRecordsByFilter(
          'ai_weight_learning_proposals',
          "proposal_code = 'PROP-2025-01'",
          '-created',
          50,
          0,
        )
        for (const rec of records) {
          app.delete(rec)
        }
      } catch (e) {
        // Idempotência
      }
    }
  },
  (app) => {
    // Revert logic (no-op para manter conformidade limpa)
  },
)
