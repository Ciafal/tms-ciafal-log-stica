/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Despacho ao Agente Chicão & Mesa de Fretes
 * Todos os helpers declarados INLINE dentro de cada callback conforme especificação do JSVM do PocketBase.
 */

// 1. POST /backend/v1/tms/chicao/dispatch
routerAdd('POST', '/backend/v1/tms/chicao/dispatch', (c) => {
  const app = c.app
  const authRecord = c.get('authRecord')
  const userEmail = authRecord ? authRecord.get('email') : 'operador@ciafal.com.br'

  const body = c.requestInfo().body || {}
  const items = Array.isArray(body.matches) ? body.matches : body.match ? [body.match] : []

  if (!items.length) {
    return c.json(400, {
      success: false,
      message: 'Nenhum encontro informado para envio ao Chicão.',
    })
  }

  // Helper inline: checar credenciais WhatsApp
  const apiKey =
    $os.getenv('WHATSAPP_TOKEN') ||
    $os.getenv('WHATSAPP_API_KEY') ||
    $os.getenv('EVOLUTION_API_KEY') ||
    $os.getenv('Z_API_KEY')
  const apiUrl =
    $os.getenv('WHATSAPP_API_URL') ||
    $os.getenv('EVOLUTION_API_URL') ||
    $os.getenv('Z_API_URL') ||
    ($os.getenv('WHATSAPP_PHONE_NUMBER_ID') ? 'https://graph.facebook.com/v20.0' : '')
  const waConnected = Boolean(apiKey && apiUrl)

  // Helper inline: alçada
  let autonomiaMaxPct = 3.0
  try {
    const param = app.findFirstRecordByData(
      'system_parameters',
      'key',
      'CHICAO_AUTONOMIA_MAX_SPREAD_PCT',
    )
    if (param) {
      autonomiaMaxPct = parseFloat(param.get('value')) || 3.0
    }
  } catch (_) {}

  const results = []
  const errors = []

  for (const item of items) {
    try {
      const matchId = String(item.match_id || item.id || '')
      const cargoId = String(item.cargo_id || item.cargoId || '')
      const driverId = String(item.driver_id || item.driverId || '')
      const plate = String(item.vehicle_plate || item.plate || '').toUpperCase()

      if (!cargoId || !plate) {
        errors.push({
          matchId,
          error: 'Dados obrigatórios incompletos (cargo_id ou vehicle_plate ausentes).',
        })
        continue
      }

      // Controle transacional de concorrência / antiduplicidade
      const activeOffers = app.findRecordsByFilter(
        'chicao_freight_offers',
        `cargo_id = '${cargoId}' && vehicle_plate = '${plate}' && status != 'RECUSADA' && status != 'CANCELADA' && status != 'EXPIRADA'`,
        '-created',
        1,
        0,
      )

      if (activeOffers && activeOffers.length > 0) {
        const existing = activeOffers[0]
        errors.push({
          matchId,
          offer_code: existing.get('offer_code'),
          error: `Esta combinação já possui uma oferta ativa na Mesa de Fretes (${existing.get('offer_code')}, Status: ${existing.get('status')}).`,
        })
        continue
      }

      // Gerar número sequencial oficial OF-NNNNNN/AAAA
      const currentYear = new Date().getFullYear()
      let maxSeq = 0
      try {
        const seqRecs = app.findRecordsByFilter(
          'chicao_freight_offers',
          `year = ${currentYear}`,
          '-sequential_number',
          1,
          0,
        )
        if (seqRecs && seqRecs.length > 0) {
          maxSeq = Number(seqRecs[0].get('sequential_number')) || 0
        }
      } catch (_) {}

      const nextSeq = maxSeq + 1
      const offerCode = `OF-${String(nextSeq).padStart(6, '0')}/${currentYear}`

      // Valores
      const initialOfferVal = Number(
        item.freight_value || item.initial_offer_value || item.valor || 0,
      )
      const tollCost = Number(item.toll_cost || item.pedagio || 0)
      const totalOffered = initialOfferVal + tollCost
      const weightTon = Number(item.weight_ton || (item.weight_kg ? item.weight_kg / 1000 : 0))
      const distanceKm = Number(item.distance_km || 0)
      const maxAutonomyVal = Math.round(initialOfferVal * (1 + autonomiaMaxPct / 100))

      const offerCol = app.findCollectionByNameOrId('chicao_freight_offers')
      const rec = new Record(offerCol)

      rec.set('offer_code', offerCode)
      rec.set('sequential_number', nextSeq)
      rec.set('year', currentYear)
      rec.set('match_id', matchId)
      rec.set('cargo_id', cargoId)
      rec.set('cargo_title', item.cargo_title || item.cargoTitle || `CARGA-${cargoId}`)
      rec.set('itinerary_code', item.itinerary_code || item.itinerary || '')
      rec.set('itinerary_description', item.itinerary_description || '')
      rec.set('origin', item.origin || 'Contagem / MG (Sidercentro CIAFAL)')
      rec.set('destination_city', item.destination_city || item.cidade || '')
      rec.set('destination_uf', item.destination_uf || item.uf || '')
      rec.set('cities_intermediate', item.cities_intermediate || '')

      rec.set('driver_id', driverId)
      rec.set('driver_name', item.driver_name || 'Motorista Parceiro')
      rec.set('driver_phone', item.driver_phone || item.driver_whatsapp || '')
      rec.set('driver_whatsapp', item.driver_whatsapp || item.driver_phone || '')
      rec.set('driver_document', item.driver_document || '')
      rec.set('carrier_name', item.carrier_name || item.transportadora || '')

      rec.set('vehicle_plate', plate)
      rec.set('vehicle_type', item.vehicle_type || '')
      rec.set('vehicle_body_type', item.vehicle_body_type || '')
      rec.set('vehicle_capacity_kg', Number(item.vehicle_capacity_kg || 0))
      rec.set('queue_group', item.queue_group || item.temporal_tab || 'PORTA')
      rec.set('queue_status', item.queue_status || 'disponivel')

      rec.set('weight_kg', Number(item.weight_kg || weightTon * 1000))
      rec.set('weight_ton', weightTon)
      rec.set('customers_count', Number(item.customers_count || 1))
      rec.set('discharges_count', Number(item.discharges_count || item.quantidade_descargas || 1))
      rec.set('distance_km', distanceKm)
      rec.set('estimated_time_hours', Number(item.estimated_time_hours || 0))
      rec.set('discharge_type', item.discharge_type || '')
      rec.set('products_summary', item.products_summary || '')
      rec.set('customer_logistic_notes', item.customer_logistic_notes || '')
      rec.set('orders_json', item.orders || [])

      rec.set('initial_offer_value', initialOfferVal)
      rec.set('toll_cost', tollCost)
      rec.set('total_offered_value', totalOffered)
      rec.set('antt_floor_value', Number(item.antt_floor_value || 0))
      rec.set('cost_per_ton', weightTon > 0 ? Math.round(initialOfferVal / weightTon) : 0)
      rec.set('cost_per_km', distanceKm > 0 ? Number((initialOfferVal / distanceKm).toFixed(2)) : 0)
      rec.set('max_autonomy_value', maxAutonomyVal)

      rec.set('active_actor', 'CHICAO')
      rec.set('ai_handled_pct', 100)
      rec.set('rounds_count', 1)
      rec.set('retry_count', 0)

      // Gerar mensagem inicial Chicão
      const driverFirstName = (item.driver_name || 'Motorista').split(' ')[0]
      const orig = rec.get('origin')
      const dest = `${rec.get('destination_city') || 'Destino'} / ${rec.get('destination_uf') || 'UF'}`
      const wText = weightTon > 0 ? `${weightTon.toFixed(2)} t` : 'Carga fechada'
      const descCount = rec.get('discharges_count')
      const kmTxt = distanceKm > 0 ? `${distanceKm} km` : 'Sob consulta'
      const tempoTxt = rec.get('estimated_time_hours')
        ? `${rec.get('estimated_time_hours')}h estimados`
        : 'A combinar'
      const freteTxt = Number(initialOfferVal || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
      const tollTxt =
        tollCost > 0
          ? ` + Pedágio de ${Number(tollCost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
          : ' (Pedágio pago em TAG/Vale)'

      const firstMessage =
        `Olá, ${driverFirstName}! Tudo bem? Aqui é o Chicão, da logística CIAFAL.\n\n` +
        `Temos uma carga disponível selecionada especialmente para seu veículo (${plate}):\n` +
        `• Oferta: ${offerCode}\n` +
        `• Origem: ${orig}\n` +
        `• Destino: ${dest}\n` +
        `• Peso total: ${wText}\n` +
        `• Entregas / Descargas: ${descCount}\n` +
        `• Distância: ${kmTxt} (${tempoTxt})\n` +
        `• Frete oferecido: ${freteTxt}${tollTxt}\n\n` +
        `Você tem interesse nessa carga? Responda com 'SIM' para confirmar ou envie sua proposta/dúvida!`

      const initialTimeline = [
        {
          timestamp: new Date().toISOString(),
          actor: 'TMS',
          action: 'OFERTA_CRIADA',
          description: `Oferta de frete gerada pelo Planejador de Cargas (${userEmail}). Sequencial: ${offerCode}.`,
        },
      ]

      const initialMessages = [
        {
          id: 'msg-init-' + Date.now(),
          timestamp: new Date().toISOString(),
          sender: 'CHICAO',
          channel: 'WHATSAPP',
          text: firstMessage,
          status: 'PENDENTE',
        },
      ]

      // Verificação honesta de conexão WhatsApp
      if (!waConnected) {
        rec.set('status', 'ERRO_ENVIO')
        rec.set('whatsapp_status', 'SEM_CONEXAO')
        rec.set(
          'whatsapp_error_message',
          'Não foi possível enviar a oferta ao motorista via WhatsApp: As credenciais da API do WhatsApp Business não estão configuradas neste ambiente do HUB CIAFAL.',
        )

        initialTimeline.push({
          timestamp: new Date().toISOString(),
          actor: 'CHICAO',
          action: 'ERRO_ENVIO_WHATSAPP',
          description:
            'Tentativa de envio ao WhatsApp cancelada: Gateway WhatsApp não configurado neste ambiente. A oferta foi registrada na Mesa de Fretes e pode ser acompanhada ou enviada após conexão.',
        })
      } else {
        try {
          const waResp = $http.send({
            url: `${apiUrl}/messages/send`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              phone: rec.get('driver_whatsapp') || rec.get('driver_phone'),
              message: firstMessage,
              offer_code: offerCode,
            }),
            timeout: 10,
          })

          if (waResp.statusCode >= 200 && waResp.statusCode < 300) {
            rec.set('status', 'OFERTA_ENVIADA')
            rec.set('whatsapp_status', 'ENVIADO')
            rec.set('whatsapp_message_id', waResp.json?.id || 'WA-' + Date.now())
            initialTimeline.push({
              timestamp: new Date().toISOString(),
              actor: 'CHICAO',
              action: 'OFERTA_ENVIADA_WHATSAPP',
              description: `Oferta enviada via WhatsApp com sucesso para ${rec.get('driver_whatsapp')}.`,
            })
            initialMessages[0].status = 'ENVIADO'
          } else {
            rec.set('status', 'ERRO_ENVIO')
            rec.set('whatsapp_status', 'ERRO_ENVIO')
            rec.set(
              'whatsapp_error_message',
              `Erro retornado pelo provedor WhatsApp (HTTP ${waResp.statusCode}): ${waResp.raw || 'Falha de comunicação'}`,
            )
            initialTimeline.push({
              timestamp: new Date().toISOString(),
              actor: 'CHICAO',
              action: 'ERRO_ENVIO_WHATSAPP',
              description: `Falha na API WhatsApp: HTTP ${waResp.statusCode}.`,
            })
          }
        } catch (dispatchErr) {
          rec.set('status', 'ERRO_ENVIO')
          rec.set('whatsapp_status', 'ERRO_ENVIO')
          rec.set(
            'whatsapp_error_message',
            `Falha na conexão com servidor WhatsApp: ${dispatchErr.message || String(dispatchErr)}`,
          )
          initialTimeline.push({
            timestamp: new Date().toISOString(),
            actor: 'CHICAO',
            action: 'ERRO_ENVIO_WHATSAPP',
            description: `Falha na conexão de rede: ${dispatchErr.message}`,
          })
        }
      }

      rec.set('timeline_json', initialTimeline)
      rec.set('messages_history', initialMessages)

      app.save(rec)

      // Auditoria inline
      try {
        const auditCol = app.findCollectionByNameOrId('audit_logs')
        const auditRec = new Record(auditCol)
        auditRec.set('resource', 'chicao_freight_offers')
        auditRec.set('resource_id', rec.id)
        auditRec.set('action', 'DISPATCH_CHICAO')
        auditRec.set('user_email', userEmail)
        auditRec.set('user_name', 'Operador TMS')
        auditRec.set('user_role', 'operador_logistica')
        auditRec.set('previous_state', 'NOVO_ENCONTRO')
        auditRec.set('new_state', rec.get('status'))
        auditRec.set('reason', `Despacho de encontro para Chicão (${offerCode})`)
        auditRec.set('correlation_id', 'CHICAO-' + rec.id + '-' + Date.now())
        auditRec.set('payload', {
          offer_code: offerCode,
          match_id: matchId,
          cargo_id: cargoId,
          vehicle_plate: plate,
          driver_name: rec.get('driver_name'),
          initial_value: initialOfferVal,
          status: rec.get('status'),
          whatsapp_status: rec.get('whatsapp_status'),
        })
        app.save(auditRec)
      } catch (auditErr) {
        console.log('Aviso ao gravar audit log de despacho:', auditErr)
      }

      results.push({
        id: rec.id,
        offer_code: offerCode,
        status: rec.get('status'),
        cargo_id: cargoId,
        vehicle_plate: plate,
        driver_name: rec.get('driver_name'),
        whatsapp_status: rec.get('whatsapp_status'),
        error_message: rec.get('whatsapp_error_message') || null,
      })
    } catch (err) {
      console.log('Erro ao processar encontro para Chicão:', err)
      errors.push({
        matchId: item.match_id || item.id,
        error: err.message || String(err),
      })
    }
  }

  return c.json(200, {
    success: results.length > 0,
    sent_count: results.length,
    error_count: errors.length,
    results,
    errors,
    whatsapp_gateway_connected: waConnected,
  })
})

// 2. POST /backend/v1/tms/chicao/retry - Retenta envio sem duplicar oferta
routerAdd('POST', '/backend/v1/tms/chicao/retry', (c) => {
  const app = c.app
  const authRecord = c.get('authRecord')
  const userEmail = authRecord ? authRecord.get('email') : 'operador@ciafal.com.br'
  const body = c.requestInfo().body || {}
  const offerId = body.offer_id || body.id

  if (!offerId) {
    return c.json(400, { success: false, message: 'offer_id é obrigatório.' })
  }

  let rec
  try {
    rec = app.findRecordById('chicao_freight_offers', offerId)
  } catch (_) {
    return c.json(404, { success: false, message: 'Oferta não encontrada.' })
  }

  const apiKey =
    $os.getenv('WHATSAPP_API_KEY') || $os.getenv('EVOLUTION_API_KEY') || $os.getenv('Z_API_KEY')
  const apiUrl =
    $os.getenv('WHATSAPP_API_URL') || $os.getenv('EVOLUTION_API_URL') || $os.getenv('Z_API_URL')
  const waConnected = Boolean(apiKey && apiUrl)

  const retryCount = (Number(rec.get('retry_count')) || 0) + 1
  const timeline = Array.isArray(rec.get('timeline_json')) ? rec.get('timeline_json') : []

  if (!waConnected) {
    rec.set('status', 'ERRO_ENVIO')
    rec.set('whatsapp_status', 'SEM_CONEXAO')
    rec.set('retry_count', retryCount)
    rec.set('last_retry_at', new Date().toISOString())
    rec.set(
      'whatsapp_error_message',
      'Não foi possível reenviar: API do WhatsApp Business ainda não configurada no HUB CIAFAL.',
    )

    timeline.push({
      timestamp: new Date().toISOString(),
      actor: 'OPERADOR',
      action: 'RETRY_SEM_SUCESSO',
      description: `Tentativa #${retryCount} disparada por ${userEmail}, mas o gateway WhatsApp não possui credenciais ativas.`,
    })

    rec.set('timeline_json', timeline)
    app.save(rec)

    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('resource', 'chicao_freight_offers')
      auditRec.set('resource_id', rec.id)
      auditRec.set('action', 'RETRY_CHICAO_FAILED')
      auditRec.set('user_email', userEmail)
      auditRec.set('user_name', 'Operador TMS')
      auditRec.set('user_role', 'operador_logistica')
      auditRec.set('previous_state', 'ERRO_ENVIO')
      auditRec.set('new_state', 'ERRO_ENVIO')
      auditRec.set('reason', 'Tentativa de reenvio falhou: sem conexão WhatsApp')
      auditRec.set('correlation_id', 'RETRY-FAIL-' + rec.id + '-' + Date.now())
      auditRec.set('payload', { retryCount, user: userEmail, reason: 'SEM_CONEXAO' })
      app.save(auditRec)
    } catch (_) {}

    return c.json(200, {
      success: false,
      message: 'A API do WhatsApp não está conectada no momento.',
      offer: { id: rec.id, offer_code: rec.get('offer_code'), status: rec.get('status') },
    })
  }

  // Se WhatsApp estiver conectado
  try {
    const driverFirstName = (rec.get('driver_name') || 'Motorista').split(' ')[0]
    const firstMsg =
      `Olá, ${driverFirstName}! Tudo bem? Aqui é o Chicão, da logística CIAFAL.\n\n` +
      `Temos uma carga disponível selecionada especialmente para seu veículo (${rec.get('vehicle_plate')}):\n` +
      `• Oferta: ${rec.get('offer_code')}\n` +
      `• Origem: ${rec.get('origin')}\n` +
      `• Destino: ${rec.get('destination_city')} / ${rec.get('destination_uf')}\n` +
      `• Peso total: ${rec.get('weight_ton')} t\n` +
      `• Entregas: ${rec.get('discharges_count')}\n` +
      `• Frete oferecido: R$ ${rec.get('initial_offer_value')}\n\n` +
      `Você tem interesse nessa carga? Responda com 'SIM' para confirmar!`

    const waResp = $http.send({
      url: `${apiUrl}/messages/send`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        phone: rec.get('driver_whatsapp') || rec.get('driver_phone'),
        message: firstMsg,
        offer_code: rec.get('offer_code'),
      }),
      timeout: 10,
    })

    rec.set('retry_count', retryCount)
    rec.set('last_retry_at', new Date().toISOString())

    if (waResp.statusCode >= 200 && waResp.statusCode < 300) {
      rec.set('status', 'OFERTA_ENVIADA')
      rec.set('whatsapp_status', 'ENVIADO')
      rec.set('whatsapp_error_message', '')
      timeline.push({
        timestamp: new Date().toISOString(),
        actor: 'OPERADOR',
        action: 'RETRY_SUCESSO',
        description: `Reenvio realizado com sucesso por ${userEmail}.`,
      })
    } else {
      rec.set('status', 'ERRO_ENVIO')
      rec.set('whatsapp_status', 'ERRO_ENVIO')
      rec.set('whatsapp_error_message', `Erro HTTP ${waResp.statusCode}: ${waResp.raw}`)
      timeline.push({
        timestamp: new Date().toISOString(),
        actor: 'OPERADOR',
        action: 'RETRY_ERRO',
        description: `Falha no reenvio: HTTP ${waResp.statusCode}`,
      })
    }
  } catch (err) {
    rec.set('status', 'ERRO_ENVIO')
    rec.set('whatsapp_error_message', err.message || String(err))
  }

  rec.set('timeline_json', timeline)
  app.save(rec)

  try {
    const auditCol = app.findCollectionByNameOrId('audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('resource', 'chicao_freight_offers')
    auditRec.set('resource_id', rec.id)
    auditRec.set('action', 'RETRY_CHICAO')
    auditRec.set('user_email', userEmail)
    auditRec.set('user_name', 'Operador TMS')
    auditRec.set('user_role', 'operador_logistica')
    auditRec.set('previous_state', 'ERRO_ENVIO')
    auditRec.set('new_state', rec.get('status'))
    auditRec.set('reason', `Reenvio de oferta ao motorista (${rec.get('offer_code')})`)
    auditRec.set('correlation_id', 'RETRY-' + rec.id + '-' + Date.now())
    auditRec.set('payload', { retryCount, user: userEmail, status: rec.get('status') })
    app.save(auditRec)
  } catch (_) {}

  return c.json(200, {
    success: rec.get('status') === 'OFERTA_ENVIADA',
    offer: { id: rec.id, offer_code: rec.get('offer_code'), status: rec.get('status') },
  })
})

// 3. POST /backend/v1/tms/chicao/process-reply - Motorista responde (texto, aceite, contraproposta, recusa, dúvida)
routerAdd('POST', '/backend/v1/tms/chicao/process-reply', (c) => {
  const app = c.app
  const body = c.requestInfo().body || {}
  const offerId = body.offer_id
  const messageText = String(body.message_text || '').trim()
  const counterValue = Number(body.counter_value || 0)
  const isAudio = Boolean(body.is_audio)
  const audioTranscript = body.audio_transcript || ''

  if (!offerId) {
    return c.json(400, { success: false, message: 'offer_id é obrigatório.' })
  }

  let rec
  try {
    rec = app.findRecordById('chicao_freight_offers', offerId)
  } catch (_) {
    return c.json(404, { success: false, message: 'Oferta não encontrada.' })
  }

  const initialVal = Number(rec.get('initial_offer_value')) || 0
  let autonomiaMaxPct = 3.0
  try {
    const param = app.findFirstRecordByData(
      'system_parameters',
      'key',
      'CHICAO_AUTONOMIA_MAX_SPREAD_PCT',
    )
    if (param) autonomiaMaxPct = parseFloat(param.get('value')) || 3.0
  } catch (_) {}

  const maxAutonomyVal =
    Number(rec.get('max_autonomy_value')) || Math.round(initialVal * (1 + autonomiaMaxPct / 100))
  const timeline = Array.isArray(rec.get('timeline_json')) ? rec.get('timeline_json') : []
  const messages = Array.isArray(rec.get('messages_history')) ? rec.get('messages_history') : []
  const textNormalized = (audioTranscript || messageText).toLowerCase()
  const now = new Date().toISOString()

  // Registro da mensagem recebida do motorista
  messages.push({
    id: 'msg-rec-' + Date.now(),
    timestamp: now,
    sender: 'MOTORISTA',
    channel: 'WHATSAPP',
    text: audioTranscript ? `[Áudio Transcrito]: ${audioTranscript}` : messageText,
    is_audio: isAudio,
  })

  // 1. Identificar Aceite
  if (
    textNormalized === 'sim' ||
    textNormalized.includes('aceito') ||
    textNormalized.includes('fechado') ||
    textNormalized.includes('pode carregar') ||
    textNormalized.includes('vou sim')
  ) {
    rec.set('status', 'ACEITA')
    rec.set('final_contracted_freight', rec.get('counter_value_requested') || initialVal)
    rec.set(
      'final_contracted_total',
      (Number(rec.get('final_contracted_freight')) || initialVal) +
        (Number(rec.get('toll_cost')) || 0),
    )

    timeline.push({
      timestamp: now,
      actor: 'MOTORISTA',
      action: 'OFERTA_ACEITA',
      description: `Motorista aceitou a oferta. Carga bloqueada para evitar duplicidade. Pronta para envio ao SAP.`,
    })

    messages.push({
      id: 'msg-reply-' + Date.now(),
      timestamp: new Date().toISOString(),
      sender: 'CHICAO',
      channel: 'WHATSAPP',
      text: `Excelente notícia, ${rec.get('driver_name')}! Carga confirmada para seu veículo ${rec.get('vehicle_plate')}. Já estamos gerando a ordem no SAP e nossa expedição aguarda você na portaria.`,
    })
  }
  // 2. Identificar Recusa
  else if (
    textNormalized.startsWith('nao') ||
    textNormalized.startsWith('não') ||
    textNormalized.includes('recuso') ||
    textNormalized.includes('não tenho interesse') ||
    textNormalized.includes('ja carreguei') ||
    textNormalized.includes('já carreguei')
  ) {
    rec.set('status', 'RECUSADA')
    rec.set('refusal_reason', messageText)
    let category = 'OUTRO'
    if (
      textNormalized.includes('preco') ||
      textNormalized.includes('valor') ||
      textNormalized.includes('pouco')
    )
      category = 'VALOR'
    else if (textNormalized.includes('longe') || textNormalized.includes('destino'))
      category = 'DESTINO'
    else if (textNormalized.includes('descarga')) category = 'DESCARGAS'
    else if (textNormalized.includes('tempo') || textNormalized.includes('prazo'))
      category = 'PRAZO'
    else if (textNormalized.includes('quebrou') || textNormalized.includes('oficina'))
      category = 'VEICULO'
    rec.set('refusal_category', category)

    timeline.push({
      timestamp: now,
      actor: 'MOTORISTA',
      action: 'OFERTA_RECUSADA',
      description: `Motorista recusou a oferta (Motivo: ${category} - "${messageText}"). Carga liberada para novo planejamento.`,
    })

    messages.push({
      id: 'msg-reply-' + Date.now(),
      timestamp: new Date().toISOString(),
      sender: 'CHICAO',
      channel: 'WHATSAPP',
      text: `Entendido, ${rec.get('driver_name')}. Agradecemos o retorno e manteremos você informado sobre novas cargas compatíveis. Bom trabalho!`,
    })
  }
  // 3. Identificar Contraproposta (numérica ou explícita)
  else if (counterValue > 0 || /\d+[\.,]?\d*/.test(messageText)) {
    let requestedVal = counterValue
    if (!requestedVal) {
      const matchNum = messageText.match(/(\d+[\.,]?\d*)/)
      if (matchNum) {
        requestedVal = parseFloat(matchNum[1].replace('.', '').replace(',', '.'))
      }
    }

    if (requestedVal > 0) {
      rec.set('counter_value_requested', requestedVal)
      const diffVal = requestedVal - initialVal
      const diffPct = Number(((diffVal / initialVal) * 100).toFixed(2))

      timeline.push({
        timestamp: now,
        actor: 'MOTORISTA',
        action: 'CONTRAPROPOSTA_RECEBIDA',
        description: `Contraproposta recebida: R$ ${requestedVal.toLocaleString('pt-BR')} (Diferença: +R$ ${diffVal.toLocaleString('pt-BR')} / +${diffPct}%).`,
      })

      // Validação estrita de alçada
      if (requestedVal <= maxAutonomyVal) {
        rec.set('status', 'ACEITA')
        rec.set('final_contracted_freight', requestedVal)
        rec.set('final_contracted_total', requestedVal + (Number(rec.get('toll_cost')) || 0))
        timeline.push({
          timestamp: new Date().toISOString(),
          actor: 'CHICAO',
          action: 'ALCADA_AUTOMATICA_ACEITA',
          description: `Valor solicitado (R$ ${requestedVal}) está DENTRO da alçada automática de autonomia da IA (máx R$ ${maxAutonomyVal} / +${autonomiaMaxPct}%). Aceita automaticamente e carga bloqueada contra duplicidade.`,
        })

        messages.push({
          id: 'msg-reply-' + Date.now(),
          timestamp: new Date().toISOString(),
          sender: 'CHICAO',
          channel: 'WHATSAPP',
          text: `Excelente! Sua contraproposta de R$ ${requestedVal.toLocaleString('pt-BR')} está dentro da nossa alçada e foi aprovada automaticamente! Carga confirmada para o veículo ${rec.get('vehicle_plate')}.`,
        })
      } else {
        rec.set('status', 'AGUARDANDO_APROVACAO')
        timeline.push({
          timestamp: new Date().toISOString(),
          actor: 'CHICAO',
          action: 'ENCAMINHADO_APROVACAO_HUMANA',
          description: `Contraproposta de R$ ${requestedVal} (+${diffPct}%) ULTRAPASSA o limite automático de R$ ${maxAutonomyVal}. Encaminhado para a Mesa de Fretes.`,
        })

        messages.push({
          id: 'msg-reply-' + Date.now(),
          timestamp: new Date().toISOString(),
          sender: 'CHICAO',
          channel: 'WHATSAPP',
          text: `Vou verificar essa condição de R$ ${requestedVal.toLocaleString('pt-BR')} com nosso time de fretes da CIAFAL e já retorno para você em instantes!`,
        })
      }
    }
  }
  // 4. Dúvida Operacional
  else {
    rec.set('status', 'EM_NEGOCIACAO')
    timeline.push({
      timestamp: now,
      actor: 'MOTORISTA',
      action: 'DUVIDA_RECEBIDA',
      description: `Dúvida do motorista: "${messageText}".`,
    })

    messages.push({
      id: 'msg-reply-' + Date.now(),
      timestamp: new Date().toISOString(),
      sender: 'CHICAO',
      channel: 'WHATSAPP',
      text: `Olá! Sobre sua pergunta ("${messageText}"): o itinerário possui ${rec.get('discharges_count')} descarga(s) até ${rec.get('destination_city')}/${rec.get('destination_uf')}, com carga de aço pesando ${rec.get('weight_ton')}t. Ficou com mais alguma dúvida ou podemos fechar?`,
    })
  }

  rec.set('timeline_json', timeline)
  rec.set('messages_history', messages)
  app.save(rec)

  try {
    const auditCol = app.findCollectionByNameOrId('audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('resource', 'chicao_freight_offers')
    auditRec.set('resource_id', rec.id)
    auditRec.set('action', 'REPLY_CHICAO_PROCESSED')
    auditRec.set('user_email', 'motorista@whatsapp')
    auditRec.set('user_name', rec.get('driver_name') || 'Motorista Parceiro')
    auditRec.set('user_role', 'motorista_parceiro')
    auditRec.set('new_state', rec.get('status'))
    auditRec.set(
      'reason',
      `Resposta do motorista processada pelo Chicão (${rec.get('offer_code')})`,
    )
    auditRec.set('correlation_id', 'REPLY-' + rec.id + '-' + Date.now())
    auditRec.set('payload', { message: messageText, newStatus: rec.get('status'), counterValue })
    app.save(auditRec)
  } catch (_) {}

  return c.json(200, {
    success: true,
    status: rec.get('status'),
    counter_value_requested: rec.get('counter_value_requested'),
    offer: rec,
  })
})

// 4. POST /backend/v1/tms/chicao/takeover - Humano assume ou devolve ao Chicão
routerAdd('POST', '/backend/v1/tms/chicao/takeover', (c) => {
  const app = c.app
  const authRecord = c.get('authRecord')
  const userEmail = authRecord ? authRecord.get('email') : 'operador@ciafal.com.br'
  const body = c.requestInfo().body || {}
  const offerId = body.offer_id
  const action = body.action // 'TAKE' ou 'HANDBACK'
  const reason = body.reason || ''

  if (!offerId || !action) {
    return c.json(400, { success: false, message: 'offer_id e action são obrigatórios.' })
  }

  let rec
  try {
    rec = app.findRecordById('chicao_freight_offers', offerId)
  } catch (_) {
    return c.json(404, { success: false, message: 'Oferta não encontrada.' })
  }

  const timeline = Array.isArray(rec.get('timeline_json')) ? rec.get('timeline_json') : []

  if (action === 'TAKE') {
    rec.set('active_actor', 'HUMANO')
    rec.set('human_takeover_user', userEmail)
    rec.set('human_takeover_reason', reason || 'Intervenção manual solicitada na Mesa de Fretes')
    rec.set('human_takeover_at', new Date().toISOString())
    rec.set('ai_handled_pct', 70)

    timeline.push({
      timestamp: new Date().toISOString(),
      actor: 'HUMANO',
      action: 'ASSUMIR_CONVERSA',
      description: `Operador ${userEmail} assumiu o controle da conversa. Agente Chicão pausado para esta oferta.`,
    })
  } else {
    rec.set('active_actor', 'CHICAO')
    timeline.push({
      timestamp: new Date().toISOString(),
      actor: 'HUMANO',
      action: 'DEVOLVER_CHICAO',
      description: `Operador ${userEmail} devolveu a conversa ao Agente Chicão.`,
    })
  }

  rec.set('timeline_json', timeline)
  app.save(rec)

  try {
    const auditCol = app.findCollectionByNameOrId('audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('resource', 'chicao_freight_offers')
    auditRec.set('resource_id', rec.id)
    auditRec.set('action', `TAKEOVER_${action}`)
    auditRec.set('user_email', userEmail)
    auditRec.set('user_name', 'Operador TMS')
    auditRec.set('user_role', 'operador_logistica')
    auditRec.set('new_state', rec.get('active_actor'))
    auditRec.set(
      'reason',
      `Transição de interlocutor: ${action} - ${reason || 'Operação Mesa de Fretes'}`,
    )
    auditRec.set('correlation_id', 'TAKEOVER-' + rec.id + '-' + Date.now())
    auditRec.set('payload', { user: userEmail, action, reason })
    app.save(auditRec)
  } catch (_) {}

  return c.json(200, {
    success: true,
    active_actor: rec.get('active_actor'),
    offer: rec,
  })
})

// 5. POST /backend/v1/tms/chicao/approve - Aprovação ou recusa humana de contraproposta
routerAdd('POST', '/backend/v1/tms/chicao/approve', (c) => {
  const app = c.app
  const authRecord = c.get('authRecord')
  const userEmail = authRecord ? authRecord.get('email') : 'gestor@ciafal.com.br'
  const body = c.requestInfo().body || {}
  const offerId = body.offer_id
  const decision = body.decision // 'APPROVE' ou 'REJECT'
  const approvedValue = Number(body.approved_value || 0)

  if (!offerId || !decision) {
    return c.json(400, { success: false, message: 'offer_id e decision são obrigatórios.' })
  }

  let rec
  try {
    rec = app.findRecordById('chicao_freight_offers', offerId)
  } catch (_) {
    return c.json(404, { success: false, message: 'Oferta não encontrada.' })
  }

  const timeline = Array.isArray(rec.get('timeline_json')) ? rec.get('timeline_json') : []
  const messages = Array.isArray(rec.get('messages_history')) ? rec.get('messages_history') : []

  if (decision === 'APPROVE') {
    const finalVal =
      approvedValue ||
      Number(rec.get('counter_value_requested')) ||
      Number(rec.get('initial_offer_value'))
    rec.set('status', 'ACEITA')
    rec.set('final_contracted_freight', finalVal)
    rec.set('final_contracted_total', finalVal + (Number(rec.get('toll_cost')) || 0))

    timeline.push({
      timestamp: new Date().toISOString(),
      actor: 'HUMANO',
      action: 'CONTRAPROPOSTA_APROVADA',
      description: `Condição de frete aprovada por ${userEmail} no valor de R$ ${finalVal.toLocaleString('pt-BR')}.`,
    })

    messages.push({
      id: 'msg-reply-' + Date.now(),
      timestamp: new Date().toISOString(),
      sender: 'CHICAO',
      channel: 'WHATSAPP',
      text: `Olá, ${rec.get('driver_name')}! Conseguimos a aprovação com a diretoria: fechamos o frete em R$ ${finalVal.toLocaleString('pt-BR')}! Carga garantida para você.`,
    })
  } else {
    rec.set('status', 'RECUSADA')
    rec.set('refusal_reason', 'Contraproposta não aprovada pela gestão')
    rec.set('refusal_category', 'VALOR')

    timeline.push({
      timestamp: new Date().toISOString(),
      actor: 'HUMANO',
      action: 'CONTRAPROPOSTA_REJEITADA',
      description: `Contraproposta rejeitada por ${userEmail}. Carga liberada para novo planejamento.`,
    })

    messages.push({
      id: 'msg-reply-' + Date.now(),
      timestamp: new Date().toISOString(),
      sender: 'CHICAO',
      channel: 'WHATSAPP',
      text: `Olá, ${rec.get('driver_name')}. Infelizmente não conseguimos atingir a condição solicitada para esta viagem. Agradecemos sua atenção e ficamos em contato para próximas oportunidades!`,
    })
  }

  rec.set('timeline_json', timeline)
  rec.set('messages_history', messages)
  app.save(rec)

  try {
    const auditCol = app.findCollectionByNameOrId('audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('resource', 'chicao_freight_offers')
    auditRec.set('resource_id', rec.id)
    auditRec.set('action', `DECISION_${decision}`)
    auditRec.set('user_email', userEmail)
    auditRec.set('user_name', 'Gestor de Fretes')
    auditRec.set('user_role', 'gestor_logistica')
    auditRec.set('new_state', rec.get('status'))
    auditRec.set(
      'reason',
      `Decisão humana da contraproposta: ${decision} (${rec.get('offer_code')})`,
    )
    auditRec.set('correlation_id', 'DECISION-' + rec.id + '-' + Date.now())
    auditRec.set('payload', { decision, approvedValue, user: userEmail })
    app.save(auditRec)
  } catch (_) {}

  return c.json(200, {
    success: true,
    status: rec.get('status'),
    final_contracted_freight: rec.get('final_contracted_freight'),
    offer: rec,
  })
})
