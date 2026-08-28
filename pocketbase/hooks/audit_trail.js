// Audit trail hook for queue_entries changes
onRecordAfterUpdateSuccess((e) => {
  const rec = e.record
  const original = rec.original()

  const prevStatus = original ? original.getString('status') : ''
  const newStatus = rec.getString('status')

  // Only record audit log if status or reason changed
  if (
    prevStatus !== newStatus ||
    rec.getString('reason') !== (original ? original.getString('reason') : '')
  ) {
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const log = new Record(auditCol)

      log.set('user_email', rec.getString('last_operator') || 'operador@ciafal.com.br')
      log.set('user_name', rec.getString('last_operator') || 'Operador TMS')
      log.set('user_role', 'operador_logistica')
      log.set('action', 'UPDATE_QUEUE_STATUS')
      log.set('resource', 'queue_entries')
      log.set('resource_id', rec.id)
      log.set('previous_state', prevStatus)
      log.set('new_state', newStatus)
      log.set('reason', rec.getString('reason') || 'Alteração operacional de status')
      log.set('ip_address', rec.getString('ip_address') || '127.0.0.1')
      log.set('correlation_id', 'QUEUE-' + rec.id + '-' + Date.now())
      log.set('payload', {
        driver_name: rec.getString('driver_name_cached'),
        plate: rec.getString('vehicle_plate_cached'),
        type: rec.getString('type'),
        operator_notes: rec.getString('operator_notes'),
      })

      $app.save(log)
    } catch (err) {
      console.log('Failed to create audit log in hook:', err)
    }
  }

  e.next()
}, 'queue_entries')
