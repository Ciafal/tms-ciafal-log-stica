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
import { FutureProgrammingPage } from '@/pages/FutureProgrammingPage'
import { ComplementCargosPage } from '@/pages/ComplementCargosPage'
import { SapItinerariesPage } from '@/pages/SapItinerariesPage'
import { SecurityLgpdPage } from '@/pages/SecurityLgpdPage'
import { StubModulePage } from '@/pages/StubModulePage'
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

          {/* 3. FRETES */}
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
            path="/tms/tabela-fretes"
            element={
              <Layout>
                <StubModulePage
                  title="Tabela de Fretes & ANTT"
                  subtitle="Tabelas tarifárias, piso regulatório e faixas de negociação."
                  moduleKey="tabela_fretes"
                />
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

          {/* 4. TRANSPORTES */}
          <Route
            path="/tms/cargas"
            element={
              <Layout>
                <StubModulePage
                  title="Gestão de Cargas"
                  subtitle="Controle de romaneios, ordens de carregamento e cubagem."
                  moduleKey="cargas"
                />
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
                <StubModulePage
                  title="Agente Fred (IA Suporte ao Motorista)"
                  subtitle="Assistente de dúvidas operacionais, agendamento de pátio e orientações de segurança."
                  moduleKey="fred"
                  statusText="Planejado - Sprint 3"
                  statusColor="bg-purple-600"
                />
              </Layout>
            }
          />

          {/* 6. INTEGRAÇÕES */}
          <Route
            path="/tms/integracao-sap"
            element={
              <Layout>
                <SapImportPage />
              </Layout>
            }
          />
          <Route
            path="/tms/integracao-pcp"
            element={
              <Layout>
                <StubModulePage
                  title="PCP Robotizado (Automação Industrial)"
                  subtitle="Integração de saldo de laminados e programação de produção."
                  moduleKey="pcp"
                  statusText="Integração Preparada"
                  statusColor="bg-blue-600"
                />
              </Layout>
            }
          />
          <Route
            path="/tms/integracao-crm"
            element={
              <Layout>
                <StubModulePage
                  title="CRM 360° (Gestão Comercial)"
                  subtitle="Disparo de oportunidades logísticas e alertas de complemento de carga."
                  moduleKey="crm"
                  statusText="Integração Preparada"
                  statusColor="bg-emerald-600"
                />
              </Layout>
            }
          />
          <Route
            path="/tms/integracao-telegram"
            element={
              <Layout>
                <IntegrationsMonitorPage />
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
            path="/tms/monitor-integracoes"
            element={
              <Layout>
                <IntegrationsMonitorPage />
              </Layout>
            }
          />

          {/* 8. ADMINISTRAÇÃO */}
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
