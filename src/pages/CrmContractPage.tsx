import React, { useState } from 'react'
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Lock,
  ArrowRightLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { crmService } from '@/domain/crmIntegration'

export const CrmContractPage: React.FC = () => {
  const { toast } = useToast()
  const [contractConfig, setContractConfig] = useState(crmService.getContractConfig())
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  const handleTestCrm = async () => {
    setIsTesting(true)
    try {
      const res = await crmService.testCrmConnection()
      setTestResult(res)
      toast({
        title: 'Teste de Conexão CRM 360° Concluído',
        description: res.message,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha no teste CRM',
        description: err?.message || 'Erro ao conectar com API CRM 360°.',
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
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              CRM 360° — Contrato & Homologação Técnica
            </h1>
            <Badge className="bg-emerald-600 text-white text-xs">Ação Comercial</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Plataforma de relacionamento com clientes e disparo de oportunidades de complemento de
            carga.
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
            onClick={handleTestCrm}
            disabled={isTesting}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            Testar Conexão CRM
          </Button>
        </div>
      </div>

      {/* Contract Architecture Guidelines */}
      <div className="bg-slate-900 text-white p-4 rounded-xl text-xs space-y-2 border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 text-emerald-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>DIRETRIZES DE INTEGRAÇÃO DO CRM 360°:</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          1) <strong>TMS → CRM:</strong> Envio de solicitação de complemento de carga e
          oportunidades logísticas com <code>correlation_id</code> idempotente.
          <br />
          2) <strong>CRM → TMS:</strong> Webhook seguro com assinatura HMAC SHA-256, proteção contra
          replay attacks (janela de 300s) e rate limiting.
          <br />
          3) <strong>Validação Oficial:</strong> O TMS somente consolida novo pedido na carga após o
          espelho oficial retornado pelo SAP ECC 6.0 (ZSD35).
        </p>
      </div>

      {/* Test Result Alert if executed */}
      {testResult && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Resultado do Teste CRM 360° (Correlation ID: {testResult.correlationId})
            </span>
            <span className="text-emerald-700 font-mono">
              Status HTTP: {testResult.responseCode} | Latência: {testResult.latencyMs} ms
            </span>
          </div>
          <p className="text-emerald-800">{testResult.message}</p>
        </div>
      )}

      {/* Technical Contract Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Fluxos de Negócio & Contratos Ativos
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Mapeamento de endpoints e regras de idempotência.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs">
            <div className="space-y-2">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>1. TMS → CRM: Oportunidade Logística</span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800">
                    POST /oportunidades
                  </Badge>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Dispara oportunidade de frete/complemento para os vendedores da região.
                </p>
              </div>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>2. CRM → TMS: Status do Complemento</span>
                  <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-800">
                    Webhook Seguro
                  </Badge>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Retorna status da negociação: Em análise, Cliente contatado, Cotação criada,
                  Pedido gerado.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Segurança do Webhook & Rate Limiting
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Assinatura HMAC, prevenção de replay e isolamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Autenticação Webhook
                </span>
                <span className="font-bold text-slate-800 text-[11px]">
                  {contractConfig.authType}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Rate Limit
                </span>
                <span className="font-bold text-slate-800 text-[11px]">
                  {contractConfig.rateLimitPerMinute} req/min
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Replay Protection
                </span>
                <span className="font-bold text-slate-800 text-[11px]">
                  Janela de {contractConfig.replayProtectionSeconds}s
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Idempotência
                </span>
                <span className="font-bold text-emerald-700 text-[11px]">
                  Ativa (External ID / Correlation ID)
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Webhook URL Registrada:
              </span>
              <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded text-[11px] block">
                {contractConfig.webhookUrl}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
