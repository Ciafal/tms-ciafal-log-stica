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

// Endpoint para Registro do Retorno do Representante Comercial
// Endpoint: POST /backend/v1/commercial-complement/feedback
// Regras:
// 1. Validar se oportunidade existe
// 2. Se não interessado, validar motivo obrigatório dentre os 7:
//    - sem necessidade, preço, prazo, estoque próprio, não conseguiu contato, material não atende, outro
// 3. Se "outro", observação é estritamente obrigatória
// 4. Se interessado, material confirmado é obrigatório
// 5. Atualizar load_complement_opportunities (commercial_status, commercial_response_status, etc.)
// 6. Atualizar load_complement_learning com tempo de resposta e resultado
// 7. Atualizar load_complement_history e audit_logs
routerAdd('POST', '/backend/v1/commercial-complement/feedback', (e) => {
  const reqData = e.requestInfo().body || {}
  const authRecord = e.auth

  const userEmail = authRecord ? authRecord.email : reqData.user_email || 'comercial@ciafal.com.br'
  const userName = authRecord
    ? authRecord.name || 'Representante Comercial'
    : reqData.user_name || 'Representante Comercial'
  const userRole = authRecord ? authRecord.role || 'comercial' : reqData.user_role || 'comercial'

  const opportunityId = (reqData.opportunity_id || '').trim()
  const isInterested = Boolean(reqData.is_interested)
  const materialConfirmed = (reqData.material_confirmed || '').trim()
  const confirmedQtyKg = Number(reqData.confirmed_qty_kg) || 0
  const negotiatedCondition = (reqData.negotiated_condition || '').trim()
  const rejectionReason = (reqData.rejection_reason || '').trim()
  const notes = (reqData.notes || '').trim()

  if (!opportunityId) {
    return e.json(400, { success: false, message: 'ID da oportunidade é obrigatório.' })
  }

  const validReasons = [
    'sem necessidade',
    'preço',
    'prazo',
    'estoque próprio',
    'não conseguiu contato',
    'material não atende',
    'outro',
  ]

  if (!isInterested) {
    if (!rejectionReason || !validReasons.includes(rejectionReason.toLowerCase())) {
      return e.json(422, {
        success: false,
        message:
          'Motivo de desinteresse inválido ou não informado. Motivos válidos: sem necessidade, preço, prazo, estoque próprio, não conseguiu contato, material não atende, outro.',
      })
    }
    if (rejectionReason.toLowerCase() === 'outro' && !notes) {
      return e.json(422, {
        success: false,
        message: 'Observação é obrigatória ao selecionar o motivo "Outro".',
      })
    }
  } else {
    if (!materialConfirmed) {
      return e.json(422, {
        success: false,
        message: 'Material confirmado é obrigatório para cliente interessado.',
      })
    }
  }

  try {
    const opp = $app.findFirstRecordByData('load_complement_opportunities', 'id', opportunityId)
    if (!opp) {
      return e.json(404, { success: false, message: 'Oportunidade de complemento não localizada.' })
    }

    const now = new Date().toISOString()
    const previousStatus = opp.getString('commercial_status') || 'Nova'
    const nextStatus = isInterested ? 'Cliente interessado' : 'Cliente sem interesse'
    const oppCode = opp.getString('opportunity_code')

    // 1. Atualizar a Oportunidade
    opp.set('commercial_status', nextStatus)
    opp.set('commercial_response_status', isInterested ? 'INTERESSADO' : 'SEM_INTERESSE')
    opp.set('commercial_response_notes', notes)
    opp.set('commercial_rejection_reason', isInterested ? '' : rejectionReason.toLowerCase())
    opp.set('commercial_negotiated_condition', isInterested ? negotiatedCondition : '')
    opp.set(
      'commercial_confirmed_qty_kg',
      isInterested && confirmedQtyKg > 0 ? confirmedQtyKg : null,
    )
    opp.set('commercial_confirmed_material', isInterested ? materialConfirmed : '')
    opp.set('commercial_responded_at', now)
    opp.set('commercial_responded_by', userName)
    $app.save(opp)

    // 2. Calcular tempo de resposta e registrar em load_complement_learning
    let responseTimeMinutes = 0
    const sentAtStr = opp.getString('commercial_sent_at')
    if (sentAtStr) {
      const sentTime = new Date(sentAtStr).getTime()
      const respTime = new Date(now).getTime()
      responseTimeMinutes = Math.max(1, Math.round((respTime - sentTime) / (1000 * 60)))
    }

    try {
      const learnCol = $app.findCollectionByNameOrId('load_complement_learning')
      const learnRec = new Record(learnCol)
      learnRec.set('opportunity_code', oppCode)
      learnRec.set('opportunity_id', opp.id)
      learnRec.set(
        'customer_sap_code',
        opp.getString('customer_sap_code') || opp.getString('customer_id') || 'Não localizado',
      )
      learnRec.set('customer_name', opp.getString('customer_name') || 'Não localizado')
      learnRec.set('itinerary_id', opp.getString('itinerary_id'))
      learnRec.set(
        'representative_name',
        opp.getString('commercial_representative') || opp.getString('salesperson_id') || userName,
      )
      learnRec.set('material_code', isInterested ? materialConfirmed : opp.getString('material_id'))
      learnRec.set(
        'material_description',
        isInterested ? materialConfirmed : opp.getString('material_description'),
      )
      learnRec.set(
        'suggested_qty_kg',
        opp.getInt('suggested_quantity_kg') || opp.getInt('missing_weight_kg') || 0,
      )
      learnRec.set('confirmed_qty_kg', isInterested ? confirmedQtyKg : 0)
      learnRec.set('outcome', isInterested ? 'ACCEPTED' : 'REJECTED')
      learnRec.set('rejection_reason', isInterested ? '' : rejectionReason.toLowerCase())
      learnRec.set('rejection_notes', notes)
      learnRec.set('negotiated_condition', isInterested ? negotiatedCondition : '')
      learnRec.set('response_time_minutes', responseTimeMinutes)
      learnRec.set('converted', isInterested)
      learnRec.set('ai_suggested_products_json', opp.get('ai_suggested_products_json'))
      learnRec.set('ai_original_rationale', opp.getString('ai_recommendation') || '')
      learnRec.set('sent_at', sentAtStr || now)
      learnRec.set('responded_at', now)
      $app.save(learnRec)
    } catch (lErr) {
      console.warn('Erro ao gravar load_complement_learning:', lErr)
    }

    // 3. Registrar em load_complement_history
    try {
      const histCol = $app.findCollectionByNameOrId('load_complement_history')
      const histRec = new Record(histCol)
      histRec.set('opportunity_code', oppCode)
      histRec.set('opportunity_id', opp.id)
      histRec.set(
        'event_type',
        isInterested ? 'COMMERCIAL_INTEREST_REGISTERED' : 'COMMERCIAL_REJECTED',
      )
      histRec.set(
        'event_title',
        isInterested
          ? 'Retorno Comercial: Cliente Interessado'
          : 'Retorno Comercial: Cliente Sem Interesse',
      )
      histRec.set('user_email', userEmail)
      histRec.set('user_name', userName)
      histRec.set('user_role', userRole)
      histRec.set('previous_status', previousStatus)
      histRec.set('new_status', nextStatus)
      histRec.set(
        'description',
        isInterested
          ? 'Interesse registrado para ' +
              (materialConfirmed || 'material') +
              ' (' +
              (confirmedQtyKg / 1000).toFixed(1) +
              ' t). Condição: ' +
              (negotiatedCondition || 'Padrão') +
              '.'
          : 'Cliente sem interesse. Motivo: ' +
              rejectionReason +
              '. Obs: ' +
              (notes || 'Sem observações') +
              '.',
      )
      histRec.set('metadata', {
        is_interested: isInterested,
        material_confirmed: materialConfirmed,
        confirmed_qty_kg: confirmedQtyKg,
        rejection_reason: rejectionReason,
        notes: notes,
        negotiated_condition: negotiatedCondition,
      })
      $app.save(histRec)
    } catch (hErr) {
      console.warn('Erro ao gravar load_complement_history:', hErr)
    }

    // 4. Registrar em audit_logs
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('user_email', userEmail)
      auditRec.set('user_name', userName)
      auditRec.set('user_role', userRole)
      auditRec.set(
        'action',
        isInterested ? 'COMMERCIAL_RESPONSE_INTERESTED' : 'COMMERCIAL_RESPONSE_UNINTERESTED',
      )
      auditRec.set('resource', 'load_complement_opportunities')
      auditRec.set('resource_id', opp.id)
      auditRec.set('previous_state', previousStatus)
      auditRec.set('new_state', nextStatus)
      auditRec.set(
        'reason',
        isInterested
          ? 'Registro de interesse do cliente no complemento de carga'
          : 'Registro de recusa comercial: ' + rejectionReason,
      )
      auditRec.set('correlation_id', 'COMM-RESP-' + oppCode + '-' + Date.now())
      auditRec.set('payload', {
        material_confirmed: materialConfirmed,
        confirmed_qty_kg: confirmedQtyKg,
        rejection_reason: rejectionReason,
        notes: notes,
        negotiated_condition: negotiatedCondition,
      })
      $app.save(auditRec)
    } catch (aErr) {
      console.warn('Erro ao gravar audit_logs:', aErr)
    }

    return e.json(200, {
      success: true,
      new_status: nextStatus,
      opportunity_code: oppCode,
      message: isInterested
        ? 'Interesse do cliente registrado com sucesso no TMS CIAFAL!'
        : 'Retorno comercial registrado com sucesso e alimentado no motor de aprendizado.',
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      message: 'Erro interno ao processar retorno comercial: ' + (err.message || String(err)),
    })
  }
})
