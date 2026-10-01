/**
 * MHTML Parser para Arquivos de Exportação SAP ZSD004
 * Converte arquivos Multipart HTML (.mhtml / .mht / .xlxs.MHTML) em tabelas normalizadas.
 */

import { SapZsd004Record, normalizeZsd004Record } from './zsd004Engine'

export interface MhtmlParseResult {
  success: boolean
  records: SapZsd004Record[]
  headers: string[]
  totalRows: number
  warnings: string[]
}

/**
 * Decodifica Quoted-Printable (padrão MHTML)
 */
export function decodeQuotedPrintable(str: string): string {
  // Remove quebras de linha com soft break '='
  const noSoftBreaks = str.replace(/=\r?\n/g, '')
  // Substitui bytes hex =XX
  return noSoftBreaks.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16))
    } catch {
      return ''
    }
  })
}

/**
 * Extrai a tabela HTML embutida no corpo do arquivo MHTML
 */
export function extractHtmlTableFromMhtml(mhtmlContent: string): string {
  let bodyContent = mhtmlContent

  // Se for formato multipart MHTML, extrair o bloco HTML
  if (mhtmlContent.includes('Content-Type: text/html')) {
    const parts = mhtmlContent.split(/------?=_NextPart_[^\r\n]+/)
    for (const part of parts) {
      if (part.includes('Content-Type: text/html')) {
        const bodyStart =
          part.indexOf('\r\n\r\n') !== -1 ? part.indexOf('\r\n\r\n') + 4 : part.indexOf('\n\n') + 2
        bodyContent = part.slice(bodyStart)
        if (part.includes('Content-Transfer-Encoding: quoted-printable')) {
          bodyContent = decodeQuotedPrintable(bodyContent)
        }
        break
      }
    }
  }

  return bodyContent
}

/**
 * Realiza o parse da tabela HTML SAP gerada por exportação de ALV
 */
export function parseSapHtmlTable(html: string, fileName = 'ZSD004.xlxs.MHTML'): MhtmlParseResult {
  const warnings: string[] = []
  const records: SapZsd004Record[] = []
  const headers: string[] = []

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const table = doc.querySelector('table')

    if (!table) {
      return {
        success: false,
        records: [],
        headers: [],
        totalRows: 0,
        warnings: ['Nenhuma tabela HTML encontrada no conteúdo fornecido.'],
      }
    }

    const rows = Array.from(table.querySelectorAll('tr'))
    if (rows.length === 0) {
      return {
        success: false,
        records: [],
        headers: [],
        totalRows: 0,
        warnings: ['Tabela sem linhas.'],
      }
    }

    // Primeira linha de cabeçalho
    const headerRow = rows[0]
    const headerCells = Array.from(headerRow.querySelectorAll('th, td'))
    headerCells.forEach((c) => {
      headers.push((c.textContent || '').trim())
    })

    // Linhas de dados
    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td'))
      if (cells.length === 0) continue

      const rawRow: Record<string, string> = {}
      cells.forEach((cell, idx) => {
        const headerName = headers[idx] || `COL_${idx}`
        rawRow[headerName] = (cell.textContent || '').trim()
      })

      const norm = normalizeZsd004Record(rawRow, 'MHTML_TEMP', fileName)
      records.push(norm)
    }

    return {
      success: true,
      records,
      headers,
      totalRows: records.length,
      warnings,
    }
  } catch (err: any) {
    return {
      success: false,
      records: [],
      headers: [],
      totalRows: 0,
      warnings: [`Erro no parser MHTML: ${err?.message || 'Falha desconhecida'}`],
    }
  }
}
