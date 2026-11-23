// Clientes explicitamente identificados como teste na carteira do SAP QAS.
// Só a exibição operacional do TMS é filtrada; nenhum documento SAP é alterado.
const clientesTeste=new Map([
 ['20338','TESTE HUB CADASTRO TRES LTDA'],['20341','TESTE HUB CADASTRO QUATRO LTDA'],
 ['20342','TESTE HUB CADASTRO CINCO LTDA'],['20343','TESTE HUB CADASTRO SEIS LTDA'],
 ['20344','TESTE HUB CADASTRO SETE LTDA'],['20347','TESTE HUB CADASTRO NOVE LTDA'],
 ['20348','TESTE HUB ZONA LTDA'],['20351','TESTE HUB SEGURANCA LTDA'],['20355','TESTE PORTAL PETROBRAS']
])
export function pedidoTesteSap(p:{customer_code?:string;customer_name?:string}):boolean {
 const code=String(p.customer_code||'').trim().replace(/^0+/,'')
 return clientesTeste.get(code)===String(p.customer_name||'').trim().toUpperCase()
}
