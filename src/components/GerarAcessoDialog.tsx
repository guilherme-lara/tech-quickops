import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { logActivity } from "@/lib/logger";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tecnico: { id: string; nome: string; user_id?: string | null } | null;
  empresaId?: string;
  codigoEmpresa?: string;
}

/**
 * Gera acesso de login para um técnico já cadastrado em `public.tecnicos`
 * usando supabase.auth.signUp (cliente).
 *
 * Preserva a sessão do administrador restaurando os tokens após o signUp.
 * Depois, faz UPDATE em public.tecnicos.user_id vinculando o novo auth user.
 */
export function GerarAcessoDialog({
  open,
  onOpenChange,
  tecnico,
  empresaId,
  codigoEmpresa = "default",
}: Props) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [username, setUsername] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [successText, setSuccessText] = useState("");
  const [gerarSenha, setGerarSenha] = useState(true);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setUsername("");
    setNovaSenha("");
    setSuccessText("");
    setGerarSenha(true);
  };

  const submit = async () => {
    if (!tecnico || !empresaId) return;
    const u = username.trim().toLowerCase();
    if (!u || !/^[a-z0-9._-]+$/i.test(u))
      return toast.error("Usuário inválido (use letras, números, . _ -)");

    setSaving(true);
    try {
      const senhaFinal = gerarSenha ? Math.random().toString(36).slice(-8).toUpperCase() : novaSenha;
      if (!gerarSenha && senhaFinal.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");

      const { error: rpcError } = await (supabase.rpc as any)("vincular_acesso_tecnico", {
        p_tecnico_id: tecnico.id,
        p_username: u,
        p_senha: senhaFinal,
      });

      if (rpcError) {
        if (/já está em uso|já possui|registrado/i.test(rpcError.message)) {
          throw new Error("Este usuário já possui uma conta de acesso ou o nome de usuário está em uso.");
        }
        throw rpcError;
      }

      await registrarLog("acesso_tecnico_gerado", `Acesso gerado para técnico "${tecnico.nome}" por ${profile?.nome_completo || "Gestor"}`);

      const text = `Olá ${tecnico.nome}! Bem-vindo(a) à equipe técnica.\n\nAqui estão suas credenciais exclusivas de acesso ao aplicativo:\n\n🏢 Código da Empresa: ${codigoEmpresa}\n👤 Usuário: ${u}\n🔑 Senha: ${senhaFinal}\n\nAcesse o link do sistema para entrar.`;

      setSuccessText(text);

      qc.invalidateQueries({ queryKey: ["tecnicos"] });
      qc.invalidateQueries({ queryKey: ["equipe_tecnicos"] });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar acesso");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!saving) {
          if (!v) reset();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar acesso</DialogTitle>
          {!successText && (
            <DialogDescription>
              Criar login para <strong>{tecnico?.nome}</strong>. Ele poderá acessar o app usando o
              usuário e senha abaixo.
            </DialogDescription>
          )}
        </DialogHeader>

        {successText ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
              <p className="font-semibold mb-2">Acesso gerado com sucesso!</p>
              <p className="text-sm opacity-90">
                Copie as credenciais abaixo e envie para o técnico.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl border border-border/50 text-sm whitespace-pre-wrap font-mono">
              {successText}
            </div>
            <DialogFooter className="mt-6 flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                Fechar
              </Button>
              <Button
                className="bg-[#25D366] hover:bg-[#1ebd5a] text-white"
                onClick={() => {
                  navigator.clipboard.writeText(successText);
                  const wppUrl = `https://wa.me/?text=${encodeURIComponent(successText)}`;
                  window.open(wppUrl, "_blank");
                  toast.success("Mensagem copiada e WhatsApp aberto!");
                }}
              >
                Enviar via WhatsApp
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Técnico</Label>
              <Input value={tecnico?.nome || ""} disabled />
            </div>

            <div className="space-y-2">
              <Label>Usuário de Login</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                placeholder="Ex: joao.silva"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Senha</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="gerar-senha"
                    checked={gerarSenha}
                    onChange={(e) => setGerarSenha(e.target.checked)}
                    className="w-3 h-3"
                  />
                  <label htmlFor="gerar-senha" className="text-xs text-muted-foreground cursor-pointer">
                    Gerar automaticamente
                  </label>
                </div>
              </div>
              <Input
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                disabled={gerarSenha}
                placeholder="Digite a senha (mín. 6 chars)"
                type="text"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={saving || !username}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Copy className="w-4 h-4 mr-1" /> Criar acesso</>}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
