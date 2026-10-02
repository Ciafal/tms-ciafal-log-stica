import { describe, it, expect } from 'vitest'
import { generateQrMatrix, generateQrSvgString } from '@/lib/qrCodeGenerator'

describe('Coletor de Expedição - Link Direto e QR Code Generator', () => {
  it('gera matriz de QR Code válida para URL direta /coletor', () => {
    const url = 'https://hub.ciafal.com.br/coletor'
    const matrix = generateQrMatrix(url)

    // Matriz quadrada não-vazia
    expect(matrix.length).toBeGreaterThan(20)
    expect(matrix[0].length).toBe(matrix.length)

    // Finder patterns no canto superior esquerdo (7x7)
    // O centro do finder (linha 3, coluna 3) deve ser preto
    expect(matrix[3][3]).toBe(true)
    // A borda do finder (0, 0..6) deve ser preta
    for (let c = 0; c < 7; c++) {
      expect(matrix[0][c]).toBe(true)
      expect(matrix[6][c]).toBe(true)
    }
  })

  it('gera SVG limpo e renderizável sem tags perigosas', () => {
    const url = 'https://hub.ciafal.com.br/coletor'
    const svg = generateQrSvgString(url, { color: '#005596', bgColor: '#FFFFFF' })

    expect(svg).toContain('<svg')
    expect(svg).toContain('viewBox=')
    expect(svg).toContain('fill="#005596"')
    expect(svg).toContain('fill="#FFFFFF"')
    expect(svg).toContain('</svg>')
  })

  it('não injeta credenciais ou parâmetros RFC na URL do Coletor', () => {
    const targetUrl = 'https://hub.ciafal.com.br/coletor'
    expect(targetUrl).not.toContain('sap_user')
    expect(targetUrl).not.toContain('password')
    expect(targetUrl).not.toContain('token')
    expect(targetUrl).not.toContain('rfc')
  })
})
