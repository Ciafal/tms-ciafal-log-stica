/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Seed Parâmetros de Negociação Inteligente & Autonomia
    const negParamsCol = app.findCollectionByNameOrId('negotiation_parameters')
    const seedParams = [
      {
        rule_name: 'PADRAO_CIAFAL_CAMPINAS_SP',
        itinerary_code: 'ITIN-SP-CPS-01',
        region: 'Interior SP',
        vehicle_type: 'Carreta Vanderléia 3E',
        autonomy_level: 1, // Nível 1: IA negocia, humano aprova
        max_counter_rounds: 3,
        wave1_duration_min: 15,
        wave2_duration_min: 30,
        wave3_duration_min: 60,
        default_margin_target_pct: 12.5,
        max_autonomy_spread_pct: 6.5,
        is_active: true,
        notes: 'Parâmetro padrão para operações de alto volume CIAFAL - Região Campinas.',
      },
      {
        rule_name: 'PADRAO_VALE_PARAIBA',
        itinerary_code: 'ITIN-SP-SJC-02',
        region: 'Vale do Paraíba',
        vehicle_type: 'Bitrem 7 Eixos',
        autonomy_level: 1,
        max_counter_rounds: 3,
        wave1_duration_min: 15,
        wave2_duration_min: 30,
        wave3_duration_min: 45,
        default_margin_target_pct: 14.0,
        max_autonomy_spread_pct: 5.0,
        is_active: true,
        notes: 'Rota industrial com alta pontualidade exigida.',
      },
    ]

    for (const p of seedParams) {
      try {
        app.findFirstRecordByData('negotiation_parameters', 'rule_name', p.rule_name)
      } catch (_) {
        const r = new Record(negParamsCol)
        r.set('rule_name', p.rule_name)
        r.set('itinerary_code', p.itinerary_code)
        r.set('region', p.region)
        r.set('vehicle_type', p.vehicle_type)
        r.set('autonomy_level', p.autonomy_level)
        r.set('max_counter_rounds', p.max_counter_rounds)
        r.set('wave1_duration_min', p.wave1_duration_min)
        r.set('wave2_duration_min', p.wave2_duration_min)
        r.set('wave3_duration_min', p.wave3_duration_min)
        r.set('default_margin_target_pct', p.default_margin_target_pct)
        r.set('max_autonomy_spread_pct', p.max_autonomy_spread_pct)
        r.set('is_active', p.is_active)
        r.set('notes', p.notes)
        app.save(r)
      }
    }

    // 2. Seed SLAs de Expedição
    const slaCol = app.findCollectionByNameOrId('expedition_sla_parameters')
    const seedSlas = [
      {
        stage_name: 'Chegada ao Check-in (T1)',
        stage_code: 'CHECK_IN',
        target_min: 10,
        warning_threshold_pct: 80,
        critical_threshold_pct: 100,
        responsible_sector: 'Portaria e Acesso',
        is_active: true,
        description: 'Validação de identificação e entrada no pátio',
      },
      {
        stage_name: 'Liberação de Estoque / WMS (T2)',
        stage_code: 'LIBERACAO_ESTOQUE',
        target_min: 20,
        warning_threshold_pct: 85,
        critical_threshold_pct: 100,
        responsible_sector: 'WMS / Estoque',
        is_active: true,
        description: 'Disponibilização do saldo físico pelo DP34',
      },
      {
        stage_name: 'Separação e Picking (T3)',
        stage_code: 'SEPARACAO',
        target_min: 30,
        warning_threshold_pct: 80,
        critical_threshold_pct: 100,
        responsible_sector: 'WMS / Ponte Rolante',
        is_active: true,
        description: 'Movimentação dos perfis pesados e amarrações',
      },
      {
        stage_name: 'Carregamento do Veículo (T4)',
        stage_code: 'CARREGAMENTO',
        target_min: 45,
        warning_threshold_pct: 80,
        critical_threshold_pct: 100,
        responsible_sector: 'Operação de Doca',
        is_active: true,
        description: 'Posicionamento e amarração das peças',
      },
      {
        stage_name: 'Conferência Operacional (T5)',
        stage_code: 'CONFERENCIA',
        target_min: 15,
        warning_threshold_pct: 80,
        critical_threshold_pct: 100,
        responsible_sector: 'Qualidade / Expedição',
        is_active: true,
        description: 'Pesagem na balança e conferência de itens',
      },
      {
        stage_name: 'Faturamento e NF-e (T6)',
        stage_code: 'FATURAMENTO',
        target_min: 15,
        warning_threshold_pct: 80,
        critical_threshold_pct: 100,
        responsible_sector: 'Fiscal / SAP ECC',
        is_active: true,
        description: 'Emissão de NF-e, CT-e e MDF-e',
      },
      {
        stage_name: 'Liberação Final e Saída (T7)',
        stage_code: 'LIBERACAO_FINAL',
        target_min: 10,
        warning_threshold_pct: 80,
        critical_threshold_pct: 100,
        responsible_sector: 'Portaria',
        is_active: true,
        description: 'Entrega de canhotos e liberação da cancela',
      },
    ]

    for (const s of seedSlas) {
      try {
        app.findFirstRecordByData('expedition_sla_parameters', 'stage_code', s.stage_code)
      } catch (_) {
        const r = new Record(slaCol)
        r.set('stage_name', s.stage_name)
        r.set('stage_code', s.stage_code)
        r.set('target_min', s.target_min)
        r.set('warning_threshold_pct', s.warning_threshold_pct)
        r.set('critical_threshold_pct', s.critical_threshold_pct)
        r.set('responsible_sector', s.responsible_sector)
        r.set('is_active', s.is_active)
        r.set('description', s.description)
        app.save(r)
      }
    }

    // 3. Seed Performance de Motoristas (Índice de Custo Sustentável)
    const perfCol = app.findCollectionByNameOrId('driver_performance_indicators')
    const sampleDrivers = [
      {
        driver_id: 'drv-joao-silva',
        driver_name: 'João Silva Santos',
        driver_document: '123.456.789-00',
        sustainable_cost_index: 96,
        offers_received_count: 42,
        offers_accepted_count: 38,
        offers_refused_count: 4,
        cancellations_count: 0,
        accept_rate_pct: 90.5,
        avg_response_time_min: 4.2,
        avg_price_deviation_pct: -1.8,
        avg_punctuality_pct: 98.0,
        avg_yard_stay_min: 88,
        delivery_performance_pct: 99.2,
        historical_trips_count: 85,
        preferred_regions: ['Campinas', 'RMC', 'Sorocaba'],
        operational_metrics: { zero_cancellations: true, preferred_body: 'Sider/Grade Baixa' },
      },
      {
        driver_id: 'drv-carlos-oliveira',
        driver_name: 'Carlos Oliveira',
        driver_document: '234.567.890-11',
        sustainable_cost_index: 91,
        offers_received_count: 36,
        offers_accepted_count: 30,
        offers_refused_count: 6,
        cancellations_count: 1,
        accept_rate_pct: 83.3,
        avg_response_time_min: 6.8,
        avg_price_deviation_pct: 0.5,
        avg_punctuality_pct: 94.0,
        avg_yard_stay_min: 104,
        delivery_performance_pct: 96.5,
        historical_trips_count: 62,
        preferred_regions: ['Vale do Paraíba', 'Litoral Norte'],
        operational_metrics: { preferred_body: 'Carreta Aberta' },
      },
      {
        driver_id: 'drv-pedro-souza',
        driver_name: 'Pedro Henrique Souza',
        driver_document: '345.678.901-22',
        sustainable_cost_index: 87,
        offers_received_count: 28,
        offers_accepted_count: 22,
        offers_refused_count: 6,
        cancellations_count: 2,
        accept_rate_pct: 78.6,
        avg_response_time_min: 9.5,
        avg_price_deviation_pct: 2.1,
        avg_punctuality_pct: 89.0,
        avg_yard_stay_min: 125,
        delivery_performance_pct: 92.0,
        historical_trips_count: 44,
        preferred_regions: ['Grande SP', 'ABCD'],
        operational_metrics: { preferred_body: 'Truck Pesado' },
      },
    ]

    for (const d of sampleDrivers) {
      try {
        app.findFirstRecordByData('driver_performance_indicators', 'driver_id', d.driver_id)
      } catch (_) {
        const r = new Record(perfCol)
        r.set('driver_id', d.driver_id)
        r.set('driver_name', d.driver_name)
        r.set('driver_document', d.driver_document)
        r.set('sustainable_cost_index', d.sustainable_cost_index)
        r.set('offers_received_count', d.offers_received_count)
        r.set('offers_accepted_count', d.offers_accepted_count)
        r.set('offers_refused_count', d.offers_refused_count)
        r.set('cancellations_count', d.cancellations_count)
        r.set('accept_rate_pct', d.accept_rate_pct)
        r.set('avg_response_time_min', d.avg_response_time_min)
        r.set('avg_price_deviation_pct', d.avg_price_deviation_pct)
        r.set('avg_punctuality_pct', d.avg_punctuality_pct)
        r.set('avg_yard_stay_min', d.avg_yard_stay_min)
        r.set('delivery_performance_pct', d.delivery_performance_pct)
        r.set('historical_trips_count', d.historical_trips_count)
        r.set('preferred_regions', d.preferred_regions)
        r.set('operational_metrics', d.operational_metrics)
        app.save(r)
      }
    }

    // 4. Seed Cargas em Expedição Operacional Real
    const expTrackCol = app.findCollectionByNameOrId('expedition_tracking')
    const sampleExpeditions = [
      {
        cargo_id: 'CARGA-5522',
        sap_transport_number: '1004829102',
        driver_name: 'João Silva Santos',
        driver_document: '123.456.789-00',
        driver_phone: '(19) 98765-4321',
        vehicle_plate: 'ABC1D23',
        carrier_name: 'Transvale Transportes Ltda',
        itinerary_code: 'ITIN-SP-CPS-01',
        destination_cities: 'Campinas, Sumaré, Hortolândia',
        clients_summary: 'Metalúrgica Campinas (15t), Estruturas Sumaré (12.2t)',
        weight_total_kg: 27200,
        volume_total_m3: 38.5,
        deliveries_count: 2,
        operational_status: 'EM_CARREGAMENTO',
        current_stage_name: 'Em Carregamento na Doca 04',
        current_stage_start: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
        current_stage_duration_min: 42,
        entry_time: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
        total_lead_time_min: 110,
        target_lead_time_min: 145,
        sla_status: 'NORMAL',
        delay_risk_pct: 18,
        priority_level: 'NORMAL',
        wms_status_detail: '28.1t total — Disponível: 28.1t (100% DP34)',
        wms_available_weight_kg: 27200,
        wms_pending_weight_kg: 0,
        wms_priority_requested: false,
        assigned_dock: 'Doca 04 - Ponte 02',
        source_system: 'Planejador IA / SAP ECC',
        correlation_id: 'EXP-5522-CORR',
      },
      {
        cargo_id: 'CARGA-5538',
        sap_transport_number: '1004829108',
        driver_name: 'Carlos Oliveira',
        driver_document: '234.567.890-11',
        driver_phone: '(12) 99123-4567',
        vehicle_plate: 'XYZ9E87',
        carrier_name: 'Expresso Vale Cargas',
        itinerary_code: 'ITIN-SP-SJC-02',
        destination_cities: 'São José dos Campos, Taubaté',
        clients_summary: 'Siderúrgica Paraíba (18t), Aço Forte Taubaté (10t)',
        weight_total_kg: 28000,
        volume_total_m3: 40.0,
        deliveries_count: 2,
        operational_status: 'AGUARDANDO_ESTOQUE',
        current_stage_name: 'Aguardando Liberação WMS DP34',
        current_stage_start: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
        current_stage_duration_min: 47,
        entry_time: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
        total_lead_time_min: 55,
        target_lead_time_min: 145,
        sla_status: 'CRITICO_ATRASADO',
        delay_risk_pct: 82,
        delay_root_cause:
          'Separação ainda não concluída no WMS. Pendência de 2,8t no depósito DP34.',
        delay_evidence: 'Motorista no pátio há 47 min; apenas 13t separadas de 28t necessárias.',
        delay_suggested_action: 'Solicitar prioridade de movimentação de ponte rolante ao WMS.',
        delay_reason_category: 'ESTOQUE',
        priority_level: 'URGENTE',
        wms_status_detail: '28.0t total — Disponível: 25.2t — Em separação: 2.8t',
        wms_available_weight_kg: 25200,
        wms_pending_weight_kg: 2800,
        wms_priority_requested: false,
        assigned_dock: 'Doca 02',
        source_system: 'Planejador IA / SAP ECC',
        correlation_id: 'EXP-5538-CORR',
      },
    ]

    for (const exp of sampleExpeditions) {
      try {
        app.findFirstRecordByData('expedition_tracking', 'cargo_id', exp.cargo_id)
      } catch (_) {
        const r = new Record(expTrackCol)
        r.set('cargo_id', exp.cargo_id)
        r.set('sap_transport_number', exp.sap_transport_number)
        r.set('driver_name', exp.driver_name)
        r.set('driver_document', exp.driver_document)
        r.set('driver_phone', exp.driver_phone)
        r.set('vehicle_plate', exp.vehicle_plate)
        r.set('carrier_name', exp.carrier_name)
        r.set('itinerary_code', exp.itinerary_code)
        r.set('destination_cities', exp.destination_cities)
        r.set('clients_summary', exp.clients_summary)
        r.set('weight_total_kg', exp.weight_total_kg)
        r.set('volume_total_m3', exp.volume_total_m3)
        r.set('deliveries_count', exp.deliveries_count)
        r.set('operational_status', exp.operational_status)
        r.set('current_stage_name', exp.current_stage_name)
        r.set('current_stage_start', exp.current_stage_start)
        r.set('current_stage_duration_min', exp.current_stage_duration_min)
        r.set('entry_time', exp.entry_time)
        r.set('total_lead_time_min', exp.total_lead_time_min)
        r.set('target_lead_time_min', exp.target_lead_time_min)
        r.set('sla_status', exp.sla_status)
        r.set('delay_risk_pct', exp.delay_risk_pct)
        if (exp.delay_root_cause) r.set('delay_root_cause', exp.delay_root_cause)
        if (exp.delay_evidence) r.set('delay_evidence', exp.delay_evidence)
        if (exp.delay_suggested_action) r.set('delay_suggested_action', exp.delay_suggested_action)
        if (exp.delay_reason_category) r.set('delay_reason_category', exp.delay_reason_category)
        r.set('priority_level', exp.priority_level)
        r.set('wms_status_detail', exp.wms_status_detail)
        r.set('wms_available_weight_kg', exp.wms_available_weight_kg)
        r.set('wms_pending_weight_kg', exp.wms_pending_weight_kg)
        r.set('wms_priority_requested', exp.wms_priority_requested)
        r.set('assigned_dock', exp.assigned_dock)
        r.set('source_system', exp.source_system)
        r.set('correlation_id', exp.correlation_id)
        app.save(r)
      }
    }
  },
  (app) => {
    // Revert seed if needed
  },
)
