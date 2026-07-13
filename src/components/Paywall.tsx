import { Lock, LogOut, Phone, Key } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/auth-context";
import { Input } from "./ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/logger";

export function Paywall() {
  const { user, signOut } = useAuth();
  const [chave, setChave] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const handleValidarChave = async () => {
    if (!chave.trim()) {
      toast.error("Informe a chave de ativação.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await supabase.rpc('validar_chave_licenca', {
        p_chave: chave.trim()
      });

      if (res.error) throw res.error;

      if (res.data === true) {
        toast.success("Assinatura renovada com sucesso! Bem-vindo de volta.");
        await logActivity(
          "renovacao_assinatura",
          `A chave de ativação foi validada através do Paywall e a assinatura estendida por +30 dias.`,
          user?.empresaId || "",
          user?.nome || "Sistema"
        );
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        toast.error("Chave de ativação inválida ou já utilizada.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao validar chave. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-lg p-8 flex flex-col items-center text-center space-y-6">
        
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-red-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Acesso Bloqueado</h1>
          <p className="text-muted-foreground text-sm">
            O acesso da sua empresa ao sistema foi temporariamente suspenso. Por favor, entre em contato com o suporte ou renove sua assinatura para restaurar o acesso.
          </p>
        </div>

        <div className="w-full space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <p className="text-sm text-left font-medium text-slate-700">Já possui uma nova chave?</p>
            <div className="flex gap-2">
              <Input 
                placeholder="Ex: TECH-ABCD-1234-EFGH" 
                value={chave}
                onChange={(e) => setChave(e.target.value)}
                className="font-mono text-sm uppercase"
              />
              <Button 
                onClick={handleValidarChave} 
                disabled={isSubmitting || !chave}
                className="shrink-0"
              >
                <Key className="w-4 h-4 mr-2" />
                Ativar
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 pt-2">
            <Button 
              className="w-full bg-slate-800 text-white hover:bg-slate-700 flex items-center justify-center gap-2"
              onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
            >
              <Phone className="w-4 h-4" />
              Falar com Suporte
            </Button>

          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>

      </div>
    </div>
  );
}
