import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Passar no ENEM" },
      { name: "description", content: "Acesse sua conta do Passar no ENEM para registrar tentativas e acompanhar seu domínio por nó pedagógico." },
      { property: "og:title", content: "Entrar — Passar no ENEM" },
      { property: "og:description", content: "Acesse sua conta do Passar no ENEM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    const { error } = await fn;
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (mode === "signup") {
      toast.success("Conta criada. Confirme o e-mail para entrar.");
      return;
    }
    navigate({ to: "/missao" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6" style={{ backgroundImage: "var(--gradient-header)" }}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === "signin" ? "Entrar no Passar no ENEM" : "Criar conta"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {configured ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {mode === "signin" ? "Entrar" : "Criar conta"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              O sistema de login está sendo configurado. Você pode continuar como convidado e começar a explorar a plataforma.
            </p>
          )}

          <Button
            type="button"
            variant={configured ? "outline" : "default"}
            className="w-full"
            onClick={() => navigate({ to: "/missao" })}
          >
            Continuar como convidado
          </Button>

          {configured && (
            <button
              type="button"
              className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Ainda não tenho conta" : "Já tenho conta"}
            </button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
