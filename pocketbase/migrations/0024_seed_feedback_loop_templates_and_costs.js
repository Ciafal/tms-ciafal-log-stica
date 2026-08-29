/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Seed Templates de Seleção Parametrizáveis
    const tplCol = app.findCollectionByNameOrId('selection_criteria_templates')

    const templates = [
      {
        template_code: 'TPL_CARGA_PADRAO',
        name: 'Carga Padrão CIAFAL (Equilibrado)',
        description:
          'Modelo balanceado com foco em custo total, compatibilidade e disponibilidade imediata.',
        operation_type: 'NORMAL',
        model_version: 'Modelo Seleção v1.0',
        is_active: true,
        is_default: true,
        weight_operational_compatibility_pct: 20,
        weight_historical_performance_pct: 15,
        weight_route_experience_pct: 10,
        weight_customer_experience_pct: 10,
        weight_location_availability_pct: 10,
        weight_expected_cost_pct: 20,
        weight_punctuality_pct: 5,
        weight_occurrences_pct: 5,
        weight_fred_collaboration_pct: 5,
        effective_date_start: '2025-01-01',
        responsible_user_email: 'ciafal@ciafal.com.br',
        responsible_user_name: 'Gestor de Logística CIAFAL',
        expected_impact_notes:
          'Equilíbrio padrão para 75% das viagens regulares com mínimo custo total esperado.',
      },
      {
        template_code: 'TPL_CLIENTE_CRITICO',
        name: 'Cliente Crítico & Janela Estrita',
        description:
          'Prioriza experiência no cliente específico, pontualidade rigorosa e score de performance.',
        operation_type: 'CLIENTE_CRITICO',
        model_version: 'Modelo Seleção v1.0',
        is_active: true,
        is_default: false,
        weight_operational_compatibility_pct: 15,
        weight_historical_performance_pct: 25,
        weight_route_experience_pct: 10,
        weight_customer_experience_pct: 25,
        weight_location_availability_pct: 5,
        weight_expected_cost_pct: 10,
        weight_punctuality_pct: 5,
        weight_occurrences_pct: 3,
        weight_fred_collaboration_pct: 2,
        effective_date_start: '2025-01-01',
        responsible_user_email: 'ciafal@ciafal.com.br',
        responsible_user_name: 'Gestor de Logística CIAFAL',
        expected_impact_notes:
          'Mitigação de multas contratuais e garantia de SLA máximo em clientes Classe A.',
      },
      {
        template_code: 'TPL_ENTREGA_URGENTE',
        name: 'Entrega Urgente / Carregamento Imediato',
        description:
          'Máximo peso para localização atual (PORTA / distância imediata), disponibilidade e prontidão.',
        operation_type: 'ENTREGA_URGENTE',
        model_version: 'Modelo Seleção v1.0',
        is_active: true,
        is_default: false,
        weight_operational_compatibility_pct: 25,
        weight_historical_performance_pct: 10,
        weight_route_experience_pct: 5,
        weight_customer_experience_pct: 5,
        weight_location_availability_pct: 30,
        weight_expected_cost_pct: 15,
        weight_punctuality_pct: 5,
        weight_occurrences_pct: 3,
        weight_fred_collaboration_pct: 2,
        effective_date_start: '2025-01-01',
        responsible_user_email: 'ciafal@ciafal.com.br',
        responsible_user_name: 'Gestor de Logística CIAFAL',
        expected_impact_notes: 'Rapidez extrema de saída do pátio para atendimento emergencial.',
      },
      {
        template_code: 'TPL_OPERACAO_COMPLEXA',
        name: 'Operação Complexa / Rota Sensível',
        description:
          'Ênfase em tipo de veículo especializado, histórico de rota e colaboração contínua com Fred.',
        operation_type: 'OPERACAO_COMPLEXA',
        model_version: 'Modelo Seleção v1.0',
        is_active: true,
        is_default: false,
        weight_operational_compatibility_pct: 25,
        weight_historical_performance_pct: 20,
        weight_route_experience_pct: 20,
        weight_customer_experience_pct: 10,
        weight_location_availability_pct: 5,
        weight_expected_cost_pct: 10,
        weight_punctuality_pct: 3,
        weight_occurrences_pct: 4,
        weight_fred_collaboration_pct: 3,
        effective_date_start: '2025-01-01',
        responsible_user_email: 'ciafal@ciafal.com.br',
        responsible_user_name: 'Gestor de Logística CIAFAL',
        expected_impact_notes:
          'Garantia de segurança e acurácia para cargas sider, bitrens ou rotas de serra.',
      },
    ]

    for (const tpl of templates) {
      try {
        app.findFirstRecordByData(
          'selection_criteria_templates',
          'template_code',
          tpl.template_code,
        )
      } catch (_) {
        const rec = new Record(tplCol)
        for (const [k, v] of Object.entries(tpl)) {
          rec.set(k, v)
        }
        app.save(rec)
      }
    }

    // 2. Seed Custos de Ocorrência Reais de Exemplo
    const occCol = app.findCollectionByNameOrId('occurrence_costs')
    const sampleCosts = [
      {
        sap_transport_number: '1004829101',
        cargo_id: 'CARGA-SP001A-01',
        customer_code: 'CUST-001',
        customer_name: 'Distribuidora Aço Forte Ltda',
        driver_id: 'drv_joao_silva',
        driver_name: 'João Carlos Silva',
        occurrence_cost_type: 'ESPERA_EXTRAORDINARIA',
        cost_value: 300.0,
        financial_responsible: 'CLIENTE',
        impacts_driver_performance: false,
        charge_status: 'COBRADO_CLIENTE',
        notes:
          'Espera de 3h na portaria do cliente além da franquia. Cobrado em fatura complementar.',
        registered_by_user: 'Gestor Logístico',
      },
      {
        sap_transport_number: '1004829101',
        cargo_id: 'CARGA-SP001A-01',
        customer_code: 'CUST-001',
        customer_name: 'Distribuidora Aço Forte Ltda',
        driver_id: 'drv_joao_silva',
        driver_name: 'João Carlos Silva',
        occurrence_cost_type: 'REENTREGA',
        cost_value: 700.0,
        financial_responsible: 'CLIENTE',
        impacts_driver_performance: false,
        charge_status: 'COBRADO_CLIENTE',
        notes:
          'Cliente fechou recebimento às 16h sem aviso prévio. Reentrega realizada no dia seguinte.',
        registered_by_user: 'Gestor Logístico',
      },
      {
        sap_transport_number: '1004829102',
        cargo_id: 'CARGA-MG001A-02',
        customer_code: 'CUST-002',
        customer_name: 'Construtora Horizonte Minas',
        driver_id: 'drv_marcos_souza',
        driver_name: 'Marcos Souza',
        occurrence_cost_type: 'DESCARGA_ADICIONAL',
        cost_value: 250.0,
        financial_responsible: 'CIAFAL',
        impacts_driver_performance: false,
        charge_status: 'ABSORVIDO_CIAFAL',
        notes: 'Auxílio de ajudante extraordinário para descarga de perfis pesados.',
        registered_by_user: 'Operador Expedição',
      },
      {
        sap_transport_number: '1004829103',
        cargo_id: 'CARGA-RJ001A-03',
        customer_code: 'CUST-003',
        customer_name: 'Siderúrgica Guanabara S.A.',
        driver_id: 'drv_roberto_lima',
        driver_name: 'Roberto Lima',
        occurrence_cost_type: 'QUILOMETRAGEM_EXTRA',
        cost_value: 180.0,
        financial_responsible: 'FORNECEDOR_TERCEIRO',
        impacts_driver_performance: false,
        charge_status: 'PENDENTE_CONCILIACAO',
        notes: 'Bloqueio de serra na Dutra exigiu desvio por rota alternativa.',
        registered_by_user: 'Fred IA Supervisor',
      },
    ]

    for (const c of sampleCosts) {
      try {
        const rec = new Record(occCol)
        for (const [k, v] of Object.entries(c)) {
          rec.set(k, v)
        }
        app.save(rec)
      } catch (_) {}
    }
  },
  (app) => {
    try {
      app.db().newQuery('DELETE FROM selection_criteria_templates').execute()
      app.db().newQuery('DELETE FROM occurrence_costs').execute()
    } catch (_) {}
  },
)
