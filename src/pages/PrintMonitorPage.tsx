import React, { useState, useEffect } from 'react'
import {
  Printer,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RotateCcw,
  FileText,
  User,
  ShieldCheck,
  Send,
  Eye,
  Building,
} from 'lucide-react'
import { tmsService } from '../services/tmsService'
import { PrintJobEntity, PrinterDeviceEntity } from '../domain/printingAndTransportEngine'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/use-toast'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

export default function PrintMonitorPage() {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [jobs, setJobs] = useState<PrintJobEntity[]>([])
  const [printers, setPrinters] = useState<PrinterDeviceEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('TODOS')

  // Modal de Reimpressão
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false)
  const [selectedJobForReprint, setSelectedJobForReprint] = useState<PrintJobEntity | null>(null)
  const [reprintReason, setReprintReason] = useState('')
  const [targetPrinterId, setTargetPrinterId] = useState<string>('')
  const [reprinting, setReprinting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [jList, pList] = await Promise.all([
        tmsService.getPrintJobs(),
        tmsService.getPrinterDevices(),
      ])
      setJobs(jList as PrintJobEntity[])
      setPrinters(pList as PrinterDeviceEntity[])
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar monitor de impressão',
        description: err?.message || 'Falha ao buscar dados do servidor.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.sap_transport_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.printer_name_cached?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.print_job_id?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'TODOS' || job.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleOpenReprint = (job: PrintJobEntity) => {
    if (!permissions.canReprintTransport) {
      toast({
        variant: 'destructive',
        title: 'Acesso Negado',
        description:
          'Seu perfil de usuário não possui a permissão transport.reprint para autorizar reimpressões.',
      })
      return
    }

    setSelectedJobForReprint(job)
    setReprintReason('')
    setTargetPrinterId(job.printer_id || '')
    setIsReprintModalOpen(true)
  }

  const handleExecuteReprint = async () => {
    if (!selectedJobForReprint) return

    if (!reprintReason || reprintReason.trim().length < 5) {
      toast({
        variant: 'destructive',
        title: 'Motivo Obrigatório',
        description:
          'É mandatório registrar a justificativa operacional para a reimpressão do documento.',
      })
      return
    }

    setReprinting(true)
    try {
      const res = await tmsService.printTransportOrder({
        cargoId: selectedJobForReprint.cargo_id,
        sapTransportNumber: selectedJobForReprint.sap_transport_number,
        printerId: targetPrinterId || selectedJobForReprint.printer_id,
        operatorEmail: user?.email || 'operador@ciafal.com.br',
        operatorName: user?.email?.split('@')[0] || 'Operador TMS',
        isReprint: true,
        reprintReason,
        copies: 1,
      })

      if (res.success) {
        toast({
          title: 'Reimpressão Executada',
          description: `Documento da Ordem SAP ${selectedJobForReprint.sap_transport_number} reenviado para a impressora.`,
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Job Retido na Fila',
          description: res.message,
        })
      }

      setIsReprintModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao processar reimpressão',
        description: err?.message || 'Falha ao registrar job.',
      })
    } finally {
      setReprinting(false)
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Monitor de Impressão & Fila Spooler
            </h1>
            <Badge
              variant="outline"
              className="bg-indigo-50 text-indigo-700 border-indigo-300 font-semibold"
            >
              Gestão Operacional
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Rastreabilidade e auditoria de jobs de impressão de Ordens de Transporte SAP emitidas
            para motoristas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Fila
          </Button>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Buscar por Ordem SAP, Impressora, Usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Status</SelectItem>
                <SelectItem value="Impresso">Impresso (Concluído)</SelectItem>
                <SelectItem value="Pendente">Pendente / Fila</SelectItem>
                <SelectItem value="Enviado">Enviado ao Spooler</SelectItem>
                <SelectItem value="Erro">Erro / Falha</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end text-xs text-slate-500">
            <span>
              Total de Registros: <strong>{filteredJobs.length}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* TABELA DE JOBS DE IMPRESSÃO */}
      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 uppercase font-semibold border-b">
              <tr>
                <th className="py-3 px-3">Job ID / Tipo</th>
                <th className="py-3 px-3">Ordem SAP</th>
                <th className="py-3 px-3">Impressora Destino</th>
                <th className="py-3 px-3">Operador / Usuário</th>
                <th className="py-3 px-3">Data / Hora</th>
                <th className="py-3 px-3 text-center">Tentativas</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nenhum trabalho de impressão encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {job.print_job_id}
                      <span className="text-[10px] text-slate-500 font-sans block">
                        {job.document_type} {job.is_reprint ? '(REIMPRESSÃO)' : ''}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {job.sap_transport_number && job.sap_transport_number !== 'N/A' ? (
                        <span className="font-bold font-mono text-indigo-700 dark:text-indigo-400">
                          {job.sap_transport_number}
                        </span>
                      ) : (
                        <span className="text-slate-400">Teste de Comunicação</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-800 dark:text-slate-200 block">
                        {job.printer_name_cached || 'Impressora'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {job.printer_location_cached}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-800 dark:text-slate-200 block">
                        {job.user_name || job.user_email}
                      </span>
                      <span className="text-[10px] text-slate-500 block">{job.user_email}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {new Date(job.created || Date.now()).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {job.attempts_count || 1} / {job.max_attempts || 3}
                    </td>
                    <td className="py-3 px-3">
                      {job.status === 'Impresso' ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] flex items-center gap-1 w-fit">
                          <CheckCircle2 className="h-3 w-3" /> Impresso
                        </Badge>
                      ) : job.status === 'Pendente' ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] flex items-center gap-1 w-fit"
                        >
                          <Clock className="h-3 w-3" /> Pendente (Fila)
                        </Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="text-[10px] flex items-center gap-1 w-fit"
                        >
                          <XCircle className="h-3 w-3" /> Erro Spooler
                        </Badge>
                      )}
                      {job.error_message && (
                        <span
                          className="text-[10px] text-rose-600 block mt-0.5 max-w-[200px] truncate"
                          title={job.error_message}
                        >
                          {job.error_message}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {job.document_type !== 'TESTE_IMPRESSAO' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] h-7 text-indigo-600 hover:text-indigo-800"
                          onClick={() => handleOpenReprint(job)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reimprimir
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL DE REIMPRESSÃO COM JUSTIFICATIVA OBRIGATÓRIA (REGRA 40) */}
      <Dialog open={isReprintModalOpen} onOpenChange={setIsReprintModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <RotateCcw className="h-4 w-4 text-indigo-600" />
              Reimpressão Autorizada de Ordem de Transporte
            </DialogTitle>
            <DialogDescription className="text-xs">
              A reimpressão de documentos operacionais exige justificativa formal para auditoria.
            </DialogDescription>
          </DialogHeader>

          {selectedJobForReprint && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded border space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ordem SAP:</span>
                  <span className="font-bold font-mono text-indigo-700 dark:text-indigo-400">
                    {selectedJobForReprint.sap_transport_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Impressora Anterior:</span>
                  <span className="font-semibold">{selectedJobForReprint.printer_name_cached}</span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Redirecionar para Impressora</Label>
                <Select value={targetPrinterId} onValueChange={setTargetPrinterId}>
                  <SelectTrigger className="h-8 mt-1 text-xs">
                    <SelectValue placeholder="Selecione a impressora" />
                  </SelectTrigger>
                  <SelectContent>
                    {printers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.location}) {p.status === 'ONLINE' ? '• Online' : '• Offline'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Motivo Operacional da Reimpressão <span className="text-rose-600">*</span>
                </Label>
                <Textarea
                  placeholder="Ex: Folha atolou na bandeja; Danificação na portaria; Motorista solicitou 2ª via."
                  value={reprintReason}
                  onChange={(e) => setReprintReason(e.target.value)}
                  className="mt-1 text-xs min-h-[70px]"
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  Esta ação gerará carimbo "REIMPRESSÃO - 2ª VIA" e log de auditoria associado ao
                  seu usuário.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setIsReprintModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              onClick={handleExecuteReprint}
              disabled={reprinting}
            >
              {reprinting ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1" />
              )}
              Confirmar Reimpressão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
