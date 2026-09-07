import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Passar no ENEM" },
      { name: "description", content: "Estude para o ENEM com direção, prática e evolução." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 lg:px-10">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70" style={{ backgroundImage: "var(--gradient-header)" }} />
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">PASSAR NO ENEM</p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-tight sm:text-6xl lg:text-7xl">
            Estude com direção.
            <span className="block text-primary">Não apenas com conteúdo.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Aprenda, pratique, entenda seus erros e descubra o que estudar depois — com uma experiência construída para o ENEM.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/auth" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
              Começar agora
            </Link>
            <Link to="/auth" className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition hover:bg-accent">
              Entrar
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            ["01", "Direção", "Saiba o que fazer agora e por que aquilo importa."],
            ["02", "Prática", "Questões e tentativas que ajudam a construir domínio."],
            ["03", "Evolução", "Acompanhe seu progresso e os pontos que precisam voltar."],
          ].map(([number, title, description]) => (
            <div key={number} className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur">
              <span className="text-xs font-semibold tracking-[0.2em] text-primary">{number}</span>
              <h2 className="mt-3 font-display text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
