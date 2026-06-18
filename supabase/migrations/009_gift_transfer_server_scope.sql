-- Gift transfer isolado por shard — transfer_item usa server_id (pós 007_shard_scoped_economy)

DROP FUNCTION IF EXISTS public.transfer_item(UUID, UUID, TEXT, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.transfer_item(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_item_id TEXT,
  p_quantity INTEGER DEFAULT 1,
  p_from_character_id INTEGER DEFAULT 1,
  p_to_character_id INTEGER DEFAULT 1,
  p_server_id TEXT DEFAULT 'default'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_server_id TEXT := COALESCE(NULLIF(trim(p_server_id), ''), 'default');
  v_from_row public.inventory%ROWTYPE;
  v_to_row public.inventory%ROWTYPE;
  v_from_stacks JSONB;
  v_to_stacks JSONB;
  v_new_from JSONB;
  v_new_to JSONB;
BEGIN
  IF p_from_user_id IS NULL OR p_to_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PLAYERS';
  END IF;

  IF p_from_user_id = p_to_user_id AND p_from_character_id = p_to_character_id THEN
    RAISE EXCEPTION 'SELF_TRANSFER';
  END IF;

  IF p_item_id IS NULL OR length(trim(p_item_id)) = 0 THEN
    RAISE EXCEPTION 'INVALID_ITEM';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = p_from_user_id
      AND character_id = p_from_character_id
      AND server_id = v_server_id
  ) THEN
    RAISE EXCEPTION 'SENDER_NOT_ON_SHARD';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = p_to_user_id
      AND character_id = p_to_character_id
      AND server_id = v_server_id
  ) THEN
    RAISE EXCEPTION 'RECIPIENT_NOT_ON_SHARD';
  END IF;

  IF p_from_user_id <= p_to_user_id THEN
    SELECT * INTO v_from_row
    FROM public.inventory
    WHERE user_id = p_from_user_id
      AND character_id = p_from_character_id
      AND server_id = v_server_id
    FOR UPDATE;

    INSERT INTO public.inventory (user_id, character_id, server_id, stacks, equipped)
    VALUES (p_to_user_id, p_to_character_id, v_server_id, '[]'::JSONB, '{}'::JSONB)
    ON CONFLICT (user_id, character_id, server_id) DO NOTHING;

    SELECT * INTO v_to_row
    FROM public.inventory
    WHERE user_id = p_to_user_id
      AND character_id = p_to_character_id
      AND server_id = v_server_id
    FOR UPDATE;
  ELSE
    INSERT INTO public.inventory (user_id, character_id, server_id, stacks, equipped)
    VALUES (p_to_user_id, p_to_character_id, v_server_id, '[]'::JSONB, '{}'::JSONB)
    ON CONFLICT (user_id, character_id, server_id) DO NOTHING;

    SELECT * INTO v_to_row
    FROM public.inventory
    WHERE user_id = p_to_user_id
      AND character_id = p_to_character_id
      AND server_id = v_server_id
    FOR UPDATE;

    SELECT * INTO v_from_row
    FROM public.inventory
    WHERE user_id = p_from_user_id
      AND character_id = p_from_character_id
      AND server_id = v_server_id
    FOR UPDATE;
  END IF;

  IF v_from_row.user_id IS NULL THEN
    RAISE EXCEPTION 'SENDER_INVENTORY_NOT_FOUND';
  END IF;

  IF v_to_row.user_id IS NULL THEN
    RAISE EXCEPTION 'RECIPIENT_INVENTORY_NOT_FOUND';
  END IF;

  v_from_stacks := COALESCE(v_from_row.stacks, '[]'::JSONB);
  v_to_stacks := COALESCE(v_to_row.stacks, '[]'::JSONB);

  IF public.inventory_count_item(v_from_stacks, p_item_id) < p_quantity THEN
    RAISE EXCEPTION 'INSUFFICIENT_QUANTITY';
  END IF;

  v_new_from := public.inventory_deduct_item(v_from_stacks, p_item_id, p_quantity);
  v_new_to := public.inventory_add_item(v_to_stacks, p_item_id, p_quantity, NULL);

  UPDATE public.inventory
  SET stacks = v_new_from, updated_at = timezone('utc', now())
  WHERE id = v_from_row.id;

  UPDATE public.inventory
  SET stacks = v_new_to, updated_at = timezone('utc', now())
  WHERE id = v_to_row.id;

  RETURN jsonb_build_object(
    'fromUserId', p_from_user_id,
    'toUserId', p_to_user_id,
    'itemId', p_item_id,
    'quantity', p_quantity,
    'fromCharacterId', p_from_character_id,
    'toCharacterId', p_to_character_id,
    'serverId', v_server_id,
    'senderStacks', v_new_from,
    'recipientStacks', v_new_to
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_item(UUID, UUID, TEXT, INTEGER, INTEGER, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_item(UUID, UUID, TEXT, INTEGER, INTEGER, INTEGER, TEXT) TO service_role;

COMMENT ON FUNCTION public.transfer_item(UUID, UUID, TEXT, INTEGER, INTEGER, INTEGER, TEXT) IS
  'Transação atômica de item entre jogadores no mesmo shard (server_id).';
