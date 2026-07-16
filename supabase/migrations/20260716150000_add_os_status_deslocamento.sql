-- Add em_deslocamento to os_status enum
ALTER TYPE public.os_status ADD VALUE IF NOT EXISTS 'em_deslocamento';
