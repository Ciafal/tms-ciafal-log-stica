/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Seed inicial de QLIK Profitability Records
    const qlikCol = app.findCollectionByNameOrId('qlik_profitability_records')
    const qlikSeeds = [
      {
        sap_transport_number: '10048201',
        order_number: '0045012380',
        delivery_number: '0080091201',
        invoice_number: 'NF-094182',
        company_code: '1000',
        plant_code: '1010',
        customer_code: 'CLI-001048',
        customer_name: 'Metalúrgica Rio Negro Ltda',
        ship_to_code: 'WE-001048-A',
        itinerary_code: 'ITIN-SP-CPS-01',
        region: 'Sudeste (Campinas/SP)',
        product_family: 'PERFIS_PESADOS',
        driver_id: 'drv_01',
        driver_name: 'Antônio Silva',
        carrier_name: 'Transportes Rodoviários Silva',
        vehicle_plate: 'ABC-1234',
        vehicle_type: 'CARRETA_LS',
        weight_ton: 26.5,
        distance_km: 180,
        receita_liquida: 145000,
        frete_cobrado_cliente: 4850,
        frete_pago_motorista: 3950,
        pedagio_total: 428.4,
        custos_adicionais: 0,
        custo_logistico_total: 4378.4,
        margem_logistica_bruta: 471.6,
        margem_logistica_pct: 9.72,
        reais_por_tonelada: 165.22,
        reais_por_km: 24.32,
        period_reference: '2025-Q1',
        correlation_id: 'corr-qlik-001',
      },
      {
        sap_transport_number: '10048202',
        order_number: '0045012385',
        delivery_number: '0080091206',
        invoice_number: 'NF-094189',
        company_code: '1000',
        plant_code: '1010',
        customer_code: 'CLI-002194',
        customer_name: 'Estruturas Metálicas Paulistas S/A',
        ship_to_code: 'WE-002194-01',
        itinerary_code: 'ITIN-SP-SJC-02',
        region: 'Sudeste (Vale do Paraíba/SP)',
        product_family: 'TUBOS_ESTRUTURAIS',
        driver_id: 'drv_02',
        driver_name: 'Carlos Eduardo Santos',
        carrier_name: 'Autônomo Cadastrado',
        vehicle_plate: 'XYZ-9876',
        vehicle_type: 'TRUCK',
        weight_ton: 14.2,
        distance_km: 210,
        receita_liquida: 82000,
        frete_cobrado_cliente: 3600,
        frete_pago_motorista: 2980,
        pedagio_total: 512.0,
        custos_adicionais: 0,
        custo_logistico_total: 3492.0,
        margem_logistica_bruta: 108.0,
        margem_logistica_pct: 3.0,
        reais_por_tonelada: 245.91,
        reais_por_km: 16.63,
        period_reference: '2025-Q1',
        correlation_id: 'corr-qlik-002',
      },
      {
        sap_transport_number: '10048203',
        order_number: '0045012390',
        delivery_number: '0080091210',
        invoice_number: 'NF-094195',
        company_code: '1000',
        plant_code: '1010',
        customer_code: 'CLI-003401',
        customer_name: 'Indústria Mecânica Central',
        ship_to_code: 'WE-003401-MG',
        itinerary_code: 'ITIN-MG-BH-01',
        region: 'Sudeste (Belo Horizonte/MG)',
        product_family: 'CHAPAS_LAMINADAS',
        driver_id: 'drv_03',
        driver_name: 'Marcos Vinícius Pereira',
        carrier_name: 'TransAço Logística',
        vehicle_plate: 'JKL-3456',
        vehicle_type: 'BI-TREM',
        weight_ton: 38.0,
        distance_km: 585,
        receita_liquida: 290000,
        frete_cobrado_cliente: 11200,
        frete_pago_motorista: 8900,
        pedagio_total: 1150.0,
        custos_adicionais: 0,
        custo_logistico_total: 10050.0,
        margem_logistica_bruta: 1150.0,
        margem_logistica_pct: 10.27,
        reais_por_tonelada: 264.47,
        reais_por_km: 17.18,
        period_reference: '2025-Q1',
        correlation_id: 'corr-qlik-003',
      },
    ]

    for (const q of qlikSeeds) {
      try {
        app.findFirstRecordByData(
          'qlik_profitability_records',
          'sap_transport_number',
          q.sap_transport_number,
        )
      } catch (_) {
        const rec = new Record(qlikCol)
        for (const [k, v] of Object.entries(q)) {
          rec.set(k, v)
        }
        app.save(rec)
      }
    }

    // 2. Seed inicial de Demonstração da Economia da Seleção Inteligente
    const savingsCol = app.findCollectionByNameOrId('smart_selection_savings_ledger')
    const savingsSeeds = [
      {
        cargo_id: 'CARGO-2025-001',
        sap_transport_number: '10048201',
        itinerary_code: 'ITIN-SP-CPS-01',
        region: 'Sudeste (Campinas)',
        customer_code: 'CLI-001048',
        customer_name: 'Metalúrgica Rio Negro Ltda',
        vehicle_type: 'CARRETA_LS',
        weight_ton: 26.5,
        baseline_type_used: 'HISTORICO_ROTAS',
        baseline_value: 4600,
        target_value: 3900,
        contracted_freight_value: 3950,
        pedagio_value: 428.4,
        adicionais_value: 0,
        total_negotiated_cost: 4378.4,
        realized_cost: 4378.4,
        estimated_savings: 650,
        estimated_savings_pct: 14.13,
        contracted_savings: 650,
        contracted_savings_pct: 14.13,
        realized_savings: 650,
        realized_savings_pct: 14.13,
        negotiation_mode: 'PREDOMINANTE_CARLAO',
        selected_driver_id: 'drv_01',
        selected_driver_name: 'Antônio Silva',
        selected_driver_score: 93,
        rounds_count: 2,
        messages_ai_count: 5,
        messages_human_count: 0,
        duration_minutes: 8.5,
        had_human_intervention: false,
        model_version: 'V2.2-SMART-FITNESS',
        correlation_id: 'corr-savings-001',
      },
      {
        cargo_id: 'CARGO-2025-002',
        sap_transport_number: '10048202',
        itinerary_code: 'ITIN-SP-SJC-02',
        region: 'Sudeste (Vale do Paraíba)',
        customer_code: 'CLI-002194',
        customer_name: 'Estruturas Metálicas Paulistas S/A',
        vehicle_type: 'TRUCK',
        weight_ton: 14.2,
        baseline_type_used: 'MEDIANA_OFERTAS',
        baseline_value: 3500,
        target_value: 2900,
        contracted_freight_value: 2980,
        pedagio_value: 512.0,
        adicionais_value: 0,
        total_negotiated_cost: 3492.0,
        realized_cost: 3492.0,
        estimated_savings: 520,
        estimated_savings_pct: 14.86,
        contracted_savings: 520,
        contracted_savings_pct: 14.86,
        realized_savings: 520,
        realized_savings_pct: 14.86,
        negotiation_mode: 'APOIADA_IA',
        selected_driver_id: 'drv_02',
        selected_driver_name: 'Carlos Eduardo Santos',
        selected_driver_score: 87,
        rounds_count: 3,
        messages_ai_count: 6,
        messages_human_count: 1,
        duration_minutes: 14.2,
        had_human_intervention: true,
        intervention_reason: 'Ajuste de contraoferta autorizado pelo gestor de fretes',
        model_version: 'V2.2-SMART-FITNESS',
        correlation_id: 'corr-savings-002',
      },
      {
        cargo_id: 'CARGO-2025-003',
        sap_transport_number: '10048203',
        itinerary_code: 'ITIN-MG-BH-01',
        region: 'Sudeste (Belo Horizonte)',
        customer_code: 'CLI-003401',
        customer_name: 'Indústria Mecânica Central',
        vehicle_type: 'BI-TREM',
        weight_ton: 38.0,
        baseline_type_used: 'HISTORICO_ROTAS',
        baseline_value: 10400,
        target_value: 8800,
        contracted_freight_value: 8900,
        pedagio_value: 1150.0,
        adicionais_value: 0,
        total_negotiated_cost: 10050.0,
        realized_cost: 10050.0,
        estimated_savings: 1500,
        estimated_savings_pct: 14.42,
        contracted_savings: 1500,
        contracted_savings_pct: 14.42,
        realized_savings: 1500,
        realized_savings_pct: 14.42,
        negotiation_mode: 'PREDOMINANTE_CARLAO',
        selected_driver_id: 'drv_03',
        selected_driver_name: 'Marcos Vinícius Pereira',
        selected_driver_score: 95,
        rounds_count: 2,
        messages_ai_count: 4,
        messages_human_count: 0,
        duration_minutes: 6.0,
        had_human_intervention: false,
        model_version: 'V2.2-SMART-FITNESS',
        correlation_id: 'corr-savings-003',
      },
    ]

    for (const s of savingsSeeds) {
      try {
        app.findFirstRecordByData('smart_selection_savings_ledger', 'cargo_id', s.cargo_id)
      } catch (_) {
        const rec = new Record(savingsCol)
        for (const [k, v] of Object.entries(s)) {
          rec.set(k, v)
        }
        app.save(rec)
      }
    }

    // 3. Seed inicial de Propostas de Aprendizado Controlado de IA
    const learnCol = app.findCollectionByNameOrId('ai_weight_learning_proposals')
    const learnSeeds = [
      {
        proposal_code: 'PROP-2025-01',
        target_template_code: 'CLIENTE_CRITICO',
        dimension_name: 'Pontualidade nas Janelas',
        current_weight_pct: 20,
        suggested_weight_pct: 25,
        historical_days_analyzed: 90,
        trips_analyzed_count: 142,
        statistical_correlation_r: 0.84,
        rationale_fact:
          'Clientes do segmento automotivo e perfis pesados apresentaram 38% mais risco de recusa quando o atraso excedeu 15 minutos.',
        ai_hypothesis:
          'Aumentar o peso de pontualidade de 20% para 25% no template CLIENTE_CRITICO reduzirá o custo de reentrega e estadias em aproximadamente R$ 14.200/mês.',
        expected_impact_summary: '+5% peso em pontualidade, -5% peso em custo estimado nominal.',
        confidence_pct: 89,
        status: 'SUGERIDA',
        correlation_id: 'corr-learn-001',
      },
    ]

    for (const l of learnSeeds) {
      try {
        app.findFirstRecordByData('ai_weight_learning_proposals', 'proposal_code', l.proposal_code)
      } catch (_) {
        const rec = new Record(learnCol)
        for (const [k, v] of Object.entries(l)) {
          rec.set(k, v)
        }
        app.save(rec)
      }
    }
  },
  (app) => {
    // down logic is clean
  },
)
