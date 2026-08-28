import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { TmsService } from '@/services/tmsService'
import {
  PreRegistrationEntity,
  PreRegistrationStatus,
  maskDocument,
  maskPhone,
  formatDocument,
  formatPhone,
} from '@/domain/rules'
import {
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  Smartphone,
  Phone,
  Truck,
  ShieldCheck,
  AlertCircle,
  FileText,
  Send,
  MessageSquare,
  ArrowRight,
  Eye,
  RefreshCw,
  FolderPlus,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

// Defined Kanban columns for Sprint 1.1
const KANBAN_STAGES: { id: PreRegistrationStatus; label: string; color: string; bg: string }[] = [
  { id: 'novo', label: '1. Novo', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
  {
    id: 'em_analise',
    label: '2. Em Análise',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
  },
  {
    id: 'contato_realizado',
    label: '3. Contato Feito',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50 border-indigo-200',
  },
  {
    id: 'aguardando_doc',
    label: '4. Aguardando Doc',
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
  },
  {
    id: 'encaminhado_sap',
    label: '5. Encaminhado SAP',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
  },
  {
    id: 'cadastro_confirmado',
    label: '6. Cadastro Confirmado',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  {
    id: 'rejeitado',
    label: '7. Rejeitado',
    color: 'text-rose-700',
    bg: 'bg-rose-50 border-rose-200',
  },
]

export const PreRegistrationsPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [items, setItems] = useState<PreRegistrationEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterOrigin, setFilterOrigin] = useState<string>('todos')

  // Review Modal State
  const [selectedItem, setSelectedItem] = useState<PreRegistrationEntity | null>(null)
  const [targetStatus, setTargetStatus] = useState<PreRegistrationStatus>('em_analise')
  const [reviewerNotes, setReviewerNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const data = await TmsService.getPreRegistrations()
      setItems(data)
    } catch (err) {
      console.error(err)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('pre_registrations', () => {
    loadData(true)
  })

  // Normalize legacy status
  const normalizedItems = useMemo(() => {
    return items.map((item) => {
      let status = item.status
      if ((status as string) === 'pendente') status = 'novo'
      if ((status as string) === 'aprovado') status = 'cadastro_confirmado'
      return { ...item, status }
    })
  }, [items])

  // Filtered items
  const filteredItems = useMemo(() => {
    return normalizedItems.filter((item) => {
      if (filterOrigin !== 'todos' && item.origin !== filterOrigin) return false

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const doc = (item.document || '').toLowerCase()
        const name = (item.name || '').toLowerCase()
        const phone = (item.whatsapp || '').toLowerCase()
        const plate = (item.plate || '').toLowerCase()
        return (
          doc.includes(term) || name.includes(term) || phone.includes(term) || plate.includes(term)
        )
      }
      return true
    })
  }, [normalizedItems, filterOrigin, searchTerm])

  const handleOpenReview = (item: PreRegistrationEntity) => {
    setSelectedItem(item)
    setTargetStatus(item.status)
    setReviewerNotes(item.reviewer_notes || '')
    setRejectionReason(item.rejection_reason || '')
  }

  const handleSaveReview = async () => {
    if (!selectedItem) return

    if (targetStatus === 'rejeitado' && !rejectionReason.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe o motivo da rejeição do pré-cadastro.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const ok = await TmsService.updatePreRegistrationStatus(
        selectedItem.id,
        targetStatus,
        user?.email || 'operador@ciafal.com.br',
        reviewerNotes,
        rejectionReason,
      )

      if (ok) {
        toast({
          title: 'Status atualizado com sucesso',
          description: `Pré-cadastro avançado para ${targetStatus.toUpperCase()}. Trilha auditada.`,
        })
        setSelectedItem(null)
        loadData(true)
      } else {
        toast({
          title: 'Falha ao atualizar',
          description: 'Não foi possível salvar a alteração.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha na comunicação.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <UserCheck className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Painel de Triagem de Pré-Cadastros
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Kanban Operacional</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gestão de motoristas sem cadastro SAP ativo que tentaram entrada no Totem ou Check-in
            Externo.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Tabs value={viewMode} onValueChange={(val: any) => setViewMode(val)} className="w-auto">
            <TabsList className="grid grid-cols-2 h-9">
              <TabsTrigger value="kanban" className="text-xs">
                Kanban
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs">
                Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(false)}
            disabled={isLoading}
            className="text-xs border-slate-300 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Regra Fundamental de Proteção */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 flex items-start space-x-3 shadow-sm">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-amber-950 block text-sm">
            REGRA DE COMPLIANCE OPERACIONAL:
          </strong>
          Motoristas em estado de pré-cadastro (mesmo em análise){' '}
          <strong>NÃO PODEM RECEBER OFERTAS DE CARGA</strong>. Apenas após a confirmação do cadastro
          definitivo no SAP e promoção na fila o motorista se torna apto.
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, documento, telefone ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9 bg-slate-50"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select value={filterOrigin} onValueChange={setFilterOrigin}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as Origens</SelectItem>
              <SelectItem value="PORTA">Origem PORTA (Totem)</SelectItem>
              <SelectItem value="FORA">Origem FORA (Link Externo)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 overflow-x-auto pb-4">
          {KANBAN_STAGES.map((stage) => {
            const stageItems = filteredItems.filter((i) => i.status === stage.id)
            return (
              <div
                key={stage.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/60 min-w-[240px] flex-1 shadow-sm"
              >
                {/* Stage Header */}
                <div
                  className={`p-3 border-b rounded-t-xl ${stage.bg} flex items-center justify-between`}
                >
                  <div className="font-bold text-xs truncate">
                    <span className={stage.color}>{stage.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {stageItems.length}
                  </Badge>
                </div>

                {/* Stage Body */}
                <div className="p-2 space-y-2 flex-1 min-h-[350px]">
                  {stageItems.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-slate-400 italic">Vazio</div>
                  ) : (
                    stageItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleOpenReview(item)}
                        className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-sky-500 cursor-pointer transition-all space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <Badge
                            className={`text-[9px] font-bold ${
                              item.origin === 'PORTA'
                                ? 'bg-[#005596] text-white'
                                : 'bg-emerald-700 text-white'
                            }`}
                          >
                            {item.origin}
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.created ? new Date(item.created).toLocaleDateString('pt-BR') : ''}
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 truncate">{item.name}</div>

                        <div className="text-[11px] text-slate-600 font-mono space-y-0.5">
                          <div>
                            Doc:{' '}
                            <strong>
                              {permissions.canViewFullSensitiveData
                                ? formatDocument(item.document)
                                : maskDocument(item.document)}
                            </strong>
                          </div>
                          <div>
                            Tel:{' '}
                            <strong>
                              {permissions.canViewFullSensitiveData
                                ? formatPhone(item.whatsapp)
                                : maskPhone(item.whatsapp)}
                            </strong>
                          </div>
                          <div>
                            Placa: <strong className="text-slate-900">{item.plate || '---'}</strong>
                          </div>
                        </div>

                        {item.reviewer_notes && (
                          <p className="text-[10px] text-slate-500 line-clamp-2 bg-slate-50 p-1.5 rounded italic">
                            "{item.reviewer_notes}"
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Data/Hora</th>
                  <th className="p-3">Origem</th>
                  <th className="p-3">Candidato / Nome</th>
                  <th className="p-3">Documento</th>
                  <th className="p-3">Telefone</th>
                  <th className="p-3">Placa / Tipo</th>
                  <th className="p-3">Status Atual</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-slate-500 font-mono">
                      {item.created
                        ? new Date(item.created).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '---'}
                    </td>
                    <td className="p-3">
                      <Badge
                        className={`text-[10px] font-bold ${
                          item.origin === 'PORTA'
                            ? 'bg-[#005596] text-white'
                            : 'bg-emerald-700 text-white'
                        }`}
                      >
                        {item.origin}
                      </Badge>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{item.name}</td>
                    <td className="p-3 font-mono text-slate-700">
                      {permissions.canViewFullSensitiveData
                        ? formatDocument(item.document)
                        : maskDocument(item.document)}
                    </td>
                    <td className="p-3 font-mono text-slate-700">
                      {permissions.canViewFullSensitiveData
                        ? formatPhone(item.whatsapp)
                        : maskPhone(item.whatsapp)}
                    </td>
                    <td className="p-3">
                      <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded mr-1">
                        {item.plate || '---'}
                      </span>
                      <span className="text-slate-500">{item.vehicle_type || 'Carreta'}</span>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs uppercase font-semibold">
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleOpenReview(item)}
                        className="text-xs h-7 bg-[#005596] text-white"
                      >
                        Analisar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE ANÁLISE E AVANÇO DE PRÉ-CADASTRO */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-[#005596]" />
              <span>Triagem & Validação de Pré-Cadastro</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Atualize a etapa do candidato no funil de homologação SAP com auditoria.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-sm text-slate-800">{selectedItem.name}</div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    Doc:{' '}
                    <strong className="font-mono">
                      {permissions.canViewFullSensitiveData
                        ? formatDocument(selectedItem.document)
                        : maskDocument(selectedItem.document)}
                    </strong>
                  </div>
                  <div>
                    WhatsApp:{' '}
                    <strong className="font-mono">
                      {permissions.canViewFullSensitiveData
                        ? formatPhone(selectedItem.whatsapp)
                        : maskPhone(selectedItem.whatsapp)}
                    </strong>
                  </div>
                  <div>
                    Placa: <strong className="font-mono">{selectedItem.plate || 'N/A'}</strong>
                  </div>
                  <div>
                    Origem: <strong>{selectedItem.origin}</strong>
                  </div>
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Etapa no Funil (Kanban):</label>
                <Select value={targetStatus} onValueChange={(val: any) => setTargetStatus(val)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KANBAN_STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reviewer Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Parecer / Observações do Analista:
                </label>
                <Textarea
                  placeholder="Ex: Documentos recebidos via WhatsApp. Encaminhado para o time fiscal cadastrar no SAP ECC."
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  className="text-xs h-20 resize-none"
                />
              </div>

              {/* Rejection Reason if applicable */}
              {targetStatus === 'rejeitado' && (
                <div className="space-y-1.5">
                  <label className="font-bold text-rose-700 block">
                    Motivo da Rejeição (Obrigatório):
                  </label>
                  <Input
                    placeholder="Ex: Documentação falsa / CNH cassada / Restrição de segurança"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="text-xs h-9 border-rose-300"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedItem(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveReview}
              disabled={isSubmitting}
              className="text-xs bg-[#005596] hover:bg-[#004071] text-white font-semibold"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Alteração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
