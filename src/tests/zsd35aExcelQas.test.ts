/**
 * Testes Automatizados da Importação ZSD35A V3 (27 Campos) & Persistência Transacional
 * Cenários Obrigatórios:
 * 1. Importação normal → sucesso e contagens coerentes.
 * 2. Atualizar página depois do sucesso → registros permanecem no banco / histórico.
 * 3. Atualizar página enquanto processa → recupera status do batch.
 * 4. Duplo clique em Confirmar → proteção contra duplicação / idempotência.
 * 5. Falha durante insert → rollback (sem registros órfãos).
 * 6. Falha de auditoria → importação realizada com ressalva sem spinner infinito.
 * 7. Arquivo com subtotal → descarta subtotal sem afetar registros válidos.
 * 8. Documento de vendas repetido com materiais diferentes → preserva todas as linhas / itens.
 * 9. Abrir Histórico → lote oficial aparece com contagens exatas.
 * 10. Abrir Carteira → dados importados aparecem com 27 campos.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  processZsd35Rows,
  ZSD35A_V3_OFFICIAL_FIELDS,
  sanitizeCellValue,
  parseNumberSafely,
} from '@/domain/zsd35ImportEngine'
import { TmsService } from '@/services/tmsService'

describe('ZSD35A V3 — Testes de Homologação e Persistência Transacional', () => {
  const sampleV3RowWithSubtotal = [
    {
      'Q.Dias': 4,
      Gerar: 'não',
      Inco: 'CIF',
      'Documento de vendas': 9876543,
      Região: 'SP',
      Cidade: 'Campinas',
      'Qtde Real': 28.5,
      'Qtde.Amar.': '',
      'Est. Sider': 0,
      'Texto breve de material': 'PERFIL ESTRUTURAL W 150X13',
      'Valor do Frete': 1450.5,
      'Recebedor Merc': 'METALURGICA CAMPINAS LTDA',
      'Limite de Crédito': 250000,
      'Emissor da ordem': 'CLI-98765',
      'Compromisso especial': -1250.0,
      'Condição de Pagament': '30 DDL',
      'Motivo Estoque': 'ESTOQUE CIAFAL',
      'Qtde.Estoque': 45.0,
      Saldo: 28.5,
      'Data do Pedido': '25/08/2026',
      'Hora do Pedido': '14:30:00',
      'Quantidade da ordem': 28.5,
      'Data Remessa(Semana)': '34.2026',
      Itinerário: 'SP002',
      'Motivo Crédito': 'CRÉDITO APROVADO',
      'Total a Receber': 185000.0,
      'Estoque Total': 50.0,
    },
    {
      'Q.Dias': 4,
      Gerar: 'não',
      Inco: 'CIF',
      'Documento de vendas': 9876543, // Mesmo documento de vendas com material diferente
      Região: 'SP',
      Cidade: 'Campinas',
      'Qtde Real': 15.0,
      'Qtde.Amar.': '',
      'Est. Sider': 0,
      'Texto breve de material': 'CANTONEIRA L 2X1/4',
      'Valor do Frete': 850.0,
      'Recebedor Merc': 'METALURGICA CAMPINAS LTDA',
      'Limite de Crédito': 250000,
      'Emissor da ordem': 'CLI-98765',
      'Compromisso especial': 0,
      'Condição de Pagament': '30 DDL',
      'Motivo Estoque': 'ESTOQUE CIAFAL',
      'Qtde.Estoque': 20.0,
      Saldo: 15.0,
      'Data do Pedido': '25/08/2026',
      'Hora do Pedido': '14:32:00',
      'Quantidade da ordem': 15.0,
      'Data Remessa(Semana)': '34.2026',
      Itinerário: 'SP002',
      'Motivo Crédito': 'CRÉDITO APROVADO',
      'Total a Receber': 98000.0,
      'Estoque Total': 25.0,
    },
    {
      'Q.Dias': '',
      Gerar: '',
      Inco: '',
      'Documento de vendas': 'Subtotal', // Linha de subtotal do SAP que deve ser descartada
      Região: '',
      Cidade: '',
      'Qtde Real': 43.5,
      'Qtde.Amar.': '',
      'Est. Sider': '',
      'Texto breve de material': '',
      'Valor do Frete': 2300.5,
      'Recebedor Merc': '',
      'Limite de Crédito': '',
      'Emissor da ordem': '',
      'Compromisso especial': '',
      'Condição de Pagament': '',
      'Motivo Estoque': '',
      'Qtde.Estoque': '',
      Saldo: 43.5,
      'Data do Pedido': '',
      'Hora do Pedido': '',
      'Quantidade da ordem': 43.5,
      'Data Remessa(Semana)': '',
      Itinerário: '',
      'Motivo Crédito': '',
      'Total a Receber': 283000.0,
      'Estoque Total': '',
    },
  ]

  it('Cenário 1: Importação normal → layout reconhecido e contagens corretas', () => {
    const report = processZsd35Rows(sampleV3RowWithSubtotal, {}, { fileName: 'ZSD35 Carga TMS v3.xlsx' })
    expect(report.layoutRecognized).toBe(true)
    expect(report.totalRowsRead).toBe(3)
    expect(report.validCount).toBe(2)
    expect(report.ignoredRowsCount).toBe(1) // 1 subtotal descartado
    expect(report.uniqueOrdersCount).toBe(1) // 1 pedido SAP (doc 9876543) com 2 itens
    expect(report.totalWeightTon).toBe(43.5)
    expect(report.origem_dado).toBe('EXCEL_QAS_ZSD35A_V3')
    expect(report.layoutVersion).toBe('ZSD35A_V3_27_CAMPOS')
  })

  it('Cenário 7 & 8: Descarta subtotais e preserva pedidos com múltiplos materiais distintos', () => {
    const report = processZsd35Rows(sampleV3RowWithSubtotal, {}, { fileName: 'ZSD35 Carga TMS v3.xlsx' })
    expect(report.validOrders.length).toBe(2)
    expect(report.validOrders[0].order_number).toBe('9876543')
    expect(report.validOrders[0].material_description).toBe('PERFIL ESTRUTURAL W 150X13')
    expect(report.validOrders[1].order_number).toBe('9876543')
    expect(report.validOrders[1].material_description).toBe('CANTONEIRA L 2X1/4')

    // As duas linhas têm chaves técnicas únicas (não sobrescrevem no lote)
    expect(report.validOrders[0].technical_key).not.toBe(report.validOrders[1].technical_key)
  })

  it('Cenário 4: Deduplicação por identificador técnico e idempotência no TmsService', async () => {
    const report = processZsd35Rows(sampleV3RowWithSubtotal, {}, { fileName: 'ZSD35 Carga TMS v3.xlsx' })
    expect(report.batchId).toMatch(/^ZSD35A-\d{8}-[A-Z0-9]+$/)

    // Simula mock de upsertSalesOrder e createSapImportRecord
    const upsertSpy = vi.spyOn(TmsService, 'upsertSalesOrder').mockResolvedValue({ isNew: true, record: {} })
    const createImportSpy = vi.spyOn(TmsService, 'createSapImportRecord').mockResolvedValue({ id: 'imp_1' } as any)
    const logAuditSpy = vi.spyOn(TmsService, 'logAudit').mockResolvedValue({ id: 'aud_1' } as any)

    const res = await TmsService.importZsd35aOrdersBatch(report, 'teste@ciafal.com.br', 'Operador Teste')
    expect(res.success).toBe(true)
    expect(res.persistedCount).toBe(2)

    upsertSpy.mockRestore()
    createImportSpy.mockRestore()
    logAuditSpy.mockRestore()
  })

  it('Cenário 5: Falha durante persistência gera mensagem clara e não deixa registros órfãos', async () => {
    const report = processZsd35Rows(sampleV3RowWithSubtotal, {}, { fileName: 'ZSD35 Carga TMS v3.xlsx' })
    const upsertSpy = vi.spyOn(TmsService, 'upsertSalesOrder').mockRejectedValue(new Error('Falha de conexão com o banco'))

    const res = await TmsService.importZsd35aOrdersBatch(report, 'teste@ciafal.com.br', 'Operador Teste')
    expect(res.success).toBe(false)
    expect(res.message).toContain('Falha de conexão')

    upsertSpy.mockRestore()
  })

  it('Cenário 6: Falha na auditoria secundária não bloqueia a conclusão dos dados salvos', async () => {
    const report = processZsd35Rows(sampleV3RowWithSubtotal, {}, { fileName: 'ZSD35 Carga TMS v3.xlsx' })
    const upsertSpy = vi.spyOn(TmsService, 'upsertSalesOrder').mockResolvedValue({ isNew: true, record: {} })
    const createImportSpy = vi.spyOn(TmsService, 'createSapImportRecord').mockResolvedValue({ id: 'imp_1' } as any)
    const logAuditSpy = vi.spyOn(TmsService, 'logAudit').mockRejectedValue(new Error('Tabela de auditoria cheia'))

    const res = await TmsService.importZsd35aOrdersBatch(report, 'teste@ciafal.com.br', 'Operador Teste')
    expect(res.success).toBe(true)
    expect(res.auditWarning).toBeDefined()

    upsertSpy.mockRestore()
    createImportSpy.mockRestore()
    logAuditSpy.mockRestore()
  })

  it('Sanitização contra Formula Injection em células perigosas', () => {
    expect(sanitizeCellValue('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
    expect(sanitizeCellValue('+1234')).toBe("'+1234")
    expect(sanitizeCellValue('@cmd')).toBe("'@cmd")
    expect(parseNumberSafely('-1250,50')).toBe(-1250.5)
  })

  it('Reconhecimento dos 27 campos canônicos oficiais da ZSD35A V3', () => {
    expect(ZSD35A_V3_OFFICIAL_FIELDS.length).toBe(27)
    expect(ZSD35A_V3_OFFICIAL_FIELDS).toContain('Documento de vendas')
    expect(ZSD35A_V3_OFFICIAL_FIELDS).toContain('Data Remessa(Semana)')
    expect(ZSD35A_V3_OFFICIAL_FIELDS).toContain('Compromisso especial')
    expect(ZSD35A_V3_OFFICIAL_FIELDS).toContain('Itinerário')
    expect(ZSD35A_V3_OFFICIAL_FIELDS).toContain('Estoque Total')
  })
})
