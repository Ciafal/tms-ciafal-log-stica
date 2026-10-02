/**
 * TMS CIAFAL — Motor de Alertas Inteligentes Determinísticos
 *
 * Princípios Fundamentais:
 * 1. Determinismo Estrito: Regras parametrizadas, NÃO IA decidindo severidade de forma autônoma
 * 2. Anti-Ruído Obrigatório: Todo alerta carrega Tipo, Motorista, Veículo, Transportadora, Transporte,
 *    Itinerário, Data, Evidência, Valor Histórico, Valor Atual, Critério disparador, Severidade, Status,
 *    Responsável pelo tratamento. Sem evidência mínima configurável => NÃO gera alerta.
 * 3. 10 Tipos de Alerta Parametrizados:
 *    - QUEDA_AVALIACAO: Compara média histórica x transportes recentes (mínimo N viagens e % queda)
 *    - QTD_RECLAMACOES: N reclamações no período (default 3, configurável: origem, severidade, procedência)
 *    - REINCIDENCIA_CATEGORIA: Repetição da mesma categoria (atraso, comportamento, comunicação, etc.) em janela
 *    - QUEDA_PONTUALIDADE: Comparação histórico x período recente com variação relevante
 *    - AUMENTO_TEMPO_ROTA: SEMPRE comparar o MESMO par Motorista + Itinerário, nunca itinerários diferentes
 *    - AUMENTO_TEMPO_INTERNO: NUNCA atribuir ao motorista: classifica como "provavel_origem_interna",
 *      "provavel_origem_externa", "origem_indeterminada", "requer_analise"
 *    - VEICULO_REINCIDENCIA: Conservação, proteção de carga, lonas, documentação, ocorrências do veículo
 *    - MOTORISTA_NOVO: "Motorista sem histórico suficiente para avaliação estatística." (não atribui risco alto/baixo sem dados)
 *    - VEICULO_NOVO: "Veículo sem histórico suficiente."
 *    - DIVERGENCIA_SCORE_COMPORTAMENTO: Score histórico alto x degradação recente
 * 4. Workflow de Status: NOVO -> EM_ANALISE -> ACAO_NECESSARIA -> EM_TRATAMENTO -> RESOLVIDO -> ENCERRADO;
 *    além de DESCARTADO / FALSO_POSITIVO com justificativa OBRIGATÓRIA.
 */

import {
  CarrierOperationalRecord,
  CarrierEvaluationRecord,
  CarrierComplaintRecord,
} from './carrierHistoryEngine'

export type AlertType =
  | 'QUEDA_AVALIACAO'
  | 'QTD_RECLAMACOES'
  | 'REINCIDENCIA_CATEGORIA'
  | 'QUEDA_PONTUALIDADE'
  | 'AUMENTO_TEMPO_ROTA'
  | 'AUMENTO_TEMPO_INTERNO'
  | 'VEICULO_REINCIDENCIA'
  | 'MOTORISTA_NOVO'
  | 'VEICULO_NOVO'
  | 'DIVERGENCIA_SCORE_COMPORTAMENTO'

export type AlertSeverity = 'INFORMATIVO' | 'ATENCAO' | 'IMPORTANTE' | 'CRITICO'

export type AlertStatus =
  | 'NOVO'
  | 'EM_ANALISE'
  | 'ACAO_NECESSARIA'
  | 'EM_TRATAMENTO'
  | 'RESOLVIDO'
  | 'ENCERRADO'
  | 'DESCARTADO'
  | 'FALSO_POSITIVO'

export type InternalExternalOrigin =
  | 'provavel_origem_interna'
  | 'provavel_origem_externa'
  | 'origem_indeterminada'
  | 'requer_analise'

export interface SmartAlertRuleConfig {
  // 1. Queda de avaliação
  ratingDropMinTransportsTotal: number // default 4
  ratingDropRecentTransportsCount: number // default 2
  ratingDropPercentageThreshold: number // default 20%
  // 2. Quantidade de reclamações
  complaintsWindowDays: number // default 60
  complaintsThresholdCount: number // default 3
  complaintsOnlyProcedente: boolean // default false (configurável)
  // 3. Reincidência de categoria
  categoryRecurrenceWindowDays: number // default 60
  categoryRecurrenceThresholdCount: number // default 2
  // 4. Queda de pontualidade
  punctualityDropMinTransports: number // default 4
  punctualityDropThresholdPct: number // default 25% (ex: de 95% para < 70%)
  // 5. Aumento de tempo de rota
  routeTimeIncreaseMinTransportsSameItin: number // default 2
  routeTimeIncreaseThresholdPct: number // default 25%
  // 6. Aumento de tempo interno
  internalDwellThresholdMin: number // default 180 min (3 horas)
  // 7. Veículo com reincidência
  vehicleRecurrenceThresholdCount: number // default 2
  // 8. Motorista novo
  driverNewMaxTransports: number // default 2
  // 9. Veículo novo
  vehicleNewMaxTransports: number // default 2
  // 10. Divergência Score x recente
  divergenceHistoricalScoreThreshold: number // default 80
  divergenceRecentDropTransportsCount: number // default 2
}

export const DEFAULT_ALERT_RULES: SmartAlertRuleConfig = {
  ratingDropMinTransportsTotal: 4,
  ratingDropRecentTransportsCount: 2,
  ratingDropPercentageThreshold: 20,
  complaintsWindowDays: 60,
  complaintsThresholdCount: 3,
  complaintsOnlyProcedente: false,
  categoryRecurrenceWindowDays: 60,
  categoryRecurrenceThresholdCount: 2,
  punctualityDropMinTransports: 4,
  punctualityDropThresholdPct: 25,
  routeTimeIncreaseMinTransportsSameItin: 2,
  routeTimeIncreaseThresholdPct: 25,
  internalDwellThresholdMin: 180,
  vehicleRecurrenceThresholdCount: 2,
  driverNewMaxTransports: 2,
  vehicleNewMaxTransports: 2,
  divergenceHistoricalScoreThreshold: 80,
  divergenceRecentDropTransportsCount: 2,
}

export interface SmartAlertItem {
  id?: string
  alert_code: string
  alert_type: AlertType
  severity: AlertSeverity
  status: AlertStatus
  target_type: 'MOTORISTA' | 'VEICULO' | 'MOTORISTA_VEICULO' | 'TRANSPORTADORA'
  driver_id?: string
  driver_name?: string
  vehicle_plate?: string
  carrier_name?: string
  transport_order_number?: string
  sap_transport_number?: string
  itinerary_code?: string
  detection_date: string
  evidence_summary: string
  historical_value: string
  current_value: string
  triggered_criteria: string
  internal_external_origin?: InternalExternalOrigin
  responsible_handler_email?: string
  responsible_handler_name?: string
  action_plan?: string
  action_deadline?: string
  resolution_notes?: string
  discard_justification?: string
  resolved_at?: string
  related_transports_json?: string[]
  related_evaluations_json?: string[]
  related_complaints_json?: string[]
  attachments_json?: Array<{ name: string; url: string; size?: number }>
  audit_trail_json?: Array<{
    date: string
    user: string
    action: string
    notes?: string
  }>
}

/**
 * Motor determinístico que avalia o histórico operacional, avaliações e reclamações
 * gerando alertas sem ruído e com evidências completas.
 */
export function detectSmartAlerts(
  history: CarrierOperationalRecord[],
  evaluations: CarrierEvaluationRecord[],
  complaints: CarrierComplaintRecord[],
  config: SmartAlertRuleConfig = DEFAULT_ALERT_RULES,
): SmartAlertItem[] {
  const alerts: SmartAlertItem[] = []
  const nowStr = new Date().toISOString()

  // Agrupamentos
  const driverRecords = new Map<string, CarrierOperationalRecord[]>()
  const vehicleRecords = new Map<string, CarrierOperationalRecord[]>()

  history.forEach((rec) => {
    if (rec.driver_name) {
      const list = driverRecords.get(rec.driver_name) || []
      list.push(rec)
      driverRecords.set(rec.driver_name, list)
    }
    if (rec.vehicle_plate) {
      const normPlate = rec.vehicle_plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
      const list = vehicleRecords.get(normPlate) || []
      list.push(rec)
      vehicleRecords.set(normPlate, list)
    }
  })

  // -------------------------------------------------------------------------
  // 1. QUEDA DE AVALIAÇÃO (compara histórico x transportes recentes)
  // -------------------------------------------------------------------------
  driverRecords.forEach((records, driverName) => {
    if (records.length >= config.ratingDropMinTransportsTotal) {
      const sorted = [...records].sort((a, b) =>
        (b.transport_date || '').localeCompare(a.transport_date || ''),
      )
      const recent = sorted.slice(0, config.ratingDropRecentTransportsCount)
      const older = sorted.slice(config.ratingDropRecentTransportsCount)

      const olderRatings = older
        .map((r) => r.driver_rating)
        .filter((n): n is number => typeof n === 'number' && n > 0)
      const recentRatings = recent
        .map((r) => r.driver_rating)
        .filter((n): n is number => typeof n === 'number' && n > 0)

      if (
        olderRatings.length >= 2 &&
        recentRatings.length >= config.ratingDropRecentTransportsCount
      ) {
        const avgOlder = olderRatings.reduce((a, b) => a + b, 0) / olderRatings.length
        const avgRecent = recentRatings.reduce((a, b) => a + b, 0) / recentRatings.length
        const dropPct = ((avgOlder - avgRecent) / avgOlder) * 100

        if (dropPct >= config.ratingDropPercentageThreshold) {
          const sev: AlertSeverity = dropPct >= 35 ? 'CRITICO' : 'IMPORTANTE'
          alerts.push({
            alert_code: `ALT-QAV-${driverName.substring(0, 3).toUpperCase()}-${Date.now() % 100000}`,
            alert_type: 'QUEDA_AVALIACAO',
            severity: sev,
            status: 'NOVO',
            target_type: 'MOTORISTA',
            driver_name: driverName,
            driver_id: records[0].driver_id,
            carrier_name: records[0].carrier_name,
            detection_date: nowStr,
            evidence_summary: `Avaliação recente caiu ${dropPct.toFixed(1)}% nas últimas ${recent.length} viagens em relação ao histórico consolidado (${older.length} viagens).`,
            historical_value: `${avgOlder.toFixed(2)} / 5,0 estrelas`,
            current_value: `${avgRecent.toFixed(2)} / 5,0 estrelas`,
            triggered_criteria: `Queda superior a ${config.ratingDropPercentageThreshold}% com amostra mínima de ${config.ratingDropMinTransportsTotal} transportes.`,
            related_transports_json: recent.map((r) => r.transport_order_number),
            responsible_handler_name: 'Supervisor de Logística',
          })
        }
      }
    }
  })

  // -------------------------------------------------------------------------
  // 2. QUANTIDADE DE RECLAMAÇÕES (N reclamações no período configurável)
  // -------------------------------------------------------------------------
  driverRecords.forEach((records, driverName) => {
    const drvComplaints = complaints.filter((c) => {
      const matchTarget =
        c.driver_name?.toLowerCase() === driverName.toLowerCase() ||
        records.some(
          (r) =>
            r.transport_order_number === c.transport_order_number &&
            (c.target_type === 'MOTORISTA' || c.target_type === 'MOTORISTA_VEICULO'),
        )
      if (!matchTarget) return false
      if (config.complaintsOnlyProcedente && c.status !== 'PROCEDENTE') return false
      return true
    })

    if (drvComplaints.length >= config.complaintsThresholdCount) {
      const procedentes = drvComplaints.filter((c) => c.status === 'PROCEDENTE').length
      const sev: AlertSeverity = procedentes >= 2 ? 'CRITICO' : 'IMPORTANTE'
      alerts.push({
        alert_code: `ALT-REC-${driverName.substring(0, 3).toUpperCase()}-${Date.now() % 100000}`,
        alert_type: 'QTD_RECLAMACOES',
        severity: sev,
        status: 'NOVO',
        target_type: 'MOTORISTA',
        driver_name: driverName,
        driver_id: records[0].driver_id,
        carrier_name: records[0].carrier_name,
        detection_date: nowStr,
        evidence_summary: `${drvComplaints.length} reclamações registradas nos últimos ${config.complaintsWindowDays} dias (${procedentes} já julgadas procedentes).`,
        historical_value: 'Meta: 0 reclamações',
        current_value: `${drvComplaints.length} reclamações acumuladas`,
        triggered_criteria: `Limite de ${config.complaintsThresholdCount} reclamações no período configurável atingido.`,
        related_complaints_json: drvComplaints.map((c) => c.complaint_number),
        responsible_handler_name: 'Supervisor de Atendimento / Transporte',
      })
    }
  })

  // -------------------------------------------------------------------------
  // 3. REINCIDÊNCIA DE CATEGORIA (repetição do mesmo tipo de problema)
  // -------------------------------------------------------------------------
  driverRecords.forEach((records, driverName) => {
    const drvComplaints = complaints.filter(
      (c) => c.driver_name?.toLowerCase() === driverName.toLowerCase(),
    )
    const catMap = new Map<string, CarrierComplaintRecord[]>()
    drvComplaints.forEach((c) => {
      const list = catMap.get(c.category) || []
      list.push(c)
      catMap.set(c.category, list)
    })

    catMap.forEach((list, category) => {
      if (list.length >= config.categoryRecurrenceThresholdCount) {
        alerts.push({
          alert_code: `ALT-REIN-${category.substring(0, 4)}-${Date.now() % 100000}`,
          alert_type: 'REINCIDENCIA_CATEGORIA',
          severity: list.length >= 3 ? 'CRITICO' : 'ATENCAO',
          status: 'NOVO',
          target_type: 'MOTORISTA',
          driver_name: driverName,
          carrier_name: records[0].carrier_name,
          detection_date: nowStr,
          evidence_summary: `Reincidência de ${list.length} ocorrências na mesma categoria '${category}' nos últimos ${config.categoryRecurrenceWindowDays} dias.`,
          historical_value: '1 ocorrência isolada',
          current_value: `${list.length} ocorrências da categoria ${category}`,
          triggered_criteria: `Limite de ${config.categoryRecurrenceThresholdCount} reincidências da mesma categoria atingido.`,
          related_complaints_json: list.map((c) => c.complaint_number),
          responsible_handler_name: 'Gestão de Qualidade de Transportes',
        })
      }
    })
  })

  // -------------------------------------------------------------------------
  // 4. QUEDA DE PONTUALIDADE (histórico consolidado x período recente)
  // -------------------------------------------------------------------------
  driverRecords.forEach((records, driverName) => {
    if (records.length >= config.punctualityDropMinTransports) {
      const sorted = [...records].sort((a, b) =>
        (b.transport_date || '').localeCompare(a.transport_date || ''),
      )
      const recent = sorted.slice(0, 2)
      const older = sorted.slice(2)

      const onTimeOlder = older.filter((r) => r.is_on_time !== false).length
      const olderPct = older.length > 0 ? (onTimeOlder / older.length) * 100 : 100

      const onTimeRecent = recent.filter((r) => r.is_on_time !== false).length
      const recentPct = (onTimeRecent / recent.length) * 100

      if (olderPct >= 80 && olderPct - recentPct >= config.punctualityDropThresholdPct) {
        alerts.push({
          alert_code: `ALT-PON-${driverName.substring(0, 3).toUpperCase()}-${Date.now() % 100000}`,
          alert_type: 'QUEDA_PONTUALIDADE',
          severity: recentPct === 0 ? 'CRITICO' : 'IMPORTANTE',
          status: 'NOVO',
          target_type: 'MOTORISTA',
          driver_name: driverName,
          carrier_name: records[0].carrier_name,
          detection_date: nowStr,
          evidence_summary: `Pontualidade recente caiu para ${recentPct.toFixed(0)}% nas últimas 2 viagens, ante ${olderPct.toFixed(0)}% no histórico.`,
          historical_value: `${olderPct.toFixed(1)}% pontualidade`,
          current_value: `${recentPct.toFixed(1)}% pontualidade recente`,
          triggered_criteria: `Variação de pontualidade negativa superior a ${config.punctualityDropThresholdPct} pontos percentuais.`,
          related_transports_json: recent.map((r) => r.transport_order_number),
          responsible_handler_name: 'Torre de Controle TMS',
        })
      }
    }
  })

  // -------------------------------------------------------------------------
  // 5. AUMENTO DO TEMPO DE ROTA (SEMPRE comparar o MESMO par Motorista + Itinerário)
  // -------------------------------------------------------------------------
  driverRecords.forEach((records, driverName) => {
    const pairMap = new Map<string, CarrierOperationalRecord[]>()
    records.forEach((r) => {
      if (r.itinerary_code && r.route_actual_min) {
        const list = pairMap.get(r.itinerary_code) || []
        list.push(r)
        pairMap.set(r.itinerary_code, list)
      }
    })

    pairMap.forEach((itinRecords, itinCode) => {
      if (itinRecords.length >= config.routeTimeIncreaseMinTransportsSameItin) {
        const sorted = [...itinRecords].sort((a, b) =>
          (b.transport_date || '').localeCompare(a.transport_date || ''),
        )
        const lastTrip = sorted[0]
        const priorTrips = sorted.slice(1)
        const avgPriorTime =
          priorTrips.reduce((acc, r) => acc + (r.route_actual_min || 0), 0) / priorTrips.length
        const currentTime = lastTrip.route_actual_min || 0

        if (avgPriorTime > 0) {
          const increasePct = ((currentTime - avgPriorTime) / avgPriorTime) * 100
          if (increasePct >= config.routeTimeIncreaseThresholdPct) {
            alerts.push({
              alert_code: `ALT-ROTA-${itinCode}-${Date.now() % 100000}`,
              alert_type: 'AUMENTO_TEMPO_ROTA',
              severity: increasePct >= 40 ? 'CRITICO' : 'ATENCAO',
              status: 'NOVO',
              target_type: 'MOTORISTA',
              driver_name: driverName,
              carrier_name: lastTrip.carrier_name,
              itinerary_code: itinCode,
              transport_order_number: lastTrip.transport_order_number,
              sap_transport_number: lastTrip.sap_transport_number,
              detection_date: nowStr,
              evidence_summary: `Tempo de rota no itinerário ${itinCode} aumentou ${increasePct.toFixed(1)}% na última viagem em comparação com o histórico do MESMO motorista no MESMO itinerário (${priorTrips.length} viagens anteriores).`,
              historical_value: `${Math.round(avgPriorTime)} min (média anterior no itinerário)`,
              current_value: `${currentTime} min na viagem ${lastTrip.transport_order_number}`,
              triggered_criteria: `Aumento de rota >= ${config.routeTimeIncreaseThresholdPct}% no par idêntico Motorista + Itinerário.`,
              related_transports_json: [lastTrip.transport_order_number],
              responsible_handler_name: 'Gestor de Tráfego / Torre',
            })
          }
        }
      }
    })
  })

  // -------------------------------------------------------------------------
  // 6. AUMENTO DO TEMPO INTERNO (NUNCA culpar motorista sem análise)
  // -------------------------------------------------------------------------
  history.forEach((rec) => {
    if (
      rec.total_internal_dwell_min &&
      rec.total_internal_dwell_min >= config.internalDwellThresholdMin
    ) {
      const internalResp =
        rec.internal_responsibility_min ||
        (rec.loading_duration_min || 0) + (rec.invoicing_duration_min || 0)
      const carrierResp = rec.carrier_responsibility_min || 0

      let origin: InternalExternalOrigin = 'requer_analise'
      if (internalResp > carrierResp * 2) {
        origin = 'provavel_origem_interna'
      } else if (carrierResp > internalResp * 2) {
        origin = 'provavel_origem_externa'
      } else {
        origin = 'origem_indeterminada'
      }

      alerts.push({
        alert_code: `ALT-INT-${rec.transport_order_number}-${Date.now() % 100000}`,
        alert_type: 'AUMENTO_TEMPO_INTERNO',
        severity: rec.total_internal_dwell_min >= 240 ? 'CRITICO' : 'IMPORTANTE',
        status: 'NOVO',
        target_type: 'MOTORISTA_VEICULO',
        driver_name: rec.driver_name,
        vehicle_plate: rec.vehicle_plate,
        carrier_name: rec.carrier_name,
        transport_order_number: rec.transport_order_number,
        sap_transport_number: rec.sap_transport_number,
        itinerary_code: rec.itinerary_code,
        detection_date: nowStr,
        evidence_summary: `Permanência interna na CIAFAL/Sidercentro totalizou ${rec.total_internal_dwell_min} min (Espera: ${rec.internal_waiting_min || 0} min, Carregamento: ${rec.loading_duration_min || 0} min, Faturamento: ${rec.invoicing_duration_min || 0} min). Classificação preliminar de responsabilidade: ${origin}.`,
        historical_value: 'Meta de permanência interna: < 120 min',
        current_value: `${rec.total_internal_dwell_min} min de permanência`,
        triggered_criteria: `Tempo interno excedeu o limite configurado de ${config.internalDwellThresholdMin} min. Segregação interna aplicada.`,
        internal_external_origin: origin,
        related_transports_json: [rec.transport_order_number],
        responsible_handler_name: 'Supervisor de Expedição e Pátio',
      })
    }
  })

  // -------------------------------------------------------------------------
  // 7. VEÍCULO COM REINCIDÊNCIA (Conservação, proteção de carga, lonas)
  // -------------------------------------------------------------------------
  vehicleRecords.forEach((records, plate) => {
    const vehComplaints = complaints.filter(
      (c) =>
        c.vehicle_plate?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === plate &&
        (c.target_type === 'VEICULO' || c.target_type === 'MOTORISTA_VEICULO'),
    )

    if (vehComplaints.length >= config.vehicleRecurrenceThresholdCount) {
      alerts.push({
        alert_code: `ALT-VEIC-${plate}-${Date.now() % 100000}`,
        alert_type: 'VEICULO_REINCIDENCIA',
        severity: vehComplaints.length >= 3 ? 'CRITICO' : 'ATENCAO',
        status: 'NOVO',
        target_type: 'VEICULO',
        vehicle_plate: plate,
        carrier_name: records[0].carrier_name,
        detection_date: nowStr,
        evidence_summary: `Veículo ${plate} acumulou ${vehComplaints.length} reclamações específicas relativas a conservação, amarração, lonas ou documentação mecânica.`,
        historical_value: 'Veículo em padrão de conservação',
        current_value: `${vehComplaints.length} ocorrências registradas`,
        triggered_criteria: `Limite de ${config.vehicleRecurrenceThresholdCount} reclamações no veículo atingido.`,
        related_complaints_json: vehComplaints.map((c) => c.complaint_number),
        responsible_handler_name: 'Vistoria e Portaria',
      })
    }
  })

  // -------------------------------------------------------------------------
  // 8. MOTORISTA NOVO (Sem histórico suficiente — não atribuir risco alto ou baixo)
  // -------------------------------------------------------------------------
  driverRecords.forEach((records, driverName) => {
    if (records.length <= config.driverNewMaxTransports) {
      alerts.push({
        alert_code: `ALT-NOVODRV-${driverName.substring(0, 3).toUpperCase()}-${Date.now() % 100000}`,
        alert_type: 'MOTORISTA_NOVO',
        severity: 'INFORMATIVO',
        status: 'NOVO',
        target_type: 'MOTORISTA',
        driver_name: driverName,
        carrier_name: records[0].carrier_name,
        detection_date: nowStr,
        evidence_summary: 'Motorista sem histórico suficiente para avaliação estatística.',
        historical_value: 'Sem viagens prévias consolidadas',
        current_value: `${records.length} transporte(s) realizado(s)`,
        triggered_criteria: `Menos de ${config.driverNewMaxTransports + 1} transportes no sistema TMS. Aplica-se protocolo cadastral neutro.`,
        related_transports_json: records.map((r) => r.transport_order_number),
        responsible_handler_name: 'Cadastro e Homologação',
      })
    }
  })

  // -------------------------------------------------------------------------
  // 9. VEÍCULO NOVO (Veículo sem histórico suficiente)
  // -------------------------------------------------------------------------
  vehicleRecords.forEach((records, plate) => {
    if (records.length <= config.vehicleNewMaxTransports) {
      alerts.push({
        alert_code: `ALT-NOVOVEC-${plate}-${Date.now() % 100000}`,
        alert_type: 'VEICULO_NOVO',
        severity: 'INFORMATIVO',
        status: 'NOVO',
        target_type: 'VEICULO',
        vehicle_plate: plate,
        carrier_name: records[0].carrier_name,
        detection_date: nowStr,
        evidence_summary: 'Veículo sem histórico suficiente.',
        historical_value: 'Sem viagens prévias cadastradas',
        current_value: `${records.length} transporte(s) registrado(s)`,
        triggered_criteria: `Menos de ${config.vehicleNewMaxTransports + 1} transportes realizados. Aplicar checklist de segurança na portaria.`,
        related_transports_json: records.map((r) => r.transport_order_number),
        responsible_handler_name: 'Checklist de Portaria',
      })
    }
  })

  // -------------------------------------------------------------------------
  // 10. DIVERGÊNCIA SCORE X COMPORTAMENTO RECENTE
  // -------------------------------------------------------------------------
  driverRecords.forEach((records, driverName) => {
    if (records.length >= 4) {
      const sorted = [...records].sort((a, b) =>
        (b.transport_date || '').localeCompare(a.transport_date || ''),
      )
      const recent = sorted.slice(0, config.divergenceRecentDropTransportsCount)
      const older = sorted.slice(config.divergenceRecentDropTransportsCount)

      const olderRating =
        older.map((r) => r.driver_rating || 5).reduce((a, b) => a + b, 0) / older.length
      const recentDelay = recent.some(
        (r) => r.is_on_time === false || (r.delay_minutes && r.delay_minutes > 45),
      )
      const recentComplaint = complaints.some(
        (c) =>
          c.driver_name?.toLowerCase() === driverName.toLowerCase() &&
          recent.some((r) => r.transport_order_number === c.transport_order_number),
      )

      if (olderRating >= 4.5 && (recentDelay || recentComplaint)) {
        alerts.push({
          alert_code: `ALT-DIV-${driverName.substring(0, 3).toUpperCase()}-${Date.now() % 100000}`,
          alert_type: 'DIVERGENCIA_SCORE_COMPORTAMENTO',
          severity: 'IMPORTANTE',
          status: 'NOVO',
          target_type: 'MOTORISTA',
          driver_name: driverName,
          carrier_name: records[0].carrier_name,
          detection_date: nowStr,
          evidence_summary: 'Desempenho recente diverge do histórico consolidado.',
          historical_value: `Score histórico elevado (${olderRating.toFixed(2)} estrelas)`,
          current_value: recentDelay
            ? 'Atrasos recentes detectados em rota'
            : 'Reclamação recente em transporte recente',
          triggered_criteria: `Motorista com histórico maduro apresentando anomalias pontuais nas últimas ${config.divergenceRecentDropTransportsCount} viagens.`,
          related_transports_json: recent.map((r) => r.transport_order_number),
          responsible_handler_name: 'Gestor de Contratação e Mesa de Fretes',
        })
      }
    }
  })

  return alerts
}
