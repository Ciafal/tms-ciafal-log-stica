import { describe, it, expect } from 'vitest'
import { formatWeight } from '@/lib/utils'
import {
  calculateStockLotMetrics,
  getStockItemWeightTons,
  groupStockByMaterial,
} from '@/domain/stockIndicatorsEngine'
import { SapStockCurrentEntity } from '@/domain/rules'

describe('Padronização Global de Pesos - formatWeight helper', () => {
  it('deve formatar valores numéricos em toneladas no padrão pt-BR (X,XX t)', () => {
    expect(formatWeight(5)).toBe('5,00 t')
    expect(formatWeight(1254.37)).toBe('1.254,37 t')
    expect(formatWeight(28.5)).toBe('28,50 t')
  })

  it('deve converter automaticamente de KG para t dividindo por 1.000', () => {
    expect(formatWeight(27000, { unit: 'KG' })).toBe('27,00 t')
    expect(formatWeight(500, { unit: 'kg' })).toBe('0,50 t')
    expect(formatWeight(1250, { unit: 'KG' })).toBe('1,25 t')
  })

  it('deve lidar com valores nulos, indefinidos ou NaN retornando 0,00 t', () => {
    expect(formatWeight(null)).toBe('0,00 t')
    expect(formatWeight(undefined)).toBe('0,00 t')
    expect(formatWeight(NaN)).toBe('0,00 t')
  })

  it('deve manter retrocompatibilidade com useTonsThreshold legado quando informado número', () => {
    expect(formatWeight(500, 1000)).toBe('500 kg')
    expect(formatWeight(2500, 1000)).toBe('2,50 t')
  })
})

describe('Visão do Estoque - 6 Indicadores Estatísticos Canônicos', () => {
  const mockLots: SapStockCurrentEntity[] = [
    {
      id: 'lot-1',
      material_code: 'MAT-01',
      material_description: 'Bobina Galvanizada A',
      plant: '1000',
      storage_location: 'DP34',
      batch: 'LOTE-A01',
      quantity: 10,
      unit: 'TON',
      weight_kg: 10000,
      available_qty: 10,
    },
    {
      id: 'lot-2',
      material_code: 'MAT-01',
      material_description: 'Bobina Galvanizada A',
      plant: '1000',
      storage_location: 'DP34',
      batch: 'LOTE-A02',
      quantity: 10,
      unit: 'TON',
      weight_kg: 10000,
      available_qty: 10,
    },
    {
      id: 'lot-3',
      material_code: 'MAT-02',
      material_description: 'Chapa Grossa B',
      plant: '1000',
      storage_location: 'DP34',
      batch: 'LOTE-B01',
      quantity: 5,
      unit: 'TON',
      weight_kg: 5000,
      available_qty: 5,
    },
    {
      id: 'lot-4',
      material_code: 'MAT-03',
      material_description: 'Tubo Industrial C',
      plant: '1000',
      storage_location: 'DP34',
      batch: 'LOTE-C01',
      quantity: 25,
      unit: 'TON',
      weight_kg: 25000,
      available_qty: 25,
    },
  ]

  it('deve calcular corretamente a quantidade de lotes válidos', () => {
    const metrics = calculateStockLotMetrics(mockLots)
    expect(metrics.lotCount).toBe(4)
  })

  it('deve calcular o peso total somando os lotes em toneladas', () => {
    const metrics = calculateStockLotMetrics(mockLots)
    // 10 + 10 + 5 + 25 = 50 t
    expect(metrics.totalWeightTons).toBe(50)
  })

  it('deve calcular o peso médio como total dividido pela quantidade', () => {
    const metrics = calculateStockLotMetrics(mockLots)
    // 50 / 4 = 12.5 t
    expect(metrics.avgWeightTons).toBe(12.5)
  })

  it('deve identificar menor e maior lote com precisão', () => {
    const metrics = calculateStockLotMetrics(mockLots)
    expect(metrics.minLotWeightTons).toBe(5)
    expect(metrics.maxLotWeightTons).toBe(25)
    expect(metrics.minLots).toHaveLength(1)
    expect(metrics.minLots[0].batch).toBe('LOTE-B01')
    expect(metrics.maxLots).toHaveLength(1)
    expect(metrics.maxLots[0].batch).toBe('LOTE-C01')
  })

  it('deve calcular a moda univariada quando há peso predominante', () => {
    const metrics = calculateStockLotMetrics(mockLots)
    // 10 t aparece 2 vezes; 5 t e 25 t aparecem 1 vez cada
    expect(metrics.modeType).toBe('single')
    expect(metrics.modeWeightTons).toBe(10)
    expect(metrics.modeLots).toHaveLength(2)
  })

  it('deve sinalizar multimodal e listar os valores empatados em caso de empate de moda', () => {
    const bimodalLots: SapStockCurrentEntity[] = [
      {
        id: 'b1',
        material_code: 'M1',
        material_description: 'Item 1',
        plant: '1000',
        storage_location: 'DP34',
        batch: 'B1',
        quantity: 8,
        unit: 'TON',
        weight_kg: 8000,
        available_qty: 8,
      },
      {
        id: 'b2',
        material_code: 'M1',
        material_description: 'Item 1',
        plant: '1000',
        storage_location: 'DP34',
        batch: 'B2',
        quantity: 8,
        unit: 'TON',
        weight_kg: 8000,
        available_qty: 8,
      },
      {
        id: 'b3',
        material_code: 'M2',
        material_description: 'Item 2',
        plant: '1000',
        storage_location: 'DP34',
        batch: 'B3',
        quantity: 14,
        unit: 'TON',
        weight_kg: 14000,
        available_qty: 14,
      },
      {
        id: 'b4',
        material_code: 'M2',
        material_description: 'Item 2',
        plant: '1000',
        storage_location: 'DP34',
        batch: 'B4',
        quantity: 14,
        unit: 'TON',
        weight_kg: 14000,
        available_qty: 14,
      },
    ]

    const metrics = calculateStockLotMetrics(bimodalLots)
    expect(metrics.modeType).toBe('multimodal')
    expect(metrics.modeFrequencies).toHaveLength(2)
    expect(metrics.modeFrequencies.map((f) => f.weightTons)).toEqual([8, 14])
    expect(metrics.modeLots).toHaveLength(4)
  })

  it('deve retornar indicadores em zero/vazio quando lista de lotes for vazia', () => {
    const metrics = calculateStockLotMetrics([])
    expect(metrics.lotCount).toBe(0)
    expect(metrics.totalWeightTons).toBe(0)
    expect(metrics.avgWeightTons).toBe(0)
    expect(metrics.modeType).toBe('empty')
    expect(metrics.minLotWeightTons).toBe(0)
    expect(metrics.maxLotWeightTons).toBe(0)
    expect(metrics.allFilteredLots).toHaveLength(0)
  })

  it('deve extrair o peso correto de lotes com weight_kg em kg', () => {
    const item: SapStockCurrentEntity = {
      id: 'k1',
      material_code: 'M1',
      material_description: 'Desc',
      plant: '1000',
      storage_location: 'DP34',
      batch: 'L1',
      quantity: 1,
      unit: 'PC',
      weight_kg: 18500,
      available_qty: 1,
    }
    expect(getStockItemWeightTons(item)).toBe(18.5)
  })

  it('deve retornar no_mode ("Sem moda") nos cards quando todos os pesos forem distintos', () => {
    const distinctLots: SapStockCurrentEntity[] = [
      {
        id: 'd1',
        material_code: 'M1',
        material_description: 'Item 1',
        plant: '1000',
        storage_location: 'DP34',
        batch: 'B1',
        quantity: 5,
        unit: 'TON',
        weight_kg: 5000,
        available_qty: 5,
      },
      {
        id: 'd2',
        material_code: 'M1',
        material_description: 'Item 1',
        plant: '1000',
        storage_location: 'DP34',
        batch: 'B2',
        quantity: 12,
        unit: 'TON',
        weight_kg: 12000,
        available_qty: 12,
      },
      {
        id: 'd3',
        material_code: 'M1',
        material_description: 'Item 1',
        plant: '1000',
        storage_location: 'DP34',
        batch: 'B3',
        quantity: 20,
        unit: 'TON',
        weight_kg: 20000,
        available_qty: 20,
      },
    ]

    const metrics = calculateStockLotMetrics(distinctLots)
    expect(metrics.modeType).toBe('no_mode')
  })
})

describe('Grid Consolidado por Material - groupStockByMaterial', () => {
  const sampleLots: SapStockCurrentEntity[] = [
    // Material MAT-100 no Centro 1000 / DP10 (3 lotes com 1 duplicata técnica de CHARG)
    {
      id: 'rec-1',
      material_code: 'MAT-100',
      material_description: 'Tubo de Aço Carbono',
      plant: '1000',
      storage_location: 'DP10',
      storage_bin: 'RUA-A-01',
      batch: 'LOTE-101',
      quantity: 10,
      unit: 'TON',
      weight_kg: 10000,
      available_qty: 10,
      reserved_qty: 0,
      blocked_qty: 0,
    },
    {
      id: 'rec-1-dup', // Registro técnico duplicado do mesmo lote SAP LOTE-101
      material_code: 'MAT-100',
      material_description: 'Tubo de Aço Carbono',
      plant: '1000',
      storage_location: 'DP10',
      storage_bin: 'RUA-A-01',
      batch: 'LOTE-101',
      quantity: 10,
      unit: 'TON',
      weight_kg: 10000,
      available_qty: 10,
      reserved_qty: 0,
      blocked_qty: 0,
    },
    {
      id: 'rec-2',
      material_code: 'MAT-100',
      material_description: 'Tubo de Aço Carbono',
      plant: '1000',
      storage_location: 'DP10',
      storage_bin: 'RUA-A-01',
      batch: 'LOTE-102',
      quantity: 10,
      unit: 'TON',
      weight_kg: 10000,
      available_qty: 10,
      reserved_qty: 2,
      blocked_qty: 0,
    },
    {
      id: 'rec-3',
      material_code: 'MAT-100',
      material_description: 'Tubo de Aço Carbono',
      plant: '1000',
      storage_location: 'DP10',
      storage_bin: 'RUA-A-01',
      batch: 'LOTE-103',
      quantity: 16,
      unit: 'TON',
      weight_kg: 16000,
      available_qty: 16,
      reserved_qty: 0,
      blocked_qty: 1,
    },

    // Mesmo material MAT-100 mas em Centro 1000 / DP11 (NÃO pode consolidar indevidamente)
    {
      id: 'rec-4',
      material_code: 'MAT-100',
      material_description: 'Tubo de Aço Carbono',
      plant: '1000',
      storage_location: 'DP11',
      storage_bin: 'BOX-02',
      batch: 'LOTE-201',
      quantity: 25,
      unit: 'TON',
      weight_kg: 25000,
      available_qty: 25,
      reserved_qty: 0,
      blocked_qty: 0,
    },

    // Outro material MAT-200 com pesos distintos (Sem moda)
    {
      id: 'rec-5',
      material_code: 'MAT-200',
      material_description: 'Bobina Zincada',
      plant: '1000',
      storage_location: 'DP10',
      storage_bin: 'PATIO-B',
      batch: 'LOTE-301',
      quantity: 12,
      unit: 'TON',
      weight_kg: 12000,
      available_qty: 12,
      reserved_qty: 0,
      blocked_qty: 0,
    },
    {
      id: 'rec-6',
      material_code: 'MAT-200',
      material_description: 'Bobina Zincada',
      plant: '1000',
      storage_location: 'DP10',
      storage_bin: 'PATIO-B',
      batch: 'LOTE-302',
      quantity: 18,
      unit: 'TON',
      weight_kg: 18000,
      available_qty: 18,
      reserved_qty: 0,
      blocked_qty: 0,
    },
  ]

  it('deve agrupar mantendo separação física por Centro / Depósito / Localização', () => {
    const rows = groupStockByMaterial(sampleLots)
    expect(rows).toHaveLength(3)

    const mat100Dp10 = rows.find(
      (r) => r.material_code === 'MAT-100' && r.storage_location === 'DP10',
    )
    const mat100Dp11 = rows.find(
      (r) => r.material_code === 'MAT-100' && r.storage_location === 'DP11',
    )
    const mat200Dp10 = rows.find((r) => r.material_code === 'MAT-200')

    expect(mat100Dp10).toBeDefined()
    expect(mat100Dp11).toBeDefined()
    expect(mat200Dp10).toBeDefined()
  })

  it('deve contar COUNT DISTINCT(CHARG) sem duplicar registros técnicos', () => {
    const rows = groupStockByMaterial(sampleLots)
    const mat100Dp10 = rows.find(
      (r) => r.material_code === 'MAT-100' && r.storage_location === 'DP10',
    )!

    // LOTE-101 aparecia 2x no array original (rec-1 e rec-1-dup), mais LOTE-102 e LOTE-103 => 3 lotes distintos
    expect(mat100Dp10.lotCount).toBe(3)
    expect(mat100Dp10.lots).toHaveLength(3)
  })

  it('deve calcular Soma, Média, Menor e Maior lote com precisão', () => {
    const rows = groupStockByMaterial(sampleLots)
    const mat100Dp10 = rows.find(
      (r) => r.material_code === 'MAT-100' && r.storage_location === 'DP10',
    )!

    // Lotes deduplicados: 10 t, 10 t, 16 t
    // Total = 36 t
    // Média = 36 / 3 = 12 t
    // Menor = 10 t
    // Maior = 16 t
    expect(mat100Dp10.totalWeightTons).toBe(36)
    expect(mat100Dp10.avgWeightTons).toBe(12)
    expect(mat100Dp10.minLotWeightTons).toBe(10)
    expect(mat100Dp10.maxLotWeightTons).toBe(16)
  })

  it('deve identificar moda univariada quando há peso predominante', () => {
    const rows = groupStockByMaterial(sampleLots)
    const mat100Dp10 = rows.find(
      (r) => r.material_code === 'MAT-100' && r.storage_location === 'DP10',
    )!

    expect(mat100Dp10.modeType).toBe('single')
    expect(mat100Dp10.modeWeightTons).toBe(10)
    expect(mat100Dp10.modeLabel).toBe('10,00 t')
  })

  it('deve classificar como "Sem moda" quando todos os pesos forem distintos', () => {
    const rows = groupStockByMaterial(sampleLots)
    const mat200Dp10 = rows.find((r) => r.material_code === 'MAT-200')!

    // Lotes com 12 t e 18 t (frequência 1 para cada)
    expect(mat200Dp10.lotCount).toBe(2)
    expect(mat200Dp10.modeType).toBe('no_mode')
    expect(mat200Dp10.modeLabel).toBe('Sem moda')
  })

  it('deve classificar como "Multimodal" quando 2 ou mais pesos empatarem com frequência > 1', () => {
    const multimodalLots: SapStockCurrentEntity[] = [
      {
        id: 'mm1',
        material_code: 'MAT-300',
        plant: '1000',
        storage_location: 'DP34',
        batch: 'B1',
        quantity: 5,
        unit: 'TON',
        weight_kg: 5000,
        available_qty: 5,
        material_description: 'Item Multimodal',
      },
      {
        id: 'mm2',
        material_code: 'MAT-300',
        plant: '1000',
        storage_location: 'DP34',
        batch: 'B2',
        quantity: 5,
        unit: 'TON',
        weight_kg: 5000,
        available_qty: 5,
        material_description: 'Item Multimodal',
      },
      {
        id: 'mm3',
        material_code: 'MAT-300',
        plant: '1000',
        storage_location: 'DP34',
        batch: 'B3',
        quantity: 15,
        unit: 'TON',
        weight_kg: 15000,
        available_qty: 15,
        material_description: 'Item Multimodal',
      },
      {
        id: 'mm4',
        material_code: 'MAT-300',
        plant: '1000',
        storage_location: 'DP34',
        batch: 'B4',
        quantity: 15,
        unit: 'TON',
        weight_kg: 15000,
        available_qty: 15,
        material_description: 'Item Multimodal',
      },
    ]

    const rows = groupStockByMaterial(multimodalLots)
    expect(rows).toHaveLength(1)
    expect(rows[0].modeType).toBe('multimodal')
    expect(rows[0].modeLabel).toBe('Multimodal')
    expect(rows[0].modeFrequencies).toHaveLength(2)
  })

  it('deve consolidar saldos de disponível, reservado e bloqueado por grupo', () => {
    const rows = groupStockByMaterial(sampleLots)
    const mat100Dp10 = rows.find(
      (r) => r.material_code === 'MAT-100' && r.storage_location === 'DP10',
    )!

    // LOTE-101 (disp: 10, res: 0, bloq: 0)
    // LOTE-102 (disp: 10, res: 2, bloq: 0)
    // LOTE-103 (disp: 16, res: 0, bloq: 1)
    expect(mat100Dp10.available_qty).toBe(36)
    expect(mat100Dp10.reserved_qty).toBe(2)
    expect(mat100Dp10.blocked_qty).toBe(1)
  })
})
