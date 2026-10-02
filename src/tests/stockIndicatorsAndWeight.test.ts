import { describe, it, expect } from 'vitest'
import { formatWeight } from '@/lib/utils'
import {
  calculateStockLotMetrics,
  getStockItemWeightTons,
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
})
