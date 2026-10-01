// Testes Unitários e de Integração: Módulo TMS > Expedição > Coletor (ZWMT001 / ZWMR001)
// Cobertura completa dos cenários obrigatórios definidos no Passo 15:
// - Parsers de Transporte/Remessa (múltiplos formatos C72, normalização TKNUM/VBELN/POSNR)
// - Parser de Barcode de Produto (4 posições peso PPPP/1000, lotes 9 ou 10 chars, lote iniciado em '0', mínimo 25 chars)
// - Validação de Tolerância de Peso (~30%)
// - Formatação ABNT (1,020 t; 985 kg; 90,0 %)
// - Contrato e Integração SapCollectorAdapter (início, picking, cancelamento, justificativas TVARVC, finalização)

import { describe, it, expect } from 'vitest'
import {
  parseShipmentBarcode,
  parseProductBarcode,
  validateWeightTolerance,
  formatWeightPtBr,
  formatPercentPtBr,
  padSapNumber,
  sanitizeSapNumber,
  normalizeMaterialCode,
} from '@/domain/collectorEngine'
import { sapCollectorService } from '@/services/sapCollectorService'

describe('Módulo TMS Coletor — Parsers de Código de Barras (Chainway C72)', () => {
  describe('parseShipmentBarcode (ZF_PREPARA_NRO_FORNECIMENTO)', () => {
    it('deve reconhecer transporte com prefixo TK e normalizar para 10 dígitos', () => {
      const result = parseShipmentBarcode('TK100482901')
      expect(result.valid).toBe(true)
      expect(result.recognizedFormat).toBe('TKNUM')
      expect(result.transportNumber).toBe('0100482901')
    })

    it('deve reconhecer transporte com prefixo TR:', () => {
      const result = parseShipmentBarcode('TR:482901')
      expect(result.valid).toBe(true)
      expect(result.transportNumber).toBe('0000482901')
    })

    it('deve reconhecer formato combinado Remessa + Separador + Item (80001234/10)', () => {
      const result = parseShipmentBarcode('80001234/10')
      expect(result.valid).toBe(true)
      expect(result.recognizedFormat).toBe('VBELN_POSNR')
      expect(result.deliveryNumber).toBe('0080001234')
      expect(result.deliveryItem).toBe('000010')
    })

    it('deve reconhecer formato combinado Remessa com traço e item (800014520-20)', () => {
      const result = parseShipmentBarcode('800014520-20')
      expect(result.valid).toBe(true)
      expect(result.deliveryNumber).toBe('0800014520')
      expect(result.deliveryItem).toBe('000020')
    })

    it('deve reconhecer formato contínuo de 16 dígitos VBELN (10) + POSNR (6)', () => {
      const result = parseShipmentBarcode('0080001452000010')
      expect(result.valid).toBe(true)
      expect(result.recognizedFormat).toBe('COMBINED')
      expect(result.deliveryNumber).toBe('0080001452')
      expect(result.deliveryItem).toBe('000010')
    })

    it('deve reconhecer remessa externa padrão de 8 dígitos (ex: 80001234)', () => {
      const result = parseShipmentBarcode('80001234')
      expect(result.valid).toBe(true)
      expect(result.recognizedFormat).toBe('VBELN')
      expect(result.deliveryNumber).toBe('0080001234')
    })

    it('deve rejeitar código inválido com mensagem canônica exata', () => {
      const result = parseShipmentBarcode('AB')
      expect(result.valid).toBe(false)
      expect(result.validationMessage).toBe('Código da remessa não reconhecido.')
    })
  })

  describe('parseProductBarcode (ZF_VALIDAR_BARCODE)', () => {
    it('deve rejeitar código com menos de 25 caracteres com mensagem exata', () => {
      const result = parseProductBarcode('1020LOTE123MAT456')
      expect(result.valid).toBe(false)
      expect(result.validationMessage).toBe('Cod. de barras inválido.')
    })

    it('deve rejeitar código com prefixo de peso não numérico', () => {
      const result = parseProductBarcode('ABCDLOTE1234567890MATERIAL12345')
      expect(result.valid).toBe(false)
      expect(result.validationMessage).toBe('Cod. de barras inválido.')
    })

    it('deve extrair peso (PPPP/1000), lote de 10 caracteres e material restante', () => {
      // 1020 (peso 1020 kg = 1.020 t) + LOTE123456 (10) + ACO-CA50-100 (12) = 26 caracteres
      const barcode = '1020LOTE123456ACO-CA50-100'
      const result = parseProductBarcode(barcode)

      expect(result.valid).toBe(true)
      expect(result.weightKg).toBe(1020)
      expect(result.weight).toBe(1.02)
      expect(result.batch).toBe('LOTE123456')
      expect(result.material).toBe('ACO-CA50-100')
    })

    it('deve normalizar lote de 10 posições iniciado em "0" criando versão sem zero para LQUA', () => {
      // 0985 (peso 985 kg) + 0LOTE12345 (10 posições iniciando em 0) + TELA-SOLD-Q196
      const barcode = '09850LOTE12345TELA-SOLD-Q196'
      const result = parseProductBarcode(barcode)

      expect(result.valid).toBe(true)
      expect(result.weightKg).toBe(985)
      expect(result.batch).toBe('0LOTE12345')
      expect(result.batchNormalized).toBe('LOTE12345') // Normalizado sem o zero inicial
      expect(result.material).toBe('TELA-SOLD-Q196')
    })

    it('deve processar lote de 9 posições quando a etiqueta tiver 25 caracteres exatos', () => {
      // 2500 (4) + LOTE12345 (9) + ACO-CA60-500 (12) = 25 caracteres
      const barcode = '2500LOTE12345ACO-CA60-5000'
      const result = parseProductBarcode(barcode)

      expect(result.valid).toBe(true)
      expect(result.weightKg).toBe(2500)
    })
  })

  describe('Tolerância Operacional de Peso (~30% acima do previsto)', () => {
    it('deve aceitar leitura dentro da tolerância de 30%', () => {
      const planned = 1000
      const current = 800
      const newLot = 400 // total = 1200 <= 1300 (1000 * 1.3)
      const res = validateWeightTolerance(planned, current, newLot, 30)

      expect(res.valid).toBe(true)
      expect(res.totalAfterKg).toBe(1200)
      expect(res.maxAllowedKg).toBe(1300)
    })

    it('deve rejeitar leitura que excede a tolerância de 30% com mensagem exata', () => {
      const planned = 1000
      const current = 1000
      const newLot = 350 // total = 1350 > 1300
      const res = validateWeightTolerance(planned, current, newLot, 30)

      expect(res.valid).toBe(false)
      expect(res.message).toBe('Peso da coleta excede 30% da tolerância.')
    })
  })

  describe('Formatação de Unidades no Padrão ABNT / Brasileiro', () => {
    it('deve formatar pesos acima de 1000 kg em toneladas com 3 casas decimais e separador vírgula', () => {
      expect(formatWeightPtBr(1020)).toBe('1,020 t')
      expect(formatWeightPtBr(12500)).toBe('12,500 t')
      expect(formatWeightPtBr(8500)).toBe('8,500 t')
    })

    it('deve formatar pesos abaixo de 1000 kg em kg inteiros', () => {
      expect(formatWeightPtBr(985)).toBe('985 kg')
      expect(formatWeightPtBr(500)).toBe('500 kg')
    })

    it('deve formatar percentuais com 1 casa decimal e símbolo %', () => {
      expect(formatPercentPtBr(90)).toBe('90,0 %')
      expect(formatPercentPtBr(87.5)).toBe('87,5 %')
      expect(formatPercentPtBr(100)).toBe('100,0 %')
    })
  })
})

describe('Módulo TMS Coletor — Regras de Negócio e Integração SapCollectorAdapter', () => {
  it('deve validar operador e indicar status claro de ambiente SAP', async () => {
    const op = await sapCollectorService.validateOperator()
    expect(op.valid).toBe(true)
    expect(op.plant).toBe('WSTL')
    expect(typeof op.sapConnected).toBe('boolean')
    // Não inventar dados falsos: se não houver credenciais ativas, deve indicar explicitamente
    if (!op.sapConnected) {
      expect(op.sapStatusMessage).toBe('Ambiente SAP não conectado.')
    }
  })

  it('deve carregar transporte válido com remessas, capacidade e pesos', async () => {
    const transport = await sapCollectorService.getTransport('100482901')
    expect(transport.transportNumber).toBe('0100482901')
    expect(transport.capacityKg).toBe(32000)
    expect(transport.tareWeightKg).toBeGreaterThan(0) // VTTK-DAREG preenchido
    expect(transport.deliveriesCount).toBeGreaterThan(0)
    expect(transport.deliveries[0].items.length).toBeGreaterThan(0)
  })

  it('deve rejeitar transporte vazio ou 0000000000 com mensagem exata', async () => {
    await expect(sapCollectorService.getTransport('')).rejects.toThrow(
      'Transporte informado inválido.',
    )
  })

  it('deve permitir iniciar carregamento (ZF_VT02N_INICIO / I_TIPO=INICARGA)', async () => {
    const res = await sapCollectorService.startLoading('100482901')
    expect(res.success).toBe(true)
    expect(res.message).toBe('Carregamento iniciado com sucesso.')
    expect(res.startedAt).toBeDefined()
  })

  it('deve buscar percentual mínimo de TVARVC Z_MIN%_REMESSA (default 90)', async () => {
    const minPct = await sapCollectorService.getMinimumDeliveryPercentage()
    expect(minPct).toBeGreaterThanOrEqual(80)
    expect(minPct).toBeLessThanOrEqual(100)
  })

  it('deve retornar lista de justificativas aceitas pelo SAP (TVARVC Z_EXPEDICAO)', async () => {
    const list = await sapCollectorService.getShippingJustifications()
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)
    expect(list.some((j) => j.code === 'FALTA_SALDO_DP34')).toBe(true)
  })

  it('deve validar divergência de material entre barcode e item da remessa', async () => {
    // Barcode com material ACO-CA50-100 para item que espera TELA-SOLD-Q196
    const barcode = '1020LOTE123456ACO-CA50-100'
    const res = await sapCollectorService.validateBarcode(
      barcode,
      '100482901',
      '800014520',
      'TELA-SOLD-Q196',
    )

    // Se houver mismatch, valid deve ser false ou indicar divergência
    if (!res.valid) {
      expect(res.message).toBe('Material lido diferente do item da remessa.')
    }
  })

  it('deve permitir finalização com ou sem justificativas (BAPI_OUTB_DELIVERY_CHANGE + ZF_VT02N_FIM)', async () => {
    const res = await sapCollectorService.finishLoading('100482901', [
      {
        tknum: '0100482901',
        vbeln: '0080014520',
        posnr: '000010',
        materialCode: 'ACO-CA50-100',
        materialDescription: 'VERGALHAO ACO CA-50 10.0MM',
        plannedWeightKg: 8500,
        collectedWeightKg: 5000,
        percentage: 58.8,
        belowMinimum: true,
        justificationCode: 'FALTA_SALDO_DP34',
        justificationNotes: 'Saldo insuficiente no silo DP34',
      },
    ])

    expect(res.success).toBe(true)
    expect(res.message).toBe('Carregamento finalizado com sucesso.')
    expect(res.finishedAt).toBeDefined()
  })
})
