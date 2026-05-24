import { z } from 'zod';

// Sprint 3 wireframe constraints: ≤3 short success statements, each ≤120
// chars (long goals truncate badly in the workspace brief card). Empty
// strings filtered out client-side; accept any length here so partial drafts
// don't error out — service layer skips empties.
const goalsSchema = z.array(z.string().max(120)).max(3).optional();

const phaseSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(160).optional(),
  fromWeek: z.number().int().min(1).max(52),
  toWeek: z.number().int().min(1).max(52),
});

const phasesSchema = z.array(phaseSchema).max(12).optional();

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, digits, hyphens only'),
  brief: z.string().max(2000).optional(),
  startDate: z.string(),
  endDate: z.string(),
  // Sprint 3 wireframe additions. Optional so existing tests + admin paths
  // creating a barebones draft project keep working.
  locationType: z.enum(['on-site', 'virtual', 'hybrid']).optional(),
  location: z.string().max(120).optional(),
  onSiteDays: z.string().max(120).optional(),
  duration: z.number().int().min(1).max(52).optional(),
  goals: goalsSchema,
  phases: phasesSchema,
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectPhase = z.infer<typeof phaseSchema>;
