-- Economia e inventário isolados por shard (server_id)
-- Garante que dados de um servidor não se misturam com outro.

-- ---------------------------------------------------------------------------
-- profiles — slot único por (conta, personagem, shard)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_character_unique;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_character_server_unique
  UNIQUE (user_id, character_id, server_id);

-- ---------------------------------------------------------------------------
-- inventory — server_id obrigatório
-- ---------------------------------------------------------------------------
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS server_id TEXT NOT NULL DEFAULT 'default';

ALTER TABLE public.inventory
  DROP CONSTRAINT IF EXISTS inventory_user_character_unique;

ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_user_character_server_unique
  UNIQUE (user_id, character_id, server_id);

CREATE INDEX IF NOT EXISTS inventory_server_user_idx
  ON public.inventory (server_id, user_id);

-- ---------------------------------------------------------------------------
-- currency — carteira por shard (user_id + server_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.currency
  ADD COLUMN IF NOT EXISTS server_id TEXT NOT NULL DEFAULT 'default';

ALTER TABLE public.currency
  DROP CONSTRAINT IF EXISTS currency_pkey;

ALTER TABLE public.currency
  ADD PRIMARY KEY (user_id, server_id);

CREATE INDEX IF NOT EXISTS currency_server_id_idx
  ON public.currency (server_id);

-- ---------------------------------------------------------------------------
-- Bootstrap com server_id explícito
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_player_game_data(
  p_user_id UUID,
  p_character_id INTEGER DEFAULT 1,
  p_server_id TEXT DEFAULT 'default'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  starter_stacks JSONB := '[
    {"itemId":"diario_memorias","quantity":1},
    {"itemId":"potion_suporte_menor","quantity":5},
    {"itemId":"rail_armor","quantity":1},
    {"itemId":"pulsing_rift_amulet","quantity":1},
    {"itemId":"runa_furia","quantity":1,"charges":10},
    {"itemId":"livro_sorte","quantity":1,"charges":10},
    {"itemId":"tonico_fluxo_menor","quantity":2},
    {"itemId":"bat_wing","quantity":12},
    {"itemId":"dollar_volt","quantity":250}
  ]'::jsonb;
BEGIN
  INSERT INTO public.profiles (user_id, character_id, server_id)
  VALUES (p_user_id, p_character_id, p_server_id)
  ON CONFLICT (user_id, character_id, server_id) DO NOTHING;

  INSERT INTO public.currency (user_id, server_id, dollar_volt, alter_coins)
  VALUES (p_user_id, p_server_id, 1200, 50)
  ON CONFLICT (user_id, server_id) DO NOTHING;

  INSERT INTO public.inventory (user_id, character_id, server_id, stacks, equipped)
  VALUES (p_user_id, p_character_id, p_server_id, starter_stacks, '{}'::jsonb)
  ON CONFLICT (user_id, character_id, server_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.bootstrap_player_game_data(
    NEW.user_id,
    NEW.character_id,
    COALESCE(NULLIF(trim(NEW.server_id), ''), 'default')
  );
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.inventory.server_id IS
  'Shard de mundo — deve coincidir com profiles.server_id do mesmo personagem.';

COMMENT ON COLUMN public.currency.server_id IS
  'Shard de mundo — carteira isolada por instância Railway/Vercel.';
