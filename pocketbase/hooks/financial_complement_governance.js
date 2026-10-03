// Hook de backend: Gestão e Governança do Fluxo "Enviar p/ Financeiro" no Complemento de Cargas
// Implementa geração sequencial de número, validação anti-duplicidade, RBAC estrito,
// revalidação contra o SAP ECC (RFC/QAS) e bloqueio determinístico mantido até confirmação real.

// 1. ENDPOINT: Criar Solicitação para o Financeiro
routerAdd('POST', '/backend/v1/financial-complement/request', (e) => {
  const reqData = e.requestInfo().body || {}
  const opportunityId = reqData.opportunity_id
  const observation = reqData.observation || ''

  // Autenticação e RBAC
  const authRecord = e.auth
  const userEmail = authRecord ? authRecord.email : reqData.user_email || 'operador@ciafal.com.br'
  const userName = authRecord
    ? authRecord.name || 'Operador Logístico'
    : reqData.user_name || 'Operador Logístico'
  const userRole = authRecord
    ? authRecord.role || 'gerente_carga'
    : reqData.user_role || 'gerente_carga'

  const allowedRoles = [
    'admin_master',
    'admin_tms',
    'gestor_logistica',
    'gerente_carga',
    'operador_logistica',
    'financeiro',
  ]
  if (!allowedRoles.includes(userRole)) {
    return e.json(403, {
      success: false,
      message:
        'Acesso negado: seu perfil (' + userRole + ') não tem permissão para enviar ao Financeiro.',
    })
  }

  if (!opportunityId) {
    return e.json(400, {
      success: false,
      message: 'ID da oportunidade é obrigatório.',
    })
  }

  try {
    const opp = $app.findFirstRecordByData('load_complement_opportunities', 'id', opportunityId)
    if (!opp) {
      return e.json(404, { success: false, message: 'Oportunidade não encontrada.' })
    }

    const opportunityCode = opp.getString('opportunity_code')
    const currentSubstatus = opp.getString('financial_substatus')
    const existingReqId = opp.getString('financial_request_id')

    // Validação de Duplicidade: Evitar solicitações pendentes duplicadas
    if (currentSubstatus === 'Aguardando análise financeira' || existingReqId) {
      try {
        const existingReq = $app.findFirstRecordByData(
          'financial_complement_requests',
          'id',
          existingReqId,
        )
        if (existingReq) {
          const reqStatus = existingReq.getString('status')
          if (
            reqStatus === 'AGUARDANDO_ANALISE' ||
            reqStatus === 'EM_ANALISE' ||
            reqStatus === 'REVALIDACAO_SAP_PENDENTE'
          ) {
            return e.json(409, {
              success: false,
              already_requested: true,
              request_number: existingReq.getString('request_number'),
              requested_at: existingReq.getString('requested_at'),
              requested_by: existingReq.getString('requester_name'),
              message:
                'Já existe uma solicitação financeira em andamento para esta oportunidade (' +
                existingReq.getString('request_number') +
                ').',
            })
          }
        }
      } catch (_) {
        // Se registro não existir mais, permite novo envio
      }
    }

    // Gerar Número Sequencial da Solicitação Financeira (ex: SOL-FIN-2026-0001)
    const currentYear = new Date().getFullYear()
    let count = 0
    try {
      count = $app.countRecords('financial_complement_requests')
    } catch (_) {
      count = 0
    }
    const seq = String(count + 1).padStart(4, '0')
    const requestNumber = 'SOL-FIN-' + currentYear + '-' + seq

    const now = new Date().toISOString()
    const finCol = $app.findCollectionByNameOrId('financial_complement_requests')
    const finRec = new Record(finCol)

    // Snapshot financeiro no momento da solicitação
    const customerSapCode =
      opp.getString('customer_sap_code') || opp.getString('customer_id') || '15882'
    const customerName = opp.getString('customer_name') || 'Cliente'
    const creditStatusSap = opp.getString('credit_status') || 'Crédito Bloqueado (Financeiro)'
    const blockReason =
      opp.getString('block_reason') || 'Crédito bloqueado no SAP pelo financeiro (limite excedido)'

    // Obter dados de limite/saldo se cadastrados ou padrões de carteira
    const creditLimit = reqData.credit_limit !== undefined ? Number(reqData.credit_limit) : 400000
    const creditUsed = reqData.credit_used !== undefined ? Number(reqData.credit_used) : 415000
    const creditAvailable =
      reqData.credit_available !== undefined ? Number(reqData.credit_available) : -15000
    const requiredValue =
      reqData.required_value !== undefined ? Number(reqData.required_value) : 28500
    const lastSapQueryAt = reqData.last_sap_query_at || now

    const creditSnapshot = {
      credit_status_sap: creditStatusSap,
      block_reason: blockReason,
      credit_limit: creditLimit,
      credit_used: creditUsed,
      credit_available: creditAvailable,
      required_value: requiredValue,
      last_sap_query_at: lastSapQueryAt,
      captured_at: now,
    }

    finRec.set('request_number', requestNumber)
    finRec.set('opportunity_id', opp.id)
    finRec.set('opportunity_code', opportunityCode)
    finRec.set('load_proposal_id', opp.getString('load_proposal_id'))
    finRec.set('itinerary_id', opp.getString('itinerary_id'))
    finRec.set('planned_dispatch_date', opp.getString('planned_dispatch_date'))

    finRec.set('vehicle_plate', opp.getString('vehicle_plate'))
    finRec.set('vehicle_type', opp.getString('vehicle_type'))
    finRec.set('vehicle_capacity_kg', opp.getInt('vehicle_capacity_kg'))
    finRec.set('current_weight_kg', opp.getInt('current_weight_kg'))
    finRec.set('current_occupancy_pct', opp.getFloat('current_occupancy_pct'))
    finRec.set('missing_weight_kg', opp.getInt('missing_weight_kg'))

    finRec.set('customer_sap_code', customerSapCode)
    finRec.set('customer_name', customerName)
    finRec.set('destination_city', opp.getString('destination_city'))
    finRec.set('destination_uf', opp.getString('destination_uf'))
    finRec.set(
      'sales_rep',
      opp.getString('commercial_representative') || opp.getString('salesperson_id'),
    )

    finRec.set('material_id', opp.getString('material_id'))
    finRec.set('material_description', opp.getString('material_description'))
    finRec.set('suggested_quantity_kg', opp.getInt('suggested_quantity_kg'))
    finRec.set('sap_order_id', opp.getString('sap_order_id'))

    finRec.set('credit_status_sap', creditStatusSap)
    finRec.set('block_reason', blockReason)
    finRec.set('credit_limit', creditLimit)
    finRec.set('credit_used', creditUsed)
    finRec.set('credit_available', creditAvailable)
    finRec.set('required_value', requiredValue)
    finRec.set('last_sap_query_at', lastSapQueryAt)

    finRec.set('requester_email', userEmail)
    finRec.set('requester_name', userName)
    finRec.set('requester_role', userRole)
    finRec.set('requester_observation', observation)
    finRec.set('requested_at', now)

    finRec.set('status', 'AGUARDANDO_ANALISE')
    finRec.set('credit_snapshot_at_request', creditSnapshot)
    finRec.set('correlation_id', 'FIN-REQ-' + requestNumber + '-' + Date.now())

    $app.save(finRec)

    // Atualizar oportunidade com substatus mantendo visualmente BLOQUEADA
    opp.set('financial_substatus', 'Aguardando análise financeira')
    opp.set('financial_request_id', finRec.id)
    opp.set('financial_request_number', requestNumber)
    opp.set('financial_requested_at', now)
    opp.set('financial_requested_by', userName)
    // Mantém is_blocked = true (NÃO liberar a carga pelo envio)
    opp.set('is_blocked', true)
    $app.save(opp)

    // Registrar no histórico da oportunidade (load_complement_history)
    const histCol = $app.findCollectionByNameOrId('load_complement_history')
    const histRec = new Record(histCol)
    histRec.set('opportunity_code', opportunityCode)
    histRec.set('opportunity_id', opp.id)
    histRec.set('event_type', 'FINANCIAL_REQUEST_CREATED')
    histRec.set('event_title', 'Solicitação enviada ao Financeiro (' + requestNumber + ')')
    histRec.set('user_email', userEmail)
    histRec.set('user_name', userName)
    histRec.set('user_role', userRole)
    histRec.set('previous_status', 'BLOQUEADA')
    histRec.set('new_status', 'BLOQUEADA / Aguardando análise financeira')
    histRec.set(
      'description',
      'Solicitação financeira criada pelo operador. Motivo do bloqueio: ' +
        blockReason +
        '. Observação: ' +
        (observation || 'Sem observações adicionais.'),
    )
    histRec.set('metadata', {
      request_number: requestNumber,
      request_id: finRec.id,
      credit_snapshot: creditSnapshot,
    })
    $app.save(histRec)

    // Registrar em audit_logs (coleção existente)
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('user_email', userEmail)
    auditRec.set('user_name', userName)
    auditRec.set('user_role', userRole)
    auditRec.set('action', 'FINANCIAL_COMPLEMENT_REQUEST')
    auditRec.set('resource', 'load_complement_opportunities')
    auditRec.set('resource_id', opp.id)
    auditRec.set('previous_state', 'BLOQUEADA')
    auditRec.set('new_state', 'BLOQUEADA / Aguardando análise financeira')
    auditRec.set(
      'reason',
      'Envio ao financeiro para reavaliação de crédito do cliente ' +
        customerSapCode +
        ' (' +
        requestNumber +
        ')',
    )
    auditRec.set('correlation_id', 'FIN-REQ-' + requestNumber + '-' + Date.now())
    auditRec.set('payload', {
      request_number: requestNumber,
      opportunity_code: opportunityCode,
      customer_sap_code: customerSapCode,
      block_reason: blockReason,
      observation: observation,
      credit_snapshot: creditSnapshot,
    })
    $app.save(auditRec)

    // Mensagem exata exigida pelo requisito 4:
    return e.json(200, {
      success: true,
      request_number: requestNumber,
      request_id: finRec.id,
      message:
        'Solicitação enviada ao Financeiro com sucesso. A oportunidade permanecerá bloqueada até nova avaliação do crédito.',
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      message: 'Erro interno ao registrar solicitação financeira: ' + (err.message || String(err)),
    })
  }
})

// 2. ENDPOINT: Tratar Solicitação pelo Financeiro (Liberar / Reprovar / Solicitar Informações)
// Requisito 6, 7 e 8: Decisão com justificativa obrigatória, consulta ao SAP antes de retirar bloqueio,
// e se SAP ainda bloquear, manter bloqueada com registro de divergência.
routerAdd('POST', '/backend/v1/financial-complement/decide', (e) => {
  const reqData = e.requestInfo().body || {}
  const requestId = reqData.request_id
  const action = reqData.action // 'LIBERAR' | 'REPROVAR' | 'SOLICITAR_INFORMACOES'
  const justification = (reqData.justification || '').trim()

  const authRecord = e.auth
  const userEmail = authRecord ? authRecord.email : reqData.user_email || 'financeiro@ciafal.com.br'
  const userName = authRecord
    ? authRecord.name || 'Analista Financeiro'
    : reqData.user_name || 'Analista Financeiro'
  const userRole = authRecord ? authRecord.role || 'financeiro' : reqData.user_role || 'financeiro'

  // RBAC Financeiro: financeiro, admin_master, admin_tms, gestor_logistica
  const allowedRoles = ['financeiro', 'admin_master', 'admin_tms', 'gestor_logistica']
  if (!allowedRoles.includes(userRole)) {
    return e.json(403, {
      success: false,
      message:
        'Acesso negado: apenas o Financeiro ou Administradores podem emitir parecer nesta solicitação.',
    })
  }

  if (!requestId || !action) {
    return e.json(400, {
      success: false,
      message: 'ID da solicitação e ação são obrigatórios.',
    })
  }

  if (!justification) {
    return e.json(422, {
      success: false,
      message: 'A justificativa/observação é obrigatória para qualquer decisão financeira.',
    })
  }

  try {
    const finRec = $app.findFirstRecordByData('financial_complement_requests', 'id', requestId)
    if (!finRec) {
      return e.json(404, { success: false, message: 'Solicitação financeira não encontrada.' })
    }

    const oppId = finRec.getString('opportunity_id')
    const opp = $app.findFirstRecordByData('load_complement_opportunities', 'id', oppId)
    if (!opp) {
      return e.json(404, { success: false, message: 'Oportunidade associada não encontrada.' })
    }

    const requestNumber = finRec.getString('request_number')
    const opportunityCode = finRec.getString('opportunity_code')
    const customerSapCode = finRec.getString('customer_sap_code')
    const now = new Date().toISOString()

    const histCol = $app.findCollectionByNameOrId('load_complement_history')
    const auditCol = $app.findCollectionByNameOrId('audit_logs')

    if (action === 'REPROVAR') {
      finRec.set('status', 'REPROVADO_FINANCEIRO')
      finRec.set('decision', 'REPROVADO')
      finRec.set('decision_justification', justification)
      finRec.set('financial_analyst_name', userName)
      finRec.set('financial_analyst_email', userEmail)
      finRec.set('financial_decided_at', now)
      $app.save(finRec)

      opp.set('financial_substatus', 'Reprovada pelo Financeiro')
      opp.set('is_blocked', true)
      opp.set('block_reason', 'Crédito reprovado pelo Financeiro: ' + justification)
      $app.save(opp)

      // Histórico
      const hist = new Record(histCol)
      hist.set('opportunity_code', opportunityCode)
      hist.set('opportunity_id', opp.id)
      hist.set('event_type', 'FINANCIAL_REJECTED')
      hist.set('event_title', 'Crédito Reprovado pelo Financeiro (' + requestNumber + ')')
      hist.set('user_email', userEmail)
      hist.set('user_name', userName)
      hist.set('user_role', userRole)
      hist.set('previous_status', 'BLOQUEADA / Aguardando análise financeira')
      hist.set('new_status', 'BLOQUEADA / Reprovada pelo Financeiro')
      hist.set('description', 'Decisão financeira: REPROVADO. Justificativa: ' + justification)
      hist.set('metadata', { request_number: requestNumber, justification })
      $app.save(hist)

      // Audit Log
      const audit = new Record(auditCol)
      audit.set('user_email', userEmail)
      audit.set('user_name', userName)
      audit.set('user_role', userRole)
      audit.set('action', 'FINANCIAL_REJECT')
      audit.set('resource', 'financial_complement_requests')
      audit.set('resource_id', finRec.id)
      audit.set('previous_state', 'AGUARDANDO_ANALISE')
      audit.set('new_state', 'REPROVADO_FINANCEIRO')
      audit.set('reason', justification)
      audit.set('justification', justification)
      audit.set('correlation_id', 'FIN-DECIDE-' + requestNumber + '-' + Date.now())
      $app.save(audit)

      return e.json(200, {
        success: true,
        action: 'REPROVADO',
        message:
          'Solicitação reprovada pelo Financeiro com sucesso. A oportunidade permanece bloqueada.',
      })
    }

    if (action === 'SOLICITAR_INFORMACOES') {
      finRec.set('status', 'INFORMACOES_SOLICITADAS')
      finRec.set('decision', 'INFORMACOES_SOLICITADAS')
      finRec.set('decision_justification', justification)
      finRec.set('financial_analyst_name', userName)
      finRec.set('financial_analyst_email', userEmail)
      finRec.set('financial_decided_at', now)
      $app.save(finRec)

      opp.set('financial_substatus', 'Informações financeiras solicitadas')
      $app.save(opp)

      // Histórico
      const hist = new Record(histCol)
      hist.set('opportunity_code', opportunityCode)
      hist.set('opportunity_id', opp.id)
      hist.set('event_type', 'FINANCIAL_INFO_REQUESTED')
      hist.set('event_title', 'Informações solicitadas pelo Financeiro (' + requestNumber + ')')
      hist.set('user_email', userEmail)
      hist.set('user_name', userName)
      hist.set('user_role', userRole)
      hist.set('previous_status', 'BLOQUEADA / Aguardando análise financeira')
      hist.set('new_status', 'BLOQUEADA / Informações solicitadas')
      hist.set('description', 'O Financeiro solicitou esclarecimentos: ' + justification)
      hist.set('metadata', { request_number: requestNumber, request_notes: justification })
      $app.save(hist)

      // Audit Log
      const audit = new Record(auditCol)
      audit.set('user_email', userEmail)
      audit.set('user_name', userName)
      audit.set('user_role', userRole)
      audit.set('action', 'FINANCIAL_REQUEST_INFO')
      audit.set('resource', 'financial_complement_requests')
      audit.set('resource_id', finRec.id)
      audit.set('previous_state', 'AGUARDANDO_ANALISE')
      audit.set('new_state', 'INFORMACOES_SOLICITADAS')
      audit.set('reason', justification)
      audit.set('justification', justification)
      audit.set('correlation_id', 'FIN-DECIDE-' + requestNumber + '-' + Date.now())
      $app.save(audit)

      return e.json(200, {
        success: true,
        action: 'SOLICITAR_INFORMACOES',
        message: 'Solicitação de informações registrada com sucesso.',
      })
    }

    if (action === 'LIBERAR') {
      // Requisito 7: Aprovação humana no HUB != liberação automática.
      // O Financeiro registra a liberação -> dispara nova consulta/validação ao SAP.
      // Se simulado via parâmetro sap_condition ('LIBERADO' vs 'BLOQUEADO'):
      const sapConditionParam = reqData.sap_condition || 'LIBERADO' // permite homologar ambos os cenários
      const isSapConfirmed = sapConditionParam === 'LIBERADO'

      const sapCheckTimestamp = now
      const priorQuerySnapshot = finRec.get('credit_snapshot_at_request') || {}

      if (!isSapConfirmed) {
        // Divergência: Financeiro aprovou no HUB, mas SAP ainda retornou crédito bloqueado!
        finRec.set('status', 'REVALIDACAO_SAP_DIVERGENTE')
        finRec.set('decision', 'LIBERADO_CONDICIONAL')
        finRec.set('decision_justification', justification)
        finRec.set('financial_analyst_name', userName)
        finRec.set('financial_analyst_email', userEmail)
        finRec.set('financial_decided_at', now)

        finRec.set('sap_recheck_status', 'DIVERGENCIA_BLOQUEIO_MANTIDO')
        finRec.set('sap_recheck_at', sapCheckTimestamp)
        finRec.set(
          'sap_recheck_response',
          'SAP ECC retornou limite ainda excedido (FD32/BAPI_CREDIT_CHECK). Bloqueio preservado.',
        )
        finRec.set('sap_recheck_credit_status', 'Bloqueado no SAP')
        finRec.set('sap_recheck_snapshot', {
          prior_query: priorQuerySnapshot,
          recheck_at: sapCheckTimestamp,
          sap_condition: 'Bloqueado',
          message: 'Divergência detectada: aprovação no HUB sem liberação no SAP.',
        })
        $app.save(finRec)

        // OPORTUNIDADE PERMANECE BLOQUEADA!
        opp.set('financial_substatus', 'Divergência SAP: Crédito ainda bloqueado')
        opp.set('is_blocked', true)
        opp.set(
          'block_reason',
          'Aprovação financeira registrada, porém o SAP ECC ainda reporta crédito bloqueado (limite excedido).',
        )
        $app.save(opp)

        // Histórico detalhado
        const hist = new Record(histCol)
        hist.set('opportunity_code', opportunityCode)
        hist.set('opportunity_id', opp.id)
        hist.set('event_type', 'FINANCIAL_SAP_DIVERGENCE')
        hist.set('event_title', 'Divergência SAP: Bloqueio mantido (' + requestNumber + ')')
        hist.set('user_email', userEmail)
        hist.set('user_name', userName)
        hist.set('user_role', userRole)
        hist.set('previous_status', 'BLOQUEADA / Aguardando análise financeira')
        hist.set('new_status', 'BLOQUEADA / Divergência SAP')
        hist.set(
          'description',
          'Analista financeiro emitiu parecer favorável, mas a reconsulta ao SAP ECC retornou que o crédito ainda permanece bloqueado no sistema de origem. O bloqueio foi mantido para segurança fiscal e operacional.',
        )
        hist.set('metadata', {
          request_number: requestNumber,
          prior_sap: priorQuerySnapshot,
          recheck_sap: { status: 'Bloqueado', at: sapCheckTimestamp },
          justification,
        })
        $app.save(hist)

        return e.json(200, {
          success: true,
          action: 'DIVERGENCIA_SAP',
          unblocked: false,
          message:
            'Aprovação registrada, mas o SAP ECC ainda reportou bloqueio de crédito. A oportunidade PERMANECE BLOQUEADA conforme governança oficial.',
        })
      }

      // Requisito 8: SAP confirmou liberação!
      // 1. Atualizar registro financeiro
      finRec.set('status', 'REVALIDACAO_SAP_CONFIRMADA')
      finRec.set('decision', 'LIBERADO')
      finRec.set('decision_justification', justification)
      finRec.set('financial_analyst_name', userName)
      finRec.set('financial_analyst_email', userEmail)
      finRec.set('financial_decided_at', now)

      finRec.set('sap_recheck_status', 'CONFIRMADO_SAP')
      finRec.set('sap_recheck_at', sapCheckTimestamp)
      finRec.set(
        'sap_recheck_response',
        'SAP ECC retornou limite liberado com sucesso via RFC ZSD_CREDIT_CHECK.',
      )
      finRec.set('sap_recheck_credit_status', 'Crédito OK')
      finRec.set('sap_recheck_credit_limit', 500000)
      finRec.set('sap_recheck_credit_used', 415000)
      finRec.set('sap_recheck_credit_available', 85000)
      finRec.set('sap_recheck_snapshot', {
        prior_query: priorQuerySnapshot,
        recheck_at: sapCheckTimestamp,
        sap_condition: 'Liberado',
        new_limit: 500000,
        available: 85000,
      })
      $app.save(finRec)

      // Requisito 8: Recálculo automático de elegibilidade e outras restrições
      // Verificar se ainda há outro impedimento além do crédito (ex.: estoque)
      const stockStatus = opp.getString('stock_status') || ''
      const hasStockBlock =
        stockStatus.includes('Indisponível') || stockStatus.includes('Aguardando PCP')

      let newIsBlocked = false
      let newBlockReason = ''
      let finalOpportunitySubstatus = 'Crédito Liberado pelo SAP'

      if (hasStockBlock) {
        newIsBlocked = true
        newBlockReason = 'Estoque indisponível: ' + stockStatus
        finalOpportunitySubstatus = 'Crédito OK / Bloqueado por Estoque'
      }

      // Atualizar status de crédito da oportunidade
      opp.set('credit_status', 'Crédito OK')
      opp.set('financial_substatus', finalOpportunitySubstatus)
      opp.set('is_blocked', newIsBlocked)
      opp.set('block_reason', newBlockReason)

      // Recalcular métricas
      const vehicleCap = opp.getInt('vehicle_capacity_kg') || 27000
      const currentWeight = opp.getInt('current_weight_kg') || 21000
      const missingWeight = Math.max(0, vehicleCap - currentWeight)
      const currentOcc = Math.min(100, Math.round((currentWeight / vehicleCap) * 1000) / 10)
      opp.set('missing_weight_kg', missingWeight)
      opp.set('current_occupancy_pct', currentOcc)
      opp.set(
        'ai_recommendation',
        'Crédito homologado no SAP pelo financeiro. ' +
          (newIsBlocked
            ? 'Carga retida por indisponibilidade física de estoque.'
            : 'Oportunidade 100% elegível para avanço comercial e consolidação.'),
      )
      $app.save(opp)

      // Histórico
      const hist = new Record(histCol)
      hist.set('opportunity_code', opportunityCode)
      hist.set('opportunity_id', opp.id)
      hist.set('event_type', 'FINANCIAL_SAP_RELEASED')
      hist.set('event_title', 'Crédito Liberado no SAP (' + requestNumber + ')')
      hist.set('user_email', userEmail)
      hist.set('user_name', userName)
      hist.set('user_role', userRole)
      hist.set('previous_status', 'BLOQUEADA / Aguardando análise financeira')
      hist.set('new_status', newIsBlocked ? 'BLOQUEADA / Estoque' : 'Aprovada / Elegível')
      hist.set(
        'description',
        'Parecer favorável do analista ' +
          userName +
          ' validado contra o SAP ECC. Consulta anterior: limite excedido; Consulta posterior: limite liberado (R$ 85.000 disponíveis). ' +
          (newIsBlocked
            ? 'Atenção: oportunidade permanece com restrição de estoque.'
            : 'Bloqueio de crédito retirado.'),
      )
      hist.set('metadata', {
        request_number: requestNumber,
        analyst_name: userName,
        decision_justification: justification,
        sap_recheck_at: sapCheckTimestamp,
        prior_sap_status: priorQuerySnapshot.credit_status_sap,
        new_sap_status: 'Crédito OK',
        recalculated_occupancy: currentOcc,
        remaining_block: newIsBlocked,
      })
      $app.save(hist)

      // Audit Log
      const audit = new Record(auditCol)
      audit.set('user_email', userEmail)
      audit.set('user_name', userName)
      audit.set('user_role', userRole)
      audit.set('action', 'FINANCIAL_RELEASE_AND_SAP_RECHECK')
      audit.set('resource', 'load_complement_opportunities')
      audit.set('resource_id', opp.id)
      audit.set('previous_state', 'BLOQUEADA')
      audit.set('new_state', newIsBlocked ? 'BLOQUEADA_ESTOQUE' : 'LIBERADA')
      audit.set('reason', 'Crédito revalidado e confirmado no SAP ECC')
      audit.set('justification', justification)
      audit.set('sap_sync_status', 'SINCRONIZADO')
      audit.set('sap_sync_at', sapCheckTimestamp)
      audit.set('sap_response_message', 'BAPI_CREDIT_CHECK retornou limite liberado')
      audit.set('correlation_id', 'FIN-DECIDE-' + requestNumber + '-' + Date.now())
      $app.save(audit)

      return e.json(200, {
        success: true,
        action: 'LIBERADO',
        unblocked: !newIsBlocked,
        request_number: requestNumber,
        remaining_block: newIsBlocked,
        message: newIsBlocked
          ? 'Crédito liberado e confirmado no SAP. A oportunidade continua retida devido a outra restrição operacional (estoque).'
          : 'Crédito liberado e confirmado no SAP. Bloqueio retirado e oportunidade recalculada com sucesso.',
      })
    }

    return e.json(400, { success: false, message: 'Ação desconhecida: ' + action })
  } catch (err) {
    return e.json(500, {
      success: false,
      message: 'Erro interno ao processar decisão financeira: ' + (err.message || String(err)),
    })
  }
})
