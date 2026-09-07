import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getStudyState } from "@/lib/study.functions";
import { submitAttempt } from "@/lib/evidence.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/estudo")({
  head: () => ({
    meta: [
      { title: "Registrar tentativas — Passar no ENEM" },
      { name: "description", content: "Responda questões liberadas e acompanhe evidência, diagnóstico, domínio e retenção por nó pedagógico." },
      { property: "og:title", content: "Registrar tentativas — Passar no ENEM" },
      { property: "og:description", content: "Evidência, diagnóstico, domínio e retenção por nó pedagógico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudyPage,
  errorComponent: ({ error }) => <div className="p-10 text-sm text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="p-10">Página não encontrada.</div>,
});

function StudyPage() {
  const fetchState = useServerFn(getStudyState);
  const send = useServerFn(submitAttempt);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["study-state"], queryFn: () => fetchState() });

  const mutation = useMutation({
    mutationFn: (input: { questionId: string; isCorrect: boolean }) =>
      send({
        data: {
          questionId: input.questionId,
          selectedAnswer: null,
          isCorrect: input.isCorrect,
          responseTimeMs: null,
          attemptContext: "FREE" as const,
        },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["study-state"] });
      if (result.accepted) toast.success(`Evidência registrada — diagnóstico: ${result.diagnosis?.state}`);
      else toast.warning(`Tentativa registrada sem evidência (${result.reason})`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="p-10 text-muted-foreground">Carregando…</div>;

  return (
    <main className="min-h-screen" style={{ backgroundImage: "var(--gradient-header)" }}>
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Registro de tentativas</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Só aparecem aqui as questões que o portão de evidência autoriza. Cada resposta gera tentativa, evidência,
          diagnóstico, domínio, retenção e registro de auditoria em uma única gravação.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Questões liberadas ({data.questions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.questions.map((q) => (
              <div key={q.question_id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0">
                <div>
                  <div className="font-medium">{q.pedagogical_content}</div>
                  <div className="text-xs text-muted-foreground">
                    {q.question_id} · {q.official_skill_code} · {q.cognitive_dimension} · nó {q.pedagogical_node_id}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ questionId: q.question_id, isCorrect: true })}>
                    Acertei
                  </Button>
                  <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ questionId: q.question_id, isCorrect: false })}>
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
              <CardTitle>Domínio por nó</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nó</TableHead>
                    <TableHead>Domínio</TableHead>
                    <TableHead>Evidências</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.mastery.map((m) => (
                    <TableRow key={m.pedagogical_node_id}>
                      <TableCell>{m.pedagogical_node_id}</TableCell>
                      <TableCell>{Number(m.mastery).toFixed(2)}</TableCell>
                      <TableCell>
                        {m.correct_count}/{m.evidence_count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Retenção e próxima revisão</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nó</TableHead>
                    <TableHead>Retenção</TableHead>
                    <TableHead>Próxima revisão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.retention.map((r) => (
                    <TableRow key={r.pedagogical_node_id}>
                      <TableCell>{r.pedagogical_node_id}</TableCell>
                      <TableCell>{Number(r.retention).toFixed(2)}</TableCell>
                      <TableCell className="text-xs">
                        {r.next_review_at ? new Date(r.next_review_at).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Últimas tentativas e auditoria</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Questão</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Evidência</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.attempts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.question_id}</TableCell>
                    <TableCell>{a.is_correct ? "acerto" : "erro"}</TableCell>
                    <TableCell>
                      <Badge variant={a.evidence_status === "ACCEPTED" ? "default" : "secondary"}>{a.evidence_status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.rejection_reason ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 text-xs text-muted-foreground">
              {data.audit.length} registros de auditoria assinados (SHA-256).
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
