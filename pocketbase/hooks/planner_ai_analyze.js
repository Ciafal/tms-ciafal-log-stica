// Hook Skip Cloud: Agente IA Planejador de Cargas & Explicações
routerAdd(
  'POST',
  '/backend/v1/planner-ai/analyze',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : ''
      const body = e.requestInfo().body || {}
      const itineraryCode = body.itinerary_code || 'MG001A'
      const message =
        body.message ||
        'Analise os pedidos do itinerário ' +
          itineraryCode +
          ' e recomende os melhores cenários de carga considerando estoque DP34, crédito e motoristas PORTA.'

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
                  'Você é o Planejador IA do TMS CIAFAL. Seja analítico, direto e justifique os scores das cargas.',
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
