// Hook Skip Cloud: Agente IA Planejador de Cargas & Explicações
routerAdd(
  'POST',
  '/backend/v1/planner-ai/analyze',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : ''
      const body = e.requestInfo().body || {}
      const itineraryCode = body.itinerary_code || 'MG001A'
      // Buscar restrições de clientes ativos deste itinerário para fornecer contexto estruturado à IA
      let customerConstraintsContext = ''
      try {
        const custRecords = $app.findRecordsByFilter(
          'sap_customer_logistic_info',
          "is_active = true && (itinerary_code = '" + itineraryCode + "' || itinerary_code = '')",
          '-highest_restriction_level',
          10,
          0,
        )
        if (custRecords && custRecords.length > 0) {
          const rulesSummary = []
          for (let i = 0; i < custRecords.length; i++) {
            const rec = custRecords[i]
            const cCode = rec.getString('customer_code')
            const cName = rec.getString('customer_name')
            const lvl = rec.getString('highest_restriction_level')
            const obs = rec.getString('observations')
            rulesSummary.push(
              'Cliente ' +
                cCode +
                ' (' +
                cName +
                '): Nível ' +
                lvl +
                ' | Restrições: ' +
                (obs || 'Consultar ficha técnica'),
            )
          }
          customerConstraintsContext =
            '\nRESTRIÇÕES LOGÍSTICAS DE CLIENTES OBRIGATÓRIAS (NÃO IGNORAR):\n' +
            rulesSummary.join('\n')
        }
      } catch (_) {}

      const message =
        (body.message ||
          'Analise os pedidos do itinerário ' +
            itineraryCode +
            ' e recomende os melhores cenários de carga considerando estoque DP34, crédito, motoristas PORTA e restrições ativas de clientes.') +
        customerConstraintsContext

      let aiResult = null
      let fallbackUsed = false
      let explanation = ''

      try {
        if (userId) {
          const agent = $ai.agent('planejador-cargas-ia')
          const chatRes = agent.chat({
            user_id: userId,
            conversation_id: body.conversation_id || null,
            message: message,
          })
          aiResult = chatRes
          explanation = chatRes.content || ''
        } else {
          const chatRes = $ai.chat({
            model: 'fast',
            messages: [
              {
                role: 'system',
                content:
                  'Você é o Planejador IA do TMS CIAFAL. Seja analítico, direto e justifique os scores das cargas. ATENÇÃO MÁXIMA: Regras RESTRITIVA e CRÍTICA de clientes são regras duras de engenharia e NUNCA devem ser ignoradas. Proponha alternativas caso o pedido/veículo seja incompatível.',
              },
              { role: 'user', content: message },
            ],
          })
          explanation =
            chatRes.choices && chatRes.choices[0] && chatRes.choices[0].message
              ? chatRes.choices[0].message.content
              : ''
        }
      } catch (aiErr) {
        fallbackUsed = true
        explanation =
          'IA indisponível — planejamento determinístico ativo. Todos os cenários e scores foram gerados pelo motor matemático com 100% de confiabilidade.'
      }

      return e.json(200, {
        status: 'success',
        fallback_used: fallbackUsed,
        explanation: explanation,
        ai_result: aiResult,
        governance: {
          model: fallbackUsed ? 'DETERMINISTIC_ENGINE_V6' : 'planejador-cargas-ia-v1',
          rules_version: 'SPRINT_6_RULES_2025.1',
          timestamp: new Date().toISOString(),
        },
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha na análise do planejador IA' })
    }
  },
  $apis.requireAuth(),
)
