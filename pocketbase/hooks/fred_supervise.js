/// <reference path="../pb_data/types.d.ts" />

// Hook para Interação, Escalonamento Humano e Supervisão do Agente Fred
routerAdd(
  'POST',
  '/backend/v1/fred/supervise',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const action = body.action // 'takeover' | 'handback' | 'send_alert' | 'update_location' | 'confirm_discharge'
      const sapTransportNumber = body.sap_transport_number
      const user = e.auth

      if (!sapTransportNumber) {
        return e.badRequestError('sap_transport_number é obrigatório')
      }

      let transportRec = null
      try {
        transportRec = $app.findFirstRecordByData(
          'fred_transports',
          'sap_transport_number',
          sapTransportNumber,
        )
      } catch (_) {
        return e.notFoundError('Transporte não encontrado no monitoramento Fred')
      }

      const nowIso = new Date().toISOString()

      if (action === 'takeover') {
        transportRec.set('active_actor', 'HUMANO')
        transportRec.set(
          'human_takeover_user',
          user?.getString('name') || user?.getString('email') || 'Operador Logístico',
        )
        transportRec.set('human_takeover_reason', body.reason || 'Intervenção manual solicitada')
        transportRec.set('human_takeover_at', nowIso)
        $app.save(transportRec)

        // Registrar na timeline
        const timeCol = $app.findCollectionByNameOrId('fred_timeline_events')
        const tRec = new Record(timeCol)
        tRec.set('sap_transport_number', sapTransportNumber)
        tRec.set('event_code', 'HUMAN_TAKEOVER')
        tRec.set('event_title', 'Operador Humano Assumiu a Conversa')
        tRec.set('event_description', 'Motivo: ' + (body.reason || 'Intervenção manual'))
        tRec.set('event_source', 'HUMANO')
        tRec.set('event_severity', 'WARNING')
        tRec.set('event_timestamp', nowIso)
        $app.save(tRec)

        return e.json(200, {
          success: true,
          message: 'Operador humano assumiu o transporte com sucesso.',
        })
      }

      if (action === 'handback') {
        transportRec.set('active_actor', 'FRED_IA')
        transportRec.set('human_takeover_user', '')
        transportRec.set('human_takeover_reason', '')
        $app.save(transportRec)

        const timeCol = $app.findCollectionByNameOrId('fred_timeline_events')
        const tRec = new Record(timeCol)
        tRec.set('sap_transport_number', sapTransportNumber)
        tRec.set('event_code', 'FRED_RESUMED')
        tRec.set('event_title', 'Conversa Devolvida ao Fred IA')
        tRec.set(
          'event_description',
          'Diretrizes: ' + (body.notes || 'Acompanhamento normal restabelecido'),
        )
        tRec.set('event_source', 'HUMANO')
        tRec.set('event_severity', 'INFO')
        tRec.set('event_timestamp', nowIso)
        $app.save(tRec)

        return e.json(200, {
          success: true,
          message: 'Transporte devolvido ao Fred IA com sucesso.',
        })
      }

      if (action === 'update_location') {
        if (body.lat !== undefined && body.lng !== undefined) {
          transportRec.set('last_location_lat', Number(body.lat))
          transportRec.set('last_location_lng', Number(body.lng))
          transportRec.set('last_location_name', body.location_name || 'Posição GPS atualizada')
          transportRec.set('last_location_updated_at', nowIso)
          transportRec.set('last_location_is_stale', false)
          $app.save(transportRec)
        }
        return e.json(200, { success: true, message: 'Geolocalização atualizada.' })
      }

      return e.badRequestError('Ação desconhecida')
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro interno na supervisão Fred' })
    }
  },
  $apis.requireAuth(),
)
