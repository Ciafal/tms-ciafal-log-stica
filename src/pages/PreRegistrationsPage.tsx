import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { TmsService } from '@/services/tmsService'
import {
  PreRegistrationEntity,
  maskDocument,
  maskPhone,
  formatDocument,
  formatPhone,
} from '@/domain/rules'
import {
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Building,
  Smartphone,
  FileCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

export const PreRegistrationsPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [items, setItems] = useState<PreRegistrationEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')

  // Review Modal State
  const [selectedItem, setSelectedItem] = useState<PreRegistrationEntity | null>(null)
  const [reviewStatus, setReviewStatus] = useState<
    'pendente' | 'em_analise' | 'aprovado' | 'rejeitado'
  >('em_analise')
  const [reviewerNotes, setReviewerNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await TmsService.getPreRegistrations()
      setItems(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenReview = (item: PreRegistrationEntity) => {
    setSelectedItem(item)
    setReviewStatus(item.status)
    setReviewerNotes(item.reviewer_notes || '')
    setRejectionReason(item.rejection_reason || '')
  }

  const handleSaveReview = async () => {
    if (!selectedItem) return

    if (reviewStatus === 'rejeitado' && !rejectionReason.trim()) {
      toast({
        title: 'Motivo de rejeição obrigatório',
        description: 'Informe a justificativa da recusa do pré-cadastro.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const ok = await TmsService.updatePreRegistrationStatus(
        selectedItem.id,
        reviewStatus,
        user?.email || 'operador@ciafal.com.br',
        reviewerNotes,
        rejectionReason,
      )

      if (ok) {
        toast({
          title: 'Pré-cadastro Atualizado',
          description: `Situação definida como ${reviewStatus.toUpperCase()}. O cadastro definitivo deve ser efetuado no SAP.`,
        })
        setSelectedItem(null)
        loadData()
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filtered = items.filter((item) => {
    if (statusFilter !== 'todos' && item.status !== statusFilter) return false
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      return (
        item.name.toLowerCase().includes(term) ||
        item.document.includes(term) ||
        (item.plate || '').toLowerCase().includes(term)
      )
    }
    return true
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge className="bg-amber-500 text-white font-semibold">Pendente Análise</Badge>
      case 'em_analise':
        return <Badge className="bg-sky-600 text-white font-semibold">Em Análise</Badge>
      case 'aprovado':
        return <Badge className="bg-emerald-600 text-white font-semibold">Aprovado p/ SAP</Badge>
      case 'rejeitado':
        return <Badge className="bg-rose-600 text-white font-semibold">Rejeitado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <UserPlus className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Painel de Pré-cadastros Pendentes
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            <strong>Regra Fundamental:</strong> Pré-cadastro NÃO é cadastro ativo. Não é inserido
            como apto na fila nem recebe ofertas até confirmação no SAP.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="text-xs text-slate-700 border-slate-300 gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Lista
        </Button>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, documento ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="em_analise">Em Análise</SelectItem>
              <SelectItem value="aprovado">Aprovados p/ SAP</SelectItem>
              <SelectItem value="rejeitado">Rejeitados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* LISTAGEM DE PRÉ-CADASTROS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-sm">Nenhum pré-cadastro pendente no momento</p>
            <p className="text-xs text-slate-400 mt-1">
              Tentativas de entrada sem cadastro ativo no SAP serão listadas aqui para triagem.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                    {getStatusBadge(item.status)}
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Origem: {item.origin}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span>
                      Doc:{' '}
                      <strong className="font-mono text-slate-800">
                        {permissions.canViewFullSensitiveData
                          ? formatDocument(item.document)
                          : maskDocument(item.document)}
                      </strong>
                    </span>
                    <span>
                      WhatsApp:{' '}
                      <strong className="font-mono text-slate-800">
                        {permissions.canViewFullSensitiveData
                          ? formatPhone(item.whatsapp)
                          : maskPhone(item.whatsapp)}
                      </strong>
                    </span>
                    <span>
                      Veículo: <strong>{item.vehicle_type || 'N/A'}</strong> (Placa:{' '}
                      <span className="font-mono font-bold">{item.plate || 'SEM PLACA'}</span>)
                    </span>
                  </div>

                  {item.reviewer_notes && (
                    <p className="text-xs text-slate-500 italic mt-1">
                      Nota de Análise: "{item.reviewer_notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenReview(item)}
                    className="text-xs border-slate-300 text-slate-700 hover:text-slate-900"
                  >
                    Analisar Pré-Cadastro
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE ANÁLISE DE PRÉ-CADASTRO */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-[#005596]" />
              <span>Triagem de Pré-Cadastro</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              O cadastro definitivo DEVE ser criado/confirmado no SAP. O TMS não inventa código SAP.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{selectedItem.name}</div>
                <div className="text-slate-600">
                  CPF/CNPJ: <strong className="font-mono">{selectedItem.document}</strong> •
                  WhatsApp: <strong className="font-mono">{selectedItem.whatsapp}</strong>
                </div>
                <div className="text-slate-600">
                  Veículo: <strong>{selectedItem.vehicle_type}</strong> (Placa:{' '}
                  <strong>{selectedItem.plate}</strong>)
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Status da Triagem:</label>
                <Select value={reviewStatus} onValueChange={(val: any) => setReviewStatus(val)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente de Documentação</SelectItem>
                    <SelectItem value="em_analise">Em Análise na Portaria/Cadastro</SelectItem>
                    <SelectItem value="aprovado">Aprovado p/ Inclusão no SAP</SelectItem>
                    <SelectItem value="rejeitado" className="text-rose-600 font-bold">
                      Rejeitado (Incompatível / Irregular)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Observações do Analista:</label>
                <Textarea
                  placeholder="Instruções para a equipe de cadastro SAP..."
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  className="text-xs h-20 resize-none"
                />
              </div>

              {reviewStatus === 'rejeitado' && (
                <div className="space-y-1.5">
                  <label className="font-bold text-rose-600 block">
                    Motivo da Rejeição (Obrigatório):
                  </label>
                  <Input
                    placeholder="Ex: CNH vencida, documentação irregular do conjunto..."
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
              {isSubmitting ? 'Salvando...' : 'Gravar Análise'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
