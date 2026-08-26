import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  tipo: string;
  link_acao: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: notificacoes = [] } = useQuery({
    queryKey: ["notificacoes", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("perfil_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) {
        console.error("Erro ao buscar notificações:", error);
        return [];
      }
      return data as Notificacao[];
    },
    enabled: !!profile?.id,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes", profile?.id] });
    }
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("perfil_id", profile?.id)
        .eq("lida", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes", profile?.id] });
      toast.success("Todas as notificações marcadas como lidas.");
    }
  });

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel("notificacoes-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          filter: `perfil_id=eq.${profile.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["notificacoes", profile.id] });
          toast("Nova Notificação", {
            description: payload.new.titulo,
            action: payload.new.link_acao ? {
              label: "Ver",
              onClick: () => navigate({ to: payload.new.link_acao })
            } : undefined
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient, navigate]);

  const unreadCount = notificacoes.filter((n) => !n.lida).length;

  const handleNotificationClick = (n: Notificacao) => {
    if (!n.lida) {
      markAsRead.mutate(n.id);
    }
    if (n.link_acao) {
      setOpen(false);
      navigate({ to: n.link_acao });
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
          <Bell className="w-5 h-5 text-slate-400" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-slate-900">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 shadow-2xl border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between p-4 pb-2">
          <DropdownMenuLabel className="p-0 text-sm font-semibold text-slate-200">Notificações</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              className="h-auto p-0 text-xs text-blue-400 hover:text-blue-300 hover:bg-transparent"
              onClick={() => markAllAsRead.mutate()}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="bg-slate-800" />
        
        <ScrollArea className="h-[300px]">
          {notificacoes.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Nenhuma notificação no momento.
            </div>
          ) : (
            <div className="flex flex-col">
              {notificacoes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "flex flex-col gap-1 p-4 cursor-pointer border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors last:border-0",
                    !n.lida && "bg-blue-500/5"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className={cn(
                      "text-sm font-medium leading-none",
                      !n.lida ? "text-slate-200" : "text-slate-400"
                    )}>
                      {n.titulo}
                    </span>
                    {!n.lida && <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-0.5" />}
                  </div>
                  <span className={cn(
                    "text-xs line-clamp-2",
                    !n.lida ? "text-slate-400" : "text-slate-500"
                  )}>
                    {n.mensagem}
                  </span>
                  <span className="text-[10px] text-slate-600 mt-1 font-mono">
                    {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
