import { useEffect, useState } from 'react'
import type { AuditLogEntity } from '@/domain/rules'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const eventos: Record<string, string> = {
  FILA_ENTRADA: 'Entrada na fila',
  FILA_INDISPONIVEL: 'Marcado como indisponível',
  FILA_EXPIRADA: 'Saída automática após 24 horas',
}
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
})

export function LogsDaFila({ fechar }: { fechar: () => void }) {
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [logs, setLogs] = useState<AuditLogEntity[]>([])
  const [ocupado, setOcupado] = useState(true)
  const [erro, setErro] = useState('')
  const [recarregar, setRecarregar] = useState(0)

  useEffect(() => {
    let ativo = true
    setOcupado(true)
    setErro('')
    pb.collection('audit_logs').getList<AuditLogEntity>(pagina, 50, {
      filter: 'resource = "queue_entries" && (action = "FILA_ENTRADA" || action = "FILA_INDISPONIVEL" || action = "FILA_EXPIRADA")',
      sort: '-created,-id',
      requestKey: null,
    }).then(resultado => {
      if (!ativo) return
      setLogs(resultado.items)
      setTotalPaginas(resultado.totalPages)
    }).catch(() => {
      if (ativo) setErro('Não foi possível consultar o histórico da fila.')
    }).finally(() => {
      if (ativo) setOcupado(false)
    })
    return () => { ativo = false }
  }, [pagina, recarregar])

  return (
    <Dialog open onOpenChange={aberto => { if (!aberto) fechar() }}>
      <DialogContent className="max-w-4xl" aria-busy={ocupado}>
        <DialogHeader>
          <DialogTitle>Logs da fila</DialogTitle>
          <DialogDescription>Histórico de entradas, indisponibilidades e saídas automáticas.</DialogDescription>
        </DialogHeader>
        {ocupado && <p role="status" className="text-sm">Carregando histórico…</p>}
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        {!ocupado && !erro && logs.length === 0 && <p className="text-sm">Nenhum evento registrado.</p>}
        {!ocupado && !erro && logs.length > 0 && (
          <div className="max-h-[55vh] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead><tr>
                <th className="p-2">Data e hora</th><th className="p-2">Evento</th>
                <th className="p-2">Placa</th><th className="p-2">Motorista</th><th className="p-2">Motivo</th>
              </tr></thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-t">
                    <td className="whitespace-nowrap p-2">{log.created ? dataHora.format(new Date(log.created)) : '—'}</td>
                    <td className="p-2">{eventos[log.action]}</td>
                    <td className="p-2 font-mono">{String(log.payload?.placa || '—')}</td>
                    <td className="p-2">{String(log.payload?.motorista || '—')}</td>
                    <td className="p-2">{log.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => setRecarregar(n => n + 1)} disabled={ocupado}>Atualizar</Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPagina(n => n - 1)} disabled={ocupado || pagina <= 1}>Anterior</Button>
            <span className="text-xs">Página {pagina}</span>
            <Button variant="outline" size="sm" onClick={() => setPagina(n => n + 1)} disabled={ocupado || pagina >= totalPaginas}>Próxima</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
