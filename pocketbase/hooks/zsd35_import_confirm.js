// Hook Skip Cloud: Processamento Assíncrono e Transacional da Importação ZSD35A
// Criação do lote, persistência transacional com rollback em caso de falha, auditoria não-bloqueante e consulta de status

routerAdd('POST', '/backend/v1/zsd35/import-confirm', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const report = body.report
    const userEmail =
      body.user_email || (e.auth ? e.auth.getString('email') : 'operador@ciafal.com.br')
    const userName =
      body.user_name || (e.auth ? e.auth.getString('name') : 'Operador Comercial CIAFAL')

    if (
      !report ||
      !report.validOrders ||
      !Array.isArray(report.validOrders) ||
      report.validOrders.length === 0
    ) {
      return e.json(400, {
        success: false,
        error: 'Nenhum registro válido enviado para importação.',
      })
    }

    const batchId =
      report.batchId ||
      'ZSD35A-' +
        new Date().toISOString().slice(0, 10).replace(/-/g, '') +
        '-' +
        $security.randomString(6).toUpperCase()
    const fileName = report.fileName || 'ZSD35 Carga TMS v3.xlsx'
    const totalRead = Number(report.totalRowsRead) || report.validOrders.length
    const validCount = Number(report.validCount) || report.validOrders.length
    const warningCount = Number(report.warningCount) || 0
    const rejectedCount = Number(report.rejectedRowsCount) || 0
    const ignoredCount = Number(report.ignoredRowsCount) || 0
    const totalWeightTon = Number(report.totalWeightTon) || 0
    const clientsCount = Number(report.uniqueClientsCount) || 0
    const materialsCount = Number(report.uniqueMaterialsCount) || 0

    const importsCol = $app.findCollectionByNameOrId('sap_imports')
    const salesCol = $app.findCollectionByNameOrId('sap_sales_orders')

    // 1. Verifica se já existe lote com este batchId para idempotência
    let existingBatch = null
    try {
      existingBatch = $app.findFirstRecordByData('sap_imports', 'batch_id', batchId)
    } catch (_) {}

    let batchRecord
    if (existingBatch) {
      batchRecord = existingBatch
      // Se já concluído, retorna com sucesso imediatamente
      const currentSt = batchRecord.getString('status')
      if (
        currentSt === 'CONCLUIDO' ||
        currentSt === 'CONCLUIDO_COM_ALERTAS' ||
        currentSt === 'concluido'
      ) {
        return e.json(200, {
          success: true,
          batch_id: batchId,
          status: currentSt,
          message: 'Lote já importado anteriormente com sucesso.',
          created_count: batchRecord.getInt('created_count'),
          updated_count: batchRecord.getInt('updated_count'),
          persisted_count: batchRecord.getInt('valid_count') || batchRecord.getInt('created_count'),
        })
      }
    } else {
      batchRecord = new Record(importsCol)
      batchRecord.set('batch_id', batchId)
      batchRecord.set('file_name', fileName)
      batchRecord.set('imported_by', userName + ' (' + userEmail + ')')
      batchRecord.set('origem_dado', 'EXCEL_QAS_ZSD35A_V3')
      batchRecord.set('template_version', 'ZSD35A_V3_27_CAMPOS')
      batchRecord.set('total_read', totalRead)
      batchRecord.set('valid_count', validCount)
      batchRecord.set('warning_count', warningCount)
      batchRecord.set('ignored_count', ignoredCount)
      batchRecord.set('rejected_count', rejectedCount)
      batchRecord.set('total_weight_ton', totalWeightTon)
      batchRecord.set('clients_count', clientsCount)
      batchRecord.set('materials_count', materialsCount)
      batchRecord.set('status', 'PROCESSANDO')
      batchRecord.set('step_current', 'Gravando registros na Carteira SAP')
      batchRecord.set('progress_pct', 10)
      batchRecord.set('rejections_log', report.rejectionsLog || [])
      batchRecord.set('summary_report', {
        uniqueOrdersCount: report.uniqueOrdersCount || 0,
        uniqueClientsCount: clientsCount,
        uniqueMaterialsCount: materialsCount,
        totalWeightTon: totalWeightTon,
        totalValue: report.totalValue || 0,
        totalFreightForecast: report.totalFreightForecast || 0,
        layoutRecognized: report.layoutRecognized !== false,
        layoutVersion: 'ZSD35A_V3_27_CAMPOS',
      })
      $app.save(batchRecord)
    }

    // 2. Persistência transacional com txApp
    let createdCount = 0
    let updatedCount = 0
    let failedDuringInsert = false
    let insertErrorMessage = ''

    try {
      $app.runInTransaction((txApp) => {
        for (let i = 0; i < report.validOrders.length; i++) {
          const order = report.validOrders[i]
          const orderNumber = String(order.order_number || '').trim()
          const itemNumber = String(order.item_number || '000010').trim()
          const technicalKey = String(
            order.technical_key || batchId + '_L' + (i + 1) + '_' + orderNumber + '_' + itemNumber,
          )

          // Busca registro existente na mesma transação por technical_key ou order_number + item_number
          let existingOrder = null
          try {
            existingOrder = txApp.findFirstRecordByData(
              'sap_sales_orders',
              'technical_key',
              technicalKey,
            )
          } catch (_) {
            try {
              const matchedList = txApp.findRecordsByFilter(
                'sap_sales_orders',
                'order_number = {:ord} && item_number = {:itm}',
                '',
                1,
                0,
                { ord: orderNumber, itm: itemNumber },
              )
              if (matchedList && matchedList.length > 0) {
                existingOrder = matchedList[0]
              }
            } catch (_) {}
          }

          const rec = existingOrder || new Record(salesCol)
          rec.set('order_number', orderNumber)
          rec.set('item_number', itemNumber)
          rec.set('technical_key', technicalKey)
          rec.set('customer_code', String(order.customer_code || 'CLI-' + orderNumber).trim())
          rec.set('customer_name', String(order.customer_name || 'Cliente ' + orderNumber).trim())
          rec.set('destination_city', String(order.destination_city || 'São Paulo').trim())
          rec.set(
            'uf',
            String(order.uf || 'SP')
              .trim()
              .toUpperCase()
              .substring(0, 2),
          )
          rec.set(
            'itinerary_code',
            String(order.itinerary_code || 'SP001A')
              .trim()
              .toUpperCase(),
          )
          rec.set(
            'route_code',
            String(order.route_code || order.itinerary_code || 'SP001A')
              .trim()
              .toUpperCase(),
          )
          rec.set(
            'material',
            String(order.material || 'MAT-' + orderNumber + '-' + itemNumber).trim(),
          )
          rec.set(
            'material_description',
            String(order.material_description || 'MATERIAL ' + orderNumber).trim(),
          )
          rec.set('weight_kg', Number(order.weight_kg) || 0)
          rec.set('total_value', Number(order.total_value) || 0)
          rec.set('production_status', order.production_status || 'Pronto')
          rec.set('credit_status', order.credit_status || 'Liberado')
          rec.set('discharge_type', order.discharge_type || 'Ponte Rolante')
          rec.set('discharges_count', Number(order.discharges_count) || 1)
          rec.set('required_vehicle_type', order.required_vehicle_type || 'Carreta / Bitrem')
          rec.set('order_date', order.order_date || new Date().toISOString().slice(0, 10))
          rec.set(
            'desired_date',
            order.desired_date || order.order_date || new Date().toISOString().slice(0, 10),
          )
          rec.set('origem_dado', 'EXCEL_QAS_ZSD35A_V3')
          rec.set('import_batch_id', batchId)
          rec.set('source_file', fileName)
          rec.set('imported_by_user', userName || userEmail)
          rec.set('imported_at', report.importedAt || new Date().toISOString())
          rec.set('template_version', 'ZSD35A_V3_27_CAMPOS')
          rec.set('company_code', order.company_code || '1000')
          rec.set('plant_code', order.plant_code || '1010')
          rec.set('supplying_plant', order.supplying_plant || '1010')
          rec.set('storage_location', order.storage_location || '0001')
          rec.set('credit_limit', Number(order.credit_limit) || 0)
          rec.set('credit_condition', String(order.credit_condition || '30 DDL'))
          rec.set('credit_reason', String(order.credit_reason || 'CRÉDITO OK'))
          rec.set('stock_situation', String(order.stockIntersectionType || 'ESTOQUE_ATUAL'))
          rec.set('stock_available', Number(order.stock_available) || 0)
          rec.set('stock_dp34', Number(order.stock_dp34) || 0)
          rec.set('stock_total', Number(order.stock_total) || 0)
          rec.set('stock_sider', Number(order.stock_sider) || 0)
          rec.set('missing_quantity', Number(order.missing_quantity) || 0)
          rec.set('pcp_status', String(order.pcp_status || order.production_status || 'Pronto'))
          rec.set('wallet_days', Number(order.walletDays) || 0)
          rec.set('delay_days', Number(order.overdueDays) || 0)
          rec.set('delivery_number', String(order.delivery_number || ''))
          rec.set('delivery_week', String(order.delivery_week || ''))
          rec.set('logistic_restrictions', String(order.logistic_restrictions || ''))
          rec.set('order_value', Number(order.total_value) || 0)
          rec.set('freight_value', Number(order.freight_value) || 0)
          rec.set('toll_forecast_value', Number(order.toll_forecast_value) || 0)
          rec.set('priority_level', String(order.priority_level || 'Normal'))
          rec.set('raw_q_dias', Number(order.raw_q_dias) || 0)
          rec.set('q_dias', Number(order.q_dias) || Number(order.walletDays) || 0)
          rec.set('order_hour', String(order.order_hour || '00:00:00'))
          rec.set('incoterms', String(order.incoterms || 'CIF'))
          rec.set('is_sidercentro', Boolean(order.is_sidercentro))
          rec.set('stock_quantity_kg', Number(order.stock_quantity_kg) || 0)
          rec.set(
            'balance_quantity_kg',
            Number(order.balance_quantity_kg) || Number(order.weight_kg) || 0,
          )
          rec.set('status', 'disponivel')

          txApp.save(rec)

          if (existingOrder) {
            updatedCount++
          } else {
            createdCount++
          }
        }
      })
    } catch (txErr) {
      failedDuringInsert = true
      insertErrorMessage = txErr
        ? txErr.message || String(txErr)
        : 'Erro desconhecido na gravação transacional'
    }

    // Se falhou na inserção transacional: Rollback ocorreu automaticamente na transaction
    if (failedDuringInsert) {
      try {
        batchRecord.set('status', 'ERRO')
        batchRecord.set('error_message', insertErrorMessage)
        batchRecord.set('step_current', 'Falha na gravação dos registros')
        $app.save(batchRecord)
      } catch (_) {}

      return e.json(500, {
        success: false,
        batch_id: batchId,
        status: 'ERRO',
        step_failed: 'PERSISTINDO',
        error: insertErrorMessage,
        message:
          'Importação não concluída: falha ao gravar registros na Carteira SAP. Nenhum registro parcial foi mantido.',
      })
    }

    // 3. Auditoria Não-Bloqueante (se falhar, não impede o sucesso dos dados gravados)
    let auditWarning = null
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('user_email', userEmail)
      auditRec.set('user_name', userName)
      auditRec.set('user_role', 'comercial')
      auditRec.set('action', 'ZSD35A_EXCEL_IMPORT')
      auditRec.set('resource', 'sap_sales_orders')
      auditRec.set('resource_id', batchId)
      auditRec.set('previous_state', 'VALIDADO')
      auditRec.set('new_state', 'CONCLUIDO')
      auditRec.set('reason', 'Carga homologada ZSD35A V3 (' + validCount + ' registros)')
      auditRec.set('correlation_id', 'ZSD35-' + batchId)
      auditRec.set('payload', {
        batchId: batchId,
        fileName: fileName,
        totalRead: totalRead,
        validCount: validCount,
        createdCount: createdCount,
        updatedCount: updatedCount,
        warningCount: warningCount,
        rejectedCount: rejectedCount,
        totalWeightTon: totalWeightTon,
        uniqueOrdersCount: report.uniqueOrdersCount || 0,
        origem_dado: 'EXCEL_QAS_ZSD35A_V3',
      })
      $app.save(auditRec)
    } catch (audErr) {
      auditWarning = audErr
        ? audErr.message || String(audErr)
        : 'Falha ao registrar auditoria secundária'
    }

    // 4. Verificação pós-gravação: confere registros persistidos
    let persistedCount = 0
    try {
      persistedCount = $app.countRecords('sap_sales_orders', 'import_batch_id = {:bid}', {
        bid: batchId,
      })
    } catch (_) {
      persistedCount = createdCount + updatedCount
    }

    // 5. Atualiza o status final do lote
    const finalStatus = warningCount > 0 ? 'CONCLUIDO_COM_ALERTAS' : 'CONCLUIDO'
    try {
      batchRecord.set('created_count', createdCount)
      batchRecord.set('updated_count', updatedCount)
      batchRecord.set('status', finalStatus)
      batchRecord.set('step_current', 'Finalizado com sucesso')
      batchRecord.set('progress_pct', 100)
      if (auditWarning) {
        batchRecord.set('error_message', 'Auditoria secundária: ' + auditWarning)
      }
      $app.save(batchRecord)
    } catch (_) {}

    return e.json(200, {
      success: true,
      batch_id: batchId,
      status: finalStatus,
      step_current: 'Finalizado com sucesso',
      created_count: createdCount,
      updated_count: updatedCount,
      persisted_count: persistedCount,
      valid_count: validCount,
      total_read: totalRead,
      unique_orders_count: report.uniqueOrdersCount || 0,
      unique_clients_count: clientsCount,
      unique_materials_count: materialsCount,
      total_weight_ton: totalWeightTon,
      audit_warning: auditWarning,
      message: auditWarning
        ? 'Importação realizada com ressalva de auditoria: registros gravados com sucesso na Carteira SAP.'
        : 'Importação ZSD35A V3 concluída com sucesso e persistida na Carteira SAP!',
    })
  } catch (globalErr) {
    return e.json(500, {
      success: false,
      error: globalErr
        ? globalErr.message || String(globalErr)
        : 'Erro interno no servidor ao processar importação',
      message: 'Falha ao importar ZSD35A.',
    })
  }
})
