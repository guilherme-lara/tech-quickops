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

      // Detecção de iOS para sugerir "Adicionar à Tela de Início"
      const isIos = () => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod/.test(userAgent);
      };

      const isInStandaloneMode = () =>
        // @ts-ignore
        'standalone' in window.navigator && window.navigator.standalone;

      // Se for iOS e não estiver no modo PWA, mostramos a dica
      if (isIos() && !isInStandaloneMode()) {
        const hasSeenPrompt = localStorage.getItem("ios-pwa-prompt");
        if (!hasSeenPrompt) {
          toast.info("Instale o App no iOS", {
            description: "Para uma melhor experiência, toque em Compartilhar e 'Adicionar à Tela de Início'.",
            duration: 10000,
            onDismiss: () => {
              localStorage.setItem("ios-pwa-prompt", "true");
            },
            onAutoClose: () => {
              localStorage.setItem("ios-pwa-prompt", "true");
            }
          });
        }
      }
    }
  }, []);

  return null;
}
