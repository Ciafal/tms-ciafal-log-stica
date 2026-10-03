migrate(
  (app) => {
    // 1. Estender audit_logs com campos dedicados para auditoria de transportes
    const auditCol = app.findCollectionByNameOrId('audit_logs')

    if (!auditCol.fields.getByName('sap_transport_number')) {
      auditCol.fields.add(new TextField({ name: 'sap_transport_number' }))
    }
    if (!auditCol.fields.getByName('delivery_number')) {
      auditCol.fields.add(new TextField({ name: 'delivery_number' }))
    }
    if (!auditCol.fields.getByName('order_number')) {
      auditCol.fields.add(new TextField({ name: 'order_number' }))
    }
    if (!auditCol.fields.getByName('field_name')) {
      auditCol.fields.add(new TextField({ name: 'field_name' }))
    }
    if (!auditCol.fields.getByName('field_label')) {
      auditCol.fields.add(new TextField({ name: 'field_label' }))
    }
    if (!auditCol.fields.getByName('reason_code')) {
      auditCol.fields.add(new TextField({ name: 'reason_code' }))
    }
    if (!auditCol.fields.getByName('justification')) {
      auditCol.fields.add(new TextField({ name: 'justification' }))
    }
    if (!auditCol.fields.getByName('sap_sync_status')) {
      auditCol.fields.add(
        new SelectField({
          name: 'sap_sync_status',
          values: [
            'SINCRONIZADO',
            'AGUARDANDO_SINCRONIZACAO',
            'ERRO_SINCRONIZACAO',
            'ALTERADO_SOMENTE_HUB',
            'PENDENTE_APROVACAO',
            'NAO_APLICAVEL',
          ],
          maxSelect: 1,
        }),
      )
    }
    if (!auditCol.fields.getByName('sap_sync_at')) {
      auditCol.fields.add(new DateField({ name: 'sap_sync_at' }))
    }
    if (!auditCol.fields.getByName('sap_response_message')) {
      auditCol.fields.add(new TextField({ name: 'sap_response_message' }))
    }
    if (!auditCol.fields.getByName('session_id')) {
      auditCol.fields.add(new TextField({ name: 'session_id' }))
    }

    auditCol.addIndex('idx_audit_sap_transport', false, 'sap_transport_number', '')
    auditCol.addIndex('idx_audit_delivery_number', false, 'delivery_number', '')

    app.save(auditCol)

    // 2. Estender carrier_operational_history com campos de governança de versão e integridade
    const carrierCol = app.findCollectionByNameOrId('carrier_operational_history')

    if (!carrierCol.fields.getByName('sync_version')) {
      carrierCol.fields.add(new NumberField({ name: 'sync_version' }))
    }
    if (!carrierCol.fields.getByName('last_modified_by_user')) {
      carrierCol.fields.add(new TextField({ name: 'last_modified_by_user' }))
    }
    if (!carrierCol.fields.getByName('last_modified_by_role')) {
      carrierCol.fields.add(new TextField({ name: 'last_modified_by_role' }))
    }
    if (!carrierCol.fields.getByName('last_change_reason')) {
      carrierCol.fields.add(new TextField({ name: 'last_change_reason' }))
    }
    if (!carrierCol.fields.getByName('last_change_justification')) {
      carrierCol.fields.add(new TextField({ name: 'last_change_justification' }))
    }
    if (!carrierCol.fields.getByName('sap_sync_status')) {
      carrierCol.fields.add(
        new SelectField({
          name: 'sap_sync_status',
          values: [
            'SINCRONIZADO',
            'AGUARDANDO_SINCRONIZACAO',
            'ERRO_SINCRONIZACAO',
            'ALTERADO_SOMENTE_HUB',
            'PENDENTE_APROVACAO',
          ],
          maxSelect: 1,
        }),
      )
    }
    if (!carrierCol.fields.getByName('approval_status')) {
      carrierCol.fields.add(
        new SelectField({
          name: 'approval_status',
          values: ['APROVADO', 'PENDENTE_APROVACAO', 'REJEITADO', 'NAO_REQUER_APROVACAO'],
          maxSelect: 1,
        }),
      )
    }
    if (!carrierCol.fields.getByName('approval_requester')) {
      carrierCol.fields.add(new TextField({ name: 'approval_requester' }))
    }
    if (!carrierCol.fields.getByName('approval_approver')) {
      carrierCol.fields.add(new TextField({ name: 'approval_approver' }))
    }
    if (!carrierCol.fields.getByName('approval_requested_at')) {
      carrierCol.fields.add(new DateField({ name: 'approval_requested_at' }))
    }
    if (!carrierCol.fields.getByName('approval_decided_at')) {
      carrierCol.fields.add(new DateField({ name: 'approval_decided_at' }))
    }
    if (!carrierCol.fields.getByName('deliveries_json')) {
      carrierCol.fields.add(new JSONField({ name: 'deliveries_json' }))
    }
    if (!carrierCol.fields.getByName('company_code')) {
      carrierCol.fields.add(new TextField({ name: 'company_code' }))
    }
    if (!carrierCol.fields.getByName('origin_system_source')) {
      carrierCol.fields.add(new TextField({ name: 'origin_system_source' }))
    }
    if (!carrierCol.fields.getByName('expected_loading_time')) {
      carrierCol.fields.add(new TextField({ name: 'expected_loading_time' }))
    }
    if (!carrierCol.fields.getByName('logistics_notes')) {
      carrierCol.fields.add(new TextField({ name: 'logistics_notes' }))
    }

    app.save(carrierCol)
  },
  (app) => {
    // Reversão segura
    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      auditCol.removeIndex('idx_audit_sap_transport')
      auditCol.removeIndex('idx_audit_delivery_number')
      app.save(auditCol)
    } catch (_) {}
  },
)
