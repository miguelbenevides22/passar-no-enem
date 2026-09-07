import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!isSupabaseConfigured()) {
      return { user: null };
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();

  async function logout() {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/missao" className="font-display text-lg font-semibold tracking-tight">PASSAR NO ENEM</Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Link to="/missao" className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">Minha Direção</Link>
            <Link to="/estudo" className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">Estudar</Link>
            <Link to="/painel" className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">Meu progresso</Link>
          </nav>
          <Button variant="ghost" size="sm" onClick={logout}>Sair</Button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
