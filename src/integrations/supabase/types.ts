export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analistas_cliente: {
        Row: {
          cliente_id: string
          created_at: string
          empresa_id: string
          id: string
          nome: string
          whatsapp: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          whatsapp?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analistas_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analistas_cliente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          base_km: number | null
          cidade: string | null
          created_at: string
          dia_envio_planilha: number | null
          dias_pagamento: string | null
          documento: string | null
          email: string | null
          empresa_id: string
          endereco_completo: string | null
          id: string
          modelo_rat_url: string | null
          nome: string
          telefone: string | null
          valor_km: number
          valor_por_km: number | null
          ultimo_mes_pago: string | null
        }
        Insert: {
          base_km?: number | null
          cidade?: string | null
          created_at?: string
          dia_envio_planilha?: number | null
          dias_pagamento?: string | null
          documento?: string | null
          email?: string | null
          empresa_id: string
          endereco_completo?: string | null
          id?: string
          modelo_rat_url?: string | null
          nome: string
          telefone?: string | null
          valor_km?: number
          valor_por_km?: number | null
          ultimo_mes_pago?: string | null
        }
        Update: {
          base_km?: number | null
          cidade?: string | null
          created_at?: string
          dia_envio_planilha?: number | null
          dias_pagamento?: string | null
          documento?: string | null
          email?: string | null
          empresa_id?: string
          endereco_completo?: string | null
          id?: string
          modelo_rat_url?: string | null
          nome?: string
          telefone?: string | null
          valor_km?: number
          valor_por_km?: number | null
          ultimo_mes_pago?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          chave_ativacao: string | null
          cnpj: string | null
          codigo_empresa: string
          created_at: string
          data_vencimento: string | null
          dominio: string | null
          endereco_comercial: string | null
          id: string
          logo_url: string | null
          nome_fantasia: string
          plano: string | null
          status_licenca: string | null
          telefone_empresa: string | null
        }
        Insert: {
          chave_ativacao?: string | null
          cnpj?: string | null
          codigo_empresa: string
          created_at?: string
          data_vencimento?: string | null
          dominio?: string | null
          endereco_comercial?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia: string
          plano?: string | null
          status_licenca?: string | null
          telefone_empresa?: string | null
        }
        Update: {
          chave_ativacao?: string | null
          cnpj?: string | null
          codigo_empresa?: string
          created_at?: string
          data_vencimento?: string | null
          dominio?: string | null
          endereco_comercial?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia?: string
          plano?: string | null
          status_licenca?: string | null
          telefone_empresa?: string | null
        }
        Relationships: []
      }
      itens_inventario: {
        Row: {
          codigo: string | null
          created_at: string
          empresa_id: string
          id: string
          nome: string
          quantidade: number
          valor_unitario: number
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          quantidade?: number
          valor_unitario?: number
        }
        Update: {
          codigo?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          quantidade?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_inventario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_administrativos: {
        Row: {
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          tipo: string
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          tipo: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          tipo?: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: []
      }
      ordens_servico: {
        Row: {
          analista_id: string | null
          cliente_id: string
          created_at: string
          custo_viagem: number
          dados_adicionais: Json
          data_agendamento: string | null
          data_atendimento: string | null
          descricao_problema: string
          despesas: Json
          empresa_id: string
          endereco_servico: string | null
          horario_atendimento: string | null
          id: string
          km_viagem: number
          numero: string | null
          pendencias_detalhes: string | null
          solucao: string | null
          status: Database["public"]["Enums"]["os_status"]
          tecnico_id: string | null
          titulo: string
          valor: number
        }
        Insert: {
          analista_id?: string | null
          cliente_id: string
          created_at?: string
          custo_viagem?: number
          dados_adicionais?: Json
          data_agendamento?: string | null
          data_atendimento?: string | null
          descricao_problema?: string
          despesas?: Json
          empresa_id: string
          endereco_servico?: string | null
          horario_atendimento?: string | null
          id?: string
          km_viagem?: number
          numero?: string | null
          pendencias_detalhes?: string | null
          solucao?: string | null
          status?: Database["public"]["Enums"]["os_status"]
          tecnico_id?: string | null
          titulo?: string
          valor?: number
        }
        Update: {
          analista_id?: string | null
          cliente_id?: string
          created_at?: string
          custo_viagem?: number
          dados_adicionais?: Json
          data_agendamento?: string | null
          data_atendimento?: string | null
          descricao_problema?: string
          despesas?: Json
          empresa_id?: string
          endereco_servico?: string | null
          horario_atendimento?: string | null
          id?: string
          km_viagem?: number
          numero?: string | null
          pendencias_detalhes?: string | null
          solucao?: string | null
          status?: Database["public"]["Enums"]["os_status"]
          tecnico_id?: string | null
          titulo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_analista_id_fkey"
            columns: ["analista_id"]
            isOneToOne: false
            referencedRelation: "analistas_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "view_ranking_tecnicos_mensal"
            referencedColumns: ["tecnico_id"]
          },
          {
            foreignKeyName: "ordens_servico_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "vw_produtividade_tecnico"
            referencedColumns: ["tecnico_id"]
          },
        ]
      }
      os_historico: {
        Row: {
          alteracoes: Json | null
          alterado_por: string | null
          alterado_por_nome: string | null
          created_at: string
          empresa_id: string
          id: string
          os_id: string
          status_anterior: string | null
          status_novo: string | null
          tecnico_id: string | null
          tecnico_id_anterior: string | null
          tecnico_user_id: string | null
          tecnico_user_id_anterior: string | null
          tipo_evento: string
        }
        Insert: {
          alteracoes?: Json | null
          alterado_por?: string | null
          alterado_por_nome?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          os_id: string
          status_anterior?: string | null
          status_novo?: string | null
          tecnico_id?: string | null
          tecnico_id_anterior?: string | null
          tecnico_user_id?: string | null
          tecnico_user_id_anterior?: string | null
          tipo_evento: string
        }
        Update: {
          alteracoes?: Json | null
          alterado_por?: string | null
          alterado_por_nome?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          os_id?: string
          status_anterior?: string | null
          status_novo?: string | null
          tecnico_id?: string | null
          tecnico_id_anterior?: string | null
          tecnico_user_id?: string | null
          tecnico_user_id_anterior?: string | null
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_historico_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_inventario: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          item_id: string
          os_id: string
          quantidade: number
          valor_total_item: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          item_id: string
          os_id: string
          quantidade: number
          valor_total_item?: number
          valor_unitario?: number
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          item_id?: string
          os_id?: string
          quantidade?: number
          valor_total_item?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "os_inventario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_inventario_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_inventario_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          avatar_url: string | null
          created_at: string
          empresa_id: string
          id: string
          nome_completo: string
          role: Database["public"]["Enums"]["app_role"]
          telefone: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          empresa_id: string
          id: string
          nome_completo?: string
          role?: Database["public"]["Enums"]["app_role"]
          telefone?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          nome_completo?: string
          role?: Database["public"]["Enums"]["app_role"]
          telefone?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      rat_arquivos: {
        Row: {
          arquivo_url: string
          created_at: string
          enviado_por_role: string
          id: string
          nome_arquivo: string
          ordem_servico_id: string
          tipo_arquivo: string
        }
        Insert: {
          arquivo_url: string
          created_at?: string
          enviado_por_role?: string
          id?: string
          nome_arquivo: string
          ordem_servico_id: string
          tipo_arquivo?: string
        }
        Update: {
          arquivo_url?: string
          created_at?: string
          enviado_por_role?: string
          id?: string
          nome_arquivo?: string
          ordem_servico_id?: string
          tipo_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "rat_arquivos_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      tecnicos: {
        Row: {
          ativo: boolean
          chave_pix: string | null
          comissao: number | null
          created_at: string
          dados_adicionais: Json | null
          empresa_id: string
          id: string
          nome: string
          perfil: string | null
          telefone: string | null
          tipo_comissao: Database["public"]["Enums"]["tipo_comissao_enum"]
          user_id: string | null
          username: string | null
        }
        Insert: {
          ativo?: boolean
          chave_pix?: string | null
          comissao?: number | null
          created_at?: string
          dados_adicionais?: Json | null
          empresa_id: string
          id?: string
          nome: string
          perfil?: string | null
          telefone?: string | null
          tipo_comissao?: Database["public"]["Enums"]["tipo_comissao_enum"]
          user_id?: string | null
          username?: string | null
        }
        Update: {
          ativo?: boolean
          chave_pix?: string | null
          comissao?: number | null
          created_at?: string
          dados_adicionais?: Json | null
          empresa_id?: string
          id?: string
          nome?: string
          perfil?: string | null
          telefone?: string | null
          tipo_comissao?: Database["public"]["Enums"]["tipo_comissao_enum"]
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tecnicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      view_dashboard_tecnico: {
        Row: {
          concluidas: number | null
          empresa_id: string | null
          mes: string | null
          pendentes: number | null
          tecnico_id: string | null
          total_mes: number | null
          valor_recebido: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "view_ranking_tecnicos_mensal"
            referencedColumns: ["tecnico_id"]
          },
          {
            foreignKeyName: "ordens_servico_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "vw_produtividade_tecnico"
            referencedColumns: ["tecnico_id"]
          },
        ]
      }
      view_ranking_tecnicos: {
        Row: {
          concluidas: number | null
          tecnico: string | null
          total_os: number | null
          valor_gerado: number | null
        }
        Relationships: []
      }
      view_ranking_tecnicos_mensal: {
        Row: {
          faturamento_gerado: number | null
          mes_referencia: string | null
          os_finalizadas: number | null
          tecnico_id: string | null
          tecnico_nome: string | null
        }
        Relationships: []
      }
      view_resumo_gestor: {
        Row: {
          concluidas_mes: number | null
          faturamento_mes: number | null
          total_os_mes: number | null
          total_pendentes: number | null
        }
        Relationships: []
      }
      view_resumo_gestor_mensal: {
        Row: {
          concluidas_mes: number | null
          custos_viagem_mes: number | null
          faturamento_mes: number | null
          mes_referencia: string | null
          os_mes: number | null
          pendentes_globais: number | null
        }
        Relationships: []
      }
      vw_produtividade_tecnico: {
        Row: {
          comissao_pagar: number | null
          comissao_regra: number | null
          custos_materiais: number | null
          custos_viagem: number | null
          empresa_id: string | null
          faturamento: number | null
          nome: string | null
          os_concluidas: number | null
          tecnico_id: string | null
          tipo_comissao:
            | Database["public"]["Enums"]["tipo_comissao_enum"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "tecnicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      criar_tecnico: {
        Args: {
          p_chave_pix?: string
          p_comissao: number
          p_dados_adicionais?: Json
          p_nome: string
          p_senha: string
          p_telefone?: string
          p_tipo_comissao: Database["public"]["Enums"]["tipo_comissao_enum"]
          p_username: string
        }
        Returns: string
      }
      criar_usuario_backoffice:
        | {
            Args: {
              p_dominio?: string
              p_nome: string
              p_role: Database["public"]["Enums"]["app_role"]
              p_senha: string
              p_username: string
            }
            Returns: string
          }
        | {
            Args: {
              p_dominio?: string
              p_nome: string
              p_role: Database["public"]["Enums"]["app_role"]
              p_senha: string
              p_telefone?: string
              p_username: string
            }
            Returns: string
          }
      gerar_chave_licenca_segura: {
        Args: { p_empresa_id: string }
        Returns: string
      }
      get_current_empresa_id: { Args: never; Returns: string }
      get_email_by_username:
        | { Args: { p_username: string }; Returns: string }
        | {
            Args: { p_codigo_empresa: string; p_username: string }
            Returns: string
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      resetar_senha_tecnico: {
        Args: { p_nova_senha: string; p_tecnico_id: string }
        Returns: boolean
      }
      validar_chave_licenca: { Args: { p_chave: string }; Returns: boolean }
      vincular_acesso_tecnico: {
        Args: { p_senha: string; p_tecnico_id: string; p_username: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "gestor" | "analista" | "tecnico"
      os_status:
        | "agendamento"
        | "aprovado"
        | "cancelado"
        | "concluido"
        | "concluido_tecnico"
        | "em_andamento"
        | "em_deslocamento"
        | "pendencia"
        | "pendente"
        | "reagendado"
      tipo_comissao_enum: "fixo" | "porcentagem"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["superadmin", "admin", "gestor", "analista", "tecnico"],
      os_status: [
        "pendente",
        "aprovado",
        "em_andamento",
        "concluido",
        "cancelado",
        "agendamento",
        "reagendado",
        "concluido_tecnico",
        "pendencia",
      ],
      tipo_comissao_enum: ["fixo", "porcentagem"],
    },
  },
} as const
