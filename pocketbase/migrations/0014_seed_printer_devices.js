migrate(
  (app) => {
    const printersCol = app.findCollectionByNameOrId('printer_devices')

    // Seed 1: Impressora Padrão Expedição DP34
    try {
      app.findFirstRecordByData('printer_devices', 'name', 'PRT-EXP-DP34-01')
    } catch (_) {
      const p1 = new Record(printersCol)
      p1.set('name', 'PRT-EXP-DP34-01')
      p1.set('description', 'Laser Corporativa HP LaserJet Enterprise M608 - Expedição DP34')
      p1.set('location', 'Guichê Expedição DP34 - Galpão Principal')
      p1.set('plant', 'Planta CIAFAL Matriz (São Paulo/SP)')
      p1.set('sector', 'Expedição / Balança')
      p1.set('ip_hostname', '10.10.5.42')
      p1.set('port', 631)
      p1.set('print_queue_name', 'PRT_EXP_DP34_01')
      p1.set('protocol', 'IPP')
      p1.set('driver_type', 'HP LaserJet Enterprise / PostScript')
      p1.set('is_active', true)
      p1.set('is_default_transport', true)
      p1.set('environment', 'DEV')
      p1.set('status', 'ONLINE')
      p1.set('last_communication', new Date().toISOString())
      p1.set('last_test_timestamp', new Date().toISOString())
      app.save(p1)
    }

    // Seed 2: Impressora Portaria Acesso 01
    try {
      app.findFirstRecordByData('printer_devices', 'name', 'PRT-PORTARIA-01')
    } catch (_) {
      const p2 = new Record(printersCol)
      p2.set('name', 'PRT-PORTARIA-01')
      p2.set('description', 'Laser Departamental Portaria de Acesso de Veículos')
      p2.set('location', 'Portaria Principal 1 - Entrada de Caminhões')
      p2.set('plant', 'Planta CIAFAL Matriz (São Paulo/SP)')
      p2.set('sector', 'Portaria e Acesso')
      p2.set('ip_hostname', '10.10.5.45')
      p2.set('port', 9100)
      p2.set('print_queue_name', 'PRT_PORTARIA_01')
      p2.set('protocol', 'RAW_SOCKET')
      p2.set('driver_type', 'HP LaserJet Pro MFP')
      p2.set('is_active', true)
      p2.set('is_default_transport', false)
      p2.set('environment', 'DEV')
      p2.set('status', 'ONLINE')
      p2.set('last_communication', new Date().toISOString())
      app.save(p2)
    }

    // Seed 3: Impressora Galpão Trânsito (Backup)
    try {
      app.findFirstRecordByData('printer_devices', 'name', 'PRT-BACKUP-LAMINADOS')
    } catch (_) {
      const p3 = new Record(printersCol)
      p3.set('name', 'PRT-BACKUP-LAMINADOS')
      p3.set('description', 'Impressora de Contingência Galpão de Laminação')
      p3.set('location', 'Galpão 2 - Laminação')
      p3.set('plant', 'Planta CIAFAL Matriz (São Paulo/SP)')
      p3.set('sector', 'Produção Laminação')
      p3.set('ip_hostname', '10.10.5.48')
      p3.set('port', 631)
      p3.set('print_queue_name', 'PRT_BACKUP_02')
      p3.set('protocol', 'CUPS')
      p3.set('driver_type', 'Zebra ZT411')
      p3.set('is_active', true)
      p3.set('is_default_transport', false)
      p3.set('environment', 'DEV')
      p3.set('status', 'ONLINE')
      p3.set('last_communication', new Date().toISOString())
      app.save(p3)
    }
  },
  (app) => {
    // down logic
  },
)
