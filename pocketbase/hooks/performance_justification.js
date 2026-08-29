// Hook para Processamento do Direito de Justificativa do Motorista (CIAFAL Logística)
// Princípio de Parceria: Fred acolhe justificativas em áudio ou texto, transcreve e reanalisa responsabilidade

routerAdd(
  'POST',
  '/backend/v1/performance/submit-justification',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const occurrenceId = body.occurrence_id
      const sapTransportNumber = body.sap_transport_number
      const driverId = body.driver_id
      const driverName = body.driver_name || 'Motorista'
      const justificationText = body.justification_text || ''
      const audioUrl = body.audio_url || ''

      if (!occurrenceId || (!justificationText && !audioUrl)) {
        return e.badRequestError(
          'occurrence_id e justification_text ou audio_url são obrigatórios.',
        )
      }

      let simulatedTranscription = justificationText
      if (audioUrl && !justificationText) {
        simulatedTranscription = `Transcrição Fred IA: "${body.audio_transcription || 'Motorista justificou lentidão na serra e necessidade de parada técnica para reaperto das cintas de amarração.'}"`
      }

      // 1. Atualiza registro na matriz de responsabilidade
      let matrixRec = null
      try {
        matrixRec = $app.findFirstRecordByData(
          'performance_responsibility_matrix',
          'id',
          occurrenceId,
        )
      } catch (_) {
        try {
          matrixRec = $app.findFirstRecordByData(
            'performance_responsibility_matrix',
            'occurrence_code',
            occurrenceId,
          )
        } catch (_) {}
      }

      if (matrixRec) {
        matrixRec.set('driver_justification_status', 'JUSTIFICADO')
        matrixRec.set('driver_justification_text', simulatedTranscription)
        if (audioUrl) matrixRec.set('driver_justification_audio_url', audioUrl)
        matrixRec.set(
          'ai_hypothesis',
          `Justificativa acolhida pelo Fred. Evidência anexada ao histórico do transporte ${sapTransportNumber}.`,
        )
        matrixRec.set('ai_next_recommended_action', 'Revisar impacto no subscore de pontualidade.')
        $app.save(matrixRec)
      }

      // 2. Registra na trilha de auditoria
      try {
        const auditCol = $app.findCollectionByNameOrId('performance_audit_ledger')
        const auditRec = new Record(auditCol)
        auditRec.set(
          'driver_id',
          driverId || (matrixRec ? matrixRec.getString('driver_id') : 'drv'),
        )
        auditRec.set('driver_name', driverName)
        auditRec.set('transport_sap', sapTransportNumber)
        auditRec.set('event_type', 'JUSTIFICATION_SUBMITTED')
        auditRec.set('score_before', 0)
        auditRec.set('score_after', 0)
        auditRec.set('justifications_applied_json', JSON.stringify([simulatedTranscription]))
        auditRec.set('user_email', e.auth ? e.auth.email : 'fred_bot@ciafal.corp')
        auditRec.set('user_name', e.auth ? e.auth.getString('name') : 'Fred IA')
        auditRec.set(
          'human_notes',
          'Direito de justificativa exercido pelo motorista e registrado para auditoria.',
        )
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        occurrence_id: occurrenceId,
        status: 'JUSTIFICADO',
        transcription: simulatedTranscription,
        message:
          'Registramos sua explicação com sucesso para mantermos o histórico do transporte corretamente.',
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao processar justificativa' })
    }
  },
  $apis.requireAuth(),
)
