import React, { useState, useEffect } from 'react'
import {
  Printer,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Network,
  Shield,
  Activity,
  Edit2,
  Check,
  Building,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react'
import { tmsService } from '../services/tmsService'
import {
  PrinterDeviceEntity,
  PrintProtocol,
  PrinterEnvironment,
} from '../domain/printingAndTransportEngine'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/use-toast'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '../components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Switch } from '../components/ui/switch'

export default function PrintersAdminPage() {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [printers, setPrinters] = useState<PrinterDeviceEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedPrinter, setSelectedPrinter] = useState<Partial<PrinterDeviceEntity> | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  const loadPrinters = async () => {
    setLoading(true)
    try {
      const data = await tmsService.getPrinterDevices()
      setPrinters(data as PrinterDeviceEntity[])
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar impressoras',
        description: err?.message || 'Falha na conexão com banco de dados.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrinters()
  }, [])

  const handleOpenNewModal = () => {
    setSelectedPrinter({
      name: '',
      description: '',
      location: 'Guichê Expedição DP34',
      plant: 'Planta CIAFAL Matriz (São Paulo/SP)',
      sector: 'Expedição / Balança',
      ip_hostname: '10.10.5.',
      port: 631,
      print_queue_name: 'PRT_EXP_',
      protocol: 'IPP',
      driver_type: 'HP LaserJet Enterprise',
      is_active: true,
      is_default_transport: false,
      environment: 'DEV',
      status: 'ONLINE',
    })
    setIsEditModalOpen(true)
  }

  const handleEditModal = (printer: PrinterDeviceEntity) => {
    setSelectedPrinter({ ...printer })
    setIsEditModalOpen(true)
  }

  const handleSavePrinter = async () => {
    if (
      !selectedPrinter?.name ||
      !selectedPrinter?.ip_hostname ||
      !selectedPrinter?.print_queue_name
    ) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Preencha Nome, IP/Hostname e Fila de Impressão.',
      })
      return
    }

    try {
      await tmsService.savePrinterDevice(selectedPrinter)
      toast({
        title: 'Impressora salva com sucesso',
        description: `Dispositivo ${selectedPrinter.name} configurado no cluster corporativo.`,
      })
      setIsEditModalOpen(false)
      loadPrinters()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar impressora',
        description: err?.message || 'Falha ao gravar no banco.',
      })
    }
  }

  const handleTestPrinter = async (printerId: string, printerName: string) => {
    setTestingId(printerId)
    try {
      const res = await tmsService.testPrinterDevice(
        printerId,
        user?.email || 'operador@ciafal.com.br',
      )
      if (res.success) {
        toast({
          title: 'Teste de Impressão Concluído',
          description: res.message,
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha no Teste de Impressão',
          description: res.message,
        })
      }
      loadPrinters()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar página de teste',
        description: err?.message || 'Falha na comunicação de rede.',
      })
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Administração de Impressoras Corporativas
            </h1>
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-300 font-semibold"
            >
              Sprint 5 — Print Engine
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Gestão do parque de impressoras térmicas e laser de rede para emissão física da Ordem de
            Transporte SAP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadPrinters} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>
          {permissions.canManagePrinters && (
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleOpenNewModal}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar Impressora
            </Button>
          )}
        </div>
      </div>

      {/* AVISO DE SEGURANÇA E PROTOCOLO (REGRA 36) */}
      <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              Regras de Comunicação Segura de Impressão (CIAFAL Infraestrutura):
            </span>
            <p>
              1. <strong>Backend Only:</strong> A comunicação de spooling é executada no servidor
              através de fila corporativa (IPP / Windows Spooler / CUPS). Nenhuma credencial de rede
              é trafegada no frontend.
            </p>
            <p>
              2. <strong>Controle de Duplicidade:</strong> Cada ordem possui um identificador único
              de impressão com trava de idempotência para evitar reimpressões involuntárias.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* GRID DE IMPRESSORAS CADASTRADAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {printers.map((p) => (
          <Card
            key={p.id}
            className={`flex flex-col justify-between border transition-all ${
              p.is_default_transport
                ? 'border-indigo-400 dark:border-indigo-600 shadow-sm ring-1 ring-indigo-400/40 bg-white dark:bg-slate-900'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            <div>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Printer className="h-4 w-4 text-indigo-600" />
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {p.name}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      {p.location}
                    </CardDescription>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {p.status === 'ONLINE' ? (
                      <Badge className="bg-emerald-600 text-white text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> ONLINE
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> OFFLINE
                      </Badge>
                    )}

                    {p.is_default_transport && (
                      <Badge
                        variant="outline"
                        className="bg-indigo-50 text-indigo-700 border-indigo-300 text-[10px] font-bold"
                      >
                        Padrão Transporte
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="text-[10px] text-slate-400 block">IP / Hostname</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {p.ip_hostname}:{p.port || 631}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Fila / Spooler</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {p.print_queue_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Protocolo</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {p.protocol}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Ambiente</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {p.environment}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                  <span>Driver: {p.driver_type || 'Genérico Corporativo'}</span>
                  {p.last_communication && (
                    <span className="block mt-0.5 text-[10px]">
                      Última comunicação:{' '}
                      {new Date(p.last_communication).toLocaleTimeString('pt-BR')}
                    </span>
                  )}
                </div>
              </CardContent>
            </div>

            <CardFooter className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => handleTestPrinter(p.id, p.name)}
                disabled={testingId === p.id}
              >
                {testingId === p.id ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Activity className="h-3.5 w-3.5 mr-1 text-slate-600" />
                )}
                Testar Impressão
              </Button>

              {permissions.canManagePrinters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 text-indigo-600 hover:text-indigo-800"
                  onClick={() => handleEditModal(p)}
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  Editar
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* MODAL DE EDIÇÃO / CADASTRO DE IMPRESSORA */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-indigo-600" />
              {selectedPrinter?.id
                ? 'Editar Configuração de Impressora'
                : 'Cadastrar Nova Impressora de Rede'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Definição de parâmetros corporativos de spooler e fila de impressão.
            </DialogDescription>
          </DialogHeader>

          {selectedPrinter && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs font-semibold">Nome Identificador</Label>
                  <Input
                    className="h-8 mt-1"
                    placeholder="Ex: PRT-EXP-DP34-01"
                    value={selectedPrinter.name || ''}
                    onChange={(e) =>
                      setSelectedPrinter({ ...selectedPrinter, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Planta / Unidade</Label>
                  <Input
                    className="h-8 mt-1"
                    value={selectedPrinter.plant || ''}
                    onChange={(e) =>
                      setSelectedPrinter({ ...selectedPrinter, plant: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Localização / Setor</Label>
                  <Input
                    className="h-8 mt-1"
                    value={selectedPrinter.location || ''}
                    onChange={(e) =>
                      setSelectedPrinter({ ...selectedPrinter, location: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">IP / Hostname de Rede</Label>
                  <Input
                    className="h-8 mt-1 font-mono"
                    placeholder="10.10.5.42"
                    value={selectedPrinter.ip_hostname || ''}
                    onChange={(e) =>
                      setSelectedPrinter({ ...selectedPrinter, ip_hostname: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Porta</Label>
                  <Input
                    type="number"
                    className="h-8 mt-1 font-mono"
                    placeholder="631"
                    value={selectedPrinter.port || 631}
                    onChange={(e) =>
                      setSelectedPrinter({ ...selectedPrinter, port: Number(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Nome da Fila (Spooler)</Label>
                  <Input
                    className="h-8 mt-1 font-mono"
                    placeholder="PRT_EXP_DP34_01"
                    value={selectedPrinter.print_queue_name || ''}
                    onChange={(e) =>
                      setSelectedPrinter({ ...selectedPrinter, print_queue_name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Protocolo de Comunicação</Label>
                  <Select
                    value={selectedPrinter.protocol || 'IPP'}
                    onValueChange={(val: PrintProtocol) =>
                      setSelectedPrinter({ ...selectedPrinter, protocol: val })
                    }
                  >
                    <SelectTrigger className="h-8 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IPP">IPP (Internet Printing Protocol)</SelectItem>
                      <SelectItem value="CUPS">CUPS Spooler</SelectItem>
                      <SelectItem value="WINDOWS_SPOOLER">Windows Print Server</SelectItem>
                      <SelectItem value="LPR_LPD">LPR / LPD (Porta 515)</SelectItem>
                      <SelectItem value="RAW_SOCKET">RAW Socket (Porta 9100)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Ambiente</Label>
                  <Select
                    value={selectedPrinter.environment || 'DEV'}
                    onValueChange={(val: PrinterEnvironment) =>
                      setSelectedPrinter({ ...selectedPrinter, environment: val })
                    }
                  >
                    <SelectTrigger className="h-8 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEV">DEV (Desenvolvimento)</SelectItem>
                      <SelectItem value="HOMOLOGACAO">HOMOLOGAÇÃO</SelectItem>
                      <SelectItem value="PRODUCAO">PRODUÇÃO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Status Operacional</Label>
                  <Select
                    value={selectedPrinter.status || 'ONLINE'}
                    onValueChange={(val: any) =>
                      setSelectedPrinter({ ...selectedPrinter, status: val })
                    }
                  >
                    <SelectTrigger className="h-8 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONLINE">ONLINE (Ativo)</SelectItem>
                      <SelectItem value="OFFLINE">OFFLINE (Indisponível)</SelectItem>
                      <SelectItem value="EM_ERRO">EM ERRO</SelectItem>
                      <SelectItem value="MANUTENCAO">MANUTENÇÃO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                  <div>
                    <Label className="text-xs font-semibold block">
                      Impressora Padrão para Ordem de Transporte
                    </Label>
                    <span className="text-[10px] text-slate-500">
                      Dispositivo padrão de expedição quando nenhuma impressora específica for
                      selecionada.
                    </span>
                  </div>
                  <Switch
                    checked={selectedPrinter.is_default_transport || false}
                    onCheckedChange={(checked) =>
                      setSelectedPrinter({ ...selectedPrinter, is_default_transport: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                  <div>
                    <Label className="text-xs font-semibold block">Dispositivo Ativo</Label>
                    <span className="text-[10px] text-slate-500">
                      Habilita o recebimento de trabalhos de impressão pelo TMS.
                    </span>
                  </div>
                  <Switch
                    checked={selectedPrinter.is_active || false}
                    onCheckedChange={(checked) =>
                      setSelectedPrinter({ ...selectedPrinter, is_active: checked })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleSavePrinter}
            >
              Salvar Configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
