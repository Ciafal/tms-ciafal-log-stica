/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Seed Parâmetros de Performance e Pesos (Modelo Score v1.0)
    try {
      app.findFirstRecordByData(
        'performance_score_parameters',
        'model_version',
        'Modelo Score v1.0',
      )
    } catch (_) {
      const col = app.findCollectionByNameOrId('performance_score_parameters')
      const rec = new Record(col)
      rec.set('model_version', 'Modelo Score v1.0')
      rec.set('is_active', true)
      rec.set(
        'description',
        'Fórmula oficial CIAFAL de Performance Integrada: 7 Dimensões Parametrizáveis com Princípio de Não Punição Automática.',
      )
      rec.set('weight_punctuality_pct', 20)
      rec.set('weight_route_adherence_pct', 15)
      rec.set('weight_communication_pct', 15)
      rec.set('weight_fred_collaboration_pct', 10)
      rec.set('weight_delivery_quality_pct', 15)
      rec.set('weight_procedure_doc_pct', 10)
      rec.set('weight_human_evaluations_pct', 15)
      rec.set('min_trips_provisional', 5)
      rec.set('min_trips_consolidated', 20)
      rec.set('preferential_min_score', 90)
      rec.set('preferential_min_trips', 20)
      rec.set('preferential_clean_days', 90)
      rec.set('observation_score_threshold', 70)
      rec.set('observation_drop_threshold_points', 15)
      rec.set('approved_by_user', 'comite_logistica@ciafal.com.br')
      app.save(rec)
    }

    // 2. Seed Scores de Motoristas Reais da Base CIAFAL (com dimensões e histórico de mão dupla)
    const sampleScores = [
      {
        driver_id: 'drv-001',
        driver_name: 'João Carlos Silva',
        driver_document: '12345678909',
        driver_phone: '11987654321',
        carrier_name: 'Transportadora TransVale Ltda',
        score_consolidated: 92,
        score_objective: 94,
        score_evaluative: 89,
        stars_rating: 4.8,
        classification: 'EXCELENTE',
        operational_status: 'PREFERENCIAL',
        confidence_level: 'SCORE_CONSOLIDADO',
        trips_evaluated_count: 34,
        last_transport_sap: '123456',
        last_evaluation_date: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
        score_punctuality: 95,
        score_route_adherence: 94,
        score_communication: 92,
        score_fred_collaboration: 96,
        score_delivery_quality: 98,
        score_procedure_doc: 90,
        score_human_evaluations: 88,
        ciafal_experience_score: 91,
        driver_nps_rating: 10,
        formula_model_version: 'Modelo Score v1.0',
        parameters_used_json: JSON.stringify({
          periodMonths: 6,
          activeModel: 'Modelo Score v1.0',
          cleanDaysWithoutMajorFaults: 140,
        }),
        weights_applied_json: JSON.stringify({
          punctuality: 20,
          routeAdherence: 15,
          communication: 15,
          fredCollaboration: 10,
          deliveryQuality: 15,
          procedureDoc: 10,
          humanEvaluations: 15,
        }),
        explicability_json: JSON.stringify({
          positiveHighlights: [
            '100% de canhotos digitalizados e legíveis via Fred',
            'Comunicação proativa em paradas não programadas',
            'Tempo de descarga nos clientes 14% abaixo da média histórica',
          ],
          discardedEvents: [
            'Atraso de 45min no Transporte 123410 desconsiderado (Atraso no carregamento Doca 02 CIAFAL)',
            'Desvio de rota no Transporte 123445 desconsiderado (Bloqueio emergencial Fernão Dias indicado pelo Fred)',
          ],
          calculationBreakdown: {
            pontualidade: '95 x 0.20 = 19.0',
            aderenciaRota: '94 x 0.15 = 14.1',
            comunicacao: '92 x 0.15 = 13.8',
            fredColaboracao: '96 x 0.10 = 9.6',
            qualidadeEntrega: '98 x 0.15 = 14.7',
            procedimentosDoc: '90 x 0.10 = 9.0',
            avaliacoesHumanas: '88 x 0.15 = 13.2',
            somaFinal: 93.4,
            ajusteConsolidado: 92,
          },
        }),
        monthly_trend_json: JSON.stringify([
          { month: 'Out/25', score: 90, trips: 6 },
          { month: 'Nov/25', score: 91, trips: 5 },
          { month: 'Dez/25', score: 93, trips: 7 },
          { month: 'Jan/26', score: 92, trips: 6 },
          { month: 'Fev/26', score: 94, trips: 5 },
          { month: 'Mar/26', score: 92, trips: 5 },
        ]),
        badges_recognition_json: JSON.stringify([
          { id: 'badge-1', name: 'Motorista Preferencial CIAFAL', icon: '⭐', category: 'STATUS' },
          { id: 'badge-2', name: '100% Canhotos sem Avaria', icon: '🏆', category: 'QUALIDADE' },
          { id: 'badge-3', name: 'Top Colaboração com Fred', icon: '🤖', category: 'TECNOLOGIA' },
        ]),
      },
      {
        driver_id: 'drv-002',
        driver_name: 'Antônio Marcos Pereira',
        driver_document: '23456789012',
        driver_phone: '11988887766',
        carrier_name: 'TransRodrigues Cargas',
        score_consolidated: 84,
        score_objective: 86,
        score_evaluative: 81,
        stars_rating: 4.2,
        classification: 'MUITO_BOM',
        operational_status: 'ATIVO',
        confidence_level: 'SCORE_CONSOLIDADO',
        trips_evaluated_count: 22,
        last_transport_sap: '123457',
        last_evaluation_date: new Date(Date.now() - 3600 * 1000 * 36).toISOString(),
        score_punctuality: 86,
        score_route_adherence: 88,
        score_communication: 80,
        score_fred_collaboration: 82,
        score_delivery_quality: 90,
        score_procedure_doc: 85,
        score_human_evaluations: 80,
        ciafal_experience_score: 85,
        driver_nps_rating: 9,
        formula_model_version: 'Modelo Score v1.0',
        parameters_used_json: JSON.stringify({
          periodMonths: 6,
          activeModel: 'Modelo Score v1.0',
        }),
        weights_applied_json: JSON.stringify({
          punctuality: 20,
          routeAdherence: 15,
          communication: 15,
          fredCollaboration: 10,
          deliveryQuality: 15,
          procedureDoc: 10,
          humanEvaluations: 15,
        }),
        explicability_json: JSON.stringify({
          positiveHighlights: ['Boa conservação do veículo e agilidade no descarregamento'],
          discardedEvents: ['Atraso por chuva torrencial em Extrema/MG abonado como Força Maior'],
        }),
        monthly_trend_json: JSON.stringify([
          { month: 'Out/25', score: 81, trips: 4 },
          { month: 'Nov/25', score: 83, trips: 3 },
          { month: 'Dez/25', score: 85, trips: 5 },
          { month: 'Jan/26', score: 86, trips: 4 },
          { month: 'Fev/26', score: 84, trips: 3 },
          { month: 'Mar/26', score: 84, trips: 3 },
        ]),
        badges_recognition_json: JSON.stringify([
          { id: 'badge-1', name: 'Alta Eficiência em Rotas MG', icon: '🛣️', category: 'ROTA' },
        ]),
      },
      {
        driver_id: 'drv-003',
        driver_name: 'Carlos Eduardo Oliveira',
        driver_document: '34567890123',
        driver_phone: '11977776655',
        carrier_name: 'Autônomo',
        score_consolidated: 67,
        score_objective: 69,
        score_evaluative: 63,
        stars_rating: 3.3,
        classification: 'ATENCAO',
        operational_status: 'EM_OBSERVACAO',
        confidence_level: 'CONFIANCA_MODERADA',
        trips_evaluated_count: 14,
        last_transport_sap: '123458',
        last_evaluation_date: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
        score_punctuality: 62,
        score_route_adherence: 70,
        score_communication: 65,
        score_fred_collaboration: 60,
        score_delivery_quality: 78,
        score_procedure_doc: 70,
        score_human_evaluations: 64,
        ciafal_experience_score: 60,
        driver_nps_rating: 6,
        formula_model_version: 'Modelo Score v1.0',
        parameters_used_json: JSON.stringify({
          periodMonths: 6,
          activeModel: 'Modelo Score v1.0',
          observationTrigger: 'Queda de pontualidade atribuível e baixa resposta no WhatsApp',
        }),
        weights_applied_json: JSON.stringify({
          punctuality: 20,
          routeAdherence: 15,
          communication: 15,
          fredCollaboration: 10,
          deliveryQuality: 15,
          procedureDoc: 10,
          humanEvaluations: 15,
        }),
        explicability_json: JSON.stringify({
          positiveHighlights: ['Zero avaria na carga'],
          negativePoints: [
            '2 ocorrências com paradas não comunicadas de +50min',
            'Demora no envio de comprovantes de entrega',
          ],
          discardedEvents: [
            'Atraso no cliente Betim atribuído à fila interna do cliente (impacto no motorista = 0)',
          ],
        }),
        monthly_trend_json: JSON.stringify([
          { month: 'Out/25', score: 82, trips: 3 },
          { month: 'Nov/25', score: 79, trips: 3 },
          { month: 'Dez/25', score: 75, trips: 2 },
          { month: 'Jan/26', score: 71, trips: 2 },
          { month: 'Fev/26', score: 68, trips: 2 },
          { month: 'Mar/26', score: 67, trips: 2 },
        ]),
        badges_recognition_json: JSON.stringify([]),
      },
    ]

    const perfScoresCol = app.findCollectionByNameOrId('driver_performance_scores')
    for (const d of sampleScores) {
      try {
        app.findFirstRecordByData('driver_performance_scores', 'driver_id', d.driver_id)
      } catch (_) {
        const rec = new Record(perfScoresCol)
        for (const [key, val] of Object.entries(d)) {
          rec.set(key, val)
        }
        app.save(rec)
      }
    }

    // 3. Seed Pesquisas de Mão Dupla da CIAFAL (Experiência e NPS)
    const sampleSurveys = [
      {
        sap_transport_number: '123456',
        driver_id: 'drv-001',
        driver_name: 'João Carlos Silva',
        carrier_name: 'Transportadora TransVale Ltda',
        origin_plant: 'CIAFAL Matriz (São Paulo/SP)',
        expedition_shift: 'Turno 1 (06h às 14h)',
        cargo_type: 'Perfilado e Chapas',
        rating_arrival_reception: 5,
        rating_waiting_time: 4,
        rating_loading_process: 5,
        rating_info_clarity: 5,
        rating_invoicing_doc: 4,
        rating_trip_communication: 5,
        rating_fred_experience: 5,
        rating_overall_ciafal: 5,
        score_calculated_pct: 94,
        nps_recommendation_score: 10,
        nps_category: 'PROMOTOR',
        feedback_text:
          'Atendimento do carregamento na Doca 04 foi muito rápido e a equipe da expedição estava bem alinhada. O Fred ajudou bastante na rota.',
        ai_sentiment: 'Positivo',
        expedition_dwell_time_min: 102,
        fact_consistency_status: 'Consistente com os dados observados',
        fact_consistency_explanation:
          'Tempo total de pátio foi de 1h42m (abaixo da meta de 2h00). Avaliação positiva condizente com os registros operacionais.',
      },
      {
        sap_transport_number: '123457',
        driver_id: 'drv-002',
        driver_name: 'Antônio Marcos Pereira',
        carrier_name: 'TransRodrigues Cargas',
        origin_plant: 'CIAFAL Matriz (São Paulo/SP)',
        expedition_shift: 'Turno 2 (14h às 22h)',
        cargo_type: 'Tubos e Perfis Leves',
        rating_arrival_reception: 4,
        rating_waiting_time: 3,
        rating_loading_process: 4,
        rating_info_clarity: 4,
        rating_invoicing_doc: 3,
        rating_trip_communication: 4,
        rating_fred_experience: 5,
        rating_overall_ciafal: 4,
        score_calculated_pct: 78,
        nps_recommendation_score: 8,
        nps_category: 'NEUTRO',
        feedback_text:
          'Demorou um pouco na liberação da nota fiscal no faturamento após o carregamento (cerca de 40 min), mas o pessoal da doca foi muito prestativo.',
        ai_sentiment: 'Neutro',
        expedition_dwell_time_min: 195,
        fact_consistency_status: 'Consistente com os dados observados',
        fact_consistency_explanation:
          'Faturamento levou 42 min no Turno 2 (gargalo pontual verificado no SLA T8). Feedback 100% alinhado aos marcos de tempo.',
      },
      {
        sap_transport_number: '123458',
        driver_id: 'drv-003',
        driver_name: 'Carlos Eduardo Oliveira',
        carrier_name: 'Autônomo',
        origin_plant: 'CIAFAL Matriz (São Paulo/SP)',
        expedition_shift: 'Turno 2 (14h às 22h)',
        cargo_type: 'Chapas Pesadas',
        rating_arrival_reception: 3,
        rating_waiting_time: 2,
        rating_loading_process: 3,
        rating_info_clarity: 3,
        rating_invoicing_doc: 2,
        rating_trip_communication: 3,
        rating_fred_experience: 4,
        rating_overall_ciafal: 3,
        score_calculated_pct: 58,
        nps_recommendation_score: 6,
        nps_category: 'DETRATOR',
        feedback_text:
          'Fila longa na entrada e muita demora para chamar na doca. A ponte rolante estava em manutenção.',
        ai_sentiment: 'Crítico',
        expedition_dwell_time_min: 245,
        fact_consistency_status: 'Consistente com os dados observados',
        fact_consistency_explanation:
          'Ocorrência de manutenção na doca 02 gerou espera de 85 min. Avaliação crítica legítima.',
      },
    ]

    const surveyCol = app.findCollectionByNameOrId('driver_ciafal_surveys')
    for (const s of sampleSurveys) {
      try {
        app.findFirstRecordByData(
          'driver_ciafal_surveys',
          'sap_transport_number',
          s.sap_transport_number,
        )
      } catch (_) {
        const rec = new Record(surveyCol)
        for (const [key, val] of Object.entries(s)) {
          rec.set(key, val)
        }
        app.save(rec)
      }
    }

    // 4. Seed Perfis Logísticos de Clientes (Score Logístico Interno TMS/CRM)
    const sampleCustProfiles = [
      {
        customer_code: 'CLI-MG-001',
        customer_name: 'Estruturas Metálicas ABC Ltda',
        customer_city: 'Betim',
        customer_uf: 'MG',
        sales_rep: 'Marcos Vendas (MG)',
        customer_tier: 'TIER_1',
        logistic_score: 64,
        stars_rating: 3.2,
        logistic_classification: 'REGULAR',
        deliveries_analyzed_count: 28,
        avg_waiting_time_min: 68,
        avg_unloading_time_min: 94,
        p90_unloading_time_min: 175,
        window_compliance_rate_pct: 72,
        occurrences_rate_pct: 25,
        avg_driver_rating: 3.1,
        recurring_issues_json: JSON.stringify([
          'Portaria sem espaço para bitrem gerando fila na rodovia',
          'Apenas uma ponte rolante operacional no período vespertino',
          'Recusa sistemática de recebimento após as 16h',
        ]),
        ai_recommendations:
          'IA Recomenda: Programar chegadas exclusivamente na janela matutina (08h às 10h) ou ajustar acréscimo de R$ 180 na diária/frete para amortizar espera de +68 min.',
        financial_impact_notes:
          'Horas paradas acumuladas no cliente ABC nos últimos 90 dias geraram custo estimado de R$ 4.250 em tempo ocioso.',
        best_matched_drivers_json: JSON.stringify([
          {
            driverName: 'João Carlos Silva',
            reason: 'Excelente relacionamento e conhecimento do acesso',
          },
        ]),
        is_confidential_internal: true,
      },
      {
        customer_code: 'CLI-SP-002',
        customer_name: 'Metalúrgica Campinas S.A.',
        customer_city: 'Campinas',
        customer_uf: 'SP',
        sales_rep: 'Renato Sales (SP-INT)',
        customer_tier: 'TIER_1',
        logistic_score: 93,
        stars_rating: 4.7,
        logistic_classification: 'EXCELENTE',
        deliveries_analyzed_count: 42,
        avg_waiting_time_min: 15,
        avg_unloading_time_min: 38,
        p90_unloading_time_min: 55,
        window_compliance_rate_pct: 98,
        occurrences_rate_pct: 2,
        avg_driver_rating: 4.9,
        recurring_issues_json: JSON.stringify([]),
        ai_recommendations:
          'Cliente referência em eficiência logística. Excelente pontualidade e estrutura de recebimento contínuo.',
        financial_impact_notes: 'Custo de ociosidade zero. Permite giros rápidos de veículos.',
        best_matched_drivers_json: JSON.stringify([
          { driverName: 'Antônio Marcos Pereira', reason: 'Rota frequente e agilidade na entrega' },
        ]),
        is_confidential_internal: true,
      },
      {
        customer_code: 'CLI-MG-003',
        customer_name: 'Comércio de Ferragens Triângulo Ltda',
        customer_city: 'Uberlândia',
        customer_uf: 'MG',
        sales_rep: 'Marcos Vendas (MG)',
        customer_tier: 'TIER_2',
        logistic_score: 82,
        stars_rating: 4.1,
        logistic_classification: 'BOM',
        deliveries_analyzed_count: 18,
        avg_waiting_time_min: 28,
        avg_unloading_time_min: 48,
        p90_unloading_time_min: 75,
        window_compliance_rate_pct: 88,
        occurrences_rate_pct: 8,
        avg_driver_rating: 4.2,
        recurring_issues_json: JSON.stringify(['Acesso estreito para carretas vanderleia']),
        ai_recommendations: 'Priorizar veículos tipo Truck ou Toco em entregas no centro urbano.',
        financial_impact_notes: 'Impacto operacional baixo e controlado.',
        best_matched_drivers_json: JSON.stringify([]),
        is_confidential_internal: true,
      },
    ]

    const custProfCol = app.findCollectionByNameOrId('customer_logistic_profiles')
    for (const c of sampleCustProfiles) {
      try {
        app.findFirstRecordByData('customer_logistic_profiles', 'customer_code', c.customer_code)
      } catch (_) {
        const rec = new Record(custProfCol)
        for (const [key, val] of Object.entries(c)) {
          rec.set(key, val)
        }
        app.save(rec)
      }
    }

    // 5. Seed Matriz de Responsabilidade de Ocorrências (Princípio de Causa e Responsabilidade)
    const sampleResponsibilityOccurrences = [
      {
        occurrence_code: 'OCC-RESP-123456-01',
        sap_transport_number: '123456',
        driver_id: 'drv-001',
        driver_name: 'João Carlos Silva',
        customer_code: 'CLI-MG-001',
        customer_name: 'Estruturas Metálicas ABC Ltda',
        category: 'CONGESTIONAMENTO',
        description:
          'Obras de recapeamento na BR-381 km 530 gerando lentidão de +25 minutos no percurso.',
        primary_responsible: 'RODOVIA_TRANSITO',
        contributing_actors_json: JSON.stringify(['Concessionária BR-381']),
        root_cause_explanation:
          'Obras emergenciais na pista simples sem desvio alternativo viável.',
        evidence_ids_json: JSON.stringify(['EVID-001-AUDIO', 'EVID-002-GPS']),
        total_impact_minutes: 25,
        minutes_driver_imputable: 0,
        minutes_ciafal_imputable: 0,
        minutes_client_imputable: 0,
        minutes_external_imputable: 25,
        driver_score_penalty_points: 0,
        ai_hypothesis:
          'Atraso decorrente de retenção rodoviária externa confirmada por GPS e áudio enviado ao Fred.',
        ai_confidence_level: 'ALTA',
        ai_confidence_pct: 95,
        ai_next_recommended_action: 'Abonar tempo e manter pontualidade do motorista em 100%.',
        driver_justification_status: 'ISENTO',
        driver_justification_text:
          'Áudio enviado ao Fred às 09:12 informando a lentidão na Fernão Dias.',
        is_human_verified: true,
        verified_by_user: 'operador_logistica@ciafal.com.br',
        verified_at: new Date().toISOString(),
        verification_notes: 'Evidência de trânsito confirmada na Torre Fred.',
      },
      {
        occurrence_code: 'OCC-RESP-123458-01',
        sap_transport_number: '123458',
        driver_id: 'drv-003',
        driver_name: 'Carlos Eduardo Oliveira',
        customer_code: 'CLI-MG-001',
        customer_name: 'Estruturas Metálicas ABC Ltda',
        category: 'DEMORA_DESCARGA',
        description: 'Parada estendida e atraso na apresentação na portaria do cliente.',
        primary_responsible: 'COMPARTILHADA',
        contributing_actors_json: JSON.stringify(['MOTORISTA', 'EXPEDICAO_CIAFAL']),
        root_cause_explanation:
          'Atraso de 35min no carregamento da CIAFAL + 40min de parada não programada do motorista.',
        evidence_ids_json: JSON.stringify(['EVID-005-TIMELINE']),
        total_impact_minutes: 75,
        minutes_driver_imputable: 40,
        minutes_ciafal_imputable: 35,
        minutes_client_imputable: 0,
        minutes_external_imputable: 0,
        driver_score_penalty_points: 4,
        ai_hypothesis:
          'Decomposição do atraso identifica 35min na expedição CIAFAL e 40min de desvio não justificado do motorista.',
        ai_confidence_level: 'ALTA',
        ai_confidence_pct: 91,
        ai_next_recommended_action:
          'Solicitar esclarecimento ao motorista via Fred antes de fechar avaliação.',
        driver_justification_status: 'JUSTIFICADO',
        driver_justification_text:
          'Tive que calibrar os pneus e verificar o lonamento que soltou na serra.',
        is_human_verified: true,
        verified_by_user: 'gestor_logistica@ciafal.com.br',
        verified_at: new Date().toISOString(),
        verification_notes:
          'Justificativa aceita parcialmente (impacto reduzido de -8 para -4 pontos no subscore).',
      },
    ]

    const respCol = app.findCollectionByNameOrId('performance_responsibility_matrix')
    for (const r of sampleResponsibilityOccurrences) {
      try {
        app.findFirstRecordByData(
          'performance_responsibility_matrix',
          'occurrence_code',
          r.occurrence_code,
        )
      } catch (_) {
        const rec = new Record(respCol)
        for (const [key, val] of Object.entries(r)) {
          rec.set(key, val)
        }
        app.save(rec)
      }
    }

    // 6. Seed Histórico de Auditoria Imutável do Score (Ledger)
    const sampleAudits = [
      {
        driver_id: 'drv-001',
        driver_name: 'João Carlos Silva',
        transport_sap: '123456',
        event_type: 'SCORE_CALCULATED',
        score_before: 91,
        score_after: 92,
        formula_version_used: 'Modelo Score v1.0',
        weights_snapshot_json: JSON.stringify({ punctuality: 20, fred: 10, route: 15 }),
        included_events_json: JSON.stringify(['Viagem concluída no prazo', 'Canhotos 100%']),
        discarded_events_json: JSON.stringify(['Atraso 25min rodovia isento']),
        justifications_applied_json: JSON.stringify(['Justificativa GPS Rodovia']),
        user_email: 'sistema.fred@ciafal.corp',
        user_name: 'Fred IA / Motor de Performance',
        human_notes: 'Cálculo automático pós-encerramento de viagem SAP 123456.',
      },
    ]

    const auditCol = app.findCollectionByNameOrId('performance_audit_ledger')
    for (const a of sampleAudits) {
      try {
        const rec = new Record(auditCol)
        for (const [key, val] of Object.entries(a)) {
          rec.set(key, val)
        }
        app.save(rec)
      } catch (_) {}
    }
  },
  (app) => {
    // Reversão segura
  },
)
