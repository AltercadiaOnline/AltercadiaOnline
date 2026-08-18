-- Identidade do personagem: classe da criação no hub (profiles).
-- Não inferir IMPETUS no enter-world a partir de save vazio / leftover.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS class_id TEXT
    CHECK (class_id IS NULL OR class_id IN ('IMPETUS', 'COGITOR', 'TUTATOR', 'DISSOLUTUS'));

COMMENT ON COLUMN public.profiles.class_id IS
  'Classe escolhida na criação — imutável. Fonte da identidade no char-select e world-login.';
