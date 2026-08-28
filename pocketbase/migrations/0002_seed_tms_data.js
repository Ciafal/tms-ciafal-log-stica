/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Seed admin users for HUB / TMS CIAFAL
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const seedUsers = [
      {
        email: 'ciafal@ciafal.com.br',
        name: 'Administrador Master CIAFAL',
        role: 'admin_master',
        phone: '11999990001',
      },
      {
        email: 'gestor.logistica@ciafal.com.br',
        name: 'Carlos Eduardo (Gestor Logística)',
        role: 'gestor_logistica',
        phone: '11999990002',
      },
      {
        email: 'operador.patio@ciafal.com.br',
        name: 'Marcos Vinicius (Operador Pátio)',
        role: 'operador_logistica',
        phone: '11999990003',
      },
      {
        email: 'portaria@ciafal.com.br',
        name: 'Portaria Central CIAFAL',
        role: 'portaria',
        phone: '11999990004',
      },
      {
        email: 'auditor@ciafal.com.br',
        name: 'Helena Siqueira (Auditoria Interna)',
        role: 'auditor',
        phone: '11999990005',
      },
    ]

    for (const u of seedUsers) {
      try {
        app.findAuthRecordByEmail('_pb_users_auth_', u.email)
      } catch (_) {
        const rec = new Record(users)
        rec.setEmail(u.email)
        rec.setPassword('Skip@Pass')
        rec.setVerified(true)
        rec.set('name', u.name)
        rec.set('role', u.role)
        rec.set('phone', u.phone)
        app.save(rec)
      }
    }

    // 2. Seed System Parameters (CIAFAL Plant coordinates & max geofence radius)
    // Plant: CIAFAL Matriz (e.g., Lat -23.5186, Lon -46.7865 - São Paulo Industrial)
    const paramsCol = app.findCollectionByNameOrId('system_parameters')
    const defaultParams = [
      {
        key: 'PLANT_LATITUDE',
        value: '-23.5186',
        description: 'Latitude da Planta Central CIAFAL',
      },
      {
        key: 'PLANT_LONGITUDE',
        value: '-46.7865',
        description: 'Longitude da Planta Central CIAFAL',
      },
      {
        key: 'MAX_RADIUS_KM',
        value: '60',
        description: 'Raio máximo em km para entrada no grupo FORA',
      },
      {
        key: 'COMPANY_NAME',
        value: 'CIAFAL - Companhia Agroflorestal e Logística',
        description: 'Razão Social Institucional',
      },
      {
        key: 'TOTEM_FAIL_CLOSED',
        value: 'true',
        description: 'Política Fail-Closed para requisições do Totem Portaria',
      },
    ]

    for (const p of defaultParams) {
      try {
        app.findFirstRecordByData('system_parameters', 'key', p.key)
      } catch (_) {
        const rec = new Record(paramsCol)
        rec.set('key', p.key)
        rec.set('value', p.value)
        rec.set('description', p.description)
        app.save(rec)
      }
    }

    // 3. Seed Whitelist IPs for Totem
    const ipsCol = app.findCollectionByNameOrId('whitelist_ips')
    const defaultIps = [
      { ip: '127.0.0.1', description: 'Localhost / Totem Teste', is_active: true },
      { ip: '::1', description: 'IPv6 Loopback', is_active: true },
      { ip: '192.168.1.100', description: 'Totem Portaria Principal 01', is_active: true },
      { ip: '192.168.1.101', description: 'Totem Portaria Balança 02', is_active: true },
      { ip: '10.0.0.50', description: 'Rede Interna Portaria CIAFAL', is_active: true },
    ]

    for (const item of defaultIps) {
      try {
        app.findFirstRecordByData('whitelist_ips', 'ip', item.ip)
      } catch (_) {
        const rec = new Record(ipsCol)
        rec.set('ip', item.ip)
        rec.set('description', item.description)
        rec.set('is_active', item.is_active)
        app.save(rec)
      }
    }

    // 4. Seed Drivers & Vehicles (Mock SAP View ZSD004V_V2)
    const driversCol = app.findCollectionByNameOrId('drivers')
    const vehiclesCol = app.findCollectionByNameOrId('vehicles')
    const queueCol = app.findCollectionByNameOrId('queue_entries')

    const sampleDrivers = [
      {
        name: 'Sebastião Moreira dos Santos',
        document: '12345678909', // CPF válido
        whatsapp: '11987654321',
        status: 'ativo',
        sap_id: 'SAP-100201',
        rg: '123456789',
        cnh: '01234567890',
        cnh_category: 'E',
        cnh_validity: '2026-12-31',
        channel_telegram: '@sebastiao_fretes',
        plate: 'ABC1D23',
        vehicle_type: 'Carreta LS 3 Eixos',
        body_type: 'Grade Baixa',
        capacity: 32000,
        queue_type: 'PORTA',
        queue_status: 'disponivel',
        dist_km: 0,
        loc_status: 'validada',
        entry_hours_ago: 3,
      },
      {
        name: 'Roberto Gonçalves de Alencar',
        document: '98765432100', // CPF de exemplo
        whatsapp: '19976543210',
        status: 'ativo',
        sap_id: 'SAP-100202',
        rg: '234567890',
        cnh: '02345678901',
        cnh_category: 'E',
        cnh_validity: '2027-05-15',
        channel_telegram: '@roberto_transp',
        plate: 'XYZ9K88',
        vehicle_type: 'Bitrem 7 Eixos',
        body_type: 'Graneleiro',
        capacity: 57000,
        queue_type: 'PORTA',
        queue_status: 'validacao',
        dist_km: 0,
        loc_status: 'validada',
        entry_hours_ago: 1.5,
      },
      {
        name: 'Antônio Ferreira Ramos',
        document: '45678912300',
        whatsapp: '16991234567',
        status: 'ativo',
        sap_id: 'SAP-100203',
        rg: '345678901',
        cnh: '03456789012',
        cnh_category: 'D',
        cnh_validity: '2026-08-20',
        channel_telegram: '',
        plate: 'BRA2E19',
        vehicle_type: 'Truck',
        body_type: 'Sider',
        capacity: 14000,
        queue_type: 'FORA',
        queue_status: 'disponivel',
        dist_km: 18.4,
        loc_status: 'validada',
        entry_hours_ago: 2,
      },
      {
        name: 'Claudemir de Paula Souza',
        document: '78912345600',
        whatsapp: '12988776655',
        status: 'ativo',
        sap_id: 'SAP-100204',
        rg: '456789012',
        cnh: '04567890123',
        cnh_category: 'E',
        cnh_validity: '2025-11-10',
        channel_telegram: '@claudemir_log',
        plate: 'RST4H56',
        vehicle_type: 'Rodotrem 9 Eixos',
        body_type: 'Graneleiro',
        capacity: 74000,
        queue_type: 'FORA',
        queue_status: 'disponivel',
        dist_km: 42.1,
        loc_status: 'validada',
        entry_hours_ago: 4.2,
      },
      {
        name: 'Valdir Pereira Mendes',
        document: '32165498700',
        whatsapp: '15981122334',
        status: 'bloqueado',
        sap_id: 'SAP-100205',
        rg: '567890123',
        cnh: '05678901234',
        cnh_category: 'C',
        cnh_validity: '2024-03-01',
        channel_telegram: '',
        plate: 'JHG5A12',
        vehicle_type: 'Toco',
        body_type: 'Baú',
        capacity: 6000,
        queue_type: 'PORTA',
        queue_status: 'bloqueado',
        dist_km: 0,
        loc_status: 'validada',
        entry_hours_ago: 5,
      },
    ]

    const now = new Date()

    for (const item of sampleDrivers) {
      let driverRec
      try {
        driverRec = app.findFirstRecordByData('drivers', 'document', item.document)
      } catch (_) {
        driverRec = new Record(driversCol)
        driverRec.set('name', item.name)
        driverRec.set('document', item.document)
        driverRec.set('whatsapp', item.whatsapp)
        driverRec.set('status', item.status)
        driverRec.set('sap_id', item.sap_id)
        driverRec.set('rg', item.rg)
        driverRec.set('cnh', item.cnh)
        driverRec.set('cnh_category', item.cnh_category)
        driverRec.set('cnh_validity', item.cnh_validity)
        driverRec.set('channel_telegram', item.channel_telegram)
        driverRec.set('notes', 'Cadastrado via importação SAP ZSD004V_V2')
        app.save(driverRec)
      }

      let vehicleRec
      try {
        vehicleRec = app.findFirstRecordByData('vehicles', 'plate', item.plate)
      } catch (_) {
        vehicleRec = new Record(vehiclesCol)
        vehicleRec.set('plate', item.plate)
        vehicleRec.set('type', item.vehicle_type)
        vehicleRec.set('body_type', item.body_type)
        vehicleRec.set('capacity_kg', item.capacity)
        vehicleRec.set('driver', driverRec.id)
        app.save(vehicleRec)
      }

      // Add entry in queue_entries
      try {
        app.findFirstRecordByData('queue_entries', 'driver', driverRec.id)
      } catch (_) {
        const entryTime = new Date(now.getTime() - item.entry_hours_ago * 60 * 60 * 1000)
        const qRec = new Record(queueCol)
        qRec.set('driver', driverRec.id)
        qRec.set('vehicle', vehicleRec.id)
        qRec.set('type', item.queue_type)
        qRec.set('status', item.queue_status)
        qRec.set('entry_time', entryTime.toISOString())
        qRec.set(
          'latitude',
          item.queue_type === 'PORTA' ? -23.5186 : -23.5186 + item.dist_km * 0.007,
        )
        qRec.set(
          'longitude',
          item.queue_type === 'PORTA' ? -46.7865 : -46.7865 + item.dist_km * 0.007,
        )
        qRec.set('distance_km', item.dist_km)
        qRec.set('location_status', item.loc_status)
        qRec.set('ip_address', item.queue_type === 'PORTA' ? '192.168.1.100' : '187.55.120.33')
        qRec.set('driver_name_cached', item.name)
        qRec.set('driver_doc_cached', item.document)
        qRec.set('driver_whatsapp_cached', item.whatsapp)
        qRec.set('vehicle_plate_cached', item.plate)
        qRec.set('vehicle_type_cached', item.vehicle_type)
        qRec.set(
          'reason',
          item.queue_type === 'PORTA'
            ? 'Entrada registrada no Totem da Portaria'
            : 'Check-in realizado via link externo WhatsApp',
        )
        qRec.set('last_event', 'Entrada na fila registrada')
        qRec.set('last_operator', 'Sistema Automático')
        app.save(qRec)
      }
    }

    // 5. Seed sample pre-registration
    const preCol = app.findCollectionByNameOrId('pre_registrations')
    try {
      app.findFirstRecordByData('pre_registrations', 'document', '88877766655')
    } catch (_) {
      const pre1 = new Record(preCol)
      pre1.set('document', '88877766655')
      pre1.set('name', 'Geraldo Magela Barbosa')
      pre1.set('whatsapp', '11977778888')
      pre1.set('vehicle_type', 'Carreta LS')
      pre1.set('plate', 'ABC8J99')
      pre1.set('origin', 'PORTA')
      pre1.set('status', 'pendente')
      pre1.set('reviewer_notes', 'Aguardando envio de documentação CNH/CRLV no guichê')
      app.save(pre1)
    }

    try {
      app.findFirstRecordByData('pre_registrations', 'document', '55544433322')
    } catch (_) {
      const pre2 = new Record(preCol)
      pre2.set('document', '55544433322')
      pre2.set('name', 'Danilo Sampaio Peixoto')
      pre2.set('whatsapp', '14998881122')
      pre2.set('vehicle_type', 'Bitrem Graneleiro')
      pre2.set('plate', 'FGH3K44')
      pre2.set('origin', 'FORA')
      pre2.set('status', 'pendente')
      pre2.set('latitude', -23.49)
      pre2.set('longitude', -46.72)
      pre2.set('reviewer_notes', 'Novo motorista autônomo. Solicitado cadastro no SAP.')
      app.save(pre2)
    }

    // 6. Seed initial audit log
    const auditCol = app.findCollectionByNameOrId('audit_logs')
    const logRec = new Record(auditCol)
    logRec.set('user_email', 'sistema@ciafal.com.br')
    logRec.set('user_name', 'Inicialização TMS CIAFAL')
    logRec.set('user_role', 'admin_master')
    logRec.set('action', 'INITIALIZE_SYSTEM')
    logRec.set('resource', 'system')
    logRec.set('resource_id', 'sys-001')
    logRec.set('new_state', 'OPERATIONAL')
    logRec.set('reason', 'Inicialização da infraestrutura do módulo TMS CIAFAL Logística')
    logRec.set('ip_address', '127.0.0.1')
    logRec.set('correlation_id', 'INIT-TMS-2025')
    logRec.set('payload', { system: 'TMS CIAFAL', version: '1.0.0', plant: 'Matriz' })
    app.save(logRec)
  },
  (app) => {
    // down migration
  },
)
