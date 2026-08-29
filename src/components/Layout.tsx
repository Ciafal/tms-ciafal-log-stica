import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Layers,
  CalendarCheck,
  BadgeDollarSign,
  Truck,
  Bot,
  Activity,
  BarChart3,
  Sliders,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Shield,
  LogOut,
  Menu,
  X,
  Building,
  Smartphone,
  Calendar,
  UserCheck,
  Route,
  Package,
  Layers as LayersIcon,
  Sparkles,
  FileSpreadsheet,
  Users,
  ShieldAlert,
  Send,
  MessageSquare,
  Radio,
  History,
  Target,
  LineChart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getRoleLabel } from '@/domain/rules'
import ciafalLogo from '@/assets/logo-ciafal-0e4b2.png'

interface MenuGroup {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: {
    title: string
    path: string
    badge?: string
    badgeColor?: string
    inDev?: boolean
    show?: boolean
  }[]
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, permissions, logout, setSimulatedRole } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Collapsible menu groups state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    disponibilidade: true,
    planejamento: true,
    fretes: false,
    transportes: false,
    agentes: false,
    integracoes: false,
    gestao: false,
    admin: false,
  })

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  // Exact CIAFAL Menu Structure as Specified
  const menuGroups: MenuGroup[] = [
    {
      id: 'disponibilidade',
      title: 'DISPONIBILIDADE LOGÍSTICA',
      icon: Layers,
      items: [
        {
          title: 'Fila & Disponibilidade',
          path: '/tms/fila',
          badge: 'PORTA/FORA',
          badgeColor: 'bg-emerald-600',
          show: true,
        },
        {
          title: 'Disponibilidade Programada',
          path: '/tms/disponibilidade-programada',
          badge: 'Futuro',
          badgeColor: 'bg-sky-600',
          show: true,
        },
        {
          title: 'Pré-cadastros',
          path: '/tms/pre-cadastros',
          show: permissions.canManagePreRegistrations,
        },
        {
          title: 'Motoristas & Veículos',
          path: '/tms/motoristas',
          show: true,
        },
      ],
    },
    {
      id: 'planejamento',
      title: 'PLANEJAMENTO LOGÍSTICO',
      icon: CalendarCheck,
      items: [
        {
          title: 'Planejador de Cargas',
          path: '/tms/planejador-cargas',
          badge: 'Núcleo',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Roteirizador / Simulador',
          path: '/tms/roteirizador-simulador',
          badge: 'Sprint 3',
          badgeColor: 'bg-emerald-600',
          show: true,
        },
        {
          title: 'Programação Futura',
          path: '/tms/programacao-futura',
          show: true,
        },
        {
          title: 'Complemento de Cargas',
          path: '/tms/complemento-cargas',
          badge: 'CRM',
          badgeColor: 'bg-purple-600',
          show: true,
        },
        {
          title: 'Carteira (SAP ZSD35)',
          path: '/tms/carteira-pedidos',
          badge: 'Oficial',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Estoque & Produção',
          path: '/tms/estoque-producao',
          badge: 'MB52 + PCP',
          badgeColor: 'bg-sky-600',
          show: true,
        },
        {
          title: 'Itinerários SAP',
          path: '/tms/itinerarios-sap',
          badge: 'TVROT',
          badgeColor: 'bg-slate-500',
          show: true,
        },
      ],
    },
    {
      id: 'fretes',
      title: 'FRETES',
      icon: BadgeDollarSign,
      items: [
        {
          title: 'Mesa de Fretes',
          path: '/tms/mesa-fretes',
          badge: 'PORTA/FORA',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Ofertas Ativas',
          path: '/tms/ofertas',
          badge: 'Sprint 2',
          badgeColor: 'bg-emerald-600',
          show: true,
        },
        {
          title: 'Tabela ANTT Oficial',
          path: '/tms/tabela-antt',
          badge: 'Oficial',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Histórico de Negociações',
          path: '/tms/historico-fretes',
          inDev: true,
          show: true,
        },
      ],
    },
    {
      id: 'transportes',
      title: 'TRANSPORTES',
      icon: Truck,
      items: [
        {
          title: 'Cargas & Expedição',
          path: '/tms/cargas',
          badge: 'Sprint 5',
          badgeColor: 'bg-emerald-600',
          show: true,
        },
        {
          title: 'Monitor de Impressão',
          path: '/tms/monitor-impressao',
          badge: 'Spooler',
          badgeColor: 'bg-[#005596]',
          show: permissions.canViewPrinters,
        },
        {
          title: 'Transportes',
          path: '/tms/transportes',
          inDev: true,
          show: true,
        },
        {
          title: 'Acompanhamento',
          path: '/tms/acompanhamento',
          inDev: true,
          show: true,
        },
        {
          title: 'Ocorrências',
          path: '/tms/ocorrencias',
          inDev: true,
          show: true,
        },
      ],
    },
    {
      id: 'agentes',
      title: 'AGENTES',
      icon: Bot,
      items: [
        {
          title: 'Chicão',
          path: '/tms/agente-chicao',
          badge: 'IA Negociação',
          badgeColor: 'bg-amber-600',
          inDev: true,
          show: true,
        },
        {
          title: 'Fred',
          path: '/tms/agente-fred',
          badge: 'IA Suporte',
          badgeColor: 'bg-purple-600',
          inDev: true,
          show: true,
        },
      ],
    },
    {
      id: 'integracoes',
      title: 'INTEGRAÇÕES & CONTRATOS',
      icon: Activity,
      items: [
        {
          title: 'Central de Homologação',
          path: '/tms/monitor-integracoes',
          badge: 'Sprint 4.1',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'SAP: Carteira & Dados',
          path: '/tms/sap-dados',
          badge: 'ZSD35',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'SAP: Consultoria ABAP',
          path: '/tms/sap-consultoria',
          badge: 'Checklist',
          badgeColor: 'bg-amber-600',
          show: true,
        },
        {
          title: 'SAP: Reconciliação',
          path: '/tms/sap-reconciliacao',
          badge: 'Auditoria',
          badgeColor: 'bg-blue-600',
          show: true,
        },
        {
          title: 'PCP Robotizado Contrato',
          path: '/tms/pcp-contrato',
          badge: 'mTLS',
          badgeColor: 'bg-blue-500',
          show: true,
        },
        {
          title: 'CRM 360° Contrato',
          path: '/tms/crm-contrato',
          badge: 'HMAC',
          badgeColor: 'bg-emerald-600',
          show: true,
        },
        {
          title: 'ANTT Fonte Oficial',
          path: '/tms/antt-fonte-oficial',
          badge: '5.867/19',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Telegram Mensageria',
          path: '/tms/integracao-telegram',
          badge: 'Bot API',
          badgeColor: 'bg-sky-500',
          show: true,
        },
        {
          title: 'WhatsApp Mensageria',
          path: '/tms/integracao-whatsapp',
          badge: 'Cloud API',
          badgeColor: 'bg-emerald-500',
          show: true,
        },
      ],
    },
    {
      id: 'gestao',
      title: 'GESTÃO',
      icon: BarChart3,
      items: [
        {
          title: 'Dashboard Gerencial',
          path: '/tms/dashboard-gerencial',
          show: true,
        },
        {
          title: 'Relatórios',
          path: '/tms/relatorios',
          inDev: true,
          show: true,
        },
        {
          title: 'Auditoria & Compliance',
          path: '/tms/auditoria',
          show: permissions.canViewAuditLogs,
        },
        {
          title: 'Monitor Central de Integrações',
          path: '/tms/monitor-integracoes',
          badge: 'Sprint 4.1',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
      ],
    },
    {
      id: 'admin',
      title: 'ADMINISTRAÇÃO',
      icon: Sliders,
      items: [
        {
          title: 'Arquitetura TMS CIAFAL',
          path: '/tms/arquitetura',
          badge: 'Macro Fluxo',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Readiness de Produção',
          path: '/tms/readiness-producao',
          badge: 'GO / NO-GO',
          badgeColor: 'bg-emerald-600',
          show: true,
        },
        {
          title: 'Providers de Rota',
          path: '/tms/providers-rota',
          badge: 'Multi-Adapter',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Provider de Pedágios',
          path: '/tms/providers-pedagio',
          badge: 'Eixos/Tarifas',
          badgeColor: 'bg-emerald-600',
          show: true,
        },
        {
          title: 'Impressoras de Rede',
          path: '/tms/impressoras',
          badge: 'Sprint 5',
          badgeColor: 'bg-emerald-600',
          show: permissions.canViewPrinters,
        },
        {
          title: 'Blueprint SAP (12 Colunas)',
          path: '/tms/sap-blueprint',
          show: true,
        },
        {
          title: 'Parâmetros Operacionais',
          path: '/tms/parametros',
          show:
            permissions.canManageSystemParameters ||
            role === 'admin_master' ||
            role === 'admin_tms',
        },
        {
          title: 'Usuários e Perfis (RBAC)',
          path: '/tms/usuarios',
          show: role === 'admin_master' || role === 'admin_tms',
        },
        {
          title: 'Segurança & LGPD',
          path: '/tms/seguranca-lgpd',
          show: true,
        },
        {
          title: 'Importações SAP',
          path: '/tms/sap-import',
          badge: 'Provisório',
          badgeColor: 'bg-slate-500',
          show: permissions.canImportSap,
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation Bar - CIAFAL Pantone 2945 */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand and Logo */}
          <div className="flex items-center space-x-4">
            <Link to="/tms/dashboard" className="flex items-center space-x-3 group">
              <div className="h-10 px-2.5 py-1 rounded-xl bg-white flex items-center justify-center shadow-md border border-slate-700">
                <img
                  src={ciafalLogo}
                  alt="CIAFAL Wilson Santos"
                  className="h-7 w-auto object-contain"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base tracking-tight text-white leading-tight">
                    HUB CIAFAL
                  </span>
                  <Badge className="bg-[#005596] text-white text-[9px] font-bold px-1.5 py-0">
                    Pantone 2945
                  </Badge>
                </div>
                <span className="text-[10px] text-sky-400 font-extrabold uppercase tracking-wider">
                  TMS Logística Integrada
                </span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-slate-800">
              <Badge className="bg-[#005596] text-white text-[10px] font-bold px-2.5 py-0.5">
                DISPONIBILIDADE → PLANEJAMENTO → MESA DE FRETES → EXECUÇÃO
              </Badge>
            </div>
          </div>

          {/* Quick Access to Driver Link and User Switcher */}
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-2 text-xs">
              <Link
                to="/tms/fila-publica"
                target="_blank"
                className="text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">Link Público Motorista</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>

              <Link
                to="/totem"
                target="_blank"
                className="text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
              >
                <Building className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold">Totem PORTA</span>
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
                  <Avatar className="h-8 w-8 border border-[#005596]">
                    <AvatarFallback className="bg-[#005596] text-white font-bold text-xs">
                      {user?.name?.substring(0, 2).toUpperCase() || 'OP'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <div className="font-bold text-slate-100 truncate max-w-[130px]">
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
                  Simular Perfil RBAC:
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
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-5 flex-1 w-full flex flex-col md:flex-row gap-5">
        {/* Left Sidebar Navigation - Collapsible CIAFAL Menu */}
        <aside
          className={`w-full md:w-72 flex-shrink-0 ${mobileMenuOpen ? 'block' : 'hidden md:block'}`}
        >
          <nav className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-sm space-y-2 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
            {/* Sidebar Branding Box */}
            <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg text-white flex items-center space-x-3 shadow-inner">
              <div className="bg-white p-1 rounded-lg">
                <img src={ciafalLogo} alt="CIAFAL" className="h-6 w-auto object-contain" />
              </div>
              <div>
                <div className="text-xs font-black text-white leading-tight">MESA DE FRETES</div>
                <div className="text-[9px] text-sky-400 font-bold uppercase">
                  Motor Determinístico
                </div>
              </div>
            </div>

            {/* HOME Link */}
            <Link
              to="/tms/dashboard"
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                location.pathname === '/tms/dashboard' || location.pathname === '/'
                  ? 'bg-[#005596] text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <LayoutDashboard
                  className={`w-4 h-4 ${
                    location.pathname === '/tms/dashboard' || location.pathname === '/'
                      ? 'text-white'
                      : 'text-[#005596]'
                  }`}
                />
                <span>HOME: Dashboard TMS</span>
              </div>
            </Link>

            {/* Grouped Accordion Menu */}
            {menuGroups.map((group) => {
              const Icon = group.icon
              const isOpen = openGroups[group.id] ?? false
              const hasActiveChild = group.items.some((i) => location.pathname === i.path)

              return (
                <div key={group.id} className="border-t border-slate-100 pt-1.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-extrabold tracking-wide uppercase transition-colors ${
                      hasActiveChild
                        ? 'text-[#005596] bg-sky-50/70'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{group.title}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="mt-1 space-y-0.5 pl-2">
                      {group.items
                        .filter((item) => item.show !== false)
                        .map((item) => {
                          const isActive = location.pathname === item.path
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                                isActive
                                  ? 'bg-[#005596] text-white shadow-sm font-semibold'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                            >
                              <span className="truncate">{item.title}</span>

                              <div className="flex items-center space-x-1">
                                {item.inDev && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[8px] px-1 py-0 ${
                                      isActive
                                        ? 'border-white/40 text-white bg-white/10'
                                        : 'border-amber-400 text-amber-700 bg-amber-50'
                                    }`}
                                  >
                                    Em desenvolv.
                                  </Badge>
                                )}

                                {item.badge && (
                                  <Badge
                                    className={`text-[8px] px-1.5 py-0 font-bold ${
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
                              </div>
                            </Link>
                          )
                        })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Public Links footer in sidebar */}
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-400 space-y-1">
              <div className="px-2 font-bold uppercase text-[9px] text-slate-400">
                Rotas Públicas Seguras:
              </div>
              <Link
                to="/tms/fila-publica"
                target="_blank"
                className="flex items-center justify-between px-2 py-1 rounded text-slate-600 hover:bg-slate-50 hover:text-emerald-700"
              >
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  Link Fila (/tms/fila-publica)
                </span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>
              <Link
                to="/totem"
                target="_blank"
                className="flex items-center justify-between px-2 py-1 rounded text-slate-600 hover:bg-slate-50 hover:text-[#005596]"
              >
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#005596]" />
                  Totem Portaria (/totem)
                </span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>TMS CIAFAL Logística</strong> • Plataforma Integrada de Transporte (Pantone
            2945)
          </div>
          <div className="text-[11px] text-slate-400">
            SAP System of Record • O motor de regras decide • Trilha de Auditoria Imutável
          </div>
        </div>
      </footer>
    </div>
  )
}
