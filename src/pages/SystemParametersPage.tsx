import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { TmsService } from '@/services/tmsService'
import { SystemParameterEntity } from '@/domain/rules'
import {
  Sliders,
  Save,
  RefreshCw,
  ShieldAlert,
  MapPin,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

export const SystemParametersPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [parameters, setParameters] = useState<SystemParameterEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingParams, setEditingParams] = useState<
    Record<string, { value: string; description: string }>
  >({})
  const [isSaving, setIsSaving] = useState(false)

  const loadParams = async () => {
    setIsLoading(true)
    try {
      const data = await TmsService.getSystemParameters()
      setParameters(data)
      const mapped: Record<string, { value: string; description: string }> = {}
      data.forEach((p) => {
        mapped[p.key] = { value: p.value, description: p.description || '' }
      })
      setEditingParams(mapped)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadParams()
  }, [])

  const handleInputChange = (key: string, field: 'value' | 'description', val: string) => {
    setEditingParams((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: val,
      },
    }))
  }

  const handleSaveParam = async (param: SystemParameterEntity) => {
    if (!permissions.canManageSystemParameters) {
      toast({
        title: 'Acesso Negado',
        description: 'Você não possui permissão RBAC para alterar parâmetros da planta.',
        variant: 'destructive',
      })
      return
    }

    const currentEdit = editingParams[param.key]
    if (!currentEdit || !currentEdit.value.trim()) {
      toast({
        title: 'Valor obrigatório',
        description: 'O valor do parâmetro não pode ser vazio.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const ok = await TmsService.updateSystemParameter(
        param.id,
        param.key,
        currentEdit.value,
        currentEdit.description,
        user?.email || 'admin@ciafal.com.br',
        user?.name || 'Administrador TMS',
      )

      if (ok) {
        toast({
          title: 'Parâmetro salvo com sucesso',
          description: `${param.key} atualizado. Evento registrado na trilha de auditoria.`,
        })
        loadParams()
      } else {
        toast({
          title: 'Erro ao salvar',
          description: 'Não foi possível salvar o parâmetro.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao salvar.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Parâmetros Operacionais da Planta
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Administração Central</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Controle dinâmico de coordenadas, raios de geofence, tolerância de GPS e tempos de
            permanência.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadParams}
          disabled={isLoading}
          className="text-xs border-slate-300 gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Recarregar Parâmetros
        </Button>
      </div>

      {/* Regra de Hardening: Sem Parâmetros Hardcoded */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-900 flex items-start space-x-3 shadow-sm">
        <Info className="w-5 h-5 text-sky-700 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-sky-950 block text-sm">
            REGRA DE ARQUITETURA — COORDENADAS & REGRAS DINÂMICAS:
          </strong>
          Nenhuma coordenada geográfica, raio de alcance ou tempo de permanência permanece fixo no
          código. Toda e qualquer alteração realizada nesta tela recalcula as validações no backend
          e gera registro imutável de auditoria.
        </div>
      </div>

      {!permissions.canManageSystemParameters && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 flex items-center space-x-3">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>
            Seu perfil atual ({user?.role}) possui acesso somente-leitura aos parâmetros
            operacionais.
          </span>
        </div>
      )}

      {/* Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parameters.map((param) => {
          const edit = editingParams[param.key] || {
            value: param.value,
            description: param.description,
          }
          return (
            <Card key={param.id} className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="font-mono font-bold text-xs text-[#005596]">{param.key}</div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    ID: {param.id.substring(0, 8)}...
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 pt-1">
                  {param.description || 'Parâmetro de configuração do sistema'}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-[11px] uppercase">
                    Valor Operacional Ativo:
                  </label>
                  <Input
                    value={edit.value}
                    disabled={!permissions.canManageSystemParameters}
                    onChange={(e) => handleInputChange(param.key, 'value', e.target.value)}
                    className="font-mono text-xs h-9 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-[11px] uppercase">
                    Descrição / Finalidade:
                  </label>
                  <Input
                    value={edit.description}
                    disabled={!permissions.canManageSystemParameters}
                    onChange={(e) => handleInputChange(param.key, 'description', e.target.value)}
                    className="text-xs h-8 bg-white text-slate-600"
                  />
                </div>

                {permissions.canManageSystemParameters && (
                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveParam(param)}
                      disabled={isSaving}
                      className="text-xs bg-[#005596] hover:bg-[#004071] text-white font-semibold gap-1.5 h-8"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Salvar & Auditar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
