-- Assinaturas Web Push para gestores e moradores.
-- Execute uma vez no SQL Editor do projeto usado pela Vercel antes do deploy.

BEGIN;

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

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_gestor
  ON public.push_subscriptions(user_id) WHERE audience = 'gestor';

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_morador
  ON public.push_subscriptions(condominio_id, bloco, apartamento) WHERE audience = 'morador';

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;

COMMIT;
