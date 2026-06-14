-- Perfil autoritativo: auth.users → public.profiles (trigger)
-- O servidor só faz seed de wallet/inventário após confirmar que o perfil existe.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, character_id)
  VALUES (NEW.id, NEW.email, 1)
  ON CONFLICT (user_id, character_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_created();

-- Contas já existentes antes da migração
INSERT INTO public.profiles (user_id, email, character_id)
SELECT u.id, u.email, 1
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles AS p
  WHERE p.user_id = u.id AND p.character_id = 1
);
