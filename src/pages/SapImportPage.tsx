import React, { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { isValidDocument } from '@/domain/rules'
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Database,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface ImportReport {
  totalRead: number
  createdCount: number
  updatedCount: number
  ignoredCount: number
  rejectedCount: number
  rejections: Array<{ line: number; document: string; name: string; reason: string }>
}

export const SapImportPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [report, setReport] = useState<ImportReport | null>(null)

  // Template demo data generator
  const sampleCsvContent = `DOCUMENTO;NOME_MOTORISTA;WHATSAPP;PLACA_VEICULO;TIPO_VEICULO;COD_SAP;STATUS_SAP
12345678909;Sebastião Moreira dos Santos;11987654321;ABC1D23;Carreta LS;SAP-100201;ATIVO
98765432100;Roberto Gonçalves de Alencar;19976543210;XYZ9K88;Bitrem 7 Eixos;SAP-100202;ATIVO
45678912300;Antônio Ferreira Ramos;16991234567;BRA2E19;Truck;SAP-100203;ATIVO
00000000000;Motorista CPF Invalido;11900000000;INV0A00;Carreta;SAP-999999;ATIVO
78912345600;Claudemir de Paula Souza;12988776655;RST4H56;Rodotrem;SAP-100204;ATIVO`

  const downloadSampleTemplate = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo_importacao_sap_ZSD004V_V2.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      // Validate extension
      if (!selected.name.endsWith('.csv') && !selected.name.endsWith('.txt')) {
        toast({
          title: 'Formato não suportado',
          description: 'Selecione um arquivo .CSV exportado do SAP.',
          variant: 'destructive',
        })
        return
      }
      setFile(selected)
      setReport(null)
    }
  }

  const processImport = async () => {
    if (!file) {
      toast({ title: 'Selecione um arquivo', description: 'Nenhum arquivo anexado.' })
      return
    }

    setIsProcessing(true)
    setReport(null)

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)

        if (lines.length <= 1) {
          throw new Error('Arquivo vazio ou sem registros válidos.')
        }

        // Header check
        const headers = lines[0].split(';').map((h) => h.trim().toUpperCase())
        const docIdx = headers.indexOf('DOCUMENTO')
        const nameIdx = headers.indexOf('NOME_MOTORISTA')
        const phoneIdx = headers.indexOf('WHATSAPP')
        const plateIdx = headers.indexOf('PLACA_VEICULO')
        const typeIdx = headers.indexOf('TIPO_VEICULO')
        const sapIdx = headers.indexOf('COD_SAP')

        if (docIdx === -1 || nameIdx === -1) {
          throw new Error(
            'Cabeçalho inválido. Necessário conter pelo menos: DOCUMENTO;NOME_MOTORISTA.',
          )
        }

        let createdCount = 0
        let updatedCount = 0
        let ignoredCount = 0
        let rejectedCount = 0
        const rejections: Array<{ line: number; document: string; name: string; reason: string }> =
          []

        // Process line by line
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(';').map((c) => c.trim())
          const docRaw = cols[docIdx] || ''
          const name = cols[nameIdx] || ''
          const phone = phoneIdx !== -1 ? cols[phoneIdx] : ''
          const plate = plateIdx !== -1 ? cols[plateIdx] : ''
          const vType = typeIdx !== -1 ? cols[typeIdx] : 'Carreta LS'
          const sapId = sapIdx !== -1 ? cols[sapIdx] : ''

          const cleanDoc = docRaw.replace(/\D/g, '')
          const cleanPhone = phone.replace(/\D/g, '').replace(/^55/, '')

          // Check CPF / CNPJ check digits
          const validDoc = isValidDocument(cleanDoc)
          if (!validDoc.valid) {
            rejectedCount++
            rejections.push({
              line: i + 1,
              document: docRaw,
              name: name || 'N/A',
              reason: 'CPF/CNPJ inválido no algoritmo de verificação.',
            })
            continue
          }

          if (!name) {
            rejectedCount++
            rejections.push({
              line: i + 1,
              document: cleanDoc,
              name: 'Vazio',
              reason: 'Nome do motorista ausente.',
            })
            continue
          }

          try {
            // Check if driver exists
            const existing = await pb.collection('drivers').getList(1, 1, {
              filter: `document = "${cleanDoc}"`,
            })

            let driverId = ''
            if (existing.items.length > 0) {
              const d = existing.items[0]
              driverId = d.id
              await pb.collection('drivers').update(d.id, {
                name,
                whatsapp: cleanPhone || d.whatsapp,
                sap_id: sapId || d.sap_id,
                status: 'ativo',
              })
              updatedCount++
            } else {
              const d = await pb.collection('drivers').create({
                name,
                document: cleanDoc,
                whatsapp: cleanPhone || '11999990000',
                sap_id: sapId,
                status: 'ativo',
                notes: 'Importado via SAP ZSD004V_V2',
              })
              driverId = d.id
              createdCount++
            }

            // Upsert Vehicle
            if (plate) {
              const cleanPlate = plate.toUpperCase().trim()
              const existingV = await pb.collection('vehicles').getList(1, 1, {
                filter: `plate = "${cleanPlate}"`,
              })

              if (existingV.items.length > 0) {
                await pb.collection('vehicles').update(existingV.items[0].id, {
                  type: vType,
                  driver: driverId,
                })
              } else {
                await pb.collection('vehicles').create({
                  plate: cleanPlate,
                  type: vType,
                  driver: driverId,
                })
              }
            }
          } catch (err: any) {
            rejectedCount++
            rejections.push({
              line: i + 1,
              document: cleanDoc,
              name,
              reason: err?.message || 'Erro de persistência no banco.',
            })
          }
        }

        const rep: ImportReport = {
          totalRead: lines.length - 1,
          createdCount,
          updatedCount,
          ignoredCount,
          rejectedCount,
          rejections,
        }

        // Record SAP Import in database
        await pb.collection('sap_imports').create({
          file_name: file.name,
          imported_by: user?.email || 'admin@ciafal.com.br',
          total_read: rep.totalRead,
          created_count: rep.createdCount,
          updated_count: rep.updatedCount,
          ignored_count: rep.ignoredCount,
          rejected_count: rep.rejectedCount,
          rejections_log: rep.rejections,
          status: rep.rejectedCount > 0 ? 'concluido_com_erros' : 'concluido',
        })

        // Audit log
        await pb.collection('audit_logs').create({
          user_email: user?.email || 'admin@ciafal.com.br',
          user_name: user?.name || 'Administrador',
          user_role: 'admin_tms',
          action: 'SAP_IMPORT_EXECUTE',
          resource: 'sap_imports',
          previous_state: 'IDLE',
          new_state: 'COMPLETED',
          reason: `Importação de ${rep.totalRead} registros do arquivo ${file.name}`,
          correlation_id: `SAP-IMP-${Date.now()}`,
          payload: rep,
        })

        setReport(rep)
        toast({
          title: 'Importação Concluída',
          description: `${rep.createdCount} criados, ${rep.updatedCount} atualizados, ${rep.rejectedCount} rejeitados.`,
        })
      } catch (err: any) {
        toast({
          title: 'Erro no arquivo',
          description: err?.message || 'Falha ao processar arquivo.',
          variant: 'destructive',
        })
      } finally {
        setIsProcessing(false)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Importação Administrativa SAP — View ZSD004V_V2
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Fonte Primária: <strong>SAP ECC 6.0</strong>. Motorista não tem código próprio no SAP —
            a chave de identidade funcional é o <strong>CPF/CNPJ</strong>.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={downloadSampleTemplate}
          className="text-xs text-slate-700 border-slate-300 gap-1.5"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Baixar Modelo CSV (ZSD004V_V2)
        </Button>
      </div>

      {/* UPLOAD BOX */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
          <Upload className="w-5 h-5 text-[#005596]" />
          <span>Upload de Arquivo Exportado do SAP</span>
        </h3>

        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-sky-500 transition-colors bg-slate-50">
          <input
            type="file"
            id="sap-upload"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="sap-upload" className="cursor-pointer space-y-2 block">
            <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto" />
            <div className="font-semibold text-slate-700 text-sm">
              {file ? file.name : 'Clique para selecionar o arquivo CSV da view ZSD004V_V2'}
            </div>
            <p className="text-xs text-slate-400">
              Formato delimitado por ponto e vírgula (;), codificação UTF-8
            </p>
          </label>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            <strong>Regra:</strong> Veículos/motoristas importados substituem o conjunto
            correspondente. Nenhuma informação válida é apagada.
          </div>

          <Button
            onClick={processImport}
            disabled={!file || isProcessing}
            className="bg-[#005596] hover:bg-[#004071] text-white font-semibold text-xs h-9 px-6"
          >
            {isProcessing ? 'Processando e Validando...' : 'Executar Carga no TMS'}
          </Button>
        </div>
      </div>

      {/* RELATÓRIO DE IMPORTAÇÃO DETALHADO */}
      {report && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Relatório Consolidado de Execução da Carga</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-3">
                <div className="text-[11px] font-bold text-slate-600 uppercase">Linhas Lidas</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{report.totalRead}</div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-3">
                <div className="text-[11px] font-bold text-emerald-800 uppercase">Criados</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {report.createdCount}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sky-50 border-sky-200">
              <CardContent className="p-3">
                <div className="text-[11px] font-bold text-sky-800 uppercase">Atualizados</div>
                <div className="text-2xl font-black text-[#005596] mt-1">{report.updatedCount}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-3">
                <div className="text-[11px] font-bold text-slate-600 uppercase">Ignorados</div>
                <div className="text-2xl font-black text-slate-700 mt-1">{report.ignoredCount}</div>
              </CardContent>
            </Card>

            <Card className="bg-rose-50 border-rose-200">
              <CardContent className="p-3">
                <div className="text-[11px] font-bold text-rose-800 uppercase">Rejeitados</div>
                <div className="text-2xl font-black text-rose-600 mt-1">{report.rejectedCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* REJECTIONS LOG TABLE */}
          {report.rejections.length > 0 && (
            <Card className="border-rose-200 bg-rose-50/40">
              <CardHeader className="p-4 border-b border-rose-200">
                <CardTitle className="text-sm font-bold text-rose-900 flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Detalhamento das Rejeições (Linhas com Inconsistência)</span>
                </CardTitle>
                <CardDescription className="text-xs text-rose-700">
                  Nunca engolir erros silenciosamente. Cada rejeição abaixo contém o motivo técnico
                  específico.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs text-left">
                  <thead className="bg-rose-100/70 text-rose-900 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-2.5">Linha</th>
                      <th className="p-2.5">Documento</th>
                      <th className="p-2.5">Nome Informado</th>
                      <th className="p-2.5">Motivo da Rejeição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-200/60">
                    {report.rejections.map((rej, idx) => (
                      <tr key={idx} className="hover:bg-rose-100/40">
                        <td className="p-2.5 font-mono font-bold text-rose-900">
                          Linha {rej.line}
                        </td>
                        <td className="p-2.5 font-mono">{rej.document || 'Vazio'}</td>
                        <td className="p-2.5 font-semibold">{rej.name}</td>
                        <td className="p-2.5 text-rose-700 font-medium">{rej.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
