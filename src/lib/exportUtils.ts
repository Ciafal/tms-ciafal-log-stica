// TMS CIAFAL — Exportadores de Documentos Técnicos para Consultoria e Auditoria
// Formatos: CSV com UTF-8 BOM, XLSX estruturado e PDF via Layout de Impressão A4 estilizado

export interface BlueprintExportItem {
  id: string
  process_name: string
  tms_module: string
  origin_system: string
  object_type: string
  table_or_view: string
  sap_object: string
  sap_field: string
  sap_field_description: string
  tms_field: string
  direction: string
  frequency: string
  business_key: string
  expected_volume: string
  delta_mechanism: string
  recommended_integration_type: string
  rfc_bapi_idoc: string
  technical_status: string
  responsible: string
  pending_item: string
  notes: string
}

export interface ChecklistExportItem {
  id: string
  fluxo: string
  assunto: string
  pergunta: string
  contexto: string
  impactoTMS: string
  status: string
  responsavel: string
}

/**
 * Exporta dados tabulares para CSV com cabeçalho e caractere BOM UTF-8
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const sanitize = (val: string | number) => {
    const s = String(val ?? '').replace(/"/g, '""')
    return `"${s}"`
  }

  const csvRows = [
    headers.map(sanitize).join(';'),
    ...rows.map((row) => row.map(sanitize).join(';')),
  ]

  const csvContent = '\uFEFF' + csvRows.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exporta para arquivo formatado como planilha XML/Excel (compatível nativamente com Excel XLSX)
 */
export function exportToXlsxXml(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const sanitize = (val: string | number) => {
    return String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#005596" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Default">
   <Alignment ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${sanitize(sheetName)}">
  <Table>
   <Row ss:Height="24">
`
  headers.forEach((h) => {
    xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${sanitize(h)}</Data></Cell>\n`
  })
  xml += `   </Row>\n`

  rows.forEach((row) => {
    xml += `   <Row ss:Height="18">\n`
    row.forEach((cell) => {
      xml += `    <Cell ss:StyleID="Default"><Data ss:Type="String">${sanitize(cell)}</Data></Cell>\n`
    })
    xml += `   </Row>\n`
  })

  xml += `  </Table>
 </Worksheet>
</Workbook>`

  const blob = new Blob([xml], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute(
    'download',
    filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`,
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Dispara impressão / salvar PDF da janela atual com título customizado
 */
export function triggerPrintPdf(docTitle?: string): void {
  const originalTitle = document.title
  if (docTitle) {
    document.title = docTitle
  }
  window.print()
  setTimeout(() => {
    document.title = originalTitle
  }, 1000)
}
