/**
 * Gerador de QR Code vetorial puro (sem dependências externas)
 * Implementação padrão ISO/IEC 18004 para versões 1 a 6 (byte mode) com correção de erro nível M.
 * Gera SVG e canvas para exibição nítida em qualquer densidade de tela (Chainway C72 / smartphones / tablets).
 */

// Códigos de erro Reed-Solomon e polinômios geradores para QR Code Versões 1 a 6 (Nível M)
interface QrVersionSpec {
  version: number
  totalCodewords: number
  ecCodewords: number
  dataCodewords: number
  dimension: number
  alignmentPatterns: number[]
}

const QR_SPECS: Record<number, QrVersionSpec> = {
  1: {
    version: 1,
    totalCodewords: 26,
    ecCodewords: 10,
    dataCodewords: 16,
    dimension: 21,
    alignmentPatterns: [],
  },
  2: {
    version: 2,
    totalCodewords: 44,
    ecCodewords: 16,
    dataCodewords: 28,
    dimension: 25,
    alignmentPatterns: [6, 18],
  },
  3: {
    version: 3,
    totalCodewords: 70,
    ecCodewords: 26,
    dataCodewords: 44,
    dimension: 29,
    alignmentPatterns: [6, 22],
  },
  4: {
    version: 4,
    totalCodewords: 100,
    ecCodewords: 36,
    dataCodewords: 64,
    dimension: 33,
    alignmentPatterns: [6, 26],
  },
  5: {
    version: 5,
    totalCodewords: 134,
    ecCodewords: 48,
    dataCodewords: 86,
    dimension: 37,
    alignmentPatterns: [6, 30],
  },
  6: {
    version: 6,
    totalCodewords: 172,
    ecCodewords: 64,
    dataCodewords: 108,
    dimension: 41,
    alignmentPatterns: [6, 34],
  },
}

// Log / Exponencial GF(256) com primitiva 0x11D
const EXP_TABLE = new Uint8Array(512)
const LOG_TABLE = new Uint8Array(256)
;(() => {
  let val = 1
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val
    EXP_TABLE[i + 255] = val
    LOG_TABLE[val] = i
    val = (val << 1) ^ (val & 0x80 ? 0x11d : 0)
  }
})()

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]]
}

function rsGeneratorPoly(numEc: number): number[] {
  let poly = [1]
  for (let i = 0; i < numEc; i++) {
    const next = [1, EXP_TABLE[i]]
    const res = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      for (let k = 0; k < next.length; k++) {
        res[j + k] ^= gfMul(poly[j], next[k])
      }
    }
    poly = res
  }
  return poly
}

function calculateReedSolomon(data: number[], numEc: number): number[] {
  const gen = rsGeneratorPoly(numEc)
  const remainder = new Array(numEc).fill(0)

  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0]
    remainder.shift()
    remainder.push(0)
    if (factor !== 0) {
      for (let j = 0; j < numEc; j++) {
        remainder[j] ^= gfMul(gen[j + 1], factor)
      }
    }
  }
  return remainder
}

/**
 * Codifica string UTF-8 em matriz de bits QR Code
 */
export function generateQrMatrix(text: string): boolean[][] {
  const bytes: number[] = []
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code < 128) {
      bytes.push(code)
    } else if (code < 2048) {
      bytes.push(192 | (code >> 6), 128 | (code & 63))
    } else {
      bytes.push(224 | (code >> 12), 128 | ((code >> 6) & 63), 128 | (code & 63))
    }
  }

  // Determinar versão
  let selectedSpec: QrVersionSpec | null = null
  for (let v = 1; v <= 6; v++) {
    const spec = QR_SPECS[v]
    // 4 bits de modo (8 = byte) + 8 bits de contagem de caractere + bytes*8
    const requiredBits = 4 + 8 + bytes.length * 8
    if (requiredBits <= spec.dataCodewords * 8) {
      selectedSpec = spec
      break
    }
  }

  if (!selectedSpec) {
    selectedSpec = QR_SPECS[6] // fallback para versão 6
  }

  const dim = selectedSpec.dimension

  // Construir fluxo de bits
  const bits: number[] = []
  function pushBits(val: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      bits.push((val >> i) & 1)
    }
  }

  // Modo Byte (0100)
  pushBits(0b0100, 4)
  // Contagem de caracteres (8 bits para versão 1-9)
  pushBits(bytes.length, 8)
  for (const b of bytes) {
    pushBits(b, 8)
  }

  // Terminador (até 4 zeros)
  const maxDataBits = selectedSpec.dataCodewords * 8
  const terminatorLength = Math.min(4, maxDataBits - bits.length)
  for (let i = 0; i < terminatorLength; i++) {
    bits.push(0)
  }

  // Alinhar a byte
  while (bits.length % 8 !== 0) {
    bits.push(0)
  }

  // Preenchimento alternado 0xEC / 0x11
  const padPatterns = [0xec, 0x11]
  let padIdx = 0
  while (bits.length < maxDataBits) {
    pushBits(padPatterns[padIdx % 2], 8)
    padIdx++
  }

  // Converter para codewords de dados
  const dataCodewords: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byteVal = 0
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bits[i + b]
    }
    dataCodewords.push(byteVal)
  }

  // Calcular correção de erro Reed-Solomon
  const ecCodewords = calculateReedSolomon(dataCodewords, selectedSpec.ecCodewords)
  const allCodewords = dataCodewords.concat(ecCodewords)

  // Matriz de módulos
  const matrix: (boolean | null)[][] = Array.from({ length: dim }, () => new Array(dim).fill(null))
  const isFunction: boolean[][] = Array.from({ length: dim }, () => new Array(dim).fill(false))

  function setModule(r: number, c: number, val: boolean) {
    matrix[r][c] = val
    isFunction[r][c] = true
  }

  // 1. Finder patterns (3 cantos)
  const finders = [
    [0, 0],
    [dim - 7, 0],
    [0, dim - 7],
  ]
  for (const [r0, c0] of finders) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBlack =
          r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        setModule(r0 + r, c0 + c, isBlack)
      }
    }
  }

  // Separators em volta dos finders
  for (let i = 0; i < 8; i++) {
    // Top-left
    if (i < 8 && 7 < dim) {
      setModule(7, i, false)
      setModule(i, 7, false)
    }
    // Bottom-left
    if (dim - 8 >= 0) {
      setModule(dim - 8, i, false)
      setModule(dim - 1 - i, 7, false)
    }
    // Top-right
    if (dim - 8 >= 0) {
      setModule(7, dim - 1 - i, false)
      setModule(i, dim - 8, false)
    }
  }

  // 2. Timing patterns (linhas 6)
  for (let i = 8; i < dim - 8; i++) {
    const val = i % 2 === 0
    if (!isFunction[6][i]) setModule(6, i, val)
    if (!isFunction[i][6]) setModule(i, 6, val)
  }

  // 3. Alignment patterns (se houver)
  if (selectedSpec.alignmentPatterns.length > 0) {
    const coords = selectedSpec.alignmentPatterns
    for (const r0 of coords) {
      for (const c0 of coords) {
        // Ignora se colidir com finders
        if ((r0 <= 8 && c0 <= 8) || (r0 <= 8 && c0 >= dim - 8) || (r0 >= dim - 8 && c0 <= 8)) {
          continue
        }
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const isBlack = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)
            setModule(r0 + r, c0 + c, isBlack)
          }
        }
      }
    }
  }

  // 4. Dark module
  setModule(dim - 8, 8, true)

  // 5. Reservar área de Format Information
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true
    if (!isFunction[i][8]) isFunction[i][8] = true
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][dim - 1 - i]) isFunction[8][dim - 1 - i] = true
    if (!isFunction[dim - 1 - i][8]) isFunction[dim - 1 - i][8] = true
  }

  // 6. Colocar dados nos módulos livres (zig-zag da direita para a esquerda)
  const bitArray: number[] = []
  for (const cw of allCodewords) {
    for (let i = 7; i >= 0; i--) {
      bitArray.push((cw >> i) & 1)
    }
  }

  let bitIdx = 0
  let upward = true
  for (let right = dim - 1; right > 0; right -= 2) {
    if (right === 6) right-- // Pula a linha de timing vertical
    for (let vert = 0; vert < dim; vert++) {
      const r = upward ? dim - 1 - vert : vert
      for (let c = right; c >= right - 1; c--) {
        if (!isFunction[r][c]) {
          const bit = bitIdx < bitArray.length ? bitArray[bitIdx++] === 1 : false
          // Aplicar máscara 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0
          matrix[r][c] = mask ? !bit : bit
        }
      }
    }
    upward = !upward
  }

  // 7. Escrever Format Information (Nível M = 00, Máscara 0 = 000 => 00000 com BCH = 101010000010010)
  // Mask XOR 101010000010010 ^ 101010000010010 = 0
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0]
  // Top-left
  const formatOrder1 = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ]
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatOrder1[i]
    matrix[r][c] = formatBits[i] === 1
  }

  // Divisão ao redor dos outros dois cantos
  for (let i = 0; i < 7; i++) {
    matrix[dim - 1 - i][8] = formatBits[i] === 1
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][dim - 8 + i] = formatBits[7 + i] === 1
  }

  // Converter null em false
  const cleanMatrix: boolean[][] = []
  for (let r = 0; r < dim; r++) {
    cleanMatrix[r] = []
    for (let c = 0; c < dim; c++) {
      cleanMatrix[r][c] = Boolean(matrix[r][c])
    }
  }

  return cleanMatrix
}

/**
 * Converte a matriz de bits em SVG compacto com margem de segurança (quiet zone)
 */
export function generateQrSvgString(
  text: string,
  options?: { size?: number; margin?: number; color?: string; bgColor?: string },
): string {
  const matrix = generateQrMatrix(text)
  const dim = matrix.length
  const margin = options?.margin ?? 4
  const totalDim = dim + margin * 2
  const color = options?.color || '#005596'
  const bgColor = options?.bgColor || '#FFFFFF'

  let paths = ''
  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      if (matrix[r][c]) {
        paths += `M${c + margin},${r + margin}h1v1h-1z `
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalDim} ${totalDim}" width="100%" height="100%" shape-rendering="crispEdges">
    <rect width="${totalDim}" height="${totalDim}" fill="${bgColor}" />
    <path d="${paths.trim()}" fill="${color}" />
  </svg>`
}
