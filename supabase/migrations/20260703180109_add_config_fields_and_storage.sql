-- Add new fields to empresas
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS endereco_comercial TEXT,
  ADD COLUMN IF NOT EXISTS telefone_empresa TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add new fields to perfis
ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assets', 'assets', true) 
ON CONFLICT (id) DO NOTHING;

-- Set up basic storage policies for the assets bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'assets');

CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'assets');

CREATE POLICY "Authenticated users can update" 
ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'assets');

CREATE POLICY "Authenticated users can delete" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'assets');

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
