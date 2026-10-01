migrate(
  (app) => {
    // 1. Coleção: tms_collector_events (Linha do tempo imutável de eventos do coletor)
    if (!app.hasTable('tms_collector_events')) {
      const eventsCol = new Collection({
        name: 'tms_collector_events',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: null, // Eventos são imutáveis
        deleteRule: null, // Não deletar histórico
        fields: [
          { name: 'correlation_id', type: 'text', required: true },
          { name: 'event_type', type: 'text', required: true },
          { name: 'tknum', type: 'text', required: false },
          { name: 'vbeln', type: 'text', required: false },
          { name: 'posnr', type: 'text', required: false },
          { name: 'matnr', type: 'text', required: false },
          { name: 'charg', type: 'text', required: false },
          { name: 'weight', type: 'number', required: false },
          { name: 'warehouse', type: 'text', required: false }, // ex: E01
          { name: 'storage_type', type: 'text', required: false }, // ex: 920, 916
          { name: 'storage_bin', type: 'text', required: false }, // ex: DP34-01
          { name: 'transfer_order', type: 'text', required: false }, // TANUM
          { name: 'hub_user_id', type: 'text', required: false },
          { name: 'employee_id', type: 'text', required: false }, // Matrícula SAP
          { name: 'device_id', type: 'text', required: false }, // Identificação Chainway C72
          { name: 'sap_status', type: 'text', required: false }, // SUCCESS, ERROR, PENDING
          { name: 'sap_message_id', type: 'text', required: false },
          { name: 'sap_message_number', type: 'text', required: false },
          { name: 'sap_message', type: 'text', required: false },
          { name: 'payload_hash', type: 'text', required: false },
          { name: 'details', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_collevt_tknum ON tms_collector_events (tknum)',
          'CREATE INDEX idx_collevt_vbeln ON tms_collector_events (vbeln)',
          'CREATE INDEX idx_collevt_matcharg ON tms_collector_events (matnr, charg)',
          'CREATE INDEX idx_collevt_type ON tms_collector_events (event_type)',
          'CREATE INDEX idx_collevt_corr ON tms_collector_events (correlation_id)',
        ],
      })
      app.save(eventsCol)
    }

    // 2. Coleção: tms_collector_pickings (Itens coletados / OT de picking no SAP e espelho ZMMT011)
    if (!app.hasTable('tms_collector_pickings')) {
      const pickCol = new Collection({
        name: 'tms_collector_pickings',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: null, // Nunca deletar, registrar cancelamento com status CANCELADO
        fields: [
          { name: 'tknum', type: 'text', required: true },
          { name: 'vbeln', type: 'text', required: true },
          { name: 'posnr', type: 'text', required: true },
          { name: 'matnr', type: 'text', required: true },
          { name: 'charg', type: 'text', required: true },
          { name: 'material_description', type: 'text', required: false },
          { name: 'weight_kg', type: 'number', required: true },
          { name: 'unit', type: 'text', required: false },
          { name: 'tanum', type: 'text', required: false }, // Número da Ordem de Transporte WM
          { name: 'lgnum', type: 'text', required: false }, // E01
          { name: 'vltyp', type: 'text', required: false }, // 920
          { name: 'vlpla', type: 'text', required: false }, // Posição origem
          { name: 'nltyp', type: 'text', required: false }, // 916
          { name: 'nlpla', type: 'text', required: false }, // Remessa
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['CONFIRMADO', 'CANCELADO', 'ELIMINADO'],
            maxSelect: 1,
          },
          { name: 'operator_id', type: 'text', required: false },
          { name: 'operator_matricula', type: 'text', required: false },
          { name: 'operator_name', type: 'text', required: false },
          { name: 'customer_code', type: 'text', required: false },
          { name: 'customer_name', type: 'text', required: false },
          { name: 'cancelled_by', type: 'text', required: false },
          { name: 'cancelled_reason', type: 'text', required: false },
          { name: 'cancelled_at', type: 'date', required: false },
          { name: 'correlation_id', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_collpick_tknum ON tms_collector_pickings (tknum)',
          'CREATE INDEX idx_collpick_vbeln ON tms_collector_pickings (vbeln)',
          'CREATE INDEX idx_collpick_batch ON tms_collector_pickings (matnr, charg)',
          'CREATE INDEX idx_collpick_status ON tms_collector_pickings (status)',
        ],
      })
      app.save(pickCol)
    }

    // 3. Coleção: tms_collector_justifications (Justificativas de divergência na finalização)
    if (!app.hasTable('tms_collector_justifications')) {
      const justCol = new Collection({
        name: 'tms_collector_justifications',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: null,
        fields: [
          { name: 'tknum', type: 'text', required: true },
          { name: 'vbeln', type: 'text', required: true },
          { name: 'posnr', type: 'text', required: true },
          { name: 'justi', type: 'text', required: true }, // Código / texto da justificativa TVARVC Z_EXPEDICAO
          { name: 'matri', type: 'text', required: false }, // Matrícula SAP do operador
          { name: 'uname', type: 'text', required: false }, // Usuário HUB / SAP
          { name: 'planned_weight_kg', type: 'number', required: false },
          { name: 'collected_weight_kg', type: 'number', required: false },
          { name: 'percentage', type: 'number', required: false },
          { name: 'erdat', type: 'text', required: false }, // Data SAP (YYYYMMDD)
          { name: 'erzet', type: 'text', required: false }, // Hora SAP (HHMMSS)
          { name: 'notes', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_colljust_tknum ON tms_collector_justifications (tknum)',
          'CREATE INDEX idx_colljust_vbeln ON tms_collector_justifications (vbeln)',
        ],
      })
      app.save(justCol)
    }

    // 4. Coleção: tms_collector_locks (Lock lógico concorrente para evitar duplo picking do mesmo lote)
    if (!app.hasTable('tms_collector_locks')) {
      const lockCol = new Collection({
        name: 'tms_collector_locks',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'lock_key', type: 'text', required: true }, // VBELN_POSNR_MATNR_CHARG
          { name: 'vbeln', type: 'text', required: true },
          { name: 'posnr', type: 'text', required: true },
          { name: 'matnr', type: 'text', required: true },
          { name: 'charg', type: 'text', required: true },
          { name: 'operator_id', type: 'text', required: true },
          { name: 'operator_name', type: 'text', required: false },
          { name: 'device_id', type: 'text', required: false },
          { name: 'expires_at', type: 'date', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_colllock_key ON tms_collector_locks (lock_key)',
          'CREATE INDEX idx_colllock_exp ON tms_collector_locks (expires_at)',
        ],
      })
      app.save(lockCol)
    }

    // 5. Coleção: tms_collector_sessions (Sessão operacional ativa no coletor por transporte)
    if (!app.hasTable('tms_collector_sessions')) {
      const sessCol = new Collection({
        name: 'tms_collector_sessions',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: null,
        fields: [
          { name: 'tknum', type: 'text', required: true },
          { name: 'operator_id', type: 'text', required: true },
          { name: 'operator_matricula', type: 'text', required: false },
          { name: 'operator_name', type: 'text', required: false },
          { name: 'device_id', type: 'text', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['INICIADO', 'EM_COLETA', 'FINALIZADO', 'CANCELADO'],
            maxSelect: 1,
          },
          { name: 'started_at', type: 'date', required: true },
          { name: 'first_scan_at', type: 'date', required: false },
          { name: 'last_scan_at', type: 'date', required: false },
          { name: 'finished_at', type: 'date', required: false },
          { name: 'total_planned_weight_kg', type: 'number', required: false },
          { name: 'total_collected_weight_kg', type: 'number', required: false },
          { name: 'percentage_loaded', type: 'number', required: false },
          { name: 'deliveries_count', type: 'number', required: false },
          { name: 'deliveries_completed', type: 'number', required: false },
          { name: 'batches_count', type: 'number', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_collsess_tknum ON tms_collector_sessions (tknum)',
          'CREATE INDEX idx_collsess_oper ON tms_collector_sessions (operator_id)',
          'CREATE INDEX idx_collsess_status ON tms_collector_sessions (status)',
        ],
      })
      app.save(sessCol)
    }

    // 6. Popular Parâmetros Operacionais TVARVC (Z_MIN%_REMESSA e Z_EXPEDICAO) em system_parameters
    try {
      if (app.hasTable('system_parameters')) {
        const sysParams = app.findCollectionByNameOrId('system_parameters')

        // Parâmetro Z_MIN%_REMESSA (default 90% conforme TVARVC)
        try {
          app.findFirstRecordByData('system_parameters', 'key', 'TVARVC_Z_MIN_PCT_REMESSA')
        } catch (_) {
          const recMin = new Record(sysParams)
          recMin.set('key', 'TVARVC_Z_MIN_PCT_REMESSA')
          recMin.set('value', '90')
          recMin.set('label', 'Percentual Mínimo de Coleta por Remessa (TVARVC Z_MIN%_REMESSA)')
          recMin.set('group', 'EXPEDICAO_COLETOR')
          recMin.set(
            'description',
            'Percentual mínimo exigido para considerar o carregamento de cada item da remessa sem exigir justificativa operacional.',
          )
          app.save(recMin)
        }

        // Justificativas dinâmicas TVARVC Z_EXPEDICAO
        try {
          app.findFirstRecordByData('system_parameters', 'key', 'TVARVC_Z_EXPEDICAO_JUSTIFICATIVAS')
        } catch (_) {
          const recJust = new Record(sysParams)
          recJust.set('key', 'TVARVC_Z_EXPEDICAO_JUSTIFICATIVAS')
          recJust.set(
            'value',
            JSON.stringify([
              {
                code: 'FALTA_SALDO_DP34',
                label: 'Falta de saldo do lote no depósito DP34',
                active: true,
              },
              {
                code: 'DIVERGENCIA_PESO',
                label: 'Divergência de peso nominal × balança do lote',
                active: true,
              },
              {
                code: 'LOTE_BLOQUEADO_QUALIDADE',
                label: 'Lote bloqueado pelo controle de qualidade',
                active: true,
              },
              {
                code: 'CAPACIDADE_VEICULO_ATINGIDA',
                label: 'Capacidade máxima de peso do veículo atingida',
                active: true,
              },
              {
                code: 'SOLICITACAO_CLIENTE_COMERCIAL',
                label: 'Cancelamento ou redução autorizada pelo Comercial',
                active: true,
              },
              {
                code: 'MATERIAL_NAO_PRODUZIDO_PCP',
                label: 'Material pendente de acabamento no PCP',
                active: true,
              },
              {
                code: 'AVARIA_DURANTE_CARGA',
                label: 'Avaria ou deformação física detectada durante o carregamento',
                active: true,
              },
            ]),
          )
          recJust.set('label', 'Justificativas Dinâmicas de Expedição (TVARVC Name Z_EXPEDICAO)')
          recJust.set('group', 'EXPEDICAO_COLETOR')
          recJust.set(
            'description',
            'Tabela TVARVC de justificativas aceitas pelo SAP para divergências de peso abaixo do percentual mínimo.',
          )
          app.save(recJust)
        }
      }
    } catch (e) {
      console.log('Aviso ao inicializar system_parameters para coletor:', e)
    }
  },
  (app) => {
    try {
      if (app.hasTable('tms_collector_locks')) {
        app.delete(app.findCollectionByNameOrId('tms_collector_locks'))
      }
      if (app.hasTable('tms_collector_justifications')) {
        app.delete(app.findCollectionByNameOrId('tms_collector_justifications'))
      }
      if (app.hasTable('tms_collector_pickings')) {
        app.delete(app.findCollectionByNameOrId('tms_collector_pickings'))
      }
      if (app.hasTable('tms_collector_events')) {
        app.delete(app.findCollectionByNameOrId('tms_collector_events'))
      }
      if (app.hasTable('tms_collector_sessions')) {
        app.delete(app.findCollectionByNameOrId('tms_collector_sessions'))
      }
    } catch (_) {}
  },
)
