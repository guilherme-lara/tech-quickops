import { toast } from "sonner";
import type { OS, Tecnico } from "@/lib/useData";
import { detectOSEditChanges } from "./os.rules";

export function useOSEditSave(input: {
  editing: OS | null;
  updateOS: (id: string, patch: Partial<OS>) => Promise<void>;
  tecnicos: Tecnico[];
  registrarLog: (tipo: string, descricao: string) => Promise<void>;
  nomeUsuario: string;
  setEditing: (editing: OS | null) => void;
}) {
  const onSave = async (patch: Partial<OS>) => {
    if (!input.editing) return;
    try {
      await input.updateOS(input.editing.id, patch);
      const changes = detectOSEditChanges(input.editing, patch);
      const mudouStatus = changes.statusChanged;
      const mudouTecnico = changes.technicianChanged;
      if (mudouStatus) {
        await input.registrarLog(
          "os_status_alterado",
          `OS "${input.editing.titulo}" alterada para status ${patch.status} por ${input.nomeUsuario}`,
        );
      }
      if (mudouTecnico) {
        const tecnico = input.tecnicos.find((t) => t.id === patch.tecnicoId);
        await input.registrarLog(
          "os_tecnico_alterado",
          `OS "${input.editing.titulo}" atribuída ao técnico ${tecnico?.nome || "sem técnico"} por ${input.nomeUsuario}`,
        );
      }
      const mudouEquipamento = changes.equipmentChanged;
      if (mudouEquipamento) {
        await input.registrarLog(
          "os_equipamentos_alterados",
          `Equipamentos vinculados à OS "${input.editing.titulo}" atualizados por ${input.nomeUsuario}`,
        );
      }
      toast.success("OS atualizada");
      input.setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar");
    }
  };

  return { onSave };
}
