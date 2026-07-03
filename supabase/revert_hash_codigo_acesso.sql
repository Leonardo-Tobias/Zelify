-- Reversão: hash do codigo_acesso → plaintext
-- Execute no SQL Editor do Supabase

-- 1. Reverter a função validar_codigo_acesso para comparação direta
CREATE OR REPLACE FUNCTION public.validar_codigo_acesso(
    p_condominio_id UUID,
    p_codigo TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.condominios
        WHERE id = p_condominio_id
          AND codigo_acesso = p_codigo
    );
END;
$$;

-- 2. Resetar códigos que foram hashados para um valor padrão
-- ATENÇÃO: após rodar isso, os síndicos precisam criar novos PINs em Configurações
UPDATE public.condominios
SET codigo_acesso = '1234'
WHERE length(codigo_acesso) = 64;  -- códigos hashados têm 64 caracteres hex
