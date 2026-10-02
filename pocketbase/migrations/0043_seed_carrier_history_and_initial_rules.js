migrate(
  (app) => {
    // 1. Criar Regra de Score Vigente Padrão CIAFAL (v1.0.0) com 100% de soma de pesos
    try {
      const ruleCol = app.findCollectionByNameOrId('carrier_score_rule_versions')
      const initialRule = new Record(ruleCol)
      initialRule.set('version_code', 'REG-SCORE-v1.0.0')
      initialRule.set('rule_name', 'Matriz de Score Operacional Padrão CIAFAL 2026')
      initialRule.set('lifecycle_status', 'VIGENTE')
      initialRule.set('weight_services_evaluation_pct', 30)
      initialRule.set('weight_punctuality_pct', 20)
      initialRule.set('weight_procedente_complaints_pct', 15)
      initialRule.set('weight_occurrences_pct', 10)
      initialRule.set('weight_communication_pct', 10)
      initialRule.set('weight_delivery_history_pct', 10)
      initialRule.set('weight_compliments_pct', 5)
      initialRule.set('weights_sum_pct', 100)
      initialRule.set('target_coverage_pct', 80)
      initialRule.set('min_transports_for_high_confidence', 15)
      initialRule.set('min_transports_for_medium_confidence', 5)
      initialRule.set('effective_start_date', '2026-01-01T00:00:00.000Z')
      initialRule.set(
        'justification',
        'Matriz canônica calibrada para ponderação de qualidade, pontualidade e ocorrências na malha de aço e cargas pesadas CIAFAL.',
      )
      initialRule.set('created_by_user_email', 'admin.master@ciafal.com.br')
      initialRule.set('created_by_user_name', 'Administrador Master')
      initialRule.set('homologated_by_user_email', 'admin.master@ciafal.com.br')
      initialRule.set('homologated_by_user_name', 'Administrador Master')
      initialRule.set('homologated_at', '2026-01-01T00:00:00.000Z')
      initialRule.set(
        'previous_values_json',
        JSON.stringify({ note: 'Versão inicial canônica estabelecida pelo comitê logístico.' }),
      )
      app.save(initialRule)
    } catch (e) {
      console.warn('Erro ao criar regra inicial de score:', e)
    }

    // 2. Popular carrier_operational_history com registros operacionais realistas de transportes
    const histCol = app.findCollectionByNameOrId('carrier_operational_history')

    const seedHistoricalTransports = [
      {
        transport_order_number: 'OT-800101',
        sap_transport_number: '800101',
        transport_date: '2026-02-10T10:00:00.000Z',
        driver_id: 'DRV-1001',
        driver_name: 'Antônio Carlos Silveira',
        driver_document_masked: '***.341.890-**',
        driver_document_full: '123.341.890-55',
        vehicle_plate: 'CIA-1A23',
        vehicle_type: 'Carreta Bitrem',
        carrier_name: 'Transportes Silveira Ltda',
        itinerary_code: 'MG-SP-01',
        itinerary_description: 'Contagem (MG) → Grande São Paulo (SP)',
        origin_plant: 'Matriz Contagem',
        destination_city: 'São Paulo',
        destination_uf: 'SP',
        region: 'Sudeste',
        customers_summary: 'Aço Forte Distribuidora; Metalúrgica Paulista',
        discharges_count: 2,
        weight_kg: 32500,
        weight_ton: 32.5,
        products_summary: 'Bobinas Laminadas a Quente 1010/1020',
        loading_duration_min: 75,
        invoicing_duration_min: 25,
        internal_waiting_min: 30,
        total_internal_dwell_min: 130,
        internal_responsibility_min: 105,
        carrier_responsibility_min: 25,
        route_estimated_min: 520,
        route_actual_min: 510,
        is_on_time: true,
        delay_minutes: 0,
        occurrences_count: 0,
        freight_cost_driver: 3600,
        toll_cost: 480,
        other_costs: 120,
        total_cost: 4200,
        freight_billed_customer: 5100,
        margin_value: 900,
        margin_pct: 17.65,
        driver_rating: 4.8,
        vehicle_rating: 4.7,
        complaints_count: 0,
        complaints_procedente_count: 0,
        compliments_count: 1,
        final_status: 'CONCLUIDO',
        is_sidercentro: false,
      },
      {
        transport_order_number: 'OT-800102',
        sap_transport_number: '800102',
        transport_date: '2026-02-14T08:30:00.000Z',
        driver_id: 'DRV-1002',
        driver_name: 'Marcos Vinicius Rezende',
        driver_document_masked: '***.889.123-**',
        driver_document_full: '456.889.123-11',
        vehicle_plate: 'CIA-1A23', // MESMO veículo, OUTRO motorista (segregação)
        vehicle_type: 'Carreta Bitrem',
        carrier_name: 'Transportes Silveira Ltda',
        itinerary_code: 'MG-SP-01',
        itinerary_description: 'Contagem (MG) → Grande São Paulo (SP)',
        origin_plant: 'Matriz Contagem',
        destination_city: 'Guarulhos',
        destination_uf: 'SP',
        region: 'Sudeste',
        customers_summary: 'Perfis e Estruturas Guarulhos',
        discharges_count: 1,
        weight_kg: 31000,
        weight_ton: 31.0,
        products_summary: 'Chapas Finas a Frio',
        loading_duration_min: 65,
        invoicing_duration_min: 30,
        internal_waiting_min: 35,
        total_internal_dwell_min: 130,
        internal_responsibility_min: 100,
        carrier_responsibility_min: 30,
        route_estimated_min: 520,
        route_actual_min: 590, // Atraso de rota
        is_on_time: false,
        delay_minutes: 70,
        occurrences_count: 1,
        occurrences_summary: 'Congestionamento Rodovia Fernão Dias',
        freight_cost_driver: 3500,
        toll_cost: 480,
        other_costs: 80,
        total_cost: 4060,
        freight_billed_customer: 4950,
        margin_value: 890,
        margin_pct: 17.98,
        driver_rating: 4.2,
        vehicle_rating: 4.6,
        complaints_count: 1,
        complaints_procedente_count: 0,
        compliments_count: 0,
        final_status: 'ENCERRADO_COM_OCORRENCIA',
        is_sidercentro: false,
      },
      {
        transport_order_number: 'OT-800103',
        sap_transport_number: '800103',
        transport_date: '2026-02-18T11:00:00.000Z',
        driver_id: 'DRV-1001', // Mesmo motorista Antônio em outro veículo
        driver_name: 'Antônio Carlos Silveira',
        driver_document_masked: '***.341.890-**',
        driver_document_full: '123.341.890-55',
        vehicle_plate: 'RDO-9E88',
        vehicle_type: 'Truck Graneleiro',
        carrier_name: 'Rodoviário Minas Gerais',
        itinerary_code: 'MG-RJ-02',
        itinerary_description: 'Contagem (MG) → Rio de Janeiro / Baixada (RJ)',
        origin_plant: 'Matriz Contagem',
        destination_city: 'Duque de Caxias',
        destination_uf: 'RJ',
        region: 'Sudeste',
        customers_summary: 'Siderúrgica Guanabara',
        discharges_count: 2,
        weight_kg: 14500,
        weight_ton: 14.5,
        products_summary: 'Tubos Industriais com Costura',
        loading_duration_min: 80,
        invoicing_duration_min: 25,
        internal_waiting_min: 45,
        total_internal_dwell_min: 150,
        internal_responsibility_min: 120,
        carrier_responsibility_min: 30,
        route_estimated_min: 460,
        route_actual_min: 455,
        is_on_time: true,
        delay_minutes: 0,
        occurrences_count: 0,
        freight_cost_driver: 2300,
        toll_cost: 320,
        other_costs: 50,
        total_cost: 2670,
        freight_billed_customer: 3300,
        margin_value: 630,
        margin_pct: 19.09,
        driver_rating: 4.9,
        vehicle_rating: 4.1,
        complaints_count: 0,
        complaints_procedente_count: 0,
        compliments_count: 1,
        final_status: 'CONCLUIDO',
        is_sidercentro: false,
      },
      {
        transport_order_number: 'OT-800104',
        sap_transport_number: '800104',
        transport_date: '2026-02-22T07:45:00.000Z',
        driver_id: 'DRV-1003',
        driver_name: 'Cláudio Roberto Dias',
        driver_document_masked: '***.672.441-**',
        driver_document_full: '789.672.441-00',
        vehicle_plate: 'SID-4K11',
        vehicle_type: 'Carreta Sider',
        carrier_name: 'TransAço Cargas Express',
        itinerary_code: 'MG-ES-03',
        itinerary_description: 'Contagem (MG) → Grande Vitória (ES)',
        origin_plant: 'Sidercentro Laminados',
        destination_city: 'Cariacica',
        destination_uf: 'ES',
        region: 'Sudeste',
        customers_summary: 'Comércio de Ferragens Capixaba',
        discharges_count: 3,
        weight_kg: 27800,
        weight_ton: 27.8,
        products_summary: 'Perfis e Vigas I e H',
        loading_duration_min: 110,
        invoicing_duration_min: 40,
        internal_waiting_min: 70,
        total_internal_dwell_min: 220, // Aumento tempo interno
        internal_responsibility_min: 180,
        carrier_responsibility_min: 40,
        route_estimated_min: 600,
        route_actual_min: 680,
        is_on_time: false,
        delay_minutes: 80,
        occurrences_count: 1,
        occurrences_summary: 'Atraso na liberação fiscal e espera faturamento',
        freight_cost_driver: 3900,
        toll_cost: 420,
        other_costs: 150,
        total_cost: 4470,
        freight_billed_customer: 5350,
        margin_value: 880,
        margin_pct: 16.45,
        driver_rating: 3.6,
        vehicle_rating: 3.9,
        complaints_count: 2,
        complaints_procedente_count: 1, // Procedente
        compliments_count: 0,
        final_status: 'CONCLUIDO',
        is_sidercentro: true,
      },
      {
        transport_order_number: 'OT-800105',
        sap_transport_number: '800105',
        transport_date: '2026-02-26T09:15:00.000Z',
        driver_id: 'DRV-1004',
        driver_name: 'Fernando Augusto Lima', // Motorista Novo (apenas 1 transporte)
        driver_document_masked: '***.551.992-**',
        driver_document_full: '321.551.992-44',
        vehicle_plate: 'NOV-8822', // Veículo Novo
        vehicle_type: 'Truck 3 Eixos',
        carrier_name: 'Transportes Lima Autônomo',
        itinerary_code: 'MG-MG-01',
        itinerary_description: 'Contagem (MG) → Triângulo Mineiro (MG)',
        origin_plant: 'Matriz Contagem',
        destination_city: 'Uberlândia',
        destination_uf: 'MG',
        region: 'Sudeste',
        customers_summary: 'Central do Serralheiro Triângulo',
        discharges_count: 1,
        weight_kg: 13200,
        weight_ton: 13.2,
        products_summary: 'Chapas Galvanizadas',
        loading_duration_min: 55,
        invoicing_duration_min: 20,
        internal_waiting_min: 25,
        total_internal_dwell_min: 100,
        internal_responsibility_min: 80,
        carrier_responsibility_min: 20,
        route_estimated_min: 440,
        route_actual_min: 435,
        is_on_time: true,
        delay_minutes: 0,
        occurrences_count: 0,
        freight_cost_driver: 2100,
        toll_cost: 290,
        other_costs: 40,
        total_cost: 2430,
        freight_billed_customer: 3050,
        margin_value: 620,
        margin_pct: 20.33,
        driver_rating: 4.5,
        vehicle_rating: 4.5,
        complaints_count: 0,
        complaints_procedente_count: 0,
        compliments_count: 0,
        final_status: 'CONCLUIDO',
        is_sidercentro: false,
      },
    ]

    seedHistoricalTransports.forEach((data) => {
      try {
        const r = new Record(histCol)
        Object.keys(data).forEach((k) => r.set(k, data[k]))
        app.save(r)
      } catch (err) {
        console.warn('Erro ao salvar transporte historico:', err)
      }
    })

    // 3. Popular carrier_evaluations
    const evalCol = app.findCollectionByNameOrId('carrier_evaluations')
    const seedEvals = [
      {
        transport_order_number: 'OT-800101',
        sap_transport_number: '800101',
        target_type: 'MOTORISTA',
        driver_id: 'DRV-1001',
        driver_name: 'Antônio Carlos Silveira',
        vehicle_plate: 'CIA-1A23',
        origin_type: 'EXPEDICAO',
        operational_moment: 'APOS_CARREGAMENTO',
        driver_pontualidade: 5,
        driver_cumprimento_orientacoes: 5,
        driver_relacionamento_interno: 5,
        driver_cuidado_carga: 5,
        driver_regras_seguranca: 5,
        driver_qualidade_geral: 5,
        driver_avg_score: 5.0,
        driver_recommendation: 'SIM',
        general_notes: 'Motorista com conduta impecável na expedição CIAFAL.',
        evaluation_date: '2026-02-10T12:00:00.000Z',
      },
      {
        transport_order_number: 'OT-800104',
        sap_transport_number: '800104',
        target_type: 'MOTORISTA_VEICULO',
        driver_id: 'DRV-1003',
        driver_name: 'Cláudio Roberto Dias',
        vehicle_plate: 'SID-4K11',
        origin_type: 'CLIENTE',
        operational_moment: 'APOS_ENTREGA',
        driver_pontualidade: 3,
        driver_cumprimento_orientacoes: 4,
        driver_relacionamento_interno: 3,
        driver_cuidado_carga: 4,
        driver_regras_seguranca: 4,
        driver_qualidade_geral: 3,
        driver_avg_score: 3.5,
        driver_recommendation: 'SIM_COM_RESSALVAS',
        vehicle_conservacao: 3,
        vehicle_limpeza: 3,
        vehicle_condicoes_aparentes: 4,
        vehicle_amarracao: 4,
        vehicle_regras_internas: 4,
        vehicle_avg_score: 3.6,
        general_notes: 'Entrega realizada com atraso moderado na descarga do cliente.',
        evaluation_date: '2026-02-23T14:30:00.000Z',
      },
    ]

    seedEvals.forEach((data) => {
      try {
        const r = new Record(evalCol)
        Object.keys(data).forEach((k) => r.set(k, data[k]))
        app.save(r)
      } catch (err) {
        console.warn('Erro ao salvar avaliacao seed:', err)
      }
    })

    // 4. Popular carrier_complaints
    const compCol = app.findCollectionByNameOrId('carrier_complaints')
    const seedComplaints = [
      {
        complaint_number: 'REC-2026-00101',
        transport_order_number: 'OT-800104',
        sap_transport_number: '800104',
        category: 'ATRASO',
        severity: 'MEDIA',
        target_type: 'MOTORISTA',
        driver_id: 'DRV-1003',
        driver_name: 'Cláudio Roberto Dias',
        vehicle_plate: 'SID-4K11',
        carrier_name: 'TransAço Cargas Express',
        customer_name: 'Comércio de Ferragens Capixaba',
        itinerary_code: 'MG-ES-03',
        origin_type: 'CLIENTE',
        description: 'Cliente reclamou de atraso de 80 minutos em relação ao horário acordado.',
        occurrence_date: '2026-02-22T17:00:00.000Z',
        status: 'PROCEDENTE',
        analyst_name: 'Supervisor Logística',
        analysis_notes: 'Verificado atraso não justificado após liberação do faturamento.',
        conclusion: 'Reclamação procedente; motorista orientado sobre pontualidade.',
        action_taken: 'Alinhamento com a transportadora e advertência orientativa.',
      },
      {
        complaint_number: 'REC-2026-00102',
        transport_order_number: 'OT-800102',
        sap_transport_number: '800102',
        category: 'COMUNICACAO',
        severity: 'BAIXA',
        target_type: 'MOTORISTA',
        driver_id: 'DRV-1002',
        driver_name: 'Marcos Vinicius Rezende',
        vehicle_plate: 'CIA-1A23',
        carrier_name: 'Transportes Silveira Ltda',
        itinerary_code: 'MG-SP-01',
        origin_type: 'EXPEDICAO',
        description: 'Falta de comunicação do motorista com a torre sobre retenção na rodovia.',
        occurrence_date: '2026-02-14T11:00:00.000Z',
        status: 'EM_ANALISE',
        analyst_name: 'Supervisor Logística',
        analysis_notes: 'Aguardando manifestação formal da transportadora.',
      },
    ]

    seedComplaints.forEach((data) => {
      try {
        const r = new Record(compCol)
        Object.keys(data).forEach((k) => r.set(k, data[k]))
        app.save(r)
      } catch (err) {
        console.warn('Erro ao salvar reclamacao seed:', err)
      }
    })

    // 5. Popular carrier_compliments
    const complCol = app.findCollectionByNameOrId('carrier_compliments')
    const seedCompliments = [
      {
        compliment_number: 'ELOG-2026-00050',
        sap_transport_number: '800101',
        driver_id: 'DRV-1001',
        driver_name: 'Antônio Carlos Silveira',
        vehicle_plate: 'CIA-1A23',
        carrier_name: 'Transportes Silveira Ltda',
        customer_name: 'Aço Forte Distribuidora',
        category: 'ELOGIO_CLIENTE',
        origin_type: 'CLIENTE',
        description: 'Descarregamento perfeito, zelo total com as bobinas e cordialidade exemplar.',
        registered_by_name: 'Comercial CIAFAL',
        compliment_date: '2026-02-11T16:00:00.000Z',
      },
    ]

    seedCompliments.forEach((data) => {
      try {
        const r = new Record(complCol)
        Object.keys(data).forEach((k) => r.set(k, data[k]))
        app.save(r)
      } catch (err) {
        console.warn('Erro ao salvar elogio seed:', err)
      }
    })
  },
  (app) => {
    // Reversão limpa
  },
)
