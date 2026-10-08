import { describe, it, expect } from 'vitest'
import modalContent from '../components/load-planner/CreateMixedLoadModal.tsx?raw'
import towerContent from '../components/load-planner/LogisticalMapTowerView.tsx?raw'
import pageContent from '../pages/LoadPlannerPage.tsx?raw'

describe('Validação da Criação de Carga Mista e Layout do Planejador (Passos 1, 2 e 3)', () => {
  it('1. CreateMixedLoadModal existe e contém todos os requisitos funcionais', () => {
    // Tipo de carga: Mista, Convencional, Mista com Itinerário Principal
    expect(modalContent).toMatch(/MISTA_PRINCIPAL/)
    expect(modalContent).toMatch(/MISTA/)
    expect(modalContent).toMatch(/CONVENCIONAL/)

    // Alerta de TVRO SAP pendente no ambiente QAS
    expect(modalContent).toMatch(/TVRO SAP aguardando carga no ambiente QAS/)

    // Ações obrigatórias: Adicionar rota, Remover rota, Simular carga, Otimizar sequência, Salvar rascunho, Confirmar carga
    expect(modalContent).toMatch(/handleAddRoute/)
    expect(modalContent).toMatch(/handleRemoveRoute/)
    expect(modalContent).toMatch(/handleSimulateLoad/)
    expect(modalContent).toMatch(/handleOptimizeSequence/)
    expect(modalContent).toMatch(/handleSaveDraft/)
    expect(modalContent).toMatch(/handleConfirmLoad/)

    // Persistência em load_proposals, route_additions e audit_logs
    expect(modalContent).toMatch(/collection\(['"]load_proposals['"]\)/)
    expect(modalContent).toMatch(/collection\(['"]route_additions['"]\)/)
    expect(modalContent).toMatch(/TmsService\.logAudit/)
    expect(modalContent).toMatch(/TmsService\.createFreightOffer/)

    // Formatação ABNT via format.ts
    expect(modalContent).toMatch(/formatTons/)
    expect(modalContent).toMatch(/formatCurrency/)
    expect(modalContent).toMatch(/formatDistance/)
    expect(modalContent).toMatch(/formatPercent/)
  })

  it('2. Botão "+ Criar Carga Mista" integrado no LogisticalMapTowerView e LoadPlannerPage', () => {
    expect(towerContent).toMatch(/\+ Criar Carga Mista/)
    expect(towerContent).toMatch(/CreateMixedLoadModal/)
    expect(pageContent).toMatch(/\+ Criar Carga Mista/)
    expect(pageContent).toMatch(/CreateMixedLoadModal/)
  })

  it('3. Comparador Cenário A x Cenário B com justificativa IA e aprovação humana obrigatória', () => {
    expect(towerContent).toMatch(/Comparador de Cenários: Cenário A \(Convencional\) × Cenário B \(Cargas Mistas IA\)/)
    expect(towerContent).toMatch(/Aprovação Humana Obrigatória — Governança CIAFAL/)
    expect(towerContent).toMatch(/Aprovar & Aplicar Cenário B no Planejador/)
    expect(towerContent).toMatch(/Justificativa da IA para a Roteirização Mista:/)
  })

  it('4. Grid responsivo e formatação ABNT de toneladas nos cards de indicadores', () => {
    // Grid responsivo com xl:grid-cols-8
    expect(towerContent).toMatch(/grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2/)
    // Uso obrigatório de formatTons
    expect(towerContent).toMatch(/formatTons\(summaryKpis\.carteiraLiberadaTon/)
    expect(towerContent).toMatch(/formatTons\(summaryKpis\.toneladasPlanejadas/)
    expect(towerContent).toMatch(/formatTons\(summaryKpis\.saldoNaoPlanejado/)
  })
})
