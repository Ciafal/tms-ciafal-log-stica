// Hook Skip Cloud: Consulta de Status de Lote ZSD35A
routerAdd('GET', '/backend/v1/zsd35/batch-status/{batchId}', (e) => {
  try {
    const batchId = e.requestInfo().pathParams.batchId
    if (!batchId) {
      return e.json(400, { success: false, error: 'batchId não informado' })
    }

    let batchRecord = null
    try {
      batchRecord = $app.findFirstRecordByData('sap_imports', 'batch_id', batchId)
    } catch (_) {
      try {
        batchRecord = $app.findFirstRecordByData('sap_imports', 'id', batchId)
      } catch (_) {}
    }

    if (!batchRecord) {
      return e.json(404, { success: false, error: 'Lote não encontrado' })
    }

    let persistedCount = 0
    try {
      persistedCount = $app.countRecords('sap_sales_orders', 'import_batch_id = {:bid}', {
        bid: batchRecord.getString('batch_id') || batchId,
      })
    } catch (_) {}

    return e.json(200, {
      success: true,
      batch_id: batchRecord.getString('batch_id') || batchId,
      status: batchRecord.getString('status') || 'CONCLUIDO',
      step_current: batchRecord.getString('step_current') || 'Concluído',
      progress_pct: batchRecord.getInt('progress_pct') || 100,
      file_name: batchRecord.getString('file_name'),
      imported_by: batchRecord.getString('imported_by'),
      created_at: batchRecord.getString('created'),
      total_read: batchRecord.getInt('total_read'),
      valid_count: batchRecord.getInt('valid_count'),
      warning_count: batchRecord.getInt('warning_count'),
      created_count: batchRecord.getInt('created_count'),
      updated_count: batchRecord.getInt('updated_count'),
      persisted_count: persistedCount || batchRecord.getInt('valid_count'),
      clients_count: batchRecord.getInt('clients_count'),
      materials_count: batchRecord.getInt('materials_count'),
      total_weight_ton: batchRecord.getFloat('total_weight_ton'),
      error_message: batchRecord.getString('error_message'),
      summary_report: batchRecord.get('summary_report'),
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: err ? err.message || String(err) : 'Erro ao consultar status do lote',
    })
  }
})
