import { createFileRoute, Link } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TecnicoLayout } from "@/components/TecnicoLayout";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Maximize, ChevronLeft, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  const { data: tecnicoData, isLoading } = useQuery({
    queryKey: ["tecnico_cracha", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      // Tenta buscar pelo user_id primeiro
      let { data, error } = await supabase
        .from("tecnicos")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle();
      
      if (!data) {
        // Fallback: tenta buscar pelo id (caso antigo)
        const { data: fallbackData } = await supabase
          .from("tecnicos")
          .select("*")
          .eq("id", profile.id)
          .maybeSingle();
        data = fallbackData;
      }
      
      return data;
    },
    enabled: !!profile?.id,
  });
  
  if (!profile) return null;

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getInitials = (name: string) => {
    if (!name) return "TC";
    const parts = name.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const qrData = encodeURIComponent(`https://quickops.jotatech.com.br/v/${profile.id}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&color=000000&bgcolor=ffffff`;

  const dadosAdicionais = (tecnicoData?.dados_adicionais ?? {}) as Record<string, any>;
  const nomeExibicao = tecnicoData?.nome || profile.nome_completo;
  const avatarExibicao = dadosAdicionais.foto || profile.avatarUrl;
  const dataCadastro = tecnicoData?.created_at || new Date().toISOString();

  const hasExtraInfo = Boolean(dadosAdicionais.cpf || dadosAdicionais.rg || tecnicoData?.telefone);

  const CrachaContent = () => (
    <div className="relative flex flex-col items-center w-full max-w-sm mx-auto bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl border border-white/10 shadow-2xl overflow-hidden min-h-[620px] select-none">
      {/* Lanyard Hole */}
      <div className="absolute top-4 w-16 h-3 bg-background/80 rounded-full border border-white/10 shadow-inner z-20 shadow-black/50" />
      
      {/* Top Banner Accent */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-primary/80 to-primary/40 pointer-events-none" />

      {/* Logo Area */}
      <div className="flex justify-center items-center h-20 w-full mt-10 mb-2 z-10 bg-white/5 backdrop-blur-md border-y border-white/10 shadow-sm">
        {profile.empresaLogo ? (
          <img src={profile.empresaLogo} alt={profile.empresaNome || "Empresa"} className="max-h-12 object-contain filter drop-shadow-md" />
        ) : (
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2 drop-shadow-md">
            {profile.empresaNome || "Sua Empresa"}
          </h2>
        )}
      </div>

      <div className="flex flex-col items-center flex-1 w-full px-8 pb-8 z-10 pt-4">
        {/* Avatar / Photo */}
        <div className="relative mb-5 group">
          <div className="w-32 h-32 rounded-full border-4 border-slate-900 bg-muted overflow-hidden shadow-2xl flex items-center justify-center text-4xl font-black text-muted-foreground relative z-10">
            {avatarExibicao ? (
              <img src={avatarExibicao} alt={nomeExibicao} className="w-full h-full object-cover" />
            ) : (
              getInitials(nomeExibicao)
            )}
          </div>
          {/* Subtle glow behind photo */}
          <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full scale-110 -z-10" />
        </div>

        {/* Name and Role */}
        <div className="text-center w-full mb-6">
          <h3 className="text-2xl font-black text-white uppercase tracking-wider truncate w-full drop-shadow-sm">
            {nomeExibicao}
          </h3>
          <p className="text-primary font-bold tracking-widest uppercase mt-1.5 text-sm drop-shadow-sm">
            Técnico Autorizado
          </p>
          {dadosAdicionais.segmento && (
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider mt-0.5">
              {dadosAdicionais.segmento}
            </p>
          )}
        </div>
        
        {/* Extra Info Box - Only shown if there is data */}
        {hasExtraInfo && (
          <div className="flex flex-col items-start gap-2 mb-6 bg-black/40 p-4 rounded-xl border border-white/5 w-full shadow-inner">
            {dadosAdicionais.cpf && (
              <div className="flex items-center justify-between w-full">
                <span className="text-white/40 font-sans text-[10px] uppercase tracking-wider">CPF</span>
                <span className="text-sm font-mono text-white/90">{dadosAdicionais.cpf}</span>
              </div>
            )}
            {dadosAdicionais.rg && (
              <div className="flex items-center justify-between w-full">
                <span className="text-white/40 font-sans text-[10px] uppercase tracking-wider">RG</span>
                <span className="text-sm font-mono text-white/90">{dadosAdicionais.rg}</span>
              </div>
            )}
            {tecnicoData?.telefone && (
              <div className="flex items-center justify-between w-full">
                <span className="text-white/40 font-sans text-[10px] uppercase tracking-wider">TEL</span>
                <span className="text-sm font-mono text-white/90">{tecnicoData.telefone}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center w-full gap-6 mb-6 opacity-80">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">ID Registro</p>
            <p className="text-xs font-mono text-white/90 bg-white/5 px-2 py-1 rounded">{profile.id.substring(0, 8).toUpperCase()}</p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Emissão</p>
            <p className="text-xs font-mono text-white/90 bg-white/5 px-2 py-1 rounded">{new Date(dataCadastro).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* QR Code Validation */}
        <div className="mt-auto flex flex-col items-center">
          <div className="bg-white p-2.5 rounded-xl shadow-xl ring-4 ring-white/5">
            <img 
              src={qrUrl} 
              alt="QR Code Validação" 
              className="w-24 h-24 rounded-md"
              crossOrigin="anonymous"
            />
          </div>
          <p className="text-[9px] text-white/40 mt-4 text-center uppercase tracking-widest max-w-[200px]">
            Escaneie para validar autenticidade
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <TecnicoLayout>
      <div className="flex flex-col h-full min-h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/tecnico/dashboard">
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
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <CrachaContent />
              {isFullscreen && (
                <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
                  <button 
                    onClick={() => setIsFullscreen(false)}
                    className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <X className="w-8 h-8" />
                  </button>
                  <div className="scale-105 sm:scale-110 md:scale-125 transition-transform duration-500 ease-out">
                    <CrachaContent />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </TecnicoLayout>
  );
}
