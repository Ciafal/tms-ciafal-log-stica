import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Sliders, ShieldCheck, Plus, Trash2, CheckCircle2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

export const SystemParametersPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [params, setParams] = useState<any[]>([])
  const [ips, setIps] = useState<any[]>([])
  const [newIp, setNewIp] = useState('')
  const [newIpDesc, setNewIpDesc] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const p = await pb.collection('system_parameters').getFullList({ sort: 'key' })
      const w = await pb.collection('whitelist_ips').getFullList({ sort: '-created' })
      setParams(p)
      setIps(w)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newIp.trim()) return

    try {
      await pb.collection('whitelist_ips').create({
        ip: newIp.trim(),
        description: newIpDesc.trim() || 'Cadastrado manualmente',
        is_active: true,
      })

      // Audit log
      await pb.collection('audit_logs').create({
        user_email: user?.email || 'admin@ciafal.com.br',
        user_name: user?.name || 'Administrador',
        user_role: 'admin_master',
        action: 'ADD_WHITELIST_IP',
        resource: 'whitelist_ips',
        new_state: newIp.trim(),
        reason: newIpDesc || 'Inclusão de IP autorizado para Totem Portaria',
      })

      toast({
        title: 'IP Autorizado',
        description: `O endereço ${newIp.trim()} foi incluído na allowlist da portaria.`,
      })
      setNewIp('')
      setNewIpDesc('')
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao adicionar IP',
        description: err?.message,
        variant: 'destructive',
      })
    }
  }

  const handleDeleteIp = async (id: string, ipStr: string) => {
    try {
      await pb.collection('whitelist_ips').delete(id)

      await pb.collection('audit_logs').create({
        user_email: user?.email || 'admin@ciafal.com.br',
        user_name: user?.name || 'Administrador',
        user_role: 'admin_master',
        action: 'REMOVE_WHITELIST_IP',
        resource: 'whitelist_ips',
        previous_state: ipStr,
        reason: 'Remoção de IP da allowlist da portaria',
      })

      toast({
        title: 'IP Removido',
        description: `O IP ${ipStr} foi excluído da allowlist.`,
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao remover',
        description: err?.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Parâmetros do Sistema & Allowlist de Rede
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configurações globais de geofencing (60 km), coordenadas da planta CIAFAL e controle
            Fail-Closed do Totem da Portaria.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="text-xs text-slate-700 border-slate-300 gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Parâmetros
        </Button>
      </div>

      {/* ALLOWLIST DE REDE DO TOTEM PORTARIA */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Allowlist de IPs / Redes Autorizadas (Totem Portaria)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              <strong>Política Fail-Closed:</strong> Se nenhuma rede for cadastrada ou a requisição
              vier de IP desconhecido, o acesso ao Totem é bloqueado.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddIp} className="flex flex-col sm:flex-row gap-2.5">
          <Input
            placeholder="IP (Ex: 192.168.1.100 ou 10.0.0.0)"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            className="text-xs h-9 sm:w-60"
            required
          />
          <Input
            placeholder="Descrição (Ex: Totem Portaria Balança 03)"
            value={newIpDesc}
            onChange={(e) => setNewIpDesc(e.target.value)}
            className="text-xs h-9 flex-1"
          />
          <Button
            type="submit"
            className="text-xs h-9 bg-[#005596] hover:bg-[#004071] text-white font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Adicionar IP
          </Button>
        </form>

        <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
          {ips.map((item) => (
            <div
              key={item.id}
              className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-mono font-bold text-slate-900">{item.ip}</span>
                <span className="text-slate-500">({item.description})</span>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteIp(item.id, item.ip)}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* PARÂMETROS GERAIS DO TMS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Parâmetros Operacionais Globais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {params.map((p) => (
            <div
              key={p.id}
              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1 text-xs"
            >
              <div className="font-mono font-bold text-[#005596] text-[11px]">{p.key}</div>
              <div className="font-bold text-slate-900 text-sm">{p.value}</div>
              <p className="text-[11px] text-slate-500">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
