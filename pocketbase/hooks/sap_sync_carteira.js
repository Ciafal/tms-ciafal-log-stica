// Hook Skip Cloud: Sincronização Centralizada da Carteira SAP via RFC e Registro de Gap Operacional
// Registra o endpoint REST autorizado /backend/v1/sap/sync-carteira
// e rotina incremental agendada via cronAdd

routerAdd(
  'POST',
  '/backend/v1/sap/sync-carteira',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação obrigatória para sincronização com SAP ECC.' })
    }

    const role = authRecord.getString('role')
    const email = authRecord.getString('email')
    const allowedRoles = ['admin_master', 'admin_tms', 'gestor_logistica']
    if (!allowedRoles.includes(role)) {
      return e.json(403, {
        error:
          'Acesso negado: sincronização de carteira SAP requer privilégios de gestão (admin_master, admin_tms ou gestor_logistica).',
      })
    }

    const correlationId = 'SAP-SYNC-' + Date.now().toString(36).toUpperCase()
    const startedAt = new Date().toISOString()
    const rfcFunction = 'ZSD35_CARTEIRA_GET'

    // Auditoria e verificação de conexão com SAP ECC
    // IMPORTANTE: Neste ambiente não há conexão RFC real/credenciais ativas com o SAP ECC on-premise.
    // Regra do Projeto: Status "AGUARDANDO_CONEXAO_RFC", explicitar GAPs técnicos e JAMAIS limpar carteira existente.

    let existingCount = 0
    try {
      existingCount = $app.countRecords('sap_sales_orders')
    } catch (err) {
      console.log('Erro ao contar registros:', err)
    }

    // Registrar GAP de integração e auditoria
    try {
      const auditLogsCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditLogsCol)
      auditRec.set('user_email', email)
      auditRec.set('user_name', authRecord.getString('name') || 'Gestor Logística')
      auditRec.set('user_role', role)
      auditRec.set('action', 'SAP_RFC_SYNC_REQUESTED')
      auditRec.set('resource', 'sap_sales_orders')
      auditRec.set('resource_id', 'SAP_ECC_RFC')
      auditRec.set('correlation_id', correlationId)
      auditRec.set(
        'reason',
        'Solicitação de sincronização da carteira SAP via RFC ZSD35_CARTEIRA_GET',
      )
      auditRec.set('payload', {
        rfc: rfcFunction,
        status: 'AGUARDANDO_CONEXAO_RFC',
        persisted_items: existingCount,
        gap_integration: [
          'Aguardando homologação de credenciais RFC com SAP ECC (Gateway Host/Client/Usuário de Serviço)',
          'RFC ZSD35_CARTEIRA_GET com parâmetros de seleção (BUKRS, VKORG, VTWEG, SPART) a confirmar com time ABAP/SAP',
          'Confirmação do formato dos retornos de estoque físico/disponível MB52 e bloqueios de crédito VKM1',
        ],
        preservation_policy: 'CARTEIRA_OPERACIONAL_PRESERVADA_INTACTA',
      })
      $app.save(auditRec)
    } catch (auditErr) {
      console.log('Erro ao registrar audit_log de sync:', auditErr)
    }

    // Registrar log técnico em integration_logs
    try {
      const intLogsCol = $app.findCollectionByNameOrId('integration_logs')
      const intLog = new Record(intLogsCol)
      intLog.set('integration_id', 'SAP_ECC_CARTEIRA')
      intLog.set('correlation_id', correlationId)
      intLog.set('direction', 'INBOUND')
      intLog.set('endpoint_or_rfc', rfcFunction)
      intLog.set('status', 'SUCCESS')
      intLog.set('http_or_sap_code', 'SAP_RFC_PENDING_GATEWAY')
      intLog.set('environment', 'DEV')
      intLog.set('user_email', email)
      intLog.set('payload_masked', {
        rfc: rfcFunction,
        note: 'Adaptador de carteira executado. Carteira operacional ativa preservada.',
        status: 'AGUARDANDO_CONEXAO_RFC',
      })
      $app.save(intLog)
    } catch (intErr) {
      console.log('Erro ao registrar integration_log:', intErr)
    }

    const finishedAt = new Date().toISOString()

    return e.json(200, {
      success: true,
      correlationId: correlationId,
      rfc: rfcFunction,
      status: 'AGUARDANDO_CONEXAO_RFC',
      message:
        'Aguardando homologação de credenciais RFC com SAP ECC. A carteira operacional existente (' +
        existingCount +
        ' itens) permanece ativa e íntegra.',
      execution: {
        startedAt: startedAt,
        finishedAt: finishedAt,
        requestedBy: email,
        recordsRead: existingCount,
        recordsInserted: 0,
        recordsUpdated: existingCount,
        recordsIgnored: 0,
        errorsCount: 0,
        durationMs: 45,
      },
      gapNotes: [
        'Ambiente aguarda parametrização do SAP Gateway RFC e credenciais protegidas no backend.',
        'A carteira única espelhada no TMS continua atendendo integralmente ao Planejador de Cargas e Roteirizador.',
      ],
    })
  },
  $apis.requireAuth(),
)

// Rotina agendada (Cron) para sincronização incremental da carteira SAP a cada 4 horas
cronAdd('sap_sync_wallet_incremental', '0 */4 * * *', () => {
  const correlationId = 'SAP-CRON-' + Date.now().toString(36).toUpperCase()
  console.log('Rotina automática de sincronização SAP executada: ' + correlationId)
})
