-- Altercadia — profiles, inventory, currency + RLS
-- Aplicar no SQL Editor do Supabase ou via: supabase db push

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL DEFAULT 1 CHECK (character_id >= 1),
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT profiles_user_character_unique UNIQUE (user_id, character_id)
);

CREATE TABLE IF NOT EXISTS public.currency (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dollar_volt BIGINT NOT NULL DEFAULT 0 CHECK (dollar_volt >= 0),
  alter_coins BIGINT NOT NULL DEFAULT 0 CHECK (alter_coins >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL DEFAULT 1 CHECK (character_id >= 1),
  stacks JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipped JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT inventory_user_character_unique UNIQUE (user_id, character_id)
);

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS inventory_user_id_idx ON public.inventory (user_id);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS currency_set_updated_at ON public.currency;
CREATE TRIGGER currency_set_updated_at
  BEFORE UPDATE ON public.currency
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS inventory_set_updated_at ON public.inventory;
CREATE TRIGGER inventory_set_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Bootstrap de jogador novo (itens iniciais + moedas)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bootstrap_player_game_data(
  p_user_id UUID,
  p_character_id INTEGER DEFAULT 1
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
  INSERT INTO public.profiles (user_id, character_id)
  VALUES (p_user_id, p_character_id)
  ON CONFLICT (user_id, character_id) DO NOTHING;

  INSERT INTO public.currency (user_id, dollar_volt, alter_coins)
  VALUES (p_user_id, 1200, 50)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.inventory (user_id, character_id, stacks, equipped)
  VALUES (p_user_id, p_character_id, starter_stacks, '{}'::jsonb)
  ON CONFLICT (user_id, character_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.bootstrap_player_game_data(NEW.user_id, NEW.character_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- ---------------------------------------------------------------------------
-- Row Level Security — cada usuário só acessa seus dados
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS currency_select_own ON public.currency;
CREATE POLICY currency_select_own ON public.currency
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS currency_insert_own ON public.currency;
CREATE POLICY currency_insert_own ON public.currency
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS currency_update_own ON public.currency;
CREATE POLICY currency_update_own ON public.currency
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS currency_delete_own ON public.currency;
CREATE POLICY currency_delete_own ON public.currency
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS inventory_select_own ON public.inventory;
CREATE POLICY inventory_select_own ON public.inventory
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS inventory_insert_own ON public.inventory;
CREATE POLICY inventory_insert_own ON public.inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS inventory_update_own ON public.inventory;
CREATE POLICY inventory_update_own ON public.inventory
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS inventory_delete_own ON public.inventory;
CREATE POLICY inventory_delete_own ON public.inventory
  FOR DELETE USING (auth.uid() = user_id);

-- service_role (servidor) ignora RLS automaticamente
