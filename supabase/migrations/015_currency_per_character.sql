-- Carteira única por personagem (não mais por conta+shard).
-- PK alinhada ao inventário: (user_id, character_id, server_id)

ALTER TABLE public.currency
  ADD COLUMN IF NOT EXISTS character_id INTEGER;

-- Saldo legado (compartilhado) vai para o personagem de menor character_id no shard.
UPDATE public.currency c
SET character_id = sub.min_character_id
FROM (
  SELECT
    p.user_id,
    p.server_id,
    MIN(p.character_id) AS min_character_id
  FROM public.profiles p
  GROUP BY p.user_id, p.server_id
) AS sub
WHERE c.character_id IS NULL
  AND c.user_id = sub.user_id
  AND c.server_id = sub.server_id;

-- Linhas órfãs (sem profile no shard) — remover
DELETE FROM public.currency
WHERE character_id IS NULL;

ALTER TABLE public.currency
  ALTER COLUMN character_id SET NOT NULL;

ALTER TABLE public.currency
  DROP CONSTRAINT IF EXISTS currency_pkey;

ALTER TABLE public.currency
  ADD PRIMARY KEY (user_id, character_id, server_id);

CREATE INDEX IF NOT EXISTS currency_user_server_idx
  ON public.currency (user_id, server_id);

-- Personagens sem linha de currency: carteira 0
INSERT INTO public.currency (user_id, character_id, server_id, dollar_volt, alter_coins)
SELECT p.user_id, p.character_id, p.server_id, 0, 0
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.currency c
  WHERE c.user_id = p.user_id
    AND c.character_id = p.character_id
    AND c.server_id = p.server_id
);

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
END;
$$;

COMMENT ON COLUMN public.currency.character_id IS
  'Personagem dono da carteira. Independente de outros chars da mesma conta/shard.';

COMMENT ON FUNCTION public.bootstrap_player_game_data(UUID, INTEGER, TEXT) IS
  'Provisiona currency 0 + inventory vazio por personagem. Profiles via API.';
