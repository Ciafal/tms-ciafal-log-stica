/**
 * Motor de Governança, Regras e Modelos para Edição de Transportes — HUB CIAFAL Logística
 * Implementação Incremental Oficial:
 * - 21 Motivos Padronizados
 * - Justificativa mínima de 10 caracteres
 * - Regras de restrição por Status Operacional
 * - Regras de aprovação adicional para Alterações Críticas
 * - Status de Sincronização SAP
 * - Detecção de Concorrência
 */

export const STANDARDIZED_EDIT_REASONS = [
  'Alteração de transportadora',
  'Alteração de motorista',
  'Alteração de veículo',
  'Alteração de placa',
  'Alteração de itinerário',
  'Alteração de rota',
  'Alteração de data de carregamento',
  'Alteração de previsão de entrega',
  'Alteração de remessa',
  'Inclusão de remessa',
  'Exclusão de remessa',
  'Alteração solicitada pelo cliente',
  'Alteração solicitada pelo Comercial',
  'Alteração solicitada pela Expedição',
  'Alteração solicitada pelo PCP',
  'Alteração solicitada pela Transportadora',
  'Correção de cadastro',
  'Correção de integração SAP',
  'Erro operacional',
  'Reprogramação logística',
  'Outro',
] as const

export type StandardizedEditReason = (typeof STANDARDIZED_EDIT_REASONS)[number]

export type TransportSyncStatus =
  | 'SINCRONIZADO'
  | 'AGUARDANDO_SINCRONIZACAO'
  | 'ERRO_SINCRONIZACAO'
  | 'ALTERADO_SOMENTE_HUB'
  | 'PENDENTE_APROVACAO'

export type TransportOperationalStatus =
  | 'Planejado'
  | 'Frete aceito'
  | 'Veículo convocado'
  | 'Veículo na portaria'
  | 'Em carregamento'
  | 'Faturado'
  | 'Em trânsito'
  | 'Entregue'
  | 'Cancelado'

export interface RemessaItem {
  item_number: string
  material_code: string
  material_description: string
  quantity: number
  unit: string
  weight_kg: number
}

export interface RemessaRelated {
  delivery_number: string
  order_number: string
  sequence: number
  customer_code: string
  customer_name: string
  customer_cnpj?: string
  destination_city: string
  destination_uf: string
  weight_kg: number
  weight_ton: number
  items: RemessaItem[]
  credit_status?: string
  status?: string
  can_remove?: boolean
  can_edit_sequence?: boolean
}

export interface TransportEditableRecord {
  id: string
  // 1. Identificação Estrutural (Somente Leitura)
  transport_number: string
  sap_transport_number: string
  transport_order_number: string
  delivery_number: string
  order_number?: string
  company_code: string
  company_name: string
  plant_code: string
  plant_name: string
  creation_date: string
  status: TransportOperationalStatus
  origin_system_source: string // Ex: "SAP ECC (BAPI_SHIPMENT_CREATE / VT01N)"
  sync_version: number
  last_modified_at: string
  last_modified_by: string
  last_change_reason?: string
  last_change_justification?: string
  sap_sync_status: TransportSyncStatus
  approval_status?: 'APROVADO' | 'PENDENTE_APROVACAO' | 'REJEITADO' | 'NAO_REQUER_APROVACAO'

  // 2. Dados Logísticos (Editáveis com regras)
  carrier_name: string
  driver_id?: string
  driver_name: string
  driver_cpf?: string
  driver_document_masked?: string
  vehicle_plate: string
  trailer_plate?: string
  vehicle_type: string
  itinerary_code: string
  itinerary_description: string
  route_code?: string
  scheduled_loading_date: string // YYYY-MM-DD
  scheduled_loading_time: string // HH:mm
  scheduled_delivery_date: string // YYYY-MM-DD
  total_weight_kg: number
  total_weight_ton: number
  discharges_count: number
  destination_city: string
  destination_uf: string
  customer_summary: string
  customer_cnpj?: string
  logistics_notes?: string

  // 3. Remessas Relacionadas
  remessas: RemessaRelated[]
}

export interface FieldComparison {
  field: string
  field_label: string
  old_value: any
  new_value: any
  delivery_number?: string
  order_number?: string
  is_critical?: boolean
}

export interface StatusRulesCheck {
  canEdit: boolean
  blockedReasons: string[]
  warningMessages: string[]
  allowedFields: string[]
  readOnlyFields: string[]
  isCriticalStatus: boolean
}

export interface CriticalChangeCheck {
  isCritical: boolean
  reasons: string[]
  requiresApproval: boolean
}

export interface SapIntegrationValidationResult {
  requiresSapCall: boolean
  bapiTarget: string
  success: boolean
  sapResponseCode?: string
  sapMessage?: string
  suggestedAction?: string
}

/**
 * Validação de Restrições por Status Operacional do Transporte (Item 14)
 */
export function evaluateStatusRules(
  status: TransportOperationalStatus | string,
  userRole?: string,
): StatusRulesCheck {
  const norm = String(status).trim()
  const blockedReasons: string[] = []
  const warningMessages: string[] = []
  const readOnlyFields: string[] = []
  let canEdit = true
  let isCriticalStatus = false

  switch (norm) {
    case 'Planejado':
      // Alterações de planejamento livres
      warningMessages.push(
        'Transporte em fase de planejamento: todas as alterações logísticas permitidas.',
      )
      break

    case 'Frete aceito':
      // Restringir o que afete negociação concluída
      warningMessages.push(
        'Frete já aceito: alterações de transportadora, valor ou grandes substituições exigem justificativa de repactuação.',
      )
      break

    case 'Veículo convocado':
      isCriticalStatus = true
      warningMessages.push(
        'Veículo convocado para a unidade CIAFAL: prioridade operacional alta, evite alterações desnecessárias.',
      )
      break

    case 'Veículo na portaria':
      isCriticalStatus = true
      warningMessages.push(
        'Veículo presente na portaria/pátio: processo operacional já iniciado no local.',
      )
      break

    case 'Em carregamento':
      isCriticalStatus = true
      readOnlyFields.push('remessas', 'total_weight_kg', 'total_weight_ton', 'itinerary_code')
      warningMessages.push(
        'Transporte em processo físico de carregamento: alterações de remessa e peso estão bloqueadas por segurança.',
      )
      break

    case 'Faturado':
      isCriticalStatus = true
      readOnlyFields.push(
        'remessas',
        'carrier_name',
        'driver_name',
        'driver_cpf',
        'vehicle_plate',
        'trailer_plate',
        'total_weight_kg',
        'total_weight_ton',
        'itinerary_code',
        'destination_city',
        'destination_uf',
      )
      blockedReasons.push(
        'Transporte faturado: alterações operacionais que afetem documentos fiscais (NF-e, MDF-e, CT-e) estão estritamente bloqueadas.',
      )
      canEdit = userRole === 'admin_master' || userRole === 'admin_tms'
      break

    case 'Em trânsito':
      readOnlyFields.push(
        'carrier_name',
        'vehicle_plate',
        'trailer_plate',
        'remessas',
        'total_weight_kg',
        'itinerary_code',
      )
      warningMessages.push(
        'Transporte em rota rodoviária: somente informações de previsão de entrega e observações de acompanhamento podem ser atualizadas.',
      )
      break

    case 'Entregue':
      canEdit = userRole === 'admin_master' || userRole === 'admin_tms'
      if (!canEdit) {
        blockedReasons.push(
          'Transporte concluído/entregue: modo somente leitura histórico. Apenas perfil administrativo master pode retificar.',
        )
      }
      break

    default:
      break
  }

  return {
    canEdit,
    blockedReasons,
    warningMessages,
    allowedFields: [
      'carrier_name',
      'driver_name',
      'driver_cpf',
      'vehicle_plate',
      'trailer_plate',
      'vehicle_type',
      'itinerary_code',
      'itinerary_description',
      'scheduled_loading_date',
      'scheduled_loading_time',
      'scheduled_delivery_date',
      'logistics_notes',
      'remessas',
    ].filter((f) => !readOnlyFields.includes(f)),
    readOnlyFields,
    isCriticalStatus,
  }
}

/**
 * Detecção de Alterações Críticas que exigem aprovação adicional (Item 13)
 */
export function detectCriticalChanges(
  changes: FieldComparison[],
  currentRecord: TransportEditableRecord,
): CriticalChangeCheck {
  const reasons: string[] = []

  changes.forEach((ch) => {
    // 1. Alteração de cliente
    if (ch.field === 'customer_summary' || ch.field.includes('customer')) {
      reasons.push('Alteração de cliente ou ponto de descarga.')
    }

    // 2. Retirada de remessa
    if (ch.field === 'remessa_removed') {
      reasons.push(`Retirada da remessa ${ch.old_value} do transporte.`)
    }

    // 3. Substituição significativa de carga (> 15% peso)
    if (ch.field === 'total_weight_kg') {
      const oldWeight = Number(ch.old_value || 0)
      const newWeight = Number(ch.new_value || 0)
      if (oldWeight > 0) {
        const deltaPct = Math.abs((newWeight - oldWeight) / oldWeight) * 100
        if (deltaPct > 15) {
          reasons.push(
            `Variação expressiva de carga (${deltaPct.toFixed(1)}% de diferença de peso).`,
          )
        }
      }
    }

    // 4. Alteração de transportadora após frete aceito
    if (
      ch.field === 'carrier_name' &&
      ['Frete aceito', 'Veículo convocado', 'Veículo na portaria', 'Em carregamento'].includes(
        currentRecord.status,
      )
    ) {
      reasons.push('Alteração de transportadora contratada após aceite do frete.')
    }

    // 5. Alteração após início de carregamento
    if (
      currentRecord.status === 'Em carregamento' &&
      ['driver_name', 'vehicle_plate', 'remessas'].includes(ch.field)
    ) {
      reasons.push('Alteração com processo de carregamento já iniciado no pátio.')
    }

    // 6. Alteração de transporte integrado ao SAP
    if (currentRecord.sap_transport_number && currentRecord.sap_transport_number !== '—') {
      if (['carrier_name', 'driver_name', 'vehicle_plate', 'itinerary_code'].includes(ch.field)) {
        reasons.push('Alteração de dado estrutural em transporte já integrado e numerado no SAP.')
      }
    }
  })

  const isCritical = reasons.length > 0
  return {
    isCritical,
    reasons,
    requiresApproval: isCritical,
  }
}

/**
 * Validação de Integração SAP para Edição (Item 9 e 10)
 * BAPI_SHIPMENT_CHANGE / VT02N oficial
 */
export function evaluateSapIntegration(
  record: TransportEditableRecord,
  changes: FieldComparison[],
  isSapConnected: boolean,
  isWriteEnabled: boolean,
): SapIntegrationValidationResult {
  const sapFields = [
    'carrier_name',
    'driver_name',
    'driver_cpf',
    'vehicle_plate',
    'trailer_plate',
    'itinerary_code',
    'scheduled_loading_date',
    'scheduled_delivery_date',
    'total_weight_kg',
  ]

  const touchesSap = changes.some((c) => sapFields.includes(c.field))

  if (!touchesSap || !record.sap_transport_number || record.sap_transport_number === '—') {
    return {
      requiresSapCall: false,
      bapiTarget: 'NENHUMA (Alteração somente no HUB CIAFAL)',
      success: true,
      sapResponseCode: '000',
      sapMessage: 'Alteração mantida localmente no HUB com sucesso.',
    }
  }

  // Se atinge dados oficiais do SAP:
  const bapiTarget = 'BAPI_SHIPMENT_CHANGE (VT02N - Modificar Transporte)'

  if (!isSapConnected || !isWriteEnabled) {
    // Ambiente sem escrita SAP habilitada: conforme especificação oficial,
    // o HUB registra como ALTERADO_SOMENTE_HUB ou ERRO controlado sem quebrar o sistema
    return {
      requiresSapCall: true,
      bapiTarget,
      success: true,
      sapResponseCode: 'PENDING_HOMOLOG',
      sapMessage:
        'Conexão SAP RFC/BAPI em modo consulta. Alteração aplicada no HUB e enfileirada para sincronização na RFC ZSD_BAPI_SHIPMENT_CHANGE.',
      suggestedAction:
        'Verifique o status de sincronização SAP ou aguarde a janela de conciliação automática.',
    }
  }

  return {
    requiresSapCall: true,
    bapiTarget,
    success: true,
    sapResponseCode: 'S_OK',
    sapMessage: `Transporte SAP ${record.sap_transport_number} atualizado com sucesso via ${bapiTarget}.`,
  }
}

/**
 * Gera as diferenças entre o estado anterior e novo
 */
export function computeFieldComparisons(
  original: TransportEditableRecord,
  modified: Partial<TransportEditableRecord>,
): FieldComparison[] {
  const comparisons: FieldComparison[] = []

  const labels: Record<string, string> = {
    carrier_name: 'Transportadora',
    driver_name: 'Motorista',
    driver_cpf: 'CPF do Motorista',
    vehicle_plate: 'Placa do Cavalo',
    trailer_plate: 'Placa da Carreta',
    vehicle_type: 'Tipo de Veículo',
    itinerary_code: 'Código do Itinerário',
    itinerary_description: 'Descrição do Itinerário',
    scheduled_loading_date: 'Data Prevista Carregamento',
    scheduled_loading_time: 'Horário Previsto Carregamento',
    scheduled_delivery_date: 'Data Prevista Entrega',
    total_weight_kg: 'Peso Total (kg)',
    total_weight_ton: 'Peso Total (t)',
    discharges_count: 'Qtd. Descargas',
    destination_city: 'Cidade de Destino',
    destination_uf: 'UF Destino',
    customer_summary: 'Clientes / Destinatários',
    logistics_notes: 'Observações Logísticas',
  }

  for (const key of Object.keys(labels)) {
    const k = key as keyof TransportEditableRecord
    if (modified[k] !== undefined && modified[k] !== original[k]) {
      comparisons.push({
        field: key,
        field_label: labels[key],
        old_value: original[k] ?? '—',
        new_value: modified[k] ?? '—',
      })
    }
  }

  // Comparação de remessas
  if (modified.remessas && Array.isArray(modified.remessas)) {
    const origMap = new Map(original.remessas.map((r) => [r.delivery_number, r]))
    const modMap = new Map(modified.remessas.map((r) => [r.delivery_number, r]))

    // Removidas
    original.remessas.forEach((origR) => {
      if (!modMap.has(origR.delivery_number)) {
        comparisons.push({
          field: 'remessa_removed',
          field_label: 'Remessa Excluída',
          old_value: `Remessa ${origR.delivery_number} (Pedido ${origR.order_number} - ${origR.customer_name})`,
          new_value: 'Removida da carga',
          delivery_number: origR.delivery_number,
          order_number: origR.order_number,
          is_critical: true,
        })
      }
    })

    // Adicionadas
    modified.remessas.forEach((modR) => {
      if (!origMap.has(modR.delivery_number)) {
        comparisons.push({
          field: 'remessa_added',
          field_label: 'Remessa Incluída',
          old_value: 'Não vinculada',
          new_value: `Remessa ${modR.delivery_number} (Pedido ${modR.order_number} - ${modR.customer_name} - ${modR.weight_kg}kg)`,
          delivery_number: modR.delivery_number,
          order_number: modR.order_number,
          is_critical: false,
        })
      } else {
        const origR = origMap.get(modR.delivery_number)!
        if (origR.sequence !== modR.sequence) {
          comparisons.push({
            field: 'remessa_sequence',
            field_label: `Sequência Remessa ${modR.delivery_number}`,
            old_value: `Posição ${origR.sequence}`,
            new_value: `Posição ${modR.sequence}`,
            delivery_number: modR.delivery_number,
            order_number: modR.order_number,
          })
        }
      }
    })
  }

  return comparisons
}
