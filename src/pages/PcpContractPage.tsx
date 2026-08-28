import React, { useState } from 'react'
import {
  FileText,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Send,
  Zap,
  ShieldCheck,
  RefreshCw,
  Clock,
  Radio,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { pcpService } from '@/domain/pcpIntegration'

export const PcpContractPage: React.FC = () => {
  const { toast } = useToast()
  const [contractConfig, setContractConfig] = useState(pcpService.getContractConfig())
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  const handleTestPcp = async () => {
    setIsTesting(true)
    try {
      const res = await pcpService.testPcpConnection()
      setTestResult(res)
      toast({
        title: 'Teste de Conexão PCP Concluído',
        description: res.message,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha no teste PCP',
        description: err?.message || 'Erro de comunicação com endpoint PCP.',
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Layers className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              PCP Robotizado — Contrato & Homologação Técnica
            </h1>
            <Badge className="bg-blue-600 text-white text-xs">Automação Industrial</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Programação operacional das linhas de produção de laminados e previsão de estoque
            futuro.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-900 border-amber-300 font-bold px-3 py-1"
          >
            Status: {contractConfig.isHomologated ? 'Homologado' : 'Pronta para teste'}
          </Badge>
          <Button
            size="sm"
            onClick={handleTestPcp}
            disabled={isTesting}
            className="text-xs bg-blue-600 hover:bg-blue-700 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            Testar Conexão PCP
          </Button>
        </div>
      </div>

      {/* Contract Architecture Guidelines */}
      <div className="bg-slate-900 text-white p-4 rounded-xl text-xs space-y-2 border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 text-sky-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>DIRETRIZ ARQUITETURAL DO PCP ROBOTIZADO:</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          O PCP Robotizado é a <strong>fonte da programação operacional de produção</strong>. Não
          substitui o planejamento mestre do SAP. Dados futuros representam{' '}
          <strong>PREVISÃO</strong>, nunca saldo em estoque garantido. Se o payload recebido estiver
          fora do schema, o barramento rejeita imediatamente com{' '}
          <code className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded">
            SCHEMA_INCOMPATIVEL
          </code>
          .
        </p>
      </div>

      {/* Test Result Alert if executed */}
      {testResult && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Resultado do Teste de Conectividade & Schema (Correlation ID:{' '}
              {testResult.correlationId})
            </span>
            <span className="text-emerald-700 font-mono">Latência: {testResult.latencyMs} ms</span>
          </div>
          <p className="text-emerald-800">{testResult.message}</p>
        </div>
      )}

      {/* Technical Contract Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Parâmetros do Contrato de Integração
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Especificação de endpoints, protocolos, timeouts e autenticação mTLS.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Endpoint Mascarado
                </span>
                <span className="font-mono font-bold text-slate-800 text-[11px] truncate block">
                  {contractConfig.endpoint.substring(0, 32)}***
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Versão do Contrato
                </span>
                <span className="font-bold text-slate-800 text-[11px]">
                  {contractConfig.version}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Método HTTP / Protocolo
                </span>
                <span className="font-bold text-slate-800 text-[11px]">
                  {contractConfig.httpMethod}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Autenticação
                </span>
                <span className="font-bold text-emerald-700 text-[11px]">
                  {contractConfig.authType}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Frequência de Sincronização
                </span>
                <span className="font-bold text-slate-800 text-[11px]">
                  A cada {contractConfig.frequencyMinutes} minutos
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Timeout Limite
                </span>
                <span className="font-bold text-slate-800 text-[11px]">
                  {contractConfig.timeoutMs} ms (Circuit Breaker: 3 falhas)
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Health Check URL:
              </span>
              <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded text-[11px] block">
                {contractConfig.healthCheckUrl}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Schema de Dados Previsto (JSON Contrato)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Estrutura estrita de dados validada pelo motor de recepção.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs">
            <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
              <pre>{JSON.stringify(JSON.parse(contractConfig.expectedPayloadSchema), null, 2)}</pre>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-amber-900 text-[11px] space-y-1">
              <span className="font-bold block">Campos a Confirmar com Equipe PCP:</span>
              <p>
                Os campos <code>turno</code>, <code>sequencia</code> e <code>versao</code> estão em
                fase de homologação técnica.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
