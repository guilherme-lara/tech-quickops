import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Wrench, ShieldCheck, HardHat } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@quickops.com");
  const [senha, setSenha] = useState("demo1234");

  const enter = (role: "gestor" | "tecnico") => {
    login(role);
    navigate({ to: role === "gestor" ? "/dashboard" : "/tecnico/os" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-12 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-info/20 blur-3xl" />
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Wrench className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold tracking-tight">QuickOps</span>
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold leading-tight">Gestão de OS e RAT em um só lugar.</h1>
          <p className="text-sidebar-foreground/70 text-lg max-w-md">
            Controle ordens de serviço, equipe técnica e relatórios digitais com assinatura do cliente em tempo real.
          </p>
          <div className="flex gap-6 text-sm text-sidebar-foreground/80">
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> RAT Digital</div>
            <div className="flex items-center gap-2"><HardHat className="w-4 h-4" /> Mobile-first</div>
          </div>
        </div>
        <div className="relative z-10 text-xs text-sidebar-foreground/50">© 2026 QuickOps</div>
      </div>

      <div className="flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md p-8 shadow-xl border-border/50">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Wrench className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">QuickOps</span>
          </div>
          <h2 className="text-2xl font-bold">Bem-vindo de volta</h2>
          <p className="text-sm text-muted-foreground mt-1">Acesse sua conta para continuar.</p>

          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Demo</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-11" onClick={() => enter("gestor")}>
              <ShieldCheck className="w-4 h-4" /> Gestor
            </Button>
            <Button className="h-11" onClick={() => enter("tecnico")}>
              <HardHat className="w-4 h-4" /> Técnico
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Use os botões acima para entrar em modo demonstração.
          </p>
        </Card>
      </div>
    </div>
  );
}
