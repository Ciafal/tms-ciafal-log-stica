import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { Layout } from '@/components/Layout'

// TMS Operational Pages
import { TmsDashboard } from '@/pages/TmsDashboard'
import { QueueDashboard } from '@/pages/QueueDashboard'
import { TotemEntry } from '@/pages/TotemEntry'
import { ExternalCheckin } from '@/pages/ExternalCheckin'
import { PreRegistrationsPage } from '@/pages/PreRegistrationsPage'
import { SapImportPage } from '@/pages/SapImportPage'
import { DriversVehiclesPage } from '@/pages/DriversVehiclesPage'
import { AuditLogsPage } from '@/pages/AuditLogsPage'
import { UsersRolesPage } from '@/pages/UsersRolesPage'
import { SystemParametersPage } from '@/pages/SystemParametersPage'
import { StubModulePage } from '@/pages/StubModulePage'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public / Autonomous Entry Points */}
          <Route path="/tms/totem" element={<TotemEntry />} />
          <Route path="/tms/checkin" element={<ExternalCheckin />} />

          {/* TMS Hub Enclosed Routes */}
          <Route
            path="/tms/dashboard"
            element={
              <Layout>
                <TmsDashboard />
              </Layout>
            }
          />
          <Route
            path="/tms/fila"
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
            path="/tms/importacao"
            element={
              <Layout>
                <SapImportPage />
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
            path="/tms/usuarios"
            element={
              <Layout>
                <UsersRolesPage />
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

          {/* Stubs: Operação Futura */}
          <Route
            path="/tms/planejamento"
            element={
              <Layout>
                <StubModulePage
                  title="Planejamento de Cargas & Capacidade"
                  moduleName="Operação Logística"
                  icon="planejamento"
                  description="Módulo para balanceamento de demanda, agendamento de janelas de carregamento por doca e cálculo de cubagem/peso."
                  technicalDetails={[
                    'Origem dos Pedidos: SAP SD (Ordens de Venda)',
                    'Algoritmo: Determinístico de Bin Packing e Janela Horária',
                    'Status Atual: Em desenvolvimento (Sprint 2)',
                  ]}
                />
              </Layout>
            }
          />
          <Route
            path="/tms/cargas"
            element={
              <Layout>
                <StubModulePage
                  title="Gestão de Cargas & Viagens"
                  moduleName="Operação Logística"
                  icon="cargas"
                  description="Acompanhamento de emissão de NF-e, CT-e, MDF-e, lacres, vistorias de segurança e liberação de saída."
                  technicalDetails={[
                    'Documento SAP: Remessa (Delivery) e Transporte VT01N',
                    'Integração Sefaz: A confirmar no Blueprint',
                    'Status Atual: Em desenvolvimento (Sprint 2)',
                  ]}
                />
              </Layout>
            }
          />
          <Route
            path="/tms/ofertas"
            element={
              <Layout>
                <StubModulePage
                  title="Ofertas de Frete para a Fila"
                  moduleName="Operação Logística"
                  icon="ofertas"
                  description="Motor determinístico de distribuição de ofertas de frete respeitando estritamente a prioridade temporal PORTA > FORA."
                  technicalDetails={[
                    'Regra de Negociação: Teto máximo NUNCA exposto ao LLM',
                    'Canais de Envio: WhatsApp e Telegram Bot',
                    'Status Atual: Em desenvolvimento (Sprint 2)',
                  ]}
                />
              </Layout>
            }
          />
          <Route
            path="/tms/acompanhamento"
            element={
              <Layout>
                <StubModulePage
                  title="Acompanhamento de Transportes em Trânsito"
                  moduleName="Operação Logística"
                  icon="acompanhamento"
                  description="Rastreamento em tempo real de viagens iniciadas, previsão de chegada e registro de ocorrências em rota."
                  technicalDetails={[
                    'Telemetria: Macro de viagem via WhatsApp e App Motorista',
                    'Status Atual: Em desenvolvimento (Sprint 2)',
                  ]}
                />
              </Layout>
            }
          />

          {/* Stubs: Agentes de IA */}
          <Route
            path="/tms/agentes/chicao"
            element={
              <Layout>
                <StubModulePage
                  title="Chicão — Agente de Negociação de Fretes"
                  moduleName="Inteligência Artificial Corporativa"
                  icon="chicao"
                  description="Agente de conversação que interage cordialmente com motoristas para apresentação e aceite de ofertas de carga pré-autorizadas pelo motor de regras."
                  technicalDetails={[
                    'Modelo: Skip Cloud Agent (chicao-negociador)',
                    'Princípio: O agente conversa. O motor de regras decide.',
                    'Proteção: Proibido negociar valores acima da tabela ou alterar elegibilidade.',
                    'Status Atual: Em desenvolvimento (Arquitetura e Agente provisionados)',
                  ]}
                />
              </Layout>
            }
          />
          <Route
            path="/tms/agentes/fred"
            element={
              <Layout>
                <StubModulePage
                  title="Fred — Agente de Acompanhamento das Cargas"
                  moduleName="Inteligência Artificial Corporativa"
                  icon="fred"
                  description="Assistente de IA para suporte ao motorista em trânsito, consulta de janelas de carregamento e confirmação de chegada no destino."
                  technicalDetails={[
                    'Modelo: Skip Cloud Agent (fred-rastreamento)',
                    'Integração de Mensageria: WhatsApp Business API / Telegram',
                    'Status Atual: Em desenvolvimento (Arquitetura provisionada)',
                  ]}
                />
              </Layout>
            }
          />

          {/* Stubs: Integrações */}
          <Route
            path="/tms/integracoes/sap"
            element={
              <Layout>
                <StubModulePage
                  title="Conector SAP ECC 6.0 EHP8"
                  moduleName="Integrações Corporativas"
                  icon="sap"
                  description="Conexão direta com SAP para replicação de documentos de transporte, parceiros de negócio e eventos de carga."
                  technicalDetails={[
                    'Protocolos Permitidos: IDoc, qRFC / tRFC, RFC / BAPI encapsulada',
                    'Protocolos Proibidos: REST / OData / SOAP direto sem barramento',
                    'Identidade de Objeto: A confirmar no Blueprint da Integração',
                    'Status Atual: Provisório via Carga Administrativa de Arquivo',
                  ]}
                />
              </Layout>
            }
          />
          <Route
            path="/tms/integracoes/telegram"
            element={
              <Layout>
                <StubModulePage
                  title="Bot Telegram Logística"
                  moduleName="Integrações Corporativas"
                  icon="telegram"
                  description="Canal de comunicação instantânea para broadcast de ofertas e avisos de chamada de doca para motoristas cadastrados."
                  technicalDetails={[
                    'Segurança: Vinculação de Chat ID ao CPF do motorista',
                    'Status Atual: Em desenvolvimento',
                  ]}
                />
              </Layout>
            }
          />
          <Route
            path="/tms/integracoes/whatsapp"
            element={
              <Layout>
                <StubModulePage
                  title="WhatsApp Business API"
                  moduleName="Integrações Corporativas"
                  icon="whatsapp"
                  description="Canal prioritário de envio de ofertas de frete e comunicação com condutores dos grupos PORTA e FORA."
                  technicalDetails={[
                    'Provedor: WhatsApp Cloud API Oficial',
                    'Templates Homologados: Notificação de Carga, Chamada Doca',
                    'Status Atual: Em desenvolvimento',
                  ]}
                />
              </Layout>
            }
          />
          <Route
            path="/tms/integracoes/bi"
            element={
              <Layout>
                <StubModulePage
                  title="TARGET / QLIK Sense Logística"
                  moduleName="Integrações Corporativas"
                  icon="bi"
                  description="Visualizações analíticas de SLA de carregamento, tempo médio na fila (PORTA vs FORA) e eficiência de fretes."
                  technicalDetails={[
                    'Conector: QVD / REST BI Extractor',
                    'Status Atual: Em desenvolvimento',
                  ]}
                />
              </Layout>
            }
          />

          {/* Root Redirects */}
          <Route path="/" element={<Navigate to="/tms/dashboard" replace />} />
          <Route path="/tms" element={<Navigate to="/tms/dashboard" replace />} />

          {/* 404 Catch All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
