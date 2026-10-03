// Hook de Governança e Segurança para Edição de Transportes — HUB CIAFAL Logística
// Regra: NENHUMA alteração sem validação RBAC, verificação de concorrência, validação de motivo/justificativa e trilha de auditoria imutável

routerAdd(
  'POST',
  '/backend/v1/tms/transports/update-governed',
  (c) => {
    try {
      const auth = c.auth
      if (!auth) {
        return c.json(401, { error: 'Autenticação necessária para editar transporte.' })
      }

      const body = c.requestInfo().body || {}
      const transportId = body.transport_id
      const sapTransportNumber = body.sap_transport_number || ''
      const loadedUpdated = body.loaded_updated_at || ''
      const reason = body.reason || ''
      const customReasonDesc = body.custom_reason_description || ''
      const justification = body.justification || ''
      const changes = body.changes || [] // Array de { field, field_label, old_value, new_value }
      const updatedFields = body.updated_fields || {}
      const requiresApproval = !!body.requires_approval
      const approvalDetails = body.approval_details || {}
      const sapIntegrationStatus = body.sap_integration_status || 'ALTERADO_SOMENTE_HUB'
      const sapResponseMessage = body.sap_response_message || ''
      const sessionId = body.session_id || ''

      // 1. Validações fundamentais
      if (!transportId) {
        return c.json(400, { error: 'ID do transporte é obrigatório.' })
      }

      const validReasons = [
        'Alteração de transportadora',
        'Alteração de motorista',
        'Alteração de veículo',
        'Alteração de placa',
        'Alteração de itinerário',
        'Alteração de rota',
        'Alteração de data de carregamento',
        'Alteração de previsão de entrega',
        'Alteração de remessa',
        'Inclusão de remessa',
        'Exclusão de remessa',
        'Alteração solicitada pelo cliente',
        'Alteração solicitada pelo Comercial',
        'Alteração solicitada pela Expedição',
        'Alteração solicitada pelo PCP',
        'Alteração solicitada pela Transportadora',
        'Correção de cadastro',
        'Correção de integração SAP',
        'Erro operacional',
        'Reprogramação logística',
        'Outro',
      ]

      if (!validReasons.includes(reason)) {
        return c.json(400, {
          error: 'Motivo da alteração inválido ou não selecionado na lista padronizada.',
        })
      }

      if (reason === 'Outro' && (!customReasonDesc || customReasonDesc.trim().length < 5)) {
        return c.json(400, {
          error: 'Quando o motivo for "Outro", é obrigatório fornecer uma descrição detalhada.',
        })
      }

      if (!justification || justification.trim().length < 10) {
        return c.json(400, {
          error: 'A justificativa detalhada é obrigatória e deve conter no mínimo 10 caracteres.',
        })
      }

      if (!Array.isArray(changes) || changes.length === 0) {
        return c.json(400, { error: 'Nenhuma alteração detectada para gravação.' })
      }

      // 2. Localizar registro de transporte
      let transportRecord = null
      try {
        transportRecord = $app.findCollectionByNameOrId('carrier_operational_history')
        transportRecord = $app.findFirstRecordByData(
          'carrier_operational_history',
          'id',
          transportId,
        )
      } catch (_) {
        return c.json(404, { error: 'Registro de transporte não localizado.' })
      }

      // 3. Controle de Concorrência Otimista
      const currentUpdated = transportRecord.getString('updated')
      if (loadedUpdated && currentUpdated && currentUpdated !== loadedUpdated) {
        const lastUser = transportRecord.getString('last_modified_by_user') || 'Outro usuário'
        const lastReason = transportRecord.getString('last_change_reason') || 'Alteração recente'
        return c.json(409, {
          error: 'CONCURRENCY_CONFLICT',
          message: 'Este transporte foi alterado por outro usuário após a abertura desta tela.',
          conflict: {
            current_updated_at: currentUpdated,
            last_user: lastUser,
            last_reason: lastReason,
          },
        })
      }

      // 4. Bloqueios por Status Operacional
      const finalStatus = transportRecord.getString('final_status')
      const userRole = auth.getString('role') || 'operador_logistica'

      if (finalStatus === 'CONCLUIDO' || finalStatus === 'ENCERRADO_COM_OCORRENCIA') {
        if (userRole !== 'admin_master' && userRole !== 'admin_tms') {
          return c.json(403, {
            error:
              'Transporte encerrado/entregue só pode ser alterado por Administradores Master ou TMS.',
          })
        }
      }

      // 5. Aplicar campos atualizados
      const effectiveReason = reason === 'Outro' ? `Outro: ${customReasonDesc.trim()}` : reason

      const currentVersion = transportRecord.getInt('sync_version') || 1
      transportRecord.set('sync_version', currentVersion + 1)
      transportRecord.set('last_modified_by_user', auth.getString('name') || auth.email)
      transportRecord.set('last_modified_by_role', userRole)
      transportRecord.set('last_change_reason', effectiveReason)
      transportRecord.set('last_change_justification', justification.trim())
      transportRecord.set('sap_sync_status', sapIntegrationStatus)

      if (requiresApproval) {
        transportRecord.set('approval_status', 'PENDENTE_APROVACAO')
        transportRecord.set('approval_requester', auth.getString('name') || auth.email)
        transportRecord.set('approval_requested_at', new Date().toISOString())
      }

      // Atualizar chaves permitidas
      const allowedKeys = [
        'carrier_name',
        'driver_name',
        'driver_id',
        'driver_document_full',
        'driver_document_masked',
        'vehicle_plate',
        'trailer_plate',
        'vehicle_type',
        'itinerary_code',
        'itinerary_description',
        'scheduled_entry',
        'expected_loading_time',
        'delivery_estimated_at',
        'weight_kg',
        'weight_ton',
        'discharges_count',
        'destination_city',
        'destination_uf',
        'customers_summary',
        'deliveries_json',
        'logistics_notes',
      ]

      for (let k = 0; k < allowedKeys.length; k++) {
        const key = allowedKeys[k]
        if (updatedFields[key] !== undefined) {
          transportRecord.set(key, updatedFields[key])
        }
      }

      $app.save(transportRecord)

      // 6. Gravar Trilha de Auditoria Imutável (audit_logs)
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const correlationId = 'TRANS-EDIT-' + transportId + '-' + Date.now()
      const createdAuditIds = []

      for (let i = 0; i < changes.length; i++) {
        const change = changes[i]
        const log = new Record(auditCol)

        log.set('user_email', auth.email)
        log.set('user_name', auth.getString('name') || 'Operador HUB')
        log.set('user_role', userRole)
        log.set('action', 'EDIT_TRANSPORT')
        log.set('resource', 'carrier_operational_history')
        log.set('resource_id', transportId)
        log.set('previous_state', String(change.old_value ?? ''))
        log.set('new_state', String(change.new_value ?? ''))
        log.set('reason', effectiveReason)
        log.set('correlation_id', correlationId)
        log.set('sap_transport_number', sapTransportNumber)
        log.set('delivery_number', change.delivery_number || '')
        log.set('order_number', change.order_number || '')
        log.set('field_name', change.field)
        log.set('field_label', change.field_label || change.field)
        log.set('reason_code', reason)
        log.set('justification', justification.trim())
        log.set('sap_sync_status', sapIntegrationStatus)
        log.set('sap_sync_at', new Date().toISOString())
        log.set('sap_response_message', sapResponseMessage)
        log.set('session_id', sessionId)
        log.set('ip_address', c.realIP() || '127.0.0.1')
        log.set('payload', {
          transport_order_number: transportRecord.getString('transport_order_number'),
          sap_transport_number: sapTransportNumber,
          field: change.field,
          field_label: change.field_label,
          old_value: change.old_value,
          new_value: change.new_value,
          custom_reason: customReasonDesc,
          requires_approval: requiresApproval,
          approval_details: approvalDetails,
        })

        $app.save(log)
        createdAuditIds.push(log.id)
      }

      return c.json(200, {
        success: true,
        message: 'Transporte atualizado com sucesso.',
        transport_id: transportId,
        sap_transport_number: sapTransportNumber,
        sync_version: currentVersion + 1,
        updated_at: transportRecord.getString('updated'),
        audit_log_ids: createdAuditIds,
        audit_correlation_id: correlationId,
        sap_sync_status: sapIntegrationStatus,
        changes_count: changes.length,
      })
    } catch (err) {
      return c.json(500, {
        error: 'Falha interna ao salvar alterações do transporte: ' + (err.message || err),
      })
    }
  },
  $apis.requireAuth(),
)
