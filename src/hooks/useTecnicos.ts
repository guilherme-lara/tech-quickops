import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tecnico, TipoComissao, PAGE_SIZE } from "@/lib/useData";

export function useTecnicos(empresaId?: string, page: number = 0, search: string = "") {
  return useQuery({
    queryKey: ["equipe_tecnicos", empresaId, page, search],
    enabled: !!empresaId,
    queryFn: async () => {
      if (!empresaId) return { data: [], count: 0 };

      let query = supabase
        .from("tecnicos")
        .select("*", { count: "exact" })
        .eq("empresa_id", empresaId);

      if (search) {
        query = query.ilike("nome", `%${search}%`);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("🔥 ERRO SUPABASE TÉCNICOS:", error.message, error.hint, error.details);
        throw error;
      }

      const formattedData: Tecnico[] = ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        nome: r.nome,
        perfil: r.perfil ?? "",
        telefone: r.telefone ?? "",
        ativo: r.ativo,
        comissao: Number(r.comissao || 0),
        tipo_comissao: (r.tipo_comissao as TipoComissao) ?? "fixo",
        chave_pix: r.chave_pix ?? "",
        username: r.username ?? "",
        dados_adicionais: r.dados_adicionais ?? {},
      }));

      return { data: formattedData, count: count ?? 0 };
    },
  });
}

export function useActiveOSCount(empresaId?: string) {
  return useQuery({
    queryKey: ["active_os_count", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      if (!empresaId) return [];
      
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("id, tecnico_id")
        .eq("empresa_id", empresaId)
        .in("status", ["agendamento", "em_andamento", "concluido_tecnico", "pendencia"]);
        
      if (error) {
        console.error("Erro ao buscar OS ativas:", error);
        throw error;
      }
      
      return data || [];
    }
  });
}

export function useUpdateTecnico() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Tecnico> }) => {
      const dbPatch: Record<string, any> = {};
      if (patch.nome !== undefined) dbPatch.nome = patch.nome;
      if (patch.perfil !== undefined) dbPatch.perfil = patch.perfil;
      if (patch.ativo !== undefined) dbPatch.ativo = patch.ativo;
      if (patch.comissao !== undefined) dbPatch.comissao = patch.comissao;
      if (patch.tipo_comissao !== undefined) dbPatch.tipo_comissao = patch.tipo_comissao;
      if (patch.chave_pix !== undefined) dbPatch.chave_pix = patch.chave_pix;
      if (patch.username !== undefined) dbPatch.username = patch.username || null;
      if (patch.dados_adicionais !== undefined) dbPatch.dados_adicionais = patch.dados_adicionais;

      const { error } = await supabase
        .from("tecnicos")
        .update(dbPatch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tecnicos"] });
      qc.invalidateQueries({ queryKey: ["equipe_tecnicos"] });
    },
  });
}

export function useDeleteTecnico() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tecnicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tecnicos"] });
    },
  });
}
