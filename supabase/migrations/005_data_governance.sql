-- =============================================================================
-- Altercadia — Governança de Dados (Zero Trust)
-- Projeto: AltercadiaOnline / Supabase
--
-- REVISAR antes de executar no SQL Editor.
-- Ordem recomendada: 001 → 003 → 005 (ou 001 → 003 → 004, depois 005 se 004 já aplicada)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A. TRIGGER — auth.users → profiles (perfil criado automaticamente)
-- ---------------------------------------------------------------------------

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

-- Backfill contas existentes
INSERT INTO public.profiles (user_id, email, character_id)
SELECT u.id, u.email, 1
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles AS p
  WHERE p.user_id = u.id AND p.character_id = 1
);

-- ---------------------------------------------------------------------------
-- B. RLS — habilitar em todas as tabelas sensíveis
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency ENABLE ROW LEVEL SECURITY;

-- Remover políticas legadas (001 / 004)
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;

DROP POLICY IF EXISTS currency_select_own ON public.currency;
DROP POLICY IF EXISTS currency_insert_own ON public.currency;
DROP POLICY IF EXISTS currency_update_own ON public.currency;
DROP POLICY IF EXISTS currency_delete_own ON public.currency;

DROP POLICY IF EXISTS inventory_select_own ON public.inventory;
DROP POLICY IF EXISTS inventory_insert_own ON public.inventory;
DROP POLICY IF EXISTS inventory_update_own ON public.inventory;
DROP POLICY IF EXISTS inventory_delete_own ON public.inventory;

DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Cliente não pode alterar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu saldo" ON public.currency;
DROP POLICY IF EXISTS "Cliente não pode alterar moedas" ON public.currency;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio inventário" ON public.inventory;
DROP POLICY IF EXISTS "Cliente não pode alterar inventário" ON public.inventory;

-- ---------------------------------------------------------------------------
-- C. Políticas — SELECT do dono + bloqueio explícito de escrita no cliente
--    Coluna de dono: user_id (NÃO confundir com profiles.id que é PK interna)
-- ---------------------------------------------------------------------------

-- PROFILES
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Cliente não pode alterar perfis" ON public.profiles
  FOR ALL USING (false)
  WITH CHECK (false);

-- CURRENCY
CREATE POLICY "Usuários podem ver seu saldo" ON public.currency
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Cliente não pode alterar moedas" ON public.currency
  FOR ALL USING (false)
  WITH CHECK (false);

-- INVENTORY
CREATE POLICY "Usuários podem ver seu próprio inventário" ON public.inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Cliente não pode alterar inventário" ON public.inventory
  FOR ALL USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- D. (Opcional) Seed de economia no PostgreSQL vs servidor
--
-- A migração 001 inclui trigger on_profile_created → bootstrap_player_game_data,
-- que insere currency/inventory via SECURITY DEFINER (ignora RLS).
--
-- Se quiser que APENAS o servidor faça seed (seedPlayerWalletIfEmpty + upsert
-- com service_role), descomente as linhas abaixo:
-- ---------------------------------------------------------------------------

-- DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
-- DROP FUNCTION IF EXISTS public.handle_new_profile();

-- service_role (Vercel) continua ignorando RLS automaticamente.
