import React, { useMemo } from 'react'
import { generateQrMatrix } from '@/lib/qrCodeGenerator'

interface QrCodeSvgProps {
  value: string
  size?: number
  className?: string
  color?: string
  bgColor?: string
  margin?: number
}

export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({
  value,
  size = 200,
  className = '',
  color = '#005596',
  bgColor = '#FFFFFF',
  margin = 3,
}) => {
  const { matrix, dim, totalDim, pathData } = useMemo(() => {
    try {
      const mat = generateQrMatrix(value)
      const d = mat.length
      const td = d + margin * 2
      let p = ''
      for (let r = 0; r < d; r++) {
        for (let c = 0; c < d; c++) {
          if (mat[r][c]) {
            p += `M${c + margin},${r + margin}h1v1h-1z `
          }
        }
      }
      return { matrix: mat, dim: d, totalDim: td, pathData: p.trim() }
    } catch (err) {
      console.error('Falha ao gerar QR Code:', err)
      return { matrix: [], dim: 21, totalDim: 27, pathData: '' }
    }
  }, [value, margin])

  return (
    <div
      className={`inline-flex items-center justify-center p-2 rounded-xl bg-white shadow-sm border border-slate-200 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${totalDim} ${totalDim}`}
        width="100%"
        height="100%"
        shapeRendering="crispEdges"
        className="w-full h-full"
      >
        <rect width={totalDim} height={totalDim} fill={bgColor} />
        <path d={pathData} fill={color} />
      </svg>
    </div>
  )
}
