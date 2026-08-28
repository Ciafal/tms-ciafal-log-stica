import React from 'react'
import {
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert,
  Building,
  Smartphone,
  CheckCircle2,
  Lock,
  Clock,
  AlertTriangle,
  BadgePercent,
  TrendingDown,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const FreightOffersPreparationPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Ofertas de Frete & Leilão Escalonado
            </h1>
            <Badge className="bg-amber-500 text-white text-xs font-bold">
              Preparado para Sprint 2
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Módulo arquitetural concebido para oferta em 2 janelas temporais estritas (1º PORTA, 2º
            FORA).
          </p>
        </div>

        <Badge
          variant="outline"
          className="border-amber-400 text-amber-800 bg-amber-50 text-xs px-3 py-1.5 font-bold"
        >
          Funcionalidade Preparada para Sprint 2 (Somente Homologação de Dados)
        </Badge>
      </div>

      {/* Regra de Ouro do Teto Protegido */}
      <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 text-xs text-rose-950 flex items-start space-x-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold text-rose-900 block text-sm">
            SEGURANÇA FINANCEIRA — REGRA CRÍTICA DE TETO PROTEGIDO (HARDENING):
          </strong>
          <p className="text-rose-800 leading-relaxed">
            O valor de <strong>Teto de Frete</strong> é estritamente confidencial. Ele nunca é
            trafegado para o frontend do motorista, nunca é injetado no prompt de LLMs/Chicão e
            permanece isolado nas regras de negócio do backend para evitar vazamentos estratégicos.
          </p>
        </div>
      </div>

      {/* Fluxo Operacional Preparado da Sprint 2 */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#005596]" />
            <span>Fluxo Determinístico de Distribuição de Frete (Sprint 2)</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Regra corporativa imutável de priorização e desempate
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Etapa 1 */}
            <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl space-y-2 relative">
              <div className="w-7 h-7 rounded-full bg-[#005596] text-white flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="font-bold text-sm text-[#005596]">Carga Confirmada</h3>
              <p className="text-xs text-slate-600">
                Ordem de carregamento liberada pelo Gerente de Carga com origem, destino, peso e
                veículo necessário.
              </p>
              <Badge className="bg-sky-200 text-sky-900 text-[10px] font-bold">
                Input de Carga
              </Badge>
            </div>

            {/* Etapa 2 */}
            <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl space-y-2 relative">
              <div className="w-7 h-7 rounded-full bg-[#005596] text-white flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="font-bold text-sm text-[#005596]">Janela Exclusiva PORTA</h3>
              <p className="text-xs text-slate-600">
                Disparo exclusivo para motoristas <strong>PRESENTES NA CIAFAL</strong> (1ª
                Prioridade). Ordem temporal de chegada desempata.
              </p>
              <Badge className="bg-[#005596] text-white text-[10px] font-bold">
                Janela 1 (15-30m)
              </Badge>
            </div>

            {/* Etapa 3 */}
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2 relative">
              <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="font-bold text-sm text-emerald-800">Abertura Janela FORA</h3>
              <p className="text-xs text-slate-600">
                Caso nenhum motorista PORTA aceite, abre-se a 2ª Janela para motoristas{' '}
                <strong>FORA (até 60 km)</strong>.
              </p>
              <Badge className="bg-emerald-700 text-white text-[10px] font-bold">
                Janela 2 (Condicional)
              </Badge>
            </div>

            {/* Etapa 4 */}
            <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl space-y-2">
              <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h3 className="font-bold text-sm text-slate-900">Atribuição & Baixa na Fila</h3>
              <p className="text-xs text-slate-600">
                Vencedor confirmado, status do motorista vai para <code>CARGA_ATRIBUÍDA</code> e sai
                da fila com trilha auditada.
              </p>
              <Badge variant="outline" className="text-slate-800 text-[10px] font-bold">
                Encerramento
              </Badge>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              <strong className="text-slate-900 block mb-0.5">Status de Execução:</strong>
              Entidades de banco (<code>freight_offers</code>) e regras de elegibilidade prontas no
              backend. Botões de ação desabilitados nesta sprint.
            </div>

            <Button disabled className="bg-slate-300 text-slate-500 cursor-not-allowed text-xs">
              Iniciar Oferta Real (Sprint 2)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
