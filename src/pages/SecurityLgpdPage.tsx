import React from 'react'
import {
  ShieldCheck,
  Lock,
  Eye,
  Key,
  Database,
  UserCheck,
  Server,
  FileCheck,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const SecurityLgpdPage: React.FC = () => {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-6 h-6 text-[#005596]" />
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            Segurança da Informação & Governança LGPD
          </h1>
          <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
            COMPLIANCE ATIVO
          </Badge>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Controles de proteção a dados pessoais, prevenção contra enumeração de placas,
          mascaramento e trilha de auditoria imutável.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Consulta Pública Segura por Placa */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center space-x-2 text-slate-800">
              <Lock className="w-4 h-4 text-[#005596]" />
              <span>Proteção na Consulta Pública de Placas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs text-slate-600">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1">
              <strong className="text-slate-900 block">
                Princípios de Segurança Implementados:
              </strong>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>
                  <strong>Rate Limiting:</strong> Máximo de 25 consultas por minuto por IP para
                  impedir varredura automatizada (bot protection).
                </li>
                <li>
                  <strong>Zero Enumeração:</strong> Não existe endpoint público de listagem de
                  motoristas ou veículos.
                </li>
                <li>
                  <strong>Mascaramento Obrigatório:</strong> CPF (***.123.456-**) e telefone ((31)
                  9****-7890) são estritamente mascarados antes de trafegar na resposta.
                </li>
                <li>
                  <strong>Validação Server-Side:</strong> O cálculo de distância e classificação do
                  grupo é executado 100% no servidor.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Termo e Finalidade da Localização */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center space-x-2 text-emerald-700">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Finalidade Específica do GPS (LGPD Art. 6º)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs text-slate-600">
            <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 text-emerald-950 space-y-1">
              <strong className="block">Texto Exibido ao Motorista no Link:</strong>
              <p className="italic text-[11px]">
                "Sua localização será utilizada exclusivamente para classificação de disponibilidade
                logística em relação à CIAFAL (PORTA, FORA ou PROGRAMADO)."
              </p>
            </div>
            <p className="text-[11px] text-slate-500">
              Nenhuma coordenada é reutilizada para rastreamento pessoal contínuo ou qualquer outra
              finalidade alheia à operação logística da planta.
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Matriz de Perfis RBAC */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center space-x-2 text-slate-800">
              <Key className="w-4 h-4 text-[#005596]" />
              <span>Controle de Acesso Baseado em Perfis (RBAC)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs text-slate-600">
            <p className="text-[11px]">
              Autorização validada SEMPRE antes da leitura e mutação do dado:
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="p-2 bg-slate-50 rounded border">
                <strong>Gerente de Carga:</strong> Montagem de cargas, complemento e visualização de
                dados operacionais.
              </div>
              <div className="p-2 bg-slate-50 rounded border">
                <strong>Portaria & Acesso:</strong> Validação de presença física no pátio e
                check-in.
              </div>
              <div className="p-2 bg-slate-50 rounded border">
                <strong>Auditor:</strong> Acesso somente-leitura e inspeção completa da trilha de
                auditoria.
              </div>
              <div className="p-2 bg-slate-50 rounded border">
                <strong>Admin TMS:</strong> Gestão de parâmetros de corte e regras de geofences.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Trilha de Auditoria Imutável */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center space-x-2 text-slate-800">
              <Database className="w-4 h-4 text-[#005596]" />
              <span>Imutabilidade e Rastreabilidade</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs text-slate-600">
            <p className="text-[11px]">
              Todos os eventos críticos são gravados na coleção `audit_logs`:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>Entrada na fila e classificação geográfica calculada</li>
              <li>Tentativas de check-in e transições PORTA / FORA / PROGRAMADO</li>
              <li>Alteração de status por operadores com justificativa obrigatória</li>
              <li>Geração de alertas para o CRM 360° e despacho de mensagens</li>
              <li>Modificação de parâmetros do sistema com estado anterior e novo</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
