migrate(
  (app) => {
    // 1. Coleção hub_notifications para notificações internas no HUB CIAFAL
    if (!app.hasTable('hub_notifications')) {
      const notifCol = new Collection({
        name: 'hub_notifications',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'recipient_role', type: 'text' },
          { name: 'recipient_name', type: 'text', required: true },
          { name: 'recipient_email', type: 'text' },
          { name: 'sender_name', type: 'text', required: true },
          { name: 'sender_email', type: 'text' },
          { name: 'opportunity_code', type: 'text', required: true },
          { name: 'opportunity_id', type: 'text' },
          { name: 'itinerary_id', type: 'text' },
          { name: 'customer_name', type: 'text' },
          { name: 'customer_sap_code', type: 'text' },
          { name: 'message', type: 'text' },
          { name: 'suggested_products_json', type: 'json' },
          { name: 'link_url', type: 'text' },
          { name: 'is_read', type: 'bool' },
          { name: 'read_at', type: 'date' },
          { name: 'channel', type: 'text' }, // 'HUB', 'EMAIL', 'WHATSAPP'
          { name: 'status', type: 'text' }, // 'PENDING', 'SENT', 'DELIVERED', 'READ'
          { name: 'metadata', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_hub_notif_code ON hub_notifications (opportunity_code)',
          'CREATE INDEX idx_hub_notif_recip ON hub_notifications (recipient_name)',
          'CREATE INDEX idx_hub_notif_created ON hub_notifications (created DESC)',
          'CREATE INDEX idx_hub_notif_read ON hub_notifications (is_read)',
        ],
      })
      app.save(notifCol)
    }

    // 2. Coleção load_complement_learning para aprendizado contínuo do motor de IA
    if (!app.hasTable('load_complement_learning')) {
      const learnCol = new Collection({
        name: 'load_complement_learning',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'opportunity_code', type: 'text', required: true },
          { name: 'opportunity_id', type: 'text' },
          { name: 'customer_sap_code', type: 'text', required: true },
          { name: 'customer_name', type: 'text', required: true },
          { name: 'itinerary_id', type: 'text', required: true },
          { name: 'representative_name', type: 'text', required: true },
          { name: 'material_code', type: 'text' },
          { name: 'material_description', type: 'text' },
          { name: 'suggested_qty_kg', type: 'number' },
          { name: 'confirmed_qty_kg', type: 'number' },
          {
            name: 'outcome',
            type: 'select',
            required: true,
            values: ['SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'UNDER_ANALYSIS'],
            maxSelect: 1,
          },
          { name: 'rejection_reason', type: 'text' },
          { name: 'rejection_notes', type: 'text' },
          { name: 'negotiated_condition', type: 'text' },
          { name: 'response_time_minutes', type: 'number' },
          { name: 'converted', type: 'bool' },
          { name: 'ai_suggested_products_json', type: 'json' },
          { name: 'ai_original_rationale', type: 'text' },
          { name: 'sent_at', type: 'date' },
          { name: 'responded_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_lcl_opp_code ON load_complement_learning (opportunity_code)',
          'CREATE INDEX idx_lcl_cust ON load_complement_learning (customer_sap_code)',
          'CREATE INDEX idx_lcl_itin ON load_complement_learning (itinerary_id)',
          'CREATE INDEX idx_lcl_rep ON load_complement_learning (representative_name)',
          'CREATE INDEX idx_lcl_outcome ON load_complement_learning (outcome)',
        ],
      })
      app.save(learnCol)
    }

    // 3. Garantir campos adicionais de auditoria e resposta comercial em load_complement_opportunities
    const oppsCol = app.findCollectionByNameOrId('load_complement_opportunities')
    if (oppsCol) {
      if (!oppsCol.fields.getByName('commercial_response_status')) {
        oppsCol.fields.add(new TextField({ name: 'commercial_response_status' }))
      }
      if (!oppsCol.fields.getByName('commercial_response_notes')) {
        oppsCol.fields.add(new TextField({ name: 'commercial_response_notes' }))
      }
      if (!oppsCol.fields.getByName('commercial_rejection_reason')) {
        oppsCol.fields.add(new TextField({ name: 'commercial_rejection_reason' }))
      }
      if (!oppsCol.fields.getByName('commercial_negotiated_condition')) {
        oppsCol.fields.add(new TextField({ name: 'commercial_negotiated_condition' }))
      }
      if (!oppsCol.fields.getByName('commercial_confirmed_qty_kg')) {
        oppsCol.fields.add(new NumberField({ name: 'commercial_confirmed_qty_kg' }))
      }
      if (!oppsCol.fields.getByName('commercial_confirmed_material')) {
        oppsCol.fields.add(new TextField({ name: 'commercial_confirmed_material' }))
      }
      if (!oppsCol.fields.getByName('commercial_responded_at')) {
        oppsCol.fields.add(new DateField({ name: 'commercial_responded_at' }))
      }
      if (!oppsCol.fields.getByName('commercial_responded_by')) {
        oppsCol.fields.add(new TextField({ name: 'commercial_responded_by' }))
      }
      if (!oppsCol.fields.getByName('ai_suggested_products_json')) {
        oppsCol.fields.add(new JSONField({ name: 'ai_suggested_products_json' }))
      }
      if (!oppsCol.fields.getByName('ai_message_draft')) {
        oppsCol.fields.add(new TextField({ name: 'ai_message_draft' }))
      }
      if (!oppsCol.fields.getByName('commercial_sent_message')) {
        oppsCol.fields.add(new TextField({ name: 'commercial_sent_message' }))
      }

      app.save(oppsCol)
    }
  },
  (app) => {
    try {
      const notif = app.findCollectionByNameOrId('hub_notifications')
      app.delete(notif)
    } catch (_) {}
    try {
      const learn = app.findCollectionByNameOrId('load_complement_learning')
      app.delete(learn)
    } catch (_) {}
  },
)
