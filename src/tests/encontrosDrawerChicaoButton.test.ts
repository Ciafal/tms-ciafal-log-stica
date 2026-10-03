import { describe, it, expect } from 'vitest'

// Leitura do arquivo como texto estático via import raw do Vite
import content from '../components/load-planner/EncontrosDrawer.tsx?raw'

describe('Validação do Botão "Enviar ao Chicão" em EncontrosDrawer.tsx', () => {
  it('A) deve importar primitivas de Tooltip de "@/components/ui/tooltip"', () => {
    expect(content).toMatch(/import\s*\{[^}]*Tooltip[^}]*\}\s*from\s*['"]@\/components\/ui\/tooltip['"]/)
    expect(content).toMatch(/TooltipProvider/)
    expect(content).toMatch(/TooltipContent/)
    expect(content).toMatch(/TooltipTrigger/)
  })

  it('B) Botão SEMPRE renderizado: sem condição matches.length > 0 para esconder o botão', () => {
    // Não deve haver renderização condicional que oculte o botão quando matches.length === 0
    expect(content).not.toMatch(/matches\.length\s*>\s*0\s*&&[\s\S]*?Enviar ao Chicão/)
    expect(content).not.toMatch(/currentTabMatches\.length\s*>\s*0\s*&&[\s\S]*?Enviar ao Chicão/)
  })

  it('C) Label exato "Enviar ao Chicão": nunca o antigo "Enviar Chicão" e UM único botão de envio em lote', () => {
    expect(content).not.toMatch(/<span>Enviar Chicão<\/span>/)
    expect(content).not.toMatch(/>\s*Enviar Chicão\s*</)
    expect(content).toMatch(/<span>Enviar ao Chicão<\/span>/)
    expect(content).toMatch(/<span>Enviar ao Chicão \(\{selectedMatchIds\.size\}\)<\/span>/)
  })

  it('D) Estado desabilitado (0 selecionados): visível com alto contraste, border-slate-300, text-slate-700, ícone cinza escuro, opacity compensada', () => {
    expect(content).toMatch(/disabled/)
    expect(content).toMatch(/border-slate-300/)
    expect(content).toMatch(/text-slate-700/)
    expect(content).toMatch(/text-slate-600/)
    expect(content).toMatch(/cursor-not-allowed/)
    expect(content).toMatch(/disabled:opacity-90/)
  })

  it('E) Tooltip no estado desabilitado com mensagem prescrita encapsulada em span inline-block', () => {
    expect(content).toMatch(/<span className="inline-block">/)
    expect(content).toMatch(
      /Selecione pelo menos um encontro veículo × carga para enviar ao Chicão\./,
    )
  })

  it('F) Estado ativo (≥1 selecionados): azul institucional CIAFAL #005596, hover #004275, texto e ícone brancos, cursor pointer', () => {
    expect(content).toMatch(/bg-\[#005596\]/)
    expect(content).toMatch(/hover:bg-\[#004275\]/)
    expect(content).toMatch(/text-white/)
    expect(content).toMatch(/cursor-pointer/)
  })

  it('G) Layout e responsividade: flex-wrap, whitespace-nowrap, alinhamento à direita dentro da mesma barra', () => {
    expect(content).toMatch(/flex flex-wrap items-center justify-between gap-3/)
    expect(content).toMatch(/whitespace-nowrap/)
  })

  it('H) Modal de confirmação: título "Enviar ao Chicão", descrição prescrita, resumo detalhado e botão confirmar', () => {
    expect(content).toMatch(/<DialogTitle[^>]*>\s*Enviar ao Chicão\s*<\/DialogTitle>/)
    expect(content).toMatch(
      /Você selecionou \{selectedMatchesList\.length\} encontro\(s\) veículo × carga para envio à Mesa de Fretes e início da negociação pelo Chicão\./,
    )
    expect(content).toMatch(/Tonelagem/)
    expect(content).toMatch(/Nº Descargas/)
    expect(content).toMatch(/Km Total/)
    expect(content).toMatch(/Tempo Estimado/)
    expect(content).toMatch(/Valor Ofertado/)
    expect(content).toMatch(/Confirmar envio ao Chicão/)
  })

  it('I) Despacho cobre todos os campos operacionais exigidos (ID oferta, motorista, whatsapp, veículo, carga, restrições, observações)', () => {
    expect(content).toMatch(/offer_id:/)
    expect(content).toMatch(/driver_name:/)
    expect(content).toMatch(/driver_whatsapp:/)
    expect(content).toMatch(/vehicle_plate:/)
    expect(content).toMatch(/vehicle_body_type:/)
    expect(content).toMatch(/vehicle_capacity_kg:/)
    expect(content).toMatch(/origin:/)
    expect(content).toMatch(/destination_city:/)
    expect(content).toMatch(/destination_uf:/)
    expect(content).toMatch(/itinerary_code:/)
    expect(content).toMatch(/customers_count:/)
    expect(content).toMatch(/discharges_count:/)
    expect(content).toMatch(/weight_ton:/)
    expect(content).toMatch(/distance_km:/)
    expect(content).toMatch(/estimated_time_hours:/)
    expect(content).toMatch(/freight_value:/)
    expect(content).toMatch(/toll_cost:/)
    expect(content).toMatch(/logistic_restrictions:/)
    expect(content).toMatch(/observations:/)
  })
})
