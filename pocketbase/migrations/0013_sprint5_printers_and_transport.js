migrate(
  (app) => {
    // 1. Tabela de Impressoras Físicas de Rede (printer_devices)
    const printers = new Collection({
      name: 'printer_devices',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'location', type: 'text', required: true },
        { name: 'plant', type: 'text', required: true },
        { name: 'sector', type: 'text' },
        { name: 'ip_hostname', type: 'text', required: true },
        { name: 'port', type: 'number' },
        { name: 'print_queue_name', type: 'text', required: true },
        {
          name: 'protocol',
          type: 'select',
          required: true,
          values: ['IPP', 'CUPS', 'WINDOWS_SPOOLER', 'LPR_LPD', 'RAW_SOCKET'],
          maxSelect: 1,
        },
        { name: 'driver_type', type: 'text' },
        { name: 'is_active', type: 'bool' },
        { name: 'is_default_transport', type: 'bool' },
        {
          name: 'environment',
          type: 'select',
          required: true,
          values: ['DEV', 'HOMOLOGACAO', 'PRODUCAO'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ONLINE', 'OFFLINE', 'EM_ERRO', 'MANUTENCAO'],
          maxSelect: 1,
        },
        { name: 'last_communication', type: 'date' },
        { name: 'last_test_timestamp', type: 'date' },
        { name: 'last_error_message', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(printers)

    // 2. Fila e Monitor de Jobs de Impressão (print_jobs)
    const printJobs = new Collection({
      name: 'print_jobs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'print_job_id', type: 'text', required: true },
        {
          name: 'document_type',
          type: 'select',
          required: true,
          values: [
            'ORDEM_TRANSPORTE',
            'ROMANEIO_EXPEDICAO',
            'TESTE_IMPRESSAO',
            'REIMPRESSAO_ORDEM',
          ],
          maxSelect: 1,
        },
        { name: 'cargo_id', type: 'text' },
        { name: 'sap_transport_number', type: 'text' },
        { name: 'printer_id', type: 'text', required: true },
        { name: 'printer_name_cached', type: 'text' },
        { name: 'printer_location_cached', type: 'text' },
        { name: 'user_email', type: 'text' },
        { name: 'user_name', type: 'text' },
        { name: 'copies', type: 'number' },
        { name: 'is_reprint', type: 'bool' },
        { name: 'reprint_reason', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Pendente', 'Enviado', 'Impresso', 'Erro', 'Cancelado'],
          maxSelect: 1,
        },
        { name: 'attempts_count', type: 'number' },
        { name: 'max_attempts', type: 'number' },
        { name: 'raw_payload_size_bytes', type: 'number' },
        { name: 'error_message', type: 'text' },
        { name: 'sent_at', type: 'date' },
        { name: 'printed_at', type: 'date' },
        { name: 'correlation_id', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(printJobs)

    // 3. Entregas Físicas de Documentos ao Motorista (document_handovers)
    const handovers = new Collection({
      name: 'document_handovers',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'cargo_id', type: 'text', required: true },
        { name: 'sap_transport_number', type: 'text', required: true },
        { name: 'print_job_id', type: 'text', required: true },
        { name: 'driver_id', type: 'text', required: true },
        { name: 'driver_name', type: 'text', required: true },
        { name: 'driver_document', type: 'text', required: true },
        { name: 'vehicle_plate', type: 'text', required: true },
        { name: 'delivered_by_operator_email', type: 'text', required: true },
        { name: 'delivered_by_operator_name', type: 'text', required: true },
        { name: 'delivery_timestamp', type: 'date', required: true },
        { name: 'notes', type: 'text' },
        { name: 'correlation_id', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(handovers)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('document_handovers'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('print_jobs'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('printer_devices'))
    } catch (_) {}
  },
)
