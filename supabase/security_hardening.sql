-- Correções de segurança para ambientes Zelcon já existentes.
-- Execute este arquivo uma única vez no SQL Editor do Supabase antes do novo deploy.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.condominios
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS pending_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS pending_plan_type TEXT CHECK (pending_plan_type IN ('pro', 'corporate')),
  ADD COLUMN IF NOT EXISTS pending_billing_type TEXT CHECK (pending_billing_type IN ('PIX', 'CREDIT_CARD')),
  ADD COLUMN IF NOT EXISTS pending_max_instances INTEGER;

UPDATE public.condominios c
SET created_by = (
  SELECT ug.user_id
  FROM public.usuarios_gestores ug
  WHERE ug.condominio_id = c.id
  ORDER BY ug.created_at
  LIMIT 1
)
WHERE c.created_by IS NULL;

CREATE OR REPLACE FUNCTION public.hash_codigo_acesso()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo_acesso IS NOT NULL
     AND NEW.codigo_acesso !~ '^\$2[aby]\$' THEN
    NEW.codigo_acesso := crypt(NEW.codigo_acesso, gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS condominios_hash_codigo_acesso ON public.condominios;
CREATE TRIGGER condominios_hash_codigo_acesso
BEFORE INSERT OR UPDATE OF codigo_acesso ON public.condominios
FOR EACH ROW EXECUTE FUNCTION public.hash_codigo_acesso();

UPDATE public.condominios
SET codigo_acesso = crypt(codigo_acesso, gen_salt('bf', 10))
WHERE codigo_acesso IS NOT NULL
  AND codigo_acesso !~ '^\$2[aby]\$';

CREATE TABLE IF NOT EXISTS public.portal_access_attempts (
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (condominio_id, ip_hash)
);
ALTER TABLE public.portal_access_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_access_attempts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.validar_acesso_portal(
  p_condominio_id UUID,
  p_codigo TEXT,
  p_ip_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo_hash TEXT;
  v_status TEXT;
  v_attempts INTEGER := 0;
  v_blocked_until TIMESTAMPTZ;
  v_remaining INTEGER;
BEGIN
  SELECT codigo_acesso, subscription_status
  INTO v_codigo_hash, v_status
  FROM public.condominios
  WHERE id = p_condominio_id;

  IF v_codigo_hash IS NULL OR v_status <> 'active' THEN
    RETURN jsonb_build_object('valid', false, 'remaining', 0);
  END IF;

  SELECT attempts, blocked_until
  INTO v_attempts, v_blocked_until
  FROM public.portal_access_attempts
  WHERE condominio_id = p_condominio_id AND ip_hash = p_ip_hash
  FOR UPDATE;

  IF v_blocked_until IS NOT NULL AND v_blocked_until > now() THEN
    RETURN jsonb_build_object(
      'valid', false,
      'blocked', true,
      'retry_after', GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_blocked_until - now())))::INTEGER)
    );
  END IF;

  IF crypt(p_codigo, v_codigo_hash) = v_codigo_hash THEN
    DELETE FROM public.portal_access_attempts
    WHERE condominio_id = p_condominio_id AND ip_hash = p_ip_hash;
    RETURN jsonb_build_object('valid', true);
  END IF;

  v_attempts := CASE WHEN v_blocked_until IS NOT NULL THEN 1 ELSE COALESCE(v_attempts, 0) + 1 END;
  IF v_attempts >= 5 THEN
    INSERT INTO public.portal_access_attempts(condominio_id, ip_hash, attempts, blocked_until, updated_at)
    VALUES (p_condominio_id, p_ip_hash, 0, now() + interval '2 minutes', now())
    ON CONFLICT (condominio_id, ip_hash) DO UPDATE
      SET attempts = 0, blocked_until = EXCLUDED.blocked_until, updated_at = now();
    RETURN jsonb_build_object('valid', false, 'blocked', true, 'retry_after', 120);
  END IF;

  INSERT INTO public.portal_access_attempts(condominio_id, ip_hash, attempts, blocked_until, updated_at)
  VALUES (p_condominio_id, p_ip_hash, v_attempts, NULL, now())
  ON CONFLICT (condominio_id, ip_hash) DO UPDATE
    SET attempts = EXCLUDED.attempts, blocked_until = NULL, updated_at = now();

  v_remaining := GREATEST(0, 5 - v_attempts);
  RETURN jsonb_build_object('valid', false, 'remaining', v_remaining);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validar_acesso_portal(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validar_acesso_portal(UUID, TEXT, TEXT) TO service_role;
DROP FUNCTION IF EXISTS public.validar_codigo_acesso(UUID, TEXT);

DROP POLICY IF EXISTS "Leitura pública limitada de condomínios" ON public.condominios;
DROP POLICY IF EXISTS "Leitura pública de chamados do próprio condomínio" ON public.chamados;
DROP POLICY IF EXISTS "Inserção pública de chamados validada" ON public.chamados;
DROP POLICY IF EXISTS "Gestores gerenciam seu condomínio" ON public.condominios;
DROP POLICY IF EXISTS "Inserção de condomínio por usuário autenticado" ON public.condominios;
DROP POLICY IF EXISTS "Inserção de gestor vinculada ao próprio usuário" ON public.usuarios_gestores;

REVOKE ALL ON public.condominios FROM anon;
REVOKE ALL ON public.chamados FROM anon;
REVOKE UPDATE, DELETE ON public.condominios FROM authenticated;
GRANT SELECT, INSERT ON public.condominios TO authenticated;
GRANT UPDATE (nome, slug, codigo_acesso) ON public.condominios TO authenticated;

CREATE POLICY "Gestores leem seu condomínio" ON public.condominios
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid() AND ug.condominio_id = condominios.id
  ));

CREATE POLICY "Gestores atualizam configurações do condomínio" ON public.condominios
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid() AND ug.condominio_id = condominios.id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid() AND ug.condominio_id = condominios.id
  ));

CREATE POLICY "Usuário cria condomínio próprio" ON public.condominios
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Usuário cria vínculo no próprio condomínio" ON public.usuarios_gestores
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.condominios c
      WHERE c.id = condominio_id AND c.created_by = auth.uid()
    )
  );

DROP VIEW IF EXISTS public.condominios_publico;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chamados', 'chamados', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Gestores enviam fotos do próprio condomínio" ON storage.objects;
CREATE POLICY "Gestores enviam fotos do próprio condomínio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chamados'
    AND EXISTS (
      SELECT 1 FROM public.usuarios_gestores ug
      WHERE ug.user_id = auth.uid()
        AND ug.condominio_id::TEXT = (storage.foldername(name))[1]
    )
  );
