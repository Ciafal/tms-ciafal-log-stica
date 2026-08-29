/// <reference path="../pb_data/types.d.ts" />

// Hook para Chat com o Agente Fred nativo Skip Cloud
routerAdd(
  'POST',
  '/backend/v1/fred/chat',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const user = e.auth
      const userId = user?.id

      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      if (!body.message || !body.message.trim()) {
        return e.badRequestError('Mensagem é obrigatória')
      }

      const sapTransportNumber = body.sap_transport_number || ''
      const promptContext = sapTransportNumber
        ? 'Contexto operacional atual: Transporte SAP ' + sapTransportNumber + '. ' + body.message
        : body.message

      const agentResult = $ai.agent('fred-rastreamento').chat({
        user_id: userId,
        conversation_id: body.conversation_id || null,
        message: promptContext,
      })

      // Se houver transporte SAP associado, registrar a mensagem na coleção de histórico
      if (sapTransportNumber) {
        try {
          const msgCol = $app.findCollectionByNameOrId('fred_messages')
          // Registra a mensagem enviada
          const userMsg = new Record(msgCol)
          userMsg.set('sap_transport_number', sapTransportNumber)
          userMsg.set('sender_type', body.sender_type || 'VENDEDOR')
          userMsg.set('sender_name', user.getString('name') || user.getString('email') || 'Usuário')
          userMsg.set('target_audience', 'OPERACAO_INTERNA')
          userMsg.set('message_channel', 'CRM_360')
          userMsg.set('message_text', body.message)
          userMsg.set('message_type', 'TEXTO')
          userMsg.set('is_delivered', true)
          userMsg.set('is_read', true)
          $app.save(userMsg)

          // Registra a resposta do Fred
          const fredMsg = new Record(msgCol)
          fredMsg.set('sap_transport_number', sapTransportNumber)
          fredMsg.set('sender_type', 'FRED_IA')
          fredMsg.set('sender_name', 'Fred IA (CIAFAL)')
          fredMsg.set('target_audience', body.sender_type || 'VENDEDOR')
          fredMsg.set('message_channel', 'CRM_360')
          fredMsg.set('message_text', agentResult.content)
          fredMsg.set('message_type', 'TEXTO')
          fredMsg.set('is_delivered', true)
          fredMsg.set('is_read', true)
          $app.save(fredMsg)
        } catch (_) {}
      }

      return e.json(200, {
        conversation_id: agentResult.conversation_id,
        content: agentResult.content,
        citations: agentResult.citations,
        message_id: agentResult.message_id,
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'Serviço Fred IA temporariamente indisponível' })
      }
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha na requisição ao Fred' : err.message,
        })
      }
      return e.json(500, { error: err.message || 'Erro no chat do Fred' })
    }
  },
  $apis.requireAuth(),
)
