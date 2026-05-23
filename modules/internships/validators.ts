import { z } from 'zod';

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
    customQuestions: z
      .array(z.object({ question: z.string().min(1).max(400), required: z.boolean() }))
      .max(8),
  })
  .refine((d) => d.locationType === 'virtual' || d.location.length > 0, {
    message: 'Location required for on-site or hybrid',
    path: ['location'],
  });

export type InternshipFormInput = z.infer<typeof internshipFormSchema>;
