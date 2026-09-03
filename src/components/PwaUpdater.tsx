import { useEffect } from "react";
import { toast } from "sonner";
// @ts-ignore
import { registerSW } from "virtual:pwa-register";

export function PwaUpdater() {
  useEffect(() => {
    // Só registra no client-side
    if (typeof window !== "undefined") {
      const updateSW = registerSW({
        onNeedRefresh() {
          toast("Nova versão disponível!", {
            description: "Uma nova versão do QuickOps foi baixada. Deseja recarregar?",
            action: {
              label: "Atualizar",
              onClick: () => updateSW(true),
            },
            duration: Infinity,
          });
        },
        onOfflineReady() {
          toast.success("Pronto para uso Offline", {
            description: "O sistema baixou os arquivos necessários para rodar sem internet.",
          });
        },
      });
    }
  }, []);

  return null;
}
