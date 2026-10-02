import { describe, it, expect, beforeEach, vi } from 'vitest'
import { tmsService } from '@/services/tmsService'
import { pb } from '@/lib/pocketbase/client'

describe('Central de Oportunidades Comerciais - 4 Cenários de Aceite Obrigatórios', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Cenário 1 — envio unitário:
   * oportunidade identificada → selecionar → Enviar p/ Comercial → confirmar →
   * mensagem de sucesso → status Enviada ao Comercial → histórico registrado.
   */
  it('Cenário 1 — Envio unitário: selecionar 1 oportunidade, confirmar envio, transição para Enviada ao Comercial e histórico registrado', async () => {
    const oppMock = {
      id: 'opp-unit-001',
      opportunity_code: 'OPP-UNIT-001',
      load_proposal_id: 'PROP-MG-01',
      itinerary_id: 'MG001C',
      customer_name: 'AÇO MINAS LTDA',
      customer_sap_code: '13371',
      material_id: 'MAT-CA50-12',
      material_description: 'Vergalhão CA-50 12.5mm',
      suggested_quantity_kg: 6000,
      missing_weight_kg: 6150,
      commercial_status: 'Nova',
      is_blocked: false,
      block_reason: '',
      stock_status: 'Disponível em Estoque (DP34)',
      credit_status: 'Crédito OK',
      commercial_representative: 'Carlos Eduardo',
      ai_recommendation: 'Complemento de 6t ideal para fechar carga.',
    }

    // Mock das collections do PocketBase
    const updateSpy = vi.fn().mockResolvedValue({ ...oppMock, commercial_status: 'Enviada ao Comercial' })
    const historyCreateSpy = vi.fn().mockResolvedValue({ id: 'hist-001' })
    const auditCreateSpy = vi.fn().mockResolvedValue({ id: 'audit-001' })

    vi.spyOn(pb, 'collection').mockImplementation((colName: string): any => {
      if (colName === 'load_complement_opportunities') {
        return {
          getOne: vi.fn().mockResolvedValue(oppMock),
          update: updateSpy,
        }
      }
      if (colName === 'load_complement_history') {
        return {
          create: historyCreateSpy,
          getFullList: vi.fn().mockResolvedValue([
            {
              id: 'hist-001',
              opportunity_code: 'OPP-UNIT-001',
              event_title: 'Enviada para Comercial',
              new_status: 'Enviada ao Comercial',
              user_name: 'João Silva',
            },
          ]),
        }
      }
      if (colName === 'audit_logs') {
        return {
          create: auditCreateSpy,
        }
      }
      return {
        getOne: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        getFullList: vi.fn().mockResolvedValue([]),
      }
    })

    // Executa o envio unitário via tmsService
    const result = await tmsService.sendLoadComplementsBatchToCommercial({
      opportunityIds: ['opp-unit-001'],
      userEmail: 'joao.silva@ciafal.com.br',
      userName: 'João Silva',
      userRole: 'gerente_carga',
      isResend: false,
    })

    expect(result.success).toBe(true)
    expect(result.sentCount).toBe(1)
    expect(result.message).toContain('Oportunidades enviadas ao Comercial com sucesso.')
    expect(updateSpy).toHaveBeenCalledWith(
      'opp-unit-001',
      expect.objectContaining({
        commercial_status: 'Enviada ao Comercial',
        commercial_sent_by: 'João Silva',
      }),
    )
    expect(historyCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunity_code: 'OPP-UNIT-001',
        new_status: 'Enviada ao Comercial',
        user_name: 'João Silva',
      }),
    )
    expect(auditCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SEND_COMPLEMENT_TO_COMMERCIAL',
        resource_id: 'opp-unit-001',
        new_state: 'Enviada ao Comercial',
      }),
    )
  })

  /**
   * Cenário 2 — envio em lote:
   * selecionar 5 → popup mostra 5 → confirmar → 5 registros atualizados, nenhuma duplicação.
   */
  it('Cenário 2 — Envio em lote: selecionar 5 oportunidades, confirmar, atualizar todos os 5 registros sem duplicação', async () => {
    const oppMocks = [1, 2, 3, 4, 5].map((i) => ({
      id: `opp-batch-00${i}`,
      opportunity_code: `OPP-BATCH-00${i}`,
      load_proposal_id: `PROP-SP-0${i}`,
      itinerary_id: 'SP002C',
      customer_name: `Cliente Batch ${i}`,
      customer_sap_code: `1000${i}`,
      material_id: 'MAT-CA60',
      material_description: 'Vergalhão CA-60',
      suggested_quantity_kg: 5000,
      missing_weight_kg: 5000,
      commercial_status: 'Nova',
      is_blocked: false,
      block_reason: '',
      stock_status: 'Disponível em Estoque (DP34)',
      credit_status: 'Crédito OK',
    }))

    const updateCalls: any[] = []
    const historyCalls: any[] = []

    vi.spyOn(pb, 'collection').mockImplementation((colName: string): any => {
      if (colName === 'load_complement_opportunities') {
        return {
          getOne: vi.fn().mockImplementation((id: string) => {
            const found = oppMocks.find((m) => m.id === id)
            return Promise.resolve(found)
          }),
          update: vi.fn().mockImplementation((id: string, data: any) => {
            updateCalls.push({ id, data })
            return Promise.resolve({ id, ...data })
          }),
        }
      }
      if (colName === 'load_complement_history') {
        return {
          create: vi.fn().mockImplementation((data: any) => {
            historyCalls.push(data)
            return Promise.resolve({ id: `hist-${Date.now()}`, ...data })
          }),
        }
      }
      if (colName === 'audit_logs') {
        return {
          create: vi.fn().mockResolvedValue({ id: 'audit-batch' }),
        }
      }
      return {
        getOne: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      }
    })

    const result = await tmsService.sendLoadComplementsBatchToCommercial({
      opportunityIds: oppMocks.map((o) => o.id),
      userEmail: 'gestor@ciafal.com.br',
      userName: 'Gestor Logístico',
      userRole: 'gestor_logistica',
      isResend: false,
    })

    expect(result.success).toBe(true)
    expect(result.sentCount).toBe(5)
    expect(result.message).toContain('5 oportunidades enviadas ao Comercial com sucesso.')
    expect(updateCalls.length).toBe(5)
    expect(historyCalls.length).toBe(5)

    // Garantir que não houve IDs duplicados processados
    const uniqueUpdatedIds = new Set(updateCalls.map((u) => u.id))
    expect(uniqueUpdatedIds.size).toBe(5)
  })

  /**
   * Cenário 3 — bloqueio:
   * oportunidade com bloqueio → checkbox indisponível → tooltip informa motivo → envio impedido (inclusive tentativa direta no backend).
   */
  it('Cenário 3 — Bloqueio impeditivo: oportunidade bloqueada por crédito/material/regra não pode ser enviada', async () => {
    const blockedOpp = {
      id: 'opp-blocked-999',
      opportunity_code: 'OPP-BLOCKED-999',
      load_proposal_id: 'PROP-RJ-99',
      itinerary_id: 'RJ001C',
      customer_name: 'SIDERÚRGICA CARIOCA',
      customer_sap_code: '15882',
      material_id: 'MAT-TUB-IND',
      suggested_quantity_kg: 4500,
      missing_weight_kg: 4650,
      commercial_status: 'Nova',
      is_blocked: true,
      block_reason: 'Crédito bloqueado no SAP pelo financeiro (limite excedido)',
    }

    const updateSpy = vi.fn()

    vi.spyOn(pb, 'collection').mockImplementation((colName: string): any => {
      if (colName === 'load_complement_opportunities') {
        return {
          getOne: vi.fn().mockResolvedValue(blockedOpp),
          update: updateSpy,
        }
      }
      return {
        getOne: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      }
    })

    const result = await tmsService.sendLoadComplementsBatchToCommercial({
      opportunityIds: ['opp-blocked-999'],
      userEmail: 'operador@ciafal.com.br',
      userName: 'Operador Logístico',
      userRole: 'gerente_carga',
    })

    // Envio deve ser estritamente impedido
    expect(result.success).toBe(false)
    expect(result.isBlocked).toBe(true)
    expect(result.message).toContain('Crédito bloqueado no SAP')
    expect(updateSpy).not.toHaveBeenCalled()
  })

  /**
   * Cenário 4 — integração:
   * oportunidade enviada → Comercial realiza venda → pedido aparece no SAP →
   * integração RFC/BAPI identifica o pedido → TMS correlaciona pedido à oportunidade/carga →
   * status passa para CONVERTIDA EM VENDA.
   */
  it('Cenário 4 — Integração SAP: novo pedido na rota correlaciona com carga e atualiza oportunidade para CONVERTIDA EM VENDA', async () => {
    const sapOrderMock = {
      id: 'order-sap-7788',
      order_number: '0040182901',
      item_number: '000010',
      customer_code: 'CLI-13371',
      customer_name: 'COMERCIAL DE LAMINADOS E FERROS LTD',
      destination_city: 'BELO HORIZONTE',
      uf: 'MG',
      itinerary_code: 'MG001C',
      weight_kg: 6000,
      total_value: 36000,
      material: 'MAT-CA50-12',
      material_description: 'Vergalhão CA-50 12.5mm',
      credit_status: 'Liberado',
      stock_situation: 'DP34 Total',
    }

    const openProposalMock = {
      id: 'prop-rec-001',
      proposal_number: 'PROP-2026-MG01',
      itinerary_code: 'MG001C',
      planned_dispatch_date: '2026-09-05',
      vehicle_capacity_kg: 27000,
      current_weight_kg: 19500,
      current_occupancy_pct: 72.2,
      min_occupancy_pct: 75,
      max_occupancy_pct: 95,
      classification_status: 'Carga parcial — Complemento Comercial',
      lifecycle_stage: 'Planejada',
      orders_count: 2,
    }

    const complementOppMock = {
      id: 'opp-m50-001',
      opportunity_code: 'OPP-CIAFAL-2026-001',
      load_proposal_id: 'PROP-2026-MG01',
      commercial_status: 'Enviada ao Comercial',
      missing_weight_kg: 6150,
      current_weight_kg: 19500,
      current_occupancy_pct: 72.2,
    }

    const oppUpdateSpy = vi.fn().mockResolvedValue({ id: 'opp-m50-001' })
    const proposalUpdateSpy = vi.fn().mockResolvedValue({ id: 'prop-rec-001' })
    const proposalItemCreateSpy = vi.fn().mockResolvedValue({ id: 'item-001' })
    const historyCreateSpy = vi.fn().mockResolvedValue({ id: 'hist-conv-001' })

    vi.spyOn(pb, 'collection').mockImplementation((colName: string): any => {
      if (colName === 'sap_sales_orders') {
        return {
          getOne: vi.fn().mockResolvedValue(sapOrderMock),
        }
      }
      if (colName === 'load_proposals') {
        return {
          getFullList: vi.fn().mockResolvedValue([openProposalMock]),
          update: proposalUpdateSpy,
        }
      }
      if (colName === 'load_proposal_items') {
        return {
          create: proposalItemCreateSpy,
        }
      }
      if (colName === 'load_complement_opportunities') {
        return {
          getFullList: vi.fn().mockResolvedValue([complementOppMock]),
          update: oppUpdateSpy,
        }
      }
      if (colName === 'load_complement_history') {
        return {
          create: historyCreateSpy,
        }
      }
      if (colName === 'audit_logs') {
        return {
          create: vi.fn().mockResolvedValue({ id: 'audit-corr-001' }),
        }
      }
      return {
        getOne: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        getFullList: vi.fn().mockResolvedValue([]),
      }
    })

    const correlationRes = await tmsService.correlateSapOrderWithComplement(
      'order-sap-7788',
      'sap.integration@ciafal.com.br',
      'Integração SAP RFC/BAPI',
    )

    expect(correlationRes.correlated).toBe(true)
    expect(correlationRes.proposalNumber).toBe('PROP-2026-MG01')
    expect(correlationRes.message).toContain('Complemento comercial incorporado com sucesso.')

    // Validar transição da oportunidade para 'Convertida em venda'
    expect(oppUpdateSpy).toHaveBeenCalledWith(
      'opp-m50-001',
      expect.objectContaining({
        commercial_status: 'Convertida em venda',
        sap_order_id: '0040182901',
      }),
    )

    // Validar histórico auditável de conversão
    expect(historyCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunity_code: 'OPP-CIAFAL-2026-001',
        event_title: 'Venda confirmada / Integração SAP',
        new_status: 'Convertida em venda',
      }),
    )
  })
})
