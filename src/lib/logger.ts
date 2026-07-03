import { supabase } from "../integrations/supabase/client";

/**
 * Registra uma atividade no sistema de auditoria (logs_administrativos)
 * @param tipo - Tipo do evento (ex: 'os_criada', 'cliente_deletado', 'tecnico_editado')
 * @param descricao - Descrição legível do evento
 * @param empresa_id - ID da empresa
 */
export async function logActivity(
  tipo: string,
  descricao: string,
  empresa_id: string
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      console.error("Não foi possível obter o usuário autenticado para registrar log.");
      return;
    }

    // Buscar o perfil do usuário autenticado para pegar o nome
    const { data: perfil, error: perfilError } = await supabase
      .from("perfis")
      .select("nome_completo")
      .eq("id", userId)
      .single();

    if (perfilError || !perfil) {
      console.error("Erro ao buscar perfil do usuário:", perfilError);
      return;
    }

    // Inserir o log
    const { error: insertError } = await supabase
      .from("logs_administrativos")
      .insert({
        empresa_id,
        usuario_id: (await supabase.auth.getUser()).data.user?.id,
        usuario_nome: perfil.nome_completo,
        tipo,
        descricao,
      });

    if (insertError) {
      console.error("Erro ao registrar log:", insertError);
    }
  } catch (error) {
    console.error("Erro ao registrar atividade:", error);
  }
}