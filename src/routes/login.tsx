import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, ShieldCheck, HardHat, Sparkles, ArrowRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login")({ component: LoginPage });

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
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* LEFT — aspirational panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden text-white" style={{ backgroundImage: "var(--gradient-hero)" }}>
        <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-white/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-black/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
            <Wrench className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">QuickOps</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur border border-white/20 text-xs font-medium">
            <Sparkles className="w-3 h-3" /> Field Service Platform
          </div>
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight">
            Ordens de Serviço<br/>e RAT digital,<br/>em um só lugar.
          </h1>
          <p className="text-white/80 text-lg max-w-md leading-relaxed">
            Controle a operação em campo, do orçamento à assinatura do cliente — em tempo real e sem papel.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md pt-4">
            {[{ k: "+12k", v: "OS executadas" }, { k: "98%", v: "SLA cumprido" }, { k: "4.9★", v: "Avaliação técnica" }].map((s) => (
              <div key={s.v} className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-3">
                <div className="text-2xl font-bold">{s.k}</div>
                <div className="text-[10px] text-white/70 uppercase tracking-wider mt-0.5">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/60">© 2026 QuickOps · Multi-tenant SaaS</div>
      </div>

      {/* RIGHT — form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-violet flex items-center justify-center">
              <Wrench className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">QuickOps</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Acesse sua conta para continuar.</p>

          <div className="space-y-4 mt-8">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">E-MAIL</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha" className="text-xs font-semibold">SENHA</Label>
              <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <Button className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-violet shadow-[var(--shadow-glow)] hover:shadow-xl transition-all">
              Entrar <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="my-7 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Demo</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => enter("gestor")} className="group rounded-2xl border border-border bg-card p-4 text-left hover:border-primary hover:shadow-[var(--shadow-glow)] transition-all duration-300">
              <ShieldCheck className="w-5 h-5 text-primary mb-2" />
              <div className="font-semibold text-sm">Logar como Gestor</div>
              <div className="text-[11px] text-muted-foreground">Painel completo desktop</div>
            </button>
            <button onClick={() => enter("tecnico")} className="group rounded-2xl border border-border bg-card p-4 text-left hover:border-primary hover:shadow-[var(--shadow-glow)] transition-all duration-300">
              <HardHat className="w-5 h-5 text-violet mb-2" />
              <div className="font-semibold text-sm">Logar como Técnico</div>
              <div className="text-[11px] text-muted-foreground">Experiência mobile</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
