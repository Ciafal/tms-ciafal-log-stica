import { SapStockCurrentEntity } from '@/domain/rules'

export interface StockMetricsResult {
  lotCount: number
  totalWeightTons: number
  avgWeightTons: number
  modeType: 'empty' | 'single' | 'multimodal' | 'no_mode'
  modeWeightTons: number
  modeFrequencies: Array<{ weightTons: number; count: number }>
  minLotWeightTons: number
  maxLotWeightTons: number
  minLots: SapStockCurrentEntity[]
  maxLots: SapStockCurrentEntity[]
  modeLots: SapStockCurrentEntity[]
  allFilteredLots: SapStockCurrentEntity[]
}

export interface ConsolidatedMaterialStockRow {
  groupKey: string
  material_code: string
  material_description: string
  plant: string
  storage_location: string
  storage_bin?: string
  lotCount: number
  totalWeightTons: number
  avgWeightTons: number
  modeType: 'empty' | 'single' | 'multimodal' | 'no_mode'
  modeWeightTons: number
  modeFrequencies: Array<{ weightTons: number; count: number }>
  modeLabel: string
  minLotWeightTons: number
  maxLotWeightTons: number
  available_qty: number
  reserved_qty: number
  blocked_qty: number
  status: 'DISPONIVEL' | 'SEM_SALDO'
  lots: SapStockCurrentEntity[]
  representativeStock: SapStockCurrentEntity
}

/**
 * Converte o peso de uma entidade de estoque SAP para toneladas de forma segura:
 * 1) Se existir weight_tons explícito, usa-o
 * 2) Se unit for 'TON', 'TO' ou 'T', quantity ou weight_kg já pode ser em toneladas
 * 3) Por convenção do SAP/TMS CIAFAL (weight_kg em kg), converte dividindo por 1000
 */
export function getStockItemWeightTons(item: SapStockCurrentEntity): number {
  if (typeof item.weight_tons === 'number' && !isNaN(item.weight_tons)) {
    return Number(item.weight_tons.toFixed(4))
  }
  const unit = (item.unit || '').trim().toUpperCase()
  if (unit === 'TON' || unit === 'TO' || unit === 'T') {
    if (typeof item.quantity === 'number' && !isNaN(item.quantity)) {
      return Number(item.quantity.toFixed(4))
    }
  }
  if (typeof item.weight_kg === 'number' && !isNaN(item.weight_kg) && item.weight_kg > 0) {
    return Number((item.weight_kg / 1000).toFixed(4))
  }
  if (typeof item.quantity === 'number' && !isNaN(item.quantity)) {
    return Number(item.quantity.toFixed(4))
  }
  return 0
}

/**
 * Calcula os 6 indicadores estatísticos sobre os lotes de estoque filtrados:
 * - Lotes (quantidade de registros válidos)
 * - Peso total (soma em toneladas)
 * - Peso médio = total / quantidade
 * - Peso moda = peso de lote de maior frequência (arredondado a 2 decimais);
 *   se empate (bimodal/multimodal), sinaliza multimodal e lista os valores
 * - Menor lote = min(peso)
 * - Maior lote = max(peso)
 */
export function calculateStockLotMetrics(items: SapStockCurrentEntity[]): StockMetricsResult {
  const validItems = (items || []).filter(
    (item) => item && (item.batch || item.id || item.material_code),
  )

  if (validItems.length === 0) {
    return {
      lotCount: 0,
      totalWeightTons: 0,
      avgWeightTons: 0,
      modeType: 'empty',
      modeWeightTons: 0,
      modeFrequencies: [],
      minLotWeightTons: 0,
      maxLotWeightTons: 0,
      minLots: [],
      maxLots: [],
      modeLots: [],
      allFilteredLots: [],
    }
  }

  const itemsWithWeight = validItems.map((item) => ({
    item,
    weightTons: getStockItemWeightTons(item),
    weightKey: getStockItemWeightTons(item).toFixed(2),
  }))

  const lotCount = itemsWithWeight.length
  const totalWeightTons = itemsWithWeight.reduce((sum, curr) => sum + curr.weightTons, 0)
  const avgWeightTons = lotCount > 0 ? totalWeightTons / lotCount : 0

  // Menor e Maior lote
  let minWeight = itemsWithWeight[0].weightTons
  let maxWeight = itemsWithWeight[0].weightTons

  itemsWithWeight.forEach((entry) => {
    if (entry.weightTons < minWeight) minWeight = entry.weightTons
    if (entry.weightTons > maxWeight) maxWeight = entry.weightTons
  })

  const minLots = itemsWithWeight
    .filter((e) => Math.abs(e.weightTons - minWeight) < 0.0001)
    .map((e) => e.item)

  const maxLots = itemsWithWeight
    .filter((e) => Math.abs(e.weightTons - maxWeight) < 0.0001)
    .map((e) => e.item)

  // Moda (frequência por peso arredondado a 2 decimais)
  const frequencyMap = new Map<
    string,
    { count: number; items: SapStockCurrentEntity[]; num: number }
  >()

  itemsWithWeight.forEach((entry) => {
    const key = entry.weightKey
    const existing = frequencyMap.get(key)
    if (existing) {
      existing.count += 1
      existing.items.push(entry.item)
    } else {
      frequencyMap.set(key, {
        count: 1,
        items: [entry.item],
        num: Number(key),
      })
    }
  })

  let maxFreq = 0
  frequencyMap.forEach((val) => {
    if (val.count > maxFreq) maxFreq = val.count
  })

  const topModes: Array<{ weightTons: number; count: number; items: SapStockCurrentEntity[] }> = []
  frequencyMap.forEach((val, key) => {
    if (val.count === maxFreq) {
      topModes.push({
        weightTons: Number(key),
        count: val.count,
        items: val.items,
      })
    }
  })

  topModes.sort((a, b) => a.weightTons - b.weightTons)

  let modeType: 'empty' | 'single' | 'multimodal' | 'no_mode' = 'single'
  let modeWeightTons = topModes[0]?.weightTons || 0
  let modeLots: SapStockCurrentEntity[] = []

  // Se a frequência máxima for 1 e existirem 2+ itens, todos os pesos são distintos => 'no_mode'
  if (itemsWithWeight.length > 1 && maxFreq <= 1) {
    modeType = 'no_mode'
    modeWeightTons = 0
    modeLots = []
  } else if (topModes.length > 1) {
    modeType = 'multimodal'
    modeLots = topModes.flatMap((m) => m.items)
  } else if (topModes.length === 1) {
    modeType = 'single'
    modeLots = topModes[0].items
  } else {
    modeType = 'empty'
    modeLots = []
  }

  const modeFrequencies = topModes.map((m) => ({
    weightTons: m.weightTons,
    count: m.count,
  }))

  return {
    lotCount,
    totalWeightTons,
    avgWeightTons,
    modeType,
    modeWeightTons,
    modeFrequencies,
    minLotWeightTons: minWeight,
    maxLotWeightTons: maxWeight,
    minLots,
    maxLots,
    modeLots,
    allFilteredLots: validItems,
  }
}

/**
 * Agrupa itens de estoque filtrados por Material + Centro + Depósito + Localização física.
 * Não mistura lotes de materiais diferentes e preserva posições físicas distintas.
 *
 * Cada linha do grid consolidado contém:
 * - Quantidade de lotes = COUNT DISTINCT(CHARG) do grupo (desconsiderando duplicatas técnicas)
 * - Peso total = Σ peso dos lotes
 * - Peso médio = Peso total ÷ Quantidade de lotes
 * - Peso moda = peso com maior frequência; "Multimodal" se empate; "Sem moda" se todos distintos
 * - Menor lote = MIN(peso)
 * - Maior lote = MAX(peso)
 * - Disponível / Reservado / Bloqueado
 * - Lotes que compõem o grupo para rastreabilidade/drill-down
 */
export function groupStockByMaterial(
  items: SapStockCurrentEntity[],
): ConsolidatedMaterialStockRow[] {
  const validItems = (items || []).filter(
    (item) => item && (item.batch || item.id || item.material_code),
  )

  if (validItems.length === 0) {
    return []
  }

  // Agrupamento por chave que preserva posição física: Material + Plant + StorageLocation + StorageBin
  const groupsMap = new Map<string, SapStockCurrentEntity[]>()

  validItems.forEach((item) => {
    const matCode = (item.material_code || '').trim()
    const plant = (item.plant || '').trim()
    const loc = (item.storage_location || '').trim()
    const bin = (item.storage_bin || '').trim()
    const groupKey = `${matCode}|${plant}|${loc}|${bin}`

    const existing = groupsMap.get(groupKey)
    if (existing) {
      existing.push(item)
    } else {
      groupsMap.set(groupKey, [item])
    }
  })

  const rows: ConsolidatedMaterialStockRow[] = []

  groupsMap.forEach((rawLots, groupKey) => {
    // Deduplica tecnicamente por batch (CHARG) para o cálculo dos lotes
    // Se batch for vazio ou ausente, usa id único
    const seenBatches = new Set<string>()
    const deduplicatedLots: SapStockCurrentEntity[] = []

    rawLots.forEach((lot) => {
      const batchKey = (lot.batch || '').trim() || lot.id || `${lot.material_code}-${Math.random()}`
      if (!seenBatches.has(batchKey)) {
        seenBatches.add(batchKey)
        deduplicatedLots.push(lot)
      }
    })

    const lotCount = deduplicatedLots.length

    // Pesos individuais dos lotes deduplicados em toneladas
    const weights = deduplicatedLots.map((lot) => getStockItemWeightTons(lot))

    const totalWeightTons = weights.reduce((acc, w) => acc + w, 0)
    const avgWeightTons = lotCount > 0 ? totalWeightTons / lotCount : 0

    let minLotWeightTons = 0
    let maxLotWeightTons = 0
    if (lotCount > 0) {
      minLotWeightTons = Math.min(...weights)
      maxLotWeightTons = Math.max(...weights)
    }

    // Cálculo da Moda no grupo de lotes
    const freqMap = new Map<string, { count: number; weightTons: number }>()
    deduplicatedLots.forEach((lot) => {
      const w = getStockItemWeightTons(lot)
      const key = w.toFixed(2)
      const curr = freqMap.get(key)
      if (curr) {
        curr.count += 1
      } else {
        freqMap.set(key, { count: 1, weightTons: Number(key) })
      }
    })

    let maxFreq = 0
    freqMap.forEach((val) => {
      if (val.count > maxFreq) maxFreq = val.count
    })

    const topModes: Array<{ weightTons: number; count: number }> = []
    freqMap.forEach((val) => {
      if (val.count === maxFreq) {
        topModes.push({ weightTons: val.weightTons, count: val.count })
      }
    })
    topModes.sort((a, b) => a.weightTons - b.weightTons)

    let modeType: 'empty' | 'single' | 'multimodal' | 'no_mode' = 'empty'
    let modeWeightTons = 0
    let modeLabel = 'Sem moda'

    if (lotCount === 0) {
      modeType = 'empty'
      modeLabel = '0,00 t'
    } else if (lotCount === 1) {
      // Apenas 1 lote: moda é o próprio peso
      modeType = 'single'
      modeWeightTons = topModes[0].weightTons
      modeLabel = `${modeWeightTons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t`
    } else if (maxFreq <= 1) {
      // 2+ lotes onde cada um tem frequência 1: não há moda estatisticamente válida
      modeType = 'no_mode'
      modeLabel = 'Sem moda'
    } else if (topModes.length > 1) {
      // Empate entre duas ou mais modas
      modeType = 'multimodal'
      modeLabel = 'Multimodal'
    } else {
      // Moda única predominante
      modeType = 'single'
      modeWeightTons = topModes[0].weightTons
      modeLabel = `${modeWeightTons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t`
    }

    // Saldos consolidados do grupo
    const available_qty = deduplicatedLots.reduce((acc, l) => acc + (l.available_qty || 0), 0)
    const reserved_qty = deduplicatedLots.reduce((acc, l) => acc + (l.reserved_qty || 0), 0)
    const blocked_qty = deduplicatedLots.reduce((acc, l) => acc + (l.blocked_qty || 0), 0)

    const rep = deduplicatedLots[0]

    rows.push({
      groupKey,
      material_code: rep.material_code,
      material_description: rep.material_description || 'Material Siderúrgico',
      plant: rep.plant,
      storage_location: rep.storage_location,
      storage_bin: rep.storage_bin,
      lotCount,
      totalWeightTons,
      avgWeightTons,
      modeType,
      modeWeightTons,
      modeFrequencies: topModes,
      modeLabel,
      minLotWeightTons,
      maxLotWeightTons,
      available_qty,
      reserved_qty,
      blocked_qty,
      status: available_qty > 0 ? 'DISPONIVEL' : 'SEM_SALDO',
      lots: deduplicatedLots,
      representativeStock: rep,
    })
  })

  // Ordenação previsível por código do material e centro
  rows.sort((a, b) => {
    if (a.material_code !== b.material_code) {
      return a.material_code.localeCompare(b.material_code)
    }
    if (a.plant !== b.plant) {
      return a.plant.localeCompare(b.plant)
    }
    return a.storage_location.localeCompare(b.storage_location)
  })

  return rows
}
