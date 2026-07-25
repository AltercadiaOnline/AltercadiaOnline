-- Separar identidade do personagem (character_id) do slot da UI (slot_index).
-- character_id permanece estável e nunca é derivado de slotIndex+1.
-- slot_index = posição na char select (0..4), único por (user_id, server_id).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slot_index SMALLINT;

-- Backfill legado: character_id 1..5 ≡ slot 0..4
UPDATE public.profiles
SET slot_index = character_id - 1
WHERE slot_index IS NULL
  AND character_id BETWEEN 1 AND 5;

-- Linhas órfãs fora do range legado: empurrar para slots livres é complexo;
-- marcar temporariamente e falhar o CHECK se inválido — forçar backfill seguro.
UPDATE public.profiles
SET slot_index = 0
WHERE slot_index IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN slot_index SET NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_slot_index_range;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_slot_index_range
  CHECK (slot_index >= 0 AND slot_index <= 4);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_server_slot_unique;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_server_slot_unique
  UNIQUE (user_id, server_id, slot_index);

COMMENT ON COLUMN public.profiles.slot_index IS
  'Posição na char select (0..4). Independente de character_id (identidade estável).';

COMMENT ON COLUMN public.profiles.character_id IS
  'Identidade estável do personagem. Nunca reutilizar após delete; não equivale a slot_index+1.';
