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
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setUsername("");
    setSenha("");
  };

  const submit = async () => {
    if (!tecnico || !empresaId) return;
    const u = username.trim().toLowerCase();
    if (!u || !/^[a-z0-9._-]+$/i.test(u))
      return toast.error("Usuário inválido (use letras, números, . _ -)");
    if (senha.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres");

    setSaving(true);
    try {
      // 1. Preserva sessão do admin
      const { data: sessData } = await supabase.auth.getSession();
      const adminSession = sessData.session;

      const email = `${u}@${codigoEmpresa}.techquickops.com`;

      // 2. Cria conta de auth (client-side). Metadata alimenta o trigger handle_new_user.
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            role: "tecnico",
            empresa_id: empresaId,
            nome_completo: tecnico.nome,
          },
        },
      });

      if (signUpError) {
        if (/already registered|already exists|duplicate/i.test(signUpError.message)) {
          throw new Error("Este usuário já possui uma conta de acesso.");
        }
        throw signUpError;
      }

      const newUserId = signUpData.user?.id;

      // 3. Restaura sessão do admin (signUp autentica o usuário criado)
      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        });
      }

      if (!newUserId) throw new Error("Falha ao obter ID do novo usuário.");

      // 4. Vincula o auth user ao técnico existente
      const { error: linkError } = await (supabase.from("tecnicos") as any)
        .update({ user_id: newUserId, username: u })
        .eq("id", tecnico.id);

      if (linkError) throw linkError;

      toast.success(`Acesso criado! Login: ${u}`, {
        duration: 15000,
        action: {
          label: "Copiar",
          onClick: () => {
            navigator.clipboard
              .writeText(`Usuário: ${u}\nEmpresa: ${codigoEmpresa}\nSenha: ${senha}`)
              .then(() => toast.success("Copiado!"))
              .catch(() => {});
          },
        },
      });

      qc.invalidateQueries({ queryKey: ["tecnicos"] });
      qc.invalidateQueries({ queryKey: ["equipe_tecnicos"] });
      reset();
      onOpenChange(false);
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
          <DialogDescription>
            Criar login para <strong>{tecnico?.nome}</strong>. Ele poderá acessar o app usando o
            usuário e senha abaixo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label>Usuário</Label>
            <div className="flex items-center gap-2">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="ex: joao.silva"
                disabled={saving}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Código da Empresa: <strong>{codigoEmpresa}</strong>
            </p>
          </div>
          <div>
            <Label>Senha inicial</Label>
            <Input
              type="text"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="mínimo 6 caracteres"
              disabled={saving}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Copy className="w-4 h-4 mr-1" /> Criar acesso</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
