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
import { Link } from 'react-router-dom'
import { crmService } from '@/domain/crmIntegration'
import { Bot, Truck, MapPin, Search, Building2 } from 'lucide-react'

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

      {/* Módulo Especial Fred: Consulta Integrada do Vendedor / Representante */}
      <div className="bg-white p-5 rounded-xl border border-sky-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#005596] text-white flex items-center justify-center font-bold shadow-sm">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  Visão 360º de Cargas em Trânsito & Assistente Fred
                </h2>
                <Badge className="bg-sky-600 text-white text-[10px] font-bold">
                  CRM 360º CIAFAL
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                O vendedor/representante consulta a logística dos seus clientes e envia orientações
                operacionais sem sair do CRM.
              </p>
            </div>
          </div>

          <Link to="/tms/agente-fred">
            <Button
              size="sm"
              className="bg-[#005596] hover:bg-[#004275] text-white text-xs font-bold shadow-sm"
            >
              <Bot className="w-3.5 h-3.5 mr-1.5" />
              Perguntar ao Fred
            </Button>
          </Link>
        </div>

        {/* Exemplo de Carga em Trânsito vinculada aos clientes do vendedor */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-[#005596]">Transporte SAP 123456</span>
              <Badge variant="outline" className="font-mono text-[10px] font-bold bg-white">
                BRA2E19 (João Carlos Silva)
              </Badge>
              <Badge className="bg-amber-500 text-white text-[9px] font-bold">
                🟡 Risco (+18m)
              </Badge>
            </div>

            <span className="text-[11px] text-slate-500 font-mono">
              Destino: Comercial ABC Metais (Betim/MG)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Status Viagem</span>
              <span className="font-bold text-slate-800">🚚 Em rota (BR-381)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Previsão (ETA)</span>
              <span className="font-bold text-amber-600">15:18 (Janela até 16:00)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">
                Entregas Realizadas
              </span>
              <span className="font-bold text-emerald-700">2 de 4 concluídas</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Ocorrências Ativas</span>
              <span className="font-bold text-slate-800">Obras na BR-381 km 530</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              💬{' '}
              <em>
                "Marcos, o motorista está próximo ao seu cliente Comercial ABC. A previsão é 15:18
                pela Portaria 2."
              </em>
            </span>

            <Link to="/tms/transporte/123456">
              <Button size="sm" variant="outline" className="text-xs font-bold border-slate-300">
                Ver Transporte 360º
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Contract Architecture Guidelines */}
      <div className="bg-sky-50/70 text-slate-800 p-4 rounded-xl text-xs space-y-2 border border-sky-200 shadow-none">
        <div className="flex items-center space-x-2 text-[#005596] font-bold">
          <ShieldCheck className="w-4 h-4 text-[#005596]" />
          <span>DIRETRIZES DE INTEGRAÇÃO DO CRM 360°:</span>
        </div>
        <p className="text-slate-600 leading-relaxed">
          1) <strong>TMS → CRM:</strong> Envio de solicitação de complemento de carga e
          oportunidades logísticas com <code>correlation_id</code> idempotente.
          <br />
          2) <strong>CRM → TMS:</strong> Webhook seguro com assinatura HMAC SHA-256, proteção contra
          replay attacks (janela de 300 s) e rate limiting.
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

      {/* Score Logístico do Cliente — Visão Integrada CRM 360º & Apoio ao Vendedor */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#005596]" />
            <h2 className="text-base font-black text-slate-900">
              Score Logístico do Cliente — Visão 360º de Desempenho Operacional
            </h2>
          </div>
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
            Uso Interno TMS / CRM (Confidencial)
          </Badge>
        </div>
        <p className="text-xs text-slate-500">
          Apoio direto ao vendedor e representante comercial para antecipação de problemas de
          descarga, formação justa do preço de frete e roteirização otimizada.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-900">Estruturas Metálicas ABC</span>
              <Badge className="bg-amber-600 text-white text-[9px]">Score 64/100 (Regular)</Badge>
            </div>
            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div>
                Espera Média: <strong>68 min</strong> (P90 descarga: 175m)
              </div>
              <div>
                Janela Cumprida: <strong className="text-amber-700">72%</strong>
              </div>
              <div>
                Avaliação dos Motoristas: <strong>3.1 / 5.0</strong>
              </div>
            </div>
            <div className="p-2 bg-amber-50 rounded border border-amber-200 text-[10px] text-amber-900">
              <strong>Alerta Comercial:</strong> Recomenda-se acréscimo de R$ 180 na diária/frete
              para compensar tempo parado.
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-900">Metalúrgica Campinas S.A.</span>
              <Badge className="bg-emerald-600 text-white text-[9px]">
                Score 93/100 (Excelente)
              </Badge>
            </div>
            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div>
                Espera Média: <strong>15 min</strong> (P90 descarga: 55m)
              </div>
              <div>
                Janela Cumprida: <strong className="text-emerald-700">98%</strong>
              </div>
              <div>
                Avaliação dos Motoristas: <strong>4.9 / 5.0</strong>
              </div>
            </div>
            <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-[10px] text-emerald-900">
              <strong>Fluidez Total:</strong> Excelente estrutura de descarregamento contínuo.
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-900">Ferragens Triângulo Ltda</span>
              <Badge className="bg-[#005596] text-white text-[9px]">Score 82/100 (Bom)</Badge>
            </div>
            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div>
                Espera Média: <strong>28 min</strong> (P90 descarga: 75m)
              </div>
              <div>
                Janela Cumprida: <strong className="text-slate-800">88%</strong>
              </div>
              <div>
                Avaliação dos Motoristas: <strong>4.2 / 5.0</strong>
              </div>
            </div>
            <div className="p-2 bg-sky-50 rounded border border-sky-200 text-[10px] text-sky-900">
              <strong>Restrição de Veículo:</strong> Acesso urbano estreito. Priorizar caminhão
              Truck.
            </div>
          </div>
        </div>
      </div>

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
