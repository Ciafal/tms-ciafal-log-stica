/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Atualizar campos da collection load_complement_opportunities
    const oppsCol = app.findCollectionByNameOrId('load_complement_opportunities')

    // Atualizar valores do campo commercial_status para suportar todos os status requeridos
    const statusField = oppsCol.fields.getByName('commercial_status')
    if (statusField) {
      statusField.values = [
        'Nova',
        'Selecionada',
        'Enviada ao Comercial',
        'Em análise comercial',
        'Aceita pelo Comercial',
        'Recusada pelo Comercial',
        'Expirada',
        'Convertida em venda',
        'Nova oportunidade',
        'Contato iniciado',
        'Cliente interessado',
        'Aguardando pedido SAP',
        'Pedido criado',
        'Associado à carga',
        'Recusado pelo cliente',
        'Descartado',
        'Expirado',
      ]
    }

    if (!oppsCol.fields.getByName('commercial_sent_at')) {
      oppsCol.fields.add(new DateField({ name: 'commercial_sent_at' }))
    }
    if (!oppsCol.fields.getByName('commercial_sent_by')) {
      oppsCol.fields.add(new TextField({ name: 'commercial_sent_by' }))
    }
    if (!oppsCol.fields.getByName('commercial_representative')) {
      oppsCol.fields.add(new TextField({ name: 'commercial_representative' }))
    }
    if (!oppsCol.fields.getByName('sent_snapshot')) {
      oppsCol.fields.add(new JSONField({ name: 'sent_snapshot' }))
    }
    if (!oppsCol.fields.getByName('is_blocked')) {
      oppsCol.fields.add(new BoolField({ name: 'is_blocked' }))
    }
    if (!oppsCol.fields.getByName('block_reason')) {
      oppsCol.fields.add(new TextField({ name: 'block_reason' }))
    }
    if (!oppsCol.fields.getByName('customer_sap_code')) {
      oppsCol.fields.add(new TextField({ name: 'customer_sap_code' }))
    }
    if (!oppsCol.fields.getByName('destination_city')) {
      oppsCol.fields.add(new TextField({ name: 'destination_city' }))
    }
    if (!oppsCol.fields.getByName('destination_uf')) {
      oppsCol.fields.add(new TextField({ name: 'destination_uf' }))
    }
    if (!oppsCol.fields.getByName('resend_count')) {
      oppsCol.fields.add(new NumberField({ name: 'resend_count' }))
    }
    if (!oppsCol.fields.getByName('last_resend_at')) {
      oppsCol.fields.add(new DateField({ name: 'last_resend_at' }))
    }
    if (!oppsCol.fields.getByName('last_resend_by')) {
      oppsCol.fields.add(new TextField({ name: 'last_resend_by' }))
    }

    app.save(oppsCol)

    // 2. Criar collection de histórico e auditoria de cada oportunidade: load_complement_history
    try {
      app.findCollectionByNameOrId('load_complement_history')
    } catch (_) {
      const histCol = new Collection({
        name: 'load_complement_history',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'opportunity_code', type: 'text', required: true },
          { name: 'opportunity_id', type: 'text', required: true },
          { name: 'event_type', type: 'text', required: true },
          { name: 'event_title', type: 'text', required: true },
          { name: 'user_email', type: 'text' },
          { name: 'user_name', type: 'text', required: true },
          { name: 'user_role', type: 'text' },
          { name: 'previous_status', type: 'text' },
          { name: 'new_status', type: 'text', required: true },
          { name: 'description', type: 'text' },
          { name: 'metadata', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_lch_code ON load_complement_history (opportunity_code)',
          'CREATE INDEX idx_lch_opp_id ON load_complement_history (opportunity_id)',
          'CREATE INDEX idx_lch_created ON load_complement_history (created)',
        ],
      })
      app.save(histCol)
    }

    // 3. Seed inicial de oportunidades representativas e seus históricos para enriquecer a tela
    const countOpps = app.countRecords('load_complement_opportunities')
    if (countOpps === 0) {
      const oppsToSeed = [
        {
          opportunity_code: 'OPP-CIAFAL-2026-001',
          load_proposal_id: 'PROP-2026-MG01',
          itinerary_id: 'MG001C',
          planned_dispatch_date: '2026-09-05 08:00:00.000Z',
          vehicle_plate: 'CIA-2945',
          vehicle_type: 'Carreta 5 Eixos',
          vehicle_capacity_kg: 27000,
          current_weight_kg: 19500,
          current_occupancy_pct: 72.2,
          minimum_occupancy_pct: 75,
          maximum_occupancy_pct: 95,
          target_weight_kg: 25650,
          missing_weight_kg: 6150,
          customer_id: 'CLI-13371',
          customer_name: 'COMERCIAL DE LAMINADOS E FERROS LTD',
          customer_sap_code: '13371',
          destination_city: 'BELO HORIZONTE',
          destination_uf: 'MG',
          material_id: 'MAT-CA50-12',
          material_description: 'Vergalhão CA-50 12.5mm - 12m',
          suggested_quantity_kg: 6000,
          credit_status: 'Crédito OK',
          stock_status: 'Disponível em Estoque (DP34)',
          projected_stock_date: '2026-09-04 00:00:00.000Z',
          salesperson_id: 'Carlos Eduardo (Comercial MG)',
          commercial_representative: 'Carlos Eduardo (Comercial MG)',
          commercial_status: 'Nova',
          logistic_adherence: 'Alta',
          commercial_adherence: 'Alta',
          adherence_explanation:
            'Cliente recorrente na rota BH com histórico quinzenal e crédito liberado.',
          ai_recommendation:
            'Capacidade residual de 6.1t na carreta CIA-2945. Cliente comprou CA-50 há 14 dias; saldo DP34 de 156t apto para expedição imediata.',
          is_blocked: false,
          block_reason: '',
          created_by: 'sistema@ciafal.com.br',
        },
        {
          opportunity_code: 'OPP-CIAFAL-2026-002',
          load_proposal_id: 'PROP-2026-SP02',
          itinerary_id: 'SP002C',
          planned_dispatch_date: '2026-09-06 06:30:00.000Z',
          vehicle_plate: 'HUB-8820',
          vehicle_type: 'Vanderleia 3 Eixos Distanciados',
          vehicle_capacity_kg: 32000,
          current_weight_kg: 24000,
          current_occupancy_pct: 75.0,
          minimum_occupancy_pct: 80,
          maximum_occupancy_pct: 98,
          target_weight_kg: 31000,
          missing_weight_kg: 7000,
          customer_id: 'CLI-10294',
          customer_name: 'AÇOCENTER DISTRIBUIDORA PAULISTA S/A',
          customer_sap_code: '10294',
          destination_city: 'CAMPINAS',
          destination_uf: 'SP',
          material_id: 'MAT-PERF-W',
          material_description: 'Viga W 200 x 22.5 - 12m',
          suggested_quantity_kg: 6800,
          credit_status: 'Crédito OK',
          stock_status: 'Disponível em Estoque (DP34)',
          projected_stock_date: '2026-09-05 00:00:00.000Z',
          salesperson_id: 'Mariana Silveira (Comercial SP)',
          commercial_representative: 'Mariana Silveira (Comercial SP)',
          commercial_status: 'Enviada ao Comercial',
          commercial_sent_at: '2026-09-01 10:15:00.000Z',
          commercial_sent_by: 'João Silva (Planejador Logístico)',
          logistic_adherence: 'Alta',
          commercial_adherence: 'Alta',
          adherence_explanation: 'Destino no eixo Anhanguera sem desvio de rota.',
          ai_recommendation:
            'Complemento de 7t viabiliza fechamento da carga com margem operacional sustentável.',
          is_blocked: false,
          block_reason: '',
          created_by: 'sistema@ciafal.com.br',
        },
        {
          opportunity_code: 'OPP-CIAFAL-2026-003',
          load_proposal_id: 'PROP-2026-RJ03',
          itinerary_id: 'RJ001C',
          planned_dispatch_date: '2026-09-07 07:00:00.000Z',
          vehicle_plate: 'LOG-4512',
          vehicle_type: 'Carreta 5 Eixos',
          vehicle_capacity_kg: 27000,
          current_weight_kg: 21000,
          current_occupancy_pct: 77.8,
          minimum_occupancy_pct: 80,
          maximum_occupancy_pct: 95,
          target_weight_kg: 25650,
          missing_weight_kg: 4650,
          customer_id: 'CLI-15882',
          customer_name: 'SIDERÚRGICA CARIOCA COMÉRCIO E IND',
          customer_sap_code: '15882',
          destination_city: 'DUQUE DE CAXIAS',
          destination_uf: 'RJ',
          material_id: 'MAT-TUB-IND',
          material_description: 'Tubo Industrial Retangular 100x50',
          suggested_quantity_kg: 4500,
          credit_status: 'Crédito Bloqueado (Financeiro)',
          stock_status: 'Disponível em Estoque (DP34)',
          projected_stock_date: '2026-09-06 00:00:00.000Z',
          salesperson_id: 'Renato Guimarães (Comercial RJ)',
          commercial_representative: 'Renato Guimarães (Comercial RJ)',
          commercial_status: 'Nova',
          logistic_adherence: 'Média',
          commercial_adherence: 'Baixa',
          adherence_explanation: 'Cliente com restrição financeira impeditiva.',
          ai_recommendation:
            'Oportunidade retida em Exceções & Bloqueios devido a restrição de crédito no SAP.',
          is_blocked: true,
          block_reason: 'Crédito bloqueado no SAP pelo financeiro (limite excedido)',
          created_by: 'sistema@ciafal.com.br',
        },
        {
          opportunity_code: 'OPP-CIAFAL-2026-004',
          load_proposal_id: 'PROP-2026-ES04',
          itinerary_id: 'ES001C',
          planned_dispatch_date: '2026-09-08 05:00:00.000Z',
          vehicle_plate: 'MET-9931',
          vehicle_type: 'Carreta 5 Eixos',
          vehicle_capacity_kg: 27000,
          current_weight_kg: 18000,
          current_occupancy_pct: 66.7,
          minimum_occupancy_pct: 75,
          maximum_occupancy_pct: 95,
          target_weight_kg: 25650,
          missing_weight_kg: 7650,
          customer_id: 'CLI-14520',
          customer_name: 'VITORIA TUBOS E PERFIS LTDA',
          customer_sap_code: '14520',
          destination_city: 'VILA VELHA',
          destination_uf: 'ES',
          material_id: 'MAT-CHAPA-GQ',
          material_description: 'Chapa Grossa 1/4 - 1200x3000',
          suggested_quantity_kg: 7000,
          credit_status: 'Crédito OK',
          stock_status: 'Material Indisponível (Aguardando PCP)',
          projected_stock_date: '2026-09-12 00:00:00.000Z',
          salesperson_id: 'Patrícia Alvarenga (Comercial ES)',
          commercial_representative: 'Patrícia Alvarenga (Comercial ES)',
          commercial_status: 'Nova',
          logistic_adherence: 'Alta',
          commercial_adherence: 'Baixa',
          adherence_explanation: 'Material não estará pronto na data prevista da carga.',
          ai_recommendation:
            'Previsão de laminação no PCP para 12/09 posterior à saída da carga (08/09). Bloqueio por disponibilidade.',
          is_blocked: true,
          block_reason: 'Material indisponível: ordem PCP prevista apenas para 12/09',
          created_by: 'sistema@ciafal.com.br',
        },
        {
          opportunity_code: 'OPP-CIAFAL-2026-005',
          load_proposal_id: 'PROP-2026-PR05',
          itinerary_id: 'PR001C',
          planned_dispatch_date: '2026-09-09 06:00:00.000Z',
          vehicle_plate: 'SUL-7714',
          vehicle_type: 'Bitrem 7 Eixos',
          vehicle_capacity_kg: 38000,
          current_weight_kg: 29000,
          current_occupancy_pct: 76.3,
          minimum_occupancy_pct: 80,
          maximum_occupancy_pct: 98,
          target_weight_kg: 37000,
          missing_weight_kg: 8000,
          customer_id: 'CLI-19203',
          customer_name: 'FERRAGENS CURITIBA PARANÁ LTDA',
          customer_sap_code: '19203',
          destination_city: 'CURITIBA',
          destination_uf: 'PR',
          material_id: 'MAT-CA60-05',
          material_description: 'Fio Máquina CA-60 5.0mm',
          suggested_quantity_kg: 8000,
          credit_status: 'Crédito OK',
          stock_status: 'Disponível em Estoque (DP34)',
          projected_stock_date: '2026-09-08 00:00:00.000Z',
          salesperson_id: 'Roberto Lima (Comercial Sul)',
          commercial_representative: 'Roberto Lima (Comercial Sul)',
          commercial_status: 'Nova',
          logistic_adherence: 'Alta',
          commercial_adherence: 'Alta',
          adherence_explanation:
            'Demanda de reposição periódica com descarga por ponte rolante compatível.',
          ai_recommendation:
            'Complemento de 8t eleva ocupação do bitrem para 97.3%, maximizando o frete fixo ANTT.',
          is_blocked: false,
          block_reason: '',
          created_by: 'sistema@ciafal.com.br',
        },
      ]

      const candCol = app.findCollectionByNameOrId('load_complement_candidates')
      const histCol = app.findCollectionByNameOrId('load_complement_history')

      for (const item of oppsToSeed) {
        const rec = new Record(oppsCol)
        for (const [k, v] of Object.entries(item)) {
          rec.set(k, v)
        }
        app.save(rec)

        // Candidato representativo
        const cRec = new Record(candCol)
        cRec.set('opportunity_code', item.opportunity_code)
        cRec.set('customer_code', item.customer_id)
        cRec.set('customer_name', item.customer_name)
        cRec.set('city', item.destination_city)
        cRec.set('uf', item.destination_uf)
        cRec.set('itinerary_code', item.itinerary_id)
        cRec.set('credit_status', item.credit_status)
        cRec.set('material_code', item.material_id)
        cRec.set('material_description', item.material_description)
        cRec.set('historical_avg_qty_kg', item.suggested_quantity_kg)
        cRec.set('last_purchase_date', '2026-08-15 00:00:00.000Z')
        cRec.set('stock_status', item.stock_status)
        cRec.set('stock_available_kg', 85000)
        cRec.set('suggested_qty_kg', item.suggested_quantity_kg)
        cRec.set('logistic_adherence', item.logistic_adherence)
        cRec.set('commercial_adherence', item.commercial_adherence)
        cRec.set('ranking_score', item.is_blocked ? 42 : 94)
        cRec.set('recommendation_rationale', item.adherence_explanation)
        cRec.set('is_exception', item.is_blocked)
        cRec.set('exception_reason', item.block_reason || '')
        app.save(cRec)

        // Histórico inicial de identificação pelo motor
        const hRec1 = new Record(histCol)
        hRec1.set('opportunity_code', item.opportunity_code)
        hRec1.set('opportunity_id', rec.id)
        hRec1.set('event_type', 'IDENTIFIED')
        hRec1.set('event_title', 'Oportunidade identificada pelo motor')
        hRec1.set('user_email', 'motor.tms@ciafal.com.br')
        hRec1.set('user_name', 'Motor Determinístico TMS CIAFAL')
        hRec1.set('user_role', 'sistema')
        hRec1.set('previous_status', '')
        hRec1.set('new_status', 'Nova')
        hRec1.set(
          'description',
          'Cruzamento determinístico de rota, capacidade residual e histórico de compras.',
        )
        app.save(hRec1)

        if (item.commercial_status === 'Enviada ao Comercial') {
          const hRec2 = new Record(histCol)
          hRec2.set('opportunity_code', item.opportunity_code)
          hRec2.set('opportunity_id', rec.id)
          hRec2.set('event_type', 'COMMERCIAL_SENT')
          hRec2.set('event_title', 'Enviada para Comercial')
          hRec2.set('user_email', 'joao.silva@ciafal.com.br')
          hRec2.set('user_name', 'João Silva')
          hRec2.set('user_role', 'gerente_carga')
          hRec2.set('previous_status', 'Nova')
          hRec2.set('new_status', 'Enviada ao Comercial')
          hRec2.set('description', 'Despacho registrado para avaliação do representante comercial.')
          app.save(hRec2)
        }
      }
    }
  },
  (app) => {
    try {
      const hist = app.findCollectionByNameOrId('load_complement_history')
      app.delete(hist)
    } catch (_) {}
  },
)
