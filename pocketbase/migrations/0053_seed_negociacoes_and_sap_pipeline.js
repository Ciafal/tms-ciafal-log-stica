migrate(
  (app) => {
    const negCol = app.findCollectionByNameOrId('negociacoes')
    const remCol = app.findCollectionByNameOrId('sap_remessas_transporte')

    // Seed idempotente: verifica se já tem dados em negociacoes
    try {
      const existing = app.findRecordsByFilter(
        'negociacoes',
        "negotiation_number != ''",
        '-created',
        1,
        0,
      )
      if (existing && existing.length > 0) {
        return // Já populado
      }
    } catch (_) {}

    // Exemplos realistas respeitando regras de negócio e formatação brasileira
    const initialRecords = [
      {
        negotiation_number: 'NEG-2026-000101',
        cargo_id: 'CARGA-SP-101',
        cargo_description: 'Bobinas Laminadas a Quente 1010/1020',
        offer_code: 'OFR-2026-0101',
        origin: 'Contagem - MG',
        destination: 'São Paulo / Campinas',
        uf: 'SP',
        itinerary_code: 'MG-SP-01',
        itinerary_description: 'Contagem (MG) → Grande São Paulo (SP)',
        distance_km: 572,
        discharges_count: 2,
        customers_count: 2,
        driver_id: 'DRV-1001',
        driver_name: 'Antônio Carlos Silveira',
        driver_phone: '(31) 99876-5432',
        driver_cpf: '123.341.890-55',
        driver_cpf_masked: '***.341.890-**',
        carrier_name: 'Transportes Silveira Ltda',
        vehicle_plate: 'CIA-1A23',
        vehicle_type: 'Carreta Bitrem',
        vehicle_body_type: 'Grade Baixa / Sider',
        total_weight_kg: 28500,
        initial_freight_value: 5400,
        negotiated_freight_value: 5850,
        toll_value: 480,
        other_costs_value: 0,
        total_contracted_value: 6330,
        antt_floor_value: 4920,
        status: 'CONCLUIDA',
        responsible_type: 'CHICAO_IA',
        responsible_user_name: 'Agente Chicão (IA)',
        responsible_user_email: 'chicao.ia@ciafal.com.br',
        ai_messages_count: 6,
        human_messages_count: 0,
        ai_duration_minutes: 12,
        human_duration_minutes: 0,
        rounds_count: 2,
        acceptance_at: '2026-10-03 14:35:00.000Z',
        accepted_by: 'Antônio Carlos Silveira',
        completion_notes:
          'Negociação fechada cordialmente dentro da faixa parametrizada pelo Chicão.',
        opened_at: '2026-10-03 14:20:00.000Z',
        concluded_at: '2026-10-03 14:35:00.000Z',
        sap_pipeline_status: 'AGUARDANDO_INTEGRACAO',
        sap_pipeline_current_step: 'Aguardando liberação RFC de escrita no SAP ECC QAS',
        sap_transport_number: '',
        sap_remessas_summary: '2 remessas previstas (Aço Forte, Metalúrgica Paulista)',
        sap_last_attempt_at: '2026-10-03 14:36:00.000Z',
        sap_error_technical: 'RFC_WRITE_NOT_AVAILABLE',
        sap_error_message:
          'Função RFC de escrita no SAP não liberada no ambiente QAS (pendência externa conhecida). Pipeline retém dados para processamento.',
        sap_error_step: 'CRIAR_REMESSAS',
        sap_retry_count: 1,
        orders_items_json: [
          {
            customerCode: '100025',
            customerName: 'Aço Forte Distribuidora Ltda',
            orderNumber: '450001',
            itemNumber: '000010',
            product: 'Bobina Laminada a Quente 1010',
            quantity: 1,
            unit: 'PC',
            weightKg: 14500,
            destination: 'São Paulo - SP',
          },
          {
            customerCode: '100088',
            customerName: 'Metalúrgica Paulista S.A.',
            orderNumber: '450005',
            itemNumber: '000010',
            product: 'Chapa Fina a Frio 1020',
            quantity: 2,
            unit: 'FD',
            weightKg: 14000,
            destination: 'Campinas - SP',
          },
        ],
        remessas_sap_json: [
          {
            customerCode: '100025',
            customerName: 'Aço Forte Distribuidora Ltda',
            orders: ['450001'],
            remessaSap: '',
            status: 'PENDENTE',
            weightKg: 14500,
          },
          {
            customerCode: '100088',
            customerName: 'Metalúrgica Paulista S.A.',
            orders: ['450005'],
            remessaSap: '',
            status: 'PENDENTE',
            weightKg: 14000,
          },
        ],
        timeline_events_json: [
          {
            id: 'evt-1',
            timestamp: '2026-10-03 14:20:00',
            actor: '🤖 Chicão — IA',
            type: 'OPENING',
            message:
              'Oferta enviada ao motorista Antônio Carlos Silveira: R$ 5.400,00 + R$ 480,00 de pedágio garantido.',
          },
          {
            id: 'evt-2',
            timestamp: '2026-10-03 14:25:10',
            actor: '👤 Motorista',
            type: 'COUNTER_PROPOSAL',
            message: 'Contraproposta do motorista recebida via WhatsApp: R$ 6.000,00 + pedágio.',
          },
          {
            id: 'evt-3',
            timestamp: '2026-10-03 14:28:40',
            actor: '🤖 Chicão — IA',
            type: 'AI_RESPONSE',
            message:
              'Contraproposta do Chicão dentro da margem autorizada: R$ 5.850,00 + R$ 480,00 de pedágio.',
          },
          {
            id: 'evt-4',
            timestamp: '2026-10-03 14:35:00',
            actor: '👤 Motorista',
            type: 'ACCEPTANCE',
            message:
              'Motorista aceitou as condições comerciais (R$ 5.850,00 + Pedágio). Aceite registrado.',
          },
          {
            id: 'evt-5',
            timestamp: '2026-10-03 14:35:10',
            actor: '⚙️ Sistema TMS',
            type: 'CONCLUDED',
            message:
              'Negociação concluída com todas as informações obrigatórias validadas. Carga vinculada.',
          },
          {
            id: 'evt-6',
            timestamp: '2026-10-03 14:36:00',
            actor: '🔄 Pipeline SAP',
            type: 'SAP_PENDING',
            message:
              'Pipeline SAP iniciado: validação da carga e pedidos OK. Etapa de geração de remessas aguardando liberação formal da RFC de escrita no QAS.',
          },
        ],
        counter_proposals_json: [
          { round: 1, sender: 'CHICAO_IA', value: 5400, note: 'Oferta inicial' },
          { round: 2, sender: 'MOTORISTA', value: 6000, note: 'Contraproposta do motorista' },
          {
            round: 3,
            sender: 'CHICAO_IA',
            value: 5850,
            note: 'Contraproposta aceita pelo motorista',
          },
        ],
        correlation_id: 'CORR-NEG-101',
      },
      {
        negotiation_number: 'NEG-2026-000102',
        cargo_id: 'CARGA-RJ-202',
        cargo_description: 'Perfis e Vigas Laminadas',
        offer_code: 'OFR-2026-0202',
        origin: 'Contagem - MG',
        destination: 'Rio de Janeiro / Duque de Caxias',
        uf: 'RJ',
        itinerary_code: 'MG-RJ-02',
        itinerary_description: 'Contagem (MG) → Rio de Janeiro / Baixada (RJ)',
        distance_km: 506,
        discharges_count: 1,
        customers_count: 1,
        driver_id: 'DRV-1002',
        driver_name: 'Marcos Vinicius Rezende',
        driver_phone: '(31) 98765-4321',
        driver_cpf: '456.889.123-11',
        driver_cpf_masked: '***.889.123-**',
        carrier_name: 'Rodoviário Minas Gerais',
        vehicle_plate: 'RDO-9E88',
        vehicle_type: 'Truck Graneleiro',
        vehicle_body_type: 'Grade Baixa',
        total_weight_kg: 14500,
        initial_freight_value: 2300,
        negotiated_freight_value: 2450,
        toll_value: 320,
        other_costs_value: 0,
        total_contracted_value: 2770,
        antt_floor_value: 2150,
        status: 'EM_NEGOCIACAO',
        responsible_type: 'CHICAO_IA',
        responsible_user_name: 'Agente Chicão (IA)',
        responsible_user_email: 'chicao.ia@ciafal.com.br',
        ai_messages_count: 3,
        human_messages_count: 0,
        ai_duration_minutes: 8,
        human_duration_minutes: 0,
        rounds_count: 1,
        opened_at: '2026-10-03 15:10:00.000Z',
        sap_pipeline_status: 'AGUARDANDO_INTEGRACAO',
        sap_pipeline_current_step: 'Negociação em andamento no WhatsApp',
        sap_remessas_summary: 'Aguardando conclusão comercial',
        orders_items_json: [
          {
            customerCode: '100050',
            customerName: 'Siderúrgica Guanabara S.A.',
            orderNumber: '450010',
            itemNumber: '000010',
            product: 'Perfis e Vigas I e H',
            quantity: 12,
            unit: 'PC',
            weightKg: 14500,
            destination: 'Duque de Caxias - RJ',
          },
        ],
        remessas_sap_json: [],
        timeline_events_json: [
          {
            id: 'evt-102-1',
            timestamp: '2026-10-03 15:10:00',
            actor: '🤖 Chicão — IA',
            type: 'OPENING',
            message: 'Oferta enviada ao motorista Marcos Rezende: R$ 2.300,00 + Pedágio R$ 320,00.',
          },
          {
            id: 'evt-102-2',
            timestamp: '2026-10-03 15:14:00',
            actor: '👤 Motorista',
            type: 'COUNTER_PROPOSAL',
            message: 'Motorista solicitou R$ 2.600,00 alegando custo de retorno.',
          },
          {
            id: 'evt-102-3',
            timestamp: '2026-10-03 15:15:30',
            actor: '🤖 Chicão — IA',
            type: 'AI_RESPONSE',
            message:
              'Chicão propôs avanço para R$ 2.450,00 + pedágio garantido. Aguardando retorno.',
          },
        ],
        counter_proposals_json: [
          { round: 1, sender: 'CHICAO_IA', value: 2300, note: 'Oferta inicial' },
          { round: 2, sender: 'MOTORISTA', value: 2600, note: 'Contraproposta' },
          { round: 3, sender: 'CHICAO_IA', value: 2450, note: 'Contraproposta Chicão' },
        ],
        correlation_id: 'CORR-NEG-102',
      },
      {
        negotiation_number: 'NEG-2026-000103',
        cargo_id: 'CARGA-ES-303',
        cargo_description: 'Chapas Finas e Tubos Industriais',
        offer_code: 'OFR-2026-0303',
        origin: 'Contagem - MG',
        destination: 'Vitória / Cariacica',
        uf: 'ES',
        itinerary_code: 'MG-ES-03',
        itinerary_description: 'Contagem (MG) → Grande Vitória (ES)',
        distance_km: 660,
        discharges_count: 3,
        customers_count: 2,
        driver_id: 'DRV-1003',
        driver_name: 'Cláudio Roberto Dias',
        driver_phone: '(31) 97654-3210',
        driver_cpf: '789.672.441-00',
        driver_cpf_masked: '***.672.441-**',
        carrier_name: 'TransAço Cargas Express',
        vehicle_plate: 'SID-4K11',
        vehicle_type: 'Carreta Sider',
        vehicle_body_type: 'Sider Fechado',
        total_weight_kg: 27800,
        initial_freight_value: 3900,
        negotiated_freight_value: 4300,
        toll_value: 420,
        other_costs_value: 0,
        total_contracted_value: 4720,
        antt_floor_value: 3500,
        status: 'EM_NEGOCIACAO',
        responsible_type: 'HUMANO',
        responsible_user_name: 'Carlos Mendes (Operador)',
        responsible_user_email: 'carlos.mendes@ciafal.com.br',
        ai_messages_count: 4,
        human_messages_count: 3,
        ai_duration_minutes: 10,
        human_duration_minutes: 15,
        human_takeover_at: '2026-10-03 15:40:00.000Z',
        human_takeover_reason: 'Motorista exigiu adiantamento extraordinário acima da alçada da IA',
        rounds_count: 3,
        opened_at: '2026-10-03 15:30:00.000Z',
        sap_pipeline_status: 'AGUARDANDO_INTEGRACAO',
        sap_pipeline_current_step: 'Atendimento humano ativo pelo operador',
        sap_remessas_summary: 'Aguardando fechamento manual',
        orders_items_json: [
          {
            customerCode: '100062',
            customerName: 'Comércio de Ferragens Capixaba',
            orderNumber: '450020',
            itemNumber: '000010',
            product: 'Chapas Finas a Frio',
            quantity: 5,
            unit: 'FD',
            weightKg: 13900,
            destination: 'Cariacica - ES',
          },
          {
            customerCode: '100068',
            customerName: 'Distribuidora Aço Serra',
            orderNumber: '450025',
            itemNumber: '000010',
            product: 'Tubos Industriais',
            quantity: 8,
            unit: 'PC',
            weightKg: 13900,
            destination: 'Serra - ES',
          },
        ],
        remessas_sap_json: [],
        timeline_events_json: [
          {
            id: 'evt-103-1',
            timestamp: '2026-10-03 15:30:00',
            actor: '🤖 Chicão — IA',
            type: 'OPENING',
            message: 'Oferta aberta: R$ 3.900,00 + Pedágio R$ 420,00.',
          },
          {
            id: 'evt-103-2',
            timestamp: '2026-10-03 15:35:00',
            actor: '👤 Motorista',
            type: 'COUNTER_PROPOSAL',
            message: 'Motorista pediu R$ 4.400,00 e pediu para falar com operador humano.',
          },
          {
            id: 'evt-103-3',
            timestamp: '2026-10-03 15:40:00',
            actor: '👤 Atendimento humano',
            type: 'TAKEOVER',
            message:
              'Intervenção humana por Carlos Mendes. Motivo: Motorista exigiu adiantamento extraordinário acima da alçada da IA.',
          },
          {
            id: 'evt-103-4',
            timestamp: '2026-10-03 15:45:00',
            actor: '👤 Atendimento humano',
            type: 'HUMAN_MESSAGE',
            message: 'Operador em conversa via WhatsApp ajustando condições operacionais.',
          },
        ],
        counter_proposals_json: [
          { round: 1, sender: 'CHICAO_IA', value: 3900, note: 'Oferta inicial' },
          { round: 2, sender: 'MOTORISTA', value: 4400, note: 'Contraproposta' },
        ],
        correlation_id: 'CORR-NEG-103',
      },
      {
        negotiation_number: 'NEG-2026-000104',
        cargo_id: 'CARGA-GO-404',
        cargo_description: 'Chapas Grossas Industriais',
        offer_code: 'OFR-2026-0404',
        origin: 'Contagem - MG',
        destination: 'Goiânia / Aparecida de Goiânia',
        uf: 'GO',
        itinerary_code: 'MG-GO-04',
        itinerary_description: 'Contagem (MG) → Goiânia / Centro-Oeste (GO)',
        distance_km: 840,
        discharges_count: 2,
        customers_count: 1,
        driver_id: 'DRV-1004',
        driver_name: 'Sebastião Pedro Duarte',
        driver_phone: '(31) 96543-2109',
        driver_cpf: '321.654.987-22',
        driver_cpf_masked: '***.654.987-**',
        carrier_name: 'Autônomo',
        vehicle_plate: 'GOI-2X88',
        vehicle_type: 'Carreta Cavalo Toco',
        vehicle_body_type: 'Carreta Aberta',
        total_weight_kg: 25000,
        initial_freight_value: 4800,
        negotiated_freight_value: 0,
        toll_value: 620,
        other_costs_value: 0,
        total_contracted_value: 0,
        antt_floor_value: 4600,
        status: 'RECUSADO',
        responsible_type: 'CHICAO_IA',
        responsible_user_name: 'Agente Chicão (IA)',
        responsible_user_email: 'chicao.ia@ciafal.com.br',
        ai_messages_count: 2,
        human_messages_count: 0,
        ai_duration_minutes: 5,
        human_duration_minutes: 0,
        rounds_count: 1,
        opened_at: '2026-10-03 11:00:00.000Z',
        concluded_at: '2026-10-03 11:05:00.000Z',
        sap_pipeline_status: 'AGUARDANDO_INTEGRACAO',
        sap_pipeline_current_step: 'Negociação encerrada por recusa do parceiro',
        sap_remessas_summary: 'Não aplicável (recusado)',
        orders_items_json: [
          {
            customerCode: '100099',
            customerName: 'Aços Goiás Distribuição',
            orderNumber: '450040',
            itemNumber: '000010',
            product: 'Chapa Grossa Industrial',
            quantity: 3,
            unit: 'PC',
            weightKg: 25000,
            destination: 'Goiânia - GO',
          },
        ],
        remessas_sap_json: [],
        timeline_events_json: [
          {
            id: 'evt-104-1',
            timestamp: '2026-10-03 11:00:00',
            actor: '🤖 Chicão — IA',
            type: 'OPENING',
            message: 'Oferta enviada a Sebastião Pedro: R$ 4.800,00 + Pedágio R$ 620,00.',
          },
          {
            id: 'evt-104-2',
            timestamp: '2026-10-03 11:05:00',
            actor: '👤 Motorista',
            type: 'REFUSAL',
            message: 'Motorista recusou a oferta: indisponibilidade mecânica no caminhão.',
          },
          {
            id: 'evt-104-3',
            timestamp: '2026-10-03 11:05:10',
            actor: '⚙️ Sistema TMS',
            type: 'STATUS_CHANGE',
            message:
              'Negociação marcada como RECUSADA. Carga devolvida para nova oferta na Mesa de Fretes.',
          },
        ],
        counter_proposals_json: [
          { round: 1, sender: 'CHICAO_IA', value: 4800, note: 'Oferta inicial' },
        ],
        correlation_id: 'CORR-NEG-104',
      },
      {
        negotiation_number: 'NEG-2026-000105',
        cargo_id: 'CARGA-MG-505',
        cargo_description: 'Barras Chatas e Cantoneiras',
        offer_code: 'OFR-2026-0505',
        origin: 'Contagem - MG',
        destination: 'Uberlândia / Triângulo Mineiro',
        uf: 'MG',
        itinerary_code: 'MG-INT-05',
        itinerary_description: 'Contagem (MG) → Triângulo Mineiro (MG)',
        distance_km: 540,
        discharges_count: 2,
        customers_count: 2,
        driver_id: '',
        driver_name: '',
        driver_phone: '',
        driver_cpf: '',
        driver_cpf_masked: '',
        carrier_name: '',
        vehicle_plate: '',
        vehicle_type: 'Truck Graneleiro',
        vehicle_body_type: 'Grade Baixa',
        total_weight_kg: 14000,
        initial_freight_value: 2600,
        negotiated_freight_value: 0,
        toll_value: 310,
        other_costs_value: 0,
        total_contracted_value: 0,
        antt_floor_value: 2350,
        status: 'ABERTO',
        responsible_type: 'CHICAO_IA',
        responsible_user_name: 'Agente Chicão (IA)',
        responsible_user_email: 'chicao.ia@ciafal.com.br',
        ai_messages_count: 0,
        human_messages_count: 0,
        ai_duration_minutes: 0,
        human_duration_minutes: 0,
        rounds_count: 0,
        opened_at: '2026-10-03 16:00:00.000Z',
        sap_pipeline_status: 'AGUARDANDO_INTEGRACAO',
        sap_pipeline_current_step: 'Negociação aberta, aguardando início de contato com motorista',
        sap_remessas_summary: 'Aguardando início de negociação',
        orders_items_json: [
          {
            customerCode: '100075',
            customerName: 'Ferragens Triângulo Ltda',
            orderNumber: '450055',
            itemNumber: '000010',
            product: 'Barras Chatas 1 X 1/4',
            quantity: 50,
            unit: 'BR',
            weightKg: 7000,
            destination: 'Uberlândia - MG',
          },
          {
            customerCode: '100078',
            customerName: 'ConstruAço Uberaba',
            orderNumber: '450060',
            itemNumber: '000010',
            product: 'Cantoneiras 2 X 3/16',
            quantity: 40,
            unit: 'BR',
            weightKg: 7000,
            destination: 'Uberaba - MG',
          },
        ],
        remessas_sap_json: [],
        timeline_events_json: [
          {
            id: 'evt-105-1',
            timestamp: '2026-10-03 16:00:00',
            actor: '⚙️ Sistema TMS',
            type: 'OPENING',
            message:
              'Negociação criada para a Carga CARGA-MG-505. Disponível em ABERTO para envio de oferta ou seleção de parceiro.',
          },
        ],
        counter_proposals_json: [],
        correlation_id: 'CORR-NEG-105',
      },
    ]

    for (let i = 0; i < initialRecords.length; i++) {
      const recData = initialRecords[i]
      const rec = new Record(negCol)
      for (const [key, val] of Object.entries(recData)) {
        rec.set(key, val)
      }
      app.save(rec)

      // Se tiver orders_items_json, criar os registros em sap_remessas_transporte para cada cliente
      if (Array.isArray(recData.orders_items_json)) {
        const clientsMap = new Map()
        for (const item of recData.orders_items_json) {
          if (!clientsMap.has(item.customerCode)) {
            clientsMap.set(item.customerCode, {
              customerCode: item.customerCode,
              customerName: item.customerName,
              orders: [item.orderNumber],
              items: [item],
              totalWeight: item.weightKg || 0,
            })
          } else {
            const entry = clientsMap.get(item.customerCode)
            if (!entry.orders.includes(item.orderNumber)) entry.orders.push(item.orderNumber)
            entry.items.push(item)
            entry.totalWeight += item.weightKg || 0
          }
        }

        for (const [custCode, client] of clientsMap.entries()) {
          const rRec = new Record(remCol)
          rRec.set('negotiation_number', recData.negotiation_number)
          rRec.set('cargo_id', recData.cargo_id)
          rRec.set('customer_code', custCode)
          rRec.set('customer_name', client.customerName)
          rRec.set('plant_code', '1010')
          rRec.set('shipping_point', '1010')
          rRec.set('orders_numbers', client.orders.join(', '))
          rRec.set('total_items_count', client.items.length)
          rRec.set('total_weight_kg', client.totalWeight)
          rRec.set('remessa_sap_number', '')
          rRec.set('status', 'PENDENTE')
          rRec.set('sap_transport_number', '')
          rRec.set('vehicle_plate', recData.vehicle_plate || '')
          rRec.set('driver_name', recData.driver_name || '')
          rRec.set('sap_message', 'Aguardando chamada RFC Z_RFC_CRIAR_REMESSA')
          rRec.set('idempotency_key', `REM-${recData.cargo_id}-${custCode}`)
          rRec.set('items_json', client.items)
          rRec.set('correlation_id', recData.correlation_id)
          app.save(rRec)
        }
      }
    }
  },
  (app) => {
    // Reversão
    try {
      const remCol = app.findCollectionByNameOrId('sap_remessas_transporte')
      app.truncateCollection(remCol)
      const negCol = app.findCollectionByNameOrId('negociacoes')
      app.truncateCollection(negCol)
    } catch (_) {}
  },
)
