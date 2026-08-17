-- Sprays no mundo + legado no perfil do personagem.
-- Persistência primária atual é FILE (world-sprays.json); esta migration documenta o contrato SQL.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legacy_message text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.world_sprays (
  id text PRIMARY KEY,
  server_id text NOT NULL,
  map_id text NOT NULL,
  tile_x integer NOT NULL,
  tile_y integer NOT NULL,
  author_player_id text NOT NULL,
  author_character_id integer NOT NULL,
  spray_asset_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (server_id, map_id, tile_x, tile_y)
);

CREATE INDEX IF NOT EXISTS world_sprays_map_idx
  ON public.world_sprays (server_id, map_id);

CREATE INDEX IF NOT EXISTS world_sprays_author_idx
  ON public.world_sprays (author_player_id, author_character_id);

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id text PRIMARY KEY,
  from_player_id text NOT NULL,
  from_character_id integer NOT NULL,
  from_display_name text NOT NULL,
  to_player_id text NOT NULL,
  to_character_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_player_id, from_character_id, to_player_id, to_character_id)
);
