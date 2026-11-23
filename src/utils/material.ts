/** Código e descrição da mesma fonte SAP. Nunca substitui descrição ausente por um produto genérico. */
export function materialLabel(codigo: unknown, descricao?: unknown): string {
  const code = typeof codigo === 'string' ? codigo.trim() : ''
  const description = typeof descricao === 'string' ? descricao.trim() : ''
  return [code || 'Código não informado', description || 'Descrição SAP não disponível'].join(' · ')
}
