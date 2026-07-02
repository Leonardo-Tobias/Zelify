-- Migration: Hash do codigo_acesso
-- Passo 1: Atualizar a função validar_codigo_acesso para usar SHA-256
-- Passo 2: Migrar códigos existentes para hash
-- Execute no SQL Editor do Supabase

-- 1. Criar extensão pgcrypto (se ainda não existir)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Atualizar a função de validação para comparar hashes
CREATE OR REPLACE FUNCTION public.validar_codigo_acesso(
    p_condominio_id UUID,
    p_codigo TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    stored_hash TEXT;
    input_hash TEXT;
BEGIN
    SELECT codigo_acesso INTO stored_hash
    FROM public.condominios
    WHERE id = p_condominio_id;

    IF stored_hash IS NULL THEN
        RETURN FALSE;
    END IF;

    input_hash := encode(sha256(p_codigo::bytea), 'hex');
    RETURN stored_hash = input_hash;
END;
$$;

-- 3. Migrar códigos existentes para hash SHA-256
UPDATE public.condominios
SET codigo_acesso = encode(sha256(codigo_acesso::bytea), 'hex')
WHERE codigo_acesso IS NOT NULL
  AND length(codigo_acesso) = 4;  -- Só migra códigos que ainda estão em plaintext (4 dígitos)
