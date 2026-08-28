// Hook to validate Totem creation request (PORTA group) with Fail-Closed IP Allowlist
// and External checkin validation (FORA group) with 60km geofencing.

onRecordCreateRequest((e) => {
  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const queueType = body.type || 'PORTA'

  // Determine client IP safely
  // Only trust forwarded headers if behind reverse proxy, otherwise use remote address
  let clientIp = reqInfo.remoteIP || ''
  const headers = reqInfo.headers || {}
  if (headers['x-forwarded-for']) {
    const rawFwd = headers['x-forwarded-for']
    clientIp = rawFwd.split(',')[0].trim()
  } else if (headers['x-real-ip']) {
    clientIp = headers['x-real-ip'].trim()
  }

  if (queueType === 'PORTA') {
    // FAIL-CLOSED POLICY:
    // If client IP cannot be determined or is empty -> REJECT
    if (!clientIp) {
      return e.badRequestError(
        'Acesso negado: Não foi possível determinar o endereço IP da portaria.',
      )
    }

    // Query whitelist_ips collection
    let isAllowed = false
    try {
      // Find all active whitelist records
      const allowedIps = $app.findRecordsByFilter('whitelist_ips', 'is_active = true', '', 100, 0)
      if (!allowedIps || allowedIps.length === 0) {
        // FAIL-CLOSED: No configured IPs -> Deny
        return e.forbiddenError(
          'Acesso negado: Nenhuma rede/IP autorizado cadastrado no sistema (Política Fail-Closed).',
        )
      }

      for (let i = 0; i < allowedIps.length; i++) {
        const allowed = allowedIps[i].getString('ip')
        if (
          allowed === clientIp ||
          allowed === '*' ||
          (clientIp === '127.0.0.1' && allowed === '::1') ||
          (clientIp === '::1' && allowed === '127.0.0.1')
        ) {
          isAllowed = true
          break
        }
      }
    } catch (err) {
      return e.internalServerError('Erro ao verificar allowlist de IPs da portaria.')
    }

    if (!isAllowed) {
      return e.forbiddenError(
        'Acesso negado: Requisição originada de IP não autorizado (' +
          clientIp +
          ') para entrada no Totem Portaria.',
      )
    }

    // Set verified IP
    e.record.set('ip_address', clientIp)
    e.record.set('location_status', 'validada')
    e.record.set('distance_km', 0)
  } else if (queueType === 'FORA') {
    // Check geofence (Max 60km from CIAFAL plant)
    const lat = Number(body.latitude)
    const lon = Number(body.longitude)

    if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) {
      return e.badRequestError(
        'Localização obrigatória: Para entrar no grupo FORA, você deve autorizar a geolocalização precisa do seu dispositivo.',
      )
    }

    // CIAFAL Plant coordinates (Default -23.5186, -46.7865)
    let plantLat = -23.5186
    let plantLon = -46.7865
    let maxDist = 60.0

    try {
      const latParam = $app.findFirstRecordByData('system_parameters', 'key', 'PLANT_LATITUDE')
      plantLat = parseFloat(latParam.getString('value')) || plantLat
    } catch (_) {}

    try {
      const lonParam = $app.findFirstRecordByData('system_parameters', 'key', 'PLANT_LONGITUDE')
      plantLon = parseFloat(lonParam.getString('value')) || plantLon
    } catch (_) {}

    try {
      const distParam = $app.findFirstRecordByData('system_parameters', 'key', 'MAX_RADIUS_KM')
      maxDist = parseFloat(distParam.getString('value')) || maxDist
    } catch (_) {}

    // Calculate Haversine distance in km
    const rad = Math.PI / 180
    const dLat = (lat - plantLat) * rad
    const dLon = (lon - plantLon) * rad
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(plantLat * rad) * Math.cos(lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distanceKm = Math.round(6371 * c * 10) / 10

    if (distanceKm > maxDist) {
      return e.badRequestError(
        'Localização fora do raio permitido: Você está a ' +
          distanceKm +
          ' km da CIAFAL. O limite máximo para disponibilidade externa é de ' +
          maxDist +
          ' km.',
      )
    }

    e.record.set('distance_km', distanceKm)
    e.record.set('location_status', 'validada')
    e.record.set('ip_address', clientIp)
  }

  e.next()
}, 'queue_entries')
