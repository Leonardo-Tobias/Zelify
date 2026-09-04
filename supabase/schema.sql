-- Esquema seguro para uma nova instalação do Zelcon.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE,
  codigo_acesso TEXT,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'corporate')) NOT NULL,
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled')) NOT NULL,
  asaas_customer_id TEXT,
  asaas_subscription_id TEXT,
  billing_type TEXT CHECK (billing_type IN ('PIX', 'CREDIT_CARD')),
  current_period_end TIMESTAMPTZ,
  parent_condominio_id UUID REFERENCES public.condominios(id),
  max_instances INTEGER,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  pending_subscription_id TEXT,
  pending_plan_type TEXT CHECK (pending_plan_type IN ('pro', 'corporate')),
  pending_billing_type TEXT CHECK (pending_billing_type IN ('PIX', 'CREDIT_CARD')),
  pending_max_instances INTEGER,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_condominios_slug ON public.condominios(slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.usuarios_gestores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('sindico', 'zelador', 'admin')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, condominio_id)
);
CREATE INDEX IF NOT EXISTS idx_usuarios_gestores_user_id ON public.usuarios_gestores(user_id);

CREATE TABLE IF NOT EXISTS public.chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('manutencao', 'achado_perdido')),
  local TEXT NOT NULL,
  bloco TEXT NOT NULL,
  apartamento TEXT NOT NULL,
  descricao TEXT NOT NULL,
  foto_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'em_execucao', 'resolvido', 'encontrado', 'aguardando_retirada', 'entregue')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chamados_condominio ON public.chamados(condominio_id);

CREATE TABLE IF NOT EXISTS public.portal_access_attempts (
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (condominio_id, ip_hash)
);

ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_gestores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_access_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.hash_codigo_acesso()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, extensions AS $$
BEGIN
  IF NEW.codigo_acesso IS NOT NULL AND NEW.codigo_acesso !~ '^\$2[aby]\$' THEN
    NEW.codigo_acesso := crypt(NEW.codigo_acesso, gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS condominios_hash_codigo_acesso ON public.condominios;
CREATE TRIGGER condominios_hash_codigo_acesso
BEFORE INSERT OR UPDATE OF codigo_acesso ON public.condominios
FOR EACH ROW EXECUTE FUNCTION public.hash_codigo_acesso();

CREATE OR REPLACE FUNCTION public.validar_acesso_portal(
  p_condominio_id UUID, p_codigo TEXT, p_ip_hash TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_codigo_hash TEXT;
  v_status TEXT;
  v_attempts INTEGER := 0;
  v_blocked_until TIMESTAMPTZ;
BEGIN
  SELECT codigo_acesso, subscription_status INTO v_codigo_hash, v_status
  FROM public.condominios WHERE id = p_condominio_id;

  IF v_codigo_hash IS NULL OR v_status <> 'active' THEN
    RETURN jsonb_build_object('valid', false, 'remaining', 0);
  END IF;

  SELECT attempts, blocked_until INTO v_attempts, v_blocked_until
  FROM public.portal_access_attempts
  WHERE condominio_id = p_condominio_id AND ip_hash = p_ip_hash FOR UPDATE;

  IF v_blocked_until IS NOT NULL AND v_blocked_until > now() THEN
    RETURN jsonb_build_object('valid', false, 'blocked', true,
      'retry_after', GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_blocked_until - now())))::INTEGER));
  END IF;

  IF crypt(p_codigo, v_codigo_hash) = v_codigo_hash THEN
    DELETE FROM public.portal_access_attempts
    WHERE condominio_id = p_condominio_id AND ip_hash = p_ip_hash;
    RETURN jsonb_build_object('valid', true);
  END IF;

  v_attempts := CASE WHEN v_blocked_until IS NOT NULL THEN 1 ELSE COALESCE(v_attempts, 0) + 1 END;
  IF v_attempts >= 5 THEN
    INSERT INTO public.portal_access_attempts VALUES
      (p_condominio_id, p_ip_hash, 0, now() + interval '2 minutes', now())
    ON CONFLICT (condominio_id, ip_hash) DO UPDATE
      SET attempts = 0, blocked_until = EXCLUDED.blocked_until, updated_at = now();
    RETURN jsonb_build_object('valid', false, 'blocked', true, 'retry_after', 120);
  END IF;

  INSERT INTO public.portal_access_attempts VALUES
    (p_condominio_id, p_ip_hash, v_attempts, NULL, now())
  ON CONFLICT (condominio_id, ip_hash) DO UPDATE
    SET attempts = EXCLUDED.attempts, blocked_until = NULL, updated_at = now();
  RETURN jsonb_build_object('valid', false, 'remaining', GREATEST(0, 5 - v_attempts));
END;
$$;

REVOKE ALL ON public.condominios, public.chamados, public.portal_access_attempts FROM anon;
REVOKE ALL ON public.portal_access_attempts FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validar_acesso_portal(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validar_acesso_portal(UUID, TEXT, TEXT) TO service_role;

GRANT SELECT, INSERT ON public.condominios TO authenticated;
GRANT UPDATE (nome, slug, codigo_acesso) ON public.condominios TO authenticated;
GRANT SELECT, INSERT ON public.usuarios_gestores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamados TO authenticated;

CREATE POLICY "Gestores leem seu perfil" ON public.usuarios_gestores
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Usuário cria vínculo no próprio condomínio" ON public.usuarios_gestores
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.condominios c
      WHERE c.id = condominio_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Gestores leem seu condomínio" ON public.condominios
  FOR SELECT TO authenticated USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.usuarios_gestores ug
      WHERE ug.user_id = auth.uid() AND ug.condominio_id = condominios.id
    )
  );

CREATE POLICY "Usuário cria condomínio próprio" ON public.condominios
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Gestores atualizam configurações" ON public.condominios
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid() AND ug.condominio_id = condominios.id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid() AND ug.condominio_id = condominios.id
  ));

CREATE POLICY "Gestores gerenciam chamados" ON public.chamados
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid() AND ug.condominio_id = chamados.condominio_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid() AND ug.condominio_id = chamados.condominio_id
  ));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chamados', 'chamados', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

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
