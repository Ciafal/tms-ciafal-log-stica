import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole, getRoleLabel } from '@/domain/rules'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Truck,
  CalendarCheck,
  Package,
  BadgeDollarSign,
  MapPin,
  Bot,
  Database,
  FileSpreadsheet,
  Sliders,
  ShieldAlert,
  Activity,
  LogOut,
  Send,
  MessageSquare,
  QrCode,
  Smartphone,
  ChevronDown,
  Layers,
  ChevronRight,
  Sparkles,
  Building2,
  Lock,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, role, setSimulatedRole } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const availableRoles: UserRole[] = [
    'admin_master',
    'admin_tms',
    'gestor_logistica',
    'gerente_carga',
    'operador_logistica',
    'portaria',
    'financeiro',
    'comercial',
    'auditor',
  ]

  const menuSections = [
    {
      title: 'Visão Geral',
      items: [
        {
          name: 'Dashboard TMS',
          path: '/tms/dashboard',
          icon: LayoutDashboard,
          badge: 'Principal',
        },
      ],
    },
    {
      title: 'Operação de Pátio & Fila',
      items: [
        {
          name: 'Fila de Motoristas',
          path: '/tms/fila',
          icon: Users,
          badge: 'Operacional',
          activeFeature: true,
        },
        { name: 'Pré-cadastros', path: '/tms/pre-cadastros', icon: UserPlus, activeFeature: true },
        {
          name: 'Motoristas & Veículos',
          path: '/tms/motoristas',
          icon: Truck,
          activeFeature: true,
        },
        {
          name: 'Planejamento de Cargas',
          path: '/tms/planejamento',
          icon: CalendarCheck,
          status: 'Em desenvolvimento',
        },
        {
          name: 'Cargas & Viagens',
          path: '/tms/cargas',
          icon: Package,
          status: 'Em desenvolvimento',
        },
        {
          name: 'Ofertas de Frete',
          path: '/tms/ofertas',
          icon: BadgeDollarSign,
          status: 'Em desenvolvimento',
        },
        {
          name: 'Acompanhamento',
          path: '/tms/acompanhamento',
          icon: MapPin,
          status: 'Em desenvolvimento',
        },
      ],
    },
    {
      title: 'Agentes de IA Corporativos',
      items: [
        {
          name: 'Chicão — Negociação de Fretes',
          path: '/tms/agentes/chicao',
          icon: Bot,
          status: 'Em desenvolvimento',
          isAi: true,
        },
        {
          name: 'Fred — Acompanhamento Cargas',
          path: '/tms/agentes/fred',
          icon: Sparkles,
          status: 'Em desenvolvimento',
          isAi: true,
        },
      ],
    },
    {
      title: 'Pontos de Entrada Fila',
      items: [
        { name: 'Totem Portaria (PORTA)', path: '/tms/totem', icon: QrCode, externalLike: true },
        {
          name: 'Check-in Externo (FORA)',
          path: '/tms/checkin',
          icon: Smartphone,
          externalLike: true,
        },
      ],
    },
    {
      title: 'Integrações Corporativas',
      items: [
        {
          name: 'SAP ECC (ZSD004V_V2)',
          path: '/tms/integracoes/sap',
          icon: Database,
          status: 'Em desenvolvimento',
        },
        {
          name: 'Telegram Bot',
          path: '/tms/integracoes/telegram',
          icon: Send,
          status: 'Em desenvolvimento',
        },
        {
          name: 'WhatsApp Business',
          path: '/tms/integracoes/whatsapp',
          icon: MessageSquare,
          status: 'Em desenvolvimento',
        },
        {
          name: 'TARGET / QLIK',
          path: '/tms/integracoes/bi',
          icon: Activity,
          status: 'Em desenvolvimento',
        },
      ],
    },
    {
      title: 'Administração & Governança',
      items: [
        {
          name: 'Importação SAP (Arquivo)',
          path: '/tms/importacao',
          icon: FileSpreadsheet,
          activeFeature: true,
        },
        {
          name: 'Parâmetros do Sistema',
          path: '/tms/parametros',
          icon: Sliders,
          activeFeature: true,
        },
        {
          name: 'Auditoria & Logs',
          path: '/tms/auditoria',
          icon: ShieldAlert,
          activeFeature: true,
        },
        {
          name: 'Usuários & Perfis RBAC',
          path: '/tms/usuarios',
          icon: Layers,
          activeFeature: true,
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* TOPBAR / HEADER DO HUB CIAFAL */}
      <header className="sticky top-0 z-40 bg-[#005596] text-white shadow-md border-b border-[#004071] select-none">
        <div className="flex items-center justify-between px-4 py-2.5 h-16">
          {/* Logo CIAFAL & HUB Module */}
          <div className="flex items-center space-x-3">
            <Link to="/tms/dashboard" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-lg bg-white text-[#005596] flex items-center justify-center font-black text-xl tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
                CF
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold tracking-tight text-lg text-white">
                    HUB CIAFAL
                  </span>
                  <span className="bg-sky-500/30 text-sky-100 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-sky-400/30">
                    TMS Logística
                  </span>
                </div>
                <p className="text-xs text-sky-100/80 font-medium">
                  Transporte, Gestão de Pátio e Orquestração
                </p>
              </div>
            </Link>
          </div>

          {/* Quick Access Badges & Active Rules Principle */}
          <div className="hidden lg:flex items-center space-x-3 text-xs bg-[#004071]/70 px-3 py-1.5 rounded-md border border-sky-400/20">
            <div className="flex items-center space-x-1.5 text-sky-200">
              <Building2 className="w-3.5 h-3.5 text-sky-300" />
              <span className="font-semibold">Planta Central Matriz</span>
            </div>
            <span className="text-sky-400">•</span>
            <div className="text-sky-100 italic">
              "O agente conversa. O motor de regras decide."
            </div>
          </div>

          {/* Right Header Section: Profile Selector & SSO */}
          <div className="flex items-center space-x-3">
            {/* Direct Totem / Checkin Quick Links */}
            <div className="hidden sm:flex items-center space-x-2 mr-2">
              <Link to="/tms/totem">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 bg-sky-900/50 hover:bg-sky-800 text-sky-100 border-sky-400/40 text-xs gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5 text-sky-300" />
                  Totem Portaria
                </Button>
              </Link>
              <Link to="/tms/checkin">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 bg-sky-900/50 hover:bg-sky-800 text-sky-100 border-sky-400/40 text-xs gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
                  Link FORA (60km)
                </Button>
              </Link>
            </div>

            {/* Profile & Role Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-2.5 bg-[#004071] hover:bg-[#00355e] border border-sky-400/30 px-3 py-1.5 rounded-lg text-left transition-colors cursor-pointer outline-none">
                  <div className="w-8 h-8 rounded-full bg-sky-100 text-[#005596] font-bold flex items-center justify-center text-xs">
                    {user?.name ? user.name.charAt(0) : 'U'}
                  </div>
                  <div className="hidden md:block leading-tight">
                    <p className="text-xs font-semibold text-white max-w-[140px] truncate">
                      {user?.name || 'Administrador'}
                    </p>
                    <p className="text-[10px] text-sky-200 uppercase tracking-wide">
                      {getRoleLabel(role)}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-sky-300" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="font-semibold text-slate-800">{user?.name}</div>
                  <div className="text-xs text-slate-500 font-normal">{user?.email}</div>
                  <div className="text-[11px] text-sky-700 font-semibold mt-1 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    Perfil Ativo: {getRoleLabel(role)}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Simular Perfil Corporativo (RBAC)
                </DropdownMenuLabel>
                {availableRoles.map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onClick={() => setSimulatedRole(r)}
                    className={`text-xs cursor-pointer flex items-center justify-between ${
                      role === r ? 'bg-sky-100 font-bold text-sky-900' : ''
                    }`}
                  >
                    <span>{getRoleLabel(r)}</span>
                    {role === r && <span className="w-2 h-2 rounded-full bg-[#005596]" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/tms/auditoria')}
                  className="text-xs cursor-pointer text-slate-700"
                >
                  <ShieldAlert className="w-3.5 h-3.5 mr-2 text-slate-500" />
                  Visualizar Trilha de Auditoria
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* BODY WITH PERSISTENT SIDEBAR */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR INSTITUCIONAL (Pantone 2945 Theme) */}
        <aside className="w-64 bg-slate-900 text-slate-100 flex-shrink-0 flex flex-col border-r border-slate-800 select-none overflow-y-auto">
          {/* Quick Module Banner */}
          <div className="p-3 bg-slate-950/60 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Navegação TMS
              </span>
              <Badge
                variant="outline"
                className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-950/30"
              >
                Online
              </Badge>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-2 py-3 space-y-4">
            {menuSections.map((sec, idx) => (
              <div key={idx} className="space-y-1">
                <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400/90 mb-1">
                  {sec.title}
                </div>
                {sec.items.map((item, itemIdx) => {
                  const isActive = location.pathname === item.path
                  const Icon = item.icon
                  return (
                    <Link
                      key={itemIdx}
                      to={item.path}
                      className={`group flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-[#005596] text-white shadow-sm font-semibold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            isActive
                              ? 'text-sky-200'
                              : item.isAi
                                ? 'text-amber-400 group-hover:text-amber-300'
                                : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            isActive
                              ? 'bg-sky-400/30 text-white'
                              : 'bg-sky-950 text-sky-300 border border-sky-800'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {item.status && (
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-normal border border-slate-700">
                          {item.status}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Footer Sidebar info */}
          <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400">
            <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
              <span>SAP ECC 6.0</span>
              <span className="text-amber-400 text-[10px] font-mono">ZSD004V_V2</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Regras Determinísticas ativas. Integração via Importação Provisória.
            </p>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 bg-slate-100 overflow-y-auto flex flex-col">
          <div className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</div>

          {/* Institutional Footer */}
          <footer className="bg-white border-t border-slate-200 px-6 py-3 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span className="font-bold text-slate-700">CIAFAL Logística & Transporte</span> —
              Módulo Corporativo TMS integrado ao HUB CIAFAL.
            </div>
            <div className="text-[11px] text-slate-400">
              Ambiente de Homologação Operacional da Fila • Versão 1.0.0
            </div>
          </footer>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
