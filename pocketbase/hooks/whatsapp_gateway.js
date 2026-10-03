// pocketbase/hooks/whatsapp_gateway.js
// Gateway oficial e centralizado de mensageria WhatsApp Business para agentes TMS (Chicão, Carlão, Fred)

routerAdd('GET', '/backend/v1/whatsapp/status', (c) => {
  const token = $os.getenv('WHATSAPP_TOKEN') || $os.getenv('WHATSAPP_API_KEY')
  const phoneId = $os.getenv('WHATSAPP_PHONE_NUMBER_ID') || $os.getenv('WHATSAPP_PHONE_ID')
  const accountId = $os.getenv('WHATSAPP_BUSINESS_ACCOUNT_ID') || $os.getenv('WHATSAPP_ACCOUNT_ID')
  const webhookVerifyToken = $os.getenv('WHATSAPP_WEBHOOK_VERIFY_TOKEN')

  const hasCredentials = Boolean(token && phoneId)
  const status = hasCredentials ? 'Conectado' : 'Não configurado'
  const webhookStatus = Boolean(webhookVerifyToken) ? 'Webhook ativo' : 'Webhook pendente'

  return c.json(200, {
    configured: hasCredentials,
    status: status,
    webhookStatus: webhookStatus,
    endpoint: 'https://graph.facebook.com/v20.0',
    phone_number_id_configured: Boolean(phoneId),
    business_account_id_configured: Boolean(accountId),
    webhook_configured: Boolean(webhookVerifyToken),
    message: hasCredentials
      ? 'WhatsApp Business Cloud API conectada e operando.'
      : 'WhatsApp Business ainda não configurado. A arquitetura está preparada e aguardando credenciais.',
  })
})

routerAdd('POST', '/backend/v1/whatsapp/dispatch', (c) => {
  const body = $apis.requestInfo(c).body
  const token = $os.getenv('WHATSAPP_TOKEN') || $os.getenv('WHATSAPP_API_KEY')
  const phoneId = $os.getenv('WHATSAPP_PHONE_NUMBER_ID') || $os.getenv('WHATSAPP_PHONE_ID')

  const driverName = body.driver_name || 'Motorista Parceiro'
  const driverId = body.driver_id || ''
  const phoneNumber = body.phone_number || ''
  const content = body.content || ''
  const messageType = body.message_type || 'TEXT'
  const agentSender = body.agent_sender || 'CARLAO'
  const cargoId = body.cargo_id || ''
  const transportId = body.transport_id || ''
  const negotiationId = body.negotiation_id || ''

  const isConfigured = Boolean(token && phoneId)

  // Registro consistente no histórico de comunicação (audit trail)
  let logRecordId = null
  try {
    const col = $app.findCollectionByNameOrId('whatsapp_communication_logs')
    const logRec = new Record(col)
    logRec.set('timestamp', new Date().toISOString().replace('T', ' '))
    logRec.set('driver_id', driverId)
    logRec.set('driver_name', driverName)
    logRec.set('phone_number', phoneNumber)
    logRec.set('direction', 'OUTBOUND')
    logRec.set('message_type', messageType)
    logRec.set('content', content)
    logRec.set('agent_sender', agentSender)
    logRec.set('status', isConfigured ? 'ENVIADO' : 'PREPARADO')
    logRec.set('cargo_id', cargoId)
    logRec.set('transport_id', transportId)
    logRec.set('negotiation_id', negotiationId)
    if (!isConfigured) {
      logRec.set(
        'error_details',
        'WhatsApp Business ainda não configurado. Mensagem registrada no TMS sem envio externo.',
      )
    }
    logRec.set('payload_json', body)
    $app.save(logRec)
    logRecordId = logRec.id
  } catch (err) {
    console.warn('Falha ao salvar log de comunicação do WhatsApp:', err)
  }

  if (!isConfigured) {
    return c.json(200, {
      success: true,
      delivered_externally: false,
      status: 'PREPARADO',
      log_id: logRecordId,
      message:
        'WhatsApp Business ainda não configurado. A oferta foi registrada no TMS, mas não foi enviada externamente.',
    })
  }

  // Envio externo real via Graph API quando as credenciais estiverem no ambiente
  try {
    const targetPhone = phoneNumber.replace(/\D/g, '')
    const res = $http.send({
      url: 'https://graph.facebook.com/v20.0/' + phoneId + '/messages',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: targetPhone,
        type: 'text',
        text: { preview_url: false, body: content },
      },
      timeout: 15,
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return c.json(200, {
        success: true,
        delivered_externally: true,
        status: 'ENVIADO',
        external_id: res.json?.messages?.[0]?.id || '',
        log_id: logRecordId,
        message: 'Mensagem entregue ao gateway WhatsApp com sucesso.',
      })
    } else {
      return c.json(200, {
        success: false,
        delivered_externally: false,
        status: 'ERRO',
        error: 'Graph API HTTP ' + res.statusCode,
        log_id: logRecordId,
        message: 'Falha na entrega da mensagem pelo WhatsApp Meta API.',
      })
    }
  } catch (err) {
    return c.json(200, {
      success: false,
      delivered_externally: false,
      status: 'ERRO',
      error: String(err),
      log_id: logRecordId,
      message: 'Erro de conexão ao gateway WhatsApp.',
    })
  }
})
