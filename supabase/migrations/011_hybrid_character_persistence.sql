-- Persistência híbrida: colunas de gameplay (HIGH) e mundo (LOW) em profiles.
-- inventory/currency permanecem em tabelas dedicadas.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  ADD COLUMN IF NOT EXISTS xp_current BIGINT NOT NULL DEFAULT 0 CHECK (xp_current >= 0),
  ADD COLUMN IF NOT EXISTS quests_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS current_map_id TEXT,
  ADD COLUMN IF NOT EXISTS last_position_x DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_position_y DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS facing TEXT NOT NULL DEFAULT 'south',
  ADD COLUMN IF NOT EXISTS persistence_version BIGINT NOT NULL DEFAULT 0 CHECK (persistence_version >= 0);

COMMENT ON COLUMN public.profiles.persistence_version IS
  'Optimistic locking — incrementado em saves críticos (level, XP, quests).';

COMMENT ON COLUMN public.profiles.current_map_id IS
  'Posição LOW_PRIORITY — flush em lote a cada 30s ou onDisconnect.';
