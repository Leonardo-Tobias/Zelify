-- Remove dados de contato de registros anônimos e impede novos vazamentos.
-- Execute uma vez no SQL Editor do projeto usado pela Vercel antes do deploy.

BEGIN;

UPDATE public.chamados
SET solicitante_nome = NULL,
    solicitante_whatsapp = NULL
WHERE anonimo = true
  AND (solicitante_nome IS NOT NULL OR solicitante_whatsapp IS NOT NULL);

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
    CASE WHEN p_anonimo THEN NULL ELSE NULLIF(TRIM(p_solicitante_whatsapp), '') END,
    p_anonimo
  ) RETURNING * INTO v_chamado;
  RETURN to_jsonb(v_chamado);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_chamado_portal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_chamado_portal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN)
  TO service_role;

COMMIT;
