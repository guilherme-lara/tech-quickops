-- Adiciona o campo de template_rat_texto à tabela de clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS template_rat_texto TEXT;
