import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { TmsService } from '@/services/tmsService'
import {
  Users,
  Building,
  Smartphone,
  Truck,
  Database,
  ShieldCheck,
  Activity,
  ArrowRight,
  UserPlus,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Bot,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const TmsDashboard: React.FC = () => {
  const { user, role } = useAuth()
  const [stats, setStats] = useState({
    portaCount: 0,
    foraCount: 0,
    totalDisponiveis: 0,
    pendentesPre: 0,
    totalDrivers: 0,
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const queue = await TmsService.getOperationalQueue()
        const pre = await TmsService.getPreRegistrations()
        const drivers = await pb.collection('drivers').getList(1, 1)

        setStats({
          portaCount: queue.filter((q) => q.type === 'PORTA' && q.status !== 'removido').length,
          foraCount: queue.filter((q) => q.type === 'FORA' && q.status !== 'removido').length,
          totalDisponiveis: queue.filter((q) => q.status === 'disponivel').length,
          pendentesPre: pre.filter((p) => p.status === 'pendente').length,
          totalDrivers: drivers.totalItems,
        })
      } catch (err) {
        console.error(err)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* BANNER INSTITUCIONAL CIAFAL */}
      <div className="bg-gradient-to-r from-[#005596] to-[#003866] text-white p-6 rounded-2xl shadow-md border border-[#004071] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <Badge className="bg-sky-400/20 text-sky-200 border-sky-400/40 text-xs uppercase tracking-wider font-semibold">
            Módulo Corporativo Ativo
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            TMS CIAFAL — Logística & Transporte
          </h1>
          <p className="text-sm text-sky-100/90 leading-relaxed">
            Plataforma corporativa de gestão de pátio, orquestração logística e fila operacional de
            motoristas, integrada ao ecossistema do <strong>HUB CIAFAL</strong>.
          </p>
          <div className="pt-2 flex flex-wrap gap-2 text-xs text-sky-200">
            <span className="bg-black/20 px-2.5 py-1 rounded-md border border-sky-400/20 font-mono">
              Planta Central: -23.5186, -46.7865
            </span>
            <span className="bg-black/20 px-2.5 py-1 rounded-md border border-sky-400/20 font-mono">
              Raio Externo: 60 km
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/tms/fila">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-white text-[#005596] hover:bg-sky-50 font-bold shadow-md"
            >
              <Users className="w-4 h-4 mr-2 text-[#005596]" />
              Abrir Fila de Motoristas
            </Button>
          </Link>
          <Link to="/tms/importacao">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto bg-sky-900/40 hover:bg-sky-900/60 text-white border-sky-400/40 text-xs"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-400" />
              Carga SAP ZSD004V_V2
            </Button>
          </Link>
        </div>
      </div>

      {/* CARDS DE RESUMO OPERACIONAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-sky-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-sky-800">PORTA (Na CIAFAL)</span>
              <div className="text-3xl font-black text-[#005596] mt-1">{stats.portaCount}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Veículos no pátio físico</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-[#005596] flex items-center justify-center">
              <Building className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-emerald-800">FORA (Na Região)</span>
              <div className="text-3xl font-black text-emerald-700 mt-1">{stats.foraCount}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Disponíveis em até 60 km</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-amber-800">Pré-Cadastros</span>
              <div className="text-3xl font-black text-amber-600 mt-1">{stats.pendentesPre}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Aguardando conferência</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <UserPlus className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-slate-600">Base SAP Ativa</span>
              <div className="text-3xl font-black text-slate-800 mt-1">{stats.totalDrivers}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Motoristas sincronizados</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QUICK LINKS & MODULE STATUS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* OPERAÇÃO ATIVA */}
        <Card className="border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader className="p-5 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-[#005596]" />
              <span>Módulos e Fluxos Operacionais em Execução</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Acesso rápido aos fluxos do pátio e administração de cadastros.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <Link
              to="/tms/fila"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-[#005596] text-white flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-[#005596]">
                    Fila de Motoristas (Painéis Segregados)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Controle operacional em tempo real dos grupos PORTA e FORA.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#005596] group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/tms/totem"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-[#005596]">
                    Totem da Portaria (Check-in PORTA)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Interface touch para registro de presença física com IP restrito.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#005596] group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/tms/checkin"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700">
                    Check-in Externo (Link FORA com Geofencing 60km)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Página mobile para motoristas informarem disponibilidade na região.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all" />
            </Link>
          </CardContent>
        </Card>

        {/* STATUS DAS INTEGRAÇÕES E AGENTES */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-5 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Saúde do TMS & Integrações</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-800">Motor de Regras Fila</span>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px]">OPERACIONAL</Badge>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-800">Fail-Closed Allowlist</span>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px]">ATIVO</Badge>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-semibold text-slate-800">SAP ZSD004V_V2</span>
              </div>
              <Badge variant="outline" className="text-amber-700 border-amber-400 text-[10px]">
                CARGA MANUAL
              </Badge>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="font-semibold text-slate-800">Agente IA Chicão</span>
              </div>
              <Badge variant="secondary" className="text-purple-700 text-[10px]">
                EM DESENV.
              </Badge>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="font-semibold text-slate-800">Agente IA Fred</span>
              </div>
              <Badge variant="secondary" className="text-purple-700 text-[10px]">
                EM DESENV.
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
