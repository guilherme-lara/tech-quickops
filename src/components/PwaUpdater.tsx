import { useEffect } from "react";
import { toast } from "sonner";
import { setupPwa } from "@/lib/pwa";

export function PwaUpdater() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    setupPwa((update) => {
      toast("Nova versão disponível!", {
        description: "Uma nova versão do QuickOps foi baixada. Deseja recarregar?",
        action: { label: "Atualizar", onClick: () => update() },
        duration: Infinity,
      });
    });

    // Dica de instalação no iOS (Safari não tem prompt nativo)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua) || (/mac/.test(ua) && "ontouchend" in document);
    const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore Safari legacy
      window.navigator.standalone === true;

    if (isIos && isSafari && !standalone && !localStorage.getItem("ios-pwa-prompt")) {
      const done = () => localStorage.setItem("ios-pwa-prompt", "true");
      toast.info("Instale o QuickOps no seu iPhone", {
        description: "Toque em Compartilhar e depois em 'Adicionar à Tela de Início'.",
        duration: 12000,
        onDismiss: done,
        onAutoClose: done,
      });
    }
  }, []);

  return null;
}
