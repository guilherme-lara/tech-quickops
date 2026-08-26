import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface ConfirmContextType {
  confirm: (options?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const [resolver, setResolver] = useState<(value: boolean) => void>();
  const [isProcessing, setIsProcessing] = useState(false);

  const confirm = useCallback((opts?: ConfirmOptions) => {
    setOptions(opts || {});
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleCancel = () => {
    setOpen(false);
    resolver?.(false);
  };

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Allow for UI update before resolving, so if resolving triggers a slow operation,
    // we can show a loading state on the button if we wanted to (though mostly they await the confirm).
    // Actually, usually the `confirm` just returns true and the caller handles the slow op.
    // So we just close it immediately.
    setOpen(false);
    setIsProcessing(false);
    resolver?.(true);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title || "Você tem certeza?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {options.description || "Esta ação não pode ser desfeita. Você quer continuar?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel} disabled={isProcessing}>
              {options.cancelText || "Cancelar"}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm} 
              disabled={isProcessing}
              className={options.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : (options.confirmText || "Confirmar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm deve ser usado dentro de um ConfirmDialogProvider");
  }
  return context.confirm;
}
