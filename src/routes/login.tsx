import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/useData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { login, signup } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginCodigo, setLoginCodigo] = useState("");
  const [loginSenha, setLoginSenha] = useState("");

  const [suEmail, setSuEmail] = useState("");
  const [suSenha, setSuSenha] = useState("");
  const [suNome, setSuNome] = useState("");
  const [suEmpresa, setSuEmpresa] = useState("");
  const [suDominio, setSuDominio] = useState("");
  const [suCnpj, setSuCnpj] = useState("");
  const [suTelefone, setSuTelefone] = useState("");

  const doLogin = async () => {
    setLoading(true);
    try {
      // Se não houver "@", trata como username de técnico → completa domínio padrão.
      const identifier = loginEmail.trim();

      // Validação de e-mail: se contiver @, deve ter formato válido
      if (identifier.includes("@")) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(identifier)) {
          toast.error("Formato de e-mail inválido");
          setLoading(false);
          return;
        }
      }

      // Passa o identificador direto: o store resolve username → e-mail real
      // via RPC get_email_by_username no Supabase.
      const { error } = await login(identifier, loginSenha, loginCodigo);

      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Bem-vindo!");
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  const doSignup = async () => {
    if (!suEmail || !suSenha || !suNome || !suEmpresa || !suDominio)
      return toast.error("Preencha todos os campos obrigatórios");
    setLoading(true);
    try {
      const { error } = await signup(suEmail, suSenha, suNome, suEmpresa, suDominio.toLowerCase(), suCnpj, suTelefone);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Conta criada com sucesso!");
      window.location.href = "/dashboard";
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro inesperado ao criar conta";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden text-white"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
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
            Ordens de Serviço
            <br />e RAT digital,
            <br />
            em um só lugar.
          </h1>
          <p className="text-white/80 text-lg max-w-md leading-relaxed">
            Controle a operação em campo, do orçamento à assinatura do cliente — em tempo real e sem
            papel.
          </p>
        </div>
        <div className="relative z-10 text-xs text-white/60">
          © 2026 QuickOps · Multi-tenant SaaS
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold tracking-tight">Acesse o QuickOps</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Entre ou crie a conta da sua empresa.
          </p>

          <Tabs defaultValue="login" className="mt-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">E-MAIL OU USUÁRIO</Label>
                <Input
                  type="text"
                  placeholder="seu@email.com  ou  joao.adami"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="h-12 rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  Técnicos podem entrar com o usuário (ex.: <code>joao.adami</code>).
                </p>
              </div>
              {!loginEmail.includes("@") && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-xs font-semibold text-primary">CÓDIGO DA EMPRESA</Label>
                  <Input
                    type="text"
                    placeholder="ex: quickops"
                    value={loginCodigo}
                    onChange={(e) => setLoginCodigo(e.target.value.toLowerCase())}
                    className="h-12 rounded-xl border-primary/50 focus-visible:ring-primary"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Obrigatório para login de técnico. Peça ao seu gestor.
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SENHA</Label>
                <Input
                  type="password"
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <Button
                disabled={loading}
                onClick={doLogin}
                className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-violet shadow-[var(--shadow-glow)]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Entrar <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">NOME COMPLETO</Label>
                <Input
                  value={suNome}
                  onChange={(e) => setSuNome(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">NOME DA EMPRESA *</Label>
                <Input
                  value={suEmpresa}
                  onChange={(e) => setSuEmpresa(e.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="Ex: Jota Tech Info"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">DOMÍNIO DA EMPRESA *</Label>
                <Input
                  value={suDominio}
                  onChange={(e) => setSuDominio(e.target.value.toLowerCase())}
                  className="h-12 rounded-xl"
                  placeholder="Ex: jotatechinfo.com.br"
                />
                <p className="text-[11px] text-muted-foreground">
                  Seus técnicos usarão a primeira parte (antes do ponto) para fazer login.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">CNPJ (Opcional)</Label>
                  <Input
                    value={suCnpj}
                    onChange={(e) => setSuCnpj(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">TELEFONE (Opcional)</Label>
                  <Input
                    value={suTelefone}
                    onChange={(e) => setSuTelefone(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">E-MAIL</Label>
                <Input
                  type="email"
                  value={suEmail}
                  onChange={(e) => setSuEmail(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SENHA</Label>
                <Input
                  type="password"
                  value={suSenha}
                  onChange={(e) => setSuSenha(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <Button
                disabled={loading}
                onClick={doSignup}
                className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-violet shadow-[var(--shadow-glow)]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Criar conta <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
