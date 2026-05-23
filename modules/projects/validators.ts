import { z } from 'zod';

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
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
