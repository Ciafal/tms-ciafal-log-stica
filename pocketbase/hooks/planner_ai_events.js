// Hook Skip Cloud: Disparo de Reanálise do Planejador por Eventos Operacionais
routerAdd(
  'POST',
  '/backend/v1/planner-ai/trigger-event',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const eventType = body.event_type || 'GENERIC_EVENT'
      const cargoId = body.cargo_id || null
      const itineraryCode = body.itinerary_code || 'MG001A'
      const details = body.details || ''

      // Atualizar status de cargas impactadas se aplicável
      let impactedCount = 0
      if (cargoId) {
        try {
          const records = $app.findRecordsByFilter(
            'ai_planner_recommendations',
            "converted_cargo_id = '" + cargoId + "' || scenario_id = '" + cargoId + "'",
            '-created',
            10,
            0,
          )
          for (let i = 0; i < records.length; i++) {
            const rec = records[i]
            if (rec.getString('status') === 'APROVADO') {
              rec.set('status', 'IMPACTADO_REANALISE')
              rec.set('approval_notes', 'Evento de impacto: ' + eventType + ' — ' + details)
              $app.save(rec)
              impactedCount++
            }
          }
        } catch (_) {}
      }

      return e.json(200, {
        status: 'success',
        event_registered: eventType,
        itinerary_code: itineraryCode,
        impacted_recommendations: impactedCount,
        requires_reanalysis: true,
        message: 'PROGRAMAÇÃO IMPACTADA — REANÁLISE NECESSÁRIA registrada com sucesso.',
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao processar evento de replanejamento' })
    }
  },
  $apis.requireAuth(),
)
