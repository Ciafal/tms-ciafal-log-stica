import React, { useState, useEffect } from 'react'
import {
  Sliders,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  HelpCircle,
  FileSpreadsheet,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import { ZSD35_OFFICIAL_FIELDS } from '@/domain/zsd35ImportEngine'

const DEFAULT_SAP_COLUMN_MAP: Record<string, string> = {
  'Q.Dias': 'Q.Dias',
  Gerar: 'Gerar',
  Status: 'Status',
  Inco: 'Inco',
  'Documento de vendas': 'Documento de vendas',
  Região: 'Região',
  Cidade: 'Cidade',
  'Qtde Real': 'Qtde Real',
  'Qtde.Amar.': 'Qtde.Amar.',
  'Est. Sider': 'Est. Sider',
  'Texto breve de material': 'Texto breve de material',
  'Valor do Frete': 'Valor do Frete',
  'Recebedor Merc': 'Recebedor Merc',
  'Limite de Crédito': 'Limite de Crédito',
  'Emissor da ordem': 'Emissor da ordem',
  'Compromisso especial': 'Compromisso especial',
  'Condição de Pagament': 'Condição de Pagament',
  'Motivo Estoque': 'Motivo Estoque',
  'Qtde.Estoque': 'Qtde.Estoque',
  Saldo: 'Saldo',
  'Data do Pedido': 'Data do Pedido',
  'Hora do Pedido': 'Hora do Pedido',
  'Quantidade da ordem': 'Quantidade da ordem',
  'Data Remessa(Semana)': 'Data Remessa(Semana)',
  Itinerário: 'Itinerário',
  'Motivo Crédito': 'Motivo Crédito',
  'Total a Receber': 'Total a Receber',
  'Estoque Total': 'Estoque Total',
}

const FIELD_DESCRIPTIONS: Record<string, string> = {
  'Q.Dias': 'Dias de permanência do pedido na carteira desde a colocação',
  Gerar: 'Indicador de geração / liberação de remessa',
  Status: 'Status geral do documento no SAP',
  Inco: 'Incoterms comercial (CIF, FOB, etc.)',
  'Documento de vendas': 'Número da Ordem de Vendas SAP (VBELN) - Chave Primária',
  Região: 'UF de destino da mercadoria (SP, MG, AL, BA, CE, etc.)',
  Cidade: 'Município de destino do cliente',
  'Qtde Real': 'Peso / Quantidade real do item em toneladas (ou kg)',
  'Qtde.Amar.': 'Quantidade de amarrações / pacotes',
  'Est. Sider': 'Estoque disponível na filial Sidercentro / Siderúrgica',
  'Texto breve de material': 'Descrição do perfil/barra ou código do material',
  'Valor do Frete': 'Valor do frete calculado ou negociado por tonelada',
  'Recebedor Merc': 'Razão social ou código do cliente destinatário',
  'Limite de Crédito': 'Limite de crédito atual do cliente ou saldo financeiro',
  'Emissor da ordem': 'Código do cliente comprador (KUNNR)',
  'Compromisso especial': 'Condição especial de entrega ou compromisso contratual',
  'Condição de Pagament': 'Prazo e condição de pagamento comercial',
  'Motivo Estoque': 'Status de disponibilidade física no WMS/PCP',
  'Qtde.Estoque': 'Quantidade física encontrada em estoque',
  Saldo: 'Saldo pendente a faturar do pedido',
  'Data do Pedido': 'Data de criação da ordem no SAP (YYYY-MM-DD)',
  'Hora do Pedido': 'Hora de registro no sistema',
  'Quantidade da ordem': 'Volume original contratado no pedido',
  'Data Remessa(Semana)': 'Semana e ano previstos para remessa (ex: 34.2026)',
  Itinerário: 'Código de rota/itinerário logístico SAP (ex: AL001C, SP001A)',
  'Motivo Crédito': 'Justificativa ou bloqueio de crédito financeiro',
  'Total a Receber': 'Valor financeiro total do pedido em R$',
  'Estoque Total': 'Saldo consolidado de estoque em todas as plantas CIAFAL',
}

export const Zsd35MappingAdminPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [mappingName, setMappingName] = useState('Mapeamento Padrão SAP ZSD35 CIAFAL')
  const [mappings, setMappings] = useState<Record<string, string>>({ ...DEFAULT_SAP_COLUMN_MAP })
  const [isSaving, setIsSaving] = useState(false)
  const [existingProfiles, setExistingProfiles] = useState<any[]>([])

  useEffect(() => {
    loadMappingProfiles()
  }, [])

  const loadMappingProfiles = async () => {
    try {
      const list = await TmsService.getZsd35ColumnMappings()
      setExistingProfiles(list)
      if (list.length > 0) {
        const defaultMap = list.find((m) => m.is_default) || list[0]
        if (defaultMap?.mappings_json) {
          setMappings(defaultMap.mappings_json)
          setMappingName(defaultMap.profile_name || 'Mapeamento ZSD35')
        }
      }
    } catch {
      /* fallback */
    }
  }

  const handleFieldChange = (stdField: string, userColName: string) => {
    setMappings((prev) => ({
      ...prev,
      [stdField]: userColName,
    }))
  }

  const handleResetToDefault = () => {
    setMappings({ ...DEFAULT_SAP_COLUMN_MAP })
    toast({
      title: 'Mapeamento Restaurado',
      description: 'Todos os 28 campos foram restaurados para a nomenclatura padrão do SAP ZSD35.',
    })
  }

  const handleSaveMapping = async () => {
    if (!permissions.canManageZsd35Mapping && !permissions.canManageSystemParameters) {
      toast({
        title: 'Acesso Negado',
        description: 'Seu usuário não possui permissão para gerenciar mapeamentos ZSD35.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      await TmsService.saveZsd35ColumnMapping({
        profile_name: mappingName,
        mappings_json: mappings,
        is_default: true,
      })

      // Log de Auditoria
      await TmsService.logAudit({
        user_name: user?.name || 'Administrador TMS',
        user_email: user?.email || 'admin@ciafal.com.br',
        user_role: user?.role || 'admin_master',
        action: 'ZSD35_MAPPING_UPDATED',
        resource: 'zsd35_column_mappings',
        resource_id: mappingName,
        details: {
          profile_name: mappingName,
          fields_mapped: Object.keys(mappings).length,
          timestamp: new Date().toISOString(),
        },
      })

      toast({
        title: 'Mapeamento ZSD35 Salvo com Sucesso',
        description: 'As regras de associação de colunas da planilha foram atualizadas no sistema.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar mapeamento',
        description: err?.message || 'Falha ao gravar no banco.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const canEdit = permissions.canManageZsd35Mapping || permissions.canManageSystemParameters

  return (
    <div className="space-y-4">
      {/* Header com Identidade CIAFAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Administração — Mapeamento de Colunas ZSD35
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              SPRINT 6 / ITEM 4
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Configure a correspondência entre os cabeçalhos da planilha Excel/CSV exportada do SAP e
            os 28 campos oficiais do TMS CIAFAL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleResetToDefault}
            variant="outline"
            size="sm"
            className="text-xs h-8 border-slate-300"
            disabled={!canEdit}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
            Restaurar Padrão SAP
          </Button>
          <Button
            onClick={handleSaveMapping}
            disabled={isSaving || !canEdit}
            size="sm"
            className="bg-[#005596] hover:bg-sky-800 text-white text-xs h-8"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {isSaving ? 'Salvando...' : 'Salvar Mapeamento'}
          </Button>
        </div>
      </div>

      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-2 text-amber-800 text-xs">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>
            Modo somente leitura. Apenas administradores e gestores de logística podem alterar o
            mapeamento ZSD35.
          </span>
        </div>
      )}

      {/* Configuração do Perfil */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="max-w-md space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Nome do Perfil de Mapeamento:
            </label>
            <Input
              value={mappingName}
              onChange={(e) => setMappingName(e.target.value)}
              className="h-8 text-xs"
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela dos 28 Campos Oficiais */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span>Correspondência dos 28 Campos do Relatório ZSD35</span>
            <Badge variant="outline" className="text-xs font-mono">
              28 / 28 Campos Mapeados
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Se a planilha de seu departamento contiver títulos de coluna ligeiramente diferentes
            (ex: "Pedido" em vez de "Documento de vendas"), altere o campo correspondente abaixo.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3 w-64">Campo Oficial TMS CIAFAL</th>
                <th className="p-3 w-72">Cabeçalho no Arquivo Excel / CSV</th>
                <th className="p-3">Descrição & Função no TMS</th>
                <th className="p-3 text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {ZSD35_OFFICIAL_FIELDS.map((stdField, index) => {
                const mappedVal = mappings[stdField] || ''
                const isCustom = mappedVal !== stdField

                return (
                  <tr key={stdField} className="hover:bg-sky-50/30 transition-colors">
                    <td className="p-3 text-center font-mono text-slate-400 font-bold">
                      {index + 1}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#005596]" />
                        <span>{stdField}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Input
                        value={mappedVal}
                        onChange={(e) => handleFieldChange(stdField, e.target.value)}
                        placeholder={stdField}
                        disabled={!canEdit}
                        className={`h-7 text-xs font-mono ${
                          isCustom
                            ? 'border-sky-500 bg-sky-50/50 font-bold text-[#005596]'
                            : 'border-slate-300'
                        }`}
                      />
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {FIELD_DESCRIPTIONS[stdField] || 'Campo oficial da transação ZSD35.'}
                    </td>
                    <td className="p-3 text-center">
                      {mappedVal.trim() ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px]">
                          OK
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[9px]">
                          Vazio
                        </Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

export default Zsd35MappingAdminPage
