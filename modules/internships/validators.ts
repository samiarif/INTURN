import { z } from 'zod';

// Sprint 3 wireframe: hard floor of 3, ceiling of 10. Fewer reads careless;
// more means it's actually a job, not an internship. Optional at the schema
// level so existing tests + admin paths posting a barebones draft still work
// — we tighten the floor in the form UI itself.
const deliverableSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(280).optional(),
  dueWeek: z.number().int().min(1).max(52),
});

export const internshipFormSchema = z
  .object({
    title: z.string().min(1).max(120),
    description: z.string().min(20).max(4000),
    sector: z.string().min(1).max(80),
    skills: z.array(z.string().min(1).max(40)).min(1).max(12),
    duration: z.number().int().min(4).max(52),
    locationType: z.enum(['on-site', 'virtual', 'hybrid']),
    location: z.string().max(80),
    isPaid: z.boolean(),
    compensation: z.string().max(80).optional(),
    internCount: z.number().int().min(1).max(10),
    language: z.enum(['fr', 'en', 'ar']),
    deadline: z.string(),
    // Sprint 3 wireframe caps questions at 3 in the UI; schema keeps 8 for
    // back-compat with anything older. Form enforces the tighter limit.
    customQuestions: z
      .array(z.object({ question: z.string().min(1).max(400), required: z.boolean() }))
      .max(8),
    deliverables: z.array(deliverableSchema).max(10).optional(),
  })
  .refine((d) => d.locationType === 'virtual' || d.location.length > 0, {
    message: 'Location required for on-site or hybrid',
    path: ['location'],
  });

export type InternshipFormInput = z.infer<typeof internshipFormSchema>;
export type InternshipDeliverable = z.infer<typeof deliverableSchema>;
