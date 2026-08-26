import { createFileRoute, Link } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TecnicoLayout } from "@/components/TecnicoLayout";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Maximize, ChevronLeft } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/tecnico/cracha")({
  component: () => (
    <ProtectedRoute allowedRoles={["tecnico", "gestor", "admin", "superadmin"]}>
      <TecnicoCrachaPage />
    </ProtectedRoute>
  ),
});

function TecnicoCrachaPage() {
  const { profile } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  if (!profile) return null;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Erro ao ativar tela cheia: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "TC";
    const parts = name.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const qrData = encodeURIComponent(`https://quickops.app/v/${profile.id}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&color=000000&bgcolor=ffffff`;

  const CrachaContent = () => (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto bg-[#0a0f1c] rounded-[2.5rem] border border-border/20 shadow-2xl overflow-hidden p-8 relative min-h-[550px]">
      {/* Background glow */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="flex justify-center items-center h-16 w-full mb-10 z-10">
        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          {profile.empresaNome || "Sua Empresa"}
        </h2>
      </div>

      <p className="text-primary text-xs font-bold tracking-widest uppercase mb-4 z-10">
        Técnico Autorizado
      </p>

      {/* Avatar / Photo */}
      <div className="relative mb-6 z-10 group">
        <div className="w-28 h-28 rounded-full border-4 border-background bg-muted overflow-hidden shadow-lg flex items-center justify-center text-3xl font-black text-muted-foreground relative z-10">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.nome_completo} className="w-full h-full object-cover" />
          ) : (
            getInitials(profile.nome_completo)
          )}
        </div>
        <div className="absolute inset-0 bg-primary/40 blur-2xl rounded-full scale-110 -z-10" />
      </div>

      {/* Name and Info */}
      <div className="text-center mb-8 z-10 w-full space-y-1">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider truncate w-full px-2">
          {profile.nome_completo}
        </h3>
        <p className="text-sm text-muted-foreground">
          ID: {profile.id.substring(0, 8).toUpperCase()}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2">
          Cadastrado em {new Date(profile.created_at).toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* QR Code */}
      <div className="mt-auto bg-white p-3 rounded-2xl shadow-xl z-10">
        <img 
          src={qrUrl} 
          alt="QR Code Validação" 
          className="w-32 h-32 rounded-lg"
          crossOrigin="anonymous"
        />
      </div>
      
      <p className="text-[10px] text-muted-foreground/50 mt-4 z-10 text-center w-full">
        Escaneie para validar a identidade deste prestador.
      </p>
    </div>
  );

  return (
    <TecnicoLayout>
      <div className="flex flex-col h-full min-h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/tecnico">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold tracking-tight">Meu Crachá</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-10">
              Apresente este crachá ao cliente para identificação no atendimento.
            </p>
          </div>
          
          <Button 
            onClick={toggleFullscreen}
            className="gap-2 bg-primary/20 text-primary hover:bg-primary/30 border-0"
            variant="outline"
          >
            <Maximize className="w-4 h-4" />
            {isFullscreen ? "Sair Tela Cheia" : "Tela Cheia"}
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center py-6">
          <CrachaContent />
        </div>
      </div>
    </TecnicoLayout>
  );
}
