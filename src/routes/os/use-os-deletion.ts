import { useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { dispararProcessamentoEmails } from "@/lib/email-trigger";
import { OS } from "@/lib/useData";
import { supabase } from "@/integrations/supabase/client";
import { withSingleFlight } from "@/lib/single-flight";

export function useOSDeletion(input: {
  os: OS[];
  nomeUsuario: string;
  queryClient: QueryClient;
  registrarLog: (tipo: string, descricao: string) => Promise<void>;
}) {
  const [deletingOSIds, setDeletingOSIds] = useState<Set<string>>(() => new Set());

  const handleDeleteOS = (id: string) =>
    withSingleFlight(`ordens-servico:delete:${id}`, async () => {
      setDeletingOSIds((current) => new Set(current).add(id));
      const osItem = input.os.find((o) => o.id === id);
      try {
        if (!confirm(`Tem certeza que deseja excluir a OS ${osItem?.numero || ""}?`)) return;
        const { error } = await supabase.from("ordens_servico").delete().eq("id", id);
        if (error) throw error;
        await input.registrarLog("os_excluida", `OS "${osItem?.titulo || osItem?.numero || id}" excluída por ${input.nomeUsuario}`);
        toast.success("OS excluída com sucesso");
        input.queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
        dispararProcessamentoEmails();
      } catch (e: any) {
        toast.error(e?.message ?? "Erro ao excluir OS");
      } finally {
        setDeletingOSIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
    });

  return { deletingOSIds, handleDeleteOS };
}
