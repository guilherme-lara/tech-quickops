import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOSUrlId(onOSFound: (data: unknown) => void) {
  // Keep the original mount-only lookup semantics.
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("id");
    if (id) {
      supabase
        .from("ordens_servico")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data }) => {
          if (data) {
            onOSFound(data);
            // Remove the id from URL so it doesn't reopen on refresh
            window.history.replaceState(null, "", "/os");
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
