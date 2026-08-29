import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import { Layout } from '@/components/Layout'

// Existing & New Pages
import { QueueDashboard } from '@/pages/QueueDashboard'
import { TotemEntry } from '@/pages/TotemEntry'
import { ExternalCheckin } from '@/pages/ExternalCheckin'
import { PreRegistrationsPage } from '@/pages/PreRegistrationsPage'
import { DriversVehiclesPage } from '@/pages/DriversVehiclesPage'
import { DriverPerformanceManagementPage } from '@/pages/DriverPerformanceManagementPage'
import { FreightOffersPreparationPage } from '@/pages/FreightOffersPreparationPage'
import { MesaFretesPage } from '@/pages/MesaFretesPage'
import { DriverOfferPublicPage } from '@/pages/DriverOfferPublicPage'
import { SapImportPage } from '@/pages/SapImportPage'
import { AuditLogsPage } from '@/pages/AuditLogsPage'
import { SystemParametersPage } from '@/pages/SystemParametersPage'
import { UsersRolesPage } from '@/pages/UsersRolesPage'
import { TmsDashboard } from '@/pages/TmsDashboard'
import { IntegrationsMonitorPage } from '@/pages/IntegrationsMonitorPage'
import { LoadPlannerPage } from '@/pages/LoadPlannerPage'
import { LoadRouterAndSimulatorPage } from '@/pages/LoadRouterAndSimulatorPage'
import { StockAndProductionPage } from '@/pages/StockAndProductionPage'
import { AnttRatesPage } from '@/pages/AnttRatesPage'
import { FutureProgrammingPage } from '@/pages/FutureProgrammingPage'
import { ComplementCargosPage } from '@/pages/ComplementCargosPage'
import { SapItinerariesPage } from '@/pages/SapItinerariesPage'
import { SapConsultingChecklistPage } from '@/pages/SapConsultingChecklistPage'
import { SapReceivedDataPage } from '@/pages/SapReceivedDataPage'
import { SapReconciliationPage } from '@/pages/SapReconciliationPage'
import { PcpContractPage } from '@/pages/PcpContractPage'
import { CrmContractPage } from '@/pages/CrmContractPage'
import { RoutingProvidersAdminPage } from '@/pages/RoutingProvidersAdminPage'
import { TollProvidersAdminPage } from '@/pages/TollProvidersAdminPage'
import { AnttOfficialSourcePage } from '@/pages/AnttOfficialSourcePage'
import { TelegramIntegrationPage } from '@/pages/TelegramIntegrationPage'
import { ProductionReadinessPage } from '@/pages/ProductionReadinessPage'
import { ArchitecturePage } from '@/pages/ArchitecturePage'
import { SecurityLgpdPage } from '@/pages/SecurityLgpdPage'
import { StubModulePage } from '@/pages/StubModulePage'
import PrintersAdminPage from '@/pages/PrintersAdminPage'
import { ExpeditionManagementPage } from '@/pages/ExpeditionManagementPage'
import { ExpeditionControlTowerPage } from '@/pages/ExpeditionControlTowerPage'
import { FreightIntelligencePage } from '@/pages/FreightIntelligencePage'
import { AiAutonomyAndRulesPage } from '@/pages/AiAutonomyAndRulesPage'
import PrintMonitorPage from '@/pages/PrintMonitorPage'
import CargoDetailPage from '@/pages/CargoDetailPage'
import ProfitabilityDashboardPage from '@/pages/ProfitabilityDashboardPage'
import ExpeditionPerformancePage from '@/pages/ExpeditionPerformancePage'
import WmsLoadingMapPage from '@/pages/WmsLoadingMapPage'
import Zsd35ImportPage from '@/pages/Zsd35ImportPage'
import SalesWalletPage from '@/pages/SalesWalletPage'
import Zsd35MappingAdminPage from '@/pages/Zsd35MappingAdminPage'
import AiPlannerParamsPage from '@/pages/AiPlannerParamsPage'
import { FredControlTowerPage } from '@/pages/FredControlTowerPage'
import { FredTransport360Page } from '@/pages/FredTransport360Page'
import { FredAnalyticsPage } from '@/pages/FredAnalyticsPage'
import { FredChatPage } from '@/pages/FredChatPage'
import { DriverMobileCompanionPage } from '@/pages/DriverMobileCompanionPage'
import SelectionGovernanceAndLoopPage from '@/pages/SelectionGovernanceAndLoopPage'
import NotFound from '@/pages/NotFound'

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Driver Routes (Acesso Celular sem Login Corporativo) */}
          <Route path="/tms/fila-publica" element={<ExternalCheckin />} />
          <Route path="/checkin-externo" element={<ExternalCheckin />} />
          <Route path="/totem" element={<TotemEntry />} />
          <Route path="/tms/oferta/:id" element={<DriverOfferPublicPage />} />
          <Route path="/oferta/:id" element={<DriverOfferPublicPage />} />
          <Route path="/motorista/:sapNumber" element={<DriverMobileCompanionPage />} />
          <Route path="/tms/motorista-mobile/:sapNumber" element={<DriverMobileCompanionPage />} />

          {/* Authenticated Internal TMS Routes */}
          <Route
            path="/"
            element={
              <Layout>
                <TmsDashboard />
              </Layout>
            }
          />
          <Route
            path="/tms/dashboard"
            element={
              <Layout>
                <TmsDashboard />
              </Layout>
            }
          />

          {/* 1. DISPONIBILIDADE LOGÍSTICA */}
          <Route
            path="/tms/fila"
            element={
              <Layout>
                <QueueDashboard />
              </Layout>
            }
          />
          <Route
            path="/tms/disponibilidade-programada"
            element={
              <Layout>
                <QueueDashboard />
              </Layout>
            }
          />
          <Route
            path="/tms/pre-cadastros"
            element={
              <Layout>
                <PreRegistrationsPage />
              </Layout>
            }
          />
          <Route
            path="/tms/motoristas"
            element={
              <Layout>
                <DriversVehiclesPage />
              </Layout>
            }
          />
          <Route
            path="/tms/performance-motoristas"
            element={
              <Layout>
                <DriverPerformanceManagementPage />
              </Layout>
            }
          />
          <Route
            path="/tms/governanca-selecao-loop"
            element={
              <Layout>
                <SelectionGovernanceAndLoopPage />
              </Layout>
            }
          />
          <Route
            path="/tms/feedback-loop"
            element={
              <Layout>
                <SelectionGovernanceAndLoopPage />
              </Layout>
            }
          />
          <Route
            path="/tms/gestao-motoristas"
            element={
              <Layout>
                <DriverPerformanceManagementPage />
              </Layout>
            }
          />

          {/* 2. PLANEJAMENTO LOGÍSTICO */}
          <Route
            path="/tms/planejador-cargas"
            element={
              <Layout>
                <LoadPlannerPage />
              </Layout>
            }
          />
          <Route
            path="/tms/zsd35-importar"
            element={
              <Layout>
                <Zsd35ImportPage />
              </Layout>
            }
          />
          <Route
            path="/tms/roteirizador-simulador"
            element={
              <Layout>
                <LoadRouterAndSimulatorPage />
              </Layout>
            }
          />
          <Route
            path="/tms/carteira"
            element={
              <Layout>
                <SalesWalletPage />
              </Layout>
            }
          />
          <Route
            path="/tms/carteira-pedidos"
            element={
              <Layout>
                <SalesWalletPage />
              </Layout>
            }
          />
          <Route
            path="/tms/zsd35-mapeamento"
            element={
              <Layout>
                <Zsd35MappingAdminPage />
              </Layout>
            }
          />
          <Route
            path="/tms/estoque-producao"
            element={
              <Layout>
                <StockAndProductionPage />
              </Layout>
            }
          />
          <Route
            path="/tms/programacao-futura"
            element={
              <Layout>
                <FutureProgrammingPage />
              </Layout>
            }
          />
          <Route
            path="/tms/complemento-cargas"
            element={
              <Layout>
                <ComplementCargosPage />
              </Layout>
            }
          />
          <Route
            path="/tms/itinerarios-sap"
            element={
              <Layout>
                <SapItinerariesPage />
              </Layout>
            }
          />

          {/* 3. CONTRATAÇÃO & MESA DE FRETES COM CARLÃO */}
          <Route
            path="/tms/mesa-fretes"
            element={
              <Layout>
                <MesaFretesPage />
              </Layout>
            }
          />
          <Route
            path="/tms/fretes/mesa"
            element={
              <Layout>
                <MesaFretesPage />
              </Layout>
            }
          />
          <Route
            path="/tms/ofertas"
            element={
              <Layout>
                <MesaFretesPage />
              </Layout>
            }
          />
          <Route
            path="/tms/inteligencia-fretes"
            element={
              <Layout>
                <FreightIntelligencePage />
              </Layout>
            }
          />
          <Route
            path="/tms/tabela-antt"
            element={
              <Layout>
                <AnttRatesPage />
              </Layout>
            }
          />
          <Route
            path="/tms/tabela-fretes"
            element={
              <Layout>
                <AnttRatesPage />
              </Layout>
            }
          />
          <Route
            path="/tms/historico-fretes"
            element={
              <Layout>
                <StubModulePage
                  title="Histórico de Negociações"
                  subtitle="Registro histórico de cotações, acordos e leilões encerrados."
                  moduleKey="historico_fretes"
                />
              </Layout>
            }
          />

          {/* 4. EXPEDIÇÃO OPERACIONAL & TORRE DE CONTROLE */}
          <Route
            path="/tms/expedicao"
            element={
              <Layout>
                <ExpeditionManagementPage />
              </Layout>
            }
          />
          <Route
            path="/tms/torre-controle"
            element={
              <Layout>
                <ExpeditionControlTowerPage />
              </Layout>
            }
          />
          <Route
            path="/tms/regras-autonomia"
            element={
              <Layout>
                <AiAutonomyAndRulesPage />
              </Layout>
            }
          />

          {/* 4. TRANSPORTES */}
          <Route
            path="/tms/cargas"
            element={
              <Layout>
                <LoadRouterAndSimulatorPage />
              </Layout>
            }
          />
          <Route
            path="/tms/wms-mapa-carregamento"
            element={
              <Layout>
                <WmsLoadingMapPage />
              </Layout>
            }
          />
          <Route
            path="/tms/cargas/:id"
            element={
              <Layout>
                <CargoDetailPage />
              </Layout>
            }
          />
          <Route
            path="/tms/detalhe-carga/:id"
            element={
              <Layout>
                <CargoDetailPage />
              </Layout>
            }
          />
          <Route
            path="/tms/transportes"
            element={
              <Layout>
                <StubModulePage
                  title="Execução de Transportes"
                  subtitle="Viagens em trânsito, emissão de CT-e/MDF-e e controle de manifesto."
                  moduleKey="transportes"
                />
              </Layout>
            }
          />
          <Route
            path="/tms/acompanhamento"
            element={
              <Layout>
                <StubModulePage
                  title="Acompanhamento de Viagem"
                  subtitle="Rastreamento de marcos logísticos, previsão de entrega e telemetria."
                  moduleKey="acompanhamento"
                />
              </Layout>
            }
          />
          <Route
            path="/tms/ocorrencias"
            element={
              <Layout>
                <StubModulePage
                  title="Ocorrências & Sinistros"
                  subtitle="Registro de avarias, recusas de descarga, atrasos e estadias."
                  moduleKey="ocorrencias"
                />
              </Layout>
            }
          />

          {/* 5. AGENTES */}
          <Route
            path="/tms/agente-chicao"
            element={
              <Layout>
                <StubModulePage
                  title="Agente Chicão (IA Negociação de Fretes)"
                  subtitle="Agente conversacional para negociação controlada com motoristas via WhatsApp."
                  moduleKey="chicao"
                  statusText="Planejado - Sprint 3"
                  statusColor="bg-amber-600"
                />
              </Layout>
            }
          />
          <Route
            path="/tms/agente-fred"
            element={
              <Layout>
                <FredChatPage />
              </Layout>
            }
          />
          <Route
            path="/tms/torre-controle-fred"
            element={
              <Layout>
                <FredControlTowerPage />
              </Layout>
            }
          />
          <Route
            path="/tms/transporte/:id"
            element={
              <Layout>
                <FredTransport360Page />
              </Layout>
            }
          />
          <Route
            path="/tms/fred-analises"
            element={
              <Layout>
                <FredAnalyticsPage />
              </Layout>
            }
          />
          <Route
            path="/tms/acompanhamento"
            element={
              <Layout>
                <FredControlTowerPage />
              </Layout>
            }
          />
          <Route
            path="/tms/rastreamento"
            element={
              <Layout>
                <FredControlTowerPage />
              </Layout>
            }
          />

          {/* 6. INTEGRAÇÕES & HOMOLOGAÇÃO TÉCNICA (SPRINT 4.1) */}
          <Route
            path="/tms/integracao-sap"
            element={
              <Layout>
                <SapImportPage />
              </Layout>
            }
          />
          <Route
            path="/tms/sap-consultoria"
            element={
              <Layout>
                <SapConsultingChecklistPage />
              </Layout>
            }
          />
          <Route
            path="/tms/sap-dados"
            element={
              <Layout>
                <SapReceivedDataPage />
              </Layout>
            }
          />
          <Route
            path="/tms/sap-reconciliacao"
            element={
              <Layout>
                <SapReconciliationPage />
              </Layout>
            }
          />
          <Route
            path="/tms/integracao-pcp"
            element={
              <Layout>
                <PcpContractPage />
              </Layout>
            }
          />
          <Route
            path="/tms/pcp-contrato"
            element={
              <Layout>
                <PcpContractPage />
              </Layout>
            }
          />
          <Route
            path="/tms/integracao-crm"
            element={
              <Layout>
                <CrmContractPage />
              </Layout>
            }
          />
          <Route
            path="/tms/crm-contrato"
            element={
              <Layout>
                <CrmContractPage />
              </Layout>
            }
          />
          <Route
            path="/tms/antt-fonte-oficial"
            element={
              <Layout>
                <AnttOfficialSourcePage />
              </Layout>
            }
          />
          <Route
            path="/tms/integracao-telegram"
            element={
              <Layout>
                <TelegramIntegrationPage />
              </Layout>
            }
          />
          <Route
            path="/tms/integracao-whatsapp"
            element={
              <Layout>
                <IntegrationsMonitorPage />
              </Layout>
            }
          />
          <Route
            path="/tms/integracao-target"
            element={
              <Layout>
                <StubModulePage
                  title="TARGET (Gestão de Pátio & Docas)"
                  subtitle="Integração com controle de portaria industrial e agendamento de docas."
                  moduleKey="target"
                />
              </Layout>
            }
          />
          <Route
            path="/tms/integracao-qlik"
            element={
              <Layout>
                <StubModulePage
                  title="QLIK (Analytics & BI)"
                  subtitle="Extração e modelagem analítica de KPIs de transporte e fretes."
                  moduleKey="qlik"
                />
              </Layout>
            }
          />

          {/* 7. GESTÃO */}
          <Route
            path="/tms/dashboard-gerencial"
            element={
              <Layout>
                <TmsDashboard />
              </Layout>
            }
          />
          <Route
            path="/tms/rentabilidade-logistica"
            element={
              <Layout>
                <ProfitabilityDashboardPage />
              </Layout>
            }
          />
          <Route
            path="/tms/performance-expedicao"
            element={
              <Layout>
                <ExpeditionPerformancePage />
              </Layout>
            }
          />
          <Route
            path="/tms/monitor-impressao"
            element={
              <Layout>
                <PrintMonitorPage />
              </Layout>
            }
          />
          <Route
            path="/tms/relatorios"
            element={
              <Layout>
                <StubModulePage
                  title="Relatórios Operacionais & Fretes"
                  subtitle="Geração de relatórios gerenciais e exportações consolidadas."
                  moduleKey="relatorios"
                />
              </Layout>
            }
          />
          <Route
            path="/tms/auditoria"
            element={
              <Layout>
                <AuditLogsPage />
              </Layout>
            }
          />
          <Route
            path="/tms/readiness-producao"
            element={
              <Layout>
                <ProductionReadinessPage />
              </Layout>
            }
          />
          <Route
            path="/tms/arquitetura"
            element={
              <Layout>
                <ArchitecturePage />
              </Layout>
            }
          />
          <Route
            path="/tms/sap-blueprint"
            element={
              <Layout>
                <IntegrationsMonitorPage />
              </Layout>
            }
          />
          <Route
            path="/tms/sap-monitor"
            element={
              <Layout>
                <IntegrationsMonitorPage />
              </Layout>
            }
          />

          {/* 8. ADMINISTRAÇÃO */}
          <Route
            path="/tms/parametros-planejador-ia"
            element={
              <Layout>
                <AiPlannerParamsPage />
              </Layout>
            }
          />
          <Route
            path="/tms/administracao/mapeamento-zsd35"
            element={
              <Layout>
                <Zsd35MappingAdminPage />
              </Layout>
            }
          />
          <Route
            path="/tms/impressoras"
            element={
              <Layout>
                <PrintersAdminPage />
              </Layout>
            }
          />
          <Route
            path="/tms/providers-rota"
            element={
              <Layout>
                <RoutingProvidersAdminPage />
              </Layout>
            }
          />
          <Route
            path="/tms/providers-pedagio"
            element={
              <Layout>
                <TollProvidersAdminPage />
              </Layout>
            }
          />
          <Route
            path="/tms/readiness-producao"
            element={
              <Layout>
                <ProductionReadinessPage />
              </Layout>
            }
          />
          <Route
            path="/tms/parametros"
            element={
              <Layout>
                <SystemParametersPage />
              </Layout>
            }
          />
          <Route
            path="/tms/usuarios"
            element={
              <Layout>
                <UsersRolesPage />
              </Layout>
            }
          />
          <Route
            path="/tms/seguranca-lgpd"
            element={
              <Layout>
                <SecurityLgpdPage />
              </Layout>
            }
          />
          <Route
            path="/tms/sap-import"
            element={
              <Layout>
                <SapImportPage />
              </Layout>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  )
}
export default App
