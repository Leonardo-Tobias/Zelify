-- Verificação somente leitura após executar product_evolution_occurrences.sql.
-- O resultado deve mostrar todas as colunas, tabelas e funções listadas.

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'categorias_ocorrencias',
    'ocorrencia_historico',
    'ocorrencia_comentarios',
    'ocorrencia_anexos'
  )
ORDER BY table_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chamados'
  AND column_name IN (
    'titulo', 'categoria', 'categoria_outro', 'prioridade',
    'solicitante_tipo', 'solicitante_tipo_outro', 'solicitante_nome',
    'solicitante_whatsapp', 'anonimo', 'responsavel', 'completed_at'
  )
ORDER BY column_name;

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'criar_chamado_portal',
    'atualizar_tempos_ocorrencia',
    'registrar_historico_ocorrencia'
  )
ORDER BY routine_name;
