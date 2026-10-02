import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CollectorPage } from '@/pages/CollectorPage'
import pb from '@/lib/pocketbase/client'
import { sapCollectorService } from '@/services/sapCollectorService'
import ciafalLogo from '@/assets/logo-ciafal-0e4b2.png'
import { LogOut, ShieldCheck, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Componente de Modo Coletor Direto (/coletor).
 * Requisitos estritos do usuário:
 * - Mesma aplicação, mesmos componentes, backend, APIs, regras SAP, dados, estados e auditoria de CollectorPage
 * - NÃO mostra menu lateral do TMS, nem módulos irrelevantes (Mesa, Torre, etc.)
 * - Cabeçalho compacto: logo CIAFAL, "Coletor de Expedição", status SAP ("🟡 Ambiente SAP não conectado" ou "🟢 SAP conectado"),
 *   usuário (nome/matrícula) e botão pequeno "Sair"
 * - Interface 100% largura mobile-first sem scroll horizontal
 * - Auditoria de acesso registrada no backend (sem credenciais)
 */
export const StandaloneCollectorPage: React.FC = () => {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const [sapConnected, setSapConnected] = useState(false)
  const [operatorMatricula, setOperatorMatricula] = useState('EXP-1044')
  const [operatorPlant, setOperatorPlant] = useState('WSTL')

  // 1. Validar e consultar status SAP inicial
  useEffect(() => {
    let mounted = true
    async function checkSap() {
      try {
        const op = await sapCollectorService.validateOperator()
        if (mounted) {
          setSapConnected(op.sapConnected)
          if (op.matricula) setOperatorMatricula(op.matricula)
          if (op.plant) setOperatorPlant(op.plant)
        }
      } catch {
        if (mounted) setSapConnected(false)
      }
    }
    checkSap()
    return () => {
      mounted = false
    }
  }, [])

  // 2. Trilha de Auditoria Obrigatória do Acesso Direto C72
  useEffect(() => {
    let auditLogged = false
    async function logDirectAccess() {
      if (auditLogged) return
      auditLogged = true

      try {
        const sessionId = `C72-SESS-${Date.now().toString(36).toUpperCase()}`
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Desconhecido'
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 0
        const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 0

        // Registrar em audit_logs sem credenciais, respeitando a política LGPD do projeto
        await pb.collection('audit_logs').create({
          user_email: user?.email || 'coletor@ciafal.com.br',
          user_name: user?.name || 'Operador Expedição',
          user_role: role || 'expedidor',
          action: 'ACCESS_COLLECTOR_DIRECT',
          resource: 'collector_c72',
          resource_id: operatorMatricula,
          new_state: 'sessao_iniciada',
          reason: 'Acesso direto via rota dedicada C72 /coletor',
          correlation_id: sessionId,
          payload: {
            mode: 'C72_STANDALONE',
            matricula: operatorMatricula,
            plant: operatorPlant,
            device: userAgent.slice(0, 160),
            resolution: `${screenWidth}x${screenHeight}`,
            started_at: new Date().toISOString(),
          },
        })
      } catch (err) {
        // Falha não-bloqueante na persistência de auditoria
        console.warn('Registro de auditoria de acesso direto C72:', err)
      }
    }

    logDirectAccess()
  }, [user, role, operatorMatricula, operatorPlant])

  const handleLogout = () => {
    logout()
    navigate('/tms/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col w-full overflow-x-hidden">
      {/* Cabeçalho Compacto Exclusivo Modo Coletor C72 */}
      <header className="sticky top-0 z-40 bg-[#005596] text-white shadow-md border-b border-white/10 px-3 sm:px-4 py-2.5">
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Logo CIAFAL + Identificação */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-white p-1 rounded-lg shrink-0 shadow-sm">
              <img src={ciafalLogo} alt="CIAFAL" className="h-6 sm:h-7 w-auto object-contain" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-black tracking-tight leading-tight uppercase truncate">
                Coletor de Expedição
              </div>
              <div className="text-[10px] text-sky-200 font-bold truncate flex items-center gap-1.5">
                <span>Transação SAP ZWMT001</span>
                <span className="hidden sm:inline">• Terminal C72</span>
              </div>
            </div>
          </div>

          {/* Status SAP + Operador + Botão Sair */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Status Conexão SAP */}
            <div
              className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1.5 border shadow-xs ${
                sapConnected
                  ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40'
                  : 'bg-amber-500/20 text-amber-100 border-amber-400/40'
              }`}
              title={
                sapConnected
                  ? 'SAP ECC 6.0 Conectado via RFC'
                  : 'Ambiente SAP não conectado (RFC pendente de homologação)'
              }
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  sapConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="hidden sm:inline font-black">
                {sapConnected ? 'SAP conectado' : 'Ambiente SAP não conectado'}
              </span>
              <span className="sm:hidden font-black">{sapConnected ? 'SAP ON' : 'SAP OFF'}</span>
            </div>

            {/* Operador (Nome/Matrícula) */}
            <div className="hidden md:flex flex-col text-right leading-tight max-w-[140px]">
              <span className="text-xs font-bold text-white truncate">
                {user?.name || 'Operador'}
              </span>
              <span className="text-[10px] text-sky-200 font-mono">
                Matrícula {operatorMatricula}
              </span>
            </div>

            {/* Botão Sair */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleLogout}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8 px-2.5 text-xs font-bold gap-1 rounded-lg"
              title="Encerrar sessão no coletor"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Faixa Compacta de Operador para Telas Pequenas (C72 / Smartphone) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-3 py-1.5 text-[11px] text-slate-700">
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-bold text-slate-900 truncate">
              {user?.name || 'Operador Expedição'}
            </span>
            <span className="text-slate-400">•</span>
            <span className="font-mono text-slate-600 font-bold shrink-0">{operatorMatricula}</span>
          </div>
          <div className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 shrink-0">
            Centro {operatorPlant}
          </div>
        </div>
      </div>

      {/* Conteúdo Principal — Mesma CollectorPage Integral */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-2 sm:p-4 min-w-0">
        <CollectorPage />
      </main>

      {/* Rodapé Compacto Modo C72 */}
      <footer className="bg-slate-200/80 border-t border-slate-300 py-2 px-3 text-center text-[10px] text-slate-600">
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-3 h-3 text-[#005596]" />
            <span>CIAFAL Logística • Modo Coletor</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Wifi className="w-3 h-3 text-slate-400" />
            <span>Terminal HID C72</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default StandaloneCollectorPage
