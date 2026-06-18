-- Instâncias de servidor (shards) — vincula personagens a SERVER_ID
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS server_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS profiles_server_id_idx ON public.profiles (server_id);

COMMENT ON COLUMN public.profiles.server_id IS
  'Shard de mundo (ex.: default, azul) — deve coincidir com SERVER_ID do processo Railway.';
