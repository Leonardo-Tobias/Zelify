-- Migration: Adicionar suporte a instâncias corporate
-- Execute este SQL no SQL Editor do Supabase Dashboard

ALTER TABLE public.condominios ADD COLUMN IF NOT EXISTS parent_condominio_id UUID REFERENCES public.condominios(id);
ALTER TABLE public.condominios ADD COLUMN IF NOT EXISTS max_instances INTEGER;

-- Tornar slug e codigo_acesso opcionais (para o container corporate)
ALTER TABLE public.condominios ALTER COLUMN slug DROP NOT NULL;
ALTER TABLE public.condominios ALTER COLUMN codigo_acesso DROP NOT NULL;
