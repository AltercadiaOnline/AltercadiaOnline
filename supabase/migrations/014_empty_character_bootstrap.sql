-- Personagem novo não deve nascer com kit demo/legado.
-- O trigger on_profile_created ainda chama bootstrap; inventário fica vazio.
-- Moeda: carteira por personagem (atualizado em 015 — este arquivo é histórico pré-015).

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
  'Provisiona currency (0 se nova) + inventory vazio. Sem kit demo. Profiles via API.';
