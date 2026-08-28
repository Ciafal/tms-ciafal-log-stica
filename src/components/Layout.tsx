import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Layers,
  Building,
  Smartphone,
  UserCheck,
  FileSpreadsheet,
  Users,
  Sliders,
  History,
  Activity,
  Sparkles,
  LogOut,
  Truck,
  Shield,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getRoleLabel } from '@/domain/rules'

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, permissions, logout, setSimulatedRole } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    {
      title: 'Fila Operacional',
      path: '/tms/fila',
      icon: Layers,
      show: permissions.canViewQueue,
      badge: 'Sprint 1.1',
      badgeColor: 'bg-emerald-600',
    },
    {
      title: 'Ofertas de Frete',
      path: '/tms/ofertas',
      icon: Sparkles,
      show: true,
      badge: 'Sprint 2',
      badgeColor: 'bg-amber-500',
    },
    {
      title: 'Pré-Cadastros',
      path: '/tms/pre-cadastros',
      icon: UserCheck,
      show: permissions.canManagePreRegistrations,
    },
    {
      title: 'Motoristas & Frota',
      path: '/tms/motoristas',
      icon: Truck,
      show: permissions.canViewQueue,
    },
    {
      title: 'Importação SAP',
      path: '/tms/sap-import',
      icon: FileSpreadsheet,
      show: permissions.canImportSap,
      badge: 'Provisório',
      badgeColor: 'bg-slate-500',
    },
    {
      title: 'Monitor de Integrações',
      path: '/tms/monitor-integracoes',
      icon: Activity,
      show: true,
    },
    {
      title: 'Trilha de Auditoria',
      path: '/tms/auditoria',
      icon: History,
      show: permissions.canViewAuditLogs,
    },
    {
      title: 'Parâmetros da Planta',
      path: '/tms/parametros',
      icon: Sliders,
      show:
        permissions.canManageSystemParameters || role === 'admin_master' || role === 'admin_tms',
    },
    {
      title: 'Usuários & Permissões',
      path: '/tms/usuarios',
      icon: Users,
      show: role === 'admin_master' || role === 'admin_tms',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand and Logo */}
          <div className="flex items-center space-x-3">
            <Link to="/tms/fila" className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#005596] flex items-center justify-center font-black text-white text-lg tracking-wider shadow">
                C
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-white leading-tight">
                  HUB CIAFAL
                </span>
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                  TMS Logística Integrada
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-700">
              <Badge className="bg-[#005596] text-white text-[10px] font-bold">
                SPRINT 1.1 HOMOLOGAÇÃO
              </Badge>
            </div>
          </div>

          {/* Direct Portaria / Externo Links & User Switcher */}
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-2 text-xs">
              <Link
                to="/totem"
                target="_blank"
                className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 border border-slate-700 transition"
              >
                <Building className="w-3.5 h-3.5 text-sky-400" />
                <span>Totem Portaria</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>

              <Link
                to="/checkin-externo"
                target="_blank"
                className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 border border-slate-700 transition"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Check-in FORA</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>
            </div>

            {/* Role Simulation Switcher & User Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 text-left hover:bg-slate-800 p-1.5 rounded-lg text-xs"
                >
                  <Avatar className="h-8 w-8 border border-sky-500">
                    <AvatarFallback className="bg-[#005596] text-white font-bold text-xs">
                      {user?.name?.substring(0, 2).toUpperCase() || 'OP'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <div className="font-bold text-slate-100 truncate max-w-[120px]">
                      {user?.name || 'Operador'}
                    </div>
                    <div className="text-[10px] text-sky-400 font-mono">
                      {role ? getRoleLabel(role) : 'Perfil'}
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 text-xs">
                <DropdownMenuLabel>
                  <div className="font-bold text-slate-900">{user?.name}</div>
                  <div className="text-[10px] text-slate-500 font-normal">{user?.email}</div>
                  <Badge variant="outline" className="mt-1 text-[9px]">
                    {getRoleLabel(role || 'operador_logistica')}
                  </Badge>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-400">
                  Simular Perfil RBAC (Homologação):
                </DropdownMenuLabel>

                <DropdownMenuItem onClick={() => setSimulatedRole('admin_master')}>
                  👑 Administrador Master
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSimulatedRole('admin_tms')}>
                  🛡️ Administrador TMS
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSimulatedRole('gestor_logistica')}>
                  📊 Gestor de Logística
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSimulatedRole('gerente_carga')}>
                  📦 Gerente de Carga
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSimulatedRole('operador_logistica')}>
                  👷 Operador de Logística
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSimulatedRole('portaria')}>
                  🏢 Portaria e Acesso
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSimulatedRole('auditor')}>
                  🔍 Auditor & Compliance
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={logout}
                  className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Encerrar Sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full flex flex-col md:flex-row gap-6">
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase px-3 py-1.5 tracking-wider">
              Navegação Operacional
            </div>

            {navItems
              .filter((item) => item.show)
              .map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#005596] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.title}</span>
                    </div>

                    {item.badge && (
                      <Badge
                        className={`text-[9px] px-1.5 py-0 font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badgeColor
                              ? `${item.badgeColor} text-white`
                              : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                )
              })}

            <div className="pt-4 mt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase px-3 py-1 tracking-wider">
                Interfaces Públicas
              </div>
              <div className="space-y-1 pt-1">
                <Link
                  to="/totem"
                  target="_blank"
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-slate-50 font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-sky-600" />
                    Totem Portaria (PORTA)
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Link>

                <Link
                  to="/checkin-externo"
                  target="_blank"
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-slate-50 font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    Check-in Externo (FORA)
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Link>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>TMS CIAFAL Logística</strong> • HUB Integrado • Versão 1.1.0 (Homologação da
            Fila)
          </div>
          <div className="text-[11px] text-slate-400">
            Regras de Negócio Determinísticas • Proteção LGPD • Trilha de Auditoria Imutável
          </div>
        </div>
      </footer>
    </div>
  )
}
