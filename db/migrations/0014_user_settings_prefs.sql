-- S3 · per-user settings: appearance (theme/locale) + notification channel toggles.
-- Hand-rolled idempotent (the drizzle journal is out of sync — see scripts/migrate.ts).
-- No destructive statements: only ADD COLUMN IF NOT EXISTS.

BEGIN;

-- Appearance preferences. Nullable = "no explicit choice yet" (fall back to
-- the theme cookie / URL locale). theme_pref ∈ {light,dark,system}; locale_pref ∈ {en,fr}.
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_pref text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale_pref text;

-- Master per-channel notification toggles, honored by the notification
-- dispatcher. Default true so existing users keep receiving everything.
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_email boolean DEFAULT true NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_in_app boolean DEFAULT true NOT NULL;

COMMIT;
