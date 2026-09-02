import { useState, useEffect } from "react";
import { Sparkles, Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ChangelogEntry {
  id: string;
  versao: string;
  titulo: string;
  descricao: string;
  features: string[];
  created_at: string;
}

export function ChangelogModal() {
  const [open, setOpen] = useState(false);
  // Optional: Keep track of last seen version in localStorage to show a badge on the trigger
  const [hasNew, setHasNew] = useState(false);

  const { data: changelogs = [], isLoading } = useQuery({
    queryKey: ["changelog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("changelog")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Erro ao buscar changelog:", error);
        return [];
      }
      return data as ChangelogEntry[];
    },
  });

  useEffect(() => {
    if (changelogs.length > 0) {
      const latest = changelogs[0].id;
      const seen = localStorage.getItem("last_seen_changelog");
      if (seen !== latest) {
        setHasNew(true);
      }
    }
  }, [changelogs]);

  const handleOpen = (val: boolean) => {
    setOpen(val);
    if (val && changelogs.length > 0) {
      setHasNew(false);
      localStorage.setItem("last_seen_changelog", changelogs[0].id);
    }
  };

  useEffect(() => {
    const onOpenChangelog = () => handleOpen(true);
    window.addEventListener("open-changelog", onOpenChangelog);
    return () => window.removeEventListener("open-changelog", onOpenChangelog);
  }, [changelogs.length]);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full group">
          <Sparkles className="w-5 h-5 text-slate-400 group-hover:text-yellow-400 transition-colors" />
          {hasNew && (
            <span className="absolute top-0.5 right-0.5 flex h-2.5 w-2.5 rounded-full bg-yellow-500 ring-2 ring-slate-900" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 p-0 overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 sm:p-8 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-10 opacity-10 pointer-events-none">
            <Megaphone className="w-48 h-48" />
          </div>
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm z-10">
            <Megaphone className="w-8 h-8 text-white" />
          </div>
          <div className="z-10">
            <DialogTitle className="text-2xl font-black text-white tracking-tight">Novidades</DialogTitle>
            <p className="text-blue-100 mt-1 text-sm">Fique por dentro das últimas atualizações do sistema.</p>
          </div>
        </div>

        <ScrollArea className="h-[60vh] sm:h-[500px]">
          <div className="p-6 sm:p-8 space-y-10">
            {isLoading ? (
              <div className="text-center text-slate-500 py-10">Carregando novidades...</div>
            ) : changelogs.length === 0 ? (
              <div className="text-center text-slate-500 py-10">Nenhuma novidade registrada ainda.</div>
            ) : (
              <>
              {/* Índice por versão e data */}
              <nav className="rounded-xl border border-slate-800 bg-slate-800/40 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Índice</p>
                <ul className="space-y-1.5">
                  {changelogs.map((cl) => (
                    <li key={`idx-${cl.id}`}>
                      <button
                        type="button"
                        onClick={() => document.getElementById(`changelog-${cl.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        className="w-full flex items-center justify-between gap-3 text-left rounded-lg px-2 py-1.5 hover:bg-slate-800 transition-colors group"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {cl.versao && (
                            <span className="text-xs font-mono font-bold text-blue-400 shrink-0">v{cl.versao}</span>
                          )}
                          <span className="text-sm text-slate-300 truncate group-hover:text-white">{cl.titulo}</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 shrink-0">
                          {new Date(cl.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              {changelogs.map((cl, i) => (
                <div key={cl.id} id={`changelog-${cl.id}`} className="relative scroll-mt-6">
                  {/* Timeline line */}
                  {i !== changelogs.length - 1 && (
                    <div className="absolute left-2 top-8 bottom-[-2.5rem] w-px bg-slate-800" />
                  )}
                  
                  <div className="flex gap-4">
                    {/* Bullet */}
                    <div className="relative z-10 mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500 ring-4 ring-slate-900" />
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-baseline justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-slate-200">{cl.titulo}</h3>
                          {cl.versao && (
                            <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                              v{cl.versao}
                            </Badge>
                          )}
                        </div>
                        <time className="text-xs font-mono text-slate-500 shrink-0">
                          {new Date(cl.created_at).toLocaleDateString('pt-BR', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </time>
                      </div>
                      
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {cl.descricao}
                      </p>

                      {cl.features && Array.isArray(cl.features) && cl.features.length > 0 && (
                        <ul className="space-y-2 mt-4">
                          {cl.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                              <span className="text-blue-500 shrink-0 mt-0.5">•</span>
                              <span dangerouslySetInnerHTML={{ __html: feature }} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
