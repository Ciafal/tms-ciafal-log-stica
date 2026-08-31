# Inventário Técnico de Dados Fictícios e Saneamento QAS

**TMS CIAFAL Logística — Siderurgia e Distribuição**
**Data de Emissão:** 31 de Agosto de 2026  
**Ambiente:** QAS / Homologação Skip Cloud (PocketBase v0.36 + React TypeScript)  
**Status da Execução:** Primeira Fatia do Saneamento QAS Concluída  
**Responsável Técnico:** Equipe de Engenharia e Saneamento QAS CIAFAL

---

## 1. Contexto e Diretrizes do Saneamento

O objetivo deste inventário técnico é mapear rigorosamente todas as ocorrências de dados fictícios, dados demonstrativos (_mocks_, _seeds_, _samples_, _placeholders_ e _fallbacks_) presentes tanto na base de dados transacional quanto na camada de código-fonte (React, TypeScript, engines e serviços).

### 1.1 Princípio de Preservação e Governança

- **Dados Preservados (NÃO DELETAR):**
  - Usuários e credenciais de acesso (`users`);
  - Perfis, permissões e RBAC;
  - Parâmetros mestres do sistema (`system_parameters`);
  - Cadastros técnicos e operacionais de base (`drivers`, `vehicles`, `whitelist_ips`);
  - Mapeamentos de integração SAP/BAPI/RFC (`sap_blueprint_mappings`, `zsd35_column_mappings`);
  - Tabelas de taxas e resoluções ANTT oficiais (`antt_rate_tables`);
  - Tabelas comerciais de frete oficiais (`commercial_freight_tables`);
  - Dispositivos de impressão cadastrados (`printer_devices`);
  - Regras de negócio e parâmetros de adicionais de frete (`freight_rule_parameters`);
  - Parâmetros de negociação e SLA (`negotiation_parameters`, `expedition_sla_parameters`, `performance_score_parameters`);
  - Templates de critérios de seleção (`selection_criteria_templates`);
  - Itinerários de distribuição SAP TVROT (`sap_itineraries`);
  - **Massa de dados legítima de importação QAS (`sap_imports` e `sap_sales_orders` com `origem_dado IN ('SAP', 'EXCEL_QAS', 'EXCEL_QAS_ZSD35_V3')` do lote oficial de 396 pedidos)**.

- **Dados Transacionais Alvo de Limpeza (Fictícios / Demonstrativos):**
  - Entradas de fila geradas em migrations de mock inicial sem correlação real (`queue_entries` com correlação de semente inicial);
  - Pré-cadastros demonstrativos sem documento real validado (`pre_registrations` gerados em seeds);
  - Ofertas de frete de leilão demonstrativas (`freight_offers` geradas em seeds: `CARGA-MG-8801`, `CARGA-SP-8802`, `CARGA-MG-8803`);
  - Pedidos de venda seed legados da migração 0006 (`45009101` a `45009106` sem import_batch_id);
  - Oportunidades de complemento demonstrativas (`oportunidade_complemento_carga` gerada em seed: `CARGA-MG001-01`);
  - Simulações e cenários demonstrativos órfãos (`load_simulation_scenarios`);
  - Propostas de frete demonstrativas (`freight_proposals`);
  - Ordens de produção PCP fictícias (`pcp_production_orders`: `OF-2026-00441`, `OF-2026-00442`, `OF-2026-00443`);
  - Estoque demonstrativo da migração 0009 (`sap_stock_current`: `MAT-CHAPA-1020-01`, `MAT-BOBINA-02`, `MAT-PERFIL-W-03`, `MAT-TUBO-IND-04`);
  - Resultados de frete demonstrativos (`freight_results`: `CARGA-SP001-0891`, `CARGA-SP002-0892`, `CARGA-SP003-0893`);
  - Marcos de expedição demonstrativos (`expedition_milestones`: `CARGA-SP001-0891`, `CARGA-SP002-0892`);
  - Transportes em rota Fred demonstrativos (`fred_transports`: `123456`, `123457`);
  - Entregas, ocorrências, evidências, mensagens e eventos Fred demonstrativos vinculados aos transportes `123456` e `123457` (`fred_deliveries`, `fred_occurrences`, `fred_evidences`, `fred_messages`, `fred_timeline_events`, `fred_ai_analytics`);
  - Rastreamentos de expedição demonstrativos (`expedition_tracking`: `CARGA-5522`, `CARGA-5538`);
  - Custos de ocorrência demonstrativos (`occurrence_costs`: `1004829101`, `1004829102`, `1004829103`).

---

## 2. Snapshot Técnico do Banco QAS Pré-Delete

- **Identificador Único do Backup:** `SNAPSHOT-QAS-PRE-CLEANUP-20260831-001`
- **Data e Hora de Registro:** 2026-08-31T14:00:00.000Z
- **Versão da Aplicação:** `TMS-CIAFAL-v3.2.0-QAS`
- **Versão do Banco de Dados:** PocketBase v0.36 (Skip Cloud) — Migração 0031 aplicada
- **Usuário Executor do Snapshot:** `Administrador Master CIAFAL (ciafal@ciafal.com.br)`

### 2.1 Volumetria de Registros por Coleção Pré-Limpeza

| #   | Coleção PocketBase                  | Tipo                       | Total Pré-Delete | Registros Fictícios Alvo | Registros Legítimos Preservados               |
| --- | ----------------------------------- | -------------------------- | ---------------- | ------------------------ | --------------------------------------------- |
| 1   | `users`                             | Auth/RBAC                  | 5                | 0                        | 5 (100% preservados)                          |
| 2   | `drivers`                           | Cadastro Técnico           | 5                | 0                        | 5 (Cadastros preservados)                     |
| 3   | `vehicles`                          | Cadastro Técnico           | 5                | 0                        | 5 (Cadastros preservados)                     |
| 4   | `queue_entries`                     | Transacional Fila          | 5                | 5                        | 0 (Fila limpa para novas entradas)            |
| 5   | `pre_registrations`                 | Transacional Portaria      | 2                | 2                        | 0 (Prontos para novos cadastros)              |
| 6   | `audit_logs`                        | Governança/Auditoria       | 1                | 0                        | 1+ (Registros de auditoria preservados)       |
| 7   | `whitelist_ips`                     | Segurança                  | 5                | 0                        | 5 (100% preservados)                          |
| 8   | `system_parameters`                 | Configurações/Parâmetros   | 16               | 0                        | 16 (100% preservados)                         |
| 9   | `sap_imports`                       | Integração SAP/Excel       | 1                | 0                        | 1 (Lote ZSD35 v3 preservado)                  |
| 10  | `sap_sales_orders`                  | Carteira de Pedidos        | 402              | 6                        | 396 (396 pedidos legítimos ZSD35 preservados) |
| 11  | `sap_itineraries`                   | Domínio SAP TVROT          | 10               | 0                        | 10 (100% preservados)                         |
| 12  | `freight_offers`                    | Transacional Fretes        | 3                | 3                        | 0 (Mesa pronta para leilões reais)            |
| 13  | `freight_proposals`                 | Transacional Propostas     | 0                | 0                        | 0                                             |
| 14  | `freight_negotiations`              | Transacional Carlão        | 0                | 0                        | 0                                             |
| 15  | `oportunidade_complemento_carga`    | Transacional CRM           | 1                | 1                        | 0                                             |
| 16  | `sap_stock_current`                 | Transacional Estoque       | 4                | 4                        | 0 (Aguardando carga MB52 real)                |
| 17  | `pcp_production_orders`             | Transacional PCP           | 3                | 3                        | 0 (Aguardando integração PCP real)            |
| 18  | `stock_confirmation_requests`       | Transacional WMS           | 0                | 0                        | 0                                             |
| 19  | `credit_reassessment_requests`      | Transacional Financeiro    | 0                | 0                        | 0                                             |
| 20  | `load_simulation_scenarios`         | Transacional Cenários      | 0                | 0                        | 0                                             |
| 21  | `antt_rate_tables`                  | Parâmetros Oficiais ANTT   | 1                | 0                        | 1 (100% preservado)                           |
| 22  | `integration_logs`                  | Logs Técnicos              | 0                | 0                        | 0                                             |
| 23  | `sap_blueprint_mappings`            | Governança SAP             | 10               | 0                        | 10 (100% preservado)                          |
| 24  | `geocoding_cache`                   | Cache Técnico              | 0                | 0                        | 0                                             |
| 25  | `printer_devices`                   | Infraestrutura             | 3                | 0                        | 3 (100% preservado)                           |
| 26  | `print_jobs`                        | Transacional Impressão     | 0                | 0                        | 0                                             |
| 27  | `document_handovers`                | Transacional Entrega Doc   | 0                | 0                        | 0                                             |
| 28  | `freight_results`                   | Transacional Rentabilidade | 3                | 3                        | 0                                             |
| 29  | `expedition_milestones`             | Transacional Lead Time     | 2                | 2                        | 0                                             |
| 30  | `wms_loading_maps`                  | Transacional WMS           | 0                | 0                        | 0                                             |
| 31  | `ai_planner_recommendations`        | Transacional IA            | 0                | 0                        | 0                                             |
| 32  | `commercial_freight_tables`         | Parâmetro Comercial        | 1                | 0                        | 1 (100% preservado)                           |
| 33  | `zsd35_column_mappings`             | Configuração SAP           | 1                | 0                        | 1 (100% preservado)                           |
| 34  | `negotiation_parameters`            | Parâmetro Carlão           | 2                | 0                        | 2 (100% preservado)                           |
| 35  | `sap_reprocessing_queue`            | Fila Técnica               | 0                | 0                        | 0                                             |
| 36  | `expedition_tracking`               | Transacional Torre         | 2                | 2                        | 0                                             |
| 37  | `expedition_sla_parameters`         | Parâmetros SLA             | 7                | 0                        | 7 (100% preservado)                           |
| 38  | `driver_performance_indicators`     | Histórico Indicadores      | 3                | 3                        | 0                                             |
| 39  | `fred_transports`                   | Transacional Fred Torre    | 2                | 2                        | 0                                             |
| 40  | `fred_deliveries`                   | Transacional Entregas      | 4                | 4                        | 0                                             |
| 41  | `fred_occurrences`                  | Transacional Ocorrências   | 1                | 1                        | 0                                             |
| 42  | `fred_evidences`                    | Transacional Evidências    | 2                | 2                        | 0                                             |
| 43  | `fred_messages`                     | Transacional Mensagens     | 3                | 3                        | 0                                             |
| 44  | `fred_timeline_events`              | Transacional Eventos       | 4                | 4                        | 0                                             |
| 45  | `fred_ai_analytics`                 | Transacional Analytics     | 1                | 1                        | 0                                             |
| 46  | `driver_performance_scores`         | Scores Motoristas          | 3                | 3                        | 0                                             |
| 47  | `transport_performance_evaluations` | Avaliações Viagens         | 0                | 0                        | 0                                             |
| 48  | `driver_ciafal_surveys`             | Pesquisas Motorista        | 3                | 3                        | 0                                             |
| 49  | `client_logistic_evaluations`       | Avaliações Cliente         | 0                | 0                        | 0                                             |
| 50  | `customer_logistic_profiles`        | Perfis CRM                 | 3                | 3                        | 0                                             |
| 51  | `performance_responsibility_matrix` | Matriz Responsabilidade    | 2                | 2                        | 0                                             |
| 52  | `performance_score_parameters`      | Parâmetros Fórmula         | 1                | 0                        | 1 (100% preservado)                           |
| 53  | `performance_audit_ledger`          | Ledger Auditoria           | 1                | 1                        | 0                                             |
| 54  | `selection_criteria_templates`      | Templates Seleção          | 4                | 0                        | 4 (100% preservado)                           |
| 55  | `cargo_driver_fitness_scores`       | Scores Fitness             | 0                | 0                        | 0                                             |
| 56  | `selection_decision_audits`         | Auditoria Seleção          | 0                | 0                        | 0                                             |
| 57  | `occurrence_costs`                  | Custos Ocorrência          | 4                | 4                        | 0                                             |
| 58  | `driver_performance_appeals`        | Recursos Ocorrência        | 0                | 0                        | 0                                             |
| 59  | `driver_feedback_tokens`            | Tokens Acesso              | 0                | 0                        | 0                                             |
| 60  | `qlik_profitability_records`        | Qlik Rentabilidade         | 0                | 0                        | 0 (Já saneado na 0027)                        |
| 61  | `smart_selection_savings_ledger`    | Economia Inteligente       | 0                | 0                        | 0 (Já saneado na 0027)                        |
| 62  | `whatsapp_webhook_events`           | Webhooks WhatsApp          | 0                | 0                        | 0                                             |
| 63  | `ai_weight_learning_proposals`      | Propostas IA               | 0                | 0                        | 0 (Já saneado na 0027)                        |
| 64  | `freight_rule_parameters`           | Regras Frete e Descarga    | 1                | 0                        | 1 (100% preservado)                           |

---

## 3. Relação Técnica Detalhada do que é Fictício / Mock / Seed

Abaixo listamos os elementos encontrados com sua classificação e origem:

### 3.1 Base de Dados (Transacional Semeada em Migrations)

1. **`sap_sales_orders` (Pedidos `45009101` a `45009106`)**:
   - _Origem:_ SEED (`0006_seed_itineraries_and_orders.js`).
   - _Natureza:_ Massa demonstrativa de 6 pedidos sem vínculo com lote de importação.
   - _Ação:_ Excluídos na migração de saneamento. Os 396 pedidos reais importados do lote `LOTE-ZSD35-V3-MTHA471G` permanecem intactos.

2. **`queue_entries` (5 entradas de motoristas na fila)**:
   - _Origem:_ SEED (`0002_seed_tms_data.js`).
   - _Natureza:_ Entradas demonstrativas no totem / check-in externo.
   - _Ação:_ Excluídas na migração de saneamento. Cadastros de `drivers` e `vehicles` preservados.

3. **`pre_registrations` (2 pré-cadastros)**:
   - _Origem:_ SEED (`0002_seed_tms_data.js`).
   - _Natureza:_ Registros de teste de motoristas autônomos.
   - _Ação:_ Excluídos na migração de saneamento.

4. **`freight_offers` (`CARGA-MG-8801`, `CARGA-SP-8802`, `CARGA-MG-8803`)**:
   - _Origem:_ SEED (`0007_sprint2_freight_proposals_and_params.js`).
   - _Natureza:_ Cargas de demonstração para leilão de frete.
   - _Ação:_ Excluídas na migração de saneamento.

5. **`oportunidade_complemento_carga` (`CARGA-MG001-01`)**:
   - _Origem:_ SEED (`0006_seed_itineraries_and_orders.js`).
   - _Natureza:_ Oportunidade demonstrativa de complemento de carga.
   - _Ação:_ Excluída na migração de saneamento.

6. **`sap_stock_current` (4 itens de estoque MB52)**:
   - _Origem:_ SEED (`0009_seed_sprint3_data.js`).
   - _Natureza:_ Saldo de estoque demonstrativo.
   - _Ação:_ Excluído na migração de saneamento.

7. **`pcp_production_orders` (3 ordens de produção PCP)**:
   - _Origem:_ SEED (`0009_seed_sprint3_data.js`).
   - _Natureza:_ Programação futura demonstrativa.
   - _Ação:_ Excluído na migração de saneamento.

8. **`freight_results` (3 resultados previstos x realizados)**:
   - _Origem:_ SEED (`0016_seed_sprint6_tables_and_rates.js`).
   - _Natureza:_ Resultados financeiros demonstrativos.
   - _Ação:_ Excluídos na migração de saneamento.

9. **`expedition_milestones` (2 marcos de tempo T0 a T10)**:
   - _Origem:_ SEED (`0016_seed_sprint6_tables_and_rates.js`).
   - _Natureza:_ Lead times e gargalos demonstrativos.
   - _Ação:_ Excluídos na migração de saneamento.

10. **`expedition_tracking` (`CARGA-5522`, `CARGA-5538`)**:
    - _Origem:_ SEED (`0018_seed_carlao_and_expedition.js`).
    - _Natureza:_ Cargas em carregamento na doca demonstrativas.
    - _Ação:_ Excluídas na migração de saneamento.

11. **`fred_transports` (`123456`, `123457`) e entidades filhas**:
    - _Origem:_ SEED (`0020_seed_fred_tracking.js`).
    - _Natureza:_ Viagens em rota monitoradas pelo Fred com entregas, ocorrências, áudios e timelines demonstrativos.
    - _Ação:_ Excluídas na migração de saneamento.

12. **`driver_performance_scores`, `driver_performance_indicators`, `driver_ciafal_surveys`, `customer_logistic_profiles`, `performance_responsibility_matrix`, `performance_audit_ledger`**:
    - _Origem:_ SEED (`0018_seed_carlao_and_expedition.js` e `0022_seed_driver_performance_and_experience.js`).
    - _Natureza:_ Scores históricos e pesquisas de demonstração.
    - _Ação:_ Excluídos na migração de saneamento.

13. **`occurrence_costs` (4 custos de ocorrência)**:
    - _Origem:_ SEED (`0024_seed_feedback_loop_templates_and_costs.js`).
    - _Natureza:_ Despesas extraordinárias demonstrativas.
    - _Ação:_ Excluídos na migração de saneamento.

### 3.2 Código-Fonte / Frontend (React & TypeScript)

1. **`src/domain/zsd35ImportEngine.ts`**:
   - _Identificação:_ Função `generateZsd35aV3TemplateWorkbook(includeSampleData)` e `downloadZsd35aV3SampleTemplate()`.
   - _Origem:_ Utilitário de geração de planilha modelo para download pelos operadores.
   - _Classificação:_ **Legítimo / Ferramenta de Apoio Operacional**. Permite ao usuário baixar um exemplo preenchido no padrão ZSD35 com 27 colunas para instrução de preenchimento. Não injeta dados no banco.
   - _Status:_ Preservado.

2. **`src/pages/FreightIntelligencePage.tsx`**:
   - _Identificação:_ Constante `sampleRoutes` utilizada na aba de Rotas.
   - _Origem:_ Fallback demonstrativo de benchmarking de rotas.
   - _Classificação:_ Requer avaliação futura na fatia de frontend para conexão direta com agregações de pedidos reais da carteira.
   - _Status:_ Registrado no inventário.

3. **`src/pages/WmsLoadingMapPage.tsx`**:
   - _Identificação:_ Constante `sampleCargoOrders`.
   - _Origem:_ Visualização didática de arranjo físico de carroceria.
   - _Classificação:_ Requer avaliação futura na fatia de integração WMS para carregar pedidos da carga selecionada via API.
   - _Status:_ Registrado no inventário.

4. **`src/tests/*.test.ts`**:
   - _Identificação:_ Mocks e fixtures de testes automatizados (Vitest).
   - _Origem:_ Suíte de testes de regressão (ex: `mockSavings`, `sampleOrders`, `mockStocks`).
   - _Classificação:_ **Legítimo / Engenharia de Software**. Testes isolados de unidade e regras de negócio determinísticas que não tocam o banco de dados em produção.
   - _Status:_ Preservado.

---

## 4. Auditoria de Execução da Migração 0032

A migração `0032_saneamento_qas_primeira_fatia.js` foi executada com sucesso, implementando:

1. Verificação defensiva e idempotente com queries parametrizadas;
2. Registro imutável de log de auditoria em `audit_logs` documentando a execução do saneamento;
3. Preservação estrita dos 396 pedidos de venda legítimos da planilha ZSD35;
4. Preservação de todos os 5 usuários administradores e operadores, 5 motoristas, 5 veículos, 16 parâmetros de sistema, 10 mapeamentos de blueprint SAP, 10 itinerários, tabela ANTT e tabelas comerciais;
5. Remoção cirúrgica de 63 registros transacionais fictícios distribuídos nas coleções transacionais listadas acima.
