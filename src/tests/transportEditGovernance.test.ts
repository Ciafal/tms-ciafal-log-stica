import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  STANDARDIZED_EDIT_REASONS,
  computeFieldComparisons,
  evaluateStatusRules,
  detectCriticalChanges,
  evaluateSapIntegration,
  TransportEditableRecord,
} from '@/domain/transportEditEngine'
import { transportEditService } from '@/services/transportEditService'
import { pb } from '@/lib/pocketbase/client'

describe('Motor e Governança de Edição de Transporte (Editar Transporte - TMS CIAFAL)', () => {
  const baseMockTransport: TransportEditableRecord = {
    id: 'rec_transport_001',
    transport_number: 'TR-10045',
    sap_transport_number: '00900123',
    transport_order_number: 'TO-10045',
    delivery_number: '10045001',
    order_number: '4501234',
    company_code: '1000',
    company_name: 'CIAFAL Matriz',
    plant_code: '1010',
    plant_name: 'Planta Principal Contagem',
    creation_date: '2025-05-10T08:00:00Z',
    status: 'Planejado',
    origin_system_source: 'SAP ECC (BAPI_SHIPMENT_CREATE / VT01N)',
    sync_version: 1,
    last_modified_at: '2025-05-10T10:00:00.000Z',
    last_modified_by: 'operador.logistica@ciafal.com.br',
    sap_sync_status: 'SINCRONIZADO',
    carrier_name: 'TRANSLOG CIAFAL',
    driver_id: 'drv_001',
    driver_name: 'Carlos da Silva',
    driver_cpf: '123.456.789-00',
    vehicle_plate: 'ABC-1234',
    trailer_plate: 'XYZ-9876',
    vehicle_type: 'Carreta Vanderléia 3 Eixos',
    itinerary_code: 'IT-BH-SP',
    itinerary_description: 'Contagem MG -> São Paulo SP',
    scheduled_loading_date: '2025-05-12',
    scheduled_loading_time: '08:30',
    scheduled_delivery_date: '2025-05-13',
    total_weight_kg: 28500,
    total_weight_ton: 28.5,
    discharges_count: 2,
    destination_city: 'São Paulo',
    destination_uf: 'SP',
    customer_summary: 'Aço Forte Distribuidora & Cia',
    remessas: [
      {
        delivery_number: '10045001',
        order_number: '4501234',
        sequence: 1,
        customer_code: 'CLI-001',
        customer_name: 'Aço Forte Distribuidora',
        destination_city: 'São Paulo',
        destination_uf: 'SP',
        weight_kg: 18000,
        weight_ton: 18,
        items: [
          {
            item_number: '10',
            material_code: 'VERGALHAO-CA50-10MM',
            material_description: 'Vergalhão CA-50 10.0mm 12m',
            quantity: 1800,
            unit: 'KG',
            weight_kg: 18000,
          },
        ],
      },
      {
        delivery_number: '10045002',
        order_number: '4501235',
        sequence: 2,
        customer_code: 'CLI-002',
        customer_name: 'Estruturas Metálicas Paulistas',
        destination_city: 'Campinas',
        destination_uf: 'SP',
        weight_kg: 10500,
        weight_ton: 10.5,
        items: [
          {
            item_number: '10',
            material_code: 'PERFIL-W-200X15',
            material_description: 'Perfil Estrutural W 200x15',
            quantity: 1050,
            unit: 'KG',
            weight_kg: 10500,
          },
        ],
      },
    ],
  }

  // 1. Cálculo de diff antes/depois
  describe('1. Cálculo de Diff (computeFieldComparisons)', () => {
    it('deve calcular corretamente as diferenças antes/depois campo a campo', () => {
      const modified = {
        carrier_name: 'RODOLOG TRANSPORTE LTDA',
        driver_name: 'João Pedro de Oliveira',
        vehicle_plate: 'BRA2E19',
        total_weight_kg: 30000,
      }

      const diffs = computeFieldComparisons(baseMockTransport, modified)

      expect(diffs).toHaveLength(4)

      const carrierDiff = diffs.find((d) => d.field === 'carrier_name')
      expect(carrierDiff).toBeDefined()
      expect(carrierDiff?.old_value).toBe('TRANSLOG CIAFAL')
      expect(carrierDiff?.new_value).toBe('RODOLOG TRANSPORTE LTDA')
      expect(carrierDiff?.field_label).toBe('Transportadora')

      const driverDiff = diffs.find((d) => d.field === 'driver_name')
      expect(driverDiff?.old_value).toBe('Carlos da Silva')
      expect(driverDiff?.new_value).toBe('João Pedro de Oliveira')

      const plateDiff = diffs.find((d) => d.field === 'vehicle_plate')
      expect(plateDiff?.old_value).toBe('ABC-1234')
      expect(plateDiff?.new_value).toBe('BRA2E19')

      const weightDiff = diffs.find((d) => d.field === 'total_weight_kg')
      expect(weightDiff?.old_value).toBe(28500)
      expect(weightDiff?.new_value).toBe(30000)
    })

    it('deve detectar exclusão de remessa e marcar como crítica', () => {
      // Remove a segunda remessa
      const modified = {
        remessas: [baseMockTransport.remessas[0]],
      }

      const diffs = computeFieldComparisons(baseMockTransport, modified)
      const removedDiff = diffs.find((d) => d.field === 'remessa_removed')

      expect(removedDiff).toBeDefined()
      expect(removedDiff?.is_critical).toBe(true)
      expect(removedDiff?.delivery_number).toBe('10045002')
    })

    it('deve retornar array vazio se nenhum campo for alterado', () => {
      const diffs = computeFieldComparisons(baseMockTransport, {})
      expect(diffs).toEqual([])
    })
  })

  // 2. Validação de Motivos (21 opções padronizadas)
  describe('2. Validação de Motivos e Descrição Obrigatória para "Outro"', () => {
    it('deve conter exatamente 21 opções padronizadas de motivos oficiais', () => {
      expect(STANDARDIZED_EDIT_REASONS).toHaveLength(21)
      expect(STANDARDIZED_EDIT_REASONS).toContain('Alteração de transportadora')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Alteração de motorista')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Alteração de veículo')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Alteração de placa')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Alteração de itinerário')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Alteração de rota')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Alteração de data de carregamento')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Alteração de previsão de entrega')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Alteração de remessa')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Inclusão de remessa')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Exclusão de remessa')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Alteração solicitada pelo cliente')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Alteração solicitada pelo Comercial')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Alteração solicitada pela Expedição')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Alteração solicitada pelo PCP')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Alteração solicitada pela Transportadora')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Correção de cadastro')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Correção de integração SAP')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Erro operacional')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Reprogramação logística')
      expect(STANDARDIZED_EDIT_REASONS).toContain('Outro')
    })
  })

  // 3. Justificativa < 10 caracteres rejeitada
  describe('3. Validação de Justificativa Mínima de 10 Caracteres', () => {
    it('deve rejeitar justificativa com menos de 10 caracteres no serviço', async () => {
      await expect(
        transportEditService.saveTransportChanges({
          transport_id: 'rec_transport_001',
          original_record: baseMockTransport,
          modified_fields: { driver_name: 'Novo Motorista' },
          reason: 'Alteração de motorista',
          justification: 'Curto', // 5 caracteres < 10
          current_user: { name: 'Operador', email: 'op@ciafal.com.br', role: 'operador_logistica' },
        }),
      ).rejects.toThrow('pelo menos 10 caracteres')
    })

    it('deve rejeitar justificativa vazia ou com espaços em branco', async () => {
      await expect(
        transportEditService.saveTransportChanges({
          transport_id: 'rec_transport_001',
          original_record: baseMockTransport,
          modified_fields: { driver_name: 'Novo Motorista' },
          reason: 'Alteração de motorista',
          justification: '         ', // somente espaços
          current_user: { name: 'Operador', email: 'op@ciafal.com.br', role: 'operador_logistica' },
        }),
      ).rejects.toThrow('pelo menos 10 caracteres')
    })
  })

  // 4. Regras por Status Operacional
  describe('4. Regras por Status Operacional (Item 14 do Requisito)', () => {
    it('"Em carregamento": bloqueia alteração de remessas e peso', () => {
      const rule = evaluateStatusRules('Em carregamento', 'operador_logistica')
      expect(rule.canEdit).toBe(true)
      expect(rule.isCriticalStatus).toBe(true)
      expect(rule.readOnlyFields).toContain('remessas')
      expect(rule.readOnlyFields).toContain('total_weight_kg')
      expect(rule.readOnlyFields).toContain('total_weight_ton')
      expect(rule.warningMessages.some((msg) => msg.includes('processo físico de carregamento'))).toBe(true)
    })

    it('"Faturado": bloqueia campos fiscais e impede edição por operador comum', () => {
      const ruleOp = evaluateStatusRules('Faturado', 'operador_logistica')
      expect(ruleOp.canEdit).toBe(false)
      expect(ruleOp.blockedReasons.some((r) => r.includes('afetem documentos fiscais'))).toBe(true)
      expect(ruleOp.readOnlyFields).toContain('remessas')
      expect(ruleOp.readOnlyFields).toContain('carrier_name')
      expect(ruleOp.readOnlyFields).toContain('driver_name')
      expect(ruleOp.readOnlyFields).toContain('vehicle_plate')

      // Admin master tem permissão especial sob bloqueio
      const ruleAdmin = evaluateStatusRules('Faturado', 'admin_master')
      expect(ruleAdmin.canEdit).toBe(true)
    })

    it('"Entregue": modo somente consulta/leitura para operadores padrão', () => {
      const ruleOp = evaluateStatusRules('Entregue', 'operador_logistica')
      expect(ruleOp.canEdit).toBe(false)
      expect(ruleOp.blockedReasons.some((r) => r.includes('modo somente leitura histórico'))).toBe(true)

      const ruleAdmin = evaluateStatusRules('Entregue', 'admin_tms')
      expect(ruleAdmin.canEdit).toBe(true)
    })

    it('"Planejado": permite livremente edição dos campos operacionais', () => {
      const rule = evaluateStatusRules('Planejado', 'operador_logistica')
      expect(rule.canEdit).toBe(true)
      expect(rule.readOnlyFields).toHaveLength(0)
    })
  })

  // 5. Concorrência Otimista (versão anterior/conflito)
  describe('5. Concorrência Otimista e Deteção de Conflito', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('deve retornar status de conflito (409) quando o registro foi alterado concorrentemente', async () => {
      // Simula resposta do backend 409 Concurrency Conflict
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 409,
          json: async () => ({
            error: 'CONCURRENCY_CONFLICT',
            message: 'Este transporte foi alterado por outro usuário após a abertura desta tela.',
            conflict: {
              current_updated_at: '2025-05-10T11:45:00.000Z',
              last_user: 'outro.operador@ciafal.com.br',
              last_reason: 'Alteração de itinerário',
            },
          }),
        }),
      )

      const result = await transportEditService.saveTransportChanges({
        transport_id: 'rec_transport_001',
        original_record: baseMockTransport,
        modified_fields: { driver_name: 'Motorista Novo' },
        reason: 'Alteração de motorista',
        justification: 'Troca de motorista devido a escala de plantão.',
        current_user: { name: 'Operador', email: 'op@ciafal.com.br', role: 'operador_logistica' },
      })

      expect(result.success).toBe(false)
      expect(result.conflict).toBeDefined()
      expect(result.conflict?.last_user).toBe('outro.operador@ciafal.com.br')
      expect(result.message).toContain('outro usuário')
    })
  })

  // 6. Trilha de Auditoria por Campo Alterado
  describe('6. Trilha de Auditoria e Histórico Cronológico', () => {
    it('deve consultar audit_logs filtrando por transporte SAP ou ID e retornar itens mapeados', async () => {
      const mockAuditItems = [
        {
          id: 'log_001',
          created: '2025-05-10T12:00:00.000Z',
          user_name: 'Carlos Gerente',
          user_email: 'carlos@ciafal.com.br',
          user_role: 'gestor_logistica',
          field_name: 'vehicle_plate',
          field_label: 'Placa do Cavalo',
          previous_state: 'ABC-1234',
          new_state: 'BRA2E19',
          reason_code: 'Alteração de veículo',
          justification: 'Veículo anterior com pane mecânica na oficina.',
          sap_transport_number: '00900123',
          delivery_number: '10045001',
          order_number: '4501234',
          sap_sync_status: 'SINCRONIZADO',
          sap_sync_at: '2025-05-10T12:00:05.000Z',
          correlation_id: 'TRANS-EDIT-rec_001-123456',
        },
      ]

      vi.spyOn(pb.collection('audit_logs'), 'getList').mockResolvedValue({
        page: 1,
        perPage: 100,
        totalItems: 1,
        totalPages: 1,
        items: mockAuditItems as any,
      })

      const history = await transportEditService.getTransportAuditHistory({
        sap_transport_number: '00900123',
      })

      expect(history).toHaveLength(1)
      expect(history[0].field_name).toBe('vehicle_plate')
      expect(history[0].field_label).toBe('Placa do Cavalo')
      expect(history[0].previous_state).toBe('ABC-1234')
      expect(history[0].new_state).toBe('BRA2E19')
      expect(history[0].user_name).toBe('Carlos Gerente')
      expect(history[0].justification).toBe('Veículo anterior com pane mecânica na oficina.')
      expect(history[0].sap_sync_status).toBe('SINCRONIZADO')
    })
  })

  // 7. Detecção de Alterações Críticas (aprovação obrigatória)
  describe('7. Detecção de Alterações Críticas e Aprovações', () => {
    it('deve identificar como crítica a retirada de remessa ou substituição de carga superior a 15%', () => {
      const changes = [
        {
          field: 'total_weight_kg',
          field_label: 'Peso Total',
          old_value: 20000,
          new_value: 25000, // +25% de peso
        },
      ]

      const check = detectCriticalChanges(changes, baseMockTransport)
      expect(check.isCritical).toBe(true)
      expect(check.requiresApproval).toBe(true)
      expect(check.reasons.some((r) => r.includes('Variação expressiva de carga'))).toBe(true)
    })

    it('deve identificar como crítica a alteração de transportadora após o frete já ter sido aceito', () => {
      const transportWithAcceptedFreight = {
        ...baseMockTransport,
        status: 'Frete aceito' as const,
      }

      const changes = [
        {
          field: 'carrier_name',
          field_label: 'Transportadora',
          old_value: 'TRANSLOG CIAFAL',
          new_value: 'RODOLOG TRANSPORTES',
        },
      ]

      const check = detectCriticalChanges(changes, transportWithAcceptedFreight)
      expect(check.isCritical).toBe(true)
      expect(check.requiresApproval).toBe(true)
      expect(check.reasons.some((r) => r.includes('após aceite do frete'))).toBe(true)
    })
  })
})
