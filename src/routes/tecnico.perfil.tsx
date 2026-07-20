import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute } from "@tanstack/react-router";
import { TecnicoLayout } from "@/components/TecnicoLayout";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/image-compressor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Camera, Loader2, KeyRound, Save } from "lucide-react";
import { useState, useRef, ChangeEvent } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/tecnico/perfil")({
  component: () => (
    <ProtectedRoute allowedRoles={['tecnico']}>
      <Perfil />
    </ProtectedRoute>
  ),
});

function Perfil() {
  const { user, profile, changePassword } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const tecnicoId = profile?.id;

  const { data: tecnico, isLoading } = useQuery({
    queryKey: ["tecnico_self", tecnicoId],
    enabled: !!tecnicoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tecnicos")
        .select("id, nome, telefone, chave_pix")
        .eq("id", tecnicoId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: perfilRow } = useQuery({
    queryKey: ["perfil_self", tecnicoId],
    enabled: !!tecnicoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis")
        .select("avatar_url")
        .eq("id", tecnicoId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [pix, setPix] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingPix, setSavingPix] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);

  const pixValue = pix ?? tecnico?.chave_pix ?? "";
  const avatarUrl = perfilRow?.avatar_url || undefined;

  const savePix = async () => {
    if (!tecnicoId) return;
    setSavingPix(true);
    try {
      const { error } = await supabase
        .from("tecnicos")
        .update({ chave_pix: pixValue })
        .eq("id", tecnicoId);
      if (error) throw error;
      toast.success("Chave PIX atualizada!");
      qc.invalidateQueries({ queryKey: ["tecnico_self", tecnicoId] });
      setPix(null);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar PIX");
    } finally {
      setSavingPix(false);
    }
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tecnicoId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    setUploading(true);
    try {
      const finalFile = await compressImage(file);
      const ext = finalFile.name.split(".").pop() || "jpg";
      const path = `fotos-tecnicos/${tecnicoId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("assets")
        .upload(path, finalFile, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("assets").getPublicUrl(path);
      const url = pub.publicUrl;

      const { error: updErr } = await (supabase.from("perfis") as any)
        .update({ avatar_url: url })
        .eq("id", tecnicoId);
      if (updErr) throw updErr;

      toast.success("Foto atualizada!");
      qc.invalidateQueries({ queryKey: ["perfil_self", tecnicoId] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar foto");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const trocarSenha = async () => {
    if (senha.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres");
    if (senha !== senha2) return toast.error("As senhas não coincidem");
    setSavingSenha(true);
    try {
      const { error } = await changePassword(senha);
      if (error) throw new Error(error);
      toast.success("Senha alterada com sucesso!");
      setSenha("");
      setSenha2("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao alterar senha");
    } finally {
      setSavingSenha(false);
    }
  };

  return (
    <TecnicoLayout>
      <div className="p-6 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex flex-col items-center rounded-b-3xl">
        <div className="relative">
          <Avatar className="w-24 h-24 border-4 border-primary-foreground/20">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.nome_completo} />}
            <AvatarFallback className="bg-card text-foreground text-2xl">
              {profile?.nome_completo?.[0]}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-background text-foreground flex items-center justify-center shadow-lg active:scale-95 transition disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFile}
          />
        </div>
        <h2 className="font-bold text-lg mt-3">{profile?.nome_completo}</h2>
        <p className="text-sm opacity-80">Técnico</p>
      </div>

      <div className="p-4 space-y-3 pb-28">
        <Card className="p-4 flex items-center gap-3">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{user?.email?.includes("techquickops.com") ? user.email.split("@")[0] : user?.email}</span>
        </Card>

        <Card className="p-4 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Chave PIX
          </Label>
          {isLoading ? (
            <div className="h-10 flex items-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={pixValue}
                onChange={(e) => setPix(e.target.value)}
                placeholder="CPF, e-mail, celular ou chave aleatória"
              />
              <Button onClick={savePix} disabled={savingPix || pix === null}>
                {savingPix ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Alterar senha
            </Label>
          </div>
          <Input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Nova senha (mín. 6)"
          />
          <Input
            type="password"
            value={senha2}
            onChange={(e) => setSenha2(e.target.value)}
            placeholder="Confirme a nova senha"
          />
          <Button
            className="w-full"
            onClick={trocarSenha}
            disabled={savingSenha || !senha || !senha2}
          >
            {savingSenha ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar nova senha"}
          </Button>
        </Card>
      </div>
    </TecnicoLayout>
  );
}
