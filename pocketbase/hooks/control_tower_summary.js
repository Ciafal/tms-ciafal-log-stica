// pocketbase/hooks/control_tower_summary.js
// Endpoint de agregação server-side da Torre de Controle:
// GET /backend/v1/tms/control-tower/summary?period=today|yesterday|week|month|year
// Regras obrigatórias:
// 1. Agregação em endpoint único de alta performance
// 2. Lógica por evento com timestamps reais (e não apenas estado atual da carga)
// 3. Retorno para cada bucket de cargas únicas + tonelagem formatada e bruta:
//    - cargas_em_negociacao
//    - cargas_com_contraproposta
//    - cargas_recusadas (cargas únicas, mesmo com múltiplas recusas)
//    - cargas_em_expedicao
//    - cargas_faturadas
// 4. Sem mocks/hardcode — se não houver dados, retorna 0 cargas e 0 t
// 5. Lista detalhada de cargas elegíveis para o modal interativo com deep links

routerAdd('GET', '/backend/v1/tms/control-tower/summary', (e) => {
  try {
    // PocketBase v0.36 Skip Cloud: query params acessados via e.requestInfo().query ou e.request.url.query()
    let periodParam = 'today'
    try {
      const q = e.requestInfo().query || {}
      periodParam = (q.period || 'today').toLowerCase()
    } catch (_) {
      try {
        periodParam = (e.request.url.query().get('period') || 'today').toLowerCase()
      } catch (__) {
        periodParam = 'today'
      }
    }

    // Cálculo das janelas temporais com base na data do servidor (UTC/Local)
    // Suporte a today, yesterday, week, month, year
    const now = new Date()
    let startIso = ''
    let endIso = ''
    let labelPeriod = ''

    const pad = (n) => String(n).padStart(2, '0')
    const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    if (periodParam === 'yesterday' || periodParam === 'ontem') {
      const yesterday = new Date(startOfToday)
      yesterday.setDate(yesterday.getDate() - 1)
      const endYesterday = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        23,
        59,
        59,
        999,
      )
      startIso = yesterday.toISOString()
      endIso = endYesterday.toISOString()
      labelPeriod = `${pad(yesterday.getDate())}/${pad(yesterday.getMonth() + 1)}/${yesterday.getFullYear()}`
    } else if (periodParam === 'week' || periodParam === 'semana') {
      // Semana corrente: de segunda-feira até domingo (ou hoje)
      const dayOfWeek = now.getDay() // 0 = dom, 1 = seg ...
      const diffToMonday = (dayOfWeek + 6) % 7
      const monday = new Date(startOfToday)
      monday.setDate(monday.getDate() - diffToMonday)
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      startIso = monday.toISOString()
      endIso = sunday.toISOString()
      labelPeriod = `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)}/${monday.getFullYear()} a ${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}/${sunday.getFullYear()}`
    } else if (periodParam === 'month' || periodParam === 'mes' || periodParam === 'mês') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      startIso = firstDay.toISOString()
      endIso = lastDay.toISOString()
      labelPeriod = `${pad(firstDay.getDate())}/${pad(firstDay.getMonth() + 1)}/${firstDay.getFullYear()} a ${pad(lastDay.getDate())}/${pad(lastDay.getMonth() + 1)}/${lastDay.getFullYear()}`
    } else if (periodParam === 'year' || periodParam === 'ano') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      const lastDayYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      startIso = firstDayYear.toISOString()
      endIso = lastDayYear.toISOString()
      labelPeriod = `01/01/${now.getFullYear()} a 31/12/${now.getFullYear()}`
    } else {
      // Default: today / hoje
      startIso = startOfToday.toISOString()
      endIso = endOfToday.toISOString()
      labelPeriod = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`
    }

    const startDate = new Date(startIso)
    const endDate = new Date(endIso)

    const isDateInPeriod = (dateVal) => {
      if (!dateVal) return false
      try {
        const d = new Date(dateVal)
        if (isNaN(d.getTime())) return false
        return d >= startDate && d <= endDate
      } catch (_) {
        return false
      }
    }

    // Carregar dados reais das coleções
    let negociacoes = []
    try {
      negociacoes = $app.findRecordsByFilter('negociacoes', '', '-created', 500, 0)
    } catch (e1) {
      console.log('Error loading negociacoes in control tower hook:', e1)
    }

    let chicaoOffers = []
    try {
      chicaoOffers = $app.findRecordsByFilter('chicao_freight_offers', '', '-created', 500, 0)
    } catch (e2) {
      console.log('Error loading chicao_freight_offers:', e2)
    }

    let freightOffers = []
    try {
      freightOffers = $app.findRecordsByFilter('freight_offers', '', '-created', 500, 0)
    } catch (e3) {
      console.log('Error loading freight_offers:', e3)
    }

    let carrierHistory = []
    try {
      carrierHistory = $app.findRecordsByFilter(
        'carrier_operational_history',
        '',
        '-created',
        500,
        0,
      )
    } catch (e4) {
      console.log('Error loading carrier_operational_history:', e4)
    }

    let expeditionTracking = []
    try {
      expeditionTracking = $app.findRecordsByFilter('expedition_tracking', '', '-created', 500, 0)
    } catch (e5) {
      console.log('Error loading expedition_tracking:', e5)
    }

    let auditLogs = []
    try {
      auditLogs = $app.findRecordsByFilter('audit_logs', '', '-created', 1000, 0)
    } catch (e6) {
      console.log('Error loading audit_logs:', e6)
    }

    // MAPAS DE RESULTADOS
    // Cada bucket guarda map por cargoId para assegurar unicidade de carga
    const inNegotiationMap = new Map()
    const withCounterProposalMap = new Map()
    const refusedMap = new Map()
    const inExpeditionMap = new Map()
    const invoicedMap = new Map()

    // Helper para extrair dados da carga a partir de negociacao
    const buildCargoFromNeg = (rec, extraStatus, eventDate) => {
      const cargoId = rec.getString('cargo_id') || rec.getString('negotiation_number') || rec.id
      const weightKg = rec.getFloat('total_weight_kg') || 0
      const weightTon = Math.round((weightKg / 1000) * 100) / 100
      let destinationCity = ''
      let destinationUf = rec.getString('uf') || ''
      const destStr = rec.getString('destination') || ''
      if (destStr.includes('/')) {
        const parts = destStr.split('/')
        destinationCity = parts[0].trim()
        if (!destinationUf && parts[1]) destinationUf = parts[1].trim()
      } else {
        destinationCity = destStr
      }

      // Cliente
      let customerName = 'Clientes Diversos'
      try {
        const rawOrders = rec.get('orders_items_json')
        let ords = []
        if (Array.isArray(rawOrders)) ords = rawOrders
        else if (typeof rawOrders === 'string') ords = JSON.parse(rawOrders)
        if (ords && ords.length > 0) {
          customerName = ords
            .map((o) => o.customerName || o.customerCode)
            .filter(Boolean)
            .slice(0, 2)
            .join('; ')
        }
      } catch (_) {}

      return {
        id: rec.id,
        cargo_id: cargoId,
        transport_number:
          rec.getString('sap_transport_number') || rec.getString('negotiation_number') || cargoId,
        sap_transport_number: rec.getString('sap_transport_number') || '',
        customer_name: customerName,
        destination_city: destinationCity || 'Contagem',
        destination_uf: destinationUf || 'MG',
        itinerary:
          rec.getString('itinerary_description') ||
          rec.getString('itinerary_code') ||
          'Rota Padrão',
        weight_kg: weightKg,
        weight_ton: weightTon,
        driver_name: rec.getString('driver_name') || 'Não atribuído',
        vehicle_plate: rec.getString('vehicle_plate') || 'Aguardando alocação',
        vehicle_type: rec.getString('vehicle_type') || '',
        carrier_name: rec.getString('carrier_name') || 'Transportador em negociação',
        freight_value:
          rec.getFloat('negotiated_freight_value') || rec.getFloat('initial_freight_value') || 0,
        toll_value: rec.getFloat('toll_value') || 0,
        status: extraStatus || rec.getString('status') || 'EM_NEGOCIACAO',
        source_module: 'negociacoes',
        last_movement_at: eventDate || rec.getString('updated') || rec.getString('created'),
        edit_transport_url: rec.getString('sap_transport_number')
          ? `/tms/editar-transporte?transporte=${rec.getString('sap_transport_number')}`
          : `/tms/negociacoes`,
      }
    }

    // Helper a partir de freight_offers
    const buildCargoFromFreightOffer = (rec, extraStatus, eventDate) => {
      const cargoId = rec.getString('cargo_id') || rec.id
      const weightKg = rec.getFloat('weight_kg') || 0
      const weightTon = Math.round((weightKg / 1000) * 100) / 100

      return {
        id: rec.id,
        cargo_id: cargoId,
        transport_number: cargoId,
        sap_transport_number: '',
        customer_name: rec.getString('cargo_description') || 'Carga Operacional',
        destination_city: rec.getString('destination') || '',
        destination_uf: 'MG',
        itinerary: rec.getString('destination') || 'Itinerário Definido',
        weight_kg: weightKg,
        weight_ton: weightTon,
        driver_name: 'Não atribuído',
        vehicle_plate: 'Aguardando alocação',
        vehicle_type: rec.getString('required_vehicle_type') || '',
        carrier_name: 'Mesa de Fretes',
        freight_value: rec.getFloat('floor_value') || 0,
        toll_value: 0,
        status: extraStatus || rec.getString('status') || 'EM_NEGOCIACAO',
        source_module: 'freight_offers',
        last_movement_at: eventDate || rec.getString('updated') || rec.getString('created'),
        edit_transport_url: `/tms/mesa-fretes`,
      }
    }

    // Helper a partir de chicao_freight_offers
    const buildCargoFromChicao = (rec, extraStatus, eventDate) => {
      const cargoId = rec.getString('cargo_id') || rec.getString('offer_code') || rec.id
      const weightKg = rec.getFloat('weight_kg') || 0
      const weightTon = Math.round((weightKg / 1000) * 100) / 100

      return {
        id: rec.id,
        cargo_id: cargoId,
        transport_number:
          rec.getString('sap_transport_number') || rec.getString('offer_code') || cargoId,
        sap_transport_number: rec.getString('sap_transport_number') || '',
        customer_name: rec.getString('cargo_title') || 'Clientes Carga Chicão',
        destination_city: rec.getString('destination_city') || '',
        destination_uf: rec.getString('destination_uf') || 'MG',
        itinerary:
          rec.getString('itinerary_description') ||
          rec.getString('itinerary_code') ||
          'Rota Chicão',
        weight_kg: weightKg,
        weight_ton: weightTon,
        driver_name: rec.getString('driver_name') || 'Não atribuído',
        vehicle_plate: rec.getString('vehicle_plate') || 'Aguardando alocação',
        vehicle_type: rec.getString('vehicle_type') || '',
        carrier_name: rec.getString('carrier_name') || 'Mesa Chicão IA',
        freight_value:
          rec.getFloat('total_offered_value') || rec.getFloat('initial_offer_value') || 0,
        toll_value: rec.getFloat('toll_cost') || 0,
        status: extraStatus || rec.getString('status') || 'EM_NEGOCIACAO',
        source_module: 'chicao_freight_offers',
        last_movement_at: eventDate || rec.getString('updated') || rec.getString('created'),
        edit_transport_url: rec.getString('sap_transport_number')
          ? `/tms/editar-transporte?transporte=${rec.getString('sap_transport_number')}`
          : `/tms/mesa-fretes`,
      }
    }

    // Helper a partir de carrier_operational_history
    const buildCargoFromHistory = (rec, extraStatus, eventDate) => {
      const cargoId =
        rec.getString('transport_order_number') || rec.getString('sap_transport_number') || rec.id
      const weightKg = rec.getFloat('weight_kg') || (rec.getFloat('weight_ton') || 0) * 1000
      const weightTon = rec.getFloat('weight_ton') || Math.round((weightKg / 1000) * 100) / 100

      return {
        id: rec.id,
        cargo_id: cargoId,
        transport_number:
          rec.getString('sap_transport_number') ||
          rec.getString('transport_order_number') ||
          cargoId,
        sap_transport_number: rec.getString('sap_transport_number') || '',
        customer_name: rec.getString('customers_summary') || 'Cliente CIAFAL',
        destination_city: rec.getString('destination_city') || '',
        destination_uf: rec.getString('destination_uf') || '',
        itinerary: rec.getString('itinerary_description') || rec.getString('itinerary_code') || '',
        weight_kg: weightKg,
        weight_ton: weightTon,
        driver_name: rec.getString('driver_name') || '',
        vehicle_plate: rec.getString('vehicle_plate') || '',
        vehicle_type: rec.getString('vehicle_type') || '',
        carrier_name: rec.getString('carrier_name') || '',
        freight_value: rec.getFloat('freight_cost_driver') || 0,
        toll_value: rec.getFloat('toll_cost') || 0,
        status: extraStatus || rec.getString('final_status') || 'FATURADO',
        source_module: 'carrier_operational_history',
        last_movement_at:
          eventDate ||
          rec.getString('invoicing_date') ||
          rec.getString('transport_date') ||
          rec.getString('created'),
        edit_transport_url: rec.getString('sap_transport_number')
          ? `/tms/editar-transporte?transporte=${rec.getString('sap_transport_number')}`
          : `/tms/editar-transporte`,
      }
    }

    // Helper a partir de expedition_tracking
    const buildCargoFromExpedition = (rec, extraStatus, eventDate) => {
      const cargoId = rec.getString('cargo_id') || rec.getString('sap_transport_number') || rec.id
      const weightKg = rec.getFloat('weight_total_kg') || 0
      const weightTon = Math.round((weightKg / 1000) * 100) / 100

      return {
        id: rec.id,
        cargo_id: cargoId,
        transport_number:
          rec.getString('sap_transport_number') || rec.getString('cargo_id') || cargoId,
        sap_transport_number: rec.getString('sap_transport_number') || '',
        customer_name: rec.getString('clients_summary') || 'Expedição Clientes',
        destination_city: rec.getString('destination_cities') || '',
        destination_uf: 'SP',
        itinerary: rec.getString('itinerary_code') || 'Expedição Operacional',
        weight_kg: weightKg,
        weight_ton: weightTon,
        driver_name: rec.getString('driver_name') || 'Definido na Expedição',
        vehicle_plate: rec.getString('vehicle_plate') || '',
        vehicle_type: 'Carreta Convencional',
        carrier_name: rec.getString('carrier_name') || 'Frota CIAFAL',
        freight_value: 0,
        toll_value: 0,
        status: extraStatus || rec.getString('operational_status') || 'EM_EXPEDICAO',
        source_module: 'expedition_tracking',
        last_movement_at: eventDate || rec.getString('updated') || rec.getString('created'),
        edit_transport_url: rec.getString('sap_transport_number')
          ? `/tms/editar-transporte?transporte=${rec.getString('sap_transport_number')}`
          : `/tms/expedicao`,
      }
    }

    // -------------------------------------------------------------
    // EVENTOS DE AUDITORIA & LINHAS DO TEMPO (Histórico Temporal)
    // -------------------------------------------------------------
    // Permite que cargas que mudaram de status continuem aparecendo
    // no período exato em que o evento ocorreu (ex: recusa ontem, faturamento hoje)

    // Mapa de eventos em audit_logs
    for (let i = 0; i < auditLogs.length; i++) {
      const al = auditLogs[i]
      const action = al.getString('action')
      const createdStr = al.getString('created')
      if (!isDateInPeriod(createdStr)) continue

      const resource = al.getString('resource')
      const resourceId = al.getString('resource_id')
      const sapNum = al.getString('sap_transport_number')

      if (
        action === 'OFERTA_RECUSADA' ||
        action === 'RECUSA_NEGOCIACAO' ||
        al.getString('new_state') === 'RECUSADO' ||
        al.getString('new_state') === 'RECUSADA'
      ) {
        const key = sapNum || resourceId || `rec-${al.id}`
        if (!refusedMap.has(key)) {
          refusedMap.set(key, {
            id: al.id,
            cargo_id: key,
            transport_number: sapNum || key,
            sap_transport_number: sapNum || '',
            customer_name: 'Carga com Recusa no Período',
            destination_city: '',
            destination_uf: '',
            itinerary: 'Mesa de Negociação',
            weight_kg: 0,
            weight_ton: 0,
            driver_name: al.getString('user_name') || 'Motorista',
            vehicle_plate: '',
            vehicle_type: '',
            carrier_name: 'Transportador Convocado',
            freight_value: 0,
            toll_value: 0,
            status: 'RECUSADA',
            source_module: 'audit_logs',
            last_movement_at: createdStr,
            edit_transport_url: '/tms/mesa-fretes',
          })
        }
      }
    }

    // -------------------------------------------------------------
    // 1. CARGAS EM NEGOCIAÇÃO (Mesa de Fretes / Chicão)
    // Cargas com negociação aberta ou em andamento no período selecionado
    // -------------------------------------------------------------
    for (let i = 0; i < negociacoes.length; i++) {
      const neg = negociacoes[i]
      const st = neg.getString('status')
      const created = neg.getString('created')
      const updated = neg.getString('updated')
      const openedAt = neg.getString('opened_at') || created

      // Cargas em negociação: status ABERTO ou EM_NEGOCIACAO
      if (st === 'EM_NEGOCIACAO' || st === 'ABERTO') {
        // Se a negociação estava ativa ou foi aberta/movimentada no período selecionado
        const relevantDate = updated || openedAt || created
        if (isDateInPeriod(relevantDate) || isDateInPeriod(openedAt)) {
          const item = buildCargoFromNeg(neg, 'EM_NEGOCIACAO', relevantDate)
          inNegotiationMap.set(item.cargo_id, item)
        }
      }
    }

    for (let i = 0; i < chicaoOffers.length; i++) {
      const off = chicaoOffers[i]
      const st = off.getString('status')
      const relevantDate = off.getString('updated') || off.getString('created')
      if (
        [
          'DISPONIVEL',
          'SELECIONADO',
          'ENVIADO_CHICAO',
          'OFERTA_ENVIADA',
          'VISUALIZADA',
          'EM_NEGOCIACAO',
        ].includes(st)
      ) {
        if (isDateInPeriod(relevantDate)) {
          const item = buildCargoFromChicao(off, 'EM_NEGOCIACAO', relevantDate)
          if (!inNegotiationMap.has(item.cargo_id)) {
            inNegotiationMap.set(item.cargo_id, item)
          }
        }
      }
    }

    for (let i = 0; i < freightOffers.length; i++) {
      const fo = freightOffers[i]
      const st = fo.getString('status')
      const relevantDate = fo.getString('updated') || fo.getString('created')
      if (
        [
          'rascunho',
          'janela_porta_aberta',
          'janela_fora_aberta',
          'negociacao',
          'PORTA_OPEN',
          'FORA_OPEN',
        ].includes(st)
      ) {
        if (isDateInPeriod(relevantDate)) {
          const item = buildCargoFromFreightOffer(fo, 'EM_NEGOCIACAO', relevantDate)
          if (!inNegotiationMap.has(item.cargo_id)) {
            inNegotiationMap.set(item.cargo_id, item)
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 2. CARGAS COM CONTRAPROPOSTA
    // Cargas com contraproposta de frete e negociação ainda pendente
    // -------------------------------------------------------------
    for (let i = 0; i < negociacoes.length; i++) {
      const neg = negociacoes[i]
      const st = neg.getString('status')
      // Verifica se possui contraproposta no array counter_proposals_json e ainda não foi concluída
      let counterProposals = []
      try {
        const rawCp = neg.get('counter_proposals_json')
        if (Array.isArray(rawCp)) counterProposals = rawCp
        else if (typeof rawCp === 'string') counterProposals = JSON.parse(rawCp)
      } catch (_) {
        counterProposals = []
      }

      const hasPendingCounter = counterProposals.some(
        (cp) => cp && (cp.sender === 'MOTORISTA' || cp.round > 1),
      )
      if (hasPendingCounter && (st === 'EM_NEGOCIACAO' || st === 'ABERTO')) {
        const relevantDate = neg.getString('updated') || neg.getString('created')
        if (isDateInPeriod(relevantDate)) {
          const item = buildCargoFromNeg(neg, 'CONTRAPROPOSTA_PENDENTE', relevantDate)
          withCounterProposalMap.set(item.cargo_id, item)
        }
      }
    }

    for (let i = 0; i < chicaoOffers.length; i++) {
      const off = chicaoOffers[i]
      const st = off.getString('status')
      const counterVal = off.getFloat('counter_value_requested') || 0
      if ((st === 'CONTRAPROPOSTA' || counterVal > 0) && st !== 'ACEITA' && st !== 'RECUSADA') {
        const relevantDate = off.getString('updated') || off.getString('created')
        if (isDateInPeriod(relevantDate)) {
          const item = buildCargoFromChicao(off, 'CONTRAPROPOSTA', relevantDate)
          withCounterProposalMap.set(item.cargo_id, item)
        }
      }
    }

    // -------------------------------------------------------------
    // 3. CARGAS RECUSADAS
    // Ofertas/cargas recusadas dentro do período selecionado.
    // UMA mesma carga conta como UMA carga única.
    // -------------------------------------------------------------
    for (let i = 0; i < negociacoes.length; i++) {
      const neg = negociacoes[i]
      const st = neg.getString('status')
      const concludedAt =
        neg.getString('concluded_at') || neg.getString('updated') || neg.getString('created')
      if (st === 'RECUSADO' || st === 'RECUSADA') {
        if (isDateInPeriod(concludedAt)) {
          const item = buildCargoFromNeg(neg, 'RECUSADA', concludedAt)
          refusedMap.set(item.cargo_id, item)
        }
      }
    }

    for (let i = 0; i < chicaoOffers.length; i++) {
      const off = chicaoOffers[i]
      const st = off.getString('status')
      const relevantDate = off.getString('updated') || off.getString('created')
      if (st === 'RECUSADA' || st === 'RECUSADO') {
        if (isDateInPeriod(relevantDate)) {
          const item = buildCargoFromChicao(off, 'RECUSADA', relevantDate)
          // Se já existe, preserva (cargas únicas)
          if (!refusedMap.has(item.cargo_id)) {
            refusedMap.set(item.cargo_id, item)
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 4. CARGAS EM EXPEDIÇÃO
    // Cargas com transporte definido que entraram no processo operacional
    // de expedição/carregamento mas ainda NÃO faturadas/concluídas.
    // -------------------------------------------------------------
    for (let i = 0; i < expeditionTracking.length; i++) {
      const exp = expeditionTracking[i]
      const opSt = exp.getString('operational_status')
      const relevantDate =
        exp.getString('updated') || exp.getString('created') || exp.getString('entry_time')
      // Estados operacionais de expedição que NÃO são FATURADO ou SAIDA_DO_PATIO
      if (!['FATURADO', 'LIBERADO', 'SAIDA_DO_PATIO', 'EM_VIAGEM'].includes(opSt)) {
        if (isDateInPeriod(relevantDate)) {
          const item = buildCargoFromExpedition(exp, opSt, relevantDate)
          inExpeditionMap.set(item.cargo_id, item)
        }
      }
    }

    for (let i = 0; i < carrierHistory.length; i++) {
      const ch = carrierHistory[i]
      const finalSt = ch.getString('final_status')
      const relevantDate =
        ch.getString('updated') || ch.getString('created') || ch.getString('transport_date')
      if (
        finalSt === 'EM_EXPEDICAO' ||
        (finalSt !== 'CONCLUIDO' && finalSt !== 'FATURADO' && !ch.getString('invoicing_date'))
      ) {
        if (isDateInPeriod(relevantDate)) {
          const item = buildCargoFromHistory(ch, 'EM_EXPEDICAO', relevantDate)
          if (!inExpeditionMap.has(item.cargo_id)) {
            inExpeditionMap.set(item.cargo_id, item)
          }
        }
      }
    }

    // Negociações CONCLUÍDAS que ainda não foram faturadas e estão em preparação/expedição
    for (let i = 0; i < negociacoes.length; i++) {
      const neg = negociacoes[i]
      const st = neg.getString('status')
      const sapPipe = neg.getString('sap_pipeline_status')
      const concludedAt =
        neg.getString('concluded_at') || neg.getString('acceptance_at') || neg.getString('updated')
      if (
        st === 'CONCLUIDA' &&
        sapPipe !== 'FATURADO' &&
        !invoicedMap.has(neg.getString('cargo_id'))
      ) {
        if (isDateInPeriod(concludedAt)) {
          const item = buildCargoFromNeg(neg, 'EM_EXPEDICAO_AGUARDANDO_FAT', concludedAt)
          if (!inExpeditionMap.has(item.cargo_id)) {
            inExpeditionMap.set(item.cargo_id, item)
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 5. CARGAS FATURADAS
    // Cargas efetivamente faturadas dentro do período selecionado,
    // usando informação do fluxo TMS / SAP (invoicing_date / marcos de expedição / carrier_operational_history)
    // -------------------------------------------------------------
    for (let i = 0; i < carrierHistory.length; i++) {
      const ch = carrierHistory[i]
      const invDate = ch.getString('invoicing_date')
      const finalSt = ch.getString('final_status')
      // Considerar apenas se tiver invoicing_date no período ou se for CONCLUIDO com invoicing_date
      if (invDate && isDateInPeriod(invDate)) {
        const item = buildCargoFromHistory(ch, 'FATURADO', invDate)
        invoicedMap.set(item.cargo_id, item)
      } else if (!invDate && finalSt === 'CONCLUIDO') {
        const tDate = ch.getString('transport_date') || ch.getString('updated')
        if (isDateInPeriod(tDate)) {
          const item = buildCargoFromHistory(ch, 'FATURADO', tDate)
          if (!invoicedMap.has(item.cargo_id)) {
            invoicedMap.set(item.cargo_id, item)
          }
        }
      }
    }

    for (let i = 0; i < expeditionTracking.length; i++) {
      const exp = expeditionTracking[i]
      const opSt = exp.getString('operational_status')
      const relevantDate = exp.getString('updated') || exp.getString('created')
      if (['FATURADO', 'LIBERADO'].includes(opSt) && isDateInPeriod(relevantDate)) {
        const item = buildCargoFromExpedition(exp, 'FATURADO', relevantDate)
        if (!invoicedMap.has(item.cargo_id)) {
          invoicedMap.set(item.cargo_id, item)
        }
      }
    }

    // CÁLCULO DE TOTAIS E TONELAGENS (com padrão brasileiro de formatação)
    const computeBucket = (itemsMap) => {
      const list = Array.from(itemsMap.values())
      const loads = list.length
      const totalKg = list.reduce((acc, it) => acc + (it.weight_kg || it.weight_ton * 1000 || 0), 0)
      const tons = Math.round((totalKg / 1000) * 100) / 100
      const tonsFormatted =
        loads > 0
          ? tons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
            ' t'
          : '0,00 t'
      const loadsFormatted = loads > 0 ? `${loads} ${loads === 1 ? 'carga' : 'cargas'}` : '0 cargas'

      return {
        loads,
        tons,
        loads_formatted: loadsFormatted,
        tons_formatted: tonsFormatted,
        items: list,
      }
    }

    const emNegociacao = computeBucket(inNegotiationMap)
    const comContraproposta = computeBucket(withCounterProposalMap)
    const recusadas = computeBucket(refusedMap)
    const emExpedicao = computeBucket(inExpeditionMap)
    const faturadas = computeBucket(invoicedMap)

    return e.json(200, {
      success: true,
      period: periodParam,
      period_label: labelPeriod,
      range: {
        start: startIso,
        end: endIso,
      },
      fluxo_cargas: {
        em_negociacao: emNegociacao,
        com_contraproposta: comContraproposta,
        recusadas: recusadas,
        em_expedicao: emExpedicao,
        faturadas: faturadas,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.log('Error in control tower summary hook:', err)
    return e.json(500, {
      success: false,
      error: 'Falha ao processar resumo da Torre de Controle: ' + (err.message || String(err)),
    })
  }
})
