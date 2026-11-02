-- New restricted one-time plan: 'packs' (EUR 19, displayed as "Prompt Packs").
-- Grants premium Prompt Packs + all Learn lessons only; everything else stays at Free limits.
-- Kept in its own migration: a new enum value cannot be used in the same transaction it is added.
alter type public.plan_type add value if not exists 'packs';
