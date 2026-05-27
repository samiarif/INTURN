/**
 * Pre-filled internship scaffolds. Companies pick one as a starting point
 * on /company/projects/[id]/internships/new, then tweak. Cuts the
 * blank-page friction that kills first-internship posts.
 *
 * 8 templates covering the most-requested Tunisian internship archetypes
 * across the 4 active sectors (Design, Engineering, Marketing, Content).
 *
 * Translations live in locales/{en,fr}.json under `internshipTemplates`.
 * Keep template `id`s stable — they're used as the i18n key suffix.
 */

export type InternshipTemplate = {
  id:
    | 'visualDesigner'
    | 'uxResearcher'
    | 'frontendEngineer'
    | 'dataAnalyst'
    | 'marketingIntern'
    | 'bilingualEditor'
    | 'motionDesigner'
    | 'contentStrategist';
  sector: 'Design' | 'Engineering' | 'Marketing' | 'Content';
  skillsBySector: string[];
  duration: number; // weeks
  locationType: 'on-site' | 'virtual' | 'hybrid';
  language: 'fr' | 'en' | 'ar';
  isPaid: boolean;
  // i18n keys resolve to: title, description, customQuestions (array)
  // — see locales/*.json under internshipTemplates.{id}
};

export const INTERNSHIP_TEMPLATES: InternshipTemplate[] = [
  {
    id: 'visualDesigner',
    sector: 'Design',
    skillsBySector: ['Figma', 'Brand', 'Typography', 'Visual identity'],
    duration: 12,
    locationType: 'hybrid',
    language: 'fr',
    isPaid: true,
  },
  {
    id: 'uxResearcher',
    sector: 'Design',
    skillsBySector: ['User interviews', 'Synthesis', 'Figma', 'Notion'],
    duration: 8,
    locationType: 'virtual',
    language: 'fr',
    isPaid: true,
  },
  {
    id: 'frontendEngineer',
    sector: 'Engineering',
    skillsBySector: ['React', 'TypeScript', 'Tailwind', 'Git'],
    duration: 12,
    locationType: 'hybrid',
    language: 'en',
    isPaid: true,
  },
  {
    id: 'dataAnalyst',
    sector: 'Engineering',
    skillsBySector: ['SQL', 'Python', 'Looker', 'Excel'],
    duration: 10,
    locationType: 'hybrid',
    language: 'en',
    isPaid: true,
  },
  {
    id: 'marketingIntern',
    sector: 'Marketing',
    skillsBySector: ['Instagram', 'Copywriting', 'Notion', 'Analytics'],
    duration: 8,
    locationType: 'on-site',
    language: 'fr',
    isPaid: true,
  },
  {
    id: 'bilingualEditor',
    sector: 'Content',
    skillsBySector: ['Editing', 'French', 'English', 'Style guides'],
    duration: 12,
    locationType: 'virtual',
    language: 'fr',
    isPaid: true,
  },
  {
    id: 'motionDesigner',
    sector: 'Design',
    skillsBySector: ['After Effects', 'Lottie', 'Brand motion', 'Figma'],
    duration: 6,
    locationType: 'on-site',
    language: 'fr',
    isPaid: true,
  },
  {
    id: 'contentStrategist',
    sector: 'Content',
    skillsBySector: ['Editorial', 'SEO', 'CMS', 'Audience research'],
    duration: 10,
    locationType: 'virtual',
    language: 'fr',
    isPaid: true,
  },
];

export function findTemplate(id: string | null | undefined): InternshipTemplate | undefined {
  if (!id) return undefined;
  return INTERNSHIP_TEMPLATES.find((t) => t.id === id);
}
