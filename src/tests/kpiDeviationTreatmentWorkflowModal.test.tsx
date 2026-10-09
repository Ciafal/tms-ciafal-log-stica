import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  KpiDeviationTreatmentWorkflowModal,
  buildInitialTreatment,
} from '@/components/tms-indicators/KpiDeviationTreatmentWorkflowModal'
import { KpiWidgetErrorBoundary } from '@/components/tms-indicators/KpiWidgetErrorBoundary'
import { generateAiKpiInvestigation } from '@/domain/tmsDeviationTreatmentEngine'
import { KpiRowData, KpiMonthCell } from '@/domain/tmsIndicatorsEngine'
import { tmsIndicatorsService } from '@/services/tmsIndicatorsService'
import { pb } from '@/lib/pocketbase/client'

// Mock de serviços
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr_test_1',
      name: 'Carlos Teste',
      email: 'carlos.teste@ciafal.com.br',
    },
    role: 'gestor_logistica',
  }),
}))

describe('KpiDeviationTreatmentWorkflowModal & Defensivas de Análise', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const sampleKpi: KpiRowData = {
    id: 'aderencia_programacao',
    seq: 1,
    name: 'Aderência à Programação',
    category: 'LOGISTICA',
    description: 'Percentual de entregas realizadas no dia planejado',
    unit: '%',
    rule: 'GTE',
    targetConfig: {
      kpi_id: 'aderencia_programacao',
      kpi_name: 'Aderência à Programação',
      category: 'LOGISTICA',
      year: 2026,
      target_value: 95.0,
      rule: 'GTE',
      unit: '%',
      responsible: 'Carlos Teste',
    },
    months: [
      {
        month: 9,
        monthLabel: 'Set',
        year: 2026,
        realValue: 89.4,
        targetValue: 95.0,
        status: 'FORA_DA_META',
        formattedValue: '89,4 %',
        formattedTarget: '95,0 %',
        recordsCount: 15,
        hasData: true,
        drillDownRecords: [
          {
            id: 'rec-1',
            orderNumber: 'PED-1001',
            sapTransportNumber: 'TRANS-888',
            date: '2026-09-10',
            customerName: 'METALURGICA ABC',
            carrierName: 'TRANSLOG EXPRESS',
            driverName: 'Marcos Vinicius',
            vehiclePlate: 'ABC-1234',
            itineraryCode: 'IT-BH-SP',
            destinationCity: 'São Paulo',
            destinationUf: 'SP',
            weightTon: 24.5,
            primaryValueFormatted: '89,4 %',
            complianceStatus: 'FORA',
            detailText: 'Atraso na janela de expedição',
            sourceCollection: 'carrier_operational_history',
          },
        ],
      },
    ],
    ytdReal: 89.4,
    ytdTarget: 95.0,
    ytdStatus: 'FORA_DA_META',
    formattedYtdReal: '89,4 %',
    formattedYtdTarget: '95,0 %',
    bestMonth: 'Set',
    worstMonth: 'Set',
    trend: 'DOWN',
    totalRecordsYear: 15,
    dataSource: 'SAP ECC RFC',
    hasIntegration: true,
    lastUpdate: new Date().toISOString(),
  }

  const sampleCell: KpiMonthCell = sampleKpi.months[0]

  describe('1. Montagem com props null/undefined (Cenário do primeiro render na página)', () => {
    it('deve renderizar sem exceção quando kpi e monthCell forem null e isOpen for false', () => {
      const { container } = render(
        <KpiDeviationTreatmentWorkflowModal
          isOpen={false}
          onClose={vi.fn()}
          kpi={null}
          monthCell={null}
        />,
      )
      // Como o modal está fechado e com props nulas, deve retornar null sem lançar
      expect(container.firstChild).toBeNull()
    })

    it('deve renderizar sem exceção quando kpi fornecido mas monthCell for null', () => {
      const { container } = render(
        <KpiDeviationTreatmentWorkflowModal
          isOpen={false}
          onClose={vi.fn()}
          kpi={sampleKpi}
          monthCell={null}
        />,
      )
      expect(container.firstChild).toBeNull()
    })

    it('buildInitialTreatment deve ser null-safe para kpi e monthCell nulos', () => {
      const treatment = buildInitialTreatment(null, null, null)
      expect(treatment).toBeDefined()
      expect(treatment.kpi_name).toBe('Indicador TMS')
      expect(treatment.real_value).toBe(0)
      expect(treatment.target_value).toBe(0)
      expect(treatment.deviation_abs).toBe(0)
      expect(treatment.current_step).toBe(1)
    })
  })

  describe('2. Defensivas no motor generateAiKpiInvestigation', () => {
    it('deve retornar diagnóstico seguro quando kpi ou monthCell forem nulos sem lançar', () => {
      const res1 = generateAiKpiInvestigation(null, null, [])
      expect(res1.identifiedFact).toContain('Dados insuficientes')
      expect(res1.hypotheses.length).toBeGreaterThan(0)
      expect(res1.aiText).toContain('FATO IDENTIFICADO')

      const res2 = generateAiKpiInvestigation(sampleKpi, null, [])
      expect(res2.identifiedFact).toContain('Dados insuficientes')
    })
  })

  describe('3. Montagem com dados válidos e workflow de tratamento', () => {
    it('deve montar modal aberto com dados do indicador e permitir navegação de etapas', async () => {
      vi.spyOn(tmsIndicatorsService, 'fetchActiveUsers').mockResolvedValue([
        {
          id: 'usr_1',
          name: 'Carlos Eduardo',
          email: 'carlos@ciafal.com.br',
          role: 'Gestor',
        },
      ])

      render(
        <KpiDeviationTreatmentWorkflowModal
          isOpen={true}
          onClose={vi.fn()}
          kpi={sampleKpi}
          monthCell={sampleCell}
        />,
      )

      // Deve exibir o cabeçalho e as informações do indicador
      expect(screen.getByText('Tratamento de Desvios & Análise de Causa (Padrão PCP Robotizado)')).toBeDefined()
      expect(screen.getByText('Aderência à Programação')).toBeDefined()
      expect(screen.getByText('Set/2026')).toBeDefined()

      // Etapa 1 ativa por padrão
      expect(screen.getByText('Matriz de Responsabilidades (Usuários Reais do HUB)')).toBeDefined()

      // Navegar para Etapa 2 (Análise de Causa)
      const btnEtapa2 = screen.getByText('2. Análise de Causa')
      fireEvent.click(btnEtapa2)
      expect(screen.getByText('Hipóteses de Análise de Causa')).toBeDefined()

      // Adicionar nova hipótese
      const btnNovaHip = screen.getByText('Nova Hipótese')
      fireEvent.click(btnNovaHip)
      expect(screen.getByText('Hipótese #1')).toBeDefined()
    })

    it('deve permitir salvar tratamento via workflow acionando tmsIndicatorsService', async () => {
      const mockSaved = {
        ...buildInitialTreatment(sampleKpi, sampleCell, { id: 'usr_test_1', name: 'Carlos Teste' }),
        id: 'rec_trat_1',
        treatment_code: 'TRAT-TMS-2026-09-9999',
      }

      const saveSpy = vi
        .spyOn(tmsIndicatorsService, 'saveDeviationTreatment')
        .mockResolvedValue(mockSaved)

      render(
        <KpiDeviationTreatmentWorkflowModal
          isOpen={true}
          onClose={vi.fn()}
          kpi={sampleKpi}
          monthCell={sampleCell}
        />,
      )

      // Botão salvar
      const saveButtons = screen.getAllByText('Salvar Informações')
      fireEvent.click(saveButtons[0])

      await waitFor(() => {
        expect(saveSpy).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('4. KpiWidgetErrorBoundary por widget com registro em audit_logs', () => {
    it('deve capturar erro em componente filho, exibir UI defensiva e registrar em audit_logs', async () => {
      const createAuditSpy = vi.fn().mockResolvedValue({})
      vi.spyOn(pb, 'collection').mockReturnValue({
        create: createAuditSpy,
      } as any)

      // Componente que lança erro proposital
      const CrashingWidget = () => {
        throw new Error('Falha simulada no widget de indicador')
      }

      // Suprimir console.error esperado do React durante teste de boundary
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <KpiWidgetErrorBoundary
          widgetName="Widget de Teste"
          userEmail="analista@ciafal.com.br"
          userName="Analista Teste"
        >
          <CrashingWidget />
        </KpiWidgetErrorBoundary>,
      )

      // Verifica exibição da mensagem de erro amigável ao usuário
      expect(screen.getByText('Não foi possível carregar: Widget de Teste')).toBeDefined()
      expect(screen.getByText(/Falha simulada no widget de indicador/)).toBeDefined()
      expect(screen.getByText('Tentar novamente')).toBeDefined()

      // Verifica registro de auditoria em audit_logs
      expect(createAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_email: 'analista@ciafal.com.br',
          user_name: 'Analista Teste',
          action: 'KPI_WIDGET_ERROR_CAPTURED',
          collection_name: 'tms_indicators',
        }),
      )

      consoleErrorSpy.mockRestore()
    })
  })
})
