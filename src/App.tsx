import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { QueueDashboard } from './pages/QueueDashboard'
import { FreightOffersPreparationPage } from './pages/FreightOffersPreparationPage'
import { PreRegistrationsPage } from './pages/PreRegistrationsPage'
import { DriversVehiclesPage } from './pages/DriversVehiclesPage'
import { SapImportPage } from './pages/SapImportPage'
import { IntegrationsMonitorPage } from './pages/IntegrationsMonitorPage'
import { AuditLogsPage } from './pages/AuditLogsPage'
import { SystemParametersPage } from './pages/SystemParametersPage'
import { UsersRolesPage } from './pages/UsersRolesPage'
import { TotemEntry } from './pages/TotemEntry'
import { ExternalCheckin } from './pages/ExternalCheckin'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      {/* Standalone Portaria Totem Screen */}
      <Route path="/totem" element={<TotemEntry />} />

      {/* Standalone External Driver Link Screen */}
      <Route path="/checkin-externo" element={<ExternalCheckin />} />

      {/* Internal Management Layout Routes */}
      <Route path="/" element={<Navigate to="/tms/fila" replace />} />

      <Route
        path="/tms/fila"
        element={
          <Layout>
            <QueueDashboard />
          </Layout>
        }
      />

      <Route
        path="/tms/ofertas"
        element={
          <Layout>
            <FreightOffersPreparationPage />
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
        path="/tms/sap-import"
        element={
          <Layout>
            <SapImportPage />
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

      <Route
        path="/tms/auditoria"
        element={
          <Layout>
            <AuditLogsPage />
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

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
