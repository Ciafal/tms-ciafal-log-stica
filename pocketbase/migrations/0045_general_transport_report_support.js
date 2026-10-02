migrate(
  (app) => {
    try {
      const histCol = app.findCollectionByNameOrId('carrier_operational_history')
      let changed = false

      // 1. Campos de identificação e centro
      if (!histCol.fields.getByName('center_code')) {
        histCol.fields.add(new TextField({ name: 'center_code' }))
        changed = true
      }
      if (!histCol.fields.getByName('center_description')) {
        histCol.fields.add(new TextField({ name: 'center_description' }))
        changed = true
      }
      if (!histCol.fields.getByName('sap_user')) {
        histCol.fields.add(new TextField({ name: 'sap_user' }))
        changed = true
      }
      if (!histCol.fields.getByName('external_id_1')) {
        histCol.fields.add(new TextField({ name: 'external_id_1' }))
        changed = true
      }

      // 2. Balança e pesagens
      if (!histCol.fields.getByName('scale_reason')) {
        histCol.fields.add(new TextField({ name: 'scale_reason' }))
        changed = true
      }
      if (!histCol.fields.getByName('has_scale_log')) {
        histCol.fields.add(new BoolField({ name: 'has_scale_log' }))
        changed = true
      }
      if (!histCol.fields.getByName('gross_weight_ton')) {
        histCol.fields.add(new NumberField({ name: 'gross_weight_ton' }))
        changed = true
      }
      if (!histCol.fields.getByName('tare_weight_ton')) {
        histCol.fields.add(new NumberField({ name: 'tare_weight_ton' }))
        changed = true
      }
      if (!histCol.fields.getByName('net_weight_ton')) {
        histCol.fields.add(new NumberField({ name: 'net_weight_ton' }))
        changed = true
      }
      if (!histCol.fields.getByName('nf_weight_ton')) {
        histCol.fields.add(new NumberField({ name: 'nf_weight_ton' }))
        changed = true
      }
      if (!histCol.fields.getByName('diff_weight_ton')) {
        histCol.fields.add(new NumberField({ name: 'diff_weight_ton' }))
        changed = true
      }
      if (!histCol.fields.getByName('diff_weight_pct')) {
        histCol.fields.add(new NumberField({ name: 'diff_weight_pct' }))
        changed = true
      }

      // 3. Classificações de transporte e frete
      if (!histCol.fields.getByName('expedition_type')) {
        histCol.fields.add(new TextField({ name: 'expedition_type' }))
        changed = true
      }
      if (!histCol.fields.getByName('transport_type')) {
        histCol.fields.add(new TextField({ name: 'transport_type' }))
        changed = true
      }
      if (!histCol.fields.getByName('distance_km')) {
        histCol.fields.add(new NumberField({ name: 'distance_km' }))
        changed = true
      }
      if (!histCol.fields.getByName('freight_type')) {
        histCol.fields.add(new TextField({ name: 'freight_type' }))
        changed = true
      }
      if (!histCol.fields.getByName('sales_organization')) {
        histCol.fields.add(new TextField({ name: 'sales_organization' }))
        changed = true
      }
      if (!histCol.fields.getByName('invoicing_date')) {
        histCol.fields.add(new DateField({ name: 'invoicing_date' }))
        changed = true
      }

      // 4. Par 1 e Par 2 de datas/horas e tempos operacionais
      if (!histCol.fields.getByName('start_time_str')) {
        histCol.fields.add(new TextField({ name: 'start_time_str' }))
        changed = true
      }
      if (!histCol.fields.getByName('tare_date')) {
        histCol.fields.add(new DateField({ name: 'tare_date' }))
        changed = true
      }
      if (!histCol.fields.getByName('tare_time_str')) {
        histCol.fields.add(new TextField({ name: 'tare_time_str' }))
        changed = true
      }
      if (!histCol.fields.getByName('initial_date')) {
        histCol.fields.add(new DateField({ name: 'initial_date' }))
        changed = true
      }
      if (!histCol.fields.getByName('initial_time_str')) {
        histCol.fields.add(new TextField({ name: 'initial_time_str' }))
        changed = true
      }
      if (!histCol.fields.getByName('end_date_1')) {
        histCol.fields.add(new DateField({ name: 'end_date_1' }))
        changed = true
      }
      if (!histCol.fields.getByName('end_time_1_str')) {
        histCol.fields.add(new TextField({ name: 'end_time_1_str' }))
        changed = true
      }
      if (!histCol.fields.getByName('collection_time_min')) {
        histCol.fields.add(new NumberField({ name: 'collection_time_min' }))
        changed = true
      }
      if (!histCol.fields.getByName('end_date_2')) {
        histCol.fields.add(new DateField({ name: 'end_date_2' }))
        changed = true
      }
      if (!histCol.fields.getByName('end_time_2_str')) {
        histCol.fields.add(new TextField({ name: 'end_time_2_str' }))
        changed = true
      }
      if (!histCol.fields.getByName('total_time_min')) {
        histCol.fields.add(new NumberField({ name: 'total_time_min' }))
        changed = true
      }

      // 5. Características técnicas do veículo e carga
      if (!histCol.fields.getByName('vehicle_capacity_ton')) {
        histCol.fields.add(new NumberField({ name: 'vehicle_capacity_ton' }))
        changed = true
      }
      if (!histCol.fields.getByName('wheel_type')) {
        histCol.fields.add(new TextField({ name: 'wheel_type' }))
        changed = true
      }
      if (!histCol.fields.getByName('body_type_desc')) {
        histCol.fields.add(new TextField({ name: 'body_type_desc' }))
        changed = true
      }
      if (!histCol.fields.getByName('axles_count')) {
        histCol.fields.add(new NumberField({ name: 'axles_count' }))
        changed = true
      }
      if (!histCol.fields.getByName('occupancy_pct')) {
        histCol.fields.add(new NumberField({ name: 'occupancy_pct' }))
        changed = true
      }
      if (!histCol.fields.getByName('fractions_count')) {
        histCol.fields.add(new NumberField({ name: 'fractions_count' }))
        changed = true
      }
      if (!histCol.fields.getByName('rfid_code')) {
        histCol.fields.add(new TextField({ name: 'rfid_code' }))
        changed = true
      }

      if (changed) {
        app.save(histCol)
      }

      // Preencher campos novos nos 5 registros seed existentes para enriquecer o relatório
      try {
        const records = app.findRecordsByFilter(
          'carrier_operational_history',
          '1=1',
          '-transport_date',
          50,
          0,
        )
        records.forEach((rec) => {
          const sapNum = rec.getString('sap_transport_number')
          const plate = rec.getString('vehicle_plate')
          rec.set('external_id_1', plate)
          rec.set('center_code', 'WSTL')
          rec.set('center_description', 'CIAFAL Matriz Contagem / WSTL')
          rec.set('sap_user', 'OPER_CIAFAL')
          rec.set('sales_organization', '1000 - CIAFAL Aços')
          rec.set('expedition_type', '01 - Rodoviário Lotação')
          rec.set('transport_type', 'Rodoviário Padrão')
          rec.set('freight_type', 'CIF')

          const weightTon = rec.getFloat('weight_ton') || 25.0
          const tareTon = 14.5
          const grossTon = weightTon + tareTon
          const nfTon = weightTon
          const diffTon = 0.02
          const diffPct = (diffTon / (nfTon || 1)) * 100

          rec.set('gross_weight_ton', Number(grossTon.toFixed(3)))
          rec.set('tare_weight_ton', tareTon)
          rec.set('net_weight_ton', Number(weightTon.toFixed(3)))
          rec.set('nf_weight_ton', Number(nfTon.toFixed(3)))
          rec.set('diff_weight_ton', diffTon)
          rec.set('diff_weight_pct', Number(diffPct.toFixed(2)))
          rec.set(
            'distance_km',
            rec.getInt('route_estimated_min')
              ? Math.round(rec.getInt('route_estimated_min') * 1.1)
              : 450,
          )

          // Balança
          if (sapNum === '800102') {
            rec.set('has_scale_log', true)
            rec.set('scale_reason', 'Divergência de pesagem conferida e autorizada')
          } else if (sapNum === '800104') {
            rec.set('has_scale_log', false)
            rec.set('scale_reason', 'Aguardando pesagem saída')
          } else {
            rec.set('has_scale_log', true)
            rec.set('scale_reason', 'Pesagem regular aprovada')
          }

          // Horários e datas
          const tDate = rec.getString('transport_date') || new Date().toISOString()
          rec.set('invoicing_date', tDate)
          rec.set('start_time_str', '08:00:00')
          rec.set('tare_date', tDate)
          rec.set('tare_time_str', '08:30:00')
          rec.set('initial_date', tDate)
          rec.set('initial_time_str', '09:00:00')
          rec.set('end_date_1', tDate)
          rec.set('end_time_1_str', '11:30:00')
          rec.set('collection_time_min', rec.getInt('loading_duration_min') || 75)
          rec.set('end_date_2', tDate)
          rec.set('end_time_2_str', '12:15:00')
          rec.set('total_time_min', rec.getInt('total_internal_dwell_min') || 130)

          // Veículo e ocupação
          const capTon = rec.getString('vehicle_type').toLowerCase().includes('bitrem')
            ? 35.0
            : 28.0
          rec.set('vehicle_capacity_ton', capTon)
          rec.set('wheel_type', 'Rodado Duplo')
          rec.set('body_type_desc', rec.getString('vehicle_type'))
          rec.set(
            'axles_count',
            rec.getString('vehicle_type').toLowerCase().includes('bitrem') ? 7 : 3,
          )
          const occupPct = Math.min(100, Number(((weightTon / capTon) * 100).toFixed(2)))
          rec.set('occupancy_pct', occupPct)
          rec.set('fractions_count', rec.getInt('discharges_count') || 1)
          rec.set('rfid_code', `TAG-RFID-${sapNum || plate.replace(/[^A-Z0-9]/g, '')}`)

          app.save(rec)
        })
      } catch (err) {
        console.log('Aviso ao enriquecer registros históricos seed na 0045:', err)
      }
    } catch (err) {
      console.log('Erro na migration 0045:', err)
      throw err
    }
  },
  (app) => {
    // Reversão limpa
    try {
      const histCol = app.findCollectionByNameOrId('carrier_operational_history')
      const fieldsToRemove = [
        'center_code',
        'center_description',
        'sap_user',
        'external_id_1',
        'scale_reason',
        'has_scale_log',
        'gross_weight_ton',
        'tare_weight_ton',
        'net_weight_ton',
        'nf_weight_ton',
        'diff_weight_ton',
        'diff_weight_pct',
        'expedition_type',
        'transport_type',
        'distance_km',
        'freight_type',
        'sales_organization',
        'invoicing_date',
        'start_time_str',
        'tare_date',
        'tare_time_str',
        'initial_date',
        'initial_time_str',
        'end_date_1',
        'end_time_1_str',
        'collection_time_min',
        'end_date_2',
        'end_time_2_str',
        'total_time_min',
        'vehicle_capacity_ton',
        'wheel_type',
        'body_type_desc',
        'axles_count',
        'occupancy_pct',
        'fractions_count',
        'rfid_code',
      ]
      let changed = false
      fieldsToRemove.forEach((f) => {
        if (histCol.fields.getByName(f)) {
          histCol.fields.removeByName(f)
          changed = true
        }
      })
      if (changed) {
        app.save(histCol)
      }
    } catch (_) {}
  },
)
