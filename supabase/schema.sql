-- Esquema de Banco de Dados para o Zelify MVP

-- 1. Tabela de Condomínios
CREATE TABLE IF NOT EXISTS public.condominios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    codigo_acesso TEXT NOT NULL, -- Armazenado como texto de 4 dígitos (ex: '1234')
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
-- Permitir que qualquer pessoa consulte condomínios pelo slug
CREATE POLICY "Permitir leitura pública de condomínios" ON public.condominios
    FOR SELECT USING (true);

-- Permitir que moradores leiam chamados (somente do próprio condomínio, o que será filtrado na consulta via slug)
CREATE POLICY "Permitir leitura pública de chamados" ON public.chamados
    FOR SELECT USING (true);

-- Permitir que moradores insiram novos chamados
CREATE POLICY "Permitir inserção pública de chamados" ON public.chamados
    FOR INSERT WITH CHECK (true);

-- POLÍTICAS PARA GESTORES (AUTENTICADOS)
-- Gestores podem ler seus próprios dados de perfil
CREATE POLICY "Gestores leem seu próprio perfil" ON public.usuarios_gestores
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Permitir inserção de gestores durante o cadastro/onboarding
CREATE POLICY "Permitir inserção de gestores" ON public.usuarios_gestores
    FOR INSERT WITH CHECK (true);

-- Gestores podem ler e editar o condomínio ao qual pertencem
CREATE POLICY "Gestores gerenciam seu condomínio" ON public.condominios
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_gestores
            WHERE usuarios_gestores.user_id = auth.uid()
            AND usuarios_gestores.condominio_id = condominios.id
        )
    );

-- Permitir inserção de condomínios durante o cadastro/onboarding
CREATE POLICY "Permitir inserção de condomínios" ON public.condominios
    FOR INSERT WITH CHECK (true);

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
