-- Zero Trust — RLS estrito: cliente só SELECT nos próprios dados.
-- INSERT/UPDATE/DELETE: trigger SQL (auth.users) + service_role (servidor/Vercel).

-- 1. Habilitar RLS em todas as tabelas (obrigatório)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency ENABLE ROW LEVEL SECURITY;

-- Remover políticas legadas (001 / nomes em inglês)
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

-- Idempotência: reexecutar esta migração
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio inventário" ON public.inventory;
DROP POLICY IF EXISTS "Apenas o servidor pode alterar o inventário" ON public.inventory;
DROP POLICY IF EXISTS "Usuários podem ver seu saldo" ON public.currency;

-- 2. Perfis — somente leitura do próprio registro (coluna user_id, não id)
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Inventário — leitura do dono; bloqueio explícito de escrita no cliente
CREATE POLICY "Usuários podem ver seu próprio inventário" ON public.inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Apenas o servidor pode alterar o inventário" ON public.inventory
  FOR ALL USING (false)
  WITH CHECK (false);

-- 4. Moedas — somente leitura para o dono (sem políticas de INSERT/UPDATE/DELETE)
CREATE POLICY "Usuários podem ver seu saldo" ON public.currency
  FOR SELECT USING (auth.uid() = user_id);
