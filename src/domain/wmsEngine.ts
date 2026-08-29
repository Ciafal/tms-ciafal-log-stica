// TMS CIAFAL — Sprint 6: Módulo WMS, Mapa de Carregamento & Sequência de Coleta Interna
// Integração preparada com o Hub Corporativo WMS.

export interface WmsLoadingItem {
  id: string
  orderNumber: string
  customerCode: string
  customerName: string
  destinationCity: string
  uf: string
  deliverySequenceOrder: number // 1 = primeiro a descarregar (mais próximo), N = último a descarregar (mais distante)
  loadingSequenceOrder: number // 1 = primeiro a carregar no caminhão, N = último a carregar
  materialCode: string
  materialDescription: string
  weightKg: number
  volumeM3?: number
  plant: string // ex: "SDPL"
  storageLocation: string // ex: "DS11", "DP34"
  wmsPhysicalAddress?: string // ex: "RUA-04-PREDIO-B-NIVEL-2"
  isSidercentro: boolean
  isPerfilPesadoL2: boolean
  specialHandlingFlag?: string
}

export interface WmsInternalPickingStep {
  stepNumber: number
  plant: string
  storageLocation: string
  wmsPhysicalAddress: string
  materialCode: string
  materialDescription: string
  weightKg: number
  priorityReason: string
}

export interface WmsVehicleLoadingLayout {
  cargoId: string
  vehiclePlate: string
  vehicleType: string
  itineraryCode: string
  totalWeightKg: number
  capacityKg: number
  items: WmsLoadingItem[]
  pickingSequence: WmsInternalPickingStep[]
  hasConflicts: boolean
  conflictNotes: string[]
  wmsIntegrationStatus: 'OPERACIONAL' | 'AGUARDANDO_CONFIGURACAO' | 'ERRO_COMUNICACAO'
  isReadyForLoading: boolean
}

/**
 * Motor Determinístico de Montagem de Mapa de Carregamento WMS
 * Regras:
 * 1. Ordem de Descarga Padrão: Cliente Mais Próximo (1) → Intermediários (2..N-1) → Cliente Mais Distante (N).
 * 2. Ordem de Carregamento Padrão: Carga do Mais Distante entra primeiro (fundo do caminhão), mais próximo por último.
 * 3. Exceção Prioritária SIDERCENTRO: Material com Centro 'SDPL' e Depósito 'DS11' CARREGA PRIMEIRO (Fundo/Estrutural). Flag: PRIORIDADE_CARREGAMENTO_SIDERCENTRO.
 * 4. Exceção Prioritária PERFIL PESADO L2: Material com flag cadastral 'Perfil pesado produzido na L2' CARREGA PRIMEIRO (Base/Fundo). Flag: PRIORIDADE_CARREGAMENTO_PERFIL_PESADO_L2.
 * 5. Detecção de Conflito: Quando a regra de peso/fundo colide com a primeira entrega de fácil acesso, acusa "CONFLITO DE CARREGAMENTO".
 */
export function generateWmsLoadingMap(input: {
  cargoId: string
  vehiclePlate: string
  vehicleType: string
  itineraryCode: string
  capacityKg: number
  orders: Array<{
    id: string
    order_number: string
    customer_code: string
    customer_name: string
    destination_city: string
    uf: string
    material?: string
    material_description?: string
    weight_kg: number
    plant?: string
    storage_location?: string
    wms_address?: string
    distance_km?: number
    is_perfil_pesado_l2?: boolean
  }>
  wmsConfigured?: boolean
}): WmsVehicleLoadingLayout {
  const {
    cargoId,
    vehiclePlate,
    vehicleType,
    itineraryCode,
    capacityKg,
    orders,
    wmsConfigured = false,
  } = input

  const totalWeightKg = orders.reduce((sum, o) => sum + (o.weight_kg || 0), 0)

  // 1. Determinar sequência de descarga (por distância da fábrica ou ordem dos clientes)
  const sortedForDischarge = [...orders].sort((a, b) => {
    return (a.distance_km || 100) - (b.distance_km || 100)
  })

  // 2. Mapear itens com identificação de exceções (SIDERCENTRO / PERFIL PESADO L2)
  const rawItems: WmsLoadingItem[] = sortedForDischarge.map((ord, idx) => {
    const isSidercentro =
      (ord.plant?.toUpperCase() === 'SDPL' && ord.storage_location?.toUpperCase() === 'DS11') ||
      ord.material_description?.toUpperCase().includes('SIDERCENTRO') ||
      false

    const isPerfilPesadoL2 =
      ord.is_perfil_pesado_l2 === true || (ord.material?.startsWith('L2-') && ord.weight_kg > 4000)

    return {
      id: ord.id,
      orderNumber: ord.order_number,
      customerCode: ord.customer_code,
      customerName: ord.customer_name,
      destinationCity: ord.destination_city,
      uf: ord.uf,
      deliverySequenceOrder: idx + 1, // 1 = primeiro a descarregar (mais próximo)
      loadingSequenceOrder: 0, // será calculado
      materialCode: ord.material || 'MAT-GENERIC',
      materialDescription: ord.material_description || ord.material || 'Material Aço CIAFAL',
      weightKg: ord.weight_kg,
      plant: ord.plant || 'SDPL',
      storageLocation: ord.storage_location || 'DP34',
      wmsPhysicalAddress: ord.wms_address || (wmsConfigured ? `DP34-R01-P0${idx + 1}` : undefined),
      isSidercentro,
      isPerfilPesadoL2,
      specialHandlingFlag: isSidercentro
        ? 'PRIORIDADE_CARREGAMENTO_SIDERCENTRO'
        : isPerfilPesadoL2
          ? 'PRIORIDADE_CARREGAMENTO_PERFIL_PESADO_L2'
          : undefined,
    }
  })

  // 3. Ordenação de Carregamento Físico:
  // Prioridade 1: Sidercentro (SDPL/DS11) entra primeiro
  // Prioridade 2: Perfil Pesado L2 entra primeiro
  // Prioridade 3: Ordem reversa de descarga (último a descarregar carrega no fundo)
  const sortedForLoading = [...rawItems].sort((a, b) => {
    if (a.isSidercentro && !b.isSidercentro) return -1
    if (!a.isSidercentro && b.isSidercentro) return 1

    if (a.isPerfilPesadoL2 && !b.isPerfilPesadoL2) return -1
    if (!a.isPerfilPesadoL2 && b.isPerfilPesadoL2) return 1

    // Ordem inversa de entrega (maior deliverySequenceOrder carrega primeiro)
    return b.deliverySequenceOrder - a.deliverySequenceOrder
  })

  // Atribuir loadingSequenceOrder (1 = primeiro a ser colocado no caminhão)
  sortedForLoading.forEach((item, idx) => {
    item.loadingSequenceOrder = idx + 1
  })

  // 4. Detecção de Conflitos Físicos
  const conflictNotes: string[] = []
  let hasConflicts = false

  // Conflito clássico: Sidercentro ou Perfil Pesado precisa carregar primeiro no fundo,
  // mas o cliente é a PRIMEIRA parada de descarga em veículo baú fechado sem lateral.
  sortedForLoading.forEach((item) => {
    if (
      (item.isSidercentro || item.isPerfilPesadoL2) &&
      item.deliverySequenceOrder === 1 &&
      rawItems.length > 1
    ) {
      if (
        vehicleType.toLowerCase().includes('baú') ||
        vehicleType.toLowerCase().includes('fechado')
      ) {
        hasConflicts = true
        conflictNotes.push(
          `CONFLITO DE CARREGAMENTO: Material ${item.materialCode} (${item.specialHandlingFlag}) exigido no fundo por peso/origem, porém pertence à 1ª descarga (${item.customerName}) em veículo baú traseiro. Requer validação operacional da doca.`,
        )
      }
    }
  })

  // 5. Sequência de Coleta Interna (Roteiro Otimizado de Separação na Planta)
  const pickingSequence: WmsInternalPickingStep[] = sortedForLoading.map((item, idx) => {
    let priorityReason = 'Sequência Padrão de Carregamento'
    if (item.isSidercentro) priorityReason = 'Prioridade Sidercentro (SDPL / DS11)'
    else if (item.isPerfilPesadoL2) priorityReason = 'Prioridade Perfil Pesado L2 (Base Estrutural)'

    return {
      stepNumber: idx + 1,
      plant: item.plant,
      storageLocation: item.storageLocation,
      wmsPhysicalAddress: item.wmsPhysicalAddress || `${item.storageLocation}-DEFAULT`,
      materialCode: item.materialCode,
      materialDescription: item.materialDescription,
      weightKg: item.weightKg,
      priorityReason,
    }
  })

  return {
    cargoId,
    vehiclePlate,
    vehicleType,
    itineraryCode,
    totalWeightKg,
    capacityKg,
    items: sortedForLoading,
    pickingSequence,
    hasConflicts,
    conflictNotes,
    wmsIntegrationStatus: wmsConfigured ? 'OPERACIONAL' : 'AGUARDANDO_CONFIGURACAO',
    isReadyForLoading: !hasConflicts && totalWeightKg <= capacityKg,
  }
}
