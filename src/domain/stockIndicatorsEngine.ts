import { SapStockCurrentEntity } from '@/domain/rules'

export interface StockMetricsResult {
  lotCount: number
  totalWeightTons: number
  avgWeightTons: number
  modeType: 'empty' | 'single' | 'multimodal'
  modeWeightTons: number
  modeFrequencies: Array<{ weightTons: number; count: number }>
  minLotWeightTons: number
  maxLotWeightTons: number
  minLots: SapStockCurrentEntity[]
  maxLots: SapStockCurrentEntity[]
  modeLots: SapStockCurrentEntity[]
  allFilteredLots: SapStockCurrentEntity[]
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

  let modeType: 'empty' | 'single' | 'multimodal' = 'single'
  let modeWeightTons = topModes[0]?.weightTons || 0
  let modeLots: SapStockCurrentEntity[] = []

  if (topModes.length > 1) {
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
