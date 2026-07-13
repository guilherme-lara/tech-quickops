-- Adiciona a coluna para saber de onde veio o arquivo (gestor ou tecnico)
ALTER TABLE public.rat_arquivos
ADD COLUMN enviado_por_role TEXT NOT NULL DEFAULT 'tecnico';

-- Adiciona a coluna para saber se é uma foto, um documento ou uma rat padronizada
-- (ex: 'foto', 'rat', 'rat_padrao', 'documento')
ALTER TABLE public.rat_arquivos
ADD COLUMN tipo_arquivo TEXT NOT NULL DEFAULT 'foto';
