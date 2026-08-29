// Hook Skip Cloud: Agente IA Carlão — Negociação de Fretes & Explicações
routerAdd(
  'POST',
  '/backend/v1/carlao/negotiate',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : ''
      const body = e.requestInfo().body || {}
      const cargoId = body.cargo_id || 'CARGA-5522'
      const driverName = body.driver_name || 'Motorista Parceiro'
      const driverProposedValue = body.driver_counter_value || 0
      const targetValue = body.target_value || 2650
      const referenceValue = body.reference_value || 2720
      const maxAutonomyValue = body.max_autonomy_value || 2820
      const floorValue = body.floor_value || 2532
      const pedagioValue = body.pedagio_value || 428.4
      const roundNumber = body.round_number || 1
      const isAudio = Boolean(body.is_audio)
      const audioText = body.audio_transcription || ''

      const message =
        body.message ||
        'Carga: ' +
          cargoId +
          '. Motorista: ' +
          driverName +
          '. Contraproposta do motorista: R$ ' +
          driverProposedValue +
          '. Teto de Autonomia Carlão: R$ ' +
          maxAutonomyValue +
          '. Meta CIAFAL: R$ ' +
          targetValue +
          '. Pedágio destacado: R$ ' +
          pedagioValue +
          '. Rodada: ' +
          roundNumber +
          '. ' +
          (isAudio ? 'Áudio recebido do motorista com transcrição: "' + audioText + '".' : '') +
          ' Proponha a melhor resposta cordial, profissional, respeitando a faixa e separando frete e pedágio.'

      let aiResult = null
      let fallbackUsed = false
      let carlaoResponse = ''
      let proposedNextValue = targetValue
      let decision = 'COUNTER_PROPOSAL' // ACCEPT, COUNTER_PROPOSAL, ESCALATE_HUMAN, REJECT

      // Deterministic Negotiation Rules Engine
      if (driverProposedValue > 0) {
        if (driverProposedValue <= targetValue) {
          proposedNextValue = driverProposedValue
          decision = 'ACCEPT'
        } else if (driverProposedValue <= maxAutonomyValue) {
          if (roundNumber === 1) {
            proposedNextValue = Math.round(targetValue + (driverProposedValue - targetValue) * 0.4)
            decision = 'COUNTER_PROPOSAL'
          } else if (roundNumber === 2) {
            proposedNextValue = Math.round(targetValue + (driverProposedValue - targetValue) * 0.75)
            decision = 'COUNTER_PROPOSAL'
          } else {
            proposedNextValue = Math.min(driverProposedValue, maxAutonomyValue)
            decision = 'ACCEPT'
          }
        } else {
          // Acima da autonomia máxima do Carlão -> Escalar para aprovação humana
          proposedNextValue = maxAutonomyValue
          decision = 'ESCALATE_HUMAN'
        }
      } else {
        proposedNextValue = targetValue
        decision = 'COUNTER_PROPOSAL'
      }

      try {
        if (userId) {
          const agent = $ai.agent('carlao-negociador')
          const chatRes = agent.chat({
            user_id: userId,
            conversation_id: body.conversation_id || null,
            message: message,
          })
          aiResult = chatRes
          carlaoResponse = chatRes.content || ''
        } else {
          const chatRes = $ai.chat({
            model: 'fast',
            messages: [
              {
                role: 'system',
                content:
                  'Você é o CARLÃO, negociador de fretes da CIAFAL. Seja cordial, amigável, respeitoso e destaque SEMPRE o valor do Frete separado do Pedágio. Nunca seja agressivo.',
              },
              { role: 'user', content: message },
            ],
          })
          carlaoResponse =
            chatRes.choices && chatRes.choices[0] && chatRes.choices[0].message
              ? chatRes.choices[0].message.content
              : ''
        }
      } catch (aiErr) {
        fallbackUsed = true
        if (decision === 'ACCEPT') {
          carlaoResponse =
            'Fechado, ' +
            driverName +
            '! Conseguimos fechar no valor de Frete R$ ' +
            proposedNextValue.toLocaleString('pt-BR') +
            ' + Pedágio de R$ ' +
            pedagioValue.toLocaleString('pt-BR') +
            '. Já estou preparando a confirmação da sua carga.'
        } else if (decision === 'ESCALATE_HUMAN') {
          carlaoResponse =
            'Compreendo sua posição, ' +
            driverName +
            '. Esse valor de R$ ' +
            driverProposedValue.toLocaleString('pt-BR') +
            ' excede minha alçada direta. Estou transferindo agora para nosso Gestor de Cargas avaliar sua solicitação.'
        } else {
          carlaoResponse =
            'Olá, ' +
            driverName +
            '! Conseguimos chegar a R$ ' +
            proposedNextValue.toLocaleString('pt-BR') +
            ' de frete líquido para você, além do pedágio integral de R$ ' +
            pedagioValue.toLocaleString('pt-BR') +
            '. Fica bom para carregarmos hoje?'
        }
      }

      return e.json(200, {
        status: 'success',
        fallback_used: fallbackUsed,
        carlao_message: carlaoResponse,
        decision: decision,
        proposed_freight_value: proposedNextValue,
        pedagio_value: pedagioValue,
        total_proposed_value: proposedNextValue + pedagioValue,
        round_number: roundNumber,
        explainability: {
          piso_antt: floorValue,
          meta_ciafal: targetValue,
          referencia_mercado: referenceValue,
          autonomia_maxima: maxAutonomyValue,
          driver_score: body.driver_score || 94,
          justificativa:
            'Proposta calculada com base na rota ' +
            cargoId +
            ', histórico de pontualidade do motorista, meta de custo sustentável e autonomia Nível 1.',
        },
        governance: {
          model: fallbackUsed ? 'DETERMINISTIC_CARLAO_ENGINE' : 'carlao-negociador-skip-cloud',
          rules_version: 'CARLAO_RULES_2026.1',
          timestamp: new Date().toISOString(),
        },
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha no processamento do agente Carlão' })
    }
  },
  $apis.requireAuth(),
)
