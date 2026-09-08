-- Esquema seguro para uma nova instalação do Zelcon.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE,
  codigo_acesso TEXT,
  codigo_acesso_cifrado TEXT,
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
  identificacao_ocorrencias TEXT NOT NULL DEFAULT 'opcional' CHECK (identificacao_ocorrencias IN ('anonima', 'opcional', 'obrigatoria')),
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
  titulo TEXT,
  categoria TEXT NOT NULL DEFAULT 'Manutenção',
  categoria_outro TEXT,
  prioridade TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  solicitante_tipo TEXT NOT NULL DEFAULT 'morador' CHECK (solicitante_tipo IN ('morador', 'sindico', 'zelador', 'porteiro', 'funcionario', 'prestador_servico', 'conselheiro', 'outro')),
  solicitante_tipo_outro TEXT,
  solicitante_nome TEXT,
  solicitante_whatsapp TEXT,
  anonimo BOOLEAN NOT NULL DEFAULT true,
  responsavel TEXT,
  foto_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'em_execucao', 'resolvido', 'encontrado', 'aguardando_retirada', 'entregue')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMPTZ
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

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  subscription_key TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('gestor', 'morador')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE CASCADE,
  bloco TEXT,
  apartamento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (audience = 'gestor' AND user_id IS NOT NULL AND condominio_id IS NULL AND bloco IS NULL AND apartamento IS NULL)
    OR
    (audience = 'morador' AND user_id IS NULL AND condominio_id IS NOT NULL AND bloco IS NOT NULL AND apartamento IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_gestor ON public.push_subscriptions(user_id) WHERE audience = 'gestor';
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_morador ON public.push_subscriptions(condominio_id, bloco, apartamento) WHERE audience = 'morador';

CREATE TABLE IF NOT EXISTS public.categorias_ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_globais_slug ON public.categorias_ocorrencias(slug) WHERE condominio_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_condominio_slug ON public.categorias_ocorrencias(condominio_id, slug) WHERE condominio_id IS NOT NULL;

INSERT INTO public.categorias_ocorrencias (condominio_id, nome, slug, ordem) VALUES
  (NULL, 'Manutenção', 'manutencao', 10),
  (NULL, 'Elétrica', 'eletrica', 20),
  (NULL, 'Hidráulica', 'hidraulica', 30),
  (NULL, 'Limpeza', 'limpeza', 40),
  (NULL, 'Portaria e segurança', 'portaria-seguranca', 50),
  (NULL, 'Elevadores', 'elevadores', 60),
  (NULL, 'Área comum', 'area-comum', 70),
  (NULL, 'Estrutura', 'estrutura', 80),
  (NULL, 'Compra ou reposição de material', 'compra-reposicao-material', 90),
  (NULL, 'Outro', 'outro', 100)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ocorrencia_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  descricao TEXT NOT NULL,
  visibilidade TEXT NOT NULL DEFAULT 'publico' CHECK (visibilidade IN ('publico', 'interno')),
  autor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ocorrencia_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL CHECK (char_length(conteudo) BETWEEN 1 AND 2000),
  visibilidade TEXT NOT NULL CHECK (visibilidade IN ('publico', 'interno')),
  autor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ocorrencia_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  nome TEXT,
  mime_type TEXT,
  tamanho_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chamados_operacao ON public.chamados(condominio_id, status, prioridade, categoria, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ocorrencia_historico_chamado ON public.ocorrencia_historico(chamado_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ocorrencia_comentarios_chamado ON public.ocorrencia_comentarios(chamado_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ocorrencia_anexos_chamado ON public.ocorrencia_anexos(chamado_id, created_at);

ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_gestores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_access_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastro_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencia_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencia_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencia_anexos ENABLE ROW LEVEL SECURITY;

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

CREATE OR REPLACE FUNCTION public.criar_chamado_portal(
  p_condominio_id UUID,
  p_tipo TEXT,
  p_local TEXT,
  p_bloco TEXT,
  p_apartamento TEXT,
  p_descricao TEXT,
  p_foto_url TEXT DEFAULT NULL
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
    WHERE condominio_id = p_condominio_id
      AND created_at >= date_trunc('month', now());
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

CREATE OR REPLACE FUNCTION public.criar_chamado_portal(
  p_condominio_id UUID, p_tipo TEXT, p_local TEXT, p_bloco TEXT,
  p_apartamento TEXT, p_descricao TEXT, p_foto_url TEXT DEFAULT NULL,
  p_titulo TEXT DEFAULT NULL, p_categoria TEXT DEFAULT 'Manutenção',
  p_categoria_outro TEXT DEFAULT NULL, p_prioridade TEXT DEFAULT 'normal',
  p_solicitante_tipo TEXT DEFAULT 'morador', p_solicitante_tipo_outro TEXT DEFAULT NULL,
  p_solicitante_nome TEXT DEFAULT NULL, p_solicitante_whatsapp TEXT DEFAULT NULL,
  p_anonimo BOOLEAN DEFAULT true
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_condominio public.condominios%ROWTYPE; v_count INTEGER; v_chamado public.chamados%ROWTYPE;
BEGIN
  SELECT * INTO v_condominio FROM public.condominios WHERE id = p_condominio_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONDOMINIO_NAO_ENCONTRADO'; END IF;
  IF v_condominio.subscription_status <> 'active' THEN RAISE EXCEPTION 'PORTAL_SUSPENSO'; END IF;
  IF v_condominio.identificacao_ocorrencias = 'obrigatoria' AND (p_anonimo OR NULLIF(TRIM(p_solicitante_nome), '') IS NULL)
    THEN RAISE EXCEPTION 'IDENTIFICACAO_OBRIGATORIA'; END IF;
  IF v_condominio.plan_type = 'free' THEN
    SELECT count(*) INTO v_count FROM public.chamados WHERE condominio_id = p_condominio_id AND created_at >= date_trunc('month', now());
    IF v_count >= 15 THEN RAISE EXCEPTION 'LIMITE_MENSAL'; END IF;
  END IF;
  INSERT INTO public.chamados (
    condominio_id, tipo, local, bloco, apartamento, titulo, descricao, foto_url, status,
    categoria, categoria_outro, prioridade, solicitante_tipo, solicitante_tipo_outro,
    solicitante_nome, solicitante_whatsapp, anonimo
  ) VALUES (
    p_condominio_id, p_tipo, p_local, p_bloco, p_apartamento, p_titulo, p_descricao, p_foto_url,
    CASE WHEN p_tipo = 'manutencao' THEN 'pendente' ELSE 'encontrado' END,
    p_categoria, p_categoria_outro, p_prioridade, p_solicitante_tipo, p_solicitante_tipo_outro,
    CASE WHEN p_anonimo THEN NULL ELSE NULLIF(TRIM(p_solicitante_nome), '') END,
    CASE WHEN p_anonimo THEN NULL ELSE NULLIF(TRIM(p_solicitante_whatsapp), '') END, p_anonimo
  ) RETURNING * INTO v_chamado;
  RETURN to_jsonb(v_chamado);
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_tempos_ocorrencia()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IN ('resolvido', 'entregue') AND OLD.status IS DISTINCT FROM NEW.status THEN NEW.completed_at := now();
  ELSIF NEW.status NOT IN ('resolvido', 'entregue') AND OLD.status IS DISTINCT FROM NEW.status THEN NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER chamados_atualizar_tempos BEFORE UPDATE ON public.chamados FOR EACH ROW EXECUTE FUNCTION public.atualizar_tempos_ocorrencia();

CREATE OR REPLACE FUNCTION public.registrar_historico_ocorrencia()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_label TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ocorrencia_historico (chamado_id, condominio_id, evento, descricao) VALUES (NEW.id, NEW.condominio_id, 'criacao', 'Ocorrência criada');
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    v_label := CASE NEW.status WHEN 'pendente' THEN 'Recebida' WHEN 'em_execucao' THEN 'Em andamento' WHEN 'resolvido' THEN 'Concluída' WHEN 'encontrado' THEN 'Encontrado' WHEN 'aguardando_retirada' THEN 'Aguardando retirada' ELSE 'Entregue' END;
    INSERT INTO public.ocorrencia_historico (chamado_id, condominio_id, evento, descricao) VALUES (NEW.id, NEW.condominio_id, 'status', 'Movida para “' || v_label || '”');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER chamados_registrar_historico AFTER INSERT OR UPDATE OF status ON public.chamados FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_ocorrencia();

REVOKE ALL ON public.condominios, public.chamados, public.portal_access_attempts FROM anon;
REVOKE ALL ON public.portal_access_attempts FROM authenticated;
REVOKE ALL ON public.cadastro_attempts, public.consentimentos FROM anon, authenticated;
REVOKE ALL ON public.asaas_webhook_events FROM anon, authenticated;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;
REVOKE ALL ON public.categorias_ocorrencias, public.ocorrencia_historico, public.ocorrencia_comentarios, public.ocorrencia_anexos FROM anon;
REVOKE EXECUTE ON FUNCTION public.validar_acesso_portal(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validar_acesso_portal(UUID, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.criar_chamado_portal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_chamado_portal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.criar_chamado_portal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_chamado_portal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;

GRANT SELECT, INSERT ON public.condominios TO authenticated;
GRANT UPDATE (nome, slug, codigo_acesso, identificacao_ocorrencias) ON public.condominios TO authenticated;
REVOKE SELECT (codigo_acesso_cifrado), INSERT (codigo_acesso_cifrado), UPDATE (codigo_acesso_cifrado)
  ON public.condominios FROM anon, authenticated;
GRANT SELECT ON public.categorias_ocorrencias, public.ocorrencia_historico, public.ocorrencia_comentarios, public.ocorrencia_anexos TO authenticated;
GRANT INSERT ON public.ocorrencia_comentarios, public.ocorrencia_historico TO authenticated;
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

CREATE POLICY "Gestores consultam categorias" ON public.categorias_ocorrencias FOR SELECT TO authenticated
  USING (condominio_id IS NULL OR EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug WHERE ug.user_id = auth.uid() AND ug.condominio_id = categorias_ocorrencias.condominio_id
  ));

CREATE POLICY "Gestores consultam histórico" ON public.ocorrencia_historico FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug WHERE ug.user_id = auth.uid() AND ug.condominio_id = ocorrencia_historico.condominio_id
  ));
CREATE POLICY "Gestores registram histórico" ON public.ocorrencia_historico FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug WHERE ug.user_id = auth.uid() AND ug.condominio_id = ocorrencia_historico.condominio_id
  ));

CREATE POLICY "Gestores consultam comentários" ON public.ocorrencia_comentarios FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug WHERE ug.user_id = auth.uid() AND ug.condominio_id = ocorrencia_comentarios.condominio_id
  ));
CREATE POLICY "Gestores consultam anexos" ON public.ocorrencia_anexos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug WHERE ug.user_id = auth.uid() AND ug.condominio_id = ocorrencia_anexos.condominio_id
  ));
CREATE POLICY "Gestores adicionam comentários" ON public.ocorrencia_comentarios FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug WHERE ug.user_id = auth.uid() AND ug.condominio_id = ocorrencia_comentarios.condominio_id
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
