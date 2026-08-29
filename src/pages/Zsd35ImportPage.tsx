import React, { useState } from 'react'
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ArrowRight,
  Database,
  Filter,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import {
  processZsd35Rows,
  Zsd35ImportValidationReport,
  Zsd35ValidatedOrder,
} from '@/domain/zsd35ImportEngine'

export const Zsd35ImportPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<Zsd35ImportValidationReport | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return
    setFile(uploadedFile)

    setIsProcessing(true)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        // Tenta pegar a aba ZSD35_Carga ou a primeira aba
        const sheetName =
          wb.SheetNames.find((s) => s.includes('ZSD35') || s.includes('Carga')) || wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const rawJson = XLSX.utils.sheet_to_json(ws)

        const validationReport = processZsd35Rows(rawJson)
        setReport(validationReport)
        toast({
          title: 'Planilha ZSD35 Lida com Sucesso',
          description: `${validationReport.validOrders.length} pedidos válidos identificados. ${validationReport.ignoredRowsCount} linhas agregadas/cabeçalhos descartados.`,
        })
      } catch (err: any) {
        toast({
          title: 'Erro ao processar arquivo Excel',
          description: err?.message || 'Formato de planilha inválido.',
          variant: 'destructive',
        })
      } finally {
        setIsProcessing(false)
      }
    }
    reader.readAsBinaryString(uploadedFile)
  }

  const handleConfirmImport = async () => {
    if (!report || report.validOrders.length === 0) return
    setIsSaving(true)
    try {
      let savedCount = 0
      for (const ord of report.validOrders) {
        try {
          await TmsService.createSalesOrder({
            order_number: ord.order_number,
            customer_code: ord.customer_code,
            customer_name: ord.customer_name,
            destination_city: ord.destination_city,
            uf: ord.uf,
            itinerary_code: ord.itinerary_code,
            material: ord.material,
            material_description: ord.material_description,
            weight_kg: ord.weight_kg,
            total_value: ord.total_value,
            credit_status: ord.credit_status,
            production_status: ord.production_status,
            discharge_type: ord.discharge_type,
            order_date: ord.order_date,
            desired_date: ord.desired_date,
            stock_quantity_kg: ord.stock_quantity_kg,
            balance_quantity_kg: ord.balance_quantity_kg,
            correlation_id: `ZSD35-${ord.order_number}`,
          })
          savedCount++
        } catch {
          /* intentionally ignored */
        }
      }

      await TmsService.logAudit({
        user_name: user?.name || 'Operador Comercial',
        action_type: 'ZSD35_EXCEL_IMPORTED',
        target_entity: 'sap_sales_orders',
        target_id: file?.name || 'Carga_ZSD35_TMS_CIAFAL.xlsx',
        details: {
          total_read: report.totalRowsRead,
          imported_count: savedCount,
          ignored_subtotals: report.ignoredRowsCount,
        },
      })

      toast({
        title: 'Importação Concluída com Sucesso',
        description: `${savedCount} pedidos foram integrados à Carteira de Vendas ativa.`,
      })
      setReport(null)
      setFile(null)
    } catch (err: any) {
      toast({
        title: 'Erro na importação para o banco',
        description: err?.message || 'Falha ao salvar registros.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Importação Oficial da Carteira ZSD35 (.xlsx)
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">28 CAMPOS SAP</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Carga de dados reais da transação ZSD35. Limpeza automática de subtotais, linhas
            agregadas e cabeçalhos repetidos.
          </p>
        </div>

        <Badge variant="outline" className="text-[10px] font-mono border-slate-300">
          Aba Operacional: ZSD35_Carga
        </Badge>
      </div>

      {/* Upload Box */}
      <Card className="bg-white border-dashed border-2 border-slate-300 shadow-sm">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center text-[#005596]">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Selecione o arquivo Excel da Carteira ZSD35
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Aceita arquivos <strong>.xlsx</strong> contendo as 28 colunas oficiais do SAP ECC da
              CIAFAL (Q.Dias, Status, Inco, Documento de vendas, etc.).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
              <span className="inline-flex items-center justify-center px-4 py-2 bg-[#005596] text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {isProcessing ? 'Processando Arquivo...' : 'Escolher Planilha .xlsx'}
              </span>
            </label>
          </div>
          {file && (
            <div className="text-xs font-mono text-slate-600">Arquivo selecionado: {file.name}</div>
          )}
        </CardContent>
      </Card>

      {/* Relatório de Pré-Validação */}
      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Linhas Totais Lidas
                </div>
                <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                  {report.totalRowsRead}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Pedidos Válidos
                </div>
                <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                  {report.validOrders.length}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Prontos para Carteira</div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Subtotais Descartados
                </div>
                <div className="text-lg font-black text-amber-600 font-mono mt-0.5">
                  {report.ignoredRowsCount}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Linhas agregadas/cabeçalhos</div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Status da Validação
                </div>
                <div className="mt-1">
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    {report.summaryStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Amostra dos Pedidos Validados */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold uppercase text-slate-800">
                  Pré-visualização dos Registros Válidos ({report.validOrders.length} pedidos)
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Confira as informações antes de confirmar a importação para a base oficial de
                  dados.
                </CardDescription>
              </div>

              <Button
                onClick={handleConfirmImport}
                disabled={isSaving || report.validOrders.length === 0}
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {isSaving ? 'Gravando...' : 'Confirmar Importação para a Carteira'}
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="p-2.5">Doc. Vendas</th>
                    <th className="p-2.5">Cliente</th>
                    <th className="p-2.5">Cidade / UF</th>
                    <th className="p-2.5">Itinerário</th>
                    <th className="p-2.5">Material</th>
                    <th className="p-2.5 text-right">Peso (kg)</th>
                    <th className="p-2.5 text-right">Valor Total (R$)</th>
                    <th className="p-2.5">Crédito</th>
                    <th className="p-2.5">Estoque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {report.validOrders.slice(0, 10).map((ord, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{ord.order_number}</td>
                      <td className="p-2.5 font-sans font-medium text-slate-800">
                        {ord.customer_name}
                      </td>
                      <td className="p-2.5 font-sans text-slate-600">
                        {ord.destination_city}/{ord.uf}
                      </td>
                      <td className="p-2.5 font-bold text-[#005596]">{ord.itinerary_code}</td>
                      <td className="p-2.5 font-sans text-slate-700">{ord.material}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {ord.weight_kg.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-2.5 text-right text-slate-700">
                        R$ {ord.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            ord.credit_status === 'Liberado'
                              ? 'border-emerald-500 text-emerald-700'
                              : 'border-rose-500 text-rose-700'
                          }`}
                        >
                          {ord.credit_status}
                        </Badge>
                      </td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            ord.production_status === 'Pronto'
                              ? 'border-emerald-500 text-emerald-700'
                              : 'border-amber-500 text-amber-700'
                          }`}
                        >
                          {ord.production_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
export default Zsd35ImportPage
