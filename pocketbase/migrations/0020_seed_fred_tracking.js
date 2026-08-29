/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Seed fred_transports
    const transportsCol = app.findCollectionByNameOrId('fred_transports')
    const nowIso = new Date().toISOString()
    const todayStr = nowIso.split('T')[0]

    const seedTransports = [
      {
        sap_transport_number: '123456',
        cargo_id: 'CARGA-SP-MG-089',
        driver_id: 'drv-001',
        driver_name: 'João Carlos Silva',
        driver_phone: '11988887711',
        vehicle_plate: 'BRA2E19',
        vehicle_type: 'Carreta LS 5 Eixos',
        carrier_name: 'Transportes Pontual CIAFAL',
        origin_plant: 'CIAFAL Matriz (São Paulo/SP)',
        itinerary_code: 'MG001A',
        destination_summary: 'Divinópolis / Belo Horizonte / Betim',
        total_weight_kg: 27500,
        total_deliveries_count: 4,
        completed_deliveries_count: 2,
        trip_status: 'EM_ROTA',
        started_at: `${todayStr}T07:32:00Z`,
        last_location_lat: -20.1438,
        last_location_lng: -44.8862,
        last_location_city: 0,
        last_location_name: 'BR-381 próximo a Divinópolis/MG',
        last_location_updated_at: nowIso,
        last_location_is_stale: false,
        current_next_stop_name: 'Comercial ABC Metais Ltda',
        current_next_stop_eta: `${todayStr}T15:18:00Z`,
        overall_eta_status: 'RISCO_ATRASO',
        delay_minutes_current: 18,
        active_occurrences_count: 1,
        active_actor: 'FRED_IA',
        total_ai_messages_count: 14,
        total_human_messages_count: 2,
        ai_duration_seconds: 1840,
        human_duration_seconds: 120,
        geo_tracking_authorized: true,
        geo_authorized_at: `${todayStr}T07:35:00Z`,
        sales_representatives_json: JSON.stringify([
          { name: 'Marcos Vendas', phone: '11977772211', client: 'Comercial ABC Metais' },
        ]),
        correlation_id: 'TR-123456-INIT',
      },
      {
        sap_transport_number: '123457',
        cargo_id: 'CARGA-SP-INT-092',
        driver_id: 'drv-002',
        driver_name: 'Antônio Marcos Peixoto',
        driver_phone: '19988776655',
        vehicle_plate: 'FAL4K90',
        vehicle_type: 'Truck 3 Eixos',
        carrier_name: 'Expresso Rápido Interior',
        origin_plant: 'CIAFAL Matriz (São Paulo/SP)',
        itinerary_code: 'SP002B',
        destination_summary: 'Campinas / Americana / Limeira',
        total_weight_kg: 14200,
        total_deliveries_count: 3,
        completed_deliveries_count: 3,
        trip_status: 'ENCERRADO',
        started_at: `${todayStr}T06:15:00Z`,
        finished_at: `${todayStr}T14:40:00Z`,
        last_location_lat: -22.5647,
        last_location_lng: -47.4017,
        last_location_city: 0,
        last_location_name: 'Limeira/SP (Pátio Cliente)',
        last_location_updated_at: nowIso,
        last_location_is_stale: false,
        current_next_stop_name: 'Todas as entregas concluídas',
        overall_eta_status: 'CONCLUIDO',
        delay_minutes_current: 0,
        active_occurrences_count: 0,
        active_actor: 'FRED_IA',
        total_ai_messages_count: 18,
        total_human_messages_count: 0,
        ai_duration_seconds: 2200,
        human_duration_seconds: 0,
        geo_tracking_authorized: true,
        geo_authorized_at: `${todayStr}T06:18:00Z`,
        correlation_id: 'TR-123457-INIT',
      },
    ]

    seedTransports.forEach((st) => {
      try {
        app.findFirstRecordByData(
          'fred_transports',
          'sap_transport_number',
          st.sap_transport_number,
        )
      } catch (_) {
        const rec = new Record(transportsCol)
        Object.keys(st).forEach((k) => rec.set(k, st[k]))
        app.save(rec)
      }
    })

    // 2. Seed fred_deliveries for 123456
    const deliveriesCol = app.findCollectionByNameOrId('fred_deliveries')
    const seedDeliveries = [
      {
        sap_transport_number: '123456',
        sequence_order: 1,
        customer_code: 'CLI-MG-001',
        customer_name: 'Estruturas Metálicas Itaúna',
        destination_city: 'Itaúna',
        destination_uf: 'MG',
        street_address: 'Av. Industrial, 450',
        contact_name: 'Carlos Portaria',
        contact_phone: '3799887766',
        sales_rep_name: 'Marcos Vendas',
        orders_list_json: JSON.stringify(['PED-8801']),
        invoice_numbers_json: JSON.stringify(['NF-5501']),
        weight_kg: 8500,
        window_start_time: '08:00',
        window_end_time: '12:00',
        initial_planned_arrival: `${todayStr}T10:00:00Z`,
        actual_arrival_at: `${todayStr}T09:45:00Z`,
        unloading_started_at: `${todayStr}T10:00:00Z`,
        unloading_finished_at: `${todayStr}T10:45:00Z`,
        avg_historical_unloading_min: 45,
        measured_unloading_min: 45,
        status: 'ENTREGUE',
        eta_status: 'ENTREGUE',
        discharge_confirmed_by_client: true,
        discharge_confirmed_at: `${todayStr}T09:10:00Z`,
      },
      {
        sap_transport_number: '123456',
        sequence_order: 2,
        customer_code: 'CLI-MG-002',
        customer_name: 'Aço Forte Distribuidora',
        destination_city: 'Divinópolis',
        destination_uf: 'MG',
        street_address: 'Rod. MG-050, Km 122',
        contact_name: 'Roberto Logística',
        contact_phone: '3799112233',
        sales_rep_name: 'Marcos Vendas',
        orders_list_json: JSON.stringify(['PED-8802']),
        invoice_numbers_json: JSON.stringify(['NF-5502']),
        weight_kg: 6200,
        window_start_time: '11:00',
        window_end_time: '14:00',
        initial_planned_arrival: `${todayStr}T12:30:00Z`,
        actual_arrival_at: `${todayStr}T12:20:00Z`,
        unloading_started_at: `${todayStr}T12:35:00Z`,
        unloading_finished_at: `${todayStr}T13:25:00Z`,
        avg_historical_unloading_min: 50,
        measured_unloading_min: 50,
        status: 'ENTREGUE',
        eta_status: 'ENTREGUE',
        discharge_confirmed_by_client: true,
        discharge_confirmed_at: `${todayStr}T11:45:00Z`,
      },
      {
        sap_transport_number: '123456',
        sequence_order: 3,
        customer_code: 'CLI-MG-003',
        customer_name: 'Comercial ABC Metais Ltda',
        destination_city: 'Betim',
        destination_uf: 'MG',
        street_address: 'Av. das Indústrias, 1020 - Portaria 2',
        contact_name: 'Valéria Recebimento',
        contact_phone: '31988223344',
        sales_rep_name: 'Marcos Vendas',
        sales_rep_phone: '11977772211',
        orders_list_json: JSON.stringify(['PED-8803']),
        invoice_numbers_json: JSON.stringify(['NF-5503']),
        weight_kg: 7800,
        window_start_time: '13:00',
        window_end_time: '16:00',
        initial_planned_arrival: `${todayStr}T15:00:00Z`,
        current_eta: `${todayStr}T15:18:00Z`,
        avg_historical_unloading_min: 60,
        status: 'EM_DESLOCAMENTO',
        eta_status: 'RISCO_ATRASO',
        discharge_confirmed_by_client: false,
        unloading_restriction_notes:
          'Recebimento de carretas exclusivamente até 16:00 pela Portaria 2.',
        delay_deviation_minutes: 18,
      },
      {
        sap_transport_number: '123456',
        sequence_order: 4,
        customer_code: 'CLI-MG-004',
        customer_name: 'Minas Perfis Industriais',
        destination_city: 'Belo Horizonte',
        destination_uf: 'MG',
        street_address: 'Anel Rodoviário Celso Mello Azevedo, 8900',
        contact_name: 'Henrique Estoque',
        contact_phone: '3199776655',
        sales_rep_name: 'Flávio Souza',
        orders_list_json: JSON.stringify(['PED-8804']),
        invoice_numbers_json: JSON.stringify(['NF-5504']),
        weight_kg: 5000,
        window_start_time: '14:00',
        window_end_time: '17:30',
        initial_planned_arrival: `${todayStr}T16:30:00Z`,
        current_eta: `${todayStr}T16:55:00Z`,
        avg_historical_unloading_min: 40,
        status: 'PENDENTE',
        eta_status: 'DENTRO_PREVISTO',
        discharge_confirmed_by_client: true,
        delay_deviation_minutes: 25,
      },
    ]

    seedDeliveries.forEach((sd) => {
      const rec = new Record(deliveriesCol)
      Object.keys(sd).forEach((k) => rec.set(k, sd[k]))
      app.save(rec)
    })

    // 3. Seed fred_occurrences
    const occCol = app.findCollectionByNameOrId('fred_occurrences')
    const seedOccurrences = [
      {
        sap_transport_number: '123456',
        customer_code: 'CLI-MG-003',
        customer_name: 'Comercial ABC Metais Ltda',
        driver_name: 'João Carlos Silva',
        category: 'CONGESTIONAMENTO',
        severity: 'MEDIA',
        description: 'Lentidão acentuada na BR-381 devido a obras no km 530 com desvio de faixa.',
        location_description: 'BR-381 km 530 - Divinópolis/Betim',
        latitude: -20.1438,
        longitude: -44.8862,
        estimated_impact_minutes: 18,
        status: 'EM_TRATAMENTO',
        responsible_handler: 'Fred IA / Marcos Vendas',
        ai_suggested_classification: 'CONGESTIONAMENTO',
        ai_classification_confidence: 94,
        human_confirmed: true,
        human_confirmed_by: 'Operador TMS CIAFAL',
      },
    ]
    seedOccurrences.forEach((so) => {
      const rec = new Record(occCol)
      Object.keys(so).forEach((k) => rec.set(k, so[k]))
      app.save(rec)
    })

    // 4. Seed fred_evidences
    const evidCol = app.findCollectionByNameOrId('fred_evidences')
    const seedEvidences = [
      {
        sap_transport_number: '123456',
        customer_code: 'CLI-MG-001',
        evidence_type: 'CANHOTO_ASSINADO',
        sender_role: 'MOTORISTA',
        sender_name: 'João Carlos Silva',
        sender_phone: '11988887711',
        file_name: 'canhoto_nf5501_assinado.jpg',
        ai_vision_description:
          'Foto de canhoto de NF 5501 assinado com carimbo de recebimento 10:45.',
        ai_suggested_tag: 'CANHOTO_ASSINADO',
        ai_confidence_pct: 98,
        is_human_validated: true,
        validated_by_user: 'Fred IA Validado',
        validation_notes: 'Canhoto nítido com assinatura legível e carimbo da portaria Itaúna.',
      },
      {
        sap_transport_number: '123456',
        customer_code: 'CLI-MG-003',
        evidence_type: 'AUDIO_MOTORISTA',
        sender_role: 'MOTORISTA',
        sender_name: 'João Carlos Silva',
        sender_phone: '11988887711',
        file_name: 'audio_audio_km530.ogg',
        audio_duration_seconds: 14,
        audio_transcription:
          'Fred, tô no km 530 da Fernão Dias, tem obra aqui na pista e tá tudo parado, vou atrasar uns 15 a 20 minutos pro Cliente ABC em Betim.',
        ai_suggested_tag: 'CONGESTIONAMENTO',
        ai_confidence_pct: 95,
        is_human_validated: true,
        validation_notes: 'Áudio transcrito e interpretado com sucesso para recálculo de ETA.',
      },
    ]
    seedEvidences.forEach((se) => {
      const rec = new Record(evidCol)
      Object.keys(se).forEach((k) => rec.set(k, se[k]))
      app.save(rec)
    })

    // 5. Seed fred_messages
    const msgCol = app.findCollectionByNameOrId('fred_messages')
    const seedMessages = [
      {
        sap_transport_number: '123456',
        sender_type: 'FRED_IA',
        sender_name: 'Fred IA (CIAFAL)',
        target_audience: 'MOTORISTA',
        message_channel: 'WHATSAPP',
        message_text:
          'Olá, João! Sou o Fred, assistente de acompanhamento de transporte da CIAFAL. Vou acompanhar sua viagem do Transporte SAP 123456 e ajudar caso tenha alguma necessidade durante as entregas.',
        message_type: 'TEXTO',
        is_delivered: true,
        is_read: true,
      },
      {
        sap_transport_number: '123456',
        sender_type: 'MOTORISTA',
        sender_name: 'João Carlos Silva',
        target_audience: 'OPERACAO_INTERNA',
        message_channel: 'WHATSAPP',
        message_text: 'Opa Fred, beleza! Saí da matriz agora, previsão 09:45 em Itaúna.',
        message_type: 'TEXTO',
        is_delivered: true,
        is_read: true,
      },
      {
        sap_transport_number: '123456',
        sender_type: 'FRED_IA',
        sender_name: 'Fred IA (CIAFAL)',
        target_audience: 'VENDEDOR',
        message_channel: 'CRM_360',
        message_text:
          'Aviso Comercial: Transporte SAP 123456 com 18 min de atraso previsto na entrega do Cliente Comercial ABC Metais (Betim). Nova previsão: 15:18 (Janela até 16:00).',
        message_type: 'ALERTA_PROATIVO',
        is_proactive_alert: true,
        alert_category: 'ATENCAO',
        is_delivered: true,
        is_read: true,
      },
    ]
    seedMessages.forEach((sm) => {
      const rec = new Record(msgCol)
      Object.keys(sm).forEach((k) => rec.set(k, sm[k]))
      app.save(rec)
    })

    // 6. Seed fred_timeline_events
    const timeCol = app.findCollectionByNameOrId('fred_timeline_events')
    const seedTimeline = [
      {
        sap_transport_number: '123456',
        event_code: 'SAP_TRANS_CREATED',
        event_title: 'Transporte SAP Criado',
        event_description:
          'Ordem de transporte oficial SAP 123456 gerada após aceite da Mesa de Fretes.',
        event_source: 'SAP',
        event_severity: 'SUCCESS',
        event_timestamp: `${todayStr}T07:15:00Z`,
      },
      {
        sap_transport_number: '123456',
        event_code: 'FRED_INIT',
        event_title: 'Início Acompanhamento Fred IA',
        event_description:
          'Fred iniciou contato no WhatsApp com João Carlos Silva e ativou monitoramento.',
        event_source: 'FRED_IA',
        event_severity: 'INFO',
        event_timestamp: `${todayStr}T07:32:00Z`,
      },
      {
        sap_transport_number: '123456',
        event_code: 'DELIVERY_1_COMPLETED',
        event_title: 'Entrega 1 Concluída (Itaúna)',
        event_description: '8.500 kg descarregados com canhoto assinado e enviado pelo motorista.',
        event_source: 'MOTORISTA',
        event_severity: 'SUCCESS',
        customer_name: 'Estruturas Metálicas Itaúna',
        event_timestamp: `${todayStr}T10:45:00Z`,
      },
      {
        sap_transport_number: '123456',
        event_code: 'OCCURRENCE_TRAFFIC',
        event_title: 'Intercorrência de Tráfego Detectada',
        event_description:
          'Áudio do motorista processado: congestionamento na BR-381 km 530 (+18 min no ETA).',
        event_source: 'FRED_IA',
        event_severity: 'WARNING',
        event_timestamp: `${todayStr}T14:15:00Z`,
      },
    ]
    seedTimeline.forEach((st) => {
      const rec = new Record(timeCol)
      Object.keys(st).forEach((k) => rec.set(k, st[k]))
      app.save(rec)
    })

    // 7. Seed fred_ai_analytics
    const analCol = app.findCollectionByNameOrId('fred_ai_analytics')
    const seedAnalytics = [
      {
        analysis_type: 'TEMPO_DESCARGA_CLIENTE',
        entity_target: 'CLIENTE',
        entity_id: 'CLI-MG-003',
        entity_name: 'Comercial ABC Metais Ltda',
        observed_fact:
          'Tempo médio real de descarga medido nos últimos 90 dias: 1h37 (base de 14 entregas).',
        ai_hypothesis:
          'Gargalo operacional de conferência manual no cliente supera a estimativa padrão cadastral.',
        confidence_pct: 92,
        historical_benchmark_json: JSON.stringify({
          parametro_cadastrado_min: 45,
          historico_real_min: 97,
          amostras_count: 14,
        }),
        recommended_action:
          'Revisar janela e sequência de carregamento para rotas que incluam este cliente no início da tarde.',
        master_parameter_suggested_change:
          'Parâmetro cadastrado: 45 min / Histórico observado: 1h37 / Sugestão IA: revisar parâmetro para 90 min.',
        reviewed_by_human: false,
      },
    ]
    seedAnalytics.forEach((sa) => {
      const rec = new Record(analCol)
      Object.keys(sa).forEach((k) => rec.set(k, sa[k]))
      app.save(rec)
    })
  },
  (app) => {
    // down seed
  },
)
