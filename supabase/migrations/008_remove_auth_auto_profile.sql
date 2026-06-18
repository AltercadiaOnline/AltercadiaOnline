-- P1: remove auto-provision de perfil no signup (server_id = default implícito).
-- Personagens são criados apenas via API com server_id explícito do shard.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_user_created();

COMMENT ON TABLE public.profiles IS
  'Personagens por shard — server_id obrigatório na criação via API; sem trigger em auth.users.';
