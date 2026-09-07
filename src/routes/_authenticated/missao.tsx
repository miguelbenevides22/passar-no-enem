import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getDailyMission } from "@/lib/mission.functions";
import { submitAttempt } from "@/lib/evidence.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/missao")({
  head: () => ({
    meta: [
      { title: "Missão do dia — Passar no ENEM" },
      {
        name: "description",
        content: "Plano de estudo diário calculado por prioridade, revisão vencida e diagnóstico de cada nó pedagógico.",
      },
      { property: "og:title", content: "Missão do dia — Passar no ENEM" },
      { property: "og:description", content: "Prioridade, revisão e prática decididas pelo motor adaptativo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MissionPage,
  errorComponent: ({ error }) => <div className="p-10 text-sm text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="p-10">Página não encontrada.</div>,
});

function MissionPage() {
  const fetchMission = useServerFn(getDailyMission);
  const send = useServerFn(submitAttempt);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["daily-mission"], queryFn: () => fetchMission() });

  const mutation = useMutation({
    mutationFn: (input: { questionId: string; isCorrect: boolean; kind: "REVIEW" | "PRACTICE" }) =>
      send({
        data: {
          questionId: input.questionId,
          selectedAnswer: null,
          isCorrect: input.isCorrect,
          responseTimeMs: null,
          attemptContext: input.kind === "REVIEW" ? ("REVIEW" as const) : ("MISSION" as const),
        },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["daily-mission"] });
      queryClient.invalidateQueries({ queryKey: ["study-state"] });
      if (result.accepted) toast.success(`Evidência registrada — diagnóstico: ${result.diagnosis?.state}`);
      else toast.warning(`Tentativa registrada sem evidência (${result.reason})`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="p-10 text-muted-foreground">Montando sua missão…</div>;

  const { mission } = data;

  return (
    <main className="min-h-screen" style={{ backgroundImage: "var(--gradient-header)" }}>
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Missão do dia</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {mission.reviewCount} revisão(ões) e {mission.practiceCount} prática(s), escolhidas por fragilidade, urgência de
          revisão e cobertura. Nenhuma escolha é aleatória.
        </p>
        <div className="mt-3 flex gap-4 text-sm underline">
          <Link to="/painel">Painel de acompanhamento</Link>
          <Link to="/estudo">Ver todas as questões liberadas</Link>
        </div>


        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Plano de hoje ({mission.items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mission.items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma questão disponível hoje. Questões sem vínculo inequívoco com o grafo continuam fora da missão.
              </p>
            )}
            {mission.items.map((item) => (
              <div
                key={item.questionId}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0"
              >
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    <Badge variant={item.kind === "REVIEW" ? "secondary" : "default"}>
                      {item.kind === "REVIEW" ? "revisão" : "prática"}
                    </Badge>
                    {data.nodeNames[item.pedagogicalNodeId] ?? item.pedagogicalNodeId}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.questionId} · {item.cognitiveDimension} · {item.reason}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ questionId: item.questionId, isCorrect: true, kind: item.kind })}
                  >
                    Acertei
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ questionId: item.questionId, isCorrect: false, kind: item.kind })}
                  >
                    Errei
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Prioridade dos temas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tema</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ranking.map((r) => (
                    <TableRow key={r.nodeId}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.priority.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.diagnosisState}
                        {r.prerequisitesReady ? "" : " · pré-requisito pendente"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revisões vencidas</CardTitle>
            </CardHeader>
            <CardContent>
              {data.due.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma revisão vencida.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tema</TableHead>
                      <TableHead>Atraso</TableHead>
                      <TableHead>Retenção</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.due.map((d) => (
                      <TableRow key={d.nodeId}>
                        <TableCell>{d.name}</TableCell>
                        <TableCell>{d.overdueDays} dia(s)</TableCell>
                        <TableCell>{d.retention.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
