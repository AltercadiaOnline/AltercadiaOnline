-- Após 012 (slot_index NOT NULL), bootstrap_player_game_data quebrava a criação:
-- INSERT em profiles sem slot_index falhava o NOT NULL *antes* do ON CONFLICT,
-- e o trigger on_profile_created rolava a transação inteira.
--
-- Perfis nascem só via API (character-hub). Bootstrap só garante currency + inventory.

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
  INSERT INTO public.currency (user_id, server_id, dollar_volt, alter_coins)
  VALUES (p_user_id, p_server_id, 0, 0)
  ON CONFLICT (user_id, server_id) DO NOTHING;

  INSERT INTO public.inventory (user_id, character_id, server_id, stacks, equipped)
  VALUES (p_user_id, p_character_id, p_server_id, '[]'::jsonb, '{}'::jsonb)
  ON CONFLICT (user_id, character_id, server_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.bootstrap_player_game_data(UUID, INTEGER, TEXT) IS
  'Provisiona currency (0 se nova) + inventory vazio. Profiles via API (slot_index).';
