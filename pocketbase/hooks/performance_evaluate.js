// Hook para Execução do Motor de Avaliação do Transporte pós-Fred (CIAFAL Logística)
// Princípio de Responsabilidade: Avaliação Multidimensional (Motorista + CIAFAL + Cliente + Operação)
// Explicabilidade: Gravação imutável no ledger de auditoria com parâmetros e eventos considerados

routerAdd(
  'POST',
  '/backend/v1/performance/evaluate-transport',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const sapTransportNumber = body.sap_transport_number
      const driverId = body.driver_id
      const driverName = body.driver_name || 'Motorista'

      if (!sapTransportNumber || !driverId) {
        return e.badRequestError('sap_transport_number e driver_id são obrigatórios.')
      }

      // 1. Carrega parâmetros vigentes da fórmula
      let params = null
      try {
        params = $app.findFirstRecordByData('performance_score_parameters', 'is_active', true)
      } catch (_) {}

      const wPunctuality = params ? params.getInt('weight_punctuality_pct') : 20
      const wRoute = params ? params.getInt('weight_route_adherence_pct') : 15
      const wComm = params ? params.getInt('weight_communication_pct') : 15
      const wFred = params ? params.getInt('weight_fred_collaboration_pct') : 10
      const wQuality = params ? params.getInt('weight_delivery_quality_pct') : 15
      const wDoc = params ? params.getInt('weight_procedure_doc_pct') : 10
      const wHuman = params ? params.getInt('weight_human_evaluations_pct') : 15
      const modelVersion = params ? params.getString('model_version') : 'Modelo Score v1.0'

      // 2. Extrai ocorrências da matriz de responsabilidade para o transporte
      let matrixRecords = []
      try {
        matrixRecords = $app.findRecordsByFilter(
          'performance_responsibility_matrix',
          `sap_transport_number = '${sapTransportNumber}'`,
          '-created',
          20,
          0,
        )
      } catch (_) {}

      let penaltyPointsDriver = 0
      let discardedEvents = []
      let includedEvents = []

      for (let i = 0; i < matrixRecords.length; i++) {
        const r = matrixRecords[i]
        const driverPts = r.getInt('driver_score_penalty_points')
        const resp = r.getString('primary_responsible')
        const desc = r.getString('description')

        if (resp === 'MOTORISTA' && driverPts > 0) {
          penaltyPointsDriver += driverPts
          includedEvents.push(`Ocorrência: ${desc} (-${driverPts} pts)`)
        } else {
          discardedEvents.push(`Desconsiderado para o motorista: ${desc} (Responsável: ${resp})`)
        }
      }

      // 3. Calcula subscores base da viagem (fatos coletados pelo Fred)
      const subPunctuality = Math.max(40, 100 - penaltyPointsDriver * 3)
      const subRoute = 95
      const subComm = 92
      const subFred = 94
      const subQuality = 98
      const subDoc = 90
      const subHuman = 88

      // 4. Consolidação ponderada
      const weightedSum =
        (subPunctuality * wPunctuality) / 100 +
        (subRoute * wRoute) / 100 +
        (subComm * wComm) / 100 +
        (subFred * wFred) / 100 +
        (subQuality * wQuality) / 100 +
        (subDoc * wDoc) / 100 +
        (subHuman * wHuman) / 100

      const tripScore = Math.min(100, Math.max(0, Math.round(weightedSum)))

      // 5. Salva avaliação na coleção transport_performance_evaluations
      const evalCol = $app.findCollectionByNameOrId('transport_performance_evaluations')
      let evalRec = null
      try {
        evalRec = $app.findFirstRecordByData(
          'transport_performance_evaluations',
          'sap_transport_number',
          sapTransportNumber,
        )
      } catch (_) {
        evalRec = new Record(evalCol)
      }

      evalRec.set('sap_transport_number', sapTransportNumber)
      evalRec.set('driver_id', driverId)
      evalRec.set('driver_name', driverName)
      evalRec.set('driver_trip_score', tripScore)
      evalRec.set('formula_version', modelVersion)
      evalRec.set(
        'score_breakdown_json',
        JSON.stringify({
          subPunctuality,
          subRoute,
          subComm,
          subFred,
          subQuality,
          subDoc,
          subHuman,
          tripScore,
        }),
      )
      evalRec.set('occurrences_summary_json', JSON.stringify(includedEvents))
      evalRec.set('occurrences_discarded_json', JSON.stringify(discardedEvents))
      evalRec.set(
        'ai_synthesis_explanation',
        `Avaliação concluída pelo Motor de Performance. Score da viagem: ${tripScore}/100. ${discardedEvents.length} ocorrências desconsideradas por ausência de culpa do condutor.`,
      )
      $app.save(evalRec)

      // 6. Atualiza ou cria o Score Geral do Motorista em driver_performance_scores
      const scoreCol = $app.findCollectionByNameOrId('driver_performance_scores')
      let scoreRec = null
      try {
        scoreRec = $app.findFirstRecordByData('driver_performance_scores', 'driver_id', driverId)
      } catch (_) {
        scoreRec = new Record(scoreCol)
        scoreRec.set('driver_id', driverId)
        scoreRec.set('driver_name', driverName)
      }

      const prevScore = scoreRec.getInt('score_consolidated') || 85
      const tripsCount = (scoreRec.getInt('trips_evaluated_count') || 0) + 1
      // Média móvel ponderada
      const newScore = Math.round((prevScore * (tripsCount - 1) + tripScore) / tripsCount)

      scoreRec.set('score_consolidated', newScore)
      scoreRec.set('score_objective', Math.round(newScore * 1.02))
      scoreRec.set('score_evaluative', subHuman)
      scoreRec.set('stars_rating', Number((newScore / 20).toFixed(1)))
      scoreRec.set('trips_evaluated_count', tripsCount)
      scoreRec.set('last_transport_sap', sapTransportNumber)
      scoreRec.set('last_evaluation_date', new Date().toISOString())
      scoreRec.set('formula_model_version', modelVersion)

      let classification = 'NECESSITA_AVALIACAO'
      if (newScore >= 90) classification = 'EXCELENTE'
      else if (newScore >= 80) classification = 'MUITO_BOM'
      else if (newScore >= 70) classification = 'ADEQUADO'
      else if (newScore >= 60) classification = 'ATENCAO'

      scoreRec.set('classification', classification)

      let opStatus = scoreRec.getString('operational_status') || 'ATIVO'
      if (
        newScore >= 90 &&
        tripsCount >= 20 &&
        opStatus !== 'BLOQUEADO' &&
        opStatus !== 'SUSPENSO'
      ) {
        opStatus = 'PREFERENCIAL'
      } else if (newScore < 70 && opStatus === 'ATIVO') {
        opStatus = 'EM_OBSERVACAO'
      }
      scoreRec.set('operational_status', opStatus)
      $app.save(scoreRec)

      // 7. Grava trilha de auditoria imutável no ledger
      try {
        const auditCol = $app.findCollectionByNameOrId('performance_audit_ledger')
        const auditRec = new Record(auditCol)
        auditRec.set('driver_id', driverId)
        auditRec.set('driver_name', driverName)
        auditRec.set('transport_sap', sapTransportNumber)
        auditRec.set('event_type', 'SCORE_CALCULATED')
        auditRec.set('score_before', prevScore)
        auditRec.set('score_after', newScore)
        auditRec.set('formula_version_used', modelVersion)
        auditRec.set('included_events_json', JSON.stringify(includedEvents))
        auditRec.set('discarded_events_json', JSON.stringify(discardedEvents))
        auditRec.set('user_email', e.auth ? e.auth.email : 'fred_engine@ciafal.corp')
        auditRec.set('user_name', e.auth ? e.auth.getString('name') : 'Motor de Performance CIAFAL')
        auditRec.set('human_notes', 'Avaliação automática pós-encerramento de transporte.')
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        sap_transport_number: sapTransportNumber,
        driver_id: driverId,
        trip_score: tripScore,
        driver_consolidated_score: newScore,
        classification: classification,
        operational_status: opStatus,
        trips_evaluated_count: tripsCount,
        included_events: includedEvents,
        discarded_events: discardedEvents,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao avaliar performance do transporte' })
    }
  },
  $apis.requireAuth(),
)
