// Hook de backend: Governança, Validação e Sequencial Único para Reclamações Operacionais
// Endpoint: POST /backend/v1/carrier-complaints/register
// Regras:
// 1. Validar campos obrigatórios (alvo, severidade, origem WS/Cliente, motivo, descrição do fato)
// 2. Se "Outros", validação de especificação obrigatória
// 3. Se sem vínculo com OT/Remessa, justificativa obrigatória
// 4. Geração de número sequencial único formatado (REC-TMS-XXXXXX/YYYY)
// 5. Status inicial "REGISTRADA" (Aguardando Análise)
// 6. Snapshot completo de auditoria na collection audit_logs
// 7. Retorno com mensagem padronizada

routerAdd('POST', '/backend/v1/carrier-complaints/register', (e) => {
  const reqData = e.requestInfo().body || {}
  const authRecord = e.auth

  const userEmail = authRecord
    ? authRecord.email
    : reqData.user_email || 'operador.tms@ciafal.com.br'
  const userName = authRecord
    ? authRecord.name || 'Operador Logístico'
    : reqData.user_name || 'Operador Logístico'
  const userRole = authRecord
    ? authRecord.role || 'operador_logistica'
    : reqData.user_role || 'operador_logistica'

  const targetType = (reqData.target_type || '').trim()
  const severity = (reqData.severity || '').trim()
  const originChannel = (reqData.origin_channel || '').trim().toUpperCase()
  const reasonCode = (reqData.reason_code || '').trim()
  const reasonName = (reqData.reason_name || '').trim()
  const reasonSpecification = (reqData.reason_specification || '').trim()
  const description = (reqData.description || '').trim()

  const transportOrderNumber = (reqData.transport_order_number || '').trim()
  const sapTransportNumber = (reqData.sap_transport_number || '').trim()
  const deliveryNumber = (reqData.delivery_number || '').trim()
  const customerCode = (reqData.customer_code || '').trim()
  const customerName = (reqData.customer_name || '').trim()
  const customerDisplay = (reqData.customer_display || '').trim()
  const driverName = (reqData.driver_name || '').trim()
  const driverId = (reqData.driver_id || '').trim()
  const vehiclePlate = (reqData.vehicle_plate || '').trim().toUpperCase()
  const carrierName = (reqData.carrier_name || '').trim()
  const itineraryCode = (reqData.itinerary_code || '').trim()
  const operationDate = reqData.operation_date || null
  const unlinkedJustification = (reqData.unlinked_transport_justification || '').trim()
  const hasTransportLink = Boolean(reqData.has_transport_link)

  // 1. Validação de Campos Obrigatórios Gerais
  if (!targetType) {
    return e.json(400, { success: false, message: 'Alvo da reclamação é obrigatório.' })
  }
  if (!severity) {
    return e.json(400, { success: false, message: 'Severidade é obrigatória.' })
  }
  if (!originChannel || (originChannel !== 'WS' && originChannel !== 'CLIENTE')) {
    return e.json(400, {
      success: false,
      message: 'Origem da Reclamação é obrigatória e deve ser "WS" ou "Cliente".',
    })
  }
  if (!reasonName) {
    return e.json(400, { success: false, message: 'Motivo da Reclamação é obrigatório.' })
  }
  if (!description) {
    return e.json(400, { success: false, message: 'Descrição do Fato é obrigatória.' })
  }

  // 2. Validação se motivo for "Outros"
  const isOutros =
    reasonName.toLowerCase().includes('outros') ||
    reasonCode === 'MOT-23' ||
    reqData.requires_specification === true

  if (isOutros && !reasonSpecification) {
    return e.json(422, {
      success: false,
      message:
        'Ao selecionar o motivo "Outros", é obrigatório preencher a especificação detalhada.',
    })
  }

  // 3. Regra de vínculo com transporte/remessa
  if (!hasTransportLink) {
    if (!unlinkedJustification || unlinkedJustification.length < 5) {
      return e.json(422, {
        success: false,
        message:
          'Para reclamação sem vínculo com transporte/remessa, informe obrigatoriamente a justificativa da ausência de vínculo.',
      })
    }
  }

  try {
    const currentYear = new Date().getFullYear()
    let count = 0
    try {
      count = $app.countRecords('carrier_complaints')
    } catch (_) {
      count = 0
    }
    const seq = String(count + 1).padStart(6, '0')
    const complaintNumber = 'REC-TMS-' + seq + '/' + currentYear

    const now = new Date().toISOString()
    const compCol = $app.findCollectionByNameOrId('carrier_complaints')
    const compRec = new Record(compCol)

    // Mapear category canônica compatível com select original
    let category = 'OUTRO'
    const lowerReason = reasonName.toLowerCase()
    if (
      lowerReason.includes('atraso') ||
      lowerReason.includes('prazo') ||
      lowerReason.includes('horário')
    ) {
      category = 'ATRASO'
    } else if (
      lowerReason.includes('cordialidade') ||
      lowerReason.includes('conduta') ||
      lowerReason.includes('atendimento')
    ) {
      category = 'COMPORTAMENTO'
    } else if (lowerReason.includes('document')) {
      category = 'DOCUMENTACAO'
    } else if (lowerReason.includes('segurança')) {
      category = 'SEGURANCA'
    } else if (lowerReason.includes('avaria')) {
      category = 'AVARIA'
    } else if (lowerReason.includes('descarga') || lowerReason.includes('entrega')) {
      category = 'ENTREGA'
    } else if (lowerReason.includes('veículo') || lowerReason.includes('condição inadequada')) {
      category = 'VEICULO'
    } else if (lowerReason.includes('amarração') || lowerReason.includes('proteção')) {
      category = 'CARGA'
    } else if (lowerReason.includes('comunicação') || lowerReason.includes('retorno')) {
      category = 'COMUNICACAO'
    } else if (originChannel === 'CLIENTE') {
      category = 'RECLAMACAO_CLIENTE'
    } else {
      category = 'TRANSPORTE'
    }

    compRec.set('complaint_number', complaintNumber)
    compRec.set(
      'transport_order_number',
      transportOrderNumber || (hasTransportLink ? sapTransportNumber : ''),
    )
    compRec.set('sap_transport_number', sapTransportNumber)
    compRec.set('delivery_number', deliveryNumber)
    compRec.set('category', category)
    compRec.set('severity', severity)
    compRec.set('target_type', targetType)

    compRec.set('driver_id', driverId)
    compRec.set('driver_name', driverName)
    compRec.set('vehicle_plate', vehiclePlate)
    compRec.set('carrier_name', carrierName)

    compRec.set('customer_code', customerCode)
    compRec.set('customer_name', customerName)
    compRec.set(
      'customer_display',
      customerDisplay || (customerCode ? customerCode + ' — ' + customerName : customerName),
    )
    compRec.set('itinerary_code', itineraryCode)

    compRec.set('origin_type', originChannel === 'CLIENTE' ? 'CLIENTE' : 'TRANSPORTE_LOGISTICA')
    compRec.set('origin_channel', originChannel)
    compRec.set('reason_code', reasonCode)
    compRec.set('reason_name', reasonName)
    compRec.set('reason_specification', reasonSpecification)
    compRec.set('description', description)

    compRec.set('registered_by_email', userEmail)
    compRec.set('registered_by_name', userName)
    compRec.set('occurrence_date', now)
    compRec.set('operation_date', operationDate || now)
    compRec.set('has_transport_link', hasTransportLink)
    compRec.set('unlinked_transport_justification', unlinkedJustification)

    // Status inicial: REGISTRADA (representa "Aguardando Análise" na governança)
    compRec.set('status', 'REGISTRADA')

    const snapshotData = {
      complaint_number: complaintNumber,
      target_type: targetType,
      severity: severity,
      origin_channel: originChannel,
      reason_code: reasonCode,
      reason_name: reasonName,
      reason_specification: reasonSpecification,
      transport_order_number: transportOrderNumber,
      sap_transport_number: sapTransportNumber,
      delivery_number: deliveryNumber,
      customer_code: customerCode,
      customer_name: customerName,
      driver_name: driverName,
      vehicle_plate: vehiclePlate,
      carrier_name: carrierName,
      registered_by_user: userName,
      registered_by_email: userEmail,
      registered_by_role: userRole,
      registered_at: now,
      has_transport_link: hasTransportLink,
      unlinked_transport_justification: unlinkedJustification,
    }
    compRec.set('snapshot_data', snapshotData)

    const initialAuditTrail = [
      {
        date: now,
        user: userName + ' (' + userEmail + ')',
        action: 'REGISTRO_RECLAMACAO',
        previous_status: '',
        new_status: 'REGISTRADA',
        notes: 'Registro inicial da reclamação encaminhada para análise e contraditório.',
      },
    ]
    compRec.set('audit_trail_json', initialAuditTrail)

    $app.save(compRec)

    // Registrar log formal na collection audit_logs existente
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('user_email', userEmail)
      auditRec.set('user_name', userName)
      auditRec.set('user_role', userRole)
      auditRec.set('action', 'CARRIER_COMPLAINT_REGISTER')
      auditRec.set('resource', 'carrier_complaints')
      auditRec.set('resource_id', compRec.id)
      auditRec.set('previous_state', 'NONE')
      auditRec.set('new_state', 'REGISTRADA')
      auditRec.set(
        'reason',
        'Registro de reclamação operacional ' +
          complaintNumber +
          ' - Motivo: ' +
          reasonName +
          ' (Origem: ' +
          originChannel +
          ')',
      )
      auditRec.set('sap_transport_number', sapTransportNumber)
      auditRec.set('delivery_number', deliveryNumber)
      auditRec.set('correlation_id', 'REC-' + complaintNumber + '-' + Date.now())
      auditRec.set('payload', snapshotData)
      $app.save(auditRec)
    } catch (auditErr) {
      console.warn('Erro ao salvar em audit_logs:', auditErr)
    }

    return e.json(200, {
      success: true,
      complaint_number: complaintNumber,
      id: compRec.id,
      record: {
        id: compRec.id,
        complaint_number: complaintNumber,
        transport_order_number: transportOrderNumber,
        sap_transport_number: sapTransportNumber,
        delivery_number: deliveryNumber,
        customer_code: customerCode,
        customer_name: customerName,
        customer_display:
          customerDisplay || (customerCode ? customerCode + ' — ' + customerName : customerName),
        target_type: targetType,
        severity: severity,
        origin_channel: originChannel,
        origin_type: originChannel === 'CLIENTE' ? 'CLIENTE' : 'TRANSPORTE_LOGISTICA',
        reason_code: reasonCode,
        reason_name: reasonName,
        reason_specification: reasonSpecification,
        category: category,
        description: description,
        driver_name: driverName,
        driver_id: driverId,
        vehicle_plate: vehiclePlate,
        carrier_name: carrierName,
        itinerary_code: itineraryCode,
        status: 'REGISTRADA',
        created: now,
        occurrence_date: now,
        registered_by_name: userName,
        registered_by_email: userEmail,
        has_transport_link: hasTransportLink,
        unlinked_transport_justification: unlinkedJustification,
      },
      message: 'Reclamação registrada com sucesso e encaminhada para análise.',
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      message: 'Erro interno ao registrar reclamação: ' + (err.message || String(err)),
    })
  }
})
