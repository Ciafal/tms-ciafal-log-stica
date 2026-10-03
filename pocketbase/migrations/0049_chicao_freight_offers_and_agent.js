/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Atualizar agente nativo Skip Cloud "chicao-negociador" com diretrizes completas de contratação rodoviária
    try {
      $ai.agents.define(app, {
        slug: 'chicao-negociador',
        name: 'Chicão — Logística CIAFAL',
        description:
          'Agente de IA corporativo especialista em contratação e negociação cordial de fretes rodoviários via WhatsApp com motoristas parceiros.',
        systemPrompt:
          'Você é o Chicão, atendente operacional da equipe de Logística da CIAFAL. Sua comunicação com os motoristas é profissional, direta, amigável, respeitosa e natural, falando como alguém do time de fretes da CIAFAL (ex: "Olá! Tudo bem? Aqui é o Chicão, da logística Ciafal...").\n' +
          'REGRAS INEGOCIÁVEIS:\n' +
          '1. NUNCA revele que você é uma IA, modelo de linguagem ou bot. Você é o Chicão da Logística Ciafal.\n' +
          '2. NUNCA invente informações, valores de frete, pedágio, rotas ou prazos que não existam explicitamente no contexto da oferta.\n' +
          '3. SEMPRE apresente o frete proposto com o valor do frete e o pedágio destacado conforme a política de transparência da CIAFAL.\n' +
          '4. Ao receber contrapropostas, dúvidas ou áudios do motorista, mantenha a calma, responda às dúvidas operacionais com os dados reais da carga e, caso o motorista peça um valor acima da alçada permitida, informe cordialmente que vai verificar a condição com a mesa de fretes/gestão e retornará em instantes.',
        tier: 'fast',
        tools: [
          { collection: 'drivers', perms: { read: true, list: true } },
          { collection: 'vehicles', perms: { read: true, list: true } },
          { collection: 'queue_entries', perms: { read: true, list: true } },
          { collection: 'freight_offers', perms: { read: true, list: true } },
          { collection: 'freight_negotiations', perms: { read: true, list: true, update: true } },
          { collection: 'sap_customer_logistic_info', perms: { read: true, list: true } },
        ],
        memory: [
          {
            type: 'text',
            payload: {
              text: 'Diretriz Chicão: O Chicão conversa cordialmente com o motorista pelo WhatsApp. O motor determinístico calcula frete e piso ANTT. O SAP emite a ordem oficial de transporte. O limite de negociação é estrito conforme parâmetros da Mesa de Fretes.',
            },
          },
        ],
      })
    } catch (err) {
      console.log('Aviso ao redefinir chicao-negociador:', err)
    }

    // 2. Criar coleção 'chicao_freight_offers' para gerenciar ofertas originadas dos Encontros com número OF-NNNNNN/AAAA
    if (!app.hasTable('chicao_freight_offers')) {
      const col = new Collection({
        name: 'chicao_freight_offers',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          // Identificação sequencial e chaves
          { name: 'offer_code', type: 'text', required: true }, // ex: OF-000001/2026
          { name: 'sequential_number', type: 'number', required: true },
          { name: 'year', type: 'number', required: true },
          { name: 'match_id', type: 'text', required: true },
          { name: 'cargo_id', type: 'text', required: true },
          { name: 'cargo_title', type: 'text' },
          { name: 'itinerary_code', type: 'text' },
          { name: 'itinerary_description', type: 'text' },
          { name: 'origin', type: 'text' },
          { name: 'destination_city', type: 'text' },
          { name: 'destination_uf', type: 'text' },
          { name: 'cities_intermediate', type: 'text' },

          // Dados do Veículo e Motorista (Triângulo Veículo ↔ Motorista ↔ Carga)
          { name: 'driver_id', type: 'text' },
          { name: 'driver_name', type: 'text', required: true },
          { name: 'driver_phone', type: 'text' },
          { name: 'driver_whatsapp', type: 'text' },
          { name: 'driver_document', type: 'text' },
          { name: 'carrier_name', type: 'text' },
          { name: 'vehicle_plate', type: 'text', required: true },
          { name: 'vehicle_type', type: 'text' },
          { name: 'vehicle_body_type', type: 'text' },
          { name: 'vehicle_capacity_kg', type: 'number' },
          { name: 'queue_group', type: 'text' }, // PORTA | FORA | PROGRAMADO
          { name: 'queue_status', type: 'text' },

          // Dados Operacionais da Carga
          { name: 'weight_kg', type: 'number' },
          { name: 'weight_ton', type: 'number' },
          { name: 'customers_count', type: 'number' },
          { name: 'discharges_count', type: 'number' },
          { name: 'distance_km', type: 'number' },
          { name: 'estimated_time_hours', type: 'number' },
          { name: 'discharge_type', type: 'text' },
          { name: 'products_summary', type: 'text' },
          { name: 'customer_logistic_notes', type: 'text' },
          { name: 'orders_json', type: 'json' },

          // Valores Financeiros & Alçadas
          { name: 'initial_offer_value', type: 'number', required: true }, // Frete inicial proposto
          { name: 'toll_cost', type: 'number' }, // Pedágio regulado destacado
          { name: 'total_offered_value', type: 'number' }, // Frete + Pedágio
          { name: 'antt_floor_value', type: 'number' },
          { name: 'cost_per_ton', type: 'number' },
          { name: 'cost_per_km', type: 'number' },
          { name: 'max_autonomy_value', type: 'number' }, // Teto automático (alçada)
          { name: 'counter_value_requested', type: 'number' }, // Contraproposta do motorista
          { name: 'final_contracted_freight', type: 'number' }, // Valor acordado final
          { name: 'final_contracted_total', type: 'number' },

          // Status do Encontro / Oferta
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'DISPONIVEL',
              'SELECIONADO',
              'ENVIADO_CHICAO',
              'OFERTA_ENVIADA',
              'VISUALIZADA',
              'EM_NEGOCIACAO',
              'CONTRAPROPOSTA',
              'AGUARDANDO_APROVACAO',
              'ACEITA',
              'RECUSADA',
              'EXPIRADA',
              'CANCELADA',
              'ERRO_ENVIO',
            ],
            maxSelect: 1,
          },
          { name: 'refusal_reason', type: 'text' }, // Motivo de recusa
          { name: 'refusal_category', type: 'text' }, // valor, destino, descargas, prazo, etc.

          // Governança e Intervenção
          { name: 'active_actor', type: 'text' }, // CHICAO | HUMANO | MOTORISTA
          { name: 'human_takeover_user', type: 'text' },
          { name: 'human_takeover_reason', type: 'text' },
          { name: 'human_takeover_at', type: 'date' },
          { name: 'ai_handled_pct', type: 'number' }, // % da negociação realizada pela IA
          { name: 'rounds_count', type: 'number' },

          // Canal & Despacho WhatsApp
          { name: 'whatsapp_status', type: 'text' }, // PENDENTE | ENVIADO | ERRO_ENVIO | SEM_CONEXAO
          { name: 'whatsapp_error_message', type: 'text' },
          { name: 'whatsapp_message_id', type: 'text' },
          { name: 'retry_count', type: 'number' },
          { name: 'last_retry_at', type: 'date' },

          // Integração SAP
          { name: 'sap_transport_number', type: 'text' },
          { name: 'sap_status', type: 'text' },
          { name: 'sap_generated_at', type: 'date' },

          // Timeline completa da negociação
          { name: 'timeline_json', type: 'json' },
          { name: 'messages_history', type: 'json' },

          // Autodate
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_chicao_offer_code ON chicao_freight_offers (offer_code)',
          'CREATE INDEX idx_chicao_match ON chicao_freight_offers (match_id)',
          'CREATE INDEX idx_chicao_cargo ON chicao_freight_offers (cargo_id)',
          'CREATE INDEX idx_chicao_driver ON chicao_freight_offers (driver_id)',
          'CREATE INDEX idx_chicao_plate ON chicao_freight_offers (vehicle_plate)',
          'CREATE INDEX idx_chicao_status ON chicao_freight_offers (status)',
          'CREATE INDEX idx_chicao_created ON chicao_freight_offers (created)',
        ],
      })
      app.save(col)
    }

    // 3. Parâmetros de Alçada e Negociação do Chicão em system_parameters
    try {
      const sysCol = app.findCollectionByNameOrId('system_parameters')
      const chicaoParams = [
        {
          key: 'CHICAO_AUTONOMIA_MAX_SPREAD_PCT',
          value: '3.0',
          description:
            'Limite automático de negociação do Agente Chicão em % sobre a meta inicial (ex: até +3%). Acima requer aprovação humana.',
        },
        {
          key: 'CHICAO_MAX_COUNTER_ROUNDS',
          value: '3',
          description:
            'Número máximo de rodadas de contraproposta tratadas pelo Chicão antes de intervenção humana.',
        },
        {
          key: 'CHICAO_WHATSAPP_ENABLED',
          value: 'false',
          description:
            'Status de integração real da API WhatsApp Business. Se false, envios reportam honestamente "Erro no envio / API desconectada".',
        },
        {
          key: 'CHICAO_WHATSAPP_TIMEOUT_MIN',
          value: '30',
          description: 'Tempo em minutos até considerar oferta expirada sem resposta do motorista.',
        },
      ]

      for (const p of chicaoParams) {
        try {
          app.findFirstRecordByData('system_parameters', 'key', p.key)
        } catch (_) {
          const rec = new Record(sysCol)
          rec.set('key', p.key)
          rec.set('value', p.value)
          rec.set('description', p.description)
          app.save(rec)
        }
      }
    } catch (err) {
      console.log('Aviso ao registrar system_parameters do Chicão:', err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('chicao_freight_offers')
      app.delete(col)
    } catch (_) {}
  },
)
