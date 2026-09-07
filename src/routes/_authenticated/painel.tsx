import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/dashboard.functions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel de acompanhamento — Passar no ENEM" },
      {
        name: "description",
        content:
          "Evolução por conceito, acertos e erros, hipóteses de erro, revisões pendentes, evidências acumuladas e recomendações explicadas.",
      },
      { property: "og:title", content: "Painel de acompanhamento — Passar no ENEM" },
      { property: "og:description", content: "Sua evolução, suas evidências e o que a Direção recomenda agora — com o motivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
  errorComponent: ({ error }) => <div className="p-10 text-sm text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="p-10">Página não encontrada.</div>,
});

const pct = (n: number) => `${Math.round(n * 100)}%`;

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function TimelineChart({ points }: { points: { day: string; attempts: number; correct: number; accuracy: number }[] }) {
  if (points.length === 0) return <p className="text-sm text-muted-foreground">Ainda sem histórico registrado.</p>;
  const max = Math.max(...points.map((p) => p.attempts), 1);
  return (
    <div className="flex items-end gap-3 overflow-x-auto pb-2">
      {points.map((p) => (
        <div key={p.day} className="flex min-w-14 flex-col items-center gap-1">
          <span className="text-xs tabular-nums text-muted-foreground">{pct(p.accuracy)}</span>
          <div className="flex h-32 w-8 flex-col justify-end rounded bg-muted">
            <div className="w-full rounded bg-primary/25" style={{ height: `${(p.attempts / max) * 100}%` }}>
              <div
                className="w-full rounded-b bg-primary"
                style={{ height: `${p.attempts ? (p.correct / p.attempts) * 100 : 0}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">{p.day.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

function DashboardPage() {
  const fetchDashboard = useServerFn(getDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDashboard() });

  if (isLoading || !data) return <div className="p-10 text-muted-foreground">Carregando seu painel…</div>;

  const { totals } = data;

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Painel de acompanhamento</h1>
          <p className="text-sm text-muted-foreground">
            Motor {data.engineVersion} · grafo {data.graphVersion} · mapeamento {data.mappingVersion}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/missao">Missão do dia</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/estudo">Registrar tentativas</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Questões respondidas" value={totals.attempts} hint={`${totals.correct} acertos · ${totals.wrong} erros`} />
        <Stat label="Aproveitamento" value={pct(totals.accuracy)} hint="sobre todas as tentativas registradas" />
        <Stat
          label="Evidências acumuladas"
          value={totals.evidences}
          hint={totals.rejected ? `${totals.rejected} tentativa(s) sem evidência` : "todas as tentativas geraram evidência"}
        />
        <Stat label="Missões concluídas" value={data.completedMissions} hint="dias com a missão inteira registrada" />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Evolução ao longo do tempo</h2>
        <Card>
          <CardContent className="pt-6">
            <TimelineChart points={data.timeline} />
            <p className="mt-3 text-xs text-muted-foreground">
              Barra clara: tentativas do dia. Barra cheia: acertos. Percentual: aproveitamento do dia.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recomendações atuais da Direção</h2>
        {data.recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma recomendação disponível ainda.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.recommendations.map((r) => (
              <Card key={r.nodeId}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span>{r.name}</span>
                    <Badge variant="secondary">prioridade {r.priority.toFixed(2)}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {r.officialSkillCode ? `Habilidade oficial ${r.officialSkillCode}` : "Sem habilidade oficial vinculada"}
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {r.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Evolução por habilidade / conceito</h2>
        <Card>
          <CardContent className="pt-6">
            {data.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">Responda algumas questões para ver sua evolução por conceito.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conceito</TableHead>
                    <TableHead>Diagnóstico</TableHead>
                    <TableHead className="w-40">Domínio</TableHead>
                    <TableHead>Retenção</TableHead>
                    <TableHead>Evidências</TableHead>
                    <TableHead>Acertos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.skills.map((s) => (
                    <TableRow key={s.nodeId}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.diagnosisState}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={s.mastery * 100} className="h-2" />
                          <span className="text-xs tabular-nums text-muted-foreground">{pct(s.mastery)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">{pct(s.retention)}</TableCell>
                      <TableCell className="tabular-nums">{s.evidenceCount}</TableCell>
                      <TableCell className="tabular-nums">
                        {s.correctCount}/{s.evidenceCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Hipóteses de erro</h2>
          <Card>
            <CardContent className="space-y-3 pt-6">
              <p className="text-xs text-muted-foreground">
                Leitura provisória a partir das evidências registradas — hipótese, não conclusão.
              </p>
              {data.errorHypotheses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum erro registrado até agora.</p>
              ) : (
                <ul className="space-y-3">
                  {data.errorHypotheses.map((h) => (
                    <li key={`${h.nodeId}-${h.dimension}`} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{h.name}</span>
                        <Badge variant="outline">confiança {h.confidence}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {h.dimension} — {h.hypothesis} ({h.wrong} de {h.total} evidências incorretas).
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Revisões pendentes</h2>
          <Card>
            <CardContent className="pt-6">
              {data.due.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma revisão vencida agora.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conceito</TableHead>
                      <TableHead>Vencida há</TableHead>
                      <TableHead>Retenção</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.due.map((d) => (
                      <TableRow key={d.nodeId}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="tabular-nums">{d.overdueDays} dia(s)</TableCell>
                        <TableCell className="tabular-nums">{pct(d.retention)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <p className="text-xs text-muted-foreground">
        {data.releasedQuestions} questões liberadas pelo EvidenceGate · {data.pendingMappings} mapeamentos aguardando revisão
        humana (não inferidos).
      </p>
    </main>
  );
}
