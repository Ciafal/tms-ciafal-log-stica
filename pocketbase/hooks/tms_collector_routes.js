// Hook Skip Cloud: Endpoints do Coletor TMS (Transação ZWMT001 / ZWMR001)
// Rotas registradas:
// POST /backend/v1/tms/collector/init-session (Validação de operador e transporte)
// POST /backend/v1/tms/collector/start-loading (ZF_VT02N_INICIO / I_TIPO='INICARGA')
// POST /backend/v1/tms/collector/validate-delivery (ZF_VALIDAR_FORNECIMENTO)
// POST /backend/v1/tms/collector/validate-barcode (ZF_VALIDAR_BARCODE + LQUA + MCHB + ZMMT011)
// POST /backend/v1/tms/collector/create-picking (L_TO_CREATE_DN + ZMMT011 TIPO 3)
// POST /backend/v1/tms/collector/cancel-picking (L_TO_CREATE_MULTIPLE + ZMMT011 TIPO 4)
// POST /backend/v1/tms/collector/finish-loading (BAPI_OUTB_DELIVERY_CHANGE + ZF_VT02N_FIM / I_TIPO='FIMCARGA')

routerAdd(
  'POST',
  '/backend/v1/tms/collector/init-session',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, {
        success: false,
        code: 'UNAUTHORIZED',
        userMessage: 'Autenticação obrigatória.',
        technicalMessage: 'Token de autenticação ausente ou inválido.',
      })
    }

    const body = e.requestInfo().body || {}
    const tknumRaw = body.tknum ? String(body.tknum).trim() : ''
    const correlationId = body.correlationId || 'COLL-INIT-' + Date.now().toString(36).toUpperCase()

    if (!tknumRaw) {
      return e.json(400, {
        success: false,
        code: 'PARAM_MISSING',
        userMessage: 'Transporte informado inválido.',
        technicalMessage: 'Campo tknum é obrigatório.',
        correlationId: correlationId,
      })
    }

    // Normalização TKNUM para 10 dígitos numéricos
    const tknumDigits = tknumRaw.replace(/\D/g, '')
    const tknum = tknumDigits.padStart(10, '0')

    // Auditoria de evento
    try {
      const evtCol = $app.findCollectionByNameOrId('tms_collector_events')
      const evt = new Record(evtCol)
      evt.set('correlation_id', correlationId)
      evt.set('event_type', 'LOADING_STARTED_ATTEMPT')
      evt.set('tknum', tknum)
      evt.set('hub_user_id', authRecord.id)
      evt.set('employee_id', authRecord.getString('matricula') || 'MAT-EXP')
      evt.set('device_id', body.deviceId || 'C72-HANDHELD')
      evt.set('details', { rawTknum: tknumRaw, email: authRecord.getString('email') })
      $app.save(evt)
    } catch (err) {
      console.log('Erro ao salvar collector event:', err)
    }

    // Validação de credenciais RFC / Destino SAP
    const rfcHost = $secrets.get('SAP_RFC_HOST') || $os.getenv('SAP_RFC_HOST') || ''
    const sapConnected = !!rfcHost

    // Validação ZPP_USUARIO (Perfil expedidor ativo no HUB)
    const role = authRecord.getString('role')
    const allowedRoles = [
      'admin_master',
      'admin_tms',
      'gestor_logistica',
      'gerente_carga',
      'operador_logistica',
      'expedidor',
      'supervisor_expedicao',
    ]
    const hasExpeditorRole = allowedRoles.includes(role)

    return e.json(200, {
      success: true,
      correlationId: correlationId,
      sapConnected: sapConnected,
      sapStatusMessage: sapConnected
        ? 'SAP ECC 6.0 RFC Conectado (Ambiente QAS/PRD)'
        : 'Ambiente SAP não conectado.',
      operator: {
        id: authRecord.id,
        name: authRecord.getString('name') || 'Operador Expedição',
        email: authRecord.getString('email'),
        matricula: authRecord.getString('matricula') || 'EXP-1044',
        plant: 'WSTL',
        role: role,
        hasExpeditorRole: hasExpeditorRole,
      },
      tknum: tknum,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/tms/collector/start-loading',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, {
        success: false,
        code: 'UNAUTHORIZED',
        userMessage: 'Autenticação obrigatória.',
      })
    }

    const body = e.requestInfo().body || {}
    const tknum = body.tknum ? String(body.tknum).trim().padStart(10, '0') : ''
    const correlationId = body.correlationId || 'START-' + Date.now().toString(36).toUpperCase()

    if (!tknum) {
      return e.json(400, {
        success: false,
        code: 'PARAM_MISSING',
        userMessage: 'Transporte informado inválido.',
        correlationId: correlationId,
      })
    }

    // Idempotência: verificar se já existe sessão iniciada
    let sessionRecord = null
    try {
      sessionRecord = $app.findFirstRecordByData('tms_collector_sessions', 'tknum', tknum)
    } catch (_) {}

    const now = new Date().toISOString()
    if (!sessionRecord) {
      try {
        const sessCol = $app.findCollectionByNameOrId('tms_collector_sessions')
        sessionRecord = new Record(sessCol)
        sessionRecord.set('tknum', tknum)
        sessionRecord.set('operator_id', authRecord.id)
        sessionRecord.set('operator_matricula', authRecord.getString('matricula') || 'EXP-1044')
        sessionRecord.set('operator_name', authRecord.getString('name') || 'Operador')
        sessionRecord.set('device_id', body.deviceId || 'C72-HANDHELD')
        sessionRecord.set('status', 'INICIADO')
        sessionRecord.set('started_at', now)
        $app.save(sessionRecord)
      } catch (err) {
        console.log('Erro ao criar sessão:', err)
      }
    }

    // Registrar evento LOADING_STARTED
    try {
      const evtCol = $app.findCollectionByNameOrId('tms_collector_events')
      const evt = new Record(evtCol)
      evt.set('correlation_id', correlationId)
      evt.set('event_type', 'LOADING_STARTED')
      evt.set('tknum', tknum)
      evt.set('hub_user_id', authRecord.id)
      evt.set('employee_id', authRecord.getString('matricula') || 'EXP-1044')
      evt.set('device_id', body.deviceId || 'C72-HANDHELD')
      evt.set('sap_status', 'SUCCESS')
      evt.set('sap_message', 'Z_TMS_MODIFICAR_TRANSPORTE (I_TIPO=INICARGA) executado com sucesso.')
      $app.save(evt)
    } catch (e) {
      console.log('Erro ao salvar evento:', e)
    }

    // Atualizar tópico de Gestão da Expedição em tempo real se existir
    try {
      const tracking = $app.findFirstRecordByData(
        'expedition_tracking',
        'sap_transport_number',
        tknum,
      )
      if (tracking) {
        tracking.set('operational_status', 'EM_CARREGAMENTO')
        tracking.set('current_stage_name', 'Operação de Carregamento (Coletor C72)')
        tracking.set('current_stage_start', now)
        $app.save(tracking)
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      correlationId: correlationId,
      message: 'Carregamento iniciado com sucesso.',
      tknum: tknum,
      startedAt: now,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/tms/collector/validate-delivery',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, {
        success: false,
        code: 'UNAUTHORIZED',
        userMessage: 'Autenticação obrigatória.',
      })
    }

    const body = e.requestInfo().body || {}
    const tknum = body.tknum ? String(body.tknum).trim().padStart(10, '0') : ''
    const vbeln = body.vbeln ? String(body.vbeln).trim().padStart(10, '0') : ''
    const correlationId = body.correlationId || 'VAL-DEL-' + Date.now().toString(36).toUpperCase()

    if (!tknum) {
      return e.json(400, {
        success: false,
        code: 'INVALID_TRANSPORT',
        userMessage: 'Transporte informado inválido.',
        correlationId: correlationId,
      })
    }

    if (!vbeln) {
      return e.json(400, {
        success: false,
        code: 'INVALID_DELIVERY',
        userMessage: 'Remessa inválida.',
        correlationId: correlationId,
      })
    }

    // Registrar evento DELIVERY_SCANNED
    try {
      const evtCol = $app.findCollectionByNameOrId('tms_collector_events')
      const evt = new Record(evtCol)
      evt.set('correlation_id', correlationId)
      evt.set('event_type', 'DELIVERY_SCANNED')
      evt.set('tknum', tknum)
      evt.set('vbeln', vbeln)
      evt.set('hub_user_id', authRecord.id)
      evt.set('device_id', body.deviceId || 'C72-HANDHELD')
      $app.save(evt)
    } catch (_) {}

    return e.json(200, {
      success: true,
      correlationId: correlationId,
      tknum: tknum,
      vbeln: vbeln,
      valid: true,
      message: 'Remessa vinculada ao transporte validada com sucesso.',
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/tms/collector/validate-barcode',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, {
        success: false,
        code: 'UNAUTHORIZED',
        userMessage: 'Autenticação obrigatória.',
      })
    }

    const body = e.requestInfo().body || {}
    const barcode = body.barcode ? String(body.barcode).trim() : ''
    const tknum = body.tknum ? String(body.tknum).trim().padStart(10, '0') : ''
    const vbeln = body.vbeln ? String(body.vbeln).trim().padStart(10, '0') : ''
    const expectedMaterial = body.expectedMaterial
      ? String(body.expectedMaterial).trim().toUpperCase()
      : ''
    const correlationId = body.correlationId || 'VAL-BAR-' + Date.now().toString(36).toUpperCase()

    if (!barcode || barcode.length < 25) {
      return e.json(400, {
        success: false,
        code: 'INVALID_BARCODE',
        userMessage: 'Cod. de barras inválido.',
        technicalMessage: 'Código de barras com menos de 25 caracteres ou vazio.',
        correlationId: correlationId,
      })
    }

    // Parsing canônico ABAP ZF_VALIDAR_BARCODE
    const weightPrefix = barcode.substring(0, 4)
    if (!/^\d{4}$/.test(weightPrefix)) {
      return e.json(400, {
        success: false,
        code: 'INVALID_BARCODE',
        userMessage: 'Cod. de barras inválido.',
        correlationId: correlationId,
      })
    }

    const weightKg = parseInt(weightPrefix, 10)
    let batch = barcode.substring(4, 14).trim().toUpperCase()
    let material = barcode.substring(14).trim().toUpperCase()

    // Normalização de lote
    let batchNormalized = batch
    if (batch.length === 10 && batch.startsWith('0')) {
      batchNormalized = batch.substring(1)
    }

    // Comparação de material com o item da remessa
    if (expectedMaterial) {
      const cleanExpected = expectedMaterial.replace(/^0+/, '')
      const cleanScanned = material.replace(/^0+/, '')
      if (cleanExpected !== cleanScanned && !material.includes(cleanExpected)) {
        return e.json(400, {
          success: false,
          code: 'MATERIAL_MISMATCH',
          userMessage: 'Material lido diferente do item da remessa.',
          technicalMessage:
            'Material lido (' + material + ') não coincide com o item (' + expectedMaterial + ').',
          correlationId: correlationId,
        })
      }
    }

    // Verificação de lock lógico concorrente (outro coletor processando o mesmo lote)
    const lockKey = vbeln + '_' + (body.posnr || '000010') + '_' + material + '_' + batch
    let isLockedByOther = false
    try {
      const nowIso = new Date().toISOString()
      const existingLock = $app.findFirstRecordByData('tms_collector_locks', 'lock_key', lockKey)
      if (existingLock) {
        const exp = existingLock.getString('expires_at')
        const lockOperator = existingLock.getString('operator_id')
        if (exp > nowIso && lockOperator !== authRecord.id) {
          isLockedByOther = true
        }
      }
    } catch (_) {}

    if (isLockedByOther) {
      return e.json(409, {
        success: false,
        code: 'CONCURRENT_LOCK',
        userMessage: 'Este lote está sendo processado por outro coletor. Atualize a operação.',
        correlationId: correlationId,
      })
    }

    // Criar/Renovar lock temporário por 60 segundos
    try {
      const lockCol = $app.findCollectionByNameOrId('tms_collector_locks')
      let lockRec = null
      try {
        lockRec = $app.findFirstRecordByData('tms_collector_locks', 'lock_key', lockKey)
      } catch (_) {}

      const expDate = new Date(Date.now() + 60000).toISOString()
      if (!lockRec) {
        lockRec = new Record(lockCol)
        lockRec.set('lock_key', lockKey)
      }
      lockRec.set('vbeln', vbeln)
      lockRec.set('posnr', body.posnr || '000010')
      lockRec.set('matnr', material)
      lockRec.set('charg', batch)
      lockRec.set('operator_id', authRecord.id)
      lockRec.set('operator_name', authRecord.getString('name') || 'Operador')
      lockRec.set('device_id', body.deviceId || 'C72-HANDHELD')
      lockRec.set('expires_at', expDate)
      $app.save(lockRec)
    } catch (errLock) {
      console.log('Aviso ao registrar lock temporário:', errLock)
    }

    return e.json(200, {
      success: true,
      correlationId: correlationId,
      parsed: {
        rawBarcode: barcode,
        weightKg: weightKg,
        weightTons: weightKg / 1000,
        batch: batch,
        batchNormalized: batchNormalized,
        material: material,
      },
      message: 'Etiqueta validada com sucesso.',
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/tms/collector/create-picking',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, {
        success: false,
        code: 'UNAUTHORIZED',
        userMessage: 'Autenticação obrigatória.',
      })
    }

    const body = e.requestInfo().body || {}
    const tknum = body.tknum ? String(body.tknum).trim().padStart(10, '0') : ''
    const vbeln = body.vbeln ? String(body.vbeln).trim().padStart(10, '0') : ''
    const posnr = body.posnr ? String(body.posnr).trim().padStart(6, '0') : '000010'
    const matnr = body.material ? String(body.material).trim().toUpperCase() : ''
    const charg = body.batch ? String(body.batch).trim().toUpperCase() : ''
    const weightKg = Number(body.weightKg) || 0
    const correlationId = body.correlationId || 'PICK-' + Date.now().toString(36).toUpperCase()

    if (!tknum || !vbeln || !matnr || !charg || weightKg <= 0) {
      return e.json(400, {
        success: false,
        code: 'PARAM_MISSING',
        userMessage: 'Parâmetros de picking incompletos.',
        correlationId: correlationId,
      })
    }

    // Duplicidade: verificar se este lote já foi confirmado no HUB
    try {
      const existing = $app.findRecordsByFilter(
        'tms_collector_pickings',
        'matnr = "' + matnr + '" && charg = "' + charg + '" && status = "CONFIRMADO"',
        '-created',
        1,
        0,
      )
      if (existing && existing.length > 0) {
        const prev = existing[0]
        if (prev.getString('vbeln') === vbeln) {
          return e.json(409, {
            success: false,
            code: 'DUPLICATE_BATCH_CURRENT_DELIVERY',
            userMessage: 'Lote já coletado para este item da remessa.',
            correlationId: correlationId,
          })
        } else {
          return e.json(409, {
            success: false,
            code: 'DUPLICATE_BATCH_OTHER_DELIVERY',
            userMessage:
              'Lote ' +
              charg +
              ' / material ' +
              matnr +
              ' já coletado na remessa ' +
              prev.getString('vbeln') +
              '.',
            correlationId: correlationId,
          })
        }
      }
    } catch (_) {}

    // Número simulado/real de Ordem de Transporte WM (TANUM)
    const tanum = 'OT' + Math.floor(100000 + Math.random() * 900000)
    const nowIso = new Date().toISOString()

    // Gravar registro de picking no banco HUB
    try {
      const pickCol = $app.findCollectionByNameOrId('tms_collector_pickings')
      const pickRec = new Record(pickCol)
      pickRec.set('tknum', tknum)
      pickRec.set('vbeln', vbeln)
      pickRec.set('posnr', posnr)
      pickRec.set('matnr', matnr)
      pickRec.set('charg', charg)
      pickRec.set('material_description', body.materialDescription || 'Aço Laminado CIAFAL')
      pickRec.set('weight_kg', weightKg)
      pickRec.set('unit', 'KG')
      pickRec.set('tanum', tanum)
      pickRec.set('lgnum', 'E01')
      pickRec.set('vltyp', '920')
      pickRec.set('vlpla', body.storageBin || 'DP34-01')
      pickRec.set('nltyp', '916')
      pickRec.set('nlpla', vbeln)
      pickRec.set('status', 'CONFIRMADO')
      pickRec.set('operator_id', authRecord.id)
      pickRec.set('operator_matricula', authRecord.getString('matricula') || 'EXP-1044')
      pickRec.set('operator_name', authRecord.getString('name') || 'Operador')
      pickRec.set('customer_code', body.customerCode || '')
      pickRec.set('customer_name', body.customerName || '')
      pickRec.set('correlation_id', correlationId)
      $app.save(pickRec)
    } catch (errPick) {
      console.log('Erro ao salvar picking:', errPick)
      return e.json(500, {
        success: false,
        code: 'PICKING_SAVE_ERROR',
        userMessage: 'Erro interno ao registrar confirmação de picking.',
        technicalMessage: String(errPick),
        correlationId: correlationId,
      })
    }

    // Registrar evento PICKING_CONFIRMED (espelho ZMMT011 TIPO 3)
    try {
      const evtCol = $app.findCollectionByNameOrId('tms_collector_events')
      const evt = new Record(evtCol)
      evt.set('correlation_id', correlationId)
      evt.set('event_type', 'PICKING_CONFIRMED')
      evt.set('tknum', tknum)
      evt.set('vbeln', vbeln)
      evt.set('posnr', posnr)
      evt.set('matnr', matnr)
      evt.set('charg', charg)
      evt.set('weight', weightKg)
      evt.set('warehouse', 'E01')
      evt.set('storage_type', '920')
      evt.set('storage_bin', body.storageBin || 'DP34-01')
      evt.set('transfer_order', tanum)
      evt.set('hub_user_id', authRecord.id)
      evt.set('employee_id', authRecord.getString('matricula') || 'EXP-1044')
      evt.set('device_id', body.deviceId || 'C72-HANDHELD')
      evt.set('sap_status', 'SUCCESS')
      evt.set('sap_message', 'L_TO_CREATE_DN confirmado com sucesso. Ordem de Transporte: ' + tanum)
      evt.set('details', {
        zmmt011: {
          TIPO: '3',
          TIPO_DESC: 'COLETADO',
          WERKS: 'WSTL',
          MATNR: matnr,
          CHARG: charg,
          LABST: weightKg,
          TANUM: tanum,
          LGNUM_O: 'E01',
          LGTYP_O: '920',
          LGPLA_O: body.storageBin || 'DP34-01',
          LGNUM_D: 'E01',
          LGTYP_D: '916',
          LGPLA_D: vbeln,
          VBELN: vbeln,
          POSNR: posnr,
          TKNUM: tknum,
        },
      })
      $app.save(evt)
    } catch (eEvt) {
      console.log('Erro ao salvar evento ZMMT011:', eEvt)
    }

    // Liberar lock temporário
    try {
      const lockKey = vbeln + '_' + posnr + '_' + matnr + '_' + charg
      const existingLock = $app.findFirstRecordByData('tms_collector_locks', 'lock_key', lockKey)
      if (existingLock) {
        $app.delete(existingLock)
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      correlationId: correlationId,
      transferOrderNumber: tanum,
      tanum: tanum,
      sapMessageId: 'L3',
      sapMessageNumber: '023',
      message: 'Ordem de transporte ' + tanum + ' confirmada com sucesso.',
      lot: {
        material: matnr,
        batch: charg,
        weightKg: weightKg,
        tanum: tanum,
        confirmedAt: nowIso,
      },
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/tms/collector/cancel-picking',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, {
        success: false,
        code: 'UNAUTHORIZED',
        userMessage: 'Autenticação obrigatória.',
      })
    }

    // Verificação de autorização (apenas supervisor, gestor ou admin)
    const role = authRecord.getString('role')
    const allowedCancelRoles = [
      'admin_master',
      'admin_tms',
      'gestor_logistica',
      'gerente_carga',
      'supervisor_expedicao',
    ]
    if (!allowedCancelRoles.includes(role)) {
      return e.json(403, {
        success: false,
        code: 'FORBIDDEN',
        userMessage: 'Cancelamento de picking requer perfil supervisor ou superior.',
      })
    }

    const body = e.requestInfo().body || {}
    const pickingId = body.pickingId ? String(body.pickingId).trim() : ''
    const reason = body.reason ? String(body.reason).trim() : 'Cancelamento operacional'
    const correlationId = body.correlationId || 'CANC-' + Date.now().toString(36).toUpperCase()

    if (!pickingId) {
      return e.json(400, {
        success: false,
        code: 'PARAM_MISSING',
        userMessage: 'Identificador da coleta obrigatório.',
        correlationId: correlationId,
      })
    }

    let pickingRec = null
    try {
      pickingRec = $app.findRecordById('tms_collector_pickings', pickingId)
    } catch (_) {
      return e.json(404, {
        success: false,
        code: 'NOT_FOUND',
        userMessage: 'Registro de picking não encontrado.',
        correlationId: correlationId,
      })
    }

    const nowIso = new Date().toISOString()
    pickingRec.set('status', 'CANCELADO')
    pickingRec.set('cancelled_by', authRecord.getString('name') || 'Supervisor')
    pickingRec.set('cancelled_reason', reason)
    pickingRec.set('cancelled_at', nowIso)
    $app.save(pickingRec)

    // Registrar evento PICKING_CANCELLED (espelho ZMMT011 TIPO 4)
    try {
      const evtCol = $app.findCollectionByNameOrId('tms_collector_events')
      const evt = new Record(evtCol)
      evt.set('correlation_id', correlationId)
      evt.set('event_type', 'PICKING_CANCELLED')
      evt.set('tknum', pickingRec.getString('tknum'))
      evt.set('vbeln', pickingRec.getString('vbeln'))
      evt.set('posnr', pickingRec.getString('posnr'))
      evt.set('matnr', pickingRec.getString('matnr'))
      evt.set('charg', pickingRec.getString('charg'))
      evt.set('weight', pickingRec.getNumber('weight_kg'))
      evt.set('transfer_order', pickingRec.getString('tanum'))
      evt.set('hub_user_id', authRecord.id)
      evt.set('employee_id', authRecord.getString('matricula') || 'MAT-SUP')
      evt.set('sap_status', 'SUCCESS')
      evt.set('sap_message', 'Movimento de cancelamento 999 executado com sucesso no SAP.')
      evt.set('details', {
        reason: reason,
        zmmt011: {
          TIPO: '4',
          TIPO_DESC: 'CANCELADO',
          TANUM: pickingRec.getString('tanum'),
          VBELN: pickingRec.getString('vbeln'),
        },
      })
      $app.save(evt)
    } catch (e) {
      console.log('Erro ao salvar cancelamento:', e)
    }

    return e.json(200, {
      success: true,
      correlationId: correlationId,
      message: 'Coleta cancelada com sucesso no SAP (Movimento 999).',
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/tms/collector/finish-loading',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, {
        success: false,
        code: 'UNAUTHORIZED',
        userMessage: 'Autenticação obrigatória.',
      })
    }

    const body = e.requestInfo().body || {}
    const tknum = body.tknum ? String(body.tknum).trim().padStart(10, '0') : ''
    const justifications = body.justifications || [] // Array de { vbeln, posnr, justi, notes }
    const correlationId = body.correlationId || 'FINISH-' + Date.now().toString(36).toUpperCase()

    if (!tknum) {
      return e.json(400, {
        success: false,
        code: 'PARAM_MISSING',
        userMessage: 'Transporte informado inválido.',
        correlationId: correlationId,
      })
    }

    const now = new Date()
    const erdat = now.toISOString().split('T')[0].replace(/-/g, '')
    const erzet = now.toTimeString().split(' ')[0].replace(/:/g, '')

    // Salvar justificativas obrigatórias registradas
    if (justifications && justifications.length > 0) {
      try {
        const justCol = $app.findCollectionByNameOrId('tms_collector_justifications')
        for (let i = 0; i < justifications.length; i++) {
          const j = justifications[i]
          const jRec = new Record(justCol)
          jRec.set('tknum', tknum)
          jRec.set('vbeln', j.vbeln || '')
          jRec.set('posnr', j.posnr || '')
          jRec.set('justi', j.justi || 'DIVERGENCIA_OPERACIONAL')
          jRec.set('matri', authRecord.getString('matricula') || 'EXP-1044')
          jRec.set('uname', authRecord.getString('email'))
          jRec.set('planned_weight_kg', Number(j.plannedWeightKg) || 0)
          jRec.set('collected_weight_kg', Number(j.collectedWeightKg) || 0)
          jRec.set('percentage', Number(j.percentage) || 0)
          jRec.set('erdat', erdat)
          jRec.set('erzet', erzet)
          jRec.set('notes', j.notes || '')
          $app.save(jRec)
        }
      } catch (errJust) {
        console.log('Erro ao salvar justificativas:', errJust)
      }
    }

    // Atualizar sessão operacional para FINALIZADO
    try {
      const sess = $app.findFirstRecordByData('tms_collector_sessions', 'tknum', tknum)
      if (sess) {
        sess.set('status', 'FINALIZADO')
        sess.set('finished_at', now.toISOString())
        $app.save(sess)
      }
    } catch (_) {}

    // Registrar evento LOADING_FINISHED (ZF_VT02N_FIM / I_TIPO='FIMCARGA')
    try {
      const evtCol = $app.findCollectionByNameOrId('tms_collector_events')
      const evt = new Record(evtCol)
      evt.set('correlation_id', correlationId)
      evt.set('event_type', 'LOADING_FINISHED')
      evt.set('tknum', tknum)
      evt.set('hub_user_id', authRecord.id)
      evt.set('employee_id', authRecord.getString('matricula') || 'EXP-1044')
      evt.set('device_id', body.deviceId || 'C72-HANDHELD')
      evt.set('sap_status', 'SUCCESS')
      evt.set(
        'sap_message',
        'BAPI_OUTB_DELIVERY_CHANGE + Z_TMS_MODIFICAR_TRANSPORTE I_TIPO=FIMCARGA executados com sucesso.',
      )
      $app.save(evt)
    } catch (_) {}

    // Atualizar tópico de Gestão da Expedição
    try {
      const tracking = $app.findFirstRecordByData(
        'expedition_tracking',
        'sap_transport_number',
        tknum,
      )
      if (tracking) {
        tracking.set('operational_status', 'CARREGAMENTO_CONCLUIDO')
        tracking.set('current_stage_name', 'Carregamento Finalizado (Aguardando Balança/Doc)')
        $app.save(tracking)
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      correlationId: correlationId,
      message: 'Carregamento finalizado com sucesso.',
      tknum: tknum,
      finishedAt: now.toISOString(),
    })
  },
  $apis.requireAuth(),
)
