import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/useData";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { logActivity } from "@/lib/logger";
import { User, Building2, Save, KeyRound, Upload, Camera, Building } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/configuracoes")({
  component: () => (
    <ProtectedRoute>
      <ConfiguracoesPage />
    </ProtectedRoute>
  ),
});

function ImageUploader({
  currentUrl,
  onUpload,
  isUploading,
  type,
}: {
  currentUrl?: string;
  onUpload: (f: File) => void;
  isUploading: boolean;
  type: "avatar" | "logo";
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  const isAvatar = type === "avatar";

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        onClick={() => !isUploading && fileRef.current?.click()}
        className={`relative group cursor-pointer overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors
          ${isAvatar ? "w-24 h-24 rounded-full" : "w-32 h-24 rounded-xl"}
        `}
      >
        {currentUrl ? (
          <img src={currentUrl} alt="Upload" className="w-full h-full object-cover" />
        ) : isAvatar ? (
          <User className="w-8 h-8 text-muted-foreground/50" />
        ) : (
          <Building className="w-8 h-8 text-muted-foreground/50" />
        )}

        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isUploading ? "opacity-100" : ""}`}
        >
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {isAvatar ? "Foto de Perfil" : "Logo da Empresa"}
      </div>
      <input
        type="file"
        ref={fileRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}

function ConfiguracoesPage() {
  const { user, updateProfile, updateEmpresa, uploadAsset } = useStore();
  const { changePassword } = useAuth();

  // Profile State
  const [nome, setNome] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingNome, setSavingNome] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Empresa State
  const [empresa, setEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Password State
  const [passDialogOpen, setPassDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setNome(user.nome || "");
      setAvatarUrl(user.avatarUrl || "");
      setEmpresa(user.empresaNome || "");
      setCnpj(user.empresaCnpj || "");
      setEndereco(user.empresaEndereco || "");
      setTelefone(user.empresaTelefone || "");
      setLogoUrl(user.empresaLogo || "");
    }
  }, [user]);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAsset(file, `avatars/${user.id}`);
      await updateProfile(nome, url);
      setAvatarUrl(url);

      await logActivity(
        "foto_perfil_atualizada",
        `O usuário ${user.nome || "Desconhecido"} atualizou sua foto de perfil`,
        user.empresaId || "",
        user.nome || "Sistema",
      );

      toast.success("Foto atualizada com sucesso!");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao fazer upload da imagem");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!user) return;
    setUploadingLogo(true);
    try {
      const url = await uploadAsset(file, `logos/${user.empresaId}`);
      await updateEmpresa(empresa, cnpj, endereco, telefone, url);
      setLogoUrl(url);

      await logActivity(
        "logo_empresa_atualizada",
        `A logo da empresa foi atualizada pelo usuário ${user.nome || "Desconhecido"}`,
        user.empresaId || "",
        user.nome || "Sistema",
      );

      toast.success("Logo atualizado com sucesso!");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao fazer upload do logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveProfile = async () => {
    if (!nome.trim()) return toast.error("Informe seu nome");
    setSavingNome(true);
    try {
      await updateProfile(nome.trim(), avatarUrl);
      toast.success("Dados do perfil salvos com sucesso!");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar perfil");
    } finally {
      setSavingNome(false);
    }
  };

  const saveEmpresa = async () => {
    if (!empresa.trim()) return toast.error("Informe o nome da empresa");
    setSavingEmpresa(true);
    try {
      await updateEmpresa(empresa.trim(), cnpj.trim(), endereco.trim(), telefone.trim(), logoUrl);
      toast.success("Dados da empresa salvos com sucesso!");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar empresa");
    } finally {
      setSavingEmpresa(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      return toast.error("A senha deve ter pelo menos 6 caracteres.");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("As senhas não coincidem.");
    }
    setSavingPassword(true);
    try {
      const { error } = await changePassword(newPassword);
      if (error) throw new Error(error);
      toast.success("Senha atualizada com sucesso!");
      setPassDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao alterar a senha");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <GestorLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações da Conta</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie suas informações pessoais e os dados da sua empresa.
          </p>
        </div>

        <div className="grid gap-6">
          {/* PERFIL */}
          <Card className="p-5 md:p-6 shadow-sm border-border/40">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Perfil Pessoal</h2>
                  <p className="text-xs text-muted-foreground">Atualize seus dados de acesso</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-shrink-0 flex justify-center">
                <ImageUploader
                  type="avatar"
                  currentUrl={avatarUrl}
                  isUploading={uploadingAvatar}
                  onUpload={handleAvatarUpload}
                />
              </div>

              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome completo</Label>
                    <Input
                      placeholder="Seu nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail de Acesso</Label>
                    <Input value={user?.email ?? ""} disabled className="bg-muted/50" />
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/50">
                  <Dialog open={passDialogOpen} onOpenChange={setPassDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto text-muted-foreground">
                        <KeyRound className="w-4 h-4 mr-2" />
                        Alterar Senha
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Alterar Senha</DialogTitle>
                        <DialogDescription>
                          Digite sua nova senha abaixo. Ela precisa ter pelo menos 6 caracteres.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleChangePassword} className="space-y-4 mt-2">
                        <div className="space-y-2">
                          <Label>Nova Senha</Label>
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Confirmar Nova Senha</Label>
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={savingPassword}>
                          {savingPassword ? "Atualizando..." : "Atualizar Senha"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Button
                    onClick={saveProfile}
                    disabled={savingNome || uploadingAvatar}
                    className="w-full sm:w-auto"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {savingNome ? "Salvando..." : "Salvar Perfil"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* EMPRESA */}
          <Card className="p-5 md:p-6 shadow-sm border-border/40">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-violet" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Dados da Empresa</h2>
                <p className="text-xs text-muted-foreground">Informações comerciais e fiscais</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-shrink-0 flex justify-center">
                <ImageUploader
                  type="logo"
                  currentUrl={logoUrl}
                  isUploading={uploadingLogo}
                  onUpload={handleLogoUpload}
                />
              </div>

              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Empresa (Fantasia)</Label>
                    <Input
                      placeholder="Sua empresa"
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Código da Empresa (Login)</Label>
                    <Input value={user?.empresaCodigo || ""} disabled className="bg-muted/50 font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone Comercial</Label>
                    <Input
                      placeholder="(00) 0000-0000"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Endereço Comercial</Label>
                    <Input
                      placeholder="Rua, Número, Bairro, Cidade - UF"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end border-t border-border/50">
                  <Button
                    onClick={saveEmpresa}
                    disabled={savingEmpresa || uploadingLogo}
                    className="w-full sm:w-auto"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {savingEmpresa ? "Salvando..." : "Salvar Empresa"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </GestorLayout>
  );
}
