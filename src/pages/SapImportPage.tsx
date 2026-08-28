import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Clock,
  ShieldCheck,
  Download,
  AlertCircle,
  Layers,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { isValidDocument } from '@/domain/rules'

interface ImportReport {
  fileName: string
  fileHash: string
  totalReceived: number
  totalAccepted: number
  totalRejected: number
  errors: { row: number; reason: string; rawData: string }[]
  timestamp: string
  responsibleUser: string
}

export const SapImportPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [isProcessing, setIsProcessing] = useState(false)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [importHistory, setImportHistory] = useState<ImportReport[]>([])
  const [importedHashes, setImportedHashes] = useState<Set<string>>(new Set())

  // Sample CSV template generator
  const downloadSampleTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'SAP_ID;NOME_MOTORISTA;CPF_CNPJ;TELEFONE_WHATSAPP;PLACA_VEICULO;TIPO_VEICULO;CNH;CATEGORIA_CNH;STATUS_SAP\n' +
      'SAP-0091;Marcos Silva Ferreira;12345678909;11987654321;ABC1D23;Carreta LS;98765432100;E;ATIVO\n' +
      'SAP-0092;Roberto Almeida Santos;98765432100;11976543210;XYZ9E87;Bitrem;12345678900;E;ATIVO\n' +
      'SAP-0093;Julio Cesar Ramos;11144477735;11965432109;FGH3J45;Truck;45678901234;D;ATIVO'
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'template_sap_zsd004v_v2.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Simple quick hash calculation for idempotency
  const calculateQuickHash = (content: string) => {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0
    }
    return `HASH-${Math.abs(hash)}`
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 1. MIME and Extension Hardening
    const isCsv =
      file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt')
    if (!isCsv) {
      toast({
        title: 'Formato de arquivo inválido',
        description: 'Apenas arquivos com extensão .csv ou .txt são aceitos.',
        variant: 'destructive',
      })
      return
    }

    // Size limit check (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito pesado',
        description: 'Tamanho máximo permitido: 5 MB.',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    const reader = new FileReader()

    reader.onload = async (e) => {
      const text = e.target?.result as string
      if (!text) {
        setIsProcessing(false)
        return
      }

      const fileHash = calculateQuickHash(text)

      // 2. Idempotency Check: Prevent duplicate import of the exact same file
      if (importedHashes.has(fileHash)) {
        toast({
          title: 'Arquivo já importado (Idempotência)',
          description: `Este mesmo lote/arquivo (${file.name} - ${fileHash}) já foi processado nesta sessão.`,
          variant: 'destructive',
        })
        setIsProcessing(false)
        return
      }

      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
      if (lines.length < 2) {
        toast({
          title: 'Arquivo vazio ou sem registros',
          description: 'O arquivo precisa conter cabeçalho e pelo menos 1 registro.',
          variant: 'destructive',
        })
        setIsProcessing(false)
        return
      }

      const header = lines[0].toUpperCase()
      const delimiter = header.includes(';') ? ';' : ','

      // Validate required columns
      if (
        !header.includes('CPF_CNPJ') &&
        !header.includes('DOCUMENTO') &&
        !header.includes('NOME')
      ) {
        toast({
          title: 'Estrutura inválida',
          description: 'O cabeçalho do arquivo deve conter as colunas NOME e CPF_CNPJ.',
          variant: 'destructive',
        })
        setIsProcessing(false)
        return
      }

      let accepted = 0
      let rejected = 0
      const errorList: { row: number; reason: string; rawData: string }[] = []

      // Process rows
      for (let i = 1; i < lines.length; i++) {
        const rawLine = lines[i]
        const cols = rawLine.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim())

        // Formula Injection protection (CSV Injection: =, +, -, @)
        const safeCols = cols.map((c) => {
          if (c.startsWith('=') || c.startsWith('+') || c.startsWith('-') || c.startsWith('@')) {
            return "'" + c
          }
          return c
        })

        const sapId = safeCols[0] || ''
        const name = safeCols[1] || ''
        const docRaw = safeCols[2] || ''
        const phone = safeCols[3] || ''
        const plate = safeCols[4] || ''
        const vehicleType = safeCols[5] || 'Carreta LS'
        const cnh = safeCols[6] || ''
        const cnhCat = safeCols[7] || ''
        const sapStatus = (safeCols[8] || 'ATIVO').toUpperCase()

        const cleanDoc = docRaw.replace(/\D/g, '')

        // Document Check
        const docVal = isValidDocument(cleanDoc)
        if (!docVal.valid) {
          rejected++
          errorList.push({
            row: i + 1,
            reason: `Documento CPF/CNPJ inválido (${docRaw})`,
            rawData: rawLine,
          })
          continue
        }

        if (!name || name.length < 3) {
          rejected++
          errorList.push({
            row: i + 1,
            reason: 'Nome do motorista ausente ou com menos de 3 caracteres',
            rawData: rawLine,
          })
          continue
        }

        try {
          // Check if driver exists in PocketBase
          const existingDrivers = await pb.collection('drivers').getList(1, 1, {
            filter: `document = "${cleanDoc}"`,
          })

          let driverId = ''
          if (existingDrivers.items.length > 0) {
            // Update
            const drv = existingDrivers.items[0]
            await pb.collection('drivers').update(drv.id, {
              name,
              whatsapp: phone.replace(/\D/g, ''),
              sap_id: sapId || drv.sap_id,
              cnh: cnh || drv.cnh,
              cnh_category: cnhCat || drv.cnh_category,
              status: sapStatus === 'BLOQUEADO' ? 'bloqueado' : 'ativo',
            })
            driverId = drv.id
          } else {
            // Create
            const created = await pb.collection('drivers').create({
              name,
              document: cleanDoc,
              whatsapp: phone.replace(/\D/g, ''),
              sap_id: sapId,
              cnh,
              cnh_category: cnhCat,
              status: sapStatus === 'BLOQUEADO' ? 'bloqueado' : 'ativo',
            })
            driverId = created.id
          }

          // Upsert vehicle if plate provided
          if (plate) {
            const cleanPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
            const existingVehicles = await pb.collection('vehicles').getList(1, 1, {
              filter: `plate = "${cleanPlate}"`,
            })
            if (existingVehicles.items.length > 0) {
              await pb.collection('vehicles').update(existingVehicles.items[0].id, {
                type: vehicleType,
                driver: driverId,
              })
            } else {
              await pb.collection('vehicles').create({
                plate: cleanPlate,
                type: vehicleType,
                driver: driverId,
              })
            }
          }

          accepted++
        } catch (err: any) {
          rejected++
          errorList.push({
            row: i + 1,
            reason: err?.message || 'Erro ao persistir registro no banco de dados',
            rawData: rawLine,
          })
        }
      }

      const reportObj: ImportReport = {
        fileName: file.name,
        fileHash,
        totalReceived: lines.length - 1,
        totalAccepted: accepted,
        totalRejected: rejected,
        errors: errorList,
        timestamp: new Date().toISOString(),
        responsibleUser: user?.email || 'operador_sap@ciafal.com.br',
      }

      setReport(reportObj)
      setImportHistory((prev) => [reportObj, ...prev])
      setImportedHashes((prev) => new Set([...prev, fileHash]))

      // Log audit
      try {
        await pb.collection('audit_logs').create({
          user_email: user?.email || 'operador_sap@ciafal.com.br',
          user_name: user?.name || 'Operador SAP',
          user_role: 'admin_tms',
          action: 'IMPORT_SAP_FILE',
          resource: 'drivers',
          previous_state: 'Lote anterior',
          new_state: `Importados ${accepted} de ${lines.length - 1}`,
          reason: `Carga provisória de arquivo exportado do SAP ZSD004V_V2 (${file.name})`,
          correlation_id: `SAP-IMP-${Date.now()}`,
          payload: {
            fileName: file.name,
            fileHash,
            accepted,
            rejected,
          },
        })
      } catch {
        /* intentionally ignored */
      }

      setIsProcessing(false)
      toast({
        title: 'Processamento Concluído',
        description: `${accepted} motoristas/veículos aceitos com sucesso. ${rejected} rejeições.`,
      })
    }

    reader.readAsText(file)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <FileSpreadsheet className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Importação Provisória SAP (ZSD004V_V2)
            </h1>
            <Badge className="bg-amber-500 text-white text-xs">Modo Provisório</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Carga de motoristas e veículos cadastrados a partir de arquivo exportado da transação
            SAP ECC.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={downloadSampleTemplate}
          className="text-xs border-slate-300 gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-[#005596]" />
          Baixar Modelo CSV (ZSD004V_V2)
        </Button>
      </div>

      {/* AVISO CRÍTICO DE ARQUITETURA SAP: INTEGRAÇÃO PROVISÓRIA */}
      <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 text-xs text-amber-950 flex items-start space-x-3 shadow-sm">
        <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-extrabold text-amber-950 block text-sm">
            INTEGRAÇÃO PROVISÓRIA — Fonte por arquivo exportado do SAP:
          </strong>
          <p className="text-amber-900 leading-relaxed">
            Esta funcionalidade de importação por arquivo é <strong>provisória</strong> e será
            substituída pela integração corporativa direta via <strong>RFC / IDoc</strong>. O SAP
            ECC continua sendo o <strong>System of Record (Fonte da Verdade)</strong>. Nenhum código
            SAP fictício é gerado pelo TMS CIAFAL.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-[#005596]" />
            <span>Selecionar Arquivo de Exportação SAP (CSV / TXT)</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Processamento idempotente, com proteção contra injeção de fórmulas e validação de
            dígitos verificadores
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <div className="border-2 border-dashed border-slate-300 hover:border-[#005596] transition-colors rounded-xl p-8 text-center bg-slate-50/50 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-sky-100 text-[#005596] flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-800">
                Arraste o arquivo ou clique para selecionar
              </div>
              <p className="text-xs text-slate-500">
                Formatos aceitos: <code>.csv</code>, <code>.txt</code> delimitados por
                ponto-e-vírgula (;) ou vírgula (,).
              </p>
            </div>

            <label className="cursor-pointer">
              <span className="bg-[#005596] hover:bg-[#004071] text-white px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 shadow">
                {isProcessing ? 'Processando Lote...' : 'Procurar Arquivo no Computador'}
              </span>
              <input
                type="file"
                accept=".csv,.txt"
                disabled={isProcessing}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Latest Import Report */}
      {report && (
        <Card className="border-slate-200 shadow-sm animate-fade-in">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Relatório de Validação da Carga — {report.fileName}</span>
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                Hash: {report.fileHash}
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Processado por {report.responsibleUser} em{' '}
              {new Date(report.timestamp).toLocaleString('pt-BR')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                <span className="text-xs uppercase font-bold text-slate-500 block">
                  Total Recebido
                </span>
                <span className="text-2xl font-black text-slate-800 mt-1 block">
                  {report.totalReceived}
                </span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
                <span className="text-xs uppercase font-bold text-emerald-800 block">
                  Aceitos & Sincronizados
                </span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">
                  {report.totalAccepted}
                </span>
              </div>

              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-center">
                <span className="text-xs uppercase font-bold text-rose-800 block">
                  Rejeitados por Inconsistência
                </span>
                <span className="text-2xl font-black text-rose-600 mt-1 block">
                  {report.totalRejected}
                </span>
              </div>
            </div>

            {report.errors.length > 0 && (
              <div className="space-y-3">
                <div className="font-bold text-xs uppercase text-rose-700 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  <span>Detalhamento dos Erros Encontrados (Linha a Linha):</span>
                </div>

                <div className="border border-rose-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-rose-50 text-rose-900 uppercase text-[10px] font-bold border-b border-rose-200">
                      <tr>
                        <th className="p-2 w-16">Linha</th>
                        <th className="p-2">Motivo da Rejeição</th>
                        <th className="p-2">Dados Brutos Recebidos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 bg-white">
                      {report.errors.map((err, i) => (
                        <tr key={i} className="hover:bg-rose-50/40">
                          <td className="p-2 font-mono font-bold text-rose-800">{err.row}</td>
                          <td className="p-2 text-rose-700 font-medium">{err.reason}</td>
                          <td className="p-2 font-mono text-[11px] text-slate-500 truncate max-w-xs">
                            {err.rawData}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
