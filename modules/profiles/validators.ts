import { z } from 'zod';

export const ROLE_CATEGORIES = [
  'Design',
  'Product',
  'Engineering',
  'Marketing',
  'Data',
  'Operations',
  'Content',
  'Finance',
  'Sales',
] as const;

export type RoleCategory = (typeof ROLE_CATEGORIES)[number];

export const profileBasicsSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  university: z.string().min(1),
  yearOfStudy: z.string().min(1).max(20),
  fieldOfStudy: z.string().min(1).max(120),
  city: z.string().min(1).max(80),
  preferredLanguage: z.enum(['fr', 'en']),
});

export type ProfileBasicsInput = z.infer<typeof profileBasicsSchema>;

export const profileSkillsSchema = z.object({
  skills: z.array(z.string().min(1).max(40)).min(3).max(8),
  roles: z.array(z.enum(ROLE_CATEGORIES)).min(1).max(3),
  cvUrl: z.string().url().optional(),
  portfolioLinks: z
    .array(
      z.object({
        platform: z.string().min(1).max(40),
        url: z.string().url(),
      }),
    )
    .max(8)
    .default([]),
});

export type ProfileSkillsInput = z.infer<typeof profileSkillsSchema>;

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'] as const;

export const companyProfileSchema = z.object({
  name: z.string().min(1).max(120),
  industry: z.string().min(1).max(80),
  size: z.enum(COMPANY_SIZES),
  country: z.string().min(1).max(80),
  city: z.string().max(80).optional(),
  description: z.string().max(280).optional(),
  website: z.string().url().optional().or(z.literal('')),
  logoUrl: z.string().url().optional(),
  rneUrl: z.string().url().optional(),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;
