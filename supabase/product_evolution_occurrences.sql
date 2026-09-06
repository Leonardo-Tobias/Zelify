-- Evolução incremental do núcleo de ocorrências do Zelcon.
-- Execute uma vez no SQL Editor do projeto usado pela Vercel antes do deploy.

BEGIN;

ALTER TABLE public.condominios
  ADD COLUMN IF NOT EXISTS identificacao_ocorrencias TEXT NOT NULL DEFAULT 'opcional';

DO $$ BEGIN
  ALTER TABLE public.condominios ADD CONSTRAINT condominios_identificacao_ocorrencias_check
    CHECK (identificacao_ocorrencias IN ('anonima', 'opcional', 'obrigatoria'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS categoria TEXT,
  ADD COLUMN IF NOT EXISTS categoria_outro TEXT,
  ADD COLUMN IF NOT EXISTS prioridade TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS solicitante_tipo TEXT,
  ADD COLUMN IF NOT EXISTS solicitante_tipo_outro TEXT,
  ADD COLUMN IF NOT EXISTS solicitante_nome TEXT,
  ADD COLUMN IF NOT EXISTS solicitante_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS anonimo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS responsavel TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE public.chamados SET
  titulo = COALESCE(NULLIF(titulo, ''), LEFT(descricao, 120)),
  categoria = COALESCE(categoria, CASE WHEN tipo = 'manutencao' THEN 'Manutenção' ELSE 'Outro' END),
  solicitante_tipo = COALESCE(solicitante_tipo, 'morador'),
  completed_at = CASE
    WHEN completed_at IS NULL AND status IN ('resolvido', 'entregue') THEN updated_at
    ELSE completed_at
  END;

ALTER TABLE public.chamados
  ALTER COLUMN categoria SET DEFAULT 'Manutenção',
  ALTER COLUMN categoria SET NOT NULL,
  ALTER COLUMN solicitante_tipo SET DEFAULT 'morador',
  ALTER COLUMN solicitante_tipo SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.chamados ADD CONSTRAINT chamados_prioridade_check
    CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.chamados ADD CONSTRAINT chamados_solicitante_tipo_check
    CHECK (solicitante_tipo IN ('morador', 'sindico', 'zelador', 'porteiro', 'funcionario', 'prestador_servico', 'conselheiro', 'outro'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_chamados_operacao
  ON public.chamados(condominio_id, status, prioridade, categoria, created_at DESC);

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_globais_slug
  ON public.categorias_ocorrencias(slug) WHERE condominio_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_condominio_slug
  ON public.categorias_ocorrencias(condominio_id, slug) WHERE condominio_id IS NOT NULL;

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

CREATE INDEX IF NOT EXISTS idx_ocorrencia_historico_chamado
  ON public.ocorrencia_historico(chamado_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ocorrencia_comentarios_chamado
  ON public.ocorrencia_comentarios(chamado_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ocorrencia_anexos_chamado
  ON public.ocorrencia_anexos(chamado_id, created_at);

ALTER TABLE public.categorias_ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencia_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencia_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencia_anexos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.categorias_ocorrencias, public.ocorrencia_historico, public.ocorrencia_comentarios, public.ocorrencia_anexos
  FROM anon;
GRANT SELECT ON public.categorias_ocorrencias, public.ocorrencia_historico, public.ocorrencia_comentarios, public.ocorrencia_anexos
  TO authenticated;
GRANT INSERT ON public.ocorrencia_comentarios, public.ocorrencia_historico TO authenticated;

DROP POLICY IF EXISTS "Gestores consultam categorias" ON public.categorias_ocorrencias;
CREATE POLICY "Gestores consultam categorias" ON public.categorias_ocorrencias FOR SELECT TO authenticated
  USING (condominio_id IS NULL OR EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid() AND ug.condominio_id = categorias_ocorrencias.condominio_id
  ));

DROP POLICY IF EXISTS "Gestores consultam histórico" ON public.ocorrencia_historico;
CREATE POLICY "Gestores consultam histórico" ON public.ocorrencia_historico FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid() AND ug.condominio_id = ocorrencia_historico.condominio_id
  ));

DROP POLICY IF EXISTS "Gestores registram histórico" ON public.ocorrencia_historico;
CREATE POLICY "Gestores registram histórico" ON public.ocorrencia_historico FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid() AND ug.condominio_id = ocorrencia_historico.condominio_id
  ));

DROP POLICY IF EXISTS "Gestores consultam comentários" ON public.ocorrencia_comentarios;
CREATE POLICY "Gestores consultam comentários" ON public.ocorrencia_comentarios FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid() AND ug.condominio_id = ocorrencia_comentarios.condominio_id
  ));

DROP POLICY IF EXISTS "Gestores consultam anexos" ON public.ocorrencia_anexos;
CREATE POLICY "Gestores consultam anexos" ON public.ocorrencia_anexos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid() AND ug.condominio_id = ocorrencia_anexos.condominio_id
  ));

DROP POLICY IF EXISTS "Gestores adicionam comentários" ON public.ocorrencia_comentarios;
CREATE POLICY "Gestores adicionam comentários" ON public.ocorrencia_comentarios FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.usuarios_gestores ug
    WHERE ug.user_id = auth.uid() AND ug.condominio_id = ocorrencia_comentarios.condominio_id
  ));

CREATE OR REPLACE FUNCTION public.atualizar_tempos_ocorrencia()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IN ('resolvido', 'entregue') AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.completed_at := now();
  ELSIF NEW.status NOT IN ('resolvido', 'entregue') AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chamados_atualizar_tempos ON public.chamados;
CREATE TRIGGER chamados_atualizar_tempos BEFORE UPDATE ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_tempos_ocorrencia();

CREATE OR REPLACE FUNCTION public.registrar_historico_ocorrencia()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_label TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ocorrencia_historico (chamado_id, condominio_id, evento, descricao)
    VALUES (NEW.id, NEW.condominio_id, 'criacao', 'Ocorrência criada');
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    v_label := CASE NEW.status
      WHEN 'pendente' THEN 'Recebida'
      WHEN 'em_execucao' THEN 'Em andamento'
      WHEN 'resolvido' THEN 'Concluída'
      WHEN 'encontrado' THEN 'Encontrado'
      WHEN 'aguardando_retirada' THEN 'Aguardando retirada'
      ELSE 'Entregue' END;
    INSERT INTO public.ocorrencia_historico (chamado_id, condominio_id, evento, descricao)
    VALUES (NEW.id, NEW.condominio_id, 'status', 'Movida para “' || v_label || '”');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chamados_registrar_historico ON public.chamados;
CREATE TRIGGER chamados_registrar_historico AFTER INSERT OR UPDATE OF status ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_ocorrencia();

DROP FUNCTION IF EXISTS public.criar_chamado_portal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE FUNCTION public.criar_chamado_portal(
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
    SELECT count(*) INTO v_count FROM public.chamados
    WHERE condominio_id = p_condominio_id AND created_at >= date_trunc('month', now());
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

REVOKE EXECUTE ON FUNCTION public.criar_chamado_portal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_chamado_portal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN)
  TO service_role;

GRANT UPDATE (nome, slug, codigo_acesso, identificacao_ocorrencias) ON public.condominios TO authenticated;

COMMIT;
