import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AnalistaOpt = { id: string; nome: string; whatsapp: string | null };

export function useAnalistasByCliente(clienteId: string | undefined) {
  const [analistas, setAnalistas] = useState<AnalistaOpt[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!clienteId) {
      setAnalistas([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase.from("analistas_cliente" as any) as any)
        .select("id, nome, whatsapp")
        .eq("cliente_id", clienteId)
        .order("nome");
      if (!cancel) {
        if (!error) setAnalistas((data ?? []) as AnalistaOpt[]);
        setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [clienteId]);
  return { analistas, loading, setAnalistas };
}
