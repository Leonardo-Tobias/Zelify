-- Correções de segurança da revisão ponta a ponta.
-- Execute uma vez no SQL Editor do projeto usado pela Vercel.

BEGIN;

CREATE TABLE IF NOT EXISTS public.cadastro_attempts (
  ip_hash TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consentimentos (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asaas_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.cadastro_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.cadastro_attempts, public.consentimentos, public.asaas_webhook_events
  FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.criar_chamado_portal(
  p_condominio_id UUID, p_tipo TEXT, p_local TEXT, p_bloco TEXT,
  p_apartamento TEXT, p_descricao TEXT, p_foto_url TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_condominio public.condominios%ROWTYPE;
  v_count INTEGER;
  v_chamado public.chamados%ROWTYPE;
BEGIN
  SELECT * INTO v_condominio FROM public.condominios
  WHERE id = p_condominio_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONDOMINIO_NAO_ENCONTRADO'; END IF;
  IF v_condominio.subscription_status <> 'active' THEN RAISE EXCEPTION 'PORTAL_SUSPENSO'; END IF;
  IF v_condominio.plan_type = 'free' THEN
    SELECT count(*) INTO v_count FROM public.chamados
    WHERE condominio_id = p_condominio_id AND created_at >= date_trunc('month', now());
    IF v_count >= 15 THEN RAISE EXCEPTION 'LIMITE_MENSAL'; END IF;
  END IF;
  INSERT INTO public.chamados (
    condominio_id, tipo, local, bloco, apartamento, descricao, foto_url, status
  ) VALUES (
    p_condominio_id, p_tipo, p_local, p_bloco, p_apartamento, p_descricao, p_foto_url,
    CASE WHEN p_tipo = 'manutencao' THEN 'pendente' ELSE 'encontrado' END
  ) RETURNING * INTO v_chamado;
  RETURN to_jsonb(v_chamado);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_chamado_portal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_chamado_portal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

DROP POLICY IF EXISTS "Gestores atualizam configurações" ON public.condominios;
CREATE POLICY "Gestores atualizam configurações" ON public.condominios
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid()
      AND ug.condominio_id = condominios.id
      AND ug.papel IN ('sindico', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid()
      AND ug.condominio_id = condominios.id
      AND ug.papel IN ('sindico', 'admin')
  ));

COMMIT;
