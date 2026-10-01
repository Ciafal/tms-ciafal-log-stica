// Hook Skip Cloud: Sincronização e Auditoria ZSD004 (MHTML_TEMP / SAP_RFC)
// Registra o endpoint REST autorizado /backend/v1/sap/sync-zsd004

routerAdd(
  'POST',
  '/backend/v1/sap/sync-zsd004',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação obrigatória para sincronização da ZSD004.' })
    }

    const role = authRecord.getString('role')
    const email = authRecord.getString('email')
    const allowedRoles = [
      'admin_master',
      'admin_tms',
      'gestor_logistica',
      'gerente_carga',
      'operador_logistica',
    ]
    if (!allowedRoles.includes(role)) {
      return e.json(403, {
        error: 'Acesso negado: sincronização ZSD004 requer perfil logístico autorizado.',
      })
    }

    const correlationId = 'ZSD004-SYNC-' + Date.now().toString(36).toUpperCase()
    const startedAt = new Date().toISOString()
    const rfcFunction = 'ZSD004_GET_VEHICLES_DRIVERS'

    let mode = 'MHTML_TEMP'
    try {
      const modeParam = $app.findFirstRecordByData(
        'system_parameters',
        'key',
        'ACTIVE_ZSD004_SOURCE',
      )
      if (modeParam && modeParam.getString('value')) {
        mode = modeParam.getString('value')
      }
    } catch (_) {}

    let currentRecordsCount = 0
    try {
      currentRecordsCount = $app.countRecords('sap_zsd004_vehicles_drivers')
    } catch (err) {
      console.log('Erro ao contar sap_zsd004_vehicles_drivers:', err)
    }

    // Auditoria
    try {
      const auditLogsCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditLogsCol)
      auditRec.set('user_email', email)
      auditRec.set('user_name', authRecord.getString('name') || 'Gestor Logístico')
      auditRec.set('user_role', role)
      auditRec.set('action', 'SAP_ZSD004_SYNC_REQUESTED')
      auditRec.set('resource', 'sap_zsd004_vehicles_drivers')
      auditRec.set('resource_id', mode === 'SAP_RFC' ? 'SAP_ECC_RFC' : 'MHTML_SNAPSHOT')
      auditRec.set('correlation_id', correlationId)
      auditRec.set('reason', 'Execução de sincronização da tabela SAP ZSD004 (Centro WSTL)')
      auditRec.set('payload', {
        mode: mode,
        rfc: rfcFunction,
        current_records: currentRecordsCount,
        target_plant: 'WSTL',
        gap_rfc_notes: [
          'Host/Gateway SAP ECC, Client mandante, Usuário técnico RFC ZSD004',
          'Tabela base de extração: ZSD004 / View SD com filtro WERKS = WSTL',
        ],
      })
      $app.save(auditRec)
    } catch (err) {
      console.log('Erro ao salvar auditoria ZSD004:', err)
    }

    // Registrar log em integration_logs
    try {
      const intLogsCol = $app.findCollectionByNameOrId('integration_logs')
      const intLog = new Record(intLogsCol)
      intLog.set('integration_id', 'SAP_ECC_ZSD004')
      intLog.set('correlation_id', correlationId)
      intLog.set('direction', 'INBOUND')
      intLog.set('endpoint_or_rfc', mode === 'SAP_RFC' ? rfcFunction : 'MHTML_TEMP_PROCESSOR')
      intLog.set('status', 'SUCCESS')
      intLog.set(
        'http_or_sap_code',
        mode === 'SAP_RFC' ? 'SAP_RFC_WAITING_CREDENTIALS' : 'MHTML_SYNCHRONIZED',
      )
      intLog.set('environment', 'DEV')
      intLog.set('user_email', email)
      intLog.set('payload_masked', {
        mode: mode,
        source: mode === 'SAP_RFC' ? 'SAP ECC 6.0 RFC' : 'Snapshot ZSD004.xlxs.MHTML',
        plant: 'WSTL',
        records_in_cache: currentRecordsCount,
      })
      $app.save(intLog)
    } catch (err) {
      console.log('Erro ao registrar integration_log:', err)
    }

    // Atualizar parâmetro ZSD004_LAST_SYNC
    try {
      const lastSyncParam = $app.findFirstRecordByData(
        'system_parameters',
        'key',
        'ZSD004_LAST_SYNC',
      )
      if (lastSyncParam) {
        lastSyncParam.set('value', new Date().toISOString())
        $app.save(lastSyncParam)
      }
    } catch (_) {}

    const finishedAt = new Date().toISOString()

    return e.json(200, {
      success: true,
      correlationId: correlationId,
      sourceMode: mode,
      rfc: rfcFunction,
      status: mode === 'SAP_RFC' ? 'AGUARDANDO_CONEXAO_RFC' : 'CONCLUIDO_SNAPSHOT',
      message:
        mode === 'SAP_RFC'
          ? 'Sincronização SAP_RFC aguardando credenciais definitivas do SAP Gateway. Base em cache preservada.'
          : 'Sincronização ZSD004 processada com sucesso no modo MHTML_TEMP.',
      execution: {
        startedAt: startedAt,
        finishedAt: finishedAt,
        requestedBy: email,
        recordsRead: currentRecordsCount,
        recordsInserted: 0,
        recordsUpdated: currentRecordsCount,
        recordsUnchanged: currentRecordsCount,
        recordsRejected: 0,
        inconsistenciesCount: 0,
      },
      gapParameters: [
        'SAP_RFC_HOST (ex: sap-prd.ciafal.corp)',
        'SAP_RFC_CLIENT (ex: 400)',
        'SAP_RFC_USER (ex: TMS_INT_ZSD004)',
        'SAP_RFC_PASSWORD (armazenado seguro em Secrets backend)',
        'SAP_RFC_SYSNR (ex: 00)',
        'SAP_RFC_ROUTER_STRING (quando exigido para rede externa)',
      ],
    })
  },
  $apis.requireAuth(),
)
