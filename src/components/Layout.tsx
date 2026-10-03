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
  Compass,
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
  FileSignature,
  FileEdit,
  FolderKanban,
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
import { CollectorAccessModal } from '@/components/CollectorAccessModal'

interface MenuGroup {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: {
    title: string
    path: string
    icon?: React.ComponentType<{ className?: string }>
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
  const [collectorModalOpen, setCollectorModalOpen] = useState(false)

  // Collapsible menu groups state (auto-abre se a rota ativa pertencer ao grupo)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    cadastro: true,
    disponibilidade: true,
    planejamento: true,
    contratacao: false,
    expedicao: false,
    transporte: false,
    analises: true,
    configuracoes:
      location.pathname.startsWith('/tms/sincronizacao-sap') ||
      location.pathname.startsWith('/tms/monitor-integracoes'),
  })

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  // Estrutura Canônica Reorganizada — Item 1 do Requisito Oficial: TMS > CADASTRO > Editar Transporte
  const menuGroups: MenuGroup[] = [
    {
      id: 'cadastro',
      title: 'CADASTRO',
      icon: FolderKanban,
      items: [
        {
          title: 'Editar Transporte',
          path: '/tms/editar-transporte',
          icon: FileEdit,
          badge: 'VT02N',
          badgeColor: 'bg-[#005596]',
          show: permissions.canViewTransport ?? true,
        },
        {
          title: 'Motoristas & Veículos',
          path: '/tms/motoristas',
          show: true,
        },
        {
          title: 'Pré-cadastros',
          path: '/tms/pre-cadastros',
          show: permissions.canManagePreRegistrations,
        },
      ],
    },
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
          badge: 'planner-ai',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Roteirizador / Simulador',
          path: '/tms/roteirizador-simulador',
          badge: 'Rotas',
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
          title: 'Informações Clientes',
          path: '/tms/informacoes-clientes',
          badge: 'SAP RFC',
          badgeColor: 'bg-[#005596]',
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
      id: 'contratacao',
      title: 'CONTRATAÇÃO',
      icon: BadgeDollarSign,
      items: [
        {
          title: 'Mesa de Fretes',
          path: '/tms/mesa-fretes',
          badge: 'Mercado',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Negociações & Chicão',
          path: '/tms/mesa-fretes',
          badge: 'Chicão IA',
          badgeColor: 'bg-sky-600',
          show: true,
        },
        {
          title: 'Negociações',
          path: '/tms/negociacoes',
          badge: 'Gestão SAP',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Inteligência de Fretes',
          path: '/tms/inteligencia-fretes',
          badge: 'Analytics',
          badgeColor: 'bg-amber-600',
          show: permissions.canViewFreightIntelligence,
        },
        {
          title: 'Avaliação Veículo/Motorista',
          path: '/tms/avaliacao-veiculo-motorista',
          badge: 'Qualidade',
          badgeColor: 'bg-emerald-600',
          show: true,
        },
        {
          title: 'Configuração do Score',
          path: '/tms/avaliacao-veiculo-motorista/configuracao-score',
          badge: 'Pesos 100%',
          badgeColor: 'bg-[#005596]',
          show:
            role === 'admin_master' || role === 'admin_tms' || role === 'gestor_logistica' || true,
        },
        {
          title: 'Tabela ANTT Oficial',
          path: '/tms/tabela-antt',
          badge: 'Oficial',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
      ],
    },
    {
      id: 'expedicao',
      title: 'EXPEDIÇÃO',
      icon: Truck,
      items: [
        {
          title: 'Gestão da Expedição',
          path: '/tms/expedicao',
          badge: 'Novo',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Coletor de Expedição',
          path: '/tms/expedicao/coletor',
          badge: 'C72',
          badgeColor: 'bg-emerald-600',
          show: permissions.canUseCollector || true,
        },
        {
          title: 'Torre de Controle',
          path: '/tms/torre-controle',
          badge: 'Live',
          badgeColor: 'bg-emerald-600',
          show: true,
        },

        {
          title: 'Mapa Carregamento (WMS)',
          path: '/tms/wms-mapa-carregamento',
          badge: 'DP34',
          badgeColor: 'bg-purple-600',
          show: permissions.canViewWmsLoadingMap,
        },
        {
          title: 'Histórico de Expedições',
          path: '/tms/performance-expedicao',
          badge: 'T1–T8',
          badgeColor: 'bg-slate-600',
          show: true,
        },
      ],
    },
    {
      id: 'transporte',
      title: 'TRANSPORTE & FRED',
      icon: Compass,
      items: [
        {
          title: 'Torre de Controle Fred',
          path: '/tms/torre-controle-fred',
          badge: 'Fred IA',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Em Viagem & Rastreamento',
          path: '/tms/torre-controle-fred',
          badge: 'GPS Live',
          badgeColor: 'bg-emerald-600',
          show: true,
        },
        {
          title: 'Assistente Fred IA',
          path: '/tms/agente-fred',
          badge: 'Nativo',
          badgeColor: 'bg-sky-600',
          show: true,
        },
        {
          title: 'Análise Fred IA & SLAs',
          path: '/tms/fred-analises',
          badge: 'Gargalos',
          badgeColor: 'bg-amber-600',
          show: permissions.canViewFredControlTower || true,
        },
      ],
    },
    {
      id: 'analises',
      title: 'ANÁLISES',
      icon: BarChart3,
      items: [
        {
          title: 'Carteira Única de Vendas',
          path: '/tms/analises/carteira-vendas',
          badge: 'O que entregar',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Estoque & Produção',
          path: '/tms/analises/estoque-producao',
          badge: 'O que disponível',
          badgeColor: 'bg-sky-600',
          show: true,
        },
        {
          title: 'Ciclo de Inteligência Logística & Governança de Seleção',
          path: '/tms/analises/inteligencia-logistica',
          badge: 'Como transportar',
          badgeColor: 'bg-purple-700',
          show: true,
        },
        {
          title: 'Gestão de Performance',
          path: '/tms/analises/gestao-performance',
          badge: 'Como performa',
          badgeColor: 'bg-emerald-700',
          show: true,
        },
        {
          title: 'Custos & Rentabilidade',
          path: '/tms/rentabilidade-logistica',
          badge: 'Prev x Real',
          badgeColor: 'bg-emerald-700',
          show: permissions.canViewProfitability,
        },
        {
          title: 'Performance Expedição',
          path: '/tms/performance-expedicao',
          badge: 'SLAs',
          badgeColor: 'bg-[#005596]',
          show: permissions.canViewExpeditionPerformance,
        },
        {
          title: 'Anomalias & Tendências',
          path: '/tms/inteligencia-fretes',
          badge: 'IA',
          badgeColor: 'bg-amber-600',
          show: permissions.canViewFreightIntelligence,
        },
        {
          title: 'Histórico Motoristas/Veículos',
          path: '/tms/historico-motoristas-veiculos',
          badge: '360° & Alertas',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Dashboard de Prestadores',
          path: '/tms/analises/dashboard-prestadores',
          badge: 'Executivo',
          badgeColor: 'bg-sky-600',
          show: true,
        },
        {
          title: 'IA x Humano & Chicão',
          path: '/tms/mesa-fretes',
          badge: 'Supervisão',
          badgeColor: 'bg-sky-600',
          show: true,
        },
        {
          title: 'Relatório Geral Transporte',
          path: '/tms/relatorio-geral-transporte',
          badge: '43 Colunas',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
      ],
    },
    {
      id: 'configuracoes',
      title: 'CONFIGURAÇÕES',
      icon: Sliders,
      items: [
        {
          title: 'Sincronização SAP',
          path: '/tms/sincronizacao-sap',
          badge: 'RFC Online',
          badgeColor: 'bg-emerald-600',
          show:
            permissions.canSyncSapWallet ||
            role === 'admin_master' ||
            role === 'admin_tms' ||
            role === 'gestor_logistica',
        },
        {
          title: 'Integrações & Central',
          path: '/tms/monitor-integracoes',
          badge: 'Monitor',
          badgeColor: 'bg-[#005596]',
          show: true,
        },
        {
          title: 'Diagnóstico & Lotes QAS',
          path: '/tms/diagnostico',
          badge: 'Saúde',
          badgeColor: 'bg-emerald-600',
          show: true,
        },
        {
          title: 'Administração QAS (Reset)',
          path: '/tms/admin-qas',
          badge: 'Master',
          badgeColor: 'bg-rose-600',
          show: role === 'admin_master' || permissions.canManageSystemParameters,
        },
        {
          title: 'Regras de Negociação & Autonomia',
          path: '/tms/regras-autonomia',
          badge: 'Nível 1',
          badgeColor: 'bg-[#005596]',
          show: permissions.canManageCarlaoAutonomy || permissions.canManageSystemParameters,
        },
        {
          title: 'SLA da Expedição',
          path: '/tms/regras-autonomia',
          badge: 'Metas',
          badgeColor: 'bg-sky-600',
          show: permissions.canConfigureExpeditionSla || permissions.canManageSystemParameters,
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
          title: 'Auditoria & Compliance',
          path: '/tms/auditoria',
          show: permissions.canViewAuditLogs,
        },
        {
          title: 'Perfis e Permissões (RBAC)',
          path: '/tms/usuarios',
          show: role === 'admin_master' || role === 'admin_tms',
        },
        {
          title: 'Impressoras de Rede',
          path: '/tms/impressoras',
          badge: 'Spooler',
          badgeColor: 'bg-emerald-600',
          show: permissions.canViewPrinters,
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation Bar - CIAFAL Pantone 2945 Corporativo */}
      <header className="bg-[#005596] text-white border-b border-[#004275] sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand and Logo */}
          <div className="flex items-center space-x-4">
            <Link to="/tms/dashboard" className="flex items-center space-x-3 group">
              <div className="h-10 px-2.5 py-1 rounded-xl bg-white flex items-center justify-center shadow-sm border border-white/20">
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
                  <Badge className="bg-white/20 text-white text-[9px] font-bold px-1.5 py-0">
                    Pantone 2945
                  </Badge>
                </div>
                <span className="text-[10px] text-sky-200 font-bold uppercase tracking-wider">
                  TMS Logística Integrada
                </span>
              </div>
            </Link>

            <div className="hidden xl:flex items-center gap-1 pl-4 border-l border-white/20 text-xs">
              <div className="flex items-center gap-1.5 bg-white/15 text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/20">
                <span className="text-emerald-300">1. Disponibilidade</span>
                <span className="text-white/40">→</span>
                <span className="text-sky-200">2. Planejamento</span>
                <span className="text-white/40">→</span>
                <span className="text-amber-200">3. Mesa de Fretes</span>
                <span className="text-white/40">→</span>
                <span className="text-white">4. Execução</span>
              </div>
            </div>
          </div>

          {/* Quick Access to Driver Link and User Switcher */}
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-2 text-xs">
              <Link
                to="/tms/fila-publica"
                target="_blank"
                className="text-white hover:bg-white/20 bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/15 transition"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
                <span className="font-semibold">Link Público Motorista</span>
                <ExternalLink className="w-3 h-3 text-sky-200" />
              </Link>

              <Link
                to="/totem"
                target="_blank"
                className="text-white hover:bg-white/20 bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/15 transition"
              >
                <Building className="w-3.5 h-3.5 text-sky-200" />
                <span className="font-semibold">Totem PORTA</span>
                <ExternalLink className="w-3 h-3 text-sky-200" />
              </Link>

              <button
                type="button"
                onClick={() => setCollectorModalOpen(true)}
                className="text-white hover:bg-white/20 bg-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-emerald-400/40 transition cursor-pointer"
                title="Acessar Coletor de Expedição C72"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
                <span className="font-semibold">Coletor C72</span>
              </button>
            </div>

            {/* Role Simulation Switcher & User Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 text-left hover:bg-white/10 p-1.5 rounded-lg text-xs text-white"
                >
                  <Avatar className="h-8 w-8 border border-white/40">
                    <AvatarFallback className="bg-white text-[#005596] font-black text-xs">
                      {user?.name?.substring(0, 2).toUpperCase() || 'OP'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <div className="font-bold text-white truncate max-w-[130px]">
                      {user?.name || 'Operador'}
                    </div>
                    <div className="text-[10px] text-sky-200 font-medium">
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
                <DropdownMenuItem onClick={() => setSimulatedRole('expedidor')}>
                  📱 Expedidor (Coletor C72)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSimulatedRole('supervisor_expedicao')}>
                  📋 Supervisor de Expedição
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
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-5 flex-1 w-full flex flex-col md:flex-row gap-5 min-w-0">
        {/* Left Sidebar Navigation - Collapsible CIAFAL Menu */}
        <aside
          className={`w-full md:w-72 md:shrink-0 ${mobileMenuOpen ? 'block' : 'hidden md:block'}`}
        >
          <nav className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-sm space-y-2 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain">
            {/* Sidebar Branding Box */}
            <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 text-slate-900 flex items-center space-x-3 shadow-none">
              <div className="bg-white p-1 rounded-lg border border-slate-200 shrink-0">
                <img src={ciafalLogo} alt="CIAFAL" className="h-6 w-auto object-contain" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-[#005596] leading-tight truncate">
                  MESA DE FRETES
                </div>
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider truncate">
                  Motor Determinístico
                </div>
              </div>
            </div>

            {/* TORRE DE CONTROLE (HOME) Link */}
            <Link
              to="/tms/dashboard"
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                location.pathname === '/tms/dashboard' || location.pathname === '/'
                  ? 'bg-[#005596] text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <LayoutDashboard
                  className={`w-4 h-4 shrink-0 ${
                    location.pathname === '/tms/dashboard' || location.pathname === '/'
                      ? 'text-white'
                      : 'text-[#005596]'
                  }`}
                />
                <span className="truncate">TORRE DE CONTROLE</span>
              </div>
            </Link>

            {/* Grouped Accordion Menu */}
            {menuGroups.map((group) => {
              const Icon = group.icon
              const hasActiveChild = group.items.some((i) => location.pathname === i.path)
              const isOpen = openGroups[group.id] ?? hasActiveChild

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
                    <div className="flex items-center space-x-2 min-w-0">
                      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{group.title}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="mt-1 space-y-0.5 pl-1.5">
                      {group.items
                        .filter((item) => item.show !== false)
                        .map((item) => {
                          const isActive = location.pathname === item.path
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-all ${
                                isActive
                                  ? 'bg-[#005596] text-white shadow-sm font-semibold'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                            >
                              {item.icon && (
                                <item.icon
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isActive ? 'text-white' : 'text-slate-400'
                                  }`}
                                />
                              )}
                              <span className="truncate min-w-0 flex-1" title={item.title}>
                                {item.title}
                              </span>
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
                className="flex items-center justify-between px-2 py-1.5 rounded text-slate-600 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Link Fila (/tms/fila-publica)</span>
                </span>
                <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
              </Link>
              <Link
                to="/totem"
                target="_blank"
                className="flex items-center justify-between px-2 py-1.5 rounded text-slate-600 hover:bg-slate-50 hover:text-[#005596] transition-colors"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Building className="w-3.5 h-3.5 text-[#005596] shrink-0" />
                  <span className="truncate">Totem Portaria (/totem)</span>
                </span>
                <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>

      {/* Modal de Acesso ao Coletor */}
      <CollectorAccessModal open={collectorModalOpen} onOpenChange={setCollectorModalOpen} />

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
