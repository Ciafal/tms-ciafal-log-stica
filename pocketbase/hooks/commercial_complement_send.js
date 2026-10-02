// Hook de validação no backend: Controle de envio comercial de oportunidades de complemento
// Garante validação de impedimentos (bloqueios), duplicidade e auditoria de forma estrita

routerAdd('POST', '/backend/v1/commercial-complement/send-batch', (e) => {
  const reqData = e.requestInfo().body || {}
  const opportunityIds = Array.isArray(reqData.opportunity_ids) ? reqData.opportunity_ids : []
  const isResend = Boolean(reqData.is_resend)
  const resendReason = reqData.resend_reason || ''

  // Recupera usuário do request
  const authRecord = e.auth
  const userEmail = authRecord ? authRecord.email : reqData.user_email || 'operador@ciafal.com.br'
  const userName = authRecord
    ? authRecord.name || 'Operador Logístico'
    : reqData.user_name || 'Operador Logístico'
  const userRole = authRecord
    ? authRecord.role || 'gerente_carga'
    : reqData.user_role || 'gerente_carga'

  // Validação RBAC no backend
  // Apenas admin_master, admin_tms, gestor_logistica, gerente_carga, operador_logistica, comercial podem enviar
  const allowedRoles = [
    'admin_master',
    'admin_tms',
    'gestor_logistica',
    'gerente_carga',
    'operador_logistica',
    'comercial',
  ]
  if (!allowedRoles.includes(userRole)) {
    return e.json(403, {
      success: false,
      message:
        'Acesso negado: seu perfil (' +
        userRole +
        ') não tem permissão para enviar oportunidades ao Comercial.',
    })
  }

  // Permissão estrita para reenvio
  if (isResend) {
    const allowedResendRoles = ['admin_master', 'admin_tms', 'gestor_logistica', 'gerente_carga']
    if (!allowedResendRoles.includes(userRole)) {
      return e.json(403, {
        success: false,
        message:
          'Permissão insuficiente: apenas Administradores e Gestores podem autorizar o reenvio ao Comercial.',
      })
    }
  }

  if (opportunityIds.length === 0) {
    return e.json(400, {
      success: false,
      message: 'Nenhuma oportunidade selecionada para envio.',
    })
  }

  const results = []
  const auditCol = $app.findCollectionByNameOrId('audit_logs')
  const histCol = $app.findCollectionByNameOrId('load_complement_history')
  const oppCol = $app.findCollectionByNameOrId('load_complement_opportunities')

  for (let i = 0; i < opportunityIds.length; i++) {
    const oppId = opportunityIds[i]
    try {
      const opp = $app.findFirstRecordByData('load_complement_opportunities', 'id', oppId)
      if (!opp) {
        results.push({ id: oppId, success: false, reason: 'Oportunidade não encontrada' })
        continue
      }

      const isBlocked = opp.getBool('is_blocked')
      const blockReason = opp.getString('block_reason')
      const currentStatus = opp.getString('commercial_status')
      const previousSentAt = opp.getString('commercial_sent_at')
      const previousSentBy = opp.getString('commercial_sent_by')

      // 1. Validação de bloqueio impeditivo no backend
      if (isBlocked) {
        return e.json(422, {
          success: false,
          message:
            'Envio impedido: a oportunidade ' +
            opp.getString('opportunity_code') +
            ' possui bloqueio impeditivo (' +
            (blockReason || 'restrição regulatória') +
            ').',
          opportunity_code: opp.getString('opportunity_code'),
        })
      }

      // 2. Validação de duplicidade
      const alreadySent =
        currentStatus === 'Enviada ao Comercial' || currentStatus === 'Em análise comercial'
      if (alreadySent && !isResend) {
        return e.json(409, {
          success: false,
          already_sent: true,
          opportunity_code: opp.getString('opportunity_code'),
          sent_at: previousSentAt,
          sent_by: previousSentBy,
          message:
            'Esta oportunidade já foi enviada ao Comercial' +
            (previousSentAt ? ' em ' + previousSentAt : '') +
            (previousSentBy ? ' por ' + previousSentBy : '') +
            '.',
        })
      }

      const now = new Date().toISOString()
      const newStatus = 'Enviada ao Comercial'

      // Snapshot dos dados enviados para decisão comercial
      const snapshot = {
        opportunity_code: opp.getString('opportunity_code'),
        load_proposal_id: opp.getString('load_proposal_id'),
        itinerary_id: opp.getString('itinerary_id'),
        planned_dispatch_date: opp.getString('planned_dispatch_date'),
        customer_name: opp.getString('customer_name'),
        customer_sap_code: opp.getString('customer_sap_code') || opp.getString('customer_id'),
        destination_city: opp.getString('destination_city'),
        destination_uf: opp.getString('destination_uf'),
        material_id: opp.getString('material_id'),
        material_description: opp.getString('material_description'),
        suggested_quantity_kg: opp.getInt('suggested_quantity_kg'),
        missing_weight_kg: opp.getInt('missing_weight_kg'),
        stock_status: opp.getString('stock_status'),
        credit_status: opp.getString('credit_status'),
        commercial_representative:
          opp.getString('commercial_representative') || opp.getString('salesperson_id'),
        ai_recommendation: opp.getString('ai_recommendation'),
        sent_by: userName,
        sent_at: now,
        is_resend: isResend,
        resend_reason: resendReason,
      }

      // Atualizar registro da oportunidade
      opp.set('commercial_status', newStatus)
      opp.set('commercial_sent_at', now)
      opp.set('commercial_sent_by', userName)
      opp.set('sent_snapshot', snapshot)

      if (isResend) {
        const currentResends = opp.getInt('resend_count') || 0
        opp.set('resend_count', currentResends + 1)
        opp.set('last_resend_at', now)
        opp.set('last_resend_by', userName)
      }

      $app.save(opp)

      // Registrar no histórico da oportunidade
      const histRec = new Record(histCol)
      histRec.set('opportunity_code', opp.getString('opportunity_code'))
      histRec.set('opportunity_id', opp.id)
      histRec.set('event_type', isResend ? 'COMMERCIAL_RESENT' : 'COMMERCIAL_SENT')
      histRec.set(
        'event_title',
        isResend ? 'Oportunidade reenviada para Comercial' : 'Enviada para Comercial',
      )
      histRec.set('user_email', userEmail)
      histRec.set('user_name', userName)
      histRec.set('user_role', userRole)
      histRec.set('previous_status', currentStatus || 'Nova')
      histRec.set('new_status', newStatus)
      histRec.set(
        'description',
        isResend
          ? 'Reenvio autorizado: ' + (resendReason || 'Reavaliação comercial solicitada')
          : 'Oportunidade enviada para avaliação e contato comercial.',
      )
      histRec.set('metadata', snapshot)
      $app.save(histRec)

      // Registrar em audit_logs
      const auditRec = new Record(auditCol)
      auditRec.set('user_email', userEmail)
      auditRec.set('user_name', userName)
      auditRec.set('user_role', userRole)
      auditRec.set(
        'action',
        isResend ? 'RESEND_COMPLEMENT_TO_COMMERCIAL' : 'SEND_COMPLEMENT_TO_COMMERCIAL',
      )
      auditRec.set('resource', 'load_complement_opportunities')
      auditRec.set('resource_id', opp.id)
      auditRec.set('previous_state', currentStatus)
      auditRec.set('new_state', newStatus)
      auditRec.set(
        'reason',
        isResend
          ? 'Reenvio autorizado: ' + resendReason
          : 'Envio de oportunidade de complemento para equipe comercial',
      )
      auditRec.set(
        'correlation_id',
        'COMM-ENVIO-' + opp.getString('opportunity_code') + '-' + Date.now(),
      )
      auditRec.set('payload', snapshot)
      $app.save(auditRec)

      results.push({
        id: opp.id,
        opportunity_code: opp.getString('opportunity_code'),
        success: true,
      })
    } catch (itemErr) {
      results.push({ id: oppId, success: false, reason: String(itemErr) })
    }
  }

  const successCount = results.filter((r) => r.success).length
  return e.json(200, {
    success: true,
    sent_count: successCount,
    total_requested: opportunityIds.length,
    results,
    message:
      successCount === 1
        ? 'Oportunidade enviada ao Comercial com sucesso.'
        : successCount + ' oportunidades enviadas ao Comercial com sucesso.',
  })
})
