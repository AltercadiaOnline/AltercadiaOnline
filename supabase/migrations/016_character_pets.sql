-- Pets (roster + afinidade) por personagem/shard — paridade com inventory/currency.
-- Autoridade: CharacterPersistenceRecord.petRoster / petAffinity (file) + esta tabela (Supabase critical).

CREATE TABLE IF NOT EXISTS public.character_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL DEFAULT 1 CHECK (character_id >= 1),
  server_id TEXT NOT NULL DEFAULT 'default',
  roster JSONB NOT NULL DEFAULT '{"pets":[],"activeSlotIndex":null,"selectedSlotIndex":0}'::jsonb,
  affinity JSONB NOT NULL DEFAULT '{"rationCharges":0,"lastPetRationFeedAtMs":null,"lastPetAffectionAtMs":null}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT character_pets_user_character_server_unique UNIQUE (user_id, character_id, server_id)
);

CREATE INDEX IF NOT EXISTS character_pets_user_server_idx
  ON public.character_pets (user_id, server_id);

DROP TRIGGER IF EXISTS character_pets_set_updated_at ON public.character_pets;
CREATE TRIGGER character_pets_set_updated_at
  BEFORE UPDATE ON public.character_pets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.character_pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seus pets" ON public.character_pets;
DROP POLICY IF EXISTS "Cliente não pode alterar pets" ON public.character_pets;

CREATE POLICY "Usuários podem ver seus pets" ON public.character_pets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Cliente não pode alterar pets" ON public.character_pets
  FOR ALL USING (false) WITH CHECK (false);

COMMENT ON TABLE public.character_pets IS
  'Roster + afinidade de pets por personagem/shard. Mutação só via service_role (gateway).';

-- Bootstrap vazio alinhado a currency/inventory
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
BEGIN
  INSERT INTO public.currency (user_id, character_id, server_id, dollar_volt, alter_coins)
  VALUES (p_user_id, p_character_id, p_server_id, 0, 0)
  ON CONFLICT (user_id, character_id, server_id) DO NOTHING;

  INSERT INTO public.inventory (user_id, character_id, server_id, stacks, equipped)
  VALUES (p_user_id, p_character_id, p_server_id, '[]'::jsonb, '{}'::jsonb)
  ON CONFLICT (user_id, character_id, server_id) DO NOTHING;

  INSERT INTO public.character_pets (user_id, character_id, server_id)
  VALUES (p_user_id, p_character_id, p_server_id)
  ON CONFLICT (user_id, character_id, server_id) DO NOTHING;
END;
$$;

-- Backfill: personagens existentes sem linha de pets
INSERT INTO public.character_pets (user_id, character_id, server_id)
SELECT p.user_id, p.character_id, p.server_id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.character_pets cp
  WHERE cp.user_id = p.user_id
    AND cp.character_id = p.character_id
    AND cp.server_id = p.server_id
);
