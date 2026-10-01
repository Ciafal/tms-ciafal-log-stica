# Auditoria de Pré-requisitos Técnicos — Transação SAP ZWMT001 / Programa ZWMR001

**Projeto:** TMS CIAFAL Logística — Siderurgia e Distribuição  
**Data:** 31 de Agosto de 2026  
**Status do Pré-requisito:** **BLOQUEANTE — ARQUIVOS NÃO LOCALIZADOS**  
**Resultado da Verificação:** `arquivo ABAP ZWMR001 não encontrado no projeto — necessário reenvio`

---

## 1. Diretriz Obrigatória e Condição Precedente

Conforme determinação funcional estrita do projeto TMS CIAFAL:

- A referência funcional obrigatória e mandatória para a implementação do Coletor de Expedição (recriação da transação SAP `ZWMT001` / programa `ZWMR001` para coletores Chainway C72) é a leitura e mapeamento integral dos quatro códigos-fonte ABAP:
  1. `ZWMR001TOP` (Declarações globais, estruturas de tela e dados)
  2. `ZWMR001F01` (Sub-rotinas / FORMs de busca, validações, cálculos e chamadas BAPI/RFC)
  3. `ZWMR001I01` (Módulos PAI / Input: eventos de tela, leitura de códigos de barras, comandos de usuário)
  4. `ZWMR001O01` (Módulos PBO / Output: status GUI, preparação de telas e dynpros)
- Regra de Ouro do Projeto: Caso os arquivos não estejam disponíveis no projeto, **NÃO implementar o Coletor**, **NÃO inventar regras de negócio**, **NÃO criar mocks permanentes**, e **NÃO reproduzir regras ABAP de memória** (precedente idêntico ao estabelecido na integração ZSD004).

---

## 2. Rastreamento e Busca Exaustiva Executada

Foi executada varredura completa no ambiente do projeto:

| Escopo / Localização Verificada                               | Método de Busca        | Termos / Padrões Pesquisados                                                         | Resultado                                        |
| ------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| **Anexos da Mensagem (Uploads)**                              | `save_uploaded_assets` | Todos os arquivos anexados à tarefa                                                  | Nenhum anexo encontrado (`No attachments found`) |
| **Raiz do Projeto (`./`)**                                    | `glob`, `list_dir`     | `*ZWMR*`, `*ZWMT*`, `*.abap`, `*.ABAP`, `*.txt`, `*.mhtml`                           | Nenhum arquivo localizado                        |
| **Subdiretórios (`src/`, `docs/`, `public/`, `pocketbase/`)** | `glob`, `grep`         | `**/*ZWMR*`, `**/*ZWMT*`, `**/*.abap`, `**/*.ABAP`                                   | Nenhum arquivo localizado                        |
| **Assets (`src/assets/`, `public/`)**                         | `list_dir`, `glob`     | Imagens e arquivos transferidos                                                      | Apenas `logo-ciafal` e `zsd35cargaskippreview`   |
| **Conteúdo do Código-fonte (`src/`)**                         | `grep`                 | Strings `ZWMR001`, `ZWMR001TOP`, `ZWMR001F01`, `ZWMR001I01`, `ZWMR001O01`, `ZWMT001` | Nenhuma ocorrência no projeto                    |

---

## 3. Conclusão e Próximos Passos

1. **Parada Imediata de Desenvolvimento:**  
   Em conformidade estrita com a regra do projeto, o desenvolvimento do módulo Coletor e de qualquer regra de picking/WM/LQUA/MCHB sem o fonte oficial está formalmente suspenso até o reenvio dos arquivos ABAP.
2. **Ação Requerida:**  
   Reenvio ou disponibilização no projeto dos 4 arquivos do programa `ZWMR001`:
   - `ZWMR001TOP`
   - `ZWMR001F01`
   - `ZWMR001I01`
   - `ZWMR001O01`
3. **Pós-disponibilização:**  
   Assim que os 4 arquivos forem disponibilizados, será gerada a matriz de paridade integral `Função ABAP atual → Regra de negócio → Dados SAP → Nova função HUB` cobrindo todas as FORM e MODULE ativas antes de qualquer codificação.
