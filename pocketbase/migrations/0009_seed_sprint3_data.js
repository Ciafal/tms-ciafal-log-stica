// Migration 0009: Seed initial data for Sprint 3 (Stock, PCP, ANTT Rates, Scenarios & Rich ZSD35 Orders)

migrate(
  (app) => {
    // 1. Seed ANTT Rate Table (Resolução ANTT 5.867 atualizada)
    const anttCol = app.findCollectionByNameOrId('antt_rate_tables')
    try {
      app.findFirstRecordByData('antt_rate_tables', 'table_version', '2024-V2-PORTARIA-12')
    } catch (_) {
      const rec = new Record(anttCol)
      rec.set('table_version', '2024-V2-PORTARIA-12')
      rec.set(
        'resolution_number',
        'Resolução ANTT nº 5.867/2019 atualizada pela Portaria SUROC nº 12/2024',
      )
      rec.set('effective_date_start', '2024-07-01')
      rec.set('is_active', true)
      rec.set('cargo_type', 'Geral')
      rec.set(
        'rates_json',
        JSON.stringify({
          version: '2024-V2-PORTARIA-12',
          effectiveDate: '2024-07-01',
          ratesByAxles: {
            2: { ccd: 2.85, cc: 1.45 }, // R$/km
            3: { ccd: 3.65, cc: 1.95 },
            4: { ccd: 4.4, cc: 2.4 },
            5: { ccd: 5.15, cc: 2.9 },
            6: { ccd: 5.95, cc: 3.4 },
            7: { ccd: 6.7, cc: 3.9 },
            9: { ccd: 7.95, cc: 4.6 },
          },
          fixedCostBase: 310.0,
        }),
      )
      rec.set('notes', 'Tabela Oficial ANTT Carga Geral para Siderurgia CIAFAL.')
      rec.set('source_url', 'https://www.gov.br/antt/pt-br/assuntos/cargas/tabela-de-frete')
      rec.set('registered_by', 'auditor@ciafal.logistica')
      app.save(rec)
    }

    // 2. Seed Current Stock (SAP MB52)
    const stockCol = app.findCollectionByNameOrId('sap_stock_current')
    const initialStocks = [
      {
        material_code: 'MAT-CHAPA-1020-01',
        material_description: 'Chapa Aço Carbono SAE 1020 4.75x1200x3000mm',
        plant: '1000',
        storage_location: '0001',
        batch: 'LOTE-2026-A1',
        quantity: 45.5,
        unit: 'TON',
        weight_kg: 45500,
        available_qty: 35.0,
        reserved_qty: 10.5,
        blocked_qty: 0,
        read_timestamp: new Date().toISOString(),
        source: 'SAP MB52 - RFC_READ_TABLE',
      },
      {
        material_code: 'MAT-BOBINA-02',
        material_description: 'Bobina Laminada a Frio 0.90x1200mm',
        plant: '1000',
        storage_location: '0001',
        batch: 'LOTE-2026-B4',
        quantity: 28.0,
        unit: 'TON',
        weight_kg: 28000,
        available_qty: 14.0,
        reserved_qty: 14.0,
        blocked_qty: 0,
        read_timestamp: new Date().toISOString(),
        source: 'SAP MB52 - RFC_READ_TABLE',
      },
      {
        material_code: 'MAT-PERFIL-W-03',
        material_description: 'Perfil Estrutural W 200x22.5 - Barra 12m',
        plant: '1000',
        storage_location: '0002',
        batch: 'LOTE-2026-P9',
        quantity: 18.2,
        unit: 'TON',
        weight_kg: 18200,
        available_qty: 5.2,
        reserved_qty: 13.0,
        blocked_qty: 0,
        read_timestamp: new Date().toISOString(),
        source: 'SAP MB52 - RFC_READ_TABLE',
      },
      {
        material_code: 'MAT-TUBO-IND-04',
        material_description: 'Tubo Industrial Redondo 2 Pol x 2.00mm',
        plant: '1000',
        storage_location: '0001',
        batch: 'LOTE-2026-T2',
        quantity: 12.0,
        unit: 'TON',
        weight_kg: 12000,
        available_qty: 0.001, // PocketBase number field required check treats 0 as blank
        reserved_qty: 12.0,
        blocked_qty: 0,
        read_timestamp: new Date().toISOString(),
        source: 'SAP MB52 - RFC_READ_TABLE',
      },
    ]

    initialStocks.forEach((stk) => {
      try {
        app.findFirstRecordByData('sap_stock_current', 'material_code', stk.material_code)
      } catch (_) {
        const r = new Record(stockCol)
        r.set('material_code', stk.material_code)
        r.set('material_description', stk.material_description)
        r.set('plant', stk.plant)
        r.set('storage_location', stk.storage_location)
        r.set('batch', stk.batch)
        r.set('quantity', stk.quantity)
        r.set('unit', stk.unit)
        r.set('weight_kg', stk.weight_kg)
        r.set('available_qty', stk.available_qty)
        r.set('reserved_qty', stk.reserved_qty)
        r.set('blocked_qty', stk.blocked_qty)
        r.set('read_timestamp', stk.read_timestamp)
        r.set('source', stk.source)
        app.save(r)
      }
    })

    // 3. Seed PCP Production Orders (Estoque Futuro / PCP Robotizado)
    const pcpCol = app.findCollectionByNameOrId('pcp_production_orders')
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const afterTomorrowStr = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]

    const pcpList = [
      {
        production_order_number: 'OF-2026-00441',
        material_code: 'MAT-TUBO-IND-04',
        material_description: 'Tubo Industrial Redondo 2 Pol x 2.00mm',
        line: 'Linha de Laminação 02',
        quantity_planned: 22.0,
        quantity_produced: 0,
        unit: 'TON',
        weight_kg_planned: 22000,
        scheduled_date: tomorrowStr,
        shift: 'Turno A (Manhã)',
        status: 'Programada',
        confidence_pct: 95,
        related_sales_order: '4500012893',
        notes: 'Produção programada para amanhã cedo. Liberação física às 14:00.',
      },
      {
        production_order_number: 'OF-2026-00442',
        material_code: 'MAT-BOBINA-02',
        material_description: 'Bobina Laminada a Frio 0.90x1200mm',
        line: 'Linha de Decapagem 01',
        quantity_planned: 28.0,
        quantity_produced: 10.0,
        unit: 'TON',
        weight_kg_planned: 28000,
        scheduled_date: tomorrowStr,
        shift: 'Turno B (Tarde)',
        status: 'Em Produção',
        confidence_pct: 90,
        related_sales_order: '4500012891',
        notes: 'Em andamento na linha de decapagem contínua.',
      },
      {
        production_order_number: 'OF-2026-00443',
        material_code: 'MAT-PERFIL-W-03',
        material_description: 'Perfil Estrutural W 200x22.5 - Barra 12m',
        line: 'Linha de Conformação 03',
        quantity_planned: 16.5,
        quantity_produced: 0,
        unit: 'TON',
        weight_kg_planned: 16500,
        scheduled_date: afterTomorrowStr,
        shift: 'Turno A (Manhã)',
        status: 'Programada',
        confidence_pct: 85,
        related_sales_order: '4500012894',
        notes: 'Programação prevista D+2.',
      },
    ]

    pcpList.forEach((p) => {
      try {
        app.findFirstRecordByData(
          'pcp_production_orders',
          'production_order_number',
          p.production_order_number,
        )
      } catch (_) {
        const r = new Record(pcpCol)
        r.set('production_order_number', p.production_order_number)
        r.set('material_code', p.material_code)
        r.set('material_description', p.material_description)
        r.set('line', p.line)
        r.set('quantity_planned', p.quantity_planned)
        r.set('quantity_produced', p.quantity_produced)
        r.set('unit', p.unit)
        r.set('weight_kg_planned', p.weight_kg_planned)
        r.set('scheduled_date', p.scheduled_date)
        r.set('shift', p.shift)
        r.set('status', p.status)
        r.set('confidence_pct', p.confidence_pct)
        r.set('related_sales_order', p.related_sales_order)
        r.set('notes', p.notes)
        app.save(r)
      }
    })

    // 4. Update sales orders with rich ZSD35 information (Order dates, reps, tiers, coordinates)
    try {
      const salesRecords = app.findRecordsByFilter('sap_sales_orders', '', '-created', 100, 0)

      salesRecords.forEach((orderRec, idx) => {
        const today = new Date()
        const daysAgo = 2 + idx * 3
        const orderDate = new Date(today.getTime() - daysAgo * 86400000).toISOString().split('T')[0]

        let desiredDate
        if (idx % 3 === 0) {
          desiredDate = new Date(today.getTime() - 4 * 86400000).toISOString().split('T')[0]
        } else if (idx % 3 === 1) {
          desiredDate = today.toISOString().split('T')[0]
        } else {
          desiredDate = new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0]
        }

        const tiers = ['A (Estratégico)', 'B (Corporativo)', 'C (Varejo)', 'A (Estratégico)', '']
        const reps = [
          'Carlos Eduardo (SP Central)',
          'Juliana Mendes (MG Sul)',
          'Roberto Faria (RJ Metropolitana)',
          'Marcos Silva (SP Interior)',
        ]
        const segments = [
          'Indústria Automotiva',
          'Construção Civil',
          'Estruturas Metálicas',
          'Revenda Siderúrgica',
          'Distribuição',
        ]

        orderRec.set('customer_tier', tiers[idx % tiers.length])
        orderRec.set('sales_rep', reps[idx % reps.length])
        orderRec.set('segment', segments[idx % segments.length])
        orderRec.set('order_date', orderDate)
        orderRec.set('desired_date', desiredDate)
        orderRec.set('item_number', '000010')
        orderRec.set(
          'material_description',
          orderRec.getString('material') || 'Aço Laminado CIAFAL',
        )
        orderRec.set('unit', 'TON')
        orderRec.set('balance_quantity', (orderRec.getInt('weight_kg') || 10000) / 1000)

        const city = orderRec.getString('destination_city') || 'São Paulo'
        const uf = orderRec.getString('uf') || 'SP'
        orderRec.set('street_address', 'Av. Industrial, 100, Distrito Industrial')
        orderRec.set('postal_code', '01000-000')

        if (city.toLowerCase().includes('belo horizonte') || uf === 'MG') {
          orderRec.set('dest_latitude', -19.9167 + idx * 0.01)
          orderRec.set('dest_longitude', -43.9345 + idx * 0.01)
          orderRec.set('address_validated', true)
        } else if (
          city.toLowerCase().includes('campinas') ||
          city.toLowerCase().includes('são paulo') ||
          uf === 'SP'
        ) {
          orderRec.set('dest_latitude', -22.9056 + idx * 0.01)
          orderRec.set('dest_longitude', -47.0608 + idx * 0.01)
          orderRec.set('address_validated', true)
        } else if (city.toLowerCase().includes('rio') || uf === 'RJ') {
          orderRec.set('dest_latitude', -22.9068 + idx * 0.01)
          orderRec.set('dest_longitude', -43.1729 + idx * 0.01)
          orderRec.set('address_validated', true)
        } else {
          orderRec.set('address_validated', false)
        }

        app.save(orderRec)
      })
    } catch (_) {}
  },
  (app) => {
    // down logic
  },
)
