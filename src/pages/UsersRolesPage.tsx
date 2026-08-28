import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole, getRoleLabel, ROLE_PERMISSIONS } from '@/domain/rules'
import { Layers, ShieldCheck, UserCheck, Key, Lock, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const UsersRolesPage: React.FC = () => {
  const { user, role, setSimulatedRole } = useAuth()
  const [usersList, setUsersList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const records = await pb.collection('users').getFullList({ sort: 'name' })
      setUsersList(records)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const rolesCatalog: UserRole[] = [
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Governança de Perfis e Permissões (RBAC)
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Reutilização da autenticação central do HUB (Active Directory/SSO). O perfil determina
            alçadas e mascaramento de dados sensíveis.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadUsers}
          className="text-xs text-slate-700 border-slate-300 gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Usuários
        </Button>
      </div>

      {/* MATRIZ DE PERFIS CORPORATIVOS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Matriz de Alçadas e Perfis Funcionais TMS</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {rolesCatalog.map((r) => {
            const perms = ROLE_PERMISSIONS[r]
            const isCurrent = role === r
            return (
              <div
                key={r}
                className={`p-3.5 rounded-lg border text-xs space-y-2 transition-all ${
                  isCurrent
                    ? 'border-[#005596] bg-sky-50/60 ring-2 ring-sky-300/40'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{getRoleLabel(r)}</span>
                  {isCurrent && (
                    <Badge className="bg-[#005596] text-white text-[9px] uppercase font-bold">
                      Ativo na Sessão
                    </Badge>
                  )}
                </div>

                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={
                        perms.canManageQueueStatus ? 'text-emerald-600 font-bold' : 'text-slate-400'
                      }
                    >
                      {perms.canManageQueueStatus ? '✓' : '✗'} Alterar Status da Fila
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={
                        perms.canBlockDriver ? 'text-rose-600 font-bold' : 'text-slate-400'
                      }
                    >
                      {perms.canBlockDriver ? '✓' : '✗'} Bloqueio Administrativo
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={perms.canImportSap ? 'text-sky-700 font-bold' : 'text-slate-400'}
                    >
                      {perms.canImportSap ? '✓' : '✗'} Executar Carga SAP
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={
                        perms.canViewAuditLogs ? 'text-purple-700 font-bold' : 'text-slate-400'
                      }
                    >
                      {perms.canViewAuditLogs ? '✓' : '✗'} Acesso a Trilha de Auditoria
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={
                        perms.canViewFullSensitiveData
                          ? 'text-emerald-700 font-bold'
                          : 'text-slate-500'
                      }
                    >
                      {perms.canViewFullSensitiveData
                        ? '🔓 Dados Desmascarados'
                        : '🔒 Dados Mascarados'}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={isCurrent ? 'default' : 'outline'}
                  onClick={() => setSimulatedRole(r)}
                  className={`w-full text-xs h-7 mt-2 ${
                    isCurrent ? 'bg-[#005596] text-white' : 'text-slate-700'
                  }`}
                >
                  {isCurrent ? 'Perfil em Uso' : 'Simular este Perfil'}
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      {/* USUÁRIOS CADASTRADOS NO POCKETBASE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800">
            Usuários Cadastrados no HUB (Sincronização AD/SSO)
          </h3>
          <span className="text-xs text-slate-500">{usersList.length} usuários</span>
        </div>

        <div className="divide-y divide-slate-200">
          {usersList.map((u) => (
            <div
              key={u.id}
              className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-slate-900">{u.name || 'Usuário Sem Nome'}</div>
                <div className="text-slate-500 font-mono">{u.email}</div>
              </div>

              <div className="flex items-center space-x-3">
                <Badge className="bg-slate-800 text-white font-normal text-[10px]">
                  {getRoleLabel(u.role || 'operador_logistica')}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
