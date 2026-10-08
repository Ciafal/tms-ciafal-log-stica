import { describe, it, expect } from 'vitest'
import appContent from '../App.tsx?raw'
import layoutContent from '../components/Layout.tsx?raw'
import heatmapPageContent from '../pages/ItineraryHeatmapPage.tsx?raw'
import {
  formatTons,
  formatDistance,
  formatCurrency,
  formatPercent,
  formatDateTime,
} from '../utils/format.ts'
import {
  buildClientDeliveryStops,
  runMulticriteriaClusterization,
} from '../domain/logisticRoutingEngine.ts'
import { SapSalesOrderEntity } from '../domain/rules.ts'

describe('Validação da Página "Mapa de Calor por Itinerário" no TMS CIAFAL', () => {
  describe('1. Registro de Rotas no App.tsx', () => {
    it('deve importar ItineraryHeatmapPage de @/pages/ItineraryHeatmapPage', () => {
      expect(appContent).toMatch(/import\s*\{\s*ItineraryHeatmapPage\s*\}\s*from\s*['"]@\/pages\/ItineraryHeatmapPage['"]/)
    })

    it('deve registrar a rota canônica /tms/mapa-calor-itinerario envolvida pelo Layout', () => {
      expect(appContent).toMatch(/path="\/tms\/mapa-calor-itinerario"/)
      expect(appContent).toMatch(/<ItineraryHeatmapPage\s*\/>/)
    })

    it('deve conter aliases e redirecionamentos coerentes', () => {
      expect(appContent).toMatch(/path="\/tms\/heatmap-itinerario"/)
      expect(appContent).toMatch(/path="\/tms\/mapa-calor"/)
    })
  })

  describe('2. Item de Menu no Layout.tsx', () => {
    it('deve inserir "Mapa de Calor por Itinerário" na seção PLANEJAMENTO LOGÍSTICO', () => {
      expect(layoutContent).toMatch(/title:\s*['"]Mapa de Calor por Itinerário['"]/)
      expect(layoutContent).toMatch(/path:\s*['"]\/tms\/mapa-calor-itinerario['"]/)
    })

    it('deve estar posicionado ABAIXO de "Planejador de Cargas" e ANTES de "Roteirizador / Simulador"', () => {
      const plannerIdx = layoutContent.indexOf("title: 'Planejador de Cargas'")
      const heatmapIdx = layoutContent.indexOf("title: 'Mapa de Calor por Itinerário'")
      const routerIdx = layoutContent.indexOf("title: 'Roteirizador / Simulador'")

      expect(plannerIdx).toBeGreaterThan(-1)
      expect(heatmapIdx).toBeGreaterThan(plannerIdx)
      expect(routerIdx).toBeGreaterThan(heatmapIdx)
    })

    it('deve possuir o badge "Heatmap & IA" no azul institucional Pantone 2945 (#005596)', () => {
      expect(layoutContent).toMatch(/badge:\s*['"]Heatmap & IA['"]/)
      expect(layoutContent).toMatch(/badgeColor:\s*['"]bg-\[#005596\]['"]/)
    })
  })

  describe('3. Componentes e Estrutura em ItineraryHeatmapPage.tsx', () => {
    it('deve reutilizar LogisticalMapTowerView sem bifurcar código', () => {
      expect(heatmapPageContent).toMatch(/import\s*\{\s*LogisticalMapTowerView\s*\}\s*from\s*['"]@\/components\/load-planner\/LogisticalMapTowerView['"]/)
      expect(heatmapPageContent).toMatch(/<LogisticalMapTowerView/)
    })

    it('deve exibir o cabeçalho corporativo com título, subtítulo e botões de ação', () => {
      expect(heatmapPageContent).toMatch(/Central Visual de Mapa de Calor por Itinerário/)
      expect(heatmapPageContent).toMatch(/Heatmap & IA/)
      expect(heatmapPageContent).toMatch(/Atualizar Dados SAP/)
      expect(heatmapPageContent).toMatch(/Análise Logística IA/)
    })

    it('deve conter seletor de itinerário derivado da carteira real SAP', () => {
      expect(heatmapPageContent).toMatch(/Itinerário SAP:/)
      expect(heatmapPageContent).toMatch(/availableItineraries/)
      expect(heatmapPageContent).toMatch(/selectedItinerary/)
    })

    it('deve conter os 8 indicadores oficiais reativos com invariante', () => {
      expect(heatmapPageContent).toMatch(/1\. Carteira Liberada/)
      expect(heatmapPageContent).toMatch(/2\. Clientes/)
      expect(heatmapPageContent).toMatch(/3\. Pedidos/)
      expect(heatmapPageContent).toMatch(/4\. Municípios/)
      expect(heatmapPageContent).toMatch(/5\. Cargas Propostas/)
      expect(heatmapPageContent).toMatch(/6\. Planejadas/)
      expect(heatmapPageContent).toMatch(/7\. Saldo Pendente/)
      expect(heatmapPageContent).toMatch(/8\. Ocupação Média/)
      expect(heatmapPageContent).toMatch(/Invariante: Liberada/)
    })

    it('deve conter aba de Oportunidades e Análise Logística IA com Hub de Governança', () => {
      expect(heatmapPageContent).toMatch(/Oportunidades \(\{opportunities\.length\}\)/)
      expect(heatmapPageContent).toMatch(/Diagnóstico e Recomendações do Agente IA/)
      expect(heatmapPageContent).toMatch(/handleDispatchActionHub/)
      expect(heatmapPageContent).toMatch(/Encaminhar via HUB/)
    })

    it('deve integrar com Mesa de Fretes (createFreightOffer) e registrar em audit_logs', () => {
      expect(heatmapPageContent).toMatch(/tmsService\.createFreightOffer/)
      expect(heatmapPageContent).toMatch(/tmsService\.logAudit/)
      expect(heatmapPageContent).toMatch(/FREIGHT_OFFER_FORWARDED_FROM_HEATMAP/)
    })

    it('deve rotular estimativas rodoviárias como "Cálculo Parametrizado por Regra Rodoviária"', () => {
      expect(heatmapPageContent).toMatch(/Cálculo Parametrizado por Regra Rodoviária/)
    })

    it('deve conter mensagens exatas de exceção para estado vazio', () => {
      expect(heatmapPageContent).toMatch(/Nenhum pedido liberado para este itinerário\./)
    })
  })

  describe('4. Formatação ABNT Rigorosa (src/utils/format.ts)', () => {
    it('deve formatar toneladas com vírgula decimal e espaço antes de "t"', () => {
      expect(formatTons(28)).toBe('28,00 t')
      expect(formatTons(28.0)).toBe('28,00 t')
      expect(formatTons(1258.4)).toBe('1.258,40 t')
      expect(formatTons(0)).toBe('0,00 t')
    })

    it('deve formatar distância em km com vírgula decimal e espaço', () => {
      expect(formatDistance(425.5)).toBe('425,50 km')
      expect(formatDistance(0)).toBe('0,00 km')
    })

    it('deve formatar percentual com espaço antes do símbolo %', () => {
      expect(formatPercent(95)).toBe('95,00 %')
      expect(formatPercent(82.5, 1)).toBe('82,5 %')
    })

    it('deve formatar moeda brasileira com R$', () => {
      const curr = formatCurrency(2450.75)
      expect(curr).toContain('2.450,75')
      expect(curr).toContain('R$')
    })

    it('deve formatar data e hora no padrão brasileiro', () => {
      const dt = formatDateTime('2026-10-08T14:35:00Z')
      expect(dt).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)
    })
  })

  describe('5. Invariante Contábil e Agrupamento Multicritério', () => {
    it('Invariante: Carteira Liberada = Planejadas + Saldo Pendente sem duplicidade', () => {
      const orders: SapSalesOrderEntity[] = [
        {
          id: 'ord-1',
          order_number: 1,
          customer_code: 1,
          customer_name: 'CLI 1',
          destination_city: 'BETIM',
          uf: 'MG',
          weight_kg: 20000,
          itinerary_code: 'MG-001',
          credit_status: 'Liberado',
        } as any,
        {
          id: 'ord-2',
          order_number: 2,
          customer_code: 2,
          customer_name: 'CLI 2',
          destination_city: 'CONTAGEM',
          uf: 'MG',
          weight_kg: 8000,
          itinerary_code: 'MG-001',
          credit_status: 'Liberado',
        } as any,
        {
          id: 'ord-3',
          order_number: 3,
          customer_code: 3,
          customer_name: 'CLI 3',
          destination_city: 'BELO HORIZONTE',
          uf: 'MG',
          weight_kg: 5000,
          itinerary_code: 'MG-001',
          credit_status: 'Liberado',
        } as any,
      ]

      const stops = buildClientDeliveryStops(orders)
      const res = runMulticriteriaClusterization({ stops })

      const totalStopsTon = stops.reduce((a, b) => a + b.totalWeightTon, 0)
      const plannedTon = res.clusters.reduce((a, b) => a + b.totalWeightTon, 0)
      const unplannedTon = res.unplannedStops.reduce((a, b) => a + b.totalWeightTon, 0)

      expect(totalStopsTon).toBe(33) // 20 + 8 + 5 t
      // A soma de planejadas e saldo pendente deve bater exatamente com totalStopsTon
      expect(Math.round((plannedTon + unplannedTon) * 10) / 10).toBe(totalStopsTon)
    })
  })
})
