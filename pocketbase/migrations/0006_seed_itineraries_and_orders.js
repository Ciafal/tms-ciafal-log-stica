migrate(
  (app) => {
    // Seed System Parameters for cutoff time and geofences
    const sysParams = app.findCollectionByNameOrId('system_parameters')

    const defaultParams = [
      {
        key: 'CUTOFF_TIME_FORA',
        value: '12:00',
        description:
          'Horário de corte para Fila FORA (Até o horário = mesmo dia; após = dia seguinte)',
      },
      {
        key: 'GEOFENCE_RADIUS_PORTA_METERS',
        value: '500',
        description: 'Raio máximo em metros para presença física na planta CIAFAL (PORTA)',
      },
      {
        key: 'GEOFENCE_RADIUS_FORA_KM',
        value: '60',
        description: 'Raio operacional em km para disponibilidade próxima (FORA)',
      },
    ]

    for (const p of defaultParams) {
      try {
        app.findFirstRecordByData('system_parameters', 'key', p.key)
      } catch (_) {
        const rec = new Record(sysParams)
        rec.set('key', p.key)
        rec.set('value', p.value)
        rec.set('description', p.description)
        app.save(rec)
      }
    }

    // Seed SAP Itineraries (TVROT)
    const itinCol = app.findCollectionByNameOrId('sap_itineraries')
    const defaultItineraries = [
      {
        sap_code: 'MG001A',
        description: 'Grande BH / Contagem / Betim',
        uf: 'MG',
        region: 'Metropolitana BH',
        avg_transit_days: 1,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      {
        sap_code: 'MG002B',
        description: 'Triângulo Mineiro (Uberlândia / Uberaba)',
        uf: 'MG',
        region: 'Triângulo',
        avg_transit_days: 2,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      {
        sap_code: 'MG003C',
        description: 'Sul de Minas (Pouso Alegre / Varginha)',
        uf: 'MG',
        region: 'Sul de Minas',
        avg_transit_days: 1,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      {
        sap_code: 'MG004D',
        description: 'Zona da Mata / Juiz de Fora',
        uf: 'MG',
        region: 'Zona da Mata',
        avg_transit_days: 2,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      {
        sap_code: 'MG005E',
        description: 'Vale do Aço / Ipatinga / Gov. Valadares',
        uf: 'MG',
        region: 'Leste de Minas',
        avg_transit_days: 2,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      {
        sap_code: 'SP001A',
        description: 'Grande São Paulo / ABCD / Capital',
        uf: 'SP',
        region: 'Grande SP',
        avg_transit_days: 2,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      {
        sap_code: 'SP002B',
        description: 'Interior SP (Campinas / Sorocaba / Ribeirão)',
        uf: 'SP',
        region: 'Interior SP',
        avg_transit_days: 2,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      {
        sap_code: 'RJ001A',
        description: 'Rio de Janeiro / Grande Rio / Baixada',
        uf: 'RJ',
        region: 'Metropolitana RJ',
        avg_transit_days: 2,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      {
        sap_code: 'ES001A',
        description: 'Vitória / Serra / Linhares / Vila Velha',
        uf: 'ES',
        region: 'Espírito Santo',
        avg_transit_days: 3,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      {
        sap_code: 'GO001A',
        description: 'Goiânia / Anápolis / Brasília DF',
        uf: 'GO',
        region: 'Centro-Oeste',
        avg_transit_days: 3,
        is_active: true,
        origin: 'SAP_TVROT',
      },
    ]

    for (const it of defaultItineraries) {
      try {
        app.findFirstRecordByData('sap_itineraries', 'sap_code', it.sap_code)
      } catch (_) {
        const rec = new Record(itinCol)
        rec.set('sap_code', it.sap_code)
        rec.set('description', it.description)
        rec.set('uf', it.uf)
        rec.set('region', it.region)
        rec.set('avg_transit_days', it.avg_transit_days)
        rec.set('is_active', it.is_active)
        rec.set('origin', it.origin)
        rec.set('last_sync_date', new Date().toISOString())
        app.save(rec)
      }
    }

    // Seed SAP Sales Orders (ZSD35 / Carteira)
    const ordersCol = app.findCollectionByNameOrId('sap_sales_orders')
    const sampleOrders = [
      {
        order_number: '45009101',
        customer_code: 'CLI-9001',
        customer_name: 'Construtora Andrade & Silva Ltda',
        destination_city: 'Belo Horizonte',
        uf: 'MG',
        itinerary_code: 'MG001A',
        weight_kg: 14500,
        volume_m3: 18.5,
        total_value: 125000,
        line: 'Perfis e Vigas',
        family: 'Vigas W',
        material: 'Viga W 250x32,7',
        production_status: 'Pronto',
        credit_status: 'Liberado',
        discharge_type: 'Ponte Rolante',
        required_vehicle_type: 'Carreta Grade Baixa',
        sap_notes:
          'Descarga somente com agendamento prévio das 08h às 15h. Exige cinta de amarração.',
        status: 'disponivel',
      },
      {
        order_number: '45009102',
        customer_code: 'CLI-9002',
        customer_name: 'Aço Forte Estruturas Metálicas',
        destination_city: 'Contagem',
        uf: 'MG',
        itinerary_code: 'MG001A',
        weight_kg: 9000,
        volume_m3: 12.0,
        total_value: 84000,
        line: 'Tubos Estruturais',
        family: 'Tubo Retangular',
        material: 'Tubo Ret. 150x100x4,75',
        production_status: 'Pronto',
        credit_status: 'Liberado',
        discharge_type: 'Ponte Rolante',
        required_vehicle_type: 'Carreta Grade Baixa',
        sap_notes: 'Horário de recebimento até 16h.',
        status: 'disponivel',
      },
      {
        order_number: '45009103',
        customer_code: 'CLI-9003',
        customer_name: 'Minas Aço Distribuidora',
        destination_city: 'Betim',
        uf: 'MG',
        itinerary_code: 'MG001A',
        weight_kg: 4500,
        volume_m3: 6.0,
        total_value: 41000,
        line: 'Chapas e Perfis',
        family: 'Chapas Grossas',
        material: 'Chapa ASTM A36 12,5mm',
        production_status: 'Pronto',
        credit_status: 'Liberado',
        discharge_type: 'Munck',
        required_vehicle_type: 'Carreta Grade Baixa',
        sap_notes: 'Complemento compatível com rota Grande BH.',
        status: 'disponivel',
      },
      {
        order_number: '45009104',
        customer_code: 'CLI-9004',
        customer_name: 'Triângulo Estruturas de Aço',
        destination_city: 'Uberlândia',
        uf: 'MG',
        itinerary_code: 'MG002B',
        weight_kg: 26000,
        volume_m3: 32.0,
        total_value: 245000,
        line: 'Perfis e Vigas',
        family: 'Vigas HP',
        material: 'Viga HP 310x79',
        production_status: 'Pronto',
        credit_status: 'Liberado',
        discharge_type: 'Ponte Rolante',
        required_vehicle_type: 'Carreta LS',
        sap_notes: 'Exige lona preta e protetores de canto.',
        status: 'disponivel',
      },
      {
        order_number: '45009105',
        customer_code: 'CLI-9005',
        customer_name: 'Paulista Metalúrgica SA',
        destination_city: 'Campinas',
        uf: 'SP',
        itinerary_code: 'SP002B',
        weight_kg: 18000,
        volume_m3: 22.0,
        total_value: 172000,
        line: 'Perfis Especiais',
        family: 'Cantoneiras',
        material: 'Cantoneira 4x3/8',
        production_status: 'Em Produção',
        credit_status: 'Liberado',
        discharge_type: 'Empilhadeira',
        required_vehicle_type: 'Carreta LS',
        sap_notes: 'Liberação do PCP prevista para amanhã 06:00.',
        status: 'disponivel',
      },
      {
        order_number: '45009106',
        customer_code: 'CLI-9006',
        customer_name: 'Rio Obras & Infraestrutura',
        destination_city: 'Duque de Caxias',
        uf: 'RJ',
        itinerary_code: 'RJ001A',
        weight_kg: 22000,
        volume_m3: 28.0,
        total_value: 198000,
        line: 'Perfis e Vigas',
        family: 'Vigas I',
        material: 'Viga I 200x26,2',
        production_status: 'Pronto',
        credit_status: 'Bloqueado',
        discharge_type: 'Ponte Rolante',
        required_vehicle_type: 'Carreta LS',
        sap_notes: 'Crédito bloqueado no SAP (limite de crédito excedido no financeiro).',
        status: 'disponivel',
      },
    ]

    for (const ord of sampleOrders) {
      try {
        app.findFirstRecordByData('sap_sales_orders', 'order_number', ord.order_number)
      } catch (_) {
        const rec = new Record(ordersCol)
        rec.set('order_number', ord.order_number)
        rec.set('customer_code', ord.customer_code)
        rec.set('customer_name', ord.customer_name)
        rec.set('destination_city', ord.destination_city)
        rec.set('uf', ord.uf)
        rec.set('itinerary_code', ord.itinerary_code)
        rec.set('weight_kg', ord.weight_kg)
        rec.set('volume_m3', ord.volume_m3)
        rec.set('total_value', ord.total_value)
        rec.set('line', ord.line)
        rec.set('family', ord.family)
        rec.set('material', ord.material)
        rec.set('production_status', ord.production_status)
        rec.set('credit_status', ord.credit_status)
        rec.set('discharge_type', ord.discharge_type)
        rec.set('required_vehicle_type', ord.required_vehicle_type)
        rec.set('sap_notes', ord.sap_notes)
        rec.set('status', ord.status)
        app.save(rec)
      }
    }

    // Seed sample Oportunidade de Complemento
    const oppCol = app.findCollectionByNameOrId('oportunidade_complemento_carga')
    try {
      app.findFirstRecordByData('oportunidade_complemento_carga', 'cargo_code', 'CARGA-MG001-01')
    } catch (_) {
      const rec = new Record(oppCol)
      rec.set('date', new Date().toISOString().split('T')[0])
      rec.set('cargo_code', 'CARGA-MG001-01')
      rec.set('itinerary_code', 'MG001A')
      rec.set('current_weight_kg', 23500)
      rec.set('capacity_kg', 28000)
      rec.set('balance_kg', 4500)
      rec.set('candidate_orders', JSON.stringify(['45009103']))
      rec.set('candidate_clients', JSON.stringify(['Minas Aço Distribuidora']))
      rec.set('status', 'Nova')
      rec.set('responsible', 'Gerente de Carga')
      rec.set('origin', 'Planejador TMS CIAFAL')
      rec.set('enviado_crm', false)
      rec.set('correlation_id', 'COMPL-202505-001')
      rec.set('notes', 'Saldo residual de 4,5t para Grande BH compatível com pedido 45009103.')
      app.save(rec)
    }
  },
  (app) => {
    // down logic
  },
)
