import { Lock, LogOut, Phone } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/auth-context";

export function Paywall() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/login";
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

        <div className="w-full flex flex-col gap-3 pt-4">
          <Button 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
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
