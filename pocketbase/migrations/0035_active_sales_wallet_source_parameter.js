/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const sysCol = app.findCollectionByNameOrId('system_parameters')

    const defaultParameters = [
      {
        key: 'ACTIVE_SALES_WALLET_SOURCE',
        value: 'EXCEL_ZSD35A',
        description:
          'Fonte Ativa da Carteira de Pedidos do TMS CIAFAL (EXCEL_ZSD35A = Excel ZSD35A — QAS | SAP_ECC = SAP ECC 6.0 RFC)',
      },
      {
        key: 'ACTIVE_SALES_WALLET_NAME',
        value: 'Excel ZSD35A — QAS',
        description: 'Nome legível da fonte de carteira de vendas ativa no ambiente.',
      },
      {
        key: 'SALES_WALLET_SAP_FALLBACK_ALLOWED',
        value: 'false',
        description:
          'Permite consulta direta ao SAP quando a fonte estiver configurada como Excel (false para isolamento estrito de homologação)',
      },
    ]

    for (const p of defaultParameters) {
      try {
        const existing = app.findFirstRecordByData('system_parameters', 'key', p.key)
        if (existing) {
          existing.set('value', p.value)
          existing.set('description', p.description)
          app.save(existing)
        }
      } catch (_) {
        const record = new Record(sysCol)
        record.set('key', p.key)
        record.set('value', p.value)
        record.set('description', p.description)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData(
        'system_parameters',
        'key',
        'ACTIVE_SALES_WALLET_SOURCE',
      )
      app.delete(record)
    } catch (_) {}
    try {
      const record = app.findFirstRecordByData(
        'system_parameters',
        'key',
        'ACTIVE_SALES_WALLET_NAME',
      )
      app.delete(record)
    } catch (_) {}
    try {
      const record = app.findFirstRecordByData(
        'system_parameters',
        'key',
        'SALES_WALLET_SAP_FALLBACK_ALLOWED',
      )
      app.delete(record)
    } catch (_) {}
  },
)
