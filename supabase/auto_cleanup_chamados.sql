-- Auto-cleanup de chamados resolvidos/entregues
-- Execute no SQL Editor do Supabase para agendar limpeza automática

-- Habilita a extensão pg_cron (necessário para agendar tarefas)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar job diário para deletar chamados resolvidos/entregues com mais de 30 dias
SELECT cron.schedule(
    'cleanup-resolved-chamados',       -- nome do job
    '0 3 * * *',                        -- todo dia às 03:00
    $$
    DELETE FROM public.chamados
    WHERE (status = 'resolvido' OR status = 'entregue')
      AND updated_at < NOW() - INTERVAL '30 days';
    $$
);

-- Verificar jobs agendados
-- SELECT * FROM cron.job;
