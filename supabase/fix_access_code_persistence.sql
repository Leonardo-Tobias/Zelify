-- Permite recuperar o código para a placa/QR sem enfraquecer a validação bcrypt.
-- Execute uma vez no SQL Editor do projeto usado pela Vercel antes do deploy.

BEGIN;

ALTER TABLE public.condominios
  ADD COLUMN IF NOT EXISTS codigo_acesso_cifrado TEXT;

-- O valor só pode ser decifrado no servidor; anon não possui acesso à tabela e
-- authenticated não recebe permissão de escrita nesta coluna.
REVOKE SELECT (codigo_acesso_cifrado), INSERT (codigo_acesso_cifrado), UPDATE (codigo_acesso_cifrado)
  ON public.condominios FROM anon, authenticated;

COMMIT;
