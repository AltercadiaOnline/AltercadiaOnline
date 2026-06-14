-- Altercadia — transferência atômica de itens (Gift)
-- Aplicar após 001_profiles_inventory_currency.sql

-- ---------------------------------------------------------------------------
-- Helpers JSONB — pilhas { itemId, quantity, charges? }
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.inventory_count_item(
  p_stacks JSONB,
  p_item_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_elem JSONB;
  v_total INTEGER := 0;
BEGIN
  IF jsonb_typeof(p_stacks) <> 'array' THEN
    RETURN 0;
  END IF;

  FOR v_elem IN SELECT value FROM jsonb_array_elements(p_stacks) AS t(value)
  LOOP
    IF v_elem->>'itemId' = p_item_id THEN
      v_total := v_total + COALESCE((v_elem->>'quantity')::INTEGER, 0);
    END IF;
  END LOOP;

  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_deduct_item(
  p_stacks JSONB,
  p_item_id TEXT,
  p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_elem JSONB;
  v_result JSONB := '[]'::JSONB;
  v_remaining INTEGER := p_quantity;
  v_stack_qty INTEGER;
  v_new_qty INTEGER;
BEGIN
  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  IF jsonb_typeof(p_stacks) <> 'array' THEN
    RAISE EXCEPTION 'INSUFFICIENT_QUANTITY';
  END IF;

  FOR v_elem IN SELECT value FROM jsonb_array_elements(p_stacks) AS t(value)
  LOOP
    IF v_remaining <= 0 THEN
      v_result := v_result || jsonb_build_array(v_elem);
      CONTINUE;
    END IF;

    IF v_elem->>'itemId' <> p_item_id THEN
      v_result := v_result || jsonb_build_array(v_elem);
      CONTINUE;
    END IF;

    v_stack_qty := COALESCE((v_elem->>'quantity')::INTEGER, 0);
    IF v_stack_qty <= v_remaining THEN
      v_remaining := v_remaining - v_stack_qty;
      CONTINUE;
    END IF;

    v_new_qty := v_stack_qty - v_remaining;
    v_remaining := 0;
    v_result := v_result || jsonb_build_array(
      jsonb_set(v_elem, '{quantity}', to_jsonb(v_new_qty), false)
    );
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_QUANTITY';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_add_item(
  p_stacks JSONB,
  p_item_id TEXT,
  p_quantity INTEGER,
  p_charges INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_result JSONB := COALESCE(p_stacks, '[]'::JSONB);
  v_entry JSONB;
BEGIN
  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  IF jsonb_typeof(v_result) <> 'array' THEN
    v_result := '[]'::JSONB;
  END IF;

  v_entry := CASE
    WHEN p_charges IS NULL THEN jsonb_build_object('itemId', p_item_id, 'quantity', p_quantity)
    ELSE jsonb_build_object('itemId', p_item_id, 'quantity', p_quantity, 'charges', p_charges)
  END;

  RETURN v_result || jsonb_build_array(v_entry);
END;
$$;

-- ---------------------------------------------------------------------------
-- transfer_item — transação atômica A → B
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.transfer_item(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_item_id TEXT,
  p_quantity INTEGER DEFAULT 1,
  p_from_character_id INTEGER DEFAULT 1,
  p_to_character_id INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

  -- Lock determinístico (evita deadlock em transferências cruzadas)
  IF p_from_user_id <= p_to_user_id THEN
    SELECT * INTO v_from_row
    FROM public.inventory
    WHERE user_id = p_from_user_id AND character_id = p_from_character_id
    FOR UPDATE;

    INSERT INTO public.inventory (user_id, character_id, stacks, equipped)
    VALUES (p_to_user_id, p_to_character_id, '[]'::JSONB, '{}'::JSONB)
    ON CONFLICT (user_id, character_id) DO NOTHING;

    SELECT * INTO v_to_row
    FROM public.inventory
    WHERE user_id = p_to_user_id AND character_id = p_to_character_id
    FOR UPDATE;
  ELSE
    INSERT INTO public.inventory (user_id, character_id, stacks, equipped)
    VALUES (p_to_user_id, p_to_character_id, '[]'::JSONB, '{}'::JSONB)
    ON CONFLICT (user_id, character_id) DO NOTHING;

    SELECT * INTO v_to_row
    FROM public.inventory
    WHERE user_id = p_to_user_id AND character_id = p_to_character_id
    FOR UPDATE;

    SELECT * INTO v_from_row
    FROM public.inventory
    WHERE user_id = p_from_user_id AND character_id = p_from_character_id
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
    'senderStacks', v_new_from,
    'recipientStacks', v_new_to
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_item(UUID, UUID, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_item(UUID, UUID, TEXT, INTEGER, INTEGER, INTEGER) TO service_role;
