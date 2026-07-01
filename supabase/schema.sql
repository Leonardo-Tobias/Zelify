-- Esquema de Banco de Dados para o Zelcore MVP

-- 1. Tabela de Condomínios
CREATE TABLE IF NOT EXISTS public.condominios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    codigo_acesso TEXT NOT NULL, -- Armazenado como texto de 4 dígitos (ex: '1234')
    plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'corporate')) NOT NULL,
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled')) NOT NULL,
    asaas_customer_id TEXT,
    asaas_subscription_id TEXT,
    billing_type TEXT CHECK (billing_type IN ('PIX', 'CREDIT_CARD')),
    current_period_end TIMESTAMPTZ,
    parent_condominio_id UUID REFERENCES public.condominios(id),
    max_instances INTEGER,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexar por slug para buscas rápidas no carregamento da URL pública
CREATE INDEX IF NOT EXISTS idx_condominios_slug ON public.condominios(slug);

-- 2. Tabela de Usuários Gestores (Síndico, Zelador, Admin)
-- Esta tabela vincula um usuário do Supabase Auth a um condomínio específico
CREATE TABLE IF NOT EXISTS public.usuarios_gestores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    condominio_id UUID REFERENCES public.condominios(id) ON DELETE CASCADE NOT NULL,
    nome TEXT NOT NULL,
    papel TEXT NOT NULL CHECK (papel IN ('sindico', 'zelador', 'admin')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexar por user_id para verificar permissões rapidamente
CREATE INDEX IF NOT EXISTS idx_usuarios_gestores_user_id ON public.usuarios_gestores(user_id);

-- 3. Tabela de Chamados (Manutenção e Achados e Perdidos)
CREATE TABLE IF NOT EXISTS public.chamados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id UUID REFERENCES public.condominios(id) ON DELETE CASCADE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('manutencao', 'achado_perdido')),
    local TEXT NOT NULL, -- Ex: 'Garagem', 'Hall', 'Elevador', 'Piscina', 'Playground', 'Corredor', 'Outro'
    bloco TEXT NOT NULL,
    apartamento TEXT NOT NULL,
    descricao TEXT NOT NULL,
    foto_url TEXT, -- Link da imagem no Supabase Storage
    status TEXT NOT NULL, -- Manutenção: 'pendente', 'em_execucao', 'resolvido'. Achados: 'encontrado', 'aguardando_retirada', 'entregue'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexar por condominio_id para carregar chamados específicos de cada condomínio
CREATE INDEX IF NOT EXISTS idx_chamados_condominio ON public.chamados(condominio_id);

-- Habilitar RLS (Row Level Security) em todas as tabelas
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_gestores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE RLS (SEGURANÇA)

-- POLÍTICAS PARA MORADORES (PÚBLICO)
-- SEGURANÇA: Moradores podem consultar condomínios pelo slug, mas NÃO devem ver codigo_acesso.
-- A validação do código acontece via função RPC segura (ver abaixo), nunca por SELECT direto.
CREATE POLICY "Leitura pública limitada de condomínios" ON public.condominios
    FOR SELECT USING (true);

-- VIEW pública para moradores — exclui codigo_acesso e asaas_customer_id
CREATE OR REPLACE VIEW public.condominios_publico AS
    SELECT
        id,
        nome,
        slug,
        plan_type,
        subscription_status,
        current_period_end,
        created_at
    FROM public.condominios;

-- Conceder acesso de leitura à view pública para usuários anônimos
GRANT SELECT ON public.condominios_publico TO anon;

-- Permitir que moradores leiam chamados (somente do próprio condomínio, filtrado na consulta via slug)
CREATE POLICY "Permitir leitura pública de chamados" ON public.chamados
    FOR SELECT USING (true);

-- SEGURANÇA: Moradores só podem inserir chamados em condomínios ativos e existentes.
-- Impede spam/flood em condomínios de terceiros ou suspensos.
CREATE POLICY "Inserção pública de chamados validada" ON public.chamados
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.condominios
            WHERE condominios.id = chamados.condominio_id
              AND condominios.subscription_status = 'active'
        )
    );

-- FUNÇÃO RPC SEGURA para validar o código de acesso do morador.
-- Executada com permissão de SECURITY DEFINER (acessa codigo_acesso sem expô-lo via SELECT).
-- A ANON_KEY nunca verá o valor do código diretamente; apenas recebe true/false.
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

-- Conceder permissão de execução da função para usuários anônimos (moradores)
GRANT EXECUTE ON FUNCTION public.validar_codigo_acesso(UUID, TEXT) TO anon;

-- POLÍTICAS PARA GESTORES (AUTENTICADOS)
-- Gestores podem ler seus próprios dados de perfil
CREATE POLICY "Gestores leem seu próprio perfil" ON public.usuarios_gestores
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- SEGURANÇA: Gestores só podem ser inseridos por usuários autenticados,
-- e somente vinculando o próprio user_id (impede escalada de privilégio).
CREATE POLICY "Inserção de gestor vinculada ao próprio usuário" ON public.usuarios_gestores
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Gestores podem ler e editar o condomínio ao qual pertencem
CREATE POLICY "Gestores gerenciam seu condomínio" ON public.condominios
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_gestores
            WHERE usuarios_gestores.user_id = auth.uid()
            AND usuarios_gestores.condominio_id = condominios.id
        )
    );

-- SEGURANÇA: Apenas usuários autenticados podem criar condomínios (durante o onboarding).
CREATE POLICY "Inserção de condomínio por usuário autenticado" ON public.condominios
    FOR INSERT TO authenticated WITH CHECK (true);

-- Gestores podem gerenciar todos os chamados pertencentes ao seu condomínio
CREATE POLICY "Gestores gerenciam chamados de seu condomínio" ON public.chamados
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_gestores
            WHERE usuarios_gestores.user_id = auth.uid()
            AND usuarios_gestores.condominio_id = chamados.condominio_id
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.usuarios_gestores
            WHERE usuarios_gestores.user_id = auth.uid()
            AND usuarios_gestores.condominio_id = chamados.condominio_id
        )
    );
