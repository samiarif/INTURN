import { z } from 'zod';

export const applyFormSchema = z.object({
  coverNote: z.string().max(1500).optional(),
  customAnswers: z
    .array(z.object({ question: z.string(), answer: z.string().max(2000) }))
    .max(8),
});

export type ApplyFormInput = z.infer<typeof applyFormSchema>;
