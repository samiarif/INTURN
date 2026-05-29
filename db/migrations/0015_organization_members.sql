-- 0015: organization_members (staff team: owner/admin/supervisor) + invite state.
-- Idempotent: safe to re-run (CREATE … IF NOT EXISTS, NOT EXISTS backfill).
BEGIN;

CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'supervisor',
  status text NOT NULL DEFAULT 'invited',
  pending_project_ids jsonb DEFAULT '[]'::jsonb,
  invite_token text,
  invite_expires_at timestamp,
  invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  invited_at timestamp NOT NULL DEFAULT now(),
  joined_at timestamp,
  removed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS org_members_org_email_unique
  ON organization_members (organization_id, lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS org_members_org_user_unique
  ON organization_members (organization_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS org_members_invite_token_unique
  ON organization_members (invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS org_members_user_idx ON organization_members (user_id);
CREATE INDEX IF NOT EXISTS org_members_org_idx ON organization_members (organization_id);

-- Backfill: each existing org's owner becomes an active 'owner' member.
INSERT INTO organization_members (organization_id, user_id, email, role, status, joined_at)
SELECT o.id, o.owner_id, u.email, 'owner', 'active', o.created_at
FROM organizations o
JOIN users u ON u.id = o.owner_id
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members m
  WHERE m.organization_id = o.id AND m.user_id = o.owner_id
);

COMMIT;
