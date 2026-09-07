# Passar no ENEM — Roadmap

Fonte: PASSAR_NO_ENEM_LOVABLE_PACKAGE (Banco Mestre V12.1 FINAL, Matriz oficial,
cartilha da redação, provas/gabaritos 2025, AdaptiveEngine V13, especificações mestras).

## Fase 1 — Fundação + Banco Mestre + MigrationMap (em andamento)
- [x] Auditoria aprovada
- [x] Lovable Cloud ativado
- [ ] Validação do Banco Mestre (contagens, IDs, versões, mappings, anuladas) — sem correção silenciosa
- [ ] Esquema versionado (matriz oficial, grafo, questões, mapeamentos, migration_map)
- [ ] Importação do Banco Mestre
- [ ] MigrationMap
- [ ] Relatório de validação visível na aplicação
- [ ] PARAR para validação do Miguel antes do Evidence Pipeline

## Fases seguintes (após aprovação)
4. Evidence Pipeline · 5. Mastery + Retention · 6. AdaptiveEngine V13 · 7. Question Engine
8. Application Layer · 9. Missões · 10. Review · 11. Simulados · 12. Redação · 13. Dashboard
14. Remoção de duplicações após validação

## Regras fixas
- Um único engine, grafo, evidence pipeline, diagnóstico, question engine.
- UI não decide pedagogia. Matriz oficial ≠ taxonomia pedagógica.
- Q→PedagogicalNode ambíguo ⇒ evidenceAllowed = false (nunca inferir).
- Hash de auditoria: SHA-256 via Web Crypto, determinístico. Sem Date.now() no domínio.
- Anulada / mapping inválido ⇒ não gera evidência. Mastery sempre recalculado.

## Fase 1 concluída
- Banco Mestre V12.1-F.2 importado e validado (30/120/38/63/85/180/180)
- MigrationMap gerado (181 registros); 18 questões com evidenceAllowed=true
- Painel de validação em / ; SQL de importação em data/master-bank/
- PAUSA para validação do Miguel antes do Evidence Pipeline

## Fase 2 — Evidence Pipeline (concluída, aguardando decisão)
- [x] Tabelas: attempts, evidences, diagnoses, mastery_states, retention_states, audit_events, mapping_review_queue (RLS por auth.uid()).
- [x] Funções: evaluate_evidence_gate, record_attempt (transação única).
- [x] Domínio TS determinístico: gate, mastery, retention, diagnosis, AdaptiveEngine V13 + hash SHA-256.
- [x] submitAttempt / getStudyState (server functions, sem regra pedagógica na UI).
- [x] Rota /auth + /estudo (autenticada) para registrar tentativas.
- [x] 20 testes de domínio + teste ponta a ponta autenticado no navegador.
- [x] Decisão do Miguel: gate aceita a situação oficial "RAW_EXTRACT" além de "ATIVA" (dado oficial intacto).
- [x] Verificado em produção: 18 questões liberadas geram evidência, diagnóstico, domínio, retenção e auditoria.
- [x] evaluate_evidence_gate restrita ao sistema; record_attempt só para usuários autenticados.

## Fase 3 — Prioridade, Missões e Revisão (concluída)
- [x] src/domain/priority.ts — único sistema de prioridade (fragilidade 0.5 + urgência 0.35 + cobertura 0.15, penalidade 0.5 para pré-requisito pendente), determinístico.
- [x] src/domain/review.ts — revisões vencidas derivadas só de Retention.
- [x] src/domain/question-candidate.ts — único Question Candidate Engine (dimensão alvo por diagnóstico, oficial antes de autoral, sem sorteio).
- [x] src/domain/mission.ts — missão diária (máx. 50% revisão, sem repetir questão).
- [x] src/lib/mission.functions.ts (getDailyMission) + rota /missao; UI sem regra pedagógica.
- [x] Contexto da tentativa: REVIEW ou MISSION conforme o item.
- [x] 31 testes de domínio + verificação ponta a ponta autenticada (missão gerada e evidência registrada); dados de teste removidos.
- [x] Nenhum dado oficial alterado; os 162 mapeamentos pendentes seguem fora da missão e da geração de evidência.

## Fase 4 — Painel de acompanhamento (concluída)
- [x] src/domain/progress.ts — agregação determinística: totais, linha do tempo por dia,
      hipóteses de erro por dimensão, missões concluídas, explicação das recomendações.
- [x] src/lib/dashboard.functions.ts (getDashboard) — só carrega snapshots; decisão fica no domínio.
- [x] Rota /painel: evolução por conceito, respondidas/acertos/erros, hipóteses de erro,
      revisões pendentes, missões concluídas, evidências acumuladas, recomendações explicadas, evolução no tempo.
- [x] Hipótese de erro rotulada como provisória (confiança BAIXA/MÉDIA), nunca conclusão.
- [x] Navegação livre entre /painel, /missao e /estudo — nada bloqueia o aluno.
- [x] 35 testes de domínio + verificação ponta a ponta autenticada; dados de teste removidos.
- [x] Dados oficiais intactos; 162 mapeamentos pendentes continuam fora do pipeline (não inferidos).
