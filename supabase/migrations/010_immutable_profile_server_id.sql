-- server_id imutável após criação do personagem (profiles).

CREATE OR REPLACE FUNCTION public.prevent_profile_server_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.server_id IS DISTINCT FROM NEW.server_id THEN
    RAISE EXCEPTION 'server_id is immutable after character creation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_server_id_immutable ON public.profiles;

CREATE TRIGGER profiles_server_id_immutable
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_server_id_change();

COMMENT ON TRIGGER profiles_server_id_immutable ON public.profiles IS
  'Impede migração de personagem entre shards após criação.';
